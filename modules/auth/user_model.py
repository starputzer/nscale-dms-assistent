# In modules/auth/user_model.py
import os
import sqlite3
import hashlib
import secrets
import time
import jwt
from ..core.config import Config
from ..core.logging import LogManager

logger = LogManager.setup_logging(__name__)

class UserRole:
    """Definiert verfügbare Benutzerrollen"""
    USER = "user"      # Standardnutzer
    ADMIN = "admin"    # Administrator

class UserManager:
    """Verwaltet Benutzeroperationen und Authentifizierung mit Rollenunterstützung"""
    
    # Liste von Admin-E-Mails, die automatisch Admin-Rechte erhalten    
    def __init__(self):
        admin_emails_str = os.getenv('ADMIN_EMAILS')
        self.ADMIN_EMAILS = [email.strip() for email in admin_emails_str.split(',')]
        self.init_db()
        
        # Bestehende Benutzer aktualisieren, um sicherzustellen, dass Admin-E-Mails als Admin gekennzeichnet sind
        self._update_existing_admin_users()
    
    def init_db(self):
        """Initialisiert die Benutzerdatenbank mit Unterstützung für Rollen"""
        conn = sqlite3.connect(Config.DB_PATH)
        cursor = conn.cursor()
        
        try:
            # Prüfe, ob die Tabelle schon existiert
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")
            table_exists = cursor.fetchone()
            
            if table_exists:
                # Prüfe, ob role-Spalte existiert
                cursor.execute("PRAGMA table_info(users)")
                columns = cursor.fetchall()
                column_names = [col[1] for col in columns]
                
                # Füge role-Spalte hinzu, wenn sie nicht existiert
                if 'role' not in column_names:
                    logger.info("Füge 'role'-Spalte zur users-Tabelle hinzu")
                    cursor.execute("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'")
                    conn.commit()
            else:
                # Erstelle Tabelle, wenn sie nicht existiert
                logger.info("Erstelle users-Tabelle mit Rollenunterstützung")
                cursor.execute('''
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    email TEXT UNIQUE NOT NULL,
                    password_hash TEXT NOT NULL,
                    role TEXT DEFAULT 'user',
                    reset_token TEXT,
                    reset_token_expiry INTEGER,
                    created_at INTEGER NOT NULL,
                    last_login INTEGER
                )
                ''')
                conn.commit()
            
        except Exception as e:
            logger.error(f"Fehler bei Datenbankinitialisierung: {e}")
            conn.rollback()
        finally:
            conn.close()
    
    def _hash_password(self, password):
        """Erstellt einen sicheren Hash für das Passwort"""
        return hashlib.pbkdf2_hmac(
            'sha256', 
            password.encode(), 
            Config.PASSWORD_SALT.encode(), 
            100000
        ).hex()
    
    def register_user(self, email, password, role=None):
        """Registriert einen neuen Benutzer mit Rollenbestimmung anhand der E-Mail"""
        # Bestimme Rolle (Admin für spezielle E-Mails, sonst User)
        if role is None:
            role = UserRole.ADMIN if email.lower() in [e.lower() for e in self.ADMIN_EMAILS] else UserRole.USER
            
        password_hash = self._hash_password(password)
        now = int(time.time())
        
        try:
            conn = sqlite3.connect(Config.DB_PATH)
            cursor = conn.cursor()
            
            cursor.execute(
                "INSERT INTO users (email, password_hash, role, created_at) VALUES (?, ?, ?, ?)",
                (email, password_hash, role, now)
            )
            
            user_id = cursor.lastrowid
            conn.commit()
            conn.close()
            
            logger.info(f"Benutzer {email} mit Rolle {role} registriert")
            return True
        except sqlite3.IntegrityError:
            # Email existiert bereits
            logger.warning(f"Registrierungsversuch mit bereits existierender E-Mail: {email}")
            return False
        except Exception as e:
            logger.error(f"Fehler bei Benutzerregistrierung: {e}")
            return False
    
    def authenticate(self, email, password):
        """Authentifiziert einen Benutzer und gibt ein JWT-Token zurück"""
        password_hash = self._hash_password(password)
        
        conn = sqlite3.connect(Config.DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute(
            "SELECT id, email, role FROM users WHERE email = ? AND password_hash = ?",
            (email, password_hash)
        )
        
        user = cursor.fetchone()
        
        if user:
            # Aktualisiere last_login
            cursor.execute(
                "UPDATE users SET last_login = ? WHERE id = ?",
                (int(time.time()), user[0])
            )
            conn.commit()
            
            # Erstelle JWT-Token mit Rolleninformation
            payload = {
                'user_id': user[0],
                'email': user[1],
                'role': user[2],
                'exp': int(time.time()) + Config.JWT_EXPIRATION
            }
            token = jwt.encode(payload, Config.SECRET_KEY, algorithm='HS256')
            
            conn.close()
            logger.info(f"Benutzer {email} erfolgreich authentifiziert mit Rolle {user[2]}")
            return token
        
        conn.close()
        logger.warning(f"Fehlgeschlagener Anmeldeversuch für E-Mail: {email}")
        return None
    
    def _update_existing_admin_users(self):
        """Aktualisiert bestehende Benutzer mit Admin-E-Mails zu Administratoren"""
        try:
            conn = sqlite3.connect(Config.DB_PATH)
            cursor = conn.cursor()
            
            for admin_email in self.ADMIN_EMAILS:
                cursor.execute(
                    "UPDATE users SET role = ? WHERE email = ? AND role != ?",
                    (UserRole.ADMIN, admin_email, UserRole.ADMIN)
                )
            
            if cursor.rowcount > 0:
                logger.info(f"Admin-Rollen für {cursor.rowcount} bestehende Benutzer aktualisiert")
            
            conn.commit()
            conn.close()
        except Exception as e:
            logger.error(f"Fehler beim Aktualisieren bestehender Admin-Benutzer: {e}")

    def update_user_role(self, user_id, new_role, admin_user_id):
        """Aktualisiert die Rolle eines Benutzers (nur für Admins)"""
        # Prüfe, ob der ausführende Benutzer Admin ist
        admin_role = self.get_user_role(admin_user_id)
        if admin_role != UserRole.ADMIN:
            logger.warning(f"Nicht-Admin (ID: {admin_user_id}) versuchte, Benutzerrolle zu ändern")
            return False
            
        if new_role not in [UserRole.USER, UserRole.ADMIN]:
            logger.warning(f"Ungültige Rolle angegeben: {new_role}")
            return False
            
        try:
            conn = sqlite3.connect(Config.DB_PATH)
            cursor = conn.cursor()
            
            cursor.execute(
                "UPDATE users SET role = ? WHERE id = ?",
                (new_role, user_id)
            )
            
            if cursor.rowcount == 0:
                logger.warning(f"Benutzer mit ID {user_id} nicht gefunden")
                conn.close()
                return False
                
            conn.commit()
            conn.close()
            
            logger.info(f"Rolle für Benutzer ID {user_id} aktualisiert auf {new_role} durch Admin ID {admin_user_id}")
            return True
        except Exception as e:
            logger.error(f"Fehler beim Aktualisieren der Benutzerrolle: {e}")
            return False
    
    def get_user_role(self, user_id):
        """Gibt die Rolle eines Benutzers zurück"""
        try:
            conn = sqlite3.connect(Config.DB_PATH)
            cursor = conn.cursor()
            
            cursor.execute(
                "SELECT role FROM users WHERE id = ?",
                (user_id,)
            )
            
            result = cursor.fetchone()
            conn.close()
            
            if result:
                return result[0]
            else:
                logger.warning(f"Benutzer mit ID {user_id} nicht gefunden")
                return None
        except Exception as e:
            logger.error(f"Fehler beim Abrufen der Benutzerrolle: {e}")
            return None
    
    def is_admin(self, user_id):
        """Prüft, ob ein Benutzer Admin-Rechte hat"""
        role = self.get_user_role(user_id)
        return role == UserRole.ADMIN
    
    def verify_token(self, token):
        """Überprüft ein JWT-Token und gibt Benutzerinformationen zurück"""
        try:
            payload = jwt.decode(token, Config.SECRET_KEY, algorithms=['HS256'])
            return payload
        except jwt.ExpiredSignatureError:
            logger.warning("Abgelaufenes Token verwendet")
            return None
        except jwt.InvalidTokenError:
            logger.warning("Ungültiges Token verwendet")
            return None
        except Exception as e:
            logger.error(f"Unerwarteter Fehler bei Token-Verifizierung: {e}")
            return None
            
    def get_all_users(self, admin_user_id):
        """Gibt eine Liste aller Benutzer zurück (nur für Admins)"""
        # Prüfe, ob anfragender Benutzer Admin ist
        if not self.is_admin(admin_user_id):
            logger.warning(f"Nicht-Admin (ID: {admin_user_id}) versuchte, Benutzerliste abzurufen")
            return None
            
        try:
            conn = sqlite3.connect(Config.DB_PATH)
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT id, email, role, created_at, last_login 
                FROM users 
                ORDER BY created_at DESC
            """)
            
            users = []
            for row in cursor.fetchall():
                users.append({
                    'id': row[0],
                    'email': row[1],
                    'role': row[2],
                    'created_at': row[3],
                    'last_login': row[4]
                })
            
            conn.close()
            return users
        except Exception as e:
            logger.error(f"Fehler beim Abrufen der Benutzerliste: {e}")
            return None