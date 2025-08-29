/**
 * Event Filtering System for Preventing Feedback Loops
 * 
 * This system provides comprehensive event filtering to prevent circular dependencies
 * and feedback loops between plugins in the Writerr Platform ecosystem.
 * 
 * Key Features:
 * - Loop detection algorithms for event chains
 * - Event source tracking and correlation
 * - Plugin interaction mapping
 * - Temporal filtering for rapid-fire events
 * - Event chain analysis and visualization
 */

import { WriterrlEvent, WriterrlEventV2 } from './event-bus-integration';

// ============================================================================
// Core Types and Interfaces
// ============================================================================

export interface EventChainNode {
  eventId: string;
  eventType: string;
  sourcePlugin: string;
  timestamp: number;
  sessionId?: string;
  parentEventId?: string;
  depth: number;
  correlationId: string;
}

export interface EventLoopDetectionResult {
  hasLoop: boolean;
  loopPath?: EventChainNode[];
  loopType: LoopType;
  severity: LoopSeverity;
  preventionAction: PreventionAction;
}

export enum LoopType {
  DIRECT_CIRCULAR = 'direct_circular',           // A → B → A
  INDIRECT_CIRCULAR = 'indirect_circular',       // A → B → C → A
  OSCILLATING = 'oscillating',                   // A ↔ B ↔ A (rapid back-and-forth)
  CASCADE_FEEDBACK = 'cascade_feedback',         // Multiple events causing exponential growth
  TEMPORAL_LOOP = 'temporal_loop'                // Time-based rapid firing
}

export enum LoopSeverity {
  LOW = 'low',           // Manageable, warning only
  MEDIUM = 'medium',     // Requires intervention
  HIGH = 'high',         // Immediate termination needed
  CRITICAL = 'critical'  // System stability threat
}

export enum PreventionAction {
  ALLOW = 'allow',                    // Event passes through
  WARN = 'warn',                      // Log warning but allow
  DELAY = 'delay',                    // Introduce delay before processing
  THROTTLE = 'throttle',              // Rate limit similar events
  BLOCK = 'block',                    // Prevent event processing
  TERMINATE_CHAIN = 'terminate_chain'  // Stop entire event chain
}

export interface EventFrequencyTracker {
  eventType: string;
  sourcePlugin: string;
  count: number;
  firstOccurrence: number;
  lastOccurrence: number;
  averageInterval: number;
  isRunaway: boolean;
}

export interface PluginInteractionMap {
  sourcePlugin: string;
  targetPlugin: string;
  eventTypes: string[];
  frequency: number;
  lastInteraction: number;
  riskScore: number;
}

export interface EventFilteringConfig {
  // Loop Detection Settings
  maxEventChainDepth: number;
  loopDetectionWindowMs: number;
  circularReferenceThreshold: number;
  
  // Frequency Control
  maxEventsPerSecond: number;
  rapidFireThresholdMs: number;
  runawayEventThreshold: number;
  
  // Plugin Interaction Limits
  maxPluginInteractionsPerSecond: number;
  pluginCooldownMs: number;
  
  // Performance Settings
  eventHistoryLimit: number;
  correlationCleanupIntervalMs: number;
  
  // Filtering Behavior
  enableLoopPrevention: boolean;
  enableFrequencyThrottling: boolean;
  enablePluginIsolation: boolean;
  debugMode: boolean;
}

export interface EventCorrelationData {
  correlationId: string;
  rootEventId: string;
  eventChain: EventChainNode[];
  createdAt: number;
  lastUpdated: number;
  isActive: boolean;
  riskScore: number;
}

// ============================================================================
// Event Filtering System Implementation
// ============================================================================

export class EventFilteringSystem {
  private config: EventFilteringConfig;
  private eventHistory: Map<string, EventChainNode> = new Map();
  private eventCorrelations: Map<string, EventCorrelationData> = new Map();
  private pluginInteractions: Map<string, PluginInteractionMap> = new Map();
  private frequencyTrackers: Map<string, EventFrequencyTracker> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;
  private debugMode: boolean = false;

  constructor(config: Partial<EventFilteringConfig> = {}) {
    this.config = {
      maxEventChainDepth: 10,
      loopDetectionWindowMs: 30000, // 30 seconds
      circularReferenceThreshold: 3,
      maxEventsPerSecond: 50,
      rapidFireThresholdMs: 100,
      runawayEventThreshold: 20,
      maxPluginInteractionsPerSecond: 25,
      pluginCooldownMs: 500,
      eventHistoryLimit: 1000,
      correlationCleanupIntervalMs: 60000, // 1 minute
      enableLoopPrevention: true,
      enableFrequencyThrottling: true,
      enablePluginIsolation: true,
      debugMode: false,
      ...config
    };

    this.debugMode = this.config.debugMode;
    this.startCleanupTimer();
  }

  /**
   * Main filtering method - analyzes event for potential feedback loops
   */
  async shouldProcessEvent(event: WriterrlEvent | WriterrlEventV2): Promise<EventLoopDetectionResult> {
    const startTime = Date.now();

    try {
      // Create event chain node
      const eventNode = this.createEventChainNode(event);
      
      // Perform multiple filtering checks
      const results = await Promise.all([
        this.detectDirectLoop(eventNode),
        this.detectFrequencyLoop(eventNode),
        this.detectPluginInteractionLoop(eventNode),
        this.detectTemporalLoop(eventNode)
      ]);

      // Combine results and determine final action
      const combinedResult = this.combineDetectionResults(results);

      // Update tracking data
      this.updateEventHistory(eventNode);
      this.updateFrequencyTracking(eventNode);
      this.updatePluginInteractionTracking(eventNode);
      this.updateCorrelationData(eventNode, combinedResult);

      // Log filtering decision
      if (this.debugMode) {
        console.log(`[EventFiltering] Event ${event.type} from ${event.sourcePlugin}: ${combinedResult.preventionAction} (${Date.now() - startTime}ms)`);
      }

      return combinedResult;

    } catch (error) {
      console.error('[EventFiltering] Error in shouldProcessEvent:', error);
      
      // Fail-safe: allow event but log error
      return {
        hasLoop: false,
        loopType: LoopType.DIRECT_CIRCULAR,
        severity: LoopSeverity.LOW,
        preventionAction: PreventionAction.ALLOW
      };
    }
  }

  /**
   * Detect direct circular references in event chains
   */
  private async detectDirectLoop(eventNode: EventChainNode): Promise<EventLoopDetectionResult> {
    if (!this.config.enableLoopPrevention) {
      return this.createAllowResult();
    }

    // Check for immediate circular reference
    const correlationData = this.eventCorrelations.get(eventNode.correlationId);
    if (correlationData) {
      const eventChain = correlationData.eventChain;
      
      // Look for the same event type from the same plugin in the chain
      const similarEvents = eventChain.filter(node => 
        node.eventType === eventNode.eventType && 
        node.sourcePlugin === eventNode.sourcePlugin
      );

      if (similarEvents.length >= this.config.circularReferenceThreshold) {
        return {
          hasLoop: true,
          loopPath: [...eventChain, eventNode],
          loopType: LoopType.DIRECT_CIRCULAR,
          severity: LoopSeverity.HIGH,
          preventionAction: PreventionAction.BLOCK
        };
      }

      // Check for plugin ping-pong effect
      if (eventChain.length >= 2) {
        const lastEvent = eventChain[eventChain.length - 1];
        const secondLastEvent = eventChain[eventChain.length - 2];
        
        if (lastEvent.sourcePlugin === eventNode.sourcePlugin &&
            secondLastEvent.sourcePlugin === lastEvent.sourcePlugin &&
            Date.now() - lastEvent.timestamp < this.config.rapidFireThresholdMs) {
          
          return {
            hasLoop: true,
            loopPath: [secondLastEvent, lastEvent, eventNode],
            loopType: LoopType.OSCILLATING,
            severity: LoopSeverity.MEDIUM,
            preventionAction: PreventionAction.THROTTLE
          };
        }
      }
    }

    return this.createAllowResult();
  }

  /**
   * Detect frequency-based loops (runaway event generation)
   */
  private async detectFrequencyLoop(eventNode: EventChainNode): Promise<EventLoopDetectionResult> {
    if (!this.config.enableFrequencyThrottling) {
      return this.createAllowResult();
    }

    const frequencyKey = `${eventNode.sourcePlugin}:${eventNode.eventType}`;
    const tracker = this.frequencyTrackers.get(frequencyKey);

    if (tracker) {
      const timeDiff = eventNode.timestamp - tracker.firstOccurrence;
      const eventsPerSecond = (tracker.count * 1000) / Math.max(timeDiff, 1);

      if (eventsPerSecond > this.config.maxEventsPerSecond) {
        return {
          hasLoop: true,
          loopType: LoopType.CASCADE_FEEDBACK,
          severity: LoopSeverity.HIGH,
          preventionAction: PreventionAction.THROTTLE
        };
      }

      if (tracker.count > this.config.runawayEventThreshold) {
        return {
          hasLoop: true,
          loopType: LoopType.CASCADE_FEEDBACK,
          severity: LoopSeverity.CRITICAL,
          preventionAction: PreventionAction.TERMINATE_CHAIN
        };
      }
    }

    return this.createAllowResult();
  }

  /**
   * Detect plugin interaction loops
   */
  private async detectPluginInteractionLoop(eventNode: EventChainNode): Promise<EventLoopDetectionResult> {
    if (!this.config.enablePluginIsolation) {
      return this.createAllowResult();
    }

    // Check for excessive plugin interactions
    const interactionKey = eventNode.sourcePlugin;
    const interactions = Array.from(this.pluginInteractions.values())
      .filter(interaction => interaction.sourcePlugin === interactionKey);

    const recentInteractions = interactions.filter(interaction => 
      eventNode.timestamp - interaction.lastInteraction < 1000
    );

    if (recentInteractions.length > this.config.maxPluginInteractionsPerSecond) {
      return {
        hasLoop: true,
        loopType: LoopType.INDIRECT_CIRCULAR,
        severity: LoopSeverity.MEDIUM,
        preventionAction: PreventionAction.DELAY
      };
    }

    return this.createAllowResult();
  }

  /**
   * Detect temporal loops (rapid-fire events)
   */
  private async detectTemporalLoop(eventNode: EventChainNode): Promise<EventLoopDetectionResult> {
    const recentEvents = Array.from(this.eventHistory.values())
      .filter(node => 
        node.sourcePlugin === eventNode.sourcePlugin &&
        node.eventType === eventNode.eventType &&
        eventNode.timestamp - node.timestamp < this.config.rapidFireThresholdMs
      );

    if (recentEvents.length >= 3) {
      return {
        hasLoop: true,
        loopPath: [...recentEvents, eventNode],
        loopType: LoopType.TEMPORAL_LOOP,
        severity: LoopSeverity.MEDIUM,
        preventionAction: PreventionAction.DELAY
      };
    }

    return this.createAllowResult();
  }

  /**
   * Combine multiple detection results into final decision
   */
  private combineDetectionResults(results: EventLoopDetectionResult[]): EventLoopDetectionResult {
    // Find the most severe result
    const hasAnyLoop = results.some(r => r.hasLoop);
    if (!hasAnyLoop) {
      return this.createAllowResult();
    }

    // Sort by severity and get the most critical
    const severityOrder = [LoopSeverity.CRITICAL, LoopSeverity.HIGH, LoopSeverity.MEDIUM, LoopSeverity.LOW];
    const mostSevere = results
      .filter(r => r.hasLoop)
      .sort((a, b) => severityOrder.indexOf(a.severity) - severityOrder.indexOf(b.severity))[0];

    return mostSevere;
  }

  /**
   * Create event chain node from event
   */
  private createEventChainNode(event: WriterrlEvent | WriterrlEventV2): EventChainNode {
    const eventId = this.generateEventId(event);
    const correlationId = this.getOrCreateCorrelationId(event);
    
    return {
      eventId,
      eventType: event.type,
      sourcePlugin: event.sourcePlugin,
      timestamp: Date.now(),
      sessionId: event.sessionId,
      parentEventId: this.getParentEventId(event),
      depth: this.calculateEventDepth(correlationId),
      correlationId
    };
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(event: WriterrlEvent | WriterrlEventV2): string {
    return `${event.sourcePlugin}-${event.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get or create correlation ID for event chain tracking
   */
  private getOrCreateCorrelationId(event: WriterrlEvent | WriterrlEventV2): string {
    // Check if this event has a correlation context
    if ('correlationId' in event && event.correlationId) {
      return event.correlationId;
    }

    // Create new correlation ID
    return `correlation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get parent event ID from event context
   */
  private getParentEventId(event: WriterrlEvent | WriterrlEventV2): string | undefined {
    if ('parentEventId' in event) {
      return event.parentEventId;
    }
    return undefined;
  }

  /**
   * Calculate event depth in chain
   */
  private calculateEventDepth(correlationId: string): number {
    const correlationData = this.eventCorrelations.get(correlationId);
    return correlationData ? correlationData.eventChain.length : 0;
  }

  /**
   * Update event history
   */
  private updateEventHistory(eventNode: EventChainNode): void {
    this.eventHistory.set(eventNode.eventId, eventNode);

    // Cleanup old events
    if (this.eventHistory.size > this.config.eventHistoryLimit) {
      const oldestEvents = Array.from(this.eventHistory.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp)
        .slice(0, Math.floor(this.config.eventHistoryLimit * 0.1));
      
      oldestEvents.forEach(([eventId]) => {
        this.eventHistory.delete(eventId);
      });
    }
  }

  /**
   * Update frequency tracking
   */
  private updateFrequencyTracking(eventNode: EventChainNode): void {
    const frequencyKey = `${eventNode.sourcePlugin}:${eventNode.eventType}`;
    const existing = this.frequencyTrackers.get(frequencyKey);

    if (existing) {
      existing.count++;
      existing.lastOccurrence = eventNode.timestamp;
      existing.averageInterval = (eventNode.timestamp - existing.firstOccurrence) / existing.count;
      existing.isRunaway = existing.count > this.config.runawayEventThreshold;
    } else {
      this.frequencyTrackers.set(frequencyKey, {
        eventType: eventNode.eventType,
        sourcePlugin: eventNode.sourcePlugin,
        count: 1,
        firstOccurrence: eventNode.timestamp,
        lastOccurrence: eventNode.timestamp,
        averageInterval: 0,
        isRunaway: false
      });
    }
  }

  /**
   * Update plugin interaction tracking
   */
  private updatePluginInteractionTracking(eventNode: EventChainNode): void {
    // This would be enhanced with actual target plugin detection
    // For now, we track source plugin activity
    const interactionKey = eventNode.sourcePlugin;
    
    if (!this.pluginInteractions.has(interactionKey)) {
      this.pluginInteractions.set(interactionKey, {
        sourcePlugin: eventNode.sourcePlugin,
        targetPlugin: 'unknown', // Would be detected from event analysis
        eventTypes: [eventNode.eventType],
        frequency: 1,
        lastInteraction: eventNode.timestamp,
        riskScore: 0
      });
    } else {
      const interaction = this.pluginInteractions.get(interactionKey)!;
      interaction.frequency++;
      interaction.lastInteraction = eventNode.timestamp;
      interaction.riskScore = this.calculateRiskScore(interaction);
      
      if (!interaction.eventTypes.includes(eventNode.eventType)) {
        interaction.eventTypes.push(eventNode.eventType);
      }
    }
  }

  /**
   * Calculate risk score for plugin interactions
   */
  private calculateRiskScore(interaction: PluginInteractionMap): number {
    const timeDiff = Date.now() - interaction.lastInteraction;
    const frequencyScore = Math.min(interaction.frequency / 100, 1);
    const recencyScore = Math.max(1 - (timeDiff / 60000), 0); // Decay over 1 minute
    const diversityScore = Math.min(interaction.eventTypes.length / 10, 1);
    
    return (frequencyScore * 0.5) + (recencyScore * 0.3) + (diversityScore * 0.2);
  }

  /**
   * Update correlation data
   */
  private updateCorrelationData(eventNode: EventChainNode, result: EventLoopDetectionResult): void {
    const existing = this.eventCorrelations.get(eventNode.correlationId);
    
    if (existing) {
      existing.eventChain.push(eventNode);
      existing.lastUpdated = eventNode.timestamp;
      existing.riskScore = this.calculateCorrelationRiskScore(existing, result);
      existing.isActive = result.preventionAction !== PreventionAction.TERMINATE_CHAIN;
    } else {
      this.eventCorrelations.set(eventNode.correlationId, {
        correlationId: eventNode.correlationId,
        rootEventId: eventNode.eventId,
        eventChain: [eventNode],
        createdAt: eventNode.timestamp,
        lastUpdated: eventNode.timestamp,
        isActive: true,
        riskScore: result.hasLoop ? 0.5 : 0
      });
    }
  }

  /**
   * Calculate risk score for correlation data
   */
  private calculateCorrelationRiskScore(correlation: EventCorrelationData, result: EventLoopDetectionResult): number {
    const chainLength = correlation.eventChain.length;
    const lengthScore = Math.min(chainLength / this.config.maxEventChainDepth, 1);
    const loopScore = result.hasLoop ? 0.8 : 0;
    const timeScore = Math.max(1 - ((Date.now() - correlation.lastUpdated) / 30000), 0);
    
    return Math.min((lengthScore * 0.3) + (loopScore * 0.5) + (timeScore * 0.2), 1);
  }

  /**
   * Create allow result
   */
  private createAllowResult(): EventLoopDetectionResult {
    return {
      hasLoop: false,
      loopType: LoopType.DIRECT_CIRCULAR,
      severity: LoopSeverity.LOW,
      preventionAction: PreventionAction.ALLOW
    };
  }

  /**
   * Start cleanup timer
   */
  private startCleanupTimer(): void {
    this.cleanupInterval = setInterval(() => {
      this.performCleanup();
    }, this.config.correlationCleanupIntervalMs);
  }

  /**
   * Perform periodic cleanup
   */
  private performCleanup(): void {
    const now = Date.now();
    
    // Clean up old correlations
    for (const [correlationId, data] of this.eventCorrelations.entries()) {
      if (now - data.lastUpdated > this.config.loopDetectionWindowMs) {
        this.eventCorrelations.delete(correlationId);
      }
    }

    // Clean up old frequency trackers
    for (const [key, tracker] of this.frequencyTrackers.entries()) {
      if (now - tracker.lastOccurrence > 60000) { // 1 minute
        this.frequencyTrackers.delete(key);
      }
    }

    // Clean up old plugin interactions
    for (const [key, interaction] of this.pluginInteractions.entries()) {
      if (now - interaction.lastInteraction > 300000) { // 5 minutes
        this.pluginInteractions.delete(key);
      }
    }

    if (this.debugMode) {
      console.log(`[EventFiltering] Cleanup complete. Active correlations: ${this.eventCorrelations.size}, Frequency trackers: ${this.frequencyTrackers.size}, Plugin interactions: ${this.pluginInteractions.size}`);
    }
  }

  /**
   * Get system statistics
   */
  public getSystemStats(): {
    activeCorrelations: number;
    frequencyTrackers: number;
    pluginInteractions: number;
    eventHistorySize: number;
    highRiskCorrelations: number;
    runawayTrackers: number;
  } {
    const highRiskCorrelations = Array.from(this.eventCorrelations.values())
      .filter(c => c.riskScore > 0.7).length;
    
    const runawayTrackers = Array.from(this.frequencyTrackers.values())
      .filter(t => t.isRunaway).length;

    return {
      activeCorrelations: this.eventCorrelations.size,
      frequencyTrackers: this.frequencyTrackers.size,
      pluginInteractions: this.pluginInteractions.size,
      eventHistorySize: this.eventHistory.size,
      highRiskCorrelations,
      runawayTrackers
    };
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<EventFilteringConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.debugMode = this.config.debugMode;
  }

  /**
   * Get current configuration
   */
  public getConfig(): EventFilteringConfig {
    return { ...this.config };
  }

  /**
   * Dispose and cleanup
   */
  public dispose(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    
    this.eventHistory.clear();
    this.eventCorrelations.clear();
    this.pluginInteractions.clear();
    this.frequencyTrackers.clear();
  }
}

// ============================================================================
// Event Filtering Integration Extensions
// ============================================================================

export interface EventFilteringExtensions {
  // Plugin responsibility boundary definitions
  pluginCapabilities: Map<string, Set<string>>; // plugin -> allowed event types
  eventOwnership: Map<string, string>; // event type -> responsible plugin
  
  // Enhanced filtering methods
  shouldPluginHandleEvent(pluginId: string, eventType: string): boolean;
  getPluginPriority(pluginId: string, eventType: string): number;
  detectEventOwnershipConflict(event: WriterrlEvent | WriterrlEventV2): boolean;
}

/**
 * Enhanced event filtering with plugin responsibility boundaries
 */
export class EnhancedEventFilteringSystem extends EventFilteringSystem implements EventFilteringExtensions {
  public pluginCapabilities = new Map<string, Set<string>>();
  public eventOwnership = new Map<string, string>();
  private pluginPriorities = new Map<string, Map<string, number>>();

  constructor(config: Partial<EventFilteringConfig> = {}) {
    super(config);
    this.initializeDefaultCapabilities();
  }

  /**
   * Initialize default plugin capabilities
   */
  private initializeDefaultCapabilities(): void {
    // Track Edits Plugin capabilities
    this.pluginCapabilities.set('track-edits', new Set([
      'document.change.applied',
      'document.change.reverted',
      'ai.processing.complete',
      'session.synchronization'
    ]));

    // Editorial Engine Plugin capabilities
    this.pluginCapabilities.set('editorial-engine', new Set([
      'ai.processing.start',
      'ai.processing.progress',
      'ai.processing.complete',
      'ai.processing.error',
      'constraint.validation'
    ]));

    // Writerr Chat Plugin capabilities
    this.pluginCapabilities.set('writerr-chat', new Set([
      'session.lifecycle',
      'conversation.message',
      'ai.processing.start',
      'user.interaction'
    ]));

    // Define event ownership
    this.eventOwnership.set('document.change.applied', 'track-edits');
    this.eventOwnership.set('ai.processing.start', 'editorial-engine');
    this.eventOwnership.set('session.lifecycle', 'writerr-chat');
  }

  /**
   * Check if plugin should handle specific event type
   */
  public shouldPluginHandleEvent(pluginId: string, eventType: string): boolean {
    const capabilities = this.pluginCapabilities.get(pluginId);
    if (!capabilities) return false;
    
    return capabilities.has(eventType);
  }

  /**
   * Get plugin priority for event type
   */
  public getPluginPriority(pluginId: string, eventType: string): number {
    const pluginPriorities = this.pluginPriorities.get(pluginId);
    if (!pluginPriorities) return 0;
    
    return pluginPriorities.get(eventType) || 0;
  }

  /**
   * Detect event ownership conflicts
   */
  public detectEventOwnershipConflict(event: WriterrlEvent | WriterrlEventV2): boolean {
    const expectedOwner = this.eventOwnership.get(event.type);
    if (!expectedOwner) return false;
    
    return expectedOwner !== event.sourcePlugin;
  }

  /**
   * Enhanced event filtering with plugin responsibility checks
   */
  public async shouldProcessEvent(event: WriterrlEvent | WriterrlEventV2): Promise<EventLoopDetectionResult> {
    // First run the base filtering
    const baseResult = await super.shouldProcessEvent(event);
    
    // If base filtering blocks, return that result
    if (baseResult.preventionAction === PreventionAction.BLOCK || 
        baseResult.preventionAction === PreventionAction.TERMINATE_CHAIN) {
      return baseResult;
    }

    // Check plugin responsibility boundaries
    if (this.detectEventOwnershipConflict(event)) {
      return {
        hasLoop: true,
        loopType: LoopType.INDIRECT_CIRCULAR,
        severity: LoopSeverity.MEDIUM,
        preventionAction: PreventionAction.WARN
      };
    }

    return baseResult;
  }

  /**
   * Register plugin capabilities
   */
  public registerPluginCapabilities(pluginId: string, capabilities: string[]): void {
    this.pluginCapabilities.set(pluginId, new Set(capabilities));
  }

  /**
   * Set event ownership
   */
  public setEventOwnership(eventType: string, ownerId: string): void {
    this.eventOwnership.set(eventType, ownerId);
  }
}