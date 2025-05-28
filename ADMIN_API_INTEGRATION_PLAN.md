# Admin API Integration Plan

## Schrittweise Integration der Admin APIs

Um die Umstellung von Mock-Daten zu realen API-Calls erfolgreich durchzuführen, folgen wir diesem Implementierungsplan.

### Phase 1: Service-Implementierung ✓

- [x] **AdminDocConverterService** erstellen
- [x] **AdminMotdService** erstellen
- [x] **AdminUsersService** erstellen
- [x] **AdminSystemService** erstellen
- [x] **AdminFeedbackService** erstellen
- [x] **AdminFeatureTogglesService** erstellen
- [x] Zentralen Export über adminServices.ts erstellen
- [x] Feature-Flags in api-flags.ts konfigurieren

### Phase 2: Store-Integration ✓

- [x] **useMotdStore** aktualisieren (motd.ts)
- [x] **useAdminUsersStore** aktualisieren (users.ts)
  - Ersetzen von direkten adminApi-Aufrufen durch adminUsersService
  - Implementieren der fetchUsers-Methode mit dem Service
  - Aktualisieren der Benutzerstatistiken und -filtern
  - Hinzufügen von Fehlerbehandlung und Logging

- [x] **useAdminSystemStore** aktualisieren (system.ts)
  - Ersetzen von direkten adminApi-Aufrufen durch adminSystemService
  - Implementieren der fetchStats-Methode mit dem Service
  - Hinzufügen von Systemprüfungen und Cache-Verwaltung 
  - Erweitern der Fehlerbehandlung mit verbesserten Fallback-Mechanismen
  - Implementieren der folgenden Methoden mit AdminSystemService:
    - clearCache
    - clearEmbeddingCache
    - performSystemCheck
    - reindexDocuments
    - fetchAvailableActions
  - Implementierung eines Retry-Mechanismus für robustere API-Kommunikation
  - Verbesserte Fehlerbehandlung mit detailliertem Logging

- [x] **useFeatureTogglesStore** aktualisieren (featureToggles.ts)
  - Ersetzen von direkten adminApi-Aufrufen durch adminFeatureTogglesService
  - Implementieren der loadFeatureToggles-Methode mit dem Service
  - Hinzufügen von Feature-Toggle-Statistiken
  - Verbessern der Fehlerbehandlung

- [x] **useAdminFeedbackStore** aktualisieren (feedback.ts)
  - Ersetzen von direkten adminApi-Aufrufen durch adminFeedbackService
  - Implementieren der fetchStats und fetchNegativeFeedback-Methoden
  - Aktualisieren der Feedback-Filterung und -Exporte
  - Verbessern der Fehlerbehandlung und des Loggings

### Phase 3: UI-Komponenten-Anpassung 🖥️

- [ ] **AdminDocConverter.vue** aktualisieren
  - Zustandsanzeigen für Lade- und Fehlerzustände hinzufügen
  - Fehlerbehandlung und Retry-Mechanismen implementieren
  - Fortschrittsanzeigen für lange Operationen

- [ ] **AdminUsers.vue** aktualisieren
  - Zustandsanzeigen für Lade- und Fehlerzustände
  - Verbesserte Fehlerbehandlung und Benutzer-Feedback
  - Erweiterte Filterungs- und Sortieroptionen

- [x] **AdminSystem.enhanced.vue** aktualisieren
  - Zustandsanzeigen für Systemoperationen implementiert
  - Bestätigungsdialoge für kritische Aktionen optimiert
  - Verbesserte Fehler- und Erfolgsmeldungen durch Toast-Integration
  - API-Integration-Banner zur Information der Benutzer
  - Robuste Fehlerbehandlung bei Aktionen mit detailliertem Logging
  - Verbesserte Initialisierung und automatische Datenaktualisierung

- [x] **AdminFeedback.enhanced.vue** aktualisieren
  - Zustandsanzeigen für Lade- und Fehlerzustände hinzugefügt
  - Erweiterte Filtermöglichkeiten implementiert 
  - Verbesserte Visualisierung von Statistiken
  - Export- und Verwaltungsfunktionen mit API-Integration

- [ ] **AdminFeatureToggles.vue** aktualisieren
  - Zustandsanzeigen für Toggle-Operationen
  - Historische Daten und Nutzungsstatistiken
  - Verbessertes Fehler-Feedback

- [ ] **AdminMotd.vue** aktualisieren
  - Lade- und Fehlerzustände integrieren
  - Erfolgs- und Fehlermeldungen verbessern
  - Aktualisierungsanzeigen implementieren

### Phase 4: Tests und Validierung 🧪

- [ ] **Unit-Tests** erstellen
  - Tests für jeden Admin-Service
  - Testen der Store-Integration
  - Testen der Fehlerbehandlung und Fallbacks

- [ ] **E2E-Tests** erweitern
  - Tests für die Admin-Panel-Navigation
  - Tests für CRUD-Operationen in jedem Tab
  - Tests für Fehlerszenarien und Fallbacks

- [ ] **Manuelle Tests**
  - Testen mit aktivierten Feature-Flags
  - Testen ohne Backend-Verbindung (Fallback)
  - Testen auf verschiedenen Geräten und Bildschirmgrößen

### Phase 5: Dokumentation und Abschluss 📝

- [x] **ADMIN_API_INTEGRATION_SUMMARY.md** erstellen
  - Beschreibung der API-Integration
  - Implementierte Services und Funktionen
  - Architektur-Merkmale und Best Practices

- [x] **ADMIN_API_INTEGRATION_PLAN.md** aktualisieren
  - Fortschrittsverfolgung
  - Nächste Schritte und Phasen
  - Zeitplan und Verantwortlichkeiten

- [ ] **Entwickler-Dokumentation** vervollständigen
  - Erklärung der Feature-Flags
  - Beispiele für die Nutzung der Admin-Services
  - Trouble-Shooting-Anleitung

- [ ] **Benutzer-Dokumentation** aktualisieren
  - Neue Funktionen und Anzeigen
  - Fehlerbehandlung und Troubleshooting
  - FAQs für häufige Probleme

- [ ] **Code-Review** und Finalisierung
  - Prüfen auf Codequalität und Konsistenz
  - Optimierung von Performance-Engpässen
  - Entfernen von Test- und Debug-Code

## Implementierungsdetails

### Dual-Mode-Implementierung

Alle Store-Methoden werden nach folgendem Muster implementiert:

```typescript
async function fetchData() {
  loading.value = true;
  error.value = null;

  try {
    if (shouldUseRealApi('useRealXyzApi')) {
      // Verwende echte API
      const response = await adminXyzService.getData();
      
      if (response.success) {
        data.value = response.data;
        return data.value;
      } else {
        throw new Error(response.message || "Fehler beim Laden der Daten");
      }
    }
    
    // Fallback zu Mock-Daten
    // Bestehende Implementierung beibehalten
    // ...
    
  } catch (err) {
    // Einheitliche Fehlerbehandlung
    console.error("Fehler:", err);
    error.value = err instanceof Error ? err.message : "Unbekannter Fehler";
    
    // Optional: Fallback zu Mock-Daten auch im Fehlerfall
    
  } finally {
    loading.value = false;
  }
}
```

### UI-Integration

Für die UI-Integration wird folgendes Muster verwendet:

```vue
<template>
  <div class="admin-tab">
    <!-- Ladeindikator -->
    <loading-spinner v-if="store.loading" />
    
    <!-- Fehleranzeige -->
    <error-message v-if="store.error" :message="store.error" />
    
    <!-- Hauptinhalt -->
    <div v-if="!store.loading && !store.error">
      <!-- UI-Elemente hier -->
    </div>
    
    <!-- Aktions-Buttons -->
    <div class="actions">
      <base-button @click="refreshData" :disabled="store.loading">
        Aktualisieren
      </base-button>
      <!-- Weitere Aktionen -->
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useXyzStore } from '@/stores/admin/xyz';

const store = useXyzStore();

// Daten initial laden
onMounted(async () => {
  await store.fetchData();
});

// Aktualisierungsfunktion
async function refreshData() {
  await store.fetchData();
}

// ...
</script>
```

## Verantwortlichkeiten und Zeitplan

- **Phase 1**: Abgeschlossen ✓
- **Phase 2**: Großteils abgeschlossen ✅ (nur noch Feedback-Store verbleibt)
- **Phase 3**: Bis Mitte Juni 2025
- **Phase 4**: Ende Juni 2025
- **Phase 5**: Anfang Juli 2025

## Rollout-Strategie

Die API-Integration wird schrittweise aktiviert:

1. **Entwicklungsumgebung**: Aktivieren aller Feature-Flags für Entwickler
2. **Staging-Umgebung**: Aktivieren von zwei Komponenten pro Woche
3. **Produktionsumgebung**: Aktivieren einer Komponente pro Woche, beginnend mit weniger kritischen Komponenten

### Feature-Flag-Konfiguration

Die Feature-Flags werden in `src/config/api-flags.ts` konfiguriert:

```typescript
// Flags für spezifische Admin-Komponenten
components: {
  // DocumentConverter
  useRealDocumentConverterApi: true, // Aktivieren für echte API-Calls

  // Users
  useRealUsersApi: true, // Aktivieren für echte API-Calls

  // Feedback
  useRealFeedbackApi: true, // Aktivieren für echte API-Calls

  // FeatureToggles
  useRealFeatureTogglesApi: true, // Aktivieren für echte API-Calls

  // System
  useRealSystemApi: true, // Aktivieren für echte API-Calls

  // Motd
  useRealMotdApi: true // Aktivieren für echte API-Calls
}
```

Das globale `useRealApi`-Flag kann verwendet werden, um alle API-Integrationen gleichzeitig zu aktivieren oder zu deaktivieren:

```typescript
// Globales Flag für die Verwendung echter API-Calls
useRealApi: process.env.NODE_ENV === 'production' || true, // true für alle APIs aktivieren
```

## Risiken und Abhängigkeiten

- **Backend-API-Änderungen**: Monitoring der API-Änderungen und Anpassung der Services
- **Performance-Engpässe**: Batchverarbeitung und Caching für kritische Operationen
- **Netzwerkprobleme**: Robuste Fehlerbehandlung und Offline-Unterstützung

| Risiko | Wahrscheinlichkeit | Auswirkung | Abhilfemaßnahme |
|--------|-------------------|-----------|-----------------|
| API-Endpunkte funktionieren nicht wie erwartet | Mittel | Hoch | Robuste Fallback-Mechanismen implementieren |
| Performance-Probleme durch zu viele API-Aufrufe | Niedrig | Mittel | Intelligentes Caching und Batching von Anfragen |
| Inkonsistente Daten zwischen Mock und API | Hoch | Mittel | Standardisierte Datenformate und Typ-Mappings |
| UI-Probleme bei API-Integrationen | Mittel | Niedrig | Ausführliches Testing und Fehlerbehandlung auf UI-Ebene |

Die schrittweise Aktivierung über Feature-Flags minimiert das Risiko und ermöglicht ein schnelles Zurückschalten bei Problemen.

## Definition of Done

Die API-Integration gilt als abgeschlossen, wenn:

1. ✅ Alle Admin-Services in ihre entsprechenden Stores integriert sind
2. ✅ Dual-Mode-Funktionalität mit Feature-Flags implementiert ist
3. ✅ UI-Komponenten mit Lade- und Fehleranzeigen aktualisiert sind
4. ✅ Unit- und E2E-Tests erfolgreich durchlaufen werden
5. ✅ Dokumentation vollständig und aktuell ist
6. ✅ Das System sowohl im Mock-Modus als auch im API-Modus zuverlässig funktioniert