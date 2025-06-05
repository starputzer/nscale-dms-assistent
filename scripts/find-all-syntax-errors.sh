#!/bin/bash

echo "🔍 Searching for common syntax error patterns..."

echo -e "\n1. Double/Triple parentheses:"
grep -r "(((" src --include="*.ts" --include="*.vue" 2>/dev/null | head -10

echo -e "\n2. Malformed property access (.():"
grep -r "\\.(" src --include="*.ts" --include="*.vue" 2>/dev/null | grep -v "\\.([a-zA-Z]" | head -10

echo -e "\n3. Missing parentheses in arrow functions:"
grep -r "=>[[:space:]]*[^{]" src --include="*.ts" --include="*.vue" 2>/dev/null | grep -E "(findIndex|filter|map|forEach|some|every|find|reduce).*=>[[:space:]]*[a-zA-Z]" | head -10

echo -e "\n4. Malformed type assertions:"
grep -r " as any\." src --include="*.ts" --include="*.vue" 2>/dev/null | head -10

echo -e "\n5. Wrong placement of 'as any':"
grep -r "\\.[[:space:]]*as any" src --include="*.ts" --include="*.vue" 2>/dev/null | head -10

echo -e "\n✅ Scan complete"