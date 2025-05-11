# Status der Legacy-Code-Deaktivierung

Datum: 2025-05-11

## Übersicht der Komponenten

| Kategorie | Komponente | Status | Risiko | Geplantes Datum |
|-----------|------------|--------|--------|----------------|
| ui | Button | Bereit zur Deaktivierung | low | 2025-05-14 |
| ui | Input | Bereit zur Deaktivierung | low | 2025-05-14 |
| ui | Card | Bereit zur Deaktivierung | low | 2025-05-14 |
| ui | Modal | Bereit zur Deaktivierung | low | 2025-05-14 |
| ui | Dialog | Bereit zur Deaktivierung | low | 2025-05-14 |
| functional | SourceReferences | Bereit zur Deaktivierung | low | 2025-05-18 |
| functional | Feedback | Bereit zur Deaktivierung | low | 2025-05-18 |
| functional | Settings | Bereit zur Deaktivierung | medium | 2025-05-18 |
| functional | Admin | Bereit zur Deaktivierung | medium | 2025-05-18 |
| functional | Chat | Bereit zur Deaktivierung | high | 2025-05-18 |
| utility | Performance | Bereit zur Deaktivierung | low | 2025-05-22 |
| utility | AsyncOptimization | Bereit zur Deaktivierung | medium | 2025-05-22 |
| utility | AbTesting | Bereit zur Deaktivierung | medium | 2025-05-22 |
| utility | ErrorHandler | Bereit zur Deaktivierung | high | 2025-05-22 |
| utility | Telemetry | Bereit zur Deaktivierung | medium | 2025-05-22 |
| core | FeatureFlags | Bereit zur Deaktivierung | high | 2025-05-26 |
| core | Bridge | Bereit zur Deaktivierung | very-high | 2025-05-26 |
| core | AppExtensions | Bereit zur Deaktivierung | high | 2025-05-26 |
| core | App | Bereit zur Deaktivierung | very-high | 2025-05-26 |

## Nächste Schritte

1. Deaktiviere UI-Komponenten (geplant für 2025-05-14)
2. Überwache die Anwendung auf Fehler für 7 Tage
3. Setze die Deaktivierung mit funktionalen Komponenten fort (geplant für 2025-05-18)

## Hinweise

- Ein Notfall-Rollback-Skript wurde erstellt: `../scripts/emergency-legacy-rollback.js`
- Alle deaktivierten Komponenten werden im Legacy-Archiv gesichert: `../frontend/js/legacy-archive`
- Die endgültige Entfernung der archivierten Dateien ist für den 31.05.2025 geplant
