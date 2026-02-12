import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Calculator, FileSpreadsheet } from 'lucide-react';

interface ActionButtonsProps {
  loading: boolean;
  onCalculate: () => void;
  onExport: () => void;
  hasCalculations: boolean;
  zoomLevel?: 'sm' | 'md' | 'lg';
  isMobile?: boolean;
}

export default function ActionButtons({ 
  loading, 
  onCalculate, 
  onExport, 
  hasCalculations, 
  zoomLevel = 'md',
  isMobile = false
}: ActionButtonsProps) {
  const getResponsiveClass = () => {
    const zoomMap = {
      sm: 'text-xs md:text-sm lg:text-base',
      md: 'text-sm md:text-base lg:text-lg',
      lg: 'text-base md:text-lg lg:text-xl'
    };
    return zoomMap[zoomLevel];
  };

  return (
    <div className={`flex ${isMobile ? 'flex-col' : 'flex-row'} gap-2 mt-4`}>
      <Button onClick={onCalculate} disabled={loading} className={`flex-1 ${getResponsiveClass()}`}>
        {loading ? (
          <>
            <div className={`w-3 h-3 md:w-4 md:h-4 lg:w-5 lg:h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2`} />
            <span className={getResponsiveClass()}>Calculating...</span>
          </>
        ) : (
          <>
            <Calculator className={`mr-2 h-4 w-4 md:h-5 lg:h-6 lg:w-6`} />
            <span className={getResponsiveClass()}>Calculate Allowances</span>
          </>
        )}
      </Button>
    
      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            variant="outline" 
            onClick={onExport} 
            disabled={!hasCalculations}
            className={`flex items-center gap-2 ${getResponsiveClass()}`}
          >
            <FileSpreadsheet className={`h-4 w-4 md:h-5 lg:h-6`} />
            <span className={getResponsiveClass()}>Export CSV</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p className={getResponsiveClass()}>Download allowance report as Excel-compatible CSV file</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
