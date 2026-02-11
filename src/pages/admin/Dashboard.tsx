import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Users, UserCheck, Clock, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

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

export default function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalInterns: 0,
    presentToday: 0,
    pendingCorrections: 0,
    absentToday: 0,
  });
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [presentInterns, setPresentInterns] = useState<PresentIntern[]>([]);

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Define fetchStats function outside useEffect to make it accessible
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

    // Refresh present interns every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
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
          // Refresh stats when any attendance changes (clock in/out)
          fetchStats(); // Fix function call error by using correct function name
        }
      )
      .subscribe((status) => {
        console.log('Subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const statCards = [
    {
      title: 'Total Interns',
      value: stats.totalInterns,
      icon: Users,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'Present Today',
      value: stats.presentToday,
      icon: UserCheck,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
    {
      title: 'Pending Corrections',
      value: stats.pendingCorrections,
      icon: Clock,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
    },
    {
      title: 'Absent Today',
      value: stats.absentToday,
      icon: AlertCircle,
      color: 'text-destructive',
      bgColor: 'bg-destructive/10',
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground">
              Welcome back! Here's an overview of today's attendance.
            </p>
          </div>
          <Card className="border-border bg-gradient-to-r from-primary/10 to-primary/5">
            <CardContent className="p-4 text-center">
              <div className="text-sm text-muted-foreground mb-1">Current Time</div>
              <div className="text-2xl font-bold text-primary">
                {format(currentTime, 'h:mm:ss a')}
              </div>
              <div className="text-sm text-muted-foreground">
                {format(currentTime, 'EEEE, MMMM d, yyyy')}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat) => (
            <Card key={stat.title} className="border-border">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                    <stat.icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.title}</p>
                    <p className="text-2xl font-semibold text-foreground">
                      {loading ? '...' : stat.value}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-lg">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                No recent activity to display. Attendance records will appear here.
              </p>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-lg">Pending Approvals</CardTitle>
            </CardHeader>
            <CardContent>
              {stats.pendingCorrections > 0 ? (
                <p className="text-muted-foreground text-sm">
                  You have {stats.pendingCorrections} correction request(s) waiting for review.
                </p>
              ) : (
                <p className="text-muted-foreground text-sm">
                  No pending correction requests.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Currently Present Interns */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-green-600" />
              Currently Present ({presentInterns.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {presentInterns.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No interns are currently present.
              </p>
            ) : (
              <div className="space-y-3">
                {presentInterns.map((intern) => (
                  <div
                    key={intern.id}
                    className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        <UserCheck className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <div className="font-medium text-foreground">
                          {intern.full_name}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {intern.email}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">Clocked In</div>
                      <div className="font-medium text-green-600">
                        {format(new Date(intern.time_in), 'h:mm a')}
                      </div>
                      {intern.total_hours && (
                        <div className="text-xs text-muted-foreground">
                          {intern.total_hours.toFixed(1)} hrs
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}