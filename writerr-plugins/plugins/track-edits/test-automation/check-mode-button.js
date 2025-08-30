// Check Mode Button Status

console.log("=== CHECKING MODE BUTTON ===");

// Find the mode button
const modeButton = document.querySelector(".writerr-mode-button");
console.log("Mode button found:", !!modeButton);

if (modeButton) {
  console.log("Mode button text:", modeButton.textContent);
  console.log("Mode button inner HTML:", modeButton.innerHTML);
  console.log("Mode button attributes:");
  
  for (let attr of modeButton.attributes) {
    console.log(`  ${attr.name}: ${attr.value}`);
  }
}

// Check what modes are available
console.log("Looking for mode dropdown or menu...");
const modeMenus = document.querySelectorAll("[class*=menu], [class*=dropdown], [data-mode]");
console.log("Mode menus found:", modeMenus.length);

// Test clicking the mode button to see what happens
if (modeButton) {
  console.log("Testing mode button click...");
  modeButton.click();
  
  // Wait a bit then check for dropdown
  setTimeout(() => {
    const dropdowns = document.querySelectorAll("[class*=dropdown], [class*=menu]");
    console.log("After click - dropdowns found:", dropdowns.length);
    
    dropdowns.forEach((dropdown, i) => {
      console.log(`Dropdown ${i}:`, dropdown.innerHTML.substring(0, 300));
    });
  }, 500);
}

console.log("=== MODE BUTTON CHECK COMPLETE ===");