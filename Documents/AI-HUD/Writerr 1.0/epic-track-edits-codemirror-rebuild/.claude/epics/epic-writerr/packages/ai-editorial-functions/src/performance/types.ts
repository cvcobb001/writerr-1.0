/**
 * @fileoverview Types for performance monitoring and resource management
 */

export interface PerformanceMonitor {
  functionId: string;
  isEnabled: boolean;
  configuration: PerformanceConfig;
  metrics: PerformanceMetrics;
  alerts: PerformanceAlert[];
  lastUpdate: Date;
}

export interface PerformanceConfig {
  // Monitoring settings
  monitoring: MonitoringConfig;
  
  // Resource limits
  resourceLimits: ResourceLimits;
  
  // Performance thresholds
  thresholds: PerformanceThresholds;
  
  // Alerting configuration
  alerting: AlertingConfig;
  
  // Optimization settings
  optimization: OptimizationConfig;
}

export interface MonitoringConfig {
  enabled: boolean;
  interval: number; // milliseconds
  retentionPeriod: string; // e.g., "7d", "30d"
  
  // What to monitor
  trackCPU: boolean;
  trackMemory: boolean;
  trackLatency: boolean;
  trackThroughput: boolean;
  trackErrorRate: boolean;
  trackQuality: boolean;
  trackCosts: boolean;
  
  // Sampling configuration
  sampling: {
    enabled: boolean;
    rate: number; // 0-1, percentage of requests to sample
    strategy: 'random' | 'systematic' | 'adaptive';
  };
}

export interface ResourceLimits {
  // CPU limits
  maxCPUUsage: number; // percentage
  cpuTimeLimit: number; // milliseconds per request
  
  // Memory limits
  maxMemoryUsage: number; // bytes
  memoryGrowthRate: number; // max bytes/second growth
  
  // Concurrency limits
  maxConcurrentExecutions: number;
  maxQueueSize: number;
  
  // Time limits
  maxExecutionTime: number; // milliseconds
  maxQueueWaitTime: number; // milliseconds
  
  // Cost limits
  maxCostPerHour: number;
  maxCostPerRequest: number;
}

export interface PerformanceThresholds {
  // Latency thresholds
  latency: {
    warning: number; // milliseconds
    critical: number; // milliseconds
    p95Target: number; // milliseconds
    p99Target: number; // milliseconds
  };
  
  // Throughput thresholds
  throughput: {
    warningMin: number; // requests per second
    criticalMin: number; // requests per second
    targetRPS: number;
  };
  
  // Error rate thresholds
  errorRate: {
    warning: number; // percentage
    critical: number; // percentage
    maxAcceptable: number; // percentage
  };
  
  // Quality thresholds
  quality: {
    warning: number; // quality score
    critical: number; // quality score
    target: number; // target quality score
  };
  
  // Resource usage thresholds
  resources: {
    cpuWarning: number; // percentage
    cpuCritical: number; // percentage
    memoryWarning: number; // percentage
    memoryCritical: number; // percentage
  };
}

export interface AlertingConfig {
  enabled: boolean;
  
  // Alert channels
  channels: AlertChannel[];
  
  // Alert rules
  rules: AlertRule[];
  
  // Escalation
  escalation: EscalationConfig;
  
  // Rate limiting
  rateLimiting: {
    enabled: boolean;
    maxAlertsPerHour: number;
    cooldownPeriod: number; // milliseconds
  };
}

export interface AlertChannel {
  id: string;
  type: 'email' | 'slack' | 'webhook' | 'log' | 'event-bus';
  enabled: boolean;
  configuration: Record<string, any>;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface AlertRule {
  id: string;
  name: string;
  condition: AlertCondition;
  severity: AlertSeverity;
  enabled: boolean;
  channels: string[]; // channel IDs
  cooldown: number; // milliseconds
  description: string;
}

export interface AlertCondition {
  metric: string;
  operator: 'gt' | 'lt' | 'gte' | 'lte' | 'equals' | 'not-equals';
  value: number;
  window: number; // time window in milliseconds
  minDataPoints: number;
}

export enum AlertSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

export interface EscalationConfig {
  enabled: boolean;
  levels: EscalationLevel[];
}

export interface EscalationLevel {
  severity: AlertSeverity;
  delay: number; // milliseconds
  channels: string[];
  actions: EscalationAction[];
}

export interface EscalationAction {
  type: 'pause-function' | 'scale-down' | 'notify-admin' | 'trigger-circuit-breaker';
  parameters: Record<string, any>;
}

export interface OptimizationConfig {
  enabled: boolean;
  
  // Auto-scaling
  autoScaling: {
    enabled: boolean;
    minConcurrency: number;
    maxConcurrency: number;
    targetUtilization: number; // percentage
    scaleUpThreshold: number;
    scaleDownThreshold: number;
    cooldownPeriod: number; // milliseconds
  };
  
  // Load balancing
  loadBalancing: {
    enabled: boolean;
    strategy: 'round-robin' | 'least-connections' | 'weighted' | 'adaptive';
    weights: Record<string, number>;
  };
  
  // Caching
  caching: {
    enabled: boolean;
    strategy: 'lru' | 'lfu' | 'ttl' | 'adaptive';
    maxSize: number; // bytes
    ttl: number; // milliseconds
  };
  
  // Request optimization
  requestOptimization: {
    enabled: boolean;
    batching: boolean;
    compression: boolean;
    deduplication: boolean;
  };
}

export interface PerformanceMetrics {
  functionId: string;
  timestamp: Date;
  timeWindow: string; // e.g., "1m", "5m", "1h"
  
  // Execution metrics
  execution: ExecutionMetrics;
  
  // Resource metrics
  resources: ResourceMetrics;
  
  // Quality metrics
  quality: QualityMetrics;
  
  // Business metrics
  business: BusinessMetrics;
  
  // Historical data
  historical: HistoricalMetrics;
}

export interface ExecutionMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  
  // Latency metrics
  latency: {
    average: number;
    median: number;
    p95: number;
    p99: number;
    min: number;
    max: number;
  };
  
  // Throughput metrics
  throughput: {
    requestsPerSecond: number;
    requestsPerMinute: number;
    requestsPerHour: number;
  };
  
  // Error metrics
  errors: {
    rate: number; // percentage
    count: number;
    byType: Record<string, number>;
    lastError?: Date;
  };
  
  // Queue metrics
  queue: {
    currentSize: number;
    maxSize: number;
    averageWaitTime: number;
    maxWaitTime: number;
  };
}

export interface ResourceMetrics {
  // CPU metrics
  cpu: {
    usage: number; // percentage
    time: number; // total CPU time in milliseconds
    averagePerRequest: number; // milliseconds per request
  };
  
  // Memory metrics
  memory: {
    used: number; // bytes
    peak: number; // bytes
    averagePerRequest: number; // bytes per request
    growthRate: number; // bytes per second
  };
  
  // Concurrency metrics
  concurrency: {
    active: number;
    peak: number;
    average: number;
    utilization: number; // percentage of max concurrency
  };
  
  // Network metrics
  network: {
    bytesIn: number;
    bytesOut: number;
    requestSize: {
      average: number;
      max: number;
    };
    responseSize: {
      average: number;
      max: number;
    };
  };
}

export interface QualityMetrics {
  // Output quality
  outputQuality: {
    average: number;
    median: number;
    min: number;
    max: number;
    distribution: Record<string, number>; // score range -> count
  };
  
  // User satisfaction
  userSatisfaction: {
    average: number;
    ratingDistribution: Record<number, number>; // rating -> count
    feedbackCount: number;
  };
  
  // Accuracy metrics
  accuracy: {
    score: number;
    validationPassed: number;
    validationFailed: number;
    falsePositives: number;
    falseNegatives: number;
  };
  
  // Consistency metrics
  consistency: {
    score: number;
    variance: number;
    outlierCount: number;
  };
}

export interface BusinessMetrics {
  // Cost metrics
  costs: {
    total: number;
    perRequest: number;
    perHour: number;
    breakdown: Record<string, number>; // component -> cost
  };
  
  // Usage metrics
  usage: {
    activeUsers: number;
    totalSessions: number;
    averageSessionDuration: number;
    retentionRate: number;
  };
  
  // Value metrics
  value: {
    timesSaved: number; // seconds
    improvementScore: number;
    userProductivity: number;
    automationRate: number; // percentage
  };
}

export interface HistoricalMetrics {
  trends: {
    latency: TrendData;
    throughput: TrendData;
    errorRate: TrendData;
    quality: TrendData;
    costs: TrendData;
  };
  
  // Seasonal patterns
  patterns: {
    hourlyUsage: number[]; // 24 values
    dailyUsage: number[];  // 7 values
    monthlyUsage: number[]; // 12 values
  };
  
  // Benchmarks
  benchmarks: {
    baselineLatency: number;
    baselineQuality: number;
    baselineCost: number;
    lastBenchmarkUpdate: Date;
  };
}

export interface TrendData {
  current: number;
  previous: number;
  change: number; // percentage change
  direction: 'improving' | 'stable' | 'degrading';
  dataPoints: TimeSeriesPoint[];
}

export interface TimeSeriesPoint {
  timestamp: Date;
  value: number;
}

export interface PerformanceAlert {
  id: string;
  functionId: string;
  rule: AlertRule;
  severity: AlertSeverity;
  message: string;
  triggeredAt: Date;
  resolvedAt?: Date;
  isActive: boolean;
  
  // Alert details
  details: {
    metric: string;
    currentValue: number;
    threshold: number;
    duration: number; // how long the condition has persisted
  };
  
  // Actions taken
  actions: AlertAction[];
  
  // Escalation state
  escalation: {
    level: number;
    nextEscalation?: Date;
    escalated: boolean;
  };
}

export interface AlertAction {
  type: string;
  timestamp: Date;
  result: 'success' | 'failure' | 'partial';
  details?: string;
}

export interface FunctionPriority {
  functionId: string;
  priority: number; // 0-100, higher is more important
  factors: PriorityFactors;
  lastCalculated: Date;
  isSticky: boolean; // Whether priority should persist across sessions
}

export interface PriorityFactors {
  // Performance factors
  performance: {
    latency: number;        // Lower latency = higher priority
    reliability: number;    // Higher reliability = higher priority
    quality: number;        // Higher quality = higher priority
    weight: number;
  };
  
  // User preference factors
  userPreferences: {
    frequency: number;      // More frequently used = higher priority
    rating: number;         // Higher rated = higher priority
    recency: number;        // More recently used = higher priority
    weight: number;
  };
  
  // Business factors
  business: {
    cost: number;          // Lower cost = higher priority (for similar quality)
    roi: number;           // Return on investment
    strategic: number;      // Strategic importance
    weight: number;
  };
  
  // Context factors
  context: {
    urgency: number;       // Current urgency level
    complexity: number;    // Content complexity match
    domain: number;        // Domain expertise match
    weight: number;
  };
  
  // System factors
  system: {
    availability: number;  // System availability
    load: number;          // Current system load (inverse priority)
    resources: number;     // Available resources
    weight: number;
  };
}

export interface FunctionSelector {
  strategy: SelectionStrategy;
  configuration: SelectionConfig;
  statistics: SelectionStatistics;
}

export interface SelectionStrategy {
  type: 'priority-based' | 'round-robin' | 'weighted' | 'contextual' | 'ml-based' | 'hybrid';
  parameters: Record<string, any>;
}

export interface SelectionConfig {
  // Selection criteria
  criteria: SelectionCriteria;
  
  // Fallback behavior
  fallback: {
    enabled: boolean;
    strategy: 'default' | 'random' | 'best-available';
    defaultFunctionId?: string;
  };
  
  // Learning and adaptation
  learning: {
    enabled: boolean;
    adaptationRate: number; // How quickly to adapt to new data
    explorationRate: number; // Balance between exploitation and exploration
  };
}

export interface SelectionCriteria {
  // Must-have criteria
  required: SelectionFilter[];
  
  // Preferred criteria (weighted)
  preferred: WeightedCriteria[];
  
  // Exclusion criteria
  excluded: SelectionFilter[];
}

export interface SelectionFilter {
  field: string;
  operator: 'equals' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'in';
  value: any;
}

export interface WeightedCriteria {
  field: string;
  weight: number;
  direction: 'maximize' | 'minimize';
  transform?: 'linear' | 'log' | 'sqrt' | 'custom';
}

export interface SelectionStatistics {
  totalSelections: number;
  selectionDistribution: Record<string, number>; // functionId -> count
  averageSelectionTime: number;
  successRate: number;
  
  // A/B testing results
  experiments: ExperimentResult[];
  
  // Selection effectiveness
  effectiveness: {
    userSatisfaction: number;
    taskCompletion: number;
    errorReduction: number;
    timesSaved: number;
  };
}

export interface ExperimentResult {
  id: string;
  name: string;
  startDate: Date;
  endDate?: Date;
  variants: ExperimentVariant[];
  results: ExperimentMetrics;
  significance: number;
  winner?: string;
}

export interface ExperimentVariant {
  id: string;
  name: string;
  trafficAllocation: number; // percentage
  configuration: any;
}

export interface ExperimentMetrics {
  [variantId: string]: {
    samples: number;
    conversionRate: number;
    averageLatency: number;
    userSatisfaction: number;
    confidence: number;
  };
}

export interface ResourceManager {
  functionId: string;
  isEnabled: boolean;
  configuration: ResourceManagementConfig;
  currentUsage: ResourceUsage;
  quotas: ResourceQuotas;
  pools: ResourcePool[];
}

export interface ResourceManagementConfig {
  // Allocation strategy
  allocation: {
    strategy: 'fair' | 'priority-based' | 'adaptive' | 'burst';
    reservationMode: 'guaranteed' | 'best-effort' | 'hybrid';
  };
  
  // Scaling configuration
  scaling: {
    enabled: boolean;
    minInstances: number;
    maxInstances: number;
    targetCPUUtilization: number;
    targetMemoryUtilization: number;
    scaleUpCooldown: number;
    scaleDownCooldown: number;
  };
  
  // Throttling configuration
  throttling: {
    enabled: boolean;
    maxRequestsPerSecond: number;
    burstCapacity: number;
    backoffStrategy: 'linear' | 'exponential' | 'fixed';
  };
}

export interface ResourceUsage {
  cpu: {
    current: number;    // percentage
    average: number;    // percentage over time window
    peak: number;       // peak usage
  };
  
  memory: {
    current: number;    // bytes
    average: number;    // bytes over time window  
    peak: number;       // peak usage
  };
  
  network: {
    inbound: number;    // bytes/second
    outbound: number;   // bytes/second
  };
  
  storage: {
    used: number;       // bytes
    iops: number;       // operations per second
  };
  
  concurrency: {
    active: number;     // current active executions
    queued: number;     // queued requests
  };
  
  timestamp: Date;
}

export interface ResourceQuotas {
  cpu: {
    limit: number;      // CPU cores
    request: number;    // guaranteed CPU
  };
  
  memory: {
    limit: number;      // bytes
    request: number;    // guaranteed memory
  };
  
  network: {
    bandwidthLimit: number; // bytes/second
  };
  
  requests: {
    rateLimit: number;  // requests/second
    burstLimit: number; // burst requests
  };
  
  cost: {
    hourlyLimit: number;
    dailyLimit: number;
  };
}

export interface ResourcePool {
  id: string;
  type: 'cpu' | 'memory' | 'network' | 'storage' | 'custom';
  capacity: number;
  available: number;
  reserved: number;
  allocations: ResourceAllocation[];
}

export interface ResourceAllocation {
  functionId: string;
  amount: number;
  priority: number;
  timestamp: Date;
  expiresAt?: Date;
}

// Events and errors
export interface PerformanceEvent {
  type: PerformanceEventType;
  functionId: string;
  data: any;
  timestamp: Date;
  severity: 'info' | 'warning' | 'error' | 'critical';
}

export enum PerformanceEventType {
  THRESHOLD_EXCEEDED = 'threshold-exceeded',
  RESOURCE_EXHAUSTED = 'resource-exhausted',
  PERFORMANCE_DEGRADED = 'performance-degraded',
  OPTIMIZATION_APPLIED = 'optimization-applied',
  ALERT_TRIGGERED = 'alert-triggered',
  SCALING_EVENT = 'scaling-event',
  PRIORITY_CHANGED = 'priority-changed'
}

export class PerformanceError extends Error {
  constructor(
    message: string,
    public functionId: string,
    public metric?: string,
    public currentValue?: number,
    public threshold?: number,
    public cause?: Error
  ) {
    super(message);
    this.name = 'PerformanceError';
  }
}

export class ResourceExhaustionError extends PerformanceError {
  constructor(
    message: string,
    public functionId: string,
    public resourceType: string,
    public requested: number,
    public available: number,
    cause?: Error
  ) {
    super(message, functionId, resourceType, requested, available, cause);
    this.name = 'ResourceExhaustionError';
  }
}