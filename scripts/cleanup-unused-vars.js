#!/usr/bin/env node

/**
 * Script to clean up unused variables and imports in TypeScript files
 */

import { ESLint } from 'eslint';
import fs from 'fs/promises';
import path from 'path';
import { glob } from 'glob';

async function cleanupUnusedVars() {
  console.log('🧹 Starting cleanup of unused variables and imports...\n');

  const eslint = new ESLint({
    fix: true,
    baseConfig: {
      parser: '@typescript-eslint/parser',
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true
        }
      },
      plugins: ['@typescript-eslint', 'unused-imports'],
      rules: {
        '@typescript-eslint/no-unused-vars': ['error', {
          varsIgnorePattern: '^_',
          argsIgnorePattern: '^_',
          ignoreRestSiblings: true
        }],
        'unused-imports/no-unused-imports': 'error',
        'unused-imports/no-unused-vars': ['error', {
          varsIgnorePattern: '^_',
          argsIgnorePattern: '^_',
          ignoreRestSiblings: true
        }]
      }
    }
  });

  // Target specific directories with most issues
  const targetDirs = [
    'src/bridge/enhanced/**/*.ts',
    'src/services/**/*.ts',
    'src/stores/**/*.ts',
    'src/components/**/*.{ts,vue}',
    'src/composables/**/*.ts'
  ];

  let totalFixed = 0;
  let totalFiles = 0;

  for (const pattern of targetDirs) {
    console.log(`\n📁 Processing: ${pattern}`);
    
    const files = await glob(pattern, { 
      cwd: process.cwd(),
      ignore: ['**/node_modules/**', '**/dist/**', '**/*.d.ts']
    });

    for (const file of files) {
      try {
        const results = await eslint.lintFiles([file]);
        
        if (results[0].errorCount > 0 || results[0].warningCount > 0) {
          await ESLint.outputFixes(results);
          
          const fixableErrors = results[0].messages.filter(m => m.fix).length;
          if (fixableErrors > 0) {
            totalFixed += fixableErrors;
            totalFiles++;
            console.log(`  ✅ Fixed ${fixableErrors} issues in ${path.basename(file)}`);
          }
        }
      } catch (error) {
        console.error(`  ❌ Error processing ${file}:`, error.message);
      }
    }
  }

  console.log(`\n✨ Cleanup complete!`);
  console.log(`   Fixed ${totalFixed} issues in ${totalFiles} files`);
}

// Run the cleanup
cleanupUnusedVars().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});