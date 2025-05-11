<template>
  <div
    class="n-session-actions"
    :class="{ 'n-session-actions--block': display === 'block' }"
  >
    <!-- Create Button -->
    <button
      v-if="showCreateButton"
      class="n-session-actions__btn n-session-actions__btn--primary n-session-actions__create-btn"
      @click="$emit('create')"
      :disabled="disabled"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <line x1="12" y1="5" x2="12" y2="19"></line>
        <line x1="5" y1="12" x2="19" y2="12"></line>
      </svg>
      <span class="n-session-actions__btn-text">{{ createButtonText }}</span>
    </button>

    <!-- Session Management Actions -->
    <div
      v-if="activeSessionId && sessionActions.length > 0"
      class="n-session-actions__management"
    >
      <button
        v-for="action in enabledSessionActions"
        :key="action.name"
        class="n-session-actions__btn"
        :class="[`n-session-actions__btn--${action.variant || 'default'}`]"
        @click="handleAction(action.name)"
        :title="action.title"
        :aria-label="action.title"
        :disabled="disabled"
      >
        <svg
          v-if="action.icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          v-html="action.icon"
        ></svg>
        <span v-if="showLabels" class="n-session-actions__btn-text">{{
          action.label
        }}</span>
      </button>
    </div>

    <!-- More Actions Dropdown -->
    <div v-if="moreActions.length > 0" class="n-session-actions__more">
      <button
        class="n-session-actions__btn n-session-actions__more-btn"
        @click="toggleMoreOptions"
        :aria-expanded="showMoreOptions"
        ref="moreButton"
        :disabled="disabled"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <circle cx="12" cy="12" r="1"></circle>
          <circle cx="12" cy="5" r="1"></circle>
          <circle cx="12" cy="19" r="1"></circle>
        </svg>
        <span v-if="showLabels" class="n-session-actions__btn-text">Mehr</span>
      </button>

      <div
        v-if="showMoreOptions"
        class="n-session-actions__dropdown"
        ref="dropdown"
      >
        <button
          v-for="action in moreActions"
          :key="action.name"
          class="n-session-actions__dropdown-item"
          :class="{
            'n-session-actions__dropdown-item--danger':
              action.variant === 'danger',
          }"
          @click="handleAction(action.name)"
        >
          <svg
            v-if="action.icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            v-html="action.icon"
          ></svg>
          <span>{{ action.label }}</span>
        </button>
      </div>
    </div>

    <!-- Bulk Actions (when multiple sessions are selected) -->
    <div v-if="selectedSessionIds.length > 1" class="n-session-actions__bulk">
      <span class="n-session-actions__selection-info"
        >{{ selectedSessionIds.length }} ausgewählt</span
      >

      <button
        v-for="action in bulkActions"
        :key="action.name"
        class="n-session-actions__btn"
        :class="[`n-session-actions__btn--${action.variant || 'default'}`]"
        @click="handleBulkAction(action.name)"
        :title="action.title"
        :disabled="disabled"
      >
        <svg
          v-if="action.icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          v-html="action.icon"
        ></svg>
        <span v-if="showLabels" class="n-session-actions__btn-text">{{
          action.label
        }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from "vue";

interface SessionAction {
  name: string;
  label: string;
  title?: string;
  icon?: string;
  variant?: "default" | "primary" | "secondary" | "danger";
  position?: "main" | "more";
  requiredFeature?: string;
  condition?: (sessionId: string | null) => boolean;
}

interface BulkAction {
  name: string;
  label: string;
  title?: string;
  icon?: string;
  variant?: "default" | "primary" | "secondary" | "danger";
}

// Props
interface Props {
  /** Die aktive Session-ID */
  activeSessionId?: string | null;
  /** Array ausgewählter Session-IDs (für Bulk-Aktionen) */
  selectedSessionIds?: string[];
  /** Ob die Aktionen deaktiviert sind */
  disabled?: boolean;
  /** Ob der "Neue Session"-Button angezeigt werden soll */
  showCreateButton?: boolean;
  /** Text für den "Neue Session"-Button */
  createButtonText?: string;
  /** Ob Labels angezeigt werden sollen */
  showLabels?: boolean;
  /** Wie die Aktionen angezeigt werden sollen */
  display?: "inline" | "block";
  /** Welche Aktionen verfügbar sein sollen */
  availableActions?: string[];
  /** Welche Features aktiviert sind */
  enabledFeatures?: string[];
}

// Default-Werte für Props
const props = withDefaults(defineProps<Props>(), {
  activeSessionId: null,
  selectedSessionIds: () => [],
  disabled: false,
  showCreateButton: true,
  createButtonText: "Neue Unterhaltung",
  showLabels: true,
  display: "inline",
  availableActions: () => [
    "rename",
    "delete",
    "pin",
    "export",
    "share",
    "duplicate",
  ],
  enabledFeatures: () => ["pin", "rename", "delete"],
});

// Events
const emit = defineEmits<{
  /** Wird ausgelöst, wenn eine neue Session erstellt werden soll */
  (e: "create"): void;
  /** Wird ausgelöst, wenn eine Session umbenannt werden soll */
  (e: "rename", sessionId: string): void;
  /** Wird ausgelöst, wenn eine Session gelöscht werden soll */
  (e: "delete", sessionId: string): void;
  /** Wird ausgelöst, wenn eine Session angeheftet/abgeheftet werden soll */
  (e: "pin", sessionId: string): void;
  /** Wird ausgelöst, wenn eine Session exportiert werden soll */
  (e: "export", sessionId: string): void;
  /** Wird ausgelöst, wenn eine Session geteilt werden soll */
  (e: "share", sessionId: string): void;
  /** Wird ausgelöst, wenn eine Session dupliziert werden soll */
  (e: "duplicate", sessionId: string): void;
  /** Wird ausgelöst, wenn mehrere Sessions gelöscht werden sollen */
  (e: "bulk-delete", sessionIds: string[]): void;
  /** Wird ausgelöst, wenn mehrere Sessions exportiert werden sollen */
  (e: "bulk-export", sessionIds: string[]): void;
  /** Wird ausgelöst, wenn mehrere Sessions geteilt werden sollen */
  (e: "bulk-share", sessionIds: string[]): void;
}>();

// Reaktive Zustände
const showMoreOptions = ref(false);
const moreButton = ref<HTMLElement | null>(null);
const dropdown = ref<HTMLElement | null>(null);

// Vordefinierte Session-Aktionen
const sessionActions: SessionAction[] = [
  {
    name: "pin",
    label: "Anheften",
    title: "Session anheften/lösen",
    icon: '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle>',
    variant: "default",
    position: "main",
    requiredFeature: "pin",
  },
  {
    name: "rename",
    label: "Umbenennen",
    title: "Session umbenennen",
    icon: '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>',
    variant: "default",
    position: "main",
    requiredFeature: "rename",
  },
  {
    name: "delete",
    label: "Löschen",
    title: "Session löschen",
    icon: '<polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line>',
    variant: "danger",
    position: "main",
    requiredFeature: "delete",
  },
  {
    name: "export",
    label: "Exportieren",
    title: "Session exportieren",
    icon: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line>',
    variant: "default",
    position: "more",
    requiredFeature: "export",
  },
  {
    name: "share",
    label: "Teilen",
    title: "Session teilen",
    icon: '<path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><polyline points="16 6 12 2 8 6"></polyline><line x1="12" y1="2" x2="12" y2="15"></line>',
    variant: "default",
    position: "more",
    requiredFeature: "share",
  },
  {
    name: "duplicate",
    label: "Duplizieren",
    title: "Session duplizieren",
    icon: '<rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>',
    variant: "default",
    position: "more",
    requiredFeature: "duplicate",
  },
];

// Vordefinierte Massenaktionen
const bulkActions: BulkAction[] = [
  {
    name: "delete",
    label: "Alle löschen",
    title: "Ausgewählte Sessions löschen",
    icon: '<polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>',
    variant: "danger",
  },
  {
    name: "export",
    label: "Alle exportieren",
    title: "Ausgewählte Sessions exportieren",
    icon: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line>',
    variant: "default",
  },
  {
    name: "share",
    label: "Alle teilen",
    title: "Ausgewählte Sessions teilen",
    icon: '<path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><polyline points="16 6 12 2 8 6"></polyline><line x1="12" y1="2" x2="12" y2="15"></line>',
    variant: "default",
  },
];

// Computed Properties
const enabledSessionActions = computed(() => {
  return sessionActions.filter((action) => {
    // Filtern nach Position (main oder more)
    const isMain = action.position !== "more";

    // Filtern nach verfügbaren Aktionen
    const isAvailable = props.availableActions.includes(action.name);

    // Filtern nach aktivierten Features
    const isFeatureEnabled =
      !action.requiredFeature ||
      props.enabledFeatures.includes(action.requiredFeature);

    // Filtern nach Bedingung (wenn vorhanden)
    const meetsCondition =
      !action.condition || action.condition(props.activeSessionId);

    return isMain && isAvailable && isFeatureEnabled && meetsCondition;
  });
});

const moreActions = computed(() => {
  return sessionActions.filter((action) => {
    // Filtern nach Position (nur more)
    const isMore = action.position === "more";

    // Filtern nach verfügbaren Aktionen
    const isAvailable = props.availableActions.includes(action.name);

    // Filtern nach aktivierten Features
    const isFeatureEnabled =
      !action.requiredFeature ||
      props.enabledFeatures.includes(action.requiredFeature);

    // Filtern nach Bedingung (wenn vorhanden)
    const meetsCondition =
      !action.condition || action.condition(props.activeSessionId);

    return isMore && isAvailable && isFeatureEnabled && meetsCondition;
  });
});

// Methods
function toggleMoreOptions() {
  showMoreOptions.value = !showMoreOptions.value;
}

function handleAction(actionName: string) {
  if (!props.activeSessionId) return;

  showMoreOptions.value = false;

  switch (actionName) {
    case "rename":
      emit("rename", props.activeSessionId);
      break;
    case "delete":
      emit("delete", props.activeSessionId);
      break;
    case "pin":
      emit("pin", props.activeSessionId);
      break;
    case "export":
      emit("export", props.activeSessionId);
      break;
    case "share":
      emit("share", props.activeSessionId);
      break;
    case "duplicate":
      emit("duplicate", props.activeSessionId);
      break;
  }
}

function handleBulkAction(actionName: string) {
  switch (actionName) {
    case "delete":
      emit("bulk-delete", props.selectedSessionIds);
      break;
    case "export":
      emit("bulk-export", props.selectedSessionIds);
      break;
    case "share":
      emit("bulk-share", props.selectedSessionIds);
      break;
  }
}

// Klick außerhalb des Dropdowns schließt diesen
function handleOutsideClick(event: MouseEvent) {
  if (
    showMoreOptions.value &&
    moreButton.value &&
    dropdown.value &&
    !moreButton.value.contains(event.target as Node) &&
    !dropdown.value.contains(event.target as Node)
  ) {
    showMoreOptions.value = false;
  }
}

// Tastatursteuerung
function handleKeyDown(event: KeyboardEvent) {
  if (event.key === "Escape" && showMoreOptions.value) {
    showMoreOptions.value = false;
  }
}

// Lifecycle Hooks
onMounted(() => {
  document.addEventListener("click", handleOutsideClick);
  document.addEventListener("keydown", handleKeyDown);
});

onBeforeUnmount(() => {
  document.removeEventListener("click", handleOutsideClick);
  document.removeEventListener("keydown", handleKeyDown);
});

// Dropdown schließen, wenn sich die aktive Session ändert
watch(
  () => props.activeSessionId,
  () => {
    showMoreOptions.value = false;
  },
);
</script>

<style scoped>
.n-session-actions {
  display: flex;
  align-items: center;
  gap: var(--n-space-2, 0.5rem);
  flex-wrap: wrap;
}

.n-session-actions--block {
  flex-direction: column;
  align-items: stretch;
}

/* Buttons */
.n-session-actions__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--n-space-2, 0.5rem);
  padding: var(--n-space-2, 0.5rem) var(--n-space-3, 0.75rem);
  border-radius: var(--n-border-radius-md, 0.5rem);
  font-size: var(--n-font-size-sm, 0.875rem);
  font-weight: var(--n-font-weight-medium, 500);
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid transparent;
  background-color: transparent;
  color: var(--n-text-color, #2d3748);
}

.n-session-actions__btn:hover {
  background-color: var(--n-hover-color, rgba(0, 0, 0, 0.05));
}

.n-session-actions__btn:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px var(--n-focus-color, #3182ce);
}

.n-session-actions__btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.n-session-actions__btn svg {
  width: 18px;
  height: 18px;
}

.n-session-actions__btn--primary {
  background-color: var(--n-primary-color, #3182ce);
  color: white;
}

.n-session-actions__btn--primary:hover {
  background-color: var(--n-primary-color-dark, #2c5282);
}

.n-session-actions__btn--secondary {
  background-color: var(--n-secondary-color, #edf2f7);
  color: var(--n-text-color, #2d3748);
}

.n-session-actions__btn--secondary:hover {
  background-color: var(--n-secondary-color-dark, #e2e8f0);
}

.n-session-actions__btn--danger {
  color: var(--n-danger-color, #e53e3e);
}

.n-session-actions__btn--danger:hover {
  background-color: var(--n-danger-color-light, rgba(229, 62, 62, 0.1));
}

.n-session-actions__create-btn {
  white-space: nowrap;
}

/* Dropdown */
.n-session-actions__more {
  position: relative;
}

.n-session-actions__more-btn {
  padding: var(--n-space-2, 0.5rem);
}

.n-session-actions__dropdown {
  position: absolute;
  z-index: 100;
  top: 100%;
  right: 0;
  margin-top: var(--n-space-1, 0.25rem);
  width: 180px;
  background-color: var(--n-surface-color, #ffffff);
  border: 1px solid var(--n-border-color, #e2e8f0);
  border-radius: var(--n-border-radius-md, 0.5rem);
  box-shadow: var(
    --n-shadow-md,
    0 4px 6px -1px rgba(0, 0, 0, 0.1),
    0 2px 4px -1px rgba(0, 0, 0, 0.06)
  );
  overflow: hidden;
}

.n-session-actions__dropdown-item {
  display: flex;
  align-items: center;
  width: 100%;
  padding: var(--n-space-2, 0.5rem) var(--n-space-3, 0.75rem);
  text-align: left;
  background: transparent;
  border: none;
  gap: var(--n-space-2, 0.5rem);
  font-size: var(--n-font-size-sm, 0.875rem);
  color: var(--n-text-color, #2d3748);
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.n-session-actions__dropdown-item:hover {
  background-color: var(--n-hover-color, rgba(0, 0, 0, 0.05));
}

.n-session-actions__dropdown-item svg {
  width: 16px;
  height: 16px;
}

.n-session-actions__dropdown-item--danger {
  color: var(--n-danger-color, #e53e3e);
}

.n-session-actions__dropdown-item--danger:hover {
  background-color: var(--n-danger-color-light, rgba(229, 62, 62, 0.1));
}

/* Bulk Actions */
.n-session-actions__bulk {
  display: flex;
  align-items: center;
  gap: var(--n-space-2, 0.5rem);
  margin-left: var(--n-space-2, 0.5rem);
}

.n-session-actions__selection-info {
  font-size: var(--n-font-size-sm, 0.875rem);
  color: var(--n-text-color-secondary, #718096);
  white-space: nowrap;
}

/* Block-Modus */
.n-session-actions--block .n-session-actions__btn {
  width: 100%;
  justify-content: flex-start;
  text-align: left;
}

.n-session-actions--block .n-session-actions__more {
  width: 100%;
}

.n-session-actions--block .n-session-actions__more-btn {
  width: 100%;
  justify-content: flex-start;
  text-align: left;
}

.n-session-actions--block .n-session-actions__dropdown {
  position: static;
  width: 100%;
  margin-top: var(--n-space-1, 0.25rem);
  box-shadow: none;
  border: 1px solid var(--n-border-color, #e2e8f0);
}

/* Responsive Design */
@media (max-width: 768px) {
  .n-session-actions__btn-text {
    display: none;
  }

  .n-session-actions__btn {
    padding: var(--n-space-2, 0.5rem);
  }

  .n-session-actions__create-btn .n-session-actions__btn-text {
    display: inline;
  }
}
</style>
