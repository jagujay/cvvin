import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SecureAvatar } from "@/components/ui/secure-avatar";
import { extractFileIdFromUrl, generateAvatarFallback } from "@/lib/image-utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { User, LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import logoImage from "@/assets/Logo-NoBG-cropped.png";

interface NavigationProps {
  isAuthenticated?: boolean;
  user?: {
    fullName: string;
    profilePicture?: string;
    profileImageFileId?: string;
    isProfileComplete?: boolean;
  };
}

const Navigation = ({ isAuthenticated = false, user }: NavigationProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/");
    } catch (error) {
      // Error handling is done in the AuthContext
      console.error("Logout error:", error);
    }
  };

  return (
    <nav className="w-full bg-card border-b border-border shadow-soft">
      <div className="container mx-auto px-3 md:px-4 py-3 md:py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center transition-smooth hover:opacity-80">
            <img 
              src={logoImage} 
              alt="CVVIN Logo" 
              className="h-14 w-auto object-contain md:h-16 lg:h-20" 
            />
          </Link>

          {/* Right side content */}
          <div className="flex items-center space-x-4">
            {isAuthenticated && user ? (
              // Authenticated user dropdown
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-12 w-12 rounded-full">
                    <SecureAvatar 
                      className="h-12 w-12"
                      fileId={user.profileImageFileId || (user.profilePicture ? extractFileIdFromUrl(user.profilePicture) : undefined)}
                      imageUrl={user.profilePicture}
                      fallbackText={generateAvatarFallback(user.fullName)}
                      size={48}
                      quality={85}
                    />
                    {/* Profile completion badge */}
                    {user.isProfileComplete === false && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center">
                        <span className="text-xs text-white font-bold">!</span>
                      </div>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <div className="flex flex-col space-y-1 p-2">
                    <p className="text-sm font-medium leading-none">{user.fullName}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      Welcome to CVVIN
                    </p>
                  </div>
                  <DropdownMenuItem asChild>
                    <Link to="/profile" className="flex items-center">
                      <User className="mr-2 h-4 w-4" />
                      <span>Profile</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              // Non-authenticated user
              <Button asChild variant="default" className="shadow-soft">
                <Link to="/auth">Log In</Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;