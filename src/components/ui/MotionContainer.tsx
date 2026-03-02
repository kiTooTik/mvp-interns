import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface MotionContainerProps {
  children: ReactNode;
  animation?: 'fade-in' | 'slide-in-right' | 'slide-in-left' | 'scale-in' | 'bounce-in';
  className?: string;
  delay?: number;
  duration?: number;
}

export function MotionContainer({ 
  children, 
  animation = 'fade-in',
  className,
  delay = 0,
  duration = 300
}: MotionContainerProps) {
  const animationClasses = {
    'fade-in': 'animate-fade-in',
    'slide-in-right': 'animate-slide-in-right',
    'slide-in-left': 'animate-slide-in-left',
    'scale-in': 'animate-scale-in',
    'bounce-in': 'animate-bounce-in',
  };

  const delayStyle = delay > 0 ? { animationDelay: `${delay}ms` } : {};
  const durationStyle = duration !== 300 ? { animationDuration: `${duration}ms` } : {};

  return (
    <div 
      className={cn(animationClasses[animation], className)}
      style={{ ...delayStyle, ...durationStyle }}
    >
      {children}
    </div>
  );
}

// Preset motion containers for common use cases
export function PageContainer({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <MotionContainer 
      animation="fade-in" 
      className={cn('min-h-screen flex items-center justify-center bg-secondary/30 p-4', className)}
    >
      {children}
    </MotionContainer>
  );
}

export function CardContainer({ children, className, delay = 0 }: { 
  children: ReactNode; 
  className?: string; 
  delay?: number;
}) {
  return (
    <MotionContainer 
      animation="slide-in-right" 
      delay={delay}
      className={cn('border-border shadow-lg', className)}
    >
      {children}
    </MotionContainer>
  );
}

export function StatsGrid({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <MotionContainer 
      animation="slide-in-right" 
      className={cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4', className)}
    >
      {children}
    </MotionContainer>
  );
}
