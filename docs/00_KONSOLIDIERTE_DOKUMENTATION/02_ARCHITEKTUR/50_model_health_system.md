---
title: "Model Health Check System"
version: "1.0.0"
date: "07.06.2025"
lastUpdate: "07.06.2025"
author: "Claude AI"
status: "Neu"
priority: "Hoch"
category: "Architektur"
tags: ["Monitoring", "AI Models", "Health Checks", "Performance", "System Monitoring"]
---

# Model Health Check System

> **Version:** 1.0.0 | **Status:** Production Ready | **Einführung:** 07.06.2025

## Übersicht

Das Model Health Check System ist ein umfassendes Überwachungssystem für alle KI-Modelle im nscale Assist. Es bietet Echtzeit-Überwachung, Leistungsmetriken und automatische Wiederherstellung für:

- **Embedding-Modelle** (BAAI/bge-m3, paraphrase-MiniLM-L3-v2)
- **Reranker-Modell** (cross-encoder/ms-marco-MiniLM-L-6-v2)
- **LLM** (Ollama-basierte Modelle)

## Architektur

### Komponenten

```
modules/monitoring/
├── model_health.py      # Kern-Health-Check-Logik
├── health_routes.py     # FastAPI-Endpoints
└── __init__.py         # Modul-Integration
```

### Hauptklassen

#### ModelHealthChecker
Die zentrale Klasse für Model Health Monitoring:

```python
class ModelHealthChecker:
    - check_all_models()      # Prüft alle Modelle
    - check_specific_model()  # Prüft ein spezifisches Modell
    - test_model_with_data()  # Testet Modell mit benutzerdefinierten Daten
    - download_missing_models() # Lädt fehlende Modelle herunter
    - cleanup_model_cache()   # Bereinigt Model-Cache
```

### Caching-Strategie

- **TTL-Cache**: 60 Sekunden für Health-Check-Ergebnisse
- **Thread-Safe**: Verwendung von Threading-Locks
- **Lazy Loading**: Modelle werden bei Bedarf geladen

## API-Endpoints

### 1. GET /api/health/models
Umfassender Health-Check aller Modelle.

**Response:**
```json
{
  "timestamp": "2025-06-07T10:30:00",
  "overall_status": "healthy|warning|critical",
  "models": {
    "embedding_primary": {
      "status": "healthy",
      "loaded": true,
      "device": "cuda",
      "memory_usage_mb": 1500,
      "response_time_ms": 85
    }
  },
  "system": {
    "cpu": {...},
    "memory": {...},
    "gpu": {...}
  },
  "issues": [],
  "recommendations": []
}
```

### 2. GET /api/health/models/{model_id}
Health-Check für ein spezifisches Modell.

**Verfügbare model_id Werte:**
- `embedding_primary`: Haupt-Embedding-Modell (BAAI/bge-m3)
- `embedding_fallback`: Fallback-Embedding-Modell
- `reranker`: Cross-Encoder Reranking-Modell
- `llm`: Ollama Sprachmodell

### 3. POST /api/health/models/test
Testet ein Modell mit benutzerdefinierten Daten.

**Request Body:**
```json
{
  "model_id": "embedding_primary",
  "test_data": {
    "texts": ["Test 1", "Test 2"]  // Für Embedding-Modelle
    // ODER
    "pairs": [["Query", "Document"]]  // Für Reranker
    // ODER
    "prompt": "Test prompt"  // Für LLM
  }
}
```

### 4. GET /api/health/system
Erweiterte System-Health mit Modell-Status.

### 5. POST /api/health/models/download
Lädt fehlende Modelle automatisch herunter.

### 6. POST /api/health/models/cleanup
Bereinigt Model-Cache und gibt Speicher frei.

## Modell-Konfigurationen

### Embedding-Modelle

```python
"embedding_primary": {
    "name": "BAAI/bge-m3",
    "type": "embedding",
    "expected_dim": 1024,
    "min_memory_mb": 1500
}

"embedding_fallback": {
    "name": "paraphrase-MiniLM-L3-v2",
    "type": "embedding",
    "expected_dim": 384,
    "min_memory_mb": 500
}
```

### Reranker-Modell

```python
"reranker": {
    "name": "cross-encoder/ms-marco-MiniLM-L-6-v2",
    "type": "cross-encoder",
    "min_memory_mb": 800
}
```

### LLM (Ollama)

```python
"llm": {
    "name": Config.MODEL_NAME,
    "type": "ollama",
    "url": Config.OLLAMA_URL,
    "min_memory_mb": 4000
}
```

## Health Status Codes

- **healthy**: Modell funktioniert optimal
- **warning**: Leistungseinbußen oder hohe Ressourcennutzung
- **error**: Modell hat Fehler oder ist nicht erreichbar
- **critical**: Schwerwiegende Systemprobleme
- **not_loaded**: Modell ist nicht im Speicher geladen

## Automatische Empfehlungen

Das System generiert automatisch Empfehlungen basierend auf:

1. **Speichernutzung**: Warnung bei >85% RAM oder >90% GPU-Speicher
2. **Fehlende Modelle**: Anweisungen zum Download/Installation
3. **Performance**: Empfehlungen bei hohen Antwortzeiten
4. **Ollama-Status**: Hinweise zum Starten des Ollama-Servers

## Test-Tools

### Python Test-Script
```bash
cd /opt/nscale-assist/app
python test_model_health.py
```

### Web-Dashboard
```
http://localhost:5173/test-model-health.html
```

Features:
- Echtzeit-Modellstatus
- System-Ressourcen-Überwachung
- Modell-Tests mit benutzerdefinierten Daten
- Cache-Bereinigung

## Performance-Überlegungen

### Optimale Batch-Größen
Das System berechnet automatisch optimale Batch-Größen basierend auf:
- **GPU**: 10-100 Chunks (basierend auf verfügbarem VRAM)
- **CPU**: 20-200 Chunks (basierend auf verfügbarem RAM)

### Speicherverwaltung
- Automatische Garbage Collection nach Modell-Operationen
- GPU-Cache-Bereinigung bei CUDA-Geräten
- Lazy Loading zur Minimierung des Speicherverbrauchs

## Integration mit bestehendem System

Das Health Check System ist nahtlos integriert:

1. **Monitoring-Modul**: Erweitert das bestehende System-Monitoring
2. **Admin-Panel**: Kann in AdminSystemMonitor Tab integriert werden
3. **RAG-System**: Überwacht die für RAG verwendeten Modelle
4. **Performance-Monitoring**: Liefert Metriken für das Performance-Dashboard

## Sicherheit

- Alle Endpoints erfordern Admin-Authentifizierung
- JWT-basierte Zugriffskontrolle
- Keine sensiblen Daten in Health-Responses

## Zukünftige Erweiterungen

1. **Historische Metriken**: Speicherung von Health-Daten über Zeit
2. **Alerting**: Automatische Benachrichtigungen bei Problemen
3. **Auto-Recovery**: Automatisches Neuladen von Modellen bei Fehlern
4. **Grafana-Integration**: Export von Metriken für externe Dashboards

## Troubleshooting

### Häufige Probleme

1. **"Model not loaded"**
   - Lösung: Modell wird beim ersten Zugriff automatisch geladen
   - Alternative: POST /api/health/models/download

2. **"Ollama server not running"**
   - Lösung: `ollama serve` ausführen
   - Prüfen: Port 11434 muss erreichbar sein

3. **"High memory usage"**
   - Lösung: Cache bereinigen mit POST /api/health/models/cleanup
   - Alternative: Kleinere Modelle verwenden (Fallback)

4. **"CUDA out of memory"**
   - Lösung: GPU-Cache leeren
   - Alternative: CPU-Modus verwenden

## Best Practices

1. **Regelmäßige Health Checks**: Alle 5 Minuten für Produktivsysteme
2. **Cache-Nutzung**: Force-Parameter nur bei Bedarf verwenden
3. **Resource Monitoring**: GPU/CPU-Auslastung im Auge behalten
4. **Modell-Warmup**: Nach Server-Start einmal alle Modelle laden

---

*Letzte Aktualisierung: 07.06.2025 | Version: 1.0.0 | Status: Production Ready*