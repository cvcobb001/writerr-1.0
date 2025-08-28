# TypeScript/JavaScript Style Guide

## Language Preferences

- **Primary Language**: TypeScript with strict configuration
- **Target**: ES2018+ for compatibility with Electron-based platforms
- **Module System**: CommonJS for plugin environments, ES modules for modern environments
- **Type Checking**: Strict mode with all TypeScript checks enabled

## Code Structure

### Function Definitions
```typescript
// Prefer arrow functions for short operations
const calculateTokens = (text: string): number => text.length / 4;

// Use function declarations for main methods with complex logic
async function processMessage(message: ChatMessage): Promise<void> {
  // Implementation
}

// Always include explicit return types
private createComponent(): HTMLElement {
  return this.createElement('div', { cls: 'component' });
}
```

### Interface Definitions
```typescript
// Use interfaces for object shapes
interface ChatMessage {
  readonly id: string;
  readonly role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

// Prefer interfaces over type aliases for extensibility
interface BaseComponent {
  container: HTMLElement;
  plugin: Plugin;
  render(): void;
  destroy(): void;
}
```

### Class Structure
```typescript
export class ComponentName extends BaseComponent {
  // Public properties first
  public readonly type: string = 'component';
  
  // Private properties with underscore prefix
  private _isActive: boolean = false;
  private _eventListeners: Map<string, EventListener> = new Map();

  // Constructor with explicit parameter types
  constructor(options: ComponentOptions) {
    super(options);
    this.initialize();
  }

  // Public methods
  public async performAction(data: ActionData): Promise<ActionResult> {
    // Implementation
  }

  // Private methods
  private initialize(): void {
    // Implementation
  }
}
```

### Error Handling
```typescript
// Use try-catch for async operations
async function apiCall(): Promise<ApiResponse> {
  try {
    const response = await fetch(url);
    return await response.json();
  } catch (error) {
    console.error('API call failed:', error);
    throw new Error(`Failed to fetch data: ${error.message}`);
  }
}

// Use circuit breaker pattern for critical operations
private async safeOperation(): Promise<void> {
  if (this.circuitBreaker.isOpen()) {
    throw new Error('Circuit breaker is open');
  }
  
  try {
    await this.riskyOperation();
    this.circuitBreaker.recordSuccess();
  } catch (error) {
    this.circuitBreaker.recordFailure();
    throw error;
  }
}
```

### Event Handling
```typescript
// Use proper event listener cleanup
class EventManager {
  private listeners: Map<string, EventListener> = new Map();

  public addEventListener(event: string, handler: EventListener): void {
    this.removeEventListener(event); // Prevent duplicates
    this.listeners.set(event, handler);
    document.addEventListener(event, handler);
  }

  public removeEventListener(event: string): void {
    const handler = this.listeners.get(event);
    if (handler) {
      document.removeEventListener(event, handler);
      this.listeners.delete(event);
    }
  }

  public destroy(): void {
    for (const [event, handler] of this.listeners) {
      document.removeEventListener(event, handler);
    }
    this.listeners.clear();
  }
}
```

### Async/Await Patterns
```typescript
// Chain async operations properly
async function processWorkflow(): Promise<WorkflowResult> {
  const step1 = await performStep1();
  const step2 = await performStep2(step1);
  const step3 = await performStep3(step2);
  
  return {
    success: true,
    result: step3
  };
}

// Handle parallel operations
async function loadMultipleResources(): Promise<ResourceData[]> {
  const promises = urls.map(url => fetchResource(url));
  return Promise.all(promises);
}
```

### Object and Array Manipulation
```typescript
// Use destructuring for object properties
function processOptions({ timeout = 5000, retries = 3, debug = false }: ProcessOptions): void {
  // Implementation
}

// Use spread operator for immutable updates
const updatedState = {
  ...currentState,
  isLoading: false,
  data: newData
};

// Use array methods instead of loops
const activeMessages = messages
  .filter(msg => msg.isActive)
  .map(msg => transformMessage(msg))
  .sort((a, b) => b.timestamp - a.timestamp);
```

### Type Guards and Narrowing
```typescript
// Use type guards for runtime type checking
function isValidMessage(obj: unknown): obj is ChatMessage {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'role' in obj &&
    'content' in obj
  );
}

// Use assertion functions for validation
function assertValidConfig(config: unknown): asserts config is PluginConfig {
  if (!isValidConfig(config)) {
    throw new Error('Invalid configuration provided');
  }
}
```

### Import/Export Patterns
```typescript
// Use explicit imports
import { ChatMessage, ChatSession } from '@shared/types';
import type { PluginSettings } from './settings';

// Group imports by source
import { Plugin, Notice } from 'obsidian';
import { generateId } from '@shared/utils';
import { BaseComponent } from './components/BaseComponent';
import type { ComponentOptions } from './types';

// Use named exports for utilities
export const utils = {
  generateId,
  formatTimestamp,
  sanitizeInput
};

// Use default exports for main classes
export default class WriterrlChatPlugin extends Plugin {
  // Implementation
}
```

### Performance Considerations
```typescript
// Use debouncing for frequent operations
const debouncedUpdate = debounce(updateUI, 250);

// Lazy load heavy dependencies
async function loadHeavyFeature(): Promise<HeavyFeature> {
  const { HeavyFeature } = await import('./heavy-feature');
  return new HeavyFeature();
}

// Use memoization for expensive calculations
const memoizedCalculation = useMemo(() => {
  return expensiveCalculation(data);
}, [data]);
```

## Plugin-Specific Patterns

### Component Lifecycle
```typescript
abstract class BaseComponent {
  public async render(): Promise<void> {
    this.createElements();
    this.setupEventListeners();
    this.applyStyles();
  }

  public destroy(): void {
    this.removeEventListeners();
    this.cleanupResources();
    this.container.remove();
  }

  protected abstract createElements(): void;
  protected abstract setupEventListeners(): void;
}
```

### Settings Management
```typescript
interface PluginSettings {
  readonly version: string;
  enableFeature: boolean;
  apiEndpoint: string;
  timeout: number;
}

const DEFAULT_SETTINGS: PluginSettings = {
  version: '1.0.0',
  enableFeature: true,
  apiEndpoint: 'https://api.example.com',
  timeout: 5000
};

async function loadSettings(): Promise<PluginSettings> {
  const data = await this.loadData();
  return Object.assign({}, DEFAULT_SETTINGS, data);
}
```

### Cross-Plugin Communication
```typescript
// Use global API pattern
declare global {
  interface Window {
    WritterrAPI?: WritterrGlobalAPI;
  }
}

// Register plugin capabilities
function registerPluginAPI(): void {
  if (!window.WritterrAPI) {
    window.WritterrAPI = {};
  }
  
  window.WritterrAPI.chat = {
    sendMessage: this.sendMessage.bind(this),
    getCurrentSession: () => this.currentSession
  };
}
```

## Best Practices Summary

1. **Always use TypeScript** with strict configuration
2. **Explicit types** for all function parameters and return values
3. **Proper error handling** with try-catch and circuit breakers
4. **Resource cleanup** in destroy methods
5. **Immutable patterns** for state updates
6. **Debouncing/throttling** for performance
7. **Type guards** for runtime safety
8. **Consistent naming** following camelCase conventions
9. **JSDoc comments** for public APIs
10. **Separation of concerns** in component architecture