<template>
  <div class="admin-motd-enhanced">
    <div class="admin-motd-enhanced__header">
      <h2 class="admin-motd-enhanced__title">
        {{ t("admin.motd.title", "Message of the Day Editor") }}
      </h2>
      <div class="admin-motd-enhanced__actions">
        <Button
          v-if="selectedTemplate"
          variant="secondary"
          @click="clearTemplate"
        >
          {{ t("admin.motd.clearTemplate", "Template löschen") }}
        </Button>
        <Button
          variant="primary"
          :disabled="!hasUnsavedChanges"
          @click="saveMotd"
          :loading="loading"
        >
          {{ t("admin.motd.save", "Speichern") }}
        </Button>
        <Button
          variant="secondary"
          :disabled="!hasUnsavedChanges"
          @click="resetMotd"
        >
          {{ t("admin.motd.reset", "Zurücksetzen") }}
        </Button>
        <Button variant="outline" @click="togglePreview">
          {{
            previewMode
              ? t("admin.motd.edit", "Bearbeiten")
              : t("admin.motd.preview", "Vorschau")
          }}
        </Button>
      </div>
    </div>

    <Transition name="fade">
      <div v-if="error" class="admin-motd-enhanced__error">
        <Alert
          type="error"
          :message="error"
          dismissible
          @dismiss="error = null"
        />
      </div>
    </Transition>

    <!-- Mobile Tab System -->
    <div
      v-if="isMobile && !previewMode"
      class="admin-motd-enhanced__mobile-tabs"
    >
      <button
        @click="activeTab = 'content'"
        :class="{
          'admin-motd-enhanced__mobile-tab': true,
          active: activeTab === 'content',
        }"
      >
        <i class="fas fa-edit"></i>
        {{ t("admin.motd.content", "Inhalt") }}
      </button>
      <button
        @click="activeTab = 'settings'"
        :class="{
          'admin-motd-enhanced__mobile-tab': true,
          active: activeTab === 'settings',
        }"
      >
        <i class="fas fa-cog"></i>
        {{ t("admin.motd.settings", "Einstellungen") }}
      </button>
    </div>

    <!-- Main Editor -->
    <div v-if="!previewMode" class="admin-motd-enhanced__editor">
      <!-- Settings Panel -->
      <div
        v-show="!isMobile || activeTab === 'settings'"
        class="admin-motd-enhanced__settings-panel"
      >
        <!-- Template Selection -->
        <fieldset class="admin-motd-enhanced__fieldset">
          <legend class="admin-motd-enhanced__legend">
            {{ t("admin.motd.templates", "Vorlagen") }}
          </legend>

          <div class="admin-motd-enhanced__templates">
            <button
              v-for="template in templates"
              :key="template.id"
              @click="applyTemplate(template)"
              :class="{
                'admin-motd-enhanced__template': true,
                active: selectedTemplate?.id === template.id,
              }"
              :title="template.description"
            >
              <i :class="['fas', `fa-${template.icon}`]"></i>
              <span>{{ template.name }}</span>
            </button>
          </div>
        </fieldset>

        <!-- General Settings -->
        <fieldset class="admin-motd-enhanced__fieldset">
          <legend class="admin-motd-enhanced__legend">
            {{ t("admin.motd.generalSettings", "Allgemeine Einstellungen") }}
          </legend>

          <div class="admin-motd-enhanced__field">
            <Toggle
              v-model="motdConfig.enabled"
              :label="t('admin.motd.enabled', 'Aktiviert')"
            />
          </div>

          <div class="admin-motd-enhanced__field">
            <label class="admin-motd-enhanced__label">
              {{ t("admin.motd.format", "Format") }}
            </label>
            <Select
              v-model="motdConfig.format"
              :options="formatOptions"
              class="admin-motd-enhanced__select"
            />
          </div>

          <div class="admin-motd-enhanced__field">
            <label class="admin-motd-enhanced__label">
              {{ t("admin.motd.priority", "Priorität") }}
            </label>
            <RadioGroup
              v-model="motdConfig.priority"
              :options="priorityOptions"
              class="admin-motd-enhanced__radio-group"
            />
          </div>
        </fieldset>

        <!-- Display Settings -->
        <fieldset class="admin-motd-enhanced__fieldset">
          <legend class="admin-motd-enhanced__legend">
            {{ t("admin.motd.displaySettings", "Anzeige-Einstellungen") }}
          </legend>

          <div class="admin-motd-enhanced__field">
            <label class="admin-motd-enhanced__label">
              {{ t("admin.motd.position", "Position") }}
            </label>
            <Select
              v-model="motdConfig.display.position"
              :options="positionOptions"
            />
          </div>

          <div class="admin-motd-enhanced__field">
            <Toggle
              v-model="motdConfig.display.dismissible"
              :label="t('admin.motd.dismissible', 'Schließbar')"
            />
          </div>

          <div class="admin-motd-enhanced__field">
            <Toggle
              v-model="motdConfig.display.showOnStartup"
              :label="t('admin.motd.showOnStartup', 'Beim Start anzeigen')"
            />
          </div>

          <div class="admin-motd-enhanced__field">
            <Toggle
              v-model="motdConfig.display.showInChat"
              :label="t('admin.motd.showInChat', 'Im Chat anzeigen')"
            />
          </div>
        </fieldset>

        <!-- Scheduling -->
        <fieldset class="admin-motd-enhanced__fieldset">
          <legend class="admin-motd-enhanced__legend">
            {{ t("admin.motd.scheduling", "Zeitplanung") }}
          </legend>

          <div class="admin-motd-enhanced__field">
            <Toggle
              v-model="scheduling.enabled"
              :label="t('admin.motd.enableSchedule', 'Zeitplan aktivieren')"
            />
          </div>

          <template v-if="scheduling.enabled">
            <div class="admin-motd-enhanced__field">
              <label class="admin-motd-enhanced__label">
                {{ t("admin.motd.startDate", "Startdatum") }}
              </label>
              <Input
                type="datetime-local"
                v-model="scheduling.startDate"
                :min="currentDateTimeString"
              />
            </div>

            <div class="admin-motd-enhanced__field">
              <label class="admin-motd-enhanced__label">
                {{ t("admin.motd.endDate", "Enddatum") }}
              </label>
              <Input
                type="datetime-local"
                v-model="scheduling.endDate"
                :min="scheduling.startDate"
              />
            </div>

            <div class="admin-motd-enhanced__field">
              <label class="admin-motd-enhanced__label">
                {{ t("admin.motd.audience", "Zielgruppe") }}
              </label>
              <Select
                v-model="scheduling.audience"
                :options="audienceOptions"
              />
            </div>

            <div class="admin-motd-enhanced__field">
              <Toggle
                v-model="scheduling.recurring"
                :label="t('admin.motd.recurring', 'Wiederkehrend')"
              />
            </div>

            <div v-if="scheduling.recurring" class="admin-motd-enhanced__field">
              <label class="admin-motd-enhanced__label">
                {{ t("admin.motd.recurringPattern", "Wiederholungsmuster") }}
              </label>
              <Select
                v-model="scheduling.recurringPattern"
                :options="recurringPatternOptions"
              />
            </div>
          </template>
        </fieldset>

        <!-- Version History -->
        <fieldset class="admin-motd-enhanced__fieldset">
          <legend class="admin-motd-enhanced__legend">
            {{ t("admin.motd.versionHistory", "Versionshistorie") }}
          </legend>

          <div
            v-if="versionHistory.length === 0"
            class="admin-motd-enhanced__empty-history"
          >
            {{
              t("admin.motd.noVersionHistory", "Keine früheren Versionen vorhanden")
            }}
          </div>

          <div v-else class="admin-motd-enhanced__version-list">
            <div
              v-for="(version, index) in versionHistory"
              :key="index"
              :class="{
                'admin-motd-enhanced__version-item': true,
                active: version.active,
              }"
            >
              <div class="admin-motd-enhanced__version-info">
                <span class="admin-motd-enhanced__version-date">
                  {{ formatDate(version.timestamp) }}
                </span>
                <span class="admin-motd-enhanced__version-user">
                  {{ version.user }}
                </span>
                <span
                  v-if="version.active"
                  class="admin-motd-enhanced__version-status"
                >
                  {{ t("admin.motd.active", "Aktiv") }}
                </span>
              </div>
              <div class="admin-motd-enhanced__version-actions">
                <Button
                  size="small"
                  variant="outline"
                  @click="previewVersion(version)"
                  :title="t('admin.motd.viewVersion', 'Version anzeigen')"
                >
                  <i class="fas fa-eye"></i>
                </Button>
                <Button
                  size="small"
                  variant="outline"
                  @click="restoreVersion(version)"
                  :disabled="version.active"
                  :title="t('admin.motd.restoreVersion', 'Version wiederherstellen')"
                >
                  <i class="fas fa-undo"></i>
                </Button>
                <Button
                  size="small"
                  variant="outline"
                  @click="deleteVersion(version, index)"
                  :title="t('admin.motd.deleteVersion', 'Version löschen')"
                >
                  <i class="fas fa-trash"></i>
                </Button>
              </div>
            </div>
          </div>
        </fieldset>
      </div>

      <!-- Content Editor -->
      <div
        v-show="!isMobile || activeTab === 'content'"
        class="admin-motd-enhanced__content-editor"
      >
        <!-- Style Settings -->
        <div class="admin-motd-enhanced__style-settings">
          <h3 class="admin-motd-enhanced__style-title">
            {{ t("admin.motd.styleSettings", "Stil-Einstellungen") }}
          </h3>

          <div class="admin-motd-enhanced__style-row">
            <div class="admin-motd-enhanced__field">
              <label class="admin-motd-enhanced__label">
                {{ t("admin.motd.background", "Hintergrund") }}
              </label>
              <div class="admin-motd-enhanced__color-picker">
                <input
                  type="color"
                  v-model="motdConfig.style.backgroundColor"
                  class="admin-motd-enhanced__color-input"
                />
                <Input
                  v-model="motdConfig.style.backgroundColor"
                  class="admin-motd-enhanced__color-value"
                  :placeholder="t('admin.motd.backgroundColorPlaceholder', '#FFFFFF')"
                />
              </div>
            </div>

            <div class="admin-motd-enhanced__field">
              <label class="admin-motd-enhanced__label">
                {{ t("admin.motd.border", "Rahmen") }}
              </label>
              <div class="admin-motd-enhanced__color-picker">
                <input
                  type="color"
                  v-model="motdConfig.style.borderColor"
                  class="admin-motd-enhanced__color-input"
                />
                <Input
                  v-model="motdConfig.style.borderColor"
                  class="admin-motd-enhanced__color-value"
                  :placeholder="t('admin.motd.borderColorPlaceholder', '#CCCCCC')"
                />
              </div>
            </div>

            <div class="admin-motd-enhanced__field">
              <label class="admin-motd-enhanced__label">
                {{ t("admin.motd.text", "Text") }}
              </label>
              <div class="admin-motd-enhanced__color-picker">
                <input
                  type="color"
                  v-model="motdConfig.style.textColor"
                  class="admin-motd-enhanced__color-input"
                />
                <Input
                  v-model="motdConfig.style.textColor"
                  class="admin-motd-enhanced__color-value"
                  :placeholder="t('admin.motd.textColorPlaceholder', '#000000')"
                />
              </div>
            </div>

            <div class="admin-motd-enhanced__field">
              <label class="admin-motd-enhanced__label">
                {{ t("admin.motd.icon", "Icon") }}
              </label>
              <Select
                v-model="motdConfig.style.iconClass"
                :options="iconOptions"
                class="admin-motd-enhanced__icon-select"
              />
            </div>
          </div>
        </div>

        <!-- Content section -->
        <div class="admin-motd-enhanced__content-section">
          <label class="admin-motd-enhanced__content-label">
            {{ t("admin.motd.content", "Inhalt") }}
          </label>

          <!-- Rich text toolbar for markdown -->
          <div
            v-if="motdConfig.format === 'markdown'"
            class="admin-motd-enhanced__toolbar"
          >
            <button
              v-for="tool in markdownTools"
              :key="tool.name"
              class="admin-motd-enhanced__toolbar-button"
              @click="applyMarkdownTool(tool)"
              :title="tool.title"
            >
              <i :class="['fas', tool.icon]"></i>
            </button>
            <div class="admin-motd-enhanced__toolbar-separator"></div>
            <button
              class="admin-motd-enhanced__toolbar-button"
              @click="insertEmoji"
              :title="t('admin.motd.insertEmoji', 'Emoji einfügen')"
            >
              <i class="fas fa-smile"></i>
            </button>
            <button
              class="admin-motd-enhanced__toolbar-button"
              @click="insertLink"
              :title="t('admin.motd.insertLink', 'Link einfügen')"
            >
              <i class="fas fa-link"></i>
            </button>
            <button
              class="admin-motd-enhanced__toolbar-button"
              @click="insertImage"
              :title="t('admin.motd.insertImage', 'Bild einfügen')"
            >
              <i class="fas fa-image"></i>
            </button>
          </div>

          <textarea
            v-model="motdConfig.content"
            class="admin-motd-enhanced__content-textarea"
            :placeholder="
              t(
                'admin.motd.contentPlaceholder',
                'Geben Sie hier den Inhalt der Nachricht ein...',
              )
            "
            :rows="15"
            ref="contentEditor"
          ></textarea>

          <!-- Character count and word count -->
          <div class="admin-motd-enhanced__content-stats">
            <span
              >{{ characterCount }}
              {{ t("admin.motd.characters", "Zeichen") }}</span
            >
            <span>{{ wordCount }} {{ t("admin.motd.words", "Wörter") }}</span>
          </div>

          <!-- Markdown help -->
          <div
            v-if="motdConfig.format === 'markdown'"
            class="admin-motd-enhanced__help"
          >
            <details>
              <summary class="admin-motd-enhanced__help-title">
                {{ t("admin.motd.markdownHelp", "Markdown-Hilfe") }}
              </summary>
              <div class="admin-motd-enhanced__help-content">
                <ul class="admin-motd-enhanced__help-list">
                  <li>
                    <code>**Text**</code> -
                    {{ t("admin.motd.boldText", "Fettgedruckter Text") }}
                  </li>
                  <li>
                    <code>*Text*</code> -
                    {{ t("admin.motd.italicText", "Kursiver Text") }}
                  </li>
                  <li>
                    <code># Titel</code> -
                    {{ t("admin.motd.heading1", "Überschrift 1") }}
                  </li>
                  <li>
                    <code>## Titel</code> -
                    {{ t("admin.motd.heading2", "Überschrift 2") }}
                  </li>
                  <li>
                    <code>- Element</code> -
                    {{ t("admin.motd.listItem", "Listenelement") }}
                  </li>
                  <li>
                    <code>[Link](URL)</code> -
                    {{ t("admin.motd.link", "Link") }}
                  </li>
                  <li>
                    <code>![Alt](URL)</code> -
                    {{ t("admin.motd.image", "Bild") }}
                  </li>
                  <li>
                    <code>`Code`</code> -
                    {{ t("admin.motd.inlineCode", "Inline Code") }}
                  </li>
                  <li>
                    <code>```code```</code> -
                    {{ t("admin.motd.codeBlock", "Code Block") }}
                  </li>
                  <li>
                    <code>> Zitat</code> - {{ t("admin.motd.quote", "Zitat") }}
                  </li>
                </ul>
              </div>
            </details>
          </div>
        </div>
      </div>
    </div>

    <!-- Preview Mode -->
    <div v-else class="admin-motd-enhanced__preview">
      <div class="admin-motd-enhanced__preview-header">
        <h3 class="admin-motd-enhanced__preview-title">
          {{ t("admin.motd.preview", "Vorschau") }}
        </h3>
        <div class="admin-motd-enhanced__preview-modes">
          <button
            v-for="mode in previewModes"
            :key="mode.id"
            @click="currentPreviewMode = mode.id"
            :class="{
              'admin-motd-enhanced__preview-mode': true,
              active: currentPreviewMode === mode.id,
              'auto-selected':
                (mode.id === 'mobile' && isMobile.value) ||
                (mode.id === 'tablet' && isTablet.value) ||
                (mode.id === 'desktop' && isDesktop.value),
            }"
          >
            <i :class="['fas', `fa-${mode.icon}`]"></i>
            {{ mode.label }}
            <span
              v-if="
                (mode.id === 'mobile' && isMobile.value) ||
                (mode.id === 'tablet' && isTablet.value) ||
                (mode.id === 'desktop' && isDesktop.value)
              "
              class="admin-motd-enhanced__preview-mode-badge"
            >
              {{ t("admin.motd.current", "Aktuell") }}
            </span>
          </button>
        </div>
      </div>

      <div
        :class="`admin-motd-enhanced__preview-container ${currentPreviewMode}`"
      >
        <div
          class="admin-motd-enhanced__device-frame"
          v-if="currentPreviewMode !== 'desktop'"
        >
          <div class="admin-motd-enhanced__device-content">
            <div
              v-if="currentPreviewMode === 'mobile'"
              class="admin-motd-enhanced__device-status-bar mobile"
            >
              <div class="admin-motd-enhanced__device-time">
                {{
                  new Date().toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                }}
              </div>
              <div class="admin-motd-enhanced__device-icons">
                <i class="fas fa-signal"></i>
                <i class="fas fa-wifi"></i>
                <i class="fas fa-battery-three-quarters"></i>
              </div>
            </div>
            <div
              v-if="currentPreviewMode === 'tablet'"
              class="admin-motd-enhanced__device-status-bar tablet"
            >
              <div class="admin-motd-enhanced__device-time">
                {{
                  new Date().toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                }}
              </div>
              <div class="admin-motd-enhanced__device-icons">
                <i class="fas fa-signal"></i>
                <i class="fas fa-wifi"></i>
                <i class="fas fa-battery-full"></i>
              </div>
            </div>

            <div
              class="admin-motd-enhanced__preview-content"
              :style="{
                backgroundColor: motdConfig.style.backgroundColor,
                borderColor: motdConfig.style.borderColor,
                color: motdConfig.style.textColor,
              }"
            >
              <div class="admin-motd-enhanced__preview-icon">
                <i :class="['fas', `fa-${motdConfig.style.iconClass}`]"></i>
              </div>
              <div
                class="admin-motd-enhanced__preview-text"
                v-html="previewHtml"
              ></div>
              <div
                v-if="motdConfig.display.dismissible"
                class="admin-motd-enhanced__preview-dismiss"
              >
                <i class="fas fa-times"></i>
              </div>
            </div>
          </div>

          <div
            v-if="currentPreviewMode === 'mobile'"
            class="admin-motd-enhanced__device-home-button"
          ></div>
        </div>

        <div
          v-else
          class="admin-motd-enhanced__preview-content"
          :style="{
            backgroundColor: motdConfig.style.backgroundColor,
            borderColor: motdConfig.style.borderColor,
            color: motdConfig.style.textColor,
          }"
        >
          <div class="admin-motd-enhanced__preview-icon">
            <i :class="['fas', `fa-${motdConfig.style.iconClass}`]"></i>
          </div>
          <div
            class="admin-motd-enhanced__preview-text"
            v-html="previewHtml"
          ></div>
          <div
            v-if="motdConfig.display.dismissible"
            class="admin-motd-enhanced__preview-dismiss"
          >
            <i class="fas fa-times"></i>
          </div>
        </div>
      </div>

      <div v-if="scheduling.enabled" class="admin-motd-enhanced__preview-info">
        <div class="admin-motd-enhanced__preview-scheduling">
          <div class="admin-motd-enhanced__preview-scheduling-item">
            <strong
              >{{ t("admin.motd.scheduledStart", "Geplanter Start") }}:</strong
            >
            {{ formatDate(scheduling.startDate) }}
          </div>
          <div class="admin-motd-enhanced__preview-scheduling-item">
            <strong
              >{{ t("admin.motd.scheduledEnd", "Geplantes Ende") }}:</strong
            >
            {{ formatDate(scheduling.endDate) }}
          </div>
          <div class="admin-motd-enhanced__preview-scheduling-item">
            <strong>{{ t("admin.motd.audience", "Zielgruppe") }}:</strong>
            {{ getAudienceLabel(scheduling.audience) }}
          </div>
          <div
            v-if="scheduling.recurring"
            class="admin-motd-enhanced__preview-scheduling-item"
          >
            <strong
              >{{ t("admin.motd.recurrence", "Wiederholung") }}:</strong
            >
            {{ getRecurringPatternLabel(scheduling.recurringPattern) }}
          </div>
        </div>
      </div>

      <div class="admin-motd-enhanced__preview-status">
        <Alert
          :type="motdConfig.enabled ? 'success' : 'warning'"
          :message="
            motdConfig.enabled
              ? t(
                  'admin.motd.previewEnabled',
                  'Diese Nachricht ist aktiviert und wird angezeigt.',
                )
              : t(
                  'admin.motd.previewDisabled',
                  'Diese Nachricht ist deaktiviert und wird nicht angezeigt.',
                )
          "
        />
      </div>
    </div>

    <!-- Action Buttons -->
    <div v-if="currentAction" class="admin-motd-enhanced__actions-panel">
      <div class="admin-motd-enhanced__action-content">
        <h4 class="admin-motd-enhanced__action-title">
          {{ currentAction.title }}
        </h4>

        <!-- Emoji Picker -->
        <div
          v-if="currentAction.type === 'emoji'"
          class="admin-motd-enhanced__emoji-picker"
        >
          <div class="admin-motd-enhanced__emoji-grid">
            <button
              v-for="emoji in emojis"
              :key="emoji"
              @click="insertEmojiAtCursor(emoji)"
              class="admin-motd-enhanced__emoji-button"
            >
              {{ emoji }}
            </button>
          </div>
        </div>

        <!-- Link Insertion -->
        <div
          v-if="currentAction.type === 'link'"
          class="admin-motd-enhanced__link-form"
        >
          <Input
            v-model="linkText"
            :placeholder="t('admin.motd.linkTextPlaceholder', 'Link Text')"
            class="admin-motd-enhanced__link-input"
          />
          <Input
            v-model="linkUrl"
            :placeholder="t('admin.motd.linkUrlPlaceholder', 'https://example.com')"
            class="admin-motd-enhanced__link-input"
          />
          <Button @click="insertLinkAtCursor" variant="primary">
            {{ t("admin.motd.insertLink", "Link einfügen") }}
          </Button>
        </div>

        <!-- Image Insertion -->
        <div
          v-if="currentAction.type === 'image'"
          class="admin-motd-enhanced__image-form"
        >
          <Input
            v-model="imageAlt"
            :placeholder="t('admin.motd.altTextPlaceholder', 'Alt Text')"
            class="admin-motd-enhanced__image-input"
          />
          <Input
            v-model="imageUrl"
            :placeholder="t('admin.motd.imageUrlPlaceholder', 'https://example.com/image.jpg')"
            class="admin-motd-enhanced__image-input"
          />
          <Button @click="insertImageAtCursor" variant="primary">
            {{ t("admin.motd.insertImage", "Bild einfügen") }}
          </Button>
        </div>

        <Button @click="currentAction = null" variant="secondary">
          {{ t("admin.motd.cancel", "Abbrechen") }}
        </Button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { storeToRefs } from "pinia";
import { useI18n } from "vue-i18n";
import { useAdminMotdStore } from "@/stores/admin/motd";
import { useToast } from "@/composables/useToast";
import { useWindowSize } from "@/composables/useWindowSize";
import type { MotdConfig } from "@/types/admin";

// UI Components
import {
  Button,
  Input,
  Alert,
  Toggle,
  Select,
  RadioGroup,
} from "@/components/ui/base";

// Marked for markdown parsing
import { marked } from "marked";

// Use i18n composable
const { t } = useI18n();

// Store
const motdStore = useAdminMotdStore();
const { config, loading, error, previewMode, hasUnsavedChanges } =
  storeToRefs(motdStore);

// Toast notifications
const toast = useToast();

// Responsive detection
const { isMobile, isTablet, isDesktop } = useWindowSize();

// Local state with proper default structure
const motdConfig = ref<MotdConfig>({
  enabled: config.value?.enabled ?? true,
  format: config.value?.format ?? "markdown",
  content: config.value?.content ?? "",
  style: {
    backgroundColor: config.value?.style?.backgroundColor ?? "#d1ecf1",
    borderColor: config.value?.style?.borderColor ?? "#bee5eb",
    textColor: config.value?.style?.textColor ?? "#0c5460",
    iconClass: config.value?.style?.iconClass ?? "info-circle",
  },
  display: {
    position: config.value?.display?.position ?? "top",
    dismissible: config.value?.display?.dismissible ?? true,
    showOnStartup: config.value?.display?.showOnStartup ?? true,
    showInChat: config.value?.display?.showInChat ?? true,
  },
});
const scheduling = ref({
  enabled: false,
  startDate: new Date().toISOString().slice(0, 16),
  endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 16),
  audience: "all",
  recurring: false,
  recurringPattern: "weekly",
});
const versionHistory = ref<
  Array<{
    timestamp: number;
    user: string;
    config: MotdConfig;
    active: boolean;
  }>
>([]);

const selectedTemplate = ref(null);
const currentAction = ref(null);
const linkText = ref("");
const linkUrl = ref("");
const imageAlt = ref("");
const imageUrl = ref("");
const contentEditor = ref(null);
const currentPreviewMode = ref("desktop");
const activeTab = ref("content");

// Auto-detect device type on mount for preview mode
const autoDetectPreviewMode = () => {
  if (isMobile.value) {
    currentPreviewMode.value = "mobile";
  } else if (isTablet.value) {
    currentPreviewMode.value = "tablet";
  } else {
    currentPreviewMode.value = "desktop";
  }
};

// Computed properties
const currentDateTimeString = computed(() => {
  return new Date().toISOString().slice(0, 16);
});

const characterCount = computed(() => {
  return motdConfig.value.content.length;
});

const wordCount = computed(() => {
  return motdConfig.value.content.split(/\s+/).filter((word) => word.length > 0)
    .length;
});

const previewHtml = computed(() => {
  if (motdConfig.value.format === "markdown") {
    return marked(motdConfig.value.content);
  } else if (motdConfig.value.format === "html") {
    return motdConfig.value.content;
  } else {
    return `<p>${motdConfig.value.content.replace(/\n/g, "<br>")}</p>`;
  }
});

// Templates
const templates = [
  {
    id: "maintenance",
    name: "Wartung",
    icon: "tools",
    description: "Wartungsankündigung",
    content:
      "## Geplante Wartungsarbeiten\n\nWir führen am **[DATUM]** von **[UHRZEIT]** Wartungsarbeiten durch.\n\nWährend dieser Zeit kann es zu kurzen Unterbrechungen kommen.\n\nVielen Dank für Ihr Verständnis.",
    style: {
      backgroundColor: "#fef3c7",
      borderColor: "#f59e0b",
      textColor: "#92400e",
      iconClass: "tools",
    },
    priority: "high",
  },
  {
    id: "new-feature",
    name: "Neue Funktion",
    icon: "sparkles",
    description: "Neue Funktion ankündigen",
    content:
      "## Neue Funktion verfügbar! 🎉\n\n**[FUNKTIONSNAME]** ist jetzt verfügbar!\n\n### Was ist neu?\n- [FEATURE 1]\n- [FEATURE 2]\n- [FEATURE 3]\n\n[Mehr erfahren →](link)",
    style: {
      backgroundColor: "#dbeafe",
      borderColor: "#3b82f6",
      textColor: "#1e3a8a",
      iconClass: "sparkles",
    },
    priority: "medium",
  },
  {
    id: "security",
    name: "Sicherheit",
    icon: "shield-alt",
    description: "Sicherheitshinweis",
    content:
      "## Wichtiger Sicherheitshinweis\n\n**Bitte beachten Sie:**\n\n[SICHERHEITSHINWEIS]\n\n**Empfohlene Maßnahmen:**\n1. [MASSNAHME 1]\n2. [MASSNAHME 2]\n\nBei Fragen wenden Sie sich bitte an den Support.",
    style: {
      backgroundColor: "#fee2e2",
      borderColor: "#ef4444",
      textColor: "#991b1b",
      iconClass: "shield-alt",
    },
    priority: "high",
  },
  {
    id: "info",
    name: "Information",
    icon: "info-circle",
    description: "Allgemeine Information",
    content:
      "## Information\n\n[IHR TEXT HIER]\n\nWeitere Informationen finden Sie in unserer [Dokumentation](link).",
    style: {
      backgroundColor: "#e5e7eb",
      borderColor: "#6b7280",
      textColor: "#111827",
      iconClass: "info-circle",
    },
    priority: "low",
  },
  {
    id: "success",
    name: "Erfolg",
    icon: "check-circle",
    description: "Erfolgsmeldung",
    content:
      "## Erfolgreich abgeschlossen ✅\n\n[ERFOLGSTEXT]\n\nVielen Dank für Ihre Unterstützung!",
    style: {
      backgroundColor: "#d1fae5",
      borderColor: "#10b981",
      textColor: "#065f46",
      iconClass: "check-circle",
    },
    priority: "medium",
  },
  {
    id: "tip",
    name: "Tipp",
    icon: "lightbulb",
    description: "Tipp oder Best Practice",
    content:
      "## Tipp des Tages 💡\n\n**Wussten Sie schon?**\n\n[TIPP-TEXT]\n\n*Mehr Tipps in unserem [Help Center](link)*",
    style: {
      backgroundColor: "#fef3c7",
      borderColor: "#fbbf24",
      textColor: "#78350f",
      iconClass: "lightbulb",
    },
    priority: "low",
  },
];

// Options
const formatOptions = [
  { value: "markdown", label: "Markdown" },
  { value: "html", label: "HTML" },
  { value: "text", label: "Text" },
];

const positionOptions = [
  { value: "top", label: "Oben" },
  { value: "bottom", label: "Unten" },
];

const priorityOptions = [
  { value: "low", label: "Niedrig" },
  { value: "medium", label: "Mittel" },
  { value: "high", label: "Hoch" },
];

const audienceOptions = [
  { value: "all", label: "Alle Benutzer" },
  {
    value: "admins",
    label: "Nur Administratoren",
  },
  {
    value: "users",
    label: "Nur Standardbenutzer",
  },
];

const recurringPatternOptions = [
  { value: "daily", label: "Täglich" },
  { value: "weekly", label: "Wöchentlich" },
  { value: "monthly", label: "Monatlich" },
];

const iconOptions = [
  { value: "info-circle", label: "Information" },
  {
    value: "exclamation-triangle",
    label: "Warnung",
  },
  { value: "check-circle", label: "Erfolg" },
  { value: "exclamation-circle", label: "Fehler" },
  {
    value: "bell",
    label: "Benachrichtigung",
  },
  { value: "lightbulb", label: "Tipp" },
  { value: "shield-alt", label: "Sicherheit" },
  { value: "tools", label: "Wartung" },
  { value: "sparkles", label: "Neu" },
  { value: "graduation-cap", label: "Schulung" },
];

const previewModes = [
  {
    id: "desktop",
    label: "Desktop",
    icon: "desktop",
  },
  {
    id: "tablet",
    label: "Tablet",
    icon: "tablet-alt",
  },
  {
    id: "mobile",
    label: "Mobil",
    icon: "mobile-alt",
  },
];

const markdownTools = [
  {
    name: "bold",
    icon: "fa-bold",
    title: "Fett",
    pattern: "**$selection$**",
  },
  {
    name: "italic",
    icon: "fa-italic",
    title: "Kursiv",
    pattern: "*$selection$*",
  },
  {
    name: "heading1",
    icon: "fa-heading",
    title: "Überschrift 1",
    pattern: "# $selection$",
  },
  {
    name: "heading2",
    icon: "fa-font",
    title: "Überschrift 2",
    pattern: "## $selection$",
  },
  {
    name: "list",
    icon: "fa-list-ul",
    title: "Liste",
    pattern: "- $selection$",
  },
  {
    name: "numberedList",
    icon: "fa-list-ol",
    title: "Nummerierte Liste",
    pattern: "1. $selection$",
  },
  {
    name: "code",
    icon: "fa-code",
    title: "Code",
    pattern: "`$selection$`",
  },
  {
    name: "codeBlock",
    icon: "fa-file-code",
    title: "Code-Block",
    pattern: "```\n$selection$\n```",
  },
  {
    name: "quote",
    icon: "fa-quote-right",
    title: "Zitat",
    pattern: "> $selection$",
  },
  {
    name: "hr",
    icon: "fa-minus",
    title: "Trennlinie",
    pattern: "---\n",
  },
];

const emojis = [
  "😊",
  "👍",
  "❤️",
  "🎉",
  "🚀",
  "💡",
  "⚠️",
  "✅",
  "❌",
  "🔔",
  "📣",
  "🆕",
  "⭐",
  "🔒",
  "🛡️",
  "⚡",
  "🌟",
  "💪",
  "🎯",
  "📋",
];

// Methods
function applyTemplate(template) {
  selectedTemplate.value = template;
  motdConfig.value.content = template.content;
  motdConfig.value.style = { ...template.style };
  motdConfig.value.priority = template.priority;
  toast.success(t("admin.motd.templateApplied", "Vorlage angewendet"));
}

function clearTemplate() {
  selectedTemplate.value = null;
  motdConfig.value.content = "";
  toast.info(t("admin.motd.templateCleared", "Vorlage zurückgesetzt"));
}

function applyMarkdownTool(tool) {
  const textarea = contentEditor.value;
  if (!textarea) return;

  const { selectionStart, selectionEnd } = textarea;
  const selectedText = motdConfig.value.content.substring(
    selectionStart,
    selectionEnd,
  );
  const replacement = tool.pattern.replace("$selection$", selectedText || "");

  const newContent =
    motdConfig.value.content.substring(0, selectionStart) +
    replacement +
    motdConfig.value.content.substring(selectionEnd);

  motdConfig.value.content = newContent;

  // Set focus back to textarea
  setTimeout(() => {
    textarea.focus();
    const newCursorPos = selectionStart + replacement.length;
    textarea.setSelectionRange(newCursorPos, newCursorPos);
  }, 0);
}

function insertEmoji() {
  currentAction.value = {
    type: "emoji",
    title: t("admin.motd.selectEmoji", "Emoji auswählen"),
  };
}

function insertEmojiAtCursor(emoji) {
  const textarea = contentEditor.value;
  if (!textarea) return;

  const { selectionStart, selectionEnd } = textarea;
  const newContent =
    motdConfig.value.content.substring(0, selectionStart) +
    emoji +
    motdConfig.value.content.substring(selectionEnd);

  motdConfig.value.content = newContent;
  currentAction.value = null;

  setTimeout(() => {
    textarea.focus();
    const newCursorPos = selectionStart + emoji.length;
    textarea.setSelectionRange(newCursorPos, newCursorPos);
  }, 0);
}

function insertLink() {
  currentAction.value = {
    type: "link",
    title: t("admin.motd.insertLink", "Link einfügen"),
  };
}

function insertLinkAtCursor() {
  const textarea = contentEditor.value;
  if (!textarea) return;

  const { selectionStart, selectionEnd } = textarea;
  const link = `[${linkText.value || "Link"}](${linkUrl.value})`;
  const newContent =
    motdConfig.value.content.substring(0, selectionStart) +
    link +
    motdConfig.value.content.substring(selectionEnd);

  motdConfig.value.content = newContent;
  currentAction.value = null;
  linkText.value = "";
  linkUrl.value = "";

  setTimeout(() => {
    textarea.focus();
    const newCursorPos = selectionStart + link.length;
    textarea.setSelectionRange(newCursorPos, newCursorPos);
  }, 0);
}

function insertImage() {
  currentAction.value = {
    type: "image",
    title: t("admin.motd.insertImage", "Bild einfügen"),
  };
}

function insertImageAtCursor() {
  const textarea = contentEditor.value;
  if (!textarea) return;

  const { selectionStart, selectionEnd } = textarea;
  const image = `![${imageAlt.value || "Bild"}](${imageUrl.value})`;
  const newContent =
    motdConfig.value.content.substring(0, selectionStart) +
    image +
    motdConfig.value.content.substring(selectionEnd);

  motdConfig.value.content = newContent;
  currentAction.value = null;
  imageAlt.value = "";
  imageUrl.value = "";

  setTimeout(() => {
    textarea.focus();
    const newCursorPos = selectionStart + image.length;
    textarea.setSelectionRange(newCursorPos, newCursorPos);
  }, 0);
}

function formatDate(dateString: string | number): string {
  const date = new Date(dateString);
  return date.toLocaleString("de-DE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getAudienceLabel(audience: string): string {
  const option = audienceOptions.find((opt) => opt.value === audience);
  return option ? option.label : audience;
}

function getRecurringPatternLabel(pattern: string): string {
  const option = recurringPatternOptions.find((opt) => opt.value === pattern);
  return option ? option.label : pattern;
}

function previewVersion(version) {
  motdConfig.value = { ...version.config };
  previewMode.value = true;
}

function restoreVersion(version) {
  if (version.active) return;

  motdConfig.value = { ...version.config };
  toast.success(t("admin.motd.versionRestored", "Version wiederhergestellt"));
}

function deleteVersion(version, index) {
  versionHistory.value.splice(index, 1);
  toast.success(t("admin.motd.versionDeleted", "Version gelöscht"));
}

async function loadMotd() {
  try {
    await motdStore.fetchConfig();
    // Ensure proper structure even if config is incomplete
    motdConfig.value = {
      enabled: config.value?.enabled ?? true,
      format: config.value?.format ?? "markdown",
      content: config.value?.content ?? "",
      style: {
        backgroundColor: config.value?.style?.backgroundColor ?? "#d1ecf1",
        borderColor: config.value?.style?.borderColor ?? "#bee5eb",
        textColor: config.value?.style?.textColor ?? "#0c5460",
        iconClass: config.value?.style?.iconClass ?? "info-circle",
      },
      display: {
        position: config.value?.display?.position ?? "top",
        dismissible: config.value?.display?.dismissible ?? true,
        showOnStartup: config.value?.display?.showOnStartup ?? true,
        showInChat: config.value?.display?.showInChat ?? true,
      },
    };

    // Simulate version history
    versionHistory.value = [
      {
        timestamp: Date.now() - 30 * 24 * 60 * 60 * 1000,
        user: "admin@example.com",
        config: {
          ...motdConfig.value,
          content:
            "Willkommen bei der Digitale Akte - Version vom letzten Monat",
        },
        active: false,
      },
      {
        timestamp: Date.now() - 7 * 24 * 60 * 60 * 1000,
        user: "admin@example.com",
        config: {
          ...motdConfig.value,
          content:
            "## Wartungsarbeiten\n\nAm kommenden Samstag werden Wartungsarbeiten durchgeführt.",
        },
        active: true,
      },
    ];
  } catch (err) {
    console.error("Failed to load MOTD configuration", err);
    toast.error(
      "Fehler beim Laden der Konfiguration",
    );
  }
}

async function saveMotd() {
  try {
    // Add current version to history
    versionHistory.value.unshift({
      timestamp: Date.now(),
      user: "current-user@example.com",
      config: { ...motdConfig.value },
      active: true,
    });

    // Mark all other versions as inactive
    versionHistory.value.forEach((v, i) => {
      if (i > 0) v.active = false;
    });

    await motdStore.updateConfig(motdConfig.value);
    await motdStore.saveConfig();
    toast.success(t("admin.motd.saveSuccess", "Einstellungen gespeichert"));
  } catch (err) {
    console.error("Failed to save MOTD configuration", err);
    toast.error(t("admin.motd.saveError", "Fehler beim Speichern"));
  }
}

function resetMotd() {
  motdStore.resetConfig();
  motdConfig.value = { ...config.value };
  selectedTemplate.value = null;
  toast.info(t("admin.motd.resetSuccess", "Einstellungen zurückgesetzt"));
}

function togglePreview() {
  motdStore.togglePreviewMode();
  // When entering preview mode, auto-detect device type
  if (previewMode.value) {
    autoDetectPreviewMode();
  }
}

// Watch for store changes
watch(
  () => config.value,
  (newValue) => {
    if (newValue) {
      motdConfig.value = {
        enabled: newValue.enabled ?? true,
        format: newValue.format ?? "markdown",
        content: newValue.content ?? "",
        style: {
          backgroundColor: newValue.style?.backgroundColor ?? "#d1ecf1",
          borderColor: newValue.style?.borderColor ?? "#bee5eb",
          textColor: newValue.style?.textColor ?? "#0c5460",
          iconClass: newValue.style?.iconClass ?? "info-circle",
        },
        display: {
          position: newValue.display?.position ?? "top",
          dismissible: newValue.display?.dismissible ?? true,
          showOnStartup: newValue.display?.showOnStartup ?? true,
          showInChat: newValue.display?.showInChat ?? true,
        },
      };
    }
  },
  { deep: true, immediate: true },
);

// Watch for window size changes to update preview mode automatically
watch([isMobile, isTablet, isDesktop], () => {
  if (previewMode.value) {
    autoDetectPreviewMode();
  }
});

// Watch for preview mode changes to reset active tab
watch(previewMode, (newValue) => {
  if (newValue) {
    // When entering preview mode, auto-detect the preview mode based on device
    autoDetectPreviewMode();
  } else {
    // When exiting preview mode, switch back to content tab on mobile
    if (isMobile.value) {
      activeTab.value = "content";
    }
  }
});

// Watch for device size changes to update tabs
watch(isMobile, (newValue) => {
  if (newValue) {
    // Ensure we have a valid tab active
    if (activeTab.value !== "content" && activeTab.value !== "settings") {
      activeTab.value = "content";
    }
  }
});

// Initialize on mount
onMounted(async () => {
  await loadMotd();
  autoDetectPreviewMode();

  // Start with content tab active by default on mobile
  if (isMobile.value) {
    activeTab.value = "content";
  }
});
</script>

<style scoped>
.admin-motd-enhanced {
  width: 100%;
  height: 100%;
  overflow-y: auto;
  padding: 1.5rem;
}

.admin-motd-enhanced__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--n-color-border);
}

.admin-motd-enhanced__title {
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0;
  color: var(--n-color-text-primary);
}

.admin-motd-enhanced__actions {
  display: flex;
  gap: 0.5rem;
}

/* Editor Layout */
.admin-motd-enhanced__editor {
  display: grid;
  grid-template-columns: 350px 1fr;
  gap: 2rem;
}

/* Settings Panel */
.admin-motd-enhanced__settings-panel {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  max-height: calc(100vh - 250px);
  overflow-y: auto;
  padding-right: 0.5rem;
}

.admin-motd-enhanced__fieldset {
  border: 1px solid var(--n-color-border);
  border-radius: var(--n-border-radius);
  padding: 1rem;
  background-color: var(--n-color-background);
}

.admin-motd-enhanced__legend {
  font-weight: 600;
  font-size: 0.9rem;
  padding: 0 0.5rem;
  color: var(--n-color-text-primary);
}

.admin-motd-enhanced__field {
  margin-bottom: 1rem;
}

.admin-motd-enhanced__field:last-child {
  margin-bottom: 0;
}

.admin-motd-enhanced__label {
  display: block;
  margin-bottom: 0.3rem;
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--n-color-text-secondary);
}

/* Templates */
.admin-motd-enhanced__templates {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.5rem;
}

.admin-motd-enhanced__template {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  border: 1px solid var(--n-color-border);
  border-radius: var(--n-border-radius);
  background-color: var(--n-color-background);
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.85rem;
}

.admin-motd-enhanced__template:hover {
  background-color: var(--n-color-hover);
  border-color: var(--n-color-primary);
}

.admin-motd-enhanced__template.active {
  background-color: var(--n-color-primary-light);
  border-color: var(--n-color-primary);
  color: var(--n-color-primary);
}

/* Color Picker */
.admin-motd-enhanced__color-picker {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.admin-motd-enhanced__color-input {
  width: 40px;
  height: 40px;
  border: 1px solid var(--n-color-border);
  border-radius: var(--n-border-radius);
  cursor: pointer;
}

.admin-motd-enhanced__color-value {
  flex: 1;
}

/* Version History */
.admin-motd-enhanced__version-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: 200px;
  overflow-y: auto;
}

.admin-motd-enhanced__version-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  border: 1px solid var(--n-color-border);
  border-radius: var(--n-border-radius);
  background-color: var(--n-color-background);
  transition: all 0.2s ease;
}

.admin-motd-enhanced__version-item:hover {
  background-color: var(--n-color-hover);
}

.admin-motd-enhanced__version-item.active {
  border-color: var(--n-color-success);
  background-color: var(--n-color-success-light);
}

.admin-motd-enhanced__version-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.admin-motd-enhanced__version-date {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--n-color-text-primary);
}

.admin-motd-enhanced__version-user {
  font-size: 0.8rem;
  color: var(--n-color-text-secondary);
}

.admin-motd-enhanced__version-status {
  font-size: 0.75rem;
  color: var(--n-color-success);
  font-weight: 600;
  text-transform: uppercase;
}

.admin-motd-enhanced__version-actions {
  display: flex;
  gap: 0.25rem;
}

/* Content Editor */
.admin-motd-enhanced__content-editor {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.admin-motd-enhanced__style-settings {
  background-color: var(--n-color-background-alt);
  padding: 1rem;
  border-radius: var(--n-border-radius);
}

.admin-motd-enhanced__style-title {
  font-size: 1rem;
  font-weight: 600;
  margin: 0 0 1rem 0;
}

.admin-motd-enhanced__style-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
}

.admin-motd-enhanced__content-section {
  flex: 1;
}

.admin-motd-enhanced__content-label {
  font-weight: 600;
  margin-bottom: 0.5rem;
  display: block;
}

/* Toolbar */
.admin-motd-enhanced__toolbar {
  display: flex;
  gap: 0.25rem;
  margin-bottom: 0.5rem;
  border: 1px solid var(--n-color-border);
  border-radius: var(--n-border-radius);
  padding: 0.5rem;
  background-color: var(--n-color-background-alt);
  flex-wrap: wrap;
}

.admin-motd-enhanced__toolbar-button {
  background: transparent;
  border: none;
  width: 36px;
  height: 36px;
  border-radius: var(--n-border-radius);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--n-color-text-primary);
  transition: all 0.2s ease;
}

.admin-motd-enhanced__toolbar-button:hover {
  background-color: var(--n-color-hover);
  color: var(--n-color-primary);
}

.admin-motd-enhanced__toolbar-separator {
  width: 1px;
  height: 24px;
  background-color: var(--n-color-border);
  margin: 6px 0.5rem;
}

/* Content Textarea */
.admin-motd-enhanced__content-textarea {
  width: 100%;
  min-height: 400px;
  border: 1px solid var(--n-color-border);
  border-radius: var(--n-border-radius);
  padding: 1rem;
  font-family: "Monaco", "Consolas", monospace;
  font-size: 0.9rem;
  resize: vertical;
  background-color: var(--n-color-background);
  color: var(--n-color-text-primary);
}

.admin-motd-enhanced__content-stats {
  display: flex;
  justify-content: space-between;
  margin-top: 0.5rem;
  font-size: 0.85rem;
  color: var(--n-color-text-secondary);
}

/* Help Section */
.admin-motd-enhanced__help {
  margin-top: 1rem;
}

.admin-motd-enhanced__help-title {
  font-weight: 600;
  font-size: 0.9rem;
  padding: 0.5rem 0.75rem;
  cursor: pointer;
  user-select: none;
}

.admin-motd-enhanced__help-content {
  padding: 0.75rem;
  background-color: var(--n-color-background-alt);
  border-radius: var(--n-border-radius);
}

.admin-motd-enhanced__help-list {
  margin: 0;
  padding-left: 1.25rem;
  font-size: 0.85rem;
}

.admin-motd-enhanced__help-list li {
  margin-bottom: 0.5rem;
}

.admin-motd-enhanced__help-list code {
  background-color: var(--n-color-background);
  padding: 0.15rem 0.3rem;
  border-radius: 3px;
  font-size: 0.8rem;
  color: var(--n-color-primary);
}

/* Preview Mode */
.admin-motd-enhanced__preview {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.admin-motd-enhanced__preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.admin-motd-enhanced__preview-title {
  font-size: 1.2rem;
  font-weight: 600;
  margin: 0;
}

.admin-motd-enhanced__preview-modes {
  display: flex;
  gap: 0.5rem;
}

.admin-motd-enhanced__preview-mode {
  padding: 0.5rem 1rem;
  border: 1px solid var(--n-color-border);
  background-color: var(--n-color-background);
  border-radius: var(--n-border-radius);
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.admin-motd-enhanced__preview-mode:hover {
  background-color: var(--n-color-hover);
}

.admin-motd-enhanced__preview-mode.active {
  background-color: var(--n-color-primary);
  color: white;
  border-color: var(--n-color-primary);
}

.admin-motd-enhanced__preview-mode.auto-selected {
  position: relative;
}

.admin-motd-enhanced__preview-mode-badge {
  position: absolute;
  top: -8px;
  right: -8px;
  font-size: 0.65rem;
  background-color: var(--n-color-success);
  color: white;
  padding: 2px 6px;
  border-radius: 10px;
  font-weight: 600;
}

.admin-motd-enhanced__preview-container {
  transition: max-width 0.3s ease;
  margin: 0 auto;
  width: 100%;
}

.admin-motd-enhanced__preview-container.desktop {
  max-width: 100%;
}

.admin-motd-enhanced__preview-container.tablet {
  max-width: 768px;
}

.admin-motd-enhanced__preview-container.mobile {
  max-width: 375px;
}

/* Device frames for mobile and tablet previews */
.admin-motd-enhanced__device-frame {
  background-color: #111;
  border-radius: 24px;
  padding: 12px;
  box-shadow:
    0 10px 20px rgba(0, 0, 0, 0.19),
    0 6px 6px rgba(0, 0, 0, 0.23);
  position: relative;
}

.admin-motd-enhanced__device-content {
  background-color: white;
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.admin-motd-enhanced__device-status-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.3rem 0.75rem;
  background-color: #f5f5f5;
  font-size: 0.75rem;
}

.admin-motd-enhanced__device-status-bar.mobile {
  padding-top: 0.5rem;
  padding-bottom: 0.5rem;
}

.admin-motd-enhanced__device-status-bar.tablet {
  padding-top: 0.3rem;
  padding-bottom: 0.3rem;
}

.admin-motd-enhanced__device-time {
  font-weight: 600;
}

.admin-motd-enhanced__device-icons {
  display: flex;
  gap: 0.5rem;
}

.admin-motd-enhanced__device-home-button {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background-color: #ddd;
  margin: 8px auto 0;
  border: 1px solid #ccc;
}

.admin-motd-enhanced__preview-content {
  position: relative;
  padding: 1rem;
  border: 2px solid;
  border-radius: var(--n-border-radius);
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.admin-motd-enhanced__preview-icon {
  font-size: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 1.5rem;
}

.admin-motd-enhanced__preview-text {
  flex: 1;
  line-height: 1.5;
}

.admin-motd-enhanced__preview-text p {
  margin: 0 0 0.5rem 0;
}

.admin-motd-enhanced__preview-text p:last-child {
  margin-bottom: 0;
}

.admin-motd-enhanced__preview-dismiss {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  font-size: 0.9rem;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  cursor: pointer;
  background-color: rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
}

.admin-motd-enhanced__preview-dismiss:hover {
  background-color: rgba(0, 0, 0, 0.2);
}

.admin-motd-enhanced__preview-info {
  margin-top: 1rem;
}

.admin-motd-enhanced__preview-scheduling {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1rem;
  border: 1px solid var(--n-color-border);
  border-radius: var(--n-border-radius);
  background-color: var(--n-color-background-alt);
}

.admin-motd-enhanced__preview-scheduling-item {
  font-size: 0.9rem;
}

.admin-motd-enhanced__preview-status {
  margin-top: 1rem;
}

/* Actions Panel */
.admin-motd-enhanced__actions-panel {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: var(--n-color-background);
  border-top: 1px solid var(--n-color-border);
  padding: 1rem;
  box-shadow: 0 -4px 6px rgba(0, 0, 0, 0.1);
  z-index: 10;
}

.admin-motd-enhanced__action-content {
  max-width: 600px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.admin-motd-enhanced__action-title {
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
}

/* Emoji Picker */
.admin-motd-enhanced__emoji-picker {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.admin-motd-enhanced__emoji-grid {
  display: grid;
  grid-template-columns: repeat(10, 1fr);
  gap: 0.25rem;
  max-height: 200px;
  overflow-y: auto;
  padding: 0.5rem;
  border: 1px solid var(--n-color-border);
  border-radius: var(--n-border-radius);
  background-color: var(--n-color-background-alt);
}

.admin-motd-enhanced__emoji-button {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  border: none;
  background-color: transparent;
  border-radius: var(--n-border-radius);
  cursor: pointer;
  transition: all 0.2s ease;
}

.admin-motd-enhanced__emoji-button:hover {
  background-color: var(--n-color-hover);
}

/* Link/Image Forms */
.admin-motd-enhanced__link-form,
.admin-motd-enhanced__image-form {
  display: flex;
  gap: 0.5rem;
  align-items: flex-end;
}

.admin-motd-enhanced__link-input,
.admin-motd-enhanced__image-input {
  flex: 1;
}

/* Transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Mobile Tabs */
.admin-motd-enhanced__mobile-tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.admin-motd-enhanced__mobile-tab {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem;
  border: 1px solid var(--n-color-border);
  border-radius: var(--n-border-radius);
  background-color: var(--n-color-background-alt);
  color: var(--n-color-text-primary);
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.admin-motd-enhanced__mobile-tab.active {
  background-color: var(--n-color-primary);
  color: var(--n-color-on-primary);
  border-color: var(--n-color-primary);
}

.admin-motd-enhanced__mobile-tab i {
  font-size: 1rem;
}

/* Responsive Design */
@media (max-width: 1024px) {
  .admin-motd-enhanced__editor {
    grid-template-columns: 1fr;
  }

  .admin-motd-enhanced__settings-panel {
    max-height: none;
    order: 2;
  }

  .admin-motd-enhanced__content-editor {
    order: 1;
  }

  .admin-motd-enhanced__style-row {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .admin-motd-enhanced__header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }

  .admin-motd-enhanced__actions {
    width: 100%;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .admin-motd-enhanced__actions button {
    min-height: 44px; /* Better touch target */
    flex: 1 1 auto;
  }

  .admin-motd-enhanced__templates {
    grid-template-columns: 1fr;
  }

  .admin-motd-enhanced__template {
    padding: 0.75rem;
    min-height: 44px; /* Better touch target */
  }

  .admin-motd-enhanced__style-row {
    grid-template-columns: 1fr;
  }

  .admin-motd-enhanced__toolbar {
    flex-wrap: wrap;
    padding: 0.5rem;
  }

  .admin-motd-enhanced__toolbar-button {
    width: 44px; /* Larger touch target */
    height: 44px;
    font-size: 1.1rem;
  }

  /* Stack form fields better */
  .admin-motd-enhanced__form-field {
    margin-bottom: 1.25rem;
  }

  .admin-motd-enhanced__form-field label {
    margin-bottom: 0.5rem;
    display: block;
  }

  .admin-motd-enhanced__preview-container {
    margin-top: 1rem;
  }

  .admin-motd-enhanced__preview-modes {
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .admin-motd-enhanced__preview-mode {
    flex: 1 1 auto;
    min-height: 44px; /* Better touch target */
  }

  .admin-motd-enhanced__emoji-grid {
    grid-template-columns: repeat(5, 1fr);
  }

  /* Color picker adjustments */
  .admin-motd-enhanced__color-field {
    display: grid;
    grid-template-columns: 44px 1fr; /* Color swatch and input */
    align-items: center;
    gap: 0.5rem;
  }

  /* Improve form elements */
  .admin-motd-enhanced input[type="text"],
  .admin-motd-enhanced input[type="date"],
  .admin-motd-enhanced input[type="time"],
  .admin-motd-enhanced select,
  .admin-motd-enhanced textarea {
    min-height: 44px;
    padding: 0.75rem;
  }
}

/* Small mobile adjustments */
@media (max-width: 480px) {
  .admin-motd-enhanced__actions {
    flex-direction: column;
  }

  .admin-motd-enhanced__actions button {
    width: 100%;
  }

  .admin-motd-enhanced__toolbar {
    justify-content: center;
  }

  .admin-motd-enhanced__toolbar-overflow {
    display: none; /* Hide less important tools */
  }

  .admin-motd-enhanced__preview-modes {
    justify-content: center;
  }

  .admin-motd-enhanced__emoji-grid {
    grid-template-columns: repeat(4, 1fr);
  }

  .admin-motd-enhanced__editor-textarea {
    min-height: 200px; /* Shorter on very small screens */
  }
}

/* Dark Mode Support */
@media (prefers-color-scheme: dark) {
  .admin-motd-enhanced__fieldset {
    background-color: var(--n-color-background-alt);
  }

  .admin-motd-enhanced__template {
    background-color: var(--n-color-background-alt);
  }

  .admin-motd-enhanced__version-item {
    background-color: var(--n-color-background-alt);
  }

  .admin-motd-enhanced__content-textarea {
    background-color: var(--n-color-background-alt);
  }

  .admin-motd-enhanced__help-content {
    background-color: var(--n-color-background);
  }

  .admin-motd-enhanced__help-list code {
    background-color: var(--n-color-background-alt);
  }

  .admin-motd-enhanced__style-settings {
    background-color: var(--n-color-background);
  }

  .admin-motd-enhanced__toolbar {
    background-color: var(--n-color-background);
  }

  .admin-motd-enhanced__emoji-grid {
    background-color: var(--n-color-background);
  }
}
</style>
