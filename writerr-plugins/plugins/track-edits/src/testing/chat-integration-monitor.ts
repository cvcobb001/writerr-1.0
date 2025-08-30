// Chat Integration Failure Detection Monitor
// Monitors Chat panel integration with Editorial Engine and Track Edits
// Detects when "Go ahead and add that to document" workflow breaks

import { TestLogger, TestLogEntry } from './test-logger';

export interface ChatIntegrationState {
  chatPanelVisible: boolean;
  activeChatSession: string | null;
  lastUserMessage: string | null;
  lastAIResponse: string | null;
  lastMessageTimestamp: number;
  awaitingDocumentIntegration: boolean;
  documentIntegrationFailures: DocumentIntegrationFailure[];
}

export interface DocumentIntegrationFailure {
  id: string;
  type: 'BYPASS_ENGINE' | 'MISSING_TRACK_EDITS' | 'WORKFLOW_BREAK' | 'AI_DIRECT_RESPONSE';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  timestamp: number;
  context: {
    userRequest?: string;
    aiResponse?: string;
    expectedPath: string;
    actualPath: string;
    missingComponent: string[];
  };
}

export interface ChatWorkflowValidation {
  userRequestDetected: boolean;
  editorialEngineInvoked: boolean;
  trackEditsReceived: boolean;
  documentUpdated: boolean;
  workflowComplete: boolean;
  timestamp: number;
  duration: number;
  issues: string[];
}

export class ChatIntegrationMonitor {
  private testLogger: TestLogger;
  private isMonitoring = false;
  private currentState: ChatIntegrationState;
  private monitoringInterval: NodeJS.Timer | null = null;
  private workflowValidations: ChatWorkflowValidation[] = [];
  private pendingWorkflows = new Map<string, { startTime: number; userRequest: string }>();
  
  constructor(testLogger: TestLogger) {
    this.testLogger = testLogger;
    this.currentState = {
      chatPanelVisible: false,
      activeChatSession: null,
      lastUserMessage: null,
      lastAIResponse: null,
      lastMessageTimestamp: 0,
      awaitingDocumentIntegration: false,
      documentIntegrationFailures: []
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
      component: 'CHAT_INTEGRATION_MONITOR',
      action: 'START_MONITORING',
      data: { timestamp: Date.now() }
    });

    // Set up periodic monitoring
    this.monitoringInterval = setInterval(() => {
      this.performPeriodicCheck();
    }, 1000); // Check every second for chat integration

    // Set up chat panel monitoring
    this.setupChatPanelMonitoring();
    
    // Set up document integration monitoring
    this.setupDocumentIntegrationMonitoring();
    
    // Set up AI response monitoring
    this.setupAIResponseMonitoring();
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
      component: 'CHAT_INTEGRATION_MONITOR',
      action: 'STOP_MONITORING',
      data: { 
        timestamp: Date.now(),
        totalFailures: this.currentState.documentIntegrationFailures.length,
        workflowValidations: this.workflowValidations.length
      }
    });
  }

  private setupChatPanelMonitoring(): void {
    // Monitor chat panel visibility and state changes
    const checkChatPanelState = () => {
      const chatPanel = document.querySelector('.writerr-chat-panel, .chat-panel, [data-chat-panel]');
      const isVisible = chatPanel && window.getComputedStyle(chatPanel).display !== 'none';
      
      if (isVisible !== this.currentState.chatPanelVisible) {
        this.testLogger.log({
          level: 'INFO',
          category: 'UI',
          component: 'CHAT_INTEGRATION_MONITOR',
          action: 'CHAT_PANEL_VISIBILITY_CHANGE',
          data: {
            wasVisible: this.currentState.chatPanelVisible,
            isVisible,
            timestamp: Date.now()
          }
        });
        this.currentState.chatPanelVisible = !!isVisible;
      }

      if (isVisible) {
        this.checkForNewMessages(chatPanel);
        this.checkForDocumentIntegrationRequests(chatPanel);
      }
    };

    // Set up DOM observer for chat panel changes
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          this.analyzeNewChatContent(mutation);
        }
      }
    });

    // Observe chat panel area
    const chatPanel = document.querySelector('.writerr-chat-panel, .chat-panel, [data-chat-panel]');
    if (chatPanel) {
      observer.observe(chatPanel, { childList: true, subtree: true });
    }

    // Also observe the entire document for dynamically created chat panels
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'data-chat-panel', 'data-visible']
    });

    // Check immediately and then periodically
    checkChatPanelState();
    setInterval(checkChatPanelState, 1000);
  }

  private setupDocumentIntegrationMonitoring(): void {
    // Monitor for "add to document" workflow triggers
    this.interceptDocumentUpdateAPI();
    this.monitorEditorialEngineHandoff();
    this.monitorTrackEditsIntegration();
  }

  private setupAIResponseMonitoring(): void {
    // Monitor AI responses for bypass indicators
    const originalFetch = window.fetch;
    window.fetch = async (...args: Parameters<typeof fetch>) => {
      const response = await originalFetch.apply(window, args);
      
      // Check if this is an AI API request
      const url = args[0]?.toString() || '';
      if (url.includes('openai.com') || url.includes('claude.ai') || url.includes('api/chat')) {
        this.analyzeAIAPIResponse(url, response.clone());
      }

      return response;
    };
  }

  private checkForNewMessages(chatPanel: Element): void {
    // Look for new messages in the chat panel
    const messages = chatPanel.querySelectorAll('.message, .chat-message, [data-message]');
    const lastMessage = messages[messages.length - 1];
    
    if (lastMessage) {
      const messageText = lastMessage.textContent?.trim() || '';
      const isUserMessage = lastMessage.classList.contains('user-message') || 
                           lastMessage.classList.contains('user') ||
                           lastMessage.getAttribute('data-role') === 'user';
      
      const currentTime = Date.now();
      
      if (isUserMessage && messageText !== this.currentState.lastUserMessage) {
        this.currentState.lastUserMessage = messageText;
        this.currentState.lastMessageTimestamp = currentTime;
        
        // Check if this is a document integration request
        if (this.isDocumentIntegrationRequest(messageText)) {
          this.currentState.awaitingDocumentIntegration = true;
          const workflowId = `workflow_${currentTime}`;
          this.pendingWorkflows.set(workflowId, {
            startTime: currentTime,
            userRequest: messageText
          });
          
          this.testLogger.log({
            level: 'INFO',
            category: 'EVENT',
            component: 'CHAT_INTEGRATION_MONITOR',
            action: 'DOCUMENT_INTEGRATION_REQUEST',
            data: {
              message: messageText,
              workflowId,
              timestamp: currentTime
            }
          });
        }
      } else if (!isUserMessage && messageText !== this.currentState.lastAIResponse) {
        this.currentState.lastAIResponse = messageText;
        this.currentState.lastMessageTimestamp = currentTime;
        
        // Check if this AI response indicates a bypass
        if (this.detectsEditorialEngineBypass(messageText)) {
          this.recordIntegrationFailure({
            type: 'BYPASS_ENGINE',
            severity: 'HIGH',
            message: 'AI response indicates Editorial Engine bypass',
            context: {
              aiResponse: messageText,
              expectedPath: 'Chat → Editorial Engine → Track Edits',
              actualPath: 'Chat → Direct AI Response',
              missingComponent: ['Editorial Engine']
            }
          });
        }
      }
    }
  }

  private checkForDocumentIntegrationRequests(chatPanel: Element): void {
    // Look for "add to document" buttons or similar integration triggers
    const integrationButtons = chatPanel.querySelectorAll(
      'button[data-action="add-to-document"], .add-to-doc-btn, .integrate-btn, [data-integrate]'
    );

    for (const button of integrationButtons) {
      if (button instanceof HTMLElement && button.style.display !== 'none') {
        // Check if clicking this button would trigger the expected workflow
        this.validateIntegrationButtonWorkflow(button);
      }
    }
  }

  private analyzeNewChatContent(mutation: MutationRecord): void {
    const addedNodes = Array.from(mutation.addedNodes);
    for (const node of addedNodes) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as Element;
        const text = element.textContent?.toLowerCase() || '';
        
        // Check for error messages indicating integration failures
        if (text.includes('could not add to document') ||
            text.includes('integration failed') ||
            text.includes('editorial engine unavailable') ||
            text.includes('track edits not responding')) {
          this.recordIntegrationFailure({
            type: 'WORKFLOW_BREAK',
            severity: 'HIGH',
            message: 'Chat panel error message indicates integration failure',
            context: {
              aiResponse: element.textContent || '',
              expectedPath: 'Chat → Editorial Engine → Track Edits → Document',
              actualPath: 'Chat → Error',
              missingComponent: ['Integration pathway']
            }
          });
        }

        // Check for direct AI responses that should have gone through Editorial Engine
        if (element.classList.contains('ai-message') || element.classList.contains('assistant-message')) {
          const responseText = element.textContent || '';
          if (this.shouldHaveUsedEditorialEngine(responseText)) {
            this.recordIntegrationFailure({
              type: 'AI_DIRECT_RESPONSE',
              severity: 'MEDIUM',
              message: 'AI provided direct response that should have used Editorial Engine',
              context: {
                aiResponse: responseText,
                expectedPath: 'Chat → Editorial Engine → Constrained Response',
                actualPath: 'Chat → Direct AI Response',
                missingComponent: ['Editorial Engine Processing']
              }
            });
          }
        }
      }
    }
  }

  private interceptDocumentUpdateAPI(): void {
    // Intercept any document update APIs to monitor workflow completion
    const originalWriteFile = (window as any).app?.vault?.modify;
    if (originalWriteFile) {
      (window as any).app.vault.modify = async (file: any, data: any) => {
        this.testLogger.log({
          level: 'INFO',
          category: 'API',
          component: 'CHAT_INTEGRATION_MONITOR',
          action: 'DOCUMENT_UPDATE_DETECTED',
          data: {
            filename: file?.name || 'unknown',
            timestamp: Date.now()
          }
        });

        // Check if this update corresponds to a pending workflow
        this.validateWorkflowCompletion('DOCUMENT_UPDATE', { filename: file?.name, data });

        return originalWriteFile.call((window as any).app.vault, file, data);
      };
    }
  }

  private monitorEditorialEngineHandoff(): void {
    // Monitor Editorial Engine API calls that should be triggered by chat
    const editorialEngine = (window as any).WriterrlAPI?.editorialEngine;
    if (editorialEngine && editorialEngine.processJob) {
      const originalProcessJob = editorialEngine.processJob.bind(editorialEngine);
      editorialEngine.processJob = async (job: any) => {
        this.testLogger.log({
          level: 'INFO',
          category: 'API',
          component: 'CHAT_INTEGRATION_MONITOR',
          action: 'EDITORIAL_ENGINE_JOB_STARTED',
          data: {
            jobId: job?.id,
            jobType: job?.type,
            fromChat: job?.metadata?.source === 'chat',
            timestamp: Date.now()
          }
        });

        this.validateWorkflowCompletion('EDITORIAL_ENGINE_PROCESSING', job);

        return originalProcessJob(job);
      };
    }
  }

  private monitorTrackEditsIntegration(): void {
    // Monitor Track Edits receiving changes from Editorial Engine
    const trackEdits = (window as any).WriterrlAPI?.trackEdits;
    if (trackEdits && trackEdits.addEdit) {
      const originalAddEdit = trackEdits.addEdit.bind(trackEdits);
      trackEdits.addEdit = (edit: any) => {
        this.testLogger.log({
          level: 'INFO',
          category: 'API',
          component: 'CHAT_INTEGRATION_MONITOR',
          action: 'TRACK_EDITS_CHANGE_RECEIVED',
          data: {
            editId: edit?.id,
            author: edit?.author,
            fromEditorialEngine: edit?.metadata?.provenance === 'editorial-engine',
            timestamp: Date.now()
          }
        });

        this.validateWorkflowCompletion('TRACK_EDITS_INTEGRATION', edit);

        return originalAddEdit(edit);
      };
    }
  }

  private performPeriodicCheck(): void {
    // Check for stalled workflows
    const now = Date.now();
    const stalledThreshold = 30000; // 30 seconds

    for (const [workflowId, workflow] of this.pendingWorkflows) {
      const duration = now - workflow.startTime;
      if (duration > stalledThreshold) {
        this.recordIntegrationFailure({
          type: 'WORKFLOW_BREAK',
          severity: 'HIGH',
          message: 'Workflow stalled - no completion detected within timeout',
          context: {
            userRequest: workflow.userRequest,
            expectedPath: 'Chat → Editorial Engine → Track Edits → Document',
            actualPath: 'Chat → Timeout',
            missingComponent: ['Workflow completion']
          }
        });

        this.pendingWorkflows.delete(workflowId);
      }
    }

    // Clean up old pending workflows (older than 5 minutes)
    const cleanupThreshold = 5 * 60 * 1000;
    for (const [workflowId, workflow] of this.pendingWorkflows) {
      if (now - workflow.startTime > cleanupThreshold) {
        this.pendingWorkflows.delete(workflowId);
      }
    }
  }

  private isDocumentIntegrationRequest(message: string): boolean {
    const lowerMessage = message.toLowerCase();
    const integrationKeywords = [
      'add to document',
      'add that to the document',
      'put that in the doc',
      'integrate this',
      'apply these changes',
      'make these edits',
      'update the document',
      'go ahead and add'
    ];

    return integrationKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  private detectsEditorialEngineBypass(aiResponse: string): boolean {
    const lowerResponse = aiResponse.toLowerCase();
    
    // Look for responses that should have been processed through Editorial Engine
    const bypassIndicators = [
      'i\'ll help you directly',
      'here\'s the content',
      'let me provide',
      'i can assist with that',
      // But NOT if it mentions Editorial Engine
      'editorial engine'
    ];

    const containsBypassIndicator = bypassIndicators.slice(0, -1).some(indicator => 
      lowerResponse.includes(indicator));
    const mentionsEditorialEngine = lowerResponse.includes('editorial engine');

    return containsBypassIndicator && !mentionsEditorialEngine;
  }

  private shouldHaveUsedEditorialEngine(aiResponse: string): boolean {
    const lowerResponse = aiResponse.toLowerCase();
    
    // Check if this response contains content that should have been processed through Editorial Engine
    const contentIndicators = [
      'here\'s the revised',
      'here\'s the edited',
      'i\'ve made the changes',
      'the corrected version',
      'here\'s the improvement'
    ];

    return contentIndicators.some(indicator => lowerResponse.includes(indicator));
  }

  private validateIntegrationButtonWorkflow(button: HTMLElement): void {
    // Check if the integration button has proper event handlers
    const hasClickHandler = button.onclick !== null || 
                           button.addEventListener !== undefined ||
                           button.getAttribute('data-action') !== null;

    if (!hasClickHandler) {
      this.recordIntegrationFailure({
        type: 'WORKFLOW_BREAK',
        severity: 'MEDIUM',
        message: 'Integration button found without proper event handlers',
        context: {
          expectedPath: 'Button Click → Editorial Engine → Track Edits',
          actualPath: 'Button Click → No Action',
          missingComponent: ['Event Handlers']
        }
      });
    }
  }

  private async analyzeAIAPIResponse(url: string, response: Response): Promise<void> {
    try {
      const responseText = await response.text();
      
      // Check if this AI response was routed through Editorial Engine
      const wasProcessedByEngine = responseText.includes('editorial-engine') ||
                                  responseText.includes('constraint-processed') ||
                                  responseText.includes('mode-applied');

      if (!wasProcessedByEngine && this.currentState.awaitingDocumentIntegration) {
        this.recordIntegrationFailure({
          type: 'BYPASS_ENGINE',
          severity: 'HIGH',
          message: 'AI API response bypassed Editorial Engine during document integration',
          context: {
            apiUrl: url,
            expectedPath: 'Chat → Editorial Engine → AI API → Track Edits',
            actualPath: 'Chat → AI API → Direct Response',
            missingComponent: ['Editorial Engine Processing']
          }
        });
      }
    } catch (error) {
      // Failed to analyze response, log but don't fail
      this.testLogger.log({
        level: 'WARN',
        category: 'ERROR',
        component: 'CHAT_INTEGRATION_MONITOR',
        action: 'RESPONSE_ANALYSIS_FAILED',
        data: { url, error: error.message }
      });
    }
  }

  private validateWorkflowCompletion(stage: string, data: any): void {
    // Check if this event corresponds to completing a pending workflow
    const now = Date.now();
    
    for (const [workflowId, workflow] of this.pendingWorkflows) {
      const validation: ChatWorkflowValidation = {
        userRequestDetected: true, // We wouldn't have the workflow without this
        editorialEngineInvoked: stage.includes('EDITORIAL_ENGINE'),
        trackEditsReceived: stage.includes('TRACK_EDITS'),
        documentUpdated: stage.includes('DOCUMENT_UPDATE'),
        workflowComplete: stage.includes('DOCUMENT_UPDATE'),
        timestamp: now,
        duration: now - workflow.startTime,
        issues: []
      };

      if (validation.workflowComplete) {
        // Remove from pending workflows
        this.pendingWorkflows.delete(workflowId);
        
        // Check for issues in the workflow
        if (!validation.editorialEngineInvoked) {
          validation.issues.push('Editorial Engine was not invoked');
        }
        if (!validation.trackEditsReceived) {
          validation.issues.push('Track Edits did not receive changes');
        }
        
        this.workflowValidations.push(validation);
        
        // Keep only last 50 validations
        if (this.workflowValidations.length > 50) {
          this.workflowValidations = this.workflowValidations.slice(-50);
        }

        this.testLogger.log({
          level: validation.issues.length > 0 ? 'WARN' : 'INFO',
          category: 'EVENT',
          component: 'CHAT_INTEGRATION_MONITOR',
          action: 'WORKFLOW_COMPLETED',
          data: { workflowId, validation }
        });

        // Record failures for incomplete workflows
        if (validation.issues.length > 0) {
          this.recordIntegrationFailure({
            type: 'WORKFLOW_BREAK',
            severity: 'HIGH',
            message: 'Workflow completed with issues',
            context: {
              userRequest: workflow.userRequest,
              expectedPath: 'Chat → Editorial Engine → Track Edits → Document',
              actualPath: `Chat → ${validation.issues.join(', ')} → Document`,
              missingComponent: validation.issues
            }
          });
        }

        break; // Only complete one workflow per event
      }
    }
  }

  private recordIntegrationFailure(failure: Omit<DocumentIntegrationFailure, 'id' | 'timestamp'>): void {
    const fullFailure: DocumentIntegrationFailure = {
      id: `chat_failure_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      ...failure
    };

    this.currentState.documentIntegrationFailures.push(fullFailure);
    
    // Keep only last 100 failures
    if (this.currentState.documentIntegrationFailures.length > 100) {
      this.currentState.documentIntegrationFailures = this.currentState.documentIntegrationFailures.slice(-100);
    }

    // Log the failure
    this.testLogger.log({
      level: fullFailure.severity === 'CRITICAL' || fullFailure.severity === 'HIGH' ? 'ERROR' : 'WARN',
      category: 'ERROR',
      component: 'CHAT_INTEGRATION_MONITOR',
      action: 'INTEGRATION_FAILURE_RECORDED',
      data: fullFailure
    });
  }

  // Public getters for external access
  getCurrentState(): ChatIntegrationState {
    return { ...this.currentState };
  }

  getWorkflowValidations(): ChatWorkflowValidation[] {
    return [...this.workflowValidations];
  }

  getRecentFailures(minutes: number = 5): DocumentIntegrationFailure[] {
    const cutoff = Date.now() - (minutes * 60 * 1000);
    return this.currentState.documentIntegrationFailures.filter(failure => failure.timestamp > cutoff);
  }

  getPendingWorkflowCount(): number {
    return this.pendingWorkflows.size;
  }

  isHealthy(): boolean {
    const recentFailures = this.getRecentFailures(2); // Check last 2 minutes
    const criticalFailures = recentFailures.filter(f => f.severity === 'CRITICAL').length;
    const highFailures = recentFailures.filter(f => f.severity === 'HIGH').length;
    
    return criticalFailures === 0 && highFailures < 2 && this.pendingWorkflows.size < 5;
  }
}