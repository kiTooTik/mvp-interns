import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { Loader2, Lock, Eye, EyeOff, CheckCircle2 } from 'lucide-react';

export default function ChangePassword() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);

  // Check if user exists
  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
  }, [user, navigate]);

  // Password strength checker
  const checkPasswordStrength = (password: string) => {
    let strength = 0;

    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength++;

    return strength;
  };

  useEffect(() => {
    setPasswordStrength(checkPasswordStrength(newPassword));
  }, [newPassword]);

  const getPasswordStrengthColor = () => {
    if (passwordStrength <= 2) return 'text-red-500';
    if (passwordStrength <= 3) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getPasswordStrengthText = () => {
    if (passwordStrength <= 2) return 'Weak';
    if (passwordStrength <= 3) return 'Medium';
    return 'Strong';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast({
        title: 'Error',
        description: 'Passwords do not match',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword.length < 8) {
      toast({
        title: 'Error',
        description: 'Password must be at least 8 characters',
        variant: 'destructive',
      });
      return;
    }

    if (passwordStrength < 3) {
      toast({
        title: 'Error',
        description: 'Please choose a stronger password',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    console.log('Starting password change process for user:', user?.id);

    try {
      console.log('Step 1: Updating Supabase Auth password');

      const { error: authError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (authError) {
        console.error('Auth password update failed:', authError);
        throw new Error(authError.message || 'Failed to update password. Please try again.');
      }

      console.log('Step 2: Password updated in Supabase Auth');

      // Show success state on button + toast
      setSuccess(true);
      toast({
        title: '✅ Password Updated!',
        description: 'Your password has been changed. Redirecting to dashboard...',
      });

      // Wait 2.5 seconds then redirect
      setTimeout(() => {
        console.log('Step 3: Redirecting to /intern');
        navigate('/intern');
      }, 2500);

      // Optional: Try to update profile flags in background (won't block redirect)
      supabase
        .from('profiles')
        .update({
          first_login: false,
          default_password_used: false,
          password_changed_at: new Date().toISOString(),
        } as any)
        .eq('user_id', user?.id)
        .then(({ error }) => {
          if (error) {
            console.warn('Profile update failed (non-critical):', error);
          } else {
            console.log('Profile flags updated successfully');
          }
        });

    } catch (error) {
      console.error('Error updating password:', error);
      const message =
        error instanceof Error && error.message
          ? error.message
          : 'Failed to update password. Please try again.';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="w-full max-w-md">
        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <Lock className="h-6 w-6 text-blue-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">
              Change Your Password
            </CardTitle>
            <p className="text-sm text-gray-600 mt-2">
              Update your password preference for enhanced security.
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter your new password"
                    className="pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {newPassword && (
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${passwordStrength <= 2 ? 'bg-red-500' :
                          passwordStrength <= 3 ? 'bg-yellow-500' : 'bg-green-500'
                          }`}
                        style={{ width: `${(passwordStrength / 5) * 100}%` }}
                      />
                    </div>
                    <span className={`text-xs font-medium ${getPasswordStrengthColor()}`}>
                      {getPasswordStrengthText()}
                    </span>
                  </div>
                )}
                <div className="text-xs text-gray-500 space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className={newPassword.length >= 8 ? 'text-green-500' : 'text-gray-400'}>
                      ✓
                    </span>
                    <span>At least 8 characters</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={/[a-z]/.test(newPassword) && /[A-Z]/.test(newPassword) ? 'text-green-500' : 'text-gray-400'}>
                      ✓
                    </span>
                    <span>Upper and lower case letters</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={/\d/.test(newPassword) ? 'text-green-500' : 'text-gray-400'}>
                      ✓
                    </span>
                    <span>At least one number</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={/[!@#$%^&*(),.?":{}|<>]/.test(newPassword) ? 'text-green-500' : 'text-gray-400'}>
                      ✓
                    </span>
                    <span>At least one special character</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your new password"
                    className="pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-sm text-red-500">Passwords do not match</p>
                )}
              </div>

              <Button
                type="submit"
                disabled={loading || success || !newPassword || !confirmPassword || newPassword !== confirmPassword || passwordStrength < 3}
                className={`w-full transition-colors duration-300 ${success ? 'bg-green-600 hover:bg-green-600 text-white' : ''
                  }`}
              >
                {success ? (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Password Updated!
                  </>
                ) : loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating Password...
                  </>
                ) : (
                  'Change Password'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
