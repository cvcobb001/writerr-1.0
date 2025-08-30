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
  getEnabledModes(): ModeDefinition[];
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

    // Set up default adapters (Track Edits integration)
    await this.setupDefaultAdapters();

    // Register settings tab
    this.addSettingTab(new EditorialEngineSettingsTab(this.app, this));

    // Add status bar
    this.addStatusBarItem().setText('📝 Editorial Engine Ready');

    // Listen for Track Edits plugin loading (delayed registration)
    this.eventBus.on('plugin-ready', async (data) => {
      if (data.name === 'track-edits' && !this.adapterManager.getAdapter('track-edits')) {
        console.log('Track Edits plugin became available, registering adapter...');
        await this.setupDefaultAdapters();
      }
    });

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
      getEnabledModes: this.getEnabledModes.bind(this),
      getMode: this.getMode.bind(this),
      registerAdapter: this.registerAdapter.bind(this),
      getStatus: this.getStatus.bind(this),
      getPerformanceMetrics: this.getPerformanceMetrics.bind(this)
    };

    // Register with platform manager
    this.platformManager.registerPlugin('editorial', this, this.api);

    // CRITICAL: Expose API to global WriterrlAPI for Chat integration
    if (!window.WriterrlAPI) {
      window.WriterrlAPI = {} as any;
    }
    
    window.WriterrlAPI.editorialEngine = this.api;
    console.log('Editorial Engine API exposed to window.WriterrlAPI.editorialEngine');

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
    
    // Cleanup global API
    if (window.WriterrlAPI && window.WriterrlAPI.editorialEngine) {
      delete window.WriterrlAPI.editorialEngine;
    }
  }

  private async loadDefaultModes() {
    // Load user-defined modes from markdown files in the modes folder
    const modesFolder = '.obsidian/plugins/editorial-engine/modes';
    
    try {
      // Check if modes folder exists, create if not
      const folderExists = await this.app.vault.adapter.exists(modesFolder);
      if (!folderExists) {
        await this.app.vault.adapter.mkdir(modesFolder);
        console.log('Created Editorial Engine modes folder');
        
        // Create initial example mode files
        await this.createExampleModeFiles(modesFolder);
      }
      
      // Load all .md files from the modes folder
      const files = await this.app.vault.adapter.list(modesFolder);
      const modeFiles = files.files.filter(file => file.endsWith('.md'));
      
      let loadedCount = 0;
      for (const filePath of modeFiles) {
        try {
          const modeContent = await this.app.vault.adapter.read(filePath);
          const modeDefinition = this.parseModeFile(filePath, modeContent);
          
          if (modeDefinition) {
            await this.modeRegistry.registerMode(modeDefinition);
            loadedCount++;
            console.log(`Loaded mode from file: ${filePath}`);
          }
        } catch (error) {
          console.error(`Failed to load mode file ${filePath}:`, error);
        }
      }
      
      console.log(`Loaded ${loadedCount} modes from user-defined files`);
      
    } catch (error) {
      console.error('Failed to load modes from files, falling back to defaults:', error);
      // Fallback to basic proofreader mode if file loading fails
      await this.loadFallbackMode();
    }
  }

  private async createExampleModeFiles(modesFolder: string) {
    const exampleModes = [
      {
        filename: 'proofreader.md',
        content: `# Proofreader Mode

**Description:** Fix grammar, spelling, and basic clarity issues without changing the author's voice

## What I Can Do
- Fix spelling and grammar errors
- Correct punctuation mistakes
- Fix basic clarity issues
- Standardize formatting
- Improve sentence structure for clarity

## What I Cannot Do  
- Never change the author's voice or style
- Don't alter the meaning or intent
- Don't rewrite sentences unless grammatically incorrect
- Don't change technical terminology
- Don't make major structural changes

## Focus Areas
- Focus on mechanical correctness
- Preserve original phrasing when possible  
- Make minimal necessary changes
- Maintain the author's intended tone

## Boundaries
- Change no more than 10% of the original text
- Keep changes at word or phrase level
- Maintain original sentence structure when possible
- Only fix clear errors, don't impose style preferences

## Examples
**Input:** "The quick brown fox jump over the lazy dog, it was very quick."
**Expected:** "The quick brown fox jumps over the lazy dog. It was very quick."
**Explanation:** Fix subject-verb agreement and run-on sentence, but preserve simple style.
`
      },
      {
        filename: 'copy-editor.md', 
        content: `# Copy Editor Mode

**Description:** Improve style, flow, and consistency while preserving the author's voice

## What I Can Do
- Improve sentence flow and rhythm
- Enhance clarity and conciseness  
- Fix consistency issues in tone and style
- Suggest better word choices for precision
- Improve paragraph transitions and connections
- Eliminate redundancy and wordiness

## What I Cannot Do
- Don't change the author's fundamental voice
- Don't alter factual content or arguments  
- Don't impose a completely different writing style
- Don't change specialized terminology without reason
- Don't remove the author's personality from the text

## Focus Areas
- Focus on readability and flow
- Improve sentence variety and rhythm
- Enhance overall coherence and unity
- Strengthen transitions between ideas
- Maintain consistent tone throughout

## Boundaries  
- Change no more than 25% of the original text
- Preserve key phrases and distinctive expressions
- Maintain the document's purpose and audience
- Keep the author's level of formality
- Preserve technical accuracy

## Examples
**Input:** "The meeting was very productive and we got a lot done. We talked about many things. It was good."
**Expected:** "The meeting proved highly productive, covering multiple key topics and yielding concrete progress on our objectives."  
**Explanation:** Improved flow and precision while maintaining the positive, straightforward tone.
`
      },
      {
        filename: 'my-custom-mode-template.md',
        content: `# My Custom Mode Template

**Description:** [Describe what this mode does - e.g., "Enhance creative writing for fantasy novels"]

## What I Can Do
- [List specific things this mode should do]
- [Be specific about the type of improvements]
- [Include any special focus areas]
- [Add domain-specific capabilities if needed]

## What I Cannot Do  
- [List things this mode should never do]
- [Include boundaries about voice/style preservation]  
- [Specify content that shouldn't be changed]
- [Add any domain-specific restrictions]

## Focus Areas
- [What should this mode prioritize?]
- [What aspects of writing should it focus on?]
- [Any specific techniques or approaches?]

## Boundaries
- [How much of the text can be changed? (e.g., "no more than 15%")]
- [What level of changes are appropriate? (word/phrase/sentence/paragraph)]
- [What must always be preserved?]
- [Any specific limitations?]

## Examples
**Input:** [Provide a sample of text this mode would work on]
**Expected:** [Show what the improved version should look like]
**Explanation:** [Explain why these specific changes align with the mode's purpose]

---
**Instructions:** 
1. Copy this template to create new modes
2. Replace all bracketed placeholders with your specific requirements  
3. Save as a new .md file in the modes folder
4. The Editorial Engine will automatically detect and load your new mode
`
      }
    ];

    // Create each example mode file
    for (const mode of exampleModes) {
      const filePath = `${modesFolder}/${mode.filename}`;
      try {
        await this.app.vault.adapter.write(filePath, mode.content);
        console.log(`Created example mode file: ${mode.filename}`);
      } catch (error) {
        console.error(`Failed to create ${mode.filename}:`, error);
      }
    }
  }

  private parseModeFile(filePath: string, content: string): ModeDefinition | null {
    try {
      const lines = content.split('\n');
      const modeId = filePath.split('/').pop()?.replace('.md', '') || 'unknown';
      
      let modeName = '';
      let description = '';
      const allowed: string[] = [];
      const forbidden: string[] = [];
      const focus: string[] = [];
      const boundaries: string[] = [];
      
      let currentSection = '';
      
      for (let line of lines) {
        line = line.trim();
        
        // Extract title (mode name)
        if (line.startsWith('# ') && !modeName) {
          modeName = line.substring(2).replace(' Mode', '').trim();
        }
        
        // Extract description
        if (line.startsWith('**Description:**')) {
          description = line.replace('**Description:**', '').trim();
        }
        
        // Track current section
        if (line.startsWith('## What I Can Do')) {
          currentSection = 'allowed';
        } else if (line.startsWith('## What I Cannot Do')) {
          currentSection = 'forbidden';
        } else if (line.startsWith('## Focus Areas')) {
          currentSection = 'focus';
        } else if (line.startsWith('## Boundaries')) {
          currentSection = 'boundaries';
        } else if (line.startsWith('## Examples') || line.startsWith('---')) {
          currentSection = ''; // Stop processing at examples or end
        }
        
        // Extract bullet points for current section
        if (line.startsWith('- ') && currentSection) {
          const rule = line.substring(2).trim();
          switch (currentSection) {
            case 'allowed':
              allowed.push(rule);
              break;
            case 'forbidden':
              forbidden.push(rule);
              break;
            case 'focus':
              focus.push(rule);
              break;
            case 'boundaries':
              boundaries.push(rule);
              break;
          }
        }
      }
      
      // Validate required fields
      if (!modeName || !description || allowed.length === 0) {
        console.warn(`Invalid mode file ${filePath}: missing required fields`);
        return null;
      }
      
      return {
        id: modeId,
        name: modeName,
        description: description,
        version: '1.0.0',
        author: 'User Defined',
        naturalLanguageRules: {
          allowed,
          forbidden,
          focus,
          boundaries
        },
        examples: [], // Could be enhanced to parse examples from markdown
        constraints: [], // Will be compiled from natural language rules
        metadata: {
          category: 'user-defined',
          difficulty: 'custom',
          tags: [modeId],
          useCase: description
        }
      };
      
    } catch (error) {
      console.error(`Failed to parse mode file ${filePath}:`, error);
      return null;
    }
  }

  private async loadFallbackMode() {
    // Minimal fallback mode if file loading fails completely
    const fallbackMode: ModeDefinition = {
      id: 'basic-proofreader',
      name: 'Basic Proofreader',
      description: 'Basic grammar and spelling fixes',
      version: '1.0.0',
      author: 'Writerr Platform',
      naturalLanguageRules: {
        allowed: ['Fix spelling and grammar errors'],
        forbidden: ['Don\'t change the author\'s voice'],
        focus: ['Focus on mechanical correctness'],
        boundaries: ['Make minimal necessary changes']
      },
      examples: [],
      constraints: [],
      metadata: {
        category: 'fallback',
        difficulty: 'basic',
        tags: ['grammar'],
        useCase: 'Emergency fallback mode'
      }
    };
    
    await this.modeRegistry.registerMode(fallbackMode);
    console.log('Loaded fallback proofreader mode');
  }

  private async setupDefaultAdapters() {
    // Register Track Edits adapter if Track Edits plugin is available
    if (window.WriterrlAPI?.trackEdits) {
      try {
        const { TrackEditsAdapter } = await import('./adapters/track-edits-adapter');
        const trackEditsAdapter = new TrackEditsAdapter();
        await this.adapterManager.registerAdapter(trackEditsAdapter);
        console.log('Track Edits adapter registered successfully');
      } catch (error) {
        console.error('Failed to register Track Edits adapter:', error);
      }
    } else {
      console.log('Track Edits plugin not available, adapter registration skipped');
    }
    
    console.log('Editorial Engine adapter setup complete');
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

  public getEnabledModes(): ModeDefinition[] {
    const allModes = this.modeRegistry.getAllModes();
    return allModes.filter(mode => this.settings.enabledModes.includes(mode.id));
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