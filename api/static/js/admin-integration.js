/**
 * Admin-Integration für das Feature-Toggle-System
 * Dieses Skript ermöglicht den Wechsel zwischen klassischen Admin-Bereichen und Vue-basierten Implementierungen
 */
(function() {
    console.log('Admin-Integration geladen');
    
    // Stelle sicher, dass Feature-Toggle-Einstellungen existieren
    if (localStorage.getItem('feature_vueAdmin') === null) {
        localStorage.setItem('feature_vueAdmin', 'true');
        console.log('feature_vueAdmin auf true gesetzt (initial)');
    }

    // Event-Listener bei DOM-Bereitschaft
    document.addEventListener('DOMContentLoaded', function() {
        initAdminIntegration();
    });

    /**
     * Initialisiert die Admin-Integration
     */
    function initAdminIntegration() {
        // Auf Änderungen des adminTab reagieren
        watchAdminTabChanges();
        
        // Regelmäßige Überprüfung des aktuellen Tabs
        setInterval(checkActiveTab, 1000);
    }

    /**
     * Beobachtet Änderungen des Admin-Tabs und lädt ggf. Vue-Komponenten
     */
    function watchAdminTabChanges() {
        // Überprüfen, ob die Vue-Admin-Funktionalität aktiviert ist
        const useNewUI = localStorage.getItem('useNewUI') === 'true';
        const useVueAdmin = localStorage.getItem('feature_vueAdmin') === 'true';
        
        if (!useNewUI || !useVueAdmin) {
            console.log('Vue-Admin-Funktionalität ist deaktiviert');
            return;
        }

        // MutationObserver für Tab-Wechsel einrichten
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    checkActiveTab();
                }
            });
        });

        // Alle Admin-Tabs beobachten
        document.querySelectorAll('.admin-nav-item').forEach(function(tab) {
            observer.observe(tab, { attributes: true });
        });
        
        // Alle Admin-Panels beobachten für Style-Änderungen (display: none, etc.)
        document.querySelectorAll('.admin-panel-content').forEach(function(panel) {
            observer.observe(panel, { attributes: true, attributeFilter: ['style'] });
        });

        // Auf Vue.js-spezifische Änderungen lauschen - v-show/v-if
        const contentObserver = new MutationObserver(function(mutations) {
            checkActiveTab();
        });
        
        // Beobachte den gesamten Admin-Bereich für DOM-Änderungen
        const adminContainer = document.querySelector('.admin-content') || document.querySelector('.admin-container');
        if (adminContainer) {
            contentObserver.observe(adminContainer, { childList: true, subtree: true });
        }

        // Initiale Überprüfung
        checkActiveTab();
    }

    /**
     * Überprüft, welcher Admin-Tab aktiv ist und lädt ggf. Vue-Komponenten
     */
    function checkActiveTab() {
        // Debug-Info ausgeben
        console.log('Prüfe aktiven Tab...');
        console.log('localStorage.useNewUI:', localStorage.getItem('useNewUI'));
        console.log('localStorage.feature_vueAdmin:', localStorage.getItem('feature_vueAdmin'));
        
        // Debug: Alle data-tab-Elemente anzeigen
        const dataTabs = document.querySelectorAll('[data-tab]');
        console.log(`${dataTabs.length} data-tab-Elemente gefunden:`);
        dataTabs.forEach(el => {
            console.log(`- data-tab="${el.getAttribute('data-tab')}", display=${window.getComputedStyle(el).display}`);
        });
        
        // Debug: adminTab-Variable
        if (window.app && window.app.$data) {
            console.log('adminTab aus Vue app.$data:', window.app.$data.adminTab);
        }
        
        // Prüfen, ob einer der Tabs aktiv ist und sichtbar
        // Verbesserte Erkennung von Tabs durch mehrere Prüfungen
        const isTabActive = (tabName) => {
            // 1. Prüfe ob ein Element mit data-tab Attribut existiert und sichtbar ist
            const dataTabElement = document.querySelector(`.admin-panel-content[data-tab="${tabName}"]:not([style*="display: none"])`);
            if (dataTabElement) {
                console.log(`${tabName}-Tab ist aktiv (durch data-tab)`);
                return true;
            }
            
            // 2. Prüfe ob ein Element mit spezifischer ID existiert
            const idElement = document.getElementById(`admin-${tabName}-panel`);
            if (idElement && window.getComputedStyle(idElement).display !== 'none') {
                console.log(`${tabName}-Tab ist aktiv (durch id)`);
                return true;
            }
            
            // 3. Prüfe auf Vue.js v-if/v-show Status durch Klassen
            if (window.app && window.app.$data && window.app.$data.adminTab === tabName) {
                const activeElements = document.querySelectorAll(`.admin-panel-content`);
                for (const el of activeElements) {
                    if (window.getComputedStyle(el).display !== 'none') {
                        console.log(`${tabName}-Tab ist aktiv (durch Vue.js adminTab)`);
                        return true;
                    }
                }
            }
            
            return false;
        };
        
        // Initialisiere den aktiven Tab
        if (isTabActive('feedback')) {
            initFeedbackTab();
        } 
        else if (isTabActive('motd')) {
            initMotdTab();
        }
        else if (isTabActive('users')) {
            initUsersTab();
        }
        else if (isTabActive('system')) {
            initSystemTab();
        } else {
            console.log('Kein Tab als aktiv erkannt');
        }
    }

    /**
     * Initialisiert den Feedback-Tab mit Vue.js
     */
    function initFeedbackTab() {
        console.log('Initialisiere Vue-basierten Feedback-Tab');
        
        // Ermitteln, ob Feature aktiviert ist
        const useNewUI = localStorage.getItem('useNewUI') === 'true';
        const useVueAdmin = localStorage.getItem('feature_vueAdmin') === 'true';
        
        if (!useNewUI || !useVueAdmin) {
            console.log('Vue-Admin-Funktionalität ist deaktiviert, verwende klassische Implementierung');
            return;
        }

        // Container für den Feedback-Tab finden
        const container = document.querySelector('.admin-panel-content[data-tab="feedback"]:not([style*="display: none"])') || 
                          document.getElementById('admin-feedback-panel');
        if (!container) {
            console.warn('Feedback-Tab-Container nicht gefunden');
            return;
        }
        
        // Prüfen, ob bereits initialisiert
        if (container.getAttribute('data-vue-initialized') === 'true') {
            console.log('Feedback-Tab bereits initialisiert, überspringe...');
            return;
        }
        
        // Als initialisiert markieren
        container.setAttribute('data-vue-initialized', 'true');

        // Container leeren
        container.innerHTML = '';
        
        // Lade-Indikator anzeigen
        const loadingElement = document.createElement('div');
        loadingElement.className = 'loading-container p-4';
        loadingElement.innerHTML = `
            <div class="loader-container text-center">
                <div class="loader mx-auto mb-4"></div>
                <p class="text-gray-600">Vue.js Feedback-Ansicht wird geladen...</p>
            </div>
        `;
        container.appendChild(loadingElement);
        
        // Mount-Point für die Vue.js-Komponente erstellen
        const mountPoint = document.createElement('div');
        mountPoint.id = 'feedback-admin-app';
        container.appendChild(mountPoint);

        // Timeout für Fallback
        const vueTimeout = setTimeout(function() {
            console.warn('Vue.js Feedback-Ansicht konnte nicht geladen werden, wechsle zu Fallback');
            loadFallbackFeedback(container);
        }, 5000);

        // Prüfen, ob das Skript bereits geladen wurde
        const existingScript = document.querySelector('script[src="/api/static/vue/standalone/admin-feedback.js"]');
        if (existingScript) {
            console.log('Feedback-Skript bereits geladen, versuche direkte Initialisierung');
            clearTimeout(vueTimeout);
            // Warten auf die globale Initialisierungsfunktion
            if (window.initAdminFeedback) {
                window.initAdminFeedback();
            }
            return;
        }

        // Vue-Komponente laden (ohne module type für Browser-Kompatibilität)
        const vueScript = document.createElement('script');
        vueScript.type = 'text/javascript';
        vueScript.src = '/api/static/vue/standalone/admin-feedback.js';
        
        vueScript.onload = function() {
            console.log('Vue.js Feedback-Ansicht erfolgreich geladen');
            clearTimeout(vueTimeout);
        };
        
        vueScript.onerror = function() {
            console.error('Fehler beim Laden der Vue.js Feedback-Ansicht');
            clearTimeout(vueTimeout);
            loadFallbackFeedback(container);
        };
        
        document.body.appendChild(vueScript);
    }

    /**
     * Lädt die Fallback-Implementierung für den Feedback-Tab
     */
    function loadFallbackFeedback(container) {
        if (!container) return;
        
        // Entferne den Lade-Indikator
        const loadingElement = container.querySelector('.loading-container');
        if (loadingElement) {
            loadingElement.remove();
        }
        
        // Entferne den Mount-Point
        const mountPoint = container.querySelector('#feedback-admin-app');
        if (mountPoint) {
            mountPoint.remove();
        }
        
        // Zeige Fallback-Nachricht an
        const fallbackElement = document.createElement('div');
        fallbackElement.className = 'admin-card mb-8';
        fallbackElement.innerHTML = `
            <div class="admin-card-title">Feedback-Übersicht</div>
            <div class="flex flex-col items-center justify-center p-8 text-gray-500">
                <i class="fas fa-comments text-5xl mb-4 opacity-30"></i>
                <p class="text-lg">Die Vue.js-Implementierung konnte nicht geladen werden.</p>
                <p class="text-sm mt-2">Es wird die klassische Implementierung verwendet.</p>
            </div>
        `;
        container.appendChild(fallbackElement);
        
        // Hier könnte die klassische Implementierung geladen werden, wenn vorhanden
    }

    /**
     * Initialisiert den MOTD-Tab mit Vue.js
     */
    function initMotdTab() {
        console.log('Initialisiere Vue-basierten MOTD-Tab');
        
        // Ermitteln, ob Feature aktiviert ist
        const useNewUI = localStorage.getItem('useNewUI') === 'true';
        const useVueAdmin = localStorage.getItem('feature_vueAdmin') === 'true';
        
        if (!useNewUI || !useVueAdmin) {
            console.log('Vue-Admin-Funktionalität ist deaktiviert, verwende klassische Implementierung');
            return;
        }

        // Container für den MOTD-Tab finden
        const container = document.querySelector('.admin-panel-content[data-tab="motd"]:not([style*="display: none"])') || 
                          document.getElementById('admin-motd-panel');
        if (!container) {
            console.warn('MOTD-Tab-Container nicht gefunden');
            return;
        }
        
        // Prüfen, ob bereits initialisiert
        if (container.getAttribute('data-vue-initialized') === 'true') {
            console.log('MOTD-Tab bereits initialisiert, überspringe...');
            return;
        }
        
        // Als initialisiert markieren
        container.setAttribute('data-vue-initialized', 'true');

        // Container leeren
        container.innerHTML = '';
        
        // Lade-Indikator anzeigen
        const loadingElement = document.createElement('div');
        loadingElement.className = 'loading-container p-4';
        loadingElement.innerHTML = `
            <div class="loader-container text-center">
                <div class="loader mx-auto mb-4"></div>
                <p class="text-gray-600">Vue.js MOTD-Verwaltung wird geladen...</p>
            </div>
        `;
        container.appendChild(loadingElement);
        
        // Mount-Point für die Vue.js-Komponente erstellen
        const mountPoint = document.createElement('div');
        mountPoint.id = 'motd-admin-app';
        container.appendChild(mountPoint);

        // Timeout für Fallback
        const vueTimeout = setTimeout(function() {
            console.warn('Vue.js MOTD-Verwaltung konnte nicht geladen werden, wechsle zu Fallback');
            loadFallbackMotd(container);
        }, 5000);
        
        // Prüfen, ob das Skript bereits geladen wurde
        const existingScript = document.querySelector('script[src="/api/static/vue/standalone/admin-motd.js"]');
        if (existingScript) {
            console.log('MOTD-Skript bereits geladen, versuche direkte Initialisierung');
            clearTimeout(vueTimeout);
            // Warten auf die globale Initialisierungsfunktion
            if (window.initAdminMotd) {
                window.initAdminMotd();
            }
            return;
        }

        // Vue-Komponente laden (ohne module type für Browser-Kompatibilität)
        const vueScript = document.createElement('script');
        vueScript.type = 'text/javascript';
        vueScript.src = '/api/static/vue/standalone/admin-motd.js';
        
        vueScript.onload = function() {
            console.log('Vue.js MOTD-Verwaltung erfolgreich geladen');
            clearTimeout(vueTimeout);
        };
        
        vueScript.onerror = function() {
            console.error('Fehler beim Laden der Vue.js MOTD-Verwaltung');
            clearTimeout(vueTimeout);
            loadFallbackMotd(container);
        };
        
        document.body.appendChild(vueScript);
    }

    /**
     * Lädt die Fallback-Implementierung für den MOTD-Tab
     */
    function loadFallbackMotd(container) {
        if (!container) return;
        
        // Entferne den Lade-Indikator
        const loadingElement = container.querySelector('.loading-container');
        if (loadingElement) {
            loadingElement.remove();
        }
        
        // Entferne den Mount-Point
        const mountPoint = container.querySelector('#motd-admin-app');
        if (mountPoint) {
            mountPoint.remove();
        }
        
        // Zeige Fallback-Nachricht an
        const fallbackElement = document.createElement('div');
        fallbackElement.className = 'admin-card mb-8';
        fallbackElement.innerHTML = `
            <div class="admin-card-title">MOTD-Verwaltung</div>
            <div class="flex flex-col items-center justify-center p-8 text-gray-500">
                <i class="fas fa-bullhorn text-5xl mb-4 opacity-30"></i>
                <p class="text-lg">Die Vue.js-Implementierung konnte nicht geladen werden.</p>
                <p class="text-sm mt-2">Es wird die klassische Implementierung verwendet.</p>
            </div>
        `;
        container.appendChild(fallbackElement);
    }

    /**
     * Initialisiert den Users-Tab mit Vue.js
     */
    function initUsersTab() {
        console.log('Initialisiere Vue-basierten Users-Tab');
        
        // Ermitteln, ob Feature aktiviert ist
        const useNewUI = localStorage.getItem('useNewUI') === 'true';
        const useVueAdmin = localStorage.getItem('feature_vueAdmin') === 'true';
        
        if (!useNewUI || !useVueAdmin) {
            console.log('Vue-Admin-Funktionalität ist deaktiviert, verwende klassische Implementierung');
            return;
        }

        // Container für den Users-Tab finden
        const container = document.querySelector('.admin-panel-content[data-tab="users"]:not([style*="display: none"])') || 
                          document.getElementById('admin-users-panel');
        if (!container) {
            console.warn('Users-Tab-Container nicht gefunden');
            return;
        }
        
        // Prüfen, ob bereits initialisiert
        if (container.getAttribute('data-vue-initialized') === 'true') {
            console.log('Users-Tab bereits initialisiert, überspringe...');
            return;
        }
        
        // Als initialisiert markieren
        container.setAttribute('data-vue-initialized', 'true');

        // Container leeren
        container.innerHTML = '';
        
        // Lade-Indikator anzeigen
        const loadingElement = document.createElement('div');
        loadingElement.className = 'loading-container p-4';
        loadingElement.innerHTML = `
            <div class="loader-container text-center">
                <div class="loader mx-auto mb-4"></div>
                <p class="text-gray-600">Vue.js Benutzerverwaltung wird geladen...</p>
            </div>
        `;
        container.appendChild(loadingElement);
        
        // Mount-Point für die Vue.js-Komponente erstellen
        const mountPoint = document.createElement('div');
        mountPoint.id = 'users-admin-app';
        container.appendChild(mountPoint);

        // Timeout für Fallback
        const vueTimeout = setTimeout(function() {
            console.warn('Vue.js Benutzerverwaltung konnte nicht geladen werden, wechsle zu Fallback');
            loadFallbackUsers(container);
        }, 5000);
        
        // Prüfen, ob das Skript bereits geladen wurde
        const existingScript = document.querySelector('script[src="/api/static/vue/standalone/admin-users.js"]');
        if (existingScript) {
            console.log('Users-Skript bereits geladen, versuche direkte Initialisierung');
            clearTimeout(vueTimeout);
            // Warten auf die globale Initialisierungsfunktion
            if (window.initAdminUsers) {
                window.initAdminUsers();
            }
            return;
        }

        // Vue-Komponente laden (ohne module type für Browser-Kompatibilität)
        const vueScript = document.createElement('script');
        vueScript.type = 'text/javascript';
        vueScript.src = '/api/static/vue/standalone/admin-users.js';
        
        vueScript.onload = function() {
            console.log('Vue.js Benutzerverwaltung erfolgreich geladen');
            clearTimeout(vueTimeout);
        };
        
        vueScript.onerror = function() {
            console.error('Fehler beim Laden der Vue.js Benutzerverwaltung');
            clearTimeout(vueTimeout);
            loadFallbackUsers(container);
        };
        
        document.body.appendChild(vueScript);
    }

    /**
     * Lädt die Fallback-Implementierung für den Users-Tab
     */
    function loadFallbackUsers(container) {
        if (!container) return;
        
        // Entferne den Lade-Indikator
        const loadingElement = container.querySelector('.loading-container');
        if (loadingElement) {
            loadingElement.remove();
        }
        
        // Entferne den Mount-Point
        const mountPoint = container.querySelector('#users-admin-app');
        if (mountPoint) {
            mountPoint.remove();
        }
        
        // Zeige Fallback-Nachricht an
        const fallbackElement = document.createElement('div');
        fallbackElement.className = 'admin-card mb-8';
        fallbackElement.innerHTML = `
            <div class="admin-card-title">Benutzerverwaltung</div>
            <div class="flex flex-col items-center justify-center p-8 text-gray-500">
                <i class="fas fa-users text-5xl mb-4 opacity-30"></i>
                <p class="text-lg">Die Vue.js-Implementierung konnte nicht geladen werden.</p>
                <p class="text-sm mt-2">Es wird die klassische Implementierung verwendet.</p>
            </div>
        `;
        container.appendChild(fallbackElement);
    }

    /**
     * Initialisiert den System-Tab mit Vue.js
     */
    function initSystemTab() {
        console.log('Initialisiere Vue-basierten System-Tab');
        
        // Ermitteln, ob Feature aktiviert ist
        const useNewUI = localStorage.getItem('useNewUI') === 'true';
        const useVueAdmin = localStorage.getItem('feature_vueAdmin') === 'true';
        
        if (!useNewUI || !useVueAdmin) {
            console.log('Vue-Admin-Funktionalität ist deaktiviert, verwende klassische Implementierung');
            return;
        }

        // Container für den System-Tab finden
        const container = document.querySelector('.admin-panel-content[data-tab="system"]:not([style*="display: none"])') || 
                          document.getElementById('admin-system-panel');
        if (!container) {
            console.warn('System-Tab-Container nicht gefunden');
            return;
        }
        
        // Prüfen, ob bereits initialisiert
        if (container.getAttribute('data-vue-initialized') === 'true') {
            console.log('System-Tab bereits initialisiert, überspringe...');
            return;
        }
        
        // Als initialisiert markieren
        container.setAttribute('data-vue-initialized', 'true');

        // Container leeren
        container.innerHTML = '';
        
        // Lade-Indikator anzeigen
        const loadingElement = document.createElement('div');
        loadingElement.className = 'loading-container p-4';
        loadingElement.innerHTML = `
            <div class="loader-container text-center">
                <div class="loader mx-auto mb-4"></div>
                <p class="text-gray-600">Vue.js System-Monitoring wird geladen...</p>
            </div>
        `;
        container.appendChild(loadingElement);
        
        // Mount-Point für die Vue.js-Komponente erstellen
        const mountPoint = document.createElement('div');
        mountPoint.id = 'system-admin-app';
        container.appendChild(mountPoint);

        // Timeout für Fallback
        const vueTimeout = setTimeout(function() {
            console.warn('Vue.js System-Monitoring konnte nicht geladen werden, wechsle zu Fallback');
            loadFallbackSystem(container);
        }, 5000);
        
        // Prüfen, ob das Skript bereits geladen wurde
        const existingScript = document.querySelector('script[src="/api/static/vue/standalone/admin-system.js"]');
        if (existingScript) {
            console.log('System-Skript bereits geladen, versuche direkte Initialisierung');
            clearTimeout(vueTimeout);
            // Warten auf die globale Initialisierungsfunktion
            if (window.initAdminSystem) {
                window.initAdminSystem();
            }
            return;
        }

        // Vue-Komponente laden (ohne module type für Browser-Kompatibilität)
        const vueScript = document.createElement('script');
        vueScript.type = 'text/javascript';
        vueScript.src = '/api/static/vue/standalone/admin-system.js';
        
        vueScript.onload = function() {
            console.log('Vue.js System-Monitoring erfolgreich geladen');
            clearTimeout(vueTimeout);
        };
        
        vueScript.onerror = function() {
            console.error('Fehler beim Laden des Vue.js System-Monitorings');
            clearTimeout(vueTimeout);
            loadFallbackSystem(container);
        };
        
        document.body.appendChild(vueScript);
    }

    /**
     * Lädt die Fallback-Implementierung für den System-Tab
     */
    function loadFallbackSystem(container) {
        if (!container) return;
        
        // Entferne den Lade-Indikator
        const loadingElement = container.querySelector('.loading-container');
        if (loadingElement) {
            loadingElement.remove();
        }
        
        // Entferne den Mount-Point
        const mountPoint = container.querySelector('#system-admin-app');
        if (mountPoint) {
            mountPoint.remove();
        }
        
        // Zeige Fallback-Nachricht an
        const fallbackElement = document.createElement('div');
        fallbackElement.className = 'admin-card mb-8';
        fallbackElement.innerHTML = `
            <div class="admin-card-title">System-Monitoring</div>
            <div class="flex flex-col items-center justify-center p-8 text-gray-500">
                <i class="fas fa-chart-line text-5xl mb-4 opacity-30"></i>
                <p class="text-lg">Die Vue.js-Implementierung konnte nicht geladen werden.</p>
                <p class="text-sm mt-2">Es wird die klassische Implementierung verwendet.</p>
            </div>
        `;
        container.appendChild(fallbackElement);
    }

    // Öffentliche API für leichteren Zugriff
    window.adminIntegration = {
        refreshCurrentTab: function() {
            checkActiveTab();
        },
        
        // Debug-Hilfe: Vue-Admin-Komponenten aktivieren
        enableVueAdmin: function() {
            localStorage.setItem('useNewUI', 'true');
            localStorage.setItem('feature_vueAdmin', 'true');
            console.log('Vue-Admin aktiviert. Seite neu laden...');
            setTimeout(() => { window.location.reload(); }, 500);
        },
        
        // Debug-Hilfe: Vue-Admin-Komponenten deaktivieren
        disableVueAdmin: function() {
            localStorage.setItem('feature_vueAdmin', 'false');
            console.log('Vue-Admin deaktiviert. Seite neu laden...');
            setTimeout(() => { window.location.reload(); }, 500);
        }
    };
})();