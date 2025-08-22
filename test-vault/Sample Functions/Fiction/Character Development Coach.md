# Character Development Coach

**Function ID**: `fiction-character-development`
**Category**: Fiction Writing
**Mode**: Creative Writing

## Function Description

This function analyzes character descriptions and dialogue to provide suggestions for deeper character development, consistency, and more authentic character voice. It helps writers create more compelling, three-dimensional characters.

## Usage Examples

### Input Text
```
Sarah walked into the room. She was tall and had brown hair. She was angry about what happened at work. "I can't believe my boss did that," she said. She sat down and looked upset.
```

### Expected Output
```
**Enhanced Character Development:**

Sarah's heels clicked against the hardwood floor, each step echoing her frustration as she entered the living room. At nearly six feet tall, she had to duck slightly under the doorframe—a constant reminder of how she never quite fit into spaces designed for others. Her chestnut hair, usually perfectly styled for client meetings, now hung loose around her shoulders, several strands having escaped during her hurried commute home.

"I can't believe Henderson threw me under the bus like that," she muttered, her voice carrying the controlled fury of someone who'd spent years learning to mask her emotions in corporate boardrooms. She collapsed onto the couch with uncharacteristic gracelessness, her usually impeccable posture crumbling as the weight of the day settled on her shoulders.

**Character Development Suggestions:**

**Physical Details:**
- Add specific, meaningful physical traits that reflect personality or background
- Use physical actions that reveal emotional state
- Consider how physical presence affects interactions with environment

**Voice & Dialogue:**
- Give the character specific speech patterns or vocabulary
- Use dialogue to reveal background, personality, and relationships
- Show character's emotional state through how they speak, not just what they say

**Internal Consistency:**
- Establish character motivations that drive actions
- Create behavioral patterns that feel authentic
- Develop backstory elements that inform present reactions

**Emotional Depth:**
- Show emotions through actions and reactions, not just statements
- Layer multiple emotions (anger + disappointment + fear)
- Connect current emotions to character history or goals
```

## Function Configuration

```json
{
  "functionId": "fiction-character-development",
  "name": "Character Development Coach",
  "category": "fiction",
  "mode": "creative-writing",
  "description": "Analyzes and enhances character development through improved description, dialogue, and psychological depth",
  "parameters": {
    "analysisType": "comprehensive",
    "focusAreas": ["dialogue", "description", "motivation", "consistency"],
    "provideSuggestions": true,
    "enhanceExample": true,
    "genreConsideration": "general",
    "characterAge": "adult"
  },
  "prompts": {
    "primary": "Analyze this character writing and provide suggestions for deeper character development, more authentic dialogue, and stronger emotional resonance.",
    "followUp": "Focus on making the character's voice and actions more distinctive and psychologically believable."
  }
}
```

## Testing Scenarios

### Scenario 1: Flat Character Description
**Input**: Basic character description without depth
**Expected**: Enhanced description with meaningful details and personality

### Scenario 2: Generic Dialogue
**Input**: Conversation that could be spoken by any character
**Expected**: Dialogue suggestions that reflect unique character voice

### Scenario 3: Inconsistent Character Behavior
**Input**: Character acting in ways that contradict established traits
**Expected**: Analysis of inconsistencies with suggestions for alignment

### Scenario 4: Character Relationship Dynamics
**Input**: Interaction between multiple characters
**Expected**: Suggestions for deepening relationships and improving dynamics

### Scenario 5: Character Motivation Issues
**Input**: Character making decisions without clear motivation
**Expected**: Analysis of motivation gaps with suggestions for improvement

## Advanced Features

### Character Arc Analysis
- Identifies character growth opportunities
- Suggests progression markers
- Analyzes character change over time

### Voice Consistency Check
- Compares dialogue across scenes
- Identifies voice inconsistencies
- Suggests speech pattern improvements

### Relationship Mapping
- Analyzes character dynamics
- Suggests relationship development opportunities
- Identifies conflict potential

## Success Criteria

- [ ] Provides specific, actionable character development suggestions
- [ ] Enhances character voice and authenticity
- [ ] Identifies consistency issues across character portrayal
- [ ] Offers concrete examples of improvement
- [ ] Maintains creative voice while adding depth
- [ ] Suggests psychological motivation for actions
- [ ] Response time under 4 seconds
- [ ] Preserves genre conventions and tone

## Common Character Development Issues Addressed

1. **One-dimensional characters**: Adding psychological depth and complexity
2. **Generic dialogue**: Creating distinctive character voices
3. **Inconsistent behavior**: Aligning actions with established character traits
4. **Weak motivation**: Strengthening reasons behind character decisions
5. **Static characters**: Suggesting growth and change opportunities
6. **Unrealistic reactions**: Improving emotional authenticity
7. **Poor relationship dynamics**: Enhancing character interactions