// Global test setup for all packages

// Mock Obsidian API
global.require = require;

// Mock window object for Obsidian environment
Object.defineProperty(window, 'require', {
  writable: true,
  value: require
});

// Set up test environment
process.env.NODE_ENV = 'test';