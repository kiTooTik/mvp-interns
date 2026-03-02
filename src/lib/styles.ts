import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Common style combinations for consistency
export const styles = {
  // Page containers with animation classes
  pageContainer: "min-h-screen flex items-center justify-center bg-secondary/30 p-4",
  animatedPageContainer: "min-h-screen flex items-center justify-center bg-secondary/30 p-4 animate-fade-in",
  
  // Card styles
  card: "border-border shadow-lg",
  interactiveCard: "border-border shadow-lg hover:shadow-xl transition-shadow duration-200",
  
  // Button variants
  primaryButton: "bg-primary text-primary-foreground hover:bg-primary/90",
  secondaryButton: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
  destructiveButton: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
  
  // Form styles
  formContainer: "space-y-4",
  inputWithIcon: "pl-10",
  
  // Animation classes
  fadeIn: "animate-fade-in",
  slideInRight: "animate-slide-in-right",
  slideInLeft: "animate-slide-in-left",
  
  // Grid layouts
  statsGrid: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4",
  twoColumnGrid: "grid grid-cols-1 lg:grid-cols-2 gap-6",
  
  // Status colors
  successText: "text-success",
  successBg: "bg-success/10",
  warningText: "text-warning", 
  warningBg: "bg-warning/10",
  errorText: "text-destructive",
  errorBg: "bg-destructive/10",
  primaryText: "text-primary",
  primaryBg: "bg-primary/10",
  
  // Loading states
  loadingSkeleton: "animate-pulse bg-muted",
  spinner: "animate-spin",
}

// Conditional style helpers
export const conditionalStyles = {
  // Based on status
  getStatusColor: (status: 'success' | 'warning' | 'error' | 'primary') => {
    switch (status) {
      case 'success': return { text: styles.successText, bg: styles.successBg }
      case 'warning': return { text: styles.warningText, bg: styles.warningBg }
      case 'error': return { text: styles.errorText, bg: styles.errorBg }
      case 'primary': return { text: styles.primaryText, bg: styles.primaryBg }
      default: return { text: styles.primaryText, bg: styles.primaryBg }
    }
  },
  
  // Based on loading state
  getLoadingStyles: (isLoading: boolean) => ({
    opacity: isLoading ? 'opacity-50' : 'opacity-100',
    pointerEvents: isLoading ? 'pointer-events-none' : 'pointer-events-auto'
  }),
  
  // Responsive text sizes
  getResponsiveText: (baseSize: 'sm' | 'base' | 'lg' | 'xl') => {
    switch (baseSize) {
      case 'sm': return 'text-sm sm:text-base'
      case 'base': return 'text-base sm:text-lg'
      case 'lg': return 'text-lg sm:text-xl'
      case 'xl': return 'text-xl sm:text-2xl'
      default: return 'text-base'
    }
  }
}
