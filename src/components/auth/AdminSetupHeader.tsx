import { Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AdminSetupHeaderProps {
  className?: string;
}

export function AdminSetupHeader({ className }: AdminSetupHeaderProps) {
  return (
    <div className={cn('text-center mb-8', className)}>
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary mb-4">
        <Shield className="w-8 h-8 text-primary-foreground" />
      </div>
      <h1 className="text-2xl font-semibold text-foreground">Create Admin Account</h1>
      <p className="text-muted-foreground mt-2">
        No admin exists yet. Create the first admin to get started.
      </p>
    </div>
  );
}
