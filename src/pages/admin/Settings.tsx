import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

export default function AdminSettings() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
          <p className="text-muted-foreground">
            Configure system settings and preferences.
          </p>
        </div>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-lg">Location Enforcement</CardTitle>
            <CardDescription>
              Configure office location settings for attendance verification.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="office-ip">Office IP Address</Label>
              <Input
                id="office-ip"
                placeholder="e.g., 203.177.xxx.xxx"
                disabled
              />
              <p className="text-xs text-muted-foreground">
                IP verification is disabled during development.
              </p>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="latitude">Office Latitude</Label>
                <Input id="latitude" placeholder="e.g., 14.5995" disabled />
              </div>
              <div className="space-y-2">
                <Label htmlFor="longitude">Office Longitude</Label>
                <Input id="longitude" placeholder="e.g., 120.9842" disabled />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="radius">Geofence Radius (meters)</Label>
              <Input id="radius" placeholder="e.g., 100" disabled />
              <p className="text-xs text-muted-foreground">
                GPS verification is disabled during development.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-lg">Allowance Settings</CardTitle>
            <CardDescription>
              Configure daily allowance rate for interns.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="daily-rate">Daily Allowance Rate (₱)</Label>
              <Input
                id="daily-rate"
                type="number"
                placeholder="150"
                defaultValue="150"
                disabled
              />
              <p className="text-xs text-muted-foreground">
                The allowance per working day for interns with complete attendance.
              </p>
            </div>

            <Button disabled>
              Save Settings
            </Button>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}