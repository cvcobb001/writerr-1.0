import { diff_match_patch, DIFF_DELETE, DIFF_INSERT, DIFF_EQUAL } from 'diff-match-patch';
import { ModeRegistry } from './mode-registry';
import { AdapterManager } from './adapter-manager';
import { PerformanceMonitor } from './performance-monitor';
import { WritterrEventBus } from './event-bus';
import { RulesetCompiler } from './ruleset-compiler';
import { EditorialEngineSettings } from './settings';
import {
  IntakePayload,
  JobResult,
  Change,
  ProcessingIntent,
  ExecutionJob,
  ChangeConflict,
  ProvenanceChain,
  ExecutionSummary
} from './types';

/**
 * SimpleDiffProcessor - A streamlined replacement for ConstraintProcessor
 * 
 * This processor:
 * 1. KEEPS: Ruleset compiler functionality (mode file → constraints)
 * 2. REMOVES: Complex constraint validation and empty change creation
 * 3. ADDS: Direct AI → diff → real change objects pipeline
 * 4. PRESERVES: All existing interfaces and integrations
 */
export class SimpleDiffProcessor {
  private modeRegistry: ModeRegistry;
  private adapterManager: AdapterManager;
  private performanceMonitor: PerformanceMonitor;
  private eventBus: WritterrEventBus;
  private settings: EditorialEngineSettings;
  private compiler: RulesetCompiler;
  private dmp: diff_match_patch;

  constructor(
    modeRegistry: ModeRegistry,
    adapterManager: AdapterManager,
    performanceMonitor: PerformanceMonitor,
    eventBus: WritterrEventBus,
    settings: EditorialEngineSettings
  ) {
    this.modeRegistry = modeRegistry;
    this.adapterManager = adapterManager;
    this.performanceMonitor = performanceMonitor;
    this.eventBus = eventBus;
    this.settings = settings;
    this.compiler = new RulesetCompiler();
    this.dmp = new diff_match_patch();
  }

  async process(intake: IntakePayload): Promise<JobResult> {
    const startTime = performance.now();
    
    try {
      // 1. Get mode and compile constraints (PRESERVE this functionality)
      const mode = this.modeRegistry.getMode(intake.mode);
      if (!mode) {
        throw new Error(`Unknown mode: ${intake.mode}`);
      }

      // 2. Use ruleset compiler to convert mode to constraints (KEEP the "waiter")
      const intent: ProcessingIntent = {
        type: 'text-edit',
        target: 'document',
        scope: 'full',
        urgency: 'normal'
      };
      
      const ruleset = await this.compiler.compile(intent, mode);
      console.log(`Compiled ${ruleset.constraints.length} constraints from mode: ${mode.name}`);

      // 3. Create AI request with compiled constraints (NEW: Direct AI integration)
      const correctedText = await this.requestAICorrections(intake, ruleset);
      
      // 4. Generate diff between original and corrected text (NEW: Real diff processing)
      const changes = await this.generateDiffChanges(intake.sourceText, correctedText, intake.id);
      
      // 5. Process through adapters (PRESERVE existing adapter system)
      const adapterResults = await this.executeViaAdapters(changes, intake);
      
      // 6. Return real result with actual changes (REPLACE empty change creation)
      const processingTime = performance.now() - startTime;
      
      return {
        id: `job-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        intakeId: intake.id,
        success: true,
        processingTime,
        changes,
        conflicts: [], // No conflicts with simple diff approach
        provenance: this.createProvenanceChain(intake, mode, ruleset),
        summary: {
          processed: true,
          changesApplied: changes.length,
          mode: mode.name,
          processingTime,
          warnings: [],
          errors: []
        },
        metadata: {
          processor: 'simple-diff',
          version: '1.0.0',
          originalLength: intake.sourceText.length,
          correctedLength: correctedText.length,
          diffOperations: changes.length
        }
      };

    } catch (error) {
      console.error('Simple diff processing error:', error);
      return this.createErrorResult(intake, error, startTime);
    }
  }

  /**
   * Request AI corrections using compiled constraints
   * This replaces the complex constraint processing with direct AI integration
   */
  private async requestAICorrections(intake: IntakePayload, ruleset: any): Promise<string> {
    // For now, simulate AI corrections by returning slightly modified text
    // In a real implementation, this would:
    // 1. Format the compiled constraints into a prompt
    // 2. Send original text + constraints to AI
    // 3. Return the AI-corrected text
    
    // TEMPORARY: Return modified text for testing (replace with real AI integration)
    const originalText = intake.sourceText;
    
    // Simple test modification based on mode
    if (intake.mode === 'proofreader') {
      // Fix obvious grammar issues for testing
      return originalText
        .replace(/\bi\b/g, 'I')
        .replace(/\bthe the\b/g, 'the')
        .replace(/\.\s*\./g, '.')
        .replace(/\s+/g, ' ')
        .trim();
    }
    
    // Return original text if no corrections needed (will result in no changes)
    return originalText;
  }

  /**
   * Generate real change objects from text diff
   * This replaces the empty change creation with actual diff-based changes
   */
  private async generateDiffChanges(originalText: string, correctedText: string, intakeId: string): Promise<Change[]> {
    const changes: Change[] = [];
    
    // Skip processing if texts are identical
    if (originalText === correctedText) {
      console.log('No changes detected - original and corrected text are identical');
      return changes;
    }
    
    // Generate diff using diff-match-patch
    const diffs = this.dmp.diff_main(originalText, correctedText);
    this.dmp.diff_cleanupSemantic(diffs);
    
    let currentPosition = 0;
    
    for (let i = 0; i < diffs.length; i++) {
      const [operation, text] = diffs[i];
      
      switch (operation) {
        case DIFF_EQUAL:
          // No change, just advance position
          currentPosition += text.length;
          break;
          
        case DIFF_DELETE:
          // Text was removed
          const nextDiff = i + 1 < diffs.length ? diffs[i + 1] : null;
          const isReplacement = nextDiff && nextDiff[0] === DIFF_INSERT;
          
          if (isReplacement) {
            // This is a replacement (delete + insert)
            const newText = nextDiff[1];
            changes.push({
              id: `change-${Date.now()}-${changes.length}`,
              type: 'replace',
              range: { 
                start: currentPosition, 
                end: currentPosition + text.length 
              },
              originalText: text,
              newText: newText,
              confidence: 0.95,
              reasoning: `Text replacement detected`,
              source: 'simple-diff-processor',
              timestamp: Date.now()
            });
            
            currentPosition += text.length; // Advance past deleted text
            i++; // Skip the insert operation as we've handled it
          } else {
            // Pure deletion
            changes.push({
              id: `change-${Date.now()}-${changes.length}`,
              type: 'delete',
              range: { 
                start: currentPosition, 
                end: currentPosition + text.length 
              },
              originalText: text,
              newText: '',
              confidence: 0.95,
              reasoning: `Text deletion detected`,
              source: 'simple-diff-processor',
              timestamp: Date.now()
            });
            
            currentPosition += text.length;
          }
          break;
          
        case DIFF_INSERT:
          // Text was added (only if not part of a replacement)
          const prevDiff = i > 0 ? diffs[i - 1] : null;
          const wasReplacement = prevDiff && prevDiff[0] === DIFF_DELETE;
          
          if (!wasReplacement) {
            changes.push({
              id: `change-${Date.now()}-${changes.length}`,
              type: 'insert',
              range: { 
                start: currentPosition, 
                end: currentPosition 
              },
              originalText: '',
              newText: text,
              confidence: 0.95,
              reasoning: `Text insertion detected`,
              source: 'simple-diff-processor',
              timestamp: Date.now()
            });
            
            // Don't advance position for inserts - they happen "at" the current position
          }
          break;
      }
    }
    
    console.log(`Generated ${changes.length} real changes from diff`);
    return changes;
  }

  /**
   * Execute changes via adapter system (PRESERVE existing functionality)
   */
  private async executeViaAdapters(changes: Change[], intake: IntakePayload): Promise<any> {
    const job: ExecutionJob = {
      id: `job-${intake.id}`,
      type: 'text-edit',
      payload: {
        text: intake.sourceText,
        mode: intake.mode,
        changes: changes,
        originalText: intake.sourceText
      },
      priority: 1,
      metadata: {
        intakeId: intake.id,
        startTime: Date.now()
      }
    };

    // Get available adapters
    const availableAdapters = this.adapterManager.getAllAdapters();
    console.log(`Executing via ${availableAdapters.length} adapters`);

    // Execute via first available adapter (typically Track Edits)
    if (availableAdapters.length > 0) {
      const adapter = availableAdapters[0];
      return await adapter.execute(job);
    }

    return { success: true, changes };
  }

  /**
   * Create provenance chain (PRESERVE existing functionality)
   */
  private createProvenanceChain(intake: IntakePayload, mode: any, ruleset: any): ProvenanceChain {
    return {
      origin: {
        source: 'user-input',
        timestamp: intake.timestamp,
        sessionId: intake.sessionId
      },
      steps: [
        {
          processor: 'ruleset-compiler',
          operation: 'mode-compilation',
          timestamp: Date.now(),
          parameters: { mode: mode.name }
        },
        {
          processor: 'simple-diff-processor', 
          operation: 'diff-generation',
          timestamp: Date.now(),
          parameters: { diffOperations: true }
        }
      ]
    };
  }

  /**
   * Create error result (PRESERVE existing functionality) 
   */
  private createErrorResult(intake: IntakePayload, error: Error, startTime: number): JobResult {
    const processingTime = performance.now() - startTime;
    
    return {
      id: `error-job-${Date.now()}`,
      intakeId: intake.id,
      success: false,
      processingTime,
      changes: [],
      conflicts: [],
      provenance: {
        origin: {
          source: 'user-input',
          timestamp: intake.timestamp,
          sessionId: intake.sessionId
        },
        steps: []
      },
      summary: {
        processed: false,
        changesApplied: 0,
        mode: intake.mode,
        processingTime,
        warnings: [],
        errors: [error.message]
      },
      metadata: {
        processor: 'simple-diff-processor',
        error: error.message,
        errorType: error.name
      }
    };
  }
}