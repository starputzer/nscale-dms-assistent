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
    
    def _hash_prompt(self, prompt: str) -> str:
        """Erstellt einen Hash für einen Prompt"""
        return hashlib.md5(prompt.encode('utf-8')).hexdigest()
    
    async def stream_generate(self, prompt: str) -> AsyncGenerator[str, None]:
        """Streamt die Antwort vom Ollama-Server und gibt sie Token für Token zurück"""
        # Prompt-Längen-Check
        if len(prompt) > Config.MAX_PROMPT_LENGTH:
            logger.warning(f"Prompt überschreitet maximale Länge ({len(prompt)} > {Config.MAX_PROMPT_LENGTH})")
            prompt = prompt[:Config.MAX_PROMPT_LENGTH]
        
        # Zusätzlicher Parameter in deutschen Prompts
        if "Antwort auf Deutsch" not in prompt and "auf Deutsch antworten" not in prompt:
            prompt = f"{prompt}\n\nAchte darauf, auf Deutsch zu antworten."
        
        payload = {
            'model': Config.MODEL_NAME,
            'prompt': prompt,
            'stream': True,
            'options': {
                'temperature': 0.2,
                'num_ctx': Config.LLM_CONTEXT_SIZE,
                'num_predict': Config.LLM_MAX_TOKENS,
                'top_p': 0.9,
                'repeat_penalty': 1.1,
                'num_batch': 512,
            }
        }
        
        logger.info(f"Starte Stream-Generierung für Prompt ({len(prompt)} Zeichen)")
        start_time = time.time()
        token_count = 0
        
        try:
            async with aiohttp.ClientSession() as session:
                try:
                    logger.info(f"Sende Anfrage an {Config.OLLAMA_URL}/api/generate")
                    async with session.post(
                        f"{Config.OLLAMA_URL}/api/generate",
                        json=payload,
                        timeout=Config.LLM_TIMEOUT
                    ) as resp:
                        
                        logger.info(f"Ollama-Server-Antwort: Status {resp.status}")
                        
                        if resp.status != 200:
                            error_text = await resp.text()
                            logger.error(f"Fehler bei Ollama-Anfrage: {resp.status} {error_text}")
                            yield f"Fehler bei der Verbindung zum Sprachmodell: {resp.status}"
                            return
                        
                        # Verarbeite den Stream
                        async for line in resp.content:
                            if not line:
                                continue
                                
                            try:
                                line_text = line.decode('utf-8').strip()
                                logger.info(f"ROHDATEN aus Stream: {line_text}")
                                
                                # Direktes Parsen des JSON ohne Präfix zu erwarten
                                data = json.loads(line_text)
                                
                                if 'response' in data:
                                    token = data['response']
                                    token_count += 1
                                    logger.info(f"Streaming-Token #{token_count}: {token}")
                                    # Leere Tokens werden ebenfalls gesendet (wichtig!)
                                    yield token
                                
                                if data.get('done', False):
                                    logger.info(f"Stream abgeschlossen in {time.time() - start_time:.2f}s")
                                    yield "" # Leeres Token als Abschluss senden
                                    break
                            
                            except json.JSONDecodeError as e:
                                logger.warning(f"JSON-Fehler beim Verarbeiten der Stream-Daten: {e}")
                                continue
                            except Exception as e:
                                logger.error(f"Fehler beim Verarbeiten der Stream-Daten: {e}")
                                yield f"[Fehler bei der Datenverarbeitung: {str(e)}]"
                    
                    # Prüfen, ob überhaupt Tokens generiert wurden
                    if token_count == 0:
                        logger.warning("Keine Token vom Ollama-Server erhalten!")
                        yield "Keine Antwort vom Sprachmodell erhalten. Bitte versuchen Sie es später erneut."
                
                except aiohttp.ClientError as e:
                    logger.error(f"Verbindungsfehler zu Ollama: {e}")
                    yield f"[Verbindungsfehler zum Sprachmodell: {str(e)}]"
                except asyncio.TimeoutError:
                    logger.error("Timeout bei der Anfrage an Ollama")
                    yield "[Zeitüberschreitung bei der Anfrage]"
        
        except Exception as e:
            logger.error(f"Unerwarteter Fehler beim Streaming: {e}")
            yield f"[Unerwarteter Fehler: {str(e)}]"

        
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