// Debug script to check router and auth state
console.log('=== Router Debug Script ===');

// Function to check current state
function checkRouterState() {
    if (!window.app) {
        console.log('❌ App not initialized yet');
        return;
    }
    
    const router = window.app.config.globalProperties.$router;
    const route = window.app.config.globalProperties.$route;
    const pinia = window.app.config.globalProperties.$pinia;
    
    if (!router) {
        console.log('❌ Router not found');
        return;
    }
    
    console.log('✅ Router found');
    console.log('Current route:', {
        path: route?.path,
        name: route?.name,
        fullPath: route?.fullPath,
        meta: route?.meta
    });
    
    // Check auth store
    const authStore = pinia._s.get('auth');
    if (authStore) {
        console.log('Auth state:', {
            isAuthenticated: authStore.isAuthenticated,
            token: !!authStore.token,
            user: authStore.user
        });
    } else {
        console.log('❌ Auth store not found');
    }
    
    // List all registered routes
    console.log('\nRegistered routes:');
    router.getRoutes().forEach(route => {
        console.log(`  ${route.path} -> ${route.name} (requiresAuth: ${route.meta?.requiresAuth})`);
    });
    
    // Try to navigate to /chat
    console.log('\n🔄 Attempting to navigate to /chat...');
    router.push('/chat')
        .then(() => {
            console.log('✅ Navigation to /chat successful');
            console.log('New route:', router.currentRoute.value.path);
        })
        .catch(err => {
            console.error('❌ Navigation to /chat failed:', err);
        });
}

// Wait for app to be ready
let checkInterval = setInterval(() => {
    if (window.app && window.app.config.globalProperties.$router) {
        clearInterval(checkInterval);
        checkRouterState();
        
        // Also add global helper
        window.routerDebug = {
            checkState: checkRouterState,
            navigate: (path) => {
                const router = window.app.config.globalProperties.$router;
                return router.push(path);
            },
            getCurrentRoute: () => {
                return window.app.config.globalProperties.$route;
            },
            getAuthState: () => {
                const pinia = window.app.config.globalProperties.$pinia;
                const authStore = pinia._s.get('auth');
                return {
                    isAuthenticated: authStore?.isAuthenticated,
                    token: !!authStore?.token,
                    user: authStore?.user
                };
            }
        };
        
        console.log('\n📌 Debug helpers available on window.routerDebug');
    }
}, 100);

// Timeout after 5 seconds
setTimeout(() => {
    clearInterval(checkInterval);
    console.log('❌ Timeout waiting for app initialization');
}, 5000);