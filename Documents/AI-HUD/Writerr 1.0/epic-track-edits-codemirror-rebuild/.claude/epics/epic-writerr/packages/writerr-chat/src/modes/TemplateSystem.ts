/**
 * @fileoverview Template system for custom mode creation
 */

import { Vault } from 'obsidian';
import { globalEventBus } from '@writerr/shared';
import {
  ModeTemplate,
  TemplateVariable,
  ParsedModeFile,
  ParseError
} from './types';

export class ModeTemplateSystem {
  private vault: Vault;
  private templates: Map<string, ModeTemplate> = new Map();
  private templatePath = 'Templates/Modes';

  constructor(vault: Vault) {
    this.vault = vault;
    this.initializeBuiltInTemplates();
  }

  /**
   * Initialize built-in templates
   */
  private initializeBuiltInTemplates(): void {
    const builtInTemplates: ModeTemplate[] = [
      {
        id: 'basic-chat',
        name: 'Basic Chat Mode',
        description: 'Simple conversational AI mode without document editing',
        category: 'conversation',
        variables: [
          {
            name: 'modeName',
            type: 'string',
            description: 'Display name for your mode',
            default: 'My Chat Mode',
            required: true,
            pattern: '^[A-Za-z][A-Za-z0-9\\s-_]*$'
          },
          {
            name: 'modeId',
            type: 'string',
            description: 'Unique identifier (lowercase, no spaces)',
            default: 'my-chat-mode',
            required: true,
            pattern: '^[a-z][a-z0-9-_]*$'
          },
          {
            name: 'description',
            type: 'string',
            description: 'Brief description of what this mode does',
            default: 'A custom chat mode for specialized conversations',
            required: true
          },
          {
            name: 'systemPrompt',
            type: 'string',
            description: 'Instructions that define the AI behavior',
            default: 'You are a helpful AI assistant specialized in {{specialty}}.',
            required: true
          },
          {
            name: 'specialty',
            type: 'string',
            description: 'What specialty or domain this mode focuses on',
            default: 'general assistance',
            required: false
          },
          {
            name: 'includeDocument',
            type: 'boolean',
            description: 'Include current document content in context',
            default: true,
            required: false
          },
          {
            name: 'includeSelection',
            type: 'boolean',
            description: 'Include selected text in context',
            default: true,
            required: false
          }
        ],
        content: this.getChatModeTemplate()
      },
      {
        id: 'editing-mode',
        name: 'Document Editing Mode',
        description: 'Mode that makes edits to documents with Track Edits integration',
        category: 'editing',
        variables: [
          {
            name: 'modeName',
            type: 'string',
            description: 'Display name for your editing mode',
            default: 'My Editor',
            required: true,
            pattern: '^[A-Za-z][A-Za-z0-9\\s-_]*$'
          },
          {
            name: 'modeId',
            type: 'string',
            description: 'Unique identifier (lowercase, no spaces)',
            default: 'my-editor',
            required: true,
            pattern: '^[a-z][a-z0-9-_]*$'
          },
          {
            name: 'description',
            type: 'string',
            description: 'Brief description of the editing focus',
            default: 'A custom editor for specific document improvements',
            required: true
          },
          {
            name: 'editType',
            type: 'select',
            description: 'Type of edits this mode makes',
            options: ['structural', 'style', 'grammar', 'creative', 'mixed'],
            default: 'style',
            required: true
          },
          {
            name: 'systemPrompt',
            type: 'string',
            description: 'Instructions for the editing behavior',
            default: 'You are a professional editor focused on {{editFocus}}. Provide clear, actionable suggestions.',
            required: true
          },
          {
            name: 'editFocus',
            type: 'string',
            description: 'Specific focus area for edits',
            default: 'clarity and readability',
            required: false
          },
          {
            name: 'clusteringStrategy',
            type: 'select',
            description: 'How to group related edits',
            options: ['proximity', 'category', 'ml-inspired'],
            default: 'proximity',
            required: false
          },
          {
            name: 'autoApply',
            type: 'boolean',
            description: 'Automatically apply minor edits',
            default: false,
            required: false
          }
        ],
        content: this.getEditingModeTemplate()
      },
      {
        id: 'analysis-mode',
        name: 'Document Analysis Mode',
        description: 'Mode for analyzing and understanding document content',
        category: 'analysis',
        variables: [
          {
            name: 'modeName',
            type: 'string',
            description: 'Display name for your analysis mode',
            default: 'Document Analyzer',
            required: true,
            pattern: '^[A-Za-z][A-Za-z0-9\\s-_]*$'
          },
          {
            name: 'modeId',
            type: 'string',
            description: 'Unique identifier (lowercase, no spaces)',
            default: 'document-analyzer',
            required: true,
            pattern: '^[a-z][a-z0-9-_]*$'
          },
          {
            name: 'description',
            type: 'string',
            description: 'Brief description of the analysis focus',
            default: 'Analyze and provide insights about document content',
            required: true
          },
          {
            name: 'analysisType',
            type: 'multiselect',
            description: 'Types of analysis to perform',
            options: ['structure', 'tone', 'readability', 'arguments', 'themes', 'style'],
            default: ['structure', 'readability'],
            required: true
          },
          {
            name: 'systemPrompt',
            type: 'string',
            description: 'Instructions for the analysis behavior',
            default: 'You are an expert analyst focused on {{analysisAreas}}. Provide detailed, structured insights.',
            required: true
          },
          {
            name: 'analysisAreas',
            type: 'string',
            description: 'Specific areas to focus analysis on',
            default: 'document structure and clarity',
            required: false
          },
          {
            name: 'includeVaultContext',
            type: 'boolean',
            description: 'Include context from other vault documents',
            default: false,
            required: false
          },
          {
            name: 'maxContextLength',
            type: 'number',
            description: 'Maximum context length in characters',
            default: 4000,
            required: false
          }
        ],
        content: this.getAnalysisModeTemplate()
      },
      {
        id: 'creative-writing',
        name: 'Creative Writing Assistant',
        description: 'Mode for creative writing collaboration and idea generation',
        category: 'creative',
        variables: [
          {
            name: 'modeName',
            type: 'string',
            description: 'Display name for your creative mode',
            default: 'Creative Writer',
            required: true,
            pattern: '^[A-Za-z][A-Za-z0-9\\s-_]*$'
          },
          {
            name: 'modeId',
            type: 'string',
            description: 'Unique identifier (lowercase, no spaces)',
            default: 'creative-writer',
            required: true,
            pattern: '^[a-z][a-z0-9-_]*$'
          },
          {
            name: 'description',
            type: 'string',
            description: 'Brief description of the creative focus',
            default: 'Collaborative creative writing assistance and idea development',
            required: true
          },
          {
            name: 'writingStyle',
            type: 'select',
            description: 'Preferred writing style',
            options: ['narrative', 'descriptive', 'expository', 'persuasive', 'poetic'],
            default: 'narrative',
            required: false
          },
          {
            name: 'genre',
            type: 'string',
            description: 'Specific genre or domain',
            default: 'general fiction',
            required: false
          },
          {
            name: 'systemPrompt',
            type: 'string',
            description: 'Instructions for creative assistance',
            default: 'You are a creative writing partner specializing in {{genre}}. Help develop ideas, characters, and narratives.',
            required: true
          },
          {
            name: 'makesEdits',
            type: 'boolean',
            description: 'Whether this mode makes direct text edits',
            default: true,
            required: true
          },
          {
            name: 'temperature',
            type: 'number',
            description: 'Creativity level (0.0 to 2.0)',
            default: 1.2,
            required: false
          }
        ],
        content: this.getCreativeWritingTemplate()
      }
    ];

    builtInTemplates.forEach(template => {
      this.templates.set(template.id, template);
    });

    console.log(`📚 Initialized ${builtInTemplates.length} built-in templates`);
  }

  /**
   * Get all available templates
   */
  getTemplates(): ModeTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Get templates by category
   */
  getTemplatesByCategory(category: ModeTemplate['category']): ModeTemplate[] {
    return Array.from(this.templates.values()).filter(t => t.category === category);
  }

  /**
   * Get a specific template
   */
  getTemplate(templateId: string): ModeTemplate | null {
    return this.templates.get(templateId) || null;
  }

  /**
   * Generate mode from template with variable substitution
   */
  async generateModeFromTemplate(
    templateId: string,
    variables: Record<string, any>,
    outputPath?: string
  ): Promise<{ content: string; errors: ParseError[]; filePath?: string }> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    console.log(`🎨 Generating mode from template: ${template.name}`);

    const errors: ParseError[] = [];
    
    // Validate required variables
    const validationErrors = this.validateTemplateVariables(template, variables);
    errors.push(...validationErrors);

    // Substitute variables in template content
    let content = template.content;
    
    // Replace template variables
    for (const variable of template.variables) {
      const value = variables[variable.name] ?? variable.default;
      const placeholder = new RegExp(`{{${variable.name}}}`, 'g');
      
      if (value !== undefined) {
        content = content.replace(placeholder, String(value));
      } else if (variable.required) {
        errors.push({
          type: 'validation',
          message: `Required variable '${variable.name}' is missing`,
          severity: 'error',
          suggestion: `Provide a value for ${variable.name}: ${variable.description}`
        });
      }
    }

    // Clean up any remaining unreplaced placeholders
    content = content.replace(/\{\{[^}]+\}\}/g, '');

    // Save to file if path provided
    let filePath: string | undefined;
    if (outputPath) {
      try {
        const modeId = variables.modeId || template.id;
        filePath = `${outputPath}/${modeId}.md`;
        
        await this.vault.create(filePath, content);
        console.log(`✅ Created mode file: ${filePath}`);
        
        globalEventBus.emit('mode-template-generated', {
          templateId,
          modeId,
          filePath,
          variables
        }, 'writerr-chat');
        
      } catch (error) {
        errors.push({
          type: 'syntax',
          message: `Failed to create mode file: ${error.message}`,
          severity: 'error'
        });
      }
    }

    return { content, errors, filePath };
  }

  /**
   * Validate template variables
   */
  private validateTemplateVariables(template: ModeTemplate, variables: Record<string, any>): ParseError[] {
    const errors: ParseError[] = [];

    for (const variable of template.variables) {
      const value = variables[variable.name];
      
      // Check required variables
      if (variable.required && (value === undefined || value === null || value === '')) {
        errors.push({
          type: 'validation',
          message: `Required variable '${variable.name}' is missing or empty`,
          severity: 'error',
          suggestion: variable.description
        });
        continue;
      }
      
      if (value !== undefined) {
        // Type validation
        const typeError = this.validateVariableType(variable, value);
        if (typeError) {
          errors.push(typeError);
        }
        
        // Pattern validation
        if (variable.pattern && typeof value === 'string') {
          const regex = new RegExp(variable.pattern);
          if (!regex.test(value)) {
            errors.push({
              type: 'validation',
              message: `Variable '${variable.name}' does not match required pattern`,
              severity: 'error',
              suggestion: `${variable.description}. Pattern: ${variable.pattern}`
            });
          }
        }
        
        // Options validation for select types
        if ((variable.type === 'select' || variable.type === 'multiselect') && variable.options) {
          const values = Array.isArray(value) ? value : [value];
          const invalidValues = values.filter(v => !variable.options!.includes(v));
          
          if (invalidValues.length > 0) {
            errors.push({
              type: 'validation',
              message: `Invalid option(s) for '${variable.name}': ${invalidValues.join(', ')}`,
              severity: 'error',
              suggestion: `Valid options: ${variable.options.join(', ')}`
            });
          }
        }
      }
    }

    return errors;
  }

  /**
   * Validate variable type
   */
  private validateVariableType(variable: TemplateVariable, value: any): ParseError | null {
    switch (variable.type) {
      case 'string':
        if (typeof value !== 'string') {
          return {
            type: 'validation',
            message: `Variable '${variable.name}' must be a string`,
            severity: 'error'
          };
        }
        break;
      
      case 'number':
        if (typeof value !== 'number' || isNaN(value)) {
          return {
            type: 'validation',
            message: `Variable '${variable.name}' must be a valid number`,
            severity: 'error'
          };
        }
        break;
      
      case 'boolean':
        if (typeof value !== 'boolean') {
          return {
            type: 'validation',
            message: `Variable '${variable.name}' must be true or false`,
            severity: 'error'
          };
        }
        break;
      
      case 'multiselect':
        if (!Array.isArray(value)) {
          return {
            type: 'validation',
            message: `Variable '${variable.name}' must be an array`,
            severity: 'error'
          };
        }
        break;
    }

    return null;
  }

  /**
   * Create interactive mode wizard
   */
  async createModeWizard(templateId: string): Promise<{
    template: ModeTemplate;
    questions: Array<{
      variable: TemplateVariable;
      prompt: string;
      validation: (value: any) => boolean;
    }>;
  }> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    const questions = template.variables.map(variable => ({
      variable,
      prompt: this.generateQuestionPrompt(variable),
      validation: (value: any) => this.validateVariableType(variable, value) === null
    }));

    return { template, questions };
  }

  /**
   * Generate user-friendly question prompt
   */
  private generateQuestionPrompt(variable: TemplateVariable): string {
    let prompt = `${variable.description}`;
    
    if (variable.required) {
      prompt += ' (required)';
    }
    
    if (variable.default !== undefined) {
      prompt += ` [default: ${variable.default}]`;
    }
    
    if (variable.options) {
      prompt += `\nOptions: ${variable.options.join(', ')}`;
    }
    
    if (variable.pattern) {
      prompt += `\nFormat: ${this.getPatternDescription(variable.pattern)}`;
    }
    
    return prompt;
  }

  /**
   * Get human-readable pattern description
   */
  private getPatternDescription(pattern: string): string {
    switch (pattern) {
      case '^[A-Za-z][A-Za-z0-9\\s-_]*$':
        return 'Start with letter, may contain letters, numbers, spaces, hyphens, underscores';
      case '^[a-z][a-z0-9-_]*$':
        return 'Lowercase, start with letter, may contain letters, numbers, hyphens, underscores';
      default:
        return pattern;
    }
  }

  /**
   * Load custom templates from vault
   */
  async loadCustomTemplates(): Promise<void> {
    console.log(`📂 Loading custom templates from: ${this.templatePath}`);
    
    try {
      const folder = this.vault.getAbstractFileByPath(this.templatePath);
      if (!folder || !('children' in folder)) {
        console.log(`📁 Creating template directory: ${this.templatePath}`);
        await this.vault.createFolder(this.templatePath);
        return;
      }

      for (const file of folder.children) {
        if (file.name.endsWith('.json')) {
          try {
            const content = await this.vault.read(file as any);
            const template: ModeTemplate = JSON.parse(content);
            
            // Validate template structure
            if (this.validateTemplateStructure(template)) {
              this.templates.set(template.id, template);
              console.log(`✅ Loaded custom template: ${template.name}`);
            } else {
              console.warn(`⚠️ Invalid template structure: ${file.name}`);
            }
          } catch (error) {
            console.error(`❌ Failed to load template ${file.name}:`, error);
          }
        }
      }
    } catch (error) {
      console.error('❌ Failed to load custom templates:', error);
    }
  }

  /**
   * Validate template structure
   */
  private validateTemplateStructure(template: any): template is ModeTemplate {
    return (
      typeof template === 'object' &&
      typeof template.id === 'string' &&
      typeof template.name === 'string' &&
      typeof template.description === 'string' &&
      typeof template.category === 'string' &&
      typeof template.content === 'string' &&
      Array.isArray(template.variables)
    );
  }

  // Template content methods
  private getChatModeTemplate(): string {
    return `---
id: {{modeId}}
name: "{{modeName}}"
version: "1.0.0"
description: "{{description}}"
author: "Custom Mode"
tags: ["chat", "conversation", "custom"]
icon: "message-square"
color: "#6366f1"
makesEdits: false
promptConfig:
  systemPrompt: "{{systemPrompt}}"
  userPromptTemplate: "User: {{userInput}}"
  contextInjection:
    includeDocument: {{includeDocument}}
    includeSelection: {{includeSelection}}
    includeVaultContext: false
    maxContextLength: 4000
performance:
  cacheResponses: true
  cacheTTL: 300000
  memoryOptimization: "balanced"
---

# {{modeName}}

{{description}}

## Usage

This is a conversational mode that provides assistance without making direct edits to your documents.

## Customization

You can modify this mode by editing the YAML frontmatter above. Key settings include:

- \`promptConfig.systemPrompt\`: The core instructions for the AI
- \`contextInjection\`: What context to include with requests
- \`performance\`: Caching and optimization settings
`;
  }

  private getEditingModeTemplate(): string {
    return `---
id: {{modeId}}
name: "{{modeName}}"
version: "1.0.0"
description: "{{description}}"
author: "Custom Mode"
tags: ["editing", "{{editType}}", "custom"]
icon: "edit"
color: "#f59e0b"
makesEdits: true
trackEdits:
  enabled: true
  editType: "{{editType}}"
  clusteringStrategy: "{{clusteringStrategy}}"
  autoApply: {{autoApply}}
promptConfig:
  systemPrompt: "{{systemPrompt}}"
  userPromptTemplate: "Please review and improve this text: {{selection || document}}. Focus on {{editFocus}}."
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

# {{modeName}}

{{description}}

## Track Edits Integration

This mode is configured to route edits through the Track Edits system, allowing you to review and manage all suggested changes.

### Edit Type: {{editType}}

This mode focuses on {{editType}} improvements to your text.

### Clustering Strategy: {{clusteringStrategy}}

Related edits will be grouped using the {{clusteringStrategy}} strategy.

## Customization

Key settings you can modify:

- \`trackEdits.editType\`: Type of edits (structural, style, grammar, creative, mixed)
- \`trackEdits.clusteringStrategy\`: How to group edits (proximity, category, ml-inspired)
- \`trackEdits.autoApply\`: Whether to auto-apply minor edits
- \`promptConfig.systemPrompt\`: The editing behavior instructions
`;
  }

  private getAnalysisModeTemplate(): string {
    return `---
id: {{modeId}}
name: "{{modeName}}"
version: "1.0.0"
description: "{{description}}"
author: "Custom Mode"
tags: ["analysis", "insights", "custom"]
icon: "search"
color: "#10b981"
makesEdits: false
promptConfig:
  systemPrompt: "{{systemPrompt}}"
  userPromptTemplate: "Please analyze this content: {{selection || document}}. Provide insights about: {{userInput}}"
  contextInjection:
    includeDocument: true
    includeSelection: true
    includeVaultContext: {{includeVaultContext}}
    maxContextLength: {{maxContextLength}}
performance:
  cacheResponses: true
  cacheTTL: 600000
  memoryOptimization: "balanced"
---

# {{modeName}}

{{description}}

## Analysis Focus

This mode specializes in analyzing documents for:

{{#each analysisType}}
- {{this}}
{{/each}}

## Usage

This mode provides detailed analysis and insights without making direct edits to your documents.

## Context Settings

- Maximum context length: {{maxContextLength}} characters
- Vault-wide context: {{#if includeVaultContext}}Enabled{{else}}Disabled{{/if}}

## Customization

Key settings you can modify:

- \`contextInjection.maxContextLength\`: How much context to include
- \`contextInjection.includeVaultContext\`: Whether to include related documents
- \`promptConfig.systemPrompt\`: The analysis behavior instructions
`;
  }

  private getCreativeWritingTemplate(): string {
    return `---
id: {{modeId}}
name: "{{modeName}}"
version: "1.0.0"
description: "{{description}}"
author: "Custom Mode"
tags: ["creative", "writing", "{{genre}}", "custom"]
icon: "feather"
color: "#8b5cf6"
makesEdits: {{makesEdits}}
{{#if makesEdits}}
trackEdits:
  enabled: true
  editType: "creative"
  clusteringStrategy: "category"
  autoApply: false
{{/if}}
modelPreferences:
  temperature: {{temperature}}
  maxTokens: 2000
promptConfig:
  systemPrompt: "{{systemPrompt}}"
  userPromptTemplate: "Help me with this {{writingStyle}} writing task: {{userInput}}. Context: {{document}}"
  contextInjection:
    includeDocument: true
    includeSelection: true
    includeVaultContext: false
    maxContextLength: 6000
performance:
  cacheResponses: false
  memoryOptimization: "high"
---

# {{modeName}}

{{description}}

## Creative Focus

- **Genre**: {{genre}}
- **Style**: {{writingStyle}}
- **Temperature**: {{temperature}} (creativity level)

## Features

{{#if makesEdits}}
This mode can make direct edits to your text through the Track Edits system.
{{else}}
This mode provides creative suggestions without making direct edits.
{{/if}}

## Usage

This mode is designed for creative collaboration and idea development in the {{genre}} genre.

## Customization

Key settings you can modify:

- \`modelPreferences.temperature\`: Creativity level (0.0 to 2.0)
- \`modelPreferences.maxTokens\`: Response length limit
- \`promptConfig.systemPrompt\`: Creative assistance instructions
{{#if makesEdits}}
- \`trackEdits\`: Edit handling and review settings
{{/if}}
`;
  }
}