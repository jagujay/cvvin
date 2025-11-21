import { useState, useEffect } from "react";
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
  AlertTriangle,
  Target,
  Award,
  Eye,
  Lightbulb,
  Loader2,
  Briefcase
} from "lucide-react";
import Layout from "@/components/layout/Layout";
import feedbackData from "@/mock/feedback.json";
import userData from "@/mock/user.json";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { consolidatedAPI } from "@/services/consolidatedAPI";

const FeedbackDetail = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const user = userData.user;

  const [sessionReport, setSessionReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSession = async () => {
      if (!sessionId || !currentUser) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        // For HR sessions, use the HR-specific endpoint to get complete data including gesture analysis
        // Try HR endpoint first if we suspect it's an HR session (from URL or try both)
        let sessionData: any;
        
        // Try HR endpoint first (more likely to have gesture data)
        try {
          console.log('📋 Trying HR-specific endpoint first...');
          sessionData = await consolidatedAPI.getHRSession(currentUser, sessionId);
          console.log('✅ HR Session response received:', sessionData);
        } catch (hrError) {
          console.log('HR endpoint failed, trying generic endpoint...', hrError);
          // Fallback to generic endpoint
          sessionData = await consolidatedAPI.getSession(currentUser, sessionId);
        }
        
        console.log('Final sessionData:', sessionData);
        console.log('sessionData.type:', sessionData?.type);
        console.log('sessionData.sessionType:', sessionData?.sessionType);
        console.log('sessionData.feedback:', sessionData?.feedback);
        console.log('sessionData.feedback?.gestureAnalysis:', sessionData?.feedback?.gestureAnalysis);
        console.log('sessionData.metadata:', sessionData?.metadata);
        console.log('sessionData.metadata?.gestureAnalysis:', sessionData?.metadata?.gestureAnalysis);
        console.log('sessionData.components:', sessionData?.components);
        
        // Store raw response for debugging
        (window as any).__lastSessionResponse = sessionData;
        
        // Find specific components
        const mcqComponent = sessionData.components?.find((c: any) => c.type === 'mcq');
        const codingComponent = sessionData.components?.find((c: any) => c.type === 'coding');
        const hrComponent = sessionData.components?.find((c: any) => c.type === 'hr');
        
        const isResumeAnalysis = sessionData.sessionType === 'resume' || sessionData.isResumeAnalysis;
        const recommendationsArray = Array.isArray(sessionData.feedback?.recommendations)
          ? sessionData.feedback?.recommendations
          : Array.isArray(sessionData.feedback?.suggestions)
            ? sessionData.feedback?.suggestions
            : [];
        const detailedRecommendationsData = (
          sessionData.feedback?.recommendations &&
          !Array.isArray(sessionData.feedback?.recommendations) &&
          typeof sessionData.feedback?.recommendations === 'object'
        )
          ? sessionData.feedback?.recommendations
          : {
              howToImprove: [],
              whatNotToDo: [],
              whatToDoFromErrors: []
            };
        
        const transformedData = {
          id: sessionData.id,
          type: sessionData.type || sessionData.sessionType,
          date: sessionData.startedAt || sessionData.date,
          duration: sessionData.duration || 0,
          overallScore: sessionData.score || sessionData.overall_score || 0,
          status: sessionData.status,
          summary: sessionData.feedback?.summary || sessionData.feedback?.detailedFeedback || sessionData.feedback?.overallFeedback || 'No summary available',
          
          // Technical interview - MCQ
          mcq: mcqComponent ? {
            score: mcqComponent.score || mcqComponent.feedback?.overallScore || sessionData.feedback?.mcqScore || sessionData.feedback?.detailedAnalysis?.mcq?.performance?.score || 0,
            correctAnswers: mcqComponent.feedback?.correctAnswers || sessionData.feedback?.detailedAnalysis?.mcq?.performance?.correctAnswers || 0,
            totalQuestions: mcqComponent.data?.questions?.length || mcqComponent.feedback?.totalQuestions || sessionData.feedback?.detailedAnalysis?.mcq?.performance?.totalQuestions || 0,
            timeSpent: mcqComponent.data?.totalTime || sessionData.feedback?.detailedAnalysis?.mcq?.performance?.averageTime || 0,
            summary: mcqComponent.feedback?.summary || mcqComponent.feedback?.detailedFeedback || '',
            strengths: mcqComponent.feedback?.strengths || [],
            weaknesses: mcqComponent.feedback?.weaknesses || [],
            topicBreakdown: mcqComponent.feedback?.topicBreakdown || mcqComponent.feedback?.performanceByCategory || sessionData.feedback?.detailedAnalysis?.mcq?.performanceByCategory || {},
            categoryBreakdown: mcqComponent.feedback?.performanceByCategory || sessionData.feedback?.detailedAnalysis?.mcq?.performanceByCategory || {},
            conceptAnalysis: mcqComponent.feedback?.conceptAnalysis || sessionData.feedback?.detailedAnalysis?.mcq?.conceptAnalysis || {},
            reviewTable: mcqComponent.feedback?.reviewTable || sessionData.feedback?.detailedAnalysis?.mcq?.reviewTable || [],
            feedback: mcqComponent.feedback || sessionData.feedback?.mcqAnalysis || {},
            // Include full data for question review
            questions: mcqComponent.data?.questions || [],
            answers: mcqComponent.data?.answers || {}
          } : null,
          
          // Technical interview - Coding
          coding: codingComponent ? {
            score: codingComponent.score || codingComponent.feedback?.overallScore || sessionData.feedback?.codingScore || sessionData.feedback?.detailedAnalysis?.coding?.performance?.score || 0,
            testCasesPassed: codingComponent.feedback?.testCasesPassed || codingComponent.data?.testResults?.passed || sessionData.feedback?.detailedAnalysis?.coding?.performance?.testCasesPassed || 0,
            totalTestCases: codingComponent.feedback?.totalTestCases || codingComponent.data?.testResults?.total || sessionData.feedback?.detailedAnalysis?.coding?.performance?.testCasesTotal || 0,
            codeQuality: codingComponent.feedback?.codeQuality || codingComponent.feedback?.codeQuality?.overallQuality || sessionData.feedback?.detailedAnalysis?.coding?.codeQuality?.overallQuality || 0,
            timeComplexity: codingComponent.feedback?.timeComplexity || sessionData.feedback?.detailedAnalysis?.coding?.codeQuality?.timeComplexity || 'Not analyzed',
            spaceComplexity: codingComponent.feedback?.spaceComplexity || sessionData.feedback?.detailedAnalysis?.coding?.codeQuality?.spaceComplexity || 'Not analyzed',
            summary: codingComponent.feedback?.summary || codingComponent.feedback?.detailedFeedback || '',
            strengths: codingComponent.feedback?.strengths || [],
            weaknesses: codingComponent.feedback?.weaknesses || [],
            problem: codingComponent.data?.problem || sessionData.feedback?.detailedAnalysis?.coding?.problemAnalysis || {},
            solution: codingComponent.data?.solution,
            testCaseBreakdown: codingComponent.feedback?.testCaseBreakdown || sessionData.feedback?.detailedAnalysis?.coding?.testCaseBreakdown || [],
            feedback: codingComponent.feedback || sessionData.feedback?.codingAnalysis || {}
          } : null,
          
          // HR interview specific  
          hr: hrComponent ? {
            score: hrComponent.score || 0,
            questionsAnswered: Object.keys(hrComponent.data?.responses || {}).length,
            totalQuestions: hrComponent.data?.questions?.length || 0,
            rubricScores: hrComponent.data?.rubricScores || {},
            textAnalyses: hrComponent.data?.textAnalyses || {},
            questions: hrComponent.data?.questions || [],
            responses: hrComponent.data?.responses || {},
            summary: hrComponent.feedback?.summary || hrComponent.feedback?.overallFeedback || '',
            strengths: hrComponent.feedback?.strengths || [],
            weaknesses: hrComponent.feedback?.weaknesses || [],
            feedback: hrComponent.feedback,
            finalReport: sessionData.feedback || {},
            gestureAnalysis: sessionData.feedback?.gestureAnalysis || sessionData.metadata?.gestureAnalysis || hrComponent.feedback?.gestureAnalysis || hrComponent.data?.gestureAnalysis || null,
            // Also store raw feedback for gesture lookup
            rawFeedback: sessionData.feedback || {}
          } : (sessionData.type === 'HR Interview' || sessionData.sessionType === 'hr') ? {
            // If no HR component but it's an HR session, create HR data structure
            score: sessionData.score || 0,
            questionsAnswered: 0,
            totalQuestions: 0,
            rubricScores: {},
            textAnalyses: {},
            questions: sessionData.feedback?.questions || [],
            responses: {},
            summary: sessionData.feedback?.summary || '',
            strengths: sessionData.feedback?.strengths || [],
            weaknesses: sessionData.feedback?.weaknesses || [],
            feedback: sessionData.feedback || {},
            finalReport: sessionData.feedback || {},
            gestureAnalysis: sessionData.feedback?.gestureAnalysis || sessionData.metadata?.gestureAnalysis || null,
            rawFeedback: sessionData.feedback || {}
          } : null,
          
          // Resume analysis flag and data
          isResumeAnalysis,
          resume: isResumeAnalysis ? {
            // Use the full analysis result from feedback - this is the complete analysis result
            analysisResult: sessionData.feedback || {},
            score: sessionData.score || 0,
            summary: sessionData.feedback?.summary || sessionData.feedback?.overallFeedback || '',
            strengths: sessionData.feedback?.strengths || [],
            weaknesses: sessionData.feedback?.weaknesses || [],
            recommendations: recommendationsArray,
            skillsMatched: sessionData.feedback?.matchedSkills || sessionData.feedback?.skillsMatched || [],
            skillsMissing: sessionData.feedback?.missingSkills || sessionData.feedback?.skillsMissing || [],
            extraSkills: sessionData.feedback?.extraSkills || [],
            experienceRelevance: sessionData.feedback?.experienceRelevance || 0,
            fileId: sessionData.metadata?.fileId,
            jobDescription: sessionData.metadata?.jobDescription || sessionData.feedback?.jobDescription?.title || ''
          } : null,
          
          // Combined technical module structure
          modules: {
            technical: (mcqComponent || codingComponent || sessionData.feedback?.detailedAnalysis) ? {
              mcq: mcqComponent || sessionData.feedback?.detailedAnalysis?.mcq ? {
                score: mcqComponent?.score || mcqComponent?.feedback?.overallScore || sessionData.feedback?.mcqScore || sessionData.feedback?.detailedAnalysis?.mcq?.performance?.score || 0,
                correctAnswers: mcqComponent?.feedback?.correctAnswers || sessionData.feedback?.detailedAnalysis?.mcq?.performance?.correctAnswers || 0,
                totalQuestions: mcqComponent?.data?.questions?.length || mcqComponent?.feedback?.totalQuestions || sessionData.feedback?.detailedAnalysis?.mcq?.performance?.totalQuestions || 0,
                timeSpent: mcqComponent?.data?.totalTime || sessionData.feedback?.detailedAnalysis?.mcq?.performance?.averageTime || 0,
                summary: mcqComponent?.feedback?.summary || mcqComponent?.feedback?.detailedFeedback || '',
                categoryBreakdown: mcqComponent?.feedback?.performanceByCategory || sessionData.feedback?.detailedAnalysis?.mcq?.performanceByCategory || {},
                conceptAnalysis: mcqComponent?.feedback?.conceptAnalysis || sessionData.feedback?.detailedAnalysis?.mcq?.conceptAnalysis || {}
              } : null,
              coding: codingComponent || sessionData.feedback?.detailedAnalysis?.coding ? {
                score: codingComponent?.score || codingComponent?.feedback?.overallScore || sessionData.feedback?.codingScore || sessionData.feedback?.detailedAnalysis?.coding?.performance?.score || 0,
                testCasesPassed: codingComponent?.feedback?.testCasesPassed || codingComponent?.data?.testResults?.passed || sessionData.feedback?.detailedAnalysis?.coding?.performance?.testCasesPassed || 0,
                totalTestCases: codingComponent?.feedback?.totalTestCases || codingComponent?.data?.testResults?.total || sessionData.feedback?.detailedAnalysis?.coding?.performance?.testCasesTotal || 0,
                codeQuality: codingComponent?.feedback?.codeQuality || codingComponent?.feedback?.codeQuality?.overallQuality || sessionData.feedback?.detailedAnalysis?.coding?.codeQuality?.overallQuality || 0,
                summary: codingComponent?.feedback?.summary || codingComponent?.feedback?.detailedFeedback || '',
                testCaseBreakdown: codingComponent?.feedback?.testCaseBreakdown || sessionData.feedback?.detailedAnalysis?.coding?.testCaseBreakdown || []
              } : null
            } : null,
            hr: hrComponent ? {
              score: hrComponent.score || 0,
              questionsAnswered: Object.keys(hrComponent.data?.responses || {}).length,
              totalQuestions: hrComponent.data?.questions?.length || 0
            } : null,
            resume: sessionData.sessionType === 'resume' ? {
              score: sessionData.score || 0
            } : null
          },
          
          // Recommendations from feedback (handle both array of strings and array of objects)
          recommendations: recommendationsArray.map((rec: any) => {
            if (typeof rec === 'string') {
              return { suggestion: rec, category: 'General', priority: 'medium' };
            }
            return {
              suggestion: rec.suggestion || rec.recommendation || rec.description || '',
              category: rec.category || rec.source || 'General',
              priority: rec.priority || 'medium'
            };
          }),
          
          // Strengths and weaknesses
          strengths: sessionData.feedback?.strengths || [],
          weaknesses: sessionData.feedback?.weaknesses || [],
          
          // Proctoring feedback
          proctoring: sessionData.feedback?.proctoringFeedback ? {
            overallCompliance: sessionData.feedback.proctoringFeedback.totalCount === 0 ? 100 : Math.max(0, 100 - (sessionData.feedback.proctoringFeedback.totalCount * 5)),
            violations: sessionData.feedback.proctoringFeedback.totalCount || 0,
            warnings: (sessionData.feedback.proctoringFeedback.breakdown?.medium?.length || 0) + (sessionData.feedback.proctoringFeedback.breakdown?.low?.length || 0),
            tabSwitches: sessionData.feedback.proctoringFeedback.violations?.TAB_SWITCH || 0,
            message: sessionData.feedback.proctoringFeedback.message || '',
            severity: sessionData.feedback.proctoringFeedback.severity || 'none',
            breakdown: sessionData.feedback.proctoringFeedback.breakdown || {},
            violationsDetail: sessionData.feedback.proctoringFeedback.violations || {}
          } : null,
          feedback: sessionData.feedback || {},
          
          // Error analysis from both rounds
          errorAnalysis: sessionData.feedback?.errorAnalysis || {
            mcqErrors: sessionData.feedback?.detailedAnalysis?.mcq?.errorAnalysis || null,
            codingErrors: sessionData.feedback?.detailedAnalysis?.coding?.errorAnalysis || null,
            commonMistakes: [],
            errorPatterns: {}
          },
          
          // Detailed recommendations (what to do, what not to do)
          detailedRecommendations: detailedRecommendationsData,
          
          // Include components
          components: sessionData.components || [],
          
          // Metadata
          metadata: sessionData.metadata || {}
        };
        
        console.log('Transformed session data:', transformedData);
        console.log('Transformed hr.gestureAnalysis:', transformedData.hr?.gestureAnalysis);
        console.log('Transformed feedback.gestureAnalysis:', transformedData.feedback?.gestureAnalysis);
        setSessionReport(transformedData);
      } catch (error: any) {
        console.error('Failed to fetch session:', error);
        
        // Fallback to mock data if fetch fails
        const mockSession = feedbackData.detailedReports[sessionId as keyof typeof feedbackData.detailedReports];
        if (mockSession) {
          console.log('Using mock data as fallback');
          setSessionReport(mockSession);
        } else {
          setError('Session not found');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchSession();
  }, [sessionId, currentUser]);

  if (loading) {
    return (
      <Layout isAuthenticated={true} user={{ fullName: user.fullName, profilePicture: user.profilePicture }}>
        <div className="container mx-auto px-6 py-8">
          <div className="max-w-2xl mx-auto text-center">
            <Card className="shadow-soft">
              <CardContent className="p-8">
                <Loader2 className="w-16 h-16 text-primary mx-auto mb-4 animate-spin" />
                <h1 className="text-2xl font-bold mb-4">Loading Session...</h1>
                <p className="text-muted-foreground">
                  Please wait while we fetch your feedback data.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !sessionReport) {
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

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'Date not available';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid Date';
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Invalid Date';
    }
  };

  const formatDuration = (seconds: number | undefined) => {
    if (seconds === undefined || seconds === null || isNaN(Number(seconds))) return '0m';
    const secs = Number(seconds);
    const hours = Math.floor(secs / 3600);
    const minutes = Math.floor((secs % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const getScoreColor = (score: number | undefined) => {
    const numScore = Number(score) || 0;
    if (numScore >= 90) return "text-green-600";
    if (numScore >= 75) return "text-blue-600";
    if (numScore >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBadgeVariant = (score: number | undefined): "default" | "secondary" | "destructive" => {
    const numScore = Number(score) || 0;
    if (numScore >= 90) return "default";
    if (numScore >= 75) return "secondary";
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
          {/* Back Button */}
          <div className="mb-6">
            <Button variant="ghost" size="sm" onClick={() => navigate("/feedback")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Feedback & Reports
            </Button>
          </div>

          {/* Session Summary Card - Matches Dashboard/FeedbackList Style */}
          <Card className="shadow-soft mb-8">
            <CardContent className="p-6">
              <div className="flex items-center justify-between gap-6">
                {/* Left: Icon + Session Info */}
                <div className="flex items-center gap-4 flex-1">
                  {/* Icon */}
                  <div className="w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    {sessionReport.isResumeAnalysis && (
                      <FileText className="w-8 h-8 text-primary" />
                    )}
                    {sessionReport.hr && !sessionReport.isResumeAnalysis && (
                      <MessageSquare className="w-8 h-8 text-primary" />
                    )}
                    {(sessionReport.mcq || sessionReport.coding) && !sessionReport.hr && !sessionReport.isResumeAnalysis && (
                      <Code2 className="w-8 h-8 text-primary" />
                    )}
                    {!sessionReport.isResumeAnalysis && !sessionReport.hr && !sessionReport.mcq && !sessionReport.coding && (
                      <BarChart3 className="w-8 h-8 text-primary" />
                    )}
                  </div>

                  {/* Session Details */}
                  <div className="flex-1">
                    <h1 className="text-2xl font-bold mb-2">
                      {sessionReport.isResumeAnalysis ? 'Resume Analysis' : 
                       sessionReport.hr ? 'HR Interview' : 
                       sessionReport.type || 'Interview'} Report
                    </h1>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {formatDate(sessionReport.date)}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {formatDuration(sessionReport.duration)}
                      </div>
                      {sessionReport.status && (
                        <Badge variant={sessionReport.status === 'completed' ? 'default' : 'secondary'}>
                          {sessionReport.status}
                        </Badge>
                      )}
                      {sessionReport.id && (
                        <span className="text-xs">
                          Session #{sessionReport.id.substring(0, 8)}...
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Score + Actions */}
                <div className="flex items-center gap-6">
                  {/* Score Display */}
                  <div className="text-center">
                    <div className={`text-4xl font-bold mb-1 ${getScoreColor(sessionReport.overallScore)}`}>
                      {Number(sessionReport.overallScore) || 0}%
                    </div>
                    <Progress value={Number(sessionReport.overallScore) || 0} className="w-24 h-2 mb-2" />
                    <Badge variant={getScoreBadgeVariant(sessionReport.overallScore)}>
                      {(Number(sessionReport.overallScore) || 0) >= 90 ? "Excellent" : 
                       (Number(sessionReport.overallScore) || 0) >= 75 ? "Good" :
                       (Number(sessionReport.overallScore) || 0) >= 60 ? "Fair" : "Needs Improvement"}
                    </Badge>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col gap-2">
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
              </div>
            </CardContent>
          </Card>

          {/* Overall Summary - Simplified */}
          {sessionReport.summary && sessionReport.summary !== 'No summary available' && (
            <Card className="shadow-soft mb-8 border-l-4 border-l-primary">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Award className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-lg font-semibold mb-2">Performance Summary</h2>
                    <p className="text-muted-foreground leading-relaxed">
                      {sessionReport.summary}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Module Breakdown */}
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              {(sessionReport.modules?.resume || sessionReport.isResumeAnalysis || sessionReport.resume) && <TabsTrigger value="resume">Resume</TabsTrigger>}
              {sessionReport.modules?.technical && <TabsTrigger value="technical">Technical</TabsTrigger>}
              {(sessionReport.modules?.hr || sessionReport.hr) && <TabsTrigger value="hr">HR Interview</TabsTrigger>}
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              {/* Combined Technical Overview */}
              {sessionReport.modules?.technical && !sessionReport.isResumeAnalysis && (
                <Card className="shadow-soft">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Code2 className="w-5 h-5" />
                      Combined Technical Performance
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Performance Summary */}
                    <div className="grid md:grid-cols-2 gap-6">
                      {/* MCQ Performance */}
                      {sessionReport.modules?.technical?.mcq && (
                        <div className="p-4 border rounded-lg">
                          <h3 className="font-semibold mb-3 flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            MCQ Performance
                          </h3>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">Score:</span>
                              <Badge variant={getScoreBadgeVariant(sessionReport.modules?.technical?.mcq?.score)}>
                                {Number(sessionReport.modules?.technical?.mcq?.score) || 0}%
                              </Badge>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">Correct Answers:</span>
                              <span className="text-sm font-medium">
                                {Number(sessionReport.modules?.technical?.mcq?.correctAnswers) || 0} / {Number(sessionReport.modules?.technical?.mcq?.totalQuestions) || 0}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">Time Spent:</span>
                              <span className="text-sm">{formatDuration(Number(sessionReport.modules?.technical?.mcq?.timeSpent) || 0)}</span>
                            </div>
                            {sessionReport.modules?.technical?.mcq?.summary && (
                              <p className="text-xs text-muted-foreground mt-2">{sessionReport.modules.technical.mcq.summary}</p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Coding Performance */}
                      {sessionReport.modules?.technical?.coding && (
                        <div className="p-4 border rounded-lg">
                          <h3 className="font-semibold mb-3 flex items-center gap-2">
                            <Code2 className="w-4 h-4" />
                            Coding Performance
                          </h3>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">Score:</span>
                              <Badge variant={getScoreBadgeVariant(sessionReport.modules?.technical?.coding?.score)}>
                                {Number(sessionReport.modules?.technical?.coding?.score) || 0}%
                              </Badge>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">Test Cases:</span>
                              <span className="text-sm font-medium">
                                {Number(sessionReport.modules?.technical?.coding?.testCasesPassed) || 0} / {Number(sessionReport.modules?.technical?.coding?.totalTestCases) || 0}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">Code Quality:</span>
                              <div className="flex items-center gap-2">
                                <Progress value={Number(sessionReport.modules?.technical?.coding?.codeQuality) || 0} className="w-16 h-2" />
                                <span className="text-sm">{Number(sessionReport.modules?.technical?.coding?.codeQuality) || 0}%</span>
                              </div>
                            </div>
                            {sessionReport.modules?.technical?.coding?.summary && (
                              <p className="text-xs text-muted-foreground mt-2">{sessionReport.modules.technical.coding.summary}</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <Separator />

                    {/* Key Recommendations */}
                    {sessionReport.recommendations && sessionReport.recommendations.length > 0 && (
                      <div>
                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                          <Lightbulb className="w-4 h-4" />
                          Key Recommendations
                        </h3>
                        <div className="space-y-2">
                          {sessionReport.recommendations.map((rec: any, index: number) => (
                            <div key={index} className="p-3 border rounded-lg bg-muted/30">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Badge variant="outline" className="text-xs">
                                      {rec.category || 'General'}
                                    </Badge>
                                    {rec.priority && (
                                      <Badge 
                                        variant={rec.priority === 'high' ? 'destructive' : rec.priority === 'medium' ? 'secondary' : 'default'}
                                        className="text-xs"
                                      >
                                        {rec.priority}
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-sm">{rec.suggestion || rec}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Module Scores */}
                {sessionReport.modules && Object.entries(sessionReport.modules)
                  .filter(([_, moduleData]) => moduleData !== null && moduleData !== undefined)
                  .map(([moduleKey, moduleData]) => {
                    const moduleNames = {
                      resume: { name: "Resume Analysis", icon: FileText },
                      technical: { name: "Technical Interview", icon: Code2 },
                      hr: { name: "HR Interview", icon: MessageSquare }
                    };
                    
                    const moduleInfo = moduleNames[moduleKey as keyof typeof moduleNames];
                    if (!moduleInfo || !moduleData) return null;
                    
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
                                {formatDuration(moduleData.duration || 0)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className={`text-2xl font-bold ${getScoreColor(moduleData.score)}`}>
                              {Number(moduleData.score) || 0}%
                            </div>
                            <Progress value={Number(moduleData.score) || 0} className="w-20" />
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
              </div>

              {/* Recommendations */}
              {sessionReport.recommendations && Array.isArray(sessionReport.recommendations) && sessionReport.recommendations.length > 0 && (
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
                  <CardContent className="space-y-6">
                    {/* Summary Stats */}
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

                    {/* Detailed Violations Breakdown */}
                    {(() => {
                      const proctoringFeedback = sessionReport.proctoring?.breakdown ? 
                        { 
                          breakdown: sessionReport.proctoring.breakdown, 
                          violations: sessionReport.proctoring.violationsDetail, 
                          message: sessionReport.proctoring.message 
                        } :
                        sessionReport.feedback?.proctoringFeedback || {};
                      if (!proctoringFeedback || (!proctoringFeedback.breakdown && !proctoringFeedback.violations)) return null;

                      return (
                        <div className="space-y-4">
                          <Separator />
                          <h4 className="font-semibold">Detailed Violations Breakdown</h4>
                          
                          {/* Critical Violations */}
                          {proctoringFeedback.breakdown.critical && proctoringFeedback.breakdown.critical.length > 0 && (
                            <div className="p-4 border border-red-300 rounded-lg bg-red-50/50">
                              <h5 className="font-semibold text-red-700 mb-3 flex items-center gap-2">
                                <AlertCircle className="w-4 h-4" />
                                Critical Violations
                              </h5>
                              <div className="space-y-2">
                                {proctoringFeedback.breakdown.critical.map((violation: any, index: number) => (
                                  <div key={index} className="flex items-center justify-between p-2 bg-white rounded border border-red-200">
                                    <span className="text-sm font-medium">{violation.type || 'Unknown'}</span>
                                    <Badge variant="destructive">{violation.count || 0} times</Badge>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* High Severity Violations */}
                          {proctoringFeedback.breakdown.high && proctoringFeedback.breakdown.high.length > 0 && (
                            <div className="p-4 border border-orange-300 rounded-lg bg-orange-50/50">
                              <h5 className="font-semibold text-orange-700 mb-3 flex items-center gap-2">
                                <AlertCircle className="w-4 h-4" />
                                High Severity Violations
                              </h5>
                              <div className="space-y-2">
                                {proctoringFeedback.breakdown.high.map((violation: any, index: number) => (
                                  <div key={index} className="flex items-center justify-between p-2 bg-white rounded border border-orange-200">
                                    <span className="text-sm font-medium">{violation.type || 'Unknown'}</span>
                                    <Badge variant="default">{violation.count || 0} times</Badge>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Medium Severity Violations */}
                          {proctoringFeedback.breakdown.medium && proctoringFeedback.breakdown.medium.length > 0 && (
                            <div className="p-4 border border-yellow-300 rounded-lg bg-yellow-50/50">
                              <h5 className="font-semibold text-yellow-700 mb-3 flex items-center gap-2">
                                <AlertCircle className="w-4 h-4" />
                                Medium Severity Violations
                              </h5>
                              <div className="space-y-2">
                                {proctoringFeedback.breakdown.medium.map((violation: any, index: number) => (
                                  <div key={index} className="flex items-center justify-between p-2 bg-white rounded border border-yellow-200">
                                    <span className="text-sm font-medium">{violation.type || 'Unknown'}</span>
                                    <Badge variant="secondary">{violation.count || 0} times</Badge>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Low Severity Violations */}
                          {proctoringFeedback.breakdown.low && proctoringFeedback.breakdown.low.length > 0 && (
                            <div className="p-4 border border-blue-300 rounded-lg bg-blue-50/50">
                              <h5 className="font-semibold text-blue-700 mb-3 flex items-center gap-2">
                                <AlertCircle className="w-4 h-4" />
                                Low Severity Violations
                              </h5>
                              <div className="space-y-2">
                                {proctoringFeedback.breakdown.low.map((violation: any, index: number) => (
                                  <div key={index} className="flex items-center justify-between p-2 bg-white rounded border border-blue-200">
                                    <span className="text-sm font-medium">{violation.type || 'Unknown'}</span>
                                    <Badge variant="outline">{violation.count || 0} times</Badge>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* All Violations (if breakdown not available) */}
                          {proctoringFeedback.violations && Object.keys(proctoringFeedback.violations).length > 0 && 
                           (!proctoringFeedback.breakdown || Object.keys(proctoringFeedback.breakdown).length === 0) && (
                            <div className="p-4 border rounded-lg bg-muted/50">
                              <h5 className="font-semibold mb-3">All Violations</h5>
                              <div className="space-y-2">
                                {Object.entries(proctoringFeedback.violations).map(([type, count]: [string, any]) => (
                                  <div key={type} className="flex items-center justify-between p-2 bg-white rounded border">
                                    <span className="text-sm font-medium">{type.replace(/_/g, ' ')}</span>
                                    <Badge variant="outline">{count || 0} times</Badge>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Proctoring Message */}
                          {proctoringFeedback.message && (
                            <div className="p-3 bg-muted rounded-lg">
                              <p className="text-sm">{proctoringFeedback.message}</p>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Resume Tab - Display exactly as in ResumeAnalysis page */}
            {(sessionReport.modules?.resume || sessionReport.isResumeAnalysis || sessionReport.resume) && (
              <TabsContent value="resume" className="space-y-6">
                {(() => {
                  // Get the analysis result - it should be in sessionReport.resume.analysisResult or sessionReport.feedback
                  const resumeData = sessionReport.resume || {};
                  const analysisResult = resumeData.analysisResult || sessionReport.feedback || {};
                  
                  return (
                    <div className="space-y-6">
                      {/* Overall Score - Exact match to ResumeAnalysis */}
                          <div className="text-center p-6 bg-muted/50 rounded-lg">
                        <div className="text-3xl font-bold text-primary mb-2">
                          {analysisResult.overallScore || sessionReport.overallScore || 0}%
                            </div>
                        <p className="text-sm text-muted-foreground">Overall Match Score</p>
                        <Progress value={analysisResult.overallScore || sessionReport.overallScore || 0} className="mt-3" />
                        <div className="flex justify-center gap-4 mt-4 text-xs">
                          <span className="text-muted-foreground">Match: {analysisResult.matchPercentage || analysisResult.overallScore || sessionReport.overallScore || 0}%</span>
                          {analysisResult.processingTime && (
                            <span className="text-muted-foreground">Processed in {analysisResult.processingTime}s</span>
                            )}
                          </div>
                                </div>

                      {/* Job Description Info */}
                      {analysisResult.jobDescription && (
                        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                          <h4 className="font-semibold text-sm mb-2">Analyzing Against:</h4>
                          <p className="text-sm font-medium">{analysisResult.jobDescription.title || 'Job Position'}</p>
                          <p className="text-xs text-muted-foreground">
                            {analysisResult.jobDescription.company || 'Not specified'} • {analysisResult.jobDescription.location || 'Not specified'}
                          </p>
                                </div>
                          )}

                      {/* Matched Skills - Exact match to ResumeAnalysis */}
                      <div>
                        <h4 className="font-semibold flex items-center gap-2 mb-3">
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                          Matched Skills ({analysisResult.matchedSkills?.length || 0})
                        </h4>
                                <div className="space-y-2">
                          {(analysisResult.matchedSkills || []).map((skill: any, index: number) => (
                            <div key={skill.skill || index} className="p-2 bg-green-50 rounded border border-green-200">
                                      <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                                    {skill.skill || skill.name || skill}
                                  </Badge>
                                  {skill.yearsExperience > 0 && (
                                    <span className="text-xs text-muted-foreground">
                                      {skill.yearsExperience}y exp
                                        </span>
                                  )}
                                </div>
                                          <Badge 
                                  variant={skill.strength === 'high' ? 'default' : 'secondary'}
                                            className="text-xs"
                                          >
                                  {skill.proficiency || 'Intermediate'}
                                          </Badge>
                              </div>
                              {skill.evidence && (
                                <p className="text-xs text-muted-foreground mt-1 italic">
                                  {skill.evidence}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Missing Skills - Exact match to ResumeAnalysis */}
                      <div>
                        <h4 className="font-semibold flex items-center gap-2 mb-3">
                          <AlertCircle className="w-4 h-4 text-orange-600" />
                          Missing Skills ({analysisResult.missingSkills?.length || 0})
                        </h4>
                        <div className="space-y-2">
                          {(analysisResult.missingSkills || []).map((skill: any, index: number) => (
                            <div key={skill.skill || index} className="p-2 bg-orange-50 rounded border border-orange-200">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline" className="text-xs">
                                  {skill.skill || skill.name || skill}
                                </Badge>
                                <Badge 
                                  variant={skill.importance === 'high' ? 'destructive' : 'secondary'}
                                  className="text-xs"
                                >
                                  {skill.importance} priority
                                </Badge>
                                      </div>
                                      {skill.recommendation && (
                                <p className="text-xs text-muted-foreground mt-1">{skill.recommendation}</p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                      </div>

                      {/* Extra Skills - Exact match to ResumeAnalysis */}
                      {analysisResult.extraSkills && analysisResult.extraSkills.length > 0 && (
                                  <div>
                          <h4 className="font-semibold flex items-center gap-2 mb-3">
                            <TrendingUp className="w-4 h-4 text-purple-600" />
                            Extra Skills ({analysisResult.extraSkills.length})
                          </h4>
                          <div className="space-y-2">
                            {analysisResult.extraSkills.map((skill: any, index: number) => (
                              <div key={skill.skill || index} className="p-2 bg-purple-50 rounded border border-purple-200">
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700">
                                    {skill.skill || skill.name || skill}
                                  </Badge>
                                  <Badge 
                                    variant={skill.relevance === 'high' ? 'default' : 'secondary'}
                                    className="text-xs"
                                  >
                                    {skill.relevance} relevance
                                      </Badge>
                                    </div>
                                {skill.value && (
                                  <p className="text-xs text-muted-foreground mt-1">{skill.value}</p>
                                  )}
                                </div>
                            ))}
                          </div>
                        </div>
                          )}

                      {/* Strengths - Exact match to ResumeAnalysis */}
                      <div>
                        <h4 className="font-semibold flex items-center gap-2 mb-3">
                          <TrendingUp className="w-4 h-4 text-blue-600" />
                          Key Strengths
                        </h4>
                        <div className="space-y-2">
                          {(analysisResult.strengths || []).map((strength: any, index: number) => (
                            <div key={index} className="p-3 bg-blue-50 rounded border border-blue-200">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline" className="text-xs">{strength.category || 'General'}</Badge>
                                <Badge 
                                  variant={strength.impact === 'high' ? 'default' : 'secondary'}
                                  className="text-xs"
                                >
                                  {strength.impact || 'medium'} impact
                                </Badge>
                                      </div>
                              <p className="text-sm text-muted-foreground">{strength.description || strength.evidence || strength.strength || strength}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Recommendations for Newbies - Exact match to ResumeAnalysis */}
                      <div>
                        <h4 className="font-semibold flex items-center gap-2 mb-3">
                          <TrendingUp className="w-4 h-4 text-primary" />
                          Recommendations (Beginner-Friendly)
                        </h4>
                                <div className="space-y-3">
                          {(analysisResult.recommendations || []).slice(0, 3).map((rec: any, index: number) => (
                            <div key={index} className="p-4 border rounded-lg bg-gradient-to-br from-blue-50 to-white">
                              <div className="flex items-center gap-2 mb-2 flex-wrap">
                                <h5 className="font-medium">{rec.title || `Recommendation ${index + 1}`}</h5>
                                <Badge 
                                  variant={rec.priority === 'high' ? 'destructive' : 'secondary'}
                                  className="text-xs"
                                >
                                  {rec.priority || 'medium'} priority
                                      </Badge>
                                {rec.difficulty && (
                                  <Badge variant="outline" className="text-xs">
                                    {rec.difficulty} level
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground mb-2">{rec.description || rec.suggestion || rec}</p>
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                {rec.timeEstimate && (
                                  <span>⏱️ Est. time: {rec.timeEstimate}</span>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                      </div>

                      {/* ATS Score and Compatibility - Exact match to ResumeAnalysis */}
                      <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold text-sm">ATS Score & Compatibility</h4>
                          <Badge 
                            variant={analysisResult.atsCompatibility?.score >= 80 ? 'default' : 
                                    analysisResult.atsCompatibility?.score >= 60 ? 'secondary' : 'destructive'}
                          >
                            {analysisResult.atsCompatibility?.score || 0}%
                          </Badge>
                                    </div>
                        <p className="text-xs text-muted-foreground mb-3">
                          Your resume's compatibility with Applicant Tracking Systems (ATS)
                        </p>
                        {analysisResult.atsCompatibility?.issues && analysisResult.atsCompatibility.issues.length > 0 && (
                          <div className="mb-3">
                            <p className="text-xs font-semibold mb-1">Issues Found:</p>
                            <ul className="text-xs text-muted-foreground space-y-1">
                                        {analysisResult.atsCompatibility.issues.map((issue: string, index: number) => (
                                <li key={index} className="flex items-start gap-2">
                                  <span className="text-orange-600">•</span>
                                  <span>{issue}</span>
                                </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                        {analysisResult.atsCompatibility?.suggestions && analysisResult.atsCompatibility.suggestions.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold mb-1">Improvement Suggestions:</p>
                            <ul className="text-xs text-muted-foreground space-y-1">
                              {analysisResult.atsCompatibility.suggestions.map((suggestion: string, index: number) => (
                                <li key={index} className="flex items-start gap-2">
                                  <span className="text-green-600">✓</span>
                                  <span>{suggestion}</span>
                                </li>
                              ))}
                            </ul>
                                </div>
                          )}
                      </div>
                    </div>
                  );
                })()}
              </TabsContent>
            )}

            {/* Technical Tab */}
            {sessionReport.modules?.technical && (
              <TabsContent value="technical" className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  {/* MCQ Results */}
                  {sessionReport.modules?.technical?.mcq && (
                    <Card className="shadow-soft">
                      <CardHeader>
                        <CardTitle>Multiple Choice Questions</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span>Score:</span>
                          <Badge variant={getScoreBadgeVariant(sessionReport.modules?.technical?.mcq?.score)}>
                            {Number(sessionReport.modules?.technical?.mcq?.score) || 0}%
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Correct Answers:</span>
                          <span>{Number(sessionReport.modules?.technical?.mcq?.correctAnswers) || 0} / {Number(sessionReport.modules?.technical?.mcq?.totalQuestions) || 0}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Time Spent:</span>
                          <span>{formatDuration(Number(sessionReport.modules?.technical?.mcq?.timeSpent) || 0)}</span>
                        </div>
                        
                        <Separator />
                        
                        {sessionReport.modules?.technical?.mcq?.categoryBreakdown && (
                          <div>
                            <h4 className="font-medium mb-2">Category Breakdown:</h4>
                            <div className="space-y-2">
                              {Object.entries(sessionReport.modules?.technical?.mcq?.categoryBreakdown || {}).map(([category, data]: [string, any]) => (
                                <div key={category} className="flex items-center justify-between">
                                  <span className="text-sm">{category}:</span>
                                  <div className="flex items-center gap-2">
                                    <Progress value={data.score || 0} className="w-16 h-2" />
                                    <span className="text-sm">{data.score || 0}%</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* Coding Results */}
                  {sessionReport.modules?.technical?.coding && (
                    <Card className="shadow-soft">
                      <CardHeader>
                        <CardTitle>Coding Challenge</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span>Score:</span>
                          <Badge variant={getScoreBadgeVariant(sessionReport.modules?.technical?.coding?.score)}>
                            {Number(sessionReport.modules?.technical?.coding?.score) || 0}%
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Problems Solved:</span>
                          <span>{Number(sessionReport.modules?.technical?.coding?.problemsSolved) || 0} / {Number(sessionReport.modules?.technical?.coding?.totalProblems) || 0}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Code Quality:</span>
                          <div className="flex items-center gap-2">
                            <Progress value={Number(sessionReport.modules?.technical?.coding?.codeQuality) || 0} className="w-16 h-2" />
                            <span className="text-sm">{Number(sessionReport.modules?.technical?.coding?.codeQuality) || 0}%</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Efficiency:</span>
                          <div className="flex items-center gap-2">
                            <Progress value={Number(sessionReport.modules?.technical?.coding?.efficiency) || 0} className="w-16 h-2" />
                            <span className="text-sm">{Number(sessionReport.modules?.technical?.coding?.efficiency) || 0}%</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Test Cases Passed:</span>
                          <span>{Number(sessionReport.modules?.technical?.coding?.testCasesPassed) || 0} / {Number(sessionReport.modules?.technical?.coding?.totalTestCases) || 0}</span>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Additional MCQ Details */}
                {sessionReport.mcq && (
                  <Card className="shadow-soft">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="w-5 h-5" />
                        MCQ Detailed Analysis
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Topic Breakdown */}
                      {sessionReport.mcq.topicBreakdown && Object.keys(sessionReport.mcq.topicBreakdown).length > 0 && (
                        <div>
                          <h4 className="font-semibold mb-3">Topic Performance</h4>
                          <div className="space-y-3">
                            {Object.entries(sessionReport.mcq.topicBreakdown).map(([topic, data]: [string, any]) => (
                              <div key={topic} className="p-4 border rounded-lg">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="font-medium">{topic}</span>
                                  <Badge variant={getScoreBadgeVariant(data.score || data.percentage)}>
                                    {Number(data.score || data.percentage) || 0}%
                                  </Badge>
                                </div>
                                <div className="flex items-center justify-between text-sm text-muted-foreground">
                                  <span>Correct: {data.correct || 0} / {data.total || 0}</span>
                                  <Progress value={Number(data.score || data.percentage) || 0} className="w-32 h-2" />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Question-by-Question Review */}
                      {sessionReport.mcq.feedback?.reviewTable && sessionReport.mcq.feedback.reviewTable.length > 0 && (
                        <div>
                          <h4 className="font-semibold mb-3">Question-by-Question Review</h4>
                          <div className="space-y-3 max-h-[600px] overflow-y-auto">
                            {sessionReport.mcq.feedback.reviewTable.map((item: any, index: number) => (
                              <div key={item.questionId || index} className="p-4 border rounded-lg bg-white">
                                <div className="flex items-start justify-between gap-2 mb-3">
                                  <h5 className="text-sm font-medium flex-1">
                                    Q{index + 1}: {item.question || `Question ${index + 1}`}
                                  </h5>
                                  <Badge variant={item.isCorrect ? "default" : "destructive"} className="flex-shrink-0">
                                    {item.isCorrect ? "✓ Correct" : "✗ Incorrect"}
                                  </Badge>
                                </div>

                                {item.options && (
                                  <div className="space-y-2 mb-3">
                                    {item.options.map((option: string, optIndex: number) => {
                                      const isUserAnswer = item.userAnswerIndex === optIndex;
                                      const isCorrectAnswer = item.correctAnswerIndex === optIndex;
                                      
                                      return (
                                        <div 
                                          key={optIndex} 
                                          className={`p-2 rounded text-sm ${
                                            isCorrectAnswer ? 'bg-green-100 border border-green-300' :
                                            isUserAnswer ? 'bg-red-100 border border-red-300' :
                                            'bg-gray-50'
                                          }`}
                                        >
                                          <div className="flex items-center gap-2">
                                            <span className="font-medium">{String.fromCharCode(65 + optIndex)}.</span>
                                            <span>{option}</span>
                                            {isCorrectAnswer && (
                                              <CheckCircle2 className="w-4 h-4 text-green-600 ml-auto" />
                                            )}
                                            {isUserAnswer && !isCorrectAnswer && (
                                              <AlertCircle className="w-4 h-4 text-red-600 ml-auto" />
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}

                                {item.explanation && (
                                  <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm">
                                    <p className="font-medium text-blue-900 mb-1">Explanation:</p>
                                    <p className="text-blue-800">{item.explanation}</p>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Strengths & Weaknesses */}
                      <div className="grid md:grid-cols-2 gap-4">
                        {sessionReport.mcq.strengths && sessionReport.mcq.strengths.length > 0 && (
                          <div className="p-4 border border-green-200 rounded-lg bg-green-50/50">
                            <h4 className="font-semibold mb-2 flex items-center gap-2 text-green-700">
                              <CheckCircle2 className="w-4 h-4" />
                              Strengths
                            </h4>
                            <ul className="space-y-1 text-sm">
                              {sessionReport.mcq.strengths.map((strength: string, index: number) => (
                                <li key={index} className="flex items-start gap-2">
                                  <span className="text-green-600">•</span>
                                  <span>{strength}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {sessionReport.mcq.weaknesses && sessionReport.mcq.weaknesses.length > 0 && (
                          <div className="p-4 border border-red-200 rounded-lg bg-red-50/50">
                            <h4 className="font-semibold mb-2 flex items-center gap-2 text-red-700">
                              <AlertCircle className="w-4 h-4" />
                              Areas for Improvement
                            </h4>
                            <ul className="space-y-1 text-sm">
                              {sessionReport.mcq.weaknesses.map((weakness: string, index: number) => (
                                <li key={index} className="flex items-start gap-2">
                                  <span className="text-red-600">•</span>
                                  <span>{weakness}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Additional Coding Details */}
                {sessionReport.coding && (
                  <Card className="shadow-soft">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Code2 className="w-5 h-5" />
                        Coding Challenge Details
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Problem Statement */}
                      {sessionReport.coding.problem && (
                        <div>
                          <h4 className="font-semibold mb-2">Problem: {sessionReport.coding.problem.title}</h4>
                          <div className="p-4 bg-muted rounded-lg">
                            <p className="text-sm whitespace-pre-wrap">{sessionReport.coding.problem.description}</p>
                            {sessionReport.coding.problem.difficulty && (
                              <Badge variant="outline" className="mt-2">
                                {sessionReport.coding.problem.difficulty}
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Complexity Analysis */}
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="p-4 border rounded-lg">
                          <h4 className="font-semibold mb-2">Time Complexity</h4>
                          <p className="text-2xl font-mono">{sessionReport.coding.timeComplexity}</p>
                        </div>
                        <div className="p-4 border rounded-lg">
                          <h4 className="font-semibold mb-2">Space Complexity</h4>
                          <p className="text-2xl font-mono">{sessionReport.coding.spaceComplexity}</p>
                        </div>
                      </div>

                      {/* Code Snippet */}
                      {sessionReport.coding.solution && (
                        <div>
                          <h4 className="font-semibold mb-2">Your Solution</h4>
                          <div className="p-4 bg-slate-900 text-slate-100 rounded-lg overflow-x-auto">
                            <pre className="text-sm font-mono">
                              <code>{typeof sessionReport.coding.solution === 'string' 
                                ? (sessionReport.coding.solution.substring(0, 500) + (sessionReport.coding.solution.length > 500 ? '\n...(truncated)' : ''))
                                : JSON.stringify(sessionReport.coding.solution, null, 2)}</code>
                            </pre>
                          </div>
                        </div>
                      )}

                      {/* Strengths & Weaknesses */}
                      <div className="grid md:grid-cols-2 gap-4">
                        {sessionReport.coding.strengths && sessionReport.coding.strengths.length > 0 && (
                          <div className="p-4 border border-green-200 rounded-lg bg-green-50/50">
                            <h4 className="font-semibold mb-2 flex items-center gap-2 text-green-700">
                              <CheckCircle2 className="w-4 h-4" />
                              Strengths
                            </h4>
                            <ul className="space-y-1 text-sm">
                              {sessionReport.coding.strengths.map((strength: string, index: number) => (
                                <li key={index} className="flex items-start gap-2">
                                  <span className="text-green-600">•</span>
                                  <span>{strength}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {sessionReport.coding.weaknesses && sessionReport.coding.weaknesses.length > 0 && (
                          <div className="p-4 border border-red-200 rounded-lg bg-red-50/50">
                            <h4 className="font-semibold mb-2 flex items-center gap-2 text-red-700">
                              <AlertCircle className="w-4 h-4" />
                              Areas for Improvement
                            </h4>
                            <ul className="space-y-1 text-sm">
                              {sessionReport.coding.weaknesses.map((weakness: string, index: number) => (
                                <li key={index} className="flex items-start gap-2">
                                  <span className="text-red-600">•</span>
                                  <span>{weakness}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Combined Error Analysis */}
                {sessionReport.errorAnalysis && (
                  <Card className="shadow-soft">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-orange-600" />
                        Error Analysis (Combined from Both Rounds)
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* MCQ Errors */}
                      {sessionReport.errorAnalysis.mcqErrors && (
                        <div>
                          <h4 className="font-semibold mb-3 flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            MCQ Errors
                          </h4>
                          {sessionReport.errorAnalysis.mcqErrors.incorrectAnswers && sessionReport.errorAnalysis.mcqErrors.incorrectAnswers.length > 0 && (
                            <div className="space-y-4">
                              {sessionReport.errorAnalysis.mcqErrors.incorrectAnswers.map((error: any, index: number) => (
                                <div key={index} className="p-4 border border-orange-200 rounded-lg bg-orange-50/50">
                                  <div className="flex items-start justify-between mb-2">
                                    <div className="flex-1">
                                      <p className="font-medium text-sm mb-1">{error.question || `Question ${index + 1}`}</p>
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <Badge variant="outline" className="text-xs">
                                          {error.errorType || 'Error'}
                                        </Badge>
                                        <span className="text-xs text-muted-foreground">
                                          Your Answer: <span className="font-medium text-red-600">{error.userAnswer}</span>
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                          Correct: <span className="font-medium text-green-600">{error.correctAnswer}</span>
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="space-y-2 mt-3">
                                    {error.errorReason && (
                                      <div className="text-sm">
                                        <span className="font-medium">Why it's wrong: </span>
                                        <span className="text-muted-foreground">{error.errorReason}</span>
                                      </div>
                                    )}
                                    {error.correctConcept && (
                                      <div className="text-sm">
                                        <span className="font-medium">Correct concept: </span>
                                        <span className="text-muted-foreground">{error.correctConcept}</span>
                                      </div>
                                    )}
                                    {error.whatToDo && (
                                      <div className="p-2 bg-green-50 border border-green-200 rounded text-sm">
                                        <span className="font-medium text-green-700">✓ What to do: </span>
                                        <span className="text-green-800">{error.whatToDo}</span>
                                      </div>
                                    )}
                                    {error.whatNotToDo && (
                                      <div className="p-2 bg-red-50 border border-red-200 rounded text-sm">
                                        <span className="font-medium text-red-700">✗ What not to do: </span>
                                        <span className="text-red-800">{error.whatNotToDo}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                          {sessionReport.errorAnalysis.mcqErrors.errorPatterns && (
                            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                              <p className="text-sm font-medium text-yellow-800 mb-1">Error Patterns:</p>
                              <p className="text-sm text-yellow-700">{sessionReport.errorAnalysis.mcqErrors.errorPatterns}</p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Coding Errors */}
                      {sessionReport.errorAnalysis.codingErrors && (
                        <div>
                          <h4 className="font-semibold mb-3 flex items-center gap-2">
                            <Code2 className="w-4 h-4" />
                            Coding Errors
                          </h4>
                          {sessionReport.errorAnalysis.codingErrors.failedTestCases && sessionReport.errorAnalysis.codingErrors.failedTestCases.length > 0 && (
                            <div className="space-y-4">
                              {sessionReport.errorAnalysis.codingErrors.failedTestCases.map((error: any, index: number) => (
                                <div key={index} className="p-4 border border-orange-200 rounded-lg bg-orange-50/50">
                                  <div className="flex items-start justify-between mb-2">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 flex-wrap mb-2">
                                        <Badge variant="outline" className="text-xs">
                                          {error.errorType || 'Error'}
                                        </Badge>
                                        {error.codeLocation && (
                                          <span className="text-xs text-muted-foreground">
                                            Location: {error.codeLocation}
                                          </span>
                                        )}
                                      </div>
                                      {error.testCase && (
                                        <p className="text-xs text-muted-foreground mb-1">
                                          Test Case: {error.testCase}
                                        </p>
                                      )}
                                      <div className="grid md:grid-cols-2 gap-2 text-xs">
                                        <div>
                                          <span className="font-medium">Expected: </span>
                                          <code className="bg-white px-1 rounded">{error.expectedOutput}</code>
                                        </div>
                                        <div>
                                          <span className="font-medium">Actual: </span>
                                          <code className="bg-white px-1 rounded text-red-600">{error.actualOutput}</code>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="space-y-2 mt-3">
                                    {error.errorReason && (
                                      <div className="text-sm">
                                        <span className="font-medium">Why it failed: </span>
                                        <span className="text-muted-foreground">{error.errorReason}</span>
                                      </div>
                                    )}
                                    {error.correctApproach && (
                                      <div className="text-sm">
                                        <span className="font-medium">Correct approach: </span>
                                        <span className="text-muted-foreground">{error.correctApproach}</span>
                                      </div>
                                    )}
                                    {error.whatToDo && (
                                      <div className="p-2 bg-green-50 border border-green-200 rounded text-sm">
                                        <span className="font-medium text-green-700">✓ What to do: </span>
                                        <span className="text-green-800">{error.whatToDo}</span>
                                      </div>
                                    )}
                                    {error.whatNotToDo && (
                                      <div className="p-2 bg-red-50 border border-red-200 rounded text-sm">
                                        <span className="font-medium text-red-700">✗ What not to do: </span>
                                        <span className="text-red-800">{error.whatNotToDo}</span>
                                      </div>
                                    )}
                                    {error.codeFix && (
                                      <div className="p-3 bg-slate-900 text-slate-100 rounded text-xs font-mono overflow-x-auto">
                                        <p className="text-green-400 mb-1">Fixed Code:</p>
                                        <pre>{error.codeFix}</pre>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                          {sessionReport.errorAnalysis.codingErrors.codeIssues && sessionReport.errorAnalysis.codingErrors.codeIssues.length > 0 && (
                            <div className="mt-4 space-y-2">
                              <h5 className="font-medium text-sm">Code Issues:</h5>
                              {sessionReport.errorAnalysis.codingErrors.codeIssues.map((issue: any, index: number) => (
                                <div key={index} className="p-3 border rounded bg-white">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Badge variant={issue.severity === 'high' ? 'destructive' : 'secondary'} className="text-xs">
                                      {issue.severity} severity
                                    </Badge>
                                    {issue.location && (
                                      <span className="text-xs text-muted-foreground">{issue.location}</span>
                                    )}
                                  </div>
                                  <p className="text-sm mb-1">{issue.issue}</p>
                                  {issue.impact && (
                                    <p className="text-xs text-muted-foreground mb-1">Impact: {issue.impact}</p>
                                  )}
                                  {issue.fix && (
                                    <p className="text-xs text-green-700">Fix: {issue.fix}</p>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                          {sessionReport.errorAnalysis.codingErrors.errorPatterns && (
                            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                              <p className="text-sm font-medium text-yellow-800 mb-1">Error Patterns:</p>
                              <p className="text-sm text-yellow-700">{sessionReport.errorAnalysis.codingErrors.errorPatterns}</p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Common Mistakes */}
                      {sessionReport.errorAnalysis.commonMistakes && sessionReport.errorAnalysis.commonMistakes.length > 0 && (
                        <div>
                          <h4 className="font-semibold mb-3">Common Mistakes Across Both Rounds</h4>
                          <div className="space-y-2">
                            {sessionReport.errorAnalysis.commonMistakes.map((mistake: any, index: number) => (
                              <div key={index} className="p-3 border rounded bg-white flex items-start gap-2">
                                <AlertCircle className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                                <div className="flex-1">
                                  <p className="text-sm">{typeof mistake === 'string' ? mistake : mistake.mistake}</p>
                                  {typeof mistake === 'object' && mistake.source && (
                                    <Badge variant="outline" className="text-xs mt-1">{mistake.source}</Badge>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Overall Error Patterns */}
                      {sessionReport.errorAnalysis.errorPatterns?.overall && (
                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                          <h4 className="font-semibold mb-2 text-blue-900">Overall Error Patterns</h4>
                          <p className="text-sm text-blue-800">{sessionReport.errorAnalysis.errorPatterns.overall}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Detailed Recommendations */}
                {sessionReport.detailedRecommendations && (
                  <Card className="shadow-soft">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Lightbulb className="w-5 h-5 text-yellow-600" />
                        Detailed Recommendations
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* How to Improve */}
                      {sessionReport.detailedRecommendations.howToImprove && sessionReport.detailedRecommendations.howToImprove.length > 0 && (
                        <div>
                          <h4 className="font-semibold mb-3 flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-green-600" />
                            How to Improve
                          </h4>
                          <div className="space-y-3">
                            {sessionReport.detailedRecommendations.howToImprove.map((rec: any, index: number) => (
                              <div key={index} className="p-4 border border-green-200 rounded-lg bg-green-50/50">
                                <div className="flex items-start justify-between mb-2">
                                  <h5 className="font-medium text-sm">{rec.title || `Recommendation ${index + 1}`}</h5>
                                  <div className="flex items-center gap-2">
                                    {rec.source && (
                                      <Badge variant="outline" className="text-xs">{rec.source}</Badge>
                                    )}
                                    {rec.priority && (
                                      <Badge 
                                        variant={rec.priority === 'high' ? 'destructive' : 'secondary'} 
                                        className="text-xs"
                                      >
                                        {rec.priority} priority
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                <p className="text-sm text-muted-foreground mb-2">{rec.description || rec.suggestion}</p>
                                {rec.actionable && (
                                  <div className="p-2 bg-white rounded border border-green-200">
                                    <p className="text-xs font-medium text-green-700 mb-1">Action Items:</p>
                                    <p className="text-xs text-green-800">{rec.actionable}</p>
                                  </div>
                                )}
                                {rec.codeExample && (
                                  <div className="mt-2 p-3 bg-slate-900 text-slate-100 rounded text-xs font-mono overflow-x-auto">
                                    <pre>{rec.codeExample}</pre>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* What Not to Do */}
                      {sessionReport.detailedRecommendations.whatNotToDo && sessionReport.detailedRecommendations.whatNotToDo.length > 0 && (
                        <div>
                          <h4 className="font-semibold mb-3 flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-red-600" />
                            What Not to Do
                          </h4>
                          <div className="space-y-3">
                            {sessionReport.detailedRecommendations.whatNotToDo.map((rec: any, index: number) => (
                              <div key={index} className="p-4 border border-red-200 rounded-lg bg-red-50/50">
                                <div className="flex items-start justify-between mb-2">
                                  <h5 className="font-medium text-sm text-red-900">{rec.mistake || `Mistake ${index + 1}`}</h5>
                                  {rec.source && (
                                    <Badge variant="outline" className="text-xs">{rec.source}</Badge>
                                  )}
                                </div>
                                {rec.whyAvoid && (
                                  <p className="text-sm text-red-800 mb-2">Why to avoid: {rec.whyAvoid}</p>
                                )}
                                {rec.betterApproach && (
                                  <div className="p-2 bg-white rounded border border-red-200">
                                    <p className="text-xs font-medium text-green-700 mb-1">Better approach:</p>
                                    <p className="text-xs text-green-800">{rec.betterApproach}</p>
                                  </div>
                                )}
                                {rec.example && (
                                  <div className="mt-2 p-3 bg-slate-900 text-slate-100 rounded text-xs font-mono overflow-x-auto">
                                    <p className="text-red-400 mb-1">Example of mistake:</p>
                                    <pre>{rec.example}</pre>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* What to Do From Errors */}
                      {sessionReport.detailedRecommendations.whatToDoFromErrors && sessionReport.detailedRecommendations.whatToDoFromErrors.length > 0 && (
                        <div>
                          <h4 className="font-semibold mb-3 flex items-center gap-2">
                            <Target className="w-4 h-4 text-blue-600" />
                            What to Do From Errors
                          </h4>
                          <div className="space-y-3">
                            {sessionReport.detailedRecommendations.whatToDoFromErrors.map((rec: any, index: number) => (
                              <div key={index} className="p-4 border border-blue-200 rounded-lg bg-blue-50/50">
                                <div className="flex items-start justify-between mb-2">
                                  <h5 className="font-medium text-sm text-blue-900">{rec.errorType || `Error Type ${index + 1}`}</h5>
                                  {rec.source && (
                                    <Badge variant="outline" className="text-xs">{rec.source}</Badge>
                                  )}
                                </div>
                                {rec.correctApproach && (
                                  <p className="text-sm text-blue-800 mb-2">{rec.correctApproach}</p>
                                )}
                                {rec.practiceSuggestions && rec.practiceSuggestions.length > 0 && (
                                  <div className="p-2 bg-white rounded border border-blue-200">
                                    <p className="text-xs font-medium text-blue-700 mb-1">Practice suggestions:</p>
                                    <ul className="text-xs text-blue-800 space-y-1">
                                      {rec.practiceSuggestions.map((suggestion: string, idx: number) => (
                                        <li key={idx} className="flex items-start gap-2">
                                          <span className="text-blue-600">•</span>
                                          <span>{suggestion}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                {rec.codeFix && (
                                  <div className="mt-2 p-3 bg-slate-900 text-slate-100 rounded text-xs font-mono overflow-x-auto">
                                    <p className="text-green-400 mb-1">Corrected code:</p>
                                    <pre>{rec.codeFix}</pre>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            )}

            {/* HR Tab */}
            {(sessionReport.modules?.hr || sessionReport.hr || (sessionReport.type === 'HR Interview' && sessionReport.feedback)) && (
              <TabsContent value="hr" className="space-y-6">
                {(() => {
                  const hrData = sessionReport.hr || sessionReport.modules?.hr || (sessionReport.type === 'HR Interview' ? {
                    finalReport: sessionReport.feedback || {},
                    gestureAnalysis: sessionReport.feedback?.gestureAnalysis || sessionReport.metadata?.gestureAnalysis || null,
                    questions: sessionReport.feedback?.questions || [],
                    responses: {},
                    textAnalyses: {},
                    rubricScores: {},
                    strengths: sessionReport.feedback?.strengths || [],
                    weaknesses: sessionReport.feedback?.weaknesses || []
                  } : null);
                  const finalReport = hrData?.finalReport || sessionReport.feedback || {};
                  
                  return (
                    <>
                      {/* Overall HR Performance */}
                      <Card className="shadow-soft">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <MessageSquare className="w-5 h-5" />
                            HR Interview Performance
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                          <div className="grid md:grid-cols-2 gap-6">
                            <div>
                              <div className="flex items-center justify-between mb-4">
                                <span className="text-lg font-semibold">Overall Score</span>
                                <Badge variant={getScoreBadgeVariant(finalReport.overallScore || hrData?.overallScore || 0)} className="text-lg px-3 py-1">
                                  {Number(finalReport.overallScore || hrData?.overallScore || 0)}%
                                </Badge>
                              </div>
                              <Progress value={Number(finalReport.overallScore || hrData?.overallScore || 0)} className="h-3" />
                              {(finalReport.overallPerformanceSummary || finalReport.summary) && (
                                <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                                  <h4 className="font-semibold mb-2">Comprehensive Performance Summary</h4>
                                  <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                                    {finalReport.overallPerformanceSummary || finalReport.summary}
                                  </p>
                                </div>
                              )}
                            </div>
                            
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Questions Answered:</span>
                                <span className="font-medium">
                                  {hrData?.answeredCount || 0} / {hrData?.questionCount || 0}
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Session Duration:</span>
                                <span className="font-medium">{formatDuration(sessionReport.duration || 0)}</span>
                              </div>
                              {finalReport.suitability?.rating && (
                                <div className="flex items-center justify-between">
                                  <span className="text-sm text-muted-foreground">Suitability:</span>
                                  <Badge variant="outline" className="capitalize">
                                    {finalReport.suitability.rating}
                                  </Badge>
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Communication Skills */}
                      {finalReport.communicationSkills && (
                        <Card className="shadow-soft">
                          <CardHeader>
                            <CardTitle>Communication Skills</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="grid md:grid-cols-2 gap-4">
                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm">Overall Communication:</span>
                                  <div className="flex items-center gap-2">
                                    <Progress value={Number(finalReport.communicationSkills.overallScore || 0)} className="w-20 h-2" />
                                    <span className="text-sm font-medium">{Number(finalReport.communicationSkills.overallScore || 0)}%</span>
                                  </div>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-sm">Fluency:</span>
                                  <div className="flex items-center gap-2">
                                    <Progress value={Number(finalReport.communicationSkills.fluency || 0)} className="w-20 h-2" />
                                    <span className="text-sm font-medium">{Number(finalReport.communicationSkills.fluency || 0)}%</span>
                                  </div>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-sm">Clarity:</span>
                                  <div className="flex items-center gap-2">
                                    <Progress value={Number(finalReport.communicationSkills.clarity || 0)} className="w-20 h-2" />
                                    <span className="text-sm font-medium">{Number(finalReport.communicationSkills.clarity || 0)}%</span>
                                  </div>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-sm">Confidence:</span>
                                  <div className="flex items-center gap-2">
                                    <Progress value={Number(finalReport.communicationSkills.confidence || 0)} className="w-20 h-2" />
                                    <span className="text-sm font-medium">{Number(finalReport.communicationSkills.confidence || 0)}%</span>
                                  </div>
                                </div>
                              </div>
                              {finalReport.communicationSkills.summary && (
                                <div className="p-3 bg-muted rounded-lg">
                                  <p className="text-sm">{finalReport.communicationSkills.summary}</p>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* Rubric Scores */}
                      {finalReport.rubricScores && Object.keys(finalReport.rubricScores).length > 0 && (
                        <Card className="shadow-soft">
                          <CardHeader>
                            <CardTitle>Rubric Scores</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="grid md:grid-cols-2 gap-4">
                              {Object.entries(finalReport.rubricScores).map(([criterion, data]: [string, any]) => {
                                const score = typeof data === 'number' ? data : (data?.average || 0);
                                return (
                                  <div key={criterion} className="flex items-center justify-between p-3 border rounded-lg">
                                    <span className="text-sm font-medium capitalize">{criterion}:</span>
                                    <div className="flex items-center gap-2">
                                      <Progress value={Number(score)} className="w-24 h-2" />
                                      <span className="text-sm font-medium w-12 text-right">{Number(score)}%</span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* Strengths & Weaknesses */}
                      <div className="grid md:grid-cols-2 gap-6">
                        {finalReport.strengths && finalReport.strengths.length > 0 && (
                          <Card className="shadow-soft">
                            <CardHeader>
                              <CardTitle className="flex items-center gap-2">
                                <CheckCircle2 className="w-5 h-5 text-green-500" />
                                Strengths
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <ul className="space-y-3">
                                {finalReport.strengths.map((strength: any, index: number) => (
                                  <li key={index} className="text-sm flex items-start gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-2 flex-shrink-0" />
                                    <div>
                                      <p className="font-medium">{typeof strength === 'string' ? strength : strength.strength}</p>
                                      {typeof strength === 'object' && strength.evidence && (
                                        <p className="text-xs text-muted-foreground mt-1">{strength.evidence}</p>
                                      )}
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            </CardContent>
                          </Card>
                        )}

                        {finalReport.weaknesses && finalReport.weaknesses.length > 0 && (
                          <Card className="shadow-soft">
                            <CardHeader>
                              <CardTitle className="flex items-center gap-2">
                                <AlertCircle className="w-5 h-5 text-yellow-500" />
                                Areas for Improvement
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <ul className="space-y-3">
                                {finalReport.weaknesses.map((weakness: any, index: number) => (
                                  <li key={index} className="text-sm flex items-start gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 mt-2 flex-shrink-0" />
                                    <div>
                                      <p className="font-medium">{typeof weakness === 'string' ? weakness : weakness.weakness}</p>
                                      {typeof weakness === 'object' && weakness.evidence && (
                                        <p className="text-xs text-muted-foreground mt-1">{weakness.evidence}</p>
                                      )}
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            </CardContent>
                          </Card>
                        )}
                      </div>

                      {/* Comprehensive Answer Quality Analysis */}
                      {finalReport.answerQualityAnalysis && (
                        <Card className="shadow-soft">
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <FileText className="w-5 h-5" />
                              Answer Quality Analysis
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            {finalReport.answerQualityAnalysis.overallAssessment && (
                              <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900">
                                <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Overall Assessment</h4>
                                <p className="text-sm text-blue-800 dark:text-blue-200 whitespace-pre-wrap">
                                  {finalReport.answerQualityAnalysis.overallAssessment}
                                </p>
                              </div>
                            )}
                            
                            {finalReport.answerQualityAnalysis.communicationStyle && (
                              <div className="p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-900">
                                <h4 className="font-semibold text-purple-900 dark:text-purple-100 mb-2">Communication Style</h4>
                                <p className="text-sm text-purple-800 dark:text-purple-200 whitespace-pre-wrap">
                                  {finalReport.answerQualityAnalysis.communicationStyle}
                                </p>
                              </div>
                            )}
                            
                            {(finalReport.answerQualityAnalysis.contentRelevance || finalReport.answerQualityAnalysis.contentRelevanceDepth) && (
                              <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-900">
                                <h4 className="font-semibold text-green-900 dark:text-green-100 mb-2">Content Relevance & Depth</h4>
                                <p className="text-sm text-green-800 dark:text-green-200 whitespace-pre-wrap">
                                  {finalReport.answerQualityAnalysis.contentRelevance || finalReport.answerQualityAnalysis.contentRelevanceDepth}
                                </p>
                              </div>
                            )}
                            
                            {finalReport.answerQualityAnalysis.examples && finalReport.answerQualityAnalysis.examples.length > 0 && (
                              <div className="space-y-3">
                                <h4 className="font-semibold">Key Examples</h4>
                                {finalReport.answerQualityAnalysis.examples.map((example: any, index: number) => (
                                  <div key={index} className="p-3 border rounded-lg">
                                    <p className="font-medium text-sm mb-2">{example.question}</p>
                                    {example.strength && (
                                      <div className="mb-2">
                                        <span className="text-xs font-semibold text-green-700">✓ Strength: </span>
                                        <span className="text-xs text-green-800">{example.strength}</span>
                                      </div>
                                    )}
                                    {example.improvement && (
                                      <div>
                                        <span className="text-xs font-semibold text-yellow-700">⚠ Improvement: </span>
                                        <span className="text-xs text-yellow-800">{example.improvement}</span>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      )}

                      {/* What to Avoid */}
                      {finalReport.whatToAvoid && finalReport.whatToAvoid.length > 0 && (
                        <Card className="shadow-soft border-red-200">
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-red-700">
                              <AlertTriangle className="w-5 h-5" />
                              What to Avoid
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-4">
                              {finalReport.whatToAvoid.map((item: any, index: number) => (
                                <div key={index} className="p-4 border border-red-200 rounded-lg bg-red-50/50">
                                  <div className="flex items-start gap-3">
                                    <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                                    <div className="flex-1">
                                      <h4 className="font-semibold text-red-900 mb-2">{item.issue}</h4>
                                      {item.example && (
                                        <div className="mb-2">
                                          <span className="text-xs font-medium text-red-800">Example: </span>
                                          <span className="text-xs text-red-700">{item.example}</span>
                                        </div>
                                      )}
                                      {item.alternative && (
                                        <div className="p-2 bg-white rounded border border-green-200">
                                          <span className="text-xs font-medium text-green-800">✓ Do this instead: </span>
                                          <span className="text-xs text-green-700">{item.alternative}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* Key Takeaways */}
                      {finalReport.keyTakeaways && finalReport.keyTakeaways.length > 0 && (
                        <Card className="shadow-soft">
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <Lightbulb className="w-5 h-5 text-yellow-600" />
                              Key Takeaways
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <ul className="space-y-2">
                              {finalReport.keyTakeaways.map((takeaway: string, index: number) => (
                                <li key={index} className="flex items-start gap-2 text-sm">
                                  <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                  <span>{takeaway}</span>
                                </li>
                              ))}
                            </ul>
                          </CardContent>
                        </Card>
                      )}

                      {/* Gesture Analysis - Detailed */}
                      {(() => {
                        // Try multiple paths to find gesture data
                        // Check all possible locations where gesture data might be stored
                        let gestureData = hrData?.gestureAnalysis || 
                                          finalReport?.gestureAnalysis || 
                                          hrData?.rawFeedback?.gestureAnalysis ||
                                          sessionReport.feedback?.gestureAnalysis ||
                                          sessionReport.metadata?.gestureAnalysis ||
                                          (sessionReport as any)?.feedback?.gestureAnalysis ||
                                          (sessionReport as any)?.metadata?.gestureAnalysis ||
                                          (hrData?.finalReport as any)?.gestureAnalysis;
                        
                        // Deep search for gesture data
                        const allPossiblePaths: any = {
                          'hrData?.gestureAnalysis': hrData?.gestureAnalysis,
                          'finalReport?.gestureAnalysis': finalReport?.gestureAnalysis,
                          'hrData?.rawFeedback?.gestureAnalysis': hrData?.rawFeedback?.gestureAnalysis,
                          'sessionReport.feedback?.gestureAnalysis': sessionReport.feedback?.gestureAnalysis,
                          'sessionReport.metadata?.gestureAnalysis': sessionReport.metadata?.gestureAnalysis,
                          'sessionReport.modules?.hr?.gestureAnalysis': (sessionReport as any)?.modules?.hr?.gestureAnalysis,
                        };
                        
                        // Also search in components if they exist
                        if (sessionReport.components && Array.isArray(sessionReport.components)) {
                          sessionReport.components.forEach((comp: any, idx: number) => {
                            if (comp.feedback?.gestureAnalysis) {
                              allPossiblePaths[`sessionReport.components[${idx}].feedback.gestureAnalysis`] = comp.feedback.gestureAnalysis;
                              if (!gestureData) gestureData = comp.feedback.gestureAnalysis;
                            }
                            if (comp.data?.gestureAnalysis) {
                              allPossiblePaths[`sessionReport.components[${idx}].data.gestureAnalysis`] = comp.data.gestureAnalysis;
                              if (!gestureData) gestureData = comp.data.gestureAnalysis;
                            }
                          });
                        }
                        
                        // Check raw response
                        const rawResponse = (window as any).__lastSessionResponse;
                        if (rawResponse) {
                          allPossiblePaths['rawResponse.feedback?.gestureAnalysis'] = rawResponse.feedback?.gestureAnalysis;
                          allPossiblePaths['rawResponse.metadata?.gestureAnalysis'] = rawResponse.metadata?.gestureAnalysis;
                          if (!gestureData) {
                            gestureData = rawResponse.feedback?.gestureAnalysis || rawResponse.metadata?.gestureAnalysis;
                          }
                        }
                        
                        console.log('🔍 Gesture data lookup (all paths):', allPossiblePaths);
                        console.log('Full sessionReport keys:', Object.keys(sessionReport));
                        console.log('hrData structure:', hrData);
                        console.log('finalReport structure:', finalReport);
                        console.log('Selected gestureData:', gestureData);
                        
                        // If no processed gesture data, try to use raw data from metadata and process it client-side
                        if (!gestureData) {
                          const rawGestureData = sessionReport.metadata?.gestureAnalysis || 
                                                 (window as any).__lastSessionResponse?.metadata?.gestureAnalysis;
                          
                          if (rawGestureData && (rawGestureData.eyeContact || rawGestureData.expressions || rawGestureData.handMovements || rawGestureData.headPose)) {
                            console.log('📦 Found raw gesture data, processing client-side...', rawGestureData);
                            // Process raw data into displayable format
                            gestureData = {
                              eyeContact: {
                                percentage: rawGestureData.eyeContact?.percentage || 0,
                                rating: rawGestureData.eyeContact?.percentage >= 70 ? 'Excellent' : 
                                        rawGestureData.eyeContact?.percentage >= 50 ? 'Good' : 
                                        rawGestureData.eyeContact?.percentage >= 30 ? 'Fair' : 'Needs Improvement',
                                feedback: rawGestureData.eyeContact?.percentage >= 70 ? 
                                          'Excellent eye contact maintained throughout the interview.' :
                                          rawGestureData.eyeContact?.percentage >= 50 ?
                                          'Good eye contact overall. Consider maintaining more consistent eye contact.' :
                                          'Eye contact could be improved. Try to look at the camera more frequently.'
                              },
                              expressions: {
                                summary: rawGestureData.expressions || {},
                                dominant: Object.keys(rawGestureData.expressions || {}).reduce((a, b) => 
                                  (rawGestureData.expressions[a] || 0) > (rawGestureData.expressions[b] || 0) ? a : b, 'neutral') || 'neutral',
                                feedback: 'Expression analysis based on detected facial expressions during the interview.'
                              },
                              handMovements: {
                                summary: {
                                  breakdown: rawGestureData.handMovements || {},
                                  totalGestures: Object.values(rawGestureData.handMovements || {}).reduce((a: number, b: number) => a + b, 0)
                                },
                                feedback: 'Hand movement analysis based on detected gestures during the interview.'
                              },
                              headPose: {
                                summary: {
                                  breakdown: rawGestureData.headPose || {},
                                  totalChanges: Object.values(rawGestureData.headPose || {}).reduce((a: number, b: number) => a + b, 0)
                                },
                                feedback: 'Head posture analysis based on detected head movements during the interview.'
                              }
                            };
                            console.log('✅ Processed raw gesture data:', gestureData);
                          }
                        }
                        
                        if (!gestureData) {
                          console.warn('⚠️ No gesture data found in any location');
                          console.log('Full sessionReport structure:', JSON.stringify(sessionReport, null, 2));
                          return (
                            <Card className="shadow-soft border-yellow-300">
                              <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-yellow-700">
                                  <Eye className="w-5 h-5" />
                                  Gesture & Body Language Analysis
                                </CardTitle>
                              </CardHeader>
                              <CardContent>
                                <p className="text-sm text-muted-foreground">
                                  Gesture analysis data is not available for this session. This may occur if:
                                </p>
                                <ul className="list-disc list-inside mt-2 text-sm text-muted-foreground space-y-1">
                                  <li>Gesture tracking was not enabled during the interview</li>
                                  <li>The session was completed before gesture data was collected</li>
                                  <li>There was an error storing the gesture data</li>
                                </ul>
                                <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
                                  <p className="text-xs font-mono text-yellow-800">
                                    Debug: Check console for detailed lookup paths
                                  </p>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        }
                        
                        console.log('✅ Gesture data found! Structure:', {
                          'eyeContact': gestureData.eyeContact,
                          'expressions': gestureData.expressions,
                          'handMovements': gestureData.handMovements,
                          'headPose': gestureData.headPose,
                          'fullData': gestureData
                        });
                        
                        return (
                          <Card className="shadow-soft">
                            <CardHeader>
                              <CardTitle className="flex items-center gap-2">
                                <Eye className="w-5 h-5" />
                                Detailed Gesture & Body Language Analysis
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                              {/* Eye Contact - Detailed */}
                              {gestureData.eyeContact && (
                                <div className="p-4 border rounded-lg space-y-3">
                                  <div className="flex items-center justify-between">
                                    <span className="font-semibold text-lg">Eye Contact</span>
                                    <Badge variant={gestureData.eyeContact.percentage >= 70 ? 'default' : gestureData.eyeContact.percentage >= 50 ? 'secondary' : 'destructive'} className="text-base px-3 py-1">
                                      {Number(gestureData.eyeContact.percentage || 0).toFixed(1)}%
                                    </Badge>
                                  </div>
                                  <Progress value={Number(gestureData.eyeContact.percentage || 0)} className="h-3" />
                                  <div className="space-y-2">
                                    {gestureData.eyeContact.rating && (
                                      <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium">Rating:</span>
                                        <Badge variant="outline">{gestureData.eyeContact.rating}</Badge>
                                      </div>
                                    )}
                                    {gestureData.eyeContact.feedback && (
                                      <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900">
                                        <p className="text-sm text-blue-800 dark:text-blue-200">{gestureData.eyeContact.feedback}</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Expressions - Detailed */}
                              {gestureData.expressions && (
                                <div className="p-4 border rounded-lg space-y-3">
                                  <div className="flex items-center justify-between">
                                    <span className="font-semibold text-lg">Facial Expressions</span>
                                    <Badge variant="outline" className="capitalize text-base px-3 py-1">
                                      {gestureData.expressions.dominant || 'Neutral'}
                                    </Badge>
                                  </div>
                                  
                                  {(gestureData.expressions.summary || (typeof gestureData.expressions.summary === 'object' && Object.keys(gestureData.expressions.summary).length > 0)) ? (
                                    <div className="space-y-2">
                                      <h5 className="text-sm font-medium text-muted-foreground">Time Distribution:</h5>
                                      {Object.entries(gestureData.expressions.summary).map(([expr, percentage]: [string, any]) => (
                                        <div key={expr} className="flex items-center justify-between p-2 bg-muted rounded">
                                          <div className="flex items-center gap-2">
                                            <span className="text-sm font-medium capitalize">{expr}:</span>
                                          </div>
                                          <div className="flex items-center gap-3">
                                            <Progress value={Number(percentage)} className="w-24 h-2" />
                                            <span className="text-sm font-medium w-16 text-right">{Number(percentage)}%</span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  ) : gestureData.expressions.counts ? (
                                    // Fallback: Show raw counts if summary not available
                                    <div className="space-y-2">
                                      <h5 className="text-sm font-medium text-muted-foreground">Expression Counts:</h5>
                                      {Object.entries(gestureData.expressions.counts).map(([expr, count]: [string, any]) => (
                                        <div key={expr} className="flex items-center justify-between p-2 bg-muted rounded">
                                          <span className="text-sm font-medium capitalize">{expr}:</span>
                                          <Badge variant="outline">{Number(count)} times</Badge>
                                        </div>
                                      ))}
                                    </div>
                                  ) : null}
                                  
                                  {gestureData.expressions.feedback && (
                                    <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900">
                                      <p className="text-sm text-blue-800 dark:text-blue-200">{gestureData.expressions.feedback}</p>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Hand Movements - Detailed */}
                              {gestureData.handMovements && (
                                <div className="p-4 border rounded-lg space-y-3">
                                  <span className="font-semibold text-lg block">Hand Movements & Gestures</span>
                                  
                                  {(() => {
                                    // Get hand movement data from various possible structures
                                    const handData = gestureData.handMovements.summary?.breakdown || 
                                                    gestureData.handMovements.summary || 
                                                    gestureData.handMovements.gestures ||
                                                    gestureData.handMovements;
                                    
                                    // Filter out non-numeric values and get actual gesture counts
                                    const gestureCounts = Object.entries(handData || {})
                                      .filter(([_, count]) => typeof count === 'number' && count > 0)
                                      .sort(([_, a]: [string, any], [__, b]: [string, any]) => b - a);
                                    
                                    if (gestureCounts.length > 0) {
                                      const totalGestures = gestureCounts.reduce((sum, [_, count]: [string, any]) => sum + count, 0);
                                      
                                      return (
                                        <div className="space-y-2">
                                          <h5 className="text-sm font-medium text-muted-foreground">Detected Gestures:</h5>
                                          {gestureCounts.map(([gesture, count]: [string, any]) => (
                                            <div key={gesture} className="flex items-center justify-between p-2 bg-muted rounded">
                                              <span className="text-sm font-medium capitalize">{gesture.replace(/([A-Z])/g, ' $1').trim()}:</span>
                                              <Badge variant="outline">{Number(count)} {Number(count) === 1 ? 'time' : 'times'}</Badge>
                                            </div>
                                          ))}
                                          <div className="mt-2 pt-2 border-t">
                                            <div className="flex items-center justify-between">
                                              <span className="text-sm font-medium">Total Gesture Detections:</span>
                                              <span className="text-sm font-bold">{totalGestures}</span>
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    } else {
                                      return (
                                        <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-900">
                                          <p className="text-sm text-yellow-800 dark:text-yellow-200">
                                            No hand gestures detected during the interview. This may indicate hands were not visible or kept still.
                                          </p>
                                        </div>
                                      );
                                    }
                                  })()}
                                  
                                  {gestureData.handMovements.feedback && (
                                    <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900">
                                      <p className="text-sm text-blue-800 dark:text-blue-200">{gestureData.handMovements.feedback}</p>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Head Pose - Detailed */}
                              {gestureData.headPose && (
                                <div className="p-4 border rounded-lg space-y-3">
                                  <span className="font-semibold text-lg block">Head Posture & Movement</span>
                                  
                                  {(() => {
                                    // Get head pose data from various possible structures
                                    const poseData = gestureData.headPose.summary?.breakdown || 
                                                    gestureData.headPose.summary || 
                                                    gestureData.headPose.counts ||
                                                    gestureData.headPose;
                                    
                                    // Filter out non-numeric values and get actual pose counts
                                    const poseCounts = Object.entries(poseData || {})
                                      .filter(([_, count]) => typeof count === 'number' && count > 0)
                                      .sort(([_, a]: [string, any], [__, b]: [string, any]) => b - a);
                                    
                                    if (poseCounts.length > 0) {
                                      const totalPoses = poseCounts.reduce((sum, [_, count]: [string, any]) => sum + count, 0);
                                      
                                      return (
                                        <div className="space-y-2">
                                          <h5 className="text-sm font-medium text-muted-foreground">Head Position Changes:</h5>
                                          {poseCounts.map(([pose, count]: [string, any]) => (
                                            <div key={pose} className="flex items-center justify-between p-2 bg-muted rounded">
                                              <span className="text-sm font-medium capitalize">{pose === 'forward' ? 'Looking Forward' : pose === 'left' ? 'Turned Left' : pose === 'right' ? 'Turned Right' : pose === 'up' ? 'Looking Up' : pose === 'down' ? 'Looking Down' : pose}:</span>
                                              <Badge variant="outline">{Number(count)} {Number(count) === 1 ? 'time' : 'times'}</Badge>
                                            </div>
                                          ))}
                                          <div className="mt-2 pt-2 border-t">
                                            <div className="flex items-center justify-between">
                                              <span className="text-sm font-medium">Total Head Movements:</span>
                                              <span className="text-sm font-bold">{totalPoses}</span>
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    } else {
                                      return (
                                        <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-900">
                                          <p className="text-sm text-yellow-800 dark:text-yellow-200">
                                            No significant head movements detected. This may indicate a very stable head position during the interview.
                                          </p>
                                        </div>
                                      );
                                    }
                                  })()}
                                  
                                  {gestureData.headPose.feedback && (
                                    <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900">
                                      <p className="text-sm text-blue-800 dark:text-blue-200">{gestureData.headPose.feedback}</p>
                                    </div>
                                  )}
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })()}

                      {/* Detailed Recommendations */}
                      {finalReport.recommendations && finalReport.recommendations.length > 0 && (
                        <Card className="shadow-soft">
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <Lightbulb className="w-5 h-5 text-yellow-600" />
                              Detailed Recommendations
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-4">
                              {finalReport.recommendations.map((rec: any, index: number) => (
                                <div key={index} className="p-4 border rounded-lg bg-gradient-to-br from-yellow-50 to-white">
                                  <div className="flex items-start justify-between mb-2">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-2">
                                        <Badge 
                                          variant={rec.priority === 'high' ? 'destructive' : rec.priority === 'medium' ? 'default' : 'secondary'}
                                          className="text-xs"
                                        >
                                          {rec.priority || 'medium'} priority
                                        </Badge>
                                        {rec.category && (
                                          <Badge variant="outline" className="text-xs">
                                            {rec.category}
                                          </Badge>
                                        )}
                                      </div>
                                      <h4 className="font-semibold text-sm mb-1">
                                        {rec.recommendation || rec.suggestion || `Recommendation ${index + 1}`}
                                      </h4>
                                      {rec.reason && (
                                        <p className="text-xs text-muted-foreground mt-1">
                                          {rec.reason}
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
                    </>
                  );
                })()}
              </TabsContent>
            )}

            {/* HR-Only Session Display */}
            {sessionReport.hr && !sessionReport.modules && (
              <TabsContent value="overview" className="space-y-6">
                <Card className="shadow-soft">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MessageSquare className="w-5 h-5" />
                      HR Interview Overview
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-4">
                      This is an HR-only interview session. View detailed analysis in the HR Interview tab.
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            {/* Resume-Only Session Display */}
            {sessionReport.isResumeAnalysis && !sessionReport.modules && (
              <TabsContent value="overview" className="space-y-6">
                <Card className="shadow-soft">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      Resume Analysis Overview
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-4">
                      This is a resume analysis session. View detailed analysis in the Resume tab.
                    </p>
                    {sessionReport.resume?.jobDescription && (
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-sm font-medium mb-1">Job Description:</p>
                        <p className="text-sm text-muted-foreground">{sessionReport.resume.jobDescription.substring(0, 200)}...</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
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
