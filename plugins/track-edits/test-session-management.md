# Track Edits Session Management Test

## Test Scenarios for Infinite Loop Bug Fix

### Test 1: Ribbon Icon Toggle
1. Load Track Edits plugin in Obsidian
2. Click ribbon icon to start tracking
3. **Expected**: Single session starts, indicator shows
4. Click ribbon icon to stop tracking  
5. **Expected**: Session stops, indicator hides
6. Click ribbon icon to start again
7. **Expected**: New session starts cleanly, no loop

### Test 2: Rapid Ribbon Clicks
1. Click ribbon icon multiple times rapidly (3-4 clicks in quick succession)
2. **Expected**: Only one action processed due to debouncing
3. **Expected**: No infinite loop messages in console
4. **Expected**: Final state reflects last intended action

### Test 3: File Switching
1. Start tracking in one file
2. Switch to another file
3. **Expected**: Session restarts once for new file
4. **Expected**: No continuous restart loop
5. **Expected**: Clean console messages about file change

### Test 4: Manual Session State Check
1. Open Developer Console
2. Start tracking via ribbon
3. **Expected**: Single "Started tracking session [ID]" message
4. Stop tracking via ribbon
5. **Expected**: No additional session start messages

## Key Fixes Implemented

1. **Ribbon Click Debouncing**: 300ms debounce prevents rapid clicks
2. **State Guard Flags**: `isRestartingSession` prevents recursive calls
3. **Enhanced Session Validation**: Additional checks in `startTracking()`
4. **Improved Active Leaf Handler**: More defensive file change detection
5. **Extended Cleanup Delays**: Longer timeouts ensure proper state cleanup

## Console Output to Monitor

**Good (Fixed):**
```
Track Edits v2.0: Started tracking session abc123
Track Edits: Stopped tracking via ribbon icon
Track Edits v2.0: Started tracking session def456
```

**Bad (Infinite Loop):**
```
Track Edits v2.0: Started tracking session abc123
Track Edits v2.0: Started tracking session def456
Track Edits v2.0: Started tracking session ghi789
Track Edits v2.0: Started tracking session jkl012
... (continues infinitely)
```