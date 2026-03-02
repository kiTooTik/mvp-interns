import { Shield } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface AdminSetupCardProps {
  children?: React.ReactNode;
  className?: string;
}

export function AdminSetupCard({ children, className }: AdminSetupCardProps) {
  return (
    <Card className={cn('border-border shadow-lg', className)}>
      <CardHeader className="pb-4">
        <CardTitle className="text-xl">Admin sign up</CardTitle>
        <CardDescription>
          This account will have full admin access.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {children}
      </CardContent>
    </Card>
  );
}
