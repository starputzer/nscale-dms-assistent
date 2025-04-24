import sqlite3
import time
from typing import Dict, Any, Optional, List
import json

from ..core.config import Config
from ..core.logging import LogManager

logger = LogManager.setup_logging(__name__)

class FeedbackManager:
    """Verwaltet Feedback zu Chat-Antworten (Daumen hoch/runter)"""
    
    def __init__(self):
        self.init_db()
    
    def init_db(self):
        """Initialisiert die Feedback-Datenbank"""
        conn = sqlite3.connect(Config.DB_PATH)
        cursor = conn.cursor()
        
        try:
            # Feedback-Tabelle erstellen falls nicht vorhanden
            cursor.execute('''
            CREATE TABLE IF NOT EXISTS message_feedback (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                message_id INTEGER NOT NULL,
                session_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                is_positive BOOLEAN NOT NULL,
                comment TEXT,
                created_at INTEGER NOT NULL,
                FOREIGN KEY (message_id) REFERENCES chat_messages(id),
                FOREIGN KEY (session_id) REFERENCES chat_sessions(id),
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
            ''')
            
            conn.commit()
            logger.info("Feedback-Datenbank initialisiert")
        except Exception as e:
            logger.error(f"Fehler bei Feedback-Datenbankinitialisierung: {e}")
            conn.rollback()
        finally:
            conn.close()
    
    def add_feedback(self, message_id: int, session_id: int, user_id: int, 
                     is_positive: bool, comment: Optional[str] = None) -> bool:
        """Fügt Feedback zu einer Nachricht hinzu oder aktualisiert es"""
        try:
            now = int(time.time())
            
            conn = sqlite3.connect(Config.DB_PATH)
            cursor = conn.cursor()
            
            # Prüfen, ob bereits Feedback für diese Nachricht vom Benutzer existiert
            cursor.execute(
                "SELECT id FROM message_feedback WHERE message_id = ? AND user_id = ?",
                (message_id, user_id)
            )
            existing = cursor.fetchone()
            
            if existing:
                # Feedback aktualisieren
                cursor.execute(
                    "UPDATE message_feedback SET is_positive = ?, comment = ? WHERE id = ?",
                    (is_positive, comment, existing[0])
                )
                logger.info(f"Feedback für Nachricht {message_id} aktualisiert")
            else:
                # Neues Feedback erstellen
                cursor.execute(
                    """INSERT INTO message_feedback 
                       (message_id, session_id, user_id, is_positive, comment, created_at) 
                       VALUES (?, ?, ?, ?, ?, ?)""",
                    (message_id, session_id, user_id, is_positive, comment, now)
                )
                logger.info(f"Neues Feedback für Nachricht {message_id} erstellt")
            
            conn.commit()
            conn.close()
            return True
        
        except Exception as e:
            logger.error(f"Fehler beim Hinzufügen von Feedback: {e}")
            return False
    
    def get_message_feedback(self, message_id: int) -> Optional[Dict[str, Any]]:
        """Gibt das Feedback für eine bestimmte Nachricht zurück"""
        try:
            conn = sqlite3.connect(Config.DB_PATH)
            cursor = conn.cursor()
            
            cursor.execute(
                """SELECT id, user_id, is_positive, comment, created_at 
                   FROM message_feedback WHERE message_id = ?""",
                (message_id,)
            )
            
            feedback = cursor.fetchone()
            conn.close()
            
            if feedback:
                return {
                    'id': feedback[0],
                    'user_id': feedback[1],
                    'is_positive': bool(feedback[2]),
                    'comment': feedback[3],
                    'created_at': feedback[4]
                }
            return None
        
        except Exception as e:
            logger.error(f"Fehler beim Abrufen von Feedback: {e}")
            return None
    
    def get_user_feedback(self, user_id: int) -> List[Dict[str, Any]]:
        """Gibt alle Feedback-Einträge eines Benutzers zurück"""
        try:
            conn = sqlite3.connect(Config.DB_PATH)
            cursor = conn.cursor()
            
            cursor.execute(
                """SELECT f.id, f.message_id, f.session_id, f.is_positive, f.comment, 
                         f.created_at, m.message 
                   FROM message_feedback f
                   JOIN chat_messages m ON f.message_id = m.id
                   WHERE f.user_id = ?
                   ORDER BY f.created_at DESC""",
                (user_id,)
            )
            
            feedback_list = []
            for row in cursor.fetchall():
                feedback_list.append({
                    'id': row[0],
                    'message_id': row[1],
                    'session_id': row[2],
                    'is_positive': bool(row[3]),
                    'comment': row[4],
                    'created_at': row[5],
                    'message_preview': row[6][:100] + '...' if len(row[6]) > 100 else row[6]
                })
            
            conn.close()
            return feedback_list
        
        except Exception as e:
            logger.error(f"Fehler beim Abrufen des Benutzer-Feedbacks: {e}")
            return []
    
    def get_feedback_stats(self) -> Dict[str, Any]:
        """Gibt Statistiken zum gesammelten Feedback zurück (für Admins)"""
        try:
            conn = sqlite3.connect(Config.DB_PATH)
            cursor = conn.cursor()
            
            # Gesamtanzahl der Feedbacks
            cursor.execute("SELECT COUNT(*) FROM message_feedback")
            total = cursor.fetchone()[0]
            
            # Anzahl positiver Feedbacks
            cursor.execute("SELECT COUNT(*) FROM message_feedback WHERE is_positive = 1")
            positive = cursor.fetchone()[0]
            
            # Anzahl negativer Feedbacks
            cursor.execute("SELECT COUNT(*) FROM message_feedback WHERE is_positive = 0")
            negative = cursor.fetchone()[0]
            
            # Prozentsatz
            positive_percent = (positive / total * 100) if total > 0 else 0
            
            conn.close()
            
            return {
                'total': total,
                'positive': positive,
                'negative': negative,
                'positive_percent': round(positive_percent, 2)
            }
        
        except Exception as e:
            logger.error(f"Fehler beim Abrufen der Feedback-Statistiken: {e}")
            return {
                'total': 0,
                'positive': 0,
                'negative': 0,
                'positive_percent': 0
            }
    
    def get_negative_feedback_messages(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Gibt die Nachrichten mit negativem Feedback zurück (für Admins)"""
        try:
            conn = sqlite3.connect(Config.DB_PATH)
            cursor = conn.cursor()
            
            cursor.execute(
                """SELECT f.id, f.message_id, f.session_id, f.user_id, f.comment, 
                         f.created_at, m.message, u.email 
                   FROM message_feedback f
                   JOIN chat_messages m ON f.message_id = m.id
                   JOIN users u ON f.user_id = u.id
                   WHERE f.is_positive = 0
                   ORDER BY f.created_at DESC
                   LIMIT ?""",
                (limit,)
            )
            
            feedback_list = []
            for row in cursor.fetchall():
                feedback_list.append({
                    'id': row[0],
                    'message_id': row[1],
                    'session_id': row[2],
                    'user_id': row[3],
                    'comment': row[4],
                    'created_at': row[5],
                    'message': row[6],
                    'user_email': row[7]
                })
            
            conn.close()
            return feedback_list
        
        except Exception as e:
            logger.error(f"Fehler beim Abrufen der negativen Feedbacks: {e}")
            return []