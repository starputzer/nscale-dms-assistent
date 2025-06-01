---
title: "Abhängigkeitsanalyse und Architektur"
version: "1.0.0"
date: "16.05.2025"
lastUpdate: "16.05.2025"
author: "Claude"
status: "Aktiv"
priority: "Hoch"
category: "Referenzen"
tags: ["Abhängigkeiten", "Architektur", "Legacy", "Vue3", "Bridge", "Digitale Akte", "Assistent"]
---

# Abhängigkeitsanalyse der Digitale Akte Assistent

## Übersicht der Komponentenarchitektur

Die Anwendung besteht aus zwei Hauptkomponentensystemen:
1. **Legacy-Komponenten**: Vanilla JavaScript (app.js, chat.js, etc.)
2. **Vue 3-Komponenten**: Moderne SFC-Komponenten mit Composition API und Pinia Stores

Die Kommunikation zwischen diesen Systemen erfolgt über ein Bridge-System.

## Architektur-Diagramm

```
app.js
├── chat.js / enhanced-chat.js (über setupChat)
├── feedback.js (über setupFeedback)
├── admin.js (über setupAdmin)
├── settings.js (über setupSettings)
├── source-references.js (über setupSourceReferences)
└── ab-testing.js (für A/B Tests)
```

## Datei-Nutzungsanalyse

### Kritische Dateien für Vue 3-Komponenten (Behalten):
- `/src/components/*` - Alle Vue 3-Komponenten
- `/src/stores/*` - Pinia Stores
- `/src/services/*` - API-Services und Wrapper
- `/src/composables/*` - Vue 3 Composables
- `/src/types/*` - TypeScript-Definitionen
- `/src/utils/*` - Utility-Funktionen

### Legacy-Dateien (Migration erforderlich):
- `/app.js` - Haupt-Legacy-Datei
- `/chat.js`, `/enhanced-chat.js` - Chat-Funktionalität
- `/feedback.js` - Feedback-System
- `/admin.js` - Admin-Funktionen
- Alle anderen `.js` Dateien im Root

### Build-Ausschlüsse:
- `src/services/mock/*` - Nur für Entwicklung
- `test/*` - Test-Dateien
- `docs/*` - Dokumentation

## Import-Optimierung

Die Abhängigkeiten wurden analysiert und optimiert:
1. **Bundle-Optimierung**: Separate Chunks für Vendor, Features und App-Code
2. **Lazy-Loading**: Komponenten werden bei Bedarf geladen
3. **Tree-Shaking**: Unbenutzter Code wird eliminiert

## Migrations-Status

| Komponente | Legacy-Status | Vue 3-Status |
|------------|---------------|--------------|
| Chat | ✅ Migriert | enhanced-chat.js → ChatView.vue |
| Feedback | ✅ Migriert | feedback.js → FeedbackForm.vue |
| Admin | ✅ Migriert | admin.js → AdminPanel.vue |
| Settings | ✅ Migriert | settings.js → SettingsView.vue |

## Bridge-System-Abhängigkeiten

Das Bridge-System verbindet:
- Legacy-Events → Vue 3 Composables
- LocalStorage → Pinia Stores
- Legacy-API-Calls → Service-Wrapper

## Empfehlungen

1. **Schrittweise Legacy-Entfernung**: Nach erfolgreicher Migration können Legacy-Dateien archiviert werden
2. **Bridge-Optimierung**: Bridge-System kann nach vollständiger Migration vereinfacht werden
3. **Bundle-Größe**: Regelmäßige Analyse mit webpack-bundle-analyzer

---

*Konsolidiert aus dependency-analysis.md, dependency-diagram.md und file-usage-analysis.md*