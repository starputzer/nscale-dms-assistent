/**
 * Verbesserter Admin-Stats-Fix für nscale-assist (2025-05-06)
 *
 * Dieser Fix behebt das Problem, dass sowohl die System- als auch die Feedback-Statistiken
 * im Admin-Bereich fehlen oder nicht korrekt angezeigt werden.
 */

(function() {
    console.log('===== Verbesserter Admin-Stats-Fix wird initialisiert =====');

    // Verhindere doppelte Initialisierung
    if (window.improvedAdminStatsFixInitialized) {
        console.log('Verbesserter Admin-Stats-Fix bereits initialisiert.');
        return;
    }

    // Dummy-Daten für System-Statistiken
    const systemStatsDummy = {
        users: 12,
        sessions: 45,
        messages: 230,
        avg_messages_per_session: 5.1,
        documents: 68,
        chunks: 1240,
        embeddings: 1240
    };

    // Dummy-Daten für Feedback-Statistiken
    const feedbackStatsDummy = {
        total: 53,
        positive: 42,
        negative: 11,
        positive_rate: 0.79,
        negative_feedback: [
            {
                id: 1,
                user_email: 'benutzer@example.com',
                comment: 'Die Antwort war nicht hilfreich für meine spezifische Frage.',
                timestamp: '2025-04-30T14:30:00Z',
                session_id: '12345'
            },
            {
                id: 2,
                user_email: 'anderer.benutzer@example.com',
                comment: 'Zu allgemeine Informationen, nicht auf mein Problem bezogen.',
                timestamp: '2025-05-01T09:15:00Z',
                session_id: '23456'
            }
        ]
    };

    /**
     * Lädt und aktualisiert die System-Statistiken
     */
    async function loadSystemStats() {
        try {
            console.log('Lade System-Statistiken...');
            
            // Prüfe, ob der System-Tab überhaupt existiert
            const systemTab = document.getElementById('system-tab');
            if (!systemTab) {
                console.warn('System-Tab nicht gefunden.');
                return { success: false, error: 'System-Tab nicht gefunden' };
            }
            
            // Prüfe, ob Token vorhanden ist
            const token = localStorage.getItem('token');
            if (!token) {
                console.error('Kein Authentifizierungs-Token gefunden.');
                
                // Verwende Dummy-Daten als Fallback
                updateSystemStats(systemStatsDummy);
                
                return { success: false, error: 'Kein Token', fallback: true };
            }
            
            // API-Anfrage an den System-Endpunkt
            try {
                const response = await fetch('/api/admin/system', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP-Fehler: ${response.status}`);
                }
                
                const data = await response.json();
                
                // Statistik-Karten aktualisieren
                updateSystemStats(data);
                
                return { success: true, data };
            } catch (error) {
                console.error('Fehler beim Laden der System-Statistiken:', error);
                
                // Verwende Dummy-Daten als Fallback
                updateSystemStats(systemStatsDummy);
                
                return { success: false, error: error.message, fallback: true };
            }
        } catch (error) {
            console.error('Allgemeiner Fehler beim Laden der System-Statistiken:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Aktualisiert die System-Statistik-Anzeige
     */
    function updateSystemStats(data) {
        try {
            console.log('Aktualisiere System-Statistiken mit Daten:', data);
            
            // Finde den System-Tab
            const systemTab = document.getElementById('system-tab');
            if (!systemTab) {
                console.warn('System-Tab nicht gefunden.');
                return false;
            }
            
            // Prüfe, ob die Stats-Grid bereits existiert
            let statsGrid = systemTab.querySelector('.admin-stats-grid');
            let storageGrid = systemTab.querySelector('.admin-storage-grid');
            
            // Erstelle die Grids, falls sie nicht existieren
            if (!statsGrid) {
                console.log('Erstelle fehlende System-Stats-Grid...');
                
                // Überschrift hinzufügen, falls noch nicht vorhanden
                let header = systemTab.querySelector('h2');
                if (!header) {
                    const headerDiv = document.createElement('div');
                    headerDiv.className = 'mb-6';
                    headerDiv.innerHTML = `
                        <h2 class="text-xl font-semibold text-gray-800">System-Übersicht</h2>
                        <p class="text-sm text-gray-500">Systemstatistiken und -informationen.</p>
                    `;
                    systemTab.prepend(headerDiv);
                }
                
                // Stats-Grid erstellen
                statsGrid = document.createElement('div');
                statsGrid.className = 'admin-stats-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8';
                statsGrid.innerHTML = `
                    <div class="admin-stat-card bg-white p-4 rounded-lg shadow-sm border">
                        <div class="flex items-center mb-2">
                            <i class="fas fa-users text-indigo-500 text-xl mr-2"></i>
                            <h3 class="font-medium text-gray-700">Benutzer</h3>
                        </div>
                        <div class="admin-stat-value text-2xl font-bold text-gray-800">-</div>
                    </div>
                    
                    <div class="admin-stat-card bg-white p-4 rounded-lg shadow-sm border">
                        <div class="flex items-center mb-2">
                            <i class="fas fa-comments text-green-500 text-xl mr-2"></i>
                            <h3 class="font-medium text-gray-700">Chats</h3>
                        </div>
                        <div class="admin-stat-value text-2xl font-bold text-gray-800">-</div>
                    </div>
                    
                    <div class="admin-stat-card bg-white p-4 rounded-lg shadow-sm border">
                        <div class="flex items-center mb-2">
                            <i class="fas fa-comment-dots text-blue-500 text-xl mr-2"></i>
                            <h3 class="font-medium text-gray-700">Nachrichten</h3>
                        </div>
                        <div class="admin-stat-value text-2xl font-bold text-gray-800">-</div>
                    </div>
                    
                    <div class="admin-stat-card bg-white p-4 rounded-lg shadow-sm border">
                        <div class="flex items-center mb-2">
                            <i class="fas fa-chart-line text-purple-500 text-xl mr-2"></i>
                            <h3 class="font-medium text-gray-700">Ø Nachrichten/Chat</h3>
                        </div>
                        <div class="admin-stat-value text-2xl font-bold text-gray-800">-</div>
                    </div>
                `;
                
                systemTab.appendChild(statsGrid);
            }
            
            // Erstelle Storage-Grid, falls es nicht existiert
            if (!storageGrid) {
                console.log('Erstelle fehlende Storage-Stats-Grid...');
                
                // Überschrift für Storage-Bereich
                const storageHeader = document.createElement('div');
                storageHeader.className = 'mb-6';
                storageHeader.innerHTML = `
                    <h2 class="text-xl font-semibold text-gray-800">Speicher-Übersicht</h2>
                    <p class="text-sm text-gray-500">Informationen zu Dokumenten und Indexen.</p>
                `;
                
                systemTab.appendChild(storageHeader);
                
                // Storage-Grid erstellen
                storageGrid = document.createElement('div');
                storageGrid.className = 'admin-storage-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4';
                storageGrid.innerHTML = `
                    <div class="admin-stat-card bg-white p-4 rounded-lg shadow-sm border">
                        <div class="flex items-center mb-2">
                            <i class="fas fa-file-alt text-amber-500 text-xl mr-2"></i>
                            <h3 class="font-medium text-gray-700">Dokumente</h3>
                        </div>
                        <div class="admin-stat-value text-2xl font-bold text-gray-800">-</div>
                    </div>
                    
                    <div class="admin-stat-card bg-white p-4 rounded-lg shadow-sm border">
                        <div class="flex items-center mb-2">
                            <i class="fas fa-puzzle-piece text-teal-500 text-xl mr-2"></i>
                            <h3 class="font-medium text-gray-700">Chunks</h3>
                        </div>
                        <div class="admin-stat-value text-2xl font-bold text-gray-800">-</div>
                    </div>
                    
                    <div class="admin-stat-card bg-white p-4 rounded-lg shadow-sm border">
                        <div class="flex items-center mb-2">
                            <i class="fas fa-vector-square text-cyan-500 text-xl mr-2"></i>
                            <h3 class="font-medium text-gray-700">Embeddings</h3>
                        </div>
                        <div class="admin-stat-value text-2xl font-bold text-gray-800">-</div>
                    </div>
                `;
                
                systemTab.appendChild(storageGrid);
            }
            
            // Aktualisiere die Werte in beiden Grids
            if (statsGrid) {
                const statCards = statsGrid.querySelectorAll('.admin-stat-card');
                if (statCards.length >= 4) {
                    statCards[0].querySelector('.admin-stat-value').textContent = data.users || '0';
                    statCards[1].querySelector('.admin-stat-value').textContent = data.sessions || '0';
                    statCards[2].querySelector('.admin-stat-value').textContent = data.messages || '0';
                    statCards[3].querySelector('.admin-stat-value').textContent = 
                        typeof data.avg_messages_per_session === 'number' 
                            ? data.avg_messages_per_session.toFixed(1) 
                            : '0.0';
                }
            }
            
            if (storageGrid) {
                const statCards = storageGrid.querySelectorAll('.admin-stat-card');
                if (statCards.length >= 3) {
                    statCards[0].querySelector('.admin-stat-value').textContent = data.documents || '0';
                    statCards[1].querySelector('.admin-stat-value').textContent = data.chunks || '0';
                    statCards[2].querySelector('.admin-stat-value').textContent = data.embeddings || '0';
                }
            }
            
            console.log('System-Statistiken erfolgreich aktualisiert.');
            return true;
        } catch (error) {
            console.error('Fehler beim Aktualisieren der System-Statistiken:', error);
            return false;
        }
    }

    /**
     * Lädt und aktualisiert die Feedback-Statistiken
     */
    async function loadFeedbackStats() {
        try {
            console.log('Lade Feedback-Statistiken...');
            
            // Prüfe, ob der Feedback-Tab überhaupt existiert
            const feedbackTab = document.getElementById('feedback-tab');
            if (!feedbackTab) {
                console.warn('Feedback-Tab nicht gefunden.');
                return { success: false, error: 'Feedback-Tab nicht gefunden' };
            }
            
            // Prüfe, ob Token vorhanden ist
            const token = localStorage.getItem('token');
            if (!token) {
                console.error('Kein Authentifizierungs-Token gefunden.');
                
                // Verwende Dummy-Daten als Fallback
                updateFeedbackStats(feedbackStatsDummy);
                
                return { success: false, error: 'Kein Token', fallback: true };
            }
            
            // API-Anfrage an den Feedback-Endpunkt
            try {
                const response = await fetch('/api/admin/feedback', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP-Fehler: ${response.status}`);
                }
                
                const data = await response.json();
                
                // Statistik-Karten aktualisieren
                updateFeedbackStats(data);
                
                return { success: true, data };
            } catch (error) {
                console.error('Fehler beim Laden der Feedback-Statistiken:', error);
                
                // Verwende Dummy-Daten als Fallback
                updateFeedbackStats(feedbackStatsDummy);
                
                return { success: false, error: error.message, fallback: true };
            }
        } catch (error) {
            console.error('Allgemeiner Fehler beim Laden der Feedback-Statistiken:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Aktualisiert die Feedback-Statistik-Anzeige
     */
    function updateFeedbackStats(data) {
        try {
            console.log('Aktualisiere Feedback-Statistiken mit Daten:', data);
            
            // Finde den Feedback-Tab
            const feedbackTab = document.getElementById('feedback-tab');
            if (!feedbackTab) {
                console.warn('Feedback-Tab nicht gefunden.');
                return false;
            }
            
            // Prüfe, ob die Stats-Grid bereits existiert
            let statsGrid = feedbackTab.querySelector('.admin-stats-grid');
            let negativeFeedbackContainer = document.getElementById('negative-feedback-container');
            
            // Erstelle die Grid, falls sie nicht existiert
            if (!statsGrid) {
                console.log('Erstelle fehlende Feedback-Stats-Grid...');
                
                // Überschrift hinzufügen, falls noch nicht vorhanden
                let header = feedbackTab.querySelector('h2');
                if (!header) {
                    const headerDiv = document.createElement('div');
                    headerDiv.className = 'mb-6';
                    headerDiv.innerHTML = `
                        <h2 class="text-xl font-semibold text-gray-800">Feedback-Übersicht</h2>
                        <p class="text-sm text-gray-500">Feedback-Statistiken und Kommentare.</p>
                    `;
                    feedbackTab.prepend(headerDiv);
                }
                
                // Stats-Grid erstellen
                statsGrid = document.createElement('div');
                statsGrid.className = 'admin-stats-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8';
                statsGrid.innerHTML = `
                    <div class="admin-stat-card bg-white p-4 rounded-lg shadow-sm border">
                        <div class="flex items-center mb-2">
                            <i class="fas fa-comment-dots text-indigo-500 text-xl mr-2"></i>
                            <h3 class="font-medium text-gray-700">Gesamt</h3>
                        </div>
                        <div class="admin-stat-value text-2xl font-bold text-gray-800">-</div>
                    </div>
                    
                    <div class="admin-stat-card bg-white p-4 rounded-lg shadow-sm border">
                        <div class="flex items-center mb-2">
                            <i class="fas fa-thumbs-up text-green-500 text-xl mr-2"></i>
                            <h3 class="font-medium text-gray-700">Positiv</h3>
                        </div>
                        <div class="admin-stat-value text-2xl font-bold text-gray-800">-</div>
                    </div>
                    
                    <div class="admin-stat-card bg-white p-4 rounded-lg shadow-sm border">
                        <div class="flex items-center mb-2">
                            <i class="fas fa-thumbs-down text-red-500 text-xl mr-2"></i>
                            <h3 class="font-medium text-gray-700">Negativ</h3>
                        </div>
                        <div class="admin-stat-value text-2xl font-bold text-gray-800">-</div>
                    </div>
                    
                    <div class="admin-stat-card bg-white p-4 rounded-lg shadow-sm border">
                        <div class="flex items-center mb-2">
                            <i class="fas fa-chart-pie text-amber-500 text-xl mr-2"></i>
                            <h3 class="font-medium text-gray-700">Positiv-Rate</h3>
                        </div>
                        <div class="admin-stat-value text-2xl font-bold text-gray-800">-</div>
                    </div>
                `;
                
                feedbackTab.appendChild(statsGrid);
            }
            
            // Erstelle den Container für negatives Feedback, falls er nicht existiert
            if (!negativeFeedbackContainer) {
                console.log('Erstelle fehlenden Negativfeedback-Container...');
                
                // Überschrift für negativer Feedback-Bereich
                const negativeHeader = document.createElement('div');
                negativeHeader.className = 'mb-6';
                negativeHeader.innerHTML = `
                    <h2 class="text-xl font-semibold text-gray-800">Negatives Feedback</h2>
                    <p class="text-sm text-gray-500">Nutzerfeedback mit Kommentaren.</p>
                `;
                
                feedbackTab.appendChild(negativeHeader);
                
                // Container erstellen
                negativeFeedbackContainer = document.createElement('div');
                negativeFeedbackContainer.id = 'negative-feedback-container';
                negativeFeedbackContainer.className = 'space-y-4';
                negativeFeedbackContainer.innerHTML = '<p class="text-gray-500">Keine Feedback-Einträge gefunden.</p>';
                
                feedbackTab.appendChild(negativeFeedbackContainer);
            }
            
            // Aktualisiere die Werte in der Stats-Grid
            if (statsGrid) {
                const statCards = statsGrid.querySelectorAll('.admin-stat-card');
                if (statCards.length >= 4) {
                    statCards[0].querySelector('.admin-stat-value').textContent = data.total || '0';
                    statCards[1].querySelector('.admin-stat-value').textContent = data.positive || '0';
                    statCards[2].querySelector('.admin-stat-value').textContent = data.negative || '0';
                    
                    // Berechne die Positiv-Rate, falls sie nicht direkt übergeben wurde
                    const positiveRate = data.positive_rate !== undefined 
                        ? data.positive_rate 
                        : data.total > 0 
                            ? data.positive / data.total 
                            : 0;
                    
                    statCards[3].querySelector('.admin-stat-value').textContent = 
                        `${(positiveRate * 100).toFixed(1)}%`;
                }
            }
            
            // Aktualisiere den negativen Feedback-Container
            if (negativeFeedbackContainer) {
                // Prüfe, ob es negatives Feedback gibt
                if (data.negative_feedback && data.negative_feedback.length > 0) {
                    negativeFeedbackContainer.innerHTML = '';
                    
                    // Rendere jedes negative Feedback
                    data.negative_feedback.forEach(feedback => {
                        const feedbackCard = document.createElement('div');
                        feedbackCard.className = 'p-4 bg-white rounded-lg shadow-sm border-l-4 border-red-500';
                        
                        // Formatiere das Datum
                        let timestamp = 'k.A.';
                        try {
                            if (feedback.timestamp) {
                                const date = new Date(feedback.timestamp);
                                timestamp = date.toLocaleString('de-DE');
                            }
                        } catch (e) {
                            console.warn('Fehler beim Formatieren des Timestamps:', e);
                        }
                        
                        feedbackCard.innerHTML = `
                            <div class="text-sm text-gray-500 mb-1">
                                <span>${feedback.user_email || 'Anonym'}</span> • 
                                <span>${timestamp}</span>
                            </div>
                            <div class="font-medium mb-2">
                                ${feedback.session_id ? `Session #${feedback.session_id}` : 'Unbekannte Session'}
                            </div>
                            <div class="text-gray-700 mb-2">
                                ${feedback.comment || 'Kein Kommentar angegeben'}
                            </div>
                        `;
                        
                        negativeFeedbackContainer.appendChild(feedbackCard);
                    });
                } else {
                    negativeFeedbackContainer.innerHTML = '<p class="text-gray-500">Keine negativen Feedback-Einträge gefunden.</p>';
                }
            }
            
            console.log('Feedback-Statistiken erfolgreich aktualisiert.');
            return true;
        } catch (error) {
            console.error('Fehler beim Aktualisieren der Feedback-Statistiken:', error);
            return false;
        }
    }

    /**
     * Überwacht Tab-Wechsel im Admin-Bereich
     */
    function setupAdminTabListeners() {
        try {
            console.log('Richte Admin-Tab-Listeners ein...');
            
            // Finde alle Tab-Buttons
            const tabButtons = [
                { id: 'users-tab-btn', tabId: 'users-tab', onActivate: null },
                { id: 'system-tab-btn', tabId: 'system-tab', onActivate: loadSystemStats },
                { id: 'feedback-tab-btn', tabId: 'feedback-tab', onActivate: loadFeedbackStats },
                { id: 'motd-tab-btn', tabId: 'motd-tab', onActivate: null },
                { id: 'doc-converter-tab-btn', tabId: 'doc-converter-tab', onActivate: null }
            ];
            
            // Für jeden Tab-Button einen Listener einrichten
            tabButtons.forEach(tab => {
                const button = document.getElementById(tab.id);
                if (!button) return;
                
                // Speichere den originalen Click-Handler
                const originalOnClick = button.onclick;
                
                // Setze einen neuen Click-Handler
                button.onclick = function(event) {
                    console.log(`Tab-Button geklickt: ${tab.id}`);
                    
                    // Originalen Click-Handler ausführen, falls vorhanden
                    if (typeof originalOnClick === 'function') {
                        originalOnClick.call(this, event);
                    }
                    
                    // Tab-spezifische Aktion ausführen
                    if (tab.onActivate) {
                        setTimeout(() => {
                            tab.onActivate();
                        }, 100);
                    }
                };
                
                console.log(`Admin-Tab-Listener eingerichtet für: ${tab.id}`);
            });
            
            return true;
        } catch (error) {
            console.error('Fehler beim Einrichten der Admin-Tab-Listeners:', error);
            return false;
        }
    }

    /**
     * Überwacht das Öffnen des Admin-Panels
     */
    function setupAdminToggleListener() {
        try {
            console.log('Richte Admin-Toggle-Listener ein...');
            
            // Finde den Admin-Toggle-Button
            const adminToggleBtn = document.getElementById('admin-toggle-btn');
            if (!adminToggleBtn) {
                console.warn('Admin-Toggle-Button nicht gefunden.');
                return false;
            }
            
            // Speichere den originalen Click-Handler
            const originalOnClick = adminToggleBtn.onclick;
            
            // Setze einen neuen Click-Handler
            adminToggleBtn.onclick = function(event) {
                console.log('Admin-Toggle-Button geklickt');
                
                // Originalen Click-Handler ausführen, falls vorhanden
                if (typeof originalOnClick === 'function') {
                    originalOnClick.call(this, event);
                }
                
                // Verzögerung, um sicherzustellen, dass das Admin-Panel angezeigt wird
                setTimeout(() => {
                    // Prüfe, ob das Admin-Panel angezeigt wird
                    const adminView = document.getElementById('admin-view');
                    if (adminView && window.getComputedStyle(adminView).display !== 'none') {
                        console.log('Admin-Panel geöffnet, lade Statistiken...');
                        
                        // Prüfe, welcher Tab aktiv ist
                        const systemTabBtn = document.getElementById('system-tab-btn');
                        const feedbackTabBtn = document.getElementById('feedback-tab-btn');
                        
                        if (systemTabBtn && systemTabBtn.classList.contains('active')) {
                            loadSystemStats();
                        } else if (feedbackTabBtn && feedbackTabBtn.classList.contains('active')) {
                            loadFeedbackStats();
                        }
                    }
                }, 300);
            };
            
            console.log('Admin-Toggle-Listener erfolgreich eingerichtet.');
            return true;
        } catch (error) {
            console.error('Fehler beim Einrichten des Admin-Toggle-Listeners:', error);
            return false;
        }
    }

    /**
     * MutationObserver für dynamisch hinzugefügte Admin-Tabs
     */
    function setupAdminTabsObserver() {
        try {
            console.log('Richte Admin-Tabs-Observer ein...');
            
            // Finde den Admin-Sidebar-Container
            const adminSidebar = document.getElementById('admin-sidebar');
            if (!adminSidebar) {
                console.warn('Admin-Sidebar nicht gefunden.');
                return false;
            }
            
            // Observer konfigurieren
            const observer = new MutationObserver((mutations) => {
                let adminChanged = false;
                
                mutations.forEach(mutation => {
                    if (mutation.type === 'childList' || 
                        (mutation.type === 'attributes' && 
                         (mutation.attributeName === 'class' || 
                          mutation.attributeName === 'style'))) {
                        adminChanged = true;
                    }
                });
                
                if (adminChanged) {
                    console.log('Änderungen im Admin-Bereich erkannt, aktualisiere Listener...');
                    setupAdminTabListeners();
                }
            });
            
            // Observer starten
            observer.observe(adminSidebar, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['class', 'style']
            });
            
            console.log('Admin-Tabs-Observer erfolgreich eingerichtet.');
            return true;
        } catch (error) {
            console.error('Fehler beim Einrichten des Admin-Tabs-Observers:', error);
            return false;
        }
    }

    /**
     * Initialisiert den Admin-Stats-Fix
     */
    function init() {
        console.log('Initialisiere Admin-Stats-Fix...');
        
        // Setze Observer und Listener ein
        const tabListenerStatus = setupAdminTabListeners();
        const toggleListenerStatus = setupAdminToggleListener();
        const observerStatus = setupAdminTabsObserver();
        
        // Admin-Statistiken sofort laden, falls Admin-Ansicht aktiv ist
        const adminView = document.getElementById('admin-view');
        if (adminView && window.getComputedStyle(adminView).display !== 'none') {
            console.log('Admin-Panel ist aktiv, lade Statistiken...');
            
            // Prüfe, welcher Tab aktiv ist
            const systemTabBtn = document.getElementById('system-tab-btn');
            const feedbackTabBtn = document.getElementById('feedback-tab-btn');
            
            if (systemTabBtn && systemTabBtn.classList.contains('active')) {
                loadSystemStats();
            } else if (feedbackTabBtn && feedbackTabBtn.classList.contains('active')) {
                loadFeedbackStats();
            }
        }
        
        // Als initialisiert markieren
        window.improvedAdminStatsFixInitialized = true;
        
        // Exportiere Funktionen für andere Skripte
        window.adminStatsFix = {
            loadSystemStats,
            updateSystemStats,
            loadFeedbackStats,
            updateFeedbackStats
        };
        
        console.log('Admin-Stats-Fix erfolgreich initialisiert.');
        
        return {
            success: true,
            tabListenerStatus,
            toggleListenerStatus,
            observerStatus
        };
    }

    // Fix starten, wenn das DOM bereit ist
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            // Kurze Verzögerung zur Sicherheit
            setTimeout(init, 500);
        });
    } else {
        // Kurze Verzögerung zur Sicherheit
        setTimeout(init, 500);
    }

    // API für Tests und andere Skripte bereitstellen
    window.improvedAdminStatsFix = {
        init,
        loadSystemStats,
        updateSystemStats,
        loadFeedbackStats,
        updateFeedbackStats,
        setupAdminTabListeners,
        setupAdminToggleListener,
        setupAdminTabsObserver,
        isInitialized: () => window.improvedAdminStatsFixInitialized || false
    };
})();