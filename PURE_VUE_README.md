# Pure Vue Mode für nScale DMS Assistant

Dieses Dokument beschreibt den "Pure Vue Mode", eine optimierte Version der nScale DMS Assistant-Anwendung, die ohne Backend-Abhängigkeit und Legacy-Bridge-Systeme läuft.

## Schnellstart

```bash
./start-pure-vue.sh
```

Oder manuell mit URL-Parameter:

```bash
npm run dev -- --port 3001 --open='?mockApi=true'
```

## Funktionen

- **Unabhängiger Entwicklungsmodus**: Entwickeln ohne Abhängigkeit von Backend-Services
- **Optimierte Vue 3 Architektur**: Vollständige Nutzung von Vue 3 und Composition API
- **Mock-Services**: Simulierte API-Antworten für alle Backend-Dienste
- **Keine Bridge-Abhängigkeit**: Beseitigung aller Legacy-Bridge-Systeme
- **Verbesserte Performance**: Reduzierter Overhead ohne Bridge-Kommunikation

## URL-Parameter

| Parameter | Beschreibung |
|-----------|--------------|
| `mockApi=true` | Aktiviert den Mock-Service-Modus |
| `useBridge=true` | Aktiviert den Legacy-Bridge-Modus (Standard: deaktiviert) |
| `feature_*=true\|false` | Aktiviert/deaktiviert bestimmte Features |

## Verwendung in der IDE

1. Klonen Sie das Repository
2. Installieren Sie die Abhängigkeiten mit `npm install`
3. Führen Sie das Start-Skript aus: `./start-pure-vue.sh`
4. Wenn Sie Änderungen an der Mocking-Logik vornehmen möchten, bearbeiten Sie die Dateien im Verzeichnis `src/services/mocks`

## Implementierte Mock-Services

- **ChatService**: Vollständige Implementierung des Chat-Services mit Streaming-Unterstützung
- **MOTD-Store**: Message of the Day Verwaltung
- **Feedback-Store**: Feedback-Erfassung und -Verwaltung
- **Source References**: Verwaltung und Anzeige von Quellenreferenzen

## Architektur

Der Pure Vue Mode nutzt eine saubere Schichtenarchitektur:

1. **UI-Komponenten**: In `App.pure.vue` und weiteren Vue 3 SFCs
2. **Store-Layer**: Pinia Stores für Zustandsverwaltung
3. **Service-Layer**: Mock-Services, die die API-Kommunikation emulieren
4. **Mock-Daten**: Statische und dynamisch generierte Antwortdaten

## Deaktivierung von Legacy-Systemen

Im Pure Vue Mode werden folgende Legacy-Systeme deaktiviert:

- Bridge-System für die Kommunikation mit Legacy-Code
- Legacy-HTML-Komponenten
- Vue 2-Komponenten
- Globale Funktionen an window.*

## Entwicklungshinweise

- Neue Komponenten sollten die Composition API verwenden
- Mock-Services sollten realistische Verzögerungen und Fehlerverhalten simulieren
- Die Dependency Injection erfolgt über das Service-Provider-System
- Fehlerbehandlung sollte über den zentralen Error-Reporting-Service erfolgen

## Debugging

Bei Problemen:

- Überprüfen Sie, ob der URL-Parameter `mockApi=true` gesetzt ist
- Öffnen Sie die Browser-Entwicklertools (F12) und prüfen Sie die Konsole
- Der Pure Mode Indicator (grünes Badge unten rechts) zeigt an, dass der Mock-Modus aktiv ist
- Weitere Details in [PURE_VUE_DEBUGGING.md](PURE_VUE_DEBUGGING.md)

## Funktionsumfang

✅ Chat-Funktionalität mit Streaming  
✅ Source References  
✅ Feedback-System  
✅ MOTD-System  
✅ Admin-Panel  
✅ Einstellungsverwaltung