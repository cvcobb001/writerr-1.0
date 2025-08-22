import { Plugin, MarkdownView, Editor, EditorChange, TFile, WorkspaceLeaf, ItemView } from 'obsidian';
import { StateField, StateEffect, Transaction, ChangeSpec } from '@codemirror/state';
import { EditorView, ViewUpdate, ViewPlugin, Decoration, DecorationSet, WidgetType } from '@codemirror/view';
import { TrackEditsSettingsTab } from './settings';
import { EditTracker } from './edit-tracker';
import { EditRenderer } from './edit-renderer';
import { EditSidePanelView } from './side-panel-view';
import { EditClusterManager } from './edit-cluster-manager';
import { EditSession, EditChange, WriterrlGlobalAPI } from '../../../shared/types';
import { generateId, debounce } from '../../../shared/utils';

interface TrackEditsSettings {
  enableTracking: boolean;
  showLineNumbers: boolean;
  highlightChanges: boolean;
  retentionDays: number;
  colorScheme: 'default' | 'colorblind' | 'dark';
  autoSave: boolean;
  exportFormat: 'json' | 'csv' | 'markdown';
  enableClustering: boolean;
  clusterTimeWindow: number;
  showSidePanelOnStart: boolean;
}

const DEFAULT_SETTINGS: TrackEditsSettings = {
  enableTracking: true,
  showLineNumbers: true,
  highlightChanges: true,
  retentionDays: 30,
  colorScheme: 'default',
  autoSave: true,
  exportFormat: 'json',
  enableClustering: true,
  clusterTimeWindow: 2000,
  showSidePanelOnStart: true
};

// Development monitoring - remove before production
const DEBUG_MODE = true;
const PERF_MONITOR = true;

class DebugMonitor {
  private static logs: { timestamp: number; type: string; data: any }[] = [];
  private static perfCounters = new Map<string, { count: number; totalTime: number; maxTime: number }>();
  
  static log(type: string, data: any) {
    if (!DEBUG_MODE) return;
    this.logs.push({ timestamp: Date.now(), type, data });
    
    // Log with expanded object details for better visibility
    console.log(`[Track Edits ${type}]`, JSON.stringify(data, null, 2));
    
    // Keep only last 1000 logs
    if (this.logs.length > 1000) {
      this.logs.splice(0, 500);
    }
  }
  
  static startTimer(name: string) {
    if (!PERF_MONITOR) return null;
    return { name, start: performance.now() };
  }
  
  static endTimer(timer: { name: string; start: number } | null) {
    if (!timer || !PERF_MONITOR) return;
    const duration = performance.now() - timer.start;
    
    const counter = this.perfCounters.get(timer.name) || { count: 0, totalTime: 0, maxTime: 0 };
    counter.count++;
    counter.totalTime += duration;
    counter.maxTime = Math.max(counter.maxTime, duration);
    this.perfCounters.set(timer.name, counter);
    
    if (duration > 16) {
      console.warn(`[Track Edits PERF] ${timer.name} took ${duration.toFixed(2)}ms (>16ms target)`);
    }
  }
  
  static getReport() {
    return {
      recentLogs: this.logs.slice(-50),
      perfStats: Object.fromEntries(this.perfCounters.entries()),
      summary: {
        totalLogs: this.logs.length,
        perfCounters: this.perfCounters.size,
        slowOperations: Array.from(this.perfCounters.entries())
          .filter(([_, stats]) => stats.maxTime > 16)
          .map(([name, stats]) => ({ name, maxTime: stats.maxTime, avgTime: stats.totalTime / stats.count }))
      }
    };
  }
  
  static clear() {
    this.logs = [];
    this.perfCounters.clear();
  }
}

// Global state for CodeMirror integration
let currentPluginInstance: TrackEditsPlugin | null = null;
let isRejectingEdit = false;

// DEBUG: Add global access for debugging
if (DEBUG_MODE) {
  (window as any).TrackEditsDebug = {
    getReport: () => DebugMonitor.getReport(),
    clearLogs: () => DebugMonitor.clear(),
    getCurrentState: () => ({
      currentPluginInstance: !!currentPluginInstance,
      isRejectingEdit,
      currentEdits: currentPluginInstance?.currentEdits?.length || 0,
      hasSession: !!currentPluginInstance?.currentSession
    }),
    logCurrent: () => {
      const state = (window as any).TrackEditsDebug.getCurrentState();
      console.log('[Track Edits Debug]', state);
      return state;
    }
  };
  console.log('[Track Edits] Debug mode enabled. Access via window.TrackEditsDebug');
}

// State effects for decoration management
const addDecorationEffect = StateEffect.define<{edit: EditChange, decoration: Decoration}>();
const removeDecorationEffect = StateEffect.define<string>(); // edit ID

// Custom widget for showing deleted text
class DeletionWidget extends WidgetType {
  public editId: string; // Make public for StateField access
  
  constructor(private deletedText: string, editId: string) {
    super();
    this.editId = editId; // Store as public property
  }
  
  toDOM(): HTMLElement {
    const span = document.createElement('span');
    span.className = 'track-edits-decoration track-edits-decoration-delete';
    span.textContent = this.deletedText;
    span.setAttribute('data-edit-id', this.editId);
    span.style.cssText = `
      color: #f85149;
      text-decoration: line-through;
      opacity: 0.7;
      background: transparent;
    `;
    return span;
  }
}

// Create decoration for edit visualization  
function createEditDecoration(edit: EditChange): Decoration {
  const attributes = { 'data-edit-id': edit.id };
  
  if (edit.type === 'insert') {
    return Decoration.mark({
      class: 'track-edits-decoration track-edits-decoration-insert',
      attributes: attributes
    });
  } else if (edit.type === 'delete') {
    return Decoration.widget({
      widget: new DeletionWidget(edit.removedText || '', edit.id),
      side: -1
    });
  }
  
  // Fallback
  return Decoration.mark({ 
    class: 'track-edits-decoration track-edits-decoration-insert', 
    attributes 
  });
}

// StateField for managing decorations
const editDecorationField = StateField.define<DecorationSet>({
  create() {
    DebugMonitor.log('STATEFIELD_CREATE', { message: 'StateField created with empty decoration set' });
    return Decoration.none;
  },
  update(decorations, tr) {
    const timer = DebugMonitor.startTimer('StateField.update');
    
    const initialSize = decorations.size;
    DebugMonitor.log('STATEFIELD_UPDATE_START', {
      hasChanges: !!tr.changes,
      changeCount: tr.changes ? tr.changes.desc.length : 0,
      effectCount: tr.effects.length,
      currentDecorations: initialSize,
      docLength: tr.newDoc.length
    });
    
    // Map existing decorations to new positions
    const mapTimer = DebugMonitor.startTimer('decorations.map');
    decorations = decorations.map(tr.changes);
    DebugMonitor.endTimer(mapTimer);
    
    let addedDecorations = 0;
    let removedDecorations = 0;
    
    // Process effects for new decorations
    for (const effect of tr.effects) {
      if (effect.is(addDecorationEffect)) {
        const { edit, decoration } = effect.value;
        
        DebugMonitor.log('ADD_DECORATION_EFFECT', {
          editId: edit.id,
          editType: edit.type,
          position: { from: edit.from, to: edit.to },
          textLength: edit.text?.length || 0
        });
        
        if (edit.type === 'delete') {
          // Widget decorations for deletions
          const pos = edit.from;
          decorations = decorations.update({
            add: [decoration.range(pos)]
          });
          addedDecorations++;
        } else if (edit.type === 'insert') {
          // Mark decorations for additions
          const start = edit.from;
          const end = start + (edit.text?.length || 0);
          
          if (end <= tr.newDoc.length && start <= end && start >= 0) {
            decorations = decorations.update({
              add: [decoration.range(start, end)]
            });
            addedDecorations++;
          } else {
            DebugMonitor.log('INVALID_DECORATION_POSITION', {
              editId: edit.id,
              start, end,
              docLength: tr.newDoc.length,
              reason: 'Position out of bounds'
            });
          }
        }
      } else if (effect.is(removeDecorationEffect)) {
        const editId = effect.value;
        DebugMonitor.log('REMOVE_DECORATION_EFFECT', { editId });
        
        decorations = decorations.update({
          filter: (from, to, decoration) => {
            const spec = (decoration as any).spec;
            if (spec?.attributes?.['data-edit-id'] === editId) {
              removedDecorations++;
              return false;
            }
            if (spec?.widget && spec.widget.editId === editId) {
              removedDecorations++;
              return false;
            }
            return true;
          }
        });
      }
    }
    
    const finalSize = decorations.size;
    DebugMonitor.log('STATEFIELD_UPDATE_END', {
      initialSize,
      finalSize,
      addedDecorations,
      removedDecorations,
      netChange: finalSize - initialSize
    });
    
    DebugMonitor.endTimer(timer);
    return decorations;
  },
  provide: f => EditorView.decorations.from(f)
});

// ViewPlugin for change detection
const changeDetectionPlugin = ViewPlugin.fromClass(class {
  constructor(private view: EditorView) {}
  
  update(update: ViewUpdate) {
    const timer = DebugMonitor.startTimer('ViewPlugin.update');
    
    DebugMonitor.log('UPDATE', {
      docChanged: update.docChanged,
      isRejectingEdit,
      hasPluginInstance: !!currentPluginInstance,
      changeCount: update.changes ? update.changes.desc.length : 0,
      viewportChanged: update.viewportChanged,
      focusChanged: update.focusChanged
    });
    
    if (update.docChanged && !isRejectingEdit && currentPluginInstance) {
      const extractTimer = DebugMonitor.startTimer('extractEditsFromUpdate');
      const edits = this.extractEditsFromUpdate(update);
      DebugMonitor.endTimer(extractTimer);
      
      DebugMonitor.log('EDITS_EXTRACTED', {
        editCount: edits.length,
        edits: edits.map(e => ({ id: e.id, type: e.type, from: e.from, to: e.to, textLength: e.text?.length || 0 }))
      });
      
      if (edits.length > 0) {
        // Add decorations immediately
        const decorationTimer = DebugMonitor.startTimer('createDecorations');
        const decorationEffects = edits.map(edit => {
          const decoration = createEditDecoration(edit);
          return addDecorationEffect.of({ edit, decoration });
        });
        DebugMonitor.endTimer(decorationTimer);
        
        DebugMonitor.log('DECORATIONS_CREATED', {
          effectCount: decorationEffects.length
        });
        
        requestAnimationFrame(() => {
          const dispatchTimer = DebugMonitor.startTimer('viewDispatch');
          this.view.dispatch({ effects: decorationEffects });
          DebugMonitor.endTimer(dispatchTimer);
          
          DebugMonitor.log('DECORATIONS_DISPATCHED', {
            effectCount: decorationEffects.length
          });
        });
        
        // Update plugin state
        currentPluginInstance.handleEditsFromCodeMirror(edits);
      }
    }
    
    DebugMonitor.endTimer(timer);
  }
  
  extractEditsFromUpdate(update: ViewUpdate): EditChange[] {
    const edits: EditChange[] = [];
    
    update.changes.iterChanges((from, to, fromB, toB, insert) => {
      const removedText = update.startState.doc.sliceString(from, to);
      const insertedText = insert.toString();
      
      // Create separate deletion and addition edits
      if (removedText) {
        edits.push({
          id: generateId(),
          type: 'delete',
          from: from,
          to: to,
          text: '',
          removedText: removedText,
          timestamp: Date.now()
        });
      }
      
      if (insertedText) {
        edits.push({
          id: generateId(),
          type: 'insert',
          from: fromB,
          to: toB,
          text: insertedText,
          removedText: '',
          timestamp: Date.now()
        });
      }
    });
    
    return edits;
  }
});

export default class TrackEditsPlugin extends Plugin {
  settings: TrackEditsSettings;
  editTracker: EditTracker;
  editRenderer: EditRenderer;
  clusterManager: EditClusterManager;
  sidePanelView: EditSidePanelView | null = null;
  currentSession: EditSession | null = null;
  currentEdits: EditChange[] = [];
  private currentEditorView: EditorView | null = null;
  private debouncedSave = debounce(() => this.saveCurrentSession(), 1000);
  private debouncedPanelUpdate = debounce(() => this.updateSidePanel(), 100);
  private debouncedRibbonClick = debounce(() => this.handleRibbonClick(), 300);
  private isProcessingChange = false;
  private isRestartingSession = false;
  private lastActiveFile: string | null = null;

  async onload() {
    await this.loadSettings();

    // Set global reference for CodeMirror integration
    currentPluginInstance = this;

    this.editTracker = new EditTracker(this);
    this.editRenderer = new EditRenderer(this);
    this.clusterManager = new EditClusterManager(this);

    // Initialize global API
    this.initializeGlobalAPI();

    // Register CodeMirror extensions for native integration
    this.registerEditorExtension([changeDetectionPlugin, editDecorationField]);

    // Register remaining safe event handlers
    this.registerSafeEventHandlers();
    
    // Register side panel view
    this.registerView('track-edits-side-panel', (leaf) => new EditSidePanelView(leaf, this));

    // Add commands
    this.addCommands();

    // Add settings tab
    this.addSettingTab(new TrackEditsSettingsTab(this.app, this));

    // Add ribbon icon
    this.addRibbonIcon();

    // Start tracking if enabled
    if (this.settings.enableTracking) {
      this.startTracking();
    }

    console.log('Track Edits v2.0 plugin loaded');
  }

  onunload() {
    try {
      this.stopTracking();
      this.cleanupGlobalAPI();
      console.log('Track Edits plugin unloaded');
    } catch (error) {
      console.error('Track Edits: Error during plugin unload:', error);
    }
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  private initializeGlobalAPI() {
    if (!window.WriterrlAPI) {
      window.WriterrlAPI = {} as WriterrlGlobalAPI;
    }

    window.WriterrlAPI.trackEdits = {
      getCurrentSession: () => this.currentSession,
      getSessionHistory: () => this.editTracker.getSessionHistory(),
      startTracking: () => this.startTracking(),
      stopTracking: () => this.stopTracking(),
      exportSession: (sessionId: string) => this.exportSession(sessionId)
    };
  }

  private cleanupGlobalAPI() {
    if (window.WriterrlAPI && window.WriterrlAPI.trackEdits) {
      delete window.WriterrlAPI.trackEdits;
    }
  }

  private registerSafeEventHandlers() {
    console.log('[Track Edits DEBUG] Registering event handlers');
    
    // CodeMirror ViewPlugin handles edit detection - no need for editor-change events
    
    // Handle active leaf changes with proper session state checking
    this.registerEvent(
      this.app.workspace.on('active-leaf-change', () => {
        if (this.isRestartingSession) return; // Prevent recursion during restart
        if (!this.settings || !this.settings.enableTracking) return;
        
        const activeFile = this.app.workspace.getActiveFile();
        const currentFilePath = activeFile?.path || null;
        
        // Only restart if we actually switched to a different file AND we have a session AND it's a real file change
        if (this.currentSession && 
            this.lastActiveFile !== currentFilePath && 
            this.lastActiveFile !== null && // Don't restart on initial load
            currentFilePath !== null) { // Don't restart when closing files
          
          console.log('Track Edits: File changed from', this.lastActiveFile, 'to', currentFilePath);
          this.lastActiveFile = currentFilePath;
          this.restartSession();
        } else if (!this.currentSession && 
                   activeFile && 
                   currentFilePath !== this.lastActiveFile && 
                   !this.isRestartingSession) {
          // Start tracking if no session exists and we have a file (but not during ribbon operations)
          console.log('Track Edits: Starting new session for file:', currentFilePath);
          this.lastActiveFile = currentFilePath;
          this.startTracking();
        }
      })
    );
  }
  
  private handleEditorChange(editor: Editor, info: MarkdownView | any) {
    console.log('[Track Edits DEBUG] handleEditorChange called');
    console.log('[Track Edits DEBUG] Editor:', editor);
    console.log('[Track Edits DEBUG] Info:', info);
    console.log('[Track Edits DEBUG] Current session:', this.currentSession);
    console.log('[Track Edits DEBUG] Settings enableTracking:', this.settings.enableTracking);
    
    const changes = this.extractChangesFromEditor(editor);
    console.log('[Track Edits DEBUG] Extracted changes:', changes);
    
    if (changes.length === 0) {
      console.log('[Track Edits DEBUG] No changes detected, returning early');
      return;
    }
    
    console.log('Track Edits v2.0: Recording', changes.length, 'changes');
    
    // Add to current edits array for clustering
    this.currentEdits.push(...changes);
    console.log('[Track Edits DEBUG] Current edits array length:', this.currentEdits.length);
    
    // Immediate decoration rendering
    console.log('[Track Edits DEBUG] About to call showChangeDecorations');
    this.editRenderer.showChangeDecorations(changes);
    console.log('[Track Edits DEBUG] Called showChangeDecorations');
    
    // Record changes in tracker
    this.editTracker.recordChanges(this.currentSession.id, changes);
    
    // Batched side panel update
    this.debouncedPanelUpdate();
    
    // Save session
    this.debouncedSave();
  }
  
  private updateSidePanel() {
    if (this.sidePanelView) {
      const clusters = this.clusterManager.clusterEdits(this.currentEdits);
      this.sidePanelView.updateClusters(clusters);
    }
  }

  private extractChangesFromEditor(editor: Editor): EditChange[] {
    console.log('[Track Edits DEBUG] extractChangesFromEditor called');
    
    // Get the last change from editor transaction
    const doc = editor.getDoc();
    const cursor = editor.getCursor();
    console.log('[Track Edits DEBUG] Cursor position:', cursor);
    
    const line = doc.getLine(cursor.line);
    console.log('[Track Edits DEBUG] Current line:', line);
    console.log('[Track Edits DEBUG] Line length:', line?.length);
    
    // Create a simple change record for demonstration
    // In production, you'd hook into CodeMirror's transaction system
    if (line && line.length > 0) {
      console.log('Track Edits v2.0: Detected editor change at line', cursor.line, 'position', cursor.ch);
      
      // Calculate document position (absolute position from start of document)
      const docPosition = editor.posToOffset(cursor);
      const fromPos = Math.max(0, docPosition - 1);
      const toPos = docPosition;
      
      const characterAtCursor = line.charAt(cursor.ch - 1) || '';
      console.log('[Track Edits DEBUG] Character at cursor:', characterAtCursor);
      console.log('[Track Edits DEBUG] Doc position:', docPosition);
      console.log('[Track Edits DEBUG] From pos:', fromPos, 'To pos:', toPos);
      
      const change = {
        id: generateId(),
        timestamp: Date.now(),
        type: 'insert' as const,
        from: fromPos,
        to: toPos,
        text: characterAtCursor,
        author: 'user'
      };
      
      console.log('[Track Edits DEBUG] Created change object:', change);
      return [change];
    }
    
    console.log('[Track Edits DEBUG] No valid line found, returning empty array');
    return [];
  }

  private addRibbonIcon() {
    super.addRibbonIcon('edit', 'Track Edits', (evt: MouseEvent) => {
      // Use debounced handler to prevent rapid clicks
      this.debouncedRibbonClick();
    });
  }

  private handleRibbonClick() {
    // Prevent recursive calls during ribbon toggle
    if (this.isRestartingSession) {
      console.log('Track Edits: Ribbon click ignored during session restart');
      return;
    }

    // Set flag to prevent active-leaf-change interference
    this.isRestartingSession = true;
    
    try {
      if (this.currentSession) {
        this.stopTracking();
        console.log('Track Edits: Stopped tracking via ribbon icon');
      } else {
        this.startTracking();
        console.log('Track Edits: Started tracking via ribbon icon');
      }
    } catch (error) {
      console.error('Track Edits: Error in ribbon icon handler:', error);
    } finally {
      // Clear flag after a brief delay to allow UI to settle
      setTimeout(() => {
        this.isRestartingSession = false;
      }, 100);
    }
  }

  private addCommands() {
    this.addCommand({
      id: 'start-tracking',
      name: 'Start tracking edits',
      callback: () => this.startTracking()
    });

    this.addCommand({
      id: 'stop-tracking',
      name: 'Stop tracking edits',
      callback: () => this.stopTracking()
    });

    this.addCommand({
      id: 'toggle-side-panel',
      name: 'Toggle Track Edits side panel',
      callback: () => this.toggleSidePanel()
    });

    this.addCommand({
      id: 'export-current-session',
      name: 'Export current session',
      callback: () => this.exportCurrentSession()
    });

    this.addCommand({
      id: 'view-edit-history',
      name: 'View edit history',
      callback: () => this.viewEditHistory()
    });

    this.addCommand({
      id: 'clear-edit-history',
      name: 'Clear edit history',
      callback: () => this.clearEditHistory()
    });

    // DEBUG COMMANDS - Remove before production
    if (DEBUG_MODE) {
      this.addCommand({
        id: 'debug-show-report',
        name: '🐛 Show Debug Report',
        callback: () => {
          const report = DebugMonitor.getReport();
          const modal = document.createElement('div');
          modal.style.cssText = `
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            width: 80%; max-width: 800px; height: 70%; 
            background: var(--background-primary); border: 1px solid var(--background-modifier-border);
            border-radius: 8px; padding: 20px; z-index: 10000;
            overflow-y: auto; font-family: var(--font-monospace);
          `;
          
          const reportText = JSON.stringify(report, null, 2);
          modal.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
              <h2>Track Edits Debug Report</h2>
              <div>
                <button onclick="navigator.clipboard.writeText(this.dataset.report)" data-report="${reportText.replace(/"/g, '&quot;')}" style="padding: 5px 10px; margin-right: 5px;">Copy All</button>
                <button onclick="this.parentElement.parentElement.parentElement.remove()" style="padding: 5px 10px;">Close</button>
              </div>
            </div>
            <div style="margin-bottom: 15px;">
              <h3>Performance Stats <button onclick="navigator.clipboard.writeText(JSON.stringify(${JSON.stringify(report.perfStats)}, null, 2))" style="font-size: 11px; padding: 2px 5px;">Copy</button></h3>
              <pre style="user-select: text; cursor: text; background: var(--background-secondary); padding: 10px; border-radius: 4px;">${JSON.stringify(report.perfStats, null, 2)}</pre>
            </div>
            <div style="margin-bottom: 15px;">
              <h3>Summary <button onclick="navigator.clipboard.writeText(JSON.stringify(${JSON.stringify(report.summary)}, null, 2))" style="font-size: 11px; padding: 2px 5px;">Copy</button></h3>
              <pre style="user-select: text; cursor: text; background: var(--background-secondary); padding: 10px; border-radius: 4px;">${JSON.stringify(report.summary, null, 2)}</pre>
            </div>
            <div>
              <h3>Recent Logs (Last 50) <button onclick="navigator.clipboard.writeText(JSON.stringify(${JSON.stringify(report.recentLogs)}, null, 2))" style="font-size: 11px; padding: 2px 5px;">Copy</button></h3>
              <pre style="user-select: text; cursor: text; background: var(--background-secondary); padding: 10px; border-radius: 4px; font-size: 11px; max-height: 400px; overflow-y: auto;">${JSON.stringify(report.recentLogs, null, 2)}</pre>
            </div>
          `;
          
          document.body.appendChild(modal);
        }
      });

      this.addCommand({
        id: 'debug-clear-logs',
        name: '🐛 Clear Debug Logs',
        callback: () => {
          DebugMonitor.clear();
          console.log('[Track Edits] Debug logs cleared');
        }
      });

      this.addCommand({
        id: 'debug-current-state',
        name: '🐛 Show Current State',
        callback: () => {
          const state = {
            currentSession: this.currentSession,
            currentEdits: this.currentEdits.length,
            isRejectingEdit,
            hasPluginInstance: !!currentPluginInstance,
            settings: this.settings,
            sidePanelView: !!this.sidePanelView
          };
          console.log('[Track Edits] Current State:', state);
        }
      });

      this.addCommand({
        id: 'debug-dump-logs-console',
        name: '🐛 Dump Logs to Console',
        callback: () => {
          const report = DebugMonitor.getReport();
          console.log('=== TRACK EDITS DEBUG REPORT ===');
          console.log('Performance Stats:', report.perfStats);
          console.log('Summary:', report.summary);
          console.log('Recent Logs:', report.recentLogs);
          console.log('=== END REPORT ===');
        }
      });
    }
  }

  startTracking() {
    // Prevent multiple simultaneous session starts
    if (this.currentSession && !this.isRestartingSession) {
      console.log('Track Edits: Session already active, stopping first');
      this.stopTracking();
    }

    const activeFile = this.app.workspace.getActiveFile();
    if (!activeFile) {
      console.log('Track Edits: No active file to track');
      return;
    }

    // Get and store current editor view for accept/reject operations (robust resolution like v2.0)
    this.currentEditorView = this.findCurrentEditorView();
    if (this.currentEditorView) {
      DebugMonitor.log('EDITOR_VIEW_STORED', { 
        hasView: !!this.currentEditorView,
        method: 'successful'
      });
    } else {
      DebugMonitor.log('EDITOR_VIEW_STORAGE_FAILED', { reason: 'no editor found' });
      console.warn('Track Edits: No active editor found during startTracking');
    }

    // Additional safety check - prevent starting if we're already starting
    if (this.currentSession && this.currentSession.id && this.currentSession.startTime) {
      console.log('Track Edits: Preventing duplicate session creation');
      return;
    }

    // Update tracked file
    this.lastActiveFile = activeFile.path;

    this.currentSession = {
      id: generateId(),
      startTime: Date.now(),
      changes: [],
      wordCount: 0,
      characterCount: 0
    };
    
    // Reset current edits array
    this.currentEdits = [];

    this.editTracker.startSession(this.currentSession, activeFile);
    this.editRenderer.showTrackingIndicator();
    
    // Show side panel if setting is enabled
    if (this.settings.showSidePanelOnStart) {
      this.showSidePanel();
    }
    
    console.log('Track Edits v2.0: Started tracking session', this.currentSession.id);
  }

  stopTracking() {
    try {
      if (this.currentSession) {
        this.currentSession.endTime = Date.now();
        this.saveCurrentSession();
        if (this.editTracker) {
          this.editTracker.endSession(this.currentSession.id);
        }
        if (this.editRenderer) {
          this.editRenderer.hideTrackingIndicator();
        }
        // Clear current edits
        this.currentEdits = [];
        this.currentSession = null;
        this.lastActiveFile = null;
        
        // Clear stored editor view
        this.currentEditorView = null;
        
        // Update side panel
        if (this.sidePanelView) {
          this.sidePanelView.updateClusters([]);
        }
      }
    } catch (error) {
      console.error('Track Edits: Error stopping tracking:', error);
      // Ensure currentSession is cleared even if other operations fail
      this.currentSession = null;
      this.currentEdits = [];
      this.lastActiveFile = null;
    }
  }

  private restartSession() {
    try {
      if (this.isRestartingSession) {
        console.log('Track Edits: Restart already in progress, ignoring');
        return; // Prevent recursive calls
      }
      if (!this.currentSession) {
        console.log('Track Edits: No session to restart');
        return; // No session to restart
      }
      
      this.isRestartingSession = true;
      console.log('Track Edits v2.0: Restarting session due to file change');
      
      // Store the current session ID for logging
      const previousSessionId = this.currentSession.id;
      
      this.stopTracking();
      
      // Longer delay to ensure cleanup completes and prevent rapid restarts
      setTimeout(() => {
        try {
          if (this.settings.enableTracking && !this.currentSession) {
            console.log('Track Edits: Starting new session after restart from', previousSessionId);
            this.startTracking();
          }
        } catch (startError) {
          console.error('Track Edits: Error starting new session after restart:', startError);
        } finally {
          this.isRestartingSession = false;
        }
      }, 150); // Increased delay to ensure proper cleanup
    } catch (error) {
      console.error('Track Edits: Error restarting session:', error);
      this.isRestartingSession = false;
    }
  }

  private async saveCurrentSession() {
    if (this.currentSession && this.settings.autoSave) {
      await this.editTracker.saveSession(this.currentSession);
    }
  }

  private exportCurrentSession() {
    if (!this.currentSession) return;
    this.exportSession(this.currentSession.id);
  }

  private exportSession(sessionId: string): string {
    const session = this.editTracker.getSession(sessionId);
    if (!session) return '';

    const exportData = this.editTracker.formatSessionForExport(session, this.settings.exportFormat);
    
    // Create and download file
    const blob = new Blob([exportData], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `edit-session-${sessionId}.${this.settings.exportFormat}`;
    a.click();
    URL.revokeObjectURL(url);

    return exportData;
  }

  private viewEditHistory() {
    // Open a modal or view to show edit history
    console.log('Opening edit history view...');
  }

  private clearEditHistory() {
    this.editTracker.clearHistory();
  }
  
  private async toggleSidePanel() {
    const existingLeaf = this.app.workspace.getLeavesOfType('track-edits-side-panel')[0];
    
    if (existingLeaf) {
      existingLeaf.detach();
    } else {
      await this.showSidePanel();
    }
  }
  
  private async showSidePanel() {
    const rightLeaf = this.app.workspace.getRightLeaf(false);
    await rightLeaf.setViewState({
      type: 'track-edits-side-panel',
      active: true
    });
    
    this.sidePanelView = rightLeaf.view as EditSidePanelView;
    this.app.workspace.revealLeaf(rightLeaf);
  }
  
  acceptEditCluster(clusterId: string) {
    const timer = DebugMonitor.startTimer('acceptEditCluster');
    
    // Get the cluster and its edits
    const cluster = this.clusterManager.getCluster(clusterId);
    if (!cluster) {
      DebugMonitor.log('ACCEPT_CLUSTER_FAILED', { clusterId, reason: 'cluster not found' });
      DebugMonitor.endTimer(timer);
      return;
    }

    DebugMonitor.log('ACCEPT_CLUSTER_START', {
      clusterId,
      editCount: cluster.edits.length,
      editIds: cluster.edits.map(e => e.id)
    });

    // Remove decorations from CodeMirror view for this cluster's edits
    DebugMonitor.log('ACCEPT_REMOVING_DECORATIONS', {
      hasStoredView: !!this.currentEditorView,
      editIds: cluster.edits.map(e => e.id)
    });
    this.removeDecorationsFromView(cluster.edits.map(e => e.id));

    // Remove edits from current array that belong to this cluster
    this.currentEdits = this.currentEdits.filter(edit => 
      !cluster.edits.find(clusterEdit => clusterEdit.id === edit.id)
    );
    
    // Update side panel display
    this.updateSidePanel();
    
    DebugMonitor.log('ACCEPT_CLUSTER_COMPLETE', {
      clusterId,
      remainingEdits: this.currentEdits.length
    });
    
    DebugMonitor.endTimer(timer);
  }
  
  rejectEditCluster(clusterId: string) {
    const timer = DebugMonitor.startTimer('rejectEditCluster');
    
    // Get the cluster and its edits
    const cluster = this.clusterManager.getCluster(clusterId);
    if (!cluster) {
      DebugMonitor.log('REJECT_CLUSTER_FAILED', { clusterId, reason: 'cluster not found' });
      DebugMonitor.endTimer(timer);
      return;
    }

    DebugMonitor.log('REJECT_CLUSTER_START', {
      clusterId,
      editCount: cluster.edits.length,
      editIds: cluster.edits.map(e => e.id)
    });

    // Get editor view with fallback like v2.0
    let editorView = this.currentEditorView;
    
    DebugMonitor.log('REJECT_CHECKING_VIEW', {
      hasStoredView: !!this.currentEditorView,
      viewType: this.currentEditorView ? this.currentEditorView.constructor.name : 'null'
    });
    
    if (!editorView) {
      DebugMonitor.log('REJECT_FALLBACK_SEARCH', { reason: 'no stored editor view, searching' });
      editorView = this.findCurrentEditorView();
    }
    
    if (!editorView) {
      DebugMonitor.log('REJECT_CLUSTER_FAILED', { reason: 'no editor view available' });
      DebugMonitor.endTimer(timer);
      return;
    }

    // Sort edits by position (reverse order to avoid position shifts)
    const sortedEdits = cluster.edits
      .filter(edit => edit.type === 'insert') // Only revert insertions
      .sort((a, b) => b.from - a.from);

    // Get Obsidian editor for safe text manipulation (v2.0 approach)
    const activeLeaf = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (!activeLeaf || !activeLeaf.editor) {
      DebugMonitor.log('REJECT_CLUSTER_FAILED', { reason: 'no Obsidian editor available' });
      DebugMonitor.endTimer(timer);
      return;
    }
    
    const obsidianEditor = activeLeaf.editor;
    
    // Revert text changes for insertions using Obsidian Editor API (v2.0 approach)
    // Prevent recursion during our own edit
    isRejectingEdit = true;
    
    try {
      DebugMonitor.log('REJECT_TEXT_PROCESSING', {
        sortedEditsCount: sortedEdits.length,
        editorAvailable: !!obsidianEditor
      });
      
      // Process edits and validate before removal
      for (const edit of sortedEdits) {
        if (edit.type === 'insert' && edit.text) {
          DebugMonitor.log('REJECT_PROCESSING_EDIT', {
            editId: edit.id,
            editText: edit.text,
            editFrom: edit.from,
            editTextLength: edit.text.length
          });
          
          // Convert offsets to Obsidian positions
          const startPos = obsidianEditor.offsetToPos(edit.from);
          const endPos = obsidianEditor.offsetToPos(edit.from + edit.text.length);
          
          DebugMonitor.log('REJECT_POSITION_CONVERSION', {
            editId: edit.id,
            startPos: { line: startPos.line, ch: startPos.ch },
            endPos: { line: endPos.line, ch: endPos.ch }
          });
          
          const currentText = obsidianEditor.getRange(startPos, endPos);
          
          DebugMonitor.log('REJECT_TEXT_COMPARISON', {
            editId: edit.id,
            expectedText: edit.text,
            actualText: currentText,
            matches: currentText === edit.text
          });
          
          // Only remove if the text matches what we expect (v2.0 safety check)
          if (currentText === edit.text) {
            obsidianEditor.replaceRange('', startPos, endPos);
            DebugMonitor.log('REJECT_REVERT_INSERT', {
              editId: edit.id,
              expectedText: edit.text,
              actualText: currentText,
              from: edit.from,
              removed: true
            });
          } else {
            DebugMonitor.log('REJECT_REVERT_SKIPPED', {
              editId: edit.id,
              expectedText: edit.text,
              actualText: currentText,
              reason: 'text mismatch',
              startPos,
              endPos
            });
          }
        }
      }
      
      // Remove decorations using CodeMirror effects (separate from text changes)
      const decorationRemoveEffects = cluster.edits.map(edit => 
        removeDecorationEffect.of(edit.id)
      );
      
      editorView.dispatch({
        effects: decorationRemoveEffects
      });
      
      DebugMonitor.log('REJECT_DISPATCH_COMPLETE', {
        processedEdits: sortedEdits.length,
        effectCount: decorationRemoveEffects.length
      });
    } finally {
      // Re-enable change tracking after a brief delay
      requestAnimationFrame(() => {
        isRejectingEdit = false;
      });
    }

    // Remove edits from current array that belong to this cluster
    this.currentEdits = this.currentEdits.filter(edit => 
      !cluster.edits.find(clusterEdit => clusterEdit.id === edit.id)
    );
    
    // Update side panel display
    this.updateSidePanel();
    
    DebugMonitor.log('REJECT_CLUSTER_COMPLETE', {
      clusterId,
      remainingEdits: this.currentEdits.length
    });
    
    DebugMonitor.endTimer(timer);
  }

  private findCurrentEditorView(): EditorView | null {
    // Method 1: Try active view first
    const activeLeaf = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (activeLeaf && activeLeaf.editor) {
      const editorView = (activeLeaf.editor as any).cm as EditorView;
      if (editorView) {
        DebugMonitor.log('FOUND_EDITOR_VIEW', { method: 'active_view' });
        return editorView;
      }
    }

    // Method 2: Search all workspace leaves for MarkdownView (v2.0 fallback pattern)
    const leaves = this.app.workspace.getLeavesOfType('markdown');
    for (const leaf of leaves) {
      const view = leaf.view as MarkdownView;
      if (view && view.editor) {
        const editorView = (view.editor as any).cm as EditorView;
        if (editorView) {
          DebugMonitor.log('FOUND_EDITOR_VIEW', { method: 'leaf_search', leafId: leaf.id });
          return editorView;
        }
      }
    }

    // Method 3: Try the most recently active leaf (last resort)
    const mostRecentLeaf = this.app.workspace.getMostRecentLeaf();
    if (mostRecentLeaf && mostRecentLeaf.view instanceof MarkdownView && mostRecentLeaf.view.editor) {
      const editorView = (mostRecentLeaf.view.editor as any).cm as EditorView;
      if (editorView) {
        DebugMonitor.log('FOUND_EDITOR_VIEW', { method: 'most_recent_leaf' });
        return editorView;
      }
    }

    DebugMonitor.log('EDITOR_VIEW_NOT_FOUND', { 
      activeLeafExists: !!activeLeaf,
      markdownLeavesCount: leaves.length,
      mostRecentLeafExists: !!mostRecentLeaf
    });
    return null;
  }

  private removeDecorationsFromView(editIds: string[]) {
    let editorView = this.currentEditorView;
    
    // If no stored view, try to find current one (v2.0 fallback pattern)
    if (!editorView) {
      DebugMonitor.log('REMOVE_DECORATIONS_FALLBACK', { reason: 'no stored editor view, searching' });
      editorView = this.findCurrentEditorView();
    }
    
    if (!editorView) {
      DebugMonitor.log('REMOVE_DECORATIONS_FAILED', { reason: 'no editor view available' });
      return;
    }

    const removeEffects = editIds.map(editId => removeDecorationEffect.of(editId));
    
    DebugMonitor.log('REMOVING_DECORATIONS', {
      editIds,
      effectCount: removeEffects.length,
      hasEditorView: !!editorView,
      usingStored: editorView === this.currentEditorView
    });

    editorView.dispatch({ effects: removeEffects });
  }

  handleEditsFromCodeMirror(edits: EditChange[]) {
    const timer = DebugMonitor.startTimer('handleEditsFromCodeMirror');
    
    DebugMonitor.log('HANDLE_EDITS', {
      editCount: edits.length,
      enableTracking: this.settings.enableTracking,
      hasSession: !!this.currentSession,
      currentEditsCount: this.currentEdits.length,
      edits: edits.map(e => ({ id: e.id, type: e.type, from: e.from, to: e.to }))
    });
    
    if (!this.settings.enableTracking || !this.currentSession) {
      DebugMonitor.log('HANDLE_EDITS_SKIPPED', {
        reason: !this.settings.enableTracking ? 'tracking disabled' : 'no session'
      });
      DebugMonitor.endTimer(timer);
      return;
    }

    // Add edits to current array
    this.currentEdits.push(...edits);

    // Record changes in tracker
    const trackerTimer = DebugMonitor.startTimer('editTracker.recordChanges');
    this.editTracker.recordChanges(this.currentSession.id, edits);
    DebugMonitor.endTimer(trackerTimer);

    // Update side panel (debounced)
    this.debouncedPanelUpdate();

    // Save session (debounced)
    this.debouncedSave();

    DebugMonitor.log('HANDLE_EDITS_COMPLETE', {
      processedCount: edits.length,
      totalEdits: this.currentEdits.length
    });
    
    DebugMonitor.endTimer(timer);
  }
}