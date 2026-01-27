
import argparse
import sys
import soundfile as sf
import os
from kokoro_onnx import Kokoro
import urllib.request
import json
import numpy as np

MODEL_URL = "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files/kokoro-v0_19.onnx"
# Use .bin by default as it seems to be preferred/bin format for numpy loading
VOICES_BIN_URL = "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files/voices.bin"
# JSON might also work but seems problematic with pickle/load
VOICES_JSON_URL = "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files/voices.json"

def ensure_files():
    if not os.path.exists("kokoro-v0_19.onnx"):
        print("Downloading kokoro-v0_19.onnx...", file=sys.stderr)
        try:
            urllib.request.urlretrieve(MODEL_URL, "kokoro-v0_19.onnx")
        except Exception as e:
            print(f"Failed to download model: {e}", file=sys.stderr)
            # Try alternate URL
            alt_url = "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v0_19.onnx"
            print(f"Trying alternate URL: {alt_url}", file=sys.stderr)
            urllib.request.urlretrieve(alt_url, "kokoro-v0_19.onnx")

    # Prefer bin
    if not os.path.exists("voices.bin"):
        print("Downloading voices.bin...", file=sys.stderr)
        try:
            urllib.request.urlretrieve(VOICES_BIN_URL, "voices.bin")
        except Exception as e:
             print(f"Failed to download voices.bin: {e}", file=sys.stderr)
             # Try alternate
             alt_url = "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices.bin"
             print(f"Trying alternate URL for voices.bin: {alt_url}", file=sys.stderr)
             try:
                 urllib.request.urlretrieve(alt_url, "voices.bin")
             except Exception as e2:
                 print(f"Failed to download voices.bin (alt): {e2}", file=sys.stderr)
                 pass

def main():
    parser = argparse.ArgumentParser(description="Kokoro TTS Generator")
    parser.add_argument("--text", required=True, help="Text to speak")
    parser.add_argument("--voice", default="af_sarah", help="Voice ID (e.g., af_sarah)")
    parser.add_argument("--speed", type=float, default=1.0, help="Speech speed")
    parser.add_argument("--output_file", required=True, help="Output WAV file path")
    
    args = parser.parse_args()

    ensure_files()

    voices_file = "voices.bin"
    if not os.path.exists(voices_file):
        # Fallback to json if bin fails
        if os.path.exists("voices.json"):
            voices_file = "voices.json"
        else:
            print("Error: neither voices.bin nor voices.json found.", file=sys.stderr)
            sys.exit(1)

    try:
        # Debug file checks
        if not os.path.exists("kokoro-v0_19.onnx"):
            print("Error: Model file kokoro-v0_19.onnx missing.", file=sys.stderr)
            sys.exit(1)
        
        # Initialize
        kokoro = Kokoro("kokoro-v0_19.onnx", voices_file)
        
        audio, sample_rate = kokoro.create(
            args.text,
            voice=args.voice,
            speed=args.speed,
            lang="en-us"
        )
        sf.write(args.output_file, audio, sample_rate)
        
        if os.path.exists(args.output_file) and os.path.getsize(args.output_file) > 0:
             print(f"Audio generated successfully: {args.output_file}")
        else:
             print("Error: Audio file empty or not created.", file=sys.stderr)
             sys.exit(1)

    except Exception as e:
        print(f"Error generating audio: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
