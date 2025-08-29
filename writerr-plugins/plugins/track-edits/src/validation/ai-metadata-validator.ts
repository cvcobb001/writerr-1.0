/**
 * Comprehensive AI metadata validation and sanitization system
 * Provides enterprise-grade validation for AI attribution data in EditChange objects
 */

import { AIProcessingContext } from '@shared/types';
import { SanitizationUtils } from './sanitization-utils';

export interface ValidationOptions {
  strictMode?: boolean;
  bypassValidation?: boolean; // For trusted internal calls
  maxProcessingContextSize?: number;
  logSecurityViolations?: boolean;
  enableRateLimiting?: boolean; // Enable/disable rate limiting
  editorialEngineMode?: boolean; // Enable Editorial Engine-specific validation
}

export interface ValidationResult {
  isValid: boolean;
  sanitizedValue?: any;
  errors: string[];
  warnings: string[];
  securityThreats: string[];
}

export interface AIMetadataValidationResult {
  isValid: boolean;
  sanitizedMetadata?: {
    aiProvider?: string;
    aiModel?: string;
    processingContext?: AIProcessingContext;
    aiTimestamp?: Date;
  };
  errors: string[];
  warnings: string[];
  securityThreats: string[];
}

/**
 * Comprehensive validator for AI metadata with security-focused sanitization
 */
export class AIMetadataValidator {
  
  // Whitelist of known AI providers with version support
  private static readonly KNOWN_PROVIDERS = [
    'openai',
    'anthropic', 
    'google',
    'cohere',
    'huggingface',
    'hugging-face',
    'local',
    'custom',
    'azure',
    'aws',
    'gcp',
    'microsoft',
    'meta',
    'facebook',
    'claude',
    'chatgpt',
    'bard',
    'palm',
    'llama',
    'mistral',
    'together',
    'perplexity',
    'writerr', // Platform-specific provider
    'editorial-engine' // Editorial Engine internal
  ];

  // Enhanced AI model validation patterns
  private static readonly MODEL_PATTERNS = {
    openai: /^(gpt-[34]\.?5?-?(turbo|instruct)?(-\d{4})?|text-davinci-\d{3}|code-davinci-\d{3})$/i,
    anthropic: /^(claude-(instant-)?[123](\.\d+)?(-\d+k)?|claude-[23]-(haiku|sonnet|opus)(-\d{8})?)$/i,
    google: /^(palm|bard|gemini)(-pro|-ultra)?(-\d+)?$/i,
    azure: /^(gpt-35-turbo|gpt-4)(-\d{4})?$/i,
    huggingface: /^[\w\-\/]+\/[\w\-\.]+$/,
    local: /^[\w\-\.]+$/,
    custom: /^[\w\-\.]+$/
  };

  // Known AI processing modes with Editorial Engine extensions
  private static readonly KNOWN_MODES = [
    'edit',
    'proofread', 
    'rewrite',
    'expand',
    'summarize',
    'translate',
    'format',
    'style',
    'tone',
    'grammar',
    'creative',
    'technical',
    'academic',
    'casual',
    'formal',
    'custom',
    // Editorial Engine specific modes
    'constraint-based',
    'rule-based',
    'template-driven',
    'conversation-context',
    'batch-processing',
    'multi-step',
    'iterative',
    'collaborative'
  ];

  // Editorial Engine constraint types
  private static readonly CONSTRAINT_TYPES = [
    'style-guide',
    'tone-preference',
    'length-limit',
    'format-requirement',
    'terminology',
    'audience-target',
    'brand-voice',
    'content-policy',
    'technical-standard',
    'accessibility',
    'seo-optimization',
    'citation-style',
    'language-level',
    'cultural-sensitivity'
  ];

  // Rate limiting configuration
  private static rateLimitStore = new Map<string, { count: number; lastReset: number }>();
  private static readonly RATE_LIMIT_WINDOW = 60000; // 1 minute
  private static readonly RATE_LIMIT_MAX_REQUESTS = 100; // per provider per minute

  /**
   * Enhanced validation method with Editorial Engine support
   */
  static validateAIMetadata(
    aiProvider?: string,
    aiModel?: string,
    processingContext?: AIProcessingContext,
    aiTimestamp?: Date | string,
    options: ValidationOptions = {}
  ): AIMetadataValidationResult {
    const {
      strictMode = true,
      bypassValidation = false,
      maxProcessingContextSize = 50000,
      logSecurityViolations = true,
      enableRateLimiting = true,
      editorialEngineMode = false
    } = options;

    // Skip validation if bypassed (for trusted internal calls)
    if (bypassValidation) {
      return {
        isValid: true,
        sanitizedMetadata: {
          aiProvider,
          aiModel,
          processingContext,
          aiTimestamp: aiTimestamp instanceof Date ? aiTimestamp : (aiTimestamp ? new Date(aiTimestamp) : undefined)
        },
        errors: [],
        warnings: [],
        securityThreats: []
      };
    }

    const result: AIMetadataValidationResult = {
      isValid: true,
      sanitizedMetadata: {},
      errors: [],
      warnings: [],
      securityThreats: []
    };

    // Rate limiting check
    if (enableRateLimiting && aiProvider) {
      const rateLimitResult = this.checkRateLimit(aiProvider);
      if (!rateLimitResult.allowed) {
        result.isValid = false;
        result.errors.push(`Rate limit exceeded for provider ${aiProvider}. Try again in ${Math.ceil(rateLimitResult.resetIn / 1000)} seconds.`);
        return result;
      }
    }

    // Validate AI Provider
    if (aiProvider !== undefined) {
      const providerResult = this.validateAIProvider(aiProvider, strictMode, editorialEngineMode);
      if (!providerResult.isValid) {
        result.isValid = false;
        result.errors.push(...providerResult.errors);
      }
      result.warnings.push(...providerResult.warnings);
      result.securityThreats.push(...providerResult.securityThreats);
      result.sanitizedMetadata!.aiProvider = providerResult.sanitizedValue;
    }

    // Validate AI Model with provider-specific validation
    if (aiModel !== undefined) {
      const modelResult = this.validateAIModel(aiModel, aiProvider, strictMode, editorialEngineMode);
      if (!modelResult.isValid) {
        result.isValid = false;
        result.errors.push(...modelResult.errors);
      }
      result.warnings.push(...modelResult.warnings);
      result.securityThreats.push(...modelResult.securityThreats);
      result.sanitizedMetadata!.aiModel = modelResult.sanitizedValue;
    }

    // Enhanced Processing Context validation
    if (processingContext !== undefined) {
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
      result.sanitizedMetadata!.processingContext = contextResult.sanitizedValue;
    }

    // Validate AI Timestamp
    if (aiTimestamp !== undefined) {
      const timestampResult = this.validateAITimestamp(aiTimestamp);
      if (!timestampResult.isValid) {
        result.isValid = false;
        result.errors.push(...timestampResult.errors);
      }
      result.warnings.push(...timestampResult.warnings);
      result.sanitizedMetadata!.aiTimestamp = timestampResult.sanitizedValue;
    }

    // Editorial Engine cross-validation
    if (editorialEngineMode) {
      const engineResult = this.validateEditorialEngineIntegration(
        result.sanitizedMetadata!.aiProvider,
        result.sanitizedMetadata!.aiModel,
        result.sanitizedMetadata!.processingContext
      );
      if (!engineResult.isValid) {
        result.isValid = false;
        result.errors.push(...engineResult.errors);
      }
      result.warnings.push(...engineResult.warnings);
    }

    // Log security violations if requested
    if (logSecurityViolations && result.securityThreats.length > 0) {
      console.warn('AI metadata security threats detected:', {
        threats: result.securityThreats,
        provider: aiProvider,
        model: aiModel,
        timestamp: new Date().toISOString()
      });
    }

    return result;
  }

  /**
   * Enhanced AI provider validation with Editorial Engine support
   */
  static validateAIProvider(provider: string, strictMode: boolean = true, editorialEngineMode: boolean = false): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      securityThreats: []
    };

    // Type check
    if (typeof provider !== 'string') {
      result.isValid = false;
      result.errors.push('AI provider must be a string');
      result.sanitizedValue = '';
      return result;
    }

    // Enhanced security threat detection
    const threats = SanitizationUtils.detectSecurityThreats(provider);
    const advancedThreats = this.detectAdvancedSecurityThreats(provider);
    const allThreats = [...threats, ...advancedThreats];
    
    if (allThreats.length > 0) {
      result.securityThreats.push(...allThreats);
      if (strictMode) {
        result.isValid = false;
        result.errors.push('Security threats detected in AI provider name');
      } else {
        result.warnings.push('Security threats sanitized in AI provider name');
      }
    }

    // Sanitize provider name
    const sanitized = SanitizationUtils.sanitizeAIProvider(provider);
    result.sanitizedValue = sanitized;

    // Check if empty after sanitization
    if (sanitized.length === 0) {
      result.isValid = false;
      result.errors.push('AI provider name is empty after sanitization');
      return result;
    }

    // Length validation with more restrictive limits
    if (sanitized.length > 50) {
      result.isValid = false;
      result.errors.push('AI provider name too long (max 50 characters)');
      return result;
    }

    // Validate against known providers (case-insensitive)
    const lowerProvider = sanitized.toLowerCase();
    if (!this.KNOWN_PROVIDERS.includes(lowerProvider)) {
      if (strictMode) {
        result.isValid = false;
        result.errors.push(`Unknown AI provider: ${sanitized}. Must be one of: ${this.KNOWN_PROVIDERS.join(', ')}`);
      } else {
        result.warnings.push(`Unknown AI provider: ${sanitized}. Consider adding to whitelist.`);
      }
    }

    // Editorial Engine specific validation
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
  static validateAIModel(model: string, provider?: string, strictMode: boolean = true, editorialEngineMode: boolean = false): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      securityThreats: []
    };

    // Type check
    if (typeof model !== 'string') {
      result.isValid = false;
      result.errors.push('AI model must be a string');
      result.sanitizedValue = '';
      return result;
    }

    // Enhanced security threat detection
    const threats = SanitizationUtils.detectSecurityThreats(model);
    const advancedThreats = this.detectAdvancedSecurityThreats(model);
    const allThreats = [...threats, ...advancedThreats];
    
    if (allThreats.length > 0) {
      result.securityThreats.push(...allThreats);
      if (strictMode) {
        result.isValid = false;
        result.errors.push('Security threats detected in AI model name');
      } else {
        result.warnings.push('Security threats sanitized in AI model name');
      }
    }

    // Sanitize model name
    const sanitized = SanitizationUtils.sanitizeAIModel(model);
    result.sanitizedValue = sanitized;

    // Check if empty after sanitization
    if (sanitized.length === 0) {
      result.isValid = false;
      result.errors.push('AI model name is empty after sanitization');
      return result;
    }

    // Length validation
    if (sanitized.length > 100) {
      result.isValid = false;
      result.errors.push('AI model name too long (max 100 characters)');
      return result;
    }

    // Provider-specific model validation
    if (provider && strictMode) {
      const providerValidation = this.validateModelForProvider(sanitized, provider);
      if (!providerValidation.isValid) {
        result.warnings.push(...providerValidation.errors); // Warnings instead of errors for flexibility
      }
    }

    // Editorial Engine model validation
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
  static validateProcessingContext(
    context: AIProcessingContext, 
    maxSize: number = 50000,
    strictMode: boolean = true,
    editorialEngineMode: boolean = false
  ): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      securityThreats: []
    };

    // Type check
    if (typeof context !== 'object' || context === null) {
      result.isValid = false;
      result.errors.push('Processing context must be an object');
      result.sanitizedValue = {};
      return result;
    }

    // Check serialized size before processing
    const currentSize = SanitizationUtils.calculateSerializedSize(context);
    if (currentSize > maxSize) {
      result.isValid = false;
      result.errors.push(`Processing context too large: ${currentSize} bytes (max ${maxSize})`);
      result.sanitizedValue = {};
      return result;
    }

    // Enhanced object sanitization with deeper protection
    const sanitizedContext = SanitizationUtils.sanitizeObject(context, 10); // Increased depth
    
    // Validate and sanitize individual fields
    const validatedContext: AIProcessingContext = {};

    // Enhanced constraints validation
    if (sanitizedContext.constraints !== undefined) {
      const constraintsResult = this.validateConstraints(sanitizedContext.constraints, editorialEngineMode, strictMode);
      if (!constraintsResult.isValid) {
        result.isValid = false;
        result.errors.push(...constraintsResult.errors);
      }
      result.warnings.push(...constraintsResult.warnings);
      result.securityThreats.push(...constraintsResult.securityThreats);
      validatedContext.constraints = constraintsResult.sanitizedValue as string[];
    }

    // Enhanced prompt validation
    if (sanitizedContext.prompt !== undefined) {
      const promptResult = this.validatePrompt(sanitizedContext.prompt, strictMode);
      if (!promptResult.isValid) {
        result.isValid = false;
        result.errors.push(...promptResult.errors);
      }
      result.warnings.push(...promptResult.warnings);
      result.securityThreats.push(...promptResult.securityThreats);
      validatedContext.prompt = promptResult.sanitizedValue as string;
    }

    // Enhanced mode validation
    if (sanitizedContext.mode !== undefined) {
      const modeResult = this.validateProcessingMode(sanitizedContext.mode, editorialEngineMode, strictMode);
      if (!modeResult.isValid) {
        result.isValid = false;
        result.errors.push(...modeResult.errors);
      }
      result.warnings.push(...modeResult.warnings);
      validatedContext.mode = modeResult.sanitizedValue as string;
    }

    // Enhanced instructions validation
    if (sanitizedContext.instructions !== undefined) {
      const instructionsResult = this.validateInstructions(sanitizedContext.instructions, strictMode);
      if (!instructionsResult.isValid) {
        result.isValid = false;
        result.errors.push(...instructionsResult.errors);
      }
      result.warnings.push(...instructionsResult.warnings);
      result.securityThreats.push(...instructionsResult.securityThreats);
      validatedContext.instructions = instructionsResult.sanitizedValue as string;
    }

    // Validate conversation context for Editorial Engine
    if (sanitizedContext.conversationId !== undefined) {
      const conversationResult = this.validateConversationContext(sanitizedContext.conversationId, strictMode);
      if (!conversationResult.isValid) {
        result.isValid = false;
        result.errors.push(...conversationResult.errors);
      }
      result.warnings.push(...conversationResult.warnings);
      validatedContext.conversationId = conversationResult.sanitizedValue as string;
    }

    // Validate metadata and settings
    if (sanitizedContext.metadata !== undefined) {
      const metadataResult = this.validateMetadata(sanitizedContext.metadata, strictMode);
      if (!metadataResult.isValid) {
        result.warnings.push(...metadataResult.errors); // Non-critical
      }
      validatedContext.metadata = metadataResult.sanitizedValue as Record<string, any>;
    }

    if (sanitizedContext.settings !== undefined) {
      const settingsResult = this.validateSettings(sanitizedContext.settings, strictMode);
      if (!settingsResult.isValid) {
        result.warnings.push(...settingsResult.errors); // Non-critical
      }
      validatedContext.settings = settingsResult.sanitizedValue as Record<string, any>;
    }

    // Final size check after sanitization
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
  private static validateConstraints(constraints: any, editorialEngineMode: boolean, strictMode: boolean): ValidationResult {
    const result: ValidationResult = { isValid: true, errors: [], warnings: [], securityThreats: [] };

    if (!Array.isArray(constraints)) {
      result.isValid = false;
      result.errors.push('Constraints must be an array');
      result.sanitizedValue = [];
      return result;
    }

    const sanitizedConstraints: string[] = [];
    
    for (let i = 0; i < Math.min(constraints.length, 50); i++) {
      const constraint = constraints[i];
      
      if (typeof constraint !== 'string') {
        result.warnings.push(`Constraint ${i} is not a string, skipping`);
        continue;
      }

      // Security threat detection
      const threats = this.detectAdvancedSecurityThreats(constraint);
      if (threats.length > 0) {
        result.securityThreats.push(...threats);
        if (strictMode) {
          result.warnings.push(`Security threats in constraint ${i}, sanitizing`);
        }
      }

      // Sanitize constraint
      const sanitized = SanitizationUtils.sanitizeString(constraint, {
        maxLength: 1000,
        preserveNewlines: false,
        strictMode: strictMode
      });

      if (sanitized.length === 0) {
        result.warnings.push(`Constraint ${i} is empty after sanitization, skipping`);
        continue;
      }

      // Editorial Engine constraint type validation
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
  private static validateConstraintFormat(constraint: string): ValidationResult {
    const result: ValidationResult = { isValid: true, errors: [], warnings: [], securityThreats: [] };

    // Check for structured constraint format: type:value or key=value
    const structuredPatterns = [
      /^[\w-]+:[\s\S]+$/,  // type:value format
      /^[\w-]+=[\s\S]+$/,  // key=value format
      /^[\w-]+\s+[\s\S]+$/ // key value format
    ];

    const hasStructure = structuredPatterns.some(pattern => pattern.test(constraint));
    
    if (!hasStructure && constraint.length > 20) {
      result.warnings.push('Constraint may benefit from structured format (e.g., "tone:professional" or "length=500")');
    }

    // Validate constraint type if structured
    const typeMatch = constraint.match(/^([\w-]+)[:=]/);
    if (typeMatch) {
      const type = typeMatch[1].toLowerCase();
      if (!this.CONSTRAINT_TYPES.includes(type)) {
        result.warnings.push(`Unknown constraint type: ${type}. Consider using: ${this.CONSTRAINT_TYPES.join(', ')}`);
      }
    }

    return result;
  }

  /**
   * Editorial Engine integration validation
   */
  private static validateEditorialEngineIntegration(
    provider?: string, 
    model?: string, 
    context?: AIProcessingContext
  ): ValidationResult {
    const result: ValidationResult = { isValid: true, errors: [], warnings: [], securityThreats: [] };

    // Validate provider compatibility with Editorial Engine
    if (provider && !['editorial-engine', 'writerr', 'openai', 'anthropic', 'custom'].includes(provider.toLowerCase())) {
      result.warnings.push(`Provider ${provider} may have limited Editorial Engine integration support`);
    }

    // Validate processing context for Editorial Engine requirements
    if (context) {
      if (!context.mode && !context.constraints) {
        result.warnings.push('Editorial Engine works best with either processing mode or constraints specified');
      }

      if (context.constraints && context.constraints.length === 0) {
        result.warnings.push('Empty constraints array provided to Editorial Engine');
      }
    }

    return result;
  }

  /**
   * Rate limiting implementation
   */
  private static checkRateLimit(provider: string): { allowed: boolean; resetIn: number } {
    const now = Date.now();
    const key = provider.toLowerCase();
    
    let entry = this.rateLimitStore.get(key);
    if (!entry || (now - entry.lastReset) >= this.RATE_LIMIT_WINDOW) {
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
  private static detectAdvancedSecurityThreats(input: string): string[] {
    const threats: string[] = [];

    // SQL injection patterns
    if (/(\bUNION\b|\bSELECT\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bDROP\b)/i.test(input)) {
      threats.push('Potential SQL injection');
    }

    // Command injection patterns
    if (/[;&|`$(){}[\]\\]/.test(input)) {
      threats.push('Command injection characters');
    }

    // Path traversal
    if (/\.\.(\/|\\)/.test(input)) {
      threats.push('Path traversal attempt');
    }

    // Template injection
    if (/\{\{.*\}\}|\${.*}|<%.*%>/.test(input)) {
      threats.push('Template injection pattern');
    }

    // Prototype pollution
    if (/__proto__|constructor\.prototype|\.constructor/.test(input)) {
      threats.push('Prototype pollution attempt');
    }

    return threats;
  }

  // Additional helper methods for enhanced validation
  private static validateEditorialEngineProvider(provider: string): ValidationResult {
    const result: ValidationResult = { isValid: true, errors: [], warnings: [], securityThreats: [] };
    
    if (provider === 'editorial-engine' || provider === 'writerr') {
      // These are always valid for Editorial Engine mode
      return result;
    }

    const compatibleProviders = ['openai', 'anthropic', 'custom', 'local'];
    if (!compatibleProviders.includes(provider.toLowerCase())) {
      result.warnings.push(`Provider ${provider} may have limited Editorial Engine compatibility`);
    }

    return result;
  }

  private static validateEditorialEngineModel(model: string, provider?: string): ValidationResult {
    const result: ValidationResult = { isValid: true, errors: [], warnings: [], securityThreats: [] };
    
    if (provider === 'editorial-engine' || provider === 'writerr') {
      // Editorial Engine internal models - validate format
      if (!/^[a-z0-9\-_]+(\.[a-z0-9\-_]+)*$/i.test(model)) {
        result.errors.push('Editorial Engine model names must use alphanumeric characters, hyphens, underscores, and dots only');
      }
    }

    return result;
  }

  private static validateModelForProvider(model: string, provider: string): ValidationResult {
    const result: ValidationResult = { isValid: true, errors: [], warnings: [], securityThreats: [] };
    
    const lowerProvider = provider.toLowerCase();
    const pattern = this.MODEL_PATTERNS[lowerProvider as keyof typeof this.MODEL_PATTERNS];
    
    if (pattern && !pattern.test(model)) {
      result.errors.push(`Model ${model} does not match expected format for provider ${provider}`);
    }

    return result;
  }

  private static validatePrompt(prompt: any, strictMode: boolean): ValidationResult {
    const result: ValidationResult = { isValid: true, errors: [], warnings: [], securityThreats: [] };

    if (typeof prompt !== 'string') {
      result.isValid = false;
      result.errors.push('Prompt must be a string');
      result.sanitizedValue = '';
      return result;
    }

    const threats = this.detectAdvancedSecurityThreats(prompt);
    if (threats.length > 0) {
      result.securityThreats.push(...threats);
    }

    result.sanitizedValue = SanitizationUtils.sanitizeString(prompt, {
      maxLength: 20000,
      preserveNewlines: true,
      strictMode: strictMode
    });

    return result;
  }

  private static validateInstructions(instructions: any, strictMode: boolean): ValidationResult {
    const result: ValidationResult = { isValid: true, errors: [], warnings: [], securityThreats: [] };

    if (typeof instructions !== 'string') {
      result.isValid = false;
      result.errors.push('Instructions must be a string');
      result.sanitizedValue = '';
      return result;
    }

    const threats = this.detectAdvancedSecurityThreats(instructions);
    if (threats.length > 0) {
      result.securityThreats.push(...threats);
    }

    result.sanitizedValue = SanitizationUtils.sanitizeString(instructions, {
      maxLength: 10000,
      preserveNewlines: true,
      strictMode: strictMode
    });

    return result;
  }

  private static validateProcessingMode(mode: any, editorialEngineMode: boolean, strictMode: boolean): ValidationResult {
    const result: ValidationResult = { isValid: true, errors: [], warnings: [], securityThreats: [] };

    if (typeof mode !== 'string') {
      result.isValid = false;
      result.errors.push('Processing mode must be a string');
      result.sanitizedValue = '';
      return result;
    }

    const sanitizedMode = SanitizationUtils.sanitizeMode(mode);
    result.sanitizedValue = sanitizedMode;

    const lowerMode = sanitizedMode.toLowerCase();
    if (!this.KNOWN_MODES.includes(lowerMode)) {
      if (strictMode) {
        result.warnings.push(`Unknown processing mode: ${sanitizedMode}. Available modes: ${this.KNOWN_MODES.join(', ')}`);
      }
    }

    // Editorial Engine mode validation
    if (editorialEngineMode) {
      const engineModes = ['constraint-based', 'rule-based', 'template-driven', 'conversation-context'];
      if (engineModes.includes(lowerMode)) {
        // These modes require specific context validation
        result.warnings.push(`Mode ${sanitizedMode} requires Editorial Engine context validation`);
      }
    }

    return result;
  }

  private static validateConversationContext(conversationId: any, strictMode: boolean): ValidationResult {
    const result: ValidationResult = { isValid: true, errors: [], warnings: [], securityThreats: [] };

    if (typeof conversationId !== 'string') {
      result.isValid = false;
      result.errors.push('Conversation ID must be a string');
      result.sanitizedValue = '';
      return result;
    }

    // Validate conversation ID format
    if (!/^[a-zA-Z0-9\-_]{8,64}$/.test(conversationId)) {
      result.isValid = false;
      result.errors.push('Conversation ID must be 8-64 alphanumeric characters, hyphens, or underscores');
      result.sanitizedValue = '';
      return result;
    }

    result.sanitizedValue = conversationId;
    return result;
  }

  private static validateMetadata(metadata: any, strictMode: boolean): ValidationResult {
    const result: ValidationResult = { isValid: true, errors: [], warnings: [], securityThreats: [] };

    if (typeof metadata !== 'object' || metadata === null) {
      result.warnings.push('Metadata must be an object');
      result.sanitizedValue = {};
      return result;
    }

    const sanitized = SanitizationUtils.sanitizeObject(metadata, 3);
    result.sanitizedValue = sanitized;
    return result;
  }

  private static validateSettings(settings: any, strictMode: boolean): ValidationResult {
    const result: ValidationResult = { isValid: true, errors: [], warnings: [], securityThreats: [] };

    if (typeof settings !== 'object' || settings === null) {
      result.warnings.push('Settings must be an object');
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
  static validateAITimestamp(timestamp: Date | string): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      securityThreats: []
    };

    const validatedDate = SanitizationUtils.validateTimestamp(timestamp);
    
    if (validatedDate === null) {
      result.isValid = false;
      result.errors.push('Invalid AI timestamp: must be a valid date within reasonable range');
      result.sanitizedValue = null;
      return result;
    }

    result.sanitizedValue = validatedDate;
    return result;
  }

  /**
   * Quick validation method that returns boolean and sanitized data
   */
  static quickValidate(
    aiProvider?: string,
    aiModel?: string,
    processingContext?: AIProcessingContext,
    aiTimestamp?: Date | string,
    options: ValidationOptions = {}
  ): { isValid: boolean; sanitized: any } {
    const result = this.validateAIMetadata(aiProvider, aiModel, processingContext, aiTimestamp, options);
    
    return {
      isValid: result.isValid,
      sanitized: result.sanitizedMetadata
    };
  }

  /**
   * Provides validation configuration for different environments
   */
  static getValidationConfig(environment: 'development' | 'production' | 'testing'): ValidationOptions {
    switch (environment) {
      case 'development':
        return {
          strictMode: false,
          maxProcessingContextSize: 100000,
          logSecurityViolations: true,
          enableRateLimiting: false,
          editorialEngineMode: false
        };
      
      case 'production':
        return {
          strictMode: true,
          maxProcessingContextSize: 50000,
          logSecurityViolations: true,
          enableRateLimiting: true,
          editorialEngineMode: true
        };
      
      case 'testing':
        return {
          strictMode: true,
          maxProcessingContextSize: 10000,
          logSecurityViolations: false,
          enableRateLimiting: false,
          editorialEngineMode: true
        };
      
      default:
        return {
          strictMode: true,
          maxProcessingContextSize: 50000,
          logSecurityViolations: true,
          enableRateLimiting: true,
          editorialEngineMode: false
        };
    }
  }

  /**
   * Editorial Engine specific validation method
   */
  static validateForEditorialEngine(
    aiProvider: string,
    aiModel: string,
    processingContext: AIProcessingContext,
    options: ValidationOptions = {}
  ): AIMetadataValidationResult {
    return this.validateAIMetadata(
      aiProvider,
      aiModel,
      processingContext,
      new Date(),
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
  static resetRateLimit(provider?: string): void {
    if (provider) {
      this.rateLimitStore.delete(provider.toLowerCase());
    } else {
      this.rateLimitStore.clear();
    }
  }
}