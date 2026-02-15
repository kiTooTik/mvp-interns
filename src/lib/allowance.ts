/**
 * Allowance processing: types and processAllowance RPC wrapper.
 * Business rules: ₱150/day per present intern; full-day only; atomic per day.
 */

import { supabase } from '@/integrations/supabase/client';

export type AllowanceMode = 'automatic' | 'manual';

export interface ProcessAllowanceParams {
  allowancePeriodId: string;
  mode: AllowanceMode;
  /** For manual: calendar-selected dates (YYYY-MM-DD). Takes precedence over start/end. */
  dates?: string[];
  startDate?: string; // YYYY-MM-DD for manual range
  endDate?: string;   // YYYY-MM-DD for manual range
}

export interface PerDayBreakdownItem {
  paymentDate: string;
  internCount: number;
  amount: number;
}

export interface ProcessAllowanceResult {
  processedDays: number;
  totalInternsPaid: number;
  totalAmountUsed: number;
  remainingBalance: number;
  perDayBreakdown?: PerDayBreakdownItem[];
  skippedDates?: string[];
  error?: string;
}

export interface ProcessAllowancePreviewParams {
  mode: AllowanceMode;
  startDate?: string;
  endDate?: string;
  dates?: string[];
  /** Total budget (cents or as number); used for budget check. Required for automatic; for manual use sum of day costs. */
  totalBudget: number;
}

/**
 * Preview allowance run without writing to the database.
 * Returns same shape as processAllowance. Use before "Export to Calendar"; then call processAllowance to persist.
 */
export async function processAllowancePreview(
  params: ProcessAllowancePreviewParams
): Promise<ProcessAllowanceResult> {
  const { data, error } = await supabase.rpc('process_allowance_preview', {
    p_mode: params.mode,
    p_start_date: params.startDate ?? null,
    p_end_date: params.endDate ?? null,
    p_dates: params.dates?.length ? params.dates : null,
    p_total_budget: params.totalBudget,
  });

  if (error) {
    return {
      processedDays: 0,
      totalInternsPaid: 0,
      totalAmountUsed: 0,
      remainingBalance: 0,
      error: error.message,
    };
  }

  const raw = data as Record<string, unknown> | null;
  if (!raw || typeof raw !== 'object') {
    return {
      processedDays: 0,
      totalInternsPaid: 0,
      totalAmountUsed: 0,
      remainingBalance: 0,
      error: 'Invalid response from server',
    };
  }

  if (raw.error && typeof raw.error === 'string') {
    return {
      processedDays: Number(raw.processedDays) || 0,
      totalInternsPaid: Number(raw.totalInternsPaid) || 0,
      totalAmountUsed: Number(raw.totalAmountUsed) || 0,
      remainingBalance: Number(raw.remainingBalance) ?? 0,
      skippedDates: Array.isArray(raw.skippedDates) ? (raw.skippedDates as string[]) : undefined,
      error: raw.error,
    };
  }

  return {
    processedDays: Number(raw.processedDays) ?? 0,
    totalInternsPaid: Number(raw.totalInternsPaid) ?? 0,
    totalAmountUsed: Number(raw.totalAmountUsed) ?? 0,
    remainingBalance: Number(raw.remainingBalance) ?? 0,
    perDayBreakdown: Array.isArray(raw.perDayBreakdown) ? (raw.perDayBreakdown as PerDayBreakdownItem[]) : undefined,
    skippedDates: Array.isArray(raw.skippedDates) ? (raw.skippedDates as string[]) : undefined,
    error: undefined,
  };
}

/**
 * Process allowance: automatic (oldest unpaid first until budget runs out)
 * or manual (date range, all-or-nothing). All operations are transactional.
 */
export async function processAllowance(
  params: ProcessAllowanceParams
): Promise<ProcessAllowanceResult> {
  const { data, error } = await supabase.rpc('process_allowance', {
    p_allowance_period_id: params.allowancePeriodId,
    p_mode: params.mode,
    p_start_date: params.startDate ?? null,
    p_end_date: params.endDate ?? null,
    p_dates: params.dates?.length ? params.dates : null,
  });

  if (error) {
    return {
      processedDays: 0,
      totalInternsPaid: 0,
      totalAmountUsed: 0,
      remainingBalance: 0,
      error: error.message,
    };
  }

  const raw = data as Record<string, unknown> | null;
  if (!raw || typeof raw !== 'object') {
    return {
      processedDays: 0,
      totalInternsPaid: 0,
      totalAmountUsed: 0,
      remainingBalance: 0,
      error: 'Invalid response from server',
    };
  }

  if (raw.error && typeof raw.error === 'string') {
    return {
      processedDays: Number(raw.processedDays) || 0,
      totalInternsPaid: Number(raw.totalInternsPaid) || 0,
      totalAmountUsed: Number(raw.totalAmountUsed) || 0,
      remainingBalance: Number(raw.remainingBalance) ?? 0,
      skippedDates: Array.isArray(raw.skippedDates) ? (raw.skippedDates as string[]) : undefined,
      error: raw.error,
    };
  }

  return {
    processedDays: Number(raw.processedDays) ?? 0,
    totalInternsPaid: Number(raw.totalInternsPaid) ?? 0,
    totalAmountUsed: Number(raw.totalAmountUsed) ?? 0,
    remainingBalance: Number(raw.remainingBalance) ?? 0,
    perDayBreakdown: Array.isArray(raw.perDayBreakdown) ? (raw.perDayBreakdown as PerDayBreakdownItem[]) : undefined,
    skippedDates: Array.isArray(raw.skippedDates) ? (raw.skippedDates as string[]) : undefined,
    error: undefined,
  };
}
