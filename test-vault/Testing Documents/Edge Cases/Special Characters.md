# Special Characters Test Document

This document contains various special characters and encoding scenarios to test plugin handling of edge cases.

## Unicode Characters

### Accented Characters
café, naïve, résumé, piñata, Zürich

### Emoji and Symbols
🚀 🎯 💡 ✨ 🌟 🔥 ⭐ 💪 🎨 📝
→ ← ↑ ↓ ⇄ ⟲ ⟳ ∞ ≈ ≠ ≤ ≥
α β γ δ ε θ λ μ π σ ω Ω
© ® ™ § ¶ † ‡ • ‰ ′ ″

### Currency Symbols
$ € £ ¥ ₹ ₽ ₿ ¢ ₩ ₪ ₫

### Mathematical Symbols
∑ ∏ ∫ ∆ ∇ ∂ √ ∞ ≈ ≠ ≤ ≥ ± ∓ × ÷

### Arrows and Geometric Shapes
← → ↑ ↓ ↔ ↕ ↖ ↗ ↘ ↙
■ □ ▲ △ ● ○ ◆ ◇ ★ ☆

## Problematic Character Combinations

### Zero-Width Characters
This text contains zero-width spaces:​word​break​test

### Combining Characters
e̊ åˆ î́ ò̀ ũ ñ̃

### Right-to-Left Text
العربية עברית فارسی

### Mixed Directionality
English العربية English עברית English

## Code and Technical Characters

### Programming Symbols
`{ } [ ] ( ) < > / \ | & ^ % # @ ! ? ~`

### Escape Characters and Special Sequences
\n \t \r \\ \" \' \0 \x20 \u0020

### HTML Entities
&lt; &gt; &amp; &quot; &apos; &nbsp; &copy; &reg;

### Markdown Special Characters
# ## ### * ** _ __ ` ``` | - + > [ ] ( )

## Whitespace Edge Cases

### Multiple Spaces
Word    with    many    spaces

### Tabs and Mixed Whitespace
Word	with	tabs
Word 	mixed 	whitespace

### Line Breaks
Line one

Line three (empty line above)

## Text Length Edge Cases

### Very Long Word
Antidisestablishmentarianism

### Extremely Long Word
Pneumonoultramicroscopicsilicovolcanoconiosispneumonoultramicroscopicsilicovolcanoconiosis

### Single Character Lines
A
B
C

## Formatting Edge Cases

### Nested Formatting
**Bold _italic **bold_** text**

### Broken Formatting
**Bold without closing

_Italic without closing

`Code without closing

### Conflicting Formatting
**Bold _and **italic_** text**

## Special File Characters

File names with spaces: "My Document.md"
File names with symbols: "Document-2024_v1.2.md"
File names with unicode: "Документ.md"

## Testing Instructions

When testing with this document:

1. **Track Edits Testing**:
   - Make edits to various character types
   - Verify highlighting works with unicode
   - Test copying and pasting special characters
   - Check edit history with mixed character sets

2. **Chat Testing**:
   - Send special characters to AI chat
   - Test with emoji and symbols
   - Verify proper encoding in responses

3. **Editorial Functions Testing**:
   - Apply functions to text with special characters
   - Test with mathematical symbols
   - Verify proper handling of unicode text

4. **Performance Testing**:
   - Monitor performance with complex character processing
   - Test scrolling through mixed character content
   - Check memory usage with unicode text

## Expected Behaviors

- All characters should display correctly
- Edit tracking should work with any character type
- Copy/paste should preserve character encoding
- Search should work across all character types
- Export functions should maintain encoding
- No crashes or errors with special characters