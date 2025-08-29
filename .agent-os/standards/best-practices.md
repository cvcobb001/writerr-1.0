# Development Best Practices

## Context

Global development guidelines for Agent OS projects with focus on reliable execution, efficient communication, and production-ready architecture.

<conditional-block context-check="core-principles">
IF this Core Principles section already read in current context:
  SKIP: Re-reading this section
  NOTE: "Using Core Principles already in context"
ELSE:
  READ: The following principles

## Core Principles

### Agent Accountability & Clear Communication
- **Always disclose when mocking vs. executing**: Use precise language
  - ✅ "I am executing..." (when actually doing)
  - ✅ "I would need to..." (when lacking capability)  
  - ✅ "I cannot do X, but I can simulate..." (when mocking)
  - ❌ Never fake operations without explicit disclosure
- **Show real results**: Verify operations with actual outputs, not examples
- **Lead with results**: What changed, what works, what needs decisions
- **Efficient communication**: Maximum information density, minimum token waste

### Real Architecture with Separated Mock Data
- **Build real operations always**: Every function performs actual work
- **Separate mock data**: Dedicated files/services, never hardcoded in business logic
- **Swappable data sources**: Easy to replace mock with real via dependency injection
- **Interface-driven design**: Same interface for mock and real implementations
- **No refactoring required**: Just change data source injection

### Keep It Simple
- Implement code in the fewest lines possible
- Avoid over-engineering solutions
- Choose straightforward approaches over clever ones

### Optimize for Readability
- Prioritize code clarity over micro-optimizations
- Write self-documenting code with clear variable names
- Add comments for "why" not "what"

### DRY (Don't Repeat Yourself)
- Extract repeated business logic to private methods
- Extract repeated UI markup to reusable components
- Create utility functions for common operations

### File Structure
- Keep files focused on a single responsibility
- Group related functionality together
- Use consistent naming conventions
</conditional-block>

## Agent OS Workflow Standards

### Serena MCP Integration (Required)
- **Use Serena for all code analysis and editing** instead of grep/regex
- **Semantic understanding**: Find symbols, relationships, references
- **Memory system**: Capture project patterns and architectural decisions
- **Symbol-level editing**: Precise modifications at function/class level
- **Context-efficient**: Read only necessary code sections

### Multi-Agent Coordination
- **Leverage subagents** for specialized tasks (code analysis, file operations)
- **Report back summaries**: Let agents handle details, surface key findings
- **No black boxes**: Always surface critical findings or blockers
- **Clear handoffs**: Specify exactly what subagent should accomplish
- **Report format**: "Found X, blocked by Y, need decision on Z"
- **Surface key findings**, not process details
- **Flag decisions** with 🚩 prefix for immediate attention

### Verification Strategy (Smart Balance)
- **Critical operations only**: Verify major changes, before commits
- **Skip micro-verifications**: Don't verify every small change
- **End-of-session verification**: Final check before commit
- **Real command outputs**: Show actual results when verification is needed

### Git Flow (Session-Based)
- **One commit per work session**: Not micro-commits for every change
- **Always verify before commit**: Check `git status`, test functionality
- **Test builds/functionality**: Ensure changes actually work
- **Conventional commit messages**: Clear, descriptive commit messages
- **Show actual git command outputs**: Never simulate git operations

<conditional-block context-check="architecture-patterns" task-condition="plugin-development">
IF current task involves plugin development:
  IF Architecture Patterns section already read in current context:
    SKIP: Re-reading this section
    NOTE: "Using Architecture Patterns already in context"
  ELSE:
    READ: The following patterns

## Plugin Architecture Patterns

### Component-Based Design
- **BaseComponent pattern**: All UI components extend base class with lifecycle
- **Lifecycle management**: render(), destroy(), proper cleanup
- **Event handling**: Centralized event listener management with cleanup
- **Resource management**: Always clean up resources in destroy methods

### Cross-Plugin Communication
- **Global API registry**: Use `window.PluginName` for public APIs
- **Event bus pattern**: Centralized event system with circuit breaker
- **Interface definitions**: Clear contracts between plugins
- **Adapter pattern**: Pluggable integrations between different systems

### Settings and Configuration
- **Default settings pattern**: Always provide complete defaults
- **Type-safe settings**: Use TypeScript interfaces for all settings
- **Migration support**: Handle settings version changes gracefully
- **Validation**: Validate settings on load with proper error handling

### Error Handling and Resilience
- **Circuit breaker pattern**: Prevent cascading failures
- **Graceful degradation**: Continue working when non-critical features fail
- **Comprehensive logging**: Log errors with context for debugging
- **User-friendly error messages**: Translate technical errors to user language

### Performance Considerations
- **Debouncing**: Use for frequent operations (user input, API calls)
- **Lazy loading**: Load heavy features only when needed
- **Memory management**: Clean up event listeners, observers, timers
- **Bundle optimization**: Separate bundles for each plugin
</conditional-block>

<conditional-block context-check="dependencies" task-condition="choosing-external-library">
IF current task involves choosing an external library:
  IF Dependencies section already read in current context:
    SKIP: Re-reading this section
    NOTE: "Using Dependencies guidelines already in context"
  ELSE:
    READ: The following guidelines
ELSE:
  SKIP: Dependencies section not relevant to current task

## Dependencies

### Choose Libraries Wisely
When adding third-party dependencies:
- Select the most popular and actively maintained option
- Check the library's GitHub repository for:
  - Recent commits (within last 6 months)
  - Active issue resolution
  - Number of stars/downloads
  - Clear documentation
- **Platform compatibility**: Ensure compatibility with target platform (Electron, Node.js versions)
- **Bundle size impact**: Consider build size implications
- **Type definitions**: Prefer libraries with TypeScript support
</conditional-block>

## Mock vs. Real Data Architecture

### ✅ Correct Approach: Separated Mock Layer
```typescript
// Separate mock data
const MOCK_USERS = [
  { id: "1", name: "Test User", role: "admin" }
];

// Real service operations
class UserService {
  constructor(private dataSource: UserDataSource) {}
  
  async getUsers(): Promise<User[]> {
    return this.dataSource.getUsers(); // Real operation
  }
  
  async createUser(userData: CreateUserRequest): Promise<User> {
    return this.dataSource.createUser(userData); // Real operation
  }
}

// Swappable implementations
const userService = new UserService(
  isDevelopment 
    ? new MockUserDataSource(MOCK_USERS)
    : new APIUserDataSource(apiConfig)
);
```

### ❌ Wrong Approach: Hardcoded Mock Data
```typescript
// NEVER DO THIS - Mock data embedded in business logic
async function getUsers(): Promise<User[]> {
  return [
    { id: "1", name: "Hardcoded User" }, // Embedded in logic!
    { id: "2", name: "Another Fake User" }
  ];
}
```

### Mock Data Best Practices
- **Dedicated mock files**: Keep all mock data in separate modules
- **Realistic data structure**: Mock data should match real API responses exactly
- **Easy swapping**: Change one line to switch from mock to real
- **No refactoring required**: Business logic never changes when swapping data sources
- **Interface consistency**: Mock and real implementations use identical interfaces

## Communication Efficiency

### Concise Status Reporting
```
✅ Good: "Updated 3 files: auth.ts, types.ts, mock-data.ts. JWT working, need decision on refresh token storage."

❌ Verbose: "I am now beginning the comprehensive process of analyzing the authentication system architecture. First, I will carefully examine..."
```

### Decision Point Clarity
- **Flag decisions clearly**: Use 🚩 or "Decision needed:" prefix
- **Provide context**: Brief background, 2-3 options, recommendation
- **Ask specific questions**: "Use JWT or sessions?" not "What should we do?"

### Progress Indicators
- 🔧 **Working on**: Currently in progress
- ✅ **Complete**: Finished and verified
- ⚠️ **Blocked**: Waiting for decision/input
- 🧪 **Testing**: Needs verification
- 📋 **Next**: Upcoming task

### Multi-Agent Efficiency
- **Clear delegation**: "Agent X: analyze authentication patterns in codebase"  
- **Summary reporting**: Agents report back key findings, not full process
- **Decision escalation**: Surface choices that need human input
- **Context sharing**: Use Serena memory to avoid re-explaining project context

## Memory and Learning

### Serena Memory Usage (Required)
- **Capture architectural decisions**: Document why certain patterns were chosen
- **Record project conventions**: Naming patterns, code organization
- **Store integration patterns**: How plugins communicate, share data
- **Document lessons learned**: What worked, what didn't, why
- **Use descriptive names**: project_architecture.md, ui_patterns.md, integration_notes.md
- **Update existing memories** rather than creating duplicates

### Memory Structure
```
project_architecture.md - Overall system design decisions
code_patterns.md - Coding conventions and patterns used
integration_notes.md - How different components work together
lessons_learned.md - What to avoid, what works well
```

### Knowledge Continuity
- **Start sessions by reading relevant memories**
- **Update memories when learning new patterns**
- **Reference memories when making similar decisions**
- **Keep memories current as project evolves**

## Session Management

### Start of Session
1. **Read relevant Serena memories** for project context
2. **Understand current state** without re-analyzing everything
3. **Clarify session goals** with user
4. **Plan approach** using established patterns

### During Session
- **Use established patterns** from memory/standards
- **Build incrementally** with frequent small progress reports
- **Flag decisions immediately** when user input needed
- **Maintain focus** on session objectives

### End of Session
1. **Verify all changes** work as expected
2. **Test critical functionality** if changed
3. **Commit with clear message** describing what was accomplished
4. **Update Serena memories** with new learnings/patterns
5. **Brief summary** of what was completed and what's next

This approach ensures reliable execution, efficient communication, and continuous learning while building production-ready systems with proper architecture from day one.