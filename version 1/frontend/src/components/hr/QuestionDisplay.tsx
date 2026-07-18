import { useState, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Play, Pause, Volume2 } from "lucide-react";

interface QuestionDisplayProps {
  question: string;
  autoPlay?: boolean;
  onPlayComplete?: () => void;
  onWordHighlight?: (wordIndex: number) => void;
}

export const QuestionDisplay = ({
  question,
  autoPlay = true,
  onPlayComplete,
  onWordHighlight
}: QuestionDisplayProps) => {
  const [words, setWords] = useState<string[]>([]);
  const [currentWordIndex, setCurrentWordIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const wordTimersRef = useRef<NodeJS.Timeout[]>([]);
  const questionRef = useRef<string>("");
  const hasPlayedRef = useRef<boolean>(false);
  const { toast } = useToast();

  // Always split question into words for display
  useEffect(() => {
    if (questionRef.current !== question) {
      questionRef.current = question;
      hasPlayedRef.current = false;
      
      // Cancel any ongoing speech
      if (window.speechSynthesis?.speaking) {
        window.speechSynthesis.cancel();
      }
      
      // Cleanup previous timers
      wordTimersRef.current.forEach(timer => clearTimeout(timer));
      wordTimersRef.current = [];
    }

    // Split question into words for display
    const questionWords = question
      .split(/(\s+)/)
      .filter(w => w.trim().length > 0)
      .map(w => w.trim());
    
    setWords(questionWords);
    setCurrentWordIndex(-1);

    // Auto-play if requested and TTS is available
    if (autoPlay && window.speechSynthesis && !hasPlayedRef.current) {
      playQuestion();
    }
  }, [question, autoPlay]);

  const playQuestion = () => {
    if (!window.speechSynthesis) {
      toast({
        title: "Not Supported",
        description: "Text-to-speech is not supported in this browser.",
        variant: "destructive"
      });
      return;
    }

    // Cancel any ongoing speech
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }

    // Create utterance
    const utterance = new SpeechSynthesisUtterance(question);
    utterance.rate = 0.85; // Slightly slower for clarity
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    utterance.lang = 'en-US';

    utterance.onstart = () => {
      setIsPlaying(true);
      setCurrentWordIndex(0);
      hasPlayedRef.current = true;
      onWordHighlight?.(0);
    };

    utterance.onboundary = (event: SpeechSynthesisEvent) => {
      if (event.name === 'word' && event.charIndex !== undefined) {
        // Find which word we're on based on character index
        let charCount = 0;
        const questionWords = question
          .split(/(\s+)/)
          .filter(w => w.trim().length > 0)
          .map(w => w.trim());
        
        for (let i = 0; i < questionWords.length; i++) {
          if (charCount <= event.charIndex && event.charIndex < charCount + questionWords[i].length) {
            setCurrentWordIndex(i);
            onWordHighlight?.(i);
            break;
          }
          charCount += questionWords[i].length + 1; // +1 for space
        }
      }
    };

    utterance.onend = () => {
      setIsPlaying(false);
      setCurrentWordIndex(-1);
      onPlayComplete?.();
    };

    utterance.onerror = (event) => {
      setIsPlaying(false);
      setCurrentWordIndex(-1);
      hasPlayedRef.current = true;
      toast({
        title: "Playback Error",
        description: "Failed to play question audio. Please read the question.",
        variant: "destructive"
      });
      // Still call onPlayComplete even on error
      onPlayComplete?.();
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  const stopQuestion = () => {
    if (window.speechSynthesis?.speaking) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      setCurrentWordIndex(-1);
    }
  };

  return (
    <div className="space-y-4">
      {/* Question Text - Always visible */}
      <div className="text-lg leading-relaxed p-4 bg-muted/50 rounded-lg">
        {words.length > 0 ? (
          words.map((word, index) => (
            <span
              key={index}
              className={`inline-block mr-1 transition-all duration-200 ${
                index === currentWordIndex
                  ? 'bg-primary text-primary-foreground px-1 rounded font-semibold scale-110'
                  : index < currentWordIndex
                  ? 'text-muted-foreground'
                  : 'text-foreground'
              }`}
            >
              {word}
            </span>
          ))
        ) : (
          <p className="text-foreground">{question}</p>
        )}
      </div>

      {/* Audio Controls */}
      <div className="flex items-center gap-2">
        {window.speechSynthesis ? (
          <>
            {!isPlaying ? (
              <Button
                variant="outline"
                size="sm"
                onClick={playQuestion}
                className="gap-2"
              >
                <Play className="w-4 h-4" />
                Play Question
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={stopQuestion}
                className="gap-2"
              >
                <Pause className="w-4 h-4" />
                Stop
              </Button>
            )}
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              <Volume2 className="w-4 h-4" />
              Click to hear the question
            </span>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Text-to-speech not available. Please read the question above.
          </p>
        )}
      </div>
    </div>
  );
};
