import { ReactNode, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: 'admin' | 'intern';
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, role, loading } = useAuth();
  const location = useLocation();
  const [profileLoading, setProfileLoading] = useState(false);
  const [mustChangePassword, setMustChangePassword] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadProfileFlags() {
      if (!user || role !== 'intern') {
        setMustChangePassword(false);
        setProfileLoading(false);
        return;
      }

      setProfileLoading(true);
      try {
        const queryPromise = supabase
          .from('profiles')
          .select('first_login, default_password_used')
          .eq('user_id', user.id)
          .maybeSingle();

        let timeoutId: ReturnType<typeof setTimeout> | undefined;
        const timeoutPromise = new Promise<never>((_, reject) => {
          timeoutId = setTimeout(() => reject(new Error('Profile flag query timed out')), 8000);
        });

        let data: unknown;
        let error: unknown;
        try {
          ({ data, error } = await Promise.race([queryPromise, timeoutPromise]));
        } catch (e) {
          if (cancelled) return;
          console.error('Error fetching profile flags:', e);
          setMustChangePassword(false);
          return;
        } finally {
          if (timeoutId) clearTimeout(timeoutId);
        }

        const flags = data as unknown as {
          first_login?: boolean | null;
          default_password_used?: boolean | null;
        } | null;

        if (cancelled) return;
        if (error) {
          console.error('Error fetching profile flags:', error);
          setMustChangePassword(false);
          return;
        }

        setMustChangePassword(Boolean(flags?.first_login) && Boolean(flags?.default_password_used));
      } finally {
        if (!cancelled) setProfileLoading(false);
      }
    }

    loadProfileFlags();
    return () => {
      cancelled = true;
    };
  }, [user, role]);

  if (loading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    // Redirect to login page, but save the attempted url
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  if (requiredRole && role !== requiredRole) {
    // If the user doesn't have the required role, redirect appropriately
    if (role === 'admin') {
      return <Navigate to="/admin" replace />;
    } else if (role === 'intern') {
      return <Navigate to="/intern" replace />;
    } else {
      // No role assigned yet, redirect to a pending page or logout
      return <Navigate to="/auth" replace />;
    }
  }

  if (
    role === 'intern' &&
    mustChangePassword &&
    location.pathname !== '/intern/change-password'
  ) {
    return <Navigate to="/intern/change-password" replace />;
  }

  return <>{children}</>;
}