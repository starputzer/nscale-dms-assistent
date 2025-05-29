// Test script to verify MOTD functionality
console.log('Testing MOTD functionality...');

// Test 1: Check if MOTD API returns correct data
async function testMotdApi() {
    console.log('\n=== Test 1: MOTD API ===');
    try {
        const response = await fetch('/api/motd');
        const data = await response.json();
        console.log('MOTD API Response:', data);
        
        // Verify required fields
        const requiredFields = ['enabled', 'format', 'content', 'style', 'display'];
        const missingFields = requiredFields.filter(field => !(field in data));
        
        if (missingFields.length === 0) {
            console.log('✅ All required fields present');
        } else {
            console.log('❌ Missing fields:', missingFields);
        }
        
        // Verify display settings
        if (data.display && data.display.showInChat) {
            console.log('✅ MOTD is configured to show in chat');
        } else {
            console.log('❌ MOTD is NOT configured to show in chat');
        }
        
        return data;
    } catch (error) {
        console.error('❌ Error fetching MOTD:', error);
        return null;
    }
}

// Test 2: Check if MOTD store is properly initialized
async function testMotdStore() {
    console.log('\n=== Test 2: MOTD Store ===');
    
    // Wait for Vue app to be ready
    const checkApp = setInterval(() => {
        if (window.app && window.app.config && window.app.config.globalProperties) {
            clearInterval(checkApp);
            
            const stores = window.app.config.globalProperties.$pinia._s;
            const motdStore = stores.get('motd');
            
            if (motdStore) {
                console.log('✅ MOTD store found');
                console.log('Store state:', {
                    config: motdStore.config,
                    dismissed: motdStore.dismissed,
                    shouldShowInChat: motdStore.shouldShowInChat
                });
                
                // Test dismissal
                console.log('\n--- Testing dismissal ---');
                console.log('Before dismiss:', motdStore.dismissed);
                motdStore.dismiss();
                console.log('After dismiss:', motdStore.dismissed);
                
                // Reset dismissal
                motdStore.resetDismissed();
                console.log('After reset:', motdStore.dismissed);
            } else {
                console.log('❌ MOTD store not found');
            }
        }
    }, 100);
    
    // Timeout after 5 seconds
    setTimeout(() => {
        clearInterval(checkApp);
        console.log('❌ Timeout waiting for Vue app');
    }, 5000);
}

// Test 3: Check MessageList component
async function testMessageListDisplay() {
    console.log('\n=== Test 3: MessageList Display ===');
    
    const messageList = document.querySelector('.n-message-list');
    if (messageList) {
        console.log('✅ MessageList component found');
        
        const motdElement = messageList.querySelector('.n-message-list__motd');
        if (motdElement) {
            console.log('✅ MOTD element found in MessageList');
            console.log('MOTD visible:', window.getComputedStyle(motdElement).display !== 'none');
        } else {
            console.log('❌ MOTD element not found in MessageList');
        }
        
        const welcomeElement = messageList.querySelector('.n-message-list__welcome');
        if (welcomeElement) {
            console.log('✅ Welcome element found (empty chat state)');
        }
    } else {
        console.log('❌ MessageList component not found');
    }
}

// Run all tests
async function runAllTests() {
    console.log('Starting MOTD tests...\n');
    
    // Test API first
    const motdData = await testMotdApi();
    
    // Wait a bit for Vue to initialize
    setTimeout(() => {
        testMotdStore();
        testMessageListDisplay();
    }, 1000);
}

// Export for use in browser console
window.testMotd = {
    testApi: testMotdApi,
    testStore: testMotdStore,
    testDisplay: testMessageListDisplay,
    runAll: runAllTests
};

console.log('\nTest functions available on window.testMotd:');
console.log('- testMotd.testApi() - Test MOTD API endpoint');
console.log('- testMotd.testStore() - Test MOTD Pinia store');
console.log('- testMotd.testDisplay() - Test MOTD display in MessageList');
console.log('- testMotd.runAll() - Run all tests');