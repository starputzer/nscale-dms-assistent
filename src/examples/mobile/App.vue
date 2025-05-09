<template>
  <div class="app" :class="{ 'app--dark': isDarkMode }">
    <!-- Mobile-optimierter Header mit Menü und Theme-Switcher -->
    <div class="app__header">
      <h1 class="app__title">nScale Mobile</h1>
      
      <button class="app__theme-toggle" @click="toggleTheme" aria-label="Theme wechseln">
        <svg v-if="isDarkMode" viewBox="0 0 24 24" width="20" height="20">
          <path fill="currentColor" d="M12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9Z"></path>
          <path fill="currentColor" d="M12,2L14.39,5.42C13.65,5.15 12.84,5 12,5C11.16,5 10.35,5.15 9.61,5.42L12,2M3.34,7L7.5,6.65C6.9,7.16 6.36,7.78 5.94,8.5C5.5,9.24 5.25,10 5.11,10.79L3.34,7M3.36,17L5.12,13.23C5.26,14 5.53,14.78 5.95,15.5C6.37,16.24 6.91,16.86 7.5,17.37L3.36,17M20.65,7L18.88,10.79C18.74,10 18.47,9.23 18.05,8.5C17.63,7.78 17.1,7.15 16.5,6.64L20.65,7M20.64,17L16.5,17.36C17.09,16.85 17.62,16.22 18.04,15.5C18.46,14.77 18.73,14 18.87,13.21L20.64,17M12,22L9.59,18.56C10.33,18.83 11.14,19 12,19C12.82,19 13.63,18.83 14.37,18.56L12,22Z"></path>
        </svg>
        
        <svg v-else viewBox="0 0 24 24" width="20" height="20">
          <path fill="currentColor" d="M12,18C11.11,18 10.26,17.8 9.5,17.45C11.56,16.5 13,14.42 13,12C13,9.58 11.56,7.5 9.5,6.55C10.26,6.2 11.11,6 12,6A6,6 0 0,1 18,12A6,6 0 0,1 12,18M20,8.69V4H15.31L12,0.69L8.69,4H4V8.69L0.69,12L4,15.31V20H8.69L12,23.31L15.31,20H20V15.31L23.31,12L20,8.69Z"></path>
        </svg>
      </button>
    </div>
    
    <!-- Mobile Chat View -->
    <MobileChatView />
    
    <!-- Bottom Navigation Bar -->
    <div class="app__bottom-nav">
      <button 
        class="app__nav-item"
        :class="{ 'app__nav-item--active': activeTab === 'chat' }"
        @click="setActiveTab('chat')"
      >
        <svg viewBox="0 0 24 24" width="24" height="24">
          <path fill="currentColor" d="M20,2H4A2,2 0 0,0 2,4V22L6,18H20A2,2 0 0,0 22,16V4A2,2 0 0,0 20,2M6,9H18V11H6M14,14H6V12H14M18,8H6V6H18"></path>
        </svg>
        <span>Chat</span>
      </button>
      
      <button 
        class="app__nav-item"
        :class="{ 'app__nav-item--active': activeTab === 'docs' }"
        @click="setActiveTab('docs')"
      >
        <svg viewBox="0 0 24 24" width="24" height="24">
          <path fill="currentColor" d="M14,17H7V15H14M17,13H7V11H17M17,9H7V7H17M19,3H5C3.89,3 3,3.89 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5C21,3.89 20.1,3 19,3Z"></path>
        </svg>
        <span>Dokumente</span>
      </button>
      
      <button 
        class="app__nav-item"
        :class="{ 'app__nav-item--active': activeTab === 'admin' }"
        @click="setActiveTab('admin')"
      >
        <svg viewBox="0 0 24 24" width="24" height="24">
          <path fill="currentColor" d="M12,15.5A3.5,3.5 0 0,1 8.5,12A3.5,3.5 0 0,1 12,8.5A3.5,3.5 0 0,1 15.5,12A3.5,3.5 0 0,1 12,15.5M19.43,12.97C19.47,12.65 19.5,12.33 19.5,12C19.5,11.67 19.47,11.34 19.43,11L21.54,9.37C21.73,9.22 21.78,8.95 21.66,8.73L19.66,5.27C19.54,5.05 19.27,4.96 19.05,5.05L16.56,6.05C16.04,5.66 15.5,5.32 14.87,5.07L14.5,2.42C14.46,2.18 14.25,2 14,2H10C9.75,2 9.54,2.18 9.5,2.42L9.13,5.07C8.5,5.32 7.96,5.66 7.44,6.05L4.95,5.05C4.73,4.96 4.46,5.05 4.34,5.27L2.34,8.73C2.21,8.95 2.27,9.22 2.46,9.37L4.57,11C4.53,11.34 4.5,11.67 4.5,12C4.5,12.33 4.53,12.65 4.57,12.97L2.46,14.63C2.27,14.78 2.21,15.05 2.34,15.27L4.34,18.73C4.46,18.95 4.73,19.03 4.95,18.95L7.44,17.94C7.96,18.34 8.5,18.68 9.13,18.93L9.5,21.58C9.54,21.82 9.75,22 10,22H14C14.25,22 14.46,21.82 14.5,21.58L14.87,18.93C15.5,18.67 16.04,18.34 16.56,17.94L19.05,18.95C19.27,19.03 19.54,18.95 19.66,18.73L21.66,15.27C21.78,15.05 21.73,14.78 21.54,14.63L19.43,12.97Z"></path>
        </svg>
        <span>Admin</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useTheme } from '@/composables/useTheme';
import MobileChatView from '@/components/chat/MobileChatView.vue';

const { isDarkMode, toggleTheme } = useTheme();
const activeTab = ref('chat');

const setActiveTab = (tab: string) => {
  activeTab.value = tab;
};
</script>

<style lang="scss" scoped>
.app {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: var(--nscale-background);
  color: var(--nscale-foreground);
  
  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 56px;
    padding: 0 var(--nscale-space-4);
    background-color: var(--nscale-primary);
    color: white;
  }
  
  &__title {
    margin: 0;
    font-size: var(--nscale-font-size-lg);
    font-weight: var(--nscale-font-weight-medium);
  }
  
  &__theme-toggle {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: 20px;
    border: none;
    background: rgba(255, 255, 255, 0.2);
    color: white;
    
    &:active {
      background: rgba(255, 255, 255, 0.3);
    }
  }
  
  &__bottom-nav {
    display: flex;
    height: 56px;
    border-top: 1px solid var(--nscale-border);
    background-color: var(--nscale-background);
  }
  
  &__nav-item {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--nscale-space-1) 0;
    background: transparent;
    border: none;
    color: var(--nscale-muted);
    font-size: var(--nscale-font-size-xs);
    
    span {
      margin-top: var(--nscale-space-1);
    }
    
    &--active {
      color: var(--nscale-primary);
    }
    
    &:active {
      background-color: var(--nscale-muted-light);
    }
  }
  
  /* Dark Mode */
  &--dark {
    .app__bottom-nav {
      border-top-color: var(--nscale-border);
    }
  }
}
</style>