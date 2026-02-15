-- Create shared_allowances table for tracking daily shared allowance distributions
CREATE TABLE IF NOT EXISTS shared_allowances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL UNIQUE,
  total_amount DECIMAL(10,2) NOT NULL,
  intern_count INTEGER NOT NULL DEFAULT 15,
  amount_per_intern DECIMAL(10,2) GENERATED ALWAYS AS (total_amount / intern_count) STORED,
  given_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_shared_allowances_date ON shared_allowances(date);
CREATE INDEX IF NOT EXISTS idx_shared_allowances_given_by ON shared_allowances(given_by);

-- Add RLS policies (DROP IF EXISTS in case already created by create_shared_allowances.sql)
ALTER TABLE shared_allowances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view all shared allowances" ON shared_allowances;
CREATE POLICY "Admins can view all shared allowances" ON shared_allowances
  FOR SELECT USING (
    auth.jwt() ->> 'role' = 'admin'
  );

DROP POLICY IF EXISTS "Admins can insert shared allowances" ON shared_allowances;
CREATE POLICY "Admins can insert shared allowances" ON shared_allowances
  FOR INSERT WITH CHECK (
    auth.jwt() ->> 'role' = 'admin'
  );

DROP POLICY IF EXISTS "Admins can update shared allowances" ON shared_allowances;
CREATE POLICY "Admins can update shared allowances" ON shared_allowances
  FOR UPDATE USING (
    auth.jwt() ->> 'role' = 'admin'
  );

DROP POLICY IF EXISTS "Admins can delete shared allowances" ON shared_allowances;
CREATE POLICY "Admins can delete shared allowances" ON shared_allowances
  FOR DELETE USING (
    auth.jwt() ->> 'role' = 'admin'
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_shared_allowances_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_shared_allowances_updated_at_trigger ON shared_allowances;
CREATE TRIGGER update_shared_allowances_updated_at_trigger
  BEFORE UPDATE ON shared_allowances
  FOR EACH ROW
  EXECUTE FUNCTION update_shared_allowances_updated_at();

-- Create allowance_calculations table for saving temporary calculations
CREATE TABLE IF NOT EXISTS allowance_calculations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  selected_dates TEXT[] NOT NULL,
  intern_breakdown JSONB NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_allowance_calculations_created_by ON allowance_calculations(created_by);
CREATE INDEX IF NOT EXISTS idx_allowance_calculations_created_at ON allowance_calculations(created_at);

-- Add RLS policies (DROP IF EXISTS in case already created by create_allowance_calculations.sql)
ALTER TABLE allowance_calculations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view all allowance calculations" ON allowance_calculations;
CREATE POLICY "Admins can view all allowance calculations" ON allowance_calculations
  FOR SELECT USING (
    auth.jwt() ->> 'role' = 'admin'
  );

DROP POLICY IF EXISTS "Admins can insert allowance calculations" ON allowance_calculations;
CREATE POLICY "Admins can insert allowance calculations" ON allowance_calculations
  FOR INSERT WITH CHECK (
    auth.jwt() ->> 'role' = 'admin'
  );

DROP POLICY IF EXISTS "Admins can update allowance calculations" ON allowance_calculations;
CREATE POLICY "Admins can update allowance calculations" ON allowance_calculations
  FOR UPDATE USING (
    auth.jwt() ->> 'role' = 'admin'
  );

DROP POLICY IF EXISTS "Admins can delete allowance calculations" ON allowance_calculations;
CREATE POLICY "Admins can delete allowance calculations" ON allowance_calculations
  FOR DELETE USING (
    auth.jwt() ->> 'role' = 'admin'
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_allowance_calculations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at (DROP IF EXISTS in case already created by create_allowance_calculations.sql)
DROP TRIGGER IF EXISTS update_allowance_calculations_updated_at_trigger ON allowance_calculations;
CREATE TRIGGER update_allowance_calculations_updated_at_trigger
  BEFORE UPDATE ON allowance_calculations
  FOR EACH ROW
  EXECUTE FUNCTION update_allowance_calculations_updated_at();
