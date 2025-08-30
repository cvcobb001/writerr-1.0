var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// plugins/editorial-engine/src/adapters/track-edits-adapter.ts
var track_edits_adapter_exports = {};
__export(track_edits_adapter_exports, {
  TrackEditsAdapter: () => TrackEditsAdapter
});
var TrackEditsAdapter;
var init_track_edits_adapter = __esm({
  "plugins/editorial-engine/src/adapters/track-edits-adapter.ts"() {
    TrackEditsAdapter = class {
      constructor() {
        this.name = "track-edits";
        this.version = "1.0.0";
        this.supportedOperations = ["text-edit", "content-modification", "proofreading", "editing"];
        this.capabilities = {
          batchProcessing: true,
          realTimeProcessing: true,
          undoSupport: true,
          provenance: true,
          streaming: false
        };
        this.initialized = false;
        this.config = {};
        this.metrics = {
          executionsCount: 0,
          successRate: 1,
          averageLatency: 0,
          errorCount: 0,
          lastExecution: Date.now()
        };
        this.executionTimes = [];
        this.errors = [];
      }
      async initialize(config) {
        var _a;
        this.config = config;
        if (!((_a = window.WriterrlAPI) == null ? void 0 : _a.trackEdits)) {
          throw new Error("Track Edits plugin is not loaded or accessible");
        }
        const currentSession = window.WriterrlAPI.trackEdits.getCurrentSession();
        console.log("Track Edits Adapter initialized, current session:", currentSession ? "active" : "none");
        this.initialized = true;
      }
      async execute(job) {
        const startTime = performance.now();
        try {
          if (!this.initialized) {
            throw new Error("Track Edits Adapter not initialized");
          }
          await this.ensureTrackingSession();
          const trackEditsChanges = this.convertToTrackEditsFormat(job);
          const result = await this.processChangesWithTrackEdits(trackEditsChanges, job);
          const executionTime = performance.now() - startTime;
          this.recordExecution(executionTime, true);
          return this.convertFromTrackEditsFormat(result, job);
        } catch (error) {
          const executionTime = performance.now() - startTime;
          this.recordExecution(executionTime, false, error.message);
          return {
            success: false,
            jobId: job.id,
            timestamp: Date.now(),
            executionTime,
            errors: [{
              type: "adapter-error",
              message: error.message,
              timestamp: Date.now()
            }],
            metadata: {
              adapter: this.name,
              version: this.version
            }
          };
        }
      }
      async cleanup() {
        this.initialized = false;
        this.config = {};
        console.log("Track Edits Adapter cleaned up");
      }
      getStatus() {
        var _a, _b, _c;
        const isTrackEditsAvailable = !!((_a = window.WriterrlAPI) == null ? void 0 : _a.trackEdits);
        const hasActiveSession = !!((_c = (_b = window.WriterrlAPI) == null ? void 0 : _b.trackEdits) == null ? void 0 : _c.getCurrentSession());
        return {
          healthy: this.initialized && isTrackEditsAvailable,
          ready: this.initialized && isTrackEditsAvailable && hasActiveSession,
          error: !isTrackEditsAvailable ? "Track Edits plugin not available" : !hasActiveSession ? "No active tracking session" : void 0,
          lastHealthCheck: Date.now(),
          currentLoad: 0
        };
      }
      getMetrics() {
        return { ...this.metrics };
      }
      // Private implementation methods
      async ensureTrackingSession() {
        var _a;
        if (!((_a = window.WriterrlAPI) == null ? void 0 : _a.trackEdits)) {
          throw new Error("Track Edits API not available");
        }
        const currentSession = window.WriterrlAPI.trackEdits.getCurrentSession();
        if (!currentSession) {
          window.WriterrlAPI.trackEdits.startTracking();
          const newSession = window.WriterrlAPI.trackEdits.getCurrentSession();
          if (!newSession) {
            throw new Error("Failed to start Track Edits session");
          }
          console.log("Started Track Edits session:", newSession.id);
        }
      }
      convertToTrackEditsFormat(job) {
        var _a;
        const changes = [];
        if (job.payload.changes) {
          return job.payload.changes;
        }
        if (job.payload.text && job.payload.edits) {
          for (const edit of job.payload.edits) {
            changes.push({
              id: `${job.id}-${edit.id || Date.now()}`,
              timestamp: Date.now(),
              type: edit.type === "addition" ? "insert" : edit.type === "deletion" ? "delete" : "replace",
              from: edit.start || 0,
              to: edit.end || edit.start || 0,
              text: edit.newText || "",
              removedText: edit.oldText || "",
              author: "editorial-engine",
              metadata: {
                jobId: job.id,
                mode: job.payload.mode,
                provenance: "editorial-engine"
              }
            });
          }
        } else if (job.payload.text) {
          changes.push({
            id: `${job.id}-full-text`,
            timestamp: Date.now(),
            type: "replace",
            from: 0,
            to: ((_a = job.payload.originalText) == null ? void 0 : _a.length) || 0,
            text: job.payload.text,
            removedText: job.payload.originalText || "",
            author: "editorial-engine",
            metadata: {
              jobId: job.id,
              mode: job.payload.mode,
              provenance: "editorial-engine"
            }
          });
        }
        return changes;
      }
      async processChangesWithTrackEdits(changes, job) {
        var _a, _b;
        const trackEditsAPI = window.WriterrlAPI.trackEdits;
        const currentSession = trackEditsAPI.getCurrentSession();
        const useSequentialProcessing = ((_a = job.metadata) == null ? void 0 : _a.sequentialProcessing) || false;
        const processedChanges = [];
        const rejectedChanges = [];
        if (useSequentialProcessing) {
          for (const change of changes) {
            try {
              if (trackEditsAPI.recordChange) {
                await trackEditsAPI.recordChange(change);
              }
              processedChanges.push(change);
            } catch (error) {
              console.warn(`Failed to record sequential change ${change.id}:`, error);
              rejectedChanges.push(change);
            }
          }
        } else {
          for (const change of changes) {
            try {
              if (trackEditsAPI.applyChange) {
                await trackEditsAPI.applyChange(change);
              }
              processedChanges.push(change);
            } catch (error) {
              console.warn(`Failed to apply change ${change.id}:`, error);
              rejectedChanges.push(change);
            }
          }
        }
        return {
          success: true,
          sessionId: currentSession.id,
          appliedChanges: processedChanges,
          rejectedChanges,
          timestamp: Date.now(),
          metadata: {
            jobId: job.id,
            mode: job.payload.mode,
            processingTime: performance.now() - (((_b = job.metadata) == null ? void 0 : _b.startTime) || Date.now()),
            sequentialProcessing: useSequentialProcessing,
            totalChanges: changes.length,
            successfulChanges: processedChanges.length,
            failedChanges: rejectedChanges.length
          }
        };
      }
      convertFromTrackEditsFormat(trackEditsResult, job) {
        var _a;
        const executionTime = performance.now() - (((_a = job.metadata) == null ? void 0 : _a.startTime) || Date.now());
        if (!trackEditsResult.success) {
          return {
            success: false,
            jobId: job.id,
            timestamp: Date.now(),
            executionTime,
            errors: [{
              type: "track-edits-error",
              message: "Track Edits processing failed",
              timestamp: Date.now()
            }],
            metadata: {
              adapter: this.name,
              version: this.version,
              trackEditsSession: trackEditsResult.sessionId
            }
          };
        }
        return {
          success: true,
          jobId: job.id,
          timestamp: Date.now(),
          executionTime,
          result: {
            processedText: job.payload.text,
            // In real implementation, get processed text from Track Edits
            changes: trackEditsResult.appliedChanges,
            rejectedChanges: trackEditsResult.rejectedChanges,
            sessionId: trackEditsResult.sessionId
          },
          metadata: {
            adapter: this.name,
            version: this.version,
            trackEditsSession: trackEditsResult.sessionId,
            appliedChanges: trackEditsResult.appliedChanges.length,
            rejectedChanges: trackEditsResult.rejectedChanges.length
          },
          provenance: {
            adapter: this.name,
            timestamp: Date.now(),
            jobId: job.id,
            sessionId: trackEditsResult.sessionId,
            changes: trackEditsResult.appliedChanges.map((change) => ({
              id: change.id,
              type: change.type,
              position: { from: change.from, to: change.to },
              author: change.author
            }))
          }
        };
      }
      recordExecution(executionTime, success, error) {
        this.metrics.executionsCount++;
        this.metrics.lastExecution = Date.now();
        this.executionTimes.push(executionTime);
        if (this.executionTimes.length > 100) {
          this.executionTimes = this.executionTimes.slice(-100);
        }
        this.metrics.averageLatency = this.executionTimes.reduce((sum, time) => sum + time, 0) / this.executionTimes.length;
        if (success) {
          this.metrics.successRate = (this.metrics.successRate * (this.metrics.executionsCount - 1) + 1) / this.metrics.executionsCount;
        } else {
          this.metrics.errorCount++;
          this.metrics.successRate = this.metrics.successRate * (this.metrics.executionsCount - 1) / this.metrics.executionsCount;
          if (error) {
            this.errors.push(error);
            if (this.errors.length > 50) {
              this.errors = this.errors.slice(-50);
            }
          }
        }
      }
    };
  }
});

// plugins/editorial-engine/src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => EditorialEnginePlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian2 = require("obsidian");

// plugins/editorial-engine/src/settings.ts
var import_obsidian = require("obsidian");
var DEFAULT_SETTINGS = {
  version: "1.0.0",
  enabledModes: ["proofreader", "copy-editor", "developmental-editor"],
  defaultMode: "proofreader",
  constraintValidation: {
    strictMode: true,
    maxProcessingTime: 1e4,
    // 10 seconds
    memoryLimits: {
      maxRulesetSize: 1e3,
      maxConcurrentJobs: 3
    }
  },
  adapters: {
    "track-edits": {
      enabled: true,
      config: {
        batchSize: 10,
        timeout: 5e3
      },
      priority: 1
    }
  },
  performance: {
    enableCaching: true,
    cacheSize: 100,
    backgroundProcessing: true
  }
};
var EditorialEngineSettingsTab = class extends import_obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  async display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Editorial Engine Settings" });
    this.createGeneralSettings(containerEl);
    await this.createModeSettings(containerEl);
    this.createAdapterSettings(containerEl);
    this.createPerformanceSettings(containerEl);
  }
  createGeneralSettings(containerEl) {
    containerEl.createEl("h3", { text: "General Settings" });
    const availableModes = this.plugin.modeRegistry.getAllModes();
    new import_obsidian.Setting(containerEl).setName("Default Mode").setDesc("The default editing mode to use when no specific mode is selected").addDropdown((dropdown) => {
      for (const mode of availableModes) {
        dropdown.addOption(mode.id, mode.name);
      }
      dropdown.setValue(this.plugin.settings.defaultMode).onChange(async (value) => {
        this.plugin.settings.defaultMode = value;
        await this.plugin.saveSettings();
      });
    });
    new import_obsidian.Setting(containerEl).setName("Strict Mode").setDesc("Enable strict constraint validation (recommended)").addToggle((toggle) => toggle.setValue(this.plugin.settings.constraintValidation.strictMode).onChange(async (value) => {
      this.plugin.settings.constraintValidation.strictMode = value;
      await this.plugin.saveSettings();
    }));
    new import_obsidian.Setting(containerEl).setName("Max Processing Time").setDesc("Maximum time (in seconds) to wait for processing completion").addSlider((slider) => slider.setLimits(5, 60, 5).setValue(this.plugin.settings.constraintValidation.maxProcessingTime / 1e3).setDynamicTooltip().onChange(async (value) => {
      this.plugin.settings.constraintValidation.maxProcessingTime = value * 1e3;
      await this.plugin.saveSettings();
    }));
  }
  async createModeSettings(containerEl) {
    containerEl.createEl("h3", { text: "Mode Configuration" });
    const modesContainer = containerEl.createDiv("modes-container");
    modesContainer.style.cssText = `
      border: 1px solid var(--background-modifier-border);
      border-radius: 4px;
      padding: 15px;
      margin: 10px 0;
    `;
    const infoEl = modesContainer.createEl("p", {
      text: "Modes are loaded from .obsidian/plugins/editorial-engine/modes/ folder. Add or edit .md files to create custom modes.",
      cls: "setting-item-description"
    });
    infoEl.style.cssText = `
      color: var(--text-muted);
      font-size: 0.9em;
      margin-bottom: 15px;
      padding: 8px;
      background: var(--background-secondary);
      border-radius: 3px;
    `;
    const enabledModes = this.plugin.settings.enabledModes;
    const availableModes = this.plugin.modeRegistry.getAllModes();
    if (availableModes.length === 0) {
      modesContainer.createEl("p", {
        text: "No modes found. Add mode files to .obsidian/plugins/editorial-engine/modes/ folder.",
        cls: "setting-item-description"
      });
      return;
    }
    for (const mode of availableModes) {
      new import_obsidian.Setting(modesContainer).setName(mode.name).setDesc(mode.description || `${mode.name} mode`).addToggle((toggle) => toggle.setValue(enabledModes.includes(mode.id)).onChange(async (value) => {
        if (value) {
          if (!enabledModes.includes(mode.id)) {
            enabledModes.push(mode.id);
          }
        } else {
          const index = enabledModes.indexOf(mode.id);
          if (index > -1) {
            enabledModes.splice(index, 1);
          }
        }
        await this.plugin.saveSettings();
      }));
    }
  }
  createAdapterSettings(containerEl) {
    containerEl.createEl("h3", { text: "Adapter Configuration" });
    const adaptersContainer = containerEl.createDiv("adapters-container");
    adaptersContainer.style.cssText = `
      border: 1px solid var(--background-modifier-border);
      border-radius: 4px;
      padding: 15px;
      margin: 10px 0;
    `;
    const trackEditsConfig = this.plugin.settings.adapters["track-edits"];
    new import_obsidian.Setting(adaptersContainer).setName("Track Edits Integration").setDesc("Enable integration with Track Edits plugin for change management").addToggle((toggle) => toggle.setValue(trackEditsConfig.enabled).onChange(async (value) => {
      trackEditsConfig.enabled = value;
      await this.plugin.saveSettings();
    }));
    new import_obsidian.Setting(adaptersContainer).setName("Batch Size").setDesc("Number of changes to batch together for Track Edits").addSlider((slider) => slider.setLimits(1, 50, 1).setValue(trackEditsConfig.config.batchSize).setDynamicTooltip().onChange(async (value) => {
      trackEditsConfig.config.batchSize = value;
      await this.plugin.saveSettings();
    }));
  }
  createPerformanceSettings(containerEl) {
    containerEl.createEl("h3", { text: "Performance Settings" });
    new import_obsidian.Setting(containerEl).setName("Enable Caching").setDesc("Cache processing results to improve performance").addToggle((toggle) => toggle.setValue(this.plugin.settings.performance.enableCaching).onChange(async (value) => {
      this.plugin.settings.performance.enableCaching = value;
      await this.plugin.saveSettings();
    }));
    new import_obsidian.Setting(containerEl).setName("Cache Size").setDesc("Maximum number of results to keep in cache").addSlider((slider) => slider.setLimits(10, 500, 10).setValue(this.plugin.settings.performance.cacheSize).setDynamicTooltip().onChange(async (value) => {
      this.plugin.settings.performance.cacheSize = value;
      await this.plugin.saveSettings();
    }));
    new import_obsidian.Setting(containerEl).setName("Background Processing").setDesc("Process long-running tasks in the background").addToggle((toggle) => toggle.setValue(this.plugin.settings.performance.backgroundProcessing).onChange(async (value) => {
      this.plugin.settings.performance.backgroundProcessing = value;
      await this.plugin.saveSettings();
    }));
    const performanceContainer = containerEl.createDiv("performance-monitor");
    performanceContainer.style.cssText = `
      background: var(--background-secondary);
      border-radius: 4px;
      padding: 15px;
      margin: 15px 0;
    `;
    performanceContainer.createEl("h4", { text: "Performance Metrics" });
    const metricsEl = performanceContainer.createDiv();
    this.updatePerformanceMetrics(metricsEl);
  }
  updatePerformanceMetrics(container) {
    container.empty();
    const metrics = this.plugin.getPerformanceMetrics();
    if (metrics) {
      const metricsGrid = container.createDiv();
      metricsGrid.style.cssText = `
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
        margin-top: 10px;
      `;
      const metricItems = [
        { label: "Avg Processing Time", value: `${metrics.avgProcessingTime.toFixed(2)}ms` },
        { label: "Success Rate", value: `${(metrics.successRate * 100).toFixed(1)}%` },
        { label: "Total Requests", value: metrics.totalRequests.toString() },
        { label: "Cache Hit Rate", value: `${(metrics.cacheHitRate * 100).toFixed(1)}%` }
      ];
      for (const item of metricItems) {
        const metricEl = metricsGrid.createDiv();
        metricEl.style.cssText = `
          padding: 8px;
          border: 1px solid var(--background-modifier-border);
          border-radius: 3px;
        `;
        metricEl.createEl("div", { text: item.label, cls: "metric-label" });
        const valueEl = metricEl.createEl("div", { text: item.value, cls: "metric-value" });
        valueEl.style.fontWeight = "bold";
      }
    } else {
      container.createEl("p", { text: "No performance data available yet." });
    }
  }
};

// plugins/editorial-engine/src/ruleset-compiler.ts
var RulesetCompiler = class {
  constructor() {
    this.nlProcessor = new NaturalLanguageProcessor();
  }
  async compile(intent, mode) {
    if (mode.constraints && mode.constraints.length > 0) {
      return {
        constraints: mode.constraints,
        validationRules: this.generateValidationRules(mode.constraints),
        executionParams: this.deriveExecutionParams(intent),
        compiledAt: Date.now()
      };
    }
    return await this.compileMode(mode);
  }
  async compileMode(mode) {
    const parsedRules = await this.parseNaturalLanguage(mode.naturalLanguageRules);
    const constraints = await this.mapToConstraints(parsedRules);
    const validationRules = this.generateValidationRules(constraints);
    const executionParams = {
      timeout: 1e4,
      // 10 seconds default
      maxRetries: 2,
      preferredAdapters: ["track-edits"],
      fallbackStrategy: "graceful-degradation"
    };
    return {
      constraints,
      validationRules,
      executionParams,
      compiledAt: Date.now()
    };
  }
  async parseNaturalLanguage(rules) {
    const results = [];
    for (const rule of rules.allowed) {
      const parsed = await this.nlProcessor.parse(rule, "permission");
      results.push(parsed);
    }
    for (const rule of rules.forbidden) {
      const parsed = await this.nlProcessor.parse(rule, "prohibition");
      results.push(parsed);
    }
    for (const rule of rules.focus) {
      const parsed = await this.nlProcessor.parse(rule, "focus");
      results.push(parsed);
    }
    for (const rule of rules.boundaries) {
      const parsed = await this.nlProcessor.parse(rule, "boundary");
      results.push(parsed);
    }
    return results;
  }
  async mapToConstraints(parsedRules) {
    const constraints = [];
    for (const rule of parsedRules) {
      const constraint = this.ruleToConstraint(rule);
      if (constraint) {
        constraints.push(constraint);
      }
    }
    return constraints;
  }
  ruleToConstraint(rule) {
    switch (rule.type) {
      case "permission":
        return this.createPermissionConstraint(rule);
      case "prohibition":
        return this.createProhibitionConstraint(rule);
      case "boundary":
        return this.createBoundaryConstraint(rule);
      case "focus":
        return this.createFocusConstraint(rule);
      default:
        console.warn(`Unknown rule type: ${rule.type}`);
        return null;
    }
  }
  createPermissionConstraint(rule) {
    const intent = rule.intent.toLowerCase();
    if (intent.includes("grammar") || intent.includes("spelling")) {
      return {
        type: "grammar_only" /* GRAMMAR_ONLY */,
        parameters: {
          allowSpelling: true,
          allowGrammar: true,
          allowPunctuation: true
        },
        priority: rule.confidence * 10,
        validation: [{
          type: "output-validation",
          condition: "minimal-content-change",
          message: "Changes should be limited to grammar and spelling"
        }]
      };
    }
    return {
      type: "style_consistency" /* STYLE_CONSISTENCY */,
      parameters: { allowedOperations: [rule.intent] },
      priority: rule.confidence * 10,
      validation: []
    };
  }
  createProhibitionConstraint(rule) {
    const intent = rule.intent.toLowerCase();
    if (intent.includes("voice") || intent.includes("style") || intent.includes("tone")) {
      return {
        type: "preserve_tone" /* PRESERVE_TONE */,
        parameters: {
          preserveVoice: true,
          preserveStyle: true,
          allowMinorAdjustments: false
        },
        priority: rule.confidence * 10,
        validation: [{
          type: "tone-analysis",
          condition: "tone-similarity > 0.9",
          message: "Must preserve original tone and voice"
        }]
      };
    }
    if (intent.includes("content") || intent.includes("meaning")) {
      return {
        type: "no_content_change" /* NO_CONTENT_CHANGE */,
        parameters: {
          preserveMeaning: true,
          allowClarification: false
        },
        priority: rule.confidence * 10,
        validation: [{
          type: "semantic-analysis",
          condition: "meaning-similarity > 0.95",
          message: "Must preserve original meaning"
        }]
      };
    }
    return {
      type: "no_content_change" /* NO_CONTENT_CHANGE */,
      parameters: { prohibitedAction: rule.intent },
      priority: rule.confidence * 10,
      validation: []
    };
  }
  createBoundaryConstraint(rule) {
    const intent = rule.intent.toLowerCase();
    const percentageMatch = intent.match(/(\d+)%/);
    if (percentageMatch) {
      const percentage = parseInt(percentageMatch[1]) / 100;
      return {
        type: "length_limit" /* LENGTH_LIMIT */,
        parameters: {
          maxChangeRatio: percentage,
          measurementType: "words"
        },
        priority: rule.confidence * 10,
        validation: [{
          type: "change-ratio-check",
          condition: `change-ratio <= ${percentage}`,
          message: `Changes must not exceed ${percentageMatch[1]}% of original text`
        }]
      };
    }
    return {
      type: "length_limit" /* LENGTH_LIMIT */,
      parameters: { maxChangeRatio: 0.25 },
      // 25% default limit
      priority: rule.confidence * 10,
      validation: []
    };
  }
  createFocusConstraint(rule) {
    return {
      type: "style_consistency" /* STYLE_CONSISTENCY */,
      parameters: {
        focusArea: rule.intent,
        priority: "high"
      },
      priority: rule.confidence * 10,
      validation: []
    };
  }
  generateValidationRules(constraints) {
    const rules = [];
    for (const constraint of constraints) {
      rules.push(...constraint.validation);
    }
    rules.push({
      type: "basic-validation",
      condition: "output-not-empty",
      message: "Output must not be empty"
    });
    return rules;
  }
  deriveExecutionParams(intent) {
    let timeout = 1e4;
    if (intent.type === "summarization") {
      timeout = 15e3;
    } else if (intent.type === "grammar-check") {
      timeout = 5e3;
    }
    return {
      timeout,
      maxRetries: 2,
      preferredAdapters: ["track-edits"],
      fallbackStrategy: "graceful-degradation"
    };
  }
};
var NaturalLanguageProcessor = class {
  constructor() {
    // Common patterns for better rule parsing
    this.QUANTIFIER_PATTERNS = [
      /(\d+)\s*%/i,
      // "25%", "50%"
      /no more than\s+(\d+)\s*%/i,
      // "no more than 15%"
      /less than\s+(\d+)\s*%/i,
      // "less than 20%"
      /under\s+(\d+)\s*%/i,
      // "under 10%"
      /(\d+)\s*(words?|characters?|sentences?)/i,
      // "100 words", "50 characters"
      /minimal(?:ly)?/i,
      // "minimal changes"
      /maximum\s+(\d+)/i
      // "maximum 3 sentences"
    ];
    this.PERMISSION_KEYWORDS = [
      "allow",
      "permit",
      "enable",
      "fix",
      "correct",
      "improve",
      "enhance",
      "adjust",
      "modify",
      "update",
      "refine",
      "polish",
      "standardize"
    ];
    this.PROHIBITION_KEYWORDS = [
      "never",
      "don't",
      "avoid",
      "prevent",
      "prohibit",
      "forbid",
      "exclude",
      "reject",
      "disallow",
      "no",
      "not"
    ];
    this.FOCUS_KEYWORDS = [
      "focus",
      "emphasize",
      "prioritize",
      "concentrate",
      "target",
      "highlight",
      "stress",
      "feature"
    ];
    this.BOUNDARY_KEYWORDS = [
      "limit",
      "restrict",
      "bound",
      "constrain",
      "cap",
      "maximum",
      "minimum",
      "within",
      "under",
      "over"
    ];
  }
  async parse(rule, ruleType) {
    const confidence = this.calculateConfidence(rule);
    const intent = this.extractIntent(rule, ruleType);
    const parameters = this.extractParameters(rule);
    const context = this.extractContext(rule);
    const constraints = this.extractConstraintHints(rule);
    return {
      type: ruleType,
      intent,
      confidence,
      parameters: {
        ...parameters,
        context,
        constraints,
        originalRule: rule
      }
    };
  }
  calculateConfidence(rule) {
    let confidence = 0.4;
    const clarityIndicators = [
      /specific|exact|precisely|clearly|explicitly/i,
      /always|never|must|should|shall/i,
      /\d+/,
      // Contains numbers
      /grammar|spelling|punctuation|style|tone|voice|meaning/i
    ];
    for (const indicator of clarityIndicators) {
      if (indicator.test(rule)) {
        confidence += 0.1;
      }
    }
    if (this.hasQuantifiers(rule)) {
      confidence += 0.2;
    }
    const technicalTerms = [
      "subject-verb agreement",
      "passive voice",
      "sentence structure",
      "paragraph transitions",
      "logical flow",
      "argumentation",
      "semantic analysis",
      "syntactic correctness"
    ];
    for (const term of technicalTerms) {
      if (rule.toLowerCase().includes(term)) {
        confidence += 0.15;
        break;
      }
    }
    if (rule.length > 20 && rule.length < 200) {
      confidence += 0.05;
    }
    return Math.min(confidence, 1);
  }
  extractIntent(rule, ruleType) {
    const lowerRule = rule.toLowerCase();
    const actionPatterns = [
      { pattern: /fix|correct|repair/, intent: "correction" },
      { pattern: /improve|enhance|refine|polish/, intent: "enhancement" },
      { pattern: /preserve|maintain|keep|retain/, intent: "preservation" },
      { pattern: /check|validate|verify|ensure/, intent: "validation" },
      { pattern: /rewrite|restructure|reorganize/, intent: "restructuring" },
      { pattern: /summarize|condense|shorten/, intent: "summarization" },
      { pattern: /expand|elaborate|develop/, intent: "expansion" },
      { pattern: /standardize|normalize|format/, intent: "standardization" }
    ];
    for (const { pattern, intent } of actionPatterns) {
      if (pattern.test(lowerRule)) {
        return intent;
      }
    }
    if (lowerRule.includes("grammar") || lowerRule.includes("spelling")) {
      return "grammatical-correction";
    }
    if (lowerRule.includes("style") || lowerRule.includes("flow")) {
      return "stylistic-improvement";
    }
    if (lowerRule.includes("structure") || lowerRule.includes("organization")) {
      return "structural-editing";
    }
    if (lowerRule.includes("voice") || lowerRule.includes("tone")) {
      return "voice-preservation";
    }
    const typeBasedIntents = {
      "permission": "allow-operation",
      "prohibition": "prevent-operation",
      "boundary": "limit-operation",
      "focus": "prioritize-operation"
    };
    return typeBasedIntents[ruleType] || rule.trim();
  }
  extractParameters(rule) {
    const parameters = {};
    const percentageMatches = rule.match(/(\d+)\s*%/g);
    if (percentageMatches) {
      parameters.percentages = percentageMatches.map((m) => parseInt(m));
      parameters.primaryPercentage = parameters.percentages[0];
    }
    const countMatches = rule.matchAll(/(\d+)\s*(words?|characters?|sentences?)/gi);
    for (const match of countMatches) {
      const count = parseInt(match[1]);
      const unit = match[2].toLowerCase();
      parameters[`${unit}Count`] = count;
    }
    const comparisonPatterns = [
      { pattern: /no more than|less than|under|below/, operator: "lte" },
      { pattern: /more than|greater than|above|over/, operator: "gte" },
      { pattern: /exactly|precisely/, operator: "eq" },
      { pattern: /approximately|around|about/, operator: "approx" }
    ];
    for (const { pattern, operator } of comparisonPatterns) {
      if (pattern.test(rule.toLowerCase())) {
        parameters.comparisonOperator = operator;
        break;
      }
    }
    const scopePatterns = [
      { pattern: /entire|whole|complete|full/, scope: "document" },
      { pattern: /paragraph|section/, scope: "paragraph" },
      { pattern: /sentence/, scope: "sentence" },
      { pattern: /word|phrase/, scope: "word" }
    ];
    for (const { pattern, scope } of scopePatterns) {
      if (pattern.test(rule.toLowerCase())) {
        parameters.scope = scope;
        break;
      }
    }
    const priorityPatterns = [
      { pattern: /critical|essential|vital|must/, priority: "high" },
      { pattern: /important|should|recommended/, priority: "medium" },
      { pattern: /optional|consider|might/, priority: "low" }
    ];
    for (const { pattern, priority } of priorityPatterns) {
      if (pattern.test(rule.toLowerCase())) {
        parameters.priority = priority;
        break;
      }
    }
    return parameters;
  }
  extractContext(rule) {
    const context = {};
    const lowerRule = rule.toLowerCase();
    const documentTypes = [
      "academic",
      "business",
      "creative",
      "technical",
      "legal",
      "marketing",
      "journalistic",
      "scientific"
    ];
    for (const type of documentTypes) {
      if (lowerRule.includes(type)) {
        context.documentType = type;
        break;
      }
    }
    const audienceTypes = [
      "professional",
      "academic",
      "general",
      "technical",
      "casual",
      "formal",
      "informal",
      "expert",
      "beginner"
    ];
    for (const audience of audienceTypes) {
      if (lowerRule.includes(audience)) {
        context.audience = audience;
        break;
      }
    }
    const styleTypes = [
      "formal",
      "informal",
      "conversational",
      "authoritative",
      "persuasive",
      "descriptive",
      "narrative",
      "expository"
    ];
    for (const style of styleTypes) {
      if (lowerRule.includes(style)) {
        context.style = style;
        break;
      }
    }
    const languageFeatures = [
      "terminology",
      "jargon",
      "idioms",
      "metaphors",
      "analogies",
      "voice",
      "tone",
      "perspective",
      "tense",
      "person"
    ];
    context.languageFeatures = [];
    for (const feature of languageFeatures) {
      if (lowerRule.includes(feature)) {
        context.languageFeatures.push(feature);
      }
    }
    return context;
  }
  extractConstraintHints(rule) {
    const hints = [];
    const lowerRule = rule.toLowerCase();
    const constraintPatterns = [
      { pattern: /grammar|spelling|punctuation/, hint: "grammatical" },
      { pattern: /style|flow|readability/, hint: "stylistic" },
      { pattern: /length|word count|character count/, hint: "length-based" },
      { pattern: /tone|voice|perspective/, hint: "tonal" },
      { pattern: /structure|organization|format/, hint: "structural" },
      { pattern: /content|meaning|intent/, hint: "semantic" },
      { pattern: /consistency|uniformity/, hint: "consistency" },
      { pattern: /clarity|comprehension/, hint: "clarity" }
    ];
    for (const { pattern, hint } of constraintPatterns) {
      if (pattern.test(lowerRule)) {
        hints.push(hint);
      }
    }
    if (lowerRule.includes("minimal") || lowerRule.includes("conservative")) {
      hints.push("conservative-editing");
    }
    if (lowerRule.includes("aggressive") || lowerRule.includes("extensive")) {
      hints.push("extensive-editing");
    }
    if (lowerRule.includes("preserve") || lowerRule.includes("maintain")) {
      hints.push("preservation-focused");
    }
    return hints;
  }
  hasQuantifiers(rule) {
    return this.QUANTIFIER_PATTERNS.some((pattern) => pattern.test(rule));
  }
  // Advanced parsing methods for specific domains
  parseGrammarRule(rule) {
    const grammarAspects = {
      "subject-verb agreement": /subject.?verb|agreement/i,
      "tense consistency": /tense|past|present|future/i,
      "pronoun reference": /pronoun|reference|antecedent/i,
      "modifier placement": /modifier|dangling|misplaced/i,
      "parallel structure": /parallel|series|list/i
    };
    const detected = {};
    for (const [aspect, pattern] of Object.entries(grammarAspects)) {
      detected[aspect] = pattern.test(rule);
    }
    return detected;
  }
  parseStyleRule(rule) {
    const styleAspects = {
      "sentence variety": /sentence.*variety|varied.*sentence/i,
      "word choice": /word.*choice|vocabulary|diction/i,
      "transitions": /transition|flow|connection/i,
      "conciseness": /concise|wordiness|brevity/i,
      "active voice": /active.*voice|passive.*voice/i,
      "clarity": /clear|clarity|comprehension/i
    };
    const detected = {};
    for (const [aspect, pattern] of Object.entries(styleAspects)) {
      detected[aspect] = pattern.test(rule);
    }
    return detected;
  }
  parseStructuralRule(rule) {
    const structuralAspects = {
      "paragraph structure": /paragraph.*structure|topic.*sentence/i,
      "logical flow": /logical.*flow|sequence|order/i,
      "argumentation": /argument|evidence|support|reasoning/i,
      "introduction": /introduction|opening|hook/i,
      "conclusion": /conclusion|ending|summary/i,
      "headings": /heading|title|section/i
    };
    const detected = {};
    for (const [aspect, pattern] of Object.entries(structuralAspects)) {
      detected[aspect] = pattern.test(rule);
    }
    return detected;
  }
};

// plugins/editorial-engine/src/constraint-processor.ts
var ConstraintProcessor = class {
  constructor(modeRegistry, adapterManager, performanceMonitor, eventBus, settings) {
    this.modeRegistry = modeRegistry;
    this.adapterManager = adapterManager;
    this.performanceMonitor = performanceMonitor;
    this.eventBus = eventBus;
    this.settings = settings;
    this.compiler = new RulesetCompiler();
  }
  async process(intake) {
    const startTime = performance.now();
    try {
      const normalized = await this.normalizeIntake(intake);
      const intent = await this.recognizeIntent(normalized);
      const mode = this.modeRegistry.getMode(intake.mode);
      if (!mode) {
        throw new Error(`Unknown mode: ${intake.mode}`);
      }
      const ruleset = await this.compileConstraints(intent, mode);
      const validation = await this.validateConstraints(ruleset);
      if (!validation.valid) {
        throw new Error(`Constraint validation failed: ${validation.errors.join(", ")}`);
      }
      if (validation.warnings && validation.warnings.length > 0) {
        console.warn("Constraint validation warnings:", validation.warnings);
        this.eventBus.emit("constraint-validation-warnings", {
          intakeId: intake.id,
          warnings: validation.warnings
        });
      }
      const executionPlan = await this.createExecutionPlan(ruleset, intake);
      const results = await this.executeViaAdapters(executionPlan);
      const finalResult = await this.assembleResults(results, intake, startTime);
      if (validation.warnings && validation.warnings.length > 0) {
        finalResult.summary.warnings.push(...validation.warnings);
      }
      await this.validateResults(finalResult, ruleset);
      return finalResult;
    } catch (error) {
      console.error("Constraint processing error:", error);
      this.eventBus.emit("constraint-processing-error", {
        intakeId: intake.id,
        error: error.message,
        stage: "processing"
      });
      return this.createErrorResult(intake, error, startTime);
    }
  }
  async normalizeIntake(intake) {
    if (!intake) {
      throw new Error("Invalid input for constraint processing: intake payload is null or undefined");
    }
    if (!intake.instructions || typeof intake.instructions !== "string") {
      throw new Error(`Invalid instructions for constraint processing: received ${typeof intake.instructions}, expected string`);
    }
    if (!intake.sourceText || typeof intake.sourceText !== "string") {
      throw new Error(`Invalid source text for constraint processing: received ${typeof intake.sourceText}, expected string`);
    }
    const instructionsTrimmed = intake.instructions.trim();
    const sourceTextTrimmed = intake.sourceText.trim();
    if (instructionsTrimmed.length === 0) {
      throw new Error("Instructions cannot be empty or whitespace-only");
    }
    if (sourceTextTrimmed.length === 0) {
      throw new Error("Source text cannot be empty or whitespace-only");
    }
    const normalized = {
      ...intake,
      instructions: instructionsTrimmed,
      sourceText: sourceTextTrimmed
    };
    if (!normalized.mode) {
      normalized.mode = this.settings.defaultMode || "proofreader";
    }
    return normalized;
  }
  async recognizeIntent(intake) {
    const instructions = intake.instructions.toLowerCase();
    let type = "general-edit";
    let confidence = 0.7;
    const intentPatterns = [
      { pattern: /\b(grammar|spelling|punctuation)\b/g, intent: "grammar-check", confidence: 0.9 },
      { pattern: /\b(style|flow|readability)\b/g, intent: "style-enhancement", confidence: 0.85 },
      { pattern: /\b(summarize|summary|condense)\b/g, intent: "summarization", confidence: 0.95 },
      { pattern: /\b(improve|enhance|polish)\b/g, intent: "improvement", confidence: 0.8 },
      { pattern: /\b(rewrite|restructure)\b/g, intent: "restructuring", confidence: 0.9 },
      { pattern: /\b(proofread|check|review)\b/g, intent: "proofreading", confidence: 0.85 }
    ];
    for (const { pattern, intent, confidence: patternConfidence } of intentPatterns) {
      const matches = instructions.match(pattern);
      if (matches) {
        type = intent;
        confidence = Math.min(patternConfidence + (matches.length - 1) * 0.05, 1);
        break;
      }
    }
    return {
      type,
      confidence,
      parameters: {
        originalInstructions: intake.instructions,
        textLength: intake.sourceText.length,
        mode: intake.mode,
        detectedPatterns: instructions.match(/\b(grammar|spelling|style|improve|summarize)\b/g) || []
      }
    };
  }
  async compileConstraints(intent, mode) {
    try {
      return await this.compiler.compile(intent, mode);
    } catch (error) {
      console.error("Constraint compilation failed:", error);
      throw new Error(`Failed to compile constraints: ${error.message}`);
    }
  }
  async validateConstraints(ruleset) {
    const errors = [];
    const warnings = [];
    if (!ruleset.constraints || ruleset.constraints.length === 0) {
      errors.push("No constraints defined in ruleset");
    }
    if (ruleset.executionParams.timeout <= 0) {
      errors.push("Invalid timeout value - must be positive");
    }
    if (ruleset.executionParams.timeout > 6e4) {
      warnings.push("Timeout value is very high (>60s) - may affect user experience");
    }
    if (!ruleset.executionParams.preferredAdapters || ruleset.executionParams.preferredAdapters.length === 0) {
      warnings.push("No preferred adapters specified - execution may be unpredictable");
    }
    if (ruleset.constraints && ruleset.constraints.length > 0) {
      const constraintValidation = await this.validateIndividualConstraints(ruleset.constraints);
      errors.push(...constraintValidation.errors);
      warnings.push(...constraintValidation.warnings);
      const conflictValidation = this.validateConstraintConflicts(ruleset.constraints);
      errors.push(...conflictValidation.errors);
      warnings.push(...conflictValidation.warnings);
    }
    if (ruleset.validationRules && ruleset.validationRules.length > 0) {
      const ruleValidation = this.validateValidationRules(ruleset.validationRules);
      errors.push(...ruleValidation.errors);
      warnings.push(...ruleValidation.warnings);
    }
    if (this.settings.constraintValidation.strictMode) {
      const performanceValidation = this.validatePerformanceConstraints(ruleset);
      errors.push(...performanceValidation.errors);
      warnings.push(...performanceValidation.warnings);
    }
    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
  async validateIndividualConstraints(constraints) {
    const errors = [];
    const warnings = [];
    for (const constraint of constraints) {
      if (!constraint.type) {
        errors.push("Constraint missing type specification");
        continue;
      }
      if (constraint.priority < 0 || constraint.priority > 100) {
        warnings.push(`Constraint priority ${constraint.priority} outside recommended range (0-100)`);
      }
      switch (constraint.type) {
        case "length_limit" /* LENGTH_LIMIT */:
          if (constraint.parameters.maxChangeRatio && (constraint.parameters.maxChangeRatio < 0 || constraint.parameters.maxChangeRatio > 1)) {
            errors.push("LENGTH_LIMIT maxChangeRatio must be between 0 and 1");
          }
          break;
        case "grammar_only" /* GRAMMAR_ONLY */:
          if (!constraint.parameters.allowSpelling && !constraint.parameters.allowGrammar) {
            warnings.push("GRAMMAR_ONLY constraint allows neither spelling nor grammar fixes");
          }
          break;
        case "preserve_tone" /* PRESERVE_TONE */:
          if (constraint.parameters.preserveVoice === false && constraint.parameters.preserveStyle === false) {
            warnings.push("PRESERVE_TONE constraint preserves neither voice nor style");
          }
          break;
        case "no_content_change" /* NO_CONTENT_CHANGE */:
          if (constraint.parameters.preserveMeaning === false) {
            errors.push("NO_CONTENT_CHANGE constraint must preserve meaning");
          }
          break;
      }
      if (constraint.validation && constraint.validation.length > 0) {
        for (const validationRule of constraint.validation) {
          if (!validationRule.type || !validationRule.condition) {
            errors.push("Constraint validation rule missing type or condition");
          }
        }
      }
    }
    return { errors, warnings };
  }
  validateConstraintConflicts(constraints) {
    const errors = [];
    const warnings = [];
    const constraintTypes = constraints.map((c) => c.type);
    if (constraintTypes.includes("grammar_only" /* GRAMMAR_ONLY */) && constraintTypes.includes("style_consistency" /* STYLE_CONSISTENCY */)) {
      warnings.push("Potential conflict: Grammar-only and style consistency constraints may interfere");
    }
    if (constraintTypes.includes("no_content_change" /* NO_CONTENT_CHANGE */)) {
      const improvementConstraints = constraints.filter(
        (c) => {
          var _a, _b;
          return ((_a = c.parameters.allowedOperations) == null ? void 0 : _a.includes("improvement")) || ((_b = c.parameters.allowedOperations) == null ? void 0 : _b.includes("enhancement"));
        }
      );
      if (improvementConstraints.length > 0) {
        warnings.push("Potential conflict: Content preservation vs improvement constraints");
      }
    }
    const lengthConstraints = constraints.filter((c) => c.type === "length_limit" /* LENGTH_LIMIT */);
    if (lengthConstraints.length > 1) {
      const ratios = lengthConstraints.map((c) => c.parameters.maxChangeRatio).filter((r) => r);
      if (ratios.length > 0) {
        const minRatio = Math.min(...ratios);
        const maxRatio = Math.max(...ratios);
        if (minRatio !== maxRatio) {
          warnings.push(`Conflicting length limits: ${minRatio * 100}% vs ${maxRatio * 100}%`);
        }
      }
    }
    const highPriorityConstraints = constraints.filter((c) => c.priority >= 80);
    if (highPriorityConstraints.length > 3) {
      warnings.push(`Many high-priority constraints (${highPriorityConstraints.length}) may create conflicts`);
    }
    return { errors, warnings };
  }
  validateValidationRules(validationRules) {
    const errors = [];
    const warnings = [];
    for (const rule of validationRules) {
      if (!rule.type || !rule.condition) {
        errors.push("Validation rule missing type or condition");
        continue;
      }
      if (rule.condition.includes("undefined") || rule.condition.includes("null")) {
        warnings.push(`Validation rule condition may have undefined references: ${rule.condition}`);
      }
      if (rule.type === "change-ratio-check" && !rule.condition.includes("change-ratio")) {
        errors.push("change-ratio-check rule must reference change-ratio in condition");
      }
      if (rule.type === "semantic-analysis" && !rule.condition.includes("meaning-similarity") && !rule.condition.includes("semantic-distance")) {
        warnings.push("semantic-analysis rule should reference meaning-similarity or semantic-distance");
      }
      if (rule.type === "tone-analysis" && !rule.condition.includes("tone-similarity")) {
        warnings.push("tone-analysis rule should reference tone-similarity");
      }
    }
    return { errors, warnings };
  }
  validatePerformanceConstraints(ruleset) {
    const errors = [];
    const warnings = [];
    const totalConstraints = ruleset.constraints.length;
    const complexValidationRules = ruleset.validationRules.filter(
      (r) => r.type.includes("semantic") || r.type.includes("tone")
    ).length;
    if (totalConstraints > 20) {
      warnings.push(`High constraint count (${totalConstraints}) may impact performance`);
    }
    if (complexValidationRules > 10) {
      warnings.push(`Many complex validation rules (${complexValidationRules}) may slow processing`);
    }
    const expectedComplexity = totalConstraints + complexValidationRules * 2;
    const recommendedTimeout = Math.max(5e3, expectedComplexity * 200);
    if (ruleset.executionParams.timeout < recommendedTimeout) {
      warnings.push(
        `Timeout (${ruleset.executionParams.timeout}ms) may be too short for complexity level (recommended: ${recommendedTimeout}ms)`
      );
    }
    return { errors, warnings };
  }
  async createExecutionPlan(ruleset, intake) {
    return {
      id: `plan-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      ruleset,
      intake,
      steps: [
        {
          type: this.modeToJobType(intake.mode),
          adapter: "track-edits",
          payload: {
            text: intake.sourceText,
            instructions: intake.instructions,
            constraints: ruleset.constraints,
            mode: intake.mode
          },
          priority: 1
        }
      ],
      createdAt: Date.now()
    };
  }
  modeToJobType(mode) {
    const modeMapping = {
      "proofreader": "proofreading",
      "copy-editor": "editing",
      "developmental-editor": "editing",
      "creative-writing-assistant": "content-modification"
    };
    return modeMapping[mode] || "text-edit";
  }
  async executeViaAdapters(executionPlan) {
    const results = [];
    for (const step of executionPlan.steps) {
      try {
        const result = await this.adapterManager.execute({
          id: `job-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          type: step.type,
          payload: step.payload,
          constraints: executionPlan.ruleset.constraints,
          context: executionPlan.intake.context,
          timeout: executionPlan.ruleset.executionParams.timeout
        });
        results.push({
          success: true,
          data: result,
          adapter: step.adapter,
          processingTime: result.processingTime || 0
        });
      } catch (error) {
        console.error(`Adapter execution failed for step ${step.type}:`, error);
        results.push({
          success: false,
          error: error.message,
          data: null,
          adapter: step.adapter,
          processingTime: 0
        });
      }
    }
    return results;
  }
  async assembleResults(results, intake, startTime) {
    const processingTime = performance.now() - startTime;
    const changes = [];
    const hasSuccessfulResult = results.some((r) => r.success);
    if (hasSuccessfulResult) {
      for (const result of results.filter((r) => r.success)) {
        if (result.data && result.data.changes) {
          changes.push(...result.data.changes);
        } else {
          changes.push({
            id: `change-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            type: "replace",
            range: { start: 0, end: intake.sourceText.length },
            originalText: intake.sourceText,
            newText: intake.sourceText,
            // Would be modified by actual processing
            confidence: 0.85,
            reasoning: `Applied ${intake.mode} mode constraints via ${result.adapter}`,
            source: "editorial-engine",
            timestamp: Date.now()
          });
        }
      }
    }
    const provenance = {
      steps: results.map((result, index) => ({
        stage: `adapter-execution-${index}`,
        input: intake,
        output: result,
        processingTime: result.processingTime,
        adapter: result.adapter || "unknown"
      })),
      totalTime: processingTime
    };
    const summary = {
      totalChanges: changes.length,
      changeSummary: changes.reduce((acc, change) => {
        acc[change.type] = (acc[change.type] || 0) + 1;
        return acc;
      }, {}),
      confidence: changes.length > 0 ? changes.reduce((sum, c) => sum + c.confidence, 0) / changes.length : 0,
      warnings: []
    };
    return {
      id: `result-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      intakeId: intake.id,
      success: hasSuccessfulResult,
      processingTime,
      changes,
      conflicts: [],
      provenance,
      summary,
      metadata: {
        mode: intake.mode,
        adapterResults: results.length,
        successfulAdapters: results.filter((r) => r.success).length,
        failedAdapters: results.filter((r) => !r.success).length
      }
    };
  }
  async validateResults(result, ruleset) {
    if (this.settings.constraintValidation.strictMode) {
      if (result.changes.length > 100) {
        throw new Error("Too many changes - possible constraint violation (>100 changes)");
      }
      if (result.processingTime > this.settings.constraintValidation.maxProcessingTime) {
        console.warn(`Processing time exceeded limit: ${result.processingTime}ms`);
      }
      for (const constraint of ruleset.constraints) {
        if (constraint.type === "length_limit" /* LENGTH_LIMIT */) {
          const changeRatio = this.calculateChangeRatio(result.changes);
          if (changeRatio > constraint.parameters.maxChangeRatio) {
            throw new Error(
              `Change ratio ${(changeRatio * 100).toFixed(1)}% exceeds constraint limit ${(constraint.parameters.maxChangeRatio * 100).toFixed(1)}%`
            );
          }
        }
      }
    }
    this.eventBus.emit("result-validation-complete", {
      resultId: result.id,
      success: result.success,
      changeCount: result.changes.length,
      processingTime: result.processingTime
    });
  }
  calculateChangeRatio(changes) {
    if (changes.length === 0)
      return 0;
    let totalOriginalLength = 0;
    let totalNewLength = 0;
    for (const change of changes) {
      totalOriginalLength += change.originalText.length;
      totalNewLength += change.newText.length;
    }
    if (totalOriginalLength === 0)
      return 0;
    return Math.abs(totalNewLength - totalOriginalLength) / totalOriginalLength;
  }
  createErrorResult(intake, error, startTime) {
    return {
      id: `error-result-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      intakeId: intake.id,
      success: false,
      processingTime: performance.now() - startTime,
      changes: [],
      conflicts: [],
      provenance: {
        steps: [{
          stage: "error",
          input: intake,
          output: { error: error.message, stack: error.stack },
          processingTime: performance.now() - startTime,
          adapter: "editorial-engine"
        }],
        totalTime: performance.now() - startTime
      },
      summary: {
        totalChanges: 0,
        changeSummary: {},
        confidence: 0,
        warnings: [error.message]
      },
      metadata: {
        error: error.message,
        mode: intake.mode,
        stage: "constraint-processing"
      }
    };
  }
};

// plugins/editorial-engine/src/mode-registry.ts
var ModeRegistry = class {
  constructor(eventBus, settings) {
    this.eventBus = eventBus;
    this.settings = settings;
    this.modes = /* @__PURE__ */ new Map();
    this.compiler = new RulesetCompiler();
    this.loadPersistedModes();
  }
  async registerMode(mode) {
    const validation = await this.validateMode(mode);
    if (!validation.valid) {
      throw new Error(`Mode validation failed: ${validation.errors.join(", ")}`);
    }
    if (this.modes.has(mode.id)) {
      const existingMode = this.modes.get(mode.id);
      mode = await this.migrateMode(mode, existingMode.version);
    }
    if (!mode.constraints || mode.constraints.length === 0) {
      try {
        const compiled = await this.compiler.compileMode(mode);
        mode.constraints = compiled.constraints;
      } catch (error) {
        console.warn(`Failed to compile constraints for mode ${mode.id}:`, error);
        mode.constraints = [];
      }
    }
    this.modes.set(mode.id, mode);
    this.eventBus.emit("mode-registered", { mode });
    if (!["proofreader", "copy-editor", "developmental-editor", "creative-writing-assistant"].includes(mode.id)) {
      await this.persistModes();
    }
    console.log(`Registered mode: ${mode.name} (${mode.id})`);
  }
  getMode(id) {
    return this.modes.get(id);
  }
  getAllModes() {
    return Array.from(this.modes.values());
  }
  getModesByCategory(category) {
    return this.getAllModes().filter((mode) => mode.metadata.category === category);
  }
  async updateMode(id, updates) {
    const existingMode = this.modes.get(id);
    if (!existingMode) {
      throw new Error(`Mode not found: ${id}`);
    }
    const updatedMode = { ...existingMode, ...updates };
    if (updates.naturalLanguageRules) {
      const compiled = await this.compiler.compileMode(updatedMode);
      updatedMode.constraints = compiled.constraints;
    }
    this.modes.set(id, updatedMode);
    this.eventBus.emit("mode-updated", { mode: updatedMode });
  }
  async removeMode(id) {
    if (this.modes.has(id)) {
      const mode = this.modes.get(id);
      if (["proofreader", "copy-editor", "developmental-editor", "creative-writing-assistant"].includes(id)) {
        throw new Error(`Cannot remove default mode: ${id}`);
      }
      this.modes.delete(id);
      this.eventBus.emit("mode-removed", { modeId: id, mode });
      await this.persistModes();
      console.log(`Removed mode: ${mode.name} (${id})`);
    }
  }
  async validateMode(mode) {
    const errors = [];
    if (!mode.id)
      errors.push("Mode ID is required");
    if (!mode.name)
      errors.push("Mode name is required");
    if (!mode.description)
      errors.push("Mode description is required");
    if (!mode.version)
      errors.push("Mode version is required");
    if (mode.id && this.modes.has(mode.id)) {
      errors.push(`Mode ID already exists: ${mode.id}`);
    }
    if (!mode.naturalLanguageRules) {
      errors.push("Natural language rules are required");
    } else {
      if (!mode.naturalLanguageRules.allowed || mode.naturalLanguageRules.allowed.length === 0) {
        errors.push("At least one allowed rule is required");
      }
      const allRules = [
        ...mode.naturalLanguageRules.allowed,
        ...mode.naturalLanguageRules.forbidden,
        ...mode.naturalLanguageRules.focus,
        ...mode.naturalLanguageRules.boundaries
      ];
      for (const rule of allRules) {
        if (!rule.trim()) {
          errors.push("Rules cannot be empty");
          break;
        }
      }
    }
    if (!mode.metadata) {
      errors.push("Mode metadata is required");
    } else {
      if (!mode.metadata.category) {
        errors.push("Mode category is required");
      }
      if (!mode.metadata.difficulty) {
        errors.push("Mode difficulty is required");
      }
    }
    return {
      valid: errors.length === 0,
      errors
    };
  }
  // Export modes for sharing/backup
  exportModes() {
    const modesArray = Array.from(this.modes.values());
    return JSON.stringify(modesArray, null, 2);
  }
  // Import modes from JSON
  async importModes(modesJson) {
    const errors = [];
    let imported = 0;
    try {
      const modes = JSON.parse(modesJson);
      if (!Array.isArray(modes)) {
        throw new Error("Invalid format: expected array of modes");
      }
      for (const mode of modes) {
        try {
          await this.registerMode(mode);
          imported++;
        } catch (error) {
          errors.push(`Failed to import mode ${mode.id || "unknown"}: ${error.message}`);
        }
      }
    } catch (error) {
      errors.push(`JSON parsing failed: ${error.message}`);
    }
    return { imported, errors };
  }
  // Mode persistence for Obsidian restarts
  async loadPersistedModes() {
    var _a, _b;
    if ((_b = (_a = this.settings) == null ? void 0 : _a.app) == null ? void 0 : _b.vault) {
      try {
        const data = await this.settings.app.vault.adapter.read(".obsidian/plugins/editorial-engine/modes.json");
        if (data) {
          const modes = JSON.parse(data);
          for (const mode of modes) {
            if (!this.modes.has(mode.id)) {
              await this.registerMode(mode);
            }
          }
          console.log(`Loaded ${modes.length} persisted modes`);
        }
      } catch (error) {
        console.log("No persisted modes found or failed to load");
      }
    }
  }
  async persistModes() {
    var _a, _b;
    if ((_b = (_a = this.settings) == null ? void 0 : _a.app) == null ? void 0 : _b.vault) {
      try {
        const customModes = Array.from(this.modes.values()).filter(
          (mode) => !["proofreader", "copy-editor", "developmental-editor", "creative-writing-assistant"].includes(mode.id)
        );
        const data = JSON.stringify(customModes, null, 2);
        await this.settings.app.vault.adapter.write(".obsidian/plugins/editorial-engine/modes.json", data);
        console.log(`Persisted ${customModes.length} custom modes`);
      } catch (error) {
        console.error("Failed to persist modes:", error);
      }
    }
  }
  // Version migration support
  async migrateMode(mode, targetVersion) {
    const currentVersion = mode.version || "1.0.0";
    if (this.compareVersions(currentVersion, targetVersion) >= 0) {
      return mode;
    }
    const migratedMode = { ...mode };
    if (currentVersion === "1.0.0" && this.compareVersions(targetVersion, "1.1.0") >= 0) {
      if (!migratedMode.metadata.migrationHistory) {
        migratedMode.metadata.migrationHistory = [
          {
            from: currentVersion,
            to: "1.1.0",
            timestamp: Date.now(),
            changes: ["Added migration history tracking"]
          }
        ];
      }
      migratedMode.version = "1.1.0";
    }
    this.eventBus.emit("mode-migrated", {
      mode: migratedMode,
      fromVersion: currentVersion,
      toVersion: targetVersion
    });
    return migratedMode;
  }
  compareVersions(a, b) {
    const aParts = a.split(".").map(Number);
    const bParts = b.split(".").map(Number);
    for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
      const aPart = aParts[i] || 0;
      const bPart = bParts[i] || 0;
      if (aPart > bPart)
        return 1;
      if (aPart < bPart)
        return -1;
    }
    return 0;
  }
};

// plugins/editorial-engine/src/adapter-manager.ts
var AdapterManager = class {
  constructor(eventBus, settings) {
    this.eventBus = eventBus;
    this.settings = settings;
    this.adapters = /* @__PURE__ */ new Map();
    this.router = new AdapterRouter();
    this.healthMonitor = new AdapterHealthMonitor(this.eventBus);
  }
  async registerAdapter(adapter) {
    try {
      const config = this.getAdapterConfig(adapter.name);
      await adapter.initialize(config);
      this.router.registerAdapter(adapter);
      this.adapters.set(adapter.name, adapter);
      this.healthMonitor.startMonitoring(adapter);
      this.eventBus.emit("adapter-registered", {
        name: adapter.name,
        adapter
      });
      console.log(`Registered adapter: ${adapter.name} v${adapter.version}`);
    } catch (error) {
      console.error(`Failed to register adapter ${adapter.name}:`, error);
      throw error;
    }
  }
  async execute(job) {
    const startTime = performance.now();
    try {
      const suitableAdapters = this.router.findSuitableAdapters(job);
      if (suitableAdapters.length === 0) {
        const error = new Error(
          `No suitable adapter found for job type: ${job.type}. Available adapters: ${this.adapters.size}, Registered adapter types: ${Array.from(this.adapters.values()).map((a) => a.supportedOperations).flat().join(", ")}`
        );
        this.eventBus.emit("adapter-execution-failed", {
          jobId: job.id,
          error: error.message,
          availableAdapters: Array.from(this.adapters.keys()),
          requestedJobType: job.type
        });
        throw error;
      }
      let lastError = null;
      const attemptedAdapters = [];
      for (const adapter of suitableAdapters) {
        attemptedAdapters.push(adapter.name);
        try {
          this.router.updateAdapterLoad(adapter.name, this.getCurrentAdapterLoad(adapter.name));
          const result = await this.executeWithAdapter(adapter, job);
          const executionTime = performance.now() - startTime;
          this.router.recordAdapterExecution(adapter.name, executionTime, true);
          this.recordExecution(adapter.name, true, executionTime);
          this.eventBus.emit("adapter-execution-success", {
            jobId: job.id,
            adapterName: adapter.name,
            executionTime,
            attemptedAdapters
          });
          return result;
        } catch (error) {
          const executionTime = performance.now() - startTime;
          console.warn(`Adapter ${adapter.name} failed for job ${job.id}:`, error);
          lastError = error;
          this.router.recordAdapterExecution(adapter.name, executionTime, false);
          this.recordExecution(adapter.name, false, executionTime);
          this.eventBus.emit("adapter-execution-attempt-failed", {
            jobId: job.id,
            adapterName: adapter.name,
            error: error.message,
            executionTime,
            remainingAdapters: suitableAdapters.length - attemptedAdapters.length
          });
          continue;
        }
      }
      const finalError = new Error(
        `All suitable adapters failed for job ${job.id}. Attempted adapters: ${attemptedAdapters.join(", ")}. Last error: ${(lastError == null ? void 0 : lastError.message) || "Unknown error"}`
      );
      this.eventBus.emit("adapter-execution-failed", {
        jobId: job.id,
        error: finalError.message,
        attemptedAdapters,
        lastError: lastError == null ? void 0 : lastError.message
      });
      throw finalError;
    } catch (error) {
      if (error.message && !error.message.includes("No suitable adapter")) {
        this.eventBus.emit("adapter-execution-failed", {
          jobId: job.id,
          error: error.message
        });
      }
      throw error;
    }
  }
  async executeWithAdapter(adapter, job) {
    var _a;
    const status = adapter.getStatus();
    if (!status.healthy) {
      throw new Error(`Adapter ${adapter.name} is not healthy: ${status.error}`);
    }
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Adapter execution timeout")), job.timeout);
    });
    const executionPromise = adapter.execute(job);
    const result = await Promise.race([executionPromise, timeoutPromise]);
    if (!result.success) {
      throw new Error(`Adapter execution failed: ${(_a = result.errors) == null ? void 0 : _a.map((e) => e.message).join(", ")}`);
    }
    return result;
  }
  getAdapter(name) {
    return this.adapters.get(name);
  }
  getAllAdapters() {
    return Array.from(this.adapters.values());
  }
  getAdapterCount() {
    return this.adapters.size;
  }
  getAdapterStatus(name) {
    const adapter = this.adapters.get(name);
    return adapter == null ? void 0 : adapter.getStatus();
  }
  getAllAdapterStatuses() {
    const statuses = {};
    for (const [name, adapter] of this.adapters) {
      statuses[name] = adapter.getStatus();
    }
    return statuses;
  }
  getAdapterConfig(adapterName) {
    var _a;
    return ((_a = this.settings.adapters[adapterName]) == null ? void 0 : _a.config) || {};
  }
  recordExecution(adapterName, success, responseTime) {
    this.eventBus.emit("adapter-execution-recorded", {
      adapterName,
      success,
      responseTime,
      timestamp: Date.now()
    });
  }
  getCurrentAdapterLoad(adapterName) {
    const adapter = this.adapters.get(adapterName);
    if (!adapter)
      return 0;
    const status = adapter.getStatus();
    return status.currentLoad || 0;
  }
  // Enhanced adapter management methods
  setRoutingStrategy(strategy) {
    this.router.setRoutingStrategy(strategy);
    this.eventBus.emit("routing-strategy-changed", {
      newStrategy: strategy,
      timestamp: Date.now()
    });
  }
  getRoutingStrategy() {
    return this.router.getRoutingStrategy();
  }
  getAdapterMetrics() {
    return this.router.getAdapterMetrics();
  }
  getDetailedAdapterStatus() {
    const detailedStatus = {};
    for (const [name, adapter] of this.adapters) {
      const status = adapter.getStatus();
      const metrics = this.router.getAdapterMetrics()[name];
      detailedStatus[name] = {
        ...status,
        metrics,
        capabilities: adapter.capabilities,
        supportedOperations: adapter.supportedOperations,
        lastHealthCheck: status.lastHealthCheck || Date.now()
      };
    }
    return detailedStatus;
  }
  async cleanup() {
    this.healthMonitor.cleanup();
    for (const [name, adapter] of this.adapters) {
      try {
        await adapter.cleanup();
      } catch (error) {
        console.error(`Error cleaning up adapter ${name}:`, error);
      }
    }
    this.adapters.clear();
  }
};
var AdapterRouter = class {
  constructor(routingStrategy = "priority") {
    this.adapters = [];
    this.routingStrategy = "priority";
    this.roundRobinIndex = 0;
    this.adapterMetrics = /* @__PURE__ */ new Map();
    this.routingStrategy = routingStrategy;
  }
  registerAdapter(adapter) {
    this.adapters.push(adapter);
    this.adapterMetrics.set(adapter.name, {
      totalRequests: 0,
      successfulRequests: 0,
      averageResponseTime: 0,
      currentLoad: 0,
      lastUsed: 0,
      priority: this.extractAdapterPriority(adapter)
    });
    this.sortAdaptersByPriority();
  }
  findSuitableAdapters(job) {
    const compatibleAdapters = this.adapters.filter(
      (adapter) => this.isAdapterCompatible(adapter, job)
    );
    if (compatibleAdapters.length === 0) {
      return [];
    }
    switch (this.routingStrategy) {
      case "priority":
        return this.priorityRouting(compatibleAdapters, job);
      case "round-robin":
        return this.roundRobinRouting(compatibleAdapters);
      case "load-balanced":
        return this.loadBalancedRouting(compatibleAdapters, job);
      default:
        return compatibleAdapters;
    }
  }
  isAdapterCompatible(adapter, job) {
    var _a;
    if (!adapter.supportedOperations.includes(job.type)) {
      return false;
    }
    const status = adapter.getStatus();
    if (!status.healthy) {
      return false;
    }
    if (job.payload && typeof job.payload.text === "string") {
      const textLength = job.payload.text.length;
      if (textLength > adapter.capabilities.maxTextLength) {
        return false;
      }
    }
    if (job.constraints && job.constraints.length > 0) {
      const requiredCapabilities = this.extractRequiredCapabilities(job.constraints);
      for (const capability of requiredCapabilities) {
        if (!((_a = adapter.capabilities.supportedConstraints) == null ? void 0 : _a.includes(capability))) {
          return false;
        }
      }
    }
    if (job.timeout > adapter.capabilities.maxProcessingTime) {
      return false;
    }
    return true;
  }
  priorityRouting(adapters, job) {
    return adapters.sort((a, b) => {
      const scoreA = this.calculateAdapterScore(a, job);
      const scoreB = this.calculateAdapterScore(b, job);
      return scoreB - scoreA;
    });
  }
  roundRobinRouting(adapters) {
    if (adapters.length === 0)
      return [];
    const selectedAdapter = adapters[this.roundRobinIndex % adapters.length];
    this.roundRobinIndex = (this.roundRobinIndex + 1) % adapters.length;
    const result = [selectedAdapter];
    result.push(...adapters.filter((a) => a.name !== selectedAdapter.name));
    return result;
  }
  loadBalancedRouting(adapters, job) {
    return adapters.sort((a, b) => {
      const metricsA = this.adapterMetrics.get(a.name);
      const metricsB = this.adapterMetrics.get(b.name);
      const loadScoreA = this.calculateLoadScore(metricsA);
      const loadScoreB = this.calculateLoadScore(metricsB);
      return loadScoreB - loadScoreA;
    });
  }
  calculateAdapterScore(adapter, job) {
    const metrics = this.adapterMetrics.get(adapter.name);
    if (!metrics)
      return 0;
    let score = metrics.priority * 10;
    const successRate = metrics.totalRequests > 0 ? metrics.successfulRequests / metrics.totalRequests : 0.5;
    score += successRate * 20;
    const responseTimePenalty = Math.min(metrics.averageResponseTime / 1e3, 10);
    score -= responseTimePenalty;
    score -= metrics.currentLoad * 5;
    const recencyBonus = Math.max(0, 10 - (Date.now() - metrics.lastUsed) / 1e3);
    score += recencyBonus;
    if (job.constraints) {
      const compatibilityBonus = this.calculateCompatibilityBonus(adapter, job);
      score += compatibilityBonus;
    }
    return Math.max(0, score);
  }
  calculateLoadScore(metrics) {
    const successRate = metrics.totalRequests > 0 ? metrics.successfulRequests / metrics.totalRequests : 0.5;
    const loadPenalty = metrics.currentLoad * 0.3;
    const responsePenalty = metrics.averageResponseTime / 1e4;
    return successRate * 100 - loadPenalty - responsePenalty;
  }
  calculateCompatibilityBonus(adapter, job) {
    let bonus = 0;
    const operationBonus = {
      "grammar-check": adapter.name.includes("grammar") ? 5 : 0,
      "style-enhancement": adapter.name.includes("style") ? 5 : 0,
      "summarization": adapter.name.includes("summarize") ? 5 : 0
    };
    bonus += operationBonus[job.type] || 0;
    if (job.constraints) {
      const supportedConstraints = job.constraints.filter(
        (constraint) => {
          var _a;
          return (_a = adapter.capabilities.supportedConstraints) == null ? void 0 : _a.includes(constraint.type);
        }
      );
      bonus += supportedConstraints.length * 2;
    }
    return bonus;
  }
  extractRequiredCapabilities(constraints) {
    const capabilities = /* @__PURE__ */ new Set();
    for (const constraint of constraints) {
      if (constraint.type === "PRESERVE_TONE") {
        capabilities.add("tone-analysis");
      }
      if (constraint.type === "NO_CONTENT_CHANGE") {
        capabilities.add("semantic-analysis");
      }
      if (constraint.type === "GRAMMAR_ONLY") {
        capabilities.add("grammar-checking");
      }
      if (constraint.type === "STYLE_CONSISTENCY") {
        capabilities.add("style-analysis");
      }
    }
    return Array.from(capabilities);
  }
  extractAdapterPriority(adapter) {
    var _a;
    return ((_a = adapter.metadata) == null ? void 0 : _a.priority) || 5;
  }
  sortAdaptersByPriority() {
    this.adapters.sort((a, b) => {
      const metricsA = this.adapterMetrics.get(a.name);
      const metricsB = this.adapterMetrics.get(b.name);
      const priorityA = (metricsA == null ? void 0 : metricsA.priority) || 5;
      const priorityB = (metricsB == null ? void 0 : metricsB.priority) || 5;
      return priorityB - priorityA;
    });
  }
  // Metrics update methods
  recordAdapterExecution(adapterName, responseTime, success) {
    const metrics = this.adapterMetrics.get(adapterName);
    if (!metrics)
      return;
    metrics.totalRequests++;
    if (success) {
      metrics.successfulRequests++;
    }
    metrics.averageResponseTime = (metrics.averageResponseTime * (metrics.totalRequests - 1) + responseTime) / metrics.totalRequests;
    metrics.lastUsed = Date.now();
  }
  updateAdapterLoad(adapterName, currentLoad) {
    const metrics = this.adapterMetrics.get(adapterName);
    if (metrics) {
      metrics.currentLoad = currentLoad;
    }
  }
  setRoutingStrategy(strategy) {
    this.routingStrategy = strategy;
    if (strategy === "round-robin") {
      this.roundRobinIndex = 0;
    }
  }
  getAdapterMetrics() {
    const result = {};
    for (const [name, metrics] of this.adapterMetrics) {
      result[name] = { ...metrics };
    }
    return result;
  }
  getRoutingStrategy() {
    return this.routingStrategy;
  }
};
var AdapterHealthMonitor = class {
  // 30 seconds
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.intervals = /* @__PURE__ */ new Map();
    this.HEALTH_CHECK_INTERVAL = 3e4;
  }
  startMonitoring(adapter) {
    this.stopMonitoring(adapter.name);
    const interval = setInterval(() => {
      this.checkAdapterHealth(adapter);
    }, this.HEALTH_CHECK_INTERVAL);
    this.intervals.set(adapter.name, interval);
  }
  stopMonitoring(adapterName) {
    const interval = this.intervals.get(adapterName);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(adapterName);
    }
  }
  async checkAdapterHealth(adapter) {
    try {
      const status = adapter.getStatus();
      if (!status.healthy) {
        this.eventBus.emit("adapter-health-warning", {
          adapterName: adapter.name,
          status,
          timestamp: Date.now()
        });
      }
    } catch (error) {
      this.eventBus.emit("adapter-health-error", {
        adapterName: adapter.name,
        error: error.message,
        timestamp: Date.now()
      });
    }
  }
  cleanup() {
    for (const [name, interval] of this.intervals) {
      clearInterval(interval);
    }
    this.intervals.clear();
  }
};

// plugins/editorial-engine/src/platform-manager.ts
var PlatformManager = class _PlatformManager {
  constructor() {
    this.plugins = /* @__PURE__ */ new Map();
  }
  static getInstance() {
    if (!_PlatformManager.instance) {
      _PlatformManager.instance = new _PlatformManager();
    }
    return _PlatformManager.instance;
  }
  registerPlugin(name, plugin, api) {
    this.plugins.set(name, { plugin, api });
    const platform = this.getPlatform();
    platform[name] = api;
    if (plugin.manifest) {
      platform.plugins[name] = {
        version: plugin.manifest.version,
        loaded: true,
        api
      };
    }
    console.log(`Registered ${name} plugin with platform API`);
  }
  unregisterPlugin(name) {
    if (this.plugins.has(name)) {
      this.plugins.delete(name);
      const platform = this.getPlatform();
      delete platform[name];
      if (platform.plugins[name]) {
        platform.plugins[name] = {
          version: "",
          loaded: false
        };
      }
      console.log(`Unregistered ${name} plugin from platform API`);
    }
  }
  getPlatform() {
    if (!window.Writerr) {
      this.createPlatform();
    }
    return window.Writerr;
  }
  getPlugin(name) {
    return this.plugins.get(name);
  }
  isPluginRegistered(name) {
    return this.plugins.has(name);
  }
  getAllPlugins() {
    return Array.from(this.plugins.keys());
  }
  createPlatform() {
    const platform = {
      version: "1.0.0",
      plugins: {}
    };
    window.Writerr = platform;
    console.log("Created Writerr platform object");
  }
  // Utility methods for cross-plugin communication
  async waitForPlugin(name, timeout = 1e4) {
    return new Promise((resolve, reject) => {
      const checkPlugin = () => {
        const plugin = this.plugins.get(name);
        if (plugin) {
          resolve(plugin.api);
          return;
        }
        setTimeout(checkPlugin, 100);
      };
      setTimeout(() => {
        reject(new Error(`Plugin ${name} not registered within ${timeout}ms`));
      }, timeout);
      checkPlugin();
    });
  }
  notifyPluginReady(name) {
    const platform = this.getPlatform();
    if (platform.events && typeof platform.events.emit === "function") {
      platform.events.emit("plugin-ready", { name });
    }
  }
};

// plugins/editorial-engine/src/performance-monitor.ts
var PerformanceMonitor = class {
  // Keep last 1000 request times
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      totalProcessingTime: 0,
      cacheHits: 0,
      cacheRequests: 0,
      requestTimes: [],
      adapterStats: /* @__PURE__ */ new Map()
    };
    this.MAX_REQUEST_TIMES = 1e3;
    this.setupEventListeners();
  }
  setupEventListeners() {
    this.eventBus.on("processing-completed", (data) => {
      this.recordRequest(data.result.processingTime, true);
    });
    this.eventBus.on("processing-failed", (data) => {
      this.recordRequest(0, false);
    });
    this.eventBus.on("adapter-execution-recorded", (data) => {
      this.recordAdapterExecution(
        data.adapterName,
        data.responseTime,
        data.success
      );
    });
    setInterval(() => {
      this.emitMetricsUpdate();
    }, 3e4);
  }
  recordRequest(processingTime, success) {
    this.metrics.totalRequests++;
    if (success) {
      this.metrics.successfulRequests++;
      this.metrics.totalProcessingTime += processingTime;
      this.metrics.requestTimes.push(processingTime);
      if (this.metrics.requestTimes.length > this.MAX_REQUEST_TIMES) {
        this.metrics.requestTimes.shift();
      }
    }
  }
  recordCacheHit() {
    this.metrics.cacheRequests++;
    this.metrics.cacheHits++;
  }
  recordCacheMiss() {
    this.metrics.cacheRequests++;
  }
  recordAdapterExecution(adapterName, responseTime, success) {
    if (!this.metrics.adapterStats.has(adapterName)) {
      this.metrics.adapterStats.set(adapterName, {
        requests: 0,
        successful: 0,
        totalTime: 0
      });
    }
    const stats = this.metrics.adapterStats.get(adapterName);
    stats.requests++;
    stats.totalTime += responseTime;
    if (success) {
      stats.successful++;
    }
  }
  getCurrentMetrics() {
    const avgProcessingTime = this.metrics.successfulRequests > 0 ? this.metrics.totalProcessingTime / this.metrics.successfulRequests : 0;
    const successRate = this.metrics.totalRequests > 0 ? this.metrics.successfulRequests / this.metrics.totalRequests : 0;
    const cacheHitRate = this.metrics.cacheRequests > 0 ? this.metrics.cacheHits / this.metrics.cacheRequests : 0;
    return {
      avgProcessingTime,
      successRate,
      totalRequests: this.metrics.totalRequests,
      cacheHitRate,
      lastUpdated: Date.now()
    };
  }
  getDetailedMetrics() {
    const basicMetrics = this.getCurrentMetrics();
    const timeDistribution = {
      fast: 0,
      medium: 0,
      slow: 0
    };
    for (const time of this.metrics.requestTimes) {
      if (time < 1e3) {
        timeDistribution.fast++;
      } else if (time < 5e3) {
        timeDistribution.medium++;
      } else {
        timeDistribution.slow++;
      }
    }
    const recentRequests = this.metrics.requestTimes.filter(
      (time) => time > Date.now() - 36e5
      // Last hour
    );
    const requestsPerMinute = recentRequests.length / 60;
    const adapterMetrics = {};
    for (const [name, stats] of this.metrics.adapterStats) {
      adapterMetrics[name] = {
        requests: stats.requests,
        successRate: stats.requests > 0 ? stats.successful / stats.requests : 0,
        avgResponseTime: stats.requests > 0 ? stats.totalTime / stats.requests : 0
      };
    }
    return {
      ...basicMetrics,
      requestsPerMinute,
      errorCount: this.metrics.totalRequests - this.metrics.successfulRequests,
      timeDistribution,
      adapterMetrics
    };
  }
  emitMetricsUpdate() {
    const metrics = this.getCurrentMetrics();
    this.eventBus.emit("performance-metrics-updated", { metrics });
  }
  // Memory usage tracking (if available)
  updateMemoryUsage() {
    if (typeof performance.memory !== "undefined") {
      const memInfo = performance.memory;
    }
  }
  // Reset metrics (useful for testing)
  reset() {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      totalProcessingTime: 0,
      cacheHits: 0,
      cacheRequests: 0,
      requestTimes: [],
      adapterStats: /* @__PURE__ */ new Map()
    };
  }
  cleanup() {
    this.reset();
  }
  // Export metrics for external monitoring
  exportMetrics() {
    const detailed = this.getDetailedMetrics();
    return JSON.stringify(detailed, null, 2);
  }
  // Alert thresholds
  checkThresholds() {
    const metrics = this.getCurrentMetrics();
    const alerts = [];
    const warnings = [];
    if (metrics.avgProcessingTime > 5e3) {
      alerts.push(`High average processing time: ${metrics.avgProcessingTime.toFixed(0)}ms`);
    } else if (metrics.avgProcessingTime > 2e3) {
      warnings.push(`Elevated processing time: ${metrics.avgProcessingTime.toFixed(0)}ms`);
    }
    if (metrics.successRate < 0.8) {
      alerts.push(`Low success rate: ${(metrics.successRate * 100).toFixed(1)}%`);
    } else if (metrics.successRate < 0.95) {
      warnings.push(`Reduced success rate: ${(metrics.successRate * 100).toFixed(1)}%`);
    }
    return { alerts, warnings };
  }
};

// plugins/editorial-engine/src/event-bus.ts
var WritterrEventBus = class {
  constructor() {
    this.handlers = /* @__PURE__ */ new Map();
    this.debugMode = false;
    this.errorCounts = /* @__PURE__ */ new Map();
    this.circuitBreakerThreshold = 5;
    this.disabledHandlers = /* @__PURE__ */ new Set();
  }
  emit(event, data) {
    if (this.debugMode) {
      console.debug(`[WritterrEventBus] Emitting: ${event}`, data);
    }
    if (this.disabledHandlers.has(event)) {
      if (this.debugMode) {
        console.warn(`[WritterrEventBus] Event ${event} is disabled due to circuit breaker`);
      }
      return;
    }
    const eventHandlers = this.handlers.get(event);
    if (eventHandlers) {
      const handlersArray = Array.from(eventHandlers);
      for (const handler of handlersArray) {
        try {
          setTimeout(() => {
            try {
              handler(data);
              this.resetErrorCount(event);
            } catch (error) {
              this.handleHandlerError(event, error, handler);
            }
          }, 0);
        } catch (error) {
          this.handleHandlerError(event, error, handler);
        }
      }
    }
  }
  on(event, handler) {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, /* @__PURE__ */ new Set());
    }
    this.handlers.get(event).add(handler);
    if (this.debugMode) {
      console.debug(`[WritterrEventBus] Registered handler for: ${event}`);
    }
  }
  off(event, handler) {
    const eventHandlers = this.handlers.get(event);
    if (eventHandlers) {
      eventHandlers.delete(handler);
      if (eventHandlers.size === 0) {
        this.handlers.delete(event);
      }
    }
  }
  once(event, handler) {
    const onceWrapper = (data) => {
      handler(data);
      this.off(event, onceWrapper);
    };
    this.on(event, onceWrapper);
  }
  cleanup() {
    this.handlers.clear();
    if (this.debugMode) {
      console.debug("[WritterrEventBus] Cleaned up all handlers");
    }
  }
  // Debug and monitoring methods
  setDebugMode(enabled) {
    this.debugMode = enabled;
  }
  getEventCounts() {
    const counts = {};
    for (const [event, handlers] of this.handlers) {
      counts[event] = handlers.size;
    }
    return counts;
  }
  getAllEvents() {
    return Array.from(this.handlers.keys());
  }
  hasListeners(event) {
    const handlers = this.handlers.get(event);
    return handlers ? handlers.size > 0 : false;
  }
  getListenerCount(event) {
    const handlers = this.handlers.get(event);
    return handlers ? handlers.size : 0;
  }
  removeAllListeners(event) {
    if (event) {
      this.handlers.delete(event);
    } else {
      this.handlers.clear();
    }
  }
  // Error isolation and circuit breaker methods
  handleHandlerError(event, error, handler) {
    console.error(`[WritterrEventBus] Error in handler for ${event}:`, error);
    const currentCount = this.errorCounts.get(event) || 0;
    const newCount = currentCount + 1;
    this.errorCounts.set(event, newCount);
    if (newCount >= this.circuitBreakerThreshold) {
      this.disabledHandlers.add(event);
      console.warn(`[WritterrEventBus] Event ${event} disabled due to repeated failures (${newCount} errors)`);
      if (event !== "system-error") {
        this.emit("system-error", {
          type: "circuit-breaker-activated",
          event,
          errorCount: newCount,
          timestamp: Date.now()
        });
      }
    }
  }
  resetErrorCount(event) {
    if (this.errorCounts.has(event)) {
      this.errorCounts.delete(event);
    }
  }
  // Circuit breaker management
  resetCircuitBreaker(event) {
    this.disabledHandlers.delete(event);
    this.errorCounts.delete(event);
    if (this.debugMode) {
      console.debug(`[WritterrEventBus] Circuit breaker reset for event: ${event}`);
    }
  }
  getCircuitBreakerStatus() {
    const status = {};
    for (const [event, count] of this.errorCounts) {
      status[event] = {
        errorCount: count,
        disabled: this.disabledHandlers.has(event)
      };
    }
    return status;
  }
  setCircuitBreakerThreshold(threshold) {
    this.circuitBreakerThreshold = Math.max(1, threshold);
  }
};

// plugins/editorial-engine/src/main.ts
var EditorialEnginePlugin = class extends import_obsidian2.Plugin {
  async onload() {
    console.log("Loading Editorial Engine plugin...");
    await this.loadSettings();
    this.eventBus = new WritterrEventBus();
    this.initializeComponents();
    this.setupPlatformAPI();
    await this.setupDefaultAdapters();
    this.addSettingTab(new EditorialEngineSettingsTab(this.app, this));
    this.addStatusBarItem().setText("\u{1F4DD} Editorial Engine Ready");
    this.eventBus.on("plugin-ready", async (data) => {
      if (data.name === "track-edits" && !this.adapterManager.getAdapter("track-edits")) {
        console.log("Track Edits plugin became available, registering adapter...");
        await this.setupDefaultAdapters();
      }
    });
    console.log("Editorial Engine plugin loaded successfully");
  }
  async onunload() {
    console.log("Unloading Editorial Engine plugin...");
    this.cleanupComponents();
    this.cleanupPlatformAPI();
    console.log("Editorial Engine plugin unloaded");
  }
  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }
  initializeComponents() {
    this.performanceMonitor = new PerformanceMonitor(this.eventBus);
    this.modeRegistry = new ModeRegistry(this.eventBus, this.settings);
    this.adapterManager = new AdapterManager(this.eventBus, this.settings);
    this.constraintProcessor = new ConstraintProcessor(
      this.modeRegistry,
      this.adapterManager,
      this.performanceMonitor,
      this.eventBus,
      this.settings
    );
    this.platformManager = new PlatformManager();
    this.loadDefaultModes();
    this.setupDefaultAdapters();
  }
  setupPlatformAPI() {
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
    this.platformManager.registerPlugin("editorial", this, this.api);
    if (!window.WriterrlAPI) {
      window.WriterrlAPI = {};
    }
    window.WriterrlAPI.editorialEngine = this.api;
    console.log("Editorial Engine API exposed to window.WriterrlAPI.editorialEngine");
    this.eventBus.emit("platform-ready", {
      plugin: "editorial-engine",
      api: this.api
    });
  }
  cleanupComponents() {
    if (this.performanceMonitor) {
      this.performanceMonitor.cleanup();
    }
    if (this.adapterManager) {
      this.adapterManager.cleanup();
    }
    if (this.eventBus) {
      this.eventBus.cleanup();
    }
  }
  cleanupPlatformAPI() {
    if (this.platformManager) {
      this.platformManager.unregisterPlugin("editorial");
    }
    if (window.WriterrlAPI && window.WriterrlAPI.editorialEngine) {
      delete window.WriterrlAPI.editorialEngine;
    }
  }
  async loadDefaultModes() {
    const modesFolder = ".obsidian/plugins/editorial-engine/modes";
    try {
      const folderExists = await this.app.vault.adapter.exists(modesFolder);
      if (!folderExists) {
        await this.app.vault.adapter.mkdir(modesFolder);
        console.log("Created Editorial Engine modes folder");
        await this.createExampleModeFiles(modesFolder);
      }
      const files = await this.app.vault.adapter.list(modesFolder);
      const modeFiles = files.files.filter((file) => file.endsWith(".md"));
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
      console.error("Failed to load modes from files, falling back to defaults:", error);
      await this.loadFallbackMode();
    }
  }
  async createExampleModeFiles(modesFolder) {
    const exampleModes = [
      {
        filename: "proofreader.md",
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
        filename: "copy-editor.md",
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
        filename: "my-custom-mode-template.md",
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
  parseModeFile(filePath, content) {
    var _a;
    try {
      const lines = content.split("\n");
      const modeId = ((_a = filePath.split("/").pop()) == null ? void 0 : _a.replace(".md", "")) || "unknown";
      let modeName = "";
      let description = "";
      const allowed = [];
      const forbidden = [];
      const focus = [];
      const boundaries = [];
      let currentSection = "";
      for (let line of lines) {
        line = line.trim();
        if (line.startsWith("# ") && !modeName) {
          modeName = line.substring(2).replace(" Mode", "").trim();
        }
        if (line.startsWith("**Description:**")) {
          description = line.replace("**Description:**", "").trim();
        }
        if (line.startsWith("## What I Can Do")) {
          currentSection = "allowed";
        } else if (line.startsWith("## What I Cannot Do")) {
          currentSection = "forbidden";
        } else if (line.startsWith("## Focus Areas")) {
          currentSection = "focus";
        } else if (line.startsWith("## Boundaries")) {
          currentSection = "boundaries";
        } else if (line.startsWith("## Examples") || line.startsWith("---")) {
          currentSection = "";
        }
        if (line.startsWith("- ") && currentSection) {
          const rule = line.substring(2).trim();
          switch (currentSection) {
            case "allowed":
              allowed.push(rule);
              break;
            case "forbidden":
              forbidden.push(rule);
              break;
            case "focus":
              focus.push(rule);
              break;
            case "boundaries":
              boundaries.push(rule);
              break;
          }
        }
      }
      if (!modeName || !description || allowed.length === 0) {
        console.warn(`Invalid mode file ${filePath}: missing required fields`);
        return null;
      }
      return {
        id: modeId,
        name: modeName,
        description,
        version: "1.0.0",
        author: "User Defined",
        naturalLanguageRules: {
          allowed,
          forbidden,
          focus,
          boundaries
        },
        examples: [],
        // Could be enhanced to parse examples from markdown
        constraints: [],
        // Will be compiled from natural language rules
        metadata: {
          category: "user-defined",
          difficulty: "custom",
          tags: [modeId],
          useCase: description
        }
      };
    } catch (error) {
      console.error(`Failed to parse mode file ${filePath}:`, error);
      return null;
    }
  }
  async loadFallbackMode() {
    const fallbackMode = {
      id: "basic-proofreader",
      name: "Basic Proofreader",
      description: "Basic grammar and spelling fixes",
      version: "1.0.0",
      author: "Writerr Platform",
      naturalLanguageRules: {
        allowed: ["Fix spelling and grammar errors"],
        forbidden: ["Don't change the author's voice"],
        focus: ["Focus on mechanical correctness"],
        boundaries: ["Make minimal necessary changes"]
      },
      examples: [],
      constraints: [],
      metadata: {
        category: "fallback",
        difficulty: "basic",
        tags: ["grammar"],
        useCase: "Emergency fallback mode"
      }
    };
    await this.modeRegistry.registerMode(fallbackMode);
    console.log("Loaded fallback proofreader mode");
  }
  async setupDefaultAdapters() {
    var _a;
    if ((_a = window.WriterrlAPI) == null ? void 0 : _a.trackEdits) {
      try {
        const { TrackEditsAdapter: TrackEditsAdapter2 } = await Promise.resolve().then(() => (init_track_edits_adapter(), track_edits_adapter_exports));
        const trackEditsAdapter = new TrackEditsAdapter2();
        await this.adapterManager.registerAdapter(trackEditsAdapter);
        console.log("Track Edits adapter registered successfully");
      } catch (error) {
        console.error("Failed to register Track Edits adapter:", error);
      }
    } else {
      console.log("Track Edits plugin not available, adapter registration skipped");
    }
    console.log("Editorial Engine adapter setup complete");
  }
  // Public API Methods
  async processRequest(intake) {
    try {
      this.eventBus.emit("processing-started", { intakeId: intake.id });
      const result = await this.constraintProcessor.process(intake);
      this.eventBus.emit("processing-completed", {
        intakeId: intake.id,
        result
      });
      return result;
    } catch (error) {
      this.eventBus.emit("processing-failed", {
        intakeId: intake.id,
        error: error.message
      });
      throw error;
    }
  }
  async registerMode(mode) {
    return await this.modeRegistry.registerMode(mode);
  }
  getModes() {
    return this.modeRegistry.getAllModes();
  }
  getEnabledModes() {
    const allModes = this.modeRegistry.getAllModes();
    return allModes.filter((mode) => this.settings.enabledModes.includes(mode.id));
  }
  getMode(id) {
    return this.modeRegistry.getMode(id);
  }
  registerAdapter(adapter) {
    this.adapterManager.registerAdapter(adapter);
  }
  getStatus() {
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
  getPerformanceMetrics() {
    return this.performanceMonitor.getDetailedMetrics();
  }
  // Utility method for other components
  emitEvent(event) {
    this.eventBus.emit(event.type, event.data);
  }
};
//# sourceMappingURL=main.js.map
