# Pure Vue Mode für nScale DMS Assistant

Diese Dokumentation beschreibt den "Pure Vue Mode", der entwickelt wurde, um die nScale DMS Assistant-Anwendung ohne Backend-Abhängigkeit zu betreiben. Diese Version nutzt ausschließlich Vue 3 mit Composition API und simuliert alle Backend-Anfragen durch Mock-Services.

## Vorteile

- **Autarkie**: Keine Abhängigkeit von Backend-Services
- **Schnellere Entwicklung**: Frontend-Entwicklung kann unabhängig vom Backend-Status erfolgen
- **Vereinfachte Codebase**: Keine Legacy-Bridge-Systeme oder Kompatibilitätsadapter
- **Verbesserte Performance**: Keine Overhead durch Bridge-Kommunikation
- **Bessere Testbarkeit**: Mock-Services sind leichter zu testen

## Starten der Anwendung im Pure Vue Mode

1. Verwenden Sie das bereitgestellte Skript:
   ```bash
   ./start-pure-vue.sh
   ```

2. Oder starten Sie manuell mit URL-Parameter:
   ```bash
   npx vite --port 3001 --open='?mockApi=true'
   ```

## Implementierungsdetails

### Mock-Service-Factory

Die `MockServiceFactory` ermöglicht es, dynamisch zwischen realen API-Services und Mock-Implementierungen zu wechseln. Diese Factory kann auf mehrere Arten konfiguriert werden:

- **Durch URL-Parameter**: `?mockApi=true` im Browser-URL
- **Durch Umgebungsvariablen**: `VITE_USE_MOCK_SERVICES=true`
- **Durch Service-spezifische Überschreibungen**: Konfiguration in der Factory

### Mock-Service-Provider

Das `mockServiceProvider`-Plugin registriert die Dienste in der Vue-Anwendung mittels Dependency Injection:

- **Für Composition API**: Services werden über `inject()` bereitgestellt
- **Für Options API**: Services sind über `this.$chatService` usw. verfügbar
- **Für Legacy-Komponenten**: Globale Services über `window.$chatService`

### MockChatService

Eine voll funktionsfähige Mock-Implementierung des Chat-Services, die:

- Chat-Sessions und Nachrichten persistent im Speicher hält
- Verzögerungen für realistische Netzwerklatenz simuliert
- Streaming von Antworten unterstützt
- Einfache Antworten basierend auf Benutzeranfragen generiert

## Bedingte Bridge-Initialisierung

Die Bridge-Systeme werden nur bei Bedarf initialisiert:

- Parameter `?useBridge=true` aktiviert Legacy-Bridge-Systeme
- Ansonsten werden die Bridges übersprungen

## Vorschläge für Weiterentwicklung

1. **Erweiterung der Mock-Services**: Erstellen Sie weitere Mock-Services für Auth, Document-Konverter etc.
2. **Verbesserte Testeinbindung**: Integration mit Vitest/Jest für automatisierte Tests
3. **CI/CD-Pipeline**: Automatisches Testen der reinen Vue-Version
4. **Persistenz in LocalStorage**: Speichern von Mock-Daten lokal für Session-Erhaltung
5. **Admin-Interface für Mocks**: UI für das Erstellen und Bearbeiten von Mock-Daten

## Bekannte Einschränkungen

- Nicht alle API-Endpunkte sind gemockt
- Die Sitzungspersistenz ist nur im Speicher (wird bei Seiten-Refresh verloren)
- Einige fortgeschrittene Funktionen sind möglicherweise nicht vollständig implementiert

## Fehlerbehebung

- **Aktivieren Sie die Entwicklertools** (F12) für detaillierte Konsolenausgaben
- Bei Problemen prüfen Sie, ob `mockApi=true` in der URL vorhanden ist
- Die Konsole sollte anzeigen: "Reiner Vue-Modus: Legacy-Bridge-System wird übersprungen"