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

-- Add RLS policies (DROP IF EXISTS so migration is safe when objects already exist)
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

DROP TRIGGER IF EXISTS update_allowance_calculations_updated_at_trigger ON allowance_calculations;
CREATE TRIGGER update_allowance_calculations_updated_at_trigger
  BEFORE UPDATE ON allowance_calculations
  FOR EACH ROW
  EXECUTE FUNCTION update_allowance_calculations_updated_at();
