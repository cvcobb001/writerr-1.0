/**
 * @fileoverview Core mode validation and context preservation for built-in modes
 */

import { 
  ModeConfig, 
  ParsedModeFile, 
  SessionContext, 
  DocumentContext, 
  ValidationResult,
  ParseError 
} from '../modes/types';

export interface ModeTransitionContext {
  /** Previous mode ID */
  fromMode: string;
  /** New mode ID */
  toMode: string;
  /** Session messages to preserve */
  messages: any[];
  /** Document context to carry forward */
  documentContext?: DocumentContext;
  /** User's current selection */
  currentSelection?: string;
  /** Transition timestamp */
  timestamp: number;
}

export interface ModeValidationOptions {
  /** Validate prompt engineering */
  validatePrompts: boolean;
  /** Check Track Edits integration */
  validateTrackEdits: boolean;
  /** Verify context injection settings */
  validateContext: boolean;
  /** Check mode-specific requirements */
  validateModeSpecific: boolean;
}

export class CoreModeValidator {
  private static readonly CORE_MODES = new Set(['chat', 'copy-edit', 'proofread', 'writing-assistant']);
  private static readonly EDITING_MODES = new Set(['copy-edit', 'proofread', 'writing-assistant']);
  private static readonly NON_EDITING_MODES = new Set(['chat']);

  /**
   * Validate a core mode configuration
   */
  async validateCoreMode(
    mode: ParsedModeFile, 
    options: ModeValidationOptions = {
      validatePrompts: true,
      validateTrackEdits: true,
      validateContext: true,
      validateModeSpecific: true
    }
  ): Promise<ValidationResult> {
    const errors: ParseError[] = [];
    const warnings: ParseError[] = [];

    // Verify this is a core mode
    if (!CoreModeValidator.CORE_MODES.has(mode.config.id)) {
      errors.push({
        type: 'validation',
        message: `Mode '${mode.config.id}' is not a recognized core mode`,
        severity: 'error',
        suggestion: 'Core modes must be: chat, copy-edit, proofread, or writing-assistant'
      });
      return { isValid: false, errors, warnings };
    }

    // Validate mode-specific requirements
    if (options.validateModeSpecific) {
      const modeErrors = await this.validateModeSpecificRequirements(mode);
      errors.push(...modeErrors);
    }

    // Validate prompt engineering
    if (options.validatePrompts) {
      const promptErrors = this.validatePromptEngineering(mode);
      errors.push(...promptErrors);
    }

    // Validate Track Edits integration
    if (options.validateTrackEdits) {
      const trackEditsErrors = this.validateTrackEditsIntegration(mode);
      errors.push(...trackEditsErrors);
    }

    // Validate context injection
    if (options.validateContext) {
      const contextErrors = this.validateContextInjection(mode);
      errors.push(...contextErrors);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate mode-specific requirements for each core mode
   */
  private async validateModeSpecificRequirements(mode: ParsedModeFile): Promise<ParseError[]> {
    const errors: ParseError[] = [];
    const config = mode.config;

    switch (config.id) {
      case 'chat':
        // Chat mode should not make edits
        if (config.makesEdits) {
          errors.push({
            type: 'validation',
            message: 'Chat mode must have makesEdits: false',
            severity: 'error',
            suggestion: 'Set makesEdits: false for pure conversation mode'
          });
        }

        // Chat mode should not have Track Edits enabled
        if (config.trackEdits?.enabled) {
          errors.push({
            type: 'validation',
            message: 'Chat mode should not have Track Edits enabled',
            severity: 'error',
            suggestion: 'Remove trackEdits configuration or set enabled: false'
          });
        }

        // Chat should have conversational temperature
        if (config.modelPreferences?.temperature && config.modelPreferences.temperature < 0.5) {
          errors.push({
            type: 'validation',
            message: 'Chat mode should use higher temperature for natural conversation',
            severity: 'warning',
            suggestion: 'Consider temperature between 0.6-0.8 for conversational responses'
          });
        }
        break;

      case 'copy-edit':
        // Copy Edit must make edits
        if (!config.makesEdits) {
          errors.push({
            type: 'validation',
            message: 'Copy Edit mode must have makesEdits: true',
            severity: 'error',
            suggestion: 'Set makesEdits: true for editing functionality'
          });
        }

        // Must have Track Edits for style editing
        if (!config.trackEdits?.enabled) {
          errors.push({
            type: 'validation',
            message: 'Copy Edit mode requires Track Edits integration',
            severity: 'error',
            suggestion: 'Add trackEdits configuration with enabled: true'
          });
        }

        // Should use style edit type
        if (config.trackEdits?.editType !== 'style') {
          errors.push({
            type: 'validation',
            message: 'Copy Edit mode should use editType: "style"',
            severity: 'warning',
            suggestion: 'Set trackEdits.editType: "style" for proper categorization'
          });
        }

        // Should have moderate temperature for balance
        if (config.modelPreferences?.temperature && 
            (config.modelPreferences.temperature < 0.2 || config.modelPreferences.temperature > 0.5)) {
          errors.push({
            type: 'validation',
            message: 'Copy Edit mode should use moderate temperature for balanced editing',
            severity: 'warning',
            suggestion: 'Consider temperature between 0.2-0.4 for consistent style improvements'
          });
        }
        break;

      case 'proofread':
        // Proofread must make edits
        if (!config.makesEdits) {
          errors.push({
            type: 'validation',
            message: 'Proofread mode must have makesEdits: true',
            severity: 'error',
            suggestion: 'Set makesEdits: true for grammar/spelling corrections'
          });
        }

        // Must use grammar edit type
        if (config.trackEdits?.editType !== 'grammar') {
          errors.push({
            type: 'validation',
            message: 'Proofread mode should use editType: "grammar"',
            severity: 'error',
            suggestion: 'Set trackEdits.editType: "grammar" for proper error categorization'
          });
        }

        // Should use category clustering for error types
        if (config.trackEdits?.clusteringStrategy !== 'category') {
          errors.push({
            type: 'validation',
            message: 'Proofread mode should use category clustering for error types',
            severity: 'warning',
            suggestion: 'Set trackEdits.clusteringStrategy: "category" to group similar errors'
          });
        }

        // Should have low temperature for precision
        if (config.modelPreferences?.temperature && config.modelPreferences.temperature > 0.2) {
          errors.push({
            type: 'validation',
            message: 'Proofread mode should use low temperature for precise corrections',
            severity: 'warning',
            suggestion: 'Consider temperature 0.0-0.2 for consistent grammar/spelling fixes'
          });
        }
        break;

      case 'writing-assistant':
        // Writing Assistant must make edits
        if (!config.makesEdits) {
          errors.push({
            type: 'validation',
            message: 'Writing Assistant mode must have makesEdits: true',
            severity: 'error',
            suggestion: 'Set makesEdits: true for content creation functionality'
          });
        }

        // Should use creative edit type
        if (config.trackEdits?.editType !== 'creative') {
          errors.push({
            type: 'validation',
            message: 'Writing Assistant should use editType: "creative"',
            severity: 'warning',
            suggestion: 'Set trackEdits.editType: "creative" for content generation tracking'
          });
        }

        // Should have higher temperature for creativity
        if (config.modelPreferences?.temperature && config.modelPreferences.temperature < 0.6) {
          errors.push({
            type: 'validation',
            message: 'Writing Assistant should use higher temperature for creative content',
            severity: 'warning',
            suggestion: 'Consider temperature 0.7-0.9 for more creative and varied responses'
          });
        }

        // Should include vault context for comprehensive assistance
        if (!config.promptConfig.contextInjection.includeVaultContext) {
          errors.push({
            type: 'validation',
            message: 'Writing Assistant should include vault context for comprehensive writing help',
            severity: 'warning',
            suggestion: 'Set contextInjection.includeVaultContext: true for better project awareness'
          });
        }
        break;
    }

    return errors;
  }

  /**
   * Validate prompt engineering for core modes
   */
  private validatePromptEngineering(mode: ParsedModeFile): ParseError[] {
    const errors: ParseError[] = [];
    const config = mode.config;

    // Validate system prompt content
    if (config.promptConfig.systemPrompt) {
      const systemPrompt = config.promptConfig.systemPrompt;
      
      // Check for mode-appropriate language
      switch (config.id) {
        case 'chat':
          if (!systemPrompt.includes('conversation') && !systemPrompt.includes('discuss')) {
            errors.push({
              type: 'validation',
              message: 'Chat mode system prompt should emphasize conversational interaction',
              severity: 'warning',
              suggestion: 'Include words like "conversation," "discuss," or "dialogue" in system prompt'
            });
          }
          break;

        case 'copy-edit':
          if (!systemPrompt.includes('edit') && !systemPrompt.includes('improve') && !systemPrompt.includes('style')) {
            errors.push({
              type: 'validation',
              message: 'Copy Edit mode should emphasize editing and improvement in system prompt',
              severity: 'warning',
              suggestion: 'Include editing-focused language in system prompt'
            });
          }
          break;

        case 'proofread':
          if (!systemPrompt.includes('grammar') && !systemPrompt.includes('proofread') && !systemPrompt.includes('correct')) {
            errors.push({
              type: 'validation',
              message: 'Proofread mode should emphasize error correction in system prompt',
              severity: 'warning',
              suggestion: 'Include grammar/correction-focused language in system prompt'
            });
          }
          break;

        case 'writing-assistant':
          if (!systemPrompt.includes('creative') && !systemPrompt.includes('develop') && !systemPrompt.includes('write')) {
            errors.push({
              type: 'validation',
              message: 'Writing Assistant should emphasize content creation in system prompt',
              severity: 'warning',
              suggestion: 'Include creative writing and development language in system prompt'
            });
          }
          break;
      }

      // Check prompt length
      if (systemPrompt.length < 50) {
        errors.push({
          type: 'validation',
          message: 'System prompt seems too short for effective mode guidance',
          severity: 'warning',
          suggestion: 'Consider expanding system prompt to provide clearer mode instructions'
        });
      }
    }

    // Validate user prompt template
    if (config.promptConfig.userPromptTemplate) {
      const userTemplate = config.promptConfig.userPromptTemplate;
      
      // Should include userInput variable
      if (!userTemplate.includes('{{userInput}}')) {
        errors.push({
          type: 'validation',
          message: 'User prompt template should include {{userInput}} variable',
          severity: 'error',
          suggestion: 'Add {{userInput}} to capture user messages'
        });
      }

      // Editing modes should include document or selection
      if (CoreModeValidator.EDITING_MODES.has(config.id)) {
        if (!userTemplate.includes('{{document}}') && !userTemplate.includes('{{selection}}')) {
          errors.push({
            type: 'validation',
            message: 'Editing modes should include {{document}} or {{selection}} in user template',
            severity: 'warning',
            suggestion: 'Add {{document}} or {{selection}} for document context'
          });
        }
      }
    }

    return errors;
  }

  /**
   * Validate Track Edits integration
   */
  private validateTrackEditsIntegration(mode: ParsedModeFile): ParseError[] {
    const errors: ParseError[] = [];
    const config = mode.config;

    if (config.makesEdits) {
      // Editing modes should have Track Edits enabled
      if (!config.trackEdits?.enabled) {
        errors.push({
          type: 'validation',
          message: 'Modes that make edits should have Track Edits integration enabled',
          severity: 'error',
          suggestion: 'Add trackEdits.enabled: true for edit tracking'
        });
      }

      // Should have appropriate edit type
      if (config.trackEdits?.editType) {
        const validEditTypes = ['structural', 'style', 'grammar', 'creative', 'mixed'];
        if (!validEditTypes.includes(config.trackEdits.editType)) {
          errors.push({
            type: 'validation',
            message: `Invalid edit type: ${config.trackEdits.editType}`,
            severity: 'error',
            suggestion: `Use one of: ${validEditTypes.join(', ')}`
          });
        }
      }

      // Should have clustering strategy
      if (config.trackEdits?.clusteringStrategy) {
        const validStrategies = ['proximity', 'category', 'ml-inspired'];
        if (!validStrategies.includes(config.trackEdits.clusteringStrategy)) {
          errors.push({
            type: 'validation',
            message: `Invalid clustering strategy: ${config.trackEdits.clusteringStrategy}`,
            severity: 'error',
            suggestion: `Use one of: ${validStrategies.join(', ')}`
          });
        }
      }
    } else {
      // Non-editing modes should not have Track Edits enabled
      if (config.trackEdits?.enabled) {
        errors.push({
          type: 'validation',
          message: 'Non-editing modes should not have Track Edits enabled',
          severity: 'error',
          suggestion: 'Set trackEdits.enabled: false or remove trackEdits configuration'
        });
      }
    }

    return errors;
  }

  /**
   * Validate context injection configuration
   */
  private validateContextInjection(mode: ParsedModeFile): ParseError[] {
    const errors: ParseError[] = [];
    const config = mode.config;
    const contextConfig = config.promptConfig.contextInjection;

    // Editing modes should include document context
    if (CoreModeValidator.EDITING_MODES.has(config.id)) {
      if (!contextConfig.includeDocument) {
        errors.push({
          type: 'validation',
          message: 'Editing modes should include document context',
          severity: 'warning',
          suggestion: 'Set contextInjection.includeDocument: true for document awareness'
        });
      }
    }

    // Check context length limits
    if (contextConfig.maxContextLength) {
      if (contextConfig.maxContextLength < 1000) {
        errors.push({
          type: 'validation',
          message: 'Context length seems too small for effective operation',
          severity: 'warning',
          suggestion: 'Consider increasing maxContextLength to at least 2000 characters'
        });
      }

      if (contextConfig.maxContextLength > 10000) {
        errors.push({
          type: 'validation',
          message: 'Very large context length may impact performance',
          severity: 'warning',
          suggestion: 'Consider if such a large context is necessary for this mode'
        });
      }
    }

    // Validate prioritization strategy
    if (contextConfig.prioritization) {
      const validStrategies = ['recency', 'relevance', 'proximity', 'mixed'];
      if (!validStrategies.includes(contextConfig.prioritization)) {
        errors.push({
          type: 'validation',
          message: `Invalid context prioritization strategy: ${contextConfig.prioritization}`,
          severity: 'error',
          suggestion: `Use one of: ${validStrategies.join(', ')}`
        });
      }
    }

    return errors;
  }

  /**
   * Prepare context for mode transition
   */
  prepareTransitionContext(
    fromMode: string,
    toMode: string,
    sessionContext: SessionContext,
    documentContext?: DocumentContext
  ): ModeTransitionContext {
    return {
      fromMode,
      toMode,
      messages: sessionContext.history,
      documentContext,
      currentSelection: documentContext?.selection?.text,
      timestamp: Date.now()
    };
  }

  /**
   * Validate mode transition compatibility
   */
  validateModeTransition(fromMode: string, toMode: string): ValidationResult {
    const errors: ParseError[] = [];
    const warnings: ParseError[] = [];

    // Validate mode exists
    if (!CoreModeValidator.CORE_MODES.has(fromMode)) {
      errors.push({
        type: 'validation',
        message: `Unknown source mode: ${fromMode}`,
        severity: 'error'
      });
    }

    if (!CoreModeValidator.CORE_MODES.has(toMode)) {
      errors.push({
        type: 'validation',
        message: `Unknown target mode: ${toMode}`,
        severity: 'error'
      });
    }

    // Warn about transitions that might lose context
    const fromEditing = CoreModeValidator.EDITING_MODES.has(fromMode);
    const toEditing = CoreModeValidator.EDITING_MODES.has(toMode);

    if (fromEditing && !toEditing) {
      warnings.push({
        type: 'validation',
        message: 'Transitioning from editing to non-editing mode may lose edit context',
        severity: 'warning',
        suggestion: 'Consider completing current edits before switching'
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Check if a mode is a core mode
   */
  static isCoreMode(modeId: string): boolean {
    return CoreModeValidator.CORE_MODES.has(modeId);
  }

  /**
   * Check if a mode makes edits
   */
  static isEditingMode(modeId: string): boolean {
    return CoreModeValidator.EDITING_MODES.has(modeId);
  }

  /**
   * Get recommended next modes based on current mode
   */
  getRecommendedTransitions(currentMode: string): string[] {
    switch (currentMode) {
      case 'chat':
        return ['writing-assistant', 'copy-edit', 'proofread'];
      case 'writing-assistant':
        return ['copy-edit', 'chat'];
      case 'copy-edit':
        return ['proofread', 'chat'];
      case 'proofread':
        return ['chat'];
      default:
        return ['chat'];
    }
  }
}