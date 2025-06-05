#!/usr/bin/env node
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

console.log('🔧 Fixing all syntax errors comprehensively\n');

let fixedCount = 0;
let totalFixes = 0;

// Function to fix syntax errors in a file
function fixFile(filePath) {
  try {
    let content = readFileSync(filePath, 'utf8');
    let originalContent = content;
    let fixes = 0;
    
    // Fix missing parentheses in catch statements
    content = content.replace(/\.catch\(error\)\s*=>/g, '.catch((error) =>');
    content = content.replace(/\.onError\(error\)\s*=>/g, '.onError((error) =>');
    
    // Fix double parentheses patterns
    // Pattern: ((x as any) -> (x as any)
    content = content.replace(/\(\((\w+\s+as\s+any)\)/g, '($1)');
    
    // Fix specific patterns found in the codebase
    content = content.replace(/\(\(window as any\)/g, '(window as any)');
    content = content.replace(/\(\(error as any\)/g, '(error as any)');
    content = content.replace(/\(\(toast as any\)/g, '(toast as any)');
    content = content.replace(/\(\(performance as any\)/g, '(performance as any)');
    content = content.replace(/\(\(navigator as any\)/g, '(navigator as any)');
    content = content.replace(/\(\(connection as any\)/g, '(connection as any)');
    content = content.replace(/\(\(response as any\)/g, '(response as any)');
    content = content.replace(/\(\(originalRequest as any\)/g, '(originalRequest as any)');
    content = content.replace(/\(\(messages as any\)/g, '(messages as any)');
    content = content.replace(/\(\(result as any\)/g, '(result as any)');
    content = content.replace(/\(\(err as any\)/g, '(err as any)');
    content = content.replace(/\(\(this\./g, '(this.');
    
    // Fix patterns with typeof
    content = content.replace(/typeof\s+\(\(\(\(/g, 'typeof (');
    content = content.replace(/typeof\s+\(\(\(/g, 'typeof (');
    content = content.replace(/typeof\s+\(\(/g, 'typeof (');
    
    // Fix patterns like: if (x as any).__prop) { -> if ((x as any).__prop) {
    content = content.replace(/if\s+\((\w+\s+as\s+any)\)\.__/g, 'if (($1).__');
    
    // Fix patterns like: themeStore.setTheme(((themeId as any); -> themeStore.setTheme(themeId as any);
    content = content.replace(/\(\(\((\w+\s+as\s+any)\);/g, '($1);');
    content = content.replace(/\(\((\w+\s+as\s+any)\);/g, '($1);');
    
    // Fix patterns like: return (((((x as any).prop -> return (x as any).prop
    content = content.replace(/return\s+\(\(\(\(\(/g, 'return (');
    content = content.replace(/return\s+\(\(\(\(/g, 'return (');
    content = content.replace(/return\s+\(\(\(/g, 'return (');
    content = content.replace(/return\s+\(\(/g, 'return (');
    
    // Fix patterns in addEventListener
    content = content.replace(/addEventListener\("change",\s*\(\(event\)\s*=>/g, 'addEventListener("change", (event) =>');
    
    // Fix patterns like: store.setView(((view as any); -> store.setView(view as any);
    content = content.replace(/\((\w+)\)\((\(view as any\));/g, '($1)(view as any);');
    
    // Fix patterns like: (featureStore as any).features || [] -> ((featureStore as any).features || [])
    content = content.replace(/return\s+\(\(\(\(\((\w+\s+as\s+any)\)\.(\w+)\s+\|\|\s+\[\]/g, 'return (($1).$2 || []');
    
    // Count fixes
    if (content !== originalContent) {
      fixes = (originalContent.match(/\(\(/g) || []).length - (content.match(/\(\(/g) || []).length;
      writeFileSync(filePath, content);
      fixedCount++;
      totalFixes += fixes;
      console.log(`✓ Fixed ${filePath} (${fixes} fixes)`);
    }
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
  }
}

// Function to recursively find all TypeScript and Vue files
function findFiles(dir) {
  const files = [];
  
  function traverse(currentDir) {
    try {
      const entries = readdirSync(currentDir);
      
      for (const entry of entries) {
        const fullPath = join(currentDir, entry);
        const stat = statSync(fullPath);
        
        if (stat.isDirectory()) {
          // Skip node_modules, dist and .git directories
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

// Find all TypeScript and Vue files in src
const srcDir = join(process.cwd(), 'src');
console.log('🔍 Searching for TypeScript and Vue files in src/...\n');

const files = findFiles(srcDir);
console.log(`Found ${files.length} files\n`);

// Fix each file
files.forEach(fixFile);

console.log(`\n✅ Fixed ${fixedCount} files with ${totalFixes} total fixes`);

// Check for remaining issues
console.log('\n🔍 Checking for remaining double parentheses...\n');

import { exec } from 'child_process';

exec('grep -r "((.*as any)" src --include="*.ts" --include="*.vue" | wc -l', (error, stdout) => {
  const remaining = parseInt(stdout.trim()) || 0;
  if (remaining > 0) {
    console.log(`⚠️  Still ${remaining} double parentheses patterns remaining`);
    console.log('\nRun the following to see them:');
    console.log('grep -r "((.*as any)" src --include="*.ts" --include="*.vue"');
  } else {
    console.log('✅ All double parentheses patterns fixed!');
  }
});