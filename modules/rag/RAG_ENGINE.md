# RAG-Engine

## Übersicht

Die RAG-Engine (Retrieval Augmented Generation) ist das Herzstück des nscale DMS Assistent und verbindet lokale Sprachmodelle mit einem intelligenten Dokumentenretrieval-System. Diese Komponente ermöglicht es dem System, Benutzeranfragen zu kontextualisieren, indem sie relevante Dokumente und Informationen aus der Dokumentensammlung identifiziert und in die Antwortgenerierung einbezieht.

## Architektur

Die RAG-Engine besteht aus mehreren zusammenwirkenden Komponenten:

```
+---------------+     +---------------+     +---------------+
| LLM-Client    |<--->| RAG-Engine    |<--->| Fallback      |
| (Ollama)      |     | (Core)        |     | Search        |
+---------------+     +---------------+     +---------------+
                            ^  ^
                            |  |
                  +---------+  +---------+
                  |                      |
          +---------------+     +---------------+
          | Document      |     | Embedding     |
          | Store         |     | Manager       |
          +---------------+     +---------------+
```

### Hauptkomponenten

1. **RAG-Engine (Core)**
   - Zentrale Steuerungseinheit für den RAG-Prozess
   - Koordiniert die Zusammenarbeit zwischen LLM, Retrieval und Dokumentenverarbeitung
   - Implementiert Streaming-Funktionalität für Echtzeit-Antworten
   - Intelligent Thread-Management für parallele Verarbeitung

2. **LLM-Client (OllamaClient)**
   - Schnittstelle zum lokalen Sprachmodell (LLama3)
   - Verarbeitet Prompts und generiert Antworten
   - Unterstützt Streaming-Ausgabe für Echtzeit-Interaktion
   - Optimiert für lokale Ausführung ohne externe APIs

3. **Document Store**
   - Verwaltet die Dokumente und ihre Metadaten
   - Lädt und indexiert Dokumente aus dem Dateisystem
   - Bietet Schnittstellen für die Abfrage von Dokumenteninhalten

4. **Embedding Manager**
   - Erstellt Vektorrepräsentationen von Texten
   - Unterstützt semantische Ähnlichkeitssuche
   - Implementiert effiziente Ähnlichkeitsberechnungen
   - Verwaltet Embedding-Cache für verbesserte Leistung

5. **Fallback Search**
   - Alternative Suchmethoden, wenn die semantische Suche keine zufriedenstellenden Ergebnisse liefert
   - Implementiert Schlüsselwort- und reguläre Ausdrucksuche
   - Ermöglicht hybride Suchansätze für maximale Abdeckung

## Prozessablauf

Die RAG-Engine arbeitet in folgenden Schritten:

1. **Anfrage-Analyse**
   - Benutzeranfrage wird analysiert und in Embedding umgewandelt
   - Themenerkennung und Schlüsselwort-Extraktion

2. **Dokumenten-Retrieval**
   - Semantische Suche nach relevanten Dokumenten
   - Berechnung der Ähnlichkeitsscores zwischen Anfrage und Dokumenten
   - Auswahl der besten Übereinstimmungen

3. **Kontext-Aufbereitung**
   - Zusammenstellung der relevanten Dokumentenabschnitte
   - Formatierung für optimale LLM-Verarbeitung
   - Priorisierung basierend auf Relevanzscores

4. **Prompt-Erstellung**
   - Erstellen eines strukturierten Prompts mit Benutzeranfrage und Dokumentenkontext
   - Anweisungen für das LLM zur Antwortgenerierung
   - Richtlinien zur Korrekten Quellenverwendung

5. **Antwortgenerierung**
   - Übergabe des Prompts an das LLM
   - Echtzeit-Streaming der Antwort während der Generierung
   - Quellenrückverfolgung und Zitierung

## Hauptmerkmale

### 1. Asynchrone Verarbeitung

Die RAG-Engine nutzt Pythons asynchrone Funktionalität für parallele Verarbeitung:

```python
async def generate_answer(self, query: str, session_id: Optional[int] = None, 
                         stream: bool = False) -> Dict[str, Any]:
    """Generiert eine Antwort basierend auf einer Anfrage mit RAG"""
    # Asynchrone Verarbeitung der Anfrage
    # ...
```

### 2. Streaming-Unterstützung

Echtzeit-Antworten werden über Server-Sent Events (SSE) gestreamt:

```python
async def stream_response(self, query: str, session_id: Optional[int] = None) -> AsyncGenerator[str, None]:
    """Streamt die Antwort auf eine Anfrage in Echtzeit"""
    # Stream-ID generieren und verwalten
    # ...
    try:
        async for token in self.ollama_client.generate_stream(prompt, model_name):
            yield token
    except Exception as e:
        logger.error(f"Fehler beim Streaming: {e}")
        yield json.dumps({"error": str(e)})
```

### 3. Hardware-Optimierung

Die Engine erkennt und nutzt automatisch verfügbare Hardware-Beschleunigung:

```python
# Erkenne CUDA-Unterstützung
if torch.cuda.is_available():
    self.device = "cuda"
    self.torch_dtype = torch.float16
    logger.info("🚀 CUDA ist verfügbar – GPU wird verwendet.")
else:
    self.device = "cpu"
    self.torch_dtype = torch.float32
    logger.warning("⚠️ CUDA nicht verfügbar – es wird die CPU verwendet.")
```

### 4. Kontextualisierte Antworten

Antworten werden mit Quellenangaben und Dokumentenreferenzen angereichert:

```python
# Beispiel für eine Antwort mit Quellenangaben
response = {
    "answer": "Die nscale Dokumentenverwaltung unterstützt...",
    "sources": [
        {"document": "nscale_handbuch.pdf", "page": 42, "relevance": 0.92},
        {"document": "technische_spezifikation.docx", "section": "3.1", "relevance": 0.85}
    ],
    "processing_time": 1.23
}
```

### 5. Fallback-Strategien

Bei unzureichenden Ergebnissen werden alternative Suchmethoden aktiviert:

```python
# Wenn semantische Suche nicht genügend Ergebnisse liefert
if len(results) < min_results:
    logger.info(f"Zu wenige Ergebnisse ({len(results)}), verwende Fallback-Suche")
    fallback_results = self.fallback_search.keyword_search(query, top_k=min_results)
    results.extend(fallback_results)
```

## Prompt-Gestaltung

Die RAG-Engine verwendet sorgfältig gestaltete Prompts für optimale Antworten:

```
# Beispiel für einen RAG-Prompt

Sie sind ein Assistent für das nscale DMS-System. 
Beantworten Sie die folgende Frage basierend auf den bereitgestellten Dokumenten.
Wenn Sie die Antwort nicht in den Dokumenten finden, sagen Sie ehrlich, dass Sie es nicht wissen.

FRAGE: {query}

KONTEXT:
{context}

Verwenden Sie die Quellen in Ihrer Antwort und geben Sie die entsprechenden Referenzen an.
```

## Konfiguration

Die Engine ist über verschiedene Parameter konfigurierbar:

| Parameter | Beschreibung | Standardwert |
|-----------|--------------|--------------|
| `max_context_length` | Maximale Länge des Kontexts für das LLM | 4000 |
| `similarity_threshold` | Mindest-Ähnlichkeitsschwelle für Dokumente | 0.5 |
| `num_retrieval_results` | Anzahl der auszuwählenden Dokumente | 5 |
| `device` | Zu verwendende Hardware (cuda/cpu) | Automatisch |
| `use_hybrid_search` | Kombiniert semantische und Keyword-Suche | True |

## Optimierung der Antwortqualität

Die RAG-Engine implementiert mehrere Strategien zur Qualitätsverbesserung:

1. **Query Expansion**:
   - Anreicherung der Suchanfrage mit synonymen Begriffen
   - Erweiterung um fachspezifische Terminologie

2. **Re-Ranking**:
   - Zweistufige Bewertung der gefundenen Dokumente
   - Berücksichtigung von Aktualität und Relevanz

3. **Dynamische Kontextanpassung**:
   - Intelligente Auswahl der wichtigsten Dokumentabschnitte
   - Optimale Nutzung des begrenzten Kontextfensters des LLM

## Leistungsmetriken

Die Engine erfasst verschiedene Metriken zur Leistungsüberwachung:

- **Antwortzeit**: Zeit von der Anfrage bis zur vollständigen Antwort
- **Retrieval-Qualität**: Relevanz der gefundenen Dokumente
- **Speichernutzung**: Überwachung des RAM- und VRAM-Verbrauchs
- **Cache-Trefferrate**: Effizienz des Embedding-Caches

## Integration

Die RAG-Engine wird über die Server-API in die Gesamtanwendung integriert:

```python
@app.post("/api/chat")
async def chat(request: ChatRequest, current_user: dict = Depends(get_current_user)):
    """Chat-Endpunkt für die Kommunikation mit dem LLM"""
    if request.stream:
        # Streaming-Antwort zurückgeben
        return StreamingResponse(
            rag_engine.stream_response(request.message, request.session_id),
            media_type="text/event-stream"
        )
    else:
        # Normale Antwort zurückgeben
        response = await rag_engine.generate_answer(
            request.message, 
            request.session_id,
            stream=False
        )
        return response
```

## Erweiterbarkeit

Die RAG-Engine ist für zukünftige Erweiterungen konzipiert:

1. **Modell-Austauschbarkeit**: Einfacher Wechsel zwischen verschiedenen LLMs
2. **Neue Retrieval-Methoden**: Integration zusätzlicher Suchalgorithmen
3. **Multimodale Unterstützung**: Möglichkeit zur Einbindung von Bild- und Audioanalyse
4. **Personalisierung**: Anpassung der Antworten an Benutzerhistorie und -präferenzen

---

Aktualisiert: 04.05.2025