/**
 * Fix Commands
 * 
 * Schnelle Befehle zur Problembehebung
 */

window.fix = {
  // Alle Fixes auf einmal anwenden
  all: () => {
    console.log('🔧 Applying all fixes...');
    
    // 1. Token migration
    if (window.migrateAuthTokens) {
      window.migrateAuthTokens();
    }
    
    // 2. Auth fix
    if (window.authFix) {
      window.authFix.forceFix();
    }
    
    // 3. Batch debug
    if (window.batchDebug) {
      window.batchDebug.enableDebug();
    }
    
    console.log('✅ All fixes applied');
  },
  
  // Token-spezifische Fixes
  tokens: () => {
    console.log('🔧 Fixing tokens...');
    
    // Direct token migration
    const oldToken = localStorage.getItem('auth_token');
    if (oldToken) {
      localStorage.setItem('nscale_access_token', oldToken);
      sessionStorage.setItem('nscale_access_token', oldToken);
      
      // Update auth store
      const authStore = window.__PINIA__?.state?.value?.auth;
      if (authStore) {
        authStore.token = oldToken;
        authStore.isAuthenticated = true;
      }
      
      // Update axios defaults
      window.axios.defaults.headers.common['Authorization'] = `Bearer ${oldToken}`;
      
      console.log('✅ Tokens fixed');
    } else {
      console.error('❌ No old token found');
    }
  },
  
  // Batch-spezifische Fixes
  batch: () => {
    console.log('🔧 Fixing batch requests...');
    
    // Enable all batch debugging
    if (window.batchDebug) {
      window.batchDebug.enableDebug();
    }
    
    if (window.enhancedBatchFix) {
      window.enhancedBatchFix.diagnose();
    }
    
    console.log('✅ Batch fixes applied');
  },
  
  // Reload mit fixes
  reload: () => {
    console.log('🔧 Applying fixes and reloading...');
    window.fix.all();
    
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  },
  
  // Status check
  status: () => {
    console.log('🔍 System status:');
    
    // Auth status
    const authStore = window.__PINIA__?.state?.value?.auth;
    console.log('Auth Store:', {
      token: !!authStore?.token,
      isAuthenticated: authStore?.isAuthenticated,
      user: authStore?.user?.email
    });
    
    // Token status
    console.log('Tokens:', {
      old_auth_token: !!localStorage.getItem('auth_token'),
      nscale_access_token: !!localStorage.getItem('nscale_access_token'),
      axios_header: !!window.axios.defaults.headers.common['Authorization']
    });
    
    // Batch status
    console.log('Batch:', {
      debugEnabled: window.batchResponseFix?.debugMode || false,
      enhancedFixInitialized: window.enhancedBatchFix?.initialized || false,
      smartBatchInitialized: window.smartBatchFix?.initialized || false
    });
    
    // Endpoint validator
    if (window.endpointValidator) {
      console.log('Endpoint Validator:', {
        available: true,
        testMetadata: window.endpointValidator.isValidEndpoint('/api/sessions/123/metadata'),
        testMessages: window.endpointValidator.isValidEndpoint('/api/sessions/123/messages')
      });
    }
  },
  
  // Quick endpoint test
  testEndpoint: (endpoint) => {
    if (window.endpointValidator) {
      const isValid = window.endpointValidator.isValidEndpoint(endpoint);
      console.log(`Endpoint "${endpoint}" is ${isValid ? '✅ valid' : '❌ invalid'}`);
      
      if (!isValid) {
        const alternative = window.endpointValidator.getAlternativeEndpoint(endpoint);
        if (alternative) {
          console.log(`Alternative endpoint: ${alternative}`);
        }
      }
    } else {
      console.error('❌ Endpoint validator not available');
    }
  }
};

console.log('🛠️ Fix commands loaded. Available commands:');
console.log('  window.fix.all()    - Apply all fixes');
console.log('  window.fix.tokens() - Fix authentication tokens');
console.log('  window.fix.batch()  - Fix batch requests');
console.log('  window.fix.reload() - Apply fixes and reload');
console.log('  window.fix.status() - Check system status');