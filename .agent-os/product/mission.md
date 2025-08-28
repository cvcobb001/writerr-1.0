# Product Mission

## Pitch

**Writing HUD is the first AI-powered writing tool that enhances rather than replaces the writer's creative process.** Like a pilot's heads-up display, Writing HUD provides ambient awareness and contextual assistance that helps writers see patterns, opportunities, and insights in their work without interrupting their creative flow or taking control away from them.

Through a constraint-based processing architecture, Writing HUD enables professional writers to harness AI assistance while maintaining complete transparency and control over every change to their words.

## Core Philosophy

### **HUD vs. Copilot Philosophy**

Instead of an AI assistant that **talks to you about or replaces you in** your writing, Writing HUD provides **enhanced senses about** your writing:

**Traditional AI Writing Tools (Copilot Approach):**
- AI writes for you or tells you what to write
- Breaks creative flow with chatty interruptions  
- Takes control away from the writer
- Generic suggestions without project context

**Writing HUD (Ambient Awareness Approach):**
- Shows you patterns and insights in your own work
- Provides silent, glanceable information like a car dashboard
- Keeps you in complete creative control
- Adapts to your specific writing style and project needs

### **The "Silent but Available" Principle**

Like spellcheck's red squiggles, Writing HUD information is:
- Always present but never intrusive
- Actionable when you want it, ignorable when you don't
- Contextually relevant to what you're currently writing
- Designed to fade into the background during flow states

## The Core Problem We're Solving

### **The AI Writing Tool Dilemma**

Current AI writing tools force writers into an impossible choice:
- **Accept AI replacements** that strip away creative control and the joy of discovery
- **Reject AI assistance** and miss out on powerful capabilities that could enhance their work

**Result:** Writers feel like they're "ringing a doorbell with a broom handle" - there's too much distance between them and their creative process.

### **The Missing Solution**

What writers actually want is **enhanced perception** of their own creative process:
- See patterns in their writing they wouldn't notice alone  
- Get contextual suggestions that respect their creative sovereignty
- Track their progress and improvement over time
- Access research and inspiration without breaking flow
- Experiment with changes without fear of losing their original work

## Users

### Primary Customers

- **Creative Writers**: Novelists, storytellers, and scriptwriters who want AI‑assisted fixes or rewrites only when invited, and full visibility of what changed
- **Professional Writers**: Copywriters, creative strategists, content marketers, technical writers producing deliverables across multiple clients/projects
- **Academic Writers**: Researchers, scholars, and students who use AI for summarizing, paraphrasing, or adapting text but must preserve factual integrity and citations
- **Editorial Teams**: Publishing teams, content agencies, and editorial departments managing collaborative writing workflows
- **Enterprise Writing Teams**: Business teams creating documentation, proposals, and communications with governance requirements

### User Personas

**Creative Writer** (25-55 years old)
- **Role:** Fiction writer working in long‑form narrative
- **Context:** Immersed in world‑building and character arcs; needs to maintain unique voice
- **Pain Points:** AI tools overwrite tone; changes hard to see; flow broken by intrusive suggestions
- **Goals:** Keep creative control, only see AI changes when chosen, accept/reject granularly

**Screen Writer** (28-50 years old)
- **Role:** Writer working in screenplay format for fictional narratives
- **Context:** Immersed in world‑building within the constraints of screenplay format; needs to maintain unique voice
- **Pain Points:** AI tools overwrite tone; changes hard to see; flow broken by intrusive suggestions
- **Goals:** Keep creative control, only see AI changes when chosen, accept/reject granularly

**Professional Writer** (25-45 years old)
- **Role:** Manages multiple client briefs with fast turnaround
- **Context:** Often needs quick AI‑generated revisions, but voice/tone must align with brand
- **Pain Points:** Hard to track which changes came from AI vs. self; maintaining consistency across drafts
- **Goals:** Get targeted AI help, see every change, attribute edits to source

**Academic Researcher** (30-65 years old)  
- **Role:** Writes papers, literature reviews, and reports
- **Context:** Uses AI to reorganize text, adjust style, and rephrase for clarity
- **Pain Points:** Can't risk AI altering meaning or citations undetected
- **Goals:** Guarantee all changes are reviewable; ensure document edits preserve original intent

## The Problem

### **AI Tools Overwrite Without Transparency**

Most AI tools drop in wholesale rewrites — no record of what changed, no source tags, no granular choice.

**Our Solution:** Track Edits makes every change visible inline (strikethroughs + highlights) with the option to accept or reject each modification.

### **No Clear Separation Between Information and Text Changes**

Research results, summaries, and chats often feed directly into text, bypassing review.

**Our Solution:** The Editorial Engine architecture routes *only* text‑modifying actions into Track Edits; informational outputs stay in conversational interfaces like Writerr Chat until explicitly applied.

### **AI Model Chaos**

Every plugin manages its own AI settings, forcing re‑entry of keys and causing inconsistent model choice.

**Our Solution:** Centralized configuration via AI Providers Plugin; All plugins in the suite call through it.

## Differentiators  

### **HUD Philosophy**

We are not a "copilot" in the document — we are the **heads‑up display for changes**. The writer is always in the driver's seat.

### **Granular Control**

Rather than all‑or‑nothing rewrites, every change is atomic: you can accept or reject at the smallest unit of meaning.

### **Source Attribution**

Every change is tagged — manual, AI model name, or plugin origin — so you always know *who wrote what*.

### **Separation of Concerns**

Informational AI stays in panels (research, chat, summaries). Only approved changes enter the doc, and they always pass through Track Edits.

### **Plugin‑Friendly**

The suite is built for integration. Any plugin can hand a change to Track Edits via its open API, and all AI calls go through the AI Providers plugin.

## Key Features

### Core Features

- **Editorial Engine Plugin:** Neutral constraint processing system that compiles natural language editing preferences into programmatic rulesets with enterprise-grade AI behavior control
- **Writerr Chat Plugin:** Conversational AI interface with contextual conversations, mode-based processing, and structured handoffs to constraint engine  
- **Track Edits Plugin:** Universal change management with visual diff engine, intelligent clustering, and granular accept/reject controls - the "heads-up display for changes"
- **Token Count Plugin:** Real-time token analysis with model-specific algorithms and dynamic capacity limits
- **Platform Integration Layer:** Unified API system (`window.Writerr`) enabling seamless cross-plugin coordination and third-party integration

### HUD Features

- **Ambient Awareness:** Silent but available information display that respects creative flow
- **Pattern Recognition:** Show writers patterns and insights in their own work without interruption
- **Enhanced Perception:** Provide contextual assistance that enhances rather than replaces the creative process
- **Flow State Protection:** All information fades into background during deep writing sessions

### Constraint Management Features

- **Natural Language Compilation:** Transform writing preferences into executable constraints using sophisticated rule parsing and compilation
- **Mode Registry:** User-defined editing modes (Proofreader, Copy Editor, Developmental Editor) with custom constraint sets
- **Multi-Layer Validation:** Prevent AI drift and role violations through comprehensive constraint enforcement
- **Provenance Tracking:** Complete audit trail from user input to final output with change attribution

### Collaboration Features  

- **Mode Sharing:** Share custom editing modes across team members with version control capabilities
- **Team Analytics:** Monitor editing patterns, AI effectiveness, and team productivity insights through comprehensive dashboard
- **Enterprise Settings Management:** Centralized configuration for team compliance and governance requirements
- **Third-Party Integration SDK:** Public adapter system enabling integration with Vale, Grammarly, and other professional editing tools