import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Clock, AlertCircle, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/layout/Layout";
import userData from "@/mock/user.json";
import mcqData from "@/mock/mcq.json";

const MCQTest = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const user = userData.completedProfile;
  
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<{ [key: number]: number }>({});
  const [timeLeft, setTimeLeft] = useState(mcqData.testConfig.totalTimeLimit); // From config
  const [selectedAnswer, setSelectedAnswer] = useState<number | undefined>(undefined);

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

  useEffect(() => {
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

  const handleTimeUp = () => {
    toast({
      title: "Time's Up!",
      description: "Moving to coding challenge..."
    });
    navigate("/technical-interview/coding");
  };

  const handleAnswerSelect = (value: string) => {
    const answerIndex = parseInt(value);
    // Update both local state and answers object
    setSelectedAnswer(answerIndex);
    setAnswers(prev => ({ ...prev, [currentQuestion]: answerIndex }));
  };

  const handleNext = () => {
    if (currentQuestion < totalQuestions - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      // All questions completed
      toast({
        title: "MCQ Section Complete!",
        description: "Moving to coding challenge..."
      });
      navigate("/technical-interview/coding");
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

  return (
    <Layout 
      isAuthenticated={true} 
      user={{ fullName: user.fullName, profilePicture: user.profilePicture }}
      showFooter={false}
    >
      <div className="min-h-screen bg-background">
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
                    >
                      Finish MCQ Section
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
                    onClick={() => navigate("/technical-interview/coding")}
                    size="sm"
                    variant="outline"
                    className="ml-auto"
                  >
                    Skip to Coding
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