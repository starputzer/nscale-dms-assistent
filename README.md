# nscale DMS Assistent

Ein RAG-basierter Assistent für die nscale DMS-Software.

## Übersicht

Dieses Projekt implementiert einen interaktiven Assistenten für die nscale DMS-Software. Es verwendet einen Retrieval-Augmented Generation (RAG) Ansatz, um Fragen zu beantworten und Unterstützung bei der Nutzung der Software zu bieten.

## Installation

1. Repository klonen  
2. Abhängigkeiten installieren: `pip install -r requirements.txt`  
3. Dokumentenkonverter-Abhängigkeiten: `pip install -r requirements-converter.txt`
4. Ollama installieren: `curl -fsSL https://ollama.com/install.sh | sh`  
5. Modell herunterladen: `ollama pull llama3:8b-instruct-q4_1`  

Das Projekt nutzt außerdem das deutschsprachige Embedding-Modell `BAAI/bge-m3` von HuggingFace. Dieses wird beim ersten Start automatisch heruntergeladen.

## Konfiguration

Die Konfiguration erfolgt über Umgebungsvariablen oder die `Config`-Klasse im `modules/core/config.py` Modul.

## Starten des Servers

```bash
python api/server.py
```

## Dokumentation

Die Projekt-Dokumentation ist in mehrere Bereiche unterteilt:

1. [Projektübersicht](01_PROJEKT_OVERVIEW.md) - Allgemeine Architektur und Systemkomponenten
2. [Dokumentenkonverter](02_DOKUMENTENKONVERTER.md) - Detaillierte Dokumentation des Dokumentenkonverters
3. [Vue.js Migration](03_VUE_MIGRATION.md) - Status und Strategie der Vue.js Migration
4. [Fehlerbehebung](04_FEHLERBEHEBUNG.md) - Häufige Probleme und deren Lösungen
5. [Entwicklungsanleitung](05_ENTWICKLUNGSANLEITUNG.md) - Anleitung für Entwickler

## Architektur

Die Anwendung besteht aus folgenden Hauptkomponenten:

- **Frontend**: Vue.js-basierte Benutzeroberfläche mit progressive Enhancement
- **API-Server**: Python-Backend mit Flask
- **RAG-Engine**: Retrieval-Augmented Generation für Antworten
- **Dokumentenkonverter**: Konvertiert verschiedene Dokumentformate für das RAG-System

## Feature-Toggle-System

Die Anwendung verwendet ein Feature-Toggle-System zur kontrollierten Aktivierung neuer Komponenten. Über das localStorage können verschiedene Features aktiviert oder deaktiviert werden:

```javascript
// Vue.js-Komponenten aktivieren
localStorage.setItem('feature_vueDocConverter', 'true');
localStorage.setItem('feature_vueAdmin', 'true');
```

Ein vollständiger Reset ist über den Link in der rechten oberen Ecke der Anwendung möglich.