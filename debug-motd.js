// Debug MOTD display
console.log('=== MOTD Debug ===');

function debugMOTD() {
    // Check if app is ready
    if (!window.app) {
        console.log('❌ App not ready');
        return;
    }
    
    const pinia = window.app.config.globalProperties.$pinia;
    if (!pinia) {
        console.log('❌ Pinia not found');
        return;
    }
    
    // Check MOTD store
    const motdStore = pinia._s.get('motd');
    if (!motdStore) {
        console.log('❌ MOTD store not found');
        console.log('Available stores:', Array.from(pinia._s.keys()));
        return;
    }
    
    console.log('✅ MOTD Store found');
    console.log('MOTD Config:', motdStore.config);
    console.log('MOTD enabled:', motdStore.config?.enabled);
    console.log('MOTD dismissed:', motdStore.dismissed);
    console.log('MOTD shouldShowInChat:', motdStore.shouldShowInChat);
    console.log('MOTD display settings:', motdStore.config?.display);
    console.log('MOTD content:', motdStore.config?.content);
    
    // Check MessageList component
    const messageList = document.querySelector('.n-message-list');
    if (messageList) {
        console.log('✅ MessageList found');
        
        // Check for welcome state
        const welcomeDiv = messageList.querySelector('.n-message-list__welcome');
        if (welcomeDiv) {
            console.log('✅ Welcome div found (empty chat state)');
            
            // Check for MOTD element
            const motdElement = welcomeDiv.querySelector('.n-message-list__motd');
            if (motdElement) {
                console.log('✅ MOTD element found');
                console.log('MOTD element visible:', window.getComputedStyle(motdElement).display !== 'none');
            } else {
                console.log('❌ MOTD element not found in welcome div');
            }
        } else {
            console.log('❌ Welcome div not found (chat might not be empty)');
        }
        
        // Check messages
        const messages = messageList.querySelectorAll('.n-message-list__message-wrapper');
        console.log('Number of messages:', messages.length);
    } else {
        console.log('❌ MessageList component not found');
    }
    
    // Try to fetch MOTD from API
    console.log('\n🔄 Fetching MOTD from API...');
    fetch('/api/motd')
        .then(res => res.json())
        .then(data => {
            console.log('✅ MOTD API response:', data);
        })
        .catch(err => {
            console.error('❌ MOTD API error:', err);
        });
        
    // Check current route
    const route = window.app.config.globalProperties.$route;
    console.log('\nCurrent route:', route?.path);
    
    // Check sessions store
    const sessionsStore = pinia._s.get('sessions');
    if (sessionsStore) {
        console.log('\nCurrent session:', sessionsStore.currentSession);
        console.log('Messages in current session:', sessionsStore.currentMessages?.length || 0);
    }
}

// Run immediately
debugMOTD();

// Also make it available globally
window.debugMOTD = debugMOTD;

console.log('\n📌 Run window.debugMOTD() to debug again');