import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface DashboardStats {
  totalInterns: number;
  presentToday: number;
  pendingCorrections: number;
  absentToday: number;
}

interface PresentIntern {
  id: string;
  full_name: string;
  email: string;
  time_in: string;
  total_hours?: number;
}

export function useDashboardStats() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalInterns: 0,
    presentToday: 0,
    pendingCorrections: 0,
    absentToday: 0,
  });
  const [loading, setLoading] = useState(true);
  const [presentInterns, setPresentInterns] = useState<PresentIntern[]>([]);

  const fetchStats = async () => {
    try {
      // Get total interns
      const { count: totalInterns } = await supabase
        .from('user_roles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'intern');

      // Get today's date in Manila timezone
      const today = new Date().toISOString().split('T')[0];

      // Get present today (has time_in for today)
      const { count: presentToday } = await supabase
        .from('attendance')
        .select('*', { count: 'exact', head: true })
        .eq('date', today);

      // Get pending corrections
      const { count: pendingCorrections } = await supabase
        .from('correction_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      // Get currently present interns (clocked in but not out today)
      const { data: currentPresent } = await supabase
        .from('attendance')
        .select('*')
        .eq('date', today)
        .not('time_in', 'is', null)
        .is('time_out', null)
        .order('time_in', { ascending: true });

      // Get profile data for each present intern
      const presentInternsWithProfiles = await Promise.all(
        currentPresent?.map(async (record) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('user_id', record.user_id)
            .single();
            
          return {
            id: record.id,
            full_name: profile?.full_name || 'Unknown',
            email: profile?.email || 'Unknown',
            time_in: record.time_in,
            total_hours: record.total_hours,
          };
        }) || []
      );

      const internsCount = totalInterns || 0;
      const presentCount = presentToday || 0;

      setStats({
        totalInterns: internsCount,
        presentToday: presentCount,
        pendingCorrections: pendingCorrections || 0,
        absentToday: Math.max(0, internsCount - presentCount),
      });

      setPresentInterns(presentInternsWithProfiles);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();

    // Refresh stats every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  // Add visibility change listener to refresh when tab becomes active
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchStats();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Add real-time listener for attendance changes
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('attendance_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'attendance',
        },
        (payload) => {
          console.log('Attendance changed:', payload);
          fetchStats();
        }
      )
      .subscribe((status) => {
        console.log('Subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return {
    stats,
    loading,
    presentInterns,
    refetch: fetchStats,
  };
}
