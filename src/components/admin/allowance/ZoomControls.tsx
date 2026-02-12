import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

interface ZoomControlsProps {
  zoomLevel: 'sm' | 'md' | 'lg';
  onZoomChange: (level: 'sm' | 'md' | 'lg') => void;
}

export default function ZoomControls({ zoomLevel, onZoomChange }: ZoomControlsProps) {
  return (
    <div className="flex items-center gap-2">
      <Label className="text-xs md:text-sm lg:text-base font-medium">Zoom:</Label>
      <div className="flex gap-1">
        <Button
          variant={zoomLevel === 'sm' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onZoomChange('sm')}
          className={`px-2 py-1 ${zoomLevel === 'sm' ? 'text-xs' : 'text-xs md:text-sm'}`}
        >
          A-
        </Button>
        <Button
          variant={zoomLevel === 'md' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onZoomChange('md')}
          className={`px-3 py-1 ${zoomLevel === 'md' ? 'text-sm' : 'text-xs md:text-sm'}`}
        >
          A
        </Button>
        <Button
          variant={zoomLevel === 'lg' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onZoomChange('lg')}
          className={`px-2 py-1 ${zoomLevel === 'lg' ? 'text-base' : 'text-xs md:text-sm'}`}
        >
          A+
        </Button>
      </div>
    </div>
  );
}
