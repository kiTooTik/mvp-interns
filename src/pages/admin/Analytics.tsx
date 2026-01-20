import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function AdminAnalytics() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Analytics</h1>
          <p className="text-muted-foreground">
            View attendance trends and insights.
          </p>
        </div>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-lg">Attendance Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Analytics charts will be implemented in Phase 4. This will include attendance trends, punctuality metrics, and date range filters.
            </p>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}