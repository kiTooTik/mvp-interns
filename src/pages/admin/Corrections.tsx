import { AdminLayout } from '@/components/layout/AdminLayout';

export default function CorrectionsPage() {
  return (
    <AdminLayout>
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-muted-foreground">
            Correction Requests Removed
          </h1>
          <p className="text-muted-foreground mt-2">
            This section has been removed from the admin panel.
          </p>
        </div>
      </div>
    </AdminLayout>
  );
}
