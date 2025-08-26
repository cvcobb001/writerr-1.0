# Writerr 1.0 Code Style & Conventions

## TypeScript Standards

### Strict Configuration
- **Strict Mode**: All TypeScript strict options enabled
- **No Implicit Any**: All variables must have explicit types
- **Strict Null Checks**: Null and undefined must be handled explicitly
- **No Unused Locals/Parameters**: Clean code with no unused variables
- **Exact Optional Properties**: Precise type definitions

### Type Definitions
- **Interfaces**: Prefer interfaces for object shapes
- **Type Annotations**: Explicit return types for public methods
- **Generics**: Use type parameters for reusable components
- **Union Types**: Precise type unions where applicable

## File Organization

### Directory Structure
```
plugins/[plugin-name]/
├── src/
│   ├── main.ts           # Plugin entry point
│   ├── components/       # UI components
│   ├── utils/           # Utility functions
│   └── types/           # Type definitions
├── manifest.json        # Plugin manifest
└── README.md           # Plugin documentation
```

### Naming Conventions
- **Files**: camelCase for TypeScript files (e.g., `editTracker.ts`)
- **Directories**: kebab-case for folders (e.g., `ai-editorial-functions`)
- **Classes**: PascalCase (e.g., `TrackEditsPlugin`)
- **Methods/Variables**: camelCase (e.g., `getCurrentState`)
- **Constants**: SCREAMING_SNAKE_CASE (e.g., `DEFAULT_SETTINGS`)
- **Interfaces**: PascalCase, often with 'I' prefix or descriptive suffix (e.g., `TrackEditsSettings`)

## Code Patterns

### Plugin Architecture
- **Main Class**: Each plugin has a main class extending Obsidian's Plugin
- **Settings Interface**: Typed settings with defaults
- **State Management**: Centralized state management patterns
- **Event Handling**: Proper cleanup and event listener management

### Method Organization
```typescript
class PluginName extends Plugin {
  // 1. Properties and settings
  settings: PluginSettings;
  
  // 2. Lifecycle methods (onload, onunload)
  async onload() { ... }
  
  // 3. Public API methods
  public methodName() { ... }
  
  // 4. Private helper methods
  private helperMethod() { ... }
}
```

### Import/Export Style
- **Named Exports**: Prefer named exports over default exports
- **Path Aliases**: Use configured path aliases (@shared/, @track-edits/)
- **Explicit Imports**: Import only what's needed

## Documentation Standards

### Code Comments
- **Method Documentation**: JSDoc comments for public methods
- **Complex Logic**: Inline comments for non-obvious implementations
- **Architecture Notes**: Comments explaining design decisions
- **TODO/FIXME**: Clear markers for future improvements

### README Requirements
- **Plugin Purpose**: Clear description of plugin functionality
- **Installation**: Setup and configuration instructions
- **API Documentation**: Public interfaces and integration points
- **Usage Examples**: Common use cases and workflows

## Error Handling

### Patterns
- **Try/Catch**: Wrap potentially failing operations
- **Graceful Degradation**: Plugin should work even if features fail
- **User Feedback**: Clear error messages for users
- **Logging**: Consistent logging for debugging

### State Validation
- **Guard Clauses**: Early returns for invalid states
- **Type Guards**: Runtime type validation where needed
- **Null Checks**: Explicit handling of nullable values

## Performance Considerations

### Memory Management
- **Cleanup**: Proper disposal of resources in onunload
- **Event Listeners**: Remove listeners to prevent leaks
- **DOM References**: Clear references to prevent retention
- **Intervals/Timeouts**: Clear timers on plugin disable

### Optimization
- **Debouncing**: Use debouncing for frequent operations
- **Lazy Loading**: Load heavy components only when needed
- **Batch Operations**: Group related operations for efficiency

## Integration Standards

### Cross-Plugin Communication
- **Events**: Use Obsidian's event system for plugin communication
- **Shared APIs**: Well-defined interfaces for plugin integration
- **State Isolation**: Plugins maintain their own state boundaries
- **Graceful Fallbacks**: Work independently if other plugins unavailable