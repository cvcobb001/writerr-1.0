# Track Edits Plugin - Task Completion Workflow

## When a Task is Completed

### 1. Run Tests
```bash
# Run all tests to ensure no regressions
npx jest

# Run with coverage to verify test completeness
npx jest --coverage

# Run specific test suites if focused changes
npx jest src/__tests__/enhanced-edit-change.test.ts
npx jest src/__tests__/validation-integration.test.ts
```

### 2. Build Verification
```bash
# Verify TypeScript compilation
npm run build
# or if no npm scripts, check main.js is generated properly

# Verify no TypeScript errors
tsc --noEmit  # if tsconfig.json exists
```

### 3. Integration Testing
- Test plugin loading in Obsidian
- Verify all features work as expected
- Test backward compatibility with existing data
- Validate performance with typical usage

### 4. Code Quality Checks
```bash
# Format code (if configured)
npm run format

# Lint code (if configured) 
npm run lint

# Check for security issues
npm audit  # if package.json exists
```

### 5. Documentation Updates
- Update README.md if user-facing changes
- Update inline documentation/comments
- Update memory files if architecture changes
- Update task tracking files (tasks.md)

### 6. Version Control
```bash
# Stage changes
git add .

# Commit with descriptive message
git commit -m "feat: implement enhanced change attribution system"

# Push changes
git push origin main
```

### 7. Validation Checklist
- [ ] All tests pass
- [ ] Build succeeds
- [ ] No TypeScript errors
- [ ] Plugin loads in Obsidian
- [ ] Core functionality works
- [ ] Backward compatibility maintained
- [ ] Performance acceptable
- [ ] Documentation updated