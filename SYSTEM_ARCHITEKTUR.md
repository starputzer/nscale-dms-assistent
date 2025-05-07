# Systemarchitektur: nscale DMS Assistent

Dieses Dokument beschreibt die Systemarchitektur des nscale DMS Assistenten und bietet einen detaillierten Überblick über alle Komponenten und deren Interaktionen.

## Übersicht

Der nscale DMS Assistent ist eine interaktive Anwendung, die Benutzern bei der Nutzung der nscale DMS-Software unterstützt. Die Anwendung verwendet einen Retrieval-Augmented Generation (RAG) Ansatz, um Fragen zu beantworten und Unterstützung zu bieten.

## Architekturschichten

Die Anwendung ist in mehrere Schichten unterteilt:

1. **Präsentationsschicht**: Frontend-Komponenten (modulares Vanilla JavaScript mit ES6-Modulen)
2. **Anwendungsschicht**: Backend-Server und API-Endpunkte (Python/Flask)
3. **Geschäftslogikschicht**: Kernmodule für Funktionalitäten
4. **Datenzugriffsschicht**: Interaktion mit Datenbanken und externen Diensten

## Frontend-Architektur

### Aktuelle Implementierung

Das Frontend besteht aktuell aus einer modernen Vanilla-JavaScript-Architektur mit ES6-Modulen:

```
shared/
├── js/                 # Zentrale JavaScript-Module
│   ├── modernized-app.js  # Haupt-Einstiegspunkt
│   ├── chat.js         # Chat-Funktionalität
│   ├── admin.js        # Admin-Panel-Funktionalität
│   └── [weitere Module]
├── css/                # Zentrale CSS-Stylesheets
└── images/             # Zentrale Bild-Ressourcen

frontend/               # Symlinks zu shared/ (für Kompatibilität)
static/                 # Symlinks zu shared/ (für Kompatibilität)
```

Die Dateien in `/shared/` werden durch Symlinks in `/frontend/` und `/static/` verfügbar gemacht, um Kompatibilität mit bestehenden Pfaden zu gewährleisten.

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
3. **Zustandsverwaltung**: Zentraler Anwendungszustand für alle Module

## Feature-Toggle-System

Das Feature-Toggle-System ermöglicht die kontrollierte Aktivierung neuer Funktionen:

1. **localStorage-basierte Konfiguration**: Benutzereinstellungen werden im localStorage gespeichert
2. **Serverseitige Konfiguration**: Globale Einstellungen in server_config.json
3. **UI-Integration**: Admin-Interface zur Verwaltung der Feature-Toggles

Das System für modulare Feature-Aktivierung:

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

1. **Entwicklungsumgebung**: Lokale Entwicklung
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
   - Modulares Vanilla JavaScript mit ES6-Modulen
   - Zentrales objektorientiertes State-Management

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
   - Python Virtual Environment

## Skalierbarkeit und Performance

Die Anwendung implementiert folgende Maßnahmen für Skalierbarkeit und Performance:

1. **Optimierte Vektorsuche**: Effiziente Indizierung und Suche mit FAISS
2. **Caching-Mechanismen**: Caching von häufigen Anfragen und Embedding-Vektoren
3. **Lazy-Loading**: Module werden bei Bedarf nachgeladen
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

## Lehren aus der Framework-Migration

Die folgenden Lehren aus der Entfernung von UI-Frameworks sind besonders wichtig:

1. **Framework-Entscheidungen frühzeitig treffen**: Klare Festlegung auf einen Technologie-Ansatz
2. **Vermeidung hybrider Ansätze**: Keine Vermischung verschiedener UI-Paradigmen
3. **Simplizität bevorzugen**: Einfachere Architekturen mit weniger Fehleranfälligkeit wählen
4. **Strikte Trennung von Verantwortlichkeiten**: Klare Grenzen zwischen Komponenten definieren
5. **Umfassende Tests**: Frühzeitig umfassende Tests implementieren

Diese Lehren werden die Grundlage für die zukünftige Weiterentwicklung des Systems bilden.

---

Zuletzt aktualisiert: 05.05.2025