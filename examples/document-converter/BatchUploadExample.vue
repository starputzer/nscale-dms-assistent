<template>
  <div class="batch-upload-example">
    <h2>Batch Upload Example</h2>
    <div class="container">
      <BatchUpload
        :maxFiles="maxFiles"
        :maxFileSize="maxFileSize"
        :maxTotalSize="maxTotalSize"
        :allowedExtensions="allowedExtensions"
        :enablePrioritization="enablePrioritization"
        :enableAutoConvert="enableAutoConvert"
        :enableResume="enableResume"
        @start-batch="handleBatchStart"
        @upload-single="handleSingleUpload"
        @batch-completed="handleBatchComplete"
        @batch-canceled="handleBatchCancel"
      />

      <div class="settings-panel">
        <h3>Component Settings</h3>
        <div class="settings-group">
          <label>
            Max Files:
            <input type="number" v-model.number="maxFiles" min="1" max="100">
          </label>
          
          <label>
            Max File Size (MB):
            <input type="number" v-model.number="maxFileSizeMB" min="1" max="1000">
          </label>
          
          <label>
            Max Total Size (MB):
            <input type="number" v-model.number="maxTotalSizeMB" min="1" max="2000">
          </label>
        </div>

        <div class="settings-group">
          <label>
            <input type="checkbox" v-model="enablePrioritization">
            Enable Prioritization
          </label>
          
          <label>
            <input type="checkbox" v-model="enableAutoConvert">
            Auto-Convert After Upload
          </label>
          
          <label>
            <input type="checkbox" v-model="enableResume">
            Enable Resume Support
          </label>
        </div>

        <div class="settings-group">
          <label>Allowed Extensions:</label>
          <div class="extension-toggles">
            <label v-for="ext in availableExtensions" :key="ext">
              <input 
                type="checkbox" 
                :value="ext" 
                v-model="selectedExtensions"
              >
              {{ ext.toUpperCase() }}
            </label>
          </div>
        </div>
      </div>
    </div>

    <div class="events-log">
      <h3>Events Log</h3>
      <div class="log-container">
        <div v-for="(log, index) in eventLogs" :key="index" class="log-entry">
          <span class="log-time">{{ log.time }}</span>
          <span class="log-type" :class="`log-type--${log.type}`">{{ log.type.toUpperCase() }}</span>
          <span class="log-message">{{ log.message }}</span>
        </div>
      </div>
      <button class="clear-log" @click="clearLog">Clear Log</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import BatchUpload from '@/components/admin/document-converter/BatchUpload.vue';
import { useToast } from '@/composables/useToast';

const toast = useToast();

// Component settings
const maxFiles = ref(25);
const maxFileSizeMB = ref(50);
const maxTotalSizeMB = ref(500);
const enablePrioritization = ref(true);
const enableAutoConvert = ref(true);
const enableResume = ref(true);

// Available extensions
const availableExtensions = [
  'pdf', 'docx', 'xlsx', 'pptx', 'html', 'htm', 'txt', 'csv'
];
const selectedExtensions = ref(['pdf', 'docx', 'xlsx', 'pptx', 'html', 'txt']);

// Computed properties for BatchUpload component
const maxFileSize = computed(() => maxFileSizeMB.value * 1024 * 1024);
const maxTotalSize = computed(() => maxTotalSizeMB.value * 1024 * 1024);
const allowedExtensions = computed(() => selectedExtensions.value);

// Event logs
interface LogEntry {
  time: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
}

const eventLogs = ref<LogEntry[]>([]);

// Helper function to add log entry
function addLog(type: 'info' | 'success' | 'warning' | 'error', message: string): void {
  const now = new Date();
  const time = now.toLocaleTimeString();
  eventLogs.value.unshift({ time, type, message });
}

// Event handlers
function handleBatchStart(files: File[], priorities: Record<string, string>): void {
  addLog('info', `Starting batch upload with ${files.length} files`);
  
  const priorityDistribution = Object.values(priorities).reduce((acc, priority) => {
    acc[priority] = (acc[priority] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  addLog('info', `Priority distribution: ${JSON.stringify(priorityDistribution)}`);
  
  // Show toast notification
  toast.info(`Starting upload of ${files.length} files`);
}

function handleSingleUpload(file: File, priority: string): void {
  addLog('info', `Single file upload: ${file.name} (Priority: ${priority})`);
  toast.info(`Uploading ${file.name}`);
}

function handleBatchComplete(results: any[]): void {
  addLog('success', `Batch upload completed with ${results.length} files`);
  toast.success(`Successfully uploaded ${results.length} files`);
}

function handleBatchCancel(): void {
  addLog('warning', 'Batch upload was canceled');
  toast.warning('Upload canceled');
}

// Clear log
function clearLog(): void {
  eventLogs.value = [];
}

// Initial log entry
addLog('info', 'BatchUpload component initialized');
</script>

<style scoped>
.batch-upload-example {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

h2 {
  font-size: 1.75rem;
  margin-bottom: 1.5rem;
  color: #2d3748;
}

.container {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 2rem;
  margin-bottom: 2rem;
}

.settings-panel {
  background-color: #f7fafc;
  border-radius: 8px;
  padding: 1.5rem;
  border: 1px solid #e2e8f0;
}

h3 {
  margin-top: 0;
  margin-bottom: 1rem;
  font-size: 1.25rem;
  color: #2d3748;
}

.settings-group {
  margin-bottom: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: #4a5568;
}

input[type="number"] {
  width: 70px;
  padding: 0.375rem;
  border: 1px solid #cbd5e0;
  border-radius: 4px;
}

.extension-toggles {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-top: 0.5rem;
}

.extension-toggles label {
  min-width: 80px;
}

.events-log {
  background-color: #1a202c;
  color: #e2e8f0;
  border-radius: 8px;
  padding: 1.5rem;
}

.events-log h3 {
  color: #e2e8f0;
  border-bottom: 1px solid #4a5568;
  padding-bottom: 0.75rem;
}

.log-container {
  height: 300px;
  overflow-y: auto;
  font-family: monospace;
  font-size: 0.875rem;
  line-height: 1.5;
}

.log-entry {
  padding: 0.5rem 0;
  border-bottom: 1px solid #2d3748;
  display: grid;
  grid-template-columns: 100px 100px 1fr;
  gap: 1rem;
  align-items: start;
}

.log-time {
  color: #a0aec0;
}

.log-type {
  font-weight: bold;
  padding: 0.125rem 0.375rem;
  border-radius: 4px;
  font-size: 0.75rem;
  display: inline-block;
}

.log-type--info {
  background-color: #2b6cb0;
  color: #ebf8ff;
}

.log-type--success {
  background-color: #2f855a;
  color: #f0fff4;
}

.log-type--warning {
  background-color: #c05621;
  color: #fffaf0;
}

.log-type--error {
  background-color: #c53030;
  color: #fff5f5;
}

.log-message {
  word-break: break-word;
}

.clear-log {
  margin-top: 1rem;
  padding: 0.5rem 1rem;
  background-color: #2d3748;
  color: #e2e8f0;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.875rem;
  transition: background-color 0.2s;
}

.clear-log:hover {
  background-color: #4a5568;
}

@media (max-width: 768px) {
  .container {
    grid-template-columns: 1fr;
  }
}
</style>