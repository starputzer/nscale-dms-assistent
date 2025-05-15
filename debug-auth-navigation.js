// Debug-Skript für Authentication und Navigation
// Dieses Skript kann in der Browser-Konsole ausgeführt werden

window.debugAuth = {
  // Auth Store Status prüfen
  checkAuthStatus() {
    const authStore = window.authStore || (window.app && window.app.config.globalProperties.$pinia._s.get('auth'));
    
    if (!authStore) {
      console.error('Auth Store nicht gefunden');
      return;
    }
    
    console.log('Auth Status:', {
      isAuthenticated: authStore.isAuthenticated,
      token: !!authStore.token,
      user: authStore.user,
      authState: authStore._state || authStore.$state
    });
  },

  // Router Status prüfen
  checkRouterStatus() {
    const router = window.$router || (window.app && window.app.config.globalProperties.$router);
    
    if (!router) {
      console.error('Router nicht gefunden');
      return;
    }
    
    console.log('Router Status:', {
      currentRoute: router.currentRoute.value.name,
      currentPath: router.currentRoute.value.path,
      isReady: router.isReady
    });
  },

  // Manuelle Navigation testen
  testNavigation(routeName = 'Chat') {
    const router = window.$router || (window.app && window.app.config.globalProperties.$router);
    
    if (!router) {
      console.error('Router nicht gefunden');
      return;
    }
    
    console.log(`Navigiere zu ${routeName}...`);
    router.push({ name: routeName })
      .then(() => console.log('Navigation erfolgreich'))
      .catch(err => console.error('Navigation fehlgeschlagen:', err));
  },

  // Auth Store manuell setzen (für Tests)
  setAuthenticated(value = true) {
    const authStore = window.authStore || (window.app && window.app.config.globalProperties.$pinia._s.get('auth'));
    
    if (!authStore) {
      console.error('Auth Store nicht gefunden');
      return;
    }
    
    if (authStore.$patch) {
      authStore.$patch({
        isAuthenticated: value,
        token: value ? 'test-token' : null,
        user: value ? { email: 'test@example.com', id: '123' } : null
      });
    } else {
      authStore.isAuthenticated = value;
      authStore.token = value ? 'test-token' : null;
      authStore.user = value ? { email: 'test@example.com', id: '123' } : null;
    }
    
    console.log('Auth Status geändert:', value);
  },

  // Alle Debug-Infos ausgeben
  debugAll() {
    console.log('=== AUTH DEBUG INFO ===');
    this.checkAuthStatus();
    this.checkRouterStatus();
    console.log('===================');
  }
};

console.log('Debug-Helfer geladen. Verwende window.debugAuth für Diagnose.');
console.log('Verfügbare Methoden:');
console.log('- debugAuth.checkAuthStatus()');
console.log('- debugAuth.checkRouterStatus()'); 
console.log('- debugAuth.testNavigation("RouteName")');
console.log('- debugAuth.setAuthenticated(true/false)');
console.log('- debugAuth.debugAll()');