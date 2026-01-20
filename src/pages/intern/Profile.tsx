import { useEffect, useState } from 'react';
import { InternLayout } from '@/components/layout/InternLayout';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Loader2, User, Mail, Clock, Target } from 'lucide-react';

interface Profile {
  full_name: string;
  email: string;
  required_hours: number;
  remaining_hours: number;
}

export default function InternProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) throw error;
        setProfile(data);
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  const completedHours = profile
    ? profile.required_hours - profile.remaining_hours
    : 0;
  const progressPercentage = profile
    ? (completedHours / profile.required_hours) * 100
    : 0;

  if (loading) {
    return (
      <InternLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </InternLayout>
    );
  }

  return (
    <InternLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Profile</h1>
          <p className="text-muted-foreground">
            View your internship details.
          </p>
        </div>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-muted">
                <div className="flex items-center gap-2 mb-1">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Full Name</span>
                </div>
                <p className="font-medium">{profile?.full_name || 'Not set'}</p>
              </div>
              <div className="p-4 rounded-lg bg-muted">
                <div className="flex items-center gap-2 mb-1">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Email</span>
                </div>
                <p className="font-medium">{profile?.email || user?.email}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Internship Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Hours Completed</span>
                <span className="font-medium">
                  {completedHours} / {profile?.required_hours || 480} hours
                </span>
              </div>
              <Progress value={progressPercentage} className="h-3" />
              <p className="text-sm text-muted-foreground text-right">
                {progressPercentage.toFixed(1)}% complete
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-success/10 border border-success/20">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="h-4 w-4 text-success" />
                  <span className="text-sm text-muted-foreground">Completed</span>
                </div>
                <p className="text-2xl font-semibold text-success">
                  {completedHours}
                  <span className="text-sm font-normal text-muted-foreground ml-1">hrs</span>
                </p>
              </div>
              <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                <div className="flex items-center gap-2 mb-1">
                  <Target className="h-4 w-4 text-primary" />
                  <span className="text-sm text-muted-foreground">Remaining</span>
                </div>
                <p className="text-2xl font-semibold text-primary">
                  {profile?.remaining_hours || 480}
                  <span className="text-sm font-normal text-muted-foreground ml-1">hrs</span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </InternLayout>
  );
}