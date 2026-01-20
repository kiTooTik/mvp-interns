import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

type StatusType = 'present' | 'late' | 'absent' | 'pending' | 'approved' | 'rejected';

interface StatusBadgeProps {
  status: StatusType;
  className?: string;
}

const statusConfig: Record<StatusType, { label: string; className: string }> = {
  present: {
    label: 'Present',
    className: 'bg-success/10 text-success border-success/20 hover:bg-success/20',
  },
  late: {
    label: 'Late',
    className: 'bg-warning/10 text-warning border-warning/20 hover:bg-warning/20',
  },
  absent: {
    label: 'Absent',
    className: 'bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20',
  },
  pending: {
    label: 'Pending',
    className: 'bg-info/10 text-info border-info/20 hover:bg-info/20',
  },
  approved: {
    label: 'Approved',
    className: 'bg-success/10 text-success border-success/20 hover:bg-success/20',
  },
  rejected: {
    label: 'Rejected',
    className: 'bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20',
  },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <Badge
      variant="outline"
      className={cn(config.className, className)}
    >
      {config.label}
    </Badge>
  );
}