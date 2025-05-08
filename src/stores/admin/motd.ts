/**
 * Pinia Store für MOTD-Administration (Message of the Day)
 * Teil der Vue 3 SFC Migration (08.05.2025)
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { adminApi } from '@/services/api/admin';
import type { MotdConfig, AdminMotdState } from '@/types/admin';

export const useAdminMotdStore = defineStore('adminMotd', () => {
  // State
  const config = ref<MotdConfig>({
    enabled: true,
    format: 'markdown',
    content: '',
    style: {
      backgroundColor: '#fff3cd',
      borderColor: '#ffeeba',
      textColor: '#856404',
      iconClass: 'info-circle'
    },
    display: {
      position: 'top',
      dismissible: true,
      showOnStartup: false,
      showInChat: true
    }
  });
  
  const loading = ref(false);
  const error = ref<string | null>(null);
  const previewMode = ref(false);
  const originalConfig = ref<MotdConfig | null>(null);
  
  // Getters
  const hasUnsavedChanges = computed(() => {
    if (!originalConfig.value) return false;
    return JSON.stringify(config.value) !== JSON.stringify(originalConfig.value);
  });
  
  const previewHtml = computed(() => {
    if (config.value.format === 'markdown') {
      // Einfache Markdown-Formatierung für die Vorschau
      return config.value.content
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/\n\n/g, '<br/><br/>')
        .replace(/\n-\s/g, '<br/>• ');
    } else if (config.value.format === 'html') {
      return config.value.content;
    } else {
      return config.value.content.replace(/\n/g, '<br/>');
    }
  });
  
  // Actions
  async function fetchConfig() {
    loading.value = true;
    error.value = null;
    
    try {
      const response = await adminApi.getMotd();
      config.value = response.data;
      originalConfig.value = JSON.parse(JSON.stringify(response.data));
      return response.data;
    } catch (err: any) {
      console.error('Fehler beim Laden der MOTD-Konfiguration:', err);
      error.value = err.response?.data?.message || 'Fehler beim Laden der MOTD-Konfiguration';
      throw err;
    } finally {
      loading.value = false;
    }
  }
  
  async function saveConfig() {
    loading.value = true;
    error.value = null;
    
    try {
      const response = await adminApi.updateMotd(config.value);
      originalConfig.value = JSON.parse(JSON.stringify(config.value));
      return response.data;
    } catch (err: any) {
      console.error('Fehler beim Speichern der MOTD-Konfiguration:', err);
      error.value = err.response?.data?.message || 'Fehler beim Speichern der MOTD-Konfiguration';
      throw err;
    } finally {
      loading.value = false;
    }
  }
  
  function updateConfig(updates: Partial<MotdConfig>) {
    config.value = { ...config.value, ...updates };
  }
  
  function updateStyle(updates: Partial<MotdConfig['style']>) {
    config.value.style = { ...config.value.style, ...updates };
  }
  
  function updateDisplay(updates: Partial<MotdConfig['display']>) {
    config.value.display = { ...config.value.display, ...updates };
  }
  
  function resetConfig() {
    if (originalConfig.value) {
      config.value = JSON.parse(JSON.stringify(originalConfig.value));
    }
  }
  
  function setDefaultConfig() {
    config.value = {
      enabled: true,
      format: 'markdown',
      content: '🛠️ **BETA-VERSION: Lokaler KI-Assistent für nscale**\n\nDieser Assistent beantwortet Fragen zur Nutzung der nscale DMS-Software auf Basis interner Informationen.\n\n🔒 **Wichtige Hinweise:**\n- Alle Datenverarbeitungen erfolgen **ausschließlich lokal im Landesnetz Berlin**.\n- Es besteht **keine Verbindung zum Internet** – Ihre Eingaben verlassen niemals das System.\n- **Niemand außer Ihnen** hat Zugriff auf Ihre Eingaben oder Fragen.\n- Die Antworten werden von einer KI generiert – **Fehlinformationen sind möglich**.\n- Bitte geben Sie **keine sensiblen oder personenbezogenen Daten** ein.\n\n🧠 Der Assistent befindet sich in der Erprobung und wird stetig weiterentwickelt.',
      style: {
        backgroundColor: '#fff3cd',
        borderColor: '#ffeeba',
        textColor: '#856404',
        iconClass: 'info-circle'
      },
      display: {
        position: 'top',
        dismissible: true,
        showOnStartup: false,
        showInChat: true
      }
    };
  }
  
  function togglePreviewMode() {
    previewMode.value = !previewMode.value;
  }
  
  return {
    // State
    config,
    loading,
    error,
    previewMode,
    
    // Getters
    hasUnsavedChanges,
    previewHtml,
    
    // Actions
    fetchConfig,
    saveConfig,
    updateConfig,
    updateStyle,
    updateDisplay,
    resetConfig,
    setDefaultConfig,
    togglePreviewMode
  };
});