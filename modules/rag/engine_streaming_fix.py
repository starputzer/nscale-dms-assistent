"""
Streaming-Fix für Ollama, falls es nicht nativ streamt
"""
import asyncio
import json

async def fake_stream_response(complete_response: str, chunk_size: int = 5):
    """
    Teilt eine komplette Antwort in Chunks auf für simuliertes Streaming
    
    Args:
        complete_response: Die vollständige Antwort
        chunk_size: Anzahl der Zeichen pro Chunk
    """
    words = complete_response.split(' ')
    current_chunk = ""
    
    for word in words:
        current_chunk += word + " "
        
        # Sende Chunk wenn Größe erreicht ist
        if len(current_chunk) >= chunk_size:
            yield f"data: {json.dumps({'response': current_chunk.strip()})}\n\n"
            current_chunk = ""
            await asyncio.sleep(0.05)  # Simuliere Streaming-Verzögerung
    
    # Sende letzten Chunk
    if current_chunk:
        yield f"data: {json.dumps({'response': current_chunk.strip()})}\n\n"
    
    # Sende done Event
    yield "event: done\ndata: \n\n"