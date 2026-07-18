import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Clock, AlertCircle, CheckCircle2, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/layout/Layout";
import userData from "@/mock/user.json";
import mcqData from "@/mock/mcq.json";
import { useAuth } from "@/contexts/AuthContext";
import { consolidatedAPI } from "@/services/consolidatedAPI";
import ProctoringSetup from "@/components/proctoring/ProctoringSetup";
import { proctoringService, Violation } from "@/services/proctoringService";
import { aiMonitoringService } from "@/services/aiMonitoringService";
import { faceVerificationService } from "@/services/faceVerificationService";

const MCQTest = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const user = userData.completedProfile;
  
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<{ [key: number]: number }>({});
  const [timeLeft, setTimeLeft] = useState(mcqData.testConfig.totalTimeLimit); // From config
  const [selectedAnswer, setSelectedAnswer] = useState<number | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(
    location.state?.sessionId || localStorage.getItem('technicalSessionId') || null
  );
  const [proctoringSetupComplete, setProctoringSetupComplete] = useState(false);
  const [isFullscreenExitBlocking, setIsFullscreenExitBlocking] = useState(false);
  
  // Track time per question
  const questionStartTime = useRef<{ [key: number]: number }>({});
  const timeTaken = useRef<{ [key: string]: number }>({});
  
  // AI monitoring
  const hiddenVideoRef = useRef<HTMLVideoElement>(null);
  const aiMonitoringInitialized = useRef(false);

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
      const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      console.log('📝 Generating new session ID:', newSessionId);
      setSessionId(newSessionId);
      localStorage.setItem('technicalSessionId', newSessionId);
      return; // Will trigger again with new sessionId
    }

    console.log('🎯 Setting up violation listener for MCQ round with session:', sessionId);

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
        console.log('🤖 Initializing AI monitoring for MCQ round...');
        
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
                enableGazeTracking: false, // Already calibrated in setup
                enableHeadPoseDetection: false // Disabled - looking down violation not needed
              }
            );
            
            if (initialized) {
              // Start monitoring
              aiMonitoringService.startMonitoring();
              aiMonitoringInitialized.current = true;
              
              console.log('✅ AI monitoring started for MCQ');
              
              toast({
                title: "AI Monitoring Active",
                description: "Face detection, object detection, and head pose monitoring are now active.",
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
        // Don't block the test if AI monitoring fails
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

  const questions = mcqData.questions;
  const totalQuestions = Math.min(questions.length, mcqData.testConfig.totalQuestions);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Track time when question changes
  useEffect(() => {
    // Record start time for current question
    questionStartTime.current[currentQuestion] = Date.now();
    
    // If we were on a previous question, calculate time taken
    const prevQuestion = Object.keys(questionStartTime.current)
      .map(Number)
      .filter(q => q !== currentQuestion && questionStartTime.current[q] > 0)
      .sort((a, b) => questionStartTime.current[b] - questionStartTime.current[a])[0];
    
    if (prevQuestion !== undefined && questionStartTime.current[prevQuestion]) {
      const timeSpent = Math.floor((Date.now() - questionStartTime.current[prevQuestion]) / 1000);
      const questionId = questions[prevQuestion]?.id;
      if (questionId) {
        timeTaken.current[questionId] = (timeTaken.current[questionId] || 0) + timeSpent;
      }
    }
    
    // Load previously selected answer for current question when question changes
    const savedAnswer = answers[currentQuestion];
    setSelectedAnswer(savedAnswer !== undefined ? savedAnswer : undefined);
  }, [currentQuestion]);
  
  // Update selected answer when answers change (but don't reset on question change)
  useEffect(() => {
    if (answers[currentQuestion] !== undefined) {
      setSelectedAnswer(answers[currentQuestion]);
    }
  }, [answers, currentQuestion]);

  const handleTimeUp = async () => {
    // Submit answers before navigating
    await handleSubmit();
    toast({
      title: "Time's Up!",
      description: "Moving to coding challenge..."
    });
    navigate("/technical-interview/coding", { state: { sessionId } });
  };

  const handleAnswerSelect = (value: string) => {
    const answerIndex = parseInt(value);
    // Update both local state and answers object
    setSelectedAnswer(answerIndex);
    setAnswers(prev => ({ ...prev, [currentQuestion]: answerIndex }));
  };

  const handleNext = async () => {
    if (currentQuestion < totalQuestions - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      // All questions completed - submit before navigating
      await handleSubmit();
      toast({
        title: "MCQ Section Complete!",
        description: "Moving to coding challenge..."
      });
      navigate("/technical-interview/coding", { state: { sessionId } });
    }
  };

  const handleSubmit = async () => {
    if (isSubmitting || !currentUser) return;
    
    setIsSubmitting(true);
    
    try {
      // Calculate final time for current question
      if (questionStartTime.current[currentQuestion]) {
        const timeSpent = Math.floor((Date.now() - questionStartTime.current[currentQuestion]) / 1000);
        const questionId = questions[currentQuestion]?.id;
        if (questionId) {
          timeTaken.current[questionId] = (timeTaken.current[questionId] || 0) + timeSpent;
        }
      }

      // Prepare questions with all required fields (including correctAnswer)
      const questionsToSubmit = questions.slice(0, totalQuestions).map(q => ({
        id: q.id,
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer, // This is the key field!
        category: q.category,
        difficulty: q.difficulty,
        explanation: q.explanation || 'No explanation available.',
        tags: q.tags || []
      }));

      // Convert answers from index-based to ID-based
      const answersById: Record<string, number> = {};
      questions.slice(0, totalQuestions).forEach((q, index) => {
        if (answers[index] !== undefined) {
          answersById[q.id] = answers[index];
        }
      });

      // Calculate total time taken
      const totalTimeSpent = mcqData.testConfig.totalTimeLimit - timeLeft;

      // Submit to backend
      const response = await consolidatedAPI.submitMCQ(
        currentUser,
        questionsToSubmit,
        answersById,
        timeTaken.current,
        totalTimeSpent,
        sessionId || undefined
      );

      // Update sessionId from response
      const returnedSessionId = response.sessionId;
      if (returnedSessionId) {
        setSessionId(returnedSessionId);
        localStorage.setItem('technicalSessionId', returnedSessionId);
      }

      toast({
        title: "✅ MCQ Submitted!",
        description: "Your answers have been analyzed and stored."
      });

    } catch (error: any) {
      console.error('MCQ submission error:', error);
      toast({
        variant: "destructive",
        title: "⚠️ Submission Error",
        description: error.message || "Failed to submit MCQ answers. Please try again."
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getQuestionStatus = (index: number) => {
    if (answers[index] !== undefined) return "answered";
    if (index === currentQuestion) return "current";
    return "unanswered";
  };

  const currentQ = questions[currentQuestion];

  // Show proctoring setup if not complete
  if (!proctoringSetupComplete && currentUser) {
    return (
      <ProctoringSetup
        user={currentUser}
        onComplete={() => {
          setProctoringSetupComplete(true);
          toast({
            title: "Proctoring Setup Complete",
            description: "You can now begin the MCQ test.",
          });
        }}
        onError={(error) => {
          toast({
            variant: "destructive",
            title: "Setup Error",
            description: error,
          });
        }}
      />
    );
  }

  // Handle re-entering fullscreen
  const handleReenterFullscreen = async () => {
    console.log('🔄 Re-entering fullscreen...');
    const success = await proctoringService.enterFullscreen();
    if (success) {
      console.log('✅ Re-entered fullscreen successfully');
      setIsFullscreenExitBlocking(false);
    } else {
      toast({
        variant: "destructive",
        title: "Fullscreen Required",
        description: "You must enable fullscreen to continue the interview"
      });
    }
  };

  return (
    <Layout 
      isAuthenticated={true} 
      user={{ fullName: user.fullName, profilePicture: user.profilePicture }}
      showFooter={false}
    >
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
        {/* Header */}
        <div className="border-b bg-card shadow-sm">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold">Technical Interview - MCQ Section</h1>
                <p className="text-sm text-muted-foreground">
                  Question {currentQuestion + 1} of {totalQuestions}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Clock className={`w-4 h-4 ${timeLeft < 300 ? 'text-red-500' : 'text-primary'}`} />
                  <span className={`font-mono ${timeLeft < 300 ? 'text-red-500 font-bold' : 'text-foreground'}`}>
                    {formatTime(timeLeft)}
                  </span>
                </div>
                <Progress value={(currentQuestion / totalQuestions) * 100} className="w-32" />
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-6 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Question Navigation */}
            <Card className="lg:col-span-1 shadow-soft h-fit">
              <CardHeader>
                <CardTitle className="text-lg">Questions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-5 lg:grid-cols-4 gap-2">
                  {questions.slice(0, totalQuestions).map((_, index) => {
                    const status = getQuestionStatus(index);
                    return (
                      <Button
                        key={index}
                        variant={status === "current" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentQuestion(index)}
                        className={`relative ${
                          status === "answered" 
                            ? "bg-green-100 border-green-300 text-green-700 hover:bg-green-200" 
                            : status === "current"
                            ? "ring-2 ring-primary"
                            : ""
                        }`}
                      >
                        {index + 1}
                        {status === "answered" && (
                          <CheckCircle2 className="w-3 h-3 absolute -top-1 -right-1 bg-green-500 text-white rounded-full" />
                        )}
                      </Button>
                    );
                  })}
                </div>
                <div className="mt-4 pt-4 border-t space-y-2 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-primary rounded-sm ring-2 ring-primary" />
                    <span className="font-medium">Current Question</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-green-100 border-2 border-green-500 rounded-sm" />
                    <span className="font-medium text-green-700">Answered</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-gray-300 rounded-sm bg-white" />
                    <span>Not Attempted</span>
                  </div>
                  <div className="mt-3 pt-3 border-t">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Progress:</span>
                      <span className="font-bold text-primary">
                        {Object.keys(answers).length}/{totalQuestions}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Question Content */}
            <Card className="lg:col-span-3 shadow-soft">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="secondary">{currentQ.category}</Badge>
                      <Badge variant={currentQ.difficulty === "easy" ? "secondary" : currentQ.difficulty === "medium" ? "default" : "destructive"}>
                        {currentQ.difficulty}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {Math.floor(currentQ.timeLimit / 60)}m
                      </Badge>
                    </div>
                    <CardTitle className="text-lg leading-relaxed">
                      {currentQ.question}
                    </CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <RadioGroup 
                  value={selectedAnswer !== undefined ? selectedAnswer.toString() : ""} 
                  onValueChange={handleAnswerSelect}
                >
                  <div className="space-y-3">
                    {currentQ.options.map((option, index) => (
                      <div key={index} className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                        <RadioGroupItem 
                          value={index.toString()} 
                          id={`option-${index}`} 
                          className="mt-1"
                        />
                        <Label 
                          htmlFor={`option-${index}`} 
                          className="flex-1 text-sm leading-relaxed cursor-pointer"
                        >
                          <span className="font-medium mr-2">
                            {String.fromCharCode(65 + index)}.
                          </span>
                          {option}
                        </Label>
                      </div>
                    ))}
                  </div>
                </RadioGroup>

                {/* Navigation */}
                <div className="flex justify-between items-center pt-4 border-t">
                  <Button 
                    variant="outline" 
                    onClick={handlePrevious}
                    disabled={currentQuestion === 0}
                  >
                    Previous
                  </Button>
                  
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">
                      {Object.keys(answers).length} of {totalQuestions} answered
                    </p>
                  </div>

                  {currentQuestion === totalQuestions - 1 ? (
                    <Button 
                      onClick={handleNext}
                      className="gradient-primary"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? "Submitting..." : "Finish MCQ Section"}
                    </Button>
                  ) : (
                    <Button 
                      onClick={handleNext}
                      variant={selectedAnswer !== undefined ? "default" : "outline"}
                    >
                      Next
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Warning for low time */}
          {timeLeft < 300 && (
            <Card className="mt-6 border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <div>
                    <p className="font-medium text-red-800 dark:text-red-200">
                      Time Running Out!
                    </p>
                    <p className="text-sm text-red-700 dark:text-red-300">
                      Less than 5 minutes remaining. Consider moving to the coding section.
                    </p>
                  </div>
                  <Button 
                    onClick={async () => {
                      await handleSubmit();
                      navigate("/technical-interview/coding", { state: { sessionId } });
                    }}
                    size="sm"
                    variant="outline"
                    className="ml-auto"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Submitting..." : "Skip to Coding"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default MCQTest;