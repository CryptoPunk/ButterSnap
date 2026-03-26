import sys
import subprocess
import time
import os

# Configuration
INPUT_FILE = "song.mp3" # Or the path provided by the user
SAMPLE_RATE = 48000
CHANNELS = 2
FORMAT = "s16le"

def stream(file_path):
    if not os.path.exists(file_path):
        print(f"Error: {file_path} not found", file=sys.stderr)
        return

    # ffmpeg command to decode to raw PCM stdout
    # -i input
    # -f s16le (raw 16-bit little endian)
    # -ac 2 (stereo)
    # -ar 48000 (rate)
    # - (stdout)
    cmd = [
        "ffmpeg", "-i", file_path,
        "-f", FORMAT,
        "-ac", str(CHANNELS),
        "-ar", str(SAMPLE_RATE),
        "-"
    ]

    while True:
        try:
            print(f"Streaming {file_path}...", file=sys.stderr)
            process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
            
            while True:
                data = process.stdout.read(4096)
                if not data:
                    break
                sys.stdout.buffer.write(data)
                sys.stdout.buffer.flush()
            
            process.wait()
            print(f"Looping...", file=sys.stderr)
            time.sleep(0.5) # Brief pause between loops
        except KeyboardInterrupt:
            print("Stopping...", file=sys.stderr)
            break
        except Exception as e:
            print(f"Error: {e}", file=sys.stderr)
            break

if __name__ == "__main__":
    file_to_stream = sys.argv[1] if len(sys.argv) > 1 else INPUT_FILE
    stream(file_to_stream)
