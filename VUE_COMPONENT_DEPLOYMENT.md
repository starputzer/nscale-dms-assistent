# Vue.js Komponenten Deployment

Dieses Dokument beschreibt den Prozess zum Deployment der Vue.js-Komponenten in der nscale DMS Assistent-Anwendung.

## Überblick

Das System verwendet eine Hybrid-Architektur, bei der sowohl klassische JavaScript-Komponenten als auch moderne Vue.js-Komponenten koexistieren. Für eine reibungslose Integration zwischen diesen beiden Ansätzen ist ein spezifischer Deployment-Prozess erforderlich.

## Das `update-vue-components.sh` Skript

Das Haupt-Deployment-Tool ist das `update-vue-components.sh` Skript, das folgende Aufgaben ausführt:

1. Baut die Vue.js-Komponenten mit `npm run build`
2. Kopiert die erstellten Standalone-Skripte in die entsprechenden Verzeichnisse
3. Kopiert die direkten Zugriffe auf die Standalone-Komponenten
4. Kopiert die statischen Assets (CSS, Bilder, Schriften)
5. Erstellt spezielle Initialisierungsskripte für verschiedene Komponenten
6. Erstellt ein Patch-Skript, um inline-Scripts in index.html zu ersetzen
7. Stellt sicher, dass wichtige Komponenten wie feature-toggle.js verfügbar sind

## Verwendung

Um die Vue.js-Komponenten zu deployen, führen Sie folgende Schritte aus:

```bash
# Im Hauptverzeichnis der Anwendung
cd /opt/nscale-assist/app

# Führen Sie das Update-Skript aus
./update-vue-components.sh

# Führen Sie das Patch-Skript aus, um inline-Scripts zu entfernen
./patch-index-html.sh
```

## Verzeichnisstruktur

Die Deployment-Struktur umfasst folgende Hauptverzeichnisse:

```
/opt/nscale-assist/app/
├── nscale-vue/                  # Vue.js-Quellcode
│   ├── src/                     # Vue.js-Komponenten Quellcode
│   │   ├── standalone/          # Standalone-Module Quellcode
│   ├── dist/                    # Kompilierte Vue.js-Komponenten (nach Build)
│   │   ├── assets/              # Kompilierte Assets
│   │   │   ├── js/              # Kompilierte JavaScript-Dateien
│
├── frontend/                    # Klassisches Frontend
│   ├── js/
│   │   ├── vue/                 # Direktzugriffsmodule für Vue.js-Komponenten
│   ├── static/
│   │   ├── vue/
│   │   │   ├── standalone/      # Kompilierte Standalone-Module
│   │   │   ├── components/      # Andere Vue.js-Komponenten
│   │   │   ├── assets/          # Kopierte Assets
│
├── api/                         # API-Server
│   ├── static/
│   │   ├── vue/
│   │   │   ├── standalone/      # Kompilierte Standalone-Module für API
```

## Fehlerbehandlung

Bei Problemen mit dem Vue.js-Deployment prüfen Sie Folgendes:

1. Browser-Konsolenfehler überprüfen für JavaScript-Fehler
2. Vergewissern Sie sich, dass alle Dateipfade korrekt sind:
   - Frontend: `/opt/nscale-assist/app/frontend/static/vue/standalone/`
   - API: `/opt/nscale-assist/app/api/static/vue/standalone/`
3. Stellen Sie sicher, dass die Vue.js-Komponenten korrekt gebaut wurden
4. Überprüfen Sie die JavaScript-Initialisierung in der Browser-Konsole

Das System verfügt über robuste Fallback-Mechanismen. Falls eine Vue.js-Komponente nicht geladen werden kann, wird die klassische Implementierung automatisch aktiviert.

## Nomodule-Versionen

Für Browser ohne ES-Module-Support oder andere Inkompatibilitäten wurden spezielle nomodule-Versionen der Vue.js-Komponenten erstellt:

- `doc-converter-nomodule.js`: Vereinfachte Version des Dokumentenkonverters ohne ES-Module
- `feature-toggle-nomodule.js`: Vereinfachte Version des Feature-Toggle-Managers ohne ES-Module

Diese Versionen bieten:
1. Keine ES-Module-Importe
2. Vereinfachte Funktionalität
3. Automatisches Laden der Vue.js-Bibliothek, falls nicht vorhanden
4. Fallback-HTML, falls Vue.js nicht geladen werden kann

## Spezielle Komponenten

### DocConverter-Initializer

Dieser Initialisierer sucht nach verschiedenen möglichen Container-IDs und versucht, die Vue.js-Dokumentenkonverter-Komponente zu laden. Bei Problemen werden alternative Pfade versucht und schließlich die klassische Implementierung als Fallback aktiviert.

### Feature-Toggle-Manager

Verwaltet die Aktivierung/Deaktivierung verschiedener Vue.js-Komponenten und bietet eine Benutzeroberfläche zur Auswahl zwischen klassischer und Vue.js-UI. Auch hier werden bei Problemen alternative Pfade versucht und ein HTML-Fallback angezeigt.

## Hinweise für Entwickler

- Vermeiden Sie inline-Scripts in Vue.js-Templates, da diese von Vue.js ignoriert werden
- Nutzen Sie stattdessen dedizierte Komponenten für komplexe Funktionalitäten
- Achten Sie auf korrekte Pfade in allen Skripten
- Testen Sie Änderungen immer zuerst in einer Testumgebung, bevor sie in die Produktion übernommen werden