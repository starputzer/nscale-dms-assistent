import sqlite3
import hashlib
import secrets
import time
import jwt
from ..core.config import Config

class UserManager:
    """Verwaltet Benutzeroperationen und Authentifizierung"""
    
    def __init__(self):
        self.init_db()
    
    def init_db(self):
        """Initialisiert die Benutzerdatenbank"""
        conn = sqlite3.connect(Config.DB_PATH)
        cursor = conn.cursor()
        
        # Benutzertabelle erstellen falls nicht vorhanden
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            reset_token TEXT,
            reset_token_expiry INTEGER,
            created_at INTEGER NOT NULL,
            last_login INTEGER
        )
        ''')
        
        conn.commit()
        conn.close()
    
    def _hash_password(self, password):
        """Erstellt einen sicheren Hash für das Passwort"""
        return hashlib.pbkdf2_hmac(
            'sha256', 
            password.encode(), 
            Config.PASSWORD_SALT.encode(), 
            100000
        ).hex()
    
    def register_user(self, email, password):
        """Registriert einen neuen Benutzer"""
        password_hash = self._hash_password(password)
        now = int(time.time())
        
        try:
            conn = sqlite3.connect(Config.DB_PATH)
            cursor = conn.cursor()
            
            cursor.execute(
                "INSERT INTO users (email, password_hash, created_at) VALUES (?, ?, ?)",
                (email, password_hash, now)
            )
            
            conn.commit()
            conn.close()
            return True
        except sqlite3.IntegrityError:
            # Email existiert bereits
            return False
    
    def authenticate(self, email, password):
        """Authentifiziert einen Benutzer und gibt ein JWT-Token zurück"""
        password_hash = self._hash_password(password)
        
        conn = sqlite3.connect(Config.DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute(
            "SELECT id, email FROM users WHERE email = ? AND password_hash = ?",
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
            
            # Erstelle JWT-Token
            payload = {
                'user_id': user[0],
                'email': user[1],
                'exp': int(time.time()) + Config.JWT_EXPIRATION
            }
            token = jwt.encode(payload, Config.SECRET_KEY, algorithm='HS256')
            
            conn.close()
            return token
        
        conn.close()
        return None
    
    def initiate_password_reset(self, email):
        """Initiiert den Passwort-Reset-Prozess"""
        conn = sqlite3.connect(Config.DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute("SELECT id FROM users WHERE email = ?", (email,))
        user = cursor.fetchone()
        
        if not user:
            conn.close()
            return None
        
        # Generiere Reset-Token
        reset_token = secrets.token_urlsafe(32)
        reset_token_expiry = int(time.time()) + 3600  # 1 Stunde gültig
        
        cursor.execute(
            "UPDATE users SET reset_token = ?, reset_token_expiry = ? WHERE id = ?",
            (reset_token, reset_token_expiry, user[0])
        )
        
        conn.commit()
        conn.close()
        
        return reset_token
    
    def reset_password(self, token, new_password):
        """Setzt das Passwort mit einem gültigen Token zurück"""
        conn = sqlite3.connect(Config.DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute(
            "SELECT id FROM users WHERE reset_token = ? AND reset_token_expiry > ?",
            (token, int(time.time()))
        )
        
        user = cursor.fetchone()
        
        if not user:
            conn.close()
            return False
        
        # Passwort zurücksetzen
        password_hash = self._hash_password(new_password)
        
        cursor.execute(
            "UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expiry = NULL WHERE id = ?",
            (password_hash, user[0])
        )
        
        conn.commit()
        conn.close()
        
        return True
    
    def verify_token(self, token):
        """Überprüft ein JWT-Token und gibt Benutzer-ID zurück"""
        try:
            payload = jwt.decode(token, Config.SECRET_KEY, algorithms=['HS256'])
            return payload
        except:
            return None
