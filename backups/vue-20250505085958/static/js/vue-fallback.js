// Vue-Fallback-System
window.addEventListener('error', function(e) {
    // Prüfen, ob es sich um einen Vue-Fehler handelt
    if (e.message && (e.message.includes('Vue') || e.message.includes('Pinia') || e.message.includes('router'))) {
        console.error('[vue-fallback] Vue.js Fehler erkannt:', e.message);
        
        // Features zurücksetzen
        localStorage.setItem('feature_useNewUI', 'false');
        localStorage.setItem('feature_vueDocConverter', 'false');
        localStorage.setItem('feature_vueSettings', 'false');
        localStorage.setItem('feature_vueAdmin', 'false');
        localStorage.setItem('feature_vueChat', 'false');
        
        // Benutzer informieren
        if (!document.getElementById('vue-error-notification')) {
            const notification = document.createElement('div');
            notification.id = 'vue-error-notification';
            notification.style.position = 'fixed';
            notification.style.top = '10px';
            notification.style.left = '50%';
            notification.style.transform = 'translateX(-50%)';
            notification.style.zIndex = '9999';
            notification.style.padding = '15px';
            notification.style.backgroundColor = '#f8d7da';
            notification.style.color = '#721c24';
            notification.style.borderRadius = '4px';
            notification.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
            notification.innerHTML = 'Vue.js-Fehler aufgetreten. Wechsle zu klassischer UI... <span style="cursor:pointer;margin-left:10px;" onclick="location.reload()">Neu laden</span>';
            document.body.appendChild(notification);
            
            // Nach 3 Sekunden neu laden
            setTimeout(() => location.reload(), 3000);
        }
    }
}, true);
