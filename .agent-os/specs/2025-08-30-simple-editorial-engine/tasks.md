# Spec Tasks

These are the tasks to be completed for the spec detailed in @.agent-os/specs/2025-08-30-simple-editorial-engine/spec.md

> Created: 2025-08-30
> Status: Ready for Implementation

## Tasks

### Phase 1: Analysis and Architecture
- [x] **Analyze Current Editorial Engine**: Review existing codebase to identify components causing empty change objects
- [x] **Identify Integration Points**: Map out all external API calls and events that must be preserved
- [x] **Document Current Flow**: Trace the path from Chat → Editorial Engine → Million Monkeys to understand break points
- [x] **Select Diff Library**: Research and choose appropriate text diffing library or implement simple native solution

### Phase 2: Core Pipeline Implementation  
- [x] **Create Simplified Engine Class**: Build new Editorial Engine class that KEEPS ruleset compiler but removes constraint processor
- [x] **Preserve Ruleset Compiler**: Keep existing mode file → compiled constraints functionality (the "waiter")
- [x] **Build Text Diff Engine**: Implement diffing between original text and AI corrections using diff-match-patch
- [x] **Create Change Extraction**: Convert diff results to proper `{from, to, text}` change objects
- [x] **Replace Constraint Processor**: Remove complex validation logic that creates empty changes, replace with direct AI→diff pipeline

### Phase 3: Integration Preservation
- [x] **Maintain Adapter Registration**: Preserve existing adapter system for other plugins
- [x] **Keep Chat Integration**: Ensure Chat plugin can continue sending correction requests
- [x] **Preserve Million Monkeys Flow**: Maintain sequential processing pipeline to Track Edits
- [x] **Update Event Emissions**: Ensure all expected events are still emitted for dependent plugins

### Phase 4: Testing and Validation
- [x] **Unit Test Diff Engine**: Test text diffing with various correction scenarios
- [x] **Integration Test Pipeline**: Verify end-to-end flow from Chat request to Track Edits decoration
- [x] **Test Mode File Compatibility**: Ensure existing mode files continue to work
- [x] **Validate Change Objects**: Confirm all changes have proper position values and content

### Phase 5: Deployment and Cleanup
- [x] **Replace Editorial Engine**: Swap out complex engine with simplified version
- [x] **Remove Dead Code**: Clean up constraint-processor.ts and complex validation components (KEEP ruleset-compiler.ts)
- [x] **Update Documentation**: Reflect simplified architecture in any technical docs
- [x] **Monitor Real Usage**: Verify Track Edits appear correctly with real AI corrections