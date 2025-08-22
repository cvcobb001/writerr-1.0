# Known Issues - Writerr Plugin Suite

> **Last Updated:** [Date]  
> **Plugin Version:** Track Edits v1.0.0, Writerr Chat v1.0.0, AI Editorial Functions v1.0.0

This document tracks known issues, bugs, and limitations in the Writerr plugin suite. Issues are categorized by severity and plugin component.

## Issue Categories

- **🔴 Critical**: Plugin crashes, data loss, or security vulnerabilities
- **🟠 High**: Major features not working, significant performance issues  
- **🟡 Medium**: Minor features not working, workarounds available
- **🟢 Low**: Cosmetic issues, minor inconveniences

## Status Definitions

- **Open**: Issue identified and confirmed
- **In Progress**: Actively being worked on
- **Testing**: Fix implemented, undergoing testing
- **Resolved**: Fixed and deployed
- **Closed**: Verified as resolved
- **Won't Fix**: Issue will not be addressed (with justification)

---

## Critical Issues 🔴

### [CRITICAL-001] Memory Leak with Large Edit History
- **Plugin**: Track Edits
- **Status**: Open
- **Reported**: [Date]
- **Description**: Memory usage continuously increases during extended editing sessions with documents over 50MB
- **Impact**: System slowdown, potential crashes after 2+ hours of editing
- **Steps to Reproduce**:
  1. Open document with 25,000+ words
  2. Make continuous edits for 2+ hours
  3. Monitor memory usage in Activity Monitor
  4. Memory usage increases beyond 2GB
- **Workaround**: Restart Obsidian every 2 hours, or disable tracking for very large documents
- **Fix Target**: v1.1.0
- **Assigned**: Development Team

### [CRITICAL-002] API Key Exposure in Settings Export
- **Plugin**: Writerr Chat
- **Status**: Resolved
- **Reported**: [Date]
- **Resolved**: [Date]
- **Description**: AI provider API keys were included in plain text when exporting plugin settings
- **Impact**: Security vulnerability - API keys could be accidentally shared
- **Steps to Reproduce**:
  1. Configure AI provider with API key
  2. Export plugin settings
  3. API key visible in exported file
- **Fix**: API keys now excluded from exports and stored securely
- **Version Fixed**: v1.0.1

---

## High Priority Issues 🟠

### [HIGH-001] Chat Context Not Preserved Between Sessions  
- **Plugin**: Writerr Chat
- **Status**: In Progress
- **Reported**: [Date]
- **Description**: Chat conversations are lost when Obsidian is restarted
- **Impact**: Users lose chat history and context, reducing productivity
- **Steps to Reproduce**:
  1. Start chat conversation with AI
  2. Close and reopen Obsidian
  3. Chat history is empty
- **Expected**: Chat history should persist between sessions
- **Workaround**: Export important conversations before closing Obsidian
- **Fix Target**: v1.1.0
- **Assigned**: Chat Team

### [HIGH-002] Editorial Functions Timeout with Large Text Selections
- **Plugin**: AI Editorial Functions  
- **Status**: Testing
- **Reported**: [Date]
- **Description**: Functions fail with timeout error when processing text selections over 5,000 words
- **Impact**: Cannot use editorial functions on large documents or sections
- **Steps to Reproduce**:
  1. Select text over 5,000 words
  2. Apply any editorial function
  3. Function times out after 10 seconds
- **Expected**: Functions should process large selections or provide chunking
- **Workaround**: Break large selections into smaller chunks (under 2,000 words)
- **Fix**: Implemented chunking strategy, currently testing
- **Version Target**: v1.0.2

### [HIGH-003] Track Edits Highlighting Conflicts with Dark Themes
- **Plugin**: Track Edits
- **Status**: Open  
- **Reported**: [Date]
- **Description**: Edit highlighting is barely visible or unreadable in dark themes
- **Impact**: Track Edits feature unusable for users with dark themes
- **Steps to Reproduce**:
  1. Enable dark theme in Obsidian
  2. Make text edits
  3. Highlighting colors are too dark to see clearly
- **Expected**: Edit highlighting should be clearly visible in all themes
- **Workaround**: Manually adjust color scheme in plugin settings
- **Fix Target**: v1.1.0
- **Assigned**: UI Team

---

## Medium Priority Issues 🟡

### [MED-001] Keyboard Shortcuts Conflict with Other Plugins
- **Plugin**: Multiple
- **Status**: Open
- **Reported**: [Date]
- **Description**: Default keyboard shortcuts conflict with popular community plugins
- **Impact**: Shortcuts may not work as expected, user confusion
- **Conflicts Identified**:
  - `Ctrl+Shift+E`: Conflicts with Excalidraw plugin
  - `Ctrl+Alt+C`: Conflicts with Calendar plugin
- **Workaround**: Manually reassign shortcuts in Obsidian settings
- **Fix Target**: v1.1.0 (change default shortcuts)

### [MED-002] Export File Names Don't Include Timestamps
- **Plugin**: Track Edits
- **Status**: Open
- **Reported**: [Date]
- **Description**: Exported edit history files don't include timestamps in filename
- **Impact**: Difficult to manage multiple exports, files may be overwritten
- **Expected**: Filename should include date/time (e.g., `edit-history-2024-01-15-143022.json`)
- **Workaround**: Manually rename exported files
- **Fix Target**: v1.0.3

### [MED-003] AI Provider Error Messages Not User-Friendly
- **Plugin**: Writerr Chat, AI Editorial Functions
- **Status**: In Progress
- **Reported**: [Date]
- **Description**: Technical error messages from AI providers are shown to users without translation
- **Impact**: Confusing user experience, difficult to troubleshoot issues
- **Examples**:
  - "HTTP 429: Rate limit exceeded" → Should show "Too many requests, please wait"
  - "Invalid API key format" → Should show "Please check your API key in settings"
- **Fix Target**: v1.0.3
- **Assigned**: UX Team

### [MED-004] Plugin Settings Not Synchronized Across Devices
- **Plugin**: All
- **Status**: Open
- **Reported**: [Date]
- **Description**: Plugin settings don't sync when using Obsidian Sync
- **Impact**: Users must reconfigure plugins on each device
- **Expected**: Settings should sync like other Obsidian data
- **Workaround**: Manually export/import settings between devices
- **Fix Target**: v1.2.0 (requires investigation of Obsidian Sync integration)

---

## Low Priority Issues 🟢

### [LOW-001] Edit Timeline Visual Polish Issues
- **Plugin**: Track Edits
- **Status**: Open
- **Reported**: [Date]
- **Description**: Edit timeline has minor visual inconsistencies and alignment issues
- **Impact**: Slightly less polished appearance, no functional impact
- **Details**:
  - Timestamps occasionally overlap with edit content
  - Timeline scrollbar styling inconsistent with Obsidian theme
  - Minor spacing issues in compact view
- **Fix Target**: v1.2.0

### [LOW-002] Function Palette Search Case Sensitivity
- **Plugin**: AI Editorial Functions
- **Status**: Open
- **Reported**: [Date]  
- **Description**: Function search is case-sensitive, requiring exact capitalization
- **Impact**: Slightly less convenient function discovery
- **Expected**: Search should be case-insensitive
- **Workaround**: Use lowercase search terms
- **Fix Target**: v1.1.0

### [LOW-003] Chat Panel Resize Handle Too Small
- **Plugin**: Writerr Chat
- **Status**: Open
- **Reported**: [Date]
- **Description**: Resize handle for chat panel is difficult to grab and use
- **Impact**: Difficult to resize chat panel to preferred width
- **Expected**: Larger, more visible resize handle
- **Workaround**: Use keyboard shortcuts to toggle panel size
- **Fix Target**: v1.1.0

---

## Resolved Issues ✅

### [RESOLVED-001] Plugin Activation Errors on Startup
- **Plugin**: All
- **Status**: Closed
- **Reported**: [Date]
- **Resolved**: [Date]
- **Description**: Plugins failed to load on Obsidian startup with dependency errors
- **Fix**: Corrected dependency loading order and added error handling
- **Version Fixed**: v1.0.1

### [RESOLVED-002] Edit History Export Corruption
- **Plugin**: Track Edits
- **Status**: Closed
- **Reported**: [Date]
- **Resolved**: [Date]
- **Description**: Large edit history exports were occasionally corrupted
- **Fix**: Implemented streaming export and data validation
- **Version Fixed**: v1.0.1

---

## Issue Reporting Guidelines

### How to Report a New Issue

1. **Search Existing Issues**: Check this document and GitHub issues first
2. **Gather Information**:
   - Plugin version numbers
   - Obsidian version
   - Operating system
   - Steps to reproduce
   - Expected vs actual behavior
   - Console errors (if any)
3. **Use the Bug Report Template** (see below)
4. **Submit via**:
   - GitHub Issues: [repository-url]
   - Community Forum: [forum-url]
   - Email: support@writerr.ai

### Bug Report Template

```markdown
**Bug Description**
Brief description of the issue

**Plugin(s) Affected**
- [ ] Track Edits
- [ ] Writerr Chat  
- [ ] AI Editorial Functions

**Environment**
- Plugin Version: 
- Obsidian Version:
- OS: 
- Other Plugins: 

**Steps to Reproduce**
1. 
2.
3.

**Expected Behavior**
What should happen

**Actual Behavior**  
What actually happens

**Screenshots/Videos**
If applicable

**Console Errors**
Any error messages from dev console

**Additional Context**
Any other relevant information
```

### Severity Guidelines

**Critical**: 
- Plugin crashes or makes Obsidian unstable
- Data loss or corruption
- Security vulnerabilities
- Core functionality completely broken

**High**:
- Major features not working
- Significant performance problems
- Issues affecting many users
- No reasonable workaround available

**Medium**:
- Minor features not working
- Moderate performance impact
- Issues with workarounds available
- Affects some users

**Low**:
- Cosmetic issues
- Minor convenience problems
- Enhancement requests
- Issues affecting few users

---

## Contributing to Issue Resolution

### For Developers

1. **Reproduce the Issue**: Confirm the issue exists in your environment
2. **Investigate Root Cause**: Use debugging tools to identify the problem
3. **Implement Fix**: Create a targeted fix that doesn't introduce new issues
4. **Test Thoroughly**: Verify fix works and doesn't break other functionality
5. **Update Documentation**: Update this file and any related documentation

### For Users

1. **Provide Detailed Reports**: Use the bug report template
2. **Test Workarounds**: Try suggested workarounds and report results
3. **Validate Fixes**: Test beta versions and confirm issues are resolved
4. **Share Feedback**: Help improve the overall user experience

### For Testers

1. **Follow Test Plans**: Use the testing documentation systematically
2. **Document Everything**: Record all findings, even minor issues
3. **Test Edge Cases**: Look for unusual scenarios that might cause problems
4. **Verify Fixes**: Confirm that resolved issues stay fixed

---

## Release Notes Integration

Issues marked as resolved will be included in release notes with:
- Issue number and description
- Impact on users
- Any breaking changes or migration steps
- Acknowledgments for reporters and contributors

---

**For urgent issues or security vulnerabilities, contact: security@writerr.ai**