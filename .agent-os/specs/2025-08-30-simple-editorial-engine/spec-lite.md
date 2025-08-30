# Simple Editorial Engine Replacement - Lite Summary

Replace the overly complex Editorial Engine that's sending empty changes `{from: 0, to: 0, text: ""}` with a simplified "lobotomized" version that removes constraint compilation, validation rules, and NLP overhead while focusing purely on the core pipeline.

## Key Points
- Remove complex constraint compilation system causing empty change objects
- Implement simple diff-based processing: AI corrections → text diff → individual changes → Million Monkeys
- Preserve existing adapter registration and Chat integration for seamless replacement
- Maintain mode file compatibility from `/modes/` directory without format changes
- Focus on reliability over "smart" features to get Track Edits decorations working