import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

// Patterns to find array methods with incorrect syntax
const patterns = [
    { 
        regex: /\.(forEach|map|filter|find|findIndex|some|every|reduce)\(([^(][^)]*:\s*\w+)\)\s*=>/g,
        name: 'array methods'
    }
];

async function fixArrayMethodsSyntax() {
    const files = await glob('src/**/*.{ts,tsx,vue}', { cwd: '/opt/nscale-assist/app' });
    let totalFixed = 0;
    
    for (const file of files) {
        const filePath = path.join('/opt/nscale-assist/app', file);
        let content = fs.readFileSync(filePath, 'utf-8');
        let modified = false;
        let fixCount = 0;
        
        for (const pattern of patterns) {
            content = content.replace(pattern.regex, (match, method, params) => {
                modified = true;
                fixCount++;
                return `.${method}((${params}) =>`;
            });
        }
        
        if (modified) {
            fs.writeFileSync(filePath, content);
            totalFixed += fixCount;
            console.log(`Fixed ${fixCount} array method syntax errors in ${file}`);
        }
    }
    
    console.log(`\nTotal array method syntax errors fixed: ${totalFixed}`);
}

fixArrayMethodsSyntax().catch(console.error);