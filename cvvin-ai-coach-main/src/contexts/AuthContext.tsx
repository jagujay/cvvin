import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { 
  User, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  updatePassword,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  UserCredential
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { otpService } from '@/services/otpService';

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  signup: (email: string, password: string, displayName: string) => Promise<UserCredential>;
  login: (email: string, password: string) => Promise<UserCredential>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateUserPassword: (newPassword: string) => Promise<void>;
  sendVerificationEmail: () => Promise<void>;
  sendCustomOTP: (email: string, type?: 'verification' | 'reset') => Promise<void>;
  verifyCustomOTP: (email: string, otp: string) => Promise<void>;
  googleSignIn: () => Promise<UserCredential>;
  updateUserProfile: (data: { displayName?: string; photoURL?: string }) => Promise<void>;
  isEmailVerified: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const signup = async (email: string, password: string, displayName: string): Promise<UserCredential> => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      const user = result.user;
      
      // Update the user's display name
      await updateProfile(user, { displayName });
      
      // Send email verification
      await sendEmailVerification(user);
      
      // Create user document in Firestore
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: user.email,
        displayName: displayName,
        createdAt: new Date().toISOString(),
        isProfileComplete: false,
        hasResume: false,
        hasJobDescription: false,
        profileCompletionSteps: {
          basicInfo: false,
          photo: false,
          education: false,
          skills: false,
          targetRoles: false,
          resume: false
        }
      });

      toast({
        title: "Account Created",
        description: "Please check your email to verify your account."
      });

      return result;
    } catch (error: any) {
      const errorMessage = getErrorMessage(error.code);
      toast({
        variant: "destructive",
        title: "Signup Failed",
        description: errorMessage
      });
      throw error;
    }
  };

  const login = async (email: string, password: string): Promise<UserCredential> => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      
      toast({
        title: "Login Successful",
        description: `Welcome back, ${result.user.displayName || 'User'}!`
      });

      return result;
    } catch (error: any) {
      const errorMessage = getErrorMessage(error.code);
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: errorMessage
      });
      throw error;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await signOut(auth);
      toast({
        title: "Logged Out",
        description: "You have been successfully logged out."
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Logout Failed",
        description: "An error occurred while logging out."
      });
      throw error;
    }
  };

  const resetPassword = async (email: string): Promise<void> => {
    try {
      await sendPasswordResetEmail(auth, email);
      toast({
        title: "Password Reset Email Sent",
        description: "Please check your email for password reset instructions."
      });
    } catch (error: any) {
      const errorMessage = getErrorMessage(error.code);
      toast({
        variant: "destructive",
        title: "Password Reset Failed",
        description: errorMessage
      });
      throw error;
    }
  };

  const updateUserPassword = async (newPassword: string): Promise<void> => {
    if (!currentUser) {
      throw new Error('No user is currently signed in');
    }

    try {
      await updatePassword(currentUser, newPassword);
      toast({
        title: "Password Updated",
        description: "Your password has been updated successfully."
      });
    } catch (error: any) {
      const errorMessage = getErrorMessage(error.code);
      toast({
        variant: "destructive",
        title: "Password Update Failed",
        description: errorMessage
      });
      throw error;
    }
  };

  const sendVerificationEmail = async (): Promise<void> => {
    if (!currentUser) return;
    
    try {
      await sendEmailVerification(currentUser);
      toast({
        title: "Verification Email Sent",
        description: "Please check your email to verify your account."
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Verification Email Failed",
        description: "An error occurred while sending verification email."
      });
      throw error;
    }
  };

  const sendCustomOTP = async (email: string, type: 'verification' | 'reset' = 'verification'): Promise<void> => {
    try {
      await otpService.sendOTP({ email, type });
      toast({
        title: "OTP Sent",
        description: `A verification code has been sent to ${email}`
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to Send OTP",
        description: error.message || "An error occurred while sending OTP."
      });
      throw error;
    }
  };

  const verifyCustomOTP = async (email: string, otp: string, type: 'verification' | 'reset' = 'verification'): Promise<void> => {
    try {
      await otpService.verifyOTP({ email, otp, type });
      toast({
        title: "OTP Verified",
        description: "Your verification code has been verified successfully."
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "OTP Verification Failed",
        description: error.message || "Invalid or expired OTP."
      });
      throw error;
    }
  };

  const googleSignIn = async (): Promise<UserCredential> => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      
      // Create user document if it doesn't exist
      const userDoc = await getDoc(doc(db, 'users', result.user.uid));
      if (!userDoc.exists()) {
        await setDoc(doc(db, 'users', result.user.uid), {
          uid: result.user.uid,
          email: result.user.email,
          displayName: result.user.displayName,
          photoURL: result.user.photoURL,
          createdAt: new Date().toISOString(),
          isProfileComplete: false,
          hasResume: false,
          hasJobDescription: false,
          profileCompletionSteps: {
            basicInfo: true,
            photo: !!result.user.photoURL,
            education: false,
            skills: false,
            targetRoles: false,
            resume: false
          }
        });
      }

      toast({
        title: "Login Successful",
        description: `Welcome, ${result.user.displayName || 'User'}!`
      });

      return result;
    } catch (error: any) {
      const errorMessage = getErrorMessage(error.code);
      toast({
        variant: "destructive",
        title: "Google Sign In Failed",
        description: errorMessage
      });
      throw error;
    }
  };

  const updateUserProfile = async (data: { displayName?: string; photoURL?: string }): Promise<void> => {
    if (!currentUser) return;
    
    try {
      await updateProfile(currentUser, data);
      
      // Update Firestore document
      await setDoc(doc(db, 'users', currentUser.uid), {
        displayName: data.displayName || currentUser.displayName,
        photoURL: data.photoURL || currentUser.photoURL,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully."
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Profile Update Failed",
        description: "An error occurred while updating your profile."
      });
      throw error;
    }
  };

  const isEmailVerified = currentUser?.emailVerified || false;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value: AuthContextType = {
    currentUser,
    loading,
    signup,
    login,
    logout,
    resetPassword,
    updateUserPassword,
    sendVerificationEmail,
    sendCustomOTP,
    verifyCustomOTP,
    googleSignIn,
    updateUserProfile,
    isEmailVerified
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

// Helper function to get user-friendly error messages
const getErrorMessage = (errorCode: string): string => {
  switch (errorCode) {
    case 'auth/user-not-found':
      return 'Incorrect Username or Password';
    case 'auth/wrong-password':
      return 'Incorrect Username or Password';
    case 'auth/invalid-credential':
      return 'Incorrect Username or Password';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists.';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters.';
    case 'auth/invalid-email':
      return 'Invalid email address.';
    case 'auth/user-disabled':
      return 'This account has been disabled.';
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Please try again later.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your connection.';
    case 'auth/popup-closed-by-user':
      return 'Sign-in popup was closed. Please try again.';
    case 'auth/cancelled-popup-request':
      return 'Sign-in popup was cancelled. Please try again.';
    default:
      return 'An error occurred. Please try again.';
  }
};
