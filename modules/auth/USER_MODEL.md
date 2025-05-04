# UserManager und Authentifizierungssystem

## Übersicht

Die `UserManager`-Klasse in `user_model.py` ist die zentrale Komponente für die Benutzerauthentifizierung und -verwaltung im nscale DMS Assistent. Sie stellt Funktionen für Registrierung, Anmeldung, Rollenverwaltung, und Passwort-Reset bereit.

## Hauptfunktionen

### 1. Benutzerauthentifizierung

- **Login-Mechanismus**: Überprüft Benutzeranmeldedaten und gibt ein JWT-Token zurück
- **Case-insensitive E-Mail-Verarbeitung**: Ermöglicht Anmeldung unabhängig von der Groß-/Kleinschreibung
- **JWT-basierte Sessions**: Tokens enthalten Benutzer-ID, E-Mail und Rolle für Autorisierung

### 2. Benutzerverwaltung

- **Registrierung**: Erstellt neue Benutzerkonten mit E-Mail und Passwort
- **Rollen-System**: Unterscheidet zwischen normalen Benutzern und Administratoren
- **Admin-Berechtigungen**: Spezielle Funktionen für Administrator-Konten
- **Geschützte Admins**: Besonderer Schutz für in der Umgebungsvariable definierte Admin-Konten

### 3. Passwort-Management

- **Sichere Passwort-Hashes**: Verwendet PBKDF2 mit SHA-256 und 100.000 Iterationen
- **Passwort-Reset**: Sicherer Reset-Prozess mit zeitlich begrenzten Tokens
- **Token-Sicherheit**: 32-Byte zufällige Tokens für hohe Sicherheit

## Datenmodell

Die Benutzerinformationen werden in einer SQLite-Datenbank mit folgender Struktur gespeichert:

```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    reset_token TEXT,
    reset_token_expiry INTEGER,
    created_at INTEGER NOT NULL,
    last_login INTEGER
)
```

## Hauptmethoden

### Authentifizierung

```python
def authenticate(self, email, password):
    """Authentifiziert einen Benutzer und gibt ein JWT-Token zurück"""
    password_hash = self._hash_password(password)
    
    # Case-insensitive Vergleich für E-Mail-Adresse
    cursor.execute(
        "SELECT id, email, role FROM users WHERE LOWER(email) = LOWER(?) AND password_hash = ?",
        (email, password_hash)
    )
```

### Benutzerregistrierung

```python
def register_user(self, email, password, role=None):
    """Registriert einen neuen Benutzer mit Rollenbestimmung anhand der E-Mail"""
    # Bestimme Rolle (Admin für spezielle E-Mails, sonst User)
    if role is None:
        role = UserRole.ADMIN if email.lower() in [e.lower() for e in self.ADMIN_EMAILS] else UserRole.USER
        
    # Überprüfe zuerst, ob die E-Mail-Adresse (case-insensitive) bereits existiert
    cursor.execute("SELECT id FROM users WHERE LOWER(email) = LOWER(?)", (email,))
```

### Passwort-Reset

```python
def initiate_password_reset(self, email):
    """Initiiert den Passwort-Reset-Prozess für eine angegebene E-Mail-Adresse"""
    # Case-insensitive Suche nach der E-Mail-Adresse
    cursor.execute("SELECT id FROM users WHERE LOWER(email) = LOWER(?)", (email,))
    
    # Generiere einen sicheren Token mit 24-Stunden-Gültigkeit
    reset_token = secrets.token_hex(32)
    expiry = int(time.time()) + 86400
```

### Token-Verifizierung

```python
def verify_token(self, token):
    """Überprüft ein JWT-Token und gibt Benutzerinformationen zurück"""
    try:
        payload = jwt.decode(token, Config.SECRET_KEY, algorithms=['HS256'])
        return payload
    except jwt.ExpiredSignatureError:
        logger.warning("Abgelaufenes Token verwendet")
        return None
```

## Admin-Funktionen

Die Klasse bietet spezielle Funktionen für Administratoren:

1. **Benutzer verwalten**: Administratoren können Benutzerkonten erstellen und löschen
2. **Benutzerrollen ändern**: Administratoren können Rollenänderungen vornehmen
3. **Benutzerliste abrufen**: Nur Administratoren können alle Benutzer auflisten

## Sicherheitsmerkmale

1. **Geschützte Admins**: Administratoren, die über die `ADMIN_EMAILS` Umgebungsvariable definiert wurden, können nicht gelöscht oder herabgestuft werden
2. **Selbstschutz**: Administratoren können sich nicht selbst löschen oder ihre eigenen Rechte entziehen
3. **Admin-Erhaltung**: Es muss immer mindestens ein Administrator im System bleiben
4. **Sichere Passwort-Speicherung**: Passwörter werden niemals im Klartext gespeichert

## Logging

Die Klasse verwendet ein umfangreiches Logging-System, um sicherheitsrelevante Ereignisse zu protokollieren:

- Fehlgeschlagene Anmeldeversuche
- Passwort-Reset-Anfragen
- Änderungen an Benutzerrollen
- Löschung von Benutzerkonten
- Unerlaubte Zugriffsversuche auf Admin-Funktionen

## Verwendung

```python
# Instanz erstellen
user_manager = UserManager()

# Benutzer registrieren
success = user_manager.register_user("nutzer@beispiel.de", "sicheres-passwort")

# Benutzer authentifizieren
token = user_manager.authenticate("nutzer@beispiel.de", "sicheres-passwort")

# Token verifizieren
user_data = user_manager.verify_token(token)

# Passwort-Reset initiieren
reset_token = user_manager.initiate_password_reset("nutzer@beispiel.de")

# Passwort zurücksetzen
success = user_manager.reset_password(reset_token, "neues-passwort")
```

## Konfiguration

Die Klasse nutzt folgende Konfigurationsparameter aus dem Config-Modul:

- `Config.DB_PATH`: Pfad zur SQLite-Datenbank
- `Config.PASSWORD_SALT`: Salt für die Passwort-Hashing-Funktion
- `Config.SECRET_KEY`: Geheimschlüssel für JWT-Token-Signierung
- `Config.JWT_EXPIRATION`: Gültigkeitsdauer der JWT-Tokens in Sekunden

## Erweiterbarkeit

Das System ist so konzipiert, dass es leicht erweitert werden kann:

1. **Weitere Rollen**: Neue Benutzerrollen können durch Erweiterung der `UserRole`-Klasse hinzugefügt werden
2. **Zusätzliche Authentifizierungsmethoden**: Die aktuelle E-Mail/Passwort-Authentifizierung kann um zusätzliche Methoden erweitert werden
3. **Multi-Faktor-Authentifizierung**: Die Struktur erlaubt die Integration von MFA-Techniken

---

Aktualisiert: 04.05.2025