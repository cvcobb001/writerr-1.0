/**
 * @fileoverview Template generator for creating custom function definitions
 */

import {
  FunctionTemplate,
  TemplateCategory,
  TemplateOptions,
  GeneratedTemplate,
  TemplateVariable,
  TemplateValidationResult
} from './types';

export class TemplateGenerator {
  private templates: Map<string, FunctionTemplate> = new Map();

  constructor() {
    this.initializeBuiltinTemplates();
  }

  /**
   * Generate a function definition from a template
   */
  generateFromTemplate(
    templateId: string,
    variables: Record<string, any>,
    options?: TemplateOptions
  ): GeneratedTemplate {
    const template = this.templates.get(templateId);
    
    if (!template) {
      throw new Error(`Template '${templateId}' not found`);
    }

    // Validate variables
    const validation = this.validateVariables(template, variables);
    if (!validation.isValid) {
      throw new Error(`Template validation failed: ${validation.errors.join(', ')}`);
    }

    // Merge with default values
    const finalVariables = this.mergeWithDefaults(template, variables);

    // Generate function definition
    const functionDefinition = this.buildFunctionDefinition(template, finalVariables, options);
    
    // Generate file path suggestion
    const filePath = this.generateFilePath(template, finalVariables);
    
    return {
      functionDefinition,
      filePath,
      variables: finalVariables,
      warnings: validation.warnings,
      suggestions: validation.suggestions
    };
  }

  /**
   * Get all available templates
   */
  getTemplates(): FunctionTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Get templates by category
   */
  getTemplatesByCategory(category: TemplateCategory): FunctionTemplate[] {
    return this.getTemplates().filter(template => template.category === category);
  }

  /**
   * Get template by ID
   */
  getTemplate(templateId: string): FunctionTemplate | undefined {
    return this.templates.get(templateId);
  }

  /**
   * Register a new template
   */
  registerTemplate(template: FunctionTemplate): void {
    this.templates.set(template.id, template);
  }

  /**
   * Create a custom template
   */
  createCustomTemplate(
    name: string,
    category: TemplateCategory,
    systemPrompt: string,
    options?: Partial<FunctionTemplate>
  ): FunctionTemplate {
    const template: FunctionTemplate = {
      id: this.generateTemplateId(name),
      name,
      description: options?.description || `Custom ${category} function`,
      category,
      difficulty: options?.difficulty || 'intermediate',
      tags: options?.tags || [category, 'custom'],
      
      metadata: {
        author: options?.metadata?.author || 'User',
        version: '1.0.0',
        created: new Date(),
        updated: new Date()
      },
      
      config: {
        priority: options?.config?.priority || 5,
        capabilities: options?.config?.capabilities || [],
        dependencies: options?.config?.dependencies || [],
        constraints: options?.config?.constraints || {},
        trackEditsConfig: options?.config?.trackEditsConfig || {
          batchingStrategy: 'batch',
          clusterStrategy: 'paragraph',
          confidenceThreshold: 0.75,
          changeCategories: ['custom'],
          requiresReview: true
        }
      },
      
      systemPromptTemplate: systemPrompt,
      userPromptTemplate: options?.userPromptTemplate,
      exampleTemplates: options?.exampleTemplates || [],
      schemaTemplate: options?.schemaTemplate,
      preprocessingTemplate: options?.preprocessingTemplate,
      postprocessingTemplate: options?.postprocessingTemplate,
      
      variables: options?.variables || [],
      
      documentation: {
        overview: options?.documentation?.overview || 'Custom function template',
        usage: options?.documentation?.usage || 'Apply this function to enhance your text',
        customization: options?.documentation?.customization || 'Customize variables to fit your needs',
        examples: options?.documentation?.examples || 'See examples for usage patterns'
      }
    };

    return template;
  }

  /**
   * Validate template variables
   */
  validateVariables(template: FunctionTemplate, variables: Record<string, any>): TemplateValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Check required variables
    for (const variable of template.variables) {
      if (variable.required && !(variable.key in variables)) {
        errors.push(`Required variable '${variable.key}' is missing`);
        continue;
      }

      const value = variables[variable.key];
      if (value === undefined || value === null) continue;

      // Type validation
      if (!this.validateVariableType(variable, value)) {
        errors.push(`Variable '${variable.key}' has incorrect type. Expected ${variable.type}, got ${typeof value}`);
      }

      // Value validation
      const valueValidation = this.validateVariableValue(variable, value);
      if (!valueValidation.isValid) {
        errors.push(...valueValidation.errors);
      }
      warnings.push(...valueValidation.warnings);
    }

    // Check for unused variables
    const templateKeys = new Set(template.variables.map(v => v.key));
    Object.keys(variables).forEach(key => {
      if (!templateKeys.has(key)) {
        warnings.push(`Variable '${key}' is not used in this template`);
      }
    });

    // Generate suggestions
    if (template.variables.length > 0) {
      suggestions.push('Consider customizing the available variables to better fit your use case');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions
    };
  }

  /**
   * Private helper methods
   */
  private initializeBuiltinTemplates(): void {
    // Basic Copy Editor Template
    this.registerTemplate({
      id: 'basic-copy-editor',
      name: 'Basic Copy Editor',
      description: 'Simple copy editing template for general text improvement',
      category: 'copy-editor',
      difficulty: 'beginner',
      tags: ['copy-edit', 'grammar', 'style', 'basic'],
      
      metadata: {
        author: 'Writerr Team',
        version: '1.0.0',
        created: new Date('2024-01-01'),
        updated: new Date('2024-01-01')
      },
      
      config: {
        priority: 7,
        capabilities: ['grammar-check', 'style-improvement', 'clarity-boost'],
        dependencies: [],
        constraints: {
          maxOutputLength: 10000,
          minConfidenceScore: 0.8,
          executionTimeout: 5000
        },
        trackEditsConfig: {
          batchingStrategy: 'batch',
          clusterStrategy: 'sentence',
          confidenceThreshold: 0.8,
          changeCategories: ['grammar', 'style', 'clarity'],
          requiresReview: false
        }
      },
      
      systemPromptTemplate: `You are a {{role}} specializing in {{focus_area}}. Your goal is to improve text {{improvement_style}} while preserving the author's voice.

Key guidelines:
- {{primary_guideline}}
- {{secondary_guideline}}
- {{tertiary_guideline}}

{{additional_instructions}}`,
      
      exampleTemplates: [
        {
          title: 'Basic Grammar Fix',
          input: 'The team don\'t have any issues with the new system.',
          expectedOutput: 'The team doesn\'t have any issues with the new system.',
          explanation: 'Corrected subject-verb agreement error'
        }
      ],
      
      variables: [
        {
          key: 'role',
          name: 'Editor Role',
          description: 'The type of editor role to assume',
          type: 'select',
          required: true,
          defaultValue: 'professional copy editor',
          options: ['copy editor', 'professional copy editor', 'senior editor', 'freelance editor']
        },
        {
          key: 'focus_area',
          name: 'Focus Area',
          description: 'Primary area of editorial focus',
          type: 'select',
          required: true,
          defaultValue: 'clarity and flow',
          options: ['grammar and syntax', 'clarity and flow', 'style and tone', 'comprehensive editing']
        },
        {
          key: 'improvement_style',
          name: 'Improvement Style',
          description: 'How aggressively to improve the text',
          type: 'select',
          required: true,
          defaultValue: 'with a light touch',
          options: ['minimally', 'with a light touch', 'substantially', 'comprehensively']
        },
        {
          key: 'primary_guideline',
          name: 'Primary Guideline',
          description: 'Main editorial principle',
          type: 'string',
          required: true,
          defaultValue: 'Preserve the author\'s unique voice and style'
        },
        {
          key: 'secondary_guideline',
          name: 'Secondary Guideline',
          description: 'Second most important principle',
          type: 'string',
          required: true,
          defaultValue: 'Make only changes that genuinely improve clarity'
        },
        {
          key: 'tertiary_guideline',
          name: 'Tertiary Guideline',
          description: 'Third editorial principle',
          type: 'string',
          required: false,
          defaultValue: 'Maintain consistent tone throughout'
        },
        {
          key: 'additional_instructions',
          name: 'Additional Instructions',
          description: 'Any additional specific instructions',
          type: 'string',
          required: false,
          defaultValue: ''
        }
      ],
      
      documentation: {
        overview: 'A beginner-friendly template for creating copy editing functions',
        usage: 'Perfect for general text improvement tasks',
        customization: 'Customize the role, focus area, and guidelines to match your needs',
        examples: 'Use this template for blog posts, articles, and general writing improvement'
      }
    });

    // Specialized Proofreader Template
    this.registerTemplate({
      id: 'specialized-proofreader',
      name: 'Specialized Proofreader',
      description: 'Focused proofreading template for specific domains',
      category: 'proofreader',
      difficulty: 'intermediate',
      tags: ['proofreading', 'specialized', 'domain-specific'],
      
      metadata: {
        author: 'Writerr Team',
        version: '1.0.0',
        created: new Date('2024-01-01'),
        updated: new Date('2024-01-01')
      },
      
      config: {
        priority: 9,
        capabilities: ['grammar-check', 'spell-check', 'domain-terminology'],
        dependencies: [],
        constraints: {
          maxOutputLength: 8000,
          minConfidenceScore: 0.95,
          executionTimeout: 4000
        }
      },
      
      systemPromptTemplate: `You are a specialized proofreader with expertise in {{domain}}. Focus exclusively on correcting technical errors without changing style or content.

Domain-specific requirements:
- {{domain_requirement_1}}
- {{domain_requirement_2}}
- {{domain_requirement_3}}

Error types to correct:
{{#each error_types}}
- {{this}}
{{/each}}

Confidence threshold: {{confidence_threshold}}%`,
      
      variables: [
        {
          key: 'domain',
          name: 'Specialization Domain',
          description: 'The domain of expertise for this proofreader',
          type: 'select',
          required: true,
          defaultValue: 'academic writing',
          options: ['academic writing', 'technical documentation', 'legal documents', 'medical texts', 'business correspondence', 'creative writing']
        },
        {
          key: 'domain_requirement_1',
          name: 'Primary Domain Requirement',
          description: 'Most important requirement for this domain',
          type: 'string',
          required: true,
          defaultValue: 'Maintain formal academic tone'
        },
        {
          key: 'domain_requirement_2',
          name: 'Secondary Domain Requirement',
          description: 'Second requirement for this domain',
          type: 'string',
          required: true,
          defaultValue: 'Preserve technical terminology accuracy'
        },
        {
          key: 'domain_requirement_3',
          name: 'Tertiary Domain Requirement',
          description: 'Third requirement for this domain',
          type: 'string',
          required: false,
          defaultValue: 'Follow citation format standards'
        },
        {
          key: 'error_types',
          name: 'Error Types to Check',
          description: 'Types of errors this proofreader should focus on',
          type: 'array',
          required: true,
          defaultValue: ['grammar', 'spelling', 'punctuation']
        },
        {
          key: 'confidence_threshold',
          name: 'Confidence Threshold',
          description: 'Minimum confidence percentage for making corrections',
          type: 'number',
          required: true,
          defaultValue: 95,
          validation: { min: 80, max: 99 }
        }
      ],
      
      documentation: {
        overview: 'Create domain-specific proofreaders with specialized knowledge',
        usage: 'Perfect for technical, academic, or professional documents',
        customization: 'Specify the domain and customize requirements and error types',
        examples: 'Great for medical papers, legal documents, or technical manuals'
      }
    });

    // Creative Writing Assistant Template
    this.registerTemplate({
      id: 'creative-writing-assistant',
      name: 'Creative Writing Assistant',
      description: 'Advanced template for creative content generation and enhancement',
      category: 'co-writer',
      difficulty: 'advanced',
      tags: ['creative', 'writing-assistant', 'content-generation'],
      
      metadata: {
        author: 'Writerr Team',
        version: '1.0.0',
        created: new Date('2024-01-01'),
        updated: new Date('2024-01-01')
      },
      
      config: {
        priority: 4,
        capabilities: ['content-generation', 'voice-matching', 'creative-enhancement'],
        dependencies: [],
        constraints: {
          maxOutputLength: 20000,
          minConfidenceScore: 0.7,
          executionTimeout: 12000
        }
      },
      
      systemPromptTemplate: `You are a {{writer_type}} specializing in {{genre}} writing. Your role is to {{primary_function}} while maintaining the author's {{voice_aspect}}.

Creative Focus:
- {{creative_focus_1}}
- {{creative_focus_2}}
- {{creative_focus_3}}

Style Guidelines:
- {{style_guideline_1}}
- {{style_guideline_2}}

{{special_instructions}}`,
      
      variables: [
        {
          key: 'writer_type',
          name: 'Writer Type',
          description: 'Type of creative writer to emulate',
          type: 'select',
          required: true,
          defaultValue: 'creative writing partner',
          options: ['creative writing partner', 'ghostwriter', 'content developer', 'story consultant']
        },
        {
          key: 'genre',
          name: 'Genre Specialization',
          description: 'The genre this assistant specializes in',
          type: 'select',
          required: true,
          defaultValue: 'general fiction',
          options: ['general fiction', 'mystery', 'romance', 'science fiction', 'fantasy', 'literary fiction', 'non-fiction', 'memoir']
        },
        {
          key: 'primary_function',
          name: 'Primary Function',
          description: 'Main role in the writing process',
          type: 'select',
          required: true,
          defaultValue: 'generate complementary content',
          options: ['generate complementary content', 'expand existing ideas', 'bridge narrative gaps', 'enhance descriptions']
        },
        {
          key: 'voice_aspect',
          name: 'Voice Aspect to Preserve',
          description: 'Key aspect of author\'s voice to maintain',
          type: 'string',
          required: true,
          defaultValue: 'unique style and perspective'
        },
        {
          key: 'creative_focus_1',
          name: 'Primary Creative Focus',
          description: 'Main creative element to enhance',
          type: 'string',
          required: true,
          defaultValue: 'Character development and authenticity'
        },
        {
          key: 'creative_focus_2',
          name: 'Secondary Creative Focus',
          description: 'Second creative element to enhance',
          type: 'string',
          required: true,
          defaultValue: 'Narrative flow and pacing'
        },
        {
          key: 'creative_focus_3',
          name: 'Tertiary Creative Focus',
          description: 'Third creative element to enhance',
          type: 'string',
          required: false,
          defaultValue: 'Atmospheric and sensory details'
        },
        {
          key: 'style_guideline_1',
          name: 'Primary Style Guideline',
          description: 'Most important style consideration',
          type: 'string',
          required: true,
          defaultValue: 'Match the author\'s sentence structure and rhythm'
        },
        {
          key: 'style_guideline_2',
          name: 'Secondary Style Guideline',
          description: 'Second style consideration',
          type: 'string',
          required: true,
          defaultValue: 'Maintain consistent point of view and tense'
        },
        {
          key: 'special_instructions',
          name: 'Special Instructions',
          description: 'Any genre-specific or unique instructions',
          type: 'string',
          required: false,
          defaultValue: ''
        }
      ],
      
      documentation: {
        overview: 'Advanced template for creative writing assistance and content generation',
        usage: 'Ideal for novelists, short story writers, and creative content creators',
        customization: 'Specify genre, function, and creative focus areas',
        examples: 'Perfect for expanding scenes, developing characters, or bridging plot gaps'
      }
    });
  }

  private buildFunctionDefinition(
    template: FunctionTemplate,
    variables: Record<string, any>,
    options?: TemplateOptions
  ): string {
    let definition = '---\n';
    
    // Build frontmatter
    definition += `id: ${this.interpolateString(template.id, variables)}\n`;
    definition += `name: ${this.interpolateString(template.name, variables)}\n`;
    definition += `version: ${template.metadata.version}\n`;
    definition += `description: ${this.interpolateString(template.description, variables)}\n`;
    definition += `author: ${template.metadata.author}\n`;
    definition += `category: ${template.category}\n`;
    definition += `capabilities: [${template.config.capabilities.join(', ')}]\n`;
    definition += `dependencies: [${template.config.dependencies.join(', ')}]\n`;
    definition += `priority: ${template.config.priority}\n`;
    definition += `enabled: true\n`;
    
    // Add constraints if present
    if (template.config.constraints) {
      definition += 'constraints:\n';
      Object.entries(template.config.constraints).forEach(([key, value]) => {
        if (value !== undefined) {
          definition += `  ${key}: ${value}\n`;
        }
      });
    }
    
    // Add Track Edits config if present
    if (template.config.trackEditsConfig) {
      definition += 'trackEdits:\n';
      Object.entries(template.config.trackEditsConfig).forEach(([key, value]) => {
        if (value !== undefined) {
          if (Array.isArray(value)) {
            definition += `  ${key}: [${value.join(', ')}]\n`;
          } else {
            definition += `  ${key}: ${value}\n`;
          }
        }
      });
    }
    
    definition += `created: ${template.metadata.created.toISOString().split('T')[0]}\n`;
    definition += `updated: ${new Date().toISOString().split('T')[0]}\n`;
    definition += '---\n\n';
    
    // System Prompt
    definition += '## System Prompt\n\n';
    definition += this.interpolateString(template.systemPromptTemplate, variables) + '\n\n';
    
    // User Prompt (if present)
    if (template.userPromptTemplate && (options?.includeExamples !== false)) {
      definition += '## User Prompt\n\n';
      definition += this.interpolateString(template.userPromptTemplate, variables) + '\n\n';
    }
    
    // Examples
    if (template.exampleTemplates.length > 0 && (options?.includeExamples !== false)) {
      definition += '## Examples\n\n';
      template.exampleTemplates.forEach((example, index) => {
        definition += `### Example ${index + 1}: ${example.title}\n\n`;
        definition += `**Input:** ${this.interpolateString(example.input, variables)}\n\n`;
        definition += `**Expected Output:** ${this.interpolateString(example.expectedOutput, variables)}\n\n`;
        definition += `**Explanation:** ${this.interpolateString(example.explanation, variables)}\n\n`;
      });
    }
    
    // Schema (if present)
    if (template.schemaTemplate && (options?.includeSchema !== false)) {
      definition += '## Schema\n\n```json\n';
      definition += JSON.stringify(template.schemaTemplate, null, 2);
      definition += '\n```\n\n';
    }
    
    // Preprocessing (if present)
    if (template.preprocessingTemplate && (options?.includePreprocessing !== false)) {
      definition += '## Preprocessing\n\n';
      definition += this.interpolateString(template.preprocessingTemplate, variables) + '\n\n';
    }
    
    // Postprocessing (if present)
    if (template.postprocessingTemplate && (options?.includePostprocessing !== false)) {
      definition += '## Postprocessing\n\n';
      definition += this.interpolateString(template.postprocessingTemplate, variables) + '\n\n';
    }
    
    return definition;
  }

  private interpolateString(template: string, variables: Record<string, any>): string {
    let result = template;
    
    // Simple variable substitution {{variable}}
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, String(value));
    });
    
    // Handle array variables with {{#each}}
    result = result.replace(/{{#each\s+(\w+)}}([\s\S]*?){{\/each}}/g, (match, arrayKey, content) => {
      const array = variables[arrayKey];
      if (Array.isArray(array)) {
        return array.map(item => content.replace(/{{this}}/g, String(item))).join('');
      }
      return '';
    });
    
    return result;
  }

  private generateFilePath(template: FunctionTemplate, variables: Record<string, any>): string {
    const sanitizedName = this.interpolateString(template.name, variables)
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-');
    
    return `functions/${sanitizedName}.md`;
  }

  private generateTemplateId(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
  }

  private mergeWithDefaults(template: FunctionTemplate, variables: Record<string, any>): Record<string, any> {
    const result = { ...variables };
    
    template.variables.forEach(variable => {
      if (!(variable.key in result) && variable.defaultValue !== undefined) {
        result[variable.key] = variable.defaultValue;
      }
    });
    
    return result;
  }

  private validateVariableType(variable: TemplateVariable, value: any): boolean {
    switch (variable.type) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' && !isNaN(value);
      case 'boolean':
        return typeof value === 'boolean';
      case 'array':
        return Array.isArray(value);
      case 'select':
        return variable.options ? variable.options.includes(value) : true;
      default:
        return true;
    }
  }

  private validateVariableValue(variable: TemplateVariable, value: any): { isValid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    if (!variable.validation) {
      return { isValid: true, errors, warnings };
    }
    
    const validation = variable.validation;
    
    if (typeof value === 'string') {
      if (validation.pattern && !new RegExp(validation.pattern).test(value)) {
        errors.push(`Variable '${variable.key}' does not match required pattern`);
      }
      if (validation.minLength && value.length < validation.minLength) {
        errors.push(`Variable '${variable.key}' is too short (minimum ${validation.minLength} characters)`);
      }
      if (validation.maxLength && value.length > validation.maxLength) {
        warnings.push(`Variable '${variable.key}' is very long (maximum recommended ${validation.maxLength} characters)`);
      }
    }
    
    if (typeof value === 'number') {
      if (validation.min !== undefined && value < validation.min) {
        errors.push(`Variable '${variable.key}' is below minimum value ${validation.min}`);
      }
      if (validation.max !== undefined && value > validation.max) {
        errors.push(`Variable '${variable.key}' is above maximum value ${validation.max}`);
      }
    }
    
    return { isValid: errors.length === 0, errors, warnings };
  }
}