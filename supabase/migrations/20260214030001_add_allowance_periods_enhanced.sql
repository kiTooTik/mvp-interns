-- Enhanced Allowance Periods Migration
-- Adds fields for advanced day-by-day processing
-- This migration should be run after creating the allowance_periods table
-- Depends on: 20260214030004_create_allowance_periods_simple.sql

-- Add new columns to allowance_periods table (only if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'allowance_periods' AND table_schema = 'public') THEN
        ALTER TABLE allowance_periods ADD COLUMN IF NOT EXISTS total_paid_days INTEGER DEFAULT 0;
        ALTER TABLE allowance_periods ADD COLUMN IF NOT EXISTS total_used_amount DECIMAL(12,2) DEFAULT 0.00;
        ALTER TABLE allowance_periods ADD COLUMN IF NOT EXISTS processed_days TEXT[] DEFAULT '{}';
        ALTER TABLE allowance_periods ADD COLUMN IF NOT EXISTS stop_allocation BOOLEAN DEFAULT FALSE;
        ALTER TABLE allowance_periods ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';
        
        -- Add indexes only if the columns exist (table may pre-exist from base migration without them)
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'allowance_periods' AND column_name = 'status') THEN
            CREATE INDEX IF NOT EXISTS idx_allowance_periods_status ON allowance_periods(status);
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'allowance_periods' AND column_name = 'created_at') THEN
            CREATE INDEX IF NOT EXISTS idx_allowance_periods_created_at ON allowance_periods(created_at);
        END IF;
        
        -- Add comments for documentation
        COMMENT ON COLUMN allowance_periods.total_paid_days IS 'Total number of days that were paid for interns';
        COMMENT ON COLUMN allowance_periods.total_used_amount IS 'Total amount of money used for allowance payments';
        COMMENT ON COLUMN allowance_periods.processed_days IS 'Array of dates that were processed for allowance payments';
        COMMENT ON COLUMN allowance_periods.stop_allocation IS 'Flag indicating if allowance allocation was stopped due to insufficient budget';
        COMMENT ON TABLE allowance_periods IS 'Enhanced allowance periods with day-by-day processing and budget tracking';
    END IF;
END $$;
