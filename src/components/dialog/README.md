# nscale Dialog-System

Dieses Verzeichnis enthält die Vue 3-Komponenten für das benutzerdefinierte Dialog-System des nscale DMS Assistenten. Das System ersetzt die nativen Browser-Dialoge (`window.confirm()`, `window.alert()`, `window.prompt()`) durch ansprechendere, designangepasste interne Dialoge.

## Komponenten

### ConfirmDialog.vue

Eine Komponente für Bestätigungs-, Info-, Warn- und Fehlerdialoge. Unterstützt verschiedene Dialog-Typen mit entsprechenden visuellen Stilen.

**Haupteigenschaften:**
- Flexibler Inhalt mit anpassbaren Texten
- Support für verschiedene Dialog-Typen
- Tastatursteuerung (Escape, Enter, Tab)
- Zugänglichkeit (ARIA-Attribute, Fokusmanagement)
- Animation für Ein- und Ausblenden

### InputDialog.vue

Eine Komponente für Eingabe-Dialoge als Ersatz für `window.prompt()`. Unterstützt verschiedene Eingabetypen und Validierung.

**Haupteigenschaften:**
- Unterstützung für verschiedene Eingabetypen (text, password, email, etc.)
- Validierung mit individuellen Fehlermeldungen
- Standard- und Min-/Max-Länge
- Anpassbare Labels und Platzhaltertexte

### DialogProvider.vue

Eine Container-Komponente, die beide Dialog-Typen verwaltet und in die DOM-Struktur einfügt. Verwendet ein Teleport-Element, um Dialoge außerhalb der komponenten-basierten Hierarchie einzufügen.

## Verwendung

1. Fügen Sie den `DialogProvider` in der Haupt-App-Komponente ein:

```vue
<template>
  <div id="app">
    <!-- App-Inhalt -->
    <DialogProvider />
  </div>
</template>
```

2. Registrieren Sie das Dialog-Plugin in der `main.ts`-Datei:

```typescript
import { createApp } from 'vue';
import App from './App.vue';
import DialogPlugin from '@/plugins/dialog';

const app = createApp(App);
app.use(DialogPlugin);
app.mount('#app');
```

3. Verwenden Sie den Dialog-Service in Ihren Komponenten:

```typescript
import { useGlobalDialog } from '@/composables/useDialog';

export default {
  setup() {
    const dialog = useGlobalDialog();
    
    const deleteItem = async () => {
      const confirmed = await dialog.confirm('Möchten Sie dieses Element löschen?');
      if (confirmed) {
        // Löschen...
      }
    };
    
    return { deleteItem };
  }
}
```

## Stile anpassen

Die Dialog-Komponenten verwenden das nscale-Farbschema. Sie können die Stile bei Bedarf in den einzelnen Komponenten anpassen.

## Barrierefreiheit

Die Dialoge wurden mit Barrierefreiheit im Sinn entwickelt:
- ARIA-Attribute für Screen-Reader-Unterstützung
- Fokusmanagement innerhalb des Dialogs
- Tastaturnavigation
- Visuelle Kontraste entsprechend den WCAG-Richtlinien

## Weitere Dokumentation

Siehe `/docs/DIALOG_SYSTEM.md` für eine umfassende Dokumentation des Dialog-Systems.