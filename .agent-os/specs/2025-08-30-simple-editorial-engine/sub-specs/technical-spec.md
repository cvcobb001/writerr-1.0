# Technical Specification

This is the technical specification for the spec detailed in @.agent-os/specs/2025-08-30-simple-editorial-engine/spec.md

> Created: 2025-08-30
> Version: 1.0.0

## Technical Requirements

### Core Architecture Simplification
- **Remove Constraint Compilation**: Eliminate the complex constraint compilation system that processes natural language editing preferences into programmatic rulesets
- **Remove Validation Engine**: Remove rule validation and processing overhead
- **Remove NLP Processing**: Eliminate natural language parsing that's causing processing failures
- **Preserve Integration Points**: Maintain existing adapter registration system and Chat plugin integration

### New Simplified Pipeline
1. **Mode File Loading**: Continue reading from existing `/modes/` directory with current file format
2. **Text Diff Engine**: Implement simple character-level or word-level diffing between original text and AI corrections
3. **Change Extraction**: Convert diff results into individual change objects with proper `{from, to, text}` values
4. **Sequential Processing**: Pass individual changes to Million Monkeys processor in sequence
5. **Track Edits Integration**: Ensure changes appear as editor decorations

### Backward Compatibility Requirements
- **API Surface**: Maintain existing public methods and events for other plugins
- **Adapter System**: Preserve current adapter registration and communication patterns
- **Mode Files**: Support existing mode file format without changes
- **Integration Events**: Continue emitting expected events for Chat and Million Monkeys

## Approach

### Implementation Strategy
1. **Identify Core Components**: Analyze current Editorial Engine to identify essential vs. complex components
2. **Create Minimal Pipeline**: Build new simplified pipeline focusing only on text diffing and change passing
3. **Preserve Interfaces**: Keep existing external interfaces while gutting internal complexity
4. **Test Integration**: Verify Chat → Editorial Engine → Million Monkeys flow works with real changes

### Text Diffing Approach
- **Library Selection**: Use established diff library (e.g., diff-match-patch or similar)
- **Change Granularity**: Process changes at word/phrase level for meaningful Track Edits
- **Position Mapping**: Ensure accurate `from` and `to` positions for editor integration
- **Empty Change Prevention**: Add validation to prevent `{from: 0, to: 0, text: ""}` objects

### Mode File Integration
- **Existing Loader**: Reuse current mode file loading mechanism
- **Simplified Usage**: Use mode files for basic configuration without complex constraint processing
- **Error Handling**: Provide graceful fallbacks if mode files are malformed

## External Dependencies

### Existing Dependencies to Maintain
- **Million Monkeys Plugin**: Sequential change processor and Track Edits decorator
- **Chat Plugin**: Source of AI corrections and editing requests
- **Obsidian Editor API**: For text manipulation and decoration integration
- **Mode Files**: Existing configuration files in `/modes/` directory

### New Dependencies to Add
- **Diff Library**: Text diffing utility (consider `diff-match-patch` or native implementation)
- **Position Utilities**: Helper functions for accurate text position calculation

### Dependencies to Remove
- **Constraint Compilation Engine**: Complex natural language processing components
- **Validation Framework**: Rule validation and checking systems
- **Advanced Parsing Libraries**: Any NLP or complex text analysis dependencies