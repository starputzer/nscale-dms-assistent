# Legacy-Code Deaktivierungsplan

**Letztes Update: 11.05.2025**

Dieser Deaktivierungsplan beschreibt die schrittweise Entfernung des Legacy-Vanilla-JavaScript-Codes nach der erfolgreichen Migration zu Vue 3 Single File Components (SFC). Der Plan definiert einen strukturierten, risikominimierten Ansatz für die vollständige Ablösung der Legacy-Implementierung.

## 1. Übersicht

Nach Abschluss der Migration von Vanilla JavaScript zu Vue 3 SFC ist es nun an der Zeit, den Legacy-Code systematisch zu deaktivieren. Dieser Plan berücksichtigt alle Abhängigkeiten und Risiken, um einen reibungslosen Übergang zu gewährleisten.

### Deaktivierungsphasen

Der Deaktivierungsplan besteht aus den folgenden sechs Phasen, die nacheinander durchgeführt werden:

1. **Vorbereitung und Analyse** - Analyse aller Legacy-Komponenten und Abhängigkeiten
2. **Einrichtung des Deaktivierungsframeworks** - Implementation von Monitoringsystem und Fallbacks
3. **Deaktivierung der UI-Komponenten** - Entfernung der Legacy-UI-Elemente
4. **Deaktivierung der funktionalen Komponenten** - Entfernung der Legacy-Geschäftslogik
5. **Deaktivierung der Utilities** - Entfernung der Legacy-Hilfsfunktionen
6. **Entfernung des Bridge-Systems** - Vollständige Entfernung des Legacy-Codes

### Priorisierte Deaktivierungsliste

Die folgende Tabelle zeigt die priorisierte Reihenfolge der zu deaktivierenden Komponenten:

| Priorität | Komponente | Typ | Vue 3-Äquivalent | Risiko | Abhängigkeiten |
|-----------|------------|-----|------------------|--------|----------------|
| 1 | Dokumentenkonverter | Funktional | DocumentConverterContainer.vue | Niedrig | Keine direkten |
| 2 | Basis-UI-Komponenten | UI | UI-Komponenten in src/components/ui/base | Niedrig | Wird von mehreren Komponenten genutzt |
| 3 | Admin-Panel | Funktional | AdminPanel.vue | Mittel | Feedback-System |
| 4 | Feedback-System | Funktional | FeedbackComponents in src/components/ui/feedback | Mittel | Admin-Panel |
| 5 | Settings | Funktional | SettingsPanel.vue | Mittel | Benutzereinstellungen |
| 6 | Chat-Basis | Funktional | ChatContainer.vue | Hoch | EnhancedChat |
| 7 | EnhancedChat | Funktional | EnhancedChatContainer.vue | Hoch | Chat-Kernsystem |
| 8 | Performance-Monitor | Utility | PerformanceMonitor.ts | Mittel | Kein direktes |
| 9 | API-Client | Utility | ApiService.ts | Hoch | Wird von allen Komponenten genutzt |
| 10 | Feature-Flags | Utility | useFeatureToggles.ts | Kritisch | Gesamtes System |
| 11 | Bridge-System | Kern | - | Kritisch | Gesamtes System |

## 2. Deaktivierungsstrategie

### Allgemeine Strategie

Die Deaktivierung erfolgt durch ein erweitertes Feature-Toggle-System, das folgende Funktionen bietet:

- **Granulare Kontrolle**: Jede Komponente kann individuell aktiviert/deaktiviert werden
- **Monitoring**: Automatische Erfassung von Fehlern und Performance-Metriken
- **Automatisches Fallback**: Bei kritischen Fehlern automatische Reaktivierung des Legacy-Codes
- **A/B-Testing**: Möglichkeit, bei einem Teil der Benutzer Legacy-Code und bei anderen Vue-Code zu verwenden
- **Notfall-Rollback**: Globaler Schalter zur sofortigen Reaktivierung aller Legacy-Komponenten

### Feature-Toggle-Management

Die Deaktivierung wird durch ein erweitertes Feature-Toggle-System gesteuert:

```typescript
// Beispiel für erweitertes Feature-Toggle-System
export interface DeactivationToggle extends FeatureToggle {
  component: string;          // Name der Komponente
  legacyPath: string;         // Pfad zur Legacy-Implementierung
  vuePath: string;            // Pfad zur Vue-Implementierung
  status: 'active' | 'deactivated' | 'removed'; // Status der Legacy-Komponente
  successRate: number;        // Erfolgsrate der Vue-Implementierung
  errorCount: number;         // Fehleranzahl seit Deaktivierung
  lastChecked: Date;          // Letzte Überprüfung
  autoFallback: boolean;      // Automatischer Fallback aktiviert?
  dependencies: string[];     // Abhängige Komponenten
}
```

## 3. Deaktivierungsprozess nach Kategorien

### UI-Komponenten Deaktivierung

Die UI-Komponenten werden nach diesem Prozess deaktiviert:

1. **Basis-UI-Elemente**: Button, Input, Card und andere Basis-Elemente
   ```javascript
   // Deaktivierung von Legacy-Button-Komponente
   deactivationManager.deactivate('ui.button', {
     dependencies: [],
     monitorSelectors: ['.nscale-btn', '.legacy-button'],
     fallbackThreshold: 5  // Fehlertoleranz
   });
   ```

2. **Layout-Komponenten**: Container, Grid, Flexbox-Layout
   ```javascript
   // Deaktivierung von Legacy-Layout-Komponenten
   deactivationManager.deactivate('ui.layout', {
     dependencies: ['ui.button', 'ui.input'],
     requiresUserInteraction: false
   });
   ```

3. **Form-Komponenten**: Formulare, Validierungen, komplexe Inputs
   ```javascript
   // Deaktivierung von Legacy-Form-Komponenten
   deactivationManager.deactivate('ui.form', {
     dependencies: ['ui.button', 'ui.input', 'ui.layout'],
     requiresUserInteraction: true,
     criticalFunctionality: true
   });
   ```

### Funktionale Komponenten Deaktivierung

Die funktionalen Komponenten werden nach diesem Prozess deaktiviert:

1. **Dokumentenkonverter-Komponenten**
   ```javascript
   // Deaktivierung des Legacy-Dokumentenkonverters
   deactivationManager.deactivate('functional.docConverter', {
     dependencies: ['ui.button', 'ui.form'],
     criticalFunctionality: true,
     dataIntegrityCheck: true
   });
   ```

2. **Admin-Komponenten**
   ```javascript
   // Deaktivierung der Legacy-Admin-Komponenten
   deactivationManager.deactivate('functional.admin', {
     dependencies: ['ui.layout', 'ui.form', 'functional.docConverter'],
     restrictToRoles: ['admin', 'superadmin'],
     graduallRollout: true
   });
   ```

3. **Chat-Interface-Komponenten**
   ```javascript
   // Deaktivierung der Legacy-Chat-Komponenten
   deactivationManager.deactivate('functional.chat', {
     dependencies: ['ui.layout', 'ui.button', 'ui.input'],
     criticalFunctionality: true,
     userImpact: 'high',
     rolloutPercentage: 10  // Schrittweise Einführung
   });
   ```

### Utilities und Hilfsfunktionen Deaktivierung

Die Utilities werden nach diesem Prozess deaktiviert:

1. **Helper-Funktionen**
   ```javascript
   // Deaktivierung von Legacy-Helper-Funktionen
   deactivationManager.deactivate('util.helpers', {
     dependencies: [],
     requiresRefactoringCheck: true
   });
   ```

2. **Utilities**
   ```javascript
   // Deaktivierung von Legacy-Utilities
   deactivationManager.deactivate('util.common', {
     dependencies: ['util.helpers'],
     deepDependencyCheck: true
   });
   ```

3. **Globale Funktionen**
   ```javascript
   // Deaktivierung von globalen Legacy-Funktionen
   deactivationManager.deactivate('util.global', {
     dependencies: ['util.helpers', 'util.common'],
     requiresGlobalScopeCheck: true
   });
   ```

## 4. Monitoring und Diagnose

### Deaktivierungs-Monitoring

Für jede deaktivierte Komponente werden folgende Metriken erfasst:

- **Fehlerrate**: Anzahl der Fehler im Vergleich zur Legacy-Implementierung
- **Performance**: Ladezeiten, Renderzeiten und Interaktionszeiten
- **Benutzerfeedback**: Automatisch erfasste und explizite Nutzerbewertungen
- **Ressourcenverbrauch**: Memory-Nutzung, CPU-Auslastung, Netzwerkanfragen

### Diagnose-Dashboard

```javascript
// Beispiel für Monitoring-Implementation
class DeactivationMonitor {
  // Erfassung von Fehlern nach Deaktivierung
  trackError(componentName, error) {
    const component = this.deactivatedComponents.get(componentName);
    if (component) {
      component.errorCount++;
      this.evaluateFallbackNeed(component);
    }
    this.errorLog.push({
      component: componentName,
      error,
      timestamp: new Date(),
      stackTrace: error.stack
    });
  }
  
  // Analyse der Performance-Auswirkungen
  measurePerformanceImpact(componentName) {
    const beforeMetrics = this.baselineMetrics.get(componentName);
    const currentMetrics = this.collectPerformanceMetrics(componentName);
    
    return {
      loadTime: currentMetrics.loadTime - beforeMetrics.loadTime,
      renderTime: currentMetrics.renderTime - beforeMetrics.renderTime,
      memoryUsage: currentMetrics.memoryUsage - beforeMetrics.memoryUsage
    };
  }
}
```

## 5. Fallback-Mechanismus

### Automatisches Fallback

Bei kritischen Fehlern wird ein automatischer Fallback-Mechanismus aktiviert:

```javascript
// Implementierung des Fallback-Mechanismus
function evaluateFallbackNeed(component) {
  // Prüfen, ob Fehlertoleranz überschritten wurde
  if (component.errorCount > component.fallbackThreshold) {
    // Fallback zur Legacy-Implementierung
    console.warn(`Automatischer Fallback für ${component.name} aktiviert`);
    component.deactivated = false;
    component.status = 'active';
    component.lastFallback = new Date();
    
    // Event für Monitoring auslösen
    events.emit('componentFallback', {
      component: component.name,
      reason: 'error_threshold_exceeded',
      errorCount: component.errorCount
    });
    
    // Legacy-Code reaktivieren
    activateLegacyCode(component.legacyPath);
  }
}
```

### Manueller Rollback

Ein manueller Rollback-Mechanismus ist über das Admin-Panel verfügbar:

```javascript
// Manueller Rollback
function manualRollback(componentName) {
  const component = deactivatedComponents.get(componentName);
  if (component) {
    component.deactivated = false;
    component.status = 'active';
    component.lastFallback = new Date();
    component.manualFallbackCount++;
    
    // Legacy-Code reaktivieren
    activateLegacyCode(component.legacyPath);
    
    // Entwickler benachrichtigen
    notifyDevelopers({
      component: componentName,
      action: 'manual_rollback',
      timestamp: new Date(),
      user: currentUser
    });
    
    return {
      success: true,
      message: `Legacy-Code für ${componentName} wurde erfolgreich reaktiviert`
    };
  }
  
  return {
    success: false,
    message: `Komponente ${componentName} nicht gefunden`
  };
}
```

## 6. Implementierungsplan

### Phase 1: Vorbereitung und Analyse (Woche 1-2)

- [x] Vollständige Analyse aller Legacy-Komponenten
- [x] Identifikation aller Abhängigkeiten
- [ ] Baseline-Performance-Messungen durchführen
- [ ] Deaktivierungs-Monitoring-System implementieren
- [ ] Erweitertes Feature-Toggle-System implementieren

### Phase 2: UI-Komponenten (Woche 3-4)

- [ ] Basis-UI-Elemente deaktivieren
- [ ] Layout-Komponenten deaktivieren
- [ ] Form-Komponenten deaktivieren
- [ ] UI-Regressionstests durchführen

### Phase 3: Funktionale Komponenten (Woche 5-8)

- [ ] Dokumentenkonverter-Komponenten deaktivieren
- [ ] Admin-Komponenten deaktivieren
- [ ] Chat-Interface-Komponenten deaktivieren
- [ ] Funktionale Tests durchführen

### Phase 4: Utilities (Woche 9-10)

- [ ] Helper-Funktionen deaktivieren
- [ ] Utilities deaktivieren
- [ ] Globale Funktionen deaktivieren
- [ ] Integrationstests durchführen

### Phase 5: Bridge und Abschluss (Woche 11-12)

- [ ] Bridge-System stufenweise entfernen
- [ ] Legacy-Code vollständig entfernen
- [ ] Abschließende End-to-End-Tests
- [ ] Migrationsabschluss verkünden

## 7. Risikobewertung und Gegenmaßnahmen

| Risiko | Wahrscheinlichkeit | Auswirkung | Gegenmaßnahmen |
|--------|-------------------|------------|----------------|
| Unentdeckte Abhängigkeiten | Hoch | Kritisch | Automatische Abhängigkeitsanalyse, stufenweise Deaktivierung |
| Performance-Regression | Mittel | Hoch | Kontinuierliches Performance-Monitoring, Benchmarks |
| Datenkonsistenzprobleme | Niedrig | Kritisch | Datenvalidierung vor/nach Deaktivierung |
| Benutzerfehlermeldungen | Hoch | Mittel | Transparentes Fehler-Logging, automatische Reaktivierung |
| Inkompatibilität mit älteren Browsern | Mittel | Niedrig | Browserkompatibilitätstests, Nutzer mit alten Browsern bei Legacy belassen |

## 8. Testplan

Für jede Deaktivierungsphase werden folgende Tests durchgeführt:

1. **Unit-Tests**: Testen der Vue-Komponenten in Isolation
2. **Integrationstests**: Testen der Zusammenarbeit zwischen Komponenten
3. **End-to-End-Tests**: Testen vollständiger Benutzerszenarien
4. **Performance-Tests**: Vergleich der Performance vor und nach Deaktivierung
5. **A/B-Tests**: Vergleich der Nutzerinteraktion zwischen Legacy- und Vue-Implementierungen

## 9. Kommunikationsplan

### Interne Kommunikation

- Wöchentliche Updates an das Entwicklungsteam
- Täglicher Status im Monitoring-Dashboard
- Sofortige Benachrichtigung bei kritischen Problemen

### Externe Kommunikation

- Benachrichtigung der Benutzer über bevorstehende Änderungen
- Feedback-Kanal für Benutzer
- Transparente Kommunikation über Probleme und deren Behebung

## 10. Erfolgskriterien

Die erfolgreiche Deaktivierung wird anhand folgender Kriterien gemessen:

1. **Fehlerrate**: Weniger als 1% zusätzliche Fehler im Vergleich zur Legacy-Implementierung
2. **Performance**: Mindestens 20% Verbesserung der Ladezeiten und Renderzeiten
3. **Benutzerzufriedenheit**: Mindestens gleichbleibende Benutzerzufriedenheit
4. **Code-Qualität**: Reduzierung der Code-Basis um mindestens 30%
5. **Wartbarkeit**: Reduzierung der Komplexität und Verbesserung der Testabdeckung

## 11. Nächste Schritte

1. Implementierung des Deaktivierungs-Monitoring-Systems
2. Erweiterung des Feature-Toggle-Systems
3. Beginn der stufenweisen Deaktivierung gemäß Plan