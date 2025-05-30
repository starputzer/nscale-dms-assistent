# Codebase Cleanup Checklist Template

## Pre-Cleanup Phase

### 1. Analyse und Planung
- [ ] Identifiziere technische Schulden
  - [ ] Ungenutzte Dateien (Glob/Grep-Suche)
  - [ ] Duplizierter Code
  - [ ] Veraltete Dependencies
  - [ ] Fix/Temp/Experimental Dateien
- [ ] Priorisiere nach Risiko und Impact
- [ ] Erstelle Cleanup-Plan mit Issues
- [ ] Definiere Erfolgsmetriken

### 2. Sicherheitsmaßnahmen
- [ ] Erstelle Git-Branch pro Cleanup-Bereich
- [ ] Dokumentiere aktuellen Stand
- [ ] Backup kritischer Bereiche
- [ ] Informiere Team über geplante Änderungen

### 3. Test-Vorbereitung
- [ ] Schreibe Tests für betroffene Bereiche
- [ ] Führe Baseline-Performance-Tests durch
- [ ] Dokumentiere aktuelle Funktionalität
- [ ] Stelle CI/CD-Pipeline sicher

## Cleanup Phase

### 4. Systematische Bereinigung

#### Mock-Dateien
- [ ] Identifiziere alle *.mock.* Dateien
- [ ] Prüfe Verwendung in Tests
- [ ] Prüfe Verwendung in Entwicklung
- [ ] Entscheide: Behalten/Entfernen/Verschieben

#### Fix-Dateien
- [ ] Suche nach *fix*, *Fix*, *temp*, *tmp*
- [ ] Analysiere Implementierung
- [ ] Prüfe ob Fixes integriert wurden
- [ ] Migriere wertvolle Fixes
- [ ] Dokumentiere Entscheidungen

#### Experimentelle Versionen
- [ ] Suche nach *experimental*, *test*, *simple*
- [ ] Vergleiche mit Hauptimplementierung
- [ ] Extrahiere wertvolle Konzepte
- [ ] Entferne ungenutzte Experimente

#### Legacy Code
- [ ] Identifiziere veraltete Frameworks/Versionen
- [ ] Prüfe Migration-Status
- [ ] Entferne vollständig migrierte Teile
- [ ] Dokumentiere verbleibende Legacy-Abhängigkeiten

#### Optimierte Versionen
- [ ] Suche nach *optimized*, *enhanced*, *improved*
- [ ] Messe Performance-Unterschiede
- [ ] Entscheide: Integrieren/Entfernen
- [ ] Dokumentiere Optimierungskonzepte

### 5. Durchführung
- [ ] Committe jede Änderung separat
- [ ] Schreibe aussagekräftige Commit-Messages
- [ ] Führe Tests nach jeder Änderung durch
- [ ] Dokumentiere Breaking Changes

## Post-Cleanup Phase

### 6. Validierung
- [ ] Alle Tests grün?
- [ ] Build erfolgreich?
- [ ] Performance-Regression?
- [ ] Funktionalität erhalten?

### 7. Dokumentation
- [ ] Erstelle Cleanup-Zusammenfassung
- [ ] Dokumentiere entfernte Dateien
- [ ] Dokumentiere migrierte Features
- [ ] Aktualisiere Architektur-Docs

### 8. Kommunikation
- [ ] Informiere Team über Änderungen
- [ ] Erstelle Migration-Guide falls nötig
- [ ] Dokumentiere Rollback-Prozedur
- [ ] Plane Follow-up für offene Punkte

## Metriken

### Zu erfassen
- [ ] Anzahl entfernter Dateien
- [ ] Reduzierte Code-Zeilen
- [ ] Bundle-Size vorher/nachher
- [ ] Build-Zeit vorher/nachher
- [ ] Test-Laufzeit vorher/nachher
- [ ] Neue Test-Abdeckung

### Erfolgs-Kriterien
- [ ] Keine Regressions-Bugs
- [ ] Verbesserte oder gleiche Performance
- [ ] Alle Tests bestehen
- [ ] Positive Team-Rückmeldung

## Werkzeuge

### Analyse
```bash
# Ungenutzte Dateien finden
grep -r "import.*from.*filename" --include="*.ts" --include="*.js" .

# Fix-Dateien finden
find . -type f \( -name "*fix*" -o -name "*Fix*" -o -name "*temp*" \)

# Mock-Dateien finden
find . -type f -name "*.mock.*"

# Bundle-Analyse
npm run build:analyze
```

### Cleanup
```bash
# Git-Branch erstellen
git checkout -b cleanup/issue-description

# Sichere Datei-Entfernung
git rm path/to/file
git commit -m "Remove unused file: explanation"

# Bulk-Rename
for file in *.old; do mv "$file" "${file%.old}.archived"; done
```

### Validierung
```bash
# Tests ausführen
npm test
npm run test:e2e

# Type-Check
npm run typecheck

# Lint
npm run lint

# Build
npm run build
```

## Best Practices

1. **Immer Tests zuerst** - Sichert Funktionalität
2. **Kleine Commits** - Erleichtert Rollback
3. **Dokumentiere alles** - Hilft bei späteren Fragen
4. **Team einbeziehen** - Verhindert Überraschungen
5. **Schrittweise vorgehen** - Reduziert Risiko

## Red Flags - Wann NICHT löschen

- [ ] Datei wird dynamisch importiert
- [ ] Datei ist in .gitignore aber trotzdem wichtig
- [ ] Datei hat kürzliche Commits
- [ ] Datei wird in Dokumentation referenziert
- [ ] Unsicherheit über Verwendungszweck

## Rollback-Plan

1. Git-History nutzen: `git revert <commit>`
2. Backup-Verzeichnis prüfen
3. Team-Mitglieder fragen
4. Aus vorherigem Branch cherry-picken

---

**Template Version**: 1.0
**Erstellt**: Mai 2025
**Basierend auf**: nscale-assist Cleanup-Projekt