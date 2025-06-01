# Dokumentationsübersicht: nScale DMS Assistent

> **Letzte Aktualisierung:** 11.05.2025

Diese Dokumentation bietet eine umfassende Übersicht über alle wesentlichen Dokumente des nScale DMS Assistenten. Sie ist nach Themenbereichen organisiert und enthält Hinweise zur Priorität und Aktualität der Dokumente.

## Inhaltsverzeichnis

1. [Einstieg für neue Entwickler](#einstieg-für-neue-entwickler)
2. [Projektgrundlagen & Architektur](#projektgrundlagen--architektur)
3. [Vue 3 SFC-Migration](#vue-3-sfc-migration)
4. [Komponenten & Systeme](#komponenten--systeme)
5. [Entwicklungsrichtlinien](#entwicklungsrichtlinien)
6. [Technische Referenzen](#technische-referenzen)
7. [Testing & Qualitätssicherung](#testing--qualitätssicherung)
8. [Dokumentationsverwaltung](#dokumentationsverwaltung)
9. [Änderungshistorie](#änderungshistorie)

## Einstieg für neue Entwickler

Neue Entwickler sollten die folgenden Dokumente in der angegebenen Reihenfolge lesen, um einen schnellen Einstieg in das Projekt zu erhalten:

1. **[00_PROJEKT_UEBERBLICK.md](./00_PROJEKT_UEBERBLICK.md)** - Übersicht über das Gesamtprojekt und seine Hauptkomponenten
2. **[01_ARCHITEKTUR/01_SYSTEM_ARCHITEKTUR.md](./01_ARCHITEKTUR/01_SYSTEM_ARCHITEKTUR.md)** - Grundlegende Systemarchitektur
3. **[02_ENTWICKLUNG/01_SETUP.md](./02_ENTWICKLUNG/01_SETUP.md)** - Einrichtung der Entwicklungsumgebung
4. **[03_MIGRATION/02_VUE_SFC_STATUS.md](./03_MIGRATION/02_VUE_SFC_STATUS.md)** - Aktueller Status der Vue 3 SFC-Migration
5. **[02_ENTWICKLUNG/04_ENTWICKLUNGSANLEITUNG.md](./02_ENTWICKLUNG/04_ENTWICKLUNGSANLEITUNG.md)** - Praktische Entwicklungsanleitung

## Projektgrundlagen & Architektur

### Hauptdokumente

- **[00_PROJEKT_UEBERBLICK.md](./00_PROJEKT_UEBERBLICK.md)** - Übersicht über das Gesamtprojekt und seine Hauptkomponenten 
- **[00_ROADMAP.md](./00_ROADMAP.md)** - Entwicklungs-Roadmap mit Meilensteinen
- **[01_ARCHITEKTUR/01_SYSTEM_ARCHITEKTUR.md](./01_ARCHITEKTUR/01_SYSTEM_ARCHITEKTUR.md)** - Detaillierte Systemarchitektur
- **[01_ARCHITEKTUR/02_FRONTEND_ARCHITEKTUR.md](./01_ARCHITEKTUR/02_FRONTEND_ARCHITEKTUR.md)** - Frontend-Architektur und -Komponenten
- **[01_ARCHITEKTUR/03_KOMPONENTEN_STRUKTUR.md](./01_ARCHITEKTUR/03_KOMPONENTEN_STRUKTUR.md)** - Hierarchie der Anwendungskomponenten

### Detaillierte Konzepte

- **[04_FEATURES/02_ROLLENKONZEPT.md](./04_FEATURES/02_ROLLENKONZEPT.md)** - Benutzerrollen und Berechtigungskonzept
- **[06_SYSTEME/03_FEATURE_TOGGLE_SYSTEM.md](./06_SYSTEME/03_FEATURE_TOGGLE_SYSTEM.md)** - Feature-Toggle-System für die Migration
- **[06_SYSTEME/05_STATE_FLOW_DIAGRAM.md](./06_SYSTEME/05_STATE_FLOW_DIAGRAM.md)** - Datenflussdiagramm der Anwendung

## Vue 3 SFC-Migration

### Strategie & Status

- **[03_MIGRATION/01_VUE_SFC_STRATEGIE.md](./03_MIGRATION/01_VUE_SFC_STRATEGIE.md)** - Grundlegende Migrationsstrategie
- **[03_MIGRATION/02_VUE_SFC_STATUS.md](./03_MIGRATION/02_VUE_SFC_STATUS.md)** - Aktueller Status der Migration (regelmäßig aktualisiert)
- **[03_MIGRATION/MIGRATION_PLAN_KOMPLETT.md](./03_MIGRATION/MIGRATION_PLAN_KOMPLETT.md)** - Vollständiger, detaillierter Migrationsplan

### Implementierungsdetails

- **[03_MIGRATION/04_MIGRATIONS_AKTIONSPLAN.md](./03_MIGRATION/04_MIGRATIONS_AKTIONSPLAN.md)** - Konkrete Schritte für die Migration
- **[03_MIGRATION/03_MIGRATIONS_ERKENNTNISSE.md](./03_MIGRATION/03_MIGRATIONS_ERKENNTNISSE.md)** - Lessons Learned aus der Migration
- **[03_MIGRATION/08_BRIDGE_IMPLEMENTIERUNG.md](./03_MIGRATION/08_BRIDGE_IMPLEMENTIERUNG.md)** - Bridge zwischen Legacy und Vue 3

### Bridge-System

- **[03_MIGRATION/09_OPTIMIZED_BRIDGE_DOKUMENTATION.md](./03_MIGRATION/09_OPTIMIZED_BRIDGE_DOKUMENTATION.md)** - Optimierte Bridge-Implementierung
- **[03_MIGRATION/10_BRIDGE_DOKUMENTATION_INDEX.md](./03_MIGRATION/10_BRIDGE_DOKUMENTATION_INDEX.md)** - Index aller Bridge-Dokumentation
- **[03_MIGRATION/bridge_uml_diagramme.md](./03_MIGRATION/bridge_uml_diagramme.md)** - UML-Diagramme der Bridge-Architektur

## Komponenten & Systeme

### Feature-Module

- **[04_FEATURES/01_DOKUMENTENKONVERTER.md](./04_FEATURES/01_DOKUMENTENKONVERTER.md)** - Dokumentenkonverter (konsolidierte Dokumentation)
- **[06_SYSTEME/13_CHAT_KOMPONENTEN.md](./06_SYSTEME/13_CHAT_KOMPONENTEN.md)** - Chat-Komponenten
- **[06_SYSTEME/14_SESSION_MANAGEMENT_KOMPONENTEN.md](./06_SYSTEME/14_SESSION_MANAGEMENT_KOMPONENTEN.md)** - Session-Management
- **[06_SYSTEME/15_CHAT_KOMPONENTEN_MIGRATION.md](./06_SYSTEME/15_CHAT_KOMPONENTEN_MIGRATION.md)** - Migration der Chat-Komponenten
- **[06_SYSTEME/16_CHAT_MIGRATION_ZUSAMMENFASSUNG.md](./06_SYSTEME/16_CHAT_MIGRATION_ZUSAMMENFASSUNG.md)** - Zusammenfassung der Chat-Migration

### UI-Komponenten

- **[06_SYSTEME/10_BASIS_UI_KOMPONENTEN.md](./06_SYSTEME/10_BASIS_UI_KOMPONENTEN.md)** - Basis-UI-Komponenten
- **[06_SYSTEME/01_DIALOG_SYSTEM.md](./06_SYSTEME/01_DIALOG_SYSTEM.md)** - Dialog-System
- **[06_SYSTEME/04_FILE_UPLOAD_COMPONENT.md](./06_SYSTEME/04_FILE_UPLOAD_COMPONENT.md)** - Dateiupload-Komponente
- **[06_SYSTEME/12_CSS_DESIGN_SYSTEM.md](./06_SYSTEME/12_CSS_DESIGN_SYSTEM.md)** - CSS-Design-System
- **[06_SYSTEME/19_MOBILE_OPTIMIERUNG.md](./06_SYSTEME/19_MOBILE_OPTIMIERUNG.md)** - Mobile Optimierung für SFC-Komponenten

### Zustandsverwaltung

- **[06_SYSTEME/02_DOCUMENT_CONVERTER_STORE.md](./06_SYSTEME/02_DOCUMENT_CONVERTER_STORE.md)** - Store für den Dokumentenkonverter
- **[06_SYSTEME/18_PINIA_STORE_ARCHITEKTUR.md](./06_SYSTEME/18_PINIA_STORE_ARCHITEKTUR.md)** - Pinia-Store-Architektur
- **[05_REFERENZEN/01_STATE_MANAGEMENT.md](./05_REFERENZEN/01_STATE_MANAGEMENT.md)** - Zustandsverwaltungsstrategie

### Admin-Komponenten

- **[ADMIN_COMPONENTS_DESIGN.md](./ADMIN_COMPONENTS_DESIGN.md)** - Design der Admin-Komponenten
- **[ADMIN_COMPONENTS_IMPLEMENTATION.md](./ADMIN_COMPONENTS_IMPLEMENTATION.md)** - Implementierung der Admin-Komponenten

## Entwicklungsrichtlinien

### Allgemeine Richtlinien

- **[02_ENTWICKLUNG/02_KOMPONENTEN_LEITFADEN.md](./02_ENTWICKLUNG/02_KOMPONENTEN_LEITFADEN.md)** - Leitfaden zur Komponentenentwicklung
- **[02_ENTWICKLUNG/03_API_INTEGRATION.md](./02_ENTWICKLUNG/03_API_INTEGRATION.md)** - API-Integrationsanleitung
- **[02_ENTWICKLUNG/04_ENTWICKLUNGSANLEITUNG.md](./02_ENTWICKLUNG/04_ENTWICKLUNGSANLEITUNG.md)** - Allgemeine Entwicklungsanleitung
- **[COMPONENT_GUIDE.md](./COMPONENT_GUIDE.md)** - Komponentenentwicklung

### Spezifische Anleitungen

- **[02_ENTWICKLUNG/06_VITE_FEHLERBEHANDLUNG.md](./02_ENTWICKLUNG/06_VITE_FEHLERBEHANDLUNG.md)** - Vite-spezifische Fehlerbehandlung
- **[VITE_EISDIR_FIX.md](./VITE_EISDIR_FIX.md)** - Lösung für EISDIR-Fehler in Vite
- **[06_SYSTEME/11_FRONTEND_STRUKTUR_BEREINIGUNG.md](./06_SYSTEME/11_FRONTEND_STRUKTUR_BEREINIGUNG.md)** - Frontend-Struktur-Bereinigung

## Technische Referenzen

### APIs und Daten

- **[05_REFERENZEN/02_TYPESCRIPT_TYPEN.md](./05_REFERENZEN/02_TYPESCRIPT_TYPEN.md)** - TypeScript-Typen und -Interfaces
- **[05_REFERENZEN/04_API_CLIENT.md](./05_REFERENZEN/04_API_CLIENT.md)** - API-Client-Dokumentation
- **[05_REFERENZEN/05_DATENPERSISTENZ.md](./05_REFERENZEN/05_DATENPERSISTENZ.md)** - Datenpersistenz-Strategien

### Fehlerbehandlung

- **[05_REFERENZEN/03_FEHLERBEHANDLUNG.md](./05_REFERENZEN/03_FEHLERBEHANDLUNG.md)** - Allgemeine Fehlerbehandlung
- **[05_REFERENZEN/06_FEHLERANALYSE.md](./05_REFERENZEN/06_FEHLERANALYSE.md)** - Analyse von Fehlern
- **[05_REFERENZEN/07_FRONTEND_LADEPROBLEME.md](./05_REFERENZEN/07_FRONTEND_LADEPROBLEME.md)** - Frontend-Ladeprobleme
- **[05_REFERENZEN/08_FEHLERBEHANDLUNG_FALLBACK.md](./05_REFERENZEN/08_FEHLERBEHANDLUNG_FALLBACK.md)** - Fallback-Mechanismen
- **[ERROR_HANDLING_FALLBACK.md](./ERROR_HANDLING_FALLBACK.md)** - Fallback-Strategien
- **[FRONTEND_FIXES.md](./FRONTEND_FIXES.md)** - Häufige Frontend-Probleme

## Testing & Qualitätssicherung

### Teststrategie

- **[02_ENTWICKLUNG/05_TESTEN.md](./02_ENTWICKLUNG/05_TESTEN.md)** - Allgemeine Teststrategie
- **[02_ENTWICKLUNG/07_TEST_STRATEGIE.md](./02_ENTWICKLUNG/07_TEST_STRATEGIE.md)** - Detaillierte Teststrategie
- **[02_ENTWICKLUNG/07_TEST_STRATEGIE_AKTUALISIERT.md](./02_ENTWICKLUNG/07_TEST_STRATEGIE_AKTUALISIERT.md)** - Aktualisierte Teststrategie
- **[02_ENTWICKLUNG/E2E_TESTSTRATEGIE.md](./02_ENTWICKLUNG/E2E_TESTSTRATEGIE.md)** - End-to-End-Teststrategie

### Testimplementierungen

- **[02_ENTWICKLUNG/E2E_TEST_ANALYSE.md](./02_ENTWICKLUNG/E2E_TEST_ANALYSE.md)** - Analyse der E2E-Tests
- **[02_ENTWICKLUNG/E2E_TEST_ANLEITUNG.md](./02_ENTWICKLUNG/E2E_TEST_ANLEITUNG.md)** - Anleitung für E2E-Tests
- **[03_MIGRATION/05_VANILLA_JS_TEST_COVERAGE.md](./03_MIGRATION/05_VANILLA_JS_TEST_COVERAGE.md)** - Testabdeckung für Vanilla-JS
- **[02_ENTWICKLUNG/08_PINIA_STORE_TESTING.md](./02_ENTWICKLUNG/08_PINIA_STORE_TESTING.md)** - Testen von Pinia-Stores
- **[06_SYSTEME/19_PINIA_STORE_TESTING.md](./06_SYSTEME/19_PINIA_STORE_TESTING.md)** - Detailliertes Testing von Pinia-Stores

## Dokumentationsverwaltung

- **[99_VERWALTUNG/01_KONSOLIDIERUNG_LOG.md](./99_VERWALTUNG/01_KONSOLIDIERUNG_LOG.md)** - Log der Dokumentationskonsolidierung

## Änderungshistorie

### Dokumentationsänderungen

| Datum | Dokument | Änderung |
|-------|----------|----------|
| 11.05.2025 | 00_DOKUMENTATION_UEBERSICHT.md | Umfassende Überarbeitung und Konsolidierung der Dokumentationsübersicht |
| 11.05.2025 | 03_MIGRATION/02_VUE_SFC_STATUS.md | Aktualisierung des Migrationsstatus |
| 11.05.2025 | 03_MIGRATION/MIGRATION_PLAN_KOMPLETT.md | Neues Dokument: Vollständiger Migrationsplan |
| 11.05.2025 | 06_SYSTEME/19_MOBILE_OPTIMIERUNG.md | Neues Dokument: Mobile Optimierungsstrategie |
| 11.05.2025 | 06_SYSTEME/12_CSS_DESIGN_SYSTEM.md | Aktualisierung mit Mobile-First-Ansatz |
| 10.05.2025 | 02_ENTWICKLUNG/E2E_TESTSTRATEGIE.md | Neues Dokument: End-to-End-Teststrategie |
| 10.05.2025 | 03_MIGRATION/04_MIGRATIONS_AKTIONSPLAN.md | Aktualisierung der Phasen und Timeline |
| 10.05.2025 | 03_MIGRATION/02_VUE_SFC_STATUS.md | Aktualisierung des Implementierungsstatus |
| 08.05.2025 | 00_DOKUMENTATION_UEBERSICHT.md | Erste Version der Dokumentationsübersicht |

### Veraltete/Entfernte Dokumente

Die folgenden Dokumente wurden konsolidiert oder entfernt, da ihre Inhalte in anderen Dokumenten zusammengeführt wurden:

| Original-Dokument | Ersetzt durch |
|-------------------|---------------|
| 06_DOKUMENTENKONVERTER.md | 04_FEATURES/01_DOKUMENTENKONVERTER.md |
| DOKUMENTENKONVERTER_LOESUNG.md | 04_FEATURES/01_DOKUMENTENKONVERTER.md |
| 06_SYSTEME/06_VUE3_SFC_DOKUMENTENKONVERTER.md + 06_SYSTEME/06_VUE3_SFC_DOKUMENTENKONVERTER_UPDATE.md | 06_SYSTEME/16_DOKUMENTENKONVERTER_FINAL.md |
| Mehrere CSS/Layout-Dokumente | 06_SYSTEME/12_CSS_DESIGN_SYSTEM.md |

## Prioritätsklassifikation

Die Dokumente sind nach folgenden Prioritäten klassifiziert:

### Höchste Priorität (für neue Entwickler und aktuelle Migration)
- 00_PROJEKT_UEBERBLICK.md
- 03_MIGRATION/02_VUE_SFC_STATUS.md
- 03_MIGRATION/MIGRATION_PLAN_KOMPLETT.md
- 02_ENTWICKLUNG/04_ENTWICKLUNGSANLEITUNG.md
- 02_ENTWICKLUNG/E2E_TESTSTRATEGIE.md
- 06_SYSTEME/12_CSS_DESIGN_SYSTEM.md
- 06_SYSTEME/19_MOBILE_OPTIMIERUNG.md

### Hohe Priorität (für aktive Entwicklung)
- 03_MIGRATION/04_MIGRATIONS_AKTIONSPLAN.md
- 03_MIGRATION/08_BRIDGE_IMPLEMENTIERUNG.md
- 02_ENTWICKLUNG/02_KOMPONENTEN_LEITFADEN.md
- 04_FEATURES/01_DOKUMENTENKONVERTER.md
- 06_SYSTEME/10_BASIS_UI_KOMPONENTEN.md
- 05_REFERENZEN/03_FEHLERBEHANDLUNG.md
- 02_ENTWICKLUNG/05_TESTEN.md

### Mittlere Priorität (für fortgeschrittene Entwickler)
- 01_ARCHITEKTUR/02_FRONTEND_ARCHITEKTUR.md
- 01_ARCHITEKTUR/03_KOMPONENTEN_STRUKTUR.md
- 03_MIGRATION/03_MIGRATIONS_ERKENNTNISSE.md
- 05_REFERENZEN/02_TYPESCRIPT_TYPEN.md
- 06_SYSTEME/18_PINIA_STORE_ARCHITEKTUR.md

### Niedrige Priorität (unterstützende Dokumentation)
- Historische Dokumente
- Detaillierte technische Spezifikationen für Spezialfälle
- Dokumentationen von Teilkomponenten

---

**Hinweis:** Diese Dokumentationsübersicht wird regelmäßig aktualisiert. Bei Fragen oder Unklarheiten wenden Sie sich an das Entwicklungsteam.