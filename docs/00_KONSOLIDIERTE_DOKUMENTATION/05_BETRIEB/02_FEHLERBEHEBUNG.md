---
title: "Fehlerbehebung"
version: "1.0.0"
date: "12.05.2025"
lastUpdate: "13.05.2025"
author: "Martin Heinrich"
status: "Aktiv"
priority: "Hoch"
category: "Betrieb"
tags: ["Fehlerbehebung", "Troubleshooting", "Fehlerdiagnose", "Debugging", "Lösungen", "Fallbacks"]
---

# Fehlerbehebung

> **Letzte Aktualisierung:** 13.05.2025 | **Version:** 1.0.0 | **Status:** Aktiv

## Inhaltsübersicht

- [1. Überblick](#1-überblick)
- [2. Allgemeine Fehlerbehandlungsstrategie](#2-allgemeine-fehlerbehandlungsstrategie)
- [3. Frontend-Fehler](#3-frontend-fehler)
- [4. Backend-Fehler](#4-backend-fehler)
- [5. Integration mit nscale DMS](#5-integration-mit-nscale-dms)
- [6. Dokumentenkonverter-Probleme](#6-dokumentenkonverter-probleme)
- [7. Netzwerk- und API-Probleme](#7-netzwerk--und-api-probleme)
- [8. Performanceprobleme](#8-performanceprobleme)
- [9. Bridge-System-Fehler](#9-bridge-system-fehler)
- [10. Logging und Monitoring](#10-logging-und-monitoring)
- [11. Wiederherstellung und Fallback-Strategien](#11-wiederherstellung-und-fallback-strategien)
- [12. Referenzen](#12-referenzen)

## 1. Überblick

Diese Dokumentation bietet einen umfassenden Leitfaden zur Identifikation, Diagnose und Behebung von Fehlern im nscale DMS Assistenten. Sie deckt sowohl häufige als auch komplexe Problemszenarien ab und bietet strukturierte Lösungsansätze.

### 1.1 Fehlerklassifikation

Fehler im nscale DMS Assistenten werden in folgende Kategorien eingeordnet:

- **UI-Fehler**: Probleme mit der Benutzeroberfläche und Darstellung
- **Funktionale Fehler**: Logikfehler oder falsche Funktionalität
- **Datenintegritätsfehler**: Probleme mit Datenstrukturen oder -inhalten
- **Netzwerkfehler**: API-Kommunikationsprobleme oder Konnektivitätsprobleme
- **Leistungsprobleme**: Übermäßige Ladezeiten oder Ressourcenverbrauch
- **Integrationsfehler**: Probleme bei der Integration mit externen Systemen
- **Sicherheitsprobleme**: Sicherheitskritische Fehler und Schwachstellen

### 1.2 Allgemeine Herangehensweise

Die Fehlerbehebung folgt einem strukturierten Ansatz:

1. **Identifikation**: Genaue Beschreibung des Problems und Reproduktionsschritte
2. **Isolation**: Eingrenzung des betroffenen Systembereichs
3. **Diagnose**: Ermittlung der Ursache durch Logs, Monitoring und Tests
4. **Lösung**: Anwendung der passenden Lösungsstrategie
5. **Verifizierung**: Überprüfung, dass der Fehler behoben ist
6. **Dokumentation**: Erfassung des Fehlers und seiner Lösung zur künftigen Referenz

## 2. Allgemeine Fehlerbehandlungsstrategie

### 2.1 Diagnosewerkzeuge

Folgende Werkzeuge stehen zur Diagnose von Problemen zur Verfügung:

| Werkzeug | Anwendungsbereich | Verfügbarkeit |
|----------|------------------|---------------|
| Admin-Logviewer | Zentrales Logging-Interface für alle Systemlogs | Admin-Panel > Logs |
| Browser-Entwicklerwerkzeuge | Frontend-Debugging, Netzwerkanalyse, Konsolenausgaben | Browser (F12) |
| Monitoring-Dashboard | Systemmetriken, Performance-Indikatoren, Health-Checks | Admin-Panel > Monitoring |
| Diagnostics API | Detaillierte System- und Komponentendiagnose | `/api/v1/diagnostics` (Auth erforderlich) |
| Bridge Diagnostics | Spezifische Bridge-System-Diagnose | Admin-Panel > System > Bridge |
| Error Reports | Automatisch generierte Fehlerberichte | Admin-Panel > Error Reports |

### 2.2 Log-Dateien

Kritische Log-Dateien für die Fehlerdiagnose:

```
/opt/nscale-assist/logs/app.log          # Hauptanwendungslog
/opt/nscale-assist/logs/api_server.log   # API-Serverlog
/opt/nscale-assist/logs/bridge.log       # Bridge-Systemlog
/opt/nscale-assist/logs/converter.log    # Dokumentenkonverterlog
/opt/nscale-assist/logs/access.log       # Zugriffslog
/opt/nscale-assist/logs/error.log        # Allgemeines Fehlerlog
/opt/nscale-assist/logs/vite_server.log  # Entwicklungsserverlog
```

### 2.3 Diagnosetools ausführen

Für eine umfassende Systemdiagnose können folgende Befehle ausgeführt werden:

```bash
# Vollständige Systemdiagnose durchführen
npm run diagnostics

# Nur Frontend-Diagnose durchführen
npm run diagnostics:frontend

# Nur Backend-Diagnose durchführen
npm run diagnostics:backend

# Bridge-System-Diagnose durchführen
npm run diagnostics:bridge

# Diagnosebericht generieren
npm run diagnostics:report
```

Der Diagnosebericht wird als HTML-Datei im Verzeichnis `/opt/nscale-assist/diagnostics/` gespeichert.

## 3. Frontend-Fehler

### 3.1 Ladeprobleme

#### 3.1.1 Symptom: Weiße Seite nach dem Laden

**Mögliche Ursachen:**
- JavaScript-Fehler blockieren das Rendering
- Fehlende Assets oder Ressourcen
- MIME-Typ-Konflikte bei Assets

**Lösungsschritte:**
1. Browser-Konsole auf Fehler prüfen
2. Network-Tab auf fehlende Ressourcen prüfen
3. MIME-Typ-Header in den Serverantworten überprüfen
4. Bei MIME-Typ-Problemen: Content-Type-Header in der Serverkonfiguration korrigieren

```bash
# Korrektur der MIME-Typ-Konfiguration für JavaScript-Module
echo 'import { createApp } from "vue";' > test-module.js
curl -I http://localhost:3000/test-module.js
# Überprüfen, ob Content-Type: text/javascript; charset=utf-8 zurückgegeben wird
```

#### 3.1.2 Symptom: JavaScript-Modul-Ladefehler

**Mögliche Ursachen:**
- Falsche Import-Pfade
- Inkompatible ES-Module-Syntax
- Fehlerhafte Vite-Konfiguration

**Lösungsschritte:**
1. Import-Pfade in der Fehlermeldung identifizieren
2. Prüfen, ob die Dateien existieren und zugänglich sind
3. Vite-Konfiguration auf korrekte Alias-Definitionen prüfen
4. Browser-Kompatibilität für ES-Module überprüfen

```javascript
// vite.config.js
// Korrekte Alias-Konfiguration
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
})
```

### 3.2 Rendering-Probleme

#### 3.2.1 Symptom: Komponenten werden nicht dargestellt

**Mögliche Ursachen:**
- Fehler in der Komponenten-Logik
- Fehlende Props oder ungültige Prop-Typen
- v-if/v-show Bedingungen werden nicht erfüllt

**Lösungsschritte:**
1. Vue Devtools aktivieren und Komponentenhierarchie prüfen
2. Fehlende Props in den Komponenteneigenschaften identifizieren
3. Reaktive Bedingungen überprüfen (v-if, v-show)
4. Fehler in den computed properties oder Lifecycle-Hooks prüfen

```typescript
// Debugging-Hilfsfunktion für Komponenten
function debugComponent(component: any) {
  console.log('Component props:', component.$props);
  console.log('Component data:', component.$data);
  console.log('Component computed:', Object.keys(component.$options.computed || {})
    .reduce((acc, key) => {
      try {
        acc[key] = component[key];
      } catch (e) {
        acc[key] = `Error: ${e.message}`;
      }
      return acc;
    }, {}));
}

// In der Komponente verwenden
onMounted(() => {
  if (import.meta.env.DEV) {
    debugComponent(getCurrentInstance()?.proxy);
  }
});
```

#### 3.2.2 Symptom: Fehlerhaftes Layout oder Styling

**Mögliche Ursachen:**
- CSS-Konflikte
- Fehlerhafte responsive Design-Implementierung
- Nicht geladene CSS-Dateien

**Lösungsschritte:**
1. Browser-Inspektor zur Analyse der angewandten Stile verwenden
2. CSS-Spezifität und Überschreibungen prüfen
3. Media Queries und Breakpoints überprüfen
4. Netzwerk-Tab auf fehlende CSS-Dateien prüfen

### 3.3 Interaktivitätsprobleme

#### 3.3.1 Symptom: Events werden nicht ausgelöst

**Mögliche Ursachen:**
- Falsche Event-Handler-Bindung
- Stoppt Propagation in übergeordneten Elementen
- Laufzeitfehler in Event-Handlern

**Lösungsschritte:**
1. Event-Listener mit Browserwerkzeugen prüfen
2. Event-Bubbling und Capture-Phase untersuchen
3. Temporäre Logging-Anweisungen in Event-Handler einfügen
4. Event-Handler auf Laufzeitfehler prüfen

```typescript
// Debugging für Event-Handler
function debugEvent(event: Event, handlerName: string) {
  console.log(`Event '${event.type}' triggered for handler '${handlerName}'`);
  console.log('Event target:', event.target);
  console.log('Current target:', event.currentTarget);
  console.log('Event phase:', 
    event.eventPhase === Event.CAPTURING_PHASE ? 'Capturing' :
    event.eventPhase === Event.AT_TARGET ? 'At Target' :
    event.eventPhase === Event.BUBBLING_PHASE ? 'Bubbling' : 'Unknown');
}

// Verwendung:
button.addEventListener('click', (event) => {
  debugEvent(event, 'handleClick');
  // Original-Handler-Code...
});
```

#### 3.3.2 Symptom: Fehler im Bridge-System für Legacy-Code-Integration

**Mögliche Ursachen:**
- Fehlgeschlagene Event-Weiterleitung zwischen Bridge-Endpunkten
- Inkompatible Datenformate zwischen Legacy- und modernem Code
- Timing-Probleme bei der Bridge-Initialisierung

**Lösungsschritte:**
1. Bridge-Diagnose-Tool im Admin-Panel aktivieren
2. Event-Flow analysieren
3. Datentransformationen zwischen Legacy- und modernem Code überprüfen
4. Bridge-Initialisierungssequenz untersuchen

```typescript
// Bridge-Debugging aktivieren
import { getOptimizedBridge } from '@/bridge/enhanced/optimized';

async function debugBridge() {
  const bridge = await getOptimizedBridge();
  bridge.enableDiagnostics({
    logEvents: true,
    logDataTransformations: true,
    visualizeEventFlow: true
  });
  
  // Test-Events senden
  bridge.emit('test:event', { timestamp: Date.now() });
  
  // Bridge-Status ausgeben
  console.log('Bridge status:', bridge.getDiagnosticsReport());
}
```

## 4. Backend-Fehler

### 4.1 API-Serverfehler

#### 4.1.1 Symptom: 500 Internal Server Error

**Mögliche Ursachen:**
- Unbehandelte Ausnahmen im Server-Code
- Datenbankverbindungsprobleme
- Ressourcenengpässe (Speicher, CPU)

**Lösungsschritte:**
1. Serverprotokolle in `/opt/nscale-assist/logs/api_server.log` überprüfen
2. Stacktrace der Ausnahme identifizieren
3. Datenbankverbindung und -status prüfen
4. Systemressourcen mit `top` oder `htop` überwachen

```bash
# Server-Logs anzeigen
tail -n 100 /opt/nscale-assist/logs/api_server.log

# Systemressourcen überwachen
htop

# Datenbankstatus prüfen
python -c "from modules.core.config import get_db_connection; conn = get_db_connection(); print('DB connection successful' if conn else 'DB connection failed')"
```

#### 4.1.2 Symptom: 404 Not Found für vorhandene Ressourcen

**Mögliche Ursachen:**
- Falsche URL-Konfiguration
- Nicht registrierte API-Routen
- Berechtigungsprobleme

**Lösungsschritte:**
1. API-Routenkonfiguration in `api_server.py` überprüfen
2. URL-Mapping und Endpunkt-Registrierung prüfen
3. Zugriffskontrollregeln überprüfen
4. Manuelle API-Anfrage mit curl zum Testen:

```bash
# API-Endpunkt direkt testen
curl -v http://localhost:8000/api/v1/resource

# Mit Authentifizierung testen
curl -v -H "Authorization: Bearer $TOKEN" http://localhost:8000/api/v1/protected-resource
```

### 4.2 Authentifizierungsprobleme

#### 4.2.1 Symptom: 401 Unauthorized trotz gültiger Anmeldedaten

**Mögliche Ursachen:**
- Abgelaufene Token
- Falsche Token-Validierung
- Konfigurationsprobleme im Auth-Modul

**Lösungsschritte:**
1. Token-Ablaufzeit überprüfen
2. Token-Signatur und -Format validieren
3. Auth-Konfiguration in `modules/auth/config.py` überprüfen
4. Token-Debugging aktivieren:

```python
# In modules/auth/debugging.py
def debug_token(token):
    from modules.auth.token_validator import decode_token, validate_token
    
    try:
        decoded = decode_token(token)
        print("Token decoded successfully:")
        print(f"  Subject: {decoded.get('sub')}")
        print(f"  Expires: {decoded.get('exp')}")
        print(f"  Issued at: {decoded.get('iat')}")
        
        validation = validate_token(token)
        print(f"Token validation: {'Success' if validation.valid else 'Failed'}")
        if not validation.valid:
            print(f"  Reason: {validation.reason}")
    except Exception as e:
        print(f"Token analysis failed: {str(e)}")
```

### 4.3 Datenverarbeitungsprobleme

#### 4.3.1 Symptom: Fehler bei der Dokumentenverarbeitung

**Mögliche Ursachen:**
- Nicht unterstützte Dokumentformate
- Korrupte Dokumentdateien
- Fehler in den Konvertierungsbibliotheken

**Lösungsschritte:**
1. Dokumentenkonverter-Logs in `/opt/nscale-assist/logs/converter.log` überprüfen
2. Dokumentformat mit `file` oder spezifischen Tools validieren
3. Konvertierungsschritte einzeln testen:

```bash
# Dokumenttyp identifizieren
file document.docx

# Dokumentstruktur analysieren
python -m doc_converter.tools.analyzer document.docx

# Einzelne Konvertierungsphasen testen
python -m doc_converter.converters.docx_converter --extract-text document.docx
```

## 5. Integration mit nscale DMS

### 5.1 Verbindungsprobleme

#### 5.1.1 Symptom: Keine Verbindung zum nscale DMS möglich

**Mögliche Ursachen:**
- Falsche Verbindungsparameter
- Netzwerkprobleme
- Berechtigungsprobleme

**Lösungsschritte:**
1. Verbindungskonfiguration in `modules/core/config.py` überprüfen
2. Netzwerkverbindung mit `ping` oder `telnet` testen
3. Berechtigungen und Anmeldeinformationen validieren
4. Verbindungstest durchführen:

```bash
# Einfacher Verbindungstest
python -m tools.test_nscale_connection

# Detaillierte Verbindungsdiagnose
python -m tools.diagnose_nscale_connection --verbose
```

### 5.2 Synchronisationsprobleme

#### 5.2.1 Symptom: Dokumente werden nicht synchronisiert

**Mögliche Ursachen:**
- Fehler im Synchronisationsprozess
- Inkonsistente Daten
- Fehlende Berechtigungen für Synchronisationsoperationen

**Lösungsschritte:**
1. Synchronisationslogs überprüfen
2. Datenkonsistenz zwischen nscale und Assistent prüfen
3. Berechtigungen für Synchronisationsbenutzer überprüfen
4. Manuelle Synchronisation erzwingen:

```bash
# Manuelle Synchronisation starten
python -m tools.force_sync --entity documents

# Synchronisationsstatus prüfen
python -m tools.check_sync_status
```

## 6. Dokumentenkonverter-Probleme

### 6.1 Konvertierungsfehler

#### 6.1.1 Symptom: Konvertierung schlägt mit Fehler fehl

**Mögliche Ursachen:**
- Nicht unterstützte Dokumenteigenschaften
- Fehlerhafte oder beschädigte Dokumente
- Fehlende Abhängigkeiten für Konvertierungskomponenten

**Lösungsschritte:**
1. Konverter-Logs in `/opt/nscale-assist/logs/converter.log` analysieren
2. Dokument auf Kompatibilität und Gültigkeit prüfen
3. Konvertierungsabhängigkeiten validieren:

```bash
# Abhängigkeiten prüfen
python -m doc_converter.tools.check_dependencies

# Dokument validieren
python -m doc_converter.tools.validate_document path/to/document

# Konvertierung mit detaillierten Protokollen
python -m doc_converter.tools.convert_document --verbose path/to/document
```

### 6.2 Ausgabequalitätsprobleme

#### 6.2.1 Symptom: Falsche Formatierung oder fehlende Inhalte

**Mögliche Ursachen:**
- Unzureichende Konvertierungsregeln
- Komplexe Dokumentformatierung
- Fehler in der Textextraktion

**Lösungsschritte:**
1. Vergleich zwischen Original und Konvertierung durchführen
2. Problematische Elemente identifizieren
3. Konvertierungsparameter anpassen:

```bash
# Erweiterte Konvertierungsoptionen
python -m doc_converter.tools.convert_document \
  --preserve-formatting \
  --extract-images \
  --table-detection-level high \
  path/to/document
```

## 7. Netzwerk- und API-Probleme

### 7.1 API-Kommunikationsprobleme

#### 7.1.1 Symptom: Timeout bei API-Anfragen

**Mögliche Ursachen:**
- Überlasteter Server
- Langsame Datenbankabfragen
- Netzwerklatenz

**Lösungsschritte:**
1. Server-Auslastung überwachen
2. API-Antwortzeiten in den Logs analysieren
3. Datenbankabfragen optimieren
4. Netzwerklatenz prüfen:

```bash
# Netzwerklatenz messen
ping -c 10 api-server.example.com

# API-Antwortzeiten messen
curl -w "%{time_total}\n" -o /dev/null -s http://api-server.example.com/api/health

# Server-Auslastung überprüfen
ssh user@api-server.example.com 'top -b -n 1 | head -n 20'
```

### 7.2 CORS-Probleme

#### 7.2.1 Symptom: CORS-Fehler in der Browserkonsole

**Mögliche Ursachen:**
- Falsche CORS-Konfiguration im Server
- Fehlende CORS-Header
- Unerlaubte Origin

**Lösungsschritte:**
1. CORS-Konfiguration im Backend überprüfen
2. Origin-Einstellungen validieren
3. CORS-Header in API-Antworten überprüfen:

```bash
# CORS-Header prüfen
curl -I -H "Origin: http://example.com" http://api-server.example.com/api/resource

# CORS für Preflight-Anfragen testen
curl -I -H "Origin: http://example.com" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -X OPTIONS \
  http://api-server.example.com/api/resource
```

## 8. Performanceprobleme

### 8.1 Langsame Ladezeiten

#### 8.1.1 Symptom: Seite lädt langsam oder stufenweise

**Mögliche Ursachen:**
- Große Bundle-Größen
- Fehlende Code-Splitting-Konfiguration
- Ineffiziente Ressourcenladestrategie

**Lösungsschritte:**
1. Bundle-Größen analysieren
2. Code-Splitting-Konfiguration überprüfen
3. Ressourcen-Priorisierung optimieren:

```bash
# Bundle-Analyse durchführen
npm run build:analyze

# Leistung im Browser messen
npm run lighthouse

# Performance-Metriken sammeln
npm run collect-metrics
```

### 8.2 Hoher Ressourcenverbrauch

#### 8.2.1 Symptom: Hohe CPU- oder Speicherauslastung

**Mögliche Ursachen:**
- Ineffiziente Render-Zyklen
- Memory Leaks
- Übermäßige Hintergrundprozesse

**Lösungsschritte:**
1. Performance-Profiling im Browser durchführen
2. Memory-Nutzung überwachen
3. CPU-Profile analysieren:

```bash
# Memory Leaks identifizieren
npm run memory-profiling

# CPU-Hotspots finden
npm run cpu-profiling

# Performance-Optimierungen testen
npm run benchmark-critical-path
```

## 9. Bridge-System-Fehler

### 9.1 Synchronisationsprobleme

#### 9.1.1 Symptom: Inkonsistente Daten zwischen Legacy und Vue

**Mögliche Ursachen:**
- Fehler im DeepDiff-Algorithmus
- Race Conditions bei der Zustandssynchronisierung
- Fehlerhafte Event-Weiterleitung

**Lösungsschritte:**
1. Bridge-Diagnosemodus aktivieren
2. Synchronisationsevents und -daten analysieren
3. Manuellen Synchronisationstest durchführen:

```typescript
// Bridge-Diagnose aktivieren
import { enableBridgeDiagnostics } from '@/bridge/diagnostics';

// Diagnostik mit Datensynchronisationsprotokollierung aktivieren
enableBridgeDiagnostics({
  logSyncEvents: true,
  compareStates: true,
  visualizeDiffs: true
});

// Test-Synchronisation durchführen
import { syncStates } from '@/bridge/testing';
syncStates('sessions');
```

### 9.2 Bridge-Initialisierungsprobleme

#### 9.2.1 Symptom: Bridge wird nicht korrekt initialisiert

**Mögliche Ursachen:**
- Fehlende Legacy-Komponenten
- Timing-Probleme bei der Initialisierung
- Fehler in der Bridge-Konfiguration

**Lösungsschritte:**
1. Initialisierungssequenz überprüfen
2. Legacy-Komponenten auf Verfügbarkeit prüfen
3. Bridge manuell initialisieren und testen:

```typescript
// Bridge-Initialisierungstest
import { initBridge, getBridgeStatus } from '@/bridge/core';

async function testBridgeInitialization() {
  console.log('Bridge status before init:', getBridgeStatus());
  
  try {
    await initBridge({ forceReinit: true, timeout: 5000 });
    console.log('Bridge status after init:', getBridgeStatus());
    
    // Komponenten-Verfügbarkeit prüfen
    console.log('Legacy components available:', 
      getBridgeStatus().availableLegacyComponents);
    console.log('Vue components available:', 
      getBridgeStatus().availableVueComponents);
  } catch (error) {
    console.error('Bridge initialization failed:', error);
  }
}
```

## 10. Logging und Monitoring

### 10.1 Log-Konfiguration

Die Anwendung verwendet ein strukturiertes Logging-System mit verschiedenen Detailebenen:

```python
# Beispiel für Python-seitiges Logging
import logging
from modules.core.logging import setup_logger

# Logger mit Modul-spezifischem Namen einrichten
logger = setup_logger('module_name')

# Verschiedene Log-Level verwenden
logger.debug("Detaillierte Debug-Informationen")
logger.info("Allgemeine Informationen")
logger.warning("Warnungen")
logger.error("Fehler mit Stacktrace", exc_info=True)
logger.critical("Kritische Fehler")
```

```typescript
// Beispiel für Client-seitiges Logging
import { logger } from '@/utils/logger';

// Verschiedene Log-Level
logger.debug('Detaillierte Debugging-Informationen');
logger.info('Allgemeine Informationen');
logger.warn('Warnungen');
logger.error('Fehler', new Error('Fehlerbeschreibung'));

// Strukturiertes Logging mit Metadaten
logger.info('Benutzeraktion', {
  userId: '12345',
  action: 'documentView',
  documentId: 'doc-789',
  timestamp: Date.now()
});
```

### 10.2 Monitoring-System

Das integrierte Monitoring-System erfasst verschiedene Metriken:

- **System-Metriken**: CPU, Speicher, Festplatte, Netzwerk
- **Anwendungs-Metriken**: Anfragen pro Sekunde, Antwortzeiten, Fehlerraten
- **Business-Metriken**: Benutzeraktivitäten, Dokumentenverarbeitung, Suchanfragen

Das Monitoring-Dashboard ist verfügbar unter:

- Produktion: https://nscale-assist.example.com/admin/monitoring
- Entwicklung: http://localhost:3000/admin/monitoring

### 10.3 Alarme und Benachrichtigungen

Das System kann so konfiguriert werden, dass bei kritischen Ereignissen Alarme ausgelöst werden:

```yaml
# Beispiel für Alarm-Konfiguration in config/alerts.yaml
alerts:
  high_error_rate:
    description: "Hohe Fehlerrate erkannt"
    condition: "error_rate > 5% in 5 minutes"
    channels:
      - email: admin@example.com
      - slack: "#alerts-channel"
      
  api_latency:
    description: "Hohe API-Latenz"
    condition: "p95_latency > 500ms in 10 minutes"
    channels:
      - email: dev-team@example.com
      - pagerduty: "api-oncall"
```

## 11. Wiederherstellung und Fallback-Strategien

### 11.1 Backup und Wiederherstellung

Das System erstellt automatisch regelmäßige Backups:

```bash
# Manuelles Backup erstellen
python -m tools.backup create

# Backup wiederherstellen
python -m tools.backup restore --backup-id backup-20250510-120000

# Backup-Status prüfen
python -m tools.backup status
```

### 11.2 Fallback-Mechanismen

Im Falle kritischer Fehler bietet das System Fallback-Mechanismen:

#### 11.2.1 Legacy-Modus

Bei Problemen mit Vue 3-Komponenten kann auf den Legacy-Modus umgeschaltet werden:

```bash
# Legacy-Modus aktivieren
npm run start:legacy

# Mixed-Modus aktivieren (kritische Komponenten in Legacy)
npm run start:mixed
```

#### 11.2.2 Offline-Modus

Bei API-Verbindungsproblemen kann der Offline-Modus verwendet werden:

```bash
# Offline-Modus starten
npm run start:offline

# Mit lokalem Cache synchronisieren
npm run sync:local-cache
```

#### 11.2.3 Minimal-Modus

Für Umgebungen mit begrenzten Ressourcen steht ein Minimal-Modus zur Verfügung:

```bash
# Minimal-Modus starten
npm run start:minimal

# Ressourcen-Nutzung anpassen
npm run configure:resources --cpu=low --memory=low
```

## 12. Referenzen

### 12.1 Interne Referenzen

- [Performance-Optimierung](./04_PERFORMANCE_OPTIMIERUNG.md): Detaillierte Informationen zu Performance-Optimierungen
- [Monitoring](./03_MONITORING.md): Dokumentation des Monitoring-Systems
- [Bridge-System](../02_ARCHITEKTUR/05_BRIDGE_SYSTEM.md): Detaillierte Dokumentation des Bridge-Systems
- [Frontend-Struktur](../02_ARCHITEKTUR/02_FRONTEND_STRUKTUR.md): Informationen zur Frontend-Architektur

### 12.2 Fehlerbibliothek

Eine umfassende Fehlerbibliothek mit bekannten Problemen und Lösungen ist verfügbar im Admin-Panel:

- Produktion: https://nscale-assist.example.com/admin/error-library
- Entwicklung: http://localhost:3000/admin/error-library

### 12.3 Ursprüngliche Dokumente

Dieses Dokument wurde aus folgenden Quellen konsolidiert:

1. `/opt/nscale-assist/app/docs/00_KONSOLIDIERTE_DOKUMENTATION/04_ENTWICKLUNG/01_FEHLERBEHANDLUNG_UND_FALLBACKS.md`: Dokumentation zu Fehlerbehandlung und Fallback-Mechanismen
2. `/opt/nscale-assist/app/docs/00_KONSOLIDIERTE_DOKUMENTATION/04_ENTWICKLUNG/05_EDGE_CASES_UND_GRENZFAELLE.md`: Umgang mit Grenzfällen und Edge Cases
3. `/opt/nscale-assist/app/frontend/BUGFIX_ANLEITUNG.md`: Anleitung zur Behebung von Frontend-Bugs
4. `/opt/nscale-assist/app/frontend/INTERAKTIVITAETS_REPARATUR.md`: Reparatur von Interaktivitätsproblemen
5. `/opt/nscale-assist/app/INDEX_HTML_FIX.md`: Behebung von Problemen mit der index.html-Datei

---

*Zuletzt aktualisiert: 13.05.2025*