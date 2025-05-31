
// Admin Authentication Setup Script
// Run this in your browser console at http://localhost:3003

(async function setupAuth() {
    console.log('🔐 Setting up authentication...');
    
    try {
        // Use the correct login endpoint
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username: 'martin@danglefeet.com',
                password: '123'
            })
        });
        
        if (!response.ok) {
            throw new Error(`Login failed: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Store tokens
        localStorage.setItem('nscale_access_token', data.access_token);
        localStorage.setItem('nscale_refresh_token', data.refresh_token || '');
        localStorage.setItem('nscale_token_expiry', data.expires_at || new Date(Date.now() + 24*60*60*1000).toISOString());
        
        // Store user data
        const userData = {
            id: data.user_id || 'admin',
            email: 'martin@danglefeet.com',
            name: 'Martin Admin',
            role: 'admin',
            permissions: ['admin']
        };
        localStorage.setItem('nscale_user', JSON.stringify(userData));
        
        console.log('✅ Authentication successful!');
        console.log('Token:', data.access_token.substring(0, 20) + '...');
        console.log('🔄 Refreshing page in 2 seconds...');
        
        setTimeout(() => {
            window.location.reload();
        }, 2000);
        
    } catch (error) {
        console.error('❌ Authentication failed:', error);
        console.log('Make sure the backend is running on port 8080');
    }
})();
