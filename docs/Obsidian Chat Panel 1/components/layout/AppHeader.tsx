import { Button } from '../ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { Bell, Sun, Moon, User, Minimize2, Maximize2, X } from 'lucide-react';

interface AppHeaderProps {
  workspaceName?: string;
  onThemeToggle?: () => void;
  isDark?: boolean;
}

export function AppHeader({ workspaceName = "My Workspace", onThemeToggle, isDark }: AppHeaderProps) {
  return (
    <TooltipProvider>
      <header className="h-16 bg-background border-b border-border flex items-center justify-between px-4">
        {/* Left: Logo and Workspace */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="size-6 bg-primary rounded text-primary-foreground flex items-center justify-center text-sm font-medium">
              O
            </div>
            <span className="font-medium text-lg">Obsidian</span>
          </div>
          
          <div className="h-4 w-px bg-border" />
          
          <span className="text-muted-foreground">{workspaceName}</span>
        </div>

        {/* Right: Controls */}
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8">
                <Bell className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Notifications</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="size-8"
                onClick={onThemeToggle}
              >
                {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Toggle theme</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8">
                <User className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Profile</p>
            </TooltipContent>
          </Tooltip>

          <div className="h-4 w-px bg-border mx-2" />

          {/* Window Controls */}
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="size-6">
              <Minimize2 className="size-3" />
            </Button>
            <Button variant="ghost" size="icon" className="size-6">
              <Maximize2 className="size-3" />
            </Button>
            <Button variant="ghost" size="icon" className="size-6 hover:bg-destructive/20 hover:text-destructive">
              <X className="size-3" />
            </Button>
          </div>
        </div>
      </header>
    </TooltipProvider>
  );
}