<template>
  <div class="error-view">
    <div class="error-container">
      <div class="error-icon">
        <ErrorIcon size="large" />
      </div>
      <h1 class="error-code">{{ formattedErrorCode }}</h1>
      <h2 class="error-title">{{ errorTitle }}</h2>
      <p class="error-message">{{ errorMessage }}</p>
      <div class="error-actions">
        <Button type="primary" @click="goBack"> Zurück </Button>
        <Button @click="goHome"> Zur Startseite </Button>
        <Button v-if="canRetry" @click="retry"> Erneut versuchen </Button>
      </div>
      <div v-if="showDetails" class="error-details">
        <h3>Details</h3>
        <pre v-if="errorDetails">{{ errorDetails }}</pre>
        <pre v-if="additionalDetails">{{ additionalDetails }}</pre>
        <div
          v-if="isDevMode && router.currentRoute.value.query"
          class="dev-details"
        >
          <h4>Debug-Informationen</h4>
          <pre>{{
            JSON.stringify(router.currentRoute.value.query, null, 2)
          }}</pre>
        </div>
      </div>
      <div class="error-toggle-details">
        <a href="#" @click.prevent="toggleDetails">
          {{ showDetails ? "Details ausblenden" : "Details anzeigen" }}
        </a>
      </div>
      <div class="error-help">
        <p>Wenn das Problem weiterhin besteht, versuchen Sie:</p>
        <ul>
          <li>Browser-Cache leeren und Seite neu laden</li>
          <li>Überprüfen Sie Ihre Internetverbindung</li>
          <li>
            Kontaktieren Sie den Support, falls das Problem bestehen bleibt
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import ErrorIcon from "@/components/icons/ErrorIcon.vue";
import Button from "@/components/ui/base/Button.vue";
import { useErrorReporting } from "@/composables/useErrorReporting";

const props = defineProps({
  errorCode: {
    type: String,
    default: "500",
  },
  errorMessage: {
    type: String,
    default: "Ein unbekannter Fehler ist aufgetreten.",
  },
  errorDetails: {
    type: String,
    default: "",
  },
  canRetry: {
    type: Boolean,
    default: false,
  },
});

// Zusätzliche Fehlerinformationen aus der Route für bessere Diagnose
const route = useRoute();
const additionalDetails = ref("");
const isDevMode = ref(import.meta.env.DEV);

onMounted(() => {
  // Sammelt zusätzliche Diagnoseinformationen
  const details = [];

  // Routeninformationen
  if (route.query.source) details.push(`Quelle: ${route.query.source}`);
  if (route.query.component)
    details.push(`Komponente: ${route.query.component}`);
  if (route.query.ts) {
    const timestamp = new Date(parseInt(route.query.ts as string));
    details.push(`Zeitpunkt: ${timestamp.toLocaleString()}`);
  }

  // Browser-Informationen für Diagnose
  details.push(`Browser: ${navigator.userAgent}`);
  details.push(`URL: ${window.location.href}`);

  // Wenn in Entwicklungsumgebung, zeige zusätzliche Details an
  if (import.meta.env.DEV) {
    details.push(`Umgebung: Entwicklung`);
    // In der Produktion würden wir keine detaillierten Routen anzeigen
    details.push(`Route: ${JSON.stringify(route.fullPath)}`);
  }

  additionalDetails.value = details.join("\n");
});

const router = useRouter();
const showDetails = ref(false);

const formattedErrorCode = computed(() => {
  return props.errorCode;
});

const errorTitle = computed(() => {
  const titles: Record<string, string> = {
    "400": "Ungültige Anfrage",
    "401": "Nicht autorisiert",
    "403": "Zugriff verweigert",
    "404": "Seite nicht gefunden",
    "500": "Serverfehler",
    "503": "Dienst nicht verfügbar",
    offline: "Keine Verbindung",
    "feature-disabled": "Funktion deaktiviert",
    timeout: "Zeitüberschreitung",
    unknown: "Unbekannter Fehler",
    router_error: "Navigationsfehler",
    chunk_load_error: "Ladefehler",
    network_error: "Netzwerkproblem",
    component_load_error: "Komponentenfehler",
    module_not_found: "Modul nicht gefunden",
  };
  return titles[props.errorCode] || "Fehler";
});

const goBack = () => {
  router.back();
};

const goHome = () => {
  try {
    router.push({ path: "/" }).catch((err) => {
      console.error("Error navigating to home:", err);
      // Fallback für den Fall, dass der Router nicht funktioniert
      window.location.href = "/";
    });
  } catch (err) {
    console.error("Unexpected error navigating to home:", err);
    window.location.href = "/";
  }
};

const retry = () => {
  try {
    // Bei 'critical=true' Parameter oder Chunk-Ladefehlern: Erst versuchen, die App zu reparieren
    const isCritical = router.currentRoute.value.query.critical === "true";
    const isChunkError =
      router.currentRoute.value.query.code === "chunk_load_error" ||
      ((router.currentRoute.value.query.message as string) || "").includes(
        "chunk",
      );

    if (isCritical || isChunkError) {
      console.log("Versuche grundlegende App-Reparatur vor erneutem Laden...");

      // Lösche Cache (anstatt nur zu aktualisieren)
      try {
        // Service Worker deregistrieren, falls vorhanden
        if ("serviceWorker" in navigator) {
          navigator.serviceWorker.getRegistrations().then((registrations) => {
            for (const registration of registrations) {
              registration.unregister();
            }
          });
        }

        // Cache-Storage leeren
        if ("caches" in window) {
          caches.keys().then((keyList) => {
            return Promise.all(keyList.map((key) => caches.delete(key)));
          });
        }

        // Lokalen Storage für App-bezogene Daten leeren (aber User-Session beibehalten)
        const keysToKeep = ["token", "userId", "userRole"];
        const savedValues: Record<string, string> = {};

        // Speichere wichtige Werte
        keysToKeep.forEach((key) => {
          const value = localStorage.getItem(key);
          if (value) savedValues[key] = value;
        });

        // Lokalen Speicher leeren
        localStorage.clear();

        // Wichtige Werte wiederherstellen
        Object.entries(savedValues).forEach(([key, value]) => {
          localStorage.setItem(key, value);
        });

        // Hard Reload mit Cache-Invalidierung
        setTimeout(() => {
          window.location.href = "/";
        }, 500);

        return;
      } catch (cacheError) {
        console.error("Fehler beim Cache-Leeren:", cacheError);
      }
    }

    // Erst versuchen, zu der Route zurückzukehren, von der wir kamen
    if (router.currentRoute.value.query.from) {
      const fromPath = router.currentRoute.value.query.from as string;
      console.log(
        `Versuche Navigation zurück zur ursprünglichen Route: ${fromPath}`,
      );
      router.push(fromPath);
      return;
    }

    // Wenn keine from-Route vorhanden ist, aber eine Ursprungs-Route
    if (router.currentRoute.value.query.originalRoute) {
      const originalRoute = router.currentRoute.value.query
        .originalRoute as string;
      console.log(`Versuche Navigation zur Original-Route: ${originalRoute}`);
      router.push(originalRoute);
      return;
    }

    // Als letzten Ausweg, aktualisieren wir einfach die Seite
    // Wir nutzen ein kurzes Timeout, um mögliche Race-Conditions zu vermeiden
    console.log("Kein Navigationspfad gefunden, lade die Seite neu");
    setTimeout(() => window.location.reload(), 100);
  } catch (error) {
    console.error("Fehler beim Wiederversuch:", error);
    // Fallback: Seite neu laden mit Cache-Invalidierung
    window.location.href = "/?cache_bust=" + Date.now();
  }
};

const toggleDetails = () => {
  showDetails.value = !showDetails.value;
};
</script>

<style scoped>
.error-view {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 2rem;
  text-align: center;
  background-color: var(--color-background);
}

.error-container {
  max-width: 600px;
  padding: 2rem;
  border-radius: 8px;
  background-color: var(--color-background-soft);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.error-icon {
  color: var(--color-danger);
  margin-bottom: 1.5rem;
}

.error-code {
  font-size: 3rem;
  font-weight: 700;
  margin: 0 0 1rem;
  color: var(--color-danger);
}

.error-title {
  font-size: 1.5rem;
  margin: 0 0 1rem;
  color: var(--color-text);
}

.error-message {
  font-size: 1rem;
  margin: 0 0 2rem;
  color: var(--color-text-light);
  line-height: 1.5;
}

.error-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
}

.error-details {
  margin-top: 1.5rem;
  padding: 1rem;
  background-color: var(--color-background);
  border-radius: 4px;
  text-align: left;
  overflow-x: auto;
}

.error-details pre {
  font-family: monospace;
  font-size: 0.85rem;
  white-space: pre-wrap;
  word-break: break-all;
}

.error-toggle-details {
  margin-top: 1rem;
  font-size: 0.85rem;
}

.error-toggle-details a {
  color: var(--color-primary);
  text-decoration: none;
}

.error-toggle-details a:hover {
  text-decoration: underline;
}

.error-help {
  margin-top: 2rem;
  font-size: 0.9rem;
  color: var(--color-text-light);
  text-align: left;
  border-top: 1px solid var(--color-border);
  padding-top: 1rem;
}

.error-help ul {
  margin: 0.5rem 0 0 1.5rem;
  padding: 0;
  list-style-type: disc;
}

.error-help li {
  margin-bottom: 0.5rem;
}

.dev-details {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px dashed var(--color-border);
}

.dev-details h4 {
  color: #ff9800;
  margin-bottom: 0.5rem;
}

@media (max-width: 600px) {
  .error-actions {
    flex-direction: column;
    gap: 0.5rem;
  }

  .error-code {
    font-size: 2.5rem;
  }

  .error-title {
    font-size: 1.25rem;
  }
}
</style>
