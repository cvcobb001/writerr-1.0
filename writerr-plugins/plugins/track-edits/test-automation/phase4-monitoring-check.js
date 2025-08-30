// Phase 4 Editorial Engine Monitoring - Clean Test Script
// Copy and paste this entire file contents into Obsidian Developer Console

// Check if Phase 4 monitoring is active
if (window.TrackEditsEnhancedTestUtils) {
  console.log("✅ Phase 4 monitoring is ACTIVE");
  
  // Show current monitoring status
  console.log("Editorial Engine issues detected:", window.TrackEditsEnhancedTestUtils.editorialEngineIssues.length);
  console.log("Chat integration failures:", window.TrackEditsEnhancedTestUtils.chatIntegrationFailures.length);
  console.log("AI attribution errors:", window.TrackEditsEnhancedTestUtils.aiAttributionErrors.length);
  
  // Generate and display current report
  const report = window.TrackEditsEnhancedTestUtils.generatePhase4Report();
  console.log("Phase 4 Monitoring Report:", report);
  
  // Show if system is healthy
  if (report.summary.overallHealthy) {
    console.log("🎉 Editorial Engine integration is HEALTHY - no issues detected!");
  } else {
    console.log("⚠️ Editorial Engine integration has issues - check the report above");
  }
  
} else {
  console.log("❌ Phase 4 monitoring is NOT active");
  console.log("Run the enhanced test suite first to activate monitoring");
}

// Test function to manually log an Editorial Engine issue
function testEditorialEngineErrorCapture() {
  if (window.TrackEditsEnhancedTestUtils) {
    window.TrackEditsEnhancedTestUtils.logEditorialEngineIssue('test-error', 'This is a test error to verify monitoring works', {source: 'manual-test'});
    console.log("✅ Test error logged successfully");
    console.log("New issue count:", window.TrackEditsEnhancedTestUtils.editorialEngineIssues.length);
  } else {
    console.log("❌ Cannot test - Phase 4 monitoring not active");
  }
}

// Instructions for testing
console.log("\n📋 TESTING INSTRUCTIONS:");
console.log("1. Copy this entire file content and paste into Obsidian console");
console.log("2. Test Editorial Engine workflows (Copy Editor, Proofreader modes)");  
console.log("3. Run testEditorialEngineErrorCapture() to test error logging");
console.log("4. Check monitoring results with window.TrackEditsEnhancedTestUtils.generatePhase4Report()");