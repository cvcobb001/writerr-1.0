/**
 * @fileoverview Comprehensive error handling and user-friendly messages
 */

import { Notice } from 'obsidian';
import { globalEventBus } from '@writerr/shared';
import {
  ParseError,
  ModeLoadEvent,
  ValidationResult
} from './types';

export class ModeErrorHandler {
  private errorCounts: Map<string, number> = new Map();
  private lastErrorTime: Map<string, number> = new Map();
  private readonly maxErrorsPerHour = 10;
  private readonly errorCooldownMs = 60000; // 1 minute
  private userNotifications: Set<string> = new Set();

  constructor() {
    this.setupEventListeners();
  }

  /**
   * Handle parsing errors with user-friendly messages
   */
  handleParseError(filePath: string, errors: ParseError[]): void {
    if (this.shouldSuppressErrors(filePath)) {
      return;
    }

    const errorMessages = this.formatParseErrors(errors);
    const fileName = this.extractFileName(filePath);
    
    // Log detailed errors for debugging
    console.error(`❌ Mode parsing errors in ${fileName}:`, errors);
    
    // Show user-friendly notification
    const severity = this.getHighestSeverity(errors);
    const message = this.generateUserFriendlyMessage(fileName, errors);
    
    this.showUserNotification(message, severity);
    
    // Update error tracking
    this.updateErrorTracking(filePath);
    
    // Emit error event
    globalEventBus.emit('mode-parse-error', {
      filePath,
      fileName,
      errors,
      message,
      severity
    }, 'writerr-chat');
  }

  /**
   * Handle validation errors
   */
  handleValidationError(modeId: string, validation: ValidationResult): void {
    if (!validation.isValid) {
      const fileName = `${modeId}.md`;
      
      console.error(`❌ Mode validation failed for ${modeId}:`, validation.errors);
      
      const message = this.generateValidationErrorMessage(modeId, validation);
      this.showUserNotification(message, 'error');
      
      globalEventBus.emit('mode-validation-error', {
        modeId,
        validation,
        message
      }, 'writerr-chat');
    }
    
    // Show warnings even for valid modes
    if (validation.warnings.length > 0) {
      const warningMessage = this.generateWarningMessage(modeId, validation.warnings);
      this.showUserNotification(warningMessage, 'warning');
    }
  }

  /**
   * Handle hot reload errors
   */
  handleHotReloadError(event: ModeLoadEvent): void {
    if (event.error) {
      const fileName = this.extractFileName(event.modeId);
      const message = this.generateHotReloadErrorMessage(fileName, event.error);
      
      console.error(`🔥 Hot reload error for ${fileName}:`, event.error);
      this.showUserNotification(message, 'error');
    }
  }

  /**
   * Handle mode loading errors
   */
  handleLoadError(filePath: string, error: Error): void {
    const fileName = this.extractFileName(filePath);
    
    console.error(`❌ Mode loading error for ${fileName}:`, error);
    
    const message = this.generateLoadErrorMessage(fileName, error);
    this.showUserNotification(message, 'error');
    
    this.updateErrorTracking(filePath);
  }

  /**
   * Handle mode registry errors
   */
  handleRegistryError(modeId: string, error: Error): void {
    console.error(`❌ Registry error for ${modeId}:`, error);
    
    const message = this.generateRegistryErrorMessage(modeId, error);
    this.showUserNotification(message, 'error');
  }

  /**
   * Handle template generation errors
   */
  handleTemplateError(templateId: string, errors: ParseError[]): void {
    console.error(`❌ Template generation errors for ${templateId}:`, errors);
    
    const message = this.generateTemplateErrorMessage(templateId, errors);
    const severity = this.getHighestSeverity(errors);
    
    this.showUserNotification(message, severity);
  }

  /**
   * Generate recovery suggestions
   */
  generateRecoverySuggestions(errors: ParseError[]): string[] {
    const suggestions: string[] = [];
    const errorTypes = new Set(errors.map(e => e.type));
    
    if (errorTypes.has('frontmatter')) {
      suggestions.push('Check YAML frontmatter syntax - ensure proper indentation and closing ---');
      suggestions.push('Validate YAML online at yamllint.com before saving');
    }
    
    if (errorTypes.has('validation')) {
      suggestions.push('Review required fields: id, name, version, description, makesEdits, promptConfig');
      suggestions.push('Check field formats - version should be X.Y.Z, ID should be lowercase with hyphens');
    }
    
    if (errorTypes.has('schema')) {
      suggestions.push('Ensure all configuration fields match the expected structure');
      suggestions.push('Refer to the mode documentation for correct field types');
    }
    
    if (errorTypes.has('syntax')) {
      suggestions.push('Check for typos and proper JSON/YAML syntax');
      suggestions.push('Ensure all quotes and brackets are properly closed');
    }
    
    // Always include general suggestions
    suggestions.push('Use the Mode Template system to generate valid mode structure');
    suggestions.push('Check existing working modes for reference');
    
    return suggestions;
  }

  /**
   * Show contextual help
   */
  showContextualHelp(errorType: ParseError['type']): void {
    let helpContent = '';
    
    switch (errorType) {
      case 'frontmatter':
        helpContent = this.getFrontmatterHelp();
        break;
      case 'validation':
        helpContent = this.getValidationHelp();
        break;
      case 'schema':
        helpContent = this.getSchemaHelp();
        break;
      case 'syntax':
        helpContent = this.getSyntaxHelp();
        break;
      default:
        helpContent = this.getGeneralHelp();
    }
    
    // In a real implementation, this would show help in a modal or panel
    console.info('📚 Help Content:', helpContent);
    
    globalEventBus.emit('mode-help-requested', {
      errorType,
      helpContent
    }, 'writerr-chat');
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    globalEventBus.on('mode-error', (event) => {
      const modeEvent = event.payload as ModeLoadEvent;
      this.handleHotReloadError(modeEvent);
    });
    
    globalEventBus.on('mode-parse-error', (event) => {
      const { filePath, errors } = event.payload;
      this.handleParseError(filePath, errors);
    });
  }

  /**
   * Format parse errors for display
   */
  private formatParseErrors(errors: ParseError[]): string[] {
    return errors.map(error => {
      let message = error.message;
      
      if (error.line) {
        message += ` (line ${error.line}`;
        if (error.column) {
          message += `, column ${error.column}`;
        }
        message += ')';
      }
      
      if (error.suggestion) {
        message += ` - ${error.suggestion}`;
      }
      
      return message;
    });
  }

  /**
   * Get highest severity from errors
   */
  private getHighestSeverity(errors: ParseError[]): 'error' | 'warning' | 'info' {
    if (errors.some(e => e.severity === 'error')) return 'error';
    if (errors.some(e => e.severity === 'warning')) return 'warning';
    return 'info';
  }

  /**
   * Generate user-friendly message
   */
  private generateUserFriendlyMessage(fileName: string, errors: ParseError[]): string {
    const errorCount = errors.filter(e => e.severity === 'error').length;
    const warningCount = errors.filter(e => e.severity === 'warning').length;
    
    let message = `Mode "${fileName}" has `;
    
    if (errorCount > 0) {
      message += `${errorCount} error${errorCount > 1 ? 's' : ''}`;
      if (warningCount > 0) {
        message += ` and ${warningCount} warning${warningCount > 1 ? 's' : ''}`;
      }
    } else {
      message += `${warningCount} warning${warningCount > 1 ? 's' : ''}`;
    }
    
    // Add most critical error message
    const criticalError = errors.find(e => e.severity === 'error');
    if (criticalError) {
      message += `\n\nMain issue: ${criticalError.message}`;
      if (criticalError.suggestion) {
        message += `\n💡 ${criticalError.suggestion}`;
      }
    }
    
    return message;
  }

  /**
   * Generate validation error message
   */
  private generateValidationErrorMessage(modeId: string, validation: ValidationResult): string {
    const errorCount = validation.errors.length;
    let message = `Mode "${modeId}" validation failed with ${errorCount} error${errorCount > 1 ? 's' : ''}:`;
    
    // Show first few errors
    const displayErrors = validation.errors.slice(0, 3);
    displayErrors.forEach(error => {
      message += `\n• ${error.message}`;
      if (error.suggestion) {
        message += ` (${error.suggestion})`;
      }
    });
    
    if (validation.errors.length > 3) {
      message += `\n... and ${validation.errors.length - 3} more issues`;
    }
    
    return message;
  }

  /**
   * Generate warning message
   */
  private generateWarningMessage(modeId: string, warnings: ParseError[]): string {
    const warningCount = warnings.length;
    let message = `Mode "${modeId}" loaded with ${warningCount} warning${warningCount > 1 ? 's' : ''}:`;
    
    warnings.slice(0, 2).forEach(warning => {
      message += `\n• ${warning.message}`;
    });
    
    if (warnings.length > 2) {
      message += `\n... and ${warnings.length - 2} more warnings`;
    }
    
    return message;
  }

  /**
   * Generate hot reload error message
   */
  private generateHotReloadErrorMessage(fileName: string, error: ParseError): string {
    return `Hot reload failed for "${fileName}": ${error.message}${
      error.suggestion ? `\n💡 ${error.suggestion}` : ''
    }`;
  }

  /**
   * Generate load error message
   */
  private generateLoadErrorMessage(fileName: string, error: Error): string {
    let message = `Failed to load mode "${fileName}": ${error.message}`;
    
    // Add specific guidance based on error type
    if (error.message.includes('YAML')) {
      message += '\n💡 Check your YAML frontmatter syntax';
    } else if (error.message.includes('validation')) {
      message += '\n💡 Review required fields and their formats';
    } else if (error.message.includes('not found')) {
      message += '\n💡 Ensure the file exists and is accessible';
    }
    
    return message;
  }

  /**
   * Generate registry error message
   */
  private generateRegistryErrorMessage(modeId: string, error: Error): string {
    return `Failed to register mode "${modeId}": ${error.message}`;
  }

  /**
   * Generate template error message
   */
  private generateTemplateErrorMessage(templateId: string, errors: ParseError[]): string {
    const errorCount = errors.filter(e => e.severity === 'error').length;
    let message = `Template "${templateId}" generation failed`;
    
    if (errorCount > 0) {
      message += ` with ${errorCount} error${errorCount > 1 ? 's' : ''}:`;
      const mainError = errors.find(e => e.severity === 'error');
      if (mainError) {
        message += `\n${mainError.message}`;
        if (mainError.suggestion) {
          message += `\n💡 ${mainError.suggestion}`;
        }
      }
    }
    
    return message;
  }

  /**
   * Show user notification
   */
  private showUserNotification(message: string, severity: 'error' | 'warning' | 'info'): void {
    // Prevent spam by tracking recent notifications
    const messageKey = message.substring(0, 50);
    const now = Date.now();
    const lastShown = this.lastErrorTime.get(messageKey) || 0;
    
    if (now - lastShown < this.errorCooldownMs) {
      return;
    }
    
    this.lastErrorTime.set(messageKey, now);
    
    // Show Obsidian notice
    new Notice(message, severity === 'error' ? 8000 : 5000);
    
    // Log to console with appropriate level
    switch (severity) {
      case 'error':
        console.error('🚨', message);
        break;
      case 'warning':
        console.warn('⚠️', message);
        break;
      case 'info':
        console.info('ℹ️', message);
        break;
    }
  }

  /**
   * Should suppress errors to prevent spam
   */
  private shouldSuppressErrors(filePath: string): boolean {
    const now = Date.now();
    const hourAgo = now - (60 * 60 * 1000);
    
    const errorCount = this.errorCounts.get(filePath) || 0;
    const lastError = this.lastErrorTime.get(filePath) || 0;
    
    // Reset count if more than an hour has passed
    if (lastError < hourAgo) {
      this.errorCounts.set(filePath, 0);
      return false;
    }
    
    return errorCount >= this.maxErrorsPerHour;
  }

  /**
   * Update error tracking
   */
  private updateErrorTracking(filePath: string): void {
    const count = this.errorCounts.get(filePath) || 0;
    this.errorCounts.set(filePath, count + 1);
    this.lastErrorTime.set(filePath, Date.now());
  }

  /**
   * Extract file name from path
   */
  private extractFileName(filePath: string): string {
    return filePath.split('/').pop()?.replace(/\.[^.]+$/, '') || filePath;
  }

  // Help content methods
  private getFrontmatterHelp(): string {
    return `
# YAML Frontmatter Help

Mode files must start with YAML frontmatter enclosed in \`---\` markers:

\`\`\`yaml
---
id: my-mode
name: "My Custom Mode"
version: "1.0.0"
description: "Description of what this mode does"
makesEdits: false
promptConfig:
  systemPrompt: "You are a helpful assistant"
  userPromptTemplate: "{{userInput}}"
  contextInjection:
    includeDocument: true
    includeSelection: true
---
\`\`\`

## Common Issues:
- Missing closing \`---\`
- Incorrect indentation (use spaces, not tabs)
- Unquoted special characters
- Missing required fields
`;
  }

  private getValidationHelp(): string {
    return `
# Mode Validation Help

## Required Fields:
- \`id\`: Unique identifier (lowercase, hyphens/underscores only)
- \`name\`: Display name (quoted if contains spaces)
- \`version\`: Semantic version (e.g., "1.0.0")
- \`description\`: Brief description of the mode
- \`makesEdits\`: Boolean (true/false)
- \`promptConfig\`: Object with systemPrompt and userPromptTemplate

## Field Formats:
- ID: \`my-mode-name\` (no spaces, start with letter)
- Version: \`1.2.3\` (major.minor.patch)
- Boolean: \`true\` or \`false\` (no quotes)
- Strings with spaces: Use quotes

## Example:
\`\`\`yaml
id: writing-helper
name: "Writing Helper"
version: "1.0.0"
makesEdits: true
\`\`\`
`;
  }

  private getSchemaHelp(): string {
    return `
# Mode Schema Help

Modes support the following configuration structure:

## Basic Configuration:
- \`id\`, \`name\`, \`version\`, \`description\`, \`author\`
- \`tags\` (array), \`icon\`, \`color\`
- \`makesEdits\` (boolean)

## Track Edits (for editing modes):
\`\`\`yaml
trackEdits:
  enabled: true
  editType: "style"  # structural, style, grammar, creative, mixed
  clusteringStrategy: "proximity"  # proximity, category, ml-inspired
\`\`\`

## Prompt Configuration:
\`\`\`yaml
promptConfig:
  systemPrompt: "Instructions for the AI"
  userPromptTemplate: "Template with {{userInput}}"
  contextInjection:
    includeDocument: true
    includeSelection: true
\`\`\`

## Model Preferences (optional):
\`\`\`yaml
modelPreferences:
  temperature: 0.7
  maxTokens: 2000
\`\`\`
`;
  }

  private getSyntaxHelp(): string {
    return `
# Syntax Help

## YAML Syntax Rules:
1. Use spaces for indentation (2 spaces per level)
2. Quote strings with special characters or spaces
3. Boolean values: \`true\`/\`false\` (no quotes)
4. Numbers: No quotes needed
5. Arrays: Use \`-\` prefix or \`[item1, item2]\`

## Common Syntax Errors:
- Using tabs instead of spaces
- Missing quotes around strings with colons
- Inconsistent indentation
- Missing space after colon
- Unclosed quotes or brackets

## Template Variables:
Use \`{{variableName}}\` for dynamic content:
- \`{{userInput}}\`: User's message
- \`{{document}}\`: Current document content
- \`{{selection}}\`: Selected text

## Testing YAML:
Copy your YAML to yamllint.com to check syntax before saving.
`;
  }

  private getGeneralHelp(): string {
    return `
# Mode Creation Help

## Quick Start:
1. Use the Template System to generate a valid mode structure
2. Copy from existing working modes as reference
3. Start simple and add features incrementally

## Best Practices:
- Test modes with simple examples first
- Keep system prompts clear and specific
- Use descriptive IDs and names
- Include helpful descriptions
- Set appropriate context inclusion settings

## Debugging:
- Check the developer console for detailed error messages
- Validate YAML syntax online before saving
- Compare with working mode files
- Use template system for complex configurations

## Getting Help:
- Review existing core modes for examples
- Check the Writerr documentation
- Use incremental approach - add one feature at a time
`;
  }

  /**
   * Get error statistics
   */
  getErrorStatistics(): {
    totalErrors: number;
    errorsByFile: Record<string, number>;
    recentErrors: number;
    suppressedErrors: number;
  } {
    const now = Date.now();
    const hourAgo = now - (60 * 60 * 1000);
    
    let totalErrors = 0;
    let recentErrors = 0;
    let suppressedErrors = 0;
    const errorsByFile: Record<string, number> = {};
    
    this.errorCounts.forEach((count, filePath) => {
      totalErrors += count;
      errorsByFile[filePath] = count;
      
      const lastError = this.lastErrorTime.get(filePath) || 0;
      if (lastError > hourAgo) {
        recentErrors += count;
        if (count >= this.maxErrorsPerHour) {
          suppressedErrors++;
        }
      }
    });
    
    return {
      totalErrors,
      errorsByFile,
      recentErrors,
      suppressedErrors
    };
  }

  /**
   * Reset error tracking
   */
  resetErrorTracking(): void {
    this.errorCounts.clear();
    this.lastErrorTime.clear();
    this.userNotifications.clear();
    console.log('🔄 Error tracking reset');
  }
}