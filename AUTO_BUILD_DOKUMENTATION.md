# Automatisierter Build-Prozess für nscale-assist

Diese Dokumentation beschreibt den automatisierten Build-Prozess für die nscale-assist Vue.js-Anwendung.

## Übersicht der Automatisierungslösung

Der Build-Prozess wurde vollständig automatisiert und kann auf verschiedene Arten ausgelöst werden:

1. **Manueller Build**: Durch Ausführung des `auto-build.sh` Skripts
2. **Zeitgesteuerter Build**: Über Cron-Jobs (täglicher Build)
3. **Continuous Integration**: Über GitHub Actions bei Push-Events oder Pull Requests

## Automatisierungs-Skripte

### 1. auto-build.sh

Das Hauptskript für den automatisierten Build-Prozess. Es führt folgende Aufgaben aus:

- Aktualisiert den Quellcode (optional, bei Git-Integration)
- Erstellt ein Backup der aktuellen Produktionsversion
- Installiert alle Dependencies und baut die Vue.js-Anwendung
- Kopiert das Build-Ergebnis in die notwendigen Verzeichnisse
- Aktualisiert die Feature-Flag-Konfiguration für Vue.js
- Setzt Berechtigungen und kann optional den Server neu starten

**Ausführung**: 
```bash
cd /opt/nscale-assist/app
./auto-build.sh
```

**Parameter**:
- `AUTO_RESTART=true ./auto-build.sh` für automatischen Server-Neustart
- `SLACK_WEBHOOK=url ./auto-build.sh` für Benachrichtigung (falls konfiguriert)

### 2. crontab-setup.sh

Einrichtungsskript für zeitgesteuerte Builds mit Cron-Jobs:

- Kann tägliche, wöchentliche oder stündliche Builds einrichten
- Erstellt automatisch das notwendige Logs-Verzeichnis
- Bietet eine Option zum sofortigen Testlauf

**Ausführung**:
```bash
cd /opt/nscale-assist/app
sudo ./crontab-setup.sh
```

## GitHub Actions Integration

In der Datei `.github/workflows/build-deploy.yml` wurde ein CI/CD-Workflow definiert, der:

1. Bei Push-Events auf main/develop oder Pull Requests auf main aktiviert wird
2. Vue.js baut und Tests ausführt
3. Bei erfolgreichen Builds auf dem main Branch das Deployment durchführt
4. Eine Versionsmarkierung in Form eines Tags erstellt

Zusätzlich gibt es einen nächtlichen Build-Workflow (`.github/workflows/cron-build.yml`), der:
- Jeden Tag um 2 Uhr UTC läuft
- Die Anwendung baut und bereitstellt
- Benachrichtigungen sendet (falls konfiguriert)

## Nutzung der Automatisierung

### Einrichtung des täglichen automatischen Builds

```bash
cd /opt/nscale-assist/app
sudo ./crontab-setup.sh
# Option 1 (Täglich) auswählen
```

### Manuelles Auslösen eines Builds

```bash
cd /opt/nscale-assist/app
./auto-build.sh
```

### GitHub Actions aktivieren (optional)

1. Repository auf GitHub hosten
2. Secrets für Deployment konfigurieren:
   - `DEPLOY_SSH_KEY`: SSH-Private-Key für den Server
   - `DEPLOY_HOST`: Hostname/IP des Zielservers
   - `DEPLOY_USER`: SSH-Benutzername
   - `DEPLOY_DIR`: Zielverzeichnis auf dem Server
   - `SLACK_WEBHOOK`: (Optional) Webhook-URL für Slack-Benachrichtigungen

## Vorteile der Automatisierung

- **Konsistenz**: Gleicher Build-Prozess in allen Umgebungen
- **Zuverlässigkeit**: Automatische Backups vor jedem Build
- **Einfachheit**: Keine manuellen Schritte nötig
- **Verfolgbarkeit**: Detaillierte Logs für alle Builds

## Fehlerbehebung

Bei Problemen mit dem automatisierten Build:

1. Log-Dateien prüfen: `/opt/nscale-assist/app/logs/auto-build.log`
2. Bei Git-Problemen: Manuelle Git-Operationen durchführen
3. Bei Build-Fehlern: NPM-Fehler überprüfen und Dependencies aktualisieren
4. Bei Deployment-Fehlern: Berechtigungen und Zugriff auf Verzeichnisse prüfen

## Best Practices

- Regelmäßig Backups der `static`-Verzeichnisse überprüfen
- Den GitHub Actions-Workflow immer aktuell halten
- Cron-Jobs für optimale Serverzeiten konfigurieren
- Bei kritischen Änderungen immer einen manuellen Test durchführen