import { AdminLayout } from '@/components/layout/AdminLayout';
import CorrectionRequests from '@/components/admin/CorrectionRequests';

export default function CorrectionsPage() {
  return (
    <AdminLayout>
      <CorrectionRequests />
    </AdminLayout>
  );
}
