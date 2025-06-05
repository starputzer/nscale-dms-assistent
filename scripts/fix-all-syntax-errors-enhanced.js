#!/usr/bin/env node
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

console.log('🔧 Fixing all syntax errors from auto-fixer (Enhanced)\n');

let fixedCount = 0;

// Function to fix syntax errors in a file
function fixFile(filePath) {
  try {
    let content = readFileSync(filePath, 'utf8');
    let originalContent = content;
    
    // Fix pattern: "x as any).method" -> "(x as any).method"
    content = content.replace(/(\w+)\s+as\s+any\)\.(\w+)/g, '($1 as any).$2');
    
    // Fix pattern: "x as any)," -> "(x as any),"
    content = content.replace(/(\w+)\s+as\s+any\),/g, '($1 as any),');
    
    // Fix pattern: "x as any);" -> "(x as any);"
    content = content.replace(/(\w+)\s+as\s+any\);/g, '($1 as any);');
    
    // Fix pattern: "x as any) " -> "(x as any) "
    content = content.replace(/(\w+)\s+as\s+any\)\s/g, '($1 as any) ');
    
    // Fix pattern: "x as any))" -> "(x as any))"
    content = content.replace(/(\w+)\s+as\s+any\)\)/g, '($1 as any))');
    
    // Fix pattern: includes((x as any)) -> includes(x as any)
    content = content.replace(/\.includes\(\(([^)]+\s+as\s+any)\)\)/g, '.includes($1)');
    
    // Fix pattern: ((connection as any).addEventListener -> (connection as any).addEventListener
    content = content.replace(/\(\(([^)]+\s+as\s+any)\)\.(\w+)/g, '($1).$2');
    
    // Fix pattern: "x as any).property === " -> "(x as any).property === "
    content = content.replace(/(\w+)\s+as\s+any\)\.(\w+)\s*===/g, '($1 as any).$2 ===');
    
    // Fix pattern: "x as any).property !== " -> "(x as any).property !== "
    content = content.replace(/(\w+)\s+as\s+any\)\.(\w+)\s*!==/g, '($1 as any).$2 !==');
    
    // Fix pattern: "x as any).property || " -> "(x as any).property || "
    content = content.replace(/(\w+)\s+as\s+any\)\.(\w+)\s*\|\|/g, '($1 as any).$2 ||');
    
    // Fix pattern: "x as any).property && " -> "(x as any).property && "
    content = content.replace(/(\w+)\s+as\s+any\)\.(\w+)\s*&&/g, '($1 as any).$2 &&');
    
    // Fix pattern with any character before: ".service as any).method" -> "(this.service as any).method"
    content = content.replace(/\.(\w+)\s+as\s+any\)\.(\w+)/g, '.(this.$1 as any).$2');
    
    // Fix the specific pattern we're seeing
    content = content.replace(/this\.service\s+as\s+any\)/g, '(this.service as any)');
    
    // Fix pattern: "? as any).property" -> "? (x as any).property"
    content = content.replace(/\?\s*as\s+any\)/g, '? (response.data as any)');
    
    // Fix double "this.this" that might have been introduced
    content = content.replace(/this\.this\./g, 'this.');
    
    // Remove multiple "as any" in a row
    content = content.replace(/as\s+any\s+as\s+any/g, 'as any');
    
    // Fix broken parentheses patterns
    content = content.replace(/\)\s+as\s+any\)/g, ')');
    
    // Fix patterns with expressions: (expression as any)) -> (expression as any)
    content = content.replace(/\(([^)]+)\s+as\s+any\)\)/g, '($1 as any)');
    
    // Fix: Fix i18n pattern: (i18n.((global as any) -> (i18n.global as any)
    content = content.replace(/\(i18n\.\(\(global\s+as\s+any\)/g, '(i18n.global as any)');
    
    if (content !== originalContent) {
      writeFileSync(filePath, content);
      fixedCount++;
      console.log(`✓ Fixed ${filePath}`);
    }
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
  }
}

// Function to recursively find all TypeScript files
function findTypeScriptFiles(dir) {
  const files = [];
  
  function traverse(currentDir) {
    try {
      const entries = readdirSync(currentDir);
      
      for (const entry of entries) {
        const fullPath = join(currentDir, entry);
        const stat = statSync(fullPath);
        
        if (stat.isDirectory()) {
          // Skip node_modules and dist directories
          if (entry !== 'node_modules' && entry !== 'dist' && entry !== '.git') {
            traverse(fullPath);
          }
        } else if (entry.endsWith('.ts') || entry.endsWith('.vue')) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      console.error(`Error traversing ${currentDir}:`, error.message);
    }
  }
  
  traverse(dir);
  return files;
}

// Find all TypeScript and Vue files
const srcDir = join(process.cwd(), 'src');
const apiDir = join(process.cwd(), 'api');

console.log('🔍 Searching for TypeScript and Vue files...\n');

const srcFiles = findTypeScriptFiles(srcDir);
console.log(`Found ${srcFiles.length} files in src/`);

srcFiles.forEach(fixFile);

// Also check api directory
try {
  if (statSync(apiDir).isDirectory()) {
    const apiFiles = findTypeScriptFiles(apiDir);
    console.log(`\nFound ${apiFiles.length} files in api/`);
    apiFiles.forEach(fixFile);
  }
} catch (error) {
  console.log(`API directory not found, skipping...`);
}

console.log(`\n✅ Fixed ${fixedCount} files`);
console.log('\n🏗️  Running build to check if all errors are fixed...\n');

// Try to build
import { exec } from 'child_process';

exec('npm run build', (error, stdout, stderr) => {
  if (error) {
    console.log('❌ Build still has errors. Output saved to build-errors.log');
    writeFileSync('build-errors.log', stderr || stdout);
    
    // Try to extract and display the specific error
    const errorMatch = stderr.match(/ERROR: (.+)/);
    if (errorMatch) {
      console.log(`\n📍 Error found: ${errorMatch[1]}`);
      const fileMatch = stderr.match(/file: ([^\s]+):(\d+):(\d+)/);
      if (fileMatch) {
        console.log(`📁 File: ${fileMatch[1]}`);
        console.log(`📏 Line: ${fileMatch[2]}, Column: ${fileMatch[3]}`);
      }
    }
  } else {
    console.log('✅ Build successful!');
  }
});