import React, { useMemo, useState } from 'react';
import { clsx } from 'clsx';
import * as ScrollArea from '@radix-ui/react-scroll-area';
import { TimelineEntry, Change } from '../types';
import { statusColors, colors } from '../ui/colors';
import { animations, transitionClasses } from '../animations/transitions';

interface TimelineProps {
  entries: TimelineEntry[];
  changes: Change[];
  onEntryClick?: (entry: TimelineEntry) => void;
  onChangeSelect?: (changeId: string) => void;
  selectedChangeId?: string;
  compact?: boolean;
  showUserInfo?: boolean;
  maxHeight?: number;
  className?: string;
}

export const Timeline: React.FC<TimelineProps> = ({
  entries,
  changes,
  onEntryClick,
  onChangeSelect,
  selectedChangeId,
  compact = false,
  showUserInfo = true,
  maxHeight = 400,
  className
}) => {
  const [hoveredEntry, setHoveredEntry] = useState<string | null>(null);

  // Sort entries by timestamp (newest first)
  const sortedEntries = useMemo(() => {
    return [...entries].sort((a, b) => b.timestamp - a.timestamp);
  }, [entries]);

  // Group entries by time periods
  const groupedEntries = useMemo(() => {
    const groups: { [key: string]: TimelineEntry[] } = {};
    const now = Date.now();

    sortedEntries.forEach(entry => {
      const diff = now - entry.timestamp;
      let groupKey: string;

      if (diff < 60000) { // Less than 1 minute
        groupKey = 'Just now';
      } else if (diff < 3600000) { // Less than 1 hour
        groupKey = `${Math.floor(diff / 60000)} minutes ago`;
      } else if (diff < 86400000) { // Less than 1 day
        groupKey = `${Math.floor(diff / 3600000)} hours ago`;
      } else if (diff < 604800000) { // Less than 1 week
        groupKey = `${Math.floor(diff / 86400000)} days ago`;
      } else {
        groupKey = new Date(entry.timestamp).toLocaleDateString();
      }

      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(entry);
    });

    return groups;
  }, [sortedEntries]);

  const getChangeDetails = (changeId: string): Change | undefined => {
    return changes.find(change => change.id === changeId);
  };

  const getActionIcon = (action: TimelineEntry['action']) => {
    const iconClass = compact ? 'w-3 h-3' : 'w-4 h-4';
    
    switch (action) {
      case 'added':
        return (
          <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        );
      case 'accepted':
        return (
          <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="20,6 9,17 4,12" />
          </svg>
        );
      case 'rejected':
        return (
          <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        );
      case 'modified':
        return (
          <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="m18.5 2.5 a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4Z" />
          </svg>
        );
      default:
        return (
          <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
          </svg>
        );
    }
  };

  const getActionColor = (action: TimelineEntry['action']) => {
    switch (action) {
      case 'added': return colors.blue[500];
      case 'accepted': return statusColors.accepted;
      case 'rejected': return statusColors.rejected;
      case 'modified': return colors.purple[500];
      default: return colors.gray[500];
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const handleEntryClick = (entry: TimelineEntry) => {
    onEntryClick?.(entry);
    onChangeSelect?.(entry.changeId);
  };

  const TimelineEntryComponent: React.FC<{ entry: TimelineEntry; isLast: boolean }> = ({ 
    entry, 
    isLast 
  }) => {
    const change = getChangeDetails(entry.changeId);
    const isSelected = selectedChangeId === entry.changeId;
    const isHovered = hoveredEntry === `${entry.timestamp}-${entry.changeId}`;
    const actionColor = getActionColor(entry.action);

    return (
      <div
        className={clsx(
          'timeline-entry',
          'relative',
          'flex items-start',
          transitionClasses.smooth,
          {
            'pb-4': !isLast,
            'pb-2': isLast,
            'cursor-pointer': onEntryClick || onChangeSelect,
            'bg-blue-50 rounded-lg p-2 -m-2': isSelected
          }
        )}
        onClick={() => handleEntryClick(entry)}
        onMouseEnter={() => setHoveredEntry(`${entry.timestamp}-${entry.changeId}`)}
        onMouseLeave={() => setHoveredEntry(null)}
      >
        {/* Timeline line */}
        {!isLast && (
          <div 
            className="absolute left-3 top-8 w-0.5 bg-gray-200"
            style={{ height: 'calc(100% - 2rem)' }}
          />
        )}

        {/* Action icon */}
        <div
          className={clsx(
            'flex items-center justify-center rounded-full border-2 border-white shadow-sm z-10',
            {
              'w-6 h-6': compact,
              'w-8 h-8': !compact,
              'transform scale-110': isHovered
            }
          )}
          style={{ 
            backgroundColor: actionColor,
            color: colors.white 
          }}
        >
          {getActionIcon(entry.action)}
        </div>

        {/* Entry content */}
        <div className={clsx('flex-1', compact ? 'ml-2' : 'ml-3')}>
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              {/* Action description */}
              <p className={clsx('text-gray-900 font-medium', compact ? 'text-sm' : 'text-base')}>
                {entry.action.charAt(0).toUpperCase() + entry.action.slice(1)} change
                {change && (
                  <span className="text-gray-600 font-normal">
                    {' '}• {change.category}
                  </span>
                )}
              </p>

              {/* Change preview */}
              {change && (
                <p className={clsx('text-gray-600 mt-1 truncate', compact ? 'text-xs' : 'text-sm')}>
                  "{change.content.before}" → "{change.content.after}"
                </p>
              )}

              {/* User info */}
              {showUserInfo && entry.user && (
                <p className={clsx('text-gray-500 mt-1', compact ? 'text-xs' : 'text-sm')}>
                  by {entry.user}
                </p>
              )}
            </div>

            {/* Timestamp */}
            <time 
              className={clsx('text-gray-400 flex-shrink-0', compact ? 'text-xs' : 'text-sm')}
              dateTime={new Date(entry.timestamp).toISOString()}
            >
              {formatTime(entry.timestamp)}
            </time>
          </div>

          {/* Confidence and source info */}
          {change && !compact && (
            <div className="flex items-center gap-2 mt-2">
              <span 
                className="inline-flex items-center px-2 py-1 rounded-full text-xs"
                style={{ 
                  backgroundColor: `${actionColor}20`,
                  color: actionColor 
                }}
              >
                {change.source}
              </span>
              <span className="text-xs text-gray-500">
                {Math.round(change.confidence * 100)}% confidence
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (entries.length === 0) {
    return (
      <div className={clsx('timeline-empty', 'flex flex-col items-center justify-center py-8 text-center', className)}>
        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
          <svg className="w-6 h-6 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 1v6m0 6v6" />
          </svg>
        </div>
        <p className="text-gray-500">No timeline entries yet</p>
        <p className="text-gray-400 text-sm mt-1">Changes will appear here as you work</p>
      </div>
    );
  }

  return (
    <div className={clsx('timeline', className)}>
      <ScrollArea.Root 
        className="w-full rounded overflow-hidden"
        style={{ height: maxHeight }}
      >
        <ScrollArea.Viewport className="w-full h-full p-4">
          {Object.entries(groupedEntries).map(([groupKey, groupEntries], groupIndex) => (
            <div key={groupKey} className={clsx('timeline-group', { 'mt-6': groupIndex > 0 })}>
              {/* Time group header */}
              <h3 className={clsx(
                'timeline-group-header',
                'text-gray-500 font-medium mb-4 sticky top-0 bg-white z-10',
                compact ? 'text-sm' : 'text-base'
              )}>
                {groupKey}
              </h3>

              {/* Group entries */}
              <div className="timeline-group-entries space-y-0">
                {groupEntries.map((entry, entryIndex) => (
                  <TimelineEntryComponent
                    key={`${entry.timestamp}-${entry.changeId}`}
                    entry={entry}
                    isLast={entryIndex === groupEntries.length - 1 && groupIndex === Object.keys(groupedEntries).length - 1}
                  />
                ))}
              </div>
            </div>
          ))}
        </ScrollArea.Viewport>
        <ScrollArea.Scrollbar 
          className="flex select-none touch-none p-0.5 bg-gray-100 transition-colors duration-150 ease-out hover:bg-gray-200"
          orientation="vertical"
        >
          <ScrollArea.Thumb className="flex-1 bg-gray-300 rounded-full relative before:content-[''] before:absolute before:top-1/2 before:left-1/2 before:-translate-x-1/2 before:-translate-y-1/2 before:w-full before:h-full before:min-w-[44px] before:min-h-[44px]" />
        </ScrollArea.Scrollbar>
      </ScrollArea.Root>
    </div>
  );
};

export default Timeline;