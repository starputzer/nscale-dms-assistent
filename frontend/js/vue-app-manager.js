/**
 * Vue-App-Manager
 * Diese Datei dient zur zentralen Verwaltung der Vue-App-Instanzen, um Mehrfachinstanziierung zu verhindern.
 *
 * HINWEIS: Wenn Sie dieses Modul direkt testen möchten, können Sie sich einloggen mit:
 *   window.devLogin("martin@danglefeet.com", "123")
 *
 * Der Login-Endpunkt ist: /api/auth/login (wichtig!)
 */

// Tracker für bereits initialisierte Vue-Instanzen und ihre Mount-Punkte
const vueInstances = new Map();

// Flag zur Vermeidung paralleler Initialisierungen
let initializationInProgress = false;

/**
 * Registriert eine Vue-App-Instanz unter dem angegebenen Mount-Punkt-Selektor
 * @param {string} mountSelector - Der CSS-Selektor des Mount-Punkts (z.B. "#app")
 * @param {object} appInstance - Die Vue-App-Instanz
 * @returns {boolean} - True, wenn die Registrierung erfolgreich war
 */
export function registerVueApp(mountSelector, appInstance) {
  if (vueInstances.has(mountSelector)) {
    console.warn(
      `Es existiert bereits eine Vue-App unter dem Selektor: ${mountSelector}. Überspringe Registrierung.`,
    );
    return false;
  }

  vueInstances.set(mountSelector, appInstance);
  console.log(`Vue-App erfolgreich registriert unter: ${mountSelector}`);
  return true;
}

/**
 * Überprüft, ob bereits eine Vue-App unter dem angegebenen Selektor initialisiert wurde
 * @param {string} mountSelector - Der CSS-Selektor des Mount-Punkts (z.B. "#app")
 * @returns {boolean} - True, wenn bereits eine App existiert
 */
export function hasVueApp(mountSelector) {
  return vueInstances.has(mountSelector);
}

/**
 * Sicherer Wrapper für die Initialisierung von Vue-Apps
 * @param {string} mountSelector - Der CSS-Selektor des Mount-Punkts
 * @param {Function} initFunction - Die Initialisierungsfunktion, die die App erstellt und mountet
 * @returns {Promise<object|null>} - Die Vue-App-Instanz oder null bei Fehler
 */
export async function safeInitialize(mountSelector, initFunction) {
  // Prüfen, ob bereits eine Initialisierung läuft
  if (initializationInProgress) {
    console.warn(
      "Eine andere Vue-App-Initialisierung ist bereits im Gange. Bitte warten...",
    );

    // Warte und versuche es erneut
    return new Promise((resolve) => {
      setTimeout(async () => {
        resolve(await safeInitialize(mountSelector, initFunction));
      }, 100);
    });
  }

  // Prüfen, ob bereits eine App unter diesem Selektor existiert
  if (hasVueApp(mountSelector)) {
    console.warn(
      `Vue-App für ${mountSelector} wurde bereits initialisiert. Überspringe doppelte Initialisierung.`,
    );
    return vueInstances.get(mountSelector);
  }

  try {
    initializationInProgress = true;

    // Mount-Element prüfen
    const mountElement = document.querySelector(mountSelector);
    if (!mountElement) {
      console.error(
        `Mount-Element ${mountSelector} wurde nicht gefunden. App kann nicht initialisiert werden.`,
      );
      return null;
    }

    // Prüfen, ob das Element bereits Inhalte hat (könnte auf eine bereits gemountete App hindeuten)
    if (mountElement.hasChildNodes() && mountElement.children.length > 0) {
      console.warn(
        `Element ${mountSelector} hat bereits Kindelemente. Möglicherweise wurde hier bereits eine App gemountet.`,
      );

      // Überprüfen, ob es wirklich eine Vue-App ist, indem wir nach bekannten Vue-Attributen suchen
      const hasVueAttrs = Array.from(mountElement.children).some((child) => {
        return (
          child.hasAttribute("data-v-app") ||
          child.className.includes("v-") ||
          child.hasAttribute("data-v-")
        );
      });

      if (hasVueAttrs) {
        console.error(
          `Element ${mountSelector} enthält bereits eine Vue-App. Vermeide das Mounting mehrerer Apps am selben Element!`,
        );
        return null;
      }
    }

    // App initialisieren
    console.log(`Initialisiere Vue-App für ${mountSelector}...`);
    const appInstance = await initFunction(mountSelector);

    if (appInstance) {
      // App registrieren
      registerVueApp(mountSelector, appInstance);
      console.log(`Vue-App für ${mountSelector} erfolgreich initialisiert.`);
      return appInstance;
    } else {
      console.error(
        `Fehler beim Initialisieren der Vue-App für ${mountSelector}.`,
      );
      return null;
    }
  } catch (error) {
    console.error(
      `Kritischer Fehler bei der App-Initialisierung für ${mountSelector}:`,
      error,
    );
    return null;
  } finally {
    initializationInProgress = false;
  }
}

/**
 * Beendet eine Vue-App sauber und entfernt sie aus der Registrierung
 * @param {string} mountSelector - Der CSS-Selektor des Mount-Punkts
 * @returns {boolean} - True, wenn die App erfolgreich beendet wurde
 */
export function unmountVueApp(mountSelector) {
  if (!hasVueApp(mountSelector)) {
    console.warn(
      `Keine Vue-App unter ${mountSelector} registriert. Nichts zu beenden.`,
    );
    return false;
  }

  try {
    const app = vueInstances.get(mountSelector);
    if (app && typeof app.unmount === "function") {
      app.unmount();
      vueInstances.delete(mountSelector);
      console.log(
        `Vue-App unter ${mountSelector} erfolgreich beendet und entfernt.`,
      );
      return true;
    } else {
      console.error(`Ungültige Vue-App-Instanz unter ${mountSelector}.`);
      vueInstances.delete(mountSelector);
      return false;
    }
  } catch (error) {
    console.error(
      `Fehler beim Beenden der Vue-App unter ${mountSelector}:`,
      error,
    );
    return false;
  }
}

// Globales Objekt für einfacheren Zugriff
window.VueAppManager = {
  safeInitialize,
  hasVueApp,
  unmountVueApp,
};

export default {
  safeInitialize,
  hasVueApp,
  registerVueApp,
  unmountVueApp,
};
