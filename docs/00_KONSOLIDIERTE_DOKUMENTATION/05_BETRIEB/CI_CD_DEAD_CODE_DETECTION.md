# CI/CD Pipeline für Dead-Code-Erkennung

## Übersicht

Diese Dokumentation beschreibt die implementierte CI/CD-Pipeline zur automatischen Erkennung von totem Code in der nscale-assist Codebase.

## Komponenten

### 1. GitHub Actions Workflow
**Datei**: `.github/workflows/dead-code-detection.yml`

**Trigger**:
- Push auf `main` oder `develop`
- Pull Requests
- Wöchentlich montags um 2 Uhr UTC
- Manuell über GitHub UI

**Funktionen**:
- TypeScript unused exports detection
- Ungenutzte Dependencies
- Code-Duplikate
- Test-Coverage-Analyse
- Bundle-Size-Analyse

### 2. Lokales Script
**Datei**: `scripts/detect-dead-code.js`

**Verwendung**:
```bash
npm run detect:dead-code
# oder direkt
node scripts/detect-dead-code.js
```

**Features**:
- Gleiche Checks wie CI/CD lokal ausführbar
- Farbige Konsolen-Ausgabe
- Generiert Markdown-Report
- Findet potentiell ungenutzte Dateien

### 3. Pre-Push Hook
**Datei**: `.husky/pre-push`

**Schnell-Checks vor Push**:
- Console.log Statements
- TODO/FIXME Kommentare
- Auskommentierter Code
- TypeScript Compiler Check

## Metriken und Schwellwerte

### CI/CD Schwellwerte (Workflow failed wenn überschritten)
- **Unused Exports**: Max. 50
- **Unused Dependencies**: Max. 10
- **Code Duplication**: Max. 20 Blöcke

### Warnschwellen (Lokales Script)
- **Unused Exports**: > 50
- **Unused Dependencies**: > 10
- **Code Duplication**: > 5%
- **Unused Files**: > 20

## Reports

### Automatisch generierte Reports
1. **dead-code-report.md** - Zusammenfassung
2. **unused-exports.log** - Detaillierte Liste
3. **depcheck-results.json** - Dependency-Analyse
4. **jscpd-report.json** - Code-Duplikate
5. **bundle-report.json** - Bundle-Analyse

### GitHub PR Kommentare
Bei Pull Requests wird automatisch ein Kommentar mit dem Report erstellt/aktualisiert.

## Verwendung

### Entwickler-Workflow

1. **Vor Commit**: Lokales Script ausführen
   ```bash
   npm run detect:dead-code
   ```

2. **Vor Push**: Pre-Push Hook läuft automatisch

3. **Pull Request**: CI/CD analysiert und kommentiert

4. **Wöchentlich**: Automatischer Report für Maintenance

### NPM Scripts

Füge zu package.json hinzu:
```json
{
  "scripts": {
    "detect:dead-code": "node scripts/detect-dead-code.js",
    "fix:unused-deps": "npm prune && depcheck --skip-missing",
    "analyze:bundle": "npm run build && webpack-bundle-analyzer dist/stats.json"
  }
}
```

## Tools und Dependencies

### Benötigte Dev-Dependencies
```bash
npm install --save-dev \
  ts-prune \
  depcheck \
  jscpd \
  webpack-bundle-analyzer
```

### Verwendete Tools
- **ts-prune**: TypeScript unused exports
- **depcheck**: Unused npm dependencies
- **jscpd**: Duplicate code detection
- **webpack-bundle-analyzer**: Bundle size analysis

## Best Practices

### Regelmäßige Bereinigung
1. Wöchentlichen Report reviewen
2. Monatlicher Cleanup-Sprint
3. Bei Major-Features Dead-Code-Check

### Ausnahmen definieren
```javascript
// Für bewusst ungenutzten Export
// @ts-prune-ignore-next
export const intentionallyUnused = {};

// Für Test-Utilities
/* istanbul ignore next */
export function testHelper() {}
```

### False Positives vermeiden
1. Dynamic imports berücksichtigen
2. Reflection-basierte Verwendung dokumentieren
3. Build-time Constants beachten

## Troubleshooting

### Problem: Zu viele False Positives
**Lösung**: 
- `.ts-prunerc` Konfiguration anpassen
- Ignore-Patterns in depcheck erweitern

### Problem: CI/CD zu langsam
**Lösung**:
- Cache npm dependencies
- Parallelisierung der Checks
- Nur auf relevante Dateien prüfen

### Problem: Pre-Push Hook blockiert
**Lösung**:
```bash
# Einmalig überspringen
git push --no-verify

# Hook temporär deaktivieren
mv .husky/pre-push .husky/pre-push.bak
```

## Wartung

### Monatliche Aufgaben
1. Schwellwerte überprüfen und anpassen
2. Tool-Versionen aktualisieren
3. False Positive Patterns verfeinern

### Quarterly Review
1. ROI der Pipeline bewerten
2. Neue Tools evaluieren
3. Team-Feedback einholen

## Metriken-Tracking

### KPIs
- Anzahl toter Code-Zeilen pro Sprint
- Zeit für Cleanup-Aktivitäten
- Bundle-Size-Entwicklung
- Build-Zeit-Entwicklung

### Reporting
- Monatlicher Dead-Code-Trend
- Cleanup-Velocity
- Technical Debt Score

## Nächste Schritte

1. **Integration mit SonarQube** für umfassendere Analyse
2. **Automatisches Cleanup** für einfache Fälle
3. **Visualisierung** der Dead-Code-Trends
4. **Gamification** für Team-Motivation

---

**Implementiert**: Mai 2025
**Verantwortlich**: DevOps Team
**Review-Zyklus**: Quarterly