# nscale DMS Assistent

Ein RAG-basierter Assistent für die nscale DMS-Software.

## Übersicht

Dieses Projekt implementiert einen interaktiven Assistenten für die nscale DMS-Software. Es verwendet einen Retrieval-Augmented Generation (RAG) Ansatz, um Fragen zu beantworten und Unterstützung bei der Nutzung der Software zu bieten.

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
