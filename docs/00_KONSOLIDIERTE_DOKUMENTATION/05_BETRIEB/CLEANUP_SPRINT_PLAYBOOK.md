# Cleanup Sprint Playbook

## 🎯 Übersicht

Dieses Playbook definiert den standardisierten Prozess für quartalsweise Cleanup-Sprints im nscale DMS Assistant Projekt. Es dient als Vorlage und Leitfaden für zukünftige Sprints.

## 📋 Sprint-Checkliste

### Pre-Sprint (2 Wochen vorher)

#### Analyse Phase
- [ ] Code-Metriken sammeln
- [ ] Technische Schulden identifizieren
- [ ] Performance-Baseline messen
- [ ] Team-Verfügbarkeit prüfen
- [ ] Stakeholder-Buy-in sichern

#### Planung
- [ ] Sprint-Ziele definieren
- [ ] Backlog erstellen und priorisieren
- [ ] Team-Aufteilung planen
- [ ] Tools und Lizenzen prüfen
- [ ] Kommunikationsplan erstellen

### Sprint-Durchführung

#### Woche 1: Quick Wins & Analyse
- [ ] Kickoff Meeting
- [ ] Automated Tools einrichten
- [ ] Low-hanging Fruits identifizieren
- [ ] Quick Wins umsetzen
- [ ] Detailanalyse für Woche 2

#### Woche 2: Deep Cleanup
- [ ] Major Refactorings
- [ ] Test-Erweiterungen
- [ ] Dokumentations-Updates
- [ ] Performance-Optimierungen
- [ ] Final Testing

### Post-Sprint
- [ ] Metriken vergleichen
- [ ] Sprint Review durchführen
- [ ] Retrospektive halten
- [ ] Dokumentation finalisieren
- [ ] Nächsten Sprint planen

## 🛠️ Standard-Tools

### Code-Analyse
```json
{
  "scripts": {
    "analyze:typescript": "tsc --noEmit --strict",
    "analyze:dead-code": "ts-prune && knip",
    "analyze:circular": "madge --circular src",
    "analyze:bundle": "vite-bundle-visualizer",
    "analyze:dependencies": "depcheck && npm audit",
    "analyze:all": "npm run analyze:typescript && npm run analyze:dead-code && npm run analyze:circular && npm run analyze:bundle && npm run analyze:dependencies"
  }
}
```

### Metriken-Tracking
```typescript
interface CleanupMetrics {
  codeQuality: {
    typescriptErrors: number;
    eslintWarnings: number;
    complexityScore: number;
  };
  testing: {
    coverage: number;
    testCount: number;
    testDuration: number;
  };
  performance: {
    bundleSize: number;
    initialLoad: number;
    memoryUsage: number;
  };
  maintenance: {
    dependencies: number;
    outdatedDeps: number;
    vulnerabilities: number;
  };
}
```

## 📊 Sprint-Metriken

### Erfolgs-KPIs

| KPI | Beschreibung | Ziel |
|-----|--------------|------|
| Code Coverage | Test-Abdeckung in % | +10% pro Sprint |
| Bundle Size | Build-Größe in KB | -10% pro Sprint |
| Type Safety | TypeScript Strict Errors | -50% pro Sprint |
| Tech Debt | SonarQube Debt Ratio | <5% |
| Dependencies | Outdated Dependencies | 0 |

### Tracking-Dashboard

```yaml
# cleanup-metrics.yml
metrics:
  - name: "TypeScript Coverage"
    query: "type-coverage --detail"
    target: ">95%"
    
  - name: "Test Coverage"
    query: "vitest run --coverage"
    target: ">80%"
    
  - name: "Bundle Size"
    query: "size-limit"
    target: "<250KB"
    
  - name: "Load Time"
    query: "lighthouse --only-categories=performance"
    target: ">95"
```

## 👥 Team-Rollen

### Sprint Lead
- **Verantwortung**: Gesamtkoordination
- **Aufgaben**:
  - Sprint-Planung
  - Daily Standups
  - Blocker-Beseitigung
  - Stakeholder-Updates

### Tech Lead
- **Verantwortung**: Technische Entscheidungen
- **Aufgaben**:
  - Architektur-Reviews
  - Code-Review-Koordination
  - Tool-Auswahl
  - Technische Dokumentation

### Quality Champion
- **Verantwortung**: Qualitätssicherung
- **Aufgaben**:
  - Test-Strategie
  - Coverage-Monitoring
  - Performance-Tests
  - Regressions-Prävention

## 📈 Best Practices

### 1. Priorisierung

```typescript
enum ImpactLevel {
  Critical = 4,  // Security, Data Loss
  High = 3,      // Performance, UX
  Medium = 2,    // Maintainability
  Low = 1        // Nice-to-have
}

enum EffortLevel {
  Trivial = 1,   // <2 hours
  Small = 2,     // 2-8 hours
  Medium = 3,    // 1-3 days
  Large = 4      // >3 days
}

// Priority = Impact / Effort
```

### 2. Code Review Standards

**Cleanup-spezifische Checks:**
- [ ] Keine neuen TypeScript Errors
- [ ] Tests für geänderten Code
- [ ] Dokumentation aktualisiert
- [ ] Performance nicht verschlechtert
- [ ] Keine neuen Dependencies

### 3. Incremental Approach

```typescript
// Beispiel: TypeScript Migration
// Schritt 1: Aktiviere noImplicitAny
{
  "compilerOptions": {
    "noImplicitAny": true
  }
}

// Schritt 2: Fix file by file
// @ts-nocheck am Anfang für noch nicht migrierte Files

// Schritt 3: Entferne @ts-nocheck nach Fix

// Schritt 4: Aktiviere strictNullChecks
// ... und so weiter
```

## 🔄 Continuous Cleanup

### Wöchentliche Tasks
- Dependency Updates (Patch)
- Dead Code Check
- Performance Monitoring
- Security Scanning

### Monatliche Tasks
- Dependency Updates (Minor)
- Bundle Size Review
- Test Coverage Review
- Documentation Audit

### Automation

```yaml
# .github/workflows/weekly-cleanup.yml
name: Weekly Cleanup Tasks
on:
  schedule:
    - cron: '0 9 * * 1' # Montags 9:00

jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - name: Update Dependencies
        run: |
          npm update
          npm audit fix
          
      - name: Check Dead Code
        run: npm run analyze:dead-code
        
      - name: Create PR if changes
        uses: peter-evans/create-pull-request@v5
        with:
          title: 'chore: Weekly cleanup tasks'
          commit-message: 'chore: automated weekly cleanup'
```

## 📚 Ressourcen & Templates

### Sprint-Dokumente
- [Sprint Planning Template](./templates/sprint-planning.md)
- [Daily Standup Template](./templates/daily-standup.md)
- [Sprint Review Template](./templates/sprint-review.md)
- [Retrospective Template](./templates/retrospective.md)

### Analyse-Scripts
```bash
#!/bin/bash
# cleanup-analysis.sh

echo "🔍 Running Cleanup Analysis..."

echo "\n📊 TypeScript Analysis"
npx type-coverage --detail

echo "\n🧪 Test Coverage"
npm run test:coverage

echo "\n📦 Bundle Analysis"
npm run build:analyze

echo "\n🔗 Dependency Analysis"
npx depcheck

echo "\n🔄 Circular Dependencies"
npx madge --circular src

echo "\n✅ Analysis Complete!"
```

### Kommunikations-Template

```markdown
## 📢 Cleanup Sprint Update - Tag X

### ✅ Gestern erreicht
- X TypeScript Errors behoben
- X% Test Coverage erhöht
- XKB Bundle Size reduziert

### 🎯 Heute geplant
- Migration von Component X
- Tests für Module Y
- Performance-Optimierung Z

### 🚧 Blocker
- Keine / Beschreibung

### 📊 Metriken
- Coverage: XX% (+X%)
- Bundle: XXXkb (-Xkb)
- TS Errors: XX (-X)
```

## 🎓 Lessons Learned

### Do's ✅
1. **Klein anfangen**: Quick Wins für Momentum
2. **Automatisieren**: Tools für repetitive Tasks
3. **Messen**: Vorher/Nachher Vergleiche
4. **Kommunizieren**: Tägliche Updates
5. **Feiern**: Erfolge anerkennen

### Don'ts ❌
1. **Überladen**: Realistische Ziele setzen
2. **Isoliert arbeiten**: Team-Kommunikation
3. **Breaking Changes**: Schrittweise Migration
4. **Blind refactoren**: Tests zuerst
5. **Scope Creep**: Bei Plan bleiben

## 🔮 Evolution des Playbooks

Dieses Playbook sollte nach jedem Sprint aktualisiert werden:

1. **Neue Tools**: Bewährte Tools hinzufügen
2. **Prozess-Updates**: Verbesserungen einarbeiten
3. **Lessons Learned**: Erfahrungen dokumentieren
4. **Metriken**: Ziele anpassen
5. **Templates**: Vorlagen verfeinern

---

**Version**: 1.0  
**Letzte Aktualisierung**: Mai 2025  
**Nächste Review**: Nach Q3 2025 Sprint  
**Owner**: Development Team