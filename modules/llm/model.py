import asyncio
import hashlib
import json
import time
import threading
from typing import Dict, Any, Optional, List
import diskcache as dc
import httpx

from ..core.config import Config
from ..core.logging import LogManager

logger = LogManager.setup_logging(__name__)  # Präziseres Logger-Objekt

class OllamaClient:
    """Client für die Kommunikation mit dem Ollama-Server"""
    
    def __init__(self):
        self.cache = dc.Cache(str(Config.RESULT_CACHE_DIR))
        self.semaphore = asyncio.Semaphore(Config.THREAD_POOL_SIZE)
        self._lock = threading.RLock()  # Explizites Lock für kritische Operationen
    
    def _hash_prompt(self, prompt: str) -> str:
        """Erstellt einen Hash für einen Prompt"""
        return hashlib.md5(prompt.encode('utf-8')).hexdigest()
    
    async def generate(self, prompt: str, user_id: int = None) -> Dict[str, Any]:
        """Generiert eine Antwort für einen Prompt"""
        # Prompt-Längen-Check
        if len(prompt) > Config.MAX_PROMPT_LENGTH:
            logger.warning(f"Prompt überschreitet maximale Länge ({len(prompt)} > {Config.MAX_PROMPT_LENGTH})")
            # Kürze den Prompt auf die maximale Länge
            prompt = prompt[:Config.MAX_PROMPT_LENGTH]
        
        cache_key = f"{user_id}:{self._hash_prompt(prompt)}" if user_id else self._hash_prompt(prompt)
        
        # Versuche aus dem Cache zu laden (Thread-sicher mit Lock)
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
                logger.info(f"Sende Anfrage an Ollama ({len(prompt)} Zeichen)")
                start_time = time.time()
                
                async with httpx.AsyncClient(timeout=Config.LLM_TIMEOUT) as client:
                    response = await client.post(
                        f"{Config.OLLAMA_URL}/api/generate",
                        json={
                            'model': Config.MODEL_NAME,
                            'prompt': prompt,
                            'stream': False,
                            'options': {
                                'temperature': 0.1,
                                'num_ctx': Config.LLM_CONTEXT_SIZE,
                                'num_predict': Config.LLM_MAX_TOKENS
                            }
                        },
                        timeout=Config.LLM_TIMEOUT
                    )
                    
                    elapsed = time.time() - start_time
                    
                    if response.status_code == 200:
                        data = response.json()
                        result = data.get('response', '')
                        
                        # Cache das Ergebnis (Thread-sicher mit Lock)
                        with self._lock:
                            self.cache.set(cache_key, result, expire=Config.CACHE_EXPIRE)
                        
                        logger.info(f"Antwort erhalten in {elapsed:.2f}s")
                        return {
                            'response': result,
                            'elapsed': elapsed,
                            'cached': False
                        }
                    else:
                        error_msg = f"Fehler: {response.status_code} {response.text}"
                        logger.error(error_msg)
                        return {
                            'error': error_msg,
                            'elapsed': elapsed,
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