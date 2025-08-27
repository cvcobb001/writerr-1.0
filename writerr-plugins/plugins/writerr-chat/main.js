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

// plugins/writerr-chat/src/utils/tooltips.ts
var tooltips_exports = {};
__export(tooltips_exports, {
  TooltipManager: () => TooltipManager,
  addTooltip: () => addTooltip,
  addTooltipToComponent: () => addTooltipToComponent
});
function addTooltip(element, text, delay = 700) {
  const manager = TooltipManager.getInstance();
  manager.addTooltip(element, { text, delay });
}
function addTooltipToComponent(element, text) {
  element.removeAttribute("title");
  element.removeAttribute("data-tooltip");
  addTooltip(element, text);
}
var TooltipManager;
var init_tooltips = __esm({
  "plugins/writerr-chat/src/utils/tooltips.ts"() {
    "use strict";
    TooltipManager = class _TooltipManager {
      constructor() {
        this.activeTooltip = null;
        this.showTimeout = null;
        this.hideTimeout = null;
        this.addGlobalStyles();
      }
      static getInstance() {
        if (!_TooltipManager.instance) {
          _TooltipManager.instance = new _TooltipManager();
        }
        return _TooltipManager.instance;
      }
      addGlobalStyles() {
        const existingStyle = document.getElementById("writerr-tooltip-styles");
        if (existingStyle)
          return;
        const styles = `
/* Writerr Unified Tooltip Styles */
.writerr-tooltip {
  position: fixed !important;
  z-index: 9999 !important;
  background: rgba(0, 0, 0, 0.9) !important;
  color: white !important;
  padding: 6px 10px !important;
  border-radius: 6px !important;
  font-size: 12px !important;
  font-weight: 500 !important;
  white-space: nowrap !important;
  pointer-events: none !important;
  opacity: 0 !important;
  transform: translateY(4px) !important;
  transition: all 0.15s ease !important;
  backdrop-filter: blur(4px) !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3) !important;
  font-family: var(--font-interface) !important;
  line-height: 1.2 !important;
}

.writerr-tooltip.visible {
  opacity: 1 !important;
  transform: translateY(0) !important;
}

.writerr-tooltip::before {
  content: '' !important;
  position: absolute !important;
  width: 0 !important;
  height: 0 !important;
  border-style: solid !important;
}

.writerr-tooltip.position-top::before {
  top: 100% !important;
  left: 50% !important;
  transform: translateX(-50%) !important;
  border-width: 4px 4px 0 4px !important;
  border-color: rgba(0, 0, 0, 0.9) transparent transparent transparent !important;
}

.writerr-tooltip.position-bottom::before {
  bottom: 100% !important;
  left: 50% !important;
  transform: translateX(-50%) !important;
  border-width: 0 4px 4px 4px !important;
  border-color: transparent transparent rgba(0, 0, 0, 0.9) transparent !important;
}

.writerr-tooltip.position-left::before {
  left: 100% !important;
  top: 50% !important;
  transform: translateY(-50%) !important;
  border-width: 4px 0 4px 4px !important;
  border-color: transparent transparent transparent rgba(0, 0, 0, 0.9) !important;
}

.writerr-tooltip.position-right::before {
  right: 100% !important;
  top: 50% !important;
  transform: translateY(-50%) !important;
  border-width: 4px 4px 4px 0 !important;
  border-color: transparent rgba(0, 0, 0, 0.9) transparent transparent !important;
}
`;
        const styleEl = document.createElement("style");
        styleEl.id = "writerr-tooltip-styles";
        styleEl.textContent = styles;
        document.head.appendChild(styleEl);
      }
      addTooltip(element, options) {
        const { text, delay = 700, offset = 8 } = options;
        element.addEventListener("mouseenter", (e) => {
          this.clearTimeouts();
          this.showTimeout = window.setTimeout(() => {
            this.showTooltip(element, text, offset);
          }, delay);
        });
        element.addEventListener("mouseleave", () => {
          this.clearTimeouts();
          this.hideTimeout = window.setTimeout(() => {
            this.hideTooltip();
          }, 100);
        });
        const observer = new MutationObserver((mutations) => {
          mutations.forEach((mutation) => {
            if (mutation.type === "childList") {
              mutation.removedNodes.forEach((node) => {
                if (node === element || node.nodeType === Node.ELEMENT_NODE && node.contains(element)) {
                  this.hideTooltip();
                  observer.disconnect();
                }
              });
            }
          });
        });
        observer.observe(document.body, { childList: true, subtree: true });
      }
      showTooltip(element, text, offset) {
        this.hideTooltip();
        const tooltip = document.createElement("div");
        tooltip.className = "writerr-tooltip";
        tooltip.textContent = text;
        document.body.appendChild(tooltip);
        this.activeTooltip = tooltip;
        const elementRect = element.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();
        const viewport = {
          width: window.innerWidth,
          height: window.innerHeight
        };
        let position = "top";
        let left = 0;
        let top = 0;
        const spaceAbove = elementRect.top;
        const spaceBelow = viewport.height - elementRect.bottom;
        const spaceLeft = elementRect.left;
        const spaceRight = viewport.width - elementRect.right;
        const minSpace = tooltipRect.height + offset + 4;
        const topMinSpace = tooltipRect.height + offset - 10;
        if (spaceAbove >= topMinSpace) {
          position = "top";
          top = elementRect.top - tooltipRect.height - offset;
          left = elementRect.left + elementRect.width / 2 - tooltipRect.width / 2;
        } else if (spaceBelow >= minSpace) {
          position = "bottom";
          top = elementRect.bottom + offset;
          left = elementRect.left + elementRect.width / 2 - tooltipRect.width / 2;
        } else if (spaceLeft >= tooltipRect.width + offset) {
          position = "left";
          top = elementRect.top + elementRect.height / 2 - tooltipRect.height / 2;
          left = elementRect.left - tooltipRect.width - offset;
        } else if (spaceRight >= tooltipRect.width + offset) {
          position = "right";
          top = elementRect.top + elementRect.height / 2 - tooltipRect.height / 2;
          left = elementRect.right + offset;
        } else {
          position = "top";
          top = Math.max(4, elementRect.top - tooltipRect.height - offset);
          left = elementRect.left + elementRect.width / 2 - tooltipRect.width / 2;
        }
        left = Math.max(8, Math.min(left, viewport.width - tooltipRect.width - 8));
        if (position === "top") {
          top = Math.max(4, top);
        } else {
          top = Math.max(8, Math.min(top, viewport.height - tooltipRect.height - 8));
        }
        tooltip.style.left = `${left}px`;
        tooltip.style.top = `${top}px`;
        tooltip.classList.add(`position-${position}`);
        requestAnimationFrame(() => {
          tooltip.classList.add("visible");
        });
      }
      hideTooltip() {
        if (this.activeTooltip) {
          this.activeTooltip.classList.remove("visible");
          setTimeout(() => {
            if (this.activeTooltip) {
              this.activeTooltip.remove();
              this.activeTooltip = null;
            }
          }, 150);
        }
      }
      clearTimeouts() {
        if (this.showTimeout) {
          clearTimeout(this.showTimeout);
          this.showTimeout = null;
        }
        if (this.hideTimeout) {
          clearTimeout(this.hideTimeout);
          this.hideTimeout = null;
        }
      }
    };
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
    if (options.tooltip) {
      this.addTooltip(el, options.tooltip);
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
  addTooltip(element, text, delay = 700) {
    Promise.resolve().then(() => (init_tooltips(), tooltips_exports)).then(({ addTooltipToComponent: addTooltipToComponent2 }) => {
      addTooltipToComponent2(element, text);
    });
  }
};

// plugins/writerr-chat/src/components/MessageBubble.ts
var import_obsidian2 = require("obsidian");

// plugins/writerr-chat/src/utils/icons.ts
var DEFAULT_CONFIG = {
  viewBox: "0 0 24 24",
  width: 16,
  height: 16,
  strokeWidth: 2,
  className: "writerr-icon"
};
var ICON_PATHS = {
  // Communication & Actions
  send: ["m22 2-7 20-4-9-9-4z", "M22 2 11 13"],
  messageCircle: ["M7.9 20A9 9 0 1 0 4 16.1L2 22z"],
  messageSquare: ["M21 15V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h11l5 3z"],
  bot: ['path d="M12 6V2H8"', 'path d="m8 18-4 4V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2Z"', 'path d="M2 12h2"', 'path d="M9 11v2"', 'path d="M15 11v2"', 'path d="M20 12h2"'],
  user: ["M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2", 'circle cx="12" cy="7" r="4"'],
  // File & Document Actions  
  filePlus2: ["M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z", "M14 2v6h6", "M12 12v6", "M9 15h6"],
  copy: ['rect width="14" height="14" x="8" y="8" rx="2" ry="2"', 'path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"'],
  plus: ["M12 5v14", "M5 12h14"],
  // Editing & Cleanup
  paintbrush: ["M18.37 2.63 14 7l-1.59-1.59a2 2 0 0 0-2.82 0L8 7l9 9 1.59-1.59a2 2 0 0 0 0-2.82L17 10l4.37-4.37a2.12 2.12 0 1 0-3-3Z", "M9 8c-2 3-4 3.5-7 4l8 10c2-1 6-5 6-7", "M14.5 17.5L4.5 15"],
  // Navigation & UI
  chevronDown: ["m6 9 6 6 6-6"],
  chevronUp: ["m18 15-6-6-6 6"],
  chevronLeft: ["m15 18-6-6 6-6"],
  chevronRight: ["m9 18 6-6-6-6"],
  x: ["M18 6 6 18", "M6 6l12 12"],
  // Information & Actions
  eye: ['path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-3-7-10-7Z"', 'circle cx="12" cy="12" r="3"'],
  info: ['circle cx="12" cy="12" r="10"', 'path d="m12 16v-4"', 'path d="m12 8h.01"'],
  settings: ['circle cx="12" cy="12" r="3"', 'path d="M12 1v6m0 6v6m-3-9h6m-6 6h6'],
  // Loading & Status
  loader: ['path d="M21 12a9 9 0 11-6.219-8.56"'],
  // Content Actions
  refresh: ['path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"', 'path d="M21 3v5h-5"', 'path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"', 'path d="M8 16H3v5"'],
  trash: ['path d="M3 6h18"', 'path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"', 'path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"'],
  // Text & Editing
  type: ['polyline points="4,7 4,4 20,4 20,7"', 'line x1="9" y1="20" x2="15" y2="20"', 'line x1="12" y1="4" x2="12" y2="20"'],
  edit3: ['path d="M12 20h9"', 'path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"']
};
function createIcon(name, config = {}) {
  const { viewBox, width, height, strokeWidth, className } = { ...DEFAULT_CONFIG, ...config };
  const paths = ICON_PATHS[name];
  if (!paths) {
    console.warn(`Icon "${name}" not found`);
    return createIcon("info", config);
  }
  const pathElements = Array.isArray(paths) ? paths.map((path) => {
    if (path.startsWith("M") || path.startsWith("m") || path.startsWith("L") || path.startsWith("path d=")) {
      const d = path.startsWith("path d=") ? path.slice(8, -1) : path;
      return `<path d="${d}"/>`;
    } else if (path.includes("cx") || path.includes("cy") || path.includes("r")) {
      return `<${path}/>`;
    } else if (path.includes("width") || path.includes("height") || path.includes("x") || path.includes("y")) {
      return `<${path}/>`;
    } else if (path.includes("x1") || path.includes("y1") || path.includes("x2") || path.includes("y2")) {
      return `<${path}/>`;
    } else if (path.includes("points")) {
      return `<${path}/>`;
    } else {
      return `<path d="${path}"/>`;
    }
  }).join("") : `<path d="${paths}"/>`;
  return `
    <svg 
      class="${className}" 
      width="${width}" 
      height="${height}" 
      viewBox="${viewBox}" 
      fill="none" 
      stroke="currentColor" 
      stroke-width="${strokeWidth}"
    >
      ${pathElements}
    </svg>
  `.trim();
}
var ICON_SIZES = {
  xs: { width: 14, height: 14 },
  // Was 12x12
  sm: { width: 16, height: 16 },
  // Was 14x14  
  md: { width: 20, height: 20 },
  // Was 16x16 - for avatars
  lg: { width: 24, height: 24 },
  // Was 18x18
  xl: { width: 28, height: 28 }
  // Was 20x20
};
var ICON_STYLES = {
  toolbar: { className: "writerr-toolbar-icon", ...ICON_SIZES.md },
  action: { className: "writerr-action-icon", ...ICON_SIZES.md },
  context: { className: "writerr-context-action-icon", ...ICON_SIZES.md },
  send: { className: "writerr-send-icon", ...ICON_SIZES.md },
  message: { className: "writerr-message-icon", ...ICON_SIZES.xl }
};
function createStyledIcon(name, style) {
  return createIcon(name, ICON_STYLES[style]);
}
var Icons = {
  send: (config) => createIcon("send", config),
  bot: (config) => createIcon("bot", config),
  user: (config) => createIcon("user", config),
  copy: (config) => createIcon("copy", config),
  paintbrush: (config) => createIcon("paintbrush", config),
  filePlus2: (config) => createIcon("filePlus2", config),
  plus: (config) => createIcon("plus", config),
  chevronDown: (config) => createIcon("chevronDown", config),
  eye: (config) => createIcon("eye", config),
  loader: (config) => createIcon("loader", config),
  trash: (config) => createIcon("trash", config),
  refresh: (config) => createIcon("refresh", config),
  edit3: (config) => createIcon("edit3", config),
  x: (config) => createIcon("x", config),
  info: (config) => createIcon("info", config)
};

// plugins/writerr-chat/src/components/MessageBubble.ts
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
      avatar.innerHTML = Icons.user({
        className: "writerr-message-avatar",
        width: 20,
        height: 20
      });
    } else {
      avatar.innerHTML = Icons.bot({
        className: "writerr-message-avatar",
        width: 20,
        height: 20
      });
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
      this.actionsEl.style.justifyContent = "flex-end";
    } else {
      this.actionsEl.style.justifyContent = "flex-start";
    }
    if (isUser) {
      this.createActionButton(
        "copy",
        "Copy message",
        Icons.copy({ className: "writerr-action-icon", ...ICON_STYLES.action }),
        () => this.actionHandler.onCopy(this.message)
      );
      this.createInfoHoverButton(true);
    } else {
      this.createActionButton(
        "retry",
        "Retry this response",
        Icons.refresh({ className: "writerr-action-icon", ...ICON_STYLES.action }),
        () => this.actionHandler.onRetry(this.message)
      );
      this.createActionButton(
        "copy",
        "Copy message",
        Icons.copy({ className: "writerr-action-icon", ...ICON_STYLES.action }),
        () => this.actionHandler.onCopy(this.message)
      );
      this.createInfoHoverButton(false);
    }
  }
  createActionButton(type, tooltip, icon, onClick) {
    const btn = this.actionsEl.createEl("button", { cls: `message-action-btn action-${type}` });
    btn.innerHTML = icon;
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
    this.addTooltip(btn, tooltip);
    btn.offsetHeight;
    this.addHoverEffect(btn, {
      "color": "var(--text-muted)",
      "opacity": "1"
    });
  }
  createInfoHoverButton(isUser) {
    var _a, _b;
    const btn = this.actionsEl.createEl("button", { cls: `message-action-btn action-info` });
    btn.innerHTML = Icons.info({ className: "writerr-action-icon", ...ICON_STYLES.action });
    btn.style.cssText = `
      background: transparent !important;
      border: none !important;
      box-shadow: none !important;
      padding: 4px !important;
      border-radius: 4px !important;
      cursor: default !important;
      color: var(--text-faint) !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      transition: all 0.2s ease !important;
      width: 24px !important;
      height: 24px !important;
      opacity: 0.6 !important;
    `;
    const timestamp = new Date(this.message.timestamp).toLocaleString();
    let tooltipText = `[${timestamp}]`;
    if (!isUser) {
      const model = ((_a = this.message.metadata) == null ? void 0 : _a.selectedModel) || ((_b = this.message.metadata) == null ? void 0 : _b.model) || "AI Assistant";
      tooltipText = `[${timestamp}] \u2022 [${model}]`;
    }
    this.addTooltip(btn, tooltipText);
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

// plugins/writerr-chat/src/components/menus/WriterMenu.ts
var import_obsidian3 = require("obsidian");
var WriterMenu = class _WriterMenu {
  constructor(options = {}) {
    this.menu = new import_obsidian3.Menu();
    this.options = {
      style: "refined",
      spacing: "comfortable",
      minWidth: 280,
      ...options
    };
    const styleClass = `writerr-menu-${this.options.style}`;
    const spacingClass = `writerr-menu-${this.options.spacing}`;
    const customClass = this.options.className || "";
    this.options.className = [styleClass, spacingClass, customClass].filter(Boolean).join(" ");
    const isSubmenu = customClass.includes("writerr-submenu");
    if (!isSubmenu) {
      const originalShow = this.menu.showAtMouseEvent.bind(this.menu);
      const originalShowAtPosition = this.menu.showAtPosition.bind(this.menu);
      this.menu.showAtMouseEvent = (event) => {
        const result = originalShow(event);
        this.applyRefinedStyling();
        return result;
      };
      this.menu.showAtPosition = (position) => {
        const result = originalShowAtPosition(position);
        this.applyRefinedStyling();
        return result;
      };
    }
  }
  /**
   * Enhanced debug method to identify actual menu DOM elements
   */
  applyRefinedStyling() {
    console.log("\u{1F3A8} Menu styling removed - using clean defaults");
  }
  /**
   * Add a menu item with optional callback
   */
  addItem(title, callback) {
    this.menu.addItem((item) => {
      item.setTitle(title);
      if (callback) {
        item.onClick(callback);
      }
    });
    return this;
  }
  /**
   * Add a menu item with an icon
   */
  addItemWithIcon(title, icon, callback) {
    this.menu.addItem((item) => {
      item.setTitle(title);
      if (icon) {
        item.setIcon(icon);
      }
      if (callback) {
        item.onClick(callback);
      }
    });
    return this;
  }
  /**
   * Add a checked menu item (for current selections)
   */
  addCheckedItem(title, checked = false, callback) {
    this.menu.addItem((item) => {
      item.setTitle(title);
      if (checked) {
        item.setChecked(true);
      }
      if (callback) {
        item.onClick(callback);
      }
    });
    return this;
  }
  /**
   * Add a submenu with nested items (simplified for now)
   * Note: Full nested submenus may require a different approach with Obsidian's API
   */
  /**
   * Add a submenu with nested items using Obsidian's native setSubmenu() API
   */
  addSubmenu(title, builder) {
    this.menu.addItem((item) => {
      item.setTitle(title);
      const obsidianSubmenu = item.setSubmenu();
      const writerSubmenu = new _WriterMenu({
        ...this.options,
        className: `${this.options.className || ""} writerr-submenu`.trim()
      });
      writerSubmenu.menu = obsidianSubmenu;
      builder(writerSubmenu);
      setTimeout(() => {
        const submenuElement = writerSubmenu.menu.dom;
        if (submenuElement instanceof HTMLElement) {
          submenuElement.style.setProperty("position", "absolute", "important");
          submenuElement.style.setProperty("left", "100%", "important");
          submenuElement.style.setProperty("top", "0", "important");
          submenuElement.style.setProperty("margin-left", "2px", "important");
          console.log("\u{1F527} Fixed submenu positioning to prevent overlap");
        }
      }, 0);
    });
    return this;
  }
  /**
   * Add a separator line
   */
  addSeparator() {
    this.menu.addSeparator();
    return this;
  }
  /**
   * Add a disabled item (for category headers or unavailable options)
   */
  addDisabledItem(title) {
    this.menu.addItem((item) => {
      item.setTitle(title);
      item.setDisabled(true);
    });
    return this;
  }
  /**
   * Set the currently selected item (will be highlighted)
   */
  setCurrentSelection(selection) {
    this.currentSelection = selection;
    return this;
  }
  /**
   * Show menu at mouse cursor position
   */
  /**
   * Show menu at mouse cursor position
   */
  showAtMouseEvent(event) {
    this.lastShowPosition = { x: event.clientX, y: event.clientY };
    this.menu.showAtMouseEvent(event);
  }
  /**
   * Show menu at a specific position
   */
  /**
   * Show menu at a specific position
   */
  showAtPosition(x, y) {
    this.lastShowPosition = { x, y };
    this.menu.showAtPosition({ x, y });
  }
  /**
   * Show menu relative to an element
   */
  showAtElement(element, options) {
    const rect = element.getBoundingClientRect();
    const placement = (options == null ? void 0 : options.placement) || "bottom-start";
    const offset = (options == null ? void 0 : options.offset) || { x: 0, y: 0 };
    let x = rect.left + offset.x;
    let y = rect.bottom + offset.y;
    switch (placement) {
      case "bottom-start":
        x = rect.left + offset.x;
        y = rect.bottom + offset.y;
        break;
      case "bottom-end":
        x = rect.right + offset.x;
        y = rect.bottom + offset.y;
        break;
      case "top-start":
        x = rect.left + offset.x;
        y = rect.top + offset.y;
        break;
      case "top-end":
        x = rect.right + offset.x;
        y = rect.top + offset.y;
        break;
      case "right-start":
        x = rect.right + offset.x;
        y = rect.top + offset.y;
        break;
      case "right-end":
        x = rect.right + offset.x;
        y = rect.bottom + offset.y;
        break;
    }
    this.menu.showAtPosition({ x, y });
  }
  /**
   * Hide the menu
   */
  hide() {
    this.menu.hide();
  }
  /**
   * Get the underlying Obsidian Menu instance (for advanced usage)
   */
  getObsidianMenu() {
    return this.menu;
  }
  /**
   * Get the current menu position (helper for submenu positioning)
   */
  getMenuPosition() {
    return this.lastShowPosition || null;
  }
  /**
   * Static helper to create a menu from a configuration object
   */
  static fromConfig(items, options) {
    const menu = new _WriterMenu(options);
    const buildItems = (menuItems, targetMenu) => {
      for (const item of menuItems) {
        if (item.separator) {
          targetMenu.addSeparator();
        } else if (item.submenu) {
          targetMenu.addSubmenu(item.title, (submenu) => {
            buildItems(item.submenu, submenu);
          });
        } else if (item.disabled) {
          targetMenu.addDisabledItem(item.title);
        } else if (item.icon) {
          targetMenu.addItemWithIcon(item.title, item.icon, item.callback);
        } else {
          targetMenu.addItem(item.title, item.callback);
        }
      }
    };
    buildItems(items, menu);
    return menu;
  }
};
var WriterMenuFactory = class {
  /**
   * Create a model selection menu with Provider → Family → Model hierarchy
   */
  /**
   * Create a model selection menu with Provider → Family → Model hierarchy
   */
  static createModelMenu(providers, currentSelection, onSelect) {
    const menu = new WriterMenu({
      style: "refined",
      spacing: "comfortable",
      className: "writerr-model-menu"
    });
    if (currentSelection) {
      menu.setCurrentSelection(currentSelection);
    }
    for (const [providerName, families] of Object.entries(providers)) {
      menu.addSubmenu(providerName, (providerSubmenu) => {
        for (const [familyName, models] of Object.entries(families)) {
          providerSubmenu.addSubmenu(`${familyName}`, (modelSubmenu) => {
            models.forEach((model) => {
              const isSelected = currentSelection === `${providerName}:${model}`;
              modelSubmenu.addCheckedItem(model, isSelected, () => {
                onSelect == null ? void 0 : onSelect(providerName, model);
              });
            });
          });
        }
      });
    }
    return menu;
  }
  /**
   * Create a simple prompt selection menu
   */
  /**
   * Create a simple prompt selection menu
   */
  static createPromptMenu(prompts, currentSelection, onSelect) {
    const menu = new WriterMenu({
      style: "refined",
      spacing: "comfortable",
      className: "writerr-prompt-menu"
    });
    if (currentSelection) {
      menu.setCurrentSelection(currentSelection);
    }
    prompts.forEach((prompt) => {
      const isSelected = currentSelection === prompt.path;
      menu.addCheckedItem(prompt.name, isSelected, () => {
        onSelect == null ? void 0 : onSelect(prompt.path);
      });
    });
    return menu;
  }
};

// plugins/writerr-chat/src/components/ChatHeader.ts
var ChatHeader = class extends BaseComponent {
  constructor(options) {
    super(options);
    this.currentMode = "chat";
    this.events = options.events;
  }
  render() {
    this.createHeader();
    this.createLeftSection();
    this.createRightSection();
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
    this.createNewModeButton(leftContainer);
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
    historyButton.onclick = (e) => this.showHistoryMenu(e);
    this.addTooltip(historyButton, "Chat History");
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
    settingsButton.onclick = () => this.events.onSettingsClick();
    this.addTooltip(settingsButton, "Chat Settings");
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
      this.refreshModeOptions();
    }
  }
  getSelectedMode() {
    return this.currentMode;
  }
  setMode(mode) {
    this.currentMode = mode;
    if (this.modeButton) {
      const textNode = Array.from(this.modeButton.childNodes).find((node) => node.nodeType === Node.TEXT_NODE);
      if (textNode) {
        textNode.textContent = this.getCurrentModeDisplayName();
      }
    }
  }
  refreshModeOptions() {
    if (this.modeButton) {
      const textNode = Array.from(this.modeButton.childNodes).find((node) => node.nodeType === Node.TEXT_NODE);
      if (textNode) {
        textNode.textContent = this.getCurrentModeDisplayName();
      }
    }
  }
  showHistoryMenu(event) {
    const historyMenu = new WriterMenu();
    const sessions = this.plugin.getChatSessions();
    if (sessions.length === 0) {
      historyMenu.addDisabledItem("No chat sessions yet");
      historyMenu.addSeparator();
      historyMenu.addItem("Start New Session", () => {
        var _a, _b;
        (_b = (_a = this.events).onNewSession) == null ? void 0 : _b.call(_a);
      });
    } else {
      sessions.forEach((session) => {
        var _a, _b;
        const sessionTitle = session.title || `Session ${sessions.indexOf(session) + 1}`;
        const messageCount = ((_a = session.messages) == null ? void 0 : _a.length) || 0;
        const isCurrentSession = ((_b = this.plugin.currentSession) == null ? void 0 : _b.id) === session.id;
        const displayTitle = `${sessionTitle}${messageCount > 0 ? ` \u2022 ${messageCount} msg${messageCount !== 1 ? "s" : ""}` : ""}`;
        if (isCurrentSession) {
          historyMenu.addCheckedItem(displayTitle, true, () => {
          });
        } else {
          historyMenu.addItem(displayTitle, () => {
            var _a2, _b2;
            (_b2 = (_a2 = this.events).onSessionSelect) == null ? void 0 : _b2.call(_a2, session.id);
          });
        }
      });
      historyMenu.addSeparator();
      historyMenu.addItem("New Session", () => {
        var _a, _b;
        (_b = (_a = this.events).onNewSession) == null ? void 0 : _b.call(_a);
      });
    }
    historyMenu.showAtMouseEvent(event);
  }
  getTimeAgo(date) {
    const now = /* @__PURE__ */ new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMinutes = Math.floor(diffInMs / 6e4);
    if (diffInMinutes < 1)
      return "now";
    if (diffInMinutes < 60)
      return `${diffInMinutes}m`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24)
      return `${diffInHours}h`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7)
      return `${diffInDays}d`;
    return date.toLocaleDateString();
  }
  createNewModeButton(parent) {
    const modeButton = parent.createEl("button", { cls: "writerr-mode-button" });
    modeButton.textContent = this.getCurrentModeDisplayName();
    modeButton.style.cssText = `
      background: transparent;
      border: none;
      padding: 4px 8px;
      color: var(--text-normal);
      cursor: pointer;
      font-size: 18px;
      font-weight: 400;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: color 0.2s ease;
      min-width: auto;
      justify-content: flex-start;
      box-shadow: none;
    `;
    const chevron = modeButton.createEl("span");
    chevron.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="6,9 12,15 18,9"/>
      </svg>
    `;
    modeButton.onclick = (e) => this.showModeMenu(e, modeButton);
    this.modeButton = modeButton;
    modeButton.addEventListener("mouseenter", () => {
      modeButton.style.color = "var(--text-accent)";
    });
    modeButton.addEventListener("mouseleave", () => {
      modeButton.style.color = "var(--text-normal)";
    });
  }
  getCurrentModeDisplayName() {
    var _a;
    if (this.currentMode === "chat") {
      return "Chat Mode";
    }
    if (((_a = window.Writerr) == null ? void 0 : _a.editorial) && this.currentMode !== "editorial-loading" && this.currentMode !== "editorial-unavailable") {
      try {
        const modes = window.Writerr.editorial.getEnabledModes();
        const mode = modes.find((m) => m.id === this.currentMode);
        return (mode == null ? void 0 : mode.name) || this.currentMode;
      } catch (error) {
        console.warn("Failed to get mode display name:", error);
      }
    }
    return this.currentMode;
  }
  showModeMenu(event, button) {
    var _a;
    const modeMenu = new WriterMenu();
    if (this.currentMode === "chat") {
      modeMenu.addCheckedItem("Chat Mode", true, () => {
        this.selectMode("chat", "Chat Mode", button);
      });
    } else {
      modeMenu.addItem("Chat Mode", () => {
        this.selectMode("chat", "Chat Mode", button);
      });
    }
    if ((_a = window.Writerr) == null ? void 0 : _a.editorial) {
      try {
        const modes = window.Writerr.editorial.getEnabledModes();
        if (modes.length > 0) {
          modeMenu.addSeparator();
          modes.forEach((mode) => {
            if (this.currentMode === mode.id) {
              modeMenu.addCheckedItem(mode.name, true, () => {
                this.selectMode(mode.id, mode.name, button);
              });
            } else {
              modeMenu.addItem(mode.name, () => {
                this.selectMode(mode.id, mode.name, button);
              });
            }
          });
        }
      } catch (error) {
        console.warn("Failed to load Editorial Engine modes for menu:", error);
        modeMenu.addSeparator();
        modeMenu.addDisabledItem("Editorial Engine Unavailable");
      }
    } else {
      modeMenu.addSeparator();
      modeMenu.addDisabledItem("Editorial Engine Loading...");
    }
    modeMenu.showAtMouseEvent(event);
  }
  selectMode(modeId, displayName, button) {
    this.currentMode = modeId;
    const textNode = Array.from(button.childNodes).find((node) => node.nodeType === Node.TEXT_NODE);
    if (textNode) {
      textNode.textContent = displayName;
    }
    this.events.onModeChange(modeId);
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
    collapseIcon.innerHTML = Icons.chevronDown({ width: 14, height: 14 });
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
    addDocButton.innerHTML = Icons.plus({ width: 16, height: 16 });
    addDocButton.onclick = (e) => {
      e.stopPropagation();
      this.showDirectoryMenu(e);
    };
    this.addTooltip(addDocButton, "Add document to context");
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
    this.clearButton.onclick = (e) => {
      e.stopPropagation();
      this.clearAllDocuments();
    };
    this.clearButton.innerHTML = Icons.paintbrush({
      className: "writerr-context-action-icon",
      width: 18,
      height: 18
    });
    this.addTooltip(this.clearButton, "Clear all context");
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
    docIcon.innerHTML = Icons.filePlus2({ width: 12, height: 12 });
    docIcon.style.cssText = "color: var(--text-muted); flex-shrink: 0;";
    const docName = docChip.createEl("span", { text: doc.name });
    docName.style.cssText = `
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      flex: 1;
    `;
    const removeBtn = docChip.createEl("button");
    removeBtn.innerHTML = Icons.x({ width: 12, height: 12 });
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
    if (!badge) {
      console.warn("Context count badge element not found");
      return;
    }
    const count = this.documents.length;
    console.log(`Updating context count badge: ${count} documents`);
    if (count > 0) {
      badge.textContent = count.toString();
      badge.style.cssText = `
        display: inline-block !important;
        background: var(--interactive-accent);
        color: white !important;
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
  showDirectoryMenu(event) {
    try {
      console.log("\u{1F50D} Building directory menu for file selection");
      const directoryMap = this.buildDirectoryMap();
      if (Object.keys(directoryMap).length === 0) {
        console.log("No directories found in vault");
        return;
      }
      const menu = this.createDirectoryMenu(directoryMap);
      menu.showAtMouseEvent(event);
    } catch (error) {
      console.error("WriterMenu: Error showing directory menu:", error);
      this.showDocumentPicker();
    }
  }
  buildDirectoryMap() {
    const directoryMap = {};
    console.log("\u{1F3DB}\uFE0F Vault info:", this.plugin.app.vault.getName());
    console.log("\u{1F3DB}\uFE0F Vault adapter:", this.plugin.app.vault.adapter.constructor.name);
    const allFiles = this.plugin.app.vault.getAllLoadedFiles();
    const supportedExtensions = [
      // Documents
      ".md",
      ".txt",
      ".pdf",
      ".doc",
      ".docx",
      ".rtf",
      ".odt",
      // Spreadsheets  
      ".xls",
      ".xlsx",
      ".csv",
      // Code files
      ".js",
      ".ts",
      ".json",
      ".html",
      ".css",
      ".scss",
      ".less",
      ".py",
      ".java",
      ".cpp",
      ".c",
      ".h",
      ".php",
      ".rb",
      ".go",
      ".rs",
      ".swift",
      ".kt",
      ".scala",
      ".sh",
      ".bash",
      ".zsh",
      ".xml",
      ".yaml",
      ".yml",
      ".toml",
      ".ini",
      ".env",
      // Creative writing
      ".highland",
      ".fountain",
      ".celtx",
      // Other
      ".log",
      ".config"
    ];
    const supportedFiles = allFiles.filter((file) => {
      var _a;
      if (!file.path.includes("."))
        return false;
      const extension = "." + ((_a = file.path.split(".").pop()) == null ? void 0 : _a.toLowerCase());
      return supportedExtensions.includes(extension);
    });
    console.log(`\u{1F50D} Processing ${supportedFiles.length} supported files from ${allFiles.length} total files`);
    console.log("\u{1F4CB} Supported extensions:", supportedExtensions);
    console.log("\u{1F4CB} Sample files:", supportedFiles.slice(0, 10).map((f) => f.path));
    for (const file of supportedFiles) {
      const pathParts = file.path.split("/");
      console.log(`   Processing: ${file.path} -> ${pathParts.length} parts:`, pathParts);
      if (pathParts.length === 1) {
        if (!directoryMap["Root"]) {
          directoryMap["Root"] = [];
        }
        directoryMap["Root"].push(file.path);
        console.log(`     Added to Root: ${file.path}`);
      } else {
        const directoryPath = pathParts.slice(0, -1).join("/");
        if (!directoryMap[directoryPath]) {
          directoryMap[directoryPath] = [];
          console.log(`     Created new directory: ${directoryPath}`);
        }
        directoryMap[directoryPath].push(file.path);
        console.log(`     Added to ${directoryPath}: ${file.path}`);
      }
    }
    console.log("\u{1F5C2}\uFE0F FINAL directory map with", Object.keys(directoryMap).length, "directories");
    console.log("\u{1F4C1} ALL Directories found:");
    Object.keys(directoryMap).forEach((dir) => {
      console.log(`   ${dir}: ${directoryMap[dir].length} files`);
      console.log(`      Files:`, directoryMap[dir].slice(0, 3), directoryMap[dir].length > 3 ? "..." : "");
    });
    return directoryMap;
  }
  createDirectoryMenu(directoryMap) {
    const menu = new WriterMenu({
      style: "refined",
      spacing: "comfortable",
      className: "writerr-directory-menu"
    });
    console.log(`\u{1F3A8} Creating menu with ${Object.keys(directoryMap).length} directories`);
    for (const [directoryName, files] of Object.entries(directoryMap)) {
      console.log(`   \u{1F3A8} Adding directory submenu: ${directoryName} (${files.length} files)`);
      menu.addSubmenu(directoryName, (fileSubmenu) => {
        files.forEach((filePath) => {
          const fileName = filePath.split("/").pop() || filePath;
          console.log(`      \u{1F4C4} Adding file item: ${fileName} -> ${filePath}`);
          fileSubmenu.addItem(fileName, () => {
            console.log(`\u{1F4C4} Selected file: ${filePath}`);
            this.addDocumentFromPath(filePath);
          });
        });
      });
    }
    console.log("\u{1F3A8} Menu creation completed");
    return menu;
  }
  addDocumentFromPath(filePath) {
    const file = this.plugin.app.vault.getAbstractFileByPath(filePath);
    if (!file) {
      console.error("File not found:", filePath);
      return;
    }
    const doc = {
      path: file.path,
      name: file.name.replace(".md", ""),
      content: ""
      // Will be loaded when needed
    };
    this.addDocument(doc);
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
      padding: 8px;
      background: var(--background-primary);
      position: relative;
    `;
  }
  createMessageInput() {
    this.messageInput = this.container.createEl("textarea", {
      cls: "chat-message-input",
      attr: {
        placeholder: "Type your message...",
        rows: "3"
      }
    });
    this.messageInput.style.cssText = `
      width: 100%;
      min-height: 80px;
      max-height: 200px;
      padding: 12px 52px 12px 12px;
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
    this.sendButton.innerHTML = Icons.send({ className: "writerr-send-icon", width: 16, height: 16 });
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
      this.sendButton.innerHTML = Icons.loader({
        className: "writerr-send-icon",
        width: 18,
        height: 18
      });
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
      this.sendButton.innerHTML = Icons.send({
        className: "writerr-send-icon",
        width: 18,
        height: 18
      });
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
var ChatToolbar = class extends BaseComponent {
  constructor(options) {
    super(options);
    // NEW: Smart document button
    this.availablePrompts = [];
    this.events = options.events;
  }
  render() {
    this.createToolbarContainer();
    this.createToolbarElements();
  }
  createToolbarContainer() {
    this.container.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 12px;
      border-top: 1px solid var(--background-modifier-border);
      background: var(--background-primary);
      font-size: 12px;
      color: var(--text-muted);
      min-height: 44px;
      overflow: hidden;
    `;
  }
  createToolbarElements() {
    this.container.style.cssText = `
      all: initial;
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 12px;
      border-top: 1px solid var(--background-modifier-border);
      background: var(--background-secondary);
      font-size: 12px;
      color: var(--text-muted);
      min-height: 40px;
      box-sizing: border-box;
      font-family: var(--font-interface);
    `;
    this.createSmartDocumentButton(
      this.container,
      "Add document to chat",
      createStyledIcon("filePlus2", "toolbar"),
      () => this.events.onAddDocument()
    );
    this.createActionButton(
      this.container,
      "Copy entire chat",
      createStyledIcon("copy", "toolbar"),
      () => this.events.onCopyChat()
    );
    this.createActionButton(
      this.container,
      "Clear chat",
      createStyledIcon("paintbrush", "toolbar"),
      () => this.events.onClearChat()
    );
    const spacer = this.container.createEl("div");
    spacer.style.cssText = "flex: 1; min-width: 20px;";
    this.createPromptSelect(this.container);
    this.createModelSelect(this.container);
    this.createTokenCounter(this.container);
  }
  createTestToolbar() {
    const testToolbar = this.container.parentElement.createEl("div");
    testToolbar.style.cssText = `
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 12px;
      border-top: 1px solid var(--background-modifier-border);
      background: var(--background-secondary);
      font-size: 12px;
      color: var(--text-muted);
      min-height: 40px;
      margin-top: 4px;
    `;
    const label = testToolbar.createEl("span");
    label.textContent = "TEST:";
    label.style.cssText = "font-weight: bold; color: var(--text-accent);";
    const freshPromptButton = testToolbar.createEl("button");
    freshPromptButton.style.cssText = `
      all: initial;
      font-family: inherit;
      border: 1px solid var(--background-modifier-border);
      background: var(--background-primary);
      padding: 4px 8px;
      font-size: 12px;
      color: var(--text-normal);
      cursor: pointer;
      width: 120px;
      text-align: left;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      border-radius: 4px;
    `;
    freshPromptButton.textContent = "casual-conversational";
    const freshModelButton = testToolbar.createEl("button");
    freshModelButton.style.cssText = `
      all: initial;
      font-family: inherit;
      border: 1px solid var(--background-modifier-border);
      background: var(--background-primary);
      padding: 4px 8px;
      font-size: 12px;
      color: var(--text-normal);
      cursor: pointer;
      width: 100px;
      text-align: left;
      border-radius: 4px;
    `;
    freshModelButton.textContent = "claude-3.5-sonnet";
    const freshTokens = testToolbar.createEl("span");
    freshTokens.style.cssText = `
      font-size: 12px;
      color: var(--text-muted);
    `;
    freshTokens.textContent = "267 / unavailable";
  }
  createActionButton(parent, tooltip, icon, onClick) {
    const button = parent.createEl("button", {
      cls: "writerr-toolbar-button"
    });
    button.innerHTML = icon;
    button.onclick = onClick;
    this.addTooltip(button, tooltip);
  }
  createSmartDocumentButton(parent, tooltip, icon, onClick) {
    const button = parent.createEl("button", {
      cls: "writerr-toolbar-button writerr-document-button"
    });
    button.innerHTML = icon;
    button.onclick = () => {
      const activeFile = this.plugin.app.workspace.getActiveFile();
      if (!activeFile)
        return;
      const chatLeaf = this.plugin.app.workspace.getLeavesOfType("writerr-chat-view")[0];
      const chatView = chatLeaf == null ? void 0 : chatLeaf.view;
      const contextArea = chatView == null ? void 0 : chatView.contextArea;
      if (!contextArea) {
        console.error("ChatToolbar: Context area not found");
        return;
      }
      const documentsInContext = contextArea.getDocuments() || [];
      const isInContext = documentsInContext.some((doc) => doc.path === activeFile.path);
      if (!isInContext) {
        const documentContext = {
          name: activeFile.name,
          path: activeFile.path
        };
        console.log("ChatToolbar: Adding document to context:", documentContext);
        contextArea.addDocument(documentContext);
        this.updateDocumentButtonState();
      } else {
        console.log("ChatToolbar: Document already in context:", activeFile.name);
      }
    };
    this.documentButton = button;
    this.plugin.registerEvent(
      this.plugin.app.workspace.on("active-leaf-change", () => {
        setTimeout(() => this.updateDocumentButtonState(), 100);
      })
    );
    this.updateDocumentButtonState();
    this.addTooltip(button, tooltip);
  }
  createModelSelect(parent) {
    const modelButton = parent.createEl("button");
    modelButton.style.cssText = `
      background: transparent;
      border: none;
      padding: 6px 24px 6px 8px;
      font-size: 12px;
      color: var(--text-muted);
      cursor: pointer;
      border-radius: 4px;
      max-width: 140px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      position: relative;
      font-family: inherit;
    `;
    modelButton.addEventListener("mouseenter", () => {
      modelButton.style.background = "var(--background-modifier-hover)";
      modelButton.style.color = "var(--text-normal)";
    });
    modelButton.addEventListener("mouseleave", () => {
      modelButton.style.background = "transparent";
      modelButton.style.color = "var(--text-muted)";
    });
    modelButton.textContent = "AI Models";
    const caret = modelButton.createEl("span");
    caret.innerHTML = Icons.chevronDown({ width: 10, height: 10 });
    caret.style.cssText = `
      position: absolute;
      right: 6px;
      top: 50%;
      transform: translateY(-50%);
      pointer-events: none;
      color: var(--text-faint);
    `;
    this.modelButton = modelButton;
    modelButton.addEventListener("click", (event) => {
      this.showModelMenu(event);
    });
    if (this.plugin.settings.selectedModel) {
      this.updateModelButtonText(this.plugin.settings.selectedModel);
    }
  }
  showModelMenu(event) {
    var _a;
    try {
      const app = window.app;
      const plugins = (_a = app == null ? void 0 : app.plugins) == null ? void 0 : _a.plugins;
      const aiProvidersPlugin = plugins == null ? void 0 : plugins["ai-providers"];
      if (!aiProvidersPlugin) {
        console.log("WriterMenu: No AI providers available");
        return;
      }
      const aiProviders = aiProvidersPlugin.aiProviders;
      if (!(aiProviders == null ? void 0 : aiProviders.providers)) {
        console.log("WriterMenu: No providers array found");
        return;
      }
      const providerMap = {};
      const providersByDisplayName = {};
      for (const provider of aiProviders.providers) {
        const providerId = provider.id || provider.name || provider.type || "unknown";
        const displayName = this.getProviderDisplayName(providerId, provider);
        providersByDisplayName[displayName] = provider;
        const models = provider.models || provider.availableModels || provider.supportedModels || [];
        if (models.length > 0) {
          const families = this.organizeModelsByFamily(models);
          if (Object.keys(families).length > 0) {
            providerMap[displayName] = families;
            console.log(`WriterMenu: Added provider "${displayName}" with ${models.length} models`);
          }
        }
      }
      if (Object.keys(providerMap).length === 0) {
        console.log("WriterMenu: No providers with models available");
        return;
      }
      const menu = WriterMenuFactory.createModelMenu(
        providerMap,
        this.plugin.settings.selectedModel,
        (providerDisplayName, model) => {
          const provider = providersByDisplayName[providerDisplayName];
          const providerId = provider.id || provider.name || provider.type || "unknown";
          const selection = `${providerId}:${model}`;
          console.log(`WriterMenu: Selected ${providerDisplayName} - ${model} (${selection})`);
          console.log(`WriterMenu: Using provider ID: ${providerId} from provider:`, provider);
          this.plugin.settings.selectedModel = selection;
          this.plugin.saveSettings();
          this.updateModelButtonText(selection);
          this.updateTokenCounterFromModel();
          this.events.onModelChange(selection);
        }
      );
      menu.showAtMouseEvent(event);
    } catch (error) {
      console.error("WriterMenu: Error showing model menu:", error);
    }
  }
  updateModelButtonText(selection) {
    if (!this.modelButton)
      return;
    let displayName = "";
    if (selection && selection.includes(":")) {
      const [, model] = selection.split(":", 2);
      displayName = model;
    } else {
      displayName = "AI Models";
    }
    const maxLength = 15;
    let finalText = displayName;
    let showCaret = true;
    if (displayName.length > maxLength) {
      finalText = displayName.substring(0, maxLength - 3) + "...";
      showCaret = false;
    }
    this.modelButton.textContent = finalText;
    const caret = this.modelButton.querySelector("span");
    if (caret) {
      caret.style.display = showCaret ? "block" : "none";
    }
  }
  getAvailableProvidersAndModels() {
    return {};
  }
  createPromptSelect(parent) {
    this.createPromptMenuButton(parent);
  }
  createPromptMenuButton(parent) {
    this.promptButton = parent.createEl("button");
    this.promptButton.style.cssText = `
      background: transparent;
      border: none;
      padding: 6px 24px 6px 8px;
      font-size: 12px;
      color: var(--text-muted);
      cursor: pointer;
      border-radius: 4px;
      max-width: 140px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      position: relative;
      font-family: inherit;
    `;
    this.promptButton.addEventListener("mouseenter", () => {
      this.promptButton.style.background = "var(--background-modifier-hover)";
      this.promptButton.style.color = "var(--text-normal)";
    });
    this.promptButton.addEventListener("mouseleave", () => {
      this.promptButton.style.background = "transparent";
      this.promptButton.style.color = "var(--text-muted)";
    });
    this.promptButton.textContent = "Prompts";
    const caret = this.promptButton.createEl("span");
    caret.innerHTML = Icons.chevronDown({ width: 10, height: 10 });
    caret.style.cssText = `
      position: absolute;
      right: 6px;
      top: 50%;
      transform: translateY(-50%);
      pointer-events: none;
      color: var(--text-faint);
    `;
    this.promptButton.caret = caret;
    this.promptButton.addEventListener("click", (event) => {
      this.showPromptMenu(event);
    });
    this.loadPromptsForMenu();
  }
  showPromptMenu(event) {
    try {
      if (this.availablePrompts.length === 0) {
        console.log("WriterMenu: No prompts available");
        return;
      }
      console.log(`WriterMenu: Showing menu with ${this.availablePrompts.length} prompts`);
      const menu = WriterMenuFactory.createPromptMenu(
        this.availablePrompts,
        this.plugin.settings.selectedPrompt,
        (promptPath) => {
          console.log(`WriterMenu: Selected prompt ${promptPath}`);
          this.plugin.settings.selectedPrompt = promptPath;
          this.plugin.saveSettings();
          this.updatePromptButtonText(promptPath);
          this.events.onPromptChange(promptPath);
        }
      );
      menu.showAtMouseEvent(event);
    } catch (error) {
      console.error("WriterMenu: Error showing prompt menu:", error);
    }
  }
  updatePromptButtonText(selection) {
    var _a;
    if (!this.promptButton)
      return;
    let displayName = "";
    if (selection) {
      const prompt = this.availablePrompts.find((p) => p.path === selection);
      displayName = prompt ? prompt.name : ((_a = selection.split("/").pop()) == null ? void 0 : _a.replace(".md", "")) || "Prompt";
    } else {
      displayName = "WriterMenu Prompts";
    }
    const maxLength = 15;
    let finalText = displayName;
    let showCaret = true;
    if (displayName.length > maxLength) {
      finalText = displayName.substring(0, maxLength - 3) + "...";
      showCaret = false;
    }
    this.promptButton.textContent = finalText;
    const caret = this.promptButton.caret;
    if (caret) {
      caret.style.display = showCaret ? "block" : "none";
    }
  }
  updatePromptCaretVisibility() {
    if (!this.promptButton)
      return;
    const caret = this.promptButton.caret;
    if (!caret)
      return;
    requestAnimationFrame(() => {
      this.promptButton.offsetWidth;
      const buttonWidth = this.promptButton.clientWidth;
      const buttonStyle = getComputedStyle(this.promptButton);
      const paddingLeft = parseFloat(buttonStyle.paddingLeft);
      const paddingRight = parseFloat(buttonStyle.paddingRight);
      const availableTextWidth = buttonWidth - paddingLeft - paddingRight;
      const tempSpan = document.createElement("span");
      tempSpan.style.cssText = `
        font-size: ${buttonStyle.fontSize};
        font-family: ${buttonStyle.fontFamily};
        font-weight: ${buttonStyle.fontWeight};
        visibility: hidden;
        position: absolute;
        white-space: nowrap;
      `;
      tempSpan.textContent = this.promptButton.textContent;
      document.body.appendChild(tempSpan);
      const textWidth = tempSpan.offsetWidth;
      document.body.removeChild(tempSpan);
      const isTextTruncated = textWidth > availableTextWidth;
      if (isTextTruncated) {
        caret.style.display = "none";
      } else {
        caret.style.display = "flex";
      }
    });
  }
  async loadPromptsForMenu() {
    try {
      const pluginDir = this.plugin.manifest.dir;
      const promptsPath = `${pluginDir}/prompts`;
      console.log(`\u{1F50D} WriterMenu: Loading prompts from: ${promptsPath}`);
      const adapter = this.plugin.app.vault.adapter;
      const promptsDirExists = await adapter.exists(promptsPath);
      if (promptsDirExists) {
        const promptFiles = await adapter.list(promptsPath);
        if (promptFiles.files && promptFiles.files.length > 0) {
          const mdFiles = promptFiles.files.filter((file) => file.endsWith(".md"));
          this.availablePrompts = [];
          mdFiles.forEach((filePath) => {
            const fileName = filePath.split("/").pop() || filePath;
            const baseName = fileName.replace(".md", "");
            this.availablePrompts.push({ name: baseName, path: filePath });
          });
          console.log(`\u2705 WriterMenu: Loaded ${this.availablePrompts.length} prompts:`, this.availablePrompts);
          if (this.plugin.settings.selectedPrompt) {
            this.updatePromptButtonText(this.plugin.settings.selectedPrompt);
          }
          return;
        }
      }
      console.log(`\u274C WriterMenu: No prompts found at ${promptsPath}`);
      this.availablePrompts = [];
    } catch (error) {
      console.error("\u274C WriterMenu: Error loading prompts:", error);
      this.availablePrompts = [];
    }
  }
  createTokenCounter(parent) {
    this.tokenCounter = parent.createEl("span", { cls: "writerr-token-count" });
    this.updateTokenCounterFromModel();
  }
  updateTokenCounterFromModel() {
    if (!this.tokenCounter)
      return;
    const contextTokens = this.calculateContextTokens();
    const selectedModel = this.plugin.settings.selectedModel;
    if (!selectedModel || !selectedModel.includes(":")) {
      this.tokenCounter.textContent = `${contextTokens.toLocaleString()} / no model`;
      this.tokenCounter.style.color = "var(--text-muted)";
      return;
    }
    const [providerId, modelName] = selectedModel.split(":", 2);
    const modelTokenLimit = this.getModelTokenLimit(providerId, modelName);
    if (!modelTokenLimit) {
      this.tokenCounter.textContent = `${contextTokens.toLocaleString()} / unavailable`;
      this.tokenCounter.style.color = "var(--text-muted)";
      return;
    }
    this.updateTokenCounter(contextTokens, modelTokenLimit);
  }
  getModelTokenLimit(providerId, modelName) {
    var _a, _b, _c;
    try {
      const aiProvidersPlugin = (_b = (_a = this.plugin.app.plugins) == null ? void 0 : _a.plugins) == null ? void 0 : _b["ai-providers"];
      if (!((_c = aiProvidersPlugin == null ? void 0 : aiProvidersPlugin.aiProviders) == null ? void 0 : _c.providers))
        return null;
      const provider = aiProvidersPlugin.aiProviders.providers.find((p) => {
        const pId = p.id || p.name || p.type || "unknown";
        return pId === providerId;
      });
      if (!provider || !provider.models)
        return null;
      const model = provider.models.find((m) => {
        return typeof m === "string" ? m === modelName : m.name === modelName;
      });
      if (!model)
        return null;
      if (typeof model === "object" && model.contextLength) {
        return model.contextLength;
      }
      return this.getCommonModelTokenLimit(modelName);
    } catch (error) {
      console.warn("Error getting model token limit:", error);
      return null;
    }
  }
  getCommonModelTokenLimit(modelName) {
    const modelLower = modelName.toLowerCase();
    if (modelLower.includes("gpt-4o"))
      return 128e3;
    if (modelLower.includes("gpt-4-turbo"))
      return 128e3;
    if (modelLower.includes("gpt-4"))
      return 8192;
    if (modelLower.includes("gpt-3.5-turbo"))
      return 16385;
    if (modelLower.includes("claude-3-5-sonnet"))
      return 2e5;
    if (modelLower.includes("claude-3-opus"))
      return 2e5;
    if (modelLower.includes("claude-3-sonnet"))
      return 2e5;
    if (modelLower.includes("claude-3-haiku"))
      return 2e5;
    if (modelLower.includes("gemini-1.5-pro"))
      return 1e6;
    if (modelLower.includes("gemini-1.5-flash"))
      return 1e6;
    if (modelLower.includes("gemini-pro"))
      return 32768;
    return 4096;
  }
  calculateContextTokens() {
    let totalTokens = 0;
    try {
      const chatLeaf = this.plugin.app.workspace.getLeavesOfType("writerr-chat-view")[0];
      const chatView = chatLeaf == null ? void 0 : chatLeaf.view;
      if (!chatView)
        return 0;
      const currentSession = this.plugin.currentSession;
      if (currentSession == null ? void 0 : currentSession.messages) {
        totalTokens += currentSession.messages.reduce((sum, msg) => {
          return sum + this.estimateTokens(msg.content);
        }, 0);
      }
      const contextArea = chatView.contextArea;
      if (contextArea) {
        const documents = contextArea.getDocuments();
        totalTokens += documents.length * 1e3;
      }
      const inputArea = chatView.chatInput;
      if (inputArea && inputArea.getValue) {
        const currentInput = inputArea.getValue();
        totalTokens += this.estimateTokens(currentInput);
      }
    } catch (error) {
      console.warn("Error calculating context tokens:", error);
    }
    return totalTokens;
  }
  estimateTokens(text) {
    if (!text)
      return 0;
    return Math.ceil(text.length / 4);
  }
  getProviderDisplayName(providerId, provider) {
    if (provider) {
      if (provider.displayName && typeof provider.displayName === "string") {
        return provider.displayName;
      }
      if (provider.name && typeof provider.name === "string" && !provider.name.startsWith("id-")) {
        return provider.name;
      }
      if (provider.type && typeof provider.type === "string") {
        const displayNames2 = {
          "openai": "OpenAI",
          "anthropic": "Anthropic",
          "google": "Google",
          "ollama": "Local/Ollama",
          "azure": "Azure OpenAI"
        };
        const typeDisplayName = displayNames2[provider.type.toLowerCase()];
        if (typeDisplayName) {
          return typeDisplayName;
        }
      }
    }
    const displayNames = {
      "openai": "OpenAI",
      "anthropic": "Anthropic",
      "google": "Google",
      "ollama": "Local/Ollama",
      "azure": "Azure OpenAI"
    };
    const staticResult = displayNames[providerId.toLowerCase()];
    if (staticResult) {
      return staticResult;
    }
    if (providerId.startsWith("id-") && provider) {
      const providerStr = JSON.stringify(provider).toLowerCase();
      if (providerStr.includes("openai") || providerStr.includes("gpt")) {
        console.log("WriterMenu: Inferred OpenAI from provider content for ID:", providerId);
        return "OpenAI";
      } else if (providerStr.includes("anthropic") || providerStr.includes("claude")) {
        console.log("WriterMenu: Inferred Anthropic from provider content for ID:", providerId);
        return "Anthropic";
      } else if (providerStr.includes("google") || providerStr.includes("gemini")) {
        console.log("WriterMenu: Inferred Google from provider content for ID:", providerId);
        return "Google";
      } else if (providerStr.includes("ollama")) {
        console.log("WriterMenu: Inferred Local/Ollama from provider content for ID:", providerId);
        return "Local/Ollama";
      }
      console.log("WriterMenu: Could not infer provider type for ID:", providerId);
    }
    return providerId;
  }
  organizeModelsByFamily(models) {
    const families = {};
    for (const model of models) {
      let family = "Other";
      const modelLower = model.toLowerCase();
      if (modelLower.includes("gpt-4o")) {
        family = "GPT-4o";
      } else if (modelLower.includes("gpt-4")) {
        family = "GPT-4";
      } else if (modelLower.includes("gpt-3.5")) {
        family = "GPT-3.5";
      } else if (modelLower.includes("claude-3-5")) {
        family = "Claude 3.5";
      } else if (modelLower.includes("claude-3")) {
        family = "Claude 3";
      } else if (modelLower.includes("claude-2")) {
        family = "Claude 2";
      } else if (modelLower.includes("claude")) {
        family = "Claude";
      } else if (modelLower.includes("gemini-pro")) {
        family = "Gemini Pro";
      } else if (modelLower.includes("gemini")) {
        family = "Gemini";
      } else if (modelLower.includes("llama-3")) {
        family = "Llama 3";
      } else if (modelLower.includes("llama")) {
        family = "Llama";
      } else if (modelLower.includes("mistral")) {
        family = "Mistral";
      } else if (modelLower.includes("codellama")) {
        family = "Code Llama";
      } else if (modelLower.includes("phi")) {
        family = "Phi";
      } else if (modelLower.includes("qwen")) {
        family = "Qwen";
      } else if (modelLower.includes("mixtral")) {
        family = "Mixtral";
      }
      if (!families[family]) {
        families[family] = [];
      }
      families[family].push(model);
    }
    return families;
  }
  updateStatusIndicator() {
    return;
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
  refreshModelOptions() {
    console.log("Model options refresh requested - using WriterMenu system");
  }
  setSelectedModel(providerAndModel) {
    this.plugin.settings.selectedModel = providerAndModel;
    this.updateModelButtonText(providerAndModel);
  }
  getSelectedModel() {
    const value = this.plugin.settings.selectedModel;
    if (!value || !value.includes(":")) {
      return null;
    }
    const [provider, model] = value.split(":", 2);
    return { provider, model };
  }
  refreshAvailableModels() {
    console.log("Available models refresh requested - using WriterMenu system");
  }
  updateDocumentButtonState() {
    if (!this.documentButton)
      return;
    const activeFile = this.plugin.app.workspace.getActiveFile();
    if (!activeFile) {
      this.documentButton.style.cssText += `
        color: var(--text-faint) !important;
        opacity: 0.5 !important;
      `;
      this.documentButton.setAttribute("aria-label", "No active document to add");
      return;
    }
    const chatLeaf = this.plugin.app.workspace.getLeavesOfType("writerr-chat-view")[0];
    const chatView = chatLeaf == null ? void 0 : chatLeaf.view;
    const contextArea = chatView == null ? void 0 : chatView.contextArea;
    const documentsInContext = (contextArea == null ? void 0 : contextArea.getDocuments()) || [];
    const isInContext = documentsInContext.some((doc) => doc.path === activeFile.path);
    if (isInContext) {
      this.documentButton.style.cssText += `
        color: var(--interactive-accent) !important;
        opacity: 1 !important;
      `;
      this.documentButton.setAttribute("aria-label", `"${activeFile.name}" already in context`);
    } else {
      this.documentButton.style.cssText += `
        color: var(--text-muted) !important;
        opacity: 0.8 !important;
      `;
      this.documentButton.setAttribute("aria-label", `Add "${activeFile.name}" to context`);
    }
  }
  // Public method for external updates
  refreshDocumentButton() {
    this.updateDocumentButtonState();
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
    return "message-square";
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
    await this.createComponents(container);
    this.setupEventHandlers();
    this.applyTheme();
    if (!this.plugin.currentSession) {
      this.plugin.newChatSession();
    }
    this.refresh();
    this.scheduleDelayedInitialization();
  }
  async createComponents(container) {
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
    await this.chatToolbar.render();
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
      this.chatHeader.refreshModeOptions();
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
  theme: "default",
  selectedModel: "",
  selectedPrompt: ""
};
var BUILD_TIMESTAMP = Date.now();
var BUILD_VERSION = "v2.0.1-fix-ai-providers";
console.log(`\u{1F527} Writerr Chat Build: ${BUILD_VERSION} (${new Date(BUILD_TIMESTAMP).toISOString()})`);
var WriterrlChatPlugin = class extends import_obsidian5.Plugin {
  constructor() {
    super(...arguments);
    this.currentSession = null;
    this.chatSessions = /* @__PURE__ */ new Map();
  }
  async onload() {
    console.log(`\u{1F680} LOADING Writerr Chat ${BUILD_VERSION} - Build: ${new Date(BUILD_TIMESTAMP).toISOString()}`);
    await this.loadSettings();
    this.loadCustomStyles();
    this.initializeGlobalAPI();
    this.registerView(VIEW_TYPE_CHAT, (leaf) => new ChatView(leaf, this));
    this.addCommands();
    this.addRibbonIcon("message-square", "Open Writerr Chat", () => {
      this.openChat();
    });
    this.addSettingTab(new WriterrlChatSettingsTab(this.app, this));
    await this.loadChatSessions();
    this.listenForEditorialEngine();
    console.log(`\u2705 LOADED Writerr Chat ${BUILD_VERSION} successfully`);
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
  color: var(--text-faint) !important;
  transition: all 0.2s ease !important;
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

/* TOOLBAR CONTAINER - FORCE FLEX LAYOUT */
.chat-toolbar-container {
  border-top: none !important;
  border: none !important;
  display: flex !important;
  justify-content: space-between !important;
  align-items: center !important;
  padding: 8px 0 8px 12px !important;
  background: var(--background-primary) !important;
  font-size: 12px !important;
  color: var(--text-faint) !important;
  min-height: 44px !important;
  overflow: hidden !important;
}

/* Bottom Toolbar Left - Tools Section - Subtle Gray */
.writerr-toolbar-left {
  display: flex !important;
  align-items: center !important;
  gap: 4px !important;
  flex-shrink: 0 !important;
  margin-left: 0 !important;
  padding-left: 0 !important;
}

/* Toolbar Right - Dropdowns and Counter - Subtle Gray */
.toolbar-right {
  display: flex !important;
  align-items: center !important;
  gap: 4px !important;
  flex: 1 !important;
  justify-content: flex-end !important;
  min-width: 0 !important;
  overflow: hidden !important;
  margin-right: 8px !important;
}

.writerr-toolbar-button {
  padding: 6px !important;
  border-radius: var(--radius-s) !important;
  color: var(--text-faint) !important;
}

.writerr-toolbar-button:hover {
  color: var(--text-normal) !important;
  background: var(--background-modifier-hover) !important;
}

.writerr-toolbar-icon {
  width: 16px !important;
  height: 16px !important;
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

/* Context Area - Subtle styling */
.context-header {
  border-top: 1px solid var(--background-modifier-border) !important;
  padding-top: 8px !important;
  color: var(--text-faint) !important;
}

.context-collapse-icon {
  color: var(--text-faint) !important;
}

.context-header:hover .context-collapse-icon {
  color: var(--text-muted) !important;
}

/* Context label subtle */
.context-header span {
  color: var(--text-faint) !important;
}

.context-header:hover span {
  color: var(--text-muted) !important;
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

/* Token Counter - Subtle */
.writerr-token-count {
  font-size: var(--font-ui-smaller) !important;
  color: var(--text-faint) !important;
  font-variant-numeric: tabular-nums !important;
  font-family: var(--font-monospace) !important;
  font-feature-settings: "tnum" !important;
  margin-right: 6px !important;
}


/* Dropdown hover styles */
select:hover {
  color: var(--text-normal) !important;
}

.toolbar-right select:hover + div {
  color: var(--text-normal) !important;
}

/* Context Add Button - Subtle Gray */
.context-add-button {
  padding: 4px !important;
  border-radius: var(--radius-s) !important;
  color: var(--text-faint) !important;
}

.context-add-button:hover {
  color: var(--text-normal) !important;
  background: var(--background-modifier-hover) !important;
}

/* Context Action Button - Subtle */
.writerr-context-action {
  padding: 4px !important;
  position: absolute !important;
  top: 8px !important;
  right: 16px !important;
  z-index: 10 !important;
  border-radius: var(--radius-s) !important;
  color: var(--text-faint) !important;
}

.writerr-context-action:hover {
  color: var(--text-normal) !important;
  background: var(--background-modifier-hover) !important;
}

.writerr-context-action:disabled {
  opacity: 0.3 !important;
  cursor: not-allowed !important;
  pointer-events: none !important;
}

.writerr-context-action-icon {
  width: 18px !important;
  height: 18px !important;
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

/* Chat Control Buttons - Header Icons - KEEP DARK */
.chat-control-button {
  padding: 8px !important;
  border-radius: var(--radius-s) !important;
  color: var(--text-normal) !important; /* Override subtle gray - keep header icons dark */
}

.chat-control-button:hover {
  color: var(--text-normal) !important;
  background: var(--background-modifier-hover) !important;
}

/* Hide settings button */
.chat-control-button:last-child {
  display: none !important;
}

/* Clean menu styling - no debug colors */
`;
    const timestamp = Date.now();
    const existing = document.getElementById("writerr-chat-styles");
    if (existing)
      existing.remove();
    document.body.offsetHeight;
    const styleEl = document.createElement("style");
    styleEl.id = "writerr-chat-styles";
    styleEl.setAttribute("data-timestamp", timestamp.toString());
    document.head.appendChild(styleEl);
    styleEl.textContent = styles;
    console.log(`Writerr Chat: DEBUG CSS applied at ${timestamp} - looking for menu selectors`);
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
    var _a, _b, _c;
    console.log(`\u{1F3AF} [${BUILD_VERSION}] processWithAIProvider ENTRY - Using provider OBJECT method`);
    const aiProvidersPlugin = (_b = (_a = this.app.plugins) == null ? void 0 : _a.plugins) == null ? void 0 : _b["ai-providers"];
    if (!aiProvidersPlugin) {
      console.log("\u274C AI Providers plugin not found");
      throw new Error("AI Providers plugin not available. Please ensure it is installed and enabled.");
    }
    const aiProviders = aiProvidersPlugin.aiProviders;
    if (!aiProviders) {
      throw new Error("AI Providers SDK not available in plugin");
    }
    let providerObject = null;
    let selectedModel = "gpt-4";
    if (this.settings.selectedModel && this.settings.selectedModel.includes(":")) {
      const [providerId, modelName] = this.settings.selectedModel.split(":");
      selectedModel = modelName;
      console.log(`\u{1F50D} Looking for provider: ${providerId}, model: ${modelName}`);
      if (aiProviders.providers && Array.isArray(aiProviders.providers)) {
        providerObject = aiProviders.providers.find(
          (p) => p.id === providerId || p.name === providerId
        );
      }
      console.log(providerObject ? "\u2705 Found selected provider" : "\u274C Selected provider not found");
    }
    if (!providerObject && aiProviders.providers && Array.isArray(aiProviders.providers) && aiProviders.providers.length > 0) {
      providerObject = aiProviders.providers[0];
      console.log("\u{1F504} Using first available provider:", (providerObject == null ? void 0 : providerObject.name) || (providerObject == null ? void 0 : providerObject.id));
    }
    if (!providerObject) {
      throw new Error("No AI providers configured");
    }
    let prompt = "";
    if (context) {
      prompt += `Context from current document:
${context}

`;
    }
    const conversationMessages = this.currentSession.messages;
    if (conversationMessages.length > 0) {
      prompt += "Previous conversation:\n";
      for (const msg of conversationMessages) {
        prompt += `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}
`;
      }
      prompt += "\n";
    }
    prompt += `User request: ${parsedMessage.originalContent}`;
    try {
      console.log(`\u{1F3AF} [${BUILD_VERSION}] EXECUTE with provider OBJECT (working API format):`, {
        provider: (providerObject == null ? void 0 : providerObject.name) || (providerObject == null ? void 0 : providerObject.id),
        model: selectedModel,
        promptLength: prompt.length
      });
      const response = await aiProviders.execute({
        provider: providerObject,
        // Pass the actual provider object
        prompt,
        // Single prompt string (not messages array)
        model: selectedModel,
        // Specific model name
        onProgress: (chunk, full) => {
          console.log(`\u{1F3AF} [${BUILD_VERSION}] Streaming chunk:`, chunk.length, "chars");
        }
      });
      console.log(`\u{1F3AF} [${BUILD_VERSION}] AI response SUCCESS:`, (response == null ? void 0 : response.length) || 0, "characters");
      if (!response || typeof response !== "string" || response.trim().length === 0) {
        throw new Error(`AI Provider returned empty or invalid response: ${JSON.stringify(response)}`);
      }
      const assistantMessage = {
        id: generateId(),
        role: "assistant",
        content: response,
        timestamp: Date.now(),
        metadata: {
          aiProvidersUsed: true,
          provider: providerObject.name || providerObject.id,
          providerType: providerObject.type || "unknown",
          model: selectedModel,
          buildVersion: BUILD_VERSION
        }
      };
      this.currentSession.messages.push(assistantMessage);
      if ((_c = this.chatView) == null ? void 0 : _c.chatToolbar) {
        const estimatedTokens = Math.ceil(response.length / 4);
        this.chatView.chatToolbar.updateTokenCounter(estimatedTokens, this.settings.maxTokens || 2e3);
      }
    } catch (error) {
      console.error(`\u{1F3AF} [${BUILD_VERSION}] AI Providers ERROR:`, error);
      throw new Error(`AI processing failed: ${error.message}`);
    }
  }
  updateTokenCounterFromResponse(response) {
    var _a, _b, _c;
    try {
      const tokensUsed = ((_a = response == null ? void 0 : response.usage) == null ? void 0 : _a.totalTokens) || ((_b = response == null ? void 0 : response.usage) == null ? void 0 : _b.total_tokens) || 0;
      const maxTokens = this.settings.maxTokens || 2e3;
      const chatView = (_c = this.app.workspace.getLeavesOfType(VIEW_TYPE_CHAT)[0]) == null ? void 0 : _c.view;
      if (chatView && chatView.chatToolbar) {
        chatView.chatToolbar.updateTokenCounter(tokensUsed, maxTokens);
      }
    } catch (error) {
      console.error("Error updating token counter:", error);
    }
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
