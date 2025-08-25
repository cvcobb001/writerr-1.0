/**
 * @fileoverview Manager for built-in editorial functions
 */

import { CopyEditor } from './CopyEditor';
import { Proofreader } from './Proofreader';
import { DevelopmentalEditor } from './DevelopmentalEditor';
import { CoWriter } from './CoWriter';
import {
  BuiltinFunctionType,
  BuiltinFunctionConfig,
  CopyEditorConfig,
  ProofreaderConfig,
  DevelopmentalEditorConfig,
  CoWriterConfig,
  BuiltinFunctionResult
} from './types';

export class BuiltinFunctionManager {
  private copyEditor?: CopyEditor;
  private proofreader?: Proofreader;
  private developmentalEditor?: DevelopmentalEditor;
  private coWriter?: CoWriter;
  
  private configs: Map<BuiltinFunctionType, BuiltinFunctionConfig> = new Map();

  /**
   * Initialize with default configurations
   */
  constructor() {
    this.initializeDefaultConfigs();
  }

  /**
   * Configure a built-in function
   */
  configure(functionType: BuiltinFunctionType, config: BuiltinFunctionConfig): void {
    this.configs.set(functionType, config);
    
    // Reinitialize the function with new configuration
    switch (functionType) {
      case 'copy-editor':
        this.copyEditor = new CopyEditor(config as CopyEditorConfig);
        break;
      case 'proofreader':
        this.proofreader = new Proofreader(config as ProofreaderConfig);
        break;
      case 'developmental-editor':
        this.developmentalEditor = new DevelopmentalEditor(config as DevelopmentalEditorConfig);
        break;
      case 'co-writer':
        this.coWriter = new CoWriter(config as CoWriterConfig);
        break;
    }
  }

  /**
   * Execute a built-in function
   */
  async execute(
    functionType: BuiltinFunctionType, 
    text: string, 
    context?: any
  ): Promise<BuiltinFunctionResult> {
    const config = this.configs.get(functionType);
    
    if (!config || !config.enabled) {
      return {
        functionId: functionType,
        success: false,
        error: `Function ${functionType} is not enabled or configured`
      };
    }

    try {
      switch (functionType) {
        case 'copy-editor':
          return await this.getCopyEditor().process(text, context);
        case 'proofreader':
          return await this.getProofreader().process(text, context);
        case 'developmental-editor':
          return await this.getDevelopmentalEditor().process(text, context);
        case 'co-writer':
          return await this.getCoWriter().process(text, context);
        default:
          return {
            functionId: functionType,
            success: false,
            error: `Unknown function type: ${functionType}`
          };
      }
    } catch (error) {
      return {
        functionId: functionType,
        success: false,
        error: `Execution failed: ${(error as Error).message}`
      };
    }
  }

  /**
   * Get all available built-in functions
   */
  getAvailableFunctions(): BuiltinFunctionType[] {
    return Array.from(this.configs.keys()).filter(type => 
      this.configs.get(type)?.enabled
    );
  }

  /**
   * Get function configuration
   */
  getConfiguration(functionType: BuiltinFunctionType): BuiltinFunctionConfig | undefined {
    return this.configs.get(functionType);
  }

  /**
   * Check if a function is enabled
   */
  isEnabled(functionType: BuiltinFunctionType): boolean {
    const config = this.configs.get(functionType);
    return config?.enabled || false;
  }

  /**
   * Get function priorities for execution ordering
   */
  getFunctionPriorities(): Map<BuiltinFunctionType, number> {
    const priorities = new Map<BuiltinFunctionType, number>();
    
    this.configs.forEach((config, type) => {
      if (config.enabled) {
        priorities.set(type, config.priority);
      }
    });
    
    return priorities;
  }

  /**
   * Execute multiple functions in priority order
   */
  async executeMultiple(
    functionTypes: BuiltinFunctionType[],
    text: string,
    context?: any
  ): Promise<BuiltinFunctionResult[]> {
    // Sort by priority (higher priority first)
    const sortedTypes = functionTypes
      .filter(type => this.isEnabled(type))
      .sort((a, b) => {
        const priorityA = this.configs.get(a)?.priority || 0;
        const priorityB = this.configs.get(b)?.priority || 0;
        return priorityB - priorityA;
      });

    const results: BuiltinFunctionResult[] = [];
    
    for (const functionType of sortedTypes) {
      const result = await this.execute(functionType, text, context);
      results.push(result);
      
      // If this function succeeded and modified the text, use the output for the next function
      if (result.success && result.output && result.output !== text) {
        text = result.output;
      }
    }
    
    return results;
  }

  /**
   * Get comprehensive analytics for all functions
   */
  getAnalytics(): {
    totalFunctions: number;
    enabledFunctions: number;
    functionConfigs: Record<string, any>;
  } {
    const totalFunctions = this.configs.size;
    const enabledFunctions = Array.from(this.configs.values())
      .filter(config => config.enabled).length;
    
    const functionConfigs: Record<string, any> = {};
    this.configs.forEach((config, type) => {
      functionConfigs[type] = {
        enabled: config.enabled,
        priority: config.priority,
        constraints: config.constraints
      };
    });
    
    return {
      totalFunctions,
      enabledFunctions,
      functionConfigs
    };
  }

  /**
   * Reset all configurations to defaults
   */
  resetToDefaults(): void {
    this.initializeDefaultConfigs();
    this.reinitializeAllFunctions();
  }

  /**
   * Private helper methods
   */
  private initializeDefaultConfigs(): void {
    // Copy Editor default configuration
    this.configs.set('copy-editor', {
      enabled: true,
      priority: 8,
      trackEditsConfig: {
        batchingStrategy: 'batch',
        clusterStrategy: 'sentence',
        confidenceThreshold: 0.8,
        changeCategories: ['grammar', 'style', 'clarity', 'flow', 'word-choice', 'conciseness'],
        requiresReview: false
      },
      constraints: {
        maxOutputLength: 15000,
        minConfidenceScore: 0.75,
        executionTimeout: 8000
      },
      preserveVoice: true,
      minimalIntervention: true,
      focusAreas: ['grammar', 'style', 'clarity', 'flow', 'conciseness']
    } as CopyEditorConfig);

    // Proofreader default configuration
    this.configs.set('proofreader', {
      enabled: true,
      priority: 9,
      trackEditsConfig: {
        batchingStrategy: 'immediate',
        clusterStrategy: 'none',
        confidenceThreshold: 0.95,
        changeCategories: ['grammar', 'spelling', 'punctuation', 'capitalization', 'syntax'],
        requiresReview: false
      },
      constraints: {
        maxOutputLength: 12000,
        minConfidenceScore: 0.92,
        executionTimeout: 5000
      },
      strictMode: true,
      errorTypes: ['grammar', 'spelling', 'punctuation', 'capitalization', 'syntax'],
      confidenceThreshold: 0.95
    } as ProofreaderConfig);

    // Developmental Editor default configuration
    this.configs.set('developmental-editor', {
      enabled: true,
      priority: 6,
      trackEditsConfig: {
        batchingStrategy: 'defer',
        clusterStrategy: 'section',
        confidenceThreshold: 0.75,
        changeCategories: ['structure', 'organization', 'argument', 'logic', 'development', 'transitions'],
        requiresReview: true
      },
      constraints: {
        maxOutputLength: 20000,
        minConfidenceScore: 0.70,
        executionTimeout: 12000
      },
      analysisDepth: 'comprehensive',
      focusAreas: ['structure', 'argument', 'organization', 'content', 'audience'],
      provideSuggestions: true
    } as DevelopmentalEditorConfig);

    // Co-Writer default configuration
    this.configs.set('co-writer', {
      enabled: true,
      priority: 5,
      trackEditsConfig: {
        batchingStrategy: 'batch',
        clusterStrategy: 'paragraph',
        confidenceThreshold: 0.70,
        changeCategories: ['content-addition', 'expansion', 'voice-integration', 'creative-development'],
        requiresReview: true
      },
      constraints: {
        maxOutputLength: 25000,
        minConfidenceScore: 0.65,
        executionTimeout: 15000
      },
      voiceMatching: true,
      creativityLevel: 'moderate',
      contentTypes: ['expansion', 'bridge', 'development', 'creative']
    } as CoWriterConfig);
  }

  private reinitializeAllFunctions(): void {
    // Reinitialize all functions with current configs
    this.configs.forEach((config, type) => {
      switch (type) {
        case 'copy-editor':
          this.copyEditor = new CopyEditor(config as CopyEditorConfig);
          break;
        case 'proofreader':
          this.proofreader = new Proofreader(config as ProofreaderConfig);
          break;
        case 'developmental-editor':
          this.developmentalEditor = new DevelopmentalEditor(config as DevelopmentalEditorConfig);
          break;
        case 'co-writer':
          this.coWriter = new CoWriter(config as CoWriterConfig);
          break;
      }
    });
  }

  private getCopyEditor(): CopyEditor {
    if (!this.copyEditor) {
      const config = this.configs.get('copy-editor') as CopyEditorConfig;
      this.copyEditor = new CopyEditor(config);
    }
    return this.copyEditor;
  }

  private getProofreader(): Proofreader {
    if (!this.proofreader) {
      const config = this.configs.get('proofreader') as ProofreaderConfig;
      this.proofreader = new Proofreader(config);
    }
    return this.proofreader;
  }

  private getDevelopmentalEditor(): DevelopmentalEditor {
    if (!this.developmentalEditor) {
      const config = this.configs.get('developmental-editor') as DevelopmentalEditorConfig;
      this.developmentalEditor = new DevelopmentalEditor(config);
    }
    return this.developmentalEditor;
  }

  private getCoWriter(): CoWriter {
    if (!this.coWriter) {
      const config = this.configs.get('co-writer') as CoWriterConfig;
      this.coWriter = new CoWriter(config);
    }
    return this.coWriter;
  }
}

// Export singleton instance
export const builtinFunctionManager = new BuiltinFunctionManager();