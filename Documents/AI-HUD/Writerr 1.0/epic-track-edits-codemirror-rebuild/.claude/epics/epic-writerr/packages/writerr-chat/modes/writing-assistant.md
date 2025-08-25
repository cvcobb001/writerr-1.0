---
id: writing-assistant
name: "Writing Assistant"
version: "1.0.0"
description: "Creative collaboration partner for content development, expansion, and substantial writing assistance. Generates new content and helps develop ideas."
author: "Writerr Core"
tags: ["creative", "writing", "development", "collaboration", "core", "builtin"]
icon: "feather"
color: "#8b5cf6"
makesEdits: true
trackEdits:
  enabled: true
  editType: "creative"
  clusteringStrategy: "ml-inspired"
  autoApply: false
modelPreferences:
  temperature: 0.8
  maxTokens: 4000
  topP: 0.95
  frequencyPenalty: 0.3
  presencePenalty: 0.2
promptConfig:
  systemPrompt: "You are a creative writing assistant and collaborative partner. Help develop, expand, and enhance written content through substantial contributions. You can generate new paragraphs, develop ideas, create examples, write transitions, and provide creative input. Match the author's voice and style while bringing fresh perspectives and creative solutions. When expanding content, ensure new material flows naturally with existing text and serves the document's purpose."
  userPromptTemplate: "{{#if selection}}Based on this selected text: {{selection}}

{{/if}}{{#if document}}Document context: {{document}}

{{/if}}Writing assistance request: {{userInput}}"
  contextInjection:
    includeDocument: true
    includeSelection: true
    includeVaultContext: true
    maxContextLength: 6000
    prioritization: "relevance"
  constraints:
    - "Match the author's voice, tone, and style"
    - "Ensure new content integrates seamlessly with existing text"
    - "Provide substantial, creative contributions"
    - "Consider the document's audience and purpose"
    - "Offer multiple approaches when appropriate"
  examples:
    - input: "Expand this paragraph about climate change impacts with specific examples"
      output: "Generated detailed examples of climate impacts with supporting data and vivid descriptions"
      context: "Content expansion with concrete details"
    - input: "Write a transition between these two sections about different historical periods"
      output: "Crafted smooth transition highlighting the connections between the time periods"
      context: "Structural writing assistance"
    - input: "Develop this character description with more personality and background"
      output: "Added personality traits, background details, and distinctive characteristics"
      context: "Creative character development"
validation:
  input:
    - id: "clear-request"
      type: "length"
      params:
        min: 10
      message: "Please provide clear instructions for what you'd like me to help write or develop"
  output:
    - id: "substantial-content"
      type: "custom"
      params:
        requiresSubstantialAddition: true
      message: "Writing Assistant should provide substantial new content or significant enhancements"
performance:
  cacheResponses: false
  memoryOptimization: "high"
  preload: true
---

# Writing Assistant Mode

Writing Assistant mode is your creative collaboration partner for developing, expanding, and enhancing your written content. This mode provides substantial writing contributions while maintaining your unique voice and style.

## Key Features

### Creative Collaboration
- **Content generation**: New paragraphs, sections, and ideas
- **Content expansion**: Develop existing ideas with detail and examples
- **Creative solutions**: Fresh approaches to writing challenges
- **Voice matching**: Seamlessly integrates with your writing style

### Substantial Contributions
Unlike other modes that focus on corrections or refinements, Writing Assistant provides:
- **New content creation** based on your prompts and context
- **Significant expansions** of existing material
- **Creative development** of ideas and concepts
- **Structural additions** like transitions and bridges

### Intelligent Integration
All additions are designed to:
- **Flow naturally** with your existing content
- **Match your established tone** and style
- **Serve your document's purpose** and audience
- **Maintain consistency** throughout

## Best Use Cases

### Content Development
**Expanding Ideas**
> "Expand this introduction with a compelling hook and preview of main points"

**Adding Examples**  
> "Add 2-3 specific examples to illustrate this concept about renewable energy"

**Developing Arguments**
> "Strengthen this argument with additional supporting evidence and reasoning"

### Creative Writing
**Character Development**
> "Develop this character with more personality, background, and distinctive traits"

**Scene Building**
> "Expand this scene with sensory details and dialogue to make it more vivid"

**Plot Development**
> "Help me bridge these two plot points with a compelling sequence of events"

### Academic & Professional Writing
**Research Integration**
> "Help me weave these research findings into a coherent argument"

**Technical Explanation**
> "Explain this complex process in terms accessible to a general audience"

**Executive Summary**
> "Create an executive summary that captures the key points and recommendations"

## Collaboration Approaches

### 1. Content Expansion
Perfect for when you have solid ideas that need development:
- Select existing text to expand
- Specify what type of expansion you need
- Review and integrate the generated content

### 2. Gap Filling  
Ideal for connecting existing pieces:
- Identify gaps in your content flow
- Request transitions, bridges, or connecting material
- Maintain logical progression throughout

### 3. Creative Development
Best for exploring new directions:
- Share your creative challenges or goals
- Request alternative approaches or fresh perspectives
- Iterate on ideas until you find the right fit

### 4. Style Matching
Maintains consistency across your document:
- AI analyzes your existing style and tone
- New content matches your established voice
- Seamless integration with existing material

## Working with Context

### Document Awareness
Writing Assistant considers your entire document context:
- **Overall structure** and organization
- **Established themes** and arguments
- **Audience and purpose** indicators
- **Style and tone** patterns

### Selection-Based Work
When you select specific text:
- **Targeted development** of selected content
- **Contextual awareness** of surrounding material  
- **Precise integration** at the selection point
- **Style matching** from adjacent text

### Vault-Wide Context
For complex projects, includes relevant context from:
- **Related documents** in your vault
- **Research notes** and references
- **Project documentation** and outlines
- **Previous drafts** and iterations

## Example Workflows

### Essay Development
1. **Draft outline** and key points
2. **Request paragraph development** for each main point
3. **Add transitions** between sections
4. **Expand conclusion** with broader implications

### Creative Writing Enhancement
1. **Develop character profiles** with detailed backgrounds
2. **Expand scenes** with sensory details and dialogue
3. **Create plot bridges** between major events
4. **Add thematic depth** through symbolic elements

### Business Writing
1. **Develop executive summary** from key points
2. **Add supporting evidence** to recommendations
3. **Create compelling introductions** for proposals
4. **Expand technical explanations** for different audiences

## Track Edits Integration

### Creative Edit Clustering
Uses ML-inspired clustering to group related creative additions:
- **Content expansions** grouped by topic
- **Stylistic enhancements** clustered together
- **Structural additions** organized by function
- **Character/theme development** grouped by element

### Comprehensive Review
Each contribution includes:
- **Integration points** showing where content fits
- **Style analysis** explaining voice matching decisions
- **Purpose alignment** demonstrating goal achievement
- **Alternative options** when multiple approaches work

### Flexible Application
- **Preview additions** before integrating them
- **Modify generated content** to better fit your vision
- **Accept partial suggestions** and iterate
- **Maintain version history** of creative development

## Best Practices

### Clear Communication
1. **Specify your goals** - what you want to achieve
2. **Provide context** - share relevant background information
3. **Indicate style preferences** - formal, casual, technical, creative
4. **Set scope boundaries** - how much expansion or development you want

### Effective Collaboration
1. **Work iteratively** - build content in stages
2. **Review and refine** - adjust generated content to your vision
3. **Maintain your voice** - ensure additions feel authentic to you
4. **Use your judgment** - you're the author, AI is the assistant

### Integration Strategy
1. **Start with outlines** - establish structure before details
2. **Develop section by section** - maintain focus and coherence
3. **Check flow and transitions** - ensure smooth reading experience
4. **Review for consistency** - maintain style and tone throughout

## Switching Between Modes

Writing Assistant works effectively with other modes:
- **Chat mode** for brainstorming and planning
- **Copy Edit** for refining generated content
- **Proofread** for final error correction
- Return to **Writing Assistant** for additional development

Your creative collaboration session context is preserved when switching modes, ensuring continuity in your writing project.