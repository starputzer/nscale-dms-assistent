#!/usr/bin/env node

/**
 * Incremental TypeScript Checking Script
 *
 * This script helps with the incremental adoption of stricter TypeScript checking
 * by analyzing subdirectories within the src/ folder, looking for TypeScript errors,
 * and reporting statistics. It helps teams prioritize which areas to focus on.
 */

import { execSync } from "child_process";
import {
  existsSync,
  mkdirSync,
  writeFileSync,
  readdirSync,
  statSync,
} from "fs";
import { join, resolve } from "path";

// Configuration
const rootDir = resolve(process.cwd());
const srcDir = join(rootDir, "src");
const outputDir = join(rootDir, "typecheck-reports");
const tsconfigPath = join(rootDir, "tsconfig.optimized.json");

// Ensure the output directory exists
if (!existsSync(outputDir)) {
  mkdirSync(outputDir, { recursive: true });
}

// Get all directories in src/
function getDirectories(path) {
  return readdirSync(path)
    .filter((file) => statSync(join(path, file)).isDirectory())
    .map((dir) => join(path, dir));
}

const dirs = getDirectories(srcDir);

// Results object to store error counts
const results = {
  timestamp: new Date().toISOString(),
  totalErrors: 0,
  directories: {},
};

console.log("🔍 Running incremental TypeScript check with strict config...\n");

// Run TypeScript check on each directory
dirs.forEach((dir) => {
  const dirName = dir.replace(srcDir + "/", "");
  console.log(`Checking ${dirName}...`);

  try {
    // Use tsc to check just this directory
    const cmd = `npx tsc --noEmit --project ${tsconfigPath} --files ${dir}/**/*.ts ${dir}/**/*.tsx ${dir}/**/*.vue 2>&1`;
    execSync(cmd, { stdio: "pipe" });

    // If we get here, there were no errors
    results.directories[dirName] = {
      errorCount: 0,
      status: "✅ No errors",
    };
    console.log(`  ✅ No errors found in ${dirName}\n`);
  } catch (error) {
    // Count the number of errors in the output
    const output = error.stdout.toString();
    const errorLines = output
      .split("\n")
      .filter((line) => line.includes("error TS"));
    const errorCount = errorLines.length;

    results.totalErrors += errorCount;
    results.directories[dirName] = {
      errorCount,
      status: `❌ ${errorCount} TypeScript errors`,
    };

    // Save the error output to a file
    const errorFile = join(outputDir, `${dirName}-errors.txt`);
    writeFileSync(errorFile, output);

    console.log(`  ❌ Found ${errorCount} TypeScript errors in ${dirName}`);
    console.log(`  📄 Details saved to ${errorFile}\n`);
  }
});

// Sort directories by error count (descending)
const sortedDirs = Object.keys(results.directories).sort(
  (a, b) =>
    results.directories[b].errorCount - results.directories[a].errorCount,
);

// Generate summary report
console.log("📊 TypeScript Check Summary:");
console.log("============================");
console.log(`Total errors: ${results.totalErrors}`);
console.log("");
console.log("Errors by directory:");

sortedDirs.forEach((dir) => {
  const { errorCount, status } = results.directories[dir];
  console.log(`${dir}: ${status} ${errorCount > 0 ? "🔴" : "🟢"}`);
});

// Save the full report as JSON
const reportPath = join(outputDir, "typecheck-report.json");
writeFileSync(reportPath, JSON.stringify(results, null, 2));
console.log(`\n📄 Full report saved to ${reportPath}`);

// Generate prioritization suggestions
if (results.totalErrors > 0) {
  console.log("\n🔍 Suggested Focus Areas:");
  console.log("=======================");

  // High priority - directories with the most errors
  const highPriorityDirs = sortedDirs
    .filter((dir) => results.directories[dir].errorCount > 0)
    .slice(0, 3);

  console.log("High Priority (most errors):");
  highPriorityDirs.forEach((dir) => {
    console.log(`- ${dir}: ${results.directories[dir].errorCount} errors`);
  });

  // Low priority - directories with few errors
  const lowPriorityDirs = sortedDirs
    .filter(
      (dir) =>
        results.directories[dir].errorCount > 0 &&
        results.directories[dir].errorCount < 10,
    )
    .slice(0, 3);

  if (lowPriorityDirs.length > 0) {
    console.log("\nQuick Wins (few errors):");
    lowPriorityDirs.forEach((dir) => {
      console.log(`- ${dir}: ${results.directories[dir].errorCount} errors`);
    });
  }
}

// Print next steps
console.log("\n📝 Next Steps:");
console.log("============");
console.log("1. Start with directories that have few errors for quick wins");
console.log("2. Plan incremental updates for directories with many errors");
console.log("3. Run specific type checks with:");
console.log(
  "   npm run typecheck:strict -- --files src/specific-directory/**/*.ts",
);
console.log("4. Update the code to fix type errors");
console.log("5. Re-run this script to track progress");
console.log("\nHappy coding! 🚀");
