// Editorial Engine Debug Script - Copy from VS Code to avoid quote corruption

// Check what mode is selected
console.log("Mode selection:", document.querySelector("select").value);

// Check Editorial Engine methods
console.log("Editorial Engine object:", window.Writerr.editorial);

// Check if mode dropdown exists  
console.log("Mode dropdown found:", !!document.querySelector("select"));

// Test Editorial Engine directly
console.log("Testing Editorial Engine availability...");
if (window.Writerr && window.Writerr.editorial) {
  console.log("✅ Editorial Engine is loaded and available");
} else {
  console.log("❌ Editorial Engine is not available");
}

// Check for mode-related elements
const modeElements = document.querySelectorAll("[data-mode], [class*=mode]");
console.log("Mode-related elements found:", modeElements.length);

// Simple test message
console.log("Debug script loaded successfully");