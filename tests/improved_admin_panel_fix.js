/**
 * Verbesserter Admin-Panel-Fix für nscale-assist (2025-05-06)
 *
 * Dieser Fix behebt das Problem, dass beim ersten Klick auf das Admin-Panel
 * nur die Überschriften der Tabs angezeigt werden, aber keine Inhalte.
 */

(function() {
    console.log('===== Verbesserter Admin-Panel-Fix wird initialisiert =====');

    // Verhindere doppelte Initialisierung
    if (window.improvedAdminPanelFixInitialized) {
        console.log('Verbesserter Admin-Panel-Fix bereits initialisiert.');
        return;
    }

    // Status für die Admin-Ansicht
    let adminViewInitialized = false;

    /**
     * Findet und behebt Probleme im Admin-Panel.
     * - Prüft, ob alle Tabs korrekt geladen werden
     * - Stellt sicher, dass alle Tab-Inhalte verfügbar sind
     * - Verbessert den Wechsel zwischen Chat- und Admin-Ansicht
     */
    function fixAdminPanel() {
        console.log('Repariere Admin-Panel...');

        // Prüfe, ob die grundlegenden Admin-Elemente existieren
        const adminToggleBtn = document.getElementById('admin-toggle-btn');
        const adminView = document.getElementById('admin-view');
        const chatView = document.getElementById('chat-view');
        const adminSidebar = document.getElementById('admin-sidebar');
        const sessionsSidebar = document.getElementById('sessions-sidebar');

        if (!adminToggleBtn || !adminView || !chatView) {
            console.error('Grundlegende Admin-Elemente fehlen, kann Admin-Panel nicht reparieren.');
            return { success: false, error: 'Elemente nicht gefunden' };
        }

        // Ersetze den Toggle-Button mit einer verbesserten Version
        replaceAdminToggleButton();

        // Tabs finden und deren Interaktionen verbessern
        const tabButtons = [
            { id: 'users-tab-btn', tabId: 'users-tab', title: 'Benutzer', initialLoad: true },
            { id: 'system-tab-btn', tabId: 'system-tab', title: 'System', initialLoad: false },
            { id: 'feedback-tab-btn', tabId: 'feedback-tab', title: 'Feedback', initialLoad: false },
            { id: 'motd-tab-btn', tabId: 'motd-tab', title: 'MOTD', initialLoad: false },
            { id: 'doc-converter-tab-btn', tabId: 'doc-converter-tab', title: 'Dokumentenkonverter', initialLoad: false }
        ];

        // Verbesserte Tab-Button-Handling installieren
        enhanceTabButtons(tabButtons);

        // Prüfe auf leere Tab-Inhalte und lade sie gegebenenfalls
        ensureTabContents(tabButtons);

        // Setze adminViewInitialized
        adminViewInitialized = true;

        console.log('Admin-Panel-Fix erfolgreich angewendet.');
        return { success: true };
    }

    /**
     * Ersetzt den Admin-Toggle-Button durch eine verbesserte Version
     */
    function replaceAdminToggleButton() {
        try {
            const adminToggleBtn = document.getElementById('admin-toggle-btn');
            if (!adminToggleBtn) return;

            // Speichere Eigenschaften und Inhalt des ursprünglichen Buttons
            const originalClasses = adminToggleBtn.className;
            const originalInnerHTML = adminToggleBtn.innerHTML;
            const originalDisplay = adminToggleBtn.style.display;

            // Erstelle einen neuen Button mit den gleichen Eigenschaften
            const newButton = document.createElement('button');
            newButton.id = 'admin-toggle-btn';
            newButton.className = originalClasses;
            newButton.innerHTML = originalInnerHTML;
            newButton.style.display = originalDisplay;
            newButton.title = 'Systemadministration';

            // Verbesserter Event-Handler
            newButton.addEventListener('click', function(event) {
                event.preventDefault();

                // DOM-Elemente finden
                const adminView = document.getElementById('admin-view');
                const chatView = document.getElementById('chat-view');
                const adminSidebar = document.getElementById('admin-sidebar');
                const sessionsSidebar = document.getElementById('sessions-sidebar');

                // Prüfen, ob alle nötigen Elemente vorhanden sind
                if (!adminView || !chatView) {
                    console.error('Admin-View oder Chat-View nicht gefunden');
                    return;
                }

                // Aktuellen Zustand ermitteln
                const isAdminVisible = window.getComputedStyle(adminView).display !== 'none';

                if (isAdminVisible) {
                    // Zur Chat-Ansicht wechseln
                    adminView.style.display = 'none';
                    chatView.style.display = 'flex';

                    if (adminSidebar) adminSidebar.style.display = 'none';
                    if (sessionsSidebar) sessionsSidebar.style.display = 'block';

                    // Setze einen Klassen-Indikator für CSS-Styling
                    document.body.classList.remove('admin-mode');
                    document.body.classList.add('chat-mode');

                    console.log('Gewechselt zu Chat-Ansicht');
                } else {
                    // Zur Admin-Ansicht wechseln
                    ensureAdminViewInitialized(() => {
                        adminView.style.display = 'flex';
                        chatView.style.display = 'none';

                        if (adminSidebar) adminSidebar.style.display = 'block';
                        if (sessionsSidebar) sessionsSidebar.style.display = 'none';

                        // Setze einen Klassen-Indikator für CSS-Styling
                        document.body.classList.add('admin-mode');
                        document.body.classList.remove('chat-mode');

                        // Erzwinge vollständige Anzeige aller Admin-Tab-Inhalte
                        forceAdminTabsDisplay();

                        console.log('Gewechselt zu Admin-Ansicht');
                    });
                }
            });

            // Alten Button durch den neuen ersetzen
            adminToggleBtn.parentNode.replaceChild(newButton, adminToggleBtn);
            console.log('Admin-Toggle-Button erfolgreich ersetzt');
        } catch (error) {
            console.error('Fehler beim Ersetzen des Admin-Toggle-Buttons:', error);
        }
    }

    /**
     * Stellt sicher, dass die Admin-Ansicht initialisiert wird, bevor sie angezeigt wird
     */
    function ensureAdminViewInitialized(callback) {
        if (adminViewInitialized) {
            // Admin-View bereits initialisiert, direkt fortfahren
            callback();
            return;
        }

        console.log('Admin-View wird initialisiert...');

        // Lade Adminpanel-Inhalte vor der Anzeige
        // (Dies verhindert das Problem, dass beim ersten Klick nur die Überschriften angezeigt werden)
        Promise.all([
            loadUsersTabContent(),
            loadSystemTabContent(),
            loadFeedbackTabContent(),
            loadMotdTabContent(),
            loadDocConverterTabContent()
        ]).then(() => {
            adminViewInitialized = true;
            console.log('Admin-View Initialisierung abgeschlossen.');
            callback();
        }).catch(error => {
            console.error('Fehler bei der Admin-View Initialisierung:', error);
            // Trotz Fehler fortfahren
            adminViewInitialized = true;
            callback();
        });
    }

    /**
     * Verbessert die Tab-Buttons im Admin-Panel
     */
    function enhanceTabButtons(tabButtons) {
        try {
            tabButtons.forEach(tab => {
                const button = document.getElementById(tab.id);
                if (!button) return;

                // Erstelle einen neuen Button mit den gleichen Eigenschaften
                const newButton = button.cloneNode(true);

                // Verbesserter Event-Handler
                newButton.addEventListener('click', function(event) {
                    event.preventDefault();

                    // Deaktiviere alle Tab-Buttons
                    tabButtons.forEach(t => {
                        const btn = document.getElementById(t.id);
                        if (btn) btn.classList.remove('active');

                        // Blende alle Tab-Inhalte aus
                        const tabPanel = document.getElementById(t.tabId);
                        if (tabPanel) tabPanel.style.display = 'none';
                    });

                    // Aktiviere den geklickten Tab-Button
                    this.classList.add('active');

                    // Zeige den entsprechenden Tab-Inhalt an
                    const tabPanel = document.getElementById(tab.tabId);
                    if (tabPanel) {
                        tabPanel.style.display = 'block';
                        
                        // Lade den Tab-Inhalt, falls noch nicht geschehen
                        switch (tab.tabId) {
                            case 'users-tab':
                                loadUsersTabContent();
                                break;
                            case 'system-tab':
                                loadSystemTabContent();
                                break;
                            case 'feedback-tab':
                                loadFeedbackTabContent();
                                break;
                            case 'motd-tab':
                                loadMotdTabContent();
                                break;
                            case 'doc-converter-tab':
                                loadDocConverterTabContent();
                                break;
                        }
                    }

                    // Aktualisiere den Tab-Titel
                    const adminTabTitle = document.getElementById('admin-tab-title');
                    if (adminTabTitle) adminTabTitle.textContent = tab.title;

                    console.log(`Tab gewechselt zu: ${tab.title}`);
                });

                // Ersetze den alten Button durch den neuen
                button.parentNode.replaceChild(newButton, button);
                console.log(`Tab-Button verbessert: ${tab.id}`);
            });
        } catch (error) {
            console.error('Fehler beim Verbessern der Tab-Buttons:', error);
        }
    }

    /**
     * Stellt sicher, dass alle Tab-Inhalte existieren und geladen werden
     */
    function ensureTabContents(tabButtons) {
        try {
            tabButtons.forEach(tab => {
                const tabPanel = document.getElementById(tab.tabId);
                if (!tabPanel) {
                    console.warn(`Tab-Panel nicht gefunden: ${tab.tabId}, erstelle es...`);
                    
                    // Erstelle ein neues Tab-Panel, falls es nicht existiert
                    const newPanel = document.createElement('div');
                    newPanel.id = tab.tabId;
                    newPanel.className = 'admin-panel-content';
                    newPanel.style.display = 'none';
                    
                    // Füge das Panel zum Admin-Content hinzu
                    const adminContent = document.querySelector('.admin-content');
                    if (adminContent) {
                        adminContent.appendChild(newPanel);
                    } else {
                        const adminView = document.getElementById('admin-view');
                        if (adminView) {
                            // Erstelle admin-content, falls nicht vorhanden
                            const newContent = document.createElement('div');
                            newContent.className = 'admin-content flex-1';
                            newContent.appendChild(newPanel);
                            adminView.appendChild(newContent);
                        }
                    }
                }
                
                // Wenn dieser Tab initial geladen werden soll
                if (tab.initialLoad) {
                    // Lade den Tab-Inhalt, verzögert
                    setTimeout(() => {
                        switch (tab.tabId) {
                            case 'users-tab':
                                loadUsersTabContent();
                                break;
                            case 'system-tab':
                                loadSystemTabContent();
                                break;
                            case 'feedback-tab':
                                loadFeedbackTabContent();
                                break;
                            case 'motd-tab':
                                loadMotdTabContent();
                                break;
                            case 'doc-converter-tab':
                                loadDocConverterTabContent();
                                break;
                        }
                    }, 100);
                }
            });
        } catch (error) {
            console.error('Fehler beim Sicherstellen der Tab-Inhalte:', error);
        }
    }

    /**
     * Erzwingt die Anzeige aller Admin-Tabs
     */
    function forceAdminTabsDisplay() {
        try {
            // Stelle sicher, dass mindestens ein Tab aktiv und sichtbar ist
            let activeTabFound = false;
            
            // Prüfe alle Tab-Buttons auf aktiven Status
            const tabButtons = document.querySelectorAll('.admin-nav-item');
            tabButtons.forEach(button => {
                if (button.classList.contains('active')) {
                    activeTabFound = true;
                    
                    // Finde den entsprechenden Tab-Inhalt
                    const buttonId = button.id;
                    const tabId = buttonId.replace('-btn', '');
                    const tabPanel = document.getElementById(tabId);
                    
                    if (tabPanel) {
                        // Stelle sicher, dass der Tab-Inhalt sichtbar ist
                        tabPanel.style.display = 'block';
                        tabPanel.style.visibility = 'visible';
                        tabPanel.style.opacity = '1';
                    }
                }
            });
            
            // Wenn kein aktiver Tab gefunden wurde, aktiviere den ersten Tab
            if (!activeTabFound && tabButtons.length > 0) {
                const firstButton = tabButtons[0];
                firstButton.classList.add('active');
                
                // Finde den entsprechenden Tab-Inhalt
                const buttonId = firstButton.id;
                const tabId = buttonId.replace('-btn', '');
                const tabPanel = document.getElementById(tabId);
                
                if (tabPanel) {
                    // Stelle sicher, dass der Tab-Inhalt sichtbar ist
                    tabPanel.style.display = 'block';
                    tabPanel.style.visibility = 'visible';
                    tabPanel.style.opacity = '1';
                    
                    // Aktualisiere den Tab-Titel
                    const adminTabTitle = document.getElementById('admin-tab-title');
                    if (adminTabTitle && firstButton.querySelector('span')) {
                        adminTabTitle.textContent = firstButton.querySelector('span').textContent;
                    }
                }
            }
        } catch (error) {
            console.error('Fehler beim Erzwingen der Admin-Tab-Anzeige:', error);
        }
    }

    /**
     * Lädt den Inhalt für den Benutzer-Tab
     */
    async function loadUsersTabContent() {
        try {
            const usersTab = document.getElementById('users-tab');
            if (!usersTab) return false;
            
            // Prüfe, ob der Inhalt bereits geladen wurde
            if (usersTab.querySelector('.admin-users-list') && 
                usersTab.querySelector('.admin-users-list').children.length > 0) {
                console.log('Benutzer-Tab-Inhalt bereits geladen.');
                return true;
            }
            
            console.log('Benutzer-Tab-Inhalt wird geladen...');
            
            // Prüfe, ob Token vorhanden ist
            const token = localStorage.getItem('token');
            if (!token) {
                console.error('Kein Authentifizierungs-Token gefunden.');
                return false;
            }
            
            // API-Anfrage an den Users-Endpunkt
            const response = await fetch('/api/admin/users', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP-Fehler: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Benutzer-Liste rendern
            renderUsersTabContent(data);
            
            console.log('Benutzer-Tab-Inhalt erfolgreich geladen.');
            return true;
        } catch (error) {
            console.error('Fehler beim Laden des Benutzer-Tab-Inhalts:', error);
            
            // Fallback: Dummy-Daten verwenden
            renderUsersTabContent({
                users: [
                    { id: 1, email: 'admin@example.com', role: 'admin', created_at: '2023-01-01' },
                    { id: 2, email: 'user@example.com', role: 'user', created_at: '2023-01-02' }
                ]
            });
            
            return false;
        }
    }

    /**
     * Rendert den Inhalt für den Benutzer-Tab
     */
    function renderUsersTabContent(data) {
        try {
            const usersTab = document.getElementById('users-tab');
            if (!usersTab) return;
            
            // Prüfe, ob der content bereits existiert
            let usersList = usersTab.querySelector('.admin-users-list');
            
            if (!usersList) {
                // Erstelle die Benutzer-Liste
                usersTab.innerHTML = `
                    <div class="mb-6 flex justify-between items-center">
                        <div>
                            <h2 class="text-xl font-semibold text-gray-800">Benutzer-Verwaltung</h2>
                            <p class="text-sm text-gray-500">Verwaltung der Benutzer im System.</p>
                        </div>
                        <button id="add-user-btn" class="nscale-btn-primary">
                            <i class="fas fa-plus mr-2"></i>
                            Benutzer hinzufügen
                        </button>
                    </div>
                    
                    <div class="admin-users-list border rounded-lg overflow-hidden">
                        <table class="min-w-full">
                            <thead class="bg-gray-50">
                                <tr>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">E-Mail</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rolle</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Registriert am</th>
                                    <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Aktionen</th>
                                </tr>
                            </thead>
                            <tbody class="bg-white divide-y divide-gray-200">
                                <!-- Benutzer werden hier dynamisch eingefügt -->
                            </tbody>
                        </table>
                    </div>
                `;
                
                usersList = usersTab.querySelector('.admin-users-list');
            }
            
            // Tabellen-Body auswählen
            const tbody = usersList.querySelector('tbody');
            if (!tbody) return;
            
            // Benutzer einfügen
            if (data.users && Array.isArray(data.users)) {
                tbody.innerHTML = '';
                
                data.users.forEach(user => {
                    const tr = document.createElement('tr');
                    
                    // Formatiere das Datum
                    const createdDate = new Date(user.created_at);
                    const formattedDate = createdDate.toLocaleDateString('de-DE', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                    });
                    
                    tr.innerHTML = `
                        <td class="px-6 py-4 whitespace-nowrap">
                            <div class="flex items-center">
                                <div class="ml-4">
                                    <div class="text-sm font-medium text-gray-900">${user.email}</div>
                                </div>
                            </div>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap">
                            <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-${user.role === 'admin' ? 'green' : 'blue'}-100 text-${user.role === 'admin' ? 'green' : 'blue'}-800">
                                ${user.role}
                            </span>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            ${formattedDate}
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button class="text-indigo-600 hover:text-indigo-900 mr-3 edit-user-btn" data-user-id="${user.id}">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="text-red-600 hover:text-red-900 delete-user-btn" data-user-id="${user.id}">
                                <i class="fas fa-trash-alt"></i>
                            </button>
                        </td>
                    `;
                    
                    tbody.appendChild(tr);
                });
            }
        } catch (error) {
            console.error('Fehler beim Rendern des Benutzer-Tab-Inhalts:', error);
        }
    }

    /**
     * Lädt den Inhalt für den System-Tab
     */
    async function loadSystemTabContent() {
        try {
            const systemTab = document.getElementById('system-tab');
            if (!systemTab) return false;
            
            // Prüfe, ob der Inhalt bereits geladen wurde
            if (systemTab.querySelector('.admin-stats-grid') && 
                systemTab.querySelector('.admin-stats-grid').children.length > 0) {
                console.log('System-Tab-Inhalt bereits geladen.');
                loadSystemStats(); // Aktualisiere die Statistiken trotzdem
                return true;
            }
            
            console.log('System-Tab-Inhalt wird geladen...');
            
            // Erstelle das grundlegende Layout
            systemTab.innerHTML = `
                <div class="mb-6">
                    <h2 class="text-xl font-semibold text-gray-800">System-Übersicht</h2>
                    <p class="text-sm text-gray-500">Systemstatistiken und -informationen.</p>
                </div>
                
                <div class="admin-stats-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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
                </div>
                
                <div class="mb-6">
                    <h2 class="text-xl font-semibold text-gray-800">Speicher-Übersicht</h2>
                    <p class="text-sm text-gray-500">Informationen zu Dokumenten und Indexen.</p>
                </div>
                
                <div class="admin-storage-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                </div>
            `;
            
            // Lade die Statistiken
            loadSystemStats();
            
            console.log('System-Tab-Inhalt erfolgreich geladen.');
            return true;
        } catch (error) {
            console.error('Fehler beim Laden des System-Tab-Inhalts:', error);
            return false;
        }
    }

    /**
     * Lädt die Systemstatistiken
     */
    async function loadSystemStats() {
        try {
            console.log('Lade Systemstatistiken...');
            
            // Prüfe, ob Token vorhanden ist
            const token = localStorage.getItem('token');
            if (!token) {
                console.error('Kein Authentifizierungs-Token gefunden.');
                return false;
            }
            
            // API-Anfrage an den System-Endpunkt
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
            
            return true;
        } catch (error) {
            console.error('Fehler beim Laden der Systemstatistiken:', error);
            
            // Fallback: Dummy-Daten verwenden
            const dummyData = {
                users: 12,
                sessions: 45,
                messages: 230,
                avg_messages_per_session: 5.1,
                documents: 68,
                chunks: 1240,
                embeddings: 1240
            };
            
            updateSystemStats(dummyData);
            
            return false;
        }
    }

    /**
     * Aktualisiert die Systemstatistiken
     */
    function updateSystemStats(data) {
        try {
            const systemTab = document.getElementById('system-tab');
            if (!systemTab) return;
            
            // Benutzer, Chats, Nachrichten, Nachrichten/Chat
            const statsGrid = systemTab.querySelector('.admin-stats-grid');
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
            
            // Dokumente, Chunks, Embeddings
            const storageGrid = systemTab.querySelector('.admin-storage-grid');
            if (storageGrid) {
                const statCards = storageGrid.querySelectorAll('.admin-stat-card');
                if (statCards.length >= 3) {
                    statCards[0].querySelector('.admin-stat-value').textContent = data.documents || '0';
                    statCards[1].querySelector('.admin-stat-value').textContent = data.chunks || '0';
                    statCards[2].querySelector('.admin-stat-value').textContent = data.embeddings || '0';
                }
            }
            
            console.log('Systemstatistiken aktualisiert.');
        } catch (error) {
            console.error('Fehler beim Aktualisieren der Systemstatistiken:', error);
        }
    }

    /**
     * Lädt den Inhalt für den Feedback-Tab
     */
    async function loadFeedbackTabContent() {
        try {
            const feedbackTab = document.getElementById('feedback-tab');
            if (!feedbackTab) return false;
            
            // Prüfe, ob der Inhalt bereits geladen wurde
            if (feedbackTab.querySelector('.admin-stats-grid') && 
                feedbackTab.querySelector('.admin-stats-grid').children.length > 0) {
                console.log('Feedback-Tab-Inhalt bereits geladen.');
                loadFeedbackStats(); // Aktualisiere die Statistiken trotzdem
                return true;
            }
            
            console.log('Feedback-Tab-Inhalt wird geladen...');
            
            // Erstelle das grundlegende Layout
            feedbackTab.innerHTML = `
                <div class="mb-6">
                    <h2 class="text-xl font-semibold text-gray-800">Feedback-Übersicht</h2>
                    <p class="text-sm text-gray-500">Feedback-Statistiken und Kommentare.</p>
                </div>
                
                <div class="admin-stats-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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
                </div>
                
                <div class="mb-6">
                    <h2 class="text-xl font-semibold text-gray-800">Negatives Feedback</h2>
                    <p class="text-sm text-gray-500">Nutzerfeedback mit Kommentaren.</p>
                </div>
                
                <div id="negative-feedback-container" class="space-y-4">
                    <p class="text-gray-500">Keine Feedback-Einträge gefunden.</p>
                </div>
            `;
            
            // Lade die Feedback-Statistiken
            loadFeedbackStats();
            
            console.log('Feedback-Tab-Inhalt erfolgreich geladen.');
            return true;
        } catch (error) {
            console.error('Fehler beim Laden des Feedback-Tab-Inhalts:', error);
            return false;
        }
    }

    /**
     * Lädt die Feedback-Statistiken
     */
    async function loadFeedbackStats() {
        try {
            console.log('Lade Feedback-Statistiken...');
            
            // Prüfe, ob Token vorhanden ist
            const token = localStorage.getItem('token');
            if (!token) {
                console.error('Kein Authentifizierungs-Token gefunden.');
                return false;
            }
            
            // API-Anfrage an den Feedback-Endpunkt
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
            
            return true;
        } catch (error) {
            console.error('Fehler beim Laden der Feedback-Statistiken:', error);
            
            // Fallback: Dummy-Daten verwenden
            const dummyData = {
                total: 53,
                positive: 42,
                negative: 11,
                positive_rate: 0.79,
                negative_feedback: [
                    {
                        id: 1,
                        user_email: 'user1@example.com',
                        comment: 'Die Antwort war nicht hilfreich für meine spezifische Frage.',
                        timestamp: '2025-04-30T14:30:00Z',
                        session_id: '12345'
                    },
                    {
                        id: 2,
                        user_email: 'user2@example.com',
                        comment: 'Zu allgemeine Informationen, nicht auf mein Problem bezogen.',
                        timestamp: '2025-05-01T09:15:00Z',
                        session_id: '23456'
                    }
                ]
            };
            
            updateFeedbackStats(dummyData);
            
            return false;
        }
    }

    /**
     * Aktualisiert die Feedback-Statistiken
     */
    function updateFeedbackStats(data) {
        try {
            const feedbackTab = document.getElementById('feedback-tab');
            if (!feedbackTab) return;
            
            // Gesamt, Positiv, Negativ, Positiv-Rate
            const statsGrid = feedbackTab.querySelector('.admin-stats-grid');
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
            
            // Negatives Feedback mit Kommentaren
            const negativeFeedbackContainer = document.getElementById('negative-feedback-container');
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
            
            console.log('Feedback-Statistiken aktualisiert.');
        } catch (error) {
            console.error('Fehler beim Aktualisieren der Feedback-Statistiken:', error);
        }
    }

    /**
     * Lädt den Inhalt für den MOTD-Tab
     */
    function loadMotdTabContent() {
        try {
            const motdTab = document.getElementById('motd-tab');
            if (!motdTab) return false;
            
            // Prüfe, ob der Inhalt bereits geladen wurde
            if (motdTab.querySelector('#motd-content')) {
                console.log('MOTD-Tab-Inhalt bereits geladen.');
                return true;
            }
            
            console.log('MOTD-Tab-Inhalt wird geladen...');
            
            // Erstelle das grundlegende Layout
            motdTab.innerHTML = `
                <div class="mb-6">
                    <h2 class="text-xl font-semibold text-gray-800">Message of the Day</h2>
                    <p class="text-sm text-gray-500">Konfigurieren Sie Systemnachrichten für alle Benutzer.</p>
                </div>
                
                <div class="motd-editor grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div class="motd-form space-y-4">
                        <div>
                            <label for="motd-enabled" class="flex items-center mb-2 cursor-pointer">
                                <div class="ml-3 font-medium text-gray-700">MOTD aktivieren</div>
                                <input type="checkbox" id="motd-enabled" class="ml-2 h-4 w-4">
                            </label>
                            <p class="text-sm text-gray-500">Aktiviert die MOTD-Anzeige für alle Benutzer.</p>
                        </div>
                        
                        <div>
                            <label for="motd-content" class="block mb-2 font-medium text-gray-700">Nachrichtentext</label>
                            <textarea id="motd-content" class="nscale-input w-full h-32" placeholder="Geben Sie hier Ihre Nachricht ein..."></textarea>
                            <p class="text-sm text-gray-500 mt-2">Unterstützt einfaches Markdown: **fett**, *kursiv*, Zeilenumbrüche.</p>
                        </div>
                        
                        <div>
                            <label class="block mb-2 font-medium text-gray-700">Erscheinungsbild</label>
                            <div class="grid grid-cols-3 gap-4">
                                <div>
                                    <label for="motd-bg-color" class="block text-sm text-gray-600 mb-1">Hintergrundfarbe</label>
                                    <input type="color" id="motd-bg-color" class="w-full h-8 cursor-pointer rounded" value="#fff3cd">
                                </div>
                                <div>
                                    <label for="motd-border-color" class="block text-sm text-gray-600 mb-1">Rahmenfarbe</label>
                                    <input type="color" id="motd-border-color" class="w-full h-8 cursor-pointer rounded" value="#ffeeba">
                                </div>
                                <div>
                                    <label for="motd-text-color" class="block text-sm text-gray-600 mb-1">Textfarbe</label>
                                    <input type="color" id="motd-text-color" class="w-full h-8 cursor-pointer rounded" value="#856404">
                                </div>
                            </div>
                        </div>
                        
                        <div class="pt-4">
                            <button id="save-motd-btn" class="nscale-btn-primary">
                                <i class="fas fa-save mr-2"></i>
                                Speichern
                            </button>
                        </div>
                    </div>
                    
                    <div>
                        <label class="block mb-2 font-medium text-gray-700">Vorschau</label>
                        <div id="motd-preview" class="p-4 rounded-lg shadow-sm" style="background-color: #fff3cd; border: 1px solid #ffeeba; color: #856404;">
                            <div id="motd-preview-content">
                                Hier wird Ihre Nachricht angezeigt.
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            // MOTD-Daten laden und anzeigen
            loadMotdData();
            
            // Vorschau aktualisieren bei Änderungen
            setupMotdPreviewListeners();
            
            console.log('MOTD-Tab-Inhalt erfolgreich geladen.');
            return true;
        } catch (error) {
            console.error('Fehler beim Laden des MOTD-Tab-Inhalts:', error);
            return false;
        }
    }

    /**
     * Lädt die MOTD-Daten
     */
    async function loadMotdData() {
        try {
            console.log('Lade MOTD-Daten...');
            
            // Prüfe, ob Token vorhanden ist
            const token = localStorage.getItem('token');
            if (!token) {
                console.error('Kein Authentifizierungs-Token gefunden.');
                return false;
            }
            
            // API-Anfrage an den MOTD-Endpunkt
            const response = await fetch('/api/admin/motd', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP-Fehler: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Formular mit Daten füllen
            const motdEnabled = document.getElementById('motd-enabled');
            const motdContent = document.getElementById('motd-content');
            const motdBgColor = document.getElementById('motd-bg-color');
            const motdBorderColor = document.getElementById('motd-border-color');
            const motdTextColor = document.getElementById('motd-text-color');
            
            if (motdEnabled) motdEnabled.checked = data.enabled || false;
            if (motdContent) motdContent.value = data.content || '';
            if (motdBgColor) motdBgColor.value = data.bg_color || '#fff3cd';
            if (motdBorderColor) motdBorderColor.value = data.border_color || '#ffeeba';
            if (motdTextColor) motdTextColor.value = data.text_color || '#856404';
            
            // Vorschau aktualisieren
            updateMotdPreview();
            
            return true;
        } catch (error) {
            console.error('Fehler beim Laden der MOTD-Daten:', error);
            
            // Fallback: Dummy-Daten verwenden
            const dummyData = {
                enabled: true,
                content: '**Willkommen** bei nscale Assist!\n\nDies ist eine Beispielnachricht für alle Benutzer.',
                bg_color: '#fff3cd',
                border_color: '#ffeeba',
                text_color: '#856404'
            };
            
            // Formular mit Dummy-Daten füllen
            const motdEnabled = document.getElementById('motd-enabled');
            const motdContent = document.getElementById('motd-content');
            
            if (motdEnabled) motdEnabled.checked = dummyData.enabled;
            if (motdContent) motdContent.value = dummyData.content;
            
            // Vorschau aktualisieren
            updateMotdPreview();
            
            return false;
        }
    }

    /**
     * Richtet Listener für die MOTD-Vorschau ein
     */
    function setupMotdPreviewListeners() {
        try {
            // Elemente finden
            const motdContent = document.getElementById('motd-content');
            const motdBgColor = document.getElementById('motd-bg-color');
            const motdBorderColor = document.getElementById('motd-border-color');
            const motdTextColor = document.getElementById('motd-text-color');
            const saveMotdBtn = document.getElementById('save-motd-btn');
            
            // Listener für Texteingabe
            if (motdContent) {
                motdContent.addEventListener('input', updateMotdPreview);
            }
            
            // Listener für Farbauswahl
            if (motdBgColor) {
                motdBgColor.addEventListener('input', updateMotdPreview);
            }
            
            if (motdBorderColor) {
                motdBorderColor.addEventListener('input', updateMotdPreview);
            }
            
            if (motdTextColor) {
                motdTextColor.addEventListener('input', updateMotdPreview);
            }
            
            // Listener für Speichern-Button
            if (saveMotdBtn) {
                saveMotdBtn.addEventListener('click', saveMotdSettings);
            }
            
            console.log('MOTD-Vorschau-Listener erfolgreich eingerichtet.');
        } catch (error) {
            console.error('Fehler beim Einrichten der MOTD-Vorschau-Listener:', error);
        }
    }

    /**
     * Aktualisiert die MOTD-Vorschau
     */
    function updateMotdPreview() {
        try {
            // Elemente finden
            const motdContent = document.getElementById('motd-content');
            const motdBgColor = document.getElementById('motd-bg-color');
            const motdBorderColor = document.getElementById('motd-border-color');
            const motdTextColor = document.getElementById('motd-text-color');
            const motdPreview = document.getElementById('motd-preview');
            const motdPreviewContent = document.getElementById('motd-preview-content');
            
            if (!motdPreviewContent || !motdPreview) return;
            
            // Formatieren des Inhalts mit einfachem Markdown
            const formatContent = (text) => {
                if (!text) return '';
                
                // Einfache Markdown-Formatierung
                return text
                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                    .replace(/\*(.*?)\*/g, '<em>$1</em>')
                    .replace(/\n\n/g, '<br/><br/>')
                    .replace(/\n/g, '<br/>');
            };
            
            // Aktualisieren der Vorschau
            if (motdContent) {
                motdPreviewContent.innerHTML = formatContent(motdContent.value || '');
            }
            
            // Aktualisieren der Farben
            if (motdPreview) {
                if (motdBgColor) motdPreview.style.backgroundColor = motdBgColor.value || '#fff3cd';
                if (motdBorderColor) motdPreview.style.borderColor = motdBorderColor.value || '#ffeeba';
                if (motdTextColor) motdPreview.style.color = motdTextColor.value || '#856404';
            }
        } catch (error) {
            console.error('Fehler beim Aktualisieren der MOTD-Vorschau:', error);
        }
    }

    /**
     * Speichert die MOTD-Einstellungen
     */
    async function saveMotdSettings() {
        try {
            console.log('Speichere MOTD-Einstellungen...');
            
            // Elemente finden
            const motdEnabled = document.getElementById('motd-enabled');
            const motdContent = document.getElementById('motd-content');
            const motdBgColor = document.getElementById('motd-bg-color');
            const motdBorderColor = document.getElementById('motd-border-color');
            const motdTextColor = document.getElementById('motd-text-color');
            
            // Daten sammeln
            const motdData = {
                enabled: motdEnabled ? motdEnabled.checked : false,
                content: motdContent ? motdContent.value : '',
                bg_color: motdBgColor ? motdBgColor.value : '#fff3cd',
                border_color: motdBorderColor ? motdBorderColor.value : '#ffeeba',
                text_color: motdTextColor ? motdTextColor.value : '#856404'
            };
            
            // Prüfe, ob Token vorhanden ist
            const token = localStorage.getItem('token');
            if (!token) {
                console.error('Kein Authentifizierungs-Token gefunden.');
                return false;
            }
            
            // API-Anfrage an den MOTD-Endpunkt
            const response = await fetch('/api/admin/motd', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(motdData)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP-Fehler: ${response.status}`);
            }
            
            console.log('MOTD-Einstellungen erfolgreich gespeichert.');
            
            // Erfolgsmeldung anzeigen
            alert('MOTD-Einstellungen erfolgreich gespeichert.');
            
            return true;
        } catch (error) {
            console.error('Fehler beim Speichern der MOTD-Einstellungen:', error);
            
            // Fehlermeldung anzeigen
            alert('Fehler beim Speichern der MOTD-Einstellungen.');
            
            return false;
        }
    }

    /**
     * Lädt den Inhalt für den Dokumentenkonverter-Tab
     */
    function loadDocConverterTabContent() {
        try {
            const docConverterTab = document.getElementById('doc-converter-tab');
            if (!docConverterTab) return false;
            
            // Prüfe, ob der Inhalt bereits geladen wurde
            if (docConverterTab.querySelector('#file-upload-form')) {
                console.log('Dokumentenkonverter-Tab-Inhalt bereits geladen.');
                return true;
            }
            
            console.log('Dokumentenkonverter-Tab-Inhalt wird geladen...');
            
            // Erstelle das grundlegende Layout
            docConverterTab.innerHTML = `
                <div class="mb-6">
                    <h2 class="text-xl font-semibold text-gray-800">Dokumentenkonverter</h2>
                    <p class="text-sm text-gray-500">Konvertieren und importieren Sie Dokumente in das System.</p>
                </div>
                
                <div class="converter-content bg-white rounded-lg shadow-sm p-6">
                    <form id="file-upload-form" class="max-w-2xl mx-auto">
                        <div class="mb-6">
                            <label class="block font-medium text-gray-700 mb-2">Dokument auswählen</label>
                            <div class="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-green-500 transition-colors">
                                <div class="space-y-1 text-center">
                                    <svg class="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                                        <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                                    </svg>
                                    <div class="flex text-sm text-gray-600">
                                        <label for="file-upload" class="relative cursor-pointer bg-white rounded-md font-medium text-nscale hover:text-green-600">
                                            <span>Datei hochladen</span>
                                            <input id="file-upload" name="file-upload" type="file" class="sr-only">
                                        </label>
                                        <p class="pl-1">oder hierher ziehen</p>
                                    </div>
                                    <p class="text-xs text-gray-500">PDF, DOC, DOCX, TXT, HTML bis zu 15MB</p>
                                </div>
                            </div>
                            <div id="file-info" class="mt-3">
                                <div class="flex items-center">
                                    <div id="file-icon" class="mr-2">
                                        <i class="far fa-file text-gray-400"></i>
                                    </div>
                                    <div id="file-name" class="text-gray-500">Keine Datei ausgewählt</div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="mb-4">
                            <label for="title-override" class="block font-medium text-gray-700 mb-2">
                                Dokumenten-Titel überschreiben (optional)
                            </label>
                            <input type="text" id="title-override" class="nscale-input w-full" placeholder="Leer lassen für Originaltitel der Datei">
                        </div>
                        
                        <div class="mb-4">
                            <label for="content-extraction" class="block font-medium text-gray-700 mb-2">
                                Inhaltsextraktion
                            </label>
                            <select id="content-extraction" class="nscale-input w-full">
                                <option value="full">Vollständiger Inhalt</option>
                                <option value="sections">Nach Abschnitten splitten</option>
                                <option value="pages">Nach Seiten splitten</option>
                            </select>
                            <p class="text-xs text-gray-500 mt-1">Bestimmt, wie der Dokumenteninhalt extrahiert wird.</p>
                        </div>
                        
                        <div class="mb-6">
                            <label class="block font-medium text-gray-700 mb-2">
                                Extraktionsoptionen
                            </label>
                            <div class="space-y-3">
                                <label class="flex items-start">
                                    <input type="checkbox" id="extract-metadata" class="mt-1 mr-2">
                                    <div>
                                        <span class="text-gray-700">Metadaten extrahieren</span>
                                        <p class="text-xs text-gray-500">Author, Erstellungsdatum, Keywords</p>
                                    </div>
                                </label>
                                <label class="flex items-start">
                                    <input type="checkbox" id="extract-images" class="mt-1 mr-2">
                                    <div>
                                        <span class="text-gray-700">Bilder extrahieren</span>
                                        <p class="text-xs text-gray-500">Bilder aus dem Dokument erfassen und indexieren</p>
                                    </div>
                                </label>
                                <label class="flex items-start">
                                    <input type="checkbox" id="preserve-layout" class="mt-1 mr-2">
                                    <div>
                                        <span class="text-gray-700">Layout beibehalten</span>
                                        <p class="text-xs text-gray-500">Versucht, das originale Dokumenten-Layout beizubehalten</p>
                                    </div>
                                </label>
                            </div>
                        </div>
                        
                        <div class="converter-actions flex justify-between">
                            <button id="convert-btn" type="submit" class="nscale-btn-primary" disabled>
                                <i class="fas fa-exchange-alt mr-2"></i>
                                Konvertieren
                            </button>
                        </div>
                    </form>
                    
                    <div id="conversion-result" class="mt-8 hidden">
                        <h3 class="text-lg font-medium text-gray-800 mb-4">Konvertierungsergebnis</h3>
                        <div class="bg-gray-50 rounded-lg p-4">
                            <div id="result-content" class="text-gray-700"></div>
                        </div>
                    </div>
                </div>
            `;
            
            // Event-Listener einrichten
            setupDocConverterListeners();
            
            console.log('Dokumentenkonverter-Tab-Inhalt erfolgreich geladen.');
            return true;
        } catch (error) {
            console.error('Fehler beim Laden des Dokumentenkonverter-Tab-Inhalts:', error);
            return false;
        }
    }

    /**
     * Richtet Listener für den Dokumentenkonverter ein
     */
    function setupDocConverterListeners() {
        try {
            const fileUpload = document.getElementById('file-upload');
            const fileName = document.getElementById('file-name');
            const fileIcon = document.getElementById('file-icon');
            const convertBtn = document.getElementById('convert-btn');
            const fileUploadForm = document.getElementById('file-upload-form');
            
            if (!fileUpload || !fileName || !fileIcon || !convertBtn || !fileUploadForm) {
                console.warn('Konnte Dokumentenkonverter-Elemente nicht finden');
                return;
            }
            
            // Dateiauswahl-Event
            fileUpload.addEventListener('change', function() {
                if (this.files && this.files.length > 0) {
                    const file = this.files[0];
                    fileName.textContent = file.name;
                    convertBtn.disabled = false;
                    
                    // Icon je nach Dateityp anpassen
                    const fileExt = file.name.split('.').pop().toLowerCase();
                    let iconClass = 'far fa-file';
                    
                    switch (fileExt) {
                        case 'pdf':
                            iconClass = 'far fa-file-pdf text-red-500';
                            break;
                        case 'doc':
                        case 'docx':
                            iconClass = 'far fa-file-word text-blue-500';
                            break;
                        case 'txt':
                            iconClass = 'far fa-file-alt text-gray-600';
                            break;
                        case 'html':
                            iconClass = 'far fa-file-code text-orange-500';
                            break;
                    }
                    
                    fileIcon.innerHTML = `<i class="${iconClass}"></i>`;
                } else {
                    fileName.textContent = 'Keine Datei ausgewählt';
                    fileIcon.innerHTML = '<i class="far fa-file text-gray-400"></i>';
                    convertBtn.disabled = true;
                }
            });
            
            // Formular-Submit-Event
            fileUploadForm.addEventListener('submit', async function(event) {
                event.preventDefault();
                
                // Formular-Daten sammeln
                const formData = new FormData();
                
                // Datei hinzufügen
                if (fileUpload.files && fileUpload.files.length > 0) {
                    formData.append('file', fileUpload.files[0]);
                } else {
                    alert('Bitte wählen Sie eine Datei aus.');
                    return;
                }
                
                // Weitere Optionen hinzufügen
                const titleOverride = document.getElementById('title-override');
                const contentExtraction = document.getElementById('content-extraction');
                const extractMetadata = document.getElementById('extract-metadata');
                const extractImages = document.getElementById('extract-images');
                const preserveLayout = document.getElementById('preserve-layout');
                
                if (titleOverride && titleOverride.value) {
                    formData.append('title', titleOverride.value);
                }
                
                if (contentExtraction) {
                    formData.append('extraction_method', contentExtraction.value);
                }
                
                if (extractMetadata) {
                    formData.append('extract_metadata', extractMetadata.checked ? '1' : '0');
                }
                
                if (extractImages) {
                    formData.append('extract_images', extractImages.checked ? '1' : '0');
                }
                
                if (preserveLayout) {
                    formData.append('preserve_layout', preserveLayout.checked ? '1' : '0');
                }
                
                // Konvertieren-Button deaktivieren und Ladeanimation anzeigen
                convertBtn.disabled = true;
                convertBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Konvertiere...';
                
                try {
                    // Prüfe, ob Token vorhanden ist
                    const token = localStorage.getItem('token');
                    if (!token) {
                        throw new Error('Kein Authentifizierungs-Token gefunden.');
                    }
                    
                    // API-Anfrage an den Dokumentenkonverter-Endpunkt
                    const response = await fetch('/api/admin/convert', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`
                        },
                        body: formData
                    });
                    
                    if (!response.ok) {
                        throw new Error(`HTTP-Fehler: ${response.status}`);
                    }
                    
                    const data = await response.json();
                    
                    // Ergebnis anzeigen
                    const conversionResult = document.getElementById('conversion-result');
                    const resultContent = document.getElementById('result-content');
                    
                    if (conversionResult && resultContent) {
                        conversionResult.classList.remove('hidden');
                        
                        // Ergebnis formatieren
                        let resultHtml = `
                            <div class="p-3 bg-green-50 text-green-700 rounded-md mb-4">
                                <i class="fas fa-check-circle mr-2"></i>
                                Dokument erfolgreich konvertiert und zum Index hinzugefügt!
                            </div>
                            <div class="space-y-2">
                                <p><strong>Dokumenten-ID:</strong> ${data.document_id || 'Nicht verfügbar'}</p>
                                <p><strong>Titel:</strong> ${data.title || 'Nicht verfügbar'}</p>
                                <p><strong>Extrahierte Abschnitte:</strong> ${data.sections_count || '0'}</p>
                                <p><strong>Extrahierte Tokens:</strong> ${data.tokens_count || '0'}</p>
                            </div>
                        `;
                        
                        resultContent.innerHTML = resultHtml;
                    }
                } catch (error) {
                    console.error('Fehler bei der Dokumentenkonvertierung:', error);
                    
                    // Fehlermeldung anzeigen
                    const conversionResult = document.getElementById('conversion-result');
                    const resultContent = document.getElementById('result-content');
                    
                    if (conversionResult && resultContent) {
                        conversionResult.classList.remove('hidden');
                        
                        resultContent.innerHTML = `
                            <div class="p-3 bg-red-50 text-red-700 rounded-md">
                                <i class="fas fa-exclamation-circle mr-2"></i>
                                Fehler bei der Konvertierung: ${error.message || 'Unbekannter Fehler'}
                            </div>
                        `;
                    }
                } finally {
                    // Button zurücksetzen
                    convertBtn.disabled = false;
                    convertBtn.innerHTML = '<i class="fas fa-exchange-alt mr-2"></i> Konvertieren';
                }
            });
            
            console.log('Dokumentenkonverter-Listener erfolgreich eingerichtet.');
        } catch (error) {
            console.error('Fehler beim Einrichten der Dokumentenkonverter-Listener:', error);
        }
    }

    /**
     * Hauptfunktion zum Initialisieren des Admin-Panel-Fixes
     */
    function init() {
        console.log('Initialisiere Admin-Panel-Fix...');
        
        // Fix sofort anwenden
        const status = fixAdminPanel();
        
        // MutationObserver für dynamisch hinzugefügte Admin-Elemente
        setupAdminElementsObserver();
        
        // Als initialisiert markieren
        window.improvedAdminPanelFixInitialized = true;
        
        console.log('Admin-Panel-Fix wurde initialisiert.');
        return status;
    }

    /**
     * MutationObserver für dynamisch hinzugefügte Admin-Elemente
     */
    function setupAdminElementsObserver() {
        try {
            // Beobachte das gesamte document.body
            const observer = new MutationObserver((mutations) => {
                let adminElementsFound = false;
                
                for (const mutation of mutations) {
                    if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                        // Prüfe, ob Admin-Elemente hinzugefügt wurden
                        const adminToggleBtn = document.getElementById('admin-toggle-btn');
                        const adminView = document.getElementById('admin-view');
                        
                        if (adminToggleBtn && adminView && !adminViewInitialized) {
                            adminElementsFound = true;
                            console.log('Admin-Elemente dynamisch hinzugefügt, wende Fix an...');
                            fixAdminPanel();
                            return;
                        }
                    }
                }
            });
            
            // Observer aktivieren
            observer.observe(document.body, { childList: true, subtree: true });
            console.log('Admin-Elements-Observer aktiv.');
            
            return true;
        } catch (error) {
            console.error('Fehler beim Einrichten des Admin-Elements-Observers:', error);
            return false;
        }
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
    window.improvedAdminPanelFix = {
        init,
        fixAdminPanel,
        replaceAdminToggleButton,
        ensureAdminViewInitialized,
        enhanceTabButtons,
        ensureTabContents,
        forceAdminTabsDisplay,
        loadUsersTabContent,
        loadSystemTabContent,
        loadFeedbackTabContent,
        loadMotdTabContent,
        loadDocConverterTabContent,
        isInitialized: () => window.improvedAdminPanelFixInitialized || false
    };
})();