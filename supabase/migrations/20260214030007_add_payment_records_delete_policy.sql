-- Allow admins to delete payment_records (e.g. to correct calendar / unpay a day)
DROP POLICY IF EXISTS "Admins can delete payment_records" ON payment_records;
CREATE POLICY "Admins can delete payment_records" ON payment_records
  FOR DELETE USING (public.is_admin(auth.uid()));
