/**
 * @fileoverview Mode registry with lifecycle management
 */

import { globalEventBus } from '@writerr/shared';
import {
  ModeRegistry,
  ParsedModeFile,
  ValidationResult,
  ParseError,
  ModeLoadEvent,
  SessionContext
} from './types';

export class WriterModeRegistry implements ModeRegistry {
  private modes: Map<string, ParsedModeFile> = new Map();
  private modesByTag: Map<string, Set<string>> = new Map();
  private loadOrder: string[] = [];
  private dependencies: Map<string, Set<string>> = new Map();
  private activeSessions: Map<string, SessionContext> = new Map();
  private modeUsageStats: Map<string, { loadCount: number; errorCount: number; lastUsed: number }> = new Map();

  constructor() {
    this.setupEventListeners();
  }

  /**
   * Register a new mode
   */
  async register(mode: ParsedModeFile): Promise<void> {
    const modeId = mode.config.id;
    
    console.log(`📝 Registering mode: ${modeId}`);
    
    try {
      // Validate dependencies
      const validationResult = await this.validateDependencies(mode);
      if (!validationResult.isValid) {
        throw new Error(`Mode validation failed: ${validationResult.errors.map(e => e.message).join(', ')}`);
      }

      // Check for conflicts with existing modes
      const existingMode = this.modes.get(modeId);
      if (existingMode) {
        console.log(`🔄 Updating existing mode: ${modeId}`);
        await this.handleModeUpdate(existingMode, mode);
      } else {
        await this.handleModeRegistration(mode);
      }

      // Update registry
      this.modes.set(modeId, mode);
      this.updateTagIndex(mode);
      this.updateLoadOrder(modeId);
      this.updateUsageStats(modeId, 'load');

      // Emit registration event
      const event: ModeLoadEvent = {
        type: existingMode ? 'mode-updated' : 'mode-loaded',
        modeId,
        mode,
        timestamp: Date.now()
      };

      globalEventBus.emit('mode-registered', event, 'writerr-chat');
      
      console.log(`✅ Successfully registered mode: ${modeId}`);
      
    } catch (error) {
      console.error(`❌ Failed to register mode ${modeId}:`, error);
      this.updateUsageStats(modeId, 'error');
      
      const errorEvent: ModeLoadEvent = {
        type: 'mode-error',
        modeId,
        error: {
          type: 'validation',
          message: `Registration failed: ${error.message}`,
          severity: 'error'
        },
        timestamp: Date.now()
      };

      globalEventBus.emit('mode-error', errorEvent, 'writerr-chat');
      throw error;
    }
  }

  /**
   * Unregister a mode
   */
  async unregister(modeId: string): Promise<void> {
    console.log(`🗑️ Unregistering mode: ${modeId}`);
    
    const mode = this.modes.get(modeId);
    if (!mode) {
      console.warn(`Mode not found for unregistration: ${modeId}`);
      return;
    }

    try {
      // Check if mode is in use by active sessions
      const activeSessions = Array.from(this.activeSessions.values())
        .filter(session => session.currentModeId === modeId);
      
      if (activeSessions.length > 0) {
        console.log(`⚠️ Mode ${modeId} is in use by ${activeSessions.length} active sessions`);
        // Handle graceful migration or session preservation
        await this.handleActiveSessionMigration(modeId, activeSessions);
      }

      // Remove from registry
      this.modes.delete(modeId);
      this.removeFromTagIndex(mode);
      this.removeFromLoadOrder(modeId);
      this.dependencies.delete(modeId);
      
      // Remove from dependent modes
      this.dependencies.forEach((deps, depModeId) => {
        deps.delete(modeId);
      });

      // Emit unregistration event
      const event: ModeLoadEvent = {
        type: 'mode-unloaded',
        modeId,
        timestamp: Date.now()
      };

      globalEventBus.emit('mode-unregistered', event, 'writerr-chat');
      
      console.log(`✅ Successfully unregistered mode: ${modeId}`);
      
    } catch (error) {
      console.error(`❌ Failed to unregister mode ${modeId}:`, error);
      throw error;
    }
  }

  /**
   * Get a mode by ID
   */
  getMode(modeId: string): ParsedModeFile | null {
    const mode = this.modes.get(modeId);
    if (mode) {
      this.updateUsageStats(modeId, 'access');
    }
    return mode || null;
  }

  /**
   * List all registered modes
   */
  listModes(): ParsedModeFile[] {
    return Array.from(this.modes.values());
  }

  /**
   * Get modes by tag
   */
  getModesByTag(tag: string): ParsedModeFile[] {
    const modeIds = this.modesByTag.get(tag);
    if (!modeIds) {
      return [];
    }
    
    return Array.from(modeIds)
      .map(id => this.modes.get(id))
      .filter((mode): mode is ParsedModeFile => mode !== undefined);
  }

  /**
   * Reload a mode from file
   */
  async reloadMode(modeId: string): Promise<void> {
    console.log(`🔄 Reloading mode: ${modeId}`);
    
    const existingMode = this.modes.get(modeId);
    if (!existingMode) {
      throw new Error(`Mode not found for reload: ${modeId}`);
    }

    // Emit reload event - the actual file reading and parsing
    // would be handled by the mode loader
    globalEventBus.emit('mode-reload-requested', {
      modeId,
      filePath: existingMode.filePath
    }, 'writerr-chat');
  }

  /**
   * Validate mode dependencies
   */
  async validateDependencies(mode: ParsedModeFile): Promise<ValidationResult> {
    const errors: ParseError[] = [];
    const warnings: ParseError[] = [];

    // Check for circular dependencies
    const deps = this.extractDependencies(mode);
    if (this.hasCircularDependency(mode.config.id, deps)) {
      errors.push({
        type: 'validation',
        message: 'Circular dependency detected',
        severity: 'error',
        suggestion: 'Remove circular references between modes'
      });
    }

    // Validate required mode features
    if (mode.config.makesEdits && !mode.config.trackEdits) {
      warnings.push({
        type: 'validation',
        message: 'Mode makes edits but Track Edits integration is not configured',
        severity: 'warning',
        suggestion: 'Add trackEdits configuration for edit modes'
      });
    }

    // Validate prompt templates
    const promptValidation = await this.validatePromptTemplates(mode);
    errors.push(...promptValidation.errors);
    warnings.push(...promptValidation.warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Get registry statistics
   */
  getRegistryStats(): {
    totalModes: number;
    modesByTag: Record<string, number>;
    loadOrder: string[];
    usageStats: Record<string, { loadCount: number; errorCount: number; lastUsed: number }>;
    activeSessions: number;
  } {
    const modesByTag: Record<string, number> = {};
    this.modesByTag.forEach((modeIds, tag) => {
      modesByTag[tag] = modeIds.size;
    });

    const usageStats: Record<string, { loadCount: number; errorCount: number; lastUsed: number }> = {};
    this.modeUsageStats.forEach((stats, modeId) => {
      usageStats[modeId] = { ...stats };
    });

    return {
      totalModes: this.modes.size,
      modesByTag,
      loadOrder: [...this.loadOrder],
      usageStats,
      activeSessions: this.activeSessions.size
    };
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Listen for session lifecycle events
    globalEventBus.on('chat-session-started', (event) => {
      const { sessionId, modeId, context } = event.payload;
      this.activeSessions.set(sessionId, {
        sessionId,
        currentModeId: modeId,
        history: [],
        metadata: {},
        documentContext: context
      });
    });

    globalEventBus.on('chat-session-ended', (event) => {
      const { sessionId } = event.payload;
      this.activeSessions.delete(sessionId);
    });

    globalEventBus.on('chat-mode-switched', (event) => {
      const { sessionId, newModeId } = event.payload;
      const session = this.activeSessions.get(sessionId);
      if (session) {
        session.currentModeId = newModeId;
        this.updateUsageStats(newModeId, 'access');
      }
    });
  }

  /**
   * Handle mode registration
   */
  private async handleModeRegistration(mode: ParsedModeFile): Promise<void> {
    // Initialize mode-specific resources
    console.log(`🚀 Initializing mode: ${mode.config.id}`);
    
    // Cache prompt templates if caching is enabled
    if (mode.config.performance?.cacheResponses) {
      console.log(`💾 Enabling response caching for mode: ${mode.config.id}`);
    }

    // Preload if configured
    if (mode.config.performance?.preload) {
      console.log(`⚡ Preloading mode: ${mode.config.id}`);
      // In a full implementation, this would warm up any necessary resources
    }
  }

  /**
   * Handle mode update
   */
  private async handleModeUpdate(oldMode: ParsedModeFile, newMode: ParsedModeFile): Promise<void> {
    console.log(`🔄 Updating mode: ${newMode.config.id}`);
    
    // Check for breaking changes
    if (oldMode.config.version !== newMode.config.version) {
      console.log(`📦 Version change detected: ${oldMode.config.version} → ${newMode.config.version}`);
    }

    // Handle active sessions using this mode
    const affectedSessions = Array.from(this.activeSessions.values())
      .filter(session => session.currentModeId === newMode.config.id);
    
    if (affectedSessions.length > 0) {
      console.log(`🔄 Updating ${affectedSessions.length} active sessions`);
      // In a full implementation, this would handle graceful mode updates
      // without disrupting active conversations
    }
  }

  /**
   * Handle active session migration when a mode is unregistered
   */
  private async handleActiveSessionMigration(modeId: string, sessions: SessionContext[]): Promise<void> {
    console.log(`🚚 Migrating ${sessions.length} active sessions from mode: ${modeId}`);
    
    // Find a suitable fallback mode
    const fallbackMode = this.findFallbackMode(modeId);
    
    if (fallbackMode) {
      console.log(`📍 Migrating sessions to fallback mode: ${fallbackMode.config.id}`);
      
      for (const session of sessions) {
        session.currentModeId = fallbackMode.config.id;
        
        // Emit migration event
        globalEventBus.emit('chat-mode-migrated', {
          sessionId: session.sessionId,
          fromModeId: modeId,
          toModeId: fallbackMode.config.id,
          reason: 'mode-unregistered'
        }, 'writerr-chat');
      }
    } else {
      console.warn(`⚠️ No suitable fallback mode found for ${modeId}, ending sessions`);
      
      // End sessions that cannot be migrated
      for (const session of sessions) {
        globalEventBus.emit('chat-session-ended', {
          sessionId: session.sessionId,
          reason: 'mode-unavailable'
        }, 'writerr-chat');
      }
    }
  }

  /**
   * Find a suitable fallback mode
   */
  private findFallbackMode(modeId: string): ParsedModeFile | null {
    const originalMode = this.modes.get(modeId);
    if (!originalMode) return null;

    // Try to find a mode with similar characteristics
    const candidates = Array.from(this.modes.values()).filter(mode => 
      mode.config.id !== modeId &&
      mode.config.makesEdits === originalMode.config.makesEdits
    );

    // Prefer modes with similar tags
    const similarTags = candidates.filter(mode => {
      const originalTags = new Set(originalMode.config.tags || []);
      const candidateTags = mode.config.tags || [];
      return candidateTags.some(tag => originalTags.has(tag));
    });

    if (similarTags.length > 0) {
      return similarTags[0];
    }

    // Fall back to any compatible mode
    return candidates[0] || null;
  }

  /**
   * Update tag index
   */
  private updateTagIndex(mode: ParsedModeFile): void {
    const tags = mode.config.tags || [];
    
    tags.forEach(tag => {
      if (!this.modesByTag.has(tag)) {
        this.modesByTag.set(tag, new Set());
      }
      this.modesByTag.get(tag)!.add(mode.config.id);
    });
  }

  /**
   * Remove from tag index
   */
  private removeFromTagIndex(mode: ParsedModeFile): void {
    const tags = mode.config.tags || [];
    
    tags.forEach(tag => {
      const tagModes = this.modesByTag.get(tag);
      if (tagModes) {
        tagModes.delete(mode.config.id);
        if (tagModes.size === 0) {
          this.modesByTag.delete(tag);
        }
      }
    });
  }

  /**
   * Update load order
   */
  private updateLoadOrder(modeId: string): void {
    const index = this.loadOrder.indexOf(modeId);
    if (index === -1) {
      this.loadOrder.push(modeId);
    }
  }

  /**
   * Remove from load order
   */
  private removeFromLoadOrder(modeId: string): void {
    const index = this.loadOrder.indexOf(modeId);
    if (index !== -1) {
      this.loadOrder.splice(index, 1);
    }
  }

  /**
   * Update usage statistics
   */
  private updateUsageStats(modeId: string, eventType: 'load' | 'error' | 'access'): void {
    let stats = this.modeUsageStats.get(modeId);
    if (!stats) {
      stats = { loadCount: 0, errorCount: 0, lastUsed: 0 };
      this.modeUsageStats.set(modeId, stats);
    }

    switch (eventType) {
      case 'load':
        stats.loadCount++;
        stats.lastUsed = Date.now();
        break;
      case 'error':
        stats.errorCount++;
        break;
      case 'access':
        stats.lastUsed = Date.now();
        break;
    }
  }

  /**
   * Extract dependencies from a mode
   */
  private extractDependencies(mode: ParsedModeFile): string[] {
    // This would extract dependencies from mode configuration
    // For now, return empty array
    return [];
  }

  /**
   * Check for circular dependencies
   */
  private hasCircularDependency(modeId: string, deps: string[]): boolean {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycle = (id: string): boolean => {
      if (recursionStack.has(id)) return true;
      if (visited.has(id)) return false;

      visited.add(id);
      recursionStack.add(id);

      const modeDeps = this.dependencies.get(id) || new Set();
      for (const dep of modeDeps) {
        if (hasCycle(dep)) return true;
      }

      recursionStack.delete(id);
      return false;
    };

    return hasCycle(modeId);
  }

  /**
   * Validate prompt templates
   */
  private async validatePromptTemplates(mode: ParsedModeFile): Promise<ValidationResult> {
    const errors: ParseError[] = [];
    const warnings: ParseError[] = [];

    const { systemPrompt, userPromptTemplate } = mode.config.promptConfig;

    // Check for empty prompts
    if (!systemPrompt?.trim()) {
      errors.push({
        type: 'validation',
        message: 'System prompt is empty',
        severity: 'error',
        suggestion: 'Add a system prompt to guide the AI behavior'
      });
    }

    if (!userPromptTemplate?.trim()) {
      errors.push({
        type: 'validation',
        message: 'User prompt template is empty',
        severity: 'error',
        suggestion: 'Add a user prompt template with {{userInput}} placeholder'
      });
    }

    // Check for required placeholders in templates
    if (userPromptTemplate && !userPromptTemplate.includes('{{userInput}}')) {
      warnings.push({
        type: 'validation',
        message: 'User prompt template should include {{userInput}} placeholder',
        severity: 'warning',
        suggestion: 'Add {{userInput}} to your template to include user messages'
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}