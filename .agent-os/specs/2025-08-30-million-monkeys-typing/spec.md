# Spec Requirements Document

> Spec: Million Monkeys Typing - Granular AI Edit Detection
> Created: 2025-08-30

## Overview

Replace wholesale AI document rewrites with sequential text application that simulates fast human typing, allowing Track Edits' existing change detection to generate granular, reviewable decorations instead of highlighting entire documents as single changes.

## User Stories

### Writer Using AI Proofreading

As a writer, I want to see specific changes when AI proofreads my text, so that I can review and accept/reject individual edits rather than being overwhelmed by an entirely highlighted document.

When a writer selects "Proofreader" mode and sends text through the Chat interface, the AI processes the text and applies changes sequentially to the document like a very fast human typist. Track Edits detects each individual change (spelling corrections, grammar fixes, word replacements) and displays them as separate reviewable decorations, giving the writer granular control over accepting or rejecting specific improvements.

### Writer Using AI Copy Editing

As a writer, I want to distinguish between different types of editorial changes (grammar vs style vs word choice), so that I can make informed decisions about which AI suggestions to accept.

The sequential application approach allows Track Edits to capture each change as it happens, maintaining the natural granularity that shows "changed 'grammer' to 'grammar'" as one decoration and "restructured sentence" as separate decorations, rather than showing the entire paragraph as one giant change.

## Spec Scope

1. **Sequential Text Application** - Replace current `applyChange()` API calls with simulated human typing that applies AI changes word-by-word or character-by-character to the document.

2. **Timing Configuration** - Implement configurable delays (1-10ms) between changes to ensure Track Edits' CodeMirror integration detects each individual edit.

3. **Editorial Engine Integration** - Modify the Editorial Engine's Track Edits integration to use document editing simulation instead of wholesale API replacement.

4. **Change Granularity Optimization** - Implement intelligent change chunking that respects word boundaries and natural editing patterns for optimal Track Edits detection.

5. **Performance Optimization** - Ensure total application time remains under 100ms for typical documents while maintaining change detection accuracy.

## Out of Scope

- Rewriting Track Edits' existing diff algorithms
- Creating new APIs or plugin interfaces
- Modifying Track Edits plugin code
- Complex text comparison algorithm development
- User interface changes to Track Edits
- Integration with plugins other than Editorial Engine

## Expected Deliverable

1. Writers see granular, reviewable decorations for each AI edit instead of entire documents highlighted as single changes.

2. Chat → Editorial Engine → Track Edits pipeline produces specific change decorations (e.g., "grammer" → "grammar" highlighted separately from other changes).

3. AI editing performance remains instantaneous (< 100ms) while generating multiple discrete Track Edits decorations for writer review.