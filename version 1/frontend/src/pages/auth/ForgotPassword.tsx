import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import Layout from "@/components/layout/Layout";
import logoImage from "@/assets/Logo-NoBG-cropped.png";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { resetPassword, sendCustomOTP } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (!email) {
      toast({
        variant: "destructive",
        title: "Email Required",
        description: "Please enter your email address."
      });
      setIsLoading(false);
      return;
    }

    try {
      // Send custom OTP for password reset
      await sendCustomOTP(email, 'reset');
      
      // Navigate to OTP verification page
      navigate("/auth/verify-otp", { 
        state: { 
          email: email,
          type: 'reset'
        } 
      });
    } catch (error) {
      // Error handling is done in the AuthContext
      console.error("Password reset error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout showFooter={false} showNavbar={false}>
      <div className="min-h-screen flex items-center justify-center p-4 md:p-6 gradient-subtle">
        <Card className="w-full max-w-md shadow-strong relative border-0 bg-card/95 backdrop-blur-sm">
          <CardHeader className="text-center pb-6 pt-12 px-8">
            <div className="flex justify-center mb-6">
              <img src={logoImage} alt="CVVIN Logo" className="h-28 w-auto md:h-36 lg:h-44 transition-transform hover:scale-105" />
            </div>
            <CardTitle className="text-3xl md:text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
              Reset Your Password
            </CardTitle>
            <p className="text-muted-foreground text-sm md:text-base">
              Enter your email address and we'll send you a reset code
            </p>
          </CardHeader>
          <CardContent className="px-8 pb-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your.email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 transition-all focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <Button type="submit" className="w-full h-11 text-base font-semibold shadow-medium hover:shadow-strong transition-all" disabled={isLoading}>
                {isLoading ? "Sending..." : "Send Reset Code"}
              </Button>

              <div className="text-center pt-2">
                <Link 
                  to="/auth" 
                  className="inline-flex items-center text-sm text-muted-foreground hover:text-primary transition-colors underline-offset-4 hover:underline"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Login
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default ForgotPassword;