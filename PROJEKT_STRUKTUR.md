# nscale DMS Assistent - Projektstruktur

Dieses Dokument enthält die aktuelle Struktur des nscale DMS Assistent-Projekts (Stand: 04.05.2025).

## Übersicht

Das Projekt ist in folgende Hauptbereiche unterteilt:

1. **Backend** (Python)
   - API-Server (`/api/`)
   - Dokumentenkonverter (`/doc_converter/`)
   - Kernmodule (`/modules/`)

2. **Frontend**
   - Klassisches Frontend (`/frontend/`)
   - Vue.js-Frontend (`/nscale-vue/`)

3. **Dokumentation** (Markdown-Dateien im Hauptverzeichnis)

## Detaillierte Struktur

### Backend

#### API Server
- `/api/server.py` - Hauptserver-Implementierung
- `/api/static/` - Statische Dateien für die API

#### Dokumentenkonverter
- `/doc_converter/main.py` - Einstiegspunkt für den Dokumentenkonverter
- `/doc_converter/converters/` - Implementierungen für verschiedene Dokumentenformate
- `/doc_converter/inventory/` - Funktionen zur Dokumentenkategorisierung und -analyse
- `/doc_converter/processing/` - Verarbeitungspipeline für Dokumente
- `/doc_converter/web/` - Web-Interface für den Dokumentenkonverter

#### Module
- `/modules/auth/` - Authentifizierung und Benutzerverwaltung
- `/modules/core/` - Grundlegende Konfigurationen und Funktionalitäten
- `/modules/feedback/` - Feedback-Verwaltungssystem
- `/modules/llm/` - Large Language Model Integration
- `/modules/rag/` - Retrieval Augmented Generation
- `/modules/retrieval/` - Dokumentensuche und -abruf
- `/modules/session/` - Sitzungsverwaltung und Chat-Verlauf

### Frontend

#### Klassisches Frontend
- `/frontend/css/` - CSS-Dateien für das klassische Frontend
- `/frontend/js/` - JavaScript-Dateien
  - `/frontend/js/app.js` - Haupt-Anwendungslogik
  - `/frontend/js/admin.js` - Administrative Funktionen
  - `/frontend/js/admin-integration.js` - Integration von Vue.js-Admin-Komponenten
  - `/frontend/js/chat.js` - Chat-Funktionalität
  - `/frontend/js/doc-converter-fallback.js` - Fallback für den Dokumentenkonverter
  - `/frontend/js/vue/` - Direkt im Browser ausführbare Vue.js-Komponenten
- `/frontend/index.html` - Haupt-HTML-Datei für die Anwendung

#### Vue.js Frontend
- `/nscale-vue/src/` - Quellcode des Vue.js-Frontends
  - `/nscale-vue/src/components/` - Vue.js-Komponenten
    - `/nscale-vue/src/components/admin/` - Admin-Komponenten
    - `/nscale-vue/src/components/chat/` - Chat-Komponenten
    - `/nscale-vue/src/components/doc-converter/` - Komponenten für den Dokumentenkonverter
    - `/nscale-vue/src/components/common/` - Gemeinsam genutzte Komponenten
  - `/nscale-vue/src/stores/` - Pinia-Stores für die Zustandsverwaltung
  - `/nscale-vue/src/views/` - Vue.js-Ansichten (Seiten)
  - `/nscale-vue/src/standalone/` - Eigenständige Vue.js-Module
- `/nscale-vue/dist/` - Kompilierte Produktionsversion des Vue.js-Frontends

### Integration zwischen klassischem und Vue.js-Frontend

Die Integration zwischen dem klassischen und dem Vue.js-Frontend wird durch verschiedene Techniken ermöglicht:

1. **Feature-Toggle-System**
   - `localStorage`-basierte Schalter zur Steuerung der aktivierten Features
   - Integrationsskripte, die die entsprechenden Komponenten laden

2. **Standalone-Module**
   - `/frontend/js/vue/` - Direkt im Browser ausführbare Vue.js-Komponenten
   - `/nscale-vue/src/standalone/` - Eigenständige Vue.js-Module
   - `/api/static/vue/standalone/` - Kopien der Standalone-Module für den Server

3. **DOM-Manipulation**
   - Integration der Vue.js-Komponenten in bestehende DOM-Strukturen
   - Dynamisches Erstellen von Mount-Points

### Wichtige Dokumentationen

- `ADMIN_VUE_INTEGRATION_STATUS.md` - Status der Vue.js-Integration im Admin-Bereich
- `DOKUMENTENKONVERTER_LOESUNG.md` - Dokumentation zur Implementierung des Dokumentenkonverters
- `PROJEKTSTATUS.md` - Aktueller Projektstatus und Roadmap
- `README.md` - Allgemeine Projektinformationen
- `ROADMAP_ROLLEN.md` - Roadmap für die Implementierung verschiedener Benutzerrollen
- `SYSTEM_ARCHITECTURE.md` - Architektur des Gesamtsystems
- `VUE_MIGRATION_DOCS.md` - Dokumentation zur Migration von klassischem zu Vue.js-Frontend
- `VUE_MIGRATION_REPORT.md` - Fortschrittsbericht zur Vue.js-Migration

## Wichtige Pfade für die Vue.js-Integration

### Admin-Komponenten
- Standalone-Module (kompiliert): 
  - `/api/static/vue/standalone/admin-*.js`
  - `/frontend/static/vue/standalone/admin-*.js`
- Standalone-Module (Quellcode): `/nscale-vue/src/standalone/admin-*.js`
- Komponenten-Quellcode: `/nscale-vue/src/components/admin/`
- Integration: `/frontend/js/admin-integration.js`

### Dokumentenkonverter
- Standalone-Module (kompiliert):
  - `/api/static/vue/standalone/doc-converter.js`
  - `/frontend/static/vue/standalone/doc-converter.js`
- Direktzugriff: `/frontend/js/vue/doc-converter.js`
- Standalone-Module (Quellcode): `/nscale-vue/src/standalone/doc-converter.js`
- Komponenten-Quellcode: `/nscale-vue/src/components/doc-converter/`
- Fallback: `/frontend/js/doc-converter-fallback.js`
- Initialisierer: `/frontend/js/vue/doc-converter-initializer.js`

### Chat-Interface
- Standalone-Module (kompiliert):
  - `/api/static/vue/standalone/chat-interface.js`
  - `/frontend/static/vue/standalone/chat-interface.js`
- Direktzugriff: `/frontend/js/vue/chat-interface.js`
- Standalone-Module (Quellcode): `/nscale-vue/src/standalone/chat-interface.js`
- Komponenten-Quellcode: `/nscale-vue/src/components/chat/`
- Integration: `/frontend/js/chat-integration.js`

### Feature-Toggle-Manager
- Standalone-Module (kompiliert):
  - `/api/static/vue/standalone/feature-toggle.js`
  - `/frontend/static/vue/standalone/feature-toggle.js`
- Direktzugriff: `/frontend/js/vue/feature-toggle-manager.js`
- Standalone-Module (Quellcode): `/nscale-vue/src/standalone/feature-toggle.js`
- Komponenten-Quellcode: `/nscale-vue/src/components/admin/features/FeatureToggleManager.vue`

### Deployment-Tools
- Update-Skript: `/opt/nscale-assist/app/update-vue-components.sh`
- Patch-Skript: `/opt/nscale-assist/app/patch-index-html.sh`
- Dokumentation: `/opt/nscale-assist/app/VUE_COMPONENT_DEPLOYMENT.md`