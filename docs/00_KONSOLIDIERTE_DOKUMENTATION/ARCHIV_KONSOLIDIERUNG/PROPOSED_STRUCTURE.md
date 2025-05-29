---
title: "Vorgeschlagene Dokumentationsstruktur"
version: "1.0.0"
date: "29.05.2025"
lastUpdate: "29.05.2025"
author: "Claude"
status: "Vorschlag"
priority: "Hoch"
category: "Dokumentation"
tags: ["Struktur", "Reorganisation", "Dokumentation"]
---

# Vorgeschlagene Dokumentationsstruktur

## Aktuelle Struktur - Probleme

### 1. Dateien auf Root-Ebene
Folgende Dateien befinden sich auf der Root-Ebene und sollten in Kategorien eingeordnet werden:
- ABSCHLIESENDE_STRUKTUR.md
- INVENTAR.md  
- KONSOLIDIERUNG_ABSCHLUSS.md
- KONSOLIDIERUNG_BERICHT.md
- KONSOLIDIERUNG_ZUSAMMENFASSUNG.md
- LINK_VALIDIERUNG.md
- STRUKTUR_BEREINIGUNG.md

### 2. Fehlende Nummern in Sequenzen
- 04_ENTWICKLUNG: Fehlt 02_ (springt von 01 zu 03)

### 3. Doppelte Inhalte
- 02_KOMPONENTEN/01_DOKUMENTENKONVERTER.md und 06_DOKUMENTENKONVERTER_KOMPLETT.md
- 02_KOMPONENTEN/99_ADMIN_INTERFACE_KOMPLETT.md (ungewöhnliche Nummerierung)

### 4. Veraltete Referenzen
- Einige Dateien verwenden noch "nscale DMS Assistent" statt "Digitale Akte Assistent"

### 5. Unlogische Reihenfolge
- 01_MIGRATION könnte in einen historischen Bereich verschoben werden, da die Migration abgeschlossen ist

## Vorgeschlagene neue Struktur

```
00_KONSOLIDIERTE_DOKUMENTATION/
├── 00_INDEX.md                    # Hauptindex (unverändert)
│
├── 01_PROJEKT/                    # Kritische Projektinformationen
│   ├── 01_status.md              # Aktueller Status
│   ├── 02_projektueberblick.md   # Hauptübersicht
│   └── 03_roadmap.md             # Zukunftsplanung
│
├── 02_ARCHITEKTUR/               # Kern-Implementierung
│   ├── 01_systemarchitektur.md   # Gesamtarchitektur (verschoben von 06)
│   ├── 02_frontend_struktur.md   # Frontend-Struktur (von 04 umbenannt)
│   ├── 03_api_integration.md     # API & Persistenz (von 05 umbenannt)
│   ├── 04_feature_toggles.md     # Feature Toggle System
│   ├── 05_dialog_system.md       # Dialog System
│   ├── 06_bridge_system.md       # Bridge System
│   ├── 07_ab_testing.md          # A/B Testing
│   ├── 08_asset_management.md    # Asset Pfade (umbenannt)
│   ├── 09_pure_vue_mode.md       # Pure Vue Mode
│   └── 10_admin_architektur.md   # Admin-Bereich
│
├── 03_KOMPONENTEN/               # Komponenten-Dokumentation
│   ├── 01_ui_basiskomponenten.md # UI Basis
│   ├── 02_chat_interface.md      # Chat & Session (zusammengeführt mit 07)
│   ├── 03_dokumentenkonverter.md # Dokumentenkonverter (zusammengeführt)
│   ├── 04_admin_interface.md     # Admin Interface (zusammengeführt)
│   ├── 05_feedback_system.md     # Feedback
│   ├── 06_notifications.md       # Benachrichtigungen (umbenannt)
│   ├── 07_source_references.md   # Source References
│   ├── 08_composables.md         # Vue 3 Composables
│   └── 09_design_system.md       # CSS & Design System
│
├── 04_ENTWICKLUNG/               # Entwicklungsrichtlinien
│   ├── 01_contributing.md        # Beitragsrichtlinien (von 05 verschoben)
│   ├── 02_fehlerbehandlung.md    # Error Handling
│   ├── 03_mobile_optimierung.md  # Mobile
│   ├── 04_barrierefreiheit.md    # Accessibility
│   ├── 05_edge_cases.md          # Edge Cases
│   └── 06_diagnostics.md         # Diagnose-System
│
├── 05_BETRIEB/                   # Betriebsdokumentation
│   ├── 01_performance.md         # Performance
│   ├── 02_troubleshooting.md     # Fehlerbehebung
│   ├── 03_monitoring.md          # Monitoring (neu)
│   └── 04_deployment.md          # Deployment (neu)
│
├── 06_REFERENZEN/                # Technische Referenzen
│   ├── 01_typescript_types.md    # TypeScript
│   ├── 02_state_management.md    # State Management
│   ├── 03_api_reference.md       # API Referenz (neu)
│   ├── 04_testing.md             # Test-Dokumentation (zusammengeführt)
│   ├── 05_auth_debugging.md      # Auth Debugging
│   └── 06_dependencies.md        # Dependencies
│
├── 07_WARTUNG/                   # Wartung & Fixes
│   ├── 01_bekannte_probleme.md   # Known Issues (neu)
│   ├── 02_hotfixes.md            # Hotfixes & Patches
│   └── 03_cleanup_tasks.md       # Cleanup-Liste (verschoben)
│
└── 08_ARCHIV/                    # Historische Dokumentation
    ├── 01_migration_vue3/        # Vue 3 Migration (verschoben)
    │   ├── README.md             # Übersicht
    │   └── [alle Migrationsdocs] # Alle Dateien aus 01_MIGRATION
    │
    └── 02_konsolidierung/        # Konsolidierungsdokumentation
        ├── 01_inventar.md        # Verschoben von Root
        ├── 02_bericht.md         # Verschoben von Root
        ├── 03_zusammenfassung.md # Verschoben von Root
        ├── 04_struktur.md        # Verschoben von Root
        └── 05_links.md           # Verschoben von Root
```

## Prioritäten-Hierarchie

### 00-01: Kritische Projektinformationen
- Projektstatus, Übersicht, Roadmap
- Muss immer aktuell sein

### 02-03: Kern-Implementierung  
- Architektur und Komponenten
- Technische Hauptdokumentation

### 04+: Erweiterte Themen
- Entwicklung, Betrieb, Referenzen
- Unterstützende Dokumentation

## Vorteile der neuen Struktur

1. **Klarere Hierarchie**: Wichtigkeit durch Nummerierung erkennbar
2. **Keine Duplikate**: Zusammengeführte Dokumentation
3. **Archiv-Bereich**: Historische Docs getrennt von aktiver Dokumentation
4. **Logische Gruppierung**: Verwandte Themen zusammen
5. **Erweiterbar**: Platz für neue Kategorien und Dokumente

## Empfohlene Aktionen

1. **Duplikate zusammenführen**:
   - Dokumentenkonverter-Docs vereinen
   - Admin Interface Docs konsolidieren
   - Test-Dokumentation vereinheitlichen

2. **Metadaten aktualisieren**:
   - Alle "nscale DMS Assistent" zu "Digitale Akte Assistent"
   - Versionsnummern und Daten aktualisieren

3. **Neue Dokumente erstellen**:
   - 03_monitoring.md für Betrieb
   - 04_deployment.md für Betrieb  
   - 03_api_reference.md für Referenzen
   - 01_bekannte_probleme.md für Wartung

4. **Index aktualisieren**:
   - 00_INDEX.md an neue Struktur anpassen
   - Alle internen Links korrigieren