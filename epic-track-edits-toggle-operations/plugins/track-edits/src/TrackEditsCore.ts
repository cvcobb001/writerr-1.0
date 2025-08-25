/**
 * @fileoverview Core integration module for Track Edits state management and persistence
 */

import { Vault, TFile } from 'obsidian';
import { StateManager } from './state/StateManager';
import { PersistenceManager } from './persistence/PersistenceManager';
import { SessionManager } from './session/SessionManager';
import { CrashRecovery } from './state/CrashRecovery';
import { MemoryManager } from './state/MemoryManager';
import { StateMigrations } from './state/StateMigrations';
import { ErrorHandler } from './state/ErrorHandler';
import { ObsidianStorageAdapter } from './persistence/ObsidianStorageAdapter';
import { Change, ChangeCluster, TrackingSession } from './types';
import { DocumentState, StateConfig } from './state/types';
import { PersistenceConfig } from './persistence/types';
import { SessionConfig } from './session/types';
import { EventEmitter } from 'events';

export interface TrackEditsCoreConfig {
  state?: Partial<StateConfig>;
  persistence?: Partial<PersistenceConfig>;
  session?: Partial<SessionConfig>;
  enableCrashRecovery?: boolean;
  enableMemoryOptimization?: boolean;
  enableMigrations?: boolean;
  enableErrorHandling?: boolean;
}

export class TrackEditsCore extends EventEmitter {
  private vault: Vault;
  private config: TrackEditsCoreConfig;
  
  private stateManager: StateManager;
  private persistenceManager: PersistenceManager;
  private sessionManager: SessionManager;
  private crashRecovery: CrashRecovery | null = null;
  private memoryManager: MemoryManager | null = null;
  private stateMigrations: StateMigrations | null = null;
  private errorHandler: ErrorHandler | null = null;
  
  private initialized = false;
  private disposing = false;

  constructor(vault: Vault, config: TrackEditsCoreConfig = {}) {
    super();
    
    this.vault = vault;
    this.config = {
      enableCrashRecovery: true,
      enableMemoryOptimization: true,
      enableMigrations: true,
      enableErrorHandling: true,
      ...config
    };

    // Initialize core managers
    this.stateManager = new StateManager(config.state);
    this.persistenceManager = new PersistenceManager(vault, config.persistence);
    this.sessionManager = new SessionManager(config.session);

    // Initialize optional features
    if (this.config.enableErrorHandling) {
      this.errorHandler = new ErrorHandler();
      this.setupErrorHandling();
    }

    if (this.config.enableMigrations) {
      this.stateMigrations = new StateMigrations();
    }

    if (this.config.enableMemoryOptimization) {
      this.memoryManager = new MemoryManager();
    }

    if (this.config.enableCrashRecovery) {
      const storage = new ObsidianStorageAdapter(vault);
      this.crashRecovery = new CrashRecovery(storage);
      this.setupCrashRecovery();
    }

    this.setupEventForwarding();
  }

  /**
   * Initialize the Track Edits core system
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Initialize persistence first
      await this.persistenceManager.initialize();
      
      // Initialize crash recovery
      if (this.crashRecovery) {
        await this.crashRecovery.initialize();
      }

      // Perform any necessary migrations
      if (this.stateMigrations) {
        await this.performSystemMigrations();
      }

      // Setup periodic operations
      this.setupPeriodicTasks();

      this.initialized = true;
      this.emit('initialized');

    } catch (error) {
      const handledError = await this.handleError(error, 'initialization');
      if (!handledError.recovered) {
        throw new Error(`Track Edits initialization failed: ${error.message}`);
      }
    }
  }

  /**
   * Initialize document for tracking
   */
  async initializeDocument(file: TFile): Promise<DocumentState> {
    this.ensureInitialized();

    try {
      // Check if we have existing state
      let documentState = await this.loadDocumentState(file.path);
      
      if (!documentState) {
        // Create new document state
        documentState = await this.stateManager.initializeDocument(file);
        await this.persistenceManager.saveDocumentState(documentState);
      }

      // Validate state
      if (this.errorHandler) {
        const validation = await this.errorHandler.validateDocumentState(documentState);
        if (!validation.valid) {
          this.emit('validationFailed', { documentId: documentState.id, validation });
        }
      }

      return documentState;

    } catch (error) {
      const handledError = await this.handleError(error, { operation: 'initializeDocument', file: file.path });
      if (handledError.recovered) {
        return await this.initializeDocument(file);
      }
      throw error;
    }
  }

  /**
   * Start tracking session for document
   */
  async startTrackingSession(documentId: string, userId?: string): Promise<TrackingSession> {
    this.ensureInitialized();

    try {
      const session = await this.sessionManager.startSession(documentId, userId);
      
      // Save session state
      const documentState = this.stateManager.getDocumentState(documentId);
      if (documentState) {
        await this.persistenceManager.saveDocumentState(documentState);
      }

      this.emit('sessionStarted', { sessionId: session.id, documentId, userId });
      return session;

    } catch (error) {
      const handledError = await this.handleError(error, { operation: 'startTrackingSession', documentId, userId });
      if (handledError.recovered) {
        return await this.startTrackingSession(documentId, userId);
      }
      throw error;
    }
  }

  /**
   * End tracking session
   */
  async endTrackingSession(sessionId: string): Promise<void> {
    this.ensureInitialized();

    try {
      const sessionState = this.sessionManager.getSessionState(sessionId);
      if (!sessionState) {
        throw new Error(`Session not found: ${sessionId}`);
      }

      await this.sessionManager.endSession(sessionId);
      
      // Save final state
      const documentState = this.stateManager.getDocumentState(sessionState.session.documentId);
      if (documentState) {
        await this.persistenceManager.saveDocumentState(documentState);
      }

      this.emit('sessionEnded', { sessionId });

    } catch (error) {
      await this.handleError(error, { operation: 'endTrackingSession', sessionId });
      // Don't rethrow for session end - log and continue
    }
  }

  /**
   * Add change to tracking
   */
  async addChange(documentId: string, change: Change): Promise<void> {
    this.ensureInitialized();

    try {
      // Validate change
      if (this.errorHandler) {
        const validation = await this.errorHandler.validateChange(change);
        if (!validation.valid) {
          throw new Error(`Change validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
        }
      }

      // Add to state
      await this.stateManager.addChange(documentId, change);
      
      // Add to active session if exists
      const activeSessions = this.sessionManager.getActiveSessions();
      const documentSession = activeSessions.find(s => s.session.documentId === documentId);
      if (documentSession) {
        await this.sessionManager.addChange(documentSession.session.id, change);
      }

      // Check memory usage and optimize if needed
      if (this.memoryManager) {
        const documentState = this.stateManager.getDocumentState(documentId);
        if (documentState && documentState.changes.size > 1000) {
          const optimized = await this.memoryManager.optimizeDocumentState(documentState);
          // Apply optimization if beneficial
          if (optimized.compressionRatio < 0.8) {
            this.emit('memoryOptimizationApplied', { documentId, ratio: optimized.compressionRatio });
          }
        }
      }

      this.emit('changeAdded', { documentId, changeId: change.id });

    } catch (error) {
      const handledError = await this.handleError(error, { operation: 'addChange', documentId, changeId: change.id });
      if (handledError.recovered) {
        return await this.addChange(documentId, change);
      }
      throw error;
    }
  }

  /**
   * Accept change
   */
  async acceptChange(documentId: string, changeId: string): Promise<void> {
    this.ensureInitialized();

    try {
      await this.stateManager.updateChange(documentId, changeId, { status: 'accepted' as any });
      
      // Update session if active
      const activeSessions = this.sessionManager.getActiveSessions();
      const documentSession = activeSessions.find(s => s.session.documentId === documentId);
      if (documentSession) {
        await this.sessionManager.acceptChange(documentSession.session.id, changeId);
      }

      // Remove from state (as it's accepted)
      await this.stateManager.removeChange(documentId, changeId);
      
      // Save state
      const documentState = this.stateManager.getDocumentState(documentId);
      if (documentState) {
        await this.persistenceManager.saveDocumentState(documentState);
      }

      this.emit('changeAccepted', { documentId, changeId });

    } catch (error) {
      await this.handleError(error, { operation: 'acceptChange', documentId, changeId });
      throw error;
    }
  }

  /**
   * Reject change
   */
  async rejectChange(documentId: string, changeId: string): Promise<void> {
    this.ensureInitialized();

    try {
      await this.stateManager.updateChange(documentId, changeId, { status: 'rejected' as any });
      
      // Update session if active
      const activeSessions = this.sessionManager.getActiveSessions();
      const documentSession = activeSessions.find(s => s.session.documentId === documentId);
      if (documentSession) {
        await this.sessionManager.rejectChange(documentSession.session.id, changeId);
      }

      // Remove from state (as it's rejected)
      await this.stateManager.removeChange(documentId, changeId);
      
      // Save state
      const documentState = this.stateManager.getDocumentState(documentId);
      if (documentState) {
        await this.persistenceManager.saveDocumentState(documentState);
      }

      this.emit('changeRejected', { documentId, changeId });

    } catch (error) {
      await this.handleError(error, { operation: 'rejectChange', documentId, changeId });
      throw error;
    }
  }

  /**
   * Create system backup
   */
  async createBackup(description?: string): Promise<void> {
    this.ensureInitialized();

    try {
      const backup = await this.persistenceManager.createBackup(description);
      
      if (this.crashRecovery) {
        const documentStates = this.stateManager.getAllDocumentStates();
        const sessionStates = new Map();
        
        for (const session of this.sessionManager.getActiveSessions()) {
          sessionStates.set(session.session.id, session);
        }
        
        await this.crashRecovery.createIncrementalBackup(documentStates, sessionStates);
      }

      this.emit('backupCreated', { backupId: backup.id });

    } catch (error) {
      await this.handleError(error, { operation: 'createBackup' });
      throw error;
    }
  }

  /**
   * Get system health status
   */
  async getSystemHealth(): Promise<SystemHealth> {
    this.ensureInitialized();

    try {
      const persistenceHealth = await this.persistenceManager.getHealth();
      const memoryStats = this.memoryManager?.getMemoryStats();
      const errorStats = this.errorHandler?.getErrorStats();

      return {
        overall: persistenceHealth.healthy && (errorStats?.criticalErrors || 0) === 0,
        persistence: persistenceHealth,
        memory: memoryStats,
        errors: errorStats,
        lastCheck: Date.now()
      };

    } catch (error) {
      await this.handleError(error, { operation: 'getSystemHealth' });
      throw error;
    }
  }

  /**
   * Dispose and cleanup
   */
  async dispose(): Promise<void> {
    if (this.disposing) return;
    this.disposing = true;

    try {
      // End all active sessions
      const activeSessions = this.sessionManager.getActiveSessions();
      for (const session of activeSessions) {
        await this.sessionManager.endSession(session.session.id);
      }

      // Create final checkpoint if crash recovery is enabled
      if (this.crashRecovery) {
        const documentStates = this.stateManager.getAllDocumentStates();
        const sessionStates = new Map();
        await this.crashRecovery.saveCheckpoint(documentStates, sessionStates);
      }

      // Dispose all components
      this.stateManager.dispose();
      this.sessionManager.dispose();
      this.persistenceManager.dispose();
      
      if (this.crashRecovery) this.crashRecovery.dispose();
      if (this.memoryManager) this.memoryManager.dispose();
      if (this.errorHandler) this.errorHandler.dispose();

      this.removeAllListeners();
      this.emit('disposed');

    } catch (error) {
      this.emit('error', error);
    }
  }

  // Private methods

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('TrackEditsCore not initialized. Call initialize() first.');
    }
  }

  private async loadDocumentState(filePath: string): Promise<DocumentState | null> {
    try {
      return await this.persistenceManager.loadDocumentState(filePath);
    } catch (error) {
      return null; // Return null if state doesn't exist or is corrupted
    }
  }

  private async handleError(error: Error, context?: any): Promise<any> {
    if (this.errorHandler) {
      return await this.errorHandler.handleError(error, context);
    } else {
      this.emit('error', error);
      return { recovered: false, shouldRetry: false };
    }
  }

  private setupErrorHandling(): void {
    if (!this.errorHandler) return;

    // Forward error handling events
    this.errorHandler.on('errorHandled', (result) => {
      this.emit('errorHandled', result);
    });

    this.errorHandler.on('criticalError', (error) => {
      this.emit('criticalError', error);
    });

    this.errorHandler.on('errorSpike', (info) => {
      this.emit('errorSpike', info);
    });
  }

  private setupCrashRecovery(): void {
    if (!this.crashRecovery) return;

    this.crashRecovery.on('crashDetected', (info) => {
      this.emit('crashDetected', info);
    });

    this.crashRecovery.on('recoveryCompleted', (info) => {
      this.emit('recoveryCompleted', info);
    });

    this.crashRecovery.on('documentStateRecovered', ({ documentId, state }) => {
      // Restore the document state to the state manager
      this.stateManager.getAllDocumentStates().set(documentId, state);
    });
  }

  private setupEventForwarding(): void {
    // Forward state manager events
    this.stateManager.on('documentInitialized', (data) => this.emit('documentInitialized', data));
    this.stateManager.on('stateEvent', (event) => this.emit('stateEvent', event));
    
    // Forward session manager events
    this.sessionManager.on('sessionStarted', (data) => this.emit('sessionStarted', data));
    this.sessionManager.on('sessionEnded', (data) => this.emit('sessionEnded', data));
    this.sessionManager.on('changeAdded', (data) => this.emit('sessionChangeAdded', data));
    
    // Forward persistence manager events
    this.persistenceManager.on('documentSaved', (data) => this.emit('documentSaved', data));
    this.persistenceManager.on('backupCreated', (data) => this.emit('backupCreated', data));
  }

  private setupPeriodicTasks(): void {
    // Auto-save every 30 seconds
    setInterval(async () => {
      try {
        const documentStates = this.stateManager.getAllDocumentStates();
        for (const [documentId, state] of documentStates) {
          await this.persistenceManager.saveDocumentState(state);
        }
      } catch (error) {
        await this.handleError(error, { operation: 'periodicSave' });
      }
    }, 30000);

    // Create checkpoint for crash recovery every 5 minutes
    if (this.crashRecovery) {
      setInterval(async () => {
        try {
          const documentStates = this.stateManager.getAllDocumentStates();
          const sessionStates = new Map();
          
          for (const session of this.sessionManager.getActiveSessions()) {
            sessionStates.set(session.session.id, session);
          }
          
          await this.crashRecovery.saveCheckpoint(documentStates, sessionStates);
        } catch (error) {
          await this.handleError(error, { operation: 'periodicCheckpoint' });
        }
      }, 5 * 60 * 1000);
    }

    // Memory cleanup every 10 minutes
    if (this.memoryManager) {
      setInterval(async () => {
        try {
          await this.memoryManager.forceGarbageCollection();
        } catch (error) {
          await this.handleError(error, { operation: 'memoryCleanup' });
        }
      }, 10 * 60 * 1000);
    }
  }

  private async performSystemMigrations(): Promise<void> {
    if (!this.stateMigrations) return;

    try {
      // Check if any existing data needs migration
      const documentStates = this.stateManager.getAllDocumentStates();
      
      for (const [documentId, state] of documentStates) {
        const currentVersion = this.stateMigrations.validateStateVersion(state);
        
        if (this.stateMigrations.needsMigration(currentVersion)) {
          const backup = await this.stateMigrations.createMigrationBackup(state, currentVersion);
          const migratedState = await this.stateMigrations.migrateState(state, currentVersion);
          
          // Update the state
          documentStates.set(documentId, migratedState);
          await this.persistenceManager.saveDocumentState(migratedState);
          
          this.emit('stateMigrated', { documentId, fromVersion: currentVersion, toVersion: this.stateMigrations.getCurrentVersion() });
        }
      }
    } catch (error) {
      throw new Error(`System migration failed: ${error.message}`);
    }
  }
}

interface SystemHealth {
  overall: boolean;
  persistence: any;
  memory?: any;
  errors?: any;
  lastCheck: number;
}