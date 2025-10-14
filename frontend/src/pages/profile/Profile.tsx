import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Edit, FileText, Mail, Phone, GraduationCap, Briefcase, Loader2 } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { consolidatedAPI, UserProfile } from "@/services/consolidatedAPI";
import { useToast } from "@/hooks/use-toast";

const Profile = () => {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load user profile data
  useEffect(() => {
    const loadUserProfile = async () => {
      if (!currentUser) {
        setIsLoading(false);
        return;
      }

      try {
        // First, sync the user to ensure they exist in the database
        await consolidatedAPI.syncUser(currentUser);
        
        // Then load the profile
        const profile = await consolidatedAPI.getUserProfile(currentUser);
        setUserProfile(profile);
      } catch (error) {
        console.error('Failed to load user profile:', error);
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
          <div className="max-w-4xl mx-auto">
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
          <div className="max-w-4xl mx-auto">
            <div className="text-center py-12">
              <h2 className="text-2xl font-semibold mb-4">Profile Not Found</h2>
              <p className="text-muted-foreground mb-6">
                It looks like you haven't completed your profile yet.
              </p>
              <Button asChild>
                <Link to="/profile/setup">Complete Your Profile</Link>
              </Button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout 
      isAuthenticated={!!currentUser} 
      user={{ 
        fullName: `${userProfile.firstName} ${userProfile.lastName}`, 
        profilePicture: userProfile.profileImageUrl || currentUser?.photoURL 
      }}
    >
      <div className="container mx-auto px-6 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold">Profile</h1>
            <Button asChild className="gap-2">
              <Link to="/profile/edit">
                <Edit className="w-4 h-4" />
                Edit Profile
              </Link>
            </Button>
          </div>

          <div className="space-y-6">
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
                  <Avatar className="w-24 h-24">
                    <AvatarImage src={userProfile.profileImageUrl || currentUser?.photoURL} alt={`${userProfile.firstName} ${userProfile.lastName}`} />
                    <AvatarFallback className="bg-accent text-accent-foreground text-lg">
                      {`${userProfile.firstName} ${userProfile.lastName}`
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-4">
                    <div>
                      <h2 className="text-2xl font-semibold">{`${userProfile.firstName} ${userProfile.lastName}`}</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        <span>{userProfile.email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        <span>{userProfile.phone || "Not provided"}</span>
                      </div>
                    </div>
                  </div>
                </div>
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
                            <p className="text-sm font-medium text-muted-foreground mb-1">GPA</p>
                            <p className="text-lg">{edu.gpa || "N/A"}</p>
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

            {/* Skills */}
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle>Skills</CardTitle>
              </CardHeader>
              <CardContent>
                {userProfile.profile?.skills && userProfile.profile.skills.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {userProfile.profile.skills.map((skill: string) => (
                      <Badge key={skill} variant="secondary" className="text-sm py-1 px-3">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No skills added</p>
                )}
              </CardContent>
            </Card>

            {/* Interested Roles */}
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-primary" />
                  Interested Roles
                </CardTitle>
              </CardHeader>
              <CardContent>
                {userProfile.preferences?.targetRoles && userProfile.preferences.targetRoles.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {userProfile.preferences.targetRoles.map((role: string) => (
                      <Badge key={role} variant="outline" className="text-sm py-1 px-3">
                        {role}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No roles specified</p>
                )}
              </CardContent>
            </Card>

            {/* Resume */}
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Resume
                </CardTitle>
              </CardHeader>
              <CardContent>
                {userProfile.profile?.resumeUrl ? (
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <FileText className="w-8 h-8 text-primary" />
                      <div>
                        <p className="font-medium">Resume.pdf</p>
                        <p className="text-sm text-muted-foreground">
                          Last updated: {userProfile.updatedAt ? new Date(userProfile.updatedAt).toLocaleDateString() : 'Unknown'}
                        </p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <Link to="/resume-analysis">
                        View Resume
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <p className="text-muted-foreground">No resume uploaded</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Profile;