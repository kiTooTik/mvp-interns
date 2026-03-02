import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UserCheck } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface PresentIntern {
  id: string;
  full_name: string;
  email: string;
  time_in: string;
  total_hours?: number;
}

interface PresentInternsListProps {
  presentInterns: PresentIntern[];
  className?: string;
}

export function PresentInternsList({ presentInterns, className }: PresentInternsListProps) {
  return (
    <Card className={cn('border-border', className)}>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <UserCheck className="h-5 w-5 text-green-600" />
          Currently Present ({presentInterns.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {presentInterns.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            No interns are currently present.
          </p>
        ) : (
          <div className="space-y-3">
            {presentInterns.map((intern) => (
              <div
                key={intern.id}
                className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <UserCheck className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <div className="font-medium text-foreground">
                      {intern.full_name}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {intern.email}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">Clocked In</div>
                  <div className="font-medium text-green-600">
                    {format(new Date(intern.time_in), 'h:mm a')}
                  </div>
                  {intern.total_hours && (
                    <div className="text-xs text-muted-foreground">
                      {intern.total_hours.toFixed(1)} hrs
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
