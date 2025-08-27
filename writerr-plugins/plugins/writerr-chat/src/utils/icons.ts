/**
 * Centralized Lucide icon system for Writerr Chat
 * Uses direct SVG paths for consistent rendering across all components
 */

export interface IconConfig {
  viewBox?: string;
  width?: number;
  height?: number;
  strokeWidth?: number;
  className?: string;
}

const DEFAULT_CONFIG: Required<IconConfig> = {
  viewBox: '0 0 24 24',
  width: 16,
  height: 16,
  strokeWidth: 2,
  className: 'writerr-icon'
};

/**
 * Lucide icon paths - direct from lucide.dev
 */
export const ICON_PATHS = {
  // Communication & Actions
  send: ['m22 2-7 20-4-9-9-4z', 'M22 2 11 13'],
  messageCircle: ['M7.9 20A9 9 0 1 0 4 16.1L2 22z'],
  bot: ['M12 8V4H8', 'M16 8V4h-4', 'M10 18h4', 'M10 12h4', 'M8 4c0-1.1.9-2 2-2h4c1.1 0 2 .9 2 2v4c0 1.1-.9 2-2 2h-4c-1.1 0-2-.9-2-2V4z'],
  user: ['M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2', 'circle cx="12" cy="7" r="4"'],
  
  // File & Document Actions  
  filePlus2: ['M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z', 'M14 2v6h6', 'M12 12v6', 'M9 15h6'],
  copy: ['rect width="14" height="14" x="8" y="8" rx="2" ry="2"', 'path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"'],
  plus: ['M12 5v14', 'M5 12h14'],
  
  // Editing & Cleanup
  paintbrush: ['M18.37 2.63 14 7l-1.59-1.59a2 2 0 0 0-2.82 0L8 7l9 9 1.59-1.59a2 2 0 0 0 0-2.82L17 10l4.37-4.37a2.12 2.12 0 1 0-3-3Z', 'M9 8c-2 3-4 3.5-7 4l8 10c2-1 6-5 6-7', 'M14.5 17.5L4.5 15'],
  
  // Navigation & UI
  chevronDown: ['m6 9 6 6 6-6'],
  chevronUp: ['m18 15-6-6-6 6'], 
  chevronLeft: ['m15 18-6-6 6-6'],
  chevronRight: ['m9 18 6-6-6-6'],
  x: ['M18 6 6 18', 'M6 6l12 12'],
  
  // Information & Actions
  eye: ['path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-3-7-10-7Z"', 'circle cx="12" cy="12" r="3"'],
  info: ['circle cx="12" cy="12" r="10"', 'path d="M12 16v-4"', 'path d="M12 8h.01"'],
  settings: ['circle cx="12" cy="12" r="3"', 'path d="M12 1v6m0 6v6m-3-9h6m-6 6h6'],
  
  // Loading & Status
  loader: ['path d="M21 12a9 9 0 11-6.219-8.56"'],
  
  // Content Actions
  refresh: ['path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"', 'path d="M21 3v5h-5"', 'path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"', 'path d="M8 16H3v5"'],
  trash: ['path d="M3 6h18"', 'path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"', 'path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"'],
  
  // Text & Editing
  type: ['polyline points="4,7 4,4 20,4 20,7"', 'line x1="9" y1="20" x2="15" y2="20"', 'line x1="12" y1="4" x2="12" y2="20"'],
  edit3: ['path d="M12 20h9"', 'path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"']
} as const;;

export type IconName = keyof typeof ICON_PATHS;

/**
 * Generate SVG element string for an icon
 */
export function createIcon(name: IconName, config: Partial<IconConfig> = {}): string {
  const { viewBox, width, height, strokeWidth, className } = { ...DEFAULT_CONFIG, ...config };
  const paths = ICON_PATHS[name];
  
  if (!paths) {
    console.warn(`Icon "${name}" not found`);
    return createIcon('info', config); // Fallback to info icon
  }
  
  const pathElements = Array.isArray(paths) 
    ? paths.map(path => {
        // Handle different path types
        if (path.startsWith('M') || path.startsWith('m') || path.startsWith('L') || path.startsWith('path d=')) {
          const d = path.startsWith('path d=') ? path.slice(8, -1) : path;
          return `<path d="${d}"/>`;
        } else if (path.includes('cx') || path.includes('cy') || path.includes('r')) {
          return `<${path}/>`;
        } else if (path.includes('width') || path.includes('height') || path.includes('x') || path.includes('y')) {
          return `<${path}/>`;
        } else if (path.includes('x1') || path.includes('y1') || path.includes('x2') || path.includes('y2')) {
          return `<${path}/>`;
        } else if (path.includes('points')) {
          return `<${path}/>`;
        } else {
          return `<path d="${path}"/>`;
        }
      }).join('')
    : `<path d="${paths}"/>`;
  
  return `
    <svg 
      class="${className}" 
      width="${width}" 
      height="${height}" 
      viewBox="${viewBox}" 
      fill="none" 
      stroke="currentColor" 
      stroke-width="${strokeWidth}"
    >
      ${pathElements}
    </svg>
  `.trim();
}

/**
 * Create icon element (HTMLElement)
 */
export function createIconElement(name: IconName, config: Partial<IconConfig> = {}): HTMLElement {
  const div = document.createElement('div');
  div.innerHTML = createIcon(name, config);
  return div.firstElementChild as HTMLElement;
}

/**
 * Set icon on existing element
 */
export function setIconHTML(element: HTMLElement, name: IconName, config: Partial<IconConfig> = {}): void {
  element.innerHTML = createIcon(name, config);
}

/**
 * Icon size presets for common use cases
 */
export const ICON_SIZES = {
  xs: { width: 12, height: 12 },
  sm: { width: 14, height: 14 },
  md: { width: 16, height: 16 },
  lg: { width: 18, height: 18 },
  xl: { width: 20, height: 20 }
} as const;

/**
 * Icon style presets
 */
export const ICON_STYLES = {
  toolbar: { className: 'writerr-toolbar-icon', ...ICON_SIZES.md },
  action: { className: 'writerr-action-icon', ...ICON_SIZES.sm },
  context: { className: 'writerr-context-action-icon', ...ICON_SIZES.sm },
  send: { className: 'writerr-send-icon', ...ICON_SIZES.md },
  message: { className: 'writerr-message-icon', ...ICON_SIZES.lg }
} as const;

export type IconStyle = keyof typeof ICON_STYLES;

/**
 * Create icon with predefined style
 */
export function createStyledIcon(name: IconName, style: IconStyle): string {
  return createIcon(name, ICON_STYLES[style]);
}

/**
 * Quick icon creation helpers
 */
export const Icons = {
  send: (config?: Partial<IconConfig>) => createIcon('send', config),
  bot: (config?: Partial<IconConfig>) => createIcon('bot', config),
  user: (config?: Partial<IconConfig>) => createIcon('user', config),
  copy: (config?: Partial<IconConfig>) => createIcon('copy', config),
  paintbrush: (config?: Partial<IconConfig>) => createIcon('paintbrush', config),
  filePlus2: (config?: Partial<IconConfig>) => createIcon('filePlus2', config),
  plus: (config?: Partial<IconConfig>) => createIcon('plus', config),
  chevronDown: (config?: Partial<IconConfig>) => createIcon('chevronDown', config),
  eye: (config?: Partial<IconConfig>) => createIcon('eye', config),
  loader: (config?: Partial<IconConfig>) => createIcon('loader', config),
  trash: (config?: Partial<IconConfig>) => createIcon('trash', config),
  refresh: (config?: Partial<IconConfig>) => createIcon('refresh', config),
  edit3: (config?: Partial<IconConfig>) => createIcon('edit3', config),
  x: (config?: Partial<IconConfig>) => createIcon('x', config),
  info: (config?: Partial<IconConfig>) => createIcon('info', config)
};