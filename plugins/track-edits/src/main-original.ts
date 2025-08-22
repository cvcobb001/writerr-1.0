import { Plugin, MarkdownView, Editor, EditorChange, TFile } from 'obsidian';
import { TrackEditsSettingsTab } from './settings';
import { EditTracker } from './edit-tracker';
import { EditRenderer } from './edit-renderer';
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
}

const DEFAULT_SETTINGS: TrackEditsSettings = {
  enableTracking: true,
  showLineNumbers: true,
  highlightChanges: true,
  retentionDays: 30,
  colorScheme: 'default',
  autoSave: true,
  exportFormat: 'json'
};

export default class TrackEditsPlugin extends Plugin {
  settings: TrackEditsSettings;
  editTracker: EditTracker;
  editRenderer: EditRenderer;
  currentSession: EditSession | null = null;
  private debouncedSave = debounce(() => this.saveCurrentSession(), 1000);

  async onload() {
    await this.loadSettings();

    this.editTracker = new EditTracker(this);
    this.editRenderer = new EditRenderer(this);

    // Initialize global API
    this.initializeGlobalAPI();

    // Register CodeMirror extension for decorations
    this.registerCodeMirrorExtension();

    // Register event handlers
    this.registerEditorChangeHandler();
    this.registerActiveLeafChangeHandler();

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

    console.log('Track Edits plugin loaded');
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

  private registerCodeMirrorExtension() {
    // Register the CodeMirror extension for change decorations
    const extension = this.editRenderer.getCodeMirrorExtension();
    if (extension) {
      this.registerEditorExtension(extension);
      console.log('Track Edits: Registered CodeMirror extension for decorations');
    }
  }

  private registerEditorChangeHandler() {
    this.registerEvent(
      this.app.workspace.on('editor-change', (editor: Editor, info: MarkdownView | any) => {
        if (this.settings.enableTracking && this.currentSession) {
          console.log('Track Edits: Editor change detected');
          const changes = this.extractChangesFromEditor(editor);
          if (changes.length > 0) {
            console.log('Track Edits: Recording', changes.length, 'changes');
            this.editTracker.recordChanges(this.currentSession.id, changes);
            this.editRenderer.showChangeDecorations(changes);
            this.debouncedSave();
          }
        }
      })
    );
  }

  private registerActiveLeafChangeHandler() {
    this.registerEvent(
      this.app.workspace.on('active-leaf-change', () => {
        try {
          if (this.settings && this.settings.enableTracking) {
            this.restartSession();
          }
        } catch (error) {
          console.error('Track Edits: Error in active-leaf-change handler:', error);
        }
      })
    );
  }

  private extractChangesFromEditor(editor: Editor): EditChange[] {
    // Get the last change from editor transaction
    // This is a simplified implementation - in a real scenario you'd need to track
    // editor transactions more comprehensively
    const doc = editor.getDoc();
    const cursor = editor.getCursor();
    const line = doc.getLine(cursor.line);
    
    // Create a simple change record for demonstration
    // In production, you'd hook into CodeMirror's transaction system
    if (line && line.length > 0) {
      console.log('Track Edits: Detected editor change at line', cursor.line, 'position', cursor.ch);
      
      // Calculate document position (absolute position from start of document)
      const docPosition = editor.posToOffset(cursor);
      const fromPos = Math.max(0, docPosition - 1);
      const toPos = docPosition;
      
      return [{
        id: generateId(),
        timestamp: Date.now(),
        type: 'insert',
        from: fromPos,
        to: toPos,
        text: line.charAt(cursor.ch - 1) || '',
        author: 'user'
      }];
    }
    
    return [];
  }

  private addRibbonIcon() {
    super.addRibbonIcon('edit', 'Track Edits', (evt: MouseEvent) => {
      if (this.currentSession) {
        this.stopTracking();
        console.log('Track Edits: Stopped tracking via ribbon icon');
      } else {
        this.startTracking();
        console.log('Track Edits: Started tracking via ribbon icon');
      }
    });
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
    if (this.currentSession) {
      this.stopTracking();
    }

    const activeFile = this.app.workspace.getActiveFile();
    if (!activeFile) {
      console.log('Track Edits: No active file to track');
      return;
    }

    this.currentSession = {
      id: generateId(),
      startTime: Date.now(),
      changes: [],
      wordCount: 0,
      characterCount: 0
    };

    this.editTracker.startSession(this.currentSession, activeFile);
    this.editRenderer.showTrackingIndicator();
    
    console.log('Track Edits: Started tracking session', this.currentSession.id);
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
        this.currentSession = null;
      }
    } catch (error) {
      console.error('Track Edits: Error stopping tracking:', error);
      // Ensure currentSession is cleared even if other operations fail
      this.currentSession = null;
    }
  }

  private restartSession() {
    try {
      if (this.currentSession) {
        this.stopTracking();
        // Small delay to ensure cleanup completes before starting new session
        setTimeout(() => {
          if (this.settings.enableTracking) {
            this.startTracking();
          }
        }, 10);
      }
    } catch (error) {
      console.error('Track Edits: Error restarting session:', error);
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
}