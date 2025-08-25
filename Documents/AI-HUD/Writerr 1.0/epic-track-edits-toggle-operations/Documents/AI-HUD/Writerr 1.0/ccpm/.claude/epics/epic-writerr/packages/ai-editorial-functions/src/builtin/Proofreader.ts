/**
 * @fileoverview Proofreader built-in function implementation
 */

import { 
  ProofreaderConfig, 
  BuiltinFunctionResult, 
  EditorialChange 
} from './types';

interface ProofreadingError {
  type: 'grammar' | 'spelling' | 'punctuation' | 'capitalization' | 'syntax';
  severity: 'minor' | 'moderate' | 'major';
  position: { start: number; end: number; line?: number; column?: number };
  original: string;
  corrected: string;
  rule: string;
  explanation: string;
  confidence: number;
}

export class Proofreader {
  private config: ProofreaderConfig;
  private grammarRules: Array<{
    pattern: RegExp;
    fix: (match: string, ...args: any[]) => string;
    rule: string;
    explanation: string;
    confidence: number;
  }>;

  constructor(config: ProofreaderConfig) {
    this.config = config;
    this.initializeGrammarRules();
  }

  /**
   * Process text with proofreading corrections
   */
  async process(text: string, context?: any): Promise<BuiltinFunctionResult> {
    const startTime = Date.now();
    
    try {
      const corrections = await this.findAndCorrectErrors(text);
      const correctedText = this.applyCorrections(text, corrections);
      
      const statistics = this.generateStatistics(corrections, text);
      const qualityAssessment = this.assessQuality(corrections, text);
      
      return {
        functionId: 'proofreader',
        success: true,
        output: correctedText,
        metadata: {
          corrections: corrections.map(c => ({
            type: c.type,
            severity: c.severity,
            position: c.position,
            original: c.original,
            corrected: c.corrected,
            rule: c.rule,
            explanation: c.explanation,
            confidence: c.confidence
          })),
          statistics,
          qualityAssessment
        },
        confidence: this.calculateOverallConfidence(corrections),
        changes: corrections.map(c => ({
          type: c.type,
          original: c.original,
          revised: c.corrected,
          reason: c.rule,
          position: c.position
        })),
        executionTime: Date.now() - startTime
      };
    } catch (error) {
      return {
        functionId: 'proofreader',
        success: false,
        error: (error as Error).message,
        executionTime: Date.now() - startTime
      };
    }
  }

  /**
   * Find and correct errors in the text
   */
  private async findAndCorrectErrors(text: string): Promise<ProofreadingError[]> {
    const errors: ProofreadingError[] = [];
    
    // Only check error types specified in configuration
    for (const errorType of this.config.errorTypes) {
      const typeErrors = await this.checkErrorType(text, errorType);
      errors.push(...typeErrors.filter(e => e.confidence >= this.config.confidenceThreshold));
    }
    
    // Sort errors by position to avoid conflicts during correction
    return errors.sort((a, b) => a.position.start - b.position.start);
  }

  /**
   * Check for specific type of errors
   */
  private async checkErrorType(text: string, errorType: string): Promise<ProofreadingError[]> {
    switch (errorType) {
      case 'grammar':
        return this.checkGrammarErrors(text);
      case 'spelling':
        return this.checkSpellingErrors(text);
      case 'punctuation':
        return this.checkPunctuationErrors(text);
      case 'capitalization':
        return this.checkCapitalizationErrors(text);
      case 'syntax':
        return this.checkSyntaxErrors(text);
      default:
        return [];
    }
  }

  /**
   * Check for grammar errors
   */
  private checkGrammarErrors(text: string): ProofreadingError[] {
    const errors: ProofreadingError[] = [];
    
    for (const rule of this.grammarRules) {
      let match;
      const regex = new RegExp(rule.pattern.source, rule.pattern.flags);
      
      while ((match = regex.exec(text)) !== null) {
        const original = match[0];
        const corrected = rule.fix(original, ...match.slice(1));
        
        if (original !== corrected) {
          errors.push({
            type: 'grammar',
            severity: 'moderate',
            position: { 
              start: match.index, 
              end: match.index + original.length,
              line: this.getLineNumber(text, match.index),
              column: this.getColumnNumber(text, match.index)
            },
            original,
            corrected,
            rule: rule.rule,
            explanation: rule.explanation,
            confidence: rule.confidence
          });
        }
        
        // Prevent infinite loops
        if (regex.lastIndex === match.index) {
          regex.lastIndex++;
        }
      }
    }
    
    return errors;
  }

  /**
   * Check for spelling errors
   */
  private checkSpellingErrors(text: string): ProofreadingError[] {
    const errors: ProofreadingError[] = [];
    
    // Common misspellings dictionary
    const commonMisspellings: Record<string, string> = {
      'recieve': 'receive',
      'seperate': 'separate',
      'definately': 'definitely',
      'occured': 'occurred',
      'accomodate': 'accommodate',
      'neccessary': 'necessary',
      'begining': 'beginning',
      'writting': 'writing',
      'compelte': 'complete'
    };
    
    const words = text.match(/\b\w+\b/g) || [];
    let currentIndex = 0;
    
    for (const word of words) {
      const lowerWord = word.toLowerCase();
      const wordStart = text.indexOf(word, currentIndex);
      
      if (commonMisspellings[lowerWord]) {
        const corrected = this.preserveCase(word, commonMisspellings[lowerWord]);
        
        errors.push({
          type: 'spelling',
          severity: 'moderate',
          position: { 
            start: wordStart, 
            end: wordStart + word.length,
            line: this.getLineNumber(text, wordStart),
            column: this.getColumnNumber(text, wordStart)
          },
          original: word,
          corrected,
          rule: 'Correct spelling',
          explanation: `"${word}" is misspelled; correct spelling is "${corrected}"`,
          confidence: 0.98
        });
      }
      
      currentIndex = wordStart + word.length;
    }
    
    return errors;
  }

  /**
   * Check for punctuation errors
   */
  private checkPunctuationErrors(text: string): ProofreadingError[] {
    const errors: ProofreadingError[] = [];
    
    // Check for common punctuation issues
    const punctuationRules = [
      {
        pattern: /(\w+)s\s+([\w]+)/g, // Missing apostrophe in possessives
        check: (match: string, word: string, next: string) => {
          // Simple heuristic: if followed by a noun, might need apostrophe
          const possessiveIndicators = ['house', 'car', 'book', 'idea', 'work', 'report', 'plan'];
          return possessiveIndicators.includes(next.toLowerCase());
        },
        fix: (match: string, word: string, next: string) => `${word}'s ${next}`,
        rule: 'Possessive apostrophe',
        explanation: 'Added missing apostrophe in possessive form'
      },
      {
        pattern: /(\w+),(\w+)/g, // Missing space after comma
        check: () => true,
        fix: (match: string, before: string, after: string) => `${before}, ${after}`,
        rule: 'Comma spacing',
        explanation: 'Added space after comma'
      }
    ];
    
    for (const rule of punctuationRules) {
      let match;
      while ((match = rule.pattern.exec(text)) !== null) {
        if (rule.check(match[0], ...match.slice(1))) {
          const original = match[0];
          const corrected = rule.fix(original, ...match.slice(1));
          
          if (original !== corrected) {
            errors.push({
              type: 'punctuation',
              severity: 'minor',
              position: { 
                start: match.index, 
                end: match.index + original.length,
                line: this.getLineNumber(text, match.index),
                column: this.getColumnNumber(text, match.index)
              },
              original,
              corrected,
              rule: rule.rule,
              explanation: rule.explanation,
              confidence: 0.9
            });
          }
        }
      }
    }
    
    return errors;
  }

  /**
   * Check for capitalization errors
   */
  private checkCapitalizationErrors(text: string): ProofreadingError[] {
    const errors: ProofreadingError[] = [];
    
    // Days of the week
    const daysPattern = /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi;
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    
    let match;
    while ((match = daysPattern.exec(text)) !== null) {
      const original = match[0];
      const dayIndex = match[0].toLowerCase() === 'monday' ? 0 :
                     match[0].toLowerCase() === 'tuesday' ? 1 :
                     match[0].toLowerCase() === 'wednesday' ? 2 :
                     match[0].toLowerCase() === 'thursday' ? 3 :
                     match[0].toLowerCase() === 'friday' ? 4 :
                     match[0].toLowerCase() === 'saturday' ? 5 : 6;
      
      const corrected = days[dayIndex];
      
      if (original !== corrected) {
        errors.push({
          type: 'capitalization',
          severity: 'minor',
          position: { 
            start: match.index, 
            end: match.index + original.length,
            line: this.getLineNumber(text, match.index),
            column: this.getColumnNumber(text, match.index)
          },
          original,
          corrected,
          rule: 'Capitalize day names',
          explanation: 'Days of the week should be capitalized',
          confidence: 0.99
        });
      }
    }
    
    // Months
    const monthsPattern = /\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/gi;
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                   'July', 'August', 'September', 'October', 'November', 'December'];
    
    while ((match = monthsPattern.exec(text)) !== null) {
      const original = match[0];
      const monthIndex = months.findIndex(month => month.toLowerCase() === original.toLowerCase());
      const corrected = months[monthIndex];
      
      if (original !== corrected) {
        errors.push({
          type: 'capitalization',
          severity: 'minor',
          position: { 
            start: match.index, 
            end: match.index + original.length,
            line: this.getLineNumber(text, match.index),
            column: this.getColumnNumber(text, match.index)
          },
          original,
          corrected,
          rule: 'Capitalize month names',
          explanation: 'Months should be capitalized',
          confidence: 0.99
        });
      }
    }
    
    return errors;
  }

  /**
   * Check for syntax errors
   */
  private checkSyntaxErrors(text: string): ProofreadingError[] {
    const errors: ProofreadingError[] = [];
    
    // Check for comma splices
    const commaSplicePattern = /([^,\s]+(?:\s+[^,\s]+)*),\s+([a-z][^.!?]*[.!?])/g;
    let match;
    
    while ((match = commaSplicePattern.exec(text)) !== null) {
      const original = match[0];
      const corrected = `${match[1]}; ${match[2].charAt(0).toLowerCase()}${match[2].slice(1)}`;
      
      errors.push({
        type: 'syntax',
        severity: 'moderate',
        position: { 
          start: match.index, 
          end: match.index + original.length,
          line: this.getLineNumber(text, match.index),
          column: this.getColumnNumber(text, match.index)
        },
        original,
        corrected,
        rule: 'Fix comma splice',
        explanation: 'Two independent clauses cannot be joined by a comma alone',
        confidence: 0.85
      });
    }
    
    return errors;
  }

  /**
   * Apply corrections to text
   */
  private applyCorrections(text: string, corrections: ProofreadingError[]): string {
    let correctedText = text;
    let offset = 0;
    
    for (const correction of corrections) {
      const start = correction.position.start + offset;
      const end = correction.position.end + offset;
      
      correctedText = correctedText.slice(0, start) + 
                     correction.corrected + 
                     correctedText.slice(end);
      
      offset += correction.corrected.length - correction.original.length;
    }
    
    return correctedText;
  }

  /**
   * Initialize grammar rules
   */
  private initializeGrammarRules(): void {
    this.grammarRules = [
      {
        pattern: /\b(she|he|it|who|that)\s+don't\b/gi,
        fix: (match, subject) => match.replace("don't", "doesn't"),
        rule: 'Subject-verb agreement',
        explanation: 'Third person singular subjects require "doesn\'t" not "don\'t"',
        confidence: 0.98
      },
      {
        pattern: /\b(I|you|we|they)\s+doesn't\b/gi,
        fix: (match, subject) => match.replace("doesn't", "don't"),
        rule: 'Subject-verb agreement',
        explanation: 'These subjects require "don\'t" not "doesn\'t"',
        confidence: 0.98
      },
      {
        pattern: /\b(there|their|they're)\b/gi,
        fix: (match) => {
          // This would need context analysis - simplified for demo
          return match;
        },
        rule: 'Homophone usage',
        explanation: 'Check correct usage of there/their/they\'re',
        confidence: 0.7
      }
    ];
  }

  /**
   * Helper methods
   */
  private getLineNumber(text: string, index: number): number {
    return text.slice(0, index).split('\n').length;
  }

  private getColumnNumber(text: string, index: number): number {
    const lastNewline = text.lastIndexOf('\n', index - 1);
    return index - lastNewline;
  }

  private preserveCase(original: string, corrected: string): string {
    if (original[0] === original[0].toUpperCase()) {
      return corrected.charAt(0).toUpperCase() + corrected.slice(1);
    }
    return corrected.toLowerCase();
  }

  private calculateOverallConfidence(corrections: ProofreadingError[]): number {
    if (corrections.length === 0) return 0.95;
    
    const avgConfidence = corrections.reduce((sum, c) => sum + c.confidence, 0) / corrections.length;
    return Math.max(0.9, avgConfidence); // Minimum 0.9 for proofreading
  }

  private generateStatistics(corrections: ProofreadingError[], text: string): any {
    const words = text.split(/\s+/).length;
    const errorsByType: Record<string, number> = {};
    const errorsBySeverity: Record<string, number> = { minor: 0, moderate: 0, major: 0 };
    
    corrections.forEach(correction => {
      errorsByType[correction.type] = (errorsByType[correction.type] || 0) + 1;
      errorsBySeverity[correction.severity]++;
    });
    
    return {
      totalErrors: corrections.length,
      errorsByType,
      errorsBySeverity,
      textLength: words,
      errorDensity: (corrections.length / words) * 100
    };
  }

  private assessQuality(corrections: ProofreadingError[], text: string): any {
    const errorDensity = (corrections.length / text.split(/\s+/).length) * 100;
    
    let overallAccuracy: string;
    if (errorDensity < 1) overallAccuracy = 'excellent';
    else if (errorDensity < 3) overallAccuracy = 'good';
    else if (errorDensity < 5) overallAccuracy = 'fair';
    else overallAccuracy = 'poor';
    
    const commonErrorPatterns = this.identifyErrorPatterns(corrections);
    
    return {
      overallAccuracy,
      commonErrorPatterns,
      stylePreservation: true // Proofreading preserves style by definition
    };
  }

  private identifyErrorPatterns(corrections: ProofreadingError[]): string[] {
    const patterns: string[] = [];
    const errorCounts: Record<string, number> = {};
    
    corrections.forEach(correction => {
      errorCounts[correction.rule] = (errorCounts[correction.rule] || 0) + 1;
    });
    
    Object.entries(errorCounts).forEach(([rule, count]) => {
      if (count >= 3) {
        patterns.push(`Recurring ${rule.toLowerCase()} errors`);
      }
    });
    
    return patterns;
  }
}