#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Fix Vue 3 import issues
function fixVue3Imports(content, filePath) {
  // Fix nextTick import
  content = content.replace(
    /import\s*{\s*([^}]*)\s*nextTick\s*([^}]*)\s*}\s*from\s*['"]vue['"]/g,
    (match, before, after) => {
      const otherImports = (before + after).split(',').filter(i => i.trim()).join(', ');
      if (otherImports) {
        return `import { ${otherImports} } from 'vue';\nimport { nextTick } from 'vue'`;
      }
      return `import { nextTick } from 'vue'`;
    }
  );

  // Fix missing Vue types
  const missingTypes = ['WatchOptions', 'WatchSource', 'WatchStopHandle'];
  missingTypes.forEach(type => {
    if (content.includes(type) && !content.includes(`type ${type}`)) {
      // Add type import
      content = content.replace(
        /import\s*{\s*([^}]+)\s*}\s*from\s*['"]vue['"]/,
        (match, imports) => {
          if (!imports.includes(type)) {
            return `import { ${imports} } from 'vue';\nimport type { ${type} } from 'vue'`;
          }
          return match;
        }
      );
    }
  });

  return content;
}

// Fix component exports
function fixComponentExports(content, filePath) {
  if (filePath.includes('components/base/index.ts')) {
    // Fix SelectOption and TabItem exports
    content = content.replace(
      /export\s*{\s*SelectOption\s*}\s*from\s*"\.\/SelectOption\.vue"/g,
      'export { default as SelectOption } from "./SelectOption.vue"'
    );
    content = content.replace(
      /export\s*{\s*TabItem\s*}\s*from\s*"\.\/TabItem\.vue"/g,
      'export { default as TabItem } from "./TabItem.vue"'
    );
  }
  return content;
}

// Fix implicit any types
function fixImplicitAny(content, filePath) {
  // Fix common parameter patterns
  content = content.replace(
    /\((\w+),\s*(\w+)\)\s*=>\s*{/g,
    (match, param1, param2) => {
      // Check if it's likely a value/oldValue pattern
      if (param1.includes('value') || param1.includes('Value')) {
        return `(${param1}: any, ${param2}: any) => {`;
      }
      return match;
    }
  );

  // Fix single parameter functions
  content = content.replace(
    /\((\w+)\)\s*=>\s*{/g,
    (match, param) => {
      // Only fix if it's likely a value parameter
      if (param.includes('value') || param.includes('Value') || param === 'messages') {
        return `(${param}: any) => {`;
      }
      return match;
    }
  );

  return content;
}

// Remove unused imports
function removeUnusedImports(content, filePath) {
  const unusedImports = [
    'watchEffect',
    'rafThrottle',
    'adaptiveRateLimiter',
    'visibilityThreshold',
    'batchUpdates'
  ];

  unusedImports.forEach(importName => {
    // Check if it's actually used in the code (not just imported)
    const importRegex = new RegExp(`import\\s*{[^}]*\\b${importName}\\b[^}]*}`, 'g');
    const usageRegex = new RegExp(`\\b${importName}\\s*\\(|\\b${importName}\\s*\\.`, 'g');
    
    if (content.match(importRegex) && !content.match(usageRegex)) {
      // Remove the import
      content = content.replace(
        new RegExp(`\\b${importName}\\s*,?\\s*`, 'g'),
        ''
      );
    }
  });

  // Clean up empty imports
  content = content.replace(/import\s*{\s*}\s*from\s*['"][^'"]+['"]/g, '');
  
  return content;
}

// Process files
const files = [
  'src/components/base/index.ts',
  'src/components/chat/MessageInput.spec.ts',
  'src/components/chat/optimizedWatchers.ts',
  'src/bridge/diagnostics.ts',
  'src/bridge-init.ts'
];

// Add more files via glob
const moreFiles = glob.sync('src/**/*.{ts,tsx,vue}', {
  ignore: ['**/node_modules/**', '**/dist/**'],
  cwd: __dirname
});

const allFiles = [...new Set([...files, ...moreFiles])];

allFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (!fs.existsSync(filePath)) return;

  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;

  // Apply fixes
  content = fixVue3Imports(content, filePath);
  content = fixComponentExports(content, filePath);
  content = fixImplicitAny(content, filePath);
  content = removeUnusedImports(content, filePath);

  // Only write if changed
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Fixed: ${file}`);
  }
});

console.log('TypeScript error fixes completed');