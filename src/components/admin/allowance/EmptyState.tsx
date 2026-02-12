import { Card, CardContent } from '@/components/ui/card';
import { Calculator } from 'lucide-react';

interface EmptyStateProps {
  zoomLevel?: 'sm' | 'md' | 'lg';
}

export default function EmptyState({ zoomLevel = 'md' }: EmptyStateProps) {
  const getResponsiveClass = () => {
    const zoomMap = {
      sm: 'text-xs md:text-sm lg:text-base',
      md: 'text-sm md:text-base lg:text-lg',
      lg: 'text-base md:text-lg lg:text-xl'
    };
    return zoomMap[zoomLevel];
  };

  return (
    <Card className="border-border">
      <CardContent className="py-8 md:py-12 text-center">
        <div className="mx-auto w-12 h-12 md:w-16 md:h-16 bg-muted rounded-full flex items-center justify-center mb-4">
          <Calculator className="h-6 w-6 md:h-8 lg:h-10 lg:w-10 text-muted-foreground" />
        </div>
        <h3 className={`text-lg md:text-xl lg:text-2xl font-semibold text-foreground mb-2`}>No Calculations Yet</h3>
        <p className={`text-sm md:text-base lg:text-lg text-muted-foreground max-w-md mx-auto ${getResponsiveClass()}`}>
          Select a month, period, and intern, then click "Calculate Allowances" to see the results.
        </p>
      </CardContent>
    </Card>
  );
}
