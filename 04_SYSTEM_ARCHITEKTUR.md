# Systemarchitektur: nscale DMS Assistent

Dieses Dokument beschreibt die Systemarchitektur des nscale DMS Assistenten und bietet einen detaillierten Überblick über alle Komponenten und deren Interaktionen.

## Übersicht

Der nscale DMS Assistent ist eine interaktive Anwendung, die Benutzern bei der Nutzung der nscale DMS-Software unterstützt. Die Anwendung verwendet einen Retrieval-Augmented Generation (RAG) Ansatz, um Fragen zu beantworten und Unterstützung zu bieten.

## Architekturschichten

Die Anwendung ist in mehrere Schichten unterteilt:

1. **Präsentationsschicht**: Frontend-Komponenten (HTML/CSS/JS, React [geplant])
2. **Anwendungsschicht**: Backend-Server und API-Endpunkte (Python/Flask)
3. **Geschäftslogikschicht**: Kernmodule für Funktionalitäten
4. **Datenzugriffsschicht**: Interaktion mit Datenbanken und externen Diensten

## Frontend-Architektur

### Aktuelle Implementierung

Das Frontend besteht aktuell aus einer klassischen HTML/CSS/JS-Architektur, nachdem die Vue.js-Migration aufgegeben wurde:

```
frontend/
├── css/                # CSS-Stylesheets
├── js/                 # JavaScript-Module
├── static/             # Statische Ressourcen
├── index.html          # Haupt-HTML-Datei
└── [weitere Dateien]   # Weitere Frontend-Assets
```

### Geplante React-Architektur

Die React-Implementierung wird einer modularen Struktur folgen:

```
nscale-react/
├── src/
│   ├── components/     # Wiederverwendbare Komponenten
│   │   ├── admin/      # Admin-spezifische Komponenten
│   │   ├── chat/       # Chat-Interface-Komponenten
│   │   └── common/     # Gemeinsame Basiskomponenten 
│   ├── pages/          # Hauptansichten (Seiten)
│   ├── hooks/          # Benutzerdefinierte React-Hooks
│   ├── context/        # React Context für Zustandsverwaltung
│   └── standalone/     # Standalone-Komponenten zur Integration
└── webpack.config.js   # Webpack-Build-Konfiguration
```

## Backend-Architektur

Das Backend basiert auf Python mit Flask und ist modular aufgebaut:

```
api/
├── server.py           # Hauptserver und API-Endpunkte
└── static/             # Statische Ressourcen für den Server

modules/
├── auth/               # Authentifizierung und Benutzerverwaltung
├── core/               # Kernfunktionalitäten und Konfiguration
├── feedback/           # Feedback-Verwaltung und -Analyse
├── llm/                # Large Language Model Integration
├── rag/                # Retrieval-Augmented Generation Engine
├── retrieval/          # Dokumentensuche und -indizierung
└── session/            # Sitzungs- und Chatverlaufsverwaltung
```

## Dokumentenkonverter-Architektur

Der Dokumentenkonverter ist eine Schlüsselkomponente und verfügt über mehrere Schichten:

```
doc_converter/
├── converters/         # Format-spezifische Konverter
├── data/               # Temporäre Daten und Inventar
├── inventory/          # Inventarmanagement für Dokumente
├── processing/         # Dokumentverarbeitungspipeline
└── utils/              # Hilfsfunktionen und -klassen
```

## Datenfluss

Der typische Datenfluss in der Anwendung folgt diesem Muster:

1. **Benutzeranfrage**: Der Benutzer stellt eine Frage über das Chat-Interface
2. **Anfrageverarbeitung**: Der Server empfängt die Anfrage und leitet sie an die RAG-Engine weiter
3. **Retrieval**: Die RAG-Engine sucht relevante Dokumente in der Wissensbasis
4. **Generation**: Das LLM generiert eine Antwort basierend auf den gefundenen Dokumenten
5. **Antwortübermittlung**: Die Antwort wird an das Frontend zurückgesendet und angezeigt

## Kommunikation zwischen Komponenten

Die Komponenten kommunizieren über folgende Mechanismen:

1. **REST-API**: Frontend und Backend kommunizieren über HTTP/REST
2. **Event-System**: Frontend-Komponenten kommunizieren über ein Event-basiertes System
3. **Zustandsverwaltung**: In der künftigen React-Implementierung wird Redux/Context API verwendet

## Feature-Toggle-System

Das Feature-Toggle-System ermöglicht die kontrollierte Aktivierung neuer Funktionen:

1. **localStorage-basierte Konfiguration**: Benutzereinstellungen werden im localStorage gespeichert
2. **Serverseitige Konfiguration**: Globale Einstellungen in server_config.json
3. **UI-Integration**: Admin-Interface zur Verwaltung der Feature-Toggles

Das System wird für die React-Migration angepasst:

```javascript
// Überprüfung, ob ein Feature aktiviert ist
function isFeatureEnabled(featureName) {
  return localStorage.getItem(`feature_${featureName}`) === 'true';
}

// Aktivierung/Deaktivierung eines Features
function setFeatureEnabled(featureName, enabled) {
  localStorage.setItem(`feature_${featureName}`, enabled ? 'true' : 'false');
}
```

## Sicherheitskonzept

Die Anwendung implementiert folgende Sicherheitsmaßnahmen:

1. **Authentifizierung**: Benutzerauthentifizierung über JWT-Tokens
2. **Autorisierung**: Rollenbasierte Zugriffskontrolle für verschiedene Funktionen
3. **Sichere Content-Verarbeitung**: DOMPurify für die Bereinigung von HTML-Inhalten
4. **Sichere Ressourcenbereitstellung**: Strikte Content-Security-Policy

## Deployment-Architektur

Die Anwendung wird wie folgt bereitgestellt:

1. **Entwicklungsumgebung**: Lokale Entwicklung mit Hot-Reload
2. **Testumgebung**: Interne Testinstanz mit automatisierten Builds
3. **Produktionsumgebung**: Hochverfügbare Bereitstellung mit Lastverteilung

## Schnittstellen zu externen Systemen

Die Anwendung interagiert mit folgenden externen Systemen:

1. **nscale DMS**: Integration mit dem nscale Dokumentenmanagementsystem
2. **LLM-Dienste**: Anbindung an lokale oder cloudbasierte LLM-Dienste (z.B. Ollama)
3. **Embedding-Dienste**: Integration mit Embedding-Modellen (z.B. BAAI/bge-m3)

## Technologiestack

Die Anwendung verwendet folgende Technologien:

1. **Frontend**:
   - HTML5, CSS3, JavaScript (ES6+)
   - Vue.js (aufgegeben)
   - React mit TypeScript (geplant)
   - Redux oder Context API für Zustandsverwaltung (geplant)

2. **Backend**:
   - Python 3.9+
   - Flask für RESTful API
   - JWT für Authentifizierung
   - SQLite/PostgreSQL für Datenspeicherung

3. **AI/ML**:
   - Lokales LLM (Ollama mit Llama3)
   - HuggingFace Embedding-Modelle
   - FAISS für Vektorspeicherung und -suche

4. **Build-Tools**:
   - Webpack/Vite für React-Builds (geplant)
   - Python Virtual Environment

## Probleme der aufgegebenen Vue.js-Migration

Die Vue.js-Migration wurde aufgrund folgender Probleme aufgegeben:

1. **404-Fehler bei statischen Ressourcen**: Trotz verschiedener Lösungsansätze blieben 404-Fehler persistent
2. **DOM-Manipulationskonflikte**: Konflikte zwischen Vue.js-Rendering und direkter DOM-Manipulation
3. **Endlosschleifen**: Rekursive Initialisierungsversuche führten zu Endlosschleifen
4. **Styling-Inkonsistenzen**: Unterschiede im Styling zwischen Vue.js- und HTML/CSS/JS-Implementierungen
5. **Komplexe Fallback-Mechanismen**: Zunehmende Komplexität der Fallback-Logik

Diese Erkenntnisse werden in die React-Migrationsstrategie einbezogen, um ähnliche Probleme zu vermeiden.

## React-Migrationsstrategie

Die Migration zu React wird folgende Hauptprinzipien verfolgen:

1. **Klare Framework-Grenzen**: Strikte Trennung zwischen React und HTML/CSS/JS-Code
2. **Einheitliches Asset-Management**: Konsistente Pfadstrategie mit Webpack
3. **Isolierte Komponenten**: Migration beginnt mit eigenständigen, isolierten Komponenten
4. **Einfache Fallbacks**: Binary Fallback-Strategie statt Mehrfachebenen
5. **Zentrale Zustandsverwaltung**: Klare Zustandsarchitektur mit Redux/Context API

## Skalierbarkeit und Performance

Die Anwendung implementiert folgende Maßnahmen für Skalierbarkeit und Performance:

1. **Optimierte Vektorsuche**: Effiziente Indizierung und Suche mit FAISS
2. **Caching-Mechanismen**: Caching von häufigen Anfragen und Embedding-Vektoren
3. **Lazy-Loading**: Komponenten werden bei Bedarf nachgeladen
4. **Optimierte Assets**: Minifizierung und Bündelung von Frontend-Assets

## Fehlerbehandlung und Robustheit

Die Anwendung implementiert mehrere Ebenen der Fehlerbehandlung:

1. **Mehrschichtige Fallbacks**: Alternative Implementierungen für kritische Komponenten
2. **Diagnose-Tools**: Umfangreiches Logging und Fehlerdiagnose
3. **Automatische Korrektur**: Selbstkorrigierende Mechanismen für häufige Probleme
4. **Graceful Degradation**: Reduzierte Funktionalität statt vollständiger Ausfall

## Erweiterbarkeit

Die Anwendung wurde für einfache Erweiterbarkeit konzipiert:

1. **Modulare Architektur**: Neue Module können einfach hinzugefügt werden
2. **Plugin-System**: Erweiterungspunkte für zusätzliche Funktionalitäten
3. **Standardisierte Schnittstellen**: Klare Vertragsdefinitionen zwischen Komponenten

## Lehren aus der Vue.js-Migration

Die folgenden Lehren aus der gescheiterten Vue.js-Migration sind besonders wichtig:

1. **Framework-Entscheidungen frühzeitig treffen**: Klare Festlegung auf ein primäres UI-Framework
2. **Vermeidung hybrider Ansätze**: Keine Vermischung verschiedener UI-Paradigmen
3. **Simplizität bevorzugen**: Einfachere Architekturen mit weniger Fehleranfälligkeit wählen
4. **Strikte Trennung von Verantwortlichkeiten**: Klare Grenzen zwischen Komponenten definieren
5. **Umfassende Tests**: Frühzeitig umfassende Tests implementieren

Diese Lehren werden die Grundlage für eine erfolgreiche React-Migration bilden.

---

Zuletzt aktualisiert: 05.05.2025