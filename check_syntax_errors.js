import fs from 'fs';
import path from 'path';

const problematicPatterns = [
    // Double parentheses
    { pattern: /\(\((?!.*typeof).*as\s+any\)/g, name: 'Double parentheses before type assertion' },
    // Malformed property access
    { pattern: /\.\(.*as\s+any\)\./g, name: 'Malformed property access with type assertion' },
    // Missing arrow function params
    { pattern: /(?<!\.)\b(map|filter|find|findIndex|forEach|some|every|reduce)\s*\([^)]*\)\s*=>/g, name: 'Missing parentheses in arrow function' },
    // Extra closing parenthesis
    { pattern: /\)[;,]\s*\)/g, name: 'Extra closing parenthesis' },
    // Missing opening parenthesis
    { pattern: /\w+\s+as\s+any\)\./g, name: 'Missing opening parenthesis before type assertion' }
];

function checkFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const issues = [];
    
    // Check each pattern
    for (const check of problematicPatterns) {
        let match;
        while ((match = check.pattern.exec(content)) !== null) {
            // Find line number
            const beforeMatch = content.substring(0, match.index);
            const lineNumber = beforeMatch.split('\n').length;
            const line = lines[lineNumber - 1];
            
            issues.push({
                file: filePath,
                line: lineNumber,
                pattern: check.name,
                code: line.trim(),
                match: match[0]
            });
        }
    }
    
    // Check for specific ui.ts:671 error pattern
    lines.forEach((line, index) => {
        const lineNum = index + 1;
        
        // Check for patterns that might cause "Expected ;" but found ")"
        if (line.includes(') as T;') || line.includes('}) as T;')) {
            // Check if there's a syntax issue
            const trimmed = line.trim();
            if (trimmed.match(/\)\s*\)\s*as\s+T;/) || trimmed.match(/}\s*\)\s*as\s+T;/)) {
                issues.push({
                    file: filePath,
                    line: lineNum,
                    pattern: 'Possible extra parenthesis before type assertion',
                    code: line.trim()
                });
            }
        }
    });
    
    return issues;
}

// Check specific files mentioned in errors
const filesToCheck = [
    '/opt/nscale-assist/app/src/stores/ui.ts',
    '/opt/nscale-assist/app/src/stores/storeInitializer.ts'
];

console.log('Checking for syntax errors...\n');

filesToCheck.forEach(file => {
    if (fs.existsSync(file)) {
        const issues = checkFile(file);
        if (issues.length > 0) {
            console.log(`\nIssues in ${path.basename(file)}:`);
            issues.forEach(issue => {
                console.log(`  Line ${issue.line}: ${issue.pattern}`);
                console.log(`    Code: ${issue.code}`);
                if (issue.match) {
                    console.log(`    Match: "${issue.match}"`);
                }
            });
        } else {
            console.log(`✓ No issues found in ${path.basename(file)}`);
        }
    }
});