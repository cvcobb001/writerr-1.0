/**
 * @fileoverview Central mode manager integrating with shared event bus
 */

import { Plugin, Vault } from 'obsidian';
import { globalEventBus } from '@writerr/shared';
import {
  ParsedModeFile,
  SessionContext,
  ModeLoadEvent,
  HotReloadConfig
} from './types';
import { ModeLoader } from '../loader/ModeLoader';
import { WriterModeRegistry } from './ModeRegistry';
import { ModeTemplateSystem } from './TemplateSystem';
import { ModeErrorHandler } from './ErrorHandler';

export interface ModeManagerConfig {
  modesPath: string;
  hotReload: Partial<HotReloadConfig>;
  enableTemplates: boolean;
  enableErrorHandling: boolean;
}

export class ModeManager {
  private plugin: Plugin;
  private vault: Vault;
  private config: ModeManagerConfig;
  
  private loader: ModeLoader;
  private registry: WriterModeRegistry;
  private templateSystem: ModeTemplateSystem;
  private errorHandler: ModeErrorHandler;
  
  private activeSessions: Map<string, SessionContext> = new Map();
  private currentMode: ParsedModeFile | null = null;
  private isInitialized = false;

  constructor(plugin: Plugin, config?: Partial<ModeManagerConfig>) {
    this.plugin = plugin;
    this.vault = plugin.app.vault;
    
    // Set default configuration
    this.config = {
      modesPath: 'Modes',
      hotReload: {
        enabled: true,
        debounceDelay: 500,
        watchPatterns: ['*.md'],
        preserveSessions: true,
        maxRetries: 3
      },
      enableTemplates: true,
      enableErrorHandling: true,
      ...config
    };

    this.initializeComponents();
    this.setupEventBusIntegration();
  }

  /**
   * Initialize all components
   */
  private initializeComponents(): void {
    console.log('🏗️ Initializing Mode Manager components');

    // Initialize core components
    this.loader = new ModeLoader(this.vault, this.config.modesPath, this.config.hotReload);
    this.registry = this.loader.getRegistry();
    
    if (this.config.enableTemplates) {
      this.templateSystem = new ModeTemplateSystem(this.vault);
    }
    
    if (this.config.enableErrorHandling) {
      this.errorHandler = new ModeErrorHandler();
    }
  }

  /**
   * Setup event bus integration
   */
  private setupEventBusIntegration(): void {
    console.log('📡 Setting up event bus integration');

    // Mode lifecycle events
    this.setupModeLifecycleEvents();
    
    // Session management events  
    this.setupSessionManagementEvents();
    
    // Mode switching events
    this.setupModeSwitchingEvents();
    
    // Hot reload events
    this.setupHotReloadEvents();
    
    // Template events
    if (this.config.enableTemplates) {
      this.setupTemplateEvents();
    }
    
    // Error handling events
    if (this.config.enableErrorHandling) {
      this.setupErrorHandlingEvents();
    }
  }

  /**
   * Initialize the mode manager
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    console.log('🚀 Initializing Mode Manager');

    try {
      // Initialize mode loader
      await this.loader.initialize();
      
      // Load custom templates if enabled
      if (this.templateSystem) {
        await this.templateSystem.loadCustomTemplates();
      }
      
      // Get list of loaded modes
      const modes = this.registry.listModes();
      console.log(`✅ Mode Manager initialized with ${modes.length} modes`);
      
      // Set default mode if available
      if (modes.length > 0) {
        const chatMode = modes.find(m => m.config.id === 'chat') || modes[0];
        this.currentMode = chatMode;
      }

      this.isInitialized = true;

      // Emit initialization complete event
      globalEventBus.emit('mode-manager-initialized', {
        totalModes: modes.length,
        defaultMode: this.currentMode?.config.id,
        hotReloadEnabled: this.config.hotReload.enabled,
        templatesEnabled: this.config.enableTemplates
      }, 'writerr-chat');

    } catch (error) {
      console.error('❌ Failed to initialize Mode Manager:', error);
      
      globalEventBus.emit('mode-manager-initialization-failed', {
        error: error.message
      }, 'writerr-chat');
      
      throw error;
    }
  }

  /**
   * Switch to a different mode
   */
  async switchMode(modeId: string, sessionId?: string): Promise<ParsedModeFile> {
    console.log(`🔄 Switching to mode: ${modeId}`);

    const newMode = this.registry.getMode(modeId);
    if (!newMode) {
      throw new Error(`Mode not found: ${modeId}`);
    }

    const previousMode = this.currentMode;
    const previousModeId = previousMode?.config.id;

    try {
      // Validate mode is ready for use
      if (!newMode.isValid) {
        throw new Error(`Mode ${modeId} has validation errors and cannot be used`);
      }

      // Update current mode
      this.currentMode = newMode;

      // Update session if provided
      if (sessionId) {
        const session = this.activeSessions.get(sessionId);
        if (session) {
          session.currentModeId = modeId;
          
          // Emit session mode change event
          globalEventBus.emit('chat-session-mode-changed', {
            sessionId,
            previousModeId,
            newModeId: modeId,
            mode: newMode
          }, 'writerr-chat');
        }
      }

      // Emit mode switch event
      globalEventBus.emit('mode-switched', {
        previousModeId,
        newModeId: modeId,
        mode: newMode,
        sessionId,
        timestamp: Date.now()
      }, 'writerr-chat');

      console.log(`✅ Successfully switched to mode: ${newMode.config.name}`);
      return newMode;

    } catch (error) {
      console.error(`❌ Failed to switch to mode ${modeId}:`, error);
      
      globalEventBus.emit('mode-switch-failed', {
        modeId,
        sessionId,
        error: error.message,
        timestamp: Date.now()
      }, 'writerr-chat');
      
      throw error;
    }
  }

  /**
   * Start a new chat session
   */
  async startSession(sessionId: string, modeId?: string): Promise<SessionContext> {
    const targetModeId = modeId || this.currentMode?.config.id || 'chat';
    const mode = this.registry.getMode(targetModeId);
    
    if (!mode) {
      throw new Error(`Cannot start session: Mode ${targetModeId} not found`);
    }

    console.log(`🆕 Starting session ${sessionId} with mode: ${mode.config.name}`);

    const session: SessionContext = {
      sessionId,
      currentModeId: targetModeId,
      history: [],
      metadata: {
        startTime: Date.now(),
        initialModeId: targetModeId
      }
    };

    this.activeSessions.set(sessionId, session);

    // Emit session started event
    globalEventBus.emit('chat-session-started', {
      sessionId,
      modeId: targetModeId,
      mode,
      context: session
    }, 'writerr-chat');

    return session;
  }

  /**
   * End a chat session
   */
  async endSession(sessionId: string): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      console.warn(`⚠️ Attempted to end non-existent session: ${sessionId}`);
      return;
    }

    console.log(`🔚 Ending session: ${sessionId}`);

    // Calculate session statistics
    const duration = Date.now() - (session.metadata.startTime || 0);
    const messageCount = session.history.length;

    this.activeSessions.delete(sessionId);

    // Emit session ended event
    globalEventBus.emit('chat-session-ended', {
      sessionId,
      duration,
      messageCount,
      finalModeId: session.currentModeId
    }, 'writerr-chat');
  }

  /**
   * Get available modes
   */
  getAvailableModes(): ParsedModeFile[] {
    return this.registry.listModes().filter(mode => mode.isValid);
  }

  /**
   * Get modes by category
   */
  getModesByCategory(category: string): ParsedModeFile[] {
    return this.getAvailableModes().filter(mode => 
      mode.config.tags?.includes(category)
    );
  }

  /**
   * Get current mode
   */
  getCurrentMode(): ParsedModeFile | null {
    return this.currentMode;
  }

  /**
   * Get active sessions
   */
  getActiveSessions(): SessionContext[] {
    return Array.from(this.activeSessions.values());
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: string): SessionContext | null {
    return this.activeSessions.get(sessionId) || null;
  }

  /**
   * Setup mode lifecycle event handlers
   */
  private setupModeLifecycleEvents(): void {
    globalEventBus.on('mode-loaded', (event) => {
      const modeEvent = event.payload as ModeLoadEvent;
      console.log(`📥 Mode loaded: ${modeEvent.modeId}`);
    });

    globalEventBus.on('mode-unloaded', (event) => {
      const modeEvent = event.payload as ModeLoadEvent;
      console.log(`📤 Mode unloaded: ${modeEvent.modeId}`);
      
      // Handle current mode unloading
      if (this.currentMode?.config.id === modeEvent.modeId) {
        this.handleCurrentModeUnloaded();
      }
    });

    globalEventBus.on('mode-updated', (event) => {
      const modeEvent = event.payload as ModeLoadEvent;
      console.log(`🔄 Mode updated: ${modeEvent.modeId}`);
      
      // Update current mode if it's the updated one
      if (this.currentMode?.config.id === modeEvent.modeId && modeEvent.mode) {
        this.currentMode = modeEvent.mode;
      }
    });
  }

  /**
   * Setup session management event handlers
   */
  private setupSessionManagementEvents(): void {
    // External session start requests
    globalEventBus.on('chat-session-start-requested', async (event) => {
      const { sessionId, modeId } = event.payload;
      try {
        await this.startSession(sessionId, modeId);
      } catch (error) {
        console.error(`❌ Failed to start session ${sessionId}:`, error);
        
        globalEventBus.emit('chat-session-start-failed', {
          sessionId,
          modeId,
          error: error.message
        }, 'writerr-chat');
      }
    });

    // External session end requests
    globalEventBus.on('chat-session-end-requested', async (event) => {
      const { sessionId } = event.payload;
      try {
        await this.endSession(sessionId);
      } catch (error) {
        console.error(`❌ Failed to end session ${sessionId}:`, error);
      }
    });
  }

  /**
   * Setup mode switching event handlers
   */
  private setupModeSwitchingEvents(): void {
    // External mode switch requests
    globalEventBus.on('mode-switch-requested', async (event) => {
      const { modeId, sessionId } = event.payload;
      try {
        await this.switchMode(modeId, sessionId);
      } catch (error) {
        console.error(`❌ Mode switch request failed:`, error);
      }
    });

    // Mode availability requests
    globalEventBus.on('modes-list-requested', (event) => {
      const modes = this.getAvailableModes();
      
      globalEventBus.emit('modes-list-response', {
        modes: modes.map(mode => ({
          id: mode.config.id,
          name: mode.config.name,
          description: mode.config.description,
          tags: mode.config.tags || [],
          icon: mode.config.icon,
          color: mode.config.color,
          makesEdits: mode.config.makesEdits
        })),
        currentModeId: this.currentMode?.config.id,
        requestId: event.payload.requestId
      }, 'writerr-chat');
    });
  }

  /**
   * Setup hot reload event handlers
   */
  private setupHotReloadEvents(): void {
    globalEventBus.on('hot-reload-requested', async (event) => {
      const { modeId } = event.payload;
      try {
        await this.registry.reloadMode(modeId);
      } catch (error) {
        console.error(`❌ Hot reload failed for ${modeId}:`, error);
      }
    });
  }

  /**
   * Setup template event handlers
   */
  private setupTemplateEvents(): void {
    if (!this.templateSystem) return;

    globalEventBus.on('mode-template-requested', (event) => {
      const { templateId } = event.payload;
      const template = this.templateSystem.getTemplate(templateId);
      
      globalEventBus.emit('mode-template-response', {
        template,
        requestId: event.payload.requestId
      }, 'writerr-chat');
    });

    globalEventBus.on('mode-template-list-requested', (event) => {
      const templates = this.templateSystem.getTemplates();
      
      globalEventBus.emit('mode-template-list-response', {
        templates,
        requestId: event.payload.requestId
      }, 'writerr-chat');
    });

    globalEventBus.on('mode-generate-from-template', async (event) => {
      const { templateId, variables, outputPath } = event.payload;
      try {
        const result = await this.templateSystem.generateModeFromTemplate(
          templateId,
          variables,
          outputPath
        );
        
        globalEventBus.emit('mode-template-generated', {
          templateId,
          result,
          requestId: event.payload.requestId
        }, 'writerr-chat');
        
      } catch (error) {
        globalEventBus.emit('mode-template-generation-failed', {
          templateId,
          error: error.message,
          requestId: event.payload.requestId
        }, 'writerr-chat');
      }
    });
  }

  /**
   * Setup error handling event handlers
   */
  private setupErrorHandlingEvents(): void {
    if (!this.errorHandler) return;

    globalEventBus.on('mode-help-requested', (event) => {
      const { errorType } = event.payload;
      this.errorHandler.showContextualHelp(errorType);
    });

    globalEventBus.on('mode-error-statistics-requested', (event) => {
      const stats = this.errorHandler.getErrorStatistics();
      
      globalEventBus.emit('mode-error-statistics-response', {
        stats,
        requestId: event.payload.requestId
      }, 'writerr-chat');
    });
  }

  /**
   * Handle current mode being unloaded
   */
  private handleCurrentModeUnloaded(): void {
    console.log('🔄 Current mode was unloaded, switching to fallback');
    
    // Find a fallback mode
    const availableModes = this.getAvailableModes();
    const fallbackMode = availableModes.find(m => m.config.id === 'chat') || availableModes[0];
    
    if (fallbackMode) {
      this.currentMode = fallbackMode;
      
      globalEventBus.emit('mode-fallback-activated', {
        fallbackModeId: fallbackMode.config.id,
        reason: 'current-mode-unloaded'
      }, 'writerr-chat');
    } else {
      this.currentMode = null;
      console.warn('⚠️ No fallback modes available');
    }
  }

  /**
   * Get manager status
   */
  getStatus(): {
    isInitialized: boolean;
    currentMode: string | null;
    totalModes: number;
    activeSessions: number;
    hotReloadEnabled: boolean;
    templatesEnabled: boolean;
    errorHandlingEnabled: boolean;
    loaderStatus: ReturnType<ModeLoader['getLoaderStatus']>;
  } {
    return {
      isInitialized: this.isInitialized,
      currentMode: this.currentMode?.config.id || null,
      totalModes: this.registry.listModes().length,
      activeSessions: this.activeSessions.size,
      hotReloadEnabled: this.config.hotReload.enabled || false,
      templatesEnabled: this.config.enableTemplates,
      errorHandlingEnabled: this.config.enableErrorHandling,
      loaderStatus: this.loader.getLoaderStatus()
    };
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    console.log('🧹 Cleaning up Mode Manager');

    // End all active sessions
    const sessionIds = Array.from(this.activeSessions.keys());
    for (const sessionId of sessionIds) {
      await this.endSession(sessionId);
    }

    // Cleanup loader
    await this.loader.cleanup();

    this.activeSessions.clear();
    this.currentMode = null;
    this.isInitialized = false;

    globalEventBus.emit('mode-manager-cleanup-complete', {}, 'writerr-chat');
  }
}