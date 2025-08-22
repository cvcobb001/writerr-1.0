# Writerr Chat Plugin

**Conversational AI assistant with dynamic modes and unlimited customization**

Writerr Chat provides a sophisticated conversational AI interface that transforms how you interact with writing assistance. Unlike traditional chat tools, Writerr Chat operates through specialized **modes** that completely change the AI's behavior, personality, and expertise—all while maintaining deep document intelligence and seamless integration with your writing workflow.

## ✨ What Writerr Chat Does

Writerr Chat enhances your writing by:

- **🎭 Dynamic AI Modes**: Switch between specialized AI personalities (Copy Editor, Proofreader, Creative Coach, etc.)
- **🧠 Document Intelligence**: AI understands your current document, selections, and vault context
- **🔄 Hot-Reload Customization**: Create and modify AI modes instantly by editing markdown files
- **💬 Writer-Friendly Interface**: Large input areas and smart conversation management designed for writers
- **🔗 Universal Integration**: All suggestions flow through Track Edits for consistent control

## 🚀 Quick Start

### Installation

1. **Prerequisites**: Install and configure the **AI Providers Plugin** first
   - Available in Community Plugins
   - Set up at least one AI provider (OpenAI, Anthropic, etc.)

2. **Install Writerr Chat**:
   - Open Obsidian Settings → Community Plugins
   - Search for "Writerr Chat" and install
   - Enable the plugin

3. **Manual Installation**:
   - Download plugin files to `.obsidian/plugins/writerr-chat/`
   - Enable in Community Plugins settings

### First Conversation

1. **Open Chat Panel**: Look for the Writerr Chat icon in the sidebar
2. **Choose a Mode**: Start with "Chat" mode for general conversation
3. **Try Text Selection**: Select some text and ask "How can I improve this?"
4. **Switch Modes**: Try "Copy Edit" mode for grammar suggestions
5. **Watch Integration**: See suggestions appear in Track Edits timeline

## 🎭 Built-in Modes

### 💬 Chat Mode
**Purpose**: General conversation and creative collaboration

Best for brainstorming, planning, discussion, and creative feedback. Conversational and friendly with no automatic editing suggestions.

**Example**:
```
You: I'm writing about productivity. What unique angles could I explore?

AI: Here are some fresh perspectives:
1. The "Productivity Paradox" - how optimization tools reduce effectiveness
2. Cultural productivity differences across global work styles
3. Neuroscience insights about deep work and focus
4. Different approaches for creative vs. analytical minds
```

### ✏️ Copy Edit Mode
**Purpose**: Grammar, style, and clarity improvements

Focuses on correctness and readability while maintaining your voice. All suggestions automatically appear in Track Edits.

**Example**:
```
You: Please copy edit this paragraph: [paste text]

AI: I've identified several improvements:
1. "companys" → "company's" (possessive apostrophe) [Confidence: 0.98]
2. "have increased" → "has increased" (subject-verb agreement) [0.96]
3. "however" → "however," (comma after transition) [0.89]

[Changes appear automatically in Track Edits timeline]
```

### 🔍 Proofread Mode
**Purpose**: Final polish and error detection

Conservative, accuracy-focused review for publication preparation. Catches subtle errors and ensures consistency.

**Example**:
```
AI: Proofread complete - 1,247 words analyzed:

Critical Issues:
- Line 23: "it's" → "its" (possessive needed here)
- Line 67: Missing Oxford comma in series

Consistency Notes:
- Mix of "email" vs "e-mail" throughout
- Date format inconsistency

Overall: High quality writing with minor polish needed
```

### 🎨 Writing Assistant Mode
**Purpose**: Comprehensive writing development

Strategic feedback on content, structure, and flow. Helps develop ideas and improve overall writing effectiveness.

**Example**:
```
AI: Your introduction has solid information but needs more engagement:

Structure Suggestions:
- Lead with your strongest statistic as an opening hook
- Move the definition to paragraph 2 after capturing attention
- Add a bridge sentence connecting hook to main argument

Would you like me to draft a revised version?
```

## 🛠️ Creating Custom Modes

### Mode File Structure

Create custom modes by adding `.md` files to your `/Modes/` folder:

```markdown
---
name: "Academic Editor"
description: "Specialized for scholarly writing with citation support"
personality: "precise, scholarly, thorough"
expertise: ["academic writing", "citations", "formal style"]
behavior:
  formality: formal
  creativity: low
  explanation_level: detailed
  track_edits_integration: true
integration:
  confidence_threshold: 0.8
  default_category: "academic"
  batch_suggestions: true
---

# Academic Editor Mode

You are a specialized academic writing assistant focused on scholarly communication and formal academic style.

## Your Expertise
- Academic writing conventions and style guides
- Citation accuracy and formatting  
- Formal register and scholarly tone
- Research paper structure and organization

## Your Approach
- Maintain academic rigor while improving clarity
- Provide detailed explanations for suggestions
- Focus on precision and accuracy
- Respect disciplinary writing conventions

## Response Style
- Professional and scholarly tone
- Detailed reasoning for changes
- Reference to style guides when relevant
- Conservative with creative suggestions
```

### Hot-Reload System

Changes to mode files apply **instantly**:

1. **Edit Mode File**: Open any `.md` file in `/Modes/` folder
2. **Make Changes**: Modify personality, instructions, or settings
3. **Save File**: Changes apply immediately without restart
4. **Continue Conversation**: Updated behavior works right away

### Custom Mode Examples

**Brand Voice Editor**:
```markdown
---
name: "Brand Voice"
description: "Ensures consistency with company brand guidelines"
behavior:
  brand_alignment: strict
  formality: professional
---

## Brand Guidelines
- Tone: Friendly but professional
- Voice: Helpful and knowledgeable
- Avoid: Jargon, technical terms, overly casual language
- Emphasize: Customer benefit, clear communication
```

**Fiction Coach**:
```markdown
---
name: "Fiction Coach"
description: "Creative writing development and storytelling guidance"
expertise: ["character development", "dialogue", "plot structure"]
behavior:
  creativity: high
  formality: casual
---

Focus on:
- Character voice consistency and growth
- Dialogue naturalness and distinctiveness
- Pacing and tension management
- Show vs. tell balance
- Sensory details and immersion
```

## ⚙️ Settings & Configuration

### Access Settings

Open Settings → Writerr Chat to configure:

### Essential Settings

**AI Provider**:
- ✅ **Active Provider**: Choose your configured AI service
- **Model Selection**: Select specific model (GPT-4, Claude, etc.)
- **Context Length**: Maximum tokens for conversation context

**Interface**:
- **Panel Position**: Right sidebar (recommended for writing)
- **Text Area Size**: Large for extended writing sessions
- **Default Mode**: Starting mode for new conversations
- **Mode Shortcuts**: Keyboard shortcuts for quick switching

**Integration**:
- ✅ **Send to Track Edits**: Route suggestions through Track Edits (recommended)
- **Default Confidence**: Confidence level for chat suggestions (0.8)
- **Batch Processing**: Group similar suggestions automatically

### Advanced Settings

**Context Management**:
- **Document Context**: How much document context to include
- **Selection Priority**: Weight given to selected text
- **Vault Integration**: Enable cross-note references
- **Memory Retention**: How long to maintain conversation context

**Performance**:
- **Response Timeout**: Maximum wait time for AI responses
- **Concurrent Requests**: Maximum simultaneous AI calls
- **Caching**: Enable response caching for common queries
- **Background Processing**: Process responses in background

## 💡 Usage Tips

### Effective Conversations

**Be Specific**:
```
❌ "Make this better"
✅ "Improve the clarity of this technical explanation for a general audience"
```

**Use Context**:
```
✅ Select text first, then ask for improvements
✅ Mention document type: "This is for a business proposal"
✅ Specify audience: "Writing for undergraduate students"
```

**Mode Switching Strategy**:
1. **Chat Mode**: Brainstorm and plan overall approach
2. **Writing Assistant**: Develop content and structure
3. **Copy Edit**: Fix grammar and style issues
4. **Proofread**: Final review and polish

### Keyboard Shortcuts

Set up shortcuts for efficient mode switching:

- `Ctrl/Cmd+1`: Chat mode
- `Ctrl/Cmd+2`: Copy Edit mode
- `Ctrl/Cmd+3`: Proofread mode
- `Ctrl/Cmd+4`: Writing Assistant mode
- `Ctrl/Cmd+Enter`: Send message
- `Escape`: Clear current input

### Working with Long Documents

For documents over 5,000 words:

1. **Use selections** rather than full document context
2. **Work in sections** for focused feedback
3. **Switch contexts** by selecting different passages
4. **Summarize progress** periodically to maintain coherence

## 🔧 Best Practices

### Conversation Management

**Start Broad, Get Specific**:
```
1. Begin with overall goals and approach (Chat mode)
2. Develop specific sections (Writing Assistant mode)
3. Polish individual paragraphs (Copy Edit mode)
4. Final review for errors (Proofread mode)
```

**Maintain Context**:
- Reference previous conversations: "Building on what we discussed..."
- Explain document purpose: "This is the introduction to..."
- Specify constraints: "Keep it under 200 words"

### Custom Mode Strategy

**Personal Writing Coach**:
```markdown
- Include your specific writing goals
- Reference your typical weaknesses
- Adapt tone to your preferences
- Include domain-specific knowledge
```

**Team Collaboration**:
```markdown
- Create shared modes for team projects
- Include brand voice guidelines
- Reference style guides and standards
- Maintain consistency across writers
```

## 🚨 Troubleshooting

### Common Issues

**Mode not appearing in selector**:
- ✅ Check `.md` file is in `/Modes/` folder
- ✅ Verify YAML frontmatter syntax
- ✅ Ensure required fields (name, description) are present
- ✅ Look for error notifications

**AI not responding**:
- Check AI Providers plugin configuration
- Verify API keys are valid and have credits
- Test with simpler requests first
- Check network connectivity

**Changes not flowing to Track Edits**:
- ✅ Verify `track_edits_integration: true` in mode settings
- ✅ Ensure Track Edits plugin is enabled
- ✅ Test with built-in Copy Edit mode first

**Poor conversation quality**:
- Be more specific in requests
- Provide better context about document and goals
- Try different modes for different types of feedback
- Review and refine custom mode definitions

### Performance Issues

**Slow responses**:
- Reduce context length in settings
- Use shorter, more focused requests
- Enable response caching
- Check AI provider service status

**Memory usage high**:
- Clear conversation history regularly
- Reduce document context length
- Limit concurrent conversations
- Enable automatic cleanup

## 🔗 Integration

### Works With

Writerr Chat integrates seamlessly with:

- **Track Edits Plugin**: All editing suggestions managed in timeline
- **AI Editorial Functions Plugin**: Switch between chat and function-based editing
- **AI Providers Plugin**: Universal AI service integration
- **Standard Obsidian Features**: Notes, selections, vault search

### Workflow Integration

**Complete Writing Workflow**:
1. **Brainstorm**: Chat mode for ideas and planning
2. **Structure**: Writing Assistant for organization
3. **Draft**: Continue conversation while writing
4. **Edit**: Copy Edit mode for improvements
5. **Polish**: Proofread mode for final review
6. **Manage**: Track Edits for change control

## 📈 What's Next?

Once you're comfortable with Writerr Chat:

1. **Create Custom Modes** tailored to your specific writing needs
2. **Install AI Editorial Functions** for specialized editing tools
3. **Master Integration Workflows** using all Writerr plugins together
4. **Explore Advanced Features** like conversation threading and memory

---

**Writerr Chat transforms AI assistance from generic responses into specialized, contextual guidance that understands your writing and adapts to your needs.**

*Part of the Writerr AI Editorial Platform - giving you complete Human control, Understanding, and Decision-making power over AI-assisted writing.*