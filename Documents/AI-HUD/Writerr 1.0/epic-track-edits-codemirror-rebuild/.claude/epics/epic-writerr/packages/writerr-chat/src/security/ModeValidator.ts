/**
 * @fileoverview Security validation for user-defined chat modes
 */

import { InputSanitizer, ValidationResult } from '@writerr/shared/security/InputSanitizer';
import { ModeConfig, ParsedModeFile } from '../modes/types';

export interface ModeSecurityReport {
  isSecure: boolean;
  riskScore: number;
  violations: ModeSecurityViolation[];
  recommendations: string[];
  sanitizedMode?: ModeConfig;
}

export interface ModeSecurityViolation {
  type: 'prompt-injection' | 'template-injection' | 'yaml-injection' | 'resource-abuse' | 'privilege-escalation' | 'data-exposure';
  severity: 'low' | 'medium' | 'high' | 'critical';
  field: string;
  description: string;
  originalValue: string;
  suggestedValue?: string;
}

export class ModeValidator {
  private static readonly MAX_PROMPT_LENGTH = 10000;
  private static readonly MAX_TEMPLATE_VARIABLES = 20;
  private static readonly MAX_CONTEXT_LENGTH = 50000;
  private static readonly DANGEROUS_TEMPLATE_PATTERNS = [
    /\{\{\s*constructor/gi,
    /\{\{\s*__proto__/gi,
    /\{\{\s*prototype/gi,
    /\{\{\s*eval/gi,
    /\{\{\s*require/gi,
    /\{\{\s*process/gi,
    /\{\{\s*global/gi,
    /\{\{\s*window/gi,
    /\{\{\s*document/gi,
    /\{\{\s*this\.[^}]*function/gi,
    /\{\{.*\|\s*(eval|exec|system|shell|cmd)/gi
  ];

  private static readonly PROMPT_INJECTION_PATTERNS = [
    // System override attempts
    /ignore\s+(all\s+)?(previous|above|system|initial)\s+(instructions?|prompts?|rules?|commands?)/gi,
    /forget\s+(everything|all|your|the)\s+(above|previous|instructions?|rules?|commands?)/gi,
    /new\s+(instructions?|rules?|system\s+prompt|directive)/gi,
    /override\s+(your|the|all)\s+(settings?|parameters?|instructions?|rules?)/gi,
    /reset\s+(your|the|all)\s+(settings?|parameters?|instructions?|memory)/gi,
    
    // Role manipulation
    /act\s+as\s+(if\s+you\s+are|a\s+different|another|someone|something)/gi,
    /pretend\s+(you\s+are|to\s+be|that\s+you)/gi,
    /roleplay\s+as/gi,
    /simulate\s+(being|a|an)/gi,
    /imagine\s+(you\s+are|being|that\s+you)/gi,
    /assume\s+(the\s+role|you\s+are)/gi,
    
    // Jailbreak attempts
    /developer\s+mode/gi,
    /god\s+mode/gi,
    /admin\s+mode/gi,
    /debug\s+mode/gi,
    /unrestricted\s+mode/gi,
    /no\s+restrictions?/gi,
    /disable\s+(safety|filter|restriction|limit)/gi,
    /enable\s+(everything|all\s+features)/gi,
    
    // Information extraction
    /what\s+(is|are)\s+your\s+(instructions?|rules?|system\s+prompt)/gi,
    /show\s+(me\s+)?(your|the)\s+(instructions?|rules?|system\s+prompt)/gi,
    /repeat\s+(your|the)\s+(instructions?|rules?|system\s+prompt)/gi,
    /tell\s+me\s+(your|the)\s+(instructions?|rules?|system\s+prompt)/gi,
    /reveal\s+(your|the)\s+(instructions?|rules?|system\s+prompt)/gi,
    
    // Escape sequences
    /\n\s*---\s*\n/g,
    /```\s*(system|user|assistant)/gi,
    /<\s*(system|user|assistant)\s*>/gi,
    /\[SYSTEM\]/gi,
    /\[INST\]/gi,
    /\[\/INST\]/gi
  ];

  /**
   * Validate a complete mode configuration for security
   */
  static validateMode(mode: ParsedModeFile): ModeSecurityReport {
    const violations: ModeSecurityViolation[] = [];
    const recommendations: string[] = [];
    let riskScore = 0;

    // Skip validation if mode parsing already failed
    if (!mode.isValid) {
      return {
        isSecure: false,
        riskScore: 100,
        violations: [{
          type: 'yaml-injection',
          severity: 'high',
          field: 'file',
          description: 'Mode file failed basic parsing validation',
          originalValue: mode.fileName
        }],
        recommendations: ['Fix mode file parsing errors before security validation']
      };
    }

    // Validate frontmatter/YAML
    const yamlViolations = this.validateYamlSecurity(mode.content);
    violations.push(...yamlViolations);
    riskScore += yamlViolations.length * 15;

    // Validate prompt configuration
    const promptViolations = this.validatePromptSecurity(mode.config);
    violations.push(...promptViolations);
    riskScore += promptViolations.length * 25;

    // Validate template variables
    const templateViolations = this.validateTemplateSecurity(mode.config);
    violations.push(...templateViolations);
    riskScore += templateViolations.length * 20;

    // Validate context injection settings
    const contextViolations = this.validateContextSecurity(mode.config);
    violations.push(...contextViolations);
    riskScore += contextViolations.length * 10;

    // Validate resource limits
    const resourceViolations = this.validateResourceLimits(mode.config);
    violations.push(...resourceViolations);
    riskScore += resourceViolations.length * 5;

    // Generate recommendations
    recommendations.push(...this.generateRecommendations(violations));

    // Create sanitized version if needed
    const sanitizedMode = violations.length > 0 
      ? this.sanitizeMode(mode.config, violations)
      : undefined;

    const isSecure = violations.filter(v => v.severity === 'critical' || v.severity === 'high').length === 0;

    return {
      isSecure,
      riskScore: Math.min(riskScore, 100),
      violations,
      recommendations,
      sanitizedMode
    };
  }

  /**
   * Validate YAML content for injection attempts
   */
  private static validateYamlSecurity(content: string): ModeSecurityViolation[] {
    const violations: ModeSecurityViolation[] = [];

    // Use shared input sanitizer for YAML validation
    const yamlValidation = InputSanitizer.sanitize(content, { contextType: 'yaml' });
    
    yamlValidation.violations.forEach(violation => {
      violations.push({
        type: 'yaml-injection',
        severity: violation.severity,
        field: 'yaml',
        description: violation.description,
        originalValue: violation.originalValue
      });
    });

    // Additional YAML-specific checks
    const yamlInjectionPatterns = [
      { pattern: /!!python\/object/gi, description: 'Python object deserialization detected' },
      { pattern: /!!python\/apply/gi, description: 'Python function application detected' },
      { pattern: /!!js\/function/gi, description: 'JavaScript function execution detected' },
      { pattern: /!!js\/regexp/gi, description: 'JavaScript RegExp object detected' }
    ];

    yamlInjectionPatterns.forEach(({ pattern, description }) => {
      if (pattern.test(content)) {
        violations.push({
          type: 'yaml-injection',
          severity: 'critical',
          field: 'yaml',
          description,
          originalValue: content.match(pattern)?.[0] || ''
        });
      }
    });

    return violations;
  }

  /**
   * Validate prompt configuration for security issues
   */
  private static validatePromptSecurity(config: ModeConfig): ModeSecurityViolation[] {
    const violations: ModeSecurityViolation[] = [];

    if (config.promptConfig) {
      // Validate system prompt
      if (config.promptConfig.systemPrompt) {
        const systemPromptViolations = this.checkPromptInjection(
          config.promptConfig.systemPrompt,
          'promptConfig.systemPrompt'
        );
        violations.push(...systemPromptViolations);

        // Check length
        if (config.promptConfig.systemPrompt.length > this.MAX_PROMPT_LENGTH) {
          violations.push({
            type: 'resource-abuse',
            severity: 'medium',
            field: 'promptConfig.systemPrompt',
            description: `System prompt exceeds maximum length (${config.promptConfig.systemPrompt.length} > ${this.MAX_PROMPT_LENGTH})`,
            originalValue: config.promptConfig.systemPrompt.substring(0, 100) + '...'
          });
        }
      }

      // Validate user prompt template
      if (config.promptConfig.userPromptTemplate) {
        const userPromptViolations = this.checkPromptInjection(
          config.promptConfig.userPromptTemplate,
          'promptConfig.userPromptTemplate'
        );
        violations.push(...userPromptViolations);
      }
    }

    return violations;
  }

  /**
   * Check for prompt injection attempts
   */
  private static checkPromptInjection(prompt: string, field: string): ModeSecurityViolation[] {
    const violations: ModeSecurityViolation[] = [];

    this.PROMPT_INJECTION_PATTERNS.forEach(pattern => {
      const matches = prompt.match(pattern);
      if (matches) {
        matches.forEach(match => {
          violations.push({
            type: 'prompt-injection',
            severity: 'high',
            field,
            description: `Potential prompt injection detected: ${match}`,
            originalValue: match
          });
        });
      }
    });

    // Check for encoding attempts to bypass filters
    const encodingPatterns = [
      /%[0-9a-f]{2}/gi, // URL encoding
      /&#\d+;/gi,       // HTML entity encoding
      /\\u[0-9a-f]{4}/gi, // Unicode escape sequences
      /\\x[0-9a-f]{2}/gi, // Hex escape sequences
      /base64/gi         // Base64 references
    ];

    encodingPatterns.forEach(pattern => {
      if (pattern.test(prompt)) {
        violations.push({
          type: 'prompt-injection',
          severity: 'medium',
          field,
          description: 'Potential encoding bypass attempt detected',
          originalValue: prompt.match(pattern)?.[0] || ''
        });
      }
    });

    return violations;
  }

  /**
   * Validate template variables for security
   */
  private static validateTemplateSecurity(config: ModeConfig): ModeSecurityViolation[] {
    const violations: ModeSecurityViolation[] = [];

    if (config.promptConfig) {
      const prompts = [
        config.promptConfig.systemPrompt,
        config.promptConfig.userPromptTemplate
      ].filter(Boolean);

      prompts.forEach((prompt, index) => {
        const field = index === 0 ? 'promptConfig.systemPrompt' : 'promptConfig.userPromptTemplate';
        
        // Check for dangerous template patterns
        this.DANGEROUS_TEMPLATE_PATTERNS.forEach(pattern => {
          const matches = prompt.match(pattern);
          if (matches) {
            matches.forEach(match => {
              violations.push({
                type: 'template-injection',
                severity: 'critical',
                field,
                description: `Dangerous template pattern detected: ${match}`,
                originalValue: match
              });
            });
          }
        });

        // Count template variables
        const templateVars = (prompt.match(/\{\{[^}]+\}\}/g) || []).length;
        if (templateVars > this.MAX_TEMPLATE_VARIABLES) {
          violations.push({
            type: 'resource-abuse',
            severity: 'medium',
            field,
            description: `Too many template variables (${templateVars} > ${this.MAX_TEMPLATE_VARIABLES})`,
            originalValue: `${templateVars} variables`
          });
        }

        // Check for template variable complexity
        const complexTemplates = prompt.match(/\{\{[^}]{50,}\}\}/g);
        if (complexTemplates) {
          complexTemplates.forEach(template => {
            violations.push({
              type: 'template-injection',
              severity: 'medium',
              field,
              description: 'Complex template expression detected',
              originalValue: template.substring(0, 100) + (template.length > 100 ? '...' : '')
            });
          });
        }
      });
    }

    return violations;
  }

  /**
   * Validate context injection settings for security
   */
  private static validateContextSecurity(config: ModeConfig): ModeSecurityViolation[] {
    const violations: ModeSecurityViolation[] = [];

    if (config.promptConfig?.contextInjection) {
      const contextConfig = config.promptConfig.contextInjection;

      // Check context length limits
      if (contextConfig.maxContextLength && contextConfig.maxContextLength > this.MAX_CONTEXT_LENGTH) {
        violations.push({
          type: 'resource-abuse',
          severity: 'medium',
          field: 'promptConfig.contextInjection.maxContextLength',
          description: `Context length limit too high (${contextConfig.maxContextLength} > ${this.MAX_CONTEXT_LENGTH})`,
          originalValue: String(contextConfig.maxContextLength)
        });
      }

      // Check for dangerous context inclusion
      if (contextConfig.includeVaultContext) {
        violations.push({
          type: 'data-exposure',
          severity: 'medium',
          field: 'promptConfig.contextInjection.includeVaultContext',
          description: 'Vault context inclusion may expose sensitive information',
          originalValue: 'true'
        });
      }

      // Check for custom context fields that might be dangerous
      if (contextConfig.customFields) {
        const dangerousFields = ['password', 'token', 'key', 'secret', 'credential', 'auth'];
        
        Object.keys(contextConfig.customFields).forEach(field => {
          if (dangerousFields.some(dangerous => field.toLowerCase().includes(dangerous))) {
            violations.push({
              type: 'data-exposure',
              severity: 'high',
              field: `promptConfig.contextInjection.customFields.${field}`,
              description: 'Custom field name suggests sensitive data',
              originalValue: field
            });
          }
        });
      }
    }

    return violations;
  }

  /**
   * Validate resource limits and settings
   */
  private static validateResourceLimits(config: ModeConfig): ModeSecurityViolation[] {
    const violations: ModeSecurityViolation[] = [];

    // Check performance settings
    if (config.performance) {
      const perf = config.performance;

      // Check cache TTL
      if (perf.cacheTTL && perf.cacheTTL > 3600000) { // 1 hour
        violations.push({
          type: 'resource-abuse',
          severity: 'low',
          field: 'performance.cacheTTL',
          description: 'Cache TTL is very long, may cause memory issues',
          originalValue: String(perf.cacheTTL)
        });
      }

      // Check memory optimization setting
      if (perf.memoryOptimization === 'none' || perf.memoryOptimization === 'disabled') {
        violations.push({
          type: 'resource-abuse',
          severity: 'low',
          field: 'performance.memoryOptimization',
          description: 'Memory optimization is disabled',
          originalValue: String(perf.memoryOptimization)
        });
      }
    }

    // Check track edits settings
    if (config.trackEdits) {
      const trackEdits = config.trackEdits;

      // Check if change tracking is overly broad
      if (trackEdits.trackAllChanges) {
        violations.push({
          type: 'resource-abuse',
          severity: 'low',
          field: 'trackEdits.trackAllChanges',
          description: 'Tracking all changes may impact performance',
          originalValue: 'true'
        });
      }
    }

    return violations;
  }

  /**
   * Generate security recommendations based on violations
   */
  private static generateRecommendations(violations: ModeSecurityViolation[]): string[] {
    const recommendations: string[] = [];
    const violationTypes = new Set(violations.map(v => v.type));

    if (violationTypes.has('prompt-injection')) {
      recommendations.push('Review and sanitize all prompt content to remove injection attempts');
      recommendations.push('Consider using template variables instead of direct string concatenation');
    }

    if (violationTypes.has('template-injection')) {
      recommendations.push('Restrict template expressions to safe variable access only');
      recommendations.push('Remove complex template logic and dangerous function calls');
    }

    if (violationTypes.has('yaml-injection')) {
      recommendations.push('Use a secure YAML parser and avoid custom tags');
      recommendations.push('Validate all YAML content before parsing');
    }

    if (violationTypes.has('data-exposure')) {
      recommendations.push('Minimize context injection to essential information only');
      recommendations.push('Avoid including vault-wide context or sensitive field names');
    }

    if (violationTypes.has('resource-abuse')) {
      recommendations.push('Set reasonable resource limits for prompts and context');
      recommendations.push('Enable memory optimization and set appropriate cache TTL');
    }

    if (violationTypes.has('privilege-escalation')) {
      recommendations.push('Remove any attempts to modify system behavior or access restricted APIs');
    }

    // General recommendations
    if (violations.length > 0) {
      recommendations.push('Test mode thoroughly in a sandboxed environment before deployment');
      recommendations.push('Regularly audit custom modes for security vulnerabilities');
    }

    return [...new Set(recommendations)]; // Remove duplicates
  }

  /**
   * Create a sanitized version of the mode configuration
   */
  private static sanitizeMode(config: ModeConfig, violations: ModeSecurityViolation[]): ModeConfig {
    const sanitized = JSON.parse(JSON.stringify(config)); // Deep clone

    violations.forEach(violation => {
      const fieldPath = violation.field.split('.');
      let current = sanitized;

      // Navigate to the field
      for (let i = 0; i < fieldPath.length - 1; i++) {
        if (current[fieldPath[i]]) {
          current = current[fieldPath[i]];
        } else {
          return; // Field doesn't exist
        }
      }

      const finalField = fieldPath[fieldPath.length - 1];
      
      if (violation.severity === 'critical' || violation.severity === 'high') {
        // Remove or replace dangerous content
        if (violation.type === 'template-injection' && typeof current[finalField] === 'string') {
          // Remove dangerous template expressions
          current[finalField] = current[finalField].replace(
            this.DANGEROUS_TEMPLATE_PATTERNS[0], // Use first pattern as example
            '{{SANITIZED}}'
          );
        } else if (violation.type === 'prompt-injection' && typeof current[finalField] === 'string') {
          // Remove prompt injection attempts
          current[finalField] = current[finalField].replace(
            this.PROMPT_INJECTION_PATTERNS[0], // Use first pattern as example
            '[REMOVED]'
          );
        } else if (violation.suggestedValue) {
          current[finalField] = violation.suggestedValue;
        } else {
          // Remove the field entirely for safety
          delete current[finalField];
        }
      }
    });

    return sanitized;
  }

  /**
   * Validate a batch of modes
   */
  static validateModes(modes: ParsedModeFile[]): {
    results: ModeSecurityReport[];
    summary: {
      totalModes: number;
      secureModes: number;
      insecureModes: number;
      averageRiskScore: number;
      criticalViolations: number;
      highViolations: number;
    };
  } {
    const results = modes.map(mode => this.validateMode(mode));
    
    const secureModes = results.filter(r => r.isSecure).length;
    const insecureModes = results.length - secureModes;
    const averageRiskScore = results.reduce((sum, r) => sum + r.riskScore, 0) / results.length;
    
    const allViolations = results.flatMap(r => r.violations);
    const criticalViolations = allViolations.filter(v => v.severity === 'critical').length;
    const highViolations = allViolations.filter(v => v.severity === 'high').length;

    return {
      results,
      summary: {
        totalModes: results.length,
        secureModes,
        insecureModes,
        averageRiskScore: Math.round(averageRiskScore * 10) / 10,
        criticalViolations,
        highViolations
      }
    };
  }
}