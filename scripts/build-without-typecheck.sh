#!/bin/bash
# Build ohne TypeScript-Prüfung für schnelle Entwicklung

echo "🏗️ Building without TypeScript checking..."

# Temporär TypeScript-Fehler ignorieren
export NODE_OPTIONS="--max-old-space-size=4096"

# Build mit deaktivierten Type-Checks
npx vite build --mode development

echo "✅ Build completed (TypeScript errors ignored)"