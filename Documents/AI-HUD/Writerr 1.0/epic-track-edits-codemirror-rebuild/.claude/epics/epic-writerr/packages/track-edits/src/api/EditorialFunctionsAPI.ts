/**
 * Specialized API for AI Editorial Functions integration
 * Provides optimized methods for AI-generated changes with advanced categorization
 * and confidence scoring specifically designed for editorial workflows
 */

import { Change, ChangeSource, ChangeCategory, ChangeType } from '../types';
import { trackEditsAPI, ChangeSubmissionOptions } from './PublicAPI';

export interface EditorialChange {
  original: string;
  revised: string;
  position: {
    start: number;
    end: number;
    line?: number;
    column?: number;
  };
  editorialType: EditorialChangeType;
  confidence: number;
  reasoning: string;
  category: EditorialCategory;
  severity: EditorialSeverity;
  suggestions?: string[];
}

export enum EditorialChangeType {
  GRAMMAR_FIX = 'grammar-fix',
  STYLE_IMPROVEMENT = 'style-improvement',
  CLARITY_ENHANCEMENT = 'clarity-enhancement',
  TONE_ADJUSTMENT = 'tone-adjustment',
  STRUCTURE_REORGANIZATION = 'structure-reorganization',
  FACT_CHECK = 'fact-check',
  CONSISTENCY_FIX = 'consistency-fix',
  BREVITY_IMPROVEMENT = 'brevity-improvement',
  ENGAGEMENT_ENHANCEMENT = 'engagement-enhancement',
  SEO_OPTIMIZATION = 'seo-optimization'
}

export enum EditorialCategory {
  CRITICAL = 'critical',        // Grammar errors, factual issues
  IMPORTANT = 'important',      // Style issues, clarity problems
  SUGGESTED = 'suggested',      // Improvements, enhancements
  OPTIONAL = 'optional'         // Minor optimizations
}

export enum EditorialSeverity {
  BLOCKING = 'blocking',        // Must be fixed before publishing
  HIGH = 'high',               // Should be addressed
  MEDIUM = 'medium',           // Nice to have
  LOW = 'low'                  // Optional improvement
}

export interface EditorialContext {
  documentType: 'article' | 'blog-post' | 'academic' | 'marketing' | 'technical' | 'creative' | 'general';
  targetAudience: 'general' | 'technical' | 'academic' | 'business' | 'casual' | 'professional';
  writingStyle: 'formal' | 'informal' | 'academic' | 'conversational' | 'persuasive' | 'descriptive';
  tonePreference: 'neutral' | 'friendly' | 'authoritative' | 'enthusiastic' | 'professional' | 'casual';
  lengthPreference: 'concise' | 'detailed' | 'balanced';
}

export interface EditorialBatch {
  changes: EditorialChange[];
  context: EditorialContext;
  priority: 'urgent' | 'high' | 'normal' | 'low';
  processingOptions: {
    autoAcceptBelow?: EditorialSeverity;
    requireApprovalAbove?: EditorialSeverity;
    enableClustering?: boolean;
    groupByCategory?: boolean;
  };
}

export interface EditorialMetrics {
  totalSuggestions: number;
  acceptanceRate: number;
  averageConfidence: number;
  categoryBreakdown: Record<EditorialCategory, number>;
  severityBreakdown: Record<EditorialSeverity, number>;
  typeBreakdown: Record<EditorialChangeType, number>;
  processingTime: number;
}

/**
 * Specialized API class for AI Editorial Functions
 */
export class EditorialFunctionsAPI {
  private static instance: EditorialFunctionsAPI;
  private metrics: EditorialMetrics = {
    totalSuggestions: 0,
    acceptanceRate: 0,
    averageConfidence: 0,
    categoryBreakdown: {} as Record<EditorialCategory, number>,
    severityBreakdown: {} as Record<EditorialSeverity, number>,
    typeBreakdown: {} as Record<EditorialChangeType, number>,
    processingTime: 0,
  };

  private constructor() {
    this.initializeMetrics();
  }

  public static getInstance(): EditorialFunctionsAPI {
    if (!EditorialFunctionsAPI.instance) {
      EditorialFunctionsAPI.instance = new EditorialFunctionsAPI();
    }
    return EditorialFunctionsAPI.instance;
  }

  /**
   * Submit a single editorial change
   */
  async submitEditorialChange(
    editorialChange: EditorialChange, 
    context?: EditorialContext
  ): Promise<string> {
    const startTime = performance.now();

    // Convert editorial change to Track Edits format
    const change = this.convertToTrackEditsChange(editorialChange, context);

    // Determine submission options based on editorial properties
    const options: ChangeSubmissionOptions = {
      priority: this.determinePriority(editorialChange.severity),
      source: this.mapToChangeSource(editorialChange.editorialType),
      category: this.mapToChangeCategory(editorialChange.category),
      confidence: editorialChange.confidence,
      metadata: {
        reason: editorialChange.reasoning,
        suggestion: editorialChange.suggestions?.join('; '),
        context: context ? JSON.stringify(context) : undefined,
        source_plugin: 'ai-editorial-functions',
        editorial_type: editorialChange.editorialType,
        editorial_category: editorialChange.category,
        editorial_severity: editorialChange.severity,
      },
      conflictResolution: 'auto', // Editorial changes should auto-resolve conflicts
    };

    try {
      const changeId = await trackEditsAPI.submitChange(change, options);
      
      // Update metrics
      this.updateMetrics(editorialChange, performance.now() - startTime);
      
      return changeId;
    } catch (error) {
      console.error('Error submitting editorial change:', error);
      throw new Error(`Failed to submit editorial change: ${error}`);
    }
  }

  /**
   * Submit a batch of editorial changes
   */
  async submitEditorialBatch(batch: EditorialBatch): Promise<string[]> {
    const startTime = performance.now();
    const changeIds: string[] = [];

    try {
      // Convert all editorial changes to Track Edits format
      const changes = batch.changes.map(editorialChange => 
        this.convertToTrackEditsChange(editorialChange, batch.context)
      );

      // Determine batch processing options
      const batchOptions = {
        priority: batch.priority,
        source: ChangeSource.AI_CONTENT,
        enableClustering: batch.processingOptions.enableClustering ?? true,
        clusteringStrategy: batch.processingOptions.groupByCategory ? 'category' : 'auto',
        processingMode: batch.priority === 'urgent' ? 'immediate' : 'background',
        metadata: {
          source_plugin: 'ai-editorial-functions',
          document_type: batch.context.documentType,
          target_audience: batch.context.targetAudience,
          writing_style: batch.context.writingStyle,
          batch_size: batch.changes.length,
        },
      };

      // Submit batch with auto-acceptance rules
      const submittedIds = await trackEditsAPI.submitChangesBatch(changes, batchOptions);
      changeIds.push(...submittedIds);

      // Apply auto-acceptance rules
      if (batch.processingOptions.autoAcceptBelow) {
        await this.applyAutoAcceptanceRules(
          changeIds, 
          batch.changes, 
          batch.processingOptions.autoAcceptBelow
        );
      }

      // Update batch metrics
      batch.changes.forEach(change => 
        this.updateMetrics(change, (performance.now() - startTime) / batch.changes.length)
      );

      return changeIds;

    } catch (error) {
      console.error('Error submitting editorial batch:', error);
      throw new Error(`Failed to submit editorial batch: ${error}`);
    }
  }

  /**
   * Get editorial-specific metrics
   */
  getEditorialMetrics(): EditorialMetrics {
    return { ...this.metrics };
  }

  /**
   * Configure auto-acceptance rules for editorial changes
   */
  async configureAutoAcceptance(rules: {
    autoAcceptBelow?: EditorialSeverity;
    autoRejectAbove?: number; // confidence threshold
    categoryRules?: Partial<Record<EditorialCategory, 'accept' | 'reject' | 'review'>>;
  }): Promise<void> {
    // Implementation would integrate with the system's bulk operation capabilities
    console.log('Configuring auto-acceptance rules:', rules);
  }

  /**
   * Get suggestions for improving editorial workflow efficiency
   */
  async getWorkflowSuggestions(): Promise<{
    efficiency: number;
    suggestions: Array<{
      type: 'acceptance-pattern' | 'clustering-strategy' | 'priority-adjustment';
      description: string;
      impact: 'high' | 'medium' | 'low';
    }>;
  }> {
    const efficiency = this.calculateWorkflowEfficiency();
    const suggestions = this.generateWorkflowSuggestions();

    return { efficiency, suggestions };
  }

  /**
   * Reset editorial metrics (useful for testing or new sessions)
   */
  resetMetrics(): void {
    this.initializeMetrics();
  }

  // Private helper methods

  private convertToTrackEditsChange(
    editorialChange: EditorialChange, 
    context?: EditorialContext
  ): Omit<Change, 'id' | 'timestamp'> {
    // Determine change type based on content comparison
    let changeType: ChangeType;
    if (!editorialChange.original) {
      changeType = ChangeType.INSERT;
    } else if (!editorialChange.revised) {
      changeType = ChangeType.DELETE;
    } else {
      changeType = ChangeType.REPLACE;
    }

    return {
      type: changeType,
      source: this.mapToChangeSource(editorialChange.editorialType),
      confidence: editorialChange.confidence,
      content: {
        before: editorialChange.original,
        after: editorialChange.revised,
      },
      position: editorialChange.position,
      category: this.mapToChangeCategory(editorialChange.category),
      status: this.determineInitialStatus(editorialChange.severity),
      metadata: {
        reason: editorialChange.reasoning,
        suggestion: editorialChange.suggestions?.join('; '),
        context: context ? JSON.stringify(context) : undefined,
        editorial_type: editorialChange.editorialType,
        editorial_category: editorialChange.category,
        editorial_severity: editorialChange.severity,
      },
    };
  }

  private mapToChangeSource(editorialType: EditorialChangeType): ChangeSource {
    switch (editorialType) {
      case EditorialChangeType.GRAMMAR_FIX:
        return ChangeSource.AI_GRAMMAR;
      case EditorialChangeType.STYLE_IMPROVEMENT:
      case EditorialChangeType.TONE_ADJUSTMENT:
      case EditorialChangeType.BREVITY_IMPROVEMENT:
        return ChangeSource.AI_STYLE;
      default:
        return ChangeSource.AI_CONTENT;
    }
  }

  private mapToChangeCategory(editorialCategory: EditorialCategory): ChangeCategory {
    switch (editorialCategory) {
      case EditorialCategory.CRITICAL:
        return ChangeCategory.GRAMMAR;
      case EditorialCategory.IMPORTANT:
        return ChangeCategory.STYLE;
      case EditorialCategory.SUGGESTED:
        return ChangeCategory.CONTENT;
      case EditorialCategory.OPTIONAL:
        return ChangeCategory.FORMATTING;
      default:
        return ChangeCategory.CONTENT;
    }
  }

  private determinePriority(severity: EditorialSeverity): 'low' | 'normal' | 'high' | 'urgent' {
    switch (severity) {
      case EditorialSeverity.BLOCKING:
        return 'urgent';
      case EditorialSeverity.HIGH:
        return 'high';
      case EditorialSeverity.MEDIUM:
        return 'normal';
      case EditorialSeverity.LOW:
        return 'low';
      default:
        return 'normal';
    }
  }

  private determineInitialStatus(severity: EditorialSeverity) {
    // Blocking changes start as conflicted to force review
    return severity === EditorialSeverity.BLOCKING ? 'conflicted' : 'pending';
  }

  private async applyAutoAcceptanceRules(
    changeIds: string[], 
    editorialChanges: EditorialChange[], 
    autoAcceptBelow: EditorialSeverity
  ): Promise<void> {
    const severityOrder = [
      EditorialSeverity.LOW,
      EditorialSeverity.MEDIUM,
      EditorialSeverity.HIGH,
      EditorialSeverity.BLOCKING,
    ];
    
    const autoAcceptThreshold = severityOrder.indexOf(autoAcceptBelow);
    
    for (let i = 0; i < changeIds.length; i++) {
      const change = editorialChanges[i];
      const changeSeverityIndex = severityOrder.indexOf(change.severity);
      
      if (changeSeverityIndex <= autoAcceptThreshold) {
        await trackEditsAPI.acceptChange(changeIds[i]);
      }
    }
  }

  private updateMetrics(editorialChange: EditorialChange, processingTime: number): void {
    this.metrics.totalSuggestions++;
    
    // Update category breakdown
    this.metrics.categoryBreakdown[editorialChange.category] = 
      (this.metrics.categoryBreakdown[editorialChange.category] || 0) + 1;
    
    // Update severity breakdown
    this.metrics.severityBreakdown[editorialChange.severity] = 
      (this.metrics.severityBreakdown[editorialChange.severity] || 0) + 1;
    
    // Update type breakdown
    this.metrics.typeBreakdown[editorialChange.editorialType] = 
      (this.metrics.typeBreakdown[editorialChange.editorialType] || 0) + 1;
    
    // Update average confidence
    this.metrics.averageConfidence = 
      (this.metrics.averageConfidence * (this.metrics.totalSuggestions - 1) + editorialChange.confidence) / 
      this.metrics.totalSuggestions;
    
    // Update processing time
    this.metrics.processingTime = 
      (this.metrics.processingTime + processingTime) / 2;
  }

  private calculateWorkflowEfficiency(): number {
    if (this.metrics.totalSuggestions === 0) return 0;
    
    // Efficiency based on acceptance rate, processing time, and confidence
    const acceptanceWeight = this.metrics.acceptanceRate * 0.4;
    const confidenceWeight = this.metrics.averageConfidence * 0.3;
    const speedWeight = Math.max(0, (1000 - this.metrics.processingTime) / 1000) * 0.3;
    
    return Math.min(1, acceptanceWeight + confidenceWeight + speedWeight);
  }

  private generateWorkflowSuggestions() {
    const suggestions = [];
    
    if (this.metrics.acceptanceRate < 0.7) {
      suggestions.push({
        type: 'acceptance-pattern' as const,
        description: 'Consider adjusting confidence thresholds or improving AI model training',
        impact: 'high' as const,
      });
    }
    
    if (this.metrics.processingTime > 500) {
      suggestions.push({
        type: 'clustering-strategy' as const,
        description: 'Enable batch processing and clustering for better performance',
        impact: 'medium' as const,
      });
    }
    
    return suggestions;
  }

  private initializeMetrics(): void {
    this.metrics = {
      totalSuggestions: 0,
      acceptanceRate: 0,
      averageConfidence: 0,
      categoryBreakdown: {},
      severityBreakdown: {},
      typeBreakdown: {},
      processingTime: 0,
    };
  }
}

// Export singleton instance
export const editorialAPI = EditorialFunctionsAPI.getInstance();

// Export for window global access
declare global {
  interface Window {
    EditorialFunctionsAPI: EditorialFunctionsAPI;
  }
}

// Initialize global access
if (typeof window !== 'undefined') {
  window.EditorialFunctionsAPI = editorialAPI;
}