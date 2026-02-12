import { useEffect, useState } from 'react';
import { InternLayout } from '@/components/layout/InternLayout';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { Clock, LogIn, LogOut, Loader2, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';

interface TodayAttendance {
  id: string;
  time_in: string;
  time_out: string | null;
  total_hours: number | null;
}

export default function InternHome() {
  const { user } = useAuth();
  const [todayAttendance, setTodayAttendance] = useState<TodayAttendance | null>(null);
  const [loading, setLoading] = useState(true);
  const [clockingIn, setClockingIn] = useState(false);
  const [clockingOut, setClockingOut] = useState(false);

  const today = new Date().toISOString().split('T')[0];
  const currentTime = format(new Date(), 'h:mm a');
  const isWeekend = [0, 6].includes(new Date().getDay());

  useEffect(() => {
    fetchTodayAttendance();
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('attendance_changes_home')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'attendance',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Attendance changed in home:', payload);
          fetchTodayAttendance();
        }
      )
      .subscribe();

    const handleVisibilityChange = () => {
      if (!document.hidden && user) {
        fetchTodayAttendance();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    const interval = setInterval(fetchTodayAttendance, 30000);

    return () => {
      supabase.removeChannel(channel);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(interval);
    };
  }, [user]);

  const fetchTodayAttendance = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', today)
        .maybeSingle();

      if (error) throw error;
      setTodayAttendance(data);
    } catch (error) {
      console.error('Error fetching attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClockIn = async () => {
    if (!user || isWeekend) return;

    setClockingIn(true);
    try {
      const now = new Date().toISOString();
      
      const { data, error } = await supabase
        .from('attendance')
        .insert({
          user_id: user.id,
          time_in: now,
          date: today,
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          toast({
            title: 'Already clocked in',
            description: 'You have already clocked in for today.',
            variant: 'destructive',
          });
        } else {
          throw error;
        }
      } else {
        setTodayAttendance(data);
        toast({
          title: 'Clocked in successfully!',
          description: `You clocked in at ${format(new Date(now), 'h:mm a')}.`,
        });
      }
    } catch (error) {
      console.error('Error clocking in:', error);
      toast({
        title: 'Error',
        description: 'Failed to clock in. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setClockingIn(false);
    }
  };

  const handleClockOut = async () => {
    if (!user || !todayAttendance || todayAttendance.time_out) return;

    setClockingOut(true);
    try {
      const now = new Date();
      const timeIn = new Date(todayAttendance.time_in);
      const hoursWorked = (now.getTime() - timeIn.getTime()) / (1000 * 60 * 60);

      const { data, error } = await supabase
        .from('attendance')
        .update({
          time_out: now.toISOString(),
          total_hours: parseFloat(hoursWorked.toFixed(2)),
        })
        .eq('id', todayAttendance.id)
        .select()
        .single();

      if (error) throw error;

      setTodayAttendance(data);
      toast({
        title: 'Clocked out successfully!',
        description: `You worked for ${hoursWorked.toFixed(1)} hours today.`,
      });
    } catch (error) {
      console.error('Error clocking out:', error);
      toast({
        title: 'Error',
        description: 'Failed to clock out. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setClockingOut(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <InternLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Welcome Card */}
        <Card className="border-border bg-gradient-to-br from-primary/5 to-primary/10">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-foreground">
                  {getGreeting()}!
                </h1>
                <p className="text-muted-foreground mt-1">
                  {format(new Date(), 'EEEE, MMMM d, yyyy')}
                </p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-semibold text-primary">{currentTime}</p>
                <p className="text-sm text-muted-foreground">Current time</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Today's Status */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Today's Attendance
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : isWeekend ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  It's the weekend! Attendance is only available on weekdays.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Status Display */}
                {todayAttendance ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg bg-success/10 border border-success/20">
                      <p className="text-sm text-muted-foreground">Time In</p>
                      <p className="text-xl font-semibold text-success">
                        {format(new Date(todayAttendance.time_in), 'h:mm a')}
                      </p>
                    </div>
                    <div
                      className={`p-4 rounded-lg ${
                        todayAttendance.time_out
                          ? 'bg-primary/10 border border-primary/20'
                          : 'bg-muted border border-border'
                      }`}
                    >
                      <p className="text-sm text-muted-foreground">Time Out</p>
                      <p
                        className={`text-xl font-semibold ${
                          todayAttendance.time_out ? 'text-primary' : 'text-muted-foreground'
                        }`}
                      >
                        {todayAttendance.time_out
                          ? format(new Date(todayAttendance.time_out), 'h:mm a')
                          : '—'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-muted-foreground">
                      You haven't clocked in yet today.
                    </p>
                  </div>
                )}

                {/* Hours Summary */}
                {todayAttendance?.total_hours && (
                  <div className="flex items-center justify-center gap-2 py-4 rounded-lg bg-accent">
                    <CheckCircle className="h-5 w-5 text-success" />
                    <span className="font-medium">
                      Total hours today: {todayAttendance.total_hours.toFixed(1)} hours
                    </span>
                  </div>
                )}

                {/* Clock Buttons */}
                <div className="grid grid-cols-2 gap-4">
                  <Button
                    size="lg"
                    className="h-20 text-lg"
                    onClick={handleClockIn}
                    disabled={clockingIn || !!todayAttendance}
                  >
                    {clockingIn ? (
                      <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                    ) : (
                      <LogIn className="mr-2 h-6 w-6" />
                    )}
                    Clock In
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="h-20 text-lg"
                    onClick={handleClockOut}
                    disabled={clockingOut || !todayAttendance || !!todayAttendance.time_out}
                  >
                    {clockingOut ? (
                      <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                    ) : (
                      <LogOut className="mr-2 h-6 w-6" />
                    )}
                    Clock Out
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </InternLayout>
  );
}