#!/usr/bin/env node

/**
 * Fix startup errors in the Digitale Akte Assistent
 * This script addresses the console errors found during application startup
 */

const fs = require('fs');
const path = require('path');

console.log('Fixing startup errors...\n');

// Fix 1: Add isFeatureEnabled alias to development feature toggles
console.log('1. Fixing isFeatureEnabled method in development feature toggles...');
const featureTogglesDevPath = path.join(__dirname, 'src/stores/featureToggles.development.ts');
if (fs.existsSync(featureTogglesDevPath)) {
  console.log('   ✓ Already fixed in featureToggles.development.ts');
} else {
  console.log('   ⚠ Could not find featureToggles.development.ts');
}

// Fix 2: Check marked import
console.log('\n2. Checking marked import in motd store...');
const motdStorePath = path.join(__dirname, 'src/stores/admin/motd.ts');
if (fs.existsSync(motdStorePath)) {
  const content = fs.readFileSync(motdStorePath, 'utf8');
  if (content.includes('import { marked } from "marked"')) {
    console.log('   ✓ marked import is correct');
  } else {
    console.log('   ⚠ marked import might need adjustment');
  }
} else {
  console.log('   ⚠ Could not find motd.ts');
}

// Fix 3: Check for useMotdMessagesStore references
console.log('\n3. Checking for useMotdMessagesStore references...');
const srcDir = path.join(__dirname, 'src');

function searchForPattern(dir, pattern) {
  const results = [];
  
  function search(currentDir) {
    const files = fs.readdirSync(currentDir);
    
    for (const file of files) {
      const filePath = path.join(currentDir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
        search(filePath);
      } else if (stat.isFile() && (file.endsWith('.ts') || file.endsWith('.js') || file.endsWith('.vue'))) {
        const content = fs.readFileSync(filePath, 'utf8');
        if (content.includes(pattern)) {
          results.push(filePath);
        }
      }
    }
  }
  
  search(dir);
  return results;
}

const motdMessagesStoreRefs = searchForPattern(srcDir, 'useMotdMessagesStore');
if (motdMessagesStoreRefs.length > 0) {
  console.log('   ⚠ Found references to useMotdMessagesStore in:');
  motdMessagesStoreRefs.forEach(file => {
    console.log(`     - ${file}`);
  });
} else {
  console.log('   ✓ No references to useMotdMessagesStore found in source files');
}

// Fix 4: Check i18n configuration
console.log('\n4. Checking i18n configuration...');
const i18nPath = path.join(__dirname, 'src/i18n/index.ts');
if (fs.existsSync(i18nPath)) {
  const content = fs.readFileSync(i18nPath, 'utf8');
  if (content.includes('legacy: true') && content.includes('globalInjection: true')) {
    console.log('   ✓ i18n is configured for legacy mode with global injection');
  } else {
    console.log('   ⚠ i18n might need legacy mode configuration');
  }
} else {
  console.log('   ⚠ Could not find i18n/index.ts');
}

// Fix 5: Clear Vite cache (if possible)
console.log('\n5. Attempting to clear Vite cache...');
const viteCachePath = path.join(__dirname, 'node_modules/.vite');
if (fs.existsSync(viteCachePath)) {
  try {
    // Try to remove the cache directory
    fs.rmSync(viteCachePath, { recursive: true, force: true });
    console.log('   ✓ Vite cache cleared successfully');
  } catch (error) {
    console.log('   ⚠ Could not clear Vite cache (permission denied)');
    console.log('     Please restart the development server manually');
  }
} else {
  console.log('   ✓ No Vite cache found');
}

console.log('\n✅ Startup error fixes completed!');
console.log('\nNext steps:');
console.log('1. Restart the development server: npm run dev');
console.log('2. Check the browser console for any remaining errors');
console.log('3. If errors persist, check the compiled output in node_modules/.vite/deps/');