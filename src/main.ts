import { createApp, defineAsyncComponent } from "vue";
import pinia from "./stores";
import App from "./App.vue";
import router from "./router";
import { ApiService } from "./services/api/ApiService";
import { initializeStores } from "./stores/storeInitializer";

// Dynamischer Import-Utility
import {
  dynamicImport,
  preloadComponentGroup,
  setupNetworkMonitoring,
} from "./utils/dynamicImport";

// Styles
import "./assets/styles/main.scss";
import "./assets/styles/touch-focus.scss";
import "./assets/styles/focus-indicators.css";

/**
 * Performance-optimierte App-Initialisierung mit:
 * - Verzögertem Laden nicht-kritischer Komponenten
 * - Progressive App-Bootstrapping
 * - Vorausladendem Code-Splitting
 * - Prioritäts-basiertem Komponenten-Laden
 */

// Initialisiere API-Service und App
const initApp = async () => {
  // API-Service initialisieren
  // Prüfen, ob ApiService eine initialize-Methode hat (oder Methode anpassen)
  if (typeof ApiService["initialize"] === "function") {
    ApiService["initialize"]();
  } else {
    console.warn(
      "ApiService hat keine Initialisierungsmethode, überspringe Initialisierung",
    );
  }

  // Erstelle App-Instanz
  const app = createApp(App);

  // Registriere Plugins
  app.use(pinia);
  app.use(router);

  // Globale asynchrone Komponenten registrieren mit optimiertem Laden
  // Diese Komponenten werden nur geladen, wenn sie benötigt werden
  app.component(
    "AsyncErrorBoundary",
    defineAsyncComponent({
      // @ts-ignore - Komponenten-Import ohne Typdeklaration
      loader: () => import("./components/common/ErrorBoundary.vue"),
      delay: 100,
      timeout: 3000,
      errorComponent: {
        template:
          '<div class="error-fallback">Fehler beim Laden der Komponente</div>',
      },
      // Optimierung: Vorausladendes Laden
      onError(_error: unknown, retry, fail, attempts) {
        if (attempts <= 3) {
          // Automatische Wiederholung bei Netzwerkfehlern
          retry();
        } else {
          fail();
        }
      },
    }),
  );

  // Netzwerkbedingungen überwachen für adaptive Ladestrategien
  const networkMonitor = setupNetworkMonitoring();

  // Kritische UI-Komponenten früh registrieren mit optimierten Ladestrategien
  app.component(
    "Toast",
    dynamicImport("components/ui/Toast.vue", {
      // Höchste Priorität, da diese Komponente für System-Feedback kritisch ist
      priority: "critical",
      chunkName: "ui-critical",
      preload: true,
      loadingDelay: 0, // Keine Verzögerung für kritische UI-Komponenten
    }),
  );

  app.component(
    "LoadingOverlay",
    dynamicImport("components/ui/LoadingOverlay.vue", {
      priority: "critical",
      chunkName: "ui-critical",
      preload: true,
      loadingDelay: 0,
    }),
  );

  app.component(
    "AsyncErrorBoundary",
    dynamicImport("components/common/ErrorBoundary.vue", {
      priority: "high",
      chunkName: "ui-critical",
      loadingDelay: 50,
      onError: (
        error: Error,
        retry: () => void,
        fail: () => void,
        attempts: number,
      ) => {
        if (attempts <= 3) {
          // Automatische Wiederholung bei Netzwerkfehlern
          retry();
        } else {
          console.error("Fehler beim Laden der ErrorBoundary:", error);
          fail();
        }
      },
    }),
  );

  // Optimierte progressive Komponenten-Registration
  const registerDeferredComponents = () => {
    // Komponenten in priorisierte Gruppen einteilen

    // Gruppe 1: Kritische UI-Basiskomponenten (sofort laden)
    const criticalUIComponents = [
      { path: "components/ui/base/Button.vue", name: "UiButton" },
      { path: "components/ui/base/Input.vue", name: "UiInput" },
    ];

    // Für jede kritische Komponente registrieren
    criticalUIComponents.forEach(({ path, name }) => {
      app.component(
        name,
        dynamicImport(path, {
          priority: "high",
          chunkName: "ui-base",
          preload: true,
        }),
      );
    });

    // Gruppe 2: Wichtige, aber nicht kritische Komponenten (leicht verzögert laden)
    setTimeout(() => {
      const importantComponents = [
        { path: "components/ui/base/Modal.vue", name: "UiModal" },
        { path: "components/ui/base/Card.vue", name: "UiCard" },
      ];

      importantComponents.forEach(({ path, name }) => {
        app.component(
          name,
          dynamicImport(path, {
            priority: "medium",
            chunkName: "ui-important",
            preload: networkMonitor.shouldPreload(),
          }),
        );
      });
    }, 500);

    // Gruppe 3: Sekundäre UI-Komponenten (verzögert laden)
    setTimeout(() => {
      const secondaryComponents = [
        { path: "components/ui/base/Tabs.vue", name: "UiTabs" },
        { path: "components/ui/base/Select.vue", name: "UiSelect" },
        { path: "components/ui/base/Checkbox.vue", name: "UiCheckbox" },
      ];

      secondaryComponents.forEach(({ path, name }) => {
        app.component(
          name,
          dynamicImport(path, {
            priority: "medium",
            chunkName: "ui-secondary",
            preload: false,
            delayLoad: 100,
          }),
        );
      });
    }, 1000);

    // Gruppe 4: Nicht-kritische ergänzende Komponenten (stark verzögert laden)
    // Wird nur geladen, wenn Netzwerkbedingungen gut sind
    if (networkMonitor.shouldPreload()) {
      setTimeout(() => {
        const supplementaryComponents = [
          { path: "components/ui/base/Badge.vue", name: "UiBadge" },
          { path: "components/ui/base/Alert.vue", name: "UiAlert" },
          { path: "components/ui/base/ProgressBar.vue", name: "UiProgressBar" },
          { path: "components/ui/data/Tag.vue", name: "UiTag" },
        ];

        // Vorausladen ohne explizite Registrierung - werden bei Bedarf dynamisch geladen
        preloadComponentGroup(
          supplementaryComponents.map(({ path }) => path),
          {
            priority: "low",
            chunkName: "ui-supplementary",
            preload: true,
            delayLoad: 2000,
          },
        );
      }, 2000);
    }
  };

  try {
    // Stores initialisieren
    await initializeStores();
    console.log("Stores erfolgreich initialisiert");

    // Verzögert nicht-kritische Komponenten registrieren
    registerDeferredComponents();
  } catch (error) {
    console.error("Fehler bei der Store-Initialisierung:", error);
    // Trotz Fehler bei nicht-kritischen Stores fortfahren
  }

  // Leistungsoptimierung: Vorausladen häufig verwendeter Komponenten-Chunks
  // nach erfolgreicher App-Initialisierung mit adaptiven Ladestrategien
  const preloadCommonComponents = () => {
    // Nur vorausladen, wenn Netzwerkbedingungen gut sind
    if (!networkMonitor.shouldPreload()) {
      return; // Keine unnötigen Anfragen bei schlechter Verbindung
    }

    // Authentifizierungsstatus prüfen - korrekter Zugriff auf Pinia Store
    // Korrigierter Zugriff auf pinia.state statt pinia._state
    const authStore = pinia.state.value?.auth;
    const isAuthenticated = authStore?.isAuthenticated;

    // Priorisierte Komponenten-Ladung basierend auf Benutzerrolle
    if (isAuthenticated) {
      const isAdmin = authStore?.isAdmin;

      // Core-Komponenten, die für alle authentifizierten Benutzer wichtig sind
      setTimeout(() => {
        preloadComponentGroup(
          [
            "components/chat/MessageItem.vue",
            "components/chat/MessageList.vue",
            "components/session/SessionList.vue",
          ],
          {
            chunkName: "feature-chat",
            priority: "high",
            preload: true,
          },
        );
      }, 1000);

      // Rollenbasierte Komponenten-Vorab-Ladung
      if (isAdmin) {
        setTimeout(() => {
          preloadComponentGroup(
            [
              "components/admin/AdminPanel.vue",
              "components/admin/tabs/AdminDashboard.vue",
            ],
            {
              chunkName: "feature-admin",
              priority: "medium",
              preload: true,
              delayLoad: 1000, // Verzögerung, um die Hauptkomponenten priorisieren
            },
          );
        }, 2000);
      } else {
        // Für normale Benutzer: Dokumentenkonverter-Komponenten
        setTimeout(() => {
          preloadComponentGroup(
            ["components/admin/document-converter/DocConverterContainer.vue"],
            {
              chunkName: "feature-docs",
              priority: "low",
              preload: true,
              delayLoad: 2000,
            },
          );
        }, 3000);
      }

      // Leistungsintensive Komponenten vorausladen, mit niedriger Priorität
      setTimeout(() => {
        // Verwende den Pfad direkt, ohne die Komponente zu registrieren
        if (isAdmin) {
          preloadComponentGroup(
            ["components/chat/enhanced/VirtualMessageList.vue"],
            {
              chunkName: "feature-chat-enhanced",
              priority: "low",
              preload: true,
              delayLoad: 3000,
            },
          );
        }
      }, 5000);
    }
  };

  // Mount App
  app.mount("#app");

  // Nach dem Mounting vorausladende Komponenten laden
  preloadCommonComponents();
};

// Anwendung starten
initApp().catch((error) => {
  console.error("Kritischer Fehler beim Anwendungsstart:", error);

  // Fallback für kritische Fehler
  const errorElement = document.createElement("div");
  errorElement.className = "critical-error";
  errorElement.innerHTML = `
    <h1>Anwendungsfehler</h1>
    <p>Die Anwendung konnte nicht gestartet werden. Bitte versuchen Sie es später erneut.</p>
    <button onclick="window.location.reload()">Neu laden</button>
  `;

  document.body.innerHTML = "";
  document.body.appendChild(errorElement);
});
