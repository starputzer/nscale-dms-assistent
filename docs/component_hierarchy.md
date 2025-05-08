# Komponenten-Hierarchie

*Zuletzt aktualisiert: 08.05.2025*

Dieses Dokument beschreibt die Hierarchie und Beziehungen zwischen den wichtigsten Komponenten im nscale DMS Assistant.

## Übersicht

Die Anwendung folgt einer modularen Komponenten-Architektur mit mehreren Ebenen:

1. **App-Ebene**: Layout und globale Struktur
2. **Feature-Ebene**: Funktionale Bereiche der Anwendung
3. **Shared-Ebene**: Wiederverwendbare Komponenten
4. **UI-Ebene**: Grundlegende UI-Elemente

## Komponenten-Hierarchie

```
App
├── AppLayout
│   ├── AppHeader
│   ├── AppSidebar
│   ├── AppMain
│   └── AppFooter
│
├── Feature-Bereiche
│   ├── DocConverter (Dokumentenkonverter)
│   │   ├── SfcDocConverter (Vue 3 SFC)
│   │   ├── IntermediateDocConverter (Vereinfachte Version)
│   │   └── LegacyDocConverter (Legacy-Version)
│   │
│   ├── AdminPanel (Administrationsbereich)
│   │   ├── SfcAdminPanel (Vue 3 SFC)
│   │   ├── AdminTabs
│   │   │   ├── AdminDocConverterTab
│   │   │   ├── AdminFeedbackTab
│   │   │   ├── AdminMotdTab
│   │   │   ├── AdminSystemTab
│   │   │   └── AdminUsersTab
│   │   └── LegacyAdminPanel (Legacy-Version)
│   │
│   ├── Chat (Chat-Interface)
│   │   ├── SfcChatView (Vue 3 SFC)
│   │   ├── MessageList
│   │   ├── MessageComposer
│   │   └── LegacyChatView (Legacy-Version)
│   │
│   └── Settings (Einstellungen)
│       ├── SfcSettings (Vue 3 SFC)
│       └── LegacySettings (Legacy-Version)
│
├── Shared-Komponenten
│   ├── FeatureWrapper (Basis-Feature-Toggle)
│   ├── EnhancedFeatureWrapper (Erweiterter Feature-Toggle mit Fallback)
│   ├── ErrorBoundary (Fehlerbehandlung)
│   ├── AuthGuard (Authentifizierung)
│   ├── NotificationCenter (Benachrichtigungen)
│   ├── SearchBar (Suche)
│   └── Pagination (Seitennummerierung)
│
└── UI-Komponenten
    ├── Button
    ├── Card
    ├── Modal
    ├── Dropdown
    ├── Tabs
    ├── Form-Elemente
    │   ├── InputField
    │   ├── SelectField
    │   ├── Checkbox
    │   ├── RadioGroup
    │   └── TextArea
    └── Feedback-Elemente
        ├── Alert
        ├── Toast
        ├── Badge
        ├── ProgressBar
        └── Spinner
```

## Komponenten-Typen

### Wrapper-Komponenten

Diese Komponenten kapseln Funktionalität und bieten zusätzliche Funktionen:

- **FeatureWrapper**: Bedingte Rendering basierend auf Feature-Flags
- **EnhancedFeatureWrapper**: Erweiterter Feature-Wrapper mit Fallback-Mechanismus
- **ErrorBoundary**: Fehlerabfang und -behandlung

### Container-Komponenten

Diese Komponenten verwalten Zustände und steuern andere Komponenten:

- **AppLayout**: Hauptlayout der Anwendung
- **AdminPanel**: Container für Admin-Funktionen
- **ChatView**: Container für Chat-Funktionen
- **Settings**: Container für Einstellungen

### Präsentations-Komponenten

Diese Komponenten sind hauptsächlich für die Darstellung zuständig:

- **MessageItem**: Einzelne Chat-Nachricht
- **AdminTab**: Einzelner Admin-Tab
- **Button**, **Card**, **Modal**, etc.: Basis-UI-Komponenten

## Fallback-Hierarchie

Der Fallback-Mechanismus verwendet eine dreistufige Hierarchie:

1. **Neue Vue 3 SFC-Komponenten**: Vollständig in Vue 3 mit Composition API implementiert
2. **Intermediäre Komponenten**: Vereinfachte Versionen mit reduzierter Funktionalität
3. **Legacy-Komponenten**: Ursprüngliche Implementierungen als Fallback

Weitere Details zum Fallback-Mechanismus finden Sie in der [ERROR_HANDLING_FALLBACK.md](./ERROR_HANDLING_FALLBACK.md) Dokumentation.

## Kommunikation zwischen Komponenten

Die Kommunikation zwischen Komponenten erfolgt über verschiedene Mechanismen:

1. **Props und Events**: Für direkte Eltern-Kind-Kommunikation
2. **Provide/Inject**: Für Kontextinformationen über mehrere Ebenen
3. **Pinia-Stores**: Für globalen Zustand und komponentenübergreifende Kommunikation
4. **Composables**: Für wiederverwendbare Logik in verschiedenen Komponenten

## Integration mit Feature-Toggles

Alle neuen Komponenten werden durch Feature-Toggles gesteuert:

- `useSfcDocConverter` für den Dokumentenkonverter
- `useSfcAdmin` für den Administrationsbereich
- `useSfcChat` für das Chat-Interface
- `useSfcSettings` für die Einstellungen

Diese Feature-Toggles sind mit dem Fallback-Mechanismus integriert, um bei Fehlern automatisch auf Legacy-Komponenten zurückzufallen.