# Default Function Library

This directory contains the four default editorial functions that come built-in with the AI Editorial Functions plugin. These functions provide comprehensive editing capabilities and serve as examples for creating custom functions.

## Available Functions

### 1. Copy Editor (`copy-editor.md`)
**Purpose**: Professional copy editing with light touch improvements for flow, clarity, and style while preserving author voice.

**Best for**: 
- General text improvement
- Blog posts and articles  
- Business communications
- Academic papers (style improvements)

**Key Features**:
- Voice preservation
- Surgical precision editing
- Flow and readability enhancement
- Minimal intervention approach

**Track Edits Integration**: Batched changes, sentence-level clustering, confidence threshold 0.8

---

### 2. Professional Proofreader (`proofreader.md`)
**Purpose**: Meticulous grammar, spelling, and punctuation corrections with zero style interference.

**Best for**:
- Final manuscript review
- Technical documentation
- Legal documents
- Academic submissions

**Key Features**:
- Grammar rule compliance
- Spelling accuracy
- Punctuation precision
- High confidence corrections (95%+)

**Track Edits Integration**: Immediate application, no clustering, confidence threshold 0.95

---

### 3. Developmental Editor (`developmental-editor.md`)
**Purpose**: Comprehensive structural analysis and content development guidance for improved organization and argument flow.

**Best for**:
- Early draft development
- Structural improvements
- Argument strengthening
- Content gap identification

**Key Features**:
- Big-picture analysis
- Structural recommendations
- Content development guidance
- Audience alignment assessment

**Track Edits Integration**: Deferred application, section-level clustering, confidence threshold 0.75, requires review

---

### 4. Co-Writer (`co-writer.md`)
**Purpose**: Creative content generation and expansion assistance with seamless voice matching and collaborative development.

**Best for**:
- Content expansion
- Creative writing assistance
- Bridge writing between sections
- Voice-matched content generation

**Key Features**:
- Voice analysis and matching
- Content generation
- Creative collaboration
- Seamless integration

**Track Edits Integration**: Batched changes, paragraph-level clustering, confidence threshold 0.70, requires review

## Usage Guidelines

### Function Selection Priority

The functions are designed with different priorities to work together effectively:

1. **Proofreader** (Priority 9) - Apply last for final corrections
2. **Copy Editor** (Priority 8) - Apply for style and clarity improvements  
3. **Developmental Editor** (Priority 6) - Apply early for structural guidance
4. **Co-Writer** (Priority 5) - Apply for content generation and expansion

### Workflow Recommendations

**For New Drafts:**
1. Start with Developmental Editor for structural analysis
2. Use Co-Writer for content expansion and gap filling
3. Apply Copy Editor for style and flow improvements
4. Finish with Proofreader for final error correction

**For Revision Work:**
1. Use Copy Editor for general improvements
2. Apply Proofreader for final polish
3. Use Developmental Editor if major structural issues exist

**For Creative Writing:**
1. Use Co-Writer for content generation and voice matching
2. Apply Copy Editor for readability improvements
3. Use Proofreader for technical accuracy

## Customization Options

Each function can be customized through its frontmatter configuration:

### Constraints
- `maxOutputLength`: Maximum words in output
- `minConfidenceScore`: Minimum confidence for changes
- `executionTimeout`: Maximum processing time
- `forbiddenPhrases`: Phrases the function should not use
- `forbiddenActions`: Actions the function should not perform

### Track Edits Configuration
- `batchingStrategy`: `immediate`, `batch`, or `defer`
- `clusterStrategy`: `none`, `sentence`, `paragraph`, or `section`
- `confidenceThreshold`: Minimum confidence for auto-application
- `changeCategories`: Types of changes this function makes
- `requiresReview`: Whether changes need user review

## Function Capabilities

### Copy Editor Capabilities
- `grammar-check`: Basic grammar improvements
- `style-improvement`: Style and flow enhancements  
- `flow-enhancement`: Sentence and paragraph flow
- `clarity-boost`: Clarity improvements
- `readability-optimization`: Overall readability

### Proofreader Capabilities  
- `grammar-check`: Strict grammar rule compliance
- `spell-check`: Spelling error detection and correction
- `punctuation-fix`: Punctuation error correction
- `capitalization-fix`: Capitalization rule compliance
- `syntax-correction`: Sentence structure corrections

### Developmental Editor Capabilities
- `structure-analysis`: Overall organization analysis
- `argument-evaluation`: Argument strength assessment
- `organization-improvement`: Structural recommendations
- `logic-assessment`: Logical flow evaluation
- `content-development`: Content gap identification

### Co-Writer Capabilities
- `content-generation`: New content creation
- `expansion-assistance`: Content expansion
- `voice-matching`: Author voice replication
- `collaborative-writing`: Collaborative content development
- `brainstorming-support`: Idea development assistance

## Performance Characteristics

| Function | Typical Processing Time | Memory Usage | Best For |
|----------|------------------------|--------------|----------|
| Copy Editor | 2-8 seconds | Medium | General improvement |
| Proofreader | 1-5 seconds | Low | Error correction |
| Developmental Editor | 5-12 seconds | High | Structural analysis |
| Co-Writer | 8-15 seconds | High | Content generation |

## Integration with Track Edits

All functions are fully integrated with the Track Edits plugin:

### Change Categorization
- **Grammar**: Subject-verb agreement, tense, syntax
- **Style**: Word choice, sentence structure, tone  
- **Clarity**: Readability, precision, conciseness
- **Flow**: Transitions, connections, pacing
- **Spelling**: Misspellings, typos, homophones
- **Punctuation**: Commas, periods, apostrophes
- **Structure**: Organization, argument flow
- **Content**: Additions, expansions, development

### Review Requirements
- **No Review Required**: Proofreader, Copy Editor
- **Review Recommended**: Developmental Editor, Co-Writer

### Confidence Thresholds
- **High (0.95)**: Proofreader - only certain corrections
- **Medium-High (0.8)**: Copy Editor - confident improvements
- **Medium (0.75)**: Developmental Editor - structural suggestions  
- **Medium-Low (0.70)**: Co-Writer - creative content generation

## Error Handling

All functions include comprehensive error handling:

- **Timeout Protection**: Automatic cancellation after specified time
- **Memory Limits**: Prevent excessive resource usage
- **Validation**: Input and output validation
- **Graceful Degradation**: Continue processing after non-critical errors
- **Error Reporting**: Detailed error messages for debugging

## Extending the Function Library

These default functions serve as templates for creating custom functions:

1. **Copy the base structure** from any existing function
2. **Modify the system prompt** for your specific needs
3. **Adjust capabilities and constraints** as needed
4. **Configure Track Edits integration** appropriately  
5. **Test thoroughly** with your content types

See the `templates/` directory for tools to help create custom functions.

## Support and Troubleshooting

### Common Issues

**Function not loading**: Check YAML frontmatter syntax
**Poor results**: Adjust confidence thresholds and constraints  
**Performance issues**: Reduce maxOutputLength or increase timeout
**Integration problems**: Verify Track Edits configuration

### Debug Mode

Enable debug mode by setting `debugMode: true` in the function registry configuration to get detailed execution logs.

### Performance Optimization

- Use appropriate clustering strategies for your content type
- Set realistic confidence thresholds  
- Configure timeouts based on content length
- Batch related changes when possible

---

*These functions are maintained by the Writerr team and updated regularly. For support, customization requests, or bug reports, please refer to the main plugin documentation.*