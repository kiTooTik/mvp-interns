import { useEffect, useState, useMemo } from 'react';
import { InternLayout } from '@/components/layout/InternLayout';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge } from '@/components/ui/status-badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Loader2, CalendarIcon, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isWeekend, isSameDay, addMonths, subMonths } from 'date-fns';
import { calculateWorkedHoursExcludingLunch } from '@/lib/attendance';

interface AttendanceRecord {
  id: string;
  date: string;
  time_in: string;
  time_out?: string;
  total_hours?: number;
}

export default function InternAttendance() {
  const { user } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage] = useState(15);
  const [filterMonth, setFilterMonth] = useState<string>(format(new Date(), 'yyyy-MM'));
  const [dayRange, setDayRange] = useState<'1-15' | '16-31'>('1-15');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  const [editTimeIn, setEditTimeIn] = useState('');
  const [editTimeOut, setEditTimeOut] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const minutesOptions = useMemo(
    () => Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0')),
    []
  );
  const hour12Options = useMemo(
    () => Array.from({ length: 12 }, (_, i) => String(i + 1)),
    []
  );

  const parse24h = (value: string) => {
    if (!value || !/^\d{2}:\d{2}$/.test(value)) return null;
    const [hStr, mStr] = value.split(':');
    const h = Number(hStr);
    const m = Number(mStr);
    if (!Number.isFinite(h) || !Number.isFinite(m) || h < 0 || h > 23 || m < 0 || m > 59) return null;
    const period: 'AM' | 'PM' = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    return { hour12: String(hour12), minute: String(m).padStart(2, '0'), period };
  };

  const to24h = (hour12: string, minute: string, period: 'AM' | 'PM') => {
    const h12 = Number(hour12);
    const m = Number(minute);
    if (!Number.isFinite(h12) || !Number.isFinite(m)) return '';
    if (h12 < 1 || h12 > 12 || m < 0 || m > 59) return '';
    let h = h12 % 12;
    if (period === 'PM') h += 12;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  const TimePicker = ({
    idPrefix,
    value24,
    onChange24,
  }: {
    idPrefix: string;
    value24: string;
    onChange24: (next: string) => void;
  }) => {
    const parsed = parse24h(value24) ?? { hour12: '8', minute: '00', period: 'AM' as const };
    const setHour = (h: string) => onChange24(to24h(h, parsed.minute, parsed.period));
    const setMinute = (m: string) => onChange24(to24h(parsed.hour12, m, parsed.period));
    const setPeriod = (p: string) => onChange24(to24h(parsed.hour12, parsed.minute, p as 'AM' | 'PM'));

    return (
      <div className="flex items-center gap-2">
        <Select value={parsed.hour12} onValueChange={setHour}>
          <SelectTrigger id={`${idPrefix}-hour`} className="w-24">
            <SelectValue placeholder="Hour" />
          </SelectTrigger>
          <SelectContent>
            {hour12Options.map((h) => (
              <SelectItem key={h} value={h}>
                {h}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={parsed.minute} onValueChange={setMinute}>
          <SelectTrigger id={`${idPrefix}-minute`} className="w-24">
            <SelectValue placeholder="Min" />
          </SelectTrigger>
          <SelectContent>
            {minutesOptions.map((m) => (
              <SelectItem key={m} value={m}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={parsed.period} onValueChange={setPeriod}>
          <SelectTrigger id={`${idPrefix}-period`} className="w-24">
            <SelectValue placeholder="AM/PM" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="AM">AM</SelectItem>
            <SelectItem value="PM">PM</SelectItem>
          </SelectContent>
        </Select>
      </div>
    );
  };

  useEffect(() => {
    fetchAttendanceData();
  }, [selectedMonth]);

  // Fetch data when filters change
  useEffect(() => {
    fetchAttendanceData();
  }, [filterMonth, dayRange]);

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
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Attendance changed:', payload);
          // Refresh attendance data when changes occur
          fetchAttendanceData();
        }
      )
      .subscribe();

    // Also add periodic refresh every 30 seconds as backup
    const interval = setInterval(() => {
      fetchAttendanceData();
    }, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [user, selectedMonth]);

  const fetchAttendanceData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Use filterMonth instead of selectedMonth for data fetching
      const filterDate = filterMonth ? new Date(filterMonth + '-01') : selectedMonth;
      const monthStart = startOfMonth(filterDate);
      const monthEnd = endOfMonth(filterDate);

      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', monthStart.toISOString().split('T')[0])
        .lte('date', monthEnd.toISOString().split('T')[0])
        .order('date', { ascending: true });

      if (error) throw error;
      setAttendanceRecords(data || []);
    } catch (error) {
      console.error('Error fetching attendance:', error);
    } finally {
      setLoading(false);
    }
  };


  const getAttendanceForDate = (date: Date): AttendanceRecord | null => {
    return attendanceRecords.find(record => 
      isSameDay(new Date(record.date), date)
    ) || null;
  };

  const getDayClassNames = (date: Date) => {
    const attendance = getAttendanceForDate(date);
    const isWeekendDay = isWeekend(date);
    
    if (isWeekendDay) {
      return 'bg-gray-100 text-gray-400 cursor-not-allowed';
    }
    
    if (attendance) {
      return 'bg-green-100 text-green-800 border-green-300 hover:bg-green-200';
    }
    
    return 'hover:bg-gray-50';
  };

  const handleDateClick = (date: Date) => {
    // No action needed for correction requests
  };

  const openEditDialog = (record: AttendanceRecord) => {
    setEditingRecord(record);
    setEditTimeIn(record.time_in ? format(new Date(record.time_in), 'HH:mm') : '');
    setEditTimeOut(record.time_out ? format(new Date(record.time_out), 'HH:mm') : '');
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingRecord || !user) return;
    try {
      setSavingEdit(true);
      const dateStr = editingRecord.date; // YYYY-MM-DD
      const updates: any = {};

      // Build dates in local time, then send UTC so DB stores correctly and display stays correct
      if (editTimeIn) {
        const localIn = new Date(`${dateStr}T${editTimeIn}:00`);
        updates.time_in = localIn.toISOString();
      } else {
        updates.time_in = null;
      }

      if (editTimeOut) {
        const localOut = new Date(`${dateStr}T${editTimeOut}:00`);
        updates.time_out = localOut.toISOString();
      } else {
        updates.time_out = null;
      }

      if (editTimeIn && editTimeOut) {
        const start = new Date(`${dateStr}T${editTimeIn}:00`);
        const end = new Date(`${dateStr}T${editTimeOut}:00`);
        updates.total_hours = calculateWorkedHoursExcludingLunch(start, end);
      } else {
        updates.total_hours = null;
      }

      const { error } = await supabase
        .from('attendance')
        .update(updates)
        .eq('id', editingRecord.id)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error updating attendance record:', error);
        return;
      }

      await fetchAttendanceData();
      setEditDialogOpen(false);
      setEditingRecord(null);
      setEditTimeIn('');
      setEditTimeOut('');
    } finally {
      setSavingEdit(false);
    }
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Time In', 'Time Out', 'Total Hours'];
    const rows = attendanceRecords.map(record => [
      record.date,
      record.time_in,
      record.time_out || 'N/A',
      record.total_hours?.toFixed(2) || 'N/A'
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-history-${format(selectedMonth, 'yyyy-MM')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };



  const totalHours = attendanceRecords.reduce((sum, record) => sum + (record.total_hours || 0), 0);
  const totalDays = attendanceRecords.length;

  // Filter and paginate records
  const filteredRecords = useMemo(() => {
    let records = [...attendanceRecords];

    // Apply month filter
    if (filterMonth) {
      records = records.filter(record => record.date.startsWith(filterMonth));
    }

    // Apply day range filter
    records = records.filter(record => {
      const day = parseInt(record.date.split('-')[2]);
      if (dayRange === '1-15') return day >= 1 && day <= 15;
      if (dayRange === '16-31') return day >= 16;
      return true;
    });

    // Sort by date (newest first)
    records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    return records;
  }, [attendanceRecords, filterMonth, dayRange]);

  const totalPages = Math.ceil(filteredRecords.length / recordsPerPage);
  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentRecords = filteredRecords.slice(indexOfFirstRecord, indexOfLastRecord);

  const getStatusForRecord = (record: any) => {
    const recordDate = new Date(record.date);
    const isWeekendDay = isWeekend(recordDate);
    
    if (isWeekendDay) return 'day-off';
    if (record.time_out) return 'present';
    return 'pending';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'present':
        return <Badge className="bg-green-100 text-green-800">Present</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'day-off':
        return <Badge className="bg-blue-100 text-blue-800">Day-Off</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">Unknown</Badge>;
    }
  };

  return (
    <InternLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Attendance History</h1>
            <p className="text-muted-foreground">
              View your attendance records
            </p>
          </div>
          {/* Removed Refresh and Export CSV buttons from intern attendance history as requested */}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Days</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalDays}</div>
              <p className="text-xs text-muted-foreground">Days attended</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalHours.toFixed(1)}</div>
              <p className="text-xs text-muted-foreground">Hours completed</p>
            </CardContent>
          </Card>
        </div>


        {/* Recent Records Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Recent Records
              </CardTitle>
              <div className="flex items-center gap-2">
                <Label htmlFor="month-filter">Month:</Label>
                <Select value={filterMonth} onValueChange={(value) => {
                  setFilterMonth(value);
                  setCurrentPage(1);
                }}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2026-01">January</SelectItem>
                    <SelectItem value="2026-02">February</SelectItem>
                    <SelectItem value="2026-03">March</SelectItem>
                    <SelectItem value="2026-04">April</SelectItem>
                    <SelectItem value="2026-05">May</SelectItem>
                    <SelectItem value="2026-06">June</SelectItem>
                    <SelectItem value="2026-07">July</SelectItem>
                    <SelectItem value="2026-08">August</SelectItem>
                    <SelectItem value="2026-09">September</SelectItem>
                    <SelectItem value="2026-10">October</SelectItem>
                    <SelectItem value="2026-11">November</SelectItem>
                    <SelectItem value="2026-12">December</SelectItem>
                  </SelectContent>
                </Select>
                
                <Label htmlFor="day-range-filter">Days:</Label>
                <Select value={dayRange} onValueChange={(value: any) => {
                  setDayRange(value);
                  setCurrentPage(1);
                }}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1-15">Days 1-15</SelectItem>
                    <SelectItem value="16-31">Days 16-31</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredRecords.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">
                No attendance records found for this month.
              </p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Time In</TableHead>
                        <TableHead>Time Out</TableHead>
                        <TableHead>Hours</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-20">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentRecords.map((record) => {
                        const status = getStatusForRecord(record);
                        return (
                          <TableRow key={record.id}>
                            <TableCell className="font-medium">
                              {format(new Date(record.date), 'MMM d, yyyy')}
                            </TableCell>
                            <TableCell>
                              {record.time_in ? format(new Date(record.time_in), 'h:mm a') : '—'}
                            </TableCell>
                            <TableCell>
                              {record.time_out ? format(new Date(record.time_out), 'h:mm a') : '—'}
                            </TableCell>
                            <TableCell>
                              {record.total_hours ? `${record.total_hours.toFixed(1)} hrs` : '—'}
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(status)}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openEditDialog(record)}
                              >
                                Edit
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <div className="text-sm text-muted-foreground">
                      Showing {indexOfFirstRecord + 1}-{Math.min(indexOfLastRecord, filteredRecords.length)} of {filteredRecords.length} records
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </Button>
                      <span className="text-sm text-muted-foreground px-2">
                        Page {currentPage} of {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Calendar View */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                Attendance Calendar - {format(selectedMonth, 'MMMM yyyy')}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedMonth(subMonths(selectedMonth, 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedMonth(addMonths(selectedMonth, 1))}
                >
                  Next
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <div className="flex justify-center">
                  <Calendar
                    mode="single"
                    selected={selectedMonth}
                    month={selectedMonth}
                    onMonthChange={setSelectedMonth}
                    className="rounded-md border"
                    modifiers={{
                      present: (date) => getAttendanceForDate(date) !== null,
                      incomplete: (date) => {
                        const attendance = getAttendanceForDate(date);
                        return attendance && !attendance.time_out;
                      }
                    }}
                    modifiersStyles={{
                      present: {
                        backgroundColor: '#86efac',
                        color: '#166534',
                        border: '1px solid #22c55e'
                      },
                      incomplete: {
                        backgroundColor: '#fef3c7',
                        color: '#92400e',
                        border: '1px solid #f59e0b'
                      }
                    }}
                    disabled={isWeekend}
                    onSelect={() => {}}
                  />
                </div>
                <div className="mt-4 text-sm text-muted-foreground">
                  <div className="flex gap-4 flex-wrap">
                    <span className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-green-200 border border-green-400 rounded"></div>
                      Complete attendance
                    </span>
                    <span className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-yellow-200 border border-yellow-400 rounded"></div>
                      Incomplete attendance
                    </span>
                    <span className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-gray-100 border border-gray-300 rounded"></div>
                      Weekend
                    </span>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

      </div>
    <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Attendance</DialogTitle>
        </DialogHeader>
        {editingRecord && (
          <div className="space-y-4">
            <div>
              <Label>Date</Label>
              <p className="text-sm text-muted-foreground">
                {format(new Date(editingRecord.date), 'MMMM d, yyyy')}
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="edit-time-in">Time In</Label>
                <TimePicker idPrefix="edit-time-in" value24={editTimeIn} onChange24={setEditTimeIn} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit-time-out">Time Out</Label>
                <TimePicker idPrefix="edit-time-out" value24={editTimeOut} onChange24={setEditTimeOut} />
              </div>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setEditDialogOpen(false)}
            disabled={savingEdit}
          >
            Cancel
          </Button>
          <Button onClick={handleSaveEdit} disabled={savingEdit}>
            {savingEdit ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save changes'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </InternLayout>
  );
}
