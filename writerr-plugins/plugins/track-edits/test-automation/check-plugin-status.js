// Check Plugin Status - Paste this in browser console after reloading Obsidian

console.log("=== CHECKING PLUGIN STATUS ===");

// Check if Track Edits plugin exists and is enabled
const plugins = window.app?.plugins;
if (plugins) {
  const trackEditsPlugin = plugins.plugins?.['track-edits'];
  if (trackEditsPlugin) {
    console.log("✅ Track Edits plugin found");
    console.log("Plugin enabled:", plugins.enabledPlugins.has('track-edits'));
    
    // Check if the applyExternalChange method exists on the plugin instance
    if (trackEditsPlugin.applyExternalChange) {
      console.log("✅ applyExternalChange method exists on plugin");
    } else {
      console.log("❌ applyExternalChange method missing from plugin");
    }
  } else {
    console.log("❌ Track Edits plugin not found");
  }
  
  // Check Editorial Engine plugin
  const editorialEnginePlugin = plugins.plugins?.['editorial-engine'];
  if (editorialEnginePlugin) {
    console.log("✅ Editorial Engine plugin found");
    console.log("Plugin enabled:", plugins.enabledPlugins.has('editorial-engine'));
  } else {
    console.log("❌ Editorial Engine plugin not found");
  }
  
  // Check Writerr Chat plugin
  const chatPlugin = plugins.plugins?.['writerr-chat'];
  if (chatPlugin) {
    console.log("✅ Writerr Chat plugin found");
    console.log("Plugin enabled:", plugins.enabledPlugins.has('writerr-chat'));
  } else {
    console.log("❌ Writerr Chat plugin not found");
  }
} else {
  console.log("❌ Could not access plugins");
}

// Check APIs after reload
console.log("\n=== API STATUS AFTER RELOAD ===");
const trackEditsAPI = window.WriterrlAPI?.trackEdits;
if (trackEditsAPI) {
  console.log("✅ Track Edits API found");
  console.log("Available methods:", Object.keys(trackEditsAPI));
  
  if (trackEditsAPI.applyChange) {
    console.log("✅ applyChange method is now available!");
  } else {
    console.log("❌ applyChange method still missing");
  }
} else {
  console.log("❌ Track Edits API not available");
}

const editorialEngineAPI = window.WriterrlAPI?.editorialEngine;
if (editorialEngineAPI) {
  console.log("✅ Editorial Engine API found");
  console.log("Available methods:", Object.keys(editorialEngineAPI));
} else {
  console.log("❌ Editorial Engine API not available");
}

console.log("\n=== INSTRUCTIONS ===");
console.log("1. Reload Obsidian completely");
console.log("2. Make sure all three plugins are enabled:");
console.log("   - track-edits");
console.log("   - editorial-engine"); 
console.log("   - writerr-chat");
console.log("3. Run this script again to verify APIs are working");

console.log("=== PLUGIN STATUS CHECK COMPLETE ===");