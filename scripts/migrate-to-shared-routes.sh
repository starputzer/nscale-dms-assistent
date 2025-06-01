#!/bin/bash

# Migration script to use shared route configuration

echo "🚀 Starting migration to shared route configuration..."

# Create backup directory
BACKUP_DIR="backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

echo "📁 Creating backups in $BACKUP_DIR..."

# Backup important files
cp src/services/api/config.ts "$BACKUP_DIR/"
cp api/server.py "$BACKUP_DIR/"

# Step 1: Ensure shared directory exists
echo "📂 Creating shared directory..."
mkdir -p shared

# Step 2: Copy the TypeScript routes to the correct location
if [ -f "shared/api-routes.ts" ]; then
    echo "✅ Shared routes already exist"
else
    echo "❌ Error: shared/api-routes.ts not found!"
    exit 1
fi

# Step 3: Update tsconfig to include shared directory
echo "📝 Updating TypeScript configuration..."
if ! grep -q '"@/shared/\*"' tsconfig.json; then
    # Add shared path mapping to tsconfig.json
    sed -i '/"@\/\*": \["src\/\*"\]/a\      "@/shared/*": ["shared/*"],' tsconfig.json
    echo "✅ Added shared path mapping to tsconfig.json"
fi

# Step 4: Replace the API config
echo "📝 Updating API configuration..."
cp src/services/api/config-updated.ts src/services/api/config.ts
echo "✅ API configuration updated"

# Step 5: Update imports in services that use the config
echo "🔄 Updating service imports..."

# Find all TypeScript files that import from api/config
find src -name "*.ts" -o -name "*.vue" | while read file; do
    if grep -q "from.*['\"].*api/config['\"]" "$file"; then
        echo "  Checking $file..."
        # The imports should work as-is since we're keeping the same export structure
    fi
done

# Step 6: Create Python route migration script
echo "🐍 Preparing Python backend migration..."
cd api
python3 update_server_routes.py
cd ..

echo "
✨ Migration preparation complete!

Next steps:
1. Review the changes in server_updated.py
2. If everything looks good, run:
   cd api && mv server_updated.py server.py && cd ..
3. Restart the Python server:
   pkill -f 'python.*server.py'
   cd api && nohup python server.py > server.log 2>&1 &
4. Test the application

Backup created in: $BACKUP_DIR

To rollback:
cp $BACKUP_DIR/config.ts src/services/api/config.ts
cp $BACKUP_DIR/server.py api/server.py
"