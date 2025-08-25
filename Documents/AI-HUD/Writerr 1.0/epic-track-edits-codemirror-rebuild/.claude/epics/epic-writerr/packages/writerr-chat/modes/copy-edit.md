---
id: copy-edit
name: "Copy Edit"
version: "1.0.0"
description: "Professional copy editing focused on structure, style, clarity, and flow improvements. All changes are routed through Track Edits for review."
author: "Writerr Core"
tags: ["editing", "style", "structure", "core", "builtin"]
icon: "edit-3"
color: "#3b82f6"
makesEdits: true
trackEdits:
  enabled: true
  editType: "style"
  clusteringStrategy: "proximity"
  autoApply: false
modelPreferences:
  temperature: 0.3
  maxTokens: 3000
  topP: 0.9
  frequencyPenalty: 0.1
promptConfig:
  systemPrompt: "You are a professional copy editor with expertise in improving clarity, flow, structure, and style. Focus on making text more engaging, readable, and effective while preserving the author's voice and intent. Suggest improvements for sentence structure, word choice, transitions, paragraph organization, and overall coherence. Always explain the reasoning behind your edits. When working with selections, focus specifically on the selected text while considering its context within the larger document."
  userPromptTemplate: "Please copy edit the following text{{#if selection}} (selected portion){{/if}}: {{selection || document}}{{#if userInput}}

Additional instructions: {{userInput}}{{/if}}"
  contextInjection:
    includeDocument: true
    includeSelection: true
    includeVaultContext: false
    maxContextLength: 5000
    prioritization: "proximity"
  constraints:
    - "Preserve the author's voice and intended meaning"
    - "Explain the reasoning behind significant changes"
    - "Focus on clarity, flow, and readability improvements"
    - "Suggest rather than impose - let the author decide"
    - "Consider the document's audience and purpose"
  examples:
    - input: "The meeting was attended by many people and it went on for a long time and covered many topics."
      output: "Many people attended the lengthy meeting, which covered numerous topics."
      context: "Improved conciseness and eliminated redundancy"
validation:
  input:
    - id: "has-content"
      type: "length"
      params:
        min: 10
      message: "Please select text or ensure your document has content to copy edit"
  output:
    - id: "has-edits"
      type: "custom"
      params:
        requiresEdits: true
      message: "Copy edit mode should provide specific editing suggestions"
performance:
  cacheResponses: true
  cacheTTL: 600000
  memoryOptimization: "high"
  preload: true
---

# Copy Edit Mode

Copy Edit mode provides professional-level editing focused on improving the structure, style, clarity, and flow of your writing. This mode works seamlessly with the Track Edits system to help you review and implement improvements systematically.

## Key Features

### Professional Copy Editing
- **Structural improvements**: Better paragraph organization and logical flow
- **Style enhancement**: More engaging and readable prose
- **Clarity optimization**: Clearer expression of ideas and concepts  
- **Voice preservation**: Maintains your unique writing style and intent

### Track Edits Integration
All suggestions are routed through the Track Edits system, allowing you to:
- Review changes before applying them
- See edit reasoning and explanations
- Accept or reject suggestions individually
- Maintain version control of your document

### Contextual Awareness
Copy Edit mode considers:
- The selected text's role in the larger document
- Document audience and purpose
- Consistency with surrounding content
- Overall document structure and flow

## Best Use Cases

**Structural Improvements**
- Reorganizing paragraphs for better flow
- Improving transitions between ideas
- Enhancing logical progression of arguments
- Clarifying complex concepts

**Style Enhancement**
- Varying sentence structure for better rhythm
- Improving word choice for precision and impact
- Eliminating redundancy and wordiness
- Enhancing readability and engagement

**Clarity Optimization**
- Simplifying complex sentences
- Clarifying ambiguous statements
- Improving parallel structure
- Strengthening weak constructions

## Working with Selections

Copy Edit mode is particularly effective when working with specific text selections:

1. **Select problematic passages** you want to improve
2. **Provide specific instructions** in your message (optional)
3. **Review suggested changes** in Track Edits
4. **Apply changes** that align with your vision

## Example Interactions

**Basic Copy Edit Request**
> Select a paragraph and send: "Please improve the flow and clarity"

**Targeted Style Improvement**  
> "Make this section more engaging for a general audience"

**Structure Focus**
> "Help reorganize these ideas for better logical progression"

**Consistency Check**
> "Ensure this section matches the tone of the rest of the document"

## Edit Categories

Copy Edit mode addresses:

**Sentence Level**
- Clarity and conciseness
- Parallel structure
- Active vs. passive voice
- Variety in sentence length and structure

**Paragraph Level**  
- Topic sentence effectiveness
- Supporting detail organization
- Transition quality
- Coherence and unity

**Document Level**
- Overall flow and progression
- Consistency in tone and style
- Audience appropriateness
- Purpose alignment

## Track Edits Features

### Edit Clustering
Related edits are grouped by proximity for easier review.

### Detailed Explanations
Each suggested edit includes reasoning to help you understand the improvement.

### Flexible Application
- Review all changes before applying
- Accept/reject individual suggestions
- Batch apply similar types of edits
- Maintain edit history for future reference

## Best Practices

1. **Work in sections** - Edit portions at a time for manageable reviews
2. **Provide context** - Share specific goals or concerns in your instructions
3. **Review explanations** - Understand the reasoning behind suggestions
4. **Maintain your voice** - Accept changes that align with your style
5. **Iterate as needed** - Make multiple passes for complex improvements

## Switching Between Modes

Copy Edit mode works well in combination with other modes:
- **Start with Chat** for discussing overall approach
- **Use Writing Assistant** for substantial content development
- **Follow with Proofread** for final grammar and mechanics cleanup