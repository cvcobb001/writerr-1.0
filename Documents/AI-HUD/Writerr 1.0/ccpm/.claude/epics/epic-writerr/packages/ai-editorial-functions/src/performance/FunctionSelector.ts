/**
 * @fileoverview Function Selector - Intelligent function selection and routing
 */

import { EventData, globalEventBus } from '@writerr/shared';
import {
  SelectionStrategy,
  SelectionConfig,
  SelectionStatistics,
  SelectionCriteria,
  WeightedCriteria,
  SelectionFilter,
  ExperimentResult,
  ExperimentVariant,
  ExperimentMetrics,
  PerformanceEvent,
  PerformanceEventType
} from './types';
import { FunctionDefinition } from '../types';
import { functionPriorityManager } from './FunctionPriorityManager';
import { performanceMonitoringManager } from './PerformanceMonitoringManager';

export class FunctionSelector {
  private strategy: SelectionStrategy;
  private configuration: SelectionConfig;
  private statistics: SelectionStatistics;
  private activeExperiments = new Map<string, ExperimentResult>();
  private selectionHistory: SelectionHistory[] = [];
  private availableFunctions = new Map<string, FunctionDefinition>();
  private contextualRules = new Map<string, ContextualRule>();
  private isEnabled = true;

  constructor() {
    this.strategy = this.createDefaultStrategy();
    this.configuration = this.createDefaultConfiguration();
    this.statistics = this.createEmptyStatistics();
    this.setupEventListeners();
    this.initializeContextualRules();
  }

  /**
   * Initialize function selector
   */
  initialize(): void {
    this.isEnabled = true;
    console.log('[FunctionSelector] Initialized successfully');
  }

  /**
   * Select the best function for given criteria and context
   */
  async selectFunction(
    input: string,
    context: SelectionContext,
    criteria: Partial<SelectionCriteria> = {}
  ): Promise<SelectionResult> {
    try {
      if (!this.isEnabled) {
        throw new Error('Function selector is disabled');
      }

      const startTime = Date.now();
      
      // Get available functions that meet required criteria
      const availableFunctions = this.getAvailableFunctions(criteria.required || []);
      
      if (availableFunctions.length === 0) {
        return this.handleNoAvailableFunctions(criteria);
      }

      // Apply selection strategy
      const selectedFunction = await this.applySelectionStrategy(
        availableFunctions,
        input,
        context,
        criteria
      );

      const selectionTime = Date.now() - startTime;
      
      // Record selection
      const selection: SelectionHistory = {
        id: this.generateSelectionId(),
        functionId: selectedFunction,
        input,
        context,
        criteria,
        strategy: this.strategy.type,
        selectionTime,
        timestamp: new Date(),
        successful: true
      };
      
      this.recordSelection(selection);
      
      // Update statistics
      this.updateStatistics(selectedFunction, selectionTime, true);

      return {
        functionId: selectedFunction,
        confidence: this.calculateSelectionConfidence(selectedFunction, context),
        reasoning: this.generateSelectionReasoning(selectedFunction, context, criteria),
        alternatives: this.getAlternatives(availableFunctions, selectedFunction, 3),
        metadata: {
          selectionTime,
          strategy: this.strategy.type,
          totalAvailable: availableFunctions.length
        }
      };

    } catch (error) {
      console.error('[FunctionSelector] Error selecting function:', error);
      
      // Record failed selection
      this.updateStatistics('', 0, false);
      
      // Return fallback
      return this.getFallbackSelection(criteria);
    }
  }

  /**
   * Update selection strategy
   */
  updateStrategy(strategy: Partial<SelectionStrategy>): void {
    this.strategy = {
      ...this.strategy,
      ...strategy
    };
    
    console.log(`[FunctionSelector] Updated selection strategy to ${this.strategy.type}`);
  }

  /**
   * Update selection configuration
   */
  updateConfiguration(config: Partial<SelectionConfig>): void {
    this.configuration = {
      ...this.configuration,
      ...config
    };
  }

  /**
   * Get current selection statistics
   */
  getStatistics(): SelectionStatistics {
    return { ...this.statistics };
  }

  /**
   * Start A/B test experiment
   */
  startExperiment(
    experimentId: string,
    name: string,
    variants: ExperimentVariant[],
    trafficSplit: Record<string, number>,
    duration: number
  ): void {
    const experiment: ExperimentResult = {
      id: experimentId,
      name,
      startDate: new Date(),
      variants,
      results: {},
      significance: 0
    };

    // Initialize results for each variant
    variants.forEach(variant => {
      experiment.results[variant.id] = {
        samples: 0,
        conversionRate: 0,
        averageLatency: 0,
        userSatisfaction: 0,
        confidence: 0
      };
    });

    this.activeExperiments.set(experimentId, experiment);
    
    // Set end time
    setTimeout(() => {
      this.endExperiment(experimentId);
    }, duration);

    console.log(`[FunctionSelector] Started experiment: ${name}`);
  }

  /**
   * End A/B test experiment
   */
  endExperiment(experimentId: string): void {
    const experiment = this.activeExperiments.get(experimentId);
    if (!experiment) return;

    experiment.endDate = new Date();
    
    // Calculate experiment results
    const winner = this.calculateExperimentWinner(experiment);
    if (winner) {
      experiment.winner = winner.id;
    }

    // Archive experiment
    this.statistics.experiments.push(experiment);
    this.activeExperiments.delete(experimentId);

    console.log(`[FunctionSelector] Ended experiment: ${experiment.name}, Winner: ${experiment.winner || 'No clear winner'}`);
  }

  /**
   * Register available function
   */
  registerFunction(functionDef: FunctionDefinition): void {
    this.availableFunctions.set(functionDef.id, functionDef);
    console.log(`[FunctionSelector] Registered function: ${functionDef.id}`);
  }

  /**
   * Unregister function
   */
  unregisterFunction(functionId: string): void {
    this.availableFunctions.delete(functionId);
    console.log(`[FunctionSelector] Unregistered function: ${functionId}`);
  }

  /**
   * Get selection history for analysis
   */
  getSelectionHistory(limit: number = 100): SelectionHistory[] {
    return this.selectionHistory
      .slice(-limit)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  // Private helper methods
  private setupEventListeners(): void {
    globalEventBus.on('function-registered', (event: EventData) => {
      const functionDef = event.payload as FunctionDefinition;
      this.registerFunction(functionDef);
    });

    globalEventBus.on('function-execution-completed', (event: EventData) => {
      const { functionId, success, duration, userRating } = event.payload;
      this.updateEffectivenessMetrics(functionId, success, duration, userRating);
    });

    globalEventBus.on('user-feedback', (event: EventData) => {
      const feedback = event.payload;
      this.handleUserFeedback(feedback);
    });
  }

  private initializeContextualRules(): void {
    // Initialize common contextual rules
    this.contextualRules.set('document-type-academic', {
      id: 'document-type-academic',
      condition: {
        field: 'documentType',
        operator: 'equals',
        value: 'academic'
      },
      action: {
        boostFunctions: ['proofreader', 'developmental-editor'],
        boostAmount: 10
      },
      priority: 1
    });

    this.contextualRules.set('urgency-high', {
      id: 'urgency-high',
      condition: {
        field: 'urgency',
        operator: 'gte',
        value: 0.8
      },
      action: {
        boostFunctions: ['copy-editor'], // Faster, lighter functions
        boostAmount: 15
      },
      priority: 2
    });

    this.contextualRules.set('complexity-simple', {
      id: 'complexity-simple',
      condition: {
        field: 'complexity',
        operator: 'equals',
        value: 'simple'
      },
      action: {
        boostFunctions: ['copy-editor', 'proofreader'],
        boostAmount: 8
      },
      priority: 1
    });
  }

  private getAvailableFunctions(requiredFilters: SelectionFilter[]): string[] {
    let available = Array.from(this.availableFunctions.keys());

    // Apply required filters
    for (const filter of requiredFilters) {
      available = available.filter(functionId => 
        this.evaluateFilter(functionId, filter)
      );
    }

    // Remove any excluded functions
    // (This would be implemented based on specific exclusion criteria)

    return available;
  }

  private evaluateFilter(functionId: string, filter: SelectionFilter): boolean {
    const functionDef = this.availableFunctions.get(functionId);
    if (!functionDef) return false;

    const value = this.extractFieldValue(functionDef, filter.field);
    
    switch (filter.operator) {
      case 'equals':
        return value === filter.value;
      case 'gt':
        return typeof value === 'number' && value > filter.value;
      case 'lt':
        return typeof value === 'number' && value < filter.value;
      case 'gte':
        return typeof value === 'number' && value >= filter.value;
      case 'lte':
        return typeof value === 'number' && value <= filter.value;
      case 'contains':
        return Array.isArray(value) && value.includes(filter.value);
      case 'in':
        return Array.isArray(filter.value) && filter.value.includes(value);
      default:
        return false;
    }
  }

  private extractFieldValue(functionDef: FunctionDefinition, field: string): any {
    const parts = field.split('.');
    let value: any = functionDef;
    
    for (const part of parts) {
      if (value && typeof value === 'object') {
        value = (value as any)[part];
      } else {
        return undefined;
      }
    }
    
    return value;
  }

  private async applySelectionStrategy(
    availableFunctions: string[],
    input: string,
    context: SelectionContext,
    criteria: Partial<SelectionCriteria>
  ): Promise<string> {
    switch (this.strategy.type) {
      case 'priority-based':
        return this.selectByPriority(availableFunctions, context);
      
      case 'contextual':
        return this.selectByContext(availableFunctions, input, context);
      
      case 'weighted':
        return this.selectByWeightedCriteria(availableFunctions, criteria);
      
      case 'ml-based':
        return await this.selectByMLPrediction(availableFunctions, input, context);
      
      case 'round-robin':
        return this.selectRoundRobin(availableFunctions);
      
      case 'hybrid':
        return this.selectHybrid(availableFunctions, input, context, criteria);
      
      default:
        return this.selectByPriority(availableFunctions, context);
    }
  }

  private selectByPriority(availableFunctions: string[], context: SelectionContext): string {
    const scoredFunctions = availableFunctions.map(functionId => ({
      functionId,
      priority: functionPriorityManager.calculatePriority(functionId, context)
    }));

    scoredFunctions.sort((a, b) => b.priority - a.priority);
    
    // Apply exploration vs exploitation
    const explorationRate = this.configuration.learning.explorationRate;
    if (Math.random() < explorationRate && scoredFunctions.length > 1) {
      // Explore: select randomly from top 3
      const topFunctions = scoredFunctions.slice(0, Math.min(3, scoredFunctions.length));
      const randomIndex = Math.floor(Math.random() * topFunctions.length);
      return topFunctions[randomIndex].functionId;
    }

    // Exploit: select highest priority
    return scoredFunctions[0].functionId;
  }

  private selectByContext(
    availableFunctions: string[],
    input: string,
    context: SelectionContext
  ): string {
    const scoredFunctions = availableFunctions.map(functionId => {
      let score = functionPriorityManager.calculatePriority(functionId, context);
      
      // Apply contextual rules
      for (const rule of this.contextualRules.values()) {
        if (this.evaluateContextualRule(rule, context)) {
          if (rule.action.boostFunctions.includes(functionId)) {
            score += rule.action.boostAmount;
          }
        }
      }
      
      return { functionId, score };
    });

    return scoredFunctions.sort((a, b) => b.score - a.score)[0].functionId;
  }

  private selectByWeightedCriteria(
    availableFunctions: string[],
    criteria: Partial<SelectionCriteria>
  ): string {
    if (!criteria.preferred || criteria.preferred.length === 0) {
      return this.selectByPriority(availableFunctions, {});
    }

    const scoredFunctions = availableFunctions.map(functionId => {
      let score = 0;
      
      for (const criterion of criteria.preferred!) {
        const functionDef = this.availableFunctions.get(functionId);
        if (functionDef) {
          const value = this.extractFieldValue(functionDef, criterion.field);
          const normalizedValue = this.normalizeValue(value, criterion.transform);
          
          if (criterion.direction === 'maximize') {
            score += normalizedValue * criterion.weight;
          } else {
            score += (1 - normalizedValue) * criterion.weight;
          }
        }
      }
      
      return { functionId, score };
    });

    return scoredFunctions.sort((a, b) => b.score - a.score)[0].functionId;
  }

  private async selectByMLPrediction(
    availableFunctions: string[],
    input: string,
    context: SelectionContext
  ): Promise<string> {
    // Placeholder for ML-based selection
    // Would integrate with a trained model that predicts success probability
    // For now, fall back to contextual selection
    return this.selectByContext(availableFunctions, input, context);
  }

  private selectRoundRobin(availableFunctions: string[]): string {
    const index = this.statistics.totalSelections % availableFunctions.length;
    return availableFunctions[index];
  }

  private selectHybrid(
    availableFunctions: string[],
    input: string,
    context: SelectionContext,
    criteria: Partial<SelectionCriteria>
  ): string {
    // Combine multiple strategies with weights
    const prioritySelection = this.selectByPriority(availableFunctions, context);
    const contextualSelection = this.selectByContext(availableFunctions, input, context);
    
    // Weight based on confidence in each approach
    const priorityConfidence = 0.6;
    const contextualConfidence = 0.8;
    
    if (contextualConfidence > priorityConfidence) {
      return contextualSelection;
    } else {
      return prioritySelection;
    }
  }

  private evaluateContextualRule(rule: ContextualRule, context: SelectionContext): boolean {
    const value = (context as any)[rule.condition.field];
    
    switch (rule.condition.operator) {
      case 'equals':
        return value === rule.condition.value;
      case 'gte':
        return typeof value === 'number' && value >= rule.condition.value;
      case 'lte':
        return typeof value === 'number' && value <= rule.condition.value;
      default:
        return false;
    }
  }

  private normalizeValue(value: any, transform?: string): number {
    if (typeof value === 'number') {
      switch (transform) {
        case 'log':
          return Math.log(Math.max(1, value)) / Math.log(10);
        case 'sqrt':
          return Math.sqrt(Math.max(0, value));
        case 'linear':
        default:
          return Math.max(0, Math.min(1, value));
      }
    }
    
    return 0.5; // Default neutral value
  }

  private calculateSelectionConfidence(functionId: string, context: SelectionContext): number {
    // Calculate confidence based on historical performance and context match
    const priority = functionPriorityManager.calculatePriority(functionId, context);
    const performance = performanceMonitoringManager.getMetrics(functionId);
    
    let confidence = priority / 100; // Normalize priority to 0-1
    
    if (performance) {
      const qualityScore = performance.quality.outputQuality.average;
      const reliabilityScore = performance.execution.successfulRequests / 
        Math.max(1, performance.execution.totalRequests);
      
      confidence = (confidence + qualityScore + reliabilityScore) / 3;
    }
    
    return Math.max(0.1, Math.min(1.0, confidence));
  }

  private generateSelectionReasoning(
    functionId: string,
    context: SelectionContext,
    criteria: Partial<SelectionCriteria>
  ): string {
    const reasons: string[] = [];
    
    // Priority-based reasoning
    const priority = functionPriorityManager.calculatePriority(functionId, context);
    reasons.push(`High priority score: ${priority.toFixed(1)}`);
    
    // Contextual reasoning
    if (context.documentType) {
      reasons.push(`Optimized for ${context.documentType} documents`);
    }
    
    if (context.urgency && context.urgency > 0.7) {
      reasons.push('Selected for high-urgency requirements');
    }
    
    // Performance reasoning
    const performance = performanceMonitoringManager.getMetrics(functionId);
    if (performance) {
      const qualityScore = performance.quality.outputQuality.average;
      if (qualityScore > 0.8) {
        reasons.push(`Excellent quality track record (${(qualityScore * 100).toFixed(1)}%)`);
      }
    }
    
    return reasons.join('; ');
  }

  private getAlternatives(
    availableFunctions: string[],
    selectedFunction: string,
    count: number
  ): Array<{ functionId: string; score: number; reason: string }> {
    const alternatives = availableFunctions
      .filter(id => id !== selectedFunction)
      .map(functionId => ({
        functionId,
        score: functionPriorityManager.calculatePriority(functionId),
        reason: this.generateAlternativeReason(functionId)
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, count);
    
    return alternatives;
  }

  private generateAlternativeReason(functionId: string): string {
    const performance = performanceMonitoringManager.getMetrics(functionId);
    if (performance) {
      const latency = performance.execution.latency.average;
      const quality = performance.quality.outputQuality.average;
      
      if (latency < 1000) {
        return 'Faster execution time';
      } else if (quality > 0.9) {
        return 'Higher quality output';
      }
    }
    
    return 'Alternative approach';
  }

  private handleNoAvailableFunctions(criteria: Partial<SelectionCriteria>): SelectionResult {
    // Check if fallback is enabled
    if (this.configuration.fallback.enabled) {
      const fallbackId = this.configuration.fallback.defaultFunctionId;
      if (fallbackId && this.availableFunctions.has(fallbackId)) {
        return {
          functionId: fallbackId,
          confidence: 0.3,
          reasoning: 'Fallback selection - no functions matched criteria',
          alternatives: [],
          metadata: {
            selectionTime: 0,
            strategy: 'fallback',
            totalAvailable: 0
          }
        };
      }
    }
    
    throw new Error('No functions available for selection');
  }

  private getFallbackSelection(criteria: Partial<SelectionCriteria>): SelectionResult {
    const fallback = this.configuration.fallback;
    
    if (fallback.enabled && fallback.defaultFunctionId) {
      return {
        functionId: fallback.defaultFunctionId,
        confidence: 0.2,
        reasoning: 'Fallback selection due to error',
        alternatives: [],
        metadata: {
          selectionTime: 0,
          strategy: 'fallback-error',
          totalAvailable: 0
        }
      };
    }
    
    // Last resort: return first available function
    const firstAvailable = Array.from(this.availableFunctions.keys())[0];
    if (firstAvailable) {
      return {
        functionId: firstAvailable,
        confidence: 0.1,
        reasoning: 'Emergency fallback - first available function',
        alternatives: [],
        metadata: {
          selectionTime: 0,
          strategy: 'emergency-fallback',
          totalAvailable: 1
        }
      };
    }
    
    throw new Error('No fallback options available');
  }

  private recordSelection(selection: SelectionHistory): void {
    this.selectionHistory.push(selection);
    
    // Keep only last 10000 selections
    if (this.selectionHistory.length > 10000) {
      this.selectionHistory = this.selectionHistory.slice(-10000);
    }
  }

  private updateStatistics(functionId: string, selectionTime: number, successful: boolean): void {
    this.statistics.totalSelections++;
    
    if (successful) {
      this.statistics.averageSelectionTime = 
        (this.statistics.averageSelectionTime * (this.statistics.totalSelections - 1) + selectionTime) / 
        this.statistics.totalSelections;
      
      // Update selection distribution
      const currentCount = this.statistics.selectionDistribution[functionId] || 0;
      this.statistics.selectionDistribution[functionId] = currentCount + 1;
      
      this.statistics.successRate = 
        (this.statistics.successRate * (this.statistics.totalSelections - 1) + 1) / 
        this.statistics.totalSelections;
    } else {
      this.statistics.successRate = 
        (this.statistics.successRate * (this.statistics.totalSelections - 1) + 0) / 
        this.statistics.totalSelections;
    }
  }

  private updateEffectivenessMetrics(
    functionId: string,
    success: boolean,
    duration: number,
    userRating?: number
  ): void {
    const effectiveness = this.statistics.effectiveness;
    
    if (success) {
      effectiveness.taskCompletion = 
        (effectiveness.taskCompletion * 0.9) + (1.0 * 0.1); // Exponential moving average
      
      if (duration > 0) {
        effectiveness.timesSaved += Math.max(0, 300 - duration); // Assume 5 min baseline
      }
    } else {
      effectiveness.taskCompletion = 
        (effectiveness.taskCompletion * 0.9) + (0.0 * 0.1);
      
      effectiveness.errorReduction = 
        (effectiveness.errorReduction * 0.9) + (1.0 * 0.1);
    }
    
    if (userRating !== undefined) {
      const ratingScore = (userRating - 1) / 4; // Normalize 1-5 to 0-1
      effectiveness.userSatisfaction = 
        (effectiveness.userSatisfaction * 0.8) + (ratingScore * 0.2);
    }
  }

  private handleUserFeedback(feedback: any): void {
    if (feedback.functionId && feedback.rating !== undefined) {
      this.updateEffectivenessMetrics(
        feedback.functionId,
        feedback.rating >= 3,
        0,
        feedback.rating
      );
    }
  }

  private calculateExperimentWinner(experiment: ExperimentResult): ExperimentVariant | null {
    let bestVariant: ExperimentVariant | null = null;
    let bestScore = -1;
    
    experiment.variants.forEach(variant => {
      const results = experiment.results[variant.id];
      if (results.samples < 30) return; // Minimum sample size
      
      // Calculate composite score
      const score = (
        results.conversionRate * 0.4 +
        results.userSatisfaction * 0.4 +
        (1 - results.averageLatency / 10000) * 0.2 // Normalize latency
      );
      
      if (score > bestScore) {
        bestScore = score;
        bestVariant = variant;
      }
    });
    
    return bestVariant;
  }

  private generateSelectionId(): string {
    return `sel-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Default configuration creators
  private createDefaultStrategy(): SelectionStrategy {
    return {
      type: 'hybrid',
      parameters: {
        priorityWeight: 0.4,
        contextWeight: 0.4,
        performanceWeight: 0.2
      }
    };
  }

  private createDefaultConfiguration(): SelectionConfig {
    return {
      criteria: {
        required: [],
        preferred: [],
        excluded: []
      },
      fallback: {
        enabled: true,
        strategy: 'best-available',
        defaultFunctionId: 'copy-editor'
      },
      learning: {
        enabled: true,
        adaptationRate: 0.1,
        explorationRate: 0.1
      }
    };
  }

  private createEmptyStatistics(): SelectionStatistics {
    return {
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
    };
  }

  dispose(): void {
    this.isEnabled = false;
    
    // End any active experiments
    this.activeExperiments.forEach((_, experimentId) => {
      this.endExperiment(experimentId);
    });
  }
}

// Helper interfaces
interface SelectionResult {
  functionId: string;
  confidence: number;
  reasoning: string;
  alternatives: Array<{
    functionId: string;
    score: number;
    reason: string;
  }>;
  metadata: {
    selectionTime: number;
    strategy: string;
    totalAvailable: number;
  };
}

interface SelectionContext {
  documentType?: string;
  complexity?: string;
  urgency?: number;
  domain?: string;
  userExpertiseLevel?: string;
  contentLength?: number;
  [key: string]: any;
}

interface SelectionHistory {
  id: string;
  functionId: string;
  input: string;
  context: SelectionContext;
  criteria: Partial<SelectionCriteria>;
  strategy: string;
  selectionTime: number;
  timestamp: Date;
  successful: boolean;
}

interface ContextualRule {
  id: string;
  condition: {
    field: string;
    operator: string;
    value: any;
  };
  action: {
    boostFunctions: string[];
    boostAmount: number;
  };
  priority: number;
}

// Export singleton instance
export const functionSelector = new FunctionSelector();