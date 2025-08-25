/**
 * @fileoverview Co-Writer built-in function implementation
 */

import { 
  CoWriterConfig, 
  BuiltinFunctionResult, 
  VoiceAnalysis 
} from './types';

interface ContentGenerationRequest {
  type: 'expansion' | 'bridge' | 'development' | 'creative';
  targetLength?: number;
  insertionPoint?: number;
  previousContext?: string;
  nextContext?: string;
  requirements?: string[];
  tone?: string;
}

interface GeneratedContent {
  content: string;
  type: 'expansion' | 'bridge' | 'development' | 'creative';
  wordCount: number;
  integrationPoints: Array<{
    location: string;
    connectionType: string;
    rationale: string;
  }>;
  matchingConfidence: number;
}

export class CoWriter {
  private config: CoWriterConfig;

  constructor(config: CoWriterConfig) {
    this.config = config;
  }

  /**
   * Process content generation request
   */
  async process(text: string, context?: any): Promise<BuiltinFunctionResult> {
    const startTime = Date.now();
    
    try {
      // Analyze the author's voice if voice matching is enabled
      const voiceAnalysis = this.config.voiceMatching ? 
        this.analyzeVoice(text) : 
        this.createDefaultVoiceAnalysis();
      
      // Determine what type of content generation is needed
      const generationRequest = this.analyzeGenerationRequest(text, context);
      
      // Generate content based on the request
      const generatedContent = await this.generateContent(
        text, 
        generationRequest, 
        voiceAnalysis
      );
      
      // Assess quality and integration
      const qualityAssessment = this.assessGeneratedContent(
        generatedContent,
        text,
        voiceAnalysis
      );
      
      // Provide collaborative notes and guidance
      const collaborativeNotes = this.generateCollaborativeNotes(
        generatedContent,
        generationRequest,
        qualityAssessment
      );
      
      return {
        functionId: 'co-writer',
        success: true,
        output: generatedContent.content,
        metadata: {
          generatedContent: generatedContent.content,
          voiceAnalysis: {
            detectedStyle: voiceAnalysis,
            matchingConfidence: generatedContent.matchingConfidence
          },
          contentMetadata: {
            generationType: generatedContent.type,
            contentPurpose: this.describeContentPurpose(generationRequest),
            wordCount: generatedContent.wordCount,
            integrationPoints: generatedContent.integrationPoints
          },
          qualityAssessment,
          collaborativeNotes
        },
        confidence: qualityAssessment.voiceConsistency * 0.4 + qualityAssessment.coherenceScore * 0.6,
        executionTime: Date.now() - startTime
      };
    } catch (error) {
      return {
        functionId: 'co-writer',
        success: false,
        error: (error as Error).message,
        executionTime: Date.now() - startTime
      };
    }
  }

  /**
   * Analyze the author's voice and style for matching
   */
  private analyzeVoice(text: string): VoiceAnalysis {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = text.split(/\s+/).filter(w => w.length > 0);
    
    const averageSentenceLength = words.length / sentences.length;
    
    // Analyze formality
    const formalityLevel = this.determineFormalityLevel(text);
    
    // Assess vocabulary complexity
    const vocabularyComplexity = this.assessVocabularyComplexity(words);
    
    // Identify tone characteristics
    const toneCharacteristics = this.identifyToneCharacteristics(text);
    
    // Find unique stylistic patterns
    const uniquePatterns = this.identifyStylPatterns(text);
    
    return {
      formalityLevel,
      averageSentenceLength,
      vocabularyComplexity,
      toneCharacteristics,
      uniquePatterns
    };
  }

  /**
   * Create default voice analysis when voice matching is disabled
   */
  private createDefaultVoiceAnalysis(): VoiceAnalysis {
    return {
      formalityLevel: 'semi-formal',
      averageSentenceLength: 15,
      vocabularyComplexity: 'intermediate',
      toneCharacteristics: ['neutral'],
      uniquePatterns: []
    };
  }

  /**
   * Analyze what type of content generation is needed
   */
  private analyzeGenerationRequest(text: string, context?: any): ContentGenerationRequest {
    // If context provides specific request, use it
    if (context?.generationType) {
      return {
        type: context.generationType,
        targetLength: context.targetLength || 200,
        insertionPoint: context.insertionPoint,
        previousContext: context.previousContext,
        nextContext: context.nextContext,
        requirements: context.requirements || [],
        tone: context.tone
      };
    }
    
    // Otherwise, infer from text analysis
    const inferredType = this.inferContentType(text);
    
    return {
      type: inferredType,
      targetLength: this.getDefaultTargetLength(inferredType),
      requirements: this.inferRequirements(text, inferredType)
    };
  }

  /**
   * Generate content based on the request and voice analysis
   */
  private async generateContent(
    originalText: string,
    request: ContentGenerationRequest,
    voiceAnalysis: VoiceAnalysis
  ): Promise<GeneratedContent> {
    let generatedContent: string;
    
    switch (request.type) {
      case 'expansion':
        generatedContent = await this.generateExpansionContent(originalText, request, voiceAnalysis);
        break;
      case 'bridge':
        generatedContent = await this.generateBridgeContent(originalText, request, voiceAnalysis);
        break;
      case 'development':
        generatedContent = await this.generateDevelopmentContent(originalText, request, voiceAnalysis);
        break;
      case 'creative':
        generatedContent = await this.generateCreativeContent(originalText, request, voiceAnalysis);
        break;
      default:
        generatedContent = await this.generateGenericContent(originalText, request, voiceAnalysis);
    }
    
    // Calculate matching confidence
    const matchingConfidence = this.calculateVoiceMatchingConfidence(
      generatedContent,
      voiceAnalysis
    );
    
    // Identify integration points
    const integrationPoints = this.identifyIntegrationPoints(
      originalText,
      generatedContent,
      request
    );
    
    return {
      content: generatedContent,
      type: request.type,
      wordCount: generatedContent.split(/\s+/).length,
      integrationPoints,
      matchingConfidence
    };
  }

  /**
   * Generate expansion content
   */
  private async generateExpansionContent(
    originalText: string,
    request: ContentGenerationRequest,
    voiceAnalysis: VoiceAnalysis
  ): Promise<string> {
    // Find the last sentence or paragraph to expand upon
    const sentences = originalText.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const lastSentence = sentences[sentences.length - 1]?.trim();
    
    if (!lastSentence) {
      return this.generateContentWithVoice(
        "The content requires development to fully explore the topic at hand.",
        voiceAnalysis
      );
    }
    
    // Extract key concepts from the last sentence
    const keyConcepts = this.extractKeyConcepts(lastSentence);
    
    // Generate expansion based on these concepts and voice
    return this.generateContentWithVoice(
      this.createExpansionText(keyConcepts, request, voiceAnalysis),
      voiceAnalysis
    );
  }

  /**
   * Generate bridge content
   */
  private async generateBridgeContent(
    originalText: string,
    request: ContentGenerationRequest,
    voiceAnalysis: VoiceAnalysis
  ): Promise<string> {
    const previousContext = request.previousContext || '';
    const nextContext = request.nextContext || '';
    
    if (!previousContext && !nextContext) {
      return this.generateContentWithVoice(
        "This transition connects the preceding ideas with what follows.",
        voiceAnalysis
      );
    }
    
    // Identify the concepts that need bridging
    const prevConcepts = this.extractKeyConcepts(previousContext);
    const nextConcepts = this.extractKeyConcepts(nextContext);
    
    // Create logical bridge
    return this.generateContentWithVoice(
      this.createBridgeText(prevConcepts, nextConcepts, voiceAnalysis),
      voiceAnalysis
    );
  }

  /**
   * Generate development content
   */
  private async generateDevelopmentContent(
    originalText: string,
    request: ContentGenerationRequest,
    voiceAnalysis: VoiceAnalysis
  ): Promise<string> {
    // Analyze what aspects need development
    const developmentNeeds = this.identifyDevelopmentNeeds(originalText);
    
    if (developmentNeeds.includes('examples')) {
      return this.generateContentWithVoice(
        this.createExampleContent(originalText, voiceAnalysis),
        voiceAnalysis
      );
    } else if (developmentNeeds.includes('evidence')) {
      return this.generateContentWithVoice(
        this.createEvidenceContent(originalText, voiceAnalysis),
        voiceAnalysis
      );
    } else if (developmentNeeds.includes('explanation')) {
      return this.generateContentWithVoice(
        this.createExplanationContent(originalText, voiceAnalysis),
        voiceAnalysis
      );
    }
    
    return this.generateContentWithVoice(
      "The preceding point merits further exploration to fully understand its implications and significance.",
      voiceAnalysis
    );
  }

  /**
   * Generate creative content
   */
  private async generateCreativeContent(
    originalText: string,
    request: ContentGenerationRequest,
    voiceAnalysis: VoiceAnalysis
  ): Promise<string> {
    // Determine the creative direction based on existing content
    const creativeDirection = this.identifyCreativeDirection(originalText);
    
    switch (creativeDirection) {
      case 'narrative':
        return this.generateContentWithVoice(
          this.createNarrativeContent(originalText, voiceAnalysis),
          voiceAnalysis
        );
      case 'descriptive':
        return this.generateContentWithVoice(
          this.createDescriptiveContent(originalText, voiceAnalysis),
          voiceAnalysis
        );
      case 'dialogue':
        return this.generateContentWithVoice(
          this.createDialogueContent(originalText, voiceAnalysis),
          voiceAnalysis
        );
      default:
        return this.generateContentWithVoice(
          this.createGeneralCreativeContent(originalText, voiceAnalysis),
          voiceAnalysis
        );
    }
  }

  /**
   * Generate content that matches the author's voice
   */
  private generateContentWithVoice(baseContent: string, voiceAnalysis: VoiceAnalysis): string {
    let styledContent = baseContent;
    
    // Adjust sentence length to match author's style
    if (voiceAnalysis.averageSentenceLength > 20) {
      styledContent = this.createLongerSentences(styledContent);
    } else if (voiceAnalysis.averageSentenceLength < 10) {
      styledContent = this.createShorterSentences(styledContent);
    }
    
    // Adjust vocabulary complexity
    if (voiceAnalysis.vocabularyComplexity === 'advanced' || voiceAnalysis.vocabularyComplexity === 'expert') {
      styledContent = this.enhanceVocabulary(styledContent);
    } else if (voiceAnalysis.vocabularyComplexity === 'basic') {
      styledContent = this.simplifyVocabulary(styledContent);
    }
    
    // Adjust formality level
    if (voiceAnalysis.formalityLevel === 'formal') {
      styledContent = this.makeFormal(styledContent);
    } else if (voiceAnalysis.formalityLevel === 'informal' || voiceAnalysis.formalityLevel === 'casual') {
      styledContent = this.makeCasual(styledContent);
    }
    
    // Apply unique patterns
    for (const pattern of voiceAnalysis.uniquePatterns) {
      styledContent = this.applyUniquePattern(styledContent, pattern);
    }
    
    return styledContent;
  }

  /**
   * Content generation helper methods
   */
  private extractKeyConcepts(text: string): string[] {
    // Simple keyword extraction - in production, use more sophisticated NLP
    const words = text.toLowerCase().split(/\s+/);
    const stopWords = new Set(['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']);
    
    return words
      .filter(word => word.length > 4 && !stopWords.has(word))
      .filter((word, index, arr) => arr.indexOf(word) === index) // unique
      .slice(0, 5); // top 5
  }

  private createExpansionText(concepts: string[], request: ContentGenerationRequest, voiceAnalysis: VoiceAnalysis): string {
    const primaryConcept = concepts[0] || 'this topic';
    
    return `This aspect of ${primaryConcept} deserves deeper examination. The implications extend beyond the surface level, revealing connections that illuminate the broader context. Understanding these relationships provides valuable insight into the underlying mechanisms at work.`;
  }

  private createBridgeText(prevConcepts: string[], nextConcepts: string[], voiceAnalysis: VoiceAnalysis): string {
    const prevKey = prevConcepts[0] || 'the previous point';
    const nextKey = nextConcepts[0] || 'the following discussion';
    
    return `Having explored ${prevKey}, we can now turn our attention to ${nextKey}. This transition represents a natural progression in our understanding, building upon the foundation we've established.`;
  }

  private createExampleContent(originalText: string, voiceAnalysis: VoiceAnalysis): string {
    return `Consider, for example, a situation where these principles apply directly. In such cases, we can observe the practical implications firsthand, providing concrete evidence for the theoretical framework being discussed.`;
  }

  private createEvidenceContent(originalText: string, voiceAnalysis: VoiceAnalysis): string {
    return `Research in this area supports this conclusion through multiple studies that demonstrate consistent patterns. The data reveals trends that align with theoretical predictions, strengthening the argument through empirical validation.`;
  }

  private createExplanationContent(originalText: string, voiceAnalysis: VoiceAnalysis): string {
    return `To understand this more fully, we must examine the underlying mechanisms that drive these outcomes. The process involves several interconnected factors that work together to produce the observed results.`;
  }

  private createNarrativeContent(originalText: string, voiceAnalysis: VoiceAnalysis): string {
    return `The story continues to unfold as new developments emerge. Each chapter reveals additional layers of complexity, drawing the reader deeper into the unfolding narrative.`;
  }

  private createDescriptiveContent(originalText: string, voiceAnalysis: VoiceAnalysis): string {
    return `The scene comes alive with vivid detail, each element contributing to the overall atmosphere. Colors, textures, and sounds combine to create an immersive experience that engages all the senses.`;
  }

  private createDialogueContent(originalText: string, voiceAnalysis: VoiceAnalysis): string {
    return `"The situation requires careful consideration," she said, weighing the options before them. "We need to think through all the implications before making our decision."`;
  }

  private createGeneralCreativeContent(originalText: string, voiceAnalysis: VoiceAnalysis): string {
    return `The creative possibilities stretch before us like an open horizon. Each choice we make opens new pathways while closing others, creating a unique trajectory through the landscape of imagination.`;
  }

  /**
   * Voice styling helper methods
   */
  private createLongerSentences(text: string): string {
    return text.replace(/\. /g, ', which ').replace(/,which $/, '.');
  }

  private createShorterSentences(text: string): string {
    return text.replace(/, which /g, '. This ');
  }

  private enhanceVocabulary(text: string): string {
    const substitutions: Record<string, string> = {
      'understand': 'comprehend',
      'show': 'demonstrate',
      'help': 'facilitate',
      'use': 'utilize',
      'important': 'significant'
    };
    
    let enhanced = text;
    Object.entries(substitutions).forEach(([simple, complex]) => {
      enhanced = enhanced.replace(new RegExp(`\\b${simple}\\b`, 'gi'), complex);
    });
    
    return enhanced;
  }

  private simplifyVocabulary(text: string): string {
    const substitutions: Record<string, string> = {
      'demonstrate': 'show',
      'facilitate': 'help',
      'utilize': 'use',
      'significant': 'important'
    };
    
    let simplified = text;
    Object.entries(substitutions).forEach(([complex, simple]) => {
      simplified = simplified.replace(new RegExp(`\\b${complex}\\b`, 'gi'), simple);
    });
    
    return simplified;
  }

  private makeFormal(text: string): string {
    return text
      .replace(/\bcan't\b/g, 'cannot')
      .replace(/\bwon't\b/g, 'will not')
      .replace(/\bdon't\b/g, 'do not')
      .replace(/\bit's\b/g, 'it is');
  }

  private makeCasual(text: string): string {
    return text
      .replace(/\bcannot\b/g, "can't")
      .replace(/\bwill not\b/g, "won't")
      .replace(/\bdo not\b/g, "don't")
      .replace(/\bit is\b/g, "it's");
  }

  private applyUniquePattern(text: string, pattern: string): string {
    switch (pattern) {
      case 'em-dash-usage':
        return text.replace(/,/g, '—');
      case 'semicolon-heavy':
        return text.replace(/\. /g, '; ');
      default:
        return text;
    }
  }

  /**
   * Analysis helper methods
   */
  private inferContentType(text: string): 'expansion' | 'bridge' | 'development' | 'creative' {
    if (text.length < 100) return 'expansion';
    if (text.includes('however') || text.includes('therefore')) return 'bridge';
    if (text.includes('example') || text.includes('evidence')) return 'development';
    return 'creative';
  }

  private getDefaultTargetLength(type: string): number {
    switch (type) {
      case 'expansion': return 150;
      case 'bridge': return 75;
      case 'development': return 200;
      case 'creative': return 250;
      default: return 150;
    }
  }

  private inferRequirements(text: string, type: string): string[] {
    const requirements: string[] = [];
    
    if (type === 'development') {
      if (text.toLowerCase().includes('study') || text.toLowerCase().includes('research')) {
        requirements.push('include-evidence');
      }
      if (text.toLowerCase().includes('example')) {
        requirements.push('provide-examples');
      }
    }
    
    return requirements;
  }

  private identifyDevelopmentNeeds(text: string): string[] {
    const needs: string[] = [];
    
    if (!text.toLowerCase().includes('example') && text.length > 200) {
      needs.push('examples');
    }
    if (!text.toLowerCase().includes('study') && !text.toLowerCase().includes('research')) {
      needs.push('evidence');
    }
    if (text.split('.').length < 3) {
      needs.push('explanation');
    }
    
    return needs;
  }

  private identifyCreativeDirection(text: string): 'narrative' | 'descriptive' | 'dialogue' | 'general' {
    if (text.includes('"') && text.includes('said')) return 'dialogue';
    if (text.includes('scene') || text.includes('imagery')) return 'descriptive';
    if (text.includes('story') || text.includes('narrative')) return 'narrative';
    return 'general';
  }

  private calculateVoiceMatchingConfidence(content: string, voiceAnalysis: VoiceAnalysis): number {
    let confidence = 0.7; // Base confidence
    
    // Check sentence length match
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = content.split(/\s+/).filter(w => w.length > 0);
    const avgLength = words.length / sentences.length;
    
    const lengthDiff = Math.abs(avgLength - voiceAnalysis.averageSentenceLength);
    if (lengthDiff < 3) confidence += 0.1;
    else if (lengthDiff > 10) confidence -= 0.1;
    
    // Check vocabulary complexity match
    const complexWords = content.match(/\b\w{8,}\b/g) || [];
    const complexityRatio = complexWords.length / words.length;
    
    const expectedComplexity = {
      'basic': 0.05,
      'intermediate': 0.1,
      'advanced': 0.15,
      'expert': 0.2
    }[voiceAnalysis.vocabularyComplexity] || 0.1;
    
    if (Math.abs(complexityRatio - expectedComplexity) < 0.05) confidence += 0.1;
    
    return Math.min(0.95, Math.max(0.5, confidence));
  }

  private identifyIntegrationPoints(
    originalText: string,
    generatedContent: string,
    request: ContentGenerationRequest
  ): Array<{ location: string; connectionType: string; rationale: string }> {
    const integrationPoints: Array<{ location: string; connectionType: string; rationale: string }> = [];
    
    if (request.insertionPoint !== undefined) {
      integrationPoints.push({
        location: `Character ${request.insertionPoint}`,
        connectionType: 'direct-insertion',
        rationale: 'Content designed for specific insertion point'
      });
    } else {
      integrationPoints.push({
        location: 'End of text',
        connectionType: 'continuation',
        rationale: 'Generated content continues from the existing text'
      });
    }
    
    return integrationPoints;
  }

  private describeContentPurpose(request: ContentGenerationRequest): string {
    switch (request.type) {
      case 'expansion': return 'Expand and develop existing ideas with additional detail';
      case 'bridge': return 'Create smooth transitions between different sections or concepts';
      case 'development': return 'Provide supporting evidence, examples, or explanations';
      case 'creative': return 'Generate imaginative content that enhances the narrative or artistic expression';
      default: return 'Generate contextually appropriate content';
    }
  }

  private assessGeneratedContent(
    generatedContent: GeneratedContent,
    originalText: string,
    voiceAnalysis: VoiceAnalysis
  ): {
    coherenceScore: number;
    voiceConsistency: number;
    contentValue: 'essential' | 'valuable' | 'helpful' | 'adequate';
    revisionNeeded: boolean;
  } {
    const coherenceScore = this.calculateCoherenceScore(generatedContent.content, originalText);
    const voiceConsistency = generatedContent.matchingConfidence;
    
    let contentValue: 'essential' | 'valuable' | 'helpful' | 'adequate';
    if (generatedContent.wordCount > 100 && coherenceScore > 0.8) {
      contentValue = 'essential';
    } else if (coherenceScore > 0.7) {
      contentValue = 'valuable';
    } else if (coherenceScore > 0.6) {
      contentValue = 'helpful';
    } else {
      contentValue = 'adequate';
    }
    
    const revisionNeeded = voiceConsistency < 0.7 || coherenceScore < 0.6;
    
    return {
      coherenceScore,
      voiceConsistency,
      contentValue,
      revisionNeeded
    };
  }

  private calculateCoherenceScore(generatedContent: string, originalText: string): number {
    // Simple coherence calculation based on shared vocabulary and concepts
    const originalWords = new Set(originalText.toLowerCase().split(/\s+/));
    const generatedWords = new Set(generatedContent.toLowerCase().split(/\s+/));
    
    const sharedWords = new Set([...originalWords].filter(word => generatedWords.has(word)));
    const totalUniqueWords = new Set([...originalWords, ...generatedWords]).size;
    
    return Math.min(0.9, (sharedWords.size / totalUniqueWords) * 2); // Scale for coherence score
  }

  private generateCollaborativeNotes(
    generatedContent: GeneratedContent,
    request: ContentGenerationRequest,
    qualityAssessment: any
  ): {
    authorGuidance: string;
    alternativeApproaches?: string[];
    developmentSuggestions?: string[];
    potentialChallenges?: string[];
  } {
    let authorGuidance = `Generated ${request.type} content with ${generatedContent.wordCount} words. `;
    
    if (qualityAssessment.revisionNeeded) {
      authorGuidance += 'Consider reviewing for voice consistency and integration with your existing text.';
    } else {
      authorGuidance += 'Content integrates well with your existing style and should flow naturally.';
    }
    
    const alternativeApproaches: string[] = [];
    if (request.type === 'expansion') {
      alternativeApproaches.push('Consider adding specific examples instead of general elaboration');
      alternativeApproaches.push('Focus on a single aspect for deeper exploration');
    }
    
    const developmentSuggestions: string[] = [];
    if (generatedContent.wordCount < 100) {
      developmentSuggestions.push('Content could be expanded further with additional detail');
    }
    if (!generatedContent.content.includes('example')) {
      developmentSuggestions.push('Consider adding specific examples to illustrate points');
    }
    
    const potentialChallenges: string[] = [];
    if (qualityAssessment.voiceConsistency < 0.8) {
      potentialChallenges.push('Voice matching may need adjustment to better align with your style');
    }
    
    return {
      authorGuidance,
      alternativeApproaches,
      developmentSuggestions,
      potentialChallenges
    };
  }

  /**
   * Voice analysis helper methods (shared with CopyEditor)
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
    if (text.match(/\bI think\b|\bI believe\b/i)) characteristics.push('personal');
    if (text.match(/\bshould\b|\bmust\b|\bneed to\b/i)) characteristics.push('directive');
    
    return characteristics;
  }

  private identifyStylPatterns(text: string): string[] {
    const patterns: string[] = [];
    
    if (text.match(/—/g)?.length > 2) patterns.push('em-dash-usage');
    if (text.match(/;/g)?.length > 2) patterns.push('semicolon-heavy');
    if (text.match(/\([^)]+\)/g)?.length > 2) patterns.push('parenthetical-asides');
    if (text.match(/\*[^*]+\*/g)?.length > 0) patterns.push('emphasis-markers');
    
    return patterns;
  }
}