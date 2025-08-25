# Plugin Registry System

The Plugin Registry System provides comprehensive plugin management capabilities for the Writerr plugin suite, including dynamic plugin registration, service discovery, dependency resolution, and lifecycle management.

## Core Components

### PluginManager
The main orchestrator that combines all plugin management functionality:

```typescript
import { PluginManager } from './registry';

const manager = new PluginManager({
  autoLoad: true,
  enableVersionChecking: true,
  enableServiceDiscovery: true,
  enableDependencyResolution: true
});
```

### Key Features

- **Plugin Lifecycle Management**: Load, unload, enable, disable plugins
- **Dependency Resolution**: Automatic dependency checking and load ordering
- **Version Compatibility**: Semantic version checking for plugins and dependencies
- **Service Discovery**: API exposure and cross-plugin communication
- **Event System**: Comprehensive event emission for monitoring

## Usage Examples

### Basic Plugin Registration

```typescript
import { PluginManager, PluginUtils, PluginCapabilityCategory } from './registry';

// Create plugin metadata
const metadata = PluginUtils.createPluginMetadata({
  id: 'my-plugin',
  name: 'My Plugin',
  version: '1.0.0',
  dependencies: [
    PluginUtils.createDependency('core-plugin', '^1.0.0')
  ]
});

// Create capabilities
const capabilities = [
  PluginUtils.createCapability({
    id: 'my-plugin:tracking',
    name: 'Change Tracking',
    version: '1.0.0',
    category: PluginCapabilityCategory.TRACKING
  })
];

// Load plugin
await manager.loadPlugin(metadata, capabilities, pluginInstance);
```

### Using Plugin Factory

```typescript
import { PluginFactory } from './registry';

// Create a standard tracking plugin definition
const definition = PluginFactory.createTrackingPluginDefinition({
  id: 'track-edits',
  name: 'Track Edits Plugin',
  version: '1.0.0',
  description: 'Tracks document changes in real-time'
});

// Generate metadata and capabilities
const { metadata, capabilities } = PluginFactory.createPluginPackage(definition);

// Load the plugin
await manager.loadPlugin(metadata, capabilities, pluginInstance);
```

### Service Discovery and API Calls

```typescript
// Discover services
const trackingServices = manager.discoverServices({
  category: 'tracking',
  method: 'startTracking'
});

// Call a service method
const result = await manager.callService(
  'track-edits',
  'track-edits:tracking',
  'TrackingAPI',
  'startTracking',
  '/path/to/document',
  { realTime: true }
);

// Subscribe to service events
const unsubscribe = manager.subscribeToServiceEvent(
  'track-edits',
  'track-edits:tracking', 
  'TrackingAPI',
  'change:detected',
  (changeData) => {
    console.log('Change detected:', changeData);
  }
);
```

### Dependency Management

```typescript
// Load multiple plugins with automatic dependency resolution
const pluginDataList = [
  { metadata: coreMetadata, capabilities: coreCapabilities, instance: coreInstance },
  { metadata: trackingMetadata, capabilities: trackingCapabilities, instance: trackingInstance },
  { metadata: aiMetadata, capabilities: aiCapabilities, instance: aiInstance }
];

const resolution = await manager.loadPlugins(pluginDataList);

if (resolution.missing.length > 0) {
  console.error('Missing dependencies:', resolution.missing);
}

if (resolution.circular.length > 0) {
  console.error('Circular dependencies detected:', resolution.circular);
}

// Plugins loaded in correct dependency order: resolution.loadOrder
```

### Plugin Health Monitoring

```typescript
// Get plugin health status
const health = manager.getPluginHealth();
console.log(`${health.enabledPlugins}/${health.totalPlugins} plugins enabled`);

if (health.errorPlugins > 0) {
  console.error('Plugin errors:', health.errors);
}

// Listen for plugin events
manager.on('plugin:loaded', (pluginId) => {
  console.log(`Plugin loaded: ${pluginId}`);
});

manager.on('plugin:error', (pluginId, error) => {
  console.error(`Plugin ${pluginId} error:`, error);
});

manager.on('service:call:success', (event) => {
  console.log(`API call successful: ${event.service.apiName}.${event.method}`);
});
```

## Plugin Implementation Guidelines

### Plugin Instance Requirements

Your plugin instance should implement the methods defined in its API exposures:

```typescript
class MyTrackingPlugin {
  async startTracking(documentPath: string, options?: TrackingOptions): Promise<void> {
    // Implementation
  }

  async stopTracking(documentPath: string): Promise<void> {
    // Implementation
  }

  async getChanges(documentPath: string, since?: Date): Promise<Change[]> {
    // Implementation
  }
}
```

### Event Emission

Plugins can emit events through the service discovery system:

```typescript
// In your plugin
manager.serviceDiscovery.emitServiceEvent(
  'my-plugin',
  'my-plugin:tracking',
  'TrackingAPI',
  'change:detected',
  { changeData: 'some change information' }
);
```

## Error Handling

The system provides comprehensive error handling:

- **Version Conflicts**: Detected and reported with suggested resolutions
- **Missing Dependencies**: Listed with clear error messages  
- **Circular Dependencies**: Detected and prevented
- **API Call Failures**: Logged with detailed context
- **Plugin Load Failures**: Captured with error state management

## Configuration Options

```typescript
interface PluginManagerConfig {
  autoLoad?: boolean;              // Auto-enable plugins after registration
  enableVersionChecking?: boolean; // Perform version compatibility checks
  allowOptionalDependencies?: boolean; // Allow optional dependencies to be missing
  maxRetries?: number;             // Max retry attempts for failed operations
  retryDelay?: number;            // Delay between retries (ms)
  enableServiceDiscovery?: boolean; // Enable service discovery features
  enableDependencyResolution?: boolean; // Enable dependency resolution
  autoResolveConflicts?: boolean;  // Attempt automatic conflict resolution
}
```

This system provides a robust foundation for managing complex plugin ecosystems with proper separation of concerns, error handling, and extensibility.