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
  Play,
  TrendingUp,
  Clock,
  Target,
  AlertCircle,
  CheckCircle2,
  HelpCircle
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import Layout from "@/components/layout/Layout";
import sessionsData from "@/mock/sessions.json";
import Walkthrough from "@/components/ui/walkthrough";
import { useWalkthrough, WalkthroughStep } from "@/hooks/use-walkthrough";

const Dashboard = () => {
  const { currentUser } = useAuth();
  
  // For now, we'll use mock data. In a real implementation, this would come from Firestore
  const sessions = sessionsData.recentSessions;
  const stats = sessionsData.stats;
  const hasActivity = sessions.length > 0;
  
  // Mock user data - in real implementation, this would come from Firestore
  const user = {
    fullName: currentUser?.displayName || "User",
    isProfileComplete: false // This would come from Firestore
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
      id: 'full-mock',
      title: 'Full Mock Interview',
      description: 'Ready for the complete experience? Take a full mock interview that covers everything from resume analysis to detailed feedback.',
      target: '[data-walkthrough="full-mock-cta"]',
      position: 'top'
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

  const statsDisplay = stats ? [
    {
      label: "Average Score",
      value: `${stats.averageScore}%`,
      icon: TrendingUp,
      color: "text-green-600"
    },
    {
      label: "Total Sessions",
      value: stats.totalSessions.toString(),
      icon: Target,
      color: "text-blue-600"
    },
    {
      label: "Hours Practiced",
      value: stats.totalHoursPracticed.toString(),
      icon: Clock,
      color: "text-purple-600"
    },
    {
      label: "Improvement",
      value: `+${stats.improvementRate}%`,
      icon: TrendingUp,
      color: "text-green-600"
    }
  ] : [];

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
          {!user.isProfileComplete && (
            <Card className="mb-8 border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950" data-walkthrough="profile-banner">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-orange-600" />
                  <div className="flex-1">
                    <p className="font-medium">Complete your profile to unlock personalized features</p>
                    <p className="text-sm text-muted-foreground">
                      Add your skills, education, and resume for better interview recommendations
                    </p>
                  </div>
                  <Button asChild variant="outline" size="sm">
                    <Link to="/profile-setup">Complete Profile</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Statistics Cards (for users with activity) */}
          {hasActivity && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              {statsDisplay.map((stat, index) => (
                <Card key={index} className="shadow-soft">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                        <p className="text-2xl font-bold">{stat.value}</p>
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

          {/* End-to-End Mock Interview CTA (always visible, but disabled if no resume+JD) */}
          <Card className="mb-8 shadow-soft gradient-accent" data-walkthrough="full-mock-cta">
            <CardContent className="p-8">
              <div className="flex flex-col lg:flex-row items-center justify-between">
                <div className="text-center lg:text-left mb-6 lg:mb-0">
                  <h2 className="text-2xl font-bold mb-2 text-accent-foreground">
                    Ready for the Full Experience?
                  </h2>
                  <p className="text-accent-foreground/80 mb-4">
                    Take our comprehensive mock interview: Resume Analysis + Technical + HR + Detailed Feedback
                  </p>
                  <div className="flex items-center gap-4 justify-center lg:justify-start">
                    <Badge variant="secondary" className="text-xs">
                      45-60 minutes
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      Comprehensive Report
                    </Badge>
                  </div>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <Button asChild size="lg" className="gradient-primary shadow-medium">
                    <Link 
                      to="/interview/full-mock" 
                      className="flex items-center gap-2"
                    >
                      <Play className="w-5 h-5" />
                      Start Full Mock Interview
                    </Link>
                  </Button>
                  <p className="text-xs text-accent-foreground/60 text-center">
                    Includes resume analysis as first step
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          {hasActivity && (
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
                <div className="space-y-4">
                  {sessions.slice(0, 3).map((session) => (
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
                          {session.type === "Full Mock Interview" && (
                            <BarChart3 className="w-5 h-5 text-primary" />
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
                  ))}
                </div>
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

                {/* CTA for Full Mock */}
                <Card className="p-8 gradient-accent">
                  <div className="text-center">
                    <h3 className="text-xl font-semibold mb-3 text-accent-foreground">
                      Ready for the Complete Experience?
                    </h3>
                    <p className="text-accent-foreground/80 mb-6">
                      Take a full mock interview with resume analysis, technical round, HR round, and detailed feedback
                    </p>
                    <Button asChild size="lg" className="bg-white text-accent hover:bg-white/90 font-semibold">
                      <Link to="/interview/full-mock">
                        Start Full Mock Interview
                      </Link>
                    </Button>
                  </div>
                </Card>
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