<template>
  <div class="privacy-settings">
    <h3 class="privacy-settings__title">
      {{ t("settings.privacy.title", "Datenschutzeinstellungen") }}
    </h3>

    <div class="privacy-settings__section">
      <h4 class="privacy-settings__subtitle">
        {{ t("settings.privacy.dataSaving", "Datenspeicherung") }}
      </h4>

      <div class="privacy-settings__option">
        <div class="privacy-settings__toggle-container">
          <label class="privacy-settings__toggle-label">
            {{ t("settings.privacy.saveChats", "Chat-Verläufe speichern") }}
          </label>
          <div class="privacy-settings__toggle">
            <input
              type="checkbox"
              id="privacy-save-chats"
              v-model="privacySettings.saveChats"
              @change="updateSettings"
            />
            <label for="privacy-save-chats" class="toggle-switch">
              <span class="toggle-switch__slider"></span>
            </label>
          </div>
        </div>

        <p class="privacy-settings__description">
          {{
            t(
              "settings.privacy.saveChatsDescription",
              "Speichert Chat-Verläufe lokal, damit Sie später darauf zugreifen können.",
            )
          }}
        </p>
      </div>

      <div class="privacy-settings__option">
        <div class="privacy-settings__toggle-container">
          <label class="privacy-settings__toggle-label">
            {{ t("settings.privacy.saveSettings", "Einstellungen speichern") }}
          </label>
          <div class="privacy-settings__toggle">
            <input
              type="checkbox"
              id="privacy-save-settings"
              v-model="privacySettings.saveSettings"
              @change="updateSettings"
            />
            <label for="privacy-save-settings" class="toggle-switch">
              <span class="toggle-switch__slider"></span>
            </label>
          </div>
        </div>

        <p class="privacy-settings__description">
          {{
            t(
              "settings.privacy.saveSettingsDescription",
              "Speichert Ihre Benutzereinstellungen für zukünftige Besuche.",
            )
          }}
        </p>
      </div>
    </div>

    <div class="privacy-settings__section">
      <h4 class="privacy-settings__subtitle">
        {{ t("settings.privacy.analytics", "Datenerfassung und Analyse") }}
      </h4>

      <div class="privacy-settings__option">
        <div class="privacy-settings__toggle-container">
          <label class="privacy-settings__toggle-label">
            {{
              t(
                "settings.privacy.allowAnalytics",
                "Anonyme Nutzungsstatistiken",
              )
            }}
          </label>
          <div class="privacy-settings__toggle">
            <input
              type="checkbox"
              id="privacy-allow-analytics"
              v-model="privacySettings.allowAnalytics"
              @change="updateSettings"
            />
            <label for="privacy-allow-analytics" class="toggle-switch">
              <span class="toggle-switch__slider"></span>
            </label>
          </div>
        </div>

        <p class="privacy-settings__description">
          {{
            t(
              "settings.privacy.allowAnalyticsDescription",
              "Hilft uns, die Anwendung zu verbessern, indem anonyme Nutzungsdaten gesammelt werden.",
            )
          }}
        </p>
      </div>

      <div class="privacy-settings__option">
        <div class="privacy-settings__toggle-container">
          <label class="privacy-settings__toggle-label">
            {{
              t(
                "settings.privacy.allowErrorReporting",
                "Automatische Fehlerberichte",
              )
            }}
          </label>
          <div class="privacy-settings__toggle">
            <input
              type="checkbox"
              id="privacy-allow-error-reporting"
              v-model="privacySettings.allowErrorReporting"
              @change="updateSettings"
            />
            <label for="privacy-allow-error-reporting" class="toggle-switch">
              <span class="toggle-switch__slider"></span>
            </label>
          </div>
        </div>

        <p class="privacy-settings__description">
          {{
            t(
              "settings.privacy.allowErrorReportingDescription",
              "Sendet automatisch Fehlerberichte, um bei der Behebung von Problemen zu helfen.",
            )
          }}
        </p>
      </div>
    </div>

    <div class="privacy-settings__section">
      <h4 class="privacy-settings__subtitle">
        {{ t("settings.privacy.cookies", "Cookies und lokale Speicherung") }}
      </h4>

      <div class="privacy-settings__option">
        <div class="privacy-settings__toggle-container">
          <label class="privacy-settings__toggle-label">
            {{ t("settings.privacy.acceptCookies", "Cookies akzeptieren") }}
          </label>
          <div class="privacy-settings__toggle">
            <input
              type="checkbox"
              id="privacy-accept-cookies"
              v-model="privacySettings.acceptCookies"
              @change="updateSettings"
            />
            <label for="privacy-accept-cookies" class="toggle-switch">
              <span class="toggle-switch__slider"></span>
            </label>
          </div>
        </div>

        <p class="privacy-settings__description">
          {{
            t(
              "settings.privacy.acceptCookiesDescription",
              "Erlaubt die Verwendung von Cookies für Anmeldeinformationen und Einstellungen.",
            )
          }}
        </p>
      </div>
    </div>

    <div class="privacy-settings__section">
      <h4 class="privacy-settings__subtitle">
        {{ t("settings.privacy.dataManagement", "Datenverwaltung") }}
      </h4>

      <div class="privacy-settings__actions">
        <button
          class="privacy-settings__action-button"
          @click="handleClearHistory"
        >
          <i class="fas fa-trash-alt"></i>
          {{ t("settings.privacy.clearHistory", "Chat-Verlauf löschen") }}
        </button>

        <button
          class="privacy-settings__action-button"
          @click="handleExportData"
        >
          <i class="fas fa-file-export"></i>
          {{ t("settings.privacy.exportData", "Daten exportieren") }}
        </button>

        <button
          class="privacy-settings__action-button privacy-settings__action-button--danger"
          @click="handleRemoveAllData"
        >
          <i class="fas fa-exclamation-triangle"></i>
          {{ t("settings.privacy.removeAllData", "Alle Daten entfernen") }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, onMounted, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useToast } from "@/composables/useToast";
import { useDialog } from "@/composables/useDialog";

// Interface für Privacy-Einstellungen
// Hinweis: Diese sollten idealerweise in types/settings.ts definiert werden
interface PrivacySettings {
  saveChats: boolean;
  saveSettings: boolean;
  allowAnalytics: boolean;
  allowErrorReporting: boolean;
  acceptCookies: boolean;
}

// Emits
const emit = defineEmits<{
  (
    e: "apply-settings",
    category: string,
    settings: Partial<PrivacySettings>,
  ): void;
  (e: "reset"): void;
}>();

// Services
const { t } = useI18n();
const { showToast } = useToast();
const { showConfirmDialog } = useDialog();

// Status der Privacy-Einstellungen
// Default-Werte, die später vom Server oder localStore überschrieben werden
const privacySettings = reactive<PrivacySettings>({
  saveChats: true,
  saveSettings: true,
  allowAnalytics: false,
  allowErrorReporting: true,
  acceptCookies: true,
});

// Initialisieren der Einstellungen aus dem localStorage oder andere Quelle
function initSettings() {
  try {
    const savedSettings = localStorage.getItem("privacy-settings");
    if (savedSettings) {
      const parsedSettings = JSON.parse(savedSettings);
      Object.assign(privacySettings, parsedSettings);
    }
  } catch (error) {
    console.error("Fehler beim Laden der Datenschutzeinstellungen:", error);
  }
}

// Einstellungen aktualisieren
function updateSettings() {
  try {
    localStorage.setItem("privacy-settings", JSON.stringify(privacySettings));
    emit("apply-settings", "privacy", { ...privacySettings });

    // Cookie-Settings anwenden
    if (!privacySettings.acceptCookies) {
      showToast({
        type: "info",
        title: t("settings.privacy.cookiesDisabled", "Cookies deaktiviert"),
        message: t(
          "settings.privacy.cookiesDisabledMessage",
          "Die Änderungen werden nach dem Neuladen der Seite wirksam.",
        ),
      });
    }

    // Analytics-Einstellungen anwenden
    applyAnalyticsSettings();
  } catch (error) {
    console.error("Fehler beim Speichern der Datenschutzeinstellungen:", error);
  }
}

// Analytics-Einstellungen anwenden
function applyAnalyticsSettings() {
  if (typeof window !== "undefined") {
    // Analytics-Tracking aktivieren/deaktivieren (Beispielcode)
    if (!privacySettings.allowAnalytics) {
      // Analytics deaktivieren (z.B. Google Analytics opt-out)
      window["ga-disable-UA-XXXXX-Y"] = true;

      // Lokalen Analytics-Storage löschen
      try {
        localStorage.removeItem("analytics-consent");
        localStorage.removeItem("analytics-id");
      } catch (error) {
        console.error("Fehler beim Löschen der Analytics-Daten:", error);
      }
    } else {
      // Analytics aktivieren
      window["ga-disable-UA-XXXXX-Y"] = false;
      localStorage.setItem("analytics-consent", "true");
    }
  }
}

// Chat-Verlauf löschen
async function handleClearHistory() {
  const confirmed = await showConfirmDialog({
    title: t(
      "settings.privacy.clearHistoryConfirmTitle",
      "Chat-Verlauf löschen",
    ),
    message: t(
      "settings.privacy.clearHistoryConfirmMessage",
      "Möchten Sie wirklich Ihren gesamten Chat-Verlauf löschen? Diese Aktion kann nicht rückgängig gemacht werden.",
    ),
    confirmText: t("settings.privacy.delete", "Löschen"),
    cancelText: t("settings.privacy.cancel", "Abbrechen"),
  });

  if (confirmed) {
    try {
      // Lokalen Chat-Verlauf löschen
      localStorage.removeItem("chat-history");

      // IndexedDB löschen, falls verwendet
      const DBDeleteRequest = indexedDB.deleteDatabase("chat-store");

      DBDeleteRequest.onsuccess = function () {
        showToast({
          type: "success",
          title: t("settings.privacy.clearHistorySuccess", "Erfolg"),
          message: t(
            "settings.privacy.clearHistorySuccessMessage",
            "Ihr Chat-Verlauf wurde erfolgreich gelöscht.",
          ),
        });
      };

      DBDeleteRequest.onerror = function () {
        throw new Error("Fehler beim Löschen der Datenbank");
      };
    } catch (error) {
      console.error("Fehler beim Löschen des Chat-Verlaufs:", error);

      showToast({
        type: "error",
        title: t("settings.privacy.clearHistoryError", "Fehler"),
        message: t(
          "settings.privacy.clearHistoryErrorMessage",
          "Beim Löschen des Chat-Verlaufs ist ein Fehler aufgetreten.",
        ),
      });
    }
  }
}

// Daten exportieren
function handleExportData() {
  try {
    const exportData = {
      timestamp: new Date().toISOString(),
      settings: {
        privacy: { ...privacySettings },
        // Hier weitere Einstellungen hinzufügen
      },
      // Chat-History aus localStorage oder IndexedDB extrahieren
      chatHistory: localStorage.getItem("chat-history")
        ? JSON.parse(localStorage.getItem("chat-history") || "[]")
        : [],
    };

    // Daten als JSON-Datei zum Download anbieten
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataUri =
      "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);

    const exportFileName = `nscale-dms-data-export-${new Date().toISOString().slice(0, 10)}.json`;

    const linkElement = document.createElement("a");
    linkElement.setAttribute("href", dataUri);
    linkElement.setAttribute("download", exportFileName);
    linkElement.click();

    showToast({
      type: "success",
      title: t("settings.privacy.exportSuccess", "Export erfolgreich"),
      message: t(
        "settings.privacy.exportSuccessMessage",
        "Ihre Daten wurden erfolgreich exportiert.",
      ),
    });
  } catch (error) {
    console.error("Fehler beim Exportieren der Daten:", error);

    showToast({
      type: "error",
      title: t("settings.privacy.exportError", "Export fehlgeschlagen"),
      message: t(
        "settings.privacy.exportErrorMessage",
        "Beim Exportieren Ihrer Daten ist ein Fehler aufgetreten.",
      ),
    });
  }
}

// Alle Daten entfernen
async function handleRemoveAllData() {
  const confirmed = await showConfirmDialog({
    title: t(
      "settings.privacy.removeAllDataConfirmTitle",
      "Alle Daten entfernen",
    ),
    message: t(
      "settings.privacy.removeAllDataConfirmMessage",
      "Möchten Sie wirklich alle Ihre Daten entfernen? Diese Aktion kann nicht rückgängig gemacht werden und Sie werden automatisch abgemeldet.",
    ),
    confirmText: t("settings.privacy.delete", "Löschen"),
    cancelText: t("settings.privacy.cancel", "Abbrechen"),
    dangerMode: true,
  });

  if (confirmed) {
    try {
      // localStorage löschen
      localStorage.clear();

      // IndexedDB-Datenbanken auflisten und löschen
      const databases = await indexedDB.databases();

      for (const database of databases) {
        if (database.name) {
          await new Promise<void>((resolve, reject) => {
            const request = indexedDB.deleteDatabase(database.name!);
            request.onsuccess = () => resolve();
            request.onerror = () =>
              reject(
                new Error(`Fehler beim Löschen der Datenbank ${database.name}`),
              );
          });
        }
      }

      // Cookies löschen
      const cookies = document.cookie.split(";");
      for (const cookie of cookies) {
        const eqPos = cookie.indexOf("=");
        const name =
          eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
      }

      showToast({
        type: "success",
        title: t("settings.privacy.removeAllDataSuccess", "Daten gelöscht"),
        message: t(
          "settings.privacy.removeAllDataSuccessMessage",
          "Alle Ihre Daten wurden erfolgreich gelöscht. Sie werden in Kürze abgemeldet.",
        ),
      });

      // Kurze Verzögerung, damit der Toast angezeigt werden kann, bevor die Seite neu geladen wird
      setTimeout(() => {
        window.location.href = "/logout";
      }, 3000);
    } catch (error) {
      console.error("Fehler beim Entfernen aller Daten:", error);

      showToast({
        type: "error",
        title: t("settings.privacy.removeAllDataError", "Fehler"),
        message: t(
          "settings.privacy.removeAllDataErrorMessage",
          "Beim Entfernen Ihrer Daten ist ein Fehler aufgetreten.",
        ),
      });
    }
  }
}

// Lifecycle Hooks
onMounted(() => {
  initSettings();
});
</script>

<style scoped>
.privacy-settings {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.privacy-settings__title {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0 0 1rem 0;
  color: var(--n-color-text-primary);
}

.privacy-settings__section {
  background-color: var(--n-color-background-alt);
  border-radius: var(--n-border-radius);
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.privacy-settings__subtitle {
  font-size: 1rem;
  font-weight: 600;
  margin: 0 0 0.5rem 0;
  color: var(--n-color-text-primary);
}

.privacy-settings__option {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.privacy-settings__toggle-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.privacy-settings__toggle-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--n-color-text-primary);
}

.privacy-settings__description {
  font-size: 0.75rem;
  color: var(--n-color-text-secondary);
  margin: 0;
  line-height: 1.5;
}

/* Toggle Switch Styles */
.privacy-settings__toggle {
  position: relative;
}

.privacy-settings__toggle input {
  opacity: 0;
  width: 0;
  height: 0;
  position: absolute;
}

.toggle-switch {
  display: inline-block;
  width: 42px;
  height: 24px;
  position: relative;
  cursor: pointer;
}

.toggle-switch__slider {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--n-color-border);
  border-radius: 24px;
  transition: 0.3s;
}

.toggle-switch__slider::before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  border-radius: 50%;
  transition: 0.3s;
}

input:checked + .toggle-switch .toggle-switch__slider {
  background-color: var(--n-color-primary);
}

input:checked + .toggle-switch .toggle-switch__slider::before {
  transform: translateX(18px);
}

/* Data Management Actions */
.privacy-settings__actions {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.privacy-settings__action-button {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border-radius: var(--n-border-radius);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
  background-color: var(--n-color-background);
  color: var(--n-color-text-primary);
  border: 1px solid var(--n-color-border);
  width: 100%;
}

.privacy-settings__action-button:hover {
  background-color: var(--n-color-hover);
}

.privacy-settings__action-button--danger {
  color: var(--n-color-error);
  border-color: var(--n-color-error);
}

.privacy-settings__action-button--danger:hover {
  background-color: var(--n-color-error-background);
}

/* Responsive Anpassungen */
@media (max-width: 480px) {
  .privacy-settings__toggle-container {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .privacy-settings__toggle {
    align-self: flex-start;
  }
}
</style>
