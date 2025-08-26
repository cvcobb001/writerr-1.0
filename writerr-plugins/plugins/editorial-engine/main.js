var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
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
  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Editorial Engine Settings" });
    this.createGeneralSettings(containerEl);
    this.createModeSettings(containerEl);
    this.createAdapterSettings(containerEl);
    this.createPerformanceSettings(containerEl);
  }
  createGeneralSettings(containerEl) {
    containerEl.createEl("h3", { text: "General Settings" });
    new import_obsidian.Setting(containerEl).setName("Default Mode").setDesc("The default editing mode to use when no specific mode is selected").addDropdown((dropdown) => dropdown.addOption("proofreader", "Proofreader").addOption("copy-editor", "Copy Editor").addOption("developmental-editor", "Developmental Editor").setValue(this.plugin.settings.defaultMode).onChange(async (value) => {
      this.plugin.settings.defaultMode = value;
      await this.plugin.saveSettings();
    }));
    new import_obsidian.Setting(containerEl).setName("Strict Mode").setDesc("Enable strict constraint validation (recommended)").addToggle((toggle) => toggle.setValue(this.plugin.settings.constraintValidation.strictMode).onChange(async (value) => {
      this.plugin.settings.constraintValidation.strictMode = value;
      await this.plugin.saveSettings();
    }));
    new import_obsidian.Setting(containerEl).setName("Max Processing Time").setDesc("Maximum time (in seconds) to wait for processing completion").addSlider((slider) => slider.setLimits(5, 60, 5).setValue(this.plugin.settings.constraintValidation.maxProcessingTime / 1e3).setDynamicTooltip().onChange(async (value) => {
      this.plugin.settings.constraintValidation.maxProcessingTime = value * 1e3;
      await this.plugin.saveSettings();
    }));
  }
  createModeSettings(containerEl) {
    containerEl.createEl("h3", { text: "Mode Configuration" });
    const modesContainer = containerEl.createDiv("modes-container");
    modesContainer.style.cssText = `
      border: 1px solid var(--background-modifier-border);
      border-radius: 4px;
      padding: 15px;
      margin: 10px 0;
    `;
    const enabledModes = this.plugin.settings.enabledModes;
    const allModes = [
      { id: "proofreader", name: "Proofreader", desc: "Grammar, spelling, and basic clarity fixes" },
      { id: "copy-editor", name: "Copy Editor", desc: "Style, flow, and consistency improvements" },
      { id: "developmental-editor", name: "Developmental Editor", desc: "Structure and content development" },
      { id: "academic-mode", name: "Academic Mode", desc: "Academic writing standards and conventions" },
      { id: "business-mode", name: "Business Mode", desc: "Professional business communication" }
    ];
    for (const mode of allModes) {
      new import_obsidian.Setting(modesContainer).setName(mode.name).setDesc(mode.desc).addToggle((toggle) => toggle.setValue(enabledModes.includes(mode.id)).onChange(async (value) => {
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
  async parse(rule, ruleType) {
    const confidence = this.calculateConfidence(rule);
    const intent = this.extractIntent(rule);
    const parameters = this.extractParameters(rule);
    return {
      type: ruleType,
      intent,
      confidence,
      parameters
    };
  }
  calculateConfidence(rule) {
    let confidence = 0.5;
    const specificKeywords = [
      "grammar",
      "spelling",
      "punctuation",
      "voice",
      "tone",
      "style",
      "meaning",
      "content",
      "structure",
      "flow",
      "clarity"
    ];
    for (const keyword of specificKeywords) {
      if (rule.toLowerCase().includes(keyword)) {
        confidence += 0.1;
      }
    }
    if (rule.match(/\d+%/) || rule.match(/\d+\s*(words?|characters?)/)) {
      confidence += 0.2;
    }
    return Math.min(confidence, 1);
  }
  extractIntent(rule) {
    const rule_lower = rule.toLowerCase();
    if (rule_lower.includes("fix") || rule_lower.includes("correct")) {
      return "correction";
    }
    if (rule_lower.includes("improve") || rule_lower.includes("enhance")) {
      return "improvement";
    }
    if (rule_lower.includes("preserve") || rule_lower.includes("maintain")) {
      return "preservation";
    }
    if (rule_lower.includes("never") || rule_lower.includes("don't") || rule_lower.includes("avoid")) {
      return "prohibition";
    }
    return rule.trim();
  }
  extractParameters(rule) {
    const parameters = {};
    const percentageMatch = rule.match(/(\d+)%/);
    if (percentageMatch) {
      parameters.percentage = parseInt(percentageMatch[1]);
    }
    const countMatch = rule.match(/(\d+)\s*(words?|characters?)/i);
    if (countMatch) {
      parameters.count = parseInt(countMatch[1]);
      parameters.unit = countMatch[2].toLowerCase();
    }
    return parameters;
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
      const executionPlan = await this.createExecutionPlan(ruleset, intake);
      const results = await this.executeViaAdapters(executionPlan);
      const finalResult = await this.assembleResults(results, intake, startTime);
      await this.validateResults(finalResult, ruleset);
      return finalResult;
    } catch (error) {
      return this.createErrorResult(intake, error, startTime);
    }
  }
  async normalizeIntake(intake) {
    return {
      ...intake,
      instructions: intake.instructions.trim(),
      sourceText: intake.sourceText.trim()
    };
  }
  async recognizeIntent(intake) {
    const instructions = intake.instructions.toLowerCase();
    let type = "general-edit";
    let confidence = 0.8;
    if (instructions.includes("grammar") || instructions.includes("spelling")) {
      type = "grammar-check";
      confidence = 0.9;
    } else if (instructions.includes("style") || instructions.includes("improve")) {
      type = "style-enhancement";
      confidence = 0.85;
    } else if (instructions.includes("summarize") || instructions.includes("summary")) {
      type = "summarization";
      confidence = 0.95;
    }
    return {
      type,
      confidence,
      parameters: {
        originalInstructions: intake.instructions,
        textLength: intake.sourceText.length,
        mode: intake.mode
      }
    };
  }
  async compileConstraints(intent, mode) {
    return await this.compiler.compile(intent, mode);
  }
  async validateConstraints(ruleset) {
    const errors = [];
    if (!ruleset.constraints || ruleset.constraints.length === 0) {
      errors.push("No constraints defined");
    }
    if (ruleset.executionParams.timeout <= 0) {
      errors.push("Invalid timeout value");
    }
    return {
      valid: errors.length === 0,
      errors
    };
  }
  async createExecutionPlan(ruleset, intake) {
    return {
      id: `plan-${Date.now()}`,
      ruleset,
      intake,
      steps: [
        {
          type: "process-text",
          adapter: "track-edits",
          payload: {
            text: intake.sourceText,
            instructions: intake.instructions,
            constraints: ruleset.constraints
          }
        }
      ]
    };
  }
  async executeViaAdapters(executionPlan) {
    const results = [];
    for (const step of executionPlan.steps) {
      try {
        const result = await this.adapterManager.execute({
          id: `job-${Date.now()}`,
          type: step.type,
          payload: step.payload,
          constraints: executionPlan.ruleset.constraints,
          context: executionPlan.intake.context,
          timeout: executionPlan.ruleset.executionParams.timeout
        });
        results.push(result);
      } catch (error) {
        console.error("Adapter execution failed:", error);
        results.push({
          success: false,
          error: error.message,
          data: null
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
      changes.push({
        id: `change-${Date.now()}`,
        type: "replace",
        range: { start: 0, end: intake.sourceText.length },
        originalText: intake.sourceText,
        newText: intake.sourceText,
        // Placeholder - actual processing would modify this
        confidence: 0.85,
        reasoning: `Applied ${intake.mode} mode constraints`,
        source: "editorial-engine",
        timestamp: Date.now()
      });
    }
    const provenance = {
      steps: [
        {
          stage: "constraint-processing",
          input: intake,
          output: results,
          processingTime,
          adapter: "editorial-engine"
        }
      ],
      totalTime: processingTime
    };
    const summary = {
      totalChanges: changes.length,
      changeSummary: { "replace": changes.length },
      confidence: 0.85,
      warnings: []
    };
    return {
      id: `result-${Date.now()}`,
      intakeId: intake.id,
      success: hasSuccessfulResult,
      processingTime,
      changes,
      conflicts: [],
      provenance,
      summary,
      metadata: {
        mode: intake.mode,
        adapterResults: results.length
      }
    };
  }
  async validateResults(result, ruleset) {
    if (this.settings.constraintValidation.strictMode) {
      if (result.changes.length > 100) {
        throw new Error("Too many changes - possible constraint violation");
      }
      if (result.processingTime > this.settings.constraintValidation.maxProcessingTime) {
        console.warn(`Processing time exceeded limit: ${result.processingTime}ms`);
      }
    }
  }
  createErrorResult(intake, error, startTime) {
    return {
      id: `error-result-${Date.now()}`,
      intakeId: intake.id,
      success: false,
      processingTime: performance.now() - startTime,
      changes: [],
      conflicts: [],
      provenance: {
        steps: [{
          stage: "error",
          input: intake,
          output: { error: error.message },
          processingTime: performance.now() - startTime
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
        mode: intake.mode
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
  }
  async registerMode(mode) {
    const validation = await this.validateMode(mode);
    if (!validation.valid) {
      throw new Error(`Mode validation failed: ${validation.errors.join(", ")}`);
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
  removeMode(id) {
    if (this.modes.has(id)) {
      const mode = this.modes.get(id);
      this.modes.delete(id);
      this.eventBus.emit("mode-removed", { modeId: id, mode });
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
        throw new Error(`No suitable adapter found for job type: ${job.type}`);
      }
      let lastError = null;
      for (const adapter of suitableAdapters) {
        try {
          const result = await this.executeWithAdapter(adapter, job);
          this.recordExecution(adapter.name, true, performance.now() - startTime);
          return result;
        } catch (error) {
          console.warn(`Adapter ${adapter.name} failed for job ${job.id}:`, error);
          lastError = error;
          this.recordExecution(adapter.name, false, performance.now() - startTime);
        }
      }
      throw lastError || new Error("All suitable adapters failed");
    } catch (error) {
      this.eventBus.emit("adapter-execution-failed", {
        jobId: job.id,
        error: error.message
      });
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
  constructor() {
    this.adapters = [];
  }
  registerAdapter(adapter) {
    this.adapters.push(adapter);
    this.adapters.sort((a, b) => {
      return 0;
    });
  }
  findSuitableAdapters(job) {
    return this.adapters.filter((adapter) => {
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
      return true;
    });
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
  }
  emit(event, data) {
    if (this.debugMode) {
      console.debug(`[WritterrEventBus] Emitting: ${event}`, data);
    }
    const eventHandlers = this.handlers.get(event);
    if (eventHandlers) {
      const handlersArray = Array.from(eventHandlers);
      for (const handler of handlersArray) {
        try {
          handler(data);
        } catch (error) {
          console.error(`[WritterrEventBus] Error in handler for ${event}:`, error);
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
};

// plugins/editorial-engine/src/main.ts
var EditorialEnginePlugin = class extends import_obsidian2.Plugin {
  async onload() {
    console.log("Loading Editorial Engine plugin...");
    await this.loadSettings();
    this.eventBus = new WritterrEventBus();
    this.initializeComponents();
    this.setupPlatformAPI();
    this.addSettingTab(new EditorialEngineSettingsTab(this.app, this));
    this.addStatusBarItem().setText("\u{1F4DD} Editorial Engine Ready");
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
      getMode: this.getMode.bind(this),
      registerAdapter: this.registerAdapter.bind(this),
      getStatus: this.getStatus.bind(this),
      getPerformanceMetrics: this.getPerformanceMetrics.bind(this)
    };
    this.platformManager.registerPlugin("editorial", this, this.api);
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
  }
  async loadDefaultModes() {
    const defaultModes = [
      {
        id: "proofreader",
        name: "Proofreader",
        description: "Fix grammar, spelling, and basic clarity issues",
        version: "1.0.0",
        author: "Writerr Platform",
        naturalLanguageRules: {
          allowed: [
            "Fix spelling and grammar errors",
            "Correct punctuation mistakes",
            "Fix basic clarity issues",
            "Standardize formatting"
          ],
          forbidden: [
            "Never change the author's voice or style",
            "Don't alter the meaning or intent",
            "Don't rewrite sentences unless grammatically incorrect",
            "Don't change technical terminology"
          ],
          focus: [
            "Focus on mechanical correctness",
            "Preserve original phrasing when possible",
            "Make minimal necessary changes"
          ],
          boundaries: [
            "Change no more than 10% of the original text",
            "Keep changes at word or phrase level",
            "Maintain original sentence structure"
          ]
        },
        examples: [
          {
            input: "The quick brown fox jump over the lazy dog.",
            expectedBehavior: 'Fix "jump" to "jumps" for subject-verb agreement',
            shouldNotDo: `Don't rewrite as "A fast brown fox leaps over the sleepy dog"`,
            explanation: "Only fix the grammatical error, preserve original style"
          }
        ],
        constraints: [],
        metadata: {
          category: "basic-editing",
          difficulty: "beginner",
          tags: ["grammar", "spelling", "proofreading"],
          useCase: "Final review before publishing"
        }
      },
      {
        id: "copy-editor",
        name: "Copy Editor",
        description: "Improve style, flow, and consistency while preserving voice",
        version: "1.0.0",
        author: "Writerr Platform",
        naturalLanguageRules: {
          allowed: [
            "Improve sentence flow and rhythm",
            "Enhance clarity and conciseness",
            "Fix consistency issues",
            "Suggest better word choices",
            "Improve paragraph transitions"
          ],
          forbidden: [
            "Don't change the author's fundamental voice",
            "Don't alter factual content or arguments",
            "Don't impose a different writing style",
            "Don't change specialized terminology"
          ],
          focus: [
            "Focus on readability and flow",
            "Improve sentence variety",
            "Enhance overall coherence"
          ],
          boundaries: [
            "Change no more than 25% of the original text",
            "Preserve key phrases and expressions",
            "Maintain the document's tone and purpose"
          ]
        },
        examples: [],
        constraints: [],
        metadata: {
          category: "style-editing",
          difficulty: "intermediate",
          tags: ["style", "flow", "consistency"],
          useCase: "Improving published drafts"
        }
      },
      {
        id: "developmental-editor",
        name: "Developmental Editor",
        description: "Enhance structure, argumentation, and content development",
        version: "1.0.0",
        author: "Writerr Platform",
        naturalLanguageRules: {
          allowed: [
            "Suggest structural improvements",
            "Recommend content additions",
            "Identify gaps in argumentation",
            "Propose better organization",
            "Enhance logical flow between ideas"
          ],
          forbidden: [
            "Don't rewrite the author's content",
            "Don't change the fundamental argument",
            "Don't impose different viewpoints",
            "Don't make changes without explanation"
          ],
          focus: [
            "Focus on big-picture structure",
            "Improve logical progression",
            "Enhance content effectiveness"
          ],
          boundaries: [
            "Suggest rather than directly change",
            "Provide explanations for recommendations",
            "Preserve the author's intentions"
          ]
        },
        examples: [],
        constraints: [],
        metadata: {
          category: "content-editing",
          difficulty: "advanced",
          tags: ["structure", "development", "argumentation"],
          useCase: "Early draft improvement"
        }
      }
    ];
    for (const mode of defaultModes) {
      try {
        await this.modeRegistry.registerMode(mode);
      } catch (error) {
        console.error(`Failed to register default mode ${mode.id}:`, error);
      }
    }
  }
  setupDefaultAdapters() {
    console.log("Editorial Engine ready for adapter registration");
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
