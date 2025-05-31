<template>
  <div class="admin-system-settings">
    <h2 class="admin-system-settings__title">
      {{ t("admin.systemSettings.title", "Systemeinstellungen") }}
    </h2>
    <p class="admin-system-settings__description">
      {{
        t(
          "admin.systemSettings.description",
          "Verwalten und konfigurieren Sie die Systemeinstellungen.",
        )
      }}
    </p>

    <div v-if="isLoading" class="admin-system-settings__loading">
      <i
        class="fas fa-spinner fa-spin admin-system-settings__loading-icon"
        aria-hidden="true"
      ></i>
      <p>
        {{
          t("admin.systemSettings.loading", "Einstellungen werden geladen...")
        }}
      </p>
    </div>

    <template v-else>
      <!-- Warnung bei ungespeicherten Änderungen -->
      <div
        v-if="hasUnsavedChanges"
        class="admin-system-settings__unsaved-warning"
      >
        <i class="fas fa-exclamation-triangle" aria-hidden="true"></i>
        <p>
          {{
            t(
              "admin.systemSettings.unsavedChanges",
              "Es gibt ungespeicherte Änderungen.",
            )
          }}
        </p>
        <div class="admin-system-settings__unsaved-actions">
          <button
            @click="resetChanges"
            class="admin-system-settings__unsaved-button admin-system-settings__unsaved-button--cancel"
          >
            {{ t("admin.systemSettings.resetChanges", "Änderungen verwerfen") }}
          </button>
          <button
            @click="saveSettings"
            class="admin-system-settings__unsaved-button admin-system-settings__unsaved-button--save"
          >
            {{ t("admin.systemSettings.saveChanges", "Änderungen speichern") }}
          </button>
        </div>
      </div>

      <!-- Kategorien zur Auswahl -->
      <div class="admin-system-settings__categories">
        <button
          v-for="category in settingsStore.systemSettingsCategories"
          :key="category.id"
          class="admin-system-settings__category-button"
          :class="{
            'admin-system-settings__category-button--active':
              activeCategory === category.id,
          }"
          @click="activeCategory = category.id"
        >
          <i :class="['fas', category.icon]" aria-hidden="true"></i>
          <span>{{ category.label }}</span>
        </button>
      </div>

      <!-- Einstellungen je nach ausgewählter Kategorie -->
      <div class="admin-system-settings__content">
        <h3 class="admin-system-settings__category-title">
          {{ activeCategoryLabel }}
        </h3>
        <p class="admin-system-settings__category-description">
          {{ activeCategoryDescription }}
        </p>

        <!-- Allgemeine Einstellungen -->
        <div
          v-if="activeCategory === 'general'"
          class="admin-system-settings__section"
        >
          <div class="admin-system-settings__form-group">
            <label for="app-name" class="admin-system-settings__label">{{
              t("admin.systemSettings.general.appName", "Anwendungsname")
            }}</label>
            <input
              id="app-name"
              v-model="settings.appName"
              type="text"
              class="admin-system-settings__input"
            />
          </div>

          <div class="admin-system-settings__form-group">
            <label for="app-version" class="admin-system-settings__label">{{
              t("admin.systemSettings.general.appVersion", "Version")
            }}</label>
            <input
              id="app-version"
              v-model="settings.appVersion"
              type="text"
              class="admin-system-settings__input"
              disabled
            />
            <small class="admin-system-settings__help-text">{{
              t(
                "admin.systemSettings.general.versionHelp",
                "Die Version kann nicht bearbeitet werden.",
              )
            }}</small>
          </div>
        </div>

        <!-- KI-Modelle -->
        <div
          v-if="activeCategory === 'models'"
          class="admin-system-settings__section"
        >
          <div class="admin-system-settings__form-group">
            <label for="default-model" class="admin-system-settings__label">{{
              t("admin.systemSettings.models.defaultModel", "Standardmodell")
            }}</label>
            <select
              id="default-model"
              v-model="settings.defaultModel"
              class="admin-system-settings__select"
            >
              <option
                v-for="model in settings.availableModels"
                :key="model"
                :value="model"
              >
                {{ model }}
              </option>
            </select>
          </div>

          <div class="admin-system-settings__form-group">
            <label for="max-tokens" class="admin-system-settings__label">{{
              t(
                "admin.systemSettings.models.maxTokens",
                "Max. Tokens pro Anfrage",
              )
            }}</label>
            <input
              id="max-tokens"
              v-model.number="settings.maxTokensPerRequest"
              type="number"
              min="1"
              max="32768"
              class="admin-system-settings__input"
            />
          </div>

          <div class="admin-system-settings__form-group">
            <label for="temperature" class="admin-system-settings__label">{{
              t("admin.systemSettings.models.temperature", "Temperatur")
            }}</label>
            <div class="admin-system-settings__range-container">
              <input
                id="temperature"
                v-model.number="settings.modelTemperature"
                type="range"
                min="0"
                max="1"
                step="0.1"
                class="admin-system-settings__range"
              />
              <span class="admin-system-settings__range-value">{{
                settings.modelTemperature.toFixed(1)
              }}</span>
            </div>
            <small class="admin-system-settings__help-text">{{
              t(
                "admin.systemSettings.models.temperatureHelp",
                "Höhere Werte führen zu zufälligeren Antworten.",
              )
            }}</small>
          </div>
        </div>

        <!-- Performance -->
        <div
          v-if="activeCategory === 'performance'"
          class="admin-system-settings__section"
        >
          <div class="admin-system-settings__form-group">
            <label for="max-concurrent" class="admin-system-settings__label">{{
              t(
                "admin.systemSettings.performance.maxConcurrent",
                "Max. gleichzeitige Anfragen",
              )
            }}</label>
            <input
              id="max-concurrent"
              v-model.number="settings.maxConcurrentRequests"
              type="number"
              min="1"
              max="20"
              class="admin-system-settings__input"
            />
          </div>

          <div class="admin-system-settings__form-group">
            <label for="max-queue" class="admin-system-settings__label">{{
              t(
                "admin.systemSettings.performance.maxQueue",
                "Max. Warteschlangengröße",
              )
            }}</label>
            <input
              id="max-queue"
              v-model.number="settings.maxQueueSize"
              type="number"
              min="1"
              max="100"
              class="admin-system-settings__input"
            />
          </div>

          <div class="admin-system-settings__form-group">
            <label for="req-timeout" class="admin-system-settings__label">{{
              t(
                "admin.systemSettings.performance.requestTimeout",
                "Anfrage-Timeout (ms)",
              )
            }}</label>
            <input
              id="req-timeout"
              v-model.number="settings.requestTimeout"
              type="number"
              min="1000"
              max="300000"
              step="1000"
              class="admin-system-settings__input"
            />
          </div>

          <div class="admin-system-settings__form-group">
            <div class="admin-system-settings__switch-container">
              <label for="req-retry" class="admin-system-settings__label">{{
                t(
                  "admin.systemSettings.performance.enableRetry",
                  "Wiederholungsversuche aktivieren",
                )
              }}</label>
              <label class="admin-system-settings__switch">
                <input
                  id="req-retry"
                  v-model="settings.enableRequestRetry"
                  type="checkbox"
                />
                <span class="admin-system-settings__switch-slider"></span>
              </label>
            </div>
          </div>

          <div
            v-if="settings.enableRequestRetry"
            class="admin-system-settings__form-group admin-system-settings__form-group--indent"
          >
            <label for="max-retries" class="admin-system-settings__label">{{
              t(
                "admin.systemSettings.performance.maxRetries",
                "Max. Wiederholungen",
              )
            }}</label>
            <input
              id="max-retries"
              v-model.number="settings.maxRetries"
              type="number"
              min="1"
              max="10"
              class="admin-system-settings__input"
            />
          </div>
        </div>

        <!-- Sicherheitseinstellungen -->
        <div
          v-if="activeCategory === 'security'"
          class="admin-system-settings__section"
        >
          <div class="admin-system-settings__form-group">
            <label for="session-timeout" class="admin-system-settings__label">{{
              t(
                "admin.systemSettings.security.sessionTimeout",
                "Sitzungs-Timeout (Minuten)",
              )
            }}</label>
            <input
              id="session-timeout"
              v-model.number="settings.sessionTimeout"
              type="number"
              min="5"
              max="1440"
              class="admin-system-settings__input"
            />
          </div>

          <div class="admin-system-settings__form-group">
            <label for="max-login" class="admin-system-settings__label">{{
              t(
                "admin.systemSettings.security.maxLoginAttempts",
                "Max. Anmeldeversuche",
              )
            }}</label>
            <input
              id="max-login"
              v-model.number="settings.maxLoginAttempts"
              type="number"
              min="1"
              max="10"
              class="admin-system-settings__input"
            />
          </div>

          <div class="admin-system-settings__form-group">
            <label for="pwd-change" class="admin-system-settings__label">{{
              t(
                "admin.systemSettings.security.passwordChange",
                "Passwortänderung erzwingen (Tage)",
              )
            }}</label>
            <input
              id="pwd-change"
              v-model.number="settings.requirePasswordChange"
              type="number"
              min="0"
              max="365"
              class="admin-system-settings__input"
            />
            <small class="admin-system-settings__help-text">{{
              t(
                "admin.systemSettings.security.passwordChangeHelp",
                "0 = nie erzwingen",
              )
            }}</small>
          </div>

          <div class="admin-system-settings__form-group">
            <label for="pwd-length" class="admin-system-settings__label">{{
              t(
                "admin.systemSettings.security.passwordLength",
                "Mindestlänge für Passwörter",
              )
            }}</label>
            <input
              id="pwd-length"
              v-model.number="settings.passwordMinLength"
              type="number"
              min="6"
              max="32"
              class="admin-system-settings__input"
            />
          </div>

          <div class="admin-system-settings__form-group">
            <div class="admin-system-settings__switch-container">
              <label for="pwd-special" class="admin-system-settings__label">{{
                t(
                  "admin.systemSettings.security.passwordSpecial",
                  "Sonderzeichen im Passwort erforderlich",
                )
              }}</label>
              <label class="admin-system-settings__switch">
                <input
                  id="pwd-special"
                  v-model="settings.passwordRequireSpecialChars"
                  type="checkbox"
                />
                <span class="admin-system-settings__switch-slider"></span>
              </label>
            </div>
          </div>
        </div>

        <!-- Metriken -->
        <div
          v-if="activeCategory === 'metrics'"
          class="admin-system-settings__section"
        >
          <div class="admin-system-settings__form-group">
            <div class="admin-system-settings__switch-container">
              <label
                for="collect-metrics"
                class="admin-system-settings__label"
                >{{
                  t(
                    "admin.systemSettings.metrics.collectMetrics",
                    "Nutzungsmetriken erfassen",
                  )
                }}</label
              >
              <label class="admin-system-settings__switch">
                <input
                  id="collect-metrics"
                  v-model="settings.collectUsageMetrics"
                  type="checkbox"
                />
                <span class="admin-system-settings__switch-slider"></span>
              </label>
            </div>
          </div>

          <div class="admin-system-settings__form-group">
            <div class="admin-system-settings__switch-container">
              <label
                for="collect-errors"
                class="admin-system-settings__label"
                >{{
                  t(
                    "admin.systemSettings.metrics.collectErrors",
                    "Fehlerberichte erfassen",
                  )
                }}</label
              >
              <label class="admin-system-settings__switch">
                <input
                  id="collect-errors"
                  v-model="settings.collectErrorReports"
                  type="checkbox"
                />
                <span class="admin-system-settings__switch-slider"></span>
              </label>
            </div>
          </div>

          <div class="admin-system-settings__form-group">
            <label
              for="metrics-retention"
              class="admin-system-settings__label"
              >{{
                t(
                  "admin.systemSettings.metrics.retention",
                  "Aufbewahrungsdauer (Tage)",
                )
              }}</label
            >
            <input
              id="metrics-retention"
              v-model.number="settings.metricsRetentionDays"
              type="number"
              min="1"
              max="365"
              class="admin-system-settings__input"
            />
          </div>
        </div>

        <!-- Wartung -->
        <div
          v-if="activeCategory === 'maintenance'"
          class="admin-system-settings__section"
        >
          <div class="admin-system-settings__form-group">
            <div class="admin-system-settings__switch-container">
              <label
                for="maintenance-mode"
                class="admin-system-settings__label"
                >{{
                  t(
                    "admin.systemSettings.maintenance.maintenanceMode",
                    "Wartungsmodus",
                  )
                }}</label
              >
              <label class="admin-system-settings__switch">
                <input
                  id="maintenance-mode"
                  v-model="settings.maintenanceMode"
                  type="checkbox"
                />
                <span class="admin-system-settings__switch-slider"></span>
              </label>
            </div>
            <small
              class="admin-system-settings__help-text admin-system-settings__help-text--warning"
              v-if="settings.maintenanceMode"
            >
              {{
                t(
                  "admin.systemSettings.maintenance.modeWarning",
                  "Das System ist im Wartungsmodus. Nur Administratoren haben Zugriff.",
                )
              }}
            </small>
          </div>

          <div
            v-if="settings.maintenanceMode"
            class="admin-system-settings__form-group admin-system-settings__form-group--indent"
          >
            <label
              for="maintenance-message"
              class="admin-system-settings__label"
              >{{
                t("admin.systemSettings.maintenance.message", "Wartungsmeldung")
              }}</label
            >
            <textarea
              id="maintenance-message"
              v-model="settings.maintenanceMessage"
              class="admin-system-settings__textarea"
              rows="3"
            ></textarea>
          </div>
        </div>

        <!-- Cache -->
        <div
          v-if="activeCategory === 'cache'"
          class="admin-system-settings__section"
        >
          <div class="admin-system-settings__form-group">
            <div class="admin-system-settings__switch-container">
              <label for="enable-cache" class="admin-system-settings__label">{{
                t("admin.systemSettings.cache.enableCache", "Cache aktivieren")
              }}</label>
              <label class="admin-system-settings__switch">
                <input
                  id="enable-cache"
                  v-model="settings.enableCache"
                  type="checkbox"
                />
                <span class="admin-system-settings__switch-slider"></span>
              </label>
            </div>
          </div>

          <div
            v-if="settings.enableCache"
            class="admin-system-settings__form-group admin-system-settings__form-group--indent"
          >
            <label for="cache-ttl" class="admin-system-settings__label">{{
              t(
                "admin.systemSettings.cache.cacheTtl",
                "Cache-Lebensdauer (Sekunden)",
              )
            }}</label>
            <input
              id="cache-ttl"
              v-model.number="settings.cacheTtl"
              type="number"
              min="60"
              max="2592000"
              class="admin-system-settings__input"
            />
          </div>

          <div
            v-if="settings.enableCache"
            class="admin-system-settings__form-group admin-system-settings__form-group--indent"
          >
            <label for="cache-size" class="admin-system-settings__label">{{
              t(
                "admin.systemSettings.cache.maxCacheSize",
                "Max. Cache-Größe (MB)",
              )
            }}</label>
            <input
              id="cache-size"
              v-model.number="settings.maxCacheSize"
              type="number"
              min="10"
              max="10000"
              class="admin-system-settings__input"
            />
          </div>

          <div class="admin-system-settings__form-group">
            <button
              @click="showClearCacheConfirm = true"
              class="admin-system-settings__button admin-system-settings__button--secondary"
            >
              <i class="fas fa-trash-alt" aria-hidden="true"></i>
              {{ t("admin.systemSettings.cache.clearCache", "Cache leeren") }}
            </button>
          </div>
        </div>

        <!-- Logging -->
        <div
          v-if="activeCategory === 'logging'"
          class="admin-system-settings__section"
        >
          <div class="admin-system-settings__form-group">
            <label for="log-level" class="admin-system-settings__label">{{
              t("admin.systemSettings.logging.logLevel", "Log-Level")
            }}</label>
            <select
              id="log-level"
              v-model="settings.logLevel"
              class="admin-system-settings__select"
            >
              <option value="debug">
                {{ t("admin.systemSettings.logging.levels.debug", "Debug") }}
              </option>
              <option value="info">
                {{ t("admin.systemSettings.logging.levels.info", "Info") }}
              </option>
              <option value="warn">
                {{ t("admin.systemSettings.logging.levels.warn", "Warnung") }}
              </option>
              <option value="error">
                {{ t("admin.systemSettings.logging.levels.error", "Fehler") }}
              </option>
            </select>
          </div>

          <div class="admin-system-settings__form-group">
            <label for="log-rotation" class="admin-system-settings__label">{{
              t("admin.systemSettings.logging.rotation", "Log-Rotation (Tage)")
            }}</label>
            <input
              id="log-rotation"
              v-model.number="settings.logRotation"
              type="number"
              min="1"
              max="365"
              class="admin-system-settings__input"
            />
          </div>

          <div class="admin-system-settings__form-group">
            <label for="log-size" class="admin-system-settings__label">{{
              t(
                "admin.systemSettings.logging.maxSize",
                "Max. Protokollgröße (MB)",
              )
            }}</label>
            <input
              id="log-size"
              v-model.number="settings.maxLogSize"
              type="number"
              min="1"
              max="1000"
              class="admin-system-settings__input"
            />
          </div>
        </div>
      </div>

      <!-- Aktionsbereich unten -->
      <div class="admin-system-settings__actions">
        <div class="admin-system-settings__actions-buttons">
          <button
            @click="showResetDefaultsConfirm = true"
            class="admin-system-settings__button admin-system-settings__button--danger"
            :disabled="isSubmitting"
          >
            <i class="fas fa-undo" aria-hidden="true"></i>
            {{
              t(
                "admin.systemSettings.actions.resetDefaults",
                "Standardeinstellungen",
              )
            }}
          </button>

          <div class="admin-system-settings__actions-right">
            <button
              @click="resetChanges"
              class="admin-system-settings__button admin-system-settings__button--cancel"
              :disabled="!hasUnsavedChanges || isSubmitting"
            >
              {{ t("admin.systemSettings.actions.cancel", "Abbrechen") }}
            </button>

            <button
              @click="saveSettings"
              class="admin-system-settings__button admin-system-settings__button--primary"
              :disabled="!hasUnsavedChanges || isSubmitting"
            >
              <i
                v-if="isSubmitting"
                class="fas fa-spinner fa-spin"
                aria-hidden="true"
              ></i>
              {{ t("admin.systemSettings.actions.save", "Speichern") }}
            </button>
          </div>
        </div>

        <div
          v-if="settingsStore.lastUpdated"
          class="admin-system-settings__last-updated"
        >
          {{ t("admin.systemSettings.lastUpdated", "Zuletzt aktualisiert") }}:
          {{ formatDate(settingsStore.lastUpdated) }}
        </div>
      </div>
    </template>

    <!-- Dialog: Cache leeren -->
    <dialog
      v-if="showClearCacheConfirm"
      class="admin-system-settings__dialog"
      open
    >
      <div class="admin-system-settings__dialog-content">
        <h3 class="admin-system-settings__dialog-title">
          {{
            t("admin.systemSettings.dialogs.clearCache.title", "Cache leeren")
          }}
        </h3>
        <p class="admin-system-settings__dialog-message">
          {{
            t(
              "admin.systemSettings.dialogs.clearCache.message",
              "Sind Sie sicher, dass Sie den gesamten Cache leeren möchten? Dies kann die Systemleistung vorübergehend beeinträchtigen.",
            )
          }}
        </p>
        <div class="admin-system-settings__dialog-actions">
          <button
            @click="showClearCacheConfirm = false"
            class="admin-system-settings__button admin-system-settings__button--cancel"
          >
            {{
              t("admin.systemSettings.dialogs.clearCache.cancel", "Abbrechen")
            }}
          </button>
          <button
            @click="clearCache"
            class="admin-system-settings__button admin-system-settings__button--danger"
          >
            {{
              t(
                "admin.systemSettings.dialogs.clearCache.confirm",
                "Cache leeren",
              )
            }}
          </button>
        </div>
      </div>
    </dialog>

    <!-- Dialog: Auf Standardeinstellungen zurücksetzen -->
    <dialog
      v-if="showResetDefaultsConfirm"
      class="admin-system-settings__dialog"
      open
    >
      <div class="admin-system-settings__dialog-content">
        <h3 class="admin-system-settings__dialog-title">
          {{
            t(
              "admin.systemSettings.dialogs.resetDefaults.title",
              "Standardeinstellungen wiederherstellen",
            )
          }}
        </h3>
        <p class="admin-system-settings__dialog-message">
          {{
            t(
              "admin.systemSettings.dialogs.resetDefaults.message",
              "Sind Sie sicher, dass Sie alle Einstellungen auf die Standardwerte zurücksetzen möchten? Diese Aktion kann nicht rückgängig gemacht werden.",
            )
          }}
        </p>
        <div class="admin-system-settings__dialog-actions">
          <button
            @click="showResetDefaultsConfirm = false"
            class="admin-system-settings__button admin-system-settings__button--cancel"
          >
            {{
              t(
                "admin.systemSettings.dialogs.resetDefaults.cancel",
                "Abbrechen",
              )
            }}
          </button>
          <button
            @click="resetToDefaults"
            class="admin-system-settings__button admin-system-settings__button--danger"
          >
            {{
              t(
                "admin.systemSettings.dialogs.resetDefaults.confirm",
                "Zurücksetzen",
              )
            }}
          </button>
        </div>
      </div>
    </dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted, watch } from "vue";
import { useToast } from "@/composables/useToast";
import { useAdminSettingsStore } from "@/stores/admin/settings";
import { useAdminSystemStore } from "@/stores/admin/system";
import type { SystemSettings } from "@/stores/admin/settings";
import { useI18n } from "vue-i18n";

// Use global $t from Vue instance
const { t } = useI18n();

// Stores
const settingsStore = useAdminSettingsStore();
const systemStore = useAdminSystemStore();

// Toast-Benachrichtigungen
const { showToast } = useToast();

// Lokaler Zustand
const isLoading = ref(false);
const isSubmitting = ref(false);
const activeCategory = ref("general");
const settings = reactive<SystemSettings>(settingsStore.settings);
const showClearCacheConfirm = ref(false);
const showResetDefaultsConfirm = ref(false);

// Computed Properties
const hasUnsavedChanges = computed(() => settingsStore.hasUnsavedChanges);

const activeCategoryLabel = computed(() => {
  const category = settingsStore.systemSettingsCategories.find(
    (cat) => cat.id === activeCategory.value,
  );
  return category ? category.label : "";
});

const activeCategoryDescription = computed(() => {
  const category = settingsStore.systemSettingsCategories.find(
    (cat) => cat.id === activeCategory.value,
  );
  return category ? category.description : "";
});

// Methoden
// Einstellungen laden
async function loadSettings() {
  isLoading.value = true;

  try {
    await settingsStore.fetchSettings();
    Object.assign(settings, settingsStore.settings);
  } catch (error) {
    console.error("Error loading settings:", error);
    showToast({
      type: "error",
      title: t("admin.systemSettings.toast.loadError", "Fehler"),
      message: t(
        "admin.systemSettings.toast.loadErrorMessage",
        "Die Einstellungen konnten nicht geladen werden.",
      ),
    });
  } finally {
    isLoading.value = false;
  }
}

// Änderungen zurücksetzen
function resetChanges() {
  settingsStore.resetChanges();
  Object.assign(settings, settingsStore.settings);

  showToast({
    type: "info",
    title: t(
      "admin.systemSettings.toast.resetChanges",
      "Änderungen zurückgesetzt",
    ),
    message: t(
      "admin.systemSettings.toast.resetChangesMessage",
      "Die Änderungen wurden zurückgesetzt.",
    ),
  });
}

// Auf Standardwerte zurücksetzen
async function resetToDefaults() {
  showResetDefaultsConfirm.value = false;
  isSubmitting.value = true;

  try {
    settingsStore.resetToDefaults();
    await settingsStore.saveSettings();
    Object.assign(settings, settingsStore.settings);

    showToast({
      type: "success",
      title: t("admin.systemSettings.toast.resetDefaults", "Zurückgesetzt"),
      message: t(
        "admin.systemSettings.toast.resetDefaultsMessage",
        "Die Einstellungen wurden auf die Standardwerte zurückgesetzt.",
      ),
    });
  } catch (error) {
    console.error("Error resetting settings to defaults:", error);
    showToast({
      type: "error",
      title: t("admin.systemSettings.toast.resetDefaultsError", "Fehler"),
      message: t(
        "admin.systemSettings.toast.resetDefaultsErrorMessage",
        "Die Einstellungen konnten nicht zurückgesetzt werden.",
      ),
    });
  } finally {
    isSubmitting.value = false;
  }
}

// Einstellungen speichern
async function saveSettings() {
  isSubmitting.value = true;

  try {
    // Aktualisiere den Store mit den lokalen Einstellungen
    settingsStore.updateSettings(settings);

    // Speichere die Einstellungen
    await settingsStore.saveSettings();

    showToast({
      type: "success",
      title: t("admin.systemSettings.toast.saveSuccess", "Gespeichert"),
      message: t(
        "admin.systemSettings.toast.saveSuccessMessage",
        "Die Einstellungen wurden erfolgreich gespeichert.",
      ),
    });
  } catch (error) {
    console.error("Error saving settings:", error);
    showToast({
      type: "error",
      title: t("admin.systemSettings.toast.saveError", "Fehler"),
      message: t(
        "admin.systemSettings.toast.saveErrorMessage",
        "Die Einstellungen konnten nicht gespeichert werden.",
      ),
    });
  } finally {
    isSubmitting.value = false;
  }
}

// Cache leeren
async function clearCache() {
  showClearCacheConfirm.value = false;
  isSubmitting.value = true;

  try {
    await systemStore.clearCache();

    showToast({
      type: "success",
      title: t("admin.systemSettings.toast.clearCacheSuccess", "Cache geleert"),
      message: t(
        "admin.systemSettings.toast.clearCacheSuccessMessage",
        "Der Cache wurde erfolgreich geleert.",
      ),
    });
  } catch (error) {
    console.error("Error clearing cache:", error);
    showToast({
      type: "error",
      title: t("admin.systemSettings.toast.clearCacheError", "Fehler"),
      message: t(
        "admin.systemSettings.toast.clearCacheErrorMessage",
        "Der Cache konnte nicht geleert werden.",
      ),
    });
  } finally {
    isSubmitting.value = false;
  }
}

// Formatierungshilfen
function formatDate(timestamp: number | null): string {
  if (!timestamp) return "";

  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

// Lifecycle Hooks
onMounted(async () => {
  await loadSettings();
});

// Watch für Änderungen an den Einstellungen im Store
watch(
  () => settingsStore.settings,
  (newSettings) => {
    // Wenn sich die Store-Einstellungen ändern (z.B. durch Reset), aktualisieren wir die lokalen Einstellungen
    Object.assign(settings, newSettings);
  },
  { deep: true },
);

// Component ready
</script>

<style scoped>
.admin-system-settings {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.admin-system-settings__title {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--n-color-text-primary);
}

.admin-system-settings__description {
  margin: 0;
  color: var(--n-color-text-secondary);
  line-height: 1.5;
}

/* Loading State */
.admin-system-settings__loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  color: var(--n-color-text-secondary);
}

.admin-system-settings__loading-icon {
  font-size: 2rem;
  margin-bottom: 1rem;
}

/* Unsaved Changes Warning */
.admin-system-settings__unsaved-warning {
  display: flex;
  align-items: center;
  padding: 1rem;
  background-color: rgba(var(--n-color-warning-rgb), 0.1);
  border-left: 4px solid var(--n-color-warning);
  border-radius: var(--n-border-radius);
  margin-bottom: 1rem;
}

.admin-system-settings__unsaved-warning i {
  font-size: 1.5rem;
  color: var(--n-color-warning);
  margin-right: 1rem;
}

.admin-system-settings__unsaved-warning p {
  flex: 1;
  margin: 0;
  color: var(--n-color-text-primary);
}

.admin-system-settings__unsaved-actions {
  display: flex;
  gap: 0.5rem;
}

.admin-system-settings__unsaved-button {
  padding: 0.5rem 1rem;
  border-radius: var(--n-border-radius);
  border: none;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
}

.admin-system-settings__unsaved-button--cancel {
  background-color: transparent;
  border: 1px solid var(--n-color-border);
  color: var(--n-color-text-secondary);
}

.admin-system-settings__unsaved-button--cancel:hover {
  background-color: var(--n-color-hover);
}

.admin-system-settings__unsaved-button--save {
  background-color: var(--n-color-primary);
  color: var(--n-color-on-primary);
}

.admin-system-settings__unsaved-button--save:hover {
  background-color: var(--n-color-primary-dark);
}

/* Categories Navigation */
.admin-system-settings__categories {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.admin-system-settings__category-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background-color: var(--n-color-background-alt);
  border: 1px solid var(--n-color-border);
  border-radius: var(--n-border-radius);
  color: var(--n-color-text-primary);
  cursor: pointer;
  transition: all 0.2s;
}

.admin-system-settings__category-button:hover {
  background-color: var(--n-color-hover);
}

.admin-system-settings__category-button--active {
  background-color: var(--n-color-primary);
  border-color: var(--n-color-primary);
  color: var(--n-color-on-primary);
}

/* Content Area */
.admin-system-settings__content {
  background-color: var(--n-color-background-alt);
  border-radius: var(--n-border-radius);
  padding: 1.5rem;
  margin-bottom: 1rem;
}

.admin-system-settings__category-title {
  margin: 0 0 0.5rem 0;
  font-size: 1.25rem;
  font-weight: 500;
  color: var(--n-color-text-primary);
}

.admin-system-settings__category-description {
  margin: 0 0 1.5rem 0;
  color: var(--n-color-text-secondary);
}

/* Form Groups */
.admin-system-settings__section {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.admin-system-settings__form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.admin-system-settings__form-group--indent {
  margin-left: 1.5rem;
  padding-left: 1rem;
  border-left: 2px solid var(--n-color-border);
}

.admin-system-settings__label {
  font-weight: 500;
  color: var(--n-color-text-primary);
}

.admin-system-settings__input,
.admin-system-settings__select,
.admin-system-settings__textarea {
  padding: 0.625rem;
  border: 1px solid var(--n-color-border);
  border-radius: var(--n-border-radius);
  background-color: var(--n-color-background);
  color: var(--n-color-text-primary);
}

.admin-system-settings__input:focus,
.admin-system-settings__select:focus,
.admin-system-settings__textarea:focus {
  border-color: var(--n-color-primary);
  outline: none;
}

.admin-system-settings__input:disabled,
.admin-system-settings__select:disabled,
.admin-system-settings__textarea:disabled {
  background-color: var(--n-color-background-alt);
  opacity: 0.7;
  cursor: not-allowed;
}

.admin-system-settings__textarea {
  resize: vertical;
  min-height: 80px;
}

.admin-system-settings__help-text {
  font-size: 0.875rem;
  color: var(--n-color-text-tertiary);
}

.admin-system-settings__help-text--warning {
  color: var(--n-color-warning);
}

/* Range Input */
.admin-system-settings__range-container {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.admin-system-settings__range {
  flex: 1;
  height: 6px;
  appearance: none;
  background-color: var(--n-color-border);
  border-radius: 3px;
}

.admin-system-settings__range::-webkit-slider-thumb {
  appearance: none;
  width: 16px;
  height: 16px;
  background-color: var(--n-color-primary);
  border-radius: 50%;
  cursor: pointer;
}

.admin-system-settings__range-value {
  min-width: 2rem;
  text-align: center;
  font-weight: 500;
}

/* Switch */
.admin-system-settings__switch-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.admin-system-settings__switch {
  position: relative;
  display: inline-block;
  width: 3rem;
  height: 1.5rem;
}

.admin-system-settings__switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.admin-system-settings__switch-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--n-color-border);
  transition: 0.4s;
  border-radius: 1.5rem;
}

.admin-system-settings__switch-slider:before {
  position: absolute;
  content: "";
  height: 1.125rem;
  width: 1.125rem;
  left: 0.1875rem;
  bottom: 0.1875rem;
  background-color: white;
  transition: 0.4s;
  border-radius: 50%;
}

input:checked + .admin-system-settings__switch-slider {
  background-color: var(--n-color-primary);
}

input:focus + .admin-system-settings__switch-slider {
  box-shadow: 0 0 1px var(--n-color-primary);
}

input:checked + .admin-system-settings__switch-slider:before {
  transform: translateX(1.5rem);
}

/* Action Buttons */
.admin-system-settings__actions {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.admin-system-settings__actions-buttons {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.admin-system-settings__actions-right {
  display: flex;
  gap: 0.75rem;
}

.admin-system-settings__button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1rem;
  border-radius: var(--n-border-radius);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.admin-system-settings__button--primary {
  background-color: var(--n-color-primary);
  border: 1px solid var(--n-color-primary);
  color: var(--n-color-on-primary);
}

.admin-system-settings__button--primary:hover {
  background-color: var(--n-color-primary-dark);
}

.admin-system-settings__button--secondary {
  background-color: var(--n-color-background);
  border: 1px solid var(--n-color-primary);
  color: var(--n-color-primary);
}

.admin-system-settings__button--secondary:hover {
  background-color: rgba(var(--n-color-primary-rgb), 0.1);
}

.admin-system-settings__button--danger {
  background-color: var(--n-color-background);
  border: 1px solid var(--n-color-error);
  color: var(--n-color-error);
}

.admin-system-settings__button--danger:hover {
  background-color: rgba(var(--n-color-error-rgb), 0.1);
}

.admin-system-settings__button--cancel {
  background-color: var(--n-color-background);
  border: 1px solid var(--n-color-border);
  color: var(--n-color-text-primary);
}

.admin-system-settings__button--cancel:hover {
  background-color: var(--n-color-hover);
}

.admin-system-settings__button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.admin-system-settings__last-updated {
  font-size: 0.875rem;
  color: var(--n-color-text-tertiary);
  text-align: right;
}

/* Dialog */
.admin-system-settings__dialog {
  padding: 0;
  border: none;
  border-radius: var(--n-border-radius);
  box-shadow: var(--n-shadow-lg);
  max-width: 500px;
  width: 90%;
}

.admin-system-settings__dialog::backdrop {
  background-color: rgba(0, 0, 0, 0.5);
}

.admin-system-settings__dialog-content {
  padding: 1.5rem;
}

.admin-system-settings__dialog-title {
  margin: 0 0 1rem 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--n-color-text-primary);
}

.admin-system-settings__dialog-message {
  margin: 0 0 1.5rem 0;
  color: var(--n-color-text-primary);
  line-height: 1.5;
}

.admin-system-settings__dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}

/* Responsive Design */
@media (max-width: 768px) {
  .admin-system-settings__categories {
    flex-direction: column;
  }

  .admin-system-settings__actions-buttons {
    flex-direction: column;
    gap: 1rem;
  }

  .admin-system-settings__actions-right {
    width: 100%;
  }

  .admin-system-settings__button {
    flex: 1;
    justify-content: center;
  }

  .admin-system-settings__last-updated {
    text-align: center;
  }

  .admin-system-settings__unsaved-warning {
    flex-direction: column;
    text-align: center;
  }

  .admin-system-settings__unsaved-warning i {
    margin-right: 0;
    margin-bottom: 0.5rem;
  }

  .admin-system-settings__unsaved-warning p {
    margin-bottom: 0.5rem;
  }

  .admin-system-settings__unsaved-actions {
    width: 100%;
  }

  .admin-system-settings__unsaved-button {
    flex: 1;
  }

  .admin-system-settings__switch-container {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
}
</style>
