#!/bin/bash
set -e

echo "Applying fixes for admin panel lazy loading..."

# Create backup of original files
echo "Creating backups..."
cp src/services/lazy-loading.ts src/services/lazy-loading.ts.bak
cp src/router/index.ts src/router/index.ts.bak
cp src/views/CompleteAdminView.vue src/views/CompleteAdminView.vue.bak

# Apply the fixed files
echo "Applying fixes..."
cp src/services/lazy-loading.fixed.ts src/services/lazy-loading.ts
cp src/router/index.fixed.ts src/router/index.ts
cp src/views/CompleteAdminView.fixed.vue src/views/CompleteAdminView.vue

# Ensure our new files are also in place
echo "Ensuring all required files are in place..."
if [ ! -f src/components/admin/AdminPanelLoader.vue ]; then
  echo "ERROR: AdminPanelLoader.vue is missing!"
  exit 1
fi

echo "Fix applied successfully!"
echo "Please restart your development server for the changes to take effect."
echo "For more information, see ADMIN_PANEL_LAZY_LOADING_FIX.md"