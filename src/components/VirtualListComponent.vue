<template>
  <div ref="scrollContainer" class="virtual-list-container" @scroll="onScroll">
    <div class="virtual-list-spacer" :style="{ height: totalHeight + 'px' }"></div>
    <div class="virtual-list-content" :style="{ transform: `translateY(${offsetY}px)` }">
      <div
        v-for="item in visibleItems"
        :key="item.id"
        class="virtual-list-item"
        :style="{ height: itemHeight + 'px' }"
      >
        <slot :item="item" :index="item.index" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';

interface Props {
  items: any[];
  itemHeight: number;
  buffer?: number;
}

const props = withDefaults(defineProps<Props>(), {
  buffer: 5
});

const scrollContainer = ref<HTMLElement>();
const scrollTop = ref(0);
const containerHeight = ref(0);

const totalHeight = computed(() => props.items.length * props.itemHeight);

const visibleRange = computed(() => {
  const start = Math.floor(scrollTop.value / props.itemHeight);
  const end = Math.ceil((scrollTop.value + containerHeight.value) / props.itemHeight);
  
  const bufferedStart = Math.max(0, start - props.buffer);
  const bufferedEnd = Math.min(props.items.length - 1, end + props.buffer);
  
  return { start: bufferedStart, end: bufferedEnd };
});

const visibleItems = computed(() => {
  const { start, end } = visibleRange.value;
  return props.items.slice(start, end + 1).map((item, index) => ({
    ...item,
    index: start + index
  }));
});

const offsetY = computed(() => visibleRange.value.start * props.itemHeight);

function onScroll() {
  if (!scrollContainer.value) return;
  scrollTop.value = scrollContainer.value.scrollTop;
}

function updateContainerHeight() {
  if (!scrollContainer.value) return;
  containerHeight.value = scrollContainer.value.clientHeight;
}

onMounted(() => {
  updateContainerHeight();
  window.addEventListener('resize', updateContainerHeight);
});

onUnmounted(() => {
  window.removeEventListener('resize', updateContainerHeight);
});
</script>

<style scoped>
.virtual-list-container {
  position: relative;
  overflow-y: auto;
  height: 100%;
}

.virtual-list-spacer {
  position: absolute;
  top: 0;
  left: 0;
  width: 1px;
  pointer-events: none;
}

.virtual-list-content {
  position: relative;
}

.virtual-list-item {
  position: relative;
  overflow: hidden;
}
</style>