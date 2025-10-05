import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  FileText, 
  Camera, 
  Code2, 
  MessageSquare, 
  BarChart3,
  CheckCircle2,
  Clock,
  Target,
  Play,
  ArrowRight
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/layout/Layout";
import userData from "@/mock/user.json";

interface MockStage {
  id: string;
  title: string;
  description: string;
  icon: any;
  duration: string;
  status: 'pending' | 'current' | 'completed' | 'skipped';
  route: string;
  required: boolean;
}

const FullMockInterview = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const demoUserType = location.state?.demoUserType || 'returning';
  const user = demoUserType === 'new' ? userData.user : userData.completedProfile;

  const [currentStage, setCurrentStage] = useState(0);
  const [sessionId] = useState(`full_mock_${Date.now()}`);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [sessionData, setSessionData] = useState({
    resumeAnalysis: null,
    technicalScore: null,
    hrScore: null,
    startTime: null as Date | null,
    endTime: null as Date | null
  });

  const mockStages: MockStage[] = [
    {
      id: 'resume-analysis',
      title: 'Resume Analysis',
      description: 'Analyze your resume against the job description',
      icon: FileText,
      duration: '5-10 minutes',
      status: 'current',
      route: '/resume-analysis',
      required: true
    },
    {
      id: 'setup',
      title: 'Interview Setup',
      description: 'Camera check and environment verification',
      icon: Camera,
      duration: '2-3 minutes',
      status: 'pending',
      route: '/interview/setup',
      required: true
    },
    {
      id: 'technical',
      title: 'Technical Round',
      description: 'MCQ questions and coding challenges',
      icon: Code2,
      duration: '45-60 minutes',
      status: 'pending',
      route: '/technical-interview/mcq',
      required: true
    },
    {
      id: 'hr',
      title: 'HR Interview',
      description: 'Behavioral and situational questions',
      icon: MessageSquare,
      duration: '20-30 minutes',
      status: 'pending',
      route: '/hr-interview/session',
      required: true
    },
    {
      id: 'feedback',
      title: 'Detailed Feedback',
      description: 'Comprehensive performance analysis',
      icon: BarChart3,
      duration: '5 minutes',
      status: 'pending',
      route: '/feedback',
      required: false
    }
  ];

  const [stages, setStages] = useState(mockStages);

  const handleStartFullMock = () => {
    setSessionStarted(true);
    setSessionData(prev => ({ ...prev, startTime: new Date() }));
    
    toast({
      title: "Full Mock Interview Started",
      description: "Beginning with resume analysis. Good luck!",
    });

    // Start with resume analysis
    navigateToStage(0);
  };

  const navigateToStage = (stageIndex: number) => {
    const stage = stages[stageIndex];
    
    // Update stage status
    const updatedStages = stages.map((s, index) => ({
      ...s,
      status: (index < stageIndex ? 'completed' : 
              index === stageIndex ? 'current' : 'pending') as MockStage['status']
    }));
    
    setStages(updatedStages);
    setCurrentStage(stageIndex);

    // Navigate with full mock context
    navigate(stage.route, {
      state: {
        fromFullMock: true,
        sessionId: sessionId,
        currentStage: stageIndex,
        totalStages: stages.length,
        nextStage: stageIndex < stages.length - 1 ? stages[stageIndex + 1] : null
      }
    });
  };

  const getTotalDuration = () => {
    const totalMinutes = stages.reduce((acc, stage) => {
      const duration = stage.duration.split('-')[1] || stage.duration.split('-')[0];
      const minutes = parseInt(duration.replace(/\D/g, ''));
      return acc + minutes;
    }, 0);
    
    return `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`;
  };

  const getCompletedStages = () => {
    return stages.filter(stage => stage.status === 'completed').length;
  };

  if (!sessionStarted) {
    // Landing page
    return (
      <Layout 
        isAuthenticated={true} 
        user={{ 
          fullName: user.fullName, 
          profilePicture: user.profilePicture,
          isProfileComplete: user.isProfileComplete
        }}
      >
        <div className="container mx-auto px-6 py-8">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold mb-4">Full Mock Interview</h1>
              <p className="text-muted-foreground text-lg">
                Complete end-to-end interview simulation with comprehensive feedback
              </p>
            </div>

            {/* Overview Card */}
            <Card className="shadow-soft mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Interview Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">{stages.length}</div>
                    <p className="text-sm text-muted-foreground">Total Stages</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">{getTotalDuration()}</div>
                    <p className="text-sm text-muted-foreground">Estimated Duration</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">Comprehensive</div>
                    <p className="text-sm text-muted-foreground">Feedback Report</p>
                  </div>
                </div>

                <Separator className="my-6" />

                <div>
                  <h3 className="font-semibold mb-4">What's Included:</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="flex items-center gap-2 text-sm">
                      <FileText className="w-4 h-4 text-primary" />
                      Resume analysis and optimization tips
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Code2 className="w-4 h-4 text-primary" />
                      Technical coding challenges
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <MessageSquare className="w-4 h-4 text-primary" />
                      Behavioral interview practice
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <BarChart3 className="w-4 h-4 text-primary" />
                      Detailed performance report
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                onClick={handleStartFullMock}
                size="lg"
                className="gradient-primary px-8"
              >
                <Play className="w-5 h-5 mr-2" />
                Start Full Mock Interview
              </Button>
              
              <Button 
                variant="outline" 
                size="lg"
                onClick={() => navigate("/dashboard")}
              >
                Back to Dashboard
              </Button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // After session started - show current stage with navigation
  return (
    <Layout 
      isAuthenticated={true} 
      user={{ 
        fullName: user.fullName, 
        profilePicture: user.profilePicture,
        isProfileComplete: user.isProfileComplete
      }}
    >
      <div className="container mx-auto px-6 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Progress Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold">Full Mock Interview</h1>
              <p className="text-muted-foreground">Stage {currentStage + 1} of {stages.length}: {stages[currentStage]?.title}</p>
            </div>
            <Badge variant="secondary" className="text-xs">
              Session ID: {sessionId.slice(-6)}
            </Badge>
          </div>

          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex justify-between text-sm text-muted-foreground mb-2">
              <span>Progress</span>
              <span>{getCompletedStages()} / {stages.length} completed</span>
            </div>
            <Progress value={(getCompletedStages() / stages.length) * 100} className="h-2" />
          </div>

          {/* Current Stage Info */}
          <Card className="shadow-soft">
            <CardContent className="p-8 text-center">
              <div className="max-w-md mx-auto">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  {React.createElement(stages[currentStage]?.icon, { className: "w-8 h-8 text-primary" })}
                </div>
                
                <h2 className="text-2xl font-bold mb-2">
                  {stages[currentStage]?.title}
                </h2>
                
                <p className="text-muted-foreground mb-6">
                  {stages[currentStage]?.description}
                </p>

                <div className="flex items-center justify-center gap-4 mb-6 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {stages[currentStage]?.duration}
                  </div>
                  <div className="flex items-center gap-1">
                    <BarChart3 className="w-4 h-4" />
                    Stage {currentStage + 1} of {stages.length}
                  </div>
                </div>

                <Button 
                  onClick={() => navigateToStage(currentStage)}
                  size="lg" 
                  className="gradient-primary"
                >
                  Continue to {stages[currentStage]?.title}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default FullMockInterview;
