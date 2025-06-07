"""
Verbesserte Implementierung für die Frage-Beantwortung mit besserer
Session-ID-Handhabung und Fehlerbehandlung
"""

import logging
from typing import Dict, Any, Optional, Union
from fastapi import HTTPException, Request, status
from fastapi.responses import JSONResponse

# Logging einrichten
logger = logging.getLogger("question_handler_fix")

async def process_question(
    question: str,
    session_id: Union[str, int, None],
    request_obj: Request,
    user_data: Dict[str, Any],
    chat_history,
    rag_engine,
    logger
) -> Dict[str, Any]:
    """
    Verbesserte Funktion zur Verarbeitung einer Frage mit robuster ID-Behandlung
    und besserer Fehlerbehandlung.
    
    Args:
        question: Die Frage des Benutzers
        session_id: Die Session-ID (kann str, int oder None sein)
        request_obj: Das FastAPI Request-Objekt
        user_data: Benutzerdaten aus der Authentifizierung
        chat_history: Chat-History-Manager
        rag_engine: RAG-Engine für die Antwortgenerierung
        logger: Logger-Instanz
        
    Returns:
        Dict mit der Antwort und weiteren Metadaten
    """
    try:
        # Validiere die Eingabe
        if not question or not question.strip():
            raise ValueError("Die Frage darf nicht leer sein")
        
        user_id = user_data.get('user_id')
        if not user_id:
            raise ValueError("Benutzer-ID fehlt")
        
        # Normalisiere session_id
        normalized_id = None
        if session_id is not None:
            # Behandle als String für Logging und Konsistenz
            normalized_id = str(session_id)
            
            # Versuche, die ID in das erwartete Format zu konvertieren
            try:
                # Wenn es nur Ziffern sind, als Integer behandeln
                if normalized_id.isdigit():
                    session_id_to_use = int(normalized_id)
                else:
                    # UUID oder anderes String-Format
                    session_id_to_use = normalized_id
            except (ValueError, TypeError):
                # Bei Fehlern verwende den String-Wert
                session_id_to_use = normalized_id
                logger.warning(f"Konnte Session-ID {normalized_id} nicht konvertieren, verwende als String")
        else:
            logger.info("Keine Session-ID angegeben, erstelle neue Session")
            # Erstelle eine neue Session
            session_id_to_use = None
        
        # Logging
        logger.info(f"Verarbeite Frage für Session: {normalized_id}, User: {user_id}")
        
        # Erstelle eine neue Session, wenn nötig
        if not session_id_to_use:
            new_id = chat_history.create_session(user_id)
            if not new_id:
                raise ValueError("Fehler beim Erstellen einer Session")
            session_id_to_use = new_id
            logger.info(f"Neue Session erstellt mit ID: {session_id_to_use}")
        else:
            # Prüfe, ob die Session existiert oder erstelle sie
            try:
                # Benutze String-Vergleich für die Prüfung
                user_sessions = chat_history.get_user_sessions(user_id)
                session_exists = False
                
                if user_sessions:
                    for s in user_sessions:
                        if str(s['id']) == str(session_id_to_use):
                            session_exists = True
                            break
                
                if not session_exists:
                    logger.info(f"Session {session_id_to_use} nicht gefunden, erstelle neue Session")
                    # Versuche mit der angegebenen ID zu erstellen
                    try:
                        if hasattr(chat_history, 'create_session_with_id'):
                            success = chat_history.create_session_with_id(session_id_to_use, user_id, "Neue Unterhaltung")
                            if not success:
                                # Verwende automatische ID
                                new_id = chat_history.create_session(user_id, "Neue Unterhaltung")
                                logger.info(f"Verwende automatisch erstellte Session-ID: {new_id}")
                                session_id_to_use = new_id
                        else:
                            # Fallback: Erstelle neue Session mit automatischer ID
                            new_id = chat_history.create_session(user_id, "Neue Unterhaltung")
                            logger.info(f"Neue Session erstellt mit ID: {new_id}")
                            session_id_to_use = new_id
                    except Exception as e:
                        logger.error(f"Fehler beim Erstellen der Session: {e}")
                        # Fallback: Versuche mit automatischer ID
                        new_id = chat_history.create_session(user_id, "Neue Unterhaltung")
                        if not new_id:
                            raise ValueError("Konnte keine Session erstellen")
                        session_id_to_use = new_id
                        logger.info(f"Fallback-Session erstellt mit ID: {session_id_to_use}")
            except Exception as e:
                logger.error(f"Fehler bei der Session-Prüfung: {e}")
                # Im Fehlerfall: Erstelle neue Session
                new_id = chat_history.create_session(user_id, "Neue Unterhaltung")
                if not new_id:
                    raise ValueError("Konnte keine Session erstellen")
                session_id_to_use = new_id
                logger.info(f"Fallback-Session erstellt mit ID: {session_id_to_use}")
        
        # Speichere die Benutzerfrage
        try:
            message_id = chat_history.add_message(session_id_to_use, question, is_user=True)
            if not message_id:
                logger.warning(f"Konnte Benutzerfrage nicht speichern für Session {session_id_to_use}")
        except Exception as e:
            logger.error(f"Fehler beim Speichern der Benutzerfrage: {e}")
            # Wir setzen fort, auch wenn die Speicherung fehlschlägt
        
        # Überprüfe, ob einfache Sprache verwendet werden soll
        use_simple_language = False
        if request_obj.headers.get("X-Use-Simple-Language", "").lower() in ['true', '1', 'yes']:
            use_simple_language = True
            logger.info("Einfache Sprache aktiviert via HTTP-Header")
        
        # Beantworte die Frage
        result = await rag_engine.answer_question(question, user_id, use_simple_language)
        if not result['success']:
            raise ValueError(result['message'])
        
        # Prüfe, ob die Antwort Englisch sein könnte
        answer = result['answer']
        english_keywords = ['the', 'this', 'that', 'and', 'for', 'with', 'from', 'here', 'there', 'question']
        german_keywords = ['der', 'die', 'das', 'und', 'für', 'mit', 'von', 'hier', 'dort', 'frage']
        
        english_count = sum(1 for word in english_keywords if f" {word} " in f" {answer.lower()} ")
        german_count = sum(1 for word in german_keywords if f" {word} " in f" {answer.lower()} ")
        
        # Wenn die Antwort wahrscheinlich Englisch ist
        if english_count > german_count:
            answer = "Entschuldigung, aber ich konnte nur eine englische Antwort generieren. " \
                    "Hier ist die relevanteste Information auf Deutsch:\n\n" + \
                    "\n".join([chunk['text'][:200] for chunk in result['chunks'][:1]])
            
            result['answer'] = answer
        
        # Speichere die Antwort
        try:
            message_id = chat_history.add_message(session_id_to_use, result['answer'], is_user=False)
            if not message_id:
                logger.warning(f"Konnte Antwort nicht speichern für Session {session_id_to_use}")
        except Exception as e:
            logger.error(f"Fehler beim Speichern der Antwort: {e}")
            # Wir setzen fort, auch wenn die Speicherung fehlschlägt
        
        # Erfolgreich
        return {
            "answer": result['answer'],
            "session_id": session_id_to_use,
            "message_id": message_id,
            "sources": result['sources'],
            "cached": result.get('cached', False)
        }
    
    except ValueError as ve:
        # Explizite Validierungsfehler
        logger.warning(f"Validierungsfehler: {str(ve)}")
        raise HTTPException(
            status_code=422,
            detail={
                "error": "validation_error",
                "message": str(ve),
                "params": {
                    "question": question,
                    "session_id": session_id
                }
            }
        )
    except Exception as e:
        # Unerwartete Fehler
        logger.error(f"Unerwarteter Fehler bei der Fragenverarbeitung: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Interner Serverfehler: {str(e)}"
        )