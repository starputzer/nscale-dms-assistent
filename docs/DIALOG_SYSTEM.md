# nscale DMS Assistent - Dialog-System

Dieses Dokument beschreibt das interne Dialog-System des nscale DMS Assistenten, das als Ersatz für native Browser-Dialoge wie `window.confirm()`, `window.alert()` und `window.prompt()` dient.

## Übersicht

Das Dialog-System besteht aus folgenden Komponenten:

1. **ConfirmDialog.vue**: Eine wiederverwendbare Vue 3-Komponente für Bestätigungs-, Info-, Warn- und Fehlerdialoge
2. **InputDialog.vue**: Eine Komponente für Eingabedialoge als Ersatz für `window.prompt()`
3. **useDialog.ts**: Ein Vue 3 Composable für die Dialog-Logik und API
4. **DialogProvider.vue**: Eine globale Komponente, die die Dialoge im DOM platziert
5. **dialog.ts**: Ein Vue-Plugin für die einfache Integration

## Installation

### 1. Plugin in der Hauptanwendung registrieren

Importieren und registrieren Sie das Dialog-Plugin in Ihrer `main.ts`-Datei:

```typescript
// main.ts
import { createApp } from 'vue';
import App from './App.vue';
import DialogPlugin from './plugins/dialog';

const app = createApp(App);

// Dialog-Plugin registrieren
app.use(DialogPlugin);

app.mount('#app');
```

### 2. DialogProvider in die Haupt-App-Komponente einbinden

Fügen Sie den DialogProvider zur App.vue-Komponente hinzu:

```vue
<!-- App.vue -->
<template>
  <div id="app">
    <!-- App-Inhalt -->
    <router-view />
    
    <!-- Dialog-Provider (muss nur einmal in der App vorhanden sein) -->
    <DialogProvider />
  </div>
</template>
```

## Verwendung

### 1. Bestätigungsdialoge

#### Ersatz für window.confirm()

```typescript
// Ersetzen von window.confirm()
const confirmed = await window.confirm('Möchten Sie diese Unterhaltung löschen?');
if (confirmed) {
  // Aktion ausführen
}
```

#### Verwendung in Vue-Komponenten

```typescript
import { useGlobalDialog } from '@/composables/useDialog';

export default {
  setup() {
    const dialog = useGlobalDialog();
    
    const deleteConversation = async (id) => {
      const confirmed = await dialog.confirm({
        title: 'Unterhaltung löschen',
        message: 'Möchten Sie diese Unterhaltung wirklich löschen?',
        confirmButtonText: 'Löschen',
        cancelButtonText: 'Abbrechen'
      });
      
      if (confirmed) {
        // Löschen der Unterhaltung
      }
    };
    
    return { deleteConversation };
  }
}
```

### 2. Verschiedene Dialogtypen

Das Dialog-System unterstützt verschiedene Typen von Dialogen:

```typescript
// Info-Dialog
await dialog.info('Ihre Sitzung läuft in 5 Minuten ab.');

// Warnungs-Dialog
await dialog.warning('Diese Aktion kann nicht rückgängig gemacht werden.');

// Fehler-Dialog
await dialog.error('Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.');

// Erfolgs-Dialog
await dialog.success('Die Aktion wurde erfolgreich abgeschlossen.');
```

### 3. Eingabedialoge (Ersatz für window.prompt)

```typescript
// Einfache Eingabe
const name = await dialog.prompt('Bitte geben Sie Ihren Namen ein:');

// Erweiterte Konfiguration
const email = await dialog.prompt({
  title: 'E-Mail eingeben',
  message: 'Bitte geben Sie Ihre E-Mail-Adresse ein:',
  inputLabel: 'E-Mail',
  inputType: 'email',
  placeholder: 'beispiel@domain.de',
  validator: (value) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value) || 'Bitte geben Sie eine gültige E-Mail-Adresse ein';
  }
});
```

## API-Referenz

### useDialog Composable

Das `useDialog`-Composable bietet folgende Methoden:

#### confirm(options)

Zeigt einen Bestätigungsdialog an.

```typescript
/**
 * @param options - String oder DialogOptions
 * @returns Promise<boolean> - true, wenn bestätigt, sonst false
 */
const confirmed = await dialog.confirm('Möchten Sie fortfahren?');
```

#### info(options)

Zeigt einen Info-Dialog an.

```typescript
await dialog.info('Information für den Benutzer');
```

#### warning(options)

Zeigt einen Warnungs-Dialog an.

```typescript
await dialog.warning('Achtung! Diese Aktion ist potenziell gefährlich.');
```

#### error(options)

Zeigt einen Fehler-Dialog an.

```typescript
await dialog.error('Ein Fehler ist aufgetreten.');
```

#### success(options)

Zeigt einen Erfolgs-Dialog an.

```typescript
await dialog.success('Aktion erfolgreich abgeschlossen.');
```

#### prompt(options)

Zeigt einen Eingabe-Dialog an.

```typescript
/**
 * @param options - String oder InputDialogOptions
 * @returns Promise<string | null> - Eingabewert, wenn bestätigt, sonst null
 */
const value = await dialog.prompt('Bitte geben Sie einen Wert ein:');
```

### DialogOptions Interface

```typescript
interface DialogOptions {
  title?: string;          // Dialog-Titel
  message: string;         // Dialog-Nachricht
  confirmButtonText?: string; // Text für den Bestätigungs-Button
  cancelButtonText?: string;  // Text für den Abbrechen-Button
  showCancelButton?: boolean; // Abbrechen-Button anzeigen?
  type?: 'info' | 'warning' | 'error' | 'success' | 'confirm'; // Dialog-Typ
  onConfirm?: () => void;  // Callback bei Bestätigung
  onCancel?: () => void;   // Callback bei Abbruch
  onClose?: () => void;    // Callback bei jeder Schließung
}
```

### InputDialogOptions Interface

```typescript
interface InputDialogOptions extends Omit<DialogOptions, 'type'> {
  inputLabel?: string;     // Label für das Eingabefeld
  inputType?: string;      // Typ des Eingabefeldes (text, password, email, etc.)
  placeholder?: string;    // Placeholder für das Eingabefeld
  defaultValue?: string;   // Standardwert
  minLength?: number;      // Minimale Eingabelänge
  maxLength?: number;      // Maximale Eingabelänge
  required?: boolean;      // Ist die Eingabe erforderlich?
  validator?: (value: string) => boolean | string; // Validierungsfunktion
  validationMessage?: string; // Validierungsmeldung
  onConfirm?: (value: string) => void; // Callback bei Bestätigung mit Wert
}
```

## Anpassung und Styling

Das Dialog-System verwendet das nscale-Farbschema und Design. Bei Bedarf können die Stile in den Vue-Komponenten angepasst werden:

- `ConfirmDialog.vue`: Stile für Bestätigungsdialoge
- `InputDialog.vue`: Stile für Eingabedialoge

Für projektweite Design-Änderungen sollten Sie die CSS-Variablen oder Klassen in diesen Dateien anpassen.

## Beispiele

Ein vollständiges Beispiel für die Verwendung des Dialog-Systems finden Sie in der Datei:
`/src/examples/DialogExample.vue`

## Fehlerbehebung

### Dialog wird nicht angezeigt

Stellen Sie sicher, dass:

1. Der `DialogProvider` in Ihrer App-Komponente eingebunden ist
2. Das Dialog-Plugin korrekt registriert wurde
3. Es keine CSS-Konflikte mit anderen Komponenten gibt (z.B. z-index-Probleme)

### Konflikte mit nativen Browser-Dialogen

Das System überschreibt die nativen Methoden `window.confirm()`, `window.prompt()` und `window.alert()`. Bei Bedarf können Sie auf die originalen Methoden über die globalen Properties `window.__originalConfirm`, `window.__originalPrompt` und `window.__originalAlert` zugreifen.

---

Zuletzt aktualisiert: 08.05.2025