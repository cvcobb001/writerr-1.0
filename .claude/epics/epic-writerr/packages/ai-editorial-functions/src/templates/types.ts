/**
 * @fileoverview Types for function template system
 */

import { TrackEditsConfig, FunctionConstraints } from '../types';

export type TemplateCategory = 
  | 'copy-editor' 
  | 'proofreader' 
  | 'developmental-editor' 
  | 'co-writer' 
  | 'custom'
  | 'specialized';

export interface FunctionTemplate {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  tags: string[];
  
  // Template metadata
  metadata: {
    author?: string;
    version: string;
    created: Date;
    updated: Date;
  };
  
  // Function configuration template
  config: {
    priority: number;
    capabilities: string[];
    dependencies: string[];
    constraints?: Partial<FunctionConstraints>;
    trackEditsConfig?: Partial<TrackEditsConfig>;
  };
  
  // Content templates
  systemPromptTemplate: string;
  userPromptTemplate?: string;
  exampleTemplates: ExampleTemplate[];
  schemaTemplate?: any;
  preprocessingTemplate?: string;
  postprocessingTemplate?: string;
  
  // Variables for customization
  variables: TemplateVariable[];
  
  // Documentation
  documentation: {
    overview: string;
    usage: string;
    customization: string;
    examples: string;
  };
}

export interface ExampleTemplate {
  title: string;
  input: string;
  expectedOutput: string;
  explanation: string;
  variables?: Record<string, string>;
}

export interface TemplateVariable {
  key: string;
  name: string;
  description: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'select';
  required: boolean;
  defaultValue?: any;
  options?: string[]; // For select type
  validation?: {
    pattern?: string;
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
  };
}

export interface TemplateOptions {
  category?: TemplateCategory;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  includeExamples?: boolean;
  includeSchema?: boolean;
  includePreprocessing?: boolean;
  includePostprocessing?: boolean;
  customVariables?: Record<string, any>;
}

export interface GeneratedTemplate {
  functionDefinition: string; // The generated .md file content
  filePath: string; // Suggested file path
  variables: Record<string, any>; // Variable values used
  warnings: string[]; // Any warnings about the generated template
  suggestions: string[]; // Suggestions for customization
}

export interface TemplateValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}