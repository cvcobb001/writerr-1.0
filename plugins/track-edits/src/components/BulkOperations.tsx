import React, { useState, useMemo, useCallback } from 'react';
import { clsx } from 'clsx';
import * as Dialog from '@radix-ui/react-dialog';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import * as Checkbox from '@radix-ui/react-checkbox';
import * as Progress from '@radix-ui/react-progress';
import { Change, FilterOptions, BulkOperation, ChangeSource, ChangeCategory, ChangeStatus } from '../types';
import { sourceColors, categoryColors, statusColors, colors } from '../ui/colors';
import { transitionClasses } from '../animations/transitions';

interface BulkOperationsProps {
  changes: Change[];
  selectedChangeIds: string[];
  onSelectionChange: (changeIds: string[]) => void;
  onBulkOperation: (operation: BulkOperation) => Promise<void>;
  filters: FilterOptions;
  onFiltersChange: (filters: FilterOptions) => void;
  showProgress?: boolean;
  disabled?: boolean;
  className?: string;
}

export const BulkOperations: React.FC<BulkOperationsProps> = ({
  changes,
  selectedChangeIds,
  onSelectionChange,
  onBulkOperation,
  filters,
  onFiltersChange,
  showProgress = true,
  disabled = false,
  className
}) => {
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);
  const [isOperationInProgress, setIsOperationInProgress] = useState(false);
  const [operationProgress, setOperationProgress] = useState(0);

  // Filtered changes based on current filters
  const filteredChanges = useMemo(() => {
    return changes.filter(change => {
      // Source filter
      if (filters.sources && filters.sources.length > 0) {
        if (!filters.sources.includes(change.source)) return false;
      }

      // Category filter
      if (filters.categories && filters.categories.length > 0) {
        if (!filters.categories.includes(change.category)) return false;
      }

      // Status filter
      if (filters.statuses && filters.statuses.length > 0) {
        if (!filters.statuses.includes(change.status)) return false;
      }

      // Confidence range filter
      if (filters.confidenceRange) {
        const [min, max] = filters.confidenceRange;
        if (change.confidence < min || change.confidence > max) return false;
      }

      // Time range filter
      if (filters.timeRange) {
        const [start, end] = filters.timeRange;
        if (change.timestamp < start || change.timestamp > end) return false;
      }

      // Text search filter
      if (filters.searchText && filters.searchText.trim()) {
        const searchLower = filters.searchText.toLowerCase();
        return (
          change.content.before.toLowerCase().includes(searchLower) ||
          change.content.after.toLowerCase().includes(searchLower) ||
          (change.metadata?.reason && change.metadata.reason.toLowerCase().includes(searchLower)) ||
          (change.metadata?.suggestion && change.metadata.suggestion.toLowerCase().includes(searchLower))
        );
      }

      return true;
    });
  }, [changes, filters]);

  // Selection statistics
  const selectionStats = useMemo(() => {
    const selected = filteredChanges.filter(change => selectedChangeIds.includes(change.id));
    return {
      total: filteredChanges.length,
      selected: selected.length,
      byStatus: {
        pending: selected.filter(c => c.status === ChangeStatus.PENDING).length,
        accepted: selected.filter(c => c.status === ChangeStatus.ACCEPTED).length,
        rejected: selected.filter(c => c.status === ChangeStatus.REJECTED).length,
        conflicted: selected.filter(c => c.status === ChangeStatus.CONFLICTED).length
      },
      byCategory: selected.reduce((acc, change) => {
        acc[change.category] = (acc[change.category] || 0) + 1;
        return acc;
      }, {} as Record<ChangeCategory, number>),
      avgConfidence: selected.length > 0 
        ? selected.reduce((sum, c) => sum + c.confidence, 0) / selected.length 
        : 0
    };
  }, [filteredChanges, selectedChangeIds]);

  // Active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.sources && filters.sources.length > 0) count++;
    if (filters.categories && filters.categories.length > 0) count++;
    if (filters.statuses && filters.statuses.length > 0) count++;
    if (filters.confidenceRange) count++;
    if (filters.timeRange) count++;
    if (filters.searchText && filters.searchText.trim()) count++;
    return count;
  }, [filters]);

  const handleBulkOperation = useCallback(async (type: BulkOperation['type']) => {
    if (selectedChangeIds.length === 0 || isOperationInProgress) return;

    setIsOperationInProgress(true);
    setOperationProgress(0);

    try {
      const operation: BulkOperation = {
        type,
        changeIds: selectedChangeIds
      };

      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setOperationProgress(prev => Math.min(prev + 10, 90));
      }, 100);

      await onBulkOperation(operation);

      clearInterval(progressInterval);
      setOperationProgress(100);

      // Clear selection after successful operation
      onSelectionChange([]);
    } catch (error) {
      console.error('Bulk operation failed:', error);
    } finally {
      setTimeout(() => {
        setIsOperationInProgress(false);
        setOperationProgress(0);
      }, 500);
    }
  }, [selectedChangeIds, isOperationInProgress, onBulkOperation, onSelectionChange]);

  const handleSelectAll = () => {
    const allIds = filteredChanges.map(change => change.id);
    onSelectionChange(allIds);
  };

  const handleSelectNone = () => {
    onSelectionChange([]);
  };

  const handleSelectByStatus = (status: ChangeStatus) => {
    const ids = filteredChanges
      .filter(change => change.status === status)
      .map(change => change.id);
    onSelectionChange([...new Set([...selectedChangeIds, ...ids])]);
  };

  const FilterDialog: React.FC = () => (
    <Dialog.Root open={isFilterDialogOpen} onOpenChange={setIsFilterDialogOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black bg-opacity-50 data-[state=open]:animate-fadeIn data-[state=closed]:animate-fadeOut" />
        <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl p-6 w-full max-w-md max-h-[80vh] overflow-y-auto">
          <Dialog.Title className="text-lg font-medium mb-4">Filter Changes</Dialog.Title>

          <div className="space-y-6">
            {/* Text search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search text
              </label>
              <input
                type="text"
                value={filters.searchText || ''}
                onChange={(e) => onFiltersChange({ ...filters, searchText: e.target.value })}
                placeholder="Search in changes..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Sources */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sources
              </label>
              <div className="space-y-2">
                {Object.values(ChangeSource).map(source => (
                  <div key={source} className="flex items-center">
                    <Checkbox.Root
                      checked={(filters.sources || []).includes(source)}
                      onCheckedChange={(checked) => {
                        const sources = filters.sources || [];
                        if (checked) {
                          onFiltersChange({ ...filters, sources: [...sources, source] });
                        } else {
                          onFiltersChange({ ...filters, sources: sources.filter(s => s !== source) });
                        }
                      }}
                      className="w-4 h-4 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                    >
                      <Checkbox.Indicator className="text-blue-600">
                        <svg width="12" height="12" viewBox="0 0 15 15" fill="none">
                          <path d="M11.4669 3.72684L5.5 9.69397L3.53317 7.72684" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </Checkbox.Indicator>
                    </Checkbox.Root>
                    <div className="ml-2 flex items-center">
                      <div 
                        className="w-3 h-3 rounded-full mr-2"
                        style={{ backgroundColor: sourceColors[source] }}
                      />
                      <label className="text-sm text-gray-700">{source}</label>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Categories */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Categories
              </label>
              <div className="space-y-2">
                {Object.values(ChangeCategory).map(category => (
                  <div key={category} className="flex items-center">
                    <Checkbox.Root
                      checked={(filters.categories || []).includes(category)}
                      onCheckedChange={(checked) => {
                        const categories = filters.categories || [];
                        if (checked) {
                          onFiltersChange({ ...filters, categories: [...categories, category] });
                        } else {
                          onFiltersChange({ ...filters, categories: categories.filter(c => c !== category) });
                        }
                      }}
                      className="w-4 h-4 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                    >
                      <Checkbox.Indicator className="text-blue-600">
                        <svg width="12" height="12" viewBox="0 0 15 15" fill="none">
                          <path d="M11.4669 3.72684L5.5 9.69397L3.53317 7.72684" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </Checkbox.Indicator>
                    </Checkbox.Root>
                    <div className="ml-2 flex items-center">
                      <div 
                        className="w-3 h-3 rounded-full mr-2"
                        style={{ backgroundColor: categoryColors[category] }}
                      />
                      <label className="text-sm text-gray-700">{category}</label>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Statuses */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Statuses
              </label>
              <div className="space-y-2">
                {Object.values(ChangeStatus).map(status => (
                  <div key={status} className="flex items-center">
                    <Checkbox.Root
                      checked={(filters.statuses || []).includes(status)}
                      onCheckedChange={(checked) => {
                        const statuses = filters.statuses || [];
                        if (checked) {
                          onFiltersChange({ ...filters, statuses: [...statuses, status] });
                        } else {
                          onFiltersChange({ ...filters, statuses: statuses.filter(s => s !== status) });
                        }
                      }}
                      className="w-4 h-4 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                    >
                      <Checkbox.Indicator className="text-blue-600">
                        <svg width="12" height="12" viewBox="0 0 15 15" fill="none">
                          <path d="M11.4669 3.72684L5.5 9.69397L3.53317 7.72684" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </Checkbox.Indicator>
                    </Checkbox.Root>
                    <div className="ml-2 flex items-center">
                      <div 
                        className="w-3 h-3 rounded-full mr-2"
                        style={{ backgroundColor: statusColors[status] }}
                      />
                      <label className="text-sm text-gray-700">{status}</label>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Confidence range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confidence Range
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={filters.confidenceRange?.[0] || 0}
                  onChange={(e) => {
                    const min = parseFloat(e.target.value);
                    const max = filters.confidenceRange?.[1] || 1;
                    onFiltersChange({ ...filters, confidenceRange: [min, Math.max(min, max)] });
                  }}
                  className="flex-1"
                />
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={filters.confidenceRange?.[1] || 1}
                  onChange={(e) => {
                    const max = parseFloat(e.target.value);
                    const min = filters.confidenceRange?.[0] || 0;
                    onFiltersChange({ ...filters, confidenceRange: [Math.min(min, max), max] });
                  }}
                  className="flex-1"
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>{Math.round((filters.confidenceRange?.[0] || 0) * 100)}%</span>
                <span>{Math.round((filters.confidenceRange?.[1] || 1) * 100)}%</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-2 mt-6">
            <button
              onClick={() => onFiltersChange({})}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
            >
              Clear All
            </button>
            <Dialog.Close asChild>
              <button className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700">
                Apply Filters
              </button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );

  return (
    <div className={clsx('bulk-operations', 'bg-white border border-gray-200 rounded-lg p-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-4">
          <h3 className="font-medium text-gray-900">Bulk Operations</h3>
          <div className="text-sm text-gray-500">
            {selectionStats.selected} of {selectionStats.total} selected
          </div>
        </div>

        <button
          onClick={() => setIsFilterDialogOpen(true)}
          className={clsx(
            'inline-flex items-center px-3 py-1 rounded-md text-sm',
            transitionClasses.smooth,
            {
              'bg-blue-100 text-blue-800': activeFilterCount > 0,
              'bg-gray-100 text-gray-600 hover:bg-gray-200': activeFilterCount === 0
            }
          )}
        >
          <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="22,3 2,3 10,12.46 10,19 14,21 14,12.46 22,3" />
          </svg>
          Filters
          {activeFilterCount > 0 && (
            <span className="ml-1 bg-blue-600 text-white text-xs rounded-full px-1">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Selection controls */}
      <div className="flex items-center space-x-2 mb-4">
        <button
          onClick={handleSelectAll}
          className="text-sm text-blue-600 hover:text-blue-800"
          disabled={disabled}
        >
          Select All
        </button>
        <span className="text-gray-300">|</span>
        <button
          onClick={handleSelectNone}
          className="text-sm text-blue-600 hover:text-blue-800"
          disabled={disabled}
        >
          Select None
        </button>
        <span className="text-gray-300">|</span>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button className="text-sm text-blue-600 hover:text-blue-800" disabled={disabled}>
              Select by Status ▼
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content className="bg-white border border-gray-200 rounded-md shadow-lg p-1 min-w-[120px]">
              {Object.values(ChangeStatus).map(status => (
                <DropdownMenu.Item
                  key={status}
                  className="flex items-center px-2 py-1 text-sm cursor-pointer rounded hover:bg-gray-100"
                  onClick={() => handleSelectByStatus(status)}
                >
                  <div 
                    className="w-2 h-2 rounded-full mr-2"
                    style={{ backgroundColor: statusColors[status] }}
                  />
                  {status}
                </DropdownMenu.Item>
              ))}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>

      {/* Progress bar */}
      {showProgress && isOperationInProgress && (
        <div className="mb-4">
          <Progress.Root className="relative overflow-hidden bg-gray-200 rounded-full w-full h-2">
            <Progress.Indicator 
              className="bg-blue-600 h-full transition-transform duration-200 ease-out"
              style={{ transform: `translateX(-${100 - operationProgress}%)` }}
            />
          </Progress.Root>
        </div>
      )}

      {/* Bulk action buttons */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => handleBulkOperation('accept')}
          disabled={disabled || isOperationInProgress || selectionStats.selected === 0}
          className={clsx(
            'inline-flex items-center px-3 py-1 rounded-md text-sm font-medium',
            transitionClasses.smooth,
            'bg-green-600 text-white hover:bg-green-700',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="20,6 9,17 4,12" />
          </svg>
          Accept ({selectionStats.byStatus.pending})
        </button>

        <button
          onClick={() => handleBulkOperation('reject')}
          disabled={disabled || isOperationInProgress || selectionStats.selected === 0}
          className={clsx(
            'inline-flex items-center px-3 py-1 rounded-md text-sm font-medium',
            transitionClasses.smooth,
            'bg-red-600 text-white hover:bg-red-700',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
          Reject ({selectionStats.byStatus.pending})
        </button>

        <button
          onClick={() => handleBulkOperation('cluster')}
          disabled={disabled || isOperationInProgress || selectionStats.selected < 2}
          className={clsx(
            'inline-flex items-center px-3 py-1 rounded-md text-sm font-medium',
            transitionClasses.smooth,
            'bg-purple-600 text-white hover:bg-purple-700',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
          </svg>
          Cluster
        </button>
      </div>

      {/* Selection summary */}
      {selectionStats.selected > 0 && (
        <div className="mt-4 p-3 bg-gray-50 rounded-md">
          <div className="text-sm text-gray-600">
            <div className="flex items-center justify-between">
              <span>Average confidence:</span>
              <span className="font-medium">
                {Math.round(selectionStats.avgConfidence * 100)}%
              </span>
            </div>
            <div className="mt-2">
              <div className="text-xs text-gray-500 mb-1">Categories:</div>
              <div className="flex flex-wrap gap-1">
                {Object.entries(selectionStats.byCategory).map(([category, count]) => (
                  <span
                    key={category}
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-200 text-gray-700"
                  >
                    <div
                      className="w-2 h-2 rounded-full mr-1"
                      style={{ backgroundColor: categoryColors[category as ChangeCategory] }}
                    />
                    {category}: {count}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <FilterDialog />
    </div>
  );
};

export default BulkOperations;