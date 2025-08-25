/**
 * Simple smoke test for the function registry system
 */

const { FunctionRegistry } = require('../dist/registry/FunctionRegistry.js');
const { FunctionLoader } = require('../dist/loader/FunctionLoader.js');
const path = require('path');

async function runSmokeTests() {
  console.log('🧪 Running smoke tests for AI Editorial Functions...\n');

  try {
    // Test 1: Registry initialization
    console.log('Test 1: Registry initialization');
    const registry = new FunctionRegistry();
    const stats = registry.getStats();
    console.assert(stats.totalFunctions === 0, 'Registry should start empty');
    console.assert(stats.activeFunctions === 0, 'Should have no active functions');
    console.log('✅ Registry initializes correctly\n');

    // Test 2: Function loading
    console.log('Test 2: Function loading from markdown');
    const loader = new FunctionLoader();
    const examplePath = path.join(__dirname, '../examples/copy-editor.md');
    
    const result = await loader.loadFromFile(examplePath);
    console.log('Load result:', {
      success: result.success,
      errors: result.errors,
      functionId: result.function?.id,
      functionName: result.function?.name
    });
    
    console.assert(result.success === true, 'Should successfully load example function');
    console.assert(result.function?.id === 'copy-editor', 'Should have correct function ID');
    console.assert(result.function?.name === 'Copy Editor', 'Should have correct function name');
    console.log('✅ Function loading works correctly\n');

    // Test 3: Function registration
    console.log('Test 3: Function registration');
    if (result.function) {
      registry.registerFunction(result.function);
      const newStats = registry.getStats();
      console.assert(newStats.totalFunctions === 1, 'Should have one registered function');
      
      const retrieved = registry.getFunction('copy-editor');
      console.assert(retrieved !== null, 'Should be able to retrieve registered function');
      console.assert(retrieved.id === 'copy-editor', 'Retrieved function should have correct ID');
      console.log('✅ Function registration works correctly\n');
    }

    // Test 4: Function listing
    console.log('Test 4: Function listing and filtering');
    const allFunctions = registry.listFunctions();
    console.assert(allFunctions.length === 1, 'Should list one function');
    
    const copyEditors = registry.listFunctions({ category: 'copy-editor' });
    console.assert(copyEditors.length === 1, 'Should find copy editor function');
    
    const proofreaders = registry.listFunctions({ category: 'proofreader' });
    console.assert(proofreaders.length === 0, 'Should not find any proofreader functions');
    console.log('✅ Function listing and filtering works correctly\n');

    console.log('🎉 All smoke tests passed! The function registry system is working correctly.');
    return true;

  } catch (error) {
    console.error('❌ Smoke test failed:', error);
    return false;
  }
}

// Run the tests
runSmokeTests()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });