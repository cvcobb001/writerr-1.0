/**
 * @fileoverview File system watcher for hot-reload functionality
 */

import * as fs from 'fs';
import * as path from 'path';
import { globalEventBus } from '@writerr/shared';
import { WatchEvent } from '../types';

interface WatcherOptions {
  recursive: boolean;
  debounceMs: number;
  extensions: string[];
  ignorePatterns: string[];
}

interface PendingChange {
  filePath: string;
  event: WatchEvent;
  timeout: NodeJS.Timeout;
}

export class FileWatcher {
  private watchers = new Map<string, fs.FSWatcher>();
  private watchedPaths = new Set<string>();
  private pendingChanges = new Map<string, PendingChange>();
  private options: WatcherOptions;
  private isActive = false;

  constructor(options: Partial<WatcherOptions> = {}) {
    this.options = {
      recursive: true,
      debounceMs: 100,
      extensions: ['.md', '.xml'],
      ignorePatterns: ['node_modules', '.git', 'dist', 'build'],
      ...options
    };

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    globalEventBus.on('file-watcher', (event) => {
      const { type, payload } = event;
      
      switch (type) {
        case 'start':
          this.start();
          break;
        case 'stop':
          this.stop();
          break;
        case 'add-path':
          this.addWatchPath(payload.path);
          break;
        case 'remove-path':
          this.removeWatchPath(payload.path);
          break;
      }
    });
  }

  /**
   * Start watching all configured paths
   */
  start(): void {
    if (this.isActive) {
      return;
    }

    this.isActive = true;
    console.log('[FileWatcher] Starting file system monitoring');

    // Start watching all previously added paths
    for (const watchPath of this.watchedPaths) {
      this.startWatching(watchPath);
    }

    this.emitEvent('watcher-started', {});
  }

  /**
   * Stop watching all paths
   */
  stop(): void {
    if (!this.isActive) {
      return;
    }

    this.isActive = false;
    console.log('[FileWatcher] Stopping file system monitoring');

    // Clear all pending changes
    this.pendingChanges.forEach(pending => {
      clearTimeout(pending.timeout);
    });
    this.pendingChanges.clear();

    // Close all watchers
    this.watchers.forEach(watcher => {
      watcher.close();
    });
    this.watchers.clear();

    this.emitEvent('watcher-stopped', {});
  }

  /**
   * Add a path to watch
   */
  addWatchPath(watchPath: string): void {
    if (!fs.existsSync(watchPath)) {
      console.warn(`[FileWatcher] Path does not exist: ${watchPath}`);
      return;
    }

    const normalizedPath = path.resolve(watchPath);
    this.watchedPaths.add(normalizedPath);

    if (this.isActive) {
      this.startWatching(normalizedPath);
    }

    console.log(`[FileWatcher] Added watch path: ${normalizedPath}`);
  }

  /**
   * Remove a path from watching
   */
  removeWatchPath(watchPath: string): void {
    const normalizedPath = path.resolve(watchPath);
    this.watchedPaths.delete(normalizedPath);

    const watcher = this.watchers.get(normalizedPath);
    if (watcher) {
      watcher.close();
      this.watchers.delete(normalizedPath);
    }

    // Clear any pending changes for this path
    const toDelete: string[] = [];
    this.pendingChanges.forEach((pending, key) => {
      if (pending.filePath.startsWith(normalizedPath)) {
        clearTimeout(pending.timeout);
        toDelete.push(key);
      }
    });
    toDelete.forEach(key => this.pendingChanges.delete(key));

    console.log(`[FileWatcher] Removed watch path: ${normalizedPath}`);
  }

  /**
   * Get all currently watched paths
   */
  getWatchedPaths(): string[] {
    return Array.from(this.watchedPaths);
  }

  /**
   * Check if watcher is active
   */
  isWatching(): boolean {
    return this.isActive;
  }

  /**
   * Start watching a specific path
   */
  private startWatching(watchPath: string): void {
    if (this.watchers.has(watchPath)) {
      return;
    }

    try {
      const watcher = fs.watch(
        watchPath,
        { recursive: this.options.recursive },
        (eventType, filename) => {
          this.handleFileSystemEvent(watchPath, eventType, filename);
        }
      );

      watcher.on('error', (error) => {
        console.error(`[FileWatcher] Error watching ${watchPath}:`, error);
        this.emitEvent('watcher-error', {
          path: watchPath,
          error: error.message
        });
      });

      this.watchers.set(watchPath, watcher);
      console.log(`[FileWatcher] Started watching: ${watchPath}`);
    } catch (error) {
      console.error(`[FileWatcher] Failed to watch ${watchPath}:`, error);
    }
  }

  /**
   * Handle file system events
   */
  private handleFileSystemEvent(
    watchPath: string,
    eventType: string,
    filename: string | null
  ): void {
    if (!filename) {
      return;
    }

    const filePath = path.join(watchPath, filename);
    
    // Check if file should be ignored
    if (this.shouldIgnoreFile(filePath)) {
      return;
    }

    // Determine event type
    let watchEventType: WatchEvent['type'];
    const fileExists = fs.existsSync(filePath);
    
    if (eventType === 'rename') {
      watchEventType = fileExists ? 'created' : 'deleted';
    } else {
      watchEventType = 'modified';
    }

    const event: WatchEvent = {
      type: watchEventType,
      filePath,
      timestamp: new Date(),
      metadata: {
        fsEventType: eventType,
        watchPath
      }
    };

    // Apply debouncing to prevent rapid fire events
    this.debounceEvent(filePath, event);
  }

  /**
   * Apply debouncing to file events
   */
  private debounceEvent(filePath: string, event: WatchEvent): void {
    // Cancel previous timeout for this file
    const existing = this.pendingChanges.get(filePath);
    if (existing) {
      clearTimeout(existing.timeout);
    }

    // Create new debounced event
    const timeout = setTimeout(() => {
      this.pendingChanges.delete(filePath);
      this.processWatchEvent(event);
    }, this.options.debounceMs);

    this.pendingChanges.set(filePath, {
      filePath,
      event,
      timeout
    });
  }

  /**
   * Process a watch event after debouncing
   */
  private processWatchEvent(event: WatchEvent): void {
    console.log(`[FileWatcher] File ${event.type}: ${event.filePath}`);

    // Emit the event
    this.emitEvent('file-changed', event);

    // Handle different event types
    switch (event.type) {
      case 'created':
        this.handleFileCreated(event);
        break;
      case 'modified':
        this.handleFileModified(event);
        break;
      case 'deleted':
        this.handleFileDeleted(event);
        break;
      case 'moved':
        this.handleFileMoved(event);
        break;
    }
  }

  /**
   * Handle file creation
   */
  private handleFileCreated(event: WatchEvent): void {
    if (this.isSupportedFile(event.filePath)) {
      // Emit function load request
      globalEventBus.emit('function-load', {
        filePath: event.filePath,
        reason: 'file-created'
      }, 'file-watcher');
    }
  }

  /**
   * Handle file modification
   */
  private handleFileModified(event: WatchEvent): void {
    if (this.isSupportedFile(event.filePath)) {
      // Emit function reload request
      globalEventBus.emit('function-reload', {
        filePath: event.filePath,
        reason: 'file-modified'
      }, 'file-watcher');
    }
  }

  /**
   * Handle file deletion
   */
  private handleFileDeleted(event: WatchEvent): void {
    if (this.isSupportedFile(event.filePath)) {
      // Emit function unload request
      globalEventBus.emit('function-unload', {
        filePath: event.filePath,
        reason: 'file-deleted'
      }, 'file-watcher');
    }
  }

  /**
   * Handle file move/rename
   */
  private handleFileMoved(event: WatchEvent): void {
    if (this.isSupportedFile(event.filePath)) {
      // For moves, we might need both old and new paths
      // This is a simplified implementation
      globalEventBus.emit('function-moved', {
        filePath: event.filePath,
        reason: 'file-moved'
      }, 'file-watcher');
    }
  }

  /**
   * Check if a file should be ignored
   */
  private shouldIgnoreFile(filePath: string): boolean {
    const normalizedPath = path.normalize(filePath);
    
    // Check ignore patterns
    for (const pattern of this.options.ignorePatterns) {
      if (normalizedPath.includes(pattern)) {
        return true;
      }
    }

    // Check if it's a supported file type
    if (!this.isSupportedFile(filePath)) {
      return true;
    }

    // Ignore hidden files and directories
    const basename = path.basename(filePath);
    if (basename.startsWith('.')) {
      return true;
    }

    // Ignore temporary files
    if (basename.includes('~') || basename.endsWith('.tmp') || basename.endsWith('.swp')) {
      return true;
    }

    return false;
  }

  /**
   * Check if file is a supported function definition file
   */
  private isSupportedFile(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return this.options.extensions.includes(ext);
  }

  /**
   * Emit a watcher event
   */
  private emitEvent(type: string, data: any): void {
    globalEventBus.emit('file-watcher-event', {
      type,
      data,
      timestamp: new Date()
    }, 'file-watcher');
  }

  /**
   * Get statistics about the watcher
   */
  getStats(): {
    isActive: boolean;
    watchedPaths: number;
    activeWatchers: number;
    pendingChanges: number;
  } {
    return {
      isActive: this.isActive,
      watchedPaths: this.watchedPaths.size,
      activeWatchers: this.watchers.size,
      pendingChanges: this.pendingChanges.size
    };
  }

  /**
   * Force check all watched files for changes
   */
  async forceCheck(): Promise<void> {
    if (!this.isActive) {
      return;
    }

    console.log('[FileWatcher] Performing force check of all watched files');

    for (const watchPath of this.watchedPaths) {
      try {
        await this.checkDirectory(watchPath);
      } catch (error) {
        console.error(`[FileWatcher] Error during force check of ${watchPath}:`, error);
      }
    }
  }

  /**
   * Recursively check a directory for changes
   */
  private async checkDirectory(dirPath: string): Promise<void> {
    try {
      const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        
        if (this.shouldIgnoreFile(fullPath)) {
          continue;
        }

        if (entry.isFile() && this.isSupportedFile(fullPath)) {
          // Emit check request for supported files
          globalEventBus.emit('function-check', {
            filePath: fullPath,
            reason: 'force-check'
          }, 'file-watcher');
        } else if (entry.isDirectory() && this.options.recursive) {
          await this.checkDirectory(fullPath);
        }
      }
    } catch (error) {
      console.warn(`[FileWatcher] Could not check directory ${dirPath}:`, error);
    }
  }

  /**
   * Update watcher options
   */
  updateOptions(newOptions: Partial<WatcherOptions>): void {
    const wasActive = this.isActive;
    
    // Stop watching if active
    if (wasActive) {
      this.stop();
    }

    // Update options
    this.options = { ...this.options, ...newOptions };

    // Restart if was active
    if (wasActive) {
      this.start();
    }

    console.log('[FileWatcher] Updated options:', newOptions);
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    this.stop();
    this.watchedPaths.clear();
    console.log('[FileWatcher] Disposed');
  }
}

// Export singleton instance
export const fileWatcher = new FileWatcher();