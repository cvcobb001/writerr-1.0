/**
 * Visual State Monitor - Captures UI state for visual-console correlation
 * Addresses the critical gap where console shows success but UI shows visual bugs
 * like duplicate processing (~whenwhen~ -> iiff)
 */

import { TestLogger, VisualState, EditHighlight, DocumentState } from './test-logger';

export interface VisualMonitoringConfig {
  captureInterval: number; // ms
  observeDOM: boolean;
  captureSidePanel: boolean;
  captureDecorations: boolean;
  maxCaptureHistory: number;
}

export interface VisualStateCapture {
  timestamp: number;
  state: VisualState;
  changeType: 'periodic' | 'mutation' | 'manual';
  correlationId?: string;
}

export class VisualStateMonitor {
  private testLogger: TestLogger;
  private config: VisualMonitoringConfig;
  private observer: MutationObserver | null = null;
  private captureInterval: NodeJS.Timer | null = null;
  private isActive: boolean = false;
  private captureHistory: VisualStateCapture[] = [];
  private lastCapturedState: VisualState | null = null;

  constructor(testLogger: TestLogger, config: Partial<VisualMonitoringConfig> = {}) {
    this.testLogger = testLogger;
    this.config = {
      captureInterval: 1000, // 1 second
      observeDOM: true,
      captureSidePanel: true,
      captureDecorations: true,
      maxCaptureHistory: 100,
      ...config
    };
  }

  startMonitoring(): void {
    if (this.isActive) {
      console.warn('[VisualStateMonitor] Already active, ignoring start request');
      return;
    }

    this.isActive = true;

    // Setup DOM observer if enabled
    if (this.config.observeDOM) {
      this.setupDOMObserver();
    }

    // Setup periodic capture if enabled
    if (this.config.captureInterval > 0) {
      this.setupPeriodicCapture();
    }

    this.testLogger.log({
      level: 'INFO',
      category: 'STATE',
      component: 'VISUAL_STATE_MONITOR',
      action: 'MONITORING_STARTED',
      data: { config: this.config }
    });

    console.log('[VisualStateMonitor] Visual state monitoring started');
  }

  stopMonitoring(): void {
    if (!this.isActive) {
      return;
    }

    this.isActive = false;

    // Stop DOM observer
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }

    // Stop periodic capture
    if (this.captureInterval) {
      clearInterval(this.captureInterval);
      this.captureInterval = null;
    }

    this.testLogger.log({
      level: 'INFO',
      category: 'STATE',
      component: 'VISUAL_STATE_MONITOR',
      action: 'MONITORING_STOPPED',
      data: { capturesTotal: this.captureHistory.length }
    });

    console.log('[VisualStateMonitor] Visual state monitoring stopped');
  }

  captureCurrentState(changeType: 'periodic' | 'mutation' | 'manual' = 'manual', correlationId?: string): VisualState {
    const state: VisualState = {
      sidePanelVisible: this.isSidePanelVisible(),
      sidePanelContent: this.getSidePanelContent(),
      editHighlights: this.getActiveEditHighlights(),
      ribbonState: this.getRibbonState(),
      documentState: this.getDocumentState(),
      timestamp: Date.now()
    };

    // Store capture in history
    const capture: VisualStateCapture = {
      timestamp: state.timestamp,
      state,
      changeType,
      correlationId
    };

    this.captureHistory.push(capture);

    // Manage history size
    if (this.captureHistory.length > this.config.maxCaptureHistory) {
      this.captureHistory.splice(0, this.captureHistory.length - this.config.maxCaptureHistory);
    }

    // Check for visual changes and log if significant
    if (this.hasSignificantChange(state)) {
      this.testLogger.log({
        level: 'INFO',
        category: 'UI',
        component: 'VISUAL_STATE_MONITOR',
        action: 'STATE_CAPTURED',
        data: {
          changeType,
          state,
          previousState: this.lastCapturedState
        },
        correlationId,
        visualContext: state
      });

      // Check for potential issues
      this.analyzeStateForIssues(state, correlationId);
    }

    this.lastCapturedState = state;
    return state;
  }

  private setupDOMObserver(): void {
    try {
      this.observer = new MutationObserver((mutations) => {
        // Filter for relevant mutations
        const relevantMutations = mutations.filter(mutation => 
          this.isRelevantMutation(mutation)
        );

        if (relevantMutations.length > 0) {
          const correlationId = TestLogger.generateCorrelationId();
          
          this.testLogger.log({
            level: 'DEBUG',
            category: 'UI',
            component: 'DOM_OBSERVER',
            action: 'DOM_MUTATIONS',
            data: {
              mutationCount: relevantMutations.length,
              mutations: relevantMutations.map(m => ({
                type: m.type,
                target: m.target.nodeName,
                addedNodes: m.addedNodes.length,
                removedNodes: m.removedNodes.length
              }))
            },
            correlationId
          });

          // Capture state after DOM changes
          this.captureCurrentState('mutation', correlationId);
        }
      });

      // Observe document body with comprehensive options
      this.observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class', 'style', 'data-edit-id', 'aria-label'],
        characterData: false // Avoid text content changes to reduce noise
      });
    } catch (error) {
      console.error('[VisualStateMonitor] Failed to setup DOM observer:', error);
    }
  }

  private setupPeriodicCapture(): void {
    this.captureInterval = setInterval(() => {
      if (this.isActive) {
        this.captureCurrentState('periodic');
      }
    }, this.config.captureInterval);
  }

  private isRelevantMutation(mutation: MutationRecord): boolean {
    const target = mutation.target as Element;
    
    // Check for Track Edits related changes
    if (target.classList && (
      target.classList.contains('track-edits-decoration') ||
      target.classList.contains('track-edits-side-panel') ||
      target.classList.contains('track-edits-enabled') ||
      target.classList.contains('track-edits-disabled')
    )) {
      return true;
    }

    // Check for side panel changes
    if (target.closest && target.closest('.workspace-leaf-content[data-type="track-edits-side-panel"]')) {
      return true;
    }

    // Check for ribbon icon changes
    if (target.classList && target.classList.contains('side-dock-ribbon-action')) {
      return true;
    }

    // Check for editor view changes
    if (target.classList && (
      target.classList.contains('cm-editor') ||
      target.classList.contains('cm-content') ||
      target.classList.contains('cm-line')
    )) {
      return true;
    }

    return false;
  }

  private isSidePanelVisible(): boolean {
    try {
      const sidePanelLeaf = document.querySelector('.workspace-leaf-content[data-type="track-edits-side-panel"]');
      return sidePanelLeaf !== null && !sidePanelLeaf.closest('.workspace-leaf').classList.contains('mod-hidden');
    } catch (error) {
      return false;
    }
  }

  private getSidePanelContent(): string {
    try {
      const sidePanelElement = document.querySelector('.workspace-leaf-content[data-type="track-edits-side-panel"]');
      if (!sidePanelElement) return '';

      // Get the inner content, sanitized
      const content = sidePanelElement.textContent || '';
      return content.substring(0, 2000); // Limit size to prevent huge captures
    } catch (error) {
      return `[Error capturing side panel: ${error.message}]`;
    }
  }

  private getActiveEditHighlights(): EditHighlight[] {
    try {
      const highlights: EditHighlight[] = [];
      
      // Find all Track Edits decorations in the document
      const insertDecorations = document.querySelectorAll('.track-edits-decoration-insert');
      const deleteDecorations = document.querySelectorAll('.track-edits-decoration-delete');

      // Process insertion decorations
      insertDecorations.forEach((element) => {
        const editId = element.getAttribute('data-edit-id');
        if (editId) {
          // Try to determine position from CodeMirror
          const range = this.getElementTextRange(element);
          highlights.push({
            id: editId,
            type: 'insert',
            from: range?.from || 0,
            to: range?.to || 0,
            text: element.textContent || ''
          });
        }
      });

      // Process deletion decorations (widgets)
      deleteDecorations.forEach((element) => {
        const editId = element.getAttribute('data-edit-id');
        if (editId) {
          const range = this.getElementTextRange(element);
          highlights.push({
            id: editId,
            type: 'delete',
            from: range?.from || 0,
            to: range?.to || 0,
            removedText: element.textContent || ''
          });
        }
      });

      return highlights;
    } catch (error) {
      this.testLogger.log({
        level: 'WARN',
        category: 'ERROR',
        component: 'VISUAL_STATE_MONITOR',
        action: 'HIGHLIGHT_CAPTURE_ERROR',
        data: { error: error.message }
      });
      return [];
    }
  }

  private getElementTextRange(element: Element): { from: number; to: number } | null {
    try {
      // This would need CodeMirror integration to get accurate positions
      // For now, return a placeholder that can be enhanced later
      return { from: 0, to: 0 };
    } catch (error) {
      return null;
    }
  }

  private getRibbonState(): 'active' | 'inactive' {
    try {
      const ribbonIcon = document.querySelector('[aria-label*="Track Edits"]');
      if (!ribbonIcon) return 'inactive';

      // Check if the ribbon icon indicates active state
      const isActive = ribbonIcon.classList.contains('track-edits-enabled') ||
                      ribbonIcon.getAttribute('aria-label')?.includes('ON') ||
                      ribbonIcon.getAttribute('title')?.includes('ON');

      return isActive ? 'active' : 'inactive';
    } catch (error) {
      return 'inactive';
    }
  }

  private getDocumentState(): DocumentState {
    try {
      const activeFile = (window as any).app?.workspace.getActiveFile();
      
      return {
        filePath: activeFile?.path || 'unknown',
        wordCount: this.getWordCount(),
        characterCount: this.getCharacterCount(),
        hasUnsavedChanges: this.hasUnsavedChanges()
      };
    } catch (error) {
      return {
        filePath: 'error',
        wordCount: 0,
        characterCount: 0,
        hasUnsavedChanges: false
      };
    }
  }

  private getWordCount(): number {
    try {
      const activeView = (window as any).app?.workspace.getActiveViewOfType((window as any).MarkdownView);
      if (!activeView) return 0;
      
      const content = activeView.editor.getValue();
      return content.split(/\s+/).filter(word => word.length > 0).length;
    } catch (error) {
      return 0;
    }
  }

  private getCharacterCount(): number {
    try {
      const activeView = (window as any).app?.workspace.getActiveViewOfType((window as any).MarkdownView);
      if (!activeView) return 0;
      
      return activeView.editor.getValue().length;
    } catch (error) {
      return 0;
    }
  }

  private hasUnsavedChanges(): boolean {
    try {
      const activeFile = (window as any).app?.workspace.getActiveFile();
      return activeFile ? (window as any).app.vault.adapter.exists(activeFile.path) : false;
    } catch (error) {
      return false;
    }
  }

  private hasSignificantChange(newState: VisualState): boolean {
    if (!this.lastCapturedState) return true;

    const prev = this.lastCapturedState;
    
    // Check for significant changes
    return (
      prev.sidePanelVisible !== newState.sidePanelVisible ||
      prev.ribbonState !== newState.ribbonState ||
      prev.editHighlights.length !== newState.editHighlights.length ||
      prev.documentState.characterCount !== newState.documentState.characterCount ||
      Math.abs(prev.sidePanelContent.length - newState.sidePanelContent.length) > 50
    );
  }

  private analyzeStateForIssues(state: VisualState, correlationId?: string): void {
    // Check for duplicate highlights (the whenwhen->iiff issue)
    const duplicates = this.findDuplicateHighlights(state.editHighlights);
    if (duplicates.length > 0) {
      this.testLogger.log({
        level: 'WARN',
        category: 'ERROR',
        component: 'VISUAL_ISSUE_DETECTOR',
        action: 'DUPLICATE_HIGHLIGHTS_DETECTED',
        data: {
          duplicateCount: duplicates.length,
          duplicates,
          allHighlights: state.editHighlights,
          pattern: 'User visual issue - duplicate processing detected'
        },
        correlationId
      });
    }

    // Check for missing ribbon state consistency
    if (state.editHighlights.length > 0 && state.ribbonState === 'inactive') {
      this.testLogger.log({
        level: 'WARN',
        category: 'ERROR',
        component: 'VISUAL_ISSUE_DETECTOR',
        action: 'INCONSISTENT_RIBBON_STATE',
        data: {
          ribbonState: state.ribbonState,
          highlightCount: state.editHighlights.length,
          pattern: 'UI inconsistency - highlights present but ribbon shows inactive'
        },
        correlationId
      });
    }
  }

  private findDuplicateHighlights(highlights: EditHighlight[]): EditHighlight[] {
    const seen = new Map<string, EditHighlight>();
    const duplicates: EditHighlight[] = [];
    
    for (const highlight of highlights) {
      // Create key based on position and content
      const key = `${highlight.type}-${highlight.from}-${highlight.to}-${highlight.text || highlight.removedText}`;
      
      if (seen.has(key)) {
        duplicates.push(highlight);
      } else {
        seen.set(key, highlight);
      }
    }
    
    return duplicates;
  }

  // Public methods for external integration
  getCaptureHistory(): VisualStateCapture[] {
    return [...this.captureHistory];
  }

  getLastCapture(): VisualStateCapture | null {
    return this.captureHistory.length > 0 ? this.captureHistory[this.captureHistory.length - 1] : null;
  }

  forceCaptureNow(correlationId?: string): VisualState {
    return this.captureCurrentState('manual', correlationId);
  }

  // Export capture history for reporting
  exportCaptureHistory(): { captures: VisualStateCapture[]; summary: any } {
    return {
      captures: this.getCaptureHistory(),
      summary: {
        totalCaptures: this.captureHistory.length,
        captureTimespan: this.captureHistory.length > 0 ? 
          this.captureHistory[this.captureHistory.length - 1].timestamp - this.captureHistory[0].timestamp : 0,
        changeTypes: this.captureHistory.reduce((acc, capture) => {
          acc[capture.changeType] = (acc[capture.changeType] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      }
    };
  }
}