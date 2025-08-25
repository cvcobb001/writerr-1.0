/**
 * Track Edits Integration for Writerr Chat Plugin
 * 
 * This module handles seamless integration with the Track Edits plugin,
 * routing all edit suggestions through the Track Edits change system.
 */

import { EditSuggestion, TextSelection, DocumentContext } from '../interface/types';
import { globalEventBus, globalRegistry } from '@writerr/shared';

export interface TrackEditsAPI {
  applyEdit(suggestion: EditSuggestion): Promise<boolean>;
  previewEdit(suggestion: EditSuggestion): Promise<void>;
  batchApplyEdits(suggestions: EditSuggestion[]): Promise<boolean[]>;
  isAvailable(): boolean;
  getVersion(): string;
}

export interface TrackEditsIntegrationConfig {
  autoApplyEdits: boolean;
  confirmBeforeApply: boolean;
  batchSize: number;
  enablePreview: boolean;
  fallbackStrategy: 'manual' | 'direct' | 'reject';
}

export class TrackEditsIntegration {
  private config: TrackEditsIntegrationConfig;
  private trackEditsAPI: TrackEditsAPI | null = null;
  private isInitialized = false;

  constructor(config: Partial<TrackEditsIntegrationConfig> = {}) {
    this.config = {
      autoApplyEdits: false,
      confirmBeforeApply: true,
      batchSize: 10,
      enablePreview: true,
      fallbackStrategy: 'manual',
      ...config
    };
  }

  /**
   * Initialize the Track Edits integration
   */
  async initialize(): Promise<boolean> {
    try {
      // Check if Track Edits plugin is available
      if (!this.isTrackEditsAvailable()) {
        console.warn('Track Edits plugin not available');
        return false;
      }

      // Get Track Edits API from global registry
      this.trackEditsAPI = this.getTrackEditsAPI();
      
      if (!this.trackEditsAPI) {
        console.error('Failed to initialize Track Edits API');
        return false;
      }

      // Set up event listeners for Track Edits
      this.setupEventListeners();
      
      this.isInitialized = true;
      
      globalEventBus.emit('track-edits-integration-ready', {
        version: this.trackEditsAPI.getVersion(),
        config: this.config
      });

      return true;
    } catch (error) {
      console.error('Error initializing Track Edits integration:', error);
      return false;
    }
  }

  /**
   * Apply a single edit suggestion through Track Edits
   */
  async applyEdit(suggestion: EditSuggestion, documentContext?: DocumentContext): Promise<boolean> {
    if (!this.isInitialized || !this.trackEditsAPI) {
      return this.handleFallback([suggestion], documentContext);
    }

    try {
      // Emit pre-apply event
      globalEventBus.emit('edit-suggestion-pre-apply', {
        suggestion,
        documentContext,
        source: 'writerr-chat'
      });

      // Apply edit through Track Edits
      const success = await this.trackEditsAPI.applyEdit(suggestion);

      // Emit post-apply event
      globalEventBus.emit('edit-suggestion-applied', {
        suggestion,
        success,
        source: 'writerr-chat',
        timestamp: new Date().toISOString()
      });

      return success;
    } catch (error) {
      console.error('Error applying edit through Track Edits:', error);
      
      globalEventBus.emit('edit-suggestion-error', {
        suggestion,
        error: error instanceof Error ? error.message : 'Unknown error',
        source: 'writerr-chat'
      });

      return this.handleFallback([suggestion], documentContext);
    }
  }

  /**
   * Preview an edit suggestion without applying it
   */
  async previewEdit(suggestion: EditSuggestion): Promise<void> {
    if (!this.isInitialized || !this.trackEditsAPI || !this.config.enablePreview) {
      return;
    }

    try {
      await this.trackEditsAPI.previewEdit(suggestion);
      
      globalEventBus.emit('edit-suggestion-previewed', {
        suggestion,
        source: 'writerr-chat'
      });
    } catch (error) {
      console.error('Error previewing edit:', error);
    }
  }

  /**
   * Apply multiple edit suggestions in batches
   */
  async batchApplyEdits(
    suggestions: EditSuggestion[], 
    documentContext?: DocumentContext
  ): Promise<boolean[]> {
    if (!this.isInitialized || !this.trackEditsAPI) {
      return this.handleFallback(suggestions, documentContext);
    }

    const results: boolean[] = [];
    const batchSize = this.config.batchSize;

    try {
      // Process suggestions in batches to avoid overwhelming the system
      for (let i = 0; i < suggestions.length; i += batchSize) {
        const batch = suggestions.slice(i, i + batchSize);
        
        globalEventBus.emit('edit-batch-processing', {
          batchIndex: Math.floor(i / batchSize) + 1,
          totalBatches: Math.ceil(suggestions.length / batchSize),
          batchSize: batch.length,
          source: 'writerr-chat'
        });

        const batchResults = await this.trackEditsAPI.batchApplyEdits(batch);
        results.push(...batchResults);

        // Brief pause between batches to maintain responsiveness
        if (i + batchSize < suggestions.length) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }

      globalEventBus.emit('edit-batch-completed', {
        totalSuggestions: suggestions.length,
        successCount: results.filter(r => r).length,
        failureCount: results.filter(r => !r).length,
        source: 'writerr-chat'
      });

      return results;
    } catch (error) {
      console.error('Error batch applying edits:', error);
      return this.handleFallback(suggestions, documentContext);
    }
  }

  /**
   * Check if Track Edits plugin is available and compatible
   */
  isTrackEditsAvailable(): boolean {
    const trackEditsInfo = globalRegistry.getPlugin('track-edits');
    return trackEditsInfo !== null && trackEditsInfo.capabilities.includes('edit-management');
  }

  /**
   * Get the current integration status
   */
  getIntegrationStatus(): {
    isAvailable: boolean;
    isInitialized: boolean;
    version: string | null;
    config: TrackEditsIntegrationConfig;
  } {
    return {
      isAvailable: this.isTrackEditsAvailable(),
      isInitialized: this.isInitialized,
      version: this.trackEditsAPI?.getVersion() || null,
      config: this.config
    };
  }

  /**
   * Update integration configuration
   */
  updateConfig(newConfig: Partial<TrackEditsIntegrationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    globalEventBus.emit('track-edits-config-updated', {
      config: this.config,
      source: 'writerr-chat'
    });
  }

  /**
   * Clean up integration resources
   */
  dispose(): void {
    this.isInitialized = false;
    this.trackEditsAPI = null;
    
    // Remove event listeners
    globalEventBus.off('track-edits-plugin-unloaded');
    globalEventBus.off('track-edits-error');
    
    globalEventBus.emit('track-edits-integration-disposed', {
      source: 'writerr-chat'
    });
  }

  /**
   * Get Track Edits API from the global registry
   */
  private getTrackEditsAPI(): TrackEditsAPI | null {
    try {
      // Access Track Edits through window global API
      const trackEditsGlobal = (window as any).TrackEdits;
      
      if (!trackEditsGlobal) {
        console.warn('Track Edits global API not found');
        return null;
      }

      return {
        applyEdit: async (suggestion: EditSuggestion) => {
          return await trackEditsGlobal.applyEdit(suggestion);
        },
        
        previewEdit: async (suggestion: EditSuggestion) => {
          await trackEditsGlobal.previewEdit(suggestion);
        },
        
        batchApplyEdits: async (suggestions: EditSuggestion[]) => {
          return await trackEditsGlobal.batchApplyEdits(suggestions);
        },
        
        isAvailable: () => {
          return trackEditsGlobal.isAvailable();
        },
        
        getVersion: () => {
          return trackEditsGlobal.getVersion() || '1.0.0';
        }
      };
    } catch (error) {
      console.error('Error accessing Track Edits API:', error);
      return null;
    }
  }

  /**
   * Set up event listeners for Track Edits integration
   */
  private setupEventListeners(): void {
    // Listen for Track Edits plugin being unloaded
    globalEventBus.on('track-edits-plugin-unloaded', () => {
      console.warn('Track Edits plugin unloaded, integration disabled');
      this.isInitialized = false;
      this.trackEditsAPI = null;
    });

    // Listen for Track Edits errors
    globalEventBus.on('track-edits-error', (event: any) => {
      console.error('Track Edits error:', event);
      
      globalEventBus.emit('track-edits-integration-error', {
        originalError: event,
        source: 'writerr-chat'
      });
    });
  }

  /**
   * Handle fallback strategies when Track Edits is unavailable
   */
  private async handleFallback(
    suggestions: EditSuggestion[], 
    documentContext?: DocumentContext
  ): Promise<boolean[] | boolean> {
    const isSingle = suggestions.length === 1;
    
    switch (this.config.fallbackStrategy) {
      case 'manual':
        // Emit event for manual handling
        globalEventBus.emit('edit-suggestions-manual-fallback', {
          suggestions,
          documentContext,
          source: 'writerr-chat'
        });
        
        // Return false/empty array to indicate no automatic processing
        return isSingle ? false : new Array(suggestions.length).fill(false);

      case 'direct':
        // Attempt direct document manipulation as fallback
        return this.directApplyFallback(suggestions, documentContext);

      case 'reject':
      default:
        console.warn('Edit suggestions rejected - Track Edits unavailable');
        
        globalEventBus.emit('edit-suggestions-rejected', {
          suggestions,
          reason: 'Track Edits unavailable',
          source: 'writerr-chat'
        });
        
        return isSingle ? false : new Array(suggestions.length).fill(false);
    }
  }

  /**
   * Direct application fallback (basic implementation)
   */
  private async directApplyFallback(
    suggestions: EditSuggestion[], 
    documentContext?: DocumentContext
  ): Promise<boolean[] | boolean> {
    console.warn('Using direct application fallback - limited functionality');
    
    globalEventBus.emit('edit-suggestions-direct-fallback', {
      suggestions,
      documentContext,
      source: 'writerr-chat'
    });

    // For now, just return false - direct manipulation would require
    // specific Obsidian editor API integration
    const results = new Array(suggestions.length).fill(false);
    return suggestions.length === 1 ? results[0] : results;
  }
}

// Export singleton instance for use across the application
export const trackEditsIntegration = new TrackEditsIntegration();