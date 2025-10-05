import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Layout from "@/components/layout/Layout";
import { 
  FileText, 
  Code2, 
  MessageSquare, 
  BarChart3, 
  ArrowRight,
  CheckCircle2 
} from "lucide-react";

const Landing = () => {
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
    <Layout>
      <div className="container mx-auto px-6">
        {/* Hero Section */}
        <section className="py-20 text-center">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-6xl font-bold mb-6 hero-text">
              Ace Your Next Interview
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground mb-8 leading-relaxed">
              Prepare with AI-driven mock interviews and personalized feedback
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
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
        </section>

        {/* Features Grid */}
        <section className="py-20">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">
              Everything You Need to <span className="text-primary">Succeed</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {features.map((feature, index) => (
                <Card key={index} className="glass-card hover:shadow-medium transition-smooth">
                  <CardContent className="p-8">
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-accent rounded-lg flex items-center justify-center">
                          <feature.icon className="h-6 w-6 text-accent-foreground" />
                        </div>
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold mb-3 text-foreground">
                          {feature.title}
                        </h3>
                        <p className="text-muted-foreground leading-relaxed">
                          {feature.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20">
          <div className="max-w-4xl mx-auto text-center">
            <div className="gradient-subtle rounded-2xl p-12 shadow-medium">
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Ready to Transform Your Interview Skills?
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
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
        </section>
      </div>
    </Layout>
  );
};

export default Landing;