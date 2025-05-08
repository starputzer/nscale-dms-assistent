#!/bin/bash

# Dieses Skript setzt die Frontend-Cache-Dateien zurück und prüft MIME-Typen

echo "=== nscale DMS Assistent Frontend-Cache-Reset ==="
echo "Dieses Skript behebt potenzielle MIME-Typ-Probleme und bereinigt Caches."

# 1. Prüfe ob Vite-Prozesse laufen und beende sie
echo -e "\n=== Stoppe laufende Vite-Prozesse ==="
VITE_PIDS=$(pgrep -f vite)
if [ -n "$VITE_PIDS" ]; then
    echo "Gefundene Vite-Prozesse: $VITE_PIDS"
    pkill -f vite
    echo "Vite-Prozesse wurden beendet."
else
    echo "Keine laufenden Vite-Prozesse gefunden."
fi

# 2. Prüfe ob Python-Server läuft und beende ihn
echo -e "\n=== Stoppe laufenden Python-Server ==="
PYTHON_PIDS=$(pgrep -f "python.*server.py")
if [ -n "$PYTHON_PIDS" ]; then
    echo "Gefundene Python-Server-Prozesse: $PYTHON_PIDS"
    pkill -f "python.*server.py"
    echo "Python-Server-Prozesse wurden beendet."
else
    echo "Keine laufenden Python-Server gefunden."
fi

# 3. Lösche temporäre Dateien und Cache
echo -e "\n=== Bereinige temporäre Dateien und Cache ==="
if [ -d "node_modules/.vite" ]; then
    echo "Lösche Vite-Cache..."
    rm -rf node_modules/.vite
    echo "Vite-Cache gelöscht."
else
    echo "Kein Vite-Cache vorhanden."
fi

echo "Lösche temporäre Dateien..."
find . -name "*.~*" -type f -delete
find . -name "*.tmp" -type f -delete
echo "Temporäre Dateien gelöscht."

# 4. Überprüfe statische Assets
echo -e "\n=== Überprüfe statische Assets ==="
FRONTEND_DIR="frontend"
CSS_DIR="$FRONTEND_DIR/css"
JS_DIR="$FRONTEND_DIR/js"
IMAGES_DIR="$FRONTEND_DIR/images"
STATIC_DIR="$FRONTEND_DIR/static"

# Überprüfe CSS-Dateien
echo "Überprüfe CSS-Dateien..."
CSS_FILES=$(find "$CSS_DIR" -type f -name "*.css" | wc -l)
echo "Gefundene CSS-Dateien: $CSS_FILES"

# Überprüfe JS-Dateien
echo "Überprüfe JavaScript-Dateien..."
JS_FILES=$(find "$JS_DIR" -type f -name "*.js" | wc -l)
echo "Gefundene JS-Dateien: $JS_FILES"

# Prüfe, ob Symlinks korrekt sind
echo -e "\n=== Prüfe Symlinks ==="
if [ -L "$STATIC_DIR/css" ] && [ -L "$STATIC_DIR/js" ] && [ -L "$STATIC_DIR/images" ]; then
    echo "Alle erwarteten Symlinks existieren."
else
    echo "WARNUNG: Mindestens ein Symlink fehlt. Erstelle Symlinks neu..."
    if [ -d "$STATIC_DIR" ]; then
        # Entferne bestehende Symlinks
        rm -f "$STATIC_DIR/css" "$STATIC_DIR/js" "$STATIC_DIR/images"
        
        # Erstelle neue Symlinks
        ln -sf "../css" "$STATIC_DIR/css"
        ln -sf "../js" "$STATIC_DIR/js"
        ln -sf "../images" "$STATIC_DIR/images"
        echo "Symlinks wurden neu erstellt."
    else
        echo "FEHLER: Statisches Verzeichnis nicht gefunden. Bitte überprüfen Sie die Installation."
        exit 1
    fi
fi

# 5. Überprüfe MIME-Type-Konfiguration im Server
echo -e "\n=== Überprüfe Server-MIME-Typen ==="
ENHANCED_MIDDLEWARE_COUNT=$(grep -c "EnhancedMiddleware" api/server.py)
if [ "$ENHANCED_MIDDLEWARE_COUNT" -gt 0 ]; then
    echo "Erweiterte MIME-Typ-Middleware ist konfiguriert."
else
    echo "WARNUNG: Erweiterte MIME-Typ-Middleware nicht gefunden!"
    echo "Bitte stellen Sie sicher, dass die EnhancedMiddleware in api/server.py korrekt eingerichtet ist."
fi

CSS_CONTENT_TYPE=$(grep -c "Content-Type.*text/css" api/server.py)
if [ "$CSS_CONTENT_TYPE" -gt 0 ]; then
    echo "CSS Content-Type-Überprüfung ist konfiguriert."
else
    echo "WARNUNG: CSS Content-Type-Überprüfung nicht gefunden!"
fi

# 6. Überprüfe CSS-Importe in JS-Dateien
echo -e "\n=== Überprüfe CSS-Importe in JS-Dateien ==="
CSS_IMPORTS_COUNT=$(grep -r "import.*\.css" "$FRONTEND_DIR" | wc -l)
echo "Gefundene CSS-Importe in JS-Dateien: $CSS_IMPORTS_COUNT"
if [ "$CSS_IMPORTS_COUNT" -gt 0 ]; then
    echo "WARNUNG: Es wurden CSS-Importe in JS-Dateien gefunden! Diese könnten MIME-Typ-Fehler verursachen."
    grep -r "import.*\.css" "$FRONTEND_DIR" --include="*.js"
else
    echo "Keine CSS-Importe in JS-Dateien gefunden. Gut!"
fi

# 7. Starte die Dienste neu
echo -e "\n=== Starte Dienste neu? ==="
read -p "Möchten Sie die Dienste neu starten (j/n)? " -n 1 -r
echo
if [[ $REPLY =~ ^[Jj]$ ]]; then
    echo "Starte Dienste neu..."
    cd /opt/nscale-assist/app
    ./restart-dev-server.sh &
    echo "Dienste werden im Hintergrund gestartet."
else
    echo "Dienste wurden nicht neu gestartet. Sie können dies später manuell tun."
fi

echo -e "\n=== Frontend-Cache-Reset abgeschlossen ==="
echo "Die Frontend-Umgebung sollte nun bereit sein, ohne MIME-Typ-Fehler zu funktionieren."
echo "Überprüfen Sie die Konsole im Browser, um sicherzustellen, dass keine Fehler auftreten."