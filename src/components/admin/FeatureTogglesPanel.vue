<template>
  <div class="feature-toggles-panel">
    <div class="feature-toggles-header">
      <h2>{{ t("admin.featureToggles.title", "Feature-Toggles") }}</h2>
      <p class="feature-toggles-description">
        {{
          t(
            "admin.featureToggles.description",
            "Aktivieren oder deaktivieren Sie Features für die Anwendung. Experimentelle Features könnten instabil sein.",
          )
        }}
      </p>
    </div>

    <div class="feature-toggles-actions">
      <button class="feature-btn" @click="enableAllFeatures">
        {{ t("admin.featureToggles.enableAll", "Alle aktivieren") }}
      </button>
      <button class="feature-btn" @click="disableAllSfcFeatures">
        {{ t("admin.featureToggles.disableSfc", "SFC-Features deaktivieren") }}
      </button>
      <button class="feature-btn feature-btn-secondary" @click="enableCoreOnly">
        {{ t("admin.featureToggles.enableCoreOnly", "Nur Core-Features") }}
      </button>
      <button
        class="feature-btn feature-btn-danger"
        @click="confirmEnableLegacyMode"
      >
        {{ t("admin.featureToggles.legacyMode", "Legacy-Modus") }}
      </button>
    </div>

    <div class="feature-toggles-user-role">
      <label for="user-role">{{
        t("admin.featureToggles.userRole", "Benutzerrolle:")
      }}</label>
      <select
        id="user-role"
        v-model="currentUserRole"
        @change="onUserRoleChange"
      >
        <option value="guest">
          {{ t("admin.featureToggles.roles.guest", "Gast") }}
        </option>
        <option value="user">
          {{ t("admin.featureToggles.roles.user", "Benutzer") }}
        </option>
        <option value="developer">
          {{ t("admin.featureToggles.roles.developer", "Entwickler") }}
        </option>
        <option value="admin">
          {{ t("admin.featureToggles.roles.admin", "Administrator") }}
        </option>
      </select>
    </div>

    <!-- SFC-Migration Features -->
    <div class="feature-toggles-group">
      <h3>
        {{ t("admin.featureToggles.sfcMigration", "Vue 3 SFC-Migration") }}
      </h3>

      <div class="feature-toggle-items">
        <div
          v-for="feature in sfcFeatures"
          :key="feature.key"
          class="feature-toggle-item"
          :class="{
            'feature-toggle-item--disabled': !canUserAccessFeature(feature.key),
            'feature-toggle-item--experimental': !feature.stable,
            'feature-toggle-item--error': hasErrors(feature.key),
            'feature-toggle-item--fallback': isFallbackActive(feature.key),
          }"
        >
          <div class="feature-toggle-item-header">
            <div class="feature-toggle-item-title">
              <h4>{{ feature.name }}</h4>
              <span
                v-if="!feature.stable"
                class="feature-badge feature-badge-experimental"
              >
                {{ t("admin.featureToggles.experimental", "Experimentell") }}
              </span>
              <span
                v-if="hasErrors(feature.key)"
                class="feature-badge feature-badge-error"
              >
                {{ t("admin.featureToggles.error", "Fehler") }}
              </span>
              <span
                v-if="isFallbackActive(feature.key)"
                class="feature-badge feature-badge-fallback"
              >
                {{ t("admin.featureToggles.fallback", "Fallback aktiv") }}
              </span>
            </div>

            <div class="feature-toggle-switch" :title="toggleTitle(feature)">
              <input
                :id="`toggle-${feature.key}`"
                type="checkbox"
                :disabled="!canUserAccessFeature(feature.key)"
                v-model="featureValues[feature.key]"
                @change="onFeatureToggle(feature.key)"
              />
              <label :for="`toggle-${feature.key}`"></label>
            </div>
          </div>

          <p class="feature-toggle-item-description">
            {{ feature.description }}
          </p>

          <div v-if="hasErrors(feature.key)" class="feature-error-details">
            <p class="feature-error-message">
              {{
                getLatestError(feature.key)?.message ||
                t("admin.featureToggles.unknownError", "Unbekannter Fehler")
              }}
            </p>
            <div class="feature-error-actions">
              <button
                @click="clearErrors(feature.key)"
                class="feature-btn feature-btn-small"
              >
                {{ t("admin.featureToggles.clearErrors", "Fehler löschen") }}
              </button>
              <button
                v-if="isFallbackActive(feature.key)"
                @click="deactivateFallback(feature.key)"
                class="feature-btn feature-btn-small feature-btn-secondary"
              >
                {{ t("admin.featureToggles.tryAgain", "Erneut versuchen") }}
              </button>
            </div>
          </div>

          <div class="feature-toggle-item-meta">
            <div
              class="feature-toggle-item-dependencies"
              v-if="feature.dependencies && feature.dependencies.length > 0"
            >
              <span class="feature-meta-label">{{
                t("admin.featureToggles.dependencies", "Abhängigkeiten:")
              }}</span>
              <span
                v-for="dep in feature.dependencies"
                :key="dep"
                class="feature-dependency"
                :class="{
                  'feature-dependency--disabled': !isFeatureEnabled(dep),
                }"
              >
                {{ dep }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- UI-Features -->
    <div class="feature-toggles-group" v-if="uiFeatures.length > 0">
      <h3>{{ t("admin.featureToggles.uiFeatures", "UI-Features") }}</h3>

      <div class="feature-toggle-items feature-toggle-items--compact">
        <div
          v-for="feature in uiFeatures"
          :key="feature.key"
          class="feature-toggle-item feature-toggle-item--compact"
        >
          <div class="feature-toggle-switch">
            <input
              :id="`toggle-${feature.key}`"
              type="checkbox"
              v-model="featureValues[feature.key]"
              @change="onFeatureToggle(feature.key)"
            />
            <label :for="`toggle-${feature.key}`"></label>
          </div>
          <div class="feature-toggle-item-title">
            <h4>{{ feature.name || formatFeatureName(feature.key) }}</h4>
          </div>
        </div>
      </div>
    </div>

    <!-- Reset-Bereich -->
    <div class="feature-toggles-reset">
      <button
        @click="confirmResetAllFeatures"
        class="feature-btn feature-btn-danger"
      >
        {{ t("admin.featureToggles.reset", "Auf Standardwerte zurücksetzen") }}
      </button>
      <button @click="clearAllErrors" class="feature-btn feature-btn-secondary">
        {{ t("admin.featureToggles.clearAllErrors", "Alle Fehler löschen") }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted, watch } from "vue";
import {
  useFeatureToggles,
  FeatureToggleOptions,
} from "@/composables/useFeatureToggles";
import { FeatureToggleRole, FeatureToggleError } from "@/stores/featureToggles";
import { useI18n } from "@/composables/useI18n";
import { useGlobalDialog } from "@/composables/useDialog";

// Props-Definition
interface FeatureTogglesPanelProps {
  /** Initiale Benutzerrolle */
  initialUserRole?: FeatureToggleRole;
  /** Callback bei Änderung der Benutzerrolle */
  onRoleChange?: (role: FeatureToggleRole) => void;
  /** Callback bei Änderung von Features */
  onFeatureChange?: (featureName: string, enabled: boolean) => void;
}

const props = withDefaults(defineProps<FeatureTogglesPanelProps>(), {
  initialUserRole: "admin",
});

// Emits-Definition
const emit = defineEmits<{
  (e: "role-change", role: FeatureToggleRole): void;
  (e: "feature-change", featureName: string, enabled: boolean): void;
  (e: "error-clear", featureName: string): void;
}>();

// Komposables
const { t } = useI18n();
const dialog = useGlobalDialog();

// Aktuelle Benutzerrolle
const currentUserRole = ref<FeatureToggleRole>(props.initialUserRole);

// Feature-Toggles mit der aktuellen Benutzerrolle initialisieren
const featureToggleOptions = computed<FeatureToggleOptions>(() => ({
  userRole: currentUserRole.value,
  debug: true,
}));

const featureToggles = useFeatureToggles(featureToggleOptions.value);

// Lokaler Zustand für Feature-Werte
const featureValues = reactive<Record<string, boolean>>({});

// Gruppierte Features
const sfcFeatures = computed(
  () => featureToggles.groupedFeatures.sfcMigration || [],
);
const uiFeatures = computed(
  () => featureToggles.groupedFeatures.uiFeatures || [],
);
const coreFeatures = computed(
  () => featureToggles.groupedFeatures.coreFeatures || [],
);
const experimentalFeatures = computed(
  () => featureToggles.groupedFeatures.experimentalFeatures || [],
);

// Beim Mounten Feature-Werte initialisieren
onMounted(() => {
  initializeFeatureValues();
});

// Bei Änderung der Benutzerrolle featureToggles aktualisieren
watch(currentUserRole, (newRole) => {
  emit("role-change", newRole);
});

// Event beim Ändern der Benutzerrolle
function onUserRoleChange() {
  // Neu initialisieren mit der aktualisierten Rolle
  initializeFeatureValues();
}

// Feature-Werte aus dem Store initialisieren
function initializeFeatureValues() {
  // SFC-Features
  featureValues["useSfcDocConverter"] = featureToggles.sfcDocConverter.value;
  featureValues["useSfcAdmin"] = featureToggles.sfcAdmin.value;
  featureValues["useSfcChat"] = featureToggles.sfcChat.value;
  featureValues["useSfcSettings"] = featureToggles.sfcSettings.value;

  // Andere Features aus der Konfiguration
  Object.keys(featureToggles.featureConfigs).forEach((key) => {
    featureValues[key] = featureToggles.isEnabled(key);
  });
}

// Event beim Ändern eines Features
function onFeatureToggle(featureName: string) {
  const isEnabled = featureValues[featureName];

  // Feature im Store aktualisieren
  if (isEnabled) {
    featureToggles.enableFeature(featureName);
  } else {
    featureToggles.disableFeature(featureName);
  }

  // Fallback deaktivieren, wenn Feature aktiviert wird
  if (isEnabled && featureToggles.isFallbackActive(featureName)) {
    featureToggles.deactivateFallback(featureName);
  }

  // Event emittieren
  emit("feature-change", featureName, isEnabled);
}

// Prüft, ob ein Feature aktiviert ist
function isFeatureEnabled(featureName: string): boolean {
  return featureToggles.isEnabled(featureName);
}

// Prüft, ob ein Benutzer Zugriff auf ein Feature hat
function canUserAccessFeature(featureName: string): boolean {
  return featureToggles.canAccessFeature(featureName);
}

// Prüft, ob ein Feature Fehler hat
function hasErrors(featureName: string): boolean {
  const errors = featureToggles.storeErrors.value[featureName];
  return !!errors && errors.length > 0;
}

// Gibt den letzten Fehler für ein Feature zurück
function getLatestError(featureName: string): FeatureToggleError | undefined {
  const errors = featureToggles.storeErrors.value[featureName];
  if (!errors || errors.length === 0) {
    return undefined;
  }
  return errors[errors.length - 1];
}

// Prüft, ob der Fallback für ein Feature aktiv ist
function isFallbackActive(featureName: string): boolean {
  return featureToggles.isFallbackActive(featureName);
}

// Fehler für ein Feature löschen
function clearErrors(featureName: string): void {
  featureToggles.clearErrors(featureName);
  emit("error-clear", featureName);
}

// Fallback für ein Feature deaktivieren
function deactivateFallback(featureName: string): void {
  featureToggles.deactivateFallback(featureName);

  // Feature aktivieren, wenn es deaktiviert wurde
  if (!featureToggles.isEnabled(featureName)) {
    featureToggles.enableFeature(featureName);
    featureValues[featureName] = true;
  }
}

// Alle Fehler löschen
function clearAllErrors(): void {
  Object.keys(featureToggles.storeErrors.value).forEach((key) => {
    featureToggles.clearErrors(key);
  });
}

// Titel für den Feature-Toggle anzeigen
function toggleTitle(feature: any): string {
  if (!canUserAccessFeature(feature.key)) {
    return t(
      "admin.featureToggles.noPermission",
      "Keine Berechtigung für dieses Feature",
    );
  }

  if (hasErrors(feature.key)) {
    return t("admin.featureToggles.hasErrors", "Feature hat Fehler");
  }

  if (
    feature.dependencies &&
    !feature.dependencies.every((dep) => isFeatureEnabled(dep))
  ) {
    return t(
      "admin.featureToggles.dependenciesNotMet",
      "Abhängigkeiten nicht erfüllt",
    );
  }

  return feature.description;
}

// Feature-Namen formatieren
function formatFeatureName(key: string): string {
  return key
    .replace(/^use/, "")
    .replace(/([A-Z])/g, " $1")
    .trim();
}

// Alle Features aktivieren
function enableAllFeatures(): void {
  featureToggles.enableAll();
  initializeFeatureValues();
}

// Nur Core-Features aktivieren
function enableCoreOnly(): void {
  featureToggles.enableCoreOnly();
  initializeFeatureValues();
}

// SFC-Features deaktivieren
function disableAllSfcFeatures(): void {
  featureToggles.disableAllSfcFeatures();
  initializeFeatureValues();
}

// Legacy-Modus mit Bestätigung aktivieren
async function confirmEnableLegacyMode(): Promise<void> {
  const confirmed = await dialog.confirm({
    title: t(
      "admin.featureToggles.confirmLegacyMode",
      "Legacy-Modus aktivieren?",
    ),
    message: t(
      "admin.featureToggles.legacyModeWarning",
      "Dies deaktiviert alle modernen Features und könnte zu eingeschränkter Funktionalität führen. Fortfahren?",
    ),
    confirmButtonText: t("common.yes", "Ja"),
    cancelButtonText: t("common.no", "Nein"),
    type: "warning",
  });

  if (confirmed) {
    featureToggles.enableLegacyMode();
    initializeFeatureValues();
  }
}

// Alle Features zurücksetzen mit Bestätigung
async function confirmResetAllFeatures(): Promise<void> {
  const confirmed = await dialog.confirm({
    title: t("admin.featureToggles.confirmReset", "Features zurücksetzen?"),
    message: t(
      "admin.featureToggles.resetWarning",
      "Dies setzt alle Feature-Einstellungen auf die Standardwerte zurück. Fortfahren?",
    ),
    confirmButtonText: t("common.yes", "Ja"),
    cancelButtonText: t("common.no", "Nein"),
    type: "warning",
  });

  if (confirmed) {
    featureToggles.enableCoreOnly();
    initializeFeatureValues();
  }
}
</script>

<style scoped>
.feature-toggles-panel {
  font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
  max-width: 1000px;
  margin: 0 auto;
  padding: 2rem;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.feature-toggles-header {
  margin-bottom: 2rem;
  text-align: center;
}

.feature-toggles-header h2 {
  font-size: 1.75rem;
  color: #0d7a40; /* nscale Grün */
  margin-bottom: 0.75rem;
  font-weight: 600;
}

.feature-toggles-description {
  font-size: 1rem;
  color: #666;
  margin: 0 auto;
  max-width: 700px;
  line-height: 1.5;
}

.feature-toggles-actions {
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  justify-content: center;
}

.feature-toggles-user-role {
  margin-bottom: 2rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  justify-content: flex-end;
}

.feature-toggles-user-role label {
  font-weight: 500;
  color: #555;
}

.feature-toggles-user-role select {
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  background-color: #fff;
  cursor: pointer;
}

.feature-toggles-group {
  margin-bottom: 2rem;
  padding: 1.5rem;
  background-color: #f9f9f9;
  border-radius: 8px;
  border: 1px solid #eee;
}

.feature-toggles-group h3 {
  font-size: 1.25rem;
  color: #333;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #e0e0e0;
}

.feature-toggle-items {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}

@media (min-width: 768px) {
  .feature-toggle-items {
    grid-template-columns: repeat(2, 1fr);
  }

  .feature-toggle-items--compact {
    grid-template-columns: repeat(3, 1fr);
  }
}

.feature-toggle-item {
  background-color: white;
  border-radius: 6px;
  padding: 1.25rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  border: 1px solid #eee;
  transition: all 0.2s ease;
}

.feature-toggle-item:hover {
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
}

.feature-toggle-item--compact {
  padding: 0.75rem 1rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.feature-toggle-item--experimental {
  border-left: 3px solid #eab308; /* Amber */
}

.feature-toggle-item--error {
  border-left: 3px solid #ef4444; /* Red */
}

.feature-toggle-item--fallback {
  border-left: 3px solid #3b82f6; /* Blue */
}

.feature-toggle-item--disabled {
  opacity: 0.7;
  background-color: #f9f9f9;
}

.feature-toggle-item-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.75rem;
}

.feature-toggle-item-title {
  flex: 1;
}

.feature-toggle-item-title h4 {
  font-size: 1.1rem;
  font-weight: 600;
  color: #333;
  margin: 0 0 0.25rem 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.feature-toggle-item-description {
  color: #666;
  font-size: 0.9rem;
  margin-bottom: 1rem;
  line-height: 1.4;
}

.feature-toggle-item-meta {
  font-size: 0.85rem;
  color: #888;
  margin-top: 1rem;
}

.feature-toggle-item-dependencies {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
}

.feature-meta-label {
  font-weight: 500;
}

.feature-dependency {
  background-color: #f0f9ff;
  color: #0ea5e9;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  border: 1px solid #e0f2fe;
}

.feature-dependency--disabled {
  background-color: #fee2e2;
  color: #ef4444;
  border-color: #fecaca;
}

.feature-badge {
  font-size: 0.75rem;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-weight: 500;
  display: inline-block;
  margin-left: 0.5rem;
}

.feature-badge-experimental {
  background-color: #fef9c3;
  color: #ca8a04;
}

.feature-badge-error {
  background-color: #fee2e2;
  color: #dc2626;
}

.feature-badge-fallback {
  background-color: #dbeafe;
  color: #2563eb;
}

.feature-error-details {
  background-color: #fff5f5;
  border-radius: 4px;
  padding: 0.75rem;
  margin: 0.5rem 0;
  border: 1px solid #fee2e2;
}

.feature-error-message {
  color: #b91c1c;
  font-size: 0.9rem;
  margin-bottom: 0.75rem;
}

.feature-error-actions {
  display: flex;
  gap: 0.5rem;
}

.feature-toggles-reset {
  margin-top: 2rem;
  display: flex;
  justify-content: center;
  gap: 1rem;
}

/* Toggle Switch */
.feature-toggle-switch {
  position: relative;
  width: 44px;
  height: 24px;
  flex-shrink: 0;
}

.feature-toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.feature-toggle-switch label {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  transition: 0.4s;
  border-radius: 24px;
}

.feature-toggle-switch label:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: 0.4s;
  border-radius: 50%;
}

.feature-toggle-switch input:checked + label {
  background-color: #0d7a40;
}

.feature-toggle-switch input:focus + label {
  box-shadow: 0 0 1px #0d7a40;
}

.feature-toggle-switch input:checked + label:before {
  transform: translateX(20px);
}

.feature-toggle-switch input:disabled + label {
  background-color: #e0e0e0;
  cursor: not-allowed;
}

.feature-toggle-switch input:disabled + label:before {
  background-color: #ddd;
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

/* Responsive Anpassungen */
@media (max-width: 768px) {
  .feature-toggles-panel {
    padding: 1.5rem;
  }

  .feature-toggle-items,
  .feature-toggle-items--compact {
    grid-template-columns: 1fr;
  }

  .feature-toggle-item-header {
    flex-direction: column;
    gap: 0.75rem;
  }

  .feature-toggle-switch {
    align-self: flex-start;
  }
}
</style>
