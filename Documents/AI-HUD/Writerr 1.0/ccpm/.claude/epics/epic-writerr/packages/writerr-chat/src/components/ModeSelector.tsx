import React from 'react';
import * as Select from '@radix-ui/react-select';
import { ChatMode, ModeSelectorProps } from '../interface/types';
import { cn } from '../ui/utils';

interface ChevronDownProps {
  className?: string;
}

const ChevronDown: React.FC<ChevronDownProps> = ({ className }) => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 12 12"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path
      d="M3 4.5L6 7.5L9 4.5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const ModeSelector: React.FC<ModeSelectorProps> = ({
  modes,
  currentMode,
  onModeChange,
  disabled = false,
  className
}) => {
  const handleValueChange = (value: string) => {
    const selectedMode = modes.find(mode => mode.id === value);
    if (selectedMode && selectedMode.id !== currentMode?.id) {
      onModeChange(selectedMode);
    }
  };

  return (
    <div className={cn('writerr-mode-selector', className)}>
      <Select.Root
        value={currentMode?.id || ''}
        onValueChange={handleValueChange}
        disabled={disabled}
      >
        <Select.Trigger
          className="writerr-mode-trigger"
          aria-label="Select chat mode"
        >
          <div className="flex items-center gap-2">
            {currentMode?.icon && (
              <span 
                className="writerr-mode-icon"
                role="img"
                aria-label={`${currentMode.name} icon`}
              >
                {currentMode.icon}
              </span>
            )}
            <Select.Value placeholder="Select mode">
              {currentMode?.name || 'Select mode'}
            </Select.Value>
          </div>
          <Select.Icon>
            <ChevronDown className="writerr-mode-chevron" />
          </Select.Icon>
        </Select.Trigger>

        <Select.Portal>
          <Select.Content
            className="writerr-mode-content"
            position="popper"
            side="bottom"
            align="end"
            sideOffset={4}
          >
            <Select.Viewport>
              {modes.map((mode) => (
                <Select.Item
                  key={mode.id}
                  value={mode.id}
                  className="writerr-mode-item"
                >
                  <div className="writerr-mode-item-icon">
                    {mode.icon && (
                      <span role="img" aria-label={`${mode.name} icon`}>
                        {mode.icon}
                      </span>
                    )}
                  </div>
                  <div className="writerr-mode-item-content">
                    <Select.ItemText>
                      <div className="writerr-mode-item-name">
                        {mode.name}
                      </div>
                      <div className="writerr-mode-item-description">
                        {mode.description}
                      </div>
                    </Select.ItemText>
                  </div>
                </Select.Item>
              ))}
            </Select.Viewport>
          </Select.Content>
        </Select.Portal>
      </Select.Root>
    </div>
  );
};

export default ModeSelector;