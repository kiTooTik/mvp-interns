-- Preview allowance run without writing to payment_records or allowance_periods.
-- "Unpaid" = no payment_record for (user_id, date) in any period (so we don't double-pay).
-- Call this on Run; call process_allowance only when user clicks "Export to Calendar".

CREATE OR REPLACE FUNCTION public.process_allowance_preview(
  p_mode TEXT,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL,
  p_dates DATE[] DEFAULT NULL,
  p_total_budget DECIMAL DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_daily_rate DECIMAL(12,2) := 150.00;
  v_remaining DECIMAL(12,2);
  v_dates_to_process DATE[] := '{}';
  v_date DATE;
  v_present_count INT;
  v_day_cost DECIMAL(12,2);
  v_processed_days INT := 0;
  v_total_interns_paid INT := 0;
  v_total_used DECIMAL(12,2) := 0;
  v_skipped_dates DATE[] := '{}';
  v_processed_dates_this_run DATE[] := '{}';
  v_per_day JSONB;
  v_result JSONB;
BEGIN
  IF p_mode NOT IN ('automatic', 'manual') THEN
    RETURN jsonb_build_object('error', 'Invalid mode. Use automatic or manual.');
  END IF;

  v_remaining := COALESCE(p_total_budget, 0);

  -- Manual: use p_dates or derive from start/end (unpaid = no payment for that user/date in any period)
  IF p_mode = 'manual' THEN
    IF p_dates IS NOT NULL AND array_length(p_dates, 1) > 0 THEN
      v_dates_to_process := p_dates;
    ELSIF p_start_date IS NOT NULL AND p_end_date IS NOT NULL AND p_start_date <= p_end_date THEN
      SELECT COALESCE(array_agg(d ORDER BY d), '{}')
      INTO v_dates_to_process
      FROM (
        SELECT DISTINCT a.date AS d
        FROM attendance a
        WHERE a.status = 'present'
          AND a.date BETWEEN p_start_date AND p_end_date
          AND NOT EXISTS (
            SELECT 1 FROM payment_records pr
            WHERE pr.user_id = a.user_id AND pr.payment_date = a.date
          )
        ORDER BY d
      ) AS unpaid(d);
    ELSE
      RETURN jsonb_build_object('error', 'Manual mode: provide dates or start and end date.');
    END IF;
  END IF;

  -- Automatic: oldest unpaid dates first (unpaid = no payment for that user/date in any period)
  IF p_mode = 'automatic' THEN
    SELECT COALESCE(array_agg(d ORDER BY d), '{}')
    INTO v_dates_to_process
    FROM (
      SELECT DISTINCT a.date AS d
      FROM attendance a
      WHERE a.status = 'present'
        AND NOT EXISTS (
          SELECT 1 FROM payment_records pr
          WHERE pr.user_id = a.user_id AND pr.payment_date = a.date
        )
      ORDER BY d
    ) AS unpaid(d);
  END IF;

  IF v_dates_to_process = '{}' OR array_length(v_dates_to_process, 1) IS NULL THEN
    RETURN jsonb_build_object(
      'processedDays', 0, 'totalInternsPaid', 0, 'totalAmountUsed', 0,
      'remainingBalance', v_remaining, 'perDayBreakdown', '[]'::jsonb
    );
  END IF;

  IF v_remaining <= 0 THEN
    RETURN jsonb_build_object(
      'processedDays', 0, 'totalInternsPaid', 0, 'totalAmountUsed', 0,
      'remainingBalance', 0, 'error', 'No budget provided.', 'perDayBreakdown', '[]'::jsonb
    );
  END IF;

  -- Manual: all-or-nothing budget check (preview)
  IF p_mode = 'manual' THEN
    v_remaining := COALESCE(p_total_budget, 0);
    FOR i IN 1..array_length(v_dates_to_process, 1) LOOP
      v_date := v_dates_to_process[i];
      SELECT COUNT(DISTINCT a.user_id) INTO v_present_count
      FROM attendance a
      WHERE a.date = v_date AND a.status = 'present'
        AND NOT EXISTS (
          SELECT 1 FROM payment_records pr
          WHERE pr.user_id = a.user_id AND pr.payment_date = a.date
        );
      v_day_cost := v_present_count * v_daily_rate;
      IF v_present_count > 0 AND v_day_cost > v_remaining THEN
        RETURN jsonb_build_object(
          'error', 'Insufficient budget for date ' || v_date || '. Required: ' || v_day_cost || ', remaining: ' || v_remaining
        );
      END IF;
      v_remaining := v_remaining - v_day_cost;
    END LOOP;
  END IF;

  -- Process each date (no INSERT/UPDATE)
  v_remaining := COALESCE(p_total_budget, 0);
  FOR i IN 1..array_length(v_dates_to_process, 1) LOOP
    v_date := v_dates_to_process[i];

    SELECT COUNT(DISTINCT a.user_id) INTO v_present_count
    FROM attendance a
    WHERE a.date = v_date AND a.status = 'present'
      AND NOT EXISTS (
        SELECT 1 FROM payment_records pr
        WHERE pr.user_id = a.user_id AND pr.payment_date = a.date
      );

    IF v_present_count = 0 THEN
      CONTINUE;
    END IF;

    v_day_cost := v_present_count * v_daily_rate;

    IF v_day_cost > v_remaining THEN
      IF p_mode = 'automatic' THEN
        v_skipped_dates := array_append(v_skipped_dates, v_date);
        CONTINUE;
      ELSE
        RETURN jsonb_build_object('error', 'Insufficient budget for date ' || v_date);
      END IF;
    END IF;

    v_processed_days := v_processed_days + 1;
    v_total_interns_paid := v_total_interns_paid + v_present_count;
    v_total_used := v_total_used + v_day_cost;
    v_remaining := v_remaining - v_day_cost;
    v_processed_dates_this_run := array_append(v_processed_dates_this_run, v_date);
  END LOOP;

  v_result := jsonb_build_object(
    'processedDays', v_processed_days,
    'totalInternsPaid', v_total_interns_paid,
    'totalAmountUsed', v_total_used,
    'remainingBalance', v_remaining,
    'perDayBreakdown', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'paymentDate', d,
          'internCount', (SELECT COUNT(DISTINCT a.user_id)::int FROM attendance a
            WHERE a.date = d AND a.status = 'present'
              AND NOT EXISTS (SELECT 1 FROM payment_records pr WHERE pr.user_id = a.user_id AND pr.payment_date = a.date)),
          'amount', (SELECT COUNT(DISTINCT a.user_id)::numeric * v_daily_rate FROM attendance a
            WHERE a.date = d AND a.status = 'present'
              AND NOT EXISTS (SELECT 1 FROM payment_records pr WHERE pr.user_id = a.user_id AND pr.payment_date = a.date))
        )
        ORDER BY d
      ), '[]'::jsonb)
      FROM unnest(v_processed_dates_this_run) AS d
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

COMMENT ON FUNCTION public.process_allowance_preview(TEXT, DATE, DATE, DATE[], DECIMAL) IS
  'Preview allowance run without writing. Use before Export to Calendar; then call process_allowance to persist.';
