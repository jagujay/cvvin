import { ReactNode, useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { SecureAvatar } from "@/components/ui/secure-avatar";
import { extractFileIdFromUrl, generateAvatarFallback } from "@/lib/image-utils";
import { consolidatedAPI } from "@/services/consolidatedAPI";
import Navigation from "./Navigation";
import Footer from "./Footer";

interface LayoutProps {
  children: ReactNode;
  showFooter?: boolean;
}

const Layout = ({ 
  children, 
  showFooter = true 
}: LayoutProps) => {
  const { currentUser } = useAuth();
  const [profileImageFile, setProfileImageFile] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  
  useEffect(() => {
    const loadUserProfile = async () => {
      if (!currentUser) {
        setProfileImageFile(null);
        setUserProfile(null);
        return;
      }

      try {
        // Fetch profile data and profile image in parallel
        const [profile, profileImage] = await Promise.all([
          consolidatedAPI.getUserProfile(currentUser).catch(() => null),
          consolidatedAPI.getProfileImageFile(currentUser).catch(() => null)
        ]);

        setUserProfile(profile);
        setProfileImageFile(profileImage);
      } catch (error) {
        // Silently fail - profile data is optional
      }
    };

    loadUserProfile();
  }, [currentUser]);
  
  const isAuthenticated = !!currentUser;
  const user = currentUser ? {
    fullName: userProfile 
      ? [userProfile.firstName, userProfile.lastName].filter(Boolean).join(' ') || "User"
      : currentUser.displayName || "User",
    profilePicture: profileImageFile 
      ? undefined // Will use fileId instead
      : userProfile?.profileImageUrl || currentUser.photoURL || undefined,
    profileImageFileId: profileImageFile?.id,
    isProfileComplete: userProfile ? 
      (userProfile.profileCompletionPercentage >= 100) : false
  } : undefined;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation isAuthenticated={isAuthenticated} user={user} />
      <main className="flex-1">
        {children}
      </main>
      {showFooter && <Footer />}
    </div>
  );
};

export default Layout;