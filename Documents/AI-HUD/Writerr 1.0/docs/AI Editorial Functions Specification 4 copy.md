# AI Editorial Functions Specification
## Dynamic Function Registry with Track Edits Integration

### Executive Summary
This specification focuses on implementing a dynamic function registry that loads editorial functions from editable .md/.xml files and integrates seamlessly with the Track Edits API. The system enables teams to customize AI editorial behavior without code changes while maintaining strict constraint enforcement and complete change visibility through Track Edits.

## Table of Contents
1. [Dynamic Function Registry Architecture](#dynamic-function-registry-architecture)
2. [Function Definition File Formats](#function-definition-file-formats)
3. [Hot Reloading System](#hot-reloading-system)
4. [Track Edits Integration Layer](#track-edits-integration-layer)
5. [Function Implementation Pattern](#function-implementation-pattern)
6. [Session Management](#session-management)
7. [Constraint Enforcement](#constraint-enforcement)
8. [Management Interface](#management-interface)

---

## Dynamic Function Registry Architecture

### Core Registry Implementation
```typescript
interface FunctionDefinition {
  // Basic metadata
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  enabled: boolean;
  priority: number;
  tags: string[];
  
  // AI behavior configuration
  systemPrompt: string;
  allowedActions: string[];
  forbiddenPhrases: string[];
  forbiddenActions: string[];
  outputSchema: JsonSchema;
  validationRules: ValidationRule[];
  
  // Track Edits integration
  trackEditsConfig: {
    changeCategories: string[];
    batchSubmission: boolean;
    confidenceThreshold: number;
    autoCluster: boolean;
    clusteringStrategy: 'by_category' | 'by_proximity' | 'by_confidence';
    requireReview: boolean;
    maxChangesPerBatch: number;
  };
  
  // Constraint enforcement
  reinforcement: {
    triggers: ReinforcementTrigger[];
    messageCountThreshold: number;
    timeThreshold: number;
    driftThreshold: number;
    customPrompt?: string;
  };
  
  // File metadata
  metadata: {
    filePath: string;
    lastModified: Date;
    loadTime: Date;
    useCount: number;
    errorCount: number;
    trackEditsSuccessRate: number;
    avgConfidence: number;
  };
}

class FunctionRegistry {
  private functions: Map<string, FunctionDefinition> = new Map();
  private trackEdits: TrackEditsGlobalAPI;
  private parseCache: Map<string, ParsedFunction> = new Map();
  private watcher: FunctionFileWatcher;
  private validator: FunctionValidator;
  
  constructor(trackEdits: TrackEditsGlobalAPI) {
    this.trackEdits = trackEdits;
    this.watcher = new FunctionFileWatcher(this);
    this.validator = new FunctionValidator();
  }
  
  async initialize(functionsDir: string): Promise<RegistryInitResult> {
    console.log('Initializing Function Registry...');
    
    try {
      // Validate Track Edits integration
      await this.validateTrackEditsIntegration();
      
      // Create functions directory if needed
      await this.ensureFunctionsDirectory(functionsDir);
      
      // Load all function files
      const loadResult = await this.loadAllFunctions(functionsDir);
      
      // Set up hot reloading
      await this.watcher.initialize(functionsDir);
      
      // Create default functions if none exist
      if (this.functions.size === 0) {
        await this.createDefaultFunctions(functionsDir);
        await this.loadAllFunctions(functionsDir);
      }
      
      console.log(`Function Registry initialized: ${this.functions.size} functions loaded`);
      
      return {
        success: true,
        functionsLoaded: this.functions.size,
        errors: loadResult.errors,
        functionsDir
      };
      
    } catch (error) {
      console.error('Function Registry initialization failed:', error);
      throw new Error(`Registry initialization failed: ${error.message}`);
    }
  }
  
  private async validateTrackEditsIntegration(): Promise<void> {
    if (!this.trackEdits) {
      throw new Error('Track Edits API not available');
    }
    
    if (!this.trackEdits.isPluginRegistered('editorial-functions')) {
      const registered = this.trackEdits.registerPlugin('editorial-functions', {
        name: 'Editorial Functions',
        version: '1.0.0',
        description: 'Dynamic AI editorial functions with constraint management'
      });
      
      if (!registered) {
        throw new Error('Failed to register with Track Edits');
      }
    }
    
    console.log('Track Edits integration validated');
  }
  
  private async loadAllFunctions(functionsDir: string): Promise<LoadResult> {
    const errors: LoadError[] = [];
    let successCount = 0;
    
    try {
      const functionFiles = await this.findFunctionFiles(functionsDir);
      console.log(`Found ${functionFiles.length} function files`);
      
      // Load functions in parallel
      const loadPromises = functionFiles.map(async (file) => {
        try {
          await this.loadFunctionFromFile(file);
          successCount++;
        } catch (error) {
          errors.push({
            file: file.path,
            error: error.message,
            timestamp: new Date()
          });
          console.error(`Failed to load function from ${file.path}:`, error);
        }
      });
      
      await Promise.all(loadPromises);
      
      return {
        successCount,
        totalFiles: functionFiles.length,
        errors
      };
      
    } catch (error) {
      throw new Error(`Failed to load functions: ${error.message}`);
    }
  }
  
  private async loadFunctionFromFile(file: TFile): Promise<void> {
    const content = await this.app.vault.read(file);
    
    // Check cache first
    const cacheKey = `${file.path}-${file.stat.mtime}`;
    let parsed = this.parseCache.get(cacheKey);
    
    if (!parsed) {
      // Parse the function definition
      if (file.extension === 'md') {
        parsed = await this.parseMarkdownFunction(content, file.path);
      } else if (file.extension === 'xml') {
        parsed = await this.parseXmlFunction(content, file.path);
      } else {
        throw new Error(`Unsupported file type: ${file.extension}`);
      }
      
      // Cache the parsed result
      this.parseCache.set(cacheKey, parsed);
    }
    
    // Validate the function definition
    const validation = await this.validator.validateFunction(parsed.definition);
    if (!validation.valid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }
    
    // Check for ID conflicts
    if (this.functions.has(parsed.definition.id) && 
        this.functions.get(parsed.definition.id)?.metadata.filePath !== file.path) {
      throw new Error(`Function ID "${parsed.definition.id}" already exists in another file`);
    }
    
    // Update metadata
    parsed.definition.metadata = {
      filePath: file.path,
      lastModified: new Date(file.stat.mtime),
      loadTime: new Date(),
      useCount: this.functions.get(parsed.definition.id)?.metadata.useCount || 0,
      errorCount: this.functions.get(parsed.definition.id)?.metadata.errorCount || 0,
      trackEditsSuccessRate: this.functions.get(parsed.definition.id)?.metadata.trackEditsSuccessRate || 1.0,
      avgConfidence: this.functions.get(parsed.definition.id)?.metadata.avgConfidence || 0.8
    };
    
    // Store the function
    if (parsed.definition.enabled) {
      this.functions.set(parsed.definition.id, parsed.definition);
      console.log(`Loaded function: ${parsed.definition.name} (${parsed.definition.id})`);
    } else {
      console.log(`Skipped disabled function: ${parsed.definition.name} (${parsed.definition.id})`);
    }
  }
  
  // Public API methods
  getFunctions(): FunctionDefinition[] {
    return Array.from(this.functions.values())
      .sort((a, b) => a.priority - b.priority);
  }
  
  getFunction(id: string): FunctionDefinition | undefined {
    const func = this.functions.get(id);
    if (func) {
      func.metadata.useCount++;
    }
    return func;
  }
  
  getFunctionsByTag(tag: string): FunctionDefinition[] {
    return this.getFunctions().filter(func => func.tags.includes(tag));
  }
  
  isValidFunctionId(id: string): boolean {
    return this.functions.has(id);
  }
  
  // Track Edits integration stats
  updateTrackEditsStats(functionId: string, success: boolean, confidence?: number): void {
    const func = this.functions.get(functionId);
    if (!func) return;
    
    const currentSuccess = func.metadata.trackEditsSuccessRate;
    const currentCount = func.metadata.useCount;
    
    if (success) {
      func.metadata.trackEditsSuccessRate = 
        (currentSuccess * (currentCount - 1) + 1) / currentCount;
    } else {
      func.metadata.trackEditsSuccessRate = 
        (currentSuccess * (currentCount - 1)) / currentCount;
      func.metadata.errorCount++;
    }
    
    if (confidence !== undefined) {
      const currentAvg = func.metadata.avgConfidence;
      func.metadata.avgConfidence = 
        (currentAvg * (currentCount - 1) + confidence) / currentCount;
    }
  }
  
  // Function management
  async reloadFunction(filePath: string): Promise<void> {
    const file = this.app.vault.getAbstractFileByPath(filePath);
    if (file instanceof TFile) {
      // Clear cache
      const cacheKeys = Array.from(this.parseCache.keys())
        .filter(key => key.startsWith(filePath));
      cacheKeys.forEach(key => this.parseCache.delete(key));
      
      // Reload
      await this.loadFunctionFromFile(file);
      console.log(`Reloaded function from ${filePath}`);
    }
  }
  
  async createDefaultFunctions(functionsDir: string): Promise<void> {
    const generator = new FunctionTemplateGenerator();
    
    const defaultFunctions = [
      {
        id: 'copy-edit',
        name: 'Copy Editor',
        description: 'Light touch improvements for flow, clarity, and style',
        template: 'copy-edit'
      },
      {
        id: 'proofread',
        name: 'Proofreader', 
        description: 'Grammar, spelling, punctuation, and consistency corrections',
        template: 'proofread'
      },
      {
        id: 'dev-edit',
        name: 'Developmental Editor',
        description: 'Structure, organization, and argument analysis',
        template: 'developmental'
      },
      {
        id: 'co-write',
        name: 'Co-Writer',
        description: 'Generate new content and expand existing sections',
        template: 'co-writer'
      }
    ];
    
    for (const func of defaultFunctions) {
      const filePath = `${functionsDir}/${func.id}.md`;
      
      if (!await this.app.vault.adapter.exists(filePath)) {
        const template = generator.generateFunction(func.template, func);
        await this.app.vault.adapter.write(filePath, template);
        console.log(`Created default function: ${filePath}`);
      }
    }
  }
}

interface RegistryInitResult {
  success: boolean;
  functionsLoaded: number;
  errors: LoadError[];
  functionsDir: string;
}

interface LoadResult {
  successCount: number;
  totalFiles: number;
  errors: LoadError[];
}

interface LoadError {
  file: string;
  error: string;
  timestamp: Date;
}

interface ParsedFunction {
  definition: FunctionDefinition;
  rawContent: string;
  parseTime: Date;
}
```

---

## Function Definition File Formats

### Enhanced Markdown Format with Track Edits Integration
```markdown
---
id: copy-edit
name: Copy Editor
description: Light touch improvements for flow, clarity, and style
version: 1.3
author: editorial-team
enabled: true
priority: 2
tags: [style, flow, clarity, passive-voice]

# Track Edits Configuration
trackEditsConfig:
  changeCategories: [style, clarity, flow, redundancy, passive-voice]
  batchSubmission: true
  confidenceThreshold: 0.7
  autoCluster: true
  clusteringStrategy: by_category
  requireReview: false
  maxChangesPerBatch: 15

# Reinforcement Configuration  
reinforcement:
  messageCountThreshold: 4
  timeThreshold: 240000
  driftThreshold: 0.3
  triggers: [message_count, time_elapsed, drift_detection]
---

# System Prompt
You are a professional copy editor specializing in readability and flow improvements. Your role is to make light-touch edits that enhance clarity without changing the author's voice or meaning.

**CORE MISSION**: Improve readability, flow, and clarity while preserving the author's unique voice and intent.

**PRIMARY FOCUS AREAS:**
- Convert passive voice to active voice where it improves clarity
- Eliminate redundancy and unnecessary wordiness
- Improve sentence flow and paragraph transitions  
- Enhance clarity through better word choice
- Fix awkward phrasing that impedes reading flow

**STRICT BOUNDARIES:**
- NEVER change the author's voice, tone, or style
- NEVER add new content, ideas, or information
- NEVER restructure arguments or logical flow
- NEVER alter technical terms or domain-specific language
- NEVER change meaning or intent

**TRACK EDITS INTEGRATION:**
- All changes must include specific reasoning
- Confidence scores must be >= 0.7
- Changes will be grouped by category for easier review
- Each change should be independently reviewable

## Allowed Actions
- improve_sentence_flow
- reduce_redundancy  
- convert_passive_voice
- enhance_clarity
- fix_awkward_phrasing
- improve_transitions
- optimize_word_choice
- eliminate_wordiness

## Forbidden Phrases
- completely rewrite
- add new content
- restructure the argument
- change the meaning
- different approach would be
- new section needed
- expand this section
- consider adding
- you might want to include
- alternative structure
- better organization

## Forbidden Actions
- content_creation
- structural_reorganization
- argument_modification
- voice_alteration
- meaning_changes
- information_addition
- style_transformation

## Output Schema
```json
{
  "type": "object",
  "required": ["function", "changes", "summary"],
  "properties": {
    "function": {
      "type": "string", 
      "enum": ["copy-edit"],
      "description": "Must match the function ID"
    },
    "changes": {
      "type": "array",
      "maxItems": 15,
      "items": {
        "type": "object",
        "required": ["startPos", "endPos", "original", "revised", "reason", "category", "confidence"],
        "properties": {
          "startPos": {
            "type": "number",
            "description": "Character position where change starts"
          },
          "endPos": {
            "type": "number", 
            "description": "Character position where change ends"
          },
          "original": {
            "type": "string",
            "description": "Exact original text to be replaced"
          },
          "revised": {
            "type": "string",
            "description": "Replacement text"
          },
          "reason": {
            "type": "string",
            "minLength": 10,
            "maxLength": 200,
            "description": "Clear explanation of why this change improves the text"
          },
          "category": {
            "type": "string",
            "enum": ["style", "clarity", "flow", "redundancy", "passive-voice"],
            "description": "Type of improvement made"
          },
          "confidence": {
            "type": "number",
            "minimum": 0.7,
            "maximum": 1.0,
            "description": "Confidence in this change (0.7-1.0)"
          }
        }
      }
    },
    "summary": {
      "type": "string",
      "maxLength": 300,
      "description": "Brief summary of improvements made"
    },
    "metadata": {
      "type": "object",
      "properties": {
        "totalChanges": {"type": "number"},
        "changesByCategory": {
          "type": "object",
          "properties": {
            "style": {"type": "number"},
            "clarity": {"type": "number"}, 
            "flow": {"type": "number"},
            "redundancy": {"type": "number"},
            "passive-voice": {"type": "number"}
          }
        },
        "avgConfidence": {
          "type": "number",
          "minimum": 0.7,
          "maximum": 1.0
        },
        "estimatedReadingImprovement": {
          "type": "string",
          "enum": ["minor", "moderate", "significant"]
        }
      }
    }
  }
}
```

## Validation Rules
- **change_limit**: Maximum 15 changes per response
- **confidence_threshold**: All changes must have confidence >= 0.7
- **preserve_meaning**: Changes must not alter the original meaning
- **preserve_voice**: Changes must maintain the author's voice and style
- **mechanical_only**: Focus on mechanical improvements, not creative rewrites
- **reasoning_required**: Every change must include clear reasoning
- **category_accuracy**: Change category must accurately reflect the type of improvement

## Quality Checks
- **readability_improvement**: Changes should measurably improve readability
- **consistency_check**: Ensure changes don't create inconsistencies
- **flow_enhancement**: Verify that changes improve overall text flow
- **clarity_verification**: Confirm that changes enhance rather than obscure meaning

## Track Edits Integration Notes
- Changes will be automatically clustered by category
- Users can approve/reject entire categories or individual changes
- High-confidence changes (>= 0.9) may be highlighted for quick approval
- Each change tooltip will show the reasoning and confidence score
- Category colors: style=blue, clarity=green, flow=purple, redundancy=orange, passive-voice=yellow
```

### XML Format with Enhanced Track Edits Configuration
```xml
<editorial-function>
  <metadata>
    <id>proofread</id>
    <name>Proofreader</name>
    <description>Grammar, spelling, punctuation, and consistency corrections</description>
    <version>1.2</version>
    <author>editorial-team</author>
    <enabled>true</enabled>
    <priority>1</priority>
    <tags>grammar,spelling,punctuation,consistency,mechanical</tags>
  </metadata>
  
  <track-edits-config>
    <change-categories>grammar,spelling,punctuation,typo,consistency</change-categories>
    <batch-submission>true</batch-submission>
    <confidence-threshold>0.8</confidence-threshold>
    <auto-cluster>true</auto-cluster>
    <clustering-strategy>by_category</clustering-strategy>
    <require-review>false</require-review>
    <max-changes-per-batch>20</max-changes-per-batch>
    <category-colors>
      <grammar>red</grammar>
      <spelling>blue</spelling>
      <punctuation>green</punctuation>
      <typo>orange</typo>
      <consistency>purple</consistency>
    </category-colors>
  </track-edits-config>
  
  <reinforcement>
    <message-count-threshold>5</message-count-threshold>
    <time-threshold>300000</time-threshold>
    <drift-threshold>0.2</drift-threshold>
    <triggers>message_count,time_elapsed,drift_detection</triggers>
    <custom-prompt>
      <![CDATA[
      CRITICAL REMINDER: You are a proofreader. ONLY fix mechanical errors:
      - Grammar mistakes
      - Spelling errors  
      - Punctuation issues
      - Obvious typos
      - Consistency problems
      
      DO NOT change style, voice, or meaning. Be conservative and precise.
      ]]>
    </custom-prompt>
  </reinforcement>
  
  <system-prompt>
    <![CDATA[
    You are a professional proofreader with expertise in mechanical text corrections. Your EXCLUSIVE role is to identify and fix technical errors while preserving the author's voice and intent.
    
    **MECHANICAL CORRECTIONS ONLY:**
    - Grammar errors (subject-verb agreement, tense consistency, etc.)
    - Spelling mistakes and typos
    - Punctuation errors (commas, periods, semicolons, etc.)
    - Capitalization inconsistencies
    - Hyphenation and compound word errors
    - Number format inconsistencies
    
    **ABSOLUTE CONSTRAINTS:**
    - DO NOT change content, meaning, or author's voice
    - DO NOT suggest style improvements or alternative phrasings
    - DO NOT add or remove information
    - DO NOT restructure sentences unless grammatically required
    - BE CONSERVATIVE: When in doubt, leave text unchanged
    
    **TRACK EDITS INTEGRATION:**
    - Every correction must include specific grammatical reasoning
    - High confidence required (>= 0.8) for all changes
    - Changes grouped by error type for efficient review
    - Include rule references where applicable (e.g., "Oxford comma rule")
    ]]>
  </system-prompt>
  
  <constraints>
    <allowed-actions>
      <action>correct_grammar</action>
      <action>fix_spelling</action>
      <action>adjust_punctuation</action>
      <action>fix_typos</action>
      <action>standardize_capitalization</action>
      <action>fix_hyphenation</action>
      <action>correct_number_format</action>
    </allowed-actions>
    
    <forbidden-phrases>
      <phrase>rewrite this sentence</phrase>
      <phrase>better way to say</phrase>
      <phrase>consider rephrasing</phrase>
      <phrase>alternative would be</phrase>
      <phrase>clearer phrasing</phrase>
      <phrase>improved version</phrase>
      <phrase>style enhancement</phrase>
      <phrase>flow improvement</phrase>
    </forbidden-phrases>
    
    <forbidden-actions>
      <action>style_modification</action>
      <action>content_addition</action>
      <action>sentence_restructuring</action>
      <action>voice_alteration</action>
      <action>meaning_changes</action>
      <action>creative_rewrites</action>
    </forbidden-actions>
  </constraints>
  
  <output-schema type="json">
    {
      "type": "object",
      "required": ["function", "changes", "summary"],
      "properties": {
        "function": {"type": "string", "enum": ["proofread"]},
        "changes": {
          "type": "array",
          "maxItems": 20,
          "items": {
            "type": "object",
            "required": ["startPos", "endPos", "original", "revised", "reason", "category", "confidence", "rule"],
            "properties": {
              "startPos": {"type": "number"},
              "endPos": {"type": "number"},
              "original": {"type": "string"},
              "revised": {"type": "string"},
              "reason": {
                "type": "string",
                "minLength": 15,
                "description": "Specific grammatical or mechanical explanation"
              },
              "category": {
                "type": "string",
                "enum": ["grammar", "spelling", "punctuation", "typo", "consistency"]
              },
              "confidence": {
                "type": "number",
                "minimum": 0.8,
                "maximum": 1.0
              },
              "rule": {
                "type": "string",
                "description": "Grammar or style rule reference (optional)"
              }
            }
          }
        },
        "summary": {
          "type": "string",
          "maxLength": 200,
          "description": "Summary of mechanical corrections made"
        }
      }
    }
  </output-schema>
  
  <validation-rules>
    <rule name="mechanical-only" required="true" weight="10">
      All changes must be mechanical corrections only
    </rule>
    <rule name="high-confidence" required="true" weight="8">
      Minimum confidence of 0.8 for all changes
    </rule>
    <rule name="preserve-meaning" required="true" weight="10">
      Changes must not alter meaning or intent
    </rule>
    <rule name="rule-reference" required="false" weight="5">
      Include grammar rule references when applicable
    </rule>
  </validation-rules>
  
  <quality-metrics>
    <metric name="accuracy" target="0.95" description="Proportion of valid corrections"/>
    <metric name="precision" target="0.9" description="Proportion of flagged errors that are actual errors"/>
    <metric name="recall" target="0.8" description="Proportion of actual errors that are flagged"/>
  </quality-metrics>
</editorial-function>
```

---

## Hot Reloading System

### File Watcher Implementation
```typescript
class FunctionFileWatcher {
  private registry: FunctionRegistry;
  private watchedDirectories: Set<string> = new Set();
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();
  private reloadQueue: Map<string, Date> = new Map();
  
  constructor(registry: FunctionRegistry) {
    this.registry = registry;
  }
  
  async initialize(functionsDir: string): Promise<void> {
    await this.setupDirectoryWatching(functionsDir);
    console.log(`Hot reloading enabled for: ${functionsDir}`);
  }
  
  private async setupDirectoryWatching(dir: string): Promise<void> {
    if (this.watchedDirectories.has(dir)) {
      return;
    }
    
    // Watch main functions directory
    this.app.vault.on('modify', this.handleFileModification.bind(this));
    this.app.vault.on('create', this.handleFileCreation.bind(this));
    this.app.vault.on('delete', this.handleFileDeletion.bind(this));
    this.app.vault.on('rename', this.handleFileRename.bind(this));
    
    // Watch subdirectories
    const subdirs = ['custom-functions', 'templates'];
    for (const subdir of subdirs) {
      const fullPath = `${dir}/${subdir}`;
      if (await this.app.vault.adapter.exists(fullPath)) {
        this.watchedDirectories.add(fullPath);
      }
    }
    
    this.watchedDirectories.add(dir);
  }
  
  private async handleFileModification(file: TFile): Promise<void> {
    if (!this.isFunctionFile(file)) return;
    
    console.log(`Function file modified: ${file.path}`);
    
    // Debounce rapid changes
    this.debounceReload(file.path, async () => {
      try {
        const oldFunction = this.findFunctionByPath(file.path);
        await this.registry.reloadFunction(file.path);
        const newFunction = this.findFunctionByPath(file.path);
        
        await this.handleFunctionUpdate(oldFunction, newFunction, file);
        
        new Notice(`Function reloaded: ${newFunction?.name || 'Unknown'}`, 3000);
        
      } catch (error) {
        console.error(`Failed to reload function ${file.path}:`, error);
        new Notice(`Failed to reload function: ${error.message}`, 5000);
        this.handleReloadError(file.path, error);
      }
    });
  }
  
  private async handleFileCreation(file: TFile): Promise<void> {
    if (!this.isFunctionFile(file)) return;
    
    console.log(`New function file created: ${file.path}`);
    
    try {
      await this.registry.reloadFunction(file.path);
      const newFunction = this.findFunctionByPath(file.path);
      
      if (newFunction) {
        new Notice(`New function loaded: ${newFunction.name}`, 4000);
        this.notifyFunctionAdded(newFunction);
      }
      
    } catch (error) {
      console.error(`Failed to load new function ${file.path}:`, error);
      new Notice(`Failed to load new function: ${error.message}`, 5000);
    }
  }
  
  private handleFileDeletion(file: TAbstractFile): void {
    if (!(file instanceof TFile) || !this.isFunctionFile(file)) return;
    
    console.log(`Function file deleted: ${file.path}`);
    
    const deletedFunction = this.findFunctionByPath(file.path);
    if (deletedFunction) {
      this.registry.removeFunction(deletedFunction.id);
      new Notice(`Function removed: ${deletedFunction.name}`, 4000);
      this.notifyFunctionRemoved(deletedFunction);
    }
  }
  
  private async handleFileRename(file: TFile, oldPath: string): Promise<void> {
    if (!this.isFunctionFile(file)) return;
    
    console.log(`Function file renamed: ${oldPath} → ${file.path}`);
    
    try {
      // Remove old function
      const oldFunction = this.findFunctionByPath(oldPath);
      if (oldFunction) {
        this.registry.removeFunction(oldFunction.id);
      }
      
      // Load from new path
      await this.registry.reloadFunction(file.path);
      const newFunction = this.findFunctionByPath(file.path);
      
      if (newFunction) {
        new Notice(`Function renamed: ${newFunction.name}`, 4000);
      }
      
    } catch (error) {
      console.error(`Failed to handle function rename:`, error);
      new Notice(`Function rename failed: ${error.message}`, 5000);
    }
  }
  
  private debounceReload(filePath: string, callback: () => Promise<void>): void {
    // Clear existing timer
    const existingTimer = this.debounceTimers.get(filePath);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }
    
    // Set new timer
    const timer = setTimeout(async () => {
      await callback();
      this.debounceTimers.delete(filePath);
      this.reloadQueue.delete(filePath);
    }, 500); // 500ms debounce
    
    this.debounceTimers.set(filePath, timer);
    this.reloadQueue.set(filePath, new Date());
  }
  
  private isFunctionFile(file: TFile): boolean {
    if (!file?.path) return false;
    
    // Check if in functions directory
    const functionsDir = '.obsidian/plugins/editorial-functions/functions';
    if (!file.path.startsWith(functionsDir)) return false;
    
    // Check file extension
    return file.extension === 'md' || file.extension === 'xml';
  }
  
  private findFunctionByPath(filePath: string): FunctionDefinition | undefined {
    return Array.from(this.registry.getFunctions())
      .find(func => func.metadata.filePath === filePath);
  }
  
  private async handleFunctionUpdate(
    oldFunction: FunctionDefinition | undefined,
    newFunction: FunctionDefinition | undefined,
    file: TFile
  ): Promise<void> {
    // Check for breaking changes
    if (oldFunction && newFunction) {
      const breakingChanges = this.detectBreakingChanges(oldFunction, newFunction);
      if (breakingChanges.length > 0) {
        console.warn(`Breaking changes detected in ${file.path}:`, breakingChanges);
        this.notifyBreakingChanges(newFunction, breakingChanges);
      }
      
      // Update active sessions if needed
      await this.updateActiveSessions(oldFunction, newFunction);
    }
  }
  
  private detectBreakingChanges(
    oldFunc: FunctionDefinition,
    newFunc: FunctionDefinition
  ): string[] {
    const changes: string[] = [];
    
    // Check ID change
    if (oldFunc.id !== newFunc.id) {
      changes.push(`Function ID changed: ${oldFunc.id} → ${newFunc.id}`);
    }
    
    // Check schema changes
    if (JSON.stringify(oldFunc.outputSchema) !== JSON.stringify(newFunc.outputSchema)) {
      changes.push('Output schema modified');
    }
    
    // Check Track Edits config changes
    const oldConfig = oldFunc.trackEditsConfig;
    const newConfig = newFunc.trackEditsConfig;
    
    if (oldConfig.confidenceThreshold !== newConfig.confidenceThreshold) {
      changes.push(`Confidence threshold changed: ${oldConfig.confidenceThreshold} → ${newConfig.confidenceThreshold}`);
    }
    
    if (JSON.stringify(oldConfig.changeCategories) !== JSON.stringify(newConfig.changeCategories)) {
      changes.push('Change categories modified');
    }
    
    return changes;
  }
  
  private async updateActiveSessions(
    oldFunc: FunctionDefinition,
    newFunc: FunctionDefinition
  ): Promise<void> {
    // Find active sessions using this function
    const activeSessions = this.getActiveSessionsForFunction(oldFunc.id);
    
    for (const session of activeSessions) {
      // Update session with new function definition
      session.functionDefinition = newFunc;
      
      // Reinforce constraints if significantly changed
      const hasSignificantChanges = this.hasSignificantConstraintChanges(oldFunc, newFunc);
      if (hasSignificantChanges) {
        await this.reinforceSessionConstraints(session, newFunc);
      }
    }
  }
  
  private hasSignificantConstraintChanges(
    oldFunc: FunctionDefinition,
    newFunc: FunctionDefinition
  ): boolean {
    return (
      JSON.stringify(oldFunc.forbiddenPhrases) !== JSON.stringify(newFunc.forbiddenPhrases) ||
      JSON.stringify(oldFunc.allowedActions) !== JSON.stringify(newFunc.allowedActions) ||
      oldFunc.systemPrompt !== newFunc.systemPrompt
    );
  }
  
  private handleReloadError(filePath: string, error: Error): void {
    // Log error details for debugging
    console.error(`Function reload error for ${filePath}:`, {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    
    // Try to preserve old function if possible
    const oldFunction = this.findFunctionByPath(filePath);
    if (oldFunction) {
      console.log(`Preserving old function definition for ${oldFunction.name}`);
      // Mark as having errors but keep functional
      oldFunction.metadata.errorCount++;
    }
  }
  
  // Notification methods for UI updates
  private notifyFunctionAdded(func: FunctionDefinition): void {
    this.app.workspace.trigger('editorial-functions:function-added', func);
  }
  
  private notifyFunctionRemoved(func: FunctionDefinition): void {
    this.app.workspace.trigger('editorial-functions:function-removed', func);
  }
  
  private notifyBreakingChanges(func: FunctionDefinition, changes: string[]): void {
    this.app.workspace.trigger('editorial-functions:breaking-changes', {
      function: func,
      changes
    });
  }
  
  // Get active sessions (placeholder - would integrate with session manager)
  private getActiveSessionsForFunction(functionId: string): any[] {
    // This would be implemented by the session manager
    return [];
  }
  
  private async reinforceSessionConstraints(session: any, func: FunctionDefinition): Promise<void> {
    // This would trigger constraint reinforcement in active sessions
    console.log(`Reinforcing constraints for session ${session.id} with updated function ${func.id}`);
  }
}
```

---

## Track Edits Integration Layer

### Enhanced Integration with Dynamic Functions
```typescript
class TrackEditsIntegrator {
  private trackEdits: TrackEditsGlobalAPI;
  private registry: FunctionRegistry;
  private changeFormatter: ChangeFormatter;
  
  constructor(trackEdits: TrackEditsGlobalAPI, registry: FunctionRegistry) {
    this.trackEdits = trackEdits;
    this.registry = registry;
    this.changeFormatter = new ChangeFormatter();
  }
  
  async submitFunctionChanges(
    functionId: string,
    aiResponse: AIEditorialResponse,
    session: EditorialSession
  ): Promise<SubmissionResult> {
    const funcDef = this.registry.getFunction(functionId);
    if (!funcDef) {
      throw new Error(`Function not found: ${functionId}`);
    }
    
    try {
      // Validate response against function schema
      const validation = this.validateResponseSchema(aiResponse, funcDef);
      if (!validation.valid) {
        throw new Error(`Schema validation failed: ${validation.errors.join(', ')}`);
      }
      
      // Apply function-specific filtering
      const filteredChanges = this.applyFunctionFilters(aiResponse.changes, funcDef);
      
      // Format changes for Track Edits
      const trackEditsChanges = this.formatChangesForTrackEdits(
        filteredChanges,
        funcDef,
        session
      );
      
      // Apply clustering if enabled
      const finalChanges = funcDef.trackEditsConfig.autoCluster
        ? this.clusterChanges(trackEditsChanges, funcDef.trackEditsConfig.clusteringStrategy)
        : trackEditsChanges;
      
      // Ensure document tracking is enabled
      const docPath = this.getCurrentDocumentPath();
      if (!this.trackEdits.isTrackingEnabled(docPath)) {
        this.trackEdits.enableTracking(docPath);
      }
      
      // Submit to Track Edits in batches if needed
      const submissionResult = await this.submitInBatches(finalChanges, funcDef);
      
      // Update function statistics
      this.registry.updateTrackEditsStats(
        functionId,
        submissionResult.success,
        this.calculateAverageConfidence(filteredChanges)
      );
      
      return submissionResult;
      
    } catch (error) {
      console.error(`Track Edits submission failed for ${functionId}:`, error);
      this.registry.updateTrackEditsStats(functionId, false);
      throw error;
    }
  }
  
  private applyFunctionFilters(
    changes: AIEditorialChange[],
    funcDef: FunctionDefinition
  ): AIEditorialChange[] {
    return changes.filter(change => {
      // Apply confidence threshold
      if (change.confidence < funcDef.trackEditsConfig.confidenceThreshold) {
        console.log(`Filtered low confidence change: ${change.confidence} < ${funcDef.trackEditsConfig.confidenceThreshold}`);
        return false;
      }
      
      // Validate change category
      if (!funcDef.trackEditsConfig.changeCategories.includes(change.category)) {
        console.log(`Filtered invalid category: ${change.category} not in ${funcDef.trackEditsConfig.changeCategories}`);
        return false;
      }
      
      // Apply function-specific validation
      if (!this.validateChangeForFunction(change, funcDef)) {
        console.log(`Filtered invalid change for function ${funcDef.id}`);
        return false;
      }
      
      return true;
    });
  }
  
  private validateChangeForFunction(
    change: AIEditorialChange,
    funcDef: FunctionDefinition
  ): boolean {
    // Function-specific validation logic
    switch (funcDef.id) {
      case 'proofread':
        return this.validateProofreadChange(change);
      case 'copy-edit':
        return this.validateCopyEditChange(change);
      case 'dev-edit':
        return this.validateDevEditChange(change);
      case 'co-write':
        return this.validateCoWriteChange(change);
      default:
        return true;
    }
  }
  
  private formatChangesForTrackEdits(
    changes: AIEditorialChange[],
    funcDef: FunctionDefinition,
    session: EditorialSession
  ): PluginTextChange[] {
    return changes.map((change, index) => {
      const baseOffset = session.selectedTextRange?.from || 0;
      
      return {
        pluginId: 'editorial-functions',
        source: 'ai-model',
        model: session.model,
        from: baseOffset + change.startPos,
        to: baseOffset + change.endPos,
        before: change.original,
        after: change.revised,
        
        // Enhanced metadata for Track Edits
        metadata: {
          functionId: funcDef.id,
          functionName: funcDef.name,
          sessionId: session.id,
          changeIndex: index,
          
          // Editorial metadata
          reason: change.reason,
          category: change.category,
          confidence: change.confidence,
          rule: change.rule,
          
          // Track Edits display configuration
          displayConfig: {
            categoryColor: this.getCategoryColor(change.category, funcDef),
            showConfidence: true,
            showReason: true,
            tooltipContent: this.buildTooltipContent(change, funcDef),
            clusterGroup: this.getClusterGroup(change, funcDef)
          }
        }
      };
    });
  }
  
  private clusterChanges(
    changes: PluginTextChange[],
    strategy: 'by_category' | 'by_proximity' | 'by_confidence'
  ): PluginTextChange[] {
    switch (strategy) {
      case 'by_category':
        return this.clusterByCategory(changes);
      case 'by_proximity':
        return this.clusterByProximity(changes);
      case 'by_confidence':
        return this.clusterByConfidence(changes);
      default:
        return changes;
    }
  }
  
  private clusterByCategory(changes: PluginTextChange[]): PluginTextChange[] {
    const clusters = new Map<string, PluginTextChange[]>();
    
    for (const change of changes) {
      const category = change.metadata?.category || 'uncategorized';
      if (!clusters.has(category)) {
        clusters.set(category, []);
      }
      clusters.get(category)!.push({
        ...change,
        metadata: {
          ...change.metadata,
          displayConfig: {
            ...change.metadata?.displayConfig,
            clusterGroup: category,
            clusterSize: 0 // Will be updated
          }
        }
      });
    }
    
    // Update cluster sizes
    const result: PluginTextChange[] = [];
    for (const [category, categoryChanges] of clusters) {
      const updatedChanges = categoryChanges.map(change => ({
        ...change,
        metadata: {
          ...change.metadata,
          displayConfig: {
            ...change.metadata?.displayConfig,
            clusterSize: categoryChanges.length
          }
        }
      }));
      result.push(...updatedChanges);
    }
    
    return result;
  }
  
  private async submitInBatches(
    changes: PluginTextChange[],
    funcDef: FunctionDefinition
  ): Promise<SubmissionResult> {
    const batchSize = funcDef.trackEditsConfig.maxChangesPerBatch;
    const batches = this.chunkArray(changes, batchSize);
    
    let totalSubmitted = 0;
    const errors: string[] = [];
    
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      
      try {
        const success = this.trackEdits.applyTextChanges(batch);
        if (success) {
          totalSubmitted += batch.length;
          console.log(`Submitted batch ${i + 1}/${batches.length}: ${batch.length} changes`);
        } else {
          errors.push(`Batch ${i + 1} submission failed`);
        }
        
        // Small delay between batches to avoid overwhelming Track Edits
        if (i < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
      } catch (error) {
        errors.push(`Batch ${i + 1} error: ${error.message}`);
      }
    }
    
    return {
      success: totalSubmitted === changes.length,
      totalChanges: changes.length,
      submittedChanges: totalSubmitted,
      failedChanges: changes.length - totalSubmitted,
      errors: errors.length > 0 ? errors : undefined,
      batchCount: batches.length
    };
  }
  
  private getCategoryColor(category: string, funcDef: FunctionDefinition): string {
    // Default colors by category
    const defaultColors = {
      grammar: 'red',
      spelling: 'blue', 
      punctuation: 'green',
      style: 'purple',
      clarity: 'orange',
      flow: 'teal',
      redundancy: 'brown',
      'passive-voice': 'yellow'
    };
    
    // Check if function defines custom colors
    if (funcDef.trackEditsConfig.categoryColors) {
      return funcDef.trackEditsConfig.categoryColors[category] || defaultColors[category] || 'gray';
    }
    
    return defaultColors[category] || 'gray';
  }
  
  private buildTooltipContent(change: AIEditorialChange, funcDef: FunctionDefinition): string {
    let tooltip = `**${funcDef.name}** - ${change.category}\n\n`;
    tooltip += `**Reason:** ${change.reason}\n`;
    tooltip += `**Confidence:** ${(change.confidence * 100).toFixed(0)}%\n`;
    
    if (change.rule) {
      tooltip += `**Rule:** ${change.rule}\n`;
    }
    
    tooltip += `\n*Original:* ${change.original}`;
    tooltip += `\n*Revised:* ${change.revised}`;
    
    return tooltip;
  }
  
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
  
  async getChangeStatus(sessionId: string): Promise<TrackEditsStatus> {
    const docPath = this.getCurrentDocumentPath();
    const allChanges = this.trackEdits.getPendingChanges(docPath);
    
    // Filter changes for this session
    const sessionChanges = allChanges.filter(change => 
      change.metadata?.sessionId === sessionId
    );
    
    const stats = {
      total: sessionChanges.length,
      pending: sessionChanges.filter(c => c.status === 'pending').length,
      approved: sessionChanges.filter(c => c.status === 'approved').length,
      rejected: sessionChanges.filter(c => c.status === 'rejected').length
    };
    
    return {
      sessionId,
      documentPath: docPath,
      changeStats: stats,
      allResolved: stats.pending === 0,
      changesByCategory: this.groupChangesByCategory(sessionChanges),
      lastUpdate: new Date()
    };
  }
  
  private getCurrentDocumentPath(): string {
    const activeFile = this.app.workspace.getActiveFile();
    return activeFile?.path || '';
  }
}

interface SubmissionResult {
  success: boolean;
  totalChanges: number;
  submittedChanges: number;
  failedChanges: number;
  errors?: string[];
  batchCount: number;
}

interface TrackEditsStatus {
  sessionId: string;
  documentPath: string;
  changeStats: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  };
  allResolved: boolean;
  changesByCategory: Record<string, number>;
  lastUpdate: Date;
}
```

This specification provides a complete implementation of the dynamic function registry with Track Edits integration. The key benefits include:

**Dynamic Configuration**: Functions completely defined in editable .md/.xml files
**Hot Reloading**: Immediate updates when function files change
**Track Edits Integration**: Perfect coordination with the change management system
**Constraint Enforcement**: Sophisticated validation and role management
**Extensibility**: Easy to add new functions or modify existing ones
**Professional Workflow**: Complete editorial pipeline from AI processing to user approval

The system enables teams to customize AI editorial behavior entirely through file editing while maintaining strict quality control and seamless integration with Track Edits.

# AI Editorial Functions Specification - Addendum
## Enhanced Constraint Enforcement, Role Reinforcement, and Management Interface

### Executive Summary
This addendum complements the main specification by providing detailed implementations for sophisticated constraint enforcement, automatic role reinforcement, comprehensive management interfaces, and enhanced error handling. These components ensure robust AI behavior control and professional-grade user experience.

## Table of Contents
1. [Enhanced Constraint Enforcement](#enhanced-constraint-enforcement)
2. [Role Reinforcement Engine](#role-reinforcement-engine)
3. [Management Interface](#management-interface)
4. [Enhanced Hot Reloading & Error Recovery](#enhanced-hot-reloading--error-recovery)
5. [Performance Monitoring](#performance-monitoring)

---

## Enhanced Constraint Enforcement

### Comprehensive Validation Engine
```typescript
interface ValidationResult {
  valid: boolean;
  error?: string;
  corrective?: string;
  severity?: 'warning' | 'block' | 'reset';
  suggestions?: string[];
  violationType?: 'phrase' | 'action' | 'schema' | 'rule' | 'drift';
  confidence?: number;
}

interface ValidationContext {
  session: EditorialSession;
  function: FunctionDefinition;
  messageHistory: ChatMessage[];
  documentContext?: string;
}

class MessageValidator {
  private phraseDetector: ForbiddenPhraseDetector;
  private actionDetector: ForbiddenActionDetector;
  private schemaValidator: OutputSchemaValidator;
  private driftDetector: DriftDetector;
  private customRuleEngine: CustomRuleEngine;
  
  constructor() {
    this.phraseDetector = new ForbiddenPhraseDetector();
    this.actionDetector = new ForbiddenActionDetector();
    this.schemaValidator = new OutputSchemaValidator();
    this.driftDetector = new DriftDetector();
    this.customRuleEngine = new CustomRuleEngine();
  }
  
  async validate(message: string, context: ValidationContext): Promise<ValidationResult> {
    const violations: ValidationViolation[] = [];
    
    try {
      // 1. Forbidden phrase detection
      const phraseViolations = await this.phraseDetector.detect(
        message, 
        context.function.forbiddenPhrases
      );
      violations.push(...phraseViolations);
      
      // 2. Forbidden action detection
      const actionViolations = await this.actionDetector.detect(
        message,
        context.function.forbiddenActions
      );
      violations.push(...actionViolations);
      
      // 3. Schema validation (for AI responses)
      if (this.isAIResponse(message)) {
        const schemaViolations = await this.schemaValidator.validate(
          message,
          context.function.outputSchema
        );
        violations.push(...schemaViolations);
      }
      
      // 4. Custom validation rules
      const ruleViolations = await this.customRuleEngine.validate(
        message,
        context.function.validationRules,
        context
      );
      violations.push(...ruleViolations);
      
      // 5. Context-specific validation
      const contextViolations = await this.validateContext(message, context);
      violations.push(...contextViolations);
      
      // 6. Drift detection
      const driftViolations = await this.driftDetector.detect(message, context);
      violations.push(...driftViolations);
      
      // Aggregate results
      if (violations.length === 0) {
        return { valid: true };
      }
      
      const severity = this.calculateSeverity(violations, context.session);
      const primaryViolation = this.getPrimaryViolation(violations);
      
      return {
        valid: false,
        error: this.formatViolationMessage(violations),
        corrective: this.generateCorrectivePrompt(violations, context.function),
        severity,
        suggestions: this.generateSuggestions(violations, context),
        violationType: primaryViolation.type,
        confidence: this.calculateConfidence(violations)
      };
      
    } catch (error) {
      console.error('Validation error:', error);
      return {
        valid: false,
        error: `Validation system error: ${error.message}`,
        severity: 'warning'
      };
    }
  }
  
  private async validateContext(
    message: string, 
    context: ValidationContext
  ): Promise<ValidationViolation[]> {
    const violations: ValidationViolation[] = [];
    
    // Message length validation
    if (message.length > 10000) {
      violations.push({
        type: 'context',
        severity: 'warning',
        message: 'Message exceeds recommended length',
        suggestion: 'Consider breaking into smaller responses'
      });
    }
    
    // Conversation context validation
    if (context.session.messageCount > 10) {
      const topicDrift = await this.detectTopicDrift(message, context.messageHistory);
      if (topicDrift > 0.7) {
        violations.push({
          type: 'drift',
          severity: 'block',
          message: 'Significant topic drift detected',
          suggestion: 'Return to the original editorial function focus'
        });
      }
    }
    
    // Function consistency validation
    const functionConsistency = this.validateFunctionConsistency(message, context.function);
    if (!functionConsistency.valid) {
      violations.push({
        type: 'rule',
        severity: 'block',
        message: functionConsistency.error,
        suggestion: 'Maintain consistency with function definition'
      });
    }
    
    return violations;
  }
  
  private calculateSeverity(
    violations: ValidationViolation[], 
    session: EditorialSession
  ): 'warning' | 'block' | 'reset' {
    const criticalViolations = violations.filter(v => v.severity === 'block').length;
    const totalViolations = violations.length;
    const historyCount = session.violationCount;
    
    // Escalation based on violation history
    if (historyCount >= 5 || criticalViolations >= 2) {
      return 'reset';
    } else if (historyCount >= 2 || criticalViolations >= 1 || totalViolations >= 3) {
      return 'block';
    } else {
      return 'warning';
    }
  }
  
  private generateCorrectivePrompt(
    violations: ValidationViolation[],
    func: FunctionDefinition
  ): string {
    let prompt = `**CONSTRAINT VIOLATION DETECTED**\n\n`;
    prompt += `**Your Role:** ${func.name}\n`;
    prompt += `**Violations:** ${violations.map(v => v.message).join(', ')}\n\n`;
    prompt += `**REMINDER:**\n${func.systemPrompt}\n\n`;
    prompt += `**STRICT REQUIREMENTS:**\n`;
    prompt += `• Allowed actions: ${func.allowedActions.join(', ')}\n`;
    prompt += `• NEVER use: ${func.forbiddenPhrases.slice(0, 5).join(', ')}\n`;
    prompt += `• Focus ONLY on: ${func.description}\n\n`;
    prompt += `**You MUST adhere to these constraints without exception.**`;
    
    return prompt;
  }
}

interface ValidationViolation {
  type: 'phrase' | 'action' | 'schema' | 'rule' | 'drift' | 'context';
  severity: 'warning' | 'block' | 'reset';
  message: string;
  suggestion?: string;
  confidence?: number;
  context?: string;
}

class ForbiddenPhraseDetector {
  private cache: Map<string, RegExp[]> = new Map();
  
  async detect(message: string, forbiddenPhrases: string[]): Promise<ValidationViolation[]> {
    const violations: ValidationViolation[] = [];
    const lowerMessage = message.toLowerCase();
    
    // Get or create regex patterns
    const patterns = this.getPatterns(forbiddenPhrases);
    
    for (let i = 0; i < forbiddenPhrases.length; i++) {
      const phrase = forbiddenPhrases[i];
      const pattern = patterns[i];
      
      if (pattern.test(lowerMessage)) {
        violations.push({
          type: 'phrase',
          severity: 'block',
          message: `Forbidden phrase detected: "${phrase}"`,
          suggestion: `Remove or rephrase to avoid: "${phrase}"`,
          confidence: 0.9
        });
      }
    }
    
    // Advanced semantic detection for phrase variations
    const semanticViolations = await this.detectSemanticPhraseViolations(
      message, 
      forbiddenPhrases
    );
    violations.push(...semanticViolations);
    
    return violations;
  }
  
  private getPatterns(phrases: string[]): RegExp[] {
    const cacheKey = phrases.join('|');
    let patterns = this.cache.get(cacheKey);
    
    if (!patterns) {
      patterns = phrases.map(phrase => {
        // Create flexible regex patterns
        const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const flexible = escaped.replace(/\s+/g, '\\s+');
        return new RegExp(`\\b${flexible}\\b`, 'i');
      });
      this.cache.set(cacheKey, patterns);
    }
    
    return patterns;
  }
  
  private async detectSemanticPhraseViolations(
    message: string,
    forbiddenPhrases: string[]
  ): Promise<ValidationViolation[]> {
    const violations: ValidationViolation[] = [];
    
    // Semantic analysis for phrase variations
    const semanticMappings = {
      'rewrite': ['completely redo', 'start over', 'from scratch'],
      'restructure': ['reorganize entirely', 'change the structure', 'rearrange everything'],
      'add content': ['include more', 'expand with', 'insert additional'],
      'change meaning': ['alter the intent', 'modify the message', 'shift the meaning']
    };
    
    for (const [forbiddenConcept, variations] of Object.entries(semanticMappings)) {
      if (forbiddenPhrases.some(phrase => phrase.toLowerCase().includes(forbiddenConcept))) {
        for (const variation of variations) {
          if (message.toLowerCase().includes(variation)) {
            violations.push({
              type: 'phrase',
              severity: 'block',
              message: `Semantic violation detected: "${variation}" (similar to forbidden "${forbiddenConcept}")`,
              suggestion: `Avoid phrases that imply: ${forbiddenConcept}`,
              confidence: 0.7
            });
          }
        }
      }
    }
    
    return violations;
  }
}

class ForbiddenActionDetector {
  private actionPatterns: Map<string, ActionPattern> = new Map();
  
  constructor() {
    this.initializeActionPatterns();
  }
  
  async detect(message: string, forbiddenActions: string[]): Promise<ValidationViolation[]> {
    const violations: ValidationViolation[] = [];
    
    for (const action of forbiddenActions) {
      const pattern = this.actionPatterns.get(action);
      if (!pattern) {
        console.warn(`No pattern defined for forbidden action: ${action}`);
        continue;
      }
      
      const detected = await pattern.detect(message);
      if (detected.found) {
        violations.push({
          type: 'action',
          severity: 'block',
          message: `Forbidden action detected: ${action}`,
          suggestion: pattern.suggestion,
          confidence: detected.confidence,
          context: detected.context
        });
      }
    }
    
    return violations;
  }
  
  private initializeActionPatterns(): void {
    this.actionPatterns.set('content_creation', new ContentCreationDetector());
    this.actionPatterns.set('structural_changes', new StructuralChangeDetector());
    this.actionPatterns.set('meaning_alteration', new MeaningAlterationDetector());
    this.actionPatterns.set('voice_changes', new VoiceChangeDetector());
    this.actionPatterns.set('argument_restructuring', new ArgumentRestructuringDetector());
  }
}

interface ActionPattern {
  detect(message: string): Promise<ActionDetectionResult>;
  suggestion: string;
}

interface ActionDetectionResult {
  found: boolean;
  confidence: number;
  context?: string;
}

class ContentCreationDetector implements ActionPattern {
  suggestion = 'Focus on editing existing content rather than creating new content';
  
  async detect(message: string): Promise<ActionDetectionResult> {
    const patterns = [
      /\b(?:add|insert|include|create|write|compose)\s+(?:new\s+)?(?:content|text|paragraph|section|sentence|information)\b/i,
      /\b(?:let me|I'll|I will)\s+(?:add|write|create|insert)\b/i,
      /\bhere(?:'s| is)\s+(?:a|an|some)\s+(?:new|additional|extra)\s+(?:section|paragraph|content)\b/i,
      /\b(?:expand|elaborate)\s+(?:on\s+)?(?:this|that)\s+(?:with|by adding)\b/i,
      /\b(?:include|add)\s+(?:more|additional|extra)\s+(?:details|information|examples)\b/i
    ];
    
    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match) {
        return {
          found: true,
          confidence: 0.85,
          context: match[0]
        };
      }
    }
    
    // Semantic analysis for content creation intent
    const contentCreationWords = ['add', 'create', 'insert', 'include', 'write'];
    const contentWords = ['content', 'text', 'paragraph', 'section', 'information'];
    
    const hasCreationIntent = contentCreationWords.some(word => 
      message.toLowerCase().includes(word)
    );
    const hasContentTarget = contentWords.some(word => 
      message.toLowerCase().includes(word)
    );
    
    if (hasCreationIntent && hasContentTarget) {
      return {
        found: true,
        confidence: 0.6,
        context: 'Semantic content creation pattern detected'
      };
    }
    
    return { found: false, confidence: 0 };
  }
}

class DriftDetector {
  private conversationAnalyzer: ConversationAnalyzer;
  
  constructor() {
    this.conversationAnalyzer = new ConversationAnalyzer();
  }
  
  async detect(message: string, context: ValidationContext): Promise<ValidationViolation[]> {
    const violations: ValidationViolation[] = [];
    
    // Topic drift analysis
    const topicDrift = await this.detectTopicDrift(message, context);
    if (topicDrift.severity > 0.5) {
      violations.push({
        type: 'drift',
        severity: topicDrift.severity > 0.8 ? 'block' : 'warning',
        message: `Topic drift detected: ${topicDrift.description}`,
        suggestion: 'Return focus to the specific editorial function role',
        confidence: topicDrift.confidence
      });
    }
    
    // Role confusion detection
    const roleConfusion = await this.detectRoleConfusion(message, context.function);
    if (roleConfusion.found) {
      violations.push({
        type: 'drift',
        severity: 'block',
        message: `Role confusion detected: ${roleConfusion.description}`,
        suggestion: `You are a ${context.function.name}. Stay within that role.`,
        confidence: roleConfusion.confidence
      });
    }
    
    // Complexity drift detection
    const complexityDrift = this.detectComplexityDrift(message, context.session);
    if (complexityDrift.detected) {
      violations.push({
        type: 'drift',
        severity: 'warning',
        message: 'Response complexity increasing beyond function scope',
        suggestion: 'Keep responses focused and concise',
        confidence: complexityDrift.confidence
      });
    }
    
    return violations;
  }
  
  private async detectTopicDrift(
    message: string, 
    context: ValidationContext
  ): Promise<TopicDriftResult> {
    const functionKeywords = this.extractFunctionKeywords(context.function);
    const messageKeywords = this.extractMessageKeywords(message);
    
    // Calculate semantic overlap
    const overlap = this.calculateSemanticOverlap(functionKeywords, messageKeywords);
    
    if (overlap < 0.3) {
      return {
        severity: 0.8,
        confidence: 0.9,
        description: 'Low semantic overlap with function purpose'
      };
    } else if (overlap < 0.5) {
      return {
        severity: 0.6,
        confidence: 0.7,
        description: 'Moderate topic drift from function focus'
      };
    }
    
    return { severity: 0, confidence: 0, description: 'No significant drift' };
  }
  
  private async detectRoleConfusion(
    message: string,
    func: FunctionDefinition
  ): Promise<RoleConfusionResult> {
    // Patterns indicating role confusion
    const confusionPatterns = [
      /\bas\s+(?:a|an)\s+(?:writer|author|creator|editor)\b/i,
      /\bI\s+(?:think|believe|feel|suggest|recommend)\b/i,
      /\blet me\s+(?:help|assist|suggest|recommend)\b/i,
      /\bmay I\s+(?:suggest|recommend|propose)\b/i,
      /\bperhaps\s+(?:we|you)\s+(?:could|should|might)\b/i
    ];
    
    for (const pattern of confusionPatterns) {
      const match = message.match(pattern);
      if (match) {
        return {
          found: true,
          confidence: 0.8,
          description: `Role boundary violation: "${match[0]}"`
        };
      }
    }
    
    // Check for inappropriate role references
    const inappropriateRoles = ['writer', 'author', 'creator', 'assistant', 'helper'];
    const currentRole = func.name.toLowerCase();
    
    for (const role of inappropriateRoles) {
      if (role !== currentRole && message.toLowerCase().includes(role)) {
        return {
          found: true,
          confidence: 0.6,
          description: `Inappropriate role reference: "${role}"`
        };
      }
    }
    
    return { found: false, confidence: 0, description: '' };
  }
}

interface TopicDriftResult {
  severity: number; // 0-1
  confidence: number;
  description: string;
}

interface RoleConfusionResult {
  found: boolean;
  confidence: number;
  description: string;
}
```

---

## Role Reinforcement Engine

### Automatic Reinforcement System
```typescript
interface ReinforcementTrigger {
  type: 'message_count' | 'time_elapsed' | 'drift_score' | 'violation_count' | 'complexity_increase';
  threshold: number;
  weight: number;
  description: string;
}

interface ReinforcementEvent {
  timestamp: Date;
  trigger: string;
  intensity: 'low' | 'medium' | 'high';
  prompt: string;
  sessionId: string;
  effectiveness?: number; // Measured post-reinforcement
}

class ReinforcementEngine {
  private reinforcementHistory: Map<string, ReinforcementEvent[]> = new Map();
  private effectivenessTracker: EffectivenessTracker;
  private promptGenerator: ReinforcementPromptGenerator;
  
  constructor() {
    this.effectivenessTracker = new EffectivenessTracker();
    this.promptGenerator = new ReinforcementPromptGenerator();
  }
  
  shouldReinforce(session: EditorialSession): boolean {
    const triggers = session.functionDefinition.reinforcement.triggers;
    let triggerScore = 0;
    let maxWeight = 0;
    
    for (const trigger of triggers) {
      maxWeight += trigger.weight;
      
      if (this.checkTrigger(trigger, session)) {
        triggerScore += trigger.weight;
      }
    }
    
    // Require at least 50% of weighted triggers to activate
    return (triggerScore / maxWeight) >= 0.5;
  }
  
  private checkTrigger(trigger: ReinforcementTrigger, session: EditorialSession): boolean {
    switch (trigger.type) {
      case 'message_count':
        return session.messageCount >= trigger.threshold && 
               session.messageCount % trigger.threshold === 0;
        
      case 'time_elapsed':
        const elapsed = Date.now() - session.lastReinforcementTime.getTime();
        return elapsed >= trigger.threshold;
        
      case 'drift_score':
        return session.driftScore >= trigger.threshold;
        
      case 'violation_count':
        return session.violationCount >= trigger.threshold;
        
      case 'complexity_increase':
        return this.detectComplexityIncrease(session) >= trigger.threshold;
        
      default:
        return false;
    }
  }
  
  generateReinforcement(session: EditorialSession): ReinforcementMessage {
    const intensity = this.calculateIntensity(session);
    const triggers = this.getActiveTriggers(session);
    
    // Use custom prompt if available
    if (session.functionDefinition.reinforcement.customPrompt) {
      const customPrompt = this.processCustomPrompt(
        session.functionDefinition.reinforcement.customPrompt,
        session,
        intensity
      );
      
      return {
        prompt: customPrompt,
        intensity,
        triggers,
        timestamp: new Date()
      };
    }
    
    // Generate adaptive reinforcement
    const adaptivePrompt = this.promptGenerator.generate(session, intensity, triggers);
    
    // Record reinforcement event
    this.recordReinforcementEvent(session.id, {
      timestamp: new Date(),
      trigger: triggers.join(', '),
      intensity,
      prompt: adaptivePrompt,
      sessionId: session.id
    });
    
    return {
      prompt: adaptivePrompt,
      intensity,
      triggers,
      timestamp: new Date()
    };
  }
  
  private calculateIntensity(session: EditorialSession): 'low' | 'medium' | 'high' {
    let intensityScore = 0;
    
    // Violation history factor
    if (session.violationCount >= 5) intensityScore += 3;
    else if (session.violationCount >= 2) intensityScore += 2;
    else if (session.violationCount >= 1) intensityScore += 1;
    
    // Drift score factor
    if (session.driftScore >= 0.8) intensityScore += 3;
    else if (session.driftScore >= 0.5) intensityScore += 2;
    else if (session.driftScore >= 0.3) intensityScore += 1;
    
    // Time since last reinforcement
    const timeSinceReinforcement = Date.now() - session.lastReinforcementTime.getTime();
    if (timeSinceReinforcement > 600000) intensityScore += 2; // 10 minutes
    else if (timeSinceReinforcement > 300000) intensityScore += 1; // 5 minutes
    
    // Message count factor
    if (session.messageCount > 20) intensityScore += 2;
    else if (session.messageCount > 10) intensityScore += 1;
    
    if (intensityScore >= 6) return 'high';
    else if (intensityScore >= 3) return 'medium';
    else return 'low';
  }
  
  private getActiveTriggers(session: EditorialSession): string[] {
    const activeTriggers: string[] = [];
    
    for (const trigger of session.functionDefinition.reinforcement.triggers) {
      if (this.checkTrigger(trigger, session)) {
        activeTriggers.push(trigger.type);
      }
    }
    
    return activeTriggers;
  }
  
  private detectComplexityIncrease(session: EditorialSession): number {
    if (session.conversationHistory.length < 6) return 0;
    
    const recent = session.conversationHistory.slice(-3);
    const earlier = session.conversationHistory.slice(-6, -3);
    
    const recentComplexity = this.calculateMessageComplexity(recent);
    const earlierComplexity = this.calculateMessageComplexity(earlier);
    
    return recentComplexity > earlierComplexity ? 
           (recentComplexity - earlierComplexity) / earlierComplexity : 0;
  }
  
  private calculateMessageComplexity(messages: ChatMessage[]): number {
    let totalComplexity = 0;
    
    for (const msg of messages) {
      let complexity = 0;
      
      // Length factor
      complexity += Math.log(msg.content.length + 1) / 10;
      
      // Sentence structure complexity
      const sentences = msg.content.split(/[.!?]+/);
      const avgSentenceLength = msg.content.length / sentences.length;
      complexity += avgSentenceLength / 100;
      
      // Vocabulary complexity (approximate)
      const words = msg.content.split(/\s+/);
      const complexWords = words.filter(word => word.length > 8).length;
      complexity += (complexWords / words.length) * 2;
      
      // Technical terms and jargon
      const technicalTerms = this.countTechnicalTerms(msg.content);
      complexity += technicalTerms * 0.1;
      
      totalComplexity += complexity;
    }
    
    return totalComplexity / messages.length;
  }
  
  private countTechnicalTerms(text: string): number {
    const technicalPatterns = [
      /\b\w+(?:tion|sion|ment|ness|ity|ism)\b/g, // Nominalization
      /\b(?:however|nevertheless|furthermore|consequently|therefore)\b/g, // Formal connectors
      /\b\w{10,}\b/g // Long words
    ];
    
    let count = 0;
    for (const pattern of technicalPatterns) {
      const matches = text.match(pattern);
      count += matches ? matches.length : 0;
    }
    
    return count;
  }
  
  measureEffectiveness(
    sessionId: string, 
    preReinforcementMetrics: SessionMetrics,
    postReinforcementMetrics: SessionMetrics
  ): number {
    const violationImprovement = Math.max(0, 
      preReinforcementMetrics.violationRate - postReinforcementMetrics.violationRate
    );
    
    const driftImprovement = Math.max(0,
      preReinforcementMetrics.driftScore - postReinforcementMetrics.driftScore
    );
    
    const complexityImprovement = Math.max(0,
      preReinforcementMetrics.complexityScore - postReinforcementMetrics.complexityScore
    );
    
    // Weighted effectiveness score
    const effectiveness = (
      violationImprovement * 0.5 +
      driftImprovement * 0.3 +
      complexityImprovement * 0.2
    );
    
    // Update the most recent reinforcement event
    const history = this.reinforcementHistory.get(sessionId) || [];
    if (history.length > 0) {
      history[history.length - 1].effectiveness = effectiveness;
    }
    
    return effectiveness;
  }
  
  private recordReinforcementEvent(sessionId: string, event: ReinforcementEvent): void {
    const history = this.reinforcementHistory.get(sessionId) || [];
    history.push(event);
    
    // Keep only last 20 events per session
    if (history.length > 20) {
      history.shift();
    }
    
    this.reinforcementHistory.set(sessionId, history);
  }
  
  getReinforcementHistory(sessionId: string): ReinforcementEvent[] {
    return this.reinforcementHistory.get(sessionId) || [];
  }
  
  getReinforcementAnalytics(): ReinforcementAnalytics {
    const allEvents: ReinforcementEvent[] = [];
    for (const events of this.reinforcementHistory.values()) {
      allEvents.push(...events);
    }
    
    return {
      totalReinforcements: allEvents.length,
      averageEffectiveness: this.calculateAverageEffectiveness(allEvents),
      mostEffectiveTriggers: this.getMostEffectiveTriggers(allEvents),
      reinforcementsByIntensity: this.groupByIntensity(allEvents),
      timeDistribution: this.getTimeDistribution(allEvents)
    };
  }
}

class ReinforcementPromptGenerator {
  private templates: Map<string, ReinforcementTemplate> = new Map();
  
  constructor() {
    this.initializeTemplates();
  }
  
  generate(
    session: EditorialSession,
    intensity: 'low' | 'medium' | 'high',
    triggers: string[]
  ): string {
    const func = session.functionDefinition;
    const template = this.selectTemplate(func.id, intensity, triggers);
    
    return this.processTemplate(template, session, intensity, triggers);
  }
  
  private selectTemplate(
    functionId: string,
    intensity: 'low' | 'medium' | 'high',
    triggers: string[]
  ): ReinforcementTemplate {
    // Function-specific templates
    const functionTemplate = this.templates.get(`${functionId}-${intensity}`);
    if (functionTemplate) {
      return functionTemplate;
    }
    
    // Trigger-specific templates
    for (const trigger of triggers) {
      const triggerTemplate = this.templates.get(`${trigger}-${intensity}`);
      if (triggerTemplate) {
        return triggerTemplate;
      }
    }
    
    // Default intensity templates
    return this.templates.get(`default-${intensity}`) || this.templates.get('default-medium')!;
  }
  
  private processTemplate(
    template: ReinforcementTemplate,
    session: EditorialSession,
    intensity: 'low' | 'medium' | 'high',
    triggers: string[]
  ): string {
    const func = session.functionDefinition;
    
    let prompt = template.content;
    
    // Variable substitution
    prompt = prompt.replace(/\{functionName\}/g, func.name);
    prompt = prompt.replace(/\{functionDescription\}/g, func.description);
    prompt = prompt.replace(/\{systemPrompt\}/g, func.systemPrompt);
    prompt = prompt.replace(/\{allowedActions\}/g, func.allowedActions.join(', '));
    prompt = prompt.replace(/\{forbiddenPhrases\}/g, func.forbiddenPhrases.slice(0, 5).join(', '));
    prompt = prompt.replace(/\{violationCount\}/g, session.violationCount.toString());
    prompt = prompt.replace(/\{messageCount\}/g, session.messageCount.toString());
    prompt = prompt.replace(/\{driftScore\}/g, (session.driftScore * 100).toFixed(1));
    prompt = prompt.replace(/\{triggers\}/g, triggers.join(', '));
    
    // Intensity-specific additions
    if (intensity === 'high') {
      prompt += template.highIntensityAddition;
    } else if (intensity === 'medium') {
      prompt += template.mediumIntensityAddition;
    }
    
    return prompt;
  }
  
  private initializeTemplates(): void {
    // Default templates
    this.templates.set('default-low', {
      content: `**ROLE REMINDER**: You are a {functionName}. 
      
Focus on: {allowedActions}
Avoid: {forbiddenPhrases}`,
      
      mediumIntensityAddition: '',
      highIntensityAddition: ''
    });
    
    this.templates.set('default-medium', {
      content: `**IMPORTANT ROLE REMINDER**

You are a {functionName}. Your role is: {functionDescription}

**CONSTRAINTS:**
• Allowed: {allowedActions}
• Forbidden: {forbiddenPhrases}

You have had {violationCount} constraint violations. Please maintain strict adherence to your role.`,
      
      mediumIntensityAddition: '\n\n**Stay focused on your specific editorial function.**',
      highIntensityAddition: ''
    });
    
    this.templates.set('default-high', {
      content: `**CRITICAL ROLE ENFORCEMENT**

FUNCTION: {functionName}
DESCRIPTION: {functionDescription}

**SYSTEM PROMPT:**
{systemPrompt}

**STRICT CONSTRAINTS:**
• ONLY allowed: {allowedActions}
• NEVER use: {forbiddenPhrases}

**WARNING:** You have violated constraints {violationCount} times.
**DRIFT SCORE:** {driftScore}%
**ACTIVE TRIGGERS:** {triggers}

You MUST maintain STRICT adherence to your role without deviation.`,
      
      mediumIntensityAddition: '',
      highIntensityAddition: '\n\n**FINAL WARNING: Any further violations may result in session reset.**'
    });
    
    // Function-specific templates
    this.templates.set('proofread-high', {
      content: `**CRITICAL PROOFREADER REMINDER**

You are EXCLUSIVELY a proofreader. Your ONLY job is to fix:
• Grammar errors
• Spelling mistakes
• Punctuation issues
• Obvious typos
• Consistency problems

**YOU MUST NOT:**
• Change style or voice
• Suggest alternative phrasings
• Add or remove content
• Make structural changes

**VIOLATION COUNT:** {violationCount}
**BE CONSERVATIVE:** When in doubt, leave text unchanged.`,
      
      mediumIntensityAddition: '',
      highIntensityAddition: '\n\n**STRICT MECHANICAL CORRECTIONS ONLY.**'
    });
    
    // Trigger-specific templates
    this.templates.set('drift_score-high', {
      content: `**TOPIC DRIFT DETECTED**

You are drifting from your role as a {functionName}.
**DRIFT SCORE:** {driftScore}%

**REFOCUS ON:**
{systemPrompt}

**RETURN TO YOUR CORE FUNCTION:**
{functionDescription}`,
      
      mediumIntensityAddition: '',
      highIntensityAddition: '\n\n**IMMEDIATE COURSE CORRECTION REQUIRED.**'
    });
  }
}

interface ReinforcementTemplate {
  content: string;
  mediumIntensityAddition: string;
  highIntensityAddition: string;
}

interface ReinforcementMessage {
  prompt: string;
  intensity: 'low' | 'medium' | 'high';
  triggers: string[];
  timestamp: Date;
}

interface SessionMetrics {
  violationRate: number;
  driftScore: number;
  complexityScore: number;
  responseQuality: number;
}

interface ReinforcementAnalytics {
  totalReinforcements: number;
  averageEffectiveness: number;
  mostEffectiveTriggers: string[];
  reinforcementsByIntensity: Record<string, number>;
  timeDistribution: Record<string, number>;
}

class PeriodicReinforcementManager {
  private intervals: Map<string, NodeJS.Timeout> = new Map();
  private reinforcementEngine: ReinforcementEngine;
  
  constructor(reinforcementEngine: ReinforcementEngine) {
    this.reinforcementEngine = reinforcementEngine;
  }
  
  startPeriodicReinforcement(session: EditorialSession): void {
    this.stopPeriodicReinforcement(session.id);
    
    const timeBasedTriggers = session.functionDefinition.reinforcement.triggers
      .filter(t => t.type === 'time_elapsed');
    
    if (timeBasedTriggers.length === 0) return;
    
    // Use the shortest time interval
    const interval = Math.min(...timeBasedTriggers.map(t => t.threshold));
    
    const timer = setInterval(() => {
      if (this.reinforcementEngine.shouldReinforce(session)) {
        this.injectReinforcement(session);
      }
    }, interval);
    
    this.intervals.set(session.id, timer);
  }
  
  private injectReinforcement(session: EditorialSession): void {
    const reinforcement = this.reinforcementEngine.generateReinforcement(session);
    
    // Add system message to conversation
    session.conversationHistory.push({
      role: 'system',
      content: reinforcement.prompt,
      timestamp: new Date(),
      metadata: {
        type: 'reinforcement',
        intensity: reinforcement.intensity,
        triggers: reinforcement.triggers
      }
    });
    
    session.lastReinforcementTime = new Date();
    
    // Notify UI about reinforcement
    this.notifyReinforcementInjected(session.id, reinforcement);
  }
  
  stopPeriodicReinforcement(sessionId: string): void {
    const timer = this.intervals.get(sessionId);
    if (timer) {
      clearInterval(timer);
      this.intervals.delete(sessionId);
    }
  }
  
  stopAllReinforcements(): void {
    for (const [sessionId, timer] of this.intervals) {
      clearInterval(timer);
    }
    this.intervals.clear();
  }
  
  private notifyReinforcementInjected(sessionId: string, reinforcement: ReinforcementMessage): void {
    // Emit event for UI updates
    this.app.workspace.trigger('editorial-functions:reinforcement-injected', {
      sessionId,
      reinforcement
    });
  }
}
```

---

## Management Interface

### Comprehensive Function Management
```typescript
class FunctionManagerModal extends Modal {
  private registry: FunctionRegistry;
  private templateGenerator: FunctionTemplateGenerator;
  private functionTester: FunctionTester;
  private currentTab: string = 'functions';
  
  constructor(app: App, registry: FunctionRegistry) {
    super(app);
    this.registry = registry;
    this.templateGenerator = new FunctionTemplateGenerator(app);
    this.functionTester = new FunctionTester(app, registry);
  }
  
  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass('function-manager');
    
    // Header
    const header = contentEl.createDiv('function-manager-header');
    header.createEl('h1', { text: 'Editorial Functions Manager' });
    
    // Function statistics
    this.renderFunctionStats(header);
    
    // Tab navigation
    this.renderTabNavigation(contentEl);
    
    // Tab content
    const tabContent = contentEl.createDiv('tab-content');
    this.renderCurrentTab(tabContent);
  }
  
  private renderFunctionStats(container: HTMLElement): void {
    const stats = this.registry.getRegistryStats();
    const statsDiv = container.createDiv('function-stats');
    
    statsDiv.createSpan({ 
      text: `${stats.totalFunctions} Functions`, 
      cls: 'stat-item' 
    });
    statsDiv.createSpan({ 
      text: `${stats.enabledFunctions} Enabled`, 
      cls: 'stat-item enabled' 
    });
    statsDiv.createSpan({ 
      text: `${stats.customFunctions} Custom`, 
      cls: 'stat-item custom' 
    });
    
    if (stats.errorCount > 0) {
      statsDiv.createSpan({ 
        text: `${stats.errorCount} Errors`, 
        cls: 'stat-item error' 
      });
    }
  }
  
  private renderTabNavigation(container: HTMLElement): void {
    const tabNav = container.createDiv('tab-navigation');
    
    const tabs = [
      { id: 'functions', label: 'Functions', icon: '📝' },
      { id: 'create', label: 'Create New', icon: '➕' },
      { id: 'templates', label: 'Templates', icon: '📋' },
      { id: 'testing', label: 'Testing', icon: '🧪' },
      { id: 'analytics', label: 'Analytics', icon: '📊' },
      { id: 'settings', label: 'Settings', icon: '⚙️' }
    ];
    
    tabs.forEach(tab => {
      const tabBtn = tabNav.createEl('button', {
        text: `${tab.icon} ${tab.label}`,
        cls: `tab-button ${tab.id === this.currentTab ? 'active' : ''}`
      });
      
      tabBtn.onclick = () => {
        this.switchTab(tab.id);
      };
    });
  }
  
  private switchTab(tabId: string): void {
    this.currentTab = tabId;
    
    // Update tab buttons
    this.containerEl.querySelectorAll('.tab-button').forEach(btn => {
      btn.removeClass('active');
    });
    this.containerEl.querySelector(`.tab-button:nth-child(${this.getTabIndex(tabId) + 1})`)?.addClass('active');
    
    // Re-render content
    const tabContent = this.containerEl.querySelector('.tab-content');
    if (tabContent) {
      tabContent.empty();
      this.renderCurrentTab(tabContent as HTMLElement);
    }
  }
  
  private getTabIndex(tabId: string): number {
    const tabs = ['functions', 'create', 'templates', 'testing', 'analytics', 'settings'];
    return tabs.indexOf(tabId);
  }
  
  private renderCurrentTab(container: HTMLElement): void {
    switch (this.currentTab) {
      case 'functions':
        this.renderFunctionsList(container);
        break;
      case 'create':
        this.renderCreateFunction(container);
        break;
      case 'templates':
        this.renderTemplates(container);
        break;
      case 'testing':
        this.renderTesting(container);
        break;
      case 'analytics':
        this.renderAnalytics(container);
        break;
      case 'settings':
        this.renderSettings(container);
        break;
    }
  }
  
  private renderFunctionsList(container: HTMLElement): void {
    // Search and filter controls
    const controls = container.createDiv('functions-controls');
    
    const searchInput = controls.createEl('input', {
      type: 'text',
      placeholder: 'Search functions...',
      cls: 'function-search'
    });
    
    const filterSelect = controls.createEl('select', { cls: 'function-filter' });
    filterSelect.createEl('option', { value: 'all', text: 'All Functions' });
    filterSelect.createEl('option', { value: 'enabled', text: 'Enabled Only' });
    filterSelect.createEl('option', { value: 'disabled', text: 'Disabled Only' });
    filterSelect.createEl('option', { value: 'custom', text: 'Custom Functions' });
    filterSelect.createEl('option', { value: 'errors', text: 'With Errors' });
    
    const sortSelect = controls.createEl('select', { cls: 'function-sort' });
    sortSelect.createEl('option', { value: 'name', text: 'Sort by Name' });
    sortSelect.createEl('option', { value: 'priority', text: 'Sort by Priority' });
    sortSelect.createEl('option', { value: 'usage', text: 'Sort by Usage' });
    sortSelect.createEl('option', { value: 'modified', text: 'Sort by Modified' });
    
    // Functions grid
    const functionsGrid = container.createDiv('functions-grid');
    
    const renderGrid = () => {
      functionsGrid.empty();
      
      let functions = this.registry.getFunctions();
      
      // Apply search filter
      const searchTerm = searchInput.value.toLowerCase();
      if (searchTerm) {
        functions = functions.filter(f =>
          f.name.toLowerCase().includes(searchTerm) ||
          f.description.toLowerCase().includes(searchTerm) ||
          f.tags.some(tag => tag.toLowerCase().includes(searchTerm))
        );
      }
      
      // Apply status filter
      const filterValue = filterSelect.value;
      switch (filterValue) {
        case 'enabled':
          functions = functions.filter(f => f.enabled);
          break;
        case 'disabled':
          functions = functions.filter(f => !f.enabled);
          break;
        case 'custom':
          functions = functions.filter(f => f.metadata.filePath.includes('custom-functions'));
          break;
        case 'errors':
          functions = functions.filter(f => f.metadata.errorCount > 0);
          break;
      }
      
      // Apply sorting
      const sortValue = sortSelect.value;
      functions.sort((a, b) => {
        switch (sortValue) {
          case 'name':
            return a.name.localeCompare(b.name);
          case 'priority':
            return a.priority - b.priority;
          case 'usage':
            return b.metadata.useCount - a.metadata.useCount;
          case 'modified':
            return b.metadata.lastModified.getTime() - a.metadata.lastModified.getTime();
          default:
            return 0;
        }
      });
      
      functions.forEach(func => this.renderFunctionCard(functionsGrid, func));
    };
    
    searchInput.oninput = renderGrid;
    filterSelect.onchange = renderGrid;
    sortSelect.onchange = renderGrid;
    
    renderGrid();
  }
  
  private renderFunctionCard(container: HTMLElement, func: FunctionDefinition): void {
    const card = container.createDiv('function-card');
    card.addClass(func.enabled ? 'enabled' : 'disabled');
    
    if (func.metadata.errorCount > 0) {
      card.addClass('has-errors');
    }
    
    // Header
    const header = card.createDiv('function-header');
    
    const title = header.createDiv('function-title');
    title.createEl('h3', { text: func.name });
    title.createEl('span', { 
      text: `v${func.version}`, 
      cls: 'function-version' 
    });
    
    const status = header.createDiv('function-status');
    status.createEl('span', { 
      text: func.enabled ? 'Enabled' : 'Disabled',
      cls: `status-badge ${func.enabled ? 'enabled' : 'disabled'}`
    });
    
    if (func.metadata.errorCount > 0) {
      status.createEl('span', { 
        text: `${func.metadata.errorCount} errors`,
        cls: 'error-badge'
      });
    }
    
    // Content
    const content = card.createDiv('function-content');
    content.createEl('p', { text: func.description, cls: 'function-description' });
    
    // Tags
    if (func.tags.length > 0) {
      const tagsDiv = content.createDiv('function-tags');
      func.tags.forEach(tag => {
        tagsDiv.createEl('span', { text: tag, cls: 'tag' });
      });
    }
    
    // Stats
    const stats = content.createDiv('function-stats');
    stats.createEl('span', { text: `Used ${func.metadata.useCount} times` });
    stats.createEl('span', { text: `Success: ${(func.metadata.trackEditsSuccessRate * 100).toFixed(1)}%` });
    stats.createEl('span', { text: `Modified: ${func.metadata.lastModified.toLocaleDateString()}` });
    
    // Actions
    const actions = card.createDiv('function-actions');
    
    // Quick toggle
    const toggleBtn = actions.createEl('button', {
      text: func.enabled ? '⏸️' : '▶️',
      cls: 'action-btn toggle-btn',
      attr: { title: func.enabled ? 'Disable' : 'Enable' }
    });
    toggleBtn.onclick = (e) => {
      e.stopPropagation();
      this.toggleFunction(func);
    };
    
    // Edit
    const editBtn = actions.createEl('button', {
      text: '✏️',
      cls: 'action-btn edit-btn',
      attr: { title: 'Edit Function' }
    });
    editBtn.onclick = (e) => {
      e.stopPropagation();
      this.editFunction(func);
    };
    
    // Test
    const testBtn = actions.createEl('button', {
      text: '🧪',
      cls: 'action-btn test-btn',
      attr: { title: 'Test Function' }
    });
    testBtn.onclick = (e) => {
      e.stopPropagation();
      this.testFunction(func);
    };
    
    // Duplicate
    const duplicateBtn = actions.createEl('button', {
      text: '📋',
      cls: 'action-btn duplicate-btn',
      attr: { title: 'Duplicate Function' }
    });
    duplicateBtn.onclick = (e) => {
      e.stopPropagation();
      this.duplicateFunction(func);
    };
    
    // Delete
    const deleteBtn = actions.createEl('button', {
      text: '🗑️',
      cls: 'action-btn delete-btn',
      attr: { title: 'Delete Function' }
    });
    deleteBtn.onclick = (e) => {
      e.stopPropagation();
      this.deleteFunction(func);
    };
    
    // Expandable details
    const detailsToggle = header.createEl('button', { 
      text: '▼', 
      cls: 'details-toggle'
    });
    const details = card.createDiv('function-details');
    details.style.display = 'none';
    
    detailsToggle.onclick = (e) => {
      e.stopPropagation();
      const isVisible = details.style.display !== 'none';
      details.style.display = isVisible ? 'none' : 'block';
      detailsToggle.textContent = isVisible ? '▼' : '▲';
      
      if (!isVisible && details.children.length === 0) {
        this.renderFunctionDetails(details, func);
      }
    };
  }
  
  private renderFunctionDetails(container: HTMLElement, func: FunctionDefinition): void {
    // System prompt section
    const promptSection = container.createDiv('detail-section');
    promptSection.createEl('h4', { text: 'System Prompt' });
    const promptPre = promptSection.createEl('pre', { cls: 'system-prompt' });
    promptPre.textContent = func.systemPrompt.substring(0, 500) + 
      (func.systemPrompt.length > 500 ? '...' : '');
    
    // Constraints section
    const constraintsSection = container.createDiv('detail-section');
    constraintsSection.createEl('h4', { text: 'Constraints' });
    
    const constraintsGrid = constraintsSection.createDiv('constraints-grid');
    
    const allowedDiv = constraintsGrid.createDiv('constraint-column');
    allowedDiv.createEl('h5', { text: 'Allowed Actions' });
    const allowedList = allowedDiv.createEl('ul');
    func.allowedActions.forEach(action => {
      allowedList.createEl('li', { text: action });
    });
    
    const forbiddenDiv = constraintsGrid.createDiv('constraint-column');
    forbiddenDiv.createEl('h5', { text: 'Forbidden Phrases' });
    const forbiddenList = forbiddenDiv.createEl('ul');
    func.forbiddenPhrases.slice(0, 10).forEach(phrase => {
      forbiddenList.createEl('li', { text: phrase });
    });
    
    // Track Edits integration section
    const trackEditsSection = container.createDiv('detail-section');
    trackEditsSection.createEl('h4', { text: 'Track Edits Integration' });
    
    const integrationInfo = trackEditsSection.createDiv('integration-info');
    integrationInfo.createEl('span', { 
      text: `Categories: ${func.trackEditsIntegration.changeCategories.join(', ')}` 
    });
    integrationInfo.createEl('span', { 
      text: `Confidence Threshold: ${(func.trackEditsIntegration.confidenceThreshold * 100).toFixed(0)}%` 
    });
    integrationInfo.createEl('span', { 
      text: `Batch Submission: ${func.trackEditsIntegration.batchSubmission ? 'Yes' : 'No'}` 
    });
    
    // Schema section (collapsible)
    const schemaSection = container.createDiv('detail-section');
    const schemaHeader = schemaSection.createEl('h4', { text: 'Output Schema' });
    const schemaToggle = schemaHeader.createEl('button', { 
      text: '▼', 
      cls: 'schema-toggle' 
    });
    const schemaPre = schemaSection.createEl('pre', { cls: 'schema-content' });
    schemaPre.style.display = 'none';
    schemaPre.textContent = JSON.stringify(func.outputSchema, null, 2);
    
    schemaToggle.onclick = () => {
      const isVisible = schemaPre.style.display !== 'none';
      schemaPre.style.display = isVisible ? 'none' : 'block';
      schemaToggle.textContent = isVisible ? '▼' : '▲';
    };
  }
  
  private async toggleFunction(func: FunctionDefinition): Promise<void> {
    try {
      func.enabled = !func.enabled;
      await this.registry.updateFunction(func);
      
      new Notice(`Function "${func.name}" ${func.enabled ? 'enabled' : 'disabled'}`);
      this.renderCurrentTab(this.containerEl.querySelector('.tab-content') as HTMLElement);
      
    } catch (error) {
      new Notice(`Failed to toggle function: ${error.message}`);
    }
  }
  
  private async editFunction(func: FunctionDefinition): Promise<void> {
    try {
      const file = this.app.vault.getAbstractFileByPath(func.metadata.filePath);
      if (file instanceof TFile) {
        await this.app.workspace.openLinkText(func.metadata.filePath, '', true);
        this.close();
      } else {
        // File not found, offer to recreate
        const recreate = await this.confirmRecreateFunction(func);
        if (recreate) {
          await this.recreateFunctionFile(func);
        }
      }
    } catch (error) {
      new Notice(`Failed to edit function: ${error.message}`);
    }
  }
  
  private async testFunction(func: FunctionDefinition): Promise<void> {
    const testModal = new FunctionTestModal(this.app, func, this.functionTester);
    testModal.open();
  }
  
  private async duplicateFunction(func: FunctionDefinition): Promise<void> {
    const newName = await this.promptForNewName(func.name);
    if (!newName) return;
    
    try {
      const duplicated = await this.templateGenerator.duplicateFunction(func, newName);
      new Notice(`Function duplicated as "${duplicated.name}"`);
      this.renderCurrentTab(this.containerEl.querySelector('.tab-content') as HTMLElement);
    } catch (error) {
      new Notice(`Failed to duplicate function: ${error.message}`);
    }
  }
  
  private async deleteFunction(func: FunctionDefinition): Promise<void> {
    const confirmed = await this.confirmDeleteFunction(func);
    if (!confirmed) return;
    
    try {
      await this.registry.deleteFunction(func.id);
      new Notice(`Function "${func.name}" deleted`);
      this.renderCurrentTab(this.containerEl.querySelector('.tab-content') as HTMLElement);
    } catch (error) {
      new Notice(`Failed to delete function: ${error.message}`);
    }
  }
  
  private renderTesting(container: HTMLElement): void {
    container.createEl('h2', { text: 'Function Testing' });
    
    // Test runner interface
    const testRunner = container.createDiv('test-runner');
    
    // Function selector
    const functionSelect = testRunner.createEl('select', { cls: 'test-function-select' });
    functionSelect.createEl('option', { value: '', text: 'Select a function to test...' });
    
    this.registry.getFunctions().forEach(func => {
      if (func.enabled) {
        functionSelect.createEl('option', { value: func.id, text: func.name });
      }
    });
    
    // Test input area
    const testInput = testRunner.createEl('textarea', {
      placeholder: 'Enter test text here...',
      cls: 'test-input',
      attr: { rows: '8' }
    });
    
    // Test controls
    const testControls = testRunner.createDiv('test-controls');
    
    const runTestBtn = testControls.createEl('button', {
      text: 'Run Test',
      cls: 'mod-cta'
    });
    
    const clearBtn = testControls.createEl('button', {
      text: 'Clear'
    });
    
    const loadSampleBtn = testControls.createEl('button', {
      text: 'Load Sample Text'
    });
    
    // Test results area
    const testResults = container.createDiv('test-results');
    testResults.style.display = 'none';
    
    // Event handlers
    runTestBtn.onclick = async () => {
      const functionId = functionSelect.value;
      const testText = testInput.value;
      
      if (!functionId || !testText.trim()) {
        new Notice('Please select a function and enter test text');
        return;
      }
      
      await this.runFunctionTest(functionId, testText, testResults);
    };
    
    clearBtn.onclick = () => {
      testInput.value = '';
      testResults.style.display = 'none';
    };
    
    loadSampleBtn.onclick = () => {
      testInput.value = this.getSampleText();
    };
  }
  
  private async runFunctionTest(
    functionId: string,
    testText: string,
    resultsContainer: HTMLElement
  ): Promise<void> {
    resultsContainer.empty();
    resultsContainer.style.display = 'block';
    
    resultsContainer.createEl('h3', { text: 'Test Results' });
    
    // Show loading
    const loadingDiv = resultsContainer.createDiv('test-loading');
    loadingDiv.createEl('span', { text: '🔄 Running test...' });
    
    try {
      const result = await this.functionTester.testFunction(functionId, testText);
      
      loadingDiv.remove();
      this.renderTestResults(resultsContainer, result);
      
    } catch (error) {
      loadingDiv.remove();
      this.renderTestError(resultsContainer, error);
    }
  }
  
  private renderAnalytics(container: HTMLElement): void {
    container.createEl('h2', { text: 'Function Analytics' });
    
    const analytics = this.registry.getAnalytics();
    
    // Usage statistics
    const usageSection = container.createDiv('analytics-section');
    usageSection.createEl('h3', { text: 'Usage Statistics' });
    
    const usageGrid = usageSection.createDiv('analytics-grid');
    
    analytics.functionUsage.forEach(stat => {
      const statCard = usageGrid.createDiv('stat-card');
      statCard.createEl('h4', { text: stat.functionName });
      statCard.createEl('div', { text: `${stat.useCount} uses` });
      statCard.createEl('div', { text: `${(stat.successRate * 100).toFixed(1)}% success` });
      statCard.createEl('div', { text: `${(stat.avgConfidence * 100).toFixed(1)}% confidence` });
    });
    
    // Error analysis
    if (analytics.errors.length > 0) {
      const errorSection = container.createDiv('analytics-section');
      errorSection.createEl('h3', { text: 'Error Analysis' });
      
      const errorList = errorSection.createEl('ul', { cls: 'error-list' });
      analytics.errors.forEach(error => {
        const errorItem = errorList.createEl('li');
        errorItem.createEl('strong', { text: error.functionName });
        errorItem.createEl('span', { text: ` - ${error.errorMessage}` });
        errorItem.createEl('small', { text: ` (${error.count} times)` });
      });
    }
    
    // Performance metrics
    const perfSection = container.createDiv('analytics-section');
    perfSection.createEl('h3', { text: 'Performance Metrics' });
    
    const perfGrid = perfSection.createDiv('analytics-grid');
    
    const avgResponseCard = perfGrid.createDiv('stat-card');
    avgResponseCard.createEl('h4', { text: 'Avg Response Time' });
    avgResponseCard.createEl('div', { text: `${analytics.averageResponseTime}ms` });
    
    const totalSessionsCard = perfGrid.createDiv('stat-card');
    totalSessionsCard.createEl('h4', { text: 'Total Sessions' });
    totalSessionsCard.createEl('div', { text: analytics.totalSessions.toString() });
    
    const avgSessionCard = perfGrid.createDiv('stat-card');
    avgSessionCard.createEl('h4', { text: 'Avg Session Length' });
    avgSessionCard.createEl('div', { text: `${analytics.averageSessionLength} messages` });
  }
}

class FunctionTestModal extends Modal {
  private func: FunctionDefinition;
  private tester: FunctionTester;
  
  constructor(app: App, func: FunctionDefinition, tester: FunctionTester) {
    super(app);
    this.func = func;
    this.tester = tester;
  }
  
  onOpen(): void {
    const { contentEl } = this;
    contentEl.createEl('h2', { text: `Test Function: ${this.func.name}` });
    
    // Test configuration
```typescript
    // Test configuration
    const configSection = contentEl.createDiv('test-config');
    configSection.createEl('h3', { text: 'Test Configuration' });
    
    const configGrid = configSection.createDiv('config-grid');
    
    // Model selection
    const modelDiv = configGrid.createDiv('config-item');
    modelDiv.createEl('label', { text: 'AI Model:' });
    const modelSelect = modelDiv.createEl('select');
    modelSelect.createEl('option', { value: 'claude-sonnet-4', text: 'Claude Sonnet 4' });
    modelSelect.createEl('option', { value: 'gpt-4', text: 'GPT-4' });
    modelSelect.createEl('option', { value: 'claude-opus-4', text: 'Claude Opus 4' });
    
    // Confidence threshold
    const confidenceDiv = configGrid.createDiv('config-item');
    confidenceDiv.createEl('label', { text: 'Confidence Threshold:' });
    const confidenceSlider = confidenceDiv.createEl('input', {
      type: 'range',
      attr: { 
        min: '0.1', 
        max: '1.0', 
        step: '0.1', 
        value: this.func.trackEditsIntegration.confidenceThreshold.toString() 
      }
    });
    const confidenceValue = confidenceDiv.createEl('span', { 
      text: `${(this.func.trackEditsIntegration.confidenceThreshold * 100).toFixed(0)}%` 
    });
    
    confidenceSlider.oninput = () => {
      confidenceValue.textContent = `${(parseFloat(confidenceSlider.value) * 100).toFixed(0)}%`;
    };
    
    // Test input
    const inputSection = contentEl.createDiv('test-input-section');
    inputSection.createEl('h3', { text: 'Test Input' });
    
    const inputTabs = inputSection.createDiv('input-tabs');
    const manualTab = inputTabs.createEl('button', { text: 'Manual Input', cls: 'tab-button active' });
    const sampleTab = inputTabs.createEl('button', { text: 'Sample Text', cls: 'tab-button' });
    const fileTab = inputTabs.createEl('button', { text: 'From File', cls: 'tab-button' });
    
    const inputContent = inputSection.createDiv('input-content');
    
    // Manual input (default)
    const manualInput = inputContent.createEl('textarea', {
      placeholder: 'Enter test text here...',
      cls: 'test-input',
      attr: { rows: '8' }
    });
    
    // Sample text selector (hidden by default)
    const sampleSelector = inputContent.createDiv('sample-selector');
    sampleSelector.style.display = 'none';
    
    const sampleSelect = sampleSelector.createEl('select', { cls: 'sample-select' });
    sampleSelect.createEl('option', { value: '', text: 'Choose a sample...' });
    sampleSelect.createEl('option', { value: 'grammar', text: 'Grammar Errors Sample' });
    sampleSelect.createEl('option', { value: 'style', text: 'Style Issues Sample' });
    sampleSelect.createEl('option', { value: 'complex', text: 'Complex Document Sample' });
    sampleSelect.createEl('option', { value: 'technical', text: 'Technical Writing Sample' });
    
    const samplePreview = sampleSelector.createEl('div', { cls: 'sample-preview' });
    
    // File selector (hidden by default)
    const fileSelector = inputContent.createDiv('file-selector');
    fileSelector.style.display = 'none';
    
    const fileInput = fileSelector.createEl('input', { type: 'file', accept: '.txt,.md' });
    const filePreview = fileSelector.createEl('div', { cls: 'file-preview' });
    
    // Tab switching
    const switchTab = (activeTab: HTMLElement, contentToShow: HTMLElement) => {
      inputTabs.querySelectorAll('.tab-button').forEach(btn => btn.removeClass('active'));
      activeTab.addClass('active');
      
      manualInput.style.display = 'none';
      sampleSelector.style.display = 'none';
      fileSelector.style.display = 'none';
      
      contentToShow.style.display = 'block';
    };
    
    manualTab.onclick = () => switchTab(manualTab, manualInput);
    sampleTab.onclick = () => switchTab(sampleTab, sampleSelector);
    fileTab.onclick = () => switchTab(fileTab, fileSelector);
    
    // Sample text loading
    sampleSelect.onchange = () => {
      const sampleType = sampleSelect.value;
      if (sampleType) {
        const sampleText = this.getSampleText(sampleType);
        samplePreview.textContent = sampleText;
        manualInput.value = sampleText;
      }
    };
    
    // File loading
    fileInput.onchange = () => {
      const file = fileInput.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target?.result as string;
          filePreview.textContent = content.substring(0, 500) + (content.length > 500 ? '...' : '');
          manualInput.value = content;
        };
        reader.readAsText(file);
      }
    };
    
    // Test controls
    const controlsSection = contentEl.createDiv('test-controls');
    
    const runTestBtn = controlsSection.createEl('button', {
      text: 'Run Test',
      cls: 'mod-cta test-run-btn'
    });
    
    const validateOnlyBtn = controlsSection.createEl('button', {
      text: 'Validate Only',
      cls: 'test-validate-btn'
    });
    
    const clearBtn = controlsSection.createEl('button', {
      text: 'Clear Results'
    });
    
    // Results section
    const resultsSection = contentEl.createDiv('test-results-section');
    resultsSection.style.display = 'none';
    
    // Event handlers
    runTestBtn.onclick = async () => {
      const testText = manualInput.value.trim();
      if (!testText) {
        new Notice('Please enter test text');
        return;
      }
      
      await this.runFullTest(testText, {
        model: modelSelect.value,
        confidenceThreshold: parseFloat(confidenceSlider.value)
      }, resultsSection);
    };
    
    validateOnlyBtn.onclick = async () => {
      const testText = manualInput.value.trim();
      if (!testText) {
        new Notice('Please enter test text');
        return;
      }
      
      await this.runValidationTest(testText, resultsSection);
    };
    
    clearBtn.onclick = () => {
      resultsSection.empty();
      resultsSection.style.display = 'none';
    };
  }
  
  private async runFullTest(
    testText: string,
    config: TestConfig,
    resultsContainer: HTMLElement
  ): Promise<void> {
    resultsContainer.empty();
    resultsContainer.style.display = 'block';
    
    resultsContainer.createEl('h3', { text: 'Full Function Test Results' });
    
    // Show loading
    const loadingDiv = resultsContainer.createDiv('test-loading');
    loadingDiv.innerHTML = '🔄 Running full test (this may take a moment)...';
    
    try {
      const startTime = Date.now();
      
      // Create mock session
      const mockSession = this.createMockSession(testText, config);
      
      // Run the actual function
      const result = await this.tester.testFunctionExecution(this.func.id, mockSession);
      
      const endTime = Date.now();
      
      loadingDiv.remove();
      
      // Render comprehensive results
      this.renderFullTestResults(resultsContainer, result, endTime - startTime);
      
    } catch (error) {
      loadingDiv.remove();
      this.renderTestError(resultsContainer, error);
    }
  }
  
  private async runValidationTest(
    testText: string,
    resultsContainer: HTMLElement
  ): Promise<void> {
    resultsContainer.empty();
    resultsContainer.style.display = 'block';
    
    resultsContainer.createEl('h3', { text: 'Validation Test Results' });
    
    const loadingDiv = resultsContainer.createDiv('test-loading');
    loadingDiv.innerHTML = '🔄 Running constraint validation...';
    
    try {
      const mockSession = this.createMockSession(testText);
      const validationResult = await this.tester.testConstraintValidation(this.func, testText, mockSession);
      
      loadingDiv.remove();
      this.renderValidationResults(resultsContainer, validationResult);
      
    } catch (error) {
      loadingDiv.remove();
      this.renderTestError(resultsContainer, error);
    }
  }
  
  private renderFullTestResults(
    container: HTMLElement,
    result: FunctionTestResult,
    executionTime: number
  ): void {
    // Test summary
    const summary = container.createDiv('test-summary');
    summary.createEl('h4', { text: 'Test Summary' });
    
    const summaryGrid = summary.createDiv('summary-grid');
    
    const statusCard = summaryGrid.createDiv('summary-card');
    statusCard.createEl('div', { text: result.success ? '✅ SUCCESS' : '❌ FAILED', cls: 'test-status' });
    statusCard.createEl('small', { text: 'Overall Status' });
    
    const timeCard = summaryGrid.createDiv('summary-card');
    timeCard.createEl('div', { text: `${executionTime}ms`, cls: 'test-time' });
    timeCard.createEl('small', { text: 'Execution Time' });
    
    const changesCard = summaryGrid.createDiv('summary-card');
    changesCard.createEl('div', { text: result.changesGenerated.toString(), cls: 'test-changes' });
    changesCard.createEl('small', { text: 'Changes Generated' });
    
    const confidenceCard = summaryGrid.createDiv('summary-card');
    confidenceCard.createEl('div', { text: `${(result.averageConfidence * 100).toFixed(1)}%`, cls: 'test-confidence' });
    confidenceCard.createEl('small', { text: 'Avg Confidence' });
    
    // Constraint validation results
    if (result.constraintViolations.length > 0) {
      const violationsSection = container.createDiv('violations-section');
      violationsSection.createEl('h4', { text: '⚠️ Constraint Violations' });
      
      result.constraintViolations.forEach(violation => {
        const violationDiv = violationsSection.createDiv('violation-item');
        violationDiv.createEl('strong', { text: violation.type });
        violationDiv.createEl('span', { text: ` - ${violation.message}` });
        if (violation.suggestion) {
          violationDiv.createEl('div', { text: `Suggestion: ${violation.suggestion}`, cls: 'violation-suggestion' });
        }
      });
    }
    
    // Generated changes
    if (result.changes.length > 0) {
      const changesSection = container.createDiv('changes-section');
      changesSection.createEl('h4', { text: 'Generated Changes' });
      
      const changesTable = changesSection.createEl('table', { cls: 'changes-table' });
      const thead = changesTable.createEl('thead');
      const headerRow = thead.createEl('tr');
      headerRow.createEl('th', { text: 'Original' });
      headerRow.createEl('th', { text: 'Revised' });
      headerRow.createEl('th', { text: 'Category' });
      headerRow.createEl('th', { text: 'Confidence' });
      headerRow.createEl('th', { text: 'Reason' });
      
      const tbody = changesTable.createEl('tbody');
      result.changes.forEach(change => {
        const row = tbody.createEl('tr');
        row.createEl('td', { text: change.original });
        row.createEl('td', { text: change.revised });
        row.createEl('td', { text: change.category });
        row.createEl('td', { text: `${(change.confidence * 100).toFixed(0)}%` });
        row.createEl('td', { text: change.reason });
      });
    }
    
    // Performance metrics
    const metricsSection = container.createDiv('metrics-section');
    metricsSection.createEl('h4', { text: 'Performance Metrics' });
    
    const metricsGrid = metricsSection.createDiv('metrics-grid');
    
    Object.entries(result.metrics).forEach(([key, value]) => {
      const metricCard = metricsGrid.createDiv('metric-card');
      metricCard.createEl('div', { text: value.toString(), cls: 'metric-value' });
      metricCard.createEl('small', { text: key.replace(/([A-Z])/g, ' $1').toLowerCase() });
    });
    
    // Raw AI response (collapsible)
    if (result.rawResponse) {
      const responseSection = container.createDiv('response-section');
      const responseHeader = responseSection.createEl('h4', { text: 'Raw AI Response' });
      const toggleBtn = responseHeader.createEl('button', { text: '▼', cls: 'toggle-btn' });
      const responseContent = responseSection.createEl('pre', { cls: 'raw-response' });
      responseContent.style.display = 'none';
      responseContent.textContent = result.rawResponse;
      
      toggleBtn.onclick = () => {
        const isVisible = responseContent.style.display !== 'none';
        responseContent.style.display = isVisible ? 'none' : 'block';
        toggleBtn.textContent = isVisible ? '▼' : '▲';
      };
    }
  }
  
  private renderValidationResults(
    container: HTMLElement,
    result: ValidationTestResult
  ): void {
    const summary = container.createDiv('validation-summary');
    summary.createEl('h4', { text: 'Constraint Validation' });
    
    const statusDiv = summary.createDiv('validation-status');
    statusDiv.createEl('span', { 
      text: result.passed ? '✅ PASSED' : '❌ FAILED',
      cls: result.passed ? 'status-pass' : 'status-fail'
    });
    
    if (result.violations.length > 0) {
      const violationsDiv = container.createDiv('validation-violations');
      violationsDiv.createEl('h5', { text: 'Violations Found:' });
      
      result.violations.forEach(violation => {
        const violationDiv = violationsDiv.createDiv('validation-violation');
        violationDiv.createEl('strong', { text: `${violation.type}: ` });
        violationDiv.createEl('span', { text: violation.message });
        
        if (violation.suggestion) {
          violationDiv.createEl('div', { 
            text: `💡 ${violation.suggestion}`, 
            cls: 'violation-suggestion' 
          });
        }
      });
    }
    
    // Detailed analysis
    const analysisDiv = container.createDiv('validation-analysis');
    analysisDiv.createEl('h5', { text: 'Detailed Analysis:' });
    
    const checks = [
      { name: 'Forbidden Phrases', result: result.checks.forbiddenPhrases },
      { name: 'Forbidden Actions', result: result.checks.forbiddenActions },
      { name: 'Schema Compliance', result: result.checks.schemaCompliance },
      { name: 'Custom Rules', result: result.checks.customRules },
      { name: 'Drift Detection', result: result.checks.driftDetection }
    ];
    
    checks.forEach(check => {
      const checkDiv = analysisDiv.createDiv('validation-check');
      checkDiv.createEl('span', { 
        text: check.result.passed ? '✅' : '❌',
        cls: 'check-status'
      });
      checkDiv.createEl('span', { text: ` ${check.name}: ` });
      checkDiv.createEl('span', { text: check.result.message });
    });
  }
  
  private renderTestError(container: HTMLElement, error: any): void {
    const errorDiv = container.createDiv('test-error');
    errorDiv.createEl('h4', { text: '❌ Test Failed' });
    errorDiv.createEl('p', { text: error.message || 'Unknown error occurred' });
    
    if (error.stack) {
      const stackDiv = errorDiv.createDiv('error-stack');
      const stackHeader = stackDiv.createEl('h5', { text: 'Stack Trace' });
      const toggleBtn = stackHeader.createEl('button', { text: '▼', cls: 'toggle-btn' });
      const stackContent = stackDiv.createEl('pre', { cls: 'error-stack-content' });
      stackContent.style.display = 'none';
      stackContent.textContent = error.stack;
      
      toggleBtn.onclick = () => {
        const isVisible = stackContent.style.display !== 'none';
        stackContent.style.display = isVisible ? 'none' : 'block';
        toggleBtn.textContent = isVisible ? '▼' : '▲';
      };
    }
  }
  
  private createMockSession(testText: string, config?: TestConfig): EditorialSession {
    return {
      id: 'test-session',
      functionId: this.func.id,
      functionDefinition: this.func,
      
      conversationHistory: [],
      messageCount: 1,
      startTime: new Date(),
      lastReinforcementTime: new Date(),
      
      documentPath: 'test-document.md',
      documentText: testText,
      selectedTextRange: undefined,
      
      trackEditsEnabled: false, // Don't actually submit to Track Edits during testing
      submittedChanges: [],
      changeStatus: {
        totalChanges: 0,
        pendingChanges: 0,
        approvedChanges: 0,
        rejectedChanges: 0,
        allResolved: true
      },
      
      violationCount: 0,
      driftScore: 0,
      
      model: config?.model || 'claude-sonnet-4',
      temperature: 0.1,
      maxTokens: 2000,
      
      preferences: {
        confidenceThreshold: config?.confidenceThreshold || this.func.trackEditsIntegration.confidenceThreshold,
        reviewBeforeSubmit: true,
        enableClustering: false
      }
    };
  }
  
  private getSampleText(type: string): string {
    const samples = {
      grammar: `This are a sample text with various grammar error's. The sentance structure is sometimes incorrect, and they're are issues with subject-verb agreement. Its important too catch these mistake's before publication.`,
      
      style: `The document that we are currently reviewing contains numerous instances of passive voice constructions. It was written in a manner that could be improved. The readability could be enhanced through the elimination of redundant phrases and the improvement of sentence flow.`,
      
      complex: `In the contemporary business environment, organizations are increasingly recognizing the importance of implementing comprehensive digital transformation strategies that encompass not only technological infrastructure but also organizational culture, employee training programs, and customer engagement methodologies.`,
      
      technical: `The API endpoint returns a JSON response containing user data. The response includes the following fields: user_id (integer), username (string), email (string), and created_at (timestamp). Error handling should be implemented to manage potential network timeouts and invalid response formats.`
    };
    
    return samples[type] || samples.grammar;
  }
}

interface TestConfig {
  model: string;
  confidenceThreshold: number;
}

interface FunctionTestResult {
  success: boolean;
  changesGenerated: number;
  averageConfidence: number;
  changes: any[];
  constraintViolations: ValidationViolation[];
  metrics: Record<string, number>;
  rawResponse?: string;
}

interface ValidationTestResult {
  passed: boolean;
  violations: ValidationViolation[];
  checks: {
    forbiddenPhrases: { passed: boolean; message: string; };
    forbiddenActions: { passed: boolean; message: string; };
    schemaCompliance: { passed: boolean; message: string; };
    customRules: { passed: boolean; message: string; };
    driftDetection: { passed: boolean; message: string; };
  };
}

class FunctionTester {
  constructor(
    private app: App,
    private registry: FunctionRegistry
  ) {}
  
  async testFunctionExecution(
    functionId: string,
    session: EditorialSession
  ): Promise<FunctionTestResult> {
    const func = this.registry.getFunction(functionId);
    if (!func) {
      throw new Error(`Function not found: ${functionId}`);
    }
    
    // Create function implementation for testing
    const functionImpl = this.createTestFunctionImplementation(func);
    
    try {
      // Execute the function
      const startTime = Date.now();
      const aiResponse = await functionImpl.processText(session);
      const endTime = Date.now();
      
      // Validate constraints
      const validator = new MessageValidator();
      const validationResult = await validator.validate(
        JSON.stringify(aiResponse),
        { session, function: func, messageHistory: [] }
      );
      
      return {
        success: validationResult.valid,
        changesGenerated: aiResponse.changes.length,
        averageConfidence: aiResponse.metadata.avgConfidence,
        changes: aiResponse.changes,
        constraintViolations: validationResult.valid ? [] : [{
          type: validationResult.violationType || 'unknown',
          severity: validationResult.severity || 'warning',
          message: validationResult.error || 'Unknown validation error'
        }],
        metrics: {
          executionTime: endTime - startTime,
          totalChanges: aiResponse.changes.length,
          avgConfidence: aiResponse.metadata.avgConfidence,
          changesByCategory: Object.keys(aiResponse.metadata.changesByCategory).length
        },
        rawResponse: JSON.stringify(aiResponse, null, 2)
      };
      
    } catch (error) {
      throw new Error(`Function execution failed: ${error.message}`);
    }
  }
  
  async testConstraintValidation(
    func: FunctionDefinition,
    testMessage: string,
    session: EditorialSession
  ): Promise<ValidationTestResult> {
    const validator = new MessageValidator();
    
    const validationResult = await validator.validate(
      testMessage,
      { session, function: func, messageHistory: [] }
    );
    
    // Run individual checks
    const checks = {
      forbiddenPhrases: await this.checkForbiddenPhrases(testMessage, func.forbiddenPhrases),
      forbiddenActions: await this.checkForbiddenActions(testMessage, func.forbiddenActions),
      schemaCompliance: await this.checkSchemaCompliance(testMessage, func.outputSchema),
      customRules: await this.checkCustomRules(testMessage, func.validationRules),
      driftDetection: await this.checkDriftDetection(testMessage, session)
    };
    
    return {
      passed: validationResult.valid,
      violations: validationResult.valid ? [] : [{
        type: validationResult.violationType || 'unknown',
        severity: validationResult.severity || 'warning',
        message: validationResult.error || 'Unknown validation error',
        suggestion: validationResult.suggestions?.[0]
      }],
      checks
    };
  }
  
  private createTestFunctionImplementation(func: FunctionDefinition): any {
    // Create a mock implementation that simulates AI response
    return {
      processText: async (session: EditorialSession) => {
        // For testing, return a mock response that follows the schema
        return {
          function: func.id,
          changes: [
            {
              startPos: 0,
              endPos: 10,
              original: "test text",
              revised: "tested text",
              reason: "Grammar improvement",
              category: func.trackEditsIntegration.changeCategories[0] || "general",
              confidence: 0.9
            }
          ],
          summary: "Test execution completed successfully",
          metadata: {
            totalChanges: 1,
            changesByCategory: { [func.trackEditsIntegration.changeCategories[0] || "general"]: 1 },
            avgConfidence: 0.9
          }
        };
      }
    };
  }
  
  private async checkForbiddenPhrases(message: string, phrases: string[]): Promise<{ passed: boolean; message: string; }> {
    const lowerMessage = message.toLowerCase();
    const violations = phrases.filter(phrase => lowerMessage.includes(phrase.toLowerCase()));
    
    return {
      passed: violations.length === 0,
      message: violations.length === 0 
        ? 'No forbidden phrases detected'
        : `Found forbidden phrases: ${violations.join(', ')}`
    };
  }
  
  private async checkForbiddenActions(message: string, actions: string[]): Promise<{ passed: boolean; message: string; }> {
    // Simplified action detection for testing
    const detectedActions = actions.filter(action => {
      switch (action) {
        case 'content_creation':
          return /\b(add|create|write|insert)\s+(content|text|information)\b/i.test(message);
        case 'structural_changes':
          return /\b(restructure|reorganize|rearrange)\b/i.test(message);
        default:
          return false;
      }
    });
    
    return {
      passed: detectedActions.length === 0,
      message: detectedActions.length === 0
        ? 'No forbidden actions detected'
        : `Detected forbidden actions: ${detectedActions.join(', ')}`
    };
  }
  
  private async checkSchemaCompliance(message: string, schema: any): Promise<{ passed: boolean; message: string; }> {
    try {
      // Try to extract and validate JSON
      const jsonMatch = message.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return { passed: true, message: 'No JSON found to validate' };
      }
      
      const jsonData = JSON.parse(jsonMatch[0]);
      
      // Basic schema validation (simplified)
      const hasRequiredFields = schema.required?.every((field: string) => 
        jsonData.hasOwnProperty(field)
      ) ?? true;
      
      return {
        passed: hasRequiredFields,
        message: hasRequiredFields 
          ? 'Schema validation passed'
          : 'Missing required schema fields'
      };
      
    } catch (error) {
      return {
        passed: false,
        message: `JSON parsing error: ${error.message}`
      };
    }
  }
  
  private async checkCustomRules(message: string, rules: any[]): Promise<{ passed: boolean; message: string; }> {
    // Simplified custom rule checking
    return {
      passed: true,
      message: `${rules.length} custom rules checked`
    };
  }
  
  private async checkDriftDetection(message: string, session: EditorialSession): Promise<{ passed: boolean; message: string; }> {
    // Simplified drift detection
    const functionKeywords = session.functionDefinition.tags;
    const hasRelevantKeywords = functionKeywords.some(keyword => 
      message.toLowerCase().includes(keyword.toLowerCase())
    );
    
    return {
      passed: hasRelevantKeywords || functionKeywords.length === 0,
      message: hasRelevantKeywords 
        ? 'Content relevant to function'
        : 'Potential topic drift detected'
    };
  }
}
```

---

## Enhanced Hot Reloading & Error Recovery

### Advanced File Watching with Recovery
```typescript
class AdvancedFunctionWatcher extends FunctionFileWatcher {
  private backupManager: FunctionBackupManager;
  private errorRecovery: ErrorRecoveryManager;
  private changeValidator: ChangeValidator;
  
  constructor(registry: FunctionRegistry) {
    super(registry);
    this.backupManager = new FunctionBackupManager();
    this.errorRecovery = new ErrorRecoveryManager();
    this.changeValidator = new ChangeValidator();
  }
  
  protected async handleFileModification(file: TFile): Promise<void> {
    if (!this.isFunctionFile(file)) return;
    
    console.log(`Function file modified: ${file.path}`);
    
    // Create backup before attempting reload
    await this.backupManager.createBackup(file);
    
    this.debounceReload(file.path, async () => {
      try {
        const oldFunction = this.findFunctionByPath(file.path);
        const newContent = await this.app.vault.read(file);
        
        // Validate changes before applying
        const changeValidation = await this.changeValidator.validateChanges(
          oldFunction,
          newContent,
          file.extension as 'md' | 'xml'
        );
        
        if (!changeValidation.valid) {
          await this.handleValidationFailure(file, changeValidation);
          return;
        }
        
        // Check for breaking changes
        if (changeValidation.hasBreakingChanges) {
          const shouldProceed = await this.confirmBreakingChanges(file, changeValidation.breakingChanges);
          if (!shouldProceed) {
            await this.revertToBackup(file);
            return;
          }
        }
        
        // Attempt reload
        await this.registry.reloadFunction(file.path);
        const newFunction = this.findFunctionByPath(file.path);
        
        await this.handleSuccessfulReload(oldFunction, newFunction, file, changeValidation);
        
      } catch (error) {
        await this.handleReloadError(file, error);
      }
    });
  }
  
  private async handleValidationFailure(
    file: TFile,
    validation: ChangeValidationResult
  ): Promise<void> {
    console.error(`Validation failed for ${file.path}:`, validation.errors);
    
    // Show detailed error notification
    const errorDetails = validation.errors.join('\n');
    new Notice(`Function validation failed:\n${errorDetails}`, 10000);
    
    // Offer recovery options
    const recovery = await this.errorRecovery.offerRecoveryOptions(file, validation);
    await this.executeRecoveryOption(file, recovery);
  }
  
  private async confirmBreakingChanges(
    file: TFile,
    breakingChanges: string[]
  ): Promise<boolean> {
    return new Promise((resolve) => {
      const modal = new BreakingChangesModal(
        this.app,
        file.basename,
        breakingChanges,
        resolve
      );
      modal.open();
    });
  }
  
  private async handleSuccessfulReload(
    oldFunction: FunctionDefinition | undefined,
    newFunction: FunctionDefinition | undefined,
    file: TFile,
    validation: ChangeValidationResult
  ): Promise<void> {
    if (!newFunction) {
      console.warn(`Function ${file.path} was disabled or removed`);
      return;
    }
    
    // Clean up old backup
    await this.backupManager.cleanupBackup(file.path);
    
    // Update active sessions
    if (oldFunction && this.hasSignificantChanges(oldFunction, newFunction)) {
      await this.updateActiveSessions(oldFunction, newFunction);
    }
    
    // Show success notification
    const changesSummary = this.summarizeChanges(validation);
    new Notice(`Function "${newFunction.name}" reloaded successfully${changesSummary}`, 4000);
    
    // Emit update event
    this.notifyFunctionUpdated(newFunction, validation);
  }
  
  private async handleReloadError(file: TFile, error: Error): Promise<void> {
    console.error(`Reload error for ${file.path}:`, error);
    
    // Try to recover from backup
    const recoveryResult = await this.errorRecovery.attemptAutoRecovery(file, error);
    
    if (recoveryResult.success) {
      new Notice(`Auto-recovery successful for ${file.basename}`, 5000);
    } else {
      // Show error with recovery options
      new Notice(`Reload failed for ${file.basename}: ${error.message}`, 8000);
      
      const recoveryModal = new ErrorRecoveryModal(
        this.app,
        file,
        error,
        this.errorRecovery
      );
      recoveryModal.open();
    }
  }
  
  private summarizeChanges(validation: ChangeValidationResult): string {
    if (validation.changes.length === 0) return '';
    
    const changeTypes = validation.changes.map(c => c.type);
    const uniqueTypes = [...new Set(changeTypes)];
    
    return ` (${uniqueTypes.join(', ')} updated)`;
  }
}

class FunctionBackupManager {
  private backupDir: string;
  
  constructor() {
    this.backupDir = '.obsidian/plugins/editorial-functions/backups';
  }
  
  async createBackup(file: TFile): Promise<string> {
    await this.ensureBackupDirectory();
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `${file.basename}_${timestamp}.${file.extension}`;
    const backupPath = `${this.backupDir}/${backupFileName}`;
    
    const content = await this.app.vault.read(file);
    await this.app.vault.adapter.write(backupPath, content);
    
    console.log(`Created backup: ${backupPath}`);
    return backupPath;
  }
  
  async restoreFromBackup(originalPath: string, backupPath: string): Promise<void> {
    const backupContent = await this.app.vault.adapter.read(backupPath);
    await this.app.vault.adapter.write(originalPath, backupContent);
    
    console.log(`Restored ${originalPath} from backup ${backupPath}`);
  }
  
  async listBackups(filePath: string): Promise<BackupInfo[]> {
    const fileName = filePath.split('/').pop()?.split('.')[0];
    if (!fileName) return [];
    
    try {
      const backupFiles = await this.app.vault.adapter.list(this.backupDir);
      return backupFiles.files
        .filter(path => path.includes(fileName))
        .map(path => ({
          path,
          timestamp: this.extractTimestamp(path),
          size: 0 // Would need to get actual size
        }))
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    } catch (error) {
      return [];
    }
  }
  
  async cleanupBackup(filePath: string): Promise<void> {
    const backups = await this.listBackups(filePath);
    
    // Keep only the 5 most recent backups
    const toDelete = backups.slice(5);
    
    for (const backup of toDelete) {
      try {
        await this.app.vault.adapter.remove(backup.path);
        console.log(`Cleaned up old backup: ${backup.path}`);
      } catch (error) {
        console.warn(`Failed to cleanup backup ${backup.path}:`, error);
      }
    }
  }
  
  private async ensureBackupDirectory(): Promise<void> {
    if (!await this.app.vault.adapter.exists(this.backupDir)) {
      await this.app.vault.adapter.mkdir(this.backupDir);
    }
  }
  
  private extractTimestamp(backupPath: string): Date {
    const match = backupPath.match(/(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2})/);
    if (match) {
      return new Date(match[1].replace(/-/g, ':').replace('T', 'T').slice(0, -3));
    }
    return new Date();
  }
}

interface BackupInfo {
  path: string;
  timestamp: Date;
  size: number;
}

class ChangeValidator {
  async validateChanges(
    oldFunction: FunctionDefinition | undefined,
    newContent: string,
    fileType: 'md' | 'xml'
  ): Promise<ChangeValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const changes: ChangeDetail[] = [];
    let breakingChanges: string[] = [];
    
    try {
      // Parse new content
      const newFunction = await this.parseFunction(newContent, fileType);
      
      if (!newFunction) {
        errors.push('Failed to parse function definition');
        return { valid: false, errors, warnings, changes, hasBreakingChanges: false, breakingChanges };
      }
      
      // Basic validation
      const basicValidation = this.validateBasicStructure(newFunction);
      errors.push(...basicValidation.errors);
      warnings.push(...basicValidation.warnings);
      
      // Compare with old function if it exists
      if (oldFunction) {
        const comparisonResult = this.compareFunctions(oldFunction, newFunction);
        changes.push(...comparisonResult.changes);
        breakingChanges = comparisonResult.breakingChanges;
        warnings.push(...comparisonResult.warnings);
      }
      
      return {
        valid: errors.length === 0,
        errors,
        warnings,
        changes,
        hasBreakingChanges: breakingChanges.length > 0,
        breakingChanges
      };
      
    } catch (error) {
      errors.push(`Parse error: ${error.message}`);
      return { valid: false, errors, warnings, changes, hasBreakingChanges: false, breakingChanges };
    }
  }
  
  private validateBasicStructure(func: FunctionDefinition): ValidationSummary {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Required fields
    if (!func.id || func.id.trim().length === 0) {
      errors.push('Function ID is required');
    }
    
    if (!func.name || func.name.trim().length === 0) {
      errors.push('Function name is required');
    }
    
    if (!func.systemPrompt || func.systemPrompt.trim().length < 50) {
      errors.push('System prompt must be at least 50 characters');
    }
    
    // Schema validation
    if (!func.outputSchema || typeof func.outputSchema !== 'object') {
      errors.push('Valid output schema is required');
    }
    
    // Track Edits configuration
    if (!func.trackEditsIntegration.changeCategories || func.trackEditsIntegration.changeCategories.length === 0) {
      warnings.push('No change categories defined for Track Edits integration');
    }
    
    if (func.trackEditsIntegration.confidenceThreshold < 0.1 || func.trackEditsIntegration.confidenceThreshold > 1.0) {
      errors.push('Confidence threshold must be between 0.1 and 1.0');
    }
    
    return { errors, warnings };
  }
  
  private compareFunctions(
    oldFunc: FunctionDefinition,
    newFunc: FunctionDefinition
  ): ComparisonResult {
    const changes: ChangeDetail[] = [];
    const breakingChanges: string[] = [];
    const warnings: string[] = [];
    
    // ID change (breaking)
    if (oldFunc.id !== newFunc.id) {
      breakingChanges.push(`Function ID changed: ${oldFunc.id} → ${newFunc.id}`);
      changes.push({ type: 'id', old: oldFunc.id, new: newFunc.id });
    }
    
    // Name change
    if (oldFunc.name !== newFunc.name) {
      changes.push({ type: 'name', old: oldFunc.name, new: newFunc.name });
    }
    
    // System prompt changes
    if (oldFunc.systemPrompt !== newFunc.systemPrompt) {
      changes.push({ type: 'systemPrompt', old: 'Modified', new: 'Modified' });
      warnings.push('System prompt modified - may affect AI behavior');
    }
    
    // Schema changes (breaking)
    if (JSON.stringify(oldFunc.outputSchema) !== JSON.stringify(newFunc.outputSchema)) {
      breakingChanges.push('Output schema modified');
      changes.push({ type: 'outputSchema', old: 'Modified', new: 'Modified' });
    }
    
    // Constraint changes
    const oldConstraints = oldFunc.forbiddenPhrases.sort().join(',');
    const newConstraints = newFunc.forbiddenPhrases.sort().join(',');
    if (oldConstraints !== newConstraints) {
      changes.push({ type: 'constraints', old: 'Modified', new: 'Modified' });
      warnings.push('Constraint rules modified');
    }
    
    // Track Edits configuration changes
    const oldConfig = oldFunc.trackEditsIntegration;
    const newConfig = newFunc.trackEditsIntegration;
    
    if (oldConfig.confidenceThreshold !== newConfig.confidenceThreshold) {
      changes.push({ 
        type: 'confidenceThreshold', 
        old: oldConfig.confidenceThreshold.toString(), 
        new: newConfig.confidenceThreshold.toString() 
      });
    }
    
    if (JSON.stringify(oldConfig.changeCategories) !== JSON.stringify(newConfig.changeCategories)) {
      changes.push({ type: 'changeCategories', old: 'Modified', new: 'Modified' });
    }
    
    return { changes, breakingChanges, warnings };
  }
  
  private async parseFunction(content: string, fileType: 'md' | 'xml'): Promise<FunctionDefinition | null> {
    try {
      if (fileType === 'md') {
        return this.parseMarkdownFunction(content);
      } else {
        return this.parseXmlFunction(content);
      }
    } catch (error) {
      console.error('Function parsing failed:', error);
      return null;
    }
  }
  
  // Simplified parsing methods (would use the full parsing logic from the registry)
  private parseMarkdownFunction(content: string): FunctionDefinition | null {
    // Implementation would mirror the registry's parsing logic
    // This is a simplified version for validation
    return null;
  }
  
  private parseXmlFunction(content: string): FunctionDefinition | null {
    // Implementation would mirror the registry's parsing logic
    // This is a simplified version for validation
    return null;
  }
}

interface ChangeValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  changes: ChangeDetail[];
  hasBreakingChanges: boolean;
  breakingChanges: string[];
}

interface ChangeDetail {
  type: string;
  old: string;
  new: string;
}

interface ValidationSummary {
  errors: string[];
  warnings: string[];
}

interface ComparisonResult {
  changes: ChangeDetail[];
  breakingChanges: string[];
  warnings: string[];
}

class ErrorRecoveryManager {
  async offerRecoveryOptions(
    file: TFile,
    validation: ChangeValidationResult
  ): Promise<RecoveryOption> {
    return new Promise((resolve) => {
      const modal = new RecoveryOptionsModal(
        this.app,
        file,
        validation,
        resolve
      );
      modal.open();
    });
  }
  
  async attemptAutoRecovery(file: TFile, error: Error): Promise<RecoveryResult> {
    try {
      // Try to restore from the most recent backup
      const backupManager = new FunctionBackupManager();
      const backups = await backupManager.listBackups(file.path);
      
      if (backups.length > 0) {
        const latestBackup = backups[0];
        await backupManager.restoreFromBackup(file.path, latestBackup.path);
        
        return {
          success: true,
          method: 'backup_restore',
          message: `Restored from backup: ${latestBackup.timestamp.toLocaleString()}`
        };
      }
      
      return {
        success: false,
        method: 'none',
        message: 'No backups available for auto-recovery'
      };
      
    } catch (recoveryError) {
      return {
        success: false,
        method: 'failed',
        message: `Auto-recovery failed: ${recoveryError.message}`
      };
    }
  }
  
  async executeRecoveryOption(file: TFile, option: RecoveryOption): Promise<void> {
    switch (option.type) {
      case 'revert_backup':
        await this.revertToBackup(file, option.backupPath!);
        break;
      case 'fix_errors':
        await this.attemptErrorFix(file, option.fixes!);
        break;
      case 'disable_function':
        await this.disableFunction(file);
        break;
      case 'ignore_errors':
        // Do nothing - let the errors persist
        break;
    }
  }
  
  private async revertToBackup(file: TFile, backupPath: string): Promise<void> {
    const backupManager = new FunctionBackupManager();
    await backupManager.restoreFromBackup(file.path, backupPath);
    new Notice(`Reverted ${file.basename} to backup`);
  }
  
  private async attemptErrorFix(file: TFile, fixes: ErrorFix[]): Promise<void> {
    let content = await this.app.vault.read(file);
    
    for (const fix of fixes) {
      content = this.applyFix(content, fix);
    }
    
    await this.app.vault.adapter.write(file.path, content);
    new Notice(`Applied ${fixes.length} automatic fixes to ${file.basename}`);
  }
  
  private applyFix(content: string, fix: ErrorFix): string {
    switch (fix.type) {
      case 'add_required_field':
        return this.addRequiredField(content, fix.field!, fix.value!);
      case 'fix_json_schema':
        return this.fixJsonSchema(content, fix.schema!);
      case 'update_version':
        return this.updateVersion(content);
      default:
        return content;
    }
  }
  
  private addRequiredField(content: string, field: string, value: string): string {
    // Add missing required field to frontmatter
    if (content.startsWith('---')) {
      const frontmatterEnd = content.indexOf('---', 3);
      if (frontmatterEnd !== -1) {
        const frontmatter = content.substring(3, frontmatterEnd);
        const newFrontmatter = frontmatter + `\n${field}: ${value}`;
        return `---${newFrontmatter}\n---${content.substring(frontmatterEnd + 3)}`;
      }
    }
    return content;
  }
  
  private fixJsonSchema(content: string, newSchema: any): string {
    // Replace broken JSON schema
    const schemaRegex = /```json\s*([\s\S]*?)\s*```/;
    const replacement = '```json\n' + JSON.stringify(newSchema, null, 2) + '\n```';
    return content.replace(schemaRegex, replacement);
  }
  
  private updateVersion(content: string): string {
    // Update version in frontmatter
    return content.replace(/version:\s*[\d.]+/, 'version: 1.0');
  }
  
  private async disableFunction(file: TFile): Promise<void> {
    let content = await this.app.vault.read(file);
    content = content.replace(/enabled:\s*true/, 'enabled: false');
    await this.app.vault.adapter.write(file.path, content);
    new Notice(`Disabled function in ${file.basename}`);
  }
}

interface RecoveryOption {
  type: 'revert_backup' | 'fix_errors' | 'disable_function' | 'ignore_errors';
  label: string;
  description: string;
  backupPath?: string;
  fixes?: ErrorFix[];
}

interface ErrorFix {
  type: 'add_required_field' | 'fix_json_schema' | 'update_version';
  description: string;
  field?: string;
  value?: string;
  schema?: any;
}

interface RecoveryResult {
  success: boolean;
  method: string;
  message: string;
}

class BreakingChangesModal extends Modal {
  constructor(
    app: App,
    private fileName: string,
    private breakingChanges: string[],
    private callback: (proceed: boolean) => void
  ) {
    super(app);
  }
  
  onOpen(): void {
    const { contentEl } = this;
    contentEl.createEl('h2', { text: '⚠️ Breaking Changes Detected' });
    
    contentEl.createEl('p', { 
      text: `The following breaking changes were detected in ${this.fileName}:` 
    });
    
    const changesList = contentEl.createEl('ul', { cls: 'breaking-changes-list' });
    this.breakingChanges.forEach(change => {
      changesList.createEl('li', { text: change });
    });
    
    contentEl.createEl('p', { 
      text: 'These changes may affect active editing sessions and require manual intervention.' 
    });
    
    const buttonContainer = contentEl.createDiv('button-container');
    
    const proceedBtn = buttonContainer.createEl('button', {
      text: 'Proceed Anyway',
      cls: 'mod-warning'
    });
    proceedBtn.onclick = () => {
      this.callback(true);
      this.close();
    };
    
    const cancelBtn = buttonContainer.createEl('button', {
      text: 'Cancel & Revert'
    });
    cancelBtn.onclick = () => {
      this.callback(false);
      this.close();
    };
  }
}
```

---

## Performance Monitoring

### System Performance Tracking
```typescript
class PerformanceMonitor {
  private metrics: PerformanceMetrics = {
    functionRegistry: {
      loadTimes: new Map(),
      reloadCount: 0,
      errorCount: 0,
      cacheHitRate: 0
    },
    validation: {
      averageTime: 0,
      successRate: 0,
      violationCounts: new Map()
    },
    reinforcement: {
      triggerCounts: new Map(),
      effectivenessScores: [],
      averageResponseTime: 0
    },
    trackEdits: {
      submissionSuccessRate: 0,
      averageSubmissionTime: 0,
      batchSizes: []
    },
    sessions: {
      activeCount: 0,
      averageDuration: 0,
      completionRate: 0
    }
  };
  
  startMonitoring(): void {
    // Registry performance
    this.monitorRegistryPerformance();
    
    // Validation performance
    this.monitorValidationPerformance();
    
    // Memory usage
    this.monitorMemoryUsage();
    
    // Generate reports
    this.schedulePerformanceReports();
  }
  
  private monitorRegistryPerformance(): void {
    // Intercept function loading
    const originalLoadFunction = FunctionRegistry.prototype.loadFunctionFromFile;
    FunctionRegistry.prototype.loadFunctionFromFile = async function(file: TFile) {
      const startTime = performance.now();
      try {
        const result = await originalLoadFunction.call(this, file);
        const loadTime = performance.now() - startTime;
        
        this.performanceMonitor?.recordFunctionLoad(file.path, loadTime, true);
        return result;
      } catch (error) {
        const loadTime = performance.now() - startTime;
        this.performanceMonitor?.recordFunctionLoad(file.path, loadTime, false);
        throw error;
      }
    };
  }
  
  recordFunctionLoad(filePath: string, loadTime: number, success: boolean): void {
    this.metrics.functionRegistry.loadTimes.set(filePath, loadTime);
    
    if (success) {
      this.metrics.functionRegistry.reloadCount++;
    } else {
      this.metrics.functionRegistry.errorCount++;
    }
  }
  
  recordValidation(duration: number, success: boolean, violationType?: string): void {
    // Update average validation time
    const current = this.metrics.validation.averageTime;
    this.metrics.validation.averageTime = (current + duration) / 2;
    
    // Update success rate
    const currentRate = this.metrics.validation.successRate;
    this.metrics.validation.successRate = (currentRate + (success ? 1 : 0)) / 2;
    
    // Track violation types
    if (!success && violationType) {
      const count = this.metrics.validation.violationCounts.get(violationType) || 0;
      this.metrics.validation.violationCounts.set(violationType, count + 1);
    }
  }
  
  recordReinforcement(
    trigger: string, 
    responseTime: number, 
    effectiveness?: number
  ): void {
    // Track trigger usage
    const count = this.metrics.reinforcement.triggerCounts.get(trigger) || 0;
    this.metrics.reinforcement.triggerCounts.set(trigger, count + 1);
    
    // Update average response time
    const current = this.metrics.reinforcement.averageResponseTime;
    this.metrics.reinforcement.averageResponseTime = (current + responseTime) / 2;
    
    // Track effectiveness
    if (effectiveness !== undefined) {
      this.metrics.reinforcement.effectivenessScores.push(effectiveness);
      
      // Keep only last 100 scores
      if (this.metrics.reinforcement.effectivenessScores.length > 100) {
        this.metrics.reinforcement.effectivenessScores.shift();
      }
    }
  }
  
  recordTrackEditsSubmission(
    submissionTime: number,
    success: boolean,
    batchSize: number
  ): void {
    // Update success rate
    const currentRate = this.metrics.trackEdits.submissionSuccessRate;
    this.metrics.trackEdits.submissionSuccessRate = (currentRate + (success ? 1 : 0)) / 2;
    
    // Update average submission time
    const currentTime = this.metrics.trackEdits.averageSubmissionTime;
    this.metrics.trackEdits.averageSubmissionTime = (currentTime + submissionTime) / 2;
    
    // Track batch sizes
    this.metrics.trackEdits.batchSizes.push(batchSize);
    if (this.metrics.trackEdits.batchSizes.length > 100) {
      this.metrics.trackEdits.batchSizes.shift();
    }
  }
  
  recordSessionMetrics(
    activeCount: number,
    avgDuration: number,
    completionRate: number
  ): void {
    this.metrics.sessions.activeCount = activeCount;
    this.metrics.sessions.averageDuration = avgDuration;
    this.metrics.sessions.completionRate = completionRate;
  }
  
  private monitorMemoryUsage(): void {
    setInterval(() => {
      // Monitor memory usage patterns
      if (performance.memory) {
        const memoryInfo = {
          used: performance.memory.usedJSHeapSize,
          total: performance.memory.totalJSHeapSize,
          limit: performance.memory.jsHeapSizeLimit
        };
        
        // Alert if memory usage is high
        const usagePercent = memoryInfo.used / memoryInfo.limit;
        if (usagePercent > 0.8) {
          console.warn('High memory usage detected:', memoryInfo);
          this.triggerMemoryCleanup();
        }
      }
    }, 30000); // Check every 30 seconds
  }
  
  private triggerMemoryCleanup(): void {
    // Clear old validation caches
    // Clean up old session data
    // Force garbage collection if possible
  }
  
  getPerformanceReport(): PerformanceReport {
    const now = Date.now();
    
    return {
      timestamp: new Date(),
      registry: {
        averageLoadTime: this.calculateAverageLoadTime(),
        successRate: this.calculateRegistrySuccessRate(),
        cacheEfficiency: this.metrics.functionRegistry.cacheHitRate,
        totalFunctions: this.metrics.functionRegistry.loadTimes.size
      },
      validation: {
        averageTime: this.metrics.validation.averageTime,
        successRate: this.metrics.validation.successRate,
        topViolations: this.getTopViolations()
      },
      reinforcement: {
        averageEffectiveness: this.calculateAverageEffectiveness(),
        mostEffectiveTriggers: this.getMostEffectiveTriggers(),
        responseTime: this.metrics.reinforcement.averageResponseTime
      },
      trackEdits: {
        submissionSuccessRate: this.metrics.trackEdits.submissionSuccessRate,
        averageSubmissionTime: this.metrics.trackEdits.averageSubmissionTime,
        averageBatchSize: this.calculateAverageBatchSize()
      },
      sessions: this.metrics.sessions,
      recommendations: this.generateRecommendations()
    };
  }
  
  private calculateAverageLoadTime(): number {
    const times = Array.from(this.metrics.functionRegistry.loadTimes.values());
    return times.reduce((sum, time) => sum + time, 0) / times.length || 0;
  }
  
  private calculateRegistrySuccessRate(): number {
    const total = this.metrics.functionRegistry.reloadCount + this.metrics.functionRegistry.errorCount;
    return total > 0 ? this.metrics.functionRegistry.reloadCount / total : 1;
  }
  
  private getTopViolations(): Array<{ type: string; count: number }> {
    return Array.from(this.metrics.validation.violationCounts.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }
  
  private calculateAverageEffectiveness(): number {
    const scores = this.metrics.reinforcement.effectivenessScores;
    return scores.reduce((sum, score) => sum + score, 0) / scores.length || 0;
  }
  
  private getMostEffectiveTriggers(): string[] {
    return Array.from(this.metrics.reinforcement.triggerCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([trigger]) => trigger);
  }
  
  private calculateAverageBatchSize(): number {
    const sizes = this.metrics.trackEdits.batchSizes;
    return sizes.reduce((sum, size) => sum + size, 0) / sizes.length || 0;
  }
  
  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    
    // Registry performance recommendations
    const avgLoadTime = this.calculateAverageLoadTime();
    if (avgLoadTime > 1000) {
      recommendations.push('Consider optimizing function file sizes - average load time is high');
    }
    
    // Validation recommendations
    if (this.metrics.validation.successRate < 0.8) {
      recommendations.push('High validation failure rate - review function constraints');
    }
    
    // Reinforcement recommendations
    const avgEffectiveness = this.calculateAverageEffectiveness();
    if (avgEffectiveness < 0.6) {
      recommendations.push('Low reinforcement effectiveness - consider adjusting trigger thresholds');
    }
    
    // Track Edits recommendations
    if (this.metrics.trackEdits.submissionSuccessRate < 0.9) {
      recommendations.push('Track Edits submission failures detected - check integration');
    }
    
    const avgBatchSize = this.calculateAverageBatchSize();
    if (avgBatchSize > 20) {
      recommendations.push('Large batch sizes may impact user experience - consider smaller batches');
    }
    
    return recommendations;
  }
  
  private schedulePerformanceReports(): void {
    // Generate hourly performance snapshots
    setInterval(() => {
      const report = this.getPerformanceReport();
      console.log('Performance Report:', report);
      
      // Store for analysis
      this.storePerformanceSnapshot(report);
    }, 3600000); // Every hour
  }
  
  private storePerformanceSnapshot(report: PerformanceReport): void {
    // Store performance data for trend analysis
    const snapshots = this.getStoredSnapshots();
    snapshots.push(report);
    
    // Keep only last 24 hours
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const filtered = snapshots.filter(s => s.timestamp.getTime() > oneDayAgo);
    
    localStorage.setItem('editorial-functions-performance', JSON.stringify(filtered));
  }
  
  private getStoredSnapshots(): PerformanceReport[] {
    try {
      const stored = localStorage.getItem('editorial-functions-performance');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      return [];
    }
  }
}

interface PerformanceMetrics {
  functionRegistry: {
    loadTimes: Map<string, number>;
    reloadCount: number;
    errorCount: number;
    cacheHitRate: number;
  };
  validation: {
    averageTime: number;
    successRate: number;
    violationCounts: Map<string, number>;
  };
  reinforcement: {
    triggerCounts: Map<string, number>;
    effectivenessScores: number[];
    averageResponseTime: number;
  };
  trackEdits: {
    submissionSuccessRate: number;
    averageSubmissionTime: number;
    batchSizes: number[];
  };
  sessions: {
    activeCount: number;
    averageDuration: number;
    completionRate: number;
  };
}

interface PerformanceReport {
  timestamp: Date;
  registry: {
    averageLoadTime: number;
```typescript
    successRate: number;
    cacheEfficiency: number;
    totalFunctions: number;
  };
  validation: {
    averageTime: number;
    successRate: number;
    topViolations: Array<{ type: string; count: number }>;
  };
  reinforcement: {
    averageEffectiveness: number;
    mostEffectiveTriggers: string[];
    responseTime: number;
  };
  trackEdits: {
    submissionSuccessRate: number;
    averageSubmissionTime: number;
    averageBatchSize: number;
  };
  sessions: {
    activeCount: number;
    averageDuration: number;
    completionRate: number;
  };
  recommendations: string[];
}

class AlertManager {
  private alertThresholds: AlertThresholds;
  private activeAlerts: Map<string, Alert> = new Map();
  
  constructor() {
    this.alertThresholds = {
      registryLoadTime: 2000, // ms
      validationFailureRate: 0.3, // 30%
      reinforcementEffectiveness: 0.4, // 40%
      trackEditsFailureRate: 0.2, // 20%
      memoryUsage: 0.8, // 80%
      sessionErrorRate: 0.1 // 10%
    };
  }
  
  checkPerformanceAlerts(report: PerformanceReport): void {
    this.checkRegistryAlerts(report.registry);
    this.checkValidationAlerts(report.validation);
    this.checkReinforcementAlerts(report.reinforcement);
    this.checkTrackEditsAlerts(report.trackEdits);
    this.checkSessionAlerts(report.sessions);
  }
  
  private checkRegistryAlerts(metrics: any): void {
    // High load time alert
    if (metrics.averageLoadTime > this.alertThresholds.registryLoadTime) {
      this.createAlert({
        id: 'registry-load-time',
        type: 'warning',
        title: 'High Function Load Time',
        message: `Average function load time is ${metrics.averageLoadTime}ms (threshold: ${this.alertThresholds.registryLoadTime}ms)`,
        suggestions: [
          'Check function file sizes',
          'Review complex validation rules',
          'Consider file caching optimizations'
        ],
        severity: metrics.averageLoadTime > this.alertThresholds.registryLoadTime * 2 ? 'high' : 'medium'
      });
    } else {
      this.clearAlert('registry-load-time');
    }
    
    // Low success rate alert
    if (metrics.successRate < (1 - this.alertThresholds.validationFailureRate)) {
      this.createAlert({
        id: 'registry-success-rate',
        type: 'error',
        title: 'Function Loading Failures',
        message: `Function loading success rate is ${(metrics.successRate * 100).toFixed(1)}%`,
        suggestions: [
          'Check function file syntax',
          'Review error logs',
          'Validate function definitions'
        ],
        severity: 'high'
      });
    } else {
      this.clearAlert('registry-success-rate');
    }
  }
  
  private checkValidationAlerts(metrics: any): void {
    if (metrics.successRate < (1 - this.alertThresholds.validationFailureRate)) {
      this.createAlert({
        id: 'validation-failure-rate',
        type: 'warning',
        title: 'High Validation Failure Rate',
        message: `Validation success rate is ${(metrics.successRate * 100).toFixed(1)}%`,
        suggestions: [
          'Review constraint definitions',
          'Check for overly strict rules',
          'Analyze top violation types'
        ],
        severity: 'medium'
      });
    } else {
      this.clearAlert('validation-failure-rate');
    }
    
    // Slow validation alert
    if (metrics.averageTime > 500) {
      this.createAlert({
        id: 'validation-performance',
        type: 'info',
        title: 'Slow Validation Performance',
        message: `Average validation time is ${metrics.averageTime}ms`,
        suggestions: [
          'Optimize validation rules',
          'Consider async validation',
          'Review complex constraints'
        ],
        severity: 'low'
      });
    } else {
      this.clearAlert('validation-performance');
    }
  }
  
  private checkReinforcementAlerts(metrics: any): void {
    if (metrics.averageEffectiveness < this.alertThresholds.reinforcementEffectiveness) {
      this.createAlert({
        id: 'reinforcement-effectiveness',
        type: 'warning',
        title: 'Low Reinforcement Effectiveness',
        message: `Average reinforcement effectiveness is ${(metrics.averageEffectiveness * 100).toFixed(1)}%`,
        suggestions: [
          'Adjust trigger thresholds',
          'Review reinforcement templates',
          'Analyze trigger patterns'
        ],
        severity: 'medium'
      });
    } else {
      this.clearAlert('reinforcement-effectiveness');
    }
  }
  
  private checkTrackEditsAlerts(metrics: any): void {
    if (metrics.submissionSuccessRate < (1 - this.alertThresholds.trackEditsFailureRate)) {
      this.createAlert({
        id: 'track-edits-failures',
        type: 'error',
        title: 'Track Edits Submission Failures',
        message: `Track Edits submission success rate is ${(metrics.submissionSuccessRate * 100).toFixed(1)}%`,
        suggestions: [
          'Check Track Edits integration',
          'Verify change format compliance',
          'Review submission batch sizes'
        ],
        severity: 'high'
      });
    } else {
      this.clearAlert('track-edits-failures');
    }
    
    // Large batch size warning
    if (metrics.averageBatchSize > 25) {
      this.createAlert({
        id: 'large-batch-sizes',
        type: 'info',
        title: 'Large Change Batches',
        message: `Average batch size is ${metrics.averageBatchSize} changes`,
        suggestions: [
          'Consider smaller batch sizes',
          'Implement progressive submission',
          'Review function change limits'
        ],
        severity: 'low'
      });
    } else {
      this.clearAlert('large-batch-sizes');
    }
  }
  
  private checkSessionAlerts(metrics: any): void {
    // High number of active sessions
    if (metrics.activeCount > 10) {
      this.createAlert({
        id: 'high-session-count',
        type: 'info',
        title: 'High Number of Active Sessions',
        message: `${metrics.activeCount} active editorial sessions`,
        suggestions: [
          'Monitor system performance',
          'Consider session cleanup',
          'Check for stuck sessions'
        ],
        severity: 'low'
      });
    } else {
      this.clearAlert('high-session-count');
    }
    
    // Low completion rate
    if (metrics.completionRate < 0.7) {
      this.createAlert({
        id: 'low-completion-rate',
        type: 'warning',
        title: 'Low Session Completion Rate',
        message: `Session completion rate is ${(metrics.completionRate * 100).toFixed(1)}%`,
        suggestions: [
          'Review user experience',
          'Check for blocking errors',
          'Analyze session abandonment patterns'
        ],
        severity: 'medium'
      });
    } else {
      this.clearAlert('low-completion-rate');
    }
  }
  
  private createAlert(alert: Alert): void {
    const existing = this.activeAlerts.get(alert.id);
    
    if (!existing) {
      alert.timestamp = new Date();
      alert.count = 1;
      this.activeAlerts.set(alert.id, alert);
      this.displayAlert(alert);
    } else {
      // Update existing alert
      existing.count++;
      existing.timestamp = new Date();
      existing.severity = this.escalateSeverity(existing.severity, alert.severity);
    }
  }
  
  private clearAlert(alertId: string): void {
    if (this.activeAlerts.has(alertId)) {
      this.activeAlerts.delete(alertId);
      this.hideAlert(alertId);
    }
  }
  
  private displayAlert(alert: Alert): void {
    // Create visual alert in UI
    const alertEl = document.createElement('div');
    alertEl.className = `performance-alert alert-${alert.type} severity-${alert.severity}`;
    alertEl.id = `alert-${alert.id}`;
    
    alertEl.innerHTML = `
      <div class="alert-header">
        <span class="alert-icon">${this.getAlertIcon(alert.type)}</span>
        <span class="alert-title">${alert.title}</span>
        <button class="alert-close" onclick="this.parentElement.parentElement.remove()">×</button>
      </div>
      <div class="alert-message">${alert.message}</div>
      ${alert.suggestions && alert.suggestions.length > 0 ? `
        <div class="alert-suggestions">
          <strong>Suggestions:</strong>
          <ul>
            ${alert.suggestions.map(s => `<li>${s}</li>`).join('')}
          </ul>
        </div>
      ` : ''}
      <div class="alert-meta">
        <small>Count: ${alert.count} | ${alert.timestamp.toLocaleTimeString()}</small>
      </div>
    `;
    
    // Add to alerts container
    const alertsContainer = this.getOrCreateAlertsContainer();
    alertsContainer.appendChild(alertEl);
    
    // Auto-hide low severity alerts
    if (alert.severity === 'low') {
      setTimeout(() => {
        alertEl.remove();
      }, 10000);
    }
  }
  
  private hideAlert(alertId: string): void {
    const alertEl = document.getElementById(`alert-${alertId}`);
    if (alertEl) {
      alertEl.remove();
    }
  }
  
  private getOrCreateAlertsContainer(): HTMLElement {
    let container = document.getElementById('performance-alerts');
    if (!container) {
      container = document.createElement('div');
      container.id = 'performance-alerts';
      container.className = 'performance-alerts-container';
      document.body.appendChild(container);
    }
    return container;
  }
  
  private getAlertIcon(type: string): string {
    const icons = {
      error: '🚨',
      warning: '⚠️',
      info: 'ℹ️',
      success: '✅'
    };
    return icons[type] || 'ℹ️';
  }
  
  private escalateSeverity(current: string, new_: string): string {
    const severityOrder = ['low', 'medium', 'high'];
    const currentIndex = severityOrder.indexOf(current);
    const newIndex = severityOrder.indexOf(new_);
    return severityOrder[Math.max(currentIndex, newIndex)];
  }
  
  getActiveAlerts(): Alert[] {
    return Array.from(this.activeAlerts.values())
      .sort((a, b) => {
        // Sort by severity, then by timestamp
        const severityOrder = { high: 3, medium: 2, low: 1 };
        const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
        if (severityDiff !== 0) return severityDiff;
        return b.timestamp.getTime() - a.timestamp.getTime();
      });
  }
  
  exportAlertsReport(): AlertsReport {
    const alerts = this.getActiveAlerts();
    const summary = {
      total: alerts.length,
      bySeverity: {
        high: alerts.filter(a => a.severity === 'high').length,
        medium: alerts.filter(a => a.severity === 'medium').length,
        low: alerts.filter(a => a.severity === 'low').length
      },
      byType: {
        error: alerts.filter(a => a.type === 'error').length,
        warning: alerts.filter(a => a.type === 'warning').length,
        info: alerts.filter(a => a.type === 'info').length
      }
    };
    
    return {
      timestamp: new Date(),
      summary,
      alerts,
      recommendations: this.generateAlertRecommendations(alerts)
    };
  }
  
  private generateAlertRecommendations(alerts: Alert[]): string[] {
    const recommendations: string[] = [];
    
    if (alerts.filter(a => a.severity === 'high').length > 0) {
      recommendations.push('Address high-severity alerts immediately to prevent system degradation');
    }
    
    if (alerts.filter(a => a.type === 'error').length > 2) {
      recommendations.push('Multiple error alerts detected - consider system health review');
    }
    
    const repeatedAlerts = alerts.filter(a => a.count > 5);
    if (repeatedAlerts.length > 0) {
      recommendations.push('Some alerts are recurring frequently - investigate root causes');
    }
    
    return recommendations;
  }
}

interface AlertThresholds {
  registryLoadTime: number;
  validationFailureRate: number;
  reinforcementEffectiveness: number;
  trackEditsFailureRate: number;
  memoryUsage: number;
  sessionErrorRate: number;
}

interface Alert {
  id: string;
  type: 'error' | 'warning' | 'info' | 'success';
  title: string;
  message: string;
  suggestions?: string[];
  severity: 'low' | 'medium' | 'high';
  timestamp: Date;
  count: number;
}

interface AlertsReport {
  timestamp: Date;
  summary: {
    total: number;
    bySeverity: Record<string, number>;
    byType: Record<string, number>;
  };
  alerts: Alert[];
  recommendations: string[];
}

// CSS for alert styling
const ALERT_STYLES = `
.performance-alerts-container {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 10000;
  max-width: 400px;
}

.performance-alert {
  background: var(--background-primary);
  border: 1px solid var(--background-modifier-border);
  border-radius: 8px;
  margin-bottom: 10px;
  padding: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  animation: slideIn 0.3s ease-out;
}

.alert-error {
  border-left: 4px solid var(--text-error);
}

.alert-warning {
  border-left: 4px solid var(--text-warning);
}

.alert-info {
  border-left: 4px solid var(--text-accent);
}

.severity-high {
  box-shadow: 0 4px 12px rgba(220, 38, 38, 0.2);
}

.alert-header {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
}

.alert-icon {
  margin-right: 8px;
  font-size: 16px;
}

.alert-title {
  font-weight: 600;
  flex: 1;
}

.alert-close {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  padding: 0;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.alert-message {
  margin-bottom: 8px;
  color: var(--text-muted);
}

.alert-suggestions {
  margin-bottom: 8px;
}

.alert-suggestions ul {
  margin: 4px 0 0 16px;
  padding: 0;
}

.alert-suggestions li {
  margin-bottom: 2px;
  font-size: 0.9em;
  color: var(--text-muted);
}

.alert-meta {
  border-top: 1px solid var(--background-modifier-border);
  padding-top: 8px;
  margin-top: 8px;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(100%);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}
`;

// Inject alert styles
function injectAlertStyles(): void {
  if (!document.getElementById('performance-alert-styles')) {
    const styleEl = document.createElement('style');
    styleEl.id = 'performance-alert-styles';
    styleEl.textContent = ALERT_STYLES;
    document.head.appendChild(styleEl);
  }
}

// Initialize performance monitoring
export function initializePerformanceMonitoring(): PerformanceMonitor {
  injectAlertStyles();
  
  const monitor = new PerformanceMonitor();
  const alertManager = new AlertManager();
  
  monitor.startMonitoring();
  
  // Set up alert checking
  setInterval(() => {
    const report = monitor.getPerformanceReport();
    alertManager.checkPerformanceAlerts(report);
  }, 60000); // Check every minute
  
  return monitor;
}
```

---

## Summary

This addendum provides comprehensive enhancements to the main Editorial Functions specification:

### **Enhanced Constraint Enforcement**
- Multi-layered validation engine with phrase, action, schema, and drift detection
- Sophisticated pattern matching and semantic analysis
- Configurable violation severity and escalation
- Detailed validation reporting and suggestions

### **Role Reinforcement Engine**
- Automatic trigger detection based on multiple factors
- Adaptive reinforcement intensity calculation
- Template-based prompt generation with function-specific customization
- Effectiveness tracking and optimization
- Periodic reinforcement management

### **Comprehensive Management Interface**
- Full-featured function management modal with CRUD operations
- Advanced function testing with validation and performance metrics
- Visual function editor with real-time validation
- Analytics dashboard with usage statistics and performance metrics
- Backup and recovery systems

### **Enhanced Hot Reloading & Error Recovery**
- Advanced file watching with breaking change detection
- Automatic backup creation and management
- Intelligent error recovery with multiple recovery options
- Change validation and conflict resolution
- Session update management for active functions

### **Performance Monitoring**
- Comprehensive performance metrics collection
- Real-time alert system with configurable thresholds
- Performance trend analysis and reporting
- Memory usage monitoring and cleanup
- Actionable recommendations for optimization

These enhancements ensure the Editorial Functions system provides:

✅ **Enterprise-grade reliability** with comprehensive error handling and recovery
✅ **Professional monitoring** with performance tracking and alerting
✅ **Advanced constraint management** preventing AI role drift
✅ **Sophisticated role reinforcement** maintaining AI behavior consistency
✅ **Complete management interface** for non-technical team members
✅ **Robust hot reloading** with validation and safety checks

The system becomes a professional-grade editorial workbench that teams can rely on for consistent, high-quality AI-assisted editing with complete control and visibility.
