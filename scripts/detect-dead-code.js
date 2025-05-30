#!/usr/bin/env node

/**
 * Dead Code Detection Script
 * 
 * Locally runs the same checks as the CI/CD pipeline
 * for dead code detection and analysis.
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');

const execAsync = promisify(exec);

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function runCommand(command, description) {
  log(`\n🔍 ${description}...`, 'blue');
  try {
    const { stdout, stderr } = await execAsync(command);
    return { success: true, stdout, stderr };
  } catch (error) {
    return { success: false, error: error.message, stdout: error.stdout, stderr: error.stderr };
  }
}

async function analyzeUnusedExports() {
  const result = await runCommand('npx ts-prune --error', 'Analyzing unused exports');
  
  if (result.stdout) {
    const lines = result.stdout.split('\n').filter(line => line.includes('is not used'));
    const count = lines.length;
    
    log(`Found ${count} unused exports`, count > 0 ? 'yellow' : 'green');
    
    if (count > 0) {
      log('\nTop 10 unused exports:', 'yellow');
      lines.slice(0, 10).forEach(line => console.log(`  ${line}`));
      if (count > 10) {
        log(`  ... and ${count - 10} more`, 'yellow');
      }
    }
    
    return { count, details: lines };
  }
  
  return { count: 0, details: [] };
}

async function findUnusedDependencies() {
  const result = await runCommand('npx depcheck --json', 'Checking for unused dependencies');
  
  if (result.stdout) {
    try {
      const data = JSON.parse(result.stdout);
      const unusedDeps = data.dependencies || [];
      const unusedDevDeps = data.devDependencies || [];
      
      log(`\nUnused dependencies: ${unusedDeps.length}`, unusedDeps.length > 0 ? 'yellow' : 'green');
      if (unusedDeps.length > 0) {
        unusedDeps.forEach(dep => console.log(`  - ${dep}`));
      }
      
      log(`\nUnused devDependencies: ${unusedDevDeps.length}`, unusedDevDeps.length > 0 ? 'yellow' : 'green');
      if (unusedDevDeps.length > 0) {
        unusedDevDeps.forEach(dep => console.log(`  - ${dep}`));
      }
      
      return {
        dependencies: unusedDeps,
        devDependencies: unusedDevDeps,
        total: unusedDeps.length + unusedDevDeps.length
      };
    } catch (e) {
      log('Failed to parse depcheck results', 'red');
      return { dependencies: [], devDependencies: [], total: 0 };
    }
  }
  
  return { dependencies: [], devDependencies: [], total: 0 };
}

async function detectDuplicateCode() {
  const result = await runCommand(
    'npx jscpd src --ignore "**/*.spec.ts,**/*.test.ts,**/*.mock.ts" --reporters "json,console" --output "./"',
    'Detecting duplicate code'
  );
  
  try {
    const reportPath = path.join(process.cwd(), 'jscpd-report.json');
    const reportExists = await fs.access(reportPath).then(() => true).catch(() => false);
    
    if (reportExists) {
      const report = JSON.parse(await fs.readFile(reportPath, 'utf8'));
      const clones = report.statistics.clones;
      const percentage = report.statistics.percentage;
      
      log(`\nDuplicate code blocks: ${clones} (${percentage}% of codebase)`, clones > 0 ? 'yellow' : 'green');
      
      // Clean up report file
      await fs.unlink(reportPath).catch(() => {});
      
      return { clones, percentage };
    }
  } catch (e) {
    log('Failed to analyze duplicate code report', 'red');
  }
  
  return { clones: 0, percentage: 0 };
}

async function findPotentiallyUnusedFiles() {
  log('\n🔍 Finding potentially unused files...', 'blue');
  
  // Find all TypeScript files
  const { stdout: allFiles } = await execAsync('find src -name "*.ts" -o -name "*.tsx" | grep -v ".spec." | grep -v ".test." | grep -v ".mock."');
  const fileList = allFiles.trim().split('\n').filter(Boolean);
  
  const unusedFiles = [];
  
  for (const file of fileList) {
    const basename = path.basename(file, path.extname(file));
    
    // Skip index files and type definition files
    if (basename === 'index' || file.endsWith('.d.ts')) continue;
    
    // Check if the file is imported anywhere
    const { stdout } = await execAsync(`grep -r "from.*${basename}" src --include="*.ts" --include="*.tsx" --include="*.js" --include="*.vue" | grep -v "${file}:" | head -1`);
    
    if (!stdout.trim()) {
      unusedFiles.push(file);
    }
  }
  
  log(`\nPotentially unused files: ${unusedFiles.length}`, unusedFiles.length > 0 ? 'yellow' : 'green');
  if (unusedFiles.length > 0) {
    unusedFiles.slice(0, 20).forEach(file => console.log(`  - ${file}`));
    if (unusedFiles.length > 20) {
      log(`  ... and ${unusedFiles.length - 20} more`, 'yellow');
    }
  }
  
  return unusedFiles;
}

async function generateReport(results) {
  const report = `# Dead Code Detection Report

Generated on: ${new Date().toISOString()}

## Summary

- **Unused exports**: ${results.unusedExports.count}
- **Unused dependencies**: ${results.unusedDeps.dependencies.length}
- **Unused devDependencies**: ${results.unusedDeps.devDependencies.length}
- **Duplicate code blocks**: ${results.duplicates.clones} (${results.duplicates.percentage}%)
- **Potentially unused files**: ${results.unusedFiles.length}

## Recommendations

${results.unusedExports.count > 50 ? '⚠️ **High number of unused exports detected.** Consider removing unused code or updating imports.\n' : ''}
${results.unusedDeps.total > 10 ? '⚠️ **Many unused dependencies detected.** Run `npm prune` or remove from package.json.\n' : ''}
${results.duplicates.percentage > 5 ? '⚠️ **Significant code duplication detected.** Consider refactoring common code into shared utilities.\n' : ''}
${results.unusedFiles.length > 20 ? '⚠️ **Many potentially unused files detected.** Review and remove if confirmed unused.\n' : ''}

## Action Items

1. Review and remove unused exports
2. Clean up unused dependencies: \`npm uninstall ${results.unusedDeps.dependencies.join(' ')}\`
3. Review potentially unused files for removal
4. Refactor duplicate code blocks
`;

  const reportPath = path.join(process.cwd(), 'dead-code-report.md');
  await fs.writeFile(reportPath, report);
  
  log(`\n📄 Report saved to: ${reportPath}`, 'green');
  
  return report;
}

async function main() {
  log('🚀 Starting Dead Code Detection\n', 'cyan');
  
  const results = {
    unusedExports: await analyzeUnusedExports(),
    unusedDeps: await findUnusedDependencies(),
    duplicates: await detectDuplicateCode(),
    unusedFiles: await findPotentiallyUnusedFiles(),
  };
  
  await generateReport(results);
  
  // Summary
  log('\n📊 Summary:', 'cyan');
  
  const issues = [];
  if (results.unusedExports.count > 50) issues.push('Too many unused exports');
  if (results.unusedDeps.total > 10) issues.push('Too many unused dependencies');
  if (results.duplicates.percentage > 5) issues.push('High code duplication');
  if (results.unusedFiles.length > 20) issues.push('Many potentially unused files');
  
  if (issues.length === 0) {
    log('✅ No significant dead code issues found!', 'green');
  } else {
    log(`⚠️ Found ${issues.length} issue(s):`, 'yellow');
    issues.forEach(issue => log(`  - ${issue}`, 'yellow'));
    log('\nPlease review the report and take action.', 'yellow');
  }
}

// Run the script
main().catch(error => {
  log(`\n❌ Error: ${error.message}`, 'red');
  process.exit(1);
});