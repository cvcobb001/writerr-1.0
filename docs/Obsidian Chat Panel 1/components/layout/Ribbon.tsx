import { useState } from 'react';
import { Button } from '../ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { 
  Home, 
  Files, 
  Search, 
  Network, 
  Command, 
  Settings, 
  User, 
  ChevronRight,
  ChevronLeft 
} from 'lucide-react';

interface RibbonProps {
  activeItem?: string;
  onItemClick?: (item: string) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

const ribbonItems = [
  { id: 'home', icon: Home, label: 'Home' },
  { id: 'files', icon: Files, label: 'Files' },
  { id: 'search', icon: Search, label: 'Search' },
  { id: 'graph', icon: Network, label: 'Graph view' },
  { id: 'quick-switcher', icon: Command, label: 'Quick switcher' },
  { id: 'settings', icon: Settings, label: 'Settings' },
];

export function Ribbon({ 
  activeItem = 'home', 
  onItemClick, 
  isCollapsed = true,
  onToggleCollapse 
}: RibbonProps) {
  const handleItemClick = (itemId: string) => {
    onItemClick?.(itemId);
  };

  return (
    <TooltipProvider>
      <aside 
        className={`
          ${isCollapsed ? 'w-14' : 'w-60'} 
          bg-sidebar border-r border-sidebar-border 
          flex flex-col transition-all duration-200
        `}
      >
        {/* Toggle Button */}
        <div className="p-2 border-b border-sidebar-border">
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleCollapse}
            className="size-10 text-sidebar-foreground hover:bg-sidebar-accent"
          >
            {isCollapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
          </Button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 p-2 space-y-1">
          {ribbonItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeItem === item.id;
            
            return (
              <Tooltip key={item.id} delayDuration={0}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size={isCollapsed ? "icon" : "default"}
                    onClick={() => handleItemClick(item.id)}
                    className={`
                      ${isCollapsed ? 'size-10' : 'w-full justify-start h-10 px-3'}
                      ${isActive 
                        ? 'bg-sidebar-primary text-sidebar-primary-foreground' 
                        : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                      }
                    `}
                  >
                    <Icon className="size-5" />
                    {!isCollapsed && <span className="ml-3">{item.label}</span>}
                  </Button>
                </TooltipTrigger>
                {isCollapsed && (
                  <TooltipContent side="right">
                    <p>{item.label}</p>
                  </TooltipContent>
                )}
              </Tooltip>
            );
          })}
        </nav>

        {/* User Profile */}
        <div className="p-2 border-t border-sidebar-border">
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size={isCollapsed ? "icon" : "default"}
                className={`
                  ${isCollapsed ? 'size-10' : 'w-full justify-start h-10 px-3'}
                  text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground
                `}
              >
                <User className="size-5" />
                {!isCollapsed && <span className="ml-3">Profile</span>}
              </Button>
            </TooltipTrigger>
            {isCollapsed && (
              <TooltipContent side="right">
                <p>User profile</p>
              </TooltipContent>
            )}
          </Tooltip>
        </div>
      </aside>
    </TooltipProvider>
  );
}