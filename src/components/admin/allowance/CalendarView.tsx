import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { CalendarDays } from 'lucide-react';
import { format } from 'date-fns';

interface CalendarViewProps {
  startDate: Date;
  endDate: Date;
  selectedDate?: Date;
  onDateSelect: (date: Date | undefined) => void;
  onDayClick: (day: Date) => void;
  getDayStatus: (date: Date, userId: string) => { hasAttendance: boolean; paid: boolean; amount: number } | null;
  internName: string;
  internUserId: string;
  zoomLevel?: 'sm' | 'md' | 'lg';
}

export default function CalendarView({
  startDate,
  endDate,
  selectedDate,
  onDateSelect,
  onDayClick,
  getDayStatus,
  internName,
  internUserId,
  zoomLevel = 'md'
}: CalendarViewProps) {
  const getResponsiveClass = () => {
    const zoomMap = {
      sm: 'text-xs md:text-sm lg:text-base',
      md: 'text-sm md:text-base lg:text-lg',
      lg: 'text-base md:text-lg lg:text-xl'
    };
    return zoomMap[zoomLevel];
  };

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className={`flex items-center gap-2 ${getResponsiveClass()}`}>
          <CalendarDays className="h-4 w-4 md:h-5 lg:h-6 text-primary" />
          <span className={getResponsiveClass()}>Allowance Calendar - {internName}</span>
        </CardTitle>
        <div className={`flex items-center gap-2 md:gap-4 text-sm md:text-base lg:text-lg`}>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 md:w-4 md:h-4 bg-blue-100 border border-blue-300 rounded"></div>
            <span className={getResponsiveClass()}>Present (Unpaid)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 md:w-4 md:h-4 bg-green-100 border border-green-300 rounded"></div>
            <span className={getResponsiveClass()}>Present (Paid)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 md:w-4 md:h-4 bg-gray-100 border border-gray-300 rounded"></div>
            <span className={getResponsiveClass()}>Weekend/Absent</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 md:p-6 lg:p-8">
        <div className="space-y-4">
          {/* Date Range Display */}
          <div className="p-3 md:p-4 bg-muted rounded-lg">
            <p className={`text-center font-medium ${getResponsiveClass()}`}>
              {format(startDate, 'MMMM dd, yyyy')} - {format(endDate, 'MMMM dd, yyyy')}
            </p>
          </div>
          
          {/* Calendar Grid */}
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={onDateSelect}
            defaultMonth={startDate}
            className={`rounded-md border ${getResponsiveClass()}`}
            modifiers={{
              present: (date) => getDayStatus(date, internUserId)?.hasAttendance || false,
              paid: (date) => getDayStatus(date, internUserId)?.paid || false
            }}
            modifiersStyles={{
              present: {
                backgroundColor: '#3b82f6',
                color: 'white',
                borderRadius: '0.375rem'
              },
              paid: {
                backgroundColor: '#22c55e',
                color: 'white',
                borderRadius: '0.375rem'
              }
            }}
            onDayClick={onDayClick}
          />
          
          {/* Selected Date Details */}
          {selectedDate && (
            <div className="mt-4 p-3 md:p-4 bg-muted rounded-lg">
              <p className={`font-medium ${getResponsiveClass()}`}>
                {format(selectedDate, 'EEEE, MMMM d, yyyy')}
              </p>
              <p className={`text-sm md:text-base text-muted-foreground ${getResponsiveClass()}`}>
                {getDayStatus(selectedDate, internUserId)?.hasAttendance 
                  ? getDayStatus(selectedDate, internUserId)?.paid
                    ? '✅ Allowance paid'
                    : `💰 Allowance: ₱${getDayStatus(selectedDate, internUserId)?.amount} (Click to mark as paid)`
                  : '❌ No attendance'
                }
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
