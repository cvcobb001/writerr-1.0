import { ChangeSource, ChangeCategory, ChangeStatus } from '../types';

// Color palette for change visualization
export const colors = {
  // Base colors
  white: '#ffffff',
  black: '#000000',
  
  // Grays
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827'
  },
  
  // Primary colors
  blue: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a'
  },
  
  // Status colors
  green: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d'
  },
  
  red: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d'
  },
  
  yellow: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f'
  },
  
  purple: {
    50: '#faf5ff',
    100: '#f3e8ff',
    200: '#e9d5ff',
    300: '#d8b4fe',
    400: '#c084fc',
    500: '#a855f7',
    600: '#9333ea',
    700: '#7c3aed',
    800: '#6b21a8',
    900: '#581c87'
  },
  
  indigo: {
    50: '#eef2ff',
    100: '#e0e7ff',
    200: '#c7d2fe',
    300: '#a5b4fc',
    400: '#818cf8',
    500: '#6366f1',
    600: '#4f46e5',
    700: '#4338ca',
    800: '#3730a3',
    900: '#312e81'
  },
  
  pink: {
    50: '#fdf2f8',
    100: '#fce7f3',
    200: '#fbcfe8',
    300: '#f9a8d4',
    400: '#f472b6',
    500: '#ec4899',
    600: '#db2777',
    700: '#be185d',
    800: '#9d174d',
    900: '#831843'
  },
  
  orange: {
    50: '#fff7ed',
    100: '#ffedd5',
    200: '#fed7aa',
    300: '#fdba74',
    400: '#fb923c',
    500: '#f97316',
    600: '#ea580c',
    700: '#c2410c',
    800: '#9a3412',
    900: '#7c2d12'
  },
  
  teal: {
    50: '#f0fdfa',
    100: '#ccfbf1',
    200: '#99f6e4',
    300: '#5eead4',
    400: '#2dd4bf',
    500: '#14b8a6',
    600: '#0d9488',
    700: '#0f766e',
    800: '#115e59',
    900: '#134e4a'
  }
};

// Source-based color mapping
export const sourceColors = {
  [ChangeSource.AI_GRAMMAR]: colors.blue[500],
  [ChangeSource.AI_STYLE]: colors.purple[500],
  [ChangeSource.AI_CONTENT]: colors.indigo[500],
  [ChangeSource.MANUAL_EDIT]: colors.gray[600],
  [ChangeSource.SPELL_CHECK]: colors.orange[500],
  [ChangeSource.COLLABORATION]: colors.teal[500]
} as const;

// Category-based color mapping
export const categoryColors = {
  [ChangeCategory.GRAMMAR]: colors.blue[500],
  [ChangeCategory.STYLE]: colors.purple[500],
  [ChangeCategory.STRUCTURE]: colors.indigo[500],
  [ChangeCategory.CONTENT]: colors.pink[500],
  [ChangeCategory.FORMATTING]: colors.orange[500],
  [ChangeCategory.SPELLING]: colors.red[500]
} as const;

// Status-based color mapping
export const statusColors = {
  [ChangeStatus.PENDING]: colors.yellow[500],
  [ChangeStatus.ACCEPTED]: colors.green[500],
  [ChangeStatus.REJECTED]: colors.red[500],
  [ChangeStatus.CONFLICTED]: colors.orange[600]
} as const;

// Confidence-based color mapping (opacity based)
export const getConfidenceColor = (confidence: number, baseColor: string): string => {
  const alpha = Math.max(0.3, confidence); // Minimum 30% opacity
  return `${baseColor}${Math.round(alpha * 255).toString(16).padStart(2, '0')}`;
};

// Background colors for highlights
export const highlightColors = {
  insert: colors.green[100],
  delete: colors.red[100],
  replace: colors.blue[100],
  move: colors.purple[100]
};

// Text colors for strikethrough and additions
export const textColors = {
  insert: colors.green[700],
  delete: colors.red[700],
  replace: colors.blue[700],
  strikethrough: colors.gray[500]
};

// Theme definitions
export const lightTheme = {
  colors: {
    primary: colors.blue[600],
    secondary: colors.purple[600],
    accent: colors.indigo[500],
    background: colors.white,
    surface: colors.gray[50],
    text: colors.gray[900],
    textSecondary: colors.gray[600],
    success: colors.green[600],
    warning: colors.yellow[600],
    error: colors.red[600],
    info: colors.blue[600]
  },
  transitions: {
    fast: { duration: 150, easing: 'ease-out' },
    normal: { duration: 300, easing: 'ease-in-out' },
    slow: { duration: 500, easing: 'ease-in-out' }
  },
  shadows: {
    small: '0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24)',
    medium: '0 3px 6px rgba(0, 0, 0, 0.15), 0 2px 4px rgba(0, 0, 0, 0.12)',
    large: '0 10px 20px rgba(0, 0, 0, 0.15), 0 3px 6px rgba(0, 0, 0, 0.10)'
  },
  borderRadius: {
    small: '4px',
    medium: '8px',
    large: '12px'
  }
};

export const darkTheme = {
  ...lightTheme,
  colors: {
    primary: colors.blue[400],
    secondary: colors.purple[400],
    accent: colors.indigo[400],
    background: colors.gray[900],
    surface: colors.gray[800],
    text: colors.gray[100],
    textSecondary: colors.gray[400],
    success: colors.green[400],
    warning: colors.yellow[400],
    error: colors.red[400],
    info: colors.blue[400]
  }
};

// Utility functions for color manipulation
export const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
};

export const rgbToHex = (r: number, g: number, b: number): string => {
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
};

export const getContrastColor = (backgroundColor: string): string => {
  const rgb = hexToRgb(backgroundColor);
  if (!rgb) return colors.gray[900];
  
  const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
  return brightness > 128 ? colors.gray[900] : colors.white;
};