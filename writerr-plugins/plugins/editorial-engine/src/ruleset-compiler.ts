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
  async parse(rule: string, ruleType: string): Promise<ParsedRule> {
    // Simple rule parsing - in a real implementation, this would use NLP libraries
    const confidence = this.calculateConfidence(rule);
    const intent = this.extractIntent(rule);
    const parameters = this.extractParameters(rule);

    return {
      type: ruleType,
      intent,
      confidence,
      parameters
    };
  }

  private calculateConfidence(rule: string): number {
    // Simple confidence calculation based on rule clarity and keywords
    let confidence = 0.5; // Base confidence

    // Increase confidence for specific, clear rules
    const specificKeywords = [
      'grammar', 'spelling', 'punctuation', 'voice', 'tone', 'style',
      'meaning', 'content', 'structure', 'flow', 'clarity'
    ];

    for (const keyword of specificKeywords) {
      if (rule.toLowerCase().includes(keyword)) {
        confidence += 0.1;
      }
    }

    // Increase confidence for quantifiable rules
    if (rule.match(/\d+%/) || rule.match(/\d+\s*(words?|characters?)/)) {
      confidence += 0.2;
    }

    // Cap at 1.0
    return Math.min(confidence, 1.0);
  }

  private extractIntent(rule: string): string {
    // Extract the main intent from the rule
    // This is a simplified implementation
    
    const rule_lower = rule.toLowerCase();
    
    if (rule_lower.includes('fix') || rule_lower.includes('correct')) {
      return 'correction';
    }
    
    if (rule_lower.includes('improve') || rule_lower.includes('enhance')) {
      return 'improvement';
    }
    
    if (rule_lower.includes('preserve') || rule_lower.includes('maintain')) {
      return 'preservation';
    }
    
    if (rule_lower.includes('never') || rule_lower.includes('don\'t') || rule_lower.includes('avoid')) {
      return 'prohibition';
    }
    
    // Default to the rule text itself
    return rule.trim();
  }

  private extractParameters(rule: string): Record<string, any> {
    const parameters: Record<string, any> = {};
    
    // Extract percentages
    const percentageMatch = rule.match(/(\d+)%/);
    if (percentageMatch) {
      parameters.percentage = parseInt(percentageMatch[1]);
    }
    
    // Extract word/character counts
    const countMatch = rule.match(/(\d+)\s*(words?|characters?)/i);
    if (countMatch) {
      parameters.count = parseInt(countMatch[1]);
      parameters.unit = countMatch[2].toLowerCase();
    }
    
    return parameters;
  }
}