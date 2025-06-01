#!/bin/bash

# Create a temporary file to convert SCSS to CSS
TEMP_FILE=$(mktemp)

# Replace SCSS comment style with CSS comment style
sed 's|^//|/*|; s|$| */|; s|//|/* |g; s|$|)|' /opt/nscale-assist/worktrees/admin-improvements/src/assets/styles/admin-consolidated.scss > "$TEMP_FILE"

# Copy the processed file to the public directory
mkdir -p /opt/nscale-assist/worktrees/admin-improvements/public/assets/styles
cp "$TEMP_FILE" /opt/nscale-assist/worktrees/admin-improvements/public/assets/styles/admin-consolidated.css

# Clean up
rm "$TEMP_FILE"

echo "SCSS file has been converted and copied to public/assets/styles/admin-consolidated.css"