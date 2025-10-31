import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { SecureAvatar } from "@/components/ui/secure-avatar";
import SecurePDFViewer from "@/components/ui/secure-pdf-viewer";
import { extractFileIdFromUrl, generateAvatarFallback } from "@/lib/image-utils";
import { 
  Edit, 
  FileText, 
  Mail, 
  Phone, 
  GraduationCap, 
  Briefcase, 
  Loader2, 
  Download, 
  Eye,
  CheckCircle2,
  AlertCircle,
  Target,
  Award,
  Globe
} from "lucide-react";
import Layout from "@/components/layout/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { consolidatedAPI, UserProfile } from "@/services/consolidatedAPI";
import { useToast } from "@/hooks/use-toast";

const ProfileEnhanced = () => {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [profileImageFile, setProfileImageFile] = useState<any>(null);
  const [resumeFile, setResumeFile] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [profileCompletion, setProfileCompletion] = useState<{
    isComplete: boolean;
    percentage: number;
    missingFields: string[];
  } | null>(null);

  // Load user profile data
  useEffect(() => {
    const loadUserProfile = async () => {
      if (!currentUser) {
        setIsLoading(false);
        return;
      }

      try {
        // getUserProfile now handles new users seamlessly - returns empty profile if user doesn't exist
        // Auth middleware already syncs users automatically
        // Load the profile and completion status in parallel
        const [profile, completion] = await Promise.all([
          consolidatedAPI.getUserProfile(currentUser),
          consolidatedAPI.getProfileCompletionStatus(currentUser).catch(() => ({
            isComplete: false,
            percentage: 0,
            missingFields: []
          }))
        ]);
        
        setUserProfile(profile);
        setProfileCompletion(completion);

        // Load file information - profile image and resume are optional
        // These methods already handle errors gracefully and return null if not found
        const [profileImage, resume] = await Promise.all([
          consolidatedAPI.getProfileImageFile(currentUser),
          consolidatedAPI.getResumeFile(currentUser)
        ]);

        setProfileImageFile(profileImage);
        setResumeFile(resume);
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Failed to Load Profile",
          description: "Could not load your profile data. Please try refreshing the page."
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadUserProfile();
  }, [currentUser, toast]);

  if (isLoading) {
    return (
      <Layout 
        isAuthenticated={!!currentUser} 
        user={{ 
          fullName: currentUser?.displayName || "User", 
          profilePicture: currentUser?.photoURL 
        }}
      >
        <div className="container mx-auto px-6 py-8">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin mr-2" />
              <span>Loading profile...</span>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!userProfile) {
    return (
      <Layout 
        isAuthenticated={!!currentUser} 
        user={{ 
          fullName: currentUser?.displayName || "User", 
          profilePicture: currentUser?.photoURL 
        }}
      >
        <div className="container mx-auto px-6 py-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-center py-12">
              <h2 className="text-2xl font-semibold mb-4">Profile Not Found</h2>
              <p className="text-muted-foreground mb-6">
                It looks like you haven't completed your profile yet.
              </p>
              <Button asChild>
                <Link to="/profile-setup">Complete Your Profile</Link>
              </Button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Layout 
      isAuthenticated={!!currentUser}
      user={{ 
        fullName: [userProfile.firstName, userProfile.lastName].filter(Boolean).join(' ') || 'User', 
        profilePicture: userProfile.profileImageUrl || currentUser?.photoURL 
      }}
    >
      <div className="container mx-auto px-6 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-start mb-8">
            <div>
              <h1 className="text-3xl font-bold mb-2">My Profile</h1>
              <p className="text-muted-foreground">
                Manage your personal information and preferences
              </p>
            </div>
            <Button asChild>
              <Link to="/profile-setup">
                <Edit className="w-4 h-4 mr-2" />
                Edit Profile
              </Link>
            </Button>
          </div>

          {/* Profile Completion Status */}
          {profileCompletion && !profileCompletion.isComplete && (
            <Card className="mb-8 border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-orange-600" />
                  <div className="flex-1">
                    <p className="font-medium">Complete your profile ({profileCompletion.percentage}%)</p>
                    <p className="text-sm text-muted-foreground mb-2">
                      Missing: {profileCompletion.missingFields.join(', ')}
                    </p>
                    <Progress value={profileCompletion.percentage} className="w-full" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Profile Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="resume">Resume</TabsTrigger>
              <TabsTrigger value="skills">Skills & Education</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              {/* Basic Information */}
              <Card className="shadow-soft">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                      <span className="text-xs text-primary-foreground font-medium">1</span>
                    </div>
                    Basic Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-start space-x-6">
                    <SecureAvatar 
                      className="w-24 h-24"
                      fileId={profileImageFile?.id}
                      imageUrl={userProfile.profileImageUrl || currentUser?.photoURL}
                      fallbackText={generateAvatarFallback([userProfile.firstName, userProfile.lastName].filter(Boolean).join(' ') || 'User')}
                      size={96}
                      quality={90}
                    />
                    <div className="flex-1 space-y-4">
                      <div>
                        <h2 className="text-2xl font-semibold">
                          {userProfile.firstName && userProfile.lastName 
                            ? `${userProfile.firstName} ${userProfile.lastName}`
                            : userProfile.firstName 
                            ? userProfile.firstName 
                            : userProfile.lastName 
                            ? userProfile.lastName 
                            : 'User'}
                        </h2>
                        {profileCompletion?.isComplete && (
                          <Badge variant="default" className="mt-2">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Profile Complete
                          </Badge>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-muted-foreground" />
                          <span>{userProfile.email || 'Not provided'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-muted-foreground" />
                          <span>
                            {userProfile.phone || "Not provided"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Target className="w-5 h-5 text-primary" />
                      <div>
                        <p className="text-sm text-muted-foreground">Target Roles</p>
                        <p className="text-lg font-semibold">
                          {userProfile.preferences?.targetRoles?.length || 0}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Award className="w-5 h-5 text-primary" />
                      <div>
                        <p className="text-sm text-muted-foreground">Skills</p>
                        <p className="text-lg font-semibold">
                          {userProfile.profile?.skills?.length || 0}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="w-5 h-5 text-primary" />
                      <div>
                        <p className="text-sm text-muted-foreground">Education</p>
                        <p className="text-lg font-semibold">
                          {userProfile.profile?.education?.length || 0}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Resume Tab */}
            <TabsContent value="resume" className="space-y-6">
              <Card className="shadow-soft">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    Resume
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {resumeFile ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText className="w-5 h-5 text-muted-foreground" />
                          <span className="font-medium">{resumeFile.fileName}</span>
                          <Badge variant="secondary">
                            {formatFileSize(resumeFile.fileSize)}
                          </Badge>
                        </div>
                        <Button 
                          onClick={async () => {
                            try {
                              const blob = await consolidatedAPI.downloadFile(currentUser!, resumeFile.id);
                              const url = window.URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = resumeFile.fileName;
                              a.click();
                              window.URL.revokeObjectURL(url);
                            } catch (error) {
                              toast({
                                variant: "destructive",
                                title: "Download Failed",
                                description: "Could not download the resume. Please try again."
                              });
                            }
                          }}
                          variant="outline"
                          size="sm"
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Download
                        </Button>
                      </div>
                      <SecurePDFViewer
                        fileId={resumeFile.id}
                        fileName={resumeFile.fileName}
                        fileSize={resumeFile.fileSize}
                        height="600px"
                        showInfo={false}
                      />
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium mb-2">No Resume Uploaded</h3>
                      <p className="text-muted-foreground mb-4">
                        Upload your resume to get personalized interview recommendations
                      </p>
                      <Button asChild>
                        <Link to="/profile-setup">Upload Resume</Link>
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Skills & Education Tab */}
            <TabsContent value="skills" className="space-y-6">
              {/* Skills */}
              <Card className="shadow-soft">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-primary" />
                    Skills
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {userProfile.profile?.skills && userProfile.profile.skills.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {userProfile.profile.skills.map((skill, index) => (
                        <Badge key={index} variant="secondary">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No skills added yet</p>
                  )}
                </CardContent>
              </Card>

              {/* Education */}
              <Card className="shadow-soft">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <GraduationCap className="w-5 h-5 text-primary" />
                    Education
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {userProfile.profile?.education && userProfile.profile.education.length > 0 ? (
                    <div className="space-y-4">
                      {userProfile.profile.education.map((edu: any, index: number) => (
                        <div key={edu.id || index} className="p-4 border rounded-lg">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm font-medium text-muted-foreground mb-1">Degree</p>
                              <p className="text-lg">{edu.degree}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-muted-foreground mb-1">Institution</p>
                              <p className="text-lg">{edu.institution}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-muted-foreground mb-1">Duration</p>
                              <p className="text-lg">
                                {edu.startDate ? new Date(edu.startDate).getFullYear() : 'N/A'} - {edu.endDate ? new Date(edu.endDate).getFullYear() : 'N/A'}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-muted-foreground mb-1">Current Semester</p>
                              <p className="text-lg">{edu.currentSemester || 'N/A'}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No education information provided</p>
                  )}
                </CardContent>
              </Card>

              {/* Target Roles */}
              <Card className="shadow-soft">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-primary" />
                    Target Roles
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {userProfile.preferences?.targetRoles && userProfile.preferences.targetRoles.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {userProfile.preferences.targetRoles.map((role, index) => (
                        <Badge key={index} variant="outline">
                          {role}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No target roles specified</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
};

export default ProfileEnhanced;
