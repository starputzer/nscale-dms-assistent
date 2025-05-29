/**
 * Setup Admin Authentication Script
 * 
 * Dieses Script muss in der Browser-Konsole ausgeführt werden,
 * um die Authentifizierung für das Admin-Panel einzurichten.
 * 
 * Verwendung:
 * 1. Öffnen Sie http://localhost:3003 im Browser
 * 2. Öffnen Sie die Entwicklerkonsole (F12)
 * 3. Kopieren Sie dieses Script und führen Sie es aus
 */

(async function setupAdminAuth() {
  console.log('🔐 Setting up admin authentication...');
  
  // Test-Login durchführen
  try {
    const loginResponse = await fetch('/api/v1/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'martin@danglefeet.com',
        password: '123'
      })
    });

    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.status} ${loginResponse.statusText}`);
    }

    const loginData = await loginResponse.json();
    console.log('✅ Login successful:', loginData);

    if (loginData.access_token) {
      // Token in localStorage speichern (mit nscale_ prefix)
      localStorage.setItem('nscale_access_token', loginData.access_token);
      localStorage.setItem('nscale_refresh_token', loginData.refresh_token || '');
      localStorage.setItem('nscale_token_expiry', loginData.expires_at || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString());
      
      // User data speichern
      const userData = {
        id: loginData.user_id || 'admin',
        email: 'martin@danglefeet.com',
        name: 'Martin Admin',
        role: 'admin',
        permissions: ['admin']
      };
      localStorage.setItem('nscale_user', JSON.stringify(userData));
      
      console.log('✅ Authentication tokens stored in localStorage');
      console.log('📋 Token preview:', loginData.access_token.substring(0, 20) + '...');
      
      // Test API-Aufruf
      console.log('\n🧪 Testing admin API access...');
      const testResponse = await fetch('/api/v1/admin/users', {
        headers: {
          'Authorization': `Bearer ${loginData.access_token}`
        }
      });
      
      if (testResponse.ok) {
        const users = await testResponse.json();
        console.log('✅ Admin API test successful! Users:', users);
      } else {
        console.error('❌ Admin API test failed:', testResponse.status, testResponse.statusText);
      }
      
      console.log('\n✨ Setup complete! Please refresh the page to access the admin panel.');
      console.log('🔄 Refreshing in 3 seconds...');
      
      setTimeout(() => {
        window.location.reload();
      }, 3000);
      
    } else {
      throw new Error('No access token in response');
    }
  } catch (error) {
    console.error('❌ Setup failed:', error);
    console.log('\n💡 Troubleshooting tips:');
    console.log('1. Make sure the Python backend is running on port 8080');
    console.log('2. Make sure you\'re on http://localhost:3003');
    console.log('3. Check if martin@danglefeet.com exists with password "123"');
  }
})();