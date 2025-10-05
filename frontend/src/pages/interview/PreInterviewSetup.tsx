import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Camera, 
  Mic, 
  Monitor, 
  Users, 
  Volume2,
  CheckCircle2,
  XCircle,
  AlertTriangle 
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/layout/Layout";
import userData from "@/mock/user.json";

const PreInterviewSetup = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const user = userData.completedProfile;

  const [permissionsGranted, setPermissionsGranted] = useState({
    camera: false,
    microphone: false
  });

  const [stream, setStream] = useState<MediaStream | null>(null);

  // Get the interview type from the previous page
  const interviewType = location.state?.interviewType || "technical";

  useEffect(() => {
    // Request permissions on component mount
    requestPermissions();

    return () => {
      // Clean up stream when component unmounts
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const requestPermissions = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      
      setStream(mediaStream);
      setPermissionsGranted({
        camera: true,
        microphone: true
      });
      
      toast({
        title: "Permissions Granted",
        description: "Camera and microphone access enabled."
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Permission Denied",
        description: "Camera and microphone access is required for the interview."
      });
    }
  };

  const rules = [
    {
      icon: Camera,
      title: "Camera & Microphone",
      description: "Your camera and microphone will be active throughout the session.",
      status: permissionsGranted.camera && permissionsGranted.microphone ? "granted" : "required"
    },
    {
      icon: Monitor,
      title: "No Tab Switching",
      description: "Leaving the interview tab is prohibited and will be flagged.",
      status: "info"
    },
    {
      icon: Volume2,
      title: "Environment",
      description: "Please be in a quiet, well-lit room.",
      status: "info"
    },
    {
      icon: Users,
      title: "Solo Session",
      description: "No other person should be present in the surroundings.",
      status: "info"
    }
  ];

  const handleStartSession = () => {
    if (!permissionsGranted.camera || !permissionsGranted.microphone) {
      toast({
        variant: "destructive",
        title: "Permissions Required",
        description: "Please grant camera and microphone permissions to continue."
      });
      return;
    }

    toast({
      title: "Starting Interview Session",
      description: "Good luck! Remember to stay focused and answer thoughtfully.",
    });

    // Navigate to the appropriate interview screen
    if (interviewType === "technical") {
      navigate("/technical-interview/mcq");
    } else if (interviewType === "hr") {
      navigate("/hr-interview/session");
    } else {
      // For full mock interview, start with technical
      navigate("/technical-interview/mcq", { 
        state: { 
          fromFullMock: true,
          nextStep: "hr" 
        }
      });
    }
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <Layout 
      isAuthenticated={true} 
      user={{ fullName: user.fullName, profilePicture: user.profilePicture }}
    >
      <div className="container mx-auto px-6 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-4">Pre-Interview Environment Check</h1>
            <p className="text-muted-foreground">
              Let's ensure everything is set up correctly for your {interviewType} interview session
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Camera Preview */}
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle>Camera Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="aspect-video bg-muted rounded-lg flex items-center justify-center relative overflow-hidden">
                  {stream ? (
                    <video
                      autoPlay
                      muted
                      playsInline
                      ref={(video) => {
                        if (video && stream) {
                          video.srcObject = stream;
                        }
                      }}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center">
                      <Camera className="w-16 h-16 text-muted-foreground mb-4 mx-auto" />
                      <p className="text-muted-foreground">Camera preview will appear here</p>
                      <Button
                        onClick={requestPermissions}
                        variant="outline"
                        size="sm"
                        className="mt-4"
                      >
                        Enable Camera
                      </Button>
                    </div>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-2 text-center">
                  Make sure you're clearly visible and well-lit
                </p>
              </CardContent>
            </Card>

            {/* Rules and Requirements */}
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle>Interview Guidelines</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {rules.map((rule, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                    <div className="flex-shrink-0">
                      {rule.status === "granted" && (
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                        </div>
                      )}
                      {rule.status === "required" && (
                        <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                          <XCircle className="w-5 h-5 text-red-600" />
                        </div>
                      )}
                      {rule.status === "info" && (
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <rule.icon className="w-5 h-5 text-blue-600" />
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{rule.title}</p>
                      <p className="text-sm text-muted-foreground">{rule.description}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Permissions Alert */}
          {(!permissionsGranted.camera || !permissionsGranted.microphone) && (
            <Alert className="mt-6">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Camera and microphone permissions are required to proceed. Please click "Enable Camera" above or check your browser settings.
              </AlertDescription>
            </Alert>
          )}

          {/* Interview Info */}
          <Card className="mt-8 shadow-soft">
            <CardContent className="p-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2">
                  {interviewType === "technical" ? "Technical Interview Session" : "HR Interview Session"}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {interviewType === "technical" 
                    ? "You'll face MCQ questions followed by coding challenges" 
                    : "Interactive behavioral questions with AI-powered analysis"
                  }
                </p>
                <div className="flex justify-center gap-4">
                  <Button variant="outline" onClick={handleGoBack}>
                    Go Back
                  </Button>
                  <Button 
                    onClick={handleStartSession}
                    disabled={!permissionsGranted.camera || !permissionsGranted.microphone}
                    className="gradient-primary px-8"
                  >
                    I'm Ready, Start Session
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default PreInterviewSetup;