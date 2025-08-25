/**
 * @fileoverview Mode loader with validation and error handling
 */

import { TFile, Vault } from 'obsidian';
import { globalEventBus } from '@writerr/shared';
import {
  ParsedModeFile,
  ModeLoadEvent,
  HotReloadConfig,
  ParseError
} from '../modes/types';
import { ModeParser } from '../parser/ModeParser';
import { WriterModeRegistry } from '../modes/ModeRegistry';
import { HotReloadWatcher } from './HotReloadWatcher';

export class ModeLoader {
  private vault: Vault;
  private parser: ModeParser;
  private registry: WriterModeRegistry;
  private hotReloadWatcher: HotReloadWatcher;
  private modesPath: string;
  private loadAttempts: Map<string, number> = new Map();
  private loadErrors: Map<string, ParseError[]> = new Map();
  private isInitialized = false;
  private loadPromise: Promise<void> | null = null;

  private readonly maxRetryAttempts = 3;
  private readonly retryDelay = 1000; // 1 second

  constructor(vault: Vault, modesPath: string = 'Modes', hotReloadConfig?: Partial<HotReloadConfig>) {
    this.vault = vault;
    this.modesPath = modesPath;
    this.parser = new ModeParser();
    this.registry = new WriterModeRegistry();
    
    const defaultHotReloadConfig: HotReloadConfig = {
      enabled: true,
      debounceDelay: 500,
      watchPatterns: ['*.md'],
      preserveSessions: true,
      maxRetries: 3
    };
    
    this.hotReloadWatcher = new HotReloadWatcher(
      vault,
      { ...defaultHotReloadConfig, ...hotReloadConfig }
    );
    
    this.setupEventListeners();
  }

  /**
   * Initialize the mode loader
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    console.log('🚀 Initializing Mode Loader');

    try {
      // Ensure modes directory exists
      await this.ensureModesDirectory();
      
      // Load core modes first
      await this.loadCoreModes();
      
      // Load custom modes
      await this.loadCustomModes();
      
      // Start hot reload watcher
      if (this.hotReloadWatcher) {
        await this.hotReloadWatcher.startWatching(this.modesPath);
      }

      this.isInitialized = true;
      
      globalEventBus.emit('mode-loader-initialized', {
        modesPath: this.modesPath,
        loadedModes: this.registry.listModes().length
      }, 'writerr-chat');
      
      console.log('✅ Mode Loader initialized successfully');
      
    } catch (error) {
      console.error('❌ Failed to initialize Mode Loader:', error);
      throw error;
    }
  }

  /**
   * Load modes with retry logic and comprehensive error handling
   */
  async loadModes(): Promise<void> {
    if (this.loadPromise) {
      return this.loadPromise;
    }

    this.loadPromise = this._loadModes();
    
    try {
      await this.loadPromise;
    } finally {
      this.loadPromise = null;
    }
  }

  private async _loadModes(): Promise<void> {
    console.log(`📂 Loading modes from: ${this.modesPath}`);
    
    try {
      const modeFiles = await this.discoverModeFiles();
      console.log(`📄 Found ${modeFiles.length} mode files`);
      
      const loadResults = await this.loadModeFiles(modeFiles);
      
      // Report loading results
      const successful = loadResults.filter(r => r.success).length;
      const failed = loadResults.filter(r => !r.success).length;
      
      console.log(`✅ Loaded ${successful} modes successfully`);
      if (failed > 0) {
        console.warn(`⚠️ Failed to load ${failed} modes`);
      }

      // Emit summary event
      globalEventBus.emit('mode-loading-completed', {
        total: modeFiles.length,
        successful,
        failed,
        errors: loadResults.filter(r => !r.success).map(r => r.error)
      }, 'writerr-chat');
      
    } catch (error) {
      console.error('❌ Critical error during mode loading:', error);
      
      globalEventBus.emit('mode-loading-failed', {
        error: error.message,
        modesPath: this.modesPath
      }, 'writerr-chat');
      
      throw error;
    }
  }

  /**
   * Discover all mode files in the modes directory
   */
  private async discoverModeFiles(): Promise<TFile[]> {
    const modeFiles: TFile[] = [];
    
    try {
      await this.scanDirectory(this.modesPath, modeFiles);
    } catch (error) {
      if (error.message.includes('not found')) {
        console.warn(`⚠️ Modes directory not found: ${this.modesPath}`);
        return [];
      }
      throw error;
    }
    
    return modeFiles;
  }

  /**
   * Recursively scan directory for mode files
   */
  private async scanDirectory(path: string, modeFiles: TFile[]): Promise<void> {
    const folder = this.vault.getAbstractFileByPath(path);
    
    if (!folder) {
      throw new Error(`Directory not found: ${path}`);
    }
    
    if (!('children' in folder)) {
      return; // Not a folder
    }

    for (const child of folder.children) {
      if (child instanceof TFile && child.extension === 'md') {
        modeFiles.push(child);
      } else if ('children' in child) {
        // Recursively scan subdirectories
        await this.scanDirectory(child.path, modeFiles);
      }
    }
  }

  /**
   * Load multiple mode files with parallel processing and error isolation
   */
  private async loadModeFiles(files: TFile[]): Promise<Array<{ file: TFile; success: boolean; error?: ParseError }>> {
    const results = await Promise.allSettled(
      files.map(file => this.loadSingleModeFile(file))
    );

    return results.map((result, index) => {
      const file = files[index];
      
      if (result.status === 'fulfilled') {
        return { file, success: true };
      } else {
        const error: ParseError = {
          type: 'syntax',
          message: result.reason.message || 'Unknown error',
          severity: 'error'
        };
        
        return { file, success: false, error };
      }
    });
  }

  /**
   * Load a single mode file with retry logic
   */
  private async loadSingleModeFile(file: TFile): Promise<ParsedModeFile> {
    const filePath = file.path;
    const attempts = this.loadAttempts.get(filePath) || 0;
    
    try {
      console.log(`📖 Loading mode file: ${filePath}`);
      
      // Read file content
      const content = await this.vault.read(file);
      
      // Parse mode definition
      const parsedMode = await this.parser.parseFile(filePath, content);
      
      // Validate parsed mode
      if (!parsedMode.isValid) {
        const errorMessages = parsedMode.errors
          .filter(e => e.severity === 'error')
          .map(e => e.message)
          .join('; ');
        
        throw new Error(`Mode validation failed: ${errorMessages}`);
      }
      
      // Register with registry
      await this.registry.register(parsedMode);
      
      // Clear previous errors and attempts
      this.loadErrors.delete(filePath);
      this.loadAttempts.delete(filePath);
      
      console.log(`✅ Successfully loaded mode: ${parsedMode.config.name} (${parsedMode.config.id})`);
      
      return parsedMode;
      
    } catch (error) {
      console.error(`❌ Error loading mode file ${filePath}:`, error);
      
      // Track load attempts
      this.loadAttempts.set(filePath, attempts + 1);
      
      // Store error for debugging
      const parseError: ParseError = {
        type: 'syntax',
        message: error.message,
        severity: 'error'
      };
      
      this.loadErrors.set(filePath, [parseError]);
      
      // Retry if under max attempts
      if (attempts < this.maxRetryAttempts) {
        console.log(`🔄 Retrying load for ${filePath} (attempt ${attempts + 1}/${this.maxRetryAttempts})`);
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        
        return this.loadSingleModeFile(file);
      }
      
      // Emit error event
      const errorEvent: ModeLoadEvent = {
        type: 'mode-error',
        modeId: file.basename,
        error: parseError,
        timestamp: Date.now()
      };
      
      globalEventBus.emit('mode-load-error', errorEvent, 'writerr-chat');
      
      throw error;
    }
  }

  /**
   * Ensure the modes directory exists
   */
  private async ensureModesDirectory(): Promise<void> {
    const folder = this.vault.getAbstractFileByPath(this.modesPath);
    
    if (!folder) {
      console.log(`📁 Creating modes directory: ${this.modesPath}`);
      
      try {
        await this.vault.createFolder(this.modesPath);
        
        // Create initial modes if directory is empty
        await this.createInitialModes();
        
      } catch (error) {
        console.error(`❌ Failed to create modes directory: ${error}`);
        throw error;
      }
    }
  }

  /**
   * Create initial core modes
   */
  private async createInitialModes(): Promise<void> {
    console.log('📝 Creating initial core modes');
    
    const coreModes = [
      {
        filename: 'chat.md',
        content: this.parser.generateTemplate({
          id: 'chat',
          name: 'Chat',
          description: 'Pure conversational AI assistance without document edits',
          makesEdits: false,
          category: 'conversation'
        })
      },
      {
        filename: 'copy-edit.md',
        content: this.parser.generateTemplate({
          id: 'copy-edit',
          name: 'Copy Edit',
          description: 'Structural and style improvements with Track Edits integration',
          makesEdits: true,
          category: 'editing'
        })
      },
      {
        filename: 'proofread.md',
        content: this.parser.generateTemplate({
          id: 'proofread',
          name: 'Proofread',
          description: 'Grammar and mechanics corrections with minimal changes',
          makesEdits: true,
          category: 'editing'
        })
      },
      {
        filename: 'writing-assistant.md',
        content: this.parser.generateTemplate({
          id: 'writing-assistant',
          name: 'Writing Assistant',
          description: 'Creative collaboration and substantial writing input',
          makesEdits: true,
          category: 'creative'
        })
      }
    ];
    
    for (const mode of coreModes) {
      const filePath = `${this.modesPath}/${mode.filename}`;
      const existingFile = this.vault.getAbstractFileByPath(filePath);
      
      if (!existingFile) {
        try {
          await this.vault.create(filePath, mode.content);
          console.log(`✅ Created core mode: ${mode.filename}`);
        } catch (error) {
          console.error(`❌ Failed to create core mode ${mode.filename}:`, error);
        }
      }
    }
  }

  /**
   * Load core modes
   */
  private async loadCoreModes(): Promise<void> {
    console.log('🎯 Loading core modes');
    // Core modes are loaded as part of the regular mode loading process
    // This method can be used for any special core mode handling
  }

  /**
   * Load custom modes
   */
  private async loadCustomModes(): Promise<void> {
    console.log('🛠️ Loading custom modes');
    // Custom modes are loaded as part of the regular mode loading process
    // This method can be used for any special custom mode handling
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Listen for hot reload events
    globalEventBus.on('mode-file-changed', async (event) => {
      const modeEvent = event.payload as ModeLoadEvent;
      console.log(`🔥 Hot reload event: ${modeEvent.type} for ${modeEvent.modeId}`);
      
      try {
        await this.handleHotReloadEvent(modeEvent);
      } catch (error) {
        console.error(`❌ Error handling hot reload event:`, error);
      }
    });

    // Listen for reload requests
    globalEventBus.on('mode-reload-requested', async (event) => {
      const { modeId, filePath } = event.payload;
      console.log(`🔄 Reload requested for mode: ${modeId}`);
      
      try {
        const file = this.vault.getAbstractFileByPath(filePath) as TFile;
        if (file) {
          await this.loadSingleModeFile(file);
        } else {
          console.error(`❌ File not found for reload: ${filePath}`);
        }
      } catch (error) {
        console.error(`❌ Error reloading mode ${modeId}:`, error);
      }
    });
  }

  /**
   * Handle hot reload events
   */
  private async handleHotReloadEvent(event: ModeLoadEvent): Promise<void> {
    switch (event.type) {
      case 'mode-loaded':
      case 'mode-updated':
        if (event.mode) {
          await this.registry.register(event.mode);
        }
        break;
        
      case 'mode-unloaded':
        await this.registry.unregister(event.modeId);
        break;
        
      case 'mode-error':
        console.error(`❌ Mode error for ${event.modeId}:`, event.error);
        // Store error for debugging
        if (event.error) {
          this.loadErrors.set(event.modeId, [event.error]);
        }
        break;
    }
  }

  /**
   * Get loader status
   */
  getLoaderStatus(): {
    isInitialized: boolean;
    modesPath: string;
    loadedModes: number;
    loadAttempts: Record<string, number>;
    loadErrors: Record<string, ParseError[]>;
    registryStats: ReturnType<WriterModeRegistry['getRegistryStats']>;
    hotReloadStatus: ReturnType<HotReloadWatcher['getWatchStatus']>;
  } {
    const loadAttempts: Record<string, number> = {};
    this.loadAttempts.forEach((attempts, path) => {
      loadAttempts[path] = attempts;
    });
    
    const loadErrors: Record<string, ParseError[]> = {};
    this.loadErrors.forEach((errors, path) => {
      loadErrors[path] = errors;
    });
    
    return {
      isInitialized: this.isInitialized,
      modesPath: this.modesPath,
      loadedModes: this.registry.listModes().length,
      loadAttempts,
      loadErrors,
      registryStats: this.registry.getRegistryStats(),
      hotReloadStatus: this.hotReloadWatcher.getWatchStatus()
    };
  }

  /**
   * Get the mode registry
   */
  getRegistry(): WriterModeRegistry {
    return this.registry;
  }

  /**
   * Get the hot reload watcher
   */
  getHotReloadWatcher(): HotReloadWatcher {
    return this.hotReloadWatcher;
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    console.log('🧹 Cleaning up Mode Loader');
    
    if (this.hotReloadWatcher) {
      this.hotReloadWatcher.stopWatching();
    }
    
    // Clear caches
    this.loadAttempts.clear();
    this.loadErrors.clear();
    
    this.isInitialized = false;
    
    globalEventBus.emit('mode-loader-cleanup', {}, 'writerr-chat');
  }
}