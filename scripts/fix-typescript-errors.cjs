#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Simple TypeScript error fixer that handles the most common issues
 */
class TypeScriptErrorFixer {
  constructor() {
    this.fixedFiles = 0;
    this.totalErrors = 0;
    this.fixedErrors = 0;
  }

  /**
   * Get TypeScript errors from compiler
   */
  getTypeScriptErrors() {
    try {
      execSync('npx tsc --noEmit', { stdio: 'pipe' });
      return [];
    } catch (error) {
      const output = error.stdout?.toString() || '';
      return this.parseErrors(output);
    }
  }

  /**
   * Parse error output into structured format
   */
  parseErrors(output) {
    const errors = [];
    const lines = output.split('\n');
    const errorRegex = /^(.+?)\((\d+),(\d+)\): error TS(\d+): (.+)$/;

    for (const line of lines) {
      const match = line.match(errorRegex);
      if (match) {
        errors.push({
          file: match[1],
          line: parseInt(match[2]),
          column: parseInt(match[3]),
          code: parseInt(match[4]),
          message: match[5]
        });
      }
    }

    return errors;
  }

  /**
   * Fix unused imports and variables (TS6133, TS6196)
   */
  fixUnusedImportsAndVariables(filePath, errors) {
    const relevantErrors = errors.filter(e => 
      e.file === filePath && (e.code === 6133 || e.code === 6196)
    );

    if (relevantErrors.length === 0) return false;

    let content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    let modified = false;

    // Extract unused identifiers
    const unusedIdentifiers = new Set();
    relevantErrors.forEach(error => {
      const match = error.message.match(/'([^']+)' is declared but/);
      if (match) {
        unusedIdentifiers.add(match[1]);
      }
    });

    // Process imports
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Handle import statements
      if (line.includes('import') && line.includes('from')) {
        let newLine = line;
        
        // Check for unused default imports
        const defaultImportMatch = line.match(/import\s+(\w+)\s+from/);
        if (defaultImportMatch && unusedIdentifiers.has(defaultImportMatch[1])) {
          // Remove entire import if only default import
          if (!line.includes('{')) {
            lines[i] = '';
            modified = true;
            continue;
          }
          // Remove just the default import
          newLine = newLine.replace(/import\s+\w+,?\s*/, 'import ');
        }

        // Check for unused named imports
        const namedImportsMatch = line.match(/\{([^}]+)\}/);
        if (namedImportsMatch) {
          const imports = namedImportsMatch[1].split(',').map(s => s.trim());
          const usedImports = imports.filter(imp => {
            const name = imp.split(' as ')[0].trim();
            return !unusedIdentifiers.has(name);
          });

          if (usedImports.length === 0) {
            // Remove entire import if no named imports are used
            if (!defaultImportMatch || unusedIdentifiers.has(defaultImportMatch[1])) {
              lines[i] = '';
              modified = true;
              continue;
            }
          } else if (usedImports.length < imports.length) {
            // Update with only used imports
            newLine = newLine.replace(/\{[^}]+\}/, `{ ${usedImports.join(', ')} }`);
            modified = true;
          }
        }

        if (newLine !== line) {
          lines[i] = newLine;
        }
      }

      // Handle unused variables
      if (line.includes('const ') || line.includes('let ') || line.includes('var ')) {
        unusedIdentifiers.forEach(identifier => {
          const varRegex = new RegExp(`^\\s*(const|let|var)\\s+${identifier}\\s*=`);
          if (varRegex.test(line)) {
            lines[i] = '';
            modified = true;
          }
        });
      }

      // Handle unused function declarations
      if (line.includes('function ')) {
        unusedIdentifiers.forEach(identifier => {
          const funcRegex = new RegExp(`^\\s*function\\s+${identifier}\\s*\\(`);
          if (funcRegex.test(line)) {
            // Find the end of the function
            let braceCount = 0;
            let foundStart = false;
            for (let j = i; j < lines.length; j++) {
              if (lines[j].includes('{')) {
                foundStart = true;
                braceCount += (lines[j].match(/\{/g) || []).length;
              }
              if (foundStart) {
                braceCount -= (lines[j].match(/\}/g) || []).length;
                lines[j] = '';
                if (braceCount === 0) break;
              }
            }
            modified = true;
          }
        });
      }
    }

    if (modified) {
      // Clean up empty lines
      const cleanedContent = lines
        .filter((line, index, arr) => {
          // Keep line if it's not empty or if previous/next line is not empty
          return line.trim() !== '' || 
                 (index > 0 && arr[index - 1].trim() !== '') ||
                 (index < arr.length - 1 && arr[index + 1].trim() !== '');
        })
        .join('\n');

      fs.writeFileSync(filePath, cleanedContent);
      return true;
    }

    return false;
  }

  /**
   * Add missing type annotations for implicit any
   */
  fixImplicitAny(filePath, errors) {
    const relevantErrors = errors.filter(e => 
      e.file === filePath && (e.code === 7005 || e.code === 7006 || e.code === 7034)
    );

    if (relevantErrors.length === 0) return false;

    let content = fs.readFileSync(filePath, 'utf-8');
    let modified = false;

    relevantErrors.forEach(error => {
      const lines = content.split('\n');
      const lineIndex = error.line - 1;
      
      if (lineIndex >= 0 && lineIndex < lines.length) {
        const line = lines[lineIndex];
        
        // Fix parameter implicit any
        if (error.code === 7006) {
          const match = error.message.match(/Parameter '([^']+)' implicitly/);
          if (match) {
            const paramName = match[1];
            // Add : any to parameters
            const newLine = line.replace(
              new RegExp(`(\\b${paramName}\\b)(?!\\s*:)`),
              `$1: any`
            );
            if (newLine !== line) {
              lines[lineIndex] = newLine;
              content = lines.join('\n');
              modified = true;
            }
          }
        }

        // Fix variable implicit any
        if (error.code === 7005 || error.code === 7034) {
          const match = error.message.match(/Variable '([^']+)' implicitly/);
          if (match) {
            const varName = match[1];
            // Add : any to variable declarations
            const newLine = line.replace(
              new RegExp(`((?:const|let|var)\\s+${varName})\\s*=`),
              `$1: any =`
            );
            if (newLine !== line) {
              lines[lineIndex] = newLine;
              content = lines.join('\n');
              modified = true;
            }
          }
        }
      }
    });

    if (modified) {
      fs.writeFileSync(filePath, content);
      return true;
    }

    return false;
  }

  /**
   * Fix "did you mean" property errors
   */
  fixDidYouMean(filePath, errors) {
    const relevantErrors = errors.filter(e => 
      e.file === filePath && e.code === 2551
    );

    if (relevantErrors.length === 0) return false;

    let content = fs.readFileSync(filePath, 'utf-8');
    let modified = false;

    relevantErrors.forEach(error => {
      const match = error.message.match(/Property '([^']+)' does not exist.*Did you mean '([^']+)'/);
      if (match) {
        const oldProp = match[1];
        const newProp = match[2];
        
        // Replace the property name
        const regex = new RegExp(`\\.${oldProp}\\b`, 'g');
        const newContent = content.replace(regex, `.${newProp}`);
        
        if (newContent !== content) {
          content = newContent;
          modified = true;
        }
      }
    });

    if (modified) {
      fs.writeFileSync(filePath, content);
      return true;
    }

    return false;
  }

  /**
   * Add missing imports for common types
   */
  fixMissingImports(filePath, errors) {
    const relevantErrors = errors.filter(e => 
      e.file === filePath && e.code === 2304
    );

    if (relevantErrors.length === 0) return false;

    let content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    let modified = false;

    // Common imports map
    const commonImports = {
      'Ref': "import { Ref } from 'vue';",
      'ComputedRef': "import { ComputedRef } from 'vue';",
      'ref': "import { ref } from 'vue';",
      'computed': "import { computed } from 'vue';",
      'watch': "import { watch } from 'vue';",
      'onMounted': "import { onMounted } from 'vue';",
      'onUnmounted': "import { onUnmounted } from 'vue';",
      'defineComponent': "import { defineComponent } from 'vue';",
      'PropType': "import { PropType } from 'vue';",
      'Router': "import { Router } from 'vue-router';",
      'RouteLocationNormalized': "import { RouteLocationNormalized } from 'vue-router';",
    };

    const missingImports = new Set();
    relevantErrors.forEach(error => {
      const match = error.message.match(/Cannot find name '([^']+)'/);
      if (match && commonImports[match[1]]) {
        missingImports.add(match[1]);
      }
    });

    if (missingImports.size > 0) {
      // Group imports by source
      const importsBySource = {};
      missingImports.forEach(name => {
        const importLine = commonImports[name];
        const sourceMatch = importLine.match(/from '([^']+)'/);
        if (sourceMatch) {
          const source = sourceMatch[1];
          if (!importsBySource[source]) {
            importsBySource[source] = [];
          }
          importsBySource[source].push(name);
        }
      });

      // Generate import statements
      const newImports = [];
      Object.entries(importsBySource).forEach(([source, names]) => {
        newImports.push(`import { ${names.join(', ')} } from '${source}';`);
      });

      // Find where to insert imports (after existing imports or at the beginning)
      let insertIndex = 0;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('import ')) {
          insertIndex = i + 1;
        } else if (lines[i].trim() !== '' && !lines[i].startsWith('//') && !lines[i].startsWith('/*')) {
          break;
        }
      }

      // Insert new imports
      lines.splice(insertIndex, 0, ...newImports);
      content = lines.join('\n');
      modified = true;
    }

    if (modified) {
      fs.writeFileSync(filePath, content);
      return true;
    }

    return false;
  }

  /**
   * Process a single file
   */
  processFile(filePath, errors) {
    console.log(`Processing ${filePath}...`);
    
    let fixed = false;
    
    // Create backup
    const backupPath = `${filePath}.backup-${Date.now()}`;
    fs.copyFileSync(filePath, backupPath);

    try {
      // Apply fixes in order
      if (this.fixUnusedImportsAndVariables(filePath, errors)) fixed = true;
      if (this.fixImplicitAny(filePath, errors)) fixed = true;
      if (this.fixDidYouMean(filePath, errors)) fixed = true;
      if (this.fixMissingImports(filePath, errors)) fixed = true;

      if (fixed) {
        console.log(`✓ Fixed ${filePath}`);
        console.log(`  Backup: ${backupPath}`);
        this.fixedFiles++;
      } else {
        // Remove backup if no changes were made
        fs.unlinkSync(backupPath);
      }
    } catch (error) {
      console.error(`✗ Error processing ${filePath}:`, error.message);
      // Restore from backup on error
      fs.copyFileSync(backupPath, filePath);
      fs.unlinkSync(backupPath);
    }

    return fixed;
  }

  /**
   * Main execution
   */
  run() {
    console.log('🔧 TypeScript Error Auto-Fixer\n');

    // Get initial errors
    console.log('📊 Analyzing TypeScript errors...');
    const errors = this.getTypeScriptErrors();
    this.totalErrors = errors.length;
    console.log(`Found ${this.totalErrors} errors\n`);

    if (errors.length === 0) {
      console.log('✅ No TypeScript errors found!');
      return;
    }

    // Group errors by file
    const errorsByFile = {};
    errors.forEach(error => {
      if (!errorsByFile[error.file]) {
        errorsByFile[error.file] = [];
      }
      errorsByFile[error.file].push(error);
    });

    // Process each file
    console.log('🔧 Applying fixes...\n');
    Object.entries(errorsByFile).forEach(([file, fileErrors]) => {
      // Only process files with auto-fixable errors
      const hasFixableErrors = fileErrors.some(e => 
        [6133, 6196, 7005, 7006, 7034, 2551, 2304].includes(e.code)
      );
      
      if (hasFixableErrors) {
        this.processFile(file, fileErrors);
      }
    });

    // Check remaining errors
    console.log('\n📊 Checking remaining errors...');
    const remainingErrors = this.getTypeScriptErrors();

    // Summary
    console.log('\n📋 Summary:');
    console.log(`- Fixed ${this.fixedFiles} files`);
    console.log(`- Initial errors: ${this.totalErrors}`);
    console.log(`- Remaining errors: ${remainingErrors.length}`);
    console.log(`- Errors fixed: ${this.totalErrors - remainingErrors.length}`);

    // Show remaining error types
    if (remainingErrors.length > 0) {
      const errorCounts = {};
      remainingErrors.forEach(error => {
        errorCounts[error.code] = (errorCounts[error.code] || 0) + 1;
      });

      console.log('\n⚠️  Remaining error types:');
      Object.entries(errorCounts)
        .sort((a, b) => b[1] - a[1])
        .forEach(([code, count]) => {
          console.log(`  TS${code}: ${count} occurrences`);
        });
    }

    // Generate report
    const report = {
      timestamp: new Date().toISOString(),
      filesFixed: this.fixedFiles,
      errorsFixed: this.totalErrors - remainingErrors.length,
      remainingErrors: remainingErrors.length,
      remainingByType: {}
    };

    remainingErrors.forEach(error => {
      if (!report.remainingByType[error.code]) {
        report.remainingByType[error.code] = {
          count: 0,
          examples: []
        };
      }
      report.remainingByType[error.code].count++;
      if (report.remainingByType[error.code].examples.length < 3) {
        report.remainingByType[error.code].examples.push({
          file: error.file,
          line: error.line,
          message: error.message
        });
      }
    });

    fs.writeFileSync('typescript-fix-report.json', JSON.stringify(report, null, 2));
    console.log('\n📄 Detailed report saved to: typescript-fix-report.json');
  }
}

// Run the fixer
const fixer = new TypeScriptErrorFixer();
fixer.run();