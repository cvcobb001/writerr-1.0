---
created: 2025-08-21T12:06:01Z
last_updated: 2025-08-21T12:06:01Z
version: 1.0
author: Claude Code PM System
---

# Project Structure

## Root Directory Layout

```
ccpm/
├── .claude/                    # Claude Code system directory
│   ├── agents/                 # Task-oriented agents
│   ├── commands/               # Command definitions
│   │   ├── context/            # Context management commands
│   │   ├── pm/                 # Project management commands
│   │   └── testing/            # Test-related commands
│   ├── context/                # Project-wide context files
│   │   └── README.md          # Context system documentation
│   ├── epics/                  # PM's local workspace (gitignored)
│   ├── prds/                   # Product Requirements Documents
│   ├── rules/                  # Rule files for reference
│   └── scripts/                # Executable scripts
│       ├── pm/                 # PM workflow scripts
│       └── test-and-log.sh     # Test execution script
├── AGENTS.md                   # Agent documentation
├── CLAUDE.md                   # Project-specific Claude instructions
├── COMMANDS.md                 # Command reference documentation
├── LICENSE                     # MIT license
├── README.md                   # Main project documentation
└── screenshot.webp             # Visual demonstration
```

## Key Directories

### `.claude/` System Directory
- **Purpose**: Contains all Claude Code PM system files
- **Organization**: Modular structure with clear separation of concerns
- **Key Components**:
  - `agents/`: Specialized agents for different tasks
  - `commands/`: Command definitions organized by domain
  - `context/`: Project context preservation
  - `scripts/`: Shell scripts for automation

### `.claude/scripts/pm/` PM Scripts
Contains 15+ shell scripts for project management workflow:
- `init.sh`: System initialization
- `prd-*.sh`: PRD management scripts
- `epic-*.sh`: Epic workflow scripts
- `status.sh`: Project status reporting
- `next.sh`: Next task prioritization

### Context Organization
- **Global Context**: `.claude/context/` for project-wide information
- **Epic Context**: `.claude/epics/[epic-name]/` for feature-specific work
- **Task Context**: Individual `.md` files for granular tracking

## File Naming Conventions

### PRD Files
- Format: `[feature-name].md`
- Location: `.claude/prds/`
- Example: `memory-system.md`

### Epic Files
- Directory: `.claude/epics/[epic-name]/`
- Main file: `epic.md`
- Tasks: Initially `001.md`, `002.md`, etc.
- Post-sync: `[issue-id].md`

### Context Files
- Descriptive names: `project-structure.md`, `tech-context.md`
- Consistent frontmatter with creation/update timestamps
- Markdown format for readability

## Architecture Principles

### Modular Design
- Clear separation between documentation, execution, and tracking
- Commands organized by functional domain
- Reusable scripts for common operations

### Local-First Approach
- All work begins locally for speed
- Explicit synchronization with GitHub
- Offline capability maintained

### Context Preservation
- Persistent state across sessions
- Hierarchical context (project → epic → task)
- Automated context loading for agents