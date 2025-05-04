# Asset-Management im nscale DMS Assistent

## Übersicht

Dieses Dokument beschreibt die optimierte Strategie für das Asset-Management im nscale DMS Assistent während der Migration von der klassischen HTML/JS-Struktur zur Vue.js-Architektur.

## Grundprinzipien

1. **Single Source of Truth**: Jede Datei existiert nur einmal im Dateisystem mit symbolischen Links für andere Verzeichnisse.
2. **Kanonische Pfade**: Die Vue.js-Dateien haben einheitliche und vorhersehbare Pfade.
3. **Robuste Fallbacks**: Jeder Asset-Typ hat einen Fallback-Mechanismus für den Fall, dass der Hauptpfad nicht funktioniert.

## Aktuelle Herausforderungen

Während der Migration koexistieren zwei verschiedene Frontend-Strukturen:

1. **Klassisches Frontend** (in `/frontend/`)
   - Statische HTML, CSS und JavaScript-Dateien
   - Direktes DOM-Manipulation und jQuery-basierte Implementierung
   - Dateistruktur: CSS in `/frontend/css/`, JavaScript in `/frontend/js/`

2. **Vue.js Frontend** (in `/nscale-vue/`)
   - Komponenten-basierte Architektur
   - Modernes JavaScript mit Modulen und Importen
   - Dateistruktur: Komponenten in `/nscale-vue/src/components/`, Standalone-Module in `/nscale-vue/src/standalone/`

Diese duale Struktur führt zu folgenden Herausforderungen:

- **Pfadkonflikte**: Unterschiedliche Pfadstrukturen erschweren den Zugriff auf gemeinsame Assets
- **Duplizierte Assets**: Bilder und andere Ressourcen müssen doppelt vorgehalten werden
- **Ladeprobleme**: Standalone-Module aus dem Vue.js-Bereich können vom klassischen Frontend nicht zuverlässig geladen werden

## Implementierte Lösungen

### 1. Optimierte Verzeichnisstruktur

Die Vue.js-Assets sind wie folgt organisiert:

#### Standalone-Skripte

Die Quellcode-Dateien befinden sich in `/opt/nscale-assist/app/nscale-vue/src/standalone/`:
- `doc-converter.js` - Standalone-Modul für den Dokumentenkonverter
- `chat-interface.js` - Standalone-Modul für die Chat-Schnittstelle
- `admin-feedback.js` - Standalone-Modul für die Admin-Feedback-Funktion

Symbolische Links existieren in folgenden Verzeichnissen:
- `/opt/nscale-assist/app/frontend/vue/standalone/` - Symlinks zum Quellverzeichnis
- `/opt/nscale-assist/app/api/static/vue/standalone/` - Symlinks zum Quellverzeichnis
- `/opt/nscale-assist/app/frontend/static/vue/standalone/` - Symlinks zum Quellverzeichnis für direkten Zugriff

### 2. Server-Seitiges Pfad-Mapping

In `server.py` werden mehrere StaticFiles-Mounts für verschiedene Verzeichnisse eingerichtet:

```python
# Explizites Mounting für API static Verzeichnis
api_static_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static")
if os.path.exists(api_static_path):
    app.mount("/api/static", StaticFiles(directory=api_static_path), name="api_static")

# Klassisches Frontend
app.mount("/static", StaticFiles(directory=frontend_path), name="static")

# Wichtigstes Mount-Punkt für Standalone-Skripte - direkt auf die Quelle
{
    "url_path": "/static/vue/standalone",
    "directory": os.path.join(vue_app_path, "src/standalone"),
    "name": "vue_static_standalone",
    "description": "Vue.js Standalone Scripts (Primärquelle)"
}
```

### 3. Symlink-Strategie

Für kritische Komponenten wurden Symlinks statt Kopien verwendet, um sicherzustellen, dass alle Dateipfade auf dieselbe physische Datei verweisen:

```bash
# Beispiel für Symlink-Erstellung
ln -s /opt/nscale-assist/app/nscale-vue/src/standalone/doc-converter.js /opt/nscale-assist/app/frontend/vue/standalone/
ln -s /opt/nscale-assist/app/nscale-vue/src/standalone/doc-converter.js /opt/nscale-assist/app/api/static/vue/standalone/
```

### 4. Optimierte Pfad-Auflösung

In den HTML- und JavaScript-Dateien wurde eine optimierte Pfad-Auflösung implementiert:

```javascript
// Primärer Pfad für die Produktionsumgebung
vueScript.src = '/static/vue/standalone/doc-converter.js';

vueScript.onerror = function() {
    // Versuche den Fallback-Pfad
    console.log('Versuche Fallback-Pfad...');
    vueScript.src = '/api/static/vue/standalone/doc-converter.js';
}
```

## Zugriffsoptionen

Die Standalone-Skripte können über folgende URLs erreicht werden:
1. `/static/js/vue/` (Primärer Pfad) - Direkt über das frontend/js/vue Verzeichnis (physische Kopien)
2. `/src/standalone/` (Erster Fallback) - Direkt vom nscale-vue/src/standalone gemountet
3. `/frontend/vue/standalone/` (Zweiter Fallback) - Vom frontend/vue/standalone Verzeichnis
4. Inline-Fallback - Eine vereinfachte Version direkt im HTML-Code

## Loading-Strategie

### Prioritäten

Der Code versucht, die Assets in dieser Reihenfolge zu laden:
1. Der primäre Pfad: `/static/js/vue/script-name.js` (physische Kopie im JS-Verzeichnis)
2. Der erste Fallback-Pfad: `/src/standalone/script-name.js` (direkt aus dem Vue.js-Source)
3. Der zweite Fallback-Pfad: `/frontend/vue/standalone/script-name.js` (über Frontend-Symlinks)
4. Klassische Implementierung als letzte Option

### Optimierte Initialisierungslogik

Für die Initialisierung wurden folgende Verbesserungen implementiert:

```javascript
// Variable für die Initialisierung
window.docConverterUIInitialized = false;

// Verhindere doppelte Initialisierung
if (window.docConverterUIInitialized) {
  console.log('DocConverter bereits initialisiert, überspringe...');
  return;
}
```

Diese Flags verhindern rekursive Initialisierungen und reduzieren den Ressourcenverbrauch erheblich.

## Langfristige Strategie

Für eine nachhaltige Lösung werden folgende Maßnahmen empfohlen:

1. **Einheitliche Asset-Pipeline**:
   - Etablierung eines gemeinsamen Asset-Build-Prozesses mit Vite
   - Einsatz von Asset-Hashing für bessere Cache-Kontrolle
   - Zentralisierte Verwaltung von Abhängigkeiten durch NPM/Yarn

2. **Konsolidierung der Verzeichnisstruktur**:
   - Migration zu einer einheitlichen Verzeichnisstruktur
   - Klare Trennung zwischen Komponenten, Assets und Hilfsskripten
   - Verwendung von Aliasen in der Build-Konfiguration für einfache Imports

## Änderungen an Standalone-Skripten

Wenn Sie Änderungen an einem Standalone-Skript vornehmen möchten:

1. Bearbeiten Sie NUR die Quelldatei in `/opt/nscale-assist/app/nscale-vue/src/standalone/`
2. Die Änderungen werden automatisch in allen symbolischen Links übernommen
3. Der Server muss neu gestartet werden, damit die Änderungen wirksam werden

## Hinzufügen neuer Standalone-Skripte

Um ein neues Standalone-Skript hinzuzufügen:

1. Datei in `/opt/nscale-assist/app/nscale-vue/src/standalone/` erstellen
2. Symbolische Links zu anderen Verzeichnissen hinzufügen:
   ```bash
   ln -s /opt/nscale-assist/app/nscale-vue/src/standalone/new-script.js /opt/nscale-assist/app/frontend/vue/standalone/
   ln -s /opt/nscale-assist/app/nscale-vue/src/standalone/new-script.js /opt/nscale-assist/app/api/static/vue/standalone/
   ```

## Fehlerbehebung

Bei Problemen mit dem Laden von Assets können folgende Schritte hilfreich sein:

1. Browser-Konsole überprüfen für 404-Fehler oder andere Ladeprobleme
2. Serverlogs kontrollieren, um zu sehen, welche Verzeichnisse erfolgreich gemountet wurden
3. Symbolische Links überprüfen mit `ls -la /pfad/zum/verzeichnis`
4. Verzeichnisberechtigungen überprüfen
5. Versuchen, die Dateien direkt über ihre URLs zu öffnen, um die Erreichbarkeit zu testen

## Fazit

Die optimierte Asset-Management-Strategie sorgt für eine klarere Organisation und zuverlässigere Ladeverfahren während der Migration von der klassischen zur Vue.js-basierten Implementierung.

---

Aktualisiert: 04.05.2025