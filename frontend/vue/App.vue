<!-- frontend/vue/App.vue -->
<template>
    <div class="vue-root">
      <!-- Admin Panel Container -->
      <div id="admin-panel-container" v-if="isAdminActive">
        <admin-panel />
      </div>
      
      <!-- Document Converter Container -->
      <div id="doc-converter-container" v-else>
        <h2>Dokumentenkonverter</h2>
        <!-- Hier kommen die Vue-Komponenten -->
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref, computed, onMounted } from 'vue';
  import AdminPanel from '../../src/components/admin/AdminPanel.vue';
  
  // Determine if admin panel should be active based on current view
  const currentView = ref('admin');
  const isAdminActive = computed(() => currentView.value === 'admin');
  
  onMounted(() => {
    // Check if we should display admin panel based on URL or localStorage
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('view')) {
      currentView.value = urlParams.get('view');
    } else {
      // Check localStorage or any other source
      const storedView = localStorage.getItem('activeView');
      if (storedView) {
        currentView.value = storedView;
      }
    }
    
    console.log('Vue App Mounted - Active View:', currentView.value);
  });
  </script>
  
  <style>
  /* Wir verwenden die bestehenden CSS-Klassen, um das gleiche Look&Feel zu erhalten */
  .vue-root {
    width: 100%;
    height: 100%;
  }
  
  #admin-panel-container {
    width: 100%;
    height: 100%;
  }
  </style>