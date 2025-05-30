#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Fix logger calls in diagnostics.ts
const diagnosticsPath = path.join(__dirname, 'src/bridge/diagnostics.ts');
let content = fs.readFileSync(diagnosticsPath, 'utf8');

// Replace all logger calls with object parameters to use JSON.stringify
const loggerPatterns = [
  // logger.error with error object
  {
    pattern: /logger\.error\("([^"]+)",\s*error\)/g,
    replacement: 'logger.error("$1", error instanceof Error ? error.message : String(error))'
  },
  // logger.warn/info/debug with object
  {
    pattern: /logger\.(warn|info|debug)\("([^"]+)",\s*\{([^}]+)\}\)/g,
    replacement: 'logger.$1("$2", JSON.stringify({$3}))'
  },
  // Simple logger calls that should just work
  {
    pattern: /logger\.(warn|info|debug|error)\("([^"]+)"\)/g,
    replacement: 'logger.$1("$2")'
  }
];

loggerPatterns.forEach(({ pattern, replacement }) => {
  content = content.replace(pattern, replacement);
});

// Write back
fs.writeFileSync(diagnosticsPath, content, 'utf8');

console.log('Fixed logger errors in diagnostics.ts');

// Also fix the unused imports
const files = [
  'src/bridge/diagnostics.ts',
  'src/bridge/enhanced/TypescriptDiagnosticTools.ts'
];

files.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Remove unused imports
    content = content.replace(/import\s+{\s*BridgeLogger\s*}\s+from\s+"[^"]+";?\s*\n/g, '');
    
    // Fix specific imports
    if (file.includes('diagnostics.ts')) {
      // Keep bridgeLogger import
      if (!content.includes('import { bridgeLogger }')) {
        content = content.replace(
          'import type {',
          'import { bridgeLogger } from "./core/logger";\nimport type {'
        );
      }
    }
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Fixed imports in ${file}`);
  }
});