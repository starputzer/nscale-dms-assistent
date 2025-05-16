/**
 * Theme Store - Manages theme selection and persistence
 * Includes support for light, dark, and high contrast modes
 */

import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'

export type ThemeMode = 'light' | 'dark' | 'high-contrast'

export const useThemeStore = defineStore('theme', () => {
  // State
  const currentTheme = ref<ThemeMode>('light')
  const systemPreference = ref<'light' | 'dark' | null>(null)
  const isAutoMode = ref(false)
  
  // Getters
  const isDarkMode = computed(() => currentTheme.value === 'dark')
  const isHighContrastMode = computed(() => currentTheme.value === 'high-contrast')
  const isLightMode = computed(() => currentTheme.value === 'light')
  
  // Get effective theme considering auto mode
  const effectiveTheme = computed(() => {
    if (isAutoMode.value && systemPreference.value) {
      return systemPreference.value === 'dark' ? 'dark' : 'light'
    }
    return currentTheme.value
  })
  
  // Theme metadata for UI
  const themeOptions = computed(() => [
    {
      id: 'light',
      name: 'Hell',
      description: 'Standard-Thema mit nscale Grün',
      icon: 'fas fa-sun',
      preview: {
        background: '#ffffff',
        surface: '#f5f5f5',
        text: '#333333',
        primary: '#00a550'
      }
    },
    {
      id: 'dark',
      name: 'Dunkel',
      description: 'Augenschonend für dunkle Umgebungen',
      icon: 'fas fa-moon',
      preview: {
        background: '#121212',
        surface: '#1e1e1e',
        text: '#f0f0f0',
        primary: '#00c060'
      }
    },
    {
      id: 'high-contrast',
      name: 'Hoher Kontrast',
      description: 'Maximale Lesbarkeit für Barrierefreiheit',
      icon: 'fas fa-adjust',
      preview: {
        background: '#000000',
        surface: '#000000',
        text: '#ffffff',
        primary: '#ffeb3b'
      }
    }
  ])
  
  // Actions
  function setTheme(theme: ThemeMode, skipPersist = false) {
    currentTheme.value = theme
    applyTheme(theme)
    
    if (!skipPersist) {
      saveThemePreference(theme, isAutoMode.value)
    }
  }
  
  function toggleAutoMode() {
    isAutoMode.value = !isAutoMode.value
    
    if (isAutoMode.value) {
      detectSystemPreference()
    }
    
    saveThemePreference(currentTheme.value, isAutoMode.value)
  }
  
  function applyTheme(theme: ThemeMode) {
    // Apply theme to document
    document.documentElement.setAttribute('data-theme', theme)
    
    // Also apply theme classes for legacy support
    document.body.classList.remove('theme-light', 'theme-dark', 'theme-contrast')
    
    switch (theme) {
      case 'light':
        document.body.classList.add('theme-light')
        break
      case 'dark':
        document.body.classList.add('theme-dark')
        break
      case 'high-contrast':
        document.body.classList.add('theme-contrast')
        break
    }
    
    // Emit theme change event for other components
    window.dispatchEvent(new CustomEvent('theme-changed', { detail: { theme } }))
  }
  
  function saveThemePreference(theme: ThemeMode, autoMode: boolean) {
    localStorage.setItem('theme-preference', theme)
    localStorage.setItem('theme-auto-mode', autoMode ? 'true' : 'false')
  }
  
  function loadSavedTheme() {
    const savedTheme = localStorage.getItem('theme-preference')
    const savedAutoMode = localStorage.getItem('theme-auto-mode') === 'true'
    
    isAutoMode.value = savedAutoMode
    
    if (savedTheme && isValidTheme(savedTheme)) {
      setTheme(savedTheme as ThemeMode, true)
    } else {
      // Default to system preference or light theme
      detectSystemPreference()
      
      if (systemPreference.value === 'dark') {
        setTheme('dark', true)
      } else {
        setTheme('light', true)
      }
    }
    
    if (isAutoMode.value) {
      detectSystemPreference()
    }
  }
  
  function detectSystemPreference() {
    if (window.matchMedia) {
      const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)')
      systemPreference.value = darkModeQuery.matches ? 'dark' : 'light'
      
      // Listen for system preference changes
      darkModeQuery.addEventListener('change', (e) => {
        systemPreference.value = e.matches ? 'dark' : 'light'
        
        if (isAutoMode.value) {
          setTheme(systemPreference.value)
        }
      })
    }
  }
  
  function isValidTheme(theme: string): boolean {
    return ['light', 'dark', 'high-contrast'].includes(theme)
  }
  
  // Reset to default theme
  function resetTheme() {
    setTheme('light')
    isAutoMode.value = false
    saveThemePreference('light', false)
  }
  
  // Initialize theme on store creation
  loadSavedTheme()
  
  // Watch for effective theme changes
  watch(effectiveTheme, (newTheme) => {
    applyTheme(newTheme)
  })
  
  return {
    // State
    currentTheme,
    systemPreference,
    isAutoMode,
    
    // Getters
    isDarkMode,
    isHighContrastMode,
    isLightMode,
    effectiveTheme,
    themeOptions,
    
    // Actions
    setTheme,
    toggleAutoMode,
    loadSavedTheme,
    resetTheme
  }
})