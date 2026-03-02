import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lock, ChevronRight } from 'lucide-react';

export default function AdminSettings() {
  const navigate = useNavigate();

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
          <p className="text-muted-foreground">Configure system settings and preferences.</p>
        </div>

        {/* Account Section */}
        <div>
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">Account</h2>
          <Card className="border-border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-muted rounded-md">
                    <Lock className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Change Password</CardTitle>
                    <CardDescription className="text-sm">Update your account password</CardDescription>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/admin/change-password')}
                  className="flex items-center gap-1"
                >
                  Change
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
