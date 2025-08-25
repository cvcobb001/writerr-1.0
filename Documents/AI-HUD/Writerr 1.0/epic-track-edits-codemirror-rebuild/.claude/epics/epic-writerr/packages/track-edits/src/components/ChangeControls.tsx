import React, { useCallback, useEffect, useState } from 'react';
import { clsx } from 'clsx';
import * as Tooltip from '@radix-ui/react-tooltip';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Change, KeyboardShortcut } from '../types';
import { statusColors, colors } from '../ui/colors';

interface ChangeControlsProps {
  change: Change;
  onAccept: (changeId: string) => void;
  onReject: (changeId: string) => void;
  onCluster?: (changeId: string) => void;
  shortcuts?: KeyboardShortcut[];
  showTooltips?: boolean;
  compact?: boolean;
  disabled?: boolean;
  className?: string;
}

export const ChangeControls: React.FC<ChangeControlsProps> = ({
  change,
  onAccept,
  onReject,
  onCluster,
  shortcuts = [],
  showTooltips = true,
  compact = false,
  disabled = false,
  className
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [hoveredButton, setHoveredButton] = useState<string | null>(null);

  // Get keyboard shortcuts for each action
  const acceptShortcut = shortcuts.find(s => s.action === 'accept-change');
  const rejectShortcut = shortcuts.find(s => s.action === 'reject-change');
  const clusterShortcut = shortcuts.find(s => s.action === 'cluster-changes');

  const formatShortcut = (shortcut?: KeyboardShortcut): string => {
    if (!shortcut) return '';
    const modifiers = shortcut.modifiers || [];
    const parts = [...modifiers.map(m => m.charAt(0).toUpperCase() + m.slice(1)), shortcut.key];
    return parts.join('+');
  };

  const handleAccept = useCallback(() => {
    if (disabled) return;
    onAccept(change.id);
  }, [change.id, onAccept, disabled]);

  const handleReject = useCallback(() => {
    if (disabled) return;
    onReject(change.id);
  }, [change.id, onReject, disabled]);

  const handleCluster = useCallback(() => {
    if (disabled || !onCluster) return;
    onCluster(change.id);
  }, [change.id, onCluster, disabled]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (disabled) return;

      const isModifierPressed = (modifiers: string[]) => {
        return modifiers.every(mod => {
          switch (mod) {
            case 'ctrl': return e.ctrlKey;
            case 'alt': return e.altKey;
            case 'shift': return e.shiftKey;
            case 'meta': return e.metaKey;
            default: return false;
          }
        });
      };

      if (acceptShortcut && 
          e.key.toLowerCase() === acceptShortcut.key.toLowerCase() && 
          isModifierPressed(acceptShortcut.modifiers || [])) {
        e.preventDefault();
        handleAccept();
      } else if (rejectShortcut && 
                 e.key.toLowerCase() === rejectShortcut.key.toLowerCase() && 
                 isModifierPressed(rejectShortcut.modifiers || [])) {
        e.preventDefault();
        handleReject();
      } else if (clusterShortcut && 
                 e.key.toLowerCase() === clusterShortcut.key.toLowerCase() && 
                 isModifierPressed(clusterShortcut.modifiers || [])) {
        e.preventDefault();
        handleCluster();
      }
    };

    if (isVisible) {
      document.addEventListener('keydown', handleKeyPress);
      return () => document.removeEventListener('keydown', handleKeyPress);
    }
  }, [isVisible, disabled, acceptShortcut, rejectShortcut, clusterShortcut, handleAccept, handleReject, handleCluster]);

  const buttonClass = clsx(
    'inline-flex items-center justify-center',
    'transition-all duration-200 ease-in-out',
    'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    {
      'w-6 h-6 text-xs': compact,
      'w-8 h-8 text-sm': !compact,
      'rounded-md': !compact,
      'rounded-sm': compact
    }
  );

  const Button: React.FC<{
    onClick: () => void;
    color: string;
    hoverColor: string;
    icon: React.ReactNode;
    tooltip: string;
    shortcut?: string;
    buttonKey: string;
  }> = ({ onClick, color, hoverColor, icon, tooltip, shortcut, buttonKey }) => {
    const button = (
      <button
        className={clsx(buttonClass, 'border')}
        style={{
          backgroundColor: hoveredButton === buttonKey ? hoverColor : 'transparent',
          borderColor: color,
          color: hoveredButton === buttonKey ? colors.white : color
        }}
        onClick={onClick}
        onMouseEnter={() => setHoveredButton(buttonKey)}
        onMouseLeave={() => setHoveredButton(null)}
        disabled={disabled}
        aria-label={tooltip}
      >
        {icon}
      </button>
    );

    if (!showTooltips) return button;

    return (
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          {button}
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content 
            className="bg-gray-900 text-white px-2 py-1 rounded text-xs"
            sideOffset={5}
          >
            {tooltip}
            {shortcut && <span className="ml-1 opacity-75">({shortcut})</span>}
            <Tooltip.Arrow className="fill-gray-900" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    );
  };

  return (
    <Tooltip.Provider>
      <div
        className={clsx(
          'change-controls',
          'inline-flex items-center gap-1',
          'transition-opacity duration-200',
          {
            'opacity-0 group-hover:opacity-100': !isVisible,
            'opacity-100': isVisible
          },
          className
        )}
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        role="group"
        aria-label="Change controls"
      >
        {/* Accept button */}
        <Button
          onClick={handleAccept}
          color={statusColors.accepted}
          hoverColor={statusColors.accepted}
          icon={
            <svg 
              width={compact ? 12 : 16} 
              height={compact ? 12 : 16} 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2"
            >
              <polyline points="20,6 9,17 4,12" />
            </svg>
          }
          tooltip="Accept change"
          shortcut={formatShortcut(acceptShortcut)}
          buttonKey="accept"
        />

        {/* Reject button */}
        <Button
          onClick={handleReject}
          color={statusColors.rejected}
          hoverColor={statusColors.rejected}
          icon={
            <svg 
              width={compact ? 12 : 16} 
              height={compact ? 12 : 16} 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          }
          tooltip="Reject change"
          shortcut={formatShortcut(rejectShortcut)}
          buttonKey="reject"
        />

        {/* More options dropdown */}
        {onCluster && (
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button
                className={clsx(buttonClass, 'border border-gray-300')}
                style={{
                  backgroundColor: hoveredButton === 'more' ? colors.gray[100] : 'transparent',
                  color: colors.gray[600]
                }}
                onMouseEnter={() => setHoveredButton('more')}
                onMouseLeave={() => setHoveredButton(null)}
                disabled={disabled}
                aria-label="More options"
              >
                <svg 
                  width={compact ? 12 : 16} 
                  height={compact ? 12 : 16} 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="1" />
                  <circle cx="12" cy="5" r="1" />
                  <circle cx="12" cy="19" r="1" />
                </svg>
              </button>
            </DropdownMenu.Trigger>
            
            <DropdownMenu.Portal>
              <DropdownMenu.Content 
                className="bg-white border border-gray-200 rounded-md shadow-lg p-1 min-w-[150px]"
                sideOffset={5}
              >
                <DropdownMenu.Item
                  className="flex items-center px-2 py-1 text-sm cursor-pointer rounded hover:bg-gray-100"
                  onClick={handleCluster}
                >
                  <svg 
                    width="14" 
                    height="14" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    className="mr-2"
                  >
                    <rect x="3" y="3" width="7" height="7" />
                    <rect x="14" y="3" width="7" height="7" />
                    <rect x="14" y="14" width="7" height="7" />
                    <rect x="3" y="14" width="7" height="7" />
                  </svg>
                  Cluster
                  {clusterShortcut && (
                    <span className="ml-auto text-xs text-gray-400">
                      {formatShortcut(clusterShortcut)}
                    </span>
                  )}
                </DropdownMenu.Item>
                
                <DropdownMenu.Separator className="h-px bg-gray-200 my-1" />
                
                <DropdownMenu.Item
                  className="flex items-center px-2 py-1 text-sm cursor-pointer rounded hover:bg-gray-100"
                  onClick={() => console.log('View details for change:', change.id)}
                >
                  <svg 
                    width="14" 
                    height="14" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    className="mr-2"
                  >
                    <circle cx="12" cy="12" r="3" />
                    <path d="M12 1v6m0 6v6" />
                  </svg>
                  View Details
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        )}
      </div>
    </Tooltip.Provider>
  );
};

export default ChangeControls;