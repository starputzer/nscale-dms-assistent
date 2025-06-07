<<<<<<< HEAD
"""
Feedback Manager - Handles user feedback storage and retrieval
"""

from typing import Dict, Any, List, Optional
from datetime import datetime
import logging
import uuid

from modules.core.db import DBManager

logger = logging.getLogger(__name__)

class FeedbackManager:
    def __init__(self):
        self.db_manager = DBManager()
        self._ensure_tables()
    
    def _ensure_tables(self):
        """Ensure feedback table exists"""
        try:
            with self.db_manager.get_session() as session:
                session.execute("""
                    CREATE TABLE IF NOT EXISTS feedback (
                        id TEXT PRIMARY KEY,
                        message_id TEXT NOT NULL,
                        session_id TEXT NOT NULL,
                        user_id TEXT NOT NULL,
                        rating INTEGER DEFAULT 0,
                        question TEXT,
                        answer TEXT,
                        comment TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        status TEXT DEFAULT 'pending'
                    )
                """)
                session.commit()
        except Exception as e:
            logger.error(f"Error creating feedback table: {e}")
    
    def add_feedback(
        self,
        message_id: str,
        session_id: str,
        user_id: str,
        rating: int,
        question: str = "",
        answer: str = "",
        comment: str = ""
    ) -> str:
        """Add feedback for a message"""
        try:
            feedback_id = str(uuid.uuid4())
            
            with self.db_manager.get_session() as session:
                session.execute("""
                    INSERT INTO feedback 
                    (id, message_id, session_id, user_id, rating, question, answer, comment)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    feedback_id,
                    message_id,
                    session_id,
                    user_id,
                    rating,
                    question,
                    answer,
                    comment
                ))
                session.commit()
            
            logger.info(f"Feedback added: {feedback_id}")
            return feedback_id
            
        except Exception as e:
            logger.error(f"Error adding feedback: {e}")
            return None
    
    def get_feedback_stats(self) -> Dict[str, Any]:
        """Get feedback statistics"""
        try:
            with self.db_manager.get_session() as session:
                total = session.execute("SELECT COUNT(*) FROM feedback").fetchone()[0]
                positive = session.execute(
                    "SELECT COUNT(*) FROM feedback WHERE rating > 0"
                ).fetchone()[0]
                negative = session.execute(
                    "SELECT COUNT(*) FROM feedback WHERE rating < 0"
                ).fetchone()[0]
                
                avg_rating = session.execute(
                    "SELECT AVG(rating) FROM feedback WHERE rating != 0"
                ).fetchone()[0] or 0
            
            return {
                "total": total,
                "positive": positive,
                "negative": negative,
                "average_rating": round(avg_rating, 2)
            }
            
        except Exception as e:
            logger.error(f"Error getting feedback stats: {e}")
            return {"total": 0, "positive": 0, "negative": 0, "average_rating": 0}
=======
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
                question TEXT,    -- Neue Spalte für die ursprüngliche Frage
                answer TEXT,      -- Neue Spalte für die Antwort
                created_at INTEGER NOT NULL,
                FOREIGN KEY (message_id) REFERENCES chat_messages(id),
                FOREIGN KEY (session_id) REFERENCES chat_sessions(id),
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
            ''')

            # Prüfen, ob die Spalten für Frage und Antwort bereits existieren
            cursor.execute("PRAGMA table_info(message_feedback)")
            columns = cursor.fetchall()
            column_names = [col[1] for col in columns]
            
            # Füge die Spalten hinzu, wenn sie noch nicht existieren
            if 'question' not in column_names:
                cursor.execute("ALTER TABLE message_feedback ADD COLUMN question TEXT")
                logger.info("Spalte 'question' zur message_feedback-Tabelle hinzugefügt")
            
            if 'answer' not in column_names:
                cursor.execute("ALTER TABLE message_feedback ADD COLUMN answer TEXT")
                logger.info("Spalte 'answer' zur message_feedback-Tabelle hinzugefügt")
            
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
            
            # Hole die entsprechende Nachricht und die zugehörige Benutzerfrage
            cursor.execute("""
                SELECT m1.message AS answer, m2.message AS question
                FROM chat_messages m1
                JOIN chat_messages m2 ON m2.session_id = m1.session_id 
                    AND m2.is_user = 1 
                    AND m2.created_at < m1.created_at
                WHERE m1.id = ? AND m1.is_user = 0
                ORDER BY m2.created_at DESC
                LIMIT 1
            """, (message_id,))
            
            message_data = cursor.fetchone()
            
            question = None
            answer = None
            
            if message_data:
                answer = message_data[0]
                question = message_data[1]
                logger.info(f"Frage und Antwort für Feedback gefunden: Q={question[:50]}..., A={answer[:50]}...")
            else:
                # Direkter Abruf der Nachricht, wenn keine vorherige Benutzerfrage gefunden wird
                cursor.execute(
                    "SELECT message FROM chat_messages WHERE id = ?",
                    (message_id,)
                )
                message_result = cursor.fetchone()
                if message_result:
                    answer = message_result[0]
                    logger.info(f"Nur Antwort für Feedback gefunden: A={answer[:50]}...")
            
            # Prüfen, ob bereits Feedback für diese Nachricht vom Benutzer existiert
            cursor.execute(
                "SELECT id FROM message_feedback WHERE message_id = ? AND user_id = ?",
                (message_id, user_id)
            )
            existing = cursor.fetchone()
            
            if existing:
                # Feedback aktualisieren
                cursor.execute(
                    "UPDATE message_feedback SET is_positive = ?, comment = ?, question = ?, answer = ? WHERE id = ?",
                    (is_positive, comment, question, answer, existing[0])
                )
                logger.info(f"Feedback für Nachricht {message_id} aktualisiert")
            else:
                # Neues Feedback erstellen
                cursor.execute(
                    """INSERT INTO message_feedback 
                       (message_id, session_id, user_id, is_positive, comment, question, answer, created_at) 
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                    (message_id, session_id, user_id, is_positive, comment, question, answer, now)
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
                """SELECT id, user_id, is_positive, comment, question, answer, created_at 
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
                    'question': feedback[4],
                    'answer': feedback[5],
                    'created_at': feedback[6]
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
                         f.created_at, f.question, f.answer
                   FROM message_feedback f
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
                    'question': row[6],
                    'answer': row[7],
                    'answer_preview': row[7][:100] + '...' if row[7] and len(row[7]) > 100 else row[7]
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
    
    def get_all_feedback_messages(self, limit: int = 1000) -> List[Dict[str, Any]]:
        """Gibt alle Feedback-Nachrichten zurück (für Admins)"""
        try:
            conn = sqlite3.connect(Config.DB_PATH)
            cursor = conn.cursor()
            
            cursor.execute(
                """SELECT f.id, f.message_id, f.session_id, f.user_id, f.is_positive, f.comment, 
                         f.created_at, f.question, f.answer, u.email 
                   FROM message_feedback f
                   JOIN users u ON f.user_id = u.id
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
                    'is_positive': bool(row[4]),
                    'comment': row[5],
                    'created_at': row[6],
                    'question': row[7],
                    'answer': row[8],
                    'user_email': row[9],
                    'status': 'resolved' if row[4] else 'unresolved'  # Mock status based on feedback type
                })
            
            conn.close()
            return feedback_list
        
        except Exception as e:
            logger.error(f"Fehler beim Abrufen aller Feedbacks: {e}")
            return []
    
    def get_negative_feedback_messages(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Gibt die Nachrichten mit negativem Feedback zurück (für Admins)"""
        try:
            conn = sqlite3.connect(Config.DB_PATH)
            cursor = conn.cursor()
            
            cursor.execute(
                """SELECT f.id, f.message_id, f.session_id, f.user_id, f.comment, 
                         f.created_at, f.question, f.answer, u.email 
                   FROM message_feedback f
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
                    'question': row[6],
                    'answer': row[7],
                    'user_email': row[8]
                })
            
            conn.close()
            return feedback_list
        
        except Exception as e:
            logger.error(f"Fehler beim Abrufen der negativen Feedbacks: {e}")
            return []
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da
