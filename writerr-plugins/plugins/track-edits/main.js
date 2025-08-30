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

// plugins/track-edits/src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => TrackEditsPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian5 = require("obsidian");
var import_state = require("@codemirror/state");
var import_view = require("@codemirror/view");

// plugins/track-edits/src/settings.ts
var import_obsidian = require("obsidian");
var TrackEditsSettingsTab = class extends import_obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Track Edits Settings" });
    new import_obsidian.Setting(containerEl).setName("Enable tracking").setDesc("Automatically track edits when documents are modified").addToggle((toggle) => toggle.setValue(this.plugin.settings.enableTracking).onChange(async (value) => {
      this.plugin.settings.enableTracking = value;
      await this.plugin.saveSettings();
      if (value) {
        this.plugin.startTracking();
      } else {
        this.plugin.stopTracking();
      }
    }));
    new import_obsidian.Setting(containerEl).setName("Show line numbers").setDesc("Display line numbers in the editor").addToggle((toggle) => toggle.setValue(this.plugin.settings.showLineNumbers).onChange(async (value) => {
      this.plugin.settings.showLineNumbers = value;
      await this.plugin.saveSettings();
    }));
    new import_obsidian.Setting(containerEl).setName("Highlight changes").setDesc("Visually highlight recent changes in the editor").addToggle((toggle) => toggle.setValue(this.plugin.settings.highlightChanges).onChange(async (value) => {
      this.plugin.settings.highlightChanges = value;
      await this.plugin.saveSettings();
    }));
    new import_obsidian.Setting(containerEl).setName("Data retention").setDesc("Number of days to keep edit history (0 = keep forever)").addSlider((slider) => slider.setLimits(0, 365, 1).setValue(this.plugin.settings.retentionDays).setDynamicTooltip().onChange(async (value) => {
      this.plugin.settings.retentionDays = value;
      await this.plugin.saveSettings();
    }));
    new import_obsidian.Setting(containerEl).setName("Color scheme").setDesc("Choose the color scheme for change highlighting").addDropdown((dropdown) => dropdown.addOption("default", "Default").addOption("colorblind", "Colorblind friendly").addOption("dark", "Dark theme optimized").setValue(this.plugin.settings.colorScheme).onChange(async (value) => {
      this.plugin.settings.colorScheme = value;
      await this.plugin.saveSettings();
    }));
    new import_obsidian.Setting(containerEl).setName("Auto-save sessions").setDesc("Automatically save edit sessions as they occur").addToggle((toggle) => toggle.setValue(this.plugin.settings.autoSave).onChange(async (value) => {
      this.plugin.settings.autoSave = value;
      await this.plugin.saveSettings();
    }));
    new import_obsidian.Setting(containerEl).setName("Export format").setDesc("Default format for exporting edit sessions").addDropdown((dropdown) => dropdown.addOption("json", "JSON").addOption("csv", "CSV").addOption("markdown", "Markdown").setValue(this.plugin.settings.exportFormat).onChange(async (value) => {
      this.plugin.settings.exportFormat = value;
      await this.plugin.saveSettings();
    }));
    containerEl.createEl("h3", { text: "Actions" });
    new import_obsidian.Setting(containerEl).setName("Export current session").setDesc("Export the current editing session").addButton((button) => button.setButtonText("Export").setCta().onClick(() => {
      if (this.plugin.currentSession) {
        this.plugin.exportSession(this.plugin.currentSession.id);
      }
    }));
    new import_obsidian.Setting(containerEl).setName("Clear all history").setDesc("Delete all stored edit history (cannot be undone)").addButton((button) => button.setButtonText("Clear").setWarning().onClick(() => {
      this.plugin.clearEditHistory();
    }));
  }
};

// shared/utils/index.ts
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
function getWordCount(text) {
  return text.trim().split(/\s+/).filter((word) => word.length > 0).length;
}
function getCharacterCount(text) {
  return text.length;
}

// plugins/track-edits/src/edit-tracker.ts
var EditTracker = class {
  constructor(plugin) {
    this.sessions = /* @__PURE__ */ new Map();
    this.activeSessions = /* @__PURE__ */ new Map();
    this.plugin = plugin;
    this.loadSessions();
  }
  async loadSessions() {
    try {
      const data = await this.plugin.loadData();
      if (data && data.sessions) {
        for (const session of data.sessions) {
          this.sessions.set(session.id, session);
        }
      }
    } catch (error) {
      console.error("Failed to load edit sessions:", error);
    }
  }
  async saveSessions() {
    try {
      const sessionsArray = Array.from(this.sessions.values());
      await this.plugin.saveData({ sessions: sessionsArray });
    } catch (error) {
      console.error("Failed to save edit sessions:", error);
    }
  }
  startSession(session, file) {
    this.sessions.set(session.id, session);
    this.activeSessions.set(session.id, file);
  }
  endSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.endTime = Date.now();
      this.activeSessions.delete(sessionId);
      this.saveSessions();
    }
  }
  recordChanges(sessionId, changes) {
    const session = this.sessions.get(sessionId);
    if (!session)
      return;
    session.changes.push(...changes);
    const file = this.activeSessions.get(sessionId);
    if (file) {
      this.updateSessionCounts(session, file);
    }
  }
  async updateSessionCounts(session, file) {
    try {
      const content = await this.plugin.app.vault.read(file);
      session.wordCount = getWordCount(content);
      session.characterCount = getCharacterCount(content);
    } catch (error) {
      console.error("Failed to update session counts:", error);
    }
  }
  getSession(sessionId) {
    return this.sessions.get(sessionId);
  }
  getSessionHistory() {
    return Array.from(this.sessions.values()).sort((a, b) => b.startTime - a.startTime);
  }
  async saveSession(session) {
    this.sessions.set(session.id, session);
    await this.saveSessions();
  }
  clearHistory() {
    this.sessions.clear();
    this.activeSessions.clear();
    this.saveSessions();
  }
  formatSessionForExport(session, format) {
    switch (format) {
      case "json":
        return JSON.stringify(session, null, 2);
      case "csv":
        let csv = "Timestamp,Type,From,To,Text,RemovedText\n";
        for (const change of session.changes) {
          const row = [
            new Date(change.timestamp).toISOString(),
            change.type,
            change.from,
            change.to,
            `"${(change.text || "").replace(/"/g, '""')}"`,
            `"${(change.removedText || "").replace(/"/g, '""')}"`
          ].join(",");
          csv += row + "\n";
        }
        return csv;
      case "markdown":
        const startDate = new Date(session.startTime).toLocaleString();
        const endDate = session.endTime ? new Date(session.endTime).toLocaleString() : "In progress";
        const duration = session.endTime ? Math.round((session.endTime - session.startTime) / 1e3 / 60) + " minutes" : "In progress";
        let markdown = `# Edit Session Report

`;
        markdown += `- **Start:** ${startDate}
`;
        markdown += `- **End:** ${endDate}
`;
        markdown += `- **Duration:** ${duration}
`;
        markdown += `- **Changes:** ${session.changes.length}
`;
        markdown += `- **Words:** ${session.wordCount}
`;
        markdown += `- **Characters:** ${session.characterCount}

`;
        if (session.changes.length > 0) {
          markdown += `## Changes

`;
          for (const change of session.changes) {
            const time = new Date(change.timestamp).toLocaleTimeString();
            markdown += `- **${time}** - ${change.type} at position ${change.from}-${change.to}
`;
            if (change.text) {
              markdown += `  - Added: "${change.text}"
`;
            }
            if (change.removedText) {
              markdown += `  - Removed: "${change.removedText}"
`;
            }
          }
        }
        return markdown;
      default:
        return JSON.stringify(session, null, 2);
    }
  }
  // Clean up old sessions based on retention policy
  cleanupOldSessions() {
    if (this.plugin.settings.retentionDays === 0)
      return;
    const cutoffTime = Date.now() - this.plugin.settings.retentionDays * 24 * 60 * 60 * 1e3;
    const toDelete = [];
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.startTime < cutoffTime) {
        toDelete.push(sessionId);
      }
    }
    for (const sessionId of toDelete) {
      this.sessions.delete(sessionId);
    }
    if (toDelete.length > 0) {
      this.saveSessions();
    }
  }
};

// plugins/track-edits/src/edit-renderer.ts
var import_obsidian2 = require("obsidian");
var EditRenderer = class {
  constructor(plugin) {
    this.trackingIndicator = null;
    this.decorationContainer = null;
    this.activeDecorations = [];
    this.plugin = plugin;
  }
  showTrackingIndicator() {
    console.log("Track Edits v2.0: Tracking started (status shown in side panel)");
  }
  hideTrackingIndicator() {
    try {
      if (this.trackingIndicator && this.trackingIndicator.parentNode) {
        this.trackingIndicator.remove();
        this.trackingIndicator = null;
      }
      this.clearDecorations();
      console.log("Track Edits v2.0: Tracking stopped (status shown in side panel)");
    } catch (error) {
      console.error("Track Edits: Error hiding tracking indicator:", error);
      this.trackingIndicator = null;
    }
  }
  // Safe decoration system using DOM overlay approach
  showChangeDecorations(changes) {
    this.clearDecorations();
    const activeLeaf = this.plugin.app.workspace.getActiveViewOfType(import_obsidian2.MarkdownView);
    if (!activeLeaf || !activeLeaf.editor) {
      console.log("Track Edits v2.0: No active editor found for decorations");
      return;
    }
    console.log("Track Edits v2.0: Showing decorations for", changes.length, "changes");
    this.createDOMOverlayDecorations(activeLeaf, changes);
    changes.forEach((change, index) => {
      this.createTemporaryHighlight(change, index);
    });
  }
  createDOMOverlayDecorations(markdownView, changes) {
    try {
      const editorContainer = markdownView.contentEl.querySelector(".cm-editor");
      if (!editorContainer) {
        console.log("Track Edits v2.0: Editor container not found");
        return;
      }
      if (!this.decorationContainer) {
        this.decorationContainer = document.createElement("div");
        this.decorationContainer.className = "track-edits-decoration-overlay";
        this.decorationContainer.style.cssText = `
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 5;
        `;
        editorContainer.appendChild(this.decorationContainer);
      }
      const now = Date.now();
      const recentChanges = changes.filter((change) => now - change.timestamp < 5e3);
      recentChanges.forEach((change) => {
        this.createSafeDecoration(change);
      });
      console.log("Track Edits v2.0: Created", recentChanges.length, "DOM overlay decorations");
    } catch (error) {
      console.error("Track Edits v2.0: Error creating DOM overlay decorations:", error);
    }
  }
  createSafeDecoration(change) {
    if (!this.decorationContainer)
      return;
    const position = this.getEditorPosition(change);
    if (!position || position.left < 0 || position.top < 0) {
      console.log("Track Edits v2.0: Invalid position for decoration:", position);
      return;
    }
    const decoration = document.createElement("div");
    decoration.className = this.getDecorationClass(change);
    decoration.style.cssText = `
      position: absolute;
      left: ${position.left}px;
      top: ${position.top}px;
      width: ${Math.max(position.width, 20)}px;
      height: ${position.height}px;
      pointer-events: none;
      z-index: 10;
      border-radius: 3px;
      animation: track-edits-highlight-fade 3s ease-out forwards;
    `;
    decoration.title = `${change.type} at ${new Date(change.timestamp).toLocaleTimeString()}`;
    this.decorationContainer.appendChild(decoration);
    this.activeDecorations.push(decoration);
    setTimeout(() => {
      if (decoration.parentNode) {
        decoration.remove();
        this.activeDecorations = this.activeDecorations.filter((d) => d !== decoration);
      }
    }, 3e3);
  }
  getEditorPosition(change) {
    var _a;
    try {
      const activeLeaf = this.plugin.app.workspace.getActiveViewOfType(import_obsidian2.MarkdownView);
      if (!activeLeaf || !activeLeaf.editor)
        return null;
      const editor = activeLeaf.editor;
      const pos = editor.offsetToPos(change.from);
      const coords = editor.coordsAtPos(pos, false);
      if (!coords) {
        console.log("Track Edits v2.0: No coordinates returned for position", pos);
        return null;
      }
      const editorContainer = activeLeaf.contentEl.querySelector(".cm-editor");
      if (!editorContainer)
        return null;
      const editorRect = editorContainer.getBoundingClientRect();
      const result = {
        left: Math.max(0, coords.left - editorRect.left),
        top: Math.max(0, coords.top - editorRect.top),
        width: Math.max((((_a = change.text) == null ? void 0 : _a.length) || 1) * 8, 20),
        // Approximate character width
        height: Math.max(coords.bottom - coords.top, 16)
        // Minimum height
      };
      console.log("Track Edits v2.0: Calculated position:", result, "for change at", change.from);
      return result;
    } catch (error) {
      console.error("Track Edits v2.0: Error getting editor position:", error);
      return null;
    }
  }
  getDecorationClass(change) {
    let className = "track-edits-decoration";
    switch (change.type) {
      case "insert":
        className += " track-edits-decoration-insert";
        break;
      case "delete":
        className += " track-edits-decoration-delete";
        break;
      case "replace":
        className += " track-edits-decoration-replace";
        break;
    }
    className += ` track-edits-decoration-${this.plugin.settings.colorScheme}`;
    return className;
  }
  createTemporaryHighlight(change, index) {
    const highlight = document.createElement("div");
    highlight.className = "track-edits-temp-highlight";
    highlight.style.cssText = `
      position: fixed;
      top: ${60 + index * 25}px;
      right: 60px;
      background: var(--background-modifier-success);
      color: var(--text-on-accent);
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 10px;
      z-index: 999;
      opacity: 0.9;
      animation: fadeInOut 3s ease-in-out;
    `;
    highlight.textContent = `${change.type}: "${change.text || ""}"`;
    document.body.appendChild(highlight);
    this.activeDecorations.push(highlight);
    setTimeout(() => {
      if (highlight.parentNode) {
        highlight.remove();
        this.activeDecorations = this.activeDecorations.filter((el) => el !== highlight);
      }
    }, 3e3);
  }
  clearDecorations() {
    this.activeDecorations.forEach((decoration) => {
      if (decoration.parentNode) {
        decoration.remove();
      }
    });
    this.activeDecorations = [];
    if (this.decorationContainer && this.decorationContainer.parentNode) {
      this.decorationContainer.remove();
      this.decorationContainer = null;
    }
  }
  // Method for backward compatibility - no longer returns CodeMirror extension
  getCodeMirrorExtension() {
    return null;
  }
};

// plugins/track-edits/src/side-panel-view.ts
var import_obsidian3 = require("obsidian");
var SIDE_PANEL_VIEW_TYPE = "track-edits-side-panel";
var EditSidePanelView = class extends import_obsidian3.ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.clusters = [];
    this.runOnceBtn = null;
    this.plugin = plugin;
  }
  getViewType() {
    return SIDE_PANEL_VIEW_TYPE;
  }
  getDisplayText() {
    return "Track Edits";
  }
  getIcon() {
    return "edit";
  }
  async onOpen() {
    const container = this.containerEl.children[1];
    container.empty();
    container.addClass("track-edits-side-panel");
    this.renderView();
  }
  async onClose() {
  }
  updateClusters(clusters) {
    this.clusters = clusters;
    this.renderView();
  }
  renderView() {
    const container = this.containerEl.children[1];
    container.empty();
    const header = container.createEl("h2");
    header.createEl("span", { text: "Track Edits" });
    const statusDot = header.createEl("span", {
      cls: "track-edits-status-dot"
    });
    if (this.plugin.currentSession) {
      statusDot.addClass("track-edits-status-active");
      statusDot.setAttribute("title", "Tracking active");
    } else {
      statusDot.addClass("track-edits-status-inactive");
      statusDot.setAttribute("title", "Tracking stopped");
    }
    const countText = this.clusters.length === 0 ? "No edits to review" : `${this.clusters.length} cluster${this.clusters.length !== 1 ? "s" : ""} to review`;
    container.createEl("p", {
      text: countText,
      cls: "track-edits-count"
    });
    this.createAIControlsSection(container);
    if (this.clusters.length > 0) {
      const bulkControls = container.createEl("div", { cls: "track-edits-bulk-controls" });
      bulkControls.createEl("span", {
        text: "Accept / Reject All",
        cls: "track-edits-bulk-text"
      });
      const buttonsContainer = bulkControls.createEl("div", { cls: "track-edits-bulk-buttons" });
      const acceptAllBtn = buttonsContainer.createEl("button", {
        text: "\u2713",
        cls: "track-edits-bulk-btn track-edits-bulk-accept",
        title: "Accept all edits"
      });
      acceptAllBtn.onclick = () => this.acceptAllClusters();
      const rejectAllBtn = buttonsContainer.createEl("button", {
        text: "\u2717",
        cls: "track-edits-bulk-btn track-edits-bulk-reject",
        title: "Reject all edits"
      });
      rejectAllBtn.onclick = () => this.rejectAllClusters();
    }
    const editsList = container.createEl("div", { cls: "track-edits-list" });
    if (this.clusters.length === 0) {
      return;
    }
    this.clusters.forEach((cluster, index) => {
      this.renderCluster(editsList, cluster, index);
    });
  }
  renderCluster(container, cluster, index) {
    const clusterItem = container.createEl("div", { cls: "track-edit-item track-cluster-item" });
    const clusterRow = clusterItem.createEl("div", { cls: "track-cluster-row" });
    const clusterContent = clusterRow.createEl("div", { cls: "track-cluster-content" });
    const previewText = this.getClusterPreview(cluster);
    if (cluster.type === "word_replacement") {
      const deleteSpan = clusterContent.createEl("code", {
        text: previewText.before || "",
        cls: "track-edit-deleted"
      });
      clusterContent.appendText(" \u2192 ");
      const addSpan = clusterContent.createEl("code", {
        text: previewText.after || "",
        cls: "track-edit-added"
      });
    } else {
      clusterContent.createEl("code", {
        text: previewText.text || "",
        cls: "track-edit-added"
      });
    }
    const buttonsContainer = clusterRow.createEl("div", { cls: "track-edit-buttons" });
    const acceptBtn = buttonsContainer.createEl("button", {
      text: "\u2713",
      cls: "track-edit-btn track-edit-btn-accept",
      title: "Accept edit"
    });
    acceptBtn.onclick = () => this.acceptCluster(cluster.id);
    const rejectBtn = buttonsContainer.createEl("button", {
      text: "\u2717",
      cls: "track-edit-btn track-edit-btn-reject",
      title: "Reject edit"
    });
    rejectBtn.onclick = () => this.rejectCluster(cluster.id);
  }
  getClusterTitle(cluster) {
    switch (cluster.type) {
      case "word_replacement":
        return "Word Replacement";
      case "consecutive_typing":
        return "Consecutive Typing";
      case "deletion":
        return "Text Deletion";
      default:
        return "Text Edit";
    }
  }
  getClusterTime(cluster) {
    const now = Date.now();
    const timeDiff = now - cluster.startTime;
    if (timeDiff < 1e3) {
      return "Just now";
    } else if (timeDiff < 6e4) {
      return `${Math.floor(timeDiff / 1e3)}s ago`;
    } else {
      return `${Math.floor(timeDiff / 6e4)}m ago`;
    }
  }
  getClusterPreview(cluster) {
    var _a, _b;
    if (cluster.type === "word_replacement") {
      return {
        before: ((_a = cluster.metadata) == null ? void 0 : _a.originalWord) || "",
        after: ((_b = cluster.metadata) == null ? void 0 : _b.newWord) || ""
      };
    } else {
      const text = cluster.edits.map((edit) => edit.text || "").join("").slice(0, 50);
      return { text: text + (text.length === 50 ? "..." : "") };
    }
  }
  acceptCluster(clusterId) {
    this.plugin.acceptEditCluster(clusterId);
  }
  rejectCluster(clusterId) {
    this.plugin.rejectEditCluster(clusterId);
  }
  acceptAllClusters() {
    const clusterIds = this.clusters.map((cluster) => cluster.id);
    this.plugin.acceptAllEditClusters(clusterIds);
  }
  rejectAllClusters() {
    if (this.clusters.length > 3) {
      const confirmed = confirm(`Are you sure you want to reject all ${this.clusters.length} edits? This cannot be undone.`);
      if (!confirmed)
        return;
    }
    this.plugin.stopTracking();
    const clusterIds = this.clusters.map((cluster) => cluster.id);
    this.plugin.rejectAllEditClusters(clusterIds);
  }
  createAIControlsSection(container) {
    const controlsDiv = container.createEl("div", { cls: "track-edits-ai-simple" });
    const controlsLine = controlsDiv.createEl("div", { cls: "ai-simple-line" });
    const labelToggleGroup = controlsLine.createEl("div", { cls: "ai-label-toggle-group" });
    labelToggleGroup.createEl("span", { text: "AI", cls: "ai-simple-label" });
    const toggleSwitch = labelToggleGroup.createEl("div", { cls: "ai-simple-toggle" });
    toggleSwitch.addClass(this.plugin.settings.aiAlwaysEnabled ? "on" : "off");
    toggleSwitch.setAttribute("title", this.plugin.settings.aiAlwaysEnabled ? "AI Always On" : "AI Manual Only");
    toggleSwitch.onclick = () => {
      this.plugin.settings.aiAlwaysEnabled = !this.plugin.settings.aiAlwaysEnabled;
      this.plugin.saveSettings();
      this.renderView();
    };
    this.runOnceBtn = controlsLine.createEl("button", {
      text: "Run Once",
      cls: this.plugin.settings.aiAlwaysEnabled ? "ai-simple-btn disabled" : "ai-simple-btn enabled",
      title: "Run AI analysis once on current edits"
    });
    this.runOnceBtn.onclick = () => {
      if (!this.plugin.settings.aiAlwaysEnabled) {
        this.runAIAnalysisOnce();
      }
    };
  }
  async runAIAnalysisOnce() {
    if (!this.runOnceBtn)
      return;
    this.runOnceBtn.textContent = "Running...";
    this.runOnceBtn.addClass("running");
    try {
      await this.plugin.runAIAnalysisOnce();
      this.runOnceBtn.textContent = "Done!";
      setTimeout(() => {
        if (this.runOnceBtn) {
          this.runOnceBtn.textContent = "Run Once";
          this.runOnceBtn.removeClass("running");
        }
      }, 2e3);
    } catch (error) {
      console.error("AI analysis failed:", error);
      this.runOnceBtn.textContent = "Error";
      setTimeout(() => {
        if (this.runOnceBtn) {
          this.runOnceBtn.textContent = "Run Once";
          this.runOnceBtn.removeClass("running");
        }
      }, 2e3);
    }
  }
};

// plugins/track-edits/src/edit-cluster-manager.ts
var EditClusterManager = class {
  constructor(plugin) {
    this.activeClusters = /* @__PURE__ */ new Map();
    this.plugin = plugin;
  }
  clusterEdits(edits) {
    if (!this.plugin.settings.enableClustering || edits.length === 0) {
      return [];
    }
    this.activeClusters.clear();
    const sortedEdits = [...edits].sort((a, b) => a.timestamp - b.timestamp);
    const clusters = [];
    let currentCluster = [];
    let lastTimestamp = 0;
    for (const edit of sortedEdits) {
      const timeDiff = edit.timestamp - lastTimestamp;
      if (timeDiff > this.plugin.settings.clusterTimeWindow || currentCluster.length === 0) {
        if (currentCluster.length > 0) {
          const cluster = this.createCluster(currentCluster);
          if (cluster) {
            clusters.push(cluster);
            this.activeClusters.set(cluster.id, cluster);
          }
        }
        currentCluster = [edit];
      } else {
        if (this.areEditsInSameWord(currentCluster[currentCluster.length - 1], edit)) {
          currentCluster.push(edit);
        } else {
          const cluster = this.createCluster(currentCluster);
          if (cluster) {
            clusters.push(cluster);
            this.activeClusters.set(cluster.id, cluster);
          }
          currentCluster = [edit];
        }
      }
      lastTimestamp = edit.timestamp;
    }
    if (currentCluster.length > 0) {
      const cluster = this.createCluster(currentCluster);
      if (cluster) {
        clusters.push(cluster);
        this.activeClusters.set(cluster.id, cluster);
      }
    }
    return clusters;
  }
  createCluster(edits) {
    if (edits.length === 0)
      return null;
    const startTime = Math.min(...edits.map((e) => e.timestamp));
    const endTime = Math.max(...edits.map((e) => e.timestamp));
    const clusterType = this.determineClusterType(edits);
    const cluster = {
      id: generateId(),
      type: clusterType,
      edits,
      startTime,
      endTime,
      wordCount: this.calculateWordCount(edits),
      characterCount: this.calculateCharacterCount(edits),
      metadata: this.generateClusterMetadata(edits, clusterType)
    };
    return cluster;
  }
  areEditsInSameWord(edit1, edit2) {
    const positionDiff = Math.abs(edit1.to - edit2.from);
    if (positionDiff <= 5) {
      return true;
    }
    if (edit1.type === "insert" && edit2.type === "insert") {
      return edit1.to === edit2.from || edit1.to === edit2.from - 1;
    }
    return false;
  }
  determineClusterType(edits) {
    const insertCount = edits.filter((e) => e.type === "insert").length;
    const deleteCount = edits.filter((e) => e.type === "delete").length;
    const replaceCount = edits.filter((e) => e.type === "replace").length;
    if (deleteCount > 0 && insertCount > 0) {
      return "word_replacement";
    }
    if (deleteCount > 0 && insertCount === 0) {
      return "deletion";
    }
    if (insertCount > 0 && deleteCount === 0) {
      return "consecutive_typing";
    }
    return "mixed";
  }
  calculateWordCount(edits) {
    const text = edits.filter((e) => e.text).map((e) => e.text).join("");
    return text.trim().split(/\s+/).filter((word) => word.length > 0).length;
  }
  calculateCharacterCount(edits) {
    return edits.filter((e) => e.text).reduce((count, edit) => {
      var _a;
      return count + (((_a = edit.text) == null ? void 0 : _a.length) || 0);
    }, 0);
  }
  generateClusterMetadata(edits, type) {
    const metadata = {};
    if (type === "word_replacement") {
      const deletedEdits = edits.filter((e) => e.type === "delete");
      const insertedEdits = edits.filter((e) => e.type === "insert");
      if (deletedEdits.length > 0) {
        metadata.originalWord = deletedEdits.map((e) => e.removedText || "").join("");
      }
      if (insertedEdits.length > 0) {
        metadata.newWord = insertedEdits.map((e) => e.text || "").join("");
      }
    }
    if (edits.length > 0) {
      metadata.position = edits[0].from;
    }
    return metadata;
  }
  getCluster(clusterId) {
    return this.activeClusters.get(clusterId);
  }
  removeCluster(clusterId) {
    return this.activeClusters.delete(clusterId);
  }
  getAllClusters() {
    return Array.from(this.activeClusters.values());
  }
  clearClusters() {
    this.activeClusters.clear();
  }
};

// plugins/track-edits/src/ui/ToggleStateManager.ts
var ToggleStateManager = class {
  constructor(app, onStateChange) {
    this.ribbonIcon = null;
    this.statusIndicator = null;
    this.sidePanel = null;
    this.sidePanelOriginalContent = "";
    this.app = app;
    this.onStateChange = onStateChange;
    this.trackingEnabled = this.loadSavedState();
    this.createAriaAnnouncer();
  }
  get isTrackingEnabled() {
    return this.trackingEnabled;
  }
  /**
   * Set tracking enabled/disabled state
   */
  setTrackingEnabled(enabled) {
    if (this.trackingEnabled === enabled) {
      return;
    }
    this.trackingEnabled = enabled;
    this.saveState();
    this.updateRibbonIcon();
    this.updateStatusIndicator();
    this.updateSidePanel();
    this.announceStateChange(enabled);
    this.onStateChange(enabled);
  }
  /**
   * Set the ribbon icon element to manage
   */
  setRibbonIcon(ribbonElement) {
    this.ribbonIcon = ribbonElement;
    this.updateRibbonIcon();
  }
  /**
   * Set the status indicator element to manage
   */
  setStatusIndicator(statusElement) {
    this.statusIndicator = statusElement;
    this.updateStatusIndicator();
  }
  /**
   * Set the side panel element to manage
   */
  setSidePanel(sidePanelElement) {
    this.sidePanel = sidePanelElement;
    this.sidePanelOriginalContent = sidePanelElement.innerHTML;
    this.updateSidePanel();
  }
  updateRibbonIcon() {
    if (!this.ribbonIcon)
      return;
    this.ribbonIcon.classList.add("state-transition");
    if (this.trackingEnabled) {
      this.ribbonIcon.classList.add("track-edits-enabled");
      this.ribbonIcon.classList.remove("track-edits-disabled");
      this.ribbonIcon.title = "Track Edits (Active) - Click to manage changes";
      this.ribbonIcon.setAttribute("aria-label", "Track Edits is active. Click to manage tracked changes.");
    } else {
      this.ribbonIcon.classList.add("track-edits-disabled");
      this.ribbonIcon.classList.remove("track-edits-enabled");
      this.ribbonIcon.title = "Track Edits (Disabled) - Click to enable";
      this.ribbonIcon.setAttribute("aria-label", "Track Edits disabled. Click to enable tracking.");
    }
    setTimeout(() => {
      if (this.ribbonIcon) {
        this.ribbonIcon.classList.remove("state-transition");
      }
    }, 300);
  }
  updateStatusIndicator() {
    if (!this.statusIndicator)
      return;
    if (this.trackingEnabled) {
      this.statusIndicator.classList.add("status-active");
      this.statusIndicator.classList.remove("status-disabled");
      this.statusIndicator.setAttribute("aria-label", "Track Edits is active");
      this.statusIndicator.textContent = "Active";
    } else {
      this.statusIndicator.classList.add("status-disabled");
      this.statusIndicator.classList.remove("status-active");
      this.statusIndicator.setAttribute("aria-label", "Track Edits is disabled");
      this.statusIndicator.textContent = "Disabled";
    }
  }
  updateSidePanel() {
    if (!this.sidePanel)
      return;
    if (this.trackingEnabled) {
      this.sidePanel.classList.add("track-edits-active");
      this.sidePanel.classList.remove("track-edits-disabled");
      if (this.sidePanelOriginalContent) {
        this.sidePanel.innerHTML = this.sidePanelOriginalContent;
      }
    } else {
      this.sidePanel.classList.add("track-edits-disabled");
      this.sidePanel.classList.remove("track-edits-active");
      this.sidePanel.innerHTML = this.createEmptyStateHTML();
    }
  }
  createEmptyStateHTML() {
    return `
      <div class="track-edits-empty-state">
        <div class="empty-state-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 12l2 2 4-4"></path>
            <path d="M21 12c-1 0-3-1-3-3s2-3 3-3 3 1 3 3-2 3-3 3"></path>
            <path d="M3 12c1 0 3-1 3-3s-2-3-3-3-3 1-3 3 2 3 3 3"></path>
            <path d="M3 12h6m6 0h6"></path>
          </svg>
        </div>
        <h3 class="empty-state-title">Tracking disabled</h3>
        <p class="empty-state-description">
          Enable Track Edits to see changes and suggestions for your document.
        </p>
        <button class="empty-state-button" onclick="window.TrackEdits?.enableTracking()">
          Enable Track Edits
        </button>
      </div>
    `;
  }
  saveState() {
    sessionStorage.setItem("track-edits-enabled", String(this.trackingEnabled));
  }
  loadSavedState() {
    const saved = sessionStorage.getItem("track-edits-enabled");
    return saved !== null ? saved === "true" : true;
  }
  createAriaAnnouncer() {
    let announcer = document.getElementById("track-edits-announcer");
    if (!announcer) {
      announcer = document.createElement("div");
      announcer.id = "track-edits-announcer";
      announcer.setAttribute("aria-live", "polite");
      announcer.setAttribute("aria-atomic", "true");
      announcer.style.position = "absolute";
      announcer.style.left = "-10000px";
      announcer.style.width = "1px";
      announcer.style.height = "1px";
      announcer.style.overflow = "hidden";
      document.body.appendChild(announcer);
    }
  }
  announceStateChange(enabled) {
    const announcer = document.getElementById("track-edits-announcer");
    if (announcer) {
      announcer.textContent = enabled ? "Track Edits has been enabled" : "Track Edits has been disabled";
    }
  }
  /**
   * Clean up resources
   */
  destroy() {
    const announcer = document.getElementById("track-edits-announcer");
    if (announcer && announcer.parentNode) {
      announcer.parentNode.removeChild(announcer);
    }
  }
};

// plugins/track-edits/src/components/ToggleConfirmationModal.ts
var import_obsidian4 = require("obsidian");
var ToggleConfirmationModal = class extends import_obsidian4.Modal {
  constructor(app, options) {
    super(app);
    this.options = options;
    this.keydownHandler = this.handleKeydown.bind(this);
  }
  get editCount() {
    return this.options.editCount;
  }
  get onConfirm() {
    return this.options.onConfirm;
  }
  get onCancel() {
    return this.options.onCancel;
  }
  onOpen() {
    const { contentEl } = this;
    const { editCount } = this.options;
    contentEl.empty();
    contentEl.addClass("toggle-confirmation-modal");
    const header = contentEl.createEl("h2", {
      text: "Turn Off Track Edits?",
      cls: "modal-title"
    });
    const messageEl = contentEl.createEl("p", {
      cls: "modal-message"
    });
    const editText = editCount === 1 ? "edit" : "edits";
    messageEl.textContent = `You have ${editCount} pending ${editText}. These changes will be lost if you turn off tracking.`;
    const buttonContainer = contentEl.createEl("div", {
      cls: "modal-button-container"
    });
    const cancelButton = buttonContainer.createEl("button", {
      text: "Keep Tracking",
      cls: "modal-button modal-button-secondary"
    });
    cancelButton.addEventListener("click", () => {
      this.handleCancel();
    });
    const confirmButton = buttonContainer.createEl("button", {
      text: "Turn Off Anyway",
      cls: "modal-button modal-button-primary"
    });
    confirmButton.addEventListener("click", () => {
      this.handleConfirm();
    });
    cancelButton.focus();
    document.addEventListener("keydown", this.keydownHandler);
  }
  onClose() {
    document.removeEventListener("keydown", this.keydownHandler);
  }
  handleKeydown(e) {
    if (e.key === "Escape") {
      e.preventDefault();
      this.handleCancel();
    } else if (e.key === "Enter") {
      e.preventDefault();
      this.handleConfirm();
    }
  }
  handleConfirm() {
    this.options.onConfirm();
    this.close();
  }
  handleCancel() {
    this.options.onCancel();
    this.close();
  }
  // TODO: Add shouldSkipConfirmation() and resetSessionPreference() methods in future update
};

// plugins/track-edits/src/main.ts
var DEFAULT_SETTINGS = {
  enableTracking: true,
  showLineNumbers: true,
  highlightChanges: true,
  retentionDays: 30,
  colorScheme: "default",
  autoSave: true,
  exportFormat: "json",
  enableClustering: true,
  clusterTimeWindow: 2e3,
  showSidePanelOnStart: true,
  // AI Integration defaults
  aiAlwaysEnabled: false,
  aiProvider: "",
  aiModel: "",
  systemPromptPath: "prompts/system-prompt.md"
};
var DEBUG_MODE = true;
var PERF_MONITOR = true;
var DebugMonitor = class {
  static log(type, data) {
    if (!DEBUG_MODE)
      return;
    this.logs.push({ timestamp: Date.now(), type, data });
    console.log(`[Track Edits ${type}]`, JSON.stringify(data, null, 2));
    if (this.logs.length > 1e3) {
      this.logs.splice(0, 500);
    }
  }
  static startTimer(name) {
    if (!PERF_MONITOR)
      return null;
    return { name, start: performance.now() };
  }
  static endTimer(timer) {
    if (!timer || !PERF_MONITOR)
      return;
    const duration = performance.now() - timer.start;
    const counter = this.perfCounters.get(timer.name) || { count: 0, totalTime: 0, maxTime: 0 };
    counter.count++;
    counter.totalTime += duration;
    counter.maxTime = Math.max(counter.maxTime, duration);
    this.perfCounters.set(timer.name, counter);
    if (duration > 16) {
      console.warn(`[Track Edits PERF] ${timer.name} took ${duration.toFixed(2)}ms (>16ms target)`);
    }
  }
  static getReport() {
    return {
      recentLogs: this.logs.slice(-50),
      perfStats: Object.fromEntries(this.perfCounters.entries()),
      summary: {
        totalLogs: this.logs.length,
        perfCounters: this.perfCounters.size,
        slowOperations: Array.from(this.perfCounters.entries()).filter(([_, stats]) => stats.maxTime > 16).map(([name, stats]) => ({ name, maxTime: stats.maxTime, avgTime: stats.totalTime / stats.count }))
      }
    };
  }
  static clear() {
    this.logs = [];
    this.perfCounters.clear();
  }
};
DebugMonitor.logs = [];
DebugMonitor.perfCounters = /* @__PURE__ */ new Map();
var currentPluginInstance = null;
var isRejectingEdit = false;
if (DEBUG_MODE) {
  window.TrackEditsDebug = {
    getReport: () => DebugMonitor.getReport(),
    clearLogs: () => DebugMonitor.clear(),
    getCurrentState: () => {
      var _a;
      return {
        currentPluginInstance: !!currentPluginInstance,
        isRejectingEdit,
        currentEdits: ((_a = currentPluginInstance == null ? void 0 : currentPluginInstance.currentEdits) == null ? void 0 : _a.length) || 0,
        hasSession: !!(currentPluginInstance == null ? void 0 : currentPluginInstance.currentSession)
      };
    },
    logCurrent: () => {
      const state = window.TrackEditsDebug.getCurrentState();
      console.log("[Track Edits Debug]", state);
      return state;
    }
  };
  console.log("[Track Edits] Debug mode enabled. Access via window.TrackEditsDebug");
}
var addDecorationEffect = import_state.StateEffect.define();
var removeDecorationEffect = import_state.StateEffect.define();
var clearAllDecorationsEffect = import_state.StateEffect.define();
var DeletionWidget = class extends import_view.WidgetType {
  // Make public for StateField access
  constructor(deletedText, editId) {
    super();
    this.deletedText = deletedText;
    this.editId = editId;
  }
  toDOM() {
    const span = document.createElement("span");
    span.className = "track-edits-decoration track-edits-decoration-delete";
    span.textContent = this.deletedText;
    span.setAttribute("data-edit-id", this.editId);
    span.style.cssText = `
      color: #f85149;
      text-decoration: line-through;
      opacity: 0.7;
      background: transparent;
    `;
    return span;
  }
};
function createEditDecoration(edit) {
  const attributes = { "data-edit-id": edit.id };
  if (edit.type === "insert") {
    return import_view.Decoration.mark({
      class: "track-edits-decoration track-edits-decoration-insert",
      attributes
    });
  } else if (edit.type === "delete") {
    return import_view.Decoration.widget({
      widget: new DeletionWidget(edit.removedText || "", edit.id),
      side: -1
    });
  }
  return import_view.Decoration.mark({
    class: "track-edits-decoration track-edits-decoration-insert",
    attributes
  });
}
var editDecorationField = import_state.StateField.define({
  create() {
    DebugMonitor.log("STATEFIELD_CREATE", { message: "StateField created with empty decoration set" });
    return import_view.Decoration.none;
  },
  update(decorations, tr) {
    var _a, _b;
    const timer = DebugMonitor.startTimer("StateField.update");
    const initialSize = decorations.size;
    DebugMonitor.log("STATEFIELD_UPDATE_START", {
      hasChanges: !!tr.changes,
      changeCount: tr.changes ? tr.changes.desc.length : 0,
      effectCount: tr.effects.length,
      currentDecorations: initialSize,
      docLength: tr.newDoc.length
    });
    const mapTimer = DebugMonitor.startTimer("decorations.map");
    decorations = decorations.map(tr.changes);
    DebugMonitor.endTimer(mapTimer);
    let addedDecorations = 0;
    let removedDecorations = 0;
    for (const effect of tr.effects) {
      if (effect.is(addDecorationEffect)) {
        const { edit, decoration } = effect.value;
        DebugMonitor.log("ADD_DECORATION_EFFECT", {
          editId: edit.id,
          editType: edit.type,
          position: { from: edit.from, to: edit.to },
          textLength: ((_a = edit.text) == null ? void 0 : _a.length) || 0
        });
        if (edit.type === "delete") {
          const pos = edit.from;
          decorations = decorations.update({
            add: [decoration.range(pos)]
          });
          addedDecorations++;
        } else if (edit.type === "insert") {
          const start = edit.from;
          const end = start + (((_b = edit.text) == null ? void 0 : _b.length) || 0);
          if (end <= tr.newDoc.length && start <= end && start >= 0) {
            decorations = decorations.update({
              add: [decoration.range(start, end)]
            });
            addedDecorations++;
          } else {
            DebugMonitor.log("INVALID_DECORATION_POSITION", {
              editId: edit.id,
              start,
              end,
              docLength: tr.newDoc.length,
              reason: "Position out of bounds"
            });
          }
        }
      } else if (effect.is(removeDecorationEffect)) {
        const editId = effect.value;
        DebugMonitor.log("REMOVE_DECORATION_EFFECT", { editId });
        decorations = decorations.update({
          filter: (from, to, decoration) => {
            var _a2;
            const spec = decoration.spec;
            if (((_a2 = spec == null ? void 0 : spec.attributes) == null ? void 0 : _a2["data-edit-id"]) === editId) {
              removedDecorations++;
              return false;
            }
            if ((spec == null ? void 0 : spec.widget) && spec.widget.editId === editId) {
              removedDecorations++;
              return false;
            }
            return true;
          }
        });
      } else if (effect.is(clearAllDecorationsEffect)) {
        DebugMonitor.log("CLEAR_ALL_DECORATIONS_EFFECT", { previousSize: decorations.size });
        removedDecorations = decorations.size;
        decorations = import_view.Decoration.none;
      }
    }
    const finalSize = decorations.size;
    DebugMonitor.log("STATEFIELD_UPDATE_END", {
      initialSize,
      finalSize,
      addedDecorations,
      removedDecorations,
      netChange: finalSize - initialSize
    });
    DebugMonitor.endTimer(timer);
    return decorations;
  },
  provide: (f) => import_view.EditorView.decorations.from(f)
});
var changeDetectionPlugin = import_view.ViewPlugin.fromClass(class {
  constructor(view) {
    this.view = view;
  }
  update(update) {
    const timer = DebugMonitor.startTimer("ViewPlugin.update");
    DebugMonitor.log("UPDATE", {
      docChanged: update.docChanged,
      isRejectingEdit,
      hasPluginInstance: !!currentPluginInstance,
      changeCount: update.changes ? update.changes.desc.length : 0,
      viewportChanged: update.viewportChanged,
      focusChanged: update.focusChanged
    });
    const shouldProcessChanges = update.docChanged && !isRejectingEdit && currentPluginInstance && currentPluginInstance.currentSession && currentPluginInstance.settings.enableTracking && (!currentPluginInstance.toggleStateManager || currentPluginInstance.toggleStateManager.isTrackingEnabled);
    if (shouldProcessChanges) {
      const extractTimer = DebugMonitor.startTimer("extractEditsFromUpdate");
      const edits = this.extractEditsFromUpdate(update);
      DebugMonitor.endTimer(extractTimer);
      DebugMonitor.log("EDITS_EXTRACTED", {
        editCount: edits.length,
        edits: edits.map((e) => {
          var _a;
          return { id: e.id, type: e.type, from: e.from, to: e.to, textLength: ((_a = e.text) == null ? void 0 : _a.length) || 0 };
        })
      });
      if (edits.length > 0) {
        const decorationTimer = DebugMonitor.startTimer("createDecorations");
        const decorationEffects = edits.map((edit) => {
          const decoration = createEditDecoration(edit);
          return addDecorationEffect.of({ edit, decoration });
        });
        DebugMonitor.endTimer(decorationTimer);
        DebugMonitor.log("DECORATIONS_CREATED", {
          effectCount: decorationEffects.length
        });
        requestAnimationFrame(() => {
          const dispatchTimer = DebugMonitor.startTimer("viewDispatch");
          this.view.dispatch({ effects: decorationEffects });
          DebugMonitor.endTimer(dispatchTimer);
          DebugMonitor.log("DECORATIONS_DISPATCHED", {
            effectCount: decorationEffects.length
          });
        });
        currentPluginInstance.handleEditsFromCodeMirror(edits);
      }
    }
    DebugMonitor.endTimer(timer);
  }
  extractEditsFromUpdate(update) {
    const edits = [];
    update.changes.iterChanges((from, to, fromB, toB, insert) => {
      const removedText = update.startState.doc.sliceString(from, to);
      const insertedText = insert.toString();
      if (removedText) {
        edits.push({
          id: generateId(),
          type: "delete",
          from,
          to,
          text: "",
          removedText,
          timestamp: Date.now()
        });
      }
      if (insertedText) {
        edits.push({
          id: generateId(),
          type: "insert",
          from: fromB,
          to: toB,
          text: insertedText,
          removedText: "",
          timestamp: Date.now()
        });
      }
    });
    return edits;
  }
});
var TrackEditsPlugin = class extends import_obsidian5.Plugin {
  constructor() {
    super(...arguments);
    this.sidePanelView = null;
    this.toggleStateManager = null;
    this.currentSession = null;
    this.currentEdits = [];
    this.currentEditorView = null;
    this.ribbonIconEl = null;
    this.debouncedSave = debounce(() => this.saveCurrentSession(), 1e3);
    this.debouncedPanelUpdate = debounce(() => this.updateSidePanel(), 100);
    this.debouncedRibbonClick = debounce(() => this.handleRibbonClick(), 300);
    this.isProcessingChange = false;
    this.isRestartingSession = false;
    this.lastActiveFile = null;
  }
  async onload() {
    await this.loadSettings();
    currentPluginInstance = this;
    this.editTracker = new EditTracker(this);
    this.editRenderer = new EditRenderer(this);
    this.clusterManager = new EditClusterManager(this);
    this.toggleStateManager = new ToggleStateManager(this.app, (enabled) => {
      if (enabled) {
        this.startTracking();
      } else {
        this.handleToggleOff();
      }
    });
    this.initializeGlobalAPI();
    this.registerEditorExtension([changeDetectionPlugin, editDecorationField]);
    this.registerSafeEventHandlers();
    this.registerView("track-edits-side-panel", (leaf) => new EditSidePanelView(leaf, this));
    this.addCommands();
    this.addSettingTab(new TrackEditsSettingsTab(this.app, this));
    this.addRibbonIcon();
    if (this.settings.enableTracking) {
      this.startTracking();
    }
    console.log("Track Edits v2.0 plugin loaded");
  }
  onunload() {
    try {
      this.stopTracking();
      this.cleanupGlobalAPI();
      if (this.toggleStateManager) {
        this.toggleStateManager.destroy();
        this.toggleStateManager = null;
      }
      console.log("Track Edits plugin unloaded");
    } catch (error) {
      console.error("Track Edits: Error during plugin unload:", error);
    }
  }
  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }
  initializeGlobalAPI() {
    if (!window.WriterrlAPI) {
      window.WriterrlAPI = {};
    }
    window.WriterrlAPI.trackEdits = {
      getCurrentSession: () => this.currentSession,
      getSessionHistory: () => this.editTracker.getSessionHistory(),
      startTracking: () => this.startTracking(),
      stopTracking: () => this.stopTracking(),
      exportSession: (sessionId) => this.exportSession(sessionId),
      applyChange: (change) => this.applyExternalChange(change)
    };
  }
  cleanupGlobalAPI() {
    if (window.WriterrlAPI && window.WriterrlAPI.trackEdits) {
      delete window.WriterrlAPI.trackEdits;
    }
  }
  registerSafeEventHandlers() {
    console.log("[Track Edits DEBUG] Registering event handlers");
    this.registerEvent(
      this.app.workspace.on("active-leaf-change", () => {
        if (this.isRestartingSession)
          return;
        if (!this.settings || !this.settings.enableTracking)
          return;
        const activeFile = this.app.workspace.getActiveFile();
        const currentFilePath = (activeFile == null ? void 0 : activeFile.path) || null;
        if (this.currentSession && this.lastActiveFile !== currentFilePath && this.lastActiveFile !== null && // Don't restart on initial load
        currentFilePath !== null) {
          console.log("Track Edits: File changed from", this.lastActiveFile, "to", currentFilePath);
          this.lastActiveFile = currentFilePath;
          this.restartSession();
        } else if (!this.currentSession && activeFile && currentFilePath !== this.lastActiveFile && !this.isRestartingSession) {
          console.log("Track Edits: Starting new session for file:", currentFilePath);
          this.lastActiveFile = currentFilePath;
          this.startTracking();
        }
      })
    );
  }
  handleEditorChange(editor, info) {
    console.log("[Track Edits DEBUG] handleEditorChange called");
    console.log("[Track Edits DEBUG] Editor:", editor);
    console.log("[Track Edits DEBUG] Info:", info);
    console.log("[Track Edits DEBUG] Current session:", this.currentSession);
    console.log("[Track Edits DEBUG] Settings enableTracking:", this.settings.enableTracking);
    const changes = this.extractChangesFromEditor(editor);
    console.log("[Track Edits DEBUG] Extracted changes:", changes);
    if (changes.length === 0) {
      console.log("[Track Edits DEBUG] No changes detected, returning early");
      return;
    }
    console.log("Track Edits v2.0: Recording", changes.length, "changes");
    this.currentEdits.push(...changes);
    console.log("[Track Edits DEBUG] Current edits array length:", this.currentEdits.length);
    console.log("[Track Edits DEBUG] About to call showChangeDecorations");
    this.editRenderer.showChangeDecorations(changes);
    console.log("[Track Edits DEBUG] Called showChangeDecorations");
    this.editTracker.recordChanges(this.currentSession.id, changes);
    this.debouncedPanelUpdate();
    this.debouncedSave();
  }
  updateSidePanel() {
    if (this.sidePanelView) {
      const clusters = this.clusterManager.clusterEdits(this.currentEdits);
      this.sidePanelView.updateClusters(clusters);
    }
  }
  extractChangesFromEditor(editor) {
    console.log("[Track Edits DEBUG] extractChangesFromEditor called");
    const doc = editor.getDoc();
    const cursor = editor.getCursor();
    console.log("[Track Edits DEBUG] Cursor position:", cursor);
    const line = doc.getLine(cursor.line);
    console.log("[Track Edits DEBUG] Current line:", line);
    console.log("[Track Edits DEBUG] Line length:", line == null ? void 0 : line.length);
    if (line && line.length > 0) {
      console.log("Track Edits v2.0: Detected editor change at line", cursor.line, "position", cursor.ch);
      const docPosition = editor.posToOffset(cursor);
      const fromPos = Math.max(0, docPosition - 1);
      const toPos = docPosition;
      const characterAtCursor = line.charAt(cursor.ch - 1) || "";
      console.log("[Track Edits DEBUG] Character at cursor:", characterAtCursor);
      console.log("[Track Edits DEBUG] Doc position:", docPosition);
      console.log("[Track Edits DEBUG] From pos:", fromPos, "To pos:", toPos);
      const change = {
        id: generateId(),
        timestamp: Date.now(),
        type: "insert",
        from: fromPos,
        to: toPos,
        text: characterAtCursor,
        author: "user"
      };
      console.log("[Track Edits DEBUG] Created change object:", change);
      return [change];
    }
    console.log("[Track Edits DEBUG] No valid line found, returning empty array");
    return [];
  }
  addRibbonIcon() {
    this.ribbonIconEl = super.addRibbonIcon("edit", "Track Edits", (evt) => {
      if (this.toggleStateManager) {
        this.toggleStateManager.setTrackingEnabled(!this.toggleStateManager.isTrackingEnabled);
      } else {
        this.debouncedRibbonClick();
      }
    });
    if (this.ribbonIconEl && this.toggleStateManager) {
      this.toggleStateManager.setRibbonIcon(this.ribbonIconEl);
    }
    this.updateRibbonIcon();
  }
  updateRibbonIcon() {
    if (this.ribbonIconEl) {
      const isTracking = !!this.currentSession;
      const tooltipText = isTracking ? "Track Edits: ON (Click to stop)" : "Track Edits: OFF (Click to start)";
      this.ribbonIconEl.setAttribute("aria-label", tooltipText);
      this.ribbonIconEl.setAttribute("title", tooltipText);
    }
  }
  handleRibbonClick() {
    if (this.isRestartingSession) {
      console.log("Track Edits: Ribbon click ignored during session restart");
      return;
    }
    this.isRestartingSession = true;
    try {
      if (this.currentSession) {
        this.stopTracking();
        console.log("Track Edits: Stopped tracking via ribbon icon");
      } else {
        this.startTracking();
        console.log("Track Edits: Started tracking via ribbon icon");
      }
    } catch (error) {
      console.error("Track Edits: Error in ribbon icon handler:", error);
    } finally {
      setTimeout(() => {
        this.isRestartingSession = false;
      }, 100);
    }
  }
  addCommands() {
    this.addCommand({
      id: "start-tracking",
      name: "Start tracking edits",
      callback: () => this.startTracking()
    });
    this.addCommand({
      id: "stop-tracking",
      name: "Stop tracking edits",
      callback: () => this.stopTracking()
    });
    this.addCommand({
      id: "toggle-side-panel",
      name: "Toggle Track Edits side panel",
      callback: () => this.toggleSidePanel()
    });
    this.addCommand({
      id: "export-current-session",
      name: "Export current session",
      callback: () => this.exportCurrentSession()
    });
    this.addCommand({
      id: "view-edit-history",
      name: "View edit history",
      callback: () => this.viewEditHistory()
    });
    this.addCommand({
      id: "clear-edit-history",
      name: "Clear edit history",
      callback: () => this.clearEditHistory()
    });
    if (DEBUG_MODE) {
      this.addCommand({
        id: "debug-show-report",
        name: "\u{1F41B} Show Debug Report",
        callback: () => {
          const report = DebugMonitor.getReport();
          const modal = document.createElement("div");
          modal.style.cssText = `
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            width: 80%; max-width: 800px; height: 70%; 
            background: var(--background-primary); border: 1px solid var(--background-modifier-border);
            border-radius: 8px; padding: 20px; z-index: 10000;
            overflow-y: auto; font-family: var(--font-monospace);
          `;
          const reportText = JSON.stringify(report, null, 2);
          modal.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
              <h2>Track Edits Debug Report</h2>
              <div>
                <button onclick="navigator.clipboard.writeText(this.dataset.report)" data-report="${reportText.replace(/"/g, "&quot;")}" style="padding: 5px 10px; margin-right: 5px;">Copy All</button>
                <button onclick="this.parentElement.parentElement.parentElement.remove()" style="padding: 5px 10px;">Close</button>
              </div>
            </div>
            <div style="margin-bottom: 15px;">
              <h3>Performance Stats <button onclick="navigator.clipboard.writeText(JSON.stringify(${JSON.stringify(report.perfStats)}, null, 2))" style="font-size: 11px; padding: 2px 5px;">Copy</button></h3>
              <pre style="user-select: text; cursor: text; background: var(--background-secondary); padding: 10px; border-radius: 4px;">${JSON.stringify(report.perfStats, null, 2)}</pre>
            </div>
            <div style="margin-bottom: 15px;">
              <h3>Summary <button onclick="navigator.clipboard.writeText(JSON.stringify(${JSON.stringify(report.summary)}, null, 2))" style="font-size: 11px; padding: 2px 5px;">Copy</button></h3>
              <pre style="user-select: text; cursor: text; background: var(--background-secondary); padding: 10px; border-radius: 4px;">${JSON.stringify(report.summary, null, 2)}</pre>
            </div>
            <div>
              <h3>Recent Logs (Last 50) <button onclick="navigator.clipboard.writeText(JSON.stringify(${JSON.stringify(report.recentLogs)}, null, 2))" style="font-size: 11px; padding: 2px 5px;">Copy</button></h3>
              <pre style="user-select: text; cursor: text; background: var(--background-secondary); padding: 10px; border-radius: 4px; font-size: 11px; max-height: 400px; overflow-y: auto;">${JSON.stringify(report.recentLogs, null, 2)}</pre>
            </div>
          `;
          document.body.appendChild(modal);
        }
      });
      this.addCommand({
        id: "debug-clear-logs",
        name: "\u{1F41B} Clear Debug Logs",
        callback: () => {
          DebugMonitor.clear();
          console.log("[Track Edits] Debug logs cleared");
        }
      });
      this.addCommand({
        id: "debug-current-state",
        name: "\u{1F41B} Show Current State",
        callback: () => {
          const state = {
            currentSession: this.currentSession,
            currentEdits: this.currentEdits.length,
            isRejectingEdit,
            hasPluginInstance: !!currentPluginInstance,
            settings: this.settings,
            sidePanelView: !!this.sidePanelView
          };
          console.log("[Track Edits] Current State:", state);
        }
      });
      this.addCommand({
        id: "debug-dump-logs-console",
        name: "\u{1F41B} Dump Logs to Console",
        callback: () => {
          const report = DebugMonitor.getReport();
          console.log("=== TRACK EDITS DEBUG REPORT ===");
          console.log("Performance Stats:", report.perfStats);
          console.log("Summary:", report.summary);
          console.log("Recent Logs:", report.recentLogs);
          console.log("=== END REPORT ===");
        }
      });
    }
  }
  startTracking() {
    if (this.currentSession && !this.isRestartingSession) {
      console.log("Track Edits: Session already active, stopping first");
      this.stopTracking();
    }
    const activeFile = this.app.workspace.getActiveFile();
    if (!activeFile) {
      console.log("Track Edits: No active file to track");
      return;
    }
    this.currentEditorView = this.findCurrentEditorView();
    if (this.currentEditorView) {
      DebugMonitor.log("EDITOR_VIEW_STORED", {
        hasView: !!this.currentEditorView,
        method: "successful"
      });
    } else {
      DebugMonitor.log("EDITOR_VIEW_STORAGE_FAILED", { reason: "no editor found" });
      console.warn("Track Edits: No active editor found during startTracking");
    }
    if (this.currentSession && this.currentSession.id && this.currentSession.startTime) {
      console.log("Track Edits: Preventing duplicate session creation");
      return;
    }
    this.lastActiveFile = activeFile.path;
    this.currentSession = {
      id: generateId(),
      startTime: Date.now(),
      changes: [],
      wordCount: 0,
      characterCount: 0
    };
    this.currentEdits = [];
    this.editTracker.startSession(this.currentSession, activeFile);
    this.editRenderer.showTrackingIndicator();
    if (this.settings.showSidePanelOnStart) {
      this.showSidePanel();
    }
    console.log("Track Edits v2.0: Started tracking session", this.currentSession.id);
    this.updateRibbonIcon();
    this.updateSidePanel();
  }
  stopTracking() {
    try {
      if (this.currentSession) {
        this.currentSession.endTime = Date.now();
        this.saveCurrentSession();
        if (this.editTracker) {
          this.editTracker.endSession(this.currentSession.id);
        }
        if (this.editRenderer) {
          this.editRenderer.hideTrackingIndicator();
        }
        this.clearAllDecorations();
        this.currentEdits = [];
        this.currentSession = null;
        this.lastActiveFile = null;
        this.currentEditorView = null;
        if (this.sidePanelView) {
          this.sidePanelView.updateClusters([]);
        }
      }
    } catch (error) {
      console.error("Track Edits: Error stopping tracking:", error);
      this.currentSession = null;
      this.currentEdits = [];
      this.lastActiveFile = null;
    }
    this.updateRibbonIcon();
    this.updateSidePanel();
  }
  restartSession() {
    try {
      if (this.isRestartingSession) {
        console.log("Track Edits: Restart already in progress, ignoring");
        return;
      }
      if (!this.currentSession) {
        console.log("Track Edits: No session to restart");
        return;
      }
      this.isRestartingSession = true;
      console.log("Track Edits v2.0: Restarting session due to file change");
      const previousSessionId = this.currentSession.id;
      this.stopTracking();
      setTimeout(() => {
        try {
          if (this.settings.enableTracking && !this.currentSession) {
            console.log("Track Edits: Starting new session after restart from", previousSessionId);
            this.startTracking();
          }
        } catch (startError) {
          console.error("Track Edits: Error starting new session after restart:", startError);
        } finally {
          this.isRestartingSession = false;
        }
      }, 150);
    } catch (error) {
      console.error("Track Edits: Error restarting session:", error);
      this.isRestartingSession = false;
    }
  }
  async saveCurrentSession() {
    if (this.currentSession && this.settings.autoSave) {
      await this.editTracker.saveSession(this.currentSession);
    }
  }
  exportCurrentSession() {
    if (!this.currentSession)
      return;
    this.exportSession(this.currentSession.id);
  }
  exportSession(sessionId) {
    const session = this.editTracker.getSession(sessionId);
    if (!session)
      return "";
    const exportData = this.editTracker.formatSessionForExport(session, this.settings.exportFormat);
    const blob = new Blob([exportData], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `edit-session-${sessionId}.${this.settings.exportFormat}`;
    a.click();
    URL.revokeObjectURL(url);
    return exportData;
  }
  viewEditHistory() {
    console.log("Opening edit history view...");
  }
  clearEditHistory() {
    this.editTracker.clearHistory();
  }
  async toggleSidePanel() {
    const existingLeaf = this.app.workspace.getLeavesOfType("track-edits-side-panel")[0];
    if (existingLeaf) {
      existingLeaf.detach();
    } else {
      await this.showSidePanel();
    }
  }
  async showSidePanel() {
    const rightLeaf = this.app.workspace.getRightLeaf(false);
    await rightLeaf.setViewState({
      type: "track-edits-side-panel",
      active: true
    });
    this.sidePanelView = rightLeaf.view;
    this.app.workspace.revealLeaf(rightLeaf);
  }
  acceptEditCluster(clusterId) {
    const timer = DebugMonitor.startTimer("acceptEditCluster");
    const cluster = this.clusterManager.getCluster(clusterId);
    if (!cluster) {
      DebugMonitor.log("ACCEPT_CLUSTER_FAILED", { clusterId, reason: "cluster not found" });
      DebugMonitor.endTimer(timer);
      return;
    }
    DebugMonitor.log("ACCEPT_CLUSTER_START", {
      clusterId,
      editCount: cluster.edits.length,
      editIds: cluster.edits.map((e) => e.id)
    });
    DebugMonitor.log("ACCEPT_REMOVING_DECORATIONS", {
      hasStoredView: !!this.currentEditorView,
      editIds: cluster.edits.map((e) => e.id)
    });
    this.removeDecorationsFromView(cluster.edits.map((e) => e.id));
    this.currentEdits = this.currentEdits.filter(
      (edit) => !cluster.edits.find((clusterEdit) => clusterEdit.id === edit.id)
    );
    this.updateSidePanel();
    DebugMonitor.log("ACCEPT_CLUSTER_COMPLETE", {
      clusterId,
      remainingEdits: this.currentEdits.length
    });
    DebugMonitor.endTimer(timer);
  }
  rejectEditCluster(clusterId) {
    const timer = DebugMonitor.startTimer("rejectEditCluster");
    const cluster = this.clusterManager.getCluster(clusterId);
    if (!cluster) {
      DebugMonitor.log("REJECT_CLUSTER_FAILED", { clusterId, reason: "cluster not found" });
      DebugMonitor.endTimer(timer);
      return;
    }
    DebugMonitor.log("REJECT_CLUSTER_START", {
      clusterId,
      editCount: cluster.edits.length,
      editIds: cluster.edits.map((e) => e.id)
    });
    let editorView = this.currentEditorView;
    DebugMonitor.log("REJECT_CHECKING_VIEW", {
      hasStoredView: !!this.currentEditorView,
      viewType: this.currentEditorView ? this.currentEditorView.constructor.name : "null"
    });
    if (!editorView) {
      DebugMonitor.log("REJECT_FALLBACK_SEARCH", { reason: "no stored editor view, searching" });
      editorView = this.findCurrentEditorView();
    }
    if (!editorView) {
      DebugMonitor.log("REJECT_CLUSTER_FAILED", { reason: "no editor view available" });
      DebugMonitor.endTimer(timer);
      return;
    }
    DebugMonitor.log("REJECT_ALL_EDITS_IN_CLUSTER", {
      allEdits: cluster.edits.map((e) => {
        var _a;
        return { id: e.id, type: e.type, from: e.from, to: e.to, textLength: ((_a = e.text) == null ? void 0 : _a.length) || 0 };
      })
    });
    const insertionsToRemove = cluster.edits.filter((edit) => edit.type === "insert").sort((a, b) => b.from - a.from);
    const deletionsToRestore = cluster.edits.filter((edit) => edit.type === "delete").sort((a, b) => a.from - b.from);
    DebugMonitor.log("REJECT_FILTERED_EDITS", {
      insertionsToRemove: insertionsToRemove.map((e) => {
        var _a;
        return { id: e.id, type: e.type, from: e.from, to: e.to, textLength: ((_a = e.text) == null ? void 0 : _a.length) || 0 };
      }),
      deletionsToRestore: deletionsToRestore.map((e) => {
        var _a;
        return { id: e.id, type: e.type, from: e.from, to: e.to, removedTextLength: ((_a = e.removedText) == null ? void 0 : _a.length) || 0 };
      })
    });
    const doc = editorView.state.doc;
    isRejectingEdit = true;
    try {
      DebugMonitor.log("REJECT_TEXT_PROCESSING", {
        insertionsToRemove: insertionsToRemove.length,
        deletionsToRestore: deletionsToRestore.length,
        docLength: doc.length
      });
      const changes = [];
      for (const edit of insertionsToRemove) {
        if (edit.text) {
          DebugMonitor.log("REJECT_PROCESSING_INSERTION", {
            editId: edit.id,
            editText: edit.text,
            editFrom: edit.from,
            editTextLength: edit.text.length
          });
          const currentText = doc.sliceString(edit.from, edit.from + edit.text.length);
          DebugMonitor.log("REJECT_TEXT_COMPARISON", {
            editId: edit.id,
            position: { from: edit.from, to: edit.from + edit.text.length },
            expectedText: edit.text,
            currentText,
            matches: currentText === edit.text
          });
          if (currentText === edit.text) {
            changes.push({ from: edit.from, to: edit.from + edit.text.length, insert: "" });
            DebugMonitor.log("REJECT_REVERT_INSERT", {
              editId: edit.id,
              removedText: edit.text
            });
          } else {
            DebugMonitor.log("REJECT_REVERT_SKIPPED", {
              editId: edit.id,
              reason: "text mismatch",
              expected: edit.text,
              found: currentText
            });
          }
        }
      }
      for (const edit of deletionsToRestore) {
        if (edit.removedText) {
          DebugMonitor.log("REJECT_PROCESSING_DELETION", {
            editId: edit.id,
            removedText: edit.removedText,
            editFrom: edit.from,
            removedTextLength: edit.removedText.length
          });
          changes.push({ from: edit.from, to: edit.from, insert: edit.removedText });
          DebugMonitor.log("REJECT_RESTORE_DELETION", {
            editId: edit.id,
            restoredText: edit.removedText,
            position: edit.from
          });
        }
      }
      const decorationRemoveEffects = cluster.edits.map(
        (edit) => removeDecorationEffect.of(edit.id)
      );
      if (changes.length > 0) {
        const transaction = editorView.state.update({
          changes,
          effects: decorationRemoveEffects
        });
        editorView.dispatch(transaction);
        DebugMonitor.log("REJECT_CHANGES_APPLIED", {
          changeCount: changes.length,
          effectCount: decorationRemoveEffects.length
        });
      } else {
        editorView.dispatch({
          effects: decorationRemoveEffects
        });
      }
      DebugMonitor.log("REJECT_DISPATCH_COMPLETE", {
        processedEdits: insertionsToRemove.length + deletionsToRestore.length,
        effectCount: decorationRemoveEffects.length
      });
    } finally {
      isRejectingEdit = false;
    }
    this.currentEdits = this.currentEdits.filter(
      (edit) => !cluster.edits.find((clusterEdit) => clusterEdit.id === edit.id)
    );
    this.updateSidePanel();
    DebugMonitor.log("REJECT_CLUSTER_COMPLETE", {
      clusterId,
      remainingEdits: this.currentEdits.length
    });
    DebugMonitor.endTimer(timer);
  }
  // Batch operations for better performance
  acceptAllEditClusters(clusterIds) {
    const timer = DebugMonitor.startTimer("acceptAllEditClusters");
    DebugMonitor.log("ACCEPT_ALL_START", { clusterIds, count: clusterIds.length });
    clusterIds.forEach((clusterId) => {
      const cluster = this.clusterManager.getCluster(clusterId);
      if (cluster && this.currentEditorView) {
        cluster.edits.forEach((edit) => {
          this.currentEditorView.dispatch({
            effects: removeDecorationEffect.of(edit.id)
          });
        });
        this.currentEdits = this.currentEdits.filter(
          (edit) => !cluster.edits.find((clusterEdit) => clusterEdit.id === edit.id)
        );
      }
    });
    this.updateSidePanel();
    DebugMonitor.log("ACCEPT_ALL_COMPLETE", {
      processedCount: clusterIds.length,
      remainingEdits: this.currentEdits.length
    });
    DebugMonitor.endTimer(timer);
  }
  rejectAllEditClusters(clusterIds) {
    const timer = DebugMonitor.startTimer("rejectAllEditClusters");
    DebugMonitor.log("REJECT_ALL_START", { clusterIds, count: clusterIds.length });
    clusterIds.forEach((clusterId) => {
      const cluster = this.clusterManager.getCluster(clusterId);
      if (cluster && this.currentEditorView) {
        const insertionsToRemove = cluster.edits.filter((edit) => edit.type === "insert");
        const deletionsToRestore = cluster.edits.filter((edit) => edit.type === "delete");
        cluster.edits.forEach((edit) => {
          this.currentEditorView.dispatch({
            effects: removeDecorationEffect.of(edit.id)
          });
        });
        if (insertionsToRemove.length > 0 || deletionsToRestore.length > 0) {
          const doc = this.currentEditorView.state.doc;
          const changes = [];
          for (const edit of insertionsToRemove) {
            if (edit.text) {
              const currentText = doc.sliceString(edit.from, edit.from + edit.text.length);
              if (currentText === edit.text) {
                changes.push({ from: edit.from, to: edit.from + edit.text.length, insert: "" });
              }
            }
          }
          for (const edit of deletionsToRestore) {
            if (edit.removedText) {
              changes.push({ from: edit.from, to: edit.from, insert: edit.removedText });
            }
          }
          if (changes.length > 0) {
            this.currentEditorView.dispatch({ changes });
          }
        }
        this.currentEdits = this.currentEdits.filter(
          (edit) => !cluster.edits.find((clusterEdit) => clusterEdit.id === edit.id)
        );
      }
    });
    this.updateSidePanel();
    DebugMonitor.log("REJECT_ALL_COMPLETE", {
      processedCount: clusterIds.length,
      remainingEdits: this.currentEdits.length
    });
    DebugMonitor.endTimer(timer);
  }
  findCurrentEditorView() {
    const activeLeaf = this.app.workspace.getActiveViewOfType(import_obsidian5.MarkdownView);
    if (activeLeaf && activeLeaf.editor) {
      const editorView = activeLeaf.editor.cm;
      if (editorView) {
        DebugMonitor.log("FOUND_EDITOR_VIEW", { method: "active_view" });
        return editorView;
      }
    }
    const leaves = this.app.workspace.getLeavesOfType("markdown");
    for (const leaf of leaves) {
      const view = leaf.view;
      if (view && view.editor) {
        const editorView = view.editor.cm;
        if (editorView) {
          DebugMonitor.log("FOUND_EDITOR_VIEW", { method: "leaf_search", leafId: leaf.id });
          return editorView;
        }
      }
    }
    const mostRecentLeaf = this.app.workspace.getMostRecentLeaf();
    if (mostRecentLeaf && mostRecentLeaf.view instanceof import_obsidian5.MarkdownView && mostRecentLeaf.view.editor) {
      const editorView = mostRecentLeaf.view.editor.cm;
      if (editorView) {
        DebugMonitor.log("FOUND_EDITOR_VIEW", { method: "most_recent_leaf" });
        return editorView;
      }
    }
    DebugMonitor.log("EDITOR_VIEW_NOT_FOUND", {
      activeLeafExists: !!activeLeaf,
      markdownLeavesCount: leaves.length,
      mostRecentLeafExists: !!mostRecentLeaf
    });
    return null;
  }
  removeDecorationsFromView(editIds) {
    let editorView = this.currentEditorView;
    if (!editorView) {
      DebugMonitor.log("REMOVE_DECORATIONS_FALLBACK", { reason: "no stored editor view, searching" });
      editorView = this.findCurrentEditorView();
    }
    if (!editorView) {
      DebugMonitor.log("REMOVE_DECORATIONS_FAILED", { reason: "no editor view available" });
      return;
    }
    const removeEffects = editIds.map((editId) => removeDecorationEffect.of(editId));
    DebugMonitor.log("REMOVING_DECORATIONS", {
      editIds,
      effectCount: removeEffects.length,
      hasEditorView: !!editorView,
      usingStored: editorView === this.currentEditorView
    });
    editorView.dispatch({ effects: removeEffects });
  }
  handleToggleOff() {
    const pendingEditCount = this.currentEdits.length;
    DebugMonitor.log("HANDLE_TOGGLE_OFF", {
      pendingEdits: pendingEditCount,
      hasSession: !!this.currentSession
    });
    if (pendingEditCount === 0) {
      DebugMonitor.log("TOGGLE_OFF_NO_EDITS", { action: "direct_toggle" });
      this.stopTracking();
      return;
    }
    DebugMonitor.log("TOGGLE_OFF_SHOW_MODAL", { pendingEdits: pendingEditCount });
    this.showToggleConfirmationModal(pendingEditCount);
  }
  showToggleConfirmationModal(editCount) {
    const modal = new ToggleConfirmationModal(this.app, {
      editCount,
      onConfirm: () => {
        DebugMonitor.log("TOGGLE_CONFIRMATION_CONFIRMED", { editCount });
        this.discardEditsAndStop();
      },
      onCancel: () => {
        DebugMonitor.log("TOGGLE_CONFIRMATION_CANCELLED", { editCount });
        if (this.toggleStateManager && this.ribbonIconEl) {
          this.ribbonIconEl.classList.add("track-edits-enabled");
          this.ribbonIconEl.classList.remove("track-edits-disabled");
        }
      }
    });
    modal.open();
  }
  discardEditsAndStop() {
    this.stopTracking();
    const clusters = this.clusterManager.clusterEdits(this.currentEdits);
    const clusterIds = clusters.map((cluster) => cluster.id);
    if (clusterIds.length > 0) {
      DebugMonitor.log("DISCARD_EDITS_VIA_REJECT", {
        clusterCount: clusterIds.length,
        method: "rejectAllEditClusters"
      });
      this.rejectAllEditClusters(clusterIds);
    } else {
      DebugMonitor.log("DISCARD_EDITS_DIRECT_CLEAR", {
        editCount: this.currentEdits.length,
        method: "clearAllDecorations"
      });
      this.clearAllDecorations();
    }
  }
  clearAllDecorations() {
    let editorView = this.currentEditorView;
    if (!editorView) {
      editorView = this.findCurrentEditorView();
    }
    if (!editorView) {
      DebugMonitor.log("CLEAR_ALL_DECORATIONS_FAILED", { reason: "no editor view available" });
      return;
    }
    DebugMonitor.log("CLEAR_ALL_DECORATIONS_START", {
      currentEditsCount: this.currentEdits.length,
      hasEditorView: !!editorView
    });
    editorView.dispatch({
      effects: clearAllDecorationsEffect.of(true)
    });
    DebugMonitor.log("CLEAR_ALL_DECORATIONS_COMPLETE", {
      method: "clearAllDecorationsEffect"
    });
  }
  // API method for external plugins (like Editorial Engine via Chat) to apply changes
  applyExternalChange(change) {
    var _a, _b;
    if (!this.currentSession || !this.settings.enableTracking) {
      console.warn("Track Edits: Cannot apply external change - tracking not active");
      return;
    }
    const editChange = {
      id: change.id || generateId(),
      type: change.type === "replace" ? "insert" : change.type,
      // Map replace to insert for now
      from: ((_a = change.range) == null ? void 0 : _a.start) || 0,
      to: ((_b = change.range) == null ? void 0 : _b.end) || 0,
      text: change.newText || "",
      removedText: change.originalText || "",
      timestamp: change.timestamp || Date.now(),
      author: change.source || "external"
    };
    DebugMonitor.log("APPLY_EXTERNAL_CHANGE", {
      originalChange: change,
      convertedEdit: editChange,
      sessionId: this.currentSession.id
    });
    this.currentEdits.push(editChange);
    const decoration = createEditDecoration(editChange);
    const editorView = this.currentEditorView || this.findCurrentEditorView();
    if (editorView) {
      requestAnimationFrame(() => {
        editorView.dispatch({
          effects: addDecorationEffect.of({ edit: editChange, decoration })
        });
      });
    }
    this.editTracker.recordChanges(this.currentSession.id, [editChange]);
    this.debouncedPanelUpdate();
    this.debouncedSave();
    console.log("Track Edits: Applied external change", editChange.id);
  }
  handleEditsFromCodeMirror(edits) {
    var _a;
    const timer = DebugMonitor.startTimer("handleEditsFromCodeMirror");
    DebugMonitor.log("HANDLE_EDITS", {
      editCount: edits.length,
      enableTracking: this.settings.enableTracking,
      hasSession: !!this.currentSession,
      currentEditsCount: this.currentEdits.length,
      edits: edits.map((e) => ({ id: e.id, type: e.type, from: e.from, to: e.to }))
    });
    const isTrackingEnabled = this.settings.enableTracking && (!this.toggleStateManager || this.toggleStateManager.isTrackingEnabled);
    if (!isTrackingEnabled || !this.currentSession) {
      DebugMonitor.log("HANDLE_EDITS_SKIPPED", {
        reason: !this.settings.enableTracking ? "settings disabled" : !((_a = this.toggleStateManager) == null ? void 0 : _a.isTrackingEnabled) ? "toggle disabled" : "no session"
      });
      DebugMonitor.endTimer(timer);
      return;
    }
    this.currentEdits.push(...edits);
    const trackerTimer = DebugMonitor.startTimer("editTracker.recordChanges");
    this.editTracker.recordChanges(this.currentSession.id, edits);
    DebugMonitor.endTimer(trackerTimer);
    this.debouncedPanelUpdate();
    this.debouncedSave();
    DebugMonitor.log("HANDLE_EDITS_COMPLETE", {
      processedCount: edits.length,
      totalEdits: this.currentEdits.length
    });
    DebugMonitor.endTimer(timer);
  }
  // AI Integration Methods (stubs for future implementation)
  async runAIAnalysisOnce() {
    console.log("Track Edits: AI analysis triggered manually");
    DebugMonitor.log("AI_ANALYSIS_TRIGGERED", {
      clustersCount: this.currentEdits.length,
      hasSession: !!this.currentSession,
      aiProvider: this.settings.aiProvider,
      aiModel: this.settings.aiModel
    });
    await new Promise((resolve) => setTimeout(resolve, 1500));
    console.log("Track Edits: AI analysis complete (stub)");
  }
  async loadSystemPrompt() {
    try {
      const promptPath = this.settings.systemPromptPath;
      const adapter = this.app.vault.adapter;
      if (await adapter.exists(promptPath)) {
        return await adapter.read(promptPath);
      } else {
        const defaultPrompt = await this.getDefaultSystemPrompt();
        await adapter.write(promptPath, defaultPrompt);
        return defaultPrompt;
      }
    } catch (error) {
      console.error("Track Edits: Error loading system prompt:", error);
      return this.getDefaultSystemPrompt();
    }
  }
  async getDefaultSystemPrompt() {
    return `# Track Edits AI Analysis System Prompt

You are a Track Edits SME specializing in analyzing keystroke patterns and typing behavior.

Analyze edit clusters to identify user intent and provide workflow insights.

Focus on typing patterns, not content quality.`;
  }
};
//# sourceMappingURL=main.js.map
