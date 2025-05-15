#!/bin/bash
# Fix logo paths in all Vue files

echo "Fixing logo paths in Vue files..."

# Replace /images/senmvku-logo.png with /assets/images/senmvku-logo.png
find src -name "*.vue" -type f -exec sed -i 's|/images/senmvku-logo.png|/assets/images/senmvku-logo.png|g' {} +

echo "Logo paths fixed!"

# Show changes
echo "Changed files:"
git diff --name-only