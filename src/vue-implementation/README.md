# nscale DMS Assistent - Vue 3 Implementierung

Eine Vue 3-Implementierung für den nscale DMS Assistenten mit modernem Design und Benutzerfreundlichkeit.

## Komponenten-Struktur

1. **App.vue** (Hauptkomponente)
   - Header mit Berlin-Logo links, "nscale DMS Assistent" Titel und drei Buttons rechts:
     * "Neue Unterhaltung" (grüner Button mit Plus-Icon)
     * "Administration" (weißer Button mit Zahnrad-Icon)
     * "Abmelden" (weißer Button mit Logout-Icon)

2. **Sidebar.vue** (linke Seitenleiste)
   - Überschrift "Unterhaltungen"
   - Liste von Chat-Sessions mit Sprechblasen-Icon
   - Aktuell ausgewählte Session ist grün hervorgehoben
   - Jede Session hat ein Löschen-Icon (Mülleimer)

3. **ChatView.vue** (Hauptbereich rechts)
   - Nachrichtenbereich mit Assistenten-Antworten
   - Daumen hoch/Daumen runter Feedback-Buttons
   - Eingabebereich unten mit Platzhaltertext "Stellen Sie Ihre Frage zur nscale DMS-Software..."
   - Senden-Button mit Papierflugzeug-Icon

4. **UI-Komponenten**
   - Button.vue: Unterstützt verschiedene Varianten (primary/grün, secondary/weiß) und Icons
   - Icon.vue: Für verschiedene Icons wie Plus, Zahnrad, Logout, etc.
   - MessageItem.vue: Für einzelne Nachrichten mit unterschiedlichen Stilen je nach Absender
   - TextInput.vue: Für die Nachrichteneingabe

## Implementierte Funktionalitäten

- Sessions auswählen
- Neue Unterhaltung erstellen
- Nachrichten senden/empfangen (simuliert)
- Feedback zu Nachrichten geben
- Unterhaltungen löschen
- Admin-Panel und Logout (simuliert)

## Technische Details

- Vue 3 mit Composition API (<script setup>)
- TypeScript für Typsicherheit
- CSS mit Scoped Styling
- Responsive Design

## Integration

Um diese Implementierung in das Hauptprojekt zu integrieren:

1. Stelle sicher, dass die Vue-Abhängigkeiten installiert sind:
   ```bash
   npm install vue@3.5.0 uuid@9.0.1
   npm install --save-dev @types/uuid@9.0.6
   ```

2. Füge die Vue-Komponente in eine bestehende HTML-Seite ein:
   ```html
   <div id="app"></div>
   <script type="module" src="/src/vue-implementation/main.ts"></script>
   ```

3. Oder erstelle einen separaten Einstiegspunkt in der Vite-Konfiguration:
   ```js
   // vite.config.js
   export default defineConfig({
     // ...
     build: {
       rollupOptions: {
         input: {
           // ...
           'vue-dms-assist': resolve(__dirname, 'src/vue-implementation/index.html')
         }
       }
     }
   });
   ```