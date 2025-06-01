<template>
  <div class="admin-motd-improved">
    <div class="motd-header">
      <h2>{{ t("admin.motd.title") }}</h2>
      <p class="description">{{ t("admin.motd.description") }}</p>
    </div>

    <div v-if="loading.motd || storeLoading" class="loading-spinner">
      <i class="fas fa-spinner fa-spin"></i>
      {{ t("common.loading") }}
    </div>

    <div v-else-if="error" class="error-message">
      <i class="fas fa-exclamation-triangle"></i>
      {{ error }}
    </div>

    <div v-else class="motd-content">
      <div class="motd-preview">
        <h3>{{ t("admin.motd.preview") }}</h3>
        <div
          class="preview-box"
          :style="{
            backgroundColor: editConfig.style?.backgroundColor,
            borderColor: editConfig.style?.borderColor,
            color: editConfig.style?.textColor,
            borderWidth: '1px',
            borderStyle: 'solid',
          }"
          v-html="previewHtml"
        ></div>
      </div>

      <div class="motd-editor">
        <h3>{{ t("admin.motd.editor") }}</h3>

        <div class="enabled-toggle">
          <label>
            <input
              type="checkbox"
              v-model="editConfig.enabled"
              @change="updateConfigField('enabled', $event.target.checked)"
            />
            {{ t("admin.motd.enabled") }}
          </label>
        </div>

        <div class="format-selector">
          <label>{{ t("admin.motd.format") }}:</label>
          <select
            v-model="editConfig.format"
            @change="updateConfigField('format', $event.target.value)"
          >
            <option value="markdown">Markdown</option>
            <option value="html">HTML</option>
            <option value="text">{{ t("admin.motd.formats.text") }}</option>
          </select>
        </div>

        <div class="message-editor">
          <label>{{ t("admin.motd.content") }}:</label>
          <textarea
            v-model="editConfig.content"
            @input="updateConfigField('content', $event.target.value)"
            rows="8"
            :placeholder="t('admin.motd.placeholder')"
          ></textarea>
        </div>

        <div class="style-section">
          <h4>{{ t("admin.motd.styling") }}</h4>

          <div class="style-grid">
            <div class="style-field">
              <label>{{ t("admin.motd.backgroundColor") }}:</label>
              <input
                type="color"
                :value="editConfig.style?.backgroundColor"
                @input="
                  updateStyleField('backgroundColor', $event.target.value)
                "
              />
            </div>

            <div class="style-field">
              <label>{{ t("admin.motd.borderColor") }}:</label>
              <input
                type="color"
                :value="editConfig.style?.borderColor"
                @input="updateStyleField('borderColor', $event.target.value)"
              />
            </div>

            <div class="style-field">
              <label>{{ t("admin.motd.textColor") }}:</label>
              <input
                type="color"
                :value="editConfig.style?.textColor"
                @input="updateStyleField('textColor', $event.target.value)"
              />
            </div>

            <div class="style-field">
              <label>{{ t("admin.motd.iconClass") }}:</label>
              <input
                type="text"
                :value="editConfig.style?.iconClass"
                @input="updateStyleField('iconClass', $event.target.value)"
              />
            </div>
          </div>
        </div>

        <div class="display-section">
          <h4>{{ t("admin.motd.displayOptions") }}</h4>

          <div class="display-grid">
            <div class="display-field">
              <label>{{ t("admin.motd.position") }}:</label>
              <select
                :value="editConfig.display?.position"
                @change="updateDisplayField('position', $event.target.value)"
              >
                <option value="top">
                  {{ t("admin.motd.positions.top") }}
                </option>
                <option value="bottom">
                  {{ t("admin.motd.positions.bottom") }}
                </option>
              </select>
            </div>

            <div class="display-field">
              <label>
                <input
                  type="checkbox"
                  :checked="editConfig.display?.dismissible"
                  @change="
                    updateDisplayField('dismissible', $event.target.checked)
                  "
                />
                {{ t("admin.motd.dismissible") }}
              </label>
            </div>

            <div class="display-field">
              <label>
                <input
                  type="checkbox"
                  :checked="editConfig.display?.showOnStartup"
                  @change="
                    updateDisplayField('showOnStartup', $event.target.checked)
                  "
                />
                {{ t("admin.motd.showOnStartup") }}
              </label>
            </div>

            <div class="display-field">
              <label>
                <input
                  type="checkbox"
                  :checked="editConfig.display?.showInChat"
                  @change="
                    updateDisplayField('showInChat', $event.target.checked)
                  "
                />
                {{ t("admin.motd.showInChat") }}
              </label>
            </div>
          </div>
        </div>

        <div class="motd-actions">
          <button
            @click="saveMotd"
            :disabled="loading.save || !editConfig.content"
            class="btn btn-primary"
          >
            <i class="fas fa-save" v-if="!loading.save"></i>
            <i class="fas fa-spinner fa-spin" v-else></i>
            {{ loading.save ? t("common.saving") : t("common.save") }}
          </button>

          <button
            @click="clearMotd"
            :disabled="loading.save"
            class="btn btn-secondary"
          >
            <i class="fas fa-trash"></i>
            {{ t("admin.motd.clear") }}
          </button>

          <button
            @click="resetToSaved"
            :disabled="!hasUnsavedChanges || loading.save"
            class="btn btn-tertiary"
          >
            <i class="fas fa-undo"></i>
            {{ t("admin.motd.reset") }}
          </button>
        </div>
      </div>

      <div class="motd-history">
        <h3>{{ t("admin.motd.history") }}</h3>
        <div v-if="motdHistory.length === 0" class="no-history">
          {{ t("admin.motd.noHistory") }}
        </div>
        <div v-else class="history-list">
          <div
            v-for="(item, index) in motdHistory"
            :key="index"
            class="history-item"
          >
            <div class="history-info">
              <div class="history-content">{{ item.content }}</div>
              <div class="history-meta">
                <span class="history-format">{{ item.format }}</span>
                <span class="history-date">
                  {{ formatDate(item.createdAt) }}
                </span>
              </div>
            </div>
            <button
              @click="restoreFromHistory(item)"
              class="btn btn-small"
              :title="t('admin.motd.restore')"
            >
              <i class="fas fa-undo"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { useToast } from "@/composables/useToast";
import { storeToRefs } from "pinia";
import { useAdminMotdStore } from "@/stores/admin/motd";
import type { MotdConfig } from "@/types/admin";

interface MotdHistory {
  content: string;
  format: string;
  style: MotdConfig["style"];
  display: MotdConfig["display"];
  enabled: boolean;
  createdAt: number;
}

const { t } = useI18n();
const toast = useToast();
const motdStore = useAdminMotdStore();

const {
  config,
  editConfig,
  loading: storeLoading,
  error: storeError,
  hasUnsavedChanges,
  previewHtml: storePreviewHtml,
} = storeToRefs(motdStore);

const loading = ref({
  motd: false,
  save: false,
});

const motdHistory = ref<MotdHistory[]>([]);

// Use the store's previewHtml
const previewHtml = computed(() => storePreviewHtml.value);

// Use the store's error
const error = computed(() => storeError.value);

const formatDate = (timestamp: number): string => {
  if (!timestamp) return "";
  try {
    const date = new Date(timestamp);
    return date.toLocaleString();
  } catch (error) {
    console.error("Error formatting date:", error);
    return "";
  }
};

const loadMotd = async () => {
  loading.value.motd = true;

  try {
    await motdStore.fetchConfig();

    // Load history (this would come from an API in production)
    loadMotdHistory();
  } catch (err) {
    console.error("Error loading MOTD:", err);
  } finally {
    loading.value.motd = false;
  }
};

const loadMotdHistory = () => {
  // In production, this would be an API call
  // For now, load from localStorage as a demo
  const storedHistory = localStorage.getItem("motdHistory");
  if (storedHistory) {
    try {
      motdHistory.value = JSON.parse(storedHistory);
    } catch (error) {
      console.error("Error parsing MOTD history:", error);
      motdHistory.value = [];
    }
  }
};

const saveMotd = async () => {
  if (!editConfig.value.content) {
    toast.error(t("admin.motd.contentRequired"));
    return;
  }

  loading.value.save = true;

  try {
    await motdStore.saveConfig(editConfig.value);

    // Add to history
    const historyItem: MotdHistory = {
      content: editConfig.value.content,
      format: editConfig.value.format,
      style: editConfig.value.style,
      display: editConfig.value.display,
      enabled: editConfig.value.enabled,
      createdAt: Date.now(),
    };
    motdHistory.value.unshift(historyItem);
    if (motdHistory.value.length > 10) {
      motdHistory.value.pop();
    }

    // Save history to localStorage (in production, this would be an API call)
    localStorage.setItem("motdHistory", JSON.stringify(motdHistory.value));

    toast.success(t("admin.motd.saveSuccess"));
  } catch (err) {
    toast.error(t("admin.motd.saveError"));
    console.error("Error saving MOTD:", err);
  } finally {
    loading.value.save = false;
  }
};

const clearMotd = async () => {
  if (!confirm(t("admin.motd.clearConfirm"))) {
    return;
  }

  loading.value.save = true;

  try {
    // Clear the MOTD by saving an empty config
    const emptyConfig: MotdConfig = {
      enabled: false,
      format: "markdown",
      content: "",
      style: {
        backgroundColor: "#d1ecf1",
        borderColor: "#bee5eb",
        textColor: "#0c5460",
        iconClass: "info-circle",
      },
      display: {
        position: "top",
        dismissible: true,
        showOnStartup: false,
        showInChat: false,
      },
    };

    await motdStore.saveConfig(emptyConfig);

    toast.success(t("admin.motd.clearSuccess"));
  } catch (err) {
    toast.error(t("admin.motd.clearError"));
    console.error("Error clearing MOTD:", err);
  } finally {
    loading.value.save = false;
  }
};

const resetToSaved = () => {
  motdStore.resetConfig();
  toast.info(t("admin.motd.resetSuccess"));
};

const restoreFromHistory = (item: MotdHistory) => {
  const restoredConfig: MotdConfig = {
    enabled: item.enabled,
    format: item.format as MotdConfig["format"],
    content: item.content,
    style: item.style,
    display: item.display,
  };

  motdStore.updateConfig(restoredConfig);
  toast.info(t("admin.motd.restored"));
};

// Helper methods to update nested properties
const updateConfigField = (field: keyof MotdConfig, value: any) => {
  motdStore.updateConfig({
    ...editConfig.value,
    [field]: value,
  });
};

const updateStyleField = (field: keyof MotdConfig["style"], value: any) => {
  motdStore.updateConfig({
    ...editConfig.value,
    style: {
      ...editConfig.value.style,
      [field]: value,
    },
  });
};

const updateDisplayField = (field: keyof MotdConfig["display"], value: any) => {
  motdStore.updateConfig({
    ...editConfig.value,
    display: {
      ...editConfig.value.display,
      [field]: value,
    },
  });
};

onMounted(() => {
  loadMotd();
});
</script>

<style lang="scss" scoped>
.admin-motd-improved {
  padding: 1.5rem;
  max-width: 1200px;
  margin: 0 auto;

  .motd-header {
    margin-bottom: 2rem;

    h2 {
      color: var(--text-primary);
      margin-bottom: 0.5rem;
    }

    .description {
      color: var(--text-secondary);
      font-size: 0.95rem;
    }
  }

  .loading-spinner,
  .error-message {
    text-align: center;
    padding: 2rem;
    font-size: 1.1rem;
  }

  .error-message {
    color: var(--color-danger);

    i {
      margin-right: 0.5rem;
    }
  }

  .motd-content {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2rem;

    @media (max-width: 768px) {
      grid-template-columns: 1fr;
    }
  }

  .motd-preview,
  .motd-editor,
  .motd-history {
    background: var(--bg-secondary);
    border-radius: 8px;
    padding: 1.5rem;
    box-shadow: 0 2px 4px var(--shadow-color);

    h3,
    h4 {
      color: var(--text-primary);
      margin-bottom: 1rem;
      font-size: 1.2rem;
    }

    h4 {
      font-size: 1.1rem;
      margin-top: 1.5rem;
    }
  }

  .motd-history {
    grid-column: 1 / -1;
    margin-top: 2rem;
  }

  .preview-box {
    background: var(--bg-primary);
    border: 1px solid var(--border-color);
    border-radius: 4px;
    padding: 1rem;
    min-height: 100px;
    color: var(--text-primary);

    :deep(p) {
      margin: 0 0 0.5rem 0;
      &:last-child {
        margin-bottom: 0;
      }
    }

    :deep(ul, ol) {
      margin: 0 0 0.5rem 0;
      padding-left: 1.5rem;
    }

    :deep(h1, h2, h3, h4, h5, h6) {
      margin: 0 0 0.5rem 0;
      color: inherit;
    }
  }

  .enabled-toggle {
    margin-bottom: 1rem;

    label {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      cursor: pointer;
      color: var(--text-primary);

      input[type="checkbox"] {
        cursor: pointer;
      }
    }
  }

  .format-selector {
    margin-bottom: 1rem;

    label {
      display: block;
      color: var(--text-secondary);
      margin-bottom: 0.5rem;
      font-weight: 500;
    }

    select {
      width: 100%;
      padding: 0.5rem;
      border: 1px solid var(--border-color);
      border-radius: 4px;
      background: var(--bg-primary);
      color: var(--text-primary);
      font-size: 1rem;

      &:focus {
        outline: none;
        border-color: var(--primary-color);
      }
    }
  }

  .message-editor {
    margin-bottom: 1rem;

    label {
      display: block;
      color: var(--text-secondary);
      margin-bottom: 0.5rem;
      font-weight: 500;
    }

    textarea {
      width: 100%;
      padding: 0.75rem;
      border: 1px solid var(--border-color);
      border-radius: 4px;
      background: var(--bg-primary);
      color: var(--text-primary);
      font-size: 1rem;
      font-family: "Courier New", monospace;
      resize: vertical;

      &:focus {
        outline: none;
        border-color: var(--primary-color);
      }
    }
  }

  .style-grid,
  .display-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }

  .style-field,
  .display-field {
    label {
      display: block;
      color: var(--text-secondary);
      margin-bottom: 0.5rem;
      font-weight: 500;
    }

    input,
    select {
      width: 100%;
      padding: 0.5rem;
      border: 1px solid var(--border-color);
      border-radius: 4px;
      background: var(--bg-primary);
      color: var(--text-primary);
      font-size: 1rem;

      &:focus {
        outline: none;
        border-color: var(--primary-color);
      }
    }

    input[type="color"] {
      height: 40px;
      cursor: pointer;
    }
  }

  .display-field {
    label {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      cursor: pointer;
      color: var(--text-primary);
      margin-bottom: 0;

      input[type="checkbox"] {
        width: auto;
        cursor: pointer;
      }
    }
  }

  .motd-actions {
    display: flex;
    gap: 1rem;
    margin-top: 1.5rem;

    .btn {
      padding: 0.75rem 1.5rem;
      border: none;
      border-radius: 4px;
      font-size: 1rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      gap: 0.5rem;

      &.btn-primary {
        background: var(--primary-color);
        color: white;

        &:hover:not(:disabled) {
          background: var(--primary-hover);
          transform: translateY(-1px);
        }
      }

      &.btn-secondary {
        background: var(--bg-tertiary);
        color: var(--text-primary);

        &:hover:not(:disabled) {
          background: var(--bg-quaternary);
          transform: translateY(-1px);
        }
      }

      &.btn-tertiary {
        background: var(--bg-tertiary);
        color: var(--text-primary);
        opacity: 0.8;

        &:hover:not(:disabled) {
          opacity: 1;
          transform: translateY(-1px);
        }
      }

      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      i {
        font-size: 0.9rem;
      }
    }
  }

  .no-history {
    text-align: center;
    color: var(--text-secondary);
    padding: 2rem;
    font-style: italic;
  }

  .history-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .history-item {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.75rem;
    background: var(--bg-primary);
    border-radius: 4px;
    border: 1px solid var(--border-color);
    transition: all 0.3s ease;

    &:hover {
      border-color: var(--primary-color);
      transform: translateY(-1px);
    }

    .history-info {
      flex: 1;

      .history-content {
        color: var(--text-primary);
        margin-bottom: 0.25rem;
        font-weight: 500;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .history-meta {
        display: flex;
        gap: 1rem;
        color: var(--text-secondary);
        font-size: 0.9rem;

        .history-format {
          padding: 0.125rem 0.5rem;
          background: var(--bg-tertiary);
          border-radius: 12px;
          font-size: 0.8rem;
          text-transform: capitalize;
        }
      }
    }

    .btn-small {
      padding: 0.5rem;
      background: var(--primary-color);
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.3s ease;

      &:hover {
        background: var(--primary-hover);
        transform: scale(1.05);
      }

      i {
        font-size: 0.9rem;
      }
    }
  }
}

// Dark mode adjustments
.dark-mode {
  .preview-box {
    background: var(--bg-tertiary);
    border-color: var(--border-color-dark);
  }

  select,
  input[type="text"],
  input[type="color"],
  textarea {
    background: var(--bg-tertiary);
    border-color: var(--border-color-dark);
    color: var(--text-primary);

    &:focus {
      border-color: var(--primary-color);
    }
  }

  .history-item {
    background: var(--bg-tertiary);
    border-color: var(--border-color-dark);

    &:hover {
      border-color: var(--primary-color);
    }
  }
}
</style>
