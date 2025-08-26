// Track Edits Adapter - Editorial Engine Integration
import { EngineAdapter, ExecutionJob, EngineResult, OperationType, AdapterCapabilities, AdapterStatus, AdapterMetrics, AdapterConfig } from '../types';
import { EditChange } from '../../../../shared/types';

export class TrackEditsAdapter implements EngineAdapter {
  name = 'track-edits';
  version = '1.0.0';
  supportedOperations: OperationType[] = ['text-edit', 'content-modification', 'proofreading', 'editing'];
  capabilities: AdapterCapabilities = {
    batchProcessing: true,
    realTimeProcessing: true,
    undoSupport: true,
    provenance: true,
    streaming: false
  };

  private initialized = false;
  private config: AdapterConfig = {};
  private metrics: AdapterMetrics = {
    executionsCount: 0,
    successRate: 1.0,
    averageLatency: 0,
    errorCount: 0,
    lastExecution: Date.now()
  };
  private executionTimes: number[] = [];
  private errors: string[] = [];

  async initialize(config: AdapterConfig): Promise<void> {
    this.config = config;
    
    // Verify Track Edits plugin is available
    if (!window.WriterrlAPI?.trackEdits) {
      throw new Error('Track Edits plugin is not loaded or accessible');
    }

    // Test connectivity
    const currentSession = window.WriterrlAPI.trackEdits.getCurrentSession();
    console.log('Track Edits Adapter initialized, current session:', currentSession ? 'active' : 'none');
    
    this.initialized = true;
  }

  async execute(job: ExecutionJob): Promise<EngineResult> {
    const startTime = performance.now();
    
    try {
      if (!this.initialized) {
        throw new Error('Track Edits Adapter not initialized');
      }

      // Ensure we have an active tracking session
      await this.ensureTrackingSession();

      // Convert Editorial Engine job to Track Edits format
      const trackEditsChanges = this.convertToTrackEditsFormat(job);
      
      // Process changes through Track Edits
      const result = await this.processChangesWithTrackEdits(trackEditsChanges, job);
      
      // Record successful execution
      const executionTime = performance.now() - startTime;
      this.recordExecution(executionTime, true);

      // Convert Track Edits result back to Editorial Engine format
      return this.convertFromTrackEditsFormat(result, job);

    } catch (error) {
      const executionTime = performance.now() - startTime;
      this.recordExecution(executionTime, false, error.message);
      
      return {
        success: false,
        jobId: job.id,
        timestamp: Date.now(),
        executionTime,
        errors: [{
          type: 'adapter-error',
          message: error.message,
          timestamp: Date.now()
        }],
        metadata: {
          adapter: this.name,
          version: this.version
        }
      };
    }
  }

  async cleanup(): Promise<void> {
    this.initialized = false;
    this.config = {};
    console.log('Track Edits Adapter cleaned up');
  }

  getStatus(): AdapterStatus {
    const isTrackEditsAvailable = !!window.WriterrlAPI?.trackEdits;
    const hasActiveSession = !!window.WriterrlAPI?.trackEdits?.getCurrentSession();
    
    return {
      healthy: this.initialized && isTrackEditsAvailable,
      ready: this.initialized && isTrackEditsAvailable && hasActiveSession,
      error: !isTrackEditsAvailable ? 'Track Edits plugin not available' : 
             !hasActiveSession ? 'No active tracking session' : undefined,
      lastHealthCheck: Date.now(),
      currentLoad: 0
    };
  }

  getMetrics(): AdapterMetrics {
    return { ...this.metrics };
  }

  // Private implementation methods
  private async ensureTrackingSession(): Promise<void> {
    if (!window.WriterrlAPI?.trackEdits) {
      throw new Error('Track Edits API not available');
    }

    const currentSession = window.WriterrlAPI.trackEdits.getCurrentSession();
    if (!currentSession) {
      // Start tracking if no session is active
      window.WriterrlAPI.trackEdits.startTracking();
      
      // Verify session was created
      const newSession = window.WriterrlAPI.trackEdits.getCurrentSession();
      if (!newSession) {
        throw new Error('Failed to start Track Edits session');
      }
      
      console.log('Started Track Edits session:', newSession.id);
    }
  }

  private convertToTrackEditsFormat(job: ExecutionJob): EditChange[] {
    const changes: EditChange[] = [];
    
    // Convert job payload to Track Edits change format
    if (job.payload.changes) {
      // If the job already contains Track Edits format changes
      return job.payload.changes as EditChange[];
    }
    
    // Convert from Editorial Engine format
    if (job.payload.text && job.payload.edits) {
      for (const edit of job.payload.edits) {
        changes.push({
          id: `${job.id}-${edit.id || Date.now()}`,
          timestamp: Date.now(),
          type: edit.type === 'addition' ? 'insert' : edit.type === 'deletion' ? 'delete' : 'replace',
          from: edit.start || 0,
          to: edit.end || edit.start || 0,
          text: edit.newText || '',
          removedText: edit.oldText || '',
          author: 'editorial-engine',
          metadata: {
            jobId: job.id,
            mode: job.payload.mode,
            provenance: 'editorial-engine'
          }
        });
      }
    } else if (job.payload.text) {
      // Create a single change for the entire text
      changes.push({
        id: `${job.id}-full-text`,
        timestamp: Date.now(),
        type: 'replace',
        from: 0,
        to: job.payload.originalText?.length || 0,
        text: job.payload.text,
        removedText: job.payload.originalText || '',
        author: 'editorial-engine',
        metadata: {
          jobId: job.id,
          mode: job.payload.mode,
          provenance: 'editorial-engine'
        }
      });
    }
    
    return changes;
  }

  private async processChangesWithTrackEdits(changes: EditChange[], job: ExecutionJob): Promise<TrackEditsResult> {
    // Submit changes to Track Edits for visualization and management
    const trackEditsAPI = window.WriterrlAPI.trackEdits!;
    const currentSession = trackEditsAPI.getCurrentSession()!;
    
    // In a real implementation, we would integrate with the Track Edits internal API
    // For now, we simulate the processing and return a success result
    
    return {
      success: true,
      sessionId: currentSession.id,
      appliedChanges: changes,
      rejectedChanges: [],
      timestamp: Date.now(),
      metadata: {
        jobId: job.id,
        mode: job.payload.mode,
        processingTime: 0
      }
    };
  }

  private convertFromTrackEditsFormat(trackEditsResult: TrackEditsResult, job: ExecutionJob): EngineResult {
    const executionTime = performance.now() - (job.metadata?.startTime || Date.now());
    
    if (!trackEditsResult.success) {
      return {
        success: false,
        jobId: job.id,
        timestamp: Date.now(),
        executionTime,
        errors: [{
          type: 'track-edits-error',
          message: 'Track Edits processing failed',
          timestamp: Date.now()
        }],
        metadata: {
          adapter: this.name,
          version: this.version,
          trackEditsSession: trackEditsResult.sessionId
        }
      };
    }

    return {
      success: true,
      jobId: job.id,
      timestamp: Date.now(),
      executionTime,
      result: {
        processedText: job.payload.text, // In real implementation, get processed text from Track Edits
        changes: trackEditsResult.appliedChanges,
        rejectedChanges: trackEditsResult.rejectedChanges,
        sessionId: trackEditsResult.sessionId
      },
      metadata: {
        adapter: this.name,
        version: this.version,
        trackEditsSession: trackEditsResult.sessionId,
        appliedChanges: trackEditsResult.appliedChanges.length,
        rejectedChanges: trackEditsResult.rejectedChanges.length
      },
      provenance: {
        adapter: this.name,
        timestamp: Date.now(),
        jobId: job.id,
        sessionId: trackEditsResult.sessionId,
        changes: trackEditsResult.appliedChanges.map(change => ({
          id: change.id,
          type: change.type,
          position: { from: change.from, to: change.to },
          author: change.author
        }))
      }
    };
  }

  private recordExecution(executionTime: number, success: boolean, error?: string): void {
    this.metrics.executionsCount++;
    this.metrics.lastExecution = Date.now();
    
    this.executionTimes.push(executionTime);
    if (this.executionTimes.length > 100) {
      this.executionTimes = this.executionTimes.slice(-100); // Keep last 100
    }
    
    this.metrics.averageLatency = this.executionTimes.reduce((sum, time) => sum + time, 0) / this.executionTimes.length;
    
    if (success) {
      this.metrics.successRate = (this.metrics.successRate * (this.metrics.executionsCount - 1) + 1) / this.metrics.executionsCount;
    } else {
      this.metrics.errorCount++;
      this.metrics.successRate = (this.metrics.successRate * (this.metrics.executionsCount - 1)) / this.metrics.executionsCount;
      
      if (error) {
        this.errors.push(error);
        if (this.errors.length > 50) {
          this.errors = this.errors.slice(-50); // Keep last 50 errors
        }
      }
    }
  }
}

// Internal types for Track Edits communication
interface TrackEditsResult {
  success: boolean;
  sessionId: string;
  appliedChanges: EditChange[];
  rejectedChanges: EditChange[];
  timestamp: number;
  metadata: {
    jobId: string;
    mode: string;
    processingTime: number;
  };
}