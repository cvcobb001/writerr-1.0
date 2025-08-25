/**
 * @fileoverview File system watcher for hot-reload functionality
 */

import { EventRef, TAbstractFile, TFile, Vault } from 'obsidian';
import { globalEventBus } from '@writerr/shared';
import {
  HotReloadConfig,
  ModeLoadEvent,
  ParsedModeFile
} from '../modes/types';
import { ModeParser } from '../parser/ModeParser';

export class HotReloadWatcher {
  private vault: Vault;
  private config: HotReloadConfig;
  private parser: ModeParser;
  private watchedPaths: Set<string> = new Set();
  private fileListeners: Map<string, EventRef[]> = new Map();
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();
  private activeSessions: Set<string> = new Set();
  private isWatching = false;

  constructor(vault: Vault, config: HotReloadConfig) {
    this.vault = vault;
    this.config = config;
    this.parser = new ModeParser();
    
    // Listen for session events to track active sessions
    globalEventBus.on('chat-session-started', (event) => {
      this.activeSessions.add(event.payload.sessionId);
    });
    
    globalEventBus.on('chat-session-ended', (event) => {
      this.activeSessions.delete(event.payload.sessionId);
    });
  }

  /**
   * Start watching for file changes
   */
  async startWatching(modesPath: string): Promise<void> {
    if (this.isWatching) {
      return;
    }

    console.log('🔥 Starting hot reload watcher for modes');
    
    try {
      await this.setupWatchers(modesPath);
      this.isWatching = true;
      
      globalEventBus.emit('hot-reload-started', {
        path: modesPath,
        config: this.config
      }, 'writerr-chat');
      
    } catch (error) {
      console.error('Failed to start hot reload watcher:', error);
      throw error;
    }
  }

  /**
   * Stop watching for file changes
   */
  stopWatching(): void {
    if (!this.isWatching) {
      return;
    }

    console.log('🛑 Stopping hot reload watcher');
    
    // Clear all debounce timers
    this.debounceTimers.forEach(timer => clearTimeout(timer));
    this.debounceTimers.clear();
    
    // Remove all file listeners
    this.fileListeners.forEach((listeners, path) => {
      listeners.forEach(listener => this.vault.offref(listener));
    });
    this.fileListeners.clear();
    this.watchedPaths.clear();
    
    this.isWatching = false;
    
    globalEventBus.emit('hot-reload-stopped', {}, 'writerr-chat');
  }

  /**
   * Setup file system watchers
   */
  private async setupWatchers(modesPath: string): Promise<void> {
    // Get the modes folder
    const modesFolder = this.vault.getAbstractFileByPath(modesPath);
    
    if (!modesFolder) {
      console.warn(`Modes folder not found: ${modesPath}`);
      return;
    }

    // Watch for changes to the modes folder itself
    await this.watchDirectory(modesPath);
    
    // Watch existing mode files
    await this.scanAndWatchModeFiles(modesPath);
  }

  /**
   * Watch a directory for changes
   */
  private async watchDirectory(dirPath: string): Promise<void> {
    if (this.watchedPaths.has(dirPath)) {
      return;
    }

    const listeners: EventRef[] = [];
    
    // Watch for file creation
    const createListener = this.vault.on('create', (file: TAbstractFile) => {
      if (this.isInModesDirectory(file.path, dirPath) && this.isModeFile(file.path)) {
        this.handleFileChange(file.path, 'created');
      }
    });
    
    // Watch for file modification
    const modifyListener = this.vault.on('modify', (file: TAbstractFile) => {
      if (this.isInModesDirectory(file.path, dirPath) && this.isModeFile(file.path)) {
        this.handleFileChange(file.path, 'modified');
      }
    });
    
    // Watch for file deletion
    const deleteListener = this.vault.on('delete', (file: TAbstractFile) => {
      if (this.isInModesDirectory(file.path, dirPath) && this.isModeFile(file.path)) {
        this.handleFileChange(file.path, 'deleted');
      }
    });
    
    // Watch for file rename
    const renameListener = this.vault.on('rename', (file: TAbstractFile, oldPath: string) => {
      if (this.isInModesDirectory(oldPath, dirPath) && this.isModeFile(oldPath)) {
        this.handleFileChange(oldPath, 'deleted');
      }
      if (this.isInModesDirectory(file.path, dirPath) && this.isModeFile(file.path)) {
        this.handleFileChange(file.path, 'created');
      }
    });

    listeners.push(createListener, modifyListener, deleteListener, renameListener);
    this.fileListeners.set(dirPath, listeners);
    this.watchedPaths.add(dirPath);
    
    console.log(`📁 Watching directory: ${dirPath}`);
  }

  /**
   * Scan directory and watch existing mode files
   */
  private async scanAndWatchModeFiles(dirPath: string): Promise<void> {
    const folder = this.vault.getAbstractFileByPath(dirPath);
    if (!folder || !('children' in folder)) {
      return;
    }

    for (const child of folder.children) {
      if (child instanceof TFile && this.isModeFile(child.path)) {
        console.log(`📄 Found mode file: ${child.path}`);
        // Emit initial load event
        await this.processFileChange(child.path, 'loaded');
      } else if ('children' in child) {
        // Recursively watch subdirectories
        await this.scanAndWatchModeFiles(child.path);
      }
    }
  }

  /**
   * Handle file system changes with debouncing
   */
  private handleFileChange(filePath: string, changeType: 'created' | 'modified' | 'deleted' | 'loaded'): void {
    // Clear existing debounce timer
    const existingTimer = this.debounceTimers.get(filePath);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new debounce timer
    const timer = setTimeout(() => {
      this.processFileChange(filePath, changeType);
      this.debounceTimers.delete(filePath);
    }, this.config.debounceDelay);

    this.debounceTimers.set(filePath, timer);
  }

  /**
   * Process file change after debouncing
   */
  private async processFileChange(filePath: string, changeType: 'created' | 'modified' | 'deleted' | 'loaded'): Promise<void> {
    console.log(`🔄 Processing ${changeType} file: ${filePath}`);
    
    try {
      let parsedMode: ParsedModeFile | null = null;
      
      if (changeType !== 'deleted') {
        const file = this.vault.getAbstractFileByPath(filePath) as TFile;
        if (file) {
          const content = await this.vault.read(file);
          parsedMode = await this.parser.parseFile(filePath, content);
          
          // Log parsing results
          if (parsedMode.errors.length > 0) {
            console.warn(`⚠️ Mode file has errors: ${filePath}`, parsedMode.errors);
          } else {
            console.log(`✅ Successfully parsed mode: ${parsedMode.config.name}`);
          }
        }
      }

      // Check session preservation
      const shouldPreserveSessions = this.config.preserveSessions && this.activeSessions.size > 0;
      
      if (shouldPreserveSessions && changeType === 'modified') {
        console.log('🔒 Preserving active sessions during hot reload');
        // In a full implementation, this would handle graceful mode updates
        // without disrupting active chat sessions
      }

      // Emit appropriate event
      let eventType: ModeLoadEvent['type'];
      switch (changeType) {
        case 'created':
        case 'loaded':
          eventType = 'mode-loaded';
          break;
        case 'modified':
          eventType = 'mode-updated';
          break;
        case 'deleted':
          eventType = 'mode-unloaded';
          break;
        default:
          eventType = 'mode-updated';
      }

      const event: ModeLoadEvent = {
        type: eventType,
        modeId: parsedMode?.config.id || this.extractModeIdFromPath(filePath),
        mode: parsedMode || undefined,
        timestamp: Date.now()
      };

      globalEventBus.emit('mode-file-changed', event, 'writerr-chat');
      
      // Emit specific event type
      globalEventBus.emit(eventType, event, 'writerr-chat');

    } catch (error) {
      console.error(`❌ Error processing file change ${filePath}:`, error);
      
      const errorEvent: ModeLoadEvent = {
        type: 'mode-error',
        modeId: this.extractModeIdFromPath(filePath),
        error: {
          type: 'syntax',
          message: `Failed to process file change: ${error.message}`,
          severity: 'error'
        },
        timestamp: Date.now()
      };

      globalEventBus.emit('mode-error', errorEvent, 'writerr-chat');
    }
  }

  /**
   * Check if file is in the modes directory
   */
  private isInModesDirectory(filePath: string, modesDir: string): boolean {
    return filePath.startsWith(modesDir);
  }

  /**
   * Check if file is a mode definition file
   */
  private isModeFile(filePath: string): boolean {
    return this.config.watchPatterns.some(pattern => {
      // Simple pattern matching - in production use proper glob matching
      if (pattern === '*.md') {
        return filePath.endsWith('.md');
      }
      return filePath.includes(pattern);
    });
  }

  /**
   * Extract mode ID from file path
   */
  private extractModeIdFromPath(filePath: string): string {
    const fileName = filePath.split('/').pop() || '';
    return fileName.replace(/\.[^.]+$/, ''); // Remove extension
  }

  /**
   * Get current watch status
   */
  getWatchStatus(): {
    isWatching: boolean;
    watchedPaths: string[];
    activeSessions: number;
    config: HotReloadConfig;
  } {
    return {
      isWatching: this.isWatching,
      watchedPaths: Array.from(this.watchedPaths),
      activeSessions: this.activeSessions.size,
      config: this.config
    };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<HotReloadConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // If watching is disabled, stop watching
    if (!this.config.enabled && this.isWatching) {
      this.stopWatching();
    }
    
    globalEventBus.emit('hot-reload-config-updated', {
      config: this.config
    }, 'writerr-chat');
  }

  /**
   * Force reload a specific file
   */
  async forceReload(filePath: string): Promise<void> {
    if (this.isModeFile(filePath)) {
      await this.processFileChange(filePath, 'modified');
    }
  }

  /**
   * Get debounce status for debugging
   */
  getDebounceStatus(): Array<{ filePath: string; remaining: number }> {
    const status: Array<{ filePath: string; remaining: number }> = [];
    
    this.debounceTimers.forEach((timer, filePath) => {
      // Note: In Node.js, timers don't expose remaining time directly
      // This is a simplified approach for debugging
      status.push({
        filePath,
        remaining: this.config.debounceDelay
      });
    });
    
    return status;
  }
}