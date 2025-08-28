"use strict";
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

// plugins/token-count/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => TokenCountPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian2 = require("obsidian");

// plugins/token-count/src/TokenCalculator.ts
var TokenCalculator = class {
  /**
   * Calculate tokens for a specific model using appropriate tokenizer
   */
  calculateTokensForModel(text, modelName) {
    const normalizedText = text.trim();
    if (!normalizedText)
      return 0;
    const tokenizerType = this.getTokenizerType(modelName);
    switch (tokenizerType) {
      case "cl100k":
        return this.cl100kTokenizer(normalizedText);
      case "p50k":
        return this.p50kTokenizer(normalizedText);
      case "gemini":
        return this.geminiTokenizer(normalizedText);
      case "claude":
        return this.claudeTokenizer(normalizedText);
      default:
        return this.fallbackTokenizer(normalizedText);
    }
  }
  /**
   * Determine which tokenizer to use based on model name
   */
  getTokenizerType(modelName) {
    const modelLower = modelName.toLowerCase();
    if (modelLower.includes("gpt-4") || modelLower.includes("gpt-5") || modelLower.includes("gpt-4o") || modelLower.includes("o1") || modelLower.includes("o3") || modelLower.includes("o4")) {
      return "cl100k";
    }
    if (modelLower.includes("gpt-3") || modelLower.includes("davinci") || modelLower.includes("babbage") || modelLower.includes("curie")) {
      return "p50k";
    }
    if (modelLower.includes("gemini") || modelLower.includes("models/gemini")) {
      return "gemini";
    }
    if (modelLower.includes("claude")) {
      return "claude";
    }
    return "cl100k";
  }
  /**
   * cl100k_base tokenizer approximation for GPT-4/GPT-4o/GPT-5/o1/o3/o4
   * Most sophisticated tokenizer for modern OpenAI models
   */
  cl100kTokenizer(text) {
    let tokenCount = 0;
    const newlines = (text.match(/\n/g) || []).length;
    tokenCount += newlines;
    let processedText = text.replace(/\n/g, " ");
    const words = processedText.split(/\s+/).filter((word) => word.length > 0);
    for (const word of words) {
      if (/^[^\w\s]+$/.test(word)) {
        tokenCount += Math.ceil(word.length / 2);
      } else if (word.length <= 3) {
        tokenCount += 1;
      } else if (word.length <= 7) {
        tokenCount += Math.ceil(word.length / 4);
      } else {
        tokenCount += Math.ceil(word.length / 3.5);
      }
    }
    return Math.max(1, tokenCount);
  }
  /**
   * p50k_base tokenizer approximation for GPT-3.5 and older
   * Slightly less efficient than cl100k
   */
  p50kTokenizer(text) {
    const words = text.split(/\s+/).filter((word) => word.length > 0);
    let tokenCount = 0;
    for (const word of words) {
      if (word.length <= 4) {
        tokenCount += 1;
      } else {
        tokenCount += Math.ceil(word.length / 3.8);
      }
    }
    tokenCount += (text.match(/\n/g) || []).length;
    return Math.max(1, tokenCount);
  }
  /**
   * Google Gemini tokenizer approximation
   * Generally more efficient than GPT tokenizers
   */
  geminiTokenizer(text) {
    const words = text.split(/\s+/).filter((word) => word.length > 0);
    let tokenCount = 0;
    for (const word of words) {
      if (word.length <= 4) {
        tokenCount += 1;
      } else {
        tokenCount += Math.ceil(word.length / 4.2);
      }
    }
    tokenCount += (text.match(/\n/g) || []).length * 0.8;
    return Math.max(1, Math.ceil(tokenCount));
  }
  /**
   * Anthropic Claude tokenizer approximation
   * Similar efficiency to GPT-4 family
   */
  claudeTokenizer(text) {
    const words = text.split(/\s+/).filter((word) => word.length > 0);
    let tokenCount = 0;
    for (const word of words) {
      if (word.length <= 3) {
        tokenCount += 1;
      } else {
        tokenCount += Math.ceil(word.length / 3.7);
      }
    }
    tokenCount += (text.match(/\n/g) || []).length;
    return Math.max(1, tokenCount);
  }
  /**
   * Conservative fallback estimation for unknown models
   */
  fallbackTokenizer(text) {
    return Math.ceil(text.length / 4);
  }
  /**
   * Easy interface - auto-detect model or use fallback
   */
  estimateTokens(text, modelName) {
    if (!text)
      return 0;
    if (!modelName) {
      return this.fallbackTokenizer(text);
    }
    return this.calculateTokensForModel(text, modelName);
  }
};

// plugins/token-count/src/TokenLimitService.ts
var TokenLimitService = class {
  constructor(settings) {
    this.cache = /* @__PURE__ */ new Map();
    this.cacheExpiry = 0;
    this.settings = settings;
  }
  /**
   * Initialize service - fetch model data if needed
   */
  async initialize() {
    if (this.settings.enableDebugLogs) {
      console.log("\u{1F50D} Initializing TokenLimitService...");
    }
    this.loadFromCache();
    if (this.settings.enableExternalAPIs && !this.isDataFresh()) {
      try {
        await this.fetchModelLimits();
        if (this.settings.enableDebugLogs) {
          console.log("\u2705 Model data refreshed from external API");
        }
      } catch (error) {
        if (this.settings.enableDebugLogs) {
          console.warn("\u26A0\uFE0F Failed to fetch fresh model data, using cache:", error);
        }
      }
    } else if (this.settings.enableDebugLogs) {
      console.log("\u2705 Using cached model data or external APIs disabled");
    }
  }
  /**
   * Fetch fresh model data from configured API
   */
  async fetchModelLimits() {
    if (!this.settings.enableExternalAPIs) {
      throw new Error("External API calls are disabled in settings");
    }
    try {
      if (this.settings.enableDebugLogs) {
        console.log("\u{1F4E1} Fetching model limits from:", this.settings.apiEndpoint);
      }
      const response = await fetch(this.settings.apiEndpoint);
      if (!response.ok) {
        throw new Error(`API failed: ${response.status}`);
      }
      const data = await response.json();
      if (!data.data || !Array.isArray(data.data)) {
        throw new Error("Invalid response format from OpenRouter");
      }
      let processedCount = 0;
      for (const model of data.data) {
        if (model.context_length && model.id) {
          const modelInfo = {
            id: model.id,
            name: model.name || model.id,
            contextLength: model.context_length,
            pricing: model.pricing ? {
              prompt: model.pricing.prompt,
              completion: model.pricing.completion
            } : void 0
          };
          this.cache.set(model.id, modelInfo);
          this.cache.set(this.normalizeModelName(model.id), modelInfo);
          this.cache.set(this.normalizeModelName(model.name || model.id), modelInfo);
          processedCount++;
        }
      }
      const cacheDuration = this.settings.cacheExpiration * 60 * 60 * 1e3;
      this.cacheExpiry = Date.now() + cacheDuration;
      this.saveToCache();
      if (this.settings.enableDebugLogs) {
        console.log(`\u2705 Processed ${processedCount} models from API`);
      }
    } catch (error) {
      console.error("\u274C Failed to fetch model limits:", error);
      throw error;
    }
  }
  /**
   * Get token limit for a specific model
   */
  getTokenLimit(modelName) {
    if (!modelName)
      return null;
    const exact = this.cache.get(modelName);
    if (exact)
      return exact.contextLength;
    const normalized = this.cache.get(this.normalizeModelName(modelName));
    if (normalized)
      return normalized.contextLength;
    const fuzzyMatch = this.fuzzyMatch(modelName);
    if (fuzzyMatch)
      return fuzzyMatch.contextLength;
    return null;
  }
  /**
   * Get full model info including pricing
   */
  getModelInfo(modelName) {
    if (!modelName)
      return null;
    const exact = this.cache.get(modelName);
    if (exact)
      return exact;
    const normalized = this.cache.get(this.normalizeModelName(modelName));
    if (normalized)
      return normalized;
    return this.fuzzyMatch(modelName);
  }
  /**
   * Get all available models
   */
  getSupportedModels() {
    const uniqueModels = /* @__PURE__ */ new Map();
    for (const model of this.cache.values()) {
      uniqueModels.set(model.id, model);
    }
    return Array.from(uniqueModels.values()).sort((a, b) => a.name.localeCompare(b.name));
  }
  /**
   * Normalize model name for better matching
   */
  normalizeModelName(modelName) {
    return modelName.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  }
  /**
   * Fuzzy matching for common model name variations
   */
  fuzzyMatch(modelName) {
    const normalized = this.normalizeModelName(modelName);
    for (const [key, model] of this.cache.entries()) {
      const keyNormalized = this.normalizeModelName(key);
      if (keyNormalized.includes(normalized) || normalized.includes(keyNormalized)) {
        return model;
      }
    }
    return null;
  }
  /**
   * Check if cached data is still fresh
   */
  isDataFresh() {
    return this.cache.size > 0 && Date.now() < this.cacheExpiry;
  }
  /**
   * Save cache to localStorage
   */
  saveToCache() {
    try {
      const cacheData = {
        models: Array.from(this.cache.entries()),
        expiry: this.cacheExpiry
      };
      localStorage.setItem("token-count-cache", JSON.stringify(cacheData));
    } catch (error) {
      console.warn("Failed to save token cache:", error);
    }
  }
  /**
   * Load cache from localStorage
   */
  loadFromCache() {
    try {
      const cached = localStorage.getItem("token-count-cache");
      if (!cached)
        return;
      const cacheData = JSON.parse(cached);
      if (Date.now() > cacheData.expiry) {
        localStorage.removeItem("token-count-cache");
        return;
      }
      this.cache = new Map(cacheData.models);
      this.cacheExpiry = cacheData.expiry;
      console.log(`\u{1F4E6} Loaded ${this.cache.size} models from cache`);
    } catch (error) {
      console.warn("Failed to load token cache:", error);
      localStorage.removeItem("token-count-cache");
    }
  }
  /**
   * Force refresh of model data
   */
  async refresh() {
    this.cache.clear();
    this.cacheExpiry = 0;
    await this.fetchModelLimits();
  }
  /**
   * Update settings and potentially refresh data
   */
  updateSettings(settings) {
    this.settings = settings;
    const cacheDuration = this.settings.cacheExpiration * 60 * 60 * 1e3;
    this.cacheExpiry = Date.now() + cacheDuration;
  }
  /**
   * Get cache statistics
   */
  getCacheInfo() {
    return {
      modelCount: this.cache.size,
      isExpired: !this.isDataFresh(),
      expiresAt: new Date(this.cacheExpiry)
    };
  }
};

// plugins/token-count/src/TokenAPIService.ts
var TokenAPIService = class {
  constructor(tokenCalculator, tokenLimitService) {
    this.tokenCalculator = tokenCalculator;
    this.tokenLimitService = tokenLimitService;
  }
  /**
   * Analyze text for token usage - main API method
   */
  analyzeText(text, modelName) {
    if (!text) {
      return {
        tokenCount: 0,
        modelName: modelName || "unknown",
        tokenLimit: null,
        percentage: 0,
        estimatedCost: null,
        isEstimate: true
      };
    }
    const tokenCount = modelName ? this.tokenCalculator.calculateTokensForModel(text, modelName) : this.tokenCalculator.estimateTokens(text);
    const tokenLimit = modelName ? this.tokenLimitService.getTokenLimit(modelName) : null;
    const modelInfo = modelName ? this.tokenLimitService.getModelInfo(modelName) : null;
    const percentage = tokenLimit ? tokenCount / tokenLimit * 100 : 0;
    let estimatedCost = null;
    if (modelInfo == null ? void 0 : modelInfo.pricing) {
      estimatedCost = tokenCount / 1e3 * modelInfo.pricing.prompt;
    }
    return {
      tokenCount,
      modelName: modelName || "unknown",
      tokenLimit,
      percentage,
      estimatedCost,
      isEstimate: true
      // Always true for pre-request estimates
    };
  }
  /**
   * Get token limit for a specific model
   */
  getTokenLimit(modelName) {
    return this.tokenLimitService.getTokenLimit(modelName);
  }
  /**
   * Get full model information including pricing
   */
  getModelInfo(modelName) {
    return this.tokenLimitService.getModelInfo(modelName);
  }
  /**
   * Get list of all supported models
   */
  getSupportedModels() {
    return this.tokenLimitService.getSupportedModels();
  }
  /**
   * Calculate cost for a given number of tokens
   */
  calculateCost(tokens, modelName, completionTokens = 0) {
    const modelInfo = this.tokenLimitService.getModelInfo(modelName);
    if (!(modelInfo == null ? void 0 : modelInfo.pricing))
      return null;
    const promptTokens = tokens - completionTokens;
    const promptCost = promptTokens / 1e3 * modelInfo.pricing.prompt;
    const completionCost = completionTokens / 1e3 * modelInfo.pricing.completion;
    return promptCost + completionCost;
  }
  /**
   * Quick token count without model info
   */
  quickCount(text) {
    return this.tokenCalculator.estimateTokens(text);
  }
  /**
   * Refresh model data from external sources
   */
  async refreshModelData() {
    await this.tokenLimitService.refresh();
  }
  /**
   * Get cache information
   */
  getCacheInfo() {
    return this.tokenLimitService.getCacheInfo();
  }
};

// plugins/token-count/src/settings.ts
var import_obsidian = require("obsidian");
var DEFAULT_SETTINGS = {
  enableExternalAPIs: true,
  apiEndpoint: "https://openrouter.ai/api/v1/models",
  cacheExpiration: 24,
  fallbackMode: "unavailable",
  enableDebugLogs: false
};
var TokenCountSettingTab = class extends import_obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    var _a;
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Token Count Settings" });
    new import_obsidian.Setting(containerEl).setName("Enable external API calls").setDesc("Allow fetching model data from external sources. Disable for privacy or offline use.").addToggle((toggle) => toggle.setValue(this.plugin.settings.enableExternalAPIs).onChange(async (value) => {
      this.plugin.settings.enableExternalAPIs = value;
      await this.plugin.saveSettings();
      this.display();
    }));
    if (this.plugin.settings.enableExternalAPIs) {
      new import_obsidian.Setting(containerEl).setName("API endpoint").setDesc("URL for fetching model token limits. Default: OpenRouter API").addText((text) => text.setPlaceholder("https://openrouter.ai/api/v1/models").setValue(this.plugin.settings.apiEndpoint).onChange(async (value) => {
        this.plugin.settings.apiEndpoint = value || DEFAULT_SETTINGS.apiEndpoint;
        await this.plugin.saveSettings();
      }));
      new import_obsidian.Setting(containerEl).setName("Cache expiration").setDesc("Hours to cache model data before refreshing").addSlider((slider) => slider.setLimits(1, 168, 1).setValue(this.plugin.settings.cacheExpiration).setDynamicTooltip().onChange(async (value) => {
        this.plugin.settings.cacheExpiration = value;
        await this.plugin.saveSettings();
      }));
    }
    new import_obsidian.Setting(containerEl).setName("Fallback mode").setDesc("What to show when model token limits are unknown").addDropdown((dropdown) => dropdown.addOption("unavailable", 'Show "unavailable" (honest)').addOption("basic-estimates", "Show basic estimates (less accurate)").setValue(this.plugin.settings.fallbackMode).onChange(async (value) => {
      this.plugin.settings.fallbackMode = value;
      await this.plugin.saveSettings();
    }));
    new import_obsidian.Setting(containerEl).setName("Enable debug logging").setDesc("Show detailed logs in developer console (for troubleshooting)").addToggle((toggle) => toggle.setValue(this.plugin.settings.enableDebugLogs).onChange(async (value) => {
      this.plugin.settings.enableDebugLogs = value;
      await this.plugin.saveSettings();
    }));
    containerEl.createEl("h3", { text: "Cache Status" });
    const cacheInfo = (_a = this.plugin.api) == null ? void 0 : _a.getCacheInfo();
    if (cacheInfo) {
      const cacheDiv = containerEl.createEl("div", { cls: "token-cache-info" });
      cacheDiv.createEl("p", {
        text: `Models cached: ${cacheInfo.modelCount}`
      });
      cacheDiv.createEl("p", {
        text: `Cache expires: ${cacheInfo.expiresAt.toLocaleString()}`
      });
      if (cacheInfo.isExpired) {
        cacheDiv.createEl("p", {
          text: "\u26A0\uFE0F Cache is expired",
          cls: "token-cache-warning"
        });
      }
      new import_obsidian.Setting(containerEl).setName("Refresh model data").setDesc("Force refresh of model token limits from API").addButton((button) => button.setButtonText("Refresh Now").onClick(async () => {
        if (this.plugin.api) {
          try {
            button.setButtonText("Refreshing...");
            button.setDisabled(true);
            await this.plugin.api.refreshModelData();
            this.display();
          } catch (error) {
            console.error("Failed to refresh model data:", error);
            button.setButtonText("Refresh Failed");
            setTimeout(() => {
              button.setButtonText("Refresh Now");
              button.setDisabled(false);
            }, 2e3);
          }
        }
      }));
    }
  }
};

// plugins/token-count/main.ts
var TokenCountPlugin = class extends import_obsidian2.Plugin {
  async onload() {
    await this.loadSettings();
    if (this.settings.enableDebugLogs) {
      console.log("\u{1F522} Loading Token Count plugin...");
    }
    this.tokenCalculator = new TokenCalculator();
    this.tokenLimitService = new TokenLimitService(this.settings);
    try {
      await this.tokenLimitService.initialize();
    } catch (error) {
      if (this.settings.enableDebugLogs) {
        console.warn("Token Count: Failed to load model data:", error);
      }
    }
    this.api = new TokenAPIService(this.tokenCalculator, this.tokenLimitService);
    this.addSettingTab(new TokenCountSettingTab(this.app, this));
    if (this.settings.enableDebugLogs) {
      console.log("\u2705 Token Count plugin loaded successfully");
      const cacheInfo = this.api.getCacheInfo();
      console.log(`\u{1F4CA} Token Count: ${cacheInfo.modelCount} models loaded, expires: ${cacheInfo.expiresAt.toLocaleString()}`);
    }
  }
  onunload() {
    if (this.settings.enableDebugLogs) {
      console.log("\u{1F522} Token Count plugin unloaded");
    }
  }
  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }
  async saveSettings() {
    await this.saveData(this.settings);
    if (this.tokenLimitService) {
      this.tokenLimitService.updateSettings(this.settings);
    }
  }
};
//# sourceMappingURL=main.js.map
