/**
 * @fileoverview Types for session learning and user feedback systems
 */

export interface SessionLearningData {
  functionId: string;
  sessionId: string;
  userId?: string;
  learningMetrics: LearningMetrics;
  feedbackHistory: UserFeedback[];
  adaptationHistory: BehaviorAdaptation[];
  driftMetrics: DriftDetection;
  createdAt: Date;
  updatedAt: Date;
}

export interface LearningMetrics {
  totalExecutions: number;
  successfulExecutions: number;
  averageConfidence: number;
  averageUserRating: number;
  improvementTrend: number; // -1 to 1, where 1 is improving
  adaptationScore: number; // How well the function adapts to user preferences
  stabilityScore: number; // Consistency of performance
  lastUpdated: Date;
}

export interface UserFeedback {
  id: string;
  executionId: string;
  functionId: string;
  sessionId: string;
  feedbackType: FeedbackType;
  rating: number; // 1-5 scale
  textFeedback?: string;
  specificIssues?: FeedbackIssue[];
  context: FeedbackContext;
  timestamp: Date;
  processed: boolean;
}

export enum FeedbackType {
  QUALITY = 'quality',
  ACCURACY = 'accuracy',
  RELEVANCE = 'relevance',
  STYLE = 'style',
  TONE = 'tone',
  GENERAL = 'general'
}

export interface FeedbackIssue {
  category: FeedbackCategory;
  severity: 'low' | 'medium' | 'high';
  description: string;
  suggestion?: string;
}

export enum FeedbackCategory {
  GRAMMAR = 'grammar',
  STYLE = 'style',
  CONTENT = 'content',
  TONE = 'tone',
  FORMAT = 'format',
  ACCURACY = 'accuracy',
  RELEVANCE = 'relevance',
  OTHER = 'other'
}

export interface FeedbackContext {
  documentType?: string;
  contentLength: number;
  complexity: 'simple' | 'medium' | 'complex';
  domain?: string;
  userExpertiseLevel?: 'novice' | 'intermediate' | 'expert';
  timeOfDay?: string;
  sessionDuration: number;
}

export interface BehaviorAdaptation {
  id: string;
  functionId: string;
  adaptationType: AdaptationType;
  trigger: AdaptationTrigger;
  changes: AdaptationChange[];
  impact: AdaptationImpact;
  timestamp: Date;
  isActive: boolean;
  revertedAt?: Date;
  revertReason?: string;
}

export enum AdaptationType {
  PROMPT_ADJUSTMENT = 'prompt-adjustment',
  PARAMETER_TUNING = 'parameter-tuning',
  CONSTRAINT_MODIFICATION = 'constraint-modification',
  EXAMPLE_WEIGHTING = 'example-weighting',
  OUTPUT_FORMATTING = 'output-formatting'
}

export interface AdaptationTrigger {
  type: 'user-feedback' | 'performance-decline' | 'pattern-recognition' | 'drift-detection';
  threshold: number;
  confidence: number;
  dataPoints: number;
  timeWindow: string; // e.g., "7d", "30m"
}

export interface AdaptationChange {
  component: string; // e.g., "systemPrompt", "temperature", "constraints.maxLength"
  before: any;
  after: any;
  reason: string;
  confidence: number;
}

export interface AdaptationImpact {
  performanceChange: number; // -1 to 1
  userSatisfactionChange: number; // -1 to 1
  confidenceChange: number; // -1 to 1
  executionTimeChange: number; // milliseconds difference
  measuredAt: Date;
  measurementPeriod: string;
}

export interface DriftDetection {
  functionId: string;
  driftScore: number; // 0-1, where 1 is maximum drift
  driftType: DriftType;
  detectedAt: Date;
  baseline: PerformanceBaseline;
  current: PerformanceMeasurement;
  trend: DriftTrend;
  requiresIntervention: boolean;
  interventionSuggestions?: string[];
}

export enum DriftType {
  PERFORMANCE_DRIFT = 'performance-drift',
  QUALITY_DRIFT = 'quality-drift',
  USER_SATISFACTION_DRIFT = 'user-satisfaction-drift',
  OUTPUT_CONSISTENCY_DRIFT = 'output-consistency-drift',
  TIMING_DRIFT = 'timing-drift'
}

export interface PerformanceBaseline {
  averageConfidence: number;
  averageRating: number;
  averageExecutionTime: number;
  successRate: number;
  consistencyScore: number;
  establishedAt: Date;
  dataPoints: number;
  validUntil: Date;
}

export interface PerformanceMeasurement {
  averageConfidence: number;
  averageRating: number;
  averageExecutionTime: number;
  successRate: number;
  consistencyScore: number;
  measuredAt: Date;
  dataPoints: number;
  timeWindow: string;
}

export interface DriftTrend {
  direction: 'improving' | 'stable' | 'declining';
  velocity: number; // Rate of change per time unit
  acceleration: number; // Change in velocity
  projection: DriftProjection;
}

export interface DriftProjection {
  estimatedScore: number; // Projected drift score in X time
  timeHorizon: string; // e.g., "7d", "30d"
  confidence: number; // Confidence in the projection
  interventionDeadline?: Date; // When intervention must occur
}

export interface SessionLearningConfig {
  enabled: boolean;
  feedbackAggregationWindow: number; // milliseconds
  adaptationThreshold: number; // 0-1, confidence needed to trigger adaptation
  driftDetectionSensitivity: number; // 0-1, higher = more sensitive
  maxAdaptationsPerSession: number;
  baselineUpdateInterval: string; // e.g., "7d"
  retentionPeriod: string; // e.g., "90d"
  anonymizedLogging: boolean;
}

export interface LearningPattern {
  id: string;
  name: string;
  description: string;
  pattern: PatternRule[];
  confidence: number;
  occurrences: number;
  lastSeen: Date;
  actions: PatternAction[];
  isActive: boolean;
}

export interface PatternRule {
  field: string; // e.g., 'feedback.rating', 'context.complexity'
  operator: 'equals' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'regex';
  value: any;
  weight: number; // Importance of this rule in the pattern
}

export interface PatternAction {
  type: 'adapt-prompt' | 'adjust-parameters' | 'modify-constraints' | 'flag-for-review';
  parameters: Record<string, any>;
  confidence: number;
  description: string;
}

// Event types for learning system
export interface LearningEvent {
  type: LearningEventType;
  sessionId: string;
  functionId: string;
  data: any;
  timestamp: Date;
  confidence?: number;
}

export enum LearningEventType {
  FEEDBACK_RECEIVED = 'feedback-received',
  PATTERN_DETECTED = 'pattern-detected',
  ADAPTATION_APPLIED = 'adaptation-applied',
  DRIFT_DETECTED = 'drift-detected',
  BASELINE_UPDATED = 'baseline-updated',
  INTERVENTION_REQUIRED = 'intervention-required'
}

// Error types
export class LearningError extends Error {
  constructor(
    message: string,
    public sessionId: string,
    public functionId?: string,
    public cause?: Error
  ) {
    super(message);
    this.name = 'LearningError';
  }
}

export class DriftDetectionError extends Error {
  constructor(
    message: string,
    public functionId: string,
    public driftType: DriftType,
    public cause?: Error
  ) {
    super(message);
    this.name = 'DriftDetectionError';
  }
}