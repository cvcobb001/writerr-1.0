/**
 * @fileoverview Integration tests for dynamic mode loading in Writerr Chat
 * Tests the hot-reloading and management of chat modes from .md files
 */

import { ModeLoader } from '../../src/loader/ModeLoader';
import { ModeRegistry } from '../../src/modes/ModeRegistry';
import { ModeManager } from '../../src/modes/ModeManager';
import { HotReloadWatcher } from '../../src/loader/HotReloadWatcher';
import * as fs from 'fs/promises';
import * as path from 'path';
import { EventBus } from '@writerr/shared';

// Mock file system for testing
const mockFileSystem = {
  files: new Map<string, string>(),
  
  async readFile(filePath: string): Promise<string> {
    const content = this.files.get(filePath);
    if (!content) {
      throw new Error(`ENOENT: no such file or directory, open '${filePath}'`);
    }
    return content;
  },
  
  async writeFile(filePath: string, content: string): Promise<void> {
    this.files.set(filePath, content);
  },
  
  async exists(filePath: string): Promise<boolean> {
    return this.files.has(filePath);
  },
  
  async readdir(dirPath: string): Promise<string[]> {
    const files: string[] = [];
    for (const [filePath] of this.files) {
      if (filePath.startsWith(dirPath + '/')) {
        const fileName = path.basename(filePath);
        if (!files.includes(fileName)) {
          files.push(fileName);
        }
      }
    }
    return files;
  },
  
  clear() {
    this.files.clear();
  }
};

describe('Writerr Chat Mode Loading Integration', () => {
  let modeLoader: ModeLoader;
  let modeRegistry: ModeRegistry;
  let modeManager: ModeManager;
  let hotReloadWatcher: HotReloadWatcher;
  let eventBus: EventBus;
  let modesPath: string;

  const sampleModes = {
    'copy-edit.md': `---
id: copy-edit
name: Copy Editor
version: 1.0.0
description: Professional copy editing with attention to grammar, clarity, and style
category: editing
priority: 90
enabled: true
---

# Copy Editor Mode

You are a professional copy editor with expertise in grammar, punctuation, clarity, and style.

## Guidelines
- Focus on grammar, punctuation, and sentence structure
- Improve clarity and readability
- Maintain the author's voice and tone
- Flag inconsistencies in style or terminology
- Suggest improvements to word choice and flow

## Track Edits Configuration
- Batch size: 10
- Confidence threshold: 0.8
- Clustering strategy: category
- Auto-apply high confidence: false

## Examples
**Input**: "The company's profits has increased significantly."
**Output**: "The company's profits have increased significantly."
**Category**: grammar

**Input**: "We need to optimize our approach for maximum efficiency."
**Output**: "We need to streamline our approach for greater efficiency."
**Category**: word-choice`,

    'creative-writing.md': `---
id: creative-writing
name: Creative Writing Assistant
version: 1.0.0
description: Enhance creative writing with focus on narrative flow, character development, and literary style
category: creative
priority: 85
enabled: true
---

# Creative Writing Assistant

You are a creative writing coach specializing in fiction, helping writers develop compelling narratives and rich prose.

## Guidelines
- Enhance descriptive language and imagery
- Improve dialogue naturalness and character voice
- Strengthen plot development and pacing
- Suggest ways to show rather than tell
- Maintain genre conventions and tone

## Track Edits Configuration
- Batch size: 5
- Confidence threshold: 0.7
- Clustering strategy: proximity
- Auto-apply high confidence: false

## Examples
**Input**: "She was sad about the news."
**Output**: "Her shoulders sagged as the weight of the news settled over her."
**Category**: show-dont-tell`,

    'technical-writing.md': `---
id: technical-writing  
name: Technical Writing Specialist
version: 1.0.0
description: Optimize technical documentation for clarity, accuracy, and user comprehension
category: technical
priority: 88
enabled: true
---

# Technical Writing Specialist

You specialize in technical communication, making complex information accessible and actionable.

## Guidelines
- Use clear, concise language
- Structure information logically
- Eliminate jargon where possible
- Ensure accuracy of technical details
- Format for scannability

## Track Edits Configuration
- Batch size: 15
- Confidence threshold: 0.9
- Clustering strategy: category
- Auto-apply high confidence: true

## Constraints
- Never alter code examples
- Maintain technical precision
- Preserve numbered lists and procedures`
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockFileSystem.clear();
    
    // Set up test environment
    modesPath = '/test/modes';
    eventBus = new EventBus();
    
    // Create sample mode files
    for (const [fileName, content] of Object.entries(sampleModes)) {
      await mockFileSystem.writeFile(path.join(modesPath, fileName), content);
    }
    
    // Initialize components with mocked file system
    modeLoader = new ModeLoader(mockFileSystem as any);
    modeRegistry = new ModeRegistry();
    modeManager = new ModeManager(modeRegistry, eventBus);
    hotReloadWatcher = new HotReloadWatcher(modesPath, modeLoader, modeRegistry, mockFileSystem as any);
  });

  afterEach(async () => {
    await hotReloadWatcher.stop();
    mockFileSystem.clear();
  });

  describe('Mode Discovery and Loading', () => {
    it('should discover and load all modes from directory', async () => {
      const loadedModes = await modeLoader.loadModesFromDirectory(modesPath);
      
      expect(loadedModes.length).toBe(3);
      
      // Verify each mode loaded correctly
      const modeIds = loadedModes.map(m => m.id).sort();
      expect(modeIds).toEqual(['copy-edit', 'creative-writing', 'technical-writing']);
      
      // Register loaded modes
      for (const mode of loadedModes) {
        modeRegistry.registerMode(mode);
      }
      
      // Verify registry state
      const allModes = modeRegistry.getAllModes();
      expect(allModes.length).toBe(3);
      
      console.log('✅ Mode discovery and loading completed successfully');
      console.log('Loaded modes:', loadedModes.map(m => ({
        id: m.id,
        name: m.name,
        category: m.category,
        priority: m.priority
      })));
    });

    it('should handle malformed mode files gracefully', async () => {
      // Add a malformed mode file
      await mockFileSystem.writeFile(path.join(modesPath, 'malformed.md'), `
---
id: malformed
# Missing closing ---
This is malformed frontmatter
      `);
      
      const result = await modeLoader.loadModeFromFile(path.join(modesPath, 'malformed.md'));
      
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
      
      console.log('✅ Malformed mode file handled gracefully');
      console.log('Parsing errors:', result.errors);
    });

    it('should validate mode configuration', async () => {
      // Add mode with invalid configuration
      await mockFileSystem.writeFile(path.join(modesPath, 'invalid-config.md'), `---
id: invalid-config
name: Invalid Config Mode
priority: 150  # Invalid - should be 0-100
enabled: "true"  # Should be boolean
---

# Invalid Config Mode
This mode has invalid configuration values.`);
      
      const result = await modeLoader.loadModeFromFile(path.join(modesPath, 'invalid-config.md'));
      
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Priority must be between 0 and 100');
      
      console.log('✅ Mode configuration validation working');
      console.log('Validation errors:', result.errors);
    });
  });

  describe('Hot Reloading', () => {
    it('should detect and reload modified mode files', async () => {
      // Initial load
      const initialModes = await modeLoader.loadModesFromDirectory(modesPath);
      for (const mode of initialModes) {
        modeRegistry.registerMode(mode);
      }
      
      // Start hot reload watcher
      await hotReloadWatcher.start();
      
      let reloadDetected = false;
      eventBus.on('mode:reloaded', (data) => {
        reloadDetected = true;
        console.log('Mode reloaded:', data);
      });
      
      // Modify existing mode file
      const modifiedContent = sampleModes['copy-edit.md'].replace(
        'priority: 90',
        'priority: 95'
      );
      
      await mockFileSystem.writeFile(
        path.join(modesPath, 'copy-edit.md'), 
        modifiedContent
      );
      
      // Simulate file change event
      hotReloadWatcher.handleFileChange(path.join(modesPath, 'copy-edit.md'));
      
      // Wait for reload processing
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Verify mode was reloaded with new priority
      const reloadedMode = modeRegistry.getMode('copy-edit');
      expect(reloadedMode?.priority).toBe(95);
      expect(reloadDetected).toBe(true);
      
      console.log('✅ Hot reloading detected and processed file changes');
      console.log('Reloaded mode priority:', reloadedMode?.priority);
    });

    it('should add newly created mode files', async () => {
      // Initial load
      const initialModes = await modeLoader.loadModesFromDirectory(modesPath);
      for (const mode of initialModes) {
        modeRegistry.registerMode(mode);
      }
      
      await hotReloadWatcher.start();
      
      let newModeAdded = false;
      eventBus.on('mode:added', (data) => {
        newModeAdded = true;
        console.log('New mode added:', data);
      });
      
      // Add new mode file
      const newModeContent = `---
id: proofreader
name: Proofreader
version: 1.0.0
description: Final proofreading for typos, punctuation, and formatting
category: editing
priority: 95
enabled: true
---

# Proofreader Mode
Focus on final proofreading tasks: typos, punctuation, formatting.`;
      
      await mockFileSystem.writeFile(path.join(modesPath, 'proofreader.md'), newModeContent);
      
      // Simulate file addition
      hotReloadWatcher.handleFileChange(path.join(modesPath, 'proofreader.md'));
      
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Verify new mode was added
      const newMode = modeRegistry.getMode('proofreader');
      expect(newMode).toBeDefined();
      expect(newMode?.name).toBe('Proofreader');
      expect(newModeAdded).toBe(true);
      
      console.log('✅ New mode file detected and loaded');
      console.log('New mode details:', {
        id: newMode?.id,
        name: newMode?.name,
        category: newMode?.category
      });
    });

    it('should remove deleted mode files', async () => {
      // Initial load
      const initialModes = await modeLoader.loadModesFromDirectory(modesPath);
      for (const mode of initialModes) {
        modeRegistry.registerMode(mode);
      }
      
      await hotReloadWatcher.start();
      
      let modeRemoved = false;
      eventBus.on('mode:removed', (data) => {
        modeRemoved = true;
        console.log('Mode removed:', data);
      });
      
      // Verify mode exists initially
      expect(modeRegistry.getMode('creative-writing')).toBeDefined();
      
      // Remove mode file
      mockFileSystem.files.delete(path.join(modesPath, 'creative-writing.md'));
      
      // Simulate file deletion
      hotReloadWatcher.handleFileRemoval(path.join(modesPath, 'creative-writing.md'));
      
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Verify mode was removed
      const removedMode = modeRegistry.getMode('creative-writing');
      expect(removedMode).toBeNull();
      expect(modeRemoved).toBe(true);
      
      console.log('✅ Deleted mode file detected and removed from registry');
    });
  });

  describe('Mode Manager Integration', () => {
    it('should initialize with all discovered modes', async () => {
      await modeManager.initialize(modesPath);
      
      const availableModes = modeManager.getAvailableModes();
      expect(availableModes.length).toBe(3);
      
      // Verify modes are sorted by priority
      const priorities = availableModes.map(m => m.priority);
      expect(priorities).toEqual([90, 88, 85]); // copy-edit, technical-writing, creative-writing
      
      console.log('✅ Mode manager initialized with all modes');
      console.log('Available modes:', availableModes.map(m => ({
        id: m.id,
        name: m.name,
        priority: m.priority
      })));
    });

    it('should handle mode switching', async () => {
      await modeManager.initialize(modesPath);
      
      // Set initial mode
      const switchResult1 = await modeManager.switchMode('copy-edit');
      expect(switchResult1.success).toBe(true);
      expect(modeManager.getCurrentMode()?.id).toBe('copy-edit');
      
      // Switch to different mode
      const switchResult2 = await modeManager.switchMode('creative-writing');
      expect(switchResult2.success).toBe(true);
      expect(modeManager.getCurrentMode()?.id).toBe('creative-writing');
      
      // Try to switch to non-existent mode
      const switchResult3 = await modeManager.switchMode('non-existent');
      expect(switchResult3.success).toBe(false);
      expect(switchResult3.error).toBeDefined();
      
      // Current mode should remain unchanged
      expect(modeManager.getCurrentMode()?.id).toBe('creative-writing');
      
      console.log('✅ Mode switching working correctly');
      console.log('Mode switch results:', {
        initialSwitch: switchResult1.success,
        secondSwitch: switchResult2.success,
        invalidSwitch: switchResult3.success,
        currentMode: modeManager.getCurrentMode()?.id
      });
    });

    it('should provide mode-specific configuration', async () => {
      await modeManager.initialize(modesPath);
      await modeManager.switchMode('technical-writing');
      
      const currentMode = modeManager.getCurrentMode();
      expect(currentMode).toBeDefined();
      
      // Verify Track Edits configuration
      expect(currentMode?.trackEditsConfig.batchSize).toBe(15);
      expect(currentMode?.trackEditsConfig.confidenceThreshold).toBe(0.9);
      expect(currentMode?.trackEditsConfig.autoApplyHighConfidence).toBe(true);
      
      // Switch to different mode and verify different config
      await modeManager.switchMode('creative-writing');
      const newMode = modeManager.getCurrentMode();
      
      expect(newMode?.trackEditsConfig.batchSize).toBe(5);
      expect(newMode?.trackEditsConfig.confidenceThreshold).toBe(0.7);
      expect(newMode?.trackEditsConfig.autoApplyHighConfidence).toBe(false);
      
      console.log('✅ Mode-specific configuration working');
      console.log('Technical writing config:', currentMode?.trackEditsConfig);
      console.log('Creative writing config:', newMode?.trackEditsConfig);
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should recover from corrupted mode files during hot reload', async () => {
      // Initial setup
      await modeManager.initialize(modesPath);
      const initialModeCount = modeManager.getAvailableModes().length;
      
      await hotReloadWatcher.start();
      
      // Corrupt an existing mode file
      await mockFileSystem.writeFile(
        path.join(modesPath, 'copy-edit.md'),
        'This is not valid YAML frontmatter or markdown'
      );
      
      // Simulate file change
      hotReloadWatcher.handleFileChange(path.join(modesPath, 'copy-edit.md'));
      
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // The corrupted mode should be removed, others should remain
      const remainingModes = modeManager.getAvailableModes();
      expect(remainingModes.length).toBe(initialModeCount - 1);
      expect(remainingModes.find(m => m.id === 'copy-edit')).toBeUndefined();
      
      // System should still be functional
      const switchResult = await modeManager.switchMode('creative-writing');
      expect(switchResult.success).toBe(true);
      
      console.log('✅ System recovered from corrupted mode file');
      console.log('Recovery results:', {
        initialModes: initialModeCount,
        remainingModes: remainingModes.length,
        systemStillFunctional: switchResult.success
      });
    });

    it('should handle file system errors gracefully', async () => {
      // Mock file system error
      const originalReadFile = mockFileSystem.readFile;
      mockFileSystem.readFile = async (filePath: string) => {
        if (filePath.includes('copy-edit.md')) {
          throw new Error('EACCES: permission denied');
        }
        return originalReadFile.call(mockFileSystem, filePath);
      };
      
      const loadResult = await modeLoader.loadModesFromDirectory(modesPath);
      
      // Should load other modes successfully despite one failure
      expect(loadResult.length).toBe(2); // technical-writing and creative-writing
      expect(loadResult.find(m => m.id === 'copy-edit')).toBeUndefined();
      
      // Restore original function
      mockFileSystem.readFile = originalReadFile;
      
      console.log('✅ File system errors handled gracefully');
      console.log('Loaded modes despite error:', loadResult.map(m => m.id));
    });
  });

  describe('Performance Under Load', () => {
    it('should handle rapid file changes efficiently', async () => {
      await modeManager.initialize(modesPath);
      await hotReloadWatcher.start();
      
      const startTime = Date.now();
      const changeCount = 50;
      
      // Simulate rapid file changes
      for (let i = 0; i < changeCount; i++) {
        const modifiedContent = sampleModes['copy-edit.md'].replace(
          'priority: 90',
          `priority: ${90 + (i % 10)}`
        );
        
        await mockFileSystem.writeFile(
          path.join(modesPath, 'copy-edit.md'),
          modifiedContent
        );
        
        hotReloadWatcher.handleFileChange(path.join(modesPath, 'copy-edit.md'));
        
        // Small delay to simulate realistic file change timing
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      
      // Wait for all changes to process
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const processingTime = Date.now() - startTime;
      
      // Verify final state is correct
      const finalMode = modeRegistry.getMode('copy-edit');
      expect(finalMode).toBeDefined();
      
      console.log('✅ Rapid file changes handled efficiently');
      console.log('Performance metrics:', {
        totalChanges: changeCount,
        processingTime: `${processingTime}ms`,
        averageTimePerChange: `${(processingTime / changeCount).toFixed(2)}ms`,
        finalModeState: finalMode ? 'loaded' : 'missing'
      });
    });
  });
});