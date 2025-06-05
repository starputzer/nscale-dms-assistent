# RAG-Optimierung Integrationsleitfaden

## Übersicht

Dieser Leitfaden beschreibt die schrittweise Integration der optimierten RAG-Engine in das bestehende nscale-assist System. Die Integration erfolgt in mehreren Phasen, um Risiken zu minimieren und eine reibungslose Migration zu gewährleisten.

## Voraussetzungen

### 1. Abhängigkeiten installieren

```bash
# Füge neue Dependencies zu requirements.txt hinzu
cat requirements_rag_optimization.txt >> requirements.txt

# Installiere alle Dependencies
pip install -r requirements.txt

# Installiere Spacy-Modelle
python -m spacy download de_core_news_md
python -m spacy download de_core_news_lg  # Optional für bessere Qualität
```

### 2. Redis-Setup (für Caching)

```bash
# Installation (Ubuntu/Debian)
sudo apt-get install redis-server

# Start Redis
sudo systemctl start redis
sudo systemctl enable redis

# Teste Verbindung
redis-cli ping  # Sollte "PONG" zurückgeben
```

### 3. Verzeichnisstruktur vorbereiten

```bash
# Erstelle notwendige Verzeichnisse
mkdir -p data/raw_docs
mkdir -p data/converted
mkdir -p cache/embeddings
mkdir -p cache/document_index
mkdir -p logs/rag_optimization
```

## Phase 1: Parallelbetrieb einrichten

### 1.1 Feature-Toggle implementieren

Erstelle eine Umgebungsvariable für die Aktivierung:

```python
# In app/modules/core/config.py
class Config:
    # ... existing code ...
    
    # RAG Optimization Feature Toggle
    USE_OPTIMIZED_RAG = os.getenv('USE_OPTIMIZED_RAG', 'false').lower() == 'true'
    RAG_OPTIMIZATION_MODE = os.getenv('RAG_OPTIMIZATION_MODE', 'shadow')  # shadow, canary, full
```

### 1.2 RAG Factory erstellen

```python
# Neue Datei: app/modules/rag/rag_factory.py
from typing import Union
from ..core.config import Config
from .engine import RAGEngine
from .optimized_rag_engine import OptimizedRAGEngine
from .rag_optimizer_config import get_balanced_config

class RAGFactory:
    @staticmethod
    def get_engine() -> Union[RAGEngine, OptimizedRAGEngine]:
        """Gibt die konfigurierte RAG-Engine zurück"""
        if Config.USE_OPTIMIZED_RAG:
            config = get_balanced_config()
            return OptimizedRAGEngine(config)
        else:
            return RAGEngine()
```

### 1.3 API-Endpunkt anpassen

```python
# In app/api/server.py - Modifiziere den Stream-Endpoint
from modules.rag.rag_factory import RAGFactory

@app.post("/api/v1/question/stream")
async def stream_question(request: QuestionRequest):
    # Verwende Factory statt direkter Instanziierung
    rag_engine = RAGFactory.get_engine()
    
    if not await rag_engine.initialize():
        return JSONResponse(
            status_code=500,
            content={"error": "RAG engine initialization failed"}
        )
    
    # Rest des Codes bleibt gleich
    return EventSourceResponse(
        rag_engine.stream_answer_chunks(
            request.question,
            session_id=request.session_id,
            use_simple_language=request.use_simple_language
        )
    )
```

## Phase 2: Shadow Mode (Empfohlen für Start)

Im Shadow Mode läuft die optimierte Engine parallel zur aktuellen, ohne die Nutzer zu beeinflussen.

### 2.1 Shadow Mode Wrapper

```python
# Neue Datei: app/modules/rag/shadow_mode_engine.py
import asyncio
import logging
from typing import AsyncGenerator, Dict, Any

logger = logging.getLogger(__name__)

class ShadowModeEngine:
    def __init__(self):
        self.current_engine = RAGEngine()
        self.optimized_engine = OptimizedRAGEngine(get_balanced_config())
        self.comparison_logger = logging.getLogger('rag.shadow.comparison')
    
    async def initialize(self) -> bool:
        # Initialisiere beide Engines
        current_init = await self.current_engine.initialize()
        optimized_init = await self.optimized_engine.initialize()
        return current_init  # Nutze aktuelle Engine als Primary
    
    async def stream_answer_chunks(self, *args, **kwargs) -> AsyncGenerator[str, None]:
        # Starte optimierte Engine im Hintergrund
        asyncio.create_task(
            self._run_optimized_comparison(*args, **kwargs)
        )
        
        # Streame von aktueller Engine
        async for chunk in self.current_engine.stream_answer_chunks(*args, **kwargs):
            yield chunk
    
    async def _run_optimized_comparison(self, *args, **kwargs):
        """Führt optimierte Engine im Hintergrund aus und loggt Vergleich"""
        try:
            import time
            start_time = time.time()
            
            chunks = []
            async for chunk in self.optimized_engine.stream_answer(*args, **kwargs):
                chunks.append(chunk)
            
            duration = time.time() - start_time
            
            self.comparison_logger.info({
                'query': args[0] if args else kwargs.get('question'),
                'optimized_duration': duration,
                'optimized_chunks': len(chunks),
                'mode': 'shadow'
            })
        except Exception as e:
            self.comparison_logger.error(f"Shadow mode error: {e}")
```

### 2.2 Shadow Mode aktivieren

```bash
# Setze Umgebungsvariablen
export USE_OPTIMIZED_RAG=true
export RAG_OPTIMIZATION_MODE=shadow

# Starte Server
python app/api/server.py
```

## Phase 3: Canary Deployment

Nach erfolgreichen Shadow-Tests, aktiviere die optimierte Engine für einen kleinen Prozentsatz der Anfragen.

### 3.1 Canary Engine

```python
# Erweitere app/modules/rag/rag_factory.py
import random

class CanaryEngine:
    def __init__(self, canary_percentage: int = 10):
        self.current_engine = RAGEngine()
        self.optimized_engine = OptimizedRAGEngine(get_balanced_config())
        self.canary_percentage = canary_percentage
    
    async def initialize(self) -> bool:
        current_init = await self.current_engine.initialize()
        optimized_init = await self.optimized_engine.initialize()
        return current_init and optimized_init
    
    def _should_use_optimized(self) -> bool:
        return random.randint(1, 100) <= self.canary_percentage
    
    async def stream_answer_chunks(self, *args, **kwargs) -> AsyncGenerator[str, None]:
        if self._should_use_optimized():
            logger.info("Using optimized engine (canary)")
            engine = self.optimized_engine
        else:
            engine = self.current_engine
        
        async for chunk in engine.stream_answer_chunks(*args, **kwargs):
            yield chunk
```

### 3.2 Canary-Konfiguration

```bash
# 10% Traffic auf optimierte Engine
export RAG_OPTIMIZATION_MODE=canary
export CANARY_PERCENTAGE=10

# Schrittweise erhöhen
export CANARY_PERCENTAGE=25  # Nach erfolgreichem Test
export CANARY_PERCENTAGE=50  # Weiter erhöhen
export CANARY_PERCENTAGE=100 # Vollständige Migration
```

## Phase 4: Vollständige Migration

### 4.1 Performance-Monitoring einrichten

```python
# monitoring/rag_metrics.py
import prometheus_client
from prometheus_client import Counter, Histogram, Gauge

# Metriken definieren
rag_requests = Counter('rag_requests_total', 'Total RAG requests', ['engine_type'])
rag_latency = Histogram('rag_latency_seconds', 'RAG request latency', ['engine_type'])
rag_accuracy = Gauge('rag_accuracy_score', 'RAG accuracy score', ['engine_type'])
rag_cache_hits = Counter('rag_cache_hits_total', 'RAG cache hits')
```

### 4.2 Daten migrieren

```bash
# 1. Erstelle Backup der aktuellen Embeddings
cp -r data/embeddings data/embeddings.backup

# 2. Konvertiere und reindexiere Dokumente
python -m app.modules.rag.migrate_documents

# 3. Baue optimierten Index auf
python -m app.modules.rag.build_optimized_index
```

### 4.3 Vollständige Aktivierung

```bash
# Aktiviere optimierte Engine vollständig
export USE_OPTIMIZED_RAG=true
export RAG_OPTIMIZATION_MODE=full

# Optional: Deaktiviere alte Engine
export DISABLE_LEGACY_RAG=true
```

## Phase 5: Rollback-Prozedur

Falls Probleme auftreten, kann schnell zur alten Engine zurückgekehrt werden.

### 5.1 Sofort-Rollback

```bash
# Deaktiviere optimierte Engine
export USE_OPTIMIZED_RAG=false

# Restart Server
sudo systemctl restart nscale-assist
```

### 5.2 Daten-Rollback

```bash
# Stelle Backup wieder her
mv data/embeddings data/embeddings.optimized
mv data/embeddings.backup data/embeddings

# Cache leeren
redis-cli FLUSHDB
```

## Monitoring und Validierung

### Wichtige Metriken

1. **Performance**
   - Response Time (Ziel: < 1.5s)
   - Tokens per Second (Ziel: > 50)
   - Cache Hit Rate (Ziel: > 60%)

2. **Qualität**
   - Retrieval Accuracy (Ziel: > 90%)
   - User Feedback Score
   - Relevance Score

3. **System**
   - Memory Usage
   - CPU/GPU Utilization
   - Redis Memory Usage

### Monitoring-Dashboard

```python
# monitoring/rag_dashboard.py
from flask import Flask, jsonify
import psutil

app = Flask(__name__)

@app.route('/metrics/rag')
def rag_metrics():
    engine = RAGFactory.get_engine()
    stats = engine.get_performance_stats()
    
    return jsonify({
        'performance': stats['performance'],
        'cache': stats['cache'],
        'system': {
            'memory_percent': psutil.virtual_memory().percent,
            'cpu_percent': psutil.cpu_percent(interval=1)
        }
    })
```

## Troubleshooting

### Häufige Probleme

1. **Redis-Verbindungsfehler**
   ```bash
   # Prüfe Redis-Status
   sudo systemctl status redis
   redis-cli ping
   ```

2. **Speicherprobleme**
   ```bash
   # Erhöhe Swap
   sudo fallocate -l 4G /swapfile
   sudo chmod 600 /swapfile
   sudo mkswap /swapfile
   sudo swapon /swapfile
   ```

3. **Langsame Initialisierung**
   ```python
   # Nutze kleineres Modell für Tests
   config.embedding.model_name = "paraphrase-multilingual-MiniLM-L12-v2"
   ```

4. **Qualitätsprobleme**
   ```python
   # Erhöhe Reranking-Kandidaten
   config.retrieval.rerank_top_k = 20
   config.retrieval.final_top_k = 7
   ```

## Best Practices

1. **Schrittweise Migration**: Beginne immer mit Shadow Mode
2. **Monitoring**: Überwache alle Metriken während der Migration
3. **Backup**: Erstelle Backups vor jeder Änderung
4. **Testing**: Führe Lasttests vor Production-Deployment durch
5. **Dokumentation**: Dokumentiere alle Konfigurationsänderungen

## Nächste Schritte

1. Installiere Dependencies
2. Aktiviere Shadow Mode
3. Sammle Metriken für 1-2 Wochen
4. Analysiere Performance-Vergleich
5. Beginne mit Canary Deployment
6. Schrittweise Erhöhung des Canary-Prozentsatzes
7. Vollständige Migration nach erfolgreichen Tests