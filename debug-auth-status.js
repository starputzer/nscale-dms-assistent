// Direkte Auth-Status-Überprüfung
console.log('=== AUTH STATUS DEBUG ===');

// Check localStorage
const tokens = {};
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i);
  if (key.includes('token') || key.includes('auth')) {
    tokens[key] = localStorage.getItem(key)?.substring(0, 50) + '...';
  }
}
console.log('Tokens in localStorage:', tokens);

// Check authDiagnostics
if (window.authDiagnostics) {
  console.log('authDiagnostics available');
  window.authDiagnostics.checkAuthStatus();
} else {
  console.log('authDiagnostics NOT available');
}

// Check stores
if (window.chatDiagnostics) {
  const stores = window.chatDiagnostics;
  console.log('Auth store state:', stores.authStore.isAuthenticated);
  console.log('Sessions count:', stores.sessionsStore.sessions.length);
  console.log('Current session ID:', stores.sessionsStore.currentSessionId);
} else {
  console.log('chatDiagnostics NOT available');
}

// Check for errors
const errorElements = document.querySelectorAll('.critical-error, .n-chat-error');
console.log('Error elements found:', errorElements.length);

// Check app state
const appElement = document.getElementById('app');
console.log('App element:', appElement);
console.log('App HTML length:', appElement?.innerHTML.length);

console.log('=== END AUTH STATUS DEBUG ===');
EOF < /dev/null
