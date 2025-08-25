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
    const header = container.createEl("div", { cls: "chat-header" });
    this.createHeader(header);
    this.chatContainer = container.createEl("div", { cls: "chat-messages" });
    this.chatContainer.style.cssText = `
      flex: 1;
      overflow-y: auto;
      padding: 10px;
      border-bottom: 1px solid var(--background-modifier-border);
    `;
    this.inputContainer = container.createEl("div", { cls: "chat-input-container" });
    this.createInputArea(this.inputContainer);
    this.applyTheme();
    if (!this.plugin.currentSession) {
      this.plugin.newChatSession();
    }
    this.refresh();
  }
  createHeader(header) {
    header.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px;
      border-bottom: 1px solid var(--background-modifier-border);
    `;
    this.sessionSelect = header.createEl("select", { cls: "chat-session-select" });
    this.sessionSelect.style.cssText = `
      flex: 1;
      margin-right: 10px;
      padding: 4px 8px;
      border: 1px solid var(--background-modifier-border);
      border-radius: 4px;
      background: var(--background-primary);
      color: var(--text-normal);
    `;
    this.sessionSelect.addEventListener("change", () => {
      const sessionId = this.sessionSelect.value;
      if (sessionId === "new") {
        this.plugin.newChatSession();
      } else {
        this.plugin.setCurrentSession(sessionId);
      }
      this.refresh();
    });
    const newButton = header.createEl("button", { text: "New", cls: "chat-new-button" });
    newButton.style.cssText = `
      padding: 4px 8px;
      border: 1px solid var(--background-modifier-border);
      border-radius: 4px;
      background: var(--background-primary);
      color: var(--text-normal);
      cursor: pointer;
      margin-right: 5px;
    `;
    newButton.onclick = () => {
      this.plugin.newChatSession();
      this.refresh();
    };
    const clearButton = header.createEl("button", { text: "Clear", cls: "chat-clear-button" });
    clearButton.style.cssText = `
      padding: 4px 8px;
      border: 1px solid var(--background-modifier-border);
      border-radius: 4px;
      background: var(--background-primary);
      color: var(--text-normal);
      cursor: pointer;
    `;
    clearButton.onclick = () => {
      if (this.plugin.currentSession) {
        this.plugin.currentSession.messages = [];
        this.plugin.saveChatSessions();
        this.refresh();
      }
    };
  }
  createInputArea(container) {
    container.style.cssText = `
      display: flex;
      padding: 10px;
      gap: 10px;
      background: var(--background-primary);
    `;
    this.messageInput = container.createEl("textarea", {
      cls: "chat-message-input",
      attr: { placeholder: "Type your message..." }
    });
    this.messageInput.style.cssText = `
      flex: 1;
      min-height: 60px;
      max-height: 200px;
      padding: 8px;
      border: 1px solid var(--background-modifier-border);
      border-radius: 4px;
      background: var(--background-primary);
      color: var(--text-normal);
      resize: vertical;
    `;
    this.messageInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        this.sendMessage();
      }
    });
    this.sendButton = container.createEl("button", {
      text: "Send",
      cls: "chat-send-button"
    });
    this.sendButton.style.cssText = `
      padding: 8px 16px;
      border: none;
      border-radius: 4px;
      background: var(--interactive-accent);
      color: var(--text-on-accent);
      cursor: pointer;
      align-self: flex-end;
    `;
    this.sendButton.onclick = () => this.sendMessage();
  }
  async sendMessage() {
    const message = this.messageInput.value.trim();
    if (!message)
      return;
    this.messageInput.value = "";
    this.sendButton.disabled = true;
    this.sendButton.textContent = "Sending...";
    try {
      await this.plugin.sendMessage(message);
      this.refresh();
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      this.sendButton.disabled = false;
      this.sendButton.textContent = "Send";
    }
  }
  refresh() {
    this.updateSessionSelect();
    this.renderMessages();
  }
  updateSessionSelect() {
    this.sessionSelect.empty();
    const sessions = this.plugin.getChatSessions();
    for (const session of sessions) {
      const option = this.sessionSelect.createEl("option", {
        value: session.id,
        text: session.title
      });
      if (this.plugin.currentSession && session.id === this.plugin.currentSession.id) {
        option.selected = true;
      }
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
      const leaf = this.app.workspace.getLeaf(false);
      if (leaf) {
        await leaf.setViewState({
          type: VIEW_TYPE_CHAT,
          active: true
        });
        this.app.workspace.revealLeaf(leaf);
        return;
      }
      const newLeaf = this.app.workspace.getLeaf(true);
      if (newLeaf) {
        await newLeaf.setViewState({
          type: VIEW_TYPE_CHAT,
          active: true
        });
        this.app.workspace.revealLeaf(newLeaf);
        return;
      }
      const splitLeaf = this.app.workspace.createLeafBySplit(this.app.workspace.activeLeaf);
      if (splitLeaf) {
        await splitLeaf.setViewState({
          type: VIEW_TYPE_CHAT,
          active: true
        });
        this.app.workspace.revealLeaf(splitLeaf);
        return;
      }
      console.error("Failed to create chat view - no leaf creation method succeeded");
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
  async sendMessage(content, context) {
    if (!this.currentSession) {
      this.newChatSession();
    }
    if (!this.currentSession)
      return;
    const userMessage = {
      id: generateId(),
      role: "user",
      content,
      timestamp: Date.now()
    };
    this.currentSession.messages.push(userMessage);
    let fullContext = context;
    if (!fullContext && this.settings.contextLines > 0) {
      fullContext = await this.getDocumentContext();
    }
    try {
      const response = await this.aiProviderManager.sendMessage(
        this.currentSession.messages,
        fullContext
      );
      const assistantMessage = {
        id: generateId(),
        role: "assistant",
        content: response,
        timestamp: Date.now()
      };
      this.currentSession.messages.push(assistantMessage);
      this.currentSession.updatedAt = Date.now();
      if (this.settings.autoSaveChats) {
        await this.saveChatSessions();
      }
      this.refreshChatView();
    } catch (error) {
      new import_obsidian3.Notice(`Error sending message: ${error.message}`);
      console.error("Chat error:", error);
    }
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
