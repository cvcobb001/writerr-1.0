# Writerr Product Mission & Vision

## Core Mission
Writerr is an AI-powered writing environment that **enhances — rather than replaces — the writer's creative process** by giving them **complete, granular control over any change to their words**. The system ensures that every document change — no matter the source — is visible, attributable, and entirely under the author's control.

## Product Philosophy

### HUD Philosophy
Writerr is not a "copilot" in the document — it is the **heads-up display for changes**. The writer is always in the driver's seat.

### Core Principles
- **Granular Control**: Every change is atomic; writers can accept or reject at the smallest unit of meaning
- **Source Attribution**: Every change is tagged (manual, AI model name, or plugin origin)
- **Separation of Concerns**: Informational AI stays in panels; only approved changes enter documents through Track Edits
- **Plugin-Friendly**: Built for integration with open APIs for any plugin to submit changes

## Target Users

### Primary Customer Segments

#### Creative Writers
- **Profile**: Novelists, storytellers, screenwriters
- **Needs**: AI-assisted fixes only when invited, full visibility of changes
- **Pain Points**: AI tools overwrite tone, changes hard to see, flow broken by intrusive suggestions
- **Goals**: Maintain creative control, granular accept/reject capabilities

#### Professional Writers  
- **Profile**: Copywriters, creative strategists, content marketers, technical writers
- **Context**: Multiple client briefs with fast turnaround requirements
- **Pain Points**: Hard to track AI vs. manual changes, maintaining consistency across drafts
- **Goals**: Targeted AI help with complete change attribution and source tracking

#### Academic Writers
- **Profile**: Researchers, scholars, students
- **Context**: Use AI for summarizing, paraphrasing, adapting text while preserving integrity
- **Pain Points**: Risk of AI altering meaning or citations undetected
- **Goals**: Guarantee all changes are reviewable, preserve original intent

## Problem Statement & Solutions

### Problem 1: AI Tools Overwrite Without Transparency
**Issue**: Most AI tools drop in wholesale rewrites with no record of changes, no source tags, no granular choice.
**Solution**: Track Edits makes every change visible inline (strikethroughs + highlights) with accept/reject controls.

### Problem 2: No Clear Separation Between Information and Text Changes
**Issue**: Research results, summaries, and chats often feed directly into text, bypassing review.
**Solution**: Only text-modifying actions route through Track Edits; informational outputs stay in conversational interfaces until explicitly applied.

### Problem 3: AI Model Chaos
**Issue**: Every plugin manages its own AI settings, forcing re-entry of keys and causing inconsistent model choice.
**Solution**: Centralized configuration via AI Providers Plugin for all plugins in the suite.

## Key Differentiators

1. **Universal Text Change Gatekeeper**: All plugin/AI/manual modifications flow through Track Edits
2. **Inline Visual Diffs**: Struck-out originals with highlighted suggestions
3. **Change Clustering**: Group related changes for bulk approval
4. **Per-Document Toggle**: Enable/disable tracking per note with state memory
5. **Session History**: Timeline of accepted/rejected changes
6. **Conversational AI Integration**: Natural language interaction through Writerr Chat with programmatic edit application

## Technical Vision

### Modern Architecture
- **React-First UI**: Modern interfaces built with React 18 and Radix UI primitives
- **Obsidian-Native Integration**: Deep platform integration while maintaining performance
- **Cross-Plugin Communication**: Global APIs enable seamless data flow

### Writer-Centric Design
- **Large Text Areas**: Multi-line composition areas (120px minimum) designed for writers
- **Contextual Document Integration**: Chat understands current document, selections, and vault context
- **Clear Information Hierarchy**: Gray secondary elements, clear visual focus, proper keyboard shortcuts

### AI Provider Standardization
- **Centralized Configuration**: Single setup for AI models across all Writerr plugins
- **Direct Integration**: Plugins call AI Providers directly without middleware complexity
- **Consistent Model Management**: Configure once, use everywhere

## Ecosystem Components

1. **Track Edits**: Granular change control and visual diffs (Foundation)
2. **Writerr Chat**: Conversational AI interface for writing assistance
3. **Smart Connections**: Research queries and context building from vault content
4. **AI Providers**: Centralized AI model configuration and request routing

This mission statement guides all development decisions, ensuring Writerr remains focused on empowering writers with complete control over their AI-assisted writing process.