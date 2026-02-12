import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';

interface InstructionsProps {
  zoomLevel?: 'sm' | 'md' | 'lg';
}

export default function Instructions({ zoomLevel = 'md' }: InstructionsProps) {
  const getResponsiveClass = () => {
    const zoomMap = {
      sm: 'text-xs md:text-sm lg:text-base',
      md: 'text-sm md:text-base lg:text-lg',
      lg: 'text-base md:text-lg lg:text-xl'
    };
    return zoomMap[zoomLevel];
  };

  return (
    <div className="container mx-auto px-4 py-2 p-4 md:p-6 lg:p-8">
      <Alert className="border-blue-200 bg-blue-50">
        <Info className="h-3 w-3 md:h-4 lg:h-5 text-blue-600" />
        <AlertDescription className={`${getResponsiveClass()} text-blue-800`}>
          <strong>How it works:</strong> Each intern receives ₱150 per weekday attended. 
          Select bi-weekly periods (1st-15th or 16th-end) or full month. 
          View attended dates and mark individual days as paid.
          <br />
          <strong>Zoom Controls:</strong> Use A- to shrink, A to reset, A+ to enlarge text.
        </AlertDescription>
      </Alert>
    </div>
  );
}
