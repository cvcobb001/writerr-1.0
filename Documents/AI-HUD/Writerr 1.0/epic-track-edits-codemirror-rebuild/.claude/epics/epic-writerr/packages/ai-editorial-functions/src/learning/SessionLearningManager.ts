/**
 * @fileoverview Session Learning Manager - Handles user feedback integration and function adaptation
 */

import { EventData, globalEventBus } from '@writerr/shared';
import {
  SessionLearningData,
  UserFeedback,
  BehaviorAdaptation,
  DriftDetection,
  LearningMetrics,
  SessionLearningConfig,
  LearningPattern,
  LearningEvent,
  LearningEventType,
  AdaptationType,
  DriftType,
  PerformanceBaseline,
  PerformanceMeasurement,
  DriftTrend,
  LearningError,
  DriftDetectionError
} from './types';
import { FunctionDefinition, FunctionExecution } from '../types';

export class SessionLearningManager {
  private sessions = new Map<string, SessionLearningData>();
  private patterns = new Map<string, LearningPattern>();
  private baselines = new Map<string, PerformanceBaseline>();
  private config: SessionLearningConfig;
  private learningTimer?: NodeJS.Timeout;

  constructor(config: Partial<SessionLearningConfig> = {}) {
    this.config = {
      enabled: true,
      feedbackAggregationWindow: 30000, // 30 seconds
      adaptationThreshold: 0.7,
      driftDetectionSensitivity: 0.8,
      maxAdaptationsPerSession: 5,
      baselineUpdateInterval: '7d',
      retentionPeriod: '90d',
      anonymizedLogging: true,
      ...config
    };

    this.setupEventListeners();
    this.startLearningLoop();
  }

  private setupEventListeners(): void {
    globalEventBus.on('function-executed', (event: EventData) => {
      this.handleFunctionExecution(event.payload);
    });

    globalEventBus.on('user-feedback', (event: EventData) => {
      this.handleUserFeedback(event.payload);
    });

    globalEventBus.on('session-started', (event: EventData) => {
      this.initializeSession(event.payload.sessionId, event.payload.userId);
    });

    globalEventBus.on('session-ended', (event: EventData) => {
      this.finalizeSession(event.payload.sessionId);
    });
  }

  /**
   * Initialize a new learning session
   */
  initializeSession(sessionId: string, userId?: string): void {
    if (!this.config.enabled) return;

    const session: SessionLearningData = {
      functionId: '', // Will be set when functions are used
      sessionId,
      userId,
      learningMetrics: this.createEmptyMetrics(),
      feedbackHistory: [],
      adaptationHistory: [],
      driftMetrics: this.createEmptyDriftDetection(''),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.sessions.set(sessionId, session);
    this.emitLearningEvent(LearningEventType.BASELINE_UPDATED, sessionId, '', { session });
  }

  /**
   * Handle user feedback for function adaptation
   */
  async processFeedback(feedback: UserFeedback): Promise<void> {
    try {
      if (!this.config.enabled) return;

      const session = this.sessions.get(feedback.sessionId);
      if (!session) {
        throw new LearningError(
          `Session not found: ${feedback.sessionId}`,
          feedback.sessionId,
          feedback.functionId
        );
      }

      // Add feedback to history
      session.feedbackHistory.push(feedback);
      session.updatedAt = new Date();

      // Update learning metrics
      await this.updateLearningMetrics(session, feedback);

      // Check for patterns
      await this.analyzePatterns(session, feedback);

      // Check for drift
      await this.detectDrift(feedback.functionId, session);

      // Consider adaptation
      await this.considerAdaptation(session, feedback);

      // Emit learning event
      this.emitLearningEvent(
        LearningEventType.FEEDBACK_RECEIVED,
        feedback.sessionId,
        feedback.functionId,
        { feedback }
      );

      // Mark feedback as processed
      feedback.processed = true;

    } catch (error) {
      console.error('[SessionLearningManager] Error processing feedback:', error);
      throw new LearningError(
        `Failed to process feedback: ${(error as Error).message}`,
        feedback.sessionId,
        feedback.functionId,
        error as Error
      );
    }
  }

  /**
   * Adapt function behavior based on learning patterns
   */
  async adaptFunction(
    functionId: string,
    sessionId: string,
    adaptationType: AdaptationType,
    reason: string
  ): Promise<BehaviorAdaptation | null> {
    try {
      const session = this.sessions.get(sessionId);
      if (!session) return null;

      // Check adaptation limits
      const sessionAdaptations = session.adaptationHistory.filter(a => a.isActive).length;
      if (sessionAdaptations >= this.config.maxAdaptationsPerSession) {
        console.warn(`[SessionLearningManager] Maximum adaptations reached for session ${sessionId}`);
        return null;
      }

      // Generate adaptation changes based on type and patterns
      const changes = await this.generateAdaptationChanges(functionId, adaptationType, session);
      if (changes.length === 0) return null;

      const adaptation: BehaviorAdaptation = {
        id: `${functionId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        functionId,
        adaptationType,
        trigger: {
          type: 'user-feedback',
          threshold: this.config.adaptationThreshold,
          confidence: this.calculateAdaptationConfidence(session),
          dataPoints: session.feedbackHistory.length,
          timeWindow: this.config.feedbackAggregationWindow.toString()
        },
        changes,
        impact: {
          performanceChange: 0,
          userSatisfactionChange: 0,
          confidenceChange: 0,
          executionTimeChange: 0,
          measuredAt: new Date(),
          measurementPeriod: '0s'
        },
        timestamp: new Date(),
        isActive: true
      };

      // Apply the adaptation
      const success = await this.applyAdaptation(adaptation);
      if (success) {
        session.adaptationHistory.push(adaptation);
        session.updatedAt = new Date();

        this.emitLearningEvent(
          LearningEventType.ADAPTATION_APPLIED,
          sessionId,
          functionId,
          { adaptation }
        );

        return adaptation;
      }

      return null;
    } catch (error) {
      console.error('[SessionLearningManager] Error adapting function:', error);
      return null;
    }
  }

  /**
   * Detect performance drift in functions
   */
  async detectDrift(functionId: string, session: SessionLearningData): Promise<DriftDetection | null> {
    try {
      const baseline = this.baselines.get(functionId);
      if (!baseline) {
        // Create baseline if it doesn't exist
        await this.createBaseline(functionId, session);
        return null;
      }

      const current = this.calculateCurrentPerformance(functionId, session);
      const driftScore = this.calculateDriftScore(baseline, current);

      if (driftScore > this.config.driftDetectionSensitivity) {
        const drift: DriftDetection = {
          functionId,
          driftScore,
          driftType: this.determineDriftType(baseline, current),
          detectedAt: new Date(),
          baseline,
          current,
          trend: this.calculateDriftTrend(functionId, current),
          requiresIntervention: driftScore > 0.9,
          interventionSuggestions: this.generateInterventionSuggestions(baseline, current)
        };

        session.driftMetrics = drift;

        this.emitLearningEvent(
          LearningEventType.DRIFT_DETECTED,
          session.sessionId,
          functionId,
          { drift }
        );

        if (drift.requiresIntervention) {
          this.emitLearningEvent(
            LearningEventType.INTERVENTION_REQUIRED,
            session.sessionId,
            functionId,
            { drift, urgent: true }
          );
        }

        return drift;
      }

      return null;
    } catch (error) {
      console.error('[SessionLearningManager] Error detecting drift:', error);
      throw new DriftDetectionError(
        `Failed to detect drift for function ${functionId}`,
        functionId,
        DriftType.PERFORMANCE_DRIFT,
        error as Error
      );
    }
  }

  /**
   * Get session learning data
   */
  getSessionData(sessionId: string): SessionLearningData | null {
    return this.sessions.get(sessionId) || null;
  }

  /**
   * Get learning patterns for analysis
   */
  getLearningPatterns(): LearningPattern[] {
    return Array.from(this.patterns.values())
      .filter(pattern => pattern.isActive)
      .sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Get function performance baseline
   */
  getBaseline(functionId: string): PerformanceBaseline | null {
    return this.baselines.get(functionId) || null;
  }

  /**
   * Clean up old sessions and data
   */
  cleanup(): void {
    const cutoff = Date.now() - this.parseTimeToMs(this.config.retentionPeriod);
    const toDelete: string[] = [];

    this.sessions.forEach((session, sessionId) => {
      if (session.createdAt.getTime() < cutoff) {
        toDelete.push(sessionId);
      }
    });

    toDelete.forEach(sessionId => this.sessions.delete(sessionId));

    if (toDelete.length > 0) {
      console.log(`[SessionLearningManager] Cleaned up ${toDelete.length} old sessions`);
    }
  }

  // Private helper methods
  private createEmptyMetrics(): LearningMetrics {
    return {
      totalExecutions: 0,
      successfulExecutions: 0,
      averageConfidence: 0,
      averageUserRating: 0,
      improvementTrend: 0,
      adaptationScore: 0,
      stabilityScore: 1,
      lastUpdated: new Date()
    };
  }

  private createEmptyDriftDetection(functionId: string): DriftDetection {
    return {
      functionId,
      driftScore: 0,
      driftType: DriftType.PERFORMANCE_DRIFT,
      detectedAt: new Date(),
      baseline: this.createEmptyBaseline(),
      current: this.createEmptyMeasurement(),
      trend: {
        direction: 'stable',
        velocity: 0,
        acceleration: 0,
        projection: {
          estimatedScore: 0,
          timeHorizon: '7d',
          confidence: 0
        }
      },
      requiresIntervention: false
    };
  }

  private createEmptyBaseline(): PerformanceBaseline {
    return {
      averageConfidence: 0,
      averageRating: 0,
      averageExecutionTime: 0,
      successRate: 0,
      consistencyScore: 0,
      establishedAt: new Date(),
      dataPoints: 0,
      validUntil: new Date(Date.now() + this.parseTimeToMs(this.config.baselineUpdateInterval))
    };
  }

  private createEmptyMeasurement(): PerformanceMeasurement {
    return {
      averageConfidence: 0,
      averageRating: 0,
      averageExecutionTime: 0,
      successRate: 0,
      consistencyScore: 0,
      measuredAt: new Date(),
      dataPoints: 0,
      timeWindow: '1h'
    };
  }

  private handleFunctionExecution(payload: any): void {
    // Handle function execution for learning metrics
    if (!payload.sessionId) return;

    const session = this.sessions.get(payload.sessionId);
    if (session) {
      session.learningMetrics.totalExecutions++;
      if (payload.status === 'completed') {
        session.learningMetrics.successfulExecutions++;
      }
      session.updatedAt = new Date();
    }
  }

  private handleUserFeedback(feedback: UserFeedback): void {
    this.processFeedback(feedback).catch(error => {
      console.error('[SessionLearningManager] Error handling feedback:', error);
    });
  }

  private finalizeSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      // Perform final learning analysis
      this.performFinalAnalysis(session);
      
      // Keep session data for retention period
      // (cleanup will remove it later)
    }
  }

  private async updateLearningMetrics(session: SessionLearningData, feedback: UserFeedback): Promise<void> {
    const metrics = session.learningMetrics;
    
    // Update average rating
    const totalRatings = session.feedbackHistory.length;
    const sumRatings = session.feedbackHistory.reduce((sum, fb) => sum + fb.rating, 0);
    metrics.averageUserRating = totalRatings > 0 ? sumRatings / totalRatings : 0;

    // Calculate improvement trend
    if (session.feedbackHistory.length >= 5) {
      const recentRatings = session.feedbackHistory.slice(-5).map(fb => fb.rating);
      const earlierRatings = session.feedbackHistory.slice(-10, -5).map(fb => fb.rating);
      
      if (earlierRatings.length > 0) {
        const recentAvg = recentRatings.reduce((sum, r) => sum + r, 0) / recentRatings.length;
        const earlierAvg = earlierRatings.reduce((sum, r) => sum + r, 0) / earlierRatings.length;
        metrics.improvementTrend = (recentAvg - earlierAvg) / 5; // Normalized to -1 to 1
      }
    }

    metrics.lastUpdated = new Date();
  }

  private async analyzePatterns(session: SessionLearningData, feedback: UserFeedback): Promise<void> {
    // Pattern analysis logic would go here
    // This would involve machine learning algorithms to detect feedback patterns
    
    // For now, implement basic pattern detection
    const patternKey = `${feedback.feedbackType}-${feedback.context.complexity}`;
    let pattern = this.patterns.get(patternKey);
    
    if (!pattern) {
      pattern = {
        id: patternKey,
        name: `${feedback.feedbackType} feedback for ${feedback.context.complexity} content`,
        description: `Pattern detected for ${feedback.feedbackType} feedback on ${feedback.context.complexity} complexity content`,
        pattern: [],
        confidence: 0.1,
        occurrences: 1,
        lastSeen: new Date(),
        actions: [],
        isActive: true
      };
      this.patterns.set(patternKey, pattern);
    } else {
      pattern.occurrences++;
      pattern.confidence = Math.min(pattern.confidence + 0.1, 1.0);
      pattern.lastSeen = new Date();
    }

    if (pattern.confidence > 0.7) {
      this.emitLearningEvent(
        LearningEventType.PATTERN_DETECTED,
        session.sessionId,
        feedback.functionId,
        { pattern, feedback }
      );
    }
  }

  private async considerAdaptation(session: SessionLearningData, feedback: UserFeedback): Promise<void> {
    // Check if adaptation is needed
    if (feedback.rating < 3 && session.feedbackHistory.length >= 3) {
      const recentFeedback = session.feedbackHistory.slice(-3);
      const averageRating = recentFeedback.reduce((sum, fb) => sum + fb.rating, 0) / recentFeedback.length;
      
      if (averageRating < 3 && this.calculateAdaptationConfidence(session) > this.config.adaptationThreshold) {
        await this.adaptFunction(
          feedback.functionId,
          session.sessionId,
          AdaptationType.PROMPT_ADJUSTMENT,
          'Low user satisfaction ratings detected'
        );
      }
    }
  }

  private async generateAdaptationChanges(
    functionId: string,
    adaptationType: AdaptationType,
    session: SessionLearningData
  ): Promise<any[]> {
    // Generate specific changes based on adaptation type and learning data
    const changes: any[] = [];

    switch (adaptationType) {
      case AdaptationType.PROMPT_ADJUSTMENT:
        // Analyze common feedback issues and adjust prompts
        const commonIssues = this.analyzeCommonIssues(session.feedbackHistory);
        for (const issue of commonIssues) {
          changes.push({
            component: 'systemPrompt',
            before: 'current system prompt', // Would fetch actual prompt
            after: `enhanced prompt addressing ${issue.category}`,
            reason: `Address common ${issue.category} issues`,
            confidence: 0.8
          });
        }
        break;

      case AdaptationType.PARAMETER_TUNING:
        // Adjust parameters based on performance metrics
        if (session.learningMetrics.averageUserRating < 3) {
          changes.push({
            component: 'temperature',
            before: 0.7,
            after: 0.5,
            reason: 'Reduce variability for consistency',
            confidence: 0.7
          });
        }
        break;

      // Add other adaptation types...
    }

    return changes;
  }

  private async applyAdaptation(adaptation: BehaviorAdaptation): Promise<boolean> {
    try {
      // This would interface with the function registry to apply changes
      globalEventBus.emit('apply-function-adaptation', {
        adaptation
      }, 'session-learning');

      return true;
    } catch (error) {
      console.error('[SessionLearningManager] Error applying adaptation:', error);
      return false;
    }
  }

  private async createBaseline(functionId: string, session: SessionLearningData): Promise<void> {
    const baseline: PerformanceBaseline = {
      averageConfidence: session.learningMetrics.averageConfidence || 0.8,
      averageRating: session.learningMetrics.averageUserRating || 4.0,
      averageExecutionTime: 1000, // Would calculate from actual executions
      successRate: session.learningMetrics.totalExecutions > 0 
        ? session.learningMetrics.successfulExecutions / session.learningMetrics.totalExecutions 
        : 1.0,
      consistencyScore: 0.85,
      establishedAt: new Date(),
      dataPoints: session.feedbackHistory.length,
      validUntil: new Date(Date.now() + this.parseTimeToMs(this.config.baselineUpdateInterval))
    };

    this.baselines.set(functionId, baseline);
  }

  private calculateCurrentPerformance(functionId: string, session: SessionLearningData): PerformanceMeasurement {
    const recentFeedback = session.feedbackHistory.slice(-10); // Last 10 feedback items
    
    return {
      averageConfidence: session.learningMetrics.averageConfidence,
      averageRating: recentFeedback.length > 0 
        ? recentFeedback.reduce((sum, fb) => sum + fb.rating, 0) / recentFeedback.length 
        : 0,
      averageExecutionTime: 1000, // Would calculate from actual executions
      successRate: 1.0, // Would calculate from actual execution data
      consistencyScore: this.calculateConsistencyScore(recentFeedback),
      measuredAt: new Date(),
      dataPoints: recentFeedback.length,
      timeWindow: '1h'
    };
  }

  private calculateDriftScore(baseline: PerformanceBaseline, current: PerformanceMeasurement): number {
    const ratingDrift = Math.abs(baseline.averageRating - current.averageRating) / 5;
    const confidenceDrift = Math.abs(baseline.averageConfidence - current.averageConfidence);
    const consistencyDrift = Math.abs(baseline.consistencyScore - current.consistencyScore);
    
    return (ratingDrift + confidenceDrift + consistencyDrift) / 3;
  }

  private determineDriftType(baseline: PerformanceBaseline, current: PerformanceMeasurement): DriftType {
    const ratingDiff = baseline.averageRating - current.averageRating;
    const confidenceDiff = baseline.averageConfidence - current.averageConfidence;
    
    if (Math.abs(ratingDiff) > Math.abs(confidenceDiff)) {
      return DriftType.USER_SATISFACTION_DRIFT;
    } else {
      return DriftType.QUALITY_DRIFT;
    }
  }

  private calculateDriftTrend(functionId: string, current: PerformanceMeasurement): DriftTrend {
    return {
      direction: 'stable',
      velocity: 0,
      acceleration: 0,
      projection: {
        estimatedScore: current.averageRating,
        timeHorizon: '7d',
        confidence: 0.7
      }
    };
  }

  private generateInterventionSuggestions(baseline: PerformanceBaseline, current: PerformanceMeasurement): string[] {
    const suggestions: string[] = [];
    
    if (current.averageRating < baseline.averageRating - 0.5) {
      suggestions.push('Review and adjust function prompts based on recent feedback');
    }
    
    if (current.consistencyScore < baseline.consistencyScore - 0.1) {
      suggestions.push('Reduce temperature parameter for more consistent outputs');
    }
    
    return suggestions;
  }

  private calculateAdaptationConfidence(session: SessionLearningData): number {
    const dataPoints = session.feedbackHistory.length;
    const consistency = session.learningMetrics.stabilityScore;
    const recentTrend = session.learningMetrics.improvementTrend;
    
    // Simple confidence calculation
    const dataConfidence = Math.min(dataPoints / 10, 1); // More data = higher confidence
    const stabilityConfidence = consistency;
    const trendConfidence = recentTrend < 0 ? 0.8 : 0.5; // Higher confidence if declining
    
    return (dataConfidence + stabilityConfidence + trendConfidence) / 3;
  }

  private analyzeCommonIssues(feedbackHistory: UserFeedback[]): Array<{ category: string; frequency: number }> {
    const issues = new Map<string, number>();
    
    feedbackHistory.forEach(feedback => {
      feedback.specificIssues?.forEach(issue => {
        const count = issues.get(issue.category) || 0;
        issues.set(issue.category, count + 1);
      });
    });
    
    return Array.from(issues.entries())
      .map(([category, frequency]) => ({ category, frequency }))
      .sort((a, b) => b.frequency - a.frequency);
  }

  private calculateConsistencyScore(feedbackHistory: UserFeedback[]): number {
    if (feedbackHistory.length < 2) return 1.0;
    
    const ratings = feedbackHistory.map(fb => fb.rating);
    const mean = ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
    const variance = ratings.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / ratings.length;
    
    // Convert variance to consistency score (0-1, higher is more consistent)
    return Math.max(0, 1 - (variance / 4)); // Normalize by max possible variance (5^2 / 4 = 6.25, but use 4 for more sensitivity)
  }

  private performFinalAnalysis(session: SessionLearningData): void {
    // Perform end-of-session analysis
    const metrics = session.learningMetrics;
    
    // Update adaptation score based on session performance
    if (session.adaptationHistory.length > 0) {
      const adaptationSuccess = session.adaptationHistory
        .filter(a => a.impact.userSatisfactionChange > 0).length / session.adaptationHistory.length;
      metrics.adaptationScore = adaptationSuccess;
    }
    
    // Update stability score
    metrics.stabilityScore = this.calculateConsistencyScore(session.feedbackHistory);
    
    session.updatedAt = new Date();
  }

  private startLearningLoop(): void {
    this.learningTimer = setInterval(() => {
      this.performPeriodicLearning();
    }, this.config.feedbackAggregationWindow);
  }

  private performPeriodicLearning(): void {
    // Perform periodic learning tasks
    this.cleanup();
    
    // Update baselines if needed
    this.baselines.forEach((baseline, functionId) => {
      if (new Date() > baseline.validUntil) {
        // Baseline needs updating
        const session = Array.from(this.sessions.values())
          .find(s => s.feedbackHistory.some(fb => fb.functionId === functionId));
        
        if (session) {
          this.createBaseline(functionId, session);
        }
      }
    });
  }

  private parseTimeToMs(timeString: string): number {
    const unit = timeString.slice(-1);
    const value = parseInt(timeString.slice(0, -1));
    
    switch (unit) {
      case 's': return value * 1000;
      case 'm': return value * 60 * 1000;
      case 'h': return value * 60 * 60 * 1000;
      case 'd': return value * 24 * 60 * 60 * 1000;
      default: return value;
    }
  }

  private emitLearningEvent(
    type: LearningEventType,
    sessionId: string,
    functionId: string,
    data: any
  ): void {
    const event: LearningEvent = {
      type,
      sessionId,
      functionId,
      data,
      timestamp: new Date(),
      confidence: data.confidence
    };

    globalEventBus.emit('learning-event', event, 'session-learning');
  }

  dispose(): void {
    if (this.learningTimer) {
      clearInterval(this.learningTimer);
      this.learningTimer = undefined;
    }
  }
}

// Export singleton instance
export const sessionLearningManager = new SessionLearningManager();