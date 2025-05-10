<template>
  <div class="admin-motd">
    <div class="admin-motd__header">
      <h2 class="admin-motd__title">{{ t('admin.motd.title', 'Message of the Day Editor') }}</h2>
      <div class="admin-motd__actions">
        <BaseButton 
          variant="primary" 
          :disabled="!hasUnsavedChanges" 
          @click="saveMotd"
          :loading="loading"
        >
          {{ t('admin.motd.save', 'Speichern') }}
        </BaseButton>
        <BaseButton 
          variant="secondary" 
          :disabled="!hasUnsavedChanges" 
          @click="resetMotd"
        >
          {{ t('admin.motd.reset', 'Zurücksetzen') }}
        </BaseButton>
        <BaseButton 
          variant="outline" 
          @click="togglePreview"
        >
          {{ previewMode 
            ? t('admin.motd.edit', 'Bearbeiten') 
            : t('admin.motd.preview', 'Vorschau') 
          }}
        </BaseButton>
      </div>
    </div>
    
    <div v-if="error" class="admin-motd__error">
      <Alert 
        type="error" 
        :message="error" 
        dismissible 
        @dismiss="error = null"
      />
    </div>

    <!-- Main Editor -->
    <div v-if="!previewMode" class="admin-motd__editor">
      <!-- Settings Panel -->
      <div class="admin-motd__settings-panel">
        <fieldset class="admin-motd__fieldset">
          <legend class="admin-motd__legend">{{ t('admin.motd.generalSettings', 'Allgemeine Einstellungen') }}</legend>
          
          <div class="admin-motd__field">
            <BaseCheckbox 
              v-model="motdConfig.enabled" 
              :label="t('admin.motd.enabled', 'Aktiviert')"
            />
          </div>
          
          <div class="admin-motd__field">
            <label class="admin-motd__label">{{ t('admin.motd.format', 'Format') }}</label>
            <BaseSelect 
              v-model="motdConfig.format" 
              :options="formatOptions"
            />
          </div>
        </fieldset>
        
        <fieldset class="admin-motd__fieldset">
          <legend class="admin-motd__legend">{{ t('admin.motd.displaySettings', 'Anzeige-Einstellungen') }}</legend>
          
          <div class="admin-motd__field">
            <label class="admin-motd__label">{{ t('admin.motd.position', 'Position') }}</label>
            <BaseSelect 
              v-model="motdConfig.display.position" 
              :options="positionOptions"
            />
          </div>
          
          <div class="admin-motd__field">
            <BaseCheckbox 
              v-model="motdConfig.display.dismissible" 
              :label="t('admin.motd.dismissible', 'Schließbar')"
            />
          </div>
          
          <div class="admin-motd__field">
            <BaseCheckbox 
              v-model="motdConfig.display.showOnStartup" 
              :label="t('admin.motd.showOnStartup', 'Beim Start anzeigen')"
            />
          </div>
          
          <div class="admin-motd__field">
            <BaseCheckbox 
              v-model="motdConfig.display.showInChat" 
              :label="t('admin.motd.showInChat', 'Im Chat anzeigen')"
            />
          </div>
        </fieldset>
        
        <fieldset class="admin-motd__fieldset">
          <legend class="admin-motd__legend">{{ t('admin.motd.styleSettings', 'Stil-Einstellungen') }}</legend>
          
          <div class="admin-motd__field">
            <label class="admin-motd__label">{{ t('admin.motd.backgroundColor', 'Hintergrundfarbe') }}</label>
            <div class="admin-motd__color-picker">
              <input 
                type="color" 
                v-model="motdConfig.style.backgroundColor" 
                class="admin-motd__color-input"
              />
              <BaseInput 
                v-model="motdConfig.style.backgroundColor" 
                class="admin-motd__color-value"
              />
            </div>
          </div>
          
          <div class="admin-motd__field">
            <label class="admin-motd__label">{{ t('admin.motd.borderColor', 'Rahmenfarbe') }}</label>
            <div class="admin-motd__color-picker">
              <input 
                type="color" 
                v-model="motdConfig.style.borderColor" 
                class="admin-motd__color-input"
              />
              <BaseInput 
                v-model="motdConfig.style.borderColor" 
                class="admin-motd__color-value"
              />
            </div>
          </div>
          
          <div class="admin-motd__field">
            <label class="admin-motd__label">{{ t('admin.motd.textColor', 'Textfarbe') }}</label>
            <div class="admin-motd__color-picker">
              <input 
                type="color" 
                v-model="motdConfig.style.textColor" 
                class="admin-motd__color-input"
              />
              <BaseInput 
                v-model="motdConfig.style.textColor" 
                class="admin-motd__color-value"
              />
            </div>
          </div>
          
          <div class="admin-motd__field">
            <label class="admin-motd__label">{{ t('admin.motd.icon', 'Icon') }}</label>
            <BaseSelect 
              v-model="motdConfig.style.iconClass" 
              :options="iconOptions"
            />
          </div>
        </fieldset>
        
        <fieldset class="admin-motd__fieldset">
          <legend class="admin-motd__legend">{{ t('admin.motd.scheduling', 'Zeitplanung') }}</legend>
          
          <div class="admin-motd__field">
            <BaseCheckbox 
              v-model="scheduling.enabled" 
              :label="t('admin.motd.schedulingEnabled', 'Zeitplan aktivieren')"
            />
          </div>
          
          <template v-if="scheduling.enabled">
            <div class="admin-motd__field">
              <label class="admin-motd__label">{{ t('admin.motd.startDate', 'Startdatum') }}</label>
              <BaseInput 
                type="datetime-local" 
                v-model="scheduling.startDate" 
              />
            </div>
            
            <div class="admin-motd__field">
              <label class="admin-motd__label">{{ t('admin.motd.endDate', 'Enddatum') }}</label>
              <BaseInput 
                type="datetime-local" 
                v-model="scheduling.endDate" 
              />
            </div>
            
            <div class="admin-motd__field">
              <label class="admin-motd__label">{{ t('admin.motd.audience', 'Zielgruppe') }}</label>
              <BaseSelect 
                v-model="scheduling.audience" 
                :options="audienceOptions"
              />
            </div>
          </template>
        </fieldset>
        
        <fieldset class="admin-motd__fieldset">
          <legend class="admin-motd__legend">{{ t('admin.motd.versionHistory', 'Versionshistorie') }}</legend>
          
          <div v-if="versionHistory.length === 0" class="admin-motd__empty-history">
            {{ t('admin.motd.noVersions', 'Keine früheren Versionen vorhanden') }}
          </div>
          
          <div v-else class="admin-motd__version-list">
            <div 
              v-for="(version, index) in versionHistory" 
              :key="index"
              class="admin-motd__version-item"
            >
              <div class="admin-motd__version-info">
                <span class="admin-motd__version-date">{{ formatDate(version.timestamp) }}</span>
                <span class="admin-motd__version-user">{{ version.user }}</span>
              </div>
              <BaseButton 
                size="small" 
                variant="outline" 
                @click="restoreVersion(version)"
              >
                {{ t('admin.motd.restore', 'Wiederherstellen') }}
              </BaseButton>
            </div>
          </div>
        </fieldset>
      </div>
      
      <!-- Content Editor -->
      <div class="admin-motd__content-editor">
        <label class="admin-motd__content-label">{{ t('admin.motd.content', 'Inhalt') }}</label>
        
        <div class="admin-motd__toolbar" v-if="motdConfig.format === 'markdown'">
          <button 
            v-for="tool in markdownTools" 
            :key="tool.name" 
            class="admin-motd__toolbar-button" 
            @click="applyMarkdownTool(tool)"
            :title="tool.title"
          >
            <i :class="['fas', tool.icon]"></i>
          </button>
        </div>
        
        <textarea
          v-model="motdConfig.content"
          class="admin-motd__content-textarea"
          :placeholder="t('admin.motd.contentPlaceholder', 'Geben Sie hier den Inhalt der Nachricht ein...')"
          rows="15"
        ></textarea>
        
        <div class="admin-motd__content-help" v-if="motdConfig.format === 'markdown'">
          <div class="admin-motd__help-title">{{ t('admin.motd.markdownHelp', 'Markdown-Hilfe') }}</div>
          <div class="admin-motd__help-content">
            <ul class="admin-motd__help-list">
              <li><code>**Text**</code> - {{ t('admin.motd.boldText', 'Fettgedruckter Text') }}</li>
              <li><code>*Text*</code> - {{ t('admin.motd.italicText', 'Kursiver Text') }}</li>
              <li><code># Titel</code> - {{ t('admin.motd.heading', 'Überschrift') }}</li>
              <li><code>- Element</code> - {{ t('admin.motd.listItem', 'Listenelement') }}</li>
              <li><code>[Link](URL)</code> - {{ t('admin.motd.link', 'Link') }}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Preview Mode -->
    <div v-else class="admin-motd__preview">
      <div class="admin-motd__preview-header">
        <h3 class="admin-motd__preview-title">{{ t('admin.motd.previewTitle', 'Vorschau') }}</h3>
        <div class="admin-motd__preview-info">
          {{ motdConfig.enabled
            ? t('admin.motd.previewEnabled', 'Diese Nachricht ist aktiviert und wird angezeigt.')
            : t('admin.motd.previewDisabled', 'Diese Nachricht ist deaktiviert und wird nicht angezeigt.')
          }}
        </div>
      </div>
      
      <div 
        class="admin-motd__preview-content"
        :style="{
          backgroundColor: motdConfig.style.backgroundColor,
          borderColor: motdConfig.style.borderColor,
          color: motdConfig.style.textColor
        }"
      >
        <div class="admin-motd__preview-icon">
          <i :class="['fas', `fa-${motdConfig.style.iconClass}`]"></i>
        </div>
        <div 
          class="admin-motd__preview-text"
          v-html="previewHtml"
        ></div>
        <div v-if="motdConfig.display.dismissible" class="admin-motd__preview-dismiss">
          <i class="fas fa-times"></i>
        </div>
      </div>
      
      <div class="admin-motd__preview-info" v-if="scheduling.enabled">
        <div class="admin-motd__preview-scheduling">
          <div class="admin-motd__preview-scheduling-item">
            <strong>{{ t('admin.motd.scheduledStart', 'Geplanter Start') }}:</strong> {{ formatDate(scheduling.startDate) }}
          </div>
          <div class="admin-motd__preview-scheduling-item">
            <strong>{{ t('admin.motd.scheduledEnd', 'Geplantes Ende') }}:</strong> {{ formatDate(scheduling.endDate) }}
          </div>
          <div class="admin-motd__preview-scheduling-item">
            <strong>{{ t('admin.motd.targetAudience', 'Zielgruppe') }}:</strong> {{ getAudienceLabel(scheduling.audience) }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { useAdminMotdStore } from '@/stores/admin/motd';
import type { MotdConfig } from '@/types/admin';

// UI Components
import { BaseButton, BaseInput, BaseSelect, BaseCheckbox, Alert } from '@/components/ui/base';

// i18n
const { t } = useI18n();

// Store
const motdStore = useAdminMotdStore();
const { config, loading, error, previewMode, hasUnsavedChanges, previewHtml } = storeToRefs(motdStore);

// Local state for the component
const motdConfig = ref<MotdConfig>({...config.value});
const scheduling = ref({
  enabled: false,
  startDate: new Date().toISOString().slice(0, 16),
  endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
  audience: 'all'
});
const versionHistory = ref<Array<{timestamp: number, user: string, config: MotdConfig}>>([]);

// Options for select fields
const formatOptions = [
  { value: 'markdown', label: t('admin.motd.formatMarkdown', 'Markdown') },
  { value: 'html', label: t('admin.motd.formatHtml', 'HTML') },
  { value: 'text', label: t('admin.motd.formatText', 'Text') }
];

const positionOptions = [
  { value: 'top', label: t('admin.motd.positionTop', 'Oben') },
  { value: 'bottom', label: t('admin.motd.positionBottom', 'Unten') }
];

const iconOptions = [
  { value: 'info-circle', label: t('admin.motd.iconInfo', 'Information') },
  { value: 'exclamation-triangle', label: t('admin.motd.iconWarning', 'Warnung') },
  { value: 'check-circle', label: t('admin.motd.iconSuccess', 'Erfolg') },
  { value: 'exclamation-circle', label: t('admin.motd.iconError', 'Fehler') },
  { value: 'bell', label: t('admin.motd.iconNotification', 'Benachrichtigung') },
  { value: 'lightbulb', label: t('admin.motd.iconTip', 'Tipp') },
  { value: 'user-shield', label: t('admin.motd.iconSecurity', 'Sicherheit') },
  { value: 'tools', label: t('admin.motd.iconMaintenance', 'Wartung') }
];

const audienceOptions = [
  { value: 'all', label: t('admin.motd.audienceAll', 'Alle Benutzer') },
  { value: 'admins', label: t('admin.motd.audienceAdmins', 'Nur Administratoren') },
  { value: 'users', label: t('admin.motd.audienceUsers', 'Nur Standardbenutzer') }
];

const markdownTools = [
  { name: 'bold', icon: 'fa-bold', title: t('admin.motd.toolBold', 'Fett'), pattern: '**$selection$**' },
  { name: 'italic', icon: 'fa-italic', title: t('admin.motd.toolItalic', 'Kursiv'), pattern: '*$selection$*' },
  { name: 'heading', icon: 'fa-heading', title: t('admin.motd.toolHeading', 'Überschrift'), pattern: '## $selection$' },
  { name: 'list', icon: 'fa-list-ul', title: t('admin.motd.toolList', 'Liste'), pattern: '- $selection$' },
  { name: 'link', icon: 'fa-link', title: t('admin.motd.toolLink', 'Link'), pattern: '[$selection$](https://)' },
  { name: 'code', icon: 'fa-code', title: t('admin.motd.toolCode', 'Code'), pattern: '`$selection$`' },
  { name: 'quote', icon: 'fa-quote-right', title: t('admin.motd.toolQuote', 'Zitat'), pattern: '> $selection$' },
  { name: 'emoji', icon: 'fa-smile', title: t('admin.motd.toolEmoji', 'Emoji 🙂'), pattern: '🙂 $selection$' }
];

// Methods
function applyMarkdownTool(tool: { name: string, pattern: string }) {
  const textarea = document.querySelector('.admin-motd__content-textarea') as HTMLTextAreaElement;
  
  if (!textarea) return;
  
  const { selectionStart, selectionEnd } = textarea;
  const selectedText = motdConfig.value.content.substring(selectionStart, selectionEnd);
  const replacement = tool.pattern.replace('$selection$', selectedText || '');
  
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

function formatDate(dateString: string | number): string {
  const date = new Date(dateString);
  return date.toLocaleString();
}

function getAudienceLabel(audience: string): string {
  const option = audienceOptions.find(opt => opt.value === audience);
  return option ? option.label : audience;
}

async function loadMotd() {
  try {
    await motdStore.fetchConfig();
    motdConfig.value = {...config.value};
    
    // Simulate version history
    versionHistory.value = [
      {
        timestamp: Date.now() - 20 * 24 * 60 * 60 * 1000,
        user: 'admin@example.com',
        config: {...motdConfig.value, content: 'Previous version from 20 days ago'}
      },
      {
        timestamp: Date.now() - 10 * 24 * 60 * 60 * 1000,
        user: 'admin@example.com',
        config: {...motdConfig.value, content: 'Previous version from 10 days ago'}
      }
    ];
  } catch (err) {
    console.error('Failed to load MOTD configuration', err);
  }
}

async function saveMotd() {
  try {
    // If scheduling is enabled, add a new version to the history
    if (scheduling.enabled) {
      versionHistory.value.unshift({
        timestamp: Date.now(),
        user: 'current-user@example.com',
        config: {...motdConfig.value}
      });
    }
    
    await motdStore.updateConfig(motdConfig.value);
    await motdStore.saveConfig();
  } catch (err) {
    console.error('Failed to save MOTD configuration', err);
  }
}

function resetMotd() {
  motdStore.resetConfig();
  motdConfig.value = {...config.value};
}

function togglePreview() {
  motdStore.togglePreviewMode();
}

function restoreVersion(version: {timestamp: number, user: string, config: MotdConfig}) {
  motdConfig.value = {...version.config};
}

// Sync between store and local state
watch(() => config.value, (newValue) => {
  motdConfig.value = {...newValue};
}, { deep: true });

// Lifecycle hooks
onMounted(async () => {
  await loadMotd();
});
</script>

<style scoped>
.admin-motd {
  width: 100%;
  height: 100%;
  overflow-y: auto;
}

.admin-motd__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--n-color-border);
}

.admin-motd__title {
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0;
}

.admin-motd__actions {
  display: flex;
  gap: 0.5rem;
}

.admin-motd__error {
  margin-bottom: 1rem;
}

.admin-motd__editor {
  display: grid;
  grid-template-columns: 300px 1fr;
  gap: 1.5rem;
}

.admin-motd__settings-panel {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.admin-motd__fieldset {
  border: 1px solid var(--n-color-border);
  border-radius: var(--n-border-radius);
  padding: 1rem;
}

.admin-motd__legend {
  font-weight: 600;
  font-size: 0.9rem;
  padding: 0 0.5rem;
}

.admin-motd__field {
  margin-bottom: 1rem;
}

.admin-motd__field:last-child {
  margin-bottom: 0;
}

.admin-motd__label {
  display: block;
  margin-bottom: 0.3rem;
  font-size: 0.9rem;
}

.admin-motd__color-picker {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.admin-motd__color-input {
  width: 40px;
  height: 40px;
  border: none;
  border-radius: var(--n-border-radius);
  cursor: pointer;
}

.admin-motd__color-value {
  flex: 1;
}

.admin-motd__empty-history {
  font-style: italic;
  color: var(--n-color-text-secondary);
  font-size: 0.9rem;
}

.admin-motd__version-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: 200px;
  overflow-y: auto;
}

.admin-motd__version-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem;
  border: 1px solid var(--n-color-border);
  border-radius: var(--n-border-radius);
  background-color: var(--n-color-background-alt);
}

.admin-motd__version-info {
  display: flex;
  flex-direction: column;
}

.admin-motd__version-date {
  font-size: 0.8rem;
  font-weight: 600;
}

.admin-motd__version-user {
  font-size: 0.8rem;
  color: var(--n-color-text-secondary);
}

.admin-motd__content-editor {
  display: flex;
  flex-direction: column;
}

.admin-motd__content-label {
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.admin-motd__toolbar {
  display: flex;
  gap: 0.25rem;
  margin-bottom: 0.5rem;
  border: 1px solid var(--n-color-border);
  border-radius: var(--n-border-radius);
  padding: 0.25rem;
  background-color: var(--n-color-background-alt);
}

.admin-motd__toolbar-button {
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

.admin-motd__toolbar-button:hover {
  background-color: var(--n-color-hover);
}

.admin-motd__content-textarea {
  width: 100%;
  min-height: 300px;
  border: 1px solid var(--n-color-border);
  border-radius: var(--n-border-radius);
  padding: 0.75rem;
  font-family: monospace;
  font-size: 0.9rem;
  resize: vertical;
  background-color: var(--n-color-background);
  color: var(--n-color-text-primary);
}

.admin-motd__content-help {
  margin-top: 1rem;
  border: 1px solid var(--n-color-border);
  border-radius: var(--n-border-radius);
  overflow: hidden;
}

.admin-motd__help-title {
  background-color: var(--n-color-background-alt);
  padding: 0.5rem 0.75rem;
  font-weight: 600;
  font-size: 0.9rem;
  border-bottom: 1px solid var(--n-color-border);
}

.admin-motd__help-content {
  padding: 0.75rem;
}

.admin-motd__help-list {
  margin: 0;
  padding-left: 1.25rem;
  font-size: 0.9rem;
}

.admin-motd__help-list li {
  margin-bottom: 0.3rem;
}

.admin-motd__help-list code {
  background-color: var(--n-color-background-alt);
  padding: 0.15rem 0.3rem;
  border-radius: 3px;
  font-size: 0.85rem;
}

/* Preview Mode */
.admin-motd__preview {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.admin-motd__preview-header {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.admin-motd__preview-title {
  font-size: 1.2rem;
  font-weight: 600;
  margin: 0;
}

.admin-motd__preview-info {
  color: var(--n-color-text-secondary);
  font-size: 0.9rem;
}

.admin-motd__preview-content {
  position: relative;
  padding: 1rem;
  border: 1px solid;
  border-radius: var(--n-border-radius);
  display: flex;
  align-items: flex-start;
  gap: 1rem;
}

.admin-motd__preview-icon {
  font-size: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 1.5rem;
}

.admin-motd__preview-text {
  flex: 1;
  line-height: 1.5;
}

.admin-motd__preview-dismiss {
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
}

.admin-motd__preview-scheduling {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 1rem;
  padding: 1rem;
  border: 1px solid var(--n-color-border);
  border-radius: var(--n-border-radius);
  background-color: var(--n-color-background-alt);
}

/* Responsive Design */
@media (max-width: 768px) {
  .admin-motd__editor {
    grid-template-columns: 1fr;
  }
  
  .admin-motd__header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
  
  .admin-motd__actions {
    width: 100%;
    justify-content: space-between;
  }
}
</style>