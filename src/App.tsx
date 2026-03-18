import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { ThemeProvider } from "@/hooks/useTheme";

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import AuthPage from "./pages/Auth";
import SetupPage from "./pages/Setup";
import AdminDashboard from "./pages/admin/Dashboard";
import InternManagement from "./pages/admin/InternManagement";
import AdminSettings from "./pages/admin/Settings";
import AdminChangePassword from "./pages/admin/ChangePassword";
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (role === "admin") return <Navigate to="/admin" replace />;
  if (role === "intern") return <Navigate to="/intern" replace />;
  return <Navigate to="/auth" replace />;
}

function RootRedirect() {
  const { user, loading } = useAuth();
  const [noAdmin, setNoAdmin] = useState<boolean | null>(null);
  const [rpcError, setRpcError] = useState<Error | null>(null);

  useEffect(() => {
    // Only check once when we know there is no logged-in user.
    if (loading || user || noAdmin !== null || rpcError) return;
    supabase
      .rpc("has_any_admin")
      .then(({ data, error }) => {
        if (error) {
          console.error("Error checking for admin:", error);
          setRpcError(error as Error);
          // Fallback: assume normal login flow should handle this.
          setNoAdmin(false);
          return;
        }
        setNoAdmin(data === false);
      })
      .catch((err) => {
        console.error("Unexpected error in has_any_admin RPC:", err);
        setRpcError(err as Error);
        setNoAdmin(false);
      });
  }, [loading, user, noAdmin, rpcError]);

  if (loading) return <RoleBasedRedirect />;

  if (user) return <RoleBasedRedirect />;
  if (rpcError) return <Navigate to="/auth" replace />;
  if (noAdmin === true) return <Navigate to="/setup" replace />;
  if (noAdmin === false) return <Navigate to="/auth" replace />;
  // Still determining whether any admin exists
  return <RoleBasedRedirect />;
}

const App = () => (
  <ThemeProvider>
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
              <Route path="/admin/change-password" element={<ProtectedRoute requiredRole="admin"><AdminChangePassword /></ProtectedRoute>} />

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
  </ThemeProvider>
);

export default App;

