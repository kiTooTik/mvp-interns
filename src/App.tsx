import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import AuthPage from "./pages/Auth";
import SetupPage from "./pages/Setup";
import AdminDashboard from "./pages/admin/Dashboard";
import InternManagement from "./pages/admin/InternManagement";
import AdminSettings from "./pages/admin/Settings";
import AllowancePage from "./pages/admin/Allowance";
import CalendarPage from "./pages/admin/Calendar";
import CorrectionsPage from "./pages/admin/Corrections";
import InternHome from "./pages/intern/Home";
import InternAttendance from "./pages/intern/Attendance";
import InternProfile from "./pages/intern/Profile";
import ChangePassword from "./pages/auth/ChangePassword";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function RoleBasedRedirect() {
  const { role, loading } = useAuth();

  if (loading) return null;

  if (role === "admin") return <Navigate to="/admin" replace />;
  if (role === "intern") return <Navigate to="/intern" replace />;
  return <Navigate to="/auth" replace />;
}

function RootRedirect() {
  const { user, loading } = useAuth();
  const [noAdmin, setNoAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    if (loading || user) return;
    supabase.rpc("has_any_admin").then(({ data }) => {
      setNoAdmin(data === false);
    });
  }, [loading, user]);

  if (loading) return null;
  if (user) return <RoleBasedRedirect />;
  if (noAdmin === true) return <Navigate to="/setup" replace />;
  if (noAdmin === false) return <Navigate to="/auth" replace />;
  return null;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<RootRedirect />} />
            <Route path="/setup" element={<SetupPage />} />
            <Route path="/auth" element={<AuthPage />} />
            
            {/* Admin Routes */}
            <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/interns" element={<ProtectedRoute requiredRole="admin"><InternManagement /></ProtectedRoute>} />
            <Route path="/admin/allowance" element={<ProtectedRoute requiredRole="admin"><AllowancePage /></ProtectedRoute>} />
            <Route path="/admin/calendar" element={<ProtectedRoute requiredRole="admin"><CalendarPage /></ProtectedRoute>} />
            <Route path="/admin/corrections" element={<ProtectedRoute requiredRole="admin"><CorrectionsPage /></ProtectedRoute>} />
            <Route path="/admin/settings" element={<ProtectedRoute requiredRole="admin"><AdminSettings /></ProtectedRoute>} />
            
            {/* Intern Routes */}
            <Route path="/intern" element={<ProtectedRoute requiredRole="intern"><InternHome /></ProtectedRoute>} />
            <Route path="/intern/attendance" element={<ProtectedRoute requiredRole="intern"><InternAttendance /></ProtectedRoute>} />
            <Route path="/intern/profile" element={<ProtectedRoute requiredRole="intern"><InternProfile /></ProtectedRoute>} />
            <Route path="/intern/change-password" element={<ProtectedRoute requiredRole="intern"><ChangePassword /></ProtectedRoute>} />
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
