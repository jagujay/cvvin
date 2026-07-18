import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/layout/Layout";
import logoImage from "@/assets/Logo-NoBG-cropped.png";

const VerifyResetCode = () => {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  
  const email = location.state?.email || "";

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleInputChange = (index: number, value: string) => {
    if (value.length > 1) return;
    
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const otpString = otp.join("");
    
    if (otpString.length !== 6) {
      toast({
        variant: "destructive",
        title: "Invalid Code",
        description: "Please enter all 6 digits."
      });
      setIsLoading(false);
      return;
    }

    // Simulate API call
    setTimeout(() => {
      if (otpString.length === 6) {
        toast({
          title: "Code Verified",
          description: "Please set your new password."
        });
        navigate("/auth/set-new-password", { 
          state: { 
            email, 
            resetToken: "mock_reset_token_12345" 
          } 
        });
      } else {
        toast({
          variant: "destructive",
          title: "Verification Failed",
          description: "Invalid or expired code. Please try again."
        });
      }
      setIsLoading(false);
    }, 1000);
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
              Check Your Email
            </CardTitle>
            <p className="text-muted-foreground text-sm md:text-base mb-2">
              We've sent a 6-digit code to
            </p>
            <p className="text-sm font-medium text-primary">{email}</p>
          </CardHeader>
          <CardContent className="px-8 pb-8">
            <form onSubmit={handleVerify} className="space-y-6">
              <div>
                <div className="flex justify-center space-x-3">
                  {otp.map((digit, index) => (
                    <Input
                      key={index}
                      ref={(el) => (inputRefs.current[index] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleInputChange(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(index, e)}
                      className="w-14 h-14 text-center text-xl font-semibold transition-all focus:ring-2 focus:ring-primary/20"
                    />
                  ))}
                </div>
              </div>

              <Button type="submit" className="w-full h-11 text-base font-semibold shadow-medium hover:shadow-strong transition-all" disabled={isLoading}>
                {isLoading ? "Verifying..." : "Verify Code"}
              </Button>

              <div className="text-center pt-2">
                <Link 
                  to="/auth/forgot-password" 
                  className="inline-flex items-center text-sm text-muted-foreground hover:text-primary transition-colors underline-offset-4 hover:underline"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default VerifyResetCode;