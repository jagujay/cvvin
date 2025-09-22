import { ReactNode } from "react";
import Navigation from "./Navigation";
import Footer from "./Footer";

interface LayoutProps {
  children: ReactNode;
  isAuthenticated?: boolean;
  user?: {
    fullName: string;
    profilePicture?: string;
    isProfileComplete?: boolean;
  };
  showFooter?: boolean;
}

const Layout = ({ 
  children, 
  isAuthenticated = false, 
  user, 
  showFooter = true 
}: LayoutProps) => {
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