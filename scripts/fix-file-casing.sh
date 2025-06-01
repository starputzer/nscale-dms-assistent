#!/bin/bash
# Script zur Vereinheitlichung der Dateibenennung (PascalCase/camelCase)
# Dieses Skript löst Konflikte mit Dateien, die sich nur in der Groß-/Kleinschreibung unterscheiden

# Verzeichnis, in dem die Dateien liegen
TARGET_DIR="/opt/nscale-assist/app/src/bridge/enhanced/optimized"

# Temporäres Verzeichnis für Dateien während der Umbenennung
TEMP_DIR="/opt/nscale-assist/app/scripts/temp_rename"
mkdir -p $TEMP_DIR

# Liste der Dateien, die Duplikate mit unterschiedlicher Groß-/Kleinschreibung haben
DUPLICATE_FILES=(
  "BatchedEventEmitter"
  "MemoryManager"
  "OptimizedChatBridge"
  "PerformanceMonitor"
)

# Einheitliches Benennungsschema: PascalCase für Klassen
echo "Vereinheitliche Dateinamen nach PascalCase..."

for basename in "${DUPLICATE_FILES[@]}"; do
  lowercase=$(echo "$basename" | sed 's/\([A-Z]\)/\L\1/g' | sed 's/^./\L&/')
  
  # Prüfen, ob beide Dateien existieren
  if [ -f "$TARGET_DIR/$basename.ts" ] && [ -f "$TARGET_DIR/$lowercase.ts" ]; then
    echo "Vereinheitliche $basename.ts und $lowercase.ts..."
    
    # Speichere die Inhalte der lowercase-Datei
    cp "$TARGET_DIR/$lowercase.ts" "$TEMP_DIR/$basename.content.ts"
    
    # Lösche die lowercase-Datei
    rm "$TARGET_DIR/$lowercase.ts"
    
    # Überprüfe den Inhalt beider Dateien
    if cmp -s "$TARGET_DIR/$basename.ts" "$TEMP_DIR/$basename.content.ts"; then
      echo "  Inhalt identisch, belasse $basename.ts"
    else
      echo "  Inhalt unterschiedlich, erstelle Backup von beiden Dateien"
      cp "$TARGET_DIR/$basename.ts" "$TEMP_DIR/$basename.backup.ts"
      mv "$TEMP_DIR/$basename.content.ts" "$TEMP_DIR/$lowercase.backup.ts"
      echo "  WARNUNG: Manuelle Zusammenführung erforderlich für $basename"
    fi
  elif [ -f "$TARGET_DIR/$lowercase.ts" ]; then
    echo "Benenne $lowercase.ts um zu $basename.ts..."
    mv "$TARGET_DIR/$lowercase.ts" "$TARGET_DIR/$basename.ts"
  elif [ -f "$TARGET_DIR/$basename.ts" ]; then
    echo "$basename.ts existiert bereits, keine Aktion erforderlich"
  else
    echo "FEHLER: Weder $basename.ts noch $lowercase.ts gefunden!"
  fi
done

echo "Dateibenennung abgeschlossen."

# Aktualisiere Imports in allen Dateien
echo "Aktualisiere Imports in allen Dateien..."

for file in "$TARGET_DIR"/*.ts; do
  for basename in "${DUPLICATE_FILES[@]}"; do
    lowercase=$(echo "$basename" | sed 's/\([A-Z]\)/\L\1/g' | sed 's/^./\L&/')
    
    # Suche nach Imports mit camelCase und ersetze sie mit PascalCase
    if grep -q "from ['\"]\./$lowercase['\"]" "$file"; then
      echo "Korrigiere Import in $file: $lowercase -> $basename"
      sed -i "s/from ['\"]\.\\/$lowercase['\"]/from '.\/$basename'/g" "$file"
    fi
  done
done

echo "Import-Aktualisierung abgeschlossen."