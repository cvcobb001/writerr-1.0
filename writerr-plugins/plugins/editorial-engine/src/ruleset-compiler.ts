import { 
  ModeDefinition, 
  CompiledRuleset, 
  ProcessingIntent, 
  ExecutionRuleset,
  CompiledConstraint,
  ConstraintType,
  ValidationRule,
  ExecutionParameters,
  ParsedRule,
  NaturalLanguageRules 
} from './types';

export class RulesetCompiler {
  private nlProcessor: NaturalLanguageProcessor;

  constructor() {
    this.nlProcessor = new NaturalLanguageProcessor();
  }

  async compile(intent: ProcessingIntent, mode: ModeDefinition): Promise<ExecutionRuleset> {
    // Use the mode's compiled constraints if available
    if (mode.constraints && mode.constraints.length > 0) {
      return {
        constraints: mode.constraints,
        validationRules: this.generateValidationRules(mode.constraints),
        executionParams: this.deriveExecutionParams(intent),
        compiledAt: Date.now()
      };
    }

    // Otherwise, compile from natural language rules
    return await this.compileMode(mode);
  }

  async compileMode(mode: ModeDefinition): Promise<CompiledRuleset> {
    // Parse natural language rules
    const parsedRules = await this.parseNaturalLanguage(mode.naturalLanguageRules);
    
    // Extract constraints from parsed rules
    const constraints = await this.mapToConstraints(parsedRules);
    
    // Generate validation rules
    const validationRules = this.generateValidationRules(constraints);
    
    // Create default execution parameters
    const executionParams: ExecutionParameters = {
      timeout: 10000, // 10 seconds default
      maxRetries: 2,
      preferredAdapters: ['track-edits'],
      fallbackStrategy: 'graceful-degradation'
    };
    
    return {
      constraints,
      validationRules,
      executionParams,
      compiledAt: Date.now()
    };
  }

  private async parseNaturalLanguage(rules: NaturalLanguageRules): Promise<ParsedRule[]> {
    const results: ParsedRule[] = [];

    // Parse allowed rules (permissions)
    for (const rule of rules.allowed) {
      const parsed = await this.nlProcessor.parse(rule, 'permission');
      results.push(parsed);
    }

    // Parse forbidden rules (prohibitions)
    for (const rule of rules.forbidden) {
      const parsed = await this.nlProcessor.parse(rule, 'prohibition');
      results.push(parsed);
    }

    // Parse focus rules (guidance)
    for (const rule of rules.focus) {
      const parsed = await this.nlProcessor.parse(rule, 'focus');
      results.push(parsed);
    }

    // Parse boundary rules (limits)
    for (const rule of rules.boundaries) {
      const parsed = await this.nlProcessor.parse(rule, 'boundary');
      results.push(parsed);
    }

    return results;
  }

  private async mapToConstraints(parsedRules: ParsedRule[]): Promise<CompiledConstraint[]> {
    const constraints: CompiledConstraint[] = [];

    for (const rule of parsedRules) {
      const constraint = this.ruleToConstraint(rule);
      if (constraint) {
        constraints.push(constraint);
      }
    }

    return constraints;
  }

  private ruleToConstraint(rule: ParsedRule): CompiledConstraint | null {
    // Map parsed natural language rules to programmatic constraints
    
    switch (rule.type) {
      case 'permission':
        return this.createPermissionConstraint(rule);
      
      case 'prohibition':
        return this.createProhibitionConstraint(rule);
      
      case 'boundary':
        return this.createBoundaryConstraint(rule);
      
      case 'focus':
        return this.createFocusConstraint(rule);
      
      default:
        console.warn(`Unknown rule type: ${rule.type}`);
        return null;
    }
  }

  private createPermissionConstraint(rule: ParsedRule): CompiledConstraint {
    // Example: "Fix spelling and grammar errors" -> GRAMMAR_ONLY constraint
    const intent = rule.intent.toLowerCase();
    
    if (intent.includes('grammar') || intent.includes('spelling')) {
      return {
        type: ConstraintType.GRAMMAR_ONLY,
        parameters: { 
          allowSpelling: true,
          allowGrammar: true,
          allowPunctuation: true
        },
        priority: rule.confidence * 10,
        validation: [{
          type: 'output-validation',
          condition: 'minimal-content-change',
          message: 'Changes should be limited to grammar and spelling'
        }]
      };
    }

    // Default permission constraint
    return {
      type: ConstraintType.STYLE_CONSISTENCY,
      parameters: { allowedOperations: [rule.intent] },
      priority: rule.confidence * 10,
      validation: []
    };
  }

  private createProhibitionConstraint(rule: ParsedRule): CompiledConstraint {
    // Example: "Never change the author's voice" -> PRESERVE_TONE constraint
    const intent = rule.intent.toLowerCase();
    
    if (intent.includes('voice') || intent.includes('style') || intent.includes('tone')) {
      return {
        type: ConstraintType.PRESERVE_TONE,
        parameters: { 
          preserveVoice: true,
          preserveStyle: true,
          allowMinorAdjustments: false
        },
        priority: rule.confidence * 10,
        validation: [{
          type: 'tone-analysis',
          condition: 'tone-similarity > 0.9',
          message: 'Must preserve original tone and voice'
        }]
      };
    }

    if (intent.includes('content') || intent.includes('meaning')) {
      return {
        type: ConstraintType.NO_CONTENT_CHANGE,
        parameters: { 
          preserveMeaning: true,
          allowClarification: false
        },
        priority: rule.confidence * 10,
        validation: [{
          type: 'semantic-analysis',
          condition: 'meaning-similarity > 0.95',
          message: 'Must preserve original meaning'
        }]
      };
    }

    // Default prohibition
    return {
      type: ConstraintType.NO_CONTENT_CHANGE,
      parameters: { prohibitedAction: rule.intent },
      priority: rule.confidence * 10,
      validation: []
    };
  }

  private createBoundaryConstraint(rule: ParsedRule): CompiledConstraint {
    // Example: "Change no more than 15% of words" -> LENGTH_LIMIT constraint
    const intent = rule.intent.toLowerCase();
    
    // Extract percentage limits
    const percentageMatch = intent.match(/(\d+)%/);
    if (percentageMatch) {
      const percentage = parseInt(percentageMatch[1]) / 100;
      
      return {
        type: ConstraintType.LENGTH_LIMIT,
        parameters: { 
          maxChangeRatio: percentage,
          measurementType: 'words'
        },
        priority: rule.confidence * 10,
        validation: [{
          type: 'change-ratio-check',
          condition: `change-ratio <= ${percentage}`,
          message: `Changes must not exceed ${percentageMatch[1]}% of original text`
        }]
      };
    }

    // Default boundary constraint
    return {
      type: ConstraintType.LENGTH_LIMIT,
      parameters: { maxChangeRatio: 0.25 }, // 25% default limit
      priority: rule.confidence * 10,
      validation: []
    };
  }

  private createFocusConstraint(rule: ParsedRule): CompiledConstraint {
    // Focus constraints guide the editing process
    return {
      type: ConstraintType.STYLE_CONSISTENCY,
      parameters: { 
        focusArea: rule.intent,
        priority: 'high'
      },
      priority: rule.confidence * 10,
      validation: []
    };
  }

  private generateValidationRules(constraints: CompiledConstraint[]): ValidationRule[] {
    const rules: ValidationRule[] = [];

    // Collect validation rules from all constraints
    for (const constraint of constraints) {
      rules.push(...constraint.validation);
    }

    // Add default validation rules
    rules.push({
      type: 'basic-validation',
      condition: 'output-not-empty',
      message: 'Output must not be empty'
    });

    return rules;
  }

  private deriveExecutionParams(intent: ProcessingIntent): ExecutionParameters {
    // Adjust execution parameters based on intent
    let timeout = 10000; // Default 10 seconds
    
    if (intent.type === 'summarization') {
      timeout = 15000; // Summarization might take longer
    } else if (intent.type === 'grammar-check') {
      timeout = 5000; // Grammar checking should be fast
    }

    return {
      timeout,
      maxRetries: 2,
      preferredAdapters: ['track-edits'],
      fallbackStrategy: 'graceful-degradation'
    };
  }
}

class NaturalLanguageProcessor {
  // Common patterns for better rule parsing
  private readonly QUANTIFIER_PATTERNS = [
    /(\d+)\s*%/i,                           // "25%", "50%"
    /no more than\s+(\d+)\s*%/i,           // "no more than 15%"
    /less than\s+(\d+)\s*%/i,              // "less than 20%"
    /under\s+(\d+)\s*%/i,                  // "under 10%"
    /(\d+)\s*(words?|characters?|sentences?)/i, // "100 words", "50 characters"
    /minimal(?:ly)?/i,                     // "minimal changes"
    /maximum\s+(\d+)/i                     // "maximum 3 sentences"
  ];

  private readonly PERMISSION_KEYWORDS = [
    'allow', 'permit', 'enable', 'fix', 'correct', 'improve', 'enhance', 
    'adjust', 'modify', 'update', 'refine', 'polish', 'standardize'
  ];

  private readonly PROHIBITION_KEYWORDS = [
    'never', 'don\'t', 'avoid', 'prevent', 'prohibit', 'forbid', 
    'exclude', 'reject', 'disallow', 'no', 'not'
  ];

  private readonly FOCUS_KEYWORDS = [
    'focus', 'emphasize', 'prioritize', 'concentrate', 'target', 
    'highlight', 'stress', 'feature'
  ];

  private readonly BOUNDARY_KEYWORDS = [
    'limit', 'restrict', 'bound', 'constrain', 'cap', 'maximum', 
    'minimum', 'within', 'under', 'over'
  ];

  async parse(rule: string, ruleType: string): Promise<ParsedRule> {
    // Enhanced rule parsing with better NLP analysis
    const confidence = this.calculateConfidence(rule);
    const intent = this.extractIntent(rule, ruleType);
    const parameters = this.extractParameters(rule);
    const context = this.extractContext(rule);
    const constraints = this.extractConstraintHints(rule);

    return {
      type: ruleType,
      intent,
      confidence,
      parameters: {
        ...parameters,
        context,
        constraints,
        originalRule: rule
      }
    };
  }

  private calculateConfidence(rule: string): number {
    let confidence = 0.4; // Base confidence (reduced from 0.5)

    // Rule clarity indicators
    const clarityIndicators = [
      /specific|exact|precisely|clearly|explicitly/i,
      /always|never|must|should|shall/i,
      /\d+/,  // Contains numbers
      /grammar|spelling|punctuation|style|tone|voice|meaning/i
    ];

    for (const indicator of clarityIndicators) {
      if (indicator.test(rule)) {
        confidence += 0.1;
      }
    }

    // Quantifiable rules get higher confidence
    if (this.hasQuantifiers(rule)) {
      confidence += 0.2;
    }

    // Technical specificity
    const technicalTerms = [
      'subject-verb agreement', 'passive voice', 'sentence structure',
      'paragraph transitions', 'logical flow', 'argumentation',
      'semantic analysis', 'syntactic correctness'
    ];

    for (const term of technicalTerms) {
      if (rule.toLowerCase().includes(term)) {
        confidence += 0.15;
        break; // Only add once for technical specificity
      }
    }

    // Rule structure quality
    if (rule.length > 20 && rule.length < 200) { // Reasonable length
      confidence += 0.05;
    }

    return Math.min(confidence, 1.0);
  }

  private extractIntent(rule: string, ruleType: string): string {
    const lowerRule = rule.toLowerCase();
    
    // Action-based intent extraction
    const actionPatterns = [
      { pattern: /fix|correct|repair/, intent: 'correction' },
      { pattern: /improve|enhance|refine|polish/, intent: 'enhancement' },
      { pattern: /preserve|maintain|keep|retain/, intent: 'preservation' },
      { pattern: /check|validate|verify|ensure/, intent: 'validation' },
      { pattern: /rewrite|restructure|reorganize/, intent: 'restructuring' },
      { pattern: /summarize|condense|shorten/, intent: 'summarization' },
      { pattern: /expand|elaborate|develop/, intent: 'expansion' },
      { pattern: /standardize|normalize|format/, intent: 'standardization' }
    ];

    for (const { pattern, intent } of actionPatterns) {
      if (pattern.test(lowerRule)) {
        return intent;
      }
    }

    // Domain-specific intent extraction
    if (lowerRule.includes('grammar') || lowerRule.includes('spelling')) {
      return 'grammatical-correction';
    }
    
    if (lowerRule.includes('style') || lowerRule.includes('flow')) {
      return 'stylistic-improvement';
    }
    
    if (lowerRule.includes('structure') || lowerRule.includes('organization')) {
      return 'structural-editing';
    }

    if (lowerRule.includes('voice') || lowerRule.includes('tone')) {
      return 'voice-preservation';
    }

    // Fallback based on rule type
    const typeBasedIntents: Record<string, string> = {
      'permission': 'allow-operation',
      'prohibition': 'prevent-operation',
      'boundary': 'limit-operation',
      'focus': 'prioritize-operation'
    };

    return typeBasedIntents[ruleType] || rule.trim();
  }

  private extractParameters(rule: string): Record<string, any> {
    const parameters: Record<string, any> = {};
    
    // Extract percentages with context
    const percentageMatches = rule.match(/(\d+)\s*%/g);
    if (percentageMatches) {
      parameters.percentages = percentageMatches.map(m => parseInt(m));
      parameters.primaryPercentage = parameters.percentages[0];
    }

    // Extract word/character/sentence counts
    const countMatches = rule.matchAll(/(\d+)\s*(words?|characters?|sentences?)/gi);
    for (const match of countMatches) {
      const count = parseInt(match[1]);
      const unit = match[2].toLowerCase();
      parameters[`${unit}Count`] = count;
    }

    // Extract comparison operators
    const comparisonPatterns = [
      { pattern: /no more than|less than|under|below/, operator: 'lte' },
      { pattern: /more than|greater than|above|over/, operator: 'gte' },
      { pattern: /exactly|precisely/, operator: 'eq' },
      { pattern: /approximately|around|about/, operator: 'approx' }
    ];

    for (const { pattern, operator } of comparisonPatterns) {
      if (pattern.test(rule.toLowerCase())) {
        parameters.comparisonOperator = operator;
        break;
      }
    }

    // Extract scope indicators
    const scopePatterns = [
      { pattern: /entire|whole|complete|full/, scope: 'document' },
      { pattern: /paragraph|section/, scope: 'paragraph' },
      { pattern: /sentence/, scope: 'sentence' },
      { pattern: /word|phrase/, scope: 'word' }
    ];

    for (const { pattern, scope } of scopePatterns) {
      if (pattern.test(rule.toLowerCase())) {
        parameters.scope = scope;
        break;
      }
    }

    // Extract priority/urgency indicators
    const priorityPatterns = [
      { pattern: /critical|essential|vital|must/, priority: 'high' },
      { pattern: /important|should|recommended/, priority: 'medium' },
      { pattern: /optional|consider|might/, priority: 'low' }
    ];

    for (const { pattern, priority } of priorityPatterns) {
      if (pattern.test(rule.toLowerCase())) {
        parameters.priority = priority;
        break;
      }
    }

    return parameters;
  }

  private extractContext(rule: string): Record<string, any> {
    const context: Record<string, any> = {};
    const lowerRule = rule.toLowerCase();

    // Document type context
    const documentTypes = [
      'academic', 'business', 'creative', 'technical', 'legal', 
      'marketing', 'journalistic', 'scientific'
    ];

    for (const type of documentTypes) {
      if (lowerRule.includes(type)) {
        context.documentType = type;
        break;
      }
    }

    // Audience context
    const audienceTypes = [
      'professional', 'academic', 'general', 'technical', 'casual', 
      'formal', 'informal', 'expert', 'beginner'
    ];

    for (const audience of audienceTypes) {
      if (lowerRule.includes(audience)) {
        context.audience = audience;
        break;
      }
    }

    // Style context
    const styleTypes = [
      'formal', 'informal', 'conversational', 'authoritative', 
      'persuasive', 'descriptive', 'narrative', 'expository'
    ];

    for (const style of styleTypes) {
      if (lowerRule.includes(style)) {
        context.style = style;
        break;
      }
    }

    // Language features to preserve/modify
    const languageFeatures = [
      'terminology', 'jargon', 'idioms', 'metaphors', 'analogies',
      'voice', 'tone', 'perspective', 'tense', 'person'
    ];

    context.languageFeatures = [];
    for (const feature of languageFeatures) {
      if (lowerRule.includes(feature)) {
        context.languageFeatures.push(feature);
      }
    }

    return context;
  }

  private extractConstraintHints(rule: string): string[] {
    const hints: string[] = [];
    const lowerRule = rule.toLowerCase();

    // Constraint type hints
    const constraintPatterns = [
      { pattern: /grammar|spelling|punctuation/, hint: 'grammatical' },
      { pattern: /style|flow|readability/, hint: 'stylistic' },
      { pattern: /length|word count|character count/, hint: 'length-based' },
      { pattern: /tone|voice|perspective/, hint: 'tonal' },
      { pattern: /structure|organization|format/, hint: 'structural' },
      { pattern: /content|meaning|intent/, hint: 'semantic' },
      { pattern: /consistency|uniformity/, hint: 'consistency' },
      { pattern: /clarity|comprehension/, hint: 'clarity' }
    ];

    for (const { pattern, hint } of constraintPatterns) {
      if (pattern.test(lowerRule)) {
        hints.push(hint);
      }
    }

    // Processing approach hints
    if (lowerRule.includes('minimal') || lowerRule.includes('conservative')) {
      hints.push('conservative-editing');
    }

    if (lowerRule.includes('aggressive') || lowerRule.includes('extensive')) {
      hints.push('extensive-editing');
    }

    if (lowerRule.includes('preserve') || lowerRule.includes('maintain')) {
      hints.push('preservation-focused');
    }

    return hints;
  }

  private hasQuantifiers(rule: string): boolean {
    return this.QUANTIFIER_PATTERNS.some(pattern => pattern.test(rule));
  }

  // Advanced parsing methods for specific domains

  parseGrammarRule(rule: string): Record<string, any> {
    const grammarAspects = {
      'subject-verb agreement': /subject.?verb|agreement/i,
      'tense consistency': /tense|past|present|future/i,
      'pronoun reference': /pronoun|reference|antecedent/i,
      'modifier placement': /modifier|dangling|misplaced/i,
      'parallel structure': /parallel|series|list/i
    };

    const detected: Record<string, boolean> = {};
    for (const [aspect, pattern] of Object.entries(grammarAspects)) {
      detected[aspect] = pattern.test(rule);
    }

    return detected;
  }

  parseStyleRule(rule: string): Record<string, any> {
    const styleAspects = {
      'sentence variety': /sentence.*variety|varied.*sentence/i,
      'word choice': /word.*choice|vocabulary|diction/i,
      'transitions': /transition|flow|connection/i,
      'conciseness': /concise|wordiness|brevity/i,
      'active voice': /active.*voice|passive.*voice/i,
      'clarity': /clear|clarity|comprehension/i
    };

    const detected: Record<string, boolean> = {};
    for (const [aspect, pattern] of Object.entries(styleAspects)) {
      detected[aspect] = pattern.test(rule);
    }

    return detected;
  }

  parseStructuralRule(rule: string): Record<string, any> {
    const structuralAspects = {
      'paragraph structure': /paragraph.*structure|topic.*sentence/i,
      'logical flow': /logical.*flow|sequence|order/i,
      'argumentation': /argument|evidence|support|reasoning/i,
      'introduction': /introduction|opening|hook/i,
      'conclusion': /conclusion|ending|summary/i,
      'headings': /heading|title|section/i
    };

    const detected: Record<string, boolean> = {};
    for (const [aspect, pattern] of Object.entries(structuralAspects)) {
      detected[aspect] = pattern.test(rule);
    }

    return detected;
  }
}