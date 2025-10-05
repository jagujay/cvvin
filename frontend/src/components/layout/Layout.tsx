import { ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
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
  
  const isAuthenticated = !!currentUser;
  const user = currentUser ? {
    fullName: currentUser.displayName || "User",
    profilePicture: currentUser.photoURL || undefined,
    isProfileComplete: false // This would come from Firestore in a real implementation
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