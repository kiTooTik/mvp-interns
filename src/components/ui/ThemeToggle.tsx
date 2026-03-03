import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface ThemeToggleProps {
    className?: string;
    variant?: 'icon' | 'ghost';
}

export function ThemeToggle({ className, variant = 'ghost' }: ThemeToggleProps) {
    const { resolvedTheme, setTheme, theme } = useTheme();

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                        'relative transition-all duration-300',
                        className
                    )}
                    aria-label="Toggle theme"
                >
                    <Sun
                        className={cn(
                            'h-4 w-4 transition-all duration-300',
                            resolvedTheme === 'dark'
                                ? 'rotate-90 scale-0 opacity-0 absolute'
                                : 'rotate-0 scale-100 opacity-100'
                        )}
                    />
                    <Moon
                        className={cn(
                            'h-4 w-4 transition-all duration-300',
                            resolvedTheme === 'dark'
                                ? 'rotate-0 scale-100 opacity-100'
                                : '-rotate-90 scale-0 opacity-0 absolute'
                        )}
                    />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36">
                <DropdownMenuItem
                    onClick={() => setTheme('light')}
                    className={cn('gap-2 cursor-pointer', theme === 'light' && 'bg-accent')}
                >
                    <Sun className="h-4 w-4" />
                    Light
                </DropdownMenuItem>
                <DropdownMenuItem
                    onClick={() => setTheme('dark')}
                    className={cn('gap-2 cursor-pointer', theme === 'dark' && 'bg-accent')}
                >
                    <Moon className="h-4 w-4" />
                    Dark
                </DropdownMenuItem>
                <DropdownMenuItem
                    onClick={() => setTheme('system')}
                    className={cn('gap-2 cursor-pointer', theme === 'system' && 'bg-accent')}
                >
                    <Monitor className="h-4 w-4" />
                    System
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
