# React-Migrationsstrategie

Dieses Dokument beschreibt die Strategie für die Migration von der bestehenden HTML/CSS/JS-Implementierung zu React, nachdem die Vue.js-Migration aufgegeben wurde.

## Ausgangssituation

Nach der Aufgabe der Vue.js-Migration kehrt die Anwendung vorübergehend zur bewährten HTML/CSS/JS-Implementierung zurück und beginnt einen neuen Migrationsansatz mit React.

### Gründe für den Wechsel zu React

1. **Bessere TypeScript-Integration**: React bietet eine nahtlosere Integration mit TypeScript
2. **Deklaratives Rendering**: Weniger Konflikte mit der DOM-Manipulation
3. **Umfangreiches Ökosystem**: Großes Angebot an verfügbaren Komponenten und Bibliotheken
4. **Stabilere Community**: Langfristige Unterstützung und Weiterentwicklung
5. **Verbesserte Entwicklerwerkzeuge**: Umfassende Debugging- und Entwicklertools

### Lehren aus der Vue.js-Migration

Die folgenden Erkenntnisse aus der gescheiterten Vue.js-Migration fließen in die React-Migrationsstrategie ein:

1. **Vermeidung paralleler Implementierungen**: Klare Trennung zwischen React- und HTML/CSS/JS-Code
2. **Einheitliche Pfadstrategie**: Konsistente Asset-Organisation von Anfang an
3. **Isolierte Komponenten zuerst**: Migration beginnt mit eigenständigen, abgegrenzten Komponenten
4. **Robuste Fallback-Mechanismen**: Automatische Fallbacks bei Fehlern oder Problemen
5. **Eindeutige Zustandsverwaltung**: Klare Separation der Zustandsverwaltung zwischen Implementierungen

## Migrationsstrategie

### 1. Vorbereitende Maßnahmen

- **Projektstruktur**: Einrichtung einer klaren Ordnerstruktur für React-Komponenten
- **Build-System**: Konfiguration von Webpack/Vite für React mit TypeScript
- **Styling-Strategie**: Definition einer einheitlichen Styling-Strategie (CSS-Module, Styled Components oder CSS-in-JS)
- **Komponentenbibliothek**: Auswahl oder Erstellung einer Basisbibliothek für UI-Komponenten

### 2. Komponenten-Migration

Die Migration erfolgt nach dem "Strangler Fig Pattern" in folgender Reihenfolge:

1. **Dokumentenkonverter** (Höchste Priorität)
   - Eigenständige Komponente mit klar definierten Grenzen
   - Gut geeignet für isolierte Migration

2. **Admin-Komponenten** (Mittlere Priorität)
   - Feedback-Verwaltung
   - System-Monitoring
   - Benutzerverwaltung
   - MOTD-Verwaltung

3. **Chat-Interface** (Hohe Priorität)
   - ChatView Komponente
   - MessageList und MessageItem Komponenten
   - SessionList und SessionItem Komponenten

4. **Einstellungen** (Niedrigere Priorität)
   - Allgemeine Einstellungen
   - Erscheinungsbild-Einstellungen
   - Kontoeinstellungen

### 3. Zustandsverwaltung

Die Anwendung wird eine klare Zustandsverwaltungsstrategie mit React implementieren:

- **Redux/RTK**: Für komplexe globale Zustände (Sessions, Benutzerauthentifizierung)
- **Context API**: Für weniger komplexe, themenbezogene Zustände (UI-Thema, Lokalisierung)
- **Component State**: Für komponentenlokale Zustände
- **React Query**: Für serverseitige Zustände und API-Kommunikation

### 4. Technische Umsetzung

#### Projektstruktur

```
/src
  /components        # Wiederverwendbare Komponenten
    /admin           # Admin-spezifische Komponenten
    /chat            # Chat-Interface-Komponenten
    /common          # Gemeinsame Basis-Komponenten
    /doc-converter   # Dokumentenkonverter-Komponenten
    /settings        # Einstellungs-Komponenten
  /hooks             # Benutzerdefinierte React-Hooks
  /context           # React Context-Definitionen
  /redux             # Redux Store und Slices
    /slices          # Redux-Toolkit-Slices
    /selectors       # Redux-Selektoren
  /api               # API-Client und Endpunkt-Definitionen
  /utils             # Hilfsfunktionen und -klassen
  /styles            # Globale Stile und Theming
  /types             # TypeScript-Typdefinitionen
  /pages             # Seitenkomponenten
```

#### Feature-Toggle-System

Das Feature-Toggle-System wird für React angepasst:

```typescript
// In src/utils/featureToggles.ts
export const isFeatureEnabled = (featureName: string): boolean => {
  const featureValue = localStorage.getItem(`feature_${featureName}`);
  return featureValue === 'true';
};

export const setFeatureEnabled = (featureName: string, enabled: boolean): void => {
  localStorage.setItem(`feature_${featureName}`, enabled ? 'true' : 'false');
};

// In components
import { isFeatureEnabled } from '../utils/featureToggles';

const MyComponent = () => {
  const useReactImplementation = isFeatureEnabled('reactMyFeature');
  
  return useReactImplementation 
    ? <ReactImplementation />
    : <FallbackImplementation />;
};
```

#### Fallback-Mechanismen

Jede React-Komponente wird mit einem Fallback-Mechanismus implementiert:

```tsx
// In src/components/doc-converter/DocConverterWrapper.tsx
import React, { useEffect, useState } from 'react';
import { DocConverter } from './DocConverter';
import { isFeatureEnabled } from '../../utils/featureToggles';

export const DocConverterWrapper: React.FC = () => {
  const [error, setError] = useState<Error | null>(null);
  const useReactImplementation = isFeatureEnabled('reactDocConverter');
  
  if (error || !useReactImplementation) {
    // Aktiviere die klassische Implementierung
    useEffect(() => {
      const container = document.getElementById('classic-doc-converter');
      if (container) {
        container.style.display = 'block';
        
        // Klassisches Script laden
        const script = document.createElement('script');
        script.src = '/static/js/doc-converter-classic.js';
        document.body.appendChild(script);
      }
    }, []);
    
    return <div id="react-doc-converter" style={{ display: 'none' }} />;
  }
  
  return (
    <ErrorBoundary onError={(e) => setError(e)}>
      <div id="react-doc-converter">
        <DocConverter />
      </div>
    </ErrorBoundary>
  );
};
```

#### Styling-Strategie

Die Anwendung wird CSS-Module für komponentenspezifisches Styling verwenden:

```tsx
// In src/components/common/Button.tsx
import React from 'react';
import styles from './Button.module.css';

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger';
  onClick?: () => void;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({ 
  variant = 'primary', 
  onClick, 
  children 
}) => {
  return (
    <button 
      className={`${styles.button} ${styles[variant]}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
};
```

Gemeinsame Stile werden in einer globalen CSS-Datei definiert:

```css
/* src/styles/variables.css */
:root {
  --nscale-primary: #2563eb;
  --nscale-secondary: #475569;
  --nscale-success: #10b981;
  --nscale-warning: #f59e0b;
  --nscale-danger: #ef4444;
  
  --nscale-text: #1e293b;
  --nscale-background: #ffffff;
  --nscale-card-background: #f8fafc;
  
  /* Dark Mode Variablen */
  --nscale-dark-text: #f8fafc;
  --nscale-dark-background: #0f172a;
  --nscale-dark-card-background: #1e293b;
}

/* Globale Klassen */
.nscale-container {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
}
```

## Implementierungsplan

### Phase 1: Grundlagen und Dokumentenkonverter

1. **Woche 1-2: Projektgrundlagen**
   - React-Projekt einrichten mit TypeScript
   - Build-System konfigurieren
   - Basis-Komponenten erstellen
   - Styling-System implementieren

2. **Woche 3-4: Dokumentenkonverter**
   - React-Implementierung des Dokumentenkonverters
   - Feature-Toggle-Integration
   - Fallback-Mechanismen implementieren
   - Vollständige Tests der Komponente

### Phase 2: Admin-Bereich

3. **Woche 5-6: Feedback- und MOTD-Verwaltung**
   - React-Implementierung der Feedback-Verwaltung
   - React-Implementierung der MOTD-Verwaltung
   - Integration mit Feature-Toggles

4. **Woche 7-8: Benutzer- und System-Verwaltung**
   - React-Implementierung der Benutzerverwaltung
   - React-Implementierung des System-Monitorings
   - Integration mit Feature-Toggles

### Phase 3: Chat-Interface

5. **Woche 9-12: Chat-Komponenten**
   - Chat-View Komponente implementieren
   - Message-Komponenten implementieren
   - Session-Komponenten implementieren
   - Zustandsverwaltung mit Redux/Context

### Phase 4: Einstellungen und Feinabstimmung

6. **Woche 13-14: Einstellungen**
   - React-Implementierung der Einstellungsbereiche
   - Integration mit Feature-Toggles

7. **Woche 15-16: Feinabstimmung und Tests**
   - Umfassende Tests aller Komponenten
   - Performance-Optimierungen
   - Bugfixing und Feinabstimmung

## Qualitätssicherung

- **Automatisierte Tests**: Jest und React Testing Library für Komponententests
- **End-to-End-Tests**: Cypress für Integrationstest
- **Visuelle Regression-Tests**: Storybook mit Chromatic für visuelle Konsistenz
- **Code-Qualität**: ESLint und Prettier für Code-Stil und -qualität
- **TypeScript**: Strenge Typprüfung für höhere Codequalität

## Risiken und Mitigationsstrategien

| Risiko | Wahrscheinlichkeit | Auswirkung | Mitigation |
|--------|-------------------|------------|------------|
| Pfadprobleme wie bei Vue.js | Mittel | Hoch | Einheitliche Pfadstrategie von Anfang an, Webpack für Asset-Management |
| Integrationsprobleme mit bestehendem Code | Hoch | Mittel | Klare Isolation von React-Komponenten, eindeutige Feature-Toggles |
| Performanceprobleme | Niedrig | Mittel | Frühzeitige Performance-Tests, Code-Splitting, Lazy Loading |
| Styling-Inkonsistenzen | Mittel | Niedrig | Gemeinsame CSS-Variablen, Styling-Leitfaden, visuelle Regression-Tests |
| Zustandssynchronisationsprobleme | Hoch | Hoch | Zentrale Zustandsverwaltung, klare Datenflüsse, Vermeidung doppelter Zustände |

---

Zuletzt aktualisiert: 05.05.2025