import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isWeekend, isSameDay, addMonths, subMonths } from 'date-fns';
import { CalendarIcon, Calculator } from 'lucide-react';

interface AttendanceRecord {
  id: string;
  user_id: string;
  date: string;
  total_hours: number;
  time_in?: string;
  time_out?: string;
}

interface Intern {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
}

interface AllowanceCalculation {
  id: string;
  selected_dates: string[];
  intern_breakdown: {
    intern_id: string;
    intern_name: string;
    worked_days: number;
    amount_per_day: number;
    total_amount: number;
  }[];
  total_amount: number;
  created_at: string;
}

interface SharedAllowanceCalendarProps {
  interns: any[];
  loading?: boolean;
}

export default function SharedAllowanceCalendarSimple({ interns, loading = false }: SharedAllowanceCalendarProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [isCalculationDialogOpen, setIsCalculationDialogOpen] = useState(false);
  const [calculationResult, setCalculationResult] = useState<AllowanceCalculation | null>(null);
  const [amountPerIntern] = useState(150);

  const activeInternCount = interns.length || 15;

  useEffect(() => {
    fetchAttendanceRecords();
  }, [selectedMonth]);

  const fetchAttendanceRecords = async () => {
    try {
      const monthStart = startOfMonth(selectedMonth);
      const monthEnd = endOfMonth(selectedMonth);

      // Use local date format to avoid timezone issues
      const formatDate = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .gte('date', formatDate(monthStart))
        .lte('date', formatDate(monthEnd))
        .order('date', { ascending: true });

      if (error) throw error;
      setAttendanceRecords(data || []);
    } catch (error) {
      console.error('Error fetching attendance records:', error);
      setAttendanceRecords([]);
    }
  };

  const getAttendanceForDate = (date: Date): AttendanceRecord[] => {
    // Use local date format to avoid timezone issues
    const formatDate = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    
    const dateStr = formatDate(date);
    return attendanceRecords.filter(record => record.date === dateStr);
  };

  const getDayClassNames = (date: Date) => {
    const attendance = getAttendanceForDate(date);
    const isSelected = selectedDates.some(selectedDate => isSameDay(selectedDate, date));
    const isWeekendDay = isWeekend(date);
    
    if (isWeekendDay) {
      return 'bg-gray-100 text-gray-400 cursor-not-allowed';
    }
    
    if (isSelected) {
      return 'bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-200 cursor-pointer';
    }
    
    if (attendance.length > 0) {
      return 'bg-yellow-100 text-yellow-800 border-yellow-300 hover:bg-yellow-200 cursor-pointer';
    } else {
      return 'bg-red-100 text-red-800 border-red-300 hover:bg-red-200 cursor-pointer';
    }
  };

  const handleDayClick = (date: Date) => {
    // Only allow selection if in selection mode
    if (!isSelectionMode) {
      toast({
        title: 'Selection Mode Required',
        description: 'Please click "Select Dates" first to enable date selection.',
        variant: 'destructive',
      });
      return;
    }
    
    if (isWeekend(date)) return;
    
    const attendance = getAttendanceForDate(date);
    if (attendance.length === 0) {
      toast({
        title: 'No Attendance Data',
        description: 'No interns worked on this day.',
        variant: 'destructive',
      });
      return;
    }

    const isSelected = selectedDates.some(selectedDate => isSameDay(selectedDate, date));
    
    if (isSelected) {
      setSelectedDates(selectedDates.filter(selectedDate => !isSameDay(selectedDate, date)));
    } else {
      setSelectedDates([...selectedDates, date]);
    }
  };

  const calculateAllowance = async () => {
    if (selectedDates.length === 0) {
      toast({
        title: 'No Dates Selected',
        description: 'Please select at least one date.',
        variant: 'destructive',
      });
      return;
    }

    // Use local date formatting to avoid timezone issues
    const formatDate = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    // Calculate per intern
    const internBreakdown = interns.map(intern => {
      const workedDays = selectedDates.filter(date => {
        const dateStr = formatDate(date);
        return attendanceRecords.some(record => 
          record.user_id === intern.user_id && record.date === dateStr
        );
      }).length;

      return {
        intern_id: intern.id,
        intern_name: intern.full_name || intern.email,
        worked_days: workedDays,
        amount_per_day: amountPerIntern,
        total_amount: workedDays * amountPerIntern,
      };
    }).filter(intern => intern.worked_days > 0);

    const totalAmount = internBreakdown.reduce((sum, intern) => sum + intern.total_amount, 0);

    const calculation: AllowanceCalculation = {
      id: `calc-${Date.now()}`,
      selected_dates: selectedDates.map(date => formatDate(date)),
      intern_breakdown: internBreakdown,
      total_amount: totalAmount,
      created_at: new Date().toISOString(),
    };

    setCalculationResult(calculation);
    setIsCalculationDialogOpen(true);
  };

  const monthStart = startOfMonth(selectedMonth);
  const monthEnd = endOfMonth(selectedMonth);
  const allDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const stats = useMemo(() => {
    const totalDays = allDays.filter(day => !isWeekend(day)).length;
    const attendanceDays = allDays.filter(day => getAttendanceForDate(day).length > 0).length;
    
    return {
      totalDays,
      attendanceDays,
      percentage: totalDays > 0 ? (attendanceDays / totalDays) * 100 : 0
    };
  }, [allDays, attendanceRecords]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Shared Allowance Calendar
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedMonth(subMonths(selectedMonth, 1))}
            >
              Previous
            </Button>
            <span className="text-sm font-medium">
              {format(selectedMonth, 'MMMM yyyy')}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedMonth(addMonths(selectedMonth, 1))}
            >
              Next
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Statistics */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{stats.totalDays}</div>
            <div className="text-xs text-blue-600">Total Days</div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{stats.attendanceDays}</div>
            <div className="text-xs text-green-600">Days With Attendance</div>
          </div>
          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">{stats.percentage.toFixed(0)}%</div>
            <div className="text-xs text-purple-600">Attendance Rate</div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-2">
            <Label>Fixed Rate: ₱{amountPerIntern} per intern per day</Label>
          </div>
          
          {!isSelectionMode ? (
            <Button
              onClick={() => setIsSelectionMode(true)}
              className="flex items-center gap-2"
            >
              Select Dates
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => setIsSelectionMode(false)}
                className="flex items-center gap-2"
              >
                Done Selecting
              </Button>
              
              <Button
                onClick={calculateAllowance}
                disabled={selectedDates.length === 0}
                className="flex items-center gap-2"
              >
                <Calculator className="h-4 w-4" />
                Calculate Allowance ({selectedDates.length} days)
              </Button>

              <Button
                variant="outline"
                onClick={() => {
                  setSelectedDates([]);
                }}
                disabled={selectedDates.length === 0}
              >
                Clear Selection
              </Button>
            </>
          )}
        </div>

        {/* Calendar */}
        <div className="flex justify-center mb-6">
          <Calendar
            mode="single"
            month={selectedMonth}
            onMonthChange={setSelectedMonth}
            className="rounded-md border"
            modifiers={{
              selected: (date) => selectedDates.some(selectedDate => isSameDay(selectedDate, date)),
            }}
            modifiersStyles={{
              selected: { 
                backgroundColor: '#3b82f6', 
                borderColor: '#2563eb', 
                color: 'white',
                borderRadius: '50%',
                fontWeight: 'bold'
              },
            }}
            classNames={{
              day: "h-10 w-10 p-0 font-normal cursor-pointer",
            }}
            onSelect={handleDayClick}
          />
        </div>

        {/* Calculation Dialog */}
        <Dialog open={isCalculationDialogOpen} onOpenChange={setIsCalculationDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Allowance Calculation Result</DialogTitle>
            </DialogHeader>
            {calculationResult && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{calculationResult.selected_dates.length}</div>
                    <div className="text-xs text-blue-600">Selected Days</div>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">₱{calculationResult.total_amount.toFixed(2)}</div>
                    <div className="text-xs text-green-600">Total Amount</div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Per Intern Breakdown:</h4>
                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {calculationResult.intern_breakdown.map((intern) => (
                      <div key={intern.intern_id} className="flex items-center justify-between p-2 border rounded">
                        <div>
                          <div className="font-medium">{intern.intern_name}</div>
                          <div className="text-sm text-muted-foreground">
                            {intern.worked_days} days × ₱{intern.amount_per_day.toFixed(2)}
                          </div>
                        </div>
                        <div className="font-medium">₱{intern.total_amount.toFixed(2)}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      toast({
                        title: 'Calculation Complete',
                        description: 'Please run the database migration to save calculations.',
                      });
                      setIsCalculationDialogOpen(false);
                    }}
                    className="flex-1"
                  >
                    Close
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
