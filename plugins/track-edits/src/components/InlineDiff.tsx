import React, { useMemo } from 'react';
import { clsx } from 'clsx';
import { Change, ChangeType, DiffViewConfig } from '../types';
import { sourceColors, categoryColors, statusColors, highlightColors, textColors, getConfidenceColor } from '../ui/colors';

interface InlineDiffProps {
  change: Change;
  config: DiffViewConfig;
  isSelected?: boolean;
  isHovered?: boolean;
  onAccept?: (changeId: string) => void;
  onReject?: (changeId: string) => void;
  onSelect?: (changeId: string) => void;
  className?: string;
}

export const InlineDiff: React.FC<InlineDiffProps> = ({
  change,
  config,
  isSelected = false,
  isHovered = false,
  onAccept,
  onReject,
  onSelect,
  className
}) => {
  const diffContent = useMemo(() => {
    const { before, after } = change.content;
    
    switch (change.type) {
      case ChangeType.INSERT:
        return (
          <span className="inline-diff-content">
            <span 
              className="inline-diff-addition"
              style={{
                backgroundColor: highlightColors.insert,
                color: textColors.insert,
                textDecoration: 'none'
              }}
            >
              {after}
            </span>
          </span>
        );
        
      case ChangeType.DELETE:
        return (
          <span className="inline-diff-content">
            <span 
              className="inline-diff-deletion"
              style={{
                backgroundColor: highlightColors.delete,
                color: textColors.delete,
                textDecoration: 'line-through'
              }}
            >
              {before}
            </span>
          </span>
        );
        
      case ChangeType.REPLACE:
        return (
          <span className="inline-diff-content">
            <span 
              className="inline-diff-deletion"
              style={{
                backgroundColor: highlightColors.delete,
                color: textColors.strikethrough,
                textDecoration: 'line-through',
                marginRight: '2px'
              }}
            >
              {before}
            </span>
            <span 
              className="inline-diff-addition"
              style={{
                backgroundColor: highlightColors.insert,
                color: textColors.insert,
                textDecoration: 'none'
              }}
            >
              {after}
            </span>
          </span>
        );
        
      case ChangeType.MOVE:
        return (
          <span className="inline-diff-content">
            <span 
              className="inline-diff-move"
              style={{
                backgroundColor: highlightColors.move,
                color: textColors.replace,
                textDecoration: 'none',
                position: 'relative'
              }}
            >
              {after}
              <span 
                className="move-indicator"
                style={{
                  position: 'absolute',
                  top: '-2px',
                  right: '-2px',
                  fontSize: '0.7em',
                  opacity: 0.7
                }}
              >
                ↗
              </span>
            </span>
          </span>
        );
        
      default:
        return <span>{after}</span>;
    }
  }, [change]);

  const getBackgroundColor = () => {
    if (config.colorByConfidence) {
      const baseColor = config.colorBySource ? sourceColors[change.source] : categoryColors[change.category];
      return getConfidenceColor(change.confidence, baseColor);
    }
    
    if (config.colorBySource) {
      return `${sourceColors[change.source]}20`; // 20% opacity
    }
    
    return `${categoryColors[change.category]}20`; // 20% opacity
  };

  const getBorderColor = () => {
    if (config.colorBySource) {
      return sourceColors[change.source];
    }
    return categoryColors[change.category];
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect?.(change.id);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        onAccept?.(change.id);
        break;
      case 'Escape':
        e.preventDefault();
        onReject?.(change.id);
        break;
    }
  };

  return (
    <span
      className={clsx(
        'inline-diff',
        'relative',
        'inline-block',
        'rounded-sm',
        'px-1',
        'py-0.5',
        'cursor-pointer',
        'transition-all',
        'duration-200',
        'ease-in-out',
        {
          'ring-2 ring-blue-500': isSelected,
          'shadow-md': isHovered,
          'animate-pulse': change.status === 'pending'
        },
        className
      )}
      style={{
        backgroundColor: getBackgroundColor(),
        borderLeft: `3px solid ${getBorderColor()}`,
        borderRadius: '3px'
      }}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`${change.type} change: ${change.content.before} → ${change.content.after}`}
      data-change-id={change.id}
      data-change-type={change.type}
      data-confidence={change.confidence}
      data-source={change.source}
      data-category={change.category}
    >
      {diffContent}
      
      {/* Metadata tooltip content */}
      {config.showMetadata && (
        <div className="sr-only">
          <span>Source: {change.source}</span>
          <span>Category: {change.category}</span>
          <span>Confidence: {Math.round(change.confidence * 100)}%</span>
          {change.metadata?.reason && <span>Reason: {change.metadata.reason}</span>}
        </div>
      )}
      
      {/* Status indicator */}
      <span
        className="absolute -top-1 -right-1 w-2 h-2 rounded-full"
        style={{ backgroundColor: statusColors[change.status] }}
        aria-label={`Status: ${change.status}`}
      />
      
      {/* Confidence indicator */}
      {config.showMetadata && (
        <div
          className="absolute bottom-0 left-0 h-0.5 bg-gray-400 rounded-full"
          style={{ 
            width: `${change.confidence * 100}%`,
            backgroundColor: getBorderColor(),
            opacity: 0.6
          }}
          aria-label={`Confidence: ${Math.round(change.confidence * 100)}%`}
        />
      )}
    </span>
  );
};

export default InlineDiff;