// Force Plugin Reload - This will disable and re-enable Track Edits plugin

console.log("=== FORCE PLUGIN RELOAD ===");

async function forceReloadTrackEditsPlugin() {
  const plugins = window.app?.plugins;
  
  if (!plugins) {
    console.log("❌ Cannot access plugins manager");
    return;
  }
  
  console.log("🔄 Disabling Track Edits plugin...");
  
  // Disable the plugin
  try {
    await plugins.disablePlugin('track-edits');
    console.log("✅ Track Edits plugin disabled");
    
    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log("🔄 Re-enabling Track Edits plugin...");
    
    // Re-enable the plugin
    await plugins.enablePlugin('track-edits');
    console.log("✅ Track Edits plugin re-enabled");
    
    // Wait for initialization
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check if API is now available with new method
    console.log("\n=== CHECKING AFTER RELOAD ===");
    const trackEditsAPI = window.WriterrlAPI?.trackEdits;
    
    if (trackEditsAPI) {
      console.log("✅ Track Edits API found");
      console.log("Available methods:", Object.keys(trackEditsAPI));
      
      if (trackEditsAPI.applyChange) {
        console.log("🎉 SUCCESS: applyChange method is now available!");
        
        // Test it
        console.log("Testing applyChange method...");
        const testChange = {
          id: 'reload_test_' + Date.now(),
          type: 'insert',
          range: { start: 10, end: 10 },
          newText: 'RELOAD_TEST',
          originalText: '',
          confidence: 0.9,
          reasoning: 'Plugin reload test',
          source: 'reload-script',
          timestamp: Date.now()
        };
        
        try {
          trackEditsAPI.applyChange(testChange);
          console.log("✅ Test change applied successfully!");
        } catch (error) {
          console.log("❌ Test change failed:", error);
        }
      } else {
        console.log("❌ applyChange method still missing after reload");
      }
    } else {
      console.log("❌ Track Edits API not available after reload");
    }
    
    // Check Editorial Engine too
    const editorialEngineAPI = window.WriterrlAPI?.editorialEngine;
    if (editorialEngineAPI) {
      console.log("✅ Editorial Engine API found");
      console.log("Available methods:", Object.keys(editorialEngineAPI));
    } else {
      console.log("❌ Editorial Engine API still not available");
    }
    
  } catch (error) {
    console.log("❌ Error during plugin reload:", error);
  }
}

// Run the reload
forceReloadTrackEditsPlugin();

console.log("=== FORCE PLUGIN RELOAD INITIATED ===");