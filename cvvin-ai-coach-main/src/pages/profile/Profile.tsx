import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Edit, FileText, Mail, Phone, GraduationCap, Briefcase } from "lucide-react";
import Layout from "@/components/layout/Layout";
import userData from "@/mock/user.json";

const Profile = () => {
  const user = userData.completedProfile; // Use completed profile for demo

  return (
    <Layout 
      isAuthenticated={true} 
      user={{ fullName: user.fullName, profilePicture: user.profilePicture }}
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
                    <AvatarImage src={user.profilePicture} alt={user.fullName} />
                    <AvatarFallback className="bg-accent text-accent-foreground text-lg">
                      {user.fullName
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-4">
                    <div>
                      <h2 className="text-2xl font-semibold">{user.fullName}</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        <span>{user.email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        <span>{user.phone || "Not provided"}</span>
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
                {user.education && user.education.length > 0 ? (
                  <div className="space-y-4">
                    {user.education.map((edu: any, index: number) => (
                      <div key={edu.id || index} className="p-4 border rounded-lg">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground mb-1">Degree</p>
                            <p className="text-lg">{edu.degree} in {edu.field}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-muted-foreground mb-1">Institution</p>
                            <p className="text-lg">{edu.institution}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-muted-foreground mb-1">Duration</p>
                            <p className="text-lg">{new Date(edu.startDate).getFullYear()} - {new Date(edu.endDate).getFullYear()}</p>
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
                {user.skills && user.skills.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {user.skills.map((skill: any) => (
                      <Badge key={skill.id || skill.name} variant="secondary" className="text-sm py-1 px-3">
                        {skill.name}
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
                {user.targetRoles && user.targetRoles.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {user.targetRoles.map((role: any) => (
                      <Badge key={role.id || role.title} variant="outline" className="text-sm py-1 px-3">
                        {role.title}
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
                {user.resumeUrl ? (
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <FileText className="w-8 h-8 text-primary" />
                      <div>
                        <p className="font-medium">Resume.pdf</p>
                        <p className="text-sm text-muted-foreground">
                          Last updated: {new Date(user.lastLoginAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <a href={user.resumeUrl} target="_blank" rel="noopener noreferrer">
                        Download
                      </a>
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