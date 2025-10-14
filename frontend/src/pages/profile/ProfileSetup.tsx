import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Upload, Plus, X, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/layout/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { consolidatedAPI } from "@/services/consolidatedAPI";
import skillsData from "@/mock/skills.json";

const ProfileSetup = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const demoUserType = location.state?.demoUserType || 'new';
  
  const [formData, setFormData] = useState({
    profilePicture: "",
    profileImageFile: null as File | null,
    firstName: "",
    lastName: "",
    email: currentUser?.email || "",
    countryCode: "+1",
    phoneNumber: "",
    qualification: "",
    qualificationOther: "",
    college: "",
    currentSemester: "",
    yearOfPassing: "",
    skills: [] as string[],
    interestedRoles: [] as string[],
    resume: null as File | null
  });

  const [newSkill, setNewSkill] = useState("");
  const [newRole, setNewRole] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [skillSuggestions, setSkillSuggestions] = useState<string[]>([]);
  const [roleSuggestions, setRoleSuggestions] = useState<string[]>([]);
  const [showSkillSuggestions, setShowSkillSuggestions] = useState(false);
  const [showRoleSuggestions, setShowRoleSuggestions] = useState(false);

  // Load existing user data if available
  useEffect(() => {
    const loadUserData = async () => {
      if (!currentUser) return;
      
      try {
        // First, sync the user to ensure they exist in the database
        await consolidatedAPI.syncUser(currentUser);
        
        // Then try to load existing profile
        const profile = await consolidatedAPI.getUserProfile(currentUser);
        if (profile) {
          setFormData(prev => ({
            ...prev,
            firstName: profile.firstName || "",
            lastName: profile.lastName || "",
            email: profile.email,
            phoneNumber: profile.phone || "",
            profilePicture: profile.profileImageUrl || "",
            skills: profile.profile?.skills || [],
            interestedRoles: profile.preferences?.targetRoles || []
          }));
        }
      } catch (error) {
        // Profile doesn't exist yet, that's okay for new users
        console.log('No existing profile found, starting fresh');
      }
    };

    loadUserData();
  }, [currentUser]);

  const handleSkillInputChange = (value: string) => {
    setNewSkill(value);
    if (value.length > 0) {
      const filtered = skillsData.suggestedSkills.filter(skill =>
        skill.toLowerCase().includes(value.toLowerCase()) &&
        !formData.skills.includes(skill)
      ).slice(0, 8);
      setSkillSuggestions(filtered);
      setShowSkillSuggestions(true);
    } else {
      setShowSkillSuggestions(false);
    }
  };

  const handleRoleInputChange = (value: string) => {
    setNewRole(value);
    if (value.length > 0) {
      const filtered = skillsData.suggestedRoles.filter(role =>
        role.toLowerCase().includes(value.toLowerCase()) &&
        !formData.interestedRoles.includes(role)
      ).slice(0, 8);
      setRoleSuggestions(filtered);
      setShowRoleSuggestions(true);
    } else {
      setShowRoleSuggestions(false);
    }
  };

  const addSkill = (skill: string) => {
    if (skill && !formData.skills.includes(skill)) {
      setFormData({ ...formData, skills: [...formData.skills, skill] });
    }
    setNewSkill("");
    setShowSkillSuggestions(false);
  };

  const removeSkill = (skillToRemove: string) => {
    setFormData({
      ...formData,
      skills: formData.skills.filter(skill => skill !== skillToRemove)
    });
  };

  const addRole = (role: string) => {
    if (role && !formData.interestedRoles.includes(role)) {
      setFormData({ ...formData, interestedRoles: [...formData.interestedRoles, role] });
    }
    setNewRole("");
    setShowRoleSuggestions(false);
  };

  const removeRole = (roleToRemove: string) => {
    setFormData({
      ...formData,
      interestedRoles: formData.interestedRoles.filter(role => role !== roleToRemove)
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
          variant: "destructive",
          title: "File Too Large",
          description: "Please upload a file smaller than 5MB."
        });
        return;
      }
      setFormData({ ...formData, resume: file });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentUser) {
      toast({
        variant: "destructive",
        title: "Authentication Required",
        description: "Please log in to complete your profile."
      });
      return;
    }

    setIsLoading(true);

    // Validation
    if (!formData.firstName || !formData.lastName) {
      toast({
        variant: "destructive",
        title: "Name Required",
        description: "Please enter both first name and last name."
      });
      setIsLoading(false);
      return;
    }

    if (formData.skills.length === 0) {
      toast({
        variant: "destructive",
        title: "Skills Required",
        description: "Please add at least one skill."
      });
      setIsLoading(false);
      return;
    }

    if (formData.interestedRoles.length === 0) {
      toast({
        variant: "destructive",
        title: "Roles Required",
        description: "Please add at least one interested role."
      });
      setIsLoading(false);
      return;
    }

    if (!formData.resume) {
      toast({
        variant: "destructive",
        title: "Resume Required",
        description: "Please upload your resume."
      });
      setIsLoading(false);
      return;
    }

    try {
      // Upload profile image first if provided
      let profileImageUrl = formData.profilePicture && formData.profilePicture !== "" ? formData.profilePicture : null;
      if (formData.profileImageFile) {
        const imageUploadResult = await consolidatedAPI.uploadProfileImage(currentUser, formData.profileImageFile);
        profileImageUrl = imageUploadResult.imageUrl;
      }

      // Upload resume file first
      let resumeUrl = "";
      if (formData.resume) {
        const uploadResult = await consolidatedAPI.uploadFile(currentUser, formData.resume);
        resumeUrl = uploadResult.fileId; // Use fileId as reference
      }

      // Prepare profile data
      const profileData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phoneNumber ? `${formData.countryCode}${formData.phoneNumber}` : null,
        profileImageUrl: profileImageUrl,
        resumeUrl,
        skills: formData.skills,
        experienceYears: null, // Could be calculated from education
        education: formData.college ? [{
          degree: formData.qualification === 'other' ? formData.qualificationOther : formData.qualification,
          institution: formData.college,
          startDate: formData.yearOfPassing ? `${formData.yearOfPassing}-01-01` : null,
          endDate: formData.yearOfPassing ? `${formData.yearOfPassing}-12-31` : null,
          gpa: null
        }] : [],
        certifications: [],
        languages: [],
        targetRoles: formData.interestedRoles
      };

      // Update user profile
      await consolidatedAPI.updateUserProfile(currentUser, profileData);

      toast({
        title: "Profile Completed!",
        description: "Welcome to CVVIN! Your profile has been set up successfully."
      });
      
      navigate("/dashboard", { state: { demoUserType: 'returning' } });
    } catch (error: any) {
      console.error('Profile setup failed:', error);
      toast({
        variant: "destructive",
        title: "Profile Setup Failed",
        description: error.message || "Failed to save your profile. Please try again."
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    navigate("/dashboard", { state: { demoUserType: 'new' } });
  };

  return (
    <Layout 
      isAuthenticated={!!currentUser} 
      user={{ 
        fullName: `${formData.firstName} ${formData.lastName}` || currentUser?.displayName || "User", 
        profilePicture: currentUser?.photoURL 
      }}
    >
      <div className="container mx-auto px-6 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold">Complete Your Profile</h1>
              <p className="text-muted-foreground mt-2">
                Help us personalize your interview experience
              </p>
            </div>
            <Button variant="ghost" onClick={handleSkip}>
              Skip for now
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Basic Information */}
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-medium">
                    1
                  </div>
                  Basic Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Profile Picture */}
                <div className="flex items-center space-x-4">
                  <Avatar className="w-20 h-20">
                    <AvatarImage src={formData.profilePicture} />
                    <AvatarFallback className="bg-muted">
                      <Upload className="w-8 h-8 text-muted-foreground" />
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <Label htmlFor="profile-picture" className="block text-sm font-medium mb-2">
                      Profile Picture
                    </Label>
                    <Button type="button" variant="outline" size="sm" className="relative overflow-hidden">
                      <input
                        id="profile-picture"
                        type="file"
                        accept="image/*"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (e) => setFormData({ 
                              ...formData, 
                              profilePicture: e.target?.result as string,
                              profileImageFile: file
                            });
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                      Upload Photo
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input
                      id="firstName"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      placeholder="Enter your first name"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input
                      id="lastName"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      placeholder="Enter your last name"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      value={formData.email}
                      disabled
                      className="mt-1 bg-muted"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="phoneNumber">Phone Number</Label>
                  <div className="flex gap-2 mt-1">
                    <Select
                      value={formData.countryCode}
                      onValueChange={(value) => setFormData({ ...formData, countryCode: value })}
                    >
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="+1">🇺🇸 +1</SelectItem>
                        <SelectItem value="+44">🇬🇧 +44</SelectItem>
                        <SelectItem value="+91">🇮🇳 +91</SelectItem>
                        <SelectItem value="+86">🇨🇳 +86</SelectItem>
                        <SelectItem value="+81">🇯🇵 +81</SelectItem>
                        <SelectItem value="+49">🇩🇪 +49</SelectItem>
                        <SelectItem value="+33">🇫🇷 +33</SelectItem>
                        <SelectItem value="+61">🇦🇺 +61</SelectItem>
                        <SelectItem value="+7">🇷🇺 +7</SelectItem>
                        <SelectItem value="+55">🇧🇷 +55</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      id="phoneNumber"
                      value={formData.phoneNumber}
                      onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                      placeholder="(555) 123-4567"
                      className="flex-1"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Education */}
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-medium">
                    2
                  </div>
                  Education
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="qualification">Qualification</Label>
                    <Select onValueChange={(value) => setFormData({ ...formData, qualification: value })}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select qualification" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="btech">B.Tech</SelectItem>
                        <SelectItem value="mtech">M.Tech</SelectItem>
                        <SelectItem value="bca">BCA</SelectItem>
                        <SelectItem value="mca">MCA</SelectItem>
                        <SelectItem value="bsc">B.Sc</SelectItem>
                        <SelectItem value="msc">M.Sc</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    {formData.qualification === "other" && (
                      <Input
                        value={formData.qualificationOther}
                        onChange={(e) => setFormData({ ...formData, qualificationOther: e.target.value })}
                        placeholder="Please specify your qualification"
                        className="mt-2"
                      />
                    )}
                  </div>
                  <div>
                    <Label htmlFor="college">College/University</Label>
                    <Input
                      id="college"
                      value={formData.college}
                      onChange={(e) => setFormData({ ...formData, college: e.target.value })}
                      placeholder="Enter your college name"
                      className="mt-1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="currentSemester">Current Semester/Year</Label>
                    <Input
                      id="currentSemester"
                      value={formData.currentSemester}
                      onChange={(e) => setFormData({ ...formData, currentSemester: e.target.value })}
                      placeholder="e.g., 8th Semester"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="yearOfPassing">Year of Passing</Label>
                    <Input
                      id="yearOfPassing"
                      value={formData.yearOfPassing}
                      onChange={(e) => setFormData({ ...formData, yearOfPassing: e.target.value })}
                      placeholder="e.g., 2024"
                      className="mt-1"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Skills */}
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-medium">
                    3
                  </div>
                  Skills *
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <div className="flex gap-2">
                    <Input
                      value={newSkill}
                      onChange={(e) => handleSkillInputChange(e.target.value)}
                      placeholder="Type to search skills (e.g., 'py' for Python)"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addSkill(newSkill);
                        }
                        if (e.key === "Escape") {
                          setShowSkillSuggestions(false);
                        }
                      }}
                      onFocus={() => newSkill.length > 0 && setShowSkillSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowSkillSuggestions(false), 150)}
                    />
                    <Button
                      type="button"
                      onClick={() => addSkill(newSkill)}
                      disabled={!newSkill}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  {/* Autocomplete Dropdown */}
                  {showSkillSuggestions && skillSuggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-12 z-10 mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
                      {skillSuggestions.map((skill, index) => (
                        <button
                          key={skill}
                          type="button"
                          className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            addSkill(skill);
                          }}
                        >
                          {skill}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-2">Suggested skills:</p>
                  <div className="flex flex-wrap gap-2">
                    {skillsData.suggestedSkills.slice(0, 15).map((skill) => (
                      <Button
                        key={skill}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addSkill(skill)}
                        disabled={formData.skills.includes(skill)}
                        className="text-xs"
                      >
                        {skill}
                      </Button>
                    ))}
                  </div>
                </div>

                {formData.skills.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">Your skills:</p>
                    <div className="flex flex-wrap gap-2">
                      {formData.skills.map((skill) => (
                        <Badge key={skill} variant="secondary" className="gap-1">
                          {skill}
                          <button
                            type="button"
                            onClick={() => removeSkill(skill)}
                            className="hover:text-destructive"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Interested Roles */}
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-medium">
                    4
                  </div>
                  Interested Roles *
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <div className="flex gap-2">
                    <Input
                      value={newRole}
                      onChange={(e) => handleRoleInputChange(e.target.value)}
                      placeholder="Type to search roles (e.g., 'front' for Frontend Developer)"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addRole(newRole);
                        }
                        if (e.key === "Escape") {
                          setShowRoleSuggestions(false);
                        }
                      }}
                      onFocus={() => newRole.length > 0 && setShowRoleSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowRoleSuggestions(false), 150)}
                    />
                    <Button
                      type="button"
                      onClick={() => addRole(newRole)}
                      disabled={!newRole}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  {/* Autocomplete Dropdown */}
                  {showRoleSuggestions && roleSuggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-12 z-10 mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
                      {roleSuggestions.map((role, index) => (
                        <button
                          key={role}
                          type="button"
                          className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            addRole(role);
                          }}
                        >
                          {role}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-2">Suggested roles:</p>
                  <div className="flex flex-wrap gap-2">
                    {skillsData.suggestedRoles.slice(0, 10).map((role) => (
                      <Button
                        key={role}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addRole(role)}
                        disabled={formData.interestedRoles.includes(role)}
                        className="text-xs"
                      >
                        {role}
                      </Button>
                    ))}
                  </div>
                </div>

                {formData.interestedRoles.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">Your interested roles:</p>
                    <div className="flex flex-wrap gap-2">
                      {formData.interestedRoles.map((role) => (
                        <Badge key={role} variant="secondary" className="gap-1">
                          {role}
                          <button
                            type="button"
                            onClick={() => removeRole(role)}
                            className="hover:text-destructive"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Resume */}
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-medium">
                    5
                  </div>
                  Resume *
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.txt"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="resume-upload"
                  />
                  <label htmlFor="resume-upload" className="cursor-pointer">
                    <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-lg font-medium mb-2">
                      {formData.resume ? formData.resume.name : "Choose your resume file"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Supported formats: PDF, DOC, DOCX, TXT (Max 5MB)
                    </p>
                  </label>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex gap-4 justify-end">
              <Button type="button" variant="ghost" onClick={handleSkip}>
                Skip for now
              </Button>
              <Button type="submit" disabled={isLoading || !currentUser} className="px-8">
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : !currentUser ? (
                  "Please Log In"
                ) : (
                  "Save & Continue"
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
};

export default ProfileSetup;