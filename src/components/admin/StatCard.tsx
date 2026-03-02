import { Card, CardContent } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  loading?: boolean;
  className?: string;
}

export function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  color, 
  bgColor, 
  loading = false,
  className 
}: StatCardProps) {
  return (
    <Card className={cn('border-border', className)}>
      <CardContent className="p-6">
        <div className="flex items-center gap-4">
          <div className={cn('p-3 rounded-lg', bgColor)}>
            <Icon className={cn('h-6 w-6', color)} />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-semibold text-foreground">
              {loading ? '...' : value}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
