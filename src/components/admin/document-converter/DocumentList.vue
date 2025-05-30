<template>
  <div
    class="document-list"
    role="region"
    aria-labelledby="document-list-title"
  >
    <div class="document-list__header">
      <div class="document-list__title-area">
        <h3 id="document-list-title">
          {{ $t("documentList.title", "Konvertierte Dokumente") }}
        </h3>
        <div class="document-list__stats">
          <span class="document-list__document-count"
            >{{ filteredDocuments.length }}
            {{ $t("documentList.documentsFound", "Dokumente gefunden") }}</span
          >
          <span
            v-if="selectedDocuments.length > 0"
            class="document-list__selected-count"
            >({{ selectedDocuments.length }}
            {{ $t("documentList.selected", "ausgewählt") }})</span
          >
        </div>
      </div>

      <div class="document-list__actions">
        <div class="document-list__filter-container">
          <label for="status-filter" class="sr-only">{{
            $t("documentList.statusFilter", "Nach Status filtern")
          }}</label>
          <select
            id="status-filter"
            v-model="statusFilter"
            class="document-list__status-filter"
            aria-label="Status Filter"
            data-testid="status-filter"
          >
            <option value="">
              {{ $t("documentList.allStatuses", "Alle Status") }}
            </option>
            <option value="success">
              {{ $t("documentList.statusSuccess", "Erfolgreich") }}
            </option>
            <option value="error">
              {{ $t("documentList.statusError", "Fehler") }}
            </option>
            <option value="pending">
              {{ $t("documentList.statusPending", "Ausstehend") }}
            </option>
            <option value="processing">
              {{ $t("documentList.statusProcessing", "In Bearbeitung") }}
            </option>
          </select>
        </div>

        <div class="document-list__filter-container">
          <label for="format-filter" class="sr-only">{{
            $t("documentList.formatFilter", "Nach Format filtern")
          }}</label>
          <select
            id="format-filter"
            v-model="formatFilter"
            class="document-list__format-filter"
            aria-label="Format Filter"
          >
            <option value="">
              {{ $t("documentList.allFormats", "Alle Formate") }}
            </option>
            <option
              v-for="format in supportedFormats"
              :key="format"
              :value="format"
            >
              {{ format.toUpperCase() }}
            </option>
          </select>
        </div>

        <div class="document-list__sort-container">
          <label for="sort-by" class="sr-only">{{
            $t("documentList.sortBy", "Sortieren nach")
          }}</label>
          <select
            id="sort-by"
            v-model="sortBy"
            class="document-list__sort-by"
            aria-label="Sort By"
          >
            <option value="name">
              {{ $t("documentList.sortByName", "Name") }}
            </option>
            <option value="date">
              {{ $t("documentList.sortByDate", "Datum") }}
            </option>
            <option value="size">
              {{ $t("documentList.sortBySize", "Größe") }}
            </option>
            <option value="format">
              {{ $t("documentList.sortByFormat", "Format") }}
            </option>
          </select>

          <button
            @click="toggleSortDirection"
            class="document-list__sort-direction"
            :title="
              sortDirection === 'asc'
                ? $t('documentList.sortAscending', 'Aufsteigend sortieren')
                : $t('documentList.sortDescending', 'Absteigend sortieren')
            "
            aria-label="Toggle Sort Direction"
          >
            <i
              :class="
                sortDirection === 'asc' ? 'fa fa-sort-up' : 'fa fa-sort-down'
              "
            ></i>
          </button>
        </div>

        <div class="document-list__search-container">
          <label for="search-input" class="sr-only">{{
            $t("documentList.search", "Suchen")
          }}</label>
          <div class="document-list__search-input-wrapper">
            <i class="fa fa-search document-list__search-icon"></i>
            <input
              id="search-input"
              type="text"
              v-model="searchQuery"
              :placeholder="
                $t('documentList.searchPlaceholder', 'Dokumente durchsuchen...')
              "
              class="document-list__search-input"
              aria-label="Search documents"
              data-testid="search-input"
            />
            <button
              v-if="searchQuery"
              @click="clearSearch"
              class="document-list__clear-search-btn"
              aria-label="Clear search"
              data-testid="clear-search-btn"
            >
              <i class="fa fa-times"></i>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Batch Actions when multiple documents are selected -->
    <div
      v-if="selectedDocuments.length > 0"
      class="document-list__batch-actions"
      data-testid="batch-actions"
    >
      <div class="document-list__batch-action-buttons">
        <button
          @click="downloadSelectedDocuments"
          class="document-list__batch-action-btn"
          :disabled="!hasSuccessfulSelected"
        >
          <i class="fa fa-download"></i>
          {{ $t("documentList.downloadSelected", "Ausgewählte herunterladen") }}
        </button>
        <button
          @click="confirmDeleteSelected"
          class="document-list__batch-action-btn document-list__batch-action-btn--danger"
        >
          <i class="fa fa-trash"></i>
          {{ $t("documentList.deleteSelected", "Ausgewählte löschen") }}
        </button>
      </div>

      <button
        @click="clearSelection"
        class="document-list__clear-selection-btn"
      >
        <i class="fa fa-times"></i>
        {{ $t("documentList.clearSelection", "Auswahl aufheben") }}
      </button>
    </div>

    <!-- Loading state -->
    <div
      v-if="loading"
      class="document-list__loading-indicator"
      role="status"
      aria-live="polite"
    >
      <div class="document-list__spinner" aria-hidden="true"></div>
      <p>{{ $t("documentList.loading", "Lade Dokumente...") }}</p>
    </div>

    <!-- Empty state -->
    <div
      v-else-if="filteredDocuments.length === 0"
      class="document-list__empty-state"
      role="status"
      aria-live="polite"
    >
      <div class="document-list__empty-icon">
        <i class="fa fa-file-alt"></i>
      </div>
      <p v-if="documents.length === 0" class="document-list__empty-message">
        {{
          $t(
            "documentList.noDocuments",
            "Keine Dokumente gefunden. Laden Sie Dokumente hoch, um sie zu konvertieren.",
          )
        }}
      </p>
      <p v-else class="document-list__empty-message">
        {{
          $t(
            "documentList.noMatchingDocuments",
            "Keine Dokumente entsprechen Ihren Filterkriterien.",
          )
        }}
      </p>
      <button
        v-if="hasActiveFilters"
        @click="clearFilters"
        class="document-list__clear-filters-btn"
      >
        <i class="fa fa-filter-slash"></i>
        {{ $t("documentList.clearFilters", "Filter zurücksetzen") }}
      </button>
    </div>

    <!-- Document list -->
    <ul
      v-else
      class="document-list__items"
      role="list"
      aria-label="Converted documents list"
      data-testid="document-list"
    >
      <li
        v-for="document in paginatedDocuments"
        :key="document.id"
        class="document-list__item"
        :class="{
          'document-list__item--selected': isSelected(document.id),
          [`document-list__item--${document.status}`]: true,
          'document-list__item--swiping': swipingDocumentId === document.id,
        }"
        role="listitem"
        :aria-selected="isSelected(document.id)"
        v-touch="{
          tap: () => toggleDocumentSelection(document),
          left: () => handleSwipeLeft(document),
          right: () => handleSwipeRight(document),
        }"
        @keydown.enter="toggleDocumentSelection(document)"
        @keydown.space="toggleDocumentSelection(document)"
        @keydown.delete="confirmDelete(document)"
        tabindex="0"
        data-testid="document-item"
      >
        <div class="document-list__checkbox">
          <input
            type="checkbox"
            :id="`document-${document.id}`"
            :checked="isSelected(document.id)"
            @change="toggleDocumentSelection(document)"
            @click.stop
            class="document-list__select-checkbox"
            aria-label="Select document"
            data-testid="document-checkbox"
          />
        </div>
        <div
          class="document-list__icon"
          :class="`document-list__icon--${document.originalFormat}`"
          aria-hidden="true"
        >
          <i :class="getFormatIcon(document.originalFormat)"></i>
        </div>

        <div class="document-list__info">
          <h4 class="document-list__name">
            {{ document.originalName }}
            <span
              v-if="
                document.metadata?.title &&
                document.metadata.title !== document.originalName
              "
              class="document-list__title"
              >({{ document.metadata.title }})</span
            >
          </h4>

          <div class="document-list__meta">
            <span class="document-list__format">
              <span class="document-list__meta-label" aria-hidden="true"
                >{{ $t("documentList.format", "Format") }}:</span
              >
              <span>{{ document.originalFormat.toUpperCase() }}</span>
            </span>

            <span class="document-list__size">
              <span class="document-list__meta-label" aria-hidden="true"
                >{{ $t("documentList.size", "Größe") }}:</span
              >
              <span>{{ formatFileSize(document.size) }}</span>
            </span>

            <span class="document-list__date">
              <span class="document-list__meta-label" aria-hidden="true"
                >{{ $t("documentList.date", "Datum") }}:</span
              >
              <span>{{
                formatDate(document.convertedAt || document.uploadedAt)
              }}</span>
            </span>
          </div>

          <div
            v-if="document.status"
            class="document-list__status"
            :class="`document-list__status--${document.status}`"
          >
            <div
              class="document-list__metadata-tags"
              v-if="
                document.metadata?.keywords &&
                document.metadata.keywords.length > 0
              "
            >
              <span
                v-for="(keyword, keywordIdx) in displayedKeywords(document)"
                :key="`${document.id}-${keywordIdx}`"
                class="document-list__keyword"
              >
                {{ keyword }}
              </span>
              <span
                v-if="hasMoreKeywords(document)"
                class="document-list__more-keywords"
              >
                +{{ document.metadata.keywords.length - maxKeywords }}
              </span>
            </div>
            <span class="document-list__status-icon">
              <i :class="getStatusIcon(document.status)"></i>
            </span>
            <span class="document-list__status-text">{{
              getStatusText(document.status)
            }}</span>

            <span
              v-if="document.error"
              class="document-list__status-error-message"
            >
              {{ document.error }}
            </span>
          </div>
        </div>

        <div class="document-list__actions">
          <button
            @click.stop="viewDocument(document)"
            class="document-list__action-btn"
            :disabled="
              document.status !== 'success' && document.status !== 'completed'
            "
            :aria-label="
              $t(
                'documentList.viewDocument',
                { name: document.originalName },
                `Dokument anzeigen: ${document.originalName}`,
              )
            "
            :title="
              $t(
                'documentList.viewDocument',
                { name: document.originalName },
                `Dokument anzeigen: ${document.originalName}`,
              )
            "
            data-testid="view-document-btn"
          >
            <i class="fa fa-eye" aria-hidden="true"></i>
          </button>

          <button
            @click.stop="downloadDocument(document)"
            class="document-list__action-btn"
            :disabled="
              document.status !== 'success' && document.status !== 'completed'
            "
            :aria-label="
              $t(
                'documentList.downloadDocument',
                { name: document.originalName },
                `Dokument herunterladen: ${document.originalName}`,
              )
            "
            :title="
              $t(
                'documentList.downloadDocument',
                { name: document.originalName },
                `Dokument herunterladen: ${document.originalName}`,
              )
            "
            data-testid="download-document-btn"
          >
            <i class="fa fa-download" aria-hidden="true"></i>
          </button>

          <div class="document-list__action-dropdown">
            <button
              @click.stop="toggleActionMenu(document.id)"
              class="document-list__action-dropdown-toggle"
              :aria-expanded="openActionMenuId === document.id"
              data-testid="action-dropdown-toggle"
            >
              <i class="fa fa-ellipsis-v" aria-hidden="true"></i>
            </button>

            <div
              v-if="openActionMenuId === document.id"
              class="document-list__action-dropdown-menu"
              data-testid="action-dropdown-menu"
            >
              <button
                @click.stop="confirmDelete(document)"
                class="document-list__dropdown-action-btn document-list__dropdown-action-btn--danger"
                data-testid="delete-document-btn"
              >
                <i class="fa fa-trash" aria-hidden="true"></i>
                {{ $t("documentList.delete", "Löschen") }}
              </button>

              <button
                v-if="document.status === 'error'"
                @click.stop="retryConversion(document)"
                class="document-list__dropdown-action-btn"
                data-testid="retry-conversion-btn"
              >
                <i class="fa fa-redo" aria-hidden="true"></i>
                {{ $t("documentList.retry", "Erneut versuchen") }}
              </button>
            </div>
          </div>
        </div>
      </li>
    </ul>

    <!-- Pagination -->
    <div
      v-if="totalPages > 1"
      class="document-list__pagination"
      role="navigation"
      aria-label="Pagination controls"
    >
      <button
        @click="prevPage"
        :disabled="currentPage === 1"
        class="document-list__pagination-btn"
        aria-label="Previous page"
      >
        <i class="fa fa-chevron-left" aria-hidden="true"></i>
        <span>{{ $t("documentList.prevPage", "Zurück") }}</span>
      </button>

      <span class="document-list__pagination-info" aria-live="polite">
        {{
          $t(
            "documentList.pageInfo",
            { current: currentPage, total: totalPages },
            `Seite ${currentPage} von ${totalPages}`,
          )
        }}
      </span>

      <button
        @click="nextPage"
        :disabled="currentPage === totalPages"
        class="document-list__pagination-btn"
        aria-label="Next page"
      >
        <span>{{ $t("documentList.nextPage", "Weiter") }}</span>
        <i class="fa fa-chevron-right" aria-hidden="true"></i>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from "vue";
import { ConversionResult, SupportedFormat } from "@/types/documentConverter";
import { useGlobalDialog } from "@/composables/useDialog";
import { vTouch } from "@/directives/touch-directives";

// State for mobile touch gestures
const swipingDocumentId = ref<string | null>(null);

// Interface für Props
interface Props {
  documents: ConversionResult[];
  selectedDocument: ConversionResult | null;
  loading: boolean;
  supportedFormats?: SupportedFormat[];
}

// Props-Definition
const props = withDefaults(defineProps<Props>(), {
  documents: () => [],
  selectedDocument: null,
  loading: false,
  supportedFormats: () => ["pdf", "docx", "xlsx", "pptx", "html", "txt"],
});

// Event-Emitter
const emit = defineEmits<{
  (e: "select", documentId: string): void;
  (e: "view", documentId: string): void;
  (e: "download", documentId: string): void;
  (e: "delete", documentId: string): void;
  (e: "retry", documentId: string): void;
}>();

// Services
const dialog = useGlobalDialog();
const toast = useToasts();

// Zustandsvariablen
const searchQuery = ref("");
const statusFilter = ref("");
const formatFilter = ref("");
const currentPage = ref(1);
const itemsPerPage = ref(10);
const sortBy = ref<"name" | "date" | "size" | "format">("date");
const sortDirection = ref<"asc" | "desc">("desc");
const selectedDocuments = ref<string[]>([]);
const openActionMenuId = ref<string | null>(null);
const maxKeywords = 3; // Maximale Anzahl anzuzeigender Keywords

/**
 * Gefilterte Dokumente basierend auf Suchbegriff und Filtern
 */
const filteredDocuments = computed(() => {
  let result = props.documents.filter((doc) => {
    // Suchbegriff filtern
    const matchesSearch =
      !searchQuery.value ||
      doc.originalName
        .toLowerCase()
        .includes(searchQuery.value.toLowerCase()) ||
      (doc.metadata?.title &&
        doc.metadata.title
          .toLowerCase()
          .includes(searchQuery.value.toLowerCase()));

    // Format filtern
    const matchesFormat =
      !formatFilter.value || doc.originalFormat === formatFilter.value;

    // Status filtern
    const matchesStatus =
      !statusFilter.value || doc.status === statusFilter.value;

    return matchesSearch && matchesFormat && matchesStatus;
  });

  // Sortierung anwenden
  return result.sort((a, b) => {
    let comparison = 0;

    // Nach Eigenschaft sortieren
    if (sortBy.value === "name") {
      comparison = a.originalName.localeCompare(b.originalName);
    } else if (sortBy.value === "date") {
      const dateA = a.convertedAt || a.uploadedAt || new Date(0);
      const dateB = b.convertedAt || b.uploadedAt || new Date(0);
      comparison =
        (dateA instanceof Date ? dateA : new Date(dateA)).getTime() -
        (dateB instanceof Date ? dateB : new Date(dateB)).getTime();
    } else if (sortBy.value === "size") {
      comparison = (a.size || 0) - (b.size || 0);
    } else if (sortBy.value === "format") {
      comparison = a.originalFormat.localeCompare(b.originalFormat);
    }

    // Sortierrichtung berücksichtigen
    return sortDirection.value === "asc" ? comparison : -comparison;
  });
});

/**
 * Prüft, ob Filter aktiv sind
 */
const hasActiveFilters = computed(() => {
  return searchQuery.value || statusFilter.value || formatFilter.value;
});

/**
 * Anzahl der Seiten für die Paginierung
 */
const totalPages = computed(() => {
  return Math.max(
    1,
    Math.ceil(filteredDocuments.value.length / itemsPerPage.value),
  );
});

/**
 * Dokumente für die aktuelle Seite
 */
const paginatedDocuments = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value;
  const end = start + itemsPerPage.value;
  return filteredDocuments.value.slice(start, end);
});

/**
 * Prüft, ob ein Dokument ausgewählt ist
 */
function isSelected(documentId: string): boolean {
  return selectedDocuments.value.includes(documentId);
}

/**
 * Wählt ein Dokument aus oder hebt die Auswahl auf
 */
function toggleDocumentSelection(document: ConversionResult): void {
  const documentId = document.id;

  if (isSelected(documentId)) {
    selectedDocuments.value = selectedDocuments.value.filter(
      (id) => id !== documentId,
    );
  } else {
    selectedDocuments.value.push(documentId);
  }

  // Wenn ein Dokument ausgewählt ist, es auch in der übergeordneten Komponente markieren
  if (selectedDocuments.value.length === 1) {
    emit("select", selectedDocuments.value[0]);
  } else if (selectedDocuments.value.length === 0 && props.selectedDocument) {
    emit("select", "");
  }
}

/**
 * Zeigt ein Dokument an
 */
function viewDocument(document: ConversionResult): void {
  if (document.status === "success") {
    emit("view", document.id);
  }
}

/**
 * Lädt ein Dokument herunter
 */
function downloadDocument(document: ConversionResult): void {
  if (document.status === "success") {
    emit("download", document.id);
  }
}

/**
 * Bestätigt das Löschen eines Dokuments und führt es bei Bestätigung durch
 */
async function confirmDelete(document: ConversionResult): Promise<void> {
  const confirmed = await dialog.confirm({
    title: $t("documentList.deleteConfirmTitle", "Dokument löschen"),
    message: $t(
      "documentList.deleteConfirmMessage",
      { name: document.originalName },
      `Sind Sie sicher, dass Sie das Dokument "${document.originalName}" löschen möchten?`,
    ),
    type: "warning",
    confirmButtonText: $t("documentList.delete", "Löschen"),
    cancelButtonText: $t("documentList.cancel", "Abbrechen"),
  });

  if (confirmed) {
    deleteDocument(document);
  }
}

/**
 * Versucht die Konvertierung eines fehlgeschlagenen Dokuments erneut
 */
function retryConversion(document: ConversionResult): void {
  emit("retry", document.id);
}

/**
 * Löscht ein Dokument
 */
function deleteDocument(document: ConversionResult): void {
  emit("delete", document.id);

  // Aus der Auswahl entfernen, falls vorhanden
  if (isSelected(document.id)) {
    selectedDocuments.value = selectedDocuments.value.filter(
      (id) => id !== document.id,
    );
  }
}

/**
 * Öffnet/Schließt das Aktionsmenü für ein Dokument
 */
function toggleActionMenu(documentId: string): void {
  if (openActionMenuId.value === documentId) {
    openActionMenuId.value = null;
  } else {
    openActionMenuId.value = documentId;
  }
}

/**
 * Schließt das Aktionsmenü beim Klick außerhalb
 */
function handleClickOutside(event: MouseEvent): void {
  if (openActionMenuId.value) {
    const target = event.target as HTMLElement;
    if (
      !target.closest(".document-list__action-dropdown-menu") &&
      !target.closest(".document-list__action-dropdown-toggle")
    ) {
      openActionMenuId.value = null;
    }
  }
}

/**
 * Löscht die Auswahl aller Dokumente
 */
function clearSelection(): void {
  selectedDocuments.value = [];
  emit("select", "");
}

/**
 * Lädt ausgewählte Dokumente herunter
 */
function downloadSelectedDocuments(): void {
  if (selectedDocuments.value.length === 0) return;

  // Für jedes ausgewählte Dokument mit Status "success" den Download auslösen
  const successDocs = props.documents.filter(
    (doc) =>
      selectedDocuments.value.includes(doc.id) && doc.status === "success",
  );

  if (successDocs.length === 0) {
    toast.error(
      $t(
        "documentList.noSuccessfulDocuments",
        "Keine erfolgreich konvertierten Dokumente ausgewählt",
      ),
    );
    return;
  }

  // Bei mehr als 5 Dokumenten Bestätigung anfordern
  if (successDocs.length > 5) {
    dialog
      .confirm({
        title: $t(
          "documentList.bulkDownloadTitle",
          "Mehrere Dokumente herunterladen",
        ),
        message: $t(
          "documentList.bulkDownloadConfirm",
          { count: successDocs.length },
          `Möchten Sie ${successDocs.length} Dokumente herunterladen?`,
        ),
        confirmButtonText: $t("documentList.download", "Herunterladen"),
        cancelButtonText: $t("documentList.cancel", "Abbrechen"),
      })
      .then((confirmed) => {
        if (confirmed) {
          successDocs.forEach((doc) => emit("download", doc.id));
          toast.success(
            $t(
              "documentList.downloadStarted",
              { count: successDocs.length },
              `Download von ${successDocs.length} Dokumenten gestartet`,
            ),
          );
        }
      });
  } else {
    successDocs.forEach((doc) => emit("download", doc.id));
    toast.success(
      $t(
        "documentList.downloadStarted",
        { count: successDocs.length },
        `Download von ${successDocs.length} Dokumenten gestartet`,
      ),
    );
  }
}

/**
 * Bestätigt und löscht ausgewählte Dokumente
 */
async function confirmDeleteSelected(): Promise<void> {
  if (selectedDocuments.value.length === 0) return;

  const confirmed = await dialog.confirm({
    title: $t("documentList.deleteMultipleTitle", "Mehrere Dokumente löschen"),
    message: $t(
      "documentList.deleteMultipleConfirm",
      { count: selectedDocuments.value.length },
      `Sind Sie sicher, dass Sie ${selectedDocuments.value.length} Dokumente löschen möchten?`,
    ),
    type: "warning",
    confirmButtonText: $t("documentList.delete", "Löschen"),
    cancelButtonText: $t("documentList.cancel", "Abbrechen"),
  });

  if (confirmed) {
    // Kopie der ausgewählten IDs erstellen, bevor wir die Liste ändern
    const docsToDelete = [...selectedDocuments.value];

    for (const id of docsToDelete) {
      emit("delete", id);
    }

    toast.success(
      $t(
        "documentList.documentsDeleted",
        { count: docsToDelete.length },
        `${docsToDelete.length} Dokumente wurden gelöscht`,
      ),
    );
    selectedDocuments.value = [];
  }
}

/**
 * Leert alle Filter und setzt die Suche zurück
 */
function clearFilters(): void {
  searchQuery.value = "";
  statusFilter.value = "";
  formatFilter.value = "";
  currentPage.value = 1;
}

/**
 * Leert nur die Suche
 */
function clearSearch(): void {
  searchQuery.value = "";
}

/**
 * Ändert die Sortierrichtung
 */
function toggleSortDirection(): void {
  sortDirection.value = sortDirection.value === "asc" ? "desc" : "asc";
}

/**
 * Wechselt zur vorherigen Seite
 */
function prevPage(): void {
  if (currentPage.value > 1) {
    currentPage.value--;
  }
}

/**
 * Wechselt zur nächsten Seite
 */
function nextPage(): void {
  if (currentPage.value < totalPages.value) {
    currentPage.value++;
  }
}

/**
 * Liefert das passende Icon für ein Dateiformat
 */
function getFormatIcon(format: string): string {
  const icons: Record<string, string> = {
    pdf: "fa fa-file-pdf",
    docx: "fa fa-file-word",
    doc: "fa fa-file-word",
    xlsx: "fa fa-file-excel",
    xls: "fa fa-file-excel",
    pptx: "fa fa-file-powerpoint",
    ppt: "fa fa-file-powerpoint",
    html: "fa fa-file-code",
    htm: "fa fa-file-code",
    txt: "fa fa-file-alt",
  };

  return icons[format] || "fa fa-file";
}

/**
 * Liefert das Icon für den Status
 */
function getStatusIcon(status: string): string {
  const icons: Record<string, string> = {
    success: "fa fa-check-circle",
    error: "fa fa-exclamation-circle",
    pending: "fa fa-clock",
    processing: "fa fa-spinner fa-spin",
  };

  return icons[status] || "fa fa-question-circle";
}

/**
 * Formatiert die Dateigröße benutzerfreundlich
 */
function formatFileSize(bytes?: number): string {
  if (!bytes) return "0 Bytes";

  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i)) + " " + sizes[i];
}

/**
 * Formatiert ein Datum benutzerfreundlich
 */
function formatDate(timestamp?: Date | string): string {
  if (!timestamp) return "";

  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);

  if (isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Liefert den Text für einen Status
 */
function getStatusText(status: string): string {
  const statusTexts: Record<string, string> = {
    success: $t("documentList.statusSuccess", "Erfolgreich"),
    error: $t("documentList.statusError", "Fehler"),
    pending: $t("documentList.statusPending", "Ausstehend"),
    processing: $t("documentList.statusProcessing", "In Bearbeitung"),
  };

  return statusTexts[status] || status;
}

/**
 * Gibt die anzuzeigenden Keywords zurück (begrenzt auf maxKeywords)
 */
function displayedKeywords(document: ConversionResult): string[] {
  if (
    !document.metadata?.keywords ||
    !Array.isArray(document.metadata.keywords)
  ) {
    return [];
  }

  return document.metadata.keywords.slice(0, maxKeywords);
}

/**
 * Prüft, ob es mehr Keywords gibt als angezeigt werden
 */
function hasMoreKeywords(document: ConversionResult): boolean {
  return (
    document.metadata?.keywords &&
    Array.isArray(document.metadata.keywords) &&
    document.metadata.keywords.length > maxKeywords
  );
}

/**
 * Prüft, ob erfolgreiche Dokumente in der Auswahl sind
 */
const hasSuccessfulSelected = computed(() => {
  return props.documents.some(
    (doc) =>
      selectedDocuments.value.includes(doc.id) && doc.status === "success",
  );
});

// i18n Hilfsfunktion
function $t(
  key: string,
  params: Record<string, any> = {},
  fallback: string = key,
): string {
  // In einer echten Implementierung würde hier die i18n-Bibliothek verwendet werden
  if (typeof fallback === "string") {
    let result = fallback;
    // Parameter ersetzen
    Object.entries(params).forEach(([param, value]) => {
      result = result.replace(new RegExp(`\\{${param}\\}`, "g"), String(value));
    });
    return result;
  }
  return fallback;
}

// Event-Listener für Klick außerhalb des Aktionsmenüs und Lebenszyklus-Hooks
onMounted(() => {
  document.addEventListener("click", handleClickOutside);
});

onBeforeUnmount(() => {
  document.removeEventListener("click", handleClickOutside);
});

// Beobachter für Filter und Sortierung - Zurücksetzen der Seitennummer
watch([searchQuery, statusFilter, formatFilter, sortBy, sortDirection], () => {
  currentPage.value = 1;
});

// Synchronisierung mit der übergeordneten Komponente
watch(
  () => props.selectedDocument,
  (newDoc) => {
    if (newDoc && !selectedDocuments.value.includes(newDoc.id)) {
      // Die Auswahl im Store wurde aktualisiert, aber nicht hier
      selectedDocuments.value = [newDoc.id];
    } else if (!newDoc && selectedDocuments.value.length > 0) {
      // Der Store hat keine Auswahl mehr, aber wir haben noch eine
      selectedDocuments.value = [];
    }
  },
);

/**
 * Handle swipe gestures for mobile
 */

/**
 * Handle left swipe on document item - trigger download action
 */
function handleSwipeLeft(document: ConversionResult): void {
  if (document.status === "success") {
    // Show download action
    swipingDocumentId.value = document.id;

    // Trigger download after short delay for visual feedback
    setTimeout(() => {
      emit("download", document.id);

      // Toast notification
      toast.success(
        $t("documentList.downloadStarted", { count: 1 }, "Download gestartet"),
      );

      // Reset swiping state after delay
      setTimeout(() => {
        swipingDocumentId.value = null;
      }, 500);
    }, 300);
  }
}

/**
 * Handle right swipe on document item - open delete confirmation
 */
function handleSwipeRight(document: ConversionResult): void {
  // Show delete indicator
  swipingDocumentId.value = document.id;

  // Show delete confirmation after short delay
  setTimeout(() => {
    confirmDelete(document);

    // Reset swiping state
    swipingDocumentId.value = null;
  }, 300);
}
</script>

<style scoped>
/* Base Styles */
.document-list {
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

/* Header and Title Area */
.document-list__header {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

@media (min-width: 768px) {
  .document-list__header {
    flex-direction: row;
    justify-content: space-between;
    align-items: flex-start;
  }
}

.document-list__title-area {
  flex-shrink: 0;
}

.document-list__header h3 {
  margin: 0 0 0.5rem;
  font-size: 1.25rem;
  color: #0d7a40;
  font-weight: 600;
}

.document-list__stats {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  font-size: 0.85rem;
  color: #6c757d;
}

.document-list__selected-count {
  font-weight: 500;
  color: #4a6cf7;
}

/* Actions Row */
.document-list__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: center;
  margin-top: 0.5rem;
}

.document-list__filter-container,
.document-list__sort-container {
  position: relative;
}

.document-list__status-filter,
.document-list__format-filter,
.document-list__sort-by {
  padding: 0.5rem;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 0.9rem;
  color: #495057;
  background-color: #fff;
  min-width: 120px;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23495057' d='M4 8l4-4 1.5 1.5L4 11 0.5 7.5 2 6l2 2z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.75rem center;
  background-size: 0.75rem;
  padding-right: 2rem;
}

.document-list__sort-container {
  display: flex;
  align-items: center;
}

.document-list__sort-direction {
  background: none;
  border: none;
  color: #6c757d;
  cursor: pointer;
  padding: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: -2.25rem;
  z-index: 2;
  position: relative;
}

/* Search Input */
.document-list__search-container {
  flex-grow: 1;
  max-width: 300px;
}

.document-list__search-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.document-list__search-icon {
  position: absolute;
  left: 0.75rem;
  color: #6c757d;
  font-size: 0.9rem;
}

.document-list__search-input {
  padding: 0.5rem 0.75rem 0.5rem 2.25rem;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 0.9rem;
  width: 100%;
  color: #495057;
}

.document-list__clear-search-btn {
  position: absolute;
  right: 0.75rem;
  background: none;
  border: none;
  color: #6c757d;
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
}

/* Batch Actions */
.document-list__batch-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 6px;
  padding: 0.75rem 1rem;
  margin-bottom: 1.5rem;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.document-list__batch-action-buttons {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.document-list__batch-action-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  font-size: 0.9rem;
  border: none;
  cursor: pointer;
  background-color: #4a6cf7;
  color: white;
  transition: all 0.2s;
}

.document-list__batch-action-btn:hover:not(:disabled) {
  background-color: #3a5be7;
}

.document-list__batch-action-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.document-list__batch-action-btn--danger {
  background-color: #e74c3c;
}

.document-list__batch-action-btn--danger:hover {
  background-color: #c0392b;
}

.document-list__clear-selection-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  background: none;
  border: none;
  color: #6c757d;
  font-size: 0.9rem;
  cursor: pointer;
}

.document-list__clear-selection-btn:hover {
  color: #495057;
}

/* Empty State */
.document-list__empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1.5rem;
  text-align: center;
  color: #6c757d;
  background-color: #f8f9fa;
  border-radius: 6px;
  margin-bottom: 1rem;
}

.document-list__empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
  color: #ced4da;
}

.document-list__empty-message {
  margin-bottom: 1.5rem;
  max-width: 400px;
}

.document-list__clear-filters-btn {
  padding: 0.5rem 1rem;
  background-color: #fff;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 0.9rem;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.document-list__clear-filters-btn:hover {
  background-color: #e9ecef;
}

/* Loading State */
.document-list__loading-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1.5rem;
  color: #6c757d;
}

.document-list__spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #e9ecef;
  border-top: 3px solid #4a6cf7;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Document List Items */
.document-list__items {
  list-style: none;
  padding: 0;
  margin: 0 0 1.5rem;
}

.document-list__item {
  display: flex;
  align-items: flex-start;
  padding: 1rem;
  border-bottom: 1px solid #e9ecef;
  transition: background-color 0.2s;
  cursor: pointer;
}

.document-list__item:last-child {
  border-bottom: none;
}

.document-list__item:hover {
  background-color: #f8f9fa;
}

.document-list__item:focus {
  outline: 2px solid #4a6cf7;
  outline-offset: -2px;
}

.document-list__item--selected {
  background-color: #e7f5ff;
}

.document-list__item--selected:hover {
  background-color: #dbeeff;
}

/* Status Indicators */
.document-list__item--success {
  border-left: 3px solid #28a745;
}

.document-list__item--error {
  border-left: 3px solid #dc3545;
}

.document-list__item--pending {
  border-left: 3px solid #6c757d;
}

.document-list__item--processing {
  border-left: 3px solid #fd7e14;
}

/* Checkbox */
.document-list__checkbox {
  display: flex;
  align-items: center;
  margin-right: 0.75rem;
}

.document-list__select-checkbox {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

/* Document Icon */
.document-list__icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  margin-right: 1rem;
  color: white;
  flex-shrink: 0;
}

.document-list__icon--pdf {
  background-color: #e74c3c;
}
.document-list__icon--docx,
.document-list__icon--doc {
  background-color: #3498db;
}
.document-list__icon--xlsx,
.document-list__icon--xls {
  background-color: #2ecc71;
}
.document-list__icon--pptx,
.document-list__icon--ppt {
  background-color: #e67e22;
}
.document-list__icon--html,
.document-list__icon--htm {
  background-color: #9b59b6;
}
.document-list__icon--txt {
  background-color: #95a5a6;
}

/* Document Info */
.document-list__info {
  flex: 1;
  min-width: 0;
}

.document-list__name {
  margin: 0 0 0.25rem;
  font-size: 1rem;
  font-weight: 500;
  word-break: break-word;
  color: #212529;
}

.document-list__title {
  font-size: 0.85rem;
  color: #6c757d;
  font-weight: normal;
  margin-left: 0.5rem;
}

.document-list__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  font-size: 0.85rem;
  color: #6c757d;
  margin-bottom: 0.5rem;
}

.document-list__meta-label {
  font-weight: 500;
  margin-right: 0.25rem;
}

/* Document Status */
.document-list__status {
  display: flex;
  align-items: center;
  font-size: 0.85rem;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.document-list__status-icon {
  margin-right: 0.25rem;
}

.document-list__status--success {
  color: #28a745;
}

.document-list__status--error {
  color: #dc3545;
}

.document-list__status--pending {
  color: #6c757d;
}

.document-list__status--processing {
  color: #fd7e14;
}

.document-list__status-error-message {
  font-style: italic;
  max-width: 400px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Keywords Tags */
.document-list__metadata-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  margin-right: 0.75rem;
}

.document-list__keyword {
  background-color: #f0f4ff;
  color: #4a6cf7;
  padding: 0.125rem 0.375rem;
  border-radius: 100px;
  font-size: 0.75rem;
}

.document-list__more-keywords {
  color: #6c757d;
  font-size: 0.75rem;
  padding: 0.125rem 0.25rem;
}

/* Document Actions */
.document-list__actions {
  display: flex;
  gap: 0.25rem;
  margin-left: 1rem;
}

.document-list__action-btn {
  background: none;
  border: none;
  cursor: pointer;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  color: #6c757d;
  transition: all 0.2s;
}

.document-list__action-btn:hover:not(:disabled) {
  background-color: #e9ecef;
  color: #495057;
}

.document-list__action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.document-list__action-dropdown {
  position: relative;
}

.document-list__action-dropdown-toggle {
  background: none;
  border: none;
  cursor: pointer;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  color: #6c757d;
}

.document-list__action-dropdown-toggle:hover {
  background-color: #e9ecef;
  color: #495057;
}

.document-list__action-dropdown-menu {
  position: absolute;
  top: 100%;
  right: 0;
  background-color: white;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  z-index: 10;
  min-width: 160px;
  animation: fadeIn 0.2s ease;
}

.document-list__dropdown-action-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  text-align: left;
  padding: 0.75rem 1rem;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.9rem;
  color: #495057;
  transition: background-color 0.2s;
}

.document-list__dropdown-action-btn:hover {
  background-color: #f8f9fa;
}

.document-list__dropdown-action-btn--danger {
  color: #dc3545;
}

.document-list__dropdown-action-btn--danger:hover {
  background-color: #f8d7da;
}

/* Pagination */
.document-list__pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  margin-top: 1.5rem;
}

.document-list__pagination-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background-color: #f8f9fa;
  border: 1px solid #ced4da;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  color: #495057;
  transition: all 0.2s;
}

.document-list__pagination-btn:hover:not(:disabled) {
  background-color: #e9ecef;
}

.document-list__pagination-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.document-list__pagination-info {
  font-size: 0.9rem;
  color: #6c757d;
}

/* Helper Classes */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* Responsive Adjustments */
@media (max-width: 768px) {
  .document-list {
    padding: 1rem;
  }

  /* Header adjustments */
  .document-list__header {
    margin-bottom: 1.25rem;
  }

  .document-list__title-area {
    text-align: center;
    margin-bottom: 1rem;
  }

  .document-list__title-area h3 {
    font-size: 1.4rem;
    margin-bottom: 0.5rem;
  }

  /* Filter controls adjustments */
  .document-list__actions {
    flex-direction: column;
    align-items: stretch;
    gap: 0.75rem;
  }

  .document-list__filter-container,
  .document-list__sort-container,
  .document-list__search-container {
    width: 100%;
    max-width: none;
  }

  .document-list__filter-container select,
  .document-list__sort-container select {
    width: 100%;
    height: 44px; /* Touch-friendly height */
    font-size: 1rem; /* Larger text */
    padding: 0.5rem 1rem;
  }

  .document-list__sort-direction {
    width: 44px;
    height: 44px; /* Touch-friendly height */
    font-size: 1.2rem; /* Larger icon */
  }

  .document-list__search-input-wrapper {
    height: 44px; /* Touch-friendly height */
  }

  .document-list__search-input {
    font-size: 1rem; /* Larger text */
    padding-left: 2.5rem; /* More space for search icon */
  }

  .document-list__search-icon {
    font-size: 1.2rem; /* Larger icon */
    left: 1rem;
  }

  .document-list__clear-search-btn {
    width: 44px; /* Touch-friendly width */
    height: 44px; /* Touch-friendly height */
    font-size: 1.2rem; /* Larger icon */
  }

  /* Batch action adjustments */
  .document-list__batch-actions {
    flex-direction: column;
    gap: 0.75rem;
    padding: 0.75rem;
  }

  .document-list__batch-action-buttons {
    flex-direction: column;
    width: 100%;
    gap: 0.75rem;
  }

  .document-list__batch-action-btn {
    width: 100%;
    padding: 0.75rem;
    font-size: 1rem;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 0.5rem;
    height: 44px; /* Touch-friendly height */
    white-space: nowrap;
  }

  .document-list__clear-selection-btn {
    width: 100%;
    justify-content: center;
    height: 44px; /* Touch-friendly height */
    font-size: 1rem;
  }

  /* Document item adjustments */
  .document-list__items {
    gap: 1rem; /* More space between items */
  }

  .document-list__item {
    flex-wrap: wrap;
    padding: 1rem;
    border-radius: 8px; /* Larger radius */
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); /* Subtle shadow */
    margin-bottom: 0.75rem; /* Additional space between items */
  }

  .document-list__checkbox {
    width: 44px; /* Touch-friendly size */
    height: 44px; /* Touch-friendly size */
  }

  .document-list__select-checkbox {
    width: 24px; /* Larger checkbox */
    height: 24px; /* Larger checkbox */
  }

  .document-list__info {
    flex: 0 0 calc(100% - 80px);
    padding: 0.5rem 0;
  }

  .document-list__name {
    font-size: 1.1rem; /* Larger font */
    margin-bottom: 0.5rem;
    word-break: break-word; /* Prevent text overflow */
  }

  .document-list__metadata {
    flex-wrap: wrap;
    gap: 0.5rem 1rem;
  }

  .document-list__item-actions {
    margin-left: 58px; /* Align with content after checkbox */
    margin-top: 0.75rem;
    gap: 0.75rem;
    flex-wrap: nowrap;
    justify-content: flex-start;
    width: 100%;
  }

  .document-list__action-btn {
    min-width: 44px; /* Touch-friendly width */
    height: 44px; /* Touch-friendly height */
    font-size: 1.1rem; /* Larger icon */
    border-radius: 8px; /* More rounded corners */
    flex: 1; /* Equal width buttons */
    justify-content: center;
  }

  /* Pagination adjustments */
  .document-list__pagination {
    flex-direction: column;
    gap: 1rem;
    margin-top: 1.5rem;
  }

  .document-list__pagination-controls {
    width: 100%;
    justify-content: space-between;
  }

  .document-list__pagination-button {
    width: 44px; /* Touch-friendly width */
    height: 44px; /* Touch-friendly height */
    font-size: 1.1rem; /* Larger icons */
  }

  .document-list__page-size-selector {
    width: 100%;
    justify-content: center;
  }

  .document-list__page-size-selector select {
    height: 44px; /* Touch-friendly height */
    font-size: 1rem; /* Larger text */
    padding: 0 1rem;
  }
}

/* Smaller mobile screens */
@media (max-width: 480px) {
  .document-list {
    padding: 0.75rem;
  }

  .document-list__item {
    padding: 0.75rem;
  }

  .document-list__item-actions {
    overflow-x: auto; /* Allow scrolling for many actions */
    scrollbar-width: none; /* Hide scrollbar in modern browsers */
    -ms-overflow-style: none; /* Hide scrollbar in IE/Edge */
    -webkit-overflow-scrolling: touch; /* Smooth scrolling for iOS */
    padding-bottom: 0.5rem;
  }

  .document-list__item-actions::-webkit-scrollbar {
    display: none; /* Hide scrollbar in WebKit browsers */
  }

  .document-list__action-btn {
    white-space: nowrap;
    flex: 0 0 auto;
    min-width: 100px;
  }

  /* Optimize for touch swipe with visual indicator */
  .document-list__item-actions::after {
    content: "";
    position: absolute;
    right: 0;
    bottom: 0.5rem;
    width: 30px;
    height: 44px;
    background: linear-gradient(
      to right,
      transparent,
      rgba(255, 255, 255, 0.8)
    );
    pointer-events: none;
  }
}

/* Swipe Gesture Indicator Styles */
.document-list__item--swiping {
  position: relative;
  transition: transform 0.3s ease;
  overflow: hidden;
}

.document-list__item--swiping::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.05);
  z-index: 1;
  pointer-events: none;
}

.document-list__item--swiping::after {
  content: "←";
  position: absolute;
  top: 50%;
  right: 15px;
  transform: translateY(-50%);
  font-size: 1.5rem;
  color: #4a6cf7;
  z-index: 2;
  animation: bounce 0.5s infinite alternate;
  pointer-events: none;
}

@keyframes bounce {
  from {
    transform: translateY(-50%) translateX(-5px);
  }
  to {
    transform: translateY(-50%) translateX(5px);
  }
}
/* Swipe gesture indicator styles */
.document-list__item--swiping {
  transition:
    transform 0.3s ease,
    box-shadow 0.3s ease;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.15);
}

.document-list__item--swiping::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.05);
  z-index: 0;
  animation: swipeHighlight 0.5s ease;
}

@keyframes swipeHighlight {
  0% {
    opacity: 0;
  }
  50% {
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
}
</style>
