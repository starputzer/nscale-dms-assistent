# Entwicklungsanleitung

Diese Anleitung beschreibt die Entwicklungsumgebung, Build-Prozesse und Best Practices für die Arbeit am nscale Assist App Projekt.

## Projektstruktur

```
/opt/nscale-assist/app/
├── api/                # Server-API (Python)
├── doc_converter/      # Dokumentenkonverter-Backend
├── frontend/           # Klassisches Frontend (HTML/CSS/JS)
│   ├── css/            # CSS-Dateien
│   ├── js/             # JavaScript-Dateien
│   ├── static/         # Statische Ressourcen
│   └── index.html      # Hauptseite
├── modules/            # Backend-Module
└── nscale-react/       # Geplantes React-Frontend (noch nicht implementiert)
```

## Aufgabe der Vue.js-Migration

Die Vue.js-Migration wurde aufgrund zahlreicher Probleme aufgegeben:

1. **Persistente 404-Fehler** für statische Ressourcen
2. **DOM-Manipulationskonflikte** zwischen Vue.js und direkter DOM-Manipulation
3. **Endlosschleifen** in Initialisierungsprozessen
4. **Komplexe Fallback-Mechanismen** mit steigender Komplexität
5. **Unvorhersehbares Rendering-Verhalten** und Styling-Inkonsistenzen

Die Anwendung kehrt vorübergehend zur bewährten HTML/CSS/JS-Implementierung zurück und plant eine neue Migration zu React.

## Entwicklungsumgebung einrichten

### 1. Backend-Setup

```bash
# Python-Abhängigkeiten installieren
pip install -r requirements.txt
pip install -r requirements-converter.txt

# Server starten
cd api/
python server.py
```

### 2. Frontend-Setup (aktuell HTML/CSS/JS)

Die aktuelle Frontend-Implementierung basiert auf HTML/CSS/JavaScript ohne Framework.

```bash
# Server starten
cd api/
python server.py

# Frontend ist unter http://localhost:5000 verfügbar
```

### 3. Zukünftiges React-Setup (geplant)

```bash
# React-Abhängigkeiten installieren (nach Implementierung)
cd nscale-react/
npm install

# Entwicklungsserver starten
npm run dev
```

## Feature-Toggle-System

Die Anwendung verwendet ein Feature-Toggle-System zur kontrollierten Aktivierung neuer Funktionen.

### Toggle-Einstellungen

```javascript
// Zukünftige React-Komponenten aktivieren/deaktivieren
localStorage.setItem('feature_reactDocConverter', 'true');
localStorage.setItem('feature_reactAdmin', 'true');
localStorage.setItem('feature_reactSettings', 'true');
localStorage.setItem('feature_reactChat', 'false');

// Klassische UI erzwingen
localStorage.setItem('useNewUI', 'false');
```

### Toggle-Implementierung

Neue Komponenten sollten immer mit einem Feature-Toggle implementiert werden:

```javascript
// In JavaScript
function initializeComponent() {
  if (isFeatureEnabled('reactComponent')) {
    // React-Komponente mounten
    initializeReactComponent();
  } else {
    // Klassische Implementierung verwenden
    initializeClassicComponent();
  }
}

// Helper-Funktion
function isFeatureEnabled(featureName) {
  return localStorage.getItem(`feature_${featureName}`) === 'true';
}
```

```html
<!-- In HTML -->
<div class="component-container">
  <div id="react-component-mount" style="display: none;">
    <!-- React-Komponente wird hier gemountet -->
  </div>
  <div class="classic-component">
    <!-- Klassische Implementierung -->
  </div>
</div>

<script>
  // Feature-Toggle überprüfen und entsprechende Komponente anzeigen
  if (isFeatureEnabled('reactComponent')) {
    document.getElementById('react-component-mount').style.display = 'block';
    document.querySelector('.classic-component').style.display = 'none';
  }
</script>
```

## Geplante React-Migrations-Workflow

### 1. Komponenten-Extraktion

1. Identifiziere eigenständige UI-Komponenten in der bestehenden Implementierung
2. Definiere klare Schnittstellen für diese Komponenten
3. Erstelle entsprechende React-Komponenten mit identischer Funktionalität
4. Implementiere Feature-Toggles für die neuen Komponenten

### 2. Zentrale Zustandsverwaltung

```typescript
// Beispiel für einen Redux-Store (geplant)
import { configureStore, createSlice, PayloadAction } from '@reduxjs/toolkit';

interface DocConverterState {
  documents: Document[];
  isConverting: boolean;
  error: string | null;
}

const initialState: DocConverterState = {
  documents: [],
  isConverting: false,
  error: null
};

const docConverterSlice = createSlice({
  name: 'docConverter',
  initialState,
  reducers: {
    startConversion: (state) => {
      state.isConverting = true;
      state.error = null;
    },
    conversionSuccess: (state, action: PayloadAction<Document>) => {
      state.isConverting = false;
      state.documents.push(action.payload);
    },
    conversionFailed: (state, action: PayloadAction<string>) => {
      state.isConverting = false;
      state.error = action.payload;
    }
  }
});

export const { startConversion, conversionSuccess, conversionFailed } = docConverterSlice.actions;

export const store = configureStore({
  reducer: {
    docConverter: docConverterSlice.reducer
  }
});
```

### 3. Klare DOM-Ownership

```typescript
// React-Komponente mit klaren Grenzen
import React, { useEffect } from 'react';

const DocConverterComponent: React.FC = () => {
  // Komponenten-spezifischer Zustand und Logik
  
  // Sicherstellen, dass keine direkten DOM-Manipulationen außerhalb von React stattfinden
  useEffect(() => {
    // Aufräumen beim Unmounten
    return () => {
      // Komponente wurde unmounted, alle Ressourcen freigeben
    };
  }, []);
  
  return (
    <div className="doc-converter-container">
      {/* React-verwaltetes UI */}
    </div>
  );
};
```

## CSS-Best-Practices

### 1. CSS-Module für React-Komponenten

```tsx
// DocConverter.tsx
import React from 'react';
import styles from './DocConverter.module.css';

const DocConverter: React.FC = () => {
  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Dokumentenkonverter</h2>
      <div className={styles.uploadArea}>
        {/* Weitere Komponenten */}
      </div>
    </div>
  );
};
```

```css
/* DocConverter.module.css */
.container {
  padding: 1rem;
  border: 1px solid var(--nscale-border-color);
  border-radius: 0.375rem;
}

.title {
  font-size: 1.5rem;
  margin-bottom: 1rem;
  color: var(--nscale-primary);
}

.uploadArea {
  padding: 2rem;
  border: 2px dashed var(--nscale-border-color);
  border-radius: 0.25rem;
  text-align: center;
}
```

### 2. CSS-Variablen für Theming

```css
/* variables.css */
:root {
  /* Farben */
  --nscale-primary: #2563eb;
  --nscale-secondary: #475569;
  --nscale-success: #10b981;
  --nscale-warning: #f59e0b;
  --nscale-danger: #ef4444;
  
  /* Text */
  --nscale-text: #1e293b;
  --nscale-text-light: #64748b;
  
  /* Hintergrund */
  --nscale-background: #ffffff;
  --nscale-background-light: #f8fafc;
  
  /* Abstände */
  --nscale-spacing-sm: 0.5rem;
  --nscale-spacing-md: 1rem;
  --nscale-spacing-lg: 1.5rem;
  
  /* Ränder */
  --nscale-border-color: #e2e8f0;
  --nscale-border-radius: 0.375rem;
}

/* Dark Mode */
.theme-dark {
  --nscale-primary: #3b82f6;
  --nscale-secondary: #64748b;
  --nscale-text: #f8fafc;
  --nscale-text-light: #94a3b8;
  --nscale-background: #0f172a;
  --nscale-background-light: #1e293b;
  --nscale-border-color: #334155;
}
```

## Fehlerbehandlung und Debugging

### Fehler protokollieren

```javascript
// Einfaches Logging
console.log('[Komponente] Nachricht');

// Erweiterte Protokollierung mit Zeitstempel
function logInfo(component, message) {
  const timestamp = new Date().toISOString().split('T')[1].replace('Z', '');
  console.log(`[${timestamp}] [${component}] ${message}`);
}

function logError(component, message, error) {
  const timestamp = new Date().toISOString().split('T')[1].replace('Z', '');
  console.error(`[${timestamp}] [${component}] ${message}`, error);
  
  // Optional: Fehler an Server senden
  reportErrorToServer(component, message, error);
}
```

### Fallback-Mechanismen implementieren

```javascript
// Primäre Methode versuchen, bei Fehler auf Fallback-Methode zurückgreifen
try {
  initializeReactComponent();
} catch (error) {
  logError('Komponente', 'Fehler beim Laden der React-Komponente:', error);
  initializeFallbackComponent();
}
```

### DOM-Sichtbarkeit sicherstellen

```javascript
function ensureVisibility(selector) {
  const element = document.querySelector(selector);
  if (element) {
    element.style.display = 'block';
    element.style.visibility = 'visible';
    element.style.opacity = '1';
  }
}
```

## Build und Deployment

### Zukünftiger React-Build (geplant)

```bash
# Build erstellen
cd nscale-react/
npm run build

# Komponenten bereitstellen
cp -r build/* ../frontend/static/react/
```

### Server-Deployment

```bash
# Anwendung deployen
./build-and-deploy.sh

# Server neustarten
systemctl restart nscale-assist
```

## Ressourcen aktualisieren

Wenn neue CSS- oder JavaScript-Dateien hinzugefügt werden:

1. Datei an mehreren Pfaden bereitstellen (Vermächtnis des früheren Multipath-Ansatzes):
```bash
cp frontend/js/my-component.js frontend/static/js/
```

2. Pfad-Tester aktualisieren:
```javascript
// In doc-converter-path-tester.js
const coreResources = {
  js: [
    // ...
    'js/my-component.js',
  ],
  // ...
};
```

## Entwicklungs-Best-Practices

1. **Implementiere Feature-Toggles**: Jede neue Funktionalität sollte mit Feature-Toggles implementiert werden
2. **Klare DOM-Ownership**: Vermeide Konflikte zwischen Framework-gesteuerten und direkten DOM-Manipulationen
3. **Einheitliches CSS**: Verwende CSS-Variablen und einheitliches Styling
4. **Robuste Fehlerbehandlung**: Implementiere Fallback-Mechanismen und ausführliches Logging
5. **Klare Komponentengrenzen**: Definiere klare Schnittstellen zwischen Komponenten
6. **Vermeidung globaler Zustände**: Verwende Zustandsverwaltung mit klarer Struktur
7. **Vermeidung von Timing-Problemen**: Stelle sicher, dass DOM-Elemente existieren, bevor du auf sie zugreifst

## Bekannte Limitierungen

1. **Pfadprobleme**: Einige Ressourcen müssen unter mehreren Pfaden bereitgestellt werden (Vermächtnis)
2. **Inkonsistente Initialisierung**: Legacy-Code kann unterschiedliche Initialisierungsmuster verwenden
3. **Globale Namespace-Verschmutzung**: Älterer JavaScript-Code nutzt globale Variablen
4. **Mischrealität zwischen Frameworks**: Während der React-Migration wird es eine Übergangsphase geben

## Qualitätssicherung

### Manuelle Tests

1. Feature-Toggle-Test:
   - Feature-Toggles aktivieren/deaktivieren
   - Überprüfen, ob die entsprechenden Komponenten korrekt angezeigt werden

2. Responsivitätstest:
   - Die Anwendung auf verschiedenen Bildschirmgrößen testen
   - Mobile, Tablet und Desktop-Ansichten überprüfen

3. Browserkompatibilitätstest:
   - In Chrome, Firefox, Safari und Edge testen
   - Besonders auf CSS- und JavaScript-Kompatibilität achten

### Automatisierte Tests (geplant)

```typescript
// Beispiel für React-Tests mit Jest und React Testing Library (geplant)
import { render, screen, fireEvent } from '@testing-library/react';
import DocConverter from './DocConverter';

test('renders upload button', () => {
  render(<DocConverter />);
  const uploadButton = screen.getByText(/Datei hochladen/i);
  expect(uploadButton).toBeInTheDocument();
});

test('shows error message when upload fails', async () => {
  // Mock für fehlgeschlagenen Upload
  jest.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Upload fehlgeschlagen'));
  
  render(<DocConverter />);
  const uploadButton = screen.getByText(/Datei hochladen/i);
  fireEvent.click(uploadButton);
  
  // Warten auf die Fehlermeldung
  const errorMessage = await screen.findByText(/Fehler beim Hochladen/i);
  expect(errorMessage).toBeInTheDocument();
});
```

---

Zuletzt aktualisiert: 05.05.2025