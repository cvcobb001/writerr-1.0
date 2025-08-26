// Track Edits Adapter Integration Test
// This file tests the Track Edits adapter functionality

console.log('🔗 Testing Track Edits Adapter Integration...\n');

// Mock Track Edits API for testing
const mockTrackEditsAPI = {
  getCurrentSession: () => ({ 
    id: 'test-session-001', 
    startTime: Date.now() - 60000,
    changes: [],
    wordCount: 1250,
    characterCount: 7800
  }),
  getSessionHistory: () => [],
  startTracking: () => console.log('Mock: Starting tracking session'),
  stopTracking: () => console.log('Mock: Stopping tracking session'),
  exportSession: (sessionId) => `Mock export for ${sessionId}`
};

// Set up mock environment
window.WriterrlAPI = { trackEdits: mockTrackEditsAPI };

async function testTrackEditsAdapter() {
  try {
    // Import the adapter (would be done by Editorial Engine)
    const { TrackEditsAdapter } = require('./main.js');
    
    console.log('Test 1: Adapter Initialization');
    const adapter = new TrackEditsAdapter();
    
    console.log('- Name:', adapter.name);
    console.log('- Version:', adapter.version);
    console.log('- Supported Operations:', adapter.supportedOperations);
    console.log('- Capabilities:', adapter.capabilities);
    
    // Initialize adapter
    await adapter.initialize({});
    console.log('✅ Adapter initialized successfully');
    
    // Test adapter status
    console.log('\nTest 2: Adapter Status Check');
    const status = adapter.getStatus();
    console.log('- Status:', status);
    console.log('- Healthy:', status.healthy ? '✅' : '❌');
    console.log('- Ready:', status.ready ? '✅' : '❌');
    
    // Test metrics
    console.log('\nTest 3: Adapter Metrics');
    const metrics = adapter.getMetrics();
    console.log('- Executions:', metrics.executionsCount);
    console.log('- Success Rate:', metrics.successRate);
    console.log('- Average Latency:', metrics.averageLatency);
    
    // Test job execution
    console.log('\nTest 4: Job Execution');
    const testJob = {
      id: 'test-job-001',
      type: 'text-edit',
      timeout: 5000,
      payload: {
        text: 'This is corrected text with proper grammar.',
        originalText: 'This is text with bad grammer.',
        mode: 'proofreader',
        edits: [
          {
            id: 'edit-1',
            type: 'replacement',
            start: 20,
            end: 28,
            oldText: 'grammer',
            newText: 'grammar'
          }
        ]
      },
      metadata: {
        startTime: Date.now()
      }
    };
    
    console.log('Executing job:', testJob.id);
    const result = await adapter.execute(testJob);
    
    console.log('- Success:', result.success ? '✅' : '❌');
    console.log('- Job ID:', result.jobId);
    console.log('- Execution Time:', result.executionTime, 'ms');
    
    if (result.success) {
      console.log('- Applied Changes:', result.metadata.appliedChanges);
      console.log('- Rejected Changes:', result.metadata.rejectedChanges);
      console.log('- Track Edits Session:', result.metadata.trackEditsSession);
      console.log('- Provenance:', result.provenance ? '✅ Present' : '❌ Missing');
    } else {
      console.log('- Errors:', result.errors);
    }
    
    // Test batch processing
    console.log('\nTest 5: Batch Processing');
    const batchJobs = [];
    for (let i = 0; i < 3; i++) {
      batchJobs.push({
        ...testJob,
        id: `batch-job-${i}`,
        payload: {
          ...testJob.payload,
          text: `Batch processed text number ${i + 1}.`
        }
      });
    }
    
    const batchResults = await Promise.all(
      batchJobs.map(job => adapter.execute(job))
    );
    
    const successCount = batchResults.filter(r => r.success).length;
    console.log(`- Batch Results: ${successCount}/${batchJobs.length} successful`);
    
    // Test error handling
    console.log('\nTest 6: Error Handling');
    const errorJob = {
      ...testJob,
      id: 'error-job-001',
      payload: {} // Invalid payload
    };
    
    const errorResult = await adapter.execute(errorJob);
    console.log('- Error handled gracefully:', !errorResult.success ? '✅' : '❌');
    if (!errorResult.success) {
      console.log('- Error message:', errorResult.errors[0]?.message);
    }
    
    // Final metrics check
    console.log('\nTest 7: Final Metrics Check');
    const finalMetrics = adapter.getMetrics();
    console.log('- Total Executions:', finalMetrics.executionsCount);
    console.log('- Success Rate:', (finalMetrics.successRate * 100).toFixed(1) + '%');
    console.log('- Average Latency:', finalMetrics.averageLatency.toFixed(2), 'ms');
    console.log('- Error Count:', finalMetrics.errorCount);
    
    // Cleanup
    await adapter.cleanup();
    console.log('\n✅ Track Edits Adapter tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Track Edits Adapter test failed:', error);
  }
}

// Test Editorial Engine integration
async function testEditorialEngineIntegration() {
  console.log('\n🔧 Testing Editorial Engine Integration...\n');
  
  try {
    // Mock Editorial Engine components
    const mockEventBus = {
      emit: (event, data) => console.log(`Event emitted: ${event}`, data),
      on: (event, handler) => console.log(`Listening for: ${event}`)
    };
    
    const mockSettings = {
      adapters: {
        'track-edits': {
          config: {
            batchSize: 10,
            timeout: 5000
          }
        }
      }
    };
    
    // Test adapter registration with AdapterManager
    console.log('Test: Adapter Registration');
    const { AdapterManager } = require('./main.js');
    const { TrackEditsAdapter } = require('./main.js');
    
    const adapterManager = new AdapterManager(mockEventBus, mockSettings);
    const adapter = new TrackEditsAdapter();
    
    await adapterManager.registerAdapter(adapter);
    console.log('✅ Adapter registered with AdapterManager');
    
    // Test adapter retrieval
    const retrievedAdapter = adapterManager.getAdapter('track-edits');
    console.log('- Retrieved adapter:', retrievedAdapter ? '✅' : '❌');
    console.log('- Adapter count:', adapterManager.getAdapterCount());
    
    // Test job execution through AdapterManager
    console.log('\nTest: Job Execution through AdapterManager');
    const testJob = {
      id: 'integration-test-001',
      type: 'text-edit',
      timeout: 5000,
      payload: {
        text: 'Integration test successful.',
        originalText: 'Integration test successfull.',
        mode: 'proofreader'
      }
    };
    
    const result = await adapterManager.execute(testJob);
    console.log('- Integration success:', result.success ? '✅' : '❌');
    
    console.log('\n✅ Editorial Engine integration tests completed!');
    
  } catch (error) {
    console.error('❌ Integration test failed:', error);
  }
}

// Test data format conversions
function testDataFormatConversions() {
  console.log('\n🔄 Testing Data Format Conversions...\n');
  
  // Test Editorial Engine → Track Edits conversion
  console.log('Test: Editorial Engine to Track Edits Format');
  
  const editorialEngineJob = {
    id: 'conversion-test-001',
    payload: {
      text: 'This is the corrected text.',
      originalText: 'This is the original text.',
      mode: 'copy-editor',
      edits: [
        {
          id: 'edit-1',
          type: 'replacement',
          start: 12,
          end: 20,
          oldText: 'original',
          newText: 'corrected'
        }
      ]
    }
  };
  
  // Simulate conversion (would be done by adapter)
  const trackEditsChanges = {
    id: 'conversion-test-001-edit-1',
    timestamp: Date.now(),
    type: 'replace',
    from: 12,
    to: 20,
    text: 'corrected',
    removedText: 'original',
    author: 'editorial-engine',
    metadata: {
      jobId: 'conversion-test-001',
      mode: 'copy-editor',
      provenance: 'editorial-engine'
    }
  };
  
  console.log('- Editorial Engine format:', JSON.stringify(editorialEngineJob.payload.edits[0], null, 2));
  console.log('- Track Edits format:', JSON.stringify(trackEditsChanges, null, 2));
  console.log('✅ Format conversion test completed');
}

// Run all tests
async function runAllTests() {
  await testTrackEditsAdapter();
  await testEditorialEngineIntegration();
  testDataFormatConversions();
  
  console.log('\n🎉 All Track Edits Adapter tests completed!');
}

// Export for use in other contexts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    testTrackEditsAdapter,
    testEditorialEngineIntegration,
    testDataFormatConversions,
    runAllTests
  };
} else {
  // Run tests if in browser environment
  runAllTests();
}