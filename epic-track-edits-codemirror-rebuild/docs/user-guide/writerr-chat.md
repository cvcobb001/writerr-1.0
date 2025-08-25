# Writerr Chat Plugin Guide

The Writerr Chat plugin provides a sophisticated conversational AI interface with dynamic mode switching, unlimited customization, and deep document intelligence. This guide covers everything from basic chat modes to creating your own custom conversational workflows.

## Core Concepts

### Dynamic Mode System
Unlike traditional chat interfaces, Writerr Chat operates through specialized **modes** that completely change how the AI behaves:
- Each mode has its own personality, expertise, and focus area
- Modes are loaded from `.md` files in your `/Modes/` folder
- You can switch modes instantly without losing conversation context
- Custom modes can be created and modified in real-time

### Conversation Intelligence
Writerr Chat understands your documents and vault context:
- **Document Awareness**: Knows what you're currently editing
- **Selection Context**: Understands highlighted text
- **Vault Knowledge**: Can reference other notes and relationships
- **Project Memory**: Maintains context across editing sessions

### Integration Philosophy
All suggestions flow through Track Edits for consistency:
- Every AI suggestion appears in the Track Edits timeline
- You maintain complete control over which changes are applied
- Full audit trail of all conversational AI interactions
- Seamless integration with Editorial Functions

## Interface Overview

### Chat Panel Layout

```
┌─────────────────────────────────────────┐
│ [Mode: Copy Edit ▼] [Settings ⚙️]        │
├─────────────────────────────────────────┤
│                                         │
│ Chat History                            │
│                                         │
│ AI: I'll help you improve your writing. │
│ Please share the text you'd like me to  │
│ review for grammar and style.           │
│                                         │
│ You: [Previous message]                 │
│                                         │
├─────────────────────────────────────────┤
│ Large input area for your message...    │
│                                         │
│ [Attach Selection] [Send (Cmd+Enter)]   │
└─────────────────────────────────────────┘
```

### Mode Selector
The mode dropdown shows all available modes:
- **Built-in Modes**: Chat, Copy Edit, Proofread, Writing Assistant
- **Custom Modes**: Any `.md` files in your `/Modes/` folder
- **Mode Status**: Indicator shows if mode is loaded successfully
- **Hot Reload**: Changes to mode files apply immediately

### Message Input Area
Writer-friendly input designed for extended writing:
- **Large Text Area**: Optimized for multi-paragraph input
- **Smart Enter**: Enter creates new line, Cmd+Enter sends message
- **Selection Attachment**: Automatically includes selected text
- **Context Awareness**: AI knows what document you're working on

## Built-in Modes

### Chat Mode
**Purpose**: General conversation and creative collaboration  
**Best For**: Brainstorming, planning, discussion, creative feedback

```markdown
Characteristics:
- Conversational and friendly tone
- No automatic Track Edits integration
- Flexible, open-ended responses  
- Good for exploring ideas and getting feedback
```

**Example Usage**:
```
You: I'm writing an article about productivity. What are some unique angles I could explore?

AI: Here are some fresh angles for your productivity article:

1. The "Productivity Paradox" - how optimization tools can actually reduce effectiveness
2. Cultural differences in productivity - comparing global work styles
3. The neuroscience of focus - what brain research tells us about deep work
4. Productivity for creatives vs. analytical minds - different approaches needed
...
```

### Copy Edit Mode  
**Purpose**: Grammar, style, and clarity improvements  
**Best For**: Polishing text, fixing errors, improving readability

```markdown
Characteristics:
- Focuses on correctness and clarity
- Automatically sends suggestions to Track Edits
- Provides explanations for changes
- Maintains your voice while improving mechanics
```

**Example Usage**:
```
You: Please copy edit this paragraph:
"The company's revenue has grew significantly over the past year, 
however, there still facing challenges in the competitive market."

AI: I've identified several improvements for clarity and correctness:

1. "has grew" → "has grown" (correct past participle)
2. "however," → "However," (sentence should start new paragraph or use semicolon)
3. "there still facing" → "they're still facing" (correct contraction and spelling)

The corrected version flows better and eliminates grammatical errors while preserving your intended meaning.

[Changes automatically appear in Track Edits timeline]
```

### Proofread Mode
**Purpose**: Final polish, catching errors, ensuring consistency  
**Best For**: Final review pass, publication preparation, error detection

```markdown
Characteristics:
- Focuses on accuracy and correctness
- Catches subtle errors and inconsistencies
- Checks formatting and style consistency
- More conservative than Copy Edit mode
```

**Example Usage**:
```
You: Please proofread this conclusion section for any final issues.

AI: I've completed a thorough proofread and found these items:

Critical Issues:
- Line 3: "it's" should be "its" (possessive, not contraction)
- Line 7: Missing comma after "Furthermore"

Style Consistency:
- You use "email" in paragraph 1 but "e-mail" in paragraph 3
- Consider consistent capitalization of "Internet" vs "internet"

Minor Improvements:
- Consider breaking the 47-word sentence in paragraph 2
- "In conclusion" could be stronger as "Ultimately" or "Finally"

Overall, the writing is clear and well-structured with just these minor polish items.
```

### Writing Assistant Mode
**Purpose**: Comprehensive writing support and development  
**Best For**: Developing ideas, improving structure, enhancing content

```markdown
Characteristics:
- Holistic approach to writing improvement
- Focuses on content, structure, and flow
- Provides strategic feedback and suggestions
- Balances creativity with clarity
```

**Example Usage**:
```
You: I'm stuck on how to make this introduction more engaging. Here's what I have...

AI: Your introduction has solid information, but we can make it much more engaging:

Current Approach: Starts with a general statement
Suggested Approach: Lead with a compelling question or surprising fact

Content Enhancement:
- Your second sentence could become the opening hook
- Move the definition to paragraph 2 after you've captured attention  
- Add a "bridge" sentence connecting the hook to your main argument

Structure Improvements:
- Consider the "funnel approach": broad interest → specific focus → your thesis
- Your current conclusion sentence is strong - it could work as a thesis statement

Would you like me to draft a revised version incorporating these suggestions?
```

## Creating Custom Modes

### Mode Definition Structure

Custom modes are created as `.md` files in your `/Modes/` folder:

```markdown
---
name: "Technical Writer"
description: "Specialized mode for technical documentation and API guides"
personality: "precise, clear, technically accurate"
expertise: ["technical writing", "API documentation", "developer communication"]
behavior:
  formality: professional
  creativity: low
  explanation_level: detailed
  track_edits_integration: true
integration:
  confidence_threshold: 0.8
  default_category: "clarity"
  batch_suggestions: true
---

# Technical Writer Mode

You are a specialized technical writer helping create clear, accurate documentation.

## Your Role
- Focus on precision and accuracy over creative language
- Ensure all technical terms are used correctly
- Structure information logically for technical audiences
- Prioritize clarity and completeness

## Guidelines
- Ask clarifying questions about technical details
- Suggest improvements to information architecture
- Flag potential areas of confusion for readers
- Recommend examples and code snippets when helpful

## Response Style
- Be direct and professional
- Provide specific, actionable feedback  
- Explain technical concepts clearly
- Reference best practices in technical communication

## Track Edits Integration
When making suggestions:
- Focus on clarity and accuracy improvements
- Use "clarity" category for most changes
- Set high confidence for grammar/terminology fixes
- Provide detailed explanations for structural changes
```

### Mode File Sections

**Frontmatter (YAML)**:
- `name`: Display name in mode selector
- `description`: Brief explanation of mode purpose
- `personality`: AI personality traits
- `expertise`: Areas of specialization
- `behavior`: Specific behavior controls
- `integration`: Track Edits integration settings

**Main Content**:
- System prompt defining the AI's role and behavior
- Guidelines for how the mode should operate
- Response style instructions
- Integration instructions for Track Edits

### Advanced Mode Features

**Context Awareness**:
```markdown
## Context Handling
- Always consider the user's current document type
- Reference previous conversation history
- Understand document structure and headings
- Consider vault-wide context when relevant
```

**Dynamic Behavior**:
```markdown
## Adaptive Responses
- Adjust formality based on document type
- Increase technical depth for specialized content  
- Scale explanation detail to user expertise level
- Modify suggestions based on acceptance patterns
```

**Integration Controls**:
```yaml
integration:
  track_edits_integration: true
  confidence_threshold: 0.75
  default_category: "style"
  batch_suggestions: true
  auto_apply_high_confidence: false
  explanation_required: true
```

## Hot Reload System

### Real-Time Mode Updates

Changes to mode files apply immediately:
1. **Edit Mode File**: Modify any `.md` file in `/Modes/`
2. **Automatic Detection**: File watcher detects changes
3. **Validation**: Mode definition is validated
4. **Hot Reload**: Mode updates without breaking current conversation
5. **Notification**: Success/error notification appears

**Example Workflow**:
```
1. Currently using "Copy Edit" mode in active conversation
2. Open /Modes/copy-edit.md in editor
3. Modify the personality or guidelines
4. Save file
5. Mode immediately updates with new behavior
6. Continue conversation with updated mode
```

### Mode Validation

The system validates mode files for:
- **YAML Syntax**: Proper frontmatter formatting
- **Required Fields**: Name, description must be present
- **Integration Settings**: Valid Track Edits configuration
- **Content Structure**: Proper markdown formatting
- **Circular References**: No infinite loops in mode inheritance

**Error Handling**:
- Invalid modes show error in mode selector
- Detailed error messages help fix issues
- Fallback to previous working version
- Error notifications with specific line numbers

## Document Intelligence

### Context Extraction

Writerr Chat automatically understands:

**Current Document Context**:
- Document title and metadata
- Current cursor position and selection
- Document structure (headings, sections)
- Writing style and tone patterns
- Previous AI interactions in this document

**Vault Context**:
- Related notes and backlinks
- Project structure and relationships
- Common terms and concepts
- Writing patterns across documents

**Selection Intelligence**:
- Automatically includes selected text in context
- Understands relationship between selection and document
- Provides context-aware suggestions
- Maintains selection reference throughout conversation

### Smart Context Usage

**Automatic Context Inclusion**:
```
You: [Select paragraph] How can I improve this?

AI: Looking at this paragraph in the context of your article about [topic], 
I notice it serves as a transition between [previous concept] and [next concept].

Here are specific improvements for this transitional paragraph:
...
```

**Reference Preservation**:
- Selected text remains highlighted during conversation
- AI references specific parts of your selection
- Suggestions maintain connection to original context
- Changes tracked with precise document location

## Advanced Features

### Conversation Memory

**Session Memory**: Maintains context within editing session
- Remembers previous requests and suggestions
- Builds on earlier feedback and decisions
- Understands evolving document state
- Tracks acceptance patterns for better suggestions

**Document Memory**: Per-document conversation history
- Recalls previous discussions about specific documents
- Understands document evolution over time
- Maintains context across editing sessions
- Links conversations to document changes

**Project Memory**: Vault-wide context and relationships
- Understands project goals and themes
- Maintains consistency across related documents
- Leverages previous work and decisions
- Builds comprehensive writing profile

### Multi-Turn Conversations

**Context Preservation Across Mode Switches**:
```
You (in Chat mode): I'm working on an academic paper about climate change.
[Switch to Writing Assistant mode]
AI: I understand you're developing an academic paper on climate change. 
How can I help structure or enhance your argument?
```

**Conversation Threading**:
- Multiple simultaneous conversation threads
- Context switching without losing history
- Branch conversations for different aspects
- Merge insights from different modes

### Integration with Editorial Functions

**Seamless Workflow Integration**:
1. **Chat Mode**: Discuss overall strategy and approach
2. **Function Mode**: Apply "Academic Writer" function to specific sections  
3. **Review Mode**: Use "Copy Edit" mode to review function results
4. **Track Edits**: Manage all suggestions in unified timeline

**Cross-System Memory**:
- Chat modes aware of function results
- Functions informed by chat discussions
- Unified improvement strategy across tools
- Consistent feedback and learning

## Customization and Advanced Usage

### Personal Writing Assistant Creation

Create a mode tailored to your specific needs:

```markdown
---
name: "My Writing Coach"
description: "Personalized mode that knows my writing style and goals"
personality: "encouraging, detail-oriented, familiar with my work"
expertise: ["my writing style", "my subject areas", "my preferences"]  
behavior:
  formality: casual
  creativity: high
  explanation_level: detailed
  track_edits_integration: true
---

# My Writing Coach

You are my personal writing coach who knows my style, preferences, and goals.

## What You Know About My Writing
- I prefer active voice and direct language
- I tend to over-explain concepts (help me be more concise)
- I'm working on [specific writing project]
- My target audience is [description]

## Your Role
- Provide encouraging but honest feedback
- Challenge me to improve specific weak areas
- Suggest exercises for skill development
- Keep me motivated and on track with goals

## Response Style  
- Be conversational and supportive
- Reference previous conversations and progress
- Provide specific, actionable advice
- Celebrate improvements and milestones
```

### Genre-Specific Modes

**Fiction Writing Mode**:
```markdown
---
name: "Fiction Editor"
description: "Specialized feedback for creative writing and storytelling"
expertise: ["character development", "dialogue", "pacing", "plot structure"]
---

Focus on:
- Character voice consistency and development
- Dialogue naturalness and distinctiveness  
- Pacing and tension management
- Show vs. tell balance
- Sensory details and immersion
```

**Academic Writing Mode**:
```markdown
---
name: "Academic Editor"  
description: "Formal academic writing with proper citation and argumentation"
expertise: ["academic style", "argumentation", "citation", "clarity"]
---

Focus on:
- Argument structure and logical flow
- Evidence integration and citation accuracy
- Academic tone and formality
- Clarity without sacrificing precision
- Paragraph and section organization
```

### Team and Collaboration Modes

**Brand Voice Mode**:
```markdown
---
name: "Brand Voice Editor"
description: "Ensures consistency with company brand guidelines"
behavior:
  formality: professional
  brand_alignment: strict
---

## Brand Guidelines
- Tone: [Your brand tone]
- Voice: [Your brand voice]  
- Terminology: [Key terms and preferences]
- Avoid: [Words/phrases to avoid]

Ensure all suggestions align with brand standards.
```

## Performance and Optimization

### Large Document Handling

**Optimizations for Long Documents**:
- Context summarization for documents >10,000 words
- Intelligent excerpt selection for relevant context
- Memory management for long conversation histories
- Efficient processing of large text selections

**Settings for Performance**:
```yaml
Performance Settings:
  Max Context Length: 8000 tokens
  Context Summarization: enabled
  Memory Cleanup Interval: 10 minutes  
  Max Conversation History: 100 messages
  Background Processing: enabled
```

### Mode Loading Optimization

**Lazy Loading**: Modes loaded on first use
**Caching**: Compiled modes cached for faster switching  
**Background Validation**: Mode validation happens in background
**Error Recovery**: Graceful handling of corrupted mode files

## Troubleshooting

### Common Issues

**Problem**: Mode not appearing in selector
- Check `.md` file is in `/Modes/` folder
- Verify YAML frontmatter syntax
- Check for required name/description fields
- Look for error notifications

**Problem**: Changes not flowing to Track Edits
- Verify `track_edits_integration: true` in mode frontmatter
- Check Track Edits plugin is enabled
- Ensure AI Providers integration is working
- Test with built-in Copy Edit mode first

**Problem**: Mode behavior inconsistent
- Check for conflicting instructions in mode definition
- Verify personality and behavior settings are compatible
- Test with simplified mode definition first
- Check conversation context for conflicts

**Problem**: Poor performance with large documents
- Reduce max context length in settings
- Enable context summarization
- Break large documents into sections
- Use selection-based context instead of full document

### Best Practices

**Mode Creation**:
- Start with built-in mode and modify gradually
- Test thoroughly before relying on custom modes
- Use clear, specific instructions in mode definitions
- Validate YAML syntax before saving

**Performance**:
- Keep mode files under 5KB for best performance
- Use selection-based context for large documents
- Limit conversation history length
- Regular cleanup of old conversation data

**Integration**:
- Always test Track Edits integration with new modes
- Use appropriate confidence thresholds
- Configure batch settings for your workflow
- Monitor memory usage with complex modes

## What's Next?

- [AI Editorial Functions Guide](ai-editorial-functions.md) - Learn specialized editing tools
- [Integration Workflows](integration-workflows.md) - Advanced multi-plugin patterns  
- [Creating Custom Modes Tutorial](../tutorials/creating-modes.md) - Step-by-step mode creation
- [API Documentation](../api/writerr-chat-api.md) - Build custom integrations