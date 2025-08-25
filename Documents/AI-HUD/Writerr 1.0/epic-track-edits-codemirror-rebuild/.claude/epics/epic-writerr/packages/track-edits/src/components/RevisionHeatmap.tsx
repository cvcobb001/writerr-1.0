import React, { useMemo, useState } from 'react';
import { clsx } from 'clsx';
import * as Tooltip from '@radix-ui/react-tooltip';
import { RevisionHeatmapData, ChangeCategory } from '../types';
import { colors, categoryColors } from '../ui/colors';
import { transitionClasses } from '../animations/transitions';

interface RevisionHeatmapProps {
  data: RevisionHeatmapData;
  onRevisionClick?: (timestamp: number) => void;
  showCategories?: boolean;
  compact?: boolean;
  maxWidth?: number;
  className?: string;
}

export const RevisionHeatmap: React.FC<RevisionHeatmapProps> = ({
  data,
  onRevisionClick,
  showCategories = true,
  compact = false,
  maxWidth = 600,
  className
}) => {
  const [hoveredRevision, setHoveredRevision] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<ChangeCategory | null>(null);

  // Calculate dimensions based on data
  const { cellWidth, cellHeight, cellGap } = useMemo(() => {
    const baseWidth = compact ? 12 : 16;
    const baseHeight = compact ? 12 : 16;
    const gap = compact ? 1 : 2;
    
    return {
      cellWidth: baseWidth,
      cellHeight: baseHeight,
      cellGap: gap
    };
  }, [compact]);

  // Prepare heatmap grid data
  const heatmapData = useMemo(() => {
    const sortedRevisions = [...data.revisions].sort((a, b) => a.timestamp - b.timestamp);
    const maxIntensity = Math.max(...sortedRevisions.map(r => r.intensity));
    
    return sortedRevisions.map(revision => ({
      ...revision,
      normalizedIntensity: revision.intensity / maxIntensity,
      formattedTime: new Date(revision.timestamp).toLocaleString(),
      totalChanges: Object.values(revision.categories).reduce((sum, count) => sum + count, 0)
    }));
  }, [data.revisions]);

  // Category legend data
  const categoryLegend = useMemo(() => {
    const allCategories = Object.keys(ChangeCategory) as ChangeCategory[];
    return allCategories.map(category => ({
      category,
      color: categoryColors[category],
      totalCount: heatmapData.reduce((sum, revision) => sum + (revision.categories[category] || 0), 0)
    })).filter(item => item.totalCount > 0);
  }, [heatmapData]);

  const getIntensityColor = (intensity: number): string => {
    if (intensity === 0) return colors.gray[100];
    
    // Create a gradient from light blue to dark blue
    const alpha = Math.max(0.1, intensity);
    const red = Math.round(59 + (255 - 59) * (1 - alpha));
    const green = Math.round(130 + (255 - 130) * (1 - alpha));
    const blue = 246;
    
    return `rgb(${red}, ${green}, ${blue})`;
  };

  const getCategoryBreakdown = (revision: typeof heatmapData[0]) => {
    return Object.entries(revision.categories)
      .filter(([_, count]) => count > 0)
      .sort(([_, a], [__, b]) => b - a)
      .map(([category, count]) => ({
        category: category as ChangeCategory,
        count,
        percentage: Math.round((count / revision.totalChanges) * 100)
      }));
  };

  const handleRevisionClick = (timestamp: number) => {
    onRevisionClick?.(timestamp);
  };

  const HeatmapCell: React.FC<{ revision: typeof heatmapData[0], index: number }> = ({ 
    revision, 
    index 
  }) => {
    const isHovered = hoveredRevision === revision.timestamp;
    const categoryBreakdown = getCategoryBreakdown(revision);
    const primaryCategory = categoryBreakdown[0];

    return (
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <div
            className={clsx(
              'heatmap-cell',
              'relative',
              'rounded-sm',
              'cursor-pointer',
              transitionClasses.smooth,
              {
                'transform scale-110 shadow-lg z-10': isHovered,
                'ring-2 ring-blue-500 ring-opacity-50': selectedCategory && primaryCategory?.category === selectedCategory
              }
            )}
            style={{
              width: cellWidth,
              height: cellHeight,
              backgroundColor: revision.intensity > 0 
                ? getIntensityColor(revision.normalizedIntensity)
                : colors.gray[100],
              border: revision.intensity > 0 
                ? `1px solid ${getIntensityColor(Math.min(1, revision.normalizedIntensity + 0.2))}`
                : `1px solid ${colors.gray[200]}`
            }}
            onClick={() => handleRevisionClick(revision.timestamp)}
            onMouseEnter={() => setHoveredRevision(revision.timestamp)}
            onMouseLeave={() => setHoveredRevision(null)}
          >
            {/* Category indicator for non-empty cells */}
            {revision.intensity > 0 && primaryCategory && (
              <div
                className="absolute bottom-0 left-0 w-1 h-1 rounded-full"
                style={{ backgroundColor: categoryColors[primaryCategory.category] }}
              />
            )}
          </div>
        </Tooltip.Trigger>
        
        <Tooltip.Portal>
          <Tooltip.Content 
            className="bg-gray-900 text-white p-3 rounded-lg shadow-lg max-w-xs"
            sideOffset={5}
          >
            <div className="space-y-2">
              <div className="font-medium">
                {revision.formattedTime}
              </div>
              
              <div className="text-sm">
                <div>Changes: {revision.changeCount}</div>
                <div>Intensity: {Math.round(revision.intensity * 100)}%</div>
              </div>

              {categoryBreakdown.length > 0 && (
                <div className="text-xs space-y-1">
                  <div className="font-medium">Categories:</div>
                  {categoryBreakdown.map(({ category, count, percentage }) => (
                    <div key={category} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div
                          className="w-2 h-2 rounded-full mr-2"
                          style={{ backgroundColor: categoryColors[category] }}
                        />
                        <span>{category}</span>
                      </div>
                      <span>{count} ({percentage}%)</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <Tooltip.Arrow className="fill-gray-900" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    );
  };

  if (heatmapData.length === 0) {
    return (
      <div className={clsx('revision-heatmap-empty', 'text-center py-8 text-gray-500', className)}>
        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        </div>
        <p>No revision data available</p>
        <p className="text-sm text-gray-400 mt-1">Revision activity will appear here</p>
      </div>
    );
  }

  return (
    <Tooltip.Provider>
      <div className={clsx('revision-heatmap', 'space-y-4', className)} style={{ maxWidth }}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className={clsx('font-medium text-gray-900', compact ? 'text-sm' : 'text-base')}>
            Revision Activity
          </h3>
          <div className="text-sm text-gray-500">
            {heatmapData.length} revisions
          </div>
        </div>

        {/* Heatmap grid */}
        <div className="heatmap-grid">
          <div 
            className="grid gap-1"
            style={{ 
              gridTemplateColumns: `repeat(auto-fit, ${cellWidth}px)`,
              gap: cellGap
            }}
          >
            {heatmapData.map((revision, index) => (
              <HeatmapCell
                key={revision.timestamp}
                revision={revision}
                index={index}
              />
            ))}
          </div>
        </div>

        {/* Intensity legend */}
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span>Less</span>
          <div className="flex gap-1">
            {[0, 0.2, 0.4, 0.6, 0.8, 1].map((intensity, i) => (
              <div
                key={i}
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: getIntensityColor(intensity) }}
              />
            ))}
          </div>
          <span>More</span>
        </div>

        {/* Category legend */}
        {showCategories && categoryLegend.length > 0 && (
          <div className="category-legend space-y-2">
            <h4 className={clsx('font-medium text-gray-700', compact ? 'text-xs' : 'text-sm')}>
              Categories
            </h4>
            <div className="flex flex-wrap gap-2">
              {categoryLegend.map(({ category, color, totalCount }) => (
                <button
                  key={category}
                  className={clsx(
                    'inline-flex items-center px-2 py-1 rounded-full text-xs',
                    transitionClasses.smooth,
                    {
                      'bg-blue-100 text-blue-800 ring-2 ring-blue-500': selectedCategory === category,
                      'bg-gray-100 text-gray-700 hover:bg-gray-200': selectedCategory !== category
                    }
                  )}
                  onClick={() => setSelectedCategory(selectedCategory === category ? null : category)}
                >
                  <div
                    className="w-2 h-2 rounded-full mr-2"
                    style={{ backgroundColor: color }}
                  />
                  {category} ({totalCount})
                </button>
              ))}
              {selectedCategory && (
                <button
                  className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-red-100 text-red-800 hover:bg-red-200"
                  onClick={() => setSelectedCategory(null)}
                >
                  Clear filter
                </button>
              )}
            </div>
          </div>
        )}

        {/* Summary stats */}
        <div className="heatmap-stats grid grid-cols-3 gap-4 pt-4 border-t border-gray-200">
          <div className="text-center">
            <div className={clsx('font-semibold', compact ? 'text-lg' : 'text-xl')}>
              {heatmapData.reduce((sum, r) => sum + r.changeCount, 0)}
            </div>
            <div className="text-xs text-gray-500">Total Changes</div>
          </div>
          
          <div className="text-center">
            <div className={clsx('font-semibold', compact ? 'text-lg' : 'text-xl')}>
              {Math.round(heatmapData.reduce((sum, r) => sum + r.intensity, 0) / heatmapData.length * 100)}%
            </div>
            <div className="text-xs text-gray-500">Avg Intensity</div>
          </div>
          
          <div className="text-center">
            <div className={clsx('font-semibold', compact ? 'text-lg' : 'text-xl')}>
              {Math.max(...heatmapData.map(r => r.changeCount))}
            </div>
            <div className="text-xs text-gray-500">Peak Changes</div>
          </div>
        </div>
      </div>
    </Tooltip.Provider>
  );
};

export default RevisionHeatmap;