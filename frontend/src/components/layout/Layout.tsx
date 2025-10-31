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
        // For new users, getUserProfile will return empty profile structure seamlessly
        // For existing users, it returns their actual data
        // Profile image is optional and should never block the UI
        const [profile, profileImage] = await Promise.all([
          consolidatedAPI.getUserProfile(currentUser).catch((error) => {
            // If profile fetch fails, return a minimal profile structure
            console.warn('Profile fetch failed, using defaults:', error);
            return {
              id: '',
              firebase_uid: currentUser.uid,
              email: currentUser.email || '',
              firstName: currentUser.displayName?.split(' ')[0] || null,
              lastName: currentUser.displayName?.split(' ').slice(1).join(' ') || null,
              phone: null,
              profileImageUrl: currentUser.photoURL || null,
              isActive: true,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              preferences: { targetRoles: [] },
              profile: {
                resumeUrl: null,
                skills: [],
                education: [],
                certifications: [],
                languages: []
              }
            };
          }),
          // Profile image fetching should never fail - catch and continue
          consolidatedAPI.getProfileImageFile(currentUser).catch(() => null)
        ]);

        setUserProfile(profile);
        setProfileImageFile(profileImage);
      } catch (error) {
        // Silently fail - use Firebase user data as fallback
        console.warn('Failed to load user profile:', error);
        setUserProfile(null);
        setProfileImageFile(null);
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