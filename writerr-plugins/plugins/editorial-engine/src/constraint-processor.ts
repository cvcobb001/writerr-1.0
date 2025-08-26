import { 
  IntakePayload, 
  JobResult, 
  ProcessingIntent, 
  ExecutionRuleset,
  Change,
  ProvenanceChain,
  ExecutionSummary,
  EditorialEngineSettings
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
      
      // 5. Validation
      const validation = await this.validateConstraints(ruleset);
      if (!validation.valid) {
        throw new Error(`Constraint validation failed: ${validation.errors.join(', ')}`);
      }
      
      // 6. Execution Planning
      const executionPlan = await this.createExecutionPlan(ruleset, intake);
      
      // 7. Adapter Routing
      const results = await this.executeViaAdapters(executionPlan);
      
      // 8. Result Assembly
      const finalResult = await this.assembleResults(results, intake, startTime);
      
      // 9. Post-Processing Validation
      await this.validateResults(finalResult, ruleset);
      
      return finalResult;
    } catch (error) {
      // Return error result
      return this.createErrorResult(intake, error, startTime);
    }
  }

  private async normalizeIntake(intake: IntakePayload): Promise<IntakePayload> {
    // Basic normalization - trim whitespace, validate structure
    return {
      ...intake,
      instructions: intake.instructions.trim(),
      sourceText: intake.sourceText.trim()
    };
  }

  private async recognizeIntent(intake: IntakePayload): Promise<ProcessingIntent> {
    // Simple intent recognition for now
    // TODO: Implement sophisticated NLP intent recognition
    
    const instructions = intake.instructions.toLowerCase();
    let type = 'general-edit';
    let confidence = 0.8;
    
    if (instructions.includes('grammar') || instructions.includes('spelling')) {
      type = 'grammar-check';
      confidence = 0.9;
    } else if (instructions.includes('style') || instructions.includes('improve')) {
      type = 'style-enhancement';
      confidence = 0.85;
    } else if (instructions.includes('summarize') || instructions.includes('summary')) {
      type = 'summarization';
      confidence = 0.95;
    }
    
    return {
      type,
      confidence,
      parameters: {
        originalInstructions: intake.instructions,
        textLength: intake.sourceText.length,
        mode: intake.mode
      }
    };
  }

  private async compileConstraints(intent: ProcessingIntent, mode: any): Promise<ExecutionRuleset> {
    return await this.compiler.compile(intent, mode);
  }

  private async validateConstraints(ruleset: ExecutionRuleset): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];
    
    // Basic validation
    if (!ruleset.constraints || ruleset.constraints.length === 0) {
      errors.push('No constraints defined');
    }
    
    if (ruleset.executionParams.timeout <= 0) {
      errors.push('Invalid timeout value');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  private async createExecutionPlan(ruleset: ExecutionRuleset, intake: IntakePayload): Promise<any> {
    return {
      id: `plan-${Date.now()}`,
      ruleset,
      intake,
      steps: [
        {
          type: 'process-text',
          adapter: 'track-edits',
          payload: {
            text: intake.sourceText,
            instructions: intake.instructions,
            constraints: ruleset.constraints
          }
        }
      ]
    };
  }

  private async executeViaAdapters(executionPlan: any): Promise<any[]> {
    const results = [];
    
    for (const step of executionPlan.steps) {
      try {
        const result = await this.adapterManager.execute({
          id: `job-${Date.now()}`,
          type: step.type as any,
          payload: step.payload,
          constraints: executionPlan.ruleset.constraints,
          context: executionPlan.intake.context,
          timeout: executionPlan.ruleset.executionParams.timeout
        });
        
        results.push(result);
      } catch (error) {
        console.error('Adapter execution failed:', error);
        results.push({
          success: false,
          error: error.message,
          data: null
        });
      }
    }
    
    return results;
  }

  private async assembleResults(results: any[], intake: IntakePayload, startTime: number): Promise<JobResult> {
    const processingTime = performance.now() - startTime;
    
    // For now, create a simple successful result
    // TODO: Implement sophisticated result assembly from multiple adapters
    
    const changes: Change[] = [];
    const hasSuccessfulResult = results.some(r => r.success);
    
    if (hasSuccessfulResult) {
      // Create a mock change for demonstration
      changes.push({
        id: `change-${Date.now()}`,
        type: 'replace',
        range: { start: 0, end: intake.sourceText.length },
        originalText: intake.sourceText,
        newText: intake.sourceText, // Placeholder - actual processing would modify this
        confidence: 0.85,
        reasoning: `Applied ${intake.mode} mode constraints`,
        source: 'editorial-engine',
        timestamp: Date.now()
      });
    }
    
    const provenance: ProvenanceChain = {
      steps: [
        {
          stage: 'constraint-processing',
          input: intake,
          output: results,
          processingTime,
          adapter: 'editorial-engine'
        }
      ],
      totalTime: processingTime
    };
    
    const summary: ExecutionSummary = {
      totalChanges: changes.length,
      changeSummary: { 'replace': changes.length },
      confidence: 0.85,
      warnings: []
    };
    
    return {
      id: `result-${Date.now()}`,
      intakeId: intake.id,
      success: hasSuccessfulResult,
      processingTime,
      changes,
      conflicts: [],
      provenance,
      summary,
      metadata: {
        mode: intake.mode,
        adapterResults: results.length
      }
    };
  }

  private async validateResults(result: JobResult, ruleset: ExecutionRuleset): Promise<void> {
    // Basic result validation
    if (this.settings.constraintValidation.strictMode) {
      // Perform strict validation
      if (result.changes.length > 100) {
        throw new Error('Too many changes - possible constraint violation');
      }
      
      // Check processing time
      if (result.processingTime > this.settings.constraintValidation.maxProcessingTime) {
        console.warn(`Processing time exceeded limit: ${result.processingTime}ms`);
      }
    }
  }

  private createErrorResult(intake: IntakePayload, error: Error, startTime: number): JobResult {
    return {
      id: `error-result-${Date.now()}`,
      intakeId: intake.id,
      success: false,
      processingTime: performance.now() - startTime,
      changes: [],
      conflicts: [],
      provenance: {
        steps: [{
          stage: 'error',
          input: intake,
          output: { error: error.message },
          processingTime: performance.now() - startTime
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
        mode: intake.mode
      }
    };
  }
}