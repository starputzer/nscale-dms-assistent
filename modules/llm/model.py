import asyncio
import aiohttp
import hashlib
import json
import time
import threading
from typing import Dict, Any, Optional, List, AsyncGenerator
import diskcache as dc
import httpx

from ..core.config import Config
from ..core.logging import LogManager

logger = LogManager.setup_logging(__name__)

class OllamaClient:
    """Client für die Kommunikation mit dem Ollama-Server mit Streaming-Unterstützung"""
    
    def __init__(self):
        self.cache = dc.Cache(str(Config.RESULT_CACHE_DIR))
        self.semaphore = asyncio.Semaphore(Config.THREAD_POOL_SIZE)
        self._lock = threading.RLock()
        self._active_streams = {}  # Speichert aktive Stream-Verbindungen
    
    def _hash_prompt(self, prompt: str) -> str:
        """Erstellt einen Hash für einen Prompt"""
        return hashlib.md5(prompt.encode('utf-8')).hexdigest()
    
    async def stream_generate(self, prompt: str) -> AsyncGenerator[str, None]:
        """Streamt die Antwort vom Ollama-Server mit optimierter Leistung"""
        # Generiere eine eindeutige Stream-ID für diese Anfrage
        stream_id = hashlib.md5(f"{prompt}_{time.time()}".encode()).hexdigest()
        
        try:
            # Prompt-Längen-Check
            if len(prompt) > Config.MAX_PROMPT_LENGTH:
                logger.warning(f"Prompt überschreitet maximale Länge ({len(prompt)} > {Config.MAX_PROMPT_LENGTH})")
                prompt = prompt[:Config.MAX_PROMPT_LENGTH]
            
            # Zusätzlicher Parameter für deutsche Antworten
            if "Antwort auf Deutsch" not in prompt and "auf Deutsch antworten" not in prompt:
                prompt = f"{prompt}\n\nAchte darauf, auf Deutsch zu antworten."
            
            # Optimierte Payload für Llama 3 - effizientere Einstellungen
            payload = {
                'model': Config.MODEL_NAME,
                'prompt': prompt,
                'stream': True,
                'options': {
                    'temperature': 0.1,           # Niedrigere Temperatur für Konsistenz
                    'num_ctx': Config.LLM_CONTEXT_SIZE,
                    'num_predict': Config.LLM_MAX_TOKENS,
                    'top_p': 0.9,
                    'repeat_penalty': 1.2,        # Verhindert Wiederholungen
                    'mirostat': 1,                # Mirostat-Sampling für konsistentere Textqualität (Llama3-spezifisch)
                    'mirostat_eta': 0.1,          # Aggressivere Mirostat-Steuerung
                    'num_batch': 512,
                    'num_gpu': 1,
                    'stop': ["</s>", "<|im_end|>"], # Explizite Stop-Tokens
                    'seed': 42,                   # Reproduzierbarkeit
                }
            }
            
            logger.info(f"Starte Stream-Generierung für Prompt ({len(prompt)} Zeichen)")
            start_time = time.time()
            token_count = 0
            connection_retries = 3  # Anzahl der Verbindungsversuche
            
            for retry in range(connection_retries):
                # Wenn es nicht der erste Versuch ist, informiere den Client
                if retry > 0:
                    yield "[STREAM_RETRY]"
                    logger.info(f"Starte Streaming-Versuch {retry+1}/{connection_retries}...")
                
                try:
                    # Timeout pro Verbindungsversuch erhöhen
                    timeout = aiohttp.ClientTimeout(total=Config.LLM_TIMEOUT, connect=10.0)
                    
                    # Verbindungspool verbessern
                    conn = aiohttp.TCPConnector(limit=5, force_close=False, enable_cleanup_closed=True)
                    
                    # Aktive Stream-Verbindung speichern
                    client_session = aiohttp.ClientSession(timeout=timeout, connector=conn)
                    self._active_streams[stream_id] = client_session
                    
                    try:
                        logger.info(f"Sende Anfrage an {Config.OLLAMA_URL}/api/generate (Versuch {retry+1}/{connection_retries})")
                        async with client_session.post(
                            f"{Config.OLLAMA_URL}/api/generate",
                            json=payload,
                            timeout=timeout,
                            headers={"Content-Type": "application/json"}
                        ) as resp:
                            
                            logger.info(f"Ollama-Server-Antwort: Status {resp.status}")
                            
                            if resp.status != 200:
                                error_text = await resp.text()
                                logger.error(f"Fehler bei Ollama-Anfrage: {resp.status} {error_text}")
                                yield f"[ERROR] Fehler bei der Verbindung zum Sprachmodell: {resp.status}"
                                # Stream für diesen Versuch beenden
                                if stream_id in self._active_streams:
                                    await self._active_streams[stream_id].close()
                                    del self._active_streams[stream_id]
                                continue  # Nächster Versuch
                            
                            # Verarbeite den Stream mit optimiertem Buffer-Management
                            buffer = b""  # Byte-Buffer für fragmentierte Nachrichten
                            stream_done = False  # Flag, ob der Stream abgeschlossen ist
                            stream_timeout = False  # Flag für Timeout
                            
                            try:
                                # Verarbeite den Stream in einer Schleife ohne Generator
                                while not stream_done:
                                    try:
                                        # Lese einen Chunk mit Timeout
                                        chunk_read_task = resp.content.read(1024)
                                        chunk = await asyncio.wait_for(chunk_read_task, timeout=5.0)
                                        
                                        if not chunk:
                                            # Ende des Streams erreicht
                                            break
                                        
                                        # Füge zum Buffer hinzu
                                        buffer += chunk
                                        
                                        # Verarbeite komplette Zeilen im Buffer
                                        while b'\n' in buffer:
                                            line, buffer = buffer.split(b'\n', 1)
                                            if not line:
                                                continue
                                            
                                            try:
                                                line_text = line.decode('utf-8').strip()
                                                # Logging nur für erste paar Tokens oder periodisch
                                                if token_count < 5 or token_count % 50 == 0:
                                                    logger.debug(f"Stream-Rohdaten #{token_count}: {line_text}")
                                                
                                                # Parse JSON
                                                data = json.loads(line_text)
                                                
                                                if 'response' in data:
                                                    token = data['response']
                                                    token_count += 1
                                                    
                                                    # Token ausgeben
                                                    yield token
                                                
                                                # Wenn Stream abgeschlossen ist
                                                if data.get('done', False):
                                                    duration = time.time() - start_time
                                                    tokens_per_second = token_count / duration if duration > 0 else 0
                                                    logger.info(f"Stream abgeschlossen in {duration:.2f}s mit {token_count} Tokens "
                                                            f"({tokens_per_second:.1f} Tokens/s)")
                                                    
                                                    stream_done = True
                                                    break
                                            
                                            except json.JSONDecodeError as e:
                                                logger.warning(f"JSON-Fehler beim Verarbeiten: {e}, Daten: {line[:100]}")
                                                continue
                                            except Exception as e:
                                                logger.error(f"Fehler beim Verarbeiten: {e}")
                                                yield f"[ERROR] {str(e)}"
                                        
                                        if stream_done:
                                            break
                                    
                                    except asyncio.TimeoutError:
                                        logger.warning("Timeout beim Lesen eines Chunks, versuche weiter...")
                                        continue  # Versuche weiter zu lesen
                                    except Exception as e:
                                        logger.error(f"Fehler beim Lesen: {e}")
                                        break
                                
                                # Wenn der Stream ordnungsgemäß abgeschlossen wurde
                                if stream_done:
                                    if stream_id in self._active_streams:
                                        await self._active_streams[stream_id].close()
                                        del self._active_streams[stream_id]
                                    return  # Erfolgreich abgeschlossen, verlasse die äußere Funktion
                                
                            except asyncio.TimeoutError:
                                logger.error(f"Timeout bei der Stream-Verarbeitung (Versuch {retry+1})")
                                stream_timeout = True
                                yield "[TIMEOUT]"
                                
                                # Stream-Verbindung schließen
                                if stream_id in self._active_streams:
                                    await self._active_streams[stream_id].close()
                                    del self._active_streams[stream_id]
                                
                                if retry == connection_retries - 1:  # Letzter Versuch
                                    yield "[FINAL_TIMEOUT] Zeitüberschreitung bei der Anfrage"
                                    return
                                else:
                                    await asyncio.sleep(1.0)
                                    continue  # Zum nächsten Versuch
                            
                            # Verarbeite den letzten Buffer-Inhalt, falls vorhanden
                            if not stream_timeout and buffer:
                                try:
                                    line_text = buffer.decode('utf-8').strip()
                                    if line_text:
                                        data = json.loads(line_text)
                                        if 'response' in data:
                                            token = data['response']
                                            token_count += 1
                                            yield token
                                except Exception:
                                    pass  # Ignoriere Fehler im letzten Buffer
                            
                            # Prüfen, ob überhaupt Tokens generiert wurden
                            if token_count == 0 and not stream_timeout:
                                logger.warning("Keine Tokens vom Ollama-Server erhalten!")
                                yield "[NO_TOKENS] Keine Antwort vom Sprachmodell erhalten. Bitte versuchen Sie es später erneut."
                            
                            # Bei erfolgreicher Verarbeitung den Stream beenden
                            if not stream_timeout:
                                if stream_id in self._active_streams:
                                    await self._active_streams[stream_id].close()
                                    del self._active_streams[stream_id]
                                return  # Erfolgreich abgeschlossen - keine weiteren Versuche nötig
                    
                    except aiohttp.ClientError as e:
                        logger.error(f"Verbindungsfehler zu Ollama (Versuch {retry+1}): {e}")
                        # Stream-Verbindung schließen
                        if stream_id in self._active_streams:
                            await self._active_streams[stream_id].close()
                            del self._active_streams[stream_id]
                            
                        if retry == connection_retries - 1:  # Letzter Versuch
                            yield f"[CONN_ERROR] Verbindungsfehler: {str(e)}"
                        else:
                            # Kurze Pause vor dem nächsten Versuch
                            await asyncio.sleep(1.0)
                
                except Exception as e:
                    logger.error(f"Unerwarteter Fehler beim Streaming (Versuch {retry+1}): {e}")
                    # Sicherstellen, dass die Session geschlossen wird
                    if stream_id in self._active_streams:
                        try:
                            await self._active_streams[stream_id].close()
                        except:
                            pass
                        del self._active_streams[stream_id]
                        
                    if retry == connection_retries - 1:  # Letzter Versuch
                        yield f"[UNEXPECTED_ERROR] Unerwarteter Fehler: {str(e)}"
                    else:
                        await asyncio.sleep(1.0)
        
        finally:
            # Sicherstellen, dass alle Verbindungen geschlossen werden, wenn die Funktion verlassen wird
            if stream_id in self._active_streams:
                try:
                    await self._active_streams[stream_id].close()
                except:
                    pass
                del self._active_streams[stream_id]
        
    async def generate(self, prompt: str, user_id: int = None) -> Dict[str, Any]:
        """Generiert eine Antwort für einen Prompt mit Streaming"""
        # Prompt-Längen-Check
        if len(prompt) > Config.MAX_PROMPT_LENGTH:
            logger.warning(f"Prompt überschreitet maximale Länge ({len(prompt)} > {Config.MAX_PROMPT_LENGTH})")
            prompt = prompt[:Config.MAX_PROMPT_LENGTH]
        
        cache_key = f"{user_id}:{self._hash_prompt(prompt)}" if user_id else self._hash_prompt(prompt)
        
        # Versuche aus dem Cache zu laden
        with self._lock:
            cached_result = self.cache.get(cache_key)
            if cached_result is not None:
                logger.info(f"Cache-Treffer für Prompt ({len(prompt)} Zeichen)")
                return {
                    'response': cached_result,
                    'cached': True
                }
        
        # Semaphore für begrenzte parallele Anfragen
        async with self.semaphore:
            try:
                logger.info(f"Sende Anfrage an Ollama ({len(prompt)} Zeichen) mit Streaming")
                start_time = time.time()
                
                # Zusätzlicher Parameter in deutschen Prompts
                if "Antwort auf Deutsch" not in prompt and "auf Deutsch antworten" not in prompt:
                    prompt = f"{prompt}\n\nAchte darauf, auf Deutsch zu antworten."
                
                async with httpx.AsyncClient(timeout=Config.LLM_TIMEOUT) as client:
                    response = await client.post(
                        f"{Config.OLLAMA_URL}/api/generate",
                        json={
                            'model': Config.MODEL_NAME,
                            'prompt': prompt,
                            'stream': True,  # Streaming aktivieren
                            'options': {
                                'temperature': 0.2,  # Reduzierte Temperatur für konsistentere Antworten
                                'num_ctx': Config.LLM_CONTEXT_SIZE,
                                'num_predict': Config.LLM_MAX_TOKENS,
                                'top_p': 0.9,
                                'repeat_penalty': 1.1,
                                'num_batch': 512,    # Größere Batch-Size für schnellere Verarbeitung
                            }
                        },
                        timeout=Config.LLM_TIMEOUT
                    )
                    
                    if response.status_code == 200:
                        # Verarbeite Stream-Antwort
                        complete_response = ""
                        async for line in response.aiter_lines():
                            if not line.strip():
                                continue
                            try:
                                data = json.loads(line)
                                if 'response' in data:
                                    complete_response += data['response']
                                # Wenn wir das Ende erreicht haben
                                if data.get('done', False):
                                    break
                            except json.JSONDecodeError:
                                continue
                        
                        elapsed = time.time() - start_time
                        
                        # Cache das Ergebnis
                        with self._lock:
                            self.cache.set(cache_key, complete_response, expire=Config.CACHE_EXPIRE)
                        
                        logger.info(f"Antwort erhalten in {elapsed:.2f}s (Streaming)")
                        return {
                            'response': complete_response,
                            'elapsed': elapsed,
                            'cached': False
                        }
                    else:
                        error_msg = f"Fehler: {response.status_code} {response.text}"
                        logger.error(error_msg)
                        return {
                            'error': error_msg,
                            'elapsed': time.time() - start_time,
                            'cached': False
                        }
            
            except httpx.TimeoutException as e:
                logger.error(f"Timeout bei Anfrage an Ollama: {e}")
                return {
                    'error': f"Zeitüberschreitung bei der Anfrage. Bitte versuchen Sie eine kürzere Frage.",
                    'cached': False
                }
            except Exception as e:
                logger.error(f"Fehler bei Anfrage an Ollama: {e}")
                return {
                    'error': f"Fehler bei Anfrage: {str(e)}",
                    'cached': False
                }
    
    async def install_model(self) -> Dict[str, Any]:
        """Installiert das konfigurierte Modell"""
        try:
            logger.info(f"Installiere Modell {Config.MODEL_NAME}")
            
            async with httpx.AsyncClient(timeout=600.0) as client:
                response = await client.post(
                    f"{Config.OLLAMA_URL}/api/pull",
                    json={
                        'name': Config.MODEL_NAME,
                        'stream': False
                    }
                )
                
                if response.status_code == 200:
                    logger.info(f"Modell {Config.MODEL_NAME} erfolgreich installiert")
                    return {
                        'success': True,
                        'message': f"Modell {Config.MODEL_NAME} erfolgreich installiert"
                    }
                else:
                    error_msg = f"Fehler: {response.status_code} {response.text}"
                    logger.error(error_msg)
                    return {
                        'success': False,
                        'message': error_msg
                    }
        
        except Exception as e:
            logger.error(f"Fehler beim Installieren des Modells: {e}")
            return {
                'success': False,
                'message': f"Fehler beim Installieren: {str(e)}"
            }
    
    def clear_cache(self):
        """Löscht den Cache"""
        with self._lock:
            self.cache.clear()
        logger.info("LLM-Cache gelöscht")
        return {
            'success': True,
            'message': "Cache erfolgreich gelöscht"
        }
        
    async def cancel_active_streams(self):
        """Bricht alle aktiven Streams ab"""
        for stream_id, session in list(self._active_streams.items()):
            try:
                await session.close()
                del self._active_streams[stream_id]
                logger.info(f"Stream {stream_id} abgebrochen")
            except Exception as e:
                logger.error(f"Fehler beim Abbrechen des Streams {stream_id}: {e}")