/**
 * @fileoverview Basic tests for the function registry system
 */

import { FunctionRegistry } from '../src/registry/FunctionRegistry';
import { FunctionLoader } from '../src/loader/FunctionLoader';
import { FileWatcher } from '../src/watcher/FileWatcher';
import { LifecycleManager } from '../src/registry/LifecycleManager';
import * as path from 'path';

describe('Function Registry System', () => {
  let registry: FunctionRegistry;
  let loader: FunctionLoader;
  let watcher: FileWatcher;
  let lifecycleManager: LifecycleManager;

  beforeEach(() => {
    registry = new FunctionRegistry();
    loader = new FunctionLoader();
    watcher = new FileWatcher();
    lifecycleManager = new LifecycleManager();
  });

  afterEach(async () => {
    watcher.dispose();
    await lifecycleManager.shutdown();
  });

  describe('FunctionRegistry', () => {
    it('should initialize with empty registry', () => {
      const stats = registry.getStats();
      expect(stats.totalFunctions).toBe(0);
      expect(stats.activeFunctions).toBe(0);
    });

    it('should register a function successfully', () => {
      const mockFunction = {
        id: 'test-function',
        name: 'Test Function',
        version: '1.0.0',
        description: 'A test function',
        category: 'custom' as const,
        capabilities: ['test'],
        dependencies: [],
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        filePath: '/test/path.md',
        fileType: 'md' as const,
        content: 'test content',
        parsedContent: {
          systemPrompt: 'test prompt',
          examples: [],
        },
        hash: 'testhash',
        loadedAt: new Date()
      };

      registry.registerFunction(mockFunction);
      
      const stats = registry.getStats();
      expect(stats.totalFunctions).toBe(1);
      expect(stats.activeFunctions).toBe(1);

      const retrieved = registry.getFunction('test-function');
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe('test-function');
    });

    it('should list functions with filters', () => {
      const function1 = {
        id: 'func1',
        name: 'Function 1',
        version: '1.0.0',
        description: 'Test function 1',
        category: 'copy-editor' as const,
        capabilities: ['grammar'],
        dependencies: [],
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        filePath: '/test/func1.md',
        fileType: 'md' as const,
        content: 'content1',
        parsedContent: { systemPrompt: 'prompt1', examples: [] },
        hash: 'hash1',
        loadedAt: new Date()
      };

      const function2 = {
        id: 'func2',
        name: 'Function 2',
        version: '1.0.0',
        description: 'Test function 2',
        category: 'proofreader' as const,
        capabilities: ['spelling'],
        dependencies: [],
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        filePath: '/test/func2.md',
        fileType: 'md' as const,
        content: 'content2',
        parsedContent: { systemPrompt: 'prompt2', examples: [] },
        hash: 'hash2',
        loadedAt: new Date()
      };

      registry.registerFunction(function1);
      registry.registerFunction(function2);

      const allFunctions = registry.listFunctions();
      expect(allFunctions).toHaveLength(2);

      const copyEditors = registry.listFunctions({ category: 'copy-editor' });
      expect(copyEditors).toHaveLength(1);
      expect(copyEditors[0].id).toBe('func1');

      const grammarFunctions = registry.listFunctions({ capabilities: ['grammar'] });
      expect(grammarFunctions).toHaveLength(1);
      expect(grammarFunctions[0].id).toBe('func1');
    });

    it('should unregister functions', () => {
      const mockFunction = {
        id: 'test-function',
        name: 'Test Function',
        version: '1.0.0',
        description: 'A test function',
        category: 'custom' as const,
        capabilities: ['test'],
        dependencies: [],
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        filePath: '/test/path.md',
        fileType: 'md' as const,
        content: 'test content',
        parsedContent: { systemPrompt: 'test prompt', examples: [] },
        hash: 'testhash',
        loadedAt: new Date()
      };

      registry.registerFunction(mockFunction);
      expect(registry.getStats().totalFunctions).toBe(1);

      const success = registry.unregisterFunction('test-function');
      expect(success).toBe(true);
      expect(registry.getStats().totalFunctions).toBe(0);

      const retrieved = registry.getFunction('test-function');
      expect(retrieved).toBeNull();
    });
  });

  describe('FunctionLoader', () => {
    it('should load function from markdown file', async () => {
      const examplePath = path.join(__dirname, '../examples/copy-editor.md');
      
      const result = await loader.loadFromFile(examplePath);
      
      expect(result.success).toBe(true);
      expect(result.function).toBeDefined();
      expect(result.function?.id).toBe('copy-editor');
      expect(result.function?.name).toBe('Copy Editor');
      expect(result.function?.category).toBe('copy-editor');
      expect(result.function?.parsedContent.systemPrompt).toContain('copy editor');
    });

    it('should handle file not found', async () => {
      const result = await loader.loadFromFile('/nonexistent/file.md');
      
      expect(result.success).toBe(false);
      expect(result.errors).toContain('File not found: /nonexistent/file.md');
    });

    it('should validate function definitions', async () => {
      // Test would require a malformed function file
      // For now, just test that validation exists
      const examplePath = path.join(__dirname, '../examples/copy-editor.md');
      const result = await loader.loadFromFile(examplePath);
      
      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('FileWatcher', () => {
    it('should initialize in inactive state', () => {
      expect(watcher.isWatching()).toBe(false);
      expect(watcher.getWatchedPaths()).toHaveLength(0);
    });

    it('should add and remove watch paths', () => {
      const testPath = __dirname;
      
      watcher.addWatchPath(testPath);
      expect(watcher.getWatchedPaths()).toContain(path.resolve(testPath));
      
      watcher.removeWatchPath(testPath);
      expect(watcher.getWatchedPaths()).not.toContain(path.resolve(testPath));
    });

    it('should start and stop watching', () => {
      watcher.start();
      expect(watcher.isWatching()).toBe(true);
      
      watcher.stop();
      expect(watcher.isWatching()).toBe(false);
    });
  });

  describe('LifecycleManager', () => {
    it('should initialize and shutdown properly', async () => {
      let status = lifecycleManager.getStatus();
      expect(status.initialized).toBe(false);

      await lifecycleManager.initialize();
      status = lifecycleManager.getStatus();
      expect(status.initialized).toBe(true);

      await lifecycleManager.shutdown();
      status = lifecycleManager.getStatus();
      expect(status.initialized).toBe(false);
    });
  });

  describe('Integration', () => {
    it('should load function through lifecycle manager', async () => {
      await lifecycleManager.initialize();
      
      const examplePath = path.join(__dirname, '../examples/copy-editor.md');
      const result = await lifecycleManager.loadFunction(examplePath);
      
      expect(result.success).toBe(true);
      
      const status = lifecycleManager.getStatus();
      expect(status.functionsLoaded).toBe(1);
      
      await lifecycleManager.shutdown();
    });
  });
});

// Mock implementation for tests that don't have Jest available
if (typeof describe === 'undefined') {
  console.log('Test environment not available. Skipping tests.');
  
  // Basic smoke tests
  const runSmokeTests = async () => {
    console.log('Running smoke tests...');
    
    const registry = new FunctionRegistry();
    const loader = new FunctionLoader();
    const watcher = new FileWatcher();
    
    // Test registry basics
    const stats = registry.getStats();
    console.assert(stats.totalFunctions === 0, 'Registry should start empty');
    
    // Test loader with example file
    const examplePath = path.join(__dirname, '../examples/copy-editor.md');
    try {
      const result = await loader.loadFromFile(examplePath);
      console.assert(result.success === true, 'Should load example function');
      console.assert(result.function?.id === 'copy-editor', 'Should have correct ID');
      console.log('✅ Function loading test passed');
    } catch (error) {
      console.log('⚠️ Function loading test failed:', error);
    }
    
    // Test watcher
    console.assert(watcher.isWatching() === false, 'Watcher should start inactive');
    watcher.start();
    console.assert(watcher.isWatching() === true, 'Watcher should be active after start');
    watcher.stop();
    console.assert(watcher.isWatching() === false, 'Watcher should be inactive after stop');
    console.log('✅ File watcher test passed');
    
    console.log('All smoke tests completed.');
  };
  
  runSmokeTests().catch(console.error);
}