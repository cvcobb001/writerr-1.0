/**
 * @fileoverview Feedback Processor - Handles user feedback pattern recognition and analysis
 */

import { EventData, globalEventBus } from '@writerr/shared';
import {
  UserFeedback,
  FeedbackType,
  FeedbackCategory,
  FeedbackIssue,
  LearningPattern,
  PatternRule,
  PatternAction,
  LearningEvent,
  LearningEventType,
  FeedbackContext,
  LearningError
} from './types';

export class FeedbackProcessor {
  private patternRules = new Map<string, LearningPattern>();
  private feedbackBuffer = new Map<string, UserFeedback[]>(); // sessionId -> feedback array
  private processingQueue: UserFeedback[] = [];
  private isProcessing = false;
  private processingTimer?: NodeJS.Timeout;

  constructor() {
    this.initializePatternRules();
    this.setupEventListeners();
    this.startProcessingLoop();
  }

  /**
   * Process user feedback and extract patterns
   */
  async processFeedback(feedback: UserFeedback): Promise<void> {
    try {
      // Validate feedback
      this.validateFeedback(feedback);

      // Add to processing queue
      this.processingQueue.push(feedback);

      // Add to session buffer for pattern analysis
      if (!this.feedbackBuffer.has(feedback.sessionId)) {
        this.feedbackBuffer.set(feedback.sessionId, []);
      }
      this.feedbackBuffer.get(feedback.sessionId)!.push(feedback);

      // Trigger immediate processing if high priority
      if (this.isHighPriorityFeedback(feedback)) {
        await this.processImmediately(feedback);
      }

    } catch (error) {
      console.error('[FeedbackProcessor] Error processing feedback:', error);
      throw new LearningError(
        `Failed to process feedback: ${(error as Error).message}`,
        feedback.sessionId,
        feedback.functionId,
        error as Error
      );
    }
  }

  /**
   * Analyze patterns in feedback data
   */
  async analyzePatterns(sessionId: string): Promise<LearningPattern[]> {
    const sessionFeedback = this.feedbackBuffer.get(sessionId) || [];
    if (sessionFeedback.length < 3) return []; // Need minimum data

    const detectedPatterns: LearningPattern[] = [];

    // Analyze different pattern types
    detectedPatterns.push(...await this.analyzeRatingPatterns(sessionFeedback));
    detectedPatterns.push(...await this.analyzeIssuePatterns(sessionFeedback));
    detectedPatterns.push(...await this.analyzeContextualPatterns(sessionFeedback));
    detectedPatterns.push(...await this.analyzeTrendPatterns(sessionFeedback));

    // Filter and rank patterns
    const significantPatterns = detectedPatterns
      .filter(pattern => pattern.confidence > 0.6)
      .sort((a, b) => b.confidence - a.confidence);

    // Emit pattern detection events
    for (const pattern of significantPatterns) {
      this.emitPatternEvent(sessionId, pattern);
    }

    return significantPatterns;
  }

  /**
   * Get feedback suggestions for function improvement
   */
  generateImprovementSuggestions(functionId: string): string[] {
    const suggestions: string[] = [];
    const allFeedback = Array.from(this.feedbackBuffer.values()).flat()
      .filter(fb => fb.functionId === functionId);

    if (allFeedback.length === 0) return suggestions;

    // Analyze common issues
    const issueFrequency = new Map<FeedbackCategory, number>();
    const lowRatings = allFeedback.filter(fb => fb.rating < 3);

    allFeedback.forEach(feedback => {
      feedback.specificIssues?.forEach(issue => {
        const count = issueFrequency.get(issue.category) || 0;
        issueFrequency.set(issue.category, count + 1);
      });
    });

    // Generate suggestions based on common issues
    issueFrequency.forEach((count, category) => {
      const percentage = (count / allFeedback.length) * 100;
      if (percentage > 30) { // If issue appears in >30% of feedback
        suggestions.push(this.getSuggestionForCategory(category, count));
      }
    });

    // Analyze rating trends
    if (lowRatings.length > allFeedback.length * 0.4) {
      suggestions.push('Overall satisfaction is low. Consider reviewing function prompts and constraints.');
    }

    // Analyze specific feedback text
    const textFeedback = allFeedback.filter(fb => fb.textFeedback);
    if (textFeedback.length > 0) {
      const commonWords = this.extractCommonWords(textFeedback.map(fb => fb.textFeedback!));
      if (commonWords.includes('too') || commonWords.includes('overly')) {
        suggestions.push('Consider reducing intensity or aggressiveness in editorial suggestions.');
      }
      if (commonWords.includes('unclear') || commonWords.includes('confusing')) {
        suggestions.push('Improve clarity of explanations and reasoning in outputs.');
      }
    }

    return suggestions;
  }

  /**
   * Get feedback statistics for analysis
   */
  getFeedbackStats(functionId: string): any {
    const feedback = Array.from(this.feedbackBuffer.values()).flat()
      .filter(fb => fb.functionId === functionId);

    if (feedback.length === 0) {
      return {
        totalFeedback: 0,
        averageRating: 0,
        ratingDistribution: {},
        commonIssues: [],
        improvementTrend: 0
      };
    }

    const ratings = feedback.map(fb => fb.rating);
    const averageRating = ratings.reduce((sum, r) => sum + r, 0) / ratings.length;

    const ratingDistribution = ratings.reduce((dist, rating) => {
      dist[rating] = (dist[rating] || 0) + 1;
      return dist;
    }, {} as Record<number, number>);

    const commonIssues = this.getCommonIssues(feedback);
    const improvementTrend = this.calculateImprovementTrend(feedback);

    return {
      totalFeedback: feedback.length,
      averageRating,
      ratingDistribution,
      commonIssues,
      improvementTrend
    };
  }

  /**
   * Clean up old feedback data
   */
  cleanup(retentionDays: number = 30): void {
    const cutoff = Date.now() - (retentionDays * 24 * 60 * 60 * 1000);
    let totalRemoved = 0;

    this.feedbackBuffer.forEach((feedbackList, sessionId) => {
      const filtered = feedbackList.filter(fb => fb.timestamp.getTime() > cutoff);
      if (filtered.length < feedbackList.length) {
        this.feedbackBuffer.set(sessionId, filtered);
        totalRemoved += feedbackList.length - filtered.length;
      }
      
      // Remove empty sessions
      if (filtered.length === 0) {
        this.feedbackBuffer.delete(sessionId);
      }
    });

    if (totalRemoved > 0) {
      console.log(`[FeedbackProcessor] Cleaned up ${totalRemoved} old feedback items`);
    }
  }

  // Private helper methods
  private initializePatternRules(): void {
    // Initialize common pattern rules for recognition
    this.patternRules.set('low-rating-sequence', {
      id: 'low-rating-sequence',
      name: 'Consecutive Low Ratings',
      description: 'Pattern of consecutive ratings below 3',
      pattern: [
        {
          field: 'rating',
          operator: 'lt',
          value: 3,
          weight: 1.0
        }
      ],
      confidence: 0,
      occurrences: 0,
      lastSeen: new Date(),
      actions: [
        {
          type: 'adapt-prompt',
          parameters: { adjustmentType: 'improve-quality' },
          confidence: 0.8,
          description: 'Adjust prompts to improve output quality'
        }
      ],
      isActive: true
    });

    this.patternRules.set('grammar-issues', {
      id: 'grammar-issues',
      name: 'Frequent Grammar Issues',
      description: 'Pattern of frequent grammar-related feedback',
      pattern: [
        {
          field: 'specificIssues.category',
          operator: 'equals',
          value: FeedbackCategory.GRAMMAR,
          weight: 1.0
        }
      ],
      confidence: 0,
      occurrences: 0,
      lastSeen: new Date(),
      actions: [
        {
          type: 'modify-constraints',
          parameters: { focusArea: 'grammar' },
          confidence: 0.9,
          description: 'Increase focus on grammar checking'
        }
      ],
      isActive: true
    });

    // Add more pattern rules...
  }

  private setupEventListeners(): void {
    globalEventBus.on('user-feedback', (event: EventData) => {
      this.processFeedback(event.payload).catch(error => {
        console.error('[FeedbackProcessor] Error handling feedback event:', error);
      });
    });
  }

  private startProcessingLoop(): void {
    this.processingTimer = setInterval(() => {
      this.processQueuedFeedback();
    }, 5000); // Process every 5 seconds
  }

  private async processQueuedFeedback(): Promise<void> {
    if (this.isProcessing || this.processingQueue.length === 0) return;

    this.isProcessing = true;
    
    try {
      const batch = this.processingQueue.splice(0, 10); // Process up to 10 at a time
      
      for (const feedback of batch) {
        await this.analyzeFeedbackPatterns(feedback);
      }
    } catch (error) {
      console.error('[FeedbackProcessor] Error processing feedback batch:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  private validateFeedback(feedback: UserFeedback): void {
    if (!feedback.id) throw new Error('Feedback ID is required');
    if (!feedback.functionId) throw new Error('Function ID is required');
    if (!feedback.sessionId) throw new Error('Session ID is required');
    if (feedback.rating < 1 || feedback.rating > 5) throw new Error('Rating must be between 1 and 5');
  }

  private isHighPriorityFeedback(feedback: UserFeedback): boolean {
    return feedback.rating <= 2 || 
           (feedback.specificIssues && feedback.specificIssues.some(issue => issue.severity === 'high'));
  }

  private async processImmediately(feedback: UserFeedback): Promise<void> {
    await this.analyzeFeedbackPatterns(feedback);
  }

  private async analyzeFeedbackPatterns(feedback: UserFeedback): Promise<void> {
    // Check feedback against all pattern rules
    this.patternRules.forEach((pattern, patternId) => {
      if (this.matchesPattern(feedback, pattern)) {
        pattern.occurrences++;
        pattern.confidence = Math.min(pattern.confidence + 0.1, 1.0);
        pattern.lastSeen = new Date();
        
        if (pattern.confidence > 0.7) {
          this.emitPatternEvent(feedback.sessionId, pattern);
        }
      }
    });
  }

  private matchesPattern(feedback: UserFeedback, pattern: LearningPattern): boolean {
    return pattern.pattern.every(rule => this.evaluateRule(feedback, rule));
  }

  private evaluateRule(feedback: UserFeedback, rule: PatternRule): boolean {
    const value = this.extractFieldValue(feedback, rule.field);
    
    switch (rule.operator) {
      case 'equals':
        return value === rule.value;
      case 'gt':
        return typeof value === 'number' && value > rule.value;
      case 'lt':
        return typeof value === 'number' && value < rule.value;
      case 'gte':
        return typeof value === 'number' && value >= rule.value;
      case 'lte':
        return typeof value === 'number' && value <= rule.value;
      case 'contains':
        return typeof value === 'string' && value.includes(rule.value);
      case 'regex':
        return typeof value === 'string' && new RegExp(rule.value).test(value);
      default:
        return false;
    }
  }

  private extractFieldValue(feedback: UserFeedback, field: string): any {
    const parts = field.split('.');
    let value: any = feedback;
    
    for (const part of parts) {
      if (value && typeof value === 'object') {
        value = (value as any)[part];
      } else {
        return undefined;
      }
    }
    
    return value;
  }

  private async analyzeRatingPatterns(feedback: UserFeedback[]): Promise<LearningPattern[]> {
    const patterns: LearningPattern[] = [];
    
    // Detect consecutive low ratings
    let consecutiveLow = 0;
    let maxConsecutiveLow = 0;
    
    feedback.forEach(fb => {
      if (fb.rating < 3) {
        consecutiveLow++;
        maxConsecutiveLow = Math.max(maxConsecutiveLow, consecutiveLow);
      } else {
        consecutiveLow = 0;
      }
    });
    
    if (maxConsecutiveLow >= 3) {
      patterns.push({
        id: `rating-decline-${Date.now()}`,
        name: 'Rating Decline Pattern',
        description: `Detected ${maxConsecutiveLow} consecutive low ratings`,
        pattern: [],
        confidence: Math.min(maxConsecutiveLow / 5, 1),
        occurrences: maxConsecutiveLow,
        lastSeen: new Date(),
        actions: [
          {
            type: 'adapt-prompt',
            parameters: { urgency: 'high', focus: 'quality' },
            confidence: 0.9,
            description: 'Urgent prompt adaptation needed due to rating decline'
          }
        ],
        isActive: true
      });
    }
    
    return patterns;
  }

  private async analyzeIssuePatterns(feedback: UserFeedback[]): Promise<LearningPattern[]> {
    const patterns: LearningPattern[] = [];
    const issueFrequency = new Map<FeedbackCategory, number>();
    
    // Count issue frequencies
    feedback.forEach(fb => {
      fb.specificIssues?.forEach(issue => {
        const count = issueFrequency.get(issue.category) || 0;
        issueFrequency.set(issue.category, count + 1);
      });
    });
    
    // Create patterns for frequent issues
    issueFrequency.forEach((count, category) => {
      const percentage = count / feedback.length;
      if (percentage > 0.4) { // >40% of feedback has this issue
        patterns.push({
          id: `issue-pattern-${category}`,
          name: `Frequent ${category} Issues`,
          description: `${category} issues appear in ${Math.round(percentage * 100)}% of feedback`,
          pattern: [],
          confidence: percentage,
          occurrences: count,
          lastSeen: new Date(),
          actions: [
            {
              type: 'modify-constraints',
              parameters: { category, focus: 'improvement' },
              confidence: percentage,
              description: `Focus on improving ${category} handling`
            }
          ],
          isActive: true
        });
      }
    });
    
    return patterns;
  }

  private async analyzeContextualPatterns(feedback: UserFeedback[]): Promise<LearningPattern[]> {
    const patterns: LearningPattern[] = [];
    
    // Group feedback by context
    const contextGroups = new Map<string, UserFeedback[]>();
    
    feedback.forEach(fb => {
      const contextKey = `${fb.context.complexity}-${fb.context.documentType || 'unknown'}`;
      if (!contextGroups.has(contextKey)) {
        contextGroups.set(contextKey, []);
      }
      contextGroups.get(contextKey)!.push(fb);
    });
    
    // Analyze each context group
    contextGroups.forEach((groupFeedback, contextKey) => {
      if (groupFeedback.length < 3) return;
      
      const averageRating = groupFeedback.reduce((sum, fb) => sum + fb.rating, 0) / groupFeedback.length;
      
      if (averageRating < 3) {
        patterns.push({
          id: `context-pattern-${contextKey}`,
          name: `Poor Performance in ${contextKey} Context`,
          description: `Low ratings (${averageRating.toFixed(1)}) for ${contextKey} content`,
          pattern: [],
          confidence: (3 - averageRating) / 3, // Higher confidence for lower ratings
          occurrences: groupFeedback.length,
          lastSeen: new Date(),
          actions: [
            {
              type: 'adapt-prompt',
              parameters: { context: contextKey, adjustmentType: 'contextual' },
              confidence: 0.8,
              description: `Adapt prompts for ${contextKey} content`
            }
          ],
          isActive: true
        });
      }
    });
    
    return patterns;
  }

  private async analyzeTrendPatterns(feedback: UserFeedback[]): Promise<LearningPattern[]> {
    const patterns: LearningPattern[] = [];
    
    if (feedback.length < 5) return patterns;
    
    // Sort by timestamp
    const sortedFeedback = feedback.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    
    // Calculate trend
    const windowSize = Math.min(5, sortedFeedback.length);
    const recent = sortedFeedback.slice(-windowSize);
    const earlier = sortedFeedback.slice(-windowSize * 2, -windowSize);
    
    if (earlier.length > 0) {
      const recentAvg = recent.reduce((sum, fb) => sum + fb.rating, 0) / recent.length;
      const earlierAvg = earlier.reduce((sum, fb) => sum + fb.rating, 0) / earlier.length;
      const trend = recentAvg - earlierAvg;
      
      if (trend < -0.5) { // Declining trend
        patterns.push({
          id: `trend-decline-${Date.now()}`,
          name: 'Declining Performance Trend',
          description: `Performance declining by ${Math.abs(trend).toFixed(1)} points`,
          pattern: [],
          confidence: Math.min(Math.abs(trend) / 2, 1),
          occurrences: recent.length,
          lastSeen: new Date(),
          actions: [
            {
              type: 'adapt-prompt',
              parameters: { urgency: 'medium', type: 'trend-correction' },
              confidence: 0.7,
              description: 'Correct declining performance trend'
            }
          ],
          isActive: true
        });
      }
    }
    
    return patterns;
  }

  private getSuggestionForCategory(category: FeedbackCategory, count: number): string {
    const suggestions = {
      [FeedbackCategory.GRAMMAR]: `Grammar issues reported ${count} times. Consider enhancing grammar checking prompts.`,
      [FeedbackCategory.STYLE]: `Style issues reported ${count} times. Review style guide adherence in prompts.`,
      [FeedbackCategory.CONTENT]: `Content issues reported ${count} times. Improve content relevance and accuracy.`,
      [FeedbackCategory.TONE]: `Tone issues reported ${count} times. Adjust tone parameters to match user preferences.`,
      [FeedbackCategory.FORMAT]: `Format issues reported ${count} times. Review output formatting requirements.`,
      [FeedbackCategory.ACCURACY]: `Accuracy issues reported ${count} times. Enhance fact-checking and verification.`,
      [FeedbackCategory.RELEVANCE]: `Relevance issues reported ${count} times. Improve context understanding and relevance.`,
      [FeedbackCategory.OTHER]: `Other issues reported ${count} times. Review miscellaneous feedback for patterns.`
    };
    
    return suggestions[category] || `Issues in ${category} category reported ${count} times.`;
  }

  private extractCommonWords(texts: string[]): string[] {
    const wordFreq = new Map<string, number>();
    
    texts.forEach(text => {
      const words = text.toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter(word => word.length > 3); // Only words longer than 3 characters
      
      words.forEach(word => {
        const count = wordFreq.get(word) || 0;
        wordFreq.set(word, count + 1);
      });
    });
    
    return Array.from(wordFreq.entries())
      .filter(([_, count]) => count > 1)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word, _]) => word);
  }

  private getCommonIssues(feedback: UserFeedback[]): Array<{ category: FeedbackCategory; count: number; percentage: number }> {
    const issueCount = new Map<FeedbackCategory, number>();
    
    feedback.forEach(fb => {
      fb.specificIssues?.forEach(issue => {
        const count = issueCount.get(issue.category) || 0;
        issueCount.set(issue.category, count + 1);
      });
    });
    
    return Array.from(issueCount.entries())
      .map(([category, count]) => ({
        category,
        count,
        percentage: (count / feedback.length) * 100
      }))
      .sort((a, b) => b.count - a.count);
  }

  private calculateImprovementTrend(feedback: UserFeedback[]): number {
    if (feedback.length < 4) return 0;
    
    const sorted = feedback.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    const mid = Math.floor(sorted.length / 2);
    
    const earlierRatings = sorted.slice(0, mid);
    const laterRatings = sorted.slice(mid);
    
    const earlierAvg = earlierRatings.reduce((sum, fb) => sum + fb.rating, 0) / earlierRatings.length;
    const laterAvg = laterRatings.reduce((sum, fb) => sum + fb.rating, 0) / laterRatings.length;
    
    return laterAvg - earlierAvg; // Positive = improving, Negative = declining
  }

  private emitPatternEvent(sessionId: string, pattern: LearningPattern): void {
    const event: LearningEvent = {
      type: LearningEventType.PATTERN_DETECTED,
      sessionId,
      functionId: '', // Pattern may span multiple functions
      data: { pattern },
      timestamp: new Date(),
      confidence: pattern.confidence
    };
    
    globalEventBus.emit('learning-event', event, 'feedback-processor');
  }

  dispose(): void {
    if (this.processingTimer) {
      clearInterval(this.processingTimer);
      this.processingTimer = undefined;
    }
  }
}

// Export singleton instance
export const feedbackProcessor = new FeedbackProcessor();