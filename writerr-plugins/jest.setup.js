// Jest setup file - runs before each test suite

// Mock IndexedDB for browsers that don't support it in testing
require('fake-indexeddb/auto');

// Mock Obsidian API
global.Platform = {
  isMobile: false,
  isDesktop: true,
};

// Mock app and workspace
global.mockApp = {
  workspace: {
    getActiveFile: jest.fn(() => ({
      path: 'test-document.md',
      name: 'test-document.md'
    })),
    on: jest.fn(),
    off: jest.fn()
  },
  vault: {
    read: jest.fn(),
    modify: jest.fn(),
    create: jest.fn()
  },
  metadataCache: {
    getFileCache: jest.fn(() => ({}))
  }
};

// Mock Plugin base class
global.Plugin = class MockPlugin {
  constructor(app, manifest) {
    this.app = app;
    this.manifest = manifest;
  }
  
  async onload() {}
  onunload() {}
  addCommand() {}
  addRibbonIcon() {}
  addSettingTab() {}
  registerView() {}
  registerEditorExtension() {}
  loadData() { return Promise.resolve({}); }
  saveData() { return Promise.resolve(); }
};

// Mock MarkdownView
global.MarkdownView = class MockMarkdownView {
  constructor() {
    this.editor = {
      getCursor: jest.fn(),
      setCursor: jest.fn(),
      getSelection: jest.fn(),
      replaceSelection: jest.fn(),
      getValue: jest.fn(() => ''),
      setValue: jest.fn(),
      getDoc: jest.fn(() => ({
        getValue: jest.fn(() => ''),
        setValue: jest.fn()
      }))
    };
  }
};

// Mock TFile
global.TFile = class MockTFile {
  constructor(path) {
    this.path = path;
    this.name = path.split('/').pop();
    this.extension = path.split('.').pop();
  }
};

// Mock WorkspaceLeaf
global.WorkspaceLeaf = class MockWorkspaceLeaf {
  constructor() {
    this.view = null;
  }
};

// Mock ItemView
global.ItemView = class MockItemView {
  constructor(leaf) {
    this.leaf = leaf;
    this.containerEl = document.createElement('div');
  }
  
  getViewType() { return 'mock-view'; }
  getDisplayText() { return 'Mock View'; }
  async onOpen() {}
  async onClose() {}
};

// Mock console methods for cleaner test output
const originalConsole = console;
global.console = {
  ...originalConsole,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  debug: jest.fn()
};

// Restore console for debugging when needed
global.restoreConsole = () => {
  global.console = originalConsole;
};

// Mock window.Writerr for event bus testing
global.window = global.window || {};
global.window.Writerr = {
  eventBus: {
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
    publish: jest.fn(),
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
    isConnected: jest.fn(() => true)
  }
};

// Mock requestAnimationFrame for UI testing
global.requestAnimationFrame = jest.fn(cb => setTimeout(cb, 0));
global.cancelAnimationFrame = jest.fn(id => clearTimeout(id));

// Mock setTimeout and setInterval for timer testing
jest.useFakeTimers();

// Polyfill structuredClone for Node.js versions < 17
if (!global.structuredClone) {
  global.structuredClone = (obj) => {
    return JSON.parse(JSON.stringify(obj));
  };
}

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
});