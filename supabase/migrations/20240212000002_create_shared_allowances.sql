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

-- Add RLS policies (DROP IF EXISTS so migration is safe when objects already exist)
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
