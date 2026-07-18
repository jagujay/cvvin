import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  Code2, 
  MessageSquare, 
  BarChart3, 
  TrendingUp,
  Clock,
  Target,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  Loader2
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { consolidatedAPI } from "@/services/consolidatedAPI";
import Layout from "@/components/layout/Layout";
import Walkthrough from "@/components/ui/walkthrough";
import { useWalkthrough, WalkthroughStep } from "@/hooks/use-walkthrough";
import { useToast } from "@/hooks/use-toast";

const Dashboard = () => {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [profileCompletion, setProfileCompletion] = useState<{
    isComplete: boolean;
    percentage: number;
    missingFields: string[];
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [statistics, setStatistics] = useState({
    totalSessions: 0,
    averageScore: 0,
    bestScore: 0,
    totalTime: 0
  });
  const [statsLoading, setStatsLoading] = useState(true);
  const [sessions, setSessions] = useState<any[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  
  const hasActivity = sessions.length > 0;
  
  // Load profile completion status
  useEffect(() => {
    const loadProfileStatus = async () => {
      if (!currentUser) {
        setIsLoading(false);
        return;
      }

      try {
        const completion = await consolidatedAPI.getProfileCompletionStatus(currentUser);
        setProfileCompletion(completion);
      } catch (error) {
        console.error('Failed to load profile completion status:', error);
        // Set default values if API fails
        setProfileCompletion({
          isComplete: false,
          percentage: 0,
          missingFields: ['profile', 'resume', 'skills']
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadProfileStatus();
  }, [currentUser]);

  // Load feedback statistics and sessions
  useEffect(() => {
    const loadStatisticsAndSessions = async () => {
      if (!currentUser) {
        setStatsLoading(false);
        setSessionsLoading(false);
        return;
      }

      try {
        setStatsLoading(true);
        setSessionsLoading(true);
        const result = await consolidatedAPI.getAllSessions(currentUser);
        
        // Handle both direct response and wrapped response
        const statsData = result.statistics || result.data?.statistics || {
          totalSessions: 0,
          averageScore: 0,
          bestScore: 0,
          totalTime: 0
        };
        
        const sessionsData = result.sessions || result.data?.sessions || [];
        
        if (result.success !== false) {
          setStatistics(statsData);
          setSessions(sessionsData);
        }
      } catch (error) {
        console.error('Failed to load statistics and sessions:', error);
        // Keep default values on error
      } finally {
        setStatsLoading(false);
        setSessionsLoading(false);
      }
    };

    loadStatisticsAndSessions();
  }, [currentUser]);
  
  // User data with real profile completion status
  const user = {
    fullName: currentUser?.displayName || "User",
    isProfileComplete: profileCompletion?.isComplete || false
  };

  // Walkthrough steps for new users - simplified
  const walkthroughSteps: WalkthroughStep[] = [
    {
      id: 'welcome',
      title: 'Welcome to CVVIN! 👋',
      description: 'Your AI-powered interview preparation platform. We\'ll help you ace your next interview with personalized practice.',
      position: 'center'
    },
    {
      id: 'quick-actions',
      title: 'Practice Modules',
      description: 'Start with any practice session - Resume Analysis, Technical Questions, or HR Interview practice.',
      target: '[data-walkthrough="quick-actions"]',
      position: 'bottom'
    },
    {
      id: 'welcome-section',
      title: 'Get Started!',
      description: 'Choose any option below to begin your interview preparation journey. Good luck! 🚀',
      target: '[data-walkthrough="welcome-section"]',
      position: 'center'
    }
  ];

  // Temporarily disable walkthrough until positioning is fixed
  const isWalkthroughOpen = false;
  const completeWalkthrough = () => {};
  const skipWalkthrough = () => {};
  const startWalkthrough = () => {};


  const quickActions = [
    {
      title: "Resume Analysis",
      description: "Analyze your resume against job descriptions",
      icon: FileText,
      path: "/resume-analysis",
      gradient: "from-blue-500 to-cyan-500"
    },
    {
      title: "Technical Interview",
      description: "Practice MCQs and coding challenges",
      icon: Code2,
      path: "/technical-interview",
      gradient: "from-purple-500 to-pink-500"
    },
    {
      title: "HR Interview",
      description: "Interactive behavioral interview practice",
      icon: MessageSquare,
      path: "/hr-interview",
      gradient: "from-green-500 to-emerald-500"
    },
    {
      title: "View Feedback",
      description: "Review your performance history",
      icon: BarChart3,
      path: "/feedback",
      gradient: "from-orange-500 to-red-500"
    }
  ];

  // Format duration helper
  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes < 60) return `${minutes}m ${remainingSeconds}s`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  const statsDisplay = [
    {
      label: "Total Sessions",
      value: statistics.totalSessions.toString(),
      icon: BarChart3,
      color: "text-primary"
    },
    {
      label: "Average Score",
      value: `${statistics.averageScore}%`,
      icon: TrendingUp,
      color: "text-green-600"
    },
    {
      label: "Best Score",
      value: `${statistics.bestScore}%`,
      icon: Target,
      color: "text-blue-600"
    },
    {
      label: "Total Time",
      value: formatDuration(statistics.totalTime),
      icon: Clock,
      color: "text-purple-600"
    }
  ];

  return (
    <Layout>
      <div className="container mx-auto px-6 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Welcome Section */}
          <div className="mb-8 flex justify-between items-start">
            <div>
            <h1 className="text-3xl font-bold mb-2">
              Welcome back, {user.fullName.split(" ")[0]}!
            </h1>
              <p className="text-muted-foreground">
                Ready to ace your next interview? Let's continue your preparation journey.
              </p>
            </div>
          </div>

          {/* Profile Completion Banner */}
          {!user.isProfileComplete && !isLoading && (
            <Card className="mb-8 border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950" data-walkthrough="profile-banner">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-orange-600" />
                  <div className="flex-1">
                    <p className="font-medium">
                      Complete your profile ({profileCompletion?.percentage || 0}%) to unlock personalized features
                    </p>
                    <p className="text-sm text-muted-foreground mb-2">
                      Missing: {profileCompletion?.missingFields?.join(', ') || 'profile information'}
                    </p>
                    {profileCompletion && (
                      <Progress value={profileCompletion.percentage} className="w-full max-w-xs" />
                    )}
                  </div>
                  <Button asChild variant="outline" size="sm">
                    <Link to="/profile-setup">Complete Profile</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Loading state for profile completion */}
          {isLoading && (
            <Card className="mb-8">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <p className="text-muted-foreground">Loading profile status...</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Statistics Cards - Show if we have statistics or if loading */}
          {(statistics.totalSessions > 0 || statsLoading) && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              {statsDisplay.map((stat, index) => (
                <Card key={index} className="shadow-soft">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                        {statsLoading ? (
                          <div className="flex items-center gap-2 mt-2">
                            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                            <p className="text-2xl font-bold text-muted-foreground">...</p>
                          </div>
                        ) : (
                        <p className="text-2xl font-bold">{stat.value}</p>
                        )}
                      </div>
                      <stat.icon className={`w-8 h-8 ${stat.color}`} />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Quick Actions */}
          <Card className="mb-8 shadow-soft" data-walkthrough="quick-actions">
            <CardHeader>
              <CardTitle className="text-xl">Quick Actions</CardTitle>
              <p className="text-muted-foreground">
                Choose your practice mode or start a comprehensive mock interview
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {quickActions.map((action, index) => (
                  <Card 
                    key={index} 
                    className="group hover:shadow-medium transition-smooth cursor-pointer"
                    data-walkthrough={action.title === "Resume Analysis" ? "resume-action" : undefined}
                  >
                    <Link 
                      to={action.path}
                    >
                      <CardContent className="p-6 text-center">
                        <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br ${action.gradient} flex items-center justify-center group-hover:scale-110 transition-smooth`}>
                          <action.icon className="w-8 h-8 text-white" />
                        </div>
                        <h3 className="font-semibold mb-2">{action.title}</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {action.description}
                        </p>
                      </CardContent>
                    </Link>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          {(hasActivity || sessionsLoading) && (
            <Card className="shadow-soft">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Recent Activity</CardTitle>
                  <Button asChild variant="ghost" size="sm">
                    <Link to="/feedback">View All</Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {sessionsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    <p className="ml-3 text-muted-foreground">Loading recent activity...</p>
                  </div>
                ) : (
                <div className="space-y-4">
                    {(() => {
                      // Get only the last (most recent) occurrence of each unique module type
                      const uniqueSessions: typeof sessions = [];
                      const seenTypes = new Set<string>();
                      
                      for (const session of sessions) {
                        // Skip Full Mock Interview
                        if (session.type === "Full Mock Interview") continue;
                        
                        // Only add if we haven't seen this type before
                        if (!seenTypes.has(session.type)) {
                          uniqueSessions.push(session);
                          seenTypes.add(session.type);
                        }
                        
                        // Stop after collecting 3 unique sessions
                        if (uniqueSessions.length >= 3) break;
                      }
                      
                      return uniqueSessions.map((session) => (
                    <div key={session.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                          {session.type.includes("Technical") && (
                            <Code2 className="w-5 h-5 text-primary" />
                          )}
                          {session.type === "Resume Analysis" && (
                            <FileText className="w-5 h-5 text-primary" />
                          )}
                          {session.type === "HR Interview" && (
                            <MessageSquare className="w-5 h-5 text-primary" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{session.type}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(session.date).toLocaleDateString()} • Score: {session.score}%
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Progress value={session.score} className="w-20" />
                        <Button asChild variant="ghost" size="sm">
                          <Link to={`/feedback/${session.id}`}>
                            View Details
                          </Link>
                        </Button>
                      </div>
                    </div>
                      ));
                    })()}
                </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Simple Welcome for New Users */}
          {!hasActivity && (
            <div className="text-center py-12" data-walkthrough="welcome-section">
              <div className="max-w-2xl mx-auto">
                <div className="mb-8">
                  <div className="w-20 h-20 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Target className="w-10 h-10 text-white" />
                  </div>
                  <h2 className="text-3xl font-bold mb-4">Ready to Ace Your Interview?</h2>
                  <p className="text-lg text-muted-foreground mb-8">
                    Start with any practice session below, or jump straight into a full mock interview experience.
                  </p>
                </div>

                {/* Simple Action Grid */}
                <div className="grid md:grid-cols-3 gap-6 mb-8">
                  <Card className="p-6 hover:shadow-md transition-shadow cursor-pointer group">
                    <Link to="/resume-analysis" className="block">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                        <FileText className="w-6 h-6 text-blue-600" />
                      </div>
                      <h3 className="font-semibold mb-2">Resume Analysis</h3>
                      <p className="text-sm text-muted-foreground">
                        Get instant feedback on your resume
                      </p>
                    </Link>
                  </Card>

                  <Card className="p-6 hover:shadow-md transition-shadow cursor-pointer group">
                    <Link to="/technical-interview" className="block">
                      <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                        <Code2 className="w-6 h-6 text-purple-600" />
                      </div>
                      <h3 className="font-semibold mb-2">Technical Practice</h3>
                      <p className="text-sm text-muted-foreground">
                        Practice coding and MCQ questions
                      </p>
                    </Link>
                  </Card>

                  <Card className="p-6 hover:shadow-md transition-shadow cursor-pointer group">
                    <Link to="/hr-interview" className="block">
                      <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                        <MessageSquare className="w-6 h-6 text-green-600" />
                      </div>
                      <h3 className="font-semibold mb-2">HR Practice</h3>
                      <p className="text-sm text-muted-foreground">
                        Practice behavioral questions
                      </p>
                    </Link>
                  </Card>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Walkthrough temporarily disabled */}
    </Layout>
  );
};

export default Dashboard;
