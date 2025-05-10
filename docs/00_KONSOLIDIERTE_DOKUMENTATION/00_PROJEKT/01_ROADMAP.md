---
title: "Roadmap nscale DMS Assistent"
version: "2.0.0"
date: "10.05.2025"
lastUpdate: "10.05.2025"
author: "Martin Heinrich"
status: "Aktiv"
priority: "Hoch"
category: "Projektmanagement"
tags: ["Roadmap", "Planung", "Timeline", "Vue3", "Migration", "Feature-Planung"]
---

# Roadmap nscale DMS Assistent

> **Letzte Aktualisierung:** 10.05.2025 | **Version:** 2.0.0 | **Status:** Aktiv

## Executive Summary

Diese Roadmap gibt einen umfassenden Überblick über den aktuellen Entwicklungsstand und die geplanten Features des nscale DMS Assistenten. Sie berücksichtigt die tatsächliche Verfügbarkeit von 15 Wochenstunden für die Entwicklung und legt einen realistischen Zeitplan für zukünftige Entwicklungen fest.

Das Projekt befindet sich aktuell in einer bedeutenden Übergangsphase mit der fortlaufenden Migration des Frontends zu Vue 3 Single File Components (SFCs). Diese Migration ist zu etwa 60-65% abgeschlossen und bildet einen zentralen Bestandteil der kurzfristigen Roadmap.

## Aktuelle Situation

### Frontend-Strategie Überblick

Die Anwendung hat eine strategische Neuausrichtung bei der UI-Entwicklung durchlaufen:

- [x] **Erste Vue.js-Migration gestartet und temporär aufgegeben**
  - [x] Feature-Toggle-Mechanismus implementiert
  - [x] Verschiedene Vue.js-Komponenten erstellt (inkl. Dokumentenkonverter)
  - [x] Robuste Fallback-Mechanismen implementiert
  - [x] Zahlreiche Probleme mit Ressourcenladung und DOM-Konflikten identifiziert

- [x] **Neuimplementierung mit Vanilla JavaScript** (ABGESCHLOSSEN)
  - [x] Zentrale JavaScript-Module mit ES6-Modul-System entwickelt
  - [x] Vollständige Entfernung der ersten Vue.js-Komponenten und -Abhängigkeiten
  - [x] Optimierte Dateistruktur mit zentralem `/shared/`-Verzeichnis
  - [x] Robuste Fehlerbehandlung und Fallback-Mechanismen implementiert

- [ ] **Vue 3 SFC-Migration** (AKTUELLER FOKUS, ~60-65% abgeschlossen)
  - [x] Vite als Build-Tool und Entwicklungsserver eingerichtet
  - [x] Feature-Toggle-System vollständig implementiert mit erweiterten Monitoring-Funktionen
  - [x] Admin-Komponenten weitgehend implementiert (75% abgeschlossen)
  - [x] Pinia Stores für zentrale Zustandsverwaltung (80% abgeschlossen)
  - [x] TypeScript-Integration für verbesserte Codequalität
  - [ ] Dokumentenkonverter-Komponenten (50% abgeschlossen)
  - [ ] Chat-Interface-Komponenten (30% abgeschlossen)

### Vue 3 SFC-Migration Fortschritt

Eine detaillierte Analyse des aktuellen Migrationsfortschritts nach Komponentengruppen:

| Bereich | Fertigstellungsgrad | Status | Priorität |
|---------|---------------------|--------|-----------|
| **Infrastruktur & Build-System** | ~95% | Nahezu abgeschlossen | Abgeschlossen |
| **Feature-Toggle-System** | ~100% | Abgeschlossen | Abgeschlossen |
| **Pinia Stores** | ~80% | In Bearbeitung | Hoch |
| **UI-Basiskomponenten** | ~60% | In Bearbeitung | Hoch |
| **Layout-Komponenten** | ~50% | In Bearbeitung | Mittel |
| **Feedback-Komponenten** | ~40% | In Bearbeitung | Mittel |
| **Dokumentenkonverter** | ~50% | In Bearbeitung | Mittel |
| **Chat-Interface** | ~30% | In Bearbeitung | Hoch |
| **Admin-Bereich** | ~75% | Aktiv in Bearbeitung | Mittel |
| **Bridge-Mechanismen** | ~85% | Größtenteils abgeschlossen | Mittel |
| **Tests** | ~30% | In früher Bearbeitung | Hoch |

### Lehren aus der Framework-Migration

Die folgenden wichtigen Erkenntnisse haben wir aus der Migration gewonnen:

1. **Simplizität und Robustheit** sind wichtiger als modernste Technologien
2. **Modularer Code mit klaren Schnittstellen** kann auch ohne Frameworks übersichtlich sein
3. **Technische Entscheidungen sollten frühzeitig getroffen werden**, bevor viel Code geschrieben wird
4. **Umfassende Tests** sind wichtig, insbesondere bei Projekten mit komplexer Frontend-Logik
5. **Direkter DOM-Zugriff** kann performanter und besser kontrollierbar sein als Framework-Abstraktionen
6. **Inkrementelle Migration mit Feature-Flags** ermöglicht sichere Umstellung ohne Produktionsrisiken
7. **Klare Trennung zwischen altem und neuem Code** durch Bridge-Mechanismen ist entscheidend

### Schlüsselkomponenten und deren Fortschritt

#### Dokumentenkonverter

- [x] **Robuste Basisimplementierung**: Der Dokumentenkonverter wurde als stabile Vanilla JS-Komponente implementiert (ABGESCHLOSSEN)
- [x] **Fallback-Mechanismen**: Mehrschichtige Fallback-Mechanismen für maximale Robustheit (ABGESCHLOSSEN)
- [ ] **Erweiterte Funktionen**: Bessere Fehlerbehandlung und Diagnose (AKTUELLER FOKUS)
- [ ] **Verbesserter PDF-Parser**: Bessere Erkennung von Tabellen und Strukturen in PDFs
- [ ] **Batch-Konvertierung**: Möglichkeit, mehrere Dokumente gleichzeitig zu konvertieren

#### Admin-Bereich

Ein besonderer Fortschritt wurde bei der Migration des Admin-Bereichs erzielt:

- [x] **AdminPanel**: Hauptkomponente mit Tab-Navigation und Lazy-Loading (95% abgeschlossen)
- [x] **AdminUsers**: Benutzerverwaltung mit CRUD-Operationen und Rollenkonzept (95% abgeschlossen)
- [x] **AdminSystem**: Systemüberwachung und -konfiguration (95% abgeschlossen)
- [x] **AdminFeatureToggles**: Verwaltung und Monitoring von Feature-Flags (90% abgeschlossen)
- [ ] **AdminFeedback**: Analyse von Benutzerfeedback (25% abgeschlossen)
- [ ] **AdminMotd**: Editor für Message of the Day (20% abgeschlossen)

Die Admin-Komponenten sind vollständig mit Pinia Stores integriert und bieten erweiterte Funktionen wie:
- Rollenbasierte Zugriffskontrollen
- Reaktive Datenanbindung
- Fortgeschrittene Validierungsmechanismen
- Responsive Benutzeroberfläche
- Fehlerbehandlung mit Fallback-Optionen

## Revidierter Zeitplan

Basierend auf der detaillierten Codeanalyse und dem tatsächlichen Fortschritt der Migration von etwa 60-65% (statt ursprünglich angenommenen 40%) wird die vollständige Migration in **6-8 Monaten** statt der ursprünglich veranschlagten 10 Monate abgeschlossen werden können.

### Kurzfristig: Juni - Juli 2025 (2 Monate)

- [ ] **Verbesserungen des Dokumentenkonverters**
  - [ ] Optimierte Fehlerbehandlung und bessere Benutzerfeedbacks
  - [ ] PDF-Erkennung von Tabellen und strukturierten Inhalten verbessern
  - [ ] Verbessertes Logging für Diagnose von Konvertierungsproblemen
  - *Aufwand: ~30 Stunden*

- [ ] **Verbesserte Benutzerfreundlichkeit**
  - [ ] Zugänglichkeitsverbesserungen (Tastaturnavigation, ARIA-Attribute)
  - [ ] Optimierte mobile Ansicht
  - [ ] Verbesserung der Ladezeiten durch optimierte Ressourcennutzung
  - *Aufwand: ~30 Stunden*

- [ ] **Rollenkonzept Phase 2**
  - [ ] Backend-Support für Feedback-Analyst und Content-Manager implementieren
  - [ ] Erweiterte Berechtigungsprüfung im Admin-Bereich
  - *Aufwand: ~20 Stunden*

- [ ] **Technische Schulden abbauen**
  - [ ] Vollständige Bereinigung verbleibender Framework-Referenzen
  - [ ] Code-Dokumentation für Vue 3 SFC-Komponenten vervollständigen
  - [ ] Einheitliche Fehlermeldungen und -behandlung
  - [ ] Vite-Konfiguration optimieren
  - *Aufwand: ~40 Stunden*

- [ ] **Abschluss der Admin-Komponenten**
  - [ ] Implementierung der Feedback-Analyse-Komponente
  - [ ] Implementierung des MOTD-Editors
  - [ ] Umfassende Tests für alle Admin-Komponenten
  - *Aufwand: ~40 Stunden*

### Mittelfristig: August - Oktober 2025 (3 Monate)

- [ ] **Erweiterte RAG-Engine-Funktionen**
  - [ ] Hybride Suche (Kombination aus Vektor- und Schlüsselwortsuche)
  - [ ] Optimierte Chunking-Strategie für Dokumente
  - [ ] Validierung von Antworten anhand von Quelltexten verbessern
  - *Aufwand: ~60 Stunden*

- [ ] **Chat-Interface Migration**
  - [ ] Vollständige Migration der Nachrichten-Liste zu Vue 3 SFC
  - [ ] Migration der Eingabekomponente
  - [ ] Integration mit Pinia Store für reaktives State Management
  - [ ] Optimierung der Streaming-Erfahrung
  - *Aufwand: ~60 Stunden*

- [ ] **Batch-Verarbeitung für Dokumente**
  - [ ] Gleichzeitige Konvertierung mehrerer Dokumente
  - [ ] Fortschrittsanzeige für lange Konvertierungsvorgänge
  - [ ] Priorisierung von Konvertierungsaufträgen
  - *Aufwand: ~35 Stunden*

- [ ] **Rollenkonzept Phase 3**
  - [ ] UI-Anpassungen für rollenspezifische Funktionen
  - [ ] Eingeschränkte Ansichten je nach Benutzerrolle
  - *Aufwand: ~40 Stunden*

### Langfristig: November 2025 - Februar 2026 (4 Monate)

- [ ] **Integration in nscale-Umgebung verbessern**
  - [ ] Kontextbezogene Hilfe basierend auf der aktuellen nscale-Ansicht
  - [ ] Direkte Aktionen in nscale aus dem Chat heraus ausführen
  - [ ] Single Sign-On mit nscale-Authentifizierung
  - *Aufwand: ~80 Stunden*

- [ ] **Erweiterte Wissensbasisfeatures**
  - [ ] Automatische Aktualisierung der Wissensbasis
  - [ ] Erkennung und Warnung vor veralteten Informationen
  - [ ] Einbindung von Community-Wissen
  - *Aufwand: ~60 Stunden*

- [ ] **Rollenkonzept Phase 4 und 5**
  - [ ] Implementation des Mehrrollen-Systems
  - [ ] Überarbeitung des Benutzermanagements für Administratoren
  - *Aufwand: ~50 Stunden*

- [ ] **UI-Optimierungen mit Vue 3 SFC**
  - [ ] Überarbeitetes Chat-Interface mit reaktiven Vue 3-Komponenten
  - [ ] Optimierte mobile Erfahrung mit responsiven Vue-Komponenten
  - [ ] Erweiterte Personalisierungsoptionen über Pinia-Store
  - [ ] Komponenten-Bibliothek für einheitliche UI-Elemente
  - *Aufwand: ~70 Stunden*

## Vue 3 SFC-Migration Timeline

| Phase | Meilenstein | Aktueller Status | Geplanter Abschluss |
|-------|-------------|------------------|---------------------|
| 1 | Infrastruktur & Feature-Toggle-System | 95% abgeschlossen | Mai 2025 |
| 2 | UI-Basiskomponenten | 60% abgeschlossen | Juni 2025 |
| 3a | Admin-Komponenten | 75% abgeschlossen | Juni 2025 |
| 3b | Dokumentenkonverter | 50% abgeschlossen | Juli 2025 |
| 4 | Chat-Interface | 30% abgeschlossen | August 2025 |
| 5 | Authentifizierung & Einstellungen | 10% begonnen | September 2025 |
| 6 | Legacy-Code-Entfernung | Geplant | Q4 2025 |

## Detaillierter Umsetzungsplan für die Migration

### Phase 1-2: Vorbereitung und Infrastruktur (Mai-Juni 2025)
- **CSS-Design-System standardisieren**
  - Variablen-Benennungskonventionen vereinheitlichen
  - Responsive Breakpoints standardisieren
  - Integration mit dem Theming-System verbessern

- **Test-Infrastruktur ausbauen**
  - Implementierung von Unit-Tests für Pinia-Stores
  - Erweiterung der Vue-Komponententests
  - Optimierung der End-to-End-Tests für kritische Benutzerflüsse

- **Chat-System optimieren**
  - Chat-Streaming-Komponenten optimieren
  - Performance-Optimierungen für die Virtualisierung
  - Integration mit Self-Healing-Mechanismen verbessern

### Phase 3-5: Vervollständigung der Hauptkomponenten (Juli-September 2025)
- **Chat-Interface vervollständigen**
  - Streaming-Funktionalität abschließen und optimieren
  - Mobile-Unterstützung verbessern
  - Offline-Fähigkeiten implementieren

- **Einstellungsbereich migrieren**
  - Vue 3 Einstellungs-Interface entwickeln
  - Themenwechsel-Funktionalität verbessern
  - Benutzereinstellungs-Synchronisation implementieren

- **Dokumentenkonverter finalisieren**
  - Batch-Operationen für mehrere Dokumente implementieren
  - Mobile-Optimierung abschließen
  - Erweiterte Filterfunktionen hinzufügen

- **A/B-Testing vorbereiten**
  - Erstellung detaillierter A/B-Test-Pläne für alle Komponenten
  - Metriken und Erfolgskriterien definieren
  - Monitoring-Infrastruktur vorbereiten

### Phase 6: Vollständige Umstellung und Legacy-Code-Entfernung (Oktober 2025 - Februar 2026)
- **Feature-Flags aktivieren und Legacy deaktivieren**
  - Schrittweise Aktivierung aller neuen Komponenten
  - Überwachung von Performance-Metriken und Fehlerraten
  - Schrittweise Deaktivierung des Legacy-Codes

- **Legacy-Code entfernen**
  - Vollständige Entfernung des Legacy-Codes
  - Bereinigung der Build-Konfigurationen
  - Optimierung der Bundle-Größe

- **Abschlussdokumentation**
  - Aktualisierung aller Dokumentation
  - Erstellen einer Komponenten-Bibliothek
  - Entwickleranleitung für die neue Architektur

- **Performance-Optimierung**
  - Optimierung aller kritischen Pfade
  - Implementierung von Code-Splitting
  - Lazy-Loading für nicht-kritische Komponenten

## Schlüsselprioritäten

Die folgenden Prioritäten leiten die Entwicklung des nscale DMS Assistenten:

1. **Stabilisierung der Vanilla-JS-Implementierung**: Dies bleibt die höchste Priorität, um eine stabile Grundlage zu gewährleisten
2. **Vue 3 SFC-Migration**: Fortsetzung der Migration mit Fokus auf Benutzererfahrung und Codequalität
3. **Test-Automatisierung**: Implementierung umfassender Tests für alle kritischen Komponenten
4. **Design-System-Standardisierung**: Vereinheitlichung des Styling und der Komponenten-Schnittstellen
5. **Benutzerfreundlichkeit**: Eine intuitive, einfach zu bedienende Oberfläche hat Priorität
6. **Performance**: Schnelle Ladezeiten und Antworten sind wichtiger als zusätzliche Features

## Migrationsstrategie

### Komponentengruppen-Priorisierung

| Komponentengruppe | Priorität | Komplexität | Fortschritt | Verantwortliche |
|-------------------|-----------|-------------|-------------|-----------------|
| UI-Basiskomponenten | Hoch | Niedrig | 60% | Frontend-Team |
| Layout-Komponenten | Mittel | Mittel | 50% | Frontend-Team |
| Admin-Bereich | Mittel | Hoch | 75% | Backend/Frontend-Team |
| Dokumentenkonverter | Mittel | Hoch | 50% | Frontend-Team |
| Chat-Interface | Hoch | Sehr Hoch | 30% | Frontend/LLM-Team |
| Dialog- und Feedback-System | Niedrig | Mittel | 40% | Frontend-Team |

### Technische Ansätze

Die Migration zu Vue 3 SFCs folgt diesen technischen Prinzipien:

1. **Feature-Flagging**: Jede neue Komponente wird hinter Feature-Flags implementiert
2. **Bridge-Pattern**: Bidirektionale State-Synchronisation zwischen altem und neuem Code
3. **Inkrementelle Einführung**: Komponenten werden einzeln migriert und getestet
4. **Pinia-First-Ansatz**: Gemeinsamer State in Pinia-Stores für nahtlose Integration
5. **Tests vor Migration**: Jede Komponente muss vor der Migration vollständig getestet sein
6. **A/B-Testing**: Neue Komponenten werden zunächst für eine Teilmenge der Benutzer aktiviert

## Kontinuierliche Verbesserungen

Die folgenden Bereiche werden kontinuierlich verbessert, parallel zu den oben genannten Projekten:

- **Bugfixes und Stabilitätsverbesserungen**: Laufende Behebung von Problemen
- **Dokumentation**: Kontinuierliche Aktualisierung der Dokumentation
- **Wartbarkeit**: Refactoring von problematischem Code
- **Kleinere UI-Verbesserungen**: Inkrementelle Verbesserungen der Benutzeroberfläche
- **Komponententests**: Erhöhung der Testabdeckung für sowohl Vanilla-JS als auch Vue 3 SFC

## Ressourcenzuweisung

Unter Berücksichtigung der Verfügbarkeit von 15 Wochenstunden ist die folgende Ressourcenzuweisung vorgesehen:

| Bereich | Stunden/Woche | Priorität | Zeitraum |
|---------|--------------|-----------|----------|
| Vue 3 SFC-Migration | 8 | Hoch | Durchgehend |
| Bugfixes & Stabilität | 3 | Hoch | Durchgehend |
| Neue Features | 2 | Mittel | Nach Bedarf |
| Dokumentation & Tests | 2 | Mittel | Durchgehend |

## Risiken und Mitigationsstrategien

| Risiko | Wahrscheinlichkeit | Auswirkung | Mitigationsstrategie |
|--------|-------------------|------------|---------------------|
| Verzögerungen bei der Chat-Migration | Mittel | Mittel | Phased Rollout, Fokus auf kritische Funktionen zuerst |
| Performance-Degradation nach Migration | Mittel | Hoch | Performance-Monitoring, frühes A/B-Testing |
| Bridge-Mechanismus-Fehler | Hoch | Hoch | Umfassende Tests, Fallback-Mechanismen |
| Ressourcen-Engpässe | Hoch | Mittel | Priorisierung kritischer Komponenten, Aufgabenplanung |
| Qualifikationslücken im Team | Mittel | Mittel | Schulungen, externe Expertise |
| Probleme mit der Offline-Funktionalität | Hoch | Mittel | Service-Worker-Strategien implementieren, ausführliches Testen |
| Unentdeckte Bugs durch mangelnde Testabdeckung | Hoch | Hoch | Testabdeckung erhöhen, explorative Tests durchführen |

## Voraussetzungen für den Erfolg

1. **Priorisierung der Migration**:
   - Fokus auf die Migration statt auf neue Features
   - Klare Kommunikation der Prioritäten im Team

2. **Ausreichende Ressourcen**:
   - Idealerweise 3-4 dedizierte Frontend-Entwickler
   - 1-2 QA-Spezialisten für Tests und Qualitätssicherung

3. **Robuste Test-Infrastruktur**:
   - Erweiterung der Testabdeckung vor der Migration
   - Automatisierte Tests für alle kritischen Komponenten

4. **Benutzer-Feedback-Loop**:
   - Frühzeitiges Feedback einholen
   - Schnelle Iteration basierend auf Benutzerfeedback

## Hinweise

- Die Roadmap basiert auf einer Verfügbarkeit von 15 Wochenstunden.
- Die Zeitplanung enthält bereits Puffer für unerwartete Probleme und Debugging.
- Bei Fehlern oder Problemen im Produktiveinsatz hat deren Behebung stets Vorrang vor der Entwicklung neuer Features.
- Feedback von Benutzern wird kontinuierlich eingeholt und in die Prioritäten einbezogen.
- Die Roadmap wird vierteljährlich überprüft und bei Bedarf angepasst.

## Verwendete Quelldokumente

Diese konsolidierte Roadmap basiert auf folgenden Quelldokumenten:

1. `/opt/nscale-assist/app/docs/00_ROADMAP.md` - Hauptquelle für aktuelle Roadmap und Zeitplanung
2. `/opt/nscale-assist/app/docs/01_MIGRATION/01_VUE3_MIGRATION_MASTERPLAN.md` - Detaillierte Informationen zur Vue 3 Migration
3. `/opt/nscale-assist/app/docs/00_KONSOLIDIERTE_DOKUMENTATION/01_MIGRATION/01_MIGRATIONSSTATUS_UND_PLANUNG.md` - Aktueller Migrationsstatus
4. `/opt/nscale-assist/app/docs/03_MIGRATION/VUE3_SFC_MIGRATION_DOKUMENTATION.md` - Technische Details zur SFC-Migration
5. `/opt/nscale-assist/app/docs/03_MIGRATION/MIGRATION_PLAN_KOMPLETT.md` - Vollständiger Migrationsplan
6. `/opt/nscale-assist/app/REVISED_MIGRATION_TIMELINE.md` - Revidierter Zeitplan für die Migration
7. `/opt/nscale-assist/app/CLAUDE.md` - Implementierungsdetails des Admin-Panels