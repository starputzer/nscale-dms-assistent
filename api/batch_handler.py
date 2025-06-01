import json
import time
import traceback
import asyncio
import aiohttp
from typing import Dict, List, Any, Optional, Union, Tuple
from flask import Blueprint, request, jsonify, current_app, g

# Blueprint für Batch-API-Endpunkte
batch_routes = Blueprint('batch', __name__)

class BatchProcessor:
    """
    Prozessor für Batched API-Anfragen
    """
    def __init__(self, max_concurrent_requests: int = 10):
        self.max_concurrent_requests = max_concurrent_requests
        self.request_semaphore = asyncio.Semaphore(max_concurrent_requests)
        self.session: Optional[aiohttp.ClientSession] = None
    
    async def initialize(self):
        """Initialisiert die aiohttp-Session"""
        if self.session is None or self.session.closed:
            self.session = aiohttp.ClientSession()
    
    async def close(self):
        """Schließt die aiohttp-Session"""
        if self.session and not self.session.closed:
            await self.session.close()
    
    async def process_batch(self, requests: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Verarbeitet einen Batch von API-Anfragen parallel
        
        Args:
            requests: Liste von API-Anfragen
            
        Returns:
            Liste von Antworten für jede Anfrage
        """
        await self.initialize()
        
        # Aufgaben für alle Anfragen erstellen
        tasks = [
            self.process_request(req)
            for req in requests
        ]
        
        # Alle Anfragen parallel ausführen
        responses = await asyncio.gather(*tasks)
        return responses
    
    async def process_request(self, request_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Verarbeitet eine einzelne API-Anfrage
        
        Args:
            request_data: API-Anfragedefinition
            
        Returns:
            API-Antwort
        """
        request_id = request_data.get('id', 'unknown')
        endpoint = request_data.get('endpoint', '')
        method = request_data.get('method', 'GET').upper()
        params = request_data.get('params', {})
        data = request_data.get('data', {})
        timeout = request_data.get('timeout', 30)
        headers = request_data.get('headers', {})
        
        # Vollständige URL erstellen
        if endpoint.startswith('/'):
            # Relativen Pfad in absoluten umwandeln
            base_url = current_app.config.get('API_BASE_URL', '')
            url = f"{base_url}{endpoint}"
        else:
            # Absoluten Pfad verwenden
            url = endpoint
        
        # Standard-Response für Fehler
        response = {
            'id': request_id,
            'status': 500,
            'success': False,
            'error': 'Unknown error',
            'data': None,
            'timestamp': int(time.time() * 1000),
            'duration': 0,
            'request': request_data
        }
        
        start_time = time.time()
        
        try:
            # Semaphore verwenden, um parallele Anfragen zu begrenzen
            async with self.request_semaphore:
                # HTTP-Anfrage senden
                method_fn = getattr(self.session, method.lower())
                
                # Timeout setzen (in Sekunden)
                timeout_obj = aiohttp.ClientTimeout(total=timeout)
                
                # Anfrage ausführen
                async with method_fn(
                    url, 
                    params=params,
                    json=data if method in ('POST', 'PUT', 'PATCH') else None,
                    headers=headers,
                    timeout=timeout_obj
                ) as resp:
                    # Body lesen
                    try:
                        resp_data = await resp.json()
                    except:
                        # Wenn keine gültige JSON-Antwort, Textantwort verwenden
                        resp_data = await resp.text()
                    
                    # Response aktualisieren
                    response.update({
                        'status': resp.status,
                        'success': 200 <= resp.status < 300,
                        'data': resp_data,
                        'error': None if 200 <= resp.status < 300 else f"HTTP error {resp.status}"
                    })
                    
        except aiohttp.ClientError as e:
            # Netzwerkfehler oder Timeout
            response.update({
                'status': 0,
                'success': False,
                'error': f"Request failed: {str(e)}",
                'data': None
            })
        except Exception as e:
            # Allgemeiner Fehler
            response.update({
                'status': 500,
                'success': False,
                'error': f"Internal error: {str(e)}",
                'data': None
            })
            # Traceback in Logs ausgeben
            current_app.logger.error(f"Batch request error: {traceback.format_exc()}")
        finally:
            # Dauer berechnen und Response abschließen
            duration = int((time.time() - start_time) * 1000)
            response['duration'] = duration
        
        return response

# Batch-Processor-Instanz erstellen
processor = BatchProcessor(max_concurrent_requests=10)

@batch_routes.route('/api/batch', methods=['POST'])
async def handle_batch():
    """
    Handler für Batch-API-Anfragen
    
    Erwartet ein JSON-Objekt mit einem 'requests'-Array, das mehrere API-Anfragen enthält.
    Führt diese Anfragen parallel aus und gibt die Ergebnisse zurück.
    """
    try:
        # Request-Daten validieren
        if not request.is_json:
            return jsonify({
                'error': 'Request must be JSON',
                'success': False
            }), 400
        
        data = request.get_json()
        
        if not isinstance(data, dict) or 'requests' not in data:
            return jsonify({
                'error': 'Invalid request format, missing "requests" array',
                'success': False
            }), 400
        
        requests = data.get('requests', [])
        
        if not isinstance(requests, list):
            return jsonify({
                'error': 'Requests must be an array',
                'success': False
            }), 400
        
        # Leere Anfrage behandeln
        if len(requests) == 0:
            return jsonify({
                'success': True,
                'responses': []
            }), 200
        
        # Maximale Anzahl von Anfragen pro Batch begrenzen
        max_batch_size = current_app.config.get('MAX_BATCH_SIZE', 20)
        if len(requests) > max_batch_size:
            return jsonify({
                'error': f'Batch size exceeds maximum of {max_batch_size} requests',
                'success': False
            }), 400
        
        # Batch verarbeiten
        responses = await processor.process_batch(requests)
        
        # Antwort zurückgeben
        return jsonify({
            'success': True,
            'responses': responses,
            'count': len(responses),
            'timestamp': int(time.time() * 1000)
        }), 200
        
    except Exception as e:
        # Fehlerbehandlung
        current_app.logger.error(f"Batch request handler error: {traceback.format_exc()}")
        return jsonify({
            'error': f'Internal server error: {str(e)}',
            'success': False
        }), 500

@batch_routes.teardown_app_request
async def cleanup_batch_processor(exception=None):
    """Cleanup-Funktion, die nach jeder Anfrage aufgerufen wird"""
    if hasattr(g, 'batch_processor') and g.batch_processor:
        await g.batch_processor.close()

# Hilfsfunktion zum Registrieren der Blueprint-Route
def register_batch_routes(app):
    """Registriert die Batch-Routen bei der Flask-Anwendung"""
    app.register_blueprint(batch_routes)