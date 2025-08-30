// Find Mode Selector Debug Script

console.log("=== SEARCHING FOR MODE SELECTOR ===");

// Look for different types of mode selectors
const selects = document.querySelectorAll("select");
console.log("All select elements found:", selects.length);
selects.forEach((sel, i) => {
  console.log(`Select ${i}:`, sel.outerHTML.substring(0, 200));
});

// Look for dropdowns
const dropdowns = document.querySelectorAll("[class*=dropdown], [class*=select]");
console.log("Dropdown elements found:", dropdowns.length);

// Look for mode-related elements
const modeElements = document.querySelectorAll("[class*=mode], [data-mode]");
console.log("Mode-related elements found:", modeElements.length);
modeElements.forEach((el, i) => {
  console.log(`Mode element ${i}:`, el.outerHTML.substring(0, 200));
});

// Look in chat header area specifically
const chatHeaders = document.querySelectorAll("[class*=chat-header], [class*=header]");
console.log("Chat header elements found:", chatHeaders.length);
chatHeaders.forEach((header, i) => {
  console.log(`Header ${i} contains:`, header.innerHTML.substring(0, 300));
});

// Check if Chat view is even loaded
const chatContainer = document.querySelector("[data-type='chat'], [class*=chat]");
console.log("Chat container found:", !!chatContainer);

console.log("=== MODE SELECTOR SEARCH COMPLETE ===");