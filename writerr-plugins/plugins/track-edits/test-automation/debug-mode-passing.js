// Debug Mode Passing

console.log("=== DEBUG MODE PASSING ===");

// Get chat view and check current mode
const chatView = window.app?.workspace?.getLeavesOfType?.('writerr-chat-view')?.[0]?.view;
if (chatView) {
  console.log("Chat view found:", true);
  console.log("Current selected mode:", chatView.getSelectedMode());
  console.log("Mode type:", typeof chatView.getSelectedMode());
  
  // Check button display
  const modeButton = document.querySelector(".writerr-mode-button");
  console.log("Mode button text:", modeButton?.textContent?.trim());
  
  // Monkey patch sendMessage to see what's being passed
  const originalSendMessage = chatView.sendMessage.bind(chatView);
  chatView.sendMessage = function(message, mode) {
    console.log("=== ChatView.sendMessage called ===");
    console.log("  message:", message.substring(0, 50) + "...");
    console.log("  mode parameter:", mode);
    console.log("  this.chatHeader.getSelectedMode():", this.chatHeader.getSelectedMode());
    
    const selectedMode = mode || this.chatHeader.getSelectedMode();
    console.log("  final selectedMode:", selectedMode);
    console.log("  selectedMode type:", typeof selectedMode);
    console.log("  selectedMode === 'chat':", selectedMode === 'chat');
    
    // Call original
    chatView.sendMessage = originalSendMessage;
    return originalSendMessage.call(this, message, mode);
  };
  
  console.log("Monkey patch applied - send a message now!");
} else {
  console.log("Chat view not found");
}

console.log("=== DEBUG MODE PASSING COMPLETE ===");