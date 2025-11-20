import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Clock, 
  MessageSquare,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Loader2
} from "lucide-react";
import Layout from "@/components/layout/Layout";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { AudioRecorder } from "@/components/hr/AudioRecorder";
import { QuestionDisplay } from "@/components/hr/QuestionDisplay";
import { consolidatedAPI } from "@/services/consolidatedAPI";
import hrData from "@/mock/hr.json";
import ProctoringSetup from "@/components/proctoring/ProctoringSetup";
import { proctoringService, Violation } from "@/services/proctoringService";
import { violationTracker } from "@/services/violationTracker";
import { aiMonitoringService } from "@/services/aiMonitoringService";
import { faceVerificationService } from "@/services/faceVerificationService";

interface Question {
  id: string;
  category: string;
  question: string;
  followUps: string[];
  tips: string[];
  timeLimit: number;
  rubric: Record<string, { weight: number; description: string }>;
}

interface Transcription {
  text: string;
  language: string;
  segments: any[];
  words: any[];
  duration: number;
}

// Helper function to get fallback questions with intro first
const getFallbackQuestions = (count: number): Question[] => {
  // Create intro question
  const introQuestion: Question = {
    id: 'hr_intro_001',
    category: 'Introduction',
    question: "Tell me about yourself.",
    followUps: [
      "What interests you most about this role?",
      "How does this role align with your career goals?"
    ],
    tips: [
      "Keep your answer concise and relevant (2-3 minutes)",
      "Focus on your background, skills, and what makes you unique",
      "Connect your experience to the role you're applying for",
      "Show enthusiasm and genuine interest"
    ],
    timeLimit: 120,
    rubric: {
      clarity: { weight: 25, description: "Clear communication and well-structured response" },
      relevance: { weight: 30, description: "Response relevance to the role and company" },
      confidence: { weight: 20, description: "Confidence and enthusiasm in delivery" },
      professionalism: { weight: 25, description: "Professional tone and appropriate content" }
    }
  };

  // Filter out beginner-inappropriate questions
  const isSuitableForBeginners = (q: Question) => {
    if (!q.question) return false;
    const questionText = q.question.toLowerCase();
    const experienceKeywords = [
      'many jobs', 'multiple jobs', 'job hopping',
      'why are you leaving', 'why did you leave',
      'previous job', 'previous role', 'previous position', 'previous employer',
      'resigned', 'fired', 'terminated',
      'work experience', 'professional experience', 'career history', 'job history', 'employment history'
    ];
    return !experienceKeywords.some(keyword => questionText.includes(keyword));
  };

  // Get all questions except intro and filter for beginners
  const availableQuestions = hrData.questions.filter(q => {
    // Exclude intro question if it exists
    if (q.question.toLowerCase().includes('tell me about yourself')) {
      return false;
    }
    return isSuitableForBeginners(q);
  });

  // Shuffle and select
  const shuffled = [...availableQuestions].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, count - 1);

  // Return intro question first, then selected questions
  return [introQuestion, ...selected];
};

const HRSession = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [responses, setResponses] = useState<Record<string, Transcription | string>>({});
  const [audioBlobs, setAudioBlobs] = useState<Record<string, Blob>>({}); // Store audio temporarily
  const [sessionStarted, setSessionStarted] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [currentResponse, setCurrentResponse] = useState("");
  const [showTips, setShowTips] = useState(false);
  const [transcribing, setTranscribing] = useState<Record<string, boolean>>({});
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [proctoringSetupComplete, setProctoringSetupComplete] = useState(false);
  const [isFullscreenExitBlocking, setIsFullscreenExitBlocking] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [preparationTime, setPreparationTime] = useState(5); // 5 seconds preparation
  const [isPreparing, setIsPreparing] = useState(false); // Start with false, will be true after audio plays
  const [hasRecorded, setHasRecorded] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [nextQuestionCountdown, setNextQuestionCountdown] = useState(0); // 10 seconds countdown after recording
  const [questionAudioPlayed, setQuestionAudioPlayed] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const preparationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const nextQuestionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRecorderRef = useRef<{ startRecording: () => Promise<void> } | null>(null);
  
  // AI monitoring
  const hiddenVideoRef = useRef<HTMLVideoElement>(null);
  const aiMonitoringInitialized = useRef(false);
  
  const currentQuestion = questions[currentQuestionIndex];

  // Sync currentResponse when question changes
  useEffect(() => {
    if (currentQuestion) {
      const savedResponse = responses[currentQuestion.id];
      if (savedResponse) {
        // If there's a saved response, load it
        setCurrentResponse(typeof savedResponse === 'string' ? savedResponse : savedResponse.text);
        setHasRecorded(true); // Mark as recorded if response exists
      } else {
        // Otherwise, clear the response
        setCurrentResponse("");
        setHasRecorded(false);
      }
      setShowTips(false);
      // Reset all states for new question
      setIsPreparing(false); // Will be set to true after audio plays
      setPreparationTime(5);
      setIsRecording(false);
      setQuestionAudioPlayed(false);
      setNextQuestionCountdown(0);
      // Reset audio recorder ref to allow new recording
      audioRecorderRef.current = null;
      // Clear any existing timers
      if (preparationTimerRef.current) {
        clearInterval(preparationTimerRef.current);
        preparationTimerRef.current = null;
      }
      if (nextQuestionTimerRef.current) {
        clearInterval(nextQuestionTimerRef.current);
        nextQuestionTimerRef.current = null;
      }
    }
  }, [currentQuestionIndex, currentQuestion?.id]);

  // Handle preparation timer and auto-start recording
  useEffect(() => {
    if (isPreparing && preparationTime > 0 && currentQuestion) {
      preparationTimerRef.current = setInterval(() => {
        setPreparationTime(prev => {
          if (prev <= 1) {
            setIsPreparing(false);
            // Auto-start recording when preparation time ends
            if (audioRecorderRef.current) {
              audioRecorderRef.current.startRecording();
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (preparationTimerRef.current) {
        clearInterval(preparationTimerRef.current);
        preparationTimerRef.current = null;
      }
    }

    return () => {
      if (preparationTimerRef.current) {
        clearInterval(preparationTimerRef.current);
      }
    };
  }, [isPreparing, preparationTime, currentQuestion]);

  // Handle next question countdown after recording stops
  useEffect(() => {
    if (nextQuestionCountdown > 0 && hasRecorded) {
      nextQuestionTimerRef.current = setInterval(() => {
        setNextQuestionCountdown(prev => {
          if (prev <= 1) {
            // Auto-advance to next question
            handleNextQuestion();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (nextQuestionTimerRef.current) {
        clearInterval(nextQuestionTimerRef.current);
        nextQuestionTimerRef.current = null;
      }
    }

    return () => {
      if (nextQuestionTimerRef.current) {
        clearInterval(nextQuestionTimerRef.current);
      }
    };
  }, [nextQuestionCountdown, hasRecorded]);

  // Load questions and start session on mount
  useEffect(() => {
    const initializeSession = async () => {
      if (!currentUser) return;
      
      try {
        setLoading(true);
        // Start HR session (this will select questions and create session)
        const result = await consolidatedAPI.startHRSession(
          currentUser,
          7, // 7 questions total (1 intro + 6 random)
          'fixed',
          true, // Use distributed selection
          sessionId || undefined
        );
        
        if (result.success && result.questions) {
          setQuestions(result.questions);
          if (result.sessionId) {
            setSessionId(result.sessionId);
            // Initialize violation tracker
            violationTracker.initialize(result.sessionId);
          }
        } else {
          // Fallback to mock data with intro question first
          const fallbackQuestions = getFallbackQuestions(5);
          setQuestions(fallbackQuestions);
        }
      } catch (error: any) {
        console.error('Failed to start HR session:', error);
        toast({
          title: "Failed to Start Session",
          description: "Using default questions. Some features may be limited.",
          variant: "destructive"
        });
        // Fallback to mock data with intro question first
        const fallbackQuestions = getFallbackQuestions(7);
        setQuestions(fallbackQuestions);
      } finally {
        setLoading(false);
      }
    };

    initializeSession();
  }, [currentUser, toast]);

  // Monitor fullscreen state and enforce it
  useEffect(() => {
    if (!proctoringSetupComplete) return;

    const handleFullscreenChange = () => {
      const isInFullscreen = !!document.fullscreenElement;
      console.log('📺 Fullscreen state changed:', isInFullscreen);
      
      if (!isInFullscreen) {
        console.log('⚠️ User exited fullscreen - blocking UI');
        setIsFullscreenExitBlocking(true);
      } else {
        console.log('✅ User re-entered fullscreen - unblocking UI');
        setIsFullscreenExitBlocking(false);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [proctoringSetupComplete]);

  // Setup violation listener when proctoring setup is complete
  useEffect(() => {
    console.log('🔍 Violation monitoring check:', { 
      proctoringSetupComplete, 
      sessionId,
      hasSessionId: !!sessionId 
    });

    if (!proctoringSetupComplete) {
      console.log('⏳ Waiting for proctoring setup to complete...');
      return;
    }

    // Generate a session ID if one doesn't exist
    if (!sessionId) {
      const newSessionId = `hr_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      console.log('📝 Generating new session ID:', newSessionId);
      setSessionId(newSessionId);
      localStorage.setItem('hrSessionId', newSessionId);
      violationTracker.initialize(newSessionId);
      return; // Will trigger again with new sessionId
    }

    console.log('🎯 Setting up violation listener for HR round with session:', sessionId);

    // Start violation monitoring
    proctoringService.startViolationMonitoring(sessionId);

    // Add violation listener to show toasts
    const violationListener = (violation: Violation) => {
      console.log('🚨 VIOLATION DETECTED:', violation);
      
      const severityConfig = {
        critical: { variant: "destructive" as const, icon: "🚨" },
        high: { variant: "destructive" as const, icon: "⚠️" },
        medium: { variant: "default" as const, icon: "⚡" },
        low: { variant: "default" as const, icon: "ℹ️" }
      };

      const config = severityConfig[violation.severity];

      console.log('📢 Showing toast for violation:', violation.type);
      toast({
        title: `${config.icon} Violation Detected`,
        description: violation.details,
        variant: config.variant,
        duration: 5000
      });
    };

    const unsubscribe = proctoringService.onViolation(violationListener);
    console.log('✅ Violation listener added');

    return () => {
      console.log('🧹 Removing violation listener');
      unsubscribe();
    };
  }, [proctoringSetupComplete, sessionId, toast]);

  // Initialize AI monitoring after proctoring setup
  useEffect(() => {
    if (!proctoringSetupComplete || !sessionId || aiMonitoringInitialized.current) {
      return;
    }

    const initializeAIMonitoring = async () => {
      try {
        console.log('🤖 Initializing AI monitoring for HR round...');
        
        // Get camera stream for monitoring
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        
        if (hiddenVideoRef.current) {
          hiddenVideoRef.current.srcObject = stream;
          await hiddenVideoRef.current.play();
          
          // Wait for video to be ready
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Get reference descriptor from face verification service
          const referenceFace = faceVerificationService.getReferenceDescriptor();
          
          if (referenceFace && referenceFace.descriptor) {
            // Initialize AI monitoring
            const initialized = await aiMonitoringService.initialize(
              hiddenVideoRef.current,
              referenceFace.descriptor,
              sessionId,
              {
                enableFaceDetection: true,
                enableObjectDetection: true, // Enable YOLO object detection
                enableGazeTracking: false, // No gaze tracking for HR round
                enableHeadPoseDetection: false // Disabled - looking down violation not needed
              }
            );
            
            if (initialized) {
              // Start monitoring
              aiMonitoringService.startMonitoring();
              aiMonitoringInitialized.current = true;
              
              console.log('✅ AI monitoring started for HR round');
              
              toast({
                title: "AI Monitoring Active",
                description: "Face detection and object detection are now active.",
                duration: 3000
              });
            } else {
              console.warn('⚠️ AI monitoring initialization failed');
            }
          } else {
            console.warn('⚠️ No reference face descriptor available');
          }
        }
      } catch (error) {
        console.error('❌ Failed to initialize AI monitoring:', error);
        // Don't block the interview if AI monitoring fails
      }
    };

    initializeAIMonitoring();
    
    // Cleanup on unmount
    return () => {
      console.log('🧹 Stopping AI monitoring');
      aiMonitoringService.stopMonitoring();
      
      // Stop video stream
      if (hiddenVideoRef.current && hiddenVideoRef.current.srcObject) {
        const stream = hiddenVideoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [proctoringSetupComplete, sessionId, toast]);

  useEffect(() => {
    // Only count down time during recording phase (not during preparation)
    if (sessionStarted && timeRemaining > 0 && !isPreparing && !isRecording) {
      timerRef.current = setTimeout(() => {
        setTimeRemaining(prev => prev - 1);
      }, 1000);
    } else if (timeRemaining === 0 && sessionStarted && !isPreparing) {
      // Time's up - auto-submit current response
      handleNextQuestion();
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [sessionStarted, timeRemaining, isPreparing, isRecording]);

  const startSession = () => {
    if (questions.length === 0) return;
    
    setSessionStarted(true);
    // Set time to 60 seconds (1 minute) recording time
    setTimeRemaining(60);
    setIsPreparing(true);
    setPreparationTime(5);
  };

  // Auto-save current response
  const saveCurrentResponse = () => {
    if (currentQuestion) {
      const responseToSave = currentResponse.trim() || "";
      setResponses(prev => ({
        ...prev,
        [currentQuestion.id]: responseToSave
      }));
      return responseToSave;
    }
    return "";
  };

  const handleNextQuestion = async () => {
    if (currentQuestionIndex < questions.length - 1) {
      // Auto-save current response before moving
      saveCurrentResponse();
      
      // Small delay to ensure state is updated
      await new Promise(resolve => setTimeout(resolve, 50));

      // Move to next question
      const nextIndex = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIndex);
      setTimeRemaining(60); // 1 minute recording time
      setIsPreparing(false); // Don't force preparation - let user start immediately
      setPreparationTime(0);
      setHasRecorded(false);
      setQuestionAudioPlayed(false); // Reset for new question
      setIsRecording(false);
      setNextQuestionCountdown(0);
      
      // Response will be loaded by useEffect when questionIndex changes
    } else {
      // Last question - save and complete session
      saveCurrentResponse();
      await new Promise(resolve => setTimeout(resolve, 50));
      await completeSession();
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      // Auto-save current response before moving
      saveCurrentResponse();
      
      // Move to previous question
      const prevIndex = currentQuestionIndex - 1;
      setCurrentQuestionIndex(prevIndex);
      setTimeRemaining(60); // 1 minute recording time
      setIsPreparing(false); // Don't force preparation
      setPreparationTime(0);
      setHasRecorded(false);
      setQuestionAudioPlayed(false); // Reset for new question
      setIsRecording(false);
      setNextQuestionCountdown(0);
      
      // Response will be loaded by useEffect when questionIndex changes
    }
  };

  const handleSaveResponse = async () => {
    setIsSaving(true);
    const saved = saveCurrentResponse();
    
    if (saved) {
      toast({
        title: "Response Saved",
        description: "Your response has been saved successfully.",
        duration: 2000
      });
    } else {
      toast({
        title: "No Response",
        description: "Please enter a response before saving.",
        variant: "default",
        duration: 2000
      });
    }
    
    // Small delay for visual feedback
    await new Promise(resolve => setTimeout(resolve, 300));
    setIsSaving(false);
  };

  const handleReenterFullscreen = async () => {
    try {
      await proctoringService.enterFullscreen();
      console.log('✅ Re-entered fullscreen');
    } catch (error) {
      console.error('❌ Failed to re-enter fullscreen:', error);
      toast({
        title: "Fullscreen Error",
        description: "Please manually enter fullscreen mode (F11 or Fn+F11).",
        variant: "destructive"
      });
    }
  };

  const completeSession = async () => {
    try {
      setSessionComplete(true);
      
      // Save final response
      saveCurrentResponse();

      // Get violation statistics
      const violationStats = violationTracker.getStats();
      console.log('📊 Final violation stats:', violationStats);

      // Prepare Q&A pairs for final analysis
      const qaPairs = questions.map(q => {
        const response = responses[q.id];
        const transcription = typeof response === 'string' 
          ? response 
          : response?.text || '';
        
        return {
          questionId: q.id,
          question: q.question,
          transcription: transcription,
          audioBlob: audioBlobs[q.id] || null, // Include audio for backup
          wordTimestamps: typeof response === 'object' && response?.words 
            ? response.words 
            : []
        };
      });

      console.log('📝 Preparing Q&A pairs for final analysis:', qaPairs.length);

      // Store violations if sessionId exists
      if (sessionId) {
        try {
          await consolidatedAPI.storeViolations(sessionId, violationStats);
          console.log('✅ Violations stored successfully');
        } catch (violationError) {
          console.error('❌ Failed to store violations:', violationError);
          // Don't block session completion if violation storage fails
        }
      }

      // Stop monitoring BEFORE exiting fullscreen to prevent false violation
      console.log('🛑 Stopping proctoring monitoring after submission');
      proctoringService.stopViolationMonitoring();
      aiMonitoringService.stopMonitoring();
      
      // Small delay to ensure monitoring is fully stopped
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Exit fullscreen
      if (proctoringService.isFullscreen()) {
        await proctoringService.exitFullscreen();
        console.log('✅ Exited fullscreen');
      }
      
      // Stop camera and microphone
      console.log('📹 Stopping camera and microphone...');
      
      // Stop hidden video stream
      if (hiddenVideoRef.current && hiddenVideoRef.current.srcObject) {
        const stream = hiddenVideoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => {
          track.stop();
          console.log(`✅ Stopped ${track.kind} track from hidden video`);
        });
      }
      
      // Stop any other media streams
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true }).catch(() => null);
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => {
          track.stop();
          console.log(`✅ Stopped ${track.kind} track`);
        });
      }

      // Calculate total duration (approximate)
      const totalDuration = questions.reduce((acc, q) => acc + (q.timeLimit || 90), 0);

      // Send all Q&A pairs to backend for final analysis
      if (sessionId && currentUser) {
        try {
          const result = await consolidatedAPI.completeHRSession(
            currentUser,
            sessionId,
            totalDuration,
            violationStats,
            qaPairs // Send all Q&A pairs for batch analysis
          );

          if (result.success) {
            console.log('✅ Session completed and analyzed successfully');
            toast({
              title: "Session Completed",
              description: "Your interview has been submitted for analysis.",
              duration: 3000
            });
            
            // Navigate to results or dashboard
            setTimeout(() => {
              navigate('/dashboard');
            }, 2000);
          } else {
            throw new Error(result.error || 'Failed to complete session');
          }
        } catch (completionError: any) {
          console.error('❌ Failed to complete session:', completionError);
          toast({
            title: "Completion Error",
            description: completionError.message || "Session completed but analysis may be delayed.",
            variant: "destructive"
          });
          // Still navigate even if completion fails
          setTimeout(() => {
            navigate('/dashboard');
          }, 2000);
        }
      }
    } catch (error: any) {
      console.error('Failed to complete session:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to complete session. Please try again.",
        variant: "destructive"
      });
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <Layout isAuthenticated={true} user={{ fullName: currentUser?.displayName || "User", profilePicture: currentUser?.photoURL || undefined }}>
        <div className="container mx-auto px-6 py-8">
          <div className="max-w-4xl mx-auto text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading questions...</p>
          </div>
        </div>
      </Layout>
    );
  }

  // Show proctoring setup if not complete (must be first check before loading questions)
  if (!proctoringSetupComplete) {
    if (!currentUser) {
      // Wait for user to load
      return (
        <Layout isAuthenticated={false}>
          <div className="container mx-auto px-6 py-8">
            <div className="max-w-4xl mx-auto text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Loading...</p>
            </div>
          </div>
        </Layout>
      );
    }
    
    console.log('🔍 HR Round: Showing ProctoringSetup component');
    return (
      <ProctoringSetup
        user={currentUser}
        skipGazeCalibration={true}
        onComplete={() => {
          console.log('✅ HR Round: ProctoringSetup completed');
          setProctoringSetupComplete(true);
          toast({
            title: "Proctoring Setup Complete",
            description: "You can now begin the HR interview.",
          });
        }}
        onError={(error) => {
          console.error('❌ HR Round: ProctoringSetup error:', error);
          toast({
            title: "Setup Error",
            description: error.message || "Failed to complete proctoring setup.",
            variant: "destructive"
          });
        }}
      />
    );
  }

  if (!currentQuestion) {
    return null;
  }

  return (
    <Layout isAuthenticated={true} user={{ fullName: currentUser?.displayName || "User", profilePicture: currentUser?.photoURL || undefined }}>
      {/* Hidden video element for AI monitoring */}
      <video
        ref={hiddenVideoRef}
        autoPlay
        playsInline
        muted
        style={{ display: 'none' }}
      />
      <div className="min-h-screen bg-background relative">
        {/* Fullscreen Exit Blocking Overlay */}
        {isFullscreenExitBlocking && (
          <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center">
            <Card className="max-w-md w-full mx-4">
              <CardHeader>
                <div className="flex items-center gap-3 text-destructive mb-2">
                  <AlertCircle className="w-8 h-8" />
                  <CardTitle className="text-xl">Fullscreen Required</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  You have exited fullscreen mode. This has been recorded as a violation.
                </p>
                <p className="font-medium">
                  To continue the interview, you must re-enter fullscreen mode.
                </p>
                <Button 
                  onClick={handleReenterFullscreen}
                  className="w-full"
                  size="lg"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Re-enter Fullscreen
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      <div className="container mx-auto px-6 py-8">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold">HR Interview</h1>
              <p className="text-muted-foreground">
                Question {currentQuestionIndex + 1} of {questions.length} • {currentQuestion.category}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                {isPreparing ? (
                  <span className="font-mono text-lg text-blue-500">
                    Prep: {formatTime(preparationTime)}
                  </span>
                ) : (
                  <span className={`font-mono text-lg ${timeRemaining <= 30 ? 'text-red-500' : ''}`}>
                    Time: {formatTime(timeRemaining)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Question Section */}
          <Card className="mb-6 shadow-soft">
            <CardHeader>
              <CardTitle>Question</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <QuestionDisplay
                question={currentQuestion.question}
                autoPlay={true}
                onPlayComplete={() => {
                  // After audio finishes, start 5 second preparation
                  setQuestionAudioPlayed(true);
                  setIsPreparing(true);
                  setPreparationTime(5);
                }}
              />
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowTips(!showTips)}
                >
                  {showTips ? 'Hide' : 'Show'} Tips
                </Button>
              </div>

              {showTips && (
                <div className="mt-4 p-4 bg-muted rounded-lg">
                  <h4 className="font-semibold mb-2">Tips:</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {currentQuestion.tips.map((tip, index) => (
                      <li key={index} className="text-sm">{tip}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Response Section */}
          <Card className="mb-6 shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Your Response
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Preparation Phase */}
              {isPreparing && questionAudioPlayed && (
                <div className="flex flex-col items-center gap-4 p-6 border rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <Clock className="h-6 w-6 text-primary" />
                    <div className="text-center">
                      <p className="text-lg font-semibold">Preparation Time</p>
                      <p className="text-3xl font-mono font-bold text-primary">
                        {formatTime(preparationTime)}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Prepare your answer. Recording will start automatically in {preparationTime} seconds.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Recording Phase - Show AudioRecorder if not preparing and not recorded yet */}
              {!isPreparing && !hasRecorded && (
                <div className="space-y-4">
                  <AudioRecorder
                    ref={audioRecorderRef}
                    questionId={currentQuestion.id}
                    sessionId={sessionId}
                    disabled={isPreparing || hasRecorded}
                    timeLimit={60} // 60 seconds recording time
                    autoStart={!isPreparing && questionAudioPlayed && !isRecording && !hasRecorded && preparationTime === 0}
                    onRecordingStart={() => {
                      setIsRecording(true);
                    }}
                    onRecordingStop={() => {
                      setIsRecording(false);
                    }}
                    onTranscriptionComplete={(transcription, audioBlob) => {
                      const transcriptionText = transcription.text || '';
                      setCurrentResponse(transcriptionText);
                      // Store both transcription and audio blob
                      setResponses(prev => ({
                        ...prev,
                        [currentQuestion.id]: transcription
                      }));
                      // Store audio blob temporarily for backup/retry
                      if (audioBlob) {
                        setAudioBlobs(prev => ({
                          ...prev,
                          [currentQuestion.id]: audioBlob
                        }));
                      }
                      setHasRecorded(true);
                      setIsRecording(false);
                      // Start 5 second countdown to next question
                      setNextQuestionCountdown(5);
                    }}
                    onTranscriptionError={(error) => {
                      toast({
                        title: "Transcription Error",
                        description: error.message || "Failed to transcribe audio.",
                        variant: "destructive"
                      });
                    }}
                  />
                  
                  {/* Next Question Countdown */}
                  {nextQuestionCountdown > 0 && hasRecorded && (
                    <div className="flex flex-col items-center gap-2 p-4 border rounded-lg bg-blue-50 dark:bg-blue-950">
                      <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                        Moving to next question in
                      </p>
                      <p className="text-2xl font-mono font-bold text-blue-600 dark:text-blue-400">
                        {nextQuestionCountdown}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Show transcription result if already recorded */}
              {hasRecorded && responses[currentQuestion.id] && (
                <div className="p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                  <p className="text-sm font-semibold text-green-700 dark:text-green-300 mb-2">
                    ✓ Response Recorded
                  </p>
                  <p className="text-sm text-green-600 dark:text-green-400">
                    {typeof responses[currentQuestion.id] === 'string' 
                      ? responses[currentQuestion.id]
                      : responses[currentQuestion.id]?.text || 'Transcription available'}
                  </p>
                </div>
              )}

              <Separator />

              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  Or type your response (development mode):
                </p>
                <textarea
                  value={currentResponse}
                  onChange={(e) => setCurrentResponse(e.target.value)}
                  placeholder="Type your response here..."
                  className="w-full min-h-[200px] p-4 border rounded-lg resize-none"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  {currentResponse.length} characters
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="flex justify-between items-center">
            <Button
              variant="outline"
              onClick={handlePreviousQuestion}
              disabled={currentQuestionIndex === 0}
            >
              Previous
            </Button>
            
            {/* Only show Save button if not recorded yet */}
            {!hasRecorded && (
              <Button
                variant="outline"
                onClick={handleSaveResponse}
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Save Response
                  </>
                )}
              </Button>
            )}

            {/* Show Next button - always visible, but only after recording if hasRecorded */}
            <Button
              onClick={handleNextQuestion}
            >
              {currentQuestionIndex === questions.length - 1 ? 'Complete Session' : 'Next Question'}
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </div>

          {/* Session Progress */}
          <div className="mt-8">
            <h3 className="text-sm font-semibold mb-3">Session Progress</h3>
            <div className="flex gap-2 flex-wrap">
              {questions.map((q, index) => (
                <Badge
                  key={q.id}
                  variant={index === currentQuestionIndex ? "default" : index < currentQuestionIndex ? "secondary" : "outline"}
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                >
                  {index + 1}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </div>
      </div>
    </Layout>
  );
};

export default HRSession;
