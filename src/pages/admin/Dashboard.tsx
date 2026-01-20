import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Users, UserCheck, Clock, AlertCircle } from 'lucide-react';

interface DashboardStats {
  totalInterns: number;
  presentToday: number;
  pendingCorrections: number;
  absentToday: number;
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

  useEffect(() => {
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

        const internsCount = totalInterns || 0;
        const presentCount = presentToday || 0;

        setStats({
          totalInterns: internsCount,
          presentToday: presentCount,
          pendingCorrections: pendingCorrections || 0,
          absentToday: Math.max(0, internsCount - presentCount),
        });
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

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
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back! Here's an overview of today's attendance.
          </p>
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
      </div>
    </AdminLayout>
  );
}