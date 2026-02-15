-- Simple Allowance Periods Table Creation
-- This migration creates the allowance_periods table with basic structure only

-- Create the allowance_periods table
CREATE TABLE IF NOT EXISTS allowance_periods (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    total_budget DECIMAL(12,2) NOT NULL,
    daily_rate DECIMAL(12,2) NOT NULL DEFAULT 150.00,
    total_interns INTEGER NOT NULL DEFAULT 0,
    days_covered INTEGER NOT NULL DEFAULT 0,
    total_used_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    total_paid_days INTEGER NOT NULL DEFAULT 0,
    processed_days TEXT[] DEFAULT '{}',
    stop_allocation BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id)
);

-- Ensure all columns exist when table pre-exists from base migration (id, start_date, end_date, locked_at, locked_by, created_at only)
ALTER TABLE allowance_periods ADD COLUMN IF NOT EXISTS total_budget DECIMAL(12,2);
ALTER TABLE allowance_periods ADD COLUMN IF NOT EXISTS daily_rate DECIMAL(12,2) DEFAULT 150.00;
ALTER TABLE allowance_periods ADD COLUMN IF NOT EXISTS total_interns INTEGER DEFAULT 0;
ALTER TABLE allowance_periods ADD COLUMN IF NOT EXISTS days_covered INTEGER DEFAULT 0;
ALTER TABLE allowance_periods ADD COLUMN IF NOT EXISTS total_used_amount DECIMAL(12,2) DEFAULT 0.00;
ALTER TABLE allowance_periods ADD COLUMN IF NOT EXISTS total_paid_days INTEGER DEFAULT 0;
ALTER TABLE allowance_periods ADD COLUMN IF NOT EXISTS processed_days TEXT[] DEFAULT '{}';
ALTER TABLE allowance_periods ADD COLUMN IF NOT EXISTS stop_allocation BOOLEAN DEFAULT FALSE;
ALTER TABLE allowance_periods ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'active';
ALTER TABLE allowance_periods ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
ALTER TABLE allowance_periods ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE allowance_periods ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- Add basic indexes
CREATE INDEX IF NOT EXISTS idx_allowance_periods_status ON allowance_periods(status);
CREATE INDEX IF NOT EXISTS idx_allowance_periods_created_at ON allowance_periods(created_at);

-- Add comments for documentation
COMMENT ON TABLE allowance_periods IS 'Basic allowance periods table for intern management';
COMMENT ON COLUMN allowance_periods.id IS 'Primary key for allowance period records';
COMMENT ON COLUMN allowance_periods.total_budget IS 'Total company budget for allowance period';
COMMENT ON COLUMN allowance_periods.daily_rate IS 'Fixed daily rate per intern (₱150)';
COMMENT ON COLUMN allowance_periods.total_interns IS 'Total number of interns included in calculation';
COMMENT ON COLUMN allowance_periods.days_covered IS 'Total number of days covered by allowance';
COMMENT ON COLUMN allowance_periods.total_used_amount IS 'Total amount of money used for allowance payments';
COMMENT ON COLUMN allowance_periods.total_paid_days IS 'Total number of days that were paid for interns';
COMMENT ON COLUMN allowance_periods.processed_days IS 'Array of dates that were processed for allowance payments';
COMMENT ON COLUMN allowance_periods.stop_allocation IS 'Flag indicating if allowance allocation was stopped due to insufficient budget';
COMMENT ON COLUMN allowance_periods.status IS 'Status of allowance period (active, completed, etc.)';
COMMENT ON COLUMN allowance_periods.start_date IS 'Start date of the allowance period';
COMMENT ON COLUMN allowance_periods.end_date IS 'End date of the allowance period';
COMMENT ON COLUMN allowance_periods.created_at IS 'Timestamp when the allowance period was created';
COMMENT ON COLUMN allowance_periods.created_by IS 'User who created the allowance period';
COMMENT ON COLUMN allowance_periods.updated_at IS 'Timestamp when the allowance period was last updated';
COMMENT ON COLUMN allowance_periods.updated_by IS 'User who last updated the allowance period';

-- Success message
SELECT 'Basic allowance_periods table created successfully!' as status;
