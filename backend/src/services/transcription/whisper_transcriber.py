#!/usr/bin/env python3
"""
Local Whisper Transcription Service
Uses faster-whisper for fast, accurate transcription
Enhanced with filler word detection and pause analysis
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

# Common filler words to detect
FILLER_WORDS = {
    'um', 'uh', 'ah', 'er', 'hmm', 'hm', 'mm',
    'umm', 'uhh', 'ahh', 'err', 'erm', 'eh',
    'like', 'basically', 'actually', 'literally',
    'you know', 'i mean', 'sort of', 'kind of'
}

def detect_pauses(words, pause_threshold_ms=500):
        """
    Detect pauses between words based on timestamp gaps
        
        Args:
        words: List of word dictionaries with start/end timestamps
        pause_threshold_ms: Minimum pause duration in milliseconds to detect
    
    Returns:
        List of pause events with timestamps and durations
    """
    pauses = []
    for i in range(len(words) - 1):
        current_end = words[i]["end"]
        next_start = words[i + 1]["start"]
        pause_duration_ms = (next_start - current_end) * 1000  # Convert to ms
        
        if pause_duration_ms >= pause_threshold_ms:
            pauses.append({
                "type": "pause",
                "start": current_end,
                "end": next_start,
                "duration_ms": round(pause_duration_ms, 2),
                "after_word": words[i]["word"].strip(),
                "before_word": words[i + 1]["word"].strip()
            })
    
    return pauses

def tag_filler_words(words):
        """
    Tag words that are identified as filler words
        
        Args:
        words: List of word dictionaries
        
        Returns:
        Enhanced word list with is_filler flag
    """
    for word in words:
        word_text = word["word"].strip().lower()
        # Remove punctuation for comparison
        word_clean = word_text.strip('.,!?;:')
        word["is_filler"] = word_clean in FILLER_WORDS
    return words

def calculate_fluency_metrics(words, pauses, duration):
    """
    Calculate fluency metrics based on filler words and pauses
    
    Args:
        words: List of word dictionaries
        pauses: List of pause events
        duration: Total audio duration in seconds
    
    Returns:
        Dictionary with fluency metrics
    """
    total_words = len(words)
    filler_count = sum(1 for w in words if w.get("is_filler", False))
    pause_count = len(pauses)
    
    total_pause_time_ms = sum(p["duration_ms"] for p in pauses)
    avg_pause_duration_ms = total_pause_time_ms / pause_count if pause_count > 0 else 0
    
    # Calculate speaking rate (words per minute, excluding pause time)
    speaking_time_seconds = duration - (total_pause_time_ms / 1000)
    words_per_minute = (total_words / speaking_time_seconds * 60) if speaking_time_seconds > 0 else 0
    
    return {
        "total_words": total_words,
        "filler_count": filler_count,
        "filler_percentage": round((filler_count / total_words * 100), 2) if total_words > 0 else 0,
        "pause_count": pause_count,
        "avg_pause_duration_ms": round(avg_pause_duration_ms, 2),
        "total_pause_time_ms": round(total_pause_time_ms, 2),
        "words_per_minute": round(words_per_minute, 2),
        "speaking_time_seconds": round(speaking_time_seconds, 2)
    }


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
        Transcribe audio file with enhanced filler word and pause detection
        
        Args:
            audio_path: Path to audio file
            language: Language code (e.g., "en") or None for auto-detect
            word_timestamps: Include word-level timestamps
        
        Returns:
            Dictionary with transcription, metadata, filler words, and pauses
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
            
            # Transcribe using faster-whisper with enhanced parameters
            # Use the resolved absolute path
            segments, info = self.model.transcribe(
                audio_path,
                language=language,
                word_timestamps=word_timestamps,
                beam_size=5,
                condition_on_previous_text=True,  # Maintain context for natural speech
                no_speech_threshold=0.6,  # Lower threshold to catch hesitations
                initial_prompt="Include all filler words like um, uh, ah, hmm, er, and natural pauses in the transcription."  # Hint to model
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
            
            # Enhance words with filler word tags
            if words:
                words = tag_filler_words(words)
                
                # Detect pauses between words
                pauses = detect_pauses(words, pause_threshold_ms=500)
                
                # Calculate fluency metrics
                fluency_metrics = calculate_fluency_metrics(words, pauses, info.duration)
                
                # Create clean text without filler words
                clean_words = [w["word"] for w in words if not w.get("is_filler", False)]
                text_clean = " ".join(clean_words)
            else:
                # Fallback: Calculate basic metrics from text if word-level timestamps not available
                pauses = []
                full_text_str = " ".join(full_text)
                
                # Split text into words and create word objects for basic counting
                text_words = full_text_str.split()
                total_words = len(text_words)
                
                # Create word objects with filler detection (without timestamps)
                words = []
                filler_count = 0
                clean_words_list = []
                
                # Estimate time per word for approximate timestamps
                time_per_word = info.duration / total_words if total_words > 0 else 0
                
                for idx, word_text in enumerate(text_words):
                    word_clean = word_text.strip('.,!?;:').lower()
                    is_filler = word_clean in FILLER_WORDS
                    
                    if is_filler:
                        filler_count += 1
                    else:
                        clean_words_list.append(word_text)
                    
                    # Create word object with estimated timestamps
                    words.append({
                        "word": word_text,
                        "start": idx * time_per_word,
                        "end": (idx + 1) * time_per_word,
                        "probability": 1.0,
                        "is_filler": is_filler
                    })
                
                # Calculate basic WPM
                words_per_minute = (total_words / info.duration * 60) if info.duration > 0 else 0
                
                fluency_metrics = {
                    "total_words": total_words,
                    "filler_count": filler_count,
                    "filler_percentage": round((filler_count / total_words * 100), 2) if total_words > 0 else 0,
                    "pause_count": 0,
                    "avg_pause_duration_ms": 0,
                    "total_pause_time_ms": 0,
                    "words_per_minute": round(words_per_minute, 2),
                    "speaking_time_seconds": round(info.duration, 2)
                }
                text_clean = " ".join(clean_words_list)
            
            return {
                "text": " ".join(full_text),  # Full verbatim text
                "text_clean": text_clean,  # Text without filler words
                "language": info.language,
                "language_probability": info.language_probability,
                "segments": text_segments,
                "words": words if word_timestamps else [],
                "pauses": pauses,  # Detected pause events
                "duration": info.duration,
                "fluency_metrics": fluency_metrics  # Calculated metrics
            }
            
        except Exception as e:
            return {
                "error": f"Transcription failed: {str(e)}",
                "text": "",
                "text_clean": "",
                "language": "unknown",
                "language_probability": 0,
                "segments": [],
                "words": [],
                "pauses": [],
                "duration": 0,
                "fluency_metrics": {
                    "total_words": 0,
                    "filler_count": 0,
                    "filler_percentage": 0,
                    "pause_count": 0,
                    "avg_pause_duration_ms": 0,
                    "total_pause_time_ms": 0,
                    "words_per_minute": 0,
                    "speaking_time_seconds": 0
                }
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
