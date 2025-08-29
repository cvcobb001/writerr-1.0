import { Plugin, MarkdownView, Editor, EditorChange, TFile, WorkspaceLeaf, ItemView } from 'obsidian';
import { StateField, StateEffect, Transaction, ChangeSpec } from '@codemirror/state';
import { EditorView, ViewUpdate, ViewPlugin, Decoration, DecorationSet, WidgetType } from '@codemirror/view';
import { TrackEditsSettingsTab } from './settings';
import { EditTracker } from './edit-tracker';
import { EditRenderer } from './edit-renderer';
import { EditSidePanelView } from './side-panel-view';
import { EditClusterManager } from './edit-cluster-manager';
import { ToggleStateManager } from './ui/ToggleStateManager';
import { ToggleConfirmationModal } from './components/ToggleConfirmationModal';
import { EditSession, EditChange, WriterrlGlobalAPI, AIProcessingContext } from '../../../shared/types';
import { generateId, debounce } from '../../../shared/utils';
import { SubmitChangesFromAIResult, SubmitChangesFromAIOptions, EnhancedAIProcessingContext, EditorialOperationType } from './types/submit-changes-from-ai';
import { AIMetadataValidator } from './validation/ai-metadata-validator';
import { ChangeBatchManager, BatchManagerFactory } from './change-batch-manager';
import { PluginRegistry } from './plugin-system/plugin-registry';
import { PluginSecurityValidator } from './plugin-system/plugin-security-validator';
import { PluginCapabilityValidator } from './plugin-system/plugin-capability-validator';
import { IAIProcessingPlugin, PluginRegistrationResult } from './plugin-system/plugin-interface';
import { EditorialEnginePluginWrapper } from './plugin-system/editorial-engine-plugin';
import { initializeTrackEditsPluginAPI, cleanupTrackEditsPluginAPI } from './plugin-system/plugin-api';
import { WriterrlEventBusConnection, EventBusUtils, WriterrlEvent, WriterrlChangeEvent, WriterrlSessionEvent, WriterrlErrorEvent } from './event-bus-integration';
import { EventPersistenceManager } from './event-persistence-manager';

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
  // AI Integration settings
  aiAlwaysEnabled: boolean;
  aiProvider: string;
  aiModel: string;
  systemPromptPath: string;
  // Event Bus Integration settings
  enableEventBus: boolean;
  eventBusDebugMode: boolean;
  eventBusMaxReconnectAttempts: number;
  eventBusReconnectDelay: number;
}

// AI Processing State Management Interfaces
interface AIProcessingState {
  requestId: string;
  operation: {
    type: EditorialOperationType;
    provider: string;
    model: string;
    startTime: number;
  };
  input: {
    documentId: string;
    content: string;
    userPrompt: string;
    constraints?: string[];
  };
  status: 'preparing' | 'processing' | 'completing' | 'completed' | 'error' | 'cancelled';
  progress: {
    percentage: number;
    stage: string;
    estimatedTimeRemaining?: number;
    currentOperation?: string;
  };
  sourcePlugin: string;
  sessionId?: string;
  errorDetails?: {
    type: string;
    message: string;
    recoverable: boolean;
  };
  metrics?: {
    tokensProcessed: number;
    responseTime: number;
    memoryUsage: number;
  };
}

interface AIProcessingQueue {
  active: AIProcessingState[];
  pending: AIProcessingState[];
  completed: AIProcessingState[];
  failed: AIProcessingState[];
}

interface ProcessingCoordinationConfig {
  maxConcurrentOperations: number;
  processingTimeoutMs: number;
  queueMaxSize: number;
  enableRealTimeUpdates: boolean;
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
  showSidePanelOnStart: true,
  // AI Integration defaults
  aiAlwaysEnabled: false,
  aiProvider: '',
  aiModel: '',
  systemPromptPath: 'prompts/system-prompt.md',
  // Event Bus Integration defaults
  enableEventBus: true,
  eventBusDebugMode: false,
  eventBusMaxReconnectAttempts: 3,
  eventBusReconnectDelay: 1000
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
const clearAllDecorationsEffect = StateEffect.define<boolean>();

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
      } else if (effect.is(clearAllDecorationsEffect)) {
        DebugMonitor.log('CLEAR_ALL_DECORATIONS_EFFECT', { previousSize: decorations.size });
        removedDecorations = decorations.size;
        decorations = Decoration.none;
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
    
    // Check if we should process changes (plugin exists, tracking enabled, not rejecting, has session)
    const shouldProcessChanges = update.docChanged && 
                                 !isRejectingEdit && 
                                 currentPluginInstance &&
                                 currentPluginInstance.currentSession &&
                                 currentPluginInstance.settings.enableTracking &&
                                 (!currentPluginInstance.toggleStateManager || 
                                  currentPluginInstance.toggleStateManager.isTrackingEnabled);
    
    if (shouldProcessChanges) {
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
  batchManager: ChangeBatchManager;
  sidePanelView: EditSidePanelView | null = null;
  toggleStateManager: ToggleStateManager | null = null;
  // Plugin Registration System
  private pluginRegistry: PluginRegistry | null = null;
  private eventBusConnection: WriterrlEventBusConnection | null = null;
  private eventPersistence: EventPersistenceManager | null = null;
  private workflowOrchestrator: any = null; // WorkflowOrchestrator from event-coordination-patterns
  
  // AI Processing State Management
  private aiProcessingStates: Map<string, AIProcessingState> = new Map();
  private processingQueue: AIProcessingQueue = {
    active: [],
    pending: [],
    completed: [],
    failed: []
  };
  private processingLocks: Map<string, boolean> = new Map();
  private securityValidator: PluginSecurityValidator | null = null;
  private capabilityValidator: PluginCapabilityValidator | null = null;
  currentSession: EditSession | null = null;
  currentEdits: EditChange[] = [];
  private currentEditorView: EditorView | null = null;
  private ribbonIconEl: HTMLElement | null = null;
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
    this.batchManager = new ChangeBatchManager();

    // Initialize plugin system
    await this.initializePluginSystem();

    // Initialize event bus connection
    await this.initializeEventBusConnection();

    // Initialize toggle state manager
    this.toggleStateManager = new ToggleStateManager(this.app, (enabled) => {
      if (enabled) {
        this.startTracking();
      } else {
        this.handleToggleOff();
      }
    });

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

    console.log('Track Edits v2.0 plugin loaded with Plugin Registration System');
  }

  onunload() {
    try {
      this.stopTracking();
      this.cleanupGlobalAPI();
      
      // Clean up toggle state manager
      if (this.toggleStateManager) {
        this.toggleStateManager.destroy();
        this.toggleStateManager = null;
      }

      // Clean up event bus connection
      this.cleanupEventBusConnection();

      // Clean up event persistence
      if (this.eventPersistence) {
        // Attempt to sync any final pending events
        if (this.eventBusConnection?.isConnected()) {
          this.eventPersistence.syncPendingEvents(this.eventBusConnection)
            .catch(error => console.warn('[TrackEdits] Final event sync failed:', error));
        }
        this.eventPersistence = null;
      }
      
      console.log('Track Edits plugin unloaded');
    } catch (error) {
      console.error('Track Edits: Error during plugin unload:', error);
    }
  }

  /**
   * Initialize the plugin registration system
   */
  private async initializePluginSystem(): Promise<void> {
    try {
      // Initialize validators
      this.securityValidator = new PluginSecurityValidator();
      this.capabilityValidator = new PluginCapabilityValidator();

      // Initialize registry
      this.pluginRegistry = new PluginRegistry(
        this,
        this.securityValidator,
        this.capabilityValidator
      );

      // Register Editorial Engine as the first official plugin
      await this.registerEditorialEnginePlugin();

      console.log('[TrackEditsPlugin] Plugin registration system initialized');
    } catch (error) {
      console.error('[TrackEditsPlugin] Failed to initialize plugin system:', error);
      // Continue without plugin system if initialization fails
      this.pluginRegistry = null;
      this.securityValidator = null;
      this.capabilityValidator = null;
    }
  }

  /**
   * Initialize event bus connection for cross-plugin coordination
   */
  private async initializeEventBusConnection(): Promise<void> {
    try {
      if (!this.settings.enableEventBus) {
        console.log('[TrackEditsPlugin] Event bus integration disabled in settings');
        return;
      }

      // Initialize event persistence first
      this.eventPersistence = new EventPersistenceManager();
      await this.eventPersistence.initialize();

      // Create event bus connection with configuration
      this.eventBusConnection = new WriterrlEventBusConnection({
        maxReconnectAttempts: this.settings.eventBusMaxReconnectAttempts,
        reconnectDelay: this.settings.eventBusReconnectDelay,
        healthCheckInterval: 30000,
        enableDebugMode: this.settings.eventBusDebugMode,
        eventFilters: {
          sourcePlugins: ['writerr-chat', 'editorial-engine', 'track-edits'],
          eventTypes: [
            'change.ai.start', 'change.ai.complete', 'change.ai.error',
            'session.created', 'session.ended', 'session.paused', 'session.resumed',
            'document.edit.start', 'document.edit.complete', 'document.focus.changed',
            'error.plugin.failure', 'error.recovery.attempted'
          ]
        }
      });

      // Connect event persistence to event bus
      if (this.eventPersistence) {
        this.eventPersistence.setEventBus(this.eventBusConnection);
      }

      // Attempt to connect to the event bus
      const connected = await this.eventBusConnection.connect();
      
      if (connected) {
        // Set up event handlers
        await this.setupEventBusHandlers();
        
        // Sync any pending events from offline periods
        if (this.eventPersistence) {
          try {
            const syncResult = await this.eventPersistence.syncPendingEvents(this.eventBusConnection);
            if (syncResult.synced > 0) {
              console.log(`[TrackEditsPlugin] Synced ${syncResult.synced} pending events from offline period`);
            }
            if (syncResult.failed > 0) {
              console.warn(`[TrackEditsPlugin] Failed to sync ${syncResult.failed} events`);
            }
          } catch (syncError) {
            console.warn('[TrackEditsPlugin] Error syncing pending events:', syncError);
          }
        }
        
        console.log('[TrackEditsPlugin] Event bus integration initialized successfully');
      } else {
        console.log('[TrackEditsPlugin] Event bus not available - will retry on demand');
      }
    } catch (error) {
      console.error('[TrackEditsPlugin] Failed to initialize event bus connection:', error);
      // Continue without event bus if initialization fails
      this.eventBusConnection = null;
    }
  }

  /**
   * Set up event handlers for cross-plugin coordination
   */
  private async setupEventBusHandlers(): Promise<void> {
    if (!this.eventBusConnection) return;

    try {
      // Subscribe to Writerr Chat session events for coordination
      await this.eventBusConnection.subscribe(
        'session.*',
        this.handleChatSessionEvent.bind(this),
        { 
          filter: (event) => event.sourcePlugin === 'writerr-chat',
          async: true
        }
      );

      // Subscribe to Editorial Engine processing events
      await this.eventBusConnection.subscribe(
        'change.*',
        this.handleEditorialEngineEvent.bind(this),
        { 
          filter: (event) => event.sourcePlugin === 'editorial-engine',
          async: true
        }
      );

      // Subscribe to AI processing events for coordination
      await this.eventBusConnection.subscribe(
        'ai.processing.start',
        this.handleAIProcessingStartEvent.bind(this),
        { async: true }
      );

      await this.eventBusConnection.subscribe(
        'ai.processing.progress',
        this.handleAIProcessingProgressEvent.bind(this),
        { async: true }
      );

      await this.eventBusConnection.subscribe(
        'ai.processing.complete',
        this.handleAIProcessingCompleteEvent.bind(this),
        { async: true }
      );

      await this.eventBusConnection.subscribe(
        'ai.processing.error',
        this.handleAIProcessingErrorEvent.bind(this),
        { async: true }
      );

      // Subscribe to document focus changes for multi-plugin editing coordination
      await this.eventBusConnection.subscribe(
        'document.*',
        this.handleDocumentEvent.bind(this),
        { async: true }
      );

      // Subscribe to error events for platform-wide error handling
      await this.eventBusConnection.subscribe(
        'error.*',
        this.handleErrorEvent.bind(this),
        { async: true }
      );

      console.log('[TrackEditsPlugin] Event bus handlers configured with AI processing support');
    } catch (error) {
      console.error('[TrackEditsPlugin] Failed to setup event bus handlers:', error);
    }
  }

  /**
   * Handle Writerr Chat session events for coordination
   */
  private async handleChatSessionEvent(event: WriterrlEvent): Promise<void> {
    try {
      if (this.settings.eventBusDebugMode) {
        console.log('[TrackEdits EventBus] Chat session event:', event);
      }

      switch (event.type) {
        case 'session.created':
          // Start tracking when chat session begins
          if (!this.currentSession && this.settings.enableTracking) {
            console.log('[TrackEdits] Starting tracking in response to chat session');
            this.startTracking();
          }
          break;

        case 'session.ended':
          // Optionally stop tracking or save session when chat ends
          if (this.currentSession && this.settings.autoSave) {
            await this.saveCurrentSession();
          }
          break;
      }
    } catch (error) {
      console.error('[TrackEdits EventBus] Error handling chat session event:', error);
    }
  }

  /**
   * Handle Editorial Engine processing events
   */
  private async handleEditorialEngineEvent(event: WriterrlEvent): Promise<void> {
    try {
      if (this.settings.eventBusDebugMode) {
        console.log('[TrackEdits EventBus] Editorial Engine event:', event);
      }

      switch (event.type) {
        case 'change.ai.start':
          // Pause edit tracking during AI processing to avoid interference
          if (this.toggleStateManager && this.toggleStateManager.isTrackingEnabled) {
            this.isProcessingChange = true;
            console.log('[TrackEdits] Pausing change detection during Editorial Engine processing');
          }
          break;

        case 'change.ai.complete':
          // Resume edit tracking and sync with Editorial Engine changes
          this.isProcessingChange = false;
          const changeEvent = event as WriterrlChangeEvent;
          
          // If we have change IDs, try to reconcile with our tracking
          if (changeEvent.payload.changeIds && this.currentSession) {
            console.log('[TrackEdits] Syncing with Editorial Engine changes:', changeEvent.payload.changeIds);
            // Additional sync logic would go here
          }
          break;

        case 'change.ai.error':
          // Resume tracking on error
          this.isProcessingChange = false;
          console.log('[TrackEdits] Resuming tracking after Editorial Engine error');
          break;
      }
    } catch (error) {
      console.error('[TrackEdits EventBus] Error handling Editorial Engine event:', error);
    }
  }

  /**
   * Handle document events for multi-plugin editing coordination
   */
  private async handleDocumentEvent(event: WriterrlEvent): Promise<void> {
    try {
      if (this.settings.eventBusDebugMode) {
        console.log('[TrackEdits EventBus] Document event:', event);
      }

      const docEvent = event as WriterrlDocumentEvent;
      
      switch (event.type) {
        case 'document.focus.changed':
          // Switch tracking context when document changes
          if (docEvent.payload.documentPath && docEvent.payload.documentPath !== this.lastActiveFile) {
            this.lastActiveFile = docEvent.payload.documentPath;
            
            // Restart session for new document if tracking is active
            if (this.currentSession && this.settings.enableTracking) {
              await this.restartSession();
            }
          }
          break;

        case 'document.save.before':
          // Save current tracking session before document save
          if (this.currentSession && this.settings.autoSave) {
            await this.saveCurrentSession();
          }
          break;
      }
    } catch (error) {
      console.error('[TrackEdits EventBus] Error handling document event:', error);
    }
  }

  /**
   * Handle error events for platform-wide error coordination
   */
  private async handleErrorEvent(event: WriterrlEvent): Promise<void> {
    try {
      if (this.settings.eventBusDebugMode) {
        console.log('[TrackEdits EventBus] Error event:', event);
      }

      const errorEvent = event as WriterrlErrorEvent;
      
      switch (event.type) {
        case 'error.plugin.failure':
          // Handle plugin failures that might affect Track Edits
          if (errorEvent.payload.affectedFeatures.includes('editing') || 
              errorEvent.payload.affectedFeatures.includes('tracking')) {
            
            if (errorEvent.payload.severity === 'critical') {
              // Stop tracking on critical errors affecting editing
              this.stopTracking();
              console.log('[TrackEdits] Stopped tracking due to critical system error');
            } else {
              // For non-critical errors, just log and continue
              console.warn('[TrackEdits] System error detected, continuing with caution:', errorEvent.payload.errorMessage);
            }
          }
          break;

        case 'error.recovery.attempted':
          // Monitor recovery attempts and restart tracking if needed
          if (errorEvent.payload.recoveryAction === 'restart_tracking' && this.settings.enableTracking) {
            console.log('[TrackEdits] Restarting tracking after error recovery');
            this.startTracking();
          }
          break;
      }
    } catch (error) {
      console.error('[TrackEdits EventBus] Error handling error event:', error);
    }
  }

  // AI Processing Event Handlers
  private async handleAIProcessingStartEvent(event: any): Promise<void> {
    try {
      const startEvent = event as any; // Type will be AIProcessingStartEvent
      const { requestId, operation, input, config, pluginContext } = startEvent.payload;

      console.log(`[TrackEditsPlugin] AI processing started: ${requestId} from ${pluginContext.sourcePluginId}`);

      // Create processing state
      const processingState: AIProcessingState = {
        requestId,
        operation: {
          type: operation.type,
          provider: operation.provider,
          model: operation.model,
          startTime: Date.now()
        },
        input: {
          documentId: input.documentId,
          content: input.content,
          userPrompt: input.userPrompt,
          constraints: input.constraints
        },
        status: 'preparing',
        progress: {
          percentage: 0,
          stage: 'initializing',
          estimatedTimeRemaining: config.expectedDuration
        },
        sourcePlugin: pluginContext.sourcePluginId,
        sessionId: startEvent.sessionId
      };

      // Add to processing state management
      this.aiProcessingStates.set(requestId, processingState);
      this.processingQueue.active.push(processingState);

      // Prepare Track Edits for incoming changes
      await this.prepareForAIProcessing(processingState);

      // Update UI to show processing state
      await this.updateProcessingUI(processingState);

      // Coordinate with session management
      if (processingState.sessionId) {
        const session = this.editTracker.getSession(processingState.sessionId);
        if (session) {
          // Mark session as having active AI processing
          session.metadata = {
            ...session.metadata,
            activeAIProcessing: requestId,
            aiProvider: operation.provider,
            aiModel: operation.model
          };
        }
      }

    } catch (error) {
      console.error('[TrackEditsPlugin] Error handling AI processing start event:', error);
      await this.publishErrorEvent('error.ai.processing.handler', {
        message: 'Failed to handle AI processing start event',
        error: error.message,
        context: { eventType: 'ai.processing.start' }
      });
    }
  }

  private async handleAIProcessingProgressEvent(event: any): Promise<void> {
    try {
      const progressEvent = event as any; // Type will be AIProcessingProgressEvent
      const { requestId, progress, partialResults, metrics } = progressEvent.payload;

      const processingState = this.aiProcessingStates.get(requestId);
      if (!processingState) {
        console.warn(`[TrackEditsPlugin] Progress event for unknown request: ${requestId}`);
        return;
      }

      // Update processing state
      processingState.status = 'processing';
      processingState.progress = {
        percentage: progress.percentage,
        stage: progress.stage,
        estimatedTimeRemaining: progress.estimatedTimeRemaining,
        currentOperation: progress.currentOperation
      };
      
      if (metrics) {
        processingState.metrics = {
          tokensProcessed: metrics.tokensProcessed,
          responseTime: metrics.responseTime,
          memoryUsage: metrics.memoryUsage
        };
      }

      // Update UI with progress
      await this.updateProcessingProgress(processingState, partialResults);

      // Handle partial results if available
      if (partialResults?.previewChanges && partialResults.previewChanges.length > 0) {
        await this.handlePartialResults(processingState, partialResults.previewChanges);
      }

      console.log(`[TrackEditsPlugin] AI processing progress: ${requestId} - ${progress.percentage}% (${progress.stage})`);

    } catch (error) {
      console.error('[TrackEditsPlugin] Error handling AI processing progress event:', error);
    }
  }

  private async handleAIProcessingCompleteEvent(event: any): Promise<void> {
    try {
      const completeEvent = event as any; // Type will be AIProcessingCompleteEvent
      const { requestId, results, metrics, recommendations } = completeEvent.payload;

      const processingState = this.aiProcessingStates.get(requestId);
      if (!processingState) {
        console.warn(`[TrackEditsPlugin] Complete event for unknown request: ${requestId}`);
        return;
      }

      // Update processing state
      processingState.status = 'completed';
      processingState.progress.percentage = 100;
      processingState.progress.stage = 'completed';
      
      if (metrics) {
        processingState.metrics = {
          tokensProcessed: metrics.totalTokens,
          responseTime: metrics.processingTime,
          memoryUsage: processingState.metrics?.memoryUsage || 0
        };
      }

      // Move from active to completed queue
      const activeIndex = this.processingQueue.active.findIndex(state => state.requestId === requestId);
      if (activeIndex !== -1) {
        this.processingQueue.active.splice(activeIndex, 1);
        this.processingQueue.completed.push(processingState);
      }

      // Coordinate change recording
      await this.coordinateChangeRecording(processingState, results);

      // Update session if applicable
      if (processingState.sessionId) {
        const session = this.editTracker.getSession(processingState.sessionId);
        if (session && session.metadata?.activeAIProcessing === requestId) {
          delete session.metadata.activeAIProcessing;
          session.metadata.lastAIOperation = {
            requestId,
            completedAt: Date.now(),
            changeIds: results.changeIds,
            metrics: processingState.metrics
          };
        }
      }

      // Handle recommendations
      if (recommendations) {
        await this.handleProcessingRecommendations(processingState, recommendations);
      }

      // Update UI to show completion
      await this.updateProcessingCompletion(processingState, results);

      // Clean up processing locks
      this.processingLocks.delete(requestId);

      console.log(`[TrackEditsPlugin] AI processing completed: ${requestId} - ${results.changeIds.length} changes`);

    } catch (error) {
      console.error('[TrackEditsPlugin] Error handling AI processing complete event:', error);
      await this.publishErrorEvent('error.ai.processing.complete', {
        message: 'Failed to handle AI processing complete event',
        error: error.message,
        context: { requestId: event.payload?.requestId }
      });
    }
  }

  private async handleAIProcessingErrorEvent(event: any): Promise<void> {
    try {
      const errorEvent = event as any; // Type will be AIProcessingErrorEvent
      const { requestId, error, context, recovery } = errorEvent.payload;

      const processingState = this.aiProcessingStates.get(requestId);
      if (!processingState) {
        console.warn(`[TrackEditsPlugin] Error event for unknown request: ${requestId}`);
        return;
      }

      // Update processing state
      processingState.status = 'error';
      processingState.errorDetails = {
        type: error.type,
        message: error.message,
        recoverable: error.recoverability === 'recoverable'
      };

      // Move from active to failed queue
      const activeIndex = this.processingQueue.active.findIndex(state => state.requestId === requestId);
      if (activeIndex !== -1) {
        this.processingQueue.active.splice(activeIndex, 1);
        this.processingQueue.failed.push(processingState);
      }

      // Handle error recovery
      await this.handleProcessingError(processingState, error, context, recovery);

      // Update session if applicable
      if (processingState.sessionId) {
        const session = this.editTracker.getSession(processingState.sessionId);
        if (session && session.metadata?.activeAIProcessing === requestId) {
          delete session.metadata.activeAIProcessing;
          session.metadata.lastAIError = {
            requestId,
            errorAt: Date.now(),
            error: error.message,
            recoverable: processingState.errorDetails.recoverable
          };
        }
      }

      // Update UI to show error state
      await this.updateProcessingError(processingState);

      // Clean up processing locks
      this.processingLocks.delete(requestId);

      console.error(`[TrackEditsPlugin] AI processing failed: ${requestId} - ${error.message}`);

    } catch (handlerError) {
      console.error('[TrackEditsPlugin] Error handling AI processing error event:', handlerError);
    }
  }

  // AI Processing Coordination Methods
  private async prepareForAIProcessing(processingState: AIProcessingState): Promise<void> {
    try {
      // Set processing lock to prevent conflicts
      this.processingLocks.set(processingState.requestId, true);

      // Prepare batch manager for incoming changes
      if (this.batchManager) {
        await this.batchManager.prepareForAIBatch(processingState.requestId, {
          expectedChanges: processingState.input.content.length > 1000 ? 10 : 5,
          provider: processingState.operation.provider,
          model: processingState.operation.model,
          operationType: processingState.operation.type
        });
      }

      // Clear any conflicting decorations
      if (this.currentEditorView) {
        this.removeDecorationsFromView(this.currentEditorView);
      }

      // Notify other systems of preparation
      console.log(`[TrackEditsPlugin] Prepared for AI processing: ${processingState.requestId}`);
    } catch (error) {
      console.error('[TrackEditsPlugin] Error preparing for AI processing:', error);
      throw error;
    }
  }

  private async updateProcessingUI(processingState: AIProcessingState): Promise<void> {
    try {
      // Update side panel with processing status
      if (this.sidePanelView) {
        this.sidePanelView.updateProcessingStatus({
          requestId: processingState.requestId,
          status: processingState.status,
          progress: processingState.progress,
          sourcePlugin: processingState.sourcePlugin
        });
      }

      // Update ribbon icon to show processing
      this.updateRibbonIcon();

    } catch (error) {
      console.error('[TrackEditsPlugin] Error updating processing UI:', error);
    }
  }

  private async updateProcessingProgress(processingState: AIProcessingState, partialResults?: any): Promise<void> {
    try {
      // Update UI with current progress
      if (this.sidePanelView) {
        this.sidePanelView.updateProcessingProgress({
          requestId: processingState.requestId,
          progress: processingState.progress,
          metrics: processingState.metrics,
          partialResults: partialResults
        });
      }

      // Show progress in status bar or notification if significant progress
      if (processingState.progress.percentage >= 50 && processingState.progress.percentage % 25 === 0) {
        console.log(`[TrackEditsPlugin] Processing ${processingState.progress.percentage}% complete: ${processingState.progress.stage}`);
      }

    } catch (error) {
      console.error('[TrackEditsPlugin] Error updating processing progress:', error);
    }
  }

  private async handlePartialResults(processingState: AIProcessingState, previewChanges: any[]): Promise<void> {
    try {
      // Show preview of changes in UI without applying them
      if (this.sidePanelView && previewChanges.length > 0) {
        this.sidePanelView.showChangePreview({
          requestId: processingState.requestId,
          previewChanges: previewChanges,
          stage: processingState.progress.stage
        });
      }

      console.log(`[TrackEditsPlugin] Received ${previewChanges.length} preview changes for ${processingState.requestId}`);
    } catch (error) {
      console.error('[TrackEditsPlugin] Error handling partial results:', error);
    }
  }

  private async coordinateChangeRecording(processingState: AIProcessingState, results: any): Promise<void> {
    try {
      // Record the AI operation in the session
      if (processingState.sessionId && results.changeIds.length > 0) {
        const session = this.editTracker.getSession(processingState.sessionId);
        if (session) {
          // Create AI processing record
          const aiProcessingRecord = {
            requestId: processingState.requestId,
            operationType: processingState.operation.type,
            provider: processingState.operation.provider,
            model: processingState.operation.model,
            changeIds: results.changeIds,
            confidence: results.confidence,
            appliedConstraints: results.appliedConstraints,
            processingTime: processingState.metrics?.responseTime || 0,
            completedAt: Date.now()
          };

          // Add to session metadata
          session.metadata = {
            ...session.metadata,
            aiProcessingHistory: [
              ...(session.metadata?.aiProcessingHistory || []),
              aiProcessingRecord
            ]
          };
        }
      }

      // Handle change grouping if specified
      if (results.changeGroupId && this.batchManager) {
        await this.batchManager.finalizeAIBatch(processingState.requestId, {
          changeGroupId: results.changeGroupId,
          changeIds: results.changeIds,
          confidence: results.confidence
        });
      }

      console.log(`[TrackEditsPlugin] Coordinated recording of ${results.changeIds.length} changes for ${processingState.requestId}`);
    } catch (error) {
      console.error('[TrackEditsPlugin] Error coordinating change recording:', error);
      throw error;
    }
  }

  private async handleProcessingRecommendations(processingState: AIProcessingState, recommendations: any): Promise<void> {
    try {
      // Handle review recommendations
      if (recommendations.suggestedReview && this.sidePanelView) {
        this.sidePanelView.highlightForReview({
          requestId: processingState.requestId,
          reason: 'AI processing recommends review',
          priority: 'medium'
        });
      }

      // Handle batching recommendations
      if (recommendations.recommendedBatching && this.batchManager) {
        await this.batchManager.applyBatchingRecommendation(
          processingState.requestId,
          recommendations.recommendedBatching
        );
      }

      // Handle follow-up actions
      if (recommendations.followupActions && recommendations.followupActions.length > 0) {
        console.log(`[TrackEditsPlugin] Follow-up actions recommended for ${processingState.requestId}:`, recommendations.followupActions);
      }

    } catch (error) {
      console.error('[TrackEditsPlugin] Error handling processing recommendations:', error);
    }
  }

  private async updateProcessingCompletion(processingState: AIProcessingState, results: any): Promise<void> {
    try {
      // Update UI to show completion
      if (this.sidePanelView) {
        this.sidePanelView.updateProcessingCompletion({
          requestId: processingState.requestId,
          results: results,
          metrics: processingState.metrics,
          duration: Date.now() - processingState.operation.startTime
        });
      }

      // Update ribbon icon back to normal
      this.updateRibbonIcon();

      // Show completion notification if significant operation
      if (results.changeIds.length > 5) {
        console.log(`[TrackEditsPlugin] AI processing completed: ${results.changeIds.length} changes applied with ${results.confidence}% confidence`);
      }

    } catch (error) {
      console.error('[TrackEditsPlugin] Error updating processing completion:', error);
    }
  }

  private async handleProcessingError(processingState: AIProcessingState, error: any, context: any, recovery: any): Promise<void> {
    try {
      // Handle recoverable errors
      if (error.recoverability === 'recoverable' && recovery.automaticRetryAvailable) {
        console.log(`[TrackEditsPlugin] Recoverable error for ${processingState.requestId}, retry may be available`);
        
        // Mark for potential retry (don't automatically retry from Track Edits)
        processingState.status = 'preparing';
        return;
      }

      // Handle non-recoverable errors
      if (recovery.manualInterventionRequired) {
        console.error(`[TrackEditsPlugin] Manual intervention required for ${processingState.requestId}: ${error.message}`);
        
        // Notify user of manual intervention need
        if (this.sidePanelView) {
          this.sidePanelView.showManualInterventionRequired({
            requestId: processingState.requestId,
            error: error.message,
            suggestedActions: recovery.suggestedActions
          });
        }
      }

      // Clean up any partial state
      if (context.partialResults && this.batchManager) {
        await this.batchManager.cleanupFailedBatch(processingState.requestId);
      }

      // Record error for debugging
      console.error(`[TrackEditsPlugin] Processing error handled for ${processingState.requestId}:`, {
        error: error.message,
        stage: context.stage,
        recoverable: error.recoverability === 'recoverable'
      });

    } catch (handlerError) {
      console.error('[TrackEditsPlugin] Error handling processing error:', handlerError);
    }
  }

  private async updateProcessingError(processingState: AIProcessingState): Promise<void> {
    try {
      // Update UI to show error state
      if (this.sidePanelView) {
        this.sidePanelView.updateProcessingError({
          requestId: processingState.requestId,
          error: processingState.errorDetails,
          duration: Date.now() - processingState.operation.startTime
        });
      }

      // Update ribbon icon back to normal
      this.updateRibbonIcon();

    } catch (error) {
      console.error('[TrackEditsPlugin] Error updating processing error UI:', error);
    }
  }

  // Processing State Management Utilities
  public getActiveProcessingOperations(): AIProcessingState[] {
    return Array.from(this.aiProcessingStates.values()).filter(state => 
      state.status === 'processing' || state.status === 'preparing'
    );
  }

  public getProcessingState(requestId: string): AIProcessingState | undefined {
    return this.aiProcessingStates.get(requestId);
  }

  public isProcessingActive(requestId?: string): boolean {
    if (requestId) {
      const state = this.aiProcessingStates.get(requestId);
      return state?.status === 'processing' || state?.status === 'preparing';
    }
    return this.getActiveProcessingOperations().length > 0;
  }

  public cancelProcessing(requestId: string): boolean {
    const state = this.aiProcessingStates.get(requestId);
    if (state && (state.status === 'processing' || state.status === 'preparing')) {
      state.status = 'cancelled';
      
      // Move from active to failed queue
      const activeIndex = this.processingQueue.active.findIndex(s => s.requestId === requestId);
      if (activeIndex !== -1) {
        this.processingQueue.active.splice(activeIndex, 1);
        this.processingQueue.failed.push(state);
      }
      
      this.processingLocks.delete(requestId);
      console.log(`[TrackEditsPlugin] Cancelled processing: ${requestId}`);
      return true;
    }
    return false;
  }

  private async waitForProcessingCompletion(requestId: string, timeoutMs: number): Promise<SubmitChangesFromAIResult> {
    const startTime = Date.now();
    const checkInterval = 1000; // Check every second

    return new Promise((resolve) => {
      const checkCompletion = () => {
        const processingState = this.aiProcessingStates.get(requestId);
        
        if (!processingState) {
          resolve({
            success: false,
            changeIds: [],
            errors: ['Processing state not found'],
            warnings: []
          });
          return;
        }

        if (processingState.status === 'completed') {
          // Extract results from processing state
          resolve({
            success: true,
            changeIds: [], // Would be populated from actual results
            errors: [],
            warnings: [`Coordinated with completed operation: ${requestId}`]
          });
          return;
        }

        if (processingState.status === 'error' || processingState.status === 'cancelled') {
          resolve({
            success: false,
            changeIds: [],
            errors: [processingState.errorDetails?.message || 'Processing failed'],
            warnings: []
          });
          return;
        }

        if (Date.now() - startTime > timeoutMs) {
          resolve({
            success: false,
            changeIds: [],
            errors: ['Coordination timeout'],
            warnings: [`Processing still active after ${timeoutMs}ms`]
          });
          return;
        }

        // Continue checking
        setTimeout(checkCompletion, checkInterval);
      };

      checkCompletion();
    });
  }

  private async publishAIProcessingStartEvent(payload: any, sessionId?: string): Promise<void> {
    try {
      if (!this.eventBusConnection) return;

      await this.eventBusConnection.publish({
        type: 'ai.processing.start',
        sourcePlugin: 'track-edits',
        targetPlugin: '*',
        timestamp: Date.now(),
        sessionId,
        schemaVersion: '2.0.0',
        payload
      });
    } catch (error) {
      console.error('[TrackEditsPlugin] Error publishing AI processing start event:', error);
    }
  }

  private async publishAIProcessingProgressEvent(requestId: string, progress: any, partialResults?: any, metrics?: any): Promise<void> {
    try {
      if (!this.eventBusConnection) return;

      await this.eventBusConnection.publish({
        type: 'ai.processing.progress',
        sourcePlugin: 'track-edits',
        targetPlugin: '*',
        timestamp: Date.now(),
        schemaVersion: '2.0.0',
        payload: {
          requestId,
          progress,
          partialResults,
          metrics
        }
      });
    } catch (error) {
      console.error('[TrackEditsPlugin] Error publishing AI processing progress event:', error);
    }
  }

  private async publishAIProcessingCompleteEvent(payload: any, sessionId?: string): Promise<void> {
    try {
      if (!this.eventBusConnection) return;

      await this.eventBusConnection.publish({
        type: 'ai.processing.complete',
        sourcePlugin: 'track-edits',
        targetPlugin: '*',
        timestamp: Date.now(),
        sessionId,
        schemaVersion: '2.0.0',
        payload
      });
    } catch (error) {
      console.error('[TrackEditsPlugin] Error publishing AI processing complete event:', error);
    }
  }

  private async publishAIProcessingErrorEvent(requestId: string, errorType: string, message: string, context?: any, recovery?: any): Promise<void> {
    try {
      if (!this.eventBusConnection) return;

      await this.eventBusConnection.publish({
        type: 'ai.processing.error',
        sourcePlugin: 'track-edits',
        targetPlugin: '*',
        timestamp: Date.now(),
        schemaVersion: '2.0.0',
        payload: {
          requestId,
          error: {
            type: errorType,
            message,
            code: errorType.toUpperCase(),
            recoverability: recovery ? 'recoverable' : 'non-recoverable'
          },
          context: context || {
            stage: 'unknown',
            partialResults: [],
            resourceUsage: {}
          },
          recovery: recovery || {
            automaticRetryAvailable: false,
            manualInterventionRequired: true,
            suggestedActions: ['Check logs', 'Retry operation'],
            fallbackOptions: []
          }
        }
      });
    } catch (error) {
      console.error('[TrackEditsPlugin] Error publishing AI processing error event:', error);
    }
  }

  /**
   * Publish a change event through the event bus
   */
  private async publishChangeEvent(
    type: WriterrlChangeEvent['type'],
    payload: WriterrlChangeEvent['payload'],
    sessionId?: string,
    documentId?: string
  ): Promise<void> {
    try {
      const event = EventBusUtils.createChangeEvent(
        type,
        'track-edits',
        payload,
        sessionId || this.currentSession?.id,
        documentId || this.app.workspace.getActiveFile()?.path,
        ['writerr-chat', 'editorial-engine']
      );

      // Try to publish via event bus first
      if (this.eventBusConnection && this.eventBusConnection.isConnected()) {
        await this.eventBusConnection.publish(type, event, {
          persistent: type === 'change.ai.complete' || type === 'change.ai.error'
        });
      } else if (this.eventPersistence) {
        // Store for offline synchronization if event bus not available
        await this.eventPersistence.storeEventSafe({
          type,
          data: event,
          timestamp: new Date(),
          eventId: `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        });
        console.log(`[TrackEdits] Event stored for offline sync: ${type}`);
      }
    } catch (error) {
      console.error('[TrackEdits EventBus] Failed to publish change event:', error);
    }
  }

  /**
   * Publish a session event through the event bus
   */
  private async publishSessionEvent(
    type: WriterrlSessionEvent['type'],
    payload: WriterrlSessionEvent['payload'],
    sessionId?: string,
    documentId?: string
  ): Promise<void> {
    try {
      const event = EventBusUtils.createSessionEvent(
        type,
        'track-edits',
        payload,
        sessionId || this.currentSession?.id,
        documentId || this.app.workspace.getActiveFile()?.path,
        ['writerr-chat', 'editorial-engine']
      );

      // Try to publish via event bus first
      if (this.eventBusConnection && this.eventBusConnection.isConnected()) {
        await this.eventBusConnection.publish(type, event, {
          persistent: true
        });
      } else if (this.eventPersistence) {
        // Store for offline synchronization if event bus not available
        await this.eventPersistence.storeEventSafe({
          type,
          data: event,
          timestamp: new Date(),
          eventId: `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        });
        console.log(`[TrackEdits] Session event stored for offline sync: ${type}`);
      }
    } catch (error) {
      console.error('[TrackEdits EventBus] Failed to publish session event:', error);
    }
  }

  /**
   * Publish an error event through the event bus
   */
  private async publishErrorEvent(
    type: WriterrlErrorEvent['type'],
    payload: WriterrlErrorEvent['payload'],
    sessionId?: string,
    documentId?: string
  ): Promise<void> {
    try {
      const event = EventBusUtils.createErrorEvent(
        type,
        'track-edits',
        payload,
        sessionId || this.currentSession?.id,
        documentId || this.app.workspace.getActiveFile()?.path,
        ['writerr-chat', 'editorial-engine']
      );

      // Try to publish via event bus first
      if (this.eventBusConnection && this.eventBusConnection.isConnected()) {
        await this.eventBusConnection.publish(type, event, {
          persistent: payload.severity === 'critical' || payload.severity === 'high'
        });
      } else if (this.eventPersistence) {
        // Store for offline synchronization if event bus not available
        await this.eventPersistence.storeEventSafe({
          type,
          data: event,
          timestamp: new Date(),
          eventId: `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        });
        console.log(`[TrackEdits] Error event stored for offline sync: ${type}`);
      }
    } catch (error) {
      console.error('[TrackEdits EventBus] Failed to publish error event:', error);
    }
  }

  /**
   * Clean up event bus connection and resources
   */
  private async cleanupEventBusConnection(): Promise<void> {
    try {
      if (this.eventBusConnection) {
        await this.eventBusConnection.disconnect();
        this.eventBusConnection = null;
        console.log('[TrackEditsPlugin] Event bus connection cleaned up');
      }
    } catch (error) {
      console.error('[TrackEditsPlugin] Error during event bus cleanup:', error);
    }
  }

  /**
   * Register the Editorial Engine as a built-in plugin
   */
  private async registerEditorialEnginePlugin(): Promise<void> {
    if (!this.pluginRegistry) return;

    // Create Editorial Engine plugin wrapper
    const editorialEnginePlugin: IAIProcessingPlugin = new EditorialEnginePluginWrapper();

    try {
      const result = await this.pluginRegistry.registerPlugin(editorialEnginePlugin, {
        validateCodeSignature: false, // Built-in plugin, no signature needed
        allowNetworkAccess: true,
        allowStorageAccess: true,
        maxMemoryUsage: 100 * 1024 * 1024, // 100MB
        rateLimitConfig: {
          requestsPerMinute: 120,
          requestsPerHour: 3600,
          burstLimit: 20,
          cooldownPeriod: 500
        },
        sandboxEnabled: false // Built-in plugin, trusted
      });

      if (result.success) {
        console.log('[TrackEditsPlugin] Editorial Engine plugin registered successfully');
      } else {
        console.warn('[TrackEditsPlugin] Editorial Engine plugin registration failed:', result.errors);
      }
    } catch (error) {
      console.error('[TrackEditsPlugin] Editorial Engine plugin registration error:', error);
    }
  }

  /**
   * Public API for registering AI processing plugins
   */
  public async registerAIProcessingPlugin(plugin: IAIProcessingPlugin): Promise<PluginRegistrationResult> {
    if (!this.pluginRegistry) {
      return {
        success: false,
        pluginId: '',
        authToken: '',
        permissions: [],
        errors: ['Plugin registration system not initialized'],
        warnings: [],
        expiresAt: new Date()
      };
    }

    return await this.pluginRegistry.registerPlugin(plugin);
  }

  /**
   * Public API for unregistering plugins
   */
  public async unregisterAIProcessingPlugin(pluginId: string, reason?: string): Promise<boolean> {
    if (!this.pluginRegistry) {
      return false;
    }

    return await this.pluginRegistry.unregisterPlugin(pluginId, reason);
  }

  /**
   * Get all registered plugins
   */
  public getRegisteredPlugins(): IAIProcessingPlugin[] {
    if (!this.pluginRegistry) {
      return [];
    }

    return this.pluginRegistry.getPlugins();
  }

  /**
   * Get plugin by ID
   */
  public getRegisteredPlugin(pluginId: string): IAIProcessingPlugin | undefined {
    if (!this.pluginRegistry) {
      return undefined;
    }

    return this.pluginRegistry.getPlugin(pluginId);
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

    // Initialize the plugin API for external plugin integration
    initializeTrackEditsPluginAPI(this);
  }

  private cleanupGlobalAPI() {
    if (window.WriterrlAPI && window.WriterrlAPI.trackEdits) {
      delete window.WriterrlAPI.trackEdits;
    }

    // Cleanup the plugin API
    cleanupTrackEditsPluginAPI();
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
    this.ribbonIconEl = super.addRibbonIcon('edit', 'Track Edits', (evt: MouseEvent) => {
      // Use ToggleStateManager to handle ribbon clicks
      if (this.toggleStateManager) {
        this.toggleStateManager.setTrackingEnabled(!this.toggleStateManager.isTrackingEnabled);
      } else {
        // Fallback to direct toggle
        this.debouncedRibbonClick();
      }
    });
    
    // Connect ribbon icon to ToggleStateManager
    if (this.ribbonIconEl && this.toggleStateManager) {
      this.toggleStateManager.setRibbonIcon(this.ribbonIconEl);
    }
    
    this.updateRibbonIcon();
  }

  private updateRibbonIcon() {
    if (this.ribbonIconEl) {
      const isTracking = !!this.currentSession;
      const tooltipText = isTracking ? 'Track Edits: ON (Click to stop)' : 'Track Edits: OFF (Click to start)';
      this.ribbonIconEl.setAttribute('aria-label', tooltipText);
      this.ribbonIconEl.setAttribute('title', tooltipText);
    }
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
    
    // Update ribbon icon tooltip
    this.updateRibbonIcon();
    
    // Update side panel to show new status
    this.updateSidePanel();
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
        
        // Clear all decorations from the document
        this.clearAllDecorations();
        
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
    
    // Update ribbon icon tooltip
    this.updateRibbonIcon();
    
    // Update side panel to show new status
    this.updateSidePanel();
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

    // Debug: Log all edits in cluster before filtering
    DebugMonitor.log('REJECT_ALL_EDITS_IN_CLUSTER', {
      allEdits: cluster.edits.map(e => ({ id: e.id, type: e.type, from: e.from, to: e.to, textLength: e.text?.length || 0 }))
    });

    // Process both insertions (remove) and deletions (restore)
    const insertionsToRemove = cluster.edits
      .filter(edit => edit.type === 'insert')
      .sort((a, b) => b.from - a.from); // Reverse order to avoid position shifts

    const deletionsToRestore = cluster.edits
      .filter(edit => edit.type === 'delete')
      .sort((a, b) => a.from - b.from); // Forward order for deletions

    DebugMonitor.log('REJECT_FILTERED_EDITS', {
      insertionsToRemove: insertionsToRemove.map(e => ({ id: e.id, type: e.type, from: e.from, to: e.to, textLength: e.text?.length || 0 })),
      deletionsToRestore: deletionsToRestore.map(e => ({ id: e.id, type: e.type, from: e.from, to: e.to, removedTextLength: e.removedText?.length || 0 }))
    });

    // Use CodeMirror directly like accept does, not Obsidian Editor API
    const doc = editorView.state.doc;
    
    // Revert text changes for insertions using CodeMirror API
    // Prevent recursion during our own edit
    isRejectingEdit = true;
    
    try {
      DebugMonitor.log('REJECT_TEXT_PROCESSING', {
        insertionsToRemove: insertionsToRemove.length,
        deletionsToRestore: deletionsToRestore.length,
        docLength: doc.length
      });
      
      // Build transaction to remove insertions and restore deletions
      const changes = [];
      
      // First, remove all insertions (in reverse order)
      for (const edit of insertionsToRemove) {
        if (edit.text) {
          DebugMonitor.log('REJECT_PROCESSING_INSERTION', {
            editId: edit.id,
            editText: edit.text,
            editFrom: edit.from,
            editTextLength: edit.text.length
          });
          
          // Validate text exists at expected position
          const currentText = doc.sliceString(edit.from, edit.from + edit.text.length);
          
          DebugMonitor.log('REJECT_TEXT_COMPARISON', {
            editId: edit.id,
            position: { from: edit.from, to: edit.from + edit.text.length },
            expectedText: edit.text,
            currentText,
            matches: currentText === edit.text
          });
          
          if (currentText === edit.text) {
            changes.push({ from: edit.from, to: edit.from + edit.text.length, insert: '' });
            DebugMonitor.log('REJECT_REVERT_INSERT', {
              editId: edit.id,
              removedText: edit.text
            });
          } else {
            DebugMonitor.log('REJECT_REVERT_SKIPPED', {
              editId: edit.id,
              reason: 'text mismatch',
              expected: edit.text,
              found: currentText
            });
          }
        }
      }

      // Then, restore all deletions (in forward order)
      for (const edit of deletionsToRestore) {
        if (edit.removedText) {
          DebugMonitor.log('REJECT_PROCESSING_DELETION', {
            editId: edit.id,
            removedText: edit.removedText,
            editFrom: edit.from,
            removedTextLength: edit.removedText.length
          });
          
          // Insert the deleted text back at its original position
          changes.push({ from: edit.from, to: edit.from, insert: edit.removedText });
          DebugMonitor.log('REJECT_RESTORE_DELETION', {
            editId: edit.id,
            restoredText: edit.removedText,
            position: edit.from
          });
        }
      }
      
      // Apply all text changes and decoration removals in single transaction
      const decorationRemoveEffects = cluster.edits.map(edit => 
        removeDecorationEffect.of(edit.id)
      );
      
      if (changes.length > 0) {
        const transaction = editorView.state.update({ 
          changes,
          effects: decorationRemoveEffects
        });
        editorView.dispatch(transaction);
        DebugMonitor.log('REJECT_CHANGES_APPLIED', {
          changeCount: changes.length,
          effectCount: decorationRemoveEffects.length
        });
      } else {
        // Only dispatch decoration effects if no text changes
        editorView.dispatch({
          effects: decorationRemoveEffects
        });
      }
      
      DebugMonitor.log('REJECT_DISPATCH_COMPLETE', {
        processedEdits: insertionsToRemove.length + deletionsToRestore.length,
        effectCount: decorationRemoveEffects.length
      });
    } finally {
      isRejectingEdit = false;
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

  // Batch operations for better performance
  acceptAllEditClusters(clusterIds: string[]) {
    const timer = DebugMonitor.startTimer('acceptAllEditClusters');
    DebugMonitor.log('ACCEPT_ALL_START', { clusterIds, count: clusterIds.length });
    
    // Process all clusters without intermediate side panel updates
    clusterIds.forEach(clusterId => {
      const cluster = this.clusterManager.getCluster(clusterId);
      if (cluster && this.currentEditorView) {
        // Remove decorations for each cluster
        cluster.edits.forEach(edit => {
          this.currentEditorView!.dispatch({
            effects: removeDecorationEffect.of(edit.id)
          });
        });
        
        // Remove edits from current edits array
        this.currentEdits = this.currentEdits.filter(edit => 
          !cluster.edits.find(clusterEdit => clusterEdit.id === edit.id)
        );
      }
    });
    
    // Single side panel update at the end
    this.updateSidePanel();
    
    DebugMonitor.log('ACCEPT_ALL_COMPLETE', {
      processedCount: clusterIds.length,
      remainingEdits: this.currentEdits.length
    });
    DebugMonitor.endTimer(timer);
  }

  rejectAllEditClusters(clusterIds: string[]) {
    const timer = DebugMonitor.startTimer('rejectAllEditClusters');
    DebugMonitor.log('REJECT_ALL_START', { clusterIds, count: clusterIds.length });
    
    // Process all clusters without intermediate side panel updates
    clusterIds.forEach(clusterId => {
      const cluster = this.clusterManager.getCluster(clusterId);
      if (cluster && this.currentEditorView) {
        // Group edits by type
        const insertionsToRemove = cluster.edits.filter(edit => edit.type === 'insert');
        const deletionsToRestore = cluster.edits.filter(edit => edit.type === 'delete');
        
        // Remove decorations and restore text
        cluster.edits.forEach(edit => {
          this.currentEditorView!.dispatch({
            effects: removeDecorationEffect.of(edit.id)
          });
        });
        
        // Apply CodeMirror changes for text restoration
        if (insertionsToRemove.length > 0 || deletionsToRestore.length > 0) {
          const doc = this.currentEditorView.state.doc;
          const changes: ChangeSpec[] = [];
          
          // Remove insertions and restore deletions
          for (const edit of insertionsToRemove) {
            if (edit.text) {
              const currentText = doc.sliceString(edit.from, edit.from + edit.text.length);
              if (currentText === edit.text) {
                changes.push({ from: edit.from, to: edit.from + edit.text.length, insert: '' });
              }
            }
          }
          
          for (const edit of deletionsToRestore) {
            if (edit.removedText) {
              changes.push({ from: edit.from, to: edit.from, insert: edit.removedText });
            }
          }
          
          if (changes.length > 0) {
            this.currentEditorView.dispatch({ changes });
          }
        }
        
        // Remove edits from current edits array
        this.currentEdits = this.currentEdits.filter(edit => 
          !cluster.edits.find(clusterEdit => clusterEdit.id === edit.id)
        );
      }
    });
    
    // Single side panel update at the end
    this.updateSidePanel();
    
    DebugMonitor.log('REJECT_ALL_COMPLETE', {
      processedCount: clusterIds.length,
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

  private handleToggleOff() {
    // Epic's decision tree: Check for pending edits
    const pendingEditCount = this.currentEdits.length;
    
    DebugMonitor.log('HANDLE_TOGGLE_OFF', {
      pendingEdits: pendingEditCount,
      hasSession: !!this.currentSession
    });

    // If no pending edits, toggle off directly
    if (pendingEditCount === 0) {
      DebugMonitor.log('TOGGLE_OFF_NO_EDITS', { action: 'direct_toggle' });
      this.stopTracking();
      return;
    }

    // TODO: Add "skip confirmation" logic in future update when checkbox is working

    // Show confirmation modal for pending edits (Epic's core UX pattern)
    DebugMonitor.log('TOGGLE_OFF_SHOW_MODAL', { pendingEdits: pendingEditCount });
    this.showToggleConfirmationModal(pendingEditCount);
  }

  private showToggleConfirmationModal(editCount: number) {
    const modal = new ToggleConfirmationModal(this.app, {
      editCount,
      onConfirm: () => {
        DebugMonitor.log('TOGGLE_CONFIRMATION_CONFIRMED', { editCount });
        this.discardEditsAndStop();
      },
      onCancel: () => {
        DebugMonitor.log('TOGGLE_CONFIRMATION_CANCELLED', { editCount });
        // Reset toggle state back to enabled since user cancelled
        // Do NOT call setTrackingEnabled as it triggers the callback again
        // Just update the UI state directly
        if (this.toggleStateManager && this.ribbonIconEl) {
          // Manually update UI without triggering callback
          this.ribbonIconEl.classList.add('track-edits-enabled');
          this.ribbonIconEl.classList.remove('track-edits-disabled');
        }
      }
    });
    
    modal.open();
  }

  private discardEditsAndStop() {
    // CRITICAL: Stop tracking FIRST to prevent new edits during rejection
    this.stopTracking();
    
    // Epic's approach: Use existing proven reject functionality
    const clusters = this.clusterManager.clusterEdits(this.currentEdits);
    const clusterIds = clusters.map(cluster => cluster.id);
    
    if (clusterIds.length > 0) {
      DebugMonitor.log('DISCARD_EDITS_VIA_REJECT', { 
        clusterCount: clusterIds.length,
        method: 'rejectAllEditClusters'
      });
      // Leverage existing battle-tested reject functionality
      this.rejectAllEditClusters(clusterIds);
    } else {
      // Fallback to direct clearing if no clusters
      DebugMonitor.log('DISCARD_EDITS_DIRECT_CLEAR', { 
        editCount: this.currentEdits.length,
        method: 'clearAllDecorations'
      });
      this.clearAllDecorations();
    }
  }

  private clearAllDecorations() {
    let editorView = this.currentEditorView;
    
    // If no stored view, try to find current one
    if (!editorView) {
      editorView = this.findCurrentEditorView();
    }
    
    if (!editorView) {
      DebugMonitor.log('CLEAR_ALL_DECORATIONS_FAILED', { reason: 'no editor view available' });
      return;
    }

    DebugMonitor.log('CLEAR_ALL_DECORATIONS_START', {
      currentEditsCount: this.currentEdits.length,
      hasEditorView: !!editorView
    });

    // Use our custom clear all decorations effect
    editorView.dispatch({
      effects: clearAllDecorationsEffect.of(true)
    });

    DebugMonitor.log('CLEAR_ALL_DECORATIONS_COMPLETE', {
      method: 'clearAllDecorationsEffect'
    });
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
    
    // Check both settings and toggle state manager
    const isTrackingEnabled = this.settings.enableTracking && 
                              (!this.toggleStateManager || this.toggleStateManager.isTrackingEnabled);
    
    if (!isTrackingEnabled || !this.currentSession) {
      DebugMonitor.log('HANDLE_EDITS_SKIPPED', {
        reason: !this.settings.enableTracking ? 'settings disabled' : 
                !this.toggleStateManager?.isTrackingEnabled ? 'toggle disabled' : 'no session'
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

  // AI Integration Methods (stubs for future implementation)
  async runAIAnalysisOnce(): Promise<void> {
    console.log('Track Edits: AI analysis triggered manually');
    
    // TODO: Implement AI analysis using AI Providers plugin integration
    // This will analyze current edit clusters and provide insights
    
    // For now, just log the current state
    DebugMonitor.log('AI_ANALYSIS_TRIGGERED', {
      clustersCount: this.currentEdits.length,
      hasSession: !!this.currentSession,
      aiProvider: this.settings.aiProvider,
      aiModel: this.settings.aiModel
    });
    
    // Simulate AI processing delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    console.log('Track Edits: AI analysis complete (stub)');
  }

  private async loadSystemPrompt(): Promise<string> {
    try {
      const promptPath = this.settings.systemPromptPath;
      const adapter = this.app.vault.adapter;
      
      // Check if prompt file exists
      if (await adapter.exists(promptPath)) {
        return await adapter.read(promptPath);
      } else {
        // Create default prompt file if it doesn't exist
        const defaultPrompt = await this.getDefaultSystemPrompt();
        await adapter.write(promptPath, defaultPrompt);
        return defaultPrompt;
      }
    } catch (error) {
      console.error('Track Edits: Error loading system prompt:', error);
      return this.getDefaultSystemPrompt();
    }
  }

  private async getDefaultSystemPrompt(): Promise<string> {
    return `# Track Edits AI Analysis System Prompt\n\nYou are a Track Edits SME specializing in analyzing keystroke patterns and typing behavior.\n\nAnalyze edit clusters to identify user intent and provide workflow insights.\n\nFocus on typing patterns, not content quality.`;
  }

  /**
   * Editorial Engine integration API for submitting AI-generated changes
   * Task 2.2: Platform Integration - Primary interface between Editorial Engine and Track Edits
   * 
   * @param changes Array of EditChange objects to record
   * @param aiProvider AI provider identifier (e.g., 'anthropic-claude', 'openai-gpt')  
   * @param aiModel AI model identifier (e.g., 'claude-3-sonnet', 'gpt-4')
   * @param processingContext Optional context about AI processing settings and constraints
   * @param options Optional configuration for session management and validation behavior
   * @returns Promise resolving to detailed result with success status, IDs, and error information
   */
  async submitChangesFromAI(
    changes: EditChange[],
    aiProvider: string,
    aiModel: string,
    processingContext?: AIProcessingContext,
    options: SubmitChangesFromAIOptions = {}
  ): Promise<SubmitChangesFromAIResult> {
    // Import error handling components at the top of the method
    const { AISubmissionErrorManager } = await import('./error-handling/ai-submission-error-manager');
    const { RetryRecoveryManager } = await import('./error-handling/retry-recovery-manager');

    // Initialize error handling and recovery managers
    const errorManager = new AISubmissionErrorManager(this.batchManager);
    const retryManager = new RetryRecoveryManager();

    const result: SubmitChangesFromAIResult = {
      success: false,
      changeIds: [],
      errors: [],
      warnings: []
    };

    // Generate operation ID for tracking
    const operationId = `ai_submit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    let transactionId: string | undefined;

    try {
      // Initialize change consolidation manager
      const { ChangeConsolidationManager } = await import('./change-consolidation-manager');
      const consolidationManager = new ChangeConsolidationManager();

      // Create multi-plugin operation for consolidation
      const multiPluginOperation = {
        id: operationId,
        pluginId: 'track-edits',
        pluginVersion: '1.0.0',
        sessionId: options.sessionId,
        documentPath: this.app.workspace.getActiveFile()?.path || 'unknown',
        changes: changes.map(change => ({
          ...change,
          pluginId: 'track-edits',
          operationId: operationId,
          semanticContext: processingContext?.constraints?.some(c => c.includes('semantic')) ? {
            intention: 'enhancement' as const,
            scope: 'paragraph' as const,
            confidence: 0.8,
            preserveFormatting: true,
            preserveContent: true
          } : undefined
        })),
        timestamp: Date.now(),
        priority: options.priority || 2, // HIGH priority for user-initiated Track Edits operations
        capabilities: {
          canMergeWith: ['editorial-engine', 'writerr-chat'],
          conflictResolution: ['auto_merge', 'priority_override'],
          maxConcurrentOperations: 5,
          supportsRealTimeConsolidation: true,
          supportedChangeTypes: ['insert', 'delete', 'replace']
        },
        metadata: {
          userInitiated: !options.automated,
          batchId: processingContext?.batchId,
          estimatedProcessingTime: changes.length * 1000, // Rough estimate
          requiresUserReview: changes.length > 10,
          canBeDeferred: false,
          tags: processingContext?.constraints || []
        }
      };

      // Submit operation for consolidation
      const consolidationResult = await consolidationManager.submitOperation(multiPluginOperation);
      
      if (!consolidationResult.success) {
        result.errors.push(...(consolidationResult.errors || []));
        result.warnings.push(...(consolidationResult.warnings || []));
        
        if (consolidationResult.errors && consolidationResult.errors.length > 0) {
          return result;
        }
      }

      if (consolidationResult.requiresConsolidation) {
        result.warnings.push('Multi-plugin consolidation required - changes coordinated with other plugins');
        
        if (consolidationResult.estimatedWaitTime && consolidationResult.estimatedWaitTime > 0) {
          result.warnings.push(`Estimated wait time for consolidation: ${consolidationResult.estimatedWaitTime}ms`);
        }
      }

      // Check for concurrent processing operations to coordinate
      const activeOperations = this.getActiveProcessingOperations();
      if (activeOperations.length > 0) {
        console.log(`[TrackEditsPlugin] Active AI processing operations detected: ${activeOperations.length}`);
        
        // Check if this is a coordinated operation (from event-driven processing)
        const coordinatedOperation = activeOperations.find(op => 
          op.operation.provider === aiProvider && 
          op.operation.model === aiModel &&
          op.input.documentId === this.app.workspace.getActiveFile()?.path
        );

        if (coordinatedOperation && !options.forceProcessing) {
          // This appears to be a duplicate of an active operation - coordinate instead of process
          result.warnings.push(`Coordinating with active AI processing operation: ${coordinatedOperation.requestId}`);
          
          // Wait for the coordinated operation to complete
          const coordinatedResult = await this.waitForProcessingCompletion(coordinatedOperation.requestId, 30000);
          if (coordinatedResult.success) {
            return coordinatedResult;
          } else {
            result.warnings.push('Coordinated operation failed, proceeding with independent processing');
          }
        } else {
          result.warnings.push('Multiple concurrent AI operations detected - processing independently');
        }
      }

      // Create processing state for this operation
      const requestId = operationId;
      const processingState: AIProcessingState = {
        requestId,
        operation: {
          type: processingContext?.operationType || 'ai_submission',
          provider: aiProvider,
          model: aiModel,
          startTime: Date.now()
        },
        input: {
          documentId: this.app.workspace.getActiveFile()?.path || 'unknown',
          content: changes.map(c => c.content).join('\n'),
          userPrompt: processingContext?.userPrompt || 'AI submission via Track Edits',
          constraints: processingContext?.constraints
        },
        status: 'preparing',
        progress: {
          percentage: 0,
          stage: 'initializing'
        },
        sourcePlugin: 'track-edits',
        sessionId: options.sessionId
      };

      // Add to processing state management
      this.aiProcessingStates.set(requestId, processingState);
      this.processingQueue.active.push(processingState);

      // Publish AI processing start event for platform coordination
      await this.publishAIProcessingStartEvent({
        requestId,
        operation: processingState.operation,
        input: processingState.input,
        config: {
          maxRetries: options.maxRetries || 3,
          timeoutMs: 300000, // 5 minutes
          expectedDuration: changes.length * 1000 // Rough estimate
        },
        pluginContext: {
          sourcePluginId: 'track-edits',
          sourcePluginVersion: '1.0.0',
          processingCapabilities: ['change_tracking', 'session_management', 'batch_processing']
        }
      }, options.sessionId);

      // Update processing state to processing
      processingState.status = 'processing';
      processingState.progress = { percentage: 10, stage: 'validating' };

      // Input validation
      if (!changes || changes.length === 0) {
        processingState.status = 'error';
        processingState.errorDetails = {
          type: 'validation',
          message: 'No changes provided',
          recoverable: false
        };
        result.errors.push('No changes provided');
        await this.publishAIProcessingErrorEvent(requestId, 'validation', 'No changes provided');
        return result;
      }

      if (!aiProvider || !aiModel) {
        processingState.status = 'error';
        processingState.errorDetails = {
          type: 'validation',
          message: 'AI provider and model are required',
          recoverable: false
        };
        result.errors.push('AI provider and model are required');
        await this.publishAIProcessingErrorEvent(requestId, 'validation', 'AI provider and model are required');
        return result;
      }

      // Update progress
      processingState.progress = { percentage: 20, stage: 'authenticating' };
      await this.publishAIProcessingProgressEvent(requestId, processingState.progress, null, {
        tokensProcessed: 0,
        responseTime: Date.now() - processingState.operation.startTime,
        memoryUsage: 0
      });

      // Plugin system integration - validate plugin authentication if provided
      if (this.pluginRegistry && (options as any).pluginAuthContext) {
        const pluginOptions = options as any; // Type assertion for plugin options
        const pluginAuthContext = pluginOptions.pluginAuthContext;

        // Authenticate plugin
        const authResult = await this.pluginRegistry.authenticatePlugin(
          pluginAuthContext.pluginId,
          {
            pluginId: pluginAuthContext.pluginId,
            authToken: pluginAuthContext.sessionToken,
            timestamp: new Date(),
            nonce: Math.random().toString(36).substring(2, 15)
          }
        );

        if (!authResult) {
          processingState.status = 'error';
          processingState.errorDetails = {
            type: 'authentication',
            message: 'Plugin authentication failed',
            recoverable: false
          };
          result.errors.push('Plugin authentication failed');
          await this.publishAIProcessingErrorEvent(requestId, 'authentication', 'Plugin authentication failed');
          return result;
        }

        // Validate plugin permissions for document modification
        const permissionResult = await this.pluginRegistry.validatePermissions(
          pluginAuthContext.pluginId,
          ['modify_documents', 'create_sessions'], // Convert to PluginPermission enum
          { operation: 'ai_submission', context: processingContext }
        );

        if (!permissionResult.hasPermission) {
          processingState.status = 'error';
          processingState.errorDetails = {
            type: 'permission',
            message: `Plugin lacks required permissions: ${permissionResult.missingPermissions.join(', ')}`,
            recoverable: false
          };
          result.errors.push(`Plugin lacks required permissions: ${permissionResult.missingPermissions.join(', ')}`);
          result.warnings.push(...permissionResult.warnings);
          await this.publishAIProcessingErrorEvent(requestId, 'permission', `Plugin lacks required permissions: ${permissionResult.missingPermissions.join(', ')}`);
          return result;
        }

        // Validate plugin capabilities
        const plugin = this.pluginRegistry.getPlugin(pluginAuthContext.pluginId);
        if (plugin) {
          const capabilityValid = await plugin.validateCapability('ai_submission');
          if (!capabilityValid) {
            result.warnings.push('Plugin may not fully support this type of AI submission');
          }

          // Check batch size limits
          const pluginInfo = plugin.getPluginInfo();
          if (changes.length > pluginInfo.capabilities.maxBatchSize) {
            processingState.status = 'error';
            processingState.errorDetails = {
              type: 'capability',
              message: `Batch size ${changes.length} exceeds plugin limit ${pluginInfo.capabilities.maxBatchSize}`,
              recoverable: true
            };
            result.errors.push(`Batch size ${changes.length} exceeds plugin limit ${pluginInfo.capabilities.maxBatchSize}`);
            await this.publishAIProcessingErrorEvent(requestId, 'capability', `Batch size exceeds limit`);
            return result;
          }

          // Check AI provider support
          if (!pluginInfo.capabilities.aiProviders.includes(aiProvider)) {
            result.warnings.push(`Plugin may not be optimized for AI provider: ${aiProvider}`);
          }
        }

        // Add plugin attribution to processing context
        if (processingContext) {
          processingContext = {
            ...processingContext,
            metadata: {
              ...processingContext.metadata,
              pluginId: pluginAuthContext.pluginId,
              pluginVersion: plugin?.getPluginInfo().version,
              submissionTime: new Date().toISOString()
            }
          };
        }

        result.warnings.push(...permissionResult.warnings);
        console.log(`[TrackEditsPlugin] AI submission authenticated for plugin: ${pluginAuthContext.pluginId}`);
      }

      // Update progress - authentication complete
      processingState.progress = { percentage: 30, stage: 'session_management' };
      await this.publishAIProcessingProgressEvent(requestId, processingState.progress);

      // Handle session management with error handling
      let sessionId = options.sessionId;
      if (!sessionId && options.createSession) {
        sessionId = generateId();
        const activeFile = this.app.workspace.getActiveFile();
        if (activeFile) {
          const session: EditSession = {
            id: sessionId,
            startTime: Date.now(),
            changes: [],
            wordCount: 0,
            characterCount: 0
          };
          
          try {
            this.editTracker.startSession(session, activeFile);
          } catch (sessionError) {
            const errorContext = {
              operation: 'session_creation',
              sessionId: sessionId,
              aiProvider,
              aiModel
            };
            
            const handledError = await errorManager.handleError(sessionError, errorContext);
            result.errors.push(handledError.error.message);
            result.warnings.push('Session creation failed - changes will be processed without session tracking');
            
            // Continue without session if not critical
            if (handledError.error.severity === 'critical') {
              processingState.status = 'error';
              processingState.errorDetails = {
                type: 'session',
                message: handledError.error.message,
                recoverable: handledError.error.severity !== 'critical'
              };
              await this.publishAIProcessingErrorEvent(requestId, 'session', handledError.error.message);
              return result;
            }
            sessionId = undefined;
          }
        } else {
          processingState.status = 'error';
          processingState.errorDetails = {
            type: 'session',
            message: 'Cannot create session: no active file',
            recoverable: false
          };
          result.errors.push('Cannot create session: no active file');
          await this.publishAIProcessingErrorEvent(requestId, 'session', 'Cannot create session: no active file');
          return result;
        }
      }

      if (!sessionId) {
        processingState.status = 'error';
        processingState.errorDetails = {
          type: 'session',
          message: 'No session ID provided and createSession option not set',
          recoverable: false
        };
        result.errors.push('No session ID provided and createSession option not set');
        await this.publishAIProcessingErrorEvent(requestId, 'session', 'No session ID provided');
        return result;
      }

      // Update processing state with session ID
      processingState.sessionId = sessionId;

      // Validate session exists
      const session = this.editTracker.getSession(sessionId);
      if (!session) {
        processingState.status = 'error';
        processingState.errorDetails = {
          type: 'session',
          message: `Session ${sessionId} not found`,
          recoverable: false
        };
        result.errors.push(`Session ${sessionId} not found`);
        await this.publishAIProcessingErrorEvent(requestId, 'session', `Session not found`);
        return result;
      }

      // Update progress - session validated
      processingState.progress = { percentage: 40, stage: 'preparing_transaction' };
      await this.publishAIProcessingProgressEvent(requestId, processingState.progress);

      // Create backup state before operations
      const backupState = errorManager.createBackupState(sessionId, {
        editTracker: this.editTracker,
        batchManager: this.batchManager
      });

      // Begin transaction for atomic operations
      transactionId = errorManager.beginTransaction(sessionId, [
        { type: 'create-changes', target: 'session', data: changes },
        { type: 'update-session', target: sessionId, data: { changes } }
      ]);

      // Update progress - starting main operation
      processingState.progress = { percentage: 50, stage: 'processing_changes' };
      await this.publishAIProcessingProgressEvent(requestId, processingState.progress);

      // Execute the main operation with retry and recovery
      const operationResult = await retryManager.executeWithRetry(
        operationId,
        sessionId,
        async () => {
          // Update progress during operation
          processingState.progress = { percentage: 70, stage: 'applying_changes' };
          await this.publishAIProcessingProgressEvent(requestId, processingState.progress);
          
          return await this.performAISubmissionOperation(
            changes,
            aiProvider,
            aiModel,
            processingContext,
            options,
            sessionId!,
            session,
            errorManager,
            transactionId
          );
        },
        {
          maxRetries: options.maxRetries || 3,
          retryableErrorTypes: [
            (await import('./error-handling/ai-submission-error-manager')).ErrorType.NETWORK,
            (await import('./error-handling/ai-submission-error-manager')).ErrorType.EDITORIAL_ENGINE,
            (await import('./error-handling/ai-submission-error-manager')).ErrorType.RATE_LIMITING
          ]
        }
      );

      if (operationResult.success && operationResult.result) {
        // Update progress - finalizing
        processingState.progress = { percentage: 90, stage: 'finalizing' };
        await this.publishAIProcessingProgressEvent(requestId, processingState.progress);
        
        // Commit transaction on success
        if (transactionId) {
          errorManager.commitTransaction(transactionId);
        }

        // Update processing state to completed
        processingState.status = 'completed';
        processingState.progress = { percentage: 100, stage: 'completed' };

        // Move from active to completed queue
        const activeIndex = this.processingQueue.active.findIndex(state => state.requestId === requestId);
        if (activeIndex !== -1) {
          this.processingQueue.active.splice(activeIndex, 1);
          this.processingQueue.completed.push(processingState);
        }

        // Update plugin performance metrics if plugin system is active
        if (this.pluginRegistry && (options as any).pluginAuthContext) {
          const pluginId = (options as any).pluginAuthContext.pluginId;
          // Performance tracking would be implemented in the registry
          console.log(`[TrackEditsPlugin] Successful AI submission recorded for plugin: ${pluginId}`);
        }

        // Populate successful result
        Object.assign(result, operationResult.result);
        result.success = true;

        // Publish AI processing complete event for platform coordination
        await this.publishAIProcessingCompleteEvent({
          requestId,
          results: {
            changeIds: result.changeIds,
            changeGroupId: processingContext?.groupId,
            summary: `AI submission completed: ${result.changeIds.length} changes applied`,
            confidence: 0.9, // Default confidence
            appliedConstraints: processingContext?.constraints || []
          },
          metrics: {
            totalTokens: processingState.metrics?.tokensProcessed || 0,
            processingTime: Date.now() - processingState.operation.startTime,
            qualityScore: 0.8, // Default quality score
            constraintCompliance: 1.0 // Default compliance
          },
          recommendations: {
            suggestedReview: result.changeIds.length > 10,
            recommendedBatching: result.changeIds.length > 5 ? 'group' : 'individual',
            followupActions: []
          }
        }, sessionId);

        if (operationResult.fallbackUsed) {
          result.warnings.push(`Operation completed using fallback strategy: ${operationResult.fallbackUsed}`);
        }

        if (operationResult.attempts > 1) {
          result.warnings.push(`Operation succeeded after ${operationResult.attempts} attempts`);
        }

      } else {
        // Handle operation failure
        processingState.status = 'error';
        processingState.errorDetails = {
          type: 'operation',
          message: operationResult.error?.message || 'Operation failed',
          recoverable: operationResult.error?.rollbackRequired !== true
        };

        // Move from active to failed queue
        const activeIndex = this.processingQueue.active.findIndex(state => state.requestId === requestId);
        if (activeIndex !== -1) {
          this.processingQueue.active.splice(activeIndex, 1);
          this.processingQueue.failed.push(processingState);
        }

        if (transactionId && operationResult.error?.rollbackRequired) {
          const rollbackResult = await errorManager.rollbackTransaction(
            transactionId,
            operationResult.error,
            {
              sessionManager: this,
              editTracker: this.editTracker,
              sessionId: sessionId
            }
          );

          if (!rollbackResult.success) {
            result.errors.push(...rollbackResult.errors);
            result.warnings.push(...rollbackResult.warnings);
          } else {
            result.warnings.push('Changes have been rolled back due to operation failure');
          }
        }

        // Record plugin error if plugin system is active
        if (this.pluginRegistry && (options as any).pluginAuthContext && operationResult.error) {
          const pluginId = (options as any).pluginAuthContext.pluginId;
          await this.pluginRegistry.recordPluginError(pluginId, operationResult.error, {
            operation: 'ai_submission',
            sessionId,
            changeCount: changes.length
          });
        }

        if (operationResult.error) {
          result.errors.push(operationResult.error.message);
          
          // Publish AI processing error event for platform coordination
          await this.publishAIProcessingErrorEvent(requestId, 'operation', operationResult.error.message, {
            stage: 'operation_execution',
            partialResults: [],
            resourceUsage: { memory: 0, cpu: 0 }
          }, {
            automaticRetryAvailable: false,
            manualInterventionRequired: true,
            suggestedActions: ['Check logs', 'Retry with different parameters'],
            fallbackOptions: []
          });
          
          // Add user-friendly error message
          const userMessage = errorManager.generateUserErrorMessage(operationResult.error);
          if (userMessage !== operationResult.error.message) {
            result.warnings.push(userMessage);
          }
        } else {
          result.errors.push('Operation failed after all retry attempts');
          
          // Publish generic error event
          await this.publishAIProcessingErrorEvent(requestId, 'retry_exhausted', 'Operation failed after all retry attempts');
        }
      }

      return result;

    } catch (criticalError) {
      // Handle critical/unexpected errors
      const errorContext = {
        operation: 'ai_submission',
        sessionId: options.sessionId || 'unknown',
        changeIds: changes.map(c => c.id).filter(Boolean),
        transactionId,
        aiProvider,
        aiModel
      };

      // Update processing state
      const processingState = this.aiProcessingStates.get(operationId);
      if (processingState) {
        processingState.status = 'error';
        processingState.errorDetails = {
          type: 'critical',
          message: criticalError.message,
          recoverable: false
        };

        // Move to failed queue
        const activeIndex = this.processingQueue.active.findIndex(state => state.requestId === operationId);
        if (activeIndex !== -1) {
          this.processingQueue.active.splice(activeIndex, 1);
          this.processingQueue.failed.push(processingState);
        }
      }

      const handledError = await errorManager.handleError(criticalError, errorContext);
      
      // Record critical error for plugin if applicable
      if (this.pluginRegistry && (options as any).pluginAuthContext) {
        const pluginId = (options as any).pluginAuthContext.pluginId;
        await this.pluginRegistry.recordPluginError(pluginId, handledError.error, errorContext);
      }
      
      // Attempt rollback if transaction exists
      if (transactionId && handledError.rollbackRequired) {
        try {
          await errorManager.rollbackTransaction(
            transactionId,
            handledError.error,
            {
              sessionManager: this,
              editTracker: this.editTracker,
              sessionId: options.sessionId || 'unknown'
            }
          );
          result.warnings.push('System recovered from critical error - changes have been rolled back');
        } catch (rollbackError) {
          result.errors.push('Critical error occurred and rollback failed - manual recovery may be required');
          console.error('[TrackEditsPlugin] Critical rollback failure:', rollbackError);
        }
      }

      // Publish critical error event
      await this.publishAIProcessingErrorEvent(operationId, 'critical', handledError.error.message, {
        stage: 'critical_error',
        partialResults: [],
        resourceUsage: { memory: 0, cpu: 0 }
      }, {
        automaticRetryAvailable: false,
        manualInterventionRequired: true,
        suggestedActions: ['Check system logs', 'Restart plugin', 'Contact support'],
        fallbackOptions: []
      });

      const userMessage = errorManager.generateUserErrorMessage(handledError.error);
      result.errors.push(userMessage);
      
      // Log the critical error for debugging
      console.error('[TrackEditsPlugin] Critical error in submitChangesFromAI:', {
        error: criticalError,
        context: errorContext,
        categorizedError: handledError.error,
        timestamp: new Date().toISOString()
      });

      return result;
    } finally {
      // Cleanup and maintenance
      errorManager.cleanup();
      retryManager.cleanup();
      
      // Clean up processing locks
      this.processingLocks.delete(operationId);
    }
  }

  /**
   * Enhanced event integration using standardized V2 event schemas
   */
  private async publishEnhancedChangeEvent(
    eventType: 'change.ai.start' | 'change.ai.complete' | 'change.ai.error' | 'change.batch.created' | 'change.batch.processed',
    payload: any,
    sessionId?: string,
    priority: import('./event-bus-integration').EventPriority = 1,
    persistence: import('./event-bus-integration').EventPersistence = 'session'
  ): Promise<void> {
    try {
      const { 
        WriterrlEventFactory
        // EventPriority, 
        // EventPersistence 
      } = await import('./event-bus-integration');
      
      // Create enhanced event with proper metadata
      const baseEvent = WriterrlEventFactory.createBaseEvent(
        eventType,
        'track-edits',
        priority,
        persistence
      );
      
      const enhancedEvent = {
        ...baseEvent,
        type: eventType,
        sessionId,
        documentId: this.app.workspace.getActiveFile()?.path,
        targetPlugins: this.getTargetPluginsForEvent(eventType),
        payload: {
          ...payload,
          pluginVersion: this.manifest.version,
          timestamp: Date.now(),
          correlationId: baseEvent.metadata.correlationId
        }
      };
      
      // Use existing event bus connection
      if (this.eventBusConnection?.isConnected()) {
        await this.eventBusConnection.publish(eventType, enhancedEvent as any);
      } else {
        // Fallback to legacy event publishing
        await this.publishChangeEvent(eventType, payload, sessionId);
      }
      
    } catch (error) {
      console.error(`Failed to publish enhanced event ${eventType}:`, error);
      // Fallback to legacy event publishing
      await this.publishChangeEvent(eventType, payload, sessionId);
    }
  }
  
  /**
   * Determine target plugins based on event type using routing configuration
   */
  private getTargetPluginsForEvent(eventType: string): string[] {
    const { STANDARD_EVENT_ROUTING } = require('./event-coordination-patterns');
    const routing = STANDARD_EVENT_ROUTING[eventType];
    return routing?.targetPlugins || ['writerr-chat', 'editorial-engine'];
  }
  
  /**
   * Start a cross-plugin workflow using the orchestration system
   */
  async startCrossPluginWorkflow(
    workflowType: 'chat-to-editorial-to-track' | 'collaborative-edit' | 'batch-processing',
    context: any
  ): Promise<string> {
    try {
      const { 
        WorkflowOrchestrator, 
        WriterrlWorkflowPatterns 
      } = await import('./event-coordination-patterns');
      
      if (!this.workflowOrchestrator) {
        this.workflowOrchestrator = new WorkflowOrchestrator();
      }
      
      const workflowId = `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      let steps;
      switch (workflowType) {
        case 'chat-to-editorial-to-track':
          steps = WriterrlWorkflowPatterns.getChatToEditorialToTrackWorkflow(workflowId);
          break;
        case 'collaborative-edit':
          steps = WriterrlWorkflowPatterns.getCollaborativeEditWorkflow(workflowId);
          break;
        case 'batch-processing':
          steps = WriterrlWorkflowPatterns.getBatchProcessingWorkflow(workflowId);
          break;
        default:
          throw new Error(`Unknown workflow type: ${workflowType}`);
      }
      
      const started = await this.workflowOrchestrator.startWorkflow(
        workflowId,
        workflowType,
        steps,
        context
      );
      
      if (!started) {
        throw new Error('Failed to start workflow');
      }
      
      return workflowId;
      
    } catch (error) {
      console.error(`Failed to start workflow ${workflowType}:`, error);
      throw error;
    }
  }

  /**
   * Core AI submission operation (extracted for retry logic)
   */
  private async performAISubmissionOperation(
    changes: EditChange[],
    aiProvider: string,
    aiModel: string,
    processingContext?: AIProcessingContext,
    options: SubmitChangesFromAIOptions = {},
    sessionId: string,
    session: EditSession,
    errorManager: any, // AISubmissionErrorManager
    transactionId?: string
  ): Promise<SubmitChangesFromAIResult> {
    // Enhanced AI metadata validation with Editorial Engine support
    if (options.strictValidation !== false && !options.bypassValidation) {
      try {
        // Determine validation environment
        const environment = process.env.NODE_ENV === 'production' ? 'production' : 
                           process.env.NODE_ENV === 'test' ? 'testing' : 'development';
        
        // Get environment-specific validation config
        const validationConfig = AIMetadataValidator.getValidationConfig(environment);
        
        // Override with user-provided options
        const validationOptions: any = {
          ...validationConfig,
          strictMode: options.strictValidation ?? validationConfig.strictMode,
          bypassValidation: options.bypassValidation ?? false,
          editorialEngineMode: options.editorialEngineMode ?? validationConfig.editorialEngineMode,
          enableRateLimiting: validationConfig.enableRateLimiting,
          logSecurityViolations: validationConfig.logSecurityViolations
        };

        const validationResult = AIMetadataValidator.validateAIMetadata(
          aiProvider,
          aiModel,
          processingContext,
          new Date(),
          validationOptions
        );

        if (!validationResult.isValid) {
          // Create validation error
          const validationError = new Error(`Validation failed: ${validationResult.errors.join(', ')}`);
          (validationError as any).code = 'VALIDATION_ERROR';
          (validationError as any).details = validationResult;
          throw validationError;
        }

        // Use sanitized metadata from validation
        aiProvider = validationResult.sanitizedMetadata?.aiProvider || aiProvider;
        aiModel = validationResult.sanitizedMetadata?.aiModel || aiModel;
        processingContext = validationResult.sanitizedMetadata?.processingContext || processingContext;
        
        // Track security threats even for successful validations
        if (validationResult.securityThreats.length > 0) {
          console.warn('[TrackEditsPlugin] Security threats detected and sanitized:', validationResult.securityThreats);
        }
      } catch (validationError) {
        // Let the validation error bubble up to be handled by retry system
        throw validationError;
      }
    }

    // Advanced change grouping logic if enabled
    let changeGroupingResult;
    let changeGroupId;
    
    if (options.groupChanges && changes.length >= 2) {
      try {
        // Determine editorial operation type
        const operationType: EditorialOperationType = options.editorialOperation || 
          this.inferEditorialOperationType(changes, processingContext, options);
        
        const operationDescription = options.customOperationDescription ||
          this.generateOperationDescription(operationType, changes.length);

        // Create batches using the batch manager
        changeGroupingResult = this.batchManager.createBatches(
          changes,
          sessionId,
          operationType,
          operationDescription
        );
        
        // Use the primary group ID if groups were created
        if (changeGroupingResult?.groups?.length > 0) {
          changeGroupId = changeGroupingResult.groups[0]?.groupId;
        }
      } catch (batchError) {
        // Convert batch error and let retry system handle it
        const batchErrorWithCode = new Error(`Batch processing failed: ${batchError instanceof Error ? batchError.message : String(batchError)}`);
        (batchErrorWithCode as any).code = 'BATCH_ERROR';
        throw batchErrorWithCode;
      }
    } else if (options.groupChanges) {
      // Simple grouping fallback for small change sets
      changeGroupId = generateId();
    }

    // Enhanced batch validation for individual changes
    const validatedChanges: EditChange[] = [];
    
    for (let i = 0; i < changes.length; i++) {
      const change = changes[i];
      if (!change) {
        console.warn(`Change ${i} is undefined, skipping`);
        continue;
      }
      
      // Enhanced change validation
      const changeId = change.id || `${sessionId}_${Date.now()}_${i}`;
      
      // Create enhanced processing context with additional metadata
      const enhancedProcessingContext: EnhancedAIProcessingContext = {
        ...processingContext,
        // Add conversation context if provided
        ...(options.conversationContext && {
          conversationId: options.conversationContext.conversationId,
          messageId: options.conversationContext.messageId,
          userPrompt: options.conversationContext.userPrompt
        }),
        // Add change group ID if grouping is enabled
        ...(changeGroupId && { changeGroupId }),
        // Add Editorial Engine metadata
        metadata: {
          ...(processingContext?.metadata || {}),
          changeIndex: i,
          totalChanges: changes.length,
          validationTimestamp: new Date().toISOString(),
          securityValidated: true,
          transactionId
        }
      };

      const validatedChange: EditChange = {
        ...change,
        id: changeId,
        type: change.type || 'replace',
        timestamp: change.timestamp || Date.now(),
        aiProvider,
        aiModel,
        processingContext: enhancedProcessingContext,
        aiTimestamp: new Date(),
        author: change.author || 'Editorial Engine'
      };
      
      validatedChanges.push(validatedChange);
    }

    // Record changes using existing EditTracker AI recording method with enhanced options
    let recordResult;
    try {
      recordResult = this.editTracker.recordAIChanges(
        sessionId,
        validatedChanges,
        aiProvider,
        aiModel,
        processingContext,
        new Date(),
        {
          bypassValidation: options.bypassValidation || false,
          strictMode: options.strictValidation !== false,
          // Pass through Editorial Engine mode - use conditional spread to avoid undefined
          ...(options.editorialEngineMode !== undefined && { editorialEngineMode: options.editorialEngineMode })
        }
      );

      if (!recordResult.success) {
        const recordError = new Error(`Failed to record changes: ${recordResult.errors.join(', ')}`);
        (recordError as any).code = 'STORAGE_ERROR';
        (recordError as any).details = recordResult;
        throw recordError;
      }
    } catch (recordError) {
      throw recordError;
    }

    // Build successful result
    const operationResult: SubmitChangesFromAIResult = {
      success: true,
      sessionId: sessionId,
      changeIds: validatedChanges.map(change => change.id!),
      errors: [],
      warnings: [...(recordResult?.warnings || [])],
      // Only include changeGroupId if it exists
      ...(changeGroupId && { changeGroupId }),
      ...(changeGroupingResult && { groupingResult: changeGroupingResult }),
      
      // Add validation summary to result
      validationSummary: {
        totalChanges: validatedChanges.length,
        provider: aiProvider,
        model: aiModel,
        validationMode: options.editorialEngineMode ? 'Editorial Engine' : 'Standard',
        securityChecksEnabled: options.strictValidation !== false
      }
    };

    // Auto-save session if enabled
    if (this.settings.autoSave) {
      try {
        await this.saveCurrentSession();
      } catch (saveError) {
        // Non-critical error - warn but don't fail the operation
        operationResult.warnings.push('Auto-save failed but changes were recorded successfully');
        console.warn('[TrackEditsPlugin] Auto-save failed:', saveError);
      }
    }

    return operationResult;
  }

  /**
   * Validates change content for security threats
   * Used by submitChangesFromAI for individual change validation
   */
  private validateChangeContent(content: string): string[] {
    const threats: string[] = [];

    // Basic XSS detection
    if (/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi.test(content)) {
      threats.push('Script injection detected');
    }

    // HTML injection detection
    if (/<iframe|<object|<embed|<applet/gi.test(content)) {
      threats.push('Potentially dangerous HTML elements');
    }

    // JavaScript protocol detection
    if (/javascript:|data:|vbscript:/gi.test(content)) {
      threats.push('Dangerous URL protocols');
    }

    // SQL injection patterns in content
    if (/(\bUNION\b|\bSELECT\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bDROP\b)/gi.test(content)) {
      threats.push('SQL injection patterns');
    }

    // Command injection patterns
    if (/[;&|`$(){}[\]\\]/.test(content) && content.length > 100) {
      threats.push('Command injection characters in large content');
    }

    return threats;
  }

  /**
   * Convenience method for single change submission
   * Wraps submitChangesFromAI for single EditChange objects
   */
  async submitSingleChangeFromAI(
    change: EditChange,
    aiProvider: string,
    aiModel: string,
    processingContext?: AIProcessingContext,
    options: SubmitChangesFromAIOptions = {}
  ): Promise<SubmitChangesFromAIResult> {
    return this.submitChangesFromAI([change], aiProvider, aiModel, processingContext, options);
  }

  /**
   * Get changes by group ID for batch processing analysis
   * Useful for analyzing related changes submitted as a group
   */
  getChangesByGroupId(sessionId: string, groupId: string): EditChange[] {
    const session = this.editTracker.getSession(sessionId);
    if (!session) return [];

    return session.changes.filter(change => 
      (change.processingContext as EnhancedAIProcessingContext)?.changeGroupId === groupId
    );
  }

  /**
   * Infer editorial operation type from changes and context
   */
  private inferEditorialOperationType(
    changes: EditChange[],
    processingContext?: AIProcessingContext,
    options?: SubmitChangesFromAIOptions
  ): EditorialOperationType {
    // Check if context provides hints about operation type
    if (processingContext?.mode) {
      const mode = processingContext.mode.toLowerCase();
      if (mode.includes('proofreading') || mode.includes('grammar') || mode.includes('spelling')) {
        return 'proofreading';
      }
      if (mode.includes('copy-edit') || mode.includes('comprehensive')) {
        return 'copy-edit-pass';
      }
      if (mode.includes('developmental') || mode.includes('structural')) {
        return 'developmental-feedback';
      }
      if (mode.includes('style') || mode.includes('tone') || mode.includes('voice')) {
        return 'style-refinement';
      }
      if (mode.includes('format') || mode.includes('structure')) {
        return 'formatting';
      }
      if (mode.includes('expand') || mode.includes('clarify') || mode.includes('elaborate')) {
        return 'content-expansion';
      }
      if (mode.includes('reduce') || mode.includes('trim') || mode.includes('condense')) {
        return 'content-reduction';
      }
      if (mode.includes('rewrite') || mode.includes('restructure')) {
        return 'rewriting';
      }
    }

    // Check conversation context for user prompts
    if (options?.conversationContext?.userPrompt) {
      const prompt = options.conversationContext.userPrompt.toLowerCase();
      if (prompt.includes('proofread') || prompt.includes('check grammar') || prompt.includes('fix spelling')) {
        return 'proofreading';
      }
      if (prompt.includes('copy edit') || prompt.includes('comprehensive edit')) {
        return 'copy-edit-pass';
      }
      if (prompt.includes('style') || prompt.includes('tone') || prompt.includes('voice')) {
        return 'style-refinement';
      }
      if (prompt.includes('develop') || prompt.includes('structure') || prompt.includes('organize')) {
        return 'developmental-feedback';
      }
    }

    // Analyze change patterns to infer operation type
    const hasSmallChanges = changes.some(c => 
      (c.text && c.text.length < 20) || (c.removedText && c.removedText.length < 20)
    );
    const hasLargeChanges = changes.some(c => 
      (c.text && c.text.length > 100) || (c.removedText && c.removedText.length > 100)
    );
    const hasOnlyReplacements = changes.every(c => c.type === 'replace');
    const hasMostlyInsertions = changes.filter(c => c.type === 'insert').length > changes.length * 0.6;
    const hasMostlyDeletions = changes.filter(c => c.type === 'delete').length > changes.length * 0.6;

    // Pattern-based inference
    if (hasOnlyReplacements && hasSmallChanges && !hasLargeChanges) {
      return 'proofreading';
    }
    if (hasMostlyInsertions) {
      return 'content-expansion';
    }
    if (hasMostlyDeletions) {
      return 'content-reduction';
    }
    if (hasLargeChanges) {
      return 'rewriting';
    }

    // Default fallback
    return 'copy-edit-pass';
  }

  /**
   * Generate operation description based on type and change count
   */
  private generateOperationDescription(
    operationType: EditorialOperationType, 
    changeCount: number
  ): string {
    const baseDescriptions = {
      'copy-edit-pass': 'Comprehensive copy editing',
      'proofreading': 'Grammar and spelling corrections',
      'developmental-feedback': 'Structural improvements',
      'style-refinement': 'Style and tone adjustments',
      'fact-checking': 'Accuracy verification',
      'formatting': 'Document formatting',
      'content-expansion': 'Content additions',
      'content-reduction': 'Content trimming',
      'rewriting': 'Content restructuring',
      'custom': 'Editorial changes'
    };

    const base = baseDescriptions[operationType];
    return `${base} (${changeCount} change${changeCount !== 1 ? 's' : ''})`;
  }

  /**
   * Get batch manager instance for external access
   */
  public getBatchManager(): ChangeBatchManager {
    return this.batchManager;
  }
}