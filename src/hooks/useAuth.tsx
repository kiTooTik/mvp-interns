import { useState, useEffect, createContext, useContext, ReactNode, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

type AppRole = 'admin' | 'intern' | null;

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: AppRole;
  loading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUpWithEmail: (email: string, password: string, fullName: string, inviteToken?: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole>(null);
  const [loading, setLoading] = useState(true);
  const bootstrappedRef = useRef(false);

  const fetchUserRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching user role:', error);
        return null;
      }

      return data?.role as AppRole;
    } catch (err) {
      console.error('Error in fetchUserRole:', err);
      return null;
    }
  };

  useEffect(() => {
    // Marker is informational only (do not auto-clear sessions on deploy change).
    // We still record it so we can correlate user reports to env/build changes.
    const markerKey = 'mvp-interns-auth-marker';
    const currentMarker = `${import.meta.env.VITE_SUPABASE_URL ?? ''}|${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? ''}`;
    try {
      localStorage.setItem(markerKey, currentMarker);
    } catch {
      // Ignore storage errors (private mode, blocked storage, etc.)
    }

    // Last-resort safety net: if auth boot hangs for too long and a stored session exists,
    // clear Supabase auth storage so the app can recover. This should be rare.
    const bootTimeout = window.setTimeout(async () => {
      if (bootstrappedRef.current) return;
      let hasStoredSession = false;
      try {
        const check = (store: Storage) => {
          for (let i = 0; i < store.length; i += 1) {
            const k = store.key(i);
            if (k && k.startsWith('sb-') && k.includes('-auth-token')) return true;
          }
          return false;
        };
        hasStoredSession = check(localStorage) || check(sessionStorage);
      } catch {
        // ignore
      }

      if (!hasStoredSession) {
        // If there's no stored session, don't force a sign-out; just allow the app to proceed.
        setLoading(false);
        bootstrappedRef.current = true;
        return;
      }

      console.error('Auth bootstrap timeout with stored session: clearing auth storage');
      try {
        const clearSb = (store: Storage) => {
          for (let i = store.length - 1; i >= 0; i -= 1) {
            const k = store.key(i);
            if (k && k.startsWith('sb-')) store.removeItem(k);
          }
        };
        clearSb(localStorage);
        clearSb(sessionStorage);
      } catch {
        // ignore
      }
      try {
        // Best-effort; may fail if session is already broken.
        await supabase.auth.signOut();
      } catch {
        // ignore
      }
      setSession(null);
      setUser(null);
      setRole(null);
      setLoading(false);
      bootstrappedRef.current = true;
    }, 20000);

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // USER_UPDATED fires after updateUser() calls (e.g. password change).
        // The user and role haven't changed, so we only update the session/user
        // objects and skip the role re-fetch to prevent a brief role=null flicker
        // that would cause ProtectedRoute to redirect before success toasts show.
        if (event === 'USER_UPDATED') {
          setSession(session);
          setUser(session?.user ?? null);
          return;
        }

        setSession(session);
        setUser(session?.user ?? null);

        if (event === 'SIGNED_OUT') {
          setRole(null);
          setLoading(false);
          bootstrappedRef.current = true;
          return;
        }

        // Fetch role when user changes (sign-in, token refresh, etc.)
        if (session?.user) {
          const userRole = await fetchUserRole(session.user.id);
          setRole(userRole);
          setLoading(false);
          bootstrappedRef.current = true;
        } else {
          setRole(null);
          setLoading(false);
          bootstrappedRef.current = true;
        }
      }
    );

    // THEN check for existing session
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          fetchUserRole(session.user.id).then((fetchedRole) => {
            setRole(fetchedRole);
            setLoading(false);
            bootstrappedRef.current = true;
          });
        } else {
          setLoading(false);
          bootstrappedRef.current = true;
        }
      })
      .catch((error) => {
        console.error('Error getting existing session:', error);
        // Treat as signed-out on failure so the app can recover gracefully.
        setSession(null);
        setUser(null);
        setRole(null);
        setLoading(false);
        bootstrappedRef.current = true;
      });

    return () => {
      window.clearTimeout(bootTimeout);
      subscription.unsubscribe();
    };
  }, []);


  const signInWithEmail = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signUpWithEmail = async (
    email: string,
    password: string,
    fullName: string,
    inviteToken?: string
  ) => {
    try {
      const redirectUrl = `${window.location.origin}/`;

      // First, sign up the user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName,
          },
        },
      });

      if (authError) {
        return { error: authError };
      }

      if (!authData.user) {
        return { error: new Error('Failed to create user account') };
      }

      // Create profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          user_id: authData.user.id,
          email: email,
          full_name: fullName,
        });

      if (profileError) {
        console.error('Profile creation error:', profileError);
        // Don't fail registration if profile creation fails
      }

      // If there's an invite token, mark it as used and assign intern role via RPC
      if (inviteToken) {
        const { data: inviteResult, error: inviteError } = await supabase.rpc('consume_invite', {
          p_token: inviteToken,
          p_user_id: authData.user.id,
        });

        if (inviteError) {
          console.error('Invite validation error:', inviteError);
        } else if (inviteResult && typeof inviteResult === 'object' && !(inviteResult as { ok?: boolean }).ok) {
          console.error('Invite invalid or expired:', (inviteResult as { error?: string }).error);
        }
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signInWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      });
      return { error };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        role,
        loading,
        signInWithEmail,
        signUpWithEmail,
        signInWithGoogle,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}