import { Notice } from 'obsidian';
import { EditorialFunction } from '@shared/types';
import AIEditorialFunctionsPlugin from './main';

export class FunctionManager {
  private plugin: AIEditorialFunctionsPlugin;
  private builtInFunctions: EditorialFunction[];

  constructor(plugin: AIEditorialFunctionsPlugin) {
    this.plugin = plugin;
    this.initializeBuiltInFunctions();
  }

  private initializeBuiltInFunctions() {
    this.builtInFunctions = [
      // Academic Functions
      {
        id: 'improve-argument-structure',
        name: 'Improve Argument Structure',
        description: 'Analyze and enhance the logical flow and structure of academic arguments',
        category: 'academic',
        prompt: 'Analyze the argument structure in this text and improve its logical flow, clarity, and persuasiveness. Maintain academic tone and add transitions where needed:'
      },
      {
        id: 'enhance-citation-format',
        name: 'Enhance Citations',
        description: 'Improve citation formatting and integration within academic text',
        category: 'academic',
        prompt: 'Review and improve the citation formatting and integration in this text. Ensure proper academic style and smooth integration with the surrounding text:'
      },
      {
        id: 'strengthen-thesis',
        name: 'Strengthen Thesis',
        description: 'Enhance thesis statement clarity, specificity, and argumentative power',
        category: 'academic',
        prompt: 'Strengthen this thesis statement by making it more specific, clear, and arguable. Ensure it clearly states the main argument and previews supporting points:'
      },
      {
        id: 'academic-tone-adjustment',
        name: 'Academic Tone Adjustment',
        description: 'Adjust text to match appropriate academic tone and style',
        category: 'academic',
        prompt: 'Adjust this text to match appropriate academic tone and style. Make it more formal, precise, and scholarly while maintaining readability:'
      },

      // Business Functions
      {
        id: 'create-executive-summary',
        name: 'Create Executive Summary',
        description: 'Generate a concise executive summary from detailed business content',
        category: 'business',
        prompt: 'Create a concise executive summary from this content. Focus on key points, decisions, and action items that executives need to know:'
      },
      {
        id: 'enhance-professional-tone',
        name: 'Enhance Professional Tone',
        description: 'Improve professional tone and business communication style',
        category: 'business',
        prompt: 'Enhance the professional tone of this text. Make it more polished, confident, and appropriate for business communication:'
      },
      {
        id: 'extract-action-items',
        name: 'Extract Action Items',
        description: 'Identify and format action items and next steps from business content',
        category: 'business',
        prompt: 'Extract and clearly format all action items, next steps, and deliverables from this text. Present them as a bulleted list with responsible parties and deadlines where mentioned:'
      },
      {
        id: 'format-meeting-notes',
        name: 'Format Meeting Notes',
        description: 'Structure and format meeting notes for clarity and actionability',
        category: 'business',
        prompt: 'Structure and format these meeting notes. Organize by agenda items, highlight decisions made, action items, and next steps:'
      },

      // Fiction Functions
      {
        id: 'enhance-dialogue',
        name: 'Enhance Dialogue',
        description: 'Improve dialogue naturalness, character voice, and dramatic effect',
        category: 'fiction',
        prompt: 'Enhance this dialogue to make it more natural, distinctive to each character, and dramatically effective. Improve rhythm, subtext, and character voice:'
      },
      {
        id: 'develop-character',
        name: 'Develop Character',
        description: 'Enhance character development and personality in narrative text',
        category: 'fiction',
        prompt: 'Enhance the character development in this text. Make the characters more vivid, complex, and distinctive through actions, dialogue, and internal thoughts:'
      },
      {
        id: 'improve-narrative-flow',
        name: 'Improve Narrative Flow',
        description: 'Enhance pacing, transitions, and narrative momentum',
        category: 'fiction',
        prompt: 'Improve the narrative flow of this text. Enhance pacing, smooth transitions between scenes, and maintain reader engagement throughout:'
      },
      {
        id: 'enhance-setting-description',
        name: 'Enhance Setting Description',
        description: 'Improve scene setting and atmospheric description',
        category: 'fiction',
        prompt: 'Enhance the setting description in this text. Make it more vivid and atmospheric while using sensory details to immerse the reader:'
      },

      // Technical Functions
      {
        id: 'improve-api-documentation',
        name: 'Improve API Documentation',
        description: 'Enhance API documentation clarity, completeness, and usability',
        category: 'technical',
        prompt: 'Improve this API documentation. Make it clearer, more complete, and easier to understand. Include proper parameter descriptions, examples, and error handling:'
      },
      {
        id: 'enhance-code-comments',
        name: 'Enhance Code Comments',
        description: 'Improve code comments for clarity and maintainability',
        category: 'technical',
        prompt: 'Enhance these code comments to make them clearer and more helpful for future developers. Explain the why behind complex logic:'
      },
      {
        id: 'create-technical-spec',
        name: 'Create Technical Specification',
        description: 'Generate comprehensive technical specifications from requirements',
        category: 'technical',
        prompt: 'Create a comprehensive technical specification from this content. Include system requirements, architecture decisions, and implementation details:'
      },
      {
        id: 'improve-troubleshooting-guide',
        name: 'Improve Troubleshooting Guide',
        description: 'Enhance troubleshooting documentation with clear steps and solutions',
        category: 'technical',
        prompt: 'Improve this troubleshooting guide. Make the steps clearer, add common solutions, and organize by problem severity:'
      },

      // General Functions (available in all modes)
      {
        id: 'improve-clarity',
        name: 'Improve Clarity',
        description: 'Enhance text clarity and readability',
        category: 'academic', // Default category, but available in all modes
        prompt: 'Improve the clarity and readability of this text. Make it easier to understand while preserving the original meaning and tone:'
      },
      {
        id: 'fix-grammar',
        name: 'Fix Grammar',
        description: 'Correct grammatical errors and improve sentence structure',
        category: 'academic',
        prompt: 'Fix any grammatical errors in this text and improve sentence structure while maintaining the original style and meaning:'
      },
      {
        id: 'enhance-style',
        name: 'Enhance Writing Style',
        description: 'Improve overall writing style and flow',
        category: 'academic',
        prompt: 'Enhance the writing style of this text. Improve flow, vary sentence structure, and make it more engaging while maintaining appropriateness for the context:'
      },
      {
        id: 'summarize',
        name: 'Summarize',
        description: 'Create a concise summary of the selected text',
        category: 'academic',
        prompt: 'Create a concise summary of this text. Capture the main points and key information in a shorter, more digestible format:'
      },
      {
        id: 'expand-ideas',
        name: 'Expand Ideas',
        description: 'Develop and elaborate on ideas in the selected text',
        category: 'academic',
        prompt: 'Expand and elaborate on the ideas in this text. Add more depth, examples, and supporting details while maintaining coherence:'
      }
    ];
  }

  getFunctions(category?: string): EditorialFunction[] {
    const allFunctions = [...this.builtInFunctions, ...this.plugin.settings.customFunctions];
    
    if (category) {
      return allFunctions.filter(f => f.category === category);
    }
    
    return allFunctions;
  }

  getFunction(functionId: string): EditorialFunction | undefined {
    const allFunctions = [...this.builtInFunctions, ...this.plugin.settings.customFunctions];
    return allFunctions.find(f => f.id === functionId);
  }

  async executeFunction(functionId: string, text: string, parameters?: Record<string, any>): Promise<string> {
    const func = this.getFunction(functionId);
    if (!func) {
      throw new Error(`Function '${functionId}' not found`);
    }

    return await this.executeWithPrompt(func.prompt, text, parameters);
  }

  async executeCustomPrompt(text: string, customPrompt: string): Promise<string> {
    return await this.executeWithPrompt(customPrompt, text);
  }

  private async executeWithPrompt(prompt: string, text: string, parameters?: Record<string, any>): Promise<string> {
    // Check if Writerr Chat is available for AI processing
    if (!window.WriterrlAPI?.chat) {
      throw new Error('Writerr Chat plugin is required for AI editorial functions. Please install and configure the Writerr Chat plugin.');
    }

    try {
      // Build the full prompt with context
      const fullPrompt = this.buildFullPrompt(prompt, text, parameters);
      
      // Use the chat API to get AI response
      const response = await this.sendToAI(fullPrompt);
      
      // Extract the edited text from the response
      return this.extractEditedText(response, text);
      
    } catch (error) {
      console.error('Error executing editorial function:', error);
      throw new Error(`Failed to process text: ${error.message}`);
    }
  }

  private buildFullPrompt(basePrompt: string, text: string, parameters?: Record<string, any>): string {
    let fullPrompt = basePrompt;
    
    // Add current mode context
    const currentMode = this.plugin.getCurrentMode();
    if (currentMode) {
      fullPrompt += `\n\nContext: This is ${currentMode.name.toLowerCase()} writing. ${currentMode.description}`;
    }
    
    // Add parameters if provided
    if (parameters && Object.keys(parameters).length > 0) {
      fullPrompt += '\n\nAdditional parameters:';
      for (const [key, value] of Object.entries(parameters)) {
        fullPrompt += `\n- ${key}: ${value}`;
      }
    }
    
    fullPrompt += `\n\nText to edit:\n\n${text}\n\nPlease provide only the improved text without additional commentary.`;
    
    return fullPrompt;
  }

  private async sendToAI(prompt: string): Promise<string> {
    // This is a placeholder - in a real implementation, this would interface
    // with the AI provider through the Chat plugin
    
    // Simulate AI processing delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // For now, return a mock response
    // In the actual implementation, this would call:
    // return await window.WriterrlAPI.chat.sendMessage(prompt);
    
    throw new Error('AI provider not implemented yet. This is a placeholder for the actual AI integration.');
  }

  private extractEditedText(aiResponse: string, originalText: string): string {
    // This would extract the edited text from the AI response
    // For now, return the original text as a placeholder
    
    // In actual implementation, this might:
    // 1. Parse the AI response to find the edited text
    // 2. Clean up any formatting or extra text
    // 3. Validate that the response is reasonable
    
    return aiResponse.trim();
  }

  // Utility methods for function management
  addCustomFunction(func: EditorialFunction): void {
    // Check for duplicate IDs
    if (this.getFunction(func.id)) {
      throw new Error(`Function with ID '${func.id}' already exists`);
    }
    
    this.plugin.settings.customFunctions.push(func);
    this.plugin.saveSettings();
  }

  removeCustomFunction(functionId: string): boolean {
    const index = this.plugin.settings.customFunctions.findIndex(f => f.id === functionId);
    if (index === -1) return false;
    
    this.plugin.settings.customFunctions.splice(index, 1);
    this.plugin.saveSettings();
    return true;
  }

  getFunctionsByCurrentMode(): EditorialFunction[] {
    const currentMode = this.plugin.getCurrentMode();
    if (!currentMode) {
      return this.getFunctions();
    }
    
    // Get functions specific to the current mode, plus general functions
    const modeFunctions = this.getFunctions(currentMode.category);
    const generalFunctions = ['improve-clarity', 'fix-grammar', 'enhance-style', 'summarize', 'expand-ideas'];
    const generalFuncs = this.builtInFunctions.filter(f => generalFunctions.includes(f.id));
    
    return [...modeFunctions, ...generalFuncs];
  }
}