import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import Login from "./pages/auth/Login";
import VerifyOTP from "./pages/auth/VerifyOTP";
import ForgotPassword from "./pages/auth/ForgotPassword";
import VerifyResetCode from "./pages/auth/VerifyResetCode";
import SetNewPassword from "./pages/auth/SetNewPassword";
import ProfileSetup from "./pages/profile/ProfileSetup";
import Profile from "./pages/profile/Profile";
import Dashboard from "./pages/Dashboard";
import ResumeAnalysis from "./pages/ResumeAnalysis";
import PreInterviewSetup from "./pages/interview/PreInterviewSetup";
import FullMockInterview from "./pages/interview/FullMockInterview";
import TechnicalLanding from "./pages/technical/TechnicalLanding";
import MCQTest from "./pages/technical/MCQTest";
import CodingChallenge from "./pages/technical/CodingChallenge";
import HRLanding from "./pages/hr/HRLanding";
import HRSession from "./pages/hr/HRSession";
import FeedbackList from "./pages/feedback/FeedbackList";
import FeedbackDetail from "./pages/feedback/FeedbackDetail";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/auth" element={<Login />} />
          <Route path="/auth/verify-otp" element={<VerifyOTP />} />
          <Route path="/auth/forgot-password" element={<ForgotPassword />} />
          <Route path="/auth/verify-reset-code" element={<VerifyResetCode />} />
          <Route path="/auth/set-new-password" element={<SetNewPassword />} />
          <Route path="/profile-setup" element={<ProfileSetup />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/profile/edit" element={<ProfileSetup />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/resume-analysis" element={<ResumeAnalysis />} />
          <Route path="/interview/full-mock" element={<FullMockInterview />} />
          <Route path="/interview/setup" element={<PreInterviewSetup />} />
          <Route path="/technical-interview" element={<TechnicalLanding />} />
          <Route path="/technical-interview/mcq" element={<MCQTest />} />
          <Route path="/technical-interview/coding" element={<CodingChallenge />} />
          <Route path="/hr-interview" element={<HRLanding />} />
          <Route path="/hr-interview/session" element={<HRSession />} />
          <Route path="/feedback" element={<FeedbackList />} />
          <Route path="/feedback/:sessionId" element={<FeedbackDetail />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
