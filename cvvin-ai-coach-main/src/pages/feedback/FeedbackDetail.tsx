import { useParams, Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  FileText, 
  Code2, 
  MessageSquare, 
  BarChart3,
  Clock,
  Calendar,
  TrendingUp,
  TrendingDown,
  ArrowLeft,
  Download,
  Share2,
  CheckCircle2,
  AlertCircle,
  Target,
  Award,
  Eye,
  Lightbulb
} from "lucide-react";
import Layout from "@/components/layout/Layout";
import feedbackData from "@/mock/feedback.json";
import userData from "@/mock/user.json";
import { useToast } from "@/hooks/use-toast";

const FeedbackDetail = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const user = userData.user;

  // Get session details from mock data
  const sessionReport = feedbackData.detailedReports[sessionId as keyof typeof feedbackData.detailedReports];

  if (!sessionReport) {
    return (
      <Layout isAuthenticated={true} user={{ fullName: user.fullName, profilePicture: user.profilePicture }}>
        <div className="container mx-auto px-6 py-8">
          <div className="max-w-2xl mx-auto text-center">
            <Card className="shadow-soft">
              <CardContent className="p-8">
                <AlertCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h1 className="text-2xl font-bold mb-4">Session Not Found</h1>
                <p className="text-muted-foreground mb-6">
                  The feedback session you're looking for doesn't exist or may have been removed.
                </p>
                <Button asChild>
                  <Link to="/feedback">Back to Feedback List</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </Layout>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600";
    if (score >= 75) return "text-blue-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBadgeVariant = (score: number): "default" | "secondary" | "destructive" => {
    if (score >= 90) return "default";
    if (score >= 75) return "secondary";
    return "destructive";
  };

  const downloadReport = () => {
    toast({
      title: "Download Started",
      description: "Your detailed report is being prepared for download.",
    });
  };

  const shareReport = () => {
    toast({
      title: "Share Link Copied",
      description: "Report sharing link has been copied to your clipboard.",
    });
  };

  return (
    <Layout isAuthenticated={true} user={{ fullName: user.fullName, profilePicture: user.profilePicture }}>
      <div className="container mx-auto px-6 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => navigate("/feedback")}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Feedback
              </Button>
              <div>
                <h1 className="text-3xl font-bold">{sessionReport.type} Report</h1>
                <p className="text-muted-foreground">
                  {formatDate(sessionReport.date)} • {formatDuration(sessionReport.duration)}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={shareReport}>
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
              <Button variant="outline" size="sm" onClick={downloadReport}>
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </Button>
            </div>
          </div>

          {/* Overall Score */}
          <Card className="shadow-soft mb-8">
            <CardContent className="p-8">
              <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
                <div className="text-center lg:text-left">
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`text-4xl font-bold ${getScoreColor(sessionReport.overallScore)}`}>
                      {sessionReport.overallScore}%
                    </div>
                    <Badge variant={getScoreBadgeVariant(sessionReport.overallScore)}>
                      {sessionReport.overallScore >= 90 ? "Excellent" : 
                       sessionReport.overallScore >= 75 ? "Good" :
                       sessionReport.overallScore >= 60 ? "Fair" : "Needs Improvement"}
                    </Badge>
                  </div>
                  <h2 className="text-xl font-semibold mb-2">Overall Performance</h2>
                  <p className="text-muted-foreground max-w-lg">
                    {sessionReport.summary}
                  </p>
                </div>
                <div className="flex flex-col items-center gap-4">
                  <Progress value={sessionReport.overallScore} className="w-32 h-3" />
                  <Badge variant="outline" className="text-xs">
                    Session #{sessionReport.id.split('_')[1]}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Module Breakdown */}
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              {sessionReport.modules.resume && <TabsTrigger value="resume">Resume</TabsTrigger>}
              {sessionReport.modules.technical && <TabsTrigger value="technical">Technical</TabsTrigger>}
              {sessionReport.modules.hr && <TabsTrigger value="hr">HR Interview</TabsTrigger>}
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Module Scores */}
                {Object.entries(sessionReport.modules).map(([moduleKey, moduleData]) => {
                  const moduleNames = {
                    resume: { name: "Resume Analysis", icon: FileText },
                    technical: { name: "Technical Interview", icon: Code2 },
                    hr: { name: "HR Interview", icon: MessageSquare }
                  };
                  
                  const moduleInfo = moduleNames[moduleKey as keyof typeof moduleNames];
                  if (!moduleInfo) return null;
                  
                  const Icon = moduleInfo.icon;
                  
                  return (
                    <Card key={moduleKey} className="shadow-soft">
                      <CardContent className="p-6">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                            <Icon className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-semibold">{moduleInfo.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {formatDuration(moduleData.duration)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className={`text-2xl font-bold ${getScoreColor(moduleData.score)}`}>
                            {moduleData.score}%
                          </div>
                          <Progress value={moduleData.score} className="w-20" />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Recommendations */}
              {sessionReport.recommendations && (
                <Card className="shadow-soft">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Lightbulb className="w-5 h-5" />
                      Key Recommendations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {sessionReport.recommendations.map((rec, index) => (
                        <div key={index} className="flex items-start gap-3 p-4 border rounded-lg">
                          <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                            rec.priority === 'high' ? 'bg-red-500' :
                            rec.priority === 'medium' ? 'bg-yellow-500' :
                            'bg-green-500'
                          }`} />
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium">{rec.category}</h4>
                              <Badge variant="outline" className="text-xs">
                                {rec.priority} priority
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{rec.suggestion}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Proctoring (if available) */}
              {sessionReport.proctoring && (
                <Card className="shadow-soft">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Eye className="w-5 h-5" />
                      Proctoring Report
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {sessionReport.proctoring.overallCompliance}%
                        </div>
                        <p className="text-sm text-muted-foreground">Overall Compliance</p>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold">
                          {sessionReport.proctoring.violations}
                        </div>
                        <p className="text-sm text-muted-foreground">Violations</p>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold">
                          {sessionReport.proctoring.warnings}
                        </div>
                        <p className="text-sm text-muted-foreground">Warnings</p>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold">
                          {sessionReport.proctoring.tabSwitches}
                        </div>
                        <p className="text-sm text-muted-foreground">Tab Switches</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Resume Tab */}
            {sessionReport.modules.resume && (
              <TabsContent value="resume" className="space-y-6">
                <Card className="shadow-soft">
                  <CardHeader>
                    <CardTitle>Resume Analysis Results</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                          Strengths
                        </h3>
                        <ul className="space-y-2">
                          {sessionReport.modules.resume.strengths.map((strength, index) => (
                            <li key={index} className="text-sm flex items-start gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-2 flex-shrink-0" />
                              {strength}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-yellow-500" />
                          Areas for Improvement
                        </h3>
                        <ul className="space-y-2">
                          {sessionReport.modules.resume.improvements.map((improvement, index) => (
                            <li key={index} className="text-sm flex items-start gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 mt-2 flex-shrink-0" />
                              {improvement}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            {/* Technical Tab */}
            {sessionReport.modules.technical && (
              <TabsContent value="technical" className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  {/* MCQ Results */}
                  {sessionReport.modules.technical.mcq && (
                    <Card className="shadow-soft">
                      <CardHeader>
                        <CardTitle>Multiple Choice Questions</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span>Score:</span>
                          <Badge variant={getScoreBadgeVariant(sessionReport.modules.technical.mcq.score)}>
                            {sessionReport.modules.technical.mcq.score}%
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Correct Answers:</span>
                          <span>{sessionReport.modules.technical.mcq.correctAnswers} / {sessionReport.modules.technical.mcq.totalQuestions}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Time Spent:</span>
                          <span>{formatDuration(sessionReport.modules.technical.mcq.timeSpent)}</span>
                        </div>
                        
                        <Separator />
                        
                        <div>
                          <h4 className="font-medium mb-2">Category Breakdown:</h4>
                          <div className="space-y-2">
                            {Object.entries(sessionReport.modules.technical.mcq.categoryBreakdown).map(([category, data]) => (
                              <div key={category} className="flex items-center justify-between">
                                <span className="text-sm">{category}:</span>
                                <div className="flex items-center gap-2">
                                  <Progress value={data.score} className="w-16 h-2" />
                                  <span className="text-sm">{data.score}%</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Coding Results */}
                  {sessionReport.modules.technical.coding && (
                    <Card className="shadow-soft">
                      <CardHeader>
                        <CardTitle>Coding Challenge</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span>Score:</span>
                          <Badge variant={getScoreBadgeVariant(sessionReport.modules.technical.coding.score)}>
                            {sessionReport.modules.technical.coding.score}%
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Problems Solved:</span>
                          <span>{sessionReport.modules.technical.coding.problemsSolved} / {sessionReport.modules.technical.coding.totalProblems}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Code Quality:</span>
                          <div className="flex items-center gap-2">
                            <Progress value={sessionReport.modules.technical.coding.codeQuality} className="w-16 h-2" />
                            <span className="text-sm">{sessionReport.modules.technical.coding.codeQuality}%</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Efficiency:</span>
                          <div className="flex items-center gap-2">
                            <Progress value={sessionReport.modules.technical.coding.efficiency} className="w-16 h-2" />
                            <span className="text-sm">{sessionReport.modules.technical.coding.efficiency}%</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Test Cases Passed:</span>
                          <span>{sessionReport.modules.technical.coding.testCasesPassed} / {sessionReport.modules.technical.coding.totalTestCases}</span>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>
            )}

            {/* HR Tab */}
            {sessionReport.modules.hr && (
              <TabsContent value="hr" className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <Card className="shadow-soft">
                    <CardHeader>
                      <CardTitle>Performance Metrics</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span>Overall Score:</span>
                        <Badge variant={getScoreBadgeVariant(sessionReport.modules.hr.score)}>
                          {sessionReport.modules.hr.score}%
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Questions Answered:</span>
                        <span>{sessionReport.modules.hr.questionsAnswered}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Avg Response Time:</span>
                        <span>{sessionReport.modules.hr.avgResponseTime}s</span>
                      </div>
                      
                      <Separator />
                      
                      <div>
                        <h4 className="font-medium mb-2">Rubric Scores:</h4>
                        <div className="space-y-2">
                          {Object.entries(sessionReport.modules.hr.rubricScores).map(([criterion, score]) => (
                            <div key={criterion} className="flex items-center justify-between">
                              <span className="text-sm capitalize">{criterion}:</span>
                              <div className="flex items-center gap-2">
                                <Progress value={score} className="w-16 h-2" />
                                <span className="text-sm">{score}%</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="shadow-soft">
                    <CardHeader>
                      <CardTitle>Feedback Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <h4 className="font-medium mb-2 flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                          Strengths
                        </h4>
                        <ul className="space-y-1">
                          {sessionReport.modules.hr.strengths.map((strength, index) => (
                            <li key={index} className="text-sm flex items-start gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-2 flex-shrink-0" />
                              {strength}
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      <div>
                        <h4 className="font-medium mb-2 flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-yellow-500" />
                          Areas for Improvement
                        </h4>
                        <ul className="space-y-1">
                          {sessionReport.modules.hr.improvements.map((improvement, index) => (
                            <li key={index} className="text-sm flex items-start gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 mt-2 flex-shrink-0" />
                              {improvement}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            )}
          </Tabs>

          {/* Action Buttons */}
          <Card className="shadow-soft gradient-accent mt-8">
            <CardContent className="p-6 text-center">
              <h3 className="text-lg font-semibold mb-4 text-accent-foreground">
                Ready to Improve Further?
              </h3>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button asChild size="lg" className="gradient-primary">
                  <Link to="/interview/full-mock">
                    Take Another Mock Interview
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="bg-background">
                  <Link to="/dashboard">
                    Back to Dashboard
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default FeedbackDetail;
