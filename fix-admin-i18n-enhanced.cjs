/**
 * Enhanced fix for i18n implementation in Admin Panel components
 * 
 * This script updates all admin tab components to use the global i18n scope
 * with inheritance enabled, fixing the "Not available in legacy mode" error.
 */

const fs = require('fs');
const path = require('path');

// Admin components directories to search
const directories = [
  path.join(__dirname, 'src/components/admin'),
  path.join(__dirname, 'src/components/admin/tabs'),
  path.join(__dirname, 'src/views')
];

// Pattern to match and replace i18n initialization
const i18nInitPatterns = [
  /const\s*\{\s*t\s*,?\s*(?:locale)?\s*\}\s*=\s*useI18n\(\);/g,
  /const\s*\{\s*t\s*\}\s*=\s*useI18n\(\);/g,
  /const\s*\{\s*t\s*\}\s*=\s*useI18n\(\{\s*useScope:\s*['"]global['"]\s*\}\);/g
];

const i18nInitReplacement = 
`const { t } = useI18n({
  useScope: 'global',
  inheritLocale: true
});
console.log('[i18n] Component initialized with global scope and inheritance');`;

// Process a single file
function processFile(filePath) {
  console.log(`Processing ${path.basename(filePath)}...`);
  
  // Read the file content
  let content = fs.readFileSync(filePath, 'utf8');
  let updated = false;
  
  // Check if it uses i18n
  if (content.includes('useI18n')) {
    // Try each pattern
    for (const pattern of i18nInitPatterns) {
      if (pattern.test(content)) {
        // Replace the i18n initialization to use global scope with inheritance
        content = content.replace(pattern, i18nInitReplacement);
        updated = true;
        break;
      }
    }
    
    if (updated) {
      // Write the updated content back
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Updated ${path.basename(filePath)}`);
      return true;
    } else {
      console.log(`⚠️ Has useI18n but didn't match patterns in ${path.basename(filePath)}`);
      return false;
    }
  } else {
    console.log(`ℹ️ No i18n usage found in ${path.basename(filePath)}, skipping`);
    return false;
  }
}

// Read all Vue files in the admin directories
try {
  let updatedFilesCount = 0;
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
        updatedFilesCount++;
      }
    });
  });
  
  console.log(`\n👍 Completed! Updated ${updatedFilesCount} out of ${processedFilesCount} files.`);
} catch (error) {
  console.error('❌ Error:', error);
}