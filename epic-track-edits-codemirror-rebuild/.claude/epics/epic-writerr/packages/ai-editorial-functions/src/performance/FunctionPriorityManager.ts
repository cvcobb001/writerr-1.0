/**
 * @fileoverview Function Priority Manager - Manages dynamic function prioritization and selection
 */

import { EventData, globalEventBus } from '@writerr/shared';
import {
  FunctionPriority,
  PriorityFactors,
  FunctionSelector,
  SelectionStrategy,
  SelectionConfig,
  SelectionStatistics,
  SelectionCriteria,
  WeightedCriteria,
  ExperimentResult,
  PerformanceEvent,
  PerformanceEventType,
  PerformanceError
} from './types';
import { FunctionDefinition, FunctionExecution } from '../types';
import { PerformanceMetrics } from './types';

export class FunctionPriorityManager {
  private priorities = new Map<string, FunctionPriority>();
  private selector: FunctionSelector;
  private usageHistory = new Map<string, Array<{ timestamp: Date; context: any }>>();
  private performanceCache = new Map<string, PerformanceMetrics>();
  private updateTimer?: NodeJS.Timeout;
  private isEnabled = true;

  constructor() {
    this.selector = this.createDefaultSelector();
    this.setupEventListeners();
    this.startPriorityUpdateLoop();
  }

  /**
   * Initialize priority manager
   */
  initialize(): void {
    this.isEnabled = true;
    console.log('[FunctionPriorityManager] Initialized successfully');
  }

  /**
   * Calculate priority for a function
   */
  calculatePriority(functionId: string, context?: any): number {
    try {
      const priority = this.priorities.get(functionId);
      if (!priority) {
        // Initialize with default priority
        this.initializeFunctionPriority(functionId);
        return 50; // Default medium priority
      }

      // Update priority based on current context
      if (context) {
        return this.calculateContextualPriority(priority, context);
      }

      return priority.priority;
    } catch (error) {
      console.error(`[FunctionPriorityManager] Error calculating priority for ${functionId}:`, error);
      return 50; // Default fallback
    }
  }

  /**
   * Select best function for given criteria
   */
  selectFunction(
    availableFunctions: string[],
    selectionCriteria: Partial<SelectionCriteria> = {},
    context?: any
  ): string | null {
    try {
      if (availableFunctions.length === 0) return null;
      if (availableFunctions.length === 1) return availableFunctions[0];

      const strategy = this.selector.strategy;
      
      switch (strategy.type) {
        case 'priority-based':
          return this.selectByPriority(availableFunctions, context);
        case 'contextual':
          return this.selectByContext(availableFunctions, context, selectionCriteria);
        case 'weighted':
          return this.selectByWeightedCriteria(availableFunctions, selectionCriteria);
        case 'ml-based':
          return this.selectByMLPrediction(availableFunctions, context);
        case 'round-robin':
          return this.selectRoundRobin(availableFunctions);
        case 'hybrid':
          return this.selectHybrid(availableFunctions, context, selectionCriteria);
        default:
          return this.selectByPriority(availableFunctions, context);
      }
    } catch (error) {
      console.error('[FunctionPriorityManager] Error selecting function:', error);
      return this.getFallbackSelection(availableFunctions);
    }
  }

  /**
   * Update function priority based on execution results
   */
  updateFunctionPriority(execution: FunctionExecution): void {
    try {
      const priority = this.priorities.get(execution.functionId);
      if (!priority) {
        this.initializeFunctionPriority(execution.functionId);
        return;
      }

      // Update performance factors
      this.updatePerformanceFactors(priority, execution);
      
      // Update user preference factors
      this.updateUserPreferenceFactors(priority, execution);
      
      // Update business factors
      this.updateBusinessFactors(priority, execution);
      
      // Recalculate overall priority
      priority.priority = this.calculateOverallPriority(priority.factors);
      priority.lastCalculated = new Date();

      // Update usage history
      this.updateUsageHistory(execution.functionId, execution);

      // Emit priority change event if significant
      const oldPriority = priority.priority;
      const newPriority = priority.priority;
      if (Math.abs(oldPriority - newPriority) > 5) {
        this.emitPriorityEvent(execution.functionId, oldPriority, newPriority);
      }

    } catch (error) {
      console.error(`[FunctionPriorityManager] Error updating priority for ${execution.functionId}:`, error);
    }
  }

  /**
   * Get priority information for a function
   */
  getFunctionPriority(functionId: string): FunctionPriority | null {
    return this.priorities.get(functionId) || null;
  }

  /**
   * Get all function priorities sorted by priority
   */
  getAllPriorities(): FunctionPriority[] {
    return Array.from(this.priorities.values())
      .sort((a, b) => b.priority - a.priority);
  }

  /**
   * Update selection configuration
   */
  updateSelectionConfig(config: Partial<SelectionConfig>): void {
    this.selector.configuration = {
      ...this.selector.configuration,
      ...config
    };
  }

  /**
   * Get selection statistics
   */
  getSelectionStatistics(): SelectionStatistics {
    return { ...this.selector.statistics };
  }

  /**
   * Force priority recalculation for all functions
   */
  recalculateAllPriorities(): void {
    this.priorities.forEach((priority, functionId) => {
      priority.priority = this.calculateOverallPriority(priority.factors);
      priority.lastCalculated = new Date();
    });
    
    console.log('[FunctionPriorityManager] Recalculated all function priorities');
  }

  // Private helper methods
  private setupEventListeners(): void {
    globalEventBus.on('function-executed', (event: EventData) => {
      const execution = event.payload as FunctionExecution;
      this.updateFunctionPriority(execution);
    });

    globalEventBus.on('function-registered', (event: EventData) => {
      const functionDef = event.payload as FunctionDefinition;
      this.initializeFunctionPriority(functionDef.id);
    });

    globalEventBus.on('user-feedback', (event: EventData) => {
      const feedback = event.payload;
      this.handleUserFeedback(feedback);
    });

    globalEventBus.on('performance-metrics-updated', (event: EventData) => {
      const { functionId, metrics } = event.payload;
      this.performanceCache.set(functionId, metrics);
      this.updatePriorityFromPerformanceMetrics(functionId, metrics);
    });
  }

  private initializeFunctionPriority(functionId: string): void {
    const priority: FunctionPriority = {
      functionId,
      priority: 50, // Default medium priority
      factors: this.createDefaultPriorityFactors(),
      lastCalculated: new Date(),
      isSticky: false
    };

    this.priorities.set(functionId, priority);
    this.usageHistory.set(functionId, []);
  }

  private createDefaultPriorityFactors(): PriorityFactors {
    return {
      performance: {
        latency: 0.8,
        reliability: 0.9,
        quality: 0.8,
        weight: 0.25
      },
      userPreferences: {
        frequency: 0.5,
        rating: 0.8,
        recency: 0.5,
        weight: 0.3
      },
      business: {
        cost: 0.7,
        roi: 0.6,
        strategic: 0.5,
        weight: 0.2
      },
      context: {
        urgency: 0.5,
        complexity: 0.5,
        domain: 0.5,
        weight: 0.15
      },
      system: {
        availability: 1.0,
        load: 0.8,
        resources: 0.9,
        weight: 0.1
      }
    };
  }

  private calculateContextualPriority(priority: FunctionPriority, context: any): number {
    const basePriority = priority.priority;
    const contextualFactors = priority.factors.context;
    
    let contextualAdjustment = 0;
    
    // Adjust for urgency
    if (context.urgency) {
      const urgencyScore = this.normalizeUrgency(context.urgency);
      contextualAdjustment += (urgencyScore - 0.5) * 20 * contextualFactors.weight;
    }
    
    // Adjust for complexity match
    if (context.complexity) {
      const complexityMatch = this.calculateComplexityMatch(priority.functionId, context.complexity);
      contextualAdjustment += (complexityMatch - 0.5) * 15 * contextualFactors.weight;
    }
    
    // Adjust for domain expertise
    if (context.domain) {
      const domainMatch = this.calculateDomainMatch(priority.functionId, context.domain);
      contextualAdjustment += (domainMatch - 0.5) * 10 * contextualFactors.weight;
    }
    
    return Math.max(0, Math.min(100, basePriority + contextualAdjustment));
  }

  private calculateOverallPriority(factors: PriorityFactors): number {
    let totalScore = 0;
    let totalWeight = 0;

    // Performance component
    const performanceScore = (
      factors.performance.latency * 0.3 +
      factors.performance.reliability * 0.4 +
      factors.performance.quality * 0.3
    ) * 100;
    totalScore += performanceScore * factors.performance.weight;
    totalWeight += factors.performance.weight;

    // User preferences component
    const userScore = (
      factors.userPreferences.frequency * 0.4 +
      factors.userPreferences.rating * 0.4 +
      factors.userPreferences.recency * 0.2
    ) * 100;
    totalScore += userScore * factors.userPreferences.weight;
    totalWeight += factors.userPreferences.weight;

    // Business component
    const businessScore = (
      factors.business.cost * 0.3 +
      factors.business.roi * 0.4 +
      factors.business.strategic * 0.3
    ) * 100;
    totalScore += businessScore * factors.business.weight;
    totalWeight += factors.business.weight;

    // Context component
    const contextScore = (
      factors.context.urgency * 0.4 +
      factors.context.complexity * 0.3 +
      factors.context.domain * 0.3
    ) * 100;
    totalScore += contextScore * factors.context.weight;
    totalWeight += factors.context.weight;

    // System component
    const systemScore = (
      factors.system.availability * 0.4 +
      (1 - factors.system.load) * 0.3 +  // Invert load (lower load = higher score)
      factors.system.resources * 0.3
    ) * 100;
    totalScore += systemScore * factors.system.weight;
    totalWeight += factors.system.weight;

    return Math.max(0, Math.min(100, totalScore / totalWeight));
  }

  private updatePerformanceFactors(priority: FunctionPriority, execution: FunctionExecution): void {
    const factors = priority.factors.performance;
    
    // Update latency factor (lower is better)
    if (execution.duration) {
      const latencyScore = Math.max(0, 1 - (execution.duration / 10000)); // 10 second baseline
      factors.latency = this.exponentialMovingAverage(factors.latency, latencyScore, 0.2);
    }
    
    // Update reliability factor
    const reliabilityScore = execution.status === 'completed' ? 1.0 : 0.0;
    factors.reliability = this.exponentialMovingAverage(factors.reliability, reliabilityScore, 0.1);
    
    // Update quality factor
    if (execution.confidence !== undefined) {
      factors.quality = this.exponentialMovingAverage(factors.quality, execution.confidence, 0.15);
    }
  }

  private updateUserPreferenceFactors(priority: FunctionPriority, execution: FunctionExecution): void {
    const factors = priority.factors.userPreferences;
    
    // Update frequency (how often this function is used)
    const history = this.usageHistory.get(execution.functionId) || [];
    const recentUsage = history.filter(h => h.timestamp.getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000).length;
    factors.frequency = Math.min(1.0, recentUsage / 10); // Normalize to 0-1 based on 10 uses per week
    
    // Update recency (more recent use = higher score)
    const timeSinceLastUse = Date.now() - (execution.endTime?.getTime() || Date.now());
    const recencyScore = Math.max(0, 1 - (timeSinceLastUse / (7 * 24 * 60 * 60 * 1000))); // 7 day decay
    factors.recency = recencyScore;
    
    // Rating will be updated via user feedback events
  }

  private updateBusinessFactors(priority: FunctionPriority, execution: FunctionExecution): void {
    const factors = priority.factors.business;
    
    // Update cost factor (lower cost = higher score)
    const estimatedCost = this.estimateExecutionCost(execution);
    const costScore = Math.max(0, 1 - (estimatedCost / 1.0)); // $1 baseline
    factors.cost = this.exponentialMovingAverage(factors.cost, costScore, 0.1);
    
    // Update ROI based on quality and cost
    const roi = execution.confidence ? execution.confidence / Math.max(0.01, estimatedCost) : 0.5;
    const roiScore = Math.min(1.0, roi / 10); // Normalize
    factors.roi = this.exponentialMovingAverage(factors.roi, roiScore, 0.1);
  }

  private selectByPriority(availableFunctions: string[], context?: any): string {
    const scoredFunctions = availableFunctions.map(functionId => ({
      functionId,
      score: this.calculatePriority(functionId, context)
    }));
    
    scoredFunctions.sort((a, b) => b.score - a.score);
    
    // Add some randomization to avoid always selecting the same function
    const topFunctions = scoredFunctions.filter(f => f.score >= scoredFunctions[0].score * 0.9);
    const selectedIndex = Math.floor(Math.random() * topFunctions.length);
    
    return topFunctions[selectedIndex].functionId;
  }

  private selectByContext(
    availableFunctions: string[], 
    context: any, 
    criteria: Partial<SelectionCriteria>
  ): string {
    const scoredFunctions = availableFunctions.map(functionId => {
      let score = this.calculatePriority(functionId, context);
      
      // Apply contextual bonuses
      if (context) {
        score += this.calculateContextualBonus(functionId, context);
      }
      
      return { functionId, score };
    });
    
    return scoredFunctions.sort((a, b) => b.score - a.score)[0].functionId;
  }

  private selectByWeightedCriteria(
    availableFunctions: string[], 
    criteria: Partial<SelectionCriteria>
  ): string {
    // Simplified weighted selection based on criteria
    return availableFunctions[0]; // Fallback to first available
  }

  private selectByMLPrediction(availableFunctions: string[], context: any): string {
    // Placeholder for ML-based selection
    // Would integrate with a trained model for function selection
    return this.selectByPriority(availableFunctions, context);
  }

  private selectRoundRobin(availableFunctions: string[]): string {
    // Simple round-robin selection
    const stats = this.selector.statistics;
    const totalSelections = stats.totalSelections;
    const index = totalSelections % availableFunctions.length;
    return availableFunctions[index];
  }

  private selectHybrid(
    availableFunctions: string[], 
    context: any, 
    criteria: Partial<SelectionCriteria>
  ): string {
    // Combine multiple strategies
    const prioritySelection = this.selectByPriority(availableFunctions, context);
    const contextualSelection = this.selectByContext(availableFunctions, context, criteria);
    
    // If both strategies agree, use that selection
    if (prioritySelection === contextualSelection) {
      return prioritySelection;
    }
    
    // Otherwise, use priority-based with some randomization
    return Math.random() < 0.7 ? prioritySelection : contextualSelection;
  }

  private getFallbackSelection(availableFunctions: string[]): string {
    const config = this.selector.configuration.fallback;
    
    if (config.strategy === 'default' && config.defaultFunctionId) {
      const defaultExists = availableFunctions.includes(config.defaultFunctionId);
      if (defaultExists) return config.defaultFunctionId;
    }
    
    if (config.strategy === 'best-available') {
      return this.selectByPriority(availableFunctions);
    }
    
    // Random fallback
    const randomIndex = Math.floor(Math.random() * availableFunctions.length);
    return availableFunctions[randomIndex];
  }

  private handleUserFeedback(feedback: any): void {
    if (feedback.functionId) {
      const priority = this.priorities.get(feedback.functionId);
      if (priority && feedback.rating !== undefined) {
        const ratingScore = (feedback.rating - 1) / 4; // Normalize 1-5 to 0-1
        priority.factors.userPreferences.rating = this.exponentialMovingAverage(
          priority.factors.userPreferences.rating,
          ratingScore,
          0.2
        );
        priority.priority = this.calculateOverallPriority(priority.factors);
        priority.lastCalculated = new Date();
      }
    }
  }

  private updateUsageHistory(functionId: string, execution: FunctionExecution): void {
    const history = this.usageHistory.get(functionId) || [];
    history.push({
      timestamp: execution.endTime || new Date(),
      context: execution.metadata?.context
    });
    
    // Keep only last 100 usage records
    if (history.length > 100) {
      history.splice(0, history.length - 100);
    }
    
    this.usageHistory.set(functionId, history);
  }

  private updatePriorityFromPerformanceMetrics(functionId: string, metrics: PerformanceMetrics): void {
    const priority = this.priorities.get(functionId);
    if (!priority) return;

    // Update performance factors from metrics
    priority.factors.performance.latency = Math.max(0, 1 - (metrics.execution.latency.average / 5000));
    priority.factors.performance.reliability = metrics.execution.successfulRequests / 
      Math.max(1, metrics.execution.totalRequests);
    priority.factors.performance.quality = metrics.quality.outputQuality.average;
    
    // Update system factors
    priority.factors.system.load = 1 - (metrics.resources.cpu.usage / 100);
    priority.factors.system.availability = metrics.execution.successfulRequests / 
      Math.max(1, metrics.execution.totalRequests);
    
    // Recalculate priority
    priority.priority = this.calculateOverallPriority(priority.factors);
    priority.lastCalculated = new Date();
  }

  private startPriorityUpdateLoop(): void {
    this.updateTimer = setInterval(() => {
      this.performPeriodicUpdates();
    }, 300000); // Update every 5 minutes
  }

  private performPeriodicUpdates(): void {
    if (!this.isEnabled) return;

    // Decay recency scores over time
    this.priorities.forEach((priority, functionId) => {
      priority.factors.userPreferences.recency *= 0.99; // Gradual decay
      priority.priority = this.calculateOverallPriority(priority.factors);
      priority.lastCalculated = new Date();
    });
  }

  // Utility methods
  private exponentialMovingAverage(current: number, newValue: number, alpha: number): number {
    return alpha * newValue + (1 - alpha) * current;
  }

  private normalizeUrgency(urgency: string | number): number {
    if (typeof urgency === 'number') {
      return Math.max(0, Math.min(1, urgency));
    }
    
    const urgencyMap: Record<string, number> = {
      'low': 0.2,
      'normal': 0.5,
      'medium': 0.7,
      'high': 0.9,
      'critical': 1.0
    };
    
    return urgencyMap[urgency.toLowerCase()] || 0.5;
  }

  private calculateComplexityMatch(functionId: string, complexity: string): number {
    // Simplified complexity matching
    // In reality, this would consider the function's capabilities vs content complexity
    const complexityMap: Record<string, number> = {
      'simple': 0.8,
      'medium': 0.6,
      'complex': 0.4
    };
    
    return complexityMap[complexity.toLowerCase()] || 0.5;
  }

  private calculateDomainMatch(functionId: string, domain: string): number {
    // Simplified domain matching
    // Would analyze function specialization vs content domain
    return 0.7; // Default reasonable match
  }

  private calculateContextualBonus(functionId: string, context: any): number {
    let bonus = 0;
    
    if (context.documentType) {
      // Bonus for functions that match document type
      bonus += this.getDocumentTypeMatch(functionId, context.documentType) * 5;
    }
    
    if (context.userExpertiseLevel) {
      // Bonus for functions that match user expertise
      bonus += this.getUserExpertiseMatch(functionId, context.userExpertiseLevel) * 3;
    }
    
    return bonus;
  }

  private getDocumentTypeMatch(functionId: string, documentType: string): number {
    // Simplified document type matching
    const typeMatches: Record<string, Record<string, number>> = {
      'copy-editor': { 'article': 0.9, 'blog': 0.8, 'academic': 0.7 },
      'proofreader': { 'academic': 0.9, 'formal': 0.8, 'technical': 0.9 },
      'developmental-editor': { 'manuscript': 0.9, 'thesis': 0.8, 'report': 0.7 },
      'co-writer': { 'creative': 0.9, 'marketing': 0.8, 'content': 0.7 }
    };
    
    return typeMatches[functionId]?.[documentType] || 0.5;
  }

  private getUserExpertiseMatch(functionId: string, expertiseLevel: string): number {
    // Simplified expertise matching
    const expertiseMap: Record<string, number> = {
      'novice': 0.8,    // Simpler functions for novices
      'intermediate': 0.6,
      'expert': 0.4     // More sophisticated functions for experts
    };
    
    return expertiseMap[expertiseLevel] || 0.5;
  }

  private estimateExecutionCost(execution: FunctionExecution): number {
    // Simple cost estimation
    const baseCost = 0.01;
    const durationFactor = (execution.duration || 1000) / 1000 / 60; // per minute
    const tokenCost = ((execution.input?.length || 0) + (execution.output?.length || 0)) * 0.000001;
    
    return baseCost + durationFactor + tokenCost;
  }

  private createDefaultSelector(): FunctionSelector {
    return {
      strategy: {
        type: 'hybrid',
        parameters: {}
      },
      configuration: {
        criteria: {
          required: [],
          preferred: [],
          excluded: []
        },
        fallback: {
          enabled: true,
          strategy: 'best-available'
        },
        learning: {
          enabled: true,
          adaptationRate: 0.1,
          explorationRate: 0.1
        }
      },
      statistics: {
        totalSelections: 0,
        selectionDistribution: {},
        averageSelectionTime: 0,
        successRate: 1.0,
        experiments: [],
        effectiveness: {
          userSatisfaction: 0.8,
          taskCompletion: 0.9,
          errorReduction: 0.1,
          timesSaved: 0
        }
      }
    };
  }

  private emitPriorityEvent(functionId: string, oldPriority: number, newPriority: number): void {
    const event: PerformanceEvent = {
      type: PerformanceEventType.PRIORITY_CHANGED,
      functionId,
      data: { oldPriority, newPriority },
      timestamp: new Date(),
      severity: 'info'
    };

    globalEventBus.emit('performance-event', event, 'priority-manager');
  }

  dispose(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = undefined;
    }
    
    this.isEnabled = false;
  }
}

// Export singleton instance
export const functionPriorityManager = new FunctionPriorityManager();