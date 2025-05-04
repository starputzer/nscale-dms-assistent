# Claude Memory für nscale-assist-app

## Allgemeine Anweisungen

1. **Sprache**: Immer auf Deutsch antworten
2. **Commits**: Commits immer ohne die Claude-Infos erstellen (kein "Generated with Claude Code" usw.)
3. **Dokumentation**: Die .md-Dateien auf vorhandenes Wissen/Ergänzungen prüfen
4. **Build-Prozess**: Bei Bedarf immer ein "npm run build" ausführen

## Projekt-Kontext

- Das Projekt verwendet Vue.js für die Frontend-Komponenten
- Es gibt ein Feature-Toggle-System für die Umschaltung zwischen klassischem UI und Vue.js-Implementierung
- Der Dokumentenkonverter ist die einzige Komponente, die vollständig in Vue.js implementiert ist
- Die Dokumentation ist nach Priorität in nummerierten MD-Dateien organisiert (01_*.md, 02_*.md, etc.)

## Bekannte Probleme und Lösungsstrategien

- **CSS-Pfade**: Bei 404-Fehlern für CSS-Dateien sollten mehrere Pfade probiert werden (/frontend/css, /api/static/css, /css)
- **DOM-Verfügbarkeit**: Immer prüfen, ob DOM-Elemente existieren, bevor sie verwendet werden (document.body, etc.)
- **Vue.js-Integration**: Vorsicht bei der Integration von Vue.js-Komponenten, immer Fallbacks bereitstellen
- **ES6-Module**: Module-Import-Fehler werden durch den Modul-Redirector und NoModule-Versionen gelöst

## Gemachte Verbesserungen

1. **Dokumentenkonverter**: Vollständig robuste Implementierung mit mehrschichtigen Fallbacks
   - Path-Tester und Path-Logger für diagnostische Zwecke
   - ES6-Modul-Redirector für Kompatibilität
   - NoModule-Versionen für maximale Kompatibilität
   - Direkte Fallback-UI ohne Framework-Abhängigkeiten

2. **Dokumentation**: Vollständige Reorganisation und Aktualisierung
   - 01_PROJEKT_OVERVIEW.md: Allgemeine Architektur
   - 02_DOKUMENTENKONVERTER.md: Details zum Dokumentenkonverter
   - 03_VUE_MIGRATION.md: Migration zu Vue.js
   - 04_FEHLERBEHEBUNG.md: Troubleshooting-Guide
   - 05_ENTWICKLUNGSANLEITUNG.md: Anleitung für Entwickler

3. **CSS-Verbesserungen**:
   - Fallback-Inline-CSS für kritische Komponenten
   - Mehrfache Pfade für alle Ressourcen
   - Forcierte Anzeige mit !important-Regeln

4. **Robustheit**:
   - DOM-Überwachung und automatische Korrektur
   - Fehler-Logging und Diagnose
   - Mehrschichtige Fallbacks für alle kritischen Komponenten