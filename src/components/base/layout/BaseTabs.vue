<template>
  <div
    :class="[
      'base-tabs',
      `base-tabs--${variant}`,
      `base-tabs--${align}`,
      { 'base-tabs--bordered': bordered },
      { 'base-tabs--full-width': fullWidth },
    ]"
  >
    <div
      :class="[
        'base-tabs__header',
        { 'base-tabs__header--scrollable': scrollable },
      ]"
    >
      <div class="base-tabs__nav" ref="tabsNavRef">
        <button
          v-for="(tab, index) in tabs"
          :key="index"
          :class="[
            'base-tabs__nav-item',
            { 'base-tabs__nav-item--active': activeTab === index },
            { 'base-tabs__nav-item--disabled': tab.disabled },
          ]"
          :disabled="tab.disabled"
          :aria-selected="activeTab === index"
          :role="tab"
          :id="`tab-${tabsId}-${index}`"
          :aria-controls="`panel-${tabsId}-${index}`"
          @click="() => !tab.disabled && setActiveTab(index)"
        >
          <div v-if="tab.icon" class="base-tabs__nav-icon">
            <component :is="tab.icon" />
          </div>
          <span class="base-tabs__nav-label">{{ tab.label }}</span>
          <span v-if="tab.badge" class="base-tabs__nav-badge">
            {{ tab.badge }}
          </span>
        </button>

        <div
          v-if="variant === 'underline'"
          class="base-tabs__indicator"
          :style="indicatorStyle"
        ></div>
      </div>
    </div>

    <div class="base-tabs__content">
      <div
        v-for="(tab, index) in tabs"
        :key="index"
        :class="[
          'base-tabs__panel',
          { 'base-tabs__panel--active': activeTab === index },
        ]"
        :id="`panel-${tabsId}-${index}`"
        :aria-labelledby="`tab-${tabsId}-${index}`"
        role="tabpanel"
        tabindex="0"
      >
        <slot :name="`tab-${index}`"></slot>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import {
  defineComponent,
  ref,
  computed,
  onMounted,
  watch,
  nextTick,
  PropType,
} from "vue";

export interface TabItem {
  label: string;
  icon?: any;
  badge?: string | number;
  disabled?: boolean;
}

export default defineComponent({
  name: "BaseTabs",

  props: {
    modelValue: {
      type: Number,
      default: 0,
    },
    tabs: {
      type: Array as PropType<TabItem[]>,
      required: true,
    },
    variant: {
      type: String,
      default: "underline",
      validator: (value: string) => {
        return ["underline", "contained", "pills"].includes(value);
      },
    },
    align: {
      type: String,
      default: "left",
      validator: (value: string) => {
        return ["left", "center", "right"].includes(value);
      },
    },
    bordered: {
      type: Boolean,
      default: false,
    },
    fullWidth: {
      type: Boolean,
      default: false,
    },
    scrollable: {
      type: Boolean,
      default: false,
    },
  },

  emits: ["update:modelValue", "change"],

  setup(props, { emit }) {
    const tabsId = `tabs-${Math.random().toString(36).substring(2, 9)}`;
    const activeTab = computed(() => props.modelValue);
    const tabsNavRef = ref<HTMLElement | null>(null);
    const activeTabElement = ref<HTMLElement | null>(null);
    const indicatorStyle = ref({});

    const setActiveTab = (index: number) => {
      emit("update:modelValue", index);
      emit("change", index);
    };

    const updateIndicator = async () => {
      if (props.variant !== "underline" || !tabsNavRef.value) return;

      await nextTick();

      const tabNav = tabsNavRef.value;
      const activeTabEl = tabNav.querySelector(
        `.base-tabs__nav-item--active`,
      ) as HTMLElement;

      if (activeTabEl) {
        const { left, width } = activeTabEl.getBoundingClientRect();
        const navLeft = tabNav.getBoundingClientRect().left;

        indicatorStyle.value = {
          left: `${left - navLeft}px`,
          width: `${width}px`,
        };
      }
    };

    onMounted(() => {
      updateIndicator();
    });

    watch(
      () => props.modelValue,
      () => {
        updateIndicator();
      },
    );

    watch(
      () => props.tabs,
      () => {
        updateIndicator();
      },
      { deep: true },
    );

    return {
      tabsId,
      activeTab,
      tabsNavRef,
      indicatorStyle,
      setActiveTab,
    };
  },
});
</script>

<style lang="scss" scoped>
.base-tabs {
  display: flex;
  flex-direction: column;
  width: 100%;

  &__header {
    position: relative;

    &--scrollable {
      overflow-x: auto;
      scrollbar-width: thin;

      &::-webkit-scrollbar {
        height: 4px;
      }

      &::-webkit-scrollbar-track {
        background: var(--color-gray-100);
      }

      &::-webkit-scrollbar-thumb {
        background-color: var(--color-gray-300);
        border-radius: 4px;
      }
    }
  }

  &__nav {
    display: flex;
    position: relative;
  }

  &__nav-item {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.75rem 1.25rem;
    font-size: 0.9375rem;
    font-weight: 500;
    color: var(--color-gray-600);
    background: transparent;
    border: none;
    cursor: pointer;
    transition: all 0.2s ease;
    position: relative;
    white-space: nowrap;

    &:hover:not(.base-tabs__nav-item--disabled) {
      color: var(--color-primary-600);
    }

    &:focus-visible {
      outline: 2px solid var(--color-primary-300);
      outline-offset: -2px;
    }

    &--active {
      color: var(--color-primary-600);
      font-weight: 600;
    }

    &--disabled {
      color: var(--color-gray-400);
      cursor: not-allowed;
    }
  }

  &__nav-icon {
    display: flex;
    align-items: center;
    margin-right: 0.5rem;

    svg {
      width: 1.25rem;
      height: 1.25rem;
    }
  }

  &__nav-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 1.25rem;
    height: 1.25rem;
    padding: 0 0.375rem;
    margin-left: 0.5rem;
    font-size: 0.75rem;
    font-weight: 500;
    color: var(--color-white);
    background-color: var(--color-primary-500);
    border-radius: 1rem;
  }

  &__indicator {
    position: absolute;
    bottom: 0;
    height: 2px;
    background-color: var(--color-primary-500);
    transition: all 0.3s ease;
    z-index: 1;
  }

  &__content {
    margin-top: 1rem;
  }

  &__panel {
    display: none;

    &--active {
      display: block;
    }
  }

  // Variants
  &--underline {
    .base-tabs__nav {
      border-bottom: 1px solid var(--color-gray-200);
    }
  }

  &--contained {
    .base-tabs__nav {
      background-color: var(--color-gray-100);
      border-radius: 0.5rem;
      padding: 0.25rem;
    }

    .base-tabs__nav-item {
      border-radius: 0.375rem;

      &--active {
        background-color: var(--color-white);
        color: var(--color-primary-600);
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      }
    }
  }

  &--pills {
    .base-tabs__nav-item {
      border-radius: 2rem;
      margin: 0 0.25rem;

      &:first-child {
        margin-left: 0;
      }

      &:last-child {
        margin-right: 0;
      }

      &--active {
        background-color: var(--color-primary-500);
        color: var(--color-white);
      }
    }
  }

  // Alignment
  &--center .base-tabs__nav {
    justify-content: center;
  }

  &--right .base-tabs__nav {
    justify-content: flex-end;
  }

  // Modifiers
  &--bordered {
    .base-tabs__content {
      border: 1px solid var(--color-gray-200);
      border-radius: 0.5rem;
      padding: 1.25rem;
    }
  }

  &--full-width {
    .base-tabs__nav-item {
      flex: 1;
    }
  }
}
</style>
