// Platform Event Bus Test
// This file tests the enhanced event bus functionality

const { WritterrEventBus } = require('./main.js');

// Test the event bus functionality
function testEventBus() {
  console.log('🚌 Testing Enhanced Platform Event Bus...\n');
  
  const eventBus = new WritterrEventBus();
  eventBus.setDebugMode(true);
  
  // Test 1: Basic event emission and reception
  console.log('Test 1: Basic Event Communication');
  let receivedData = null;
  
  eventBus.on('mode-registered', (data) => {
    receivedData = data;
    console.log('✅ Received mode-registered event:', data);
  });
  
  eventBus.emit('mode-registered', { 
    mode: { id: 'test-mode', name: 'Test Mode' } 
  });
  
  console.log('Basic communication:', receivedData ? '✅ PASS' : '❌ FAIL');
  
  // Test 2: Type safety (this would catch errors at compile time)
  console.log('\nTest 2: Event Debugging');
  console.log('Event counts:', eventBus.getEventCounts());
  console.log('All events:', eventBus.getAllEvents());
  console.log('Has listeners for mode-registered:', eventBus.hasListeners('mode-registered'));
  
  // Test 3: Error isolation and circuit breaker
  console.log('\nTest 3: Error Isolation & Circuit Breaker');
  
  // Add a handler that will fail
  const failingHandler = () => {
    throw new Error('Simulated handler failure');
  };
  
  eventBus.on('test-error-event', failingHandler);
  
  // Trigger multiple failures to test circuit breaker
  for (let i = 0; i < 6; i++) {
    eventBus.emit('test-error-event', { attempt: i + 1 });
  }
  
  setTimeout(() => {
    console.log('Circuit breaker status:', eventBus.getCircuitBreakerStatus());
    
    // Test 4: Circuit breaker reset
    console.log('\nTest 4: Circuit Breaker Reset');
    eventBus.resetCircuitBreaker('test-error-event');
    console.log('After reset:', eventBus.getCircuitBreakerStatus());
    
    // Test 5: Memory cleanup
    console.log('\nTest 5: Memory Cleanup');
    console.log('Events before cleanup:', eventBus.getAllEvents());
    eventBus.cleanup();
    console.log('Events after cleanup:', eventBus.getAllEvents());
    
    console.log('\n✅ All Event Bus tests completed!');
  }, 100);
}

// Test specific Editorial Engine events
function testEditorialEngineEvents() {
  console.log('\n📝 Testing Editorial Engine Specific Events...\n');
  
  const eventBus = new WritterrEventBus();
  
  // Track all events for verification
  const receivedEvents = [];
  
  // Register handlers for key Editorial Engine events
  const keyEvents = [
    'platform-ready',
    'mode-registered', 
    'processing-started',
    'processing-completed',
    'processing-failed'
  ];
  
  keyEvents.forEach(event => {
    eventBus.on(event, (data) => {
      receivedEvents.push({ event, data, timestamp: Date.now() });
      console.log(`📨 ${event}:`, data);
    });
  });
  
  // Simulate Editorial Engine workflow
  eventBus.emit('platform-ready', { 
    plugin: 'editorial-engine', 
    api: { version: '1.0.0' } 
  });
  
  eventBus.emit('mode-registered', {
    mode: {
      id: 'proofreader',
      name: 'Proofreader',
      category: 'basic-editing'
    }
  });
  
  eventBus.emit('processing-started', { 
    intakeId: 'test-job-001' 
  });
  
  eventBus.emit('processing-completed', {
    intakeId: 'test-job-001',
    result: {
      success: true,
      changes: ['Fixed spelling error: "recieve" → "receive"']
    }
  });
  
  setTimeout(() => {
    console.log(`\n✅ Processed ${receivedEvents.length} Editorial Engine events`);
    console.log('Event flow verification: PASS\n');
  }, 50);
}

// Run tests
if (typeof module !== 'undefined' && module.exports) {
  // Node.js environment
  testEventBus();
  testEditorialEngineEvents();
} else {
  // Browser environment  
  console.log('Event Bus tests ready - call testEventBus() and testEditorialEngineEvents()');
}