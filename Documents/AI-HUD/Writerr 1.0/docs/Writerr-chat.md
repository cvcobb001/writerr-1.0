Writerr Chat: Conversational AI with Dynamic Programmatic Edit Modes

  Overview

  Writerr Chat is a conversational AI writing assistant built specifically for writers who want AI help without
  losing creative control. Unlike generic AI chat tools, Writerr Chat understands your documents, respects your
  writing process, and offers dynamic programmatic edit modes that let you collaborate with AI on your terms.

  The Interface

  Single Chat Interface with Mode Switching:
  - Familiar conversational chat interface for all interactions
  - Header dropdown (where it normally says "Chat") lets you switch between modes
  - Same natural conversation style regardless of mode
  - Different programmatic behaviors activate based on selected mode

  The Four Core Modes

  💬 Chat Mode (default)

  - Pure conversation - no document edits
  - Research, brainstorming, discussion, Q&A
  - Information stays in chat panel only
  - Default fallback if no custom prompts are loaded

  📝 Copy Edit Mode

  - AI analyzes text and suggests structural/style improvements
  - Makes copy editing-level suggestions that flow to Track Edits
  - Focus on clarity, flow, consistency, readability

  🔍 Proofread Mode

  - AI scans for mechanical errors
  - Suggests corrections for typos, grammar, punctuation
  - Minimal, precise edits sent to Track Edits

  ✍️ Writing Assistant Mode

  - AI actively collaborates on content creation
  - Suggests rewrites, alternative phrasing, content expansion
  - More substantial creative input flowing to Track Edits

  Dynamic Mode System

  📁 Completely Customizable via /Modes Folder:

  Modes/
  ├── chat.md                    # Default conversational mode
  ├── copy-edit.md              # Structural/style improvements
  ├── proofread.md              # Grammar/mechanics corrections
  ├── writing-assistant.md      # Creative collaboration
  ├── development-editor.md     # User-added: technical accuracy
  ├── brand-voice-editor.md     # User-added: company voice/tone
  ├── academic-reviewer.md      # User-added: citations, formal structure
  ├── seo-editor.md             # User-added: search optimization
  └── character-voice-coach.md  # User-added: dialogue consistency

  🔄 How It Works:
  1. Dynamic Loading: Chat scans /Modes folder on startup
  2. Auto-Population: Each .md file becomes a selectable mode in the dropdown
  3. Custom Prompts: Each file contains highly specific instructions for that editing approach
  4. Unlimited Expansion: Users can create modes for any writing scenario

  Writer-Centric Design Philosophy

  Document Intelligence:
  - Context-aware of current document, selections, and entire vault
  - Maintains context across long writing sessions
  - References specific sections, characters, themes, or research
  - Multi-document awareness for project-wide assistance

  Writer-Friendly Interface:
  - Large, multi-line composition areas designed for real writing
  - Enter for newlines, Cmd+Enter to send - built for writing workflows
  - Gray secondary elements with clear visual hierarchy
  - 120px minimum text areas for comfortable multi-line composition

  Granular Control Integration:
  - Never overwrites text directly
  - All edit suggestions flow through Track Edits for granular acceptance/rejection
  - Maintains clear attribution between your words and AI assistance
  - Designed to enhance your voice, not replace it

  The Revolutionary Power

  This isn't just "4 editing modes" - it's a completely customizable AI writing assistant framework. Writers can
  craft specialized modes for:

  Genre-Specific: Sci-fi editor, romance editor, technical writing coach
  Style-Specific: AP style enforcer, Chicago manual adherent, conversational tone keeperClient-Specific: Brand
  voice maintainer, company style guide enforcer
  Workflow-Specific: Morning pages coach, deadline enforcer, research organizer
  Collaborative: Co-author simulator, critique partner, beta reader

  Integration with Writerr Ecosystem

  Seamless Track Edits Integration:
  - Edit modes send suggestions directly to Track Edits
  - Every change visible with granular accept/reject controls
  - Full attribution tracking (manual vs. AI vs. specific mode)

  AI Providers Standardization:
  - All AI calls route through centralized AI Providers plugin
  - Consistent model management across modes
  - Single configuration for all AI interactions

  Cross-Plugin Compatibility:
  - Works with any Obsidian plugin through Track Edits integration
  - Leverages Smart Connections for research context
  - Enhances existing writing workflows without disruption

  The Bottom Line

  Writerr Chat transforms AI writing assistance from a one-size-fits-all tool into a personalized editorial team.
   Every writer can build their own collection of AI editors, each with specific expertise and editing
  approaches, all accessible through a single, familiar conversational interface that respects their creative
  process and maintains complete control over every change.

