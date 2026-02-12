import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Clock, Calendar, Users, LogIn, LogOut } from 'lucide-react';
import { format } from 'date-fns';

interface AttendanceRecord {
  id: string;
  user_id: string;
  date: string;
  total_hours: number;
  time_in?: string;
  time_out?: string;
  created_at?: string;
}

interface DailyTimeRecordProps {
  records: AttendanceRecord[];
  loading?: boolean;
}

export default function DailyTimeRecord({ records, loading = false }: DailyTimeRecordProps) {
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, 'MMMM d, yyyy');
    } catch {
      return dateString;
    }
  };

  const formatTime = (timeString?: string) => {
    if (!timeString) return '--:--';
    try {
      const [time] = timeString.split('.');
      return time || timeString;
    } catch {
      return timeString;
    }
  };

  if (loading) {
    return (
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm md:text-base lg:text-lg">
            <Clock className="h-4 w-4 md:h-5 lg:h-6 text-primary" />
            Daily Time Record
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 md:p-6 lg:p-8">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (records.length === 0) {
    return (
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm md:text-base lg:text-lg">
            <Clock className="h-4 w-4 md:h-5 lg:h-6 text-primary" />
            Daily Time Record
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 md:p-6 lg:p-8">
          <div className="text-center py-8">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-sm md:text-base lg:text-lg">
              No attendance records found
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm md:text-base lg:text-lg">
          <Clock className="h-4 w-4 md:h-5 lg:h-6 text-primary" />
          Daily Time Record
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 md:p-6 lg:p-8">
        <div className="space-y-4">
          {/* Quick Add Section */}
          <div className="border rounded-lg p-4 bg-muted/30">
            <h3 className="font-medium text-sm md:text-base lg:text-lg mb-4">
              Quick Add Attendance
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date-input" className="text-sm md:text-base lg:text-lg">
                  Date
                </Label>
                <Input
                  id="date-input"
                  type="date"
                  className="text-sm md:text-base lg:text-lg"
                  placeholder="Select date"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="time-in" className="text-sm md:text-base lg:text-lg">
                  Time In
                </Label>
                <Input
                  id="time-in"
                  type="time"
                  className="text-sm md:text-base lg:text-lg"
                  placeholder="09:00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="time-out" className="text-sm md:text-base lg:text-lg">
                  Time Out
                </Label>
                <Input
                  id="time-out"
                  type="time"
                  className="text-sm md:text-base lg:text-lg"
                  placeholder="18:00"
                />
              </div>
              <div className="flex items-end">
                <Button className="w-full text-sm md:text-base lg:text-lg">
                  Add Record
                </Button>
              </div>
            </div>
          </div>

          {/* Attendance Records List */}
          <div className="space-y-3">
            <h3 className="font-medium text-sm md:text-base lg:text-lg">
              Recent Attendance Logs
            </h3>
            <div className="space-y-2">
              {records.map((record) => (
                <div
                  key={record.id}
                  className="border rounded-lg p-3 md:p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-primary" />
                      <span className="font-medium text-sm md:text-base lg:text-lg">
                        {formatDate(record.date)}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm md:text-base lg:text-lg">
                      <div className="flex items-center gap-2">
                        <LogIn className="h-4 w-4 text-green-600" />
                        <span className="text-green-600">
                          {formatTime(record.time_in)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <LogOut className="h-4 w-4 text-red-600" />
                        <span className="text-red-600">
                          {formatTime(record.time_out)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 text-xs md:text-sm text-muted-foreground">
                    Total Hours: {record.total_hours}h
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
