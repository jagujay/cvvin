import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  FileText, 
  Code2, 
  MessageSquare, 
  BarChart3,
  Clock,
  Calendar,
  TrendingUp,
  ArrowRight,
  Filter,
  Loader2
} from "lucide-react";
import Layout from "@/components/layout/Layout";
import feedbackData from "@/mock/feedback.json";
import userData from "@/mock/user.json";
import { useAuth } from "@/contexts/AuthContext";
import { consolidatedAPI } from "@/services/consolidatedAPI";
import { useToast } from "@/hooks/use-toast";

const FeedbackList = () => {
  const location = useLocation();
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const demoUserType = location.state?.demoUserType || 'returning';
  const user = demoUserType === 'new' ? userData.user : userData.completedProfile;
  
  const [sessions, setSessions] = useState<any[]>([]);
  const [statistics, setStatistics] = useState({
    totalSessions: 0,
    averageScore: 0,
    bestScore: 0,
    totalTime: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSessions = async () => {
      if (!currentUser) {
        // Fallback to mock data if no user
        if (demoUserType === 'new') {
          setSessions([]);
        } else {
          setSessions(feedbackData.recentActivity);
          // Calculate mock statistics
          const mockSessions = feedbackData.recentActivity;
          setStatistics({
            totalSessions: mockSessions.length,
            averageScore: Math.round(mockSessions.reduce((acc, s) => acc + s.score, 0) / mockSessions.length),
            bestScore: Math.max(...mockSessions.map(s => s.score)),
            totalTime: mockSessions.reduce((acc, s) => acc + s.duration, 0)
          });
        }
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const result = await consolidatedAPI.getAllSessions(currentUser);
        
        console.log('Sessions API result:', result);
        
        // Handle both direct response and wrapped response
        const sessionsData = result.sessions || result.data?.sessions || [];
        const statsData = result.statistics || result.data?.statistics || {
          totalSessions: 0,
          averageScore: 0,
          bestScore: 0,
          totalTime: 0
        };
        
        if (result.success !== false) {
          setSessions(sessionsData);
          setStatistics(statsData);
          
          if (sessionsData.length === 0) {
            console.log('No sessions found for user');
          }
        } else {
          throw new Error(result.error || 'Failed to fetch sessions');
        }
      } catch (err: any) {
        console.error('Failed to fetch sessions:', err);
        setError(err.message || 'Failed to load sessions');
        // Fallback to mock data on error
        if (demoUserType !== 'new') {
          setSessions(feedbackData.recentActivity);
          const mockSessions = feedbackData.recentActivity;
          setStatistics({
            totalSessions: mockSessions.length,
            averageScore: Math.round(mockSessions.reduce((acc, s) => acc + s.score, 0) / mockSessions.length),
            bestScore: Math.max(...mockSessions.map(s => s.score)),
            totalTime: mockSessions.reduce((acc, s) => acc + s.duration, 0)
          });
        } else {
          // For new users, set empty arrays
          setSessions([]);
          setStatistics({
            totalSessions: 0,
            averageScore: 0,
            bestScore: 0,
            totalTime: 0
          });
        }
        toast({
          title: "Failed to Load Sessions",
          description: err.message || "Using cached data. Some information may be outdated.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchSessions();
  }, [currentUser, demoUserType, toast]);

  const hasActivity = sessions.length > 0;

  const getIconForType = (type: string) => {
    const lowerType = type.toLowerCase();
    if (lowerType.includes("technical")) {
      return Code2;
    } else if (lowerType.includes("hr") || lowerType.includes("human resources")) {
      return MessageSquare;
    } else if (lowerType.includes("resume")) {
      return FileText;
    } else if (lowerType.includes("full mock") || lowerType.includes("full_mock")) {
      return BarChart3;
    }
    return BarChart3;
  };

  const getColorForScore = (score: number) => {
    if (score >= 90) return "text-green-600";
    if (score >= 75) return "text-blue-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatDate = (dateString: string | Date | undefined) => {
    if (!dateString) return 'Date not available';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid Date';
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Invalid Date';
    }
  };

  if (loading) {
    return (
      <Layout isAuthenticated={true} user={{ fullName: user.fullName, profilePicture: user.profilePicture }}>
        <div className="container mx-auto px-6 py-8">
          <div className="max-w-4xl mx-auto text-center">
            <Card className="shadow-soft">
              <CardContent className="p-8">
                <Loader2 className="w-16 h-16 text-primary mx-auto mb-4 animate-spin" />
                <h1 className="text-2xl font-bold mb-4">Loading Sessions...</h1>
                <p className="text-muted-foreground">
                  Please wait while we fetch your interview sessions.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </Layout>
    );
  }

  // Show error state if there's an error and no sessions
  if (error && sessions.length === 0 && !loading) {
    return (
      <Layout isAuthenticated={true} user={{ fullName: user.fullName, profilePicture: user.profilePicture }}>
        <div className="container mx-auto px-6 py-8">
          <div className="max-w-4xl mx-auto">
            <Card className="shadow-soft border-destructive">
              <CardContent className="p-8 text-center">
                <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
                <h1 className="text-2xl font-bold mb-4">Error Loading Sessions</h1>
                <p className="text-muted-foreground mb-6">{error}</p>
                <Button onClick={() => window.location.reload()}>
                  Retry
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </Layout>
    );
  }

  if (!hasActivity) {
    return (
      <Layout isAuthenticated={true} user={{ fullName: user.fullName, profilePicture: user.profilePicture }}>
        <div className="container mx-auto px-6 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h1 className="text-3xl font-bold mb-2">Feedback & Reports</h1>
                <p className="text-muted-foreground">
                  Track your interview performance and improvement over time
                </p>
              </div>
            </div>

            {/* Empty State */}
            <Card className="shadow-soft text-center">
              <CardContent className="p-12">
                <div className="w-20 h-20 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center mx-auto mb-6">
                  <BarChart3 className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-2xl font-semibold mb-3">No Data for In-Depth Analysis</h2>
                <p className="text-muted-foreground mb-8 max-w-lg mx-auto text-lg">
                  Take your first interview session to start receiving detailed feedback and performance insights.
                </p>
                <div className="grid md:grid-cols-2 gap-4 max-w-md mx-auto">
                  <Button asChild size="lg" className="gradient-primary">
                    <Link to="/interview/full-mock">
                      Take Full Mock Interview
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="lg">
                    <Link to="/technical-interview">
                      Start Practice Session
                    </Link>
                  </Button>
                </div>
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
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold mb-2">Feedback & Reports</h1>
              <p className="text-muted-foreground">
                Review your interview performance and track improvement
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Filter className="w-4 h-4 mr-2" />
                Filter
              </Button>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card className="shadow-soft">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Sessions</p>
                    <p className="text-2xl font-bold">{statistics.totalSessions}</p>
                  </div>
                  <BarChart3 className="w-8 h-8 text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-soft">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Average Score</p>
                    <p className="text-2xl font-bold">
                      {statistics.averageScore}%
                    </p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-soft">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Best Score</p>
                    <p className="text-2xl font-bold">
                      {statistics.bestScore}%
                    </p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-soft">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Time</p>
                    <p className="text-2xl font-bold">
                      {formatDuration(statistics.totalTime)}
                    </p>
                  </div>
                  <Clock className="w-8 h-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sessions List */}
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle>Interview Sessions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {sessions.map((session) => {
                  const Icon = getIconForType(session.type);
                  const score = Number(session.score) || 0;
                  const duration = Number(session.duration) || 0;
                  
                  return (
                    <Card key={session.id} className="hover:shadow-medium transition-smooth">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                              <Icon className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-lg">{session.type}</h3>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {formatDate(session.date)}
                                </div>
                                <div className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {formatDuration(duration)}
                                </div>
                                {session.status && (
                                  <Badge variant={session.status === 'completed' ? 'default' : 'secondary'} className="text-xs">
                                    {session.status}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-4">
                            <div className="text-center">
                              <div className={`text-2xl font-bold ${getColorForScore(score)}`}>
                                {score}%
                              </div>
                              <Progress value={score} className="w-20 mt-1" />
                            </div>
                            
                            <Button asChild variant="outline">
                              <Link to={`/feedback/${session.id}`}>
                                View Details
                                <ArrowRight className="ml-2 w-4 h-4" />
                              </Link>
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Call to Action */}
          <Card className="shadow-soft gradient-accent mt-8">
            <CardContent className="p-8 text-center">
              <h2 className="text-2xl font-bold mb-4 text-accent-foreground">
                Ready for Your Next Challenge?
              </h2>
              <p className="text-accent-foreground/80 mb-6 max-w-2xl mx-auto">
                Keep improving your interview skills with more practice sessions. 
                Each session provides valuable insights to help you succeed.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button asChild size="lg" className="gradient-primary">
                  <Link to="/interview/full-mock">
                    Start Full Mock Interview
                    <ArrowRight className="ml-2 w-4 h-4" />
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

export default FeedbackList;
