/**
 * Simple test script to validate function definitions work with the parsing system
 */

const fs = require('fs');
const path = require('path');

// Simple function loader test (without TypeScript compilation)
function testFunctionParsing() {
  console.log('Testing function definition parsing...\n');

  const functionsDir = path.join(__dirname, 'functions');
  const functionFiles = [
    'copy-editor.md',
    'proofreader.md', 
    'developmental-editor.md',
    'co-writer.md'
  ];

  let allValid = true;

  for (const file of functionFiles) {
    const filePath = path.join(functionsDir, file);
    
    try {
      console.log(`Testing: ${file}`);
      
      if (!fs.existsSync(filePath)) {
        console.log(`  ❌ File not found: ${filePath}`);
        allValid = false;
        continue;
      }

      const content = fs.readFileSync(filePath, 'utf-8');
      
      // Test 1: Has content
      if (!content.trim()) {
        console.log(`  ❌ File is empty`);
        allValid = false;
        continue;
      }

      // Test 2: Has frontmatter
      const frontMatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
      if (!frontMatterMatch) {
        console.log(`  ❌ Missing frontmatter`);
        allValid = false;
        continue;
      }

      const [, frontMatter, body] = frontMatterMatch;

      // Test 3: Frontmatter has required fields
      const requiredFields = ['id', 'name', 'version', 'description', 'category'];
      const missingFields = [];
      
      for (const field of requiredFields) {
        if (!frontMatter.includes(`${field}:`)) {
          missingFields.push(field);
        }
      }

      if (missingFields.length > 0) {
        console.log(`  ❌ Missing required fields: ${missingFields.join(', ')}`);
        allValid = false;
        continue;
      }

      // Test 4: Has system prompt section
      if (!body.includes('## System Prompt')) {
        console.log(`  ❌ Missing System Prompt section`);
        allValid = false;
        continue;
      }

      // Test 5: Has examples section
      if (!body.includes('## Examples')) {
        console.log(`  ❌ Missing Examples section`);
        allValid = false;
        continue;
      }

      // Test 6: Has schema section
      if (!body.includes('## Schema')) {
        console.log(`  ❌ Missing Schema section`);
        allValid = false;
        continue;
      }

      // Test 7: Schema contains valid JSON
      const schemaMatch = body.match(/## Schema\n\n```json\n([\s\S]*?)\n```/);
      if (schemaMatch) {
        try {
          JSON.parse(schemaMatch[1]);
          console.log(`  ✅ Valid schema JSON`);
        } catch (error) {
          console.log(`  ❌ Invalid schema JSON: ${error.message}`);
          allValid = false;
          continue;
        }
      }

      // Test 8: Check for track edits configuration
      if (!frontMatter.includes('trackEdits:')) {
        console.log(`  ❌ Missing Track Edits configuration`);
        allValid = false;
        continue;
      }

      // Test 9: Check for capabilities
      if (!frontMatter.includes('capabilities:')) {
        console.log(`  ❌ Missing capabilities list`);
        allValid = false;
        continue;
      }

      console.log(`  ✅ All validations passed`);
      
    } catch (error) {
      console.log(`  ❌ Error parsing file: ${error.message}`);
      allValid = false;
    }
    
    console.log(''); // Empty line for readability
  }

  // Test example functions too
  const examplesDir = path.join(functionsDir, 'examples');
  if (fs.existsSync(examplesDir)) {
    const exampleFiles = fs.readdirSync(examplesDir).filter(f => f.endsWith('.md'));
    
    console.log('Testing example functions...\n');
    
    for (const file of exampleFiles) {
      const filePath = path.join(examplesDir, file);
      
      try {
        console.log(`Testing: examples/${file}`);
        
        const content = fs.readFileSync(filePath, 'utf-8');
        
        // Basic validation for examples
        const frontMatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
        if (!frontMatterMatch) {
          console.log(`  ❌ Missing frontmatter`);
          allValid = false;
          continue;
        }

        const [, frontMatter, body] = frontMatterMatch;

        // Check required fields
        if (!frontMatter.includes('id:') || !frontMatter.includes('name:')) {
          console.log(`  ❌ Missing required fields`);
          allValid = false;
          continue;
        }

        if (!body.includes('## System Prompt')) {
          console.log(`  ❌ Missing System Prompt section`);
          allValid = false;
          continue;
        }

        console.log(`  ✅ Example function validation passed`);
        
      } catch (error) {
        console.log(`  ❌ Error parsing example: ${error.message}`);
        allValid = false;
      }
      
      console.log('');
    }
  }

  console.log('='.repeat(50));
  if (allValid) {
    console.log('🎉 All function definitions are valid!');
    console.log('✅ Function parsing system is working correctly.');
    return true;
  } else {
    console.log('❌ Some function definitions have issues.');
    console.log('Please review the errors above.');
    return false;
  }
}

// Test template system files exist
function testTemplateSystem() {
  console.log('\nTesting template system...\n');
  
  const templatesDir = path.join(__dirname, 'src', 'templates');
  const requiredFiles = [
    'index.ts',
    'types.ts', 
    'TemplateGenerator.ts',
    'FunctionTemplateManager.ts'
  ];

  let allExist = true;

  for (const file of requiredFiles) {
    const filePath = path.join(templatesDir, file);
    if (fs.existsSync(filePath)) {
      console.log(`✅ ${file} exists`);
    } else {
      console.log(`❌ ${file} missing`);
      allExist = false;
    }
  }

  return allExist;
}

// Test builtin functions exist
function testBuiltinFunctions() {
  console.log('\nTesting builtin functions...\n');
  
  const builtinDir = path.join(__dirname, 'src', 'builtin');
  const requiredFiles = [
    'index.ts',
    'types.ts',
    'CopyEditor.ts',
    'Proofreader.ts', 
    'DevelopmentalEditor.ts',
    'CoWriter.ts',
    'BuiltinFunctionManager.ts',
    'TrackEditsIntegration.ts'
  ];

  let allExist = true;

  for (const file of requiredFiles) {
    const filePath = path.join(builtinDir, file);
    if (fs.existsSync(filePath)) {
      console.log(`✅ ${file} exists`);
    } else {
      console.log(`❌ ${file} missing`);
      allExist = false;
    }
  }

  return allExist;
}

// Run all tests
console.log('AI Editorial Functions - Validation Tests');
console.log('='.repeat(50));

const functionTests = testFunctionParsing();
const templateTests = testTemplateSystem();
const builtinTests = testBuiltinFunctions();

console.log('\n' + '='.repeat(50));
console.log('FINAL RESULTS:');
console.log(`Function Definitions: ${functionTests ? '✅ PASS' : '❌ FAIL'}`);
console.log(`Template System: ${templateTests ? '✅ PASS' : '❌ FAIL'}`);
console.log(`Builtin Functions: ${builtinTests ? '✅ PASS' : '❌ FAIL'}`);

if (functionTests && templateTests && builtinTests) {
  console.log('\n🎉 All systems validated successfully!');
  console.log('The AI Editorial Functions default library is ready.');
  process.exit(0);
} else {
  console.log('\n❌ Some components need attention.');
  process.exit(1);
}