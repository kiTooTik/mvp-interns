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

-- Add RLS policies
ALTER TABLE shared_allowances ENABLE ROW LEVEL SECURITY;

-- Allow admins to read all shared allowances
CREATE POLICY "Admins can view all shared allowances" ON shared_allowances
  FOR SELECT USING (
    auth.jwt() ->> 'role' = 'admin'
  );

-- Allow admins to insert shared allowances
CREATE POLICY "Admins can insert shared allowances" ON shared_allowances
  FOR INSERT WITH CHECK (
    auth.jwt() ->> 'role' = 'admin'
  );

-- Allow admins to update shared allowances
CREATE POLICY "Admins can update shared allowances" ON shared_allowances
  FOR UPDATE USING (
    auth.jwt() ->> 'role' = 'admin'
  );

-- Allow admins to delete shared allowances
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

-- Trigger to automatically update updated_at
CREATE TRIGGER update_shared_allowances_updated_at_trigger
  BEFORE UPDATE ON shared_allowances
  FOR EACH ROW
  EXECUTE FUNCTION update_shared_allowances_updated_at();
