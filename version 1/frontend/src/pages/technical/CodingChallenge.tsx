import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Clock, 
  Play, 
  CheckCircle2, 
  XCircle, 
  Code2, 
  FileText,
  Terminal,
  Loader2,
  AlertTriangle,
  AlertCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/layout/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { consolidatedAPI } from "@/services/consolidatedAPI";
import codingData from "@/mock/coding.json";
import { proctoringService, Violation } from "@/services/proctoringService";
import { wrapCodeForExecution } from "@/utils/code-wrapper";
import { aiMonitoringService } from "@/services/aiMonitoringService";
import { faceVerificationService } from "@/services/faceVerificationService";
import { violationTracker } from "@/services/violationTracker";

const CodingChallenge = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { currentUser } = useAuth();
  
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("javascript");
  const [timeLeft, setTimeLeft] = useState(codingData.defaultChallenge.timeLimit); // From config
  const [testResults, setTestResults] = useState<any>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [startTime] = useState(Date.now());
  const [isFullscreenExitBlocking, setIsFullscreenExitBlocking] = useState(false);

  // AI monitoring
  const hiddenVideoRef = useRef<HTMLVideoElement>(null);
  const aiMonitoringInitialized = useRef(false);

  const question = codingData.defaultChallenge; // Using default challenge

  // Get sessionId from localStorage (set during MCQ)
  useEffect(() => {
    const storedSessionId = localStorage.getItem('technicalSessionId');
    if (storedSessionId) {
      setSessionId(storedSessionId);
      console.log('📋 Loaded session ID:', storedSessionId);
    } else {
      console.warn('⚠️ No session ID found. Results may not be linked to MCQ.');
    }
  }, []);

  // Monitor fullscreen state and enforce it (only during active test)
  useEffect(() => {
    if (isSubmitted || isSubmitting) {
      // Don't monitor fullscreen after submission
      console.log('🛑 Test submitted - stopping fullscreen enforcement');
      setIsFullscreenExitBlocking(false);
      return;
    }

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
  }, [isSubmitted, isSubmitting]);

  // Setup violation listener for Coding round (continues from MCQ)
  useEffect(() => {
    if (!sessionId) return;

    console.log('🎯 Continuing violation monitoring for Coding round');

    // Add violation listener to show toasts
    const violationListener = (violation: Violation) => {
      const severityConfig = {
        critical: { variant: "destructive" as const, icon: "🚨" },
        high: { variant: "destructive" as const, icon: "⚠️" },
        medium: { variant: "default" as const, icon: "⚡" },
        low: { variant: "default" as const, icon: "ℹ️" }
      };

      const config = severityConfig[violation.severity];

      toast({
        title: `${config.icon} Violation Detected`,
        description: violation.details,
        variant: config.variant,
        duration: 5000
      });
    };

    const unsubscribe = proctoringService.onViolation(violationListener);

    return () => {
      // Remove listener when component unmounts
      unsubscribe();
    };
  }, [sessionId, toast]);

  // Initialize AI monitoring for Coding round (continues from MCQ)
  useEffect(() => {
    if (!sessionId || aiMonitoringInitialized.current || isSubmitted) {
      return;
    }

    const initializeAIMonitoring = async () => {
      try {
        console.log('🤖 Initializing AI monitoring for Coding round...');
        
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
              
              console.log('✅ AI monitoring started for Coding');
              
              toast({
                title: "AI Monitoring Active",
                description: "Face detection, object detection, and head pose monitoring are active.",
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
      console.log('🧹 Stopping AI monitoring in Coding');
      aiMonitoringService.stopMonitoring();
      
      // Stop video stream
      if (hiddenVideoRef.current && hiddenVideoRef.current.srcObject) {
        const stream = hiddenVideoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [sessionId, toast, isSubmitted]);

  useEffect(() => {
    // Set starter code based on selected language
    setCode(question.starterCode[language as keyof typeof question.starterCode] || "");
  }, [language, question]);

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

  const handleTimeUp = () => {
    if (!isSubmitted) {
      toast({
        title: "Time's Up!",
        description: "Your solution has been automatically submitted."
      });
      handleSubmit();
    }
  };

  const handleRunCode = async () => {
    if (!code.trim()) {
      toast({
        variant: "destructive",
        title: "No Code",
        description: "Please write some code before running."
      });
      return;
    }

    if (!currentUser) {
      toast({
        variant: "destructive",
        title: "Authentication Required",
        description: "Please log in to run code."
      });
      return;
    }

    setIsRunning(true);

    try {
      console.log('🏃 Running code against visible test cases...');
      
      // Get only visible test cases for "Run Code"
      const visibleTests = question.testCases.filter(test => !test.hidden);
      
      toast({
        title: "Executing Code",
        description: `Running against ${visibleTests.length} visible test case(s)...`
      });

      // Wrap code to convert class-based format to stdin/stdout format
      const wrappedCode = wrapCodeForExecution(code, language);
      console.log('📦 Code wrapped for execution');

      // Execute code with visible test cases
      const executionResult = await consolidatedAPI.executeCode(
        currentUser,
        wrappedCode,
        language,
        visibleTests // Only visible tests for "Run Code"
      );

      console.log('✅ Code execution completed:', executionResult);

      // Format test results - backend returns { passed, total, cases, allPassed }
      const results = {
        passed: executionResult.passed || 0,
        total: executionResult.total || visibleTests.length,
        cases: executionResult.cases || [], // Use 'cases' not 'results'
        executionTime: executionResult.executionTime || "N/A",
        memoryUsage: executionResult.memoryUsage || "N/A"
      };

      setTestResults(results);
      
      const passedCount = results.passed;
      const totalCount = results.total;
      
      toast({
        title: passedCount === totalCount ? "✅ All Tests Passed!" : "⚠️ Some Tests Failed",
        description: `${passedCount} out of ${totalCount} test case(s) passed.`,
        variant: passedCount === totalCount ? "default" : "destructive"
      });

      console.log(`✅ Test results: ${passedCount}/${totalCount} passed`);

    } catch (error: any) {
      console.error('❌ Code execution error:', error);
      
      toast({
        variant: "destructive",
        title: "Execution Error",
        description: error.message || "Failed to execute code. Please check your syntax."
      });

      // Show error in results
      const visibleTests = question.testCases.filter(test => !test.hidden);
      setTestResults({
        passed: 0,
        total: visibleTests.length,
        cases: visibleTests.map(testCase => ({
          input: JSON.stringify(testCase.input),
          expected: JSON.stringify(testCase.expectedOutput),
          actual: "Execution Error",
          passed: false
        })),
        executionTime: "N/A",
        memoryUsage: "N/A"
      });
    } finally {
      setIsRunning(false);
    }
  };

  const handleSubmit = async () => {
    if (!currentUser) {
      toast({
        variant: "destructive",
        title: "Authentication Required",
        description: "Please log in to submit your solution."
      });
      return;
    }

    if (!code.trim()) {
      toast({
        variant: "destructive",
        title: "No Code",
        description: "Please write some code before submitting."
      });
      return;
    }

    setIsSubmitting(true);
    setIsSubmitted(true);

    try {
      // Calculate time taken
      const timeTaken = Math.floor((Date.now() - startTime) / 1000);

      // Submit coding solution
      console.log('📤 Submitting coding solution...');
      
      // Run ALL test cases (visible + hidden) using backend execution
      console.log('🧪 Executing code with all test cases (including hidden)...');
      toast({
        title: "Executing Code",
        description: "Running all test cases including hidden ones..."
      });

      try {
        // Wrap code to convert class-based format to stdin/stdout format
        const wrappedCode = wrapCodeForExecution(code, language);
        console.log('📦 Code wrapped for submission execution');

        // Execute code with ALL test cases
        const executionResult = await consolidatedAPI.executeCode(
          currentUser,
          wrappedCode,
          language,
          question.testCases // ALL test cases (visible + hidden)
        );

        console.log('✅ Code execution completed:', executionResult);

        // Format test results - backend returns { passed, total, cases, allPassed }
        const allTestResults = {
          passed: executionResult.passed || 0,
          total: executionResult.total || question.testCases.length,
          cases: executionResult.cases || [] // Backend returns 'cases' not 'results'
        };

        // Update UI with final test results
        setTestResults(allTestResults);

        console.log(`✅ All test cases evaluated: ${allTestResults.passed}/${allTestResults.total} passed`);
        
        // Show detailed results toast
        toast({
          title: allTestResults.passed === allTestResults.total ? "✅ All Tests Passed!" : "⚠️ Some Tests Failed",
          description: `${allTestResults.passed} out of ${allTestResults.total} test cases passed (including hidden tests)`,
          variant: allTestResults.passed === allTestResults.total ? "default" : "destructive"
        });

        // Submit the results
        const response = await consolidatedAPI.submitCoding(
          currentUser,
          question,
          code,
          language,
          timeTaken,
          allTestResults,
          sessionId || undefined
        );

        const finalSessionId = response.sessionId || sessionId;
        console.log('✅ Coding solution submitted. Session ID:', finalSessionId);

        // Generate combined analysis (MCQ + Coding)
        if (finalSessionId) {
          // Get violation statistics for feedback generation
          const violationStats = violationTracker.getStats();
          const totalViolations = violationTracker.getTotalCount();
          
          console.log('📊 Violation statistics:', violationStats);
          console.log(`📊 Total violations: ${totalViolations}`);
          
          console.log('🔄 Generating combined analysis with violation stats...');
          await consolidatedAPI.generateCombinedAnalysis(currentUser, finalSessionId, violationStats);
          console.log('✅ Combined analysis generated with proctoring feedback');

        // IMPORTANT: Stop monitoring BEFORE exiting fullscreen to prevent false violation
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
        const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true }).catch(() => null);
        if (mediaStream) {
          mediaStream.getTracks().forEach(track => {
            track.stop();
            console.log(`✅ Stopped ${track.kind} track`);
          });
        }

        toast({
          title: "✅ Solution Submitted!",
          description: "Your technical interview is complete. Generating feedback..."
        });

        // Navigate to feedback page
        setTimeout(() => {
          // Clear the session ID from localStorage
          localStorage.removeItem('technicalSessionId');
          navigate("/feedback");
        }, 2000);
        } else {
          // No session ID - just show success and navigate to feedback list
          // Stop proctoring monitoring
          console.log('🛑 Stopping proctoring monitoring (no session)');
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
          const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true }).catch(() => null);
          if (mediaStream) {
            mediaStream.getTracks().forEach(track => {
              track.stop();
              console.log(`✅ Stopped ${track.kind} track`);
            });
          }

          toast({
            title: "✅ Solution Submitted!",
            description: "Your coding challenge has been completed."
          });

          setTimeout(() => {
            navigate("/feedback");
          }, 2000);
        }
      } catch (executionError: any) {
        console.error('❌ Code execution error:', executionError);
        
        // If execution fails, submit with empty results but still store the code
        const fallbackResults = {
          passed: 0,
          total: question.testCases.length,
          cases: question.testCases.map(testCase => ({
            input: JSON.stringify(testCase.input),
            expected: JSON.stringify(testCase.expectedOutput),
            actual: "Execution Error",
            passed: false,
            hidden: testCase.hidden || false
          }))
        };

        const response = await consolidatedAPI.submitCoding(
          currentUser,
          question,
          code,
          language,
          timeTaken,
          fallbackResults,
          sessionId || undefined
        );

        const finalSessionId = response.sessionId || sessionId;
        console.log('✅ Coding solution submitted with execution error. Session ID:', finalSessionId);

        // Still try to generate combined analysis
        if (finalSessionId) {
          try {
            await consolidatedAPI.generateCombinedAnalysis(currentUser, finalSessionId);
          } catch (analysisError) {
            console.error('Failed to generate analysis:', analysisError);
          }
        }

        // Stop proctoring monitoring
        console.log('🛑 Stopping proctoring monitoring (execution error)');
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
        const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true }).catch(() => null);
        if (mediaStream) {
          mediaStream.getTracks().forEach(track => {
            track.stop();
            console.log(`✅ Stopped ${track.kind} track`);
          });
        }

        toast({
          variant: "destructive",
          title: "⚠️ Execution Error",
          description: "Code could not be executed, but your solution was saved."
        });

        setTimeout(() => {
          localStorage.removeItem('technicalSessionId');
          navigate("/feedback");
        }, 2000);
      }
    } catch (error: any) {
      console.error('❌ Coding submission error:', error);
      setIsSubmitted(false);
      toast({
        variant: "destructive",
        title: "⚠️ Submission Error",
        description: error.message || "Failed to submit coding solution. Please try again."
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Show loading if no user
  if (!currentUser) {
    return (
      <Layout isAuthenticated={false} showFooter={false}>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
        
        {/* Hidden video element for AI monitoring */}
        <video
          ref={hiddenVideoRef}
          autoPlay
          playsInline
          muted
          style={{ display: 'none' }}
        />
      </Layout>
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
      user={{ 
        fullName: currentUser.displayName || currentUser.email || 'User',
        profilePicture: currentUser.photoURL || undefined
      }}
      showFooter={false}
    >
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
                <h1 className="text-xl font-bold">Technical Interview - Coding Challenge</h1>
                <p className="text-sm text-muted-foreground">
                  Solve the problem using your preferred approach
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Clock className={`w-4 h-4 ${timeLeft < 300 ? 'text-red-500' : 'text-primary'}`} />
                  <span className={`font-mono ${timeLeft < 300 ? 'text-red-500 font-bold' : 'text-foreground'}`}>
                    {formatTime(timeLeft)}
                  </span>
                </div>
                <Badge variant={timeLeft < 300 ? "destructive" : "secondary"}>
                  Coding Challenge
                </Badge>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-6 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-200px)]">
            {/* Problem Description */}
            <Card className="shadow-soft flex flex-col">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    {question.title}
                  </CardTitle>
                  <Badge variant={question.difficulty === "Easy" ? "secondary" : "default"}>
                    {question.difficulty}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-auto">
                <Tabs defaultValue="description" className="h-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="description">Description</TabsTrigger>
                    <TabsTrigger value="examples">Examples</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="description" className="mt-4 space-y-4">
                    <div className="prose prose-sm max-w-none">
                      <p className="text-sm leading-relaxed whitespace-pre-line">
                        {question.description}
                      </p>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold mb-2">Constraints:</h4>
                      <ul className="text-sm space-y-1">
                        {question.constraints.map((constraint, index) => (
                          <li key={index} className="text-muted-foreground">
                            • {constraint}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="examples" className="mt-4 space-y-4">
                    {question.examples.map((example, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <h4 className="font-semibold mb-2">Example {index + 1}:</h4>
                        <div className="space-y-2 text-sm">
                          <div>
                            <span className="font-medium">Input:</span>{" "}
                            <code className="bg-muted px-1 py-0.5 rounded text-xs">
                              {example.input}
                            </code>
                          </div>
                          <div>
                            <span className="font-medium">Output:</span>{" "}
                            <code className="bg-muted px-1 py-0.5 rounded text-xs">
                              {example.output}
                            </code>
                          </div>
                          {example.explanation && (
                            <div>
                              <span className="font-medium">Explanation:</span>{" "}
                              <span className="text-muted-foreground">
                                {example.explanation}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Code Editor */}
            <Card className="shadow-soft flex flex-col">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Code2 className="w-5 h-5" />
                    Code Editor
                  </CardTitle>
                  <div className="flex gap-2">
                    <Select value={language} onValueChange={setLanguage} disabled={isSubmitted}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {codingData.languages.map((lang) => (
                          <SelectItem key={lang.id} value={lang.id}>
                            {lang.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button 
                      onClick={handleRunCode}
                      disabled={isRunning || isSubmitted}
                      variant="outline"
                      size="sm"
                    >
                      {isRunning ? (
                        <>
                          <Terminal className="w-4 h-4 mr-2 animate-pulse" />
                          Running...
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 mr-2" />
                          Run
                        </>
                      )}
                    </Button>
                    <Button 
                      onClick={handleSubmit}
                      disabled={isSubmitted || isSubmitting}
                      className="gradient-primary"
                      size="sm"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        "Submit"
                      )}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                <div className="flex-1 mb-4">
                  <Textarea
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="Write your solution here..."
                    className="h-full resize-none font-mono text-sm"
                    disabled={isSubmitted}
                  />
                </div>

                {/* Test Results */}
                {testResults && (
                  <Card className="border bg-muted/50">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Terminal className="w-4 h-4" />
                        Test Results
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span>Test Cases Passed:</span>
                        <Badge variant={testResults.passed === testResults.total ? "default" : "secondary"}>
                          {testResults.passed}/{testResults.total}
                        </Badge>
                      </div>
                      
                      <div className="space-y-2">
                        {testResults.cases.map((testCase: any, index: number) => (
                          <div key={index} className="flex items-start gap-2 text-xs">
                            {testCase.passed ? (
                              <CheckCircle2 className="w-3 h-3 text-green-600 mt-0.5 flex-shrink-0" />
                            ) : (
                              <XCircle className="w-3 h-3 text-red-600 mt-0.5 flex-shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">
                                Input: {testCase.input}
                              </p>
                              <p className="text-muted-foreground">
                                Expected: {testCase.expected} | Got: {testCase.actual}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="flex justify-between text-xs text-muted-foreground pt-2 border-t">
                        <span>Runtime: {testResults.executionTime}</span>
                        <span>Memory: {testResults.memoryUsage}</span>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default CodingChallenge;