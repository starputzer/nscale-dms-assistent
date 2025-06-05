import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

// Pattern to find .then with incorrect arrow function syntax
const thenPattern = /\.then\(([^(][^)]*)\)\s*=>/g;

async function fixThenSyntax() {
    const files = await glob('src/**/*.{ts,tsx,vue}', { cwd: '/opt/nscale-assist/app' });
    let totalFixed = 0;
    
    for (const file of files) {
        const filePath = path.join('/opt/nscale-assist/app', file);
        let content = fs.readFileSync(filePath, 'utf-8');
        let modified = false;
        
        // Fix .then syntax
        const newContent = content.replace(thenPattern, (match, params) => {
            modified = true;
            return `.then((${params}) =>`;
        });
        
        if (modified) {
            fs.writeFileSync(filePath, newContent);
            
            // Count fixes
            const matches = content.match(thenPattern);
            const fixCount = matches ? matches.length : 0;
            totalFixed += fixCount;
            
            console.log(`Fixed ${fixCount} .then syntax errors in ${file}`);
        }
    }
    
    console.log(`\nTotal .then syntax errors fixed: ${totalFixed}`);
}

fixThenSyntax().catch(console.error);