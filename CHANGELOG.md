# Changelog

Alle wichtigen Änderungen am nscale DMS Assistenten werden in dieser Datei dokumentiert.

Das Format basiert auf [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
und dieses Projekt folgt [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Hinzugefügt
- (15.05.2025) Optimiertes Diagnose- und Selbstheilungssystem:
  - UnifiedDiagnosticsService: Zentraler Service für alle Diagnose-Daten
  - Advanced404View: Erweiterte 404-Seite mit Selbstheilungs-Optionen
  - RouterHealthMonitor: Widget für kontinuierliche Router-Überwachung
  - Smart Recovery: Intelligente Fehlerbehebung basierend auf Diagnose
  - Session-Wiederherstellung für Chat-Routen
  - Export-Funktion für Support-Tickets
- (15.05.2025) DOM-Fehlererkennung temporär deaktiviert:
  - Aggressive Fehlererkennung verursachte falsche Positiv-Meldungen
  - Basic Route Fallback implementiert ohne DOM-Analyse
  - Temporäre Deaktivierung der Enhanced Route Features
  - Vereinfachte Navigation ohne automatische Fehlerkorrektur
- (15.05.2025) Behebung kritischer Navigationsprobleme nach Login:
  - Vereinfachung der Router-Guards zur Vermeidung von Endlosschleifen
  - Entfernung automatischer Weiterleitungen in Login-View
  - Korrektur der Navigation von nicht-existenter "Home" zu "Chat" Route
  - Implementierung robuster Fehlerbehandlung für Router-Navigationen
  - Optimierung der Auth-Status-Synchronisation
  - Debugging-Tools für Auth- und Router-Diagnose
  - Verbesserte Batch-Request-Verarbeitung für API-Calls
  - Session-Management-Fixes für konsistente Datenhaltung
- (14.05.2025) Vollständige Vue 3 Migration und Projektbereinigung:
  - Implementierung der Pure Vue Mode ohne Redux und Bridge-System
  - Neue GitHub Actions für CI/CD-Pipeline (Nightly-Tests und Test-Runner)
  - Erweiterte Test-Anleitungen und Regression-Testpläne
  - TypeScript-Verbesserungen für Stores und Auth-System
  - Optimierte Projektstruktur und Build-Konfiguration
  - Erweiterte Composables mit adaptern für improved type safety
  - Performance-Monitoring und Memory-Management-Tools
  - Neue Admin-Features mit Security Audit Integration
  - Vollständige Dokumentation der finalen Migration
- (08.05.2025) Implementierung der AdminPanel-Hauptkomponente in Vue 3 SFC:
  - Vollständige AdminPanel.vue Komponente mit Sidebar-Navigation
  - Modernes UI mit responsivem Design für alle Bildschirmgrößen
  - Integration mit Feature-Toggle-System für schrittweise Migration
  - Zugriffskontrollen und rollenbasierte Anzeige von Tabs
  - Lazy-Loading für Tab-Komponenten zur Performance-Optimierung
  - Implementierung des AdminDashboard.vue Tabs als Beispiel
  - Integration mit Stores für Benutzerverwaltung, System, Feedback und MOTD
  - Feature-Toggle-Verwaltung über AdminFeatureToggles.vue
- (08.05.2025) Design-Konzept für Admin-Komponenten in Vue 3 SFC:
  - Umfassende Analyse der bestehenden Admin-Funktionalitäten
  - Detaillierte Komponentenhierarchie und Datenflussdiagramme
  - Wireframes für alle Admin-Bereiche (Benutzer, System, Feedback, MOTD, Dokumentenkonverter)
  - TypeScript-Interfaces für Datenstrukturen
  - Beispiel-Implementation der AdminPanel.vue Hauptkomponente
  - Umfassende Dokumentation in `docs/ADMIN_COMPONENTS_DESIGN.md`
- (08.05.2025) Layout-Komponenten-System (Vue 3 SFC):
  - MainLayout: Flexibles Hauptlayout mit Header, Sidebar, Content und Footer
  - Header: Anpassbarer Header mit Logo, Titel und Aktionsbereichen
  - Sidebar: Zusammenklappbare Seitenleiste mit verschachtelten Menüs
  - TabPanel: Tab-System mit Drag & Drop, Keyboard-Navigation und dynamischer Tab-Verwaltung
  - SplitPane: Teilbarer Bereich mit anpassbarer Trennlinie
  - Umfassende Dokumentation in `docs/LAYOUT_COMPONENTS.md`

### Geändert
- (14.05.2025) Optimierung der Bridge-Module mit SelectiveChatBridge
- (14.05.2025) Vollständige Überarbeitung der Store-Architektur
- (14.05.2025) Verbesserung der TypeScript-Typisierung in allen Modulen
- (14.05.2025) Refactoring der API-Service-Layer für bessere Abstraktion
- (14.05.2025) Modernisierung der Vite-Konfiguration mit erweiterten Features
- (14.05.2025) Anpassung der App.vue für vereinfachte Architektur

### Behoben
- (14.05.2025) Memory-Leaks im Bridge-System durch verbesserte Event-Verwaltung
- (14.05.2025) TypeScript-Kompilierungsfehler in verschiedenen Komponenten
- (14.05.2025) Performance-Probleme in Chat-Komponenten
- (14.05.2025) Asset-Pfad-Probleme in der Build-Konfiguration

### Entfernt
- (14.05.2025) Legacy Migration Scripts und veraltete Build-Prozesse
- (14.05.2025) Redundante Dokumentationen und Archive
- (14.05.2025) Alte HTML-Launcher und Test-Dateien
- (14.05.2025) Duplikate Bridge-Implementierungen
- (14.05.2025) Überflüssige Frontend-Dateien in api/frontend/
- (14.05.2025) Veraltete Admin-, Chat-, Feedback- und Settings-JavaScript-Module

### Sicherheit
- (14.05.2025) Implementierung von Sicherheits-Audits in Build-Pipeline
- (14.05.2025) Aktualisierung aller Abhängigkeiten auf sichere Versionen
- (14.05.2025) Verbesserung der Auth-Token-Verwaltung
- (14.05.2025) Hinzufügung von Passwort-Hashing in User-Modellen