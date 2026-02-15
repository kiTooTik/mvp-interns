import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  processAllowance,
  processAllowancePreview,
  type ProcessAllowanceParams,
  type ProcessAllowanceResult,
  type AllowanceMode,
} from '@/lib/allowance';
import Header from './allowance/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AllowanceInternTable, { type InternAllowanceRow } from './allowance/AllowanceInternTable';
import AutomaticMode from './allowance/automatic/AutomaticMode';
import ManualMode from './allowance/manual/ManualMode';

const DAILY_RATE = 150;

type RunPayload =
  | { mode: 'automatic'; budget: number }
  | { mode: 'manual'; dates: string[] };

/** Stored after preview so we can persist when user clicks Export to Calendar */
type PendingExport = RunPayload & { startDate: string; endDate: string; totalBudget: number };

export default function AllowanceCalculator() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [mode, setMode] = useState<AllowanceMode>('automatic');
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<ProcessAllowanceResult | null>(null);
  const [lastProcessedPeriodId, setLastProcessedPeriodId] = useState<string | null>(null);
  const [pendingExport, setPendingExport] = useState<PendingExport | null>(null);
  const [internAllowances, setInternAllowances] = useState<InternAllowanceRow[]>([]);
  const [loadingInterns, setLoadingInterns] = useState(false);

  const loadInternAllowancesForPeriod = async (periodId: string): Promise<InternAllowanceRow[]> => {
    const { data: records, error: recErr } = await supabase
      .from('payment_records')
      .select('user_id, payment_date, amount')
      .eq('period_id', periodId)
      .order('payment_date');

    if (recErr || !records?.length) return [];
    const typedRecords = records as { user_id: string; payment_date: string; amount: number }[];
    const userIds = [...new Set(typedRecords.map((r) => r.user_id))];

    const { data: profilesData } = await supabase
      .from('profiles')
      .select('user_id, full_name, email')
      .in('user_id', userIds);

    const byUser: Record<string, { full_name: string; email: string }> = {};
    if (profilesData?.length) {
      profilesData.forEach((p: { user_id: string; full_name: string | null; email: string | null }) => {
        byUser[p.user_id] = { full_name: p.full_name ?? '', email: p.email ?? '' };
      });
    }

    return userIds.map((uid) => {
      const userRecords = typedRecords.filter((r) => r.user_id === uid);
      const dates = userRecords.map((r) => r.payment_date).sort();
      const total = userRecords.reduce((sum, r) => sum + Number(r.amount), 0);
      return {
        user_id: uid,
        full_name: byUser[uid]?.full_name ?? '—',
        email: byUser[uid]?.email ?? '—',
        dates,
        days: dates.length,
        total,
      };
    });
  };

  /** Build intern allowance rows for preview (dates that would be paid; no period yet). */
  const loadInternAllowancesForPreview = async (dates: string[]): Promise<InternAllowanceRow[]> => {
    if (!dates.length) return [];
    const { data: attData, error: attErr } = await supabase
      .from('attendance')
      .select('user_id, date')
      .eq('status', 'present')
      .in('date', dates);
    if (attErr || !attData?.length) return [];
    const paidRes = await supabase
      .from('payment_records')
      .select('user_id, payment_date')
      .in('payment_date', dates);
    const paidSet = new Set(
      (paidRes.data ?? []).map((r: { user_id: string; payment_date: string }) => `${r.user_id}|${r.payment_date}`)
    );
    const unpaid = (attData as { user_id: string; date: string }[]).filter(
      (r) => !paidSet.has(`${r.user_id}|${r.date}`)
    );
    const byUser: Record<string, string[]> = {};
    for (const r of unpaid) {
      if (!byUser[r.user_id]) byUser[r.user_id] = [];
      byUser[r.user_id].push(r.date);
    }
    const userIds = Object.keys(byUser);
    if (!userIds.length) return [];
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('user_id, full_name, email')
      .in('user_id', userIds);
    const byProfile: Record<string, { full_name: string; email: string }> = {};
    if (profilesData?.length) {
      profilesData.forEach((p: { user_id: string; full_name: string | null; email: string | null }) => {
        byProfile[p.user_id] = { full_name: p.full_name ?? '', email: p.email ?? '' };
      });
    }
    return userIds.map((uid) => {
      const dates = [...byUser[uid]].sort();
      return {
        user_id: uid,
        full_name: byProfile[uid]?.full_name ?? '—',
        email: byProfile[uid]?.email ?? '—',
        dates,
        days: dates.length,
        total: dates.length * DAILY_RATE,
      };
    });
  };

  useEffect(() => {
    if (!result || result.processedDays <= 0) {
      setInternAllowances([]);
      return;
    }
    if (!lastProcessedPeriodId) return;
    let cancelled = false;
    setLoadingInterns(true);
    loadInternAllowancesForPeriod(lastProcessedPeriodId)
      .then((rows) => {
        if (!cancelled) setInternAllowances(rows);
      })
      .catch(() => {
        if (!cancelled) setInternAllowances([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingInterns(false);
      });
    return () => { cancelled = true; };
  }, [lastProcessedPeriodId, result?.processedDays]);

  const handleRunPayload = async (payload: RunPayload) => {
    const today = format(new Date(), 'yyyy-MM-dd');
    let startDate: string;
    let endDate: string;
    let totalBudget: number;

    if (payload.mode === 'automatic') {
      startDate = today;
      endDate = today;
      totalBudget = payload.budget;
    } else {
      const dates = payload.dates;
      if (!dates.length) {
        toast({ title: 'Select at least one date', variant: 'destructive' });
        return;
      }
      startDate = dates[0];
      endDate = dates[dates.length - 1];
      const { data: attData, error: attErr } = await supabase
        .from('attendance')
        .select('user_id, date')
        .eq('status', 'present')
        .in('date', dates);
      if (attErr) throw attErr;
      const count = (attData ?? []).length;
      totalBudget = count * DAILY_RATE;
      if (totalBudget <= 0) {
        toast({ title: 'No attendance found for selected dates', variant: 'destructive' });
        return;
      }
    }

    setProcessing(true);
    setResult(null);
    setPendingExport(null);
    setLastProcessedPeriodId(null);
    setInternAllowances([]);
    try {
      const res = await processAllowancePreview({
        mode: payload.mode,
        startDate,
        endDate,
        dates: payload.mode === 'manual' ? payload.dates : undefined,
        totalBudget,
      });
      setResult(res);
      if (res.error) {
        toast({ title: 'Preview failed', description: res.error, variant: 'destructive' });
      } else if (res.processedDays > 0) {
        setPendingExport({
          ...payload,
          startDate,
          endDate,
          totalBudget,
        });
        const previewDates = res.perDayBreakdown?.map((d) => d.paymentDate) ?? [];
        setLoadingInterns(true);
        loadInternAllowancesForPreview(previewDates)
          .then((rows) => setInternAllowances(rows))
          .catch(() => setInternAllowances([]))
          .finally(() => setLoadingInterns(false));
        toast({
          title: 'Preview ready',
          description: `Would process ${res.processedDays} days (₱${res.totalAmountUsed.toFixed(2)}). Click "Export to Calendar" to save.`,
        });
      } else {
        toast({
          title: 'No days to process',
          description: res.error || 'No unpaid attendances or no budget.',
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to preview allowance';
      setResult({
        processedDays: 0,
        totalInternsPaid: 0,
        totalAmountUsed: 0,
        remainingBalance: 0,
        error: msg,
      });
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  const handleExportToCalendar = async () => {
    if (!pendingExport || !result || result.processedDays <= 0) return;
    setProcessing(true);
    try {
      const { data: period, error: insertError } = await supabase
        .from('allowance_periods')
        .insert({
          start_date: pendingExport.startDate,
          end_date: pendingExport.endDate,
          total_budget: pendingExport.totalBudget,
        })
        .select('id')
        .single();

      if (insertError || !period?.id) {
        toast({ title: 'Export failed', description: insertError?.message ?? 'Could not create period', variant: 'destructive' });
        return;
      }

      const params: ProcessAllowanceParams = {
        allowancePeriodId: period.id,
        mode: pendingExport.mode,
      };
      if (pendingExport.mode === 'manual') {
        params.dates = pendingExport.dates;
      }

      const res = await processAllowance(params);
      if (res.error) {
        toast({ title: 'Export failed', description: res.error, variant: 'destructive' });
        return;
      }
      setLastProcessedPeriodId(period.id);
      setPendingExport(null);
      setLoadingInterns(true);
      try {
        const rows = await loadInternAllowancesForPeriod(period.id);
        setInternAllowances(rows);
      } catch {
        setInternAllowances([]);
      } finally {
        setLoadingInterns(false);
      }
      const monthParam =
        result.perDayBreakdown?.[0]?.paymentDate?.slice(0, 7) || format(new Date(), 'yyyy-MM');
      navigate(`/admin/calendar?month=${monthParam}`);
      toast({ title: 'Exported', description: 'Allowance saved and calendar updated.' });
    } catch (err) {
      toast({ title: 'Export failed', description: err instanceof Error ? err.message : 'Unknown error', variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-2 sm:px-4 py-4">
          <Card>
            <CardHeader>
              <CardTitle>Process Allowance</CardTitle>
              <p className="text-sm text-muted-foreground">
                Automatic: enter budget and the system pays oldest unpaid days until it runs out. Manual: pick dates on the calendar and run — no budget input; the system calculates and pays all selected dates (₱150/day per present intern).
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Mode</Label>
                <Select value={mode} onValueChange={(v) => setMode(v as AllowanceMode)}>
                  <SelectTrigger className="max-w-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="automatic">Automatic</SelectItem>
                    <SelectItem value="manual">Manual (pick dates on calendar)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {mode === 'automatic'
                    ? 'Oldest unpaid days will be processed until the budget runs out.'
                    : 'Choose which dates to pay using the calendar below.'}
                </p>
              </div>

              {mode === 'automatic' ? (
                <AutomaticMode onRun={handleRunPayload} processing={processing} />
              ) : (
                <ManualMode
                  onRun={handleRunPayload}
                  processing={processing}
                  resetSelectedTrigger={lastProcessedPeriodId}
                />
              )}

              {result && (
                <Card className="border-muted">
                  <CardHeader>
                    <CardTitle className="text-base">Result</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    {result.error && (
                      <p className="text-destructive font-medium">{result.error}</p>
                    )}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div className="p-2 rounded bg-muted">
                        <div className="font-medium">{result.processedDays}</div>
                        <div className="text-muted-foreground">Days processed</div>
                      </div>
                      <div className="p-2 rounded bg-muted">
                        <div className="font-medium">{result.totalInternsPaid}</div>
                        <div className="text-muted-foreground">Interns paid</div>
                      </div>
                      <div className="p-2 rounded bg-muted">
                        <div className="font-medium">
                          ₱{result.totalAmountUsed.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                        </div>
                        <div className="text-muted-foreground">Total used</div>
                      </div>
                      <div className="p-2 rounded bg-muted">
                        <div className="font-medium">
                          ₱{result.remainingBalance.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                        </div>
                        <div className="text-muted-foreground">Remaining</div>
                      </div>
                    </div>
                    {result.perDayBreakdown && result.perDayBreakdown.length > 0 && (
                      <div>
                        <Label className="text-muted-foreground">Per-day breakdown</Label>
                        <ul className="mt-1 space-y-1">
                          {result.perDayBreakdown.map((day) => (
                            <li key={day.paymentDate} className="flex justify-between">
                              <span>{day.paymentDate}</span>
                              <span>{day.internCount} interns × ₱{day.amount.toFixed(2)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {result.skippedDates && result.skippedDates.length > 0 && (
                      <p className="text-muted-foreground">
                        Skipped (insufficient budget): {result.skippedDates.join(', ')}
                      </p>
                    )}
                    {result.processedDays > 0 && (
                      <div className="pt-4 border-t mt-4 space-y-3">
                        <div className="rounded-lg border bg-muted/30 p-4 min-h-[120px]">
                          <div className="mb-2">
                            <Label className="text-muted-foreground font-medium">Intern allowances</Label>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Per-intern breakdown of dates and totals for this run (before exporting).
                            </p>
                          </div>
                          <AllowanceInternTable
                            rows={internAllowances}
                            loading={loadingInterns}
                            embedded
                            label=""
                            loadingMessage="Loading intern names and DTR…"
                            emptyMessage="No intern data yet. If you just ran the process, wait a moment or run again."
                          />
                        </div>
                        <div className="mt-4 pt-3 border-t text-sm font-semibold flex justify-end">
                          Overall total allowances: ₱
                          {result.totalAmountUsed.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                        </div>
                        {!lastProcessedPeriodId && (
                          <p className="text-sm text-muted-foreground mt-2">
                            Preview only — no data saved yet. Click &quot;Export to Calendar&quot; to save and update the calendar.
                          </p>
                        )}
                        <div className="mt-3 flex justify-end">
                          <Button
                            variant="outline"
                            disabled={!pendingExport || processing}
                            onClick={handleExportToCalendar}
                          >
                            <CalendarIcon className="h-4 w-4 mr-2" />
                            Export to Calendar
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

            </CardContent>
          </Card>
        </div>
      </div>
    </TooltipProvider>
  );
}
