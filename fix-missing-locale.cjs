/**
 * Script to fix Vue components that use locale without importing it from useI18n
 */

const fs = require('fs');
const path = require('path');

// Admin components directories to search
const directories = [
  path.join(__dirname, 'src/components/admin'),
  path.join(__dirname, 'src/components/admin/tabs'),
  path.join(__dirname, 'src/views')
];

// Pattern to detect locale references without proper import
const localeReferencePattern = /locale\.value/;
const simpleUsagePattern = /const\s*\{\s*t\s*\}\s*=\s*useI18n\(\{[^}]*\}\);/;
const inheritanceUsagePattern = /const\s*\{\s*t\s*\}\s*=\s*useI18n\(\{\s*useScope:\s*['"]global['"]\s*,\s*inheritLocale:\s*true\s*\}\);/;

// Replace patterns
const simpleReplacement = 'const { t, locale } = useI18n({';
const inheritanceReplacement = 'const { t, locale } = useI18n({ useScope: \'global\', inheritLocale: true });';

// Process a single file
function processFile(filePath) {
  console.log(`Checking ${path.basename(filePath)}...`);
  
  // Read the file content
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Check if it references locale.value
  if (localeReferencePattern.test(content)) {
    // Check against both patterns
    if (inheritanceUsagePattern.test(content)) {
      console.log(`🔄 Updating ${path.basename(filePath)} with inheritance pattern`);
      content = content.replace(/const\s*\{\s*t\s*\}\s*=\s*useI18n\(\{\s*useScope:\s*['"]global['"]\s*,\s*inheritLocale:\s*true\s*\}\);/, inheritanceReplacement);
      fs.writeFileSync(filePath, content, 'utf8');
      return true;
    } else if (simpleUsagePattern.test(content)) {
      console.log(`🔄 Updating ${path.basename(filePath)} with simple pattern`);
      content = content.replace(/const\s*\{\s*t\s*\}\s*=\s*useI18n\(\{/, simpleReplacement);
      fs.writeFileSync(filePath, content, 'utf8');
      return true;
    } else {
      console.log(`⚠️ WARNING: ${path.basename(filePath)} has a complex i18n setup, needs manual fix!`);
      return false;
    }
  } else {
    console.log(`ℹ️ ${path.basename(filePath)} doesn't use locale.value`);
    return false;
  }
}

// Read all Vue files in the admin directories
try {
  let fixedFilesCount = 0;
  let processedFilesCount = 0;
  
  // Process all directories
  directories.forEach(directory => {
    if (!fs.existsSync(directory)) {
      console.warn(`Directory does not exist: ${directory}`);
      return;
    }
    
    console.log(`\nSearching in: ${directory}`);
    
    const files = fs.readdirSync(directory)
      .filter(file => file.endsWith('.vue'))
      .map(file => path.join(directory, file));
    
    files.forEach(filePath => {
      processedFilesCount++;
      if (processFile(filePath)) {
        fixedFilesCount++;
      }
    });
  });
  
  console.log(`\n👍 Completed! Fixed ${fixedFilesCount} issues in ${processedFilesCount} files.`);
} catch (error) {
  console.error('❌ Error:', error);
}