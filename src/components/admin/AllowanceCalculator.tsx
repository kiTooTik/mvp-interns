import { useEffect, useState } from 'react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

// Import modular components
import Header from './allowance/Header';
import SharedAllowanceCalendarSimple from './allowance/SharedAllowanceCalendarSimple';

interface Intern {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
}

export default function AllowanceCalculator() {
  const { user } = useAuth();
  const [interns, setInterns] = useState<Intern[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchInterns();
  }, []);

  useEffect(() => {
    if (!user) return;

    // Add visibility change listener to refresh when tab becomes active
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchInterns();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Also add periodic refresh every 30 seconds as backup
    const interval = setInterval(() => {
      fetchInterns();
    }, 30000);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(interval);
    };
  }, [user]);

  const fetchInterns = async () => {
    setLoading(true);
    try {
      // Get all users with intern role
      const { data: userRoles, error: userRolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'intern');

      if (userRolesError) {
        console.error('Error fetching intern roles:', userRolesError);
        toast({
          title: 'Error',
          description: 'Failed to load interns.',
          variant: 'destructive',
        });
        return;
      }

      if (!userRoles || userRoles.length === 0) {
        setInterns([]);
        return;
      }

      // Get user profiles for these user_ids
      const userIds = userRoles.map(ur => ur.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('user_id', userIds);

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        toast({
          title: 'Error',
          description: 'Failed to load intern profiles.',
          variant: 'destructive',
        });
        return;
      }

      setInterns(profiles || []);
    } catch (error) {
      console.error('Error fetching interns:', error);
      toast({
        title: 'Error',
        description: 'Failed to load interns.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <Header />
        
        {/* Content */}
        <div className="container mx-auto px-2 sm:px-4 py-2 sm:py-4">
          {/* Shared Allowance Calendar */}
          <SharedAllowanceCalendarSimple 
            interns={interns}
            loading={loading}
          />
        </div>
      </div>
    </TooltipProvider>
  );
}