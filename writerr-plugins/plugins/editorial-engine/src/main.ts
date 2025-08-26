import { Plugin, Notice } from 'obsidian';
import { EditorialEngineSettingsTab, DEFAULT_SETTINGS } from './settings';
import { ConstraintProcessor } from './constraint-processor';
import { ModeRegistry } from './mode-registry';
import { AdapterManager } from './adapter-manager';
import { PlatformManager } from './platform-manager';
import { PerformanceMonitor } from './performance-monitor';
import { WritterrEventBus } from './event-bus';
import { 
  EditorialEngineSettings, 
  IntakePayload, 
  JobResult, 
  ModeDefinition,
  EditorialEngineEvent
} from './types';

// Editorial Engine API Interface
export interface EditorialEngineAPI {
  process(intake: IntakePayload): Promise<JobResult>;
  registerMode(mode: ModeDefinition): Promise<void>;
  getModes(): ModeDefinition[];
  getMode(id: string): ModeDefinition | undefined;
  registerAdapter(adapter: any): void;
  getStatus(): any;
  getPerformanceMetrics(): any;
}

export default class EditorialEnginePlugin extends Plugin {
  settings: EditorialEngineSettings;
  constraintProcessor: ConstraintProcessor;
  modeRegistry: ModeRegistry;
  adapterManager: AdapterManager;
  platformManager: PlatformManager;
  performanceMonitor: PerformanceMonitor;
  eventBus: WritterrEventBus;
  api: EditorialEngineAPI;

  async onload() {
    console.log('Loading Editorial Engine plugin...');

    // Load settings
    await this.loadSettings();

    // Initialize event bus first (other components depend on it)
    this.eventBus = new WritterrEventBus();

    // Initialize core components
    this.initializeComponents();

    // Set up platform integration
    this.setupPlatformAPI();

    // Register settings tab
    this.addSettingTab(new EditorialEngineSettingsTab(this.app, this));

    // Add status bar
    this.addStatusBarItem().setText('📝 Editorial Engine Ready');

    console.log('Editorial Engine plugin loaded successfully');
  }

  async onunload() {
    console.log('Unloading Editorial Engine plugin...');
    
    // Cleanup components
    this.cleanupComponents();
    
    // Remove platform API
    this.cleanupPlatformAPI();
    
    console.log('Editorial Engine plugin unloaded');
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  private initializeComponents() {
    // Initialize performance monitor
    this.performanceMonitor = new PerformanceMonitor(this.eventBus);

    // Initialize mode registry
    this.modeRegistry = new ModeRegistry(this.eventBus, this.settings);

    // Initialize adapter manager
    this.adapterManager = new AdapterManager(this.eventBus, this.settings);

    // Initialize constraint processor (depends on mode registry and adapter manager)
    this.constraintProcessor = new ConstraintProcessor(
      this.modeRegistry,
      this.adapterManager,
      this.performanceMonitor,
      this.eventBus,
      this.settings
    );

    // Initialize platform manager
    this.platformManager = new PlatformManager();

    // Load default modes
    this.loadDefaultModes();

    // Set up default adapters
    this.setupDefaultAdapters();
  }

  private setupPlatformAPI() {
    // Create the API interface
    this.api = {
      process: this.processRequest.bind(this),
      registerMode: this.registerMode.bind(this),
      getModes: this.getModes.bind(this),
      getMode: this.getMode.bind(this),
      registerAdapter: this.registerAdapter.bind(this),
      getStatus: this.getStatus.bind(this),
      getPerformanceMetrics: this.getPerformanceMetrics.bind(this)
    };

    // Register with platform manager
    this.platformManager.registerPlugin('editorial', this, this.api);

    // Emit platform ready event
    this.eventBus.emit('platform-ready', { 
      plugin: 'editorial-engine',
      api: this.api 
    });
  }

  private cleanupComponents() {
    // Stop performance monitoring
    if (this.performanceMonitor) {
      this.performanceMonitor.cleanup();
    }

    // Cleanup adapters
    if (this.adapterManager) {
      this.adapterManager.cleanup();
    }

    // Clear event bus
    if (this.eventBus) {
      this.eventBus.cleanup();
    }
  }

  private cleanupPlatformAPI() {
    if (this.platformManager) {
      this.platformManager.unregisterPlugin('editorial');
    }
  }

  private async loadDefaultModes() {
    // Load built-in editing modes
    const defaultModes: ModeDefinition[] = [
      {
        id: 'proofreader',
        name: 'Proofreader',
        description: 'Fix grammar, spelling, and basic clarity issues',
        version: '1.0.0',
        author: 'Writerr Platform',
        naturalLanguageRules: {
          allowed: [
            'Fix spelling and grammar errors',
            'Correct punctuation mistakes',
            'Fix basic clarity issues',
            'Standardize formatting'
          ],
          forbidden: [
            'Never change the author\'s voice or style',
            'Don\'t alter the meaning or intent',
            'Don\'t rewrite sentences unless grammatically incorrect',
            'Don\'t change technical terminology'
          ],
          focus: [
            'Focus on mechanical correctness',
            'Preserve original phrasing when possible',
            'Make minimal necessary changes'
          ],
          boundaries: [
            'Change no more than 10% of the original text',
            'Keep changes at word or phrase level',
            'Maintain original sentence structure'
          ]
        },
        examples: [
          {
            input: 'The quick brown fox jump over the lazy dog.',
            expectedBehavior: 'Fix "jump" to "jumps" for subject-verb agreement',
            shouldNotDo: 'Don\'t rewrite as "A fast brown fox leaps over the sleepy dog"',
            explanation: 'Only fix the grammatical error, preserve original style'
          }
        ],
        constraints: [],
        metadata: {
          category: 'basic-editing',
          difficulty: 'beginner',
          tags: ['grammar', 'spelling', 'proofreading'],
          useCase: 'Final review before publishing'
        }
      },
      {
        id: 'copy-editor',
        name: 'Copy Editor',
        description: 'Improve style, flow, and consistency while preserving voice',
        version: '1.0.0',
        author: 'Writerr Platform',
        naturalLanguageRules: {
          allowed: [
            'Improve sentence flow and rhythm',
            'Enhance clarity and conciseness',
            'Fix consistency issues',
            'Suggest better word choices',
            'Improve paragraph transitions'
          ],
          forbidden: [
            'Don\'t change the author\'s fundamental voice',
            'Don\'t alter factual content or arguments',
            'Don\'t impose a different writing style',
            'Don\'t change specialized terminology'
          ],
          focus: [
            'Focus on readability and flow',
            'Improve sentence variety',
            'Enhance overall coherence'
          ],
          boundaries: [
            'Change no more than 25% of the original text',
            'Preserve key phrases and expressions',
            'Maintain the document\'s tone and purpose'
          ]
        },
        examples: [],
        constraints: [],
        metadata: {
          category: 'style-editing',
          difficulty: 'intermediate',
          tags: ['style', 'flow', 'consistency'],
          useCase: 'Improving published drafts'
        }
      },
      {
        id: 'developmental-editor',
        name: 'Developmental Editor',
        description: 'Enhance structure, argumentation, and content development',
        version: '1.0.0',
        author: 'Writerr Platform',
        naturalLanguageRules: {
          allowed: [
            'Suggest structural improvements',
            'Recommend content additions',
            'Identify gaps in argumentation',
            'Propose better organization',
            'Enhance logical flow between ideas'
          ],
          forbidden: [
            'Don\'t rewrite the author\'s content',
            'Don\'t change the fundamental argument',
            'Don\'t impose different viewpoints',
            'Don\'t make changes without explanation'
          ],
          focus: [
            'Focus on big-picture structure',
            'Improve logical progression',
            'Enhance content effectiveness'
          ],
          boundaries: [
            'Suggest rather than directly change',
            'Provide explanations for recommendations',
            'Preserve the author\'s intentions'
          ]
        },
        examples: [],
        constraints: [],
        metadata: {
          category: 'content-editing',
          difficulty: 'advanced',
          tags: ['structure', 'development', 'argumentation'],
          useCase: 'Early draft improvement'
        }
      }
    ];

    // Register each default mode
    for (const mode of defaultModes) {
      try {
        await this.modeRegistry.registerMode(mode);
      } catch (error) {
        console.error(`Failed to register default mode ${mode.id}:`, error);
      }
    }
  }

  private setupDefaultAdapters() {
    // Track Edits adapter will be set up when Track Edits plugin loads
    // For now, just ensure the adapter manager is ready
    console.log('Editorial Engine ready for adapter registration');
  }

  // Public API Methods
  public async processRequest(intake: IntakePayload): Promise<JobResult> {
    try {
      this.eventBus.emit('processing-started', { intakeId: intake.id });
      
      const result = await this.constraintProcessor.process(intake);
      
      this.eventBus.emit('processing-completed', { 
        intakeId: intake.id, 
        result 
      });
      
      return result;
    } catch (error) {
      this.eventBus.emit('processing-failed', { 
        intakeId: intake.id, 
        error: error.message 
      });
      
      throw error;
    }
  }

  public async registerMode(mode: ModeDefinition): Promise<void> {
    return await this.modeRegistry.registerMode(mode);
  }

  public getModes(): ModeDefinition[] {
    return this.modeRegistry.getAllModes();
  }

  public getMode(id: string): ModeDefinition | undefined {
    return this.modeRegistry.getMode(id);
  }

  public registerAdapter(adapter: any): void {
    this.adapterManager.registerAdapter(adapter);
  }

  public getStatus(): any {
    return {
      loaded: true,
      modesCount: this.modeRegistry.getAllModes().length,
      adaptersCount: this.adapterManager.getAdapterCount(),
      settings: {
        defaultMode: this.settings.defaultMode,
        strictMode: this.settings.constraintValidation.strictMode
      },
      performance: this.performanceMonitor.getCurrentMetrics()
    };
  }

  public getPerformanceMetrics(): any {
    return this.performanceMonitor.getDetailedMetrics();
  }

  // Utility method for other components
  public emitEvent(event: EditorialEngineEvent): void {
    this.eventBus.emit(event.type, event.data);
  }
}