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

// plugins/ai-editorial-functions/src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => AIEditorialFunctionsPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian2 = require("obsidian");

// plugins/ai-editorial-functions/src/settings.ts
var import_obsidian = require("obsidian");
var AIEditorialFunctionsSettingsTab = class extends import_obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "AI Editorial Functions Settings" });
    new import_obsidian.Setting(containerEl).setName("Current writing mode").setDesc("Choose the active writing mode for context-aware functions").addDropdown((dropdown) => dropdown.addOption("general", "General Writing").addOption("academic", "Academic Writing").addOption("business", "Business Writing").addOption("fiction", "Fiction Writing").addOption("technical", "Technical Writing").setValue(this.plugin.settings.currentMode).onChange(async (value) => {
      this.plugin.settings.currentMode = value;
      await this.plugin.saveSettings();
    }));
    containerEl.createEl("h3", { text: "Interface" });
    new import_obsidian.Setting(containerEl).setName("Enable quick access").setDesc("Add editorial functions to the context menu when text is selected").addToggle((toggle) => toggle.setValue(this.plugin.settings.enableQuickAccess).onChange(async (value) => {
      this.plugin.settings.enableQuickAccess = value;
      await this.plugin.saveSettings();
    }));
    new import_obsidian.Setting(containerEl).setName("Show category icons").setDesc("Display category icons in function menus").addToggle((toggle) => toggle.setValue(this.plugin.settings.showCategoryIcons).onChange(async (value) => {
      this.plugin.settings.showCategoryIcons = value;
      await this.plugin.saveSettings();
    }));
    new import_obsidian.Setting(containerEl).setName("Confirm before applying").setDesc("Show a preview before applying editorial changes").addToggle((toggle) => toggle.setValue(this.plugin.settings.confirmBeforeApply).onChange(async (value) => {
      this.plugin.settings.confirmBeforeApply = value;
      await this.plugin.saveSettings();
    }));
    new import_obsidian.Setting(containerEl).setName("Auto-apply formatting").setDesc("Automatically apply basic formatting fixes (punctuation, spacing)").addToggle((toggle) => toggle.setValue(this.plugin.settings.autoApplyFormatting).onChange(async (value) => {
      this.plugin.settings.autoApplyFormatting = value;
      await this.plugin.saveSettings();
    }));
    containerEl.createEl("h3", { text: "Available Functions by Category" });
    const categories = [
      {
        name: "Academic",
        key: "academic",
        functions: [
          "Argument Structure Analysis",
          "Citation Formatting",
          "Thesis Statement Enhancement",
          "Academic Tone Adjustment",
          "Literature Review Synthesis"
        ]
      },
      {
        name: "Business",
        key: "business",
        functions: [
          "Executive Summary Creation",
          "Professional Tone Enhancement",
          "Action Item Extraction",
          "Meeting Notes Formatting",
          "Proposal Structure"
        ]
      },
      {
        name: "Fiction",
        key: "fiction",
        functions: [
          "Dialogue Enhancement",
          "Character Development",
          "Narrative Flow Improvement",
          "Setting Description",
          "Pacing Analysis"
        ]
      },
      {
        name: "Technical",
        key: "technical",
        functions: [
          "API Documentation",
          "Code Comment Enhancement",
          "Technical Specification",
          "Troubleshooting Guide",
          "User Manual Creation"
        ]
      }
    ];
    for (const category of categories) {
      const categoryEl = containerEl.createEl("div", { cls: "function-category-info" });
      categoryEl.style.cssText = `
        margin: 15px 0;
        padding: 15px;
        background: var(--background-secondary);
        border-radius: 6px;
      `;
      categoryEl.createEl("h4", { text: category.name });
      const functionList = categoryEl.createEl("ul");
      functionList.style.cssText = `
        margin: 8px 0 0 20px;
        color: var(--text-muted);
      `;
      for (const func of category.functions) {
        functionList.createEl("li", { text: func });
      }
    }
    containerEl.createEl("h3", { text: "Custom Functions" });
    const customFunctionsNote = containerEl.createEl("div", { cls: "setting-note" });
    customFunctionsNote.style.cssText = `
      padding: 10px;
      background: var(--background-modifier-form-field);
      border-radius: 4px;
      font-style: italic;
      color: var(--text-muted);
    `;
    customFunctionsNote.textContent = "Custom function creation will be available in a future update. Stay tuned!";
    containerEl.createEl("h3", { text: "Usage Tips" });
    const tipsContainer = containerEl.createEl("div", { cls: "usage-tips" });
    tipsContainer.style.cssText = `
      background: var(--background-secondary);
      padding: 15px;
      border-radius: 6px;
      margin: 10px 0;
    `;
    const tips = [
      "Select text and right-click to access quick editorial functions",
      'Use Ctrl/Cmd + P to search for "editorial" commands',
      "Switch writing modes to get context-appropriate suggestions",
      "The status bar shows your current writing mode",
      "Use the ribbon icon to access all available functions"
    ];
    const tipsList = tipsContainer.createEl("ul");
    for (const tip of tips) {
      tipsList.createEl("li", { text: tip });
    }
    containerEl.createEl("h3", { text: "Keyboard Shortcuts" });
    const shortcutsContainer = containerEl.createEl("div", { cls: "keyboard-shortcuts" });
    shortcutsContainer.style.cssText = `
      background: var(--background-secondary);
      padding: 15px;
      border-radius: 6px;
      margin: 10px 0;
    `;
    const shortcuts = [
      { command: "Quick edit selection", shortcut: "Set in Hotkeys settings" },
      { command: "Show function menu", shortcut: "Set in Hotkeys settings" },
      { command: "Improve clarity", shortcut: "Set in Hotkeys settings" },
      { command: "Fix grammar", shortcut: "Set in Hotkeys settings" }
    ];
    const shortcutTable = shortcutsContainer.createEl("table");
    shortcutTable.style.cssText = `
      width: 100%;
      border-collapse: collapse;
    `;
    const headerRow = shortcutTable.createEl("tr");
    headerRow.createEl("th", { text: "Command" }).style.cssText = "text-align: left; padding: 8px; border-bottom: 1px solid var(--background-modifier-border);";
    headerRow.createEl("th", { text: "Shortcut" }).style.cssText = "text-align: left; padding: 8px; border-bottom: 1px solid var(--background-modifier-border);";
    for (const shortcut of shortcuts) {
      const row = shortcutTable.createEl("tr");
      row.createEl("td", { text: shortcut.command }).style.cssText = "padding: 6px 8px;";
      row.createEl("td", { text: shortcut.shortcut }).style.cssText = "padding: 6px 8px; color: var(--text-muted); font-style: italic;";
    }
    const shortcutsNote = shortcutsContainer.createEl("p", {
      text: 'Go to Settings \u2192 Hotkeys and search for "AI Editorial" to set custom keyboard shortcuts.'
    });
    shortcutsNote.style.cssText = "margin-top: 10px; font-size: 0.9em; color: var(--text-muted);";
  }
};

// plugins/ai-editorial-functions/src/function-manager.ts
var FunctionManager = class {
  constructor(plugin) {
    this.plugin = plugin;
    this.initializeBuiltInFunctions();
  }
  initializeBuiltInFunctions() {
    this.builtInFunctions = [
      // Academic Functions
      {
        id: "improve-argument-structure",
        name: "Improve Argument Structure",
        description: "Analyze and enhance the logical flow and structure of academic arguments",
        category: "academic",
        prompt: "Analyze the argument structure in this text and improve its logical flow, clarity, and persuasiveness. Maintain academic tone and add transitions where needed:"
      },
      {
        id: "enhance-citation-format",
        name: "Enhance Citations",
        description: "Improve citation formatting and integration within academic text",
        category: "academic",
        prompt: "Review and improve the citation formatting and integration in this text. Ensure proper academic style and smooth integration with the surrounding text:"
      },
      {
        id: "strengthen-thesis",
        name: "Strengthen Thesis",
        description: "Enhance thesis statement clarity, specificity, and argumentative power",
        category: "academic",
        prompt: "Strengthen this thesis statement by making it more specific, clear, and arguable. Ensure it clearly states the main argument and previews supporting points:"
      },
      {
        id: "academic-tone-adjustment",
        name: "Academic Tone Adjustment",
        description: "Adjust text to match appropriate academic tone and style",
        category: "academic",
        prompt: "Adjust this text to match appropriate academic tone and style. Make it more formal, precise, and scholarly while maintaining readability:"
      },
      // Business Functions
      {
        id: "create-executive-summary",
        name: "Create Executive Summary",
        description: "Generate a concise executive summary from detailed business content",
        category: "business",
        prompt: "Create a concise executive summary from this content. Focus on key points, decisions, and action items that executives need to know:"
      },
      {
        id: "enhance-professional-tone",
        name: "Enhance Professional Tone",
        description: "Improve professional tone and business communication style",
        category: "business",
        prompt: "Enhance the professional tone of this text. Make it more polished, confident, and appropriate for business communication:"
      },
      {
        id: "extract-action-items",
        name: "Extract Action Items",
        description: "Identify and format action items and next steps from business content",
        category: "business",
        prompt: "Extract and clearly format all action items, next steps, and deliverables from this text. Present them as a bulleted list with responsible parties and deadlines where mentioned:"
      },
      {
        id: "format-meeting-notes",
        name: "Format Meeting Notes",
        description: "Structure and format meeting notes for clarity and actionability",
        category: "business",
        prompt: "Structure and format these meeting notes. Organize by agenda items, highlight decisions made, action items, and next steps:"
      },
      // Fiction Functions
      {
        id: "enhance-dialogue",
        name: "Enhance Dialogue",
        description: "Improve dialogue naturalness, character voice, and dramatic effect",
        category: "fiction",
        prompt: "Enhance this dialogue to make it more natural, distinctive to each character, and dramatically effective. Improve rhythm, subtext, and character voice:"
      },
      {
        id: "develop-character",
        name: "Develop Character",
        description: "Enhance character development and personality in narrative text",
        category: "fiction",
        prompt: "Enhance the character development in this text. Make the characters more vivid, complex, and distinctive through actions, dialogue, and internal thoughts:"
      },
      {
        id: "improve-narrative-flow",
        name: "Improve Narrative Flow",
        description: "Enhance pacing, transitions, and narrative momentum",
        category: "fiction",
        prompt: "Improve the narrative flow of this text. Enhance pacing, smooth transitions between scenes, and maintain reader engagement throughout:"
      },
      {
        id: "enhance-setting-description",
        name: "Enhance Setting Description",
        description: "Improve scene setting and atmospheric description",
        category: "fiction",
        prompt: "Enhance the setting description in this text. Make it more vivid and atmospheric while using sensory details to immerse the reader:"
      },
      // Technical Functions
      {
        id: "improve-api-documentation",
        name: "Improve API Documentation",
        description: "Enhance API documentation clarity, completeness, and usability",
        category: "technical",
        prompt: "Improve this API documentation. Make it clearer, more complete, and easier to understand. Include proper parameter descriptions, examples, and error handling:"
      },
      {
        id: "enhance-code-comments",
        name: "Enhance Code Comments",
        description: "Improve code comments for clarity and maintainability",
        category: "technical",
        prompt: "Enhance these code comments to make them clearer and more helpful for future developers. Explain the why behind complex logic:"
      },
      {
        id: "create-technical-spec",
        name: "Create Technical Specification",
        description: "Generate comprehensive technical specifications from requirements",
        category: "technical",
        prompt: "Create a comprehensive technical specification from this content. Include system requirements, architecture decisions, and implementation details:"
      },
      {
        id: "improve-troubleshooting-guide",
        name: "Improve Troubleshooting Guide",
        description: "Enhance troubleshooting documentation with clear steps and solutions",
        category: "technical",
        prompt: "Improve this troubleshooting guide. Make the steps clearer, add common solutions, and organize by problem severity:"
      },
      // General Functions (available in all modes)
      {
        id: "improve-clarity",
        name: "Improve Clarity",
        description: "Enhance text clarity and readability",
        category: "academic",
        // Default category, but available in all modes
        prompt: "Improve the clarity and readability of this text. Make it easier to understand while preserving the original meaning and tone:"
      },
      {
        id: "fix-grammar",
        name: "Fix Grammar",
        description: "Correct grammatical errors and improve sentence structure",
        category: "academic",
        prompt: "Fix any grammatical errors in this text and improve sentence structure while maintaining the original style and meaning:"
      },
      {
        id: "enhance-style",
        name: "Enhance Writing Style",
        description: "Improve overall writing style and flow",
        category: "academic",
        prompt: "Enhance the writing style of this text. Improve flow, vary sentence structure, and make it more engaging while maintaining appropriateness for the context:"
      },
      {
        id: "summarize",
        name: "Summarize",
        description: "Create a concise summary of the selected text",
        category: "academic",
        prompt: "Create a concise summary of this text. Capture the main points and key information in a shorter, more digestible format:"
      },
      {
        id: "expand-ideas",
        name: "Expand Ideas",
        description: "Develop and elaborate on ideas in the selected text",
        category: "academic",
        prompt: "Expand and elaborate on the ideas in this text. Add more depth, examples, and supporting details while maintaining coherence:"
      }
    ];
  }
  getFunctions(category) {
    const allFunctions = [...this.builtInFunctions, ...this.plugin.settings.customFunctions];
    if (category) {
      return allFunctions.filter((f) => f.category === category);
    }
    return allFunctions;
  }
  getFunction(functionId) {
    const allFunctions = [...this.builtInFunctions, ...this.plugin.settings.customFunctions];
    return allFunctions.find((f) => f.id === functionId);
  }
  async executeFunction(functionId, text, parameters) {
    const func = this.getFunction(functionId);
    if (!func) {
      throw new Error(`Function '${functionId}' not found`);
    }
    return await this.executeWithPrompt(func.prompt, text, parameters);
  }
  async executeCustomPrompt(text, customPrompt) {
    return await this.executeWithPrompt(customPrompt, text);
  }
  async executeWithPrompt(prompt, text, parameters) {
    var _a;
    if (!((_a = window.WriterrlAPI) == null ? void 0 : _a.chat)) {
      throw new Error("Writerr Chat plugin is required for AI editorial functions. Please install and configure the Writerr Chat plugin.");
    }
    try {
      const fullPrompt = this.buildFullPrompt(prompt, text, parameters);
      const response = await this.sendToAI(fullPrompt);
      return this.extractEditedText(response, text);
    } catch (error) {
      console.error("Error executing editorial function:", error);
      throw new Error(`Failed to process text: ${error.message}`);
    }
  }
  buildFullPrompt(basePrompt, text, parameters) {
    let fullPrompt = basePrompt;
    const currentMode = this.plugin.getCurrentMode();
    if (currentMode) {
      fullPrompt += `

Context: This is ${currentMode.name.toLowerCase()} writing. ${currentMode.description}`;
    }
    if (parameters && Object.keys(parameters).length > 0) {
      fullPrompt += "\n\nAdditional parameters:";
      for (const [key, value] of Object.entries(parameters)) {
        fullPrompt += `
- ${key}: ${value}`;
      }
    }
    fullPrompt += `

Text to edit:

${text}

Please provide only the improved text without additional commentary.`;
    return fullPrompt;
  }
  async sendToAI(prompt) {
    await new Promise((resolve) => setTimeout(resolve, 1e3));
    throw new Error("AI provider not implemented yet. This is a placeholder for the actual AI integration.");
  }
  extractEditedText(aiResponse, originalText) {
    return aiResponse.trim();
  }
  // Utility methods for function management
  addCustomFunction(func) {
    if (this.getFunction(func.id)) {
      throw new Error(`Function with ID '${func.id}' already exists`);
    }
    this.plugin.settings.customFunctions.push(func);
    this.plugin.saveSettings();
  }
  removeCustomFunction(functionId) {
    const index = this.plugin.settings.customFunctions.findIndex((f) => f.id === functionId);
    if (index === -1)
      return false;
    this.plugin.settings.customFunctions.splice(index, 1);
    this.plugin.saveSettings();
    return true;
  }
  getFunctionsByCurrentMode() {
    const currentMode = this.plugin.getCurrentMode();
    if (!currentMode) {
      return this.getFunctions();
    }
    const modeFunctions = this.getFunctions(currentMode.category);
    const generalFunctions = ["improve-clarity", "fix-grammar", "enhance-style", "summarize", "expand-ideas"];
    const generalFuncs = this.builtInFunctions.filter((f) => generalFunctions.includes(f.id));
    return [...modeFunctions, ...generalFuncs];
  }
};

// plugins/ai-editorial-functions/src/mode-manager.ts
var ModeManager = class {
  constructor(plugin) {
    this.plugin = plugin;
    this.initializeBuiltInModes();
  }
  initializeBuiltInModes() {
    this.builtInModes = [
      {
        id: "general",
        name: "General Writing",
        description: "General purpose writing with focus on clarity and readability",
        category: "academic",
        // Default category
        systemPrompt: "You are a helpful writing assistant focused on improving clarity, grammar, and overall readability. Maintain the author's voice and intent while making the text clearer and more engaging.",
        functions: []
      },
      {
        id: "academic",
        name: "Academic Writing",
        description: "Scholarly writing with emphasis on argument structure, evidence, and formal tone",
        category: "academic",
        systemPrompt: "You are an academic writing specialist. Focus on improving argument structure, evidence presentation, citation integration, and maintaining appropriate scholarly tone. Ensure logical flow and rigorous analysis.",
        functions: []
      },
      {
        id: "business",
        name: "Business Writing",
        description: "Professional communication with focus on clarity, action items, and business outcomes",
        category: "business",
        systemPrompt: "You are a business communication expert. Focus on professional tone, clear action items, executive-level clarity, and outcome-oriented language. Make content scannable and actionable.",
        functions: []
      },
      {
        id: "fiction",
        name: "Fiction Writing",
        description: "Creative writing with emphasis on character development, dialogue, and narrative flow",
        category: "fiction",
        systemPrompt: "You are a fiction writing coach. Focus on character development, dialogue naturalness, narrative pacing, setting description, and reader engagement. Enhance dramatic effect and emotional impact.",
        functions: []
      },
      {
        id: "technical",
        name: "Technical Writing",
        description: "Technical documentation with focus on accuracy, completeness, and user guidance",
        category: "technical",
        systemPrompt: "You are a technical writing specialist. Focus on accuracy, completeness, step-by-step clarity, and user-centered documentation. Ensure technical concepts are explained clearly for the target audience.",
        functions: []
      }
    ];
  }
  getModes(category) {
    const allModes = [...this.builtInModes, ...this.plugin.settings.customModes];
    if (category) {
      return allModes.filter((m) => m.category === category);
    }
    return allModes;
  }
  getMode(modeId) {
    const allModes = [...this.builtInModes, ...this.plugin.settings.customModes];
    return allModes.find((m) => m.id === modeId) || null;
  }
  getCurrentMode() {
    return this.getMode(this.plugin.settings.currentMode);
  }
  setMode(modeId) {
    const mode = this.getMode(modeId);
    if (!mode)
      return false;
    this.plugin.settings.currentMode = modeId;
    this.plugin.saveSettings();
    return true;
  }
  getModeSystemPrompt(modeId) {
    const mode = this.getMode(modeId);
    return mode ? mode.systemPrompt : this.builtInModes[0].systemPrompt;
  }
  getModeFunctions(modeId) {
    const mode = this.getMode(modeId);
    if (!mode)
      return [];
    return this.plugin.functionManager.getFunctions(mode.category);
  }
  // Custom mode management
  addCustomMode(mode) {
    if (this.getMode(mode.id)) {
      throw new Error(`Mode with ID '${mode.id}' already exists`);
    }
    this.plugin.settings.customModes.push(mode);
    this.plugin.saveSettings();
  }
  removeCustomMode(modeId) {
    if (this.builtInModes.some((m) => m.id === modeId)) {
      return false;
    }
    const index = this.plugin.settings.customModes.findIndex((m) => m.id === modeId);
    if (index === -1)
      return false;
    this.plugin.settings.customModes.splice(index, 1);
    if (this.plugin.settings.currentMode === modeId) {
      this.plugin.settings.currentMode = "general";
    }
    this.plugin.saveSettings();
    return true;
  }
  updateCustomMode(modeId, updates) {
    const index = this.plugin.settings.customModes.findIndex((m) => m.id === modeId);
    if (index === -1)
      return false;
    const mode = this.plugin.settings.customModes[index];
    Object.assign(mode, updates);
    this.plugin.saveSettings();
    return true;
  }
  // Mode-specific context for AI prompts
  buildModeContext(modeId, additionalContext) {
    const mode = this.getMode(modeId);
    if (!mode)
      return "";
    let context = `Current writing mode: ${mode.name}
`;
    context += `Mode description: ${mode.description}
`;
    context += `System guidance: ${mode.systemPrompt}`;
    if (additionalContext) {
      context += `

Additional context: ${additionalContext}`;
    }
    return context;
  }
  // Get mode-appropriate suggestions
  getModeSuggestions(modeId) {
    const mode = this.getMode(modeId);
    if (!mode)
      return [];
    const suggestions = {
      "academic": [
        "Focus on argument structure and evidence",
        "Use formal, scholarly tone",
        "Integrate citations smoothly",
        "Ensure logical flow between paragraphs",
        "Support claims with credible sources"
      ],
      "business": [
        "Lead with key takeaways",
        "Use action-oriented language",
        "Make content scannable",
        "Include clear next steps",
        "Focus on business outcomes"
      ],
      "fiction": [
        "Show don't tell",
        "Develop character voice",
        "Enhance sensory details",
        "Improve dialogue naturalness",
        "Maintain narrative momentum"
      ],
      "technical": [
        "Be precise and accurate",
        "Use clear step-by-step instructions",
        "Include examples and code snippets",
        "Consider the target audience",
        "Test all procedures"
      ],
      "general": [
        "Focus on clarity and readability",
        "Use active voice when possible",
        "Vary sentence structure",
        "Remove unnecessary words",
        "Improve flow and transitions"
      ]
    };
    return suggestions[mode.category] || suggestions["general"];
  }
  // Export mode configuration
  exportModeConfiguration() {
    const config = {
      currentMode: this.plugin.settings.currentMode,
      customModes: this.plugin.settings.customModes,
      exportedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    return JSON.stringify(config, null, 2);
  }
  // Import mode configuration
  importModeConfiguration(configJson) {
    try {
      const config = JSON.parse(configJson);
      if (!config.customModes || !Array.isArray(config.customModes)) {
        return { success: false, message: "Invalid configuration format" };
      }
      for (const mode of config.customModes) {
        if (!mode.id || !mode.name || !mode.category || !mode.systemPrompt) {
          return { success: false, message: "Invalid mode structure in configuration" };
        }
      }
      let importedCount = 0;
      for (const mode of config.customModes) {
        if (!this.getMode(mode.id)) {
          this.plugin.settings.customModes.push(mode);
          importedCount++;
        }
      }
      if (config.currentMode && this.getMode(config.currentMode)) {
        this.plugin.settings.currentMode = config.currentMode;
      }
      this.plugin.saveSettings();
      return {
        success: true,
        message: `Successfully imported ${importedCount} custom modes`
      };
    } catch (error) {
      return {
        success: false,
        message: `Import failed: ${error.message}`
      };
    }
  }
};

// plugins/ai-editorial-functions/src/main.ts
var DEFAULT_SETTINGS = {
  currentMode: "general",
  enableQuickAccess: true,
  showCategoryIcons: true,
  autoApplyFormatting: true,
  confirmBeforeApply: true,
  customFunctions: [],
  customModes: []
};
var AIEditorialFunctionsPlugin = class extends import_obsidian2.Plugin {
  async onload() {
    await this.loadSettings();
    this.functionManager = new FunctionManager(this);
    this.modeManager = new ModeManager(this);
    this.initializeGlobalAPI();
    this.addCommands();
    this.registerContextMenus();
    this.addRibbonIcon("wand-2", "AI Editorial Functions", (event) => {
      this.showFunctionMenu(event);
    });
    this.statusBarItem = this.addStatusBarItem();
    this.updateStatusBar();
    this.addSettingTab(new AIEditorialFunctionsSettingsTab(this.app, this));
    console.log("AI Editorial Functions plugin loaded");
  }
  onunload() {
    this.cleanupGlobalAPI();
    console.log("AI Editorial Functions plugin unloaded");
  }
  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }
  async saveSettings() {
    await this.saveData(this.settings);
    this.updateStatusBar();
  }
  initializeGlobalAPI() {
    if (!window.WriterrlAPI) {
      window.WriterrlAPI = {};
    }
    window.WriterrlAPI.editorialFunctions = {
      getFunctions: (category) => this.functionManager.getFunctions(category),
      executeFunction: (functionId, text, parameters) => this.functionManager.executeFunction(functionId, text, parameters),
      getModes: (category) => this.modeManager.getModes(category),
      setMode: (modeId) => this.setMode(modeId)
    };
  }
  cleanupGlobalAPI() {
    if (window.WriterrlAPI && window.WriterrlAPI.editorialFunctions) {
      delete window.WriterrlAPI.editorialFunctions;
    }
  }
  addCommands() {
    this.addCommand({
      id: "switch-to-academic-mode",
      name: "Switch to Academic Writing Mode",
      callback: () => this.setMode("academic")
    });
    this.addCommand({
      id: "switch-to-business-mode",
      name: "Switch to Business Writing Mode",
      callback: () => this.setMode("business")
    });
    this.addCommand({
      id: "switch-to-fiction-mode",
      name: "Switch to Fiction Writing Mode",
      callback: () => this.setMode("fiction")
    });
    this.addCommand({
      id: "switch-to-technical-mode",
      name: "Switch to Technical Writing Mode",
      callback: () => this.setMode("technical")
    });
    this.addCommand({
      id: "show-function-menu",
      name: "Show editorial functions menu",
      editorCallback: (editor, view) => {
        this.showFunctionMenu();
      }
    });
    this.addCommand({
      id: "quick-edit-selection",
      name: "Quick edit selected text",
      editorCallback: (editor) => {
        const selection = editor.getSelection();
        if (selection) {
          this.showQuickEditModal(selection, editor);
        } else {
          new import_obsidian2.Notice("No text selected");
        }
      }
    });
    this.addCommand({
      id: "improve-clarity",
      name: "Improve clarity of selected text",
      editorCallback: (editor) => this.executeQuickFunction("improve-clarity", editor)
    });
    this.addCommand({
      id: "fix-grammar",
      name: "Fix grammar of selected text",
      editorCallback: (editor) => this.executeQuickFunction("fix-grammar", editor)
    });
    this.addCommand({
      id: "enhance-style",
      name: "Enhance writing style of selected text",
      editorCallback: (editor) => this.executeQuickFunction("enhance-style", editor)
    });
    this.addCommand({
      id: "summarize-text",
      name: "Summarize selected text",
      editorCallback: (editor) => this.executeQuickFunction("summarize", editor)
    });
  }
  registerContextMenus() {
    this.registerEvent(
      this.app.workspace.on("editor-menu", (menu, editor, view) => {
        const selection = editor.getSelection();
        if (selection) {
          menu.addSeparator();
          const submenu = menu.addItem((item) => {
            item.setTitle("AI Editorial Functions");
            item.setIcon("wand-2");
          });
          const quickFunctions = [
            { id: "improve-clarity", title: "Improve Clarity" },
            { id: "fix-grammar", title: "Fix Grammar" },
            { id: "enhance-style", title: "Enhance Style" },
            { id: "summarize", title: "Summarize" }
          ];
          for (const func of quickFunctions) {
            submenu.addItem((item) => {
              item.setTitle(func.title);
              item.onClick(() => this.executeQuickFunction(func.id, editor));
            });
          }
          submenu.addSeparator();
          submenu.addItem((item) => {
            item.setTitle("More Functions...");
            item.onClick(() => this.showFunctionMenu());
          });
        }
      })
    );
  }
  async executeQuickFunction(functionId, editor) {
    const selection = editor.getSelection();
    if (!selection) {
      new import_obsidian2.Notice("No text selected");
      return;
    }
    try {
      const result = await this.functionManager.executeFunction(functionId, selection);
      if (this.settings.confirmBeforeApply) {
        this.showResultModal(selection, result, editor);
      } else {
        editor.replaceSelection(result);
        new import_obsidian2.Notice("Text updated");
      }
    } catch (error) {
      new import_obsidian2.Notice(`Error: ${error.message}`);
    }
  }
  showFunctionMenu(event) {
    const modal = new FunctionMenuModal(this.app, this, (functionId) => {
      const editor = this.getActiveEditor();
      if (editor) {
        this.executeQuickFunction(functionId, editor);
      }
    });
    modal.open();
  }
  showQuickEditModal(selectedText, editor) {
    const modal = new QuickEditModal(this.app, selectedText, async (prompt) => {
      try {
        const result = await this.functionManager.executeCustomPrompt(selectedText, prompt);
        if (this.settings.confirmBeforeApply) {
          this.showResultModal(selectedText, result, editor);
        } else {
          editor.replaceSelection(result);
          new import_obsidian2.Notice("Text updated");
        }
      } catch (error) {
        new import_obsidian2.Notice(`Error: ${error.message}`);
      }
    });
    modal.open();
  }
  showResultModal(originalText, editedText, editor) {
    const modal = new ResultPreviewModal(this.app, originalText, editedText, (accept) => {
      if (accept) {
        editor.replaceSelection(editedText);
        new import_obsidian2.Notice("Text updated");
      }
    });
    modal.open();
  }
  getActiveEditor() {
    const view = this.app.workspace.getActiveViewOfType(import_obsidian2.MarkdownView);
    return view ? view.editor : null;
  }
  setMode(modeId) {
    this.settings.currentMode = modeId;
    this.saveSettings();
    new import_obsidian2.Notice(`Switched to ${modeId} writing mode`);
  }
  getCurrentMode() {
    return this.modeManager.getMode(this.settings.currentMode);
  }
  updateStatusBar() {
    const currentMode = this.getCurrentMode();
    if (currentMode) {
      this.statusBarItem.setText(`\u{1F4DD} ${currentMode.name}`);
      this.statusBarItem.title = `Current writing mode: ${currentMode.description}`;
    } else {
      this.statusBarItem.setText("\u{1F4DD} General");
      this.statusBarItem.title = "No specific writing mode selected";
    }
  }
};
var FunctionMenuModal = class extends import_obsidian2.Modal {
  constructor(app, plugin, onSelect) {
    super(app);
    this.plugin = plugin;
    this.onSelect = onSelect;
  }
  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h2", { text: "AI Editorial Functions" });
    const functions = this.plugin.functionManager.getFunctions();
    const categories = ["academic", "business", "fiction", "technical"];
    for (const category of categories) {
      const categoryFunctions = functions.filter((f) => f.category === category);
      if (categoryFunctions.length === 0)
        continue;
      const categoryEl = contentEl.createEl("div", { cls: "function-category" });
      categoryEl.createEl("h3", { text: category.charAt(0).toUpperCase() + category.slice(1) });
      for (const func of categoryFunctions) {
        const functionEl = categoryEl.createEl("div", { cls: "function-item" });
        functionEl.style.cssText = `
          padding: 8px 12px;
          margin: 2px 0;
          border: 1px solid var(--background-modifier-border);
          border-radius: 4px;
          cursor: pointer;
          transition: background-color 0.2s;
        `;
        functionEl.createEl("strong", { text: func.name });
        functionEl.createEl("div", { text: func.description, cls: "function-description" });
        functionEl.addEventListener("click", () => {
          this.onSelect(func.id);
          this.close();
        });
        functionEl.addEventListener("mouseenter", () => {
          functionEl.style.backgroundColor = "var(--background-modifier-hover)";
        });
        functionEl.addEventListener("mouseleave", () => {
          functionEl.style.backgroundColor = "";
        });
      }
    }
  }
  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
};
var QuickEditModal = class extends import_obsidian2.Modal {
  constructor(app, selectedText, onSubmit) {
    super(app);
    this.selectedText = selectedText;
    this.onSubmit = onSubmit;
  }
  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h2", { text: "Quick Edit with Custom Prompt" });
    const previewEl = contentEl.createEl("div", { cls: "selected-text-preview" });
    previewEl.style.cssText = `
      background: var(--background-secondary);
      padding: 10px;
      border-radius: 4px;
      margin: 10px 0;
      max-height: 150px;
      overflow-y: auto;
    `;
    previewEl.textContent = this.selectedText;
    const promptInput = contentEl.createEl("textarea", {
      attr: {
        placeholder: 'Enter your editing instructions (e.g., "Make this more formal", "Simplify the language", "Add more details")',
        rows: "3"
      }
    });
    promptInput.style.cssText = `
      width: 100%;
      margin: 10px 0;
      padding: 8px;
      border: 1px solid var(--background-modifier-border);
      border-radius: 4px;
    `;
    const buttonContainer = contentEl.createEl("div", { cls: "button-container" });
    buttonContainer.style.cssText = `
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      margin-top: 15px;
    `;
    const cancelButton = buttonContainer.createEl("button", { text: "Cancel" });
    cancelButton.onclick = () => this.close();
    const submitButton = buttonContainer.createEl("button", { text: "Apply Edit" });
    submitButton.style.cssText = `
      background: var(--interactive-accent);
      color: var(--text-on-accent);
    `;
    submitButton.onclick = async () => {
      const prompt = promptInput.value.trim();
      if (prompt) {
        this.close();
        await this.onSubmit(prompt);
      }
    };
    promptInput.focus();
  }
  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
};
var ResultPreviewModal = class extends import_obsidian2.Modal {
  constructor(app, originalText, editedText, onDecision) {
    super(app);
    this.originalText = originalText;
    this.editedText = editedText;
    this.onDecision = onDecision;
  }
  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h2", { text: "Preview Changes" });
    const container = contentEl.createEl("div", { cls: "diff-container" });
    container.style.cssText = `
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin: 15px 0;
    `;
    const originalContainer = container.createEl("div");
    originalContainer.createEl("h3", { text: "Original" });
    const originalEl = originalContainer.createEl("div", { cls: "text-preview original" });
    originalEl.style.cssText = `
      background: var(--background-secondary);
      padding: 15px;
      border-radius: 4px;
      max-height: 300px;
      overflow-y: auto;
      border: 2px solid var(--background-modifier-error);
    `;
    originalEl.textContent = this.originalText;
    const editedContainer = container.createEl("div");
    editedContainer.createEl("h3", { text: "Edited" });
    const editedEl = editedContainer.createEl("div", { cls: "text-preview edited" });
    editedEl.style.cssText = `
      background: var(--background-secondary);
      padding: 15px;
      border-radius: 4px;
      max-height: 300px;
      overflow-y: auto;
      border: 2px solid var(--background-modifier-success);
    `;
    editedEl.textContent = this.editedText;
    const buttonContainer = contentEl.createEl("div", { cls: "button-container" });
    buttonContainer.style.cssText = `
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      margin-top: 20px;
    `;
    const rejectButton = buttonContainer.createEl("button", { text: "Keep Original" });
    rejectButton.onclick = () => {
      this.onDecision(false);
      this.close();
    };
    const acceptButton = buttonContainer.createEl("button", { text: "Apply Changes" });
    acceptButton.style.cssText = `
      background: var(--interactive-accent);
      color: var(--text-on-accent);
    `;
    acceptButton.onclick = () => {
      this.onDecision(true);
      this.close();
    };
  }
  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
};
//# sourceMappingURL=main.js.map
