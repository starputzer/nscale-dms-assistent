# Build- und Deployment-Konfiguration

Diese Dokumentation beschreibt die vollständige Build- und Deployment-Konfiguration für den nscale DMS Assistenten. Die Konfiguration wurde optimiert, um eine sichere, schnelle und zuverlässige Bereitstellung der Anwendung in verschiedenen Umgebungen zu gewährleisten.

## Inhaltsverzeichnis

1. [Vite Build-Konfiguration](#1-vite-build-konfiguration)
2. [Umgebungsvariablen](#2-umgebungsvariablen)
3. [Deployment-Skripte](#3-deployment-skripte)
4. [Cache-Strategien](#4-cache-strategien)
5. [CI/CD-Pipeline](#5-cicd-pipeline)
6. [Sicherheitsaspekte](#6-sicherheitsaspekte)
7. [Performance-Optimierungen](#7-performance-optimierungen)
8. [Fehlerbehebung](#8-fehlerbehebung)

## 1. Vite Build-Konfiguration

Die Vite-Konfiguration wurde optimiert, um die Leistung zu verbessern und die Anwendungsgröße zu reduzieren.

### 1.1. Code-Splitting und Lazy-Loading

Die Anwendung verwendet ein granulares Code-Splitting, um nur den Code zu laden, der tatsächlich benötigt wird:

- **Framework-Kern**: Vue, Vue Router und Pinia werden in einem separaten Chunk gebündelt
- **UI-Komponenten**: Basiskomponenten, Layout, Feedback, Daten-Komponenten
- **Feature-Module**: Chat, Admin, Dokumentenkonverter
- **Services**: API, Dienstprogramme, UI-Dienste
- **Stores**: Nach Funktionalität gruppiert

Beispiel aus `vite.config.ts`:

```typescript
manualChunks: {
  'vendor-core': ['vue', 'vue-router', 'pinia'],
  'vendor-utils': ['@vueuse/core', 'axios', 'uuid', 'marked'],
  'ui-base': ['./src/components/ui/base/Button.vue', '...'],
  'feature-chat': ['./src/components/chat/ChatContainer.vue', '...'],
  // ...weitere Chunks
}
```

### 1.2. Asset-Optimierung

Statische Assets werden automatisch kategorisiert und optimiert:

- **Bilder**: Komprimiert und in `assets/images/` platziert
- **CSS**: Minimiert, autoprefixed und in `assets/css/` platziert
- **Fonts**: In `assets/fonts/` zusammengefasst
- **Hash-basierte Dateinamen**: Für effektives Caching

### 1.3. CSS-Optimierung

Die CSS-Verarbeitung wurde verbessert durch:

- **CSS-Extraktion**: CSS wird in separate Dateien extrahiert
- **CSS-Module-Unterstützung**: Optimierte Klassennamengenerierung
- **Autoprefixer**: Für bessere Browser-Kompatibilität
- **SCSS-Integration**: Mit globalen Variablen

### 1.4. Kompression

Build-Ausgaben werden automatisch komprimiert:

- **Gzip-Kompression**: Für die meisten Server
- **Brotli-Kompression**: Für moderne Server mit besserer Kompression

## 2. Umgebungsvariablen

Die Anwendung verwendet ein detailliertes Umgebungsvariablensystem für verschiedene Bereitstellungskontexte.

### 2.1. Umgebungsdateien

- `.env`: Basis-Umgebungsvariablen für alle Umgebungen
- `.env.development`: Entwicklungsumgebung
- `.env.staging`: Staging-Umgebung
- `.env.production`: Produktionsumgebung
- `.env.test`: Test-Umgebung

### 2.2. Verfügbare Variablen

| Variable | Beschreibung | Beispielwert |
|----------|--------------|--------------|
| `VITE_API_URL` | API-Endpunkt URL | `https://api.nscale-assist.example.com` |
| `VITE_API_VERSION` | API-Version | `v1` |
| `VITE_ENV` | Umgebungsname | `production` |
| `VITE_ENABLE_DEBUG` | Debug-Modus aktivieren | `false` |
| `VITE_CACHE_STORAGE` | Cache-Speichertyp | `localStorage` |
| `VITE_CACHE_LIFETIME` | Cache-Lebensdauer (Sekunden) | `43200` |
| `VITE_FEATURE_*` | Feature-Flags | `true`/`false` |

### 2.3. Verwendung in der Anwendung

Zugriff auf Umgebungsvariablen in der Anwendung:

```typescript
// In Vue-Komponenten und Services
const apiUrl = import.meta.env.VITE_API_URL;
const isProduction = import.meta.env.VITE_ENV === 'production';

// Dynamische Import-Pfade basierend auf Umgebung
const configPath = isProduction ? './config.prod.js' : './config.dev.js';
```

## 3. Deployment-Skripte

Die Deployment-Skripte automatisieren den Build- und Deployment-Prozess für verschiedene Umgebungen.

### 3.1. Development-Deployment

Das Development-Deployment-Skript (`scripts/deploy-dev.sh`) baut die Anwendung für die lokale Entwicklung:

- Installiert Abhängigkeiten
- Führt Lint und TypeScript-Prüfungen durch
- Erstellt einen Development-Build
- Startet einen lokalen Server zur Vorschau

### 3.2. Staging-Deployment

Das Staging-Deployment-Skript (`scripts/deploy-staging.sh`) deployt die Anwendung in einer Staging-Umgebung:

- Erstellt einen Staging-Build
- Sichert vorhandene Deployments
- Überträgt Dateien auf den Staging-Server via RSYNC
- Aktualisiert Symlinks für eine atomare Bereitstellung
- Bereinigt alte Releases

### 3.3. Produktions-Deployment

Das Produktions-Deployment-Skript (`scripts/deploy-production.sh`) implementiert ein robustes Release-Management:

- Prüft Branch-Berechtigungen (nur main/master)
- Erstellt ein versioniertes Release
- Verwendet ein rollierendes Release-System mit Symlinks
- Behält die letzten 5 Releases für schnelles Rollback
- Invalidiert CDN-Caches

### 3.4. Rollback-Skript

Das Rollback-Skript (`scripts/rollback.sh`) ermöglicht ein schnelles Zurücksetzen auf frühere Releases:

- Zeigt verfügbare frühere Releases an
- Ermöglicht Auswahl des Rollback-Ziels
- Aktualisiert nur Symlinks für schnelle Wiederherstellung
- Invalidiert Caches nach Rollback

### 3.5. Cache-Invalidierung

Das Cache-Invalidierungs-Skript (`scripts/cache-invalidate.sh`) kann manuell ausgeführt werden, um CDN- und Browser-Caches zu leeren.

## 4. Cache-Strategien

Die Anwendung verwendet mehrschichtige Cache-Strategien für optimale Performance.

### 4.1. Browser-Caching

Statische Assets werden für effizientes Browser-Caching optimiert:

- **Hash-basierte Dateinamen**: Für automatische Cache-Busting bei Änderungen
- **Aggressive Cache-Header**: Für unveränderliche Assets
- **Cache-Kontrolle**: Differenzierte Caching-Regeln für verschiedene Assettypen

### 4.2. API-Response-Caching

Die Anwendung implementiert ein intelligentes API-Response-Caching:

- **Selektives Caching**: Basierend auf Endpunkt-Typen
- **TTL-Management**: Angepasste Ablaufzeiten nach Ressourcentyp
- **Stale-While-Revalidate**: Veraltete Daten anzeigen, während im Hintergrund aktualisiert wird
- **Offline-Fallback**: Verwendung von Cache-Daten bei Netzwerkproblemen

Implementiert in `src/services/cache/CacheService.ts` und `src/services/api/ApiCacheService.ts`.

### 4.3. CDN-Caching

Die Produktionsumgebung nutzt CDN-Caching für verbesserte globale Performance:

- **Automatische Invalidierung**: Bei jedem Deployment
- **Selektive Invalidierung**: Für spezifische Pfade
- **Cache-Header-Optimierung**: Für CDN-kompatible Caching-Strategien

## 5. CI/CD-Pipeline

Die CI/CD-Pipeline automatisiert Tests, Builds und Deployments.

### 5.1. CI-Workflow

Der CI-Workflow (`.github/workflows/ci.yml`) führt automatisch Tests und Build-Validierung durch:

- Lint & Type-Checking
- Unit-Tests
- Komponententests
- E2E-Tests
- Build-Validierung
- Sicherheits-Scan

### 5.2. Staging-Deployment-Workflow

Der Staging-Deployment-Workflow (`.github/workflows/cd-staging.yml`) wird automatisch ausgelöst:

- Bei Pushes in den `develop`-Branch
- Bei manueller Auslösung
- Führt Tests aus, erstellt einen Build und deployt auf den Staging-Server

### 5.3. Produktions-Deployment-Workflow

Der Produktions-Deployment-Workflow (`.github/workflows/cd-production.yml`) wird ausgelöst:

- Bei Pushes in den `main`/`master`-Branch
- Bei Tag-Pushes (`v*`)
- Bei manueller Auslösung mit Bestätigung
- Führt erweiterte Tests durch und deployt auf den Produktionsserver

### 5.4. Cache-Invalidierungs-Workflow

Der Cache-Invalidierungs-Workflow (`.github/workflows/cache-invalidation.yml`) kann manuell ausgelöst werden, um CDN-Caches zu invalidieren.

## 6. Sicherheitsaspekte

Die Build- und Deployment-Konfiguration berücksichtigt wichtige Sicherheitsaspekte.

### 6.1. Sichere Umgebungsvariablen

- Verwendung von GitHub Secrets für sensible Daten
- Getrennte Umgebungsvariablen pro Deployment-Kontext
- Keine hartcodierten Anmeldedaten im Code

### 6.2. Dependency-Scanning

- Automatische Sicherheitsscans für Abhängigkeiten
- OWASP Dependency-Check in der CI-Pipeline
- npm audit für Node.js-Abhängigkeiten

### 6.3. Rollback-Mechanismus

- Einfaches Zurücksetzen auf frühere Versionen bei Sicherheitsproblemen
- Aufbewahrung mehrerer früherer Releases
- Minimale Ausfallzeit bei Sicherheitsupdates

## 7. Performance-Optimierungen

Die Build- und Deployment-Konfiguration umfasst mehrere Performance-Optimierungen.

### 7.1. Build-Optimierungen

- **Terser-Minifizierung**: Für kleinere Dateien
- **Tree-Shaking**: Entfernt ungenutzten Code
- **Modul-Verkettung**: Reduziert HTTP-Anfragen
- **Optimierte Bilderverarbeitung**: Mit angemessener Qualität

### 7.2. Runtime-Optimierungen

- **Preloading**: Wichtiger Assets
- **Prefetching**: Wahrscheinlich benötigter Chunks
- **Web Workers**: Für rechenintensive Operationen

### 7.3. Deployment-Optimierungen

- **Atomare Deployments**: Mit Symlink-Tausch
- **Parallele Uploads**: Für schnellere Bereitstellung
- **Differenzielle Übertragung**: Mit rsync

## 8. Fehlerbehebung

Häufige Probleme und Lösungen im Zusammenhang mit dem Build- und Deployment-Prozess.

### 8.1. Build-Fehler

| Problem | Mögliche Ursache | Lösung |
|---------|------------------|--------|
| TypeScript-Fehler | Inkompatible Typen | Typdefinitionen aktualisieren oder `any` verwenden |
| Chunk-Größe-Warnung | Zu große Bundles | Chunk-Konfiguration in `vite.config.ts` anpassen |
| CSS-Fehler | Unvollständige Import-Pfade | Vollständige Pfade für SCSS-Importe verwenden |

### 8.2. Deployment-Fehler

| Problem | Mögliche Ursache | Lösung |
|---------|------------------|--------|
| SSH-Zugangsfehler | Fehlende Schlüssel | SSH-Konfiguration prüfen, Schlüssel hinzufügen |
| Symlink-Fehler | Fehlende Berechtigungen | Ordnerberechtigungen anpassen (`chmod 755`) |
| CDN-Invalidierung fehlgeschlagen | Ungültige Anmeldedaten | AWS/Cloudflare-Anmeldedaten prüfen |

### 8.3. Cache-Probleme

| Problem | Mögliche Ursache | Lösung |
|---------|------------------|--------|
| Alte Version wird angezeigt | Browser-Cache | Manuelles Cache-Leeren oder Cache-Invalidierungs-Skript ausführen |
| CDN zeigt alte Dateien | CDN-Cache | CDN-Invalidierung auslösen |
| API-Daten veraltet | API-Cache | `CachedApiService.clearCache()` aufrufen |

---

Diese Dokumentation stellt einen umfassenden Überblick über die Build- und Deployment-Konfiguration des nscale DMS Assistenten dar. Bei Fragen oder Problemen wenden Sie sich bitte an das Entwicklungsteam.