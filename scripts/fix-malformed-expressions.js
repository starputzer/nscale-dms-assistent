#!/usr/bin/env node
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

console.log('🔧 Fixing malformed expressions\n');

let fixedCount = 0;

// Function to fix syntax errors in a file
function fixFile(filePath) {
  try {
    let content = readFileSync(filePath, 'utf8');
    let originalContent = content;
    
    // Fix pattern: (messages.(this.de as any) -> (messages.de as any)
    content = content.replace(/\((\w+)\.\(this\.(\w+)\s+as\s+any\)/g, '($1.$2 as any)');
    
    // Fix pattern: (messages.this. -> (messages.
    content = content.replace(/\((\w+)\.this\./g, '($1.');
    
    // Fix pattern: .((window as any) -> .(window as any)
    content = content.replace(/\.\(\((\w+\s+as\s+any)\)/g, '.($1)');
    
    // Fix pattern: ((this. -> (this.
    content = content.replace(/\(\(this\./g, '(this.');
    
    // Fix pattern: .this. in any context
    content = content.replace(/([^a-zA-Z0-9_])this\.this\./g, '$1this.');
    
    // Fix pattern: (x.( -> (x.
    content = content.replace(/\((\w+)\.\(/g, '($1.');
    
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

console.log('🔍 Searching for TypeScript and Vue files...\n');

const srcFiles = findTypeScriptFiles(srcDir);
console.log(`Found ${srcFiles.length} files in src/`);

srcFiles.forEach(fixFile);

console.log(`\n✅ Fixed ${fixedCount} files`);