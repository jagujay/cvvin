import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff } from "lucide-react";

interface Word {
  word: string;
  start: number;
  end: number;
  probability: number;
  is_filler?: boolean;
}

interface Pause {
  type: 'pause';
  start: number;
  end: number;
  duration_ms: number;
  after_word: string;
  before_word: string;
}

interface FluencyMetrics {
  total_words: number;
  filler_count: number;
  filler_percentage: number;
  pause_count: number;
  avg_pause_duration_ms: number;
  total_pause_time_ms: number;
  words_per_minute: number;
  speaking_time_seconds: number;
}

interface Transcription {
  text: string;
  text_clean?: string;
  language: string;
  segments: any[];
  words: Word[];
  pauses?: Pause[];
  duration: number;
  fluency_metrics?: FluencyMetrics;
}

interface TranscriptDisplayProps {
  transcription: Transcription | string;
  compact?: boolean;
}

export const TranscriptDisplay = ({ transcription, compact = false }: TranscriptDisplayProps) => {
  const [showFillers, setShowFillers] = useState(true);
  const [showPauses, setShowPauses] = useState(false);

  // Handle string transcription (legacy format)
  if (typeof transcription === 'string') {
    return (
      <div className="space-y-2">
        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
          {transcription}
        </p>
      </div>
    );
  }

  // Enhanced transcription with filler words and pauses
  const hasWords = transcription.words && transcription.words.length > 0;
  const hasPauses = transcription.pauses && transcription.pauses.length > 0;
  const hasMetrics = transcription.fluency_metrics;

  // Create a map of pause positions for rendering
  const pauseMap = new Map<number, Pause>();
  if (hasPauses && transcription.pauses) {
    transcription.pauses.forEach(pause => {
      // Find the word index after which this pause occurs
      const wordIndex = transcription.words.findIndex(w => 
        w.word.trim() === pause.after_word.trim()
      );
      if (wordIndex !== -1) {
        pauseMap.set(wordIndex, pause);
      }
    });
  }

  return (
    <div className="space-y-3">
      {/* Controls */}
      {hasWords && !compact && (
        <div className="flex gap-2 items-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFillers(!showFillers)}
            className="text-xs"
          >
            {showFillers ? <Eye className="w-3 h-3 mr-1" /> : <EyeOff className="w-3 h-3 mr-1" />}
            {showFillers ? 'Hide' : 'Show'} Fillers
          </Button>
          {hasPauses && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPauses(!showPauses)}
              className="text-xs"
            >
              {showPauses ? <Eye className="w-3 h-3 mr-1" /> : <EyeOff className="w-3 h-3 mr-1" />}
              {showPauses ? 'Hide' : 'Show'} Pauses
            </Button>
          )}
        </div>
      )}

      {/* Transcript Text */}
      <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
        {hasWords ? (
          <div className="space-y-1">
            {transcription.words.map((word: Word, idx: number) => {
              const pause = pauseMap.get(idx);
              const shouldShowWord = showFillers || !word.is_filler;
              
              return (
                <span key={idx}>
                  {shouldShowWord && (
                    <span 
                      className={
                        word.is_filler 
                          ? "text-orange-500 dark:text-orange-400 italic font-medium" 
                          : "text-gray-700 dark:text-gray-300"
                      }
                      title={word.is_filler ? `Filler word (${(word.probability * 100).toFixed(0)}% confidence)` : ""}
                    >
                      {word.word}
                    </span>
                  )}
                  {shouldShowWord && ' '}
                  {showPauses && pause && (
                    <Badge 
                      variant="outline" 
                      className="mx-1 text-xs bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800"
                    >
                      ⏸ {(pause.duration_ms / 1000).toFixed(1)}s
                    </Badge>
                  )}
                </span>
              );
            })}
          </div>
        ) : (
          <p>{transcription.text || 'No transcription available'}</p>
        )}
      </div>

      {/* Fluency Metrics */}
      {hasMetrics && !compact && (
        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
            📊 Fluency Analysis
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-blue-50 dark:bg-blue-950 p-2 rounded">
              <p className="text-xs text-blue-600 dark:text-blue-400">Total Words</p>
              <p className="text-lg font-bold text-blue-700 dark:text-blue-300">
                {transcription.fluency_metrics.total_words}
              </p>
            </div>
            <div className="bg-green-50 dark:bg-green-950 p-2 rounded">
              <p className="text-xs text-green-600 dark:text-green-400">Speaking Rate</p>
              <p className="text-lg font-bold text-green-700 dark:text-green-300">
                {transcription.fluency_metrics.words_per_minute.toFixed(0)} WPM
              </p>
            </div>
            {transcription.fluency_metrics.filler_count > 0 && (
              <>
                <div className="bg-orange-50 dark:bg-orange-950 p-2 rounded">
                  <p className="text-xs text-orange-600 dark:text-orange-400">Filler Words</p>
                  <p className="text-lg font-bold text-orange-700 dark:text-orange-300">
                    {transcription.fluency_metrics.filler_count}
                  </p>
                </div>
                <div className="bg-orange-50 dark:bg-orange-950 p-2 rounded">
                  <p className="text-xs text-orange-600 dark:text-orange-400">Filler Rate</p>
                  <p className="text-lg font-bold text-orange-700 dark:text-orange-300">
                    {transcription.fluency_metrics.filler_percentage.toFixed(1)}%
                  </p>
                </div>
              </>
            )}
            {transcription.fluency_metrics.pause_count > 0 && (
              <>
                <div className="bg-purple-50 dark:bg-purple-950 p-2 rounded">
                  <p className="text-xs text-purple-600 dark:text-purple-400">Pauses</p>
                  <p className="text-lg font-bold text-purple-700 dark:text-purple-300">
                    {transcription.fluency_metrics.pause_count}
                  </p>
                </div>
                <div className="bg-purple-50 dark:bg-purple-950 p-2 rounded">
                  <p className="text-xs text-purple-600 dark:text-purple-400">Avg Pause</p>
                  <p className="text-lg font-bold text-purple-700 dark:text-purple-300">
                    {(transcription.fluency_metrics.avg_pause_duration_ms / 1000).toFixed(1)}s
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Fluency Score Indicator */}
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-600 dark:text-gray-400">Fluency Score</span>
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                {calculateFluencyScore(transcription.fluency_metrics)}/100
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all ${getFluencyScoreColor(calculateFluencyScore(transcription.fluency_metrics))}`}
                style={{ width: `${calculateFluencyScore(transcription.fluency_metrics)}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      {hasWords && !compact && (
        <div className="flex gap-3 text-xs text-gray-600 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-700">
          <span className="flex items-center gap-1">
            <span className="text-orange-500 italic font-medium">um, uh</span> = Filler words
          </span>
          {hasPauses && (
            <span className="flex items-center gap-1">
              <Badge variant="outline" className="text-xs bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800">
                ⏸ 1.2s
              </Badge> = Pause
            </span>
          )}
        </div>
      )}
    </div>
  );
};

// Helper function to calculate fluency score (0-100)
function calculateFluencyScore(metrics: FluencyMetrics): number {
  let score = 100;
  
  // Deduct points for high filler percentage (max -30 points)
  score -= Math.min(30, metrics.filler_percentage * 3);
  
  // Deduct points for very slow or very fast speaking (optimal is 130-170 WPM)
  const wpm = metrics.words_per_minute;
  if (wpm < 100) {
    score -= Math.min(20, (100 - wpm) / 2);
  } else if (wpm > 200) {
    score -= Math.min(20, (wpm - 200) / 5);
  }
  
  // Deduct points for excessive pauses (max -20 points)
  if (metrics.avg_pause_duration_ms > 2000) {
    score -= Math.min(20, (metrics.avg_pause_duration_ms - 2000) / 200);
  }
  
  return Math.max(0, Math.round(score));
}

// Helper function to get color based on fluency score
function getFluencyScoreColor(score: number): string {
  if (score >= 80) return 'bg-green-500';
  if (score >= 60) return 'bg-yellow-500';
  if (score >= 40) return 'bg-orange-500';
  return 'bg-red-500';
}









