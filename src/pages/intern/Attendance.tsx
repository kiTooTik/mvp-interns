import { useEffect, useState } from 'react';
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { StatusBadge } from '@/components/ui/status-badge';
import { Loader2, CalendarIcon, Clock, AlertTriangle, Download, Filter } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isWeekend, isSameDay, addMonths, subMonths } from 'date-fns';

interface AttendanceRecord {
  id: string;
  date: string;
  time_in: string;
  time_out?: string;
  total_hours?: number;
}

interface CorrectionRequest {
  id: string;
  attendance_id: string;
  date: string;
  reason: string;
  requested_time_out?: string;
  status: string; // Changed from union type to string to match Supabase response
  admin_notes?: string;
  created_at: string;
}

export default function InternAttendance() {
  const { user } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [correctionRequests, setCorrectionRequests] = useState<CorrectionRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCorrectionDialog, setShowCorrectionDialog] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [correctionReason, setCorrectionReason] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  useEffect(() => {
    fetchAttendanceData();
    fetchCorrectionRequests();
  }, [selectedMonth]);

  const fetchAttendanceData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const monthStart = startOfMonth(selectedMonth);
      const monthEnd = endOfMonth(selectedMonth);

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

  const fetchCorrectionRequests = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('correction_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCorrectionRequests(data || []);
    } catch (error) {
      console.error('Error fetching correction requests:', error);
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
    if (isWeekend(date)) return;
    
    const attendance = getAttendanceForDate(date);
    if (attendance && !attendance.time_out) {
      setSelectedDate(date);
      setShowCorrectionDialog(true);
    }
  };

  const submitCorrectionRequest = async () => {
    if (!selectedDate || !correctionReason.trim() || !user) return;

    try {
      const attendance = getAttendanceForDate(selectedDate);
      if (!attendance) return;

      const { error } = await supabase
        .from('correction_requests')
        .insert({
          user_id: user.id,
          attendance_id: attendance.id,
          date: selectedDate.toISOString().split('T')[0],
          reason: correctionReason.trim(),
        });

      if (error) throw error;

      setShowCorrectionDialog(false);
      setCorrectionReason('');
      setSelectedDate(null);
      fetchCorrectionRequests();
    } catch (error) {
      console.error('Error submitting correction request:', error);
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800">Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800">Rejected</Badge>;
      default:
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
    }
  };

  const filteredRequests = filterStatus === 'all' 
    ? correctionRequests 
    : correctionRequests.filter(req => req.status === filterStatus);

  const totalHours = attendanceRecords.reduce((sum, record) => sum + (record.total_hours || 0), 0);
  const totalDays = attendanceRecords.length;

  return (
    <InternLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Attendance History</h1>
            <p className="text-muted-foreground">
              View your attendance records and submit correction requests
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={exportToCSV} disabled={loading || attendanceRecords.length === 0}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {correctionRequests.filter(req => req.status === 'pending').length}
              </div>
              <p className="text-xs text-muted-foreground">Awaiting review</p>
            </CardContent>
          </Card>
        </div>

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
                  onSelect={handleDateClick}
                />
                <div className="mt-4 text-sm text-muted-foreground">
                  <div className="flex gap-4 flex-wrap">
                    <span className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-green-200 border border-green-400 rounded"></div>
                      Complete attendance
                    </span>
                    <span className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-yellow-200 border border-yellow-400 rounded"></div>
                      Incomplete (click to request correction)
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

        {/* Recent Records Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Recent Records
            </CardTitle>
          </CardHeader>
          <CardContent>
            {attendanceRecords.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">
                No attendance records found for this month.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Time In</TableHead>
                      <TableHead>Time Out</TableHead>
                      <TableHead>Hours</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attendanceRecords.slice().reverse().slice(0, 10).map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">
                          {format(new Date(record.date), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell>{format(new Date(record.time_in), 'h:mm a')}</TableCell>
                        <TableCell>
                          {record.time_out ? format(new Date(record.time_out), 'h:mm a') : '—'}
                        </TableCell>
                        <TableCell>
                          {record.total_hours ? `${record.total_hours.toFixed(1)} hrs` : '—'}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={record.time_out ? 'present' : 'pending'} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Correction Requests */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Correction Requests
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="status-filter">Filter:</Label>
                <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredRequests.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No correction requests found.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Admin Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell>{format(new Date(request.date), 'MMM dd, yyyy')}</TableCell>
                      <TableCell className="max-w-xs truncate">{request.reason}</TableCell>
                      <TableCell>{getStatusBadge(request.status)}</TableCell>
                      <TableCell>{format(new Date(request.created_at), 'MMM dd, yyyy')}</TableCell>
                      <TableCell className="max-w-xs truncate">
                        {request.admin_notes || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Correction Request Dialog */}
        <Dialog open={showCorrectionDialog} onOpenChange={setShowCorrectionDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Request Attendance Correction</DialogTitle>
              <DialogDescription>
                You're requesting a correction for {selectedDate && format(selectedDate, 'MMMM dd, yyyy')}.
                Please explain why this attendance record needs to be corrected.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="reason">Reason for Correction</Label>
                <Textarea
                  id="reason"
                  placeholder="Explain why you misclicked or need correction (e.g., 'Forgot to clock out', 'System error', etc.)"
                  value={correctionReason}
                  onChange={(e) => setCorrectionReason(e.target.value)}
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCorrectionDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={submitCorrectionRequest}
                disabled={!correctionReason.trim()}
              >
                Submit Request
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </InternLayout>
  );
}
