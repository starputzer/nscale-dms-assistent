# Systemarchitektur des nscale DMS Assistent

## Überblick

Der nscale DMS Assistent ist eine moderne, modulare Anwendung für die intelligente Dokumentenverwaltung und -suche. Das System verbindet fortschrittliche Sprachmodelle mit einer effizienten Dokumentenverarbeitung und einer benutzerfreundlichen Oberfläche.

Die Anwendung durchläuft aktuell eine Transformation von einer klassischen HTML/JS-Architektur zu einer modernen Vue.js-basierten Frontend-Architektur, was eine schrittweise Migration und Feature-Toggle-Mechanismen erfordert.

## Systemkomponenten

Das System besteht aus mehreren Hauptkomponenten:

```
+---------------+     +---------------+     +---------------+
| Frontend      |<--->| API-Server    |<--->| RAG-Engine    |
| (Vue.js/HTML) |     | (FastAPI)     |     | (LLama3)      |
+---------------+     +---------------+     +---------------+
                           ^                      ^
                           |                      |
                     +---------------+     +---------------+
                     | Auth-System   |     | Dokument-     |
                     | (JWT)         |     | konverter     |
                     +---------------+     +---------------+
                           ^                      ^
                           |                      |
                     +---------------+     +---------------+
                     | Benutzer-DB   |     | Dokumenten-   |
                     | (SQLite)      |     | Repository    |
                     +---------------+     +---------------+
```

### 1. Frontend

Das Frontend stellt die Benutzeroberfläche bereit und ist derzeit als Hybridsystem implementiert:

- **Klassisches Frontend**: Traditionelle HTML/JS-Implementierung in `/frontend/`
- **Vue.js-Frontend**: Moderne komponentenbasierte Architektur in `/nscale-vue/`
- **Feature-Toggle-System**: Mechanismus zum Wechseln zwischen den Implementierungen

#### Vue.js-Komponenten

- **DocConverter.vue**: Dokumentenkonvertierung
- **ChatView.vue**: Chat-Interface zum LLM
- **SettingsPanel.vue**: Benutzereinstellungen
- **AdminView.vue**: Administrative Funktionen

#### Stores

- **authStore.js**: Authentifizierung und Benutzerinformationen
- **sessionStore.js**: Chat-Sessions und -verlauf
- **docConverterStore.js**: Status der Dokumentenkonvertierung
- **motdStore.js**: System-Nachrichten (Message of the Day)
- **feedbackStore.js**: Feedback-Verwaltung

### 2. API-Server

Der API-Server bildet die Schnittstelle zwischen Frontend und Backend-Diensten:

- **FastAPI**: Moderne, asynchrone Python API-Framework
- **JWT-Authentifizierung**: Sicherer Authentifizierungsmechanismus
- **Rollenbasierte Zugriffssteuerung**: Unterscheidung zwischen Benutzer- und Admin-Funktionen
- **Streaming-Unterstützung**: Echtzeit-Streaming von Antworten für Chat

#### Hauptendpunkte

- **/api/auth/**: Authentifizierung und Benutzerverwaltung
- **/api/chat**: Kommunikation mit dem Sprachmodell
- **/api/sessions/**: Verwaltung von Chat-Sessions
- **/api/admin/**: Administrative Funktionen
- **/api/admin/upload/**: Dokumenten-Upload und -Konvertierung

### 3. RAG-Engine

Die Retrieval Augmented Generation (RAG) Engine verbindet Sprachmodelle mit Dokumentenretrieval:

- **LLama3-Integration**: Lokales Sprachmodell für Antworten
- **Embedding-System**: Vektorisierung von Dokumenten und Abfragen
- **Retrieval-Mechanismus**: Suche relevanter Dokumente für Anfragen
- **Fallback-Strategien**: Alternative Suchmechanismen bei unklaren Anfragen

### 4. Authentifizierungssystem

Das Authentifizierungssystem verwaltet Benutzerkonten und Zugriff:

- **JWT-basierte Authentifizierung**: Sichere Tokens für Benutzeranmeldungen
- **Benutzerrollen**: Unterscheidung zwischen normalen Benutzern und Administratoren
- **Passwort-Hashing**: Sichere Speicherung der Benutzerpasswörter
- **Passwort-Reset-Funktionalität**: Sicherer Mechanismus zum Zurücksetzen von Passwörtern

### 5. Dokumentenkonverter

Der Dokumentenkonverter wandelt verschiedene Dateiformate in durchsuchbaren Text um:

- **Formatunterstützung**: PDF, DOCX, XLSX, PPTX, HTML
- **Konvertierungs-Pipeline**: Mehrstufiger Prozess zur optimalen Extraktion
- **Nachbearbeitung**: Strukturoptimierung und Formatierungsverbesserung
- **Markdown-Ausgabe**: Standardisiertes Format für die Weiterverarbeitung

## Datenfluss

Der typische Datenfluss im System folgt diesem Muster:

1. **Benutzeranmeldung**:
   - Benutzer gibt Anmeldedaten ein
   - API validiert Anmeldedaten und erstellt JWT
   - Token wird im Frontend gespeichert und für Anfragen verwendet

2. **Dokumenten-Upload**:
   - Benutzer lädt Dokument hoch
   - Dokumentenkonverter verarbeitet die Datei
   - Konvertiertes Dokument wird im Repository gespeichert
   - Bestätigungsnachricht wird an Benutzer gesendet

3. **Chat-Interaktion**:
   - Benutzer stellt Frage im Chat
   - Anfrage wird an LLM mit Retrieval-Kontext gesendet
   - Relevante Dokumentenabschnitte werden gesucht
   - LLM generiert Antwort mit Dokumentenkontext
   - Antwort wird gestreamt an Benutzer zurückgegeben

## Datenbanken und Speicher

Das System verwendet verschiedene Speicherlösungen:

1. **SQLite-Datenbank**: 
   - Benutzerkonten und Authentifizierungsdaten
   - Chat-Sitzungen und Nachrichtenverlauf
   - Feedback und Systemeinstellungen

2. **Dateisystem**:
   - Originaldokumente (PDF, DOCX, etc.)
   - Konvertierte Dokumente (Markdown)
   - Konfigurationsdateien und Vorlagen

3. **Vektor-Datenbank**:
   - Dokumenten-Embeddings für semantische Suche
   - Ähnlichkeitsabfragen für RAG-Funktionalität

## Sicherheitskonzept

Die Sicherheit wird auf mehreren Ebenen implementiert:

1. **Authentifizierung**: 
   - JWT-basierte Tokenverwaltung
   - Sichere Passwort-Speicherung mit starkem Hashing
   - Automatischer Token-Ablauf

2. **Autorisierung**:
   - Rollenbasierte Zugriffskontrollen
   - Endpunktspezifische Berechtigungsprüfungen
   - Spezielle Schutzmaßnahmen für Admin-Funktionen

3. **Datensicherheit**:
   - Lokale Verarbeitung aller Daten (keine externen Cloud-Dienste)
   - Sichere Handhabung von Dokumenten
   - Protokollierung sicherheitsrelevanter Ereignisse

## Technologie-Stack

### Backend

- **Python 3.10+**: Hauptprogrammiersprache
- **FastAPI**: API-Framework
- **SQLite**: Datenbankmanagement
- **PyJWT**: JWT-Implementierung
- **LLama3**: Lokales Sprachmodell
- **Verschiedene Dokumentenkonverter-Bibliotheken**:
  - pdfminer.six für PDF
  - python-docx für DOCX
  - openpyxl für XLSX
  - python-pptx für PPTX
  - BeautifulSoup für HTML

### Frontend

- **Vue.js 3**: Frontend-Framework
- **Pinia**: State Management
- **Tailwind CSS**: Styling
- **FontAwesome**: Icons
- **Markdown-it**: Markdown-Rendering
- **Highlight.js**: Syntax-Highlighting

## Konfigurationsmanagement

Die Konfiguration erfolgt über verschiedene Mechanismen:

1. **Umgebungsvariablen**: Servereinstellungen und Zugangsdaten
2. **JSON-Konfigurationsdateien**: Komponentenspezifische Einstellungen
3. **SQLite-Datenbank**: Dynamische Konfigurationen und Benutzereinstellungen
4. **Local Storage (Frontend)**: Benutzerpräferenzen und Feature-Toggles

## Erweiterbarkeit

Das System ist auf Erweiterbarkeit ausgelegt:

1. **Modulare Architektur**: Neue Komponenten können einfach hinzugefügt werden
2. **Klare Schnittstellen**: APIs und Datenaustauschformate sind dokumentiert
3. **Standardisierte Datenmodelle**: Konsistente Strukturen durch Pydantic-Modelle

## Aktuelle Migrationsstrategie

Die Migration von klassischer UI zu Vue.js folgt dieser Strategie:

1. **Komponentenweise Iteration**: Jede Hauptkomponente wird einzeln migriert
2. **Feature-Toggle-System**: Ermöglicht das Umschalten zwischen alten und neuen Implementierungen
3. **Schrittweise Integration**: Neue Komponenten werden nach und nach in die Gesamtarchitektur integriert
4. **Parallelbetrieb**: Beide Implementierungen funktionieren während der Migrationsphase

## Entwicklungs- und Deployment-Prozesse

1. **Entwicklung**:
   - Lokale Entwicklungsumgebung mit Hot-Reload
   - Feature-Branches für neue Funktionalität
   - Manuelle Tests vor dem Commit

2. **Deployment**:
   - Docker-basiertes Deployment
   - Konfiguration über Umgebungsvariablen
   - Datenbankmigration beim Start

---

Aktualisiert: 04.05.2025