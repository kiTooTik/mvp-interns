import { Calculator } from 'lucide-react';

interface HeaderProps {
  zoomLevel?: 'sm' | 'md' | 'lg';
  onZoomChange?: (level: 'sm' | 'md' | 'lg') => void;
}

export default function Header({ zoomLevel = 'md', onZoomChange }: HeaderProps) {
  return (
    <div className="sticky top-0 z-50 bg-background border-b p-4 md:p-6 lg:p-8">
      <div className="container mx-auto px-4 py-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          {/* Title Section */}
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Calculator className="h-4 w-4 md:h-5 lg:h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-lg md:text-xl lg:text-2xl font-semibold text-foreground">Allowance Calculator</h1>
              <p className="text-xs md:text-sm lg:text-base text-muted-foreground">Calculate and manage intern allowances based on attendance</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
