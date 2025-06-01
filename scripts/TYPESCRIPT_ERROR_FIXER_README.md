# TypeScript Error Auto-Fixer Scripts

This directory contains scripts to automatically fix common TypeScript errors in the codebase.

## Available Scripts

### 1. `fix-typescript-errors.js` (Recommended for quick fixes)

A simple JavaScript script that can fix the most common TypeScript errors without requiring ts-node.

**Usage:**
```bash
npm run typescript:fix
# or directly:
node scripts/fix-typescript-errors.js
```

**What it fixes:**
- Unused imports and variables (TS6133, TS6196)
- Implicit any types (TS7005, TS7006, TS7034)
- "Did you mean" property name typos (TS2551)
- Missing common Vue/TypeScript imports (TS2304)

### 2. `fix-typescript-errors-auto.ts` (Basic TypeScript version)

TypeScript version with basic auto-fixing capabilities.

**Usage:**
```bash
npm run typescript:fix:auto
# or directly:
npx ts-node scripts/fix-typescript-errors-auto.ts
```

**Features:**
- Same fixes as the JavaScript version
- Better TypeScript AST manipulation
- More accurate transformations

### 3. `fix-typescript-errors-enhanced.ts` (Advanced version)

Enhanced TypeScript fixer with comprehensive error handling and reporting.

**Usage:**
```bash
npm run typescript:fix:enhanced
# or directly:
npx ts-node scripts/fix-typescript-errors-enhanced.ts
```

**Additional features:**
- Detailed error categorization
- Automatic backup creation before modifications
- Comprehensive error report generation
- Support for more error types
- Better handling of complex code patterns

## Error Types Handled

### Automatically Fixable:
- **TS6133/TS6196**: Unused imports and variables
- **TS7005/TS7006/TS7034**: Implicit 'any' types
- **TS2551**: Property name typos (did you mean...)
- **TS2304**: Missing imports for common types

### Requires Manual Intervention:
- **TS2322**: Type assignment errors
- **TS2339**: Property doesn't exist on type
- **TS2345**: Argument type mismatch
- **TS2559**: Types have no properties in common
- **TS2574**: Rest element type errors

## Safety Features

1. **Automatic Backups**: All scripts create timestamped backups before modifying files
2. **Validation**: Changes are validated before writing to disk
3. **Reporting**: Detailed reports show what was fixed and what needs manual attention
4. **Incremental Fixes**: Scripts can be run multiple times safely

## Workflow Recommendations

1. **Initial cleanup**: Run `npm run typescript:fix` for quick wins
2. **Detailed analysis**: Use `npm run typescript:fix:enhanced` for comprehensive fixes
3. **Manual review**: Check the generated reports for errors needing manual intervention
4. **Validation**: Run `npm run typecheck` to verify fixes

## Generated Files

- `typescript-fix-report.json`: Summary of fixes applied (JavaScript version)
- `typescript-errors-report.md`: Detailed markdown report (Enhanced version)
- `*.backup-[timestamp]`: Backup files created before modifications

## Tips

1. Always commit your changes before running these scripts
2. Review the changes made by the scripts before committing
3. Use version control to track modifications
4. Run tests after applying fixes to ensure functionality

## Common Scenarios

### Cleaning up after refactoring:
```bash
npm run typescript:fix
npm run lint
npm run test
```

### Preparing for strict TypeScript:
```bash
npm run typescript:fix:enhanced
npm run typecheck:strict
```

### CI/CD integration:
```bash
# In your CI pipeline
npm run typescript:fix
npm run build
```

## Troubleshooting

**Script fails to run:**
- Ensure you have `ts-node` installed: `npm install -g ts-node`
- Check Node.js version compatibility (requires Node 14+)

**Too many errors to fix:**
- Focus on one error type at a time
- Use the enhanced script for better categorization
- Consider fixing errors manually for complex cases

**Changes break functionality:**
- Restore from backups (created automatically)
- Use git to revert changes
- Apply fixes incrementally

## Contributing

When adding new error fixes:
1. Add the error code to the `fixStrategies` map
2. Implement the transformation logic
3. Test thoroughly with sample code
4. Update this documentation