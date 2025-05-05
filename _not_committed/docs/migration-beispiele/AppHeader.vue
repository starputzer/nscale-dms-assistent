<template>
  <header class="nscale-header p-4 shadow-sm">
    <div class="container mx-auto flex justify-between items-center">
      <div class="flex items-center">
        <img src="/static/images/senmvku-logo.png" alt="Berlin Logo" class="h-12 mr-4">
        <div class="nscale-logo">nscale DMS Assistent</div>
      </div>
      
      <div class="flex items-center space-x-4">
        <button 
          @click="startNewSession" 
          class="nscale-btn-primary flex items-center">
          <i class="fas fa-plus mr-2"></i>
          Neue Unterhaltung
        </button>

        <button 
          v-if="userRole === 'admin'"
          @click="toggleView" 
          class="nscale-btn-secondary flex items-center"
          title="Systemadministration">
          <i class="fas fa-cog mr-2"></i>
          <span class="hidden md:inline">Administration</span>
        </button>

        <button 
          @click="logout" 
          class="nscale-btn-secondary flex items-center">
          <i class="fas fa-sign-out-alt mr-2"></i>
          Abmelden
        </button>
      </div>
    </div>
  </header>
</template>

<script>
export default {
  name: 'AppHeader',
  props: {
    userRole: {
      type: String,
      required: true
    },
    activeView: {
      type: String,
      required: true
    }
  },
  methods: {
    startNewSession() {
      this.$emit('new-session');
    },
    toggleView() {
      const newView = this.activeView === 'chat' ? 'admin' : 'chat';
      this.$emit('update:activeView', newView);
    },
    logout() {
      this.$emit('logout');
    }
  }
}
</script>

<style>
/* Da wir bereits die globale CSS-Datei verwenden, 
   sind hier nur komponentenspezifische Anpassungen notwendig */
.nscale-header {
  /* Exakte Kopie der Stile aus main.css */
}
</style>