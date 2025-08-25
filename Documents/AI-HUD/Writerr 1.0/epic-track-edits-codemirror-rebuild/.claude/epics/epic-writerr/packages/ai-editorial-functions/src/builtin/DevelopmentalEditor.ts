/**
 * @fileoverview Developmental Editor built-in function implementation
 */

import { 
  DevelopmentalEditorConfig, 
  BuiltinFunctionResult,
  StructuralAnalysis,
  ContentAnalysis
} from './types';

interface DevelopmentalRecommendation {
  type: 'reorganize' | 'develop-content' | 'improve-transitions' | 'strengthen-argument' | 'add-evidence' | 'clarify-purpose' | 'enhance-flow';
  priority: 'critical' | 'important' | 'helpful' | 'optional';
  section: string;
  current?: string;
  suggested: string;
  rationale: string;
  expectedImpact: 'major-improvement' | 'moderate-improvement' | 'minor-improvement';
  effortLevel: 'minimal' | 'moderate' | 'substantial' | 'extensive';
}

interface ContentSection {
  index: number;
  title: string;
  content: string;
  wordCount: number;
  purpose: string;
  effectiveness: 'strong' | 'adequate' | 'weak';
  issues: string[];
}

export class DevelopmentalEditor {
  private config: DevelopmentalEditorConfig;

  constructor(config: DevelopmentalEditorConfig) {
    this.config = config;
  }

  /**
   * Process text with developmental editing analysis
   */
  async process(text: string, context?: any): Promise<BuiltinFunctionResult> {
    const startTime = Date.now();
    
    try {
      // Parse the text into sections
      const sections = this.parseIntoSections(text);
      
      // Perform structural analysis
      const structuralAnalysis = await this.analyzeStructure(sections);
      
      // Perform content analysis
      const contentAnalysis = await this.analyzeContent(sections, text);
      
      // Generate recommendations
      const recommendations = await this.generateRecommendations(
        structuralAnalysis, 
        contentAnalysis, 
        sections
      );
      
      // Create developmental summary
      const developmentalSummary = this.createDevelopmentalSummary(
        structuralAnalysis,
        contentAnalysis,
        recommendations
      );
      
      return {
        functionId: 'developmental-editor',
        success: true,
        output: text, // Developmental editing doesn't change the text directly
        metadata: {
          structuralAnalysis,
          contentAnalysis,
          recommendations,
          developmentalSummary,
          sectionsAnalyzed: sections.length
        },
        confidence: this.calculateConfidence(recommendations),
        executionTime: Date.now() - startTime
      };
    } catch (error) {
      return {
        functionId: 'developmental-editor',
        success: false,
        error: (error as Error).message,
        executionTime: Date.now() - startTime
      };
    }
  }

  /**
   * Parse text into logical sections
   */
  private parseIntoSections(text: string): ContentSection[] {
    const sections: ContentSection[] = [];
    
    // Split by paragraphs first
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    
    // Look for section headers (marked by #, numbers, or obvious topic changes)
    let currentSection: ContentSection | null = null;
    let sectionIndex = 0;
    
    for (let i = 0; i < paragraphs.length; i++) {
      const paragraph = paragraphs[i].trim();
      
      // Check if this paragraph looks like a header
      const isHeader = this.isLikelyHeader(paragraph, i, paragraphs);
      
      if (isHeader || i === 0) {
        // Save previous section if exists
        if (currentSection) {
          sections.push(currentSection);
        }
        
        // Start new section
        currentSection = {
          index: sectionIndex++,
          title: isHeader ? paragraph : `Section ${sectionIndex}`,
          content: isHeader ? '' : paragraph,
          wordCount: isHeader ? 0 : paragraph.split(/\s+/).length,
          purpose: this.determineSectionPurpose(paragraph, i, paragraphs.length),
          effectiveness: 'adequate', // Will be determined later
          issues: []
        };
        
        if (!isHeader) {
          currentSection.content = paragraph;
          currentSection.wordCount = paragraph.split(/\s+/).length;
        }
      } else if (currentSection) {
        // Add to current section
        currentSection.content += '\n\n' + paragraph;
        currentSection.wordCount += paragraph.split(/\s+/).length;
      }
    }
    
    // Don't forget the last section
    if (currentSection) {
      sections.push(currentSection);
    }
    
    // Analyze each section's effectiveness
    return sections.map(section => ({
      ...section,
      effectiveness: this.assessSectionEffectiveness(section),
      issues: this.identifySectionIssues(section)
    }));
  }

  /**
   * Analyze the overall structure
   */
  private async analyzeStructure(sections: ContentSection[]): Promise<StructuralAnalysis> {
    const currentStructure = sections.map(section => ({
      section: section.title,
      purpose: section.purpose,
      effectiveness: section.effectiveness,
      issues: section.issues
    }));
    
    // Assess overall organization
    const overallOrganization = this.assessOverallOrganization(sections);
    
    // Identify primary structural issues
    const primaryStructuralIssues = this.identifyStructuralIssues(sections);
    
    return {
      currentStructure,
      overallOrganization,
      primaryStructuralIssues
    };
  }

  /**
   * Analyze content quality and completeness
   */
  private async analyzeContent(sections: ContentSection[], fullText: string): Promise<ContentAnalysis> {
    // Assess argument strength
    const argumentStrength = this.assessArgumentStrength(fullText, sections);
    
    // Evaluate evidence quality
    const evidenceQuality = this.assessEvidenceQuality(fullText);
    
    // Identify content gaps
    const contentGaps = this.identifyContentGaps(sections);
    
    // Check audience alignment
    const audienceAlignment = this.assessAudienceAlignment(fullText);
    
    return {
      argumentStrength,
      evidenceQuality,
      contentGaps,
      audienceAlignment
    };
  }

  /**
   * Generate specific recommendations for improvement
   */
  private async generateRecommendations(
    structuralAnalysis: StructuralAnalysis,
    contentAnalysis: ContentAnalysis,
    sections: ContentSection[]
  ): Promise<DevelopmentalRecommendation[]> {
    const recommendations: DevelopmentalRecommendation[] = [];
    
    // Structure-based recommendations
    if (structuralAnalysis.overallOrganization === 'needs-improvement' || 
        structuralAnalysis.overallOrganization === 'poor') {
      recommendations.push({
        type: 'reorganize',
        priority: 'critical',
        section: 'Overall',
        suggested: 'Reorganize sections for better logical flow',
        rationale: 'Current structure impedes reader comprehension',
        expectedImpact: 'major-improvement',
        effortLevel: 'substantial'
      });
    }
    
    // Content-based recommendations
    contentAnalysis.contentGaps.forEach(gap => {
      recommendations.push({
        type: 'develop-content',
        priority: gap.priority,
        section: gap.location,
        suggested: `Address ${gap.description}`,
        rationale: `Content gap identified: ${gap.description}`,
        expectedImpact: gap.priority === 'high' ? 'major-improvement' : 'moderate-improvement',
        effortLevel: gap.priority === 'high' ? 'substantial' : 'moderate'
      });
    });
    
    // Argument strength recommendations
    if (contentAnalysis.argumentStrength === 'weak' || contentAnalysis.argumentStrength === 'unclear') {
      recommendations.push({
        type: 'strengthen-argument',
        priority: 'important',
        section: 'Throughout',
        suggested: 'Strengthen central argument and supporting points',
        rationale: 'Main argument needs clearer articulation and better support',
        expectedImpact: 'major-improvement',
        effortLevel: 'moderate'
      });
    }
    
    // Evidence quality recommendations
    if (contentAnalysis.evidenceQuality === 'insufficient' || contentAnalysis.evidenceQuality === 'poor') {
      recommendations.push({
        type: 'add-evidence',
        priority: 'important',
        section: 'Supporting sections',
        suggested: 'Add stronger evidence and examples to support key points',
        rationale: 'Claims need better substantiation with evidence',
        expectedImpact: 'moderate-improvement',
        effortLevel: 'moderate'
      });
    }
    
    // Transition improvements
    const transitionIssues = this.identifyTransitionIssues(sections);
    if (transitionIssues.length > 0) {
      recommendations.push({
        type: 'improve-transitions',
        priority: 'helpful',
        section: 'Between sections',
        suggested: 'Improve transitions between sections and paragraphs',
        rationale: 'Better connections will improve flow and readability',
        expectedImpact: 'moderate-improvement',
        effortLevel: 'minimal'
      });
    }
    
    return recommendations.sort((a, b) => {
      const priorityOrder = { 'critical': 0, 'important': 1, 'helpful': 2, 'optional': 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  /**
   * Create comprehensive developmental summary
   */
  private createDevelopmentalSummary(
    structuralAnalysis: StructuralAnalysis,
    contentAnalysis: ContentAnalysis,
    recommendations: DevelopmentalRecommendation[]
  ): any {
    // Identify key strengths
    const keyStrengths: string[] = [];
    if (contentAnalysis.argumentStrength === 'compelling' || contentAnalysis.argumentStrength === 'solid') {
      keyStrengths.push('Strong central argument');
    }
    if (contentAnalysis.evidenceQuality === 'excellent' || contentAnalysis.evidenceQuality === 'good') {
      keyStrengths.push('Well-supported with evidence');
    }
    if (structuralAnalysis.overallOrganization === 'excellent' || structuralAnalysis.overallOrganization === 'good') {
      keyStrengths.push('Clear organizational structure');
    }
    
    // Identify primary opportunities
    const primaryOpportunities = recommendations
      .filter(r => r.priority === 'critical' || r.priority === 'important')
      .map(r => r.suggested);
    
    // Recommend next steps
    const recommendedNextSteps = recommendations.slice(0, 3).map(r => 
      `${r.type}: ${r.suggested}`
    );
    
    // Estimate timeline
    const criticalCount = recommendations.filter(r => r.priority === 'critical').length;
    const substantialCount = recommendations.filter(r => r.effortLevel === 'substantial' || r.effortLevel === 'extensive').length;
    
    let timelineEstimate: string;
    if (criticalCount > 2 || substantialCount > 3) {
      timelineEstimate = 'major-overhaul';
    } else if (criticalCount > 0 || substantialCount > 1) {
      timelineEstimate = 'substantial-development';
    } else if (recommendations.length > 3) {
      timelineEstimate = 'moderate-revision';
    } else {
      timelineEstimate = 'quick-fixes';
    }
    
    const overallAssessment = this.generateOverallAssessment(structuralAnalysis, contentAnalysis, recommendations);
    
    return {
      overallAssessment,
      keyStrengths,
      primaryOpportunities,
      recommendedNextSteps,
      timelineEstimate
    };
  }

  /**
   * Helper methods for analysis
   */
  private isLikelyHeader(paragraph: string, index: number, allParagraphs: string[]): boolean {
    // Simple heuristics for header detection
    if (paragraph.match(/^#+\s/)) return true; // Markdown headers
    if (paragraph.match(/^\d+\.?\s/)) return true; // Numbered headers
    if (paragraph.length < 100 && !paragraph.match(/[.!?]$/)) return true; // Short, no ending punctuation
    if (paragraph.match(/^[A-Z][A-Z\s]+$/)) return true; // ALL CAPS
    
    return false;
  }

  private determineSectionPurpose(content: string, index: number, totalSections: number): string {
    if (index === 0) return 'Introduction';
    if (index === totalSections - 1) return 'Conclusion';
    if (content.toLowerCase().includes('however') || content.toLowerCase().includes('but')) {
      return 'Counter-argument or contrast';
    }
    if (content.toLowerCase().includes('example') || content.toLowerCase().includes('for instance')) {
      return 'Supporting evidence/examples';
    }
    return 'Main content/argument';
  }

  private assessSectionEffectiveness(section: ContentSection): 'strong' | 'adequate' | 'weak' {
    // Simple heuristics for effectiveness
    if (section.wordCount < 50) return 'weak'; // Too short
    if (section.wordCount > 500 && section.purpose !== 'Main content/argument') return 'weak'; // Too long for purpose
    if (section.content.split(/[.!?]/).length < 2) return 'weak'; // Not enough sentences
    
    // Check for development indicators
    const hasExamples = section.content.toLowerCase().includes('example') || 
                       section.content.toLowerCase().includes('for instance');
    const hasTransitions = section.content.match(/\b(however|therefore|furthermore|moreover|additionally)\b/i);
    
    if (hasExamples && hasTransitions) return 'strong';
    if (hasExamples || hasTransitions) return 'adequate';
    
    return 'adequate';
  }

  private identifySectionIssues(section: ContentSection): string[] {
    const issues: string[] = [];
    
    if (section.wordCount < 50) {
      issues.push('Section too brief, needs development');
    }
    if (section.wordCount > 1000) {
      issues.push('Section very long, consider splitting');
    }
    if (!section.content.match(/[.!?]/)) {
      issues.push('No clear sentences or conclusions');
    }
    if (section.content.split(/[.!?]/).length === 1) {
      issues.push('Only one sentence, needs expansion');
    }
    
    return issues;
  }

  private assessOverallOrganization(sections: ContentSection[]): 'excellent' | 'good' | 'adequate' | 'needs-improvement' | 'poor' {
    const weakSections = sections.filter(s => s.effectiveness === 'weak').length;
    const strongSections = sections.filter(s => s.effectiveness === 'strong').length;
    
    if (weakSections === 0 && strongSections > sections.length / 2) return 'excellent';
    if (weakSections <= 1 && strongSections >= sections.length / 3) return 'good';
    if (weakSections <= sections.length / 3) return 'adequate';
    if (weakSections < sections.length / 2) return 'needs-improvement';
    return 'poor';
  }

  private identifyStructuralIssues(sections: ContentSection[]): string[] {
    const issues: string[] = [];
    
    if (sections.length < 3) {
      issues.push('Content lacks clear structure with introduction, body, and conclusion');
    }
    
    const hasIntroduction = sections.some(s => s.purpose === 'Introduction');
    const hasConclusion = sections.some(s => s.purpose === 'Conclusion');
    
    if (!hasIntroduction) {
      issues.push('Missing clear introduction section');
    }
    if (!hasConclusion) {
      issues.push('Missing clear conclusion section');
    }
    
    const unevenSections = sections.filter(s => s.wordCount < 50 || s.wordCount > 1000);
    if (unevenSections.length > sections.length / 3) {
      issues.push('Uneven section development - some too brief, others too long');
    }
    
    return issues;
  }

  private assessArgumentStrength(fullText: string, sections: ContentSection[]): 'compelling' | 'solid' | 'adequate' | 'weak' | 'unclear' {
    // Look for argument indicators
    const argumentWords = ['argue', 'claim', 'assert', 'contend', 'propose', 'thesis'];
    const evidenceWords = ['evidence', 'data', 'research', 'study', 'example', 'demonstrates'];
    const conclusionWords = ['therefore', 'thus', 'consequently', 'in conclusion'];
    
    let argumentScore = 0;
    
    argumentWords.forEach(word => {
      if (fullText.toLowerCase().includes(word)) argumentScore += 2;
    });
    
    evidenceWords.forEach(word => {
      const matches = (fullText.toLowerCase().match(new RegExp(word, 'g')) || []).length;
      argumentScore += matches;
    });
    
    conclusionWords.forEach(word => {
      if (fullText.toLowerCase().includes(word)) argumentScore += 1;
    });
    
    if (argumentScore >= 10) return 'compelling';
    if (argumentScore >= 7) return 'solid';
    if (argumentScore >= 4) return 'adequate';
    if (argumentScore >= 2) return 'weak';
    return 'unclear';
  }

  private assessEvidenceQuality(fullText: string): 'excellent' | 'good' | 'adequate' | 'insufficient' | 'poor' {
    const evidenceIndicators = [
      'study', 'research', 'data', 'statistics', 'survey', 'experiment',
      'according to', 'source', 'reference', 'citation', 'example'
    ];
    
    let evidenceCount = 0;
    evidenceIndicators.forEach(indicator => {
      const matches = (fullText.toLowerCase().match(new RegExp(indicator, 'g')) || []).length;
      evidenceCount += matches;
    });
    
    const wordCount = fullText.split(/\s+/).length;
    const evidenceRatio = evidenceCount / (wordCount / 100); // Per 100 words
    
    if (evidenceRatio >= 3) return 'excellent';
    if (evidenceRatio >= 2) return 'good';
    if (evidenceRatio >= 1) return 'adequate';
    if (evidenceRatio >= 0.5) return 'insufficient';
    return 'poor';
  }

  private identifyContentGaps(sections: ContentSection[]): Array<{
    type: 'missing-info' | 'underdeveloped' | 'unclear' | 'unsupported';
    location: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
  }> {
    const gaps: Array<{
      type: 'missing-info' | 'underdeveloped' | 'unclear' | 'unsupported';
      location: string;
      description: string;
      priority: 'high' | 'medium' | 'low';
    }> = [];
    
    sections.forEach(section => {
      if (section.wordCount < 50) {
        gaps.push({
          type: 'underdeveloped',
          location: section.title,
          description: 'Section needs expansion with more detail and examples',
          priority: 'medium'
        });
      }
      
      if (section.issues.includes('No clear sentences or conclusions')) {
        gaps.push({
          type: 'unclear',
          location: section.title,
          description: 'Section lacks clear structure and conclusions',
          priority: 'high'
        });
      }
    });
    
    return gaps;
  }

  private assessAudienceAlignment(fullText: string): 'excellent' | 'good' | 'adequate' | 'misaligned' | 'unclear' {
    // Simple heuristic based on complexity and explanation
    const complexWords = fullText.match(/\b\w{10,}\b/g) || [];
    const totalWords = fullText.split(/\s+/).length;
    const complexityRatio = complexWords.length / totalWords;
    
    const explanationWords = ['explain', 'definition', 'means', 'refers to', 'in other words'];
    const hasExplanations = explanationWords.some(word => 
      fullText.toLowerCase().includes(word)
    );
    
    if (complexityRatio > 0.15 && !hasExplanations) return 'misaligned';
    if (complexityRatio < 0.05 && fullText.length > 1000) return 'misaligned';
    if (hasExplanations && complexityRatio <= 0.1) return 'excellent';
    if (hasExplanations) return 'good';
    
    return 'adequate';
  }

  private identifyTransitionIssues(sections: ContentSection[]): string[] {
    const issues: string[] = [];
    
    for (let i = 1; i < sections.length; i++) {
      const currentSection = sections[i];
      const previousSection = sections[i - 1];
      
      // Check if section starts abruptly
      const transitionWords = ['however', 'furthermore', 'additionally', 'moreover', 'consequently'];
      const hasTransition = transitionWords.some(word => 
        currentSection.content.toLowerCase().startsWith(word) ||
        currentSection.content.toLowerCase().includes(`. ${word}`) ||
        currentSection.content.toLowerCase().includes(`\n${word}`)
      );
      
      if (!hasTransition) {
        issues.push(`Abrupt transition from "${previousSection.title}" to "${currentSection.title}"`);
      }
    }
    
    return issues;
  }

  private generateOverallAssessment(
    structuralAnalysis: StructuralAnalysis,
    contentAnalysis: ContentAnalysis,
    recommendations: DevelopmentalRecommendation[]
  ): string {
    const criticalIssues = recommendations.filter(r => r.priority === 'critical').length;
    const importantIssues = recommendations.filter(r => r.priority === 'important').length;
    
    if (criticalIssues > 2) {
      return 'This piece requires significant structural and content development to achieve its potential. Focus first on addressing the most critical organizational and argument issues before refining details.';
    } else if (criticalIssues > 0 || importantIssues > 3) {
      return 'This piece has a solid foundation but needs focused development in key areas. Addressing the identified structural and content issues will substantially improve its effectiveness.';
    } else if (importantIssues > 0) {
      return 'This is a well-developed piece that would benefit from some targeted improvements. The suggestions focus on enhancing clarity and strengthening the overall impact.';
    } else {
      return 'This piece demonstrates strong development and organization. The suggestions are minor refinements that could enhance an already effective piece of writing.';
    }
  }

  private calculateConfidence(recommendations: DevelopmentalRecommendation[]): number {
    // Confidence decreases with more critical issues found
    const criticalCount = recommendations.filter(r => r.priority === 'critical').length;
    const importantCount = recommendations.filter(r => r.priority === 'important').length;
    
    let baseConfidence = 0.8;
    baseConfidence -= criticalCount * 0.05;
    baseConfidence -= importantCount * 0.02;
    
    return Math.max(0.65, Math.min(0.9, baseConfidence));
  }
}