import { format } from 'date-fns';
import { CurrentTimeCard } from './CurrentTimeCard';
import { cn } from '@/lib/utils';

interface DashboardHeaderProps {
  currentTime: Date;
  className?: string;
}

export function DashboardHeader({ currentTime, className }: DashboardHeaderProps) {
  return (
    <div className={cn(
      'flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4',
      className
    )}>
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back! Here's an overview of today's attendance.
        </p>
      </div>
      <CurrentTimeCard currentTime={currentTime} />
    </div>
  );
}
