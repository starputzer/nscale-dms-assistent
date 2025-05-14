#!/bin/bash

# Dieses Skript baut die Anwendung mit strikter TypeScript-Konfiguration

set -e  # Bei Fehlern abbrechen

echo "🔍 Prüfe TypeScript mit strikter Konfiguration..."

# TypeScript-Prüfung durchführen
npm run typecheck:strict || {
    echo "❌ TypeScript-Fehler gefunden!"
    echo "Möchten Sie trotzdem fortfahren? (j/N)"
    read answer
    if [[ ! "$answer" =~ ^[jJ]$ ]]; then
        echo "Build abgebrochen."
        exit 1
    fi
    echo "⚠️ Fortfahren trotz TypeScript-Fehlern..."
}

echo "🔨 Baue die Anwendung mit strikter TypeScript-Konfiguration..."

# Anwendung bauen
npm run build:strict

echo "✅ Build erfolgreich abgeschlossen mit strikter TypeScript-Konfiguration!"

# Zeige die Build-Größe an
echo "📊 Build-Größe:"
du -sh dist/

echo "🚀 Die Anwendung wurde erfolgreich gebaut und kann nun bereitgestellt werden."