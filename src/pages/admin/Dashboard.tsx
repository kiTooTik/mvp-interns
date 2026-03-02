import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { StatCard } from '@/components/admin/StatCard';
import { DashboardHeader } from '@/components/admin/DashboardHeader';
import { PresentInternsList } from '@/components/admin/PresentInternsList';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { MotionContainer, StatsGrid } from '@/components/ui/MotionContainer';
import { styles } from '@/lib/styles';
import { Users, UserCheck, Clock, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function AdminDashboard() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const { stats, loading, presentInterns } = useDashboardStats();

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const statCards = [
    {
      title: 'Total Interns',
      value: stats.totalInterns,
      icon: Users,
      color: styles.primaryText,
      bgColor: styles.primaryBg,
    },
    {
      title: 'Present Today',
      value: stats.presentToday,
      icon: UserCheck,
      color: styles.successText,
      bgColor: styles.successBg,
    },
    {
      title: 'Pending Corrections',
      value: stats.pendingCorrections,
      icon: Clock,
      color: styles.warningText,
      bgColor: styles.warningBg,
    },
    {
      title: 'Absent Today',
      value: stats.absentToday,
      icon: AlertCircle,
      color: styles.errorText,
      bgColor: styles.errorBg,
    },
  ];

  return (
    <AdminLayout>
      <MotionContainer animation="fade-in" className="space-y-6">
        <DashboardHeader currentTime={currentTime} />

        {/* Stats Grid */}
        <StatsGrid>
          {statCards.map((stat) => (
            <StatCard
              key={stat.title}
              title={stat.title}
              value={stat.value}
              icon={stat.icon}
              color={stat.color}
              bgColor={stat.bgColor}
              loading={loading}
            />
          ))}
        </StatsGrid>

        {/* Quick Actions */}
        <MotionContainer animation="slide-in-right" className={styles.twoColumnGrid}>
          <Card className={styles.card}>
            <CardHeader>
              <CardTitle className="text-lg">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                No recent activity to display. Attendance records will appear here.
              </p>
            </CardContent>
          </Card>

          <Card className={styles.card}>
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
        </MotionContainer>

        {/* Currently Present Interns */}
        <MotionContainer animation="slide-in-right" delay={200}>
          <PresentInternsList presentInterns={presentInterns} />
        </MotionContainer>
      </MotionContainer>
    </AdminLayout>
  );
}