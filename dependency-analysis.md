# Analyse der Abhängigkeiten zwischen Legacy-Komponenten

## 1. Übersicht der Komponentenarchitektur

Die Anwendung besteht aus zwei Hauptkomponentensystemen:
1. **Legacy-Komponenten**: Größtenteils in Vanilla JavaScript implementiert (app.js, chat.js, etc.)
2. **Vue 3-Komponenten**: Moderne SFC-Komponenten mit Composition API und Pinia Stores

Die Kommunikation zwischen diesen Systemen erfolgt über ein **Bridge-System**, das als Adapter zwischen dem Legacy-Code und den Vue 3-Komponenten fungiert.

## 2. Abhängigkeitsdiagramm der Legacy-Komponenten

```
app.js
├── chat.js / enhanced-chat.js (über setupChat)
├── feedback.js (über setupFeedback)
├── admin.js (über setupAdmin)
├── settings.js (über setupSettings)
├── source-references.js (über setupSourceReferences)
└── ab-testing.js (für A/B Tests)

enhanced-chat.js
├── api-client.js
├── error-handler.js
└── self-healing.js

Bridge-System
├── index.ts (Haupt-Bridge-Implementierung)
├── enhanced/bridgeCore.ts
├── enhanced/chatBridge.ts
├── enhanced/optimized/optimizedChatBridge.ts
├── enhanced/optimized/selectiveChatBridge.ts
└── storeBridge.ts
```

## 3. Detaillierte Abhängigkeitsanalyse

### 3.1 Legacy-Komponenten-Abhängigkeiten

- **app.js**: Zentraler Einstiegspunkt für die Legacy-Anwendung
  - Initialisiert alle Komponenten
  - Verwaltet den globalen Anwendungszustand (Sessions, Nachrichten, Auth)
  - Stellt globale Funktionen für andere Komponenten bereit

- **chat.js**: Grundlegende Chat-Funktionalität
  - Abhängig von app.js für Zustandsverwaltung
  - Implementiert sendQuestion und sendQuestionStream
  - Wird über setupChat in app.js eingebunden

- **enhanced-chat.js**: Erweiterte Chat-Funktionalität
  - Abhängig von api-client.js, error-handler.js und self-healing.js
  - Implementiert verbesserte Versionen der Chat-Funktionen
  - Ersetzt die ursprünglichen Chat-Funktionen zur Laufzeit
  - Bietet zusätzliche Fehlerbehandlung und Offline-Funktionalität

- **feedback.js**: Feedback-Funktionalität
  - Abhängig von app.js für den Zugriff auf Nachrichten und Sessions
  - Wird über setupFeedback in app.js eingebunden

- **admin.js**: Admin-Funktionalität
  - Abhängig von app.js für Authentifizierung und Benutzerrollen
  - Wird über setupAdmin in app.js eingebunden

- **settings.js**: Einstellungen-Funktionalität
  - Abhängig von app.js für Authentifizierung
  - Wird über setupSettings in app.js eingebunden

- **source-references.js**: Quellenreferenz-Funktionalität
  - Abhängig von app.js für Nachrichten
  - Wird über setupSourceReferences in app.js eingebunden

### 3.2 Vue-Komponenten, die auf Legacy-Code zugreifen

- **EnhancedChatView.vue**: 
  - Nutzt die Bridge für die Kommunikation mit dem Legacy-Chat-System
  - Implementiert eine verbesserte Chat-Benutzeroberfläche
  - Hat Feature-Flags für spezifische Funktionen

### 3.3 Bridge-Implementierung

Die Bridge implementiert ein bidirektionales Kommunikationsprotokoll:

1. **Legacy zu Vue**:
   - Stellt globale Namespaces bereit (nscaleAuth, nscaleChat, nscaleUI, nscaleSettings)
   - Fängt Ereignisse vom Legacy-Code ab und leitet sie an Vue-Komponenten weiter

2. **Vue zu Legacy**:
   - Beobachtet Store-Änderungen und teilt sie dem Legacy-Code mit
   - Ermöglicht Vue-Komponenten, Legacy-Funktionen aufzurufen

3. **Optimierte Bridge-Varianten**:
   - `selectiveChatBridge.ts`: Teilweise Kommunikation für bessere Performance
   - `optimizedChatBridge.ts`: Leistungsoptimierte Variante der Bridge

## 4. Feature-Flags und ihre Verwendung

Die Anwendung nutzt ein umfangreiches Feature-Flag-System, um Funktionen schrittweise zu aktivieren und zu deaktivieren:

### 4.1 Feature-Flag-Typen

1. **Direkte localStorage-Flags**:
   - `useVueComponents`: Aktiviert Vue-Komponenten allgemein
   - `useVueDocConverter`: Aktiviert Vue-Dokumentenkonverter-Komponenten

2. **Strukturierte Feature-Toggles** (im localStorage als "featureToggles"):
   - **SFC-Features**:
     - `useSfcAdmin`: Admin-Bereich als Vue-Komponenten
     - `useSfcDocConverter`: Dokumentenkonverter als Vue-Komponenten
     - `useSfcChat`: Chat-Interface als Vue-Komponenten
     - `useSfcSettings`: Einstellungen als Vue-Komponenten

   - **Store-Abhängigkeiten**:
     - `usePiniaAuth`: Authentifizierung über Pinia-Store
     - `usePiniaUI`: UI-Zustand über Pinia-Store
     - `usePiniaSessions`: Session-Verwaltung über Pinia-Store 
     - `usePiniaSettings`: Einstellungen über Pinia-Store

   - **Bridge-Konfiguration**:
     - `useLegacyBridge`: Aktiviert die Bridge zwischen Legacy- und Vue-Code

   - **Optimierungen**:
     - `optimizedStores`: Verbesserte Store-Implementierungen
     - `enhancedChatComponents`: Verbesserte Chat-Komponenten

### 4.2 Feature-Flag-Verwendung

- Die Feature-Flags steuern, welche Komponenten geladen und verwendet werden
- Sie ermöglichen eine schrittweise Migration von Legacy- zu Vue-Komponenten
- Die Bridge zwischen beiden Systemen kann je nach Flags angepasst werden

## 5. Kommunikationskanäle zwischen Legacy und Vue

1. **Bridge-System**:
   - `window.nscaleAuth`: Authentifizierungsfunktionen
   - `window.nscaleChat`: Chat-Funktionen
   - `window.nscaleUI`: UI-Funktionen
   - `window.nscaleSettings`: Einstellungsfunktionen
   - `window.nscaleEvents`: Event-Bus für bidirektionale Kommunikation

2. **EventBus**:
   - Bietet ein publish/subscribe-Modell für die Kommunikation
   - Ermöglicht komponentenübergreifende Kommunikation ohne direkte Abhängigkeiten

3. **Globale Funktionen**:
   - Legacy-Code exportiert einige Funktionen global
   - Vue-Komponenten können diese über das window-Objekt aufrufen

## 6. Gemeinsam genutzte Ressourcen

1. **Authentifizierungsstatus**:
   - Token und Benutzerdaten werden von beiden Systemen verwendet
   - Über Bridge und localStorage synchronisiert

2. **Sessions und Nachrichten**:
   - Session-Liste und aktive Session werden von beiden Systemen verwendet
   - Nachrichten werden über beide Systeme angezeigt und gesendet

3. **UI-Zustand**:
   - Dunkler Modus und andere UI-Einstellungen
   - Sidebar-Status und andere Anzeigeoptionen

4. **Benutzereinstellungen**:
   - Theme, Schriftgröße und weitere Einstellungen

## 7. Potenzielle Deaktivierungspunkte für Legacy-Komponenten

Basierend auf der Analyse lassen sich folgende "Knoten" identifizieren, an denen Legacy-Komponenten sicher deaktiviert werden können:

1. **Chat-Funktionalität**:
   - Wenn `useSfcChat` und `usePiniaSessions` aktiviert sind, kann die Legacy-Chat-Funktionalität deaktiviert werden
   - Die Vue-Chat-Komponenten übernehmen dann die volle Funktionalität

2. **Admin-Bereich**:
   - Wenn `useSfcAdmin` aktiviert ist, kann der Legacy-Admin-Bereich deaktiviert werden
   - Die Vue-Admin-Komponenten übernehmen dann die volle Funktionalität

3. **Einstellungen**:
   - Wenn `useSfcSettings` und `usePiniaSettings` aktiviert sind, kann die Legacy-Einstellungsfunktionalität deaktiviert werden
   - Die Vue-Einstellungskomponenten übernehmen dann die volle Funktionalität

4. **Bridge-System**:
   - Wenn alle SFC-Features aktiviert sind, kann die Bridge schrittweise deaktiviert werden
   - Zuerst kann die `selectiveChatBridge` verwendet werden, um nur noch bestimmte Events zu übertragen
   - Später kann die Bridge vollständig deaktiviert werden, wenn keine Legacy-Komponenten mehr aktiv sind

5. **app.js**:
   - Als letzter Schritt kann die zentrale app.js deaktiviert werden
   - Dies sollte erst erfolgen, wenn alle anderen Legacy-Komponenten sicher deaktiviert sind
   - Vor der Deaktivierung muss sichergestellt werden, dass alle benötigten Funktionen in Vue-Komponenten reimplementiert wurden

## 8. Empfohlene Deaktivierungsreihenfolge

1. **Schritt 1**: Legacy-Dokumentenkonverter durch Vue-Version ersetzen
   - Feature-Flags: `useVueDocConverter` und `useSfcDocConverter` aktivieren

2. **Schritt 2**: Legacy-Admin durch Vue-Version ersetzen
   - Feature-Flags: `useSfcAdmin` aktivieren

3. **Schritt 3**: Legacy-Einstellungen durch Vue-Version ersetzen
   - Feature-Flags: `useSfcSettings` und `usePiniaSettings` aktivieren

4. **Schritt 4**: Legacy-Chat durch Vue-Version ersetzen
   - Feature-Flags: `useSfcChat` und `usePiniaSessions` aktivieren
   - Umstellung auf `selectiveChatBridge` für verbesserte Performance

5. **Schritt 5**: Bridge optimieren und schrittweise reduzieren
   - Nicht mehr benötigte Bridge-Kommunikationswege identifizieren und deaktivieren
   - Auf `optimizedChatBridge` umstellen

6. **Schritt 6**: Vollständige Migration abschließen
   - Legacy-Code vollständig deaktivieren
   - Bridge-System deaktivieren
   - Auf reine Vue-Implementierung umstellen