# Testing Documentation

## Overview

This project uses Jest with TypeScript support for comprehensive testing of the Writerr Platform Obsidian plugins. The testing environment is configured to handle DOM operations, IndexedDB interactions, and complex asynchronous workflows.

## Setup

### Prerequisites

The testing environment requires the following dependencies:
- `jest` - Testing framework
- `ts-jest` - TypeScript transformer for Jest
- `@types/jest` - TypeScript definitions for Jest
- `jest-environment-jsdom` - DOM environment for browser-like testing
- `fake-indexeddb` - IndexedDB implementation for testing

### Configuration Files

- **`jest.config.js`** - Main Jest configuration with TypeScript support
- **`jest.setup.js`** - Global test setup, mocks, and utilities
- **`tsconfig.test.json`** - TypeScript configuration for test files
- **`plugins/track-edits/src/__tests__/test-utils.ts`** - Shared test utilities

## Running Tests

### Basic Commands

```bash
# Run all tests
npm test

# Run tests in watch mode (for development)
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run tests for CI/CD (no watch, with coverage)
npm run test:ci

# Build all plugins (legacy test command)
npm run build:test
```

### Running Specific Tests

```bash
# Run specific test file
npx jest plugins/track-edits/src/__tests__/event-persistence.test.ts

# Run tests matching a pattern
npx jest --testNamePattern="Event Persistence"

# Run tests for specific plugin
npx jest plugins/track-edits

# Run tests with specific configuration
npx jest --config jest.config.js
```

## Test Environment

### Mocked APIs

The test environment provides comprehensive mocks for:

#### Obsidian API
- `Plugin` base class
- `MarkdownView` with editor interface
- `TFile` file representation
- `WorkspaceLeaf` and `ItemView` for UI components
- `app.workspace` with file and view management
- `app.vault` for file operations

#### Browser APIs
- **IndexedDB** - Full implementation via `fake-indexeddb`
- **DOM APIs** - Complete DOM environment via jsdom
- **Timer APIs** - Mocked `setTimeout`, `setInterval` with Jest fake timers
- **Animation APIs** - Mocked `requestAnimationFrame`

#### Platform-Specific
- **window.Writerr** - Writerr Platform event bus
- **Platform detection** - Desktop/mobile platform flags
- **Console APIs** - Mocked for cleaner test output

### Test Utilities

The `test-utils.ts` file provides helper functions for:

#### Mock Data Creation
```typescript
// Create mock EditChange objects
const change = createMockEditChange({
  oldText: 'original',
  newText: 'modified'
});

// Create AI-enhanced changes
const aiChange = createMockAIEditChange({
  aiProvider: 'anthropic',
  aiModel: 'claude-3-opus'
});

// Create batch changes for testing
const changes = createMockChangesBatch(5);
```

#### Test Environment Helpers
```typescript
// Mock Obsidian plugin
const plugin = new MockObsidianPlugin();

// Mock event bus connection
const eventBus = new MockEventBusConnection();

// Timer utilities for async testing
await TestTimers.advanceTimers(1000);
await TestTimers.runAllTimers();
```

#### Async Testing Utilities
```typescript
// Wait for promises with timeout
await waitForPromise(someAsyncOperation(), 5000);

// Wait for conditions
await waitForCondition(() => someCondition(), 3000);
```

## Test Categories

### Unit Tests

Individual component testing with full isolation:

```typescript
describe('EventPersistenceManager', () => {
  test('should store events when offline', async () => {
    const manager = new EventPersistenceManager();
    await manager.initialize();
    
    await manager.storeEvent({
      type: 'test-event',
      data: { test: true },
      timestamp: new Date(),
      eventId: 'test-123'
    });
    
    const events = await manager.getPendingEvents();
    expect(events).toHaveLength(1);
    expect(events[0].eventId).toBe('test-123');
  });
});
```

### Integration Tests

Cross-component interaction testing:

```typescript
describe('Track Edits Integration', () => {
  test('should coordinate AI processing events', async () => {
    const plugin = new TrackEditsPlugin(mockApp, manifest);
    await plugin.onload();
    
    const result = await plugin.submitChangesFromAI(
      [createMockAIEditChange()],
      'anthropic',
      'claude-3-opus'
    );
    
    expect(result.success).toBe(true);
    expect(result.changesRecorded).toBe(1);
  });
});
```

### Async Operation Tests

Testing complex asynchronous workflows:

```typescript
describe('Event Bus Synchronization', () => {
  test('should sync pending events when connection restored', async () => {
    const eventBus = new MockEventBusConnection();
    const persistence = new EventPersistenceManager();
    
    // Simulate offline state
    eventBus.setConnected(false);
    
    // Store events while offline
    await persistence.storeEvent(mockEvent);
    
    // Restore connection and sync
    eventBus.setConnected(true);
    const result = await persistence.syncPendingEvents(eventBus);
    
    expect(result.synced).toBe(1);
    expect(result.failed).toBe(0);
  });
});
```

## Best Practices

### Test Structure

Follow the Arrange-Act-Assert pattern:

```typescript
test('should handle error recovery gracefully', async () => {
  // Arrange
  const manager = new EventPersistenceManager();
  const mockEventBus = new MockEventBusConnection();
  mockEventBus.setConnected(false);
  
  // Act
  await manager.storeEvent(mockEvent);
  mockEventBus.setConnected(true);
  const result = await manager.syncPendingEvents(mockEventBus);
  
  // Assert
  expect(result.synced).toBeGreaterThan(0);
  expect(result.errors).toHaveLength(0);
});
```

### Mock Management

- Use `jest.clearAllMocks()` in `afterEach` for clean state
- Restore original implementations when needed with `jest.restoreAllMocks()`
- Use `jest.spyOn()` for partial mocking of real objects

### Async Testing

- Always use `async/await` for asynchronous operations
- Use fake timers with `jest.useFakeTimers()` for timer-dependent tests
- Clean up timers with `jest.clearAllTimers()` after tests

### Error Testing

```typescript
test('should handle storage failures gracefully', async () => {
  const manager = new EventPersistenceManager();
  
  // Mock storage failure
  jest.spyOn(manager, 'storeEvent')
    .mockRejectedValueOnce(new Error('Storage full'));
  
  await expect(manager.storeEvent(mockEvent))
    .rejects.toThrow('Storage full');
});
```

## Coverage Requirements

The project maintains coverage thresholds:

- **Branches**: 70%
- **Functions**: 70% 
- **Lines**: 70%
- **Statements**: 70%

### Viewing Coverage

```bash
# Generate and view coverage report
npm run test:coverage

# Open HTML coverage report
open coverage/lcov-report/index.html
```

## Debugging Tests

### Console Output

Restore console output for debugging:

```typescript
test('debug test with console', () => {
  restoreConsole(); // Restore real console
  console.log('Debug information');
  // Test code here
});
```

### Test Isolation

Run single tests for focused debugging:

```bash
# Run specific test with verbose output
npx jest --verbose plugins/track-edits/src/__tests__/event-persistence.test.ts

# Run with additional debugging
npx jest --verbose --no-cache --runInBand
```

### Performance Testing

Monitor test performance:

```bash
# Run tests with timing information
npx jest --verbose --detectOpenHandles

# Profile memory usage
npx jest --logHeapUsage
```

## Continuous Integration

### CI Configuration

For CI/CD pipelines, use:

```bash
npm run test:ci
```

This command:
- Runs tests without watch mode
- Generates coverage reports
- Exits with proper status codes
- Optimized for automated environments

### Test Artifacts

CI should collect:
- **Coverage reports** (`coverage/lcov.info`)
- **Test results** (JUnit XML format available)
- **Performance metrics** (test timing data)

## Troubleshooting

### Common Issues

#### TypeScript Compilation Errors
- Check `tsconfig.test.json` configuration
- Ensure all test dependencies are installed
- Verify import paths match project structure

#### IndexedDB Test Failures
- Ensure `fake-indexeddb` is properly imported in setup
- Clear IndexedDB state between tests
- Check for async operation completion

#### Timer-Related Test Issues
- Use `jest.useFakeTimers()` for timer-dependent tests
- Advance timers with `jest.advanceTimersByTime()`
- Clean up timers in `afterEach`

#### Memory Leaks in Tests
- Use `--detectOpenHandles` to find unclosed resources
- Ensure proper cleanup in `afterEach` hooks
- Check for unresolved promises

### Debug Commands

```bash
# Run with debugging information
npx jest --verbose --detectOpenHandles --forceExit

# Clear Jest cache
npx jest --clearCache

# Run with maximum logging
npx jest --verbose --logHeapUsage --detectOpenHandles
```

## Test Development Guidelines

### Writing New Tests

1. **Start with test description**: Clearly describe what is being tested
2. **Use descriptive test names**: Test names should explain the expected behavior
3. **Follow AAA pattern**: Arrange, Act, Assert for clear test structure
4. **Test error conditions**: Include both success and failure scenarios
5. **Use proper mocks**: Mock external dependencies, test internal logic

### Test Maintenance

- **Keep tests DRY**: Use shared utilities and helpers
- **Update tests with code changes**: Maintain test relevance
- **Review test coverage**: Ensure adequate coverage of new features
- **Performance considerations**: Keep tests fast and efficient

## Examples

### Complete Test Example

```typescript
import { EventPersistenceManager } from '../event-persistence-manager';
import { createMockEditChange, MockEventBusConnection } from './test-utils';

describe('EventPersistenceManager Integration', () => {
  let manager: EventPersistenceManager;
  let mockEventBus: MockEventBusConnection;

  beforeEach(async () => {
    manager = new EventPersistenceManager();
    await manager.initialize();
    
    mockEventBus = new MockEventBusConnection();
    manager.setEventBus(mockEventBus);
  });

  afterEach(async () => {
    await manager.clearAllEvents();
    jest.clearAllMocks();
  });

  test('should handle offline/online synchronization', async () => {
    // Arrange: Go offline and store events
    mockEventBus.setConnected(false);
    
    const testEvent = {
      type: 'test-event',
      data: { change: createMockEditChange() },
      timestamp: new Date(),
      eventId: 'test-123'
    };
    
    // Act: Store event while offline
    await manager.storeEvent(testEvent);
    
    // Verify event is stored
    const pendingEvents = await manager.getPendingEvents();
    expect(pendingEvents).toHaveLength(1);
    
    // Come back online and sync
    mockEventBus.setConnected(true);
    const syncResult = await manager.syncPendingEvents(mockEventBus);
    
    // Assert: Event was synchronized successfully
    expect(syncResult.synced).toBe(1);
    expect(syncResult.failed).toBe(0);
    
    const publishedEvents = mockEventBus.getPublishedEvents();
    expect(publishedEvents).toHaveLength(1);
    expect(publishedEvents[0].type).toBe('test-event');
  });
});
```

This comprehensive testing setup provides robust validation for all Writerr Platform functionality while maintaining developer productivity and code quality standards.