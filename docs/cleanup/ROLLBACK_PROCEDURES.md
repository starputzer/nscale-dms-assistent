# Rollback-Prozeduren für Codebase Cleanup

## Übersicht

Dieses Dokument definiert die Rollback-Prozeduren für alle Cleanup-Aktivitäten. Jeder Schritt muss reversibel sein, um die System-Integrität zu gewährleisten.

## Allgemeine Rollback-Strategie

### Vor jedem Cleanup:
1. **Vollständiges Backup erstellen**
   ```bash
   git add -A
   git commit -m "backup: before cleanup issue #X - $(date +%Y%m%d_%H%M%S)"
   git tag backup-issue-X-$(date +%Y%m%d_%H%M%S)
   ```

2. **Test Suite ausführen und Baseline erstellen**
   ```bash
   npm run test test/system-integrity/ -- --reporter=json > test-baseline.json
   npm run build
   cp -r dist dist-backup-$(date +%Y%m%d_%H%M%S)
   ```

3. **System-Status dokumentieren**
   ```bash
   # Bundle-Größe speichern
   du -sh dist > bundle-size-before.txt
   
   # Performance-Metriken speichern
   npm run lighthouse -- --output=json > lighthouse-before.json
   ```

## Spezifische Rollback-Prozeduren

### Issue #3: Fix-Dateien Konsolidierung (HÖCHSTES RISIKO)

#### Rollback-Trigger:
- Authentication-Tests schlagen fehl
- Batch-API funktioniert nicht mehr
- Build-Fehler nach Konsolidierung

#### Rollback-Schritte:
```bash
# 1. Zum Backup-Tag zurückkehren
git reset --hard backup-issue-3-[timestamp]

# 2. Fix-Dateien wiederherstellen
git checkout HEAD -- "src/**/*Fix.ts"
git checkout HEAD -- "src/**/*fix.ts"

# 3. Dependencies prüfen
npm install
npm run typecheck

# 4. Tests verifizieren
npm run test test/system-integrity/authentication-flows.spec.ts
npm run test test/system-integrity/api-batch-operations.spec.ts

# 5. Lokalen Dev-Server testen
npm run dev
```

### Issue #1: Mock-Dateien Entfernung (NIEDRIGSTES RISIKO)

#### Rollback-Trigger:
- Test-Suite benötigt Mock-Dateien
- Development-Modus funktioniert nicht

#### Rollback-Schritte:
```bash
# 1. Mock-Dateien wiederherstellen
git checkout HEAD -- "src/stores/**/*.mock.ts"

# 2. Test-Umgebung verifizieren
npm run test:unit

# 3. Development-Server prüfen
npm run dev
```

### Issue #2: Experimentelle Implementierungen

#### Rollback-Trigger:
- Feature-Toggles greifen auf experimentelle Versionen zu
- Dynamic Imports schlagen fehl

#### Rollback-Schritte:
```bash
# 1. Experimentelle Dateien wiederherstellen
git checkout HEAD -- src/main.simple.ts
git checkout HEAD -- src/stores/uiSimple.ts

# 2. Import-Pfade prüfen
npm run typecheck

# 3. Feature-Toggle-Tests
npm run test test/system-integrity/feature-toggle-system.spec.ts
```

## Notfall-Rollback

Bei kritischen Fehlern, die das gesamte System betreffen:

### 1. Sofort-Rollback
```bash
# Zum letzten bekannten guten Zustand
git log --oneline -10  # Letzten guten Commit finden
git reset --hard [good-commit-hash]

# Dependencies neu installieren
rm -rf node_modules package-lock.json
npm install

# Vollständige Test-Suite
npm run test
npm run build
```

### 2. Produktions-Hotfix
```bash
# Produktions-Build aus Backup
cp -r dist-backup-[timestamp]/* dist/

# Deployment
npm run deploy:emergency
```

### 3. Incident-Dokumentation
- Zeitstempel des Fehlers
- Betroffene Komponenten
- Fehlgeschlagene Tests
- Durchgeführte Rollback-Schritte
- Root-Cause-Analyse

## Automatisierte Rollback-Checks

### CI-Pipeline-Integration
```yaml
# .github/workflows/cleanup-safety.yml
name: Cleanup Safety Checks

on:
  push:
    branches: [cleanup/*]

jobs:
  safety-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Run System Integrity Tests
        run: |
          npm ci
          npm run test test/system-integrity/
          
      - name: Build Verification
        run: |
          npm run build
          npm run preview &
          sleep 5
          curl -f http://localhost:4173 || exit 1
          
      - name: Bundle Size Check
        run: |
          BEFORE=$(cat bundle-size-before.txt | awk '{print $1}')
          AFTER=$(du -sh dist | awk '{print $1}')
          # Fail if bundle size increased by more than 10%
          
      - name: Auto-Rollback on Failure
        if: failure()
        run: |
          git reset --hard HEAD~1
          echo "::error::Cleanup failed safety checks - automatic rollback initiated"
```

## Rollback-Verifizierung

Nach jedem Rollback:

### 1. System-Health-Check
```bash
# Alle kritischen Tests
npm run test test/system-integrity/

# E2E-Tests für User-Journeys
npm run test:e2e

# Build-Verifizierung
npm run build
npm run preview
```

### 2. Performance-Vergleich
```bash
# Bundle-Größe vergleichen
du -sh dist
cat bundle-size-before.txt

# Lighthouse-Scores vergleichen
npm run lighthouse
```

### 3. Manuelle Verifizierung
- [ ] Login funktioniert
- [ ] Chat-Streaming aktiv
- [ ] Admin-Panel zugänglich
- [ ] Document Converter läuft
- [ ] Feature-Toggles funktionieren

## Rollback-Kommunikation

### Team-Benachrichtigung:
```
Subject: [ROLLBACK] Cleanup Issue #X

Rollback durchgeführt für: [Issue-Beschreibung]
Grund: [Fehler-Beschreibung]
Status: [Abgeschlossen/In Arbeit]
Nächste Schritte: [Aktionsplan]

Betroffene Komponenten:
- [Komponente 1]
- [Komponente 2]

Test-Status:
- System Integrity: [PASS/FAIL]
- E2E Tests: [PASS/FAIL]
- Build: [SUCCESS/FAILURE]
```

## Präventive Maßnahmen

1. **Kleinere Änderungen**: Große Cleanups in kleine, testbare Schritte aufteilen
2. **Feature-Flags**: Kritische Änderungen hinter Feature-Flags
3. **Staging-Tests**: Alle Änderungen erst in Staging-Umgebung
4. **Peer-Review**: Mindestens 2 Reviews für Cleanup-PRs
5. **Automatisierung**: Rollback-Prozesse soweit möglich automatisieren

---

**Wichtig**: Dieses Dokument muss bei jeder Änderung der Rollback-Prozeduren aktualisiert werden.