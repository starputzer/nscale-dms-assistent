# nscale DMS Assistent

Ein RAG-basierter Assistent für die nscale DMS-Software mit Vue 3 Single File Components Frontend.

## Übersicht

Dieses Projekt implementiert einen interaktiven Assistenten für die nscale DMS-Software. Es verwendet einen Retrieval-Augmented Generation (RAG) Ansatz, um Fragen zu beantworten und Unterstützung bei der Nutzung der Software zu bieten. Das Frontend basiert auf Vue 3 mit TypeScript und Single File Components (SFC).

## Installation

1. Repository klonen  
2. Abhängigkeiten installieren: `pip install -r requirements.txt`  
3. Ollama installieren: `curl -fsSL https://ollama.com/install.sh | sh`  
4. Modell herunterladen: `ollama pull llama3:8b-instruct-q4_1`  

Das Projekt nutzt außerdem das deutschsprachige Embedding-Modell `BAAI/bge-m3` von HuggingFace. Dieses wird beim ersten Start automatisch heruntergeladen.

## Konfiguration

Die Konfiguration erfolgt über Umgebungsvariablen oder die `Config`-Klasse im `modules/core/config.py` Modul.

## Starten des Servers

```bash
python api/server.py
```

## Frontend-Entwicklung mit Vue 3 SFC

Das Frontend verwendet Vue 3 mit TypeScript und Single File Components (SFC). Wir nutzen Vite als Build-Tool und Entwicklungsserver.

### Abhängigkeiten installieren

```bash
npm install
```

### Entwicklungsserver starten

```bash
npm run dev
```

### Produktion-Build erstellen

```bash
npm run build
```

### Typenprüfung durchführen

```bash
npm run typecheck
```

### Code formatieren

```bash
npm run format
```

## Vue 3 SFC-Architektur

Das Frontend verwendet folgende Hauptkomponenten:

- **Pinia Stores**: Zentrale Zustandsverwaltung
- **Vue 3 Composables**: Wiederverwendbare Logik
- **Vue 3 SFC-Komponenten**: UI-Komponenten mit Template, Script und Style in einer Datei
- **TypeScript**: Typsicherheit für verbesserte Codequalität

---

Zuletzt aktualisiert: 08.05.2025
