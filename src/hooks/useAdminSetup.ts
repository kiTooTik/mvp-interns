import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';

const adminSetupSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

interface AdminSetupData {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export function useAdminSetup() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    checkExistingAdmin();
  }, [navigate]);

  const checkExistingAdmin = async () => {
    try {
      const { data: hasAdmin, error } = await supabase.rpc('has_any_admin');
      if (error) {
        console.error(error);
        setChecking(false);
        return;
      }
      if (hasAdmin) {
        navigate('/', { replace: true });
        return;
      }
      setChecking(false);
    } catch (error) {
      console.error('Error checking admin:', error);
      setChecking(false);
    }
  };

  const createAdmin = async (data: AdminSetupData) => {
    setError(null);
    setSuccess(null);

    try {
      // Validate form data
      adminSetupSchema.parse(data);
    } catch (err) {
      if (err instanceof z.ZodError) {
        setError(err.errors[0].message);
        return { success: false, error: err.errors[0].message };
      }
    }

    setIsLoading(true);
    const redirectUrl = `${window.location.origin}/`;

    try {
      // Create auth user
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: redirectUrl,
          data: { full_name: data.fullName },
        },
      });

      if (signUpError) {
        throw new Error(signUpError.message);
      }

      const userId = authData.user?.id;
      if (!userId) {
        throw new Error('Failed to create user.');
      }

      // Create profile (best-effort)
      await supabase.from('profiles').insert({
        user_id: userId,
        email: data.email,
        full_name: data.fullName,
      });

      // Assign admin role
      const { data: result, error: rpcError } = await supabase.rpc('ensure_first_admin', {
        p_user_id: userId,
      });

      if (rpcError) {
        throw new Error(rpcError.message);
      }

      const ok = result && typeof result === 'object' && (result as { ok?: boolean }).ok;
      if (!ok) {
        throw new Error((result as { error?: string })?.error ?? 'Could not assign admin role.');
      }

      // Handle success
      if (authData.session) {
        navigate('/', { replace: true });
      } else {
        setSuccess('Admin account created. Please check your email to confirm, then sign in.');
        setTimeout(() => navigate('/auth', { replace: true }), 1200);
      }

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  return {
    checking,
    isLoading,
    error,
    success,
    createAdmin,
    clearError: () => setError(null),
    clearSuccess: () => setSuccess(null),
  };
}
