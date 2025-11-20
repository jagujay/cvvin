#!/usr/bin/env python3
"""
Local Whisper Transcription Service
Uses faster-whisper for fast, accurate transcription
"""

import sys
import json
from pathlib import Path

try:
    from faster_whisper import WhisperModel
except ImportError as e:
    # Output error to both stdout (for JSON parsing) and stderr (for visibility)
    error_json = json.dumps({
        "error": "faster-whisper not installed",
        "suggestion": "Install with: pip install faster-whisper",
        "python_executable": sys.executable,
        "python_version": sys.version
    })
    print(error_json, file=sys.stdout)
    print(f"ERROR: {error_json}", file=sys.stderr)
    sys.exit(1)


class WhisperTranscriber:
    def __init__(self, model_size="base", device="cpu", compute_type="int8"):
        """
        Initialize Whisper model
        
        Args:
            model_size: Model size (tiny, base, small, medium, large-v2)
            device: "cpu" or "cuda" (if GPU available)
            compute_type: "int8" (CPU), "float16" (GPU), "int8_float16" (GPU)
        """
        try:
            self.model = WhisperModel(
                model_size,
                device=device,
                compute_type=compute_type
            )
        except Exception as e:
            print(json.dumps({
                "error": f"Failed to load Whisper model: {str(e)}",
                "suggestion": "Make sure faster-whisper is installed: pip install faster-whisper"
            }), file=sys.stderr)
            sys.exit(1)
    
    def transcribe(self, audio_path, language=None, word_timestamps=True):
        """
        Transcribe audio file
        
        Args:
            audio_path: Path to audio file
            language: Language code (e.g., "en") or None for auto-detect
            word_timestamps: Include word-level timestamps
        
        Returns:
            Dictionary with transcription and metadata
        """
        try:
            # Normalize path - handle Windows backslashes and resolve to absolute path
            audio_path_obj = Path(audio_path)
            if not audio_path_obj.is_absolute():
                audio_path_obj = audio_path_obj.resolve()
            audio_path = str(audio_path_obj)
            
            # Verify file exists
            if not Path(audio_path).exists():
                return {
                    "error": f"Audio file not found: {audio_path}",
                    "text": ""
                }
            
            # Transcribe using faster-whisper (it handles WebM via internal ffmpeg)
            # Use the resolved absolute path
            segments, info = self.model.transcribe(
                audio_path,
                language=language,
                word_timestamps=word_timestamps,
                beam_size=5
            )
            
            # Collect segments
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
                
                # Collect word timestamps if available
                if word_timestamps and hasattr(segment, 'words'):
                    for word in segment.words:
                        words.append({
                            "word": word.word,
                            "start": word.start,
                            "end": word.end,
                            "probability": word.probability
                        })
            
            return {
                "text": " ".join(full_text),
                "language": info.language,
                "language_probability": info.language_probability,
                "segments": text_segments,
                "words": words if word_timestamps else [],
                "duration": info.duration
            }
            
        except Exception as e:
            return {
                "error": f"Transcription failed: {str(e)}",
                "text": ""
            }


def main():
    """CLI interface for transcription"""
    if len(sys.argv) < 2:
        print(json.dumps({
            "error": "Usage: python whisper_transcriber.py <audio_file> [model_size] [language]"
        }), file=sys.stderr)
        sys.exit(1)
    
    audio_path = sys.argv[1]
    model_size = sys.argv[2] if len(sys.argv) > 2 else "base"
    language = sys.argv[3] if len(sys.argv) > 3 else None
    
    # Check if audio file exists
    if not Path(audio_path).exists():
        print(json.dumps({
            "error": f"Audio file not found: {audio_path}"
        }), file=sys.stderr)
        sys.exit(1)
    
    # Initialize transcriber
    transcriber = WhisperTranscriber(model_size=model_size)
    
    # Transcribe
    result = transcriber.transcribe(audio_path, language=language)
    
    # Output JSON
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()



Local Whisper Transcription Service
Uses faster-whisper for fast, accurate transcription
"""

import sys
import json
from pathlib import Path

try:
    from faster_whisper import WhisperModel
except ImportError as e:
    # Output error to both stdout (for JSON parsing) and stderr (for visibility)
    error_json = json.dumps({
        "error": "faster-whisper not installed",
        "suggestion": "Install with: pip install faster-whisper",
        "python_executable": sys.executable,
        "python_version": sys.version
    })
    print(error_json, file=sys.stdout)
    print(f"ERROR: {error_json}", file=sys.stderr)
    sys.exit(1)


class WhisperTranscriber:
    def __init__(self, model_size="base", device="cpu", compute_type="int8"):
        """
        Initialize Whisper model
        
        Args:
            model_size: Model size (tiny, base, small, medium, large-v2)
            device: "cpu" or "cuda" (if GPU available)
            compute_type: "int8" (CPU), "float16" (GPU), "int8_float16" (GPU)
        """
        try:
            self.model = WhisperModel(
                model_size,
                device=device,
                compute_type=compute_type
            )
        except Exception as e:
            print(json.dumps({
                "error": f"Failed to load Whisper model: {str(e)}",
                "suggestion": "Make sure faster-whisper is installed: pip install faster-whisper"
            }), file=sys.stderr)
            sys.exit(1)
    
    def transcribe(self, audio_path, language=None, word_timestamps=True):
        """
        Transcribe audio file
        
        Args:
            audio_path: Path to audio file
            language: Language code (e.g., "en") or None for auto-detect
            word_timestamps: Include word-level timestamps
        
        Returns:
            Dictionary with transcription and metadata
        """
        try:
            # Normalize path - handle Windows backslashes and resolve to absolute path
            audio_path_obj = Path(audio_path)
            if not audio_path_obj.is_absolute():
                audio_path_obj = audio_path_obj.resolve()
            audio_path = str(audio_path_obj)
            
            # Verify file exists
            if not Path(audio_path).exists():
                return {
                    "error": f"Audio file not found: {audio_path}",
                    "text": ""
                }
            
            # Transcribe using faster-whisper (it handles WebM via internal ffmpeg)
            # Use the resolved absolute path
            segments, info = self.model.transcribe(
                audio_path,
                language=language,
                word_timestamps=word_timestamps,
                beam_size=5
            )
            
            # Collect segments
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
                
                # Collect word timestamps if available
                if word_timestamps and hasattr(segment, 'words'):
                    for word in segment.words:
                        words.append({
                            "word": word.word,
                            "start": word.start,
                            "end": word.end,
                            "probability": word.probability
                        })
            
            return {
                "text": " ".join(full_text),
                "language": info.language,
                "language_probability": info.language_probability,
                "segments": text_segments,
                "words": words if word_timestamps else [],
                "duration": info.duration
            }
            
        except Exception as e:
            return {
                "error": f"Transcription failed: {str(e)}",
                "text": ""
            }


def main():
    """CLI interface for transcription"""
    if len(sys.argv) < 2:
        print(json.dumps({
            "error": "Usage: python whisper_transcriber.py <audio_file> [model_size] [language]"
        }), file=sys.stderr)
        sys.exit(1)
    
    audio_path = sys.argv[1]
    model_size = sys.argv[2] if len(sys.argv) > 2 else "base"
    language = sys.argv[3] if len(sys.argv) > 3 else None
    
    # Check if audio file exists
    if not Path(audio_path).exists():
        print(json.dumps({
            "error": f"Audio file not found: {audio_path}"
        }), file=sys.stderr)
        sys.exit(1)
    
    # Initialize transcriber
    transcriber = WhisperTranscriber(model_size=model_size)
    
    # Transcribe
    result = transcriber.transcribe(audio_path, language=language)
    
    # Output JSON
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()


