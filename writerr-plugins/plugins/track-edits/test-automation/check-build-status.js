// Check Build Status - Run this to verify the build worked

console.log("=== CHECKING BUILD STATUS ===");

// 1. Check if main.js exists and when it was last modified
async function checkBuildFiles() {
  try {
    const adapter = window.app?.vault?.adapter;
    if (!adapter) {
      console.log("❌ Could not access file adapter");
      return;
    }
    
    // Check main.js in track-edits plugin
    const pluginPath = '.obsidian/plugins/track-edits';
    const mainJsPath = `${pluginPath}/main.js`;
    
    const exists = await adapter.exists(mainJsPath);
    console.log("main.js exists:", exists ? "✅" : "❌");
    
    if (exists) {
      const stat = await adapter.stat(mainJsPath);
      const lastModified = new Date(stat.mtime);
      const now = new Date();
      const minutesAgo = Math.floor((now.getTime() - lastModified.getTime()) / (1000 * 60));
      
      console.log("main.js last modified:", lastModified.toLocaleString());
      console.log("Minutes ago:", minutesAgo);
      
      if (minutesAgo > 30) {
        console.log("⚠️  main.js is more than 30 minutes old - may need rebuild");
      } else {
        console.log("✅ main.js appears recently built");
      }
    }
    
    // Check if source files exist
    const srcMainPath = `${pluginPath}/src/main.ts`;
    const srcExists = await adapter.exists(srcMainPath);
    console.log("src/main.ts exists:", srcExists ? "✅" : "❌");
    
    if (srcExists) {
      const srcStat = await adapter.stat(srcMainPath);
      const srcModified = new Date(srcStat.mtime);
      console.log("src/main.ts last modified:", srcModified.toLocaleString());
    }
    
  } catch (error) {
    console.log("❌ Error checking build files:", error);
  }
}

checkBuildFiles();

console.log("\n=== BUILD INSTRUCTIONS ===");
console.log("If main.js is old or missing, you need to build the Track Edits plugin:");
console.log("1. Open Terminal");
console.log("2. Navigate to: cd '/Users/chriscobb/Documents/AI-HUD/Writerr 1.0/writerr-plugins/plugins/track-edits'");
console.log("3. Run: npm run build");
console.log("4. Then restart Obsidian");

console.log("\n=== ALTERNATIVE: Manual Plugin Restart ===");
console.log("You can also try:");
console.log("1. Go to Settings > Community plugins");
console.log("2. Disable 'Track Edits' plugin");
console.log("3. Re-enable 'Track Edits' plugin");
console.log("4. Check if applyChange method appears");

console.log("=== BUILD STATUS CHECK COMPLETE ===");