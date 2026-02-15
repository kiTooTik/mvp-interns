import { format, parseISO } from 'date-fns';
import { Loader2 } from 'lucide-react';
import { Label } from '@/components/ui/label';

const DAILY_RATE = 150;

export interface InternAllowanceRow {
  user_id: string;
  full_name: string;
  email: string;
  dates: string[];
  days: number;
  total: number;
}

/** Per-month rows for "For the Month of February" tables. */
function groupByMonth(
  rows: InternAllowanceRow[]
): { monthKey: string; monthLabel: string; rows: { full_name: string; user_id: string; days: number[]; allowance: number }[] }[] {
  const byMonth: Record<string, { full_name: string; user_id: string; days: number[]; allowance: number }[]> = {};
  for (const row of rows) {
    const monthData: Record<string, { days: number[]; allowance: number }> = {};
    for (const d of row.dates) {
      const date = parseISO(d);
      const key = format(date, 'yyyy-MM');
      const day = date.getDate();
      if (!monthData[key]) monthData[key] = { days: [], allowance: 0 };
      monthData[key].days.push(day);
      monthData[key].allowance += DAILY_RATE;
    }
    for (const key of Object.keys(monthData)) {
      const g = monthData[key];
      const uniqueDays = [...new Set(g.days)].sort((a, b) => a - b);
      if (!byMonth[key]) byMonth[key] = [];
      byMonth[key].push({
        full_name: row.full_name,
        user_id: row.user_id,
        days: uniqueDays,
        allowance: g.allowance,
      });
    }
  }
  const sortedKeys = Object.keys(byMonth).sort();
  return sortedKeys.map((monthKey) => ({
    monthKey,
    monthLabel: format(parseISO(`${monthKey}-01`), 'MMMM'),
    rows: byMonth[monthKey],
  }));
}

export interface AllowanceInternTableProps {
  /** Per-intern allowance rows (from payment_records + profiles). */
  rows: InternAllowanceRow[];
  loading?: boolean;
  /** If true, compact layout with label only (e.g. inside Result card). */
  embedded?: boolean;
  /** Section label when embedded. */
  label?: string;
  /** Loading message when embedded. */
  loadingMessage?: string;
  /** Empty message when no data. */
  emptyMessage?: string;
}

export default function AllowanceInternTable({
  rows,
  loading = false,
  embedded = false,
  label = 'Intern allowances',
  loadingMessage = 'Loading intern names and DTR…',
  emptyMessage = 'No intern data yet.',
}: AllowanceInternTableProps) {
  const grouped = groupByMonth(rows);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        {loadingMessage}
      </div>
    );
  }

  if (grouped.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  const content = (
    <div className={embedded ? 'space-y-6 mt-3' : 'space-y-6'}>
      {grouped.map(({ monthKey, monthLabel, rows: monthRows }) => (
        <div key={monthKey}>
          <h4 className="text-sm font-semibold mb-2">For the Month of {monthLabel}</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 pr-4 font-medium">Intern</th>
                  <th className="text-left py-2 pr-4 font-medium">DTR</th>
                  <th className="text-left py-2 pr-4 font-medium">Computation</th>
                  <th className="text-right py-2 font-medium">Allowance</th>
                </tr>
              </thead>
              <tbody>
                {monthRows.map((row) => (
                  <tr key={`${monthKey}-${row.user_id}`} className="border-b last:border-0">
                    <td className="py-2 pr-4 font-medium">{row.full_name}</td>
                    <td className="py-2 pr-4">{row.days.join(', ')}</td>
                    <td className="py-2 pr-4 text-muted-foreground">{row.days.length} × {DAILY_RATE}</td>
                    <td className="py-2 text-right font-medium">
                      ₱{row.allowance.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );

  if (embedded) {
    return (
      <div>
        {label ? <Label className="text-muted-foreground">{label}</Label> : null}
        {content}
      </div>
    );
  }

  return content;
}
