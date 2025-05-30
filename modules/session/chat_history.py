import sqlite3
import time
import json
from typing import Dict, Any, List, Optional

from ..core.config import Config
from ..core.logging import LogManager
from .title_generator import SessionTitleGenerator

logger = LogManager.setup_logging()

class ChatHistoryManager:
    """Verwaltet Chat-Verlauf und Sitzungen für Benutzer"""
    
    def __init__(self):
        self.init_db()
        self.title_generator = SessionTitleGenerator()
    
    def init_db(self):
        """Initialisiert die Datenbank für Chat-Verläufe"""
        conn = sqlite3.connect(Config.DB_PATH)
        cursor = conn.cursor()
        
        # Chat-Sessions Tabelle
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS chat_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
        ''')
        
        # Chat-Nachrichten Tabelle
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS chat_messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id INTEGER NOT NULL,
            is_user BOOLEAN NOT NULL,
            message TEXT NOT NULL,
            created_at INTEGER NOT NULL,
            FOREIGN KEY (session_id) REFERENCES chat_sessions(id)
        )
        ''')
        
        conn.commit()
        conn.close()
        
        logger.info("Chat-Datenbank initialisiert")
    
    def create_session(self, user_id: int, title: str = "Neue Unterhaltung") -> Optional[int]:
        """Erstellt eine neue Chat-Session"""
        try:
            now = int(time.time())
            
            conn = sqlite3.connect(Config.DB_PATH)
            cursor = conn.cursor()
            
            cursor.execute(
                "INSERT INTO chat_sessions (user_id, title, created_at, updated_at) VALUES (?, ?, ?, ?)",
                (user_id, title, now, now)
            )
            
            session_id = cursor.lastrowid
            conn.commit()
            conn.close()
            
            logger.info(f"Neue Session erstellt: ID {session_id}, Titel '{title}'")
            return session_id
        
        except Exception as e:
            logger.error(f"Fehler beim Erstellen einer Chat-Session: {e}")
            return None
    
    def add_message(self, session_id: int, message: str, is_user: bool = True) -> Optional[int]:
        """Fügt eine Nachricht zum Chat-Verlauf hinzu und aktualisiert ggf. den Titel"""
        try:
            now = int(time.time())
            
            conn = sqlite3.connect(Config.DB_PATH)
            cursor = conn.cursor()
            
            # Nachricht hinzufügen
            cursor.execute(
                "INSERT INTO chat_messages (session_id, is_user, message, created_at) VALUES (?, ?, ?, ?)",
                (session_id, is_user, message, now)
            )
            
            message_id = cursor.lastrowid
            
            # Session-Zeitstempel aktualisieren
            cursor.execute(
                "UPDATE chat_sessions SET updated_at = ? WHERE id = ?",
                (now, session_id)
            )
            
            # Wenn dies eine Benutzernachricht ist, aktualisiere den Titel
            if is_user:
                # Prüfen, ob es die erste Benutzernachricht ist
                cursor.execute(
                    "SELECT COUNT(*) FROM chat_messages WHERE session_id = ? AND is_user = 1",
                    (session_id,)
                )
                message_count = cursor.fetchone()[0]
                
                logger.info(f"Nachricht hinzugefügt zu Session {session_id}: Nachrichtenzähler = {message_count}")
                
                # KRITISCHE ÄNDERUNG: IMMER den Titel aktualisieren, wenn es eine Benutzernachricht ist
                # Generiere neuen Titel basierend auf der Nachricht
                new_title = self.title_generator.generate_title(message)
                
                # Prüfe, ob der aktuelle Titel der Standardtitel ist
                cursor.execute(
                    "SELECT title FROM chat_sessions WHERE id = ?",
                    (session_id,)
                )
                current_title = cursor.fetchone()[0]
                
                logger.info(f"Session {session_id} - Aktueller Titel: '{current_title}', Neuer Titel: '{new_title}'")
                
                # Bei "Neue Unterhaltung" oder bei der ersten Nachricht IMMER aktualisieren
                if current_title == "Neue Unterhaltung" or message_count == 1:
                    cursor.execute(
                        "UPDATE chat_sessions SET title = ? WHERE id = ?",
                        (new_title, session_id)
                    )
                    logger.info(f"Session-Titel für {session_id} aktualisiert: '{new_title}'")
            
            conn.commit()
            conn.close()
            
            return message_id
    
        except Exception as e:
            logger.error(f"Fehler beim Hinzufügen einer Nachricht: {e}")
            return None
    
    def get_session_history(self, session_id: int) -> List[Dict[str, Any]]:
        """Gibt den Chatverlauf einer Session zurück"""
        try:
            conn = sqlite3.connect(Config.DB_PATH)
            cursor = conn.cursor()
            
            cursor.execute(
                "SELECT id, is_user, message, created_at FROM chat_messages WHERE session_id = ? ORDER BY created_at",
                (session_id,)
            )
            
            messages = []
            for row in cursor.fetchall():
                # Wichtig: is_user korrekt als Boolean umwandeln
                messages.append({
                    'id': row[0],
                    'is_user': bool(row[1]),
                    'message': row[2],
                    'timestamp': row[3]
                })
            
            conn.close()
            return messages
        
        except Exception as e:
            logger.error(f"Fehler beim Abrufen des Chatverlaufs: {e}")
            return []
    
    def get_user_sessions(self, user_id: int) -> List[Dict[str, Any]]:
        """Gibt alle Chat-Sessions eines Benutzers zurück"""
        try:
            conn = sqlite3.connect(Config.DB_PATH)
            cursor = conn.cursor()
            
            cursor.execute(
                "SELECT id, title, created_at, updated_at FROM chat_sessions WHERE user_id = ? ORDER BY updated_at DESC",
                (user_id,)
            )
            
            sessions = []
            for row in cursor.fetchall():
                sessions.append({
                    'id': row[0],
                    'title': row[1],
                    'created_at': row[2],
                    'updated_at': row[3]
                })
            
            conn.close()
            logger.info(f"Abgerufene Sessions für Benutzer {user_id}: {len(sessions)}")
            return sessions
        
        except Exception as e:
            logger.error(f"Fehler beim Abrufen der Benutzer-Sessions: {e}")
            return []
    
    def delete_session(self, session_id: int, user_id: int) -> bool:
        """Löscht eine Chat-Session und alle zugehörigen Nachrichten"""
        try:
            conn = sqlite3.connect(Config.DB_PATH)
            cursor = conn.cursor()
            
            # Überprüfe, ob die Session dem Benutzer gehört
            cursor.execute(
                "SELECT id FROM chat_sessions WHERE id = ? AND user_id = ?",
                (session_id, user_id)
            )
            
            if not cursor.fetchone():
                conn.close()
                return False
            
            # Lösche alle Nachrichten der Session
            cursor.execute(
                "DELETE FROM chat_messages WHERE session_id = ?",
                (session_id,)
            )
            
            # Lösche die Session
            cursor.execute(
                "DELETE FROM chat_sessions WHERE id = ?",
                (session_id,)
            )
            
            conn.commit()
            conn.close()
            
            logger.info(f"Session {session_id} erfolgreich gelöscht")
            return True
        
        except Exception as e:
            logger.error(f"Fehler beim Löschen einer Chat-Session: {e}")
            return False
    
    def rename_session(self, session_id: int, user_id: int, new_title: str) -> bool:
        """Benennt eine Chat-Session um"""
        try:
            conn = sqlite3.connect(Config.DB_PATH)
            cursor = conn.cursor()
            
            # Überprüfe, ob die Session dem Benutzer gehört
            cursor.execute(
                "SELECT id FROM chat_sessions WHERE id = ? AND user_id = ?",
                (session_id, user_id)
            )
            
            if not cursor.fetchone():
                conn.close()
                return False
            
            # Benenne die Session um
            cursor.execute(
                "UPDATE chat_sessions SET title = ? WHERE id = ?",
                (new_title, session_id)
            )
            
            conn.commit()
            conn.close()
            
            logger.info(f"Session {session_id} umbenannt zu '{new_title}'")
            return True
        
        except Exception as e:
            logger.error(f"Fehler beim Umbenennen einer Chat-Session: {e}")
            return False
    
    def update_session_after_message(self, session_id: int) -> bool:
        """
        Aktualisiert den Sitzungstitel basierend auf der ersten Benutzeranfrage.
        Diese Funktion kann explizit aufgerufen werden, wenn der Titel nicht automatisch aktualisiert wurde.
        """
        try:
            conn = sqlite3.connect(Config.DB_PATH)
            cursor = conn.cursor()
            
            # Hole die erste Benutzernachricht der Session
            cursor.execute(
                "SELECT message FROM chat_messages WHERE session_id = ? AND is_user = 1 ORDER BY created_at ASC LIMIT 1",
                (session_id,)
            )
            
            result = cursor.fetchone()
            if not result:
                conn.close()
                logger.warning(f"Keine Benutzernachricht in Session {session_id} gefunden")
                return False
            
            first_message = result[0]
            
            # Generiere neuen Titel
            new_title = self.title_generator.generate_title(first_message)
            
            # Aktualisiere den Titel
            cursor.execute(
                "UPDATE chat_sessions SET title = ? WHERE id = ?",
                (new_title, session_id)
            )
            
            conn.commit()
            conn.close()
            
            logger.info(f"Session-Titel für {session_id} nachträglich aktualisiert: '{new_title}'")
            return True
            
        except Exception as e:
            logger.error(f"Fehler beim nachträglichen Aktualisieren des Session-Titels: {e}")
            return False