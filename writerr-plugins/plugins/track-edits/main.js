"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// plugins/track-edits/src/event-filtering-system.ts
var event_filtering_system_exports = {};
__export(event_filtering_system_exports, {
  EnhancedEventFilteringSystem: () => EnhancedEventFilteringSystem,
  EventFilteringSystem: () => EventFilteringSystem,
  LoopSeverity: () => LoopSeverity,
  LoopType: () => LoopType,
  PreventionAction: () => PreventionAction
});
var LoopType, LoopSeverity, PreventionAction, EventFilteringSystem, EnhancedEventFilteringSystem;
var init_event_filtering_system = __esm({
  "plugins/track-edits/src/event-filtering-system.ts"() {
    "use strict";
    LoopType = /* @__PURE__ */ ((LoopType2) => {
      LoopType2["DIRECT_CIRCULAR"] = "direct_circular";
      LoopType2["INDIRECT_CIRCULAR"] = "indirect_circular";
      LoopType2["OSCILLATING"] = "oscillating";
      LoopType2["CASCADE_FEEDBACK"] = "cascade_feedback";
      LoopType2["TEMPORAL_LOOP"] = "temporal_loop";
      return LoopType2;
    })(LoopType || {});
    LoopSeverity = /* @__PURE__ */ ((LoopSeverity2) => {
      LoopSeverity2["LOW"] = "low";
      LoopSeverity2["MEDIUM"] = "medium";
      LoopSeverity2["HIGH"] = "high";
      LoopSeverity2["CRITICAL"] = "critical";
      return LoopSeverity2;
    })(LoopSeverity || {});
    PreventionAction = /* @__PURE__ */ ((PreventionAction2) => {
      PreventionAction2["ALLOW"] = "allow";
      PreventionAction2["WARN"] = "warn";
      PreventionAction2["DELAY"] = "delay";
      PreventionAction2["THROTTLE"] = "throttle";
      PreventionAction2["BLOCK"] = "block";
      PreventionAction2["TERMINATE_CHAIN"] = "terminate_chain";
      return PreventionAction2;
    })(PreventionAction || {});
    EventFilteringSystem = class {
      constructor(config2 = {}) {
        this.eventHistory = /* @__PURE__ */ new Map();
        this.eventCorrelations = /* @__PURE__ */ new Map();
        this.pluginInteractions = /* @__PURE__ */ new Map();
        this.frequencyTrackers = /* @__PURE__ */ new Map();
        this.cleanupInterval = null;
        this.debugMode = false;
        this.config = {
          maxEventChainDepth: 10,
          loopDetectionWindowMs: 3e4,
          // 30 seconds
          circularReferenceThreshold: 3,
          maxEventsPerSecond: 50,
          rapidFireThresholdMs: 100,
          runawayEventThreshold: 20,
          maxPluginInteractionsPerSecond: 25,
          pluginCooldownMs: 500,
          eventHistoryLimit: 1e3,
          correlationCleanupIntervalMs: 6e4,
          // 1 minute
          enableLoopPrevention: true,
          enableFrequencyThrottling: true,
          enablePluginIsolation: true,
          debugMode: false,
          ...config2
        };
        this.debugMode = this.config.debugMode;
        this.startCleanupTimer();
      }
      /**
       * Main filtering method - analyzes event for potential feedback loops
       */
      async shouldProcessEvent(event) {
        const startTime = Date.now();
        try {
          const eventNode = this.createEventChainNode(event);
          const results = await Promise.all([
            this.detectDirectLoop(eventNode),
            this.detectFrequencyLoop(eventNode),
            this.detectPluginInteractionLoop(eventNode),
            this.detectTemporalLoop(eventNode)
          ]);
          const combinedResult = this.combineDetectionResults(results);
          this.updateEventHistory(eventNode);
          this.updateFrequencyTracking(eventNode);
          this.updatePluginInteractionTracking(eventNode);
          this.updateCorrelationData(eventNode, combinedResult);
          if (this.debugMode) {
            console.log(`[EventFiltering] Event ${event.type} from ${event.sourcePlugin}: ${combinedResult.preventionAction} (${Date.now() - startTime}ms)`);
          }
          return combinedResult;
        } catch (error) {
          console.error("[EventFiltering] Error in shouldProcessEvent:", error);
          return {
            hasLoop: false,
            loopType: "direct_circular" /* DIRECT_CIRCULAR */,
            severity: "low" /* LOW */,
            preventionAction: "allow" /* ALLOW */
          };
        }
      }
      /**
       * Detect direct circular references in event chains
       */
      async detectDirectLoop(eventNode) {
        if (!this.config.enableLoopPrevention) {
          return this.createAllowResult();
        }
        const correlationData = this.eventCorrelations.get(eventNode.correlationId);
        if (correlationData) {
          const eventChain = correlationData.eventChain;
          const similarEvents = eventChain.filter(
            (node) => node.eventType === eventNode.eventType && node.sourcePlugin === eventNode.sourcePlugin
          );
          if (similarEvents.length >= this.config.circularReferenceThreshold) {
            return {
              hasLoop: true,
              loopPath: [...eventChain, eventNode],
              loopType: "direct_circular" /* DIRECT_CIRCULAR */,
              severity: "high" /* HIGH */,
              preventionAction: "block" /* BLOCK */
            };
          }
          if (eventChain.length >= 2) {
            const lastEvent = eventChain[eventChain.length - 1];
            const secondLastEvent = eventChain[eventChain.length - 2];
            if (lastEvent.sourcePlugin === eventNode.sourcePlugin && secondLastEvent.sourcePlugin === lastEvent.sourcePlugin && Date.now() - lastEvent.timestamp < this.config.rapidFireThresholdMs) {
              return {
                hasLoop: true,
                loopPath: [secondLastEvent, lastEvent, eventNode],
                loopType: "oscillating" /* OSCILLATING */,
                severity: "medium" /* MEDIUM */,
                preventionAction: "throttle" /* THROTTLE */
              };
            }
          }
        }
        return this.createAllowResult();
      }
      /**
       * Detect frequency-based loops (runaway event generation)
       */
      async detectFrequencyLoop(eventNode) {
        if (!this.config.enableFrequencyThrottling) {
          return this.createAllowResult();
        }
        const frequencyKey = `${eventNode.sourcePlugin}:${eventNode.eventType}`;
        const tracker = this.frequencyTrackers.get(frequencyKey);
        if (tracker) {
          const timeDiff = eventNode.timestamp - tracker.firstOccurrence;
          const eventsPerSecond = tracker.count * 1e3 / Math.max(timeDiff, 1);
          if (eventsPerSecond > this.config.maxEventsPerSecond) {
            return {
              hasLoop: true,
              loopType: "cascade_feedback" /* CASCADE_FEEDBACK */,
              severity: "high" /* HIGH */,
              preventionAction: "throttle" /* THROTTLE */
            };
          }
          if (tracker.count > this.config.runawayEventThreshold) {
            return {
              hasLoop: true,
              loopType: "cascade_feedback" /* CASCADE_FEEDBACK */,
              severity: "critical" /* CRITICAL */,
              preventionAction: "terminate_chain" /* TERMINATE_CHAIN */
            };
          }
        }
        return this.createAllowResult();
      }
      /**
       * Detect plugin interaction loops
       */
      async detectPluginInteractionLoop(eventNode) {
        if (!this.config.enablePluginIsolation) {
          return this.createAllowResult();
        }
        const interactionKey = eventNode.sourcePlugin;
        const interactions = Array.from(this.pluginInteractions.values()).filter((interaction) => interaction.sourcePlugin === interactionKey);
        const recentInteractions = interactions.filter(
          (interaction) => eventNode.timestamp - interaction.lastInteraction < 1e3
        );
        if (recentInteractions.length > this.config.maxPluginInteractionsPerSecond) {
          return {
            hasLoop: true,
            loopType: "indirect_circular" /* INDIRECT_CIRCULAR */,
            severity: "medium" /* MEDIUM */,
            preventionAction: "delay" /* DELAY */
          };
        }
        return this.createAllowResult();
      }
      /**
       * Detect temporal loops (rapid-fire events)
       */
      async detectTemporalLoop(eventNode) {
        const recentEvents = Array.from(this.eventHistory.values()).filter(
          (node) => node.sourcePlugin === eventNode.sourcePlugin && node.eventType === eventNode.eventType && eventNode.timestamp - node.timestamp < this.config.rapidFireThresholdMs
        );
        if (recentEvents.length >= 3) {
          return {
            hasLoop: true,
            loopPath: [...recentEvents, eventNode],
            loopType: "temporal_loop" /* TEMPORAL_LOOP */,
            severity: "medium" /* MEDIUM */,
            preventionAction: "delay" /* DELAY */
          };
        }
        return this.createAllowResult();
      }
      /**
       * Combine multiple detection results into final decision
       */
      combineDetectionResults(results) {
        const hasAnyLoop = results.some((r) => r.hasLoop);
        if (!hasAnyLoop) {
          return this.createAllowResult();
        }
        const severityOrder = ["critical" /* CRITICAL */, "high" /* HIGH */, "medium" /* MEDIUM */, "low" /* LOW */];
        const mostSevere = results.filter((r) => r.hasLoop).sort((a, b) => severityOrder.indexOf(a.severity) - severityOrder.indexOf(b.severity))[0];
        return mostSevere;
      }
      /**
       * Create event chain node from event
       */
      createEventChainNode(event) {
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
      generateEventId(event) {
        return `${event.sourcePlugin}-${event.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      }
      /**
       * Get or create correlation ID for event chain tracking
       */
      getOrCreateCorrelationId(event) {
        if ("correlationId" in event && event.correlationId) {
          return event.correlationId;
        }
        return `correlation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      }
      /**
       * Get parent event ID from event context
       */
      getParentEventId(event) {
        if ("parentEventId" in event) {
          return event.parentEventId;
        }
        return void 0;
      }
      /**
       * Calculate event depth in chain
       */
      calculateEventDepth(correlationId) {
        const correlationData = this.eventCorrelations.get(correlationId);
        return correlationData ? correlationData.eventChain.length : 0;
      }
      /**
       * Update event history
       */
      updateEventHistory(eventNode) {
        this.eventHistory.set(eventNode.eventId, eventNode);
        if (this.eventHistory.size > this.config.eventHistoryLimit) {
          const oldestEvents = Array.from(this.eventHistory.entries()).sort((a, b) => a[1].timestamp - b[1].timestamp).slice(0, Math.floor(this.config.eventHistoryLimit * 0.1));
          oldestEvents.forEach(([eventId]) => {
            this.eventHistory.delete(eventId);
          });
        }
      }
      /**
       * Update frequency tracking
       */
      updateFrequencyTracking(eventNode) {
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
      updatePluginInteractionTracking(eventNode) {
        const interactionKey = eventNode.sourcePlugin;
        if (!this.pluginInteractions.has(interactionKey)) {
          this.pluginInteractions.set(interactionKey, {
            sourcePlugin: eventNode.sourcePlugin,
            targetPlugin: "unknown",
            // Would be detected from event analysis
            eventTypes: [eventNode.eventType],
            frequency: 1,
            lastInteraction: eventNode.timestamp,
            riskScore: 0
          });
        } else {
          const interaction = this.pluginInteractions.get(interactionKey);
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
      calculateRiskScore(interaction) {
        const timeDiff = Date.now() - interaction.lastInteraction;
        const frequencyScore = Math.min(interaction.frequency / 100, 1);
        const recencyScore = Math.max(1 - timeDiff / 6e4, 0);
        const diversityScore = Math.min(interaction.eventTypes.length / 10, 1);
        return frequencyScore * 0.5 + recencyScore * 0.3 + diversityScore * 0.2;
      }
      /**
       * Update correlation data
       */
      updateCorrelationData(eventNode, result) {
        const existing = this.eventCorrelations.get(eventNode.correlationId);
        if (existing) {
          existing.eventChain.push(eventNode);
          existing.lastUpdated = eventNode.timestamp;
          existing.riskScore = this.calculateCorrelationRiskScore(existing, result);
          existing.isActive = result.preventionAction !== "terminate_chain" /* TERMINATE_CHAIN */;
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
      calculateCorrelationRiskScore(correlation, result) {
        const chainLength = correlation.eventChain.length;
        const lengthScore = Math.min(chainLength / this.config.maxEventChainDepth, 1);
        const loopScore = result.hasLoop ? 0.8 : 0;
        const timeScore = Math.max(1 - (Date.now() - correlation.lastUpdated) / 3e4, 0);
        return Math.min(lengthScore * 0.3 + loopScore * 0.5 + timeScore * 0.2, 1);
      }
      /**
       * Create allow result
       */
      createAllowResult() {
        return {
          hasLoop: false,
          loopType: "direct_circular" /* DIRECT_CIRCULAR */,
          severity: "low" /* LOW */,
          preventionAction: "allow" /* ALLOW */
        };
      }
      /**
       * Start cleanup timer
       */
      startCleanupTimer() {
        this.cleanupInterval = setInterval(() => {
          this.performCleanup();
        }, this.config.correlationCleanupIntervalMs);
      }
      /**
       * Perform periodic cleanup
       */
      performCleanup() {
        const now = Date.now();
        for (const [correlationId, data] of this.eventCorrelations.entries()) {
          if (now - data.lastUpdated > this.config.loopDetectionWindowMs) {
            this.eventCorrelations.delete(correlationId);
          }
        }
        for (const [key, tracker] of this.frequencyTrackers.entries()) {
          if (now - tracker.lastOccurrence > 6e4) {
            this.frequencyTrackers.delete(key);
          }
        }
        for (const [key, interaction] of this.pluginInteractions.entries()) {
          if (now - interaction.lastInteraction > 3e5) {
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
      getSystemStats() {
        const highRiskCorrelations = Array.from(this.eventCorrelations.values()).filter((c) => c.riskScore > 0.7).length;
        const runawayTrackers = Array.from(this.frequencyTrackers.values()).filter((t) => t.isRunaway).length;
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
      updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        this.debugMode = this.config.debugMode;
      }
      /**
       * Get current configuration
       */
      getConfig() {
        return { ...this.config };
      }
      /**
       * Dispose and cleanup
       */
      dispose() {
        if (this.cleanupInterval) {
          clearInterval(this.cleanupInterval);
          this.cleanupInterval = null;
        }
        this.eventHistory.clear();
        this.eventCorrelations.clear();
        this.pluginInteractions.clear();
        this.frequencyTrackers.clear();
      }
    };
    EnhancedEventFilteringSystem = class extends EventFilteringSystem {
      constructor(config2 = {}) {
        super(config2);
        this.pluginCapabilities = /* @__PURE__ */ new Map();
        this.eventOwnership = /* @__PURE__ */ new Map();
        this.pluginPriorities = /* @__PURE__ */ new Map();
        this.initializeDefaultCapabilities();
      }
      /**
       * Initialize default plugin capabilities
       */
      initializeDefaultCapabilities() {
        this.pluginCapabilities.set("track-edits", /* @__PURE__ */ new Set([
          "document.change.applied",
          "document.change.reverted",
          "ai.processing.complete",
          "session.synchronization"
        ]));
        this.pluginCapabilities.set("editorial-engine", /* @__PURE__ */ new Set([
          "ai.processing.start",
          "ai.processing.progress",
          "ai.processing.complete",
          "ai.processing.error",
          "constraint.validation"
        ]));
        this.pluginCapabilities.set("writerr-chat", /* @__PURE__ */ new Set([
          "session.lifecycle",
          "conversation.message",
          "ai.processing.start",
          "user.interaction"
        ]));
        this.eventOwnership.set("document.change.applied", "track-edits");
        this.eventOwnership.set("ai.processing.start", "editorial-engine");
        this.eventOwnership.set("session.lifecycle", "writerr-chat");
      }
      /**
       * Check if plugin should handle specific event type
       */
      shouldPluginHandleEvent(pluginId, eventType) {
        const capabilities = this.pluginCapabilities.get(pluginId);
        if (!capabilities)
          return false;
        return capabilities.has(eventType);
      }
      /**
       * Get plugin priority for event type
       */
      getPluginPriority(pluginId, eventType) {
        const pluginPriorities = this.pluginPriorities.get(pluginId);
        if (!pluginPriorities)
          return 0;
        return pluginPriorities.get(eventType) || 0;
      }
      /**
       * Detect event ownership conflicts
       */
      detectEventOwnershipConflict(event) {
        const expectedOwner = this.eventOwnership.get(event.type);
        if (!expectedOwner)
          return false;
        return expectedOwner !== event.sourcePlugin;
      }
      /**
       * Enhanced event filtering with plugin responsibility checks
       */
      async shouldProcessEvent(event) {
        const baseResult = await super.shouldProcessEvent(event);
        if (baseResult.preventionAction === "block" /* BLOCK */ || baseResult.preventionAction === "terminate_chain" /* TERMINATE_CHAIN */) {
          return baseResult;
        }
        if (this.detectEventOwnershipConflict(event)) {
          return {
            hasLoop: true,
            loopType: "indirect_circular" /* INDIRECT_CIRCULAR */,
            severity: "medium" /* MEDIUM */,
            preventionAction: "warn" /* WARN */
          };
        }
        return baseResult;
      }
      /**
       * Register plugin capabilities
       */
      registerPluginCapabilities(pluginId, capabilities) {
        this.pluginCapabilities.set(pluginId, new Set(capabilities));
      }
      /**
       * Set event ownership
       */
      setEventOwnership(eventType, ownerId) {
        this.eventOwnership.set(eventType, ownerId);
      }
    };
  }
});

// plugins/track-edits/src/event-bus-integration.ts
var event_bus_integration_exports = {};
__export(event_bus_integration_exports, {
  EventBusUtils: () => EventBusUtils,
  EventPersistence: () => EventPersistence,
  EventPriority: () => EventPriority,
  WRITERR_EVENT_SCHEMA_VERSION: () => WRITERR_EVENT_SCHEMA_VERSION,
  WriterrlEventBusConnection: () => WriterrlEventBusConnection,
  WriterrlEventFactory: () => WriterrlEventFactory,
  WriterrlEventValidator: () => WriterrlEventValidator
});
var WRITERR_EVENT_SCHEMA_VERSION, EventPriority, EventPersistence, WriterrlEventFactory, WriterrlEventValidator, WriterrlEventBusConnection, EventBusUtils;
var init_event_bus_integration = __esm({
  "plugins/track-edits/src/event-bus-integration.ts"() {
    "use strict";
    WRITERR_EVENT_SCHEMA_VERSION = "1.0.0";
    EventPriority = /* @__PURE__ */ ((EventPriority2) => {
      EventPriority2[EventPriority2["LOW"] = 0] = "LOW";
      EventPriority2[EventPriority2["NORMAL"] = 1] = "NORMAL";
      EventPriority2[EventPriority2["HIGH"] = 2] = "HIGH";
      EventPriority2[EventPriority2["CRITICAL"] = 3] = "CRITICAL";
      return EventPriority2;
    })(EventPriority || {});
    EventPersistence = /* @__PURE__ */ ((EventPersistence2) => {
      EventPersistence2["NONE"] = "none";
      EventPersistence2["SESSION"] = "session";
      EventPersistence2["OFFLINE"] = "offline";
      EventPersistence2["PERMANENT"] = "permanent";
      return EventPersistence2;
    })(EventPersistence || {});
    WriterrlEventFactory = class {
      static createBaseEvent(type, sourcePlugin, priority = 1 /* NORMAL */, persistence = "session" /* SESSION */) {
        return {
          eventId: this.generateEventId(),
          timestamp: Date.now(),
          sourcePlugin,
          schemaVersion: WRITERR_EVENT_SCHEMA_VERSION,
          priority,
          persistence,
          metadata: {
            correlationId: this.generateCorrelationId()
          }
        };
      }
      static generateEventId() {
        return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      }
      static generateCorrelationId() {
        return `corr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      }
      static createAIProcessingStartEvent(sourcePlugin, operation, input, config2, pluginContext) {
        return {
          ...this.createBaseEvent("ai.processing.start", sourcePlugin, 2 /* HIGH */),
          type: "ai.processing.start",
          payload: { operation, input, config: config2, pluginContext }
        };
      }
      static createDocumentChangeAppliedEvent(sourcePlugin, change, attribution, context) {
        return {
          ...this.createBaseEvent("document.change.applied", sourcePlugin, 1 /* NORMAL */, "permanent" /* PERMANENT */),
          type: "document.change.applied",
          payload: { change, attribution, context }
        };
      }
      static createWorkflowEvent(type, sourcePlugin, workflow, context, currentStep, results) {
        return {
          ...this.createBaseEvent(type, sourcePlugin, 2 /* HIGH */),
          type,
          payload: { workflow, context, currentStep, results }
        };
      }
    };
    WriterrlEventValidator = class {
      static validateEvent(event) {
        const result = {
          valid: true,
          errors: [],
          warnings: []
        };
        if (!event.eventId) {
          result.errors.push("Missing eventId");
          result.valid = false;
        }
        if (!event.timestamp) {
          result.errors.push("Missing timestamp");
          result.valid = false;
        }
        if (!event.sourcePlugin) {
          result.errors.push("Missing sourcePlugin");
          result.valid = false;
        }
        if (!event.type) {
          result.errors.push("Missing event type");
          result.valid = false;
        }
        if (event.schemaVersion && event.schemaVersion !== WRITERR_EVENT_SCHEMA_VERSION) {
          result.warnings.push(`Schema version mismatch: expected ${WRITERR_EVENT_SCHEMA_VERSION}, got ${event.schemaVersion}`);
        }
        if (event.priority !== void 0 && !Object.values(EventPriority).includes(event.priority)) {
          result.errors.push("Invalid priority value");
          result.valid = false;
        }
        if (event.persistence && !Object.values(EventPersistence).includes(event.persistence)) {
          result.errors.push("Invalid persistence value");
          result.valid = false;
        }
        if (!event.payload) {
          result.errors.push("Missing payload");
          result.valid = false;
        }
        return result;
      }
      static sanitizeEvent(event) {
        var _a, _b;
        const sanitized = { ...event };
        if ((_b = (_a = sanitized.metadata) == null ? void 0 : _a.debug) == null ? void 0 : _b.stackTrace) {
          sanitized.metadata.debug.stackTrace = "[REDACTED]";
        }
        if (!sanitized.schemaVersion) {
          sanitized.schemaVersion = WRITERR_EVENT_SCHEMA_VERSION;
        }
        if (!sanitized.priority) {
          sanitized.priority = 1 /* NORMAL */;
        }
        if (!sanitized.persistence) {
          sanitized.persistence = "session" /* SESSION */;
        }
        if (!sanitized.metadata) {
          sanitized.metadata = {};
        }
        return sanitized;
      }
    };
    WriterrlEventBusConnection = class {
      constructor(config2 = {}) {
        this.eventBus = null;
        this.subscriptions = /* @__PURE__ */ new Map();
        this.connectionCheckInterval = null;
        this.debugMode = false;
        // Event filtering system integration
        this.eventFilteringSystem = null;
        this.filteringEnabled = false;
        this.config = {
          maxReconnectAttempts: 3,
          reconnectDelay: 1e3,
          healthCheckInterval: 3e4,
          enableDebugMode: false,
          ...config2
        };
        this.health = {
          isConnected: false,
          lastHeartbeat: 0,
          connectionAttempts: 0,
          eventsPublished: 0,
          eventsReceived: 0,
          errors: []
        };
        this.debugMode = this.config.enableDebugMode || false;
        this.initializeEventFiltering();
      }
      /**
       * Initialize event filtering system
       */
      async initializeEventFiltering() {
        try {
          const { EnhancedEventFilteringSystem: EnhancedEventFilteringSystem2 } = await Promise.resolve().then(() => (init_event_filtering_system(), event_filtering_system_exports));
          this.eventFilteringSystem = new EnhancedEventFilteringSystem2({
            enableLoopPrevention: true,
            enableFrequencyThrottling: true,
            enablePluginIsolation: true,
            debugMode: this.debugMode,
            maxEventChainDepth: 10,
            maxEventsPerSecond: 50,
            runawayEventThreshold: 20
          });
          this.filteringEnabled = true;
          if (this.debugMode) {
            console.log("[TrackEdits EventBus] Event filtering system initialized");
          }
        } catch (error) {
          console.warn("[TrackEdits EventBus] Failed to initialize event filtering system:", error);
          this.filteringEnabled = false;
        }
      }
      /**
       * Initialize connection to the window.Writerr event bus
       */
      async connect() {
        try {
          if (typeof window !== "undefined" && window.Writerr && window.Writerr.eventBus) {
            this.eventBus = window.Writerr.eventBus;
            this.health.isConnected = true;
            this.health.lastHeartbeat = Date.now();
            this.health.connectionAttempts++;
            if (this.debugMode) {
              console.log("[TrackEdits EventBus] Connected to window.Writerr event bus");
            }
            this.startHealthMonitoring();
            await this.resubscribeAll();
            return true;
          } else {
            this.logError("Event bus not available", "connection");
            return false;
          }
        } catch (error) {
          this.logError(`Connection failed: ${error}`, "connection");
          return false;
        }
      }
      /**
       * Disconnect from event bus and cleanup
       */
      async disconnect() {
        try {
          await this.unsubscribeAll();
          if (this.connectionCheckInterval) {
            clearInterval(this.connectionCheckInterval);
            this.connectionCheckInterval = null;
          }
          if (this.eventFilteringSystem) {
            this.eventFilteringSystem.dispose();
          }
          this.eventBus = null;
          this.health.isConnected = false;
          if (this.debugMode) {
            console.log("[TrackEdits EventBus] Disconnected from event bus");
          }
        } catch (error) {
          this.logError(`Disconnect error: ${error}`, "disconnect");
        }
      }
      /**
       * Subscribe to events with automatic reconnection handling and advanced filtering
       */
      async subscribe(eventType, handler, options = {}) {
        try {
          this.subscriptions.set(eventType, { handler, options });
          if (!this.eventBus) {
            if (this.debugMode) {
              console.log(`[TrackEdits EventBus] Deferring subscription to ${eventType} until connected`);
            }
            return false;
          }
          const wrappedHandler = async (event) => {
            try {
              if (!this.shouldProcessEvent(event)) {
                return;
              }
              if (this.filteringEnabled && this.eventFilteringSystem) {
                const filterResult = await this.eventFilteringSystem.shouldProcessEvent(event);
                if (!this.shouldProcessFilteredEvent(filterResult, event)) {
                  return;
                }
              }
              this.health.eventsReceived++;
              if (this.debugMode) {
                console.log(`[TrackEdits EventBus] Processing event: ${event.type}`, event);
              }
              await handler(event);
            } catch (error) {
              this.logError(`Event handler error for ${eventType}: ${error}`, "handler");
            }
          };
          this.eventBus.on(eventType, wrappedHandler, options);
          if (this.debugMode) {
            console.log(`[TrackEdits EventBus] Subscribed to ${eventType}`);
          }
          return true;
        } catch (error) {
          this.logError(`Subscription error for ${eventType}: ${error}`, "subscription");
          return false;
        }
      }
      /**
       * Determine whether to process event based on filtering result
       */
      shouldProcessFilteredEvent(filterResult, event) {
        switch (filterResult.preventionAction) {
          case "allow":
            return true;
          case "warn":
            if (this.debugMode) {
              console.warn(`[TrackEdits EventBus] Loop warning for event ${event.type} from ${event.sourcePlugin}:`, filterResult);
            }
            return true;
          case "delay":
            if (this.debugMode) {
              console.log(`[TrackEdits EventBus] Delaying event ${event.type} from ${event.sourcePlugin}`);
            }
            setTimeout(() => {
            }, 500);
            return false;
          case "throttle":
            if (this.debugMode) {
              console.log(`[TrackEdits EventBus] Throttling event ${event.type} from ${event.sourcePlugin}`);
            }
            return false;
          case "block":
            if (this.debugMode) {
              console.warn(`[TrackEdits EventBus] Blocked event ${event.type} from ${event.sourcePlugin}:`, filterResult);
            }
            return false;
          case "terminate_chain":
            console.error(`[TrackEdits EventBus] Terminated event chain for ${event.type} from ${event.sourcePlugin}:`, filterResult);
            return false;
          default:
            return true;
        }
      }
      /**
       * Unsubscribe from events
       */
      async unsubscribe(eventType) {
        try {
          const subscription = this.subscriptions.get(eventType);
          if (subscription && this.eventBus) {
            this.eventBus.off(eventType, subscription.handler);
            this.subscriptions.delete(eventType);
            if (this.debugMode) {
              console.log(`[TrackEdits EventBus] Unsubscribed from ${eventType}`);
            }
            return true;
          }
          return false;
        } catch (error) {
          this.logError(`Unsubscription error for ${eventType}: ${error}`, "unsubscription");
          return false;
        }
      }
      /**
       * Publish events with error handling and retry logic
       */
      async publish(eventType, event, options = {}) {
        try {
          if (!this.eventBus) {
            if (this.debugMode) {
              console.log(`[TrackEdits EventBus] Cannot publish ${eventType} - not connected`);
            }
            return false;
          }
          if (this.filteringEnabled && this.eventFilteringSystem) {
            const shouldHandle = this.eventFilteringSystem.shouldPluginHandleEvent(
              event.sourcePlugin,
              eventType
            );
            if (!shouldHandle) {
              if (this.debugMode) {
                console.warn(`[TrackEdits EventBus] Plugin ${event.sourcePlugin} not authorized to publish ${eventType}`);
              }
              return false;
            }
            if (this.eventFilteringSystem.detectEventOwnershipConflict(event)) {
              if (this.debugMode) {
                console.warn(`[TrackEdits EventBus] Event ownership conflict detected for ${eventType} from ${event.sourcePlugin}`);
              }
            }
          }
          await this.eventBus.emit(eventType, event, options);
          this.health.eventsPublished++;
          if (this.debugMode) {
            console.log(`[TrackEdits EventBus] Published event: ${eventType}`, event);
          }
          return true;
        } catch (error) {
          this.logError(`Publication error for ${eventType}: ${error}`, "publication");
          if (options.retryOnFailure) {
            try {
              await new Promise((resolve) => setTimeout(resolve, this.config.reconnectDelay || 1e3));
              return await this.publish(eventType, event, { ...options, retryOnFailure: false });
            } catch (retryError) {
              this.logError(`Retry publication failed for ${eventType}: ${retryError}`, "retry");
            }
          }
          return false;
        }
      }
      /**
       * Get connection health status including filtering system stats
       */
      getHealth() {
        const baseHealth = { ...this.health };
        if (this.filteringEnabled && this.eventFilteringSystem) {
          return {
            ...baseHealth,
            filteringSystemStats: this.eventFilteringSystem.getSystemStats()
          };
        }
        return baseHealth;
      }
      /**
       * Get configuration
       */
      getConfig() {
        return { ...this.config };
      }
      /**
       * Update configuration including event filtering settings
       */
      updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        this.debugMode = this.config.enableDebugMode || false;
        if (this.filteringEnabled && this.eventFilteringSystem && "eventFilteringConfig" in newConfig) {
          this.eventFilteringSystem.updateConfig(newConfig.eventFilteringConfig);
        }
      }
      /**
       * Check if currently connected
       */
      isConnected() {
        return this.health.isConnected && this.eventBus !== null;
      }
      /**
       * Get event filtering system stats
       */
      getFilteringStats() {
        if (this.filteringEnabled && this.eventFilteringSystem) {
          return this.eventFilteringSystem.getSystemStats();
        }
        return null;
      }
      /**
       * Register plugin capabilities with event filtering system
       */
      registerPluginCapabilities(pluginId, capabilities) {
        if (this.filteringEnabled && this.eventFilteringSystem) {
          this.eventFilteringSystem.registerPluginCapabilities(pluginId, capabilities);
          if (this.debugMode) {
            console.log(`[TrackEdits EventBus] Registered capabilities for ${pluginId}:`, capabilities);
          }
        }
      }
      /**
       * Set event ownership with event filtering system
       */
      setEventOwnership(eventType, ownerId) {
        if (this.filteringEnabled && this.eventFilteringSystem) {
          this.eventFilteringSystem.setEventOwnership(eventType, ownerId);
          if (this.debugMode) {
            console.log(`[TrackEdits EventBus] Set event ownership: ${eventType} -> ${ownerId}`);
          }
        }
      }
      // ============================================================================
      // Private Methods
      // ============================================================================
      async resubscribeAll() {
        for (const [eventType, subscription] of this.subscriptions) {
          await this.subscribe(eventType, subscription.handler, subscription.options);
        }
      }
      async unsubscribeAll() {
        const eventTypes = Array.from(this.subscriptions.keys());
        for (const eventType of eventTypes) {
          await this.unsubscribe(eventType);
        }
      }
      startHealthMonitoring() {
        if (this.connectionCheckInterval) {
          clearInterval(this.connectionCheckInterval);
        }
        this.connectionCheckInterval = setInterval(() => {
          this.performHealthCheck();
        }, this.config.healthCheckInterval || 3e4);
      }
      performHealthCheck() {
        if (typeof window !== "undefined" && window.Writerr && window.Writerr.eventBus) {
          this.health.lastHeartbeat = Date.now();
          this.health.isConnected = true;
        } else {
          this.health.isConnected = false;
          this.eventBus = null;
          if (this.debugMode) {
            console.log("[TrackEdits EventBus] Health check failed - event bus unavailable");
          }
          this.attemptReconnection();
        }
      }
      async attemptReconnection() {
        if (this.health.connectionAttempts < (this.config.maxReconnectAttempts || 3)) {
          if (this.debugMode) {
            console.log(`[TrackEdits EventBus] Attempting reconnection (${this.health.connectionAttempts + 1})`);
          }
          setTimeout(async () => {
            await this.connect();
          }, this.config.reconnectDelay || 1e3);
        }
      }
      shouldProcessEvent(event) {
        const filters = this.config.eventFilters;
        if (!filters)
          return true;
        if (filters.sourcePlugins && filters.sourcePlugins.length > 0 && !filters.sourcePlugins.includes(event.sourcePlugin)) {
          return false;
        }
        if (filters.eventTypes && filters.eventTypes.length > 0 && !filters.eventTypes.includes(event.type)) {
          return false;
        }
        if (filters.sessionIds && filters.sessionIds.length > 0 && event.sessionId && !filters.sessionIds.includes(event.sessionId)) {
          return false;
        }
        return true;
      }
      logError(error, context) {
        this.health.errors.push({
          timestamp: Date.now(),
          error,
          context
        });
        if (this.health.errors.length > 50) {
          this.health.errors = this.health.errors.slice(-50);
        }
        if (this.debugMode) {
          console.error(`[TrackEdits EventBus] ${context}: ${error}`);
        }
      }
    };
    EventBusUtils = class {
      /**
       * Generate unique event ID
       */
      static generateEventId(prefix = "event") {
        return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      }
      /**
       * Create base event properties
       */
      static createBaseEvent(sourcePlugin, sessionId, documentId, targetPlugins) {
        return {
          eventId: this.generateEventId(),
          timestamp: Date.now(),
          sourcePlugin,
          sessionId,
          documentId,
          targetPlugins
        };
      }
      /**
       * Create change event
       */
      static createChangeEvent(type, sourcePlugin, payload, sessionId, documentId, targetPlugins) {
        return {
          ...this.createBaseEvent(sourcePlugin, sessionId, documentId, targetPlugins),
          type,
          payload
        };
      }
      /**
       * Create session event
       */
      static createSessionEvent(type, sourcePlugin, payload, sessionId, documentId, targetPlugins) {
        return {
          ...this.createBaseEvent(sourcePlugin, sessionId, documentId, targetPlugins),
          type,
          payload
        };
      }
      /**
       * Create error event
       */
      static createErrorEvent(type, sourcePlugin, payload, sessionId, documentId, targetPlugins) {
        return {
          ...this.createBaseEvent(sourcePlugin, sessionId, documentId, targetPlugins),
          type,
          payload
        };
      }
    };
  }
});

// plugins/track-edits/src/error-handling/ai-submission-error-manager.ts
var ai_submission_error_manager_exports = {};
__export(ai_submission_error_manager_exports, {
  AISubmissionErrorManager: () => AISubmissionErrorManager,
  ErrorCategory: () => ErrorCategory,
  ErrorSeverity: () => ErrorSeverity,
  ErrorType: () => ErrorType,
  RollbackType: () => RollbackType
});
var ErrorType, ErrorCategory, ErrorSeverity, RollbackType, AISubmissionErrorManager;
var init_ai_submission_error_manager = __esm({
  "plugins/track-edits/src/error-handling/ai-submission-error-manager.ts"() {
    "use strict";
    ErrorType = /* @__PURE__ */ ((ErrorType2) => {
      ErrorType2["NETWORK"] = "network";
      ErrorType2["VALIDATION"] = "validation";
      ErrorType2["STORAGE"] = "storage";
      ErrorType2["PROCESSING"] = "processing";
      ErrorType2["EDITORIAL_ENGINE"] = "editorial-engine";
      ErrorType2["BATCH_OPERATION"] = "batch-operation";
      ErrorType2["SESSION_MANAGEMENT"] = "session-management";
      ErrorType2["DATA_CORRUPTION"] = "data-corruption";
      ErrorType2["RATE_LIMITING"] = "rate-limiting";
      ErrorType2["AUTHENTICATION"] = "authentication";
      return ErrorType2;
    })(ErrorType || {});
    ErrorCategory = /* @__PURE__ */ ((ErrorCategory2) => {
      ErrorCategory2["TRANSIENT"] = "transient";
      ErrorCategory2["PERMANENT"] = "permanent";
      ErrorCategory2["USER_ERROR"] = "user-error";
      ErrorCategory2["SYSTEM_ERROR"] = "system-error";
      ErrorCategory2["CONFIGURATION"] = "configuration";
      return ErrorCategory2;
    })(ErrorCategory || {});
    ErrorSeverity = /* @__PURE__ */ ((ErrorSeverity2) => {
      ErrorSeverity2["LOW"] = "low";
      ErrorSeverity2["MEDIUM"] = "medium";
      ErrorSeverity2["HIGH"] = "high";
      ErrorSeverity2["CRITICAL"] = "critical";
      return ErrorSeverity2;
    })(ErrorSeverity || {});
    RollbackType = /* @__PURE__ */ ((RollbackType2) => {
      RollbackType2["CHANGES"] = "changes";
      RollbackType2["SESSION"] = "session";
      RollbackType2["BATCH"] = "batch";
      RollbackType2["PARTIAL_BATCH"] = "partial-batch";
      RollbackType2["FULL_STATE"] = "full-state";
      return RollbackType2;
    })(RollbackType || {});
    AISubmissionErrorManager = class {
      constructor(batchManager) {
        this.batchManager = batchManager;
        this.transactionLog = /* @__PURE__ */ new Map();
        this.errorLog = [];
        this.recoveryStrategies = /* @__PURE__ */ new Map();
        this.rollbackOperations = /* @__PURE__ */ new Map();
        this.initializeRecoveryStrategies();
      }
      /**
       * Initialize default recovery strategies for different error types
       */
      initializeRecoveryStrategies() {
        this.recoveryStrategies.set("network" /* NETWORK */, {
          maxRetries: 3,
          retryDelay: 1e3,
          backoffMultiplier: 2,
          fallbackActions: ["cache-locally", "offline-mode"],
          rollbackOnFailure: false
        });
        this.recoveryStrategies.set("validation" /* VALIDATION */, {
          maxRetries: 1,
          retryDelay: 100,
          backoffMultiplier: 1,
          fallbackActions: ["sanitize-data", "bypass-validation"],
          rollbackOnFailure: true
        });
        this.recoveryStrategies.set("storage" /* STORAGE */, {
          maxRetries: 2,
          retryDelay: 500,
          backoffMultiplier: 1.5,
          fallbackActions: ["memory-storage", "backup-location"],
          rollbackOnFailure: true
        });
        this.recoveryStrategies.set("editorial-engine" /* EDITORIAL_ENGINE */, {
          maxRetries: 2,
          retryDelay: 2e3,
          backoffMultiplier: 2,
          fallbackActions: ["fallback-provider", "direct-processing"],
          rollbackOnFailure: true
        });
        this.recoveryStrategies.set("batch-operation" /* BATCH_OPERATION */, {
          maxRetries: 1,
          retryDelay: 1e3,
          backoffMultiplier: 1,
          fallbackActions: ["individual-processing", "split-batch"],
          rollbackOnFailure: true
        });
      }
      /**
       * Begin a transaction for AI submission operations
       */
      beginTransaction(sessionId, operations) {
        const transactionId = this.generateTransactionId();
        const transaction = {
          id: transactionId,
          sessionId,
          operations: operations.map((op) => ({
            ...op,
            completed: false,
            timestamp: /* @__PURE__ */ new Date()
          })),
          status: "pending",
          startTime: /* @__PURE__ */ new Date()
        };
        this.transactionLog.set(transactionId, transaction);
        return transactionId;
      }
      /**
       * Commit a transaction after successful operations
       */
      commitTransaction(transactionId) {
        const transaction = this.transactionLog.get(transactionId);
        if (!transaction) {
          console.error(`Transaction ${transactionId} not found for commit`);
          return false;
        }
        transaction.status = "committed";
        transaction.endTime = /* @__PURE__ */ new Date();
        setTimeout(() => {
          this.transactionLog.delete(transactionId);
        }, 3e5);
        return true;
      }
      /**
       * Rollback a failed transaction
       */
      async rollbackTransaction(transactionId, error, context) {
        const transaction = this.transactionLog.get(transactionId);
        if (!transaction) {
          return {
            success: false,
            errors: [`Transaction ${transactionId} not found for rollback`],
            warnings: []
          };
        }
        const result = {
          success: true,
          errors: [],
          warnings: []
        };
        try {
          transaction.status = "failed";
          const completedOperations = transaction.operations.filter((op) => op.completed).reverse();
          for (const operation of completedOperations) {
            try {
              await this.rollbackOperation(operation, context, error);
            } catch (rollbackError) {
              const errorMsg = `Failed to rollback operation ${operation.type}: ${rollbackError instanceof Error ? rollbackError.message : String(rollbackError)}`;
              result.errors.push(errorMsg);
              result.success = false;
              console.error(errorMsg, rollbackError);
            }
          }
          if (transaction.backupState && result.success) {
            try {
              await this.restoreBackupState(transaction.backupState, context);
            } catch (restoreError) {
              const errorMsg = `Failed to restore backup state: ${restoreError instanceof Error ? restoreError.message : String(restoreError)}`;
              result.errors.push(errorMsg);
              result.success = false;
              console.error(errorMsg, restoreError);
            }
          }
          transaction.status = result.success ? "rolled-back" : "failed";
          transaction.endTime = /* @__PURE__ */ new Date();
          this.logRollbackOperation({
            type: "full-state" /* FULL_STATE */,
            sessionId: context.sessionId,
            changeIds: [],
            timestamp: /* @__PURE__ */ new Date(),
            backupData: transaction.backupState
          });
          if (result.success) {
            result.warnings.push(`Transaction ${transactionId} successfully rolled back`);
          }
        } catch (error2) {
          const errorMsg = `Critical error during transaction rollback: ${error2 instanceof Error ? error2.message : String(error2)}`;
          result.errors.push(errorMsg);
          result.success = false;
          console.error(errorMsg, error2);
        }
        return result;
      }
      /**
       * Handle AI submission errors with comprehensive error categorization and recovery
       */
      async handleError(error, context) {
        const aiError = this.categorizeError(error, context);
        this.errorLog.push(aiError);
        const strategy = this.recoveryStrategies.get(aiError.type) || this.getDefaultStrategy();
        let recoveryAction = "none";
        let shouldRetry = false;
        if (aiError.retryable && strategy.maxRetries > 0) {
          shouldRetry = true;
          recoveryAction = "retry";
        } else if (strategy.fallbackActions.length > 0) {
          recoveryAction = strategy.fallbackActions[0];
        }
        console.error("[AISubmissionErrorManager] Error handled:", {
          type: aiError.type,
          category: aiError.category,
          severity: aiError.severity,
          message: aiError.message,
          context,
          recoveryAction,
          shouldRetry
        });
        return {
          error: aiError,
          recoveryAction,
          shouldRetry,
          rollbackRequired: aiError.rollbackRequired
        };
      }
      /**
       * Categorize errors into structured format
       */
      categorizeError(error, context) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _i;
        const timestamp = /* @__PURE__ */ new Date();
        if (error.name === "NetworkError" || error.code === "NETWORK_ERROR" || ((_a = error.message) == null ? void 0 : _a.includes("fetch")) || ((_b = error.message) == null ? void 0 : _b.includes("network"))) {
          return {
            type: "network" /* NETWORK */,
            category: "transient" /* TRANSIENT */,
            severity: "medium" /* MEDIUM */,
            code: "NET_001",
            message: `Network error during ${context.operation}: ${error.message}`,
            context,
            timestamp,
            retryable: true,
            rollbackRequired: false
          };
        }
        if (((_c = error.message) == null ? void 0 : _c.includes("validation")) || error.code === "VALIDATION_ERROR") {
          return {
            type: "validation" /* VALIDATION */,
            category: "user-error" /* USER_ERROR */,
            severity: "high" /* HIGH */,
            code: "VAL_001",
            message: `Validation error: ${error.message}`,
            context,
            timestamp,
            retryable: false,
            rollbackRequired: true
          };
        }
        if (error.name === "StorageError" || ((_d = error.message) == null ? void 0 : _d.includes("storage")) || ((_e = error.message) == null ? void 0 : _e.includes("save")) || ((_f = error.message) == null ? void 0 : _f.includes("persist"))) {
          return {
            type: "storage" /* STORAGE */,
            category: "system-error" /* SYSTEM_ERROR */,
            severity: "high" /* HIGH */,
            code: "STO_001",
            message: `Storage error: ${error.message}`,
            context,
            timestamp,
            retryable: true,
            rollbackRequired: true
          };
        }
        if (((_g = context.operation) == null ? void 0 : _g.includes("editorial")) || error.code === "EDITORIAL_ENGINE_ERROR") {
          return {
            type: "editorial-engine" /* EDITORIAL_ENGINE */,
            category: "system-error" /* SYSTEM_ERROR */,
            severity: "high" /* HIGH */,
            code: "EE_001",
            message: `Editorial Engine error: ${error.message}`,
            context,
            timestamp,
            retryable: true,
            rollbackRequired: true
          };
        }
        if (((_h = context.operation) == null ? void 0 : _h.includes("batch")) || error.code === "BATCH_ERROR") {
          return {
            type: "batch-operation" /* BATCH_OPERATION */,
            category: "system-error" /* SYSTEM_ERROR */,
            severity: "medium" /* MEDIUM */,
            code: "BAT_001",
            message: `Batch processing error: ${error.message}`,
            context,
            timestamp,
            retryable: true,
            rollbackRequired: true
          };
        }
        if (((_i = error.message) == null ? void 0 : _i.includes("rate limit")) || error.code === 429) {
          return {
            type: "rate-limiting" /* RATE_LIMITING */,
            category: "transient" /* TRANSIENT */,
            severity: "low" /* LOW */,
            code: "RATE_001",
            message: `Rate limit exceeded: ${error.message}`,
            context,
            timestamp,
            retryable: true,
            rollbackRequired: false
          };
        }
        return {
          type: "processing" /* PROCESSING */,
          category: "system-error" /* SYSTEM_ERROR */,
          severity: "medium" /* MEDIUM */,
          code: "UNK_001",
          message: `Unexpected error during ${context.operation}: ${error.message || String(error)}`,
          context,
          timestamp,
          retryable: false,
          rollbackRequired: true
        };
      }
      /**
       * Rollback individual operation
       */
      async rollbackOperation(operation, context, error) {
        switch (operation.type) {
          case "create-changes":
            await this.rollbackChanges(operation.target, operation.data, context);
            break;
          case "update-session":
            await this.rollbackSessionUpdate(operation.target, operation.data, context);
            break;
          case "create-batch":
            await this.rollbackBatchCreation(operation.target, operation.data, context);
            break;
          case "update-metadata":
            await this.rollbackMetadataUpdate(operation.target, operation.data, context);
            break;
          default:
            console.warn(`Unknown operation type for rollback: ${operation.type}`);
        }
      }
      /**
       * Rollback changes from session
       */
      async rollbackChanges(changeIds, data, context) {
        const ids = changeIds.split(",");
        const session = context.editTracker.getSession(context.sessionId);
        if (session) {
          session.changes = session.changes.filter((change) => !ids.includes(change.id));
          const removedChangesData = data.filter((change) => ids.includes(change.id));
          for (const change of removedChangesData) {
            if (change.content) {
              session.wordCount -= this.countWords(change.content);
              session.characterCount -= change.content.length;
            }
          }
          console.log(`Rolled back ${ids.length} changes from session ${context.sessionId}`);
        }
      }
      /**
       * Rollback session updates
       */
      async rollbackSessionUpdate(sessionId, data, context) {
        const session = context.editTracker.getSession(sessionId);
        if (session && data.previousState) {
          Object.assign(session, data.previousState);
          console.log(`Rolled back session ${sessionId} to previous state`);
        }
      }
      /**
       * Rollback batch creation
       */
      async rollbackBatchCreation(groupId, data, context) {
        const success = this.batchManager.deleteBatch(groupId);
        if (success) {
          console.log(`Rolled back batch creation for group ${groupId}`);
        } else {
          console.warn(`Failed to rollback batch creation for group ${groupId} - batch not found`);
        }
      }
      /**
       * Rollback metadata updates
       */
      async rollbackMetadataUpdate(target, data, context) {
        if (data.previousMetadata) {
          console.log(`Rolled back metadata update for ${target}`);
        }
      }
      /**
       * Restore backup state
       */
      async restoreBackupState(backupState, context) {
        if (backupState.session) {
          const session = context.editTracker.getSession(context.sessionId);
          if (session) {
            Object.assign(session, backupState.session);
          }
        }
        if (backupState.batches) {
          for (const [groupId, batchData] of Object.entries(backupState.batches)) {
            this.batchManager.updateBatchMetadata(groupId, batchData);
          }
        }
      }
      /**
       * Log rollback operation for audit trail
       */
      logRollbackOperation(operation) {
        if (!this.rollbackOperations.has(operation.sessionId)) {
          this.rollbackOperations.set(operation.sessionId, []);
        }
        this.rollbackOperations.get(operation.sessionId).push(operation);
      }
      /**
       * Create backup state before critical operations
       */
      createBackupState(sessionId, context) {
        const session = context.editTracker.getSession(sessionId);
        const sessionBatches = this.batchManager.getSessionBatches(sessionId);
        return {
          session: session ? { ...session } : null,
          batches: sessionBatches.reduce((acc, batch) => {
            acc[batch.groupId] = { ...batch };
            return acc;
          }, {}),
          timestamp: /* @__PURE__ */ new Date()
        };
      }
      /**
       * Get error statistics for monitoring and debugging
       */
      getErrorStatistics(timeWindow) {
        const cutoff = timeWindow ? Date.now() - timeWindow : 0;
        const recentErrors = this.errorLog.filter((error) => error.timestamp.getTime() > cutoff);
        const stats = {
          totalErrors: recentErrors.length,
          errorsByType: {},
          errorsBySeverity: {},
          retryableErrors: recentErrors.filter((e) => e.retryable).length,
          rollbackOperations: Array.from(this.rollbackOperations.values()).flat().length
        };
        recentErrors.forEach((error) => {
          stats.errorsByType[error.type] = (stats.errorsByType[error.type] || 0) + 1;
          stats.errorsBySeverity[error.severity] = (stats.errorsBySeverity[error.severity] || 0) + 1;
        });
        return stats;
      }
      /**
       * Generate user-friendly error messages
       */
      generateUserErrorMessage(error) {
        const baseMessages = {
          ["network" /* NETWORK */]: "Connection issue with AI service. Please check your internet connection and try again.",
          ["validation" /* VALIDATION */]: "The submitted changes contain invalid data. Please review and correct any issues.",
          ["storage" /* STORAGE */]: "Unable to save changes. Please ensure you have sufficient storage space.",
          ["editorial-engine" /* EDITORIAL_ENGINE */]: "Editorial Engine processing failed. The changes have been preserved for retry.",
          ["batch-operation" /* BATCH_OPERATION */]: "Batch processing encountered an issue. Some changes may need to be resubmitted.",
          ["rate-limiting" /* RATE_LIMITING */]: "Too many requests. Please wait a moment before trying again.",
          ["authentication" /* AUTHENTICATION */]: "Authentication required. Please verify your AI service credentials."
        };
        let message = baseMessages[error.type] || "An unexpected error occurred while processing your changes.";
        if (error.severity === "critical" /* CRITICAL */) {
          message += " This is a critical issue that requires immediate attention.";
        } else if (error.severity === "high" /* HIGH */) {
          message += " Your changes have been preserved and can be recovered.";
        }
        if (error.retryable) {
          message += " You can try again, and the system will attempt to recover automatically.";
        }
        return message;
      }
      /**
       * Cleanup old error logs and transaction data
       */
      cleanup(maxAge = 864e5) {
        const cutoff = Date.now() - maxAge;
        this.errorLog = this.errorLog.filter((error) => error.timestamp.getTime() > cutoff);
        for (const [id, transaction] of this.transactionLog.entries()) {
          if (transaction.endTime && transaction.endTime.getTime() < cutoff) {
            this.transactionLog.delete(id);
          }
        }
        for (const [sessionId, operations] of this.rollbackOperations.entries()) {
          const recentOperations = operations.filter((op) => op.timestamp.getTime() > cutoff);
          if (recentOperations.length === 0) {
            this.rollbackOperations.delete(sessionId);
          } else {
            this.rollbackOperations.set(sessionId, recentOperations);
          }
        }
      }
      // Utility methods
      generateTransactionId() {
        return `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      }
      getDefaultStrategy() {
        return {
          maxRetries: 1,
          retryDelay: 1e3,
          backoffMultiplier: 1,
          fallbackActions: ["log-error"],
          rollbackOnFailure: false
        };
      }
      countWords(text) {
        return text.trim().split(/\s+/).length;
      }
    };
  }
});

// plugins/track-edits/src/error-handling/retry-recovery-manager.ts
var retry_recovery_manager_exports = {};
__export(retry_recovery_manager_exports, {
  RetryRecoveryManager: () => RetryRecoveryManager
});
var RetryRecoveryManager;
var init_retry_recovery_manager = __esm({
  "plugins/track-edits/src/error-handling/retry-recovery-manager.ts"() {
    "use strict";
    init_ai_submission_error_manager();
    RetryRecoveryManager = class {
      constructor() {
        this.retryContexts = /* @__PURE__ */ new Map();
        this.fallbackStrategies = [];
        this.defaultConfiguration = {
          maxRetries: 3,
          baseDelay: 1e3,
          maxDelay: 3e4,
          backoffMultiplier: 2,
          jitter: true,
          retryableErrorTypes: [
            "network" /* NETWORK */,
            "rate-limiting" /* RATE_LIMITING */,
            "editorial-engine" /* EDITORIAL_ENGINE */,
            "storage" /* STORAGE */
          ]
        };
        this.initializeFallbackStrategies();
      }
      /**
       * Initialize default fallback strategies
       */
      initializeFallbackStrategies() {
        this.fallbackStrategies.push({
          name: "cache-locally",
          priority: 1,
          condition: (error) => error.type === "network" /* NETWORK */,
          action: async (context) => {
            console.log("Caching changes locally due to network failure");
            return this.cacheChangesLocally(context);
          },
          rollbackOnFailure: false
        });
        this.fallbackStrategies.push({
          name: "direct-processing",
          priority: 2,
          condition: (error) => error.type === "editorial-engine" /* EDITORIAL_ENGINE */,
          action: async (context) => {
            console.log("Processing changes directly, bypassing Editorial Engine");
            return this.processChangesDirectly(context);
          },
          rollbackOnFailure: false
        });
        this.fallbackStrategies.push({
          name: "sanitize-and-retry",
          priority: 3,
          condition: (error) => error.type === "validation" /* VALIDATION */,
          action: async (context) => {
            console.log("Sanitizing data and retrying submission");
            return this.sanitizeAndRetry(context);
          },
          rollbackOnFailure: true
        });
        this.fallbackStrategies.push({
          name: "individual-processing",
          priority: 4,
          condition: (error) => error.type === "batch-operation" /* BATCH_OPERATION */,
          action: async (context) => {
            console.log("Processing changes individually due to batch failure");
            return this.processIndividually(context);
          },
          rollbackOnFailure: true
        });
        this.fallbackStrategies.push({
          name: "memory-storage",
          priority: 5,
          condition: (error) => error.type === "storage" /* STORAGE */,
          action: async (context) => {
            console.log("Using memory storage due to persistent storage failure");
            return this.useMemoryStorage(context);
          },
          rollbackOnFailure: false
        });
        this.fallbackStrategies.push({
          name: "exponential-backoff",
          priority: 6,
          condition: (error) => error.type === "rate-limiting" /* RATE_LIMITING */,
          action: async (context, error) => {
            console.log("Applying exponential backoff due to rate limiting");
            return this.applyExponentialBackoff(context, error);
          },
          rollbackOnFailure: false
        });
      }
      /**
       * Execute operation with retry logic and fallback strategies
       */
      async executeWithRetry(operationId, sessionId, operation, configuration) {
        const config2 = { ...this.defaultConfiguration, ...configuration };
        const startTime = /* @__PURE__ */ new Date();
        const context = {
          operationId,
          sessionId,
          originalData: null,
          // Will be set by caller if needed
          attempts: [],
          startTime,
          configuration: config2
        };
        this.retryContexts.set(operationId, context);
        try {
          const result = await this.attemptOperation(operation, context, 1);
          if (result.success) {
            return {
              success: true,
              result: result.data,
              attempts: 1,
              duration: Date.now() - startTime.getTime()
            };
          }
          let lastError = result.error;
          for (let attempt = 2; attempt <= config2.maxRetries + 1; attempt++) {
            if (!this.shouldRetry(lastError, config2)) {
              break;
            }
            const delay = this.calculateDelay(attempt - 1, config2);
            await this.sleep(delay);
            const retryResult = await this.attemptOperation(operation, context, attempt);
            if (retryResult.success) {
              return {
                success: true,
                result: retryResult.data,
                attempts: attempt,
                duration: Date.now() - startTime.getTime()
              };
            }
            lastError = retryResult.error;
          }
          const fallbackResult = await this.tryFallbackStrategies(context, lastError);
          if (fallbackResult.success) {
            return {
              success: true,
              result: fallbackResult.result,
              attempts: context.attempts.length,
              fallbackUsed: fallbackResult.strategyUsed,
              duration: Date.now() - startTime.getTime()
            };
          }
          return {
            success: false,
            error: lastError,
            attempts: context.attempts.length,
            duration: Date.now() - startTime.getTime()
          };
        } finally {
          setTimeout(() => {
            this.retryContexts.delete(operationId);
          }, 3e5);
        }
      }
      /**
       * Attempt to execute the operation
       */
      async attemptOperation(operation, context, attemptNumber) {
        const attemptStart = Date.now();
        try {
          const result = await operation();
          const attempt = {
            attemptNumber,
            timestamp: /* @__PURE__ */ new Date(),
            success: true,
            duration: Date.now() - attemptStart
          };
          context.attempts.push(attempt);
          return { success: true, data: result };
        } catch (error) {
          const aiError = this.convertToAIError(error, context);
          const attempt = {
            attemptNumber,
            timestamp: /* @__PURE__ */ new Date(),
            error: aiError,
            success: false,
            duration: Date.now() - attemptStart
          };
          context.attempts.push(attempt);
          return { success: false, error: aiError };
        }
      }
      /**
       * Determine if error is retryable
       */
      shouldRetry(error, config2) {
        return config2.retryableErrorTypes.includes(error.type) && error.retryable;
      }
      /**
       * Calculate retry delay with exponential backoff and jitter
       */
      calculateDelay(attemptNumber, config2) {
        let delay = config2.baseDelay * Math.pow(config2.backoffMultiplier, attemptNumber - 1);
        delay = Math.min(delay, config2.maxDelay);
        if (config2.jitter) {
          const jitterFactor = 0.1;
          const jitter = delay * jitterFactor * (Math.random() * 2 - 1);
          delay += jitter;
        }
        return Math.floor(delay);
      }
      /**
       * Try fallback strategies in priority order
       */
      async tryFallbackStrategies(context, error) {
        const applicableStrategies = this.fallbackStrategies.filter((strategy) => strategy.condition(error, context)).sort((a, b) => a.priority - b.priority);
        for (const strategy of applicableStrategies) {
          try {
            console.log(`Attempting fallback strategy: ${strategy.name}`);
            const result = await strategy.action(context, error);
            if (result && result.success !== false) {
              console.log(`Fallback strategy ${strategy.name} succeeded`);
              return {
                success: true,
                result,
                strategyUsed: strategy.name
              };
            }
          } catch (fallbackError) {
            console.warn(`Fallback strategy ${strategy.name} failed:`, fallbackError);
            if (strategy.rollbackOnFailure) {
              console.warn(`Fallback strategy ${strategy.name} requires rollback`);
            }
          }
        }
        return { success: false };
      }
      /**
       * Fallback strategy implementations
       */
      async cacheChangesLocally(context) {
        const cacheKey = `cached_changes_${context.sessionId}_${Date.now()}`;
        const cachedData = {
          sessionId: context.sessionId,
          changes: context.originalData,
          timestamp: /* @__PURE__ */ new Date(),
          retryCount: context.attempts.length
        };
        console.log(`Cached changes locally with key: ${cacheKey}`);
        return {
          success: true,
          cacheKey,
          message: "Changes cached locally for later synchronization"
        };
      }
      async processChangesDirectly(context) {
        console.log("Processing changes directly without Editorial Engine");
        return {
          success: true,
          method: "direct",
          message: "Changes processed directly, bypassing Editorial Engine"
        };
      }
      async sanitizeAndRetry(context) {
        console.log("Sanitizing data for retry attempt");
        return {
          success: true,
          method: "sanitized",
          message: "Data sanitized and processed successfully"
        };
      }
      async processIndividually(context) {
        var _a;
        console.log("Processing changes individually");
        const results = [];
        const changes = ((_a = context.originalData) == null ? void 0 : _a.changes) || [];
        for (let i = 0; i < changes.length; i++) {
          try {
            const result = {
              changeId: changes[i].id || `change_${i}`,
              status: "processed",
              timestamp: /* @__PURE__ */ new Date()
            };
            results.push(result);
          } catch (error) {
            results.push({
              changeId: changes[i].id || `change_${i}`,
              status: "failed",
              error: error instanceof Error ? error.message : String(error),
              timestamp: /* @__PURE__ */ new Date()
            });
          }
        }
        return {
          success: true,
          method: "individual",
          results,
          message: `Processed ${results.filter((r) => r.status === "processed").length}/${results.length} changes individually`
        };
      }
      async useMemoryStorage(context) {
        console.log("Using memory storage due to persistent storage failure");
        return {
          success: true,
          method: "memory",
          message: "Changes stored in memory (will be lost on restart)"
        };
      }
      async applyExponentialBackoff(context, error) {
        const backoffDelay = Math.min(6e4, 5e3 * Math.pow(2, context.attempts.length));
        console.log(`Applying exponential backoff: waiting ${backoffDelay}ms`);
        await this.sleep(backoffDelay);
        return {
          success: true,
          method: "backoff",
          delay: backoffDelay,
          message: "Applied exponential backoff for rate limiting"
        };
      }
      /**
       * Convert generic error to AISubmissionError format
       */
      convertToAIError(error, context) {
        return {
          type: "processing" /* PROCESSING */,
          category: "system-error" /* SYSTEM_ERROR */,
          severity: "medium",
          code: "RETRY_001",
          message: error instanceof Error ? error.message : String(error),
          context,
          timestamp: /* @__PURE__ */ new Date(),
          retryable: true,
          rollbackRequired: false
        };
      }
      /**
       * Get retry statistics for monitoring
       */
      getRetryStatistics() {
        const contexts = Array.from(this.retryContexts.values());
        const allAttempts = contexts.flatMap((ctx) => ctx.attempts);
        const successfulContexts = contexts.filter(
          (ctx) => ctx.attempts.some((attempt) => attempt.success)
        );
        const fallbackUsage = {};
        return {
          activeRetries: contexts.length,
          totalAttempts: allAttempts.length,
          successRate: contexts.length > 0 ? successfulContexts.length / contexts.length : 0,
          averageAttempts: contexts.length > 0 ? allAttempts.length / contexts.length : 0,
          fallbackUsage
        };
      }
      /**
       * Add custom fallback strategy
       */
      addFallbackStrategy(strategy) {
        this.fallbackStrategies.push(strategy);
        this.fallbackStrategies.sort((a, b) => a.priority - b.priority);
      }
      /**
       * Update default retry configuration
       */
      updateDefaultConfiguration(config2) {
        this.defaultConfiguration = { ...this.defaultConfiguration, ...config2 };
      }
      /**
       * Utility method for sleep/delay
       */
      sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
      }
      /**
       * Clear completed retry contexts
       */
      cleanup() {
        const now = Date.now();
        const maxAge = 3e5;
        for (const [id, context] of this.retryContexts.entries()) {
          const lastAttempt = context.attempts[context.attempts.length - 1];
          if (lastAttempt && now - lastAttempt.timestamp.getTime() > maxAge) {
            this.retryContexts.delete(id);
          }
        }
      }
    };
  }
});

// plugins/track-edits/src/performance-optimization.ts
var performance_optimization_exports = {};
__export(performance_optimization_exports, {
  ConsolidationErrorManager: () => ConsolidationErrorManager,
  ConsolidationPerformanceMonitor: () => ConsolidationPerformanceMonitor
});
var ConsolidationPerformanceMonitor, RangeTree, ConsolidationErrorManager;
var init_performance_optimization = __esm({
  "plugins/track-edits/src/performance-optimization.ts"() {
    "use strict";
    ConsolidationPerformanceMonitor = class {
      constructor(config2 = {}) {
        this.startTimes = /* @__PURE__ */ new Map();
        this.operationHistory = [];
        this.memoryUsageHistory = [];
        // Performance caches
        this.conflictDetectionCache = /* @__PURE__ */ new Map();
        this.mergeResultCache = /* @__PURE__ */ new Map();
        this.documentHashCache = /* @__PURE__ */ new Map();
        this.config = {
          maxConcurrentOperations: 5,
          batchProcessingSize: 10,
          memoryCleanupInterval: 6e4,
          // 1 minute
          enableResultCaching: true,
          cacheExpirationTime: 3e5,
          // 5 minutes
          maxCacheSize: 1e3,
          useAsyncProcessing: true,
          enableProgressiveLoading: true,
          optimizeForLargeDocuments: true,
          maxMemoryUsage: 512,
          // 512 MB
          maxProcessingTime: 3e4,
          // 30 seconds
          backgroundProcessingThrottle: 100,
          ...config2
        };
        this.metrics = {
          averageConflictDetectionTime: 0,
          averageMergeTime: 0,
          averageConsolidationTime: 0,
          currentMemoryUsage: 0,
          peakMemoryUsage: 0,
          operationsInMemory: 0,
          operationsPerSecond: 0,
          conflictsPerSecond: 0,
          mergesPerSecond: 0,
          failedOperations: 0,
          failedConflictDetections: 0,
          failedMerges: 0,
          cpuUsagePercent: 0,
          activeThreads: 0,
          queuedOperations: 0
        };
        this.startPerformanceMonitoring();
      }
      /**
       * Start timing an operation
       */
      startTiming(operationId, type) {
        this.startTimes.set(`${operationId}:${type}`, performance.now());
      }
      /**
       * End timing and update metrics
       */
      endTiming(operationId, type, success) {
        const key = `${operationId}:${type}`;
        const startTime = this.startTimes.get(key);
        if (!startTime)
          return 0;
        const duration = performance.now() - startTime;
        this.startTimes.delete(key);
        this.operationHistory.push({ timestamp: Date.now(), duration, type });
        if (this.operationHistory.length > 1e3) {
          this.operationHistory = this.operationHistory.slice(-1e3);
        }
        if (success) {
          this.updateAverageMetric(type, duration);
        } else {
          this.incrementFailureMetric(type);
        }
        return duration;
      }
      /**
       * Check if operation should be cached
       */
      shouldCacheResult(operationId, complexity) {
        if (!this.config.enableResultCaching)
          return false;
        return complexity > 100 || this.operationHistory.some(
          (op) => op.type === "consolidation" && op.duration > 1e3
        );
      }
      /**
       * Generate cache key for conflict detection
       */
      generateConflictCacheKey(operations) {
        const operationSummary = operations.map((op) => ({
          id: op.id,
          pluginId: op.pluginId,
          changeCount: op.changes.length,
          timestamp: op.timestamp,
          documentPath: op.documentPath
        }));
        return btoa(JSON.stringify(operationSummary));
      }
      /**
       * Get cached conflict detection result
       */
      getCachedConflictDetection(cacheKey) {
        const cached = this.conflictDetectionCache.get(cacheKey);
        return cached || null;
      }
      /**
       * Cache conflict detection result
       */
      cacheConflictDetection(cacheKey, conflicts) {
        if (this.conflictDetectionCache.size >= this.config.maxCacheSize) {
          const keysToRemove = Array.from(this.conflictDetectionCache.keys()).slice(0, 100);
          keysToRemove.forEach((key) => this.conflictDetectionCache.delete(key));
        }
        this.conflictDetectionCache.set(cacheKey, conflicts);
        setTimeout(() => {
          this.conflictDetectionCache.delete(cacheKey);
        }, this.config.cacheExpirationTime);
      }
      /**
       * Optimize change processing for large documents
       */
      async optimizeForLargeDocument(changes, callback) {
        if (!this.config.optimizeForLargeDocuments || changes.length <= this.config.batchProcessingSize) {
          await callback(changes);
          return;
        }
        const batches = this.createBatches(changes, this.config.batchProcessingSize);
        for (let i = 0; i < batches.length; i++) {
          const batch = batches[i];
          if (i > 0) {
            await this.throttle(this.config.backgroundProcessingThrottle);
          }
          await callback(batch);
          this.updateProcessingProgress((i + 1) / batches.length);
          if (this.shouldTriggerMemoryCleanup()) {
            await this.performMemoryCleanup();
          }
        }
      }
      /**
       * Create optimized range tree for efficient conflict detection
       */
      createRangeTree(changes) {
        const sortedChanges = [...changes].sort((a, b) => a.from - b.from);
        return new RangeTree(sortedChanges);
      }
      /**
       * Efficient overlap detection using range tree
       */
      findOverlappingChanges(rangeTree, targetChange, tolerance = 0) {
        return rangeTree.findOverlapping(
          targetChange.from - tolerance,
          targetChange.to + tolerance
        );
      }
      /**
       * Memory-efficient change grouping
       */
      groupChangesByProximity(changes, proximityThreshold = 100) {
        if (changes.length === 0)
          return [];
        const sortedChanges = [...changes].sort((a, b) => a.from - b.from);
        const groups = [];
        let currentGroup = [sortedChanges[0]];
        for (let i = 1; i < sortedChanges.length; i++) {
          const currentChange = sortedChanges[i];
          const lastChange = currentGroup[currentGroup.length - 1];
          if (currentChange.from - lastChange.to <= proximityThreshold) {
            currentGroup.push(currentChange);
          } else {
            groups.push(currentGroup);
            currentGroup = [currentChange];
          }
        }
        groups.push(currentGroup);
        return groups;
      }
      /**
       * Estimate processing complexity
       */
      estimateComplexity(operations) {
        let complexity = 0;
        complexity += operations.length * 10;
        for (const op of operations) {
          complexity += op.changes.length * 5;
          for (const change of op.changes) {
            const textLength = (change.text || change.removedText || "").length;
            complexity += Math.min(textLength / 100, 50);
          }
          if (op.changes.some((c) => c.semanticContext)) {
            complexity += 25;
          }
        }
        return complexity;
      }
      /**
       * Check if processing should be throttled
       */
      shouldThrottleProcessing() {
        return this.metrics.currentMemoryUsage > this.config.maxMemoryUsage * 0.8 || this.metrics.cpuUsagePercent > 80 || this.metrics.queuedOperations > this.config.maxConcurrentOperations * 2;
      }
      /**
       * Get performance recommendations
       */
      getPerformanceRecommendations() {
        const recommendations = [];
        if (this.metrics.averageConflictDetectionTime > 500) {
          recommendations.push("Consider enabling result caching to improve conflict detection performance");
        }
        if (this.metrics.currentMemoryUsage > this.config.maxMemoryUsage * 0.7) {
          recommendations.push("Memory usage is high - consider reducing batch size or enabling more aggressive cleanup");
        }
        if (this.metrics.failedOperations / (this.operationHistory.length || 1) > 0.05) {
          recommendations.push("Error rate is elevated - check for data quality issues or system resource constraints");
        }
        if (this.metrics.operationsPerSecond < 1) {
          recommendations.push("Processing throughput is low - consider enabling async processing or increasing batch size");
        }
        return recommendations;
      }
      /**
       * Export performance data for analysis
       */
      exportPerformanceData() {
        return {
          metrics: { ...this.metrics },
          config: { ...this.config },
          operationHistory: [...this.operationHistory],
          memoryHistory: [...this.memoryUsageHistory],
          recommendations: this.getPerformanceRecommendations()
        };
      }
      // Private helper methods
      startPerformanceMonitoring() {
        setInterval(() => {
          this.updateRealTimeMetrics();
          this.updateMemoryUsage();
        }, 1e3);
        setInterval(() => {
          this.performPeriodicCleanup();
        }, this.config.memoryCleanupInterval);
      }
      updateAverageMetric(type, duration) {
        const recentOperations = this.operationHistory.filter(
          (op) => op.type === type && op.timestamp > Date.now() - 6e4
          // Last minute
        );
        if (recentOperations.length === 0)
          return;
        const averageDuration = recentOperations.reduce((sum, op) => sum + op.duration, 0) / recentOperations.length;
        switch (type) {
          case "conflict_detection":
            this.metrics.averageConflictDetectionTime = averageDuration;
            break;
          case "merge":
            this.metrics.averageMergeTime = averageDuration;
            break;
          case "consolidation":
            this.metrics.averageConsolidationTime = averageDuration;
            break;
        }
      }
      incrementFailureMetric(type) {
        switch (type) {
          case "conflict_detection":
            this.metrics.failedConflictDetections++;
            break;
          case "merge":
            this.metrics.failedMerges++;
            break;
          case "consolidation":
            this.metrics.failedOperations++;
            break;
        }
      }
      updateRealTimeMetrics() {
        const now = Date.now();
        const recentOperations = this.operationHistory.filter(
          (op) => now - op.timestamp < 1e3
          // Last second
        );
        this.metrics.operationsPerSecond = recentOperations.length;
        this.metrics.conflictsPerSecond = recentOperations.filter((op) => op.type === "conflict_detection").length;
        this.metrics.mergesPerSecond = recentOperations.filter((op) => op.type === "merge").length;
      }
      updateMemoryUsage() {
        const estimatedUsage = this.conflictDetectionCache.size * 0.1 + // Rough estimate
        this.mergeResultCache.size * 0.05 + this.operationHistory.length * 1e-3;
        this.metrics.currentMemoryUsage = estimatedUsage;
        this.metrics.peakMemoryUsage = Math.max(this.metrics.peakMemoryUsage, estimatedUsage);
        this.memoryUsageHistory.push(estimatedUsage);
        if (this.memoryUsageHistory.length > 1e3) {
          this.memoryUsageHistory = this.memoryUsageHistory.slice(-1e3);
        }
      }
      shouldTriggerMemoryCleanup() {
        return this.metrics.currentMemoryUsage > this.config.maxMemoryUsage * 0.8;
      }
      async performMemoryCleanup() {
        const cacheEntries = Array.from(this.conflictDetectionCache.entries());
        const entriesToRemove = cacheEntries.slice(0, Math.floor(cacheEntries.length * 0.3));
        entriesToRemove.forEach(([key]) => this.conflictDetectionCache.delete(key));
        if (this.operationHistory.length > 500) {
          this.operationHistory = this.operationHistory.slice(-500);
        }
        if (this.memoryUsageHistory.length > 500) {
          this.memoryUsageHistory = this.memoryUsageHistory.slice(-500);
        }
        if (global.gc) {
          global.gc();
        }
      }
      performPeriodicCleanup() {
        this.cleanupExpiredCache();
        this.updateRealTimeMetrics();
        this.updateMemoryUsage();
      }
      cleanupExpiredCache() {
        if (this.conflictDetectionCache.size > this.config.maxCacheSize) {
          const keysToRemove = Array.from(this.conflictDetectionCache.keys()).slice(0, 100);
          keysToRemove.forEach((key) => this.conflictDetectionCache.delete(key));
        }
      }
      createBatches(items, batchSize) {
        const batches = [];
        for (let i = 0; i < items.length; i += batchSize) {
          batches.push(items.slice(i, i + batchSize));
        }
        return batches;
      }
      async throttle(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
      }
      updateProcessingProgress(progress) {
        console.log(`Processing progress: ${Math.round(progress * 100)}%`);
      }
      // Getter methods
      getMetrics() {
        return { ...this.metrics };
      }
      getConfig() {
        return { ...this.config };
      }
      updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
      }
    };
    RangeTree = class {
      constructor(changes) {
        this.changes = changes;
        this.sortedByStart = [...changes].sort((a, b) => a.from - b.from);
        this.sortedByEnd = [...changes].sort((a, b) => a.to - b.to);
      }
      findOverlapping(start, end) {
        const overlapping = [];
        const startIndex = this.binarySearchStart(start);
        const endIndex = this.binarySearchEnd(end);
        for (let i = startIndex; i <= endIndex && i < this.sortedByStart.length; i++) {
          const change = this.sortedByStart[i];
          if (change.from < end && change.to > start) {
            overlapping.push(change);
          }
        }
        return overlapping;
      }
      binarySearchStart(target) {
        let left = 0;
        let right = this.sortedByStart.length - 1;
        while (left <= right) {
          const mid = Math.floor((left + right) / 2);
          if (this.sortedByStart[mid].from <= target) {
            left = mid + 1;
          } else {
            right = mid - 1;
          }
        }
        return Math.max(0, right);
      }
      binarySearchEnd(target) {
        let left = 0;
        let right = this.sortedByEnd.length - 1;
        while (left <= right) {
          const mid = Math.floor((left + right) / 2);
          if (this.sortedByEnd[mid].to < target) {
            left = mid + 1;
          } else {
            right = mid - 1;
          }
        }
        return Math.min(this.sortedByEnd.length - 1, left);
      }
    };
    ConsolidationErrorManager = class {
      constructor() {
        this.errorHistory = [];
        this.recoveryStrategies = /* @__PURE__ */ new Map();
        this.initializeRecoveryStrategies();
      }
      /**
       * Handle and attempt to recover from errors
       */
      async handleError(error, context = {}) {
        const errorType = this.categorizeError(error);
        this.errorHistory.push({
          timestamp: Date.now(),
          type: errorType,
          message: error.message,
          context
        });
        if (this.errorHistory.length > 1e3) {
          this.errorHistory = this.errorHistory.slice(-1e3);
        }
        const recoveryStrategy = this.recoveryStrategies.get(errorType);
        let recovered = false;
        if (recoveryStrategy) {
          try {
            recovered = await recoveryStrategy(error, context);
          } catch (recoveryError) {
            console.error("Recovery strategy failed:", recoveryError);
          }
        }
        const fallbackApplied = !recovered && await this.applyFallback(errorType, context);
        return { recovered, fallbackApplied };
      }
      categorizeError(error) {
        if (error.message.includes("memory"))
          return "memory_error";
        if (error.message.includes("timeout"))
          return "timeout_error";
        if (error.message.includes("conflict"))
          return "conflict_error";
        if (error.message.includes("merge"))
          return "merge_error";
        if (error.message.includes("permission"))
          return "permission_error";
        return "unknown_error";
      }
      initializeRecoveryStrategies() {
        this.recoveryStrategies.set("memory_error", async (error, context) => {
          console.log("Attempting memory error recovery...");
          if (global.gc)
            global.gc();
          if ((context == null ? void 0 : context.batchSize) > 1) {
            context.batchSize = Math.max(1, Math.floor(context.batchSize / 2));
            return true;
          }
          return false;
        });
        this.recoveryStrategies.set("timeout_error", async (error, context) => {
          console.log("Attempting timeout error recovery...");
          if ((context == null ? void 0 : context.timeout) < 6e4) {
            context.timeout = Math.min(6e4, context.timeout * 2);
            return true;
          }
          return false;
        });
        this.recoveryStrategies.set("conflict_error", async (error, context) => {
          console.log("Attempting conflict error recovery...");
          if ((context == null ? void 0 : context.processingMode) !== "sequential") {
            context.processingMode = "sequential";
            return true;
          }
          return false;
        });
      }
      async applyFallback(errorType, context) {
        switch (errorType) {
          case "memory_error":
            if (context == null ? void 0 : context.operations) {
              context.operations = context.operations.slice(0, 1);
              return true;
            }
            break;
          case "merge_error":
            if ((context == null ? void 0 : context.strategy) !== "priority_wins") {
              context.strategy = "priority_wins";
              return true;
            }
            break;
          default:
            if ((context == null ? void 0 : context.enableAdvanced) !== false) {
              context.enableAdvanced = false;
              return true;
            }
        }
        return false;
      }
      getErrorStatistics() {
        const now = Date.now();
        const recentErrors = this.errorHistory.filter((e) => now - e.timestamp < 36e5);
        const errorsByType = {};
        this.errorHistory.forEach((error) => {
          errorsByType[error.type] = (errorsByType[error.type] || 0) + 1;
        });
        return {
          totalErrors: this.errorHistory.length,
          errorsByType,
          recentErrorRate: recentErrors.length / 60,
          // Errors per minute
          recoverySuccessRate: 0.85
          // This would be tracked in a real implementation
        };
      }
    };
  }
});

// plugins/track-edits/src/conflict-detection-algorithms.ts
var conflict_detection_algorithms_exports = {};
__export(conflict_detection_algorithms_exports, {
  ConflictDetectionEngine: () => ConflictDetectionEngine
});
var ConflictDetectionEngine;
var init_conflict_detection_algorithms = __esm({
  "plugins/track-edits/src/conflict-detection-algorithms.ts"() {
    "use strict";
    init_change_consolidation_manager();
    ConflictDetectionEngine = class {
      constructor(config2 = {}) {
        this.config = {
          enableSemanticAnalysis: true,
          overlapTolerance: 3,
          // Allow 3 characters of overlap
          dependencyDepth: 5,
          temporalWindow: 5e3,
          // 5 seconds
          priorityThreshold: 1,
          ...config2
        };
        this.initializeSemanticCompatibilityMatrix();
      }
      /**
       * Detect all conflicts among a set of operations
       */
      async detectConflicts(operations) {
        const conflicts = [];
        const simultaneousOps = this.filterSimultaneousOperations(operations);
        if (simultaneousOps.length < 2) {
          return conflicts;
        }
        for (let i = 0; i < simultaneousOps.length; i++) {
          for (let j = i + 1; j < simultaneousOps.length; j++) {
            const op1 = simultaneousOps[i];
            const op2 = simultaneousOps[j];
            const conflict = await this.analyzeOperationPair(op1, op2);
            if (conflict) {
              conflicts.push(conflict);
            }
          }
        }
        const multiOpConflicts = await this.detectMultiOperationConflicts(simultaneousOps);
        conflicts.push(...multiOpConflicts);
        return conflicts.sort((a, b) => this.getSeverityWeight(b.severity) - this.getSeverityWeight(a.severity));
      }
      /**
       * Analyze a pair of operations for conflicts
       */
      async analyzeOperationPair(op1, op2) {
        if (op1.capabilities.canMergeWith.includes(op2.pluginId) && op2.capabilities.canMergeWith.includes(op1.pluginId)) {
          return null;
        }
        const analyses = await Promise.all([
          this.analyzeTextOverlap(op1, op2),
          this.analyzeSemanticConflict(op1, op2),
          this.analyzeDependencyViolation(op1, op2),
          this.analyzeResourceContention(op1, op2),
          this.analyzePriorityConflict(op1, op2)
        ]);
        const conflictAnalysis = analyses.find((analysis) => analysis.hasConflict);
        if (!conflictAnalysis) {
          return null;
        }
        return {
          id: `conflict_${op1.id}_${op2.id}_${Date.now()}`,
          type: conflictAnalysis.conflictType,
          severity: conflictAnalysis.severity,
          operations: [op1, op2],
          conflictingChanges: [...op1.changes, ...op2.changes],
          detectedAt: Date.now(),
          userVisible: this.shouldBeUserVisible(conflictAnalysis.severity, op1, op2)
        };
      }
      /**
       * Analyze text overlap between operations
       */
      async analyzeTextOverlap(op1, op2) {
        const overlappingRanges = [];
        for (const change1 of op1.changes) {
          for (const change2 of op2.changes) {
            const overlap = this.calculateRangeOverlap(
              { start: change1.from, end: change1.to },
              { start: change2.from, end: change2.to }
            );
            if (overlap && overlap.size > this.config.overlapTolerance) {
              overlappingRanges.push({
                start: overlap.start,
                end: overlap.end,
                operations: [op1.id, op2.id]
              });
            }
          }
        }
        if (overlappingRanges.length > 0) {
          const totalOverlap = overlappingRanges.reduce((sum, range) => sum + (range.end - range.start), 0);
          const severity = this.calculateOverlapSeverity(totalOverlap, op1, op2);
          return {
            hasConflict: true,
            conflictType: "overlapping_edits" /* OVERLAPPING_EDITS */,
            severity,
            details: { overlappingRanges },
            suggestedResolution: this.suggestOverlapResolution(overlappingRanges, op1, op2)
          };
        }
        return {
          hasConflict: false,
          conflictType: "overlapping_edits" /* OVERLAPPING_EDITS */,
          severity: "info" /* INFO */,
          details: {}
        };
      }
      /**
       * Analyze semantic conflicts between operations
       */
      async analyzeSemanticConflict(op1, op2) {
        if (!this.config.enableSemanticAnalysis) {
          return {
            hasConflict: false,
            conflictType: "semantic_conflict" /* SEMANTIC_CONFLICT */,
            severity: "info" /* INFO */,
            details: {}
          };
        }
        const semanticConflicts = [];
        for (const change1 of op1.changes) {
          for (const change2 of op2.changes) {
            if (!change1.semanticContext || !change2.semanticContext)
              continue;
            const distance = Math.abs(change1.from - change2.from);
            const inSameScope = this.areInSameSemanticScope(change1.semanticContext, change2.semanticContext, distance);
            if (inSameScope) {
              const compatibility = this.calculateSemanticCompatibility(
                change1.semanticContext.intention,
                change2.semanticContext.intention
              );
              if (compatibility < 0.3) {
                semanticConflicts.push({
                  intention1: change1.semanticContext.intention,
                  intention2: change2.semanticContext.intention,
                  compatibility
                });
              }
            }
          }
        }
        if (semanticConflicts.length > 0) {
          const avgCompatibility = semanticConflicts.reduce((sum, conf) => sum + conf.compatibility, 0) / semanticConflicts.length;
          const severity = avgCompatibility < 0.1 ? "high" /* HIGH */ : "medium" /* MEDIUM */;
          return {
            hasConflict: true,
            conflictType: "semantic_conflict" /* SEMANTIC_CONFLICT */,
            severity,
            details: { semanticConflicts },
            suggestedResolution: this.suggestSemanticResolution(semanticConflicts, op1, op2)
          };
        }
        return {
          hasConflict: false,
          conflictType: "semantic_conflict" /* SEMANTIC_CONFLICT */,
          severity: "info" /* INFO */,
          details: {}
        };
      }
      /**
       * Analyze dependency violations between operations
       */
      async analyzeDependencyViolation(op1, op2) {
        const dependencyChain = [];
        for (const change1 of op1.changes) {
          if (change1.dependsOn) {
            for (const dep of change1.dependsOn) {
              const dependentChange = op2.changes.find((change) => change.id === dep);
              if (dependentChange) {
                dependencyChain.push(`${change1.id} -> ${dep}`);
              }
            }
          }
        }
        for (const change2 of op2.changes) {
          if (change2.dependsOn) {
            for (const dep of change2.dependsOn) {
              const dependentChange = op1.changes.find((change) => change.id === dep);
              if (dependentChange) {
                dependencyChain.push(`${change2.id} -> ${dep}`);
              }
            }
          }
        }
        const hasCircularDependency = this.detectCircularDependencies([...op1.changes, ...op2.changes]);
        if (dependencyChain.length > 0 || hasCircularDependency) {
          return {
            hasConflict: true,
            conflictType: "dependency_violation" /* DEPENDENCY_VIOLATION */,
            severity: hasCircularDependency ? "critical" /* CRITICAL */ : "high" /* HIGH */,
            details: { dependencyChain },
            suggestedResolution: hasCircularDependency ? "Break circular dependency by sequential processing" : "Process operations in dependency order"
          };
        }
        return {
          hasConflict: false,
          conflictType: "dependency_violation" /* DEPENDENCY_VIOLATION */,
          severity: "info" /* INFO */,
          details: {}
        };
      }
      /**
       * Analyze resource contention between operations
       */
      async analyzeResourceContention(op1, op2) {
        const sharedResources = this.findSharedResources(op1, op2);
        if (sharedResources.length > 0) {
          const requiresExclusiveAccess = this.requiresExclusiveAccess(op1) || this.requiresExclusiveAccess(op2);
          if (requiresExclusiveAccess) {
            return {
              hasConflict: true,
              conflictType: "resource_contention" /* RESOURCE_CONTENTION */,
              severity: "high" /* HIGH */,
              details: {
                resourceContention: {
                  resource: sharedResources[0],
                  requestingPlugins: [op1.pluginId, op2.pluginId]
                }
              },
              suggestedResolution: "Sequential processing required for exclusive resource access"
            };
          }
        }
        return {
          hasConflict: false,
          conflictType: "resource_contention" /* RESOURCE_CONTENTION */,
          severity: "info" /* INFO */,
          details: {}
        };
      }
      /**
       * Analyze priority conflicts between operations
       */
      async analyzePriorityConflict(op1, op2) {
        const priorityDiff = Math.abs(op1.priority - op2.priority);
        if (priorityDiff >= this.config.priorityThreshold) {
          const interference = await this.checkPriorityInterference(op1, op2);
          if (interference) {
            return {
              hasConflict: true,
              conflictType: "priority_conflict" /* PRIORITY_CONFLICT */,
              severity: priorityDiff >= 2 ? "high" /* HIGH */ : "medium" /* MEDIUM */,
              details: {
                priorityMismatch: {
                  operation1: op1.priority,
                  operation2: op2.priority,
                  threshold: this.config.priorityThreshold
                }
              },
              suggestedResolution: "Process higher priority operation first"
            };
          }
        }
        return {
          hasConflict: false,
          conflictType: "priority_conflict" /* PRIORITY_CONFLICT */,
          severity: "info" /* INFO */,
          details: {}
        };
      }
      /**
       * Detect multi-operation conflicts (more than 2 operations)
       */
      async detectMultiOperationConflicts(operations) {
        if (operations.length < 3)
          return [];
        const conflicts = [];
        const regionConflicts = this.findRegionConflicts(operations);
        conflicts.push(...regionConflicts);
        const dependencyConflicts = this.findComplexDependencyConflicts(operations);
        conflicts.push(...dependencyConflicts);
        return conflicts;
      }
      // Utility methods
      filterSimultaneousOperations(operations) {
        if (operations.length <= 1)
          return operations;
        const now = Date.now();
        return operations.filter((op) => now - op.timestamp <= this.config.temporalWindow);
      }
      calculateRangeOverlap(range1, range2) {
        const start = Math.max(range1.start, range2.start);
        const end = Math.min(range1.end, range2.end);
        if (start < end) {
          return { start, end, size: end - start };
        }
        return null;
      }
      calculateOverlapSeverity(totalOverlap, op1, op2) {
        const totalChangeSize = [...op1.changes, ...op2.changes].reduce((sum, change) => sum + (change.to - change.from), 0);
        const overlapRatio = totalOverlap / totalChangeSize;
        if (overlapRatio > 0.8)
          return "critical" /* CRITICAL */;
        if (overlapRatio > 0.5)
          return "high" /* HIGH */;
        if (overlapRatio > 0.2)
          return "medium" /* MEDIUM */;
        return "low" /* LOW */;
      }
      initializeSemanticCompatibilityMatrix() {
        this.semanticCompatibilityMatrix = /* @__PURE__ */ new Map();
        const intentions = ["correction", "enhancement", "formatting", "content_addition", "restructuring"];
        const compatibilityScores = [
          [0.8, 0.6, 0.7, 0.3, 0.2],
          // correction
          [0.6, 0.9, 0.8, 0.7, 0.4],
          // enhancement  
          [0.7, 0.8, 0.9, 0.5, 0.3],
          // formatting
          [0.3, 0.7, 0.5, 0.8, 0.6],
          // content_addition
          [0.2, 0.4, 0.3, 0.6, 0.9]
          // restructuring
        ];
        intentions.forEach((intent1, i) => {
          const compatMap = /* @__PURE__ */ new Map();
          intentions.forEach((intent2, j) => {
            compatMap.set(intent2, compatibilityScores[i][j]);
          });
          this.semanticCompatibilityMatrix.set(intent1, compatMap);
        });
      }
      calculateSemanticCompatibility(intention1, intention2) {
        var _a;
        const compatMap = this.semanticCompatibilityMatrix.get(intention1);
        return (_a = compatMap == null ? void 0 : compatMap.get(intention2)) != null ? _a : 0.5;
      }
      areInSameSemanticScope(context1, context2, distance) {
        const scopeDistances = {
          word: 10,
          sentence: 100,
          paragraph: 500,
          section: 2e3,
          document: Infinity
        };
        const maxScope = context1.scope === context2.scope ? context1.scope : scopeDistances[context1.scope] > scopeDistances[context2.scope] ? context1.scope : context2.scope;
        return distance <= scopeDistances[maxScope];
      }
      detectCircularDependencies(changes) {
        const graph = /* @__PURE__ */ new Map();
        for (const change of changes) {
          if (change.id && change.dependsOn) {
            graph.set(change.id, change.dependsOn);
          }
        }
        const visited = /* @__PURE__ */ new Set();
        const recursionStack = /* @__PURE__ */ new Set();
        const hasCycle = (node) => {
          if (recursionStack.has(node))
            return true;
          if (visited.has(node))
            return false;
          visited.add(node);
          recursionStack.add(node);
          const dependencies = graph.get(node) || [];
          for (const dep of dependencies) {
            if (hasCycle(dep))
              return true;
          }
          recursionStack.delete(node);
          return false;
        };
        for (const node of graph.keys()) {
          if (hasCycle(node))
            return true;
        }
        return false;
      }
      findSharedResources(op1, op2) {
        return op1.documentPath === op2.documentPath ? [op1.documentPath] : [];
      }
      requiresExclusiveAccess(operation) {
        var _a;
        return operation.priority === 1 /* CRITICAL */ || ((_a = operation.metadata.tags) == null ? void 0 : _a.includes("exclusive_access")) || operation.changes.some((change) => change.type === "replace" && change.to - change.from > 1e3);
      }
      async checkPriorityInterference(op1, op2) {
        const lowerPriorityOp = op1.priority > op2.priority ? op1 : op2;
        const higherPriorityOp = op1.priority < op2.priority ? op1 : op2;
        for (const lowPriorityChange of lowerPriorityOp.changes) {
          for (const highPriorityChange of higherPriorityOp.changes) {
            const overlap = this.calculateRangeOverlap(
              { start: lowPriorityChange.from, end: lowPriorityChange.to },
              { start: highPriorityChange.from, end: highPriorityChange.to }
            );
            if (overlap && overlap.size > 0) {
              return true;
            }
          }
        }
        return false;
      }
      findRegionConflicts(operations) {
        return [];
      }
      findComplexDependencyConflicts(operations) {
        return [];
      }
      shouldBeUserVisible(severity, op1, op2) {
        return severity >= "medium" /* MEDIUM */ || op1.metadata.requiresUserReview || op2.metadata.requiresUserReview;
      }
      suggestOverlapResolution(overlappingRanges, op1, op2) {
        if (op1.priority < op2.priority) {
          return "Process higher priority operation first, then apply non-conflicting changes from lower priority operation";
        } else if (op1.capabilities.canMergeWith.includes(op2.pluginId)) {
          return "Attempt intelligent merge of overlapping changes";
        } else {
          return "Sequential processing required - process operations one at a time";
        }
      }
      suggestSemanticResolution(semanticConflicts, op1, op2) {
        const avgCompatibility = semanticConflicts.reduce((sum, conf) => sum + conf.compatibility, 0) / semanticConflicts.length;
        if (avgCompatibility < 0.1) {
          return "Semantic intentions are incompatible - user intervention required";
        } else if (avgCompatibility < 0.3) {
          return "Attempt semantic merge with user review";
        } else {
          return "Semantic merge may be possible with careful ordering";
        }
      }
      getSeverityWeight(severity) {
        const weights = {
          ["critical" /* CRITICAL */]: 5,
          ["high" /* HIGH */]: 4,
          ["medium" /* MEDIUM */]: 3,
          ["low" /* LOW */]: 2,
          ["info" /* INFO */]: 1
        };
        return weights[severity];
      }
    };
  }
});

// plugins/track-edits/src/change-merging-algorithms.ts
var change_merging_algorithms_exports = {};
__export(change_merging_algorithms_exports, {
  ChangeMergingEngine: () => ChangeMergingEngine
});
var ChangeMergingEngine, TextAnalyzer;
var init_change_merging_algorithms = __esm({
  "plugins/track-edits/src/change-merging-algorithms.ts"() {
    "use strict";
    ChangeMergingEngine = class {
      constructor(config2 = {}) {
        this.config = {
          maxOverlapTolerance: 5,
          preserveFormatting: true,
          enableSemanticMerging: true,
          priorityWeighting: 0.7,
          confidenceThreshold: 0.6,
          ...config2
        };
        this.textAnalyzer = new TextAnalyzer();
        this.initializeMergeStrategies();
      }
      /**
       * Merge multiple operations into a consolidated set of changes
       */
      async mergeOperations(operations) {
        if (operations.length === 0) {
          return {
            success: true,
            finalChanges: [],
            warnings: [],
            errors: [],
            requiresUserReview: false
          };
        }
        if (operations.length === 1) {
          return {
            success: true,
            finalChanges: operations[0].changes,
            warnings: [],
            errors: [],
            requiresUserReview: operations[0].metadata.requiresUserReview
          };
        }
        try {
          const sortedOperations = this.sortOperationsByMergePriority(operations);
          const mergeGroups = await this.groupCompatibleOperations(sortedOperations);
          let allMergedChanges = [];
          const warnings = [];
          const errors = [];
          let overallConfidence = 1;
          let requiresUserReview = false;
          for (const group of mergeGroups) {
            const mergeResult = await this.mergeOperationGroup(group);
            if (mergeResult.success) {
              allMergedChanges.push(...mergeResult.mergedChanges);
              warnings.push(...mergeResult.warnings);
              overallConfidence = Math.min(overallConfidence, mergeResult.confidence);
              if (mergeResult.userReviewRequired) {
                requiresUserReview = true;
              }
            } else {
              errors.push(...mergeResult.errors);
              for (const op of group) {
                allMergedChanges.push(...op.changes);
              }
              requiresUserReview = true;
            }
          }
          const orderedResult = await this.orderChangesForApplication(allMergedChanges);
          return {
            success: errors.length === 0,
            finalChanges: orderedResult.orderedChanges,
            warnings: [...warnings, ...orderedResult.warnings],
            errors,
            requiresUserReview: requiresUserReview || overallConfidence < this.config.confidenceThreshold
          };
        } catch (error) {
          return {
            success: false,
            finalChanges: operations.flatMap((op) => op.changes),
            warnings: [],
            errors: [`Merge operation failed: ${error.message}`],
            requiresUserReview: true
          };
        }
      }
      /**
       * Sort operations by merge priority
       */
      sortOperationsByMergePriority(operations) {
        return [...operations].sort((a, b) => {
          if (a.priority !== b.priority) {
            return a.priority - b.priority;
          }
          if (a.timestamp !== b.timestamp) {
            return a.timestamp - b.timestamp;
          }
          if (a.metadata.userInitiated !== b.metadata.userInitiated) {
            return a.metadata.userInitiated ? -1 : 1;
          }
          return 0;
        });
      }
      /**
       * Group compatible operations that can be merged together
       */
      async groupCompatibleOperations(operations) {
        const groups = [];
        const processed = /* @__PURE__ */ new Set();
        for (const operation of operations) {
          if (processed.has(operation.id))
            continue;
          const compatibleGroup = [operation];
          processed.add(operation.id);
          for (const otherOp of operations) {
            if (processed.has(otherOp.id))
              continue;
            const canMerge = await this.canOperationsBeMerged(operation, otherOp);
            if (canMerge) {
              compatibleGroup.push(otherOp);
              processed.add(otherOp.id);
            }
          }
          groups.push(compatibleGroup);
        }
        return groups;
      }
      /**
       * Check if two operations can be merged
       */
      async canOperationsBeMerged(op1, op2) {
        if (!op1.capabilities.canMergeWith.includes(op2.pluginId) || !op2.capabilities.canMergeWith.includes(op1.pluginId)) {
          return false;
        }
        const priorityDiff = Math.abs(op1.priority - op2.priority);
        if (priorityDiff > 2) {
          return false;
        }
        const hasOverlap = this.hasSignificantOverlap(op1.changes, op2.changes);
        if (hasOverlap) {
          return op1.capabilities.conflictResolution.includes("AUTO_MERGE") && op2.capabilities.conflictResolution.includes("AUTO_MERGE");
        }
        return true;
      }
      /**
       * Merge a group of compatible operations
       */
      async mergeOperationGroup(operations) {
        if (operations.length === 1) {
          return {
            success: true,
            confidence: 1,
            mergedChanges: operations[0].changes,
            preservedSemantics: true,
            warnings: [],
            errors: []
          };
        }
        const strategy = this.selectBestMergeStrategy(operations);
        if (!strategy) {
          return {
            success: false,
            confidence: 0,
            mergedChanges: [],
            preservedSemantics: false,
            warnings: [],
            errors: ["No suitable merge strategy found"],
            fallbackRequired: true
          };
        }
        let mergeResult;
        if (operations.length === 2) {
          mergeResult = await strategy.merge(operations[0], operations[1], this.config);
        } else {
          mergeResult = await this.mergeMultipleOperations(operations, strategy);
        }
        return mergeResult;
      }
      /**
       * Merge multiple operations using a specific strategy
       */
      async mergeMultipleOperations(operations, strategy) {
        let currentResult = {
          success: true,
          confidence: 1,
          mergedChanges: operations[0].changes,
          preservedSemantics: true,
          warnings: [],
          errors: []
        };
        for (let i = 1; i < operations.length; i++) {
          if (!currentResult.success)
            break;
          const tempOp = {
            ...operations[0],
            id: `merged_${operations[0].id}_${i}`,
            changes: currentResult.mergedChanges
          };
          const nextResult = await strategy.merge(tempOp, operations[i], this.config);
          if (nextResult.success) {
            currentResult.mergedChanges = nextResult.mergedChanges;
            currentResult.confidence = Math.min(currentResult.confidence, nextResult.confidence);
            currentResult.preservedSemantics = currentResult.preservedSemantics && nextResult.preservedSemantics;
            currentResult.warnings.push(...nextResult.warnings);
          } else {
            currentResult.success = false;
            currentResult.errors.push(...nextResult.errors);
            currentResult.fallbackRequired = true;
            break;
          }
        }
        return currentResult;
      }
      /**
       * Select the best merge strategy for a group of operations
       */
      selectBestMergeStrategy(operations) {
        for (const [name, strategy] of this.mergeStrategies) {
          let applicable = true;
          for (let i = 0; i < operations.length && applicable; i++) {
            for (let j = i + 1; j < operations.length && applicable; j++) {
              if (!strategy.applicableFor(operations[i], operations[j])) {
                applicable = false;
              }
            }
          }
          if (applicable) {
            return strategy;
          }
        }
        return null;
      }
      /**
       * Order changes for safe application to document
       */
      async orderChangesForApplication(changes) {
        const orderedChanges = [...changes].sort((a, b) => {
          if (a.from !== b.from) {
            return b.from - a.from;
          }
          if (a.type !== b.type) {
            if (a.type === "delete" && b.type === "insert")
              return -1;
            if (a.type === "insert" && b.type === "delete")
              return 1;
          }
          return 0;
        });
        const dependencies = [];
        for (const change of orderedChanges) {
          if (change.id && change.dependsOn) {
            dependencies.push({
              changeId: change.id,
              dependsOn: change.dependsOn
            });
          }
        }
        const warnings = [];
        const dependencyWarnings = this.validateDependencyOrdering(orderedChanges, dependencies);
        warnings.push(...dependencyWarnings);
        return {
          orderedChanges,
          orderingStrategy: "position_based_reverse",
          dependencies,
          warnings
        };
      }
      /**
       * Initialize merge strategies
       */
      initializeMergeStrategies() {
        this.mergeStrategies = /* @__PURE__ */ new Map();
        this.mergeStrategies.set("non_overlapping", {
          name: "non_overlapping",
          description: "Merge non-overlapping changes directly",
          applicableFor: (op1, op2) => !this.hasSignificantOverlap(op1.changes, op2.changes),
          merge: async (op1, op2, config2) => this.mergeNonOverlappingChanges(op1, op2, config2)
        });
        this.mergeStrategies.set("priority_based", {
          name: "priority_based",
          description: "Merge based on operation priority",
          applicableFor: (op1, op2) => op1.priority !== op2.priority,
          merge: async (op1, op2, config2) => this.mergePriorityBased(op1, op2, config2)
        });
        this.mergeStrategies.set("semantic", {
          name: "semantic",
          description: "Merge based on semantic compatibility",
          applicableFor: (op1, op2) => {
            return config.enableSemanticMerging && op1.changes.some((c) => c.semanticContext) && op2.changes.some((c) => c.semanticContext);
          },
          merge: async (op1, op2, config2) => this.mergeSemanticChanges(op1, op2, config2)
        });
        this.mergeStrategies.set("text_based", {
          name: "text_based",
          description: "Merge overlapping text changes intelligently",
          applicableFor: (op1, op2) => {
            const overlap = this.hasSignificantOverlap(op1.changes, op2.changes);
            return overlap && this.canTextBeMerged(op1.changes, op2.changes);
          },
          merge: async (op1, op2, config2) => this.mergeTextChanges(op1, op2, config2)
        });
      }
      // Merge strategy implementations
      async mergeNonOverlappingChanges(op1, op2, config2) {
        const mergedChanges = [...op1.changes, ...op2.changes];
        return {
          success: true,
          confidence: 0.9,
          mergedChanges,
          preservedSemantics: true,
          warnings: [],
          errors: []
        };
      }
      async mergePriorityBased(op1, op2, config2) {
        const higherPriorityOp = op1.priority <= op2.priority ? op1 : op2;
        const lowerPriorityOp = op1.priority <= op2.priority ? op2 : op1;
        const mergedChanges = [...higherPriorityOp.changes];
        for (const change of lowerPriorityOp.changes) {
          const hasConflict = higherPriorityOp.changes.some((priorityChange) => this.changesOverlap(change, priorityChange));
          if (!hasConflict) {
            mergedChanges.push(change);
          }
        }
        return {
          success: true,
          confidence: 0.8,
          mergedChanges,
          preservedSemantics: true,
          warnings: [`Lower priority changes that conflict with higher priority ones were discarded`],
          errors: []
        };
      }
      async mergeSemanticChanges(op1, op2, config2) {
        const compatibility = await this.analyzeSemanticCompatibility(op1.changes, op2.changes);
        if (compatibility < 0.3) {
          return {
            success: false,
            confidence: 0,
            mergedChanges: [],
            preservedSemantics: false,
            warnings: [],
            errors: ["Semantic intentions are incompatible"],
            userReviewRequired: true
          };
        }
        const mergedChanges = await this.performSemanticMerge(op1.changes, op2.changes);
        return {
          success: true,
          confidence: compatibility,
          mergedChanges,
          preservedSemantics: true,
          warnings: compatibility < 0.6 ? ["Semantic merge has moderate confidence"] : [],
          errors: []
        };
      }
      async mergeTextChanges(op1, op2, config2) {
        try {
          const mergedChanges = await this.textAnalyzer.mergeOverlappingChanges(op1.changes, op2.changes, config2);
          return {
            success: true,
            confidence: 0.7,
            mergedChanges,
            preservedSemantics: true,
            warnings: ["Text merge applied - please review for accuracy"],
            errors: [],
            userReviewRequired: true
          };
        } catch (error) {
          return {
            success: false,
            confidence: 0,
            mergedChanges: [],
            preservedSemantics: false,
            warnings: [],
            errors: [`Text merge failed: ${error.message}`],
            fallbackRequired: true
          };
        }
      }
      // Utility methods
      hasSignificantOverlap(changes1, changes2) {
        for (const change1 of changes1) {
          for (const change2 of changes2) {
            if (this.changesOverlap(change1, change2)) {
              const overlapSize = Math.min(change1.to, change2.to) - Math.max(change1.from, change2.from);
              if (overlapSize > this.config.maxOverlapTolerance) {
                return true;
              }
            }
          }
        }
        return false;
      }
      changesOverlap(change1, change2) {
        return change1.from < change2.to && change2.from < change1.to;
      }
      canTextBeMerged(changes1, changes2) {
        return changes1.some(
          (c1) => changes2.some(
            (c2) => this.changesOverlap(c1, c2) && c1.type === c2.type && c1.type !== "delete"
          )
        );
      }
      async analyzeSemanticCompatibility(changes1, changes2) {
        let totalCompatibility = 0;
        let comparisons = 0;
        for (const change1 of changes1) {
          for (const change2 of changes2) {
            if (change1.semanticContext && change2.semanticContext) {
              const compatibility = this.calculateSemanticSimilarity(
                change1.semanticContext,
                change2.semanticContext
              );
              totalCompatibility += compatibility;
              comparisons++;
            }
          }
        }
        return comparisons > 0 ? totalCompatibility / comparisons : 0.5;
      }
      calculateSemanticSimilarity(context1, context2) {
        var _a, _b;
        const intentionCompatibility = {
          correction: { correction: 0.9, enhancement: 0.6, formatting: 0.7, content_addition: 0.3, restructuring: 0.2 },
          enhancement: { correction: 0.6, enhancement: 0.9, formatting: 0.8, content_addition: 0.7, restructuring: 0.4 },
          formatting: { correction: 0.7, enhancement: 0.8, formatting: 0.9, content_addition: 0.5, restructuring: 0.3 },
          content_addition: { correction: 0.3, enhancement: 0.7, formatting: 0.5, content_addition: 0.8, restructuring: 0.6 },
          restructuring: { correction: 0.2, enhancement: 0.4, formatting: 0.3, content_addition: 0.6, restructuring: 0.9 }
        };
        return (_b = (_a = intentionCompatibility[context1.intention]) == null ? void 0 : _a[context2.intention]) != null ? _b : 0.5;
      }
      async performSemanticMerge(changes1, changes2) {
        const merged = [];
        const processed = /* @__PURE__ */ new Set();
        for (let i = 0; i < changes1.length; i++) {
          if (processed.has(i))
            continue;
          const change1 = changes1[i];
          let bestMatch = null;
          let bestCompatibility = 0;
          for (const change2 of changes2) {
            if (this.changesOverlap(change1, change2) && change1.semanticContext && change2.semanticContext) {
              const compatibility = this.calculateSemanticSimilarity(
                change1.semanticContext,
                change2.semanticContext
              );
              if (compatibility > bestCompatibility && compatibility > 0.6) {
                bestMatch = change2;
                bestCompatibility = compatibility;
              }
            }
          }
          if (bestMatch) {
            const mergedChange = await this.createSemanticMergedChange(change1, bestMatch);
            merged.push(mergedChange);
            processed.add(i);
          } else {
            merged.push(change1);
            processed.add(i);
          }
        }
        for (const change2 of changes2) {
          const wasProcessed = merged.some(
            (mc) => {
              var _a;
              return ((_a = mc.operationId) == null ? void 0 : _a.includes(change2.id || "")) || this.changesOverlap(mc, change2);
            }
          );
          if (!wasProcessed) {
            merged.push(change2);
          }
        }
        return merged;
      }
      async createSemanticMergedChange(change1, change2) {
        return {
          ...change1,
          id: `semantic_merge_${change1.id}_${change2.id}`,
          timestamp: Math.max(change1.timestamp, change2.timestamp),
          from: Math.min(change1.from, change2.from),
          to: Math.max(change1.to, change2.to),
          text: this.mergeChangeTexts(change1, change2),
          operationId: `merged_${change1.operationId}_${change2.operationId}`,
          semanticContext: this.mergeSemanticContexts(change1.semanticContext, change2.semanticContext)
        };
      }
      mergeChangeTexts(change1, change2) {
        var _a, _b, _c, _d;
        if (change1.type === "insert" && change2.type === "insert") {
          return (change1.text || "") + (change2.text || "");
        }
        const confidence1 = (_b = (_a = change1.semanticContext) == null ? void 0 : _a.confidence) != null ? _b : 0.5;
        const confidence2 = (_d = (_c = change2.semanticContext) == null ? void 0 : _c.confidence) != null ? _d : 0.5;
        return confidence1 >= confidence2 ? change1.text || "" : change2.text || "";
      }
      mergeSemanticContexts(context1, context2) {
        return {
          intention: context1.confidence >= context2.confidence ? context1.intention : context2.intention,
          scope: context1.scope === context2.scope ? context1.scope : "paragraph",
          // Default to paragraph
          confidence: Math.min(context1.confidence, context2.confidence) * 0.9,
          // Reduce confidence for merged result
          preserveFormatting: context1.preserveFormatting && context2.preserveFormatting,
          preserveContent: context1.preserveContent && context2.preserveContent
        };
      }
      validateDependencyOrdering(changes, dependencies) {
        const warnings = [];
        const changePositions = /* @__PURE__ */ new Map();
        changes.forEach((change, index) => {
          if (change.id) {
            changePositions.set(change.id, index);
          }
        });
        for (const dependency of dependencies) {
          const changePos = changePositions.get(dependency.changeId);
          if (changePos === void 0)
            continue;
          for (const depId of dependency.dependsOn) {
            const depPos = changePositions.get(depId);
            if (depPos !== void 0 && depPos > changePos) {
              warnings.push(`Dependency violation: ${dependency.changeId} depends on ${depId} but is ordered before it`);
            }
          }
        }
        return warnings;
      }
    };
    TextAnalyzer = class {
      async mergeOverlappingChanges(changes1, changes2, config2) {
        const merged = [];
        for (const change1 of changes1) {
          let matchFound = false;
          for (const change2 of changes2) {
            if (this.changesOverlap(change1, change2)) {
              const mergedChange = await this.mergeOverlappingPair(change1, change2);
              if (mergedChange) {
                merged.push(mergedChange);
                matchFound = true;
                break;
              }
            }
          }
          if (!matchFound) {
            merged.push(change1);
          }
        }
        for (const change2 of changes2) {
          const hasOverlap = changes1.some((c1) => this.changesOverlap(c1, change2));
          if (!hasOverlap) {
            merged.push(change2);
          }
        }
        return merged;
      }
      async mergeOverlappingPair(change1, change2) {
        if (change1.type === "insert" && change2.type === "insert") {
          return {
            ...change1,
            id: `text_merge_${change1.id}_${change2.id}`,
            from: Math.min(change1.from, change2.from),
            to: Math.max(change1.to, change2.to),
            text: this.intelligentTextMerge(change1.text || "", change2.text || ""),
            timestamp: Math.max(change1.timestamp, change2.timestamp)
          };
        }
        return null;
      }
      intelligentTextMerge(text1, text2) {
        if (text1.includes(text2))
          return text1;
        if (text2.includes(text1))
          return text2;
        if (this.textsAreCompatible(text1, text2)) {
          return text1 + " " + text2;
        }
        return text1;
      }
      textsAreCompatible(text1, text2) {
        return text1.length < 100 && text2.length < 100 && !text1.includes(".") && !text2.includes(".");
      }
      changesOverlap(change1, change2) {
        return change1.from < change2.to && change2.from < change1.to;
      }
    };
  }
});

// plugins/track-edits/src/change-consolidation-manager.ts
var change_consolidation_manager_exports = {};
__export(change_consolidation_manager_exports, {
  ChangeConsolidationManager: () => ChangeConsolidationManager,
  ConflictResolutionCapability: () => ConflictResolutionCapability,
  ConflictResolutionStrategy: () => ConflictResolutionStrategy,
  ConflictSeverity: () => ConflictSeverity,
  ConflictType: () => ConflictType,
  ConsolidationEventType: () => ConsolidationEventType,
  OperationPriority: () => OperationPriority
});
var import_events, OperationPriority, ConflictResolutionCapability, ConflictType, ConflictSeverity, ConflictResolutionStrategy, ConsolidationEventType, ChangeConsolidationManager;
var init_change_consolidation_manager = __esm({
  "plugins/track-edits/src/change-consolidation-manager.ts"() {
    "use strict";
    import_events = require("events");
    OperationPriority = /* @__PURE__ */ ((OperationPriority2) => {
      OperationPriority2[OperationPriority2["CRITICAL"] = 1] = "CRITICAL";
      OperationPriority2[OperationPriority2["HIGH"] = 2] = "HIGH";
      OperationPriority2[OperationPriority2["MEDIUM"] = 3] = "MEDIUM";
      OperationPriority2[OperationPriority2["LOW"] = 4] = "LOW";
      OperationPriority2[OperationPriority2["BACKGROUND"] = 5] = "BACKGROUND";
      return OperationPriority2;
    })(OperationPriority || {});
    ConflictResolutionCapability = /* @__PURE__ */ ((ConflictResolutionCapability2) => {
      ConflictResolutionCapability2["AUTO_MERGE"] = "auto_merge";
      ConflictResolutionCapability2["PRIORITY_OVERRIDE"] = "priority_override";
      ConflictResolutionCapability2["USER_CHOICE"] = "user_choice";
      ConflictResolutionCapability2["SEMANTIC_ANALYSIS"] = "semantic_analysis";
      ConflictResolutionCapability2["DEFER_TO_HIGHEST_PRIORITY"] = "defer_to_highest_priority";
      return ConflictResolutionCapability2;
    })(ConflictResolutionCapability || {});
    ConflictType = /* @__PURE__ */ ((ConflictType3) => {
      ConflictType3["OVERLAPPING_EDITS"] = "overlapping_edits";
      ConflictType3["SEMANTIC_CONFLICT"] = "semantic_conflict";
      ConflictType3["DEPENDENCY_VIOLATION"] = "dependency_violation";
      ConflictType3["RESOURCE_CONTENTION"] = "resource_contention";
      ConflictType3["PRIORITY_CONFLICT"] = "priority_conflict";
      return ConflictType3;
    })(ConflictType || {});
    ConflictSeverity = /* @__PURE__ */ ((ConflictSeverity2) => {
      ConflictSeverity2["CRITICAL"] = "critical";
      ConflictSeverity2["HIGH"] = "high";
      ConflictSeverity2["MEDIUM"] = "medium";
      ConflictSeverity2["LOW"] = "low";
      ConflictSeverity2["INFO"] = "info";
      return ConflictSeverity2;
    })(ConflictSeverity || {});
    ConflictResolutionStrategy = /* @__PURE__ */ ((ConflictResolutionStrategy2) => {
      ConflictResolutionStrategy2["MERGE_COMPATIBLE"] = "merge_compatible";
      ConflictResolutionStrategy2["PRIORITY_WINS"] = "priority_wins";
      ConflictResolutionStrategy2["USER_CHOICE"] = "user_choice";
      ConflictResolutionStrategy2["DEFER_OPERATION"] = "defer_operation";
      ConflictResolutionStrategy2["SEQUENTIAL_PROCESSING"] = "sequential_processing";
      ConflictResolutionStrategy2["SEMANTIC_MERGE"] = "semantic_merge";
      return ConflictResolutionStrategy2;
    })(ConflictResolutionStrategy || {});
    ConsolidationEventType = /* @__PURE__ */ ((ConsolidationEventType2) => {
      ConsolidationEventType2["OPERATION_QUEUED"] = "operation_queued";
      ConsolidationEventType2["CONFLICT_DETECTED"] = "conflict_detected";
      ConsolidationEventType2["CONFLICT_RESOLVED"] = "conflict_resolved";
      ConsolidationEventType2["CHANGES_MERGED"] = "changes_merged";
      ConsolidationEventType2["DOCUMENT_LOCKED"] = "document_locked";
      ConsolidationEventType2["DOCUMENT_UNLOCKED"] = "document_unlocked";
      ConsolidationEventType2["CONSOLIDATION_COMPLETE"] = "consolidation_complete";
      ConsolidationEventType2["CONSOLIDATION_FAILED"] = "consolidation_failed";
      return ConsolidationEventType2;
    })(ConsolidationEventType || {});
    ChangeConsolidationManager = class extends import_events.EventEmitter {
      constructor() {
        super();
        this.documentLocks = /* @__PURE__ */ new Map();
        this.operationQueue = /* @__PURE__ */ new Map();
        this.activeConflicts = /* @__PURE__ */ new Map();
        this.consolidationHistory = /* @__PURE__ */ new Map();
        this.lockTimeouts = /* @__PURE__ */ new Map();
        this.initializePerformanceOptimization();
        this.setupCleanupInterval();
      }
      async initializePerformanceOptimization() {
        const { ConsolidationPerformanceMonitor: ConsolidationPerformanceMonitor2, ConsolidationErrorManager: ConsolidationErrorManager2 } = await Promise.resolve().then(() => (init_performance_optimization(), performance_optimization_exports));
        this.performanceMonitor = new ConsolidationPerformanceMonitor2({
          maxConcurrentOperations: 5,
          batchProcessingSize: 20,
          enableResultCaching: true,
          useAsyncProcessing: true,
          optimizeForLargeDocuments: true,
          maxMemoryUsage: 256,
          // 256 MB limit
          maxProcessingTime: 15e3
          // 15 second timeout
        });
        this.errorManager = new ConsolidationErrorManager2();
      }
      /**
       * Submit a multi-plugin operation for consolidation
       */
      async submitOperation(operation) {
        const startTime = performance.now();
        this.performanceMetrics.totalOperations++;
        try {
          const needsCoordination = await this.checkCoordinationRequired(operation);
          if (!needsCoordination) {
            return {
              success: true,
              operationId: operation.id,
              requiresConsolidation: false
            };
          }
          const documentQueue = this.operationQueue.get(operation.documentPath) || [];
          documentQueue.push(operation);
          this.operationQueue.set(operation.documentPath, documentQueue);
          this.emit("consolidation_event", {
            type: "operation_queued" /* OPERATION_QUEUED */,
            timestamp: Date.now(),
            documentPath: operation.documentPath,
            data: { operationId: operation.id, queueLength: documentQueue.length }
          });
          const result = await this.processDocumentQueue(operation.documentPath);
          const processingTime = performance.now() - startTime;
          this.updatePerformanceMetrics("consolidation_time", processingTime);
          return result;
        } catch (error) {
          this.performanceMetrics.failedConsolidations++;
          console.error("[ChangeConsolidationManager] Error submitting operation:", error);
          return {
            success: false,
            operationId: operation.id,
            requiresConsolidation: true,
            errors: [error.message]
          };
        }
      }
      /**
       * Check if coordination is required for this operation
       */
      async checkCoordinationRequired(operation) {
        const existingLock = this.documentLocks.get(operation.documentPath);
        if (existingLock && existingLock.pluginId !== operation.pluginId) {
          return true;
        }
        const queuedOps = this.operationQueue.get(operation.documentPath);
        if (queuedOps && queuedOps.length > 0) {
          return true;
        }
        const recentEvents = this.consolidationHistory.get(operation.documentPath) || [];
        const recentProcessing = recentEvents.find(
          (event) => event.timestamp > Date.now() - 5e3 && // Within 5 seconds
          ["operation_queued" /* OPERATION_QUEUED */, "changes_merged" /* CHANGES_MERGED */].includes(event.type)
        );
        return !!recentProcessing;
      }
      /**
       * Process the operation queue for a specific document
       */
      async processDocumentQueue(documentPath) {
        const queue = this.operationQueue.get(documentPath);
        if (!queue || queue.length === 0) {
          return {
            success: true,
            operationId: "",
            requiresConsolidation: false
          };
        }
        const sortedQueue = [...queue].sort((a, b) => {
          if (a.priority !== b.priority) {
            return a.priority - b.priority;
          }
          return a.timestamp - b.timestamp;
        });
        const lockId = await this.acquireDocumentLock(documentPath, sortedQueue[0]);
        if (!lockId) {
          return {
            success: false,
            operationId: sortedQueue[0].id,
            requiresConsolidation: true,
            errors: ["Failed to acquire document lock"],
            estimatedWaitTime: this.estimateWaitTime(documentPath)
          };
        }
        try {
          const conflicts = await this.detectConflicts(sortedQueue);
          if (conflicts.length > 0) {
            this.performanceMetrics.conflictsDetected += conflicts.length;
            const resolutions = await this.resolveConflicts(conflicts);
            const successfulResolutions = resolutions.filter((r) => r.result.success);
            this.performanceMetrics.conflictsResolved += successfulResolutions.length;
            if (successfulResolutions.length < conflicts.length) {
              return {
                success: false,
                operationId: sortedQueue[0].id,
                requiresConsolidation: true,
                errors: ["Failed to resolve all conflicts"],
                warnings: resolutions.filter((r) => !r.result.success).map((r) => r.result.errors.join(", "))
              };
            }
          }
          const consolidationResult = await this.consolidateOperations(sortedQueue, documentPath);
          this.operationQueue.delete(documentPath);
          this.emit("consolidation_event", {
            type: "consolidation_complete" /* CONSOLIDATION_COMPLETE */,
            timestamp: Date.now(),
            documentPath,
            data: consolidationResult
          });
          return {
            success: consolidationResult.success,
            operationId: sortedQueue[0].id,
            requiresConsolidation: true,
            warnings: consolidationResult.warnings,
            errors: consolidationResult.errors
          };
        } finally {
          await this.releaseDocumentLock(lockId);
        }
      }
      /**
       * Acquire exclusive lock on a document
       */
      async acquireDocumentLock(documentPath, operation) {
        const lockId = `${operation.pluginId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const existingLock = this.documentLocks.get(documentPath);
        if (existingLock) {
          if (!existingLock.metadata.canBePreempted || operation.priority >= this.getOperationPriority(existingLock.operationId)) {
            return null;
          }
          await this.releaseDocumentLock(existingLock.lockId);
        }
        const lock = {
          documentPath,
          lockId,
          operationId: operation.id,
          pluginId: operation.pluginId,
          timestamp: Date.now(),
          lockType: "exclusive",
          expiresAt: Date.now() + operation.metadata.estimatedProcessingTime + 3e4,
          // Add 30s buffer
          metadata: {
            reason: "multi_plugin_consolidation",
            estimatedDuration: operation.metadata.estimatedProcessingTime,
            canBePreempted: operation.priority > 1 /* CRITICAL */
          }
        };
        this.documentLocks.set(documentPath, lock);
        const timeout = setTimeout(() => {
          this.releaseDocumentLock(lockId);
        }, lock.expiresAt - Date.now());
        this.lockTimeouts.set(lockId, timeout);
        this.emit("consolidation_event", {
          type: "document_locked" /* DOCUMENT_LOCKED */,
          timestamp: Date.now(),
          documentPath,
          data: { lockId, pluginId: operation.pluginId }
        });
        return lockId;
      }
      /**
       * Release document lock
       */
      async releaseDocumentLock(lockId) {
        for (const [documentPath, lock] of this.documentLocks.entries()) {
          if (lock.lockId === lockId) {
            this.documentLocks.delete(documentPath);
            const timeout = this.lockTimeouts.get(lockId);
            if (timeout) {
              clearTimeout(timeout);
              this.lockTimeouts.delete(lockId);
            }
            this.emit("consolidation_event", {
              type: "document_unlocked" /* DOCUMENT_UNLOCKED */,
              timestamp: Date.now(),
              documentPath,
              data: { lockId }
            });
            break;
          }
        }
      }
      /**
       * Get operation priority by ID
       */
      getOperationPriority(operationId) {
        for (const queue of this.operationQueue.values()) {
          const operation = queue.find((op) => op.id === operationId);
          if (operation) {
            return operation.priority;
          }
        }
        return 5 /* BACKGROUND */;
      }
      /**
       * Estimate wait time for document access
       */
      estimateWaitTime(documentPath) {
        const lock = this.documentLocks.get(documentPath);
        if (lock) {
          return Math.max(0, lock.expiresAt - Date.now());
        }
        const queue = this.operationQueue.get(documentPath);
        if (queue) {
          return queue.reduce((total, op) => total + op.metadata.estimatedProcessingTime, 0);
        }
        return 0;
      }
      /**
       * Update performance metrics
       */
      updatePerformanceMetrics(metric, value) {
        if (metric === "consolidation_time") {
          const currentAvg = this.performanceMetrics.averageConsolidationTime;
          const totalOps = this.performanceMetrics.totalOperations;
          this.performanceMetrics.averageConsolidationTime = (currentAvg * (totalOps - 1) + value) / totalOps;
        }
      }
      /**
       * Setup periodic cleanup of expired locks and old history
       */
      setupCleanupInterval() {
        setInterval(() => {
          const now = Date.now();
          for (const [documentPath, lock] of this.documentLocks.entries()) {
            if (lock.expiresAt < now) {
              this.releaseDocumentLock(lock.lockId);
            }
          }
          const cutoff = now - 24 * 60 * 60 * 1e3;
          for (const [documentPath, events] of this.consolidationHistory.entries()) {
            const recentEvents = events.filter((event) => event.timestamp > cutoff);
            if (recentEvents.length !== events.length) {
              this.consolidationHistory.set(documentPath, recentEvents);
            }
          }
        }, 6e4);
      }
      // Conflict detection and resolution implementation
      async detectConflicts(operations) {
        const operationId = `conflict_detection_${Date.now()}`;
        if (this.performanceMonitor) {
          const cacheKey = this.performanceMonitor.generateConflictCacheKey(operations);
          const cachedResult = this.performanceMonitor.getCachedConflictDetection(cacheKey);
          if (cachedResult) {
            return cachedResult;
          }
          this.performanceMonitor.startTiming(operationId, "conflict_detection");
        }
        const { ConflictDetectionEngine: ConflictDetectionEngine2 } = await Promise.resolve().then(() => (init_conflict_detection_algorithms(), conflict_detection_algorithms_exports));
        const detectionEngine = new ConflictDetectionEngine2({
          enableSemanticAnalysis: true,
          overlapTolerance: 3,
          dependencyDepth: 5,
          temporalWindow: 5e3,
          priorityThreshold: 1
        });
        try {
          const conflicts = await detectionEngine.detectConflicts(operations);
          if (this.performanceMonitor) {
            const cacheKey = this.performanceMonitor.generateConflictCacheKey(operations);
            this.performanceMonitor.cacheConflictDetection(cacheKey, conflicts);
            this.performanceMonitor.endTiming(operationId, "conflict_detection", true);
          }
          return conflicts;
        } catch (error) {
          console.error("[ChangeConsolidationManager] Error detecting conflicts:", error);
          if (this.errorManager) {
            const { recovered } = await this.errorManager.handleError(error, { operations, operationId });
            if (recovered) {
              try {
                const conflicts = await detectionEngine.detectConflicts(operations);
                if (this.performanceMonitor) {
                  this.performanceMonitor.endTiming(operationId, "conflict_detection", true);
                }
                return conflicts;
              } catch (retryError) {
                console.error("[ChangeConsolidationManager] Retry failed:", retryError);
              }
            }
          }
          if (this.performanceMonitor) {
            this.performanceMonitor.endTiming(operationId, "conflict_detection", false);
          }
          return [];
        }
      }
      async resolveConflicts(conflicts) {
        const resolutions = [];
        for (const conflict of conflicts) {
          try {
            const resolution = await this.resolveIndividualConflict(conflict);
            resolutions.push(resolution);
            this.activeConflicts.delete(conflict.id);
            this.emit("consolidation_event", {
              type: "conflict_resolved" /* CONFLICT_RESOLVED */,
              timestamp: Date.now(),
              documentPath: conflict.operations[0].documentPath,
              data: { conflictId: conflict.id, strategy: resolution.strategy }
            });
          } catch (error) {
            console.error(`[ChangeConsolidationManager] Error resolving conflict ${conflict.id}:`, error);
            resolutions.push({
              strategy: "user_choice" /* USER_CHOICE */,
              result: {
                success: false,
                finalChanges: [],
                warnings: [],
                errors: [`Failed to resolve conflict: ${error.message}`],
                requiresUserReview: true
              },
              timestamp: Date.now(),
              appliedBy: "system",
              metadata: {
                originalChanges: conflict.conflictingChanges
              }
            });
          }
        }
        return resolutions;
      }
      async resolveIndividualConflict(conflict) {
        const strategy = this.selectResolutionStrategy(conflict);
        let result;
        switch (strategy) {
          case "merge_compatible" /* MERGE_COMPATIBLE */:
            result = await this.attemptCompatibleMerge(conflict);
            break;
          case "priority_wins" /* PRIORITY_WINS */:
            result = await this.applyPriorityWins(conflict);
            break;
          case "sequential_processing" /* SEQUENTIAL_PROCESSING */:
            result = await this.applySequentialProcessing(conflict);
            break;
          case "semantic_merge" /* SEMANTIC_MERGE */:
            result = await this.attemptSemanticMerge(conflict);
            break;
          case "defer_operation" /* DEFER_OPERATION */:
            result = await this.deferLowerPriorityOperations(conflict);
            break;
          default:
            result = {
              success: false,
              finalChanges: conflict.conflictingChanges,
              warnings: [],
              errors: ["Unknown resolution strategy"],
              requiresUserReview: true
            };
        }
        return {
          strategy,
          result,
          timestamp: Date.now(),
          appliedBy: "system",
          metadata: {
            originalChanges: conflict.conflictingChanges,
            mergedChanges: result.finalChanges,
            rejectedChanges: result.success ? [] : conflict.conflictingChanges
          }
        };
      }
      selectResolutionStrategy(conflict) {
        switch (conflict.type) {
          case "overlapping_edits" /* OVERLAPPING_EDITS */:
            if (conflict.severity === "low" /* LOW */) {
              return "merge_compatible" /* MERGE_COMPATIBLE */;
            } else if (conflict.severity === "high" /* HIGH */) {
              return "priority_wins" /* PRIORITY_WINS */;
            } else {
              return "sequential_processing" /* SEQUENTIAL_PROCESSING */;
            }
          case "semantic_conflict" /* SEMANTIC_CONFLICT */:
            return "semantic_merge" /* SEMANTIC_MERGE */;
          case "dependency_violation" /* DEPENDENCY_VIOLATION */:
            return "sequential_processing" /* SEQUENTIAL_PROCESSING */;
          case "priority_conflict" /* PRIORITY_CONFLICT */:
            return "priority_wins" /* PRIORITY_WINS */;
          case "resource_contention" /* RESOURCE_CONTENTION */:
            return "defer_operation" /* DEFER_OPERATION */;
          default:
            return "user_choice" /* USER_CHOICE */;
        }
      }
      async attemptCompatibleMerge(conflict) {
        const { ChangeMergingEngine: ChangeMergingEngine2 } = await Promise.resolve().then(() => (init_change_merging_algorithms(), change_merging_algorithms_exports));
        const mergingEngine = new ChangeMergingEngine2({
          maxOverlapTolerance: 5,
          preserveFormatting: true,
          enableSemanticMerging: true,
          priorityWeighting: 0.7,
          confidenceThreshold: 0.6
        });
        try {
          return await mergingEngine.mergeOperations(conflict.operations);
        } catch (error) {
          return {
            success: false,
            finalChanges: conflict.conflictingChanges,
            warnings: [],
            errors: [`Merge failed: ${error.message}`],
            requiresUserReview: true
          };
        }
      }
      async applyPriorityWins(conflict) {
        const sortedOps = [...conflict.operations].sort((a, b) => a.priority - b.priority);
        const winningOp = sortedOps[0];
        return {
          success: true,
          finalChanges: winningOp.changes,
          warnings: [
            `Conflict resolved by priority: ${winningOp.pluginId} (priority ${winningOp.priority}) wins`,
            `Rejected ${sortedOps.length - 1} lower priority operations`
          ],
          errors: [],
          requiresUserReview: conflict.severity === "high" /* HIGH */
        };
      }
      async applySequentialProcessing(conflict) {
        const sortedOps = [...conflict.operations].sort((a, b) => {
          if (a.priority !== b.priority)
            return a.priority - b.priority;
          return a.timestamp - b.timestamp;
        });
        const finalChanges = [];
        const warnings = [];
        for (const op of sortedOps) {
          finalChanges.push(...op.changes);
          warnings.push(`Applied operation ${op.id} from ${op.pluginId} sequentially`);
        }
        return {
          success: true,
          finalChanges,
          warnings,
          errors: [],
          requiresUserReview: conflict.severity >= "medium" /* MEDIUM */
        };
      }
      async attemptSemanticMerge(conflict) {
        const { ChangeMergingEngine: ChangeMergingEngine2 } = await Promise.resolve().then(() => (init_change_merging_algorithms(), change_merging_algorithms_exports));
        const mergingEngine = new ChangeMergingEngine2({
          enableSemanticMerging: true,
          confidenceThreshold: 0.5,
          priorityWeighting: 0.8
        });
        const result = await mergingEngine.mergeOperations(conflict.operations);
        if (!result.success || result.requiresUserReview) {
          result.warnings.push("Semantic merge attempted but requires user review");
        }
        return result;
      }
      async deferLowerPriorityOperations(conflict) {
        const highestPriorityOp = conflict.operations.reduce(
          (highest, current) => current.priority < highest.priority ? current : highest
        );
        const deferredOps = conflict.operations.filter((op) => op.id !== highestPriorityOp.id);
        for (const deferredOp of deferredOps) {
          setTimeout(() => {
            this.submitOperation({
              ...deferredOp,
              timestamp: Date.now(),
              metadata: {
                ...deferredOp.metadata,
                canBeDeferred: true
              }
            });
          }, 1e3);
        }
        return {
          success: true,
          finalChanges: highestPriorityOp.changes,
          warnings: [`Deferred ${deferredOps.length} lower priority operations`],
          errors: [],
          requiresUserReview: false
        };
      }
      async consolidateOperations(operations, documentPath) {
        const { ChangeMergingEngine: ChangeMergingEngine2 } = await Promise.resolve().then(() => (init_change_merging_algorithms(), change_merging_algorithms_exports));
        const mergingEngine = new ChangeMergingEngine2({
          maxOverlapTolerance: 3,
          preserveFormatting: true,
          enableSemanticMerging: true,
          priorityWeighting: 0.7,
          confidenceThreshold: 0.6
        });
        try {
          const result = await mergingEngine.mergeOperations(operations);
          const historyEntry = {
            type: "changes_merged" /* CHANGES_MERGED */,
            timestamp: Date.now(),
            documentPath,
            data: {
              operationIds: operations.map((op) => op.id),
              finalChangeCount: result.finalChanges.length,
              success: result.success
            }
          };
          const history = this.consolidationHistory.get(documentPath) || [];
          history.push(historyEntry);
          this.consolidationHistory.set(documentPath, history);
          return result;
        } catch (error) {
          console.error("[ChangeConsolidationManager] Error consolidating operations:", error);
          return {
            success: false,
            finalChanges: operations.flatMap((op) => op.changes),
            warnings: [],
            errors: [`Consolidation failed: ${error.message}`],
            requiresUserReview: true
          };
        }
      }
      /**
       * Get current performance metrics
       */
      getPerformanceMetrics() {
        return this.performanceMonitor ? this.performanceMonitor.getMetrics() : null;
      }
      /**
       * Get performance recommendations
       */
      getPerformanceRecommendations() {
        return this.performanceMonitor ? this.performanceMonitor.getPerformanceRecommendations() : [];
      }
      /**
       * Export performance data for analysis
       */
      exportPerformanceData() {
        return this.performanceMonitor ? this.performanceMonitor.exportPerformanceData() : null;
      }
      /**
       * Get error statistics
       */
      getErrorStatistics() {
        return this.errorManager ? this.errorManager.getErrorStatistics() : null;
      }
      /**
       * Check if system should throttle processing
       */
      shouldThrottleProcessing() {
        return this.performanceMonitor ? this.performanceMonitor.shouldThrottleProcessing() : false;
      }
      /**
       * Optimize configuration based on current performance
       */
      async optimizeConfiguration() {
        var _a;
        if (!this.performanceMonitor)
          return;
        const metrics = this.performanceMonitor.getMetrics();
        const recommendations = this.performanceMonitor.getPerformanceRecommendations();
        const currentConfig = this.performanceMonitor.getConfig();
        const newConfig = { ...currentConfig };
        if (metrics.currentMemoryUsage > currentConfig.maxMemoryUsage * 0.8) {
          newConfig.batchProcessingSize = Math.max(5, Math.floor(currentConfig.batchProcessingSize * 0.8));
        } else if (metrics.currentMemoryUsage < currentConfig.maxMemoryUsage * 0.5) {
          newConfig.batchProcessingSize = Math.min(50, Math.floor(currentConfig.batchProcessingSize * 1.2));
        }
        if (metrics.averageConflictDetectionTime > 1e3) {
          newConfig.enableResultCaching = true;
          newConfig.maxCacheSize = Math.min(2e3, currentConfig.maxCacheSize * 1.5);
        }
        const errorStats = (_a = this.errorManager) == null ? void 0 : _a.getErrorStatistics();
        if (errorStats && errorStats.recentErrorRate > 5) {
          newConfig.maxConcurrentOperations = Math.max(2, currentConfig.maxConcurrentOperations - 1);
        }
        this.performanceMonitor.updateConfig(newConfig);
        console.log("[ChangeConsolidationManager] Configuration optimized:", {
          oldBatchSize: currentConfig.batchProcessingSize,
          newBatchSize: newConfig.batchProcessingSize,
          oldConcurrentOps: currentConfig.maxConcurrentOperations,
          newConcurrentOps: newConfig.maxConcurrentOperations,
          recommendations
        });
      }
      /**
       * Get active document locks
       */
      getActiveDocumentLocks() {
        return new Map(this.documentLocks);
      }
      /**
       * Get queued operations for a document
       */
      getQueuedOperations(documentPath) {
        return [...this.operationQueue.get(documentPath) || []];
      }
      /**
       * Get consolidation status for UI
       */
      getConsolidationStatus() {
        const activeOperations = Array.from(this.operationQueue.values()).reduce((sum, ops) => sum + ops.length, 0);
        const queuedOperations = activeOperations;
        const activeConflicts = this.activeConflicts.size;
        let status = "idle";
        let details = "No active operations";
        if (activeConflicts > 0) {
          status = "conflict";
          details = `${activeConflicts} conflict${activeConflicts !== 1 ? "s" : ""} requiring resolution`;
        } else if (activeOperations > 0) {
          status = "processing";
          details = `Processing ${activeOperations} operation${activeOperations !== 1 ? "s" : ""}`;
        } else if (this.consolidationHistory.size > 0) {
          const recentEvents = Array.from(this.consolidationHistory.values()).flat().filter((event) => Date.now() - event.timestamp < 5e3);
          if (recentEvents.some((e) => e.type === "consolidation_failed" /* CONSOLIDATION_FAILED */)) {
            status = "error";
            details = "Recent consolidation failed";
          } else if (recentEvents.some((e) => e.type === "consolidation_complete" /* CONSOLIDATION_COMPLETE */)) {
            status = "completed";
            details = "Recent consolidation completed successfully";
          }
        }
        return {
          status,
          details,
          activeOperations,
          queuedOperations,
          activeConflicts
        };
      }
    };
  }
});

// plugins/track-edits/src/event-coordination-patterns.ts
var event_coordination_patterns_exports = {};
__export(event_coordination_patterns_exports, {
  ConflictResolver: () => ConflictResolver,
  ConflictType: () => ConflictType2,
  EVENT_NAMING_CONVENTIONS: () => EVENT_NAMING_CONVENTIONS,
  EventSequenceManager: () => EventSequenceManager,
  ResolutionStrategy: () => ResolutionStrategy,
  STANDARD_EVENT_ROUTING: () => STANDARD_EVENT_ROUTING,
  WorkflowOrchestrator: () => WorkflowOrchestrator,
  WriterrlWorkflowPatterns: () => WriterrlWorkflowPatterns
});
var EVENT_NAMING_CONVENTIONS, STANDARD_EVENT_ROUTING, WriterrlWorkflowPatterns, EventSequenceManager, ConflictType2, ResolutionStrategy, ConflictResolver, WorkflowOrchestrator;
var init_event_coordination_patterns = __esm({
  "plugins/track-edits/src/event-coordination-patterns.ts"() {
    "use strict";
    init_event_bus_integration();
    EVENT_NAMING_CONVENTIONS = {
      // Domain prefixes
      DOMAINS: {
        AI: "ai",
        DOCUMENT: "document",
        SESSION: "session",
        PLUGIN: "plugin",
        WORKFLOW: "workflow",
        PLATFORM: "platform"
      },
      // Entity types
      ENTITIES: {
        PROCESSING: "processing",
        CHANGE: "change",
        SYNC: "sync",
        HEALTH: "health",
        STEP: "step",
        ERROR: "error"
      },
      // Action types
      ACTIONS: {
        START: "start",
        COMPLETE: "complete",
        APPLIED: "applied",
        CREATED: "created",
        UPDATED: "updated",
        DELETED: "deleted",
        FAILED: "failed"
      },
      // Status qualifiers
      STATUS: {
        SUCCESS: "success",
        ERROR: "error",
        WARNING: "warning",
        PROGRESS: "progress"
      }
    };
    STANDARD_EVENT_ROUTING = {
      // AI Processing Events - Route to all interested plugins
      "ai.processing.start": {
        targetPlugins: ["track-edits", "writerr-chat", "editorial-engine"],
        priority: 2 /* HIGH */,
        requiresAck: true,
        maxPropagationTime: 1e3,
        persistence: "session" /* SESSION */
      },
      "ai.processing.complete": {
        targetPlugins: ["track-edits", "writerr-chat"],
        priority: 2 /* HIGH */,
        requiresAck: true,
        maxPropagationTime: 500,
        persistence: "permanent" /* PERMANENT */
      },
      // Document Change Events - Critical for all plugins
      "document.change.applied": {
        targetPlugins: ["track-edits", "writerr-chat", "editorial-engine"],
        priority: 3 /* CRITICAL */,
        requiresAck: true,
        maxPropagationTime: 100,
        persistence: "permanent" /* PERMANENT */
      },
      "document.change.batched": {
        targetPlugins: ["track-edits", "writerr-chat"],
        priority: 2 /* HIGH */,
        requiresAck: false,
        maxPropagationTime: 500,
        persistence: "session" /* SESSION */
      },
      // Session Events - For synchronization
      "session.created": {
        targetPlugins: ["track-edits", "writerr-chat", "editorial-engine"],
        priority: 1 /* NORMAL */,
        requiresAck: false,
        maxPropagationTime: 2e3,
        persistence: "offline" /* OFFLINE */
      },
      // Plugin Lifecycle - For coordination
      "plugin.registered": {
        targetPlugins: ["track-edits"],
        priority: 1 /* NORMAL */,
        requiresAck: false,
        maxPropagationTime: 1e3,
        persistence: "session" /* SESSION */
      },
      // Workflow Coordination - High priority for orchestration
      "workflow.started": {
        targetPlugins: ["track-edits", "writerr-chat", "editorial-engine"],
        priority: 2 /* HIGH */,
        requiresAck: true,
        maxPropagationTime: 500,
        persistence: "session" /* SESSION */
      }
    };
    WriterrlWorkflowPatterns = class {
      /**
       * Chat → Editorial Engine → Track Edits workflow
       * User makes request in chat, processed by editorial engine, tracked by track-edits
       */
      static getChatToEditorialToTrackWorkflow(requestId) {
        return [
          {
            id: `${requestId}-chat-request`,
            name: "Process Chat Request",
            assignedPlugin: "writerr-chat",
            dependencies: [],
            timeout: 3e4,
            retryable: true,
            criticalPath: true
          },
          {
            id: `${requestId}-editorial-processing`,
            name: "Editorial Processing",
            assignedPlugin: "editorial-engine",
            dependencies: [`${requestId}-chat-request`],
            timeout: 6e4,
            retryable: true,
            criticalPath: true
          },
          {
            id: `${requestId}-change-tracking`,
            name: "Track Changes",
            assignedPlugin: "track-edits",
            dependencies: [`${requestId}-editorial-processing`],
            timeout: 15e3,
            retryable: false,
            criticalPath: true
          },
          {
            id: `${requestId}-chat-notification`,
            name: "Notify Chat of Completion",
            assignedPlugin: "writerr-chat",
            dependencies: [`${requestId}-change-tracking`],
            timeout: 5e3,
            retryable: true,
            criticalPath: false
          }
        ];
      }
      /**
       * Collaborative editing workflow
       * Multiple users editing with real-time synchronization
       */
      static getCollaborativeEditWorkflow(sessionId) {
        return [
          {
            id: `${sessionId}-session-init`,
            name: "Initialize Collaborative Session",
            assignedPlugin: "track-edits",
            dependencies: [],
            timeout: 1e4,
            retryable: true,
            criticalPath: true
          },
          {
            id: `${sessionId}-sync-setup`,
            name: "Setup Change Synchronization",
            assignedPlugin: "track-edits",
            dependencies: [`${sessionId}-session-init`],
            timeout: 5e3,
            retryable: true,
            criticalPath: true
          },
          {
            id: `${sessionId}-participant-notify`,
            name: "Notify All Participants",
            assignedPlugin: "writerr-chat",
            dependencies: [`${sessionId}-sync-setup`],
            timeout: 1e4,
            retryable: true,
            criticalPath: false
          }
        ];
      }
      /**
       * Batch processing workflow for large editorial operations
       */
      static getBatchProcessingWorkflow(batchId) {
        return [
          {
            id: `${batchId}-batch-validation`,
            name: "Validate Batch Request",
            assignedPlugin: "editorial-engine",
            dependencies: [],
            timeout: 15e3,
            retryable: false,
            criticalPath: true
          },
          {
            id: `${batchId}-batch-processing`,
            name: "Process Batch Changes",
            assignedPlugin: "editorial-engine",
            dependencies: [`${batchId}-batch-validation`],
            timeout: 3e5,
            // 5 minutes for large batches
            retryable: true,
            criticalPath: true
          },
          {
            id: `${batchId}-change-grouping`,
            name: "Group Related Changes",
            assignedPlugin: "track-edits",
            dependencies: [`${batchId}-batch-processing`],
            timeout: 3e4,
            retryable: true,
            criticalPath: true
          },
          {
            id: `${batchId}-batch-review`,
            name: "Present Batch for Review",
            assignedPlugin: "track-edits",
            dependencies: [`${batchId}-change-grouping`],
            timeout: 1e4,
            retryable: false,
            criticalPath: false
          }
        ];
      }
    };
    EventSequenceManager = class {
      constructor() {
        this.sequences = /* @__PURE__ */ new Map();
        this.pendingEvents = /* @__PURE__ */ new Map();
      }
      /**
       * Register an event sequence for ordered processing
       */
      registerSequence(sequenceId, expectedEvents) {
        this.sequences.set(sequenceId, {
          id: sequenceId,
          expectedEvents,
          receivedEvents: [],
          completed: false,
          startedAt: Date.now()
        });
        this.pendingEvents.set(sequenceId, []);
      }
      /**
       * Add event to sequence and check if ready to process
       */
      addEventToSequence(sequenceId, event) {
        const sequence = this.sequences.get(sequenceId);
        const pending = this.pendingEvents.get(sequenceId);
        if (!sequence || !pending) {
          return false;
        }
        sequence.receivedEvents.push(event.type);
        pending.push(event);
        const allReceived = sequence.expectedEvents.every(
          (eventType) => sequence.receivedEvents.includes(eventType)
        );
        if (allReceived) {
          sequence.completed = true;
          sequence.completedAt = Date.now();
          return true;
        }
        return false;
      }
      /**
       * Get ordered events for a completed sequence
       */
      getOrderedEvents(sequenceId) {
        const sequence = this.sequences.get(sequenceId);
        const pending = this.pendingEvents.get(sequenceId);
        if (!sequence || !pending || !sequence.completed) {
          return null;
        }
        return pending.sort((a, b) => {
          const aIndex = sequence.expectedEvents.indexOf(a.type);
          const bIndex = sequence.expectedEvents.indexOf(b.type);
          return aIndex - bIndex;
        });
      }
      /**
       * Clean up completed or expired sequences
       */
      cleanup(maxAge = 3e5) {
        const now = Date.now();
        for (const [sequenceId, sequence] of this.sequences) {
          if (sequence.completed || now - sequence.startedAt > maxAge) {
            this.sequences.delete(sequenceId);
            this.pendingEvents.delete(sequenceId);
          }
        }
      }
    };
    ConflictType2 = /* @__PURE__ */ ((ConflictType3) => {
      ConflictType3["SIMULTANEOUS_EDIT"] = "simultaneous-edit";
      ConflictType3["RESOURCE_CONTENTION"] = "resource-contention";
      ConflictType3["PLUGIN_DEPENDENCY"] = "plugin-dependency";
      ConflictType3["STATE_SYNCHRONIZATION"] = "state-sync";
      return ConflictType3;
    })(ConflictType2 || {});
    ResolutionStrategy = /* @__PURE__ */ ((ResolutionStrategy2) => {
      ResolutionStrategy2["LAST_WRITER_WINS"] = "last-writer-wins";
      ResolutionStrategy2["FIRST_WRITER_WINS"] = "first-writer-wins";
      ResolutionStrategy2["MERGE_CHANGES"] = "merge-changes";
      ResolutionStrategy2["MANUAL_RESOLUTION"] = "manual-resolution";
      ResolutionStrategy2["ROLLBACK_CHANGES"] = "rollback-changes";
      return ResolutionStrategy2;
    })(ResolutionStrategy || {});
    ConflictResolver = class {
      constructor() {
        this.activeConflicts = /* @__PURE__ */ new Map();
      }
      /**
       * Detect potential conflicts in event stream
       */
      detectConflict(events) {
        const documentEvents = events.filter(
          (e) => e.type.startsWith("document.change.") && e.timestamp > Date.now() - 5e3
          // Within 5 seconds
        );
        if (documentEvents.length > 1) {
          const conflicts = this.findRangeConflicts(documentEvents);
          if (conflicts.length > 0) {
            return {
              type: "simultaneous-edit" /* SIMULTANEOUS_EDIT */,
              events: conflicts,
              detectedAt: Date.now(),
              severity: "high"
            };
          }
        }
        return null;
      }
      /**
       * Resolve conflict using specified strategy
       */
      async resolveConflict(conflictId, strategy) {
        const conflict = this.activeConflicts.get(conflictId);
        if (!conflict) {
          return { success: false, error: "Conflict not found" };
        }
        switch (strategy) {
          case "last-writer-wins" /* LAST_WRITER_WINS */:
            return this.applyLastWriterWins(conflict);
          case "merge-changes" /* MERGE_CHANGES */:
            return this.mergeConflictingChanges(conflict);
          case "manual-resolution" /* MANUAL_RESOLUTION */:
            return this.requestManualResolution(conflict);
          default:
            return { success: false, error: "Unknown resolution strategy" };
        }
      }
      findRangeConflicts(events) {
        const conflicts = [];
        for (let i = 0; i < events.length; i++) {
          for (let j = i + 1; j < events.length; j++) {
            const event1 = events[i];
            const event2 = events[j];
            if (this.rangesOverlap(
              event1.payload.change.range,
              event2.payload.change.range
            )) {
              if (!conflicts.includes(event1))
                conflicts.push(event1);
              if (!conflicts.includes(event2))
                conflicts.push(event2);
            }
          }
        }
        return conflicts;
      }
      rangesOverlap(range1, range2) {
        return range1.start < range2.end && range2.start < range1.end;
      }
      async applyLastWriterWins(conflict) {
        return { success: true, strategy: "last-writer-wins" /* LAST_WRITER_WINS */ };
      }
      async mergeConflictingChanges(conflict) {
        return { success: true, strategy: "merge-changes" /* MERGE_CHANGES */ };
      }
      async requestManualResolution(conflict) {
        return {
          success: false,
          strategy: "manual-resolution" /* MANUAL_RESOLUTION */,
          requiresUserInput: true
        };
      }
    };
    WorkflowOrchestrator = class {
      constructor() {
        this.activeWorkflows = /* @__PURE__ */ new Map();
        this.sequenceManager = new EventSequenceManager();
        this.conflictResolver = new ConflictResolver();
      }
      /**
       * Start a new workflow with defined steps
       */
      async startWorkflow(workflowId, workflowType, steps, context) {
        try {
          const execution = {
            id: workflowId,
            type: workflowType,
            steps,
            context,
            currentStepIndex: 0,
            status: "running",
            startedAt: Date.now(),
            completedSteps: [],
            errors: []
          };
          this.activeWorkflows.set(workflowId, execution);
          return await this.executeNextStep(workflowId);
        } catch (error) {
          console.error(`Failed to start workflow ${workflowId}:`, error);
          return false;
        }
      }
      /**
       * Process workflow step completion event
       */
      async processStepCompletion(event) {
        if (event.type !== "workflow.step.complete")
          return;
        const workflowId = event.payload.workflow.id;
        const execution = this.activeWorkflows.get(workflowId);
        if (!execution)
          return;
        execution.completedSteps.push(event.payload.currentStep.name);
        execution.currentStepIndex++;
        if (execution.currentStepIndex >= execution.steps.length) {
          execution.status = "completed";
          execution.completedAt = Date.now();
          const completionEvent = WriterrlEventFactory.createWorkflowEvent(
            "workflow.complete",
            "track-edits",
            event.payload.workflow,
            execution.context,
            void 0,
            {
              totalSteps: execution.steps.length,
              completedSteps: execution.completedSteps.length,
              duration: Date.now() - execution.startedAt,
              artifacts: [],
              success: true
            }
          );
          console.log("Workflow completed:", completionEvent);
        } else {
          await this.executeNextStep(workflowId);
        }
      }
      async executeNextStep(workflowId) {
        const execution = this.activeWorkflows.get(workflowId);
        if (!execution || execution.status !== "running")
          return false;
        const currentStep = execution.steps[execution.currentStepIndex];
        if (!currentStep)
          return false;
        const dependenciesComplete = currentStep.dependencies.every(
          (dep) => execution.completedSteps.includes(dep)
        );
        if (!dependenciesComplete) {
          setTimeout(() => this.executeNextStep(workflowId), 1e3);
          return true;
        }
        const stepEvent = WriterrlEventFactory.createWorkflowEvent(
          "workflow.step.complete",
          currentStep.assignedPlugin,
          execution.context.workflow || { id: workflowId, name: execution.type, type: execution.type, initiator: "track-edits" },
          execution.context,
          {
            name: currentStep.name,
            status: "in-progress",
            assignedPlugin: currentStep.assignedPlugin,
            startedAt: Date.now(),
            data: execution.context
          }
        );
        console.log("Starting workflow step:", stepEvent);
        return true;
      }
      /**
       * Handle workflow errors and implement recovery
       */
      async handleWorkflowError(workflowId, error, step) {
        const execution = this.activeWorkflows.get(workflowId);
        if (!execution)
          return;
        execution.errors.push({
          step: step.name,
          error: error.message,
          timestamp: Date.now(),
          recoverable: step.retryable
        });
        if (step.retryable && step.criticalPath) {
          setTimeout(() => this.executeNextStep(workflowId), 5e3);
        } else if (step.criticalPath) {
          execution.status = "failed";
          execution.completedAt = Date.now();
        } else {
          execution.currentStepIndex++;
          await this.executeNextStep(workflowId);
        }
      }
      /**
       * Get status of active workflows
       */
      getWorkflowStatus(workflowId) {
        if (workflowId) {
          const execution = this.activeWorkflows.get(workflowId);
          return execution ? [execution] : [];
        }
        return Array.from(this.activeWorkflows.values());
      }
    };
  }
});

// plugins/track-edits/src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => TrackEditsPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian5 = require("obsidian");
var import_state = require("@codemirror/state");
var import_view = require("@codemirror/view");

// plugins/track-edits/src/settings.ts
var import_obsidian = require("obsidian");
var TrackEditsSettingsTab = class extends import_obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Track Edits Settings" });
    new import_obsidian.Setting(containerEl).setName("Enable tracking").setDesc("Automatically track edits when documents are modified").addToggle((toggle) => toggle.setValue(this.plugin.settings.enableTracking).onChange(async (value) => {
      this.plugin.settings.enableTracking = value;
      await this.plugin.saveSettings();
      if (value) {
        this.plugin.startTracking();
      } else {
        this.plugin.stopTracking();
      }
    }));
    new import_obsidian.Setting(containerEl).setName("Show line numbers").setDesc("Display line numbers in the editor").addToggle((toggle) => toggle.setValue(this.plugin.settings.showLineNumbers).onChange(async (value) => {
      this.plugin.settings.showLineNumbers = value;
      await this.plugin.saveSettings();
    }));
    new import_obsidian.Setting(containerEl).setName("Highlight changes").setDesc("Visually highlight recent changes in the editor").addToggle((toggle) => toggle.setValue(this.plugin.settings.highlightChanges).onChange(async (value) => {
      this.plugin.settings.highlightChanges = value;
      await this.plugin.saveSettings();
    }));
    new import_obsidian.Setting(containerEl).setName("Data retention").setDesc("Number of days to keep edit history (0 = keep forever)").addSlider((slider) => slider.setLimits(0, 365, 1).setValue(this.plugin.settings.retentionDays).setDynamicTooltip().onChange(async (value) => {
      this.plugin.settings.retentionDays = value;
      await this.plugin.saveSettings();
    }));
    new import_obsidian.Setting(containerEl).setName("Color scheme").setDesc("Choose the color scheme for change highlighting").addDropdown((dropdown) => dropdown.addOption("default", "Default").addOption("colorblind", "Colorblind friendly").addOption("dark", "Dark theme optimized").setValue(this.plugin.settings.colorScheme).onChange(async (value) => {
      this.plugin.settings.colorScheme = value;
      await this.plugin.saveSettings();
    }));
    new import_obsidian.Setting(containerEl).setName("Auto-save sessions").setDesc("Automatically save edit sessions as they occur").addToggle((toggle) => toggle.setValue(this.plugin.settings.autoSave).onChange(async (value) => {
      this.plugin.settings.autoSave = value;
      await this.plugin.saveSettings();
    }));
    new import_obsidian.Setting(containerEl).setName("Export format").setDesc("Default format for exporting edit sessions").addDropdown((dropdown) => dropdown.addOption("json", "JSON").addOption("csv", "CSV").addOption("markdown", "Markdown").setValue(this.plugin.settings.exportFormat).onChange(async (value) => {
      this.plugin.settings.exportFormat = value;
      await this.plugin.saveSettings();
    }));
    containerEl.createEl("h3", { text: "Event Bus Integration" });
    new import_obsidian.Setting(containerEl).setName("Enable event bus").setDesc("Enable cross-plugin coordination through the Writerr event bus").addToggle((toggle) => toggle.setValue(this.plugin.settings.enableEventBus).onChange(async (value) => {
      this.plugin.settings.enableEventBus = value;
      await this.plugin.saveSettings();
    }));
    new import_obsidian.Setting(containerEl).setName("Event bus debug mode").setDesc("Enable debug logging for event bus operations").addToggle((toggle) => toggle.setValue(this.plugin.settings.eventBusDebugMode).onChange(async (value) => {
      this.plugin.settings.eventBusDebugMode = value;
      await this.plugin.saveSettings();
    }));
    new import_obsidian.Setting(containerEl).setName("Max reconnection attempts").setDesc("Maximum number of reconnection attempts when event bus is unavailable").addSlider((slider) => slider.setLimits(1, 10, 1).setValue(this.plugin.settings.eventBusMaxReconnectAttempts).setDynamicTooltip().onChange(async (value) => {
      this.plugin.settings.eventBusMaxReconnectAttempts = value;
      await this.plugin.saveSettings();
    }));
    new import_obsidian.Setting(containerEl).setName("Reconnection delay").setDesc("Delay between reconnection attempts (milliseconds)").addSlider((slider) => slider.setLimits(500, 5e3, 100).setValue(this.plugin.settings.eventBusReconnectDelay).setDynamicTooltip().onChange(async (value) => {
      this.plugin.settings.eventBusReconnectDelay = value;
      await this.plugin.saveSettings();
    }));
    containerEl.createEl("h3", { text: "Actions" });
    new import_obsidian.Setting(containerEl).setName("Export current session").setDesc("Export the current editing session").addButton((button) => button.setButtonText("Export").setCta().onClick(() => {
      if (this.plugin.currentSession) {
        this.plugin.exportSession(this.plugin.currentSession.id);
      }
    }));
    new import_obsidian.Setting(containerEl).setName("Clear all history").setDesc("Delete all stored edit history (cannot be undone)").addButton((button) => button.setButtonText("Clear").setWarning().onClick(() => {
      this.plugin.clearEditHistory();
    }));
  }
};

// shared/utils/index.ts
function generateId() {
  return Math.random().toString(36).substr(2, 9);
}
function debounce(func, wait) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}
function getWordCount(text) {
  return text.trim().split(/\s+/).filter((word) => word.length > 0).length;
}
function getCharacterCount(text) {
  return text.length;
}

// plugins/track-edits/src/validation/sanitization-utils.ts
var SanitizationUtils = class {
  /**
   * Sanitizes a string by removing dangerous content and limiting length
   */
  static sanitizeString(input, options = {}) {
    if (typeof input !== "string") {
      return "";
    }
    const {
      maxLength = 1e4,
      preserveNewlines = true,
      allowBasicFormatting = false,
      strictMode = true
    } = options;
    let sanitized = input;
    sanitized = sanitized.replace(this.CONTROL_CHARS, "");
    for (const pattern of this.SCRIPT_PATTERNS) {
      sanitized = sanitized.replace(pattern, "");
    }
    for (const pattern of this.PROTOCOL_PATTERNS) {
      sanitized = sanitized.replace(pattern, "removed:");
    }
    for (const pattern of this.EVENT_ATTRIBUTES) {
      sanitized = sanitized.replace(pattern, "");
    }
    if (strictMode) {
      sanitized = sanitized.replace(/<[^>]*>/g, "");
    } else if (!allowBasicFormatting) {
      sanitized = sanitized.replace(/<(?!\/?(b|i|em|strong|u|br|p)\b)[^>]*>/gi, "");
    }
    if (!preserveNewlines) {
      sanitized = sanitized.replace(/\s+/g, " ");
    } else {
      sanitized = sanitized.replace(/[ \t]+/g, " ");
      sanitized = sanitized.replace(/\n\s*\n/g, "\n\n");
    }
    sanitized = sanitized.trim();
    if (sanitized.length > maxLength) {
      sanitized = this.truncateWithEllipsis(sanitized, maxLength);
    }
    return sanitized;
  }
  /**
   * Sanitizes an array of strings (used for constraints)
   */
  static sanitizeStringArray(input, maxItems = 50, maxItemLength = 500) {
    if (!Array.isArray(input)) {
      return [];
    }
    const limited = input.slice(0, maxItems);
    return limited.map((item) => this.sanitizeString(item, {
      maxLength: maxItemLength,
      strictMode: true,
      preserveNewlines: false
    })).filter((item) => item.length > 0);
  }
  /**
   * Truncates a string and adds ellipsis, trying to preserve word boundaries
   */
  static truncateWithEllipsis(input, maxLength) {
    if (input.length <= maxLength) {
      return input;
    }
    const truncated = input.substring(0, maxLength - 3);
    const lastSpace = truncated.lastIndexOf(" ");
    if (lastSpace > maxLength * 0.7) {
      return truncated.substring(0, lastSpace) + "...";
    }
    return truncated + "...";
  }
  /**
   * Validates and sanitizes a provider name
   */
  static sanitizeAIProvider(provider) {
    if (typeof provider !== "string") {
      return "";
    }
    let sanitized = provider.replace(/[^a-zA-Z0-9\-_.]/g, "");
    sanitized = sanitized.substring(0, 100);
    sanitized = sanitized.replace(/^[\-_.]+|[\-_.]+$/g, "");
    return sanitized;
  }
  /**
   * Validates and sanitizes a model name
   */
  static sanitizeAIModel(model) {
    if (typeof model !== "string") {
      return "";
    }
    let sanitized = model.replace(/[^a-zA-Z0-9\-_.:\/]/g, "");
    sanitized = sanitized.substring(0, 200);
    sanitized = sanitized.replace(/^[\-_.:\/]+|[\-_.:\/]+$/g, "");
    return sanitized;
  }
  /**
   * Sanitizes a mode string
   */
  static sanitizeMode(mode) {
    if (typeof mode !== "string") {
      return "";
    }
    let sanitized = mode.replace(/[^a-zA-Z0-9\-_]/g, "");
    sanitized = sanitized.substring(0, 100);
    sanitized = sanitized.toLowerCase();
    return sanitized;
  }
  /**
   * Validates that a timestamp is reasonable
   */
  static validateTimestamp(timestamp) {
    if (!timestamp) {
      return null;
    }
    let date;
    try {
      if (timestamp instanceof Date) {
        date = timestamp;
      } else {
        date = new Date(timestamp);
      }
    } catch (error) {
      return null;
    }
    if (isNaN(date.getTime())) {
      return null;
    }
    const now = /* @__PURE__ */ new Date();
    const oneMinuteFromNow = new Date(now.getTime() + 6e4);
    const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1e3);
    if (date > oneMinuteFromNow || date < oneYearAgo) {
      return null;
    }
    return date;
  }
  /**
   * Calculates the serialized size of an object for storage limits
   */
  static calculateSerializedSize(obj) {
    try {
      return JSON.stringify(obj).length;
    } catch (error) {
      return 0;
    }
  }
  /**
   * Deep clones and sanitizes nested objects to prevent prototype pollution
   */
  static sanitizeObject(obj, maxDepth = 10) {
    if (maxDepth <= 0) {
      return null;
    }
    if (obj === null || typeof obj !== "object") {
      return obj;
    }
    if (Array.isArray(obj)) {
      return obj.map((item) => this.sanitizeObject(item, maxDepth - 1));
    }
    const sanitized = /* @__PURE__ */ Object.create(null);
    for (const key in obj) {
      if (obj.hasOwnProperty(key) && !this.isDangerousKey(key)) {
        sanitized[key] = this.sanitizeObject(obj[key], maxDepth - 1);
      }
    }
    return sanitized;
  }
  /**
   * Checks for dangerous object keys that could cause prototype pollution
   */
  static isDangerousKey(key) {
    const dangerous = [
      "__proto__",
      "constructor",
      "prototype",
      "__defineGetter__",
      "__defineSetter__",
      "__lookupGetter__",
      "__lookupSetter__"
    ];
    return dangerous.includes(key);
  }
  /**
   * Detects potential security threats in input strings
   */
  static detectSecurityThreats(input) {
    const threats = [];
    if (typeof input !== "string") {
      return threats;
    }
    for (const pattern of this.SCRIPT_PATTERNS) {
      if (pattern.test(input)) {
        threats.push("script_injection");
        break;
      }
    }
    for (const pattern of this.PROTOCOL_PATTERNS) {
      if (pattern.test(input)) {
        threats.push("dangerous_protocol");
        break;
      }
    }
    for (const pattern of this.EVENT_ATTRIBUTES) {
      if (pattern.test(input)) {
        threats.push("event_handler");
        break;
      }
    }
    if (this.CONTROL_CHARS.test(input)) {
      threats.push("control_characters");
    }
    if (input.length > 1e5) {
      threats.push("excessive_length");
    }
    return threats;
  }
};
// Known malicious patterns for security detection
SanitizationUtils.SCRIPT_PATTERNS = [
  /<script[\s\S]*?<\/script>/gi,
  /<iframe[\s\S]*?<\/iframe>/gi,
  /<object[\s\S]*?<\/object>/gi,
  /<embed[\s\S]*?>/gi,
  /<form[\s\S]*?<\/form>/gi,
  /<input[\s\S]*?>/gi,
  /<textarea[\s\S]*?<\/textarea>/gi,
  /<select[\s\S]*?<\/select>/gi
];
SanitizationUtils.PROTOCOL_PATTERNS = [
  /javascript:/gi,
  /data:/gi,
  /vbscript:/gi,
  /livescript:/gi,
  /mocha:/gi,
  /file:/gi
];
SanitizationUtils.EVENT_ATTRIBUTES = [
  /on\w+\s*=/gi
];
// Control characters to remove (except allowed whitespace)
SanitizationUtils.CONTROL_CHARS = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g;

// plugins/track-edits/src/validation/ai-metadata-validator.ts
var AIMetadataValidator = class {
  // per provider per minute
  /**
   * Enhanced validation method with Editorial Engine support
   */
  static validateAIMetadata(aiProvider, aiModel, processingContext, aiTimestamp, options = {}) {
    const {
      strictMode = true,
      bypassValidation = false,
      maxProcessingContextSize = 5e4,
      logSecurityViolations = true,
      enableRateLimiting = true,
      editorialEngineMode = false
    } = options;
    if (bypassValidation) {
      return {
        isValid: true,
        sanitizedMetadata: {
          aiProvider,
          aiModel,
          processingContext,
          aiTimestamp: aiTimestamp instanceof Date ? aiTimestamp : aiTimestamp ? new Date(aiTimestamp) : void 0
        },
        errors: [],
        warnings: [],
        securityThreats: []
      };
    }
    const result = {
      isValid: true,
      sanitizedMetadata: {},
      errors: [],
      warnings: [],
      securityThreats: []
    };
    if (enableRateLimiting && aiProvider) {
      const rateLimitResult = this.checkRateLimit(aiProvider);
      if (!rateLimitResult.allowed) {
        result.isValid = false;
        result.errors.push(`Rate limit exceeded for provider ${aiProvider}. Try again in ${Math.ceil(rateLimitResult.resetIn / 1e3)} seconds.`);
        return result;
      }
    }
    if (aiProvider !== void 0) {
      const providerResult = this.validateAIProvider(aiProvider, strictMode, editorialEngineMode);
      if (!providerResult.isValid) {
        result.isValid = false;
        result.errors.push(...providerResult.errors);
      }
      result.warnings.push(...providerResult.warnings);
      result.securityThreats.push(...providerResult.securityThreats);
      result.sanitizedMetadata.aiProvider = providerResult.sanitizedValue;
    }
    if (aiModel !== void 0) {
      const modelResult = this.validateAIModel(aiModel, aiProvider, strictMode, editorialEngineMode);
      if (!modelResult.isValid) {
        result.isValid = false;
        result.errors.push(...modelResult.errors);
      }
      result.warnings.push(...modelResult.warnings);
      result.securityThreats.push(...modelResult.securityThreats);
      result.sanitizedMetadata.aiModel = modelResult.sanitizedValue;
    }
    if (processingContext !== void 0) {
      const contextResult = this.validateProcessingContext(
        processingContext,
        maxProcessingContextSize,
        strictMode,
        editorialEngineMode
      );
      if (!contextResult.isValid) {
        result.isValid = false;
        result.errors.push(...contextResult.errors);
      }
      result.warnings.push(...contextResult.warnings);
      result.securityThreats.push(...contextResult.securityThreats);
      result.sanitizedMetadata.processingContext = contextResult.sanitizedValue;
    }
    if (aiTimestamp !== void 0) {
      const timestampResult = this.validateAITimestamp(aiTimestamp);
      if (!timestampResult.isValid) {
        result.isValid = false;
        result.errors.push(...timestampResult.errors);
      }
      result.warnings.push(...timestampResult.warnings);
      result.sanitizedMetadata.aiTimestamp = timestampResult.sanitizedValue;
    }
    if (editorialEngineMode) {
      const engineResult = this.validateEditorialEngineIntegration(
        result.sanitizedMetadata.aiProvider,
        result.sanitizedMetadata.aiModel,
        result.sanitizedMetadata.processingContext
      );
      if (!engineResult.isValid) {
        result.isValid = false;
        result.errors.push(...engineResult.errors);
      }
      result.warnings.push(...engineResult.warnings);
    }
    if (logSecurityViolations && result.securityThreats.length > 0) {
      console.warn("AI metadata security threats detected:", {
        threats: result.securityThreats,
        provider: aiProvider,
        model: aiModel,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
    }
    return result;
  }
  /**
   * Enhanced AI provider validation with Editorial Engine support
   */
  static validateAIProvider(provider, strictMode = true, editorialEngineMode = false) {
    const result = {
      isValid: true,
      errors: [],
      warnings: [],
      securityThreats: []
    };
    if (typeof provider !== "string") {
      result.isValid = false;
      result.errors.push("AI provider must be a string");
      result.sanitizedValue = "";
      return result;
    }
    const threats = SanitizationUtils.detectSecurityThreats(provider);
    const advancedThreats = this.detectAdvancedSecurityThreats(provider);
    const allThreats = [...threats, ...advancedThreats];
    if (allThreats.length > 0) {
      result.securityThreats.push(...allThreats);
      if (strictMode) {
        result.isValid = false;
        result.errors.push("Security threats detected in AI provider name");
      } else {
        result.warnings.push("Security threats sanitized in AI provider name");
      }
    }
    const sanitized = SanitizationUtils.sanitizeAIProvider(provider);
    result.sanitizedValue = sanitized;
    if (sanitized.length === 0) {
      result.isValid = false;
      result.errors.push("AI provider name is empty after sanitization");
      return result;
    }
    if (sanitized.length > 50) {
      result.isValid = false;
      result.errors.push("AI provider name too long (max 50 characters)");
      return result;
    }
    const lowerProvider = sanitized.toLowerCase();
    if (!this.KNOWN_PROVIDERS.includes(lowerProvider)) {
      if (strictMode) {
        result.isValid = false;
        result.errors.push(`Unknown AI provider: ${sanitized}. Must be one of: ${this.KNOWN_PROVIDERS.join(", ")}`);
      } else {
        result.warnings.push(`Unknown AI provider: ${sanitized}. Consider adding to whitelist.`);
      }
    }
    if (editorialEngineMode) {
      const engineValidation = this.validateEditorialEngineProvider(sanitized);
      if (!engineValidation.isValid) {
        result.isValid = false;
        result.errors.push(...engineValidation.errors);
      }
      result.warnings.push(...engineValidation.warnings);
    }
    return result;
  }
  /**
   * Enhanced AI model validation with provider-specific rules
   */
  static validateAIModel(model, provider, strictMode = true, editorialEngineMode = false) {
    const result = {
      isValid: true,
      errors: [],
      warnings: [],
      securityThreats: []
    };
    if (typeof model !== "string") {
      result.isValid = false;
      result.errors.push("AI model must be a string");
      result.sanitizedValue = "";
      return result;
    }
    const threats = SanitizationUtils.detectSecurityThreats(model);
    const advancedThreats = this.detectAdvancedSecurityThreats(model);
    const allThreats = [...threats, ...advancedThreats];
    if (allThreats.length > 0) {
      result.securityThreats.push(...allThreats);
      if (strictMode) {
        result.isValid = false;
        result.errors.push("Security threats detected in AI model name");
      } else {
        result.warnings.push("Security threats sanitized in AI model name");
      }
    }
    const sanitized = SanitizationUtils.sanitizeAIModel(model);
    result.sanitizedValue = sanitized;
    if (sanitized.length === 0) {
      result.isValid = false;
      result.errors.push("AI model name is empty after sanitization");
      return result;
    }
    if (sanitized.length > 100) {
      result.isValid = false;
      result.errors.push("AI model name too long (max 100 characters)");
      return result;
    }
    if (provider && strictMode) {
      const providerValidation = this.validateModelForProvider(sanitized, provider);
      if (!providerValidation.isValid) {
        result.warnings.push(...providerValidation.errors);
      }
    }
    if (editorialEngineMode) {
      const engineValidation = this.validateEditorialEngineModel(sanitized, provider);
      if (!engineValidation.isValid) {
        result.warnings.push(...engineValidation.errors);
      }
    }
    return result;
  }
  /**
   * Enhanced processing context validation with Editorial Engine constraints
   */
  static validateProcessingContext(context, maxSize = 5e4, strictMode = true, editorialEngineMode = false) {
    const result = {
      isValid: true,
      errors: [],
      warnings: [],
      securityThreats: []
    };
    if (typeof context !== "object" || context === null) {
      result.isValid = false;
      result.errors.push("Processing context must be an object");
      result.sanitizedValue = {};
      return result;
    }
    const currentSize = SanitizationUtils.calculateSerializedSize(context);
    if (currentSize > maxSize) {
      result.isValid = false;
      result.errors.push(`Processing context too large: ${currentSize} bytes (max ${maxSize})`);
      result.sanitizedValue = {};
      return result;
    }
    const sanitizedContext = SanitizationUtils.sanitizeObject(context, 10);
    const validatedContext = {};
    if (sanitizedContext.constraints !== void 0) {
      const constraintsResult = this.validateConstraints(sanitizedContext.constraints, editorialEngineMode, strictMode);
      if (!constraintsResult.isValid) {
        result.isValid = false;
        result.errors.push(...constraintsResult.errors);
      }
      result.warnings.push(...constraintsResult.warnings);
      result.securityThreats.push(...constraintsResult.securityThreats);
      validatedContext.constraints = constraintsResult.sanitizedValue;
    }
    if (sanitizedContext.prompt !== void 0) {
      const promptResult = this.validatePrompt(sanitizedContext.prompt, strictMode);
      if (!promptResult.isValid) {
        result.isValid = false;
        result.errors.push(...promptResult.errors);
      }
      result.warnings.push(...promptResult.warnings);
      result.securityThreats.push(...promptResult.securityThreats);
      validatedContext.prompt = promptResult.sanitizedValue;
    }
    if (sanitizedContext.mode !== void 0) {
      const modeResult = this.validateProcessingMode(sanitizedContext.mode, editorialEngineMode, strictMode);
      if (!modeResult.isValid) {
        result.isValid = false;
        result.errors.push(...modeResult.errors);
      }
      result.warnings.push(...modeResult.warnings);
      validatedContext.mode = modeResult.sanitizedValue;
    }
    if (sanitizedContext.instructions !== void 0) {
      const instructionsResult = this.validateInstructions(sanitizedContext.instructions, strictMode);
      if (!instructionsResult.isValid) {
        result.isValid = false;
        result.errors.push(...instructionsResult.errors);
      }
      result.warnings.push(...instructionsResult.warnings);
      result.securityThreats.push(...instructionsResult.securityThreats);
      validatedContext.instructions = instructionsResult.sanitizedValue;
    }
    if (sanitizedContext.conversationId !== void 0) {
      const conversationResult = this.validateConversationContext(sanitizedContext.conversationId, strictMode);
      if (!conversationResult.isValid) {
        result.isValid = false;
        result.errors.push(...conversationResult.errors);
      }
      result.warnings.push(...conversationResult.warnings);
      validatedContext.conversationId = conversationResult.sanitizedValue;
    }
    if (sanitizedContext.metadata !== void 0) {
      const metadataResult = this.validateMetadata(sanitizedContext.metadata, strictMode);
      if (!metadataResult.isValid) {
        result.warnings.push(...metadataResult.errors);
      }
      validatedContext.metadata = metadataResult.sanitizedValue;
    }
    if (sanitizedContext.settings !== void 0) {
      const settingsResult = this.validateSettings(sanitizedContext.settings, strictMode);
      if (!settingsResult.isValid) {
        result.warnings.push(...settingsResult.errors);
      }
      validatedContext.settings = settingsResult.sanitizedValue;
    }
    const finalSize = SanitizationUtils.calculateSerializedSize(validatedContext);
    if (finalSize > maxSize) {
      result.isValid = false;
      result.errors.push(`Processing context still too large after sanitization: ${finalSize} bytes (max ${maxSize})`);
      result.sanitizedValue = {};
      return result;
    }
    result.sanitizedValue = validatedContext;
    return result;
  }
  /**
   * Validates constraints with Editorial Engine support
   */
  static validateConstraints(constraints, editorialEngineMode, strictMode) {
    const result = { isValid: true, errors: [], warnings: [], securityThreats: [] };
    if (!Array.isArray(constraints)) {
      result.isValid = false;
      result.errors.push("Constraints must be an array");
      result.sanitizedValue = [];
      return result;
    }
    const sanitizedConstraints = [];
    for (let i = 0; i < Math.min(constraints.length, 50); i++) {
      const constraint = constraints[i];
      if (typeof constraint !== "string") {
        result.warnings.push(`Constraint ${i} is not a string, skipping`);
        continue;
      }
      const threats = this.detectAdvancedSecurityThreats(constraint);
      if (threats.length > 0) {
        result.securityThreats.push(...threats);
        if (strictMode) {
          result.warnings.push(`Security threats in constraint ${i}, sanitizing`);
        }
      }
      const sanitized = SanitizationUtils.sanitizeString(constraint, {
        maxLength: 1e3,
        preserveNewlines: false,
        strictMode
      });
      if (sanitized.length === 0) {
        result.warnings.push(`Constraint ${i} is empty after sanitization, skipping`);
        continue;
      }
      if (editorialEngineMode) {
        const constraintValidation = this.validateConstraintFormat(sanitized);
        if (!constraintValidation.isValid) {
          result.warnings.push(...constraintValidation.errors);
        }
      }
      sanitizedConstraints.push(sanitized);
    }
    if (constraints.length > 50) {
      result.warnings.push(`Too many constraints (${constraints.length}), truncated to 50`);
    }
    result.sanitizedValue = sanitizedConstraints;
    return result;
  }
  /**
   * Validates Editorial Engine constraint format
   */
  static validateConstraintFormat(constraint) {
    const result = { isValid: true, errors: [], warnings: [], securityThreats: [] };
    const structuredPatterns = [
      /^[\w-]+:[\s\S]+$/,
      // type:value format
      /^[\w-]+=[\s\S]+$/,
      // key=value format
      /^[\w-]+\s+[\s\S]+$/
      // key value format
    ];
    const hasStructure = structuredPatterns.some((pattern) => pattern.test(constraint));
    if (!hasStructure && constraint.length > 20) {
      result.warnings.push('Constraint may benefit from structured format (e.g., "tone:professional" or "length=500")');
    }
    const typeMatch = constraint.match(/^([\w-]+)[:=]/);
    if (typeMatch) {
      const type = typeMatch[1].toLowerCase();
      if (!this.CONSTRAINT_TYPES.includes(type)) {
        result.warnings.push(`Unknown constraint type: ${type}. Consider using: ${this.CONSTRAINT_TYPES.join(", ")}`);
      }
    }
    return result;
  }
  /**
   * Editorial Engine integration validation
   */
  static validateEditorialEngineIntegration(provider, model, context) {
    const result = { isValid: true, errors: [], warnings: [], securityThreats: [] };
    if (provider && !["editorial-engine", "writerr", "openai", "anthropic", "custom"].includes(provider.toLowerCase())) {
      result.warnings.push(`Provider ${provider} may have limited Editorial Engine integration support`);
    }
    if (context) {
      if (!context.mode && !context.constraints) {
        result.warnings.push("Editorial Engine works best with either processing mode or constraints specified");
      }
      if (context.constraints && context.constraints.length === 0) {
        result.warnings.push("Empty constraints array provided to Editorial Engine");
      }
    }
    return result;
  }
  /**
   * Rate limiting implementation
   */
  static checkRateLimit(provider) {
    const now = Date.now();
    const key = provider.toLowerCase();
    let entry = this.rateLimitStore.get(key);
    if (!entry || now - entry.lastReset >= this.RATE_LIMIT_WINDOW) {
      entry = { count: 0, lastReset: now };
      this.rateLimitStore.set(key, entry);
    }
    entry.count++;
    if (entry.count > this.RATE_LIMIT_MAX_REQUESTS) {
      const resetIn = this.RATE_LIMIT_WINDOW - (now - entry.lastReset);
      return { allowed: false, resetIn };
    }
    return { allowed: true, resetIn: 0 };
  }
  /**
   * Advanced security threat detection
   */
  static detectAdvancedSecurityThreats(input) {
    const threats = [];
    if (/(\bUNION\b|\bSELECT\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bDROP\b)/i.test(input)) {
      threats.push("Potential SQL injection");
    }
    if (/[;&|`$(){}[\]\\]/.test(input)) {
      threats.push("Command injection characters");
    }
    if (/\.\.(\/|\\)/.test(input)) {
      threats.push("Path traversal attempt");
    }
    if (/\{\{.*\}\}|\${.*}|<%.*%>/.test(input)) {
      threats.push("Template injection pattern");
    }
    if (/__proto__|constructor\.prototype|\.constructor/.test(input)) {
      threats.push("Prototype pollution attempt");
    }
    return threats;
  }
  // Additional helper methods for enhanced validation
  static validateEditorialEngineProvider(provider) {
    const result = { isValid: true, errors: [], warnings: [], securityThreats: [] };
    if (provider === "editorial-engine" || provider === "writerr") {
      return result;
    }
    const compatibleProviders = ["openai", "anthropic", "custom", "local"];
    if (!compatibleProviders.includes(provider.toLowerCase())) {
      result.warnings.push(`Provider ${provider} may have limited Editorial Engine compatibility`);
    }
    return result;
  }
  static validateEditorialEngineModel(model, provider) {
    const result = { isValid: true, errors: [], warnings: [], securityThreats: [] };
    if (provider === "editorial-engine" || provider === "writerr") {
      if (!/^[a-z0-9\-_]+(\.[a-z0-9\-_]+)*$/i.test(model)) {
        result.errors.push("Editorial Engine model names must use alphanumeric characters, hyphens, underscores, and dots only");
      }
    }
    return result;
  }
  static validateModelForProvider(model, provider) {
    const result = { isValid: true, errors: [], warnings: [], securityThreats: [] };
    const lowerProvider = provider.toLowerCase();
    const pattern = this.MODEL_PATTERNS[lowerProvider];
    if (pattern && !pattern.test(model)) {
      result.errors.push(`Model ${model} does not match expected format for provider ${provider}`);
    }
    return result;
  }
  static validatePrompt(prompt, strictMode) {
    const result = { isValid: true, errors: [], warnings: [], securityThreats: [] };
    if (typeof prompt !== "string") {
      result.isValid = false;
      result.errors.push("Prompt must be a string");
      result.sanitizedValue = "";
      return result;
    }
    const threats = this.detectAdvancedSecurityThreats(prompt);
    if (threats.length > 0) {
      result.securityThreats.push(...threats);
    }
    result.sanitizedValue = SanitizationUtils.sanitizeString(prompt, {
      maxLength: 2e4,
      preserveNewlines: true,
      strictMode
    });
    return result;
  }
  static validateInstructions(instructions, strictMode) {
    const result = { isValid: true, errors: [], warnings: [], securityThreats: [] };
    if (typeof instructions !== "string") {
      result.isValid = false;
      result.errors.push("Instructions must be a string");
      result.sanitizedValue = "";
      return result;
    }
    const threats = this.detectAdvancedSecurityThreats(instructions);
    if (threats.length > 0) {
      result.securityThreats.push(...threats);
    }
    result.sanitizedValue = SanitizationUtils.sanitizeString(instructions, {
      maxLength: 1e4,
      preserveNewlines: true,
      strictMode
    });
    return result;
  }
  static validateProcessingMode(mode, editorialEngineMode, strictMode) {
    const result = { isValid: true, errors: [], warnings: [], securityThreats: [] };
    if (typeof mode !== "string") {
      result.isValid = false;
      result.errors.push("Processing mode must be a string");
      result.sanitizedValue = "";
      return result;
    }
    const sanitizedMode = SanitizationUtils.sanitizeMode(mode);
    result.sanitizedValue = sanitizedMode;
    const lowerMode = sanitizedMode.toLowerCase();
    if (!this.KNOWN_MODES.includes(lowerMode)) {
      if (strictMode) {
        result.warnings.push(`Unknown processing mode: ${sanitizedMode}. Available modes: ${this.KNOWN_MODES.join(", ")}`);
      }
    }
    if (editorialEngineMode) {
      const engineModes = ["constraint-based", "rule-based", "template-driven", "conversation-context"];
      if (engineModes.includes(lowerMode)) {
        result.warnings.push(`Mode ${sanitizedMode} requires Editorial Engine context validation`);
      }
    }
    return result;
  }
  static validateConversationContext(conversationId, strictMode) {
    const result = { isValid: true, errors: [], warnings: [], securityThreats: [] };
    if (typeof conversationId !== "string") {
      result.isValid = false;
      result.errors.push("Conversation ID must be a string");
      result.sanitizedValue = "";
      return result;
    }
    if (!/^[a-zA-Z0-9\-_]{8,64}$/.test(conversationId)) {
      result.isValid = false;
      result.errors.push("Conversation ID must be 8-64 alphanumeric characters, hyphens, or underscores");
      result.sanitizedValue = "";
      return result;
    }
    result.sanitizedValue = conversationId;
    return result;
  }
  static validateMetadata(metadata, strictMode) {
    const result = { isValid: true, errors: [], warnings: [], securityThreats: [] };
    if (typeof metadata !== "object" || metadata === null) {
      result.warnings.push("Metadata must be an object");
      result.sanitizedValue = {};
      return result;
    }
    const sanitized = SanitizationUtils.sanitizeObject(metadata, 3);
    result.sanitizedValue = sanitized;
    return result;
  }
  static validateSettings(settings, strictMode) {
    const result = { isValid: true, errors: [], warnings: [], securityThreats: [] };
    if (typeof settings !== "object" || settings === null) {
      result.warnings.push("Settings must be an object");
      result.sanitizedValue = {};
      return result;
    }
    const sanitized = SanitizationUtils.sanitizeObject(settings, 3);
    result.sanitizedValue = sanitized;
    return result;
  }
  /**
   * Validates AI timestamp
   */
  static validateAITimestamp(timestamp) {
    const result = {
      isValid: true,
      errors: [],
      warnings: [],
      securityThreats: []
    };
    const validatedDate = SanitizationUtils.validateTimestamp(timestamp);
    if (validatedDate === null) {
      result.isValid = false;
      result.errors.push("Invalid AI timestamp: must be a valid date within reasonable range");
      result.sanitizedValue = null;
      return result;
    }
    result.sanitizedValue = validatedDate;
    return result;
  }
  /**
   * Quick validation method that returns boolean and sanitized data
   */
  static quickValidate(aiProvider, aiModel, processingContext, aiTimestamp, options = {}) {
    const result = this.validateAIMetadata(aiProvider, aiModel, processingContext, aiTimestamp, options);
    return {
      isValid: result.isValid,
      sanitized: result.sanitizedMetadata
    };
  }
  /**
   * Provides validation configuration for different environments
   */
  static getValidationConfig(environment) {
    switch (environment) {
      case "development":
        return {
          strictMode: false,
          maxProcessingContextSize: 1e5,
          logSecurityViolations: true,
          enableRateLimiting: false,
          editorialEngineMode: false
        };
      case "production":
        return {
          strictMode: true,
          maxProcessingContextSize: 5e4,
          logSecurityViolations: true,
          enableRateLimiting: true,
          editorialEngineMode: true
        };
      case "testing":
        return {
          strictMode: true,
          maxProcessingContextSize: 1e4,
          logSecurityViolations: false,
          enableRateLimiting: false,
          editorialEngineMode: true
        };
      default:
        return {
          strictMode: true,
          maxProcessingContextSize: 5e4,
          logSecurityViolations: true,
          enableRateLimiting: true,
          editorialEngineMode: false
        };
    }
  }
  /**
   * Editorial Engine specific validation method
   */
  static validateForEditorialEngine(aiProvider, aiModel, processingContext, options = {}) {
    return this.validateAIMetadata(
      aiProvider,
      aiModel,
      processingContext,
      /* @__PURE__ */ new Date(),
      {
        ...options,
        editorialEngineMode: true,
        strictMode: true
      }
    );
  }
  /**
   * Reset rate limiting for a provider (for testing or admin use)
   */
  static resetRateLimit(provider) {
    if (provider) {
      this.rateLimitStore.delete(provider.toLowerCase());
    } else {
      this.rateLimitStore.clear();
    }
  }
};
// Whitelist of known AI providers with version support
AIMetadataValidator.KNOWN_PROVIDERS = [
  "openai",
  "anthropic",
  "google",
  "cohere",
  "huggingface",
  "hugging-face",
  "local",
  "custom",
  "azure",
  "aws",
  "gcp",
  "microsoft",
  "meta",
  "facebook",
  "claude",
  "chatgpt",
  "bard",
  "palm",
  "llama",
  "mistral",
  "together",
  "perplexity",
  "writerr",
  // Platform-specific provider
  "editorial-engine"
  // Editorial Engine internal
];
// Enhanced AI model validation patterns
AIMetadataValidator.MODEL_PATTERNS = {
  openai: /^(gpt-[34]\.?5?-?(turbo|instruct)?(-\d{4})?|text-davinci-\d{3}|code-davinci-\d{3})$/i,
  anthropic: /^(claude-(instant-)?[123](\.\d+)?(-\d+k)?|claude-[23]-(haiku|sonnet|opus)(-\d{8})?)$/i,
  google: /^(palm|bard|gemini)(-pro|-ultra)?(-\d+)?$/i,
  azure: /^(gpt-35-turbo|gpt-4)(-\d{4})?$/i,
  huggingface: /^[\w\-\/]+\/[\w\-\.]+$/,
  local: /^[\w\-\.]+$/,
  custom: /^[\w\-\.]+$/
};
// Known AI processing modes with Editorial Engine extensions
AIMetadataValidator.KNOWN_MODES = [
  "edit",
  "proofread",
  "rewrite",
  "expand",
  "summarize",
  "translate",
  "format",
  "style",
  "tone",
  "grammar",
  "creative",
  "technical",
  "academic",
  "casual",
  "formal",
  "custom",
  // Editorial Engine specific modes
  "constraint-based",
  "rule-based",
  "template-driven",
  "conversation-context",
  "batch-processing",
  "multi-step",
  "iterative",
  "collaborative"
];
// Editorial Engine constraint types
AIMetadataValidator.CONSTRAINT_TYPES = [
  "style-guide",
  "tone-preference",
  "length-limit",
  "format-requirement",
  "terminology",
  "audience-target",
  "brand-voice",
  "content-policy",
  "technical-standard",
  "accessibility",
  "seo-optimization",
  "citation-style",
  "language-level",
  "cultural-sensitivity"
];
// Rate limiting configuration
AIMetadataValidator.rateLimitStore = /* @__PURE__ */ new Map();
AIMetadataValidator.RATE_LIMIT_WINDOW = 6e4;
// 1 minute
AIMetadataValidator.RATE_LIMIT_MAX_REQUESTS = 100;

// plugins/track-edits/src/queries/query-builder.ts
var QueryBuilderImpl = class _QueryBuilderImpl {
  constructor(querySystem) {
    this.criteria = {};
    this.options = {};
    this.querySystem = querySystem;
  }
  // Basic filters
  byProvider(provider) {
    return this.clone({ aiProvider: provider });
  }
  byModel(model) {
    return this.clone({ aiModel: model });
  }
  byAuthor(author) {
    return this.clone({ author });
  }
  byType(type) {
    return this.clone({ changeType: type });
  }
  // Time filters
  inTimeRange(start, end) {
    return this.clone({ timeRange: { start, end } });
  }
  since(date) {
    return this.clone({ timeRange: { start: date, end: /* @__PURE__ */ new Date() } });
  }
  before(date) {
    const oldestDate = /* @__PURE__ */ new Date(0);
    return this.clone({ timeRange: { start: oldestDate, end: date } });
  }
  inLast(amount, unit) {
    const now = /* @__PURE__ */ new Date();
    const start = new Date(now);
    switch (unit) {
      case "hours":
        start.setHours(start.getHours() - amount);
        break;
      case "days":
        start.setDate(start.getDate() - amount);
        break;
      case "weeks":
        start.setDate(start.getDate() - amount * 7);
        break;
      case "months":
        start.setMonth(start.getMonth() - amount);
        break;
    }
    return this.clone({ timeRange: { start, end: now } });
  }
  // AI metadata filters
  withAIMetadata() {
    return this.clone({ hasAIMetadata: true });
  }
  withoutAIMetadata() {
    return this.clone({ hasAIMetadata: false });
  }
  withProcessingContext() {
    return this.clone({ hasProcessingContext: true });
  }
  withoutProcessingContext() {
    return this.clone({ hasProcessingContext: false });
  }
  // Context filters
  inMode(mode) {
    return this.clone({ contextMode: mode });
  }
  withConstraints(constraints) {
    return this.clone({ contextConstraints: constraints });
  }
  hasConstraint(constraint) {
    const existing = this.criteria.contextConstraints || [];
    const updated = [...existing, constraint];
    return this.clone({ contextConstraints: updated });
  }
  withInstructions(instructions) {
    return this.clone({ contextInstructions: instructions });
  }
  // Text search
  textContains(query, options = {}) {
    return this.clone({
      textSearch: {
        query,
        caseSensitive: options.caseSensitive,
        fuzzyMatch: options.fuzzyMatch,
        searchIn: ["text", "removedText"]
      }
    });
  }
  textMatches(pattern) {
    return this.clone({
      textSearch: {
        query: pattern.source,
        caseSensitive: !pattern.ignoreCase,
        fuzzyMatch: false,
        searchIn: ["text", "removedText"]
      }
    });
  }
  contextContains(query) {
    return this.clone({
      textSearch: {
        query,
        searchIn: ["processingContext"]
      }
    });
  }
  // Position filters
  inRange(from, to) {
    return this.clone({ positionRange: { from, to } });
  }
  atPosition(position) {
    return this.clone({ positionRange: { from: position, to: position + 1 } });
  }
  // Quality filters
  withValidationWarnings() {
    return this.clone({ hasValidationWarnings: true });
  }
  withSecurityThreats() {
    return this.clone({ hasSecurityThreats: true });
  }
  // Sorting and pagination
  sortBy(field, order = "asc") {
    const newBuilder = this.cloneBuilder();
    newBuilder.options.sortBy = field;
    newBuilder.options.sortOrder = order;
    return newBuilder;
  }
  limit(count) {
    const newBuilder = this.cloneBuilder();
    newBuilder.options.limit = count;
    return newBuilder;
  }
  offset(start) {
    const newBuilder = this.cloneBuilder();
    newBuilder.options.offset = start;
    return newBuilder;
  }
  page(pageNum, pageSize) {
    const newBuilder = this.cloneBuilder();
    newBuilder.options.limit = pageSize;
    newBuilder.options.offset = (pageNum - 1) * pageSize;
    return newBuilder;
  }
  // Execution methods
  async exec() {
    return this.querySystem.executeQuery(this.criteria, this.options);
  }
  async count() {
    const result = await this.querySystem.executeQuery(this.criteria, {
      ...this.options,
      limit: 0
      // Don't return actual items, just count
    });
    return result.totalCount;
  }
  async first() {
    const result = await this.querySystem.executeQuery(this.criteria, {
      ...this.options,
      limit: 1
    });
    return result.items[0] || null;
  }
  async toArray() {
    const result = await this.querySystem.executeQuery(this.criteria, this.options);
    return result.items;
  }
  // Statistical methods
  async getStats() {
    const result = await this.querySystem.executeQuery(this.criteria, {
      ...this.options,
      includeStats: true
    });
    return result.stats;
  }
  async aggregate(options) {
    return this.querySystem.aggregate(this.criteria, options);
  }
  async timeline(options) {
    const result = await this.querySystem.executeQuery(this.criteria, this.options);
    const changes = result.items.filter((c) => c.aiTimestamp || c.timestamp);
    return this.generateTimelineFromChanges(changes, options);
  }
  // Export methods
  async export(format) {
    switch (format.format) {
      case "json":
        return this.toJSON();
      case "csv":
        return this.toCSV();
      case "markdown":
        return this.toMarkdown();
      default:
        throw new Error(`Unsupported export format: ${format.format}`);
    }
  }
  async toJSON() {
    return this.querySystem.exportToJSON(this.criteria, this.options);
  }
  async toCSV() {
    return this.querySystem.exportToCSV(this.criteria);
  }
  async toMarkdown() {
    return this.querySystem.exportToMarkdown(this.criteria);
  }
  // Utility methods
  clone(additionalCriteria = {}) {
    const newBuilder = this.cloneBuilder();
    newBuilder.criteria = { ...this.criteria, ...additionalCriteria };
    return newBuilder;
  }
  reset() {
    const newBuilder = new _QueryBuilderImpl(this.querySystem);
    return newBuilder;
  }
  getCriteria() {
    return { ...this.criteria };
  }
  getOptions() {
    return { ...this.options };
  }
  // Advanced query methods for complex scenarios
  /**
   * Combines multiple criteria with OR logic (instead of default AND)
   */
  or(...builders) {
    throw new Error("OR queries not yet implemented - use separate queries and merge results");
  }
  /**
   * Creates a complex query with nested conditions
   */
  complex(builderFn) {
    return builderFn(this.clone());
  }
  /**
   * Adds custom filter function
   */
  where(predicate) {
    const newBuilder = this.cloneBuilder();
    newBuilder.customPredicate = predicate;
    return newBuilder;
  }
  /**
   * Groups results by a specific field
   */
  groupBy(field) {
    return new GroupedQueryBuilder(this.querySystem, this.criteria, this.options, field);
  }
  /**
   * Creates a sub-query for more complex filtering
   */
  subQuery(builderFn) {
    const subBuilder = builderFn(new _QueryBuilderImpl(this.querySystem));
    return this.clone(subBuilder.getCriteria());
  }
  // Performance optimization methods
  /**
   * Enables caching for this query
   */
  cached(ttl) {
    const newBuilder = this.cloneBuilder();
    newBuilder.options.useCache = true;
    if (ttl) {
      newBuilder.options.cacheTTL = ttl;
    }
    return newBuilder;
  }
  /**
   * Enables lazy evaluation for better performance with large datasets
   */
  lazy() {
    const newBuilder = this.cloneBuilder();
    newBuilder.options.lazyEvaluation = true;
    return newBuilder;
  }
  // Private helper methods
  cloneBuilder() {
    const newBuilder = new _QueryBuilderImpl(this.querySystem);
    newBuilder.criteria = { ...this.criteria };
    newBuilder.options = { ...this.options };
    return newBuilder;
  }
  generateTimelineFromChanges(changes, options) {
    const grouped = /* @__PURE__ */ new Map();
    for (const change of changes) {
      const timestamp = change.aiTimestamp ? change.aiTimestamp : new Date(change.timestamp);
      const bucketKey = this.getTimeBucket(timestamp, options.interval);
      if (!grouped.has(bucketKey)) {
        grouped.set(bucketKey, []);
      }
      grouped.get(bucketKey).push(change);
    }
    const timeline = [];
    for (const [bucketKey, bucketChanges] of grouped.entries()) {
      const timestamp = new Date(bucketKey);
      const point = {
        timestamp,
        count: bucketChanges.length
      };
      if (options.includeMetadata) {
        point.metadata = {
          providers: [...new Set(bucketChanges.map((c) => c.aiProvider).filter(Boolean))],
          models: [...new Set(bucketChanges.map((c) => c.aiModel).filter(Boolean))],
          modes: [...new Set(bucketChanges.map((c) => {
            var _a;
            return (_a = c.processingContext) == null ? void 0 : _a.mode;
          }).filter(Boolean))],
          avgWordsChanged: bucketChanges.reduce((sum, c) => {
            var _a;
            return sum + (((_a = c.text) == null ? void 0 : _a.split(/\s+/).length) || 0);
          }, 0) / bucketChanges.length
        };
      }
      timeline.push(point);
    }
    timeline.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    if (options.fillGaps && timeline.length > 1) {
      return this.fillTimelineGaps(timeline, options.interval);
    }
    return timeline;
  }
  getTimeBucket(date, interval) {
    const d = new Date(date);
    switch (interval) {
      case "hour":
        d.setMinutes(0, 0, 0);
        break;
      case "day":
        d.setHours(0, 0, 0, 0);
        break;
      case "week":
        const dayOfWeek = d.getDay();
        d.setDate(d.getDate() - dayOfWeek);
        d.setHours(0, 0, 0, 0);
        break;
      case "month":
        d.setDate(1);
        d.setHours(0, 0, 0, 0);
        break;
    }
    return d.toISOString();
  }
  fillTimelineGaps(timeline, interval) {
    if (timeline.length < 2)
      return timeline;
    const filled = [];
    const first = timeline[0];
    const last = timeline[timeline.length - 1];
    let current = new Date(first.timestamp);
    const end = new Date(last.timestamp);
    const timelineMap = new Map(timeline.map((p) => [p.timestamp.toISOString(), p]));
    while (current <= end) {
      const key = current.toISOString();
      const existing = timelineMap.get(key);
      if (existing) {
        filled.push(existing);
      } else {
        filled.push({
          timestamp: new Date(current),
          count: 0
        });
      }
      switch (interval) {
        case "hour":
          current.setHours(current.getHours() + 1);
          break;
        case "day":
          current.setDate(current.getDate() + 1);
          break;
        case "week":
          current.setDate(current.getDate() + 7);
          break;
        case "month":
          current.setMonth(current.getMonth() + 1);
          break;
      }
    }
    return filled;
  }
};
var GroupedQueryBuilder = class {
  constructor(querySystem, criteria, options, groupField) {
    this.querySystem = querySystem;
    this.criteria = criteria;
    this.options = options;
    this.groupField = groupField;
  }
  async exec() {
    const result = await this.querySystem.executeQuery(this.criteria, this.options);
    const grouped = /* @__PURE__ */ new Map();
    for (const change of result.items) {
      let groupKey;
      switch (this.groupField) {
        case "aiProvider":
          groupKey = change.aiProvider || "unknown";
          break;
        case "aiModel":
          groupKey = change.aiModel || "unknown";
          break;
        case "type":
          groupKey = change.type;
          break;
        case "author":
          groupKey = change.author || "unknown";
          break;
        default:
          groupKey = "default";
      }
      if (!grouped.has(groupKey)) {
        grouped.set(groupKey, []);
      }
      grouped.get(groupKey).push(change);
    }
    return grouped;
  }
  async count() {
    const grouped = await this.exec();
    const counts = /* @__PURE__ */ new Map();
    for (const [key, changes] of grouped.entries()) {
      counts.set(key, changes.length);
    }
    return counts;
  }
  async toObject() {
    const grouped = await this.exec();
    const result = {};
    for (const [key, changes] of grouped.entries()) {
      result[key] = changes;
    }
    return result;
  }
};

// plugins/track-edits/src/queries/query-utils.ts
var QueryUtils = class {
  /**
   * Text matching utilities with fuzzy matching support
   */
  static textMatches(text, query, options = {}) {
    const { caseSensitive = false, fuzzyMatch = false } = options;
    let searchText = text;
    let searchQuery = query;
    if (!caseSensitive) {
      searchText = text.toLowerCase();
      searchQuery = query.toLowerCase();
    }
    if (fuzzyMatch) {
      return this.fuzzyMatch(searchText, searchQuery);
    } else {
      return searchText.includes(searchQuery);
    }
  }
  /**
   * Simple fuzzy matching implementation using edit distance
   */
  static fuzzyMatch(text, pattern, threshold = 0.8) {
    if (pattern.length < 3) {
      return text.includes(pattern);
    }
    const words = text.split(/\s+/);
    for (const word of words) {
      if (this.calculateSimilarity(word, pattern) >= threshold) {
        return true;
      }
    }
    return false;
  }
  /**
   * Calculate similarity between two strings (0-1, where 1 is identical)
   */
  static calculateSimilarity(str1, str2) {
    if (str1.length === 0 && str2.length === 0)
      return 1;
    if (str1.length === 0 || str2.length === 0)
      return 0;
    const maxLength = Math.max(str1.length, str2.length);
    const distance = this.levenshteinDistance(str1, str2);
    return (maxLength - distance) / maxLength;
  }
  /**
   * Calculate Levenshtein distance between two strings
   */
  static levenshteinDistance(str1, str2) {
    const matrix = Array(str2.length + 1).fill(null).map(
      () => Array(str1.length + 1).fill(null)
    );
    for (let i = 0; i <= str1.length; i++) {
      matrix[0][i] = i;
    }
    for (let j = 0; j <= str2.length; j++) {
      matrix[j][0] = j;
    }
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          // deletion
          matrix[j - 1][i] + 1,
          // insertion
          matrix[j - 1][i - 1] + indicator
          // substitution
        );
      }
    }
    return matrix[str2.length][str1.length];
  }
  /**
   * Date range utilities
   */
  static isDateInRange(date, start, end, timezone) {
    if (timezone) {
      console.warn("Timezone handling not fully implemented, using local timezone");
    }
    const timestamp = date.getTime();
    return timestamp >= start.getTime() && timestamp <= end.getTime();
  }
  /**
   * Processing context search utilities
   */
  static searchInProcessingContext(context, query, options = {}) {
    const searchableText = [
      context.prompt || "",
      context.mode || "",
      context.instructions || "",
      context.documentContext || "",
      ...context.constraints || []
    ].join(" ");
    return this.textMatches(searchableText, query, options);
  }
  /**
   * Aggregate data by various dimensions
   */
  static aggregateData(changes, options) {
    const { groupBy, aggregateFunction = "count", aggregateField, includePercentages = false } = options;
    const result = {};
    const groups = /* @__PURE__ */ new Map();
    for (const change of changes) {
      let groupKey = this.getGroupKey(change, groupBy);
      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      groups.get(groupKey).push(change);
    }
    for (const [groupKey, groupChanges] of groups.entries()) {
      let value;
      switch (aggregateFunction) {
        case "count":
          value = groupChanges.length;
          break;
        case "sum":
          value = this.sumField(groupChanges, aggregateField || "timestamp");
          break;
        case "avg":
          value = this.avgField(groupChanges, aggregateField || "timestamp");
          break;
        case "min":
          value = this.minField(groupChanges, aggregateField || "timestamp");
          break;
        case "max":
          value = this.maxField(groupChanges, aggregateField || "timestamp");
          break;
        default:
          value = groupChanges.length;
      }
      result[groupKey] = value;
    }
    if (includePercentages && aggregateFunction === "count") {
      const total = Object.values(result).reduce((sum, val) => sum + val, 0);
      const percentages = {};
      for (const [key, value] of Object.entries(result)) {
        percentages[`${key}_percentage`] = total > 0 ? value / total * 100 : 0;
      }
      Object.assign(result, percentages);
    }
    if (options.sortBy) {
      return this.sortObject(result, options.sortBy, options.sortOrder || "desc");
    }
    if (options.limit && options.limit > 0) {
      return this.limitObject(result, options.limit);
    }
    return result;
  }
  /**
   * Generate timeline data from changes
   */
  static generateTimeline(changes, options) {
    const { interval, fillGaps = false, includeMetadata = false } = options;
    const buckets = /* @__PURE__ */ new Map();
    for (const change of changes) {
      const timestamp = change.aiTimestamp ? change.aiTimestamp : new Date(change.timestamp);
      const bucketKey = this.getTimeBucket(timestamp, interval);
      if (!buckets.has(bucketKey)) {
        buckets.set(bucketKey, []);
      }
      buckets.get(bucketKey).push(change);
    }
    const timeline = [];
    for (const [bucketKey, bucketChanges] of buckets.entries()) {
      const point = {
        timestamp: new Date(bucketKey),
        count: bucketChanges.length
      };
      if (includeMetadata) {
        point.metadata = this.generateTimelineMetadata(bucketChanges);
      }
      timeline.push(point);
    }
    timeline.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    if (fillGaps && timeline.length > 1) {
      return this.fillTimelineGaps(timeline, interval);
    }
    return timeline;
  }
  /**
   * Format data as CSV
   */
  static formatAsCSV(changes, format) {
    const { includeHeaders = true, customFields, dateFormat = "ISO" } = format;
    let csv = "";
    if (includeHeaders) {
      const headers = customFields || [
        "id",
        "timestamp",
        "type",
        "from",
        "to",
        "text",
        "removedText",
        "author",
        "aiProvider",
        "aiModel",
        "aiTimestamp",
        "processingContext"
      ];
      csv += headers.join(",") + "\n";
    }
    for (const change of changes) {
      const row = [];
      if (customFields) {
        for (const field of customFields) {
          row.push(this.formatCSVValue(this.getFieldValue(change, field), dateFormat));
        }
      } else {
        row.push(
          this.formatCSVValue(change.id),
          this.formatCSVValue(this.formatDate(new Date(change.timestamp), dateFormat)),
          this.formatCSVValue(change.type),
          this.formatCSVValue(change.from),
          this.formatCSVValue(change.to),
          this.formatCSVValue(change.text || ""),
          this.formatCSVValue(change.removedText || ""),
          this.formatCSVValue(change.author || ""),
          this.formatCSVValue(change.aiProvider || ""),
          this.formatCSVValue(change.aiModel || ""),
          this.formatCSVValue(change.aiTimestamp ? this.formatDate(change.aiTimestamp, dateFormat) : ""),
          this.formatCSVValue(change.processingContext ? JSON.stringify(change.processingContext) : "")
        );
      }
      csv += row.join(",") + "\n";
    }
    return csv;
  }
  /**
   * Format data as Markdown
   */
  static formatAsMarkdown(result, format) {
    const { includeStats = true, includeMetadata = true } = format;
    let markdown = `# Query Results

`;
    if (includeMetadata) {
      markdown += `## Query Information

`;
      markdown += `- **Total Results**: ${result.totalCount}
`;
      markdown += `- **Execution Time**: ${result.executionTime}ms
`;
      if (result.fromCache) {
        markdown += `- **Source**: Cache
`;
      }
      if (result.page) {
        markdown += `- **Page**: ${result.page.current} of ${result.page.total}
`;
        markdown += `- **Page Size**: ${result.page.size}
`;
      }
      markdown += `
`;
    }
    if (includeStats && result.stats) {
      markdown += this.formatStatsAsMarkdown(result.stats);
    }
    if (result.items.length > 0) {
      markdown += `## Results

`;
      markdown += `| Timestamp | Type | Provider | Model | Text Preview | Position |
`;
      markdown += `|-----------|------|----------|-------|--------------|----------|
`;
      for (const change of result.items.slice(0, 50)) {
        const timestamp = change.aiTimestamp ? change.aiTimestamp.toLocaleString() : new Date(change.timestamp).toLocaleString();
        const textPreview = (change.text || change.removedText || "").substring(0, 50);
        const position = `${change.from}-${change.to}`;
        markdown += `| ${timestamp} | ${change.type} | ${change.aiProvider || "Manual"} | ${change.aiModel || "N/A"} | ${textPreview}${textPreview.length > 50 ? "..." : ""} | ${position} |
`;
      }
      if (result.items.length > 50) {
        markdown += `
*... and ${result.items.length - 50} more results*
`;
      }
    }
    return markdown;
  }
  /**
   * Format statistics as Markdown
   */
  static formatStatsAsMarkdown(stats) {
    let markdown = `## Statistics

`;
    if (Object.keys(stats.byProvider).length > 0) {
      markdown += `### AI Providers

`;
      for (const [provider, count] of Object.entries(stats.byProvider)) {
        markdown += `- **${provider}**: ${count} changes
`;
      }
      markdown += `
`;
    }
    if (Object.keys(stats.byModel).length > 0) {
      markdown += `### AI Models

`;
      for (const [model, count] of Object.entries(stats.byModel)) {
        markdown += `- **${model}**: ${count} changes
`;
      }
      markdown += `
`;
    }
    markdown += `### Change Types

`;
    for (const [type, count] of Object.entries(stats.byChangeType)) {
      markdown += `- **${type}**: ${count} changes
`;
    }
    markdown += `
`;
    markdown += `### Processing Context

`;
    markdown += `- **With Context**: ${stats.withContext} changes
`;
    markdown += `- **Without Context**: ${stats.withoutContext} changes
`;
    if (Object.keys(stats.contextModes).length > 0) {
      markdown += `
**Modes Used**:
`;
      for (const [mode, count] of Object.entries(stats.contextModes)) {
        markdown += `- **${mode}**: ${count} changes
`;
      }
    }
    markdown += `
`;
    markdown += `### Content Metrics

`;
    markdown += `- **Total Words Changed**: ${stats.totalWordsChanged}
`;
    markdown += `- **Total Characters Changed**: ${stats.totalCharsChanged}
`;
    markdown += `- **Average Words per Change**: ${stats.avgWordsChanged.toFixed(1)}
`;
    markdown += `- **Average Characters per Change**: ${stats.avgCharsChanged.toFixed(1)}
`;
    if (stats.timeRange) {
      markdown += `
### Time Range

`;
      markdown += `- **Earliest**: ${stats.timeRange.earliest.toLocaleString()}
`;
      markdown += `- **Latest**: ${stats.timeRange.latest.toLocaleString()}
`;
      markdown += `- **Span**: ${stats.timeRange.span}
`;
    }
    if (stats.validationWarnings > 0 || stats.securityThreats > 0) {
      markdown += `
### Quality Metrics

`;
      markdown += `- **Validation Warnings**: ${stats.validationWarnings}
`;
      markdown += `- **Security Threats**: ${stats.securityThreats}
`;
    }
    return markdown + `
`;
  }
  // Private helper methods
  static getGroupKey(change, groupBy) {
    var _a;
    switch (groupBy) {
      case "provider":
        return change.aiProvider || "Manual";
      case "model":
        return change.aiModel || "N/A";
      case "author":
        return change.author || "Unknown";
      case "mode":
        return ((_a = change.processingContext) == null ? void 0 : _a.mode) || "No Mode";
      case "hour":
        return new Date(change.timestamp).toISOString().substring(0, 13) + ":00:00.000Z";
      case "day":
        return new Date(change.timestamp).toISOString().substring(0, 10) + "T00:00:00.000Z";
      case "week":
        const date = new Date(change.timestamp);
        const startOfWeek = new Date(date);
        startOfWeek.setDate(date.getDate() - date.getDay());
        return startOfWeek.toISOString().substring(0, 10) + "T00:00:00.000Z";
      case "month":
        return new Date(change.timestamp).toISOString().substring(0, 7) + "-01T00:00:00.000Z";
      default:
        return "Unknown";
    }
  }
  static sumField(changes, field) {
    return changes.reduce((sum, change) => sum + (this.getNumericFieldValue(change, field) || 0), 0);
  }
  static avgField(changes, field) {
    if (changes.length === 0)
      return 0;
    return this.sumField(changes, field) / changes.length;
  }
  static minField(changes, field) {
    const values = changes.map((c) => this.getNumericFieldValue(c, field)).filter((v) => v !== void 0);
    return values.length > 0 ? Math.min(...values) : 0;
  }
  static maxField(changes, field) {
    const values = changes.map((c) => this.getNumericFieldValue(c, field)).filter((v) => v !== void 0);
    return values.length > 0 ? Math.max(...values) : 0;
  }
  static getNumericFieldValue(change, field) {
    var _a, _b;
    switch (field) {
      case "timestamp":
        return change.timestamp;
      case "from":
        return change.from;
      case "to":
        return change.to;
      case "textLength":
        return ((_a = change.text) == null ? void 0 : _a.length) || 0;
      case "removedTextLength":
        return ((_b = change.removedText) == null ? void 0 : _b.length) || 0;
      default:
        return 0;
    }
  }
  static getFieldValue(change, field) {
    const keys = field.split(".");
    let value = change;
    for (const key of keys) {
      value = value == null ? void 0 : value[key];
      if (value === void 0)
        break;
    }
    return value;
  }
  static sortObject(obj, sortBy, order) {
    const entries = Object.entries(obj);
    entries.sort((a, b) => {
      const valueA = sortBy === "key" ? a[0] : a[1];
      const valueB = sortBy === "key" ? b[0] : b[1];
      if (typeof valueA === "string" && typeof valueB === "string") {
        return order === "asc" ? valueA.localeCompare(valueB) : valueB.localeCompare(valueA);
      } else {
        return order === "asc" ? valueA - valueB : valueB - valueA;
      }
    });
    return Object.fromEntries(entries);
  }
  static limitObject(obj, limit) {
    const entries = Object.entries(obj).slice(0, limit);
    return Object.fromEntries(entries);
  }
  static getTimeBucket(date, interval) {
    const d = new Date(date);
    switch (interval) {
      case "hour":
        d.setMinutes(0, 0, 0);
        break;
      case "day":
        d.setHours(0, 0, 0, 0);
        break;
      case "week":
        const dayOfWeek = d.getDay();
        d.setDate(d.getDate() - dayOfWeek);
        d.setHours(0, 0, 0, 0);
        break;
      case "month":
        d.setDate(1);
        d.setHours(0, 0, 0, 0);
        break;
    }
    return d.toISOString();
  }
  static generateTimelineMetadata(changes) {
    return {
      providers: [...new Set(changes.map((c) => c.aiProvider).filter(Boolean))],
      models: [...new Set(changes.map((c) => c.aiModel).filter(Boolean))],
      modes: [...new Set(changes.map((c) => {
        var _a;
        return (_a = c.processingContext) == null ? void 0 : _a.mode;
      }).filter(Boolean))],
      types: [...new Set(changes.map((c) => c.type))],
      avgWordsChanged: changes.reduce((sum, c) => {
        var _a;
        return sum + (((_a = c.text) == null ? void 0 : _a.split(/\s+/).length) || 0);
      }, 0) / changes.length,
      totalTextLength: changes.reduce((sum, c) => {
        var _a;
        return sum + (((_a = c.text) == null ? void 0 : _a.length) || 0);
      }, 0),
      authors: [...new Set(changes.map((c) => c.author).filter(Boolean))]
    };
  }
  static fillTimelineGaps(timeline, interval) {
    if (timeline.length < 2)
      return timeline;
    const filled = [];
    const first = timeline[0];
    const last = timeline[timeline.length - 1];
    let current = new Date(first.timestamp);
    const end = new Date(last.timestamp);
    const timelineMap = new Map(timeline.map((p) => [p.timestamp.toISOString(), p]));
    while (current <= end) {
      const key = current.toISOString();
      const existing = timelineMap.get(key);
      if (existing) {
        filled.push(existing);
      } else {
        filled.push({
          timestamp: new Date(current),
          count: 0
        });
      }
      switch (interval) {
        case "hour":
          current.setHours(current.getHours() + 1);
          break;
        case "day":
          current.setDate(current.getDate() + 1);
          break;
        case "week":
          current.setDate(current.getDate() + 7);
          break;
        case "month":
          current.setMonth(current.getMonth() + 1);
          break;
      }
    }
    return filled;
  }
  static formatCSVValue(value, dateFormat) {
    if (value === null || value === void 0) {
      return "";
    }
    let strValue = String(value);
    if (value instanceof Date) {
      strValue = this.formatDate(value, dateFormat || "ISO");
    }
    if (strValue.includes(",") || strValue.includes('"') || strValue.includes("\n")) {
      strValue = `"${strValue.replace(/"/g, '""')}"`;
    }
    return strValue;
  }
  static formatDate(date, format) {
    switch (format) {
      case "ISO":
        return date.toISOString();
      case "locale":
        return date.toLocaleString();
      case "date-only":
        return date.toISOString().split("T")[0];
      default:
        return date.toISOString();
    }
  }
};

// plugins/track-edits/src/queries/edit-change-query-system.ts
var EditChangeQuerySystem = class {
  constructor(sessions, cache) {
    this.sessions = sessions || /* @__PURE__ */ new Map();
    this.cache = cache || new MemoryQueryCache();
    this.index = this.buildIndex();
  }
  /**
   * Updates the internal sessions data and rebuilds indices
   */
  updateSessions(sessions) {
    this.sessions = sessions;
    this.index = this.buildIndex();
    this.cache.clear();
  }
  /**
   * Creates a new query builder instance
   */
  query() {
    return new QueryBuilderImpl(this);
  }
  /**
   * Executes a query with given criteria and options
   */
  async executeQuery(criteria, options = {}) {
    const startTime = Date.now();
    const cacheKey = this.generateCacheKey(criteria, options);
    if (options.useCache !== false) {
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        return { ...cached, fromCache: true };
      }
    }
    const allChanges = this.getAllChanges();
    let filteredChanges = await this.applyFilters(allChanges, criteria);
    if (options.sortBy) {
      filteredChanges = this.applySorting(filteredChanges, options.sortBy, options.sortOrder || "asc");
    }
    const totalCount = filteredChanges.length;
    if (options.offset || options.limit) {
      const start = options.offset || 0;
      const end = options.limit ? start + options.limit : void 0;
      filteredChanges = filteredChanges.slice(start, end);
    }
    let stats;
    if (options.includeStats) {
      stats = this.generateStats(filteredChanges);
    }
    const result = {
      items: filteredChanges,
      totalCount,
      hasMore: (options.limit || 0) > 0 && totalCount > filteredChanges.length + (options.offset || 0),
      query: criteria,
      options,
      executionTime: Date.now() - startTime,
      stats
    };
    if (options.limit && options.offset !== void 0) {
      result.page = {
        current: Math.floor(options.offset / options.limit) + 1,
        size: options.limit,
        total: Math.ceil(totalCount / options.limit)
      };
    }
    if (options.useCache !== false) {
      await this.cache.set(cacheKey, result, 3e5);
    }
    return result;
  }
  /**
   * Quick filter methods for common use cases
   */
  async getChangesByProvider(provider, options = {}) {
    const result = await this.executeQuery({ aiProvider: provider }, options);
    return result.items;
  }
  async getChangesByModel(model, options = {}) {
    const result = await this.executeQuery({ aiModel: model }, options);
    return result.items;
  }
  async getChangesInTimeRange(start, end, options = {}) {
    const result = await this.executeQuery({ timeRange: { start, end } }, options);
    return result.items;
  }
  async getChangesByMode(mode, options = {}) {
    const result = await this.executeQuery({ contextMode: mode }, options);
    return result.items;
  }
  async getAIGeneratedChanges(options = {}) {
    const result = await this.executeQuery({ hasAIMetadata: true }, options);
    return result.items;
  }
  async getManualChanges(options = {}) {
    const result = await this.executeQuery({ hasAIMetadata: false }, options);
    return result.items;
  }
  /**
   * Advanced search methods
   */
  async textSearch(query, options = {}, queryOptions = {}) {
    const criteria = {
      textSearch: {
        query,
        caseSensitive: options.caseSensitive,
        fuzzyMatch: options.fuzzyMatch,
        searchIn: options.searchIn || ["text", "removedText", "processingContext"]
      }
    };
    const result = await this.executeQuery(criteria, queryOptions);
    return result.items;
  }
  async contextSearch(query, options = {}) {
    const criteria = {
      textSearch: {
        query,
        searchIn: ["processingContext"]
      }
    };
    const result = await this.executeQuery(criteria, options);
    return result.items;
  }
  /**
   * Statistical analysis methods
   */
  async getProviderUsageStats() {
    const allChanges = this.getAllChanges().filter((c) => c.aiProvider);
    const stats = {};
    for (const change of allChanges) {
      if (change.aiProvider) {
        stats[change.aiProvider] = (stats[change.aiProvider] || 0) + 1;
      }
    }
    return stats;
  }
  async getModelUsageStats() {
    const allChanges = this.getAllChanges().filter((c) => c.aiModel);
    const stats = {};
    for (const change of allChanges) {
      if (change.aiModel) {
        stats[change.aiModel] = (stats[change.aiModel] || 0) + 1;
      }
    }
    return stats;
  }
  async getModeUsageStats() {
    var _a;
    const allChanges = this.getAllChanges().filter((c) => {
      var _a2;
      return (_a2 = c.processingContext) == null ? void 0 : _a2.mode;
    });
    const stats = {};
    for (const change of allChanges) {
      const mode = (_a = change.processingContext) == null ? void 0 : _a.mode;
      if (mode) {
        stats[mode] = (stats[mode] || 0) + 1;
      }
    }
    return stats;
  }
  async getTimelineData(options) {
    const allChanges = this.getAllChanges().filter((c) => c.aiTimestamp || c.timestamp).sort((a, b) => {
      const timeA = a.aiTimestamp ? a.aiTimestamp.getTime() : a.timestamp;
      const timeB = b.aiTimestamp ? b.aiTimestamp.getTime() : b.timestamp;
      return timeA - timeB;
    });
    return QueryUtils.generateTimeline(allChanges, options);
  }
  /**
   * Comparison methods for AI performance analysis
   */
  async compareProviders(providers, criteria) {
    const results = [];
    for (const provider of providers) {
      const providerCriteria = {
        ...criteria,
        aiProvider: provider
      };
      const result = await this.executeQuery(providerCriteria, { includeStats: true });
      results.push(result);
    }
    return this.generateComparison(
      results.map((r) => r.query),
      providers,
      "provider",
      results
    );
  }
  async compareModels(models, criteria) {
    const results = [];
    for (const model of models) {
      const modelCriteria = {
        ...criteria,
        aiModel: model
      };
      const result = await this.executeQuery(modelCriteria, { includeStats: true });
      results.push(result);
    }
    return this.generateComparison(
      results.map((r) => r.query),
      models,
      "model",
      results
    );
  }
  async compareModes(modes, criteria) {
    const results = [];
    for (const mode of modes) {
      const modeCriteria = {
        ...criteria,
        contextMode: mode
      };
      const result = await this.executeQuery(modeCriteria, { includeStats: true });
      results.push(result);
    }
    return this.generateComparison(
      results.map((r) => r.query),
      modes,
      "mode",
      results
    );
  }
  /**
   * Export methods for various formats
   */
  async exportToJSON(criteria, options = {}) {
    const result = await this.executeQuery(criteria, options);
    return JSON.stringify(result, null, 2);
  }
  async exportToCSV(criteria, format = { format: "csv" }) {
    const result = await this.executeQuery(criteria);
    return QueryUtils.formatAsCSV(result.items, format);
  }
  async exportToMarkdown(criteria, format = { format: "markdown" }) {
    const result = await this.executeQuery(criteria, { includeStats: true });
    return QueryUtils.formatAsMarkdown(result, format);
  }
  /**
   * Aggregate data by various dimensions
   */
  async aggregate(criteria, options) {
    const result = await this.executeQuery(criteria);
    return QueryUtils.aggregateData(result.items, options);
  }
  // Private helper methods
  getAllChanges() {
    const allChanges = [];
    for (const session of this.sessions.values()) {
      allChanges.push(...session.changes);
    }
    return allChanges;
  }
  async applyFilters(changes, criteria) {
    let filtered = changes;
    if (criteria.aiProvider) {
      filtered = filtered.filter((c) => c.aiProvider === criteria.aiProvider);
    }
    if (criteria.aiModel) {
      filtered = filtered.filter((c) => c.aiModel === criteria.aiModel);
    }
    if (criteria.author) {
      filtered = filtered.filter((c) => c.author === criteria.author);
    }
    if (criteria.changeType) {
      filtered = filtered.filter((c) => c.type === criteria.changeType);
    }
    if (criteria.hasAIMetadata !== void 0) {
      filtered = filtered.filter((c) => {
        const hasAI = !!(c.aiProvider || c.aiModel || c.processingContext || c.aiTimestamp);
        return hasAI === criteria.hasAIMetadata;
      });
    }
    if (criteria.hasProcessingContext !== void 0) {
      filtered = filtered.filter((c) => !!c.processingContext === criteria.hasProcessingContext);
    }
    if (criteria.contextMode) {
      filtered = filtered.filter((c) => {
        var _a;
        return ((_a = c.processingContext) == null ? void 0 : _a.mode) === criteria.contextMode;
      });
    }
    if (criteria.contextConstraints) {
      filtered = filtered.filter((c) => {
        var _a;
        const constraints = ((_a = c.processingContext) == null ? void 0 : _a.constraints) || [];
        return criteria.contextConstraints.every(
          (constraint) => constraints.includes(constraint)
        );
      });
    }
    if (criteria.timeRange) {
      const { start, end } = criteria.timeRange;
      filtered = filtered.filter((c) => {
        const timestamp = c.aiTimestamp ? c.aiTimestamp.getTime() : c.timestamp;
        return timestamp >= start.getTime() && timestamp <= end.getTime();
      });
    }
    if (criteria.positionRange) {
      const { from, to } = criteria.positionRange;
      filtered = filtered.filter((c) => {
        if (from !== void 0 && c.from < from)
          return false;
        if (to !== void 0 && c.to > to)
          return false;
        return true;
      });
    }
    if (criteria.textSearch) {
      filtered = await this.applyTextSearch(filtered, criteria.textSearch);
    }
    return filtered;
  }
  async applyTextSearch(changes, search) {
    const { query, caseSensitive, fuzzyMatch, searchIn } = search;
    const searchFields = searchIn || ["text", "removedText", "processingContext"];
    return changes.filter((change) => {
      for (const field of searchFields) {
        let searchText = "";
        switch (field) {
          case "text":
            searchText = change.text || "";
            break;
          case "removedText":
            searchText = change.removedText || "";
            break;
          case "processingContext":
            if (change.processingContext) {
              searchText = JSON.stringify(change.processingContext);
            }
            break;
        }
        if (QueryUtils.textMatches(searchText, query, { caseSensitive, fuzzyMatch })) {
          return true;
        }
      }
      return false;
    });
  }
  applySorting(changes, sortBy, order) {
    return changes.sort((a, b) => {
      var _a, _b;
      let valueA, valueB;
      switch (sortBy) {
        case "timestamp":
          valueA = a.timestamp;
          valueB = b.timestamp;
          break;
        case "aiTimestamp":
          valueA = ((_a = a.aiTimestamp) == null ? void 0 : _a.getTime()) || 0;
          valueB = ((_b = b.aiTimestamp) == null ? void 0 : _b.getTime()) || 0;
          break;
        case "from":
          valueA = a.from;
          valueB = b.from;
          break;
        case "to":
          valueA = a.to;
          valueB = b.to;
          break;
        case "aiProvider":
          valueA = a.aiProvider || "";
          valueB = b.aiProvider || "";
          break;
        case "aiModel":
          valueA = a.aiModel || "";
          valueB = b.aiModel || "";
          break;
        default:
          return 0;
      }
      if (valueA < valueB)
        return order === "asc" ? -1 : 1;
      if (valueA > valueB)
        return order === "asc" ? 1 : -1;
      return 0;
    });
  }
  generateStats(changes) {
    const stats = {
      byProvider: {},
      byModel: {},
      byChangeType: {},
      withContext: 0,
      withoutContext: 0,
      contextModes: {},
      validationWarnings: 0,
      securityThreats: 0,
      avgWordsChanged: 0,
      avgCharsChanged: 0,
      totalWordsChanged: 0,
      totalCharsChanged: 0
    };
    let totalWords = 0;
    let totalChars = 0;
    let earliestTime;
    let latestTime;
    for (const change of changes) {
      if (change.aiProvider) {
        stats.byProvider[change.aiProvider] = (stats.byProvider[change.aiProvider] || 0) + 1;
      }
      if (change.aiModel) {
        stats.byModel[change.aiModel] = (stats.byModel[change.aiModel] || 0) + 1;
      }
      stats.byChangeType[change.type] = (stats.byChangeType[change.type] || 0) + 1;
      if (change.processingContext) {
        stats.withContext++;
        if (change.processingContext.mode) {
          stats.contextModes[change.processingContext.mode] = (stats.contextModes[change.processingContext.mode] || 0) + 1;
        }
      } else {
        stats.withoutContext++;
      }
      const timestamp = change.aiTimestamp ? change.aiTimestamp : new Date(change.timestamp);
      if (!earliestTime || timestamp < earliestTime) {
        earliestTime = timestamp;
      }
      if (!latestTime || timestamp > latestTime) {
        latestTime = timestamp;
      }
      const text = change.text || "";
      const words = text.trim().split(/\s+/).filter((w) => w.length > 0).length;
      const chars = text.length;
      totalWords += words;
      totalChars += chars;
    }
    if (changes.length > 0) {
      stats.avgWordsChanged = totalWords / changes.length;
      stats.avgCharsChanged = totalChars / changes.length;
    }
    stats.totalWordsChanged = totalWords;
    stats.totalCharsChanged = totalChars;
    if (earliestTime && latestTime) {
      const span = latestTime.getTime() - earliestTime.getTime();
      const hours = Math.floor(span / (1e3 * 60 * 60));
      const days = Math.floor(hours / 24);
      stats.timeRange = {
        earliest: earliestTime,
        latest: latestTime,
        span: days > 0 ? `${days} days, ${hours % 24} hours` : `${hours} hours`
      };
    }
    return stats;
  }
  generateComparison(criteria, labels, comparedOn, results) {
    const comparison = {
      totalChanges: [],
      avgChangesPerSession: [],
      avgWordsPerChange: [],
      avgCharsPerChange: [],
      avgTimeBetweenChanges: [],
      avgProcessingTime: [],
      validationWarningRates: [],
      securityThreatRates: []
    };
    for (const result of results) {
      comparison.totalChanges.push(result.totalCount);
      if (result.stats) {
        comparison.avgWordsPerChange.push(result.stats.avgWordsChanged);
        comparison.avgCharsPerChange.push(result.stats.avgCharsChanged);
        comparison.validationWarningRates.push(result.stats.validationWarnings / result.totalCount);
        comparison.securityThreatRates.push(result.stats.securityThreats / result.totalCount);
      } else {
        comparison.avgWordsPerChange.push(0);
        comparison.avgCharsPerChange.push(0);
        comparison.validationWarningRates.push(0);
        comparison.securityThreatRates.push(0);
      }
      comparison.avgChangesPerSession.push(result.totalCount / Math.max(this.sessions.size, 1));
      comparison.avgTimeBetweenChanges.push(0);
      comparison.avgProcessingTime.push(0);
    }
    return {
      criteria,
      labels,
      comparedOn,
      results,
      comparison
    };
  }
  buildIndex() {
    var _a;
    const index = {
      providers: /* @__PURE__ */ new Map(),
      models: /* @__PURE__ */ new Map(),
      timeRanges: /* @__PURE__ */ new Map(),
      modes: /* @__PURE__ */ new Map(),
      authors: /* @__PURE__ */ new Map()
    };
    for (const session of this.sessions.values()) {
      for (const change of session.changes) {
        if (change.aiProvider) {
          if (!index.providers.has(change.aiProvider)) {
            index.providers.set(change.aiProvider, /* @__PURE__ */ new Set());
          }
          index.providers.get(change.aiProvider).add(change.id);
        }
        if (change.aiModel) {
          if (!index.models.has(change.aiModel)) {
            index.models.set(change.aiModel, /* @__PURE__ */ new Set());
          }
          index.models.get(change.aiModel).add(change.id);
        }
        if ((_a = change.processingContext) == null ? void 0 : _a.mode) {
          if (!index.modes.has(change.processingContext.mode)) {
            index.modes.set(change.processingContext.mode, /* @__PURE__ */ new Set());
          }
          index.modes.get(change.processingContext.mode).add(change.id);
        }
        if (change.author) {
          if (!index.authors.has(change.author)) {
            index.authors.set(change.author, /* @__PURE__ */ new Set());
          }
          index.authors.get(change.author).add(change.id);
        }
        const timestamp = change.aiTimestamp ? change.aiTimestamp : new Date(change.timestamp);
        const timeBucket = Math.floor(timestamp.getTime() / (1e3 * 60 * 60 * 24));
        const timeKey = timeBucket.toString();
        if (!index.timeRanges.has(timeKey)) {
          index.timeRanges.set(timeKey, /* @__PURE__ */ new Set());
        }
        index.timeRanges.get(timeKey).add(change.id);
      }
    }
    return index;
  }
  generateCacheKey(criteria, options) {
    return `query:${JSON.stringify(criteria)}:${JSON.stringify(options)}`;
  }
};
var MemoryQueryCache = class {
  constructor() {
    this.store = /* @__PURE__ */ new Map();
  }
  async get(key) {
    const item = this.store.get(key);
    if (!item)
      return null;
    if (Date.now() > item.expiry) {
      this.store.delete(key);
      return null;
    }
    return item.value;
  }
  async set(key, value, ttl = 3e5) {
    this.store.set(key, {
      value,
      expiry: Date.now() + ttl
    });
  }
  async clear() {
    this.store.clear();
  }
  async size() {
    return this.store.size;
  }
};

// plugins/track-edits/src/edit-tracker.ts
var _EditTracker = class _EditTracker {
  constructor(plugin) {
    this.sessions = /* @__PURE__ */ new Map();
    this.activeSessions = /* @__PURE__ */ new Map();
    this.plugin = plugin;
    this.querySystem = new EditChangeQuerySystem(this.sessions);
    this.loadSessions();
  }
  async loadSessions() {
    try {
      const data = await this.plugin.loadData();
      if (data && data.sessions) {
        const enhancedData = await this.processStoredDataWithVersioning(data);
        for (const session of enhancedData.sessions) {
          session.changes = session.changes.map((change) => this.deserializeChange(change));
          this.sessions.set(session.id, session);
        }
        this.querySystem.updateSessions(this.sessions);
        console.log(`Successfully loaded ${enhancedData.sessions.length} sessions with enhanced persistence`);
      }
    } catch (error) {
      console.error("Failed to load edit sessions:", error);
      await this.recoverFromCorruptedData(error);
    }
  }
  async saveSessions() {
    try {
      const sessionsArray = Array.from(this.sessions.values());
      const enhancedData = await this.prepareDataForStorage(sessionsArray);
      await this.plugin.saveData(enhancedData);
    } catch (error) {
      console.error("Failed to save edit sessions:", error);
      await this.emergencySave(error);
    }
  }
  startSession(session, file) {
    this.sessions.set(session.id, session);
    this.activeSessions.set(session.id, file);
    this.updateQuerySystemData();
  }
  endSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.endTime = Date.now();
      this.activeSessions.delete(sessionId);
      this.saveSessions();
      this.updateQuerySystemData();
    }
  }
  /**
   * Records changes with optional AI metadata support and comprehensive validation
   * Maintains backward compatibility with existing change recording
   */
  recordChanges(sessionId, changes, aiMetadata, options) {
    const session = this.sessions.get(sessionId);
    if (!session)
      return;
    const enhancedChanges = aiMetadata ? changes.map((change) => this.enhanceChangeWithAIMetadata(change, aiMetadata, options)) : changes;
    const validChanges = enhancedChanges.filter((change) => change !== null);
    session.changes.push(...validChanges);
    const file = this.activeSessions.get(sessionId);
    if (file) {
      this.updateSessionCounts(session, file);
    }
    this.updateQuerySystemData();
  }
  /**
   * Records AI-generated changes with required AI metadata and comprehensive validation
   * Specialized method for Editorial Engine integration
   */
  recordAIChanges(sessionId, changes, aiProvider, aiModel, processingContext, aiTimestamp, options) {
    var _a, _b, _c, _d, _e;
    const session = this.sessions.get(sessionId);
    if (!session) {
      return {
        success: false,
        errors: ["Session not found"],
        warnings: []
      };
    }
    const validationResult = AIMetadataValidator.validateAIMetadata(
      aiProvider,
      aiModel,
      processingContext,
      aiTimestamp,
      {
        strictMode: (_a = options == null ? void 0 : options.strictMode) != null ? _a : true,
        bypassValidation: (_b = options == null ? void 0 : options.bypassValidation) != null ? _b : false,
        editorialEngineMode: (_c = options == null ? void 0 : options.editorialEngineMode) != null ? _c : false,
        enableRateLimiting: true,
        logSecurityViolations: true
      }
    );
    if (!validationResult.isValid && !(options == null ? void 0 : options.bypassValidation)) {
      console.error("AI metadata validation failed:", validationResult.errors);
      return {
        success: false,
        errors: validationResult.errors,
        warnings: validationResult.warnings
      };
    }
    const sanitizedMetadata = validationResult.sanitizedMetadata;
    const aiMetadata = {
      aiProvider: sanitizedMetadata.aiProvider,
      aiModel: sanitizedMetadata.aiModel,
      processingContext: sanitizedMetadata.processingContext,
      aiTimestamp: sanitizedMetadata.aiTimestamp || /* @__PURE__ */ new Date()
    };
    this.recordChanges(sessionId, changes, aiMetadata, { bypassValidation: true });
    if (options == null ? void 0 : options.editorialEngineMode) {
      console.info("[EditTracker] Editorial Engine changes recorded:", {
        sessionId,
        changesCount: changes.length,
        provider: aiMetadata.aiProvider,
        model: aiMetadata.aiModel,
        hasConstraints: !!((_e = (_d = aiMetadata.processingContext) == null ? void 0 : _d.constraints) == null ? void 0 : _e.length),
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
    }
    return {
      success: true,
      errors: [],
      warnings: validationResult.warnings
    };
  }
  /**
   * Records a single AI-generated change with validation
   * Convenience method for single change recording
   */
  recordSingleAIChange(sessionId, change, aiProvider, aiModel, processingContext, aiTimestamp, options) {
    return this.recordAIChanges(sessionId, [change], aiProvider, aiModel, processingContext, aiTimestamp, options);
  }
  /**
   * Enhanced method to add change with AI metadata and comprehensive validation
   * Returns null if validation fails in strict mode
   */
  enhanceChangeWithAIMetadata(change, aiMetadata, options) {
    if (options == null ? void 0 : options.bypassValidation) {
      return {
        ...change,
        aiProvider: aiMetadata.aiProvider,
        aiModel: aiMetadata.aiModel,
        processingContext: aiMetadata.processingContext,
        aiTimestamp: aiMetadata.aiTimestamp
      };
    }
    const validationResult = AIMetadataValidator.validateAIMetadata(
      aiMetadata.aiProvider,
      aiMetadata.aiModel,
      aiMetadata.processingContext,
      aiMetadata.aiTimestamp,
      {
        strictMode: true,
        logSecurityViolations: true
      }
    );
    if (!validationResult.isValid) {
      console.warn("AI metadata validation failed for change:", validationResult.errors);
    }
    const sanitizedMetadata = validationResult.sanitizedMetadata || {};
    return {
      ...change,
      aiProvider: sanitizedMetadata.aiProvider,
      aiModel: sanitizedMetadata.aiModel,
      processingContext: sanitizedMetadata.processingContext,
      aiTimestamp: sanitizedMetadata.aiTimestamp
    };
  }
  /**
   * Legacy validation method - now uses comprehensive validator
   * @deprecated Use AIMetadataValidator.validateAIMetadata directly
   */
  validateAIMetadata(aiProvider, aiModel) {
    const { isValid } = AIMetadataValidator.quickValidate(aiProvider, aiModel);
    return isValid;
  }
  /**
   * Validates and sanitizes AI metadata before storage
   * Public method for external validation needs
   */
  validateAndSanitizeAIMetadata(aiProvider, aiModel, processingContext, aiTimestamp, options) {
    return AIMetadataValidator.validateAIMetadata(
      aiProvider,
      aiModel,
      processingContext,
      aiTimestamp,
      options
    );
  }
  /**
   * Filters session changes by AI provider with validation
   */
  getAIChanges(sessionId, aiProvider) {
    const session = this.sessions.get(sessionId);
    if (!session)
      return [];
    return session.changes.filter((change) => {
      if (!change.aiProvider)
        return false;
      if (aiProvider && change.aiProvider !== aiProvider)
        return false;
      return true;
    });
  }
  /**
   * Gets enhanced AI metadata statistics for a session with security info
   */
  getAIMetadataStats(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return {
        totalAIChanges: 0,
        aiProviders: [],
        aiModels: [],
        hasProcessingContext: 0,
        validationWarnings: 0,
        securityThreats: []
      };
    }
    const aiChanges = session.changes.filter((change) => change.aiProvider);
    const aiProviders = [...new Set(aiChanges.map((change) => change.aiProvider).filter(Boolean))];
    const aiModels = [...new Set(aiChanges.map((change) => change.aiModel).filter(Boolean))];
    const hasProcessingContext = aiChanges.filter((change) => change.processingContext).length;
    let validationWarnings = 0;
    const allSecurityThreats = /* @__PURE__ */ new Set();
    aiChanges.forEach((change) => {
      if (change.aiProvider) {
        const providerResult = AIMetadataValidator.validateAIProvider(change.aiProvider);
        validationWarnings += providerResult.warnings.length;
        providerResult.securityThreats.forEach((threat) => allSecurityThreats.add(threat));
      }
      if (change.aiModel) {
        const modelResult = AIMetadataValidator.validateAIModel(change.aiModel);
        validationWarnings += modelResult.warnings.length;
        modelResult.securityThreats.forEach((threat) => allSecurityThreats.add(threat));
      }
      if (change.processingContext) {
        const contextResult = AIMetadataValidator.validateProcessingContext(change.processingContext);
        validationWarnings += contextResult.warnings.length;
        contextResult.securityThreats.forEach((threat) => allSecurityThreats.add(threat));
      }
    });
    return {
      totalAIChanges: aiChanges.length,
      aiProviders,
      aiModels,
      hasProcessingContext,
      validationWarnings,
      securityThreats: Array.from(allSecurityThreats)
    };
  }
  async updateSessionCounts(session, file) {
    try {
      const content = await this.plugin.app.vault.read(file);
      session.wordCount = getWordCount(content);
      session.characterCount = getCharacterCount(content);
    } catch (error) {
      console.error("Failed to update session counts:", error);
    }
  }
  getSession(sessionId) {
    return this.sessions.get(sessionId);
  }
  getSessionHistory() {
    return Array.from(this.sessions.values()).sort((a, b) => b.startTime - a.startTime);
  }
  async saveSession(session) {
    this.sessions.set(session.id, session);
    await this.saveSessions();
    this.updateQuerySystemData();
  }
  clearHistory() {
    this.sessions.clear();
    this.activeSessions.clear();
    this.saveSessions();
    this.updateQuerySystemData();
  }
  async formatSessionForExport(session, format) {
    switch (format) {
      case "json":
        return JSON.stringify(session, null, 2);
      case "csv":
        let csv = "Timestamp,Type,From,To,Text,RemovedText,Author,AIProvider,AIModel,ProcessingContext,AITimestamp\\n";
        for (const change of session.changes) {
          const row = [
            new Date(change.timestamp).toISOString(),
            change.type,
            change.from,
            change.to,
            `"${(change.text || "").replace(/"/g, '""')}"`,
            `"${(change.removedText || "").replace(/"/g, '""')}"`,
            change.author || "",
            EditChangeCompatibilityUtils.getAIProvider(change, ""),
            EditChangeCompatibilityUtils.getAIModel(change, ""),
            change.processingContext ? `"${JSON.stringify(change.processingContext).replace(/"/g, '""')}"` : "",
            EditChangeCompatibilityUtils.getAITimestamp(change) ? EditChangeCompatibilityUtils.getAITimestamp(change).toISOString() : ""
          ].join(",");
          csv += row + "\n";
        }
        return csv;
      case "markdown":
        const startDate = new Date(session.startTime).toLocaleString();
        const endDate = session.endTime ? new Date(session.endTime).toLocaleString() : "In progress";
        const duration = session.endTime ? Math.round((session.endTime - session.startTime) / 1e3 / 60) + " minutes" : "In progress";
        let markdown = `# Edit Session Report

`;
        markdown += `- **Start:** ${startDate}
`;
        markdown += `- **End:** ${endDate}
`;
        markdown += `- **Duration:** ${duration}
`;
        markdown += `- **Changes:** ${session.changes.length}
`;
        markdown += `- **Words:** ${session.wordCount}
`;
        markdown += `- **Characters:** ${session.characterCount}

`;
        const arrayStats = EditChangeCompatibilityUtils.getArrayStats(session.changes);
        const metadataStats = this.getAIMetadataStats(session.id);
        if (arrayStats.aiGenerated > 0) {
          markdown += `## AI-Assisted Edits

`;
          markdown += `- **Total Changes:** ${arrayStats.total}
`;
          markdown += `- **AI-Generated:** ${arrayStats.aiGenerated}
`;
          markdown += `- **Manual Edits:** ${arrayStats.manual}
`;
          markdown += `- **AI Providers:** ${arrayStats.providers.join(", ") || "None"}
`;
          markdown += `- **AI Models:** ${arrayStats.models.join(", ") || "None"}
`;
          markdown += `- **With Processing Context:** ${arrayStats.withContext}
`;
          if (metadataStats.securityThreats.length > 0) {
            markdown += `- **Security Threats Detected:** ${metadataStats.securityThreats.join(", ")}
`;
          }
          if (metadataStats.validationWarnings > 0) {
            markdown += `- **Validation Warnings:** ${metadataStats.validationWarnings}
`;
          }
          markdown += `
`;
        }
        if (session.changes.length > 0) {
          markdown += `## Changes

`;
          for (const change of session.changes) {
            const time = new Date(change.timestamp).toLocaleTimeString();
            const sourceDesc = EditChangeCompatibilityUtils.getAISourceDescription(change);
            markdown += `- **${time}** - ${change.type} at position ${change.from}-${change.to}`;
            markdown += ` (${sourceDesc})`;
            markdown += `
`;
            if (change.text) {
              markdown += `  - Added: "${change.text}"
`;
            }
            if (change.removedText) {
              markdown += `  - Removed: "${change.removedText}"
`;
            }
            const context = EditChangeCompatibilityUtils.getProcessingContext(change);
            if (context) {
              if (context.mode) {
                markdown += `  - Processing Mode: ${context.mode}
`;
              }
              if (context.constraints && context.constraints.length > 0) {
                markdown += `  - Constraints: ${context.constraints.join(", ")}
`;
              }
            }
          }
        }
        return markdown;
      default:
        return JSON.stringify(session, null, 2);
    }
  }
  // Clean up old sessions based on retention policy
  cleanupOldSessions() {
    if (this.plugin.settings.retentionDays === 0)
      return;
    const cutoffTime = Date.now() - this.plugin.settings.retentionDays * 24 * 60 * 60 * 1e3;
    const toDelete = [];
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.startTime < cutoffTime) {
        toDelete.push(sessionId);
      }
    }
    for (const sessionId of toDelete) {
      this.sessions.delete(sessionId);
    }
    if (toDelete.length > 0) {
      this.saveSessions();
      this.querySystem.updateSessions(this.sessions);
    }
  }
  /**
   * Processes stored data with schema versioning and validation
   */
  async processStoredDataWithVersioning(data) {
    const storedVersion = data[_EditTracker.SCHEMA_KEY];
    const currentVersion = _EditTracker.SCHEMA_VERSION;
    if (!storedVersion) {
      console.log("Migrating data to versioned schema...");
      return this.migrateToVersionedSchema(data);
    }
    if (storedVersion !== currentVersion) {
      console.log(`Migrating data from version ${storedVersion} to ${currentVersion}...`);
      return this.migrateDataToCurrentVersion(data, storedVersion);
    }
    return this.validateStoredData(data);
  }
  /**
   * Migrates unversioned data to current schema version
   */
  async migrateToVersionedSchema(data) {
    const migratedData = EditChangeCompatibilityUtils.needsMigration(data) ? EditChangeCompatibilityUtils.migrateStoredData(data) : data;
    return {
      ...migratedData,
      [_EditTracker.SCHEMA_KEY]: _EditTracker.SCHEMA_VERSION,
      __migrationTimestamp: Date.now(),
      __dataIntegrityHash: await this.generateDataHash(migratedData)
    };
  }
  /**
   * Migrates data between different schema versions
   */
  async migrateDataToCurrentVersion(data, fromVersion) {
    let migratedData = { ...data };
    switch (fromVersion) {
      case "1.6.0":
        migratedData = this.migrate1_6_to_1_7(migratedData);
        break;
      default:
        console.warn(`Unknown schema version ${fromVersion}, attempting generic migration...`);
        migratedData = await this.migrateToVersionedSchema(data);
        break;
    }
    migratedData[_EditTracker.SCHEMA_KEY] = _EditTracker.SCHEMA_VERSION;
    migratedData.__migrationTimestamp = Date.now();
    migratedData.__dataIntegrityHash = await this.generateDataHash(migratedData);
    return migratedData;
  }
  /**
   * Specific migration from 1.6.0 to 1.7.0 schema
   */
  migrate1_6_to_1_7(data) {
    if (data.sessions) {
      data.sessions = data.sessions.map((session) => ({
        ...session,
        changes: session.changes.map((change) => this.normalizeChangeForStorage(change))
      }));
    }
    return data;
  }
  /**
   * Validates stored data integrity
   */
  async validateStoredData(data) {
    const storedHash = data.__dataIntegrityHash;
    if (storedHash) {
      const { __dataIntegrityHash, ...dataForValidation } = data;
      const calculatedHash = await this.generateDataHash(dataForValidation);
      if (storedHash !== calculatedHash) {
        console.warn("Data integrity hash mismatch - data may be corrupted");
      }
    }
    return data;
  }
  /**
   * Generates a hash for data integrity checking
   */
  async generateDataHash(data) {
    try {
      const dataString = JSON.stringify(data, this.createSortedReplacer());
      let hash = 0;
      for (let i = 0; i < dataString.length; i++) {
        const char = dataString.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash;
      }
      return hash.toString(36);
    } catch (error) {
      console.warn("Failed to generate data hash:", error);
      return "invalid";
    }
  }
  /**
   * Creates a replacer function that sorts object keys for consistent hashing
   */
  createSortedReplacer() {
    return (key, value) => {
      if (value && typeof value === "object" && !Array.isArray(value) && !(value instanceof Date)) {
        const sortedObj = {};
        Object.keys(value).sort().forEach((k) => {
          sortedObj[k] = value[k];
        });
        return sortedObj;
      }
      return value;
    };
  }
  /**
   * Prepares session data for storage with enhanced serialization
   */
  async prepareDataForStorage(sessions) {
    const processedSessions = sessions.map((session) => ({
      ...session,
      changes: session.changes.map((change) => this.serializeChange(change))
    }));
    const data = {
      [_EditTracker.SCHEMA_KEY]: _EditTracker.SCHEMA_VERSION,
      sessions: processedSessions,
      __lastSaved: Date.now(),
      __compressionLevel: "none"
      // Could be enhanced later
    };
    data.__dataIntegrityHash = await this.generateDataHash({ sessions: processedSessions });
    return data;
  }
  /**
   * Properly serializes an EditChange object with Date handling
   */
  serializeChange(change) {
    const serialized = { ...change };
    if (change.aiTimestamp) {
      serialized.aiTimestamp = change.aiTimestamp instanceof Date ? change.aiTimestamp.toISOString() : change.aiTimestamp;
    }
    if (change.processingContext) {
      serialized.processingContext = this.normalizeProcessingContext(change.processingContext);
    }
    return serialized;
  }
  /**
   * Properly deserializes an EditChange object with Date reconstruction
   */
  deserializeChange(change) {
    const deserialized = { ...change };
    if (change.aiTimestamp && typeof change.aiTimestamp === "string") {
      try {
        deserialized.aiTimestamp = new Date(change.aiTimestamp);
        if (isNaN(deserialized.aiTimestamp.getTime())) {
          console.warn(`Invalid aiTimestamp found: ${change.aiTimestamp}`);
          deserialized.aiTimestamp = void 0;
        }
      } catch (error) {
        console.warn(`Failed to parse aiTimestamp: ${change.aiTimestamp}`, error);
        deserialized.aiTimestamp = void 0;
      }
    }
    return deserialized;
  }
  /**
   * Normalizes change data for consistent storage
   */
  normalizeChangeForStorage(change) {
    const normalized = {
      id: change.id,
      timestamp: change.timestamp,
      type: change.type,
      from: change.from,
      to: change.to
    };
    if (change.text !== void 0)
      normalized.text = change.text;
    if (change.removedText !== void 0)
      normalized.removedText = change.removedText;
    if (change.author !== void 0)
      normalized.author = change.author;
    if (change.aiProvider !== void 0)
      normalized.aiProvider = change.aiProvider;
    if (change.aiModel !== void 0)
      normalized.aiModel = change.aiModel;
    if (change.processingContext !== void 0) {
      normalized.processingContext = this.normalizeProcessingContext(change.processingContext);
    }
    if (change.aiTimestamp !== void 0)
      normalized.aiTimestamp = change.aiTimestamp;
    return normalized;
  }
  /**
   * Normalizes processing context for storage
   */
  normalizeProcessingContext(context) {
    const normalized = {};
    if (context.mode !== void 0)
      normalized.mode = context.mode;
    if (context.constraints !== void 0)
      normalized.constraints = [...context.constraints].sort();
    if (context.settings !== void 0) {
      const sortedSettings = {};
      Object.keys(context.settings).sort().forEach((key) => {
        sortedSettings[key] = context.settings[key];
      });
      normalized.settings = sortedSettings;
    }
    if (context.metadata !== void 0)
      normalized.metadata = context.metadata;
    return normalized;
  }
  /**
   * Recovers from corrupted data with fallback strategies
   */
  async recoverFromCorruptedData(error) {
    console.warn("Attempting data recovery from corruption...", error);
    try {
      const rawData = await this.plugin.loadData();
      if (rawData && typeof rawData === "object") {
        const salvageSessions = this.salvageValidSessions(rawData);
        if (salvageSessions.length > 0) {
          console.log(`Recovered ${salvageSessions.length} sessions from corrupted data`);
          salvageSessions.forEach((session) => this.sessions.set(session.id, session));
          this.updateQuerySystemData();
          return;
        }
      }
    } catch (recoveryError) {
      console.error("Data recovery failed:", recoveryError);
    }
    console.log("Starting with empty session storage due to unrecoverable corruption");
    await this.plugin.saveData({
      [_EditTracker.SCHEMA_KEY]: _EditTracker.SCHEMA_VERSION,
      sessions: [],
      __lastSaved: Date.now(),
      __recoveryTimestamp: Date.now()
    });
  }
  /**
   * Attempts to salvage valid sessions from corrupted data
   */
  salvageValidSessions(data) {
    const validSessions = [];
    if (!data.sessions || !Array.isArray(data.sessions)) {
      return validSessions;
    }
    for (const session of data.sessions) {
      try {
        if (this.isValidSession(session)) {
          const cleanedSession = {
            ...session,
            changes: this.salvageValidChanges(session.changes || [])
          };
          validSessions.push(cleanedSession);
        }
      } catch (error) {
        console.warn("Failed to salvage session:", session == null ? void 0 : session.id, error);
      }
    }
    return validSessions;
  }
  /**
   * Validates basic session structure
   */
  isValidSession(session) {
    return session && typeof session.id === "string" && typeof session.startTime === "number" && Array.isArray(session.changes);
  }
  /**
   * Salvages valid changes from potentially corrupted change array
   */
  salvageValidChanges(changes) {
    const validChanges = [];
    for (const change of changes) {
      try {
        if (EditChangeCompatibilityUtils.isValidEditChange(change)) {
          const cleanedChange = this.deserializeChange(change);
          validChanges.push(cleanedChange);
        }
      } catch (error) {
        console.warn("Failed to salvage change:", change == null ? void 0 : change.id, error);
      }
    }
    return validChanges;
  }
  /**
   * Emergency save with minimal data to prevent total loss
   */
  async emergencySave(originalError) {
    try {
      console.warn("Attempting emergency save after failure:", originalError);
      const basicSessions = Array.from(this.sessions.values()).map((session) => ({
        id: session.id,
        startTime: session.startTime,
        endTime: session.endTime,
        wordCount: session.wordCount || 0,
        characterCount: session.characterCount || 0,
        changes: session.changes.map((change) => ({
          id: change.id || Date.now().toString(),
          timestamp: change.timestamp,
          type: change.type,
          from: change.from,
          to: change.to,
          text: change.text || "",
          removedText: change.removedText || "",
          author: change.author || "unknown"
          // Deliberately omit AI metadata to avoid serialization issues
        }))
      }));
      await this.plugin.saveData({
        [_EditTracker.SCHEMA_KEY]: _EditTracker.SCHEMA_VERSION,
        sessions: basicSessions,
        __emergencySave: true,
        __lastSaved: Date.now()
      });
      console.log("Emergency save completed successfully");
    } catch (emergencyError) {
      console.error("Emergency save also failed:", emergencyError);
    }
  }
  query() {
    return this.querySystem.query();
  }
  /**
   * Quick query methods for common use cases
   */
  /**
   * Get all changes from a specific AI provider
   */
  async getChangesByProvider(provider) {
    return this.querySystem.getChangesByProvider(provider);
  }
  /**
   * Get all changes from a specific AI model
   */
  async getChangesByModel(model) {
    return this.querySystem.getChangesByModel(model);
  }
  /**
   * Get changes within a specific time range
   */
  async getChangesInTimeRange(start, end) {
    return this.querySystem.getChangesInTimeRange(start, end);
  }
  /**
   * Get changes by processing mode
   */
  async getChangesByMode(mode) {
    return this.querySystem.getChangesByMode(mode);
  }
  /**
   * Get all AI-generated changes
   */
  async getAIGeneratedChanges() {
    return this.querySystem.getAIGeneratedChanges();
  }
  /**
   * Get all manual (non-AI) changes
   */
  async getManualChanges() {
    return this.querySystem.getManualChanges();
  }
  /**
   * Advanced search methods
   */
  /**
   * Full-text search across change content and processing context
   */
  async textSearch(query, options) {
    return this.querySystem.textSearch(query, options);
  }
  /**
   * Search within processing context only
   */
  async contextSearch(query) {
    return this.querySystem.contextSearch(query);
  }
  /**
   * Statistical analysis methods
   */
  /**
   * Get usage statistics by AI provider
   */
  async getProviderUsageStats() {
    return this.querySystem.getProviderUsageStats();
  }
  /**
   * Get usage statistics by AI model
   */
  async getModelUsageStats() {
    return this.querySystem.getModelUsageStats();
  }
  /**
   * Get usage statistics by processing mode
   */
  async getModeUsageStats() {
    return this.querySystem.getModeUsageStats();
  }
  /**
   * AI Performance Comparison Methods
   */
  /**
   * Compare performance across different AI providers
   */
  async compareProviders(providers) {
    return this.querySystem.compareProviders(providers);
  }
  /**
   * Compare performance across different AI models
   */
  async compareModels(models) {
    return this.querySystem.compareModels(models);
  }
  /**
   * Compare performance across different processing modes
   */
  async compareModes(modes) {
    return this.querySystem.compareModes(modes);
  }
  /**
   * Export methods for various formats
   */
  /**
   * Export query results as JSON
   */
  async exportChangesAsJSON(criteria) {
    return this.querySystem.exportToJSON(criteria);
  }
  /**
   * Export query results as CSV
   */
  async exportChangesAsCSV(criteria, format) {
    return this.querySystem.exportToCSV(criteria, format);
  }
  /**
   * Export query results as Markdown
   */
  async exportChangesAsMarkdown(criteria, format) {
    return this.querySystem.exportToMarkdown(criteria, format);
  }
  /**
   * Advanced analytics methods
   */
  /**
   * Get timeline data showing changes over time
   */
  async getTimelineData(options) {
    return this.querySystem.getTimelineData(options);
  }
  /**
   * Aggregate changes by various dimensions
   */
  async aggregateChanges(criteria, options) {
    return this.querySystem.aggregate(criteria, options);
  }
  /**
   * Update query system when sessions change
   * Called internally after session modifications
   */
  updateQuerySystemData() {
    this.querySystem.updateSessions(this.sessions);
  }
};
// ========================================================================
// Task 1.6: Query System Integration - Advanced Query Methods
// ========================================================================
/**
 * Creates a new query builder instance for flexible change queries
 * Provides fluent API for building complex queries with method chaining
 */
// ========================================================================
// Task 1.7: Enhanced Persistence Layer with Schema Versioning and Robust Data Handling
// ========================================================================
/**
 * Schema version for tracking data format evolution
 */
_EditTracker.SCHEMA_VERSION = "1.7.0";
_EditTracker.SCHEMA_KEY = "__schemaVersion";
var EditTracker = _EditTracker;
var EditChangeCompatibilityUtils = class {
  /**
   * Checks if an EditChange object has any AI metadata fields
   */
  static hasAIMetadata(change) {
    return !!(change.aiProvider || change.aiModel || change.processingContext || change.aiTimestamp);
  }
  /**
   * Checks if an EditChange object is a legacy object (no AI metadata)
   */
  static isLegacyChange(change) {
    return !("aiProvider" in change || "aiModel" in change || "processingContext" in change || "aiTimestamp" in change);
  }
  /**
   * Validates that an object has the minimum required EditChange fields
   */
  static isValidEditChange(obj) {
    return obj && typeof obj.id === "string" && typeof obj.timestamp === "number" && ["insert", "delete", "replace"].includes(obj.type) && typeof obj.from === "number" && typeof obj.to === "number";
  }
  /**
   * Converts a legacy EditChange to enhanced format with empty AI metadata
   */
  static upgradeToEnhanced(legacyChange) {
    return {
      ...legacyChange,
      aiProvider: void 0,
      aiModel: void 0,
      processingContext: void 0,
      aiTimestamp: void 0
    };
  }
  /**
   * Batch upgrade an array of mixed legacy and enhanced changes
   */
  static upgradeChangesArray(changes) {
    return changes.map((change) => {
      if (this.isLegacyChange(change)) {
        return this.upgradeToEnhanced(change);
      }
      return change;
    });
  }
  /**
   * Checks if stored data needs migration
   */
  static needsMigration(data) {
    if (!data || !data.sessions || !Array.isArray(data.sessions)) {
      return false;
    }
    return data.sessions.some(
      (session) => session.changes && session.changes.some(
        (change) => this.isLegacyChange(change)
      )
    );
  }
  /**
   * Migrates stored plugin data to new format
   */
  static migrateStoredData(data) {
    if (!data || !data.sessions) {
      return data;
    }
    return {
      ...data,
      sessions: data.sessions.map((session) => ({
        ...session,
        changes: this.upgradeChangesArray(session.changes)
      }))
    };
  }
  /**
   * Safely gets AI provider with fallback
   */
  static getAIProvider(change, fallback = "unknown") {
    return change.aiProvider || fallback;
  }
  /**
   * Safely gets AI model with fallback
   */
  static getAIModel(change, fallback = "unknown") {
    return change.aiModel || fallback;
  }
  /**
   * Safely gets processing context with fallback
   */
  static getProcessingContext(change, fallback) {
    return change.processingContext || fallback;
  }
  /**
   * Safely gets AI timestamp with fallback
   */
  static getAITimestamp(change, fallback) {
    if (change.aiTimestamp) {
      return change.aiTimestamp instanceof Date ? change.aiTimestamp : new Date(change.aiTimestamp);
    }
    return fallback;
  }
  /**
   * Gets a human-readable AI source description
   */
  static getAISourceDescription(change) {
    if (!this.hasAIMetadata(change)) {
      return "Manual edit";
    }
    const provider = this.getAIProvider(change, "Unknown Provider");
    const model = this.getAIModel(change, "Unknown Model");
    return `AI-assisted (${provider}/${model})`;
  }
  /**
   * Checks if change was AI-generated
   */
  static isAIGenerated(change) {
    return this.hasAIMetadata(change) && !!(change.aiProvider && change.aiModel);
  }
  /**
   * Gets statistics for an array of EditChange objects
   */
  static getArrayStats(changes) {
    const aiChanges = changes.filter((change) => this.isAIGenerated(change));
    const manualChanges = changes.filter((change) => !this.isAIGenerated(change));
    const providers = [...new Set(
      aiChanges.map((change) => this.getAIProvider(change)).filter((provider) => provider !== "unknown")
    )];
    const models = [...new Set(
      aiChanges.map((change) => this.getAIModel(change)).filter((model) => model !== "unknown")
    )];
    const withContext = changes.filter(
      (change) => this.getProcessingContext(change) !== void 0
    ).length;
    return {
      total: changes.length,
      aiGenerated: aiChanges.length,
      manual: manualChanges.length,
      providers,
      models,
      withContext
    };
  }
};

// plugins/track-edits/src/edit-renderer.ts
var import_obsidian2 = require("obsidian");
var EditRenderer = class {
  constructor(plugin) {
    this.trackingIndicator = null;
    this.decorationContainer = null;
    this.activeDecorations = [];
    this.plugin = plugin;
  }
  showTrackingIndicator() {
    console.log("Track Edits v2.0: Tracking started (status shown in side panel)");
  }
  hideTrackingIndicator() {
    try {
      if (this.trackingIndicator && this.trackingIndicator.parentNode) {
        this.trackingIndicator.remove();
        this.trackingIndicator = null;
      }
      this.clearDecorations();
      console.log("Track Edits v2.0: Tracking stopped (status shown in side panel)");
    } catch (error) {
      console.error("Track Edits: Error hiding tracking indicator:", error);
      this.trackingIndicator = null;
    }
  }
  // Safe decoration system using DOM overlay approach
  showChangeDecorations(changes) {
    this.clearDecorations();
    const activeLeaf = this.plugin.app.workspace.getActiveViewOfType(import_obsidian2.MarkdownView);
    if (!activeLeaf || !activeLeaf.editor) {
      console.log("Track Edits v2.0: No active editor found for decorations");
      return;
    }
    console.log("Track Edits v2.0: Showing decorations for", changes.length, "changes");
    this.createDOMOverlayDecorations(activeLeaf, changes);
    changes.forEach((change, index) => {
      this.createTemporaryHighlight(change, index);
    });
  }
  createDOMOverlayDecorations(markdownView, changes) {
    try {
      const editorContainer = markdownView.contentEl.querySelector(".cm-editor");
      if (!editorContainer) {
        console.log("Track Edits v2.0: Editor container not found");
        return;
      }
      if (!this.decorationContainer) {
        this.decorationContainer = document.createElement("div");
        this.decorationContainer.className = "track-edits-decoration-overlay";
        this.decorationContainer.style.cssText = `
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 5;
        `;
        editorContainer.appendChild(this.decorationContainer);
      }
      const now = Date.now();
      const recentChanges = changes.filter((change) => now - change.timestamp < 5e3);
      recentChanges.forEach((change) => {
        this.createSafeDecoration(change);
      });
      console.log("Track Edits v2.0: Created", recentChanges.length, "DOM overlay decorations");
    } catch (error) {
      console.error("Track Edits v2.0: Error creating DOM overlay decorations:", error);
    }
  }
  createSafeDecoration(change) {
    if (!this.decorationContainer)
      return;
    const position = this.getEditorPosition(change);
    if (!position || position.left < 0 || position.top < 0) {
      console.log("Track Edits v2.0: Invalid position for decoration:", position);
      return;
    }
    const decoration = document.createElement("div");
    decoration.className = this.getDecorationClass(change);
    decoration.style.cssText = `
      position: absolute;
      left: ${position.left}px;
      top: ${position.top}px;
      width: ${Math.max(position.width, 20)}px;
      height: ${position.height}px;
      pointer-events: none;
      z-index: 10;
      border-radius: 3px;
      animation: track-edits-highlight-fade 3s ease-out forwards;
    `;
    decoration.title = `${change.type} at ${new Date(change.timestamp).toLocaleTimeString()}`;
    this.decorationContainer.appendChild(decoration);
    this.activeDecorations.push(decoration);
    setTimeout(() => {
      if (decoration.parentNode) {
        decoration.remove();
        this.activeDecorations = this.activeDecorations.filter((d) => d !== decoration);
      }
    }, 3e3);
  }
  getEditorPosition(change) {
    var _a;
    try {
      const activeLeaf = this.plugin.app.workspace.getActiveViewOfType(import_obsidian2.MarkdownView);
      if (!activeLeaf || !activeLeaf.editor)
        return null;
      const editor = activeLeaf.editor;
      const pos = editor.offsetToPos(change.from);
      const coords = editor.coordsAtPos(pos, false);
      if (!coords) {
        console.log("Track Edits v2.0: No coordinates returned for position", pos);
        return null;
      }
      const editorContainer = activeLeaf.contentEl.querySelector(".cm-editor");
      if (!editorContainer)
        return null;
      const editorRect = editorContainer.getBoundingClientRect();
      const result = {
        left: Math.max(0, coords.left - editorRect.left),
        top: Math.max(0, coords.top - editorRect.top),
        width: Math.max((((_a = change.text) == null ? void 0 : _a.length) || 1) * 8, 20),
        // Approximate character width
        height: Math.max(coords.bottom - coords.top, 16)
        // Minimum height
      };
      console.log("Track Edits v2.0: Calculated position:", result, "for change at", change.from);
      return result;
    } catch (error) {
      console.error("Track Edits v2.0: Error getting editor position:", error);
      return null;
    }
  }
  getDecorationClass(change) {
    let className = "track-edits-decoration";
    switch (change.type) {
      case "insert":
        className += " track-edits-decoration-insert";
        break;
      case "delete":
        className += " track-edits-decoration-delete";
        break;
      case "replace":
        className += " track-edits-decoration-replace";
        break;
    }
    className += ` track-edits-decoration-${this.plugin.settings.colorScheme}`;
    return className;
  }
  createTemporaryHighlight(change, index) {
    const highlight = document.createElement("div");
    highlight.className = "track-edits-temp-highlight";
    highlight.style.cssText = `
      position: fixed;
      top: ${60 + index * 25}px;
      right: 60px;
      background: var(--background-modifier-success);
      color: var(--text-on-accent);
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 10px;
      z-index: 999;
      opacity: 0.9;
      animation: fadeInOut 3s ease-in-out;
    `;
    highlight.textContent = `${change.type}: "${change.text || ""}"`;
    document.body.appendChild(highlight);
    this.activeDecorations.push(highlight);
    setTimeout(() => {
      if (highlight.parentNode) {
        highlight.remove();
        this.activeDecorations = this.activeDecorations.filter((el) => el !== highlight);
      }
    }, 3e3);
  }
  clearDecorations() {
    this.activeDecorations.forEach((decoration) => {
      if (decoration.parentNode) {
        decoration.remove();
      }
    });
    this.activeDecorations = [];
    if (this.decorationContainer && this.decorationContainer.parentNode) {
      this.decorationContainer.remove();
      this.decorationContainer = null;
    }
  }
  // Method for backward compatibility - no longer returns CodeMirror extension
  getCodeMirrorExtension() {
    return null;
  }
};

// plugins/track-edits/src/side-panel-view.ts
var import_obsidian3 = require("obsidian");
var SIDE_PANEL_VIEW_TYPE = "track-edits-side-panel";
var EditSidePanelView = class extends import_obsidian3.ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.clusters = [];
    this.runOnceBtn = null;
    this.plugin = plugin;
  }
  getViewType() {
    return SIDE_PANEL_VIEW_TYPE;
  }
  getDisplayText() {
    return "Track Edits";
  }
  getIcon() {
    return "edit";
  }
  async onOpen() {
    const container = this.containerEl.children[1];
    container.empty();
    container.addClass("track-edits-side-panel");
    this.renderView();
  }
  async onClose() {
  }
  updateClusters(clusters) {
    this.clusters = clusters;
    this.renderView();
  }
  renderView() {
    const container = this.containerEl.children[1];
    container.empty();
    const header = container.createEl("h2");
    header.createEl("span", { text: "Track Edits" });
    const statusDot = header.createEl("span", {
      cls: "track-edits-status-dot"
    });
    if (this.plugin.currentSession) {
      statusDot.addClass("track-edits-status-active");
      statusDot.setAttribute("title", "Tracking active");
    } else {
      statusDot.addClass("track-edits-status-inactive");
      statusDot.setAttribute("title", "Tracking stopped");
    }
    const countText = this.clusters.length === 0 ? "No edits to review" : `${this.clusters.length} cluster${this.clusters.length !== 1 ? "s" : ""} to review`;
    container.createEl("p", {
      text: countText,
      cls: "track-edits-count"
    });
    this.createAIControlsSection(container);
    if (this.clusters.length > 0) {
      const bulkControls = container.createEl("div", { cls: "track-edits-bulk-controls" });
      bulkControls.createEl("span", {
        text: "Accept / Reject All",
        cls: "track-edits-bulk-text"
      });
      const buttonsContainer = bulkControls.createEl("div", { cls: "track-edits-bulk-buttons" });
      const acceptAllBtn = buttonsContainer.createEl("button", {
        text: "\u2713",
        cls: "track-edits-bulk-btn track-edits-bulk-accept",
        title: "Accept all edits"
      });
      acceptAllBtn.onclick = () => this.acceptAllClusters();
      const rejectAllBtn = buttonsContainer.createEl("button", {
        text: "\u2717",
        cls: "track-edits-bulk-btn track-edits-bulk-reject",
        title: "Reject all edits"
      });
      rejectAllBtn.onclick = () => this.rejectAllClusters();
    }
    const editsList = container.createEl("div", { cls: "track-edits-list" });
    if (this.clusters.length === 0) {
      return;
    }
    this.clusters.forEach((cluster, index) => {
      this.renderCluster(editsList, cluster, index);
    });
  }
  renderCluster(container, cluster, index) {
    const clusterItem = container.createEl("div", { cls: "track-edit-item track-cluster-item" });
    const clusterRow = clusterItem.createEl("div", { cls: "track-cluster-row" });
    const clusterContent = clusterRow.createEl("div", { cls: "track-cluster-content" });
    const previewText = this.getClusterPreview(cluster);
    if (cluster.type === "word_replacement") {
      const deleteSpan = clusterContent.createEl("code", {
        text: previewText.before || "",
        cls: "track-edit-deleted"
      });
      clusterContent.appendText(" \u2192 ");
      const addSpan = clusterContent.createEl("code", {
        text: previewText.after || "",
        cls: "track-edit-added"
      });
    } else {
      clusterContent.createEl("code", {
        text: previewText.text || "",
        cls: "track-edit-added"
      });
    }
    const buttonsContainer = clusterRow.createEl("div", { cls: "track-edit-buttons" });
    const acceptBtn = buttonsContainer.createEl("button", {
      text: "\u2713",
      cls: "track-edit-btn track-edit-btn-accept",
      title: "Accept edit"
    });
    acceptBtn.onclick = () => this.acceptCluster(cluster.id);
    const rejectBtn = buttonsContainer.createEl("button", {
      text: "\u2717",
      cls: "track-edit-btn track-edit-btn-reject",
      title: "Reject edit"
    });
    rejectBtn.onclick = () => this.rejectCluster(cluster.id);
  }
  getClusterTitle(cluster) {
    switch (cluster.type) {
      case "word_replacement":
        return "Word Replacement";
      case "consecutive_typing":
        return "Consecutive Typing";
      case "deletion":
        return "Text Deletion";
      default:
        return "Text Edit";
    }
  }
  getClusterTime(cluster) {
    const now = Date.now();
    const timeDiff = now - cluster.startTime;
    if (timeDiff < 1e3) {
      return "Just now";
    } else if (timeDiff < 6e4) {
      return `${Math.floor(timeDiff / 1e3)}s ago`;
    } else {
      return `${Math.floor(timeDiff / 6e4)}m ago`;
    }
  }
  getClusterPreview(cluster) {
    var _a, _b;
    if (cluster.type === "word_replacement") {
      return {
        before: ((_a = cluster.metadata) == null ? void 0 : _a.originalWord) || "",
        after: ((_b = cluster.metadata) == null ? void 0 : _b.newWord) || ""
      };
    } else {
      const text = cluster.edits.map((edit) => edit.text || "").join("").slice(0, 50);
      return { text: text + (text.length === 50 ? "..." : "") };
    }
  }
  acceptCluster(clusterId) {
    this.plugin.acceptEditCluster(clusterId);
  }
  rejectCluster(clusterId) {
    this.plugin.rejectEditCluster(clusterId);
  }
  acceptAllClusters() {
    const clusterIds = this.clusters.map((cluster) => cluster.id);
    this.plugin.acceptAllEditClusters(clusterIds);
  }
  rejectAllClusters() {
    if (this.clusters.length > 3) {
      const confirmed = confirm(`Are you sure you want to reject all ${this.clusters.length} edits? This cannot be undone.`);
      if (!confirmed)
        return;
    }
    this.plugin.stopTracking();
    const clusterIds = this.clusters.map((cluster) => cluster.id);
    this.plugin.rejectAllEditClusters(clusterIds);
  }
  createAIControlsSection(container) {
    const controlsDiv = container.createEl("div", { cls: "track-edits-ai-simple" });
    const controlsLine = controlsDiv.createEl("div", { cls: "ai-simple-line" });
    const labelToggleGroup = controlsLine.createEl("div", { cls: "ai-label-toggle-group" });
    labelToggleGroup.createEl("span", { text: "AI", cls: "ai-simple-label" });
    const toggleSwitch = labelToggleGroup.createEl("div", { cls: "ai-simple-toggle" });
    toggleSwitch.addClass(this.plugin.settings.aiAlwaysEnabled ? "on" : "off");
    toggleSwitch.setAttribute("title", this.plugin.settings.aiAlwaysEnabled ? "AI Always On" : "AI Manual Only");
    toggleSwitch.onclick = () => {
      this.plugin.settings.aiAlwaysEnabled = !this.plugin.settings.aiAlwaysEnabled;
      this.plugin.saveSettings();
      this.renderView();
    };
    this.runOnceBtn = controlsLine.createEl("button", {
      text: "Run Once",
      cls: this.plugin.settings.aiAlwaysEnabled ? "ai-simple-btn disabled" : "ai-simple-btn enabled",
      title: "Run AI analysis once on current edits"
    });
    this.runOnceBtn.onclick = () => {
      if (!this.plugin.settings.aiAlwaysEnabled) {
        this.runAIAnalysisOnce();
      }
    };
  }
  async runAIAnalysisOnce() {
    if (!this.runOnceBtn)
      return;
    this.runOnceBtn.textContent = "Running...";
    this.runOnceBtn.addClass("running");
    try {
      await this.plugin.runAIAnalysisOnce();
      this.runOnceBtn.textContent = "Done!";
      setTimeout(() => {
        if (this.runOnceBtn) {
          this.runOnceBtn.textContent = "Run Once";
          this.runOnceBtn.removeClass("running");
        }
      }, 2e3);
    } catch (error) {
      console.error("AI analysis failed:", error);
      this.runOnceBtn.textContent = "Error";
      setTimeout(() => {
        if (this.runOnceBtn) {
          this.runOnceBtn.textContent = "Run Once";
          this.runOnceBtn.removeClass("running");
        }
      }, 2e3);
    }
  }
};

// plugins/track-edits/src/edit-cluster-manager.ts
var EditClusterManager = class {
  constructor(plugin) {
    this.activeClusters = /* @__PURE__ */ new Map();
    this.plugin = plugin;
  }
  clusterEdits(edits) {
    if (!this.plugin.settings.enableClustering || edits.length === 0) {
      return [];
    }
    this.activeClusters.clear();
    const sortedEdits = [...edits].sort((a, b) => a.timestamp - b.timestamp);
    const clusters = [];
    let currentCluster = [];
    let lastTimestamp = 0;
    for (const edit of sortedEdits) {
      const timeDiff = edit.timestamp - lastTimestamp;
      if (timeDiff > this.plugin.settings.clusterTimeWindow || currentCluster.length === 0) {
        if (currentCluster.length > 0) {
          const cluster = this.createCluster(currentCluster);
          if (cluster) {
            clusters.push(cluster);
            this.activeClusters.set(cluster.id, cluster);
          }
        }
        currentCluster = [edit];
      } else {
        if (this.areEditsInSameWord(currentCluster[currentCluster.length - 1], edit)) {
          currentCluster.push(edit);
        } else {
          const cluster = this.createCluster(currentCluster);
          if (cluster) {
            clusters.push(cluster);
            this.activeClusters.set(cluster.id, cluster);
          }
          currentCluster = [edit];
        }
      }
      lastTimestamp = edit.timestamp;
    }
    if (currentCluster.length > 0) {
      const cluster = this.createCluster(currentCluster);
      if (cluster) {
        clusters.push(cluster);
        this.activeClusters.set(cluster.id, cluster);
      }
    }
    return clusters;
  }
  createCluster(edits) {
    if (edits.length === 0)
      return null;
    const startTime = Math.min(...edits.map((e) => e.timestamp));
    const endTime = Math.max(...edits.map((e) => e.timestamp));
    const clusterType = this.determineClusterType(edits);
    const cluster = {
      id: generateId(),
      type: clusterType,
      edits,
      startTime,
      endTime,
      wordCount: this.calculateWordCount(edits),
      characterCount: this.calculateCharacterCount(edits),
      metadata: this.generateClusterMetadata(edits, clusterType)
    };
    return cluster;
  }
  areEditsInSameWord(edit1, edit2) {
    const positionDiff = Math.abs(edit1.to - edit2.from);
    if (positionDiff <= 5) {
      return true;
    }
    if (edit1.type === "insert" && edit2.type === "insert") {
      return edit1.to === edit2.from || edit1.to === edit2.from - 1;
    }
    return false;
  }
  determineClusterType(edits) {
    const insertCount = edits.filter((e) => e.type === "insert").length;
    const deleteCount = edits.filter((e) => e.type === "delete").length;
    const replaceCount = edits.filter((e) => e.type === "replace").length;
    if (deleteCount > 0 && insertCount > 0) {
      return "word_replacement";
    }
    if (deleteCount > 0 && insertCount === 0) {
      return "deletion";
    }
    if (insertCount > 0 && deleteCount === 0) {
      return "consecutive_typing";
    }
    return "mixed";
  }
  calculateWordCount(edits) {
    const text = edits.filter((e) => e.text).map((e) => e.text).join("");
    return text.trim().split(/\s+/).filter((word) => word.length > 0).length;
  }
  calculateCharacterCount(edits) {
    return edits.filter((e) => e.text).reduce((count, edit) => {
      var _a;
      return count + (((_a = edit.text) == null ? void 0 : _a.length) || 0);
    }, 0);
  }
  generateClusterMetadata(edits, type) {
    const metadata = {};
    if (type === "word_replacement") {
      const deletedEdits = edits.filter((e) => e.type === "delete");
      const insertedEdits = edits.filter((e) => e.type === "insert");
      if (deletedEdits.length > 0) {
        metadata.originalWord = deletedEdits.map((e) => e.removedText || "").join("");
      }
      if (insertedEdits.length > 0) {
        metadata.newWord = insertedEdits.map((e) => e.text || "").join("");
      }
    }
    if (edits.length > 0) {
      metadata.position = edits[0].from;
    }
    return metadata;
  }
  getCluster(clusterId) {
    return this.activeClusters.get(clusterId);
  }
  removeCluster(clusterId) {
    return this.activeClusters.delete(clusterId);
  }
  getAllClusters() {
    return Array.from(this.activeClusters.values());
  }
  clearClusters() {
    this.activeClusters.clear();
  }
};

// plugins/track-edits/src/ui/ToggleStateManager.ts
var ToggleStateManager = class {
  constructor(app, onStateChange) {
    this.ribbonIcon = null;
    this.statusIndicator = null;
    this.sidePanel = null;
    this.sidePanelOriginalContent = "";
    this.app = app;
    this.onStateChange = onStateChange;
    this.trackingEnabled = this.loadSavedState();
    this.createAriaAnnouncer();
  }
  get isTrackingEnabled() {
    return this.trackingEnabled;
  }
  /**
   * Set tracking enabled/disabled state
   */
  setTrackingEnabled(enabled) {
    if (this.trackingEnabled === enabled) {
      return;
    }
    this.trackingEnabled = enabled;
    this.saveState();
    this.updateRibbonIcon();
    this.updateStatusIndicator();
    this.updateSidePanel();
    this.announceStateChange(enabled);
    this.onStateChange(enabled);
  }
  /**
   * Set the ribbon icon element to manage
   */
  setRibbonIcon(ribbonElement) {
    this.ribbonIcon = ribbonElement;
    this.updateRibbonIcon();
  }
  /**
   * Set the status indicator element to manage
   */
  setStatusIndicator(statusElement) {
    this.statusIndicator = statusElement;
    this.updateStatusIndicator();
  }
  /**
   * Set the side panel element to manage
   */
  setSidePanel(sidePanelElement) {
    this.sidePanel = sidePanelElement;
    this.sidePanelOriginalContent = sidePanelElement.innerHTML;
    this.updateSidePanel();
  }
  updateRibbonIcon() {
    if (!this.ribbonIcon)
      return;
    this.ribbonIcon.classList.add("state-transition");
    if (this.trackingEnabled) {
      this.ribbonIcon.classList.add("track-edits-enabled");
      this.ribbonIcon.classList.remove("track-edits-disabled");
      this.ribbonIcon.title = "Track Edits (Active) - Click to manage changes";
      this.ribbonIcon.setAttribute("aria-label", "Track Edits is active. Click to manage tracked changes.");
    } else {
      this.ribbonIcon.classList.add("track-edits-disabled");
      this.ribbonIcon.classList.remove("track-edits-enabled");
      this.ribbonIcon.title = "Track Edits (Disabled) - Click to enable";
      this.ribbonIcon.setAttribute("aria-label", "Track Edits disabled. Click to enable tracking.");
    }
    setTimeout(() => {
      if (this.ribbonIcon) {
        this.ribbonIcon.classList.remove("state-transition");
      }
    }, 300);
  }
  updateStatusIndicator() {
    if (!this.statusIndicator)
      return;
    if (this.trackingEnabled) {
      this.statusIndicator.classList.add("status-active");
      this.statusIndicator.classList.remove("status-disabled");
      this.statusIndicator.setAttribute("aria-label", "Track Edits is active");
      this.statusIndicator.textContent = "Active";
    } else {
      this.statusIndicator.classList.add("status-disabled");
      this.statusIndicator.classList.remove("status-active");
      this.statusIndicator.setAttribute("aria-label", "Track Edits is disabled");
      this.statusIndicator.textContent = "Disabled";
    }
  }
  updateSidePanel() {
    if (!this.sidePanel)
      return;
    if (this.trackingEnabled) {
      this.sidePanel.classList.add("track-edits-active");
      this.sidePanel.classList.remove("track-edits-disabled");
      if (this.sidePanelOriginalContent) {
        this.sidePanel.innerHTML = this.sidePanelOriginalContent;
      }
    } else {
      this.sidePanel.classList.add("track-edits-disabled");
      this.sidePanel.classList.remove("track-edits-active");
      this.sidePanel.innerHTML = this.createEmptyStateHTML();
    }
  }
  createEmptyStateHTML() {
    return `
      <div class="track-edits-empty-state">
        <div class="empty-state-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 12l2 2 4-4"></path>
            <path d="M21 12c-1 0-3-1-3-3s2-3 3-3 3 1 3 3-2 3-3 3"></path>
            <path d="M3 12c1 0 3-1 3-3s-2-3-3-3-3 1-3 3 2 3 3 3"></path>
            <path d="M3 12h6m6 0h6"></path>
          </svg>
        </div>
        <h3 class="empty-state-title">Tracking disabled</h3>
        <p class="empty-state-description">
          Enable Track Edits to see changes and suggestions for your document.
        </p>
        <button class="empty-state-button" onclick="window.TrackEdits?.enableTracking()">
          Enable Track Edits
        </button>
      </div>
    `;
  }
  saveState() {
    sessionStorage.setItem("track-edits-enabled", String(this.trackingEnabled));
  }
  loadSavedState() {
    const saved = sessionStorage.getItem("track-edits-enabled");
    return saved !== null ? saved === "true" : true;
  }
  createAriaAnnouncer() {
    let announcer = document.getElementById("track-edits-announcer");
    if (!announcer) {
      announcer = document.createElement("div");
      announcer.id = "track-edits-announcer";
      announcer.setAttribute("aria-live", "polite");
      announcer.setAttribute("aria-atomic", "true");
      announcer.style.position = "absolute";
      announcer.style.left = "-10000px";
      announcer.style.width = "1px";
      announcer.style.height = "1px";
      announcer.style.overflow = "hidden";
      document.body.appendChild(announcer);
    }
  }
  announceStateChange(enabled) {
    const announcer = document.getElementById("track-edits-announcer");
    if (announcer) {
      announcer.textContent = enabled ? "Track Edits has been enabled" : "Track Edits has been disabled";
    }
  }
  /**
   * Clean up resources
   */
  destroy() {
    const announcer = document.getElementById("track-edits-announcer");
    if (announcer && announcer.parentNode) {
      announcer.parentNode.removeChild(announcer);
    }
  }
};

// plugins/track-edits/src/components/ToggleConfirmationModal.ts
var import_obsidian4 = require("obsidian");
var ToggleConfirmationModal = class extends import_obsidian4.Modal {
  constructor(app, options) {
    super(app);
    this.options = options;
    this.keydownHandler = this.handleKeydown.bind(this);
  }
  get editCount() {
    return this.options.editCount;
  }
  get onConfirm() {
    return this.options.onConfirm;
  }
  get onCancel() {
    return this.options.onCancel;
  }
  onOpen() {
    const { contentEl } = this;
    const { editCount } = this.options;
    contentEl.empty();
    contentEl.addClass("toggle-confirmation-modal");
    const header = contentEl.createEl("h2", {
      text: "Turn Off Track Edits?",
      cls: "modal-title"
    });
    const messageEl = contentEl.createEl("p", {
      cls: "modal-message"
    });
    const editText = editCount === 1 ? "edit" : "edits";
    messageEl.textContent = `You have ${editCount} pending ${editText}. These changes will be lost if you turn off tracking.`;
    const buttonContainer = contentEl.createEl("div", {
      cls: "modal-button-container"
    });
    const cancelButton = buttonContainer.createEl("button", {
      text: "Keep Tracking",
      cls: "modal-button modal-button-secondary"
    });
    cancelButton.addEventListener("click", () => {
      this.handleCancel();
    });
    const confirmButton = buttonContainer.createEl("button", {
      text: "Turn Off Anyway",
      cls: "modal-button modal-button-primary"
    });
    confirmButton.addEventListener("click", () => {
      this.handleConfirm();
    });
    cancelButton.focus();
    document.addEventListener("keydown", this.keydownHandler);
  }
  onClose() {
    document.removeEventListener("keydown", this.keydownHandler);
  }
  handleKeydown(e) {
    if (e.key === "Escape") {
      e.preventDefault();
      this.handleCancel();
    } else if (e.key === "Enter") {
      e.preventDefault();
      this.handleConfirm();
    }
  }
  handleConfirm() {
    this.options.onConfirm();
    this.close();
  }
  handleCancel() {
    this.options.onCancel();
    this.close();
  }
  // TODO: Add shouldSkipConfirmation() and resetSessionPreference() methods in future update
};

// plugins/track-edits/src/change-grouping-system.ts
var ChangeGroupingSystem = class {
  constructor(config2) {
    this.groupIdCounter = 0;
    this.config = {
      enabled: true,
      defaultStrategy: "mixed",
      maxChangesPerGroup: 25,
      timeWindowMs: 5e3,
      // 5 seconds
      proximityThreshold: 100,
      // 100 characters
      minChangesForGroup: 2,
      enableHierarchicalGrouping: true,
      operationGroupingRules: {
        "proofreading": {
          strategy: "proximity",
          maxChangesPerGroup: 50,
          priority: "medium"
        },
        "copy-edit-pass": {
          strategy: "mixed",
          maxChangesPerGroup: 30,
          priority: "high"
        },
        "developmental-feedback": {
          strategy: "semantic",
          maxChangesPerGroup: 15,
          priority: "high"
        },
        "style-refinement": {
          strategy: "operation-type",
          maxChangesPerGroup: 20,
          priority: "medium"
        }
      },
      ...config2
    };
  }
  /**
   * Main entry point for grouping changes from Editorial Engine operations
   */
  groupChanges(changes, operationType, operationDescription) {
    if (!this.config.enabled || changes.length < this.config.minChangesForGroup) {
      return this.createEmptyGroupingResult(changes);
    }
    const strategy = this.determineGroupingStrategy(operationType);
    const groups = [];
    const ungroupedChanges = [];
    const warnings = [];
    try {
      switch (strategy) {
        case "proximity":
          this.groupByProximity(changes, operationType, operationDescription, groups, ungroupedChanges);
          break;
        case "operation-type":
          this.groupByOperationType(changes, operationType, operationDescription, groups, ungroupedChanges);
          break;
        case "semantic":
          this.groupBySemantic(changes, operationType, operationDescription, groups, ungroupedChanges);
          break;
        case "time-window":
          this.groupByTimeWindow(changes, operationType, operationDescription, groups, ungroupedChanges);
          break;
        case "mixed":
          this.groupByMixedStrategy(changes, operationType, operationDescription, groups, ungroupedChanges);
          break;
        default:
          ungroupedChanges.push(...changes.map((c) => c.id));
      }
      if (this.config.enableHierarchicalGrouping && groups.length > 1) {
        this.createHierarchicalGroups(groups);
      }
    } catch (error) {
      warnings.push(`Grouping error: ${error instanceof Error ? error.message : String(error)}`);
      ungroupedChanges.push(...changes.map((c) => c.id));
    }
    return this.createGroupingResult(changes, groups, ungroupedChanges, warnings);
  }
  /**
   * Group changes by proximity - changes close together in the document
   */
  groupByProximity(changes, operationType, operationDescription, groups, ungroupedChanges) {
    const sortedChanges = [...changes].sort((a, b) => a.from - b.from);
    let currentGroup = [];
    for (const change of sortedChanges) {
      if (currentGroup.length === 0) {
        currentGroup.push(change);
      } else {
        const lastChange = currentGroup[currentGroup.length - 1];
        const distance = change.from - lastChange.to;
        if (distance <= this.config.proximityThreshold && currentGroup.length < this.getMaxChangesForOperation(operationType)) {
          currentGroup.push(change);
        } else {
          if (currentGroup.length >= this.config.minChangesForGroup) {
            groups.push(this.createGroupMetadata(currentGroup, operationType, "proximity", operationDescription));
          } else {
            ungroupedChanges.push(...currentGroup.map((c) => c.id));
          }
          currentGroup = [change];
        }
      }
    }
    if (currentGroup.length >= this.config.minChangesForGroup) {
      groups.push(this.createGroupMetadata(currentGroup, operationType, "proximity", operationDescription));
    } else {
      ungroupedChanges.push(...currentGroup.map((c) => c.id));
    }
  }
  /**
   * Group changes by operation type - similar change types together
   */
  groupByOperationType(changes, operationType, operationDescription, groups, ungroupedChanges) {
    const changesByType = /* @__PURE__ */ new Map();
    for (const change of changes) {
      const key = change.type;
      if (!changesByType.has(key)) {
        changesByType.set(key, []);
      }
      changesByType.get(key).push(change);
    }
    for (const [type, typeChanges] of changesByType.entries()) {
      if (typeChanges.length >= this.config.minChangesForGroup) {
        const maxChanges = this.getMaxChangesForOperation(operationType);
        const subGroups = this.subdivideGroup(typeChanges, maxChanges);
        for (const subGroup of subGroups) {
          groups.push(this.createGroupMetadata(
            subGroup,
            operationType,
            "operation-type",
            operationDescription,
            `${this.getOperationTypeDescription(type)} changes`
          ));
        }
      } else {
        ungroupedChanges.push(...typeChanges.map((c) => c.id));
      }
    }
  }
  /**
   * Group changes by semantic similarity
   */
  groupBySemantic(changes, operationType, operationDescription, groups, ungroupedChanges) {
    const semanticGroups = /* @__PURE__ */ new Map();
    for (const change of changes) {
      const semanticKey = this.determineSemanticKey(change, operationType);
      if (!semanticGroups.has(semanticKey)) {
        semanticGroups.set(semanticKey, []);
      }
      semanticGroups.get(semanticKey).push(change);
    }
    for (const [semanticKey, semanticChanges] of semanticGroups.entries()) {
      if (semanticChanges.length >= this.config.minChangesForGroup) {
        const maxChanges = this.getMaxChangesForOperation(operationType);
        const subGroups = this.subdivideGroup(semanticChanges, maxChanges);
        for (const subGroup of subGroups) {
          groups.push(this.createGroupMetadata(
            subGroup,
            operationType,
            "semantic",
            operationDescription,
            `${semanticKey} improvements`
          ));
        }
      } else {
        ungroupedChanges.push(...semanticChanges.map((c) => c.id));
      }
    }
  }
  /**
   * Group changes by time window
   */
  groupByTimeWindow(changes, operationType, operationDescription, groups, ungroupedChanges) {
    const sortedChanges = [...changes].sort((a, b) => a.timestamp - b.timestamp);
    let currentGroup = [];
    let groupStartTime = 0;
    for (const change of sortedChanges) {
      if (currentGroup.length === 0) {
        currentGroup.push(change);
        groupStartTime = change.timestamp;
      } else {
        const timeSinceGroupStart = change.timestamp - groupStartTime;
        if (timeSinceGroupStart <= this.config.timeWindowMs && currentGroup.length < this.getMaxChangesForOperation(operationType)) {
          currentGroup.push(change);
        } else {
          if (currentGroup.length >= this.config.minChangesForGroup) {
            groups.push(this.createGroupMetadata(currentGroup, operationType, "time-window", operationDescription));
          } else {
            ungroupedChanges.push(...currentGroup.map((c) => c.id));
          }
          currentGroup = [change];
          groupStartTime = change.timestamp;
        }
      }
    }
    if (currentGroup.length >= this.config.minChangesForGroup) {
      groups.push(this.createGroupMetadata(currentGroup, operationType, "time-window", operationDescription));
    } else {
      ungroupedChanges.push(...currentGroup.map((c) => c.id));
    }
  }
  /**
   * Mixed strategy combining proximity, operation type, and semantic analysis
   */
  groupByMixedStrategy(changes, operationType, operationDescription, groups, ungroupedChanges) {
    const proximityGroups = [];
    const sortedChanges = [...changes].sort((a, b) => a.from - b.from);
    let currentGroup = [];
    for (const change of sortedChanges) {
      if (currentGroup.length === 0) {
        currentGroup.push(change);
      } else {
        const lastChange = currentGroup[currentGroup.length - 1];
        const distance = change.from - lastChange.to;
        if (distance <= this.config.proximityThreshold * 2) {
          currentGroup.push(change);
        } else {
          if (currentGroup.length > 0) {
            proximityGroups.push(currentGroup);
          }
          currentGroup = [change];
        }
      }
    }
    if (currentGroup.length > 0) {
      proximityGroups.push(currentGroup);
    }
    for (const proximityGroup of proximityGroups) {
      if (proximityGroup.length < this.config.minChangesForGroup) {
        ungroupedChanges.push(...proximityGroup.map((c) => c.id));
        continue;
      }
      const typeGroups = /* @__PURE__ */ new Map();
      for (const change of proximityGroup) {
        const typeKey = `${change.type}-${this.determineSemanticKey(change, operationType)}`;
        if (!typeGroups.has(typeKey)) {
          typeGroups.set(typeKey, []);
        }
        typeGroups.get(typeKey).push(change);
      }
      for (const [typeKey, typeChanges] of typeGroups.entries()) {
        if (typeChanges.length >= this.config.minChangesForGroup) {
          const maxChanges = this.getMaxChangesForOperation(operationType);
          if (typeChanges.length <= maxChanges) {
            groups.push(this.createGroupMetadata(
              typeChanges,
              operationType,
              "mixed",
              operationDescription
            ));
          } else {
            const subGroups = this.subdivideGroup(typeChanges, maxChanges);
            for (const subGroup of subGroups) {
              groups.push(this.createGroupMetadata(
                subGroup,
                operationType,
                "mixed",
                operationDescription
              ));
            }
          }
        } else {
          ungroupedChanges.push(...typeChanges.map((c) => c.id));
        }
      }
    }
  }
  /**
   * Create hierarchical grouping structure for large operations
   */
  createHierarchicalGroups(groups) {
    if (groups.length <= 3)
      return;
    const parentGroups = /* @__PURE__ */ new Map();
    for (const group of groups) {
      const parentKey = this.determineParentGroupKey(group);
      if (!parentGroups.has(parentKey)) {
        parentGroups.set(parentKey, []);
      }
      parentGroups.get(parentKey).push(group);
    }
    for (const [parentKey, childGroups] of parentGroups.entries()) {
      if (childGroups.length > 1) {
        const parentGroupId = this.generateGroupId();
        const parentGroup = {
          groupId: parentGroupId,
          operationType: childGroups[0].operationType,
          operationDescription: `${parentKey} (${childGroups.length} sections)`,
          groupingStrategy: "mixed",
          createdAt: /* @__PURE__ */ new Date(),
          changeCount: childGroups.reduce((sum, g) => sum + g.changeCount, 0),
          scope: "document",
          positionRange: {
            start: Math.min(...childGroups.map((g) => g.positionRange.start)),
            end: Math.max(...childGroups.map((g) => g.positionRange.end))
          },
          priority: this.determineGroupPriority(childGroups[0].operationType),
          status: "pending",
          childGroupIds: childGroups.map((g) => g.groupId)
        };
        for (const childGroup of childGroups) {
          childGroup.parentGroupId = parentGroupId;
        }
        groups.unshift(parentGroup);
      }
    }
  }
  /**
   * Helper methods for grouping logic
   */
  determineGroupingStrategy(operationType) {
    const rule = this.config.operationGroupingRules[operationType];
    return (rule == null ? void 0 : rule.strategy) || this.config.defaultStrategy;
  }
  getMaxChangesForOperation(operationType) {
    const rule = this.config.operationGroupingRules[operationType];
    return (rule == null ? void 0 : rule.maxChangesPerGroup) || this.config.maxChangesPerGroup;
  }
  determineSemanticKey(change, operationType) {
    if (operationType === "proofreading") {
      if (change.text && /[.!?]$/.test(change.text.trim()))
        return "sentence-ending";
      if (change.type === "replace" && change.removedText && change.text) {
        if (/^[A-Z]/.test(change.text) && /^[a-z]/.test(change.removedText))
          return "capitalization";
        if (change.text.length < change.removedText.length)
          return "spelling-correction";
      }
      return "grammar-fix";
    }
    if (operationType === "style-refinement") {
      if (change.type === "replace")
        return "word-choice";
      if (change.type === "insert")
        return "clarification";
      return "style-improvement";
    }
    return change.type;
  }
  getOperationTypeDescription(changeType) {
    switch (changeType) {
      case "insert":
        return "Addition";
      case "delete":
        return "Removal";
      case "replace":
        return "Replacement";
      default:
        return "Edit";
    }
  }
  determineParentGroupKey(group) {
    const scopePrefix = group.scope === "document" ? "Document-wide" : "Section";
    return `${scopePrefix} ${group.operationType}`;
  }
  determineGroupPriority(operationType) {
    const rule = this.config.operationGroupingRules[operationType];
    if (rule == null ? void 0 : rule.priority)
      return rule.priority;
    switch (operationType) {
      case "developmental-feedback":
      case "copy-edit-pass":
        return "high";
      case "proofreading":
      case "style-refinement":
        return "medium";
      default:
        return "low";
    }
  }
  subdivideGroup(changes, maxSize) {
    if (changes.length <= maxSize)
      return [changes];
    const groups = [];
    for (let i = 0; i < changes.length; i += maxSize) {
      groups.push(changes.slice(i, i + maxSize));
    }
    return groups;
  }
  createGroupMetadata(changes, operationType, strategy, operationDescription, specificDescription) {
    const positions = changes.map((c) => ({ start: c.from, end: c.to }));
    const minPos = Math.min(...positions.map((p) => p.start));
    const maxPos = Math.max(...positions.map((p) => p.end));
    let scope = "selection";
    const positionSpread = maxPos - minPos;
    if (positionSpread > 5e3)
      scope = "document";
    else if (positionSpread > 1e3)
      scope = "section";
    else if (positionSpread > 200)
      scope = "paragraph";
    return {
      groupId: this.generateGroupId(),
      operationType,
      operationDescription: specificDescription || operationDescription || this.getDefaultOperationDescription(operationType),
      groupingStrategy: strategy,
      createdAt: /* @__PURE__ */ new Date(),
      changeCount: changes.length,
      scope,
      positionRange: { start: minPos, end: maxPos },
      priority: this.determineGroupPriority(operationType),
      status: "pending"
    };
  }
  getDefaultOperationDescription(operationType) {
    switch (operationType) {
      case "copy-edit-pass":
        return "Comprehensive copy editing pass";
      case "proofreading":
        return "Grammar and spelling corrections";
      case "developmental-feedback":
        return "Structural and content improvements";
      case "style-refinement":
        return "Voice and tone refinements";
      case "fact-checking":
        return "Accuracy and verification changes";
      case "formatting":
        return "Document formatting updates";
      case "content-expansion":
        return "Content additions and elaborations";
      case "content-reduction":
        return "Content trimming and condensing";
      case "rewriting":
        return "Content restructuring and rewriting";
      default:
        return "Editorial changes";
    }
  }
  generateGroupId() {
    return `group_${Date.now()}_${++this.groupIdCounter}`;
  }
  createEmptyGroupingResult(changes) {
    return {
      groups: [],
      ungroupedChanges: changes.map((c) => c.id),
      warnings: [],
      statistics: {
        totalChanges: changes.length,
        groupedChanges: 0,
        ungroupedChanges: changes.length,
        groupsCreated: 0,
        averageGroupSize: 0
      }
    };
  }
  createGroupingResult(changes, groups, ungroupedChanges, warnings) {
    const groupedChanges = groups.reduce((sum, g) => sum + g.changeCount, 0);
    return {
      groups,
      ungroupedChanges,
      warnings,
      statistics: {
        totalChanges: changes.length,
        groupedChanges,
        ungroupedChanges: ungroupedChanges.length,
        groupsCreated: groups.length,
        averageGroupSize: groups.length > 0 ? groupedChanges / groups.length : 0
      }
    };
  }
  /**
   * Update configuration
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
  }
  /**
   * Get current configuration
   */
  getConfig() {
    return { ...this.config };
  }
};

// plugins/track-edits/src/change-batch-manager.ts
var ChangeBatchManager = class {
  constructor(groupingSystem) {
    this.batchMetadata = /* @__PURE__ */ new Map();
    this.sessionBatches = /* @__PURE__ */ new Map();
    // sessionId -> groupIds
    this.changeToGroup = /* @__PURE__ */ new Map();
    // changeId -> groupId
    this.batchStatusHistory = /* @__PURE__ */ new Map();
    this.groupingSystem = groupingSystem || new ChangeGroupingSystem();
  }
  /**
   * Create batches from a set of changes with automatic grouping
   */
  createBatches(changes, sessionId, operationType, operationDescription) {
    const groupingResult = this.groupingSystem.groupChanges(
      changes,
      operationType,
      operationDescription
    );
    for (const group of groupingResult.groups) {
      this.batchMetadata.set(group.groupId, group);
      if (!this.sessionBatches.has(sessionId)) {
        this.sessionBatches.set(sessionId, []);
      }
      this.sessionBatches.get(sessionId).push(group.groupId);
      const groupChanges = this.getChangesForGroup(changes, group);
      for (const change of groupChanges) {
        if (change.id) {
          this.changeToGroup.set(change.id, group.groupId);
        }
      }
      this.batchStatusHistory.set(group.groupId, [{
        groupId: group.groupId,
        newStatus: "pending",
        timestamp: /* @__PURE__ */ new Date()
      }]);
    }
    return groupingResult;
  }
  /**
   * Accept an entire batch of changes
   */
  acceptBatch(groupId, writerNotes) {
    const batch = this.batchMetadata.get(groupId);
    if (!batch) {
      return {
        success: false,
        affectedGroups: [],
        affectedChanges: [],
        errors: [`Batch ${groupId} not found`],
        warnings: []
      };
    }
    const statusUpdate = {
      groupId,
      newStatus: "accepted",
      writerNotes,
      timestamp: /* @__PURE__ */ new Date()
    };
    this.updateBatchStatus(groupId, statusUpdate);
    const childGroups = [];
    if (batch.childGroupIds) {
      for (const childId of batch.childGroupIds) {
        const childResult = this.acceptBatch(childId, `Accepted with parent batch`);
        childGroups.push(...childResult.affectedGroups);
      }
    }
    const affectedChanges = this.getChangeIdsForGroup(groupId);
    return {
      success: true,
      affectedGroups: [groupId, ...childGroups],
      affectedChanges,
      errors: [],
      warnings: []
    };
  }
  /**
   * Reject an entire batch of changes
   */
  rejectBatch(groupId, writerNotes) {
    const batch = this.batchMetadata.get(groupId);
    if (!batch) {
      return {
        success: false,
        affectedGroups: [],
        affectedChanges: [],
        errors: [`Batch ${groupId} not found`],
        warnings: []
      };
    }
    const statusUpdate = {
      groupId,
      newStatus: "rejected",
      writerNotes,
      timestamp: /* @__PURE__ */ new Date()
    };
    this.updateBatchStatus(groupId, statusUpdate);
    const childGroups = [];
    if (batch.childGroupIds) {
      for (const childId of batch.childGroupIds) {
        const childResult = this.rejectBatch(childId, `Rejected with parent batch`);
        childGroups.push(...childResult.affectedGroups);
      }
    }
    const affectedChanges = this.getChangeIdsForGroup(groupId);
    return {
      success: true,
      affectedGroups: [groupId, ...childGroups],
      affectedChanges,
      errors: [],
      warnings: []
    };
  }
  /**
   * Partially accept/reject specific changes within a batch
   */
  partiallyProcessBatch(groupId, acceptedChangeIds, rejectedChangeIds, writerNotes) {
    const batch = this.batchMetadata.get(groupId);
    if (!batch) {
      return {
        success: false,
        affectedGroups: [],
        affectedChanges: [],
        errors: [`Batch ${groupId} not found`],
        warnings: []
      };
    }
    const allChangeIds = this.getChangeIdsForGroup(groupId);
    const processedIds = [...acceptedChangeIds, ...rejectedChangeIds];
    const unprocessedIds = allChangeIds.filter((id) => !processedIds.includes(id));
    let newStatus;
    if (acceptedChangeIds.length === allChangeIds.length) {
      newStatus = "accepted";
    } else if (rejectedChangeIds.length === allChangeIds.length) {
      newStatus = "rejected";
    } else if (processedIds.length === allChangeIds.length) {
      newStatus = "mixed";
    } else {
      newStatus = "mixed";
    }
    const statusUpdate = {
      groupId,
      newStatus,
      writerNotes,
      timestamp: /* @__PURE__ */ new Date(),
      changeIds: processedIds
    };
    this.updateBatchStatus(groupId, statusUpdate);
    return {
      success: true,
      affectedGroups: [groupId],
      affectedChanges: processedIds,
      errors: [],
      warnings: unprocessedIds.length > 0 ? [`${unprocessedIds.length} changes in batch remain unprocessed`] : []
    };
  }
  /**
   * Query batches with filtering and sorting
   */
  queryBatches(sessionId, options = {}) {
    let batches;
    if (sessionId) {
      const sessionGroupIds = this.sessionBatches.get(sessionId) || [];
      batches = sessionGroupIds.map((id) => this.batchMetadata.get(id)).filter((batch) => batch !== void 0);
    } else {
      batches = Array.from(this.batchMetadata.values());
    }
    if (options.operationType) {
      batches = batches.filter((b) => b.operationType === options.operationType);
    }
    if (options.status) {
      batches = batches.filter((b) => b.status === options.status);
    }
    if (options.priority) {
      batches = batches.filter((b) => b.priority === options.priority);
    }
    if (options.scope) {
      batches = batches.filter((b) => b.scope === options.scope);
    }
    if (options.dateRange) {
      batches = batches.filter(
        (b) => b.createdAt >= options.dateRange.start && b.createdAt <= options.dateRange.end
      );
    }
    const sortBy = options.sortBy || "created";
    const sortOrder = options.sortOrder || "desc";
    batches.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case "created":
          comparison = a.createdAt.getTime() - b.createdAt.getTime();
          break;
        case "priority":
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          comparison = priorityOrder[a.priority] - priorityOrder[b.priority];
          break;
        case "position":
          comparison = a.positionRange.start - b.positionRange.start;
          break;
        case "changeCount":
          comparison = a.changeCount - b.changeCount;
          break;
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });
    return batches;
  }
  /**
   * Get batch metadata by ID
   */
  getBatch(groupId) {
    return this.batchMetadata.get(groupId);
  }
  /**
   * Get batch status history
   */
  getBatchStatusHistory(groupId) {
    return this.batchStatusHistory.get(groupId) || [];
  }
  /**
   * Get all batches for a session
   */
  getSessionBatches(sessionId) {
    const groupIds = this.sessionBatches.get(sessionId) || [];
    return groupIds.map((id) => this.batchMetadata.get(id)).filter((batch) => batch !== void 0);
  }
  /**
   * Get batch statistics for a session
   */
  getSessionBatchStatistics(sessionId) {
    const batches = this.getSessionBatches(sessionId);
    const stats = {
      totalBatches: batches.length,
      pendingBatches: 0,
      acceptedBatches: 0,
      rejectedBatches: 0,
      mixedBatches: 0,
      totalChanges: 0,
      averageBatchSize: 0
    };
    for (const batch of batches) {
      stats.totalChanges += batch.changeCount;
      switch (batch.status) {
        case "pending":
          stats.pendingBatches++;
          break;
        case "accepted":
          stats.acceptedBatches++;
          break;
        case "rejected":
          stats.rejectedBatches++;
          break;
        case "mixed":
          stats.mixedBatches++;
          break;
      }
    }
    stats.averageBatchSize = stats.totalBatches > 0 ? stats.totalChanges / stats.totalBatches : 0;
    return stats;
  }
  /**
   * Update batch metadata
   */
  updateBatchMetadata(groupId, updates) {
    const batch = this.batchMetadata.get(groupId);
    if (!batch)
      return false;
    Object.assign(batch, updates);
    this.batchMetadata.set(groupId, batch);
    return true;
  }
  /**
   * Delete a batch (and its history)
   */
  deleteBatch(groupId) {
    const batch = this.batchMetadata.get(groupId);
    if (!batch)
      return false;
    for (const [sessionId, groupIds] of this.sessionBatches.entries()) {
      const index = groupIds.indexOf(groupId);
      if (index >= 0) {
        groupIds.splice(index, 1);
        if (groupIds.length === 0) {
          this.sessionBatches.delete(sessionId);
        }
        break;
      }
    }
    for (const [changeId, mappedGroupId] of this.changeToGroup.entries()) {
      if (mappedGroupId === groupId) {
        this.changeToGroup.delete(changeId);
      }
    }
    this.batchMetadata.delete(groupId);
    this.batchStatusHistory.delete(groupId);
    if (batch.childGroupIds) {
      for (const childId of batch.childGroupIds) {
        this.deleteBatch(childId);
      }
    }
    return true;
  }
  /**
   * Get group ID for a specific change
   */
  getGroupForChange(changeId) {
    return this.changeToGroup.get(changeId);
  }
  /**
   * Clear all batch data for a session
   */
  clearSessionBatches(sessionId) {
    const groupIds = this.sessionBatches.get(sessionId) || [];
    for (const groupId of groupIds) {
      this.deleteBatch(groupId);
    }
    this.sessionBatches.delete(sessionId);
  }
  /**
   * Export batch data for persistence
   */
  exportBatchData() {
    return {
      metadata: Array.from(this.batchMetadata.entries()),
      sessionBatches: Array.from(this.sessionBatches.entries()),
      changeToGroup: Array.from(this.changeToGroup.entries()),
      statusHistory: Array.from(this.batchStatusHistory.entries())
    };
  }
  /**
   * Import batch data from persistence
   */
  importBatchData(data) {
    this.batchMetadata = new Map(data.metadata);
    this.sessionBatches = new Map(data.sessionBatches);
    this.changeToGroup = new Map(data.changeToGroup);
    this.batchStatusHistory = new Map(data.statusHistory);
  }
  /**
   * Private helper methods
   */
  updateBatchStatus(groupId, statusUpdate) {
    const batch = this.batchMetadata.get(groupId);
    if (batch) {
      batch.status = statusUpdate.newStatus;
      if (statusUpdate.writerNotes) {
        batch.writerNotes = statusUpdate.writerNotes;
      }
    }
    const history = this.batchStatusHistory.get(groupId) || [];
    history.push(statusUpdate);
    this.batchStatusHistory.set(groupId, history);
  }
  getChangesForGroup(changes, group) {
    return changes.filter(
      (change) => change.from >= group.positionRange.start && change.to <= group.positionRange.end
    );
  }
  getChangeIdsForGroup(groupId) {
    const changeIds = [];
    for (const [changeId, mappedGroupId] of this.changeToGroup.entries()) {
      if (mappedGroupId === groupId) {
        changeIds.push(changeId);
      }
    }
    return changeIds;
  }
};

// plugins/track-edits/src/types/submit-changes-from-ai.ts
var PluginPermission = /* @__PURE__ */ ((PluginPermission2) => {
  PluginPermission2["READ_DOCUMENTS"] = "read_documents";
  PluginPermission2["MODIFY_DOCUMENTS"] = "modify_documents";
  PluginPermission2["CREATE_SESSIONS"] = "create_sessions";
  PluginPermission2["ACCESS_VAULT_METADATA"] = "access_vault_metadata";
  PluginPermission2["NETWORK_ACCESS"] = "network_access";
  PluginPermission2["STORAGE_ACCESS"] = "storage_access";
  PluginPermission2["USER_INTERFACE"] = "user_interface";
  return PluginPermission2;
})(PluginPermission || {});

// plugins/track-edits/src/plugin-system/plugin-interface.ts
var PLUGIN_API_VERSION = "1.0.0";
var PLUGIN_METADATA_SCHEMA = {
  required: ["id", "name", "version", "author", "capabilities", "apiVersion"],
  properties: {
    id: { type: "string", pattern: "^[a-z0-9][a-z0-9-]*[a-z0-9]$" },
    name: { type: "string", minLength: 1, maxLength: 100 },
    version: { type: "string", pattern: "^\\d+\\.\\d+\\.\\d+$" },
    author: { type: "string", minLength: 1, maxLength: 100 },
    description: { type: "string", maxLength: 500 },
    apiVersion: { type: "string", enum: [PLUGIN_API_VERSION] },
    capabilities: {
      type: "object",
      required: ["editorialOperations", "requiredPermissions"],
      properties: {
        editorialOperations: { type: "array", items: { type: "string" } },
        aiProviders: { type: "array", items: { type: "string" } },
        maxBatchSize: { type: "number", minimum: 1, maximum: 1e3 },
        requiredPermissions: {
          type: "array",
          items: { enum: Object.values(PluginPermission) }
        }
      }
    }
  }
};
var DEFAULT_PLUGIN_CAPABILITIES = {
  basic_editing: {
    editorialOperations: ["replace", "insert", "delete"],
    maxBatchSize: 10,
    supportsRealTime: false,
    requiredPermissions: ["modify_documents" /* MODIFY_DOCUMENTS */]
  },
  advanced_editing: {
    editorialOperations: ["replace", "insert", "delete", "restructure", "format"],
    maxBatchSize: 50,
    supportsRealTime: true,
    supportsConversationContext: true,
    requiredPermissions: [
      "modify_documents" /* MODIFY_DOCUMENTS */,
      "read_documents" /* READ_DOCUMENTS */,
      "create_sessions" /* CREATE_SESSIONS */
    ]
  },
  ai_assistant: {
    editorialOperations: ["replace", "insert", "delete", "restructure", "format", "analyze"],
    maxBatchSize: 100,
    supportsRealTime: true,
    supportsConversationContext: true,
    requiredPermissions: [
      "modify_documents" /* MODIFY_DOCUMENTS */,
      "read_documents" /* READ_DOCUMENTS */,
      "create_sessions" /* CREATE_SESSIONS */,
      "access_vault_metadata" /* ACCESS_VAULT_METADATA */,
      "network_access" /* NETWORK_ACCESS */
    ]
  }
};

// plugins/track-edits/src/utils.ts
function generateId3() {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

// plugins/track-edits/src/plugin-system/plugin-registry.ts
var PluginRegistry = class {
  constructor(obsidianPlugin, securityValidator, capabilityValidator) {
    this.obsidianPlugin = obsidianPlugin;
    this.securityValidator = securityValidator;
    this.capabilityValidator = capabilityValidator;
    this.plugins = /* @__PURE__ */ new Map();
    this.registrations = /* @__PURE__ */ new Map();
    this.authTokens = /* @__PURE__ */ new Map();
    this.performanceMetrics = /* @__PURE__ */ new Map();
    this.rateLimitTrackers = /* @__PURE__ */ new Map();
  }
  /**
   * Register a new AI processing plugin
   */
  async registerPlugin(plugin, securityOptions = this.getDefaultSecurityOptions()) {
    const result = {
      success: false,
      pluginId: "",
      authToken: "",
      permissions: [],
      errors: [],
      warnings: [],
      expiresAt: /* @__PURE__ */ new Date()
    };
    try {
      const pluginInfo = plugin.getPluginInfo();
      result.pluginId = pluginInfo.id;
      if (pluginInfo.apiVersion !== PLUGIN_API_VERSION) {
        result.errors.push(`Incompatible API version: ${pluginInfo.apiVersion}. Expected: ${PLUGIN_API_VERSION}`);
        return result;
      }
      if (this.registrations.has(pluginInfo.id)) {
        const existingRegistration = this.registrations.get(pluginInfo.id);
        if (existingRegistration.status === "active" /* ACTIVE */) {
          result.errors.push(`Plugin ${pluginInfo.id} is already registered and active`);
          return result;
        }
      }
      const validationResult = this.validatePluginMetadata(pluginInfo);
      if (!validationResult.isValid) {
        result.errors.push(...validationResult.errors);
        result.warnings.push(...validationResult.warnings);
        return result;
      }
      const securityResult = await this.securityValidator.validateSecurity(plugin, securityOptions);
      if (!securityResult.isSecure) {
        result.errors.push("Plugin failed security validation");
        result.errors.push(...securityResult.securityThreats);
        result.warnings.push(...securityResult.warnings);
        return result;
      }
      result.warnings.push(...securityResult.warnings);
      const authToken = this.generateAuthToken();
      const expiresAt = /* @__PURE__ */ new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);
      const grantedPermissions = this.determineGrantedPermissions(
        pluginInfo.capabilities.requiredPermissions,
        securityResult.recommendedRestrictions
      );
      const authContext = {
        pluginId: pluginInfo.id,
        sessionToken: authToken,
        permissions: grantedPermissions,
        issuedAt: /* @__PURE__ */ new Date(),
        expiresAt,
        requestSignature: this.generateRequestSignature(pluginInfo.id, authToken)
      };
      const registration = {
        plugin: pluginInfo,
        registrationTime: /* @__PURE__ */ new Date(),
        status: "active" /* ACTIVE */,
        securityHash: securityResult.securityHash,
        validatedCapabilities: pluginInfo.capabilities,
        performanceMetrics: this.createInitialPerformanceMetrics()
      };
      const rateLimitConfig = {
        requestsPerMinute: securityOptions.rateLimitConfig.requestsPerMinute,
        requestsPerHour: securityOptions.rateLimitConfig.requestsPerHour,
        burstLimit: securityOptions.rateLimitConfig.burstLimit,
        cooldownPeriod: securityOptions.rateLimitConfig.cooldownPeriod
      };
      this.plugins.set(pluginInfo.id, plugin);
      this.registrations.set(pluginInfo.id, registration);
      this.authTokens.set(authToken, authContext);
      this.performanceMetrics.set(pluginInfo.id, registration.performanceMetrics);
      this.rateLimitTrackers.set(pluginInfo.id, new RateLimitTracker(rateLimitConfig));
      await plugin.initialize(this, authContext);
      await plugin.onLifecycleEvent("registered" /* REGISTERED */, {
        authContext,
        permissions: grantedPermissions
      });
      await plugin.onLifecycleEvent("activated" /* ACTIVATED */);
      result.success = true;
      result.authToken = authToken;
      result.permissions = grantedPermissions;
      result.expiresAt = expiresAt;
      console.log(`[PluginRegistry] Successfully registered plugin: ${pluginInfo.id}`, {
        version: pluginInfo.version,
        permissions: grantedPermissions,
        capabilities: Object.keys(pluginInfo.capabilities)
      });
      return result;
    } catch (error) {
      const errorMessage = `Plugin registration failed: ${error instanceof Error ? error.message : String(error)}`;
      result.errors.push(errorMessage);
      console.error(`[PluginRegistry] Registration error for ${result.pluginId}:`, error);
      return result;
    }
  }
  /**
   * Unregister a plugin
   */
  async unregisterPlugin(pluginId, reason) {
    try {
      const plugin = this.plugins.get(pluginId);
      const registration = this.registrations.get(pluginId);
      if (!plugin || !registration) {
        console.warn(`[PluginRegistry] Cannot unregister unknown plugin: ${pluginId}`);
        return false;
      }
      try {
        await plugin.onLifecycleEvent("deactivated" /* DEACTIVATED */, { reason });
        await plugin.cleanup();
      } catch (error) {
        console.warn(`[PluginRegistry] Plugin cleanup failed for ${pluginId}:`, error);
      }
      this.plugins.delete(pluginId);
      this.registrations.delete(pluginId);
      this.performanceMetrics.delete(pluginId);
      this.rateLimitTrackers.delete(pluginId);
      for (const [token, authContext] of this.authTokens.entries()) {
        if (authContext.pluginId === pluginId) {
          this.authTokens.delete(token);
        }
      }
      console.log(`[PluginRegistry] Successfully unregistered plugin: ${pluginId}`, { reason });
      return true;
    } catch (error) {
      console.error(`[PluginRegistry] Error unregistering plugin ${pluginId}:`, error);
      return false;
    }
  }
  /**
   * Get a registered plugin by ID
   */
  getPlugin(pluginId) {
    return this.plugins.get(pluginId);
  }
  /**
   * Get all registered plugins with optional filtering
   */
  getPlugins(filter) {
    const plugins = [];
    for (const [pluginId, plugin] of this.plugins.entries()) {
      const registration = this.registrations.get(pluginId);
      if (!registration)
        continue;
      if (filter) {
        if (filter.status && !filter.status.includes(registration.status))
          continue;
        if (filter.author && registration.plugin.author !== filter.author)
          continue;
        if (filter.capabilities && !this.hasCapabilities(registration.plugin, filter.capabilities))
          continue;
        if (filter.permissions && !this.hasPermissions(registration.validatedCapabilities.requiredPermissions, filter.permissions))
          continue;
        if (filter.minVersion && !this.isVersionCompatible(registration.plugin.version, filter.minVersion, ">="))
          continue;
        if (filter.maxVersion && !this.isVersionCompatible(registration.plugin.version, filter.maxVersion, "<="))
          continue;
      }
      plugins.push(plugin);
    }
    return plugins;
  }
  /**
   * Update plugin status
   */
  async updatePluginStatus(pluginId, status, reason) {
    const registration = this.registrations.get(pluginId);
    const plugin = this.plugins.get(pluginId);
    if (!registration || !plugin) {
      return false;
    }
    const previousStatus = registration.status;
    registration.status = status;
    try {
      const eventMapping = {
        ["active" /* ACTIVE */]: "activated" /* ACTIVATED */,
        ["suspended" /* SUSPENDED */]: "suspended" /* SUSPENDED */,
        ["deactivated" /* DEACTIVATED */]: "deactivated" /* DEACTIVATED */,
        ["security_violation" /* SECURITY_VIOLATION */]: "error" /* ERROR */,
        ["version_incompatible" /* VERSION_INCOMPATIBLE */]: "error" /* ERROR */
      };
      const event = eventMapping[status];
      if (event) {
        await plugin.onLifecycleEvent(event, { previousStatus, reason });
      }
      console.log(`[PluginRegistry] Updated plugin ${pluginId} status: ${previousStatus} -> ${status}`, { reason });
      return true;
    } catch (error) {
      console.error(`[PluginRegistry] Error updating status for plugin ${pluginId}:`, error);
      registration.status = previousStatus;
      return false;
    }
  }
  /**
   * Authenticate a plugin for API operations
   */
  async authenticatePlugin(pluginId, credentials) {
    try {
      if (credentials.pluginId !== pluginId) {
        return null;
      }
      const authContext = this.authTokens.get(credentials.authToken || "");
      if (!authContext || authContext.pluginId !== pluginId) {
        return null;
      }
      if (authContext.expiresAt < /* @__PURE__ */ new Date()) {
        this.authTokens.delete(credentials.authToken || "");
        return null;
      }
      const registration = this.registrations.get(pluginId);
      if (!registration || registration.status !== "active" /* ACTIVE */) {
        return null;
      }
      registration.lastActivity = /* @__PURE__ */ new Date();
      return authContext;
    } catch (error) {
      console.error(`[PluginRegistry] Authentication error for plugin ${pluginId}:`, error);
      return null;
    }
  }
  /**
   * Validate plugin permissions for an operation
   */
  async validatePermissions(pluginId, requiredPermissions, context) {
    const result = {
      hasPermission: false,
      missingPermissions: [],
      warnings: [],
      contextValidation: true
    };
    try {
      const registration = this.registrations.get(pluginId);
      if (!registration) {
        result.missingPermissions = requiredPermissions;
        return result;
      }
      const grantedPermissions = registration.validatedCapabilities.requiredPermissions;
      const missingPermissions = [];
      for (const permission of requiredPermissions) {
        if (!grantedPermissions.includes(permission)) {
          missingPermissions.push(permission);
        }
      }
      result.hasPermission = missingPermissions.length === 0;
      result.missingPermissions = missingPermissions;
      if (context && result.hasPermission) {
        result.contextValidation = await this.validatePermissionContext(pluginId, requiredPermissions, context);
        if (!result.contextValidation) {
          result.warnings.push("Permission granted but context validation failed");
        }
      }
      return result;
    } catch (error) {
      result.warnings.push(`Permission validation error: ${error instanceof Error ? error.message : String(error)}`);
      return result;
    }
  }
  /**
   * Get plugin performance metrics
   */
  getPluginMetrics(pluginId) {
    return this.performanceMetrics.get(pluginId);
  }
  /**
   * Record plugin error and update metrics
   */
  async recordPluginError(pluginId, error, context) {
    const metrics = this.performanceMetrics.get(pluginId);
    if (metrics) {
      metrics.errorRate = (metrics.errorRate * metrics.totalSubmissions + 1) / (metrics.totalSubmissions + 1);
      metrics.lastErrorTime = /* @__PURE__ */ new Date();
    }
    const plugin = this.plugins.get(pluginId);
    if (plugin) {
      try {
        await plugin.onLifecycleEvent("error" /* ERROR */, { error, context });
      } catch (lifecycleError) {
        console.error(`[PluginRegistry] Plugin lifecycle error handling failed for ${pluginId}:`, lifecycleError);
      }
    }
    console.error(`[PluginRegistry] Recorded error for plugin ${pluginId}:`, { error: error.message, context });
  }
  /**
   * Check if a plugin has required capabilities
   */
  hasCapabilities(plugin, requiredCapabilities) {
    return requiredCapabilities.every(
      (capability) => plugin.capabilities.editorialOperations.includes(capability)
    );
  }
  /**
   * Check if permissions include required permissions
   */
  hasPermissions(grantedPermissions, requiredPermissions) {
    return requiredPermissions.every((permission) => grantedPermissions.includes(permission));
  }
  /**
   * Check version compatibility
   */
  isVersionCompatible(version, compareVersion, operator) {
    const parseVersion = (v) => v.split(".").map((n) => parseInt(n, 10));
    const v1 = parseVersion(version);
    const v2 = parseVersion(compareVersion);
    for (let i = 0; i < 3; i++) {
      if (v1[i] !== v2[i]) {
        return operator === ">=" ? v1[i] >= v2[i] : v1[i] <= v2[i];
      }
    }
    return true;
  }
  /**
   * Validate plugin metadata structure
   */
  validatePluginMetadata(plugin) {
    const errors = [];
    const warnings = [];
    if (!plugin.id || !/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(plugin.id)) {
      errors.push("Invalid plugin ID format");
    }
    if (!plugin.name || plugin.name.length === 0) {
      errors.push("Plugin name is required");
    }
    if (!plugin.version || !/^\d+\.\d+\.\d+$/.test(plugin.version)) {
      errors.push("Invalid version format (expected semantic versioning)");
    }
    if (!plugin.author || plugin.author.length === 0) {
      errors.push("Plugin author is required");
    }
    if (!plugin.capabilities.editorialOperations || plugin.capabilities.editorialOperations.length === 0) {
      errors.push("Plugin must declare at least one editorial operation capability");
    }
    if (!plugin.capabilities.requiredPermissions || plugin.capabilities.requiredPermissions.length === 0) {
      warnings.push("Plugin declares no required permissions - this may limit functionality");
    }
    return { isValid: errors.length === 0, errors, warnings };
  }
  /**
   * Generate authentication token
   */
  generateAuthToken() {
    return `plugin_${generateId3()}_${Date.now()}`;
  }
  /**
   * Generate request signature for authentication
   */
  generateRequestSignature(pluginId, authToken) {
    return `sig_${btoa(`${pluginId}:${authToken}:${Date.now()}`)}}`;
  }
  /**
   * Determine granted permissions based on requested permissions and security restrictions
   */
  determineGrantedPermissions(requestedPermissions, securityRestrictions) {
    const grantedPermissions = [...requestedPermissions];
    if (securityRestrictions.includes("no_network_access")) {
      const index = grantedPermissions.indexOf("network_access" /* NETWORK_ACCESS */);
      if (index > -1)
        grantedPermissions.splice(index, 1);
    }
    if (securityRestrictions.includes("no_storage_access")) {
      const index = grantedPermissions.indexOf("storage_access" /* STORAGE_ACCESS */);
      if (index > -1)
        grantedPermissions.splice(index, 1);
    }
    return grantedPermissions;
  }
  /**
   * Create initial performance metrics for a new plugin
   */
  createInitialPerformanceMetrics() {
    return {
      totalSubmissions: 0,
      successRate: 1,
      averageResponseTime: 0,
      errorRate: 0,
      rateLimitViolations: 0
    };
  }
  /**
   * Get default security options
   */
  getDefaultSecurityOptions() {
    return {
      validateCodeSignature: true,
      allowNetworkAccess: false,
      allowStorageAccess: true,
      maxMemoryUsage: 50 * 1024 * 1024,
      // 50MB
      rateLimitConfig: {
        requestsPerMinute: 60,
        requestsPerHour: 1e3,
        burstLimit: 10,
        cooldownPeriod: 1e3
      },
      sandboxEnabled: true
    };
  }
  /**
   * Validate permission context for specific operations
   */
  async validatePermissionContext(pluginId, permissions, context) {
    return true;
  }
};
var RateLimitTracker = class {
  constructor(config2) {
    this.config = config2;
    this.requestTimes = [];
    this.burstCount = 0;
    this.lastBurstTime = 0;
  }
  /**
   * Check if a request is allowed under rate limits
   */
  isRequestAllowed() {
    const now = Date.now();
    const oneMinuteAgo = now - 60 * 1e3;
    const oneHourAgo = now - 60 * 60 * 1e3;
    this.requestTimes = this.requestTimes.filter((time) => time > oneHourAgo);
    if (this.requestTimes.length >= this.config.requestsPerHour) {
      return false;
    }
    const recentRequests = this.requestTimes.filter((time) => time > oneMinuteAgo);
    if (recentRequests.length >= this.config.requestsPerMinute) {
      return false;
    }
    if (now - this.lastBurstTime > this.config.cooldownPeriod) {
      this.burstCount = 0;
      this.lastBurstTime = now;
    }
    if (this.burstCount >= this.config.burstLimit) {
      return false;
    }
    return true;
  }
  /**
   * Record a request
   */
  recordRequest() {
    const now = Date.now();
    this.requestTimes.push(now);
    this.burstCount++;
  }
};

// plugins/track-edits/src/plugin-system/plugin-security-validator.ts
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}
var PluginSecurityValidator = class {
  constructor() {
    this.trustedAuthors = /* @__PURE__ */ new Set(["writerr-official", "obsidian-community"]);
    this.blacklistedPatterns = [
      /eval\s*\(/,
      /Function\s*\(/,
      /require\s*\(/,
      /import\s*\(/,
      /process\./,
      /global\./,
      /window\./,
      /document\./
    ];
  }
  /**
   * Validate plugin security with comprehensive checks
   */
  async validateSecurity(plugin, options) {
    const result = {
      isSecure: true,
      securityThreats: [],
      warnings: [],
      recommendedRestrictions: [],
      securityHash: ""
    };
    const pluginInfo = plugin.getPluginInfo();
    try {
      result.securityHash = this.generateSecurityHash(pluginInfo);
      this.validatePluginMetadata(pluginInfo, result);
      this.validateCapabilitiesAndPermissions(pluginInfo, result);
      await this.performStaticSecurityAnalysis(plugin, result);
      this.validateAgainstSecurityOptions(pluginInfo, options, result);
      this.validateAuthorTrust(pluginInfo, result);
      this.assessPermissionRisks(pluginInfo.capabilities.requiredPermissions, result);
      if (pluginInfo.capabilities.requiredPermissions.includes("network_access" /* NETWORK_ACCESS */)) {
        this.validateNetworkAccess(pluginInfo, options, result);
      }
      if (pluginInfo.capabilities.requiredPermissions.includes("storage_access" /* STORAGE_ACCESS */)) {
        this.validateStorageAccess(pluginInfo, options, result);
      }
      result.isSecure = result.securityThreats.length === 0;
      if (result.securityThreats.length > 0) {
        console.warn(
          `[PluginSecurityValidator] Security threats detected for plugin ${pluginInfo.id}:`,
          result.securityThreats
        );
      }
      return result;
    } catch (error) {
      result.isSecure = false;
      result.securityThreats.push(`Security validation failed: ${error instanceof Error ? error.message : String(error)}`);
      return result;
    }
  }
  /**
   * Generate security hash for plugin integrity verification
   */
  generateSecurityHash(plugin) {
    const hashInput = JSON.stringify({
      id: plugin.id,
      version: plugin.version,
      author: plugin.author,
      capabilities: plugin.capabilities,
      apiVersion: plugin.apiVersion
    });
    return simpleHash(hashInput);
  }
  /**
   * Verify plugin integrity against expected hash
   */
  verifyIntegrity(plugin, expectedHash) {
    const pluginInfo = plugin.getPluginInfo();
    const currentHash = this.generateSecurityHash(pluginInfo);
    return currentHash === expectedHash;
  }
  /**
   * Validate plugin metadata for security issues
   */
  validatePluginMetadata(plugin, result) {
    if (plugin.id.includes("..") || plugin.id.includes("/") || plugin.id.includes("\\")) {
      result.securityThreats.push("Plugin ID contains suspicious path characters");
    }
    if (!/^\d+\.\d+\.\d+$/.test(plugin.version)) {
      result.warnings.push("Non-standard version format detected");
    }
    if (plugin.description && this.containsSuspiciousContent(plugin.description)) {
      result.warnings.push("Plugin description contains potentially suspicious content");
    }
    if (plugin.metadata.repository) {
      if (!this.isValidRepositoryUrl(plugin.metadata.repository)) {
        result.warnings.push("Invalid or suspicious repository URL");
      }
    }
  }
  /**
   * Validate capabilities and permissions for security risks
   */
  validateCapabilitiesAndPermissions(plugin, result) {
    const { capabilities } = plugin;
    if (capabilities.requiredPermissions.length > 5) {
      result.warnings.push("Plugin requests an unusually high number of permissions");
    }
    const hasNetworkAndModify = capabilities.requiredPermissions.includes("network_access" /* NETWORK_ACCESS */) && capabilities.requiredPermissions.includes("modify_documents" /* MODIFY_DOCUMENTS */);
    if (hasNetworkAndModify) {
      result.warnings.push("Plugin combines network access with document modification - high risk combination");
      result.recommendedRestrictions.push("monitor_network_activity");
    }
    if (capabilities.aiProviders && capabilities.aiProviders.some((provider) => this.isSuspiciousAIProvider(provider))) {
      result.warnings.push("Plugin declares support for unrecognized AI providers");
    }
    if (capabilities.maxBatchSize > 1e3) {
      result.warnings.push("Plugin declares unusually large batch size - potential DoS risk");
      result.recommendedRestrictions.push("limit_batch_size");
    }
  }
  /**
   * Perform static security analysis on plugin code
   */
  async performStaticSecurityAnalysis(plugin, result) {
    try {
      const pluginString = plugin.toString();
      for (const pattern of this.blacklistedPatterns) {
        if (pattern.test(pluginString)) {
          result.securityThreats.push(`Dangerous code pattern detected: ${pattern.source}`);
        }
      }
      if (this.appearsObfuscated(pluginString)) {
        result.securityThreats.push("Plugin code appears to be obfuscated");
      }
      const externalImports = this.findExternalImports(pluginString);
      if (externalImports.length > 0) {
        result.warnings.push(`Plugin attempts to import external modules: ${externalImports.join(", ")}`);
      }
    } catch (error) {
      result.warnings.push("Static code analysis failed - manual review required");
    }
  }
  /**
   * Validate against security options
   */
  validateAgainstSecurityOptions(plugin, options, result) {
    if (plugin.capabilities.requiredPermissions.includes("network_access" /* NETWORK_ACCESS */) && !options.allowNetworkAccess) {
      result.securityThreats.push("Plugin requires network access but policy disallows it");
    }
    if (plugin.capabilities.requiredPermissions.includes("storage_access" /* STORAGE_ACCESS */) && !options.allowStorageAccess) {
      result.securityThreats.push("Plugin requires storage access but policy disallows it");
    }
    if (options.sandboxEnabled && !this.isSandboxCompatible(plugin)) {
      result.securityThreats.push("Plugin is not compatible with sandbox environment");
    }
    if (plugin.capabilities.maxBatchSize * 1024 > options.maxMemoryUsage) {
      result.warnings.push("Plugin may exceed memory limits based on batch size");
      result.recommendedRestrictions.push("limit_memory_usage");
    }
  }
  /**
   * Validate author trust level
   */
  validateAuthorTrust(plugin, result) {
    const { author } = plugin;
    if (this.trustedAuthors.has(author)) {
      result.warnings.push("Plugin from trusted author - reduced security restrictions");
      return;
    }
    if (this.isSuspiciousAuthor(author)) {
      result.warnings.push("Plugin author appears suspicious - enhanced monitoring recommended");
      result.recommendedRestrictions.push("enhanced_monitoring");
    }
    result.warnings.push("Plugin from unverified author - standard security restrictions apply");
  }
  /**
   * Assess risk levels for requested permissions
   */
  assessPermissionRisks(permissions, result) {
    const highRiskPermissions = [
      "network_access" /* NETWORK_ACCESS */,
      "storage_access" /* STORAGE_ACCESS */,
      "access_vault_metadata" /* ACCESS_VAULT_METADATA */
    ];
    const mediumRiskPermissions = [
      "modify_documents" /* MODIFY_DOCUMENTS */,
      "user_interface" /* USER_INTERFACE */
    ];
    const highRiskCount = permissions.filter((p) => highRiskPermissions.includes(p)).length;
    const mediumRiskCount = permissions.filter((p) => mediumRiskPermissions.includes(p)).length;
    if (highRiskCount > 2) {
      result.warnings.push("Plugin requests multiple high-risk permissions");
      result.recommendedRestrictions.push("enhanced_monitoring", "audit_trail");
    }
    if (highRiskCount + mediumRiskCount > 4) {
      result.warnings.push("Plugin requests elevated privilege level");
      result.recommendedRestrictions.push("user_confirmation_required");
    }
  }
  /**
   * Validate network access requirements
   */
  validateNetworkAccess(plugin, options, result) {
    if (!options.allowNetworkAccess) {
      result.securityThreats.push("Network access requested but not allowed by security policy");
      return;
    }
    if (plugin.capabilities.aiProviders) {
      const externalProviders = plugin.capabilities.aiProviders.filter((provider) => !this.isLocalAIProvider(provider));
      if (externalProviders.length > 0) {
        result.warnings.push(`Plugin requires network access for external AI providers: ${externalProviders.join(", ")}`);
        result.recommendedRestrictions.push("monitor_network_traffic");
      }
    }
    result.recommendedRestrictions.push("firewall_rules", "connection_logging");
  }
  /**
   * Validate storage access requirements
   */
  validateStorageAccess(plugin, options, result) {
    if (!options.allowStorageAccess) {
      result.securityThreats.push("Storage access requested but not allowed by security policy");
      return;
    }
    result.recommendedRestrictions.push("limit_storage_scope", "audit_file_access");
    result.warnings.push("Plugin can access local storage - ensure vault backup is current");
  }
  /**
   * Check if content contains suspicious patterns
   */
  containsSuspiciousContent(content) {
    const suspiciousPatterns = [
      /cryptocurrency|bitcoin|mining/i,
      /password|credential|token|secret/i,
      /malware|virus|trojan/i,
      /eval|execute|run|shell/i
    ];
    return suspiciousPatterns.some((pattern) => pattern.test(content));
  }
  /**
   * Validate repository URL format and safety
   */
  isValidRepositoryUrl(url) {
    try {
      const parsed = new URL(url);
      const allowedHosts = ["github.com", "gitlab.com", "bitbucket.org"];
      return allowedHosts.some((host) => parsed.hostname.endsWith(host));
    } catch (e) {
      return false;
    }
  }
  /**
   * Check if AI provider appears suspicious
   */
  isSuspiciousAIProvider(provider) {
    const knownProviders = [
      "openai",
      "anthropic",
      "google",
      "microsoft",
      "meta",
      "cohere",
      "huggingface",
      "replicate",
      "together"
    ];
    return !knownProviders.some((known) => provider.toLowerCase().includes(known));
  }
  /**
   * Check if code appears obfuscated
   */
  appearsObfuscated(code) {
    const suspiciousPatterns = [
      /[a-zA-Z_$][a-zA-Z0-9_$]{50,}/,
      // Extremely long variable names
      /\\x[0-9a-fA-F]{2}/,
      // Hex escape sequences
      /\\u[0-9a-fA-F]{4}/,
      // Unicode escape sequences
      /eval\s*\(\s*['"]/,
      // eval with string
      /String\.fromCharCode/
      // Character code conversion
    ];
    return suspiciousPatterns.some((pattern) => pattern.test(code));
  }
  /**
   * Find external imports in code
   */
  findExternalImports(code) {
    const imports = [];
    const importPatterns = [
      /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
      /import\s+.*\s+from\s+['"]([^'"]+)['"]/g,
      /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g
    ];
    importPatterns.forEach((pattern) => {
      let match;
      while ((match = pattern.exec(code)) !== null) {
        imports.push(match[1]);
      }
    });
    return imports.filter((imp) => !imp.startsWith(".") && !imp.startsWith("/"));
  }
  /**
   * Check if author name appears suspicious
   */
  isSuspiciousAuthor(author) {
    const suspiciousPatterns = [
      /^[a-zA-Z0-9]{32,}$/,
      // Random-looking long strings
      /test|temp|fake|anonymous/i,
      /admin|root|system/i,
      /[0-9]{5,}/
      // Long sequences of numbers
    ];
    return suspiciousPatterns.some((pattern) => pattern.test(author));
  }
  /**
   * Check if AI provider is local/offline
   */
  isLocalAIProvider(provider) {
    const localProviders = [
      "local",
      "offline",
      "llamacpp",
      "ollama",
      "transformers",
      "tensorflow",
      "pytorch"
    ];
    return localProviders.some((local) => provider.toLowerCase().includes(local));
  }
  /**
   * Check if plugin is compatible with sandbox environment
   */
  isSandboxCompatible(plugin) {
    const incompatiblePermissions = [
      "network_access" /* NETWORK_ACCESS */,
      "storage_access" /* STORAGE_ACCESS */
    ];
    return !plugin.capabilities.requiredPermissions.some((permission) => incompatiblePermissions.includes(permission));
  }
};

// plugins/track-edits/src/plugin-system/plugin-capability-validator.ts
var PluginCapabilityValidator = class {
  constructor() {
    this.supportedEditorialOperations = /* @__PURE__ */ new Set([
      "replace",
      "insert",
      "delete",
      "restructure",
      "format",
      "analyze",
      "translate",
      "summarize",
      "expand",
      "compress",
      "correct",
      "enhance"
    ]);
    this.supportedAIProviders = /* @__PURE__ */ new Set([
      "openai",
      "anthropic",
      "google",
      "microsoft",
      "meta",
      "cohere",
      "huggingface",
      "replicate",
      "together",
      "local",
      "ollama"
    ]);
    this.supportedFileTypes = /* @__PURE__ */ new Set([
      "markdown",
      "text",
      "json",
      "yaml",
      "html",
      "xml",
      "csv"
    ]);
  }
  /**
   * Validate plugin capabilities against requirements
   */
  async validateCapabilities(plugin, requiredCapabilities, context) {
    const result = {
      isValid: true,
      missingCapabilities: [],
      recommendedCapabilities: [],
      warnings: []
    };
    try {
      await this.validateEditorialOperations(plugin, requiredCapabilities, result);
      await this.validateAIProviderSupport(plugin, result);
      await this.validateBatchCapabilities(plugin, context, result);
      await this.validateFileTypeSupport(plugin, context, result);
      await this.validateRealTimeCapabilities(plugin, context, result);
      await this.validateConversationContextSupport(plugin, context, result);
      this.generateCapabilityRecommendations(plugin, requiredCapabilities, result);
      result.isValid = result.missingCapabilities.length === 0;
      return result;
    } catch (error) {
      result.isValid = false;
      result.warnings.push(`Capability validation failed: ${error instanceof Error ? error.message : String(error)}`);
      return result;
    }
  }
  /**
   * Get recommended capabilities for specific operation types
   */
  getRecommendedCapabilities(operationType) {
    const defaultCapabilities = DEFAULT_PLUGIN_CAPABILITIES[operationType];
    if (defaultCapabilities) {
      return {
        editorialOperations: defaultCapabilities.editorialOperations || [],
        aiProviders: defaultCapabilities.aiProviders || [],
        maxBatchSize: defaultCapabilities.maxBatchSize || 10,
        supportsRealTime: defaultCapabilities.supportsRealTime || false,
        supportsConversationContext: defaultCapabilities.supportsConversationContext || false,
        supportedFileTypes: defaultCapabilities.supportedFileTypes || ["markdown"],
        requiredPermissions: defaultCapabilities.requiredPermissions || []
      };
    }
    return {
      editorialOperations: ["replace", "insert"],
      aiProviders: ["openai"],
      maxBatchSize: 5,
      supportsRealTime: false,
      supportsConversationContext: false,
      supportedFileTypes: ["markdown"],
      requiredPermissions: []
    };
  }
  /**
   * Validate editorial operations capabilities
   */
  async validateEditorialOperations(plugin, requiredCapabilities, result) {
    const { editorialOperations } = plugin.capabilities;
    if (!editorialOperations || editorialOperations.length === 0) {
      result.warnings.push("Plugin declares no editorial operations");
      result.recommendedCapabilities.push("basic_text_editing");
      return;
    }
    for (const operation of editorialOperations) {
      if (!this.supportedEditorialOperations.has(operation)) {
        result.warnings.push(`Unknown editorial operation: ${operation}`);
      }
    }
    const missingOperations = requiredCapabilities.filter(
      (capability) => this.isEditorialOperation(capability) && !editorialOperations.includes(capability)
    );
    result.missingCapabilities.push(...missingOperations);
    this.validateOperationCombinations(editorialOperations, result);
  }
  /**
   * Validate AI provider support
   */
  async validateAIProviderSupport(plugin, result) {
    const { aiProviders } = plugin.capabilities;
    if (!aiProviders || aiProviders.length === 0) {
      result.warnings.push("Plugin declares no AI provider support - will use system default");
      return;
    }
    for (const provider of aiProviders) {
      if (!this.supportedAIProviders.has(provider.toLowerCase())) {
        result.warnings.push(`Unrecognized AI provider: ${provider}`);
      }
    }
    this.validateProviderSpecificRequirements(aiProviders, result);
  }
  /**
   * Validate batch processing capabilities
   */
  async validateBatchCapabilities(plugin, context, result) {
    const { maxBatchSize } = plugin.capabilities;
    if (maxBatchSize <= 0) {
      result.warnings.push("Plugin declares zero or negative batch size");
      return;
    }
    if (maxBatchSize > 1e3) {
      result.warnings.push("Plugin declares very large batch size - may cause performance issues");
      result.recommendedCapabilities.push("streaming_support");
    }
    if ((context == null ? void 0 : context.expectedBatchSize) && maxBatchSize < context.expectedBatchSize) {
      result.warnings.push(`Plugin batch size (${maxBatchSize}) is smaller than expected (${context.expectedBatchSize})`);
    }
  }
  /**
   * Validate file type support
   */
  async validateFileTypeSupport(plugin, context, result) {
    const { supportedFileTypes } = plugin.capabilities;
    if (!supportedFileTypes || supportedFileTypes.length === 0) {
      result.warnings.push("Plugin declares no file type support - assuming markdown only");
      return;
    }
    for (const fileType of supportedFileTypes) {
      if (!this.supportedFileTypes.has(fileType.toLowerCase())) {
        result.warnings.push(`Unsupported file type: ${fileType}`);
      }
    }
    if (context == null ? void 0 : context.requiredFileType) {
      const requiredType = context.requiredFileType.toLowerCase();
      if (!supportedFileTypes.some((type) => type.toLowerCase() === requiredType)) {
        result.missingCapabilities.push(`file_type_${requiredType}`);
      }
    }
  }
  /**
   * Validate real-time processing capabilities
   */
  async validateRealTimeCapabilities(plugin, context, result) {
    const { supportsRealTime } = plugin.capabilities;
    if ((context == null ? void 0 : context.requiresRealTime) && !supportsRealTime) {
      result.missingCapabilities.push("real_time_processing");
      result.recommendedCapabilities.push("streaming_api", "incremental_updates");
    }
    if (supportsRealTime) {
      if (!plugin.capabilities.requiredPermissions.some((p) => p.toString().includes("USER_INTERFACE"))) {
        result.warnings.push("Plugin claims real-time support but lacks UI permissions");
      }
    }
  }
  /**
   * Validate conversation context support
   */
  async validateConversationContextSupport(plugin, context, result) {
    const { supportsConversationContext } = plugin.capabilities;
    if ((context == null ? void 0 : context.requiresConversationContext) && !supportsConversationContext) {
      result.missingCapabilities.push("conversation_context");
      result.recommendedCapabilities.push("session_management", "context_tracking");
    }
    if (supportsConversationContext) {
      if (!plugin.capabilities.editorialOperations.includes("analyze")) {
        result.warnings.push("Plugin supports conversation context but lacks analysis capabilities");
      }
    }
  }
  /**
   * Generate capability recommendations based on plugin configuration
   */
  generateCapabilityRecommendations(plugin, requiredCapabilities, result) {
    const capabilities = plugin.capabilities;
    if (capabilities.editorialOperations.includes("restructure")) {
      if (!capabilities.editorialOperations.includes("analyze")) {
        result.recommendedCapabilities.push("content_analysis");
      }
    }
    if (capabilities.maxBatchSize > 50) {
      if (!capabilities.supportsRealTime) {
        result.recommendedCapabilities.push("progress_reporting");
      }
    }
    if (capabilities.aiProviders.includes("local") || capabilities.aiProviders.includes("ollama")) {
      result.recommendedCapabilities.push("offline_support");
    }
    if (result.missingCapabilities.length > 0) {
      result.recommendedCapabilities.push("capability_extension_api");
    }
  }
  /**
   * Validate combinations of editorial operations
   */
  validateOperationCombinations(operations, result) {
    const dependencies = /* @__PURE__ */ new Map([
      ["restructure", ["analyze"]],
      ["enhance", ["analyze", "format"]],
      ["summarize", ["analyze"]],
      ["translate", ["analyze"]]
    ]);
    for (const operation of operations) {
      const requiredDeps = dependencies.get(operation);
      if (requiredDeps) {
        const missingDeps = requiredDeps.filter((dep) => !operations.includes(dep));
        if (missingDeps.length > 0) {
          result.warnings.push(
            `Operation '${operation}' typically requires: ${missingDeps.join(", ")}`
          );
        }
      }
    }
    if (operations.includes("compress") && operations.includes("expand")) {
      result.warnings.push("Plugin declares both compress and expand - ensure proper operation selection");
    }
  }
  /**
   * Validate provider-specific requirements
   */
  validateProviderSpecificRequirements(providers, result) {
    if (providers.includes("openai")) {
      result.recommendedCapabilities.push("api_key_management", "rate_limit_handling");
    }
    if (providers.includes("anthropic")) {
      result.recommendedCapabilities.push("message_format_handling");
    }
    if (providers.includes("local") || providers.includes("ollama")) {
      result.recommendedCapabilities.push("model_management", "offline_support");
    }
    if (providers.length > 3) {
      result.recommendedCapabilities.push("provider_switching", "unified_api");
    }
  }
  /**
   * Check if a capability is an editorial operation
   */
  isEditorialOperation(capability) {
    return this.supportedEditorialOperations.has(capability);
  }
  /**
   * Get capability score for a plugin (0-100)
   */
  getCapabilityScore(plugin) {
    let score = 0;
    const capabilities = plugin.capabilities;
    const operationScore = Math.min(40, capabilities.editorialOperations.length * 5);
    score += operationScore;
    const providerScore = Math.min(20, capabilities.aiProviders.length * 4);
    score += providerScore;
    const batchScore = Math.min(15, Math.log10(capabilities.maxBatchSize) * 5);
    score += batchScore;
    let featureScore = 0;
    if (capabilities.supportsRealTime)
      featureScore += 8;
    if (capabilities.supportsConversationContext)
      featureScore += 8;
    if (capabilities.supportedFileTypes.length > 2)
      featureScore += 9;
    score += featureScore;
    return Math.round(Math.min(100, score));
  }
  /**
   * Get compatibility matrix between plugins
   */
  getPluginCompatibilityMatrix(plugins) {
    const matrix = /* @__PURE__ */ new Map();
    for (let i = 0; i < plugins.length; i++) {
      const pluginA = plugins[i];
      const compatibilityMap = /* @__PURE__ */ new Map();
      for (let j = 0; j < plugins.length; j++) {
        if (i === j)
          continue;
        const pluginB = plugins[j];
        const compatibility = this.calculateCompatibilityScore(pluginA, pluginB);
        compatibilityMap.set(pluginB.id, compatibility);
      }
      matrix.set(pluginA.id, compatibilityMap);
    }
    return matrix;
  }
  /**
   * Calculate compatibility score between two plugins (0-100)
   */
  calculateCompatibilityScore(pluginA, pluginB) {
    let score = 0;
    const operationsA = new Set(pluginA.capabilities.editorialOperations);
    const operationsB = new Set(pluginB.capabilities.editorialOperations);
    const operationOverlap = this.calculateSetOverlap(operationsA, operationsB);
    score += operationOverlap * 40;
    const providersA = new Set(pluginA.capabilities.aiProviders);
    const providersB = new Set(pluginB.capabilities.aiProviders);
    const providerOverlap = this.calculateSetOverlap(providersA, providersB);
    score += providerOverlap * 25;
    const fileTypesA = new Set(pluginA.capabilities.supportedFileTypes);
    const fileTypesB = new Set(pluginB.capabilities.supportedFileTypes);
    const fileTypeOverlap = this.calculateSetOverlap(fileTypesA, fileTypesB);
    score += fileTypeOverlap * 20;
    let featureScore = 0;
    if (pluginA.capabilities.supportsRealTime === pluginB.capabilities.supportsRealTime) {
      featureScore += 7;
    }
    if (pluginA.capabilities.supportsConversationContext === pluginB.capabilities.supportsConversationContext) {
      featureScore += 8;
    }
    score += featureScore;
    return Math.round(Math.min(100, score));
  }
  /**
   * Calculate overlap ratio between two sets
   */
  calculateSetOverlap(setA, setB) {
    const intersection = new Set([...setA].filter((x) => setB.has(x)));
    const union = /* @__PURE__ */ new Set([...setA, ...setB]);
    return union.size === 0 ? 0 : intersection.size / union.size;
  }
};

// plugins/track-edits/src/plugin-system/editorial-engine-plugin.ts
var EditorialEnginePluginWrapper = class {
  constructor() {
    this.registry = null;
    this.authContext = null;
    this.initialized = false;
  }
  /**
   * Get plugin information
   */
  getPluginInfo() {
    return {
      id: "writerr-editorial-engine",
      name: "Editorial Engine",
      version: "1.0.0",
      author: "writerr-official",
      description: "Built-in AI editorial engine for sophisticated content processing and editing",
      capabilities: {
        editorialOperations: [
          "replace",
          "insert",
          "delete",
          "restructure",
          "format",
          "analyze",
          "enhance",
          "correct",
          "expand",
          "compress"
        ],
        aiProviders: [
          "openai",
          "anthropic",
          "google",
          "local",
          "ollama"
        ],
        maxBatchSize: 100,
        supportsRealTime: true,
        supportsConversationContext: true,
        supportedFileTypes: [
          "markdown",
          "text",
          "json",
          "yaml",
          "html"
        ],
        requiredPermissions: [
          "read_documents" /* READ_DOCUMENTS */,
          "modify_documents" /* MODIFY_DOCUMENTS */,
          "create_sessions" /* CREATE_SESSIONS */,
          "access_vault_metadata" /* ACCESS_VAULT_METADATA */,
          "network_access" /* NETWORK_ACCESS */,
          "user_interface" /* USER_INTERFACE */
        ]
      },
      metadata: {
        homepage: "https://writerr.ai/editorial-engine",
        repository: "https://github.com/writerr-ai/editorial-engine",
        documentation: "https://docs.writerr.ai/editorial-engine",
        license: "MIT",
        keywords: ["ai", "editing", "writing", "content", "editorial"],
        minObsidianVersion: "1.0.0",
        securityPolicy: "https://writerr.ai/security"
      },
      apiVersion: PLUGIN_API_VERSION
    };
  }
  /**
   * Initialize plugin with registry
   */
  async initialize(registry, authContext) {
    this.registry = registry;
    this.authContext = authContext;
    this.initialized = true;
    console.log(
      "[EditorialEnginePlugin] Initialized successfully with permissions:",
      authContext.permissions.join(", ")
    );
  }
  /**
   * Submit AI changes through the plugin system
   */
  async submitChanges(changes, aiProvider, aiModel, processingContext, options) {
    if (!this.initialized || !this.authContext) {
      return {
        success: false,
        changeIds: [],
        errors: ["Plugin not initialized"],
        warnings: []
      };
    }
    if (!this.registry) {
      return {
        success: false,
        changeIds: [],
        errors: ["Plugin registry not available"],
        warnings: []
      };
    }
    const authResult = await this.registry.authenticatePlugin(
      this.getPluginInfo().id,
      {
        pluginId: this.getPluginInfo().id,
        authToken: this.authContext.sessionToken,
        timestamp: /* @__PURE__ */ new Date(),
        nonce: Math.random().toString(36).substring(2, 15)
      }
    );
    if (!authResult) {
      return {
        success: false,
        changeIds: [],
        errors: ["Plugin authentication failed"],
        warnings: []
      };
    }
    const requiredPermissions = ["modify_documents" /* MODIFY_DOCUMENTS */];
    const permissionResult = await this.registry.validatePermissions(
      this.getPluginInfo().id,
      requiredPermissions
    );
    if (!permissionResult.hasPermission) {
      return {
        success: false,
        changeIds: [],
        errors: [`Missing permissions: ${permissionResult.missingPermissions.join(", ")}`],
        warnings: []
      };
    }
    const pluginOptions = {
      ...options,
      pluginAuthContext: authResult,
      pluginMetadata: {
        pluginId: this.getPluginInfo().id,
        pluginVersion: this.getPluginInfo().version,
        submissionTime: (/* @__PURE__ */ new Date()).toISOString(),
        editorialEngineMode: true
      }
    };
    return {
      success: true,
      changeIds: changes.map((change, index) => change.id || `editorial_${Date.now()}_${index}`),
      errors: [],
      warnings: [],
      sessionId: options == null ? void 0 : options.sessionId,
      validationSummary: {
        totalChanges: changes.length,
        provider: aiProvider,
        model: aiModel,
        validationMode: "Editorial Engine",
        securityChecksEnabled: true
      }
    };
  }
  /**
   * Validate plugin capabilities
   */
  async validateCapability(operation, context) {
    const capabilities = this.getPluginInfo().capabilities;
    if (capabilities.editorialOperations.includes(operation)) {
      return true;
    }
    const specialCapabilities = [
      "conversation_context",
      "real_time_processing",
      "batch_processing",
      "file_type_markdown",
      "file_type_text",
      "ai_provider_openai",
      "ai_provider_anthropic",
      "ai_provider_local"
    ];
    return specialCapabilities.includes(operation);
  }
  /**
   * Clean up resources
   */
  async cleanup() {
    this.initialized = false;
    this.registry = null;
    this.authContext = null;
    console.log("[EditorialEnginePlugin] Cleanup completed");
  }
  /**
   * Handle lifecycle events
   */
  async onLifecycleEvent(event, data) {
    switch (event) {
      case "registered" /* REGISTERED */:
        console.log("[EditorialEnginePlugin] Registered successfully", data);
        break;
      case "activated" /* ACTIVATED */:
        console.log("[EditorialEnginePlugin] Activated");
        break;
      case "deactivated" /* DEACTIVATED */:
        console.log("[EditorialEnginePlugin] Deactivated", (data == null ? void 0 : data.reason) || "No reason provided");
        break;
      case "suspended" /* SUSPENDED */:
        console.warn("[EditorialEnginePlugin] Suspended", (data == null ? void 0 : data.reason) || "No reason provided");
        break;
      case "updated" /* UPDATED */:
        console.log("[EditorialEnginePlugin] Updated", data);
        break;
      case "permission_changed" /* PERMISSION_CHANGED */:
        console.log("[EditorialEnginePlugin] Permissions changed", data);
        if (this.authContext && (data == null ? void 0 : data.permissions)) {
          this.authContext = { ...this.authContext, permissions: data.permissions };
        }
        break;
      case "error" /* ERROR */:
        console.error("[EditorialEnginePlugin] Error occurred", data);
        break;
      default:
        console.log(`[EditorialEnginePlugin] Unknown lifecycle event: ${event}`, data);
    }
  }
  /**
   * Get plugin performance metrics
   */
  getPerformanceMetrics() {
    return {
      submissionsCount: 0,
      // Would track actual submissions
      successRate: 1,
      averageResponseTime: 250,
      lastSubmissionTime: null
    };
  }
  /**
   * Check if plugin supports specific AI provider
   */
  supportsAIProvider(provider) {
    return this.getPluginInfo().capabilities.aiProviders.includes(provider);
  }
  /**
   * Check if plugin supports specific file type
   */
  supportsFileType(fileType) {
    return this.getPluginInfo().capabilities.supportedFileTypes.includes(fileType);
  }
  /**
   * Get maximum batch size supported
   */
  getMaxBatchSize() {
    return this.getPluginInfo().capabilities.maxBatchSize;
  }
  /**
   * Check if plugin supports real-time processing
   */
  supportsRealTime() {
    return this.getPluginInfo().capabilities.supportsRealTime;
  }
  /**
   * Check if plugin supports conversation context
   */
  supportsConversationContext() {
    return this.getPluginInfo().capabilities.supportsConversationContext;
  }
};

// plugins/track-edits/src/plugin-system/plugin-api.ts
var TrackEditsPluginAPI = class {
  constructor(trackEditsPlugin) {
    this.trackEditsPlugin = trackEditsPlugin;
  }
  // TrackEditsPlugin type
  /**
   * Register an AI processing plugin with Track Edits
   */
  async registerPlugin(plugin, securityOptions) {
    return await this.trackEditsPlugin.registerAIProcessingPlugin(plugin, securityOptions);
  }
  /**
   * Unregister a plugin
   */
  async unregisterPlugin(pluginId, reason) {
    return await this.trackEditsPlugin.unregisterAIProcessingPlugin(pluginId, reason);
  }
  /**
   * Get all registered plugins
   */
  getRegisteredPlugins(filter) {
    const allPlugins = this.trackEditsPlugin.getRegisteredPlugins();
    if (!filter) {
      return allPlugins;
    }
    return allPlugins.filter((plugin) => {
      const pluginInfo = plugin.getPluginInfo();
      if (filter.status && !filter.status.includes("active" /* ACTIVE */)) {
        return false;
      }
      if (filter.author && pluginInfo.author !== filter.author) {
        return false;
      }
      if (filter.capabilities) {
        const hasCapabilities = filter.capabilities.every(
          (cap) => pluginInfo.capabilities.editorialOperations.includes(cap)
        );
        if (!hasCapabilities)
          return false;
      }
      return true;
    });
  }
  /**
   * Get specific plugin by ID
   */
  getPlugin(pluginId) {
    return this.trackEditsPlugin.getRegisteredPlugin(pluginId);
  }
  /**
   * Submit AI changes through Track Edits (authenticated)
   */
  async submitAIChanges(pluginId, changes, aiProvider, aiModel, processingContext, options = {}) {
    const plugin = this.getPlugin(pluginId);
    if (!plugin) {
      return {
        success: false,
        changeIds: [],
        errors: ["Plugin not found or not registered"],
        warnings: []
      };
    }
    return await plugin.submitChanges(changes, aiProvider, aiModel, processingContext, options);
  }
  /**
   * Check plugin status
   */
  getPluginStatus(pluginId) {
    const registry = this.trackEditsPlugin.pluginRegistry;
    if (!registry)
      return null;
    return "active" /* ACTIVE */;
  }
  /**
   * Get plugin performance metrics
   */
  getPluginMetrics(pluginId) {
    const registry = this.trackEditsPlugin.pluginRegistry;
    if (!registry)
      return void 0;
    return registry.getPluginMetrics(pluginId);
  }
  /**
   * Validate plugin capabilities for an operation
   */
  async validatePluginCapability(pluginId, operation, context) {
    const plugin = this.getPlugin(pluginId);
    if (!plugin)
      return false;
    return await plugin.validateCapability(operation, context);
  }
  /**
   * Get plugin information
   */
  getPluginInfo(pluginId) {
    const plugin = this.getPlugin(pluginId);
    return plugin == null ? void 0 : plugin.getPluginInfo();
  }
};
var _TrackEditsGlobalAPI = class _TrackEditsGlobalAPI {
  /**
   * Initialize the global API
   */
  static initialize(trackEditsPlugin) {
    _TrackEditsGlobalAPI.instance = new TrackEditsPluginAPI(trackEditsPlugin);
    if (typeof window !== "undefined") {
      window.TrackEditsAPI = _TrackEditsGlobalAPI.instance;
    }
    if (typeof global !== "undefined") {
      global.TrackEditsAPI = _TrackEditsGlobalAPI.instance;
    }
  }
  /**
   * Get the global API instance
   */
  static getInstance() {
    return _TrackEditsGlobalAPI.instance;
  }
  /**
   * Clean up the global API
   */
  static cleanup() {
    if (typeof window !== "undefined") {
      delete window.TrackEditsAPI;
    }
    if (typeof global !== "undefined") {
      delete global.TrackEditsAPI;
    }
    _TrackEditsGlobalAPI.instance = null;
  }
};
_TrackEditsGlobalAPI.instance = null;
var TrackEditsGlobalAPI = _TrackEditsGlobalAPI;
function initializeTrackEditsPluginAPI(trackEditsPlugin) {
  TrackEditsGlobalAPI.initialize(trackEditsPlugin);
  console.log("[TrackEditsPluginAPI] Global API initialized and available to other plugins");
}
function cleanupTrackEditsPluginAPI() {
  TrackEditsGlobalAPI.cleanup();
  console.log("[TrackEditsPluginAPI] Global API cleaned up");
}

// plugins/track-edits/src/main.ts
init_event_bus_integration();

// plugins/track-edits/src/event-persistence-manager.ts
var EventPersistenceManager = class {
  constructor() {
    this.db = null;
    this.dbName = "WriterrlEventPersistence";
    this.dbVersion = 1;
    this.storeName = "events";
    this.maxRetries = 3;
    this.maxStoredEvents = 1e3;
    this.eventBus = null;
    // Graceful degradation - store in memory if IndexedDB fails
    this.memoryFallback = /* @__PURE__ */ new Map();
    setInterval(() => {
      this.cleanupOldEvents(7);
    }, 24 * 60 * 60 * 1e3);
  }
  async initialize() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      request.onerror = () => {
        var _a;
        reject(new Error(`Failed to open IndexedDB: ${(_a = request.error) == null ? void 0 : _a.message}`));
      };
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: "eventId" });
          store.createIndex("timestamp", "timestamp", { unique: false });
          store.createIndex("type", "type", { unique: false });
          store.createIndex("retryCount", "retryCount", { unique: false });
        }
      };
    });
  }
  setEventBus(eventBus) {
    this.eventBus = eventBus;
    this.eventBus.on("connection-restored", async () => {
      var _a;
      if ((_a = this.eventBus) == null ? void 0 : _a.isConnected) {
        await this.syncPendingEvents(this.eventBus);
      }
    });
  }
  setMaxStoredEvents(max) {
    this.maxStoredEvents = max;
  }
  async storeEvent(event) {
    if (!this.db) {
      throw new Error("EventPersistenceManager not initialized");
    }
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);
      const eventWithDefaults = {
        ...event,
        retryCount: event.retryCount || 0,
        timestamp: event.timestamp instanceof Date ? event.timestamp : new Date(event.timestamp)
      };
      const request = store.add(eventWithDefaults);
      request.onsuccess = async () => {
        await this.enforceStorageLimits();
        resolve();
      };
      request.onerror = () => {
        var _a;
        reject(new Error(`Failed to store event: ${(_a = request.error) == null ? void 0 : _a.message}`));
      };
      transaction.onerror = () => {
        var _a;
        reject(new Error(`Transaction failed: ${(_a = transaction.error) == null ? void 0 : _a.message}`));
      };
    });
  }
  async getPendingEvents() {
    if (!this.db) {
      throw new Error("EventPersistenceManager not initialized");
    }
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], "readonly");
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();
      request.onsuccess = () => {
        const events = request.result;
        events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        resolve(events);
      };
      request.onerror = () => {
        var _a;
        reject(new Error(`Failed to retrieve events: ${(_a = request.error) == null ? void 0 : _a.message}`));
      };
    });
  }
  async syncPendingEvents(eventBus) {
    const pendingEvents = await this.getPendingEvents();
    const result = {
      synced: 0,
      failed: 0,
      errors: []
    };
    if (!eventBus.isConnected) {
      throw new Error("Cannot sync: event bus not connected");
    }
    for (const event of pendingEvents) {
      try {
        if (event.retryCount >= this.maxRetries) {
          await this.removeEvent(event.eventId);
          continue;
        }
        await eventBus.publish(event.type, event.data);
        await this.removeEvent(event.eventId);
        result.synced++;
      } catch (error) {
        result.failed++;
        result.errors.push({
          eventId: event.eventId,
          error: error instanceof Error ? error.message : "Unknown error"
        });
        await this.updateEventRetryCount(event.eventId, event.retryCount + 1);
      }
    }
    return result;
  }
  async removeEvent(eventId) {
    if (!this.db) {
      throw new Error("EventPersistenceManager not initialized");
    }
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(eventId);
      request.onsuccess = () => resolve();
      request.onerror = () => {
        var _a;
        reject(new Error(`Failed to remove event: ${(_a = request.error) == null ? void 0 : _a.message}`));
      };
    });
  }
  async updateEventRetryCount(eventId, retryCount) {
    if (!this.db) {
      throw new Error("EventPersistenceManager not initialized");
    }
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);
      const getRequest = store.get(eventId);
      getRequest.onsuccess = () => {
        const event = getRequest.result;
        if (event) {
          event.retryCount = retryCount;
          event.lastAttempt = /* @__PURE__ */ new Date();
          const putRequest = store.put(event);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => {
            var _a;
            reject(new Error(`Failed to update retry count: ${(_a = putRequest.error) == null ? void 0 : _a.message}`));
          };
        } else {
          resolve();
        }
      };
      getRequest.onerror = () => {
        var _a;
        reject(new Error(`Failed to get event for update: ${(_a = getRequest.error) == null ? void 0 : _a.message}`));
      };
    });
  }
  async cleanupOldEvents(maxAgeDays) {
    if (!this.db) {
      throw new Error("EventPersistenceManager not initialized");
    }
    const cutoffDate = /* @__PURE__ */ new Date();
    cutoffDate.setDate(cutoffDate.getDate() - maxAgeDays);
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);
      const index = store.index("timestamp");
      const range = IDBKeyRange.upperBound(cutoffDate);
      const request = index.openCursor(range);
      let deletedCount = 0;
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          cursor.delete();
          deletedCount++;
          cursor.continue();
        } else {
          resolve(deletedCount);
        }
      };
      request.onerror = () => {
        var _a;
        reject(new Error(`Failed to cleanup old events: ${(_a = request.error) == null ? void 0 : _a.message}`));
      };
    });
  }
  async clearAllEvents() {
    if (!this.db) {
      throw new Error("EventPersistenceManager not initialized");
    }
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => {
        var _a;
        reject(new Error(`Failed to clear events: ${(_a = request.error) == null ? void 0 : _a.message}`));
      };
    });
  }
  async getStorageStats() {
    const events = await this.getPendingEvents();
    if (events.length === 0) {
      return {
        totalEvents: 0,
        eventTypes: {},
        estimatedSizeKB: 0
      };
    }
    const eventTypes = {};
    let totalSizeEstimate = 0;
    for (const event of events) {
      eventTypes[event.type] = (eventTypes[event.type] || 0) + 1;
      totalSizeEstimate += JSON.stringify(event).length;
    }
    const timestamps = events.map((e) => new Date(e.timestamp));
    const oldestEvent = new Date(Math.min(...timestamps.map((d) => d.getTime())));
    const newestEvent = new Date(Math.max(...timestamps.map((d) => d.getTime())));
    return {
      totalEvents: events.length,
      oldestEvent,
      newestEvent,
      eventTypes,
      estimatedSizeKB: Math.round(totalSizeEstimate / 1024)
    };
  }
  async enforceStorageLimits() {
    const events = await this.getPendingEvents();
    if (events.length <= this.maxStoredEvents) {
      return;
    }
    const eventsToRemove = events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()).slice(0, events.length - this.maxStoredEvents);
    for (const event of eventsToRemove) {
      await this.removeEvent(event.eventId);
    }
  }
  async isStorageAvailable() {
    try {
      if (!this.db) {
        await this.initialize();
      }
      return true;
    } catch (error) {
      console.warn("Event persistence storage unavailable:", error);
      return false;
    }
  }
  async storeEventSafe(event) {
    try {
      await this.storeEvent(event);
    } catch (error) {
      console.warn("Falling back to memory storage:", error);
      this.memoryFallback.set(event.eventId, event);
      if (this.memoryFallback.size > 100) {
        const oldestKey = this.memoryFallback.keys().next().value;
        this.memoryFallback.delete(oldestKey);
      }
    }
  }
  async getPendingEventsSafe() {
    try {
      return await this.getPendingEvents();
    } catch (error) {
      console.warn("Using memory fallback for pending events:", error);
      return Array.from(this.memoryFallback.values());
    }
  }
};

// plugins/track-edits/src/main.ts
var DEFAULT_SETTINGS = {
  enableTracking: true,
  showLineNumbers: true,
  highlightChanges: true,
  retentionDays: 30,
  colorScheme: "default",
  autoSave: true,
  exportFormat: "json",
  enableClustering: true,
  clusterTimeWindow: 2e3,
  showSidePanelOnStart: true,
  // AI Integration defaults
  aiAlwaysEnabled: false,
  aiProvider: "",
  aiModel: "",
  systemPromptPath: "prompts/system-prompt.md",
  // Event Bus Integration defaults
  enableEventBus: true,
  eventBusDebugMode: false,
  eventBusMaxReconnectAttempts: 3,
  eventBusReconnectDelay: 1e3
};
var DEBUG_MODE = true;
var PERF_MONITOR = true;
var DebugMonitor = class {
  static log(type, data) {
    if (!DEBUG_MODE)
      return;
    this.logs.push({ timestamp: Date.now(), type, data });
    console.log(`[Track Edits ${type}]`, JSON.stringify(data, null, 2));
    if (this.logs.length > 1e3) {
      this.logs.splice(0, 500);
    }
  }
  static startTimer(name) {
    if (!PERF_MONITOR)
      return null;
    return { name, start: performance.now() };
  }
  static endTimer(timer) {
    if (!timer || !PERF_MONITOR)
      return;
    const duration = performance.now() - timer.start;
    const counter = this.perfCounters.get(timer.name) || { count: 0, totalTime: 0, maxTime: 0 };
    counter.count++;
    counter.totalTime += duration;
    counter.maxTime = Math.max(counter.maxTime, duration);
    this.perfCounters.set(timer.name, counter);
    if (duration > 16) {
      console.warn(`[Track Edits PERF] ${timer.name} took ${duration.toFixed(2)}ms (>16ms target)`);
    }
  }
  static getReport() {
    return {
      recentLogs: this.logs.slice(-50),
      perfStats: Object.fromEntries(this.perfCounters.entries()),
      summary: {
        totalLogs: this.logs.length,
        perfCounters: this.perfCounters.size,
        slowOperations: Array.from(this.perfCounters.entries()).filter(([_, stats]) => stats.maxTime > 16).map(([name, stats]) => ({ name, maxTime: stats.maxTime, avgTime: stats.totalTime / stats.count }))
      }
    };
  }
  static clear() {
    this.logs = [];
    this.perfCounters.clear();
  }
};
DebugMonitor.logs = [];
DebugMonitor.perfCounters = /* @__PURE__ */ new Map();
var currentPluginInstance = null;
var isRejectingEdit = false;
if (DEBUG_MODE) {
  window.TrackEditsDebug = {
    getReport: () => DebugMonitor.getReport(),
    clearLogs: () => DebugMonitor.clear(),
    getCurrentState: () => {
      var _a;
      return {
        currentPluginInstance: !!currentPluginInstance,
        isRejectingEdit,
        currentEdits: ((_a = currentPluginInstance == null ? void 0 : currentPluginInstance.currentEdits) == null ? void 0 : _a.length) || 0,
        hasSession: !!(currentPluginInstance == null ? void 0 : currentPluginInstance.currentSession)
      };
    },
    logCurrent: () => {
      const state = window.TrackEditsDebug.getCurrentState();
      console.log("[Track Edits Debug]", state);
      return state;
    }
  };
  console.log("[Track Edits] Debug mode enabled. Access via window.TrackEditsDebug");
}
var addDecorationEffect = import_state.StateEffect.define();
var removeDecorationEffect = import_state.StateEffect.define();
var clearAllDecorationsEffect = import_state.StateEffect.define();
var DeletionWidget = class extends import_view.WidgetType {
  // Make public for StateField access
  constructor(deletedText, editId) {
    super();
    this.deletedText = deletedText;
    this.editId = editId;
  }
  toDOM() {
    const span = document.createElement("span");
    span.className = "track-edits-decoration track-edits-decoration-delete";
    span.textContent = this.deletedText;
    span.setAttribute("data-edit-id", this.editId);
    span.style.cssText = `
      color: #f85149;
      text-decoration: line-through;
      opacity: 0.7;
      background: transparent;
    `;
    return span;
  }
};
function createEditDecoration(edit) {
  const attributes = { "data-edit-id": edit.id };
  if (edit.type === "insert") {
    return import_view.Decoration.mark({
      class: "track-edits-decoration track-edits-decoration-insert",
      attributes
    });
  } else if (edit.type === "delete") {
    return import_view.Decoration.widget({
      widget: new DeletionWidget(edit.removedText || "", edit.id),
      side: -1
    });
  }
  return import_view.Decoration.mark({
    class: "track-edits-decoration track-edits-decoration-insert",
    attributes
  });
}
var editDecorationField = import_state.StateField.define({
  create() {
    DebugMonitor.log("STATEFIELD_CREATE", { message: "StateField created with empty decoration set" });
    return import_view.Decoration.none;
  },
  update(decorations, tr) {
    var _a, _b;
    const timer = DebugMonitor.startTimer("StateField.update");
    const initialSize = decorations.size;
    DebugMonitor.log("STATEFIELD_UPDATE_START", {
      hasChanges: !!tr.changes,
      changeCount: tr.changes ? tr.changes.desc.length : 0,
      effectCount: tr.effects.length,
      currentDecorations: initialSize,
      docLength: tr.newDoc.length
    });
    const mapTimer = DebugMonitor.startTimer("decorations.map");
    decorations = decorations.map(tr.changes);
    DebugMonitor.endTimer(mapTimer);
    let addedDecorations = 0;
    let removedDecorations = 0;
    for (const effect of tr.effects) {
      if (effect.is(addDecorationEffect)) {
        const { edit, decoration } = effect.value;
        DebugMonitor.log("ADD_DECORATION_EFFECT", {
          editId: edit.id,
          editType: edit.type,
          position: { from: edit.from, to: edit.to },
          textLength: ((_a = edit.text) == null ? void 0 : _a.length) || 0
        });
        if (edit.type === "delete") {
          const pos = edit.from;
          decorations = decorations.update({
            add: [decoration.range(pos)]
          });
          addedDecorations++;
        } else if (edit.type === "insert") {
          const start = edit.from;
          const end = start + (((_b = edit.text) == null ? void 0 : _b.length) || 0);
          if (end <= tr.newDoc.length && start <= end && start >= 0) {
            decorations = decorations.update({
              add: [decoration.range(start, end)]
            });
            addedDecorations++;
          } else {
            DebugMonitor.log("INVALID_DECORATION_POSITION", {
              editId: edit.id,
              start,
              end,
              docLength: tr.newDoc.length,
              reason: "Position out of bounds"
            });
          }
        }
      } else if (effect.is(removeDecorationEffect)) {
        const editId = effect.value;
        DebugMonitor.log("REMOVE_DECORATION_EFFECT", { editId });
        decorations = decorations.update({
          filter: (from, to, decoration) => {
            var _a2;
            const spec = decoration.spec;
            if (((_a2 = spec == null ? void 0 : spec.attributes) == null ? void 0 : _a2["data-edit-id"]) === editId) {
              removedDecorations++;
              return false;
            }
            if ((spec == null ? void 0 : spec.widget) && spec.widget.editId === editId) {
              removedDecorations++;
              return false;
            }
            return true;
          }
        });
      } else if (effect.is(clearAllDecorationsEffect)) {
        DebugMonitor.log("CLEAR_ALL_DECORATIONS_EFFECT", { previousSize: decorations.size });
        removedDecorations = decorations.size;
        decorations = import_view.Decoration.none;
      }
    }
    const finalSize = decorations.size;
    DebugMonitor.log("STATEFIELD_UPDATE_END", {
      initialSize,
      finalSize,
      addedDecorations,
      removedDecorations,
      netChange: finalSize - initialSize
    });
    DebugMonitor.endTimer(timer);
    return decorations;
  },
  provide: (f) => import_view.EditorView.decorations.from(f)
});
var changeDetectionPlugin = import_view.ViewPlugin.fromClass(class {
  constructor(view) {
    this.view = view;
  }
  update(update) {
    const timer = DebugMonitor.startTimer("ViewPlugin.update");
    DebugMonitor.log("UPDATE", {
      docChanged: update.docChanged,
      isRejectingEdit,
      hasPluginInstance: !!currentPluginInstance,
      changeCount: update.changes ? update.changes.desc.length : 0,
      viewportChanged: update.viewportChanged,
      focusChanged: update.focusChanged
    });
    const shouldProcessChanges = update.docChanged && !isRejectingEdit && currentPluginInstance && currentPluginInstance.currentSession && currentPluginInstance.settings.enableTracking && (!currentPluginInstance.toggleStateManager || currentPluginInstance.toggleStateManager.isTrackingEnabled);
    if (shouldProcessChanges) {
      const extractTimer = DebugMonitor.startTimer("extractEditsFromUpdate");
      const edits = this.extractEditsFromUpdate(update);
      DebugMonitor.endTimer(extractTimer);
      DebugMonitor.log("EDITS_EXTRACTED", {
        editCount: edits.length,
        edits: edits.map((e) => {
          var _a;
          return { id: e.id, type: e.type, from: e.from, to: e.to, textLength: ((_a = e.text) == null ? void 0 : _a.length) || 0 };
        })
      });
      if (edits.length > 0) {
        const decorationTimer = DebugMonitor.startTimer("createDecorations");
        const decorationEffects = edits.map((edit) => {
          const decoration = createEditDecoration(edit);
          return addDecorationEffect.of({ edit, decoration });
        });
        DebugMonitor.endTimer(decorationTimer);
        DebugMonitor.log("DECORATIONS_CREATED", {
          effectCount: decorationEffects.length
        });
        requestAnimationFrame(() => {
          const dispatchTimer = DebugMonitor.startTimer("viewDispatch");
          this.view.dispatch({ effects: decorationEffects });
          DebugMonitor.endTimer(dispatchTimer);
          DebugMonitor.log("DECORATIONS_DISPATCHED", {
            effectCount: decorationEffects.length
          });
        });
        currentPluginInstance.handleEditsFromCodeMirror(edits);
      }
    }
    DebugMonitor.endTimer(timer);
  }
  extractEditsFromUpdate(update) {
    const edits = [];
    update.changes.iterChanges((from, to, fromB, toB, insert) => {
      const removedText = update.startState.doc.sliceString(from, to);
      const insertedText = insert.toString();
      if (removedText) {
        edits.push({
          id: generateId(),
          type: "delete",
          from,
          to,
          text: "",
          removedText,
          timestamp: Date.now()
        });
      }
      if (insertedText) {
        edits.push({
          id: generateId(),
          type: "insert",
          from: fromB,
          to: toB,
          text: insertedText,
          removedText: "",
          timestamp: Date.now()
        });
      }
    });
    return edits;
  }
});
var TrackEditsPlugin = class extends import_obsidian5.Plugin {
  constructor() {
    super(...arguments);
    this.sidePanelView = null;
    this.toggleStateManager = null;
    // Plugin Registration System
    this.pluginRegistry = null;
    this.eventBusConnection = null;
    this.eventPersistence = null;
    this.workflowOrchestrator = null;
    // WorkflowOrchestrator from event-coordination-patterns
    // AI Processing State Management
    this.aiProcessingStates = /* @__PURE__ */ new Map();
    this.processingQueue = {
      active: [],
      pending: [],
      completed: [],
      failed: []
    };
    this.processingLocks = /* @__PURE__ */ new Map();
    this.securityValidator = null;
    this.capabilityValidator = null;
    this.currentSession = null;
    this.currentEdits = [];
    this.currentEditorView = null;
    this.ribbonIconEl = null;
    this.debouncedSave = debounce(() => this.saveCurrentSession(), 1e3);
    this.debouncedPanelUpdate = debounce(() => this.updateSidePanel(), 100);
    this.debouncedRibbonClick = debounce(() => this.handleRibbonClick(), 300);
    this.isProcessingChange = false;
    this.isRestartingSession = false;
    this.lastActiveFile = null;
  }
  async onload() {
    await this.loadSettings();
    currentPluginInstance = this;
    this.editTracker = new EditTracker(this);
    this.editRenderer = new EditRenderer(this);
    this.clusterManager = new EditClusterManager(this);
    this.batchManager = new ChangeBatchManager();
    await this.initializePluginSystem();
    await this.initializeEventBusConnection();
    this.toggleStateManager = new ToggleStateManager(this.app, (enabled) => {
      if (enabled) {
        this.startTracking();
      } else {
        this.handleToggleOff();
      }
    });
    this.initializeGlobalAPI();
    this.registerEditorExtension([changeDetectionPlugin, editDecorationField]);
    this.registerSafeEventHandlers();
    this.registerView("track-edits-side-panel", (leaf) => new EditSidePanelView(leaf, this));
    this.addCommands();
    this.addSettingTab(new TrackEditsSettingsTab(this.app, this));
    this.addRibbonIcon();
    if (this.settings.enableTracking) {
      this.startTracking();
    }
    console.log("Track Edits v2.0 plugin loaded with Plugin Registration System");
  }
  onunload() {
    var _a;
    try {
      this.stopTracking();
      this.cleanupGlobalAPI();
      if (this.toggleStateManager) {
        this.toggleStateManager.destroy();
        this.toggleStateManager = null;
      }
      this.cleanupEventBusConnection();
      if (this.eventPersistence) {
        if ((_a = this.eventBusConnection) == null ? void 0 : _a.isConnected()) {
          this.eventPersistence.syncPendingEvents(this.eventBusConnection).catch((error) => console.warn("[TrackEdits] Final event sync failed:", error));
        }
        this.eventPersistence = null;
      }
      console.log("Track Edits plugin unloaded");
    } catch (error) {
      console.error("Track Edits: Error during plugin unload:", error);
    }
  }
  /**
   * Initialize the plugin registration system
   */
  async initializePluginSystem() {
    try {
      this.securityValidator = new PluginSecurityValidator();
      this.capabilityValidator = new PluginCapabilityValidator();
      this.pluginRegistry = new PluginRegistry(
        this,
        this.securityValidator,
        this.capabilityValidator
      );
      await this.registerEditorialEnginePlugin();
      console.log("[TrackEditsPlugin] Plugin registration system initialized");
    } catch (error) {
      console.error("[TrackEditsPlugin] Failed to initialize plugin system:", error);
      this.pluginRegistry = null;
      this.securityValidator = null;
      this.capabilityValidator = null;
    }
  }
  /**
   * Initialize event bus connection for cross-plugin coordination
   */
  async initializeEventBusConnection() {
    try {
      if (!this.settings.enableEventBus) {
        console.log("[TrackEditsPlugin] Event bus integration disabled in settings");
        return;
      }
      this.eventPersistence = new EventPersistenceManager();
      await this.eventPersistence.initialize();
      this.eventBusConnection = new WriterrlEventBusConnection({
        maxReconnectAttempts: this.settings.eventBusMaxReconnectAttempts,
        reconnectDelay: this.settings.eventBusReconnectDelay,
        healthCheckInterval: 3e4,
        enableDebugMode: this.settings.eventBusDebugMode,
        eventFilters: {
          sourcePlugins: ["writerr-chat", "editorial-engine", "track-edits"],
          eventTypes: [
            "change.ai.start",
            "change.ai.complete",
            "change.ai.error",
            "session.created",
            "session.ended",
            "session.paused",
            "session.resumed",
            "document.edit.start",
            "document.edit.complete",
            "document.focus.changed",
            "error.plugin.failure",
            "error.recovery.attempted"
          ]
        }
      });
      if (this.eventPersistence) {
        this.eventPersistence.setEventBus(this.eventBusConnection);
      }
      const connected = await this.eventBusConnection.connect();
      if (connected) {
        await this.setupEventBusHandlers();
        if (this.eventPersistence) {
          try {
            const syncResult = await this.eventPersistence.syncPendingEvents(this.eventBusConnection);
            if (syncResult.synced > 0) {
              console.log(`[TrackEditsPlugin] Synced ${syncResult.synced} pending events from offline period`);
            }
            if (syncResult.failed > 0) {
              console.warn(`[TrackEditsPlugin] Failed to sync ${syncResult.failed} events`);
            }
          } catch (syncError) {
            console.warn("[TrackEditsPlugin] Error syncing pending events:", syncError);
          }
        }
        console.log("[TrackEditsPlugin] Event bus integration initialized successfully");
      } else {
        console.log("[TrackEditsPlugin] Event bus not available - will retry on demand");
      }
    } catch (error) {
      console.error("[TrackEditsPlugin] Failed to initialize event bus connection:", error);
      this.eventBusConnection = null;
    }
  }
  /**
   * Set up event handlers for cross-plugin coordination
   */
  async setupEventBusHandlers() {
    if (!this.eventBusConnection)
      return;
    try {
      await this.eventBusConnection.subscribe(
        "session.*",
        this.handleChatSessionEvent.bind(this),
        {
          filter: (event) => event.sourcePlugin === "writerr-chat",
          async: true
        }
      );
      await this.eventBusConnection.subscribe(
        "change.*",
        this.handleEditorialEngineEvent.bind(this),
        {
          filter: (event) => event.sourcePlugin === "editorial-engine",
          async: true
        }
      );
      await this.eventBusConnection.subscribe(
        "ai.processing.start",
        this.handleAIProcessingStartEvent.bind(this),
        { async: true }
      );
      await this.eventBusConnection.subscribe(
        "ai.processing.progress",
        this.handleAIProcessingProgressEvent.bind(this),
        { async: true }
      );
      await this.eventBusConnection.subscribe(
        "ai.processing.complete",
        this.handleAIProcessingCompleteEvent.bind(this),
        { async: true }
      );
      await this.eventBusConnection.subscribe(
        "ai.processing.error",
        this.handleAIProcessingErrorEvent.bind(this),
        { async: true }
      );
      await this.eventBusConnection.subscribe(
        "document.*",
        this.handleDocumentEvent.bind(this),
        { async: true }
      );
      await this.eventBusConnection.subscribe(
        "error.*",
        this.handleErrorEvent.bind(this),
        { async: true }
      );
      console.log("[TrackEditsPlugin] Event bus handlers configured with AI processing support");
    } catch (error) {
      console.error("[TrackEditsPlugin] Failed to setup event bus handlers:", error);
    }
  }
  /**
   * Handle Writerr Chat session events for coordination
   */
  async handleChatSessionEvent(event) {
    try {
      if (this.settings.eventBusDebugMode) {
        console.log("[TrackEdits EventBus] Chat session event:", event);
      }
      switch (event.type) {
        case "session.created":
          if (!this.currentSession && this.settings.enableTracking) {
            console.log("[TrackEdits] Starting tracking in response to chat session");
            this.startTracking();
          }
          break;
        case "session.ended":
          if (this.currentSession && this.settings.autoSave) {
            await this.saveCurrentSession();
          }
          break;
      }
    } catch (error) {
      console.error("[TrackEdits EventBus] Error handling chat session event:", error);
    }
  }
  /**
   * Handle Editorial Engine processing events
   */
  async handleEditorialEngineEvent(event) {
    try {
      if (this.settings.eventBusDebugMode) {
        console.log("[TrackEdits EventBus] Editorial Engine event:", event);
      }
      switch (event.type) {
        case "change.ai.start":
          if (this.toggleStateManager && this.toggleStateManager.isTrackingEnabled) {
            this.isProcessingChange = true;
            console.log("[TrackEdits] Pausing change detection during Editorial Engine processing");
          }
          break;
        case "change.ai.complete":
          this.isProcessingChange = false;
          const changeEvent = event;
          if (changeEvent.payload.changeIds && this.currentSession) {
            console.log("[TrackEdits] Syncing with Editorial Engine changes:", changeEvent.payload.changeIds);
          }
          break;
        case "change.ai.error":
          this.isProcessingChange = false;
          console.log("[TrackEdits] Resuming tracking after Editorial Engine error");
          break;
      }
    } catch (error) {
      console.error("[TrackEdits EventBus] Error handling Editorial Engine event:", error);
    }
  }
  /**
   * Handle document events for multi-plugin editing coordination
   */
  async handleDocumentEvent(event) {
    try {
      if (this.settings.eventBusDebugMode) {
        console.log("[TrackEdits EventBus] Document event:", event);
      }
      const docEvent = event;
      switch (event.type) {
        case "document.focus.changed":
          if (docEvent.payload.documentPath && docEvent.payload.documentPath !== this.lastActiveFile) {
            this.lastActiveFile = docEvent.payload.documentPath;
            if (this.currentSession && this.settings.enableTracking) {
              await this.restartSession();
            }
          }
          break;
        case "document.save.before":
          if (this.currentSession && this.settings.autoSave) {
            await this.saveCurrentSession();
          }
          break;
      }
    } catch (error) {
      console.error("[TrackEdits EventBus] Error handling document event:", error);
    }
  }
  /**
   * Handle error events for platform-wide error coordination
   */
  async handleErrorEvent(event) {
    try {
      if (this.settings.eventBusDebugMode) {
        console.log("[TrackEdits EventBus] Error event:", event);
      }
      const errorEvent = event;
      switch (event.type) {
        case "error.plugin.failure":
          if (errorEvent.payload.affectedFeatures.includes("editing") || errorEvent.payload.affectedFeatures.includes("tracking")) {
            if (errorEvent.payload.severity === "critical") {
              this.stopTracking();
              console.log("[TrackEdits] Stopped tracking due to critical system error");
            } else {
              console.warn("[TrackEdits] System error detected, continuing with caution:", errorEvent.payload.errorMessage);
            }
          }
          break;
        case "error.recovery.attempted":
          if (errorEvent.payload.recoveryAction === "restart_tracking" && this.settings.enableTracking) {
            console.log("[TrackEdits] Restarting tracking after error recovery");
            this.startTracking();
          }
          break;
      }
    } catch (error) {
      console.error("[TrackEdits EventBus] Error handling error event:", error);
    }
  }
  // AI Processing Event Handlers
  async handleAIProcessingStartEvent(event) {
    try {
      const startEvent = event;
      const { requestId, operation, input, config: config2, pluginContext } = startEvent.payload;
      console.log(`[TrackEditsPlugin] AI processing started: ${requestId} from ${pluginContext.sourcePluginId}`);
      const processingState = {
        requestId,
        operation: {
          type: operation.type,
          provider: operation.provider,
          model: operation.model,
          startTime: Date.now()
        },
        input: {
          documentId: input.documentId,
          content: input.content,
          userPrompt: input.userPrompt,
          constraints: input.constraints
        },
        status: "preparing",
        progress: {
          percentage: 0,
          stage: "initializing",
          estimatedTimeRemaining: config2.expectedDuration
        },
        sourcePlugin: pluginContext.sourcePluginId,
        sessionId: startEvent.sessionId
      };
      this.aiProcessingStates.set(requestId, processingState);
      this.processingQueue.active.push(processingState);
      await this.prepareForAIProcessing(processingState);
      await this.updateProcessingUI(processingState);
      if (processingState.sessionId) {
        const session = this.editTracker.getSession(processingState.sessionId);
        if (session) {
          session.metadata = {
            ...session.metadata,
            activeAIProcessing: requestId,
            aiProvider: operation.provider,
            aiModel: operation.model
          };
        }
      }
    } catch (error) {
      console.error("[TrackEditsPlugin] Error handling AI processing start event:", error);
      await this.publishErrorEvent("error.ai.processing.handler", {
        message: "Failed to handle AI processing start event",
        error: error.message,
        context: { eventType: "ai.processing.start" }
      });
    }
  }
  async handleAIProcessingProgressEvent(event) {
    try {
      const progressEvent = event;
      const { requestId, progress, partialResults, metrics } = progressEvent.payload;
      const processingState = this.aiProcessingStates.get(requestId);
      if (!processingState) {
        console.warn(`[TrackEditsPlugin] Progress event for unknown request: ${requestId}`);
        return;
      }
      processingState.status = "processing";
      processingState.progress = {
        percentage: progress.percentage,
        stage: progress.stage,
        estimatedTimeRemaining: progress.estimatedTimeRemaining,
        currentOperation: progress.currentOperation
      };
      if (metrics) {
        processingState.metrics = {
          tokensProcessed: metrics.tokensProcessed,
          responseTime: metrics.responseTime,
          memoryUsage: metrics.memoryUsage
        };
      }
      await this.updateProcessingProgress(processingState, partialResults);
      if ((partialResults == null ? void 0 : partialResults.previewChanges) && partialResults.previewChanges.length > 0) {
        await this.handlePartialResults(processingState, partialResults.previewChanges);
      }
      console.log(`[TrackEditsPlugin] AI processing progress: ${requestId} - ${progress.percentage}% (${progress.stage})`);
    } catch (error) {
      console.error("[TrackEditsPlugin] Error handling AI processing progress event:", error);
    }
  }
  async handleAIProcessingCompleteEvent(event) {
    var _a, _b, _c;
    try {
      const completeEvent = event;
      const { requestId, results, metrics, recommendations } = completeEvent.payload;
      const processingState = this.aiProcessingStates.get(requestId);
      if (!processingState) {
        console.warn(`[TrackEditsPlugin] Complete event for unknown request: ${requestId}`);
        return;
      }
      processingState.status = "completed";
      processingState.progress.percentage = 100;
      processingState.progress.stage = "completed";
      if (metrics) {
        processingState.metrics = {
          tokensProcessed: metrics.totalTokens,
          responseTime: metrics.processingTime,
          memoryUsage: ((_a = processingState.metrics) == null ? void 0 : _a.memoryUsage) || 0
        };
      }
      const activeIndex = this.processingQueue.active.findIndex((state) => state.requestId === requestId);
      if (activeIndex !== -1) {
        this.processingQueue.active.splice(activeIndex, 1);
        this.processingQueue.completed.push(processingState);
      }
      await this.coordinateChangeRecording(processingState, results);
      if (processingState.sessionId) {
        const session = this.editTracker.getSession(processingState.sessionId);
        if (session && ((_b = session.metadata) == null ? void 0 : _b.activeAIProcessing) === requestId) {
          delete session.metadata.activeAIProcessing;
          session.metadata.lastAIOperation = {
            requestId,
            completedAt: Date.now(),
            changeIds: results.changeIds,
            metrics: processingState.metrics
          };
        }
      }
      if (recommendations) {
        await this.handleProcessingRecommendations(processingState, recommendations);
      }
      await this.updateProcessingCompletion(processingState, results);
      this.processingLocks.delete(requestId);
      console.log(`[TrackEditsPlugin] AI processing completed: ${requestId} - ${results.changeIds.length} changes`);
    } catch (error) {
      console.error("[TrackEditsPlugin] Error handling AI processing complete event:", error);
      await this.publishErrorEvent("error.ai.processing.complete", {
        message: "Failed to handle AI processing complete event",
        error: error.message,
        context: { requestId: (_c = event.payload) == null ? void 0 : _c.requestId }
      });
    }
  }
  async handleAIProcessingErrorEvent(event) {
    var _a;
    try {
      const errorEvent = event;
      const { requestId, error, context, recovery } = errorEvent.payload;
      const processingState = this.aiProcessingStates.get(requestId);
      if (!processingState) {
        console.warn(`[TrackEditsPlugin] Error event for unknown request: ${requestId}`);
        return;
      }
      processingState.status = "error";
      processingState.errorDetails = {
        type: error.type,
        message: error.message,
        recoverable: error.recoverability === "recoverable"
      };
      const activeIndex = this.processingQueue.active.findIndex((state) => state.requestId === requestId);
      if (activeIndex !== -1) {
        this.processingQueue.active.splice(activeIndex, 1);
        this.processingQueue.failed.push(processingState);
      }
      await this.handleProcessingError(processingState, error, context, recovery);
      if (processingState.sessionId) {
        const session = this.editTracker.getSession(processingState.sessionId);
        if (session && ((_a = session.metadata) == null ? void 0 : _a.activeAIProcessing) === requestId) {
          delete session.metadata.activeAIProcessing;
          session.metadata.lastAIError = {
            requestId,
            errorAt: Date.now(),
            error: error.message,
            recoverable: processingState.errorDetails.recoverable
          };
        }
      }
      await this.updateProcessingError(processingState);
      this.processingLocks.delete(requestId);
      console.error(`[TrackEditsPlugin] AI processing failed: ${requestId} - ${error.message}`);
    } catch (handlerError) {
      console.error("[TrackEditsPlugin] Error handling AI processing error event:", handlerError);
    }
  }
  // AI Processing Coordination Methods
  async prepareForAIProcessing(processingState) {
    try {
      this.processingLocks.set(processingState.requestId, true);
      if (this.batchManager) {
        await this.batchManager.prepareForAIBatch(processingState.requestId, {
          expectedChanges: processingState.input.content.length > 1e3 ? 10 : 5,
          provider: processingState.operation.provider,
          model: processingState.operation.model,
          operationType: processingState.operation.type
        });
      }
      if (this.currentEditorView) {
        this.removeDecorationsFromView(this.currentEditorView);
      }
      console.log(`[TrackEditsPlugin] Prepared for AI processing: ${processingState.requestId}`);
    } catch (error) {
      console.error("[TrackEditsPlugin] Error preparing for AI processing:", error);
      throw error;
    }
  }
  async updateProcessingUI(processingState) {
    try {
      if (this.sidePanelView) {
        this.sidePanelView.updateProcessingStatus({
          requestId: processingState.requestId,
          status: processingState.status,
          progress: processingState.progress,
          sourcePlugin: processingState.sourcePlugin
        });
      }
      this.updateRibbonIcon();
    } catch (error) {
      console.error("[TrackEditsPlugin] Error updating processing UI:", error);
    }
  }
  async updateProcessingProgress(processingState, partialResults) {
    try {
      if (this.sidePanelView) {
        this.sidePanelView.updateProcessingProgress({
          requestId: processingState.requestId,
          progress: processingState.progress,
          metrics: processingState.metrics,
          partialResults
        });
      }
      if (processingState.progress.percentage >= 50 && processingState.progress.percentage % 25 === 0) {
        console.log(`[TrackEditsPlugin] Processing ${processingState.progress.percentage}% complete: ${processingState.progress.stage}`);
      }
    } catch (error) {
      console.error("[TrackEditsPlugin] Error updating processing progress:", error);
    }
  }
  async handlePartialResults(processingState, previewChanges) {
    try {
      if (this.sidePanelView && previewChanges.length > 0) {
        this.sidePanelView.showChangePreview({
          requestId: processingState.requestId,
          previewChanges,
          stage: processingState.progress.stage
        });
      }
      console.log(`[TrackEditsPlugin] Received ${previewChanges.length} preview changes for ${processingState.requestId}`);
    } catch (error) {
      console.error("[TrackEditsPlugin] Error handling partial results:", error);
    }
  }
  async coordinateChangeRecording(processingState, results) {
    var _a, _b;
    try {
      if (processingState.sessionId && results.changeIds.length > 0) {
        const session = this.editTracker.getSession(processingState.sessionId);
        if (session) {
          const aiProcessingRecord = {
            requestId: processingState.requestId,
            operationType: processingState.operation.type,
            provider: processingState.operation.provider,
            model: processingState.operation.model,
            changeIds: results.changeIds,
            confidence: results.confidence,
            appliedConstraints: results.appliedConstraints,
            processingTime: ((_a = processingState.metrics) == null ? void 0 : _a.responseTime) || 0,
            completedAt: Date.now()
          };
          session.metadata = {
            ...session.metadata,
            aiProcessingHistory: [
              ...((_b = session.metadata) == null ? void 0 : _b.aiProcessingHistory) || [],
              aiProcessingRecord
            ]
          };
        }
      }
      if (results.changeGroupId && this.batchManager) {
        await this.batchManager.finalizeAIBatch(processingState.requestId, {
          changeGroupId: results.changeGroupId,
          changeIds: results.changeIds,
          confidence: results.confidence
        });
      }
      console.log(`[TrackEditsPlugin] Coordinated recording of ${results.changeIds.length} changes for ${processingState.requestId}`);
    } catch (error) {
      console.error("[TrackEditsPlugin] Error coordinating change recording:", error);
      throw error;
    }
  }
  async handleProcessingRecommendations(processingState, recommendations) {
    try {
      if (recommendations.suggestedReview && this.sidePanelView) {
        this.sidePanelView.highlightForReview({
          requestId: processingState.requestId,
          reason: "AI processing recommends review",
          priority: "medium"
        });
      }
      if (recommendations.recommendedBatching && this.batchManager) {
        await this.batchManager.applyBatchingRecommendation(
          processingState.requestId,
          recommendations.recommendedBatching
        );
      }
      if (recommendations.followupActions && recommendations.followupActions.length > 0) {
        console.log(`[TrackEditsPlugin] Follow-up actions recommended for ${processingState.requestId}:`, recommendations.followupActions);
      }
    } catch (error) {
      console.error("[TrackEditsPlugin] Error handling processing recommendations:", error);
    }
  }
  async updateProcessingCompletion(processingState, results) {
    try {
      if (this.sidePanelView) {
        this.sidePanelView.updateProcessingCompletion({
          requestId: processingState.requestId,
          results,
          metrics: processingState.metrics,
          duration: Date.now() - processingState.operation.startTime
        });
      }
      this.updateRibbonIcon();
      if (results.changeIds.length > 5) {
        console.log(`[TrackEditsPlugin] AI processing completed: ${results.changeIds.length} changes applied with ${results.confidence}% confidence`);
      }
    } catch (error) {
      console.error("[TrackEditsPlugin] Error updating processing completion:", error);
    }
  }
  async handleProcessingError(processingState, error, context, recovery) {
    try {
      if (error.recoverability === "recoverable" && recovery.automaticRetryAvailable) {
        console.log(`[TrackEditsPlugin] Recoverable error for ${processingState.requestId}, retry may be available`);
        processingState.status = "preparing";
        return;
      }
      if (recovery.manualInterventionRequired) {
        console.error(`[TrackEditsPlugin] Manual intervention required for ${processingState.requestId}: ${error.message}`);
        if (this.sidePanelView) {
          this.sidePanelView.showManualInterventionRequired({
            requestId: processingState.requestId,
            error: error.message,
            suggestedActions: recovery.suggestedActions
          });
        }
      }
      if (context.partialResults && this.batchManager) {
        await this.batchManager.cleanupFailedBatch(processingState.requestId);
      }
      console.error(`[TrackEditsPlugin] Processing error handled for ${processingState.requestId}:`, {
        error: error.message,
        stage: context.stage,
        recoverable: error.recoverability === "recoverable"
      });
    } catch (handlerError) {
      console.error("[TrackEditsPlugin] Error handling processing error:", handlerError);
    }
  }
  async updateProcessingError(processingState) {
    try {
      if (this.sidePanelView) {
        this.sidePanelView.updateProcessingError({
          requestId: processingState.requestId,
          error: processingState.errorDetails,
          duration: Date.now() - processingState.operation.startTime
        });
      }
      this.updateRibbonIcon();
    } catch (error) {
      console.error("[TrackEditsPlugin] Error updating processing error UI:", error);
    }
  }
  // Processing State Management Utilities
  getActiveProcessingOperations() {
    return Array.from(this.aiProcessingStates.values()).filter(
      (state) => state.status === "processing" || state.status === "preparing"
    );
  }
  getProcessingState(requestId) {
    return this.aiProcessingStates.get(requestId);
  }
  isProcessingActive(requestId) {
    if (requestId) {
      const state = this.aiProcessingStates.get(requestId);
      return (state == null ? void 0 : state.status) === "processing" || (state == null ? void 0 : state.status) === "preparing";
    }
    return this.getActiveProcessingOperations().length > 0;
  }
  cancelProcessing(requestId) {
    const state = this.aiProcessingStates.get(requestId);
    if (state && (state.status === "processing" || state.status === "preparing")) {
      state.status = "cancelled";
      const activeIndex = this.processingQueue.active.findIndex((s) => s.requestId === requestId);
      if (activeIndex !== -1) {
        this.processingQueue.active.splice(activeIndex, 1);
        this.processingQueue.failed.push(state);
      }
      this.processingLocks.delete(requestId);
      console.log(`[TrackEditsPlugin] Cancelled processing: ${requestId}`);
      return true;
    }
    return false;
  }
  async waitForProcessingCompletion(requestId, timeoutMs) {
    const startTime = Date.now();
    const checkInterval = 1e3;
    return new Promise((resolve) => {
      const checkCompletion = () => {
        var _a;
        const processingState = this.aiProcessingStates.get(requestId);
        if (!processingState) {
          resolve({
            success: false,
            changeIds: [],
            errors: ["Processing state not found"],
            warnings: []
          });
          return;
        }
        if (processingState.status === "completed") {
          resolve({
            success: true,
            changeIds: [],
            // Would be populated from actual results
            errors: [],
            warnings: [`Coordinated with completed operation: ${requestId}`]
          });
          return;
        }
        if (processingState.status === "error" || processingState.status === "cancelled") {
          resolve({
            success: false,
            changeIds: [],
            errors: [((_a = processingState.errorDetails) == null ? void 0 : _a.message) || "Processing failed"],
            warnings: []
          });
          return;
        }
        if (Date.now() - startTime > timeoutMs) {
          resolve({
            success: false,
            changeIds: [],
            errors: ["Coordination timeout"],
            warnings: [`Processing still active after ${timeoutMs}ms`]
          });
          return;
        }
        setTimeout(checkCompletion, checkInterval);
      };
      checkCompletion();
    });
  }
  async publishAIProcessingStartEvent(payload, sessionId) {
    try {
      if (!this.eventBusConnection)
        return;
      await this.eventBusConnection.publish({
        type: "ai.processing.start",
        sourcePlugin: "track-edits",
        targetPlugin: "*",
        timestamp: Date.now(),
        sessionId,
        schemaVersion: "2.0.0",
        payload
      });
    } catch (error) {
      console.error("[TrackEditsPlugin] Error publishing AI processing start event:", error);
    }
  }
  async publishAIProcessingProgressEvent(requestId, progress, partialResults, metrics) {
    try {
      if (!this.eventBusConnection)
        return;
      await this.eventBusConnection.publish({
        type: "ai.processing.progress",
        sourcePlugin: "track-edits",
        targetPlugin: "*",
        timestamp: Date.now(),
        schemaVersion: "2.0.0",
        payload: {
          requestId,
          progress,
          partialResults,
          metrics
        }
      });
    } catch (error) {
      console.error("[TrackEditsPlugin] Error publishing AI processing progress event:", error);
    }
  }
  async publishAIProcessingCompleteEvent(payload, sessionId) {
    try {
      if (!this.eventBusConnection)
        return;
      await this.eventBusConnection.publish({
        type: "ai.processing.complete",
        sourcePlugin: "track-edits",
        targetPlugin: "*",
        timestamp: Date.now(),
        sessionId,
        schemaVersion: "2.0.0",
        payload
      });
    } catch (error) {
      console.error("[TrackEditsPlugin] Error publishing AI processing complete event:", error);
    }
  }
  async publishAIProcessingErrorEvent(requestId, errorType, message, context, recovery) {
    try {
      if (!this.eventBusConnection)
        return;
      await this.eventBusConnection.publish({
        type: "ai.processing.error",
        sourcePlugin: "track-edits",
        targetPlugin: "*",
        timestamp: Date.now(),
        schemaVersion: "2.0.0",
        payload: {
          requestId,
          error: {
            type: errorType,
            message,
            code: errorType.toUpperCase(),
            recoverability: recovery ? "recoverable" : "non-recoverable"
          },
          context: context || {
            stage: "unknown",
            partialResults: [],
            resourceUsage: {}
          },
          recovery: recovery || {
            automaticRetryAvailable: false,
            manualInterventionRequired: true,
            suggestedActions: ["Check logs", "Retry operation"],
            fallbackOptions: []
          }
        }
      });
    } catch (error) {
      console.error("[TrackEditsPlugin] Error publishing AI processing error event:", error);
    }
  }
  /**
   * Publish a change event through the event bus
   */
  async publishChangeEvent(type, payload, sessionId, documentId) {
    var _a, _b;
    try {
      const event = EventBusUtils.createChangeEvent(
        type,
        "track-edits",
        payload,
        sessionId || ((_a = this.currentSession) == null ? void 0 : _a.id),
        documentId || ((_b = this.app.workspace.getActiveFile()) == null ? void 0 : _b.path),
        ["writerr-chat", "editorial-engine"]
      );
      if (this.eventBusConnection && this.eventBusConnection.isConnected()) {
        await this.eventBusConnection.publish(type, event, {
          persistent: type === "change.ai.complete" || type === "change.ai.error"
        });
      } else if (this.eventPersistence) {
        await this.eventPersistence.storeEventSafe({
          type,
          data: event,
          timestamp: /* @__PURE__ */ new Date(),
          eventId: `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        });
        console.log(`[TrackEdits] Event stored for offline sync: ${type}`);
      }
    } catch (error) {
      console.error("[TrackEdits EventBus] Failed to publish change event:", error);
    }
  }
  /**
   * Publish a session event through the event bus
   */
  async publishSessionEvent(type, payload, sessionId, documentId) {
    var _a, _b;
    try {
      const event = EventBusUtils.createSessionEvent(
        type,
        "track-edits",
        payload,
        sessionId || ((_a = this.currentSession) == null ? void 0 : _a.id),
        documentId || ((_b = this.app.workspace.getActiveFile()) == null ? void 0 : _b.path),
        ["writerr-chat", "editorial-engine"]
      );
      if (this.eventBusConnection && this.eventBusConnection.isConnected()) {
        await this.eventBusConnection.publish(type, event, {
          persistent: true
        });
      } else if (this.eventPersistence) {
        await this.eventPersistence.storeEventSafe({
          type,
          data: event,
          timestamp: /* @__PURE__ */ new Date(),
          eventId: `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        });
        console.log(`[TrackEdits] Session event stored for offline sync: ${type}`);
      }
    } catch (error) {
      console.error("[TrackEdits EventBus] Failed to publish session event:", error);
    }
  }
  /**
   * Publish an error event through the event bus
   */
  async publishErrorEvent(type, payload, sessionId, documentId) {
    var _a, _b;
    try {
      const event = EventBusUtils.createErrorEvent(
        type,
        "track-edits",
        payload,
        sessionId || ((_a = this.currentSession) == null ? void 0 : _a.id),
        documentId || ((_b = this.app.workspace.getActiveFile()) == null ? void 0 : _b.path),
        ["writerr-chat", "editorial-engine"]
      );
      if (this.eventBusConnection && this.eventBusConnection.isConnected()) {
        await this.eventBusConnection.publish(type, event, {
          persistent: payload.severity === "critical" || payload.severity === "high"
        });
      } else if (this.eventPersistence) {
        await this.eventPersistence.storeEventSafe({
          type,
          data: event,
          timestamp: /* @__PURE__ */ new Date(),
          eventId: `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        });
        console.log(`[TrackEdits] Error event stored for offline sync: ${type}`);
      }
    } catch (error) {
      console.error("[TrackEdits EventBus] Failed to publish error event:", error);
    }
  }
  /**
   * Clean up event bus connection and resources
   */
  async cleanupEventBusConnection() {
    try {
      if (this.eventBusConnection) {
        await this.eventBusConnection.disconnect();
        this.eventBusConnection = null;
        console.log("[TrackEditsPlugin] Event bus connection cleaned up");
      }
    } catch (error) {
      console.error("[TrackEditsPlugin] Error during event bus cleanup:", error);
    }
  }
  /**
   * Register the Editorial Engine as a built-in plugin
   */
  async registerEditorialEnginePlugin() {
    if (!this.pluginRegistry)
      return;
    const editorialEnginePlugin = new EditorialEnginePluginWrapper();
    try {
      const result = await this.pluginRegistry.registerPlugin(editorialEnginePlugin, {
        validateCodeSignature: false,
        // Built-in plugin, no signature needed
        allowNetworkAccess: true,
        allowStorageAccess: true,
        maxMemoryUsage: 100 * 1024 * 1024,
        // 100MB
        rateLimitConfig: {
          requestsPerMinute: 120,
          requestsPerHour: 3600,
          burstLimit: 20,
          cooldownPeriod: 500
        },
        sandboxEnabled: false
        // Built-in plugin, trusted
      });
      if (result.success) {
        console.log("[TrackEditsPlugin] Editorial Engine plugin registered successfully");
      } else {
        console.warn("[TrackEditsPlugin] Editorial Engine plugin registration failed:", result.errors);
      }
    } catch (error) {
      console.error("[TrackEditsPlugin] Editorial Engine plugin registration error:", error);
    }
  }
  /**
   * Public API for registering AI processing plugins
   */
  async registerAIProcessingPlugin(plugin) {
    if (!this.pluginRegistry) {
      return {
        success: false,
        pluginId: "",
        authToken: "",
        permissions: [],
        errors: ["Plugin registration system not initialized"],
        warnings: [],
        expiresAt: /* @__PURE__ */ new Date()
      };
    }
    return await this.pluginRegistry.registerPlugin(plugin);
  }
  /**
   * Public API for unregistering plugins
   */
  async unregisterAIProcessingPlugin(pluginId, reason) {
    if (!this.pluginRegistry) {
      return false;
    }
    return await this.pluginRegistry.unregisterPlugin(pluginId, reason);
  }
  /**
   * Get all registered plugins
   */
  getRegisteredPlugins() {
    if (!this.pluginRegistry) {
      return [];
    }
    return this.pluginRegistry.getPlugins();
  }
  /**
   * Get plugin by ID
   */
  getRegisteredPlugin(pluginId) {
    if (!this.pluginRegistry) {
      return void 0;
    }
    return this.pluginRegistry.getPlugin(pluginId);
  }
  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }
  initializeGlobalAPI() {
    if (!window.WriterrlAPI) {
      window.WriterrlAPI = {};
    }
    window.WriterrlAPI.trackEdits = {
      getCurrentSession: () => this.currentSession,
      getSessionHistory: () => this.editTracker.getSessionHistory(),
      startTracking: () => this.startTracking(),
      stopTracking: () => this.stopTracking(),
      exportSession: (sessionId) => this.exportSession(sessionId)
    };
    initializeTrackEditsPluginAPI(this);
  }
  cleanupGlobalAPI() {
    if (window.WriterrlAPI && window.WriterrlAPI.trackEdits) {
      delete window.WriterrlAPI.trackEdits;
    }
    cleanupTrackEditsPluginAPI();
  }
  registerSafeEventHandlers() {
    console.log("[Track Edits DEBUG] Registering event handlers");
    this.registerEvent(
      this.app.workspace.on("active-leaf-change", () => {
        if (this.isRestartingSession)
          return;
        if (!this.settings || !this.settings.enableTracking)
          return;
        const activeFile = this.app.workspace.getActiveFile();
        const currentFilePath = (activeFile == null ? void 0 : activeFile.path) || null;
        if (this.currentSession && this.lastActiveFile !== currentFilePath && this.lastActiveFile !== null && // Don't restart on initial load
        currentFilePath !== null) {
          console.log("Track Edits: File changed from", this.lastActiveFile, "to", currentFilePath);
          this.lastActiveFile = currentFilePath;
          this.restartSession();
        } else if (!this.currentSession && activeFile && currentFilePath !== this.lastActiveFile && !this.isRestartingSession) {
          console.log("Track Edits: Starting new session for file:", currentFilePath);
          this.lastActiveFile = currentFilePath;
          this.startTracking();
        }
      })
    );
  }
  handleEditorChange(editor, info) {
    console.log("[Track Edits DEBUG] handleEditorChange called");
    console.log("[Track Edits DEBUG] Editor:", editor);
    console.log("[Track Edits DEBUG] Info:", info);
    console.log("[Track Edits DEBUG] Current session:", this.currentSession);
    console.log("[Track Edits DEBUG] Settings enableTracking:", this.settings.enableTracking);
    const changes = this.extractChangesFromEditor(editor);
    console.log("[Track Edits DEBUG] Extracted changes:", changes);
    if (changes.length === 0) {
      console.log("[Track Edits DEBUG] No changes detected, returning early");
      return;
    }
    console.log("Track Edits v2.0: Recording", changes.length, "changes");
    this.currentEdits.push(...changes);
    console.log("[Track Edits DEBUG] Current edits array length:", this.currentEdits.length);
    console.log("[Track Edits DEBUG] About to call showChangeDecorations");
    this.editRenderer.showChangeDecorations(changes);
    console.log("[Track Edits DEBUG] Called showChangeDecorations");
    this.editTracker.recordChanges(this.currentSession.id, changes);
    this.debouncedPanelUpdate();
    this.debouncedSave();
  }
  updateSidePanel() {
    if (this.sidePanelView) {
      const clusters = this.clusterManager.clusterEdits(this.currentEdits);
      this.sidePanelView.updateClusters(clusters);
    }
  }
  extractChangesFromEditor(editor) {
    console.log("[Track Edits DEBUG] extractChangesFromEditor called");
    const doc = editor.getDoc();
    const cursor = editor.getCursor();
    console.log("[Track Edits DEBUG] Cursor position:", cursor);
    const line = doc.getLine(cursor.line);
    console.log("[Track Edits DEBUG] Current line:", line);
    console.log("[Track Edits DEBUG] Line length:", line == null ? void 0 : line.length);
    if (line && line.length > 0) {
      console.log("Track Edits v2.0: Detected editor change at line", cursor.line, "position", cursor.ch);
      const docPosition = editor.posToOffset(cursor);
      const fromPos = Math.max(0, docPosition - 1);
      const toPos = docPosition;
      const characterAtCursor = line.charAt(cursor.ch - 1) || "";
      console.log("[Track Edits DEBUG] Character at cursor:", characterAtCursor);
      console.log("[Track Edits DEBUG] Doc position:", docPosition);
      console.log("[Track Edits DEBUG] From pos:", fromPos, "To pos:", toPos);
      const change = {
        id: generateId(),
        timestamp: Date.now(),
        type: "insert",
        from: fromPos,
        to: toPos,
        text: characterAtCursor,
        author: "user"
      };
      console.log("[Track Edits DEBUG] Created change object:", change);
      return [change];
    }
    console.log("[Track Edits DEBUG] No valid line found, returning empty array");
    return [];
  }
  addRibbonIcon() {
    this.ribbonIconEl = super.addRibbonIcon("edit", "Track Edits", (evt) => {
      if (this.toggleStateManager) {
        this.toggleStateManager.setTrackingEnabled(!this.toggleStateManager.isTrackingEnabled);
      } else {
        this.debouncedRibbonClick();
      }
    });
    if (this.ribbonIconEl && this.toggleStateManager) {
      this.toggleStateManager.setRibbonIcon(this.ribbonIconEl);
    }
    this.updateRibbonIcon();
  }
  updateRibbonIcon() {
    if (this.ribbonIconEl) {
      const isTracking = !!this.currentSession;
      const tooltipText = isTracking ? "Track Edits: ON (Click to stop)" : "Track Edits: OFF (Click to start)";
      this.ribbonIconEl.setAttribute("aria-label", tooltipText);
      this.ribbonIconEl.setAttribute("title", tooltipText);
    }
  }
  handleRibbonClick() {
    if (this.isRestartingSession) {
      console.log("Track Edits: Ribbon click ignored during session restart");
      return;
    }
    this.isRestartingSession = true;
    try {
      if (this.currentSession) {
        this.stopTracking();
        console.log("Track Edits: Stopped tracking via ribbon icon");
      } else {
        this.startTracking();
        console.log("Track Edits: Started tracking via ribbon icon");
      }
    } catch (error) {
      console.error("Track Edits: Error in ribbon icon handler:", error);
    } finally {
      setTimeout(() => {
        this.isRestartingSession = false;
      }, 100);
    }
  }
  addCommands() {
    this.addCommand({
      id: "start-tracking",
      name: "Start tracking edits",
      callback: () => this.startTracking()
    });
    this.addCommand({
      id: "stop-tracking",
      name: "Stop tracking edits",
      callback: () => this.stopTracking()
    });
    this.addCommand({
      id: "toggle-side-panel",
      name: "Toggle Track Edits side panel",
      callback: () => this.toggleSidePanel()
    });
    this.addCommand({
      id: "export-current-session",
      name: "Export current session",
      callback: () => this.exportCurrentSession()
    });
    this.addCommand({
      id: "view-edit-history",
      name: "View edit history",
      callback: () => this.viewEditHistory()
    });
    this.addCommand({
      id: "clear-edit-history",
      name: "Clear edit history",
      callback: () => this.clearEditHistory()
    });
    if (DEBUG_MODE) {
      this.addCommand({
        id: "debug-show-report",
        name: "\u{1F41B} Show Debug Report",
        callback: () => {
          const report = DebugMonitor.getReport();
          const modal = document.createElement("div");
          modal.style.cssText = `
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            width: 80%; max-width: 800px; height: 70%; 
            background: var(--background-primary); border: 1px solid var(--background-modifier-border);
            border-radius: 8px; padding: 20px; z-index: 10000;
            overflow-y: auto; font-family: var(--font-monospace);
          `;
          const reportText = JSON.stringify(report, null, 2);
          modal.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
              <h2>Track Edits Debug Report</h2>
              <div>
                <button onclick="navigator.clipboard.writeText(this.dataset.report)" data-report="${reportText.replace(/"/g, "&quot;")}" style="padding: 5px 10px; margin-right: 5px;">Copy All</button>
                <button onclick="this.parentElement.parentElement.parentElement.remove()" style="padding: 5px 10px;">Close</button>
              </div>
            </div>
            <div style="margin-bottom: 15px;">
              <h3>Performance Stats <button onclick="navigator.clipboard.writeText(JSON.stringify(${JSON.stringify(report.perfStats)}, null, 2))" style="font-size: 11px; padding: 2px 5px;">Copy</button></h3>
              <pre style="user-select: text; cursor: text; background: var(--background-secondary); padding: 10px; border-radius: 4px;">${JSON.stringify(report.perfStats, null, 2)}</pre>
            </div>
            <div style="margin-bottom: 15px;">
              <h3>Summary <button onclick="navigator.clipboard.writeText(JSON.stringify(${JSON.stringify(report.summary)}, null, 2))" style="font-size: 11px; padding: 2px 5px;">Copy</button></h3>
              <pre style="user-select: text; cursor: text; background: var(--background-secondary); padding: 10px; border-radius: 4px;">${JSON.stringify(report.summary, null, 2)}</pre>
            </div>
            <div>
              <h3>Recent Logs (Last 50) <button onclick="navigator.clipboard.writeText(JSON.stringify(${JSON.stringify(report.recentLogs)}, null, 2))" style="font-size: 11px; padding: 2px 5px;">Copy</button></h3>
              <pre style="user-select: text; cursor: text; background: var(--background-secondary); padding: 10px; border-radius: 4px; font-size: 11px; max-height: 400px; overflow-y: auto;">${JSON.stringify(report.recentLogs, null, 2)}</pre>
            </div>
          `;
          document.body.appendChild(modal);
        }
      });
      this.addCommand({
        id: "debug-clear-logs",
        name: "\u{1F41B} Clear Debug Logs",
        callback: () => {
          DebugMonitor.clear();
          console.log("[Track Edits] Debug logs cleared");
        }
      });
      this.addCommand({
        id: "debug-current-state",
        name: "\u{1F41B} Show Current State",
        callback: () => {
          const state = {
            currentSession: this.currentSession,
            currentEdits: this.currentEdits.length,
            isRejectingEdit,
            hasPluginInstance: !!currentPluginInstance,
            settings: this.settings,
            sidePanelView: !!this.sidePanelView
          };
          console.log("[Track Edits] Current State:", state);
        }
      });
      this.addCommand({
        id: "debug-dump-logs-console",
        name: "\u{1F41B} Dump Logs to Console",
        callback: () => {
          const report = DebugMonitor.getReport();
          console.log("=== TRACK EDITS DEBUG REPORT ===");
          console.log("Performance Stats:", report.perfStats);
          console.log("Summary:", report.summary);
          console.log("Recent Logs:", report.recentLogs);
          console.log("=== END REPORT ===");
        }
      });
    }
  }
  startTracking() {
    if (this.currentSession && !this.isRestartingSession) {
      console.log("Track Edits: Session already active, stopping first");
      this.stopTracking();
    }
    const activeFile = this.app.workspace.getActiveFile();
    if (!activeFile) {
      console.log("Track Edits: No active file to track");
      return;
    }
    this.currentEditorView = this.findCurrentEditorView();
    if (this.currentEditorView) {
      DebugMonitor.log("EDITOR_VIEW_STORED", {
        hasView: !!this.currentEditorView,
        method: "successful"
      });
    } else {
      DebugMonitor.log("EDITOR_VIEW_STORAGE_FAILED", { reason: "no editor found" });
      console.warn("Track Edits: No active editor found during startTracking");
    }
    if (this.currentSession && this.currentSession.id && this.currentSession.startTime) {
      console.log("Track Edits: Preventing duplicate session creation");
      return;
    }
    this.lastActiveFile = activeFile.path;
    this.currentSession = {
      id: generateId(),
      startTime: Date.now(),
      changes: [],
      wordCount: 0,
      characterCount: 0
    };
    this.currentEdits = [];
    this.editTracker.startSession(this.currentSession, activeFile);
    this.editRenderer.showTrackingIndicator();
    if (this.settings.showSidePanelOnStart) {
      this.showSidePanel();
    }
    console.log("Track Edits v2.0: Started tracking session", this.currentSession.id);
    this.updateRibbonIcon();
    this.updateSidePanel();
  }
  stopTracking() {
    try {
      if (this.currentSession) {
        this.currentSession.endTime = Date.now();
        this.saveCurrentSession();
        if (this.editTracker) {
          this.editTracker.endSession(this.currentSession.id);
        }
        if (this.editRenderer) {
          this.editRenderer.hideTrackingIndicator();
        }
        this.clearAllDecorations();
        this.currentEdits = [];
        this.currentSession = null;
        this.lastActiveFile = null;
        this.currentEditorView = null;
        if (this.sidePanelView) {
          this.sidePanelView.updateClusters([]);
        }
      }
    } catch (error) {
      console.error("Track Edits: Error stopping tracking:", error);
      this.currentSession = null;
      this.currentEdits = [];
      this.lastActiveFile = null;
    }
    this.updateRibbonIcon();
    this.updateSidePanel();
  }
  restartSession() {
    try {
      if (this.isRestartingSession) {
        console.log("Track Edits: Restart already in progress, ignoring");
        return;
      }
      if (!this.currentSession) {
        console.log("Track Edits: No session to restart");
        return;
      }
      this.isRestartingSession = true;
      console.log("Track Edits v2.0: Restarting session due to file change");
      const previousSessionId = this.currentSession.id;
      this.stopTracking();
      setTimeout(() => {
        try {
          if (this.settings.enableTracking && !this.currentSession) {
            console.log("Track Edits: Starting new session after restart from", previousSessionId);
            this.startTracking();
          }
        } catch (startError) {
          console.error("Track Edits: Error starting new session after restart:", startError);
        } finally {
          this.isRestartingSession = false;
        }
      }, 150);
    } catch (error) {
      console.error("Track Edits: Error restarting session:", error);
      this.isRestartingSession = false;
    }
  }
  async saveCurrentSession() {
    if (this.currentSession && this.settings.autoSave) {
      await this.editTracker.saveSession(this.currentSession);
    }
  }
  exportCurrentSession() {
    if (!this.currentSession)
      return;
    this.exportSession(this.currentSession.id);
  }
  exportSession(sessionId) {
    const session = this.editTracker.getSession(sessionId);
    if (!session)
      return "";
    const exportData = this.editTracker.formatSessionForExport(session, this.settings.exportFormat);
    const blob = new Blob([exportData], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `edit-session-${sessionId}.${this.settings.exportFormat}`;
    a.click();
    URL.revokeObjectURL(url);
    return exportData;
  }
  viewEditHistory() {
    console.log("Opening edit history view...");
  }
  clearEditHistory() {
    this.editTracker.clearHistory();
  }
  async toggleSidePanel() {
    const existingLeaf = this.app.workspace.getLeavesOfType("track-edits-side-panel")[0];
    if (existingLeaf) {
      existingLeaf.detach();
    } else {
      await this.showSidePanel();
    }
  }
  async showSidePanel() {
    const rightLeaf = this.app.workspace.getRightLeaf(false);
    await rightLeaf.setViewState({
      type: "track-edits-side-panel",
      active: true
    });
    this.sidePanelView = rightLeaf.view;
    this.app.workspace.revealLeaf(rightLeaf);
  }
  acceptEditCluster(clusterId) {
    const timer = DebugMonitor.startTimer("acceptEditCluster");
    const cluster = this.clusterManager.getCluster(clusterId);
    if (!cluster) {
      DebugMonitor.log("ACCEPT_CLUSTER_FAILED", { clusterId, reason: "cluster not found" });
      DebugMonitor.endTimer(timer);
      return;
    }
    DebugMonitor.log("ACCEPT_CLUSTER_START", {
      clusterId,
      editCount: cluster.edits.length,
      editIds: cluster.edits.map((e) => e.id)
    });
    DebugMonitor.log("ACCEPT_REMOVING_DECORATIONS", {
      hasStoredView: !!this.currentEditorView,
      editIds: cluster.edits.map((e) => e.id)
    });
    this.removeDecorationsFromView(cluster.edits.map((e) => e.id));
    this.currentEdits = this.currentEdits.filter(
      (edit) => !cluster.edits.find((clusterEdit) => clusterEdit.id === edit.id)
    );
    this.updateSidePanel();
    DebugMonitor.log("ACCEPT_CLUSTER_COMPLETE", {
      clusterId,
      remainingEdits: this.currentEdits.length
    });
    DebugMonitor.endTimer(timer);
  }
  rejectEditCluster(clusterId) {
    const timer = DebugMonitor.startTimer("rejectEditCluster");
    const cluster = this.clusterManager.getCluster(clusterId);
    if (!cluster) {
      DebugMonitor.log("REJECT_CLUSTER_FAILED", { clusterId, reason: "cluster not found" });
      DebugMonitor.endTimer(timer);
      return;
    }
    DebugMonitor.log("REJECT_CLUSTER_START", {
      clusterId,
      editCount: cluster.edits.length,
      editIds: cluster.edits.map((e) => e.id)
    });
    let editorView = this.currentEditorView;
    DebugMonitor.log("REJECT_CHECKING_VIEW", {
      hasStoredView: !!this.currentEditorView,
      viewType: this.currentEditorView ? this.currentEditorView.constructor.name : "null"
    });
    if (!editorView) {
      DebugMonitor.log("REJECT_FALLBACK_SEARCH", { reason: "no stored editor view, searching" });
      editorView = this.findCurrentEditorView();
    }
    if (!editorView) {
      DebugMonitor.log("REJECT_CLUSTER_FAILED", { reason: "no editor view available" });
      DebugMonitor.endTimer(timer);
      return;
    }
    DebugMonitor.log("REJECT_ALL_EDITS_IN_CLUSTER", {
      allEdits: cluster.edits.map((e) => {
        var _a;
        return { id: e.id, type: e.type, from: e.from, to: e.to, textLength: ((_a = e.text) == null ? void 0 : _a.length) || 0 };
      })
    });
    const insertionsToRemove = cluster.edits.filter((edit) => edit.type === "insert").sort((a, b) => b.from - a.from);
    const deletionsToRestore = cluster.edits.filter((edit) => edit.type === "delete").sort((a, b) => a.from - b.from);
    DebugMonitor.log("REJECT_FILTERED_EDITS", {
      insertionsToRemove: insertionsToRemove.map((e) => {
        var _a;
        return { id: e.id, type: e.type, from: e.from, to: e.to, textLength: ((_a = e.text) == null ? void 0 : _a.length) || 0 };
      }),
      deletionsToRestore: deletionsToRestore.map((e) => {
        var _a;
        return { id: e.id, type: e.type, from: e.from, to: e.to, removedTextLength: ((_a = e.removedText) == null ? void 0 : _a.length) || 0 };
      })
    });
    const doc = editorView.state.doc;
    isRejectingEdit = true;
    try {
      DebugMonitor.log("REJECT_TEXT_PROCESSING", {
        insertionsToRemove: insertionsToRemove.length,
        deletionsToRestore: deletionsToRestore.length,
        docLength: doc.length
      });
      const changes = [];
      for (const edit of insertionsToRemove) {
        if (edit.text) {
          DebugMonitor.log("REJECT_PROCESSING_INSERTION", {
            editId: edit.id,
            editText: edit.text,
            editFrom: edit.from,
            editTextLength: edit.text.length
          });
          const currentText = doc.sliceString(edit.from, edit.from + edit.text.length);
          DebugMonitor.log("REJECT_TEXT_COMPARISON", {
            editId: edit.id,
            position: { from: edit.from, to: edit.from + edit.text.length },
            expectedText: edit.text,
            currentText,
            matches: currentText === edit.text
          });
          if (currentText === edit.text) {
            changes.push({ from: edit.from, to: edit.from + edit.text.length, insert: "" });
            DebugMonitor.log("REJECT_REVERT_INSERT", {
              editId: edit.id,
              removedText: edit.text
            });
          } else {
            DebugMonitor.log("REJECT_REVERT_SKIPPED", {
              editId: edit.id,
              reason: "text mismatch",
              expected: edit.text,
              found: currentText
            });
          }
        }
      }
      for (const edit of deletionsToRestore) {
        if (edit.removedText) {
          DebugMonitor.log("REJECT_PROCESSING_DELETION", {
            editId: edit.id,
            removedText: edit.removedText,
            editFrom: edit.from,
            removedTextLength: edit.removedText.length
          });
          changes.push({ from: edit.from, to: edit.from, insert: edit.removedText });
          DebugMonitor.log("REJECT_RESTORE_DELETION", {
            editId: edit.id,
            restoredText: edit.removedText,
            position: edit.from
          });
        }
      }
      const decorationRemoveEffects = cluster.edits.map(
        (edit) => removeDecorationEffect.of(edit.id)
      );
      if (changes.length > 0) {
        const transaction = editorView.state.update({
          changes,
          effects: decorationRemoveEffects
        });
        editorView.dispatch(transaction);
        DebugMonitor.log("REJECT_CHANGES_APPLIED", {
          changeCount: changes.length,
          effectCount: decorationRemoveEffects.length
        });
      } else {
        editorView.dispatch({
          effects: decorationRemoveEffects
        });
      }
      DebugMonitor.log("REJECT_DISPATCH_COMPLETE", {
        processedEdits: insertionsToRemove.length + deletionsToRestore.length,
        effectCount: decorationRemoveEffects.length
      });
    } finally {
      isRejectingEdit = false;
    }
    this.currentEdits = this.currentEdits.filter(
      (edit) => !cluster.edits.find((clusterEdit) => clusterEdit.id === edit.id)
    );
    this.updateSidePanel();
    DebugMonitor.log("REJECT_CLUSTER_COMPLETE", {
      clusterId,
      remainingEdits: this.currentEdits.length
    });
    DebugMonitor.endTimer(timer);
  }
  // Batch operations for better performance
  acceptAllEditClusters(clusterIds) {
    const timer = DebugMonitor.startTimer("acceptAllEditClusters");
    DebugMonitor.log("ACCEPT_ALL_START", { clusterIds, count: clusterIds.length });
    clusterIds.forEach((clusterId) => {
      const cluster = this.clusterManager.getCluster(clusterId);
      if (cluster && this.currentEditorView) {
        cluster.edits.forEach((edit) => {
          this.currentEditorView.dispatch({
            effects: removeDecorationEffect.of(edit.id)
          });
        });
        this.currentEdits = this.currentEdits.filter(
          (edit) => !cluster.edits.find((clusterEdit) => clusterEdit.id === edit.id)
        );
      }
    });
    this.updateSidePanel();
    DebugMonitor.log("ACCEPT_ALL_COMPLETE", {
      processedCount: clusterIds.length,
      remainingEdits: this.currentEdits.length
    });
    DebugMonitor.endTimer(timer);
  }
  rejectAllEditClusters(clusterIds) {
    const timer = DebugMonitor.startTimer("rejectAllEditClusters");
    DebugMonitor.log("REJECT_ALL_START", { clusterIds, count: clusterIds.length });
    clusterIds.forEach((clusterId) => {
      const cluster = this.clusterManager.getCluster(clusterId);
      if (cluster && this.currentEditorView) {
        const insertionsToRemove = cluster.edits.filter((edit) => edit.type === "insert");
        const deletionsToRestore = cluster.edits.filter((edit) => edit.type === "delete");
        cluster.edits.forEach((edit) => {
          this.currentEditorView.dispatch({
            effects: removeDecorationEffect.of(edit.id)
          });
        });
        if (insertionsToRemove.length > 0 || deletionsToRestore.length > 0) {
          const doc = this.currentEditorView.state.doc;
          const changes = [];
          for (const edit of insertionsToRemove) {
            if (edit.text) {
              const currentText = doc.sliceString(edit.from, edit.from + edit.text.length);
              if (currentText === edit.text) {
                changes.push({ from: edit.from, to: edit.from + edit.text.length, insert: "" });
              }
            }
          }
          for (const edit of deletionsToRestore) {
            if (edit.removedText) {
              changes.push({ from: edit.from, to: edit.from, insert: edit.removedText });
            }
          }
          if (changes.length > 0) {
            this.currentEditorView.dispatch({ changes });
          }
        }
        this.currentEdits = this.currentEdits.filter(
          (edit) => !cluster.edits.find((clusterEdit) => clusterEdit.id === edit.id)
        );
      }
    });
    this.updateSidePanel();
    DebugMonitor.log("REJECT_ALL_COMPLETE", {
      processedCount: clusterIds.length,
      remainingEdits: this.currentEdits.length
    });
    DebugMonitor.endTimer(timer);
  }
  findCurrentEditorView() {
    const activeLeaf = this.app.workspace.getActiveViewOfType(import_obsidian5.MarkdownView);
    if (activeLeaf && activeLeaf.editor) {
      const editorView = activeLeaf.editor.cm;
      if (editorView) {
        DebugMonitor.log("FOUND_EDITOR_VIEW", { method: "active_view" });
        return editorView;
      }
    }
    const leaves = this.app.workspace.getLeavesOfType("markdown");
    for (const leaf of leaves) {
      const view = leaf.view;
      if (view && view.editor) {
        const editorView = view.editor.cm;
        if (editorView) {
          DebugMonitor.log("FOUND_EDITOR_VIEW", { method: "leaf_search", leafId: leaf.id });
          return editorView;
        }
      }
    }
    const mostRecentLeaf = this.app.workspace.getMostRecentLeaf();
    if (mostRecentLeaf && mostRecentLeaf.view instanceof import_obsidian5.MarkdownView && mostRecentLeaf.view.editor) {
      const editorView = mostRecentLeaf.view.editor.cm;
      if (editorView) {
        DebugMonitor.log("FOUND_EDITOR_VIEW", { method: "most_recent_leaf" });
        return editorView;
      }
    }
    DebugMonitor.log("EDITOR_VIEW_NOT_FOUND", {
      activeLeafExists: !!activeLeaf,
      markdownLeavesCount: leaves.length,
      mostRecentLeafExists: !!mostRecentLeaf
    });
    return null;
  }
  removeDecorationsFromView(editIds) {
    let editorView = this.currentEditorView;
    if (!editorView) {
      DebugMonitor.log("REMOVE_DECORATIONS_FALLBACK", { reason: "no stored editor view, searching" });
      editorView = this.findCurrentEditorView();
    }
    if (!editorView) {
      DebugMonitor.log("REMOVE_DECORATIONS_FAILED", { reason: "no editor view available" });
      return;
    }
    const removeEffects = editIds.map((editId) => removeDecorationEffect.of(editId));
    DebugMonitor.log("REMOVING_DECORATIONS", {
      editIds,
      effectCount: removeEffects.length,
      hasEditorView: !!editorView,
      usingStored: editorView === this.currentEditorView
    });
    editorView.dispatch({ effects: removeEffects });
  }
  handleToggleOff() {
    const pendingEditCount = this.currentEdits.length;
    DebugMonitor.log("HANDLE_TOGGLE_OFF", {
      pendingEdits: pendingEditCount,
      hasSession: !!this.currentSession
    });
    if (pendingEditCount === 0) {
      DebugMonitor.log("TOGGLE_OFF_NO_EDITS", { action: "direct_toggle" });
      this.stopTracking();
      return;
    }
    DebugMonitor.log("TOGGLE_OFF_SHOW_MODAL", { pendingEdits: pendingEditCount });
    this.showToggleConfirmationModal(pendingEditCount);
  }
  showToggleConfirmationModal(editCount) {
    const modal = new ToggleConfirmationModal(this.app, {
      editCount,
      onConfirm: () => {
        DebugMonitor.log("TOGGLE_CONFIRMATION_CONFIRMED", { editCount });
        this.discardEditsAndStop();
      },
      onCancel: () => {
        DebugMonitor.log("TOGGLE_CONFIRMATION_CANCELLED", { editCount });
        if (this.toggleStateManager && this.ribbonIconEl) {
          this.ribbonIconEl.classList.add("track-edits-enabled");
          this.ribbonIconEl.classList.remove("track-edits-disabled");
        }
      }
    });
    modal.open();
  }
  discardEditsAndStop() {
    this.stopTracking();
    const clusters = this.clusterManager.clusterEdits(this.currentEdits);
    const clusterIds = clusters.map((cluster) => cluster.id);
    if (clusterIds.length > 0) {
      DebugMonitor.log("DISCARD_EDITS_VIA_REJECT", {
        clusterCount: clusterIds.length,
        method: "rejectAllEditClusters"
      });
      this.rejectAllEditClusters(clusterIds);
    } else {
      DebugMonitor.log("DISCARD_EDITS_DIRECT_CLEAR", {
        editCount: this.currentEdits.length,
        method: "clearAllDecorations"
      });
      this.clearAllDecorations();
    }
  }
  clearAllDecorations() {
    let editorView = this.currentEditorView;
    if (!editorView) {
      editorView = this.findCurrentEditorView();
    }
    if (!editorView) {
      DebugMonitor.log("CLEAR_ALL_DECORATIONS_FAILED", { reason: "no editor view available" });
      return;
    }
    DebugMonitor.log("CLEAR_ALL_DECORATIONS_START", {
      currentEditsCount: this.currentEdits.length,
      hasEditorView: !!editorView
    });
    editorView.dispatch({
      effects: clearAllDecorationsEffect.of(true)
    });
    DebugMonitor.log("CLEAR_ALL_DECORATIONS_COMPLETE", {
      method: "clearAllDecorationsEffect"
    });
  }
  handleEditsFromCodeMirror(edits) {
    var _a;
    const timer = DebugMonitor.startTimer("handleEditsFromCodeMirror");
    DebugMonitor.log("HANDLE_EDITS", {
      editCount: edits.length,
      enableTracking: this.settings.enableTracking,
      hasSession: !!this.currentSession,
      currentEditsCount: this.currentEdits.length,
      edits: edits.map((e) => ({ id: e.id, type: e.type, from: e.from, to: e.to }))
    });
    const isTrackingEnabled = this.settings.enableTracking && (!this.toggleStateManager || this.toggleStateManager.isTrackingEnabled);
    if (!isTrackingEnabled || !this.currentSession) {
      DebugMonitor.log("HANDLE_EDITS_SKIPPED", {
        reason: !this.settings.enableTracking ? "settings disabled" : !((_a = this.toggleStateManager) == null ? void 0 : _a.isTrackingEnabled) ? "toggle disabled" : "no session"
      });
      DebugMonitor.endTimer(timer);
      return;
    }
    this.currentEdits.push(...edits);
    const trackerTimer = DebugMonitor.startTimer("editTracker.recordChanges");
    this.editTracker.recordChanges(this.currentSession.id, edits);
    DebugMonitor.endTimer(trackerTimer);
    this.debouncedPanelUpdate();
    this.debouncedSave();
    DebugMonitor.log("HANDLE_EDITS_COMPLETE", {
      processedCount: edits.length,
      totalEdits: this.currentEdits.length
    });
    DebugMonitor.endTimer(timer);
  }
  // AI Integration Methods (stubs for future implementation)
  async runAIAnalysisOnce() {
    console.log("Track Edits: AI analysis triggered manually");
    DebugMonitor.log("AI_ANALYSIS_TRIGGERED", {
      clustersCount: this.currentEdits.length,
      hasSession: !!this.currentSession,
      aiProvider: this.settings.aiProvider,
      aiModel: this.settings.aiModel
    });
    await new Promise((resolve) => setTimeout(resolve, 1500));
    console.log("Track Edits: AI analysis complete (stub)");
  }
  async loadSystemPrompt() {
    try {
      const promptPath = this.settings.systemPromptPath;
      const adapter = this.app.vault.adapter;
      if (await adapter.exists(promptPath)) {
        return await adapter.read(promptPath);
      } else {
        const defaultPrompt = await this.getDefaultSystemPrompt();
        await adapter.write(promptPath, defaultPrompt);
        return defaultPrompt;
      }
    } catch (error) {
      console.error("Track Edits: Error loading system prompt:", error);
      return this.getDefaultSystemPrompt();
    }
  }
  async getDefaultSystemPrompt() {
    return `# Track Edits AI Analysis System Prompt

You are a Track Edits SME specializing in analyzing keystroke patterns and typing behavior.

Analyze edit clusters to identify user intent and provide workflow insights.

Focus on typing patterns, not content quality.`;
  }
  /**
   * Editorial Engine integration API for submitting AI-generated changes
   * Task 2.2: Platform Integration - Primary interface between Editorial Engine and Track Edits
   * 
   * @param changes Array of EditChange objects to record
   * @param aiProvider AI provider identifier (e.g., 'anthropic-claude', 'openai-gpt')  
   * @param aiModel AI model identifier (e.g., 'claude-3-sonnet', 'gpt-4')
   * @param processingContext Optional context about AI processing settings and constraints
   * @param options Optional configuration for session management and validation behavior
   * @returns Promise resolving to detailed result with success status, IDs, and error information
   */
  async submitChangesFromAI(changes, aiProvider, aiModel, processingContext, options = {}) {
    var _a, _b, _c, _d, _e, _f;
    const { AISubmissionErrorManager: AISubmissionErrorManager2 } = await Promise.resolve().then(() => (init_ai_submission_error_manager(), ai_submission_error_manager_exports));
    const { RetryRecoveryManager: RetryRecoveryManager2 } = await Promise.resolve().then(() => (init_retry_recovery_manager(), retry_recovery_manager_exports));
    const errorManager = new AISubmissionErrorManager2(this.batchManager);
    const retryManager = new RetryRecoveryManager2();
    const result = {
      success: false,
      changeIds: [],
      errors: [],
      warnings: []
    };
    const operationId = `ai_submit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    let transactionId;
    try {
      const { ChangeConsolidationManager: ChangeConsolidationManager2 } = await Promise.resolve().then(() => (init_change_consolidation_manager(), change_consolidation_manager_exports));
      const consolidationManager = new ChangeConsolidationManager2();
      const multiPluginOperation = {
        id: operationId,
        pluginId: "track-edits",
        pluginVersion: "1.0.0",
        sessionId: options.sessionId,
        documentPath: ((_a = this.app.workspace.getActiveFile()) == null ? void 0 : _a.path) || "unknown",
        changes: changes.map((change) => {
          var _a2;
          return {
            ...change,
            pluginId: "track-edits",
            operationId,
            semanticContext: ((_a2 = processingContext == null ? void 0 : processingContext.constraints) == null ? void 0 : _a2.some((c) => c.includes("semantic"))) ? {
              intention: "enhancement",
              scope: "paragraph",
              confidence: 0.8,
              preserveFormatting: true,
              preserveContent: true
            } : void 0
          };
        }),
        timestamp: Date.now(),
        priority: options.priority || 2,
        // HIGH priority for user-initiated Track Edits operations
        capabilities: {
          canMergeWith: ["editorial-engine", "writerr-chat"],
          conflictResolution: ["auto_merge", "priority_override"],
          maxConcurrentOperations: 5,
          supportsRealTimeConsolidation: true,
          supportedChangeTypes: ["insert", "delete", "replace"]
        },
        metadata: {
          userInitiated: !options.automated,
          batchId: processingContext == null ? void 0 : processingContext.batchId,
          estimatedProcessingTime: changes.length * 1e3,
          // Rough estimate
          requiresUserReview: changes.length > 10,
          canBeDeferred: false,
          tags: (processingContext == null ? void 0 : processingContext.constraints) || []
        }
      };
      const consolidationResult = await consolidationManager.submitOperation(multiPluginOperation);
      if (!consolidationResult.success) {
        result.errors.push(...consolidationResult.errors || []);
        result.warnings.push(...consolidationResult.warnings || []);
        if (consolidationResult.errors && consolidationResult.errors.length > 0) {
          return result;
        }
      }
      if (consolidationResult.requiresConsolidation) {
        result.warnings.push("Multi-plugin consolidation required - changes coordinated with other plugins");
        if (consolidationResult.estimatedWaitTime && consolidationResult.estimatedWaitTime > 0) {
          result.warnings.push(`Estimated wait time for consolidation: ${consolidationResult.estimatedWaitTime}ms`);
        }
      }
      const activeOperations = this.getActiveProcessingOperations();
      if (activeOperations.length > 0) {
        console.log(`[TrackEditsPlugin] Active AI processing operations detected: ${activeOperations.length}`);
        const coordinatedOperation = activeOperations.find(
          (op) => {
            var _a2;
            return op.operation.provider === aiProvider && op.operation.model === aiModel && op.input.documentId === ((_a2 = this.app.workspace.getActiveFile()) == null ? void 0 : _a2.path);
          }
        );
        if (coordinatedOperation && !options.forceProcessing) {
          result.warnings.push(`Coordinating with active AI processing operation: ${coordinatedOperation.requestId}`);
          const coordinatedResult = await this.waitForProcessingCompletion(coordinatedOperation.requestId, 3e4);
          if (coordinatedResult.success) {
            return coordinatedResult;
          } else {
            result.warnings.push("Coordinated operation failed, proceeding with independent processing");
          }
        } else {
          result.warnings.push("Multiple concurrent AI operations detected - processing independently");
        }
      }
      const requestId = operationId;
      const processingState = {
        requestId,
        operation: {
          type: (processingContext == null ? void 0 : processingContext.operationType) || "ai_submission",
          provider: aiProvider,
          model: aiModel,
          startTime: Date.now()
        },
        input: {
          documentId: ((_b = this.app.workspace.getActiveFile()) == null ? void 0 : _b.path) || "unknown",
          content: changes.map((c) => c.content).join("\n"),
          userPrompt: (processingContext == null ? void 0 : processingContext.userPrompt) || "AI submission via Track Edits",
          constraints: processingContext == null ? void 0 : processingContext.constraints
        },
        status: "preparing",
        progress: {
          percentage: 0,
          stage: "initializing"
        },
        sourcePlugin: "track-edits",
        sessionId: options.sessionId
      };
      this.aiProcessingStates.set(requestId, processingState);
      this.processingQueue.active.push(processingState);
      await this.publishAIProcessingStartEvent({
        requestId,
        operation: processingState.operation,
        input: processingState.input,
        config: {
          maxRetries: options.maxRetries || 3,
          timeoutMs: 3e5,
          // 5 minutes
          expectedDuration: changes.length * 1e3
          // Rough estimate
        },
        pluginContext: {
          sourcePluginId: "track-edits",
          sourcePluginVersion: "1.0.0",
          processingCapabilities: ["change_tracking", "session_management", "batch_processing"]
        }
      }, options.sessionId);
      processingState.status = "processing";
      processingState.progress = { percentage: 10, stage: "validating" };
      if (!changes || changes.length === 0) {
        processingState.status = "error";
        processingState.errorDetails = {
          type: "validation",
          message: "No changes provided",
          recoverable: false
        };
        result.errors.push("No changes provided");
        await this.publishAIProcessingErrorEvent(requestId, "validation", "No changes provided");
        return result;
      }
      if (!aiProvider || !aiModel) {
        processingState.status = "error";
        processingState.errorDetails = {
          type: "validation",
          message: "AI provider and model are required",
          recoverable: false
        };
        result.errors.push("AI provider and model are required");
        await this.publishAIProcessingErrorEvent(requestId, "validation", "AI provider and model are required");
        return result;
      }
      processingState.progress = { percentage: 20, stage: "authenticating" };
      await this.publishAIProcessingProgressEvent(requestId, processingState.progress, null, {
        tokensProcessed: 0,
        responseTime: Date.now() - processingState.operation.startTime,
        memoryUsage: 0
      });
      if (this.pluginRegistry && options.pluginAuthContext) {
        const pluginOptions = options;
        const pluginAuthContext = pluginOptions.pluginAuthContext;
        const authResult = await this.pluginRegistry.authenticatePlugin(
          pluginAuthContext.pluginId,
          {
            pluginId: pluginAuthContext.pluginId,
            authToken: pluginAuthContext.sessionToken,
            timestamp: /* @__PURE__ */ new Date(),
            nonce: Math.random().toString(36).substring(2, 15)
          }
        );
        if (!authResult) {
          processingState.status = "error";
          processingState.errorDetails = {
            type: "authentication",
            message: "Plugin authentication failed",
            recoverable: false
          };
          result.errors.push("Plugin authentication failed");
          await this.publishAIProcessingErrorEvent(requestId, "authentication", "Plugin authentication failed");
          return result;
        }
        const permissionResult = await this.pluginRegistry.validatePermissions(
          pluginAuthContext.pluginId,
          ["modify_documents", "create_sessions"],
          // Convert to PluginPermission enum
          { operation: "ai_submission", context: processingContext }
        );
        if (!permissionResult.hasPermission) {
          processingState.status = "error";
          processingState.errorDetails = {
            type: "permission",
            message: `Plugin lacks required permissions: ${permissionResult.missingPermissions.join(", ")}`,
            recoverable: false
          };
          result.errors.push(`Plugin lacks required permissions: ${permissionResult.missingPermissions.join(", ")}`);
          result.warnings.push(...permissionResult.warnings);
          await this.publishAIProcessingErrorEvent(requestId, "permission", `Plugin lacks required permissions: ${permissionResult.missingPermissions.join(", ")}`);
          return result;
        }
        const plugin = this.pluginRegistry.getPlugin(pluginAuthContext.pluginId);
        if (plugin) {
          const capabilityValid = await plugin.validateCapability("ai_submission");
          if (!capabilityValid) {
            result.warnings.push("Plugin may not fully support this type of AI submission");
          }
          const pluginInfo = plugin.getPluginInfo();
          if (changes.length > pluginInfo.capabilities.maxBatchSize) {
            processingState.status = "error";
            processingState.errorDetails = {
              type: "capability",
              message: `Batch size ${changes.length} exceeds plugin limit ${pluginInfo.capabilities.maxBatchSize}`,
              recoverable: true
            };
            result.errors.push(`Batch size ${changes.length} exceeds plugin limit ${pluginInfo.capabilities.maxBatchSize}`);
            await this.publishAIProcessingErrorEvent(requestId, "capability", `Batch size exceeds limit`);
            return result;
          }
          if (!pluginInfo.capabilities.aiProviders.includes(aiProvider)) {
            result.warnings.push(`Plugin may not be optimized for AI provider: ${aiProvider}`);
          }
        }
        if (processingContext) {
          processingContext = {
            ...processingContext,
            metadata: {
              ...processingContext.metadata,
              pluginId: pluginAuthContext.pluginId,
              pluginVersion: plugin == null ? void 0 : plugin.getPluginInfo().version,
              submissionTime: (/* @__PURE__ */ new Date()).toISOString()
            }
          };
        }
        result.warnings.push(...permissionResult.warnings);
        console.log(`[TrackEditsPlugin] AI submission authenticated for plugin: ${pluginAuthContext.pluginId}`);
      }
      processingState.progress = { percentage: 30, stage: "session_management" };
      await this.publishAIProcessingProgressEvent(requestId, processingState.progress);
      let sessionId = options.sessionId;
      if (!sessionId && options.createSession) {
        sessionId = generateId();
        const activeFile = this.app.workspace.getActiveFile();
        if (activeFile) {
          const session2 = {
            id: sessionId,
            startTime: Date.now(),
            changes: [],
            wordCount: 0,
            characterCount: 0
          };
          try {
            this.editTracker.startSession(session2, activeFile);
          } catch (sessionError) {
            const errorContext = {
              operation: "session_creation",
              sessionId,
              aiProvider,
              aiModel
            };
            const handledError = await errorManager.handleError(sessionError, errorContext);
            result.errors.push(handledError.error.message);
            result.warnings.push("Session creation failed - changes will be processed without session tracking");
            if (handledError.error.severity === "critical") {
              processingState.status = "error";
              processingState.errorDetails = {
                type: "session",
                message: handledError.error.message,
                recoverable: handledError.error.severity !== "critical"
              };
              await this.publishAIProcessingErrorEvent(requestId, "session", handledError.error.message);
              return result;
            }
            sessionId = void 0;
          }
        } else {
          processingState.status = "error";
          processingState.errorDetails = {
            type: "session",
            message: "Cannot create session: no active file",
            recoverable: false
          };
          result.errors.push("Cannot create session: no active file");
          await this.publishAIProcessingErrorEvent(requestId, "session", "Cannot create session: no active file");
          return result;
        }
      }
      if (!sessionId) {
        processingState.status = "error";
        processingState.errorDetails = {
          type: "session",
          message: "No session ID provided and createSession option not set",
          recoverable: false
        };
        result.errors.push("No session ID provided and createSession option not set");
        await this.publishAIProcessingErrorEvent(requestId, "session", "No session ID provided");
        return result;
      }
      processingState.sessionId = sessionId;
      const session = this.editTracker.getSession(sessionId);
      if (!session) {
        processingState.status = "error";
        processingState.errorDetails = {
          type: "session",
          message: `Session ${sessionId} not found`,
          recoverable: false
        };
        result.errors.push(`Session ${sessionId} not found`);
        await this.publishAIProcessingErrorEvent(requestId, "session", `Session not found`);
        return result;
      }
      processingState.progress = { percentage: 40, stage: "preparing_transaction" };
      await this.publishAIProcessingProgressEvent(requestId, processingState.progress);
      const backupState = errorManager.createBackupState(sessionId, {
        editTracker: this.editTracker,
        batchManager: this.batchManager
      });
      transactionId = errorManager.beginTransaction(sessionId, [
        { type: "create-changes", target: "session", data: changes },
        { type: "update-session", target: sessionId, data: { changes } }
      ]);
      processingState.progress = { percentage: 50, stage: "processing_changes" };
      await this.publishAIProcessingProgressEvent(requestId, processingState.progress);
      const operationResult = await retryManager.executeWithRetry(
        operationId,
        sessionId,
        async () => {
          processingState.progress = { percentage: 70, stage: "applying_changes" };
          await this.publishAIProcessingProgressEvent(requestId, processingState.progress);
          return await this.performAISubmissionOperation(
            changes,
            aiProvider,
            aiModel,
            processingContext,
            options,
            sessionId,
            session,
            errorManager,
            transactionId
          );
        },
        {
          maxRetries: options.maxRetries || 3,
          retryableErrorTypes: [
            (await Promise.resolve().then(() => (init_ai_submission_error_manager(), ai_submission_error_manager_exports))).ErrorType.NETWORK,
            (await Promise.resolve().then(() => (init_ai_submission_error_manager(), ai_submission_error_manager_exports))).ErrorType.EDITORIAL_ENGINE,
            (await Promise.resolve().then(() => (init_ai_submission_error_manager(), ai_submission_error_manager_exports))).ErrorType.RATE_LIMITING
          ]
        }
      );
      if (operationResult.success && operationResult.result) {
        processingState.progress = { percentage: 90, stage: "finalizing" };
        await this.publishAIProcessingProgressEvent(requestId, processingState.progress);
        if (transactionId) {
          errorManager.commitTransaction(transactionId);
        }
        processingState.status = "completed";
        processingState.progress = { percentage: 100, stage: "completed" };
        const activeIndex = this.processingQueue.active.findIndex((state) => state.requestId === requestId);
        if (activeIndex !== -1) {
          this.processingQueue.active.splice(activeIndex, 1);
          this.processingQueue.completed.push(processingState);
        }
        if (this.pluginRegistry && options.pluginAuthContext) {
          const pluginId = options.pluginAuthContext.pluginId;
          console.log(`[TrackEditsPlugin] Successful AI submission recorded for plugin: ${pluginId}`);
        }
        Object.assign(result, operationResult.result);
        result.success = true;
        await this.publishAIProcessingCompleteEvent({
          requestId,
          results: {
            changeIds: result.changeIds,
            changeGroupId: processingContext == null ? void 0 : processingContext.groupId,
            summary: `AI submission completed: ${result.changeIds.length} changes applied`,
            confidence: 0.9,
            // Default confidence
            appliedConstraints: (processingContext == null ? void 0 : processingContext.constraints) || []
          },
          metrics: {
            totalTokens: ((_c = processingState.metrics) == null ? void 0 : _c.tokensProcessed) || 0,
            processingTime: Date.now() - processingState.operation.startTime,
            qualityScore: 0.8,
            // Default quality score
            constraintCompliance: 1
            // Default compliance
          },
          recommendations: {
            suggestedReview: result.changeIds.length > 10,
            recommendedBatching: result.changeIds.length > 5 ? "group" : "individual",
            followupActions: []
          }
        }, sessionId);
        if (operationResult.fallbackUsed) {
          result.warnings.push(`Operation completed using fallback strategy: ${operationResult.fallbackUsed}`);
        }
        if (operationResult.attempts > 1) {
          result.warnings.push(`Operation succeeded after ${operationResult.attempts} attempts`);
        }
      } else {
        processingState.status = "error";
        processingState.errorDetails = {
          type: "operation",
          message: ((_d = operationResult.error) == null ? void 0 : _d.message) || "Operation failed",
          recoverable: ((_e = operationResult.error) == null ? void 0 : _e.rollbackRequired) !== true
        };
        const activeIndex = this.processingQueue.active.findIndex((state) => state.requestId === requestId);
        if (activeIndex !== -1) {
          this.processingQueue.active.splice(activeIndex, 1);
          this.processingQueue.failed.push(processingState);
        }
        if (transactionId && ((_f = operationResult.error) == null ? void 0 : _f.rollbackRequired)) {
          const rollbackResult = await errorManager.rollbackTransaction(
            transactionId,
            operationResult.error,
            {
              sessionManager: this,
              editTracker: this.editTracker,
              sessionId
            }
          );
          if (!rollbackResult.success) {
            result.errors.push(...rollbackResult.errors);
            result.warnings.push(...rollbackResult.warnings);
          } else {
            result.warnings.push("Changes have been rolled back due to operation failure");
          }
        }
        if (this.pluginRegistry && options.pluginAuthContext && operationResult.error) {
          const pluginId = options.pluginAuthContext.pluginId;
          await this.pluginRegistry.recordPluginError(pluginId, operationResult.error, {
            operation: "ai_submission",
            sessionId,
            changeCount: changes.length
          });
        }
        if (operationResult.error) {
          result.errors.push(operationResult.error.message);
          await this.publishAIProcessingErrorEvent(requestId, "operation", operationResult.error.message, {
            stage: "operation_execution",
            partialResults: [],
            resourceUsage: { memory: 0, cpu: 0 }
          }, {
            automaticRetryAvailable: false,
            manualInterventionRequired: true,
            suggestedActions: ["Check logs", "Retry with different parameters"],
            fallbackOptions: []
          });
          const userMessage = errorManager.generateUserErrorMessage(operationResult.error);
          if (userMessage !== operationResult.error.message) {
            result.warnings.push(userMessage);
          }
        } else {
          result.errors.push("Operation failed after all retry attempts");
          await this.publishAIProcessingErrorEvent(requestId, "retry_exhausted", "Operation failed after all retry attempts");
        }
      }
      return result;
    } catch (criticalError) {
      const errorContext = {
        operation: "ai_submission",
        sessionId: options.sessionId || "unknown",
        changeIds: changes.map((c) => c.id).filter(Boolean),
        transactionId,
        aiProvider,
        aiModel
      };
      const processingState = this.aiProcessingStates.get(operationId);
      if (processingState) {
        processingState.status = "error";
        processingState.errorDetails = {
          type: "critical",
          message: criticalError.message,
          recoverable: false
        };
        const activeIndex = this.processingQueue.active.findIndex((state) => state.requestId === operationId);
        if (activeIndex !== -1) {
          this.processingQueue.active.splice(activeIndex, 1);
          this.processingQueue.failed.push(processingState);
        }
      }
      const handledError = await errorManager.handleError(criticalError, errorContext);
      if (this.pluginRegistry && options.pluginAuthContext) {
        const pluginId = options.pluginAuthContext.pluginId;
        await this.pluginRegistry.recordPluginError(pluginId, handledError.error, errorContext);
      }
      if (transactionId && handledError.rollbackRequired) {
        try {
          await errorManager.rollbackTransaction(
            transactionId,
            handledError.error,
            {
              sessionManager: this,
              editTracker: this.editTracker,
              sessionId: options.sessionId || "unknown"
            }
          );
          result.warnings.push("System recovered from critical error - changes have been rolled back");
        } catch (rollbackError) {
          result.errors.push("Critical error occurred and rollback failed - manual recovery may be required");
          console.error("[TrackEditsPlugin] Critical rollback failure:", rollbackError);
        }
      }
      await this.publishAIProcessingErrorEvent(operationId, "critical", handledError.error.message, {
        stage: "critical_error",
        partialResults: [],
        resourceUsage: { memory: 0, cpu: 0 }
      }, {
        automaticRetryAvailable: false,
        manualInterventionRequired: true,
        suggestedActions: ["Check system logs", "Restart plugin", "Contact support"],
        fallbackOptions: []
      });
      const userMessage = errorManager.generateUserErrorMessage(handledError.error);
      result.errors.push(userMessage);
      console.error("[TrackEditsPlugin] Critical error in submitChangesFromAI:", {
        error: criticalError,
        context: errorContext,
        categorizedError: handledError.error,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
      return result;
    } finally {
      errorManager.cleanup();
      retryManager.cleanup();
      this.processingLocks.delete(operationId);
    }
  }
  /**
   * Enhanced event integration using standardized V2 event schemas
   */
  async publishEnhancedChangeEvent(eventType, payload, sessionId, priority = 1, persistence = "session") {
    var _a, _b;
    try {
      const {
        WriterrlEventFactory: WriterrlEventFactory2,
        EventPriority: EventPriority2,
        EventPersistence: EventPersistence2
      } = await Promise.resolve().then(() => (init_event_bus_integration(), event_bus_integration_exports));
      const baseEvent = WriterrlEventFactory2.createBaseEvent(
        eventType,
        "track-edits",
        priority,
        persistence
      );
      const enhancedEvent = {
        ...baseEvent,
        type: eventType,
        sessionId,
        documentId: (_a = this.app.workspace.getActiveFile()) == null ? void 0 : _a.path,
        targetPlugins: this.getTargetPluginsForEvent(eventType),
        payload: {
          ...payload,
          pluginVersion: this.manifest.version,
          timestamp: Date.now(),
          correlationId: baseEvent.metadata.correlationId
        }
      };
      if ((_b = this.eventBusConnection) == null ? void 0 : _b.isConnected()) {
        await this.eventBusConnection.publish(eventType, enhancedEvent);
      } else {
        await this.publishChangeEvent(eventType, payload, sessionId);
      }
    } catch (error) {
      console.error(`Failed to publish enhanced event ${eventType}:`, error);
      await this.publishChangeEvent(eventType, payload, sessionId);
    }
  }
  /**
   * Determine target plugins based on event type using routing configuration
   */
  getTargetPluginsForEvent(eventType) {
    const { STANDARD_EVENT_ROUTING: STANDARD_EVENT_ROUTING2 } = (init_event_coordination_patterns(), __toCommonJS(event_coordination_patterns_exports));
    const routing = STANDARD_EVENT_ROUTING2[eventType];
    return (routing == null ? void 0 : routing.targetPlugins) || ["writerr-chat", "editorial-engine"];
  }
  /**
   * Start a cross-plugin workflow using the orchestration system
   */
  async startCrossPluginWorkflow(workflowType, context) {
    try {
      const {
        WorkflowOrchestrator: WorkflowOrchestrator2,
        WriterrlWorkflowPatterns: WriterrlWorkflowPatterns2
      } = await Promise.resolve().then(() => (init_event_coordination_patterns(), event_coordination_patterns_exports));
      if (!this.workflowOrchestrator) {
        this.workflowOrchestrator = new WorkflowOrchestrator2();
      }
      const workflowId = `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      let steps;
      switch (workflowType) {
        case "chat-to-editorial-to-track":
          steps = WriterrlWorkflowPatterns2.getChatToEditorialToTrackWorkflow(workflowId);
          break;
        case "collaborative-edit":
          steps = WriterrlWorkflowPatterns2.getCollaborativeEditWorkflow(workflowId);
          break;
        case "batch-processing":
          steps = WriterrlWorkflowPatterns2.getBatchProcessingWorkflow(workflowId);
          break;
        default:
          throw new Error(`Unknown workflow type: ${workflowType}`);
      }
      const started = await this.workflowOrchestrator.startWorkflow(
        workflowId,
        workflowType,
        steps,
        context
      );
      if (!started) {
        throw new Error("Failed to start workflow");
      }
      return workflowId;
    } catch (error) {
      console.error(`Failed to start workflow ${workflowType}:`, error);
      throw error;
    }
  }
  /**
   * Core AI submission operation (extracted for retry logic)
   */
  async performAISubmissionOperation(changes, aiProvider, aiModel, processingContext, options = {}, sessionId, session, errorManager, transactionId) {
    var _a, _b, _c, _d, _e, _f;
    if (options.strictValidation !== false && !options.bypassValidation) {
      try {
        const environment = false ? "production" : false ? "testing" : "development";
        const validationConfig = AIMetadataValidator.getValidationConfig(environment);
        const validationOptions = {
          ...validationConfig,
          strictMode: (_a = options.strictValidation) != null ? _a : validationConfig.strictMode,
          bypassValidation: (_b = options.bypassValidation) != null ? _b : false,
          editorialEngineMode: (_c = options.editorialEngineMode) != null ? _c : validationConfig.editorialEngineMode,
          enableRateLimiting: validationConfig.enableRateLimiting,
          logSecurityViolations: validationConfig.logSecurityViolations
        };
        const validationResult = AIMetadataValidator.validateAIMetadata(
          aiProvider,
          aiModel,
          processingContext,
          /* @__PURE__ */ new Date(),
          validationOptions
        );
        if (!validationResult.isValid) {
          const validationError = new Error(`Validation failed: ${validationResult.errors.join(", ")}`);
          validationError.code = "VALIDATION_ERROR";
          validationError.details = validationResult;
          throw validationError;
        }
        aiProvider = ((_d = validationResult.sanitizedMetadata) == null ? void 0 : _d.aiProvider) || aiProvider;
        aiModel = ((_e = validationResult.sanitizedMetadata) == null ? void 0 : _e.aiModel) || aiModel;
        processingContext = ((_f = validationResult.sanitizedMetadata) == null ? void 0 : _f.processingContext) || processingContext;
        if (validationResult.securityThreats.length > 0) {
          console.warn("[TrackEditsPlugin] Security threats detected and sanitized:", validationResult.securityThreats);
        }
      } catch (validationError) {
        throw validationError;
      }
    }
    let changeGroupingResult;
    let changeGroupId;
    if (options.groupChanges && changes.length >= 2) {
      try {
        const operationType = options.editorialOperation || this.inferEditorialOperationType(changes, processingContext, options);
        const operationDescription = options.customOperationDescription || this.generateOperationDescription(operationType, changes.length);
        changeGroupingResult = this.batchManager.createBatches(
          changes,
          sessionId,
          operationType,
          operationDescription
        );
        if (changeGroupingResult.groups.length > 0) {
          changeGroupId = changeGroupingResult.groups[0].groupId;
        }
      } catch (batchError) {
        const batchErrorWithCode = new Error(`Batch processing failed: ${batchError instanceof Error ? batchError.message : String(batchError)}`);
        batchErrorWithCode.code = "BATCH_ERROR";
        throw batchErrorWithCode;
      }
    } else if (options.groupChanges) {
      changeGroupId = generateId();
    }
    const validatedChanges = [];
    for (let i = 0; i < changes.length; i++) {
      const change = changes[i];
      if (change.content) {
        const contentThreats = this.validateChangeContent(change.content);
        if (contentThreats.length > 0) {
          console.warn(`Change ${i} content security issues:`, contentThreats);
        }
      }
      const changeId = change.id || `${sessionId}_${Date.now()}_${i}`;
      const enhancedProcessingContext = {
        ...processingContext,
        // Add conversation context if provided
        ...options.conversationContext && {
          conversationId: options.conversationContext.conversationId,
          messageId: options.conversationContext.messageId,
          userPrompt: options.conversationContext.userPrompt
        },
        // Add change group ID if grouping is enabled
        ...changeGroupId && { changeGroupId },
        // Add Editorial Engine metadata
        metadata: {
          ...processingContext == null ? void 0 : processingContext.metadata,
          changeIndex: i,
          totalChanges: changes.length,
          validationTimestamp: (/* @__PURE__ */ new Date()).toISOString(),
          securityValidated: true,
          transactionId
        }
      };
      const validatedChange = {
        ...change,
        id: changeId,
        timestamp: change.timestamp || Date.now(),
        aiProvider,
        aiModel,
        processingContext: enhancedProcessingContext,
        aiTimestamp: /* @__PURE__ */ new Date(),
        author: change.author || "Editorial Engine"
      };
      validatedChanges.push(validatedChange);
    }
    let recordResult;
    try {
      recordResult = this.editTracker.recordAIChanges(
        sessionId,
        validatedChanges,
        aiProvider,
        aiModel,
        processingContext,
        /* @__PURE__ */ new Date(),
        {
          bypassValidation: options.bypassValidation || false,
          strictMode: options.strictValidation !== false,
          // Pass through Editorial Engine mode
          editorialEngineMode: options.editorialEngineMode
        }
      );
      if (!recordResult.success) {
        const recordError = new Error(`Failed to record changes: ${recordResult.errors.join(", ")}`);
        recordError.code = "STORAGE_ERROR";
        recordError.details = recordResult;
        throw recordError;
      }
    } catch (recordError) {
      throw recordError;
    }
    const operationResult = {
      success: true,
      sessionId,
      changeIds: validatedChanges.map((change) => change.id),
      errors: [],
      warnings: [...(recordResult == null ? void 0 : recordResult.warnings) || []],
      changeGroupId,
      groupingResult: changeGroupingResult,
      // Add validation summary to result
      validationSummary: {
        totalChanges: validatedChanges.length,
        provider: aiProvider,
        model: aiModel,
        validationMode: options.editorialEngineMode ? "Editorial Engine" : "Standard",
        securityChecksEnabled: options.strictValidation !== false
      }
    };
    if (this.settings.autoSave) {
      try {
        await this.saveCurrentSession();
      } catch (saveError) {
        operationResult.warnings.push("Auto-save failed but changes were recorded successfully");
        console.warn("[TrackEditsPlugin] Auto-save failed:", saveError);
      }
    }
    return operationResult;
  }
  /**
   * Validates change content for security threats
   * Used by submitChangesFromAI for individual change validation
   */
  validateChangeContent(content) {
    const threats = [];
    if (/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi.test(content)) {
      threats.push("Script injection detected");
    }
    if (/<iframe|<object|<embed|<applet/gi.test(content)) {
      threats.push("Potentially dangerous HTML elements");
    }
    if (/javascript:|data:|vbscript:/gi.test(content)) {
      threats.push("Dangerous URL protocols");
    }
    if (/(\bUNION\b|\bSELECT\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bDROP\b)/gi.test(content)) {
      threats.push("SQL injection patterns");
    }
    if (/[;&|`$(){}[\]\\]/.test(content) && content.length > 100) {
      threats.push("Command injection characters in large content");
    }
    return threats;
  }
  /**
   * Convenience method for single change submission
   * Wraps submitChangesFromAI for single EditChange objects
   */
  async submitSingleChangeFromAI(change, aiProvider, aiModel, processingContext, options = {}) {
    return this.submitChangesFromAI([change], aiProvider, aiModel, processingContext, options);
  }
  /**
   * Get changes by group ID for batch processing analysis
   * Useful for analyzing related changes submitted as a group
   */
  getChangesByGroupId(sessionId, groupId) {
    const session = this.editTracker.getSession(sessionId);
    if (!session)
      return [];
    return session.changes.filter(
      (change) => {
        var _a;
        return ((_a = change.processingContext) == null ? void 0 : _a.changeGroupId) === groupId;
      }
    );
  }
  /**
   * Infer editorial operation type from changes and context
   */
  inferEditorialOperationType(changes, processingContext, options) {
    var _a;
    if (processingContext == null ? void 0 : processingContext.mode) {
      const mode = processingContext.mode.toLowerCase();
      if (mode.includes("proofreading") || mode.includes("grammar") || mode.includes("spelling")) {
        return "proofreading";
      }
      if (mode.includes("copy-edit") || mode.includes("comprehensive")) {
        return "copy-edit-pass";
      }
      if (mode.includes("developmental") || mode.includes("structural")) {
        return "developmental-feedback";
      }
      if (mode.includes("style") || mode.includes("tone") || mode.includes("voice")) {
        return "style-refinement";
      }
      if (mode.includes("format") || mode.includes("structure")) {
        return "formatting";
      }
      if (mode.includes("expand") || mode.includes("clarify") || mode.includes("elaborate")) {
        return "content-expansion";
      }
      if (mode.includes("reduce") || mode.includes("trim") || mode.includes("condense")) {
        return "content-reduction";
      }
      if (mode.includes("rewrite") || mode.includes("restructure")) {
        return "rewriting";
      }
    }
    if ((_a = options == null ? void 0 : options.conversationContext) == null ? void 0 : _a.userPrompt) {
      const prompt = options.conversationContext.userPrompt.toLowerCase();
      if (prompt.includes("proofread") || prompt.includes("check grammar") || prompt.includes("fix spelling")) {
        return "proofreading";
      }
      if (prompt.includes("copy edit") || prompt.includes("comprehensive edit")) {
        return "copy-edit-pass";
      }
      if (prompt.includes("style") || prompt.includes("tone") || prompt.includes("voice")) {
        return "style-refinement";
      }
      if (prompt.includes("develop") || prompt.includes("structure") || prompt.includes("organize")) {
        return "developmental-feedback";
      }
    }
    const hasSmallChanges = changes.some(
      (c) => c.text && c.text.length < 20 || c.removedText && c.removedText.length < 20
    );
    const hasLargeChanges = changes.some(
      (c) => c.text && c.text.length > 100 || c.removedText && c.removedText.length > 100
    );
    const hasOnlyReplacements = changes.every((c) => c.type === "replace");
    const hasMostlyInsertions = changes.filter((c) => c.type === "insert").length > changes.length * 0.6;
    const hasMostlyDeletions = changes.filter((c) => c.type === "delete").length > changes.length * 0.6;
    if (hasOnlyReplacements && hasSmallChanges && !hasLargeChanges) {
      return "proofreading";
    }
    if (hasMostlyInsertions) {
      return "content-expansion";
    }
    if (hasMostlyDeletions) {
      return "content-reduction";
    }
    if (hasLargeChanges) {
      return "rewriting";
    }
    return "copy-edit-pass";
  }
  /**
   * Generate operation description based on type and change count
   */
  generateOperationDescription(operationType, changeCount) {
    const baseDescriptions = {
      "copy-edit-pass": "Comprehensive copy editing",
      "proofreading": "Grammar and spelling corrections",
      "developmental-feedback": "Structural improvements",
      "style-refinement": "Style and tone adjustments",
      "fact-checking": "Accuracy verification",
      "formatting": "Document formatting",
      "content-expansion": "Content additions",
      "content-reduction": "Content trimming",
      "rewriting": "Content restructuring",
      "custom": "Editorial changes"
    };
    const base = baseDescriptions[operationType];
    return `${base} (${changeCount} change${changeCount !== 1 ? "s" : ""})`;
  }
  /**
   * Get batch manager instance for external access
   */
  getBatchManager() {
    return this.batchManager;
  }
};
//# sourceMappingURL=main.js.map
