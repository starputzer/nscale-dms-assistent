// Check registered routes
console.log('=== Checking Routes ===');

setTimeout(() => {
    if (window.app && window.app.config.globalProperties.$router) {
        const router = window.app.config.globalProperties.$router;
        const routes = router.getRoutes();
        
        console.log('All registered routes:');
        routes.forEach(route => {
            console.log(`  ${route.path} -> ${route.name || 'unnamed'} (Component: ${route.components?.default?.name || 'Unknown'})`);
        });
        
        // Try to resolve /chat
        console.log('\nResolving /chat:');
        try {
            const resolved = router.resolve('/chat');
            console.log('Resolved:', resolved);
        } catch (e) {
            console.error('Failed to resolve /chat:', e);
        }
        
        // Current route
        const currentRoute = router.currentRoute.value;
        console.log('\nCurrent route:', {
            path: currentRoute.path,
            name: currentRoute.name,
            matched: currentRoute.matched.map(m => m.path)
        });
    }
}, 1000);