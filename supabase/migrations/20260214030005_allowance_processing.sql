-- Allowance processing: attendance status, payment_records, process_allowance RPC
-- Business rules: ₱150/day per present intern; full-day only; atomic per day; auto or manual mode.

-- 1) Attendance: add status so we only count 'present' for allowance
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'present'
  CHECK (status IN ('present', 'absent'));

COMMENT ON COLUMN attendance.status IS 'present = counted for allowance; absent = not paid';

-- 2) payment_records: one row per (period, user, date) for daily payments
CREATE TABLE IF NOT EXISTS payment_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id UUID NOT NULL REFERENCES allowance_periods(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  payment_date DATE NOT NULL,
  amount DECIMAL(12,2) NOT NULL DEFAULT 150.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (period_id, user_id, payment_date)
);

CREATE INDEX IF NOT EXISTS idx_payment_records_period_date ON payment_records(period_id, payment_date);
CREATE INDEX IF NOT EXISTS idx_payment_records_user ON payment_records(user_id);

ALTER TABLE payment_records ENABLE ROW LEVEL SECURITY;

-- Only admins can manage payment_records (allowance processing is admin-only)
DROP POLICY IF EXISTS "Admins can view payment_records" ON payment_records;
CREATE POLICY "Admins can view payment_records" ON payment_records FOR SELECT USING (public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "Admins can insert payment_records" ON payment_records;
CREATE POLICY "Admins can insert payment_records" ON payment_records FOR INSERT WITH CHECK (public.is_admin(auth.uid()));

COMMENT ON TABLE payment_records IS 'Daily allowance payments per intern per period; source for per-day breakdown.';

-- 3) process_allowance: single function for automatic and manual mode (transactional)
CREATE OR REPLACE FUNCTION public.process_allowance(
  p_allowance_period_id UUID,
  p_mode TEXT,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_period RECORD;
  v_daily_rate DECIMAL(12,2) := 150.00;
  v_remaining DECIMAL(12,2);
  v_dates_to_process DATE[];
  v_date DATE;
  v_present_count INT;
  v_day_cost DECIMAL(12,2);
  v_processed_days INT := 0;
  v_total_interns_paid INT := 0;
  v_total_used DECIMAL(12,2) := 0;
  v_skipped_dates DATE[] := '{}';
  v_processed_dates_this_run DATE[] := '{}';
  v_result JSONB;
BEGIN
  -- Validate mode
  IF p_mode NOT IN ('automatic', 'manual') THEN
    RETURN jsonb_build_object('error', 'Invalid mode. Use automatic or manual.');
  END IF;

  IF p_mode = 'manual' AND (p_start_date IS NULL OR p_end_date IS NULL) THEN
    RETURN jsonb_build_object('error', 'Manual mode requires start_date and end_date.');
  END IF;

  IF p_mode = 'manual' AND p_start_date > p_end_date THEN
    RETURN jsonb_build_object('error', 'start_date must be <= end_date.');
  END IF;

  -- Lock and read period
  SELECT total_budget, COALESCE(total_used_amount, 0) AS total_used_amount,
         COALESCE(processed_days, '{}') AS processed_days,
         COALESCE(daily_rate, 150) AS daily_rate
  INTO v_period
  FROM allowance_periods
  WHERE id = p_allowance_period_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Allowance period not found.');
  END IF;

  v_remaining := COALESCE(v_period.total_budget, 0) - COALESCE(v_period.total_used_amount, 0);
  IF v_remaining <= 0 THEN
    RETURN jsonb_build_object(
      'processedDays', 0, 'totalInternsPaid', 0, 'totalAmountUsed', COALESCE(v_period.total_used_amount, 0),
      'remainingBalance', 0, 'error', 'No remaining budget.'
    );
  END IF;

  -- Build list of unpaid dates (distinct dates with at least one present attendance not yet paid in this period)
  IF p_mode = 'automatic' THEN
    SELECT COALESCE(array_agg(d ORDER BY d), '{}')
    INTO v_dates_to_process
    FROM (
      SELECT DISTINCT a.date AS d
      FROM attendance a
      WHERE a.status = 'present'
        AND NOT EXISTS (
          SELECT 1 FROM payment_records pr
          WHERE pr.period_id = p_allowance_period_id
            AND pr.user_id = a.user_id AND pr.payment_date = a.date
        )
      ORDER BY d
    ) AS unpaid(d);
  ELSE
    -- Manual: only dates in range
    SELECT COALESCE(array_agg(d ORDER BY d), '{}')
    INTO v_dates_to_process
    FROM (
      SELECT DISTINCT a.date AS d
      FROM attendance a
      WHERE a.status = 'present'
        AND a.date BETWEEN p_start_date AND p_end_date
        AND NOT EXISTS (
          SELECT 1 FROM payment_records pr
          WHERE pr.period_id = p_allowance_period_id
            AND pr.user_id = a.user_id AND pr.payment_date = a.date
        )
      ORDER BY d
    ) AS unpaid(d);
  END IF;

  IF v_dates_to_process = '{}' OR array_length(v_dates_to_process, 1) IS NULL THEN
    RETURN jsonb_build_object(
      'processedDays', 0, 'totalInternsPaid', 0, 'totalAmountUsed', COALESCE(v_period.total_used_amount, 0),
      'remainingBalance', v_remaining, 'perDayBreakdown', '[]'::jsonb
    );
  END IF;

  -- Manual: all-or-nothing check — ensure we can afford every day in range
  IF p_mode = 'manual' THEN
    FOR i IN 1..array_length(v_dates_to_process, 1) LOOP
      v_date := v_dates_to_process[i];
      SELECT COUNT(DISTINCT a.user_id) INTO v_present_count
      FROM attendance a
      WHERE a.date = v_date AND a.status = 'present'
        AND NOT EXISTS (
          SELECT 1 FROM payment_records pr
          WHERE pr.period_id = p_allowance_period_id AND pr.user_id = a.user_id AND pr.payment_date = a.date
        );
      v_day_cost := v_present_count * v_period.daily_rate;
      IF v_present_count > 0 AND v_day_cost > v_remaining THEN
        RETURN jsonb_build_object(
          'error', 'Insufficient budget for date ' || v_date || '. Required: ' || v_day_cost || ', remaining: ' || v_remaining
        );
      END IF;
      v_remaining := v_remaining - v_day_cost;
    END LOOP;
    -- Reset for actual processing
    v_remaining := COALESCE(v_period.total_budget, 0) - COALESCE(v_period.total_used_amount, 0);
  END IF;

  -- Process each date
  FOR i IN 1..array_length(v_dates_to_process, 1) LOOP
    v_date := v_dates_to_process[i];

    SELECT COUNT(DISTINCT a.user_id) INTO v_present_count
    FROM attendance a
    WHERE a.date = v_date AND a.status = 'present'
      AND NOT EXISTS (
        SELECT 1 FROM payment_records pr
        WHERE pr.period_id = p_allowance_period_id AND pr.user_id = a.user_id AND pr.payment_date = a.date
      );

    IF v_present_count = 0 THEN
      CONTINUE;
    END IF;

    v_day_cost := v_present_count * v_period.daily_rate;

    IF v_day_cost > v_remaining THEN
      IF p_mode = 'automatic' THEN
        v_skipped_dates := array_append(v_skipped_dates, v_date);
        CONTINUE;
      ELSE
        -- Manual should not reach here (we pre-validated)
        RETURN jsonb_build_object('error', 'Insufficient budget for date ' || v_date);
      END IF;
    END IF;

    -- Insert payment_records for this day (one row per present intern)
    INSERT INTO payment_records (period_id, user_id, payment_date, amount)
    SELECT p_allowance_period_id, a.user_id, a.date, v_period.daily_rate
    FROM attendance a
    WHERE a.date = v_date AND a.status = 'present'
      AND NOT EXISTS (
        SELECT 1 FROM payment_records pr
        WHERE pr.period_id = p_allowance_period_id AND pr.user_id = a.user_id AND pr.payment_date = a.date
      );

    v_processed_days := v_processed_days + 1;
    v_total_interns_paid := v_total_interns_paid + v_present_count;
    v_total_used := v_total_used + v_day_cost;
    v_remaining := v_remaining - v_day_cost;
    v_processed_dates_this_run := array_append(v_processed_dates_this_run, v_date);

    -- Update period totals
    UPDATE allowance_periods
    SET total_used_amount = COALESCE(total_used_amount, 0) + v_day_cost,
        total_paid_days = COALESCE(total_paid_days, 0) + 1,
        processed_days = array_append(COALESCE(processed_days, '{}'), v_date::TEXT),
        updated_at = NOW()
    WHERE id = p_allowance_period_id;
  END LOOP;

  v_result := jsonb_build_object(
    'processedDays', v_processed_days,
    'totalInternsPaid', v_total_interns_paid,
    'totalAmountUsed', COALESCE(v_period.total_used_amount, 0) + v_total_used,
    'remainingBalance', COALESCE(v_period.total_budget, 0) - (COALESCE(v_period.total_used_amount, 0) + v_total_used),
    'perDayBreakdown', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object('paymentDate', t.payment_date, 'internCount', t.intern_count, 'amount', t.amount)
        ORDER BY t.payment_date
      ), '[]'::jsonb)
      FROM (
        SELECT pr.payment_date, COUNT(*)::int AS intern_count, (COUNT(*) * v_period.daily_rate)::numeric(12,2) AS amount
        FROM payment_records pr
        WHERE pr.period_id = p_allowance_period_id
          AND pr.payment_date = ANY(v_processed_dates_this_run)
        GROUP BY pr.payment_date
      ) t
    )
  );

  IF array_length(v_skipped_dates, 1) > 0 THEN
    v_result := v_result || jsonb_build_object('skippedDates', (
      SELECT jsonb_agg(d ORDER BY d) FROM unnest(v_skipped_dates) AS d
    ));
  END IF;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.process_allowance(UUID, TEXT, DATE, DATE) IS
  'Process allowance: automatic (oldest unpaid first until budget runs out) or manual (date range, all-or-nothing). Returns summary with processedDays, totalInternsPaid, totalAmountUsed, remainingBalance, perDayBreakdown, skippedDates.';
