<template>
  <div class="feature-toggles-tab">
    <div class="feature-toggles-tab-header">
      <h3>Feature-Toggles Verwaltung</h3>
      <p class="feature-toggles-tab-description">
        Verwalten Sie alle Feature-Toggles und kontrollieren Sie den Migrations-
        und Entwicklungsstatus.
      </p>
    </div>

    <!-- Filter und Rollen-Steuerung -->
    <div class="feature-toggles-controls">
      <div class="feature-filter">
        <label for="feature-filter">Filter:</label>
        <select id="feature-filter" v-model="statusFilter">
          <option value="all">Alle Features</option>
          <option value="active">Aktive Features</option>
          <option value="inactive">Inaktive Features</option>
          <option value="errors">Fehlerhafte Features</option>
          <option value="fallback">Fallback aktiv</option>
        </select>
      </div>

      <div class="feature-role-selector">
        <label for="user-role">Rolle simulieren:</label>
        <select
          id="user-role"
          v-model="currentUserRole"
          @change="onUserRoleChange"
        >
          <option value="guest">Gast</option>
          <option value="user">Benutzer</option>
          <option value="developer">Entwickler</option>
          <option value="admin">Administrator</option>
        </select>
      </div>
    </div>

    <!-- FeatureTogglesPanel einbinden -->
    <FeatureTogglesPanel
      :initial-user-role="currentUserRole"
      @role-change="handleRoleChange"
      @feature-change="handleFeatureChange"
      @error-clear="handleErrorClear"
    />

    <!-- Änderungshistorie -->
    <div class="feature-history" v-if="changeHistory.length > 0">
      <h3>Änderungshistorie</h3>
      <div class="feature-history-list">
        <div
          v-for="(change, index) in changeHistory"
          :key="index"
          class="feature-history-item"
        >
          <div class="feature-history-time">
            {{ formatTimestamp(change.timestamp) }}
          </div>
          <div class="feature-history-content">
            <strong>{{ formatFeatureName(change.feature) }}</strong
            >:
            {{ change.enabled ? "aktiviert" : "deaktiviert" }}
            <span v-if="change.role" class="feature-history-role">
              (als {{ formatRoleName(change.role) }})
            </span>
          </div>
        </div>
      </div>
      <button
        @click="clearHistory"
        class="feature-btn feature-btn-secondary feature-btn-small"
      >
        Verlauf löschen
      </button>
    </div>

    <!-- Fehler-Simulationsbereich -->
    <div class="feature-simulation">
      <h3>Fehler-Simulation</h3>
      <p>
        Simulieren Sie Fehler in Features, um den Fallback-Mechanismus zu
        testen.
      </p>

      <div class="feature-simulation-controls">
        <div class="simulation-feature-select">
          <label for="simulation-feature">Feature:</label>
          <select id="simulation-feature" v-model="simulationFeature">
            <option value="">Bitte Feature auswählen</option>
            <option
              v-for="feature in sfcFeatures"
              :key="feature.key"
              :value="feature.key"
              :disabled="
                !isFeatureEnabled(feature.key) || isFallbackActive(feature.key)
              "
            >
              {{ feature.name }}
            </option>
          </select>
        </div>

        <div class="simulation-error-type">
          <label for="error-type">Fehlertyp:</label>
          <select
            id="error-type"
            v-model="simulationErrorType"
            :disabled="!simulationFeature"
          >
            <option value="render">Rendering-Fehler</option>
            <option value="data">Datenfehler</option>
            <option value="api">API-Fehler</option>
            <option value="timeout">Timeout</option>
          </select>
        </div>

        <button
          @click="simulateError"
          class="feature-btn feature-btn-danger feature-btn-small"
          :disabled="!simulationFeature"
        >
          Fehler simulieren
        </button>
      </div>
    </div>

    <!-- Hilfe und Dokumentation -->
    <div class="feature-documentation">
      <h3>Dokumentation</h3>
      <div class="feature-documentation-items">
        <div class="feature-documentation-item">
          <h4>Feature-Toggle System</h4>
          <p>
            Das Feature-Toggle System ermöglicht die schrittweise Migration von
            Legacy-Komponenten zu Vue 3 SFCs.
          </p>
          <p>
            Features können aktiviert, deaktiviert und auf verschiedene Fehler
            getestet werden.
          </p>
        </div>

        <div class="feature-documentation-item">
          <h4>Fallback-Mechanismus</h4>
          <p>
            Bei Fehlern in neuen Komponenten wird automatisch auf die
            Legacy-Version zurückgefallen.
          </p>
          <p>Fehlerlogs werden erfasst und können hier eingesehen werden.</p>
        </div>

        <div class="feature-documentation-item">
          <h4>Rollenbasierte Features</h4>
          <p>
            Features können je nach Benutzerrolle verfügbar sein oder nicht.
          </p>
          <p>
            Mit der Rollensimulation können Sie das Verhalten für verschiedene
            Benutzergruppen testen.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted, watch } from "vue";
import FeatureTogglesPanel from "@/components/admin/FeatureTogglesPanel.vue";
import { useFeatureToggles } from "@/composables/useFeatureToggles";
import { FeatureToggleRole } from "@/stores/featureToggles";
import { useToast } from "@/composables/useToast";

interface ChangeHistoryItem {
  timestamp: Date;
  feature: string;
  enabled: boolean;
  role?: FeatureToggleRole;
}

export default defineComponent({
  name: "AdminFeatureTogglesTab",
  components: {
    FeatureTogglesPanel,
  },
  setup() {
    // Feature-Toggles
    const featureToggles = useFeatureToggles();
    const toast = useToast();

    // Filter und Auswahl
    const statusFilter = ref("all");
    const currentUserRole = ref<FeatureToggleRole>("admin");

    // Fehler-Simulation
    const simulationFeature = ref("");
    const simulationErrorType = ref("render");

    // Änderungshistorie
    const changeHistory = ref<ChangeHistoryItem[]>(loadChangeHistory());

    // SFC-Features aus Feature-Toggles
    const sfcFeatures = computed(() => {
      return featureToggles.groupedFeatures.sfcMigration || [];
    });

    // Filtert die Features entsprechend dem ausgewählten Status
    const filteredFeatures = computed(() => {
      const filter = statusFilter.value;

      if (filter === "all") {
        return featureToggles.featureConfigs;
      }

      return Object.entries(featureToggles.featureConfigs).reduce(
        (acc, [key, config]) => {
          const status = featureToggles.getFeatureStatus(key);

          if (
            (filter === "active" && status.isActive) ||
            (filter === "inactive" && !status.isActive) ||
            (filter === "errors" && status.errors.length > 0) ||
            (filter === "fallback" && status.isFallbackActive)
          ) {
            acc[key] = config;
          }

          return acc;
        },
        {} as typeof featureToggles.featureConfigs,
      );
    });

    // Prüft, ob ein Feature aktiviert ist
    function isFeatureEnabled(featureName: string): boolean {
      return featureToggles.isEnabled(featureName);
    }

    // Prüft, ob für ein Feature der Fallback aktiv ist
    function isFallbackActive(featureName: string): boolean {
      return featureToggles.isFallbackActive(featureName);
    }

    // Formatiert den Feature-Namen für die Anzeige
    function formatFeatureName(key: string): string {
      const config = featureToggles.featureConfigs[key];
      if (config) {
        return config.name;
      }

      return key
        .replace(/^use/, "")
        .replace(/([A-Z])/g, " $1")
        .trim();
    }

    // Formatiert den Rollennamen für die Anzeige
    function formatRoleName(role: FeatureToggleRole): string {
      const roleNames: Record<FeatureToggleRole, string> = {
        guest: "Gast",
        user: "Benutzer",
        developer: "Entwickler",
        admin: "Administrator",
      };

      return roleNames[role] || role;
    }

    // Formatiert einen Zeitstempel für die Anzeige
    function formatTimestamp(date: Date): string {
      return new Intl.DateTimeFormat("de-DE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }).format(date);
    }

    // Event-Handler für Rollenänderungen
    function handleRoleChange(role: FeatureToggleRole): void {
      currentUserRole.value = role;
    }

    // Wenn die Benutzerrolle geändert wird
    function onUserRoleChange(): void {
      toast.show({
        message: `Rolle zu ${formatRoleName(currentUserRole.value)} geändert`,
        type: "info",
      });
    }

    // Fügt einen Eintrag zur Änderungshistorie hinzu
    function addToChangeHistory(feature: string, enabled: boolean): void {
      changeHistory.value.unshift({
        timestamp: new Date(),
        feature,
        enabled,
        role: currentUserRole.value,
      });

      // Begrenze die Historie auf 50 Einträge
      if (changeHistory.value.length > 50) {
        changeHistory.value = changeHistory.value.slice(0, 50);
      }

      // In localStorage speichern
      saveChangeHistory();
    }

    // Event-Handler für Feature-Änderungen
    function handleFeatureChange(featureName: string, enabled: boolean): void {
      addToChangeHistory(featureName, enabled);

      toast.show({
        message: `Feature "${formatFeatureName(featureName)}" ${enabled ? "aktiviert" : "deaktiviert"}`,
        type: enabled ? "success" : "info",
      });
    }

    // Event-Handler für Fehler-Löschung
    function handleErrorClear(featureName: string): void {
      toast.show({
        message: `Fehler für Feature "${formatFeatureName(featureName)}" gelöscht`,
        type: "success",
      });
    }

    // Lädt die Änderungshistorie aus dem localStorage
    function loadChangeHistory(): ChangeHistoryItem[] {
      try {
        const storedHistory = localStorage.getItem("featureToggleHistory");
        if (storedHistory) {
          const parsedHistory = JSON.parse(storedHistory);

          // Konvertiere alle Zeitstempel zurück zu Datum-Objekten
          return parsedHistory.map((item: any) => ({
            ...item,
            timestamp: new Date(item.timestamp),
          }));
        }
      } catch (error) {
        console.error("Fehler beim Laden der Feature-Toggle-Historie:", error);
      }

      return [];
    }

    // Speichert die Änderungshistorie im localStorage
    function saveChangeHistory(): void {
      try {
        localStorage.setItem(
          "featureToggleHistory",
          JSON.stringify(changeHistory.value),
        );
      } catch (error) {
        console.error(
          "Fehler beim Speichern der Feature-Toggle-Historie:",
          error,
        );
      }
    }

    // Löscht die Änderungshistorie
    function clearHistory(): void {
      changeHistory.value = [];
      localStorage.removeItem("featureToggleHistory");

      toast.show({
        message: "Änderungshistorie gelöscht",
        type: "info",
      });
    }

    // Simuliert einen Fehler in einem Feature
    function simulateError(): void {
      if (!simulationFeature.value) return;

      // Fehlertypen und entsprechende Fehler
      const errorMessages: Record<string, string> = {
        render: "Fehler beim Rendern der Komponente",
        data: "Ungültige Daten im State",
        api: "API-Anfrage fehlgeschlagen",
        timeout: "Zeitüberschreitung bei Anfrage",
      };

      // Fehler an den Store melden
      featureToggles.reportError(
        simulationFeature.value,
        `[SIMULATION] ${errorMessages[simulationErrorType.value] || "Simulierter Fehler"}`,
        { simulationType: simulationErrorType.value, timestamp: new Date() },
      );

      toast.show({
        message: `Fehler in "${formatFeatureName(simulationFeature.value)}" simuliert`,
        type: "warning",
      });

      // Feature und Fehlertyp zurücksetzen
      simulationFeature.value = "";
      simulationErrorType.value = "render";
    }

    return {
      // Filter und Steuerung
      statusFilter,
      currentUserRole,
      filteredFeatures,
      sfcFeatures,

      // Fehler-Simulation
      simulationFeature,
      simulationErrorType,
      simulateError,

      // Änderungshistorie
      changeHistory,
      clearHistory,

      // Event-Handler
      handleRoleChange,
      onUserRoleChange,
      handleFeatureChange,
      handleErrorClear,

      // Hilfsfunktionen
      isFeatureEnabled,
      isFallbackActive,
      formatFeatureName,
      formatRoleName,
      formatTimestamp,
    };
  },
});
</script>

<style scoped>
.feature-toggles-tab {
  font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
}

.feature-toggles-tab-header {
  margin-bottom: 1.5rem;
}

.feature-toggles-tab-header h3 {
  font-size: 1.5rem;
  color: #333;
  margin-bottom: 0.5rem;
}

.feature-toggles-tab-description {
  color: #666;
  margin-bottom: 1rem;
}

.feature-toggles-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 1.5rem;
  background-color: #f8f9fa;
  padding: 1rem;
  border-radius: 6px;
  align-items: center;
}

.feature-filter,
.feature-role-selector {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.feature-filter label,
.feature-role-selector label {
  font-weight: 500;
  white-space: nowrap;
}

.feature-filter select,
.feature-role-selector select {
  padding: 0.4rem 0.75rem;
  border: 1px solid #ced4da;
  border-radius: 4px;
  background-color: #fff;
}

.feature-history {
  margin-top: 2rem;
  background-color: #f8f9fa;
  padding: 1rem;
  border-radius: 6px;
}

.feature-history h3 {
  font-size: 1.2rem;
  margin-bottom: 0.75rem;
  color: #333;
}

.feature-history-list {
  max-height: 200px;
  overflow-y: auto;
  margin-bottom: 1rem;
  border: 1px solid #e9ecef;
  border-radius: 4px;
  background-color: #fff;
}

.feature-history-item {
  display: flex;
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid #e9ecef;
  font-size: 0.9rem;
}

.feature-history-item:last-child {
  border-bottom: none;
}

.feature-history-time {
  color: #6c757d;
  font-size: 0.8rem;
  width: 150px;
  flex-shrink: 0;
}

.feature-history-content {
  flex: 1;
}

.feature-history-role {
  color: #6c757d;
  font-style: italic;
  font-size: 0.8rem;
}

.feature-simulation {
  margin-top: 2rem;
  background-color: #f8f9fa;
  padding: 1rem;
  border-radius: 6px;
  border-left: 3px solid #fd7e14;
}

.feature-simulation h3 {
  font-size: 1.2rem;
  margin-bottom: 0.5rem;
  color: #333;
}

.feature-simulation p {
  color: #666;
  margin-bottom: 1rem;
  font-size: 0.9rem;
}

.feature-simulation-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: flex-end;
}

.simulation-feature-select,
.simulation-error-type {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.simulation-feature-select label,
.simulation-error-type label {
  font-size: 0.9rem;
  font-weight: 500;
}

.simulation-feature-select select,
.simulation-error-type select {
  padding: 0.4rem 0.75rem;
  border: 1px solid #ced4da;
  border-radius: 4px;
  min-width: 200px;
}

.feature-documentation {
  margin-top: 2rem;
  background-color: #f8f9fa;
  padding: 1rem;
  border-radius: 6px;
}

.feature-documentation h3 {
  font-size: 1.2rem;
  margin-bottom: 1rem;
  color: #333;
}

.feature-documentation-items {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
}

.feature-documentation-item {
  background-color: white;
  border: 1px solid #e9ecef;
  border-radius: 4px;
  padding: 1rem;
}

.feature-documentation-item h4 {
  font-size: 1.1rem;
  margin-bottom: 0.5rem;
  color: #343a40;
}

.feature-documentation-item p {
  font-size: 0.9rem;
  color: #666;
  margin-bottom: 0.5rem;
}

/* Buttons */
.feature-btn {
  padding: 0.75rem 1.5rem;
  border-radius: 4px;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition:
    background-color 0.2s,
    transform 0.1s;
  border: none;
  color: white;
  background-color: #0d7a40; /* nscale Grün */
}

.feature-btn:hover {
  background-color: #0a6032;
  transform: translateY(-1px);
}

.feature-btn:active {
  transform: translateY(0);
}

.feature-btn-secondary {
  background-color: #64748b;
}

.feature-btn-secondary:hover {
  background-color: #475569;
}

.feature-btn-danger {
  background-color: #ef4444;
}

.feature-btn-danger:hover {
  background-color: #dc2626;
}

.feature-btn-small {
  padding: 0.35rem 0.75rem;
  font-size: 0.8rem;
}

.feature-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

@media (max-width: 768px) {
  .feature-toggles-controls,
  .feature-simulation-controls {
    flex-direction: column;
    align-items: stretch;
  }

  .feature-filter,
  .feature-role-selector {
    flex-direction: column;
    align-items: flex-start;
  }

  .feature-filter select,
  .feature-role-selector select,
  .simulation-feature-select select,
  .simulation-error-type select {
    width: 100%;
  }
}
</style>
