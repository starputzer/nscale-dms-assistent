# nscale DMS Assistent Vue 3 Implementation

## Schnellstart

Um diese Vue 3 Implementation zu testen:

```bash
# Navigiere zum Projektordner
cd /opt/nscale-assist/app

# Installiere Abhängigkeiten (falls noch nicht geschehen)
npm install uuid@9.0.1

# Starte den Entwicklungsserver und öffne die Implementation
npm run dev
```

Dann öffne im Browser: http://localhost:3000/frontend/vue-dms-assistant.html

## Integration in bestehendes Projekt

Die Vue 3 Implementation kann auf verschiedene Weisen in das bestehende Projekt integriert werden:

### Option 1: Als eigenständige Seite

Füge einen neuen Eintrag in der `vite.config.js` hinzu:

```javascript
// vite.config.js
export default defineConfig({
  // ...
  build: {
    rollupOptions: {
      input: {
        // Bestehende Einträge beibehalten
        main: resolve(frontendDir, 'main.js'),
        admin: resolve(frontendDir, 'js/admin.js'),
        // Neuer Eintrag für die Vue-Implementation
        dmsAssistant: resolve(__dirname, 'src/vue-implementation/index.html')
      }
    }
  }
});
```

### Option 2: Als Komponente in bestehende Seite einbinden

```javascript
// In einer bestehenden JS-Datei
import DmsAssistantApp from '/frontend/js/vue/main.js';

// Mounten der Komponente auf ein bestehendes DOM-Element
DmsAssistantApp.initialize('vue-dms-assistant'); // Element-ID als Parameter
```

Oder füge direkt ein Script-Tag in die HTML-Datei ein:

```html
<!-- HTML-Element für die Vue-Anwendung -->
<div id="vue-dms-assistant"></div>

<!-- Vue-Anwendung laden -->
<script type="module">
  import DmsAssistantApp from '/frontend/js/vue/main.js';
  DmsAssistantApp.initialize('vue-dms-assistant');
</script>
```

## Komponenten-Übersicht

Die Implementation besteht aus folgenden Hauptkomponenten:

1. **App.vue** - Hauptkomponente mit Header und Layout
2. **Sidebar.vue** - Anzeige der Chat-Sessions 
3. **ChatView.vue** - Anzeige der Nachrichten und Eingabefeld
4. **MessageItem.vue** - Darstellung einzelner Nachrichten
5. **TextInput.vue** - Nachrichteneingabe-Komponente
6. **Button.vue** - Wiederverwendbare Button-Komponente
7. **Icon.vue** - SVG-Icons für verschiedene Aktionen

Die Anwendung verwendet die **Composition API** und **TypeScript** für eine bessere Codequalität und Wartbarkeit.

## Anpassungen

Die Vue-Implementation kann leicht angepasst werden:

- **Farben:** in `styles.css` können die Grundfarben über CSS-Variablen angepasst werden
- **Backend-Integration:** In `composables/useChat.ts` kann die Simulation durch echte API-Aufrufe ersetzt werden
- **Erweiterte Funktionen:** Das App-Design ist modular aufgebaut und kann leicht um weitere Funktionen erweitert werden

## Screenshot-Referenz

Die Implementation entspricht dem folgenden Design:
- Header mit Logo, Titel und Aktionsbuttons
- Sidebar mit Unterhaltungsliste
- Chatbereich mit Nachrichten und Feedback-Optionen
- Texteingabe mit Senden-Button