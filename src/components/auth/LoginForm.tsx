import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, Loader2, Mail, Lock, Clock, Eye, EyeOff } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { z } from 'zod';
import { setRememberMePreference, supabase } from '@/integrations/supabase/client';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

interface LoginFormProps {
  defaultTab?: 'login' | 'signup';
}

export function LoginForm({ defaultTab = 'login' }: LoginFormProps) {
  const navigate = useNavigate();
  const { signInWithEmail } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  useEffect(() => {
    try {
      const v = localStorage.getItem('mvp-interns-remember-me');
      setRememberMe(v === '1');
    } catch {
      setRememberMe(false);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      loginSchema.parse({ email: loginEmail, password: loginPassword });
    } catch (err) {
      if (err instanceof z.ZodError) {
        setError(err.errors[0].message);
        return;
      }
    }

    setIsLoading(true);
    setRememberMePreference(rememberMe);
    // Sign in using the single Supabase client instance.
    // Storage is chosen on startup; if user toggled Remember me, reload after login
    // so the app re-initializes with the correct storage choice.
    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPassword,
    });
    setIsLoading(false);

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        setError('Invalid email or password. Please try again.');
      } else {
        setError(error.message);
      }
    } else {
      // Full reload ensures we don't have multiple GoTrue clients and we apply
      // the remember-me storage selection consistently.
      window.location.href = '/';
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden gradient-bg">
      {/* Decorative blurred blobs */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-30 blur-3xl"
        style={{ background: 'hsl(210, 100%, 55%)' }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-32 -right-32 w-[28rem] h-[28rem] rounded-full opacity-25 blur-3xl"
        style={{ background: 'hsl(213, 78%, 40%)' }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full opacity-10 blur-2xl"
        style={{ background: 'hsl(199, 89%, 70%)' }}
      />

      <div className="w-full max-w-md animate-fade-in relative z-10">
        {/* Logo + title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-18 h-18 mb-5 relative">
            {/* Glow ring */}
            <div
              className="absolute inset-0 rounded-full blur-xl opacity-60"
              style={{ background: 'hsl(270, 70%, 65%)' }}
            />
            <div className="relative w-20 h-20 rounded-full gradient-bg flex items-center justify-center shadow-2xl glow-primary">
              <Clock className="w-9 h-9 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight mt-2">
            Intern Attendance
          </h1>
          <p className="text-white/70 mt-2 text-sm">
            Track your internship hours efficiently
          </p>
        </div>

        {/* Glass card */}
        <div className="glass-card rounded-2xl shadow-2xl overflow-hidden">
          {error && (
            <div className="px-6 pt-5">
              <Alert variant="destructive" className="border-red-400/30 bg-red-500/10 text-red-200">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            </div>
          )}

          <div className="px-6 pt-6 pb-2">
            <h2 className="text-xl font-semibold text-foreground dark:text-white/90">Welcome back</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Sign in to access your attendance dashboard
            </p>
          </div>

          <div className="p-6 pt-4 space-y-4">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-email" className="text-foreground dark:text-white/80 font-medium">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="you@company.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="pl-10 bg-background/60 dark:bg-white/5 border-border dark:border-white/10 focus:border-primary dark:focus:border-primary backdrop-blur-sm transition-colors"
                    disabled={isLoading}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-password" className="text-foreground dark:text-white/80 font-medium">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="pl-10 pr-10 bg-background/60 dark:bg-white/5 border-border dark:border-white/10 focus:border-primary dark:focus:border-primary backdrop-blur-sm transition-colors"
                    disabled={isLoading}
                    required
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-2 top-2.5 rounded-md p-1 text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    onClick={() => setShowPassword((s) => !s)}
                    disabled={isLoading}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="remember-me"
                    checked={rememberMe}
                    onCheckedChange={(v) => setRememberMe(v === true)}
                    disabled={isLoading}
                  />
                  <Label htmlFor="remember-me" className="text-sm text-foreground dark:text-white/80">
                    Remember me
                  </Label>
                </div>
              </div>
              <Button
                type="submit"
                className="w-full gradient-bg hover:opacity-90 transition-opacity text-white font-semibold shadow-lg glow-primary-sm mt-2"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>
          </div>
        </div>

        <p className="text-center text-xs text-white/50 mt-6">
          © {new Date().getFullYear()} Intern Attendance System. All rights reserved.
        </p>
      </div>
    </div>
  );
}
