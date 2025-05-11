# Changelog

Alle wichtigen Änderungen am nscale DMS Assistenten werden in dieser Datei dokumentiert.

Das Format basiert auf [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
und dieses Projekt folgt [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Hinzugefügt
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

### Behoben

### Entfernt

### Sicherheit