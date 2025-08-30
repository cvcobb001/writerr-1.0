// Debug Track Edits Integration

console.log("=== TRACK EDITS INTEGRATION DEBUG ===");

// Check Track Edits API availability
console.log("Track Edits API available:", !!window.WriterrlAPI?.trackEdits);
if (window.WriterrlAPI?.trackEdits) {
  console.log("Track Edits API methods:", Object.keys(window.WriterrlAPI.trackEdits));
}

// Check if Editorial Engine is returning changes
const chatView = window.app?.workspace?.getLeavesOfType?.('writerr-chat-view')?.[0]?.view;
if (chatView) {
  console.log("Chat view found - patching processWithEditorialEngine to debug results");
  
  const original = chatView.processWithEditorialEngine?.bind(chatView);
  if (original) {
    chatView.processWithEditorialEngine = async function(parsedMessage, fullContext) {
      console.log("=== EDITORIAL ENGINE PROCESSING ===");
      console.log("Mode:", parsedMessage.mode);
      console.log("Message:", parsedMessage.content.substring(0, 50) + "...");
      
      const result = await original(parsedMessage, fullContext);
      
      console.log("=== EDITORIAL ENGINE RESULT ===");
      console.log("Result exists:", !!result);
      console.log("Result type:", typeof result);
      console.log("Result keys:", result ? Object.keys(result) : 'none');
      
      if (result?.changes) {
        console.log("Changes found:", result.changes.length);
        console.log("First change:", result.changes[0]);
      } else {
        console.log("NO CHANGES in result:", result);
      }
      
      return result;
    };
  }
  
  // Also patch integrateWithTrackEdits
  const originalIntegrate = chatView.integrateWithTrackEdits?.bind(chatView);
  if (originalIntegrate) {
    chatView.integrateWithTrackEdits = async function(editorialEngineResult, parsedMessage) {
      console.log("=== TRACK EDITS INTEGRATION CALLED ===");
      console.log("Editorial Engine Result:", editorialEngineResult);
      console.log("Changes to apply:", editorialEngineResult?.changes);
      
      try {
        const result = await originalIntegrate(editorialEngineResult, parsedMessage);
        console.log("Integration completed successfully");
        return result;
      } catch (error) {
        console.error("Integration failed:", error);
        throw error;
      }
    };
  }
  
  console.log("Debug patches applied - send a message in copy editor mode to see results");
} else {
  console.log("Chat view not found");
}

console.log("=== TRACK EDITS INTEGRATION DEBUG COMPLETE ===");