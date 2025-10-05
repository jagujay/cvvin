import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/layout/Layout";
import logoImage from "@/assets/logo.png";

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
    <Layout showFooter={false}>
      <div className="min-h-[calc(100vh-80px)] flex items-center justify-center p-6 gradient-subtle">
        <Card className="w-full max-w-md shadow-strong">
          <CardHeader className="text-center pb-4">
            <div className="flex justify-center mb-4">
              <img src={logoImage} alt="CVVIN" className="h-12 w-auto" />
            </div>
            <CardTitle className="text-2xl font-bold">Check Your Email</CardTitle>
            <p className="text-muted-foreground">
              We've sent a 6-digit code to
            </p>
            <p className="text-sm font-medium text-primary">{email}</p>
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
                {isLoading ? "Verifying..." : "Verify Code"}
              </Button>

              <div className="text-center">
                <Link 
                  to="/auth/forgot-password" 
                  className="inline-flex items-center text-sm text-muted-foreground hover:text-primary transition-smooth"
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