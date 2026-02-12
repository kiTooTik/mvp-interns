import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { CalendarIcon, Clock, Download, Filter } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isWeekend, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek } from 'date-fns';

interface AttendanceRecord {
  id: string;
  date: string;
  time_in: string;
  time_out?: string;
  total_hours?: number;
}

export default function InternAttendanceHistory() {
  const { user } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  useEffect(() => {
    fetchAttendanceData();
  }, [selectedMonth]);

  const fetchAttendanceData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const monthStart = startOfMonth(selectedMonth);
      const monthEnd = endOfMonth(selectedMonth);
      
      const { data: records, error } = await supabase
        .from('attendance')
        .select('*')
        .gte('date', monthStart.toISOString().split('T')[0])
        .lte('date', monthEnd.toISOString().split('T')[0])
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
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm md:text-base lg:text-lg">
          <CalendarIcon className="h-4 w-4 md:h-5 lg:h-6 text-primary" />
          Attendance History
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 md:p-6 lg:p-8">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : attendanceRecords.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-sm md:text-base lg:text-lg">
              No attendance records found
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-sm md:text-base lg:text-lg">
                {format(selectedMonth, 'MMMM yyyy')}
              </h3>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </div>
            <div className="space-y-2">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Time In</TableHead>
                    <TableHead>Time Out</TableHead>
                    <TableHead>Total Hours</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendanceRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>
                        {format(new Date(record.date), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell>
                        {record.time_in || '--:--'}
                      </TableCell>
                      <TableCell>
                        {record.time_out || '--:--'}
                      </TableCell>
                      <TableCell>
                        {record.total_hours?.toFixed(1) || '0'}h
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
