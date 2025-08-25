/**
 * @fileoverview Types for integration with Track Edits and AI Providers
 */

import { Change, ChangeCategory, ChangeSource } from '../../track-edits/src/types';
import { TrackEditsConfig, FunctionDefinition, FunctionExecution } from '../types';

// Track Edits Integration Types
export interface TrackEditsIntegration {
  functionId: string;
  configuration: TrackEditsIntegrationConfig;
  isEnabled: boolean;
  statistics: TrackEditsStats;
  lastSync: Date;
}

export interface TrackEditsIntegrationConfig extends TrackEditsConfig {
  // Extended configuration specific to AI Editorial Functions
  functionSpecificSettings: FunctionSpecificSettings;
  outputRouting: OutputRoutingConfig;
  changeMapping: ChangeMappingConfig;
  reviewWorkflow: ReviewWorkflowConfig;
}

export interface FunctionSpecificSettings {
  // Per-function batching strategy
  batchingBehavior: {
    strategy: 'immediate' | 'smart-batch' | 'time-delayed' | 'content-aware';
    delay: number; // milliseconds
    maxBatchSize: number;
    contextAwareness: boolean;
  };
  
  // Clustering configuration
  clusteringRules: {
    strategy: 'sentence' | 'paragraph' | 'semantic' | 'function-type' | 'custom';
    semanticSimilarityThreshold: number;
    contextWindowSize: number;
    customRules?: ClusteringRule[];
  };
  
  // Confidence and quality thresholds
  qualityGates: {
    minimumConfidence: number;
    autoApplyThreshold: number;
    requireReviewThreshold: number;
    rejectThreshold: number;
  };
}

export interface OutputRoutingConfig {
  // How function outputs are routed through Track Edits
  routingMode: 'direct' | 'processed' | 'hybrid';
  preprocessors: PreprocessorConfig[];
  postprocessors: PostprocessorConfig[];
  changeEnrichment: ChangeEnrichmentConfig;
}

export interface PreprocessorConfig {
  id: string;
  type: 'text-cleanup' | 'format-normalize' | 'context-extract' | 'custom';
  enabled: boolean;
  parameters: Record<string, any>;
  priority: number;
}

export interface PostprocessorConfig {
  id: string;
  type: 'confidence-adjust' | 'category-refine' | 'metadata-enrich' | 'custom';
  enabled: boolean;
  parameters: Record<string, any>;
  priority: number;
}

export interface ChangeEnrichmentConfig {
  // Additional metadata to add to changes
  includeConfidence: boolean;
  includeFunctionContext: boolean;
  includeReasoningChain: boolean;
  includeAlternatives: boolean;
  includeSuggestionMetrics: boolean;
}

export interface ChangeMappingConfig {
  // Map function output types to Track Edits change categories
  functionToChangeMapping: Map<string, ChangeCategory>;
  confidenceToSourceMapping: Map<string, ChangeSource>;
  customMappings: CustomMappingRule[];
}

export interface CustomMappingRule {
  id: string;
  condition: MappingCondition;
  action: MappingAction;
  priority: number;
}

export interface MappingCondition {
  field: string; // e.g., 'function.category', 'output.confidence', 'content.length'
  operator: 'equals' | 'gt' | 'lt' | 'contains' | 'regex' | 'custom';
  value: any;
  weight: number;
}

export interface MappingAction {
  setCategory?: ChangeCategory;
  setSource?: ChangeSource;
  addMetadata?: Record<string, any>;
  adjustConfidence?: number; // -1 to 1 adjustment
  customAction?: string;
}

export interface ReviewWorkflowConfig {
  // Configure when changes require review
  autoApprovalRules: ApprovalRule[];
  reviewAssignmentRules: ReviewAssignmentRule[];
  escalationRules: EscalationRule[];
  reviewTimeouts: ReviewTimeoutConfig;
}

export interface ApprovalRule {
  id: string;
  condition: ReviewCondition;
  action: 'auto-approve' | 'require-review' | 'reject' | 'escalate';
  priority: number;
}

export interface ReviewCondition {
  confidenceThreshold?: number;
  functionCategory?: string;
  changeType?: string;
  contentLength?: { min?: number; max?: number };
  userExpertiseLevel?: string;
  customCondition?: string;
}

export interface ReviewAssignmentRule {
  id: string;
  condition: ReviewCondition;
  assignTo: 'user' | 'expert-reviewer' | 'ai-validator' | 'custom';
  priority: number;
}

export interface EscalationRule {
  id: string;
  trigger: EscalationTrigger;
  action: EscalationAction;
  timeout: number; // milliseconds
}

export interface EscalationTrigger {
  type: 'timeout' | 'quality-concern' | 'user-dispute' | 'system-conflict';
  threshold?: number;
  parameters?: Record<string, any>;
}

export interface EscalationAction {
  type: 'notify-admin' | 'require-expert-review' | 'pause-function' | 'revert-changes';
  parameters?: Record<string, any>;
  notificationChannels?: string[];
}

export interface ReviewTimeoutConfig {
  defaultTimeout: number; // milliseconds
  categoryTimeouts: Map<ChangeCategory, number>;
  urgentTimeout: number;
  escalationTimeout: number;
}

export interface ClusteringRule {
  id: string;
  name: string;
  condition: ClusteringCondition;
  action: ClusteringAction;
  weight: number;
}

export interface ClusteringCondition {
  type: 'proximity' | 'semantic' | 'category' | 'confidence' | 'custom';
  parameters: Record<string, any>;
}

export interface ClusteringAction {
  type: 'group' | 'separate' | 'merge' | 'defer';
  parameters: Record<string, any>;
}

export interface TrackEditsStats {
  totalChangesRouted: number;
  autoApprovedChanges: number;
  reviewRequiredChanges: number;
  rejectedChanges: number;
  averageProcessingTime: number;
  averageConfidenceScore: number;
  lastUpdated: Date;
}

// AI Providers Integration Types
export interface AIProvidersIntegration {
  functionId: string;
  configuration: AIProvidersConfig;
  isEnabled: boolean;
  statistics: AIProvidersStats;
  lastSync: Date;
}

export interface AIProvidersConfig {
  // Model selection and routing
  modelRouting: ModelRoutingConfig;
  fallbackStrategy: FallbackStrategyConfig;
  loadBalancing: LoadBalancingConfig;
  
  // Request optimization
  requestOptimization: RequestOptimizationConfig;
  caching: CachingConfig;
  
  // Quality and monitoring
  qualityControl: QualityControlConfig;
  monitoring: MonitoringConfig;
}

export interface ModelRoutingConfig {
  // Primary model configuration
  primaryModel: ModelConfig;
  fallbackModels: ModelConfig[];
  
  // Routing rules
  routingRules: ModelRoutingRule[];
  
  // A/B testing
  experimentConfig?: ExperimentConfig;
}

export interface ModelConfig {
  providerId: string; // e.g., 'openai', 'anthropic', 'local'
  modelId: string;    // e.g., 'gpt-4', 'claude-3-sonnet'
  
  // Model parameters
  parameters: ModelParameters;
  
  // Usage constraints
  constraints: ModelConstraints;
  
  // Performance characteristics
  performance: ModelPerformanceProfile;
}

export interface ModelParameters {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  systemPrompt?: string;
  customParameters?: Record<string, any>;
}

export interface ModelConstraints {
  maxRequestsPerMinute: number;
  maxTokensPerRequest: number;
  maxConcurrentRequests: number;
  costLimitPerHour?: number;
  allowedHours?: { start: number; end: number }; // Hour of day constraints
}

export interface ModelPerformanceProfile {
  averageLatency: number; // milliseconds
  averageQuality: number; // 0-1 score
  reliability: number;    // 0-1 score
  costPerToken: number;
  lastUpdated: Date;
}

export interface ModelRoutingRule {
  id: string;
  condition: RoutingCondition;
  targetModel: string;
  priority: number;
  isActive: boolean;
}

export interface RoutingCondition {
  type: 'content-length' | 'complexity' | 'urgency' | 'cost-budget' | 'time-of-day' | 'user-preference' | 'custom';
  operator: 'equals' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'custom';
  value: any;
  weight: number;
}

export interface ExperimentConfig {
  isActive: boolean;
  experimentId: string;
  variants: ExperimentVariant[];
  trafficSplit: Record<string, number>; // variant -> percentage
  successMetrics: string[];
  duration: number; // milliseconds
}

export interface ExperimentVariant {
  id: string;
  name: string;
  modelConfig: ModelConfig;
  description: string;
}

export interface FallbackStrategyConfig {
  enabled: boolean;
  triggerConditions: FallbackTrigger[];
  fallbackChain: string[]; // Ordered list of model IDs
  maxRetries: number;
  retryDelay: number; // milliseconds
  circuitBreaker: CircuitBreakerConfig;
}

export interface FallbackTrigger {
  type: 'timeout' | 'rate-limit' | 'error' | 'quality-threshold' | 'cost-limit';
  threshold?: number;
  enabled: boolean;
}

export interface CircuitBreakerConfig {
  enabled: boolean;
  failureThreshold: number;
  recoveryTime: number; // milliseconds
  halfOpenMaxRequests: number;
}

export interface LoadBalancingConfig {
  strategy: 'round-robin' | 'least-connections' | 'weighted' | 'performance-based' | 'cost-optimized';
  weights: Record<string, number>; // model ID -> weight
  healthChecks: HealthCheckConfig;
}

export interface HealthCheckConfig {
  enabled: boolean;
  interval: number; // milliseconds
  timeout: number;  // milliseconds
  healthEndpoint?: string;
  customHealthCheck?: string;
}

export interface RequestOptimizationConfig {
  // Request batching
  batching: {
    enabled: boolean;
    maxBatchSize: number;
    maxWaitTime: number; // milliseconds
    compatibilityCheck: boolean;
  };
  
  // Request compression
  compression: {
    enabled: boolean;
    algorithm: 'gzip' | 'brotli' | 'custom';
    threshold: number; // bytes
  };
  
  // Request deduplication
  deduplication: {
    enabled: boolean;
    windowSize: number; // milliseconds
    hashFunction: 'sha256' | 'md5' | 'custom';
  };
}

export interface CachingConfig {
  enabled: boolean;
  strategy: 'memory' | 'redis' | 'file' | 'hybrid';
  
  // Cache rules
  cacheRules: CacheRule[];
  
  // Cache settings
  settings: CacheSettings;
}

export interface CacheRule {
  id: string;
  condition: CacheCondition;
  action: 'cache' | 'no-cache' | 'conditional';
  ttl: number; // milliseconds
  priority: number;
}

export interface CacheCondition {
  type: 'function-type' | 'content-hash' | 'parameters' | 'user' | 'custom';
  parameters: Record<string, any>;
}

export interface CacheSettings {
  maxSize: number; // bytes
  maxEntries: number;
  cleanupInterval: number; // milliseconds
  compressionEnabled: boolean;
  encryptionEnabled: boolean;
}

export interface QualityControlConfig {
  // Output validation
  validation: {
    enabled: boolean;
    validators: ValidatorConfig[];
    onFailure: 'reject' | 'retry' | 'fallback' | 'manual-review';
  };
  
  // Quality scoring
  scoring: {
    enabled: boolean;
    scorers: ScorerConfig[];
    minimumScore: number;
    weightedAverage: boolean;
  };
  
  // Content filtering
  filtering: {
    enabled: boolean;
    filters: FilterConfig[];
    onFiltered: 'reject' | 'clean' | 'flag';
  };
}

export interface ValidatorConfig {
  id: string;
  type: 'schema' | 'length' | 'language' | 'toxicity' | 'custom';
  parameters: Record<string, any>;
  weight: number;
  isRequired: boolean;
}

export interface ScorerConfig {
  id: string;
  type: 'coherence' | 'relevance' | 'accuracy' | 'fluency' | 'custom';
  parameters: Record<string, any>;
  weight: number;
}

export interface FilterConfig {
  id: string;
  type: 'profanity' | 'bias' | 'personal-info' | 'custom';
  parameters: Record<string, any>;
  strictness: 'low' | 'medium' | 'high';
}

export interface MonitoringConfig {
  // Performance monitoring
  performance: {
    enabled: boolean;
    metrics: PerformanceMetric[];
    alertThresholds: AlertThreshold[];
  };
  
  // Usage monitoring
  usage: {
    enabled: boolean;
    trackCosts: boolean;
    budgetLimits: BudgetLimit[];
  };
  
  // Quality monitoring
  quality: {
    enabled: boolean;
    continuousEvaluation: boolean;
    benchmarkTests: BenchmarkTest[];
  };
}

export interface PerformanceMetric {
  name: string;
  type: 'latency' | 'throughput' | 'error-rate' | 'availability' | 'custom';
  aggregation: 'avg' | 'p95' | 'p99' | 'max' | 'sum';
  window: number; // milliseconds
}

export interface AlertThreshold {
  metric: string;
  operator: 'gt' | 'lt' | 'gte' | 'lte';
  value: number;
  severity: 'info' | 'warning' | 'error' | 'critical';
  action: 'log' | 'notify' | 'escalate' | 'circuit-break';
}

export interface BudgetLimit {
  type: 'hourly' | 'daily' | 'monthly';
  limit: number; // currency units
  warningThreshold: number; // percentage
  actionOnExceeded: 'pause' | 'fallback' | 'notify';
}

export interface BenchmarkTest {
  id: string;
  name: string;
  testCases: BenchmarkTestCase[];
  schedule: string; // cron expression
  enabled: boolean;
}

export interface BenchmarkTestCase {
  input: string;
  expectedOutput?: string;
  qualityThreshold: number;
  tags: string[];
}

export interface AIProvidersStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  totalCost: number;
  averageLatency: number;
  averageQualityScore: number;
  cacheHitRate: number;
  modelUsageDistribution: Record<string, number>;
  lastUpdated: Date;
}

// Integration Events
export interface IntegrationEvent {
  type: IntegrationType;
  functionId: string;
  eventType: IntegrationEventType;
  data: any;
  timestamp: Date;
  success: boolean;
  error?: string;
}

export enum IntegrationType {
  TRACK_EDITS = 'track-edits',
  AI_PROVIDERS = 'ai-providers'
}

export enum IntegrationEventType {
  CONFIGURED = 'configured',
  ENABLED = 'enabled',
  DISABLED = 'disabled',
  CHANGE_ROUTED = 'change-routed',
  MODEL_CALLED = 'model-called',
  ERROR_OCCURRED = 'error-occurred',
  FALLBACK_TRIGGERED = 'fallback-triggered',
  CACHE_HIT = 'cache-hit',
  QUALITY_CHECK_FAILED = 'quality-check-failed'
}

// Error types
export class IntegrationError extends Error {
  constructor(
    message: string,
    public integrationType: IntegrationType,
    public functionId: string,
    public cause?: Error
  ) {
    super(message);
    this.name = 'IntegrationError';
  }
}

export class TrackEditsIntegrationError extends IntegrationError {
  constructor(
    message: string,
    public functionId: string,
    public changeId?: string,
    cause?: Error
  ) {
    super(message, IntegrationType.TRACK_EDITS, functionId, cause);
    this.name = 'TrackEditsIntegrationError';
  }
}

export class AIProvidersIntegrationError extends IntegrationError {
  constructor(
    message: string,
    public functionId: string,
    public providerId?: string,
    public modelId?: string,
    cause?: Error
  ) {
    super(message, IntegrationType.AI_PROVIDERS, functionId, cause);
    this.name = 'AIProvidersIntegrationError';
  }
}