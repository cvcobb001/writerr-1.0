/**
 * Utility functions for the chat UI
 */

import { KeyboardShortcuts } from '../interface/types';

export const DEFAULT_KEYBOARD_SHORTCUTS: KeyboardShortcuts = {
  send: process.platform === 'darwin' ? 'Cmd+Enter' : 'Ctrl+Enter',
  newLine: 'Enter',
  focus: process.platform === 'darwin' ? 'Cmd+K' : 'Ctrl+K'
};

/**
 * Check if a keyboard event matches a shortcut
 */
export function matchesShortcut(event: KeyboardEvent, shortcut: string): boolean {
  const keys = shortcut.toLowerCase().split('+');
  const modifiers = keys.filter(key => ['cmd', 'ctrl', 'alt', 'shift'].includes(key));
  const mainKey = keys.find(key => !['cmd', 'ctrl', 'alt', 'shift'].includes(key));

  if (!mainKey) return false;

  const hasCmd = modifiers.includes('cmd') && (event.metaKey || event.ctrlKey);
  const hasCtrl = modifiers.includes('ctrl') && event.ctrlKey;
  const hasAlt = modifiers.includes('alt') && event.altKey;
  const hasShift = modifiers.includes('shift') && event.shiftKey;

  const matchesModifiers = 
    (modifiers.includes('cmd') ? hasCmd : !event.metaKey && !event.ctrlKey) &&
    (modifiers.includes('ctrl') ? hasCtrl : !event.ctrlKey || event.metaKey) &&
    (modifiers.includes('alt') ? hasAlt : !event.altKey) &&
    (modifiers.includes('shift') ? hasShift : !event.shiftKey);

  const matchesKey = event.key.toLowerCase() === mainKey;

  return matchesModifiers && matchesKey;
}

/**
 * Generate a unique ID for chat messages and sessions
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Format timestamp for display
 */
export function formatTimestamp(date: Date, showTime = true): string {
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const isYesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toDateString() === date.toDateString();

  if (isToday) {
    return showTime ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Today';
  } else if (isYesterday) {
    return showTime ? `Yesterday ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Yesterday';
  } else {
    const dateStr = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    return showTime ? `${dateStr} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : dateStr;
  }
}

/**
 * Truncate text for display
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Debounce function for performance optimization
 */
export function debounce<T extends (...args: any[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Check if we're running in Obsidian environment
 */
export function isObsidianEnvironment(): boolean {
  return typeof window !== 'undefined' && 'require' in window && 'app' in window;
}

/**
 * Get platform-specific modifier key name
 */
export function getModifierKeyName(): string {
  return process.platform === 'darwin' ? '⌘' : 'Ctrl';
}

/**
 * CSS class name utility (simplified version of clsx)
 */
export function cn(...classes: (string | undefined | null | boolean)[]): string {
  return classes.filter(Boolean).join(' ');
}