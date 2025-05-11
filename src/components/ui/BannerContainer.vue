<template>
  <div class="n-banner-container">
    <TransitionGroup name="n-banner-container">
      <Banner
        v-for="banner in banners"
        :key="banner.id"
        :variant="banner.options.variant"
        :title="banner.options.title"
        :message="banner.message"
        :dismissible="banner.options.dismissible"
        :visible="banner.visible"
        :show-icon="banner.options.showIcon"
        :position="banner.options.position"
        :sticky="banner.options.sticky"
        :actions="banner.options.actions || []"
        @dismiss="handleDismiss(banner.id)"
        @action="handleAction(banner.id, $event)"
      />
    </TransitionGroup>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, onBeforeUnmount } from "vue";
import {
  bannerService,
  type BannerItem,
  type BannerAction,
} from "@/services/ui/BannerService";
import Banner from "./feedback/Banner.vue";

// State
const banners = ref<BannerItem[]>([]);

// Update banners on changes
function updateBanners() {
  banners.value = bannerService.getAll();
}

// Event handlers
function handleDismiss(id: string) {
  bannerService.hide(id);
  updateBanners();
}

function handleAction(id: string, action: BannerAction) {
  bannerService.handleAction(id, action);
  updateBanners();
}

// Lifecycle hooks
onMounted(() => {
  updateBanners();

  // Create a custom event for banner updates
  window.addEventListener("banner-update", updateBanners);
});

onBeforeUnmount(() => {
  window.removeEventListener("banner-update", updateBanners);
});
</script>

<style>
.n-banner-container {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: var(--nscale-z-index-banner, 900);
  pointer-events: none;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.n-banner-container > .n-banner {
  pointer-events: auto;
}

.n-banner-container-enter-active,
.n-banner-container-leave-active {
  transition: all 0.3s ease;
}

.n-banner-container-enter-from,
.n-banner-container-leave-to {
  opacity: 0;
  transform: translateY(-100%);
}
</style>
