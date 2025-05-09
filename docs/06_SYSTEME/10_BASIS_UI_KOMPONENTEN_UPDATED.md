# Basis-UI-Komponenten für nscale DMS Assistent

Dieses Dokument beschreibt die Kernkomponenten der Vue 3 Implementierung für den nscale DMS Assistenten. Alle Komponenten sind mit TypeScript und der Composition API (`<script setup>`) implementiert und entsprechen den modernen Best Practices.

## Inhaltsverzeichnis

1. [Layout-Komponenten](#layout-komponenten)
   - [MainLayout](#mainlayout)
   - [Header](#header)
   - [Sidebar](#sidebar)
2. [UI-Basiskomponenten](#ui-basiskomponenten)
   - [Button](#button)
   - [Card](#card)
   - [Input](#input)
   - [Toast](#toast)
   - [DialogProvider](#dialogprovider)
3. [Design-System](#design-system)
   - [CSS-Variablen](#css-variablen)
   - [Responsive Design](#responsive-design)
   - [Dark Mode](#dark-mode)
4. [Verwendung und Best Practices](#verwendung-und-best-practices)

## Layout-Komponenten

### MainLayout

`MainLayout.vue` dient als Container für die gesamte Anwendung und koordiniert die Anzeige von Header, Sidebar, Content-Bereich und Footer.

**Hauptfunktionen:**

- Flexible Layout-Steuerung mit Header, Sidebar, Content und Footer
- Unterstützung für verschiedene Themes (light/dark/system)
- Verwaltung des Sidebar-Status (ein-/ausklappbar)
- Unterstützung für responsive Layouts
- Context-Provider für untergeordnete Komponenten

**Beispielverwendung:**

```vue
<MainLayout>
  <template #header>
    <Header :user="user" @logout="handleLogout" />
  </template>
  
  <template #sidebar>
    <Sidebar :items="navigationItems" />
  </template>
  
  <div class="content">
    <!-- Hauptinhalt -->
  </div>
  
  <template #footer>
    <Footer />
  </template>
</MainLayout>
```

### Header

`Header.vue` ist die Kopfzeile der Anwendung und enthält den Titel, Logo und Benutzermenü.

**Hauptfunktionen:**

- Flexible Konfiguration (Größe, fixed/sticky-Position)
- Integration mit dem Sidebar-Toggle
- Benutzermenü mit Avatar und Dropdown
- Unterstützung für benutzerdefinierte Aktionen
- Responsive Design für mobile Ansichten

**Beispielverwendung:**

```vue
<Header 
  title="nscale DMS Assistent"
  :logo="logoUrl"
  :user="currentUser"
  size="medium"
  :showToggleButton="true"
  @toggle-sidebar="toggleSidebar"
/>
```

### Sidebar

`Sidebar.vue` bietet die Navigation der Anwendung mit mehreren Ebenen und ein-/ausklappbaren Menüs.

**Hauptfunktionen:**

- Hierarchische Menüstruktur mit Untermenüs
- Ein-/Ausklappbar mit Animation
- Mini-Modus (nur Icons)
- ARIA-konforme Accessibility
- Keyboard-Navigation
- Integration mit dem Router

**Beispielverwendung:**

```vue
<Sidebar
  :items="navigationItems"
  :collapsed="sidebarCollapsed"
  @collapse="toggleSidebar"
  @item-click="handleNavigation"
/>
```

## UI-Basiskomponenten

### Button

`Button.vue` ist eine vielseitige Button-Komponente mit verschiedenen Varianten und Zuständen.

**Hauptfunktionen:**

- Mehrere Varianten: primary, secondary, tertiary, danger, ghost
- Verschiedene Größen: small, medium, large
- Unterstützung für Icons (links/rechts/nur Icon)
- Loading-Status mit Spinner
- Vollständige Keyboard-Accessibility
- Hover, Focus und Active States

**Beispielverwendung:**

```vue
<Button 
  variant="primary" 
  size="medium"
  :loading="isLoading"
  :disabled="!isValid"
  @click="submitForm"
>
  Speichern
</Button>

<Button 
  variant="ghost" 
  size="small" 
  :iconLeft="TrashIcon"
  @click="deleteItem"
>
  Löschen
</Button>
```

### Card

`Card.vue` dient als Container für verschiedene Inhaltstypen mit Header, Body und Footer.

**Hauptfunktionen:**

- Verschiedene Varianten: default, elevated, bordered, flat
- Konfigurierbare Größen und Padding
- Optionale Header mit Titel und Aktionen
- Optionaler Footer
- Interaktiver Modus für klickbare Karten

**Beispielverwendung:**

```vue
<Card
  title="Dokumentdetails"
  variant="elevated"
  size="medium"
>
  <div>
    <!-- Karteninhalt -->
  </div>
  
  <template #footer>
    <Button variant="primary">Bearbeiten</Button>
    <Button variant="secondary">Schließen</Button>
  </template>
</Card>
```

### Input

`Input.vue` ist eine flexible Eingabekomponente für verschiedene Eingabetypen mit Validierung.

**Hauptfunktionen:**

- Unterstützung für verschiedene Input-Typen (text, password, number, email, etc.)
- Prefix und Suffix-Icons/Slots
- Password-Toggle für Passwortfelder
- Validierungsmeldungen und Fehlerzustand
- Hilfstexte und Zeichenzähler
- Vollständige Accessibility-Unterstützung

**Beispielverwendung:**

```vue
<Input
  v-model="username"
  label="Benutzername"
  placeholder="Geben Sie Ihren Benutzernamen ein"
  :error="usernameError"
  helperText="Ihr Benutzername wird für die Anmeldung verwendet"
  required
/>

<Input
  v-model="password"
  type="password"
  label="Passwort"
  placeholder="Passwort eingeben"
  :error="passwordError"
/>
```

### Toast

`Toast.vue` dient zur Anzeige von Benachrichtigungen wie Erfolg, Fehler, Warnung oder Information.

**Hauptfunktionen:**

- Verschiedene Meldungstypen (success, error, warning, info)
- Konfigurierbare Position auf dem Bildschirm
- Automatisches Ausblenden mit konfigurierbarer Dauer
- Warteschlangenmanagement für mehrere Toast-Nachrichten
- Unterstützung für Action-Buttons
- Pause bei Hover

**Beispielverwendung:**

```vue
<Toast position="bottom-right" :limit="5" />
```

```typescript
// In einer beliebigen Komponente oder Service:
import { toastService } from '@/services/ui/ToastService';

// Einfache Nachrichten
toastService.success('Dokument erfolgreich gespeichert');
toastService.error('Fehler beim Speichern des Dokuments');
toastService.warning('Ungespeicherte Änderungen vorhanden');
toastService.info('Neue Funktion verfügbar');

// Erweiterte Konfiguration
toastService.show({
  type: 'success',
  title: 'Erfolgreich gespeichert',
  message: 'Ihr Dokument wurde erfolgreich auf dem Server gespeichert.',
  duration: 5000, // 5 Sekunden
  closable: true,
  action: {
    label: 'Anzeigen',
    onClick: () => router.push('/documents/123')
  }
});
```

### DialogProvider

`DialogProvider.vue` stellt ein System für Dialoge und Modals bereit. Es umfasst `ConfirmDialog` und `InputDialog` für verschiedene Anwendungsfälle.

**Hauptfunktionen:**

- Bestätigungsdialoge (confirm, info, warning, error)
- Eingabedialoge für Benutzereingaben
- Überschreiben der nativen `window.confirm` Funktionalität
- Keyboard-Navigation und Accessibility
- Animationen für ein besseres Benutzererlebnis

**Beispielverwendung:**

```vue
<DialogProvider />
```

```typescript
// In einer beliebigen Komponente:
import { useDialog } from '@/composables/useDialog';

const dialog = useDialog();

// Bestätigungsdialog
async function deleteDocument() {
  const confirmed = await dialog.confirm({
    title: 'Dokument löschen',
    message: 'Möchten Sie dieses Dokument wirklich löschen?',
    confirmButtonText: 'Löschen',
    cancelButtonText: 'Abbrechen',
    type: 'warning'
  });
  
  if (confirmed) {
    // Löschlogik hier
  }
}

// Eingabedialog
async function renameDocument() {
  const newName = await dialog.prompt({
    title: 'Dokument umbenennen',
    message: 'Geben Sie einen neuen Namen für das Dokument ein:',
    defaultValue: document.name,
    validator: (value) => value.length >= 3 || 'Der Name muss mindestens 3 Zeichen lang sein.'
  });
  
  if (newName) {
    // Umbenennungslogik hier
  }
}
```

## Design-System

### CSS-Variablen

Die Komponenten verwenden durchgängig CSS-Variablen für ein konsistentes Design:

```css
:root {
  /* Farben */
  --n-color-primary: #0066cc;
  --n-color-primary-dark: #0052a3;
  --n-color-primary-light: #4299e1;
  --n-color-danger: #e53e3e;
  --n-color-warning: #f59e0b;
  --n-color-success: #10b981;
  --n-color-info: #3b82f6;
  
  /* Graustufen */
  --n-color-white: #ffffff;
  --n-color-gray-50: #f9fafb;
  --n-color-gray-100: #f5f5f5;
  --n-color-gray-200: #e2e8f0;
  --n-color-gray-300: #e2e8f0;
  --n-color-gray-400: #cbd5e0;
  --n-color-gray-500: #a0aec0;
  --n-color-gray-600: #718096;
  --n-color-gray-700: #4a5568;
  --n-color-gray-800: #2d3748;
  --n-color-gray-900: #1a202c;
  
  /* Typography */
  --n-font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --n-font-size-xs: 0.75rem;
  --n-font-size-sm: 0.875rem;
  --n-font-size-md: 1rem;
  --n-font-size-lg: 1.125rem;
  --n-font-size-xl: 1.25rem;
  
  /* Layout */
  --n-border-radius: 4px;
  --n-border-radius-sm: 2px;
  --n-border-radius-lg: 8px;
  --n-header-height: 64px;
  --n-sidebar-width: 256px;
  --n-sidebar-collapsed-width: 64px;
  --n-footer-height: 48px;
  
  /* Übergänge */
  --n-transition-quick: 0.2s;
  --n-transition-normal: 0.3s;
  --n-transition-slow: 0.5s;
}
```

### Responsive Design

Alle Komponenten unterstützen das responsive Design durch:

- Mobile-First-Ansatz
- Responsive Breakpoints (z.B. 480px, 768px, 1024px)
- Flexiblen Layoutstrukturen mit CSS Flexbox
- Anpassungen für verschiedene Gerätegruppen

### Dark Mode

Das Design-System unterstützt Dark Mode über:

- System-basierte Erkennung (`prefers-color-scheme: dark`)
- Manuelle Umschaltung
- Separate CSS-Variablen für Dark Mode

## Verwendung und Best Practices

Bei der Verwendung dieser Komponenten sollten folgende Praktiken beachtet werden:

1. **TypeScript-Typen verwenden**: Alle Komponenten haben vollständige TypeScript-Definitionen für Props, Events und Slots.

2. **Komposition bevorzugen**: Kombinieren Sie die Basiskomponenten zu komplexeren UI-Elementen.

3. **CSS-Variablen für Anpassungen**: Überschreiben Sie CSS-Variablen für lokale Anpassungen statt direkte Styles.

4. **Accessibility beachten**: Alle Komponenten unterstützen ARIA-Attribute, Keyboard-Navigation und Screenreader.

5. **Responsive Design testen**: Testen Sie die Anwendung auf verschiedenen Geräten und Bildschirmgrößen.

6. **Events konsequent verwenden**: Nutzen Sie die definierten Events für die Kommunikation zwischen Komponenten.

7. **v-model für interaktive Komponenten**: Verwenden Sie v-model für Form-Komponenten wie Input, Checkbox, etc.

Beispiel für eine typische Seitenstruktur:

```vue
<template>
  <MainLayout>
    <template #header>
      <Header :user="user" @logout="logout" />
    </template>
    
    <template #sidebar>
      <Sidebar :items="menuItems" @item-click="navigate" />
    </template>
    
    <div class="document-list-container">
      <Card title="Dokumente">
        <div class="document-actions">
          <Button variant="primary" @click="createDocument">Neues Dokument</Button>
          <Input v-model="searchQuery" placeholder="Suchen..." />
        </div>
        
        <DocumentList :documents="filteredDocuments" />
      </Card>
    </div>
  </MainLayout>
  
  <Toast />
  <DialogProvider />
</template>
```