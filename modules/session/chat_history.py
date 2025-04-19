import sqlite3
import time
import json
from typing import Dict, Any, List, Optional

from ..core.config import Config
from ..core.logging import LogManager

logger = LogManager.setup_logging()

class ChatHistoryManager:
    """Verwaltet Chat-Verlauf und Sitzungen für Benutzer"""
    
    def __init__(self):
        self.init_db()
    
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
            
            return session_id
        
        except Exception as e:
            logger.error(f"Fehler beim Erstellen einer Chat-Session: {e}")
            return None
    
    def add_message(self, session_id: int, message: str, is_user: bool = True) -> bool:
        """Fügt eine Nachricht zum Chat-Verlauf hinzu"""
        try:
            now = int(time.time())
            
            conn = sqlite3.connect(Config.DB_PATH)
            cursor = conn.cursor()
            
            # Nachricht hinzufügen
            cursor.execute(
                "INSERT INTO chat_messages (session_id, is_user, message, created_at) VALUES (?, ?, ?, ?)",
                (session_id, is_user, message, now)
            )
            
            # Session-Zeitstempel aktualisieren
            cursor.execute(
                "UPDATE chat_sessions SET updated_at = ? WHERE id = ?",
                (now, session_id)
            )
            
            conn.commit()
            conn.close()
            
            return True
        
        except Exception as e:
            logger.error(f"Fehler beim Hinzufügen einer Nachricht: {e}")
            return False
    
    def get_session_history(self, session_id: int) -> List[Dict[str, Any]]:
        """Gibt den Chatverlauf einer Session zurück"""
        try:
            conn = sqlite3.connect(Config.DB_PATH)
            cursor = conn.cursor()
            
            cursor.execute(
                "SELECT is_user, message, created_at FROM chat_messages WHERE session_id = ? ORDER BY created_at",
                (session_id,)
            )
            
            messages = []
            for row in cursor.fetchall():
                messages.append({
                    'is_user': bool(row[0]),
                    'message': row[1],
                    'timestamp': row[2]
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
            
            return True
        
        except Exception as e:
            logger.error(f"Fehler beim Umbenennen einer Chat-Session: {e}")
            return False
