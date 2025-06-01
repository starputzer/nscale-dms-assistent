<template>
  <div class="admin-ab-tests">
    <h2 class="text-2xl font-semibold mb-4">A/B-Tests</h2>

    <div
      v-if="error"
      class="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4"
      role="alert"
    >
      <p>{{ error }}</p>
    </div>

    <!-- Test-Auswahl -->
    <div class="bg-white rounded-lg shadow p-4 mb-6">
      <h3 class="text-lg font-medium mb-2">Aktive Tests</h3>
      <div v-if="isLoading" class="flex justify-center py-4">
        <div class="spinner"></div>
      </div>
      <div
        v-else-if="!tests || tests.length === 0"
        class="py-4 text-center text-gray-500"
      >
        Keine aktiven Tests gefunden
      </div>
      <div v-else class="grid grid-cols-1 gap-4">
        <div
          v-for="test in tests"
          :key="test.id"
          class="border rounded-md p-4 hover:bg-gray-50 cursor-pointer"
          :class="{ 'bg-blue-50 border-blue-300': selectedTest === test.id }"
          @click="loadTestResults(test.id)"
        >
          <div class="flex justify-between items-start">
            <div>
              <h4 class="font-medium">{{ test.id }}</h4>
              <p class="text-sm text-gray-600">{{ test.description }}</p>
            </div>
            <div class="bg-gray-100 rounded-md px-2 py-1 text-xs">
              Variante: {{ test.currentVariant }}
            </div>
          </div>
          <div class="mt-2 text-sm text-gray-700">
            <strong>Metriken:</strong> {{ test.metrics.join(", ") }}
          </div>
        </div>
      </div>
    </div>

    <!-- Test-Details, wenn ausgewählt -->
    <div v-if="selectedTest && testResults" class="bg-white rounded-lg shadow">
      <div class="border-b p-4">
        <div class="flex justify-between items-center">
          <h3 class="text-lg font-medium">Test-Details: {{ selectedTest }}</h3>
          <div class="flex space-x-2">
            <button
              @click="changeTestVariant(selectedTest, 'control')"
              class="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded"
            >
              Als Control anzeigen
            </button>
            <button
              @click="changeTestVariant(selectedTest, 'variant')"
              class="px-3 py-1 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded"
            >
              Als Variant anzeigen
            </button>
            <button
              @click="changeTestVariant(selectedTest, 'none')"
              class="px-3 py-1 text-sm bg-red-500 hover:bg-red-600 text-white rounded"
            >
              Zurücksetzen
            </button>
          </div>
        </div>
      </div>

      <div class="p-4">
        <div class="mb-4">
          <p><strong>Start:</strong> {{ testResults.startDate }}</p>
          <p>
            <strong>Teilnehmer:</strong>
            Control: {{ testResults.participants.control }}, Variant:
            {{ testResults.participants.variant }}
          </p>
        </div>

        <h4 class="font-medium mb-2">Metriken</h4>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div
            v-for="(data, metric) in testResults.metrics"
            :key="metric"
            class="border rounded-lg p-3"
          >
            <h5 class="font-medium">{{ formatMetricName(metric) }}</h5>
            <div class="flex justify-between mt-2">
              <div>
                <div class="text-sm text-gray-500">Control</div>
                <div>{{ formatMetricValue(metric, data.control) }}</div>
              </div>
              <div>
                <div class="text-sm text-gray-500">Variant</div>
                <div>{{ formatMetricValue(metric, data.variant) }}</div>
              </div>
              <div>
                <div class="text-sm text-gray-500">Änderung</div>
                <div class="font-medium text-green-600">
                  {{ data.improvement }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  setup() {
    const tests = ref([]);
    const selectedTest = ref(null);
    const isLoading = ref(false);
    const error = ref(null);
    const testResults = ref(null);

    // Tests laden
    const loadTests = async () => {
      try {
        isLoading.value = true;
        error.value = null;

        // A/B-Testing API verwenden
        if (window.abTesting && window.abTesting.listAvailableTests) {
          const availableTests = window.abTesting.listAvailableTests();

          // Tests mit aktuellen Varianten anreichern
          tests.value = availableTests.map((test) => ({
            ...test,
            currentVariant:
              window.abTesting.getUserTestVariant(test.id) ||
              "Nicht zugewiesen",
          }));

          console.log("A/B-Tests geladen:", tests.value);
        } else {
          error.value = "A/B-Testing-System nicht verfügbar";
        }
      } catch (err) {
        console.error("Fehler beim Laden der A/B-Tests:", err);
        error.value = "Die A/B-Tests konnten nicht geladen werden.";
      } finally {
        isLoading.value = false;
      }
    };

    // Test-Ergebnisse laden (würde in einer realen Anwendung eine API-Anfrage senden)
    const loadTestResults = async (testId) => {
      try {
        isLoading.value = true;
        error.value = null;

        // In einer realen Anwendung würden hier Daten vom Server geladen
        console.log(`Lade Ergebnisse für Test: ${testId}`);

        // Simulierte Ergebnisse
        await new Promise((resolve) => setTimeout(resolve, 500)); // Simuliere Netzwerkverzögerung

        testResults.value = {
          testId,
          startDate: new Date(
            Date.now() - 14 * 24 * 60 * 60 * 1000,
          ).toLocaleDateString(), // 14 Tage zurück
          participants: {
            control: Math.floor(Math.random() * 500) + 500,
            variant: Math.floor(Math.random() * 500) + 500,
          },
          metrics: {
            messageResponseTime: {
              control: Math.floor(Math.random() * 1000) + 2000, // 2-3s
              variant: Math.floor(Math.random() * 800) + 1200, // 1.2-2s
              improvement: "+35%",
            },
            userSatisfaction: {
              control: (Math.random() * 0.2 + 0.6).toFixed(2), // 0.6-0.8
              variant: (Math.random() * 0.15 + 0.75).toFixed(2), // 0.75-0.9
              improvement: "+15%",
            },
            sessionDuration: {
              control: Math.floor(Math.random() * 60) + 180, // 3-4min
              variant: Math.floor(Math.random() * 90) + 240, // 4-5.5min
              improvement: "+30%",
            },
          },
        };

        selectedTest.value = testId;
      } catch (err) {
        console.error(
          `Fehler beim Laden der Ergebnisse für Test ${testId}:`,
          err,
        );
        error.value = "Die Testergebnisse konnten nicht geladen werden.";
        testResults.value = null;
      } finally {
        isLoading.value = false;
      }
    };

    // Test-Variante für den aktuellen Benutzer ändern
    const changeTestVariant = async (testId, variant) => {
      try {
        isLoading.value = true;

        if (!window.abTesting) {
          error.value = "A/B-Testing-System nicht verfügbar";
          return;
        }

        // Zuerst aus dem aktuellen Test austreten
        await window.abTesting.exitTest(testId);

        if (variant !== "none") {
          // Benutzer einer spezifischen Variante zuweisen (nur für Admin-Zwecke)
          localStorage.setItem(
            `abTestAssignments`,
            JSON.stringify({
              ...JSON.parse(localStorage.getItem("abTestAssignments") || "{}"),
              [testId]: variant,
            }),
          );

          alert(
            `Sie wurden der Variante '${variant}' für Test '${testId}' zugewiesen. Die Seite wird neu geladen, um die Änderungen anzuwenden.`,
          );

          // Feature-Flags aktualisieren und Seite neu laden
          window.location.reload();
        } else {
          // Tests neu laden
          await loadTests();
        }
      } catch (err) {
        console.error(
          `Fehler beim Ändern der Testvariante für ${testId}:`,
          err,
        );
        error.value = "Die Testvariante konnte nicht geändert werden.";
      } finally {
        isLoading.value = false;
      }
    };

    // Metrik-Namen für Anzeige formatieren
    const formatMetricName = (metric) => {
      const names = {
        messageResponseTime: "Antwortzeit",
        userSatisfaction: "Nutzerzufriedenheit",
        sessionDuration: "Sitzungsdauer",
        conversionSpeed: "Konversionsgeschwindigkeit",
        conversionSuccess: "Konversionserfolg",
        taskCompletionTime: "Aufgabenzeit",
        navigationEfficiency: "Navigationseffizienz",
      };

      return names[metric] || metric;
    };

    // Metrik-Werte für Anzeige formatieren
    const formatMetricValue = (metric, value) => {
      if (metric === "messageResponseTime") {
        return `${value}ms`;
      } else if (
        metric === "sessionDuration" ||
        metric === "taskCompletionTime"
      ) {
        return `${value}s`;
      } else if (
        metric === "userSatisfaction" ||
        metric === "conversionSuccess"
      ) {
        return `${(value * 100).toFixed(0)}%`;
      } else {
        return value;
      }
    };

    // Bei Montierung Tests laden
    onMounted(() => {
      loadTests();
    });

    return {
      tests,
      selectedTest,
      isLoading,
      error,
      testResults,
      loadTests,
      loadTestResults,
      changeTestVariant,
      formatMetricName,
      formatMetricValue,
    };
  },
};
</script>

<style scoped>
.spinner {
  border: 2px solid rgba(0, 0, 0, 0.1);
  border-top-color: #3498db;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
