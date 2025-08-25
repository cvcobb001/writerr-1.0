# Quick Start Tutorial

Get up and running with Writerr in 10 minutes. This tutorial will walk you through the core features of all three plugins working together.

## Tutorial Overview

**Time Required**: 10 minutes  
**Prerequisites**: Writerr plugins installed and AI Providers configured  
**What You'll Learn**: Basic workflow using all three plugins together

## Step 1: Understanding the Interface (2 minutes)

### Open a Test Document

1. Create a new note called "Writerr Tutorial Test"
2. Add this sample text:
   ```markdown
   # My First Article
   
   This is a sample article that I'm going to edit using Writerr. 
   The article has several problems including grammar mistakes, 
   awkward phrasing, and could benefit from better structure.
   
   I'm excited to see how the AI editorial functions work together 
   with the track edits system to help improve my writing.
   ```

### Locate the Writerr Interface Elements

**Track Edits Panel**: Should appear in the right sidebar showing "No changes yet"  
**Writerr Chat Panel**: Available in right sidebar (may need to click the chat icon)  
**Function Commands**: Available in Command Palette (Cmd/Ctrl+P)

## Step 2: Your First AI Chat Session (3 minutes)

### Open Writerr Chat

1. Click the chat icon in the right sidebar
2. Notice the mode selector at the top (should show "Chat")
3. The large text area is for your input

### Try Different Chat Modes

1. **Start with Copy Edit Mode**:
   - Select "Copy Edit" from the mode dropdown
   - Copy your sample text into the chat input
   - Hit Cmd+Enter (or the Send button)
   - Watch as suggestions appear

2. **Observe Track Edits Integration**:
   - Switch to the Track Edits panel
   - Notice new changes have appeared in the timeline
   - Each change shows source: "Writerr Chat - Copy Edit"
   - Changes are color-coded by type (grammar, style, etc.)

3. **Accept Some Changes**:
   - Click "Accept" on a few grammar corrections
   - Notice the changes are applied to your document
   - The Track Edits timeline updates to show accepted changes

## Step 3: Using Editorial Functions (3 minutes)

### Run Your First Function

1. **Select Text**: Highlight the first paragraph of your test document
2. **Open Command Palette**: Cmd/Ctrl+P
3. **Run Proofreader**: Type "Proofreader" and select it
4. **Watch the Process**:
   - Function runs in the background
   - New changes appear in Track Edits
   - Source shows "AI Editorial Functions - Proofreader"

### Try a Different Function

1. **Select Different Text**: Highlight the second paragraph
2. **Run Copy Editor Function**: Command Palette → "Copy Editor"
3. **Compare Results**: Notice different types of suggestions from each function

### Understanding Function vs Chat Differences

**Functions**: 
- Work on selected text
- Specialized for specific editing tasks
- Produce more targeted, technical suggestions

**Chat Modes**: 
- Work with any text you input
- More conversational and flexible
- Better for creative feedback and discussion

## Step 4: Managing Changes with Track Edits (2 minutes)

### Understanding the Timeline

1. **View All Changes**: Look at the Track Edits timeline
2. **Notice Organization**: Changes are grouped by source and type
3. **Check Confidence Levels**: Each change shows a confidence score

### Batch Operations

1. **Select Multiple Changes**: Use Cmd+Click to select several related changes
2. **Batch Accept**: Click "Accept Selected" to apply multiple changes at once
3. **Filter by Source**: Use the filter dropdown to show only Chat or Function suggestions

### Change Categories

Notice how changes are automatically categorized:
- **Grammar**: Red highlights for grammatical corrections
- **Style**: Blue highlights for style improvements  
- **Structure**: Green highlights for organizational changes
- **Clarity**: Purple highlights for clarity improvements

## Step 5: Advanced Integration (2 minutes)

### Create a Complete Workflow

1. **Start with Chat for Ideas**:
   - Switch to "Writing Assistant" mode in Writerr Chat
   - Ask: "How can I improve the structure of this article?"
   - Get high-level feedback and suggestions

2. **Use Functions for Technical Editing**:
   - Run "Developmental Editor" function on the whole document
   - Run "Copy Editor" on specific paragraphs that need work

3. **Manage Everything in Track Edits**:
   - Review all suggestions in one timeline
   - Accept structural changes first
   - Then handle detailed copy editing
   - Use confidence levels to prioritize

### Hot-Reload Custom Functions

1. **Find Function Directory**: Navigate to `/AIEditorialFunctions/` in your vault
2. **Open a Function File**: Look at `copy-editor.md`
3. **Make a Small Change**: Modify the prompt slightly
4. **Test Immediately**: Run the function again - changes are applied instantly!

## Key Takeaways

### The HUD Philosophy in Action
- **Human Control**: You decided which changes to accept/reject
- **Understanding**: Every change was clearly categorized and explained
- **Decision Power**: You maintained complete control over your text

### Three-Plugin Synergy
- **Track Edits**: Central hub for all change management
- **Writerr Chat**: Flexible, conversational AI assistance  
- **AI Editorial Functions**: Specialized, targeted editing tools

### Dynamic Customization
- All modes and functions can be customized
- Changes to function files apply immediately
- No plugin restarts required for customization

## What's Next?

Now that you understand the basics, explore these advanced topics:

### Immediate Next Steps
- [Track Edits Deep Dive](track-edits.md) - Master advanced change management
- [Chat Modes Guide](writerr-chat.md) - Learn all modes and create custom ones
- [Editorial Functions Guide](ai-editorial-functions.md) - Understand and customize functions

### Advanced Usage
- [Creating Custom Functions](../tutorials/creating-functions.md) - Build specialized editors
- [Custom Chat Modes](../tutorials/creating-modes.md) - Design conversation flows
- [Integration Workflows](integration-workflows.md) - Advanced multi-plugin patterns

### Troubleshooting
- [Performance Guide](performance.md) - Optimize for large documents
- [FAQ](../troubleshooting/faq.md) - Common questions and solutions

## Practice Exercise

Try this complete editing workflow with your own writing:

1. **Import a Real Document**: Use something you're actually working on
2. **Chat Phase**: Use "Writing Assistant" mode to get structural feedback
3. **Function Phase**: Run appropriate functions (Proofreader, Copy Editor, etc.)
4. **Management Phase**: Use Track Edits to systematically review and apply changes
5. **Refinement Phase**: Iterate with specific functions based on remaining needs

**Time Investment**: 15-30 minutes  
**Result**: Significantly improved document with complete change audit trail

---

**You're now ready to use Writerr effectively! The combination of conversational AI, specialized functions, and comprehensive change management gives you unprecedented control over AI-assisted editing.**