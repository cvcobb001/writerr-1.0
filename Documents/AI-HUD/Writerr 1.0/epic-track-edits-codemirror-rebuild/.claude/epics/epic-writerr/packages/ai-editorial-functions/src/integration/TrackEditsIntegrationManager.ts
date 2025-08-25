/**
 * @fileoverview Track Edits Integration Manager - Routes AI function outputs through Track Edits
 */

import { EventData, globalEventBus } from '@writerr/shared';
import { Change, ChangeType, ChangeCategory, ChangeSource } from '../../track-edits/src/types';
import {
  TrackEditsIntegration,
  TrackEditsIntegrationConfig,
  FunctionSpecificSettings,
  OutputRoutingConfig,
  ChangeMappingConfig,
  ReviewWorkflowConfig,
  TrackEditsStats,
  PreprocessorConfig,
  PostprocessorConfig,
  ApprovalRule,
  TrackEditsIntegrationError,
  IntegrationEvent,
  IntegrationType,
  IntegrationEventType
} from './types';
import { FunctionDefinition, FunctionExecution } from '../types';

export class TrackEditsIntegrationManager {
  private integrations = new Map<string, TrackEditsIntegration>();
  private processingQueue = new Map<string, FunctionExecution[]>(); // functionId -> executions
  private batchTimers = new Map<string, NodeJS.Timeout>(); // functionId -> timer
  private isInitialized = false;

  constructor() {
    this.setupEventListeners();
  }

  /**
   * Initialize integration with Track Edits plugin
   */
  async initialize(): Promise<void> {
    try {
      // Check if Track Edits plugin is available
      const trackEditsAvailable = await this.checkTrackEditsAvailability();
      if (!trackEditsAvailable) {
        throw new TrackEditsIntegrationError(
          'Track Edits plugin is not available',
          'system'
        );
      }

      // Set up global event forwarding
      this.setupTrackEditsEventForwarding();
      
      this.isInitialized = true;
      console.log('[TrackEditsIntegrationManager] Initialized successfully');
      
    } catch (error) {
      console.error('[TrackEditsIntegrationManager] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Configure integration for a specific function
   */
  configureFunction(
    functionId: string, 
    config: Partial<TrackEditsIntegrationConfig>
  ): void {
    try {
      const existingIntegration = this.integrations.get(functionId);
      
      const integration: TrackEditsIntegration = {
        functionId,
        configuration: {
          batchingStrategy: 'smart-batch',
          clusterStrategy: 'semantic',
          confidenceThreshold: 0.7,
          changeCategories: ['grammar', 'style', 'content'],
          requiresReview: false,
          functionSpecificSettings: this.createDefaultFunctionSettings(),
          outputRouting: this.createDefaultOutputRouting(),
          changeMapping: this.createDefaultChangeMapping(),
          reviewWorkflow: this.createDefaultReviewWorkflow(),
          ...config
        },
        isEnabled: true,
        statistics: existingIntegration?.statistics || this.createEmptyStats(),
        lastSync: new Date()
      };

      this.integrations.set(functionId, integration);
      
      this.emitIntegrationEvent(
        functionId,
        IntegrationEventType.CONFIGURED,
        { configuration: integration.configuration },
        true
      );

    } catch (error) {
      console.error(`[TrackEditsIntegrationManager] Error configuring function ${functionId}:`, error);
      throw new TrackEditsIntegrationError(
        `Failed to configure function: ${(error as Error).message}`,
        functionId,
        undefined,
        error as Error
      );
    }
  }

  /**
   * Route function execution output through Track Edits
   */
  async routeExecutionOutput(execution: FunctionExecution): Promise<void> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const integration = this.integrations.get(execution.functionId);
      if (!integration || !integration.isEnabled) {
        console.warn(`[TrackEditsIntegrationManager] Integration not configured for function ${execution.functionId}`);
        return;
      }

      // Validate execution
      if (execution.status !== 'completed' || !execution.output) {
        console.warn(`[TrackEditsIntegrationManager] Execution ${execution.id} not ready for routing`);
        return;
      }

      // Process based on batching strategy
      await this.processExecutionBasedOnStrategy(execution, integration);

      // Update statistics
      this.updateStatistics(integration, execution);

    } catch (error) {
      console.error(`[TrackEditsIntegrationManager] Error routing execution output:`, error);
      this.emitIntegrationEvent(
        execution.functionId,
        IntegrationEventType.ERROR_OCCURRED,
        { executionId: execution.id, error: (error as Error).message },
        false
      );
      
      throw new TrackEditsIntegrationError(
        `Failed to route execution output: ${(error as Error).message}`,
        execution.functionId,
        undefined,
        error as Error
      );
    }
  }

  /**
   * Enable integration for a function
   */
  enableIntegration(functionId: string): void {
    const integration = this.integrations.get(functionId);
    if (integration) {
      integration.isEnabled = true;
      integration.lastSync = new Date();
      
      this.emitIntegrationEvent(
        functionId,
        IntegrationEventType.ENABLED,
        { timestamp: new Date() },
        true
      );
    }
  }

  /**
   * Disable integration for a function
   */
  disableIntegration(functionId: string): void {
    const integration = this.integrations.get(functionId);
    if (integration) {
      integration.isEnabled = false;
      integration.lastSync = new Date();
      
      // Clear any pending batches
      this.clearPendingBatch(functionId);
      
      this.emitIntegrationEvent(
        functionId,
        IntegrationEventType.DISABLED,
        { timestamp: new Date() },
        true
      );
    }
  }

  /**
   * Get integration configuration for a function
   */
  getIntegration(functionId: string): TrackEditsIntegration | null {
    return this.integrations.get(functionId) || null;
  }

  /**
   * Get statistics for all integrations
   */
  getAllStats(): Map<string, TrackEditsStats> {
    const stats = new Map<string, TrackEditsStats>();
    
    this.integrations.forEach((integration, functionId) => {
      stats.set(functionId, { ...integration.statistics });
    });
    
    return stats;
  }

  /**
   * Update configuration for a function
   */
  updateConfiguration(
    functionId: string, 
    configUpdate: Partial<TrackEditsIntegrationConfig>
  ): void {
    const integration = this.integrations.get(functionId);
    if (integration) {
      integration.configuration = {
        ...integration.configuration,
        ...configUpdate
      };
      integration.lastSync = new Date();
      
      this.emitIntegrationEvent(
        functionId,
        IntegrationEventType.CONFIGURED,
        { configurationUpdate: configUpdate },
        true
      );
    }
  }

  // Private helper methods
  private setupEventListeners(): void {
    globalEventBus.on('function-executed', (event: EventData) => {
      const execution = event.payload as FunctionExecution;
      this.routeExecutionOutput(execution).catch(error => {
        console.error('[TrackEditsIntegrationManager] Error handling function execution:', error);
      });
    });

    globalEventBus.on('function-registered', (event: EventData) => {
      const functionDef = event.payload as FunctionDefinition;
      if (functionDef.trackEditsConfig) {
        this.configureFunction(functionDef.id, functionDef.trackEditsConfig);
      }
    });
  }

  private async checkTrackEditsAvailability(): Promise<boolean> {
    try {
      // Check if Track Edits API is available through global event bus
      return new Promise((resolve) => {
        const timeout = setTimeout(() => resolve(false), 1000);
        
        globalEventBus.once('track-edits-ping-response', () => {
          clearTimeout(timeout);
          resolve(true);
        });
        
        globalEventBus.emit('track-edits-ping', {}, 'integration-manager');
      });
    } catch {
      return false;
    }
  }

  private setupTrackEditsEventForwarding(): void {
    // Set up bidirectional event forwarding with Track Edits
    globalEventBus.on('track-edits-change-processed', (event: EventData) => {
      const { functionId, changeId, status } = event.payload;
      const integration = this.integrations.get(functionId);
      
      if (integration) {
        // Update statistics based on processing result
        if (status === 'approved') {
          integration.statistics.autoApprovedChanges++;
        } else if (status === 'rejected') {
          integration.statistics.rejectedChanges++;
        } else if (status === 'review-required') {
          integration.statistics.reviewRequiredChanges++;
        }
        
        integration.statistics.lastUpdated = new Date();
      }
    });
  }

  private async processExecutionBasedOnStrategy(
    execution: FunctionExecution,
    integration: TrackEditsIntegration
  ): Promise<void> {
    const strategy = integration.configuration.functionSpecificSettings.batchingBehavior.strategy;

    switch (strategy) {
      case 'immediate':
        await this.processImmediately(execution, integration);
        break;
        
      case 'smart-batch':
        await this.addToSmartBatch(execution, integration);
        break;
        
      case 'time-delayed':
        await this.addToTimedBatch(execution, integration);
        break;
        
      case 'content-aware':
        await this.addToContentAwareBatch(execution, integration);
        break;
        
      default:
        await this.processImmediately(execution, integration);
    }
  }

  private async processImmediately(
    execution: FunctionExecution,
    integration: TrackEditsIntegration
  ): Promise<void> {
    const changes = await this.convertExecutionToChanges(execution, integration);
    await this.sendChangesToTrackEdits(changes, integration);
    
    this.emitIntegrationEvent(
      execution.functionId,
      IntegrationEventType.CHANGE_ROUTED,
      { executionId: execution.id, changeCount: changes.length, strategy: 'immediate' },
      true
    );
  }

  private async addToSmartBatch(
    execution: FunctionExecution,
    integration: TrackEditsIntegration
  ): Promise<void> {
    const functionId = execution.functionId;
    
    if (!this.processingQueue.has(functionId)) {
      this.processingQueue.set(functionId, []);
    }
    
    this.processingQueue.get(functionId)!.push(execution);
    
    // Check if batch should be processed now
    const batch = this.processingQueue.get(functionId)!;
    const config = integration.configuration.functionSpecificSettings.batchingBehavior;
    
    if (batch.length >= config.maxBatchSize) {
      await this.processBatch(functionId, integration);
    } else {
      // Set up or reset timer
      this.resetBatchTimer(functionId, integration);
    }
  }

  private async addToTimedBatch(
    execution: FunctionExecution,
    integration: TrackEditsIntegration
  ): Promise<void> {
    const functionId = execution.functionId;
    
    if (!this.processingQueue.has(functionId)) {
      this.processingQueue.set(functionId, []);
    }
    
    this.processingQueue.get(functionId)!.push(execution);
    
    // Always use timer for time-delayed strategy
    this.resetBatchTimer(functionId, integration);
  }

  private async addToContentAwareBatch(
    execution: FunctionExecution,
    integration: TrackEditsIntegration
  ): Promise<void> {
    // Analyze content characteristics to determine batching behavior
    const contentComplexity = this.analyzeContentComplexity(execution.output || '');
    
    if (contentComplexity === 'simple') {
      // Simple content can be batched more aggressively
      await this.addToTimedBatch(execution, integration);
    } else {
      // Complex content should be processed more quickly
      await this.processImmediately(execution, integration);
    }
  }

  private resetBatchTimer(functionId: string, integration: TrackEditsIntegration): void {
    // Clear existing timer
    const existingTimer = this.batchTimers.get(functionId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }
    
    // Set new timer
    const delay = integration.configuration.functionSpecificSettings.batchingBehavior.delay;
    const timer = setTimeout(() => {
      this.processBatch(functionId, integration).catch(error => {
        console.error(`[TrackEditsIntegrationManager] Error processing batch for ${functionId}:`, error);
      });
    }, delay);
    
    this.batchTimers.set(functionId, timer);
  }

  private async processBatch(functionId: string, integration: TrackEditsIntegration): Promise<void> {
    const batch = this.processingQueue.get(functionId) || [];
    if (batch.length === 0) return;
    
    try {
      // Clear the batch and timer
      this.processingQueue.set(functionId, []);
      this.clearBatchTimer(functionId);
      
      // Convert all executions to changes
      const allChanges: Change[] = [];
      for (const execution of batch) {
        const changes = await this.convertExecutionToChanges(execution, integration);
        allChanges.push(...changes);
      }
      
      // Apply clustering if configured
      const clusteredChanges = await this.clusterChanges(allChanges, integration);
      
      // Send to Track Edits
      await this.sendChangesToTrackEdits(clusteredChanges, integration);
      
      this.emitIntegrationEvent(
        functionId,
        IntegrationEventType.CHANGE_ROUTED,
        { 
          batchSize: batch.length, 
          changeCount: clusteredChanges.length, 
          strategy: 'batch' 
        },
        true
      );
      
    } catch (error) {
      console.error(`[TrackEditsIntegrationManager] Error processing batch:`, error);
      // Re-queue failed executions for retry
      this.processingQueue.set(functionId, batch);
    }
  }

  private async convertExecutionToChanges(
    execution: FunctionExecution,
    integration: TrackEditsIntegration
  ): Promise<Change[]> {
    const changes: Change[] = [];
    
    if (!execution.output) return changes;
    
    // Apply preprocessors
    const preprocessedOutput = await this.applyPreprocessors(
      execution.output,
      integration.configuration.outputRouting.preprocessors
    );
    
    // Parse the output and convert to changes
    // This is a simplified implementation - in reality, this would involve
    // sophisticated parsing of the AI output to identify specific changes
    const change: Change = {
      id: `${execution.id}-${Date.now()}`,
      type: ChangeType.REPLACE,
      timestamp: execution.endTime?.getTime() || Date.now(),
      source: this.mapFunctionToSource(execution.functionId, integration),
      confidence: execution.confidence || 0.8,
      content: {
        before: execution.input,
        after: preprocessedOutput
      },
      position: {
        start: 0,
        end: execution.input.length
      },
      category: this.mapFunctionToCategory(execution.functionId, integration),
      status: this.determineInitialStatus(execution, integration),
      metadata: {
        functionId: execution.functionId,
        executionId: execution.id,
        reason: 'AI editorial function output',
        context: execution.metadata?.context
      }
    };
    
    // Apply postprocessors
    const enrichedChange = await this.applyPostprocessors(change, integration.configuration.outputRouting.postprocessors);
    changes.push(enrichedChange);
    
    return changes;
  }

  private async applyPreprocessors(output: string, preprocessors: PreprocessorConfig[]): Promise<string> {
    let processedOutput = output;
    
    // Sort by priority
    const sortedPreprocessors = preprocessors
      .filter(p => p.enabled)
      .sort((a, b) => a.priority - b.priority);
    
    for (const processor of sortedPreprocessors) {
      try {
        processedOutput = await this.runPreprocessor(processedOutput, processor);
      } catch (error) {
        console.warn(`[TrackEditsIntegrationManager] Preprocessor ${processor.id} failed:`, error);
      }
    }
    
    return processedOutput;
  }

  private async applyPostprocessors(change: Change, postprocessors: PostprocessorConfig[]): Promise<Change> {
    let processedChange = { ...change };
    
    // Sort by priority
    const sortedPostprocessors = postprocessors
      .filter(p => p.enabled)
      .sort((a, b) => a.priority - b.priority);
    
    for (const processor of sortedPostprocessors) {
      try {
        processedChange = await this.runPostprocessor(processedChange, processor);
      } catch (error) {
        console.warn(`[TrackEditsIntegrationManager] Postprocessor ${processor.id} failed:`, error);
      }
    }
    
    return processedChange;
  }

  private async runPreprocessor(output: string, processor: PreprocessorConfig): Promise<string> {
    switch (processor.type) {
      case 'text-cleanup':
        return output.trim().replace(/\s+/g, ' ');
      case 'format-normalize':
        return this.normalizeFormat(output, processor.parameters);
      case 'context-extract':
        return this.extractContext(output, processor.parameters);
      default:
        return output;
    }
  }

  private async runPostprocessor(change: Change, processor: PostprocessorConfig): Promise<Change> {
    const processed = { ...change };
    
    switch (processor.type) {
      case 'confidence-adjust':
        processed.confidence = this.adjustConfidence(change.confidence, processor.parameters);
        break;
      case 'category-refine':
        processed.category = this.refineCategory(change.category, processor.parameters);
        break;
      case 'metadata-enrich':
        processed.metadata = {
          ...processed.metadata,
          ...this.enrichMetadata(change, processor.parameters)
        };
        break;
    }
    
    return processed;
  }

  private async clusterChanges(changes: Change[], integration: TrackEditsIntegration): Promise<Change[]> {
    const strategy = integration.configuration.functionSpecificSettings.clusteringRules.strategy;
    
    switch (strategy) {
      case 'semantic':
        return this.clusterBySemantic(changes, integration);
      case 'paragraph':
        return this.clusterByParagraph(changes);
      case 'sentence':
        return this.clusterBySentence(changes);
      case 'function-type':
        return this.clusterByFunctionType(changes);
      default:
        return changes;
    }
  }

  private async sendChangesToTrackEdits(changes: Change[], integration: TrackEditsIntegration): Promise<void> {
    try {
      globalEventBus.emit('track-edits-process-changes', {
        changes,
        functionId: integration.functionId,
        configuration: integration.configuration
      }, 'integration-manager');
      
      // Update statistics
      integration.statistics.totalChangesRouted += changes.length;
      integration.statistics.lastUpdated = new Date();
      
    } catch (error) {
      console.error('[TrackEditsIntegrationManager] Error sending changes to Track Edits:', error);
      throw error;
    }
  }

  private clearPendingBatch(functionId: string): void {
    this.processingQueue.delete(functionId);
    this.clearBatchTimer(functionId);
  }

  private clearBatchTimer(functionId: string): void {
    const timer = this.batchTimers.get(functionId);
    if (timer) {
      clearTimeout(timer);
      this.batchTimers.delete(functionId);
    }
  }

  private analyzeContentComplexity(content: string): 'simple' | 'medium' | 'complex' {
    const wordCount = content.split(/\s+/).length;
    const sentenceCount = content.split(/[.!?]+/).length;
    const avgWordsPerSentence = wordCount / sentenceCount;
    
    if (wordCount < 50 && avgWordsPerSentence < 15) {
      return 'simple';
    } else if (wordCount < 200 && avgWordsPerSentence < 25) {
      return 'medium';
    } else {
      return 'complex';
    }
  }

  // Helper methods for creating default configurations
  private createDefaultFunctionSettings(): FunctionSpecificSettings {
    return {
      batchingBehavior: {
        strategy: 'smart-batch',
        delay: 2000,
        maxBatchSize: 5,
        contextAwareness: true
      },
      clusteringRules: {
        strategy: 'semantic',
        semanticSimilarityThreshold: 0.8,
        contextWindowSize: 100,
        customRules: []
      },
      qualityGates: {
        minimumConfidence: 0.6,
        autoApplyThreshold: 0.9,
        requireReviewThreshold: 0.7,
        rejectThreshold: 0.3
      }
    };
  }

  private createDefaultOutputRouting(): OutputRoutingConfig {
    return {
      routingMode: 'processed',
      preprocessors: [
        {
          id: 'text-cleanup',
          type: 'text-cleanup',
          enabled: true,
          parameters: {},
          priority: 1
        }
      ],
      postprocessors: [
        {
          id: 'confidence-adjust',
          type: 'confidence-adjust',
          enabled: true,
          parameters: { adjustment: 0 },
          priority: 1
        }
      ],
      changeEnrichment: {
        includeConfidence: true,
        includeFunctionContext: true,
        includeReasoningChain: false,
        includeAlternatives: false,
        includeSuggestionMetrics: true
      }
    };
  }

  private createDefaultChangeMapping(): ChangeMappingConfig {
    return {
      functionToChangeMapping: new Map([
        ['copy-editor', ChangeCategory.STYLE],
        ['proofreader', ChangeCategory.GRAMMAR],
        ['developmental-editor', ChangeCategory.STRUCTURE],
        ['co-writer', ChangeCategory.CONTENT]
      ]),
      confidenceToSourceMapping: new Map([
        ['high', ChangeSource.AI_CONTENT],
        ['medium', ChangeSource.AI_STYLE],
        ['low', ChangeSource.AI_GRAMMAR]
      ]),
      customMappings: []
    };
  }

  private createDefaultReviewWorkflow(): ReviewWorkflowConfig {
    return {
      autoApprovalRules: [
        {
          id: 'high-confidence',
          condition: { confidenceThreshold: 0.9 },
          action: 'auto-approve',
          priority: 1
        }
      ],
      reviewAssignmentRules: [],
      escalationRules: [],
      reviewTimeouts: {
        defaultTimeout: 24 * 60 * 60 * 1000, // 24 hours
        categoryTimeouts: new Map(),
        urgentTimeout: 2 * 60 * 60 * 1000,  // 2 hours
        escalationTimeout: 48 * 60 * 60 * 1000 // 48 hours
      }
    };
  }

  private createEmptyStats(): TrackEditsStats {
    return {
      totalChangesRouted: 0,
      autoApprovedChanges: 0,
      reviewRequiredChanges: 0,
      rejectedChanges: 0,
      averageProcessingTime: 0,
      averageConfidenceScore: 0,
      lastUpdated: new Date()
    };
  }

  private updateStatistics(integration: TrackEditsIntegration, execution: FunctionExecution): void {
    const stats = integration.statistics;
    
    // Update processing time
    if (execution.duration) {
      const currentTotal = stats.averageProcessingTime * stats.totalChangesRouted;
      stats.averageProcessingTime = (currentTotal + execution.duration) / (stats.totalChangesRouted + 1);
    }
    
    // Update confidence score
    if (execution.confidence) {
      const currentTotal = stats.averageConfidenceScore * stats.totalChangesRouted;
      stats.averageConfidenceScore = (currentTotal + execution.confidence) / (stats.totalChangesRouted + 1);
    }
    
    stats.lastUpdated = new Date();
  }

  // Mapping helper methods
  private mapFunctionToSource(functionId: string, integration: TrackEditsIntegration): ChangeSource {
    // Implementation would map function type to appropriate source
    return ChangeSource.AI_CONTENT;
  }

  private mapFunctionToCategory(functionId: string, integration: TrackEditsIntegration): ChangeCategory {
    const mapping = integration.configuration.changeMapping.functionToChangeMapping.get(functionId);
    return mapping || ChangeCategory.CONTENT;
  }

  private determineInitialStatus(execution: FunctionExecution, integration: TrackEditsIntegration): any {
    const confidence = execution.confidence || 0;
    const qualityGates = integration.configuration.functionSpecificSettings.qualityGates;
    
    if (confidence >= qualityGates.autoApplyThreshold) {
      return 'approved';
    } else if (confidence >= qualityGates.requireReviewThreshold) {
      return 'pending-review';
    } else if (confidence >= qualityGates.minimumConfidence) {
      return 'pending';
    } else {
      return 'rejected';
    }
  }

  // Format and processing helper methods
  private normalizeFormat(output: string, parameters: Record<string, any>): string {
    // Implementation for format normalization
    return output;
  }

  private extractContext(output: string, parameters: Record<string, any>): string {
    // Implementation for context extraction
    return output;
  }

  private adjustConfidence(confidence: number, parameters: Record<string, any>): number {
    const adjustment = parameters.adjustment || 0;
    return Math.max(0, Math.min(1, confidence + adjustment));
  }

  private refineCategory(category: ChangeCategory, parameters: Record<string, any>): ChangeCategory {
    // Implementation for category refinement
    return category;
  }

  private enrichMetadata(change: Change, parameters: Record<string, any>): Record<string, any> {
    return {
      enrichedAt: new Date(),
      processorVersion: '1.0'
    };
  }

  // Clustering helper methods
  private async clusterBySemantic(changes: Change[], integration: TrackEditsIntegration): Promise<Change[]> {
    // Implementation for semantic clustering
    return changes;
  }

  private clusterByParagraph(changes: Change[]): Change[] {
    // Implementation for paragraph clustering
    return changes;
  }

  private clusterBySentence(changes: Change[]): Change[] {
    // Implementation for sentence clustering
    return changes;
  }

  private clusterByFunctionType(changes: Change[]): Change[] {
    // Implementation for function type clustering
    return changes;
  }

  private emitIntegrationEvent(
    functionId: string,
    eventType: IntegrationEventType,
    data: any,
    success: boolean,
    error?: string
  ): void {
    const event: IntegrationEvent = {
      type: IntegrationType.TRACK_EDITS,
      functionId,
      eventType,
      data,
      timestamp: new Date(),
      success,
      error
    };

    globalEventBus.emit('integration-event', event, 'track-edits-integration');
  }

  dispose(): void {
    // Clean up timers
    this.batchTimers.forEach(timer => clearTimeout(timer));
    this.batchTimers.clear();
    
    // Clear queues
    this.processingQueue.clear();
  }
}

// Export singleton instance
export const trackEditsIntegrationManager = new TrackEditsIntegrationManager();