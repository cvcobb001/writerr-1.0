// Comprehensive Mode Flow Debugging Script

console.log("=== TRACING MODE SELECTION FLOW ===");

// Step 1: Check current state
const modeButton = document.querySelector(".writerr-mode-button");
console.log("1. Mode button found:", !!modeButton);
console.log("   Current text:", modeButton?.textContent);

// Step 2: Get chat view reference
const chatView = window.app?.workspace?.getLeavesOfType?.('writerr-chat-view')?.[0]?.view;
console.log("2. Chat view found:", !!chatView);

if (chatView) {
  console.log("   Current selected mode:", chatView.getSelectedMode());
  
  // Step 3: Check ChatHeader
  if (chatView.chatHeader) {
    console.log("3. ChatHeader found:", true);
    console.log("   ChatHeader current mode:", chatView.chatHeader.getSelectedMode());
    console.log("   ChatHeader current mode display:", chatView.chatHeader.getCurrentModeDisplayName?.());
  }
  
  // Step 4: Test mode change manually
  console.log("4. Testing manual mode change to 'proofreader'...");
  try {
    chatView.setMode('proofreader');
    console.log("   Mode set successfully");
    console.log("   New selected mode:", chatView.getSelectedMode());
    console.log("   Button text after change:", modeButton?.textContent);
  } catch (error) {
    console.log("   Error setting mode:", error.message);
  }
  
  // Step 5: Check Editorial Engine modes
  console.log("5. Editorial Engine status:");
  if (window.Writerr?.editorial) {
    console.log("   Available: true");
    try {
      const modes = window.Writerr.editorial.getEnabledModes();
      console.log("   Enabled modes:", modes);
    } catch (error) {
      console.log("   Error getting modes:", error.message);
    }
  } else {
    console.log("   Available: false");
  }
  
  // Step 6: Test simulated message sending
  console.log("6. Testing message send flow...");
  const originalSendMessage = chatView.plugin.sendMessage.bind(chatView.plugin);
  
  // Monkey patch to log the mode being passed
  chatView.plugin.sendMessage = async function(content, selectedMode, context) {
    console.log("   sendMessage called with:");
    console.log("     content:", content.substring(0, 50) + "...");
    console.log("     selectedMode:", selectedMode);
    console.log("     context:", context ? "provided" : "none");
    
    // Restore original and call it
    chatView.plugin.sendMessage = originalSendMessage;
    return originalSendMessage(content, selectedMode, context);
  };
  
  console.log("   Monkey patch applied - next message will be logged");
}

// Step 7: Check for any errors in the mode menu
console.log("7. Testing mode menu visibility...");
if (modeButton) {
  console.log("   Clicking mode button...");
  modeButton.click();
  
  setTimeout(() => {
    const allMenus = document.querySelectorAll('.menu, [class*=menu], [class*=dropdown]');
    console.log("   After click - total menus found:", allMenus.length);
    
    allMenus.forEach((menu, i) => {
      const rect = menu.getBoundingClientRect();
      console.log(`   Menu ${i}: visible=${rect.width > 0 && rect.height > 0}, z-index=${window.getComputedStyle(menu).zIndex}`);
    });
  }, 100);
}

console.log("=== MODE FLOW TRACE COMPLETE ===");
console.log("Send a message now to see the mode flow in action!");