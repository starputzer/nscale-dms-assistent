/**
 * Script to check Vue components that use locale without importing it from useI18n
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
const properImportPattern = /const\s*\{.*locale.*\}\s*=\s*useI18n/;

// Process a single file
function processFile(filePath) {
  console.log(`Checking ${path.basename(filePath)}...`);
  
  // Read the file content
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Check if it references locale.value
  if (localeReferencePattern.test(content)) {
    // Check if it properly imports locale
    if (!properImportPattern.test(content)) {
      console.log(`⚠️ WARNING: ${path.basename(filePath)} references locale.value but doesn't import it properly from useI18n!`);
      return true;
    } else {
      console.log(`✅ ${path.basename(filePath)} correctly imports locale from useI18n`);
      return false;
    }
  } else {
    console.log(`ℹ️ ${path.basename(filePath)} doesn't use locale.value`);
    return false;
  }
}

// Read all Vue files in the admin directories
try {
  let issuesFoundCount = 0;
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
        issuesFoundCount++;
      }
    });
  });
  
  console.log(`\n👍 Completed! Found ${issuesFoundCount} issues in ${processedFilesCount} files.`);
} catch (error) {
  console.error('❌ Error:', error);
}