<template>
  <div class="admin-filter-bar">
    <div v-if="withSearch" class="admin-filter-bar__search">
      <div class="admin-filter-bar__search-wrapper">
        <BaseInput
          v-model="searchInputModel"
          :placeholder="searchPlaceholder"
          prepend-icon="search"
          clearable
          @update:model-value="handleSearchUpdate"
        />
      </div>
    </div>
    <div class="admin-filter-bar__filters">
      <slot></slot>
    </div>
    <div v-if="showResetButton" class="admin-filter-bar__reset">
      <BaseButton
        variant="text"
        size="small"
        @click="resetAllFilters"
        icon="times-circle"
      >
        {{ resetLabel }}
      </BaseButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import BaseInput from "@/components/ui/base/Input.vue";
import BaseButton from "@/components/ui/base/Button.vue";

const props = defineProps({
  /**
   * Whether to show the search input
   */
  withSearch: {
    type: Boolean,
    default: true,
  },
  /**
   * The placeholder text for the search input
   */
  searchPlaceholder: {
    type: String,
    default: "Suchen...",
  },
  /**
   * The initial search query value
   */
  searchQuery: {
    type: String,
    default: "",
  },
  /**
   * The debounce delay in milliseconds
   */
  debounceDelay: {
    type: Number,
    default: 300,
  },
  /**
   * Whether to show the reset button
   */
  showResetButton: {
    type: Boolean,
    default: true,
  },
  /**
   * The label for the reset button
   */
  resetLabel: {
    type: String,
    default: "Zurücksetzen",
  },
});

const emit = defineEmits(["update:searchQuery", "reset"]);

// Internal search input value
const searchInputModel = ref(props.searchQuery);

// Watch for changes in the parent's searchQuery prop
watch(
  () => props.searchQuery,
  (newVal) => {
    searchInputModel.value = newVal;
  },
  { immediate: true },
);

// Handle search updates with debouncing
let debounceTimeout: NodeJS.Timeout | null = null;

const handleSearchUpdate = (value: string) => {
  if (debounceTimeout) {
    clearTimeout(debounceTimeout);
  }

  debounceTimeout = setTimeout(() => {
    emit("update:searchQuery", value);
  }, props.debounceDelay);
};

// Reset all filters
const resetAllFilters = () => {
  searchInputModel.value = "";
  emit("update:searchQuery", "");
  emit("reset");
};

defineExpose({
  resetAllFilters,
});
</script>

<style lang="scss">
.admin-filter-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  width: 100%;
  margin-bottom: 1.5rem;
  align-items: center;

  &__search {
    flex: 1;
    min-width: 250px;
  }

  &__search-wrapper {
    max-width: 500px;
  }

  &__filters {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
    align-items: center;
  }

  &__reset {
    margin-left: auto;
  }

  /* Responsive adjustments */
  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;

    &__search {
      width: 100%;
    }

    &__search-wrapper {
      max-width: 100%;
    }

    &__filters {
      width: 100%;
    }

    &__reset {
      margin-left: 0;
      width: 100%;
      display: flex;
      justify-content: flex-end;
    }
  }

  @media (max-width: 480px) {
    &__filters {
      flex-direction: column;
      align-items: stretch;

      & > * {
        width: 100%;
      }
    }
  }
}
</style>
