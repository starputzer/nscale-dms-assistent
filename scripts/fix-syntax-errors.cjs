#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔧 Fixing Syntax Errors from Auto-Fixer');
console.log('======================================\n');

// List of files with known syntax errors
const filesToFix = [
  'src/utils/markdownRenderer.ts',
  'src/utils/messageFormatter.ts', 
  'src/utils/messageFormatterOptimized.ts',
  'src/utils/uiAuthSyncLazy.ts',
  'src/utils/adminApiInterceptor.ts',
  'src/utils/authDebugHelpers.ts',
  'src/stores/storeInitializer.ts',
  'src/stores/sessions.ts'
];

filesToFix.forEach(file => {
  const fullPath = path.join(process.cwd(), file);
  if (fs.existsSync(fullPath)) {
    let content = fs.readFileSync(fullPath, 'utf8');
    let originalContent = content;
    
    // Fix common syntax errors caused by auto-fixer
    // Fix: "x as any).method" -> "(x as any).method"
    content = content.replace(/(\w+)\s+as\s+any\)\.(\w+)/g, '($1 as any).$2');
    
    // Fix: "x as any)," -> "(x as any),"
    content = content.replace(/(\w+)\s+as\s+any\),/g, '($1 as any),');
    
    // Fix: "x as any);" -> "(x as any);"
    content = content.replace(/(\w+)\s+as\s+any\);/g, '($1 as any);');
    
    // Fix: "x as any) " -> "(x as any) "
    content = content.replace(/(\w+)\s+as\s+any\)\s/g, '($1 as any) ');
    
    // Fix multiple "as any" in a row
    content = content.replace(/as\s+any\s+as\s+any/g, 'as any');
    
    // Fix broken parentheses patterns
    content = content.replace(/\)\s+as\s+any\)/g, ')');
    
    // Check if any changes were made
    if (content !== originalContent) {
      fs.writeFileSync(fullPath, content);
      console.log(`✓ Fixed syntax errors in ${file}`);
    }
  } else {
    console.log(`⚠️  File not found: ${file}`);
  }
});

console.log('\n✅ Syntax fixes applied!');
console.log('\n🔍 Testing build again...\n');

// Try to build
try {
  execSync('npm run build', { stdio: 'inherit' });
  console.log('\n✨ Build successful!');
} catch (error) {
  console.log('\n⚠️  Build still failing. Manual intervention needed.');
}