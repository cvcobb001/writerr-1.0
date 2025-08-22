import { Plugin, MarkdownView, Editor, EditorChange, TFile, WorkspaceLeaf, ItemView } from 'obsidian';
import { StateField, StateEffect, Transaction } from '@codemirror/state';
import { EditorView, ViewUpdate, ViewPlugin, Decoration, DecorationSet, WidgetType } from '@codemirror/view';
import { TrackEditsSettingsTab } from './settings';
import { EditTracker } from './edit-tracker';
import { EditRenderer } from './edit-renderer';
import { EditSidePanelView } from './side-panel-view';
import { EditClusterManager } from './edit-cluster-manager';
import { EditSession, EditChange, WriterrlGlobalAPI } from '@shared/types';
import { generateId, debounce } from '@shared/utils';

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

// Global state for CodeMirror integration
let currentPluginInstance: TrackEditsPlugin | null = null;
let isRejectingEdit = false;

// State effects for decoration management
const addDecorationEffect = StateEffect.define<{edit: EditChange, decoration: Decoration}>();
const removeDecorationEffect = StateEffect.define<string>(); // edit ID

// Custom widget for showing deleted text
class DeletionWidget extends WidgetType {
  constructor(private deletedText: string, private editId: string) {
    super();
  }
  
  toDOM(): HTMLElement {
    const span = document.createElement('span');
    span.className = 'track-edit-deleted-widget';
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
      class: 'track-edit-added',
      attributes: attributes
    });
  } else if (edit.type === 'delete') {
    return Decoration.widget({
      widget: new DeletionWidget(edit.removedText || '', edit.id),
      side: -1
    });
  }
  
  // Fallback
  return Decoration.mark({ class: 'track-edit-added', attributes });
}

// StateField for managing decorations
const editDecorationField = StateField.define<DecorationSet>({
  create() {
    return Decoration.none;
  },
  update(decorations, tr) {
    // Map existing decorations to new positions
    decorations = decorations.map(tr.changes);
    
    // Process effects for new decorations
    for (const effect of tr.effects) {
      if (effect.is(addDecorationEffect)) {
        const { edit, decoration } = effect.value;
        
        if (edit.type === 'delete') {
          // Widget decorations for deletions
          const pos = edit.from;
          decorations = decorations.update({
            add: [decoration.range(pos)]
          });
        } else if (edit.type === 'insert') {
          // Mark decorations for additions
          const start = edit.from;
          const end = start + (edit.text?.length || 0);
          
          if (end <= tr.newDoc.length && start <= end && start >= 0) {
            decorations = decorations.update({
              add: [decoration.range(start, end)]
            });
          }
        }
      } else if (effect.is(removeDecorationEffect)) {
        const editId = effect.value;
        decorations = decorations.update({
          filter: (from, to, decoration) => {
            const spec = (decoration as any).spec;
            if (spec?.attributes?.['data-edit-id'] === editId) return false;
            if (spec?.widget && spec.widget.editId === editId) return false;
            return true;
          }
        });
      }
    }
    
    return decorations;
  },
  provide: f => EditorView.decorations.from(f)
});

// ViewPlugin for change detection
const changeDetectionPlugin = ViewPlugin.fromClass(class {
  constructor(private view: EditorView) {}
  
  update(update: ViewUpdate) {
    if (update.docChanged && !isRejectingEdit && currentPluginInstance) {
      const edits = this.extractEditsFromUpdate(update);
      
      if (edits.length > 0) {
        // Add decorations immediately
        const decorationEffects = edits.map(edit => {
          const decoration = createEditDecoration(edit);
          return addDecorationEffect.of({ edit, decoration });
        });
        
        requestAnimationFrame(() => {
          this.view.dispatch({ effects: decorationEffects });
        });
        
        // Update plugin state
        currentPluginInstance.handleEditsFromCodeMirror(edits);
      }
    }
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
          from: from,
          to: from,
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
    
    // Use Obsidian's native editor-change event without CodeMirror conflicts
    this.registerEvent(
      this.app.workspace.on('editor-change', (editor: Editor, info: MarkdownView | any) => {
        console.log('[Track Edits DEBUG] editor-change event fired');
        console.log('[Track Edits DEBUG] isProcessingChange:', this.isProcessingChange);
        console.log('[Track Edits DEBUG] enableTracking:', this.settings.enableTracking);
        console.log('[Track Edits DEBUG] currentSession exists:', !!this.currentSession);
        
        if (this.isProcessingChange) {
          console.log('[Track Edits DEBUG] Skipping due to isProcessingChange');
          return; // Prevent recursion
        }
        if (!this.settings.enableTracking || !this.currentSession) {
          console.log('[Track Edits DEBUG] Skipping due to enableTracking or no session');
          return;
        }
        
        this.isProcessingChange = true;
        requestAnimationFrame(() => {
          try {
            this.handleEditorChange(editor, info);
          } catch (error) {
            console.error('Track Edits: Error in editor change handler:', error);
          } finally {
            this.isProcessingChange = false;
          }
        });
      })
    );
    
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
    // Remove edits from current array that belong to this cluster
    const cluster = this.clusterManager.getCluster(clusterId);
    if (cluster) {
      this.currentEdits = this.currentEdits.filter(edit => 
        !cluster.edits.find(clusterEdit => clusterEdit.id === edit.id)
      );
      
      // Update displays
      this.editRenderer.clearDecorations();
      this.updateSidePanel();
    }
  }
  
  rejectEditCluster(clusterId: string) {
    // For now, just remove from display (could implement undo in future)
    this.acceptEditCluster(clusterId);
  }
}