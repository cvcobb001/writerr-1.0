# Writerr 1.0 Development Guidelines

## MCP Tools Usage Rules

Always use:
- Serena for semantic code retrieval and editing tools
- context7 for up to date documentation on third party code
- sequential thinking for any decision making

#$ARGUMENTS

## Workflow Instructions

1. Read this claude.md file before doing anything
2. Use Serena to understand existing code patterns in the project
3. When making changes, follow the established architecture patterns
4. Before implementing complex features, think through the approach step by step

## Custom Commands

To use the enhanced workflow, type: `/go [your request]`

This triggers the full MCP stack to work together.

Example: `/go add OAuth authentication to the user login system`

## Project Context

## Executive Summary                                                    │ │
│ │                                                                         │ │
│ │ **Writerr Platform** is a professional AI editorial suite for Obsidian  │ │
│ │ that provides writers complete, granular control over AI-assisted       │ │
│ │ editing through a constraint-based processing architecture. The         │ │
│ │ platform consists of three tightly integrated plugins that work         │ │
│ │ together as a unified writing environment while maintaining clean       │ │
│ │ separation of concerns.                                                 │ │
│ │                                                                         │ │
│ │ ### Core Innovation                                                     │ │
│ │ **Editorial Engine Plugin** - A neutral constraint processing system    │ │
│ │ that compiles natural language editing preferences into programmatic    │ │
│ │ rulesets, providing enterprise-grade AI behavior control and routing    │ │
│ │ capabilities.                                                           │ │
│ │                                                                         │ │
│ │ ### Platform Vision                                                     │ │
│ │ Transform Obsidian into the professional AI writing platform by         │ │
│ │ providing infrastructure that any plugin can use for sophisticated AI   │ │
│ │ constraint management, while delivering a seamless user experience that │ │
│ │  feels like a single, cohesive application.                             │ │
│ │                                                

## Architecture Notes

## Architecture Overview                                                │ │
│ │                                                                         │ │
│ │ ### Three-Plugin Platform Architecture                                  │ │
│ │                                                                         │ │
│ │ ```                                                                     │ │
│ │ ┌─────────────────────┐    ┌──────────────────────┐                     │ │
│ │ ┌─────────────────────┐                                                 │ │
│ │ │   Writerr Chat      │    │  Editorial Engine    │    │   Track Edits  │ │
│ │       │                                                                 │ │
│ │ │   (User Interface)  │◄──►│  (Constraint Core)   │◄──►│  (Change       │ │
│ │ Display)   │                                                            │ │
│ │ │                     │    │                      │    │                │ │
│ │       │                                                                 │ │
│ │ │ • Natural language  │    │ • Constraint compiler│    │ • Visual diff  │ │
│ │ engine│                                                                 │ │
│ │ │ • Mode selection    │    │ • Rule enforcement   │    │ • Change       │ │
│ │ clustering  │                                                           │ │
│ │ │ • Context awareness │    │ • Engine routing     │    │ •              │ │
│ │ Accept/reject UI  │                                                     │ │
│ │ │ • Conversation flow │    │ • Adapter management │    │ • Session      │ │
│ │ tracking  │                                                             │ │
│ │ └─────────────────────┘    └──────────────────────┘                     │ │
│ │ └─────────────────────┘                                                 │ │
│ │ ```                                                                     │ │
│ │                                                                         │ │
│ │ ### Platform Integration Layer                                          │ │
│ │ ```typescript                                                           │ │
│ │ window.Writerr = {                                                      │ │
│ │   editorial: EditorialEngineAPI,     // Core constraint processing      │ │
│ │   chat: WritterrChatAPI,            // Natural language interface       │ │
│ │   trackEdits: TrackEditsAPI,        // Change management                │ │
│ │   events: WritterrEventBus,         // Cross-plugin coordination        │ │
│ │   settings: WritterrSettingsManager // Unified configuration            │ │
│ │ }                                                                       │ │
│ │ ```                                      