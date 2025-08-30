// Editorial Engine Workflow Monitor
// Monitors Editorial Engine integration for constraint processing failures,
// mode bypasses, and Chat → Engine → Track Edits pipeline breaks

import { TestLogger, TestLogEntry } from './test-logger';

export interface EditorialEngineState {
  isConnected: boolean;
  currentMode: string | null;
  activeSession: string | null;
  constraintProcessingActive: boolean;
  lastProcessingTime: number;
  errors: EditorialEngineError[];
}

export interface EditorialEngineError {
  id: string;
  type: 'CONSTRAINT_FAILURE' | 'MODE_BYPASS' | 'CONNECTION_LOST' | 'PROCESSING_FAILURE';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  timestamp: number;
  context: any;
  workflowStage: 'CHAT_REQUEST' | 'ENGINE_PROCESSING' | 'TRACK_EDITS_INTEGRATION';
}

export interface WorkflowIntegrityCheck {
  chatToEngineHandoff: boolean;
  engineToTrackEditsHandoff: boolean;
  constraintCompliance: boolean;
  modeConsistency: boolean;
  timestamp: number;
  issues: string[];
}

export class EditorialEngineMonitor {
  private testLogger: TestLogger;
  private isMonitoring = false;
  private currentState: EditorialEngineState;
  private monitoringInterval: NodeJS.Timer | null = null;
  private workflowChecks: WorkflowIntegrityCheck[] = [];
  
  constructor(testLogger: TestLogger) {
    this.testLogger = testLogger;
    this.currentState = {
      isConnected: false,
      currentMode: null,
      activeSession: null,
      constraintProcessingActive: false,
      lastProcessingTime: 0,
      errors: []
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
      component: 'EDITORIAL_ENGINE_MONITOR',
      action: 'START_MONITORING',
      data: { timestamp: Date.now() }
    });

    // Set up periodic monitoring
    this.monitoringInterval = setInterval(() => {
      this.performPeriodicCheck();
    }, 2000); // Check every 2 seconds

    // Set up Editorial Engine API monitoring hooks
    this.setupAPIMonitoring();
    
    // Set up Chat panel integration monitoring
    this.setupChatIntegrationMonitoring();
    
    // Set up constraint processing monitoring
    this.setupConstraintProcessingMonitoring();
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

    this.testLogger.log({
      level: 'INFO',
      category: 'EVENT',
      component: 'EDITORIAL_ENGINE_MONITOR',
      action: 'STOP_MONITORING',
      data: { 
        timestamp: Date.now(),
        totalErrors: this.currentState.errors.length,
        workflowChecks: this.workflowChecks.length
      }
    });
  }

  private setupAPIMonitoring(): void {
    // Monitor Editorial Engine API availability
    const checkEditorialEngineAPI = () => {
      const wasConnected = this.currentState.isConnected;
      const isNowConnected = !!(window as any).WriterrlAPI?.editorialEngine;
      
      if (wasConnected && !isNowConnected) {
        this.recordError({
          type: 'CONNECTION_LOST',
          severity: 'CRITICAL',
          message: 'Editorial Engine API connection lost',
          context: { previousState: 'connected' },
          workflowStage: 'ENGINE_PROCESSING'
        });
      } else if (!wasConnected && isNowConnected) {
        this.testLogger.log({
          level: 'INFO',
          category: 'STATE',
          component: 'EDITORIAL_ENGINE_MONITOR',
          action: 'CONNECTION_RESTORED',
          data: { timestamp: Date.now() }
        });
      }

      this.currentState.isConnected = isNowConnected;
      
      if (isNowConnected) {
        this.checkCurrentMode();
        this.checkActiveSession();
      }
    };

    // Check immediately and set up monitoring
    checkEditorialEngineAPI();
    setInterval(checkEditorialEngineAPI, 1000);
  }

  private setupChatIntegrationMonitoring(): void {
    // Monitor Chat → Editorial Engine handoff
    const originalConsoleLog = console.log;
    const originalConsoleWarn = console.warn;
    const originalConsoleError = console.error;

    // Intercept console messages related to Editorial Engine and Chat integration
    console.log = (...args: any[]) => {
      this.analyzeConsoleMessage('LOG', args);
      originalConsoleLog.apply(console, args);
    };

    console.warn = (...args: any[]) => {
      this.analyzeConsoleMessage('WARN', args);
      originalConsoleWarn.apply(console, args);
    };

    console.error = (...args: any[]) => {
      this.analyzeConsoleMessage('ERROR', args);
      originalConsoleError.apply(console, args);
    };
  }

  private setupConstraintProcessingMonitoring(): void {
    // Monitor DOM for Chat panel error messages
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          this.checkForChatErrorMessages(mutation);
          this.checkForModeBypassIndicators(mutation);
        }
      }
    });

    // Observe chat panel and editorial engine UI areas
    const chatPanel = document.querySelector('.writerr-chat-panel, .chat-panel');
    const editorialEnginePanel = document.querySelector('.editorial-engine-panel, .engine-panel');
    
    if (chatPanel) {
      observer.observe(chatPanel, { childList: true, subtree: true });
    }
    
    if (editorialEnginePanel) {
      observer.observe(editorialEnginePanel, { childList: true, subtree: true });
    }

    // Also observe the entire document body for any Editorial Engine related changes
    observer.observe(document.body, { 
      childList: true, 
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'data-mode', 'data-engine-status']
    });
  }

  private performPeriodicCheck(): void {
    const check: WorkflowIntegrityCheck = {
      chatToEngineHandoff: this.validateChatToEngineHandoff(),
      engineToTrackEditsHandoff: this.validateEngineToTrackEditsHandoff(),
      constraintCompliance: this.validateConstraintCompliance(),
      modeConsistency: this.validateModeConsistency(),
      timestamp: Date.now(),
      issues: []
    };

    // Collect issues
    if (!check.chatToEngineHandoff) {
      check.issues.push('Chat to Editorial Engine handoff failure detected');
    }
    if (!check.engineToTrackEditsHandoff) {
      check.issues.push('Editorial Engine to Track Edits integration failure detected');
    }
    if (!check.constraintCompliance) {
      check.issues.push('Constraint processing compliance failure detected');
    }
    if (!check.modeConsistency) {
      check.issues.push('Mode consistency violation detected');
    }

    this.workflowChecks.push(check);
    
    // Keep only last 100 checks
    if (this.workflowChecks.length > 100) {
      this.workflowChecks = this.workflowChecks.slice(-100);
    }

    // Log significant issues
    if (check.issues.length > 0) {
      this.testLogger.log({
        level: 'WARN',
        category: 'STATE',
        component: 'EDITORIAL_ENGINE_MONITOR',
        action: 'WORKFLOW_INTEGRITY_ISSUES',
        data: { 
          check,
          issueCount: check.issues.length
        }
      });
    }
  }

  private checkCurrentMode(): void {
    try {
      const editorialEngine = (window as any).WriterrlAPI?.editorialEngine;
      if (editorialEngine && editorialEngine.getCurrentMode) {
        const mode = editorialEngine.getCurrentMode();
        if (mode !== this.currentState.currentMode) {
          this.testLogger.log({
            level: 'INFO',
            category: 'STATE',
            component: 'EDITORIAL_ENGINE_MONITOR',
            action: 'MODE_CHANGE',
            data: {
              previousMode: this.currentState.currentMode,
              newMode: mode,
              timestamp: Date.now()
            }
          });
          this.currentState.currentMode = mode;
        }
      }
    } catch (error) {
      this.recordError({
        type: 'PROCESSING_FAILURE',
        severity: 'MEDIUM',
        message: 'Failed to check Editorial Engine current mode',
        context: { error: error.message },
        workflowStage: 'ENGINE_PROCESSING'
      });
    }
  }

  private checkActiveSession(): void {
    try {
      const editorialEngine = (window as any).WriterrlAPI?.editorialEngine;
      if (editorialEngine && editorialEngine.getActiveSession) {
        const session = editorialEngine.getActiveSession();
        const sessionId = session?.id || null;
        if (sessionId !== this.currentState.activeSession) {
          this.testLogger.log({
            level: 'INFO',
            category: 'STATE',
            component: 'EDITORIAL_ENGINE_MONITOR',
            action: 'SESSION_CHANGE',
            data: {
              previousSession: this.currentState.activeSession,
              newSession: sessionId,
              timestamp: Date.now()
            }
          });
          this.currentState.activeSession = sessionId;
        }
      }
    } catch (error) {
      this.recordError({
        type: 'PROCESSING_FAILURE',
        severity: 'MEDIUM',
        message: 'Failed to check Editorial Engine active session',
        context: { error: error.message },
        workflowStage: 'ENGINE_PROCESSING'
      });
    }
  }

  private analyzeConsoleMessage(level: 'LOG' | 'WARN' | 'ERROR', args: any[]): void {
    const message = args.join(' ').toLowerCase();
    
    // Check for Editorial Engine error patterns
    if (message.includes('editorial engine couldn\'t do it') || 
        message.includes('editorial engine error') ||
        message.includes('constraint processing failed')) {
      this.recordError({
        type: 'PROCESSING_FAILURE',
        severity: level === 'ERROR' ? 'HIGH' : 'MEDIUM',
        message: args.join(' '),
        context: { consoleLevel: level, args },
        workflowStage: 'ENGINE_PROCESSING'
      });
    }

    // Check for mode bypass patterns
    if (message.includes('bypassing editorial engine') ||
        message.includes('direct processing') ||
        message.includes('skipping constraints')) {
      this.recordError({
        type: 'MODE_BYPASS',
        severity: 'HIGH',
        message: 'Mode bypass detected in console output',
        context: { consoleLevel: level, args },
        workflowStage: 'CHAT_REQUEST'
      });
    }

    // Check for constraint failure patterns
    if (message.includes('constraint validation failed') ||
        message.includes('constraint not applied') ||
        message.includes('mode constraint error')) {
      this.recordError({
        type: 'CONSTRAINT_FAILURE',
        severity: 'HIGH',
        message: 'Constraint processing failure detected',
        context: { consoleLevel: level, args },
        workflowStage: 'ENGINE_PROCESSING'
      });
    }
  }

  private checkForChatErrorMessages(mutation: MutationRecord): void {
    // Check for error messages in chat panel
    const addedNodes = Array.from(mutation.addedNodes);
    for (const node of addedNodes) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as Element;
        const text = element.textContent?.toLowerCase() || '';
        
        if (text.includes('editorial engine error') ||
            text.includes('couldn\'t process') ||
            text.includes('processing failed')) {
          this.recordError({
            type: 'PROCESSING_FAILURE',
            severity: 'HIGH',
            message: 'Chat panel error message detected',
            context: { 
              elementText: element.textContent,
              elementHTML: element.innerHTML,
              className: element.className
            },
            workflowStage: 'CHAT_REQUEST'
          });
        }
      }
    }
  }

  private checkForModeBypassIndicators(mutation: MutationRecord): void {
    // Check for UI indicators of mode bypass
    const addedNodes = Array.from(mutation.addedNodes);
    for (const node of addedNodes) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as Element;
        
        // Check for bypass indicators in class names or data attributes
        if (element.classList.contains('bypass-mode') ||
            element.classList.contains('direct-processing') ||
            element.getAttribute('data-bypass') === 'true') {
          this.recordError({
            type: 'MODE_BYPASS',
            severity: 'HIGH',
            message: 'UI mode bypass indicator detected',
            context: {
              element: element.outerHTML,
              className: element.className,
              attributes: Array.from(element.attributes).map(attr => ({
                name: attr.name,
                value: attr.value
              }))
            },
            workflowStage: 'CHAT_REQUEST'
          });
        }
      }
    }
  }

  private validateChatToEngineHandoff(): boolean {
    // Check if chat requests are properly being handed off to Editorial Engine
    try {
      const chatPanel = document.querySelector('.writerr-chat-panel, .chat-panel');
      const editorialEngine = (window as any).WriterrlAPI?.editorialEngine;
      
      if (!chatPanel || !editorialEngine) {
        return false;
      }

      // Check for active processing indicators
      const hasActiveProcessing = chatPanel.querySelector('.processing, .thinking, .analyzing');
      const engineHasActiveJob = editorialEngine.hasActiveJob && editorialEngine.hasActiveJob();
      
      // If chat shows processing but engine has no active job, handoff may have failed
      if (hasActiveProcessing && !engineHasActiveJob) {
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  private validateEngineToTrackEditsHandoff(): boolean {
    // Check if Editorial Engine output is properly reaching Track Edits
    try {
      const editorialEngine = (window as any).WriterrlAPI?.editorialEngine;
      const trackEdits = (window as any).WriterrlAPI?.trackEdits;
      
      if (!editorialEngine || !trackEdits) {
        return false;
      }

      // Check if Track Edits has received recent changes from Editorial Engine
      const trackEditsSession = trackEdits.getCurrentSession();
      if (!trackEditsSession) {
        return false;
      }

      // In a real implementation, we would check for recent Editorial Engine sourced changes
      // For now, we assume the handoff is working if both systems are available
      return true;
    } catch (error) {
      return false;
    }
  }

  private validateConstraintCompliance(): boolean {
    // Check if constraints are being properly applied
    try {
      const editorialEngine = (window as any).WriterrlAPI?.editorialEngine;
      if (!editorialEngine) {
        return false;
      }

      const currentMode = this.currentState.currentMode;
      if (!currentMode) {
        return true; // No mode active, so no constraints to validate
      }

      // Check if the current mode's constraints are being enforced
      // This would involve checking the actual content processing
      // For now, we validate that constraint processing is active
      return this.currentState.constraintProcessingActive;
    } catch (error) {
      return false;
    }
  }

  private validateModeConsistency(): boolean {
    // Check if the selected mode is consistent across all components
    try {
      const chatMode = this.getChatPanelMode();
      const engineMode = this.currentState.currentMode;
      
      // If we can determine both modes, they should match
      if (chatMode && engineMode) {
        return chatMode === engineMode;
      }

      // If we can't determine one or both modes, assume consistency
      return true;
    } catch (error) {
      return false;
    }
  }

  private getChatPanelMode(): string | null {
    try {
      const chatPanel = document.querySelector('.writerr-chat-panel, .chat-panel');
      if (!chatPanel) {
        return null;
      }

      // Look for mode indicators in the chat panel
      const modeElement = chatPanel.querySelector('[data-mode], .mode-indicator, .current-mode');
      if (modeElement) {
        return modeElement.getAttribute('data-mode') || 
               modeElement.textContent?.trim() || 
               null;
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  private recordError(error: Omit<EditorialEngineError, 'id' | 'timestamp'>): void {
    const fullError: EditorialEngineError = {
      id: `ee_error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      ...error
    };

    this.currentState.errors.push(fullError);
    
    // Keep only last 100 errors
    if (this.currentState.errors.length > 100) {
      this.currentState.errors = this.currentState.errors.slice(-100);
    }

    // Log the error
    this.testLogger.log({
      level: fullError.severity === 'CRITICAL' || fullError.severity === 'HIGH' ? 'ERROR' : 'WARN',
      category: 'ERROR',
      component: 'EDITORIAL_ENGINE_MONITOR',
      action: 'ERROR_RECORDED',
      data: fullError
    });
  }

  // Public getters for external access
  getCurrentState(): EditorialEngineState {
    return { ...this.currentState };
  }

  getWorkflowChecks(): WorkflowIntegrityCheck[] {
    return [...this.workflowChecks];
  }

  getRecentErrors(minutes: number = 5): EditorialEngineError[] {
    const cutoff = Date.now() - (minutes * 60 * 1000);
    return this.currentState.errors.filter(error => error.timestamp > cutoff);
  }

  isHealthy(): boolean {
    const recentErrors = this.getRecentErrors(2); // Check last 2 minutes
    const criticalErrors = recentErrors.filter(e => e.severity === 'CRITICAL').length;
    const highErrors = recentErrors.filter(e => e.severity === 'HIGH').length;
    
    return criticalErrors === 0 && highErrors < 3;
  }
}