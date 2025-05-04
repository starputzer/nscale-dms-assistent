# Authentifizierungs-Verbesserungen

## Case-Insensitive E-Mail-Verarbeitung

Die Benutzerauthentifizierung wurde überarbeitet, um eine case-insensitive E-Mail-Verarbeitung zu ermöglichen. Benutzer können sich nun mit ihrer E-Mail-Adresse anmelden, unabhängig von der Groß- und Kleinschreibung.

### Implementierte Änderungen

1. **Login-Prozess**
   - Die `authenticate`-Methode verwendet jetzt einen case-insensitive Vergleich der E-Mail-Adressen.
   - SQL-Abfrage: `SELECT id, email, role FROM users WHERE LOWER(email) = LOWER(?) AND password_hash = ?`

2. **Registrierungsprozess**
   - Die `register_user`-Methode prüft jetzt case-insensitive, ob eine E-Mail-Adresse bereits existiert.
   - Verhindert doppelte Registrierungen mit unterschiedlicher Groß-/Kleinschreibung.

3. **Admin-E-Mail-Erkennung**
   - Die `_update_existing_admin_users`-Methode verwendet case-insensitive Vergleiche.
   - Verbessert die Zuverlässigkeit bei der Identifizierung von Admin-Benutzerkonten.

4. **Passwort-Reset-Prozess**
   - Die neu implementierte `initiate_password_reset`-Methode verwendet ebenfalls case-insensitive E-Mail-Vergleiche.

## Passwort-Reset-Funktionalität

Die Passwort-Reset-Funktionalität wurde vollständig implementiert, um Benutzern zu ermöglichen, ihre Passwörter zurückzusetzen, wenn sie diese vergessen haben.

### Funktionsweise

1. **Initiierung des Passwort-Resets**
   - Benutzer geben ihre E-Mail-Adresse ein.
   - Ein sicherer, einmaliger Token wird generiert und in der Datenbank gespeichert.
   - Der Token hat eine Gültigkeit von 24 Stunden.
   - In einer produktiven Umgebung würde der Token per E-Mail an den Benutzer gesendet.

2. **Zurücksetzen des Passworts**
   - Benutzer geben den Token und ihr neues Passwort ein.
   - Das System überprüft die Gültigkeit des Tokens und sein Ablaufdatum.
   - Bei erfolgreicher Validierung wird das Passwort aktualisiert und der Token gelöscht.

### Implementierte Methoden

```python
def initiate_password_reset(self, email):
    """Initiiert den Passwort-Reset-Prozess für eine angegebene E-Mail-Adresse"""
    # Case-insensitive Suche nach der E-Mail-Adresse
    cursor.execute("SELECT id FROM users WHERE LOWER(email) = LOWER(?)", (email,))
    # Generiere sicheren Token und speichere ihn mit Ablaufzeit
    reset_token = secrets.token_hex(32)
    expiry = int(time.time()) + 86400  # 24 Stunden Gültigkeit
```

```python
def reset_password(self, token, new_password):
    """Setzt das Passwort mit einem gültigen Token zurück"""
    # Suche Benutzer mit diesem Token
    cursor.execute("SELECT id, reset_token_expiry FROM users WHERE reset_token = ?", (token,))
    # Überprüfe Gültigkeit und Ablaufdatum
    # Setze neues Passwort und entferne Token
```

## Sicherheitserwägungen

- Die case-insensitive E-Mail-Verarbeitung beeinträchtigt nicht die Sicherheit, da die Authentifizierung weiterhin das korrekte Passwort erfordert.
- Der Passwort-Reset-Prozess verwendet sichere, zufällige Tokens mit angemessener Länge (32 Byte).
- Tokens haben eine begrenzte Gültigkeitsdauer, um das Sicherheitsrisiko zu minimieren.
- Die Passwort-Hashing-Funktion verwendet PBKDF2 mit SHA-256 und 100.000 Iterationen.

## Vorteile für Benutzer

- Verbesserte Benutzerfreundlichkeit durch Toleranz bei der Groß-/Kleinschreibung von E-Mail-Adressen.
- Zuverlässiger Zugriff auf Konten, selbst wenn Benutzer die genaue Schreibweise ihrer E-Mail-Adresse vergessen haben.
- Selbstbedienungsoption zum Zurücksetzen vergessener Passwörter ohne Admin-Intervention.

---

Aktualisiert: 04.05.2025