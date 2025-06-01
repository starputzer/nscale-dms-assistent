# Fehleranalyse und Behebung - Endlosschleife und 404-Fehler

## Problem
Nach erfolgreichem Login entstanden tausende Fehlermeldungen im Browser-Log:
1. "DOM-Fehler erkannt: genericError/criticalError" Endlosschleife
2. 404-Fehler bei `/api/sessions/{sessionId}/stream`
3. `routerService.getRouter is not a function` Fehler

## Ursachen
1. **useEnhancedRouteFallback**: Übereifrige DOM-Fehler-Erkennung löste ständig neue Fehler aus
2. **Falsche Stream-URL**: Die App verwendete `/api/sessions/{sessionId}/stream`, aber der Server hat `/api/question/stream`
3. **DiagnosticsInitializer**: Versuchte `getRouter()` auf dem RouterService aufzurufen, die Methode existiert aber nicht

## Lösungen

### 1. DOM-Fehler-Erkennung deaktiviert
- In `useEnhancedRouteFallback.ts` wurde die problematische DOM-Fehler-Erkennung deaktiviert
- App.vue verwendet weiterhin `useBasicRouteFallback` ohne DOM-Fehler-Checks

### 2. Stream-URL korrigiert
```typescript
// Vorher:
`/api/sessions/${sessionId}/stream?message=${encodeURIComponent(content)}`

// Nachher:
`/api/question/stream?question=${encodeURIComponent(content)}&session_id=${sessionId}&auth_token=${authToken}`
```

### 3. DiagnosticsInitializer korrigiert
```typescript
// Vorher:
const router = routerService.getRouter();

// Nachher:
const router = (window as any)?.$router || (window as any)?.app?.$router;
```

### 4. Router-Konfiguration erweitert
- Route `/chat/:sessionId` für spezifische Sessions hinzugefügt
- ChatView verwendet jetzt `route.params.sessionId` statt `route.params.id`

## Ergebnis
- Keine Endlosschleife mehr im Browser-Log
- Stream-API funktioniert korrekt mit Authentifizierung
- Diagnostics-System läuft ohne Fehler
- Navigation zu Chat-Sessions funktioniert einwandfrei

## Tests
1. Login funktioniert ohne Fehler
2. Navigation zu `/chat/{sessionId}` wird korrekt verarbeitet
3. Stream-API sendet Nachrichten erfolgreich
4. Keine DOM-Fehler-Erkennungs-Schleifen mehr