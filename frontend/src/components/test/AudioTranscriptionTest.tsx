import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  Mic, 
  MicOff, 
  Square, 
  Loader2,
  CheckCircle2,
  AlertCircle,
  Volume2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { consolidatedAPI } from "@/services/consolidatedAPI";
import { useAuth } from "@/contexts/AuthContext";

const AudioTranscriptionTest = () => {
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [transcription, setTranscription] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timeLimit = 60; // 60 seconds

  const handleStartRecording = async () => {
    try {
      setError(null);
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
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        
        // Stop all tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }

        // Start transcription
        await transcribeAudio(blob);
      };

      // Start recording
      mediaRecorder.start(100); // Collect data every 100ms
      setIsRecording(true);
      setRecordingTime(0);

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
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

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
    } finally {
      setIsTranscribing(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = (recordingTime / timeLimit) * 100;

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Volume2 className="w-5 h-5" />
          Audio Transcription Test
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status Display */}
        <div className="flex items-center justify-between">
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
          <Progress value={progress} className="h-2" />
        )}

        {/* Controls */}
        <div className="flex items-center justify-center gap-4">
          {!isRecording && !isTranscribing && !transcription && (
            <Button
              onClick={handleStartRecording}
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
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <p className="text-sm font-semibold mb-2">Transcribed Text:</p>
            <p className="text-sm">{transcription.text}</p>
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
            <p className="text-sm text-destructive font-semibold mb-1">Error:</p>
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* Info */}
        {!isRecording && !isTranscribing && !transcription && (
          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              Click "Start Recording" to test audio transcription.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Maximum recording time: {formatTime(timeLimit)}
            </p>
          </div>
        )}

        {/* Reset Button */}
        {transcription && (
          <Button
            variant="outline"
            onClick={() => {
              setTranscription(null);
              setAudioBlob(null);
              setError(null);
              setRecordingTime(0);
            }}
            className="w-full"
          >
            Test Again
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default AudioTranscriptionTest;





