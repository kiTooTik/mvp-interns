import { useEffect, useState, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';
import { Loader2, Pencil, X } from 'lucide-react';
import { processAllowance } from '@/lib/allowance';

export default function CalendarPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const monthParam = searchParams.get('month');
  const initialMonth = monthParam
    ? (() => {
        const [y, m] = monthParam.split('-').map(Number);
        return new Date(y, m - 1, 1);
      })()
    : new Date();
  const [calendarMonth, setCalendarMonth] = useState(initialMonth);
  const [paidDates, setPaidDates] = useState<Set<string>>(new Set());
  const [attendanceDates, setAttendanceDates] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const monthStart = useMemo(() => startOfMonth(calendarMonth), [calendarMonth]);
  const monthEnd = useMemo(() => endOfMonth(calendarMonth), [calendarMonth]);
  const startStr = format(monthStart, 'yyyy-MM-dd');
  const endStr = format(monthEnd, 'yyyy-MM-dd');

  useEffect(() => {
    setSearchParams({ month: format(calendarMonth, 'yyyy-MM') }, { replace: true });
  }, [calendarMonth, setSearchParams]);

  const fetchMonthData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: paymentData, error: payErr } = await supabase
        .from('payment_records')
        .select('payment_date')
        .gte('payment_date', startStr)
        .lte('payment_date', endStr);

      if (payErr) throw payErr;
      setPaidDates(new Set((paymentData ?? []).map((r: { payment_date: string }) => r.payment_date)));

      const { data: attData, error: attErr } = await supabase
        .from('attendance')
        .select('date')
        .eq('status', 'present')
        .gte('date', startStr)
        .lte('date', endStr);

      if (attErr) throw attErr;
      setAttendanceDates(new Set((attData ?? []).map((r: { date: string }) => r.date)));
    } catch {
      setPaidDates(new Set());
      setAttendanceDates(new Set());
    } finally {
      setLoading(false);
    }
  }, [startStr, endStr]);

  useEffect(() => {
    fetchMonthData();
  }, [fetchMonthData]);

  const notPaidDates = useMemo(() => {
    const set = new Set<string>();
    attendanceDates.forEach((d) => {
      if (!paidDates.has(d)) set.add(d);
    });
    return set;
  }, [attendanceDates, paidDates]);

  const handlePrevMonth = () => setCalendarMonth((m) => subMonths(m, 1));
  const handleNextMonth = () => setCalendarMonth((m) => addMonths(m, 1));

  const handleDayClick = async (date: Date) => {
    if (saving || loading) return;
    const dateStr = format(date, 'yyyy-MM-dd');
    const isPaid = paidDates.has(dateStr);

    if (isPaid) {
      if (!window.confirm(`Mark ${dateStr} as not paid? This will remove allowance payments for this date.`)) return;
      setSaving(true);
      try {
        const { error } = await supabase.from('payment_records').delete().eq('payment_date', dateStr);
        if (error) throw error;
        await fetchMonthData();
      } catch (e) {
        console.error(e);
        alert('Failed to remove payments. Please try again.');
      } finally {
        setSaving(false);
      }
      return;
    }

    if (!window.confirm(`Mark ${dateStr} as paid? This will create allowance payments for interns with attendance on this day.`)) return;
    setSaving(true);
    try {
      const { data: periods } = await supabase
        .from('allowance_periods')
        .select('id')
        .lte('start_date', dateStr)
        .gte('end_date', dateStr)
        .order('created_at', { ascending: false })
        .limit(1);
      const periodId = periods?.[0]?.id;
      if (!periodId) {
        alert('No allowance period covers this date. Create one in the Allowance Calculator first.');
        setSaving(false);
        return;
      }
      const result = await processAllowance({
        allowancePeriodId: periodId,
        mode: 'manual',
        dates: [dateStr],
      });
      if (result.error) {
        alert(result.error);
      } else {
        await fetchMonthData();
      }
    } catch (e) {
      console.error(e);
      alert('Failed to mark as paid. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <div className="container mx-auto px-2 sm:px-4 py-4">
        <Card>
          <CardHeader>
            <CardTitle>Allowance Calendar</CardTitle>
            <p className="text-sm text-muted-foreground">
              Calendar view of intern allowance: which days are paid (green) vs have attendance but not yet paid (red). Data refreshes from the database when you open this page or change month.
            </p>
            <div className="flex items-center gap-2 pt-2">
              <Button
                variant={editing ? 'default' : 'outline'}
                size="sm"
                onClick={() => setEditing((e) => !e)}
                disabled={loading || saving}
              >
                {editing ? (
                  <>
                    <X className="h-4 w-4 mr-1.5" />
                    Stop editing
                  </>
                ) : (
                  <>
                    <Pencil className="h-4 w-4 mr-1.5" />
                    Edit calendar
                  </>
                )}
              </Button>
              {editing && (
                <span className="text-sm text-muted-foreground">
                  Click a day to toggle paid / not paid. Confirm in the dialog.
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-4">
              <span className="inline-flex items-center gap-2 rounded-md bg-green-600/15 px-3 py-1.5 text-sm font-medium text-green-700 dark:bg-green-500/20 dark:text-green-400">
                <span className="h-3 w-3 rounded-full bg-green-600 dark:bg-green-500" />
                Paid
              </span>
              <span className="inline-flex items-center gap-2 rounded-md bg-red-600/15 px-3 py-1.5 text-sm font-medium text-red-700 dark:bg-red-500/20 dark:text-red-400">
                <span className="h-3 w-3 rounded-full bg-red-600 dark:bg-red-500" />
                Not Paid
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <Button variant="outline" size="sm" onClick={handlePrevMonth}>
                Previous month
              </Button>
              <span className="font-semibold text-lg min-w-[180px] text-center">
                {format(calendarMonth, 'MMMM yyyy')}
              </span>
              <Button variant="outline" size="sm" onClick={handleNextMonth}>
                Next month
              </Button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin mr-2" />
                Loading calendar data…
              </div>
            ) : (
              <div className="relative inline-block">
                {saving && (
                  <div className="absolute inset-0 bg-background/60 flex items-center justify-center rounded-md z-10">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                )}
                <Calendar
                  month={calendarMonth}
                  onMonthChange={setCalendarMonth}
                  modifiers={{
                    paid: (date) => paidDates.has(format(date, 'yyyy-MM-dd')),
                    notPaid: (date) => notPaidDates.has(format(date, 'yyyy-MM-dd')),
                  }}
                  modifiersClassNames={{
                    paid: 'bg-green-600 text-white hover:bg-green-700 focus:bg-green-600',
                    notPaid: 'bg-red-600 text-white hover:bg-red-700 focus:bg-red-600',
                  }}
                  className="rounded-md border inline-block"
                  {...(editing && {
                    onDayClick: handleDayClick,
                    style: { pointerEvents: saving ? 'none' : undefined },
                  })}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
