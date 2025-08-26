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

// plugins/writerr-chat/src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => WriterrlChatPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian3 = require("obsidian");

// plugins/writerr-chat/src/settings.ts
var import_obsidian = require("obsidian");

// shared/utils/index.ts
function generateId() {
  return Math.random().toString(36).substr(2, 9);
}

// plugins/writerr-chat/src/settings.ts
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
var import_obsidian2 = require("obsidian");
var VIEW_TYPE_CHAT = "writerr-chat-view";
var ChatView = class extends import_obsidian2.ItemView {
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
    const header = container.createEl("div", { cls: "chat-header" });
    this.createHeader(header);
    this.chatContainer = container.createEl("div", { cls: "chat-messages" });
    this.chatContainer.style.cssText = `
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      min-height: 0;
    `;
    const contextArea = container.createEl("div", { cls: "chat-context-area" });
    this.createContextArea(contextArea);
    this.inputContainer = container.createEl("div", { cls: "chat-input-container" });
    this.createInputArea(this.inputContainer);
    this.applyTheme();
    if (!this.plugin.currentSession) {
      this.plugin.newChatSession();
    }
    this.refresh();
    setTimeout(() => {
      console.log("Delayed mode refresh after chat view opened");
      this.populateModeOptions();
    }, 1e3);
    setTimeout(() => {
      this.updateStatusIndicator();
    }, 1500);
  }
  createHeader(header) {
    header.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px;
      border-bottom: 1px solid var(--background-modifier-border);
      height: 60px;
      background: var(--background-primary);
    `;
    const leftContainer = header.createEl("div", { cls: "chat-header-left" });
    leftContainer.style.cssText = "display: flex; align-items: center; gap: 12px;";
    this.modeSelect = leftContainer.createEl("select", { cls: "chat-mode-select" });
    this.modeSelect.style.cssText = `
      border: none;
      background: transparent;
      padding: 0;
      font-size: 18px;
      font-weight: 500;
      color: var(--text-normal);
      cursor: pointer;
      outline: none;
    `;
    this.populateModeOptions();
    const rightContainer = header.createEl("div", { cls: "chat-header-controls" });
    rightContainer.style.cssText = "display: flex; align-items: center; gap: 8px;";
    const historyButton = rightContainer.createEl("button", { cls: "chat-control-button" });
    historyButton.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>';
    historyButton.style.cssText = `
      background: transparent;
      border: none;
      padding: 6px;
      cursor: pointer;
      border-radius: 4px;
      color: var(--text-muted);
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    historyButton.title = "Chat History";
    historyButton.onclick = () => {
      this.showSessionManager();
    };
    const settingsButton = rightContainer.createEl("button", { cls: "chat-control-button" });
    settingsButton.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>';
    settingsButton.style.cssText = `
      background: transparent;
      border: none;
      padding: 6px;
      cursor: pointer;
      border-radius: 4px;
      color: var(--text-muted);
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    settingsButton.title = "Chat Settings";
    this.statusIndicator = rightContainer.createEl("div", { cls: "chat-status-indicator" });
    this.updateStatusIndicator();
    const buttons = [historyButton, settingsButton];
    buttons.forEach((button) => {
      button.addEventListener("mouseenter", () => {
        button.style.backgroundColor = "var(--background-modifier-hover)";
      });
      button.addEventListener("mouseleave", () => {
        button.style.backgroundColor = "transparent";
      });
    });
  }
  populateModeOptions() {
    var _a;
    if (!this.modeSelect) {
      console.log("Mode select element not available");
      return;
    }
    console.log("Populating mode options...", this.modeSelect);
    this.modeSelect.innerHTML = "";
    const chatOption = this.modeSelect.createEl("option", {
      value: "chat",
      text: "Chat Mode"
    });
    if ((_a = window.Writerr) == null ? void 0 : _a.editorial) {
      try {
        const modes = window.Writerr.editorial.getEnabledModes();
        console.log("Editorial Engine enabled modes found:", modes);
        for (const mode of modes) {
          const option = this.modeSelect.createEl("option", {
            value: mode.id,
            text: mode.name
          });
          console.log(`Added mode option: ${mode.name} (${mode.id})`);
        }
        console.log(`Successfully loaded ${modes.length} enabled Editorial Engine modes to dropdown`);
        console.log("Final dropdown options:", Array.from(this.modeSelect.options).map((opt) => ({ value: opt.value, text: opt.text })));
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
      const fallbackModes = [
        { id: "editorial-loading", name: "Editorial Engine Loading..." }
      ];
      for (const mode of fallbackModes) {
        const option = this.modeSelect.createEl("option", {
          value: mode.id,
          text: mode.name
        });
        option.disabled = true;
      }
      setTimeout(() => {
        console.log("Retrying mode population after delay...");
        this.populateModeOptions();
      }, 2e3);
    }
    const defaultMode = this.plugin.settings.defaultMode || "chat";
    this.modeSelect.value = defaultMode;
    console.log(`Set default mode to: ${defaultMode}, current value: ${this.modeSelect.value}`);
    console.log("Dropdown element classes:", this.modeSelect.className);
    console.log("Dropdown parent element:", this.modeSelect.parentElement);
  }
  refreshModeOptions() {
    this.populateModeOptions();
  }
  createInputArea(container) {
    container.style.cssText = `
      display: flex;
      align-items: flex-end;
      padding: 16px;
      gap: 12px;
      background: var(--background-primary);
      border-top: 1px solid var(--background-modifier-border);
    `;
    this.messageInput = container.createEl("textarea", {
      cls: "chat-message-input",
      attr: {
        placeholder: "Type your message...",
        rows: "1"
      }
    });
    this.messageInput.style.cssText = `
      flex: 1;
      min-height: 40px;
      max-height: 160px;
      padding: 12px 16px;
      border: 1px solid var(--background-modifier-border);
      border-radius: 20px;
      background: var(--background-primary);
      color: var(--text-normal);
      resize: none;
      font-family: inherit;
      font-size: 14px;
      line-height: 1.4;
      outline: none;
      transition: border-color 0.2s ease;
    `;
    const autoResize = () => {
      this.messageInput.style.height = "auto";
      const scrollHeight = this.messageInput.scrollHeight;
      const maxHeight = 160;
      const newHeight = Math.min(scrollHeight, maxHeight);
      this.messageInput.style.height = newHeight + "px";
    };
    this.messageInput.addEventListener("input", autoResize);
    this.messageInput.addEventListener("focus", () => {
      this.messageInput.style.borderColor = "var(--interactive-accent)";
    });
    this.messageInput.addEventListener("blur", () => {
      this.messageInput.style.borderColor = "var(--background-modifier-border)";
    });
    this.messageInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        this.sendMessage();
      } else if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });
    this.sendButton = container.createEl("button", {
      cls: "chat-send-button"
    });
    this.sendButton.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2 11 13"/><path d="M22 2 15 22 11 13 2 9z"/></svg>';
    this.sendButton.style.cssText = `
      width: 40px;
      height: 40px;
      border: none;
      border-radius: 50%;
      background: var(--interactive-accent);
      color: var(--text-on-accent);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
      flex-shrink: 0;
    `;
    this.sendButton.addEventListener("mouseenter", () => {
      this.sendButton.style.transform = "scale(1.05)";
    });
    this.sendButton.addEventListener("mouseleave", () => {
      this.sendButton.style.transform = "scale(1)";
    });
    this.sendButton.onclick = () => this.sendMessage();
    setTimeout(autoResize, 0);
  }
  createContextArea(container) {
    container.style.cssText = `
      border-top: 1px solid var(--background-modifier-border);
      padding: 12px 16px;
      background: var(--background-secondary);
      min-height: 0;
      max-height: 120px;
      overflow-y: auto;
    `;
    const contextHeader = container.createEl("div", { cls: "context-header" });
    contextHeader.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;
    `;
    const contextLabel = contextHeader.createEl("span", { text: "Context" });
    contextLabel.style.cssText = `
      font-size: 12px;
      color: var(--text-muted);
      font-weight: 500;
    `;
    const addDocButton = contextHeader.createEl("button");
    addDocButton.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M12 11v6"/><path d="M9 14h6"/></svg>';
    addDocButton.style.cssText = `
      background: transparent;
      border: none;
      cursor: pointer;
      color: var(--text-muted);
      padding: 2px;
      border-radius: 3px;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    addDocButton.title = "Attach document";
    addDocButton.onclick = () => this.showDocumentPicker();
    const documentsContainer = container.createEl("div", { cls: "context-documents" });
    documentsContainer.style.cssText = `
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      min-height: 24px;
    `;
    this.contextDocuments = documentsContainer;
    this.addContextDocument("Meeting Notes.md", "/Daily/Meeting Notes.md");
    this.addContextDocument("Project Plan.md", "/Projects/Project Plan.md");
    addDocButton.addEventListener("mouseenter", () => {
      addDocButton.style.backgroundColor = "var(--background-modifier-hover)";
    });
    addDocButton.addEventListener("mouseleave", () => {
      addDocButton.style.backgroundColor = "transparent";
    });
  }
  addContextDocument(name, path) {
    if (!this.contextDocuments)
      return;
    const docChip = this.contextDocuments.createEl("div", { cls: "context-document-chip" });
    docChip.style.cssText = `
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 8px;
      background: var(--background-primary);
      border: 1px solid var(--background-modifier-border);
      border-radius: 12px;
      font-size: 12px;
      color: var(--text-normal);
      cursor: pointer;
      max-width: 200px;
    `;
    const docIcon = docChip.createEl("span");
    docIcon.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>';
    docIcon.style.cssText = "color: var(--text-muted); flex-shrink: 0;";
    const docName = docChip.createEl("span", { text: name });
    docName.style.cssText = `
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      flex: 1;
    `;
    const removeBtn = docChip.createEl("button", { text: "\xD7" });
    removeBtn.style.cssText = `
      background: none;
      border: none;
      cursor: pointer;
      color: var(--text-muted);
      font-size: 14px;
      padding: 0;
      width: 14px;
      height: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      flex-shrink: 0;
    `;
    docChip.onclick = (e) => {
      if (e.target !== removeBtn) {
        console.log("Opening document:", path);
      }
    };
    removeBtn.onclick = (e) => {
      e.stopPropagation();
      docChip.remove();
    };
    docChip.addEventListener("mouseenter", () => {
      docChip.style.backgroundColor = "var(--background-modifier-hover)";
    });
    docChip.addEventListener("mouseleave", () => {
      docChip.style.backgroundColor = "var(--background-primary)";
    });
    removeBtn.addEventListener("mouseenter", () => {
      removeBtn.style.backgroundColor = "var(--background-modifier-error)";
      removeBtn.style.color = "var(--text-on-accent)";
    });
    removeBtn.addEventListener("mouseleave", () => {
      removeBtn.style.backgroundColor = "transparent";
      removeBtn.style.color = "var(--text-muted)";
    });
  }
  showDocumentPicker() {
    const overlay = this.containerEl.createEl("div", { cls: "document-picker-overlay" });
    overlay.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    `;
    const modal = overlay.createEl("div", { cls: "document-picker-modal" });
    modal.style.cssText = `
      background: var(--background-primary);
      border: 1px solid var(--background-modifier-border);
      border-radius: 8px;
      padding: 20px;
      min-width: 400px;
      max-height: 500px;
      overflow-y: auto;
    `;
    const header = modal.createEl("div");
    header.style.cssText = "display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;";
    header.createEl("h3", { text: "Attach Document" });
    const closeButton = header.createEl("button", { text: "\xD7" });
    closeButton.style.cssText = `
      background: none;
      border: none;
      font-size: 24px;
      cursor: pointer;
      color: var(--text-muted);
    `;
    closeButton.onclick = () => overlay.remove();
    const searchInput = modal.createEl("input", {
      type: "text",
      placeholder: "Search documents..."
    });
    searchInput.style.cssText = `
      width: 100%;
      padding: 8px 12px;
      border: 1px solid var(--background-modifier-border);
      border-radius: 4px;
      background: var(--background-primary);
      color: var(--text-normal);
      margin-bottom: 16px;
    `;
    const docList = modal.createEl("div");
    const files = this.app.vault.getMarkdownFiles();
    const recentFiles = files.slice(0, 10);
    recentFiles.forEach((file) => {
      const docItem = docList.createEl("div");
      docItem.style.cssText = `
        padding: 8px 12px;
        border: 1px solid var(--background-modifier-border);
        border-radius: 4px;
        margin-bottom: 8px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 8px;
      `;
      docItem.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <path d="M14 2v6h6"/>
        </svg>
        <div>
          <div style="font-weight: 500;">${file.basename}</div>
          <div style="font-size: 12px; color: var(--text-muted);">${file.path}</div>
        </div>
      `;
      docItem.onclick = () => {
        this.addContextDocument(file.basename + ".md", file.path);
        overlay.remove();
      };
      docItem.addEventListener("mouseenter", () => {
        docItem.style.backgroundColor = "var(--background-modifier-hover)";
      });
      docItem.addEventListener("mouseleave", () => {
        docItem.style.backgroundColor = "transparent";
      });
    });
    overlay.onclick = (e) => {
      if (e.target === overlay)
        overlay.remove();
    };
    searchInput.focus();
  }
  async sendMessage() {
    const message = this.messageInput.value.trim();
    if (!message)
      return;
    const selectedMode = this.getSelectedMode();
    this.messageInput.value = "";
    this.sendButton.disabled = true;
    this.sendButton.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>';
    if (this.statusIndicator) {
      this.statusIndicator.style.background = "var(--color-blue)";
    }
    try {
      await this.plugin.sendMessage(message, selectedMode);
      this.refresh();
    } catch (error) {
      console.error("Error sending message:", error);
      new Notice(`Error: ${error.message}`);
    } finally {
      this.sendButton.disabled = false;
      this.sendButton.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2 11 13"/><path d="M22 2 15 22 11 13 2 9z"/></svg>';
      this.updateStatusIndicator();
    }
  }
  refresh() {
    this.updateSessionSelect();
    this.renderMessages();
  }
  updateSessionSelect() {
    if (!this.modeSelect)
      return;
    if (this.plugin.settings.defaultMode) {
      this.modeSelect.value = this.plugin.settings.defaultMode;
    }
  }
  async renderMessages() {
    this.chatContainer.empty();
    if (!this.plugin.currentSession || this.plugin.currentSession.messages.length === 0) {
      const emptyState = this.chatContainer.createEl("div", {
        cls: "chat-empty-state",
        text: "Start a conversation by typing a message below."
      });
      emptyState.style.cssText = `
        text-align: center;
        padding: 20px;
        color: var(--text-muted);
        font-style: italic;
      `;
      return;
    }
    for (const message of this.plugin.currentSession.messages) {
      await this.renderMessage(message);
    }
    this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
  }
  async renderMessage(message) {
    const messageEl = this.chatContainer.createEl("div", {
      cls: `chat-message chat-message-${message.role}`
    });
    const isUser = message.role === "user";
    messageEl.style.cssText = `
      display: flex;
      margin: 10px 0;
      ${isUser ? "justify-content: flex-end;" : "justify-content: flex-start;"}
    `;
    const bubble = messageEl.createEl("div", { cls: "chat-message-bubble" });
    bubble.style.cssText = `
      max-width: 80%;
      padding: 10px 15px;
      border-radius: 18px;
      ${isUser ? "background: var(--interactive-accent); color: var(--text-on-accent);" : "background: var(--background-secondary); color: var(--text-normal);"}
      word-wrap: break-word;
    `;
    if (this.plugin.settings.enableMarkdown && !isUser) {
      const component = new import_obsidian2.Component();
      await import_obsidian2.MarkdownRenderer.renderMarkdown(
        message.content,
        bubble,
        "",
        component
      );
    } else {
      bubble.textContent = message.content;
    }
    if (this.plugin.settings.showTimestamps) {
      const timestamp = messageEl.createEl("div", {
        cls: "chat-timestamp",
        text: new Date(message.timestamp).toLocaleTimeString()
      });
      timestamp.style.cssText = `
        font-size: 11px;
        color: var(--text-muted);
        margin: 5px ${isUser ? "15px" : "0"} 0 ${isUser ? "0" : "15px"};
        align-self: ${isUser ? "flex-end" : "flex-start"};
      `;
    }
  }
  applyTheme() {
    const container = this.containerEl;
    container.removeClass("theme-default", "theme-compact", "theme-minimal");
    container.addClass(`theme-${this.plugin.settings.theme}`);
    if (this.plugin.settings.theme === "compact") {
      this.chatContainer.style.fontSize = "14px";
      this.messageInput.style.minHeight = "40px";
    } else if (this.plugin.settings.theme === "minimal") {
      this.chatContainer.style.fontSize = "13px";
      this.messageInput.style.minHeight = "35px";
    }
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
    `;
    this.statusIndicator.setAttribute(
      "title",
      status === "ready" ? "All systems ready" : status === "partial" ? "Some features unavailable" : "Limited functionality - Editorial Engine and Track Edits not available"
    );
    this.statusIndicator.setAttribute("data-status", status);
    if (previousStatus !== status && hasEditorialEngine) {
      this.refreshModeOptions();
    }
  }
  showSessionManager() {
    const overlay = this.containerEl.createEl("div", { cls: "session-manager-overlay" });
    overlay.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    `;
    const modal = overlay.createEl("div", { cls: "session-manager-modal" });
    modal.style.cssText = `
      background: var(--background-primary);
      border: 1px solid var(--background-modifier-border);
      border-radius: 8px;
      padding: 20px;
      min-width: 300px;
      max-height: 400px;
      overflow-y: auto;
    `;
    const header = modal.createEl("div");
    header.style.cssText = "display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;";
    header.createEl("h3", { text: "Chat Sessions" });
    const closeButton = header.createEl("button", { text: "\xD7" });
    closeButton.style.cssText = `
      background: none;
      border: none;
      font-size: 24px;
      cursor: pointer;
      color: var(--text-muted);
    `;
    closeButton.onclick = () => overlay.remove();
    const sessionsList = modal.createEl("div");
    const sessions = this.plugin.getChatSessions();
    sessions.forEach((session) => {
      var _a, _b;
      const sessionItem = sessionsList.createEl("div");
      sessionItem.style.cssText = `
        padding: 8px 12px;
        border: 1px solid var(--background-modifier-border);
        border-radius: 4px;
        margin-bottom: 8px;
        cursor: pointer;
        display: flex;
        justify-content: space-between;
        align-items: center;
      `;
      if (((_a = this.plugin.currentSession) == null ? void 0 : _a.id) === session.id) {
        sessionItem.style.backgroundColor = "var(--background-modifier-hover)";
      }
      const sessionInfo = sessionItem.createEl("div");
      sessionInfo.createEl("div", { text: session.title, cls: "session-title" });
      const messageCount = ((_b = session.messages) == null ? void 0 : _b.length) || 0;
      sessionInfo.createEl("div", {
        text: `${messageCount} messages`,
        cls: "session-info"
      }).style.cssText = "font-size: 12px; color: var(--text-muted);";
      const deleteBtn = sessionItem.createEl("button", { text: "\u{1F5D1}" });
      deleteBtn.style.cssText = `
        background: none;
        border: none;
        cursor: pointer;
        opacity: 0.6;
      `;
      sessionItem.onclick = (e) => {
        if (e.target === deleteBtn)
          return;
        this.plugin.setCurrentSession(session.id);
        this.refresh();
        overlay.remove();
      };
      deleteBtn.onclick = (e) => {
        e.stopPropagation();
        this.plugin.deleteSession(session.id);
        overlay.remove();
        this.showSessionManager();
      };
    });
    const newSessionBtn = modal.createEl("button", { text: "+ New Session" });
    newSessionBtn.style.cssText = `
      width: 100%;
      padding: 8px;
      background: var(--interactive-accent);
      color: var(--text-on-accent);
      border: none;
      border-radius: 4px;
      cursor: pointer;
      margin-top: 12px;
    `;
    newSessionBtn.onclick = () => {
      this.plugin.newChatSession();
      this.refresh();
      overlay.remove();
    };
    overlay.onclick = (e) => {
      if (e.target === overlay)
        overlay.remove();
    };
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
  async onClose() {
  }
};

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
var WriterrlChatPlugin = class extends import_obsidian3.Plugin {
  constructor() {
    super(...arguments);
    this.currentSession = null;
    this.chatSessions = /* @__PURE__ */ new Map();
  }
  async onload() {
    await this.loadSettings();
    this.aiProviderManager = new AIProviderManager(this.settings);
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
          new import_obsidian3.Notice("No text selected");
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
      new import_obsidian3.Notice(`Error sending message: ${error.message}`);
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
var QuickChatModal = class extends import_obsidian3.Modal {
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
