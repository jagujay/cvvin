import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import Layout from "@/components/layout/Layout";
import logoImage from "@/assets/logo.png";

const VerifyOTP = () => {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [isLoading, setIsLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { currentUser, sendCustomOTP, verifyCustomOTP, isEmailVerified } = useAuth();
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  
  const email = location.state?.email || currentUser?.email || "";
  const otpType = location.state?.type || 'verification';

  useEffect(() => {
    // Focus first input on mount
    inputRefs.current[0]?.focus();
  }, []);

  // Check if email is already verified
  useEffect(() => {
    if (isEmailVerified) {
      toast({
        title: "Email Already Verified",
        description: "Your email is already verified. Redirecting to dashboard..."
      });
      navigate("/dashboard");
    }
  }, [isEmailVerified, navigate, toast]);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleInputChange = (index: number, value: string) => {
    if (value.length > 1) return;
    
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Move to next input if value is entered
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
        title: "Invalid OTP",
        description: "Please enter all 6 digits."
      });
      setIsLoading(false);
      return;
    }

    try {
      // Verify OTP using our custom service
      await verifyCustomOTP(email, otpString, otpType);
      
      // Navigate based on OTP type
      if (otpType === 'reset') {
        navigate("/auth/set-new-password", { state: { email } });
      } else {
        navigate("/dashboard");
      }
    } catch (error) {
      // Error handling is done in the AuthContext
      console.error("OTP verification error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setResendCooldown(30);
    try {
      await sendCustomOTP(email, otpType);
    } catch (error) {
      // Error handling is done in the AuthContext
      console.error("Resend OTP error:", error);
    }
  };

  return (
    <Layout showFooter={false}>
      <div className="min-h-[calc(100vh-80px)] flex items-center justify-center p-6 gradient-subtle">
        <Card className="w-full max-w-md shadow-strong">
          <CardHeader className="text-center pb-4">
            <div className="flex justify-center mb-4">
              <img src={logoImage} alt="CVVIN" className="h-12 w-auto" />
            </div>
            <CardTitle className="text-2xl font-bold">
              {otpType === 'reset' ? 'Password Reset Code' : 'Check Your Email'}
            </CardTitle>
            <p className="text-muted-foreground">
              {otpType === 'reset' 
                ? 'We\'ve sent a password reset code to'
                : 'We\'ve sent a verification code to'
              }
            </p>
            <p className="text-sm font-medium text-primary">{email}</p>
            <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
              <strong>Note:</strong> The code will expire in 10 minutes
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleVerify} className="space-y-6">
              <div>
                <div className="flex justify-center space-x-2">
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
                      className="w-12 h-12 text-center text-lg font-semibold"
                    />
                  ))}
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Verifying..." : (otpType === 'reset' ? "Verify Reset Code" : "Verify Account")}
              </Button>

              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  Didn't receive the code?
                </p>
                {resendCooldown > 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Resend available in {resendCooldown}s
                  </p>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleResendOTP}
                    className="text-primary hover:text-primary-hover p-0 h-auto"
                  >
                    Resend OTP
                  </Button>
                )}
              </div>

              <div className="text-center">
                <Link 
                  to="/auth" 
                  className="text-sm text-muted-foreground hover:text-primary transition-smooth"
                >
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

export default VerifyOTP;