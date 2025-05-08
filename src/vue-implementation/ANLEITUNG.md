# nscale DMS Assistent - Vue 3 Implementierung

## Einrichtung und Start

Die Vue 3 Implementierung des nscale DMS Assistenten ist bereits vollständig eingerichtet. Du kannst sie sofort testen:

1. Starte den Entwicklungsserver:
   ```bash
   cd /opt/nscale-assist/app
   npm run dev
   ```

2. Öffne im Browser:
   ```
   http://localhost:3000/
   ```

3. Klicke auf der Startseite auf "Vue 3 DMS Assistent öffnen" oder gehe direkt zu:
   ```
   http://localhost:3000/frontend/vue-dms-assistant.html
   ```

## Struktur der Implementierung

Die Implementierung ist in mehrere Teile aufgeteilt:

1. **Frontend-Dateien** (`/frontend/...`):
   - `/frontend/vue-dms-assistant.html`: HTML-Seite zum Anzeigen der Vue-App
   - `/frontend/js/vue/main.js`: Haupteinstiegspunkt für die Vue-Anwendung

2. **Vue-Komponenten und Logik** (`/src/vue-implementation/...`):
   - `/components/`: Alle Vue-Komponenten (App.vue, Sidebar.vue, etc.)
   - `/composables/`: Wiederverwendbare Kompositionsfunktionen (useChat.ts)
   - `/types/`: TypeScript-Typendefinitionen
   - `/assets/`: Bilder und andere Assets

## Funktionalitäten

- **Chat-Funktionen**: Anzeigen und Senden von Nachrichten
- **Session-Management**: Anzeigen, Auswählen und Löschen von Chat-Sessions
- **Feedback-System**: Bewerten von Assistenten-Antworten
- **Responsive Design**: Angepasst für verschiedene Bildschirmgrößen

## Verwendung in bestehendem Projekt

Du kannst diese Vue-Implementierung auch in einer bestehenden Seite einbinden:

```html
<!-- HTML: Element für Vue-App -->
<div id="vue-dms-app"></div>

<!-- JS: App initialisieren -->
<script type="module">
  import DmsAssistantApp from '/frontend/js/vue/main.js';
  DmsAssistantApp.initialize('vue-dms-app'); // 'vue-dms-app' ist die ID des Zielelements
</script>
```

## Anpassen der Styles

Die Hauptfarben und -stile der Anwendung werden in der Datei `/src/vue-implementation/styles.css` definiert. Hier kannst du die Farben und andere Eigenschaften anpassen:

```css
:root {
  --primary-color: #2e7d32; /* nscale Grün */
  --primary-light: #60ad5e;
  --primary-dark: #005005;
  /* ... weitere Farben und Styles */
}
```

## Eigene Backend-Anbindung

Aktuell werden in der Datei `/src/vue-implementation/composables/useChat.ts` nur Beispiel-Daten verwendet. Für eine echte Backend-Anbindung kannst du hier API-Aufrufe implementieren.