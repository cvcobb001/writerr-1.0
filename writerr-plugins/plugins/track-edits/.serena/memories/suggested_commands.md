# Track Edits Plugin - Development Commands

## Testing Commands
```bash
# Run all tests
npm test
# or if using yarn
yarn test
# or direct Jest
npx jest

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npx jest src/__tests__/enhanced-edit-change.test.ts

# Run integration tests
npx jest --testNamePattern="integration"
```

## Build Commands
```bash
# Build the plugin (JavaScript compilation)
npm run build
# or
yarn build

# Development build with watch mode
npm run dev
# or
yarn dev
```

## Development Workflow
```bash
# Install dependencies (if package.json exists)
npm install
# or
yarn install

# Start development with auto-reload
npm run dev

# Format code (if formatter configured)
npm run format

# Lint code (if linter configured)
npm run lint
```

## Obsidian Development
```bash
# Link plugin to Obsidian vault for testing
ln -s /path/to/track-edits ~/.obsidian/plugins/track-edits

# Enable hot reload in Obsidian
# Use Community Plugin: Hot Reload Plugin
```

## System Commands (macOS/Darwin)
```bash
# Find files
find . -name "*.ts" -type f
mdfind -name "filename"

# Search in files
grep -r "pattern" src/
rg "pattern" src/

# List directory contents
ls -la
ls -R  # recursive

# Git operations
git status
git add .
git commit -m "message"
git push origin main
```