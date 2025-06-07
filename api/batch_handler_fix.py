from typing import Dict, List, Any, Optional
from datetime import datetime
import logging
import time
import json
import traceback

# Logger konfigurieren
logger = logging.getLogger("batch_handler")

def handle_batch_request(
    requests: List[Dict[str, Any]], 
    user_data: Dict[str, Any],
    chat_history: Any
) -> Dict[str, Any]:
    """
    Verarbeitet Batch-API-Anfragen und führt sie aus.
    
    Args:
        requests: Liste von Batch-Anfragen
        user_data: Authentifizierte Benutzerdaten
        chat_history: ChatHistoryManager-Instanz
    
    Returns:
        Dict mit Ergebnissen der Anfragen
    """
    user_id = user_data.get('user_id')
    if not user_id:
        logger.error("Keine user_id in user_data gefunden")
        return {
            'success': False,
            'error': 'Authentifizierung fehlgeschlagen',
            'data': {
                'responses': [],
                'count': 0,
                'timestamp': int(time.time() * 1000)
            }
        }
    
    # Verarbeite jeden Request
    responses = []
    
    for idx, req in enumerate(requests):
        request_id = req.get('id', f'req_{idx}')
        endpoint = req.get('endpoint', '')
        method = req.get('method', 'GET').upper()
        params = req.get('params', {})
        payload = req.get('data', {})
        headers = req.get('headers', {})
        
        # Response-Template
        response = {
            'id': request_id,
            'status': 500,
            'success': False,
            'error': 'Unknown error',
            'data': None,
            'timestamp': int(time.time() * 1000),
            'request': req
        }
        
        logger.debug(f"Verarbeite Batch-Request: {endpoint} ({method})")
        
        try:
            # Sessions-Endpunkte
            if endpoint == '/api/sessions' and method == 'GET':
                # Sessions abrufen
                result = chat_history.get_user_sessions(user_id)
                logger.debug(f"Batch: Returning {len(result)} sessions for user {user_id}")
                response.update({
                    'status': 200,
                    'success': True,
                    'data': result,
                    'error': None
                })
            elif endpoint == '/api/sessions' and method == 'POST':
                # Session erstellen
                try:
                    data = payload
                    title = data.get("title", "Neue Unterhaltung")
                    session_id = data.get("id")  # Client sendet möglicherweise eine ID
                    
                    # Wenn keine ID angegeben ist, erstelle eine neue Session
                    if not session_id:
                        session_id = chat_history.create_session(user_id, title)
                        logger.info(f"Neue Session erstellt mit ID: {session_id}")
                    else:
                        # Detailliertes Logging für Session-ID
                        logger.debug(f"Client hat Session-ID angegeben: {session_id} (Typ: {type(session_id).__name__})")
                        
                        # Versuche, die ID zu konvertieren (falls nötig)
                        try:
                            if isinstance(session_id, str) and session_id.isdigit():
                                session_id = int(session_id)
                                logger.debug(f"Session-ID zu Integer konvertiert: {session_id}")
                        except (ValueError, TypeError) as e:
                            # Bei Fehler die ID unverändert lassen (könnte eine UUID sein)
                            logger.debug(f"Konvertierungsfehler bei Session-ID, verwende Original-ID: {str(e)}")
                            pass
                        
                        # Versuche die Session mit der angegebenen ID zu erstellen
                        # Fallback zu automatisch generierter ID, wenn nicht unterstützt
                        try:
                            if hasattr(chat_history, 'create_session_with_id'):
                                success = chat_history.create_session_with_id(session_id, user_id, title)
                                if not success:
                                    # Fallback zu neuer Session
                                    session_id = chat_history.create_session(user_id, title)
                            else:
                                # Methode nicht unterstützt, erstelle neue Session
                                logger.debug("create_session_with_id nicht unterstützt, verwende create_session")
                                session_id = chat_history.create_session(user_id, title)
                        except Exception as e:
                            logger.warning(f"Fehler beim Erstellen einer Session mit ID {session_id}: {e}")
                            session_id = chat_history.create_session(user_id, title)
                    
                    if not session_id:
                        raise ValueError("Fehler beim Erstellen einer Session")
                    
                    # Hole die Session-Details
                    user_sessions = chat_history.get_user_sessions(user_id)
                    # Verbessert: String-Konvertierung für alle IDs
                    user_sessions_str_ids = {str(s['id']): s for s in user_sessions}
                    session_details = user_sessions_str_ids.get(str(session_id))
                    
                    if not session_details:
                        # Fallback: Minimales Objekt zurückgeben
                        session_details = {
                            "id": session_id,
                            "title": title,
                            "userId": user_id,
                            "createdAt": datetime.now().isoformat(),
                            "updatedAt": datetime.now().isoformat(),
                        }
                        logger.warning(f"Session {session_id} nicht in get_user_sessions gefunden, verwende Fallback-Objekt")
                    
                    response.update({
                        'status': 200,
                        'success': True,
                        'data': session_details,
                        'error': None
                    })
                except Exception as e:
                    logger.error(f"Fehler beim Erstellen einer Session im Batch: {e}")
                    logger.error(traceback.format_exc())
                    response.update({
                        'status': 500,
                        'success': False,
                        'error': f"Fehler beim Erstellen einer Session: {str(e)}",
                        'data': None
                    })
            elif endpoint.startswith('/api/sessions/') and endpoint.endswith('/messages') and method == 'GET':
                session_id = endpoint.split('/')[-2]
                try:
                    # Debug-Logging für Session-ID
                    logger.debug(f"Batch: Anfrage für Nachrichten mit Session ID: {session_id} (Typ: {type(session_id).__name__})")
                    
                    # Integer-Konvertierung nur wenn möglich
                    session_id_int = int(session_id) if session_id.isdigit() else session_id
                    
                    # Prüfe, ob die Session dem Benutzer gehört
                    user_sessions = chat_history.get_user_sessions(user_id)
                    # String-Konvertierung aller IDs für konsistenten Vergleich
                    session_ids = [str(s['id']) for s in user_sessions]
                    
                    # Debugging-Informationen
                    logger.debug(f"Verfügbare Session-IDs für Benutzer {user_id}: {session_ids}")
                    logger.debug(f"Anfrage für Session-ID: {session_id} (als String: {str(session_id)})")
                    
                    # Verbessert: Vergleich mit String-Konvertierung
                    if str(session_id) in session_ids:
                        # Nachrichten abrufen
                        result = chat_history.get_session_history(session_id_int)
                        logger.debug(f"Batch: Returning {len(result) if result else 0} messages for session {session_id}")
                        
                        # Null-Ergebnisse als leere Arrays behandeln
                        if result is None:
                            result = []
                            
                        response.update({
                            'status': 200,
                            'success': True,
                            'data': result,
                            'error': None
                        })
                    else:
                        logger.warning(f"Zugriff verweigert: Session {session_id} gehört nicht Benutzer {user_id}")
                        logger.warning(f"Verfügbare Sessions: {session_ids}")
                        response.update({
                            'status': 403,
                            'success': False,
                            'error': 'Access denied',
                            'data': None
                        })
                except ValueError as ve:
                    logger.error(f"Ungültiges Session-ID-Format: {session_id}, Fehler: {str(ve)}")
                    response.update({
                        'status': 400,
                        'success': False,
                        'error': f"Invalid session ID format: {session_id}",
                        'data': None
                    })
                except Exception as e:
                    logger.error(f"Fehler beim Abrufen der Nachrichten für Session {session_id}: {str(e)}")
                    logger.error(traceback.format_exc())
                    response.update({
                        'status': 500,
                        'success': False,
                        'error': f"Error fetching messages: {str(e)}",
                        'data': None
                    })
            elif endpoint == '/api/sessions/stats' and method == 'GET':
                # Statistik über Sitzungen
                user_sessions = chat_history.get_user_sessions(user_id)
                active_sessions = [s for s in user_sessions if not s.get('isArchived', False)]
                archived_sessions = [s for s in user_sessions if s.get('isArchived', False)]
                # Gesamtzahl der Nachrichten ermitteln (kann langsam sein bei vielen Sitzungen)
                total_messages = 0
                for session in user_sessions[:10]:  # Begrenze auf 10 Sitzungen für Performance
                    session_messages = chat_history.get_session_history(session['id'])
                    total_messages += len(session_messages) if session_messages else 0
                
                result = {
                    'totalSessions': len(user_sessions),
                    'activeSessions': len(active_sessions),
                    'archivedSessions': len(archived_sessions),
                    'totalMessages': total_messages,
                    'sessionSample': len(user_sessions[:10])
                }
                response.update({
                    'status': 200,
                    'success': True,
                    'data': result,
                    'error': None
                })
            else:
                # Endpunkt nicht implementiert oder nicht unterstützt
                logger.warning(f"Nicht unterstützter Endpunkt: {endpoint} ({method})")
                response.update({
                    'status': 404,
                    'success': False,
                    'error': f"Endpoint {endpoint} with method {method} not found or not supported in batch mode",
                    'data': None
                })
        except Exception as e:
            logger.error(f"Error processing batch request for {endpoint}: {str(e)}")
            logger.error(traceback.format_exc())
            response.update({
                'status': 500,
                'success': False,
                'error': str(e),
                'data': None
            })
        
        responses.append(response)
    
    # Antwort zurückgeben
    return {
        'success': True,
        'data': {
            'responses': responses,
            'count': len(responses),
            'timestamp': int(time.time() * 1000)
        }
    }