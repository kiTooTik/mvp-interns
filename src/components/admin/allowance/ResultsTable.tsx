import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { DollarSign, CalendarDays } from 'lucide-react';

interface Intern {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
}

interface AllowanceCalculation {
  intern: Intern;
  daysAttended: number;
  totalHours: number;
  allowance: number;
  totalPaid: number;
  totalUnpaid: number;
  attendedDates: string[];
}

interface ResultsTableProps {
  calculations: AllowanceCalculation[];
  showCalendar: boolean;
  onCalendarView: (internId: string) => void;
  getPaymentStatusBadge: (paid: number, total: number) => React.ReactNode;
  zoomLevel?: 'sm' | 'md' | 'lg';
  isMobile?: boolean;
}

export default function ResultsTable({
  calculations,
  showCalendar,
  onCalendarView,
  getPaymentStatusBadge,
  zoomLevel = 'md',
  isMobile = false
}: ResultsTableProps) {
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
      <CardHeader>
        <CardTitle className={`flex items-center gap-2 ${getResponsiveClass()}`}>
          <DollarSign className="h-4 w-4 md:h-5 lg:h-6 text-primary" />
          <span className={getResponsiveClass()}>Allowance Summary</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 md:p-6 lg:p-8">
        <div className={`rounded-md border overflow-x-auto ${isMobile ? 'text-xs' : ''}`}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className={getResponsiveClass()}>Intern Name</TableHead>
                <TableHead className={getResponsiveClass()}>Email</TableHead>
                <TableHead className={`text-center ${getResponsiveClass()}`}>Days Attended</TableHead>
                <TableHead className={`text-center ${getResponsiveClass()}`}>Attended Dates</TableHead>
                <TableHead className={`text-center ${getResponsiveClass()}`}>Total Hours</TableHead>
                <TableHead className={`text-right ${getResponsiveClass()}`}>Total Allowance</TableHead>
                <TableHead className={`text-right ${getResponsiveClass()}`}>Paid Amount</TableHead>
                <TableHead className={`text-right ${getResponsiveClass()}`}>Unpaid Amount</TableHead>
                <TableHead className={`text-center ${getResponsiveClass()}`}>Status</TableHead>
                {showCalendar && <TableHead className={`text-center ${getResponsiveClass()}`}>Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {calculations.map((calculation) => (
                <TableRow key={calculation.intern.user_id}>
                  <TableCell className={`font-medium ${getResponsiveClass()}`}>{calculation.intern.full_name}</TableCell>
                  <TableCell className={getResponsiveClass()}>{calculation.intern.email}</TableCell>
                  <TableCell className={`text-center ${getResponsiveClass()}`}>{calculation.daysAttended}</TableCell>
                  <TableCell className={`text-center ${getResponsiveClass()}`}>
                    <div className={`${isMobile ? 'max-w-24' : 'max-w-48'}`}>
                      {calculation.attendedDates.length > 0 ? (
                        <div className={`flex flex-wrap gap-1 justify-center ${isMobile ? 'gap-0.5' : 'gap-1'}`}>
                          {calculation.attendedDates.map((date, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {date}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className={`text-muted-foreground ${getResponsiveClass()}`}>No attendance</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className={`text-center ${getResponsiveClass()}`}>{calculation.totalHours.toFixed(1)}</TableCell>
                  <TableCell className={`text-right font-semibold ${getResponsiveClass()}`}>₱{calculation.allowance.toLocaleString()}</TableCell>
                  <TableCell className={`text-right font-semibold text-green-600 ${getResponsiveClass()}`}>₱{calculation.totalPaid.toLocaleString()}</TableCell>
                  <TableCell className={`text-right font-semibold text-red-600 ${getResponsiveClass()}`}>₱{calculation.totalUnpaid.toLocaleString()}</TableCell>
                  <TableCell className={`text-center ${getResponsiveClass()}`}>{getPaymentStatusBadge(calculation.totalPaid, calculation.allowance)}</TableCell>
                  {showCalendar && (
                    <TableCell className={`text-center ${getResponsiveClass()}`}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="sm"
                            onClick={() => onCalendarView(calculation.intern.user_id)}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            <CalendarDays className="h-3 w-3 md:h-4 lg:h-5 mr-1" />
                            <span className={getResponsiveClass()}>View Calendar</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className={getResponsiveClass()}>View calendar to mark individual days as paid</p>
                        </TooltipContent>
                      </Tooltip>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
