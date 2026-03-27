#!/usr/bin/env python3
import sys
import json
import threading
import socket
import os
import time

# IPC Socket for instrumentation
SOCKET_PATH = "/tmp/snap_instrument.sock"

class SnapPlugin:
    def __init__(self):
        self.state = {
            "playbackStatus": "playing",
            "loopStatus": "none",
            "shuffle": False,
            "volume": 100,
            "mute": False,
            "rate": 1.0,
            "position": 0.0,
            "canGoNext": True,
            "canGoPrevious": True,
            "canPlay": True,
            "canPause": True,
            "canSeek": True,
            "canControl": True,
            "metadata": {
                "title": "Initial Track",
                "artist": ["Snap Plugin"],
                "album": "Instrumental"
            }
        }
        self.lock = threading.Lock()

    def send_notification(self, method, params):
        msg = {
            "jsonrpc": "2.0",
            "method": method,
            "params": params
        }
        print(json.dumps(msg), flush=True)

    def send_response(self, req_id, result=None, error=None):
        if req_id is None: return # Notifications don't get responses
        msg = {
            "jsonrpc": "2.0",
            "id": req_id
        }
        if error:
            msg["error"] = error
        else:
            msg["result"] = result or "ok"
        sys.stdout.write(json.dumps(msg) + "\n")
        sys.stdout.flush()

    def log(self, message, severity="Info"):
        self.send_notification("Plugin.Stream.Log", {"severity": severity, "message": message})

    def notify_properties(self):
        with self.lock:
            self.send_notification("Plugin.Stream.Player.Properties", self.state)

    def handle_request(self, req):
        if req.get("jsonrpc") != "2.0":
            self.log("Invalid JSON-RPC version", "Error")
            return

        method = req.get("method")
        params = req.get("params", {})
        req_id = req.get("id")

        if method == "Plugin.Stream.Player.GetProperties":
            with self.lock:
                self.send_response(req_id, self.state)
        elif method == "Plugin.Stream.Player.Control":
            cmd = params.get("command")
            self.log(f"Received control command: {cmd}")
            if cmd == "play": self.state["playbackStatus"] = "playing"
            elif cmd == "pause": self.state["playbackStatus"] = "paused"
            elif cmd == "stop": self.state["playbackStatus"] = "stopped"
            
            self.send_response(req_id, "ok")
            self.notify_properties()
        elif method == "Plugin.Stream.Player.SetProperty":
            with self.lock:
                for k, v in params.items():
                    if k in self.state:
                        self.state[k] = v
            self.send_response(req_id, "ok")
            self.notify_properties()
        else:
            self.log(f"Unknown method: {method}", "Warning")
            self.send_response(req_id, error={"code": -32601, "message": "Method not found"})

    def run(self):
        # Notify server we are ready
        self.send_notification("Plugin.Stream.Ready", {})
        
        # Start IPC listener for instrumentation
        threading.Thread(target=self.ipc_listener, daemon=True).start()

        for line in sys.stdin:
            line = line.strip()
            if not line: continue
            try:
                req = json.loads(line)
                self.handle_request(req)
            except json.JSONDecodeError:
                self.log(f"Invalid JSON: {line}", "Error")
            except Exception as e:
                self.log(f"Error handling request: {e}", "Error")

    def ipc_listener(self):
        if os.path.exists(SOCKET_PATH):
            os.remove(SOCKET_PATH)
        
        server = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
        server.bind(SOCKET_PATH)
        server.listen(1)
        
        while True:
            conn, _ = server.accept()
            try:
                data = conn.recv(4096)
                if data:
                    cmd = json.loads(data.decode())
                    with self.lock:
                        if "metadata" in cmd:
                            self.state["metadata"].update(cmd["metadata"])
                        if "status" in cmd:
                            self.state["playbackStatus"] = cmd["status"]
                        if "properties" in cmd:
                            self.state.update(cmd["properties"])
                    self.notify_properties()
                conn.close()
            except Exception as e:
                self.log(f"IPC Error: {e}", "Error")

def command_mode():
    import argparse
    parser = argparse.ArgumentParser(description="Instrument the running Snap Plugin")
    parser.add_argument("--title", help="Set track title")
    parser.add_argument("--artist", help="Set track artist")
    parser.add_argument("--status", choices=['playing', 'paused', 'stopped'], help="Set playback status")
    args = parser.parse_args()

    cmd = {}
    if args.title or args.artist:
        cmd["metadata"] = {}
        if args.title: cmd["metadata"]["title"] = args.title
        if args.artist: cmd["metadata"]["artist"] = [args.artist]
    if args.status:
        cmd["status"] = args.status

    if not cmd:
        print("No commands specified.")
        return

    try:
        client = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
        client.connect(SOCKET_PATH)
        client.send(json.dumps(cmd).encode())
        client.close()
        print("Command sent to plugin.")
    except Exception as e:
        print(f"Error connecting to plugin socket: {e}")
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1].startswith("--"):
        command_mode()
    else:
        # Check if we are being run by Snapserver (stdout is a pipe/socket)
        # or if we should just enter command mode if arguments are provided
        if not sys.stdin.isatty():
            plugin = SnapPlugin()
            plugin.run()
        else:
            command_mode()
