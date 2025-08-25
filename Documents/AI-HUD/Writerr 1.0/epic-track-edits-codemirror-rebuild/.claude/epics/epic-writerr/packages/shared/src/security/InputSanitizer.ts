/**
 * @fileoverview Comprehensive input sanitization and validation framework
 */

export interface SanitizationOptions {
  maxLength?: number;
  allowHtml?: boolean;
  allowScripts?: boolean;
  stripUrls?: boolean;
  allowTemplates?: boolean;
  contextType?: 'user-input' | 'system-prompt' | 'template' | 'yaml' | 'markdown';
}

export interface ValidationResult {
  isValid: boolean;
  sanitizedValue: string;
  violations: SecurityViolation[];
  riskScore: number;
}

export interface SecurityViolation {
  type: 'script-injection' | 'html-injection' | 'template-injection' | 'url-injection' | 'yaml-injection' | 'length-exceeded' | 'malicious-pattern';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  originalValue: string;
  position?: number;
}

export class InputSanitizer {
  private static readonly SCRIPT_PATTERNS = [
    /<script[^>]*>[\s\S]*?<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /eval\s*\(/gi,
    /Function\s*\(/gi,
    /setTimeout\s*\(/gi,
    /setInterval\s*\(/gi,
    /new\s+Function/gi,
    /document\.write/gi,
    /innerHTML/gi,
    /outerHTML/gi,
    /insertAdjacentHTML/gi
  ];

  private static readonly TEMPLATE_INJECTION_PATTERNS = [
    /\{\{\s*constructor/gi,
    /\{\{\s*__proto__/gi,
    /\{\{\s*prototype/gi,
    /\{\{\s*eval/gi,
    /\{\{\s*require/gi,
    /\{\{\s*process/gi,
    /\{\{\s*global/gi,
    /\{\{\s*window/gi,
    /\{\{\s*this\./gi,
    /\{\{.*\|\s*safe\s*\}\}/gi // Unsafe template filters
  ];

  private static readonly YAML_INJECTION_PATTERNS = [
    /!!python\/object/gi,
    /!!python\/apply/gi,
    /!!map/gi,
    /!!set/gi,
    /!!omap/gi,
    /!!pairs/gi,
    /!!js\/function/gi,
    /!!js\/regexp/gi,
    /&\s*[a-zA-Z_]+/g, // YAML anchors that could be malicious
    /<<\s*:/g // YAML merge keys
  ];

  private static readonly URL_PATTERNS = [
    /(https?|ftp|file):\/\/[^\s]+/gi,
    /data:[^;]+;base64,[A-Za-z0-9+/=]+/gi,
    /javascript:[^"'\s]+/gi
  ];

  private static readonly MALICIOUS_PATTERNS = [
    // Common XSS vectors
    /alert\s*\(/gi,
    /confirm\s*\(/gi,
    /prompt\s*\(/gi,
    
    // SQL injection patterns
    /union\s+select/gi,
    /drop\s+table/gi,
    /delete\s+from/gi,
    /insert\s+into/gi,
    /update\s+.*set/gi,
    
    // Command injection
    /\|\s*[a-z]/gi,
    /&&\s*[a-z]/gi,
    /;\s*[a-z]/gi,
    /`[^`]*`/gi,
    /\$\([^)]*\)/gi,
    
    // Path traversal
    /\.\.\//gi,
    /\.\.\\\\'/gi,
    /%2e%2e/gi,
    
    // Prototype pollution
    /__proto__/gi,
    /constructor\.prototype/gi,
    
    // Node.js specific
    /require\s*\(/gi,
    /process\.env/gi,
    /fs\./gi,
    /child_process/gi
  ];

  /**
   * Sanitize and validate input based on context
   */
  static sanitize(
    input: string, 
    options: SanitizationOptions = {}
  ): ValidationResult {
    const violations: SecurityViolation[] = [];
    let sanitizedValue = input;
    let riskScore = 0;

    // Set defaults based on context
    const contextDefaults = this.getContextDefaults(options.contextType || 'user-input');
    const finalOptions = { ...contextDefaults, ...options };

    // Length validation
    if (finalOptions.maxLength && input.length > finalOptions.maxLength) {
      violations.push({
        type: 'length-exceeded',
        severity: 'medium',
        description: `Input exceeds maximum length of ${finalOptions.maxLength} characters`,
        originalValue: input.substring(0, 100) + '...'
      });
      sanitizedValue = sanitizedValue.substring(0, finalOptions.maxLength);
      riskScore += 20;
    }

    // Script injection detection and sanitization
    if (!finalOptions.allowScripts) {
      const scriptViolations = this.detectPatterns(
        sanitizedValue,
        this.SCRIPT_PATTERNS,
        'script-injection',
        'critical'
      );
      violations.push(...scriptViolations);
      sanitizedValue = this.removePatterns(sanitizedValue, this.SCRIPT_PATTERNS);
      riskScore += scriptViolations.length * 50;
    }

    // HTML injection detection
    if (!finalOptions.allowHtml) {
      const htmlViolations = this.detectHtmlInjection(sanitizedValue);
      violations.push(...htmlViolations);
      sanitizedValue = this.sanitizeHtml(sanitizedValue);
      riskScore += htmlViolations.length * 30;
    }

    // Template injection detection
    if (!finalOptions.allowTemplates || options.contextType === 'template') {
      const templateViolations = this.detectPatterns(
        sanitizedValue,
        this.TEMPLATE_INJECTION_PATTERNS,
        'template-injection',
        'high'
      );
      violations.push(...templateViolations);
      sanitizedValue = this.sanitizeTemplates(sanitizedValue, finalOptions.allowTemplates);
      riskScore += templateViolations.length * 40;
    }

    // YAML injection detection (for mode files)
    if (options.contextType === 'yaml') {
      const yamlViolations = this.detectPatterns(
        sanitizedValue,
        this.YAML_INJECTION_PATTERNS,
        'yaml-injection',
        'high'
      );
      violations.push(...yamlViolations);
      sanitizedValue = this.sanitizeYaml(sanitizedValue);
      riskScore += yamlViolations.length * 45;
    }

    // URL detection and handling
    if (finalOptions.stripUrls) {
      const urlViolations = this.detectPatterns(
        sanitizedValue,
        this.URL_PATTERNS,
        'url-injection',
        'medium'
      );
      violations.push(...urlViolations);
      sanitizedValue = this.removePatterns(sanitizedValue, this.URL_PATTERNS);
      riskScore += urlViolations.length * 25;
    }

    // General malicious pattern detection
    const maliciousViolations = this.detectPatterns(
      sanitizedValue,
      this.MALICIOUS_PATTERNS,
      'malicious-pattern',
      'high'
    );
    violations.push(...maliciousViolations);
    sanitizedValue = this.removePatterns(sanitizedValue, this.MALICIOUS_PATTERNS);
    riskScore += maliciousViolations.length * 35;

    // Context-specific validation
    if (options.contextType) {
      const contextViolations = this.validateContext(sanitizedValue, options.contextType);
      violations.push(...contextViolations);
      riskScore += contextViolations.length * 20;
    }

    const isValid = violations.filter(v => v.severity === 'critical' || v.severity === 'high').length === 0;

    return {
      isValid,
      sanitizedValue,
      violations,
      riskScore: Math.min(riskScore, 100)
    };
  }

  /**
   * Get default sanitization options based on context type
   */
  private static getContextDefaults(contextType: string): SanitizationOptions {
    switch (contextType) {
      case 'user-input':
        return {
          maxLength: 10000,
          allowHtml: false,
          allowScripts: false,
          stripUrls: false,
          allowTemplates: false
        };
      case 'system-prompt':
        return {
          maxLength: 50000,
          allowHtml: false,
          allowScripts: false,
          stripUrls: false,
          allowTemplates: true
        };
      case 'template':
        return {
          maxLength: 20000,
          allowHtml: false,
          allowScripts: false,
          stripUrls: false,
          allowTemplates: true
        };
      case 'yaml':
        return {
          maxLength: 5000,
          allowHtml: false,
          allowScripts: false,
          stripUrls: true,
          allowTemplates: false
        };
      case 'markdown':
        return {
          maxLength: 100000,
          allowHtml: true,
          allowScripts: false,
          stripUrls: false,
          allowTemplates: true
        };
      default:
        return {
          maxLength: 5000,
          allowHtml: false,
          allowScripts: false,
          stripUrls: true,
          allowTemplates: false
        };
    }
  }

  /**
   * Detect patterns in input
   */
  private static detectPatterns(
    input: string,
    patterns: RegExp[],
    violationType: SecurityViolation['type'],
    severity: SecurityViolation['severity']
  ): SecurityViolation[] {
    const violations: SecurityViolation[] = [];

    for (const pattern of patterns) {
      const matches = input.match(pattern);
      if (matches) {
        for (const match of matches) {
          violations.push({
            type: violationType,
            severity,
            description: `Detected ${violationType.replace('-', ' ')}: ${match.substring(0, 50)}${match.length > 50 ? '...' : ''}`,
            originalValue: match,
            position: input.indexOf(match)
          });
        }
      }
    }

    return violations;
  }

  /**
   * Detect HTML injection attempts
   */
  private static detectHtmlInjection(input: string): SecurityViolation[] {
    const violations: SecurityViolation[] = [];
    const htmlTags = /<[^>]+>/g;
    const matches = input.match(htmlTags);

    if (matches) {
      for (const match of matches) {
        // Check for dangerous attributes
        if (/\s+(on\w+|src|href|action|formaction|data|style)\s*=/i.test(match)) {
          violations.push({
            type: 'html-injection',
            severity: 'high',
            description: `Potentially dangerous HTML tag: ${match}`,
            originalValue: match,
            position: input.indexOf(match)
          });
        }
        // Check for script tags
        else if (/<(script|iframe|object|embed|link|meta|base|form)/i.test(match)) {
          violations.push({
            type: 'html-injection',
            severity: 'critical',
            description: `Dangerous HTML tag: ${match}`,
            originalValue: match,
            position: input.indexOf(match)
          });
        }
      }
    }

    return violations;
  }

  /**
   * Context-specific validation
   */
  private static validateContext(input: string, contextType: string): SecurityViolation[] {
    const violations: SecurityViolation[] = [];

    switch (contextType) {
      case 'yaml':
        // Check for YAML bombs (deeply nested structures)
        const depth = this.calculateYamlDepth(input);
        if (depth > 10) {
          violations.push({
            type: 'yaml-injection',
            severity: 'high',
            description: `YAML structure too deeply nested (depth: ${depth})`,
            originalValue: input.substring(0, 100)
          });
        }
        break;

      case 'template':
        // Check for template complexity
        const templateComplexity = this.calculateTemplateComplexity(input);
        if (templateComplexity > 50) {
          violations.push({
            type: 'template-injection',
            severity: 'medium',
            description: `Template too complex (complexity: ${templateComplexity})`,
            originalValue: input.substring(0, 100)
          });
        }
        break;

      case 'system-prompt':
        // Check for prompt injection attempts
        const promptInjections = this.detectPromptInjection(input);
        violations.push(...promptInjections);
        break;
    }

    return violations;
  }

  /**
   * Calculate YAML nesting depth
   */
  private static calculateYamlDepth(yaml: string): number {
    const lines = yaml.split('\n');
    let maxDepth = 0;
    
    for (const line of lines) {
      const trimmed = line.trimStart();
      if (trimmed && !trimmed.startsWith('#')) {
        const indentLevel = (line.length - trimmed.length) / 2; // Assuming 2-space indents
        maxDepth = Math.max(maxDepth, indentLevel);
      }
    }
    
    return maxDepth;
  }

  /**
   * Calculate template complexity
   */
  private static calculateTemplateComplexity(template: string): number {
    let complexity = 0;
    complexity += (template.match(/\{\{/g) || []).length; // Template variables
    complexity += (template.match(/\{%/g) || []).length * 2; // Template logic
    complexity += (template.match(/\|\s*\w+/g) || []).length; // Template filters
    complexity += (template.match(/if|for|while|loop/gi) || []).length * 3; // Control structures
    return complexity;
  }

  /**
   * Detect prompt injection attempts
   */
  private static detectPromptInjection(input: string): SecurityViolation[] {
    const violations: SecurityViolation[] = [];
    const injectionPatterns = [
      /ignore\s+(all\s+)?(previous|above|system|initial)\s+(instructions?|prompts?|rules?|commands?)/gi,
      /forget\s+(everything|all|your|the)\s+(above|previous|instructions?)/gi,
      /new\s+(instructions?|rules?|system\s+prompt)/gi,
      /act\s+as\s+(if\s+you\s+are|a\s+different|another)/gi,
      /pretend\s+(you\s+are|to\s+be)/gi,
      /roleplay\s+as/gi,
      /simulate\s+(being|a)/gi,
      /override\s+(your|the)\s+(settings?|parameters?|instructions?)/gi
    ];

    for (const pattern of injectionPatterns) {
      const matches = input.match(pattern);
      if (matches) {
        for (const match of matches) {
          violations.push({
            type: 'template-injection',
            severity: 'high',
            description: `Potential prompt injection: ${match}`,
            originalValue: match,
            position: input.indexOf(match)
          });
        }
      }
    }

    return violations;
  }

  /**
   * Remove patterns from input
   */
  private static removePatterns(input: string, patterns: RegExp[]): string {
    let result = input;
    for (const pattern of patterns) {
      result = result.replace(pattern, '');
    }
    return result;
  }

  /**
   * Sanitize HTML content
   */
  private static sanitizeHtml(input: string): string {
    // Remove all HTML tags except safe ones
    const safeTags = ['p', 'br', 'strong', 'em', 'u', 'strike', 'ul', 'ol', 'li', 'blockquote', 'code', 'pre'];
    const tagPattern = /<\/?([a-zA-Z0-9]+)(?:\s+[^>]*)?>/g;
    
    return input.replace(tagPattern, (match, tagName) => {
      if (safeTags.includes(tagName.toLowerCase())) {
        // Keep safe tags but remove all attributes
        const isClosing = match.startsWith('</');
        return `<${isClosing ? '/' : ''}${tagName.toLowerCase()}>`;
      }
      return ''; // Remove unsafe tags
    });
  }

  /**
   * Sanitize template content
   */
  private static sanitizeTemplates(input: string, allowTemplates: boolean = false): string {
    if (!allowTemplates) {
      // Remove all template expressions
      return input.replace(/\{\{[^}]*\}\}/g, '');
    } else {
      // Sanitize template expressions but keep safe ones
      return input.replace(/\{\{([^}]*)\}\}/g, (match, content) => {
        // Only allow simple variable access and safe filters
        const safePattern = /^[\w\.\s\|]+$/;
        if (safePattern.test(content.trim())) {
          return match;
        }
        return '{{SANITIZED}}';
      });
    }
  }

  /**
   * Sanitize YAML content
   */
  private static sanitizeYaml(input: string): string {
    // Remove dangerous YAML constructs
    let result = input;
    
    // Remove YAML tags that could be dangerous
    result = result.replace(/!![\w\/]+/g, '');
    
    // Remove YAML anchors and aliases
    result = result.replace(/&[\w\-_]+/g, '');
    result = result.replace(/\*[\w\-_]+/g, '');
    
    // Remove YAML merge keys
    result = result.replace(/<<\s*:/g, ':');
    
    return result;
  }

  /**
   * Generate security report
   */
  static generateSecurityReport(results: ValidationResult[]): string {
    const totalInputs = results.length;
    const invalidInputs = results.filter(r => !r.isValid).length;
    const averageRiskScore = results.reduce((sum, r) => sum + r.riskScore, 0) / totalInputs;
    
    const violationsByType = results
      .flatMap(r => r.violations)
      .reduce((acc, v) => {
        acc[v.type] = (acc[v.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    const violationsBySeverity = results
      .flatMap(r => r.violations)
      .reduce((acc, v) => {
        acc[v.severity] = (acc[v.severity] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    return `# Security Sanitization Report

## Summary
- Total Inputs Processed: ${totalInputs}
- Invalid Inputs Detected: ${invalidInputs} (${((invalidInputs/totalInputs)*100).toFixed(1)}%)
- Average Risk Score: ${averageRiskScore.toFixed(1)}/100

## Violations by Type
${Object.entries(violationsByType).map(([type, count]) => 
  `- ${type.replace('-', ' ')}: ${count}`
).join('\n')}

## Violations by Severity
${Object.entries(violationsBySeverity).map(([severity, count]) => 
  `- ${severity.toUpperCase()}: ${count}`
).join('\n')}

## Recommendations
${invalidInputs > 0 ? 
  `- Review and fix ${invalidInputs} invalid inputs
- Implement additional validation for high-risk contexts
- Monitor for patterns in violation types` : 
  '- All inputs passed validation
- Continue monitoring for new threat patterns'}
`;
  }
}