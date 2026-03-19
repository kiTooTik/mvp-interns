import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: 'admin' | 'intern';
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, role, loading, bootstrapTimedOut, forceSignOut } = useAuth();
  const location = useLocation();

  if (loading) {
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
    if (bootstrapTimedOut) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-6">
          <div className="max-w-md w-full text-center space-y-4">
            <h2 className="text-lg font-semibold">Still restoring your session</h2>
            <p className="text-sm text-muted-foreground">
              Your browser has a saved login, but it’s taking too long to restore after refresh. You can retry,
              or go back to the login page (this will sign you out on this device).
            </p>
            <div className="flex items-center justify-center gap-3">
              <Button variant="outline" onClick={() => window.location.reload()}>
                Retry
              </Button>
              <Button
                onClick={async () => {
                  await forceSignOut();
                }}
              >
                Go to login
              </Button>
            </div>
          </div>
        </div>
      );
    }
    // Redirect to login page, but save the attempted url
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // If user exists but role hasn't loaded yet, don't redirect away.
  // This avoids "refresh → /auth" when role fetch is slow.
  if (requiredRole && role === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your account...</p>
        </div>
      </div>
    );
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

  return <>{children}</>;
}