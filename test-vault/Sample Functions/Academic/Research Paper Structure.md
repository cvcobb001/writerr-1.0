# Research Paper Structure Assistant

**Function ID**: `academic-research-structure`
**Category**: Academic Writing
**Mode**: Research Paper

## Function Description

This function analyzes academic text and provides suggestions for improving research paper structure, argumentation flow, and academic writing conventions.

## Usage Examples

### Input Text
```
The effects of climate change are significant. Many studies have shown this. Temperature increases are happening globally. This causes problems for ecosystems. Solutions need to be implemented.
```

### Expected Output
```
The relationship between climate change and global temperature increases has been extensively documented in the literature (Author, 2023; Smith et al., 2022). These temperature increases manifest as significant disruptions to ecosystems worldwide, necessitating comprehensive mitigation strategies.

**Structural Recommendations:**
1. Develop a stronger thesis statement
2. Add proper academic citations
3. Improve paragraph transitions
4. Strengthen argument progression
5. Include quantitative evidence where possible

**Academic Writing Improvements:**
- Use more precise academic vocabulary
- Implement proper citation format
- Strengthen causal relationships between ideas
- Add transitional phrases for better flow
```

## Function Configuration

```json
{
  "functionId": "academic-research-structure",
  "name": "Research Paper Structure Assistant",
  "category": "academic",
  "mode": "research-paper",
  "description": "Analyzes and improves research paper structure and academic writing style",
  "parameters": {
    "citationStyle": "APA",
    "analysisDepth": "comprehensive",
    "includeRecommendations": true,
    "checkArgumentFlow": true,
    "suggestCitations": true
  },
  "prompts": {
    "primary": "Analyze this academic text for research paper structure, argumentation flow, and academic writing conventions. Provide specific recommendations for improvement.",
    "followUp": "Focus on strengthening the thesis statement and improving logical flow between paragraphs."
  }
}
```

## Testing Scenarios

### Scenario 1: Weak Thesis Statement
**Input**: "This paper discusses environmental issues and their impact."
**Expected**: Strengthened thesis with specific claim and roadmap

### Scenario 2: Poor Citation Integration  
**Input**: "Studies show that pollution is bad. (Smith 2020)"
**Expected**: Improved integration of citations into sentence flow

### Scenario 3: Argument Structure
**Input**: Multiple paragraphs with unclear logical progression
**Expected**: Recommendations for improved argument sequencing

### Scenario 4: Academic Vocabulary
**Input**: Informal language in academic context
**Expected**: Suggestions for more appropriate academic terminology

## Success Criteria

- [ ] Identifies structural weaknesses in academic writing
- [ ] Provides specific, actionable recommendations
- [ ] Maintains academic tone and style
- [ ] Suggests appropriate citation integration
- [ ] Improves logical flow between ideas
- [ ] Response time under 3 seconds
- [ ] Preserves original meaning while improving structure