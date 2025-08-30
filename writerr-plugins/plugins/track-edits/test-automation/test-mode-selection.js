// Test Mode Selection and Editorial Engine Integration

console.log("=== TESTING MODE SELECTION AND EDITORIAL ENGINE INTEGRATION ===");

// Check current mode
const modeButton = document.querySelector(".writerr-mode-button");
if (modeButton) {
  console.log("Current mode button text:", modeButton.textContent);
}

// Check if chat view is available
const chatView = window.app?.workspace?.getLeavesOfType?.('writerr-chat-view')?.[0]?.view;
if (chatView) {
  console.log("Chat view found:", !!chatView);
  console.log("Current selected mode:", chatView.getSelectedMode());
} else {
  console.log("Chat view not found");
}

// Check Editorial Engine availability and modes
if (window.Writerr?.editorial) {
  console.log("Editorial Engine available:", true);
  try {
    const modes = window.Writerr.editorial.getEnabledModes();
    console.log("Available modes:", modes);
  } catch (error) {
    console.log("Error getting modes:", error.message);
  }
} else {
  console.log("Editorial Engine available:", false);
}

// Test mode change simulation
if (chatView) {
  console.log("Testing mode change to 'copy-editor'...");
  try {
    chatView.setMode('copy-editor');
    console.log("Mode changed to:", chatView.getSelectedMode());
  } catch (error) {
    console.log("Error changing mode:", error.message);
  }
}

// Check plugin settings
const chatPlugin = window.app?.plugins?.plugins?.['writerr-chat'];
if (chatPlugin) {
  console.log("Chat plugin found:", true);
  console.log("Default mode setting:", chatPlugin.settings?.defaultMode);
} else {
  console.log("Chat plugin not found");
}

console.log("=== MODE SELECTION TEST COMPLETE ===");