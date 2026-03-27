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
                "album": "Instrumental",
                "albumArtist": ["Various Artists"],
                "duration": 300.0,
                "artUrl": ""
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
        # severity: trace, debug, info, notice, warning, error, fatal
        self.send_notification("Plugin.Stream.Log", {"severity": severity, "message": message})

    def notify_properties(self):
        with self.lock:
            self.send_notification("Plugin.Stream.Player.Properties", self.state)

    def heartbeat_loop(self):
        """High-precision 10Hz position tracking for fractional smooth updates"""
        while True:
            time.sleep(0.1)
            with self.lock:
                if self.state["playbackStatus"] == "playing":
                    self.state["position"] += 0.1
                    # Notify property change (position) every 1.0s or on major changes
                    # To avoid flooding, we notify at 1Hz or when requested
                    pass 
            
            # Simple 1Hz notification logic
            if int(time.time() * 10) % 10 == 0:
                if self.state["playbackStatus"] == "playing":
                    self.notify_properties()

    def send_error(self, req_id, code, message):
        self.send_response(req_id, error={"code": code, "message": message})

    def handle_request(self, req):
        if req.get("jsonrpc") != "2.0":
            return

        method = req.get("method")
        params = req.get("params", {})
        req_id = req.get("id")

        if method == "Plugin.Stream.Player.GetProperties":
            with self.lock:
                self.send_response(req_id, self.state)
        elif method == "Plugin.Stream.Player.Control":
            cmd = params.get("command")
            p = params.get("params", {})
            self.log(f"Received control command: {cmd}", "Notice")
            
            with self.lock:
                if cmd == "play": self.state["playbackStatus"] = "playing"
                elif cmd == "pause": self.state["playbackStatus"] = "paused"
                elif cmd == "playPause":
                    self.state["playbackStatus"] = "paused" if self.state["playbackStatus"] == "playing" else "playing"
                elif cmd == "stop": self.state["playbackStatus"] = "stopped"
                elif cmd == "next": self.log("Next track requested", "Notice")
                elif cmd == "previous": self.log("Previous track requested", "Notice")
                elif cmd == "seek":
                    offset = p.get("offset", 0)
                    self.state["position"] += float(offset)
                elif cmd == "setPosition":
                    self.state["position"] = float(p.get("position", 0))
            
            self.send_response(req_id, "ok")
            self.notify_properties()
        elif method == "Plugin.Stream.Player.SetProperty":
            self.log(f"SetProperty: {params}", "Notice")
            properties_changed = False
            with self.lock:
                for k, v in params.items():
                    if k in self.state:
                        self.state[k] = v
                        properties_changed = True
            
            self.send_response(req_id, "ok")
            if properties_changed:
                self.notify_properties()
        else:
            self.log(f"Method not found: {method}", "Warning")
            self.send_error(req_id, -32601, "Method not found")

    def run(self):
        # Notify server we are ready
        self.send_notification("Plugin.Stream.Ready", {})
        self.log("Plugin interface ready and starting heartbeat loop", "Notice")
        
        # Start background tasks
        threading.Thread(target=self.ipc_listener, daemon=True).start()
        threading.Thread(target=self.heartbeat_loop, daemon=True).start()

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
    parser.add_argument("--host", default="localhost", help="Snapcast host")
    parser.add_argument("--port", type=int, default=1780, help="Snapcast port")
    
    subparsers = parser.add_subparsers(dest="command")
    
    # Metadata command
    meta = subparsers.add_parser("metadata")
    meta.add_argument("--title", help="Track Title")
    meta.add_argument("--artist", help="Track Artist")
    meta.add_argument("--album", help="Album Name")
    meta.add_argument("--duration", type=float, help="Duration in seconds")
    meta.add_argument("--art", help="Album Art URL")
    meta.add_argument("--art-data", help="Base64 encoded image data")
    
    # Status command
    status = subparsers.add_parser("status")
    status.add_argument("value", choices=['playing', 'paused', 'stopped'])
    
    # Props command (raw)
    props = subparsers.add_parser("props")
    props.add_argument("json", help="Raw JSON properties")

    args = parser.parse_args()
    if not args.command and not sys.argv[1:]:
        parser.print_help()
        return

    cmd = {}
    if args.command == "metadata":
        cmd["metadata"] = {}
        if args.title: cmd["metadata"]["title"] = args.title
        if args.artist: cmd["metadata"]["artist"] = [args.artist]
        if args.album: cmd["metadata"]["album"] = args.album
        if args.duration: cmd["metadata"]["duration"] = args.duration
        if args.art: cmd["metadata"]["artUrl"] = args.art
        if args.art_data:
            cmd["metadata"]["artData"] = {
                "data": args.art_data,
                "extension": "png" # Default to png for testing
            }
    elif args.command == "status":
        cmd["status"] = args.value
    elif args.command == "props":
        cmd["properties"] = json.loads(args.json)
    
    if not cmd:
        # Fallback for old simple-arg mode if needed, but let's stick to subparsers
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
