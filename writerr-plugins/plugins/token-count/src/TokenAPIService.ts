/**
 * TokenAPIService - Public API for other plugins to consume
 * Clean interface for token analysis and model data - Pure service, no UI
 */

import { TokenCalculator } from './TokenCalculator';
import { TokenLimitService, ModelInfo } from './TokenLimitService';

export interface TokenAnalysis {
  tokenCount: number;
  modelName: string;
  tokenLimit: number | null;
  percentage: number;
  estimatedCost: number | null;
  isEstimate: boolean;
}

export class TokenAPIService {
  constructor(
    private tokenCalculator: TokenCalculator,
    private tokenLimitService: TokenLimitService
  ) {}

  /**
   * Analyze text for token usage - main API method
   */
  analyzeText(text: string, modelName?: string): TokenAnalysis {
    if (!text) {
      return {
        tokenCount: 0,
        modelName: modelName || 'unknown',
        tokenLimit: null,
        percentage: 0,
        estimatedCost: null,
        isEstimate: true
      };
    }

    // Calculate tokens using sophisticated algorithms
    const tokenCount = modelName 
      ? this.tokenCalculator.calculateTokensForModel(text, modelName)
      : this.tokenCalculator.estimateTokens(text);

    // Get model capacity data
    const tokenLimit = modelName ? this.tokenLimitService.getTokenLimit(modelName) : null;
    const modelInfo = modelName ? this.tokenLimitService.getModelInfo(modelName) : null;
    
    // Calculate percentage if we have limits
    const percentage = tokenLimit ? (tokenCount / tokenLimit) * 100 : 0;
    
    // Estimate cost if we have pricing data
    let estimatedCost = null;
    if (modelInfo?.pricing) {
      // Rough cost estimation (assumes mostly prompt tokens)
      estimatedCost = (tokenCount / 1000) * modelInfo.pricing.prompt;
    }

    return {
      tokenCount,
      modelName: modelName || 'unknown',
      tokenLimit,
      percentage,
      estimatedCost,
      isEstimate: true // Always true for pre-request estimates
    };
  }

  /**
   * Get token limit for a specific model
   */
  getTokenLimit(modelName: string): number | null {
    return this.tokenLimitService.getTokenLimit(modelName);
  }

  /**
   * Get full model information including pricing
   */
  getModelInfo(modelName: string): ModelInfo | null {
    return this.tokenLimitService.getModelInfo(modelName);
  }

  /**
   * Get list of all supported models
   */
  getSupportedModels(): ModelInfo[] {
    return this.tokenLimitService.getSupportedModels();
  }

  /**
   * Calculate cost for a given number of tokens
   */
  calculateCost(tokens: number, modelName: string, completionTokens: number = 0): number | null {
    const modelInfo = this.tokenLimitService.getModelInfo(modelName);
    if (!modelInfo?.pricing) return null;

    const promptTokens = tokens - completionTokens;
    const promptCost = (promptTokens / 1000) * modelInfo.pricing.prompt;
    const completionCost = (completionTokens / 1000) * modelInfo.pricing.completion;
    
    return promptCost + completionCost;
  }


  /**
   * Quick token count without model info
   */
  quickCount(text: string): number {
    return this.tokenCalculator.estimateTokens(text);
  }

  /**
   * Refresh model data from external sources
   */
  async refreshModelData(): Promise<void> {
    await this.tokenLimitService.refresh();
  }

  /**
   * Get cache information
   */
  getCacheInfo(): { modelCount: number; isExpired: boolean; expiresAt: Date } {
    return this.tokenLimitService.getCacheInfo();
  }
}