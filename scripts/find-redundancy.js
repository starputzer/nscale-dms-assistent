#!/usr/bin/env node

/**
 * TypeScript Redundancy Finder
 *
 * This script helps developers identify potential code redundancies
 * before creating new TypeScript files or functions.
 *
 * Usage:
 *   node find-redundancy.js --type "user interface"
 *   node find-redundancy.js --function "format date"
 *   node find-redundancy.js --file "api-client"
 *   node find-redundancy.js --pattern "extends Entity"
 *
 * Options:
 *   --type       Search for type definitions (interfaces, types)
 *   --function   Search for function definitions or similar functionality
 *   --file       Search for files with similar names or purposes
 *   --pattern    Search for a specific code pattern
 *   --dir        Limit search to a specific directory (default: src)
 *   --verbose    Show more detailed output
 */

const fs = require('fs');
const path = require('path');
const util = require('util');
const exec = util.promisify(require('child_process').exec);
const readline = require('readline');

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  type: getArg('--type'),
  function: getArg('--function'),
  file: getArg('--file'),
  pattern: getArg('--pattern'),
  dir: getArg('--dir') || 'src',
  verbose: args.includes('--verbose')
};

// Main function
async function main() {
  console.log('\x1b[36m%s\x1b[0m', '🔍 TypeScript Redundancy Finder');
  console.log('\x1b[36m%s\x1b[0m', '================================');

  if (!options.type && !options.function && !options.file && !options.pattern) {
    console.log('\x1b[33m%s\x1b[0m', '⚠️  Please provide at least one search criteria');
    showUsage();
    process.exit(1);
  }

  const basePath = path.resolve(process.cwd());
  const searchDir = path.join(basePath, options.dir);

  if (!fs.existsSync(searchDir)) {
    console.log('\x1b[31m%s\x1b[0m', `❌ Directory not found: ${searchDir}`);
    process.exit(1);
  }

  console.log('\x1b[36m%s\x1b[0m', `\n📂 Searching in: ${options.dir}`);

  // Perform searches based on provided options
  let results = [];

  if (options.type) {
    console.log('\x1b[36m%s\x1b[0m', `\n🔍 Searching for type: "${options.type}"`);
    results = results.concat(await searchForType(options.type, searchDir));
  }

  if (options.function) {
    console.log('\x1b[36m%s\x1b[0m', `\n🔍 Searching for function: "${options.function}"`);
    results = results.concat(await searchForFunction(options.function, searchDir));
  }

  if (options.file) {
    console.log('\x1b[36m%s\x1b[0m', `\n🔍 Searching for file: "${options.file}"`);
    results = results.concat(await searchForFile(options.file, searchDir));
  }

  if (options.pattern) {
    console.log('\x1b[36m%s\x1b[0m', `\n🔍 Searching for pattern: "${options.pattern}"`);
    results = results.concat(await searchForPattern(options.pattern, searchDir));
  }

  // Deduplicate results
  const uniqueResults = deduplicateResults(results);

  // Display summary
  console.log('\x1b[36m%s\x1b[0m', '\n📊 Search Results Summary');
  console.log('\x1b[36m%s\x1b[0m', '======================');
  console.log(`🔎 Found ${uniqueResults.length} potential matches\n`);

  if (uniqueResults.length === 0) {
    console.log('\x1b[32m%s\x1b[0m', '✅ No redundancies found. You can proceed with creating a new implementation.');
  } else {
    console.log('\x1b[33m%s\x1b[0m', '⚠️  Potential redundancies found. Please review the following results before creating new code:\n');
    displayResults(uniqueResults);
  }

  // If redundancies were found, ask if the user wants to view files
  if (uniqueResults.length > 0) {
    await promptToViewFiles(uniqueResults);
  }
}

// Search for type definitions
async function searchForType(typeName, searchDir) {
  const typePatterns = [
    `interface.*${typeName}`,
    `type.*${typeName}`,
    `class.*${typeName}`,
    `enum.*${typeName}`,
    `namespace.*${typeName}`
  ];

  let results = [];
  for (const pattern of typePatterns) {
    const { stdout } = await exec(`grep -r "${pattern}" --include="*.ts" ${searchDir} || true`);
    
    if (stdout.trim()) {
      const matches = parseGrepOutput(stdout);
      results = results.concat(matches.map(match => ({
        ...match,
        searchType: 'type',
        searchTerm: typeName,
        priority: getPriorityForType(match.line, typeName)
      })));
    }
  }
  
  // Also check for type imports
  const { stdout: importStdout } = await exec(`grep -r "import.*{.*${typeName}" --include="*.ts" ${searchDir} || true`);
  if (importStdout.trim()) {
    const matches = parseGrepOutput(importStdout);
    results = results.concat(matches.map(match => ({
      ...match,
      searchType: 'import',
      searchTerm: typeName,
      priority: 3
    })));
  }

  return results;
}

// Search for function definitions
async function searchForFunction(functionName, searchDir) {
  const functionPatterns = [
    `function.*${functionName}`,
    `const.*${functionName}.*=`,
    `let.*${functionName}.*=`,
    `${functionName}.*\\(`,
    `${functionName}:.*=>`,
  ];

  let results = [];
  for (const pattern of functionPatterns) {
    const { stdout } = await exec(`grep -r "${pattern}" --include="*.ts" ${searchDir} || true`);
    
    if (stdout.trim()) {
      const matches = parseGrepOutput(stdout);
      results = results.concat(matches.map(match => ({
        ...match,
        searchType: 'function',
        searchTerm: functionName,
        priority: getPriorityForFunction(match.line, functionName)
      })));
    }
  }
  
  // Also check for function imports
  const { stdout: importStdout } = await exec(`grep -r "import.*{.*${functionName}" --include="*.ts" ${searchDir} || true`);
  if (importStdout.trim()) {
    const matches = parseGrepOutput(importStdout);
    results = results.concat(matches.map(match => ({
      ...match,
      searchType: 'import',
      searchTerm: functionName,
      priority: 3
    })));
  }

  return results;
}

// Search for files with similar names
async function searchForFile(fileName, searchDir) {
  const { stdout } = await exec(`find ${searchDir} -type f -name "*${fileName}*.ts" -o -name "*${fileName}*.tsx" || true`);
  
  const results = [];
  if (stdout.trim()) {
    const files = stdout.trim().split('\n');
    for (const file of files) {
      // Get first few lines of the file for context
      const { stdout: filePreview } = await exec(`head -n 20 "${file}" | grep -v "^\\s*$" || true`);
      
      results.push({
        file,
        line: filePreview.split('\n')[0] || '',
        lineNumber: 1,
        searchType: 'file',
        searchTerm: fileName,
        priority: getFilenameSimilarity(path.basename(file), fileName)
      });
    }
  }
  
  return results;
}

// Search for specific code pattern
async function searchForPattern(pattern, searchDir) {
  const { stdout } = await exec(`grep -r "${pattern}" --include="*.ts" ${searchDir} || true`);
  
  let results = [];
  if (stdout.trim()) {
    const matches = parseGrepOutput(stdout);
    results = results.concat(matches.map(match => ({
      ...match,
      searchType: 'pattern',
      searchTerm: pattern,
      priority: getPatternPriority(match.line, pattern)
    })));
  }
  
  return results;
}

// Helper function to parse grep output
function parseGrepOutput(stdout) {
  const lines = stdout.trim().split('\n');
  return lines.map(line => {
    const match = line.match(/^([^:]+):(\d+):(.*)/);
    if (match) {
      return {
        file: match[1],
        lineNumber: parseInt(match[2], 10),
        line: match[3].trim()
      };
    }
    return null;
  }).filter(Boolean);
}

// Get priority score for type matches
function getPriorityForType(line, typeName) {
  // Direct definition has highest priority
  if (line.includes(`interface ${typeName}`) || line.includes(`type ${typeName} =`)) {
    return 1;
  }
  // Extension or implementation has medium priority
  if (line.includes(`extends ${typeName}`) || line.includes(`implements ${typeName}`)) {
    return 2;
  }
  // Similar name but not exact match
  if (line.toLowerCase().includes(typeName.toLowerCase())) {
    return 3;
  }
  return 4;
}

// Get priority score for function matches
function getPriorityForFunction(line, functionName) {
  // Direct definition has highest priority
  if (line.includes(`function ${functionName}`) || line.includes(`const ${functionName} =`)) {
    return 1;
  }
  // Method definition has medium priority
  if (line.includes(`${functionName}(`)) {
    return 2;
  }
  // Similar name but not exact match
  if (line.toLowerCase().includes(functionName.toLowerCase())) {
    return 3;
  }
  return 4;
}

// Calculate similarity between filenames
function getFilenameSimilarity(filename, searchTerm) {
  const baseName = path.basename(filename, path.extname(filename));
  
  // Direct match
  if (baseName === searchTerm) {
    return 1;
  }
  
  // Contains search term
  if (baseName.includes(searchTerm)) {
    return 2;
  }
  
  // Words match partially
  const searchWords = searchTerm.split(/[-_\s]/).filter(Boolean);
  const filenameWords = baseName.split(/[-_\s]/).filter(Boolean);
  
  const matchingWords = searchWords.filter(word => 
    filenameWords.some(fword => fword.toLowerCase().includes(word.toLowerCase()))
  );
  
  if (matchingWords.length > 0) {
    return 3;
  }
  
  return 4;
}

// Get priority for pattern matches
function getPatternPriority(line, pattern) {
  // Direct match
  if (line.includes(pattern)) {
    return 1;
  }
  
  // Case-insensitive match
  if (line.toLowerCase().includes(pattern.toLowerCase())) {
    return 2;
  }
  
  return 3;
}

// Remove duplicate results
function deduplicateResults(results) {
  const uniqueFiles = {};
  
  for (const result of results) {
    const key = `${result.file}:${result.lineNumber}`;
    
    if (!uniqueFiles[key] || uniqueFiles[key].priority > result.priority) {
      uniqueFiles[key] = result;
    }
  }
  
  return Object.values(uniqueFiles).sort((a, b) => a.priority - b.priority);
}

// Display search results
function displayResults(results) {
  let currentFile = null;
  
  for (const result of results) {
    // Show filename if it's different from the previous one
    if (currentFile !== result.file) {
      currentFile = result.file;
      const relativePath = path.relative(process.cwd(), currentFile);
      console.log('\x1b[36m%s\x1b[0m', `\n📄 ${relativePath}`);
    }
    
    // Show line with context
    const searchTypeIcon = getSearchTypeIcon(result.searchType);
    console.log(`  ${searchTypeIcon} Line ${result.lineNumber}: ${highlightText(result.line, result.searchTerm)}`);
    
    // Show more context if verbose mode is enabled
    if (options.verbose) {
      console.log(`    Priority: ${result.priority}`);
      console.log(`    Match Type: ${result.searchType}`);
    }
  }
}

// Prompt user to view files
async function promptToViewFiles(results) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const uniqueFiles = [...new Set(results.map(r => r.file))];
  
  console.log('\n\x1b[36m%s\x1b[0m', '📋 Would you like to view any of these files?');
  
  for (let i = 0; i < uniqueFiles.length; i++) {
    const relativePath = path.relative(process.cwd(), uniqueFiles[i]);
    console.log(`  ${i + 1}. ${relativePath}`);
  }
  
  console.log('  0. Exit');
  
  const answer = await new Promise(resolve => {
    rl.question('\nEnter a number (0-' + uniqueFiles.length + '): ', resolve);
  });
  
  const fileIndex = parseInt(answer, 10) - 1;
  
  if (fileIndex >= 0 && fileIndex < uniqueFiles.length) {
    const selectedFile = uniqueFiles[fileIndex];
    const relativePath = path.relative(process.cwd(), selectedFile);
    console.log('\n\x1b[36m%s\x1b[0m', `📄 Viewing file: ${relativePath}`);
    
    const { stdout } = await exec(`cat "${selectedFile}"`);
    console.log('\n' + stdout);
    
    // Recursive call to allow viewing more files
    await promptToViewFiles(results);
  }
  
  rl.close();
}

// Helper function to get an argument value
function getArg(name) {
  const index = args.indexOf(name);
  if (index !== -1 && index + 1 < args.length) {
    return args[index + 1];
  }
  return null;
}

// Show usage information
function showUsage() {
  console.log(`
Usage:
  node find-redundancy.js --type "user interface"
  node find-redundancy.js --function "format date"
  node find-redundancy.js --file "api-client"
  node find-redundancy.js --pattern "extends Entity"

Options:
  --type       Search for type definitions (interfaces, types)
  --function   Search for function definitions or similar functionality
  --file       Search for files with similar names or purposes
  --pattern    Search for a specific code pattern
  --dir        Limit search to a specific directory (default: src)
  --verbose    Show more detailed output
  `);
}

// Get icon for search type
function getSearchTypeIcon(searchType) {
  switch (searchType) {
    case 'type': return '🔷';
    case 'function': return '🔶';
    case 'file': return '📄';
    case 'pattern': return '🔍';
    case 'import': return '📥';
    default: return '•';
  }
}

// Highlight search term in text
function highlightText(text, term) {
  if (!term) return text;
  
  // Simple case-insensitive highlighting
  const regex = new RegExp(term.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'gi');
  return text.replace(regex, match => `\x1b[33m${match}\x1b[0m`);
}

// Run the main function
main().catch(error => {
  console.error('\x1b[31m%s\x1b[0m', '❌ Error:', error.message);
  process.exit(1);
});