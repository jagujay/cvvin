#!/usr/bin/env python3
"""
Transcription Wrapper Script
This script handles faster-whisper import and provides better error messages
"""

import sys
import json
import os
import warnings
from pathlib import Path

# Suppress all warnings - they go to stderr and interfere with JSON parsing
warnings.filterwarnings('ignore')

def main():
    # Check for faster-whisper first
    try:
        import faster_whisper
        from faster_whisper import WhisperModel
    except ImportError as e:
        error_info = {
            "error": "faster-whisper not installed",
            "python_executable": sys.executable,
            "python_version": sys.version.split()[0],
            "python_path": sys.path,
            "suggestion": f"Install with: {sys.executable} -m pip install faster-whisper",
            "import_error": str(e)
        }
        print(json.dumps(error_info), file=sys.stdout)
        sys.stdout.flush()
        sys.exit(1)
    
    # Check if we have the required arguments
    if len(sys.argv) < 2:
        error_info = {
            "error": "Usage: python transcribe_wrapper.py <audio_file> [model_size] [language]"
        }
        print(json.dumps(error_info), file=sys.stdout)
        sys.stdout.flush()
        sys.exit(1)
    
    audio_path = sys.argv[1]
    model_size = sys.argv[2] if len(sys.argv) > 2 else "base"
    language = sys.argv[3] if len(sys.argv) > 3 else None
    
    # Check if audio file exists
    audio_path_obj = Path(audio_path)
    if not audio_path_obj.is_absolute():
        audio_path_obj = audio_path_obj.resolve()
    audio_path = str(audio_path_obj)
    
    if not Path(audio_path).exists():
        error_info = {
            "error": f"Audio file not found: {audio_path}"
        }
        print(json.dumps(error_info), file=sys.stdout)
        sys.stdout.flush()
        sys.exit(1)
    
    try:
        # Initialize model
        model = WhisperModel(
            model_size,
            device="cpu",
            compute_type="int8"
        )
        
        # Transcribe
        segments, info = model.transcribe(
            audio_path,
            language=language,
            word_timestamps=True,
            beam_size=5
        )
        
        # Collect results
        text_segments = []
        full_text = []
        words = []
        
        for segment in segments:
            segment_text = segment.text.strip()
            text_segments.append({
                "start": segment.start,
                "end": segment.end,
                "text": segment_text
            })
            full_text.append(segment_text)
            
            if hasattr(segment, 'words'):
                for word in segment.words:
                    words.append({
                        "word": word.word,
                        "start": word.start,
                        "end": word.end,
                        "probability": word.probability
                    })
        
        result = {
            "text": " ".join(full_text),
            "language": info.language,
            "language_probability": info.language_probability,
            "segments": text_segments,
            "words": words,
            "duration": info.duration
        }
        
        # Output JSON to stdout only (warnings already suppressed)
        print(json.dumps(result), file=sys.stdout)
        sys.stdout.flush()  # Ensure it's written immediately
        
    except Exception as e:
        error_info = {
            "error": f"Transcription failed: {str(e)}",
            "error_type": type(e).__name__
        }
        print(json.dumps(error_info), file=sys.stdout)
        sys.stdout.flush()
        sys.exit(1)

if __name__ == "__main__":
    main()


Transcription Wrapper Script
This script handles faster-whisper import and provides better error messages
"""

import sys
import json
import os
import warnings
from pathlib import Path

# Suppress all warnings - they go to stderr and interfere with JSON parsing
warnings.filterwarnings('ignore')

def main():
    # Check for faster-whisper first
    try:
        import faster_whisper
        from faster_whisper import WhisperModel
    except ImportError as e:
        error_info = {
            "error": "faster-whisper not installed",
            "python_executable": sys.executable,
            "python_version": sys.version.split()[0],
            "python_path": sys.path,
            "suggestion": f"Install with: {sys.executable} -m pip install faster-whisper",
            "import_error": str(e)
        }
        print(json.dumps(error_info), file=sys.stdout)
        sys.stdout.flush()
        sys.exit(1)
    
    # Check if we have the required arguments
    if len(sys.argv) < 2:
        error_info = {
            "error": "Usage: python transcribe_wrapper.py <audio_file> [model_size] [language]"
        }
        print(json.dumps(error_info), file=sys.stdout)
        sys.stdout.flush()
        sys.exit(1)
    
    audio_path = sys.argv[1]
    model_size = sys.argv[2] if len(sys.argv) > 2 else "base"
    language = sys.argv[3] if len(sys.argv) > 3 else None
    
    # Check if audio file exists
    audio_path_obj = Path(audio_path)
    if not audio_path_obj.is_absolute():
        audio_path_obj = audio_path_obj.resolve()
    audio_path = str(audio_path_obj)
    
    if not Path(audio_path).exists():
        error_info = {
            "error": f"Audio file not found: {audio_path}"
        }
        print(json.dumps(error_info), file=sys.stdout)
        sys.stdout.flush()
        sys.exit(1)
    
    try:
        # Initialize model
        model = WhisperModel(
            model_size,
            device="cpu",
            compute_type="int8"
        )
        
        # Transcribe
        segments, info = model.transcribe(
            audio_path,
            language=language,
            word_timestamps=True,
            beam_size=5
        )
        
        # Collect results
        text_segments = []
        full_text = []
        words = []
        
        for segment in segments:
            segment_text = segment.text.strip()
            text_segments.append({
                "start": segment.start,
                "end": segment.end,
                "text": segment_text
            })
            full_text.append(segment_text)
            
            if hasattr(segment, 'words'):
                for word in segment.words:
                    words.append({
                        "word": word.word,
                        "start": word.start,
                        "end": word.end,
                        "probability": word.probability
                    })
        
        result = {
            "text": " ".join(full_text),
            "language": info.language,
            "language_probability": info.language_probability,
            "segments": text_segments,
            "words": words,
            "duration": info.duration
        }
        
        # Output JSON to stdout only (warnings already suppressed)
        print(json.dumps(result), file=sys.stdout)
        sys.stdout.flush()  # Ensure it's written immediately
        
    except Exception as e:
        error_info = {
            "error": f"Transcription failed: {str(e)}",
            "error_type": type(e).__name__
        }
        print(json.dumps(error_info), file=sys.stdout)
        sys.stdout.flush()
        sys.exit(1)

if __name__ == "__main__":
    main()

