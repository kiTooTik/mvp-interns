import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { CalendarIcon, CalendarDays, Users, Info } from 'lucide-react';
import { format, subMonths } from 'date-fns';

interface Intern {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
}

interface PeriodSelectionProps {
  selectedMonth: Date;
  selectedPeriod: 'full' | 'first' | 'second';
  selectedIntern: string;
  interns: Intern[];
  onMonthChange: (date: Date) => void;
  onPeriodChange: (period: 'full' | 'first' | 'second') => void;
  onInternChange: (internId: string) => void;
  zoomLevel?: 'sm' | 'md' | 'lg';
  isMobile?: boolean;
}

export default function PeriodSelection({
  selectedMonth,
  selectedPeriod,
  selectedIntern,
  interns,
  onMonthChange,
  onPeriodChange,
  onInternChange,
  zoomLevel = 'md',
  isMobile = false
}: PeriodSelectionProps) {
  const getResponsiveClass = () => {
    const zoomMap = {
      sm: 'text-xs md:text-sm lg:text-base',
      md: 'text-sm md:text-base lg:text-lg',
      lg: 'text-base md:text-lg lg:text-xl'
    };
    return zoomMap[zoomLevel];
  };

  return (
    <div className={`grid grid-cols-1 ${isMobile ? 'gap-3' : 'md:grid-cols-3 gap-4'}`}>
      <div className="space-y-2">
        <Label htmlFor="month-select" className={`flex items-center gap-2 ${getResponsiveClass()}`}>
          <CalendarIcon className="h-3 w-3 md:h-4 lg:h-5" />
          <span className={getResponsiveClass()}>Month</span>
          <Tooltip>
            <TooltipTrigger>
              <Info className="h-3 w-3 md:h-4 lg:h-5 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent>
              <p className={getResponsiveClass()}>Select month to calculate allowances for</p>
            </TooltipContent>
          </Tooltip>
        </Label>
        <Select value={format(selectedMonth, 'yyyy-MM')} onValueChange={(value) => onMonthChange(new Date(value + '-01'))}>
          <SelectTrigger id="month-select" className={getResponsiveClass()}>
            <SelectValue placeholder="Select month" />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: 12 }, (_, i) => {
              const date = subMonths(new Date(), i);
              return (
                <SelectItem key={i} value={format(date, 'yyyy-MM')} className={getResponsiveClass()}>
                  {format(date, 'MMMM yyyy')}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="period-select" className={`flex items-center gap-2 ${getResponsiveClass()}`}>
          <CalendarDays className="h-3 w-3 md:h-4 lg:h-5" />
          <span className={getResponsiveClass()}>Pay Period</span>
          <Tooltip>
            <TooltipTrigger>
              <Info className="h-3 w-3 md:h-4 lg:h-5 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent>
              <p className={getResponsiveClass()}>Select 1st-15th, 16th-end, or full month</p>
            </TooltipContent>
          </Tooltip>
        </Label>
        <Select value={selectedPeriod} onValueChange={onPeriodChange}>
          <SelectTrigger id="period-select" className={getResponsiveClass()}>
            <SelectValue placeholder="Select period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="full" className={getResponsiveClass()}>Full Month</SelectItem>
            <SelectItem value="first" className={getResponsiveClass()}>1st - 15th</SelectItem>
            <SelectItem value="second" className={getResponsiveClass()}>16th - End</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="intern-select" className={`flex items-center gap-2 ${getResponsiveClass()}`}>
          <Users className="h-3 w-3 md:h-4 lg:h-5" />
          <span className={getResponsiveClass()}>Intern</span>
          <Tooltip>
            <TooltipTrigger>
              <Info className="h-3 w-3 md:h-4 lg:h-5 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent>
              <p className={getResponsiveClass()}>Choose "All Interns" to see everyone, or select a specific intern</p>
            </TooltipContent>
          </Tooltip>
        </Label>
        <Select value={selectedIntern} onValueChange={onInternChange}>
          <SelectTrigger id="intern-select" className={getResponsiveClass()}>
            <SelectValue placeholder="Select intern" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className={getResponsiveClass()}>All Interns</SelectItem>
            {interns.map((intern) => (
              <SelectItem key={intern.user_id} value={intern.user_id} className={getResponsiveClass()}>
                {intern.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
