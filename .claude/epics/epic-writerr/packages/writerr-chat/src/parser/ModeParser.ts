/**
 * @fileoverview Mode definition parser with YAML frontmatter support
 */

import {
  ModeConfig,
  ParsedModeFile,
  ParseError,
  ValidationResult,
  ValidationRule
} from '../modes/types';

export class ModeParser {
  private static readonly FRONTMATTER_DELIMITER = '---';
  private static readonly REQUIRED_FIELDS = ['id', 'name', 'version', 'description', 'makesEdits', 'promptConfig'];
  
  /**
   * Parse a mode definition file
   */
  async parseFile(filePath: string, content: string): Promise<ParsedModeFile> {
    const fileName = this.extractFileName(filePath);
    const lastModified = Date.now(); // In real implementation, get from file stats
    
    const parsedFile: ParsedModeFile = {
      filePath,
      fileName,
      lastModified,
      config: {} as ModeConfig,
      content: '',
      errors: [],
      isValid: false
    };

    try {
      // Parse frontmatter and content
      const { frontmatter, contentBody, errors: parseErrors } = this.parseFrontmatter(content);
      parsedFile.errors.push(...parseErrors);
      parsedFile.content = contentBody;

      if (parseErrors.length === 0) {
        // Validate and transform frontmatter to ModeConfig
        const { config, errors: configErrors } = await this.validateConfig(frontmatter, fileName);
        parsedFile.errors.push(...configErrors);
        parsedFile.config = config;
      }

      // Additional validation
      const validationResult = await this.validateModeFile(parsedFile);
      parsedFile.errors.push(...validationResult.errors);
      parsedFile.errors.push(...validationResult.warnings);

      parsedFile.isValid = parsedFile.errors.filter(e => e.severity === 'error').length === 0;

    } catch (error) {
      parsedFile.errors.push({
        type: 'syntax',
        message: `Failed to parse mode file: ${error.message}`,
        severity: 'error'
      });
    }

    return parsedFile;
  }

  /**
   * Parse YAML frontmatter from markdown content
   */
  private parseFrontmatter(content: string): {
    frontmatter: any;
    contentBody: string;
    errors: ParseError[];
  } {
    const errors: ParseError[] = [];
    let frontmatter: any = {};
    let contentBody = content;

    const lines = content.split('\n');
    
    // Check for frontmatter delimiters
    if (lines[0]?.trim() === ModeParser.FRONTMATTER_DELIMITER) {
      const endDelimiterIndex = lines.findIndex((line, index) => 
        index > 0 && line.trim() === ModeParser.FRONTMATTER_DELIMITER
      );

      if (endDelimiterIndex === -1) {
        errors.push({
          type: 'frontmatter',
          message: 'Missing closing frontmatter delimiter (---)',
          line: 1,
          severity: 'error',
          suggestion: 'Add a closing --- delimiter after your YAML frontmatter'
        });
        return { frontmatter: {}, contentBody: content, errors };
      }

      const yamlContent = lines.slice(1, endDelimiterIndex).join('\n');
      contentBody = lines.slice(endDelimiterIndex + 1).join('\n').trim();

      try {
        frontmatter = this.parseYAML(yamlContent);
      } catch (yamlError) {
        errors.push({
          type: 'frontmatter',
          message: `Invalid YAML frontmatter: ${yamlError.message}`,
          line: this.findYAMLErrorLine(yamlContent, yamlError),
          severity: 'error',
          suggestion: 'Check YAML syntax - ensure proper indentation and quoting'
        });
      }
    } else {
      errors.push({
        type: 'frontmatter',
        message: 'No YAML frontmatter found. Mode files must start with ---',
        line: 1,
        severity: 'error',
        suggestion: 'Add YAML frontmatter at the beginning of your file starting with ---'
      });
    }

    return { frontmatter, contentBody, errors };
  }

  /**
   * Simple YAML parser (in production, use a proper YAML library)
   */
  private parseYAML(yamlContent: string): any {
    // This is a simplified YAML parser for demonstration
    // In production, use js-yaml or similar library
    const result: any = {};
    const lines = yamlContent.split('\n');
    let currentKey = '';
    let currentValue: any = null;
    let inArray = false;
    let arrayItems: any[] = [];
    let inObject = false;
    let currentObject: any = {};
    let objectKey = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      
      if (!trimmed || trimmed.startsWith('#')) continue;

      // Simple key-value parsing
      if (line.match(/^[a-zA-Z_][a-zA-Z0-9_]*:\s*/)) {
        // End previous structures
        if (inArray && currentKey) {
          result[currentKey] = arrayItems;
          arrayItems = [];
          inArray = false;
        }
        if (inObject && objectKey) {
          result[objectKey] = currentObject;
          currentObject = {};
          inObject = false;
          objectKey = '';
        }

        const [key, ...valueParts] = line.split(':');
        currentKey = key.trim();
        const value = valueParts.join(':').trim();
        
        if (value === '') {
          // Check next line for array or object
          const nextLine = lines[i + 1];
          if (nextLine?.trim().startsWith('-')) {
            inArray = true;
          } else if (nextLine?.match(/^\s+[a-zA-Z_]/)) {
            inObject = true;
            objectKey = currentKey;
          }
        } else {
          result[currentKey] = this.parseValue(value);
        }
      } else if (inArray && trimmed.startsWith('-')) {
        arrayItems.push(this.parseValue(trimmed.substring(1).trim()));
      } else if (inObject && line.match(/^\s+[a-zA-Z_][a-zA-Z0-9_]*:\s*/)) {
        const [key, ...valueParts] = line.trim().split(':');
        const objKey = key.trim();
        const objValue = valueParts.join(':').trim();
        currentObject[objKey] = this.parseValue(objValue);
      }
    }

    // Clean up remaining structures
    if (inArray && currentKey) {
      result[currentKey] = arrayItems;
    }
    if (inObject && objectKey) {
      result[objectKey] = currentObject;
    }

    return result;
  }

  /**
   * Parse individual values with type inference
   */
  private parseValue(value: string): any {
    const trimmed = value.trim();
    
    // Remove quotes
    if ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
        (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
      return trimmed.slice(1, -1);
    }
    
    // Boolean values
    if (trimmed === 'true') return true;
    if (trimmed === 'false') return false;
    
    // Numbers
    if (/^-?\d+$/.test(trimmed)) return parseInt(trimmed, 10);
    if (/^-?\d*\.\d+$/.test(trimmed)) return parseFloat(trimmed);
    
    // Default to string
    return trimmed;
  }

  /**
   * Find the line number where YAML error occurred
   */
  private findYAMLErrorLine(yamlContent: string, error: any): number {
    // Simple heuristic - in production use proper YAML parser error handling
    return 1;
  }

  /**
   * Validate and transform frontmatter to ModeConfig
   */
  private async validateConfig(frontmatter: any, fileName: string): Promise<{
    config: ModeConfig;
    errors: ParseError[];
  }> {
    const errors: ParseError[] = [];
    const config = { ...frontmatter } as ModeConfig;

    // Check required fields
    for (const field of ModeParser.REQUIRED_FIELDS) {
      if (!frontmatter[field]) {
        errors.push({
          type: 'validation',
          message: `Required field '${field}' is missing`,
          severity: 'error',
          suggestion: `Add ${field}: <value> to your frontmatter`
        });
      }
    }

    // Validate specific fields
    if (frontmatter.id && !/^[a-zA-Z][a-zA-Z0-9-_]*$/.test(frontmatter.id)) {
      errors.push({
        type: 'validation',
        message: 'Mode ID must start with a letter and contain only letters, numbers, hyphens, and underscores',
        severity: 'error',
        suggestion: 'Use a valid ID like "my-writing-mode" or "copyEdit_v2"'
      });
    }

    // Validate version format
    if (frontmatter.version && !/^\d+\.\d+\.\d+$/.test(frontmatter.version)) {
      errors.push({
        type: 'validation',
        message: 'Version must follow semantic versioning (e.g., 1.0.0)',
        severity: 'error',
        suggestion: 'Use format like "1.0.0" or "2.1.3"'
      });
    }

    // Validate makesEdits is boolean
    if (frontmatter.makesEdits !== undefined && typeof frontmatter.makesEdits !== 'boolean') {
      errors.push({
        type: 'validation',
        message: 'makesEdits must be true or false',
        severity: 'error',
        suggestion: 'Set makesEdits: true or makesEdits: false'
      });
    }

    // Validate promptConfig
    if (frontmatter.promptConfig) {
      const promptConfig = frontmatter.promptConfig;
      if (!promptConfig.systemPrompt) {
        errors.push({
          type: 'validation',
          message: 'promptConfig.systemPrompt is required',
          severity: 'error',
          suggestion: 'Add systemPrompt field to your promptConfig'
        });
      }
      if (!promptConfig.userPromptTemplate) {
        errors.push({
          type: 'validation',
          message: 'promptConfig.userPromptTemplate is required',
          severity: 'error',
          suggestion: 'Add userPromptTemplate field to your promptConfig'
        });
      }
    }

    // Set defaults
    config.author = config.author || 'Unknown';
    config.tags = config.tags || [];
    config.icon = config.icon || 'message-square';
    config.color = config.color || '#6366f1';

    return { config, errors };
  }

  /**
   * Validate complete mode file
   */
  private async validateModeFile(parsedFile: ParsedModeFile): Promise<ValidationResult> {
    const errors: ParseError[] = [];
    const warnings: ParseError[] = [];

    // Check for empty content
    if (!parsedFile.content.trim()) {
      warnings.push({
        type: 'validation',
        message: 'Mode file has no content after frontmatter',
        severity: 'warning',
        suggestion: 'Consider adding documentation or examples for your mode'
      });
    }

    // Validate template variables in prompts
    if (parsedFile.config.promptConfig) {
      const variables = this.extractTemplateVariables(parsedFile.config.promptConfig.systemPrompt);
      const userVariables = this.extractTemplateVariables(parsedFile.config.promptConfig.userPromptTemplate);
      
      // Check for undefined variables
      const allVariables = [...variables, ...userVariables];
      const undefinedVars = allVariables.filter(v => !['document', 'selection', 'userInput'].includes(v));
      
      if (undefinedVars.length > 0) {
        warnings.push({
          type: 'validation',
          message: `Unknown template variables: ${undefinedVars.join(', ')}`,
          severity: 'warning',
          suggestion: 'Define custom variables or use built-in variables: {{document}}, {{selection}}, {{userInput}}'
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Extract template variables from a string
   */
  private extractTemplateVariables(template: string): string[] {
    const regex = /\{\{(\w+)\}\}/g;
    const variables: string[] = [];
    let match;
    
    while ((match = regex.exec(template)) !== null) {
      variables.push(match[1]);
    }
    
    return variables;
  }

  /**
   * Extract file name without extension
   */
  private extractFileName(filePath: string): string {
    const parts = filePath.split(/[/\\]/);
    const fileName = parts[parts.length - 1];
    return fileName.replace(/\.[^.]+$/, '');
  }

  /**
   * Validate individual validation rules
   */
  async validateRule(value: any, rule: ValidationRule): Promise<boolean> {
    switch (rule.type) {
      case 'length':
        if (typeof value === 'string') {
          const min = rule.params.min || 0;
          const max = rule.params.max || Infinity;
          return value.length >= min && value.length <= max;
        }
        return false;
      
      case 'pattern':
        if (typeof value === 'string' && rule.params.pattern) {
          const regex = new RegExp(rule.params.pattern);
          return regex.test(value);
        }
        return false;
      
      case 'custom':
        // In production, this would execute custom validation logic
        return true;
      
      default:
        return true;
    }
  }

  /**
   * Generate a mode template
   */
  generateTemplate(options: {
    id: string;
    name: string;
    description: string;
    makesEdits: boolean;
    category: 'editing' | 'creative' | 'analysis' | 'conversation';
  }): string {
    const { id, name, description, makesEdits, category } = options;
    
    const systemPrompts = {
      editing: 'You are a professional editor helping to improve written content. Focus on clarity, structure, and style.',
      creative: 'You are a creative writing assistant, helping to generate and develop ideas, stories, and creative content.',
      analysis: 'You are an analytical assistant, helping to examine, break down, and understand complex information.',
      conversation: 'You are a helpful AI assistant engaging in natural conversation to provide information and assistance.'
    };

    const userPromptTemplates = {
      editing: 'Please review and suggest improvements for this text: {{selection || document}}',
      creative: 'Help me with this creative writing task: {{userInput}}. Context: {{document}}',
      analysis: 'Please analyze the following content: {{selection || document}}. Focus on: {{userInput}}',
      conversation: 'User message: {{userInput}}'
    };

    return `---
id: ${id}
name: "${name}"
version: "1.0.0"
description: "${description}"
author: "Custom Mode"
tags: ["${category}", "custom"]
icon: "message-square"
color: "#6366f1"
makesEdits: ${makesEdits}
${makesEdits ? `trackEdits:
  enabled: true
  editType: "${category === 'editing' ? 'style' : 'mixed'}"
  clusteringStrategy: "proximity"` : ''}
promptConfig:
  systemPrompt: "${systemPrompts[category]}"
  userPromptTemplate: "${userPromptTemplates[category]}"
  contextInjection:
    includeDocument: true
    includeSelection: true
    includeVaultContext: false
    maxContextLength: 4000
performance:
  cacheResponses: true
  cacheTTL: 300000
  memoryOptimization: "balanced"
---

# ${name}

${description}

## Usage

This mode helps with ${category} tasks. 

${makesEdits ? 
`## Track Edits Integration

This mode is configured to route edits through the Track Edits system, allowing you to review and manage all suggested changes.` : 
`## Conversation Mode

This mode provides assistance without making direct edits to your documents.`}

## Customization

You can modify this mode by editing the YAML frontmatter above. Key settings include:

- \`promptConfig.systemPrompt\`: The core instructions for the AI
- \`promptConfig.userPromptTemplate\`: How user input is formatted
- \`contextInjection\`: What context to include with requests
${makesEdits ? '- `trackEdits`: How edits are handled and displayed' : ''}
`;
  }
}