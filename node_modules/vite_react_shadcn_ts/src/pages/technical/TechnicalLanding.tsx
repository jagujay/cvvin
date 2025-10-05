import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Code2, 
  Clock, 
  Target, 
  CheckCircle2, 
  ArrowLeft,
  Play,
  BookOpen,
  Zap
} from "lucide-react";
import Layout from "@/components/layout/Layout";
import userData from "@/mock/user.json";

const TechnicalLanding = () => {
  const navigate = useNavigate();
  const user = userData.user;

  const handleStartSession = () => {
    navigate("/interview/setup", { 
      state: { interviewType: "technical" } 
    });
  };

  const features = [
    {
      icon: BookOpen,
      title: "Multiple Choice Questions",
      description: "Test your knowledge across programming concepts, data structures, and algorithms"
    },
    {
      icon: Code2,
      title: "Coding Challenge",
      description: "Solve LeetCode-style problems with a built-in code editor and test cases"
    },
    {
      icon: Zap,
      title: "Real-time Proctoring",
      description: "AI-monitored session to simulate real interview conditions"
    }
  ];

  const sessionDetails = [
    { icon: Clock, label: "Duration", value: "45-60 minutes" },
    { icon: Target, label: "Questions", value: "10 MCQs + 1 Coding" },
    { icon: CheckCircle2, label: "Difficulty", value: "Adaptive" }
  ];

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
              <h1 className="text-3xl font-bold">Technical Interview</h1>
              <p className="text-muted-foreground">
                Test your programming skills with MCQs and coding challenges
              </p>
            </div>
          </div>

          {/* Hero Section */}
          <Card className="mb-8 shadow-soft gradient-accent">
            <CardContent className="p-8">
              <div className="text-center">
                <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <Code2 className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-2xl font-bold mb-4 text-accent-foreground">
                  Ready to Code Your Way to Success?
                </h2>
                <p className="text-accent-foreground/80 mb-6 max-w-2xl mx-auto">
                  Our technical interview simulation covers the essential skills employers look for. 
                  From core CS concepts to practical coding ability - we've got you covered.
                </p>
                <Button 
                  onClick={handleStartSession}
                  size="lg" 
                  className="gradient-primary shadow-medium"
                >
                  <Play className="w-5 h-5 mr-2" />
                  Start Technical Session
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Session Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {sessionDetails.map((detail, index) => (
              <Card key={index} className="shadow-soft text-center">
                <CardContent className="p-6">
                  <detail.icon className="w-8 h-8 text-primary mx-auto mb-3" />
                  <p className="text-sm font-medium text-muted-foreground mb-1">{detail.label}</p>
                  <p className="text-lg font-bold">{detail.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* What to Expect */}
          <Card className="mb-8 shadow-soft">
            <CardHeader>
              <CardTitle>What to Expect</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {features.map((feature, index) => (
                  <div key={index} className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center">
                      <feature.icon className="w-8 h-8 text-primary" />
                    </div>
                    <h3 className="font-semibold mb-2">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Topics Covered */}
          <Card className="mb-8 shadow-soft">
            <CardHeader>
              <CardTitle>Topics Covered</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  "Data Structures",
                  "Algorithms", 
                  "System Design",
                  "Database Concepts",
                  "OOP Principles",
                  "Web Technologies",
                  "Programming Logic",
                  "Problem Solving"
                ].map((topic, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <span className="text-sm">{topic}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Preparation Tips */}
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle>Quick Tips</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Badge variant="secondary" className="mt-0.5">1</Badge>
                  <p className="text-sm">Ensure stable internet connection and quiet environment</p>
                </div>
                <div className="flex items-start gap-3">
                  <Badge variant="secondary" className="mt-0.5">2</Badge>
                  <p className="text-sm">Have a notepad ready for rough work during coding challenges</p>
                </div>
                <div className="flex items-start gap-3">
                  <Badge variant="secondary" className="mt-0.5">3</Badge>
                  <p className="text-sm">Read questions carefully and manage your time effectively</p>
                </div>
                <div className="flex items-start gap-3">
                  <Badge variant="secondary" className="mt-0.5">4</Badge>
                  <p className="text-sm">Test your code with the provided examples before submitting</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Start Session CTA */}
          <div className="text-center mt-8">
            <Button 
              onClick={handleStartSession}
              size="lg" 
              className="gradient-primary px-12 py-6 text-lg shadow-medium"
            >
              <Play className="w-5 h-5 mr-2" />
              Begin Technical Interview
            </Button>
            <p className="text-sm text-muted-foreground mt-3">
              Session will be proctored • Camera and microphone required
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default TechnicalLanding;