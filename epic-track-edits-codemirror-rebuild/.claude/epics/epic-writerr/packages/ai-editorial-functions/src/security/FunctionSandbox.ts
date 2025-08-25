/**
 * @fileoverview Function execution sandbox for user-generated editorial functions
 */

import { InputSanitizer, ValidationResult } from '@writerr/shared/security/InputSanitizer';
import { FunctionDefinition, FunctionExecution } from '../types';

export interface SandboxConfig {
  maxExecutionTime: number;
  maxMemoryUsage: number;
  maxOutputLength: number;
  allowedAPIs: string[];
  allowedImports: string[];
  enableNetworkAccess: boolean;
  enableFileSystemAccess: boolean;
  enableProcessAccess: boolean;
}

export interface SandboxResult {
  success: boolean;
  output: string;
  confidence?: number;
  executionTime: number;
  memoryUsage: number;
  violations: SecurityViolation[];
  errors: string[];
}

export interface SecurityViolation {
  type: 'api-access' | 'resource-limit' | 'network-access' | 'file-access' | 'process-access' | 'dangerous-operation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  action: 'blocked' | 'logged' | 'terminated';
}

export class FunctionSandbox {
  private config: SandboxConfig;
  private activeExecutions = new Map<string, NodeJS.Timeout>();

  constructor(config: Partial<SandboxConfig> = {}) {
    this.config = {
      maxExecutionTime: 30000, // 30 seconds
      maxMemoryUsage: 50 * 1024 * 1024, // 50MB
      maxOutputLength: 100000, // 100KB
      allowedAPIs: [
        'String',
        'Array',
        'Object',
        'Math',
        'Date',
        'RegExp',
        'JSON',
        'Number',
        'Boolean'
      ],
      allowedImports: [],
      enableNetworkAccess: false,
      enableFileSystemAccess: false,
      enableProcessAccess: false,
      ...config
    };
  }

  /**
   * Execute a function safely within the sandbox
   */
  async executeFunction(
    functionDef: FunctionDefinition,
    input: string,
    context: Record<string, any> = {}
  ): Promise<SandboxResult> {
    const executionId = this.generateExecutionId();
    const startTime = Date.now();
    const startMemory = this.getMemoryUsage();
    
    const result: SandboxResult = {
      success: false,
      output: '',
      executionTime: 0,
      memoryUsage: 0,
      violations: [],
      errors: []
    };

    try {
      // Pre-execution validation
      const validationResult = await this.validateFunction(functionDef);
      if (!validationResult.isValid) {
        result.violations.push(...this.convertToSecurityViolations(validationResult));
        result.errors.push('Function failed pre-execution validation');
        return result;
      }

      // Sanitize input
      const inputValidation = InputSanitizer.sanitize(input, {
        contextType: 'user-input',
        maxLength: 10000
      });
      
      if (!inputValidation.isValid) {
        result.violations.push(...this.convertToSecurityViolations(inputValidation));
        result.errors.push('Input failed sanitization');
        return result;
      }

      // Create sandboxed execution environment
      const sandboxedFunction = this.createSandboxedFunction(functionDef);
      const sanitizedInput = inputValidation.sanitizedValue;
      const sandboxedContext = this.sanitizeContext(context);

      // Set execution timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        const timeout = setTimeout(() => {
          result.violations.push({
            type: 'resource-limit',
            severity: 'high',
            description: `Function execution timeout after ${this.config.maxExecutionTime}ms`,
            action: 'terminated'
          });
          reject(new Error('Execution timeout'));
        }, this.config.maxExecutionTime);
        
        this.activeExecutions.set(executionId, timeout);
      });

      // Execute with monitoring
      const executionPromise = this.executeWithMonitoring(
        sandboxedFunction,
        sanitizedInput,
        sandboxedContext,
        result
      );

      // Race between execution and timeout
      const output = await Promise.race([executionPromise, timeoutPromise]);
      
      // Validate output
      const outputValidation = InputSanitizer.sanitize(output, {
        contextType: 'user-input',
        maxLength: this.config.maxOutputLength
      });

      if (!outputValidation.isValid) {
        result.violations.push(...this.convertToSecurityViolations(outputValidation));
        result.output = outputValidation.sanitizedValue;
      } else {
        result.output = output;
      }

      result.success = true;
      
    } catch (error) {
      result.errors.push((error as Error).message);
      
      // Classify error type for security analysis
      const errorMessage = (error as Error).message.toLowerCase();
      if (errorMessage.includes('timeout')) {
        result.violations.push({
          type: 'resource-limit',
          severity: 'high',
          description: 'Function execution timed out',
          action: 'terminated'
        });
      } else if (errorMessage.includes('memory')) {
        result.violations.push({
          type: 'resource-limit',
          severity: 'high',
          description: 'Function exceeded memory limits',
          action: 'terminated'
        });
      } else {
        result.violations.push({
          type: 'dangerous-operation',
          severity: 'medium',
          description: `Function execution error: ${(error as Error).message}`,
          action: 'terminated'
        });
      }
    } finally {
      // Clean up
      const timeout = this.activeExecutions.get(executionId);
      if (timeout) {
        clearTimeout(timeout);
        this.activeExecutions.delete(executionId);
      }
      
      // Calculate execution metrics
      result.executionTime = Date.now() - startTime;
      result.memoryUsage = this.getMemoryUsage() - startMemory;
    }

    return result;
  }

  /**
   * Validate function definition before execution
   */
  private async validateFunction(functionDef: FunctionDefinition): Promise<ValidationResult> {
    const violations: any[] = [];

    // Validate system prompt
    const systemPromptResult = InputSanitizer.sanitize(
      functionDef.parsedContent.systemPrompt,
      { contextType: 'system-prompt' }
    );
    violations.push(...systemPromptResult.violations);

    // Validate user prompt template
    if (functionDef.parsedContent.userPrompt) {
      const userPromptResult = InputSanitizer.sanitize(
        functionDef.parsedContent.userPrompt,
        { contextType: 'template' }
      );
      violations.push(...userPromptResult.violations);
    }

    // Validate preprocessing and postprocessing scripts
    if (functionDef.parsedContent.preprocessing) {
      const preprocessResult = this.validateScript(functionDef.parsedContent.preprocessing);
      violations.push(...preprocessResult);
    }

    if (functionDef.parsedContent.postprocessing) {
      const postprocessResult = this.validateScript(functionDef.parsedContent.postprocessing);
      violations.push(...postprocessResult);
    }

    // Check function constraints
    if (functionDef.constraints) {
      const constraintViolations = this.validateConstraints(functionDef.constraints);
      violations.push(...constraintViolations);
    }

    return {
      isValid: violations.filter(v => v.severity === 'critical' || v.severity === 'high').length === 0,
      sanitizedValue: functionDef.parsedContent.systemPrompt,
      violations,
      riskScore: Math.min(violations.length * 10, 100)
    };
  }

  /**
   * Validate script content for dangerous operations
   */
  private validateScript(script: string): SecurityViolation[] {
    const violations: SecurityViolation[] = [];
    
    // Check for dangerous function calls
    const dangerousFunctions = [
      'eval', 'Function', 'setTimeout', 'setInterval', 'require',
      'import', 'process', 'global', 'window', 'document',
      'XMLHttpRequest', 'fetch', 'WebSocket', 'EventSource'
    ];

    for (const func of dangerousFunctions) {
      const pattern = new RegExp(`\\b${func}\\b`, 'gi');
      if (pattern.test(script)) {
        violations.push({
          type: 'dangerous-operation',
          severity: 'critical',
          description: `Dangerous function call detected: ${func}`,
          action: 'blocked'
        });
      }
    }

    // Check for file system access
    const fsPatterns = [
      /require\s*\(\s*['"`]fs['"`]\s*\)/gi,
      /import.*from\s*['"`]fs['"`]/gi,
      /\.readFile|\.writeFile|\.unlink|\.mkdir/gi
    ];

    for (const pattern of fsPatterns) {
      if (pattern.test(script)) {
        violations.push({
          type: 'file-access',
          severity: 'high',
          description: 'File system access detected',
          action: 'blocked'
        });
      }
    }

    // Check for network access
    const networkPatterns = [
      /require\s*\(\s*['"`](http|https|net|url)['"`]\s*\)/gi,
      /import.*from\s*['"`](http|https|net|url)['"`]/gi,
      /fetch\s*\(/gi,
      /XMLHttpRequest/gi,
      /\.get\s*\(|\.post\s*\(|\.put\s*\(|\.delete\s*\(/gi
    ];

    for (const pattern of networkPatterns) {
      if (pattern.test(script)) {
        violations.push({
          type: 'network-access',
          severity: 'high',
          description: 'Network access detected',
          action: 'blocked'
        });
      }
    }

    return violations;
  }

  /**
   * Validate function constraints
   */
  private validateConstraints(constraints: any): SecurityViolation[] {
    const violations: SecurityViolation[] = [];

    // Check execution timeout
    if (constraints.executionTimeout > this.config.maxExecutionTime) {
      violations.push({
        type: 'resource-limit',
        severity: 'medium',
        description: `Execution timeout exceeds maximum allowed: ${constraints.executionTimeout}ms`,
        action: 'blocked'
      });
    }

    // Check memory limit
    if (constraints.memoryLimit > this.config.maxMemoryUsage) {
      violations.push({
        type: 'resource-limit',
        severity: 'medium',
        description: `Memory limit exceeds maximum allowed: ${constraints.memoryLimit} bytes`,
        action: 'blocked'
      });
    }

    // Check forbidden phrases
    if (constraints.forbiddenPhrases?.length > 100) {
      violations.push({
        type: 'resource-limit',
        severity: 'low',
        description: 'Too many forbidden phrases defined',
        action: 'logged'
      });
    }

    return violations;
  }

  /**
   * Create a sandboxed version of the function
   */
  private createSandboxedFunction(functionDef: FunctionDefinition): Function {
    // This would create a restricted execution environment
    // For now, return a mock that simulates AI provider interaction
    return async (input: string, context: Record<string, any>) => {
      // Simulate function execution by processing with AI
      // In real implementation, this would use the AI Providers integration
      // but with restricted capabilities
      
      const processedInput = this.processWithTemplate(
        functionDef.parsedContent.systemPrompt,
        input,
        context
      );

      // Simulate AI response (in production, this calls AI provider)
      const mockResponse = `Processed: ${processedInput.substring(0, 100)}...`;
      
      return mockResponse;
    };
  }

  /**
   * Process input with template
   */
  private processWithTemplate(template: string, input: string, context: Record<string, any>): string {
    let processed = template;
    
    // Replace template variables safely
    const templateVars = {
      input,
      document: context.document || '',
      selection: context.selection || input,
      userInput: input,
      ...context
    };

    for (const [key, value] of Object.entries(templateVars)) {
      const pattern = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
      processed = processed.replace(pattern, String(value));
    }

    return processed;
  }

  /**
   * Execute function with resource monitoring
   */
  private async executeWithMonitoring(
    sandboxedFunction: Function,
    input: string,
    context: Record<string, any>,
    result: SandboxResult
  ): Promise<string> {
    const memoryCheckInterval = 1000; // Check memory every second
    const memoryChecker = setInterval(() => {
      const currentMemory = this.getMemoryUsage();
      if (currentMemory > this.config.maxMemoryUsage) {
        result.violations.push({
          type: 'resource-limit',
          severity: 'high',
          description: `Memory usage exceeded: ${currentMemory} bytes`,
          action: 'terminated'
        });
        clearInterval(memoryChecker);
        throw new Error('Memory limit exceeded');
      }
    }, memoryCheckInterval);

    try {
      const output = await sandboxedFunction(input, context);
      clearInterval(memoryChecker);
      return String(output);
    } catch (error) {
      clearInterval(memoryChecker);
      throw error;
    }
  }

  /**
   * Sanitize execution context
   */
  private sanitizeContext(context: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(context)) {
      if (typeof value === 'string') {
        const validation = InputSanitizer.sanitize(value, { contextType: 'user-input' });
        sanitized[key] = validation.sanitizedValue;
      } else if (typeof value === 'number' || typeof value === 'boolean') {
        sanitized[key] = value;
      } else if (Array.isArray(value)) {
        sanitized[key] = value.map(item => 
          typeof item === 'string' 
            ? InputSanitizer.sanitize(item, { contextType: 'user-input' }).sanitizedValue
            : item
        );
      }
      // Skip objects and functions for security
    }
    
    return sanitized;
  }

  /**
   * Convert validation result to security violations
   */
  private convertToSecurityViolations(validation: ValidationResult): SecurityViolation[] {
    return validation.violations.map(violation => ({
      type: this.mapViolationType(violation.type),
      severity: violation.severity,
      description: violation.description,
      action: violation.severity === 'critical' ? 'blocked' : 'logged'
    }));
  }

  /**
   * Map input sanitizer violation types to sandbox violation types
   */
  private mapViolationType(type: string): SecurityViolation['type'] {
    switch (type) {
      case 'script-injection':
      case 'html-injection':
      case 'template-injection':
      case 'yaml-injection':
        return 'dangerous-operation';
      case 'url-injection':
        return 'network-access';
      case 'length-exceeded':
        return 'resource-limit';
      default:
        return 'dangerous-operation';
    }
  }

  /**
   * Get current memory usage
   */
  private getMemoryUsage(): number {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      return process.memoryUsage().heapUsed;
    }
    return 0; // Fallback for browser environments
  }

  /**
   * Generate unique execution ID
   */
  private generateExecutionId(): string {
    return `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Update sandbox configuration
   */
  updateConfig(config: Partial<SandboxConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current sandbox configuration
   */
  getConfig(): SandboxConfig {
    return { ...this.config };
  }

  /**
   * Generate sandbox security report
   */
  generateSecurityReport(results: SandboxResult[]): string {
    const totalExecutions = results.length;
    const failedExecutions = results.filter(r => !r.success).length;
    const averageExecutionTime = results.reduce((sum, r) => sum + r.executionTime, 0) / totalExecutions;
    
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

    return `# Function Sandbox Security Report

## Execution Summary
- Total Executions: ${totalExecutions}
- Failed Executions: ${failedExecutions} (${((failedExecutions/totalExecutions)*100).toFixed(1)}%)
- Average Execution Time: ${averageExecutionTime.toFixed(2)}ms

## Security Violations by Type
${Object.entries(violationsByType).map(([type, count]) => 
  `- ${type.replace('-', ' ')}: ${count}`
).join('\n')}

## Violations by Severity
${Object.entries(violationsBySeverity).map(([severity, count]) => 
  `- ${severity.toUpperCase()}: ${count}`
).join('\n')}

## Resource Utilization
- Max Execution Time: ${this.config.maxExecutionTime}ms
- Max Memory Usage: ${(this.config.maxMemoryUsage / 1024 / 1024).toFixed(1)}MB
- Network Access: ${this.config.enableNetworkAccess ? 'Enabled' : 'Disabled'}
- File System Access: ${this.config.enableFileSystemAccess ? 'Enabled' : 'Disabled'}

## Recommendations
${failedExecutions > 0 ? 
  `- Review ${failedExecutions} failed executions for security issues
- Consider tightening sandbox restrictions for high-risk functions
- Implement additional monitoring for resource usage patterns` : 
  '- All function executions completed successfully
- Continue monitoring for security violations
- Consider periodic security audits of user-generated functions'}
`;
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    // Cancel any active executions
    this.activeExecutions.forEach(timeout => clearTimeout(timeout));
    this.activeExecutions.clear();
  }
}