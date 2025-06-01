<template>
  <nav
    class="n-pagination"
    :class="{
      [`n-pagination--${size}`]: true,
      'n-pagination--simple': simple,
    }"
    :aria-label="ariaLabel"
  >
    <div class="n-pagination-info" v-if="showInfo">
      {{ paginationInfoText }}
    </div>

    <div class="n-pagination-controls">
      <!-- Previous button -->
      <button
        class="n-pagination-button n-pagination-prev"
        :disabled="currentValue <= 1 || disabled"
        @click="handlePageChange(currentValue - 1)"
        aria-label="Previous page"
        type="button"
      >
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
          <path
            d="M15 18l-6-6 6-6"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
          />
        </svg>
        <span v-if="!hideLabels" class="n-pagination-button-text">{{
          prevText
        }}</span>
      </button>

      <!-- Page numbers -->
      <div class="n-pagination-pages" v-if="!simple">
        <button
          v-for="page in visiblePages"
          :key="page"
          class="n-pagination-page"
          :class="{
            'n-pagination-page--active': page === currentValue,
            'n-pagination-page--ellipsis': page === '...',
          }"
          @click="page !== '...' ? handlePageChange(Number(page)) : null"
          :aria-current="page === currentValue ? 'page' : undefined"
          :disabled="page === '...' || disabled"
          type="button"
        >
          {{ page }}
        </button>
      </div>

      <!-- Simple page indicator -->
      <div class="n-pagination-current" v-if="simple">
        <span>{{ currentValue }} / {{ pageCount }}</span>
      </div>

      <!-- Next button -->
      <button
        class="n-pagination-button n-pagination-next"
        :disabled="currentValue >= pageCount || disabled"
        @click="handlePageChange(currentValue + 1)"
        aria-label="Next page"
        type="button"
      >
        <span v-if="!hideLabels" class="n-pagination-button-text">{{
          nextText
        }}</span>
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
          <path
            d="M9 18l6-6-6-6"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
          />
        </svg>
      </button>
    </div>

    <!-- Page size selector -->
    <div v-if="pageSizeOptions.length > 0 && !simple" class="n-pagination-size">
      <label :id="id + '-pagesize-label'" class="n-pagination-size-label">{{
        perPageText
      }}</label>
      <select
        :aria-labelledby="id + '-pagesize-label'"
        class="n-pagination-size-select"
        :value="pageSize"
        @change="(e) => handlePageSizeChange(Number(e.target.value))"
        :disabled="disabled"
      >
        <option v-for="size in pageSizeOptions" :key="size" :value="size">
          {{ size }}
        </option>
      </select>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { generateUUID as generateUniqueId } from "../../../utils/uuidUtil";

/**
 * Pagination component for navigating through pages of data
 * @displayName Pagination
 * @example
 * <Pagination
 *   v-model="currentPage"
 *   :total-items="100"
 *   :page-size="10"
 * />
 */
export interface PaginationProps {
  /** Current page value (v-model) */
  modelValue?: number;
  /** The total number of items */
  totalItems: number;
  /** Items displayed per page */
  pageSize?: number;
  /** Available page size options */
  pageSizeOptions?: number[];
  /** Whether to use a simple view (no page numbers) */
  simple?: boolean;
  /** Whether to show total items info */
  showInfo?: boolean;
  /** Disable all pagination controls */
  disabled?: boolean;
  /** Hide text labels on prev/next buttons */
  hideLabels?: boolean;
  /** Size variant for the pagination */
  size?: "small" | "medium" | "large";
  /** Text for the Previous button */
  prevText?: string;
  /** Text for the Next button */
  nextText?: string;
  /** Text for items per page label */
  perPageText?: string;
  /** ARIA label for the pagination navigation */
  ariaLabel?: string;
  /** Maximum number of visible page buttons */
  maxVisiblePages?: number;
  /** Unique ID for the pagination component */
  id?: string;
}

const props = withDefaults(defineProps<PaginationProps>(), {
  modelValue: 1,
  pageSize: 10,
  pageSizeOptions: () => [],
  simple: false,
  showInfo: true,
  disabled: false,
  hideLabels: false,
  size: "medium",
  prevText: "Previous",
  nextText: "Next",
  perPageText: "Per page:",
  ariaLabel: "Pagination",
  maxVisiblePages: 7,
  id: () => `n-pagination-${generateUniqueId()}`,
});

const emit = defineEmits<{
  (e: "update:modelValue", page: number): void;
  (e: "page-change", page: number): void;
  (e: "update:pageSize", pageSize: number): void;
  (e: "page-size-change", pageSize: number): void;
}>();

// State
const currentValue = ref(props.modelValue);
const pageSize = ref(props.pageSize);

// Computed values
const pageCount = computed(() => {
  return Math.max(1, Math.ceil(props.totalItems / pageSize.value));
});

const visiblePages = computed(() => {
  const count = pageCount.value;

  // For small number of pages, show all
  if (count <= props.maxVisiblePages) {
    return Array.from({ length: count }, (_, i) => String(i + 1));
  }

  // For larger number of pages, use ellipsis
  const pages: (string | number)[] = [];
  const maxPages = props.maxVisiblePages;
  const current = currentValue.value;

  // Always show first page
  pages.push("1");

  // Calculate middle section
  let startPage = Math.max(2, current - Math.floor((maxPages - 3) / 2));
  let endPage = startPage + (maxPages - 4);

  // Adjust if end page exceeds total pages
  if (endPage >= count) {
    endPage = count - 1;
    startPage = Math.max(2, endPage - (maxPages - 4));
  }

  // Add ellipsis after first page if needed
  if (startPage > 2) {
    pages.push("...");
  }

  // Add middle pages
  for (let i = startPage; i <= endPage; i++) {
    pages.push(String(i));
  }

  // Add ellipsis before last page if needed
  if (endPage < count - 1) {
    pages.push("...");
  }

  // Always show last page
  if (count > 1) {
    pages.push(String(count));
  }

  return pages;
});

const paginationInfoText = computed(() => {
  if (props.totalItems <= 0) return "";

  const start = (currentValue.value - 1) * pageSize.value + 1;
  const end = Math.min(start + pageSize.value - 1, props.totalItems);

  return `${start}-${end} of ${props.totalItems}`;
});

// Methods
function handlePageChange(page: number): void {
  if (page < 1 || page > pageCount.value || props.disabled) return;

  currentValue.value = page;
  emit("update:modelValue", page);
  emit("page-change", page);
}

function handlePageSizeChange(size: number): void {
  if (props.disabled) return;

  // Calculate the first item index of the current page
  const firstItemIndex = (currentValue.value - 1) * pageSize.value;

  // Update page size
  pageSize.value = size;

  // Calculate new page to keep the same first item visible
  const newPage = Math.floor(firstItemIndex / size) + 1;

  // Update page and emit events
  currentValue.value = Math.min(newPage, Math.ceil(props.totalItems / size));

  emit("update:pageSize", size);
  emit("page-size-change", size);
  emit("update:modelValue", currentValue.value);
  emit("page-change", currentValue.value);
}

// Watchers
watch(
  () => props.modelValue,
  (newPage) => {
    currentValue.value = newPage;
  },
);

watch(
  () => props.pageSize,
  (newSize) => {
    pageSize.value = newSize;
  },
);

// Make sure current page is valid when total items or page size changes
watch([() => props.totalItems, () => pageSize.value], () => {
  const maxPage = pageCount.value;
  if (currentValue.value > maxPage) {
    currentValue.value = maxPage;
    emit("update:modelValue", maxPage);
  }
});
</script>

<style scoped>
.n-pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--nscale-space-3);
  font-family: var(--nscale-font-family-base);
}

.n-pagination-info {
  color: var(--nscale-gray-600);
  font-size: var(--nscale-font-size-sm);
}

.n-pagination-controls {
  display: flex;
  align-items: center;
  gap: var(--nscale-space-2);
}

.n-pagination-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--nscale-space-1);
  border: 1px solid var(--nscale-gray-300);
  border-radius: var(--nscale-border-radius-md);
  background-color: var(--nscale-white);
  color: var(--nscale-gray-700);
  cursor: pointer;
  transition: all var(--nscale-transition-quick);
  padding: 0 var(--nscale-space-3);
}

.n-pagination-button:hover:not(:disabled) {
  background-color: var(--nscale-gray-100);
  border-color: var(--nscale-gray-400);
}

.n-pagination-button:focus-visible {
  outline: 2px solid var(--nscale-primary-light);
  outline-offset: 2px;
}

.n-pagination-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.n-pagination-button-text {
  font-size: var(--nscale-font-size-sm);
}

.n-pagination-pages {
  display: flex;
  align-items: center;
  gap: var(--nscale-space-1);
}

.n-pagination-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  padding: 0 var(--nscale-space-2);
  border: 1px solid var(--nscale-gray-300);
  border-radius: var(--nscale-border-radius-md);
  background-color: var(--nscale-white);
  color: var(--nscale-gray-700);
  cursor: pointer;
  transition: all var(--nscale-transition-quick);
  font-size: var(--nscale-font-size-sm);
}

.n-pagination-page:hover:not(.n-pagination-page--active):not(
    .n-pagination-page--ellipsis
  ):not(:disabled) {
  background-color: var(--nscale-gray-100);
  border-color: var(--nscale-gray-400);
}

.n-pagination-page:focus-visible {
  outline: 2px solid var(--nscale-primary-light);
  outline-offset: 2px;
}

.n-pagination-page--active {
  background-color: var(--nscale-primary);
  border-color: var(--nscale-primary);
  color: var(--nscale-white);
  cursor: default;
}

.n-pagination-page--ellipsis {
  cursor: default;
}

.n-pagination-current {
  font-size: var(--nscale-font-size-sm);
  padding: 0 var(--nscale-space-2);
  color: var(--nscale-gray-700);
}

.n-pagination-size {
  display: flex;
  align-items: center;
  gap: var(--nscale-space-2);
}

.n-pagination-size-label {
  color: var(--nscale-gray-600);
  font-size: var(--nscale-font-size-sm);
  white-space: nowrap;
}

.n-pagination-size-select {
  padding: var(--nscale-space-1) var(--nscale-space-2);
  border: 1px solid var(--nscale-gray-300);
  border-radius: var(--nscale-border-radius-md);
  background-color: var(--nscale-white);
  color: var(--nscale-gray-700);
  font-size: var(--nscale-font-size-sm);
}

/* Size variants */
.n-pagination--small .n-pagination-button,
.n-pagination--small .n-pagination-page {
  height: 28px;
  font-size: var(--nscale-font-size-xs);
  min-width: 28px;
}

.n-pagination--medium .n-pagination-button,
.n-pagination--medium .n-pagination-page {
  height: 36px;
  font-size: var(--nscale-font-size-sm);
  min-width: 36px;
}

.n-pagination--large .n-pagination-button,
.n-pagination--large .n-pagination-page {
  height: 44px;
  font-size: var(--nscale-font-size-base);
  min-width: 44px;
}

/* Simple mode */
.n-pagination--simple .n-pagination-button {
  padding: 0;
  width: 36px;
}

.n-pagination--simple.n-pagination--small .n-pagination-button {
  width: 28px;
}

.n-pagination--simple.n-pagination--large .n-pagination-button {
  width: 44px;
}

@media (max-width: 640px) {
  .n-pagination {
    flex-direction: column;
    align-items: flex-start;
  }

  .n-pagination-size {
    margin-top: var(--nscale-space-2);
  }
}

/* Dark theme support */
.theme-dark .n-pagination-button,
.theme-dark .n-pagination-page {
  background-color: var(--nscale-gray-800);
  border-color: var(--nscale-gray-700);
  color: var(--nscale-gray-300);
}

.theme-dark .n-pagination-button:hover:not(:disabled),
.theme-dark
  .n-pagination-page:hover:not(.n-pagination-page--active):not(
    .n-pagination-page--ellipsis
  ):not(:disabled) {
  background-color: var(--nscale-gray-700);
  border-color: var(--nscale-gray-600);
}

.theme-dark .n-pagination-page--active {
  background-color: var(--nscale-primary);
  border-color: var(--nscale-primary);
  color: var(--nscale-white);
}

.theme-dark .n-pagination-info,
.theme-dark .n-pagination-current,
.theme-dark .n-pagination-size-label {
  color: var(--nscale-gray-400);
}

.theme-dark .n-pagination-size-select {
  background-color: var(--nscale-gray-800);
  border-color: var(--nscale-gray-700);
  color: var(--nscale-gray-300);
}

/* High contrast theme */
.theme-contrast .n-pagination-button,
.theme-contrast .n-pagination-page {
  background-color: var(--nscale-black);
  border-color: var(--nscale-primary);
  color: var(--nscale-white);
}

.theme-contrast .n-pagination-button:hover:not(:disabled),
.theme-contrast
  .n-pagination-page:hover:not(.n-pagination-page--active):not(
    .n-pagination-page--ellipsis
  ):not(:disabled) {
  background-color: var(--nscale-gray-900);
}

.theme-contrast .n-pagination-page--active {
  background-color: var(--nscale-primary);
  color: var(--nscale-black);
}

.theme-contrast .n-pagination-info,
.theme-contrast .n-pagination-current,
.theme-contrast .n-pagination-size-label {
  color: var(--nscale-white);
}

.theme-contrast .n-pagination-size-select {
  background-color: var(--nscale-black);
  border-color: var(--nscale-primary);
  color: var(--nscale-white);
}
</style>
