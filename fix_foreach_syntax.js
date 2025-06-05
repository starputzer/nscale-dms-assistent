import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

// Pattern to find forEach with incorrect syntax
const forEachPattern = /\.forEach\(([^(][^)]*:\s*\w+)\)\s*=>/g;

async function fixForEachSyntax() {
    const files = await glob('src/**/*.{ts,tsx,vue}', { cwd: '/opt/nscale-assist/app' });
    let totalFixed = 0;
    
    for (const file of files) {
        const filePath = path.join('/opt/nscale-assist/app', file);
        let content = fs.readFileSync(filePath, 'utf-8');
        let modified = false;
        
        // Fix forEach syntax
        const newContent = content.replace(forEachPattern, (match, params) => {
            modified = true;
            return `.forEach((${params}) =>`;
        });
        
        if (modified) {
            fs.writeFileSync(filePath, newContent);
            
            // Count fixes
            const matches = content.match(forEachPattern);
            const fixCount = matches ? matches.length : 0;
            totalFixed += fixCount;
            
            console.log(`Fixed ${fixCount} forEach syntax errors in ${file}`);
        }
    }
    
    console.log(`\nTotal forEach syntax errors fixed: ${totalFixed}`);
}

fixForEachSyntax().catch(console.error);