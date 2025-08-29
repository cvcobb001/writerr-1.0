// AI Integration Monitor for Track Edits
// Monitors AI change attribution, visual state correlation, and integration pipeline health
// Detects when AI edits don't appear in Track Edits despite being applied to document

import { TestLogger, TestLogEntry } from './test-logger';
import { VisualStateMonitor, VisualState } from './visual-state-monitor';

export interface AIIntegrationState {
  activeAIProcessing: boolean;
  lastAIEditTime: number;
  pendingAIEdits: PendingAIEdit[];
  attributionFailures: AttributionFailure[];
  visualCorrelationIssues: VisualCorrelationIssue[];
  integrationPipelineHealth: PipelineHealthStatus;
}

export interface PendingAIEdit {
  id: string;
  sourceJobId: string;
  content: string;
  timestamp: number;
  expectedInTrackEdits: boolean;
  foundInTrackEdits: boolean;
  documentApplied: boolean;
  attributionPresent: boolean;
  timeoutExpired: boolean;
}

export interface AttributionFailure {
  id: string;
  type: 'MISSING_METADATA' | 'INCORRECT_AUTHOR' | 'LOST_PROVENANCE' | 'NO_EDITORIAL_ENGINE_LINK';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  timestamp: number;
  context: {
    editId?: string;
    expectedAuthor: string;
    actualAuthor?: string;
    expectedMetadata?: any;
    actualMetadata?: any;
    missingFields: string[];
  };
}

export interface VisualCorrelationIssue {
  id: string;
  type: 'EDIT_NOT_HIGHLIGHTED' | 'DUPLICATE_HIGHLIGHTS' | 'SIDEBAR_NOT_UPDATED' | 'VISUAL_DESYNC';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  timestamp: number;
  documentChange: any;
  visualState: VisualState;
  expectedVisualState: Partial<VisualState>;
}

export interface PipelineHealthStatus {
  aiToDocumentPipeline: boolean;
  documentToTrackEditsPipeline: boolean;
  trackEditsToVisualPipeline: boolean;
  editorialEngineIntegration: boolean;
  lastHealthCheck: number;
  issues: string[];
}

export interface AIWorkflowValidation {
  workflowId: string;
  startTime: number;
  aiProcessingDetected: boolean;
  documentChangeDetected: boolean;
  trackEditsReceived: boolean;
  visualUpdateDetected: boolean;
  attributionCorrect: boolean;
  workflowComplete: boolean;
  duration: number;
  issues: string[];
  timestamp: number;
}

export class AIIntegrationMonitor {
  private testLogger: TestLogger;
  private visualMonitor: VisualStateMonitor;
  private isMonitoring = false;
  private currentState: AIIntegrationState;
  private monitoringInterval: NodeJS.Timer | null = null;
  private workflowValidations: AIWorkflowValidation[] = [];
  private documentObserver: MutationObserver | null = null;
  private pendingValidations = new Map<string, Partial<AIWorkflowValidation>>();
  
  constructor(testLogger: TestLogger, visualMonitor: VisualStateMonitor) {
    this.testLogger = testLogger;
    this.visualMonitor = visualMonitor;
    this.currentState = {
      activeAIProcessing: false,
      lastAIEditTime: 0,
      pendingAIEdits: [],
      attributionFailures: [],
      visualCorrelationIssues: [],
      integrationPipelineHealth: {
        aiToDocumentPipeline: true,
        documentToTrackEditsPipeline: true,
        trackEditsToVisualPipeline: true,
        editorialEngineIntegration: true,
        lastHealthCheck: Date.now(),
        issues: []
      }
    };
  }

  startMonitoring(): void {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;
    this.testLogger.log({
      level: 'INFO',
      category: 'EVENT',
      component: 'AI_INTEGRATION_MONITOR',
      action: 'START_MONITORING',
      data: { timestamp: Date.now() }
    });

    // Set up periodic monitoring
    this.monitoringInterval = setInterval(() => {
      this.performPeriodicCheck();
    }, 2000); // Check every 2 seconds

    // Set up AI processing detection
    this.setupAIProcessingMonitoring();
    
    // Set up document change monitoring
    this.setupDocumentChangeMonitoring();
    
    // Set up Track Edits integration monitoring
    this.setupTrackEditsIntegrationMonitoring();
    
    // Set up visual correlation monitoring
    this.setupVisualCorrelationMonitoring();
    
    // Set up attribution monitoring
    this.setupAttributionMonitoring();
  }

  stopMonitoring(): void {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    if (this.documentObserver) {
      this.documentObserver.disconnect();
      this.documentObserver = null;
    }

    this.testLogger.log({
      level: 'INFO',
      category: 'EVENT',
      component: 'AI_INTEGRATION_MONITOR',
      action: 'STOP_MONITORING',
      data: { 
        timestamp: Date.now(),
        totalAttributionFailures: this.currentState.attributionFailures.length,
        totalCorrelationIssues: this.currentState.visualCorrelationIssues.length,
        workflowValidations: this.workflowValidations.length
      }
    });
  }

  private setupAIProcessingMonitoring(): void {
    // Monitor AI processing indicators in UI
    const checkAIProcessing = () => {
      const processingIndicators = document.querySelectorAll(
        '.ai-processing, .thinking, .analyzing, .generating, [data-ai-active="true"]'
      );
      
      const isProcessing = processingIndicators.length > 0;
      
      if (isProcessing !== this.currentState.activeAIProcessing) {
        this.currentState.activeAIProcessing = isProcessing;
        
        if (isProcessing) {
          // Start a new workflow validation
          const workflowId = `ai_workflow_${Date.now()}`;
          this.pendingValidations.set(workflowId, {
            workflowId,
            startTime: Date.now(),
            aiProcessingDetected: true,
            documentChangeDetected: false,
            trackEditsReceived: false,
            visualUpdateDetected: false,
            attributionCorrect: false,
            workflowComplete: false,
            issues: []
          });
        }

        this.testLogger.log({
          level: 'INFO',
          category: 'STATE',
          component: 'AI_INTEGRATION_MONITOR',
          action: 'AI_PROCESSING_STATE_CHANGE',
          data: {
            wasProcessing: !isProcessing,
            isProcessing,
            timestamp: Date.now()
          }
        });
      }
    };

    // Check immediately and set up periodic checking
    checkAIProcessing();
    setInterval(checkAIProcessing, 1000);

    // Monitor console for AI processing logs
    this.interceptAIProcessingLogs();
  }

  private setupDocumentChangeMonitoring(): void {
    // Monitor document content changes that might be from AI
    const editor = (window as any).app?.workspace?.activeLeaf?.view?.editor;
    if (editor) {
      // Hook into editor change events
      editor.on?.('change', (changeObj: any) => {
        this.handleDocumentChange(changeObj);
      });
    }

    // Also set up DOM mutation observer for document content area
    this.documentObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'characterData' || mutation.type === 'childList') {
          this.handleDOMDocumentChange(mutation);
        }
      }
    });

    const documentArea = document.querySelector('.markdown-source-view, .cm-editor, .CodeMirror');
    if (documentArea) {
      this.documentObserver.observe(documentArea, {
        childList: true,
        subtree: true,
        characterData: true
      });
    }
  }

  private setupTrackEditsIntegrationMonitoring(): void {
    // Monitor Track Edits API for AI-sourced changes
    const trackEdits = (window as any).WriterrlAPI?.trackEdits;
    if (trackEdits) {
      // Hook into addEdit method
      if (trackEdits.addEdit) {
        const originalAddEdit = trackEdits.addEdit.bind(trackEdits);
        trackEdits.addEdit = (edit: any) => {
          this.handleTrackEditsChange(edit);
          return originalAddEdit(edit);
        };
      }

      // Hook into batch processing method if available
      if (trackEdits.addMultipleEdits) {
        const originalAddMultiple = trackEdits.addMultipleEdits.bind(trackEdits);
        trackEdits.addMultipleEdits = (edits: any[]) => {
          this.handleTrackEditsBatchChanges(edits);
          return originalAddMultiple(edits);
        };
      }
    }
  }

  private setupVisualCorrelationMonitoring(): void {
    // Use the existing visual monitor to detect visual state changes
    // and correlate them with AI processing events
    if (this.visualMonitor) {
      // We'll check visual states during our periodic checks
      // to correlate with document changes and Track Edits updates
    }
  }

  private setupAttributionMonitoring(): void {
    // Monitor for proper attribution of AI changes
    // This includes checking metadata, author fields, and provenance
    this.monitorEditorialEngineMetadata();
    this.monitorTrackEditsAttribution();
  }

  private interceptAIProcessingLogs(): void {
    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;

    const analyzeLogMessage = (level: string, args: any[]) => {
      const message = args.join(' ').toLowerCase();
      
      // Look for AI processing indicators
      if (message.includes('ai processing') || 
          message.includes('generating response') ||
          message.includes('editorial engine processing') ||
          message.includes('constraint application')) {
        
        this.currentState.lastAIEditTime = Date.now();
        
        // Extract job ID if present
        const jobIdMatch = args.join(' ').match(/job[_\s]id[:\s]*(\w+)/i);
        const jobId = jobIdMatch ? jobIdMatch[1] : `job_${Date.now()}`;
        
        // Create pending AI edit
        const pendingEdit: PendingAIEdit = {
          id: `ai_edit_${Date.now()}`,
          sourceJobId: jobId,
          content: args.join(' '),
          timestamp: Date.now(),
          expectedInTrackEdits: true,
          foundInTrackEdits: false,
          documentApplied: false,
          attributionPresent: false,
          timeoutExpired: false
        };
        
        this.currentState.pendingAIEdits.push(pendingEdit);
        
        this.testLogger.log({
          level: 'INFO',
          category: 'EVENT',
          component: 'AI_INTEGRATION_MONITOR',
          action: 'AI_PROCESSING_DETECTED',
          data: { jobId, pendingEditId: pendingEdit.id, timestamp: Date.now() }
        });
      }
    };

    console.log = (...args: any[]) => {
      analyzeLogMessage('LOG', args);
      originalLog.apply(console, args);
    };

    console.warn = (...args: any[]) => {
      analyzeLogMessage('WARN', args);
      originalWarn.apply(console, args);
    };

    console.error = (...args: any[]) => {
      analyzeLogMessage('ERROR', args);
      originalError.apply(console, args);
    };
  }

  private monitorEditorialEngineMetadata(): void {
    // Monitor Editorial Engine for proper metadata attachment
    const editorialEngine = (window as any).WriterrlAPI?.editorialEngine;
    if (editorialEngine && editorialEngine.processJob) {
      const originalProcessJob = editorialEngine.processJob.bind(editorialEngine);
      editorialEngine.processJob = async (job: any) => {
        const result = await originalProcessJob(job);
        
        // Check if result has proper metadata for Track Edits integration
        if (result && !this.validateEditorialEngineMetadata(result)) {
          this.recordAttributionFailure({
            type: 'MISSING_METADATA',
            severity: 'HIGH',
            message: 'Editorial Engine result lacks proper Track Edits metadata',
            context: {
              expectedMetadata: ['jobId', 'mode', 'provenance', 'author'],
              actualMetadata: result.metadata,
              missingFields: this.findMissingMetadataFields(result.metadata)
            }
          });
        }

        return result;
      };
    }
  }

  private monitorTrackEditsAttribution(): void {
    // Already handled in setupTrackEditsIntegrationMonitoring
    // This method can be used for additional attribution-specific monitoring
  }

  private handleDocumentChange(changeObj: any): void {
    // Correlate document changes with AI processing
    const now = Date.now();
    
    // Update pending workflow validations
    for (const [workflowId, validation] of this.pendingValidations) {
      if (!validation.documentChangeDetected) {
        validation.documentChangeDetected = true;
        validation.documentChange = changeObj;
        
        this.testLogger.log({
          level: 'INFO',
          category: 'EVENT',
          component: 'AI_INTEGRATION_MONITOR',
          action: 'DOCUMENT_CHANGE_DETECTED',
          data: { workflowId, changeObj, timestamp: now }
        });
      }
    }

    // Check if this change corresponds to any pending AI edits
    this.correlatePendingAIEdits('DOCUMENT_CHANGE', changeObj);
  }

  private handleDOMDocumentChange(mutation: MutationRecord): void {
    // Handle DOM-level document changes
    this.handleDocumentChange({
      type: 'dom-mutation',
      target: mutation.target,
      addedNodes: Array.from(mutation.addedNodes),
      removedNodes: Array.from(mutation.removedNodes)
    });
  }

  private handleTrackEditsChange(edit: any): void {
    const now = Date.now();
    
    this.testLogger.log({
      level: 'INFO',
      category: 'API',
      component: 'AI_INTEGRATION_MONITOR',
      action: 'TRACK_EDITS_CHANGE_RECEIVED',
      data: {
        editId: edit?.id,
        author: edit?.author,
        metadata: edit?.metadata,
        timestamp: now
      }
    });

    // Update pending workflow validations
    for (const [workflowId, validation] of this.pendingValidations) {
      if (!validation.trackEditsReceived) {
        validation.trackEditsReceived = true;
        validation.attributionCorrect = this.validateEditAttribution(edit);
      }
    }

    // Check attribution
    if (!this.validateEditAttribution(edit)) {
      this.recordAttributionFailure({
        type: 'INCORRECT_AUTHOR',
        severity: 'HIGH',
        message: 'Track Edits received edit with incorrect or missing attribution',
        context: {
          editId: edit?.id,
          expectedAuthor: 'editorial-engine',
          actualAuthor: edit?.author,
          expectedMetadata: ['jobId', 'mode', 'provenance'],
          actualMetadata: edit?.metadata,
          missingFields: this.findMissingEditFields(edit)
        }
      });
    }

    // Mark pending AI edits as found
    this.correlatePendingAIEdits('TRACK_EDITS', edit);
  }

  private handleTrackEditsBatchChanges(edits: any[]): void {
    // Handle batch processing of multiple AI changes
    for (const edit of edits) {
      this.handleTrackEditsChange(edit);
    }

    // Check if batch processing causes visual duplication issues
    setTimeout(() => {
      this.checkForVisualDuplicationIssues(edits);
    }, 500); // Wait for visual updates to complete
  }

  private performPeriodicCheck(): void {
    const now = Date.now();
    
    // Check for timed out pending AI edits
    this.checkPendingAIEditTimeouts();
    
    // Check for stalled workflow validations
    this.checkStalledWorkflows();
    
    // Check visual correlation issues
    this.checkVisualCorrelationIssues();
    
    // Update pipeline health status
    this.updatePipelineHealth();
    
    // Clean up old data
    this.cleanupOldData();
  }

  private checkPendingAIEditTimeouts(): void {
    const now = Date.now();
    const timeout = 15000; // 15 seconds timeout
    
    for (const pendingEdit of this.currentState.pendingAIEdits) {
      if (!pendingEdit.timeoutExpired && (now - pendingEdit.timestamp) > timeout) {
        pendingEdit.timeoutExpired = true;
        
        if (!pendingEdit.foundInTrackEdits) {
          this.recordAttributionFailure({
            type: 'LOST_PROVENANCE',
            severity: 'CRITICAL',
            message: 'AI edit timed out without appearing in Track Edits',
            context: {
              editId: pendingEdit.id,
              expectedAuthor: 'editorial-engine',
              missingFields: ['Track Edits integration']
            }
          });
        }
      }
    }
  }

  private checkStalledWorkflows(): void {
    const now = Date.now();
    const stallTimeout = 30000; // 30 seconds
    
    for (const [workflowId, validation] of this.pendingValidations) {
      if (validation.startTime && (now - validation.startTime) > stallTimeout) {
        // Complete the stalled workflow
        const completedValidation: AIWorkflowValidation = {
          workflowId,
          startTime: validation.startTime,
          aiProcessingDetected: validation.aiProcessingDetected || false,
          documentChangeDetected: validation.documentChangeDetected || false,
          trackEditsReceived: validation.trackEditsReceived || false,
          visualUpdateDetected: validation.visualUpdateDetected || false,
          attributionCorrect: validation.attributionCorrect || false,
          workflowComplete: false,
          duration: now - validation.startTime,
          issues: validation.issues || [],
          timestamp: now
        };

        // Add stall issue
        completedValidation.issues.push('Workflow stalled - timeout exceeded');

        this.workflowValidations.push(completedValidation);
        this.pendingValidations.delete(workflowId);

        this.testLogger.log({
          level: 'WARN',
          category: 'EVENT',
          component: 'AI_INTEGRATION_MONITOR',
          action: 'WORKFLOW_STALLED',
          data: { workflowId, validation: completedValidation }
        });
      }
    }
  }

  private checkVisualCorrelationIssues(): void {
    // Check if visual state matches expected state after AI processing
    if (this.visualMonitor) {
      const currentVisualState = this.visualMonitor.getCurrentState();
      
      // Look for issues in visual representation
      for (const pendingEdit of this.currentState.pendingAIEdits) {
        if (pendingEdit.foundInTrackEdits && !pendingEdit.timeoutExpired) {
          // Check if edit is properly highlighted
          if (!this.isEditVisuallyRepresented(pendingEdit, currentVisualState)) {
            this.recordVisualCorrelationIssue({
              type: 'EDIT_NOT_HIGHLIGHTED',
              severity: 'MEDIUM',
              message: 'AI edit found in Track Edits but not visually highlighted',
              documentChange: pendingEdit,
              visualState: currentVisualState,
              expectedVisualState: {
                hasHighlights: true,
                sidePanelContent: `Edit: ${pendingEdit.id}`
              }
            });
          }
        }
      }

      // Check for duplicate highlights
      if (this.detectDuplicateHighlights(currentVisualState)) {
        this.recordVisualCorrelationIssue({
          type: 'DUPLICATE_HIGHLIGHTS',
          severity: 'HIGH',
          message: 'Duplicate edit highlights detected in visual state',
          documentChange: null,
          visualState: currentVisualState,
          expectedVisualState: {
            hasHighlights: true,
            duplicateHighlights: false
          }
        });
      }
    }
  }

  private updatePipelineHealth(): void {
    const now = Date.now();
    const health = this.currentState.integrationPipelineHealth;
    
    health.lastHealthCheck = now;
    health.issues = [];

    // Check AI to Document pipeline
    const recentAIEdits = this.currentState.pendingAIEdits.filter(
      edit => (now - edit.timestamp) < 60000 && !edit.timeoutExpired
    );
    const documentAppliedRate = recentAIEdits.length === 0 ? 1 : 
      recentAIEdits.filter(edit => edit.documentApplied).length / recentAIEdits.length;
    
    health.aiToDocumentPipeline = documentAppliedRate > 0.8;
    if (!health.aiToDocumentPipeline) {
      health.issues.push('AI to Document pipeline has low success rate');
    }

    // Check Document to Track Edits pipeline
    const trackEditsReceivedRate = recentAIEdits.length === 0 ? 1 :
      recentAIEdits.filter(edit => edit.foundInTrackEdits).length / recentAIEdits.length;
    
    health.documentToTrackEditsPipeline = trackEditsReceivedRate > 0.8;
    if (!health.documentToTrackEditsPipeline) {
      health.issues.push('Document to Track Edits pipeline has low success rate');
    }

    // Check Editorial Engine integration
    const attributionRate = recentAIEdits.length === 0 ? 1 :
      recentAIEdits.filter(edit => edit.attributionPresent).length / recentAIEdits.length;
    
    health.editorialEngineIntegration = attributionRate > 0.8;
    if (!health.editorialEngineIntegration) {
      health.issues.push('Editorial Engine integration has attribution issues');
    }

    // Check Track Edits to Visual pipeline
    const recentCorrelationIssues = this.currentState.visualCorrelationIssues.filter(
      issue => (now - issue.timestamp) < 60000
    ).length;
    
    health.trackEditsToVisualPipeline = recentCorrelationIssues < 3;
    if (!health.trackEditsToVisualPipeline) {
      health.issues.push('Track Edits to Visual pipeline has correlation issues');
    }
  }

  private cleanupOldData(): void {
    const now = Date.now();
    const cleanupAge = 5 * 60 * 1000; // 5 minutes

    // Clean up old pending AI edits
    this.currentState.pendingAIEdits = this.currentState.pendingAIEdits.filter(
      edit => (now - edit.timestamp) < cleanupAge
    );

    // Clean up old attribution failures (keep last 100)
    if (this.currentState.attributionFailures.length > 100) {
      this.currentState.attributionFailures = this.currentState.attributionFailures.slice(-100);
    }

    // Clean up old visual correlation issues (keep last 50)
    if (this.currentState.visualCorrelationIssues.length > 50) {
      this.currentState.visualCorrelationIssues = this.currentState.visualCorrelationIssues.slice(-50);
    }

    // Clean up old workflow validations (keep last 100)
    if (this.workflowValidations.length > 100) {
      this.workflowValidations = this.workflowValidations.slice(-100);
    }
  }

  // Helper methods
  private validateEditorialEngineMetadata(result: any): boolean {
    const metadata = result?.metadata || {};
    const requiredFields = ['jobId', 'mode', 'provenance', 'author'];
    
    return requiredFields.every(field => metadata.hasOwnProperty(field));
  }

  private findMissingMetadataFields(metadata: any): string[] {
    const requiredFields = ['jobId', 'mode', 'provenance', 'author'];
    const presentFields = Object.keys(metadata || {});
    
    return requiredFields.filter(field => !presentFields.includes(field));
  }

  private validateEditAttribution(edit: any): boolean {
    return edit?.author === 'editorial-engine' &&
           edit?.metadata?.provenance === 'editorial-engine' &&
           edit?.metadata?.jobId;
  }

  private findMissingEditFields(edit: any): string[] {
    const missing = [];
    
    if (!edit?.author || edit.author !== 'editorial-engine') {
      missing.push('proper author');
    }
    if (!edit?.metadata?.provenance || edit.metadata.provenance !== 'editorial-engine') {
      missing.push('provenance metadata');
    }
    if (!edit?.metadata?.jobId) {
      missing.push('job ID metadata');
    }
    
    return missing;
  }

  private correlatePendingAIEdits(eventType: string, data: any): void {
    for (const pendingEdit of this.currentState.pendingAIEdits) {
      if (eventType === 'TRACK_EDITS' && !pendingEdit.foundInTrackEdits) {
        // Check if this Track Edits change corresponds to the pending AI edit
        if (data?.metadata?.jobId === pendingEdit.sourceJobId) {
          pendingEdit.foundInTrackEdits = true;
          pendingEdit.attributionPresent = this.validateEditAttribution(data);
        }
      } else if (eventType === 'DOCUMENT_CHANGE' && !pendingEdit.documentApplied) {
        // Assume document change corresponds to AI edit (more sophisticated matching could be implemented)
        pendingEdit.documentApplied = true;
      }
    }
  }

  private isEditVisuallyRepresented(edit: PendingAIEdit, visualState: VisualState): boolean {
    // Check if the edit is properly represented in the visual state
    return visualState.hasHighlights && 
           visualState.sidePanelContent?.includes(edit.id);
  }

  private detectDuplicateHighlights(visualState: VisualState): boolean {
    // Check for duplicate highlighting issues (like the whenwhen->iiff problem)
    return visualState.duplicateHighlights || false;
  }

  private checkForVisualDuplicationIssues(edits: any[]): void {
    if (this.visualMonitor) {
      const visualState = this.visualMonitor.getCurrentState();
      
      // Look for signs of duplication in visual highlights
      if (this.detectDuplicateHighlights(visualState)) {
        this.recordVisualCorrelationIssue({
          type: 'DUPLICATE_HIGHLIGHTS',
          severity: 'HIGH',
          message: 'Batch AI processing resulted in duplicate visual highlights',
          documentChange: edits,
          visualState,
          expectedVisualState: {
            hasHighlights: true,
            duplicateHighlights: false
          }
        });
      }
    }
  }

  private recordAttributionFailure(failure: Omit<AttributionFailure, 'id' | 'timestamp'>): void {
    const fullFailure: AttributionFailure = {
      id: `attr_failure_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      ...failure
    };

    this.currentState.attributionFailures.push(fullFailure);

    this.testLogger.log({
      level: fullFailure.severity === 'CRITICAL' || fullFailure.severity === 'HIGH' ? 'ERROR' : 'WARN',
      category: 'ERROR',
      component: 'AI_INTEGRATION_MONITOR',
      action: 'ATTRIBUTION_FAILURE_RECORDED',
      data: fullFailure
    });
  }

  private recordVisualCorrelationIssue(issue: Omit<VisualCorrelationIssue, 'id' | 'timestamp'>): void {
    const fullIssue: VisualCorrelationIssue = {
      id: `visual_issue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      ...issue
    };

    this.currentState.visualCorrelationIssues.push(fullIssue);

    this.testLogger.log({
      level: fullIssue.severity === 'CRITICAL' || fullIssue.severity === 'HIGH' ? 'ERROR' : 'WARN',
      category: 'ERROR',
      component: 'AI_INTEGRATION_MONITOR',
      action: 'VISUAL_CORRELATION_ISSUE_RECORDED',
      data: fullIssue
    });
  }

  // Public getters for external access
  getCurrentState(): AIIntegrationState {
    return { ...this.currentState };
  }

  getWorkflowValidations(): AIWorkflowValidation[] {
    return [...this.workflowValidations];
  }

  getPendingAIEdits(): PendingAIEdit[] {
    return [...this.currentState.pendingAIEdits];
  }

  getRecentAttributionFailures(minutes: number = 5): AttributionFailure[] {
    const cutoff = Date.now() - (minutes * 60 * 1000);
    return this.currentState.attributionFailures.filter(failure => failure.timestamp > cutoff);
  }

  getRecentCorrelationIssues(minutes: number = 5): VisualCorrelationIssue[] {
    const cutoff = Date.now() - (minutes * 60 * 1000);
    return this.currentState.visualCorrelationIssues.filter(issue => issue.timestamp > cutoff);
  }

  getPipelineHealth(): PipelineHealthStatus {
    return { ...this.currentState.integrationPipelineHealth };
  }

  isHealthy(): boolean {
    const health = this.currentState.integrationPipelineHealth;
    const recentFailures = this.getRecentAttributionFailures(2);
    const recentIssues = this.getRecentCorrelationIssues(2);
    
    return health.aiToDocumentPipeline &&
           health.documentToTrackEditsPipeline &&
           health.trackEditsToVisualPipeline &&
           health.editorialEngineIntegration &&
           recentFailures.filter(f => f.severity === 'CRITICAL').length === 0 &&
           recentIssues.filter(i => i.severity === 'CRITICAL').length === 0;
  }
}