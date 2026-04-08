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
import { useAuth } from "@/contexts/AuthContext";
import { consolidatedAPI, FileUploadResponse, UserProfile, ResumeData } from "@/services/consolidatedAPI";
import { SecureAvatar } from "@/components/ui/secure-avatar";
import { extractFileIdFromUrl, generateAvatarFallback } from "@/lib/image-utils";
import resumeAnalysisData from "@/mock/resumeAnalysis.json";

const ResumeAnalysis = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [jobDescription, setJobDescription] = useState("");
  const [jdFile, setJdFile] = useState<File | null>(null);
  const [isExtractingJd, setIsExtractingJd] = useState(false);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [resumeData, setResumeData] = useState<ResumeData | null>(null);
  const [uploadedFile, setUploadedFile] = useState<FileUploadResponse | null>(null);
  const [resumeFileInfo, setResumeFileInfo] = useState<any | null>(null);
  const { toast } = useToast();
  
  // Check if this is part of full mock flow
  const fromFullMock = location.state?.fromFullMock;
  const sessionId = location.state?.sessionId;
  const currentStage = location.state?.currentStage;
  const nextStage = location.state?.nextStage;

  // Load user profile data on component mount
  useEffect(() => {
    const loadUserData = async () => {
      if (!currentUser) return;
      
      try {
        // Load user profile
        const profile = await consolidatedAPI.getUserProfile(currentUser);
        setUserProfile(profile);
        
        // Try to load resume data
        try {
          const resume = await consolidatedAPI.getUserResumeData(currentUser);
          setResumeData(resume);
        } catch (error) {
          // Resume data might not exist yet, that's okay
          console.log('No resume data found yet');
        }
        
        // Try to load resume file info (for fileId)
        try {
          const resumeFile = await consolidatedAPI.getResumeFile(currentUser);
          setResumeFileInfo(resumeFile);
        } catch (error) {
          // Resume file might not exist yet, that's okay
          console.log('No resume file found yet');
        }
        
        // Auto-populate job description if this is from full mock
        if (fromFullMock) {
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
      } catch (error) {
        console.error('Failed to load user data:', error);
        toast({
          variant: "destructive",
          title: "Failed to Load Profile",
          description: "Could not load your profile data. Please try refreshing the page."
        });
      }
    };

    loadUserData();
  }, [currentUser, fromFullMock, toast]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;
    
    if (file.size > 5 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "File Too Large",
        description: "Please upload a file smaller than 5MB."
      });
      return;
    }

    // Only allow PDF files for now
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      toast({
        variant: "destructive",
        title: "Invalid File Type",
        description: "Please upload a PDF file."
      });
      return;
    }

    setIsUploading(true);
    setResumeFile(file);

    try {
      const uploadResult = await consolidatedAPI.uploadFile(currentUser, file);
      setUploadedFile(uploadResult);
      
      // Refresh resume file info to get the fileId
      try {
        const resumeFile = await consolidatedAPI.getResumeFile(currentUser);
        setResumeFileInfo(resumeFile);
      } catch (error) {
        // If getResumeFile fails, uploadedFile.fileId should still work
        console.log('Could not refresh resume file info, but upload succeeded');
      }
      
      toast({
        title: "File Uploaded Successfully",
        description: `Resume "${file.name}" has been uploaded and is ready for analysis.`
      });
    } catch (error: any) {
      console.error('File upload failed:', error);
      toast({
        variant: "destructive",
        title: "Upload Failed",
        description: error.message || "Failed to upload file. Please try again."
      });
      setResumeFile(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleJdFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!currentUser) {
      toast({
        variant: "destructive",
        title: "Authentication Required",
        description: "Please log in to upload files."
      });
      e.target.value = '';
      return;
    }

    // Support TXT and PDF files
    const validExtensions = ['.txt', '.pdf'];
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    
    if (!validExtensions.includes(fileExtension)) {
      toast({
        variant: "destructive",
        title: "Invalid File Type",
        description: "Please upload a TXT or PDF file, or paste the text directly."
      });
      e.target.value = '';
      return;
    }

    setIsExtractingJd(true);
    setJdFile(file);

    try {
      let extractedText = '';

      // For TXT files, read directly in browser
      if (fileExtension === '.txt') {
        extractedText = await file.text();
      } else if (fileExtension === '.pdf') {
        // For PDF files, upload to backend and extract text
        const uploadResult = await consolidatedAPI.uploadFile(currentUser, file);
        
        // Call backend to extract text
        const token = await currentUser.getIdToken();
        const response = await fetch('http://localhost:3000/api/files/extract-text', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ fileId: uploadResult.fileId }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || 'Failed to extract text from PDF');
        }

        const result = await response.json();
        extractedText = result.text || '';
      }

      if (extractedText.trim()) {
        setJobDescription(extractedText);
        toast({
          title: "Job Description Loaded",
          description: `Text extracted from "${file.name}"`
        });
      } else {
        throw new Error('No text could be extracted from the file');
      }
    } catch (error: any) {
      console.error('JD file processing failed:', error);
      toast({
        variant: "destructive",
        title: "File Processing Failed",
        description: error.message || "Failed to process file. Please try pasting the text instead."
      });
      setJdFile(null);
    } finally {
      setIsExtractingJd(false);
      // Reset file input
      e.target.value = '';
    }
  };

  const handleAnalyze = async () => {
    if (!currentUser) {
      toast({
        variant: "destructive",
        title: "Authentication Required",
        description: "Please log in to analyze your resume."
      });
      return;
    }

    // Always require both resume and JD
    if (!jobDescription.trim()) {
      toast({
        variant: "destructive",
        title: "Job Description Required",
        description: "Please paste the job description or upload a file to analyze your resume."
      });
      return;
    }

    if (!resumeFile && !resumeData?.resumeUrl) {
      toast({
        variant: "destructive",
        title: "Resume Required",
        description: "Please upload a resume file or complete your profile."
      });
      return;
    }

    setIsAnalyzing(true);

    try {
      // Get file ID from uploaded file, resume file info, or resume data
      const fileId = uploadedFile?.fileId || resumeFileInfo?.id;
      
      if (!fileId) {
        throw new Error('No file ID available. Please upload a resume first.');
      }
      
      // Call the real analysis API
      const result = await consolidatedAPI.analyzeResume(currentUser, fileId, jobDescription);
      
      // The API returns data directly, but we need to wrap it in the 'analysis' structure
      // to match what the component expects
      setAnalysisResult(result);
      
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
    } catch (error: any) {
      console.error('Analysis failed:', error);
      toast({
        variant: "destructive",
        title: "Analysis Failed",
        description: error.message || "Failed to analyze resume. Please try again."
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <Layout 
      isAuthenticated={!!currentUser} 
      user={{ 
        fullName: userProfile ? `${userProfile.firstName} ${userProfile.lastName}` : currentUser?.displayName || 'User', 
        profilePicture: userProfile?.profileImageUrl || currentUser?.photoURL 
      }}
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
                  {resumeData?.resumeUrl || resumeFile || uploadedFile ? (
                    <div className="flex items-center gap-4 p-4 border rounded-lg">
                      <FileText className="w-8 h-8 text-primary" />
                      <div className="flex-1">
                        <p className="font-medium">
                          {resumeFile ? resumeFile.name : 
                           uploadedFile ? uploadedFile.fileName :
                           `${userProfile?.firstName || 'user'}-resume.pdf`}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {resumeFile ? `${(resumeFile.size / 1024 / 1024).toFixed(2)} MB` : 
                           uploadedFile ? `${(uploadedFile.fileSize / 1024 / 1024).toFixed(2)} MB` :
                           "From profile"}
                        </p>
                        {isUploading && (
                          <div className="flex items-center gap-2 mt-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span className="text-xs text-muted-foreground">Uploading...</span>
                          </div>
                        )}
                      </div>
                      {!resumeFile && !uploadedFile && (
                        <label htmlFor="resume-upload">
                          <Button variant="outline" size="sm" className="cursor-pointer" disabled={isUploading}>
                            Change
                          </Button>
                          <input
                            id="resume-upload"
                            type="file"
                            accept=".pdf"
                            onChange={handleFileUpload}
                            className="hidden"
                            disabled={isUploading}
                          />
                        </label>
                      )}
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                      <input
                        type="file"
                        accept=".pdf"
                        onChange={handleFileUpload}
                        className="hidden"
                        id="resume-upload"
                        disabled={isUploading}
                      />
                      <label htmlFor="resume-upload" className={`cursor-pointer ${isUploading ? 'opacity-50' : ''}`}>
                        <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                        <p className="font-medium">
                          {isUploading ? 'Uploading...' : 'Upload Resume'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          PDF only (Max 5MB)
                        </p>
                      </label>
                    </div>
                  )}
                </div>

                {/* Job Description */}
                <div>
                  <h3 className="font-semibold mb-3">Job Description</h3>
                  
                  {/* File Upload Option */}
                  <div className="mb-3">
                    {jdFile ? (
                      <div className="flex items-center gap-4 p-3 border rounded-lg bg-muted/50">
                        <FileText className="w-6 h-6 text-primary" />
                        <div className="flex-1">
                          <p className="font-medium text-sm">{jdFile.name}</p>
                          {isExtractingJd && (
                            <div className="flex items-center gap-2 mt-1">
                              <Loader2 className="w-3 h-3 animate-spin" />
                              <span className="text-xs text-muted-foreground">Extracting text...</span>
                            </div>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setJdFile(null);
                            setJobDescription('');
                          }}
                          disabled={isExtractingJd}
                        >
                          Remove
                        </Button>
                      </div>
                    ) : (
                      <div className="border-2 border-dashed border-border rounded-lg p-4 text-center mb-3">
                        <input
                          type="file"
                          accept=".txt,.pdf"
                          onChange={handleJdFileUpload}
                          className="hidden"
                          id="jd-upload"
                          disabled={isExtractingJd}
                        />
                        <label htmlFor="jd-upload" className={`cursor-pointer ${isExtractingJd ? 'opacity-50' : ''}`}>
                          <Upload className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                          <p className="text-sm font-medium">
                            {isExtractingJd ? 'Processing...' : 'Upload JD File'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            TXT or PDF (Max 5MB)
                          </p>
                        </label>
                      </div>
                    )}
                  </div>

                  {/* Divider */}
                  <div className="flex items-center gap-2 my-3">
                    <div className="flex-1 border-t"></div>
                    <span className="text-xs text-muted-foreground">OR</span>
                    <div className="flex-1 border-t"></div>
                  </div>

                  {/* Text Input */}
                  <Textarea
                    placeholder="Paste your text / JD here..."
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
                  disabled={isAnalyzing || isUploading || !currentUser}
                  className="w-full gradient-primary"
                  size="lg"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Analyzing Resume...
                    </>
                  ) : isUploading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Uploading File...
                    </>
                  ) : !currentUser ? (
                    "Please Log In"
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
                        {analysisResult.overallScore || 0}%
                      </div>
                      <p className="text-sm text-muted-foreground">Overall Match Score</p>
                      <Progress value={analysisResult.overallScore || 0} className="mt-3" />
                      <div className="flex justify-center gap-4 mt-4 text-xs">
                        <span className="text-muted-foreground">Match: {analysisResult.matchPercentage || analysisResult.overallScore || 0}%</span>
                        {analysisResult.processingTime && (
                          <span className="text-muted-foreground">Processed in {analysisResult.processingTime}s</span>
                        )}
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
                        Matched Skills ({analysisResult.matchedSkills?.length || 0})
                      </h4>
                      <div className="space-y-2">
                        {(analysisResult.matchedSkills || []).map((skill: any) => (
                          <div key={skill.skill} className="p-2 bg-green-50 rounded border border-green-200">
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                                  {skill.skill}
                                </Badge>
                                {skill.yearsExperience > 0 && (
                                  <span className="text-xs text-muted-foreground">
                                    {skill.yearsExperience}y exp
                                  </span>
                                )}
                              </div>
                              <Badge 
                                variant={skill.strength === 'high' ? 'default' : 'secondary'}
                                className="text-xs"
                              >
                                {skill.proficiency || 'Intermediate'}
                              </Badge>
                            </div>
                            {skill.evidence && (
                              <p className="text-xs text-muted-foreground mt-1 italic">
                                {skill.evidence}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Missing Skills */}
                    <div>
                      <h4 className="font-semibold flex items-center gap-2 mb-3">
                        <XCircle className="w-4 h-4 text-orange-600" />
                        Missing Skills ({analysisResult.missingSkills?.length || 0})
                      </h4>
                      <div className="space-y-2">
                        {(analysisResult.missingSkills || []).map((skill: any) => (
                          <div key={skill.skill} className="p-2 bg-orange-50 rounded border border-orange-200">
                            <div className="flex items-center gap-2 mb-1">
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
                            {skill.recommendation && (
                              <p className="text-xs text-muted-foreground mt-1">{skill.recommendation}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Extra Skills */}
                    {analysisResult.extraSkills && analysisResult.extraSkills.length > 0 && (
                      <div>
                        <h4 className="font-semibold flex items-center gap-2 mb-3">
                          <TrendingUp className="w-4 h-4 text-purple-600" />
                          Extra Skills ({analysisResult.extraSkills.length})
                        </h4>
                        <div className="space-y-2">
                          {analysisResult.extraSkills.map((skill: any) => (
                            <div key={skill.skill} className="p-2 bg-purple-50 rounded border border-purple-200">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700">
                                  {skill.skill}
                                </Badge>
                                <Badge 
                                  variant={skill.relevance === 'high' ? 'default' : 'secondary'}
                                  className="text-xs"
                                >
                                  {skill.relevance} relevance
                                </Badge>
                              </div>
                              {skill.value && (
                                <p className="text-xs text-muted-foreground mt-1">{skill.value}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

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

                    {/* Recommendations for Newbies */}
                    <div>
                      <h4 className="font-semibold flex items-center gap-2 mb-3">
                        <TrendingUp className="w-4 h-4 text-primary" />
                        Recommendations (Beginner-Friendly)
                      </h4>
                      <div className="space-y-3">
                        {(analysisResult.recommendations || []).slice(0, 3).map((rec: any, index: number) => (
                          <div key={index} className="p-4 border rounded-lg bg-gradient-to-br from-blue-50 to-white">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <h5 className="font-medium">{rec.title}</h5>
                              <Badge 
                                variant={rec.priority === 'high' ? 'destructive' : 'secondary'}
                                className="text-xs"
                              >
                                {rec.priority} priority
                              </Badge>
                              {rec.difficulty && (
                                <Badge variant="outline" className="text-xs">
                                  {rec.difficulty} level
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">{rec.description}</p>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              {rec.timeEstimate && (
                                <span>⏱️ Est. time: {rec.timeEstimate}</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* ATS Score and Compatibility */}
                    <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-sm">ATS Score & Compatibility</h4>
                        <Badge 
                          variant={analysisResult.atsCompatibility?.score >= 80 ? 'default' : 
                                  analysisResult.atsCompatibility?.score >= 60 ? 'secondary' : 'destructive'}
                        >
                          {analysisResult.atsCompatibility?.score || 0}%
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mb-3">
                        Your resume's compatibility with Applicant Tracking Systems (ATS)
                      </p>
                      {analysisResult.atsCompatibility?.issues && analysisResult.atsCompatibility.issues.length > 0 && (
                        <div className="mb-3">
                          <p className="text-xs font-semibold mb-1">Issues Found:</p>
                          <ul className="text-xs text-muted-foreground space-y-1">
                            {analysisResult.atsCompatibility.issues.map((issue: string, index: number) => (
                              <li key={index} className="flex items-start gap-2">
                                <span className="text-orange-600">•</span>
                                <span>{issue}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {analysisResult.atsCompatibility?.suggestions && analysisResult.atsCompatibility.suggestions.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold mb-1">Improvement Suggestions:</p>
                          <ul className="text-xs text-muted-foreground space-y-1">
                            {analysisResult.atsCompatibility.suggestions.map((suggestion: string, index: number) => (
                              <li key={index} className="flex items-start gap-2">
                                <span className="text-green-600">✓</span>
                                <span>{suggestion}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
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