---
created: 2025-08-21T12:06:01Z
last_updated: 2025-08-21T12:06:01Z
version: 1.0
author: Claude Code PM System
---

# System Patterns

## Architectural Design Patterns

### Spec-Driven Development
- **Principle**: Every line of code traces back to a specification
- **Implementation**: PRD → Epic → Task → Code workflow
- **Benefits**: Eliminates "vibe coding" and maintains requirements traceability
- **Structure**: 5-phase discipline (Brainstorm → Document → Plan → Execute → Track)

### Command-Query Separation
- **Commands**: Actions that change state (create, sync, update)
- **Queries**: Information retrieval (show, status, list)
- **Implementation**: Distinct command categories in `.claude/commands/`
- **Pattern**: Clear separation of concerns in script design

### Local-First with Explicit Sync
- **Pattern**: All work begins and remains local until explicitly pushed
- **Benefits**: Speed, offline capability, deliberate synchronization
- **Implementation**: Local `.claude/` workspace with GitHub sync commands
- **Sync Points**: Epic creation, task updates, completion

## Workflow Patterns

### Phase-Gate Development
1. **Product Planning**: PRD creation through guided brainstorming
2. **Implementation Planning**: Technical epic with architectural decisions
3. **Task Decomposition**: Concrete, actionable tasks with acceptance criteria
4. **GitHub Synchronization**: Push structure to GitHub as issues
5. **Execution**: Specialized agents implement with progress tracking

### Parallel Execution Pattern
- **Issue Decomposition**: Single issues split into multiple work streams
- **Agent Specialization**: Different agents for UI, API, database work
- **Context Isolation**: Each agent maintains its own context bubble
- **Coordination**: Git commits and issue updates provide synchronization

### Context Preservation Pattern
- **Hierarchical Context**: Project → Epic → Task levels
- **Persistent State**: Context survives session boundaries
- **Automatic Loading**: Agents read relevant context on startup
- **Incremental Updates**: Context evolves with project state

## Data Flow Patterns

### Issue as Database
- **GitHub Issues**: Single source of truth for project state
- **Comments**: Progress updates and audit trail
- **Labels**: Organization and filtering mechanism
- **Relationships**: Parent-child via gh-sub-issue extension

### Document-Driven State
- **PRDs**: Product requirements and vision
- **Epics**: Implementation plans and technical decisions
- **Tasks**: Granular work items with acceptance criteria
- **Updates**: Progress tracking and status changes

### Bidirectional Sync
- **Local → GitHub**: Push structure and updates
- **GitHub → Local**: Import existing issues and updates
- **Conflict Resolution**: Local state takes precedence
- **Consistency**: Regular sync operations maintain alignment

## Quality Patterns

### Test-Driven Validation
- **Acceptance Criteria**: Each task includes testable outcomes
- **Progress Verification**: Updates require progress evidence
- **Completion Gates**: Tasks must meet criteria before closing

### Audit Trail Pattern
- **Full Traceability**: Decision points documented at each level
- **Change History**: All modifications tracked with timestamps
- **Stakeholder Visibility**: Progress visible to entire team
- **Rollback Capability**: Historical state can be reconstructed

### Error Recovery Pattern
- **Graceful Degradation**: System continues with partial functionality
- **State Validation**: Regular integrity checks
- **Self-Healing**: Automatic correction of common issues
- **User Guidance**: Clear error messages with recovery steps

## Integration Patterns

### Agent Orchestration
- **Main Thread**: Strategic oversight and coordination
- **Specialized Agents**: Domain-specific implementation
- **Context Handoffs**: Clean transfer of information
- **Result Aggregation**: Combined outputs into cohesive progress

### GitHub Native Integration
- **API-First**: Uses official GitHub CLI and extensions
- **Standard Workflows**: Compatible with existing team practices
- **No Vendor Lock-in**: Standard GitHub features only
- **Team Collaboration**: Multiple humans and AI agents can participate

### Extensibility Pattern
- **Plugin Architecture**: New commands can be added easily
- **Hook System**: Custom scripts at workflow transition points
- **Configuration**: Adaptable to different team preferences
- **Open Source**: Full visibility and modification capability