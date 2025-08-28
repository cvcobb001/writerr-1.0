/**
 * TokenLimitService - Real-time model capacity data from configurable API
 * Provides accurate token limits without hardcoded fallbacks
 */

import { TokenCountSettings } from './settings';

export interface ModelInfo {
  id: string;
  name: string;
  contextLength: number;
  pricing?: {
    prompt: number;
    completion: number;
  };
}

export class TokenLimitService {
  private cache: Map<string, ModelInfo> = new Map();
  private cacheExpiry: number = 0;
  private settings: TokenCountSettings;

  constructor(settings: TokenCountSettings) {
    this.settings = settings;
  }

  /**
   * Initialize service - fetch model data if needed
   */
  async initialize(): Promise<void> {
    if (this.settings.enableDebugLogs) {
      console.log('🔍 Initializing TokenLimitService...');
    }
    
    // Try to load from localStorage first
    this.loadFromCache();
    
    // Only fetch from external API if enabled
    if (this.settings.enableExternalAPIs && !this.isDataFresh()) {
      try {
        await this.fetchModelLimits();
        if (this.settings.enableDebugLogs) {
          console.log('✅ Model data refreshed from external API');
        }
      } catch (error) {
        if (this.settings.enableDebugLogs) {
          console.warn('⚠️ Failed to fetch fresh model data, using cache:', error);
        }
      }
    } else if (this.settings.enableDebugLogs) {
      console.log('✅ Using cached model data or external APIs disabled');
    }
  }

  /**
   * Fetch fresh model data from configured API
   */
  async fetchModelLimits(): Promise<void> {
    if (!this.settings.enableExternalAPIs) {
      throw new Error('External API calls are disabled in settings');
    }

    try {
      if (this.settings.enableDebugLogs) {
        console.log('📡 Fetching model limits from:', this.settings.apiEndpoint);
      }
      
      const response = await fetch(this.settings.apiEndpoint);
      if (!response.ok) {
        throw new Error(`API failed: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.data || !Array.isArray(data.data)) {
        throw new Error('Invalid response format from OpenRouter');
      }

      // Process and cache models
      let processedCount = 0;
      for (const model of data.data) {
        if (model.context_length && model.id) {
          const modelInfo: ModelInfo = {
            id: model.id,
            name: model.name || model.id,
            contextLength: model.context_length,
            pricing: model.pricing ? {
              prompt: model.pricing.prompt,
              completion: model.pricing.completion
            } : undefined
          };

          // Store with multiple keys for easier lookup
          this.cache.set(model.id, modelInfo);
          this.cache.set(this.normalizeModelName(model.id), modelInfo);
          this.cache.set(this.normalizeModelName(model.name || model.id), modelInfo);
          
          processedCount++;
        }
      }

      // Update cache timestamp with configurable duration
      const cacheDuration = this.settings.cacheExpiration * 60 * 60 * 1000; // Convert hours to milliseconds
      this.cacheExpiry = Date.now() + cacheDuration;
      
      // Persist to localStorage
      this.saveToCache();
      
      if (this.settings.enableDebugLogs) {
        console.log(`✅ Processed ${processedCount} models from API`);
      }
      
    } catch (error) {
      console.error('❌ Failed to fetch model limits:', error);
      throw error;
    }
  }

  /**
   * Get token limit for a specific model
   */
  getTokenLimit(modelName: string): number | null {
    if (!modelName) return null;

    // Try exact match first
    const exact = this.cache.get(modelName);
    if (exact) return exact.contextLength;

    // Try normalized match
    const normalized = this.cache.get(this.normalizeModelName(modelName));
    if (normalized) return normalized.contextLength;

    // Try fuzzy matching for common patterns
    const fuzzyMatch = this.fuzzyMatch(modelName);
    if (fuzzyMatch) return fuzzyMatch.contextLength;

    return null;
  }

  /**
   * Get full model info including pricing
   */
  getModelInfo(modelName: string): ModelInfo | null {
    if (!modelName) return null;

    // Try exact match first
    const exact = this.cache.get(modelName);
    if (exact) return exact;

    // Try normalized match
    const normalized = this.cache.get(this.normalizeModelName(modelName));
    if (normalized) return normalized;

    // Try fuzzy matching
    return this.fuzzyMatch(modelName);
  }

  /**
   * Get all available models
   */
  getSupportedModels(): ModelInfo[] {
    const uniqueModels = new Map<string, ModelInfo>();
    
    // Deduplicate by ID
    for (const model of this.cache.values()) {
      uniqueModels.set(model.id, model);
    }
    
    return Array.from(uniqueModels.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Normalize model name for better matching
   */
  private normalizeModelName(modelName: string): string {
    return modelName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')  // Replace non-alphanumeric with dashes
      .replace(/-+/g, '-')         // Collapse multiple dashes
      .replace(/^-|-$/g, '');      // Remove leading/trailing dashes
  }

  /**
   * Fuzzy matching for common model name variations
   */
  private fuzzyMatch(modelName: string): ModelInfo | null {
    const normalized = this.normalizeModelName(modelName);
    
    // Check for partial matches
    for (const [key, model] of this.cache.entries()) {
      const keyNormalized = this.normalizeModelName(key);
      
      // Check if normalized names contain each other
      if (keyNormalized.includes(normalized) || normalized.includes(keyNormalized)) {
        return model;
      }
    }
    
    return null;
  }

  /**
   * Check if cached data is still fresh
   */
  private isDataFresh(): boolean {
    return this.cache.size > 0 && Date.now() < this.cacheExpiry;
  }

  /**
   * Save cache to localStorage
   */
  private saveToCache(): void {
    try {
      const cacheData = {
        models: Array.from(this.cache.entries()),
        expiry: this.cacheExpiry
      };
      
      localStorage.setItem('token-count-cache', JSON.stringify(cacheData));
    } catch (error) {
      console.warn('Failed to save token cache:', error);
    }
  }

  /**
   * Load cache from localStorage
   */
  private loadFromCache(): void {
    try {
      const cached = localStorage.getItem('token-count-cache');
      if (!cached) return;
      
      const cacheData = JSON.parse(cached);
      
      // Check if cache is still valid
      if (Date.now() > cacheData.expiry) {
        localStorage.removeItem('token-count-cache');
        return;
      }
      
      // Restore cache
      this.cache = new Map(cacheData.models);
      this.cacheExpiry = cacheData.expiry;
      
      console.log(`📦 Loaded ${this.cache.size} models from cache`);
      
    } catch (error) {
      console.warn('Failed to load token cache:', error);
      localStorage.removeItem('token-count-cache');
    }
  }

  /**
   * Force refresh of model data
   */
  async refresh(): Promise<void> {
    this.cache.clear();
    this.cacheExpiry = 0;
    await this.fetchModelLimits();
  }

  /**
   * Update settings and potentially refresh data
   */
  updateSettings(settings: TokenCountSettings): void {
    this.settings = settings;
    
    // If cache duration changed, update expiry
    const cacheDuration = this.settings.cacheExpiration * 60 * 60 * 1000;
    this.cacheExpiry = Date.now() + cacheDuration;
  }

  /**
   * Get cache statistics
   */
  getCacheInfo(): { modelCount: number; isExpired: boolean; expiresAt: Date } {
    return {
      modelCount: this.cache.size,
      isExpired: !this.isDataFresh(),
      expiresAt: new Date(this.cacheExpiry)
    };
  }
}