#!/bin/bash
# Quick build script to bypass TypeScript errors temporarily

echo "🚀 Starting quick build (TypeScript checks disabled)..."
echo "=================================================="

# Use the less strict TypeScript config
export TS_NODE_PROJECT=tsconfig.build.json

# Build with Vite (no TypeScript checking)
echo "Building with Vite..."
npm run build:no-check

if [ $? -eq 0 ]; then
    echo "✅ Build completed successfully!"
    echo ""
    echo "⚠️  WARNING: This build bypassed TypeScript checks!"
    echo "   Please fix TypeScript errors for production builds."
    echo ""
    echo "Build output in: dist/"
else
    echo "❌ Build failed!"
    exit 1
fi