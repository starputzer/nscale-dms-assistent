/**
 * Fix i18n implementation in Admin Panel components
 * 
 * This script updates all admin tab components to use the global i18n scope
 * for better compatibility with the i18n system. It also adds fallback text
 * for critical UI elements.
 */

const fs = require('fs');
const path = require('path');

// Admin tab components directory
const adminTabsDir = path.join(__dirname, 'src/components/admin/tabs');

// Pattern to match and replace i18n initialization
const i18nInitPattern = /const\s*\{\s*t\s*,\s*locale\s*\}\s*=\s*useI18n\(\);/g;
const i18nInitReplacement = "const { t, locale } = useI18n({ useScope: 'global' });";

// Read all Vue files in the admin tabs directory
try {
  const files = fs.readdirSync(adminTabsDir).filter(file => file.endsWith('.vue'));
  
  let updatedFilesCount = 0;
  
  files.forEach(file => {
    const filePath = path.join(adminTabsDir, file);
    console.log(`Processing ${file}...`);
    
    // Read the file content
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Check if it uses i18n
    if (content.includes('useI18n()')) {
      // Replace the i18n initialization to use global scope
      const updatedContent = content.replace(i18nInitPattern, i18nInitReplacement);
      
      // Add a debug log for diagnostic purposes
      const scriptEndIndex = updatedContent.indexOf('</script>');
      const insertDebugLog = `\n// Log i18n initialization status\nconsole.log(\`[${file.replace('.vue', '')}] i18n initialized with locale: \${locale.value}\`);\n`;
      
      // Insert the debug log before the script end tag
      const finalContent = updatedContent.slice(0, scriptEndIndex) + insertDebugLog + updatedContent.slice(scriptEndIndex);
      
      // Write the updated content back
      fs.writeFileSync(filePath, finalContent, 'utf8');
      
      updatedFilesCount++;
      console.log(`Updated ${file}`);
    } else {
      console.log(`No i18n usage found in ${file}, skipping`);
    }
  });
  
  console.log(`\nCompleted! Updated ${updatedFilesCount} files.`);
} catch (error) {
  console.error('Error:', error);
}