#!/bin/bash
# Fix all double parentheses patterns in TypeScript and Vue files

echo "🔧 Fixing all double parentheses patterns..."

# Find and fix patterns like ((window as any) -> (window as any)
find src -type f \( -name "*.ts" -o -name "*.vue" \) -exec sed -i 's/((window as any)/(window as any)/g' {} \;
find src -type f \( -name "*.ts" -o -name "*.vue" \) -exec sed -i 's/((this\./(this./g' {} \;
find src -type f \( -name "*.ts" -o -name "*.vue" \) -exec sed -i 's/((response/(response/g' {} \;
find src -type f \( -name "*.ts" -o -name "*.vue" \) -exec sed -i 's/((error/(error/g' {} \;
find src -type f \( -name "*.ts" -o -name "*.vue" \) -exec sed -i 's/((toast/(toast/g' {} \;
find src -type f \( -name "*.ts" -o -name "*.vue" \) -exec sed -i 's/((originalRequest/(originalRequest/g' {} \;
find src -type f \( -name "*.ts" -o -name "*.vue" \) -exec sed -i 's/((connection/(connection/g' {} \;
find src -type f \( -name "*.ts" -o -name "*.vue" \) -exec sed -i 's/((messages\./(messages./g' {} \;

# Fix patterns like .( -> .
find src -type f \( -name "*.ts" -o -name "*.vue" \) -exec sed -i 's/\.\(data as any\)/.data as any/g' {} \;
find src -type f \( -name "*.ts" -o -name "*.vue" \) -exec sed -i 's/\.\(this\./.this./g' {} \;

# Count fixed files
FIXED=$(grep -r "((.*as any)" src --include="*.ts" --include="*.vue" | wc -l)
echo "✅ Fixed double parentheses patterns. Remaining issues: $FIXED"

# Show remaining patterns if any
if [ $FIXED -gt 0 ]; then
  echo "Remaining patterns:"
  grep -r "((.*as any)" src --include="*.ts" --include="*.vue" | head -10
fi