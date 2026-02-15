import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Loader2, Play, Search } from 'lucide-react';
import AllowanceInternTable, { type InternAllowanceRow } from '../AllowanceInternTable';

const DAILY_RATE = 150;

export interface AutomaticModeProps {
  onRun: (payload: { mode: 'automatic'; budget: number }) => Promise<void>;
  processing: boolean;
}

export default function AutomaticMode({ onRun, processing }: AutomaticModeProps) {
  const { toast } = useToast();
  const [allottedAmount, setAllottedAmount] = useState('');
  const [previewRows, setPreviewRows] = useState<InternAllowanceRow[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);

  const fetchPreview = async () => {
    const budget = allottedAmount === '' ? 0 : Number(allottedAmount);
    if (budget <= 0 || !Number.isFinite(budget)) {
      toast({ title: 'Enter budget allowance (₱) first', variant: 'destructive' });
      return;
    }
    setPreviewLoading(true);
    setPreviewRows([]);
    try {
      const attRes = await (supabase as any)
        .from('attendance')
        .select('user_id, date')
        .eq('status', 'present')
        .order('date', { ascending: true });
      const attData = attRes.data as { user_id: string; date: string }[] | null;
      if (attRes.error) throw attRes.error;

      const paidRes = await supabase
        .from('payment_records')
        .select('user_id, payment_date');
      const paidData = paidRes.data as { user_id: string; payment_date: string }[] | null;
      if (paidRes.error) throw paidRes.error;

      const paidSet = new Set((paidData ?? []).map((r) => `${r.user_id}|${r.payment_date}`));
      const unpaid = (attData ?? []).filter((r) => !paidSet.has(`${r.user_id}|${r.date}`));
      const byDate: Record<string, { user_ids: Set<string>; cost: number }> = {};
      for (const r of unpaid) {
        if (!byDate[r.date]) byDate[r.date] = { user_ids: new Set(), cost: 0 };
        byDate[r.date].user_ids.add(r.user_id);
      }
      const sortedDates = Object.keys(byDate).sort();
      for (const d of sortedDates) {
        byDate[d].cost = byDate[d].user_ids.size * DAILY_RATE;
      }
      let used = 0;
      const datesToPay: string[] = [];
      for (const d of sortedDates) {
        if (used + byDate[d].cost <= budget) {
          datesToPay.push(d);
          used += byDate[d].cost;
        } else break;
      }
      const userIds = new Set<string>();
      const perUserDates: Record<string, string[]> = {};
      for (const d of datesToPay) {
        for (const uid of byDate[d].user_ids) {
          userIds.add(uid);
          if (!perUserDates[uid]) perUserDates[uid] = [];
          perUserDates[uid].push(d);
        }
      }
      const ids = [...userIds];
      if (ids.length === 0) {
        setPreviewRows([]);
        setPreviewLoading(false);
        return;
      }
      const { data: profilesData, error: profErr } = await supabase
        .from('profiles')
        .select('user_id, full_name, email')
        .in('user_id', ids);
      if (profErr || !profilesData?.length) {
        setPreviewRows([]);
        setPreviewLoading(false);
        return;
      }
      const byUser = profilesData.reduce<Record<string, { full_name: string; email: string }>>((acc, p) => {
        acc[p.user_id] = { full_name: p.full_name ?? '', email: p.email ?? '' };
        return acc;
      }, {});
      const rows: InternAllowanceRow[] = ids.map((uid) => {
        const dates = (perUserDates[uid] ?? []).sort();
        return {
          user_id: uid,
          full_name: byUser[uid]?.full_name ?? '—',
          email: byUser[uid]?.email ?? '—',
          dates,
          days: dates.length,
          total: dates.length * DAILY_RATE,
        };
      });
      setPreviewRows(rows);
    } catch (e) {
      toast({ title: 'Preview failed', description: e instanceof Error ? e.message : 'Unknown error', variant: 'destructive' });
      setPreviewRows([]);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleRun = () => {
    const budget = Number(allottedAmount) || 0;
    if (budget <= 0 || !Number.isFinite(budget)) {
      toast({ title: 'Enter budget allowance (₱)', variant: 'destructive' });
      return;
    }
    onRun({ mode: 'automatic', budget });
  };

  const runDisabled = processing || allottedAmount === '' || Number(allottedAmount) <= 0;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="allotted">Budget allowance (₱)</Label>
        <Input
          id="allotted"
          type="number"
          min={1}
          step={100}
          placeholder="e.g. 50000 — dates chosen automatically"
          value={allottedAmount}
          onChange={(e) => setAllottedAmount(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Enter the total amount for this run. The system will pay from the oldest unpaid attendance dates until the budget is used.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={fetchPreview} disabled={previewLoading}>
          {previewLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
          {previewLoading ? 'Loading…' : 'Preview (oldest unpaid)'}
        </Button>
        <Button onClick={handleRun} disabled={runDisabled}>
          {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Play className="h-4 w-4 mr-2" />}
          {processing ? 'Calculating…' : 'Calculate preview'}
        </Button>
      </div>

      {(previewLoading || previewRows.length > 0) && (
        <Card className="border-muted">
          <CardHeader>
            <CardTitle className="text-base">Preview — per intern (oldest unpaid)</CardTitle>
            <p className="text-sm text-muted-foreground">
              Based on the budget entered. Dates and amounts below would be paid if you run process.
            </p>
          </CardHeader>
          <CardContent>
            <AllowanceInternTable rows={previewRows} loading={previewLoading} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
