import { useState, useEffect } from "react";
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
  Terminal
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/layout/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { consolidatedAPI } from "@/services/consolidatedAPI";
import { wrapCodeForExecution } from "@/utils/code-wrapper";
import codingData from "@/mock/coding.json";

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
  const [submissionStatus, setSubmissionStatus] = useState<string | null>(null);

  const question = codingData.defaultChallenge; // Using default challenge

  useEffect(() => {
    // Set starter code based on selected language
    setCode(question.starterCode[language as keyof typeof question.starterCode] || "");
  }, [language]);

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
        description: "Please log in to execute code."
      });
      return;
    }

    setIsRunning(true);
    setTestResults(null);

    try {
      // Get visible test cases
      const visibleTests = question.testCases.filter(test => !test.hidden);
      
      // Wrap code for execution (convert LeetCode format to stdin/stdout)
      const wrappedCode = wrapCodeForExecution(code, language);
      
      // Execute code against test cases
      const result = await consolidatedAPI.executeCode(
        currentUser,
        wrappedCode,
        language,
        visibleTests
      );

      setTestResults({
        passed: result.passed,
        total: result.total,
        cases: result.cases.map((testCase: any) => ({
          caseNumber: testCase.caseNumber,
          input: testCase.input,
          expected: testCase.expected,
          actual: testCase.actual,
          passed: testCase.passed,
          error: testCase.error,
          hidden: testCase.hidden
        })),
        allPassed: result.allPassed,
        status: result.status
      });

      toast({
        title: "Code Executed",
        description: result.allPassed 
          ? `✅ All ${result.total} test cases passed!`
          : `${result.passed} out of ${result.total} test cases passed.`
      });
    } catch (error: any) {
      console.error('Code execution error:', error);
      toast({
        variant: "destructive",
        title: "Execution Failed",
        description: error.message || "Failed to execute code. Please check your code and try again."
      });
    } finally {
      setIsRunning(false);
    }
  };

  const handleSubmit = async () => {
    if (!code.trim()) {
      toast({
        variant: "destructive",
        title: "No Code",
        description: "Please write code before submitting."
      });
      return;
    }

    if (!currentUser) {
      toast({
        variant: "destructive",
        title: "Authentication Required",
        description: "Please log in to submit code."
      });
      return;
    }

    setIsSubmitted(true);
    setIsRunning(true);

    try {
      // Run all test cases (including hidden ones)
      const wrappedCode = wrapCodeForExecution(code, language);
      const result = await consolidatedAPI.executeCode(
        currentUser,
        wrappedCode,
        language,
        question.testCases
      );

      setSubmissionStatus(result.status);
      setTestResults({
        passed: result.passed,
        total: result.total,
        cases: result.cases,
        allPassed: result.allPassed,
        status: result.status
      });

      if (result.allPassed) {
        toast({
          title: "✅ Accepted!",
          description: `All ${result.total} test cases passed. Great job!`
        });
      } else {
        toast({
          variant: "destructive",
          title: "❌ Wrong Answer",
          description: `${result.passed} out of ${result.total} test cases passed.`
        });
      }
    } catch (error: any) {
      console.error('Submission error:', error);
      toast({
        variant: "destructive",
        title: "Submission Failed",
        description: error.message || "Failed to submit code. Please try again."
      });
    } finally {
      setIsRunning(false);
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <Layout 
      isAuthenticated={!!currentUser} 
      user={{ 
        fullName: currentUser?.displayName || 'User', 
        profilePicture: currentUser?.photoURL 
      }}
      showFooter={false}
    >
      <div className="min-h-screen bg-background">
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
                      disabled={isSubmitted}
                      className="gradient-primary"
                      size="sm"
                    >
                      Submit
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
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Terminal className="w-4 h-4" />
                          Test Results
                        </CardTitle>
                        {submissionStatus && (
                          <Badge 
                            variant={submissionStatus === 'Accepted' ? "default" : "destructive"}
                            className="text-xs"
                          >
                            {submissionStatus}
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span>Test Cases Passed:</span>
                        <Badge variant={testResults.allPassed ? "default" : "secondary"}>
                          {testResults.passed}/{testResults.total}
                        </Badge>
                      </div>
                      
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {testResults.cases.map((testCase: any, index: number) => (
                          <div key={index} className="flex items-start gap-2 text-xs p-2 rounded border">
                            {testCase.passed ? (
                              <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                            ) : (
                              <XCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium mb-1">
                                Test Case {testCase.caseNumber}
                                {testCase.hidden && <Badge variant="outline" className="ml-2 text-xs">Hidden</Badge>}
                              </p>
                              <div className="space-y-1 text-muted-foreground">
                                <p><span className="font-medium">Input:</span> {testCase.input}</p>
                                <p><span className="font-medium">Expected:</span> {testCase.expected}</p>
                                <p><span className="font-medium">Your Output:</span> {testCase.actual}</p>
                                {testCase.error && (
                                  <p className="text-red-600 font-mono text-xs bg-red-50 p-1 rounded">
                                    Error: {testCase.error}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
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