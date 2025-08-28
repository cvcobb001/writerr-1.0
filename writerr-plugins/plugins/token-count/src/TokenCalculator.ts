/**
 * TokenCalculator - Sophisticated model-specific token counting
 * Extracted from Writerr Chat plugin tokenization system
 */

export class TokenCalculator {
  
  /**
   * Calculate tokens for a specific model using appropriate tokenizer
   */
  calculateTokensForModel(text: string, modelName: string): number {
    // Clean and normalize text
    const normalizedText = text.trim();
    if (!normalizedText) return 0;

    // Determine tokenizer type based on model
    const tokenizerType = this.getTokenizerType(modelName);
    
    switch (tokenizerType) {
      case 'cl100k':
        return this.cl100kTokenizer(normalizedText);
      case 'p50k':
        return this.p50kTokenizer(normalizedText);
      case 'gemini':
        return this.geminiTokenizer(normalizedText);
      case 'claude':
        return this.claudeTokenizer(normalizedText);
      default:
        return this.fallbackTokenizer(normalizedText);
    }
  }

  /**
   * Determine which tokenizer to use based on model name
   */
  getTokenizerType(modelName: string): string {
    const modelLower = modelName.toLowerCase();
    
    // OpenAI GPT-4, GPT-4o, GPT-5, o1, o3, o4 use cl100k_base
    if (modelLower.includes('gpt-4') || modelLower.includes('gpt-5') || 
        modelLower.includes('gpt-4o') || modelLower.includes('o1') || 
        modelLower.includes('o3') || modelLower.includes('o4')) {
      return 'cl100k';
    }
    
    // OpenAI GPT-3.5 and older use p50k_base
    if (modelLower.includes('gpt-3') || modelLower.includes('davinci') || 
        modelLower.includes('babbage') || modelLower.includes('curie')) {
      return 'p50k';
    }
    
    // Google Gemini models
    if (modelLower.includes('gemini') || modelLower.includes('models/gemini')) {
      return 'gemini';
    }
    
    // Anthropic Claude models
    if (modelLower.includes('claude')) {
      return 'claude';
    }
    
    return 'cl100k'; // Default to most common modern tokenizer
  }

  /**
   * cl100k_base tokenizer approximation for GPT-4/GPT-4o/GPT-5/o1/o3/o4
   * Most sophisticated tokenizer for modern OpenAI models
   */
  cl100kTokenizer(text: string): number {
    // Step 1: Handle special tokens and patterns
    let tokenCount = 0;
    
    // Count newlines (each newline is typically 1 token)
    const newlines = (text.match(/\n/g) || []).length;
    tokenCount += newlines;
    
    // Remove newlines for further processing
    let processedText = text.replace(/\n/g, ' ');
    
    // Step 2: Split on whitespace and punctuation
    const words = processedText.split(/\s+/).filter(word => word.length > 0);
    
    for (const word of words) {
      // Handle punctuation-heavy text
      if (/^[^\w\s]+$/.test(word)) {
        // Pure punctuation - usually 1 token per character or small group
        tokenCount += Math.ceil(word.length / 2);
      } else if (word.length <= 3) {
        // Short words are typically 1 token
        tokenCount += 1;
      } else if (word.length <= 7) {
        // Medium words are typically 1-2 tokens
        tokenCount += Math.ceil(word.length / 4);
      } else {
        // Long words get split more
        tokenCount += Math.ceil(word.length / 3.5);
      }
    }
    
    return Math.max(1, tokenCount);
  }

  /**
   * p50k_base tokenizer approximation for GPT-3.5 and older
   * Slightly less efficient than cl100k
   */
  p50kTokenizer(text: string): number {
    const words = text.split(/\s+/).filter(word => word.length > 0);
    let tokenCount = 0;
    
    for (const word of words) {
      if (word.length <= 4) {
        tokenCount += 1;
      } else {
        // p50k is less efficient, so slightly higher token count
        tokenCount += Math.ceil(word.length / 3.8);
      }
    }
    
    // Add newline tokens
    tokenCount += (text.match(/\n/g) || []).length;
    
    return Math.max(1, tokenCount);
  }

  /**
   * Google Gemini tokenizer approximation
   * Generally more efficient than GPT tokenizers
   */
  geminiTokenizer(text: string): number {
    const words = text.split(/\s+/).filter(word => word.length > 0);
    let tokenCount = 0;
    
    for (const word of words) {
      if (word.length <= 4) {
        tokenCount += 1;
      } else {
        // Gemini is typically more efficient
        tokenCount += Math.ceil(word.length / 4.2);
      }
    }
    
    // Handle newlines
    tokenCount += (text.match(/\n/g) || []).length * 0.8; // Gemini handles newlines more efficiently
    
    return Math.max(1, Math.ceil(tokenCount));
  }

  /**
   * Anthropic Claude tokenizer approximation
   * Similar efficiency to GPT-4 family
   */
  claudeTokenizer(text: string): number {
    const words = text.split(/\s+/).filter(word => word.length > 0);
    let tokenCount = 0;
    
    for (const word of words) {
      if (word.length <= 3) {
        tokenCount += 1;
      } else {
        tokenCount += Math.ceil(word.length / 3.7);
      }
    }
    
    // Handle newlines
    tokenCount += (text.match(/\n/g) || []).length;
    
    return Math.max(1, tokenCount);
  }

  /**
   * Conservative fallback estimation for unknown models
   */
  fallbackTokenizer(text: string): number {
    // Conservative fallback estimation
    return Math.ceil(text.length / 4);
  }

  /**
   * Easy interface - auto-detect model or use fallback
   */
  estimateTokens(text: string, modelName?: string): number {
    if (!text) return 0;
    
    if (!modelName) {
      return this.fallbackTokenizer(text);
    }

    return this.calculateTokensForModel(text, modelName);
  }
}