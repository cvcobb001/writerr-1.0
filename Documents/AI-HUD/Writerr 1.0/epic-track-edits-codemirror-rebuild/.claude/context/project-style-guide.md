---
created: 2025-08-21T12:06:01Z
last_updated: 2025-08-21T12:06:01Z
version: 1.0
author: Claude Code PM System
---

# Project Style Guide

## Coding Standards

### Shell Script Conventions
- **Shebang**: Always use `#!/bin/bash` for consistency
- **Error Handling**: Use `set -e` for fail-fast behavior
- **Variable Naming**: lowercase_with_underscores for local variables
- **Constants**: UPPERCASE_WITH_UNDERSCORES for environment variables
- **Functions**: descriptive_names that indicate purpose
- **Comments**: Brief header comments explaining script purpose

### Markdown Documentation Standards
- **Frontmatter**: Required YAML frontmatter with created/updated timestamps
- **Headings**: Use descriptive, hierarchical heading structure
- **Code Blocks**: Always specify language for syntax highlighting
- **Links**: Use relative paths for internal documentation links
- **Lists**: Consistent bullet point style with proper nesting
- **Tables**: Include headers and maintain alignment

### File Structure Patterns
- **Directory Names**: lowercase-with-hyphens for readability
- **File Names**: descriptive-kebab-case.md for documentation
- **Script Names**: action-object.sh pattern (e.g., epic-show.sh)
- **Temporary Files**: Use .tmp extension and clean up after use

## Documentation Conventions

### Frontmatter Standards
```yaml
---
created: YYYY-MM-DDTHH:MM:SSZ    # ISO 8601 UTC timestamp
last_updated: YYYY-MM-DDTHH:MM:SSZ
version: X.Y                     # Semantic versioning
author: Claude Code PM System    # Consistent authorship
---
```

### Content Organization
- **Purpose Statement**: First paragraph explains what the document covers
- **Logical Hierarchy**: Information flows from general to specific
- **Cross-References**: Link to related documents with descriptive text
- **Examples**: Include practical examples for complex concepts
- **Status Indicators**: Use checkboxes and status emojis consistently

### Command Documentation Pattern
```markdown
### `/command:name` - Brief Description
- **Purpose**: What the command does
- **Usage**: `command:name [arguments]`
- **Example**: Practical example with expected output
- **Requirements**: Prerequisites or dependencies
- **Output**: What gets created or modified
```

## Naming Conventions

### Commands and Scripts
- **Format**: `category:action` or `category-action.sh`
- **Categories**: `pm`, `context`, `testing` (domain-based grouping)
- **Actions**: `create`, `show`, `list`, `edit`, `sync` (CRUD + sync operations)
- **Examples**: `/pm:prd-new`, `epic-decompose.sh`, `/context:create`

### File and Directory Names
- **PRD Files**: `[feature-name].md` (kebab-case, descriptive)
- **Epic Directories**: `[feature-name]/` (matches PRD name)
- **Context Files**: `project-[aspect].md` (project prefix for organization)
- **Task Files**: `[issue-number].md` after GitHub sync, `[001-999].md` before

### Labels and Tags
- **Epic Labels**: `epic:[feature-name]` (consistent epic identification)
- **Task Labels**: `task:[feature-name]` (task grouping under epic)
- **Status Labels**: `status:planning`, `status:in-progress`, `status:review`, `status:done`
- **Priority Labels**: `priority:high`, `priority:medium`, `priority:low`

## Comment and Description Style

### Inline Comments
- **Purpose Focus**: Explain why, not what
- **Concise Language**: One line when possible
- **Context Clues**: Reference related files or concepts
- **Decision Rationale**: Document non-obvious choices

### Commit Message Style
- **Format**: `type(scope): brief description`
- **Types**: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`
- **Scope**: Component being modified (`pm`, `context`, `epic`)
- **Description**: Imperative mood, under 50 characters
- **Body**: Detailed explanation if needed (wrap at 72 characters)

### Issue and PR Descriptions
- **Summary**: One-sentence description of what's being accomplished
- **Context**: Why this work is needed (link to PRD/epic if applicable)
- **Approach**: High-level technical approach or methodology
- **Testing**: How changes will be verified
- **Acceptance Criteria**: Specific outcomes that define completion

## Error Handling Patterns

### Script Error Messages
- **Context**: Include relevant file paths and command arguments
- **Guidance**: Suggest specific remediation steps
- **Format**: `❌ Error: [description]. Try: [suggested fix]`
- **Exit Codes**: Use appropriate exit codes (1 for errors, 2 for usage errors)

### Validation Messages
- **Success**: `✅ [action] completed successfully`
- **Warning**: `⚠️ Warning: [issue] - continuing`
- **Information**: `ℹ️ Info: [status update]`
- **Instructions**: `📋 Next: [recommended action]`

## Quality Standards

### Code Review Checklist
- **Functionality**: Does it solve the stated problem?
- **Standards Compliance**: Follows naming and structure conventions?
- **Error Handling**: Appropriate error cases covered?
- **Documentation**: Inline and external docs updated?
- **Testing**: Can the changes be verified?

### Documentation Review Points
- **Accuracy**: Information reflects current system state?
- **Completeness**: All necessary information included?
- **Clarity**: Understandable by target audience?
- **Consistency**: Matches established style and patterns?
- **Currency**: Timestamps and version info current?

### Integration Guidelines
- **Backward Compatibility**: Changes don't break existing workflows
- **GitHub Standards**: Uses official APIs and established patterns
- **Local-First**: Operations work offline when possible
- **Team Friendly**: Multiple humans can collaborate on same project
- **Extension Ready**: New commands can be added without refactoring

## Maintenance Practices

### Regular Updates
- **Context Refresh**: Update context files when project state changes significantly
- **Documentation Sync**: Keep README and command docs in sync with implementation
- **Version Bumps**: Increment version numbers when making breaking changes
- **Cleanup**: Remove obsolete files and update references

### Consistency Checks
- **Link Validation**: Ensure all internal links work correctly
- **Format Standards**: Regular passes to ensure style compliance
- **Command Testing**: Verify all documented commands work as described
- **Example Updates**: Keep examples current with latest system state