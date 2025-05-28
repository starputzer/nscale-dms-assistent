<template>
  <div class="migration-dashboard">
    <header class="dashboard-header">
      <h1>Migration Dashboard</h1>
      <div class="controls">
        <button @click="refreshData" class="refresh-button">
          <span class="icon">🔄</span> Aktualisieren
        </button>
        <div class="toggle-container">
          <label>
            <input type="checkbox" v-model="autoRefresh" />
            Auto-Refresh ({{ refreshInterval / 1000 }}s)
          </label>
        </div>
      </div>
    </header>

    <div class="dashboard-content">
      <!-- Übersicht -->
      <section class="overview-section">
        <h2>Migrations-Fortschritt</h2>
        <div class="status-container">
          <div class="status-card">
            <div class="status-title">Status</div>
            <div class="status-value" :class="statusClass">
              {{ formattedStatus }}
            </div>
          </div>

          <div class="status-card">
            <div class="status-title">Fortschritt</div>
            <div class="progress-container">
              <div
                class="progress-bar"
                :style="{ width: `${migrationData.progress}%` }"
              ></div>
              <div class="progress-text">
                {{ Math.round(migrationData.progress) }}%
              </div>
            </div>
          </div>

          <div class="status-card">
            <div class="status-title">Komponenten</div>
            <div class="status-value">
              {{ migrationData.statistics.migratedComponents }} /
              {{ migrationData.statistics.totalComponents }}
            </div>
          </div>

          <div class="status-card">
            <div class="status-title">Start</div>
            <div class="status-value">
              {{ formatDate(migrationData.startTime) }}
            </div>
          </div>

          <div class="status-card">
            <div class="status-title">Letzte Aktualisierung</div>
            <div class="status-value">
              {{ formatDate(migrationData.lastUpdate) }}
            </div>
          </div>
        </div>
      </section>

      <!-- Komponenten-Status -->
      <section class="components-section" v-if="report">
        <h2>Komponenten-Status</h2>
        <table class="components-table">
          <thead>
            <tr>
              <th>Komponente</th>
              <th>Status</th>
              <th>Fortschritt</th>
              <th>Gestartet</th>
              <th>Abgeschlossen</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(component, id) in report.stateReports"
              :key="id"
              :class="{
                success: component.status === 'COMPLETED',
                warning: component.status === 'PARTIALLY_COMPLETED',
                error: component.status === 'FAILED',
              }"
            >
              <td>{{ id }}</td>
              <td>{{ formatStatus(component.status) }}</td>
              <td>
                <div class="progress-container small">
                  <div
                    class="progress-bar"
                    :style="{ width: `${calculateProgress(component)}%` }"
                  ></div>
                  <div class="progress-text small">
                    {{ component.migratedParts?.length || 0 }} /
                    {{
                      (component.migratedParts?.length || 0) +
                      (component.pendingParts?.length || 0)
                    }}
                  </div>
                </div>
              </td>
              <td>{{ formatDate(component.startedAt) }}</td>
              <td>
                {{
                  component.completedAt
                    ? formatDate(component.completedAt)
                    : "-"
                }}
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <!-- Legacy-Code Nutzung -->
      <section
        class="legacy-usage-section"
        v-if="legacyUsage && legacyUsage.length > 0"
      >
        <h2>Legacy-Code Nutzung</h2>
        <table class="legacy-table">
          <thead>
            <tr>
              <th>API / Code</th>
              <th>Aufrufe</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(usage, index) in legacyUsage" :key="index">
              <td>{{ usage.source }}</td>
              <td>{{ usage.count }}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <!-- Probleme und Empfehlungen -->
      <section class="issues-section" v-if="report">
        <h2>Probleme und Empfehlungen</h2>

        <div
          class="issues-container"
          v-if="report.criticalIssues && report.criticalIssues.length > 0"
        >
          <h3>Kritische Probleme</h3>
          <ul class="issues-list">
            <li
              v-for="(issue, index) in report.criticalIssues"
              :key="index"
              class="error"
            >
              {{ issue }}
            </li>
          </ul>
        </div>

        <div
          class="issues-container"
          v-if="report.warnings && report.warnings.length > 0"
        >
          <h3>Warnungen</h3>
          <ul class="issues-list">
            <li
              v-for="(warning, index) in report.warnings"
              :key="index"
              class="warning"
            >
              {{ warning }}
            </li>
          </ul>
        </div>

        <div
          class="issues-container"
          v-if="
            report.recommendedActions && report.recommendedActions.length > 0
          "
        >
          <h3>Empfohlene Maßnahmen</h3>
          <ul class="issues-list recommendations">
            <li
              v-for="(action, index) in report.recommendedActions"
              :key="index"
            >
              {{ action }}
            </li>
          </ul>
        </div>
      </section>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted, computed } from "vue";
import { migrationDiagnostics } from "../../src/migration/MigrationDiagnostics";

export default {
  name: "MigrationDashboardExample",

  setup() {
    // Zustandsdaten
    const migrationData = ref({
      status: "NOT_STARTED",
      progress: 0,
      statistics: {
        totalComponents: 0,
        migratedComponents: 0,
        failedComponents: 0,
        partiallyMigratedComponents: 0,
        totalErrors: 0,
        totalWarnings: 0,
      },
      startTime: null,
      completionTime: null,
      lastUpdate: new Date(),
    });

    const report = ref(null);
    const legacyUsage = ref([]);
    const autoRefresh = ref(true);
    const refreshInterval = ref(5000); // 5 Sekunden
    let refreshTimer = null;

    // Berechnete Eigenschaften
    const statusClass = computed(() => {
      switch (migrationData.value.status) {
        case "COMPLETED":
          return "success";
        case "PARTIALLY_COMPLETED":
          return "warning";
        case "FAILED":
          return "error";
        case "IN_PROGRESS":
          return "info";
        default:
          return "";
      }
    });

    const formattedStatus = computed(() => {
      switch (migrationData.value.status) {
        case "NOT_STARTED":
          return "Nicht gestartet";
        case "IN_PROGRESS":
          return "In Bearbeitung";
        case "COMPLETED":
          return "Abgeschlossen";
        case "FAILED":
          return "Fehlgeschlagen";
        case "PARTIALLY_COMPLETED":
          return "Teilweise abgeschlossen";
        default:
          return migrationData.value.status;
      }
    });

    // Methoden
    const refreshData = () => {
      // Daten vom Diagnose-Tool abrufen
      migrationData.value = migrationDiagnostics.getExportedData();
      report.value = migrationDiagnostics.generateReport();
      legacyUsage.value = migrationDiagnostics.identifyLegacyCodeUsage();
    };

    const formatDate = (date) => {
      if (!date) return "-";

      // Datum formatieren
      if (typeof date === "string") {
        date = new Date(date);
      }

      return new Intl.DateTimeFormat("de-DE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }).format(date);
    };

    const formatStatus = (status) => {
      switch (status) {
        case "NOT_STARTED":
          return "Nicht gestartet";
        case "IN_PROGRESS":
          return "In Bearbeitung";
        case "COMPLETED":
          return "Abgeschlossen";
        case "FAILED":
          return "Fehlgeschlagen";
        case "PARTIALLY_COMPLETED":
          return "Teilweise abgeschlossen";
        default:
          return status;
      }
    };

    const calculateProgress = (component) => {
      const completed = component.migratedParts?.length || 0;
      const total = completed + (component.pendingParts?.length || 0);

      return total > 0 ? (completed / total) * 100 : 0;
    };

    const setupAutoRefresh = () => {
      if (refreshTimer) {
        clearInterval(refreshTimer);
        refreshTimer = null;
      }

      if (autoRefresh.value) {
        refreshTimer = setInterval(refreshData, refreshInterval.value);
      }
    };

    // Lifecycle-Hooks
    onMounted(() => {
      // Dashboard konfigurieren
      migrationDiagnostics.enableDashboard(true);
      migrationDiagnostics.setDashboardConfig({
        autoRefresh: true,
        refreshInterval: refreshInterval.value,
        showDetailedReports: true,
        showErrorDetails: true,
        showPerformanceMetrics: true,
      });

      // Initiale Daten laden
      refreshData();

      // Auto-Refresh einrichten
      setupAutoRefresh();
    });

    onUnmounted(() => {
      // Timer aufräumen
      if (refreshTimer) {
        clearInterval(refreshTimer);
      }
    });

    return {
      migrationData,
      report,
      legacyUsage,
      autoRefresh,
      refreshInterval,
      statusClass,
      formattedStatus,
      refreshData,
      formatDate,
      formatStatus,
      calculateProgress,
    };
  },
};
</script>

<style scoped>
.migration-dashboard {
  font-family: Arial, sans-serif;
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  background-color: #f8f9fa;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid #dee2e6;
}

.dashboard-header h1 {
  font-size: 24px;
  margin: 0;
}

.controls {
  display: flex;
  align-items: center;
  gap: 15px;
}

.refresh-button {
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 5px;
}

.refresh-button:hover {
  background-color: #0069d9;
}

.toggle-container {
  display: flex;
  align-items: center;
}

section {
  background-color: white;
  border-radius: 6px;
  padding: 15px;
  margin-bottom: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

h2 {
  font-size: 18px;
  margin-top: 0;
  margin-bottom: 15px;
  color: #495057;
}

h3 {
  font-size: 16px;
  margin-top: 10px;
  margin-bottom: 10px;
  color: #495057;
}

.status-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
}

.status-card {
  padding: 10px;
  border-radius: 4px;
  background-color: #f8f9fa;
  border: 1px solid #e9ecef;
}

.status-title {
  font-size: 14px;
  color: #6c757d;
  margin-bottom: 5px;
}

.status-value {
  font-size: 18px;
  font-weight: bold;
}

.progress-container {
  height: 20px;
  background-color: #e9ecef;
  border-radius: 4px;
  overflow: hidden;
  position: relative;
}

.progress-container.small {
  height: 16px;
}

.progress-bar {
  height: 100%;
  background-color: #28a745;
  transition: width 0.3s ease;
}

.progress-text {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #212529;
  font-weight: bold;
}

.progress-text.small {
  font-size: 12px;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th,
td {
  padding: 8px 12px;
  text-align: left;
  border-bottom: 1px solid #e9ecef;
}

th {
  background-color: #f8f9fa;
  font-weight: bold;
  color: #495057;
}

tr.success {
  background-color: rgba(40, 167, 69, 0.1);
}

tr.warning {
  background-color: rgba(255, 193, 7, 0.1);
}

tr.error {
  background-color: rgba(220, 53, 69, 0.1);
}

.issues-container {
  margin-bottom: 20px;
}

.issues-list {
  list-style-type: none;
  padding: 0;
  margin: 0;
}

.issues-list li {
  padding: 8px 12px;
  margin-bottom: 5px;
  border-radius: 4px;
}

.issues-list li.error {
  background-color: rgba(220, 53, 69, 0.1);
  border-left: 3px solid #dc3545;
}

.issues-list li.warning {
  background-color: rgba(255, 193, 7, 0.1);
  border-left: 3px solid #ffc107;
}

.issues-list.recommendations li {
  background-color: rgba(13, 110, 253, 0.1);
  border-left: 3px solid #0d6efd;
}

.success {
  color: #28a745;
}

.warning {
  color: #ffc107;
}

.error {
  color: #dc3545;
}

.info {
  color: #17a2b8;
}
</style>
