/**
 * @fileoverview Manager for function templates and template-based function creation
 */

import { TemplateGenerator } from './TemplateGenerator';
import { functionLoader } from '../loader/FunctionLoader';
import {
  FunctionTemplate,
  TemplateCategory,
  TemplateOptions,
  GeneratedTemplate,
  TemplateValidationResult
} from './types';
import { FunctionDefinition, FunctionLoadResult } from '../types';
import * as fs from 'fs';
import * as path from 'path';

export class FunctionTemplateManager {
  private templateGenerator: TemplateGenerator;
  private templateCachePath: string;

  constructor(templateCachePath?: string) {
    this.templateGenerator = new TemplateGenerator();
    this.templateCachePath = templateCachePath || './templates/cache';
    this.ensureCacheDirectory();
  }

  /**
   * Create a function from a template
   */
  async createFunctionFromTemplate(
    templateId: string,
    variables: Record<string, any>,
    outputPath?: string,
    options?: TemplateOptions
  ): Promise<{
    generatedTemplate: GeneratedTemplate;
    functionDefinition?: FunctionDefinition;
    loadResult: FunctionLoadResult;
  }> {
    // Generate the template
    const generatedTemplate = this.templateGenerator.generateFromTemplate(
      templateId,
      variables,
      options
    );

    // Determine output path
    const finalOutputPath = outputPath || path.join(
      process.cwd(), 
      'functions', 
      generatedTemplate.filePath
    );

    // Ensure output directory exists
    const outputDir = path.dirname(finalOutputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Write the function definition to file
    await fs.promises.writeFile(finalOutputPath, generatedTemplate.functionDefinition, 'utf-8');

    // Load and validate the generated function
    const loadResult = await functionLoader.loadFromFile(finalOutputPath);

    return {
      generatedTemplate,
      functionDefinition: loadResult.function,
      loadResult
    };
  }

  /**
   * Preview a function template without creating files
   */
  previewTemplate(
    templateId: string,
    variables: Record<string, any>,
    options?: TemplateOptions
  ): GeneratedTemplate {
    return this.templateGenerator.generateFromTemplate(templateId, variables, options);
  }

  /**
   * Get all available templates
   */
  getAvailableTemplates(): FunctionTemplate[] {
    return this.templateGenerator.getTemplates();
  }

  /**
   * Get templates by category
   */
  getTemplatesByCategory(category: TemplateCategory): FunctionTemplate[] {
    return this.templateGenerator.getTemplatesByCategory(category);
  }

  /**
   * Get template by ID with full details
   */
  getTemplate(templateId: string): FunctionTemplate | undefined {
    return this.templateGenerator.getTemplate(templateId);
  }

  /**
   * Create a guided function creation experience
   */
  async createFunctionInteractively(templateId: string): Promise<{
    template: FunctionTemplate;
    requiredVariables: Array<{
      key: string;
      name: string;
      description: string;
      type: string;
      required: boolean;
      options?: string[];
      defaultValue?: any;
    }>;
    previewGenerator: (variables: Record<string, any>) => GeneratedTemplate;
    finalizer: (variables: Record<string, any>, outputPath?: string) => Promise<{
      generatedTemplate: GeneratedTemplate;
      functionDefinition?: FunctionDefinition;
      loadResult: FunctionLoadResult;
    }>;
  }> {
    const template = this.templateGenerator.getTemplate(templateId);
    
    if (!template) {
      throw new Error(`Template '${templateId}' not found`);
    }

    return {
      template,
      requiredVariables: template.variables.map(variable => ({
        key: variable.key,
        name: variable.name,
        description: variable.description,
        type: variable.type,
        required: variable.required,
        options: variable.options,
        defaultValue: variable.defaultValue
      })),
      previewGenerator: (variables: Record<string, any>) => 
        this.previewTemplate(templateId, variables),
      finalizer: (variables: Record<string, any>, outputPath?: string) =>
        this.createFunctionFromTemplate(templateId, variables, outputPath)
    };
  }

  /**
   * Validate template variables before generation
   */
  validateTemplateVariables(
    templateId: string, 
    variables: Record<string, any>
  ): TemplateValidationResult {
    const template = this.templateGenerator.getTemplate(templateId);
    
    if (!template) {
      return {
        isValid: false,
        errors: [`Template '${templateId}' not found`],
        warnings: [],
        suggestions: []
      };
    }

    return this.templateGenerator.validateVariables(template, variables);
  }

  /**
   * Create a custom template and register it
   */
  createCustomTemplate(
    name: string,
    category: TemplateCategory,
    systemPrompt: string,
    options?: Partial<FunctionTemplate>
  ): FunctionTemplate {
    const template = this.templateGenerator.createCustomTemplate(
      name,
      category,
      systemPrompt,
      options
    );

    this.templateGenerator.registerTemplate(template);
    this.cacheTemplate(template);
    
    return template;
  }

  /**
   * Import template from file
   */
  async importTemplateFromFile(templatePath: string): Promise<FunctionTemplate> {
    const templateContent = await fs.promises.readFile(templatePath, 'utf-8');
    const template = JSON.parse(templateContent) as FunctionTemplate;
    
    // Validate template structure
    this.validateTemplateStructure(template);
    
    this.templateGenerator.registerTemplate(template);
    this.cacheTemplate(template);
    
    return template;
  }

  /**
   * Export template to file
   */
  async exportTemplate(templateId: string, outputPath: string): Promise<void> {
    const template = this.templateGenerator.getTemplate(templateId);
    
    if (!template) {
      throw new Error(`Template '${templateId}' not found`);
    }

    const templateJson = JSON.stringify(template, null, 2);
    await fs.promises.writeFile(outputPath, templateJson, 'utf-8');
  }

  /**
   * Get template usage statistics
   */
  getTemplateStatistics(): {
    totalTemplates: number;
    templatesByCategory: Record<TemplateCategory, number>;
    templatesByDifficulty: Record<string, number>;
    mostUsedTags: Array<{ tag: string; count: number }>;
  } {
    const templates = this.getAvailableTemplates();
    
    const templatesByCategory = templates.reduce((acc, template) => {
      acc[template.category] = (acc[template.category] || 0) + 1;
      return acc;
    }, {} as Record<TemplateCategory, number>);

    const templatesByDifficulty = templates.reduce((acc, template) => {
      acc[template.difficulty] = (acc[template.difficulty] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Count tag usage
    const tagCounts: Record<string, number> = {};
    templates.forEach(template => {
      template.tags.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });

    const mostUsedTags = Object.entries(tagCounts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalTemplates: templates.length,
      templatesByCategory,
      templatesByDifficulty,
      mostUsedTags
    };
  }

  /**
   * Search templates by criteria
   */
  searchTemplates(criteria: {
    category?: TemplateCategory;
    difficulty?: string;
    tags?: string[];
    searchText?: string;
  }): FunctionTemplate[] {
    let templates = this.getAvailableTemplates();

    if (criteria.category) {
      templates = templates.filter(t => t.category === criteria.category);
    }

    if (criteria.difficulty) {
      templates = templates.filter(t => t.difficulty === criteria.difficulty);
    }

    if (criteria.tags && criteria.tags.length > 0) {
      templates = templates.filter(t => 
        criteria.tags!.some(tag => t.tags.includes(tag))
      );
    }

    if (criteria.searchText) {
      const searchLower = criteria.searchText.toLowerCase();
      templates = templates.filter(t => 
        t.name.toLowerCase().includes(searchLower) ||
        t.description.toLowerCase().includes(searchLower) ||
        t.tags.some(tag => tag.toLowerCase().includes(searchLower))
      );
    }

    return templates;
  }

  /**
   * Get template recommendations based on user needs
   */
  getTemplateRecommendations(userNeeds: {
    experience: 'beginner' | 'intermediate' | 'advanced';
    primaryUseCase: 'grammar' | 'style' | 'structure' | 'creativity' | 'specialized';
    contentType: 'academic' | 'business' | 'creative' | 'technical' | 'general';
  }): Array<{
    template: FunctionTemplate;
    score: number;
    reasons: string[];
  }> {
    const templates = this.getAvailableTemplates();
    const recommendations = templates.map(template => {
      let score = 0;
      const reasons: string[] = [];

      // Experience level matching
      if (template.difficulty === userNeeds.experience) {
        score += 3;
        reasons.push(`Matches your ${userNeeds.experience} experience level`);
      } else if (
        (userNeeds.experience === 'intermediate' && template.difficulty === 'beginner') ||
        (userNeeds.experience === 'advanced' && template.difficulty !== 'beginner')
      ) {
        score += 1;
        reasons.push('Suitable for your experience level');
      }

      // Use case matching
      const useCaseMapping = {
        'grammar': ['proofreader', 'copy-editor'],
        'style': ['copy-editor', 'developmental-editor'],
        'structure': ['developmental-editor'],
        'creativity': ['co-writer'],
        'specialized': ['specialized']
      };

      const relevantCategories = useCaseMapping[userNeeds.primaryUseCase] || [];
      if (relevantCategories.includes(template.category)) {
        score += 4;
        reasons.push(`Perfect for ${userNeeds.primaryUseCase} tasks`);
      }

      // Content type relevance
      const contentTypeKeywords = {
        'academic': ['academic', 'formal', 'research'],
        'business': ['business', 'professional', 'corporate'],
        'creative': ['creative', 'narrative', 'fiction'],
        'technical': ['technical', 'documentation', 'specialized'],
        'general': ['general', 'basic', 'versatile']
      };

      const keywords = contentTypeKeywords[userNeeds.contentType] || [];
      const hasRelevantKeywords = keywords.some(keyword =>
        template.name.toLowerCase().includes(keyword) ||
        template.description.toLowerCase().includes(keyword) ||
        template.tags.includes(keyword)
      );

      if (hasRelevantKeywords) {
        score += 2;
        reasons.push(`Designed for ${userNeeds.contentType} content`);
      }

      return { template, score, reasons };
    });

    return recommendations
      .filter(rec => rec.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }

  /**
   * Private helper methods
   */
  private ensureCacheDirectory(): void {
    if (!fs.existsSync(this.templateCachePath)) {
      fs.mkdirSync(this.templateCachePath, { recursive: true });
    }
  }

  private cacheTemplate(template: FunctionTemplate): void {
    const cachePath = path.join(this.templateCachePath, `${template.id}.json`);
    const templateJson = JSON.stringify(template, null, 2);
    fs.writeFileSync(cachePath, templateJson, 'utf-8');
  }

  private validateTemplateStructure(template: any): void {
    const requiredFields = [
      'id', 'name', 'description', 'category', 'difficulty',
      'metadata', 'config', 'systemPromptTemplate', 'variables', 'documentation'
    ];

    for (const field of requiredFields) {
      if (!(field in template)) {
        throw new Error(`Template is missing required field: ${field}`);
      }
    }

    if (!template.metadata.version) {
      throw new Error('Template metadata must include version');
    }

    if (!Array.isArray(template.variables)) {
      throw new Error('Template variables must be an array');
    }

    // Validate variable structure
    template.variables.forEach((variable: any, index: number) => {
      if (!variable.key || !variable.name || !variable.type) {
        throw new Error(`Template variable ${index} is missing required fields (key, name, type)`);
      }
    });
  }
}

// Export singleton instance
export const functionTemplateManager = new FunctionTemplateManager();