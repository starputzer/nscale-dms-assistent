#!/usr/bin/env ts-node

import * as ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

interface ErrorInfo {
  file: string;
  line: number;
  column: number;
  code: number;
  message: string;
}

interface FixStrategy {
  code: number;
  description: string;
  canAutoFix: boolean;
  fix?: (sourceFile: ts.SourceFile, error: ErrorInfo) => ts.SourceFile | null;
}

class EnhancedTypeScriptFixer {
  private fixedCount = 0;
  private fixedErrors = 0;
  private manualFixNeeded: ErrorInfo[] = [];
  private projectRoot: string;

  private fixStrategies: Map<number, FixStrategy> = new Map([
    [6133, {
      code: 6133,
      description: "Variable is declared but never used",
      canAutoFix: true
    }],
    [6196, {
      code: 6196,
      description: "Variable is declared but never used (in imports)",
      canAutoFix: true
    }],
    [2304, {
      code: 2304,
      description: "Cannot find name",
      canAutoFix: true
    }],
    [2305, {
      code: 2305,
      description: "Module has no exported member",
      canAutoFix: false
    }],
    [2322, {
      code: 2322,
      description: "Type is not assignable",
      canAutoFix: false
    }],
    [2339, {
      code: 2339,
      description: "Property does not exist on type",
      canAutoFix: false
    }],
    [2345, {
      code: 2345,
      description: "Argument type is not assignable",
      canAutoFix: false
    }],
    [2551, {
      code: 2551,
      description: "Property does not exist (did you mean...)",
      canAutoFix: true
    }],
    [2559, {
      code: 2559,
      description: "Type has no properties in common",
      canAutoFix: false
    }],
    [2574, {
      code: 2574,
      description: "Rest element type must be array",
      canAutoFix: false
    }],
    [7005, {
      code: 7005,
      description: "Variable implicitly has 'any' type",
      canAutoFix: true
    }],
    [7006, {
      code: 7006,
      description: "Parameter implicitly has 'any' type",
      canAutoFix: true
    }],
    [7034, {
      code: 7034,
      description: "Variable implicitly has type 'any'",
      canAutoFix: true
    }],
    [18046, {
      code: 18046,
      description: "Variable is of type 'unknown'",
      canAutoFix: true
    }]
  ]);

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
  }

  /**
   * Parse TypeScript compiler errors from output
   */
  private parseErrors(output: string): ErrorInfo[] {
    const errors: ErrorInfo[] = [];
    const errorRegex = /(.+?)\((\d+),(\d+)\): error TS(\d+): (.+)/g;
    let match;

    while ((match = errorRegex.exec(output)) !== null) {
      errors.push({
        file: match[1],
        line: parseInt(match[2]),
        column: parseInt(match[3]),
        code: parseInt(match[4]),
        message: match[5]
      });
    }

    return errors;
  }

  /**
   * Get current TypeScript errors
   */
  private getTypeScriptErrors(): ErrorInfo[] {
    try {
      execSync('npx tsc --noEmit', { cwd: this.projectRoot, stdio: 'pipe' });
      return [];
    } catch (error: any) {
      const output = error.stdout?.toString() || '';
      return this.parseErrors(output);
    }
  }

  /**
   * Create a source file from content
   */
  private createSourceFile(filePath: string, content: string): ts.SourceFile {
    return ts.createSourceFile(
      filePath,
      content,
      ts.ScriptTarget.Latest,
      true,
      filePath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
    );
  }

  /**
   * Remove unused imports and variables
   */
  private removeUnused(sourceFile: ts.SourceFile, errors: ErrorInfo[]): ts.SourceFile {
    const unusedIdentifiers = new Set<string>();
    errors.forEach(error => {
      if (error.code === 6133 || error.code === 6196) {
        const match = error.message.match(/'([^']+)' is declared but/);
        if (match) {
          unusedIdentifiers.add(match[1]);
        }
      }
    });

    if (unusedIdentifiers.size === 0) return sourceFile;

    const transformer: ts.TransformerFactory<ts.SourceFile> = (context) => {
      return (sourceFile) => {
        const visitor: ts.Visitor = (node) => {
          // Remove unused imports
          if (ts.isImportDeclaration(node)) {
            const shouldRemove = this.shouldRemoveImport(node, unusedIdentifiers);
            if (shouldRemove === true) {
              return undefined;
            } else if (shouldRemove && typeof shouldRemove === 'object') {
              return shouldRemove;
            }
          }

          // Remove unused variable declarations
          if (ts.isVariableStatement(node)) {
            const updatedStatement = this.removeUnusedVariables(node, unusedIdentifiers);
            if (!updatedStatement) return undefined;
            if (updatedStatement !== node) return updatedStatement;
          }

          // Remove unused function declarations
          if (ts.isFunctionDeclaration(node) && node.name && 
              unusedIdentifiers.has(node.name.text)) {
            return undefined;
          }

          return ts.visitEachChild(node, visitor, context);
        };

        return ts.visitNode(sourceFile, visitor) as ts.SourceFile;
      };
    };

    const result = ts.transform(sourceFile, [transformer]);
    const transformedFile = result.transformed[0];
    result.dispose();

    return transformedFile;
  }

  /**
   * Check if import should be removed
   */
  private shouldRemoveImport(
    node: ts.ImportDeclaration, 
    unusedIdentifiers: Set<string>
  ): boolean | ts.ImportDeclaration {
    if (!node.importClause) return false;

    const importClause = node.importClause;
    let hasUsedImports = false;
    let updatedClause = importClause;

    // Check default import
    if (importClause.name && unusedIdentifiers.has(importClause.name.text)) {
      updatedClause = ts.factory.updateImportClause(
        importClause,
        importClause.isTypeOnly,
        undefined,
        importClause.namedBindings
      );
    } else if (importClause.name) {
      hasUsedImports = true;
    }

    // Check named imports
    if (importClause.namedBindings && ts.isNamedImports(importClause.namedBindings)) {
      const usedElements = importClause.namedBindings.elements.filter(
        element => !unusedIdentifiers.has(element.name.text)
      );

      if (usedElements.length === 0 && !hasUsedImports) {
        return true; // Remove entire import
      } else if (usedElements.length < importClause.namedBindings.elements.length) {
        updatedClause = ts.factory.updateImportClause(
          updatedClause,
          importClause.isTypeOnly,
          updatedClause.name,
          usedElements.length > 0 
            ? ts.factory.createNamedImports(usedElements)
            : undefined
        );
      } else {
        hasUsedImports = true;
      }
    }

    if (!updatedClause.name && !updatedClause.namedBindings) {
      return true; // Remove entire import
    }

    if (updatedClause !== importClause) {
      return ts.factory.updateImportDeclaration(
        node,
        node.modifiers,
        updatedClause,
        node.moduleSpecifier,
        node.assertClause
      );
    }

    return false;
  }

  /**
   * Remove unused variables from a variable statement
   */
  private removeUnusedVariables(
    node: ts.VariableStatement,
    unusedIdentifiers: Set<string>
  ): ts.VariableStatement | null {
    const declarations = node.declarationList.declarations.filter(decl => {
      if (ts.isIdentifier(decl.name)) {
        return !unusedIdentifiers.has(decl.name.text);
      }
      // Keep destructuring patterns for now
      return true;
    });

    if (declarations.length === 0) {
      return null;
    }

    if (declarations.length < node.declarationList.declarations.length) {
      return ts.factory.updateVariableStatement(
        node,
        node.modifiers,
        ts.factory.updateVariableDeclarationList(
          node.declarationList,
          declarations
        )
      );
    }

    return node;
  }

  /**
   * Add missing imports for common types
   */
  private addMissingImports(sourceFile: ts.SourceFile, errors: ErrorInfo[]): ts.SourceFile {
    const missingTypes = new Set<string>();
    errors.forEach(error => {
      if (error.code === 2304) {
        const match = error.message.match(/Cannot find name '([^']+)'/);
        if (match) {
          missingTypes.add(match[1]);
        }
      }
    });

    if (missingTypes.size === 0) return sourceFile;

    // Common Vue/TypeScript imports
    const importMap = new Map<string, { from: string; named: string[] }>([
      ['Ref', { from: 'vue', named: ['Ref'] }],
      ['ComputedRef', { from: 'vue', named: ['ComputedRef'] }],
      ['ref', { from: 'vue', named: ['ref'] }],
      ['computed', { from: 'vue', named: ['computed'] }],
      ['watch', { from: 'vue', named: ['watch'] }],
      ['onMounted', { from: 'vue', named: ['onMounted'] }],
      ['onUnmounted', { from: 'vue', named: ['onUnmounted'] }],
    ]);

    const importsToAdd: { from: string; named: string[] }[] = [];
    
    missingTypes.forEach(type => {
      const importInfo = importMap.get(type);
      if (importInfo) {
        const existing = importsToAdd.find(i => i.from === importInfo.from);
        if (existing) {
          existing.named.push(...importInfo.named);
        } else {
          importsToAdd.push({ ...importInfo });
        }
      }
    });

    if (importsToAdd.length === 0) return sourceFile;

    const transformer: ts.TransformerFactory<ts.SourceFile> = (context) => {
      return (sourceFile) => {
        // Create new import statements
        const newImports = importsToAdd.map(imp => 
          ts.factory.createImportDeclaration(
            undefined,
            ts.factory.createImportClause(
              false,
              undefined,
              ts.factory.createNamedImports(
                imp.named.map(name => 
                  ts.factory.createImportSpecifier(false, undefined, ts.factory.createIdentifier(name))
                )
              )
            ),
            ts.factory.createStringLiteral(imp.from)
          )
        );

        // Add imports at the beginning
        return ts.factory.updateSourceFile(
          sourceFile,
          [...newImports, ...sourceFile.statements]
        );
      };
    };

    const result = ts.transform(sourceFile, [transformer]);
    const transformedFile = result.transformed[0];
    result.dispose();

    return transformedFile;
  }

  /**
   * Fix "did you mean" errors
   */
  private fixDidYouMean(sourceFile: ts.SourceFile, errors: ErrorInfo[]): ts.SourceFile {
    const replacements = new Map<string, string>();
    
    errors.forEach(error => {
      if (error.code === 2551) {
        const match = error.message.match(/Property '([^']+)' does not exist on type '[^']+'.*Did you mean '([^']+)'/);
        if (match) {
          replacements.set(match[1], match[2]);
        }
      }
    });

    if (replacements.size === 0) return sourceFile;

    const transformer: ts.TransformerFactory<ts.SourceFile> = (context) => {
      return (sourceFile) => {
        const visitor: ts.Visitor = (node) => {
          if (ts.isPropertyAccessExpression(node) && ts.isIdentifier(node.name)) {
            const replacement = replacements.get(node.name.text);
            if (replacement) {
              return ts.factory.updatePropertyAccessExpression(
                node,
                node.expression,
                ts.factory.createIdentifier(replacement)
              );
            }
          }

          return ts.visitEachChild(node, visitor, context);
        };

        return ts.visitNode(sourceFile, visitor) as ts.SourceFile;
      };
    };

    const result = ts.transform(sourceFile, [transformer]);
    const transformedFile = result.transformed[0];
    result.dispose();

    return transformedFile;
  }

  /**
   * Add explicit any types
   */
  private addExplicitAnyTypes(sourceFile: ts.SourceFile, errors: ErrorInfo[]): ts.SourceFile {
    const needsAnyType = new Set<string>();
    const lineColumnToParam = new Map<string, string>();

    errors.forEach(error => {
      if (error.code === 7005 || error.code === 7006 || error.code === 7034) {
        const match = error.message.match(/(Variable|Parameter) '([^']+)' implicitly has/);
        if (match) {
          needsAnyType.add(match[2]);
          lineColumnToParam.set(`${error.line}:${error.column}`, match[2]);
        }
      }
    });

    if (needsAnyType.size === 0) return sourceFile;

    const transformer: ts.TransformerFactory<ts.SourceFile> = (context) => {
      return (sourceFile) => {
        const visitor: ts.Visitor = (node) => {
          // Add type to parameters
          if ((ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node) || 
               ts.isArrowFunction(node) || ts.isFunctionExpression(node)) && node.parameters) {
            const updatedParams = node.parameters.map(param => {
              if (!param.type && ts.isIdentifier(param.name) && needsAnyType.has(param.name.text)) {
                return ts.factory.updateParameterDeclaration(
                  param,
                  param.modifiers,
                  param.dotDotDotToken,
                  param.name,
                  param.questionToken,
                  ts.factory.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword),
                  param.initializer
                );
              }
              return param;
            });

            if (updatedParams.some((p, i) => p !== node.parameters[i])) {
              if (ts.isFunctionDeclaration(node)) {
                return ts.factory.updateFunctionDeclaration(
                  node, node.modifiers, node.asteriskToken, node.name,
                  node.typeParameters, updatedParams, node.type, node.body
                );
              } else if (ts.isMethodDeclaration(node)) {
                return ts.factory.updateMethodDeclaration(
                  node, node.modifiers, node.asteriskToken, node.name,
                  node.questionToken, node.typeParameters, updatedParams, node.type, node.body
                );
              } else if (ts.isArrowFunction(node)) {
                return ts.factory.updateArrowFunction(
                  node, node.modifiers, node.typeParameters, updatedParams,
                  node.type, node.equalsGreaterThanToken, node.body
                );
              } else if (ts.isFunctionExpression(node)) {
                return ts.factory.updateFunctionExpression(
                  node, node.modifiers, node.asteriskToken, node.name,
                  node.typeParameters, updatedParams, node.type, node.body
                );
              }
            }
          }

          // Add type to variable declarations
          if (ts.isVariableDeclaration(node) && !node.type && 
              ts.isIdentifier(node.name) && needsAnyType.has(node.name.text)) {
            return ts.factory.updateVariableDeclaration(
              node,
              node.name,
              node.exclamationToken,
              ts.factory.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword),
              node.initializer
            );
          }

          return ts.visitEachChild(node, visitor, context);
        };

        return ts.visitNode(sourceFile, visitor) as ts.SourceFile;
      };
    };

    const result = ts.transform(sourceFile, [transformer]);
    const transformedFile = result.transformed[0];
    result.dispose();

    return transformedFile;
  }

  /**
   * Process a single file
   */
  private processFile(filePath: string, errors: ErrorInfo[]): boolean {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      let sourceFile = this.createSourceFile(filePath, content);

      // Apply fixes in order
      const relevantErrors = errors.filter(e => e.file === filePath);
      
      // Apply each fix strategy
      sourceFile = this.removeUnused(sourceFile, relevantErrors);
      sourceFile = this.addMissingImports(sourceFile, relevantErrors);
      sourceFile = this.fixDidYouMean(sourceFile, relevantErrors);
      sourceFile = this.addExplicitAnyTypes(sourceFile, relevantErrors);

      // Generate output
      const printer = ts.createPrinter({
        newLine: ts.NewLineKind.LineFeed,
        removeComments: false
      });

      const result = printer.printFile(sourceFile);

      // Only write if changes were made
      if (result !== content) {
        // Backup original file
        const backupPath = `${filePath}.backup-${Date.now()}`;
        fs.copyFileSync(filePath, backupPath);
        
        fs.writeFileSync(filePath, result);
        console.log(`✓ Fixed ${filePath}`);
        console.log(`  Backup saved to: ${backupPath}`);
        
        this.fixedCount++;
        return true;
      }

      return false;
    } catch (error) {
      console.error(`✗ Error processing ${filePath}:`, error);
      return false;
    }
  }

  /**
   * Generate detailed report
   */
  private generateReport(errors: ErrorInfo[]): void {
    const reportPath = path.join(this.projectRoot, 'typescript-errors-report.md');
    
    let report = '# TypeScript Error Report\n\n';
    report += `Generated on: ${new Date().toISOString()}\n\n`;
    report += `## Summary\n\n`;
    report += `- Total errors: ${errors.length}\n`;
    report += `- Files fixed: ${this.fixedCount}\n`;
    report += `- Errors fixed: ${this.fixedErrors}\n`;
    report += `- Manual fixes needed: ${this.manualFixNeeded.length}\n\n`;

    // Group errors by type
    const errorsByCode = new Map<number, ErrorInfo[]>();
    errors.forEach(error => {
      if (!errorsByCode.has(error.code)) {
        errorsByCode.set(error.code, []);
      }
      errorsByCode.get(error.code)!.push(error);
    });

    report += '## Error Types\n\n';
    for (const [code, errors] of errorsByCode) {
      const strategy = this.fixStrategies.get(code);
      report += `### TS${code} - ${strategy?.description || 'Unknown error'}\n\n`;
      report += `- Count: ${errors.length}\n`;
      report += `- Auto-fixable: ${strategy?.canAutoFix ? 'Yes' : 'No'}\n\n`;
      
      if (errors.length <= 10) {
        errors.forEach(error => {
          report += `- \`${error.file}:${error.line}:${error.column}\`\n`;
          report += `  ${error.message}\n\n`;
        });
      } else {
        errors.slice(0, 5).forEach(error => {
          report += `- \`${error.file}:${error.line}:${error.column}\`\n`;
          report += `  ${error.message}\n\n`;
        });
        report += `... and ${errors.length - 5} more\n\n`;
      }
    }

    fs.writeFileSync(reportPath, report);
    console.log(`\n📄 Detailed report saved to: ${reportPath}`);
  }

  /**
   * Run the enhanced fixer
   */
  public async run(): Promise<void> {
    console.log('🔍 Enhanced TypeScript Error Fixer\n');
    console.log('📊 Analyzing TypeScript errors...\n');

    const initialErrors = this.getTypeScriptErrors();
    console.log(`Found ${initialErrors.length} TypeScript errors\n`);

    // Group errors by file
    const errorsByFile = new Map<string, ErrorInfo[]>();
    initialErrors.forEach(error => {
      if (!errorsByFile.has(error.file)) {
        errorsByFile.set(error.file, []);
      }
      errorsByFile.get(error.file)!.push(error);
    });

    // Process files
    console.log('🔧 Applying automatic fixes...\n');
    
    const processedFiles = new Set<string>();
    for (const [file, fileErrors] of errorsByFile) {
      const autoFixableErrors = fileErrors.filter(e => {
        const strategy = this.fixStrategies.get(e.code);
        return strategy?.canAutoFix;
      });

      if (autoFixableErrors.length > 0) {
        if (this.processFile(file, fileErrors)) {
          processedFiles.add(file);
          this.fixedErrors += autoFixableErrors.length;
        }
      }

      // Track errors that need manual intervention
      const manualErrors = fileErrors.filter(e => {
        const strategy = this.fixStrategies.get(e.code);
        return !strategy?.canAutoFix;
      });
      this.manualFixNeeded.push(...manualErrors);
    }

    // Get remaining errors
    console.log('\n🔍 Checking remaining errors...\n');
    const remainingErrors = this.getTypeScriptErrors();

    // Generate report
    this.generateReport(remainingErrors);

    // Summary
    console.log('\n📊 Summary:');
    console.log(`✓ Fixed ${this.fixedCount} files automatically`);
    console.log(`✓ Fixed approximately ${this.fixedErrors} errors`);
    console.log(`⚠ ${this.manualFixNeeded.length} errors need manual intervention`);
    console.log(`📝 ${remainingErrors.length} total errors remaining\n`);

    // Show sample of remaining errors
    if (remainingErrors.length > 0) {
      console.log('Sample of remaining errors:\n');
      remainingErrors.slice(0, 10).forEach(error => {
        const strategy = this.fixStrategies.get(error.code);
        console.log(`TS${error.code} (${strategy?.description || 'Unknown'}):`);
        console.log(`  ${error.file}:${error.line}:${error.column}`);
        console.log(`  ${error.message}\n`);
      });
    }
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const projectRoot = args[0] || process.cwd();

  console.log(`Working directory: ${projectRoot}\n`);

  const fixer = new EnhancedTypeScriptFixer(projectRoot);

  try {
    await fixer.run();
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { EnhancedTypeScriptFixer };