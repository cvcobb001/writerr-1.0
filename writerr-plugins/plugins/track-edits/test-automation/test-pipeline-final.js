// Final Pipeline Test - Fixed version

console.log("=== COMPLETE PIPELINE TEST ===");

// 1. Check Track Edits API
const trackEditsAPI = window.WriterrlAPI?.trackEdits;
if (trackEditsAPI) {
  console.log("✅ Track Edits API found");
  console.log("Available methods:", Object.keys(trackEditsAPI));
  
  if (trackEditsAPI.applyChange) {
    console.log("✅ applyChange method is available!");
  } else {
    console.log("❌ applyChange method missing");
  }
  
  const currentSession = trackEditsAPI.getCurrentSession();
  console.log("Current session:", currentSession ? "Active" : "None");
} else {
  console.log("❌ Track Edits API not available");
}

// 2. Check Chat View (fixed)
const chatView = window.app?.workspace?.getLeavesOfType?.('writerr-chat-view')?.[0]?.view;
if (!chatView) {
  console.log("❌ Chat view not found - please open Writerr Chat panel");
} else {
  console.log("✅ Chat view found");
  // Try different ways to get selected mode
  try {
    const mode = chatView.getSelectedMode?.() || chatView.selectedMode || chatView.chatHeader?.getSelectedMode?.() || 'unknown';
    console.log("Selected mode:", mode);
  } catch (e) {
    console.log("Selected mode: Could not determine");
  }
}

// 3. Check Editorial Engine API
const editorialEngineAPI = window.WriterrlAPI?.editorialEngine;
if (editorialEngineAPI) {
  console.log("✅ Editorial Engine API found");
  console.log("Available methods:", Object.keys(editorialEngineAPI));
} else {
  console.log("❌ Editorial Engine API not available");
}

// 4. Test applyChange method
if (trackEditsAPI?.applyChange) {
  console.log("Testing applyChange method...");
  
  const testChange = {
    id: 'pipeline_test_' + Date.now(),
    type: 'insert',
    range: { start: 50, end: 50 },
    newText: '🎉PIPELINE_TEST🎉',
    originalText: '',
    confidence: 0.9,
    reasoning: 'Pipeline integration test',
    source: 'pipeline-test',
    timestamp: Date.now()
  };
  
  try {
    trackEditsAPI.applyChange(testChange);
    console.log("✅ Test change applied successfully:", testChange.id);
    console.log("Look for '🎉PIPELINE_TEST🎉' decoration in your document!");
  } catch (error) {
    console.log("❌ Error applying test change:", error);
  }
}

console.log("\n=== PIPELINE STATUS ===");
console.log("Track Edits API:", trackEditsAPI ? "✅" : "❌");
console.log("Chat View:", chatView ? "✅" : "❌");
console.log("Editorial Engine:", editorialEngineAPI ? "✅" : "❌");
console.log("applyChange method:", trackEditsAPI?.applyChange ? "✅" : "❌");

if (trackEditsAPI && chatView && editorialEngineAPI && trackEditsAPI.applyChange) {
  console.log("\n🎉 CHAMPAGNE TIME! 🍾");
  console.log("All APIs are connected! The pipeline is ready!");
  console.log("\n=== READY FOR REAL TEST ===");
  console.log("1. Select 'Copy Editor' or 'Proofreader' mode in Chat");
  console.log("2. Send a message like: 'Please fix any errors in this text: I has many mistake in grammer'");
  console.log("3. Watch for decorations in your document!");
} else {
  console.log("\n❌ Pipeline not ready - check missing components above");
}

console.log("=== PIPELINE TEST COMPLETE ===");