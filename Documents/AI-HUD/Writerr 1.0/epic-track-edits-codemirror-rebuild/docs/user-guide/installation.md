# Installation Guide

This guide will walk you through installing all three Writerr plugins and getting them properly configured to work together.

## Prerequisites

### Required
- **Obsidian** version 1.4.0 or higher
- **AI Providers Plugin** - Writerr requires this plugin for all AI functionality
  - Install from Community Plugins: [AI Providers](https://github.com/your-org/obsidian-ai-providers)
  - Configure with at least one AI provider (OpenAI, Anthropic, etc.)

### Recommended
- **Sufficient system resources**: 8GB+ RAM for large document processing
- **SSD storage**: For optimal hot-reload performance of custom functions/modes

## Installation Methods

### Method 1: Community Plugin (Recommended)

Once available in the Obsidian Community Plugin directory:

1. Open Obsidian Settings → Community Plugins
2. Disable Safe Mode if not already done
3. Search for and install each plugin:
   - **Track Edits**
   - **Writerr Chat** 
   - **AI Editorial Functions**
4. Enable all three plugins
5. Restart Obsidian

### Method 2: Manual Installation (Beta/Development)

For beta versions or development builds:

1. **Download Plugin Files**
   ```bash
   # Download the latest release
   wget https://github.com/your-org/writerr/releases/latest/download/writerr-plugins.zip
   unzip writerr-plugins.zip
   ```

2. **Install Track Edits Plugin**
   ```bash
   cp -r track-edits-plugin/ /path/to/vault/.obsidian/plugins/track-edits/
   ```

3. **Install Writerr Chat Plugin**
   ```bash
   cp -r writerr-chat-plugin/ /path/to/vault/.obsidian/plugins/writerr-chat/
   ```

4. **Install AI Editorial Functions Plugin**
   ```bash
   cp -r ai-editorial-functions-plugin/ /path/to/vault/.obsidian/plugins/ai-editorial-functions/
   ```

5. **Enable Plugins**
   - Open Obsidian Settings → Community Plugins
   - Enable: Track Edits, Writerr Chat, AI Editorial Functions
   - Restart Obsidian

## Initial Configuration

### 1. AI Providers Setup

First, ensure AI Providers is properly configured:

1. Open AI Providers settings
2. Configure at least one provider:
   - **OpenAI**: Add API key for GPT-3.5/GPT-4
   - **Anthropic**: Add API key for Claude
   - **Others**: As needed for your workflow
3. Test the connection with a simple query

### 2. Track Edits Configuration

Configure the universal change management system:

1. Open Settings → Track Edits
2. **Basic Settings**:
   - Enable "Track all changes" (recommended)
   - Set confidence threshold (default: 0.7)
   - Choose default clustering mode (Category recommended)
3. **Visual Settings**:
   - Customize highlight colors for different change types
   - Enable/disable inline animations (disable for better performance)
   - Set timeline refresh rate (1 second recommended)
4. **Performance Settings**:
   - Set batch size limit (100 changes recommended)
   - Configure memory limits for large documents
   - Enable/disable virtual scrolling for timelines

### 3. Writerr Chat Configuration

Set up the conversational AI interface:

1. Open Settings → Writerr Chat
2. **Mode Settings**:
   - Verify built-in modes are loaded (Chat, Copy Edit, Proofread, Writing Assistant)
   - Set default mode (Chat recommended for new users)
   - Configure mode switching shortcuts
3. **Interface Settings**:
   - Set chat panel position (right sidebar recommended)
   - Configure text area size (large recommended)
   - Enable/disable typing indicators
4. **Integration Settings**:
   - Ensure "Send suggestions to Track Edits" is enabled
   - Set default confidence for chat suggestions (0.8 recommended)

### 4. AI Editorial Functions Configuration

Configure the dynamic function system:

1. Open Settings → AI Editorial Functions
2. **Function Settings**:
   - Verify built-in functions are loaded (Copy Editor, Proofreader, etc.)
   - Set function directory (default: `/AIEditorialFunctions/`)
   - Configure hot-reload settings (enabled recommended)
3. **Execution Settings**:
   - Set function timeout (30 seconds recommended)
   - Configure concurrent function limit (3 recommended)
   - Enable session learning (recommended)
4. **Integration Settings**:
   - Ensure Track Edits integration is enabled
   - Set default batch settings for function outputs

## Verification

### Test Basic Functionality

1. **Track Edits Test**:
   - Create a new note
   - Make some manual changes
   - Verify changes appear in Track Edits timeline
   - Test accepting/rejecting changes

2. **Writerr Chat Test**:
   - Open Writerr Chat panel
   - Switch to "Copy Edit" mode
   - Send a text sample for editing
   - Verify suggestions appear in Track Edits
   - Accept/reject some suggestions

3. **AI Editorial Functions Test**:
   - Select some text in a note
   - Run the "Proofreader" function (Command Palette → Proofreader)
   - Verify suggestions appear in Track Edits
   - Check that function completed successfully

### Test Integration

Create a comprehensive workflow test:

```markdown
1. Open a document with some text that needs editing
2. Use Writerr Chat in "Writing Assistant" mode to get improvement suggestions
3. Run the "Copy Editor" function on a paragraph
4. Check Track Edits timeline shows all changes from both sources
5. Use batch operations to accept multiple related changes
6. Verify document state is properly maintained
```

If all tests pass, your installation is successful!

## Directory Structure

After installation, your vault will have these new directories:

```
/your-vault/
├── .obsidian/
│   └── plugins/
│       ├── track-edits/
│       ├── writerr-chat/
│       └── ai-editorial-functions/
├── /Modes/              # Custom chat modes (auto-created)
│   ├── chat.md
│   ├── copy-edit.md
│   ├── proofread.md
│   └── writing-assistant.md
└── /AIEditorialFunctions/ # Custom editorial functions (auto-created)
    ├── copy-editor.md
    ├── proofreader.md
    ├── developmental-editor.md
    └── co-writer.md
```

## Troubleshooting Installation

### Common Issues

**Problem**: Plugins won't enable
- **Solution**: Check Obsidian version compatibility, disable Safe Mode, restart Obsidian

**Problem**: AI Providers not connecting
- **Solution**: Verify API keys, check network connection, test with simple query

**Problem**: Functions/modes not loading
- **Solution**: Check file permissions, verify directory paths, restart plugins

**Problem**: Poor performance
- **Solution**: Adjust batch sizes, disable animations, check available RAM

### Getting Help

- [Troubleshooting Guide](../troubleshooting/) - Detailed solutions
- [GitHub Issues](https://github.com/your-org/writerr/issues) - Report bugs
- [Discord Support](https://discord.gg/writerr) - Community help

## What's Next?

- [Quick Start Tutorial](quick-start.md) - Learn the basics in 10 minutes
- [Configuration Guide](configuration.md) - Detailed settings explanation  
- [Track Edits Guide](track-edits.md) - Master change management
- [Integration Workflows](integration-workflows.md) - Advanced usage patterns