#!/bin/bash

# Skript zum Aktualisieren der Datumswerte in konsolidierten Dokumentationen

OLD_DATE="12.05.2025"
NEW_DATE="13.05.2025"

# Alle Markdown-Dateien im konsolidierten Dokumentationsverzeichnis finden
find /opt/nscale-assist/app/docs/00_KONSOLIDIERTE_DOKUMENTATION -type f -name "*.md" | while read -r file; do
    echo "Aktualisiere Datei: $file"
    # Aktualisiere lastUpdate im YAML-Header
    sed -i "s/lastUpdate: \"$OLD_DATE\"/lastUpdate: \"$NEW_DATE\"/" "$file"
    
    # Aktualisiere "Letzte Aktualisierung" im Hauptteil
    sed -i "s/> \*\*Letzte Aktualisierung:\*\* $OLD_DATE/> \*\*Letzte Aktualisierung:\*\* $NEW_DATE/" "$file"
    
    # Aktualisiere Fußzeile
    sed -i "s/\*Zuletzt aktualisiert: $OLD_DATE\*/\*Zuletzt aktualisiert: $NEW_DATE\*/" "$file"
done

# Aktualisiere auch die wichtigen Dokumentationsdateien im Wurzelverzeichnis
IMPORTANT_FILES=(
    "/opt/nscale-assist/app/docs/DOCUMENTATION_CONSOLIDATION_PLAN.md"
    "/opt/nscale-assist/app/docs/DOCUMENTATION_ACTION_PLAN.md"
    "/opt/nscale-assist/app/docs/DOKUMENTATION_ZUSAMMENFASSUNG.md"
    "/opt/nscale-assist/app/docs/DOCUMENT_TEMPLATE.md"
    "/opt/nscale-assist/app/docs/TYPESCRIPT_TEMPLATE.md"
)

for file in "${IMPORTANT_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "Aktualisiere wichtige Datei: $file"
        # Aktualisiere lastUpdate im YAML-Header
        sed -i "s/lastUpdate: \"$OLD_DATE\"/lastUpdate: \"$NEW_DATE\"/" "$file"
        
        # Aktualisiere "Letzte Aktualisierung" im Hauptteil
        sed -i "s/> \*\*Letzte Aktualisierung:\*\* $OLD_DATE/> \*\*Letzte Aktualisierung:\*\* $NEW_DATE/" "$file"
        
        # Aktualisiere Fußzeile
        sed -i "s/\*Zuletzt aktualisiert: $OLD_DATE\*/\*Zuletzt aktualisiert: $NEW_DATE\*/" "$file"
    fi
done

echo "Alle Datumswerte wurden aktualisiert."