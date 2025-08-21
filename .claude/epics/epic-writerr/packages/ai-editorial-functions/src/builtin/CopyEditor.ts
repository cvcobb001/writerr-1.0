/**
 * @fileoverview Copy Editor built-in function implementation
 */

import { 
  CopyEditorConfig, 
  BuiltinFunctionResult, 
  EditorialChange, 
  VoiceAnalysis 
} from './types';

export class CopyEditor {
  private config: CopyEditorConfig;
  
  constructor(config: CopyEditorConfig) {
    this.config = config;
  }

  /**
   * Process text with copy editing improvements
   */
  async process(text: string, context?: any): Promise<BuiltinFunctionResult> {
    const startTime = Date.now();
    
    try {
      // Analyze the author's voice first
      const voiceAnalysis = this.analyzeVoice(text);
      
      // Apply copy editing based on configuration
      const editingResult = await this.applyCopyEditing(text, voiceAnalysis);
      
      return {
        functionId: 'copy-editor',
        success: true,
        output: editingResult.editedText,
        metadata: {
          voiceAnalysis,
          editorialSummary: editingResult.summary,
          totalChanges: editingResult.changes.length,
          changeTypes: this.categorizeChanges(editingResult.changes)
        },
        confidence: editingResult.confidence,
        changes: editingResult.changes,
        executionTime: Date.now() - startTime
      };
    } catch (error) {
      return {
        functionId: 'copy-editor',
        success: false,
        error: (error as Error).message,
        executionTime: Date.now() - startTime
      };
    }
  }

  /**
   * Analyze the author's voice and writing style
   */
  private analyzeVoice(text: string): VoiceAnalysis {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = text.split(/\s+/).filter(w => w.length > 0);
    
    const averageSentenceLength = words.length / sentences.length;
    
    // Analyze formality based on word choice and structure
    const formalityLevel = this.determineFormalityLevel(text);
    
    // Assess vocabulary complexity
    const vocabularyComplexity = this.assessVocabularyComplexity(words);
    
    // Identify tone characteristics
    const toneCharacteristics = this.identifyToneCharacteristics(text);
    
    // Find unique patterns
    const uniquePatterns = this.findUniquePatterns(text);
    
    return {
      formalityLevel,
      averageSentenceLength,
      vocabularyComplexity,
      toneCharacteristics,
      uniquePatterns
    };
  }

  /**
   * Apply copy editing based on the configuration and voice analysis
   */
  private async applyCopyEditing(text: string, voiceAnalysis: VoiceAnalysis): Promise<{
    editedText: string;
    changes: EditorialChange[];
    confidence: number;
    summary: any;
  }> {
    const changes: EditorialChange[] = [];
    let editedText = text;
    let currentIndex = 0;
    
    // Apply different types of editing based on focus areas
    for (const focusArea of this.config.focusAreas) {
      const areaChanges = await this.applyFocusAreaEditing(
        editedText, 
        focusArea, 
        voiceAnalysis,
        currentIndex
      );
      
      changes.push(...areaChanges.changes);
      editedText = areaChanges.editedText;
      currentIndex = areaChanges.newIndex;
    }

    // Calculate overall confidence
    const confidence = this.calculateConfidence(changes, voiceAnalysis);
    
    // Generate summary
    const summary = this.generateEditorialSummary(changes, voiceAnalysis);
    
    return {
      editedText,
      changes,
      confidence,
      summary
    };
  }

  /**
   * Apply editing for a specific focus area
   */
  private async applyFocusAreaEditing(
    text: string, 
    focusArea: string, 
    voiceAnalysis: VoiceAnalysis,
    startIndex: number
  ): Promise<{
    editedText: string;
    changes: EditorialChange[];
    newIndex: number;
  }> {
    const changes: EditorialChange[] = [];
    
    switch (focusArea) {
      case 'grammar':
        return this.applyGrammarEditing(text, voiceAnalysis, startIndex);
      case 'style':
        return this.applyStyleEditing(text, voiceAnalysis, startIndex);
      case 'clarity':
        return this.applyClarityEditing(text, voiceAnalysis, startIndex);
      case 'flow':
        return this.applyFlowEditing(text, voiceAnalysis, startIndex);
      case 'conciseness':
        return this.applyConcisenessEditing(text, voiceAnalysis, startIndex);
      default:
        return { editedText: text, changes, newIndex: startIndex };
    }
  }

  /**
   * Apply grammar improvements
   */
  private applyGrammarEditing(
    text: string, 
    voiceAnalysis: VoiceAnalysis, 
    startIndex: number
  ): Promise<{ editedText: string; changes: EditorialChange[]; newIndex: number }> {
    const changes: EditorialChange[] = [];
    let editedText = text;
    
    // Common grammar patterns to fix
    const grammarPatterns = [
      {
        pattern: /\b(he|she|it|who|that)\s+don't\b/gi,
        replacement: (match: string) => match.replace("don't", "doesn't"),
        type: 'grammar',
        reason: 'Subject-verb agreement correction'
      },
      {
        pattern: /\b(I|you|we|they)\s+doesn't\b/gi,
        replacement: (match: string) => match.replace("doesn't", "don't"),
        type: 'grammar',
        reason: 'Subject-verb agreement correction'
      }
    ];

    for (const pattern of grammarPatterns) {
      let match;
      while ((match = pattern.pattern.exec(editedText)) !== null) {
        const original = match[0];
        const revised = pattern.replacement(original);
        
        if (original !== revised) {
          changes.push({
            type: pattern.type,
            severity: 'moderate',
            original,
            revised,
            rationale: pattern.reason,
            position: { start: match.index + startIndex, end: match.index + original.length + startIndex },
            confidence: 0.95
          });
          
          editedText = editedText.replace(original, revised);
        }
      }
    }

    return Promise.resolve({
      editedText,
      changes,
      newIndex: startIndex + editedText.length
    });
  }

  /**
   * Apply style improvements
   */
  private applyStyleEditing(
    text: string, 
    voiceAnalysis: VoiceAnalysis, 
    startIndex: number
  ): Promise<{ editedText: string; changes: EditorialChange[]; newIndex: number }> {
    const changes: EditorialChange[] = [];
    let editedText = text;
    
    // Only apply style changes if preserveVoice is false or minimal intervention is false
    if (this.config.preserveVoice && this.config.minimalIntervention) {
      return Promise.resolve({ editedText, changes, newIndex: startIndex });
    }

    // Style improvement patterns (conservative)
    const stylePatterns = [
      {
        pattern: /\bthere are\s+(\d+|\w+)\s+(\w+)\s+that\s+(\w+)/gi,
        replacement: (match: string, count: string, noun: string, verb: string) => {
          return `${count} ${noun} ${verb}`;
        },
        type: 'style',
        reason: 'Eliminated wordy "there are...that" construction'
      }
    ];

    // Apply pattern-based improvements
    for (const pattern of stylePatterns) {
      editedText = editedText.replace(pattern.pattern, (match, ...args) => {
        const original = match;
        const revised = pattern.replacement(match, ...args);
        
        if (original !== revised) {
          changes.push({
            type: pattern.type,
            severity: 'minor',
            original,
            revised,
            rationale: pattern.reason,
            position: { start: editedText.indexOf(original) + startIndex, end: editedText.indexOf(original) + original.length + startIndex },
            confidence: 0.8
          });
        }
        
        return revised;
      });
    }

    return Promise.resolve({
      editedText,
      changes,
      newIndex: startIndex + editedText.length
    });
  }

  /**
   * Apply clarity improvements
   */
  private applyClarityEditing(
    text: string, 
    voiceAnalysis: VoiceAnalysis, 
    startIndex: number
  ): Promise<{ editedText: string; changes: EditorialChange[]; newIndex: number }> {
    // Implementation for clarity improvements
    return Promise.resolve({
      editedText: text,
      changes: [],
      newIndex: startIndex
    });
  }

  /**
   * Apply flow improvements
   */
  private applyFlowEditing(
    text: string, 
    voiceAnalysis: VoiceAnalysis, 
    startIndex: number
  ): Promise<{ editedText: string; changes: EditorialChange[]; newIndex: number }> {
    // Implementation for flow improvements
    return Promise.resolve({
      editedText: text,
      changes: [],
      newIndex: startIndex
    });
  }

  /**
   * Apply conciseness improvements
   */
  private applyConcisenessEditing(
    text: string, 
    voiceAnalysis: VoiceAnalysis, 
    startIndex: number
  ): Promise<{ editedText: string; changes: EditorialChange[]; newIndex: number }> {
    const changes: EditorialChange[] = [];
    let editedText = text;
    
    // Patterns for removing wordiness
    const concisePatterns = [
      {
        from: /\bin order to\b/gi,
        to: 'to',
        reason: 'Eliminated unnecessary "in order to"'
      },
      {
        from: /\bdue to the fact that\b/gi,
        to: 'because',
        reason: 'Replaced wordy phrase with concise alternative'
      },
      {
        from: /\bit is important to note that\b/gi,
        to: '',
        reason: 'Removed unnecessary introductory phrase'
      }
    ];

    for (const pattern of concisePatterns) {
      editedText = editedText.replace(pattern.from, (match, offset) => {
        changes.push({
          type: 'conciseness',
          severity: 'minor',
          original: match,
          revised: pattern.to,
          rationale: pattern.reason,
          position: { start: offset + startIndex, end: offset + match.length + startIndex },
          confidence: 0.9
        });
        return pattern.to;
      });
    }

    return Promise.resolve({
      editedText,
      changes,
      newIndex: startIndex + editedText.length
    });
  }

  /**
   * Helper methods for voice analysis
   */
  private determineFormalityLevel(text: string): 'formal' | 'semi-formal' | 'casual' | 'informal' {
    const formalMarkers = ['furthermore', 'nevertheless', 'consequently', 'therefore'];
    const informalMarkers = ["don't", "can't", "won't", "it's", "that's"];
    
    let formalCount = 0;
    let informalCount = 0;
    
    formalMarkers.forEach(marker => {
      if (text.toLowerCase().includes(marker)) formalCount++;
    });
    
    informalMarkers.forEach(marker => {
      if (text.toLowerCase().includes(marker)) informalCount++;
    });
    
    if (formalCount > informalCount * 2) return 'formal';
    if (informalCount > formalCount * 2) return 'informal';
    if (informalCount > formalCount) return 'casual';
    return 'semi-formal';
  }

  private assessVocabularyComplexity(words: string[]): 'basic' | 'intermediate' | 'advanced' | 'expert' {
    const complexWords = words.filter(word => word.length > 8);
    const ratio = complexWords.length / words.length;
    
    if (ratio > 0.2) return 'expert';
    if (ratio > 0.15) return 'advanced';
    if (ratio > 0.1) return 'intermediate';
    return 'basic';
  }

  private identifyToneCharacteristics(text: string): string[] {
    const characteristics: string[] = [];
    
    if (text.includes('!')) characteristics.push('enthusiastic');
    if (text.includes('?')) characteristics.push('questioning');
    if (text.match(/\bhowever\b|\bbut\b/i)) characteristics.push('analytical');
    
    return characteristics;
  }

  private findUniquePatterns(text: string): string[] {
    const patterns: string[] = [];
    
    // Look for unique punctuation or structure patterns
    if (text.match(/—/g)?.length > 2) patterns.push('em-dash-usage');
    if (text.match(/;/g)?.length > 2) patterns.push('semicolon-heavy');
    
    return patterns;
  }

  private categorizeChanges(changes: EditorialChange[]): Record<string, number> {
    const categories: Record<string, number> = {};
    
    changes.forEach(change => {
      categories[change.type] = (categories[change.type] || 0) + 1;
    });
    
    return categories;
  }

  private calculateConfidence(changes: EditorialChange[], voiceAnalysis: VoiceAnalysis): number {
    if (changes.length === 0) return 0.9;
    
    const avgConfidence = changes.reduce((sum, change) => sum + change.confidence, 0) / changes.length;
    
    // Adjust based on voice preservation
    if (this.config.preserveVoice) {
      return Math.min(avgConfidence, 0.85);
    }
    
    return avgConfidence;
  }

  private generateEditorialSummary(changes: EditorialChange[], voiceAnalysis: VoiceAnalysis): any {
    return {
      totalChanges: changes.length,
      changeTypes: this.categorizeChanges(changes),
      overallImprovement: changes.length > 0 ? 'Enhanced readability while preserving author voice' : 'No changes needed',
      voicePreservation: this.config.preserveVoice ? 'excellent' : 'good'
    };
  }
}