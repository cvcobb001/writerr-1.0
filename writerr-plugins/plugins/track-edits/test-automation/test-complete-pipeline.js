// Complete Pipeline Test - Paste this in browser console

console.log("=== COMPLETE PIPELINE TEST ===");

// 1. Check Track Edits API
const trackEditsAPI = window.WriterrlAPI?.trackEdits;
if (trackEditsAPI) {
  console.log("✅ Track Edits API found");
  console.log("Available methods:", Object.keys(trackEditsAPI));
  
  // Check for the new applyChange method
  if (trackEditsAPI.applyChange) {
    console.log("✅ applyChange method is available!");
  } else {
    console.log("❌ applyChange method missing");
  }
  
  // Check current session
  const currentSession = trackEditsAPI.getCurrentSession();
  console.log("Current session:", currentSession ? "Active" : "None");
  
  if (!currentSession) {
    console.log("Starting Track Edits tracking...");
    trackEditsAPI.startTracking();
    setTimeout(() => {
      console.log("New session:", trackEditsAPI.getCurrentSession() ? "Started" : "Failed to start");
    }, 500);
  }
} else {
  console.log("❌ Track Edits API not available");
}

// 2. Check Chat View
const chatView = window.app?.workspace?.getLeavesOfType?.('writerr-chat-view')?.[0]?.view;
if (!chatView) {
  console.log("❌ Chat view not found - please open Writerr Chat panel");
} else {
  console.log("✅ Chat view found");
  console.log("Selected mode:", chatView.getSelectedMode());
}

// 3. Check Editorial Engine API
const editorialEngineAPI = window.WriterrlAPI?.editorialEngine;
if (editorialEngineAPI) {
  console.log("✅ Editorial Engine API found");
} else {
  console.log("❌ Editorial Engine API not available");
}

// 4. Test applyChange method directly if available
if (trackEditsAPI?.applyChange) {
  console.log("Testing applyChange method directly...");
  
  const testChange = {
    id: 'test_change_' + Date.now(),
    type: 'insert',
    range: { start: 100, end: 100 },
    newText: 'TEST_INSERTION',
    originalText: '',
    confidence: 0.9,
    reasoning: 'Direct API test',
    source: 'test-script',
    timestamp: Date.now()
  };
  
  try {
    trackEditsAPI.applyChange(testChange);
    console.log("✅ Test change applied:", testChange.id);
  } catch (error) {
    console.log("❌ Error applying test change:", error);
  }
}

console.log("\n=== PIPELINE STATUS ===");
console.log("Track Edits API:", trackEditsAPI ? "✅" : "❌");
console.log("Chat View:", chatView ? "✅" : "❌");
console.log("Editorial Engine:", editorialEngineAPI ? "✅" : "❌");
console.log("applyChange method:", trackEditsAPI?.applyChange ? "✅" : "❌");

console.log("\n=== NEXT STEPS ===");
console.log("1. Make sure all APIs show ✅");
console.log("2. Select 'Copy Editor' or 'Proofreader' mode in Chat");
console.log("3. Send a message with text that needs editing");
console.log("4. Look for decorations in document and Track Edits side panel");

console.log("=== PIPELINE TEST COMPLETE ===");