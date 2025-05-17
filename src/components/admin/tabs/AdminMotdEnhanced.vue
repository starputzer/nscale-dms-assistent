<template>
  <div class="admin-motd-enhanced">
    <!-- Header with Quick Actions -->
    <div class="admin-motd-enhanced__header">
      <div class="admin-motd-enhanced__title-section">
        <h2 class="admin-motd-enhanced__title">
          {{ t("admin.motd.title", "Message of the Day Editor") }}
        </h2>
        <div class="admin-motd-enhanced__quick-actions">
          <Button
            variant="secondary"
            size="small"
            @click="showTemplates = true"
            :icon="{ name: 'layout-template', position: 'left' }"
          >
            {{ t("admin.motd.templates", "Templates") }}
          </Button>
          <Button
            variant="secondary"
            size="small"
            @click="showHistory = true"
            :icon="{ name: 'history', position: 'left' }"
          >
            {{ t("admin.motd.history", "History") }}
          </Button>
          <Button
            variant="secondary"
            size="small"
            @click="toggleScheduler"
            :icon="{ name: 'calendar', position: 'left' }"
          >
            {{ t("admin.motd.schedule", "Schedule") }}
          </Button>
        </div>
      </div>
      <div class="admin-motd-enhanced__actions">
        <Button
          variant="outline"
          @click="togglePreview"
          :icon="{ name: previewMode ? 'edit' : 'eye', position: 'left' }"
        >
          {{
            previewMode
              ? t("admin.motd.edit", "Edit")
              : t("admin.motd.preview", "Preview")
          }}
        </Button>
        <Button
          variant="secondary"
          :disabled="!hasUnsavedChanges"
          @click="resetMotd"
        >
          {{ t("admin.motd.reset", "Reset") }}
        </Button>
        <Button
          variant="primary"
          :disabled="!hasUnsavedChanges"
          @click="saveMotd"
          :loading="loading"
          :icon="{ name: 'save', position: 'left' }"
        >
          {{ t("admin.motd.save", "Save") }}
        </Button>
      </div>
    </div>

    <!-- Alerts and Notifications -->
    <div v-if="error" class="admin-motd-enhanced__error">
      <Alert
        type="error"
        :message="error"
        dismissible
        @dismiss="error = null"
      />
    </div>

    <div v-if="success" class="admin-motd-enhanced__success">
      <Alert
        type="success"
        :message="success"
        dismissible
        @dismiss="success = null"
      />
    </div>

    <!-- Main Content Area -->
    <div class="admin-motd-enhanced__main">
      <!-- Preview Mode -->
      <div v-if="previewMode" class="admin-motd-enhanced__preview-container">
        <div class="admin-motd-enhanced__preview-header">
          <h3 class="admin-motd-enhanced__preview-title">
            {{ t("admin.motd.previewTitle", "Live Preview") }}
          </h3>
          <div class="admin-motd-enhanced__preview-info">
            <Badge
              :variant="motdConfig.enabled ? 'success' : 'default'"
              :icon="motdConfig.enabled ? 'check' : 'x'"
            >
              {{
                motdConfig.enabled
                  ? t("admin.motd.previewEnabled", "Active")
                  : t("admin.motd.previewDisabled", "Inactive")
              }}
            </Badge>
            <Badge
              v-if="motdConfig.priority"
              :variant="getPriorityVariant(motdConfig.priority)"
              :icon="getPriorityIcon(motdConfig.priority)"
            >
              {{ getPriorityLabel(motdConfig.priority) }}
            </Badge>
          </div>
        </div>

        <div
          class="admin-motd-enhanced__preview-content"
          :style="{
            backgroundColor: motdConfig.style.backgroundColor,
            borderColor: motdConfig.style.borderColor,
            color: motdConfig.style.textColor,
            borderRadius: motdConfig.style.borderRadius + 'px',
            boxShadow: motdConfig.style.shadow
              ? '0 2px 8px rgba(0,0,0,0.1)'
              : 'none',
          }"
        >
          <div
            class="admin-motd-enhanced__preview-icon"
            v-if="motdConfig.style.iconClass"
          >
            <i :class="['fas', `fa-${motdConfig.style.iconClass}`]"></i>
          </div>
          <div
            class="admin-motd-enhanced__preview-text"
            v-html="renderedContent"
          ></div>
          <div
            v-if="motdConfig.display.dismissible"
            class="admin-motd-enhanced__preview-dismiss"
          >
            <i class="fas fa-times"></i>
          </div>
        </div>

        <!-- Preview Scheduling Info -->
        <div
          class="admin-motd-enhanced__preview-schedule"
          v-if="motdConfig.schedule"
        >
          <div class="admin-motd-enhanced__schedule-info">
            <Icon name="calendar" />
            <span>{{ formatSchedule(motdConfig.schedule) }}</span>
          </div>
          <div
            class="admin-motd-enhanced__audience-info"
            v-if="motdConfig.audience"
          >
            <Icon name="users" />
            <span>{{ getAudienceLabel(motdConfig.audience) }}</span>
          </div>
        </div>
      </div>

      <!-- Editor Mode -->
      <div v-else class="admin-motd-enhanced__editor">
        <!-- Settings Panel -->
        <div class="admin-motd-enhanced__settings-panel">
          <!-- General Settings -->
          <Card class="admin-motd-enhanced__settings-card">
            <template #header>
              <h3 class="admin-motd-enhanced__card-title">
                {{ t("admin.motd.generalSettings", "General Settings") }}
              </h3>
            </template>

            <div class="admin-motd-enhanced__field">
              <Toggle
                v-model="motdConfig.enabled"
                :label="t('admin.motd.enabled', 'Enabled')"
                description="Show this message to users"
              />
            </div>

            <div class="admin-motd-enhanced__field">
              <label class="admin-motd-enhanced__label">
                {{ t("admin.motd.priority", "Priority") }}
              </label>
              <RadioGroup
                v-model="motdConfig.priority"
                :options="priorityOptions"
                name="priority"
              />
            </div>

            <div class="admin-motd-enhanced__field">
              <label class="admin-motd-enhanced__label">
                {{ t("admin.motd.format", "Format") }}
              </label>
              <Select
                v-model="motdConfig.format"
                :options="formatOptions"
                placeholder="Select format"
              />
            </div>

            <div class="admin-motd-enhanced__field">
              <label class="admin-motd-enhanced__label">
                {{ t("admin.motd.audience", "Target Audience") }}
              </label>
              <Select
                v-model="motdConfig.audience"
                :options="audienceOptions"
                placeholder="Select audience"
              />
            </div>
          </Card>

          <!-- Display Settings -->
          <Card class="admin-motd-enhanced__settings-card">
            <template #header>
              <h3 class="admin-motd-enhanced__card-title">
                {{ t("admin.motd.displaySettings", "Display Settings") }}
              </h3>
            </template>

            <div class="admin-motd-enhanced__field">
              <label class="admin-motd-enhanced__label">
                {{ t("admin.motd.position", "Position") }}
              </label>
              <RadioGroup
                v-model="motdConfig.display.position"
                :options="positionOptions"
                name="position"
              />
            </div>

            <div class="admin-motd-enhanced__field">
              <Toggle
                v-model="motdConfig.display.dismissible"
                :label="t('admin.motd.dismissible', 'Allow Dismissal')"
                description="Users can close this message"
              />
            </div>

            <div class="admin-motd-enhanced__field">
              <Toggle
                v-model="motdConfig.display.showOnStartup"
                :label="t('admin.motd.showOnStartup', 'Show on Startup')"
                description="Display when application starts"
              />
            </div>

            <div class="admin-motd-enhanced__field">
              <Toggle
                v-model="motdConfig.display.showInChat"
                :label="t('admin.motd.showInChat', 'Show in Chat')"
                description="Display above chat interface"
              />
            </div>
          </Card>

          <!-- Style Settings -->
          <Card class="admin-motd-enhanced__settings-card">
            <template #header>
              <h3 class="admin-motd-enhanced__card-title">
                {{ t("admin.motd.styleSettings", "Style Settings") }}
              </h3>
            </template>

            <div class="admin-motd-enhanced__field">
              <ColorPicker
                v-model="motdConfig.style.backgroundColor"
                :label="t('admin.motd.backgroundColor', 'Background Color')"
                :presets="colorPresets"
              />
            </div>

            <div class="admin-motd-enhanced__field">
              <ColorPicker
                v-model="motdConfig.style.borderColor"
                :label="t('admin.motd.borderColor', 'Border Color')"
                :presets="colorPresets"
              />
            </div>

            <div class="admin-motd-enhanced__field">
              <ColorPicker
                v-model="motdConfig.style.textColor"
                :label="t('admin.motd.textColor', 'Text Color')"
                :presets="textColorPresets"
              />
            </div>

            <div class="admin-motd-enhanced__field">
              <label class="admin-motd-enhanced__label">
                {{ t("admin.motd.icon", "Icon") }}
              </label>
              <IconPicker
                v-model="motdConfig.style.iconClass"
                :options="iconOptions"
              />
            </div>

            <div class="admin-motd-enhanced__field">
              <NumberInput
                v-model="motdConfig.style.borderRadius"
                :label="t('admin.motd.borderRadius', 'Border Radius')"
                :min="0"
                :max="20"
                suffix="px"
              />
            </div>

            <div class="admin-motd-enhanced__field">
              <Toggle
                v-model="motdConfig.style.shadow"
                :label="t('admin.motd.shadow', 'Drop Shadow')"
                description="Add subtle shadow effect"
              />
            </div>
          </Card>
        </div>

        <!-- Content Editor -->
        <div class="admin-motd-enhanced__content-editor">
          <Card class="admin-motd-enhanced__editor-card">
            <template #header>
              <div class="admin-motd-enhanced__editor-header">
                <h3 class="admin-motd-enhanced__card-title">
                  {{ t("admin.motd.content", "Message Content") }}
                </h3>
                <div class="admin-motd-enhanced__editor-actions">
                  <Button
                    variant="ghost"
                    size="small"
                    @click="insertVariable"
                    :icon="{ name: 'variable', position: 'left' }"
                  >
                    {{ t("admin.motd.insertVariable", "Variables") }}
                  </Button>
                  <Button
                    variant="ghost"
                    size="small"
                    @click="insertLink"
                    :icon="{ name: 'link', position: 'left' }"
                  >
                    {{ t("admin.motd.insertLink", "Link") }}
                  </Button>
                  <Button
                    variant="ghost"
                    size="small"
                    @click="insertImage"
                    :icon="{ name: 'image', position: 'left' }"
                    v-if="
                      motdConfig.format === 'markdown' ||
                      motdConfig.format === 'html'
                    "
                  >
                    {{ t("admin.motd.insertImage", "Image") }}
                  </Button>
                </div>
              </div>
            </template>

            <!-- Rich Text Editor -->
            <div
              class="admin-motd-enhanced__rich-editor"
              v-if="motdConfig.format === 'html'"
            >
              <RichTextEditor
                v-model="motdConfig.content"
                :toolbar="richTextToolbar"
                :placeholder="
                  t(
                    'admin.motd.contentPlaceholder',
                    'Enter your message here...',
                  )
                "
                :min-height="300"
              />
            </div>

            <!-- Markdown Editor -->
            <div
              v-else-if="motdConfig.format === 'markdown'"
              class="admin-motd-enhanced__markdown-editor"
            >
              <div class="admin-motd-enhanced__toolbar">
                <button
                  v-for="tool in markdownTools"
                  :key="tool.name"
                  class="admin-motd-enhanced__toolbar-button"
                  @click="applyMarkdownTool(tool)"
                  :title="tool.title"
                >
                  <i :class="['fas', tool.icon]"></i>
                </button>
              </div>
              <textarea
                v-model="motdConfig.content"
                class="admin-motd-enhanced__content-textarea"
                :placeholder="
                  t(
                    'admin.motd.contentPlaceholder',
                    'Enter your message here...',
                  )
                "
                rows="15"
                ref="contentTextarea"
              ></textarea>
              <div class="admin-motd-enhanced__markdown-help">
                <details>
                  <summary>
                    {{ t("admin.motd.markdownHelp", "Markdown Help") }}
                  </summary>
                  <ul class="admin-motd-enhanced__help-list">
                    <li><code>**text**</code> - Bold</li>
                    <li><code>*text*</code> - Italic</li>
                    <li><code># Heading</code> - Heading</li>
                    <li><code>- Item</code> - List item</li>
                    <li><code>[Link](URL)</code> - Link</li>
                    <li><code>![Alt](URL)</code> - Image</li>
                    <li><code>`code`</code> - Inline code</li>
                    <li><code>```code```</code> - Code block</li>
                  </ul>
                </details>
              </div>
            </div>

            <!-- Plain Text Editor -->
            <div v-else class="admin-motd-enhanced__text-editor">
              <textarea
                v-model="motdConfig.content"
                class="admin-motd-enhanced__content-textarea"
                :placeholder="
                  t(
                    'admin.motd.contentPlaceholder',
                    'Enter your message here...',
                  )
                "
                rows="15"
              ></textarea>
            </div>

            <!-- Character Count -->
            <div class="admin-motd-enhanced__char-count">
              {{ motdConfig.content.length }} / {{ maxLength }} characters
            </div>
          </Card>

          <!-- Scheduling Card -->
          <Card
            class="admin-motd-enhanced__scheduling-card"
            v-if="showSchedulerCard"
          >
            <template #header>
              <h3 class="admin-motd-enhanced__card-title">
                {{ t("admin.motd.scheduling", "Schedule Message") }}
              </h3>
            </template>

            <div class="admin-motd-enhanced__field">
              <Toggle
                v-model="motdConfig.schedule.enabled"
                :label="t('admin.motd.schedulingEnabled', 'Enable Scheduling')"
                description="Set specific dates for this message"
              />
            </div>

            <template v-if="motdConfig.schedule.enabled">
              <div class="admin-motd-enhanced__field">
                <DateTimePicker
                  v-model="motdConfig.schedule.startDate"
                  :label="t('admin.motd.startDate', 'Start Date')"
                  :min="new Date()"
                />
              </div>

              <div class="admin-motd-enhanced__field">
                <DateTimePicker
                  v-model="motdConfig.schedule.endDate"
                  :label="t('admin.motd.endDate', 'End Date')"
                  :min="motdConfig.schedule.startDate"
                />
              </div>

              <div class="admin-motd-enhanced__field">
                <label class="admin-motd-enhanced__label">
                  {{ t("admin.motd.recurrence", "Recurrence") }}
                </label>
                <Select
                  v-model="motdConfig.schedule.recurrence"
                  :options="recurrenceOptions"
                  placeholder="Select recurrence"
                />
              </div>

              <div
                class="admin-motd-enhanced__field"
                v-if="motdConfig.schedule.recurrence !== 'none'"
              >
                <TimeSlotPicker
                  v-model="motdConfig.schedule.timeSlots"
                  :label="t('admin.motd.timeSlots', 'Display Times')"
                />
              </div>
            </template>
          </Card>
        </div>
      </div>
    </div>

    <!-- Templates Modal -->
    <Modal
      v-model="showTemplates"
      :title="t('admin.motd.templates', 'Message Templates')"
      size="large"
    >
      <div class="admin-motd-enhanced__templates">
        <div class="admin-motd-enhanced__template-search">
          <Input
            v-model="templateSearch"
            :placeholder="
              t('admin.motd.searchTemplates', 'Search templates...')
            "
            :icon="{ name: 'search', position: 'left' }"
          />
        </div>
        <div class="admin-motd-enhanced__template-list">
          <div
            v-for="template in filteredTemplates"
            :key="template.id"
            class="admin-motd-enhanced__template-item"
            @click="selectTemplate(template)"
          >
            <div class="admin-motd-enhanced__template-icon">
              <i :class="['fas', `fa-${template.icon}`]"></i>
            </div>
            <div class="admin-motd-enhanced__template-content">
              <h4 class="admin-motd-enhanced__template-title">
                {{ template.name }}
              </h4>
              <p class="admin-motd-enhanced__template-description">
                {{ template.description }}
              </p>
              <div class="admin-motd-enhanced__template-tags">
                <Badge
                  v-for="tag in template.tags"
                  :key="tag"
                  variant="secondary"
                >
                  {{ tag }}
                </Badge>
              </div>
            </div>
            <div class="admin-motd-enhanced__template-preview">
              <Button
                variant="ghost"
                size="small"
                @click.stop="previewTemplate(template)"
              >
                {{ t("admin.motd.previewTemplate", "Preview") }}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Modal>

    <!-- History Modal -->
    <Modal
      v-model="showHistory"
      :title="t('admin.motd.history', 'Message History')"
      size="large"
    >
      <div class="admin-motd-enhanced__history">
        <div class="admin-motd-enhanced__history-filters">
          <DateRangePicker
            v-model="historyDateRange"
            :label="t('admin.motd.dateRange', 'Date Range')"
          />
          <Select
            v-model="historyFilter"
            :options="historyFilterOptions"
            placeholder="Filter by type"
          />
        </div>
        <div class="admin-motd-enhanced__history-list">
          <div
            v-for="item in filteredHistory"
            :key="item.id"
            class="admin-motd-enhanced__history-item"
          >
            <div class="admin-motd-enhanced__history-date">
              {{ formatDate(item.timestamp) }}
            </div>
            <div class="admin-motd-enhanced__history-content">
              <div class="admin-motd-enhanced__history-header">
                <h4 class="admin-motd-enhanced__history-title">
                  {{ item.title }}
                </h4>
                <Badge :variant="getHistoryBadgeVariant(item.status)">
                  {{ item.status }}
                </Badge>
              </div>
              <p class="admin-motd-enhanced__history-preview">
                {{ item.preview }}
              </p>
              <div class="admin-motd-enhanced__history-meta">
                <span
                  >{{ t("admin.motd.modifiedBy", "Modified by") }}:
                  {{ item.user }}</span
                >
                <span
                  >{{ t("admin.motd.views", "Views") }}: {{ item.views }}</span
                >
                <span
                  >{{ t("admin.motd.dismissals", "Dismissals") }}:
                  {{ item.dismissals }}</span
                >
              </div>
            </div>
            <div class="admin-motd-enhanced__history-actions">
              <Button
                variant="ghost"
                size="small"
                @click="viewHistoryDetails(item)"
              >
                {{ t("admin.motd.viewDetails", "View") }}
              </Button>
              <Button
                variant="ghost"
                size="small"
                @click="restoreFromHistory(item)"
              >
                {{ t("admin.motd.restore", "Restore") }}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Modal>

    <!-- Variable Picker Modal -->
    <Modal
      v-model="showVariablePicker"
      :title="t('admin.motd.insertVariable', 'Insert Variable')"
      size="medium"
    >
      <div class="admin-motd-enhanced__variable-picker">
        <div class="admin-motd-enhanced__variable-search">
          <Input
            v-model="variableSearch"
            :placeholder="
              t('admin.motd.searchVariables', 'Search variables...')
            "
            :icon="{ name: 'search', position: 'left' }"
          />
        </div>
        <div class="admin-motd-enhanced__variable-list">
          <div
            v-for="variable in filteredVariables"
            :key="variable.key"
            class="admin-motd-enhanced__variable-item"
            @click="insertVariableAtCursor(variable)"
          >
            <code class="admin-motd-enhanced__variable-key">{{
              variable.key
            }}</code>
            <span class="admin-motd-enhanced__variable-desc">{{
              variable.description
            }}</span>
            <span class="admin-motd-enhanced__variable-example">{{
              variable.example
            }}</span>
          </div>
        </div>
      </div>
    </Modal>

    <!-- Quick Actions Menu -->
    <div v-if="showQuickActions" class="admin-motd-enhanced__quick-menu">
      <Card class="admin-motd-enhanced__quick-card">
        <h3 class="admin-motd-enhanced__quick-title">
          {{ t("admin.motd.quickActions", "Quick Actions") }}
        </h3>
        <div class="admin-motd-enhanced__quick-list">
          <button
            v-for="action in quickActions"
            :key="action.id"
            class="admin-motd-enhanced__quick-item"
            @click="executeQuickAction(action)"
          >
            <Icon :name="action.icon" />
            <span>{{ action.label }}</span>
          </button>
        </div>
      </Card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from "vue";
import { useI18n } from "vue-i18n";
import { storeToRefs } from "pinia";
import { useAdminMotdStore } from "@/stores/admin/motd";
import type {
  MotdConfig,
  MotdTemplate,
  MotdHistoryItem,
  MotdVariable,
} from "@/types/admin";

// UI Components
import {
  Button,
  Input,
  Card,
  Alert,
  Toggle,
  Select,
  Badge,
  Modal,
  RadioGroup,
  RichTextEditor,
  DateTimePicker,
  DateRangePicker,
  ColorPicker,
  IconPicker,
  NumberInput,
  TimeSlotPicker,
  Icon,
} from "@/components/ui";

// i18n
const { t } = useI18n();

// Store
const motdStore = useAdminMotdStore();
const { config, loading, error } = storeToRefs(motdStore);

// Local state
const motdConfig = ref<MotdConfig>({
  enabled: true,
  format: "markdown",
  content: "",
  priority: "normal",
  audience: "all",
  style: {
    backgroundColor: "#d1ecf1",
    borderColor: "#bee5eb",
    textColor: "#0c5460",
    iconClass: "info-circle",
    borderRadius: 4,
    shadow: false,
  },
  display: {
    position: "top",
    dismissible: true,
    showOnStartup: true,
    showInChat: true,
  },
  schedule: {
    enabled: false,
    startDate: null,
    endDate: null,
    recurrence: "none",
    timeSlots: [],
  },
});

const previewMode = ref(false);
const hasUnsavedChanges = ref(false);
const renderedContent = ref("");
const success = ref<string | null>(null);
const maxLength = ref(1000);

// Features toggles
const showTemplates = ref(false);
const showHistory = ref(false);
const showSchedulerCard = ref(false);
const showVariablePicker = ref(false);
const showQuickActions = ref(false);

// Search and filters
const templateSearch = ref("");
const variableSearch = ref("");
const historyDateRange = ref<[Date, Date]>([
  new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
  new Date(),
]);
const historyFilter = ref("all");

// Content editor refs
const contentTextarea = ref<HTMLTextAreaElement | null>(null);

// Options for select fields
const formatOptions = [
  { value: "markdown", label: t("admin.motd.formatMarkdown", "Markdown") },
  { value: "html", label: t("admin.motd.formatHtml", "HTML") },
  { value: "text", label: t("admin.motd.formatText", "Plain Text") },
];

const priorityOptions = [
  {
    value: "low",
    label: t("admin.motd.priorityLow", "Low"),
    icon: "arrow-down",
  },
  {
    value: "normal",
    label: t("admin.motd.priorityNormal", "Normal"),
    icon: "minus",
  },
  {
    value: "high",
    label: t("admin.motd.priorityHigh", "High"),
    icon: "arrow-up",
  },
  {
    value: "urgent",
    label: t("admin.motd.priorityUrgent", "Urgent"),
    icon: "exclamation",
  },
];

const positionOptions = [
  { value: "top", label: t("admin.motd.positionTop", "Top") },
  { value: "bottom", label: t("admin.motd.positionBottom", "Bottom") },
  { value: "modal", label: t("admin.motd.positionModal", "Modal") },
];

const audienceOptions = [
  { value: "all", label: t("admin.motd.audienceAll", "All Users") },
  {
    value: "admins",
    label: t("admin.motd.audienceAdmins", "Administrators Only"),
  },
  {
    value: "users",
    label: t("admin.motd.audienceUsers", "Standard Users Only"),
  },
  { value: "new", label: t("admin.motd.audienceNew", "New Users") },
  { value: "custom", label: t("admin.motd.audienceCustom", "Custom Group") },
];

const recurrenceOptions = [
  { value: "none", label: t("admin.motd.recurrenceNone", "No Recurrence") },
  { value: "daily", label: t("admin.motd.recurrenceDaily", "Daily") },
  { value: "weekly", label: t("admin.motd.recurrenceWeekly", "Weekly") },
  { value: "monthly", label: t("admin.motd.recurrenceMonthly", "Monthly") },
  { value: "custom", label: t("admin.motd.recurrenceCustom", "Custom") },
];

const historyFilterOptions = [
  { value: "all", label: t("admin.motd.historyAll", "All Messages") },
  { value: "active", label: t("admin.motd.historyActive", "Active") },
  { value: "scheduled", label: t("admin.motd.historyScheduled", "Scheduled") },
  { value: "expired", label: t("admin.motd.historyExpired", "Expired") },
  { value: "draft", label: t("admin.motd.historyDraft", "Drafts") },
];

// Icon options with categories
const iconOptions = [
  { value: "info-circle", label: "Information", category: "status" },
  { value: "exclamation-triangle", label: "Warning", category: "status" },
  { value: "check-circle", label: "Success", category: "status" },
  { value: "exclamation-circle", label: "Error", category: "status" },
  { value: "bell", label: "Notification", category: "communication" },
  { value: "bullhorn", label: "Announcement", category: "communication" },
  { value: "lightbulb", label: "Tip", category: "help" },
  { value: "question-circle", label: "Help", category: "help" },
  { value: "user-shield", label: "Security", category: "system" },
  { value: "tools", label: "Maintenance", category: "system" },
  { value: "server", label: "Server", category: "system" },
  { value: "clock", label: "Time", category: "system" },
  { value: "calendar", label: "Calendar", category: "event" },
  { value: "gift", label: "Special", category: "event" },
  { value: "star", label: "Featured", category: "event" },
];

// Color presets
const colorPresets = [
  "#d1ecf1", // Info blue
  "#d4edda", // Success green
  "#fff3cd", // Warning yellow
  "#f8d7da", // Danger red
  "#e2e3e5", // Secondary gray
  "#d1d3d4", // Light gray
  "#ffffff", // White
  "#f8f9fa", // Light
];

const textColorPresets = [
  "#0c5460", // Info text
  "#155724", // Success text
  "#856404", // Warning text
  "#721c24", // Danger text
  "#383d41", // Secondary text
  "#495057", // Default text
  "#212529", // Dark text
  "#000000", // Black
];

// Markdown tools
const markdownTools = [
  { name: "bold", icon: "fa-bold", title: "Bold", pattern: "**$selection$**" },
  {
    name: "italic",
    icon: "fa-italic",
    title: "Italic",
    pattern: "*$selection$*",
  },
  {
    name: "heading1",
    icon: "fa-heading",
    title: "Heading 1",
    pattern: "# $selection$",
  },
  {
    name: "heading2",
    icon: "fa-heading",
    title: "Heading 2",
    pattern: "## $selection$",
  },
  { name: "list", icon: "fa-list-ul", title: "List", pattern: "- $selection$" },
  {
    name: "orderedList",
    icon: "fa-list-ol",
    title: "Ordered List",
    pattern: "1. $selection$",
  },
  {
    name: "link",
    icon: "fa-link",
    title: "Link",
    pattern: "[$selection$](https://)",
  },
  {
    name: "image",
    icon: "fa-image",
    title: "Image",
    pattern: "![Alt text]($selection$)",
  },
  { name: "code", icon: "fa-code", title: "Code", pattern: "`$selection$`" },
  {
    name: "codeBlock",
    icon: "fa-file-code",
    title: "Code Block",
    pattern: "```\n$selection$\n```",
  },
  {
    name: "quote",
    icon: "fa-quote-right",
    title: "Quote",
    pattern: "> $selection$",
  },
  {
    name: "hr",
    icon: "fa-minus",
    title: "Horizontal Rule",
    pattern: "---\n$selection$",
  },
  {
    name: "table",
    icon: "fa-table",
    title: "Table",
    pattern: "| Header | Header |\n|--------|--------|\n| $selection$ | Cell |",
  },
];

// Rich text editor toolbar
const richTextToolbar = [
  ["bold", "italic", "underline", "strike"],
  ["h1", "h2", "h3"],
  ["link", "unlink", "image"],
  ["ul", "ol", "paragraph"],
  ["left", "center", "right", "justify"],
  ["color", "background"],
  ["clean"],
];

// Template data
const templates = ref<MotdTemplate[]>([
  {
    id: "maintenance",
    name: "Scheduled Maintenance",
    description: "Inform users about upcoming system maintenance",
    icon: "tools",
    tags: ["maintenance", "system", "downtime"],
    content:
      "🔧 **Scheduled Maintenance**\n\nWe will be performing system maintenance on {{date}} from {{startTime}} to {{endTime}}.\n\nDuring this time, the system may be temporarily unavailable. We apologize for any inconvenience.",
    style: {
      backgroundColor: "#fff3cd",
      borderColor: "#ffeaa7",
      textColor: "#856404",
      iconClass: "tools",
    },
    priority: "high",
  },
  {
    id: "welcome",
    name: "Welcome Message",
    description: "Greet new users with important information",
    icon: "hand-wave",
    tags: ["welcome", "onboarding", "new users"],
    content:
      "👋 **Welcome to {{appName}}!**\n\nWe're excited to have you here. Here are a few things to get you started:\n\n- Check out our [documentation](/docs)\n- Join our [community forum](/forum)\n- Contact [support](/support) if you need help\n\nEnjoy your experience!",
    style: {
      backgroundColor: "#d4edda",
      borderColor: "#c3e6cb",
      textColor: "#155724",
      iconClass: "hand-wave",
    },
    priority: "normal",
  },
  {
    id: "security",
    name: "Security Update",
    description: "Important security announcements",
    icon: "shield-alt",
    tags: ["security", "update", "important"],
    content:
      "🔒 **Security Update**\n\nA security update has been applied to protect your account. Please review your security settings and enable two-factor authentication if you haven't already.\n\n[Review Security Settings](/settings/security)",
    style: {
      backgroundColor: "#f8d7da",
      borderColor: "#f5c6cb",
      textColor: "#721c24",
      iconClass: "shield-alt",
    },
    priority: "urgent",
  },
  {
    id: "feature",
    name: "New Feature Announcement",
    description: "Announce new features or updates",
    icon: "sparkles",
    tags: ["feature", "update", "announcement"],
    content:
      "✨ **New Feature Available!**\n\nWe've just launched {{featureName}} to help you {{benefit}}.\n\n[Learn More](/features/{{featureId}})",
    style: {
      backgroundColor: "#cff4fc",
      borderColor: "#b8e7fc",
      textColor: "#0c5460",
      iconClass: "sparkles",
    },
    priority: "normal",
  },
]);

// History data (simulated)
const history = ref<MotdHistoryItem[]>([
  {
    id: "1",
    title: "System Maintenance Notice",
    preview: "Scheduled maintenance on Sunday...",
    content: "Full content here...",
    timestamp: Date.now() - 7 * 24 * 60 * 60 * 1000,
    user: "admin@example.com",
    status: "expired",
    views: 1250,
    dismissals: 450,
    config: { ...motdConfig.value },
  },
  {
    id: "2",
    title: "Welcome to the New Year!",
    preview: "Happy 2024! We have exciting updates...",
    content: "Full content here...",
    timestamp: Date.now() - 30 * 24 * 60 * 60 * 1000,
    user: "marketing@example.com",
    status: "active",
    views: 5430,
    dismissals: 2100,
    config: { ...motdConfig.value },
  },
]);

// Variables
const variables = ref<MotdVariable[]>([
  {
    key: "{{userName}}",
    description: "Current user's name",
    example: "John Doe",
  },
  {
    key: "{{userEmail}}",
    description: "Current user's email",
    example: "john@example.com",
  },
  { key: "{{date}}", description: "Current date", example: "January 15, 2024" },
  { key: "{{time}}", description: "Current time", example: "3:45 PM" },
  {
    key: "{{appName}}",
    description: "Application name",
    example: "NScale Assist",
  },
  {
    key: "{{appVersion}}",
    description: "Application version",
    example: "v2.0.0",
  },
  {
    key: "{{supportEmail}}",
    description: "Support email address",
    example: "support@example.com",
  },
  {
    key: "{{companyName}}",
    description: "Company name",
    example: "Your Company",
  },
]);

// Quick actions
const quickActions = [
  {
    id: "disable",
    label: "Disable All Messages",
    icon: "eye-slash",
    action: "disableAll",
  },
  {
    id: "clearHistory",
    label: "Clear History",
    icon: "trash",
    action: "clearHistory",
  },
  {
    id: "export",
    label: "Export Configuration",
    icon: "download",
    action: "export",
  },
  {
    id: "import",
    label: "Import Configuration",
    icon: "upload",
    action: "import",
  },
  {
    id: "duplicate",
    label: "Duplicate Message",
    icon: "copy",
    action: "duplicate",
  },
  {
    id: "preview",
    label: "Preview on Device",
    icon: "mobile",
    action: "devicePreview",
  },
];

// Computed properties
const filteredTemplates = computed(() => {
  if (!templateSearch.value) return templates.value;
  const search = templateSearch.value.toLowerCase();
  return templates.value.filter(
    (template) =>
      template.name.toLowerCase().includes(search) ||
      template.description.toLowerCase().includes(search) ||
      template.tags.some((tag) => tag.toLowerCase().includes(search)),
  );
});

const filteredHistory = computed(() => {
  let filtered = history.value;

  // Filter by date range
  filtered = filtered.filter((item) => {
    const date = new Date(item.timestamp);
    return (
      date >= historyDateRange.value[0] && date <= historyDateRange.value[1]
    );
  });

  // Filter by status
  if (historyFilter.value !== "all") {
    filtered = filtered.filter((item) => item.status === historyFilter.value);
  }

  return filtered;
});

const filteredVariables = computed(() => {
  if (!variableSearch.value) return variables.value;
  const search = variableSearch.value.toLowerCase();
  return variables.value.filter(
    (variable) =>
      variable.key.toLowerCase().includes(search) ||
      variable.description.toLowerCase().includes(search),
  );
});

// Methods
function togglePreview() {
  previewMode.value = !previewMode.value;
  if (previewMode.value) {
    renderContent();
  }
}

function toggleScheduler() {
  showSchedulerCard.value = !showSchedulerCard.value;
}

async function saveMotd() {
  try {
    loading.value = true;
    await motdStore.saveConfig(motdConfig.value);
    hasUnsavedChanges.value = false;
    success.value = "Message saved successfully!";
    setTimeout(() => {
      success.value = null;
    }, 3000);
  } catch (err) {
    console.error("Failed to save MOTD configuration", err);
    error.value = "Failed to save message. Please try again.";
  } finally {
    loading.value = false;
  }
}

function resetMotd() {
  motdConfig.value = { ...config.value };
  hasUnsavedChanges.value = false;
}

function renderContent() {
  const content = motdConfig.value.content;

  if (motdConfig.value.format === "markdown") {
    // Simple markdown rendering (in production, use a proper markdown parser)
    renderedContent.value = content
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/^# (.+)$/gm, "<h1>$1</h1>")
      .replace(/^## (.+)$/gm, "<h2>$1</h2>")
      .replace(/^### (.+)$/gm, "<h3>$1</h3>")
      .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>')
      .replace(/^- (.+)$/gm, "<li>$1</li>")
      .replace(/\n/g, "<br>");
  } else if (motdConfig.value.format === "html") {
    renderedContent.value = content;
  } else {
    renderedContent.value = content.replace(/\n/g, "<br>");
  }

  // Replace variables
  variables.value.forEach((variable) => {
    const regex = new RegExp(
      variable.key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      "g",
    );
    renderedContent.value = renderedContent.value.replace(
      regex,
      variable.example,
    );
  });
}

function applyMarkdownTool(tool: { name: string; pattern: string }) {
  const textarea = contentTextarea.value;
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

  // Restore focus and cursor position
  nextTick(() => {
    textarea.focus();
    const newCursorPos = selectionStart + replacement.length;
    textarea.setSelectionRange(newCursorPos, newCursorPos);
  });
}

function selectTemplate(template: MotdTemplate) {
  motdConfig.value = {
    ...motdConfig.value,
    content: template.content,
    style: { ...template.style },
    priority: template.priority,
  };
  hasUnsavedChanges.value = true;
  showTemplates.value = false;
}

function previewTemplate(template: MotdTemplate) {
  // Implementation for template preview
  console.log("Preview template:", template);
}

function restoreFromHistory(item: MotdHistoryItem) {
  motdConfig.value = { ...item.config };
  hasUnsavedChanges.value = true;
  showHistory.value = false;
}

function viewHistoryDetails(item: MotdHistoryItem) {
  // Implementation for viewing history details
  console.log("View history details:", item);
}

function insertVariable() {
  showVariablePicker.value = true;
}

function insertVariableAtCursor(variable: MotdVariable) {
  const textarea = contentTextarea.value;
  if (!textarea) return;

  const { selectionStart, selectionEnd } = textarea;
  const before = motdConfig.value.content.substring(0, selectionStart);
  const after = motdConfig.value.content.substring(selectionEnd);

  motdConfig.value.content = before + variable.key + after;
  showVariablePicker.value = false;

  // Restore focus and cursor position
  nextTick(() => {
    textarea.focus();
    const newCursorPos = selectionStart + variable.key.length;
    textarea.setSelectionRange(newCursorPos, newCursorPos);
  });
}

function insertLink() {
  const url = prompt("Enter URL:");
  const text = prompt("Enter link text:");
  if (url && text) {
    const link =
      motdConfig.value.format === "markdown"
        ? `[${text}](${url})`
        : `<a href="${url}">${text}</a>`;
    insertTextAtCursor(link);
  }
}

function insertImage() {
  const url = prompt("Enter image URL:");
  const alt = prompt("Enter alt text:");
  if (url) {
    const image =
      motdConfig.value.format === "markdown"
        ? `![${alt || "Image"}](${url})`
        : `<img src="${url}" alt="${alt || "Image"}" />`;
    insertTextAtCursor(image);
  }
}

function insertTextAtCursor(text: string) {
  const textarea = contentTextarea.value;
  if (!textarea) return;

  const { selectionStart, selectionEnd } = textarea;
  const before = motdConfig.value.content.substring(0, selectionStart);
  const after = motdConfig.value.content.substring(selectionEnd);

  motdConfig.value.content = before + text + after;

  nextTick(() => {
    textarea.focus();
    const newCursorPos = selectionStart + text.length;
    textarea.setSelectionRange(newCursorPos, newCursorPos);
  });
}

function executeQuickAction(action: { id: string; action: string }) {
  switch (action.action) {
    case "disableAll":
      motdConfig.value.enabled = false;
      hasUnsavedChanges.value = true;
      break;
    case "clearHistory":
      if (confirm("Are you sure you want to clear all history?")) {
        history.value = [];
        success.value = "History cleared successfully";
      }
      break;
    case "export":
      const data = JSON.stringify(motdConfig.value, null, 2);
      const blob = new Blob([data], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "motd-config.json";
      a.click();
      URL.revokeObjectURL(url);
      break;
    case "duplicate":
      const duplicate = { ...motdConfig.value };
      duplicate.content = `Copy of: ${duplicate.content}`;
      // Add to template or history
      break;
    // Add more quick actions as needed
  }
  showQuickActions.value = false;
}

// Helper functions
function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString();
}

function formatSchedule(schedule: any): string {
  if (!schedule.enabled) return "Not scheduled";
  const start = new Date(schedule.startDate).toLocaleDateString();
  const end = schedule.endDate
    ? new Date(schedule.endDate).toLocaleDateString()
    : "Indefinite";
  return `${start} - ${end}`;
}

function getPriorityVariant(priority: string): string {
  const variants: Record<string, string> = {
    low: "secondary",
    normal: "default",
    high: "warning",
    urgent: "danger",
  };
  return variants[priority] || "default";
}

function getPriorityIcon(priority: string): string {
  const icons: Record<string, string> = {
    low: "arrow-down",
    normal: "minus",
    high: "arrow-up",
    urgent: "exclamation",
  };
  return icons[priority] || "minus";
}

function getPriorityLabel(priority: string): string {
  const labels: Record<string, string> = {
    low: "Low Priority",
    normal: "Normal Priority",
    high: "High Priority",
    urgent: "Urgent",
  };
  return labels[priority] || priority;
}

function getAudienceLabel(audience: string): string {
  const option = audienceOptions.find((opt) => opt.value === audience);
  return option ? option.label : audience;
}

function getHistoryBadgeVariant(status: string): string {
  const variants: Record<string, string> = {
    active: "success",
    scheduled: "info",
    expired: "secondary",
    draft: "warning",
  };
  return variants[status] || "default";
}

// Watchers
watch(
  motdConfig,
  (newValue) => {
    hasUnsavedChanges.value =
      JSON.stringify(newValue) !== JSON.stringify(config.value);
    if (previewMode.value) {
      renderContent();
    }
  },
  { deep: true },
);

// Lifecycle
onMounted(async () => {
  await motdStore.fetchConfig();
  motdConfig.value = { ...config.value };
});
</script>

<style scoped>
.admin-motd-enhanced {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

/* Header */
.admin-motd-enhanced__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--n-color-border);
  flex-wrap: wrap;
  gap: 1rem;
}

.admin-motd-enhanced__title-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.admin-motd-enhanced__title {
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0;
}

.admin-motd-enhanced__quick-actions {
  display: flex;
  gap: 0.5rem;
}

.admin-motd-enhanced__actions {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

/* Alerts */
.admin-motd-enhanced__error,
.admin-motd-enhanced__success {
  margin-bottom: 1rem;
}

/* Main content */
.admin-motd-enhanced__main {
  flex: 1;
  overflow: hidden;
}

/* Preview container */
.admin-motd-enhanced__preview-container {
  height: 100%;
  overflow-y: auto;
  padding: 1rem;
  background-color: var(--n-color-background-alt);
  border-radius: var(--n-border-radius);
}

.admin-motd-enhanced__preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.admin-motd-enhanced__preview-title {
  font-size: 1.2rem;
  font-weight: 600;
  margin: 0;
}

.admin-motd-enhanced__preview-info {
  display: flex;
  gap: 0.5rem;
}

.admin-motd-enhanced__preview-content {
  position: relative;
  padding: 1rem;
  border: 2px solid;
  border-radius: var(--n-border-radius);
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1rem;
}

.admin-motd-enhanced__preview-icon {
  font-size: 1.5rem;
  min-width: 1.5rem;
}

.admin-motd-enhanced__preview-text {
  flex: 1;
  line-height: 1.5;
}

.admin-motd-enhanced__preview-text h1,
.admin-motd-enhanced__preview-text h2,
.admin-motd-enhanced__preview-text h3 {
  margin-top: 0;
  margin-bottom: 0.5rem;
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
  transition: background-color 0.2s;
}

.admin-motd-enhanced__preview-dismiss:hover {
  background-color: rgba(0, 0, 0, 0.2);
}

.admin-motd-enhanced__preview-schedule {
  display: flex;
  gap: 1rem;
  padding: 0.75rem;
  background-color: var(--n-color-background);
  border-radius: var(--n-border-radius);
}

.admin-motd-enhanced__schedule-info,
.admin-motd-enhanced__audience-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--n-color-text-secondary);
  font-size: 0.9rem;
}

/* Editor mode */
.admin-motd-enhanced__editor {
  display: grid;
  grid-template-columns: 350px 1fr;
  gap: 1.5rem;
  height: 100%;
  overflow: hidden;
}

.admin-motd-enhanced__settings-panel {
  overflow-y: auto;
  padding-right: 0.5rem;
}

.admin-motd-enhanced__settings-card {
  margin-bottom: 1rem;
}

.admin-motd-enhanced__card-title {
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
}

.admin-motd-enhanced__field {
  margin-bottom: 1rem;
}

.admin-motd-enhanced__field:last-child {
  margin-bottom: 0;
}

.admin-motd-enhanced__label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
}

/* Content editor */
.admin-motd-enhanced__content-editor {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  overflow-y: auto;
  padding-right: 0.5rem;
}

.admin-motd-enhanced__editor-card {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.admin-motd-enhanced__editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.admin-motd-enhanced__editor-actions {
  display: flex;
  gap: 0.5rem;
}

/* Markdown editor */
.admin-motd-enhanced__markdown-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.admin-motd-enhanced__toolbar {
  display: flex;
  gap: 0.25rem;
  margin-bottom: 0.5rem;
  border: 1px solid var(--n-color-border);
  border-radius: var(--n-border-radius);
  padding: 0.25rem;
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
  transition: background-color 0.2s;
}

.admin-motd-enhanced__toolbar-button:hover {
  background-color: var(--n-color-hover);
}

.admin-motd-enhanced__content-textarea {
  flex: 1;
  width: 100%;
  min-height: 300px;
  border: 1px solid var(--n-color-border);
  border-radius: var(--n-border-radius);
  padding: 0.75rem;
  font-family: "Monaco", "Menlo", "Ubuntu Mono", monospace;
  font-size: 0.9rem;
  resize: vertical;
  background-color: var(--n-color-background);
  color: var(--n-color-text-primary);
}

.admin-motd-enhanced__content-textarea:focus {
  outline: none;
  border-color: var(--n-color-primary);
}

.admin-motd-enhanced__markdown-help {
  margin-top: 0.5rem;
}

.admin-motd-enhanced__markdown-help details {
  background-color: var(--n-color-background-alt);
  border-radius: var(--n-border-radius);
  padding: 0.5rem;
}

.admin-motd-enhanced__markdown-help summary {
  cursor: pointer;
  font-weight: 500;
  user-select: none;
}

.admin-motd-enhanced__help-list {
  margin: 0.5rem 0 0 1.5rem;
  padding: 0;
  font-size: 0.85rem;
}

.admin-motd-enhanced__help-list li {
  margin-bottom: 0.25rem;
}

.admin-motd-enhanced__help-list code {
  background-color: var(--n-color-background);
  padding: 0.1rem 0.3rem;
  border-radius: 3px;
  font-size: 0.85em;
}

/* Character count */
.admin-motd-enhanced__char-count {
  text-align: right;
  font-size: 0.85rem;
  color: var(--n-color-text-secondary);
  margin-top: 0.5rem;
}

/* Templates modal */
.admin-motd-enhanced__templates {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.admin-motd-enhanced__template-search {
  margin-bottom: 1rem;
}

.admin-motd-enhanced__template-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  max-height: 400px;
  overflow-y: auto;
}

.admin-motd-enhanced__template-item {
  display: flex;
  gap: 1rem;
  padding: 1rem;
  border: 1px solid var(--n-color-border);
  border-radius: var(--n-border-radius);
  cursor: pointer;
  transition:
    background-color 0.2s,
    border-color 0.2s;
}

.admin-motd-enhanced__template-item:hover {
  background-color: var(--n-color-hover);
  border-color: var(--n-color-primary);
}

.admin-motd-enhanced__template-icon {
  font-size: 2rem;
  color: var(--n-color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 3rem;
  height: 3rem;
  background-color: var(--n-color-primary-light);
  border-radius: var(--n-border-radius);
}

.admin-motd-enhanced__template-content {
  flex: 1;
}

.admin-motd-enhanced__template-title {
  font-weight: 600;
  margin: 0 0 0.25rem 0;
}

.admin-motd-enhanced__template-description {
  color: var(--n-color-text-secondary);
  font-size: 0.9rem;
  margin: 0 0 0.5rem 0;
}

.admin-motd-enhanced__template-tags {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

/* History modal */
.admin-motd-enhanced__history {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.admin-motd-enhanced__history-filters {
  display: flex;
  gap: 1rem;
  align-items: flex-end;
}

.admin-motd-enhanced__history-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  max-height: 400px;
  overflow-y: auto;
}

.admin-motd-enhanced__history-item {
  display: flex;
  gap: 1rem;
  padding: 1rem;
  border: 1px solid var(--n-color-border);
  border-radius: var(--n-border-radius);
}

.admin-motd-enhanced__history-date {
  font-size: 0.85rem;
  color: var(--n-color-text-secondary);
  min-width: 140px;
}

.admin-motd-enhanced__history-content {
  flex: 1;
}

.admin-motd-enhanced__history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.admin-motd-enhanced__history-title {
  font-weight: 600;
  margin: 0;
}

.admin-motd-enhanced__history-preview {
  color: var(--n-color-text-secondary);
  font-size: 0.9rem;
  margin: 0 0 0.5rem 0;
}

.admin-motd-enhanced__history-meta {
  display: flex;
  gap: 1rem;
  font-size: 0.85rem;
  color: var(--n-color-text-secondary);
}

.admin-motd-enhanced__history-actions {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

/* Variable picker */
.admin-motd-enhanced__variable-picker {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.admin-motd-enhanced__variable-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: 300px;
  overflow-y: auto;
}

.admin-motd-enhanced__variable-item {
  display: flex;
  gap: 1rem;
  padding: 0.75rem;
  border: 1px solid var(--n-color-border);
  border-radius: var(--n-border-radius);
  cursor: pointer;
  transition: background-color 0.2s;
}

.admin-motd-enhanced__variable-item:hover {
  background-color: var(--n-color-hover);
}

.admin-motd-enhanced__variable-key {
  font-family: monospace;
  font-weight: 600;
  color: var(--n-color-primary);
  min-width: 120px;
}

.admin-motd-enhanced__variable-desc {
  flex: 1;
  color: var(--n-color-text-secondary);
}

.admin-motd-enhanced__variable-example {
  font-size: 0.85rem;
  color: var(--n-color-text-tertiary);
  font-style: italic;
}

/* Quick actions menu */
.admin-motd-enhanced__quick-menu {
  position: fixed;
  top: 50%;
  right: 1rem;
  transform: translateY(-50%);
  z-index: 1000;
}

.admin-motd-enhanced__quick-card {
  width: 200px;
}

.admin-motd-enhanced__quick-title {
  font-size: 0.9rem;
  font-weight: 600;
  margin: 0 0 1rem 0;
}

.admin-motd-enhanced__quick-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.admin-motd-enhanced__quick-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem;
  background: transparent;
  border: none;
  border-radius: var(--n-border-radius);
  cursor: pointer;
  text-align: left;
  transition: background-color 0.2s;
}

.admin-motd-enhanced__quick-item:hover {
  background-color: var(--n-color-hover);
}

/* Responsive design */
@media (max-width: 1200px) {
  .admin-motd-enhanced__editor {
    grid-template-columns: 300px 1fr;
  }
}

@media (max-width: 768px) {
  .admin-motd-enhanced__header {
    flex-direction: column;
    align-items: stretch;
  }

  .admin-motd-enhanced__quick-actions,
  .admin-motd-enhanced__actions {
    justify-content: space-between;
  }

  .admin-motd-enhanced__editor {
    grid-template-columns: 1fr;
  }

  .admin-motd-enhanced__settings-panel {
    display: none;
  }

  .admin-motd-enhanced__content-editor {
    padding-right: 0;
  }

  .admin-motd-enhanced__history-filters {
    flex-direction: column;
    align-items: stretch;
  }

  .admin-motd-enhanced__quick-menu {
    display: none;
  }
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .admin-motd-enhanced__preview-container {
    background-color: rgba(255, 255, 255, 0.05);
  }

  .admin-motd-enhanced__markdown-help details {
    background-color: rgba(255, 255, 255, 0.05);
  }

  .admin-motd-enhanced__help-list code {
    background-color: rgba(255, 255, 255, 0.1);
  }
}
</style>
