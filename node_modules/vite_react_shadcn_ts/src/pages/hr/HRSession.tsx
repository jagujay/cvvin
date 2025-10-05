import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Clock, 
  MessageSquare,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  RotateCcw
} from "lucide-react";
import Layout from "@/components/layout/Layout";
import { useToast } from "@/hooks/use-toast";
import hrData from "@/mock/hr.json";
import userData from "@/mock/user.json";

interface Question {
  id: string;
  category: string;
  question: string;
  followUps: string[];
  tips: string[];
  timeLimit: number;
  rubric: Record<string, { weight: number; description: string }>;
}

const HRSession = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [sessionStarted, setSessionStarted] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [currentResponse, setCurrentResponse] = useState("");
  const [showTips, setShowTips] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  const user = userData.user;
  const questions = hrData.questions;
  const currentQuestion = questions[currentQuestionIndex];

  useEffect(() => {
    if (sessionStarted && timeRemaining > 0) {
      timerRef.current = setTimeout(() => {
        setTimeRemaining(prev => prev - 1);
      }, 1000);
    } else if (timeRemaining === 0 && sessionStarted) {
      handleTimeUp();
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [timeRemaining, sessionStarted]);

  const startSession = () => {
    setSessionStarted(true);
    setTimeRemaining(currentQuestion.timeLimit);
    toast({
      title: "HR Interview Started",
      description: "Good luck! Take your time to provide thoughtful answers.",
    });
  };

  const startRecording = () => {
    setIsRecording(true);
    setIsListening(true);
    
    // Simulate recording - in real app, this would use MediaRecorder API
    setTimeout(() => {
      setIsListening(false);
      toast({
        title: "Recording complete",
        description: "Your response has been recorded. You can record again if needed.",
      });
    }, 3000);
  };

  const stopRecording = () => {
    setIsRecording(false);
    setIsListening(false);
  };

  const handleTextResponse = () => {
    if (currentResponse.trim()) {
      setResponses(prev => ({
        ...prev,
        [currentQuestion.id]: currentResponse.trim()
      }));
      
      toast({
        title: "Response saved",
        description: "Your text response has been recorded.",
      });
      
      setCurrentResponse("");
    }
  };

  const nextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setTimeRemaining(questions[currentQuestionIndex + 1].timeLimit);
      setShowTips(false);
    } else {
      completeSession();
    }
  };

  const handleTimeUp = () => {
    toast({
      title: "Time's up!",
      description: "Moving to the next question.",
      variant: "destructive"
    });
    nextQuestion();
  };

  const completeSession = () => {
    setSessionComplete(true);
    toast({
      title: "HR Interview Complete!",
      description: "Great job! Your responses are being analyzed.",
    });
  };

  const viewResults = () => {
    // In a real app, this would create a session and redirect to feedback
    navigate("/feedback/hr-interview/session_new");
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (sessionComplete) {
    return (
      <Layout isAuthenticated={true} user={{ fullName: user.fullName, profilePicture: user.profilePicture }}>
        <div className="container mx-auto px-6 py-8">
          <div className="max-w-2xl mx-auto text-center">
            <Card className="shadow-soft">
              <CardContent className="p-8">
                <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h1 className="text-2xl font-bold mb-4">HR Interview Complete!</h1>
                <p className="text-muted-foreground mb-6">
                  Congratulations! You've completed the HR interview session. 
                  Your responses are being analyzed and you'll receive detailed feedback shortly.
                </p>
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between items-center">
                    <span>Questions Answered:</span>
                    <Badge variant="secondary">{Object.keys(responses).length} / {questions.length}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Session Duration:</span>
                    <Badge variant="secondary">~{Math.floor(questions.reduce((acc, q) => acc + q.timeLimit, 0) / 60)} minutes</Badge>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button onClick={viewResults} className="gradient-primary">
                    View Detailed Feedback
                  </Button>
                  <Button variant="outline" onClick={() => navigate("/dashboard")}>
                    Return to Dashboard
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </Layout>
    );
  }

  if (!sessionStarted) {
    return (
      <Layout isAuthenticated={true} user={{ fullName: user.fullName, profilePicture: user.profilePicture }}>
        <div className="container mx-auto px-6 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold mb-4">HR Interview Session</h1>
              <p className="text-muted-foreground">
                Interactive behavioral interview practice with AI-powered feedback
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <Card className="shadow-soft">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5" />
                    What to Expect
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-medium text-primary">1</span>
                    </div>
                    <p className="text-sm">You'll be asked {questions.length} behavioral interview questions</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-medium text-primary">2</span>
                    </div>
                    <p className="text-sm">Each question has a time limit for your response</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-medium text-primary">3</span>
                    </div>
                    <p className="text-sm">You can respond via voice recording or text input</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-medium text-primary">4</span>
                    </div>
                    <p className="text-sm">Get detailed feedback on your responses and delivery</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-soft">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    Tips for Success
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {hrData.tips.general.slice(0, 4).map((tip, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-1" />
                      <p className="text-sm">{tip}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            <Card className="shadow-soft text-center">
              <CardContent className="p-8">
                <h2 className="text-xl font-semibold mb-4">Ready to Begin?</h2>
                <p className="text-muted-foreground mb-6">
                  The session will take approximately {Math.floor(questions.reduce((acc, q) => acc + q.timeLimit, 0) / 60)} minutes to complete.
                  Make sure you're in a quiet environment with good lighting.
                </p>
                <Button onClick={startSession} size="lg" className="gradient-primary">
                  Start HR Interview
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout isAuthenticated={true} user={{ fullName: user.fullName, profilePicture: user.profilePicture }}>
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
                <span className={`font-mono text-lg ${timeRemaining <= 30 ? 'text-red-500' : ''}`}>
                  {formatTime(timeRemaining)}
                </span>
              </div>
            </div>
          </div>

          {/* Progress */}
          <div className="mb-6">
            <Progress value={(currentQuestionIndex / questions.length) * 100} className="h-2" />
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Main Question Area */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="shadow-soft">
                <CardHeader>
                  <CardTitle>Question</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-lg leading-relaxed mb-4">{currentQuestion.question}</p>
                  
                  {/* Recording Controls */}
                  <div className="flex flex-wrap gap-3 mb-4">
                    {!isRecording ? (
                      <Button onClick={startRecording} className="flex items-center gap-2">
                        <Mic className="w-4 h-4" />
                        Record Response
                      </Button>
                    ) : (
                      <Button onClick={stopRecording} variant="destructive" className="flex items-center gap-2">
                        <MicOff className="w-4 h-4" />
                        {isListening ? "Listening..." : "Stop Recording"}
                      </Button>
                    )}
                    
                    <Button 
                      variant="outline" 
                      onClick={() => setShowTips(!showTips)}
                      className="flex items-center gap-2"
                    >
                      <AlertCircle className="w-4 h-4" />
                      {showTips ? "Hide Tips" : "Show Tips"}
                    </Button>
                  </div>

                  {/* Text Response Alternative */}
                  <div className="space-y-3">
                    <Separator />
                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Or type your response (development mode):
                      </label>
                      <textarea
                        value={currentResponse}
                        onChange={(e) => setCurrentResponse(e.target.value)}
                        placeholder="Type your response here..."
                        className="w-full p-3 border rounded-lg resize-none h-24"
                      />
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-xs text-muted-foreground">
                          {currentResponse.length} characters
                        </span>
                        <Button 
                          onClick={handleTextResponse} 
                          size="sm"
                          disabled={!currentResponse.trim()}
                        >
                          Save Response
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Navigation */}
                  <div className="flex justify-between items-center mt-6">
                    <Button 
                      variant="outline" 
                      onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
                      disabled={currentQuestionIndex === 0}
                    >
                      Previous
                    </Button>
                    
                    <Button onClick={nextQuestion} className="flex items-center gap-2">
                      {currentQuestionIndex === questions.length - 1 ? "Complete Interview" : "Next Question"}
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              {/* Tips */}
              {showTips && (
                <Card className="shadow-soft">
                  <CardHeader>
                    <CardTitle className="text-sm">Tips for This Question</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {currentQuestion.tips.map((tip, index) => (
                        <li key={index} className="text-sm flex items-start gap-2">
                          <CheckCircle2 className="w-3 h-3 text-green-500 flex-shrink-0 mt-1" />
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Session Progress */}
              <Card className="shadow-soft">
                <CardHeader>
                  <CardTitle className="text-sm">Session Progress</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {questions.map((q, index) => (
                    <div key={q.id} className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                        index < currentQuestionIndex ? 'bg-green-500 text-white' :
                        index === currentQuestionIndex ? 'bg-primary text-primary-foreground' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {index < currentQuestionIndex ? '✓' : index + 1}
                      </div>
                      <span className={`text-sm ${
                        index === currentQuestionIndex ? 'font-medium' : ''
                      }`}>
                        {q.category}
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Responses */}
              {Object.keys(responses).length > 0 && (
                <Card className="shadow-soft">
                  <CardHeader>
                    <CardTitle className="text-sm">Responses Recorded</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {Object.entries(responses).map(([questionId, response]) => {
                        const question = questions.find(q => q.id === questionId);
                        return (
                          <div key={questionId} className="p-2 bg-muted rounded text-xs">
                            <div className="font-medium">{question?.category}</div>
                            <div className="text-muted-foreground truncate">
                              {response.substring(0, 50)}...
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default HRSession;
