#!/usr/bin/env node
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

console.log('🔧 Fixing all syntax errors from auto-fixer (Final comprehensive fix)\n');

let fixedCount = 0;
let totalErrors = 0;

// Function to fix syntax errors in a file
function fixFile(filePath) {
  try {
    let content = readFileSync(filePath, 'utf8');
    let originalContent = content;
    let fileErrors = 0;
    
    // Fix double parentheses at start of line: ((window as any) -> (window as any)
    const doubleParenPattern = /\(\((\w+\s+as\s+any)\)/g;
    content = content.replace(doubleParenPattern, (match, p1) => {
      fileErrors++;
      return `(${p1})`;
    });
    
    // Fix pattern: "x as any).method" -> "(x as any).method"
    const missingOpenParenPattern = /(\w+)\s+as\s+any\)\.(\w+)/g;
    content = content.replace(missingOpenParenPattern, (match, p1, p2) => {
      fileErrors++;
      return `(${p1} as any).${p2}`;
    });
    
    // Fix pattern: includes((x as any)) -> includes(x as any)
    const doubleParenIncludes = /\.includes\(\(([^)]+\s+as\s+any)\)\)/g;
    content = content.replace(doubleParenIncludes, (match, p1) => {
      fileErrors++;
      return `.includes(${p1})`;
    });
    
    // Fix pattern: "x as any)," -> "(x as any),"
    const missingOpenParenComma = /(\w+)\s+as\s+any\),/g;
    content = content.replace(missingOpenParenComma, (match, p1) => {
      fileErrors++;
      return `(${p1} as any),`;
    });
    
    // Fix pattern: "x as any);" -> "(x as any);"
    const missingOpenParenSemi = /(\w+)\s+as\s+any\);/g;
    content = content.replace(missingOpenParenSemi, (match, p1) => {
      fileErrors++;
      return `(${p1} as any);`;
    });
    
    // Fix pattern: "x as any) " -> "(x as any) " (with space)
    const missingOpenParenSpace = /(\w+)\s+as\s+any\)\s/g;
    content = content.replace(missingOpenParenSpace, (match, p1) => {
      fileErrors++;
      return `(${p1} as any) `;
    });
    
    // Fix pattern: "x as any))" -> "(x as any))"
    const missingOpenParenDouble = /(\w+)\s+as\s+any\)\)/g;
    content = content.replace(missingOpenParenDouble, (match, p1) => {
      fileErrors++;
      return `(${p1} as any))`;
    });
    
    // Fix pattern: .includes(savedTheme as any) { -> .includes(savedTheme as any)) {
    const missingCloseParenBrace = /\.includes\(([^)]+\s+as\s+any)\)\s*\{/g;
    content = content.replace(missingCloseParenBrace, (match, p1) => {
      fileErrors++;
      return `.includes(${p1})) {`;
    });
    
    // Fix malformed expressions like: (response.(((data as any) -> (response.data as any)
    const malformedExpression = /\((\w+)\.\(\(\((\w+)\s+as\s+any\)/g;
    content = content.replace(malformedExpression, (match, p1, p2) => {
      fileErrors++;
      return `(${p1}.${p2} as any)`;
    });
    
    // Fix pattern: (i18n.((global as any) -> (i18n.global as any)
    const malformedDotExpression = /\((\w+)\.\(\((\w+)\s+as\s+any\)/g;
    content = content.replace(malformedDotExpression, (match, p1, p2) => {
      fileErrors++;
      return `(${p1}.${p2} as any)`;
    });
    
    // Fix pattern with extra parentheses in conditionals
    const extraParensInConditional = /if\s*\([^)]*Object\.values\([^)]+\)\.includes\(([^)]+\s+as\s+any)\)\s*\{/g;
    content = content.replace(extraParensInConditional, (match, p1) => {
      if (!match.includes(')) {')) {
        fileErrors++;
        return match.replace(`) {`, `)) {`);
      }
      return match;
    });
    
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
    
    // Fix double "this.this" that might have been introduced
    content = content.replace(/this\.this\./g, 'this.');
    
    // Remove multiple "as any" in a row
    content = content.replace(/as\s+any\s+as\s+any/g, 'as any');
    
    // Fix broken parentheses patterns
    content = content.replace(/\)\s+as\s+any\)/g, ')');
    
    if (content !== originalContent) {
      writeFileSync(filePath, content);
      fixedCount++;
      totalErrors += fileErrors;
      console.log(`✓ Fixed ${filePath} (${fileErrors} errors)`);
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

console.log(`\n✅ Fixed ${fixedCount} files with ${totalErrors} total errors`);
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
        
        // Try to show the problematic line
        try {
          const fileContent = readFileSync(fileMatch[1], 'utf8');
          const lines = fileContent.split('\n');
          const lineNum = parseInt(fileMatch[2]) - 1;
          if (lines[lineNum]) {
            console.log(`\n📝 Problem line ${fileMatch[2]}:`);
            console.log(`   ${lines[lineNum]}`);
            console.log(`   ${' '.repeat(parseInt(fileMatch[3]) - 1)}^`);
          }
        } catch (e) {
          // Ignore if we can't read the file
        }
      }
    }
  } else {
    console.log('✅ Build successful!');
    console.log('\n📊 Bundle analysis available at: dist/bundle-analysis.html');
  }
});