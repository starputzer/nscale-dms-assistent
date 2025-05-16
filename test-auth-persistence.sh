#!/bin/bash
# Test-Skript für Auth-Persistenz nach F5-Refresh

echo "=== Auth-Persistenz Test ==="
echo "Dieses Skript testet die implementierte Auth-Persistenz-Lösung"
echo ""

# Verwende die Enhanced-Version
echo "1. Starte die Anwendung mit Enhanced Auth-Persistenz..."
echo "   npm run dev:enhanced"
echo ""

echo "2. Schritte zum Testen:"
echo "   a) Öffne die App im Browser (http://localhost:3000)"
echo "   b) Melde dich mit Testdaten an"
echo "   c) Navigiere zur Chat-Seite"
echo "   d) Drücke F5 zum Refresh"
echo "   e) Du solltest eingeloggt bleiben und auf der Chat-Seite sein"
echo ""

echo "3. Debug-Tools:"
echo "   - Öffne die Browser-Konsole"
echo "   - Führe aus: window.__authGuardDebug()"
echo "   - Prüfe localStorage: localStorage.getItem('nscale_access_token')"
echo ""

# Starte die App
npm run dev:enhanced