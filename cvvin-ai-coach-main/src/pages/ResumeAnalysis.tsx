import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Upload, 
  FileText, 
  Loader2, 
  CheckCircle, 
  XCircle, 
  TrendingUp,
  ArrowLeft,
  Download,
  BarChart3,
  ArrowRight
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/layout/Layout";
import userData from "@/mock/user.json";
import resumeAnalysisData from "@/mock/resumeAnalysis.json";

const ResumeAnalysis = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [jobDescription, setJobDescription] = useState("");
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const { toast } = useToast();

  const user = userData.completedProfile; // Use completed profile for demo
  
  // Check if this is part of full mock flow
  const fromFullMock = location.state?.fromFullMock;
  const sessionId = location.state?.sessionId;
  const currentStage = location.state?.currentStage;
  const nextStage = location.state?.nextStage;

  useEffect(() => {
    // Auto-populate job description if user has one and this is from full mock
    if (fromFullMock && user.hasJobDescription) {
      setJobDescription(`Senior Frontend Developer - TechCorp Inc.

We are seeking a talented Senior Frontend Developer to join our dynamic team. You will be responsible for creating exceptional user experiences and implementing cutting-edge web applications.

Key Responsibilities:
• Develop and maintain responsive web applications using React, TypeScript, and modern JavaScript
• Collaborate with UX/UI designers to implement pixel-perfect designs
• Optimize applications for maximum speed and scalability
• Write clean, maintainable, and well-documented code
• Participate in code reviews and mentor junior developers
• Work with RESTful APIs and GraphQL endpoints
• Implement automated testing strategies

Required Skills:
• 5+ years of experience in frontend development
• Expert knowledge of React, JavaScript, HTML, and CSS
• Experience with TypeScript, Node.js, and modern build tools
• Proficiency with Git, Agile methodologies, and testing frameworks
• Strong problem-solving skills and attention to detail
• Bachelor's degree in Computer Science or related field

Preferred Skills:
• Experience with AWS cloud services
• Knowledge of GraphQL and modern state management
• Familiarity with CI/CD pipelines and DevOps practices

Location: San Francisco, CA (Hybrid)
Salary: $120,000 - $160,000`);
    }
  }, [fromFullMock, user.hasJobDescription]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          variant: "destructive",
          title: "File Too Large",
          description: "Please upload a file smaller than 5MB."
        });
        return;
      }
      setResumeFile(file);
    }
  };

  const handleAnalyze = async () => {
    // Always require both resume and JD (same as modular)
    if (!jobDescription.trim()) {
      toast({
        variant: "destructive",
        title: "Job Description Required",
        description: "Please paste the job description to analyze your resume."
      });
      return;
    }

    if (!resumeFile && !user.resumeUrl) {
      toast({
        variant: "destructive",
        title: "Resume Required",
        description: "Please upload a resume file or complete your profile."
      });
      return;
    }

    setIsAnalyzing(true);

    // Simulate API call with 2-second delay
    setTimeout(() => {
      setAnalysisResult(resumeAnalysisData.analysis);
      setIsAnalyzing(false);
      toast({
        title: "Analysis Complete!",
        description: fromFullMock ? "Moving to next stage..." : "Your resume analysis is ready."
      });
      
      // If part of full mock, auto-navigate to next stage after brief delay
      if (fromFullMock && nextStage) {
        setTimeout(() => {
          navigate(nextStage.route, {
            state: {
              fromFullMock: true,
              sessionId: sessionId,
              currentStage: currentStage + 1,
              nextStage: location.state?.totalStages > currentStage + 2 ? 
                location.state?.stages?.[currentStage + 2] : null,
              resumeAnalysisData: resumeAnalysisData.analysis
            }
          });
        }, 3000);
      }
    }, 2000);
  };

  return (
    <Layout 
      isAuthenticated={true} 
      user={{ fullName: user.fullName, profilePicture: user.profilePicture }}
    >
      <div className="container mx-auto px-6 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Button asChild variant="ghost" size="sm">
              <Link to={fromFullMock ? "/interview/full-mock" : "/dashboard"}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                {fromFullMock ? "Back to Full Mock" : "Back to Dashboard"}
              </Link>
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold">Resume Analysis</h1>
                {fromFullMock && (
                  <Badge variant="secondary">
                    Full Mock - Stage {(currentStage || 0) + 1}
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground">
                {fromFullMock 
                  ? "First stage: Analyze your resume against the target job requirements"
                  : "Get AI-powered insights on how well your resume matches job requirements"
                }
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Panel - Input */}
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="w-5 h-5 text-primary" />
                  Upload & Configure
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Resume Upload */}
                <div>
                  <h3 className="font-semibold mb-3">Resume</h3>
                  {user.resumeUrl || resumeFile ? (
                    <div className="flex items-center gap-4 p-4 border rounded-lg">
                      <FileText className="w-8 h-8 text-primary" />
                      <div className="flex-1">
                        <p className="font-medium">
                          {resumeFile ? resumeFile.name : `${user.fullName.replace(' ', '-').toLowerCase()}-resume.pdf`}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {resumeFile ? `${(resumeFile.size / 1024 / 1024).toFixed(2)} MB` : "From profile"}
                        </p>
                      </div>
                      {!resumeFile && (
                        <label htmlFor="resume-upload">
                          <Button variant="outline" size="sm" className="cursor-pointer">
                            Change
                          </Button>
                          <input
                            id="resume-upload"
                            type="file"
                            accept=".pdf,.doc,.docx,.txt"
                            onChange={handleFileUpload}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx,.txt"
                        onChange={handleFileUpload}
                        className="hidden"
                        id="resume-upload"
                      />
                      <label htmlFor="resume-upload" className="cursor-pointer">
                        <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                        <p className="font-medium">Upload Resume</p>
                        <p className="text-sm text-muted-foreground">
                          PDF, DOC, DOCX, TXT (Max 5MB)
                        </p>
                      </label>
                    </div>
                  )}
                </div>

                {/* Job Description */}
                <div>
                  <h3 className="font-semibold mb-3">Job Description</h3>
                  <Textarea
                    placeholder="Paste the complete job description here..."
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    className="min-h-[200px] resize-none"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Include the full job posting for the most accurate analysis
                  </p>
                </div>

                {/* Analyze Button */}
                <Button 
                  onClick={handleAnalyze} 
                  disabled={isAnalyzing}
                  className="w-full gradient-primary"
                  size="lg"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Analyzing Resume...
                    </>
                  ) : (
                    "Analyze Resume Match"
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Right Panel - Results */}
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  Analysis Results
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!analysisResult && !isAnalyzing && (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <FileText className="w-16 h-16 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Ready to Analyze</h3>
                    <p className="text-muted-foreground">
                      Upload your resume and paste a job description to get started
                    </p>
                  </div>
                )}

                {isAnalyzing && (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Loader2 className="w-16 h-16 text-primary animate-spin mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Analyzing Your Resume</h3>
                    <p className="text-muted-foreground">
                      Our AI is comparing your resume against the job requirements...
                    </p>
                  </div>
                )}

                {analysisResult && (
                  <div className="space-y-6">
                    {/* Overall Score */}
                    <div className="text-center p-6 bg-muted/50 rounded-lg">
                      <div className="text-3xl font-bold text-primary mb-2">
                        {analysisResult.overallScore}%
                      </div>
                      <p className="text-sm text-muted-foreground">Overall Match Score</p>
                      <Progress value={analysisResult.overallScore} className="mt-3" />
                      <div className="flex justify-center gap-4 mt-4 text-xs">
                        <span className="text-muted-foreground">Match: {analysisResult.matchPercentage}%</span>
                        <span className="text-muted-foreground">Processed in {analysisResult.processingTime}s</span>
                      </div>
                    </div>

                    {/* Job Description Info */}
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <h4 className="font-semibold text-sm mb-2">Analyzing Against:</h4>
                      <p className="text-sm font-medium">{analysisResult.jobDescription.title}</p>
                      <p className="text-xs text-muted-foreground">{analysisResult.jobDescription.company} • {analysisResult.jobDescription.location}</p>
                    </div>

                    {/* Matched Skills */}
                    <div>
                      <h4 className="font-semibold flex items-center gap-2 mb-3">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        Matched Skills ({analysisResult.matchedSkills.length})
                      </h4>
                      <div className="space-y-2">
                        {analysisResult.matchedSkills.map((skill: any) => (
                          <div key={skill.skill} className="flex items-center justify-between p-2 bg-green-50 rounded border border-green-200">
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                                {skill.skill}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {skill.yearsExperience}y exp
                              </span>
                            </div>
                            <Badge 
                              variant={skill.strength === 'high' ? 'default' : 'secondary'}
                              className="text-xs"
                            >
                              {skill.proficiency}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Missing Skills */}
                    <div>
                      <h4 className="font-semibold flex items-center gap-2 mb-3">
                        <XCircle className="w-4 h-4 text-orange-600" />
                        Missing Skills ({analysisResult.missingSkills.length})
                      </h4>
                      <div className="space-y-2">
                        {analysisResult.missingSkills.map((skill: any) => (
                          <div key={skill.skill} className="flex items-center justify-between p-2 bg-orange-50 rounded border border-orange-200">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {skill.skill}
                              </Badge>
                              <Badge 
                                variant={skill.importance === 'high' ? 'destructive' : 'secondary'}
                                className="text-xs"
                              >
                                {skill.importance} priority
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Strengths */}
                    <div>
                      <h4 className="font-semibold flex items-center gap-2 mb-3">
                        <TrendingUp className="w-4 h-4 text-blue-600" />
                        Key Strengths
                      </h4>
                      <div className="space-y-2">
                        {analysisResult.strengths.map((strength: any, index: number) => (
                          <div key={index} className="p-3 bg-blue-50 rounded border border-blue-200">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="text-xs">{strength.category}</Badge>
                              <Badge 
                                variant={strength.impact === 'high' ? 'default' : 'secondary'}
                                className="text-xs"
                              >
                                {strength.impact} impact
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{strength.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Top Recommendations */}
                    <div>
                      <h4 className="font-semibold flex items-center gap-2 mb-3">
                        <TrendingUp className="w-4 h-4 text-primary" />
                        Top Recommendations
                      </h4>
                      <div className="space-y-3">
                        {analysisResult.recommendations.slice(0, 2).map((rec: any, index: number) => (
                          <div key={index} className="p-4 border rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              <h5 className="font-medium">{rec.title}</h5>
                              <Badge 
                                variant={rec.priority === 'high' ? 'destructive' : 'secondary'}
                                className="text-xs"
                              >
                                {rec.priority}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">{rec.description}</p>
                            <p className="text-xs text-muted-foreground">Est. time: {rec.timeEstimate}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* ATS Compatibility */}
                    <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-sm">ATS Compatibility</h4>
                        <Badge variant="secondary">{analysisResult.atsCompatibility.score}%</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">
                        Your resume's compatibility with Applicant Tracking Systems
                      </p>
                      {analysisResult.atsCompatibility.issues.length > 0 && (
                        <ul className="text-xs text-muted-foreground">
                          {analysisResult.atsCompatibility.issues.map((issue: string, index: number) => (
                            <li key={index} className="flex items-start gap-2">
                              <span>•</span>
                              <span>{issue}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4">
                      <Button variant="outline" className="flex-1">
                        <Download className="w-4 h-4 mr-2" />
                        Export Report
                      </Button>
                      {fromFullMock ? (
                        <Button 
                          onClick={() => {
                            if (nextStage) {
                              navigate(nextStage.route, {
                                state: {
                                  fromFullMock: true,
                                  sessionId: sessionId,
                                  currentStage: currentStage + 1,
                                  resumeAnalysisData: analysisResult
                                }
                              });
                            }
                          }}
                          className="flex-1 gradient-primary"
                          disabled={!analysisResult}
                        >
                          Continue to {nextStage?.title || "Next Stage"}
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      ) : (
                        <Button asChild className="flex-1 gradient-primary">
                          <Link to="/feedback/resume-analysis/new">
                            View Full Analysis
                          </Link>
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ResumeAnalysis;