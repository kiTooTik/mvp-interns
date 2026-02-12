import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { CalendarIcon, CalendarDays, Users, Info } from 'lucide-react';

interface Intern {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
}

interface CustomDateRangeProps {
  startDate: Date;
  endDate: Date;
  interns: Intern[];
  onStartDateChange: (date: Date) => void;
  onEndDateChange: (date: Date) => void;
  zoomLevel?: 'sm' | 'md' | 'lg';
  isMobile?: boolean;
}

export default function CustomDateRange({
  startDate,
  endDate,
  interns,
  onStartDateChange,
  onEndDateChange,
  zoomLevel = 'md',
  isMobile = false
}: CustomDateRangeProps) {
  const getResponsiveClass = () => {
    const zoomMap = {
      sm: 'text-xs md:text-sm lg:text-base',
      md: 'text-sm md:text-base lg:text-lg',
      lg: 'text-base md:text-lg lg:text-xl'
    };
    return zoomMap[zoomLevel];
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 lg:gap-6">
      <div className="space-y-2">
        <Label htmlFor="start-date" className={`flex items-center gap-2 ${getResponsiveClass()}`}>
          <CalendarIcon className="h-3 w-3 md:h-4 lg:h-5" />
          <span className={getResponsiveClass()}>Start Date</span>
          <Tooltip>
            <TooltipTrigger>
              <Info className="h-3 w-3 md:h-4 lg:h-5 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent>
              <p className={getResponsiveClass()}>Select start date for custom range</p>
            </TooltipContent>
          </Tooltip>
        </Label>
        <Calendar
          mode="single"
          selected={startDate}
          onSelect={(date) => date && onStartDateChange(date)}
          className={`rounded-md border ${getResponsiveClass()}`}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="end-date" className={`flex items-center gap-2 ${getResponsiveClass()}`}>
          <CalendarDays className="h-3 w-3 md:h-4 lg:h-5" />
          <span className={getResponsiveClass()}>End Date</span>
          <Tooltip>
            <TooltipTrigger>
              <Info className="h-3 w-3 md:h-4 lg:h-5 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent>
              <p className={getResponsiveClass()}>Select end date for custom range</p>
            </TooltipContent>
          </Tooltip>
        </Label>
        <Calendar
          mode="single"
          selected={endDate}
          onSelect={(date) => date && onEndDateChange(date)}
          className={`rounded-md border ${getResponsiveClass()}`}
        />
      </div>
    </div>
  );
}
