import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Loader2, Eye, EyeOff, CheckCircle2, Lock, ArrowLeft } from 'lucide-react';

export default function AdminChangePassword() {
    const navigate = useNavigate();
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    // Single toggle controls both fields at once
    const [showPassword, setShowPassword] = useState(false);
    const [passwordStrength, setPasswordStrength] = useState(0);

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

    const getStrengthColor = () => {
        if (passwordStrength <= 2) return 'text-red-500';
        if (passwordStrength <= 3) return 'text-yellow-500';
        return 'text-green-500';
    };

    const getStrengthText = () => {
        if (passwordStrength <= 2) return 'Weak';
        if (passwordStrength <= 3) return 'Medium';
        return 'Strong';
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (newPassword !== confirmPassword) {
            toast({ title: 'Error', description: 'Passwords do not match', variant: 'destructive' });
            return;
        }
        if (newPassword.length < 8) {
            toast({ title: 'Error', description: 'Password must be at least 8 characters', variant: 'destructive' });
            return;
        }
        if (passwordStrength < 3) {
            toast({ title: 'Error', description: 'Please choose a stronger password', variant: 'destructive' });
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({ password: newPassword });
            if (error) throw new Error(error.message || 'Failed to update password.');

            setSuccess(true);
            toast({ title: '✅ Password Updated!', description: 'Your password has been changed. Redirecting to settings...' });

            setTimeout(() => navigate('/admin/settings'), 2500);
        } catch (error) {
            const message = error instanceof Error && error.message ? error.message : 'Failed to update password.';
            toast({ title: 'Error', description: message, variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <AdminLayout>
            <div className="space-y-6">
                {/* Header with back button */}
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate('/admin/settings')}
                        className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to Settings
                    </Button>
                </div>

                <div>
                    <h1 className="text-2xl font-semibold text-foreground">Change Password</h1>
                    <p className="text-muted-foreground">Update your account password.</p>
                </div>

                <Card className="border-border max-w-md">
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <Lock className="h-5 w-5 text-muted-foreground" />
                            <CardTitle className="text-lg">New Password</CardTitle>
                        </div>
                        <CardDescription>
                            Choose a strong password with at least 8 characters.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* New Password */}
                            <div className="space-y-2">
                                <Label htmlFor="newPassword">New Password</Label>
                                <div className="relative">
                                    <Input
                                        id="newPassword"
                                        type={showPassword ? 'text' : 'password'}
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="Enter new password"
                                        className="pr-10"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>

                                {newPassword && (
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                                            <div
                                                className={`h-1.5 rounded-full transition-all duration-300 ${passwordStrength <= 2 ? 'bg-red-500' : passwordStrength <= 3 ? 'bg-yellow-500' : 'bg-green-500'
                                                    }`}
                                                style={{ width: `${(passwordStrength / 5) * 100}%` }}
                                            />
                                        </div>
                                        <span className={`text-xs font-medium ${getStrengthColor()}`}>{getStrengthText()}</span>
                                    </div>
                                )}

                                <div className="text-xs text-gray-500 space-y-0.5">
                                    <div className="flex items-center gap-1.5">
                                        <span className={newPassword.length >= 8 ? 'text-green-500' : 'text-gray-400'}>✓</span>
                                        <span>At least 8 characters</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <span className={/[a-z]/.test(newPassword) && /[A-Z]/.test(newPassword) ? 'text-green-500' : 'text-gray-400'}>✓</span>
                                        <span>Upper and lower case letters</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <span className={/\d/.test(newPassword) ? 'text-green-500' : 'text-gray-400'}>✓</span>
                                        <span>At least one number</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <span className={/[!@#$%^&*(),.?":{}|<>]/.test(newPassword) ? 'text-green-500' : 'text-gray-400'}>✓</span>
                                        <span>At least one special character</span>
                                    </div>
                                </div>
                            </div>

                            {/* Confirm Password — shares the same eye toggle */}
                            <div className="space-y-2">
                                <Label htmlFor="confirmPassword">Confirm Password</Label>
                                <div className="relative">
                                    <Input
                                        id="confirmPassword"
                                        type={showPassword ? 'text' : 'password'}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="Confirm new password"
                                        className="pr-10"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
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
                                className={`w-full transition-colors duration-300 ${success ? 'bg-green-600 hover:bg-green-600 text-white' : ''}`}
                            >
                                {success ? (
                                    <><CheckCircle2 className="mr-2 h-4 w-4" />Password Updated!</>
                                ) : loading ? (
                                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Updating...</>
                                ) : (
                                    'Change Password'
                                )}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </AdminLayout>
    );
}
