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

interface FixResult {
  fixed: number;
  needsManual: number;
  errors: ErrorInfo[];
}

class TypeScriptAutoFixer {
  private fixedCount = 0;
  private manualFixNeeded: ErrorInfo[] = [];
  private projectRoot: string;

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
   * Remove unused imports (TS6133, TS6196)
   */
  private removeUnusedImports(sourceFile: ts.SourceFile, errors: ErrorInfo[]): ts.SourceFile {
    const filePath = sourceFile.fileName;
    const relevantErrors = errors.filter(
      e => e.file === filePath && (e.code === 6133 || e.code === 6196)
    );

    if (relevantErrors.length === 0) return sourceFile;

    const unusedIdentifiers = new Set<string>();
    relevantErrors.forEach(error => {
      const match = error.message.match(/'([^']+)' is declared but/);
      if (match) {
        unusedIdentifiers.add(match[1]);
      }
    });

    const transformer: ts.TransformerFactory<ts.SourceFile> = (context) => {
      return (sourceFile) => {
        const visitor: ts.Visitor = (node) => {
          // Remove unused imports
          if (ts.isImportDeclaration(node) && node.importClause) {
            const importClause = node.importClause;
            let shouldRemove = false;

            if (importClause.name && unusedIdentifiers.has(importClause.name.text)) {
              shouldRemove = true;
            }

            if (importClause.namedBindings && ts.isNamedImports(importClause.namedBindings)) {
              const usedElements = importClause.namedBindings.elements.filter(
                element => !unusedIdentifiers.has(element.name.text)
              );

              if (usedElements.length === 0) {
                shouldRemove = true;
              } else if (usedElements.length < importClause.namedBindings.elements.length) {
                // Update import with only used elements
                const newImportClause = ts.factory.updateImportClause(
                  importClause,
                  importClause.isTypeOnly,
                  importClause.name,
                  ts.factory.createNamedImports(usedElements)
                );
                return ts.factory.updateImportDeclaration(
                  node,
                  node.modifiers,
                  newImportClause,
                  node.moduleSpecifier,
                  node.assertClause
                );
              }
            }

            if (shouldRemove) {
              return undefined;
            }
          }

          // Remove unused variable declarations
          if (ts.isVariableStatement(node)) {
            const declarations = node.declarationList.declarations.filter(decl => {
              if (ts.isIdentifier(decl.name)) {
                return !unusedIdentifiers.has(decl.name.text);
              }
              return true;
            });

            if (declarations.length === 0) {
              return undefined;
            } else if (declarations.length < node.declarationList.declarations.length) {
              return ts.factory.updateVariableStatement(
                node,
                node.modifiers,
                ts.factory.updateVariableDeclarationList(
                  node.declarationList,
                  declarations
                )
              );
            }
          }

          return ts.visitEachChild(node, visitor, context);
        };

        return ts.visitNode(sourceFile, visitor) as ts.SourceFile;
      };
    };

    const result = ts.transform(sourceFile, [transformer]);
    const transformedSourceFile = result.transformed[0];
    result.dispose();

    return transformedSourceFile;
  }

  /**
   * Add missing type annotations where possible
   */
  private addMissingTypes(sourceFile: ts.SourceFile, errors: ErrorInfo[]): ts.SourceFile {
    const filePath = sourceFile.fileName;
    const implicitAnyErrors = errors.filter(
      e => e.file === filePath && (e.code === 7034 || e.code === 7005 || e.code === 7006)
    );

    if (implicitAnyErrors.length === 0) return sourceFile;

    const transformer: ts.TransformerFactory<ts.SourceFile> = (context) => {
      return (sourceFile) => {
        const visitor: ts.Visitor = (node) => {
          // Add explicit 'any' type to parameters
          if (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node) || 
              ts.isArrowFunction(node) || ts.isFunctionExpression(node)) {
            const updatedParams = node.parameters.map(param => {
              if (!param.type && ts.isIdentifier(param.name)) {
                const paramError = implicitAnyErrors.find(e => {
                  const pos = sourceFile.getLineAndCharacterOfPosition(param.pos);
                  return e.line === pos.line + 1 && e.message.includes(param.name!.text);
                });

                if (paramError) {
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
              }
              return param;
            });

            if (updatedParams.some((p, i) => p !== node.parameters[i])) {
              if (ts.isFunctionDeclaration(node)) {
                return ts.factory.updateFunctionDeclaration(
                  node,
                  node.modifiers,
                  node.asteriskToken,
                  node.name,
                  node.typeParameters,
                  updatedParams,
                  node.type,
                  node.body
                );
              }
              // Similar updates for other function types...
            }
          }

          // Add explicit 'any' type to variables
          if (ts.isVariableDeclaration(node) && !node.type && ts.isIdentifier(node.name)) {
            const varError = implicitAnyErrors.find(e => {
              const pos = sourceFile.getLineAndCharacterOfPosition(node.pos);
              return e.line === pos.line + 1 && e.message.includes(node.name!.text);
            });

            if (varError) {
              return ts.factory.updateVariableDeclaration(
                node,
                node.name,
                node.exclamationToken,
                ts.factory.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword),
                node.initializer
              );
            }
          }

          return ts.visitEachChild(node, visitor, context);
        };

        return ts.visitNode(sourceFile, visitor) as ts.SourceFile;
      };
    };

    const result = ts.transform(sourceFile, [transformer]);
    const transformedSourceFile = result.transformed[0];
    result.dispose();

    return transformedSourceFile;
  }

  /**
   * Fix import path issues
   */
  private fixImportPaths(sourceFile: ts.SourceFile, errors: ErrorInfo[]): ts.SourceFile {
    const filePath = sourceFile.fileName;
    const moduleErrors = errors.filter(
      e => e.file === filePath && (e.code === 2305 || e.code === 2304)
    );

    if (moduleErrors.length === 0) return sourceFile;

    const transformer: ts.TransformerFactory<ts.SourceFile> = (context) => {
      return (sourceFile) => {
        const visitor: ts.Visitor = (node) => {
          if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
            const moduleError = moduleErrors.find(e => 
              e.message.includes(`Module '${node.moduleSpecifier.text}'`)
            );

            if (moduleError) {
              // Try common fixes
              let newPath = node.moduleSpecifier.text;

              // Add .js extension if missing
              if (!newPath.endsWith('.js') && !newPath.endsWith('.ts') && 
                  !newPath.startsWith('@/') && !newPath.includes('node_modules')) {
                newPath = newPath + '.js';
              }

              // Fix relative paths
              if (newPath.startsWith('./') || newPath.startsWith('../')) {
                const resolvedPath = path.resolve(path.dirname(filePath), newPath);
                if (fs.existsSync(resolvedPath.replace('.js', '.ts'))) {
                  return ts.factory.updateImportDeclaration(
                    node,
                    node.modifiers,
                    node.importClause,
                    ts.factory.createStringLiteral(newPath),
                    node.assertClause
                  );
                }
              }
            }
          }

          return ts.visitEachChild(node, visitor, context);
        };

        return ts.visitNode(sourceFile, visitor) as ts.SourceFile;
      };
    };

    const result = ts.transform(sourceFile, [transformer]);
    const transformedSourceFile = result.transformed[0];
    result.dispose();

    return transformedSourceFile;
  }

  /**
   * Process a single file
   */
  private processFile(filePath: string, errors: ErrorInfo[]): boolean {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const sourceFile = ts.createSourceFile(
        filePath,
        content,
        ts.ScriptTarget.Latest,
        true,
        filePath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
      );

      let modifiedSourceFile = sourceFile;

      // Apply fixes in order
      modifiedSourceFile = this.removeUnusedImports(modifiedSourceFile, errors);
      modifiedSourceFile = this.addMissingTypes(modifiedSourceFile, errors);
      modifiedSourceFile = this.fixImportPaths(modifiedSourceFile, errors);

      // Generate output
      const printer = ts.createPrinter({
        newLine: ts.NewLineKind.LineFeed,
        removeComments: false
      });

      const result = printer.printFile(modifiedSourceFile);

      // Only write if changes were made
      if (result !== content) {
        fs.writeFileSync(filePath, result);
        console.log(`✓ Fixed ${filePath}`);
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
   * Run the auto-fixer
   */
  public async run(): Promise<FixResult> {
    console.log('🔍 Analyzing TypeScript errors...\n');

    const errors = this.getTypeScriptErrors();
    console.log(`Found ${errors.length} TypeScript errors\n`);

    // Group errors by file
    const errorsByFile = new Map<string, ErrorInfo[]>();
    errors.forEach(error => {
      if (!errorsByFile.has(error.file)) {
        errorsByFile.set(error.file, []);
      }
      errorsByFile.get(error.file)!.push(error);
    });

    // Process files
    console.log('🔧 Applying automatic fixes...\n');
    
    for (const [file, fileErrors] of errorsByFile) {
      const fixableErrors = fileErrors.filter(e => 
        [6133, 6196, 7034, 7005, 7006, 2305, 2304].includes(e.code)
      );

      if (fixableErrors.length > 0) {
        this.processFile(file, fixableErrors);
      }

      // Track errors that need manual intervention
      const manualErrors = fileErrors.filter(e => 
        ![6133, 6196, 7034, 7005, 7006, 2305, 2304].includes(e.code)
      );
      this.manualFixNeeded.push(...manualErrors);
    }

    // Get remaining errors
    console.log('\n🔍 Checking remaining errors...\n');
    const remainingErrors = this.getTypeScriptErrors();

    // Report results
    console.log('\n📊 Summary:');
    console.log(`✓ Fixed ${this.fixedCount} files automatically`);
    console.log(`⚠ ${this.manualFixNeeded.length} errors need manual intervention`);
    console.log(`📝 ${remainingErrors.length} total errors remaining\n`);

    if (this.manualFixNeeded.length > 0) {
      console.log('❗ Errors requiring manual intervention:\n');
      
      // Group by error type
      const errorTypes = new Map<number, ErrorInfo[]>();
      this.manualFixNeeded.forEach(error => {
        if (!errorTypes.has(error.code)) {
          errorTypes.set(error.code, []);
        }
        errorTypes.get(error.code)!.push(error);
      });

      for (const [code, errors] of errorTypes) {
        console.log(`\nTS${code} (${errors.length} occurrences):`);
        errors.slice(0, 5).forEach(error => {
          console.log(`  ${error.file}:${error.line}:${error.column}`);
          console.log(`    ${error.message}`);
        });
        if (errors.length > 5) {
          console.log(`  ... and ${errors.length - 5} more`);
        }
      }
    }

    return {
      fixed: this.fixedCount,
      needsManual: this.manualFixNeeded.length,
      errors: remainingErrors
    };
  }
}

// Main execution
async function main() {
  const projectRoot = process.cwd();
  const fixer = new TypeScriptAutoFixer(projectRoot);

  try {
    const result = await fixer.run();

    // Exit with error code if there are remaining errors
    process.exit(result.errors.length > 0 ? 1 : 0);
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { TypeScriptAutoFixer };