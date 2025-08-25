import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { clsx } from 'clsx';
import * as Separator from '@radix-ui/react-separator';
import * as Toggle from '@radix-ui/react-toggle';
import * as Tooltip from '@radix-ui/react-tooltip';
import { 
  Change, 
  ChangeCluster, 
  TimelineEntry, 
  RevisionHeatmapData, 
  DiffViewConfig, 
  FilterOptions, 
  BulkOperation,
  ChangeStatus,
  KeyboardShortcut 
} from '../types';
import { InlineDiff } from './InlineDiff';
import { ChangeControls } from './ChangeControls';
import { Timeline } from './Timeline';
import { RevisionHeatmap } from './RevisionHeatmap';
import { BulkOperations } from './BulkOperations';
import { colors } from '../ui/colors';
import { transitionClasses } from '../animations/transitions';
import { mockKeyboardShortcuts } from '../mock-data';

interface TrackEditsViewProps {
  changes: Change[];
  clusters?: ChangeCluster[];
  timeline?: TimelineEntry[];
  heatmapData?: RevisionHeatmapData;
  onChangeAccept: (changeId: string) => void;
  onChangeReject: (changeId: string) => void;
  onChangeSelect?: (changeId: string) => void;
  onBulkOperation: (operation: BulkOperation) => Promise<void>;
  onClusterChange?: (changeId: string) => void;
  selectedChangeId?: string;
  config?: Partial<DiffViewConfig>;
  shortcuts?: KeyboardShortcut[];
  className?: string;
}

export const TrackEditsView: React.FC<TrackEditsViewProps> = ({
  changes = [],
  clusters = [],
  timeline = [],
  heatmapData,
  onChangeAccept,
  onChangeReject,
  onChangeSelect,
  onBulkOperation,
  onClusterChange,
  selectedChangeId,
  config = {},
  shortcuts = mockKeyboardShortcuts,
  className
}) => {
  // Local state
  const [viewConfig, setViewConfig] = useState<DiffViewConfig>({
    showLineNumbers: true,
    highlightSyntax: false,
    showInlineChanges: true,
    colorBySource: true,
    colorByConfidence: false,
    compactMode: false,
    showMetadata: true,
    ...config
  });
  
  const [selectedChangeIds, setSelectedChangeIds] = useState<string[]>([]);
  const [filters, setFilters] = useState<FilterOptions>({});
  const [activeView, setActiveView] = useState<'changes' | 'timeline' | 'heatmap'>('changes');
  const [isResponsiveMode, setIsResponsiveMode] = useState(false);

  // Check for responsive mode based on screen size
  useEffect(() => {
    const checkResponsive = () => {
      setIsResponsiveMode(window.innerWidth < 768);
    };
    
    checkResponsive();
    window.addEventListener('resize', checkResponsive);
    return () => window.removeEventListener('resize', checkResponsive);
  }, []);

  // Filter changes based on current filters
  const filteredChanges = useMemo(() => {
    return changes.filter(change => {
      if (filters.sources && !filters.sources.includes(change.source)) return false;
      if (filters.categories && !filters.categories.includes(change.category)) return false;
      if (filters.statuses && !filters.statuses.includes(change.status)) return false;
      if (filters.confidenceRange) {
        const [min, max] = filters.confidenceRange;
        if (change.confidence < min || change.confidence > max) return false;
      }
      if (filters.timeRange) {
        const [start, end] = filters.timeRange;
        if (change.timestamp < start || change.timestamp > end) return false;
      }
      if (filters.searchText && filters.searchText.trim()) {
        const search = filters.searchText.toLowerCase();
        const searchableText = [
          change.content.before,
          change.content.after,
          change.metadata?.reason || '',
          change.metadata?.suggestion || ''
        ].join(' ').toLowerCase();
        if (!searchableText.includes(search)) return false;
      }
      return true;
    });
  }, [changes, filters]);

  // Group changes by status for better organization
  const groupedChanges = useMemo(() => {
    const groups = {
      pending: filteredChanges.filter(c => c.status === ChangeStatus.PENDING),
      accepted: filteredChanges.filter(c => c.status === ChangeStatus.ACCEPTED),
      rejected: filteredChanges.filter(c => c.status === ChangeStatus.REJECTED),
      conflicted: filteredChanges.filter(c => c.status === ChangeStatus.CONFLICTED)
    };
    return groups;
  }, [filteredChanges]);

  // Statistics for the current view
  const stats = useMemo(() => ({
    total: filteredChanges.length,
    pending: groupedChanges.pending.length,
    accepted: groupedChanges.accepted.length,
    rejected: groupedChanges.rejected.length,
    conflicted: groupedChanges.conflicted.length,
    avgConfidence: filteredChanges.length > 0 
      ? filteredChanges.reduce((sum, c) => sum + c.confidence, 0) / filteredChanges.length
      : 0
  }), [filteredChanges, groupedChanges]);

  // Handlers
  const handleConfigChange = useCallback((key: keyof DiffViewConfig, value: boolean) => {
    setViewConfig(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleBulkSelectionToggle = useCallback((changeId: string) => {
    setSelectedChangeIds(prev => 
      prev.includes(changeId) 
        ? prev.filter(id => id !== changeId)
        : [...prev, changeId]
    );
  }, []);

  const handleKeyboardNavigation = useCallback((e: KeyboardEvent) => {
    if (!selectedChangeId || e.target !== document.body) return;

    const currentIndex = filteredChanges.findIndex(c => c.id === selectedChangeId);
    let newIndex = currentIndex;

    switch (e.key) {
      case 'ArrowDown':
      case 'j':
        e.preventDefault();
        newIndex = Math.min(currentIndex + 1, filteredChanges.length - 1);
        break;
      case 'ArrowUp':
      case 'k':
        e.preventDefault();
        newIndex = Math.max(currentIndex - 1, 0);
        break;
      case 'Home':
        e.preventDefault();
        newIndex = 0;
        break;
      case 'End':
        e.preventDefault();
        newIndex = filteredChanges.length - 1;
        break;
    }

    if (newIndex !== currentIndex && filteredChanges[newIndex]) {
      onChangeSelect?.(filteredChanges[newIndex].id);
    }
  }, [selectedChangeId, filteredChanges, onChangeSelect]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyboardNavigation);
    return () => document.removeEventListener('keydown', handleKeyboardNavigation);
  }, [handleKeyboardNavigation]);

  // View configuration panel
  const ViewConfigPanel: React.FC = () => (
    <div className="view-config-panel bg-gray-50 p-4 rounded-lg">
      <h4 className="font-medium text-gray-900 mb-3">Display Options</h4>
      <div className="grid grid-cols-2 gap-3">
        <Toggle.Root
          pressed={viewConfig.colorBySource}
          onPressedChange={(pressed) => handleConfigChange('colorBySource', pressed)}
          className={clsx(
            'flex items-center justify-center px-3 py-2 rounded-md text-sm',
            transitionClasses.smooth,
            'data-[state=on]:bg-blue-600 data-[state=on]:text-white',
            'data-[state=off]:bg-white data-[state=off]:text-gray-700 data-[state=off]:border data-[state=off]:border-gray-300'
          )}
        >
          Color by Source
        </Toggle.Root>
        
        <Toggle.Root
          pressed={viewConfig.colorByConfidence}
          onPressedChange={(pressed) => handleConfigChange('colorByConfidence', pressed)}
          className={clsx(
            'flex items-center justify-center px-3 py-2 rounded-md text-sm',
            transitionClasses.smooth,
            'data-[state=on]:bg-blue-600 data-[state=on]:text-white',
            'data-[state=off]:bg-white data-[state=off]:text-gray-700 data-[state=off]:border data-[state=off]:border-gray-300'
          )}
        >
          Color by Confidence
        </Toggle.Root>
        
        <Toggle.Root
          pressed={viewConfig.showMetadata}
          onPressedChange={(pressed) => handleConfigChange('showMetadata', pressed)}
          className={clsx(
            'flex items-center justify-center px-3 py-2 rounded-md text-sm',
            transitionClasses.smooth,
            'data-[state=on]:bg-blue-600 data-[state=on]:text-white',
            'data-[state=off]:bg-white data-[state=off]:text-gray-700 data-[state=off]:border data-[state=off]:border-gray-300'
          )}
        >
          Show Metadata
        </Toggle.Root>
        
        <Toggle.Root
          pressed={viewConfig.compactMode}
          onPressedChange={(pressed) => handleConfigChange('compactMode', pressed)}
          className={clsx(
            'flex items-center justify-center px-3 py-2 rounded-md text-sm',
            transitionClasses.smooth,
            'data-[state=on]:bg-blue-600 data-[state=on]:text-white',
            'data-[state=off]:bg-white data-[state=off]:text-gray-700 data-[state=off]:border data-[state=off]:border-gray-300'
          )}
        >
          Compact Mode
        </Toggle.Root>
      </div>
    </div>
  );

  // Statistics panel
  const StatsPanel: React.FC = () => (
    <div className="stats-panel bg-white border border-gray-200 rounded-lg p-4">
      <h4 className="font-medium text-gray-900 mb-3">Statistics</h4>
      <div className="grid grid-cols-2 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
          <div className="text-xs text-gray-500">Total Changes</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          <div className="text-xs text-gray-500">Pending</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{stats.accepted}</div>
          <div className="text-xs text-gray-500">Accepted</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
          <div className="text-xs text-gray-500">Rejected</div>
        </div>
      </div>
      <Separator.Root className="bg-gray-200 h-px my-3" />
      <div className="text-center">
        <div className="text-lg font-semibold text-gray-900">
          {Math.round(stats.avgConfidence * 100)}%
        </div>
        <div className="text-xs text-gray-500">Average Confidence</div>
      </div>
    </div>
  );

  // Changes list component
  const ChangesList: React.FC = () => (
    <div className="changes-list space-y-4">
      {Object.entries(groupedChanges).map(([status, statusChanges]) => {
        if (statusChanges.length === 0) return null;
        
        return (
          <div key={status} className="status-group">
            <h3 className="font-medium text-gray-700 mb-2 capitalize flex items-center">
              {status} ({statusChanges.length})
              {status === 'pending' && statusChanges.length > 0 && (
                <span className="ml-2 animate-pulse w-2 h-2 bg-yellow-500 rounded-full" />
              )}
            </h3>
            <div className="space-y-2">
              {statusChanges.map(change => (
                <div
                  key={change.id}
                  className={clsx(
                    'change-item group relative p-3 rounded-lg border',
                    transitionClasses.smooth,
                    {
                      'border-blue-300 bg-blue-50': selectedChangeId === change.id,
                      'border-gray-200 bg-white hover:border-gray-300': selectedChangeId !== change.id,
                      'ring-2 ring-blue-500 ring-opacity-20': selectedChangeIds.includes(change.id)
                    }
                  )}
                  onClick={() => onChangeSelect?.(change.id)}
                  onDoubleClick={() => handleBulkSelectionToggle(change.id)}
                >
                  {/* Checkbox for bulk selection */}
                  <button
                    className="absolute top-2 right-2 w-4 h-4 border border-gray-300 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleBulkSelectionToggle(change.id);
                    }}
                    style={{
                      backgroundColor: selectedChangeIds.includes(change.id) ? colors.blue[500] : 'transparent',
                      borderColor: selectedChangeIds.includes(change.id) ? colors.blue[500] : colors.gray[300]
                    }}
                  >
                    {selectedChangeIds.includes(change.id) && (
                      <svg className="w-3 h-3 text-white" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>

                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0 mr-4">
                      <InlineDiff
                        change={change}
                        config={viewConfig}
                        isSelected={selectedChangeId === change.id}
                        onAccept={onChangeAccept}
                        onReject={onChangeReject}
                        onSelect={onChangeSelect}
                      />
                      
                      {viewConfig.showMetadata && change.metadata?.reason && (
                        <p className="mt-2 text-sm text-gray-600">
                          {change.metadata.reason}
                        </p>
                      )}
                    </div>
                    
                    <ChangeControls
                      change={change}
                      onAccept={onChangeAccept}
                      onReject={onChangeReject}
                      onCluster={onClusterChange}
                      shortcuts={shortcuts}
                      compact={viewConfig.compactMode}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <Tooltip.Provider>
      <div className={clsx('track-edits-view', 'space-y-6', className)} role="application" aria-label="Track Edits Interface">
        {/* Header with view switcher */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-semibold text-gray-900">Track Edits</h2>
            {!isResponsiveMode && (
              <div className="flex items-center bg-gray-100 rounded-lg p-1">
                {(['changes', 'timeline', 'heatmap'] as const).map((view) => (
                  <button
                    key={view}
                    onClick={() => setActiveView(view)}
                    className={clsx(
                      'px-3 py-1 rounded-md text-sm font-medium transition-all duration-200',
                      {
                        'bg-white text-gray-900 shadow-sm': activeView === view,
                        'text-gray-600 hover:text-gray-900': activeView !== view
                      }
                    )}
                  >
                    {view.charAt(0).toUpperCase() + view.slice(1)}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          {/* Mobile view switcher */}
          {isResponsiveMode && (
            <select 
              value={activeView}
              onChange={(e) => setActiveView(e.target.value as any)}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm"
            >
              <option value="changes">Changes</option>
              <option value="timeline">Timeline</option>
              <option value="heatmap">Heatmap</option>
            </select>
          )}
        </div>

        {/* Main content area */}
        <div className={clsx(
          'grid gap-6',
          {
            'grid-cols-1': isResponsiveMode,
            'grid-cols-12': !isResponsiveMode
          }
        )}>
          {/* Primary content */}
          <div className={clsx('space-y-6', {
            'col-span-12': isResponsiveMode,
            'col-span-8': !isResponsiveMode
          })}>
            {/* Bulk operations */}
            <BulkOperations
              changes={filteredChanges}
              selectedChangeIds={selectedChangeIds}
              onSelectionChange={setSelectedChangeIds}
              onBulkOperation={onBulkOperation}
              filters={filters}
              onFiltersChange={setFilters}
            />

            {/* Main view content */}
            {activeView === 'changes' && <ChangesList />}
            {activeView === 'timeline' && (
              <Timeline
                entries={timeline}
                changes={changes}
                onChangeSelect={onChangeSelect}
                selectedChangeId={selectedChangeId}
                compact={viewConfig.compactMode}
              />
            )}
            {activeView === 'heatmap' && heatmapData && (
              <RevisionHeatmap
                data={heatmapData}
                compact={viewConfig.compactMode}
              />
            )}
          </div>

          {/* Sidebar */}
          {!isResponsiveMode && (
            <div className="col-span-4 space-y-6">
              <StatsPanel />
              <ViewConfigPanel />
            </div>
          )}
        </div>

        {/* Mobile stats and config */}
        {isResponsiveMode && (
          <div className="grid grid-cols-1 gap-4">
            <StatsPanel />
            <ViewConfigPanel />
          </div>
        )}

        {/* Empty state */}
        {filteredChanges.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 12l2 2 4-4" />
                <circle cx="12" cy="12" r="9" />
              </svg>
            </div>
            <p className="text-gray-500 text-lg">No changes to display</p>
            <p className="text-gray-400 text-sm mt-1">
              {Object.keys(filters).length > 0 
                ? 'Try adjusting your filters to see more results'
                : 'Changes will appear here as you work on your document'
              }
            </p>
          </div>
        )}
      </div>
    </Tooltip.Provider>
  );
};

export default TrackEditsView;