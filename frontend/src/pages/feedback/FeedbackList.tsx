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
  Filter
} from "lucide-react";
import Layout from "@/components/layout/Layout";
import feedbackData from "@/mock/feedback.json";
import userData from "@/mock/user.json";

const FeedbackList = () => {
  const location = useLocation();
  const demoUserType = location.state?.demoUserType || 'returning';
  const user = demoUserType === 'new' ? userData.user : userData.completedProfile;
  // For new users, show empty state
  const sessions = demoUserType === 'new' ? [] : feedbackData.recentActivity;
  const hasActivity = demoUserType === 'returning' && sessions.length > 0;

  const getIconForType = (type: string) => {
    switch (type.toLowerCase()) {
      case "technical interview":
        return Code2;
      case "hr interview":
        return MessageSquare;
      case "resume analysis":
        return FileText;
      case "full mock interview":
        return BarChart3;
      default:
        return BarChart3;
    }
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

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
                    <p className="text-2xl font-bold">{sessions.length}</p>
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
                      {Math.round(sessions.reduce((acc, s) => acc + s.score, 0) / sessions.length)}%
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
                      {Math.max(...sessions.map(s => s.score))}%
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
                      {formatDuration(sessions.reduce((acc, s) => acc + s.duration, 0))}
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
                                  {formatDuration(session.duration)}
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-4">
                            <div className="text-center">
                              <div className={`text-2xl font-bold ${getColorForScore(session.score)}`}>
                                {session.score}%
                              </div>
                              <Progress value={session.score} className="w-20 mt-1" />
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
