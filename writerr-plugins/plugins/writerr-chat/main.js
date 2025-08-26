"use strict";
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

// shared/utils/index.ts
var utils_exports = {};
__export(utils_exports, {
  debounce: () => debounce,
  escapeRegExp: () => escapeRegExp,
  exportToJSON: () => exportToJSON,
  formatTimestamp: () => formatTimestamp,
  generateId: () => generateId,
  getCharacterCount: () => getCharacterCount,
  getWordCount: () => getWordCount,
  parseMarkdown: () => parseMarkdown,
  sanitizeFilename: () => sanitizeFilename,
  throttle: () => throttle
});
function generateId() {
  return Math.random().toString(36).substr(2, 9);
}
function debounce(func, wait) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}
function throttle(func, limit) {
  let inThrottle;
  return (...args) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}
function formatTimestamp(timestamp) {
  return new Date(timestamp).toLocaleString();
}
function getWordCount(text) {
  return text.trim().split(/\s+/).filter((word) => word.length > 0).length;
}
function getCharacterCount(text) {
  return text.length;
}
function sanitizeFilename(filename) {
  return filename.replace(/[^a-z0-9]/gi, "_").toLowerCase();
}
function exportToJSON(data) {
  return JSON.stringify(data, null, 2);
}
function parseMarkdown(content) {
  const frontmatterRegex = /^---\s*\n(.*?)\n---\s*\n(.*)$/s;
  const match = content.match(frontmatterRegex);
  if (match) {
    try {
      const frontmatter = JSON.parse(match[1]);
      return { frontmatter, body: match[2] };
    } catch (e) {
      return { frontmatter: {}, body: content };
    }
  }
  return { frontmatter: {}, body: content };
}
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
var init_utils = __esm({
  "shared/utils/index.ts"() {
    "use strict";
  }
});

// plugins/writerr-chat/src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => WriterrlChatPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian5 = require("obsidian");

// plugins/writerr-chat/src/settings.ts
var import_obsidian = require("obsidian");
init_utils();
var WriterrlChatSettingsTab = class extends import_obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Writerr Chat Settings" });
    containerEl.createEl("h3", { text: "AI Provider Configuration" });
    new import_obsidian.Setting(containerEl).setName("Default provider").setDesc("Select the default AI provider for chat").addDropdown((dropdown) => {
      for (const provider of this.plugin.settings.providers) {
        dropdown.addOption(provider.id, provider.name);
      }
      dropdown.setValue(this.plugin.settings.defaultProvider).onChange(async (value) => {
        this.plugin.settings.defaultProvider = value;
        await this.plugin.saveSettings();
      });
    });
    for (let i = 0; i < this.plugin.settings.providers.length; i++) {
      const provider = this.plugin.settings.providers[i];
      this.createProviderSetting(containerEl, provider, i);
    }
    new import_obsidian.Setting(containerEl).setName("Add new provider").setDesc("Add a new AI provider").addButton((button) => button.setButtonText("Add Provider").setCta().onClick(() => {
      this.plugin.settings.providers.push({
        id: generateId(),
        name: "New Provider",
        model: "gpt-3.5-turbo",
        baseUrl: "",
        apiKey: ""
      });
      this.display();
    }));
    containerEl.createEl("h3", { text: "Chat Interface" });
    new import_obsidian.Setting(containerEl).setName("Chat position").setDesc("Choose where the chat panel appears").addDropdown((dropdown) => dropdown.addOption("right", "Right sidebar").addOption("left", "Left sidebar").addOption("floating", "Floating window").setValue(this.plugin.settings.chatPosition).onChange(async (value) => {
      this.plugin.settings.chatPosition = value;
      await this.plugin.saveSettings();
    }));
    new import_obsidian.Setting(containerEl).setName("Theme").setDesc("Choose the chat interface theme").addDropdown((dropdown) => dropdown.addOption("default", "Default").addOption("compact", "Compact").addOption("minimal", "Minimal").setValue(this.plugin.settings.theme).onChange(async (value) => {
      this.plugin.settings.theme = value;
      await this.plugin.saveSettings();
    }));
    new import_obsidian.Setting(containerEl).setName("Show timestamps").setDesc("Display timestamps for chat messages").addToggle((toggle) => toggle.setValue(this.plugin.settings.showTimestamps).onChange(async (value) => {
      this.plugin.settings.showTimestamps = value;
      await this.plugin.saveSettings();
    }));
    new import_obsidian.Setting(containerEl).setName("Enable markdown").setDesc("Render markdown in chat messages").addToggle((toggle) => toggle.setValue(this.plugin.settings.enableMarkdown).onChange(async (value) => {
      this.plugin.settings.enableMarkdown = value;
      await this.plugin.saveSettings();
    }));
    containerEl.createEl("h3", { text: "Behavior" });
    new import_obsidian.Setting(containerEl).setName("Auto-save chats").setDesc("Automatically save chat sessions").addToggle((toggle) => toggle.setValue(this.plugin.settings.autoSaveChats).onChange(async (value) => {
      this.plugin.settings.autoSaveChats = value;
      await this.plugin.saveSettings();
    }));
    new import_obsidian.Setting(containerEl).setName("Context lines").setDesc("Number of lines to include as context from the current document").addSlider((slider) => slider.setLimits(0, 50, 1).setValue(this.plugin.settings.contextLines).setDynamicTooltip().onChange(async (value) => {
      this.plugin.settings.contextLines = value;
      await this.plugin.saveSettings();
    }));
    new import_obsidian.Setting(containerEl).setName("Max tokens").setDesc("Maximum number of tokens for AI responses").addSlider((slider) => slider.setLimits(100, 4e3, 100).setValue(this.plugin.settings.maxTokens).setDynamicTooltip().onChange(async (value) => {
      this.plugin.settings.maxTokens = value;
      await this.plugin.saveSettings();
    }));
    new import_obsidian.Setting(containerEl).setName("Temperature").setDesc("Creativity level for AI responses (0 = focused, 1 = creative)").addSlider((slider) => slider.setLimits(0, 1, 0.1).setValue(this.plugin.settings.temperature).setDynamicTooltip().onChange(async (value) => {
      this.plugin.settings.temperature = value;
      await this.plugin.saveSettings();
    }));
    containerEl.createEl("h3", { text: "Actions" });
    new import_obsidian.Setting(containerEl).setName("Clear all chat history").setDesc("Delete all saved chat sessions (cannot be undone)").addButton((button) => button.setButtonText("Clear All").setWarning().onClick(() => {
      this.plugin.chatSessions.clear();
      this.plugin.currentSession = null;
      this.plugin.saveChatSessions();
    }));
  }
  createProviderSetting(containerEl, provider, index) {
    const providerContainer = containerEl.createDiv("provider-setting");
    providerContainer.createEl("h4", { text: provider.name });
    new import_obsidian.Setting(providerContainer).setName("Provider name").addText((text) => text.setValue(provider.name).onChange(async (value) => {
      provider.name = value;
      await this.plugin.saveSettings();
    }));
    new import_obsidian.Setting(providerContainer).setName("Model").addText((text) => text.setValue(provider.model).onChange(async (value) => {
      provider.model = value;
      await this.plugin.saveSettings();
    }));
    new import_obsidian.Setting(providerContainer).setName("Base URL").addText((text) => text.setValue(provider.baseUrl || "").onChange(async (value) => {
      provider.baseUrl = value;
      await this.plugin.saveSettings();
    }));
    new import_obsidian.Setting(providerContainer).setName("API Key").addText((text) => {
      text.inputEl.type = "password";
      text.setValue(provider.apiKey || "").onChange(async (value) => {
        provider.apiKey = value;
        await this.plugin.saveSettings();
      });
    });
    new import_obsidian.Setting(providerContainer).addButton((button) => button.setButtonText("Remove").setWarning().onClick(async () => {
      this.plugin.settings.providers.splice(index, 1);
      await this.plugin.saveSettings();
      this.display();
    }));
  }
};

// plugins/writerr-chat/src/chat-view.ts
var import_obsidian4 = require("obsidian");

// plugins/writerr-chat/src/components/BaseComponent.ts
var BaseComponent = class {
  constructor(options) {
    this.container = options.container;
    this.plugin = options.plugin;
  }
  destroy() {
    this.container.empty();
  }
  createElement(tag, options = {}) {
    const el = this.container.createEl(tag);
    if (options.cls) {
      if (Array.isArray(options.cls)) {
        el.addClasses(options.cls);
      } else {
        el.addClass(options.cls);
      }
    }
    if (options.text) {
      el.textContent = options.text;
    }
    if (options.attrs) {
      Object.entries(options.attrs).forEach(([key, value]) => {
        el.setAttribute(key, value);
      });
    }
    if (options.styles) {
      el.style.cssText = Object.entries(options.styles).map(([key, value]) => `${key}: ${value}`).join("; ");
    }
    return el;
  }
  addHoverEffect(element, hoverStyles) {
    const originalStyles = {};
    element.addEventListener("mouseenter", () => {
      Object.entries(hoverStyles).forEach(([key, value]) => {
        originalStyles[key] = element.style[key];
        element.style[key] = value;
      });
    });
    element.addEventListener("mouseleave", () => {
      Object.entries(originalStyles).forEach(([key, value]) => {
        element.style[key] = value;
      });
    });
  }
};

// plugins/writerr-chat/src/components/MessageBubble.ts
var import_obsidian2 = require("obsidian");
var MessageBubble = class extends BaseComponent {
  constructor(options) {
    super(options);
    this.message = options.message;
    this.actionHandler = options.actionHandler;
  }
  render() {
    this.createMessageElement();
    this.createAvatar();
    this.createContent();
    this.createActions();
    this.createTimestamp();
    this.addInteractions();
  }
  createMessageElement() {
    const isUser = this.message.role === "user";
    this.messageEl = this.createElement("div", {
      cls: ["chat-message", `chat-message-${this.message.role}`],
      styles: {
        display: "flex",
        margin: "16px 0",
        gap: "12px",
        position: "relative",
        alignItems: "flex-start",
        ...isUser ? { "flex-direction": "row-reverse" } : {}
      }
    });
  }
  createAvatar() {
    const isUser = this.message.role === "user";
    const avatar = this.messageEl.createEl("div", { cls: "writerr-message-icon" });
    if (isUser) {
      avatar.innerHTML = `
        <svg class="writerr-message-avatar" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
      `;
    } else {
      avatar.innerHTML = `
        <svg class="writerr-message-avatar" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 8V4H8"/>
          <rect width="16" height="12" x="4" y="8" rx="2"/>
          <path d="M2 14h2"/>
          <path d="M20 14h2"/>
          <path d="M15 13v2"/>
          <path d="M9 13v2"/>
        </svg>
      `;
    }
  }
  createContent() {
    const isUser = this.message.role === "user";
    const contentWrapper = this.messageEl.createEl("div", { cls: "message-content-wrapper" });
    contentWrapper.style.cssText = `
      flex: 1;
      min-width: 0;
      max-width: calc(100% - 120px);
    `;
    const bubble = contentWrapper.createEl("div", { cls: "message-bubble" });
    bubble.style.cssText = `
      padding: 12px 16px;
      border-radius: 18px;
      position: relative;
      word-wrap: break-word;
      ${isUser ? `
          background: var(--background-primary);
          color: var(--text-normal);
          border: 2px solid var(--interactive-accent);
          border-bottom-right-radius: 6px;
        ` : `
          background: var(--background-secondary);
          color: var(--text-normal);
          border: 1px solid var(--background-modifier-border);
          border-bottom-left-radius: 6px;
        `}
      transition: all 0.2s ease;
    `;
    if (this.plugin.settings.enableMarkdown && !isUser) {
      this.renderMarkdownContent(bubble);
    } else {
      bubble.textContent = this.message.content;
    }
    this.addHoverEffect(bubble, {
      "box-shadow": "0 4px 12px rgba(0, 0, 0, 0.1)",
      "transform": "translateY(-1px)"
    });
  }
  async renderMarkdownContent(bubble) {
    try {
      const component = new import_obsidian2.Component();
      await import_obsidian2.MarkdownRenderer.renderMarkdown(
        this.message.content,
        bubble,
        "",
        component
      );
    } catch (error) {
      console.error("Error rendering markdown:", error);
      bubble.textContent = this.message.content;
    }
  }
  createActions() {
    const isUser = this.message.role === "user";
    const contentWrapper = this.messageEl.querySelector(".message-content-wrapper");
    this.actionsEl = contentWrapper.createEl("div", { cls: "writerr-message-actions" });
    if (isUser) {
      this.createActionButton("copy", "Copy message", `
        <svg class="writerr-action-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
        </svg>
      `, () => this.actionHandler.onCopy(this.message));
      this.createActionButton("info", "Message info", `
        <svg class="writerr-action-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="12"/>
          <path d="M12 16v-4"/>
          <path d="M12 8h.01"/>
        </svg>
      `, () => this.actionHandler.onInfo(this.message));
    } else {
      this.createActionButton("retry", "Retry this response", `
        <svg class="writerr-action-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 3"/>
          <path d="M21 3v5h-5"/>
          <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 21"/>
          <path d="M3 21v-5h5"/>
        </svg>
      `, () => this.actionHandler.onRetry(this.message));
      this.createActionButton("copy", "Copy message", `
        <svg class="writerr-action-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
        </svg>
      `, () => this.actionHandler.onCopy(this.message));
      this.createActionButton("info", "Message info", `
        <svg class="writerr-action-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="12"/>
          <path d="M12 16v-4"/>
          <path d="M12 8h.01"/>
        </svg>
      `, () => this.actionHandler.onInfo(this.message));
    }
  }
  createActionButton(type, tooltip, icon, onClick) {
    const btn = this.actionsEl.createEl("button", { cls: `message-action-btn action-${type}` });
    btn.innerHTML = icon;
    btn.title = tooltip;
    btn.onclick = onClick;
    btn.style.cssText = `
      background: transparent !important;
      border: none !important;
      box-shadow: none !important;
      padding: 4px !important;
      border-radius: 4px !important;
      cursor: pointer !important;
      color: var(--text-faint) !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      transition: all 0.2s ease !important;
      width: 24px !important;
      height: 24px !important;
      opacity: 0.6 !important;
    `;
    btn.offsetHeight;
    this.addHoverEffect(btn, {
      "color": "var(--text-muted)",
      "opacity": "1"
    });
  }
  createTimestamp() {
    return;
  }
  addInteractions() {
  }
};

// plugins/writerr-chat/src/components/ChatHeader.ts
var ChatHeader = class extends BaseComponent {
  constructor(options) {
    super(options);
    this.events = options.events;
  }
  render() {
    this.createHeader();
    this.createLeftSection();
    this.createRightSection();
    this.populateModeOptions();
  }
  createHeader() {
    this.container.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px;
      border-bottom: 1px solid var(--background-modifier-border);
      height: 60px;
      background: var(--background-primary);
    `;
  }
  createLeftSection() {
    const leftContainer = this.createElement("div", { cls: "writerr-chat-header-left" });
    const selectWrapper = leftContainer.createEl("div", { cls: "writerr-mode-select-wrapper" });
    this.modeSelect = selectWrapper.createEl("select", { cls: "writerr-mode-select" });
    const caret = selectWrapper.createEl("div", { cls: "writerr-mode-caret" });
    caret.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="6,9 12,15 18,9"/>
      </svg>
    `;
    this.modeSelect.addEventListener("change", () => {
      this.events.onModeChange(this.modeSelect.value);
    });
  }
  createRightSection() {
    const rightContainer = this.createElement("div", { cls: "chat-header-controls" });
    this.createHistoryButton(rightContainer);
    this.createSettingsButton(rightContainer);
  }
  createHistoryButton(parent) {
    const historyButton = parent.createEl("button", { cls: "chat-control-button" });
    historyButton.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
        <path d="M3 3v5h5"/>
        <path d="M12 7v5l4 2"/>
      </svg>
    `;
    historyButton.title = "Chat History";
    historyButton.onclick = () => this.events.onHistoryClick();
    this.styleControlButton(historyButton);
  }
  createSettingsButton(parent) {
    const settingsButton = parent.createEl("button", { cls: "chat-control-button" });
    settingsButton.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
        <circle cx="12" cy="12" r="3"/>
      </svg>
    `;
    settingsButton.title = "Chat Settings";
    settingsButton.onclick = () => this.events.onSettingsClick();
    this.styleControlButton(settingsButton);
  }
  createStatusIndicator(parent) {
    this.statusIndicator = parent.createEl("div", { cls: "chat-status-indicator" });
    this.updateStatusIndicator();
  }
  styleControlButton(button) {
    const svg = button.querySelector("svg");
    if (svg) {
      svg.setAttribute("width", "18");
      svg.setAttribute("height", "18");
    }
    button.addEventListener("mouseenter", () => {
      const tooltip = button.getAttribute("title");
      if (tooltip) {
        button.style.position = "relative";
        button.setAttribute("data-tooltip", tooltip);
        button.removeAttribute("title");
        if (!document.querySelector("#header-tooltip-styles")) {
          const style = document.createElement("style");
          style.id = "header-tooltip-styles";
          style.textContent = `
            [data-tooltip]:hover::before {
              content: attr(data-tooltip) !important;
              position: absolute !important;
              bottom: calc(100% + 8px) !important;
              left: 50% !important;
              transform: translateX(-50%) !important;
              background: var(--background-primary) !important;
              color: var(--text-normal) !important;
              border: 1px solid var(--background-modifier-border) !important;
              border-radius: 4px !important;
              padding: 4px 8px !important;
              font-size: 11px !important;
              white-space: nowrap !important;
              z-index: 9999999 !important;
              box-shadow: 0 2px 8px rgba(0,0,0,0.3) !important;
              pointer-events: none !important;
            }
          `;
          document.head.appendChild(style);
        }
      }
    });
  }
  populateModeOptions() {
    var _a;
    if (!this.modeSelect)
      return;
    console.log("Populating mode options...", this.modeSelect);
    this.modeSelect.innerHTML = "";
    this.modeSelect.createEl("option", {
      value: "chat",
      text: "Chat Mode"
    });
    if ((_a = window.Writerr) == null ? void 0 : _a.editorial) {
      try {
        const modes = window.Writerr.editorial.getEnabledModes();
        console.log("Editorial Engine enabled modes found:", modes);
        for (const mode of modes) {
          this.modeSelect.createEl("option", {
            value: mode.id,
            text: mode.name
          });
          console.log(`Added mode option: ${mode.name} (${mode.id})`);
        }
        console.log(`Successfully loaded ${modes.length} enabled Editorial Engine modes to dropdown`);
        this.modeSelect.style.display = "none";
        this.modeSelect.offsetHeight;
        this.modeSelect.style.display = "";
      } catch (error) {
        console.warn("Failed to load Editorial Engine modes:", error);
        const unavailableOption = this.modeSelect.createEl("option", {
          value: "editorial-unavailable",
          text: "Editorial Engine Unavailable"
        });
        unavailableOption.disabled = true;
      }
    } else {
      console.log("Editorial Engine not available, showing loading state");
      const loadingOption = this.modeSelect.createEl("option", {
        value: "editorial-loading",
        text: "Editorial Engine Loading..."
      });
      loadingOption.disabled = true;
      setTimeout(() => {
        console.log("Retrying mode population after delay...");
        this.populateModeOptions();
      }, 2e3);
    }
    const defaultMode = this.plugin.settings.defaultMode || "chat";
    this.modeSelect.value = defaultMode;
    console.log(`Set default mode to: ${defaultMode}, current value: ${this.modeSelect.value}`);
  }
  updateStatusIndicator() {
    var _a, _b;
    if (!this.statusIndicator)
      return;
    const hasEditorialEngine = !!((_a = window.Writerr) == null ? void 0 : _a.editorial);
    const hasTrackEdits = !!((_b = window.WriterrlAPI) == null ? void 0 : _b.trackEdits);
    const previousStatus = this.statusIndicator.getAttribute("data-status");
    let status = "ready";
    let color = "var(--color-green)";
    if (!hasEditorialEngine && !hasTrackEdits) {
      status = "limited";
      color = "var(--color-yellow)";
    } else if (!hasEditorialEngine || !hasTrackEdits) {
      status = "partial";
      color = "var(--color-orange)";
    }
    this.statusIndicator.style.cssText = `
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: ${color};
      transition: background-color 0.3s ease;
    `;
    this.statusIndicator.setAttribute(
      "title",
      status === "ready" ? "All systems ready" : status === "partial" ? "Some features unavailable" : "Limited functionality - Editorial Engine and Track Edits not available"
    );
    this.statusIndicator.setAttribute("data-status", status);
    if (previousStatus !== status && hasEditorialEngine) {
      this.populateModeOptions();
    }
  }
  getSelectedMode() {
    var _a;
    return ((_a = this.modeSelect) == null ? void 0 : _a.value) || "chat";
  }
  setMode(mode) {
    if (this.modeSelect) {
      this.modeSelect.value = mode;
    }
  }
  refreshModeOptions() {
    this.populateModeOptions();
  }
};

// plugins/writerr-chat/src/components/ContextArea.ts
var ContextArea = class extends BaseComponent {
  constructor(options) {
    super(options);
    this.clearButton = null;
    // Add reference to clear button
    this.isCollapsed = false;
    this.documents = [];
    this.events = options.events;
    this.isCollapsed = true;
  }
  render() {
    this.createContextArea();
    this.createHeader();
    this.createDocumentsContainer();
  }
  createContextArea() {
    this.container.style.cssText = `
      transition: all 0.3s ease;
      overflow: hidden;
      border-top: 1px solid var(--background-modifier-border);
      margin: 0;
      width: 100%;
    `;
    this.updateContextAreaStyling();
  }
  updateContextAreaStyling() {
    this.container.style.background = "transparent";
    if (this.isCollapsed) {
      this.container.style.borderTop = "none";
    } else {
      this.container.style.borderTop = "1px solid var(--background-modifier-border)";
    }
  }
  createHeader() {
    this.contextHeader = this.createElement("div", { cls: "context-header" });
    this.contextHeader.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 16px;
    `;
    const leftSection = this.contextHeader.createEl("div");
    leftSection.style.cssText = "display: flex; align-items: center; gap: 8px; flex: 1;";
    const collapseIcon = leftSection.createEl("div", { cls: "context-collapse-icon" });
    collapseIcon.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="6 9 12 15 18 9"/>
      </svg>
    `;
    collapseIcon.style.cssText = `
      transition: transform 0.3s ease;
      color: var(--text-muted);
      display: flex;
      align-items: center;
      transform: ${this.isCollapsed ? "rotate(-90deg)" : "rotate(0deg)"};
    `;
    const contextLabel = leftSection.createEl("span", { text: "Context" });
    contextLabel.style.cssText = `
      font-size: 12px;
      color: var(--text-muted);
      font-weight: 500;
    `;
    const countBadge = leftSection.createEl("span", { cls: "context-count-badge" });
    this.updateCountBadge(countBadge);
    const rightSection = this.contextHeader.createEl("div");
    rightSection.style.cssText = "display: flex; align-items: center; flex-shrink: 0;";
    const addDocButton = rightSection.createEl("button", { cls: "context-add-button" });
    addDocButton.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 5v14"/>
        <path d="M5 12h14"/>
      </svg>
    `;
    addDocButton.title = "Attach document";
    addDocButton.setAttribute("data-tooltip", "Attach document");
    addDocButton.onclick = (e) => {
      e.stopPropagation();
      this.showDocumentPicker();
    };
    this.contextHeader.onclick = (e) => {
      if (e.target !== addDocButton && !addDocButton.contains(e.target)) {
        this.toggleCollapse();
      }
    };
    this.addHoverEffect(this.contextHeader, {
      "background-color": "var(--background-modifier-hover)"
    });
  }
  createDocumentsContainer() {
    this.documentsContainer = this.createElement("div", {
      cls: "context-documents",
      styles: {
        padding: "0 16px 12px 16px",
        display: "flex",
        flexWrap: "wrap",
        gap: "8px",
        minHeight: "40px",
        // Minimum height to show clear button
        transition: "all 0.3s ease",
        position: "relative",
        height: this.isCollapsed ? "0" : "auto"
      }
    });
    if (this.isCollapsed) {
      this.documentsContainer.style.padding = "0 16px";
    }
    this.createClearButton();
  }
  createClearButton() {
    this.clearButton = this.documentsContainer.createEl("button", { cls: "writerr-context-action" });
    this.clearButton.title = "Clear all context";
    this.clearButton.setAttribute("data-tooltip", "Clear all context");
    this.clearButton.onclick = (e) => {
      e.stopPropagation();
      this.clearAllDocuments();
    };
    this.clearButton.innerHTML = `
      <svg class="writerr-context-action-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M18.37 2.63 14 7l-1.59-1.59a2 2 0 0 0-2.82 0L8 7l9 9 1.59-1.59a2 2 0 0 0 0-2.82L17 10l4.37-4.37a2.12 2.12 0 1 0-3-3Z"/>
        <path d="M9 8c-2 3-4 3.5-7 4l8 10c2-1 6-5 6-7"/>
        <path d="M14.5 17.5 4.5 15"/>
      </svg>
    `;
    this.updateClearButtonState();
  }
  styleActionButton(button) {
    button.style.cssText = `
      background: transparent;
      border: none;
      cursor: pointer;
      color: var(--text-muted);
      padding: 4px;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
    `;
    this.addHoverEffect(button, {
      "background-color": "var(--background-modifier-hover)",
      "color": "var(--text-normal)"
    });
  }
  addDocument(doc) {
    if (this.documents.some((d) => d.path === doc.path))
      return;
    this.documents.push(doc);
    this.createDocumentChip(doc);
    this.updateCountBadge();
    this.events.onDocumentAdd(doc);
    this.updateClearButtonState();
    if (this.isCollapsed) {
      this.toggleCollapse();
    }
  }
  createDocumentChip(doc) {
    const docChip = this.documentsContainer.createEl("div", { cls: "context-document-chip" });
    docChip.style.cssText = `
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 10px;
      background: var(--background-primary);
      border: 1px solid var(--background-modifier-border);
      border-radius: 16px;
      font-size: 12px;
      color: var(--text-normal);
      cursor: pointer;
      max-width: 200px;
      transition: all 0.2s ease;
      animation: slideIn 0.3s ease;
    `;
    const style = document.createElement("style");
    style.textContent = `
      @keyframes slideIn {
        from {
          opacity: 0;
          transform: translateY(-10px) scale(0.9);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }
    `;
    document.head.appendChild(style);
    const docIcon = docChip.createEl("span");
    docIcon.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <path d="M14 2v6h6"/>
      </svg>
    `;
    docIcon.style.cssText = "color: var(--text-muted); flex-shrink: 0;";
    const docName = docChip.createEl("span", { text: doc.name });
    docName.style.cssText = `
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      flex: 1;
    `;
    const removeBtn = docChip.createEl("button");
    removeBtn.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M18 6L6 18"/>
        <path d="M6 6l12 12"/>
      </svg>
    `;
    removeBtn.style.cssText = `
      background: none;
      border: none;
      cursor: pointer;
      color: var(--text-muted);
      padding: 2px;
      width: 16px;
      height: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      flex-shrink: 0;
      transition: all 0.2s ease;
    `;
    docChip.onclick = (e) => {
      if (e.target !== removeBtn && !removeBtn.contains(e.target)) {
        this.events.onDocumentOpen(doc);
      }
    };
    removeBtn.onclick = (e) => {
      e.stopPropagation();
      this.removeDocument(doc, docChip);
    };
    this.addHoverEffect(docChip, {
      "background-color": "var(--background-secondary)",
      "transform": "translateY(-1px)",
      "box-shadow": "0 2px 8px rgba(0, 0, 0, 0.08)",
      "border-color": "var(--background-modifier-border-hover)"
    });
    this.addHoverEffect(removeBtn, {
      "background-color": "var(--background-modifier-error)",
      "color": "var(--text-on-accent)"
    });
  }
  removeDocument(doc, chipEl) {
    this.documents = this.documents.filter((d) => d.path !== doc.path);
    chipEl.style.animation = "slideOut 0.2s ease forwards";
    const slideOutStyle = document.createElement("style");
    slideOutStyle.textContent = `
      @keyframes slideOut {
        from {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
        to {
          opacity: 0;
          transform: translateY(-10px) scale(0.8);
        }
      }
    `;
    document.head.appendChild(slideOutStyle);
    setTimeout(() => {
      chipEl.remove();
      document.head.removeChild(slideOutStyle);
    }, 200);
    this.updateCountBadge();
    this.updateClearButtonState();
    this.events.onDocumentRemove(doc);
  }
  clearAllDocuments() {
    const chips = Array.from(this.documentsContainer.children).filter((child) => child !== this.clearButton);
    chips.forEach((chip, index) => {
      setTimeout(() => {
        chip.remove();
      }, index * 50);
    });
    this.documents.forEach((doc) => {
      this.events.onDocumentRemove(doc);
    });
    this.documents = [];
    this.updateCountBadge();
    this.updateClearButtonState();
  }
  updateCountBadge(badgeEl) {
    const badge = badgeEl || this.container.querySelector(".context-count-badge");
    if (!badge)
      return;
    const count = this.documents.length;
    if (count > 0) {
      badge.textContent = count.toString();
      badge.style.cssText = `
        background: var(--interactive-accent);
        color: var(--text-on-accent);
        font-size: 10px;
        padding: 2px 6px;
        border-radius: 8px;
        font-weight: 500;
        min-width: 16px;
        text-align: center;
      `;
    } else {
      badge.textContent = "";
      badge.style.cssText = "display: none;";
    }
  }
  updateClearButtonState() {
    console.log("updateClearButtonState called, documents:", this.documents.length);
    console.log("clearButton exists:", !!this.clearButton);
    if (!this.clearButton)
      return;
    const hasDocuments = this.documents.length > 0;
    if (hasDocuments) {
      console.log("Enabling clear button");
      this.clearButton.style.opacity = "1";
      this.clearButton.style.cursor = "pointer";
      this.clearButton.style.pointerEvents = "auto";
    } else {
      console.log("Disabling clear button (gray out)");
      this.clearButton.style.opacity = "0.5";
      this.clearButton.style.cursor = "not-allowed";
      this.clearButton.style.pointerEvents = "none";
    }
  }
  toggleCollapse() {
    console.log("toggleCollapse called, isCollapsed:", this.isCollapsed, "-> will be:", !this.isCollapsed);
    this.isCollapsed = !this.isCollapsed;
    const collapseIcon = this.contextHeader.querySelector(".context-collapse-icon");
    if (this.isCollapsed) {
      console.log("Collapsing context area - hiding clear button");
      this.documentsContainer.style.height = "0";
      this.documentsContainer.style.padding = "0";
      this.documentsContainer.style.overflow = "hidden";
      this.documentsContainer.style.opacity = "0";
      collapseIcon.style.transform = "rotate(-90deg)";
      if (this.clearButton)
        this.clearButton.style.display = "none";
    } else {
      console.log("Expanding context area - showing clear button");
      this.documentsContainer.style.height = "auto";
      this.documentsContainer.style.padding = "0 16px 12px 16px";
      this.documentsContainer.style.overflow = "visible";
      this.documentsContainer.style.opacity = "1";
      collapseIcon.style.transform = "rotate(0deg)";
      if (this.clearButton)
        this.clearButton.style.display = "flex";
    }
    this.updateContextAreaStyling();
  }
  showDocumentPicker() {
    const overlay = this.container.createEl("div", { cls: "document-picker-overlay" });
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      backdrop-filter: blur(4px);
    `;
    const modal = overlay.createEl("div", { cls: "document-picker-modal" });
    modal.style.cssText = `
      background: var(--background-primary);
      border: 1px solid var(--background-modifier-border);
      border-radius: 12px;
      padding: 24px;
      min-width: 400px;
      max-height: 500px;
      overflow-y: auto;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
      animation: modalSlideIn 0.3s ease;
    `;
    const modalStyle = document.createElement("style");
    modalStyle.textContent = `
      @keyframes modalSlideIn {
        from {
          opacity: 0;
          transform: translateY(-20px) scale(0.95);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }
    `;
    document.head.appendChild(modalStyle);
    this.createDocumentPickerContent(modal, overlay, modalStyle);
    overlay.onclick = (e) => {
      if (e.target === overlay) {
        overlay.remove();
        document.head.removeChild(modalStyle);
      }
    };
  }
  createDocumentPickerContent(modal, overlay, styleEl) {
    const header = modal.createEl("div");
    header.style.cssText = "display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;";
    const title = header.createEl("h3", { text: "Attach Document" });
    title.style.cssText = "margin: 0; color: var(--text-normal);";
    const closeButton = header.createEl("button");
    closeButton.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M18 6L6 18"/>
        <path d="M6 6l12 12"/>
      </svg>
    `;
    closeButton.style.cssText = `
      background: none;
      border: none;
      cursor: pointer;
      color: var(--text-muted);
      padding: 4px;
      border-radius: 4px;
      transition: all 0.2s ease;
    `;
    closeButton.onclick = () => {
      overlay.remove();
      document.head.removeChild(styleEl);
    };
    this.addHoverEffect(closeButton, {
      "background-color": "var(--background-modifier-hover)",
      "color": "var(--text-normal)"
    });
    const searchInput = modal.createEl("input", {
      type: "text",
      placeholder: "Search documents..."
    });
    searchInput.style.cssText = `
      width: 100%;
      padding: 10px 12px;
      border: 1px solid var(--background-modifier-border);
      border-radius: 8px;
      background: var(--background-primary);
      color: var(--text-normal);
      margin-bottom: 16px;
      font-family: inherit;
      outline: none;
      transition: border-color 0.2s ease;
    `;
    searchInput.addEventListener("focus", () => {
      searchInput.style.borderColor = "var(--interactive-accent)";
    });
    searchInput.addEventListener("blur", () => {
      searchInput.style.borderColor = "var(--background-modifier-border)";
    });
    const docList = modal.createEl("div");
    const files = this.plugin.app.vault.getMarkdownFiles();
    const recentFiles = files.slice(0, 10);
    recentFiles.forEach((file) => {
      const docItem = docList.createEl("div");
      docItem.style.cssText = `
        padding: 12px;
        border: 1px solid var(--background-modifier-border);
        border-radius: 8px;
        margin-bottom: 8px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 12px;
        transition: all 0.2s ease;
      `;
      docItem.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <path d="M14 2v6h6"/>
        </svg>
        <div>
          <div style="font-weight: 500; color: var(--text-normal);">${file.basename}</div>
          <div style="font-size: 12px; color: var(--text-muted);">${file.path}</div>
        </div>
      `;
      docItem.onclick = () => {
        this.addDocument({ name: file.basename + ".md", path: file.path });
        overlay.remove();
        document.head.removeChild(styleEl);
      };
      this.addHoverEffect(docItem, {
        "background-color": "var(--background-modifier-hover)",
        "border-color": "var(--interactive-accent)",
        "transform": "translateY(-1px)"
      });
    });
    searchInput.focus();
  }
  getDocuments() {
    return [...this.documents];
  }
};

// plugins/writerr-chat/src/components/ChatInput.ts
var ChatInput = class extends BaseComponent {
  constructor(options) {
    super(options);
    this.isProcessing = false;
    this.events = options.events;
  }
  render() {
    this.createInputContainer();
    this.createMessageInput();
    this.createSendButton();
    this.setupKeyboardShortcuts();
  }
  createInputContainer() {
    this.container.style.cssText = `
      padding: 16px;
      background: var(--background-primary);
      position: relative;
    `;
  }
  createMessageInput() {
    this.messageInput = this.container.createEl("textarea", {
      cls: "chat-message-input",
      attr: {
        placeholder: "Type your message...",
        rows: "2"
      }
    });
    this.messageInput.style.cssText = `
      width: 100%;
      min-height: 60px;
      max-height: 160px;
      padding: 16px 52px 16px 16px;
      border: 2px solid var(--background-modifier-border);
      border-radius: 12px;
      background: var(--background-primary);
      color: var(--text-normal);
      resize: none;
      font-family: inherit;
      font-size: 14px;
      line-height: 1.4;
      outline: none;
      transition: all 0.2s ease;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
      box-sizing: border-box;
      overflow: hidden;
      overflow-wrap: break-word;
      word-wrap: break-word;
      white-space: pre-wrap;
    `;
    this.setupAutoResize();
    this.setupInputEvents();
  }
  createSendButton() {
    this.sendButton = this.container.createEl("button", {
      cls: "writerr-send-button",
      attr: {
        "type": "submit",
        "aria-label": "Send message"
      }
    });
    this.sendButton.innerHTML = `
      <svg class="writerr-send-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="m22 2-7 20-4-9-9-4z"/>
        <path d="M22 2 11 13"/>
      </svg>
    `;
    this.setupSendButtonEvents();
  }
  setupAutoResize() {
    const autoResize = () => {
      this.messageInput.style.height = "60px";
      const scrollHeight = this.messageInput.scrollHeight;
      const maxHeight = 160;
      const newHeight = Math.min(Math.max(scrollHeight, 60), maxHeight);
      this.messageInput.style.height = newHeight + "px";
    };
    this.messageInput.addEventListener("input", autoResize);
    setTimeout(autoResize, 0);
  }
  setupInputEvents() {
    this.messageInput.addEventListener("focus", () => {
      this.messageInput.style.borderColor = "var(--interactive-accent)";
      this.messageInput.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.1), 0 0 0 1px var(--interactive-accent)";
    });
    this.messageInput.addEventListener("blur", () => {
      this.messageInput.style.borderColor = "var(--background-modifier-border)";
      this.messageInput.style.boxShadow = "0 1px 3px rgba(0, 0, 0, 0.05)";
    });
    this.messageInput.addEventListener("input", () => {
      this.updateSendButtonState();
    });
  }
  setupSendButtonEvents() {
    this.sendButton.onclick = () => this.sendMessage();
    this.sendButton.addEventListener("mouseenter", () => {
      if (!this.isProcessing) {
        this.sendButton.style.backgroundColor = "var(--background-modifier-hover)";
        this.sendButton.style.color = "var(--interactive-accent)";
        this.sendButton.style.opacity = "1";
        this.sendButton.style.transform = "scale(1.05)";
      }
    });
    this.sendButton.addEventListener("mouseleave", () => {
      if (!this.isProcessing) {
        this.sendButton.style.backgroundColor = "transparent";
        this.sendButton.style.color = "var(--text-muted)";
        this.sendButton.style.opacity = this.messageInput.value.trim() ? "1" : "0.6";
        this.sendButton.style.transform = "scale(1)";
      }
    });
    this.sendButton.addEventListener("click", () => {
      if (!this.isProcessing) {
        this.sendButton.style.transform = "scale(0.95)";
        setTimeout(() => {
          if (!this.isProcessing) {
            this.sendButton.style.transform = "scale(1)";
          }
        }, 100);
      }
    });
  }
  setupKeyboardShortcuts() {
    this.messageInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        this.sendMessage();
      } else if (e.key === "Enter" && e.shiftKey) {
        return;
      } else if (e.key === "Escape") {
        this.messageInput.blur();
      }
    });
  }
  updateSendButtonState() {
    const hasContent = this.messageInput.value.trim().length > 0;
    if (hasContent && !this.isProcessing) {
      this.sendButton.style.opacity = "1";
      this.sendButton.style.cursor = "pointer";
      this.sendButton.disabled = false;
      this.sendButton.style.color = "var(--interactive-accent)";
    } else {
      this.sendButton.style.opacity = this.isProcessing ? "0.8" : "0.6";
      this.sendButton.style.cursor = this.isProcessing ? "default" : "not-allowed";
      this.sendButton.style.color = "var(--text-muted)";
      this.sendButton.disabled = !this.isProcessing;
    }
  }
  sendMessage() {
    const message = this.messageInput.value.trim();
    if (!message || this.isProcessing)
      return;
    const mode = "chat";
    this.events.onSend(message, mode);
    this.clearInput();
  }
  setProcessingState(processing) {
    this.isProcessing = processing;
    if (processing) {
      this.sendButton.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 12a9 9 0 11-6.219-8.56"/>
        </svg>
      `;
      this.sendButton.style.color = "var(--text-muted)";
      this.sendButton.style.cursor = "default";
      this.sendButton.style.opacity = "0.8";
      this.sendButton.style.animation = "spin 1s linear infinite";
      if (!document.querySelector("#spin-animation")) {
        const style = document.createElement("style");
        style.id = "spin-animation";
        style.textContent = `
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `;
        document.head.appendChild(style);
      }
    } else {
      this.sendButton.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="m22 2-7 20-4-9-9-4z"/>
          <path d="M22 2 11 13"/>
        </svg>
      `;
      this.sendButton.style.animation = "none";
      this.sendButton.style.cursor = "pointer";
    }
    this.updateSendButtonState();
  }
  clearInput() {
    this.messageInput.value = "";
    this.messageInput.style.height = "44px";
    this.updateSendButtonState();
  }
  focusInput() {
    this.messageInput.focus();
  }
  getValue() {
    return this.messageInput.value;
  }
  setValue(value) {
    this.messageInput.value = value;
    this.updateSendButtonState();
    this.messageInput.style.height = "44px";
    const scrollHeight = this.messageInput.scrollHeight;
    const maxHeight = 160;
    const newHeight = Math.min(Math.max(scrollHeight, 44), maxHeight);
    this.messageInput.style.height = newHeight + "px";
  }
};

// plugins/writerr-chat/src/components/ChatToolbar.ts
var import_obsidian3 = require("obsidian");
var ChatToolbar = class extends BaseComponent {
  constructor(options) {
    super(options);
    this.events = options.events;
  }
  render() {
    this.createToolbarContainer();
    this.createLeftSection();
    this.createRightSection();
  }
  createToolbarContainer() {
    this.container.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      border-top: 1px solid var(--background-modifier-border);
      background: var(--background-primary);
      font-size: 12px;
      color: var(--text-muted);
    `;
  }
  createLeftSection() {
    const leftContainer = this.createElement("div", {
      cls: "writerr-toolbar-left"
    });
    this.createActionButton(leftContainer, "Add document to chat", `
      <svg class="writerr-toolbar-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <path d="M14 2v6h6"/>
        <path d="M12 11v6"/>
        <path d="M9 14h6"/>
      </svg>
    `, () => this.events.onAddDocument());
    this.createActionButton(leftContainer, "Copy entire chat", `
      <svg class="writerr-toolbar-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
      </svg>
    `, () => this.events.onCopyChat());
    this.createActionButton(leftContainer, "Clear chat", `
      <svg class="writerr-toolbar-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M18.37 2.63 14 7l-1.59-1.59a2 2 0 0 0-2.82 0L8 7l9 9 1.59-1.59a2 2 0 0 0 0-2.82L17 10l4.37-4.37a2.12 2.12 0 1 0-3-3Z"/>
        <path d="M9 8c-2 3-4 3.5-7 4l8 10c2-1 6-5 6-7"/>
        <path d="M14.5 17.5 4.5 15"/>
      </svg>
    `, () => this.events.onClearChat());
  }
  createRightSection() {
    const rightContainer = this.createElement("div", {
      cls: "toolbar-right",
      styles: {
        display: "flex",
        alignItems: "center",
        gap: "8px"
        // Reduced gap to make room
      }
    });
    this.createModelSelect(rightContainer);
    this.createPromptSelect(rightContainer);
    this.createTokenCounter(rightContainer);
  }
  createActionButton(parent, tooltip, icon, onClick) {
    const button = parent.createEl("button", {
      cls: "writerr-toolbar-button",
      attr: { "data-tooltip": tooltip }
    });
    button.innerHTML = icon;
    button.onclick = onClick;
  }
  createActionButtonWithIcon(parent, tooltip, iconName, onClick) {
    const button = parent.createEl("button");
    const iconContainer = button.createEl("div");
    const iconOptions = [iconName, "brush-cleaning", "broom", "brush"];
    let iconSet = false;
    for (const icon of iconOptions) {
      try {
        (0, import_obsidian3.setIcon)(iconContainer, icon);
        iconSet = true;
        break;
      } catch (e) {
        continue;
      }
    }
    if (!iconSet) {
      iconContainer.textContent = "\u{1F9F9}";
    }
    button.title = tooltip;
    button.setAttribute("data-tooltip", tooltip);
    button.onclick = onClick;
    button.style.cssText = `
      background: transparent !important;
      border: none !important;
      box-shadow: none !important;
      cursor: pointer !important;
      color: var(--text-muted) !important;
      padding: 4px !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      transition: color 0.2s ease !important;
    `;
    this.addHoverEffect(button, {
      "color": "var(--text-normal)"
    });
  }
  createModelSelect(parent) {
    const modelContainer = parent.createDiv();
    modelContainer.style.cssText = `
      display: flex;
      align-items: center;
      gap: 6px;
      position: relative;
    `;
    this.statusIndicator = modelContainer.createEl("div", { cls: "status-indicator" });
    this.updateStatusIndicator();
    this.modelSelect = modelContainer.createEl("select");
    this.modelSelect.style.cssText = `
      border: none !important;
      box-shadow: none !important;
      background: transparent !important;
      padding: 4px 20px 4px 4px !important;
      margin: 0 !important;
      font-size: 12px;
      color: var(--text-muted);
      cursor: pointer;
      outline: none;
      appearance: none;
      -webkit-appearance: none;
      -moz-appearance: none;
      max-width: 120px;
    `;
    const caret = modelContainer.createEl("div");
    caret.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="6,9 12,15 18,9"></polyline>
      </svg>
    `;
    caret.style.cssText = `
      pointer-events: none;
      color: var(--text-muted);
      position: absolute;
      right: 2px;
      display: flex;
      align-items: center;
    `;
    this.populateModelOptions();
    this.modelSelect.addEventListener("change", () => {
      this.events.onModelChange(this.modelSelect.value);
    });
  }
  createPromptSelect(parent) {
    const promptContainer = parent.createDiv();
    promptContainer.style.cssText = `
      display: flex;
      align-items: center;
      gap: 6px;
      position: relative;
    `;
    this.promptSelect = promptContainer.createEl("select");
    this.promptSelect.style.cssText = `
      border: none !important;
      box-shadow: none !important;
      background: transparent !important;
      padding: 4px 20px 4px 4px !important;
      margin: 0 !important;
      font-size: 12px;
      color: var(--text-muted);
      cursor: pointer;
      outline: none;
      appearance: none;
      -webkit-appearance: none;
      -moz-appearance: none;
      max-width: 100px;
    `;
    const caret = promptContainer.createEl("div");
    caret.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="6,9 12,15 18,9"></polyline>
      </svg>
    `;
    caret.style.cssText = `
      pointer-events: none;
      color: var(--text-muted);
      position: absolute;
      right: 2px;
      display: flex;
      align-items: center;
    `;
    this.populatePromptOptions();
    this.promptSelect.addEventListener("change", () => {
      this.events.onPromptChange(this.promptSelect.value);
    });
  }
  createTokenCounter(parent) {
    this.tokenCounter = parent.createEl("span", { cls: "writerr-token-count" });
    this.updateTokenCounter(0, 9e4);
  }
  // Context button removed - belongs in context area header, not toolbar
  populateModelOptions() {
    const providers = {
      "OpenAI": {
        "GPT-4": ["gpt-4", "gpt-4-turbo", "gpt-4-turbo-preview"],
        "GPT-3.5": ["gpt-3.5-turbo", "gpt-3.5-turbo-16k"]
      },
      "Anthropic": {
        "Claude-3": ["claude-3-opus", "claude-3-sonnet", "claude-3-haiku"],
        "Claude-2": ["claude-2", "claude-2.1"]
      },
      "Google": {
        "Gemini": ["gemini-pro", "gemini-pro-vision"]
      }
    };
    this.modelSelect.createEl("option", { value: "", text: "Select Model" });
    for (const [provider, families] of Object.entries(providers)) {
      const providerGroup = this.modelSelect.createEl("optgroup", { label: provider });
      for (const [family, models] of Object.entries(families)) {
        const familyGroup = this.modelSelect.createEl("optgroup", { label: `  ${family}` });
        models.forEach((model) => {
          familyGroup.createEl("option", { value: model, text: `    ${model}` });
        });
      }
    }
  }
  populatePromptOptions() {
    this.promptSelect.createEl("option", { value: "", text: "Prompts" });
    const defaultPrompts = [
      "Creative Writing",
      "Technical Writing",
      "Academic Style",
      "Casual Tone",
      "Professional"
    ];
    defaultPrompts.forEach((prompt) => {
      this.promptSelect.createEl("option", { value: prompt.toLowerCase().replace(" ", "-"), text: prompt });
    });
  }
  updateStatusIndicator() {
    var _a, _b;
    if (!this.statusIndicator)
      return;
    const hasEditorialEngine = !!((_a = window.Writerr) == null ? void 0 : _a.editorial);
    const hasTrackEdits = !!((_b = window.WriterrlAPI) == null ? void 0 : _b.trackEdits);
    let color = "var(--color-green)";
    let status = "All systems ready";
    if (!hasEditorialEngine && !hasTrackEdits) {
      color = "var(--color-red)";
      status = "Limited functionality";
    } else if (!hasEditorialEngine || !hasTrackEdits) {
      color = "var(--color-orange)";
      status = "Some features unavailable";
    }
    this.statusIndicator.style.cssText = `
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: ${color};
      transition: background-color 0.3s ease;
      flex-shrink: 0;
    `;
    this.statusIndicator.title = status;
  }
  updateTokenCounter(used, total) {
    if (!this.tokenCounter)
      return;
    const percentage = used / total * 100;
    let color = "var(--text-muted)";
    if (percentage > 90) {
      color = "var(--color-red)";
    } else if (percentage > 70) {
      color = "var(--color-orange)";
    }
    this.tokenCounter.textContent = `${used.toLocaleString()} / ${total.toLocaleString()}`;
    this.tokenCounter.style.color = color;
  }
};

// plugins/writerr-chat/src/components/MessageList.ts
var MessageList = class extends BaseComponent {
  constructor(options) {
    super(options);
    this.messages = [];
    this.messageBubbles = [];
    this.actionHandler = options.actionHandler;
  }
  render() {
    this.createMessageContainer();
    this.showEmptyState();
  }
  createMessageContainer() {
    this.container.style.cssText = `
      flex: 1;
      overflow-y: auto;
      padding: 20px;
      min-height: 0;
      scroll-behavior: smooth;
      position: relative;
    `;
    this.container.addClass("custom-scrollbar");
    if (!document.querySelector("#custom-scrollbar-styles")) {
      const style = document.createElement("style");
      style.id = "custom-scrollbar-styles";
      style.textContent = `
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: var(--scrollbar-thumb-bg);
          border-radius: 3px;
          opacity: 0;
          transition: opacity 0.2s ease;
        }
        .custom-scrollbar:hover::-webkit-scrollbar-thumb {
          opacity: 1;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: var(--scrollbar-thumb-hover);
        }
      `;
      document.head.appendChild(style);
    }
  }
  showEmptyState() {
    if (this.messages.length > 0)
      return;
    const emptyState = this.container.createEl("div", {
      cls: "chat-empty-state"
    });
    emptyState.style.cssText = `
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      text-align: center;
      padding: 40px 20px;
      color: var(--text-muted);
      gap: 16px;
    `;
    const icon = emptyState.createEl("div");
    icon.innerHTML = `
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        <path d="M8 10h8"/>
        <path d="M8 14h4"/>
      </svg>
    `;
    icon.style.cssText = `
      color: var(--text-faint);
      opacity: 0.6;
    `;
    const title = emptyState.createEl("h3", { text: "Start a conversation" });
    title.style.cssText = `
      font-size: 18px;
      font-weight: 500;
      margin: 0;
      color: var(--text-muted);
    `;
    const description = emptyState.createEl("p", {
      text: "Type a message below to begin chatting. Select a mode from the header to customize the AI behavior."
    });
    description.style.cssText = `
      font-size: 14px;
      margin: 0;
      max-width: 300px;
      line-height: 1.5;
      color: var(--text-faint);
    `;
  }
  hideEmptyState() {
    const emptyState = this.container.querySelector(".chat-empty-state");
    if (emptyState) {
      emptyState.remove();
    }
  }
  setMessages(messages) {
    this.messages = messages;
    this.renderMessages();
  }
  addMessage(message) {
    this.messages.push(message);
    this.renderNewMessage(message);
    this.scrollToBottom();
  }
  renderMessages() {
    this.clearMessages();
    if (this.messages.length === 0) {
      this.showEmptyState();
      return;
    }
    this.hideEmptyState();
    this.messages.forEach((message) => {
      this.renderMessage(message);
    });
    this.scrollToBottom();
  }
  renderNewMessage(message) {
    this.hideEmptyState();
    this.renderMessage(message, true);
  }
  renderMessage(message, animate = false) {
    const messageContainer = this.container.createEl("div");
    if (animate) {
      messageContainer.style.opacity = "0";
      messageContainer.style.transform = "translateY(20px)";
      messageContainer.style.transition = "all 0.3s ease";
      setTimeout(() => {
        messageContainer.style.opacity = "1";
        messageContainer.style.transform = "translateY(0)";
      }, 50);
    }
    const messageBubble = new MessageBubble({
      plugin: this.plugin,
      container: messageContainer,
      message,
      actionHandler: this.actionHandler
    });
    messageBubble.render();
    this.messageBubbles.push(messageBubble);
  }
  clearMessages() {
    this.messageBubbles.forEach((bubble) => bubble.destroy());
    this.messageBubbles = [];
    this.container.empty();
    this.createMessageContainer();
  }
  scrollToBottom(smooth = true) {
    requestAnimationFrame(() => {
      const scrollOptions = {
        top: this.container.scrollHeight,
        behavior: smooth ? "smooth" : "auto"
      };
      this.container.scrollTo(scrollOptions);
    });
  }
  updateMessage(messageIndex, newMessage) {
    if (messageIndex < 0 || messageIndex >= this.messages.length)
      return;
    this.messages[messageIndex] = newMessage;
    const messageBubble = this.messageBubbles[messageIndex];
    if (messageBubble) {
      messageBubble.destroy();
      const messageContainer = this.container.children[messageIndex];
      if (messageContainer) {
        const newBubble = new MessageBubble({
          plugin: this.plugin,
          container: messageContainer,
          message: newMessage,
          actionHandler: this.actionHandler
        });
        newBubble.render();
        this.messageBubbles[messageIndex] = newBubble;
      }
    }
  }
  removeMessage(messageIndex) {
    if (messageIndex < 0 || messageIndex >= this.messages.length)
      return;
    this.messages.splice(messageIndex, 1);
    const messageBubble = this.messageBubbles[messageIndex];
    if (messageBubble) {
      const messageContainer = messageBubble.container;
      messageContainer.style.animation = "messageSlideOut 0.3s ease forwards";
      if (!document.querySelector("#message-animations")) {
        const style = document.createElement("style");
        style.id = "message-animations";
        style.textContent = `
          @keyframes messageSlideOut {
            from {
              opacity: 1;
              transform: translateX(0);
              max-height: 200px;
              margin: 16px 0;
            }
            to {
              opacity: 0;
              transform: translateX(100px);
              max-height: 0;
              margin: 0;
            }
          }
        `;
        document.head.appendChild(style);
      }
      setTimeout(() => {
        messageBubble.destroy();
        this.messageBubbles.splice(messageIndex, 1);
        if (this.messages.length === 0) {
          this.showEmptyState();
        }
      }, 300);
    }
  }
  getMessages() {
    return [...this.messages];
  }
  isEmpty() {
    return this.messages.length === 0;
  }
  destroy() {
    this.messageBubbles.forEach((bubble) => bubble.destroy());
    this.messageBubbles = [];
    super.destroy();
  }
};

// plugins/writerr-chat/src/components/SessionManager.ts
var SessionManager = class extends BaseComponent {
  constructor(options) {
    super(options);
    this.handleKeyDown = (e) => {
      if (e.key === "Escape") {
        this.close();
      }
    };
    this.onSessionSelect = options.onSessionSelect;
    this.onSessionDelete = options.onSessionDelete;
    this.onNewSession = options.onNewSession;
  }
  render() {
    this.createOverlay();
    this.createModal();
    this.createHeader();
    this.createSessionList();
    this.createNewSessionButton();
    this.setupEventHandlers();
  }
  createOverlay() {
    this.overlay = this.container.createEl("div", { cls: "session-manager-overlay" });
    this.overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      backdrop-filter: blur(4px);
      animation: fadeIn 0.2s ease;
    `;
    if (!document.querySelector("#session-manager-animations")) {
      const style = document.createElement("style");
      style.id = "session-manager-animations";
      style.textContent = `
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes modalSlideIn {
          from {
            opacity: 0;
            transform: translateY(-20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @keyframes sessionSlideIn {
          from {
            opacity: 0;
            transform: translateX(-10px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `;
      document.head.appendChild(style);
    }
  }
  createModal() {
    this.modal = this.overlay.createEl("div", { cls: "session-manager-modal" });
    this.modal.style.cssText = `
      background: var(--background-primary);
      border: 1px solid var(--background-modifier-border);
      border-radius: 12px;
      padding: 0;
      min-width: 400px;
      max-width: 500px;
      max-height: 600px;
      overflow: hidden;
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.3);
      animation: modalSlideIn 0.3s ease;
      display: flex;
      flex-direction: column;
    `;
  }
  createHeader() {
    const header = this.modal.createEl("div", { cls: "session-manager-header" });
    header.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px 24px;
      border-bottom: 1px solid var(--background-modifier-border);
      background: var(--background-primary);
    `;
    const titleSection = header.createEl("div");
    titleSection.style.cssText = "display: flex; align-items: center; gap: 12px;";
    const icon = titleSection.createEl("div");
    icon.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
        <path d="M3 3v5h5"/>
        <path d="M12 7v5l4 2"/>
      </svg>
    `;
    icon.style.cssText = "color: var(--interactive-accent);";
    const title = titleSection.createEl("h3", { text: "Chat Sessions" });
    title.style.cssText = `
      margin: 0;
      color: var(--text-normal);
      font-size: 18px;
      font-weight: 500;
    `;
    const closeButton = header.createEl("button");
    closeButton.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M18 6L6 18"/>
        <path d="M6 6l12 12"/>
      </svg>
    `;
    closeButton.style.cssText = `
      background: none;
      border: none;
      cursor: pointer;
      color: var(--text-muted);
      padding: 6px;
      border-radius: 6px;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    closeButton.onclick = () => this.close();
    this.addHoverEffect(closeButton, {
      "background-color": "var(--background-modifier-hover)",
      "color": "var(--text-normal)"
    });
  }
  createSessionList() {
    const sessionListContainer = this.modal.createEl("div", { cls: "session-list-container" });
    sessionListContainer.style.cssText = `
      flex: 1;
      overflow-y: auto;
      padding: 16px 0;
      max-height: 400px;
    `;
    const sessionsList = sessionListContainer.createEl("div", { cls: "sessions-list" });
    const sessions = this.plugin.getChatSessions();
    if (sessions.length === 0) {
      this.createEmptySessionsState(sessionsList);
    } else {
      this.renderSessions(sessionsList, sessions);
    }
  }
  createEmptySessionsState(container) {
    const emptyState = container.createEl("div", { cls: "empty-sessions-state" });
    emptyState.style.cssText = `
      text-align: center;
      padding: 40px 20px;
      color: var(--text-muted);
    `;
    const icon = emptyState.createEl("div");
    icon.innerHTML = `
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    `;
    icon.style.cssText = `
      color: var(--text-faint);
      margin-bottom: 16px;
      opacity: 0.6;
    `;
    emptyState.createEl("p", {
      text: "No chat sessions yet. Start a conversation to create your first session."
    });
  }
  renderSessions(container, sessions) {
    sessions.forEach((session, index) => {
      var _a, _b;
      const sessionItem = container.createEl("div", { cls: "session-item" });
      sessionItem.style.cssText = `
        padding: 16px 24px;
        cursor: pointer;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid var(--background-modifier-border-focus);
        transition: all 0.2s ease;
        position: relative;
        animation: sessionSlideIn 0.3s ease forwards;
        animation-delay: ${index * 0.05}s;
        opacity: 0;
      `;
      if (((_a = this.plugin.currentSession) == null ? void 0 : _a.id) === session.id) {
        sessionItem.style.backgroundColor = "var(--background-modifier-hover)";
        sessionItem.style.borderLeft = "3px solid var(--interactive-accent)";
        sessionItem.style.paddingLeft = "21px";
      }
      const sessionInfo = sessionItem.createEl("div", { cls: "session-info" });
      sessionInfo.style.cssText = "flex: 1; min-width: 0;";
      const sessionTitle = sessionInfo.createEl("div", {
        text: session.title || `Session ${sessions.indexOf(session) + 1}`,
        cls: "session-title"
      });
      sessionTitle.style.cssText = `
        font-weight: 500;
        color: var(--text-normal);
        margin-bottom: 4px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      `;
      const sessionMeta = sessionInfo.createEl("div", { cls: "session-meta" });
      sessionMeta.style.cssText = `
        display: flex;
        align-items: center;
        gap: 12px;
        font-size: 12px;
        color: var(--text-muted);
      `;
      const messageCount = ((_b = session.messages) == null ? void 0 : _b.length) || 0;
      const messageCountEl = sessionMeta.createEl("span", {
        text: `${messageCount} message${messageCount !== 1 ? "s" : ""}`
      });
      if (session.messages && session.messages.length > 0) {
        const lastMessage = session.messages[session.messages.length - 1];
        const lastMessageTime = new Date(lastMessage.timestamp);
        const timeAgo = this.getTimeAgo(lastMessageTime);
        sessionMeta.createEl("span", { text: "\u2022" });
        sessionMeta.createEl("span", { text: timeAgo });
      }
      const actionsSection = sessionItem.createEl("div", { cls: "session-actions" });
      actionsSection.style.cssText = `
        display: flex;
        gap: 4px;
        opacity: 0;
        transition: opacity 0.2s ease;
      `;
      const deleteBtn = actionsSection.createEl("button", { cls: "session-delete-btn" });
      deleteBtn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
        </svg>
      `;
      deleteBtn.title = "Delete session";
      deleteBtn.style.cssText = `
        background: none;
        border: none;
        cursor: pointer;
        color: var(--text-muted);
        padding: 6px;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
      `;
      sessionItem.onclick = (e) => {
        if (e.target === deleteBtn || deleteBtn.contains(e.target))
          return;
        this.onSessionSelect(session.id);
        this.close();
      };
      deleteBtn.onclick = (e) => {
        e.stopPropagation();
        this.confirmDeleteSession(session);
      };
      sessionItem.addEventListener("mouseenter", () => {
        var _a2;
        if (((_a2 = this.plugin.currentSession) == null ? void 0 : _a2.id) !== session.id) {
          sessionItem.style.backgroundColor = "var(--background-modifier-hover)";
        }
        actionsSection.style.opacity = "1";
      });
      sessionItem.addEventListener("mouseleave", () => {
        var _a2;
        if (((_a2 = this.plugin.currentSession) == null ? void 0 : _a2.id) !== session.id) {
          sessionItem.style.backgroundColor = "transparent";
        }
        actionsSection.style.opacity = "0";
      });
      this.addHoverEffect(deleteBtn, {
        "background-color": "var(--background-modifier-error)",
        "color": "var(--text-on-accent)"
      });
    });
  }
  createNewSessionButton() {
    const buttonContainer = this.modal.createEl("div");
    buttonContainer.style.cssText = `
      padding: 16px 24px;
      border-top: 1px solid var(--background-modifier-border);
      background: var(--background-primary);
    `;
    const newSessionBtn = buttonContainer.createEl("button", { cls: "new-session-button" });
    newSessionBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 5v14"/>
        <path d="M5 12h14"/>
      </svg>
      <span>New Session</span>
    `;
    newSessionBtn.style.cssText = `
      width: 100%;
      padding: 12px 16px;
      background: var(--interactive-accent);
      color: var(--text-on-accent);
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 500;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: all 0.2s ease;
    `;
    newSessionBtn.onclick = () => {
      this.onNewSession();
      this.close();
    };
    this.addHoverEffect(newSessionBtn, {
      "transform": "translateY(-1px)",
      "box-shadow": "0 4px 12px rgba(0, 0, 0, 0.15)"
    });
  }
  confirmDeleteSession(session) {
    var _a;
    const messageCount = ((_a = session.messages) == null ? void 0 : _a.length) || 0;
    const confirmMessage = `Delete "${session.title || "Untitled Session"}"?

This will permanently delete ${messageCount} message${messageCount !== 1 ? "s" : ""}.`;
    if (confirm(confirmMessage)) {
      this.onSessionDelete(session.id);
      this.modal.empty();
      this.createModal();
      this.createHeader();
      this.createSessionList();
      this.createNewSessionButton();
    }
  }
  setupEventHandlers() {
    this.overlay.onclick = (e) => {
      if (e.target === this.overlay) {
        this.close();
      }
    };
    document.addEventListener("keydown", this.handleKeyDown);
  }
  getTimeAgo(date) {
    const now = /* @__PURE__ */ new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMinutes = Math.floor(diffInMs / 6e4);
    if (diffInMinutes < 1)
      return "Just now";
    if (diffInMinutes < 60)
      return `${diffInMinutes}m ago`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24)
      return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7)
      return `${diffInDays}d ago`;
    return date.toLocaleDateString();
  }
  show() {
    this.render();
  }
  close() {
    document.removeEventListener("keydown", this.handleKeyDown);
    this.overlay.style.animation = "fadeOut 0.2s ease forwards";
    const style = document.createElement("style");
    style.textContent = `
      @keyframes fadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
      }
    `;
    document.head.appendChild(style);
    setTimeout(() => {
      this.destroy();
      document.head.removeChild(style);
    }, 200);
  }
  destroy() {
    if (this.overlay && this.overlay.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay);
    }
    document.removeEventListener("keydown", this.handleKeyDown);
  }
};

// plugins/writerr-chat/src/chat-view.ts
var VIEW_TYPE_CHAT = "writerr-chat-view";
var ChatView = class extends import_obsidian4.ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
  }
  getViewType() {
    return VIEW_TYPE_CHAT;
  }
  getDisplayText() {
    return "Writerr Chat";
  }
  getIcon() {
    return "message-circle";
  }
  async onOpen() {
    const container = this.containerEl.children[1];
    container.empty();
    container.addClass("writerr-chat-view");
    container.style.cssText = `
      display: flex;
      flex-direction: column;
      height: 100%;
      background: var(--background-primary);
      border: 1px solid var(--background-modifier-border);
      border-radius: 8px;
      overflow: hidden;
    `;
    this.createComponents(container);
    this.setupEventHandlers();
    this.applyTheme();
    if (!this.plugin.currentSession) {
      this.plugin.newChatSession();
    }
    this.refresh();
    this.scheduleDelayedInitialization();
  }
  createComponents(container) {
    const headerContainer = container.createEl("div", { cls: "chat-header-container" });
    this.chatHeader = new ChatHeader({
      plugin: this.plugin,
      container: headerContainer,
      events: {
        onHistoryClick: () => this.showSessionManager(),
        onSettingsClick: () => this.showSettings(),
        onModeChange: (mode) => this.handleModeChange(mode)
      }
    });
    this.chatHeader.render();
    const messageContainer = container.createEl("div", { cls: "chat-messages-container" });
    this.messageList = new MessageList({
      plugin: this.plugin,
      container: messageContainer,
      actionHandler: {
        onCopy: (message) => this.copyMessage(message),
        onRetry: (message) => this.retryMessage(message),
        onInfo: (message) => this.showMessageInfo(message)
      }
    });
    this.messageList.render();
    const contextContainer = container.createEl("div", { cls: "chat-context-container" });
    this.contextArea = new ContextArea({
      plugin: this.plugin,
      container: contextContainer,
      events: {
        onDocumentAdd: (doc) => this.handleDocumentAdd(doc),
        onDocumentRemove: (doc) => this.handleDocumentRemove(doc),
        onDocumentOpen: (doc) => this.openDocument(doc)
      }
    });
    this.contextArea.render();
    const inputContainer = container.createEl("div", { cls: "chat-input-container" });
    this.chatInput = new ChatInput({
      plugin: this.plugin,
      container: inputContainer,
      events: {
        onSend: (message, mode) => this.sendMessage(message, mode),
        onModeChange: (mode) => this.handleModeChange(mode)
      }
    });
    this.chatInput.render();
    const toolbarContainer = container.createEl("div", { cls: "chat-toolbar-container" });
    this.chatToolbar = new ChatToolbar({
      plugin: this.plugin,
      container: toolbarContainer,
      events: {
        onAddDocument: () => this.addDocumentToChat(),
        onCopyChat: () => this.copyEntireChat(),
        onClearChat: () => this.clearChat(),
        onModelChange: (model) => this.handleModelChange(model),
        onPromptChange: (prompt) => this.handlePromptChange(prompt)
      }
    });
    this.chatToolbar.render();
  }
  setupEventHandlers() {
    this.messageList.container.addEventListener("starter-prompt-selected", (e) => {
      this.chatInput.setValue(e.detail.prompt);
      this.chatInput.focusInput();
    });
  }
  scheduleDelayedInitialization() {
    setTimeout(() => {
      console.log("Delayed mode refresh after chat view opened");
      this.chatHeader.populateModeOptions();
    }, 1e3);
    setTimeout(() => {
      this.chatHeader.updateStatusIndicator();
    }, 1500);
  }
  async sendMessage(message, mode) {
    if (!message.trim())
      return;
    const selectedMode = mode || this.chatHeader.getSelectedMode();
    this.chatInput.setProcessingState(true);
    this.chatHeader.updateStatusIndicator();
    try {
      await this.plugin.sendMessage(message, selectedMode);
      this.refresh();
    } catch (error) {
      console.error("Error sending message:", error);
      new import_obsidian4.Notice(`Error: ${error.message}`);
    } finally {
      this.chatInput.setProcessingState(false);
      this.chatHeader.updateStatusIndicator();
    }
  }
  copyMessage(message) {
    navigator.clipboard.writeText(message.content).then(() => {
      new import_obsidian4.Notice("Message copied to clipboard");
    }).catch((err) => {
      console.error("Failed to copy message:", err);
      new import_obsidian4.Notice("Failed to copy message");
    });
  }
  async retryMessage(message) {
    var _a;
    const messages = ((_a = this.plugin.currentSession) == null ? void 0 : _a.messages) || [];
    const messageIndex = messages.findIndex((m) => m.timestamp === message.timestamp);
    if (messageIndex >= 0 && message.role === "assistant") {
      const userMessage = messages[messageIndex - 1];
      if (userMessage && userMessage.role === "user") {
        this.plugin.currentSession.messages = messages.slice(0, messageIndex);
        this.refresh();
        const parsedMessage = this.plugin.parseMessageIntent(userMessage.content);
        try {
          const selectedMode = this.chatHeader.getSelectedMode();
          if (selectedMode && selectedMode !== "chat") {
            parsedMessage.mode = selectedMode;
          }
          let fullContext;
          if (this.plugin.settings.contextLines > 0) {
            fullContext = await this.plugin.getDocumentContext();
          }
          if (selectedMode && selectedMode !== "chat") {
            await this.plugin.processWithEditorialEngine(parsedMessage, fullContext);
          } else if (parsedMessage.intent === "edit" || parsedMessage.intent === "improve") {
            await this.plugin.processWithEditorialEngine(parsedMessage, fullContext);
          } else {
            await this.plugin.processWithAIProvider(parsedMessage, fullContext);
          }
          this.plugin.currentSession.updatedAt = Date.now();
          if (this.plugin.settings.autoSaveChats) {
            await this.plugin.saveChatSessions();
          }
          this.refresh();
        } catch (error) {
          console.error("Error retrying message:", error);
          new import_obsidian4.Notice(`Error: ${error.message}`);
          const { generateId: generateId2 } = await Promise.resolve().then(() => (init_utils(), utils_exports));
          const errorMessage = {
            id: generateId2(),
            role: "assistant",
            content: `I encountered an error: ${error.message}. Please try again.`,
            timestamp: Date.now(),
            metadata: {
              error: true,
              errorMessage: error.message
            }
          };
          this.plugin.currentSession.messages.push(errorMessage);
          this.refresh();
        }
      }
    }
  }
  showMessageInfo(message) {
    const info = {
      role: message.role,
      timestamp: new Date(message.timestamp).toLocaleString(),
      length: message.content.length,
      tokens: Math.ceil(message.content.length / 4)
      // Rough token estimation
    };
    const infoText = [
      `Role: ${info.role}`,
      `Timestamp: ${info.timestamp}`,
      `Length: ${info.length} characters`,
      `Estimated tokens: ${info.tokens}`
    ].join("\n");
    new import_obsidian4.Notice(infoText, 5e3);
  }
  handleModeChange(mode) {
    this.plugin.settings.defaultMode = mode;
    this.plugin.saveSettings();
  }
  handleDocumentAdd(doc) {
    console.log("Document added to context:", doc);
  }
  handleDocumentRemove(doc) {
    console.log("Document removed from context:", doc);
  }
  async openDocument(doc) {
    try {
      const file = this.app.vault.getAbstractFileByPath(doc.path);
      if (file) {
        await this.app.workspace.openLinkText(doc.path, "", true);
      }
    } catch (error) {
      console.error("Error opening document:", error);
      new import_obsidian4.Notice(`Failed to open document: ${doc.name}`);
    }
  }
  showSessionManager() {
    if (this.sessionManager) {
      this.sessionManager.destroy();
    }
    const overlayContainer = this.containerEl.createEl("div");
    this.sessionManager = new SessionManager({
      plugin: this.plugin,
      container: overlayContainer,
      onSessionSelect: (sessionId) => this.selectSession(sessionId),
      onSessionDelete: (sessionId) => this.deleteSession(sessionId),
      onNewSession: () => this.createNewSession()
    });
    this.sessionManager.show();
  }
  showSettings() {
    new import_obsidian4.Notice("Settings panel coming soon!");
  }
  selectSession(sessionId) {
    this.plugin.setCurrentSession(sessionId);
    this.refresh();
  }
  deleteSession(sessionId) {
    this.plugin.deleteSession(sessionId);
    this.refresh();
  }
  createNewSession() {
    this.plugin.newChatSession();
    this.refresh();
  }
  refresh() {
    this.updateMessageList();
    this.updateHeader();
  }
  updateMessageList() {
    var _a;
    const messages = ((_a = this.plugin.currentSession) == null ? void 0 : _a.messages) || [];
    this.messageList.setMessages(messages);
  }
  updateHeader() {
    if (this.plugin.settings.defaultMode) {
      this.chatHeader.setMode(this.plugin.settings.defaultMode);
    }
    this.chatHeader.updateStatusIndicator();
  }
  applyTheme() {
    const container = this.containerEl;
    container.removeClass("theme-default", "theme-compact", "theme-minimal");
    container.addClass(`theme-${this.plugin.settings.theme}`);
    if (this.plugin.settings.theme === "compact") {
      this.messageList.container.style.fontSize = "14px";
    } else if (this.plugin.settings.theme === "minimal") {
      this.messageList.container.style.fontSize = "13px";
    }
  }
  // Public API methods for external access
  refreshModeOptions() {
    this.chatHeader.refreshModeOptions();
  }
  getSelectedMode() {
    return this.chatHeader.getSelectedMode();
  }
  setMode(mode) {
    this.chatHeader.setMode(mode);
  }
  // Toolbar event handlers
  addDocumentToChat() {
    const addButton = this.contextArea.container.querySelector(".context-add-button");
    if (addButton) {
      addButton.click();
    }
  }
  copyEntireChat() {
    var _a;
    const messages = ((_a = this.plugin.currentSession) == null ? void 0 : _a.messages) || [];
    const chatText = messages.map((msg) => `${msg.role === "user" ? "You" : "Assistant"}: ${msg.content}`).join("\n\n");
    navigator.clipboard.writeText(chatText).then(() => {
      new import_obsidian4.Notice("Chat copied to clipboard");
    }).catch(() => {
      new import_obsidian4.Notice("Failed to copy chat");
    });
  }
  clearChat() {
    if (this.plugin.currentSession) {
      this.plugin.currentSession.messages = [];
      this.refresh();
      new import_obsidian4.Notice("Chat cleared");
    }
  }
  handleModelChange(model) {
    console.log("Model changed to:", model);
    new import_obsidian4.Notice(`Model changed to ${model}`);
  }
  handlePromptChange(prompt) {
    console.log("Prompt template selected:", prompt);
    new import_obsidian4.Notice(`Prompt template: ${prompt}`);
  }
  async onClose() {
    var _a, _b, _c, _d, _e;
    (_a = this.chatHeader) == null ? void 0 : _a.destroy();
    (_b = this.messageList) == null ? void 0 : _b.destroy();
    (_c = this.contextArea) == null ? void 0 : _c.destroy();
    (_d = this.chatInput) == null ? void 0 : _d.destroy();
    (_e = this.sessionManager) == null ? void 0 : _e.destroy();
  }
};

// plugins/writerr-chat/src/main.ts
init_utils();

// plugins/writerr-chat/src/ai-provider-manager.ts
var AIProviderManager = class {
  constructor(settings) {
    this.settings = settings;
  }
  updateSettings(settings) {
    this.settings = settings;
  }
  async sendMessage(messages, context) {
    var _a, _b;
    const provider = this.getProvider(this.settings.defaultProvider);
    if (!provider) {
      throw new Error("No AI provider configured");
    }
    if (!provider.apiKey) {
      throw new Error(`API key not configured for ${provider.name}`);
    }
    const requestMessages = this.buildRequestMessages(messages, context);
    try {
      if (provider.id === "openai" || ((_a = provider.baseUrl) == null ? void 0 : _a.includes("openai"))) {
        return await this.sendOpenAIMessage(provider, requestMessages);
      } else if (provider.id === "anthropic" || ((_b = provider.baseUrl) == null ? void 0 : _b.includes("anthropic"))) {
        return await this.sendAnthropicMessage(provider, requestMessages);
      } else {
        return await this.sendOpenAIMessage(provider, requestMessages);
      }
    } catch (error) {
      console.error("AI Provider Error:", error);
      throw new Error(`AI Provider failed: ${error.message}`);
    }
  }
  buildRequestMessages(messages, context) {
    const requestMessages = [];
    if (context) {
      requestMessages.push({
        role: "system",
        content: `Here's the current document context:

${context}

Please use this context to inform your responses.`
      });
    }
    for (const message of messages) {
      if (message.role !== "system") {
        requestMessages.push({
          role: message.role,
          content: message.content
        });
      }
    }
    return requestMessages;
  }
  async sendOpenAIMessage(provider, messages) {
    const baseUrl = provider.baseUrl || "https://api.openai.com/v1";
    const url = `${baseUrl}/chat/completions`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${provider.apiKey}`
      },
      body: JSON.stringify({
        model: provider.model,
        messages,
        max_tokens: this.settings.maxTokens,
        temperature: this.settings.temperature,
        stream: false
      })
    });
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HTTP ${response.status}: ${error}`);
    }
    const data = await response.json();
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error("Invalid response format from AI provider");
    }
    return data.choices[0].message.content;
  }
  async sendAnthropicMessage(provider, messages) {
    const baseUrl = provider.baseUrl || "https://api.anthropic.com";
    const url = `${baseUrl}/v1/messages`;
    const systemMessages = messages.filter((m) => m.role === "system");
    const conversationMessages = messages.filter((m) => m.role !== "system");
    const systemPrompt = systemMessages.map((m) => m.content).join("\n\n");
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": provider.apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: provider.model,
        max_tokens: this.settings.maxTokens,
        temperature: this.settings.temperature,
        system: systemPrompt,
        messages: conversationMessages
      })
    });
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HTTP ${response.status}: ${error}`);
    }
    const data = await response.json();
    if (!data.content || !data.content[0] || !data.content[0].text) {
      throw new Error("Invalid response format from Anthropic API");
    }
    return data.content[0].text;
  }
  getProvider(providerId) {
    return this.settings.providers.find((p) => p.id === providerId);
  }
  getProviders() {
    return [...this.settings.providers];
  }
  validateProvider(provider) {
    if (!provider.name || !provider.model) {
      return { valid: false, error: "Provider name and model are required" };
    }
    if (!provider.apiKey) {
      return { valid: false, error: "API key is required" };
    }
    if (provider.baseUrl) {
      try {
        new URL(provider.baseUrl);
      } catch (e) {
        return { valid: false, error: "Invalid base URL format" };
      }
    }
    return { valid: true };
  }
};

// plugins/writerr-chat/src/main.ts
var DEFAULT_SETTINGS = {
  defaultProvider: "openai",
  providers: [
    {
      id: "openai",
      name: "OpenAI",
      model: "gpt-4",
      baseUrl: "https://api.openai.com/v1",
      apiKey: ""
    }
  ],
  chatPosition: "right",
  autoSaveChats: true,
  contextLines: 10,
  maxTokens: 2e3,
  temperature: 0.7,
  enableMarkdown: true,
  showTimestamps: true,
  theme: "default"
};
var WriterrlChatPlugin = class extends import_obsidian5.Plugin {
  constructor() {
    super(...arguments);
    this.currentSession = null;
    this.chatSessions = /* @__PURE__ */ new Map();
  }
  async onload() {
    await this.loadSettings();
    this.aiProviderManager = new AIProviderManager(this.settings);
    this.loadCustomStyles();
    this.initializeGlobalAPI();
    this.registerView(VIEW_TYPE_CHAT, (leaf) => new ChatView(leaf, this));
    this.addCommands();
    this.addRibbonIcon("message-circle", "Open Writerr Chat", () => {
      this.openChat();
    });
    this.addSettingTab(new WriterrlChatSettingsTab(this.app, this));
    await this.loadChatSessions();
    this.listenForEditorialEngine();
    console.log("Writerr Chat plugin loaded");
  }
  loadCustomStyles() {
    const styles = `
/* Nuclear CSS - Override EVERYTHING */
.writerr-send-button,
.writerr-toolbar-button,
.writerr-context-action,
.context-add-button,
.writerr-message-actions button,
.chat-control-button {
  background: none !important;
  border: none !important;
  box-shadow: none !important;
  outline: none !important;
  padding: 0 !important;
  margin: 0 !important;
  cursor: pointer !important;
  color: var(--text-muted) !important;
  transition: color 0.2s ease !important;
}

/* Send Button - Lifted off the edges */
.writerr-send-button {
  position: absolute !important;
  right: 16px !important;
  bottom: 16px !important;
  padding: 8px !important;
  border-radius: var(--radius-s) !important;
}

.writerr-send-button:hover:not(:disabled) {
  color: var(--interactive-accent) !important;
  background: var(--background-modifier-hover) !important;
}

.writerr-send-button:disabled {
  color: var(--text-faint) !important;
  cursor: not-allowed !important;
}

.writerr-send-icon {
  width: 16px !important;
  height: 16px !important;
  stroke-width: 2 !important;
}

/* Bottom Toolbar - Larger Icons, Closer Together */
.writerr-toolbar-left {
  display: flex !important;
  align-items: center !important;
  gap: 8px !important;
  margin-left: 8px !important;
}

/* Toolbar Right - Adjusted spacing for dropdowns */
.toolbar-right {
  display: flex !important;
  align-items: center !important;
  gap: 6px !important;
  margin-right: 8px !important;
}

.writerr-toolbar-button {
  padding: 8px !important;
  border-radius: var(--radius-s) !important;
}

.writerr-toolbar-button:hover {
  color: var(--text-normal) !important;
  background: var(--background-modifier-hover) !important;
}

.writerr-toolbar-icon {
  width: 18px !important;
  height: 18px !important;
  stroke-width: 2 !important;
}

/* Chat Input Container - NO BORDERS */
.chat-input-container {
  border-top: none !important;
  border-bottom: none !important;
  border: none !important;
}

.chat-message-input {
  border: 1px solid var(--background-modifier-border) !important;
  padding-right: 60px !important;
}

/* Context Area - Light Border Above */
.context-header {
  border-top: 1px solid var(--background-modifier-border) !important;
  padding-top: 8px !important;
}

/* Header - NO CARET */
.writerr-chat-header-left {
  display: flex !important;
  align-items: center !important;
  gap: 12px !important;
}

.writerr-mode-select-wrapper {
  display: flex !important;
  align-items: center !important;
  cursor: pointer !important;
}

.writerr-mode-select {
  background: none !important;
  border: none !important;
  padding: 0 !important;
  margin: 0 !important;
  font-size: 18px !important;
  font-weight: 500 !important;
  color: var(--text-normal) !important;
  cursor: pointer !important;
  outline: none !important;
  box-shadow: none !important;
  appearance: none !important;
  -webkit-appearance: none !important;
  -moz-appearance: none !important;
}

/* REMOVE THE CARET COMPLETELY */
.writerr-mode-caret {
  display: none !important;
}

/* Token Counter - Force Monospace */
.writerr-token-count {
  font-size: var(--font-ui-smaller) !important;
  color: var(--text-muted) !important;
  font-variant-numeric: tabular-nums !important;
  font-family: var(--font-monospace) !important;
  font-feature-settings: "tnum" !important;
  margin-right: 8px !important;
}

/* Context Add Button - Clean Plus */
.context-add-button {
  padding: 4px !important;
  border-radius: var(--radius-s) !important;
}

.context-add-button:hover {
  color: var(--text-normal) !important;
  background: var(--background-modifier-hover) !important;
}

/* Context Action Button */
.writerr-context-action {
  padding: 4px !important;
  position: absolute !important;
  top: 8px !important;
  right: 16px !important;
  z-index: 10 !important;
  border-radius: var(--radius-s) !important;
}

.writerr-context-action:hover {
  color: var(--text-normal) !important;
  background: var(--background-modifier-hover) !important;
}

.writerr-context-action:disabled {
  opacity: 0.5 !important;
  cursor: not-allowed !important;
  pointer-events: none !important;
}

.writerr-context-action-icon {
  width: 14px !important;
  height: 14px !important;
  stroke-width: 2 !important;
}

/* Message Icons */
.writerr-message-icon {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  width: 32px !important;
  height: 32px !important;
  flex-shrink: 0 !important;
  color: var(--text-muted) !important;
}

.writerr-message-avatar {
  width: 20px !important;
  height: 20px !important;
  stroke-width: 2 !important;
}

/* Message Actions */
.writerr-message-actions {
  display: flex !important;
  gap: 4px !important;
  margin-top: 6px !important;
  opacity: 1 !important;
  pointer-events: auto !important;
}

.writerr-message-actions button {
  padding: 4px !important;
  border-radius: var(--radius-s) !important;
}

.writerr-message-actions button:hover {
  color: var(--text-normal) !important;
  background: var(--background-modifier-hover) !important;
}

.writerr-action-icon {
  width: 14px !important;
  height: 14px !important;
  stroke-width: 2 !important;
}

/* Chat Control Buttons - Header Icons */
.chat-control-button {
  padding: 8px !important;
  border-radius: var(--radius-s) !important;
}

.chat-control-button:hover {
  color: var(--text-normal) !important;
  background: var(--background-modifier-hover) !important;
}
`;
    const existing = document.getElementById("writerr-chat-styles");
    if (existing)
      existing.remove();
    const styleEl = document.createElement("style");
    styleEl.id = "writerr-chat-styles";
    styleEl.textContent = styles;
    document.head.appendChild(styleEl);
    console.log("Writerr Chat: Fixed context button positioning and send icon spacing");
  }
  onunload() {
    this.cleanupGlobalAPI();
    console.log("Writerr Chat plugin unloaded");
  }
  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }
  async saveSettings() {
    await this.saveData(this.settings);
    if (this.aiProviderManager) {
      this.aiProviderManager.updateSettings(this.settings);
    }
  }
  initializeGlobalAPI() {
    if (!window.WriterrlAPI) {
      window.WriterrlAPI = {};
    }
    window.WriterrlAPI.chat = {
      openChat: () => this.openChat(),
      sendMessage: (message, context) => this.sendMessage(message, context),
      getCurrentSession: () => this.currentSession
    };
  }
  cleanupGlobalAPI() {
    if (window.WriterrlAPI && window.WriterrlAPI.chat) {
      delete window.WriterrlAPI.chat;
    }
  }
  addCommands() {
    this.addCommand({
      id: "open-chat",
      name: "Open chat",
      callback: () => this.openChat()
    });
    this.addCommand({
      id: "new-chat-session",
      name: "New chat session",
      callback: () => this.newChatSession()
    });
    this.addCommand({
      id: "chat-with-selection",
      name: "Chat with selected text",
      editorCallback: (editor) => {
        const selection = editor.getSelection();
        if (selection) {
          this.chatWithSelection(selection);
        } else {
          new import_obsidian5.Notice("No text selected");
        }
      }
    });
    this.addCommand({
      id: "quick-chat",
      name: "Quick chat",
      callback: () => this.quickChat()
    });
  }
  async openChat() {
    const existingLeaf = this.app.workspace.getLeavesOfType(VIEW_TYPE_CHAT)[0];
    if (existingLeaf) {
      this.app.workspace.revealLeaf(existingLeaf);
      return;
    }
    try {
      const leaf = this.app.workspace.getRightLeaf(false);
      if (leaf) {
        await leaf.setViewState({
          type: VIEW_TYPE_CHAT,
          active: true
        });
        this.app.workspace.revealLeaf(leaf);
        return;
      }
      const rightLeaf = this.app.workspace.getLeaf("split", "right");
      if (rightLeaf) {
        await rightLeaf.setViewState({
          type: VIEW_TYPE_CHAT,
          active: true
        });
        this.app.workspace.revealLeaf(rightLeaf);
        return;
      }
      console.error("Failed to create chat view in sidebar");
    } catch (error) {
      console.error("Error opening chat view:", error);
    }
  }
  newChatSession() {
    this.currentSession = {
      id: generateId(),
      title: `Chat ${(/* @__PURE__ */ new Date()).toLocaleDateString()}`,
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    this.chatSessions.set(this.currentSession.id, this.currentSession);
    this.saveChatSessions();
  }
  async chatWithSelection(selectedText) {
    await this.openChat();
    if (!this.currentSession) {
      this.newChatSession();
    }
    const contextMessage = `Here's the selected text I'd like to discuss:

${selectedText}

What would you like to know about this text?`;
    await this.sendMessage(contextMessage);
  }
  async quickChat() {
    const modal = new QuickChatModal(this.app, async (message) => {
      if (!this.currentSession) {
        this.newChatSession();
      }
      await this.sendMessage(message);
    });
    modal.open();
  }
  async sendMessage(content, selectedMode, context) {
    var _a;
    if (!this.currentSession) {
      this.newChatSession();
    }
    if (!this.currentSession)
      return;
    const parsedMessage = this.parseMessageIntent(content);
    if (selectedMode && selectedMode !== "chat") {
      parsedMessage.mode = selectedMode;
    }
    const userMessage = {
      id: generateId(),
      role: "user",
      content,
      timestamp: Date.now(),
      metadata: {
        intent: parsedMessage.intent,
        requestedMode: parsedMessage.mode,
        selectedMode,
        hasSelection: !!parsedMessage.selection
      }
    };
    this.currentSession.messages.push(userMessage);
    let fullContext = context;
    if (!fullContext && this.settings.contextLines > 0) {
      fullContext = await this.getDocumentContext();
    }
    try {
      if (selectedMode && selectedMode !== "chat") {
        await this.processWithEditorialEngine(parsedMessage, fullContext);
      } else if (parsedMessage.intent === "edit" || parsedMessage.intent === "improve") {
        await this.processWithEditorialEngine(parsedMessage, fullContext);
      } else {
        await this.processWithAIProvider(parsedMessage, fullContext);
      }
      this.currentSession.updatedAt = Date.now();
      if (this.settings.autoSaveChats) {
        await this.saveChatSessions();
      }
      this.refreshChatView();
      if ((_a = window.Writerr) == null ? void 0 : _a.events) {
        window.Writerr.events.emit("chat.response-ready", {
          requestId: userMessage.id,
          response: this.currentSession.messages[this.currentSession.messages.length - 1]
        });
      }
    } catch (error) {
      new import_obsidian5.Notice(`Error sending message: ${error.message}`);
      console.error("Chat error:", error);
      const errorMessage = {
        id: generateId(),
        role: "assistant",
        content: `I encountered an error: ${error.message}. Please try again.`,
        timestamp: Date.now(),
        metadata: {
          error: true,
          errorMessage: error.message
        }
      };
      this.currentSession.messages.push(errorMessage);
      this.refreshChatView();
    }
  }
  // Get context from current file if requested\n    let fullContext = context;\n    if (!fullContext && this.settings.contextLines > 0) {\n      fullContext = await this.getDocumentContext();\n    }\n\n    try {\n      // Check if this should be processed through Editorial Engine\n      if (parsedMessage.intent === 'edit' || parsedMessage.intent === 'improve') {\n        await this.processWithEditorialEngine(parsedMessage, fullContext);\n      } else {\n        // Standard chat processing\n        await this.processWithAIProvider(parsedMessage, fullContext);\n      }\n\n      this.currentSession.updatedAt = Date.now();\n\n      if (this.settings.autoSaveChats) {\n        await this.saveChatSessions();\n      }\n\n      // Refresh chat view if open\n      this.refreshChatView();\n\n      // Emit chat event\n      if (window.Writerr?.events) {\n        window.Writerr.events.emit('chat.response-ready', {\n          requestId: userMessage.id,\n          response: this.currentSession.messages[this.currentSession.messages.length - 1]\n        });\n      }\n\n    } catch (error) {\n      new Notice(`Error sending message: ${error.message}`);\n      console.error('Chat error:', error);\n      \n      // Add error message to chat\n      const errorMessage: ChatMessage = {\n        id: generateId(),\n        role: 'assistant',\n        content: `I encountered an error: ${error.message}. Please try again.`,\n        timestamp: Date.now(),\n        metadata: {\n          error: true,\n          errorMessage: error.message\n        }\n      };\n      \n      this.currentSession.messages.push(errorMessage);\n      this.refreshChatView();\n    }\n  }
  parseMessageIntent(content) {
    const lowerContent = content.toLowerCase();
    const selectionMatch = content.match(/["']([^"']+)["']|`([^`]+)`/);
    const selection = (selectionMatch == null ? void 0 : selectionMatch[1]) || (selectionMatch == null ? void 0 : selectionMatch[2]);
    const modeMatch = content.match(/(?:use|with|in)\s+(proofreader|copy-editor|developmental-editor|creative-writing-assistant)\s+mode/i);
    const requestedMode = modeMatch == null ? void 0 : modeMatch[1];
    let intent = "chat";
    if (lowerContent.includes("edit") || lowerContent.includes("fix") || lowerContent.includes("correct")) {
      intent = "edit";
    } else if (lowerContent.includes("improve") || lowerContent.includes("enhance") || lowerContent.includes("rewrite")) {
      intent = "improve";
    } else if (lowerContent.includes("analyze") || lowerContent.includes("review") || lowerContent.includes("check")) {
      intent = "analyze";
    }
    return {
      originalContent: content,
      intent,
      mode: requestedMode || this.settings.defaultMode || "proofreader",
      selection,
      hasEditingRequest: intent !== "chat"
    };
  }
  async processWithEditorialEngine(parsedMessage, context) {
    var _a, _b;
    if (!((_a = window.Writerr) == null ? void 0 : _a.editorial)) {
      throw new Error("Editorial Engine is not available. Please ensure the Editorial Engine plugin is loaded.");
    }
    if (window.Writerr.events) {
      window.Writerr.events.emit("chat.request-processing", {
        requestId: this.currentSession.messages[this.currentSession.messages.length - 1].id,
        message: this.currentSession.messages[this.currentSession.messages.length - 1],
        mode: parsedMessage.mode
      });
    }
    try {
      const payload = {
        id: generateId(),
        text: parsedMessage.selection || context || parsedMessage.originalContent,
        originalText: parsedMessage.selection || context,
        mode: parsedMessage.mode,
        constraints: await this.getConstraintsForMode(parsedMessage.mode),
        metadata: {
          source: "writerr-chat",
          intent: parsedMessage.intent,
          timestamp: Date.now(),
          sessionId: this.currentSession.id
        }
      };
      const result = await window.Writerr.editorial.process(payload);
      if (result.success) {
        const assistantMessage = {
          id: generateId(),
          role: "assistant",
          content: this.formatEditorialEngineResponse(result, parsedMessage),
          timestamp: Date.now(),
          metadata: {
            editorialEngineResult: true,
            jobId: result.jobId,
            mode: parsedMessage.mode,
            processingTime: result.processingTime
          }
        };
        this.currentSession.messages.push(assistantMessage);
      } else {
        throw new Error(`Editorial Engine processing failed: ${(_b = result.errors) == null ? void 0 : _b.map((e) => e.message).join(", ")}`);
      }
    } catch (error) {
      console.error("Editorial Engine processing error:", error);
      throw error;
    }
  }
  async processWithAIProvider(parsedMessage, context) {
    const response = await this.aiProviderManager.sendMessage(
      this.currentSession.messages,
      context
    );
    const assistantMessage = {
      id: generateId(),
      role: "assistant",
      content: response,
      timestamp: Date.now(),
      metadata: {
        provider: this.settings.provider,
        model: this.settings.model
      }
    };
    this.currentSession.messages.push(assistantMessage);
  }
  formatEditorialEngineResponse(result, parsedMessage) {
    var _a, _b, _c;
    let response = "";
    response += `**${parsedMessage.mode.replace("-", " ").replace(/\b\w/g, (l) => l.toUpperCase())} Analysis:**

`;
    if ((_a = result.result) == null ? void 0 : _a.processedText) {
      response += "**Processed Text:**\n";
      response += `> ${result.result.processedText}

`;
    }
    if (((_b = result.result) == null ? void 0 : _b.changes) && result.result.changes.length > 0) {
      response += "**Changes Made:**\n";
      for (const change of result.result.changes.slice(0, 5)) {
        response += `- **${change.type}** at position ${change.from}-${change.to}: "${change.text || change.removedText}"
`;
      }
      if (result.result.changes.length > 5) {
        response += `- *... and ${result.result.changes.length - 5} more changes*
`;
      }
      response += "\n";
    }
    if ((_c = result.metadata) == null ? void 0 : _c.trackEditsSession) {
      response += `*Changes have been applied to your document and are being tracked in session ${result.metadata.trackEditsSession}.*

`;
      response += "*You can accept or reject individual changes using the Track Edits side panel.*";
    }
    return response;
  }
  async getConstraintsForMode(mode) {
    var _a;
    if ((_a = window.Writerr) == null ? void 0 : _a.editorial) {
      const modeDefinition = window.Writerr.editorial.getMode(mode);
      return (modeDefinition == null ? void 0 : modeDefinition.constraints) || [];
    }
    return [];
  }
  async getDocumentContext() {
    var _a;
    const activeFile = this.app.workspace.getActiveFile();
    if (!activeFile)
      return void 0;
    try {
      const content = await this.app.vault.read(activeFile);
      const lines = content.split("\n");
      if (lines.length <= this.settings.contextLines * 2) {
        return content;
      }
      const editor = (_a = this.app.workspace.getActiveViewOfType(require("obsidian").MarkdownView)) == null ? void 0 : _a.editor;
      if (editor) {
        const cursor = editor.getCursor();
        const start = Math.max(0, cursor.line - this.settings.contextLines);
        const end = Math.min(lines.length, cursor.line + this.settings.contextLines);
        return lines.slice(start, end).join("\n");
      }
      return lines.slice(0, this.settings.contextLines).join("\n");
    } catch (error) {
      console.error("Error getting document context:", error);
      return void 0;
    }
  }
  refreshChatView() {
    const chatLeaf = this.app.workspace.getLeavesOfType(VIEW_TYPE_CHAT)[0];
    if (chatLeaf && chatLeaf.view instanceof ChatView) {
      chatLeaf.view.refresh();
    }
  }
  listenForEditorialEngine() {
    var _a;
    setTimeout(() => {
      var _a2;
      if ((_a2 = window.Writerr) == null ? void 0 : _a2.editorial) {
        this.refreshChatModes();
      }
    }, 1e3);
    if ((_a = window.Writerr) == null ? void 0 : _a.events) {
      window.Writerr.events.on("platform-ready", (data) => {
        if (data.plugin === "editorial-engine") {
          console.log("Editorial Engine detected, refreshing chat modes...");
          this.refreshChatModes();
        }
      });
      window.Writerr.events.on("mode-registered", () => {
        this.refreshChatModes();
      });
      window.Writerr.events.on("mode-updated", () => {
        this.refreshChatModes();
      });
      window.Writerr.events.on("mode-removed", () => {
        this.refreshChatModes();
      });
    }
    const checkInterval = setInterval(() => {
      var _a2;
      if ((_a2 = window.Writerr) == null ? void 0 : _a2.editorial) {
        this.refreshChatModes();
        clearInterval(checkInterval);
      }
    }, 3e3);
    setTimeout(() => {
      clearInterval(checkInterval);
    }, 3e4);
  }
  refreshChatModes() {
    const chatLeaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_CHAT);
    for (const leaf of chatLeaves) {
      if (leaf.view instanceof ChatView) {
        leaf.view.refreshModeOptions();
      }
    }
  }
  async loadChatSessions() {
    try {
      const data = await this.loadData();
      if (data && data.chatSessions) {
        for (const session of data.chatSessions) {
          this.chatSessions.set(session.id, session);
        }
      }
    } catch (error) {
      console.error("Failed to load chat sessions:", error);
    }
  }
  async saveChatSessions() {
    try {
      const sessionsArray = Array.from(this.chatSessions.values());
      const currentData = await this.loadData() || {};
      currentData.chatSessions = sessionsArray;
      await this.saveData(currentData);
    } catch (error) {
      console.error("Failed to save chat sessions:", error);
    }
  }
  getChatSessions() {
    return Array.from(this.chatSessions.values()).sort((a, b) => b.updatedAt - a.updatedAt);
  }
  deleteSession(sessionId) {
    this.chatSessions.delete(sessionId);
    if (this.currentSession && this.currentSession.id === sessionId) {
      this.currentSession = null;
    }
    this.saveChatSessions();
  }
  setCurrentSession(sessionId) {
    const session = this.chatSessions.get(sessionId);
    if (session) {
      this.currentSession = session;
    }
  }
};
var QuickChatModal = class extends import_obsidian5.Modal {
  constructor(app, onSubmit) {
    super(app);
    this.onSubmit = onSubmit;
  }
  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h2", { text: "Quick Chat" });
    this.inputEl = contentEl.createEl("textarea", {
      attr: {
        placeholder: "Type your message here...",
        rows: "4",
        style: "width: 100%; margin: 10px 0; padding: 8px; border: 1px solid var(--background-modifier-border); border-radius: 4px;"
      }
    });
    const buttonContainer = contentEl.createEl("div", {
      attr: { style: "display: flex; justify-content: flex-end; gap: 10px; margin-top: 10px;" }
    });
    buttonContainer.createEl("button", {
      text: "Cancel",
      attr: { style: "padding: 6px 12px;" }
    }).onclick = () => this.close();
    const sendButton = buttonContainer.createEl("button", {
      text: "Send",
      attr: { style: "padding: 6px 12px; background: var(--interactive-accent); color: var(--text-on-accent); border: none; border-radius: 4px;" }
    });
    sendButton.onclick = async () => {
      const message = this.inputEl.value.trim();
      if (message) {
        await this.onSubmit(message);
        this.close();
      }
    };
    this.inputEl.focus();
  }
  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
};
//# sourceMappingURL=main.js.map
