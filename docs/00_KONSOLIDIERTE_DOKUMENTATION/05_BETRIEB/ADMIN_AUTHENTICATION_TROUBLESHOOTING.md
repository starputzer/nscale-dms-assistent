# Admin Panel Authentifizierung - Fehlerbehebung

Dieses Dokument erklärt, wie Probleme mit der Admin-Panel-Authentifizierung behoben werden können.

## Häufige Fehlermeldungen

### 1. "Keine Berechtigung für diese Operation"

Dieser Fehler tritt in folgenden Situationen auf:
- Der aktuell angemeldete Benutzer hat keine Admin-Rolle
- Das JWT-Token enthält keine Admin-Berechtigungen
- Die Admin-Rolle wurde dem Benutzer nicht korrekt in der Datenbank zugewiesen

### 2. "Login fehlgeschlagen"

Dieser Fehler kann verschiedene Ursachen haben:
- Falsche Anmeldedaten
- Die Datenbank ist nicht erreichbar
- Probleme mit dem Authentifizierungsendpunkt (/auth/login)

### 3. "Batch request error" oder HTTP 401 Fehler

Diese Fehler weisen auf Probleme mit der API-Kommunikation hin:
- Das Token ist abgelaufen und wurde nicht erneuert
- Der Authentifizierungsheader wird nicht korrekt gesendet
- Die Batch-API unterstützt die Anfrage nicht

## Lösungsstrategien

### A. Admin-Rechte in der Datenbank einrichten

1. Das Script `make_martin_admin.py` ausführen, um den Benutzer martin@danglefeet.com als Admin zu markieren:

```bash
python3 /opt/nscale-assist/worktrees/admin-improvements/make_martin_admin.py
```

2. Überprüfe das Ergebnis im Output, um sicherzustellen, dass der Vorgang erfolgreich war.

### B. Admin-Zugriff im Development-Modus erzwingen

Im Entwicklungsmodus kann der Admin-Zugriff über LocalStorage-Einstellungen erzwungen werden:

1. Öffne die Browser-Konsole (F12)
2. Führe folgende Befehle aus:

```javascript
localStorage.setItem('admin_override', 'true');
localStorage.setItem('force_mock_auth', 'true');
localStorage.setItem('debug_mode', 'true');
localStorage.setItem('auth_debug', 'true');
```

3. Lade die Seite neu

Alternativ kann die Datei `/opt/nscale-assist/worktrees/admin-improvements/debug-admin-auth.js` verwendet werden:

1. Kopiere den Inhalt dieser Datei und füge ihn in die Browser-Konsole ein
2. Folge den Anweisungen und führe `window.fixAdminAccess()` aus

### C. Verwenden des Scripts `open-admin-direct.sh`

Das Script `open-admin-direct.sh` automatisiert die Schritte A und B:

1. Führe das Script aus:

```bash
./open-admin-direct.sh
```

2. Das Script setzt den Benutzer als Admin und öffnet den Browser mit den korrekten LocalStorage-Einstellungen.

## Debugging-Tools

### 1. debug-admin-auth.js

Dieses Skript bietet detaillierte Einblicke in den Status der Authentifizierung:
- Prüft alle relevanten LocalStorage-Einstellungen
- Analysiert den Status des Pinia Auth-Stores
- Dekodiert und analysiert das JWT-Token (falls vorhanden)
- Bietet eine Funktion zur automatischen Behebung

### 2. Überprüfung des JWT-Tokens

Ein gültiges Admin-JWT-Token sollte folgende Eigenschaften haben:
- Ein 'role'-Feld mit dem Wert 'admin' oder
- Ein 'roles'-Array, das den Wert 'admin' enthält
- Ein gültiges 'exp'-Feld (Ablaufzeitpunkt in der Zukunft)

## Weitere Hinweise

- Die Vue 3 Composition API verwendet einen reaktiven Pinia Store für die Authentifizierung
- Die Admin-Rolle wird sowohl im Store als auch über API-Aufrufe geprüft
- Bei Zugriffsproblemen sollten immer zuerst die Authentifizierungsdaten und dann die API-Endpunkte überprüft werden