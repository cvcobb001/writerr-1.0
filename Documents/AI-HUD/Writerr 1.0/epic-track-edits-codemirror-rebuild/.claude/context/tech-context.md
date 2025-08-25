---
created: 2025-08-21T12:06:01Z
last_updated: 2025-08-21T12:06:01Z
version: 1.0
author: Claude Code PM System
---

# Technical Context

## Primary Technologies

### Shell Scripting
- **Language**: Bash
- **Purpose**: Core automation and workflow orchestration
- **Location**: `.claude/scripts/pm/` directory
- **Scripts**: 15+ specialized PM workflow scripts

### GitHub Integration
- **GitHub CLI**: v2.76.2 (2025-07-30)
- **Extensions**: gh-sub-issue (installed) for parent-child issue relationships
- **Authentication**: Configured and active
- **Repository**: https://github.com/automazeio/ccpm.git

### Documentation System
- **Format**: Markdown
- **Organization**: Structured frontmatter with timestamps
- **Context System**: Hierarchical (project → epic → task)
- **Versioning**: Semantic versioning in frontmatter

## Development Environment

### Version Control
- **System**: Git
- **Current Branch**: main
- **Remote**: origin → https://github.com/automazeio/ccpm.git
- **Status**: Clean working directory

### File System
- **Platform**: macOS (Darwin 24.6.0)
- **Permissions**: Write access confirmed
- **Structure**: Standard Unix directory layout

### Claude Code Integration
- **Agent System**: Task-oriented specialization
- **Context Management**: Persistent state preservation
- **Command System**: Slash commands for workflow automation

## System Dependencies

### Required Tools
- ✅ **GitHub CLI (gh)**: Installed and authenticated
- ✅ **gh-sub-issue extension**: Installed for proper issue relationships
- ✅ **Git**: Repository management
- ✅ **Bash**: Script execution environment

### Optional Integrations
- **IDE Integration**: Compatible with any text editor
- **CI/CD**: GitHub Actions ready
- **Project Management**: GitHub Issues as database

## Architecture Patterns

### Command Pattern
- Discrete commands for each workflow step
- Consistent interface across all operations
- Composable command sequences

### Agent Pattern
- Specialized agents for different task types
- Context isolation and preservation
- Parallel execution capabilities

### Local-First Pattern
- All operations begin locally
- Explicit synchronization steps
- Offline-capable workflow

## Configuration

### GitHub Configuration
- Repository: automazeio/ccpm
- Issue tracking enabled
- Sub-issue relationships supported

### File Organization
- Context files: Timestamped and versioned
- Epic files: Feature-specific isolation
- Script files: Executable and documented

### Development Workflow
1. Local PRD creation
2. Epic planning and decomposition
3. GitHub synchronization
4. Parallel task execution
5. Progress tracking and updates