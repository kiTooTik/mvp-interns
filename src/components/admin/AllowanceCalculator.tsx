import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { CalendarIcon, Calculator, Download, Users, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isWeekend, isSameDay, addMonths, subMonths } from 'date-fns';

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
  time_in: string;
  time_out?: string;
  total_hours?: number;
}

interface AllowanceCalculation {
  intern: Intern;
  daysAttended: number;
  totalHours: number;
  allowance: number;
  attendanceDetails: AttendanceRecord[];
  paymentStatus?: 'pending' | 'given' | 'partial';
  paidAmount?: number;
  periodId?: string;
}

const DAILY_ALLOWANCE = 150; // 150 pesos per day
const WORKDAYS_ONLY = true; // Monday to Friday only

export default function AllowanceCalculator() {
  const { user } = useAuth();
  const [interns, setInterns] = useState<Intern[]>([]);
  const [selectedIntern, setSelectedIntern] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [allowanceCalculations, setAllowanceCalculations] = useState<AllowanceCalculation[]>([]);
  const [loading, setLoading] = useState(false);
  const [calendarView, setCalendarView] = useState<boolean>(false);

  useEffect(() => {
    fetchInterns();
  }, []);

  useEffect(() => {
    if (interns.length > 0) {
      calculateAllowances();
    }
  }, [interns, selectedIntern, selectedMonth]);

  const fetchInterns = async () => {
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, user_id, full_name, email');

      if (profilesError) throw profilesError;

      const { data: internRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'intern');

      const internUserIds = internRoles?.map((r) => r.user_id) || [];
      const internProfiles = profiles?.filter((p) =>
        internUserIds.includes(p.user_id)
      ) || [];

      setInterns(internProfiles);
    } catch (error) {
      console.error('Error fetching interns:', error);
      toast({
        title: 'Error',
        description: 'Failed to load intern data.',
        variant: 'destructive',
      });
    }
  };

  const calculateAllowances = async () => {
    setLoading(true);
    try {
      const monthStart = startOfMonth(selectedMonth);
      const monthEnd = endOfMonth(selectedMonth);

      // Check if allowance period exists
      const { data: existingPeriod } = await supabase
        .from('allowance_periods')
        .select('*')
        .eq('start_date', monthStart.toISOString().split('T')[0])
        .eq('end_date', monthEnd.toISOString().split('T')[0])
        .maybeSingle();

      let periodId = existingPeriod?.id;

      // Create period if doesn't exist
      if (!periodId) {
        const { data: newPeriod } = await supabase
          .from('allowance_periods')
          .insert({
            start_date: monthStart.toISOString().split('T')[0],
            end_date: monthEnd.toISOString().split('T')[0],
          })
          .select()
          .single();
        periodId = newPeriod?.id;
      }

      const internsToCalculate = selectedIntern === 'all' 
        ? interns 
        : interns.filter(i => i.user_id === selectedIntern);

      const calculations: AllowanceCalculation[] = [];

      for (const intern of internsToCalculate) {
        const { data: attendance, error: attendanceError } = await supabase
          .from('attendance')
          .select('*')
          .eq('user_id', intern.user_id)
          .gte('date', monthStart.toISOString().split('T')[0])
          .lte('date', monthEnd.toISOString().split('T')[0])
          .order('date', { ascending: true });

        if (attendanceError) throw attendanceError;

        // Filter for weekdays only (Monday to Friday)
        const weekdayAttendance = attendance?.filter(record => {
          const recordDate = new Date(record.date);
          return !isWeekend(recordDate);
        }) || [];

        const daysAttended = weekdayAttendance.length;
        const totalHours = weekdayAttendance.reduce((sum, record) => sum + (record.total_hours || 0), 0);
        const allowance = daysAttended * DAILY_ALLOWANCE;

        // Check existing allowance summary
        const { data: existingSummary } = await supabase
          .from('allowance_summaries')
          .select('*')
          .eq('period_id', periodId)
          .eq('user_id', intern.user_id)
          .maybeSingle();

        let paymentStatus: 'pending' | 'given' | 'partial' = 'pending';
        let paidAmount = 0;

        if (existingSummary) {
          paidAmount = Number(existingSummary.amount);
          if (paidAmount >= allowance) {
            paymentStatus = 'given';
          } else if (paidAmount > 0) {
            paymentStatus = 'partial';
          }
        }

        calculations.push({
          intern,
          daysAttended,
          totalHours,
          allowance,
          attendanceDetails: weekdayAttendance,
          paymentStatus,
          paidAmount,
          periodId
        });
      }

      setAllowanceCalculations(calculations);
    } catch (error) {
      console.error('Error calculating allowances:', error);
      toast({
        title: 'Error',
        description: 'Failed to calculate allowances.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getPaymentStatusBadge = (status: 'pending' | 'given' | 'partial', paidAmount: number, totalAmount: number) => {
    switch (status) {
      case 'given':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Fully Paid</Badge>;
      case 'partial':
        return <Badge className="bg-yellow-100 text-yellow-800"><AlertCircle className="w-3 h-3 mr-1" />Partial (₱{paidAmount})</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
    }
  };

  const markAsPaid = async (internId: string, periodId: string, amount: number) => {
    try {
      const calculation = allowanceCalculations.find(c => c.intern.user_id === internId);
      if (!calculation) return;

      const { error } = await supabase
        .from('allowance_summaries')
        .upsert({
          period_id: periodId,
          user_id: internId,
          days_attended: calculation.daysAttended,
          total_hours: calculation.totalHours,
          amount: amount,
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Allowance marked as paid.',
      });

      await calculateAllowances(); // Refresh data
    } catch (error) {
      console.error('Error marking as paid:', error);
      toast({
        title: 'Error',
        description: 'Failed to update payment status.',
        variant: 'destructive',
      });
    }
  };

  const getAttendanceStatus = (date: Date, internId: string) => {
    const calculation = allowanceCalculations.find(c => c.intern.user_id === internId);
    if (!calculation) return null;

    const attendance = calculation.attendanceDetails.find(record => 
      isSameDay(new Date(record.date), date)
    );

    if (attendance) {
      return {
        present: true,
        hours: attendance.total_hours || 0,
        timeIn: attendance.time_in,
        timeOut: attendance.time_out
      };
    }

    return null;
  };

  const getDayClassNames = (date: Date, internId: string) => {
    const attendance = getAttendanceStatus(date, internId);
    const isWeekendDay = isWeekend(date);
    
    if (isWeekendDay) {
      return 'bg-gray-100 text-gray-400 cursor-not-allowed';
    }
    
    if (attendance) {
      return 'bg-green-100 text-green-800 border-green-300 hover:bg-green-200';
    }
    
    return 'hover:bg-gray-50';
  };

  const exportToCSV = () => {
    const headers = ['Intern Name', 'Email', 'Days Attended', 'Total Hours', 'Allowance (PHP)'];
    const rows = allowanceCalculations.map(calc => [
      calc.intern.full_name,
      calc.intern.email,
      calc.daysAttended.toString(),
      calc.totalHours.toFixed(2),
      calc.allowance.toFixed(2)
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `allowance-report-${format(selectedMonth, 'yyyy-MM')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const totalAllowance = allowanceCalculations.reduce((sum, calc) => sum + calc.allowance, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Allowance Calculator</h1>
          <p className="text-muted-foreground">
            Calculate intern allowances based on attendance (₱{DAILY_ALLOWANCE} per weekday)
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setCalendarView(!calendarView)}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {calendarView ? 'Table View' : 'Calendar View'}
          </Button>
          <Button onClick={exportToCSV} disabled={loading || allowanceCalculations.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Calculation Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="intern">Select Intern</Label>
              <Select value={selectedIntern} onValueChange={setSelectedIntern}>
                <SelectTrigger>
                  <SelectValue placeholder="Select intern" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Interns</SelectItem>
                  {interns.map((intern) => (
                    <SelectItem key={intern.user_id} value={intern.user_id}>
                      {intern.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="month">Select Month</Label>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedMonth(subMonths(selectedMonth, 1))}
                >
                  Previous
                </Button>
                <div className="flex-1 text-center py-2 px-3 border rounded-md">
                  {format(selectedMonth, 'MMMM yyyy')}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedMonth(addMonths(selectedMonth, 1))}
                >
                  Next
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Summary</Label>
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span>Total Interns:</span>
                  <span className="font-medium">{allowanceCalculations.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Allowance:</span>
                  <span className="font-medium">₱{totalAllowance.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {loading && (
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <div className="text-center">
              <Calculator className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
              <p className="text-muted-foreground">Calculating allowances...</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {!loading && allowanceCalculations.length > 0 && (
        <>
          {calendarView ? (
            /* Calendar View */
            <div className="space-y-6">
              {allowanceCalculations.map((calculation) => (
                <Card key={calculation.intern.user_id}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        {calculation.intern.full_name}
                      </div>
                      <div className="flex gap-2">
                        <Badge variant="secondary">
                          {calculation.daysAttended} days
                        </Badge>
                        <Badge variant="default">
                          ₱{calculation.allowance.toFixed(2)}
                        </Badge>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Calendar
                      mode="single"
                      selected={selectedMonth}
                      month={selectedMonth}
                      onMonthChange={setSelectedMonth}
                      className="rounded-md border"
                      modifiers={{
                        present: (date) => getAttendanceStatus(date, calculation.intern.user_id)?.present || false
                      }}
                      modifiersStyles={{
                        present: {
                          backgroundColor: '#86efac',
                          color: '#166534',
                          border: '1px solid #22c55e'
                        }
                      }}
                      disabled={isWeekend}
                    />
                    <div className="mt-4 text-sm text-muted-foreground">
                      <p>Green dates = Present (₱{DAILY_ALLOWANCE} per day)</p>
                      <p>Gray dates = Weekend (not counted)</p>
                      <p>White dates = No attendance record</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            /* Table View */
            <Card>
              <CardHeader>
                <CardTitle>Allowance Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Intern Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Days Attended</TableHead>
                      <TableHead>Total Hours</TableHead>
                      <TableHead>Allowance (PHP)</TableHead>
                      <TableHead>Payment Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allowanceCalculations.map((calculation) => (
                      <TableRow key={calculation.intern.user_id}>
                        <TableCell className="font-medium">
                          {calculation.intern.full_name}
                        </TableCell>
                        <TableCell>{calculation.intern.email}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {calculation.daysAttended}
                          </Badge>
                        </TableCell>
                        <TableCell>{calculation.totalHours.toFixed(2)}</TableCell>
                        <TableCell className="font-medium">
                          ₱{calculation.allowance.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          {getPaymentStatusBadge(
                            calculation.paymentStatus || 'pending',
                            calculation.paidAmount || 0,
                            calculation.allowance
                          )}
                        </TableCell>
                        <TableCell>
                          {calculation.paymentStatus !== 'given' && (
                            <Button
                              size="sm"
                              onClick={() => markAsPaid(
                                calculation.intern.user_id,
                                calculation.periodId!,
                                calculation.allowance
                              )}
                              disabled={!calculation.periodId}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Mark as Paid
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-semibold bg-muted/50">
                      <TableCell colSpan={4}>Total</TableCell>
                      <TableCell>₱{totalAllowance.toFixed(2)}</TableCell>
                      <TableCell colSpan={2}></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
