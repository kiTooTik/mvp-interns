import { AdminLayout } from '@/components/layout/AdminLayout';
import AllowanceCalculator from '@/components/admin/AllowanceCalculator';

export default function AllowancePage() {
  return (
    <AdminLayout>
      <AllowanceCalculator />
    </AdminLayout>
  );
}
