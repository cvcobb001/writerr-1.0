---
id: proofread
name: "Proofread"
version: "1.0.0"
description: "Precise proofreading focused on grammar, punctuation, spelling, and mechanical errors with minimal content changes."
author: "Writerr Core"
tags: ["proofreading", "grammar", "mechanics", "core", "builtin"]
icon: "check-circle"
color: "#ef4444"
makesEdits: true
trackEdits:
  enabled: true
  editType: "grammar"
  clusteringStrategy: "category"
  autoApply: false
modelPreferences:
  temperature: 0.1
  maxTokens: 2500
  topP: 0.8
  frequencyPenalty: 0.0
  presencePenalty: 0.0
promptConfig:
  systemPrompt: "You are a meticulous proofreader focused exclusively on correcting grammatical errors, punctuation mistakes, spelling errors, and mechanical issues. Make minimal changes that preserve the author's original voice, style, and meaning. Only suggest content changes when absolutely necessary for grammatical correctness. Categorize errors clearly (grammar, punctuation, spelling, mechanics) and provide brief explanations for non-obvious corrections."
  userPromptTemplate: "Please proofread the following text{{#if selection}} (selected portion){{/if}} for grammar, punctuation, spelling, and mechanical errors: {{selection || document}}{{#if userInput}}

Focus areas: {{userInput}}{{/if}}"
  contextInjection:
    includeDocument: true
    includeSelection: true
    includeVaultContext: false
    maxContextLength: 4000
    prioritization: "proximity"
  constraints:
    - "Make only necessary corrections - preserve original content"
    - "Focus on grammar, punctuation, spelling, and mechanics"
    - "Avoid style changes unless they fix grammatical issues"
    - "Categorize errors for better understanding"
    - "Provide explanations for complex corrections"
  examples:
    - input: "Their going to there house to see they're new furniture."
      output: "They're going to their house to see their new furniture."
      context: "Corrected homophone errors (grammar/spelling)"
    - input: "The report which was submitted yesterday, needs revision."
      output: "The report, which was submitted yesterday, needs revision."
      context: "Added necessary comma (punctuation)"
    - input: "She don't want to go with us."
      output: "She doesn't want to go with us."
      context: "Corrected subject-verb agreement (grammar)"
validation:
  input:
    - id: "has-content"
      type: "length"
      params:
        min: 5
      message: "Please select text or ensure your document has content to proofread"
  output:
    - id: "minimal-changes"
      type: "custom"
      params:
        preserveContent: true
      message: "Proofreading should make minimal changes to preserve author's voice"
performance:
  cacheResponses: true
  cacheTTL: 900000
  memoryOptimization: "balanced"
  preload: true
---

# Proofread Mode

Proofread mode provides precise, focused correction of grammatical errors, punctuation mistakes, spelling errors, and mechanical issues while preserving your original voice and content. This is your final polish step before publishing or sharing your work.

## Key Features

### Focused Error Correction
- **Grammar**: Subject-verb agreement, tense consistency, pronoun usage
- **Punctuation**: Commas, semicolons, apostrophes, quotation marks
- **Spelling**: Typos, homophone errors, proper nouns
- **Mechanics**: Capitalization, hyphenation, number formatting

### Minimal Content Changes
Proofreading focuses exclusively on correctness without altering:
- Your writing style or voice
- Content structure or organization  
- Word choice (unless incorrect)
- Sentence length or complexity

### Error Categorization
Track Edits groups corrections by type for easier review:
- Grammar corrections
- Punctuation fixes
- Spelling corrections
- Mechanical adjustments

## Error Types Addressed

### Grammar Errors
- **Subject-verb disagreement**: "The team are" → "The team is"
- **Tense inconsistency**: Mixed past and present tenses
- **Pronoun errors**: "Between you and I" → "Between you and me"
- **Dangling modifiers**: Unclear sentence construction

### Punctuation Issues
- **Comma splices**: Independent clauses incorrectly joined
- **Missing commas**: Required commas in series, after introductory elements
- **Apostrophe errors**: Possessive vs. plural confusion
- **Quotation marks**: Proper placement and nesting

### Spelling Mistakes
- **Typos**: "recieve" → "receive"
- **Homophones**: "there/their/they're" confusion
- **Common misspellings**: "separate," "definitely," "occurred"
- **Proper nouns**: Capitalization and spelling of names/places

### Mechanical Errors
- **Capitalization**: Sentence beginnings, proper nouns, titles
- **Hyphenation**: Compound words and modifiers
- **Number formatting**: Consistency in numerical expressions
- **Abbreviations**: Proper periods and spacing

## Working Process

### 1. Selection-Based Proofreading
- **Select specific paragraphs** for focused review
- **Highlight problem areas** you've noticed
- **Process large documents** in manageable sections

### 2. Full Document Review
- **Complete proofreading** of entire document
- **Systematic error detection** across all content
- **Consistency checking** throughout

### 3. Targeted Focus Areas
Specify focus areas in your request:
- "Focus on comma usage"
- "Check for tense consistency"
- "Review apostrophe placement"
- "Verify proper noun capitalization"

## Example Interactions

**Basic Proofreading**
> Select text and send: "Please proofread for all errors"

**Focused Review**
> "Check this paragraph for comma and apostrophe errors"

**Specific Grammar Check**
> "Review for subject-verb agreement and tense consistency"

**Final Polish**
> "Complete proofread before publication - catch any remaining errors"

## Track Edits Integration

### Categorized Corrections
Edits are grouped by error type:
- **Grammar** (red): Structural language errors
- **Punctuation** (blue): Comma, period, apostrophe issues  
- **Spelling** (green): Typos and misspellings
- **Mechanics** (purple): Capitalization and formatting

### Detailed Explanations
Each correction includes:
- **Error category** for learning
- **Brief explanation** of the rule applied
- **Before/after comparison** for clarity

### Batch Processing
- **Review by category** - focus on one error type at a time
- **Accept similar fixes** in batches for efficiency
- **Skip questionable changes** that might alter your voice

## Best Practices

### Effective Proofreading
1. **Complete content editing first** - structure and style before mechanics
2. **Work in small sections** for thorough review
3. **Read corrections carefully** - ensure they preserve your meaning
4. **Learn from patterns** - notice recurring error types
5. **Do final review** after accepting all changes

### Preserving Your Voice
- **Review explanations** to understand corrections
- **Reject changes** that alter your intended meaning
- **Maintain style consistency** across your document
- **Trust your instincts** about voice and tone

### Integration with Other Modes
Use Proofread mode as the final step in your editing process:
1. **Chat mode** - discuss content and approach
2. **Writing Assistant** - develop and expand ideas
3. **Copy Edit** - improve structure and style
4. **Proofread** - final error correction and polish

## Common Error Patterns

### Frequent Grammar Issues
- Comma splices with compound sentences
- Subject-verb disagreement with collective nouns
- Pronoun-antecedent disagreement
- Inconsistent verb tenses

### Punctuation Pitfalls
- Missing commas in complex sentences
- Incorrect apostrophe usage in possessives
- Quotation mark placement with punctuation
- Semicolon vs. comma usage

### Spelling Challenges
- Homophone confusion (your/you're, its/it's)
- Double letter words (occurred, beginning)
- Silent letters (knife, psychology)
- Borrowed words from other languages

The Proofread mode ensures your writing meets professional standards while maintaining your unique voice and style.