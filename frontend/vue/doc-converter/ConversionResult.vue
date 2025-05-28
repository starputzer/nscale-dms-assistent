<template>
  <div class="conversion-result">
    <div class="conversion-result-header">
      <h3>Konvertierungsergebnis</h3>
      <button @click="$emit('close')" class="close-btn">
        <i class="fa fa-times"></i>
      </button>
    </div>

    <div class="result-info">
      <div class="result-info-item">
        <span class="result-label">Originaldatei:</span>
        <span>{{ result.originalName }}</span>
      </div>
      <div class="result-info-item">
        <span class="result-label">Format:</span>
        <span>{{ result.originalFormat.toUpperCase() }}</span>
      </div>
      <div class="result-info-item">
        <span class="result-label">Größe:</span>
        <span>{{ formatFileSize(result.size) }}</span>
      </div>
      <div class="result-info-item">
        <span class="result-label">Konvertiert am:</span>
        <span>{{ formatDate(result.convertedAt) }}</span>
      </div>
      <div v-if="result.metadata?.pageCount" class="result-info-item">
        <span class="result-label">Seitenanzahl:</span>
        <span>{{ result.metadata.pageCount }}</span>
      </div>
    </div>

    <div class="result-tabs">
      <button
        class="tab-btn"
        :class="{ active: activeTab === 'text' }"
        @click="activeTab = 'text'"
      >
        Text
      </button>
      <button
        v-if="result.metadata?.tables?.length"
        class="tab-btn"
        :class="{ active: activeTab === 'tables' }"
        @click="activeTab = 'tables'"
      >
        Tabellen ({{ result.metadata.tables.length }})
      </button>
      <button
        class="tab-btn"
        :class="{ active: activeTab === 'metadata' }"
        @click="activeTab = 'metadata'"
      >
        Metadaten
      </button>
    </div>

    <div class="result-content">
      <!-- Text-Inhalt -->
      <div v-if="activeTab === 'text'" class="text-content">
        <div class="text-preview">{{ truncatedContent }}</div>
        <div class="text-actions">
          <button @click="downloadText" class="download-btn">
            <i class="fa fa-download"></i> Text herunterladen
          </button>
          <button @click="copyText" class="copy-btn">
            <i class="fa fa-copy"></i> In Zwischenablage kopieren
          </button>
        </div>
      </div>

      <!-- Tabellen-Inhalt -->
      <div v-else-if="activeTab === 'tables'" class="tables-content">
        <div v-if="result.metadata?.tables?.length" class="tables-list">
          <div
            v-for="(table, index) in result.metadata.tables"
            :key="index"
            class="table-item"
          >
            <h4>Tabelle {{ index + 1 }} (Seite {{ table.pageNumber }})</h4>
            <div class="table-info">
              <span
                >{{ table.rowCount }} Zeilen ×
                {{ table.columnCount }} Spalten</span
              >
            </div>
            <table v-if="table.data" class="table-preview">
              <thead v-if="table.headers">
                <tr>
                  <th v-for="(header, i) in table.headers" :key="i">
                    {{ header }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(row, rowIndex) in table.data.slice(0, 5)"
                  :key="rowIndex"
                >
                  <td v-for="(cell, cellIndex) in row" :key="cellIndex">
                    {{ cell }}
                  </td>
                </tr>
              </tbody>
            </table>
            <div v-else class="table-placeholder">
              Tabelleninhalte nicht verfügbar
            </div>
          </div>
        </div>
        <div v-else class="no-tables">Keine Tabellen im Dokument gefunden</div>
      </div>

      <!-- Metadaten-Inhalt -->
      <div v-else-if="activeTab === 'metadata'" class="metadata-content">
        <dl class="metadata-list">
          <template v-if="result.metadata">
            <div
              v-for="(value, key) in filteredMetadata"
              :key="key"
              class="metadata-item"
            >
              <dt>{{ formatMetadataKey(key) }}</dt>
              <dd>{{ formatMetadataValue(key, value) }}</dd>
            </div>
          </template>
          <div v-else class="no-metadata">Keine Metadaten verfügbar</div>
        </dl>
      </div>
    </div>

    <div class="result-actions">
      <button @click="downloadContent" class="action-btn">
        <i class="fa fa-file-download"></i> Vollständigen Text herunterladen
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from "vue";

const props = defineProps({
  result: {
    type: Object,
    required: true,
  },
});

const emit = defineEmits(["close", "download"]);

// Aktiver Tab
const activeTab = ref("text");

// Gekürzter Inhalt für die Vorschau
const truncatedContent = computed(() => {
  if (!props.result.content) return "Kein Inhalt verfügbar";

  const maxChars = 1000;
  const content = props.result.content;

  if (content.length <= maxChars) return content;

  return content.substring(0, maxChars) + "...";
});

// Gefilterte Metadaten ohne interne Attribute
const filteredMetadata = computed(() => {
  if (!props.result.metadata) return {};

  // Ignoriere spezifische Felder oder Felder mit Unterstrichen
  return Object.entries(props.result.metadata)
    .filter(([key]) => !key.startsWith("_") && key !== "tables")
    .reduce((obj, [key, value]) => {
      obj[key] = value;
      return obj;
    }, {});
});

// Text herunterladen
function downloadText() {
  const blob = new Blob([props.result.content || ""], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");

  a.href = url;
  a.download = `${props.result.originalName.split(".")[0]}.txt`;
  a.click();

  URL.revokeObjectURL(url);
}

// Text in die Zwischenablage kopieren
function copyText() {
  if (!props.result.content) return;

  navigator.clipboard
    .writeText(props.result.content)
    .then(() => {
      alert("Text wurde in die Zwischenablage kopiert");
    })
    .catch((err) => {
      console.error("Fehler beim Kopieren:", err);
      alert("Fehler beim Kopieren des Textes");
    });
}

// Vollständigen Inhalt herunterladen
function downloadContent() {
  emit("download", props.result.id);
}

// Hilfsfunktionen für die Formatierung
function formatFileSize(bytes) {
  if (!bytes) return "0 Bytes";

  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i)) + " " + sizes[i];
}

function formatDate(timestamp) {
  if (!timestamp) return "";

  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
  return date.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatMetadataKey(key) {
  // Konvertiere camelCase zu lesbaren Bezeichnungen
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

function formatMetadataValue(key, value) {
  if (value === null || value === undefined) return "–";

  if (
    key.includes("date") ||
    key.includes("Date") ||
    key.includes("time") ||
    key.includes("Time")
  ) {
    // Datum formatieren
    return formatDate(value);
  }

  if (Array.isArray(value)) {
    return value.join(", ");
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return value.toString();
}
</script>

<style scoped>
.conversion-result {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-bottom: 1.5rem;
  overflow: hidden;
}

.conversion-result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  background-color: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
}

.conversion-result-header h3 {
  margin: 0;
  font-size: 1.25rem;
  color: #343a40;
}

.close-btn {
  background: none;
  border: none;
  color: #6c757d;
  cursor: pointer;
  font-size: 1.25rem;
  padding: 0.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
}

.close-btn:hover {
  background-color: #e9ecef;
  color: #343a40;
}

.result-info {
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #e9ecef;
}

.result-info-item {
  display: flex;
  margin-bottom: 0.5rem;
}

.result-info-item:last-child {
  margin-bottom: 0;
}

.result-label {
  width: 140px;
  font-weight: 600;
  color: #495057;
}

.result-tabs {
  display: flex;
  border-bottom: 1px solid #e9ecef;
  background-color: #f8f9fa;
}

.tab-btn {
  padding: 0.75rem 1.5rem;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  font-weight: 500;
  color: #6c757d;
}

.tab-btn.active {
  border-bottom-color: #4a6cf7;
  color: #4a6cf7;
}

.result-content {
  padding: 1.5rem;
  max-height: 400px;
  overflow-y: auto;
}

.text-preview {
  white-space: pre-wrap;
  font-family: monospace;
  font-size: 0.9rem;
  background-color: #f8f9fa;
  padding: 1rem;
  border-radius: 4px;
  border: 1px solid #e9ecef;
  margin-bottom: 1rem;
  max-height: 300px;
  overflow-y: auto;
}

.text-actions {
  display: flex;
  gap: 0.75rem;
}

.download-btn,
.copy-btn {
  padding: 0.5rem 1rem;
  background-color: #f8f9fa;
  border: 1px solid #ced4da;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.download-btn:hover,
.copy-btn:hover {
  background-color: #e9ecef;
}

.tables-list {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.table-item {
  border: 1px solid #e9ecef;
  border-radius: 4px;
  overflow: hidden;
}

.table-item h4 {
  margin: 0;
  padding: 0.75rem 1rem;
  background-color: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
  font-size: 1rem;
}

.table-info {
  padding: 0.5rem 1rem;
  background-color: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
  font-size: 0.9rem;
  color: #6c757d;
}

.table-preview {
  width: 100%;
  border-collapse: collapse;
}

.table-preview th,
.table-preview td {
  padding: 0.5rem;
  border: 1px solid #e9ecef;
  text-align: left;
}

.table-preview th {
  background-color: #f8f9fa;
  font-weight: 600;
}

.table-placeholder {
  padding: 1rem;
  text-align: center;
  color: #6c757d;
}

.no-tables {
  padding: 2rem;
  text-align: center;
  color: #6c757d;
}

.metadata-list {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.75rem;
  margin: 0;
}

.metadata-item {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 1rem;
  align-items: baseline;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid #e9ecef;
}

.metadata-item dt {
  font-weight: 600;
  color: #495057;
}

.metadata-item dd {
  margin: 0;
}

.no-metadata {
  padding: 2rem;
  text-align: center;
  color: #6c757d;
}

.result-actions {
  padding: 1rem 1.5rem;
  border-top: 1px solid #e9ecef;
  display: flex;
  justify-content: flex-end;
}

.action-btn {
  padding: 0.5rem 1rem;
  background-color: #4a6cf7;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.action-btn:hover {
  background-color: #3a5ede;
}
</style>
