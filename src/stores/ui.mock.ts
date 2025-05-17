/**
 * Mock-Implementierung des UI-Stores
 */

import { defineStore } from "pinia";
import { ref, computed } from "vue";

export const useUIStore = defineStore("ui", () => {
  // State
  const activeView = ref('chat');
  const settingsVisible = ref(false);
  const sidebarVisible = ref(true);
  const fullscreenMode = ref(false);
  const toasts = ref<Array<{
    id: string;
    type: string;
    message: string;
    duration: number;
    timestamp: number;
  }>>([]);
  
  // Actions
  function setActiveView(view: string) {
    activeView.value = view;
  }
  
  function toggleSettings() {
    settingsVisible.value = !settingsVisible.value;
  }
  
  function toggleSidebar() {
    sidebarVisible.value = !sidebarVisible.value;
  }
  
  function toggleFullscreen() {
    fullscreenMode.value = !fullscreenMode.value;
    
    if (fullscreenMode.value) {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(err => {
          console.error('Fehler beim Wechsel in den Vollbildmodus:', err);
        });
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(err => {
          console.error('Fehler beim Verlassen des Vollbildmodus:', err);
        });
      }
    }
  }
  
  function showToast({ type = 'info', message, duration = 3000 }) {
    const id = Date.now().toString();
    
    // Toast zum Array hinzufügen
    toasts.value.push({
      id,
      type,
      message,
      duration,
      timestamp: Date.now()
    });
    
    // Toast nach Ablauf der Dauer automatisch entfernen
    setTimeout(() => {
      removeToast(id);
    }, duration);
    
    return id;
  }
  
  function removeToast(id: string) {
    toasts.value = toasts.value.filter(toast => toast.id !== id);
  }
  
  return {
    // State
    activeView,
    settingsVisible,
    sidebarVisible,
    fullscreenMode,
    toasts,
    
    // Actions
    setActiveView,
    toggleSettings,
    toggleSidebar,
    toggleFullscreen,
    showToast,
    removeToast
  };
});

// Legacy-Kompatibilität
export const useUiStore = useUIStore;