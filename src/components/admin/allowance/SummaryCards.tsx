import { Card, CardContent } from '@/components/ui/card';
import { Users, DollarSign, Calculator } from 'lucide-react';

interface SummaryCardsProps {
  totalInterns: number;
  totalAllowance: number;
  zoomLevel?: 'sm' | 'md' | 'lg';
  isMobile?: boolean;
}

export default function SummaryCards({ 
  totalInterns, 
  totalAllowance, 
  zoomLevel = 'md',
  isMobile = false
}: SummaryCardsProps) {
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
      <Card className="border-border bg-gradient-to-br from-blue-50 to-blue-100">
        <CardContent className="p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-xs md:text-sm lg:text-base text-blue-600 font-medium`}>Total Interns</p>
              <p className={`text-lg md:text-xl lg:text-2xl font-bold text-blue-900`}>{totalInterns}</p>
            </div>
            <div className="p-2 md:p-3 bg-blue-200 rounded-full">
              <Users className="h-4 w-4 md:h-5 lg:h-6 text-blue-700" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-gradient-to-br from-green-50 to-green-100">
        <CardContent className="p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-xs md:text-sm lg:text-base text-green-600 font-medium`}>Total Allowance</p>
              <p className={`text-lg md:text-xl lg:text-2xl font-bold text-green-900`}>₱{totalAllowance.toLocaleString()}</p>
            </div>
            <div className="p-2 md:p-3 bg-green-200 rounded-full">
              <DollarSign className="h-4 w-4 md:h-5 lg:h-6 text-green-700" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-gradient-to-br from-purple-50 to-purple-100">
        <CardContent className="p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-xs md:text-sm lg:text-base text-purple-600 font-medium`}>Avg per Intern</p>
              <p className={`text-lg md:text-xl lg:text-2xl font-bold text-purple-900`}>
                ₱{Math.round(totalAllowance / totalInterns).toLocaleString()}
              </p>
            </div>
            <div className="p-2 md:p-3 bg-purple-200 rounded-full">
              <Calculator className="h-4 w-4 md:h-5 lg:h-6 text-purple-700" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
