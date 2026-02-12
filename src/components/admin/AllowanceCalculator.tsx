import { useEffect, useState } from 'react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Clock } from 'lucide-react';

// Import modular components
import Header from './allowance/Header';
import DailyTimeRecord from './allowance/AttendanceHistory';

interface Intern {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
}

interface AttendanceRecord {
  id: string;
  user_id: string;
  date: string;
  total_hours: number;
  time_in?: string;
  time_out?: string;
  created_at?: string;
}

export default function AllowanceCalculator() {
  const { user } = useAuth();
  const [interns, setInterns] = useState<Intern[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchInterns();
    fetchAttendanceRecords();
  }, []);

  const fetchInterns = async () => {
    setLoading(true);
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'intern');

      if (profilesError) {
        console.error('Error fetching interns:', profilesError);
        toast({
          title: 'Error',
          description: 'Failed to load interns.',
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

  const fetchAttendanceRecords = async () => {
    setLoading(true);
    try {
      const { data: records, error } = await supabase
        .from('attendance')
        .select('*')
        .order('date', { ascending: false });

      if (error) {
        console.error('Error fetching attendance records:', error);
        toast({
          title: 'Error',
          description: 'Failed to load attendance records.',
          variant: 'destructive',
        });
        return;
      }

      setAttendanceRecords(records || []);
    } catch (error) {
      console.error('Error fetching attendance records:', error);
      toast({
        title: 'Error',
        description: 'Failed to load attendance records.',
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
        
        {/* Daily Time Record Section */}
        <div className="container mx-auto px-2 sm:px-4 py-2 sm:py-4">
          <DailyTimeRecord 
            records={attendanceRecords} 
            loading={loading}
          />
        </div>
      </div>
    </TooltipProvider>
  );
}
  