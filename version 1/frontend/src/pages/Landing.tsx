import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Footer from "@/components/layout/Footer";
import { useAuth } from "@/contexts/AuthContext";
import logoImage from "@/assets/Logo-NoBG-cropped.png";
import { 
  FileText, 
  Code2, 
  MessageSquare, 
  BarChart3, 
  ArrowRight,
  CheckCircle2 
} from "lucide-react";

const Landing = () => {
  const { currentUser, loading } = useAuth();
  const navigate = useNavigate();

  // Redirect to dashboard if user is logged in
  useEffect(() => {
    if (!loading && currentUser) {
      navigate("/dashboard", { replace: true });
    }
  }, [currentUser, loading, navigate]);

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Don't render landing page if user is logged in (will redirect)
  if (currentUser) {
    return null;
  }
  const features = [
    {
      icon: FileText,
      title: "Resume Analysis",
      description: "Get AI-powered suggestions by comparing your resume against job descriptions to highlight your strengths."
    },
    {
      icon: Code2,
      title: "Technical Round", 
      description: "Practice with a mix of MCQs on core subjects and aptitude, plus a LeetCode-style coding challenge with live proctoring."
    },
    {
      icon: MessageSquare,
      title: "HR Round",
      description: "Engage in a conversational HR interview. Our LLM asks relevant questions and analyzes your verbal responses, tone, and clarity."
    },
    {
      icon: BarChart3,
      title: "Detailed Feedback",
      description: "Receive a comprehensive report detailing your performance across all rounds, identifying strengths, weaknesses, and actionable improvements."
    }
  ];

  return (
    <div className="h-screen overflow-y-scroll snap-y snap-mandatory bg-background">
      {/* Section 1: Logo and Get Started */}
      <section className="h-screen snap-start flex flex-col justify-center items-center bg-background">
        <div className="container mx-auto px-6 flex flex-col items-center justify-center h-full">
          {/* Logo */}
          <div className="flex flex-col items-center justify-center mb-12">
            <img 
              src={logoImage} 
              alt="CVVIN Logo" 
              className="h-40 w-auto md:h-48 lg:h-56"
            />
          </div>
          
          {/* Hero Section */}
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl md:text-6xl font-bold mb-6 hero-text">
              Ace Your Next Interview
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground mb-8 leading-relaxed">
              Prepare with AI-driven mock interviews and personalized feedback
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button asChild size="lg" className="gradient-primary text-lg px-8 py-6 shadow-medium">
                <Link to="/auth">
                  Get Started Today
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span>Free to start • No credit card required</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 2: Features, CTA, and Footer */}
      <section className="h-screen snap-start flex flex-col bg-background">
        <div className="container mx-auto px-6 py-6 flex-1 flex flex-col justify-center">
          {/* Features Grid */}
          <div className="max-w-6xl mx-auto mb-6">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-6 md:mb-8">
              Everything You Need to <span className="text-primary">Succeed</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6">
              {features.map((feature, index) => (
                <Card key={index} className="glass-card hover:shadow-medium transition-smooth">
                  <CardContent className="p-4 md:p-6">
                    <div className="flex items-start space-x-3 md:space-x-4">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 md:w-12 md:h-12 bg-accent rounded-lg flex items-center justify-center">
                          <feature.icon className="h-5 w-5 md:h-6 md:w-6 text-accent-foreground" />
                        </div>
                      </div>
                      <div>
                        <h3 className="text-lg md:text-xl font-semibold mb-2 md:mb-3 text-foreground">
                          {feature.title}
                        </h3>
                        <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                          {feature.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* CTA Section */}
          <div className="max-w-4xl mx-auto text-center mb-6">
            <div className="gradient-subtle rounded-2xl p-6 md:p-8 lg:p-12 shadow-medium">
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-4 md:mb-6">
                Ready to Transform Your Interview Skills?
              </h2>
              <p className="text-base md:text-lg text-muted-foreground mb-6 md:mb-8">
                Join thousands of successful candidates who prepared with CVVIN
              </p>
              <Button asChild size="lg" className="gradient-primary text-lg px-8 py-6 shadow-soft">
                <Link to="/auth">
                  Start Practicing Now
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
        
        {/* Footer - outside container to maintain original styling */}
        <Footer />
      </section>
    </div>
  );
};

export default Landing;