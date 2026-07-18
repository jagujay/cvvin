import { useState, useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  Mic, 
  Square, 
  Loader2,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { consolidatedAPI } from "@/services/consolidatedAPI";
import { useAuth } from "@/contexts/AuthContext";

interface AudioRecorderProps {
  questionId: string;
  sessionId: string | null;
  disabled?: boolean;
  timeLimit?: number; // in seconds
  autoStart?: boolean;
  onRecordingStart?: () => void;
  onRecordingStop?: () => void;
  onTranscriptionComplete?: (transcription: any, audioBlob: Blob) => void;
  onTranscriptionError?: (error: Error) => void;
}

export interface AudioRecorderRef {
  startRecording: () => Promise<void>;
  stopRecording: () => void;
}

const AudioRecorder = forwardRef<AudioRecorderRef, AudioRecorderProps>(({
  questionId,
  sessionId,
  disabled = false,
  timeLimit = 60,
  autoStart = false,
  onRecordingStart,
  onRecordingStop,
  onTranscriptionComplete,
  onTranscriptionError
}, ref) => {
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [transcription, setTranscription] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isStopping, setIsStopping] = useState(false); // Track if we're in the process of stopping
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    startRecording: async () => {
      if (!disabled && !isRecording) {
        await handleStartRecording();
      }
    },
    stopRecording: () => {
      if (isRecording) {
        handleStopRecording();
      }
    }
  }));

  // Auto-start recording when autoStart becomes true
  useEffect(() => {
    if (autoStart && !disabled && !isRecording && !isTranscribing && !transcription && !isStopping) {
      handleStartRecording();
    }
  }, [autoStart, disabled, isRecording, isTranscribing, transcription, isStopping]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const handleStartRecording = async () => {
    // Prevent starting if we're already recording, transcribing, or stopping
    if (isRecording || isTranscribing || isStopping || transcription) {
      return;
    }
    
    try {
      setError(null);
      setIsStopping(false); // Reset stopping flag
      audioChunksRef.current = [];

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      streamRef.current = stream;

      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      mediaRecorderRef.current = mediaRecorder;

      // Collect audio chunks
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      // Handle recording stop
      mediaRecorder.onstop = async () => {
        // Ensure we're marked as stopping
        setIsStopping(true);
        setIsRecording(false);
        
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        
        // Stop all tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }

        // Clear timer if still running
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }

        // Start transcription
        await transcribeAudio(blob);
      };

      // Start recording
      mediaRecorder.start(100); // Collect data every 100ms
      setIsRecording(true);
      setRecordingTime(0);
      onRecordingStart?.();

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          const newTime = prev + 1;
          if (newTime >= timeLimit) {
            // Auto-stop at time limit
            handleStopRecording();
            return timeLimit;
          }
          return newTime;
        });
      }, 1000);

      toast({
        title: "Recording Started",
        description: "Speak now. Recording will stop automatically after 60 seconds.",
      });

    } catch (err: any) {
      console.error('Failed to start recording:', err);
      setError(err.message || 'Failed to access microphone');
      toast({
        title: "Recording Error",
        description: err.message || "Failed to start recording. Please check microphone permissions.",
        variant: "destructive"
      });
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording && !isStopping) {
      setIsStopping(true); // Prevent restart while stopping
      
      // Stop the MediaRecorder
      try {
        if (mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop();
        }
      } catch (err) {
        console.error('Error stopping MediaRecorder:', err);
      }
      
      setIsRecording(false);
      onRecordingStop?.();

      // Clear timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      toast({
        title: "Recording Stopped",
        description: "Processing your audio...",
      });
    }
  };

  const transcribeAudio = async (blob: Blob) => {
    if (!currentUser) {
      const error = new Error('User not logged in');
      setError(error.message);
      toast({
        title: "Error",
        description: "Please log in to use transcription.",
        variant: "destructive"
      });
      return;
    }

    setIsTranscribing(true);
    setError(null);

    try {
      // Create a test session ID for testing
      const testSessionId = `test_${Date.now()}`;
      const testQuestionId = `test_q1`;

      // Upload and transcribe audio
      const result = await consolidatedAPI.transcribeAudio(
        currentUser,
        testSessionId,
        testQuestionId,
        blob
      );

      if (result.success && result.transcription) {
        setTranscription(result.transcription);
        onTranscriptionComplete?.(result.transcription, blob);
        toast({
          title: "Transcription Complete",
          description: "Your audio has been transcribed successfully.",
          duration: 3000
        });
      } else {
        throw new Error(result.error || 'Transcription failed');
      }
    } catch (err: any) {
      console.error('Transcription error:', err);
      setError(err.message || 'Failed to transcribe audio');
      toast({
        title: "Transcription Error",
        description: err.message || "Failed to transcribe audio. Please try again.",
        variant: "destructive"
      });
      onTranscriptionError?.(err);
    } finally {
      setIsTranscribing(false);
      setIsStopping(false); // Allow recording again after transcription completes or fails
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = (recordingTime / timeLimit) * 100;

  return (
    <div className="space-y-4">
      <Card className="border-2 border-dashed">
        <CardContent className="p-6">
          {/* Recording Status */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              {isRecording && (
                <div className="relative">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                  <div className="absolute inset-0 w-3 h-3 bg-red-500 rounded-full animate-ping opacity-75" />
                </div>
              )}
              {isTranscribing && (
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              )}
              {transcription && !isTranscribing && (
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              )}
              {error && (
                <AlertCircle className="w-5 h-5 text-destructive" />
              )}
              
              <div>
                <p className="font-semibold">
                  {isRecording ? 'Recording...' : 
                   isTranscribing ? 'Transcribing...' : 
                   transcription ? 'Transcribed' : 
                   error ? 'Error' : 
                   'Ready to Record'}
                </p>
                {isRecording && (
                  <p className="text-sm text-muted-foreground">
                    {formatTime(recordingTime)} / {formatTime(timeLimit)}
                  </p>
                )}
              </div>
            </div>

            {isRecording && (
              <Badge variant="destructive" className="animate-pulse">
                REC
              </Badge>
            )}
          </div>

          {/* Progress Bar */}
          {isRecording && (
            <Progress value={progress} className="h-2 mb-4" />
          )}

          {/* Controls */}
          <div className="flex items-center justify-center gap-4">
            {!isRecording && !isTranscribing && !transcription && (
              <Button
                onClick={handleStartRecording}
                disabled={disabled}
                size="lg"
                className="gap-2"
              >
                <Mic className="w-5 h-5" />
                Start Recording
              </Button>
            )}

            {isRecording && (
              <Button
                onClick={handleStopRecording}
                variant="destructive"
                size="lg"
                className="gap-2"
              >
                <Square className="w-5 h-5" />
                Stop Recording
              </Button>
            )}

            {isTranscribing && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Transcribing audio...</span>
              </div>
            )}
          </div>

          {/* Transcription Result */}
          {transcription && transcription.text && (
            <div className="mt-4 p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <p className="text-sm font-semibold text-green-700 dark:text-green-300">Transcribed Text:</p>
              </div>
              <p className="text-sm text-green-800 dark:text-green-200">{transcription.text}</p>
              {transcription.language && (
                <p className="text-xs text-muted-foreground mt-2">
                  Detected language: {transcription.language}
                </p>
              )}
              {transcription.duration && (
                <p className="text-xs text-muted-foreground">
                  Audio duration: {transcription.duration.toFixed(2)}s
                </p>
              )}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Info */}
          {!isRecording && !isTranscribing && !transcription && (
            <p className="text-xs text-muted-foreground text-center mt-4">
              Click "Start Recording" to begin. Maximum recording time: {formatTime(timeLimit)}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
});

AudioRecorder.displayName = "AudioRecorder";

export { AudioRecorder };


