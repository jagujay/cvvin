import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  MessageSquare, 
  Clock, 
  Target, 
  CheckCircle2, 
  ArrowLeft,
  Play,
  Mic,
  Brain,
  TrendingUp
} from "lucide-react";
import Layout from "@/components/layout/Layout";
import userData from "@/mock/user.json";

const HRLanding = () => {
  const navigate = useNavigate();
  const user = userData.user;

  const handleStartSession = () => {
    navigate("/interview/setup", { 
      state: { interviewType: "hr" } 
    });
  };

  return (
    <Layout 
      isAuthenticated={true} 
      user={{ fullName: user.fullName, profilePicture: user.profilePicture }}
    >
      <div className="container mx-auto px-6 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Button asChild variant="ghost" size="sm">
              <Link to="/dashboard">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold">HR Interview</h1>
              <p className="text-muted-foreground">
                Practice behavioral questions with AI-powered conversation analysis
              </p>
            </div>
          </div>

          {/* Hero Section */}
          <Card className="mb-8 shadow-soft gradient-accent">
            <CardContent className="p-8">
              <div className="text-center">
                <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                  <MessageSquare className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-2xl font-bold mb-4 text-accent-foreground">
                  Master Your Behavioral Interview Skills
                </h2>
                <p className="text-accent-foreground/80 mb-6 max-w-2xl mx-auto">
                  Engage in realistic HR conversations with our AI interviewer. Get instant feedback 
                  on your responses, communication style, and overall presentation.
                </p>
                <Button 
                  onClick={handleStartSession}
                  size="lg" 
                  className="gradient-primary shadow-medium"
                >
                  <Play className="w-5 h-5 mr-2" />
                  Start HR Session
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="shadow-soft text-center">
              <CardContent className="p-6">
                <Mic className="w-12 h-12 text-primary mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Voice Analysis</h3>
                <p className="text-sm text-muted-foreground">
                  AI analyzes your tone, pace, and clarity
                </p>
              </CardContent>
            </Card>
            <Card className="shadow-soft text-center">
              <CardContent className="p-6">
                <Brain className="w-12 h-12 text-primary mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Smart Questions</h3>
                <p className="text-sm text-muted-foreground">
                  Dynamic follow-up questions based on your responses
                </p>
              </CardContent>
            </Card>
            <Card className="shadow-soft text-center">
              <CardContent className="p-6">
                <TrendingUp className="w-12 h-12 text-primary mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Instant Feedback</h3>
                <p className="text-sm text-muted-foreground">
                  Detailed analysis and improvement suggestions
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Start Session CTA */}
          <div className="text-center">
            <Button 
              onClick={handleStartSession}
              size="lg" 
              className="gradient-primary px-12 py-6 text-lg shadow-medium"
            >
              <Play className="w-5 h-5 mr-2" />
              Begin HR Interview
            </Button>
            <p className="text-sm text-muted-foreground mt-3">
              Interactive session • Microphone required
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default HRLanding;