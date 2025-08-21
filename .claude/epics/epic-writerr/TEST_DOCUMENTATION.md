# Writerr Test Suite Documentation

## Overview

This document provides comprehensive documentation for the Writerr plugin test suite, covering all three plugins (Track Edits, Writerr Chat, AI Editorial Functions) with integration, performance, security, and user acceptance testing.

## Test Architecture

### Test Structure
```
packages/
├── track-edits/
│   └── tests/
│       ├── integration/
│       │   ├── core-api.test.ts         # Main Track Edits API testing
│       │   └── event-bus.test.ts        # Cross-plugin communication
│       └── performance/
│           └── large-document.test.ts   # Performance with 100K+ words
├── writerr-chat/
│   └── tests/
│       └── integration/
│           └── mode-loading.test.ts     # Dynamic mode hot-reloading
├── ai-editorial-functions/
│   └── tests/
│       ├── integration/
│       │   └── function-execution.test.ts # End-to-end function workflow
│       └── security/
│           └── function-sandboxing.test.ts # Security and isolation
└── tests/
    └── system/
        ├── complete-workflows.test.ts    # Full system integration
        ├── memory-leak-detection.test.ts # Memory management
        └── user-acceptance.test.ts       # Realistic user scenarios
```

### Test Infrastructure

**Framework**: Jest with TypeScript support
**Mocking**: Comprehensive Obsidian API mocks
**Coverage**: Line, branch, and function coverage tracking
**Performance**: Timing and memory usage monitoring
**Verbose Output**: Debug-friendly test reporting

## Test Categories

### 1. Integration Tests

#### Track Edits Core API (`packages/track-edits/tests/integration/core-api.test.ts`)

**Purpose**: Test the main Track Edits API that other plugins interact with

**Key Test Areas**:
- Document tracking management (enable/disable/persist state)
- Change submission and processing (single changes and batches)
- Change review workflow (accept/reject/bulk operations)
- Change clustering and organization strategies
- Performance with large numbers of changes
- Error handling and data recovery

**Sample Test**:
```typescript
it('should accept and process a single change', async () => {
  const change = {
    id: 'change-1',
    documentId: 'test.md',
    type: 'edit',
    originalText: 'sample text',
    suggestedText: 'improved sample text',
    // ... additional properties
  };

  const result = await trackEditsCore.submitChange(change);
  expect(result.success).toBe(true);
  
  const changes = trackEditsCore.getChangesForDocument('test.md');
  expect(changes).toHaveLength(1);
});
```

#### Event Bus Communication (`packages/track-edits/tests/integration/event-bus.test.ts`)

**Purpose**: Test cross-plugin communication through the shared event bus

**Key Test Areas**:
- Complete user request workflows across plugins
- Simultaneous requests from multiple sources
- Event listener error handling and recovery
- Performance under high-frequency events
- Event listener memory leak prevention
- Document state synchronization

#### Mode Loading (`packages/writerr-chat/tests/integration/mode-loading.test.ts`)

**Purpose**: Test dynamic mode loading and hot-reloading in Writerr Chat

**Key Test Areas**:
- Mode discovery and loading from .md files
- Hot-reloading when mode files change
- Mode validation and error handling
- Mode switching and configuration
- Performance with large numbers of modes

#### Function Execution (`packages/ai-editorial-functions/tests/integration/function-execution.test.ts`)

**Purpose**: Test complete AI Editorial Functions workflow from loading to execution

**Key Test Areas**:
- End-to-end function execution workflow
- Function-specific configuration application
- Performance monitoring integration
- Learning and feedback processing
- Concurrent function execution
- Error handling and recovery

### 2. Performance Tests

#### Large Document Handling (`packages/track-edits/tests/performance/large-document.test.ts`)

**Purpose**: Ensure system performs well with realistic document sizes

**Key Test Areas**:
- 100K+ word document processing
- 500K word massive document handling
- Batch processing performance
- Memory usage optimization
- Real-time UI responsiveness
- Concurrent operation handling

**Performance Targets**:
- Document tracking enable: < 2 seconds for 100K words
- Change submission: < 50ms average per change
- Batch processing: > 50 changes per second
- Memory usage: < 200MB for 5000 changes
- UI updates: < 16ms for 60fps responsiveness

### 3. Security Tests

#### Function Sandboxing (`packages/ai-editorial-functions/tests/security/function-sandboxing.test.ts`)

**Purpose**: Ensure user-generated functions are properly isolated and secure

**Key Test Areas**:
- File system access control
- Path traversal attack prevention
- Function content validation and sanitization
- Code injection detection
- Runtime API restriction
- Resource limit enforcement
- Execution context isolation
- Sensitive data protection

**Security Measures Tested**:
- Restricted directory access (no system paths)
- Malicious metadata sanitization
- Code injection prevention
- API access limitation
- Resource consumption limits
- Context pollution prevention

### 4. System-Wide Tests

#### Complete Workflows (`tests/system/complete-workflows.test.ts`)

**Purpose**: Test full system integration across all three plugins

**Key Test Areas**:
- End-to-end editorial workflows
- Cross-plugin communication flows
- Plugin initialization order handling
- Error recovery and resilience
- Concurrent operations management
- Performance under system load

#### Memory Leak Detection (`tests/system/memory-leak-detection.test.ts`)

**Purpose**: Ensure no memory leaks during extended usage

**Key Test Areas**:
- Extended change processing sessions
- Event listener cleanup
- Function hot-reloading cycles
- 8-hour session simulation
- Memory pressure handling

**Memory Thresholds**:
- Growth rate: < 50MB/hour steady state
- Cleanup efficiency: 95% memory recovery after operations
- Extended sessions: < 100MB total growth over 8 hours

#### User Acceptance (`tests/system/user-acceptance.test.ts`)

**Purpose**: Test realistic user scenarios and workflows

**User Personas Tested**:
- **Academic Writer**: Research paper improvement workflow
- **Creative Writer**: Story enhancement with atmosphere and dialogue
- **Business Professional**: Proposal clarity and concision improvement

**Realistic Scenarios**:
- Multi-document workflow management
- Context-appropriate AI suggestions
- User decision-making patterns
- Workflow timing and efficiency

## Running Tests

### All Tests
```bash
npm test
```

### Watch Mode
```bash
npm run test:watch
```

### Specific Test Categories
```bash
# Integration tests only
npm test -- --testPathPattern=integration

# Performance tests only  
npm test -- --testPathPattern=performance

# Security tests only
npm test -- --testPathPattern=security

# System tests only
npm test -- --testPathPattern=system
```

### Coverage Report
```bash
npm test -- --coverage
```

## Test Environment Setup

### Mock Configuration
Tests use comprehensive mocks for:
- Obsidian API (vault, workspace, metadata cache)
- File system operations
- AI Providers integration
- Plugin lifecycle management

### Environment Variables
```bash
NODE_ENV=test           # Enable test mode
VERBOSE_TESTS=true      # Enable detailed logging
ENABLE_GC=true          # Force garbage collection for memory tests
```

## Understanding Test Output

### Verbose Logging
Tests include detailed console output for debugging:
```
✅ Document tracking enabled successfully
Document ID: test-document.md
Tracking State: { enabled: true, changeCount: 0 }

✅ Single change processed successfully
Change details: {
  id: 'change-1',
  original: 'sample text',
  suggested: 'improved sample text',
  confidence: 0.9,
  source: { type: 'ai', plugin: 'ai-editorial-functions' }
}
```

### Performance Metrics
Performance tests report detailed metrics:
```
Performance metrics: {
  documentSize: '100,000 words',
  changeCount: '1,000',
  totalSubmissionTime: '5,432ms',
  averageSubmissionTime: '5.43ms',
  changesPerSecond: 184,
  memoryIncrease: '45MB'
}
```

### Memory Analysis
Memory leak tests provide comprehensive reports:
```
📊 Memory Usage Report:
  1. test-start: 125MB used / 180MB total
  2. after-change-processing: 156MB used / 200MB total  
  3. after-cleanup: 130MB used / 185MB total

Memory usage stable: 0.012MB/s growth
```

## Test Quality Standards

### Coverage Requirements
- **Line Coverage**: > 90%
- **Branch Coverage**: > 85%
- **Function Coverage**: > 95%

### Performance Requirements
- **Response Time**: 95th percentile < 100ms
- **Memory Growth**: < 10MB/hour steady state
- **Throughput**: > 100 operations/second

### Reliability Requirements
- **Test Stability**: > 99.5% pass rate
- **Deterministic Results**: No flaky tests
- **Error Recovery**: 100% graceful error handling

## Debugging Failed Tests

### Common Issues

1. **Timing-related failures**:
   ```bash
   # Increase timeout for performance tests
   jest --testTimeout=60000
   ```

2. **Memory test failures**:
   ```bash
   # Enable garbage collection
   node --expose-gc --test
   ```

3. **Mock-related issues**:
   - Verify Obsidian API mocks match real API
   - Check mock file system state between tests
   - Ensure proper cleanup in afterEach blocks

### Debug Commands
```bash
# Run single test with detailed output
npm test -- --testNamePattern="should handle end-to-end copy editing" --verbose

# Run tests with Node.js debugging
node --inspect-brk node_modules/.bin/jest --runInBand --testNamePattern="memory leak"

# Generate detailed coverage report
npm test -- --coverage --coverageReporters=text --coverageReporters=html
```

## Continuous Integration

### GitHub Actions Configuration
```yaml
name: Test Suite
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm test -- --coverage --maxWorkers=2
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

### Pre-commit Hooks
```json
{
  "husky": {
    "hooks": {
      "pre-commit": "npm run test:unit && npm run lint",
      "pre-push": "npm test"
    }
  }
}
```

## Contributing to Tests

### Adding New Tests
1. Follow existing test structure and naming conventions
2. Include realistic scenarios and edge cases
3. Add comprehensive logging for debugging
4. Ensure tests are deterministic and reliable
5. Update documentation for new test categories

### Test Writing Guidelines
- **Arrange, Act, Assert**: Clear test structure
- **Descriptive Names**: Tests should read like specifications
- **Comprehensive Coverage**: Test happy path, edge cases, and error conditions
- **Performance Aware**: Include timing assertions for critical paths
- **Memory Conscious**: Clean up resources in afterEach blocks

### Mock Best Practices
- Mock at the boundary (file system, network, Obsidian API)
- Provide realistic mock responses
- Verify mock interactions where appropriate
- Reset mocks between tests

This comprehensive test suite ensures Writerr plugins are reliable, performant, secure, and provide excellent user experience across all supported workflows and scenarios.