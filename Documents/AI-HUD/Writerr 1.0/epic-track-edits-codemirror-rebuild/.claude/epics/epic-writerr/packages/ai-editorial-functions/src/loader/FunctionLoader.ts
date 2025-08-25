/**
 * @fileoverview Function loader for parsing .md and .xml function definition files
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { globalEventBus } from '@writerr/shared';
import {
  FunctionDefinition,
  FunctionMetadata,
  FunctionLoadResult,
  ParsedFunctionContent,
  FunctionExample,
  FunctionLoadError,
  TrackEditsConfig,
  FunctionConstraints
} from '../types';

interface FrontMatter {
  [key: string]: any;
}

export class FunctionLoader {
  private supportedExtensions = new Set(['.md', '.xml']);

  /**
   * Load a function from a file
   */
  async loadFromFile(filePath: string): Promise<FunctionLoadResult> {
    const result: FunctionLoadResult = {
      success: false,
      errors: [],
      warnings: []
    };

    try {
      // Validate file exists
      if (!fs.existsSync(filePath)) {
        result.errors.push(`File not found: ${filePath}`);
        return result;
      }

      // Validate file extension
      const ext = path.extname(filePath).toLowerCase();
      if (!this.supportedExtensions.has(ext)) {
        result.errors.push(`Unsupported file extension: ${ext}`);
        return result;
      }

      // Read file content
      const content = await fs.promises.readFile(filePath, 'utf-8');
      if (!content.trim()) {
        result.errors.push('File is empty');
        return result;
      }

      // Parse based on file type
      let definition: FunctionDefinition;
      if (ext === '.md') {
        definition = await this.parseMarkdownFunction(filePath, content);
      } else if (ext === '.xml') {
        definition = await this.parseXMLFunction(filePath, content);
      } else {
        throw new Error(`Unsupported extension: ${ext}`);
      }

      // Validate parsed definition
      const validationResult = this.validateDefinition(definition);
      result.errors.push(...validationResult.errors);
      result.warnings.push(...validationResult.warnings);

      if (validationResult.errors.length === 0) {
        result.success = true;
        result.function = definition;
      }

      return result;
    } catch (error) {
      result.errors.push(`Parse error: ${(error as Error).message}`);
      return result;
    }
  }

  /**
   * Parse a markdown function definition
   */
  private async parseMarkdownFunction(filePath: string, content: string): Promise<FunctionDefinition> {
    const { frontMatter, body } = this.parseMarkdownFrontMatter(content);
    
    // Extract metadata from frontmatter
    const metadata = this.extractMetadata(frontMatter, filePath);
    
    // Parse body content
    const parsedContent = this.parseMarkdownBody(body);
    
    // Create function definition
    const definition: FunctionDefinition = {
      ...metadata,
      filePath,
      fileType: 'md',
      content,
      parsedContent,
      hash: this.generateHash(content),
      loadedAt: new Date()
    };

    return definition;
  }

  /**
   * Parse an XML function definition
   */
  private async parseXMLFunction(filePath: string, content: string): Promise<FunctionDefinition> {
    // Simple XML parser - in a real implementation, you'd use a proper XML parser
    const xmlData = this.parseXML(content);
    
    // Extract metadata
    const metadata = this.extractXMLMetadata(xmlData, filePath);
    
    // Parse content
    const parsedContent = this.parseXMLContent(xmlData);
    
    // Create function definition
    const definition: FunctionDefinition = {
      ...metadata,
      filePath,
      fileType: 'xml',
      content,
      parsedContent,
      hash: this.generateHash(content),
      loadedAt: new Date()
    };

    return definition;
  }

  /**
   * Parse markdown frontmatter
   */
  private parseMarkdownFrontMatter(content: string): { frontMatter: FrontMatter; body: string } {
    const frontMatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
    const match = content.match(frontMatterRegex);
    
    if (!match) {
      return { frontMatter: {}, body: content };
    }

    const yamlContent = match[1];
    const body = match[2];
    
    // Simple YAML parser (in production, use a proper YAML parser)
    const frontMatter: FrontMatter = {};
    const lines = yamlContent.split('\n');
    
    for (const line of lines) {
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const key = line.substring(0, colonIndex).trim();
        let value = line.substring(colonIndex + 1).trim();
        
        // Handle arrays
        if (value.startsWith('[') && value.endsWith(']')) {
          value = value.slice(1, -1).split(',').map(v => v.trim().replace(/['"]/g, ''));
        }
        // Handle numbers
        else if (!isNaN(Number(value))) {
          value = Number(value);
        }
        // Handle booleans
        else if (value === 'true' || value === 'false') {
          value = value === 'true';
        }
        // Handle strings
        else {
          value = value.replace(/['"]/g, '');
        }
        
        frontMatter[key] = value;
      }
    }
    
    return { frontMatter, body };
  }

  /**
   * Extract metadata from frontmatter
   */
  private extractMetadata(frontMatter: FrontMatter, filePath: string): FunctionMetadata {
    const fileName = path.basename(filePath, path.extname(filePath));
    
    return {
      id: frontMatter.id || fileName,
      name: frontMatter.name || fileName,
      version: frontMatter.version || '1.0.0',
      description: frontMatter.description || '',
      author: frontMatter.author,
      category: frontMatter.category || 'custom',
      capabilities: Array.isArray(frontMatter.capabilities) ? frontMatter.capabilities : [],
      dependencies: Array.isArray(frontMatter.dependencies) ? frontMatter.dependencies : [],
      constraints: this.parseConstraints(frontMatter.constraints),
      trackEditsConfig: this.parseTrackEditsConfig(frontMatter.trackEdits),
      priority: frontMatter.priority || 0,
      enabled: frontMatter.enabled !== false,
      createdAt: new Date(frontMatter.created || Date.now()),
      updatedAt: new Date(frontMatter.updated || Date.now())
    };
  }

  /**
   * Parse markdown body content
   */
  private parseMarkdownBody(body: string): ParsedFunctionContent {
    const sections = this.parseMarkdownSections(body);
    
    return {
      systemPrompt: sections['system'] || sections['prompt'] || '',
      userPrompt: sections['user'] || '',
      examples: this.parseExamples(sections['examples'] || ''),
      schema: this.parseJSONSchema(sections['schema'] || ''),
      preprocessing: sections['preprocessing'] || sections['preprocess'] || '',
      postprocessing: sections['postprocessing'] || sections['postprocess'] || ''
    };
  }

  /**
   * Parse markdown into sections
   */
  private parseMarkdownSections(body: string): Record<string, string> {
    const sections: Record<string, string> = {};
    const sectionRegex = /^##\s+(.+)$/gm;
    
    let lastIndex = 0;
    let match;
    let currentSection = '';
    
    while ((match = sectionRegex.exec(body)) !== null) {
      // Save previous section content
      if (currentSection) {
        sections[currentSection] = body.substring(lastIndex, match.index).trim();
      }
      
      currentSection = match[1].toLowerCase().replace(/\s+/g, '-');
      lastIndex = match.index + match[0].length;
    }
    
    // Save last section
    if (currentSection) {
      sections[currentSection] = body.substring(lastIndex).trim();
    }
    
    // If no sections found, treat entire body as system prompt
    if (Object.keys(sections).length === 0) {
      sections['system'] = body.trim();
    }
    
    return sections;
  }

  /**
   * Parse examples from markdown
   */
  private parseExamples(examplesText: string): FunctionExample[] {
    const examples: FunctionExample[] = [];
    const exampleRegex = /### Example \d+[\s\S]*?(?=### Example \d+|$)/g;
    
    let match;
    while ((match = exampleRegex.exec(examplesText)) !== null) {
      const exampleText = match[0];
      const inputMatch = exampleText.match(/\*\*Input:\*\*\s*([\s\S]*?)(?=\*\*Output:\*\*|\*\*Expected:\*\*)/);
      const outputMatch = exampleText.match(/\*\*(?:Output|Expected):\*\*\s*([\s\S]*?)(?=\*\*|$)/);
      const explanationMatch = exampleText.match(/\*\*Explanation:\*\*\s*([\s\S]*?)$/);
      
      if (inputMatch && outputMatch) {
        examples.push({
          input: inputMatch[1].trim(),
          expectedOutput: outputMatch[1].trim(),
          explanation: explanationMatch ? explanationMatch[1].trim() : undefined
        });
      }
    }
    
    return examples;
  }

  /**
   * Parse JSON schema
   */
  private parseJSONSchema(schemaText: string): any {
    if (!schemaText.trim()) {
      return undefined;
    }
    
    try {
      // Extract JSON from markdown code blocks
      const jsonMatch = schemaText.match(/```(?:json)?\s*([\s\S]*?)```/);
      const jsonText = jsonMatch ? jsonMatch[1] : schemaText;
      
      return JSON.parse(jsonText);
    } catch (error) {
      console.warn('Failed to parse JSON schema:', error);
      return undefined;
    }
  }

  /**
   * Parse constraints from frontmatter
   */
  private parseConstraints(constraints: any): FunctionConstraints | undefined {
    if (!constraints || typeof constraints !== 'object') {
      return undefined;
    }
    
    return {
      forbiddenPhrases: Array.isArray(constraints.forbiddenPhrases) ? constraints.forbiddenPhrases : [],
      forbiddenActions: Array.isArray(constraints.forbiddenActions) ? constraints.forbiddenActions : [],
      maxOutputLength: constraints.maxOutputLength,
      minConfidenceScore: constraints.minConfidenceScore,
      requiredSchemas: Array.isArray(constraints.requiredSchemas) ? constraints.requiredSchemas : [],
      executionTimeout: constraints.executionTimeout,
      memoryLimit: constraints.memoryLimit
    };
  }

  /**
   * Parse Track Edits configuration
   */
  private parseTrackEditsConfig(config: any): TrackEditsConfig | undefined {
    if (!config || typeof config !== 'object') {
      return undefined;
    }
    
    return {
      batchingStrategy: config.batchingStrategy || 'batch',
      clusterStrategy: config.clusterStrategy || 'sentence',
      confidenceThreshold: config.confidenceThreshold || 0.8,
      changeCategories: Array.isArray(config.changeCategories) ? config.changeCategories : [],
      requiresReview: config.requiresReview || false
    };
  }

  /**
   * Simple XML parser (in production, use a proper XML parser like xml2js)
   */
  private parseXML(content: string): any {
    // This is a very basic XML parser - in production use xml2js or similar
    const result: any = {};
    
    // Extract basic elements
    const elementRegex = /<([^>]+)>([\s\S]*?)<\/\1>/g;
    let match;
    
    while ((match = elementRegex.exec(content)) !== null) {
      const tagName = match[1];
      const value = match[2].trim();
      
      result[tagName] = value;
    }
    
    return result;
  }

  /**
   * Extract metadata from XML
   */
  private extractXMLMetadata(xmlData: any, filePath: string): FunctionMetadata {
    const fileName = path.basename(filePath, path.extname(filePath));
    
    return {
      id: xmlData.id || fileName,
      name: xmlData.name || fileName,
      version: xmlData.version || '1.0.0',
      description: xmlData.description || '',
      author: xmlData.author,
      category: xmlData.category || 'custom',
      capabilities: xmlData.capabilities ? xmlData.capabilities.split(',').map((c: string) => c.trim()) : [],
      dependencies: xmlData.dependencies ? xmlData.dependencies.split(',').map((d: string) => d.trim()) : [],
      constraints: xmlData.constraints ? JSON.parse(xmlData.constraints) : undefined,
      trackEditsConfig: xmlData.trackEditsConfig ? JSON.parse(xmlData.trackEditsConfig) : undefined,
      priority: xmlData.priority ? parseInt(xmlData.priority) : 0,
      enabled: xmlData.enabled !== 'false',
      createdAt: new Date(xmlData.created || Date.now()),
      updatedAt: new Date(xmlData.updated || Date.now())
    };
  }

  /**
   * Parse XML content
   */
  private parseXMLContent(xmlData: any): ParsedFunctionContent {
    return {
      systemPrompt: xmlData.systemPrompt || xmlData.prompt || '',
      userPrompt: xmlData.userPrompt || '',
      examples: xmlData.examples ? this.parseXMLExamples(xmlData.examples) : [],
      schema: xmlData.schema ? JSON.parse(xmlData.schema) : undefined,
      preprocessing: xmlData.preprocessing || '',
      postprocessing: xmlData.postprocessing || ''
    };
  }

  /**
   * Parse examples from XML
   */
  private parseXMLExamples(examplesXML: string): FunctionExample[] {
    const examples: FunctionExample[] = [];
    const exampleRegex = /<example>([\s\S]*?)<\/example>/g;
    
    let match;
    while ((match = exampleRegex.exec(examplesXML)) !== null) {
      const exampleContent = match[1];
      const inputMatch = exampleContent.match(/<input>([\s\S]*?)<\/input>/);
      const outputMatch = exampleContent.match(/<output>([\s\S]*?)<\/output>/);
      const explanationMatch = exampleContent.match(/<explanation>([\s\S]*?)<\/explanation>/);
      
      if (inputMatch && outputMatch) {
        examples.push({
          input: inputMatch[1].trim(),
          expectedOutput: outputMatch[1].trim(),
          explanation: explanationMatch ? explanationMatch[1].trim() : undefined
        });
      }
    }
    
    return examples;
  }

  /**
   * Validate function definition
   */
  private validateDefinition(definition: FunctionDefinition): { errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Required fields
    if (!definition.id) errors.push('Function ID is required');
    if (!definition.name) errors.push('Function name is required');
    if (!definition.version) errors.push('Version is required');
    if (!definition.parsedContent.systemPrompt) errors.push('System prompt is required');
    
    // ID validation
    if (definition.id && !/^[a-zA-Z0-9-_]+$/.test(definition.id)) {
      errors.push('Function ID must contain only letters, numbers, hyphens, and underscores');
    }
    
    // Version validation
    if (definition.version && !/^\d+\.\d+\.\d+$/.test(definition.version)) {
      warnings.push('Version should follow semantic versioning (x.y.z)');
    }
    
    // Category validation
    const validCategories = ['copy-editor', 'proofreader', 'developmental-editor', 'co-writer', 'custom'];
    if (!validCategories.includes(definition.category)) {
      warnings.push(`Unknown category: ${definition.category}`);
    }
    
    // Constraints validation
    if (definition.constraints) {
      if (definition.constraints.executionTimeout && definition.constraints.executionTimeout < 100) {
        warnings.push('Execution timeout is very low (< 100ms)');
      }
      if (definition.constraints.executionTimeout && definition.constraints.executionTimeout > 30000) {
        warnings.push('Execution timeout is very high (> 30s)');
      }
    }
    
    return { errors, warnings };
  }

  /**
   * Generate content hash for change detection
   */
  private generateHash(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Load multiple functions from a directory
   */
  async loadFromDirectory(dirPath: string, recursive = true): Promise<FunctionLoadResult[]> {
    const results: FunctionLoadResult[] = [];
    
    try {
      const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        
        if (entry.isFile() && this.supportedExtensions.has(path.extname(entry.name).toLowerCase())) {
          const result = await this.loadFromFile(fullPath);
          results.push(result);
        } else if (entry.isDirectory() && recursive) {
          const subResults = await this.loadFromDirectory(fullPath, recursive);
          results.push(...subResults);
        }
      }
    } catch (error) {
      results.push({
        success: false,
        errors: [`Failed to read directory ${dirPath}: ${(error as Error).message}`],
        warnings: []
      });
    }
    
    return results;
  }

  /**
   * Check if file has been modified since last load
   */
  async hasFileChanged(filePath: string, lastHash: string): Promise<boolean> {
    try {
      const content = await fs.promises.readFile(filePath, 'utf-8');
      const currentHash = this.generateHash(content);
      return currentHash !== lastHash;
    } catch (error) {
      // File doesn't exist or can't be read - consider it changed
      return true;
    }
  }
}

// Export singleton instance
export const functionLoader = new FunctionLoader();