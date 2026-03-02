import { Card, CardContent } from '@/components/ui/card';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface CurrentTimeCardProps {
  currentTime: Date;
  className?: string;
}

export function CurrentTimeCard({ currentTime, className }: CurrentTimeCardProps) {
  return (
    <Card className={cn(
      'border-border bg-gradient-to-r from-primary/10 to-primary/5',
      className
    )}>
      <CardContent className="p-4 text-center">
        <div className="text-sm text-muted-foreground mb-1">Current Time</div>
        <div className="text-2xl font-bold text-primary">
          {format(currentTime, 'h:mm:ss a')}
        </div>
        <div className="text-sm text-muted-foreground">
          {format(currentTime, 'EEEE, MMMM d, yyyy')}
        </div>
      </CardContent>
    </Card>
  );
}
