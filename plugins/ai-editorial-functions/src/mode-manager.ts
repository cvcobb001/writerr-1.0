import { WritingMode, EditorialFunction } from '@shared/types';
import AIEditorialFunctionsPlugin from './main';

export class ModeManager {
  private plugin: AIEditorialFunctionsPlugin;
  private builtInModes: WritingMode[];

  constructor(plugin: AIEditorialFunctionsPlugin) {
    this.plugin = plugin;
    this.initializeBuiltInModes();
  }

  private initializeBuiltInModes() {
    this.builtInModes = [
      {
        id: 'general',
        name: 'General Writing',
        description: 'General purpose writing with focus on clarity and readability',
        category: 'academic', // Default category
        systemPrompt: 'You are a helpful writing assistant focused on improving clarity, grammar, and overall readability. Maintain the author\'s voice and intent while making the text clearer and more engaging.',
        functions: []
      },
      {
        id: 'academic',
        name: 'Academic Writing',
        description: 'Scholarly writing with emphasis on argument structure, evidence, and formal tone',
        category: 'academic',
        systemPrompt: 'You are an academic writing specialist. Focus on improving argument structure, evidence presentation, citation integration, and maintaining appropriate scholarly tone. Ensure logical flow and rigorous analysis.',
        functions: []
      },
      {
        id: 'business',
        name: 'Business Writing',
        description: 'Professional communication with focus on clarity, action items, and business outcomes',
        category: 'business',
        systemPrompt: 'You are a business communication expert. Focus on professional tone, clear action items, executive-level clarity, and outcome-oriented language. Make content scannable and actionable.',
        functions: []
      },
      {
        id: 'fiction',
        name: 'Fiction Writing',
        description: 'Creative writing with emphasis on character development, dialogue, and narrative flow',
        category: 'fiction',
        systemPrompt: 'You are a fiction writing coach. Focus on character development, dialogue naturalness, narrative pacing, setting description, and reader engagement. Enhance dramatic effect and emotional impact.',
        functions: []
      },
      {
        id: 'technical',
        name: 'Technical Writing',
        description: 'Technical documentation with focus on accuracy, completeness, and user guidance',
        category: 'technical',
        systemPrompt: 'You are a technical writing specialist. Focus on accuracy, completeness, step-by-step clarity, and user-centered documentation. Ensure technical concepts are explained clearly for the target audience.',
        functions: []
      }
    ];
  }

  getModes(category?: string): WritingMode[] {
    const allModes = [...this.builtInModes, ...this.plugin.settings.customModes];
    
    if (category) {
      return allModes.filter(m => m.category === category);
    }
    
    return allModes;
  }

  getMode(modeId: string): WritingMode | null {
    const allModes = [...this.builtInModes, ...this.plugin.settings.customModes];
    return allModes.find(m => m.id === modeId) || null;
  }

  getCurrentMode(): WritingMode | null {
    return this.getMode(this.plugin.settings.currentMode);
  }

  setMode(modeId: string): boolean {
    const mode = this.getMode(modeId);
    if (!mode) return false;
    
    this.plugin.settings.currentMode = modeId;
    this.plugin.saveSettings();
    return true;
  }

  getModeSystemPrompt(modeId: string): string {
    const mode = this.getMode(modeId);
    return mode ? mode.systemPrompt : this.builtInModes[0].systemPrompt; // Default to general
  }

  getModeFunctions(modeId: string): EditorialFunction[] {
    const mode = this.getMode(modeId);
    if (!mode) return [];
    
    // Get functions specific to this mode's category
    return this.plugin.functionManager.getFunctions(mode.category);
  }

  // Custom mode management
  addCustomMode(mode: WritingMode): void {
    // Check for duplicate IDs
    if (this.getMode(mode.id)) {
      throw new Error(`Mode with ID '${mode.id}' already exists`);
    }
    
    this.plugin.settings.customModes.push(mode);
    this.plugin.saveSettings();
  }

  removeCustomMode(modeId: string): boolean {
    // Don't allow removal of built-in modes
    if (this.builtInModes.some(m => m.id === modeId)) {
      return false;
    }
    
    const index = this.plugin.settings.customModes.findIndex(m => m.id === modeId);
    if (index === -1) return false;
    
    this.plugin.settings.customModes.splice(index, 1);
    
    // If the removed mode was current, switch to general
    if (this.plugin.settings.currentMode === modeId) {
      this.plugin.settings.currentMode = 'general';
    }
    
    this.plugin.saveSettings();
    return true;
  }

  updateCustomMode(modeId: string, updates: Partial<WritingMode>): boolean {
    const index = this.plugin.settings.customModes.findIndex(m => m.id === modeId);
    if (index === -1) return false;
    
    const mode = this.plugin.settings.customModes[index];
    Object.assign(mode, updates);
    
    this.plugin.saveSettings();
    return true;
  }

  // Mode-specific context for AI prompts
  buildModeContext(modeId: string, additionalContext?: string): string {
    const mode = this.getMode(modeId);
    if (!mode) return '';
    
    let context = `Current writing mode: ${mode.name}\n`;
    context += `Mode description: ${mode.description}\n`;
    context += `System guidance: ${mode.systemPrompt}`;
    
    if (additionalContext) {
      context += `\n\nAdditional context: ${additionalContext}`;
    }
    
    return context;
  }

  // Get mode-appropriate suggestions
  getModeSuggestions(modeId: string): string[] {
    const mode = this.getMode(modeId);
    if (!mode) return [];
    
    const suggestions: Record<string, string[]> = {
      'academic': [
        'Focus on argument structure and evidence',
        'Use formal, scholarly tone',
        'Integrate citations smoothly',
        'Ensure logical flow between paragraphs',
        'Support claims with credible sources'
      ],
      'business': [
        'Lead with key takeaways',
        'Use action-oriented language',
        'Make content scannable',
        'Include clear next steps',
        'Focus on business outcomes'
      ],
      'fiction': [
        'Show don\'t tell',
        'Develop character voice',
        'Enhance sensory details',
        'Improve dialogue naturalness',
        'Maintain narrative momentum'
      ],
      'technical': [
        'Be precise and accurate',
        'Use clear step-by-step instructions',
        'Include examples and code snippets',
        'Consider the target audience',
        'Test all procedures'
      ],
      'general': [
        'Focus on clarity and readability',
        'Use active voice when possible',
        'Vary sentence structure',
        'Remove unnecessary words',
        'Improve flow and transitions'
      ]
    };
    
    return suggestions[mode.category] || suggestions['general'];
  }

  // Export mode configuration
  exportModeConfiguration(): string {
    const config = {
      currentMode: this.plugin.settings.currentMode,
      customModes: this.plugin.settings.customModes,
      exportedAt: new Date().toISOString()
    };
    
    return JSON.stringify(config, null, 2);
  }

  // Import mode configuration
  importModeConfiguration(configJson: string): { success: boolean; message: string } {
    try {
      const config = JSON.parse(configJson);
      
      if (!config.customModes || !Array.isArray(config.customModes)) {
        return { success: false, message: 'Invalid configuration format' };
      }
      
      // Validate each custom mode
      for (const mode of config.customModes) {
        if (!mode.id || !mode.name || !mode.category || !mode.systemPrompt) {
          return { success: false, message: 'Invalid mode structure in configuration' };
        }
      }
      
      // Import custom modes (don't overwrite, add new ones)
      let importedCount = 0;
      for (const mode of config.customModes) {
        if (!this.getMode(mode.id)) {
          this.plugin.settings.customModes.push(mode);
          importedCount++;
        }
      }
      
      // Set current mode if it's valid
      if (config.currentMode && this.getMode(config.currentMode)) {
        this.plugin.settings.currentMode = config.currentMode;
      }
      
      this.plugin.saveSettings();
      
      return { 
        success: true, 
        message: `Successfully imported ${importedCount} custom modes` 
      };
      
    } catch (error) {
      return { 
        success: false, 
        message: `Import failed: ${error.message}` 
      };
    }
  }
}