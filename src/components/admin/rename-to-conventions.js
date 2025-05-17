#!/usr/bin/env node

/**
 * This script helps with renaming admin components to follow the standardized naming conventions.
 * Run this script to see proposed renames, and run with --apply to actually rename files.
 */

const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");

// Configuration
const ADMIN_DIR = path.resolve(__dirname);
const TABS_DIR = path.resolve(ADMIN_DIR, "tabs");
const DRY_RUN = process.argv.indexOf("--apply") === -1;

// Mapping of old naming patterns to new standardized naming patterns
const renamingRules = [
  { pattern: /(.+)\.enhanced\.vue$/, replacement: "$1.v2.vue" },
  { pattern: /(.+)-redesigned\.vue$/, replacement: "$1.v2.vue" },
  { pattern: /(.+)Redesigned\.vue$/, replacement: "$1.v2.vue" },
  { pattern: /(.+)Updated\.vue$/, replacement: "$1.v2.vue" },
  { pattern: /(.+)V2\.vue$/, replacement: "$1.v2.vue" },
  { pattern: /(.+)Optimized\.vue$/, replacement: "$1.optimized.vue" },
  { pattern: /(.+)Tab\.vue$/, replacement: "$1.vue" },
];

/**
 * Recursively walks through a directory and applies renaming rules to files
 * @param {string} dir - Directory to process
 */
function processDirectory(dir) {
  const items = fs.readdirSync(dir);

  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      // Process subdirectories recursively
      processDirectory(fullPath);
    } else if (stat.isFile() && item.endsWith(".vue")) {
      // Apply renaming rules to Vue files
      let newName = item;
      let renamed = false;

      for (const rule of renamingRules) {
        if (rule.pattern.test(item)) {
          newName = item.replace(rule.pattern, rule.replacement);
          renamed = true;
          break;
        }
      }

      if (renamed) {
        const newPath = path.join(dir, newName);
        console.log(
          `${DRY_RUN ? "[DRY RUN] " : ""}Renaming: ${fullPath} -> ${newPath}`,
        );

        if (!DRY_RUN) {
          // Update imports in files that reference this component
          updateImportsInFiles(item, newName);

          // Perform the actual file rename
          fs.renameSync(fullPath, newPath);
        }
      }
    }
  }
}

/**
 * Updates import statements in files that reference renamed components
 * @param {string} oldName - Original file name
 * @param {string} newName - New file name
 */
function updateImportsInFiles(oldName, newName) {
  // Get the base name without extension for both old and new names
  const oldBaseName = path.basename(oldName, ".vue");
  const newBaseName = path.basename(newName, ".vue");

  // Only update references if the base name changed
  if (oldBaseName !== newBaseName) {
    console.log(`Updating imports: ${oldBaseName} -> ${newBaseName}`);

    // Find files that import the old component name
    const command = `grep -r "import.*${oldBaseName}.*from" ${ADMIN_DIR} --include="*.vue" --include="*.ts" --include="*.js"`;

    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error searching for imports: ${error.message}`);
        return;
      }

      if (stderr) {
        console.error(`Error: ${stderr}`);
        return;
      }

      // Process each file with matching imports
      const lines = stdout.trim().split("\n");
      for (const line of lines) {
        if (!line) continue;

        // Extract file path and update imports
        const [filePath] = line.split(":");
        updateImportInFile(filePath, oldBaseName, newBaseName);
      }
    });
  }
}

/**
 * Updates import statements in a specific file
 * @param {string} filePath - Path to the file to update
 * @param {string} oldName - Original component name
 * @param {string} newName - New component name
 */
function updateImportInFile(filePath, oldName, newName) {
  try {
    let content = fs.readFileSync(filePath, "utf8");

    // Update import statements
    const importRegex = new RegExp(
      `import\\s+(\\{\\s*)?${oldName}(\\s*\\})?\\s+from\\s+["']([^"']+)["']`,
      "g",
    );
    content = content.replace(importRegex, (match, p1, p2, p3) => {
      return `import ${p1 || ""}${newName}${p2 || ""} from '${p3}'`;
    });

    // Update file path in imports
    const pathRegex = new RegExp(
      `from\\s+["']([^"']+)${oldName}\\.vue["']`,
      "g",
    );
    content = content.replace(pathRegex, (match, p1) => {
      return `from '${p1}${newName}.vue'`;
    });

    // Update component references in defineAsyncComponent
    const asyncRegex = new RegExp(
      `import\\(["\']([^"']+)${oldName}\\.vue["\']\\)`,
      "g",
    );
    content = content.replace(asyncRegex, (match, p1) => {
      return `import("${p1}${newName}.vue")`;
    });

    // Write the updated content back to the file
    fs.writeFileSync(filePath, content, "utf8");
    console.log(`Updated imports in: ${filePath}`);
  } catch (error) {
    console.error(`Error updating imports in ${filePath}: ${error.message}`);
  }
}

// Main execution
console.log(
  `${DRY_RUN ? "[DRY RUN] " : ""}Starting component renaming process...`,
);
processDirectory(ADMIN_DIR);

if (DRY_RUN) {
  console.log(
    "\nThis was a dry run. Run with --apply to perform the actual renaming.",
  );
} else {
  console.log("\nComponent renaming completed successfully.");
}
