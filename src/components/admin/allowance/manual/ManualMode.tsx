import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Loader2, Play } from 'lucide-react';
import { format, startOfMonth, endOfMonth, isSameDay, addMonths, subMonths } from 'date-fns';

export interface ManualModeProps {
  onRun: (payload: { mode: 'manual'; dates: string[] }) => Promise<void>;
  processing: boolean;
  /** When this changes (e.g. after a successful run), selected dates are cleared. */
  resetSelectedTrigger?: string | null;
}

export default function ManualMode({ onRun, processing, resetSelectedTrigger }: ManualModeProps) {
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [attendanceDates, setAttendanceDates] = useState<string[]>([]);

  useEffect(() => {
    if (resetSelectedTrigger) setSelectedDates([]);
  }, [resetSelectedTrigger]);

  useEffect(() => {
    const start = startOfMonth(calendarMonth);
    const end = endOfMonth(calendarMonth);
    const startStr = format(start, 'yyyy-MM-dd');
    const endStr = format(end, 'yyyy-MM-dd');
    supabase
      .from('attendance')
      .select('date')
      .eq('status', 'present')
      .gte('date', startStr)
      .lte('date', endStr)
      .then(({ data, error }) => {
        if (error) {
          setAttendanceDates([]);
          return;
        }
        const dates = [...new Set((data ?? []).map((r: { date: string }) => r.date))];
        setAttendanceDates(dates);
      });
  }, [calendarMonth]);

  const handleCalendarDay = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    if (!attendanceDates.includes(dateStr)) return;
    const exists = selectedDates.some((d) => isSameDay(d, date));
    if (exists) setSelectedDates(selectedDates.filter((d) => !isSameDay(d, date)));
    else setSelectedDates([...selectedDates, date].sort((a, b) => a.getTime() - b.getTime()));
  };

  const handleRun = () => {
    if (selectedDates.length === 0) return;
    onRun({ mode: 'manual', dates: selectedDates.map((d) => format(d, 'yyyy-MM-dd')) });
  };

  const runDisabled = processing || selectedDates.length === 0;

  return (
    <div className="space-y-6">
      <Card className="border-muted">
        <CardHeader>
          <CardTitle className="text-base">Select dates to pay</CardTitle>
          <p className="text-sm text-muted-foreground">
            Click a day that has attendance to include it. Only days with present interns are selectable. Then click Calculate preview.
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4 mb-4">
            <Button variant="outline" size="sm" onClick={() => setCalendarMonth(subMonths(calendarMonth, 1))}>
              Previous
            </Button>
            <span className="font-medium">{format(calendarMonth, 'MMMM yyyy')}</span>
            <Button variant="outline" size="sm" onClick={() => setCalendarMonth(addMonths(calendarMonth, 1))}>
              Next
            </Button>
            <span className="text-sm text-muted-foreground">{selectedDates.length} selected</span>
            {selectedDates.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setSelectedDates([])}>
                Clear
              </Button>
            )}
          </div>
          <Calendar
            mode="single"
            month={calendarMonth}
            onMonthChange={setCalendarMonth}
            selected={undefined}
            modifiers={{
              hasAttendance: (date) => attendanceDates.includes(format(date, 'yyyy-MM-dd')),
              selected: (date) => selectedDates.some((d) => isSameDay(d, date)),
              disabled: (date) => !attendanceDates.includes(format(date, 'yyyy-MM-dd')),
            }}
            modifiersClassNames={{
              hasAttendance: 'bg-muted cursor-pointer',
              selected: 'bg-primary text-primary-foreground font-semibold',
              disabled: 'opacity-40 cursor-not-allowed',
            }}
            onSelect={handleCalendarDay}
            className="rounded-md border inline-block"
          />
        </CardContent>
      </Card>

      <Button onClick={handleRun} disabled={runDisabled}>
        {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Play className="h-4 w-4 mr-2" />}
        {processing ? 'Calculating…' : 'Calculate preview'}
      </Button>
    </div>
  );
}
