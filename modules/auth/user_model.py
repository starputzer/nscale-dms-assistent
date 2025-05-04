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
    USER = "user"                    # Standardnutzer
    ADMIN = "admin"                  # Administrator
    FEEDBACK_ANALYST = "feedback_analyst"  # Feedback-Auswerter

class UserManager:
    """Verwaltet Benutzeroperationen und Authentifizierung mit Rollenunterstützung"""
    
    # Liste von Admin-E-Mails, die automatisch Admin-Rechte erhalten    
    def __init__(self):
        # Admin-E-Mails aus Umgebungsvariablen laden
        admin_emails_str = os.getenv('ADMIN_EMAILS', '')
        self.ADMIN_EMAILS = [email.strip() for email in admin_emails_str.split(',') if email.strip()]
        print(f"Admin-E-Mails geladen: {self.ADMIN_EMAILS}")  # Debug-Ausgabe
        self.init_db()
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
            
            # Überprüfe zuerst, ob die E-Mail-Adresse (case-insensitive) bereits existiert
            cursor.execute("SELECT id FROM users WHERE LOWER(email) = LOWER(?)", (email,))
            existing_user = cursor.fetchone()
            
            if existing_user:
                logger.warning(f"Registrierungsversuch mit bereits existierender E-Mail: {email}")
                conn.close()
                return False
            
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
        
        # Case-insensitive Vergleich für E-Mail-Adresse durch Umwandlung zu Kleinbuchstaben
        cursor.execute(
            "SELECT id, email, role FROM users WHERE LOWER(email) = LOWER(?) AND password_hash = ?",
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
        if not self.ADMIN_EMAILS:
            print("Keine Admin-E-Mails definiert!")
            return
            
        try:
            conn = sqlite3.connect(Config.DB_PATH)
            cursor = conn.cursor()
            
            for admin_email in self.ADMIN_EMAILS:
                # Prüfen, ob der Benutzer existiert (case-insensitive)
                cursor.execute("SELECT id, role FROM users WHERE LOWER(email) = LOWER(?)", (admin_email,))
                user = cursor.fetchone()
                
                if user:
                    user_id, current_role = user
                    if current_role != 'admin':
                        cursor.execute(
                            "UPDATE users SET role = ? WHERE id = ?",
                            ('admin', user_id)
                        )
                        print(f"Benutzer {admin_email} (ID: {user_id}) zum Admin aktualisiert")
                    else:
                        print(f"Benutzer {admin_email} (ID: {user_id}) ist bereits Admin")
                else:
                    print(f"Kein Benutzer mit E-Mail {admin_email} gefunden")
            
            conn.commit()
            conn.close()
        except Exception as e:
            print(f"Fehler beim Aktualisieren der Admin-Benutzer: {e}")

    def update_user_role(self, user_id, new_role, admin_user_id):
        """Aktualisiert die Rolle eines Benutzers (nur für Admins)"""
        # Prüfe, ob der ausführende Benutzer Admin ist
        admin_role = self.get_user_role(admin_user_id)
        if admin_role != UserRole.ADMIN:
            logger.warning(f"Nicht-Admin (ID: {admin_user_id}) versuchte, Benutzerrolle zu ändern")
            return False
            
        if new_role not in [UserRole.USER, UserRole.ADMIN, UserRole.FEEDBACK_ANALYST]:
            logger.warning(f"Ungültige Rolle angegeben: {new_role}")
            return False
        
        # NEU: Prüfe, ob ein Admin versucht, seine eigene Rolle zu ändern
        if user_id == admin_user_id:
            logger.warning(f"Admin (ID: {admin_user_id}) versuchte, eigene Rolle zu ändern")
            return False
        
        # NEU: Zähle die Anzahl der verbleibenden Administratoren
        if new_role == UserRole.USER:
            conn = sqlite3.connect(Config.DB_PATH)
            cursor = conn.cursor()
            
            # Prüfe, ob der zu ändernde Benutzer ein Admin ist
            cursor.execute("SELECT role FROM users WHERE id = ?", (user_id,))
            current_role = cursor.fetchone()
            
            if current_role and current_role[0] == UserRole.ADMIN:
                # Zähle verbleibende Admins
                cursor.execute("SELECT COUNT(*) FROM users WHERE role = ? AND id != ?", 
                               (UserRole.ADMIN, user_id))
                remaining_admins = cursor.fetchone()[0]
                
                # Stelle sicher, dass mindestens ein Admin übrig bleibt
                if remaining_admins == 0:
                    logger.warning(f"Kann letzten Admin (ID: {user_id}) nicht zu Benutzer herabstufen")
                    conn.close()
                    return False
            
            conn.close()
            
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

    def is_protected_admin(self, user_id):
        """Prüft, ob ein Benutzer ein geschützter Admin ist (über Admin-E-Mails eingetragen)"""
        try:
            conn = sqlite3.connect(Config.DB_PATH)
            cursor = conn.cursor()
            
            cursor.execute("SELECT email FROM users WHERE id = ?", (user_id,))
            result = cursor.fetchone()
            conn.close()
            
            if result:
                email = result[0]
                # Vergleich bereits case-insensitive mit lower() auf beiden Seiten
                return email.lower() in [e.lower() for e in self.ADMIN_EMAILS]
            return False
        except Exception as e:
            logger.error(f"Fehler beim Prüfen des geschützten Admin-Status: {e}")
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
        
    def is_feedback_analyst(self, user_id):
        """Prüft, ob ein Benutzer Feedback-Analyst-Rechte hat"""
        role = self.get_user_role(user_id)
        return role == UserRole.FEEDBACK_ANALYST
        
    def can_view_feedback(self, user_id):
        """Prüft, ob ein Benutzer Feedback-Daten sehen darf (Admin oder Feedback-Analyst)"""
        role = self.get_user_role(user_id)
        return role in [UserRole.ADMIN, UserRole.FEEDBACK_ANALYST]
    
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
            
    def initiate_password_reset(self, email):
        """Initiiert den Passwort-Reset-Prozess für einen Benutzer"""
        try:
            conn = sqlite3.connect(Config.DB_PATH)
            cursor = conn.cursor()
            
            # Überprüfe, ob die E-Mail existiert (case-insensitive)
            cursor.execute("SELECT id FROM users WHERE LOWER(email) = LOWER(?)", (email,))
            user = cursor.fetchone()
            
            if not user:
                logger.warning(f"Passwort-Reset angefordert für nicht existierende E-Mail: {email}")
                conn.close()
                return None
                
            # Generiere einen sicheren Token
            token = secrets.token_hex(32)
            # Token ist 24 Stunden gültig
            expiry = int(time.time()) + 86400
            
            # Speichere Token und Ablaufzeit in der Datenbank
            cursor.execute(
                "UPDATE users SET reset_token = ?, reset_token_expiry = ? WHERE id = ?",
                (token, expiry, user[0])
            )
            
            conn.commit()
            conn.close()
            
            logger.info(f"Passwort-Reset-Token generiert für Benutzer mit E-Mail: {email}")
            return token
            
        except Exception as e:
            logger.error(f"Fehler beim Initiieren des Passwort-Resets: {e}")
            return None
    
    def reset_password(self, token, new_password):
        """Setzt das Passwort eines Benutzers mit einem gültigen Token zurück"""
        if not token or not new_password:
            logger.warning("Ungültiger Token oder leeres Passwort beim Passwort-Reset")
            return False
            
        try:
            conn = sqlite3.connect(Config.DB_PATH)
            cursor = conn.cursor()
            
            # Hole Benutzer mit diesem Token
            current_time = int(time.time())
            cursor.execute(
                "SELECT id FROM users WHERE reset_token = ? AND reset_token_expiry > ?",
                (token, current_time)
            )
            
            user = cursor.fetchone()
            
            if not user:
                logger.warning(f"Ungültiger oder abgelaufener Reset-Token verwendet: {token[:8]}...")
                conn.close()
                return False
                
            # Hash das neue Passwort
            password_hash = self._hash_password(new_password)
            
            # Aktualisiere das Passwort und lösche den Token
            cursor.execute(
                "UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expiry = NULL WHERE id = ?",
                (password_hash, user[0])
            )
            
            conn.commit()
            conn.close()
            
            logger.info(f"Passwort erfolgreich zurückgesetzt für Benutzer ID: {user[0]}")
            return True
            
        except Exception as e:
            logger.error(f"Fehler beim Passwort-Reset: {e}")
            return False
            
    def delete_user(self, user_id, admin_user_id):
        """Löscht einen Benutzer (nur für Admins)"""
        # Prüfe, ob der ausführende Benutzer Admin ist
        if not self.is_admin(admin_user_id):
            logger.warning(f"Nicht-Admin (ID: {admin_user_id}) versuchte, Benutzer zu löschen")
            return False
            
        # NEU: Verbiete, dass ein Admin sich selbst löscht
        if user_id == admin_user_id:
            logger.warning(f"Admin (ID: {admin_user_id}) versuchte, sich selbst zu löschen")
            return False
            
        try:
            conn = sqlite3.connect(Config.DB_PATH)
            cursor = conn.cursor()
            
            # NEU: Prüfe, ob Zielbenutzer ein Admin ist
            cursor.execute("SELECT role FROM users WHERE id = ?", (user_id,))
            user_role = cursor.fetchone()
            
            if not user_role:
                logger.warning(f"Benutzer mit ID {user_id} nicht gefunden")
                conn.close()
                return False
                
            # NEU: Verbiete das Löschen von Admins
            if user_role[0] == UserRole.ADMIN:
                logger.warning(f"Admin (ID: {admin_user_id}) versuchte, anderen Admin (ID: {user_id}) zu löschen")
                conn.close()
                return False
                
            # NEU: Verbiete das Löschen von geschützten Admins
            if self.is_protected_admin(user_id):
                logger.warning(f"Versuch, geschützten Admin (ID: {user_id}) zu löschen")
                conn.close() 
                return False
                
            # Lösche den Benutzer
            cursor.execute("DELETE FROM users WHERE id = ?", (user_id,))
            
            if cursor.rowcount == 0:
                logger.warning(f"Benutzer mit ID {user_id} nicht gefunden")
                conn.close()
                return False
                
            conn.commit()
            conn.close()
            
            logger.info(f"Benutzer ID {user_id} wurde gelöscht durch Admin ID {admin_user_id}")
            return True
                
        except Exception as e:
            logger.error(f"Fehler beim Löschen des Benutzers: {e}")
            return False
            
    def initiate_password_reset(self, email):
        """Initiiert den Passwort-Reset-Prozess für eine angegebene E-Mail-Adresse"""
        try:
            conn = sqlite3.connect(Config.DB_PATH)
            cursor = conn.cursor()
            
            # Case-insensitive Suche nach der E-Mail-Adresse
            cursor.execute("SELECT id FROM users WHERE LOWER(email) = LOWER(?)", (email,))
            user = cursor.fetchone()
            
            if not user:
                logger.warning(f"Passwort-Reset angefordert für nicht existierende E-Mail: {email}")
                conn.close()
                return None
                
            # Generiere einen sicheren Token
            reset_token = secrets.token_hex(32)
            # Token läuft nach 24 Stunden ab
            expiry = int(time.time()) + 86400
            
            # Speichere Token und Ablaufzeit in der Datenbank
            cursor.execute(
                "UPDATE users SET reset_token = ?, reset_token_expiry = ? WHERE id = ?",
                (reset_token, expiry, user[0])
            )
            
            conn.commit()
            conn.close()
            
            logger.info(f"Passwort-Reset-Token für Benutzer mit E-Mail {email} generiert")
            return reset_token
            
        except Exception as e:
            logger.error(f"Fehler beim Initiieren des Passwort-Resets: {e}")
            return None
            
    def reset_password(self, token, new_password):
        """Setzt das Passwort mit einem gültigen Token zurück"""
        if not token or not new_password:
            return False
            
        try:
            conn = sqlite3.connect(Config.DB_PATH)
            cursor = conn.cursor()
            
            # Suche Benutzer mit diesem Token
            cursor.execute("SELECT id, reset_token_expiry FROM users WHERE reset_token = ?", (token,))
            result = cursor.fetchone()
            
            if not result:
                logger.warning(f"Passwort-Reset mit ungültigem Token versucht")
                conn.close()
                return False
                
            user_id, expiry = result
            
            # Prüfe, ob Token abgelaufen ist
            if expiry < time.time():
                logger.warning(f"Passwort-Reset mit abgelaufenem Token versucht")
                conn.close()
                return False
                
            # Setze neues Passwort und entferne Token
            password_hash = self._hash_password(new_password)
            cursor.execute(
                "UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expiry = NULL WHERE id = ?",
                (password_hash, user_id)
            )
            
            conn.commit()
            conn.close()
            
            logger.info(f"Passwort für Benutzer ID {user_id} erfolgreich zurückgesetzt")
            return True
            
        except Exception as e:
            logger.error(f"Fehler beim Zurücksetzen des Passworts: {e}")
            return False