---
id: chat
name: "Chat"
version: "1.0.0"
description: "Pure conversational AI assistant for general questions, brainstorming, and discussion without making any document edits."
author: "Writerr Core"
tags: ["conversation", "core", "builtin"]
icon: "message-circle"
color: "#10b981"
makesEdits: false
modelPreferences:
  temperature: 0.7
  maxTokens: 2000
  topP: 1.0
promptConfig:
  systemPrompt: "You are a helpful AI writing assistant engaged in natural conversation. You provide thoughtful responses, ask clarifying questions when needed, and offer suggestions and insights. You do not make direct edits to documents - instead, you discuss ideas, provide feedback, and help users think through their writing challenges. Be conversational, supportive, and intellectually engaging."
  userPromptTemplate: "{{userInput}}"
  contextInjection:
    includeDocument: true
    includeSelection: false
    includeVaultContext: false
    maxContextLength: 3000
    prioritization: "recency"
validation:
  input:
    - id: "min-length"
      type: "length"
      params:
        min: 1
      message: "Please enter a message to start the conversation"
  output:
    - id: "no-edits"
      type: "custom"
      params:
        checkForEditSuggestions: true
      message: "Chat mode should not suggest direct edits - provide discussion instead"
performance:
  cacheResponses: true
  cacheTTL: 300000
  memoryOptimization: "balanced"
  preload: true
---

# Chat Mode

The Chat mode provides a natural conversational interface with your AI writing assistant. This mode is perfect for:

- **General questions and discussions** about writing, research, or any topic
- **Brainstorming sessions** to explore ideas and possibilities  
- **Getting feedback** on concepts, structure, or approach
- **Problem-solving** writing challenges through dialogue
- **Learning and exploration** of new topics or techniques

## Key Features

### Pure Conversation
Chat mode never makes direct edits to your documents. Instead, it engages in thoughtful discussion, helping you think through problems and develop your ideas organically.

### Context Awareness
While it doesn't edit documents, Chat mode is aware of your current document context, allowing for relevant and informed conversations about your work.

### Flexible Interaction
- Ask open-ended questions
- Request explanations or clarifications
- Explore "what if" scenarios
- Get multiple perspectives on challenges
- Discuss writing strategies and techniques

## Best Use Cases

**Research and Exploration**
> "Can you help me understand the key themes in postmodern literature?"

**Brainstorming**
> "I'm working on a mystery novel. What are some creative ways to reveal clues?"

**Writing Process Discussion**
> "I'm struggling with the pacing in this chapter. What strategies could help?"

**Concept Development**
> "How might I approach writing about climate change for a teenage audience?"

## Context Integration

Chat mode includes your current document as context, allowing for informed discussions about:
- Content themes and ideas
- Structure and organization
- Audience and purpose
- Tone and style considerations

The AI can reference your work to provide relevant suggestions and feedback, while maintaining the conversational flow.

## Tips for Effective Chat Sessions

1. **Be specific** about what you want to discuss
2. **Ask follow-up questions** to dive deeper into topics
3. **Share your goals** so the AI can provide targeted guidance
4. **Use it for exploration** before diving into editing modes
5. **Take notes** on insights you want to implement later

## Switching to Editing Modes

When you're ready to make actual changes to your document, switch to one of the editing modes:
- **Copy Edit** for structural and stylistic improvements
- **Proofread** for grammar and mechanics corrections  
- **Writing Assistant** for creative collaboration and substantial input

Your conversation context is preserved when switching modes, ensuring continuity in your writing session.