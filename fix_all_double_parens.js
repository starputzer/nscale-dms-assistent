import fs from 'fs';
import path from 'path';

const filePath = '/opt/nscale-assist/app/src/services/api/AdminDocConverterService.ts';

let content = fs.readFileSync(filePath, 'utf-8');

// Fix all instances of filter(( pattern
content = content.replace(/\.filter\(\(\s*\(/g, '.filter(');

// Fix all instances of map(( pattern  
content = content.replace(/\.map\(\(\s*\(/g, '.map(');

// Fix all instances of forEach(( pattern
content = content.replace(/\.forEach\(\(\s*\(/g, '.forEach(');

// Fix all instances of find(( pattern
content = content.replace(/\.find\(\(\s*\(/g, '.find(');

// Fix all instances of reduce(( pattern
content = content.replace(/\.reduce\(\(\s*\(/g, '.reduce(');

// Fix trailing comma before closing parenthesis patterns
content = content.replace(/,\s*\)/g, ')');

fs.writeFileSync(filePath, content);
console.log('Fixed all double parenthesis patterns in AdminDocConverterService.ts');