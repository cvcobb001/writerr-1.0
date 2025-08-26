import { 
  IntakePayload, 
  JobResult, 
  ProcessingIntent, 
  ExecutionRuleset,
  Change,
  ProvenanceChain,
  ExecutionSummary,
  EditorialEngineSettings,
  CompiledConstraint,
  ConstraintType,
  ValidationRule
} from './types';
import { ModeRegistry } from './mode-registry';
import { AdapterManager } from './adapter-manager';
import { PerformanceMonitor } from './performance-monitor';
import { WritterrEventBus } from './event-bus';
import { RulesetCompiler } from './ruleset-compiler';

export class ConstraintProcessor {
  private compiler: RulesetCompiler;

  constructor(
    private modeRegistry: ModeRegistry,
    private adapterManager: AdapterManager,
    private performanceMonitor: PerformanceMonitor,
    private eventBus: WritterrEventBus,
    private settings: EditorialEngineSettings
  ) {
    this.compiler = new RulesetCompiler();
  }

  async process(intake: IntakePayload): Promise<JobResult> {
    const startTime = performance.now();
    
    try {
      // 1. Intake Normalization
      const normalized = await this.normalizeIntake(intake);
      
      // 2. Intent Recognition
      const intent = await this.recognizeIntent(normalized);
      
      // 3. Mode Validation
      const mode = this.modeRegistry.getMode(intake.mode);
      if (!mode) {
        throw new Error(`Unknown mode: ${intake.mode}`);
      }
      
      // 4. Constraint Compilation
      const ruleset = await this.compileConstraints(intent, mode);
      
      // 5. Enhanced Validation
      const validation = await this.validateConstraints(ruleset);
      if (!validation.valid) {
        throw new Error(`Constraint validation failed: ${validation.errors.join(', ')}`);
      }
      
      // Log validation warnings if any
      if (validation.warnings && validation.warnings.length > 0) {
        console.warn('Constraint validation warnings:', validation.warnings);
        this.eventBus.emit('constraint-validation-warnings', {
          intakeId: intake.id,
          warnings: validation.warnings
        });
      }
      
      // 6. Execution Planning
      const executionPlan = await this.createExecutionPlan(ruleset, intake);
      
      // 7. Adapter Routing
      const results = await this.executeViaAdapters(executionPlan);
      
      // 8. Result Assembly
      const finalResult = await this.assembleResults(results, intake, startTime);
      
      // Add validation warnings to result summary
      if (validation.warnings && validation.warnings.length > 0) {
        finalResult.summary.warnings.push(...validation.warnings);
      }
      
      // 9. Post-Processing Validation
      await this.validateResults(finalResult, ruleset);
      
      return finalResult;
    } catch (error) {
      console.error('Constraint processing error:', error);
      this.eventBus.emit('constraint-processing-error', {
        intakeId: intake.id,
        error: error.message,
        stage: 'processing'
      });
      
      // Return error result
      return this.createErrorResult(intake, error, startTime);
    }
  }

  private async normalizeIntake(intake: IntakePayload): Promise<IntakePayload> {
    // Enhanced normalization with validation
    const normalized = {
      ...intake,
      instructions: intake.instructions.trim(),
      sourceText: intake.sourceText.trim()
    };

    // Basic validation
    if (!normalized.instructions) {
      throw new Error('Instructions cannot be empty');
    }

    if (!normalized.sourceText) {
      throw new Error('Source text cannot be empty');
    }

    if (!normalized.mode) {
      normalized.mode = this.settings.defaultMode || 'proofreader';
    }

    return normalized;
  }

  private async recognizeIntent(intake: IntakePayload): Promise<ProcessingIntent> {
    // Enhanced intent recognition with better pattern matching
    const instructions = intake.instructions.toLowerCase();
    let type = 'general-edit';
    let confidence = 0.7;

    // Specific intent patterns
    const intentPatterns = [
      { pattern: /\b(grammar|spelling|punctuation)\b/g, intent: 'grammar-check', confidence: 0.9 },
      { pattern: /\b(style|flow|readability)\b/g, intent: 'style-enhancement', confidence: 0.85 },
      { pattern: /\b(summarize|summary|condense)\b/g, intent: 'summarization', confidence: 0.95 },
      { pattern: /\b(improve|enhance|polish)\b/g, intent: 'improvement', confidence: 0.8 },
      { pattern: /\b(rewrite|restructure)\b/g, intent: 'restructuring', confidence: 0.9 },
      { pattern: /\b(proofread|check|review)\b/g, intent: 'proofreading', confidence: 0.85 }
    ];

    for (const { pattern, intent, confidence: patternConfidence } of intentPatterns) {
      const matches = instructions.match(pattern);
      if (matches) {
        type = intent;
        confidence = Math.min(patternConfidence + (matches.length - 1) * 0.05, 1.0);
        break;
      }
    }

    return {
      type,
      confidence,
      parameters: {
        originalInstructions: intake.instructions,
        textLength: intake.sourceText.length,
        mode: intake.mode,
        detectedPatterns: instructions.match(/\b(grammar|spelling|style|improve|summarize)\b/g) || []
      }
    };
  }

  private async compileConstraints(intent: ProcessingIntent, mode: any): Promise<ExecutionRuleset> {
    try {
      return await this.compiler.compile(intent, mode);
    } catch (error) {
      console.error('Constraint compilation failed:', error);
      throw new Error(`Failed to compile constraints: ${error.message}`);
    }
  }

  private async validateConstraints(ruleset: ExecutionRuleset): Promise<{ valid: boolean; errors: string[]; warnings: string[] }> {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Basic structural validation
    if (!ruleset.constraints || ruleset.constraints.length === 0) {
      errors.push('No constraints defined in ruleset');
    }
    
    if (ruleset.executionParams.timeout <= 0) {
      errors.push('Invalid timeout value - must be positive');
    }
    
    if (ruleset.executionParams.timeout > 60000) { // 1 minute
      warnings.push('Timeout value is very high (>60s) - may affect user experience');
    }
    
    if (!ruleset.executionParams.preferredAdapters || ruleset.executionParams.preferredAdapters.length === 0) {
      warnings.push('No preferred adapters specified - execution may be unpredictable');
    }

    // Constraint-specific validation
    if (ruleset.constraints && ruleset.constraints.length > 0) {
      const constraintValidation = await this.validateIndividualConstraints(ruleset.constraints);
      errors.push(...constraintValidation.errors);
      warnings.push(...constraintValidation.warnings);

      // Cross-constraint validation
      const conflictValidation = this.validateConstraintConflicts(ruleset.constraints);
      errors.push(...conflictValidation.errors);
      warnings.push(...conflictValidation.warnings);
    }

    // Validation rules validation
    if (ruleset.validationRules && ruleset.validationRules.length > 0) {
      const ruleValidation = this.validateValidationRules(ruleset.validationRules);
      errors.push(...ruleValidation.errors);
      warnings.push(...ruleValidation.warnings);
    }

    // Performance validation
    if (this.settings.constraintValidation.strictMode) {
      const performanceValidation = this.validatePerformanceConstraints(ruleset);
      errors.push(...performanceValidation.errors);
      warnings.push(...performanceValidation.warnings);
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  private async validateIndividualConstraints(constraints: CompiledConstraint[]): Promise<{ errors: string[]; warnings: string[] }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const constraint of constraints) {
      // Validate constraint structure
      if (!constraint.type) {
        errors.push('Constraint missing type specification');
        continue;
      }

      if (constraint.priority < 0 || constraint.priority > 100) {
        warnings.push(`Constraint priority ${constraint.priority} outside recommended range (0-100)`);
      }

      // Type-specific validation
      switch (constraint.type) {
        case ConstraintType.LENGTH_LIMIT:
          if (constraint.parameters.maxChangeRatio && 
              (constraint.parameters.maxChangeRatio < 0 || constraint.parameters.maxChangeRatio > 1)) {
            errors.push('LENGTH_LIMIT maxChangeRatio must be between 0 and 1');
          }
          break;

        case ConstraintType.GRAMMAR_ONLY:
          if (!constraint.parameters.allowSpelling && !constraint.parameters.allowGrammar) {
            warnings.push('GRAMMAR_ONLY constraint allows neither spelling nor grammar fixes');
          }
          break;

        case ConstraintType.PRESERVE_TONE:
          if (constraint.parameters.preserveVoice === false && constraint.parameters.preserveStyle === false) {
            warnings.push('PRESERVE_TONE constraint preserves neither voice nor style');
          }
          break;

        case ConstraintType.NO_CONTENT_CHANGE:
          if (constraint.parameters.preserveMeaning === false) {
            errors.push('NO_CONTENT_CHANGE constraint must preserve meaning');
          }
          break;
      }

      // Validate validation rules within constraints
      if (constraint.validation && constraint.validation.length > 0) {
        for (const validationRule of constraint.validation) {
          if (!validationRule.type || !validationRule.condition) {
            errors.push('Constraint validation rule missing type or condition');
          }
        }
      }
    }

    return { errors, warnings };
  }

  private validateConstraintConflicts(constraints: CompiledConstraint[]): { errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    const constraintTypes = constraints.map(c => c.type);
    
    // Grammar-only vs extensive editing conflicts
    if (constraintTypes.includes(ConstraintType.GRAMMAR_ONLY) && 
        constraintTypes.includes(ConstraintType.STYLE_CONSISTENCY)) {
      warnings.push('Potential conflict: Grammar-only and style consistency constraints may interfere');
    }

    // Content preservation vs improvement conflicts
    if (constraintTypes.includes(ConstraintType.NO_CONTENT_CHANGE)) {
      const improvementConstraints = constraints.filter(c => 
        c.parameters.allowedOperations?.includes('improvement') ||
        c.parameters.allowedOperations?.includes('enhancement')
      );
      
      if (improvementConstraints.length > 0) {
        warnings.push('Potential conflict: Content preservation vs improvement constraints');
      }
    }

    // Multiple length limits
    const lengthConstraints = constraints.filter(c => c.type === ConstraintType.LENGTH_LIMIT);
    if (lengthConstraints.length > 1) {
      const ratios = lengthConstraints.map(c => c.parameters.maxChangeRatio).filter(r => r);
      if (ratios.length > 0) {
        const minRatio = Math.min(...ratios);
        const maxRatio = Math.max(...ratios);
        
        if (minRatio !== maxRatio) {
          warnings.push(`Conflicting length limits: ${minRatio * 100}% vs ${maxRatio * 100}%`);
        }
      }
    }

    // Priority conflicts
    const highPriorityConstraints = constraints.filter(c => c.priority >= 80);
    if (highPriorityConstraints.length > 3) {
      warnings.push(`Many high-priority constraints (${highPriorityConstraints.length}) may create conflicts`);
    }

    return { errors, warnings };
  }

  private validateValidationRules(validationRules: ValidationRule[]): { errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const rule of validationRules) {
      if (!rule.type || !rule.condition) {
        errors.push('Validation rule missing type or condition');
        continue;
      }

      // Check condition syntax
      if (rule.condition.includes('undefined') || rule.condition.includes('null')) {
        warnings.push(`Validation rule condition may have undefined references: ${rule.condition}`);
      }

      // Check for common validation rule patterns
      if (rule.type === 'change-ratio-check' && !rule.condition.includes('change-ratio')) {
        errors.push('change-ratio-check rule must reference change-ratio in condition');
      }

      if (rule.type === 'semantic-analysis' && 
          !rule.condition.includes('meaning-similarity') && !rule.condition.includes('semantic-distance')) {
        warnings.push('semantic-analysis rule should reference meaning-similarity or semantic-distance');
      }

      if (rule.type === 'tone-analysis' && !rule.condition.includes('tone-similarity')) {
        warnings.push('tone-analysis rule should reference tone-similarity');
      }
    }

    return { errors, warnings };
  }

  private validatePerformanceConstraints(ruleset: ExecutionRuleset): { errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    const totalConstraints = ruleset.constraints.length;
    const complexValidationRules = ruleset.validationRules.filter(r => 
      r.type.includes('semantic') || r.type.includes('tone')
    ).length;

    if (totalConstraints > 20) {
      warnings.push(`High constraint count (${totalConstraints}) may impact performance`);
    }

    if (complexValidationRules > 10) {
      warnings.push(`Many complex validation rules (${complexValidationRules}) may slow processing`);
    }

    // Check timeout vs complexity
    const expectedComplexity = totalConstraints + (complexValidationRules * 2);
    const recommendedTimeout = Math.max(5000, expectedComplexity * 200);

    if (ruleset.executionParams.timeout < recommendedTimeout) {
      warnings.push(
        `Timeout (${ruleset.executionParams.timeout}ms) may be too short for complexity level ` +
        `(recommended: ${recommendedTimeout}ms)`
      );
    }

    return { errors, warnings };
  }

  private async createExecutionPlan(ruleset: ExecutionRuleset, intake: IntakePayload): Promise<any> {
    return {
      id: `plan-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      ruleset,
      intake,
      steps: [
        {
          type: 'process-text',
          adapter: 'track-edits',
          payload: {
            text: intake.sourceText,
            instructions: intake.instructions,
            constraints: ruleset.constraints,
            mode: intake.mode
          },
          priority: 1
        }
      ],
      createdAt: Date.now()
    };
  }

  private async executeViaAdapters(executionPlan: any): Promise<any[]> {
    const results = [];
    
    for (const step of executionPlan.steps) {
      try {
        const result = await this.adapterManager.execute({
          id: `job-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          type: step.type as any,
          payload: step.payload,
          constraints: executionPlan.ruleset.constraints,
          context: executionPlan.intake.context,
          timeout: executionPlan.ruleset.executionParams.timeout
        });
        
        results.push({
          success: true,
          data: result,
          adapter: step.adapter,
          processingTime: result.processingTime || 0
        });
      } catch (error) {
        console.error(`Adapter execution failed for step ${step.type}:`, error);
        results.push({
          success: false,
          error: error.message,
          data: null,
          adapter: step.adapter,
          processingTime: 0
        });
      }
    }
    
    return results;
  }

  private async assembleResults(results: any[], intake: IntakePayload, startTime: number): Promise<JobResult> {
    const processingTime = performance.now() - startTime;
    const changes: Change[] = [];
    const hasSuccessfulResult = results.some(r => r.success);
    
    if (hasSuccessfulResult) {
      // Create change based on successful results
      for (const result of results.filter(r => r.success)) {
        if (result.data && result.data.changes) {
          changes.push(...result.data.changes);
        } else {
          // Create a placeholder change for demonstration
          changes.push({
            id: `change-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            type: 'replace',
            range: { start: 0, end: intake.sourceText.length },
            originalText: intake.sourceText,
            newText: intake.sourceText, // Would be modified by actual processing
            confidence: 0.85,
            reasoning: `Applied ${intake.mode} mode constraints via ${result.adapter}`,
            source: 'editorial-engine',
            timestamp: Date.now()
          });
        }
      }
    }
    
    const provenance: ProvenanceChain = {
      steps: results.map((result, index) => ({
        stage: `adapter-execution-${index}`,
        input: intake,
        output: result,
        processingTime: result.processingTime,
        adapter: result.adapter || 'unknown'
      })),
      totalTime: processingTime
    };
    
    const summary: ExecutionSummary = {
      totalChanges: changes.length,
      changeSummary: changes.reduce((acc, change) => {
        acc[change.type] = (acc[change.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      confidence: changes.length > 0 ? changes.reduce((sum, c) => sum + c.confidence, 0) / changes.length : 0,
      warnings: []
    };
    
    return {
      id: `result-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      intakeId: intake.id,
      success: hasSuccessfulResult,
      processingTime,
      changes,
      conflicts: [],
      provenance,
      summary,
      metadata: {
        mode: intake.mode,
        adapterResults: results.length,
        successfulAdapters: results.filter(r => r.success).length,
        failedAdapters: results.filter(r => !r.success).length
      }
    };
  }

  private async validateResults(result: JobResult, ruleset: ExecutionRuleset): Promise<void> {
    // Enhanced result validation
    if (this.settings.constraintValidation.strictMode) {
      // Check change limits
      if (result.changes.length > 100) {
        throw new Error('Too many changes - possible constraint violation (>100 changes)');
      }
      
      // Check processing time
      if (result.processingTime > this.settings.constraintValidation.maxProcessingTime) {
        console.warn(`Processing time exceeded limit: ${result.processingTime}ms`);
      }

      // Validate constraint adherence
      for (const constraint of ruleset.constraints) {
        if (constraint.type === ConstraintType.LENGTH_LIMIT) {
          const changeRatio = this.calculateChangeRatio(result.changes);
          if (changeRatio > constraint.parameters.maxChangeRatio) {
            throw new Error(
              `Change ratio ${(changeRatio * 100).toFixed(1)}% exceeds constraint limit ` +
              `${(constraint.parameters.maxChangeRatio * 100).toFixed(1)}%`
            );
          }
        }
      }
    }

    // Emit validation complete event
    this.eventBus.emit('result-validation-complete', {
      resultId: result.id,
      success: result.success,
      changeCount: result.changes.length,
      processingTime: result.processingTime
    });
  }

  private calculateChangeRatio(changes: Change[]): number {
    if (changes.length === 0) return 0;
    
    let totalOriginalLength = 0;
    let totalNewLength = 0;
    
    for (const change of changes) {
      totalOriginalLength += change.originalText.length;
      totalNewLength += change.newText.length;
    }
    
    if (totalOriginalLength === 0) return 0;
    
    return Math.abs(totalNewLength - totalOriginalLength) / totalOriginalLength;
  }

  private createErrorResult(intake: IntakePayload, error: Error, startTime: number): JobResult {
    return {
      id: `error-result-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      intakeId: intake.id,
      success: false,
      processingTime: performance.now() - startTime,
      changes: [],
      conflicts: [],
      provenance: {
        steps: [{
          stage: 'error',
          input: intake,
          output: { error: error.message, stack: error.stack },
          processingTime: performance.now() - startTime,
          adapter: 'editorial-engine'
        }],
        totalTime: performance.now() - startTime
      },
      summary: {
        totalChanges: 0,
        changeSummary: {},
        confidence: 0,
        warnings: [error.message]
      },
      metadata: {
        error: error.message,
        mode: intake.mode,
        stage: 'constraint-processing'
      }
    };
  }
}