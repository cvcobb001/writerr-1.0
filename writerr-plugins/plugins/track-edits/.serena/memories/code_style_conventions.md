# Track Edits Plugin - Code Style & Conventions

## TypeScript Conventions
- **Interfaces**: PascalCase (e.g., `TrackEditsSettings`, `EditChange`)
- **Classes**: PascalCase (e.g., `TrackEditsPlugin`, `EditTracker`)
- **Functions**: camelCase (e.g., `createEditDecoration`, `getCurrentState`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `DEFAULT_SETTINGS`, `DEBUG_MODE`)
- **Variables**: camelCase (e.g., `currentPluginInstance`, `isRejectingEdit`)

## File Naming
- **Components**: kebab-case (e.g., `edit-tracker.ts`, `side-panel-view.ts`)
- **Tests**: `*.test.ts` or `*.spec.ts` suffix
- **Types**: Usually embedded in main files or in shared types
- **Utilities**: descriptive names (e.g., `sanitization-utils.ts`)

## Code Organization
- **Main plugin logic**: `src/main.ts`
- **Core functionality**: Individual TypeScript files in `src/`
- **UI Components**: `src/components/` and `src/ui/`
- **Queries**: `src/queries/`
- **Validation**: `src/validation/`
- **Tests**: `src/__tests__/`

## Import Conventions
- Obsidian imports first
- CodeMirror imports second
- Local imports last
- Destructured imports when possible
- Shared types from `../../../shared/types`

## Testing Patterns
- Jest test framework with ts-jest
- Test files co-located in `__tests__` directory
- Describe blocks for feature grouping
- Mock objects for complex dependencies
- Integration tests for workflows
- Unit tests for individual functions

## Documentation
- JSDoc comments for public APIs
- README.md with comprehensive user guide
- Type definitions serve as inline documentation
- Memory files for development context