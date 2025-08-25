/**
 * Response Router for Writerr Chat Plugin
 * 
 * This module manages the routing of AI responses, determining whether
 * they should be applied as edits through Track Edits or displayed as
 * conversational responses.
 */

import { 
  ChatMessage, 
  ChatMode, 
  DocumentContext, 
  EditSuggestion,
  ChatModeCapability 
} from '../interface/types';
import { AIResponse } from '../providers/AIProvidersIntegration';
import { TrackEditsIntegration } from './TrackEditsIntegration';
import { globalEventBus } from '@writerr/shared';

export interface RouterDecision {
  action: 'apply-edits' | 'show-message' | 'hybrid' | 'preview-only';
  editSuggestions?: EditSuggestion[];
  displayMessage: string;
  confidence: number;
  reasoning: string;
}

export interface RoutingConfig {
  autoApplyThreshold: number; // Confidence threshold for auto-applying edits
  previewByDefault: boolean;
  requireConfirmation: boolean;
  maxAutoEdits: number; // Maximum number of edits to auto-apply
  editModes: string[]; // Modes that should route to Track Edits
  conversationModes: string[]; // Modes that should remain conversational
}

export class ResponseRouter {
  private config: RoutingConfig;
  private trackEditsIntegration: TrackEditsIntegration;
  private processingQueue: Map<string, Promise<void>> = new Map();

  constructor(
    trackEditsIntegration: TrackEditsIntegration,
    config: Partial<RoutingConfig> = {}
  ) {
    this.trackEditsIntegration = trackEditsIntegration;
    this.config = {
      autoApplyThreshold: 0.8,
      previewByDefault: true,
      requireConfirmation: true,
      maxAutoEdits: 5,
      editModes: ['copy-edit', 'proofread', 'writing-assistant'],
      conversationModes: ['chat', 'brainstorm', 'feedback'],
      ...config
    };
  }

  /**
   * Route an AI response to the appropriate handler
   */
  async routeResponse(
    response: AIResponse,
    mode: ChatMode,
    documentContext?: DocumentContext,
    messages: ChatMessage[] = []
  ): Promise<RouterDecision> {
    const routingId = `routing-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    globalEventBus.emit('response-routing-start', {
      routingId,
      responseId: response.id,
      mode: mode.id,
      hasEditSuggestions: !!response.metadata.editSuggestions?.length
    });

    try {
      // Prevent concurrent routing of the same response
      if (this.processingQueue.has(response.id)) {
        await this.processingQueue.get(response.id);
      }

      const routingPromise = this.processRouting(response, mode, documentContext, messages);
      this.processingQueue.set(response.id, routingPromise);

      const decision = await routingPromise;
      
      globalEventBus.emit('response-routing-complete', {
        routingId,
        responseId: response.id,
        decision,
        processingTime: Date.now() - parseInt(routingId.split('-')[1])
      });

      this.processingQueue.delete(response.id);
      return decision;
      
    } catch (error) {
      this.processingQueue.delete(response.id);
      
      globalEventBus.emit('response-routing-error', {
        routingId,
        responseId: response.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw error;
    }
  }

  /**
   * Process the routing logic for a response
   */
  private async processRouting(
    response: AIResponse,
    mode: ChatMode,
    documentContext?: DocumentContext,
    messages: ChatMessage[] = []
  ): Promise<RouterDecision> {
    // Analyze the response and mode to determine routing
    const analysis = this.analyzeResponse(response, mode, documentContext);
    
    // Check if mode supports edits
    if (!this.modeSupportsEdits(mode)) {
      return {
        action: 'show-message',
        displayMessage: response.content,
        confidence: 1.0,
        reasoning: 'Mode does not support document edits'
      };
    }

    // Check if we have edit suggestions
    const editSuggestions = response.metadata.editSuggestions || 
                           this.extractEditSuggestions(response.content, documentContext);

    if (!editSuggestions || editSuggestions.length === 0) {
      return {
        action: 'show-message',
        displayMessage: response.content,
        confidence: 1.0,
        reasoning: 'No edit suggestions found in response'
      };
    }

    // Determine routing based on analysis
    const decision = this.makeRoutingDecision(
      response,
      mode,
      editSuggestions,
      analysis,
      documentContext
    );

    // Execute the routing decision
    await this.executeRoutingDecision(decision, documentContext);

    return decision;
  }

  /**
   * Analyze the AI response to understand its intent
   */
  private analyzeResponse(
    response: AIResponse,
    mode: ChatMode,
    documentContext?: DocumentContext
  ): {
    isEdit: boolean;
    confidence: number;
    editCount: number;
    hasExplanation: boolean;
    hasQuestions: boolean;
    conversationalContent: string;
  } {
    const content = response.content.toLowerCase();
    const editSuggestions = response.metadata.editSuggestions || [];

    // Check for edit indicators
    const editIndicators = [
      'here\'s the revised',
      'i\'ve corrected',
      'suggested changes',
      'edit:',
      'replace:',
      'change to:',
      'should be:',
      'corrected version'
    ];

    const hasEditIndicators = editIndicators.some(indicator => 
      content.includes(indicator)
    );

    // Check for conversational elements
    const conversationalIndicators = [
      'what do you think',
      'would you like',
      'let me know',
      'any questions',
      'does this help',
      'would you prefer'
    ];

    const hasQuestions = conversationalIndicators.some(indicator =>
      content.includes(indicator)
    ) || content.includes('?');

    // Calculate confidence based on multiple factors
    let confidence = 0.5;
    
    if (editSuggestions.length > 0) confidence += 0.3;
    if (hasEditIndicators) confidence += 0.2;
    if (this.config.editModes.includes(mode.id)) confidence += 0.2;
    if (documentContext?.selection?.text) confidence += 0.1;
    
    // Reduce confidence for conversational elements
    if (hasQuestions) confidence -= 0.15;
    if (content.length > editSuggestions.length * 100) confidence -= 0.1;

    confidence = Math.max(0, Math.min(1, confidence));

    return {
      isEdit: hasEditIndicators || editSuggestions.length > 0,
      confidence,
      editCount: editSuggestions.length,
      hasExplanation: content.includes('because') || content.includes('reason'),
      hasQuestions,
      conversationalContent: this.extractConversationalContent(response.content)
    };
  }

  /**
   * Make the routing decision based on analysis
   */
  private makeRoutingDecision(
    response: AIResponse,
    mode: ChatMode,
    editSuggestions: EditSuggestion[],
    analysis: any,
    documentContext?: DocumentContext
  ): RouterDecision {
    const { confidence, hasQuestions, conversationalContent } = analysis;

    // Too many edits - require confirmation
    if (editSuggestions.length > this.config.maxAutoEdits) {
      return {
        action: 'preview-only',
        editSuggestions,
        displayMessage: this.buildHybridMessage(response.content, editSuggestions, 'Too many edits to auto-apply'),
        confidence,
        reasoning: `${editSuggestions.length} edits exceed maximum of ${this.config.maxAutoEdits}`
      };
    }

    // High confidence and auto-apply threshold met
    if (confidence >= this.config.autoApplyThreshold && 
        !this.config.requireConfirmation &&
        !hasQuestions) {
      return {
        action: 'apply-edits',
        editSuggestions,
        displayMessage: this.buildEditConfirmationMessage(editSuggestions, true),
        confidence,
        reasoning: 'High confidence and auto-apply enabled'
      };
    }

    // Mixed content - show both message and edits
    if (conversationalContent.trim().length > 50 && editSuggestions.length > 0) {
      return {
        action: 'hybrid',
        editSuggestions,
        displayMessage: this.buildHybridMessage(response.content, editSuggestions),
        confidence,
        reasoning: 'Response contains both conversational content and edits'
      };
    }

    // Default to preview for edit suggestions
    if (editSuggestions.length > 0) {
      return {
        action: this.config.previewByDefault ? 'preview-only' : 'hybrid',
        editSuggestions,
        displayMessage: this.buildHybridMessage(response.content, editSuggestions),
        confidence,
        reasoning: 'Edit suggestions found, using preview mode'
      };
    }

    // Fallback to conversational
    return {
      action: 'show-message',
      displayMessage: response.content,
      confidence,
      reasoning: 'No clear edit intent detected'
    };
  }

  /**
   * Execute the routing decision
   */
  private async executeRoutingDecision(
    decision: RouterDecision,
    documentContext?: DocumentContext
  ): Promise<void> {
    switch (decision.action) {
      case 'apply-edits':
        if (decision.editSuggestions && this.trackEditsIntegration) {
          await this.trackEditsIntegration.batchApplyEdits(
            decision.editSuggestions,
            documentContext
          );
        }
        break;

      case 'preview-only':
        if (decision.editSuggestions && this.trackEditsIntegration) {
          for (const suggestion of decision.editSuggestions) {
            await this.trackEditsIntegration.previewEdit(suggestion);
          }
        }
        break;

      case 'hybrid':
        if (decision.editSuggestions && this.trackEditsIntegration) {
          // Preview edits but don't auto-apply
          for (const suggestion of decision.editSuggestions) {
            await this.trackEditsIntegration.previewEdit(suggestion);
          }
        }
        break;

      case 'show-message':
        // No special action needed - message will be displayed
        break;

      default:
        console.warn('Unknown routing action:', decision.action);
    }

    globalEventBus.emit('routing-decision-executed', {
      action: decision.action,
      editCount: decision.editSuggestions?.length || 0,
      confidence: decision.confidence
    });
  }

  /**
   * Check if mode supports document edits
   */
  private modeSupportsEdits(mode: ChatMode): boolean {
    if (!mode.trackEditsIntegration) return false;
    
    if (!mode.capabilities) return false;

    return mode.capabilities.some((cap: ChatModeCapability) => 
      cap.type === 'document-edit' && cap.enabled
    );
  }

  /**
   * Extract edit suggestions from response content
   */
  private extractEditSuggestions(
    content: string,
    documentContext?: DocumentContext
  ): EditSuggestion[] {
    if (!documentContext?.selection) return [];

    const suggestions: EditSuggestion[] = [];
    
    // Look for structured edit blocks
    const editBlockRegex = /```(?:edit|replace|change)\s*\n([\s\S]*?)\n```/gi;
    let match;

    while ((match = editBlockRegex.exec(content)) !== null) {
      suggestions.push({
        id: `extracted-${Date.now()}-${suggestions.length}`,
        type: 'replace',
        range: documentContext.selection,
        newText: match[1].trim(),
        reason: 'Extracted from AI response',
        confidence: 0.7
      });
    }

    // Look for inline suggestions
    const inlineEditRegex = /(?:change|replace|should be):\s*"([^"]+)"/gi;
    
    while ((match = inlineEditRegex.exec(content)) !== null) {
      suggestions.push({
        id: `inline-${Date.now()}-${suggestions.length}`,
        type: 'replace',
        range: documentContext.selection,
        newText: match[1],
        reason: 'Inline suggestion from AI response',
        confidence: 0.6
      });
    }

    return suggestions;
  }

  /**
   * Extract conversational content from response
   */
  private extractConversationalContent(content: string): string {
    // Remove code blocks and structured edits
    let conversational = content
      .replace(/```[\s\S]*?```/g, '')
      .replace(/^\s*[\*\-\+]\s+.+$/gm, '') // Remove bullet points
      .trim();

    return conversational;
  }

  /**
   * Build hybrid message showing both conversation and edit summary
   */
  private buildHybridMessage(
    originalContent: string, 
    editSuggestions: EditSuggestion[],
    note?: string
  ): string {
    const conversationalPart = this.extractConversationalContent(originalContent);
    
    let message = conversationalPart;
    
    if (note) {
      message += `\n\n*${note}*`;
    }
    
    if (editSuggestions.length > 0) {
      message += `\n\n**${editSuggestions.length} edit suggestion${editSuggestions.length === 1 ? '' : 's'} available:**\n`;
      
      editSuggestions.slice(0, 3).forEach((suggestion, index) => {
        const preview = suggestion.newText.length > 50 
          ? suggestion.newText.substring(0, 50) + '...'
          : suggestion.newText;
        message += `${index + 1}. ${suggestion.reason}: "${preview}"\n`;
      });

      if (editSuggestions.length > 3) {
        message += `... and ${editSuggestions.length - 3} more`;
      }
    }

    return message;
  }

  /**
   * Build confirmation message for edit application
   */
  private buildEditConfirmationMessage(editSuggestions: EditSuggestion[], applied: boolean): string {
    const action = applied ? 'Applied' : 'Ready to apply';
    const count = editSuggestions.length;
    
    return `${action} ${count} edit suggestion${count === 1 ? '' : 's'} to your document.`;
  }

  /**
   * Update routing configuration
   */
  updateConfig(newConfig: Partial<RoutingConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    globalEventBus.emit('response-router-config-updated', {
      config: this.config,
      source: 'writerr-chat'
    });
  }

  /**
   * Get current routing configuration
   */
  getConfig(): RoutingConfig {
    return { ...this.config };
  }

  /**
   * Get routing statistics
   */
  getStatistics(): {
    totalRouted: number;
    editApplications: number;
    conversationalResponses: number;
    hybridResponses: number;
    averageConfidence: number;
  } {
    // This would be implemented with persistent statistics tracking
    return {
      totalRouted: 0,
      editApplications: 0,
      conversationalResponses: 0,
      hybridResponses: 0,
      averageConfidence: 0
    };
  }
}