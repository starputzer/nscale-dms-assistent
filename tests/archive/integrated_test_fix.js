/**
 * Integrierter Test-Fix für nscale-assist
 * 
 * Dieses Skript kombiniert alle verfügbaren Fixes und führt sie in der richtigen Reihenfolge aus,
 * um eine vollständige Reparatur des nscale-assist Admin-Bereichs und zugehöriger Komponenten zu erreichen.
 */

(function() {
    console.log('===== NSCALE-ASSIST INTEGRIERTER TEST-FIX =====');
    
    // Test-Status
    const testStatus = {
        fixes: 0,
        errors: 0
    };
    
    // Status-Logging-Funktionen
    function logSuccess(message) {
        if (typeof console.pass === 'function') {
            console.pass(message);
        } else {
            console.log(`✅ ${message}`);
        }
        testStatus.fixes++;
    }
    
    function logError(message) {
        if (typeof console.fail === 'function') {
            console.fail(message);
        } else {
            console.error(`❌ ${message}`);
        }
        testStatus.errors++;
    }
    
    function logInfo(message) {
        console.log(`ℹ️ ${message}`);
    }
    
    function logWarning(message) {
        console.warn(`⚠️ ${message}`);
    }

    // Hilfsfunktion zum Warten
    function waitFor(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    // Admin-Button-Sichtbarkeit reparieren
    function fixAdminButtonVisibility() {
        logInfo('Repariere Admin-Button-Sichtbarkeit...');
        
        const adminButton = document.getElementById('admin-toggle-btn');
        
        if (!adminButton) {
            logError('Admin-Button nicht gefunden, kann Sichtbarkeit nicht anpassen.');
            return;
        }
        
        // Prüfen, ob der Benutzer ein Administrator ist
        if (localStorage.getItem('token')) {
            // Wir prüfen die Benutzerrolle über die API
            fetch('/api/user/role', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            })
            .then(response => response.json())
            .then(data => {
                if (data.role === 'admin') {
                    // Für Administratoren soll der Button sichtbar sein
                    adminButton.style.display = 'flex';
                    adminButton.style.visibility = 'visible';
                    adminButton.style.opacity = '1';
                    logSuccess('Admin-Button wurde für Admin-Benutzer sichtbar gemacht.');
                }
            })
            .catch(error => {
                logError(`Fehler beim Prüfen der Benutzerrolle: ${error}`);
            });
        }
    }
    
    // Admin-View-Struktur reparieren
    function fixAdminViewStructure() {
        logInfo('Repariere Admin-View-Struktur...');
        
        // Admin-View finden oder erstellen
        let adminView = document.getElementById('admin-view');
        
        if (!adminView) {
            logWarning('Admin-View nicht gefunden, erstelle neu...');
            
            // Main-Element (Hauptbereich) finden
            const mainContent = document.querySelector('main') || document.querySelector('.flex-1') || document.querySelector('#app main');
            
            if (!mainContent) {
                logError('Kein geeignetes Parent-Element für Admin-View gefunden.');
                return;
            }
            
            // Admin-View erstellen
            adminView = document.createElement('div');
            adminView.id = 'admin-view';
            adminView.className = 'h-full flex flex-col p-6 overflow-auto';
            adminView.style.display = 'none';
            
            // Grundstruktur des Admin-View
            adminView.innerHTML = `
                <div class="mb-6">
                    <h1 id="admin-tab-title" class="text-2xl font-semibold text-gray-800">Benutzer</h1>
                </div>
                
                <div class="admin-content flex-1">
                    <!-- Admin Tabs -->
                    <div id="users-tab" class="admin-panel-content"></div>
                    <div id="system-tab" class="admin-panel-content" style="display: none;"></div>
                    <div id="feedback-tab" class="admin-panel-content" style="display: none;"></div>
                    <div id="motd-tab" class="admin-panel-content" style="display: none;"></div>
                    <div id="doc-converter-tab" class="admin-panel-content" style="display: none;"></div>
                </div>
            `;
            
            // Admin-View einfügen
            mainContent.appendChild(adminView);
            logSuccess('Admin-View wurde neu erstellt.');
        }
        
        // Admin-Sidebar finden oder erstellen
        let adminSidebar = document.getElementById('admin-sidebar');
        
        if (!adminSidebar) {
            logWarning('Admin-Sidebar nicht gefunden, erstelle neu...');
            
            // Parent-Element finden
            const sidebarParent = document.querySelector('.flex.flex-1.overflow-hidden') || 
                                 document.querySelector('.flex.overflow-hidden') || 
                                 document.querySelector('main').parentElement;
            
            if (!sidebarParent) {
                logError('Kein geeignetes Parent-Element für Admin-Sidebar gefunden.');
                return;
            }
            
            // Admin-Sidebar erstellen
            adminSidebar = document.createElement('aside');
            adminSidebar.id = 'admin-sidebar';
            adminSidebar.className = 'admin-sidebar w-64 flex-shrink-0 transition-all';
            adminSidebar.style.display = 'none';
            
            // Sidebar-Inhalte
            adminSidebar.innerHTML = `
                <div class="p-4 font-semibold text-lg">Systemadministration</div>
                
                <nav class="admin-nav">
                    <button id="users-tab-btn" class="admin-nav-item active">
                        <i class="fas fa-users"></i>
                        <span>Benutzer</span>
                    </button>
                    
                    <button id="system-tab-btn" class="admin-nav-item">
                        <i class="fas fa-chart-line"></i>
                        <span>System</span>
                    </button>
                    
                    <button id="feedback-tab-btn" class="admin-nav-item">
                        <i class="fas fa-comment-dots"></i>
                        <span>Feedback</span>
                    </button>
                    
                    <button id="motd-tab-btn" class="admin-nav-item">
                        <i class="fas fa-info-circle"></i>
                        <span>MOTD</span>
                    </button>
                    
                    <button id="doc-converter-tab-btn" class="admin-nav-item">
                        <i class="fas fa-file-alt"></i>
                        <span>Dokumentenkonverter</span>
                    </button>
                </nav>
                
                <div class="mt-auto p-4 text-sm text-gray-500">
                    <p>Angemeldet als: <span id="user-role-display" class="font-semibold">Administrator</span></p>
                </div>
            `;
            
            // Admin-Sidebar einfügen
            const sessionsSidebar = document.getElementById('sessions-sidebar');
            if (sessionsSidebar) {
                sidebarParent.insertBefore(adminSidebar, sessionsSidebar);
            } else {
                sidebarParent.appendChild(adminSidebar);
            }
            
            logSuccess('Admin-Sidebar wurde neu erstellt.');
        }
    }
    
    // Admin-Button-Click-Handler reparieren
    function fixAdminButtonClickHandler() {
        logInfo('Repariere Admin-Button-Click-Handler...');
        
        const adminButton = document.getElementById('admin-toggle-btn');
        if (!adminButton) {
            logError('Admin-Button nicht gefunden, kann Click-Handler nicht reparieren.');
            return;
        }
        
        // Event-Listener entfernen und neu hinzufügen
        const newAdminButton = adminButton.cloneNode(true);
        adminButton.parentNode.replaceChild(newAdminButton, adminButton);
        
        newAdminButton.addEventListener('click', function() {
            // DOM-Elemente finden
            const adminView = document.getElementById('admin-view');
            const chatView = document.getElementById('chat-view');
            const adminSidebar = document.getElementById('admin-sidebar');
            const sessionsSidebar = document.getElementById('sessions-sidebar');
            
            // Prüfen, ob die nötigen Elemente vorhanden sind
            if (!adminView || !chatView) {
                logError('Admin-View oder Chat-View nicht gefunden, kann nicht umschalten!');
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
                
                logSuccess('Zur Chat-Ansicht gewechselt.');
            } else {
                // Zur Admin-Ansicht wechseln
                adminView.style.display = 'flex';
                chatView.style.display = 'none';
                
                if (adminSidebar) adminSidebar.style.display = 'block';
                if (sessionsSidebar) sessionsSidebar.style.display = 'none';
                
                // Initialen Tab anzeigen
                ensureDefaultTabShown();
                
                logSuccess('Zur Admin-Ansicht gewechselt.');
            }
        });
        
        logSuccess('Admin-Button-Click-Handler wurde repariert.');
    }
    
    // Tab-Navigation reparieren
    function fixTabNavigation() {
        logInfo('Repariere Tab-Navigation...');
        
        // Tab-Buttons finden
        const tabButtons = [
            'users-tab-btn',
            'system-tab-btn',
            'feedback-tab-btn',
            'motd-tab-btn',
            'doc-converter-tab-btn'
        ];
        
        // Event-Listener für Tab-Buttons korrigieren
        tabButtons.forEach(buttonId => {
            const button = document.getElementById(buttonId);
            if (!button) {
                logWarning(`Tab-Button ${buttonId} nicht gefunden.`);
                return;
            }
            
            // Event-Listener entfernen und neu hinzufügen
            const newButton = button.cloneNode(true);
            button.parentNode.replaceChild(newButton, button);
            
            newButton.addEventListener('click', function() {
                // Tab-ID aus Button-ID extrahieren
                const tabId = buttonId.replace('-btn', '');
                
                // Active-Klasse von allen Buttons entfernen
                tabButtons.forEach(id => {
                    const btn = document.getElementById(id);
                    if (btn) btn.classList.remove('active');
                });
                
                // Active-Klasse zu diesem Button hinzufügen
                newButton.classList.add('active');
                
                // Alle Tabs ausblenden
                const tabs = [
                    'users-tab',
                    'system-tab',
                    'feedback-tab',
                    'motd-tab',
                    'doc-converter-tab'
                ];
                
                tabs.forEach(id => {
                    const tab = document.getElementById(id);
                    if (tab) tab.style.display = 'none';
                });
                
                // Ausgewählten Tab einblenden
                const selectedTab = document.getElementById(tabId);
                if (selectedTab) {
                    selectedTab.style.display = 'block';
                    selectedTab.style.visibility = 'visible';
                    
                    // Tab-Titel aktualisieren
                    updateTabTitle(tabId);
                    
                    // Tab-Inhalt laden, falls leer
                    if (selectedTab.children.length === 0) {
                        loadTabContent(tabId);
                    }
                    
                    logSuccess(`Tab '${tabId}' wurde aktiviert.`);
                } else {
                    logError(`Tab '${tabId}' konnte nicht gefunden werden!`);
                }
            });
            
            logSuccess(`Event-Listener für Tab-Button '${buttonId}' wurde hinzugefügt.`);
        });
    }
    
    // Tab-Titel aktualisieren
    function updateTabTitle(tabId) {
        const titleElement = document.getElementById('admin-tab-title');
        if (!titleElement) return;
        
        const titles = {
            'users-tab': 'Benutzer',
            'system-tab': 'System',
            'feedback-tab': 'Feedback',
            'motd-tab': 'Nachricht des Tages',
            'doc-converter-tab': 'Dokumentenkonverter'
        };
        
        titleElement.textContent = titles[tabId] || 'Administration';
    }
    
    // MOTD-Vorschau reparieren
    function fixMotdPreview() {
        logInfo('Repariere MOTD-Vorschau...');
        
        // Event-Handler für MOTD-Vorschau
        function setupMotdPreview() {
            const motdContent = document.getElementById('motd-content');
            const motdPreview = document.getElementById('motd-preview-content');
            
            if (!motdContent || !motdPreview) {
                logWarning('MOTD-Elemente nicht gefunden, kann Vorschau nicht einrichten.');
                return;
            }
            
            // Vorschau-Funktion
            function updatePreview() {
                const content = motdContent.value;
                motdPreview.innerHTML = formatMotdContent(content);
            }
            
            // Einfache Markdown-Formatierung
            function formatMotdContent(content) {
                if (!content) return '';
                
                return content
                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                    .replace(/\n\n/g, '<br/><br/>')
                    .replace(/\n-\s/g, '<br/>• ');
            }
            
            // Initialen Inhalt setzen
            updatePreview();
            
            // Event-Listener hinzufügen
            motdContent.addEventListener('input', updatePreview);
            
            // Farb-Picker-Event-Listener
            const bgColor = document.getElementById('motd-bg-color');
            const borderColor = document.getElementById('motd-border-color');
            const textColor = document.getElementById('motd-text-color');
            const previewContainer = document.getElementById('motd-preview');
            
            if (bgColor && borderColor && textColor && previewContainer) {
                function updatePreviewStyle() {
                    previewContainer.style.backgroundColor = bgColor.value;
                    previewContainer.style.borderColor = borderColor.value;
                    previewContainer.style.color = textColor.value;
                }
                
                bgColor.addEventListener('input', updatePreviewStyle);
                borderColor.addEventListener('input', updatePreviewStyle);
                textColor.addEventListener('input', updatePreviewStyle);
            }
            
            logSuccess('MOTD-Vorschau-Event-Handler wurden eingerichtet.');
        }
        
        // MOTD-Tab-Button-Event-Handler
        const motdTabBtn = document.getElementById('motd-tab-btn');
        if (motdTabBtn) {
            motdTabBtn.addEventListener('click', function() {
                // 50ms warten, damit der Tab wirklich angezeigt wird
                setTimeout(setupMotdPreview, 50);
            });
            
            logSuccess('MOTD-Tab-Button-Event-Handler wurde hinzugefügt.');
        } else {
            logWarning('MOTD-Tab-Button nicht gefunden, kann Event-Handler nicht hinzufügen.');
        }
    }
    
    // Dokumentenkonverter reparieren
    function fixDocConverter() {
        logInfo('Repariere Dokumentenkonverter...');
        
        // Dokumentenkonverter-Tab-Button-Event-Handler
        const docConverterTabBtn = document.getElementById('doc-converter-tab-btn');
        if (docConverterTabBtn) {
            docConverterTabBtn.addEventListener('click', function() {
                // 50ms warten, damit der Tab wirklich angezeigt wird
                setTimeout(function() {
                    const fileUpload = document.getElementById('file-upload');
                    const fileNameDisplay = document.getElementById('file-name');
                    const convertBtn = document.getElementById('convert-btn');
                    
                    if (fileUpload && fileNameDisplay && convertBtn) {
                        fileUpload.addEventListener('change', function(e) {
                            const file = e.target.files[0];
                            if (file) {
                                fileNameDisplay.textContent = file.name;
                                convertBtn.disabled = false;
                            } else {
                                fileNameDisplay.textContent = 'Keine Datei ausgewählt';
                                convertBtn.disabled = true;
                            }
                        });
                        
                        logSuccess('Dokumentenkonverter-Event-Handler wurden eingerichtet.');
                    } else {
                        logWarning('Dokumentenkonverter-Elemente nicht gefunden, kann Event-Handler nicht einrichten.');
                    }
                }, 50);
            });
            
            logSuccess('Dokumentenkonverter-Tab-Button-Event-Handler wurde hinzugefügt.');
        } else {
            logWarning('Dokumentenkonverter-Tab-Button nicht gefunden, kann Event-Handler nicht hinzufügen.');
        }
    }
    
    // Standardtab anzeigen
    function ensureDefaultTabShown() {
        logInfo('Stelle sicher, dass der Standard-Tab angezeigt wird...');
        
        const usersTab = document.getElementById('users-tab');
        if (usersTab) {
            // Inhalte laden, falls nötig
            if (usersTab.children.length === 0) {
                loadTabContent('users-tab');
            }
            
            // Sichtbarkeit sicherstellen
            usersTab.style.display = 'block';
            
            // Button aktiv markieren
            const usersTabBtn = document.getElementById('users-tab-btn');
            if (usersTabBtn) {
                // Alle Button-Klassen zurücksetzen
                const buttons = document.querySelectorAll('.admin-nav-item');
                buttons.forEach(btn => btn.classList.remove('active'));
                
                // Users-Tab-Button aktivieren
                usersTabBtn.classList.add('active');
                
                logSuccess('Standard-Tab (Users) wurde aktiviert.');
            } else {
                logWarning('Users-Tab-Button nicht gefunden, kann Standardtab nicht aktivieren.');
            }
        } else {
            logWarning('Users-Tab nicht gefunden, kann Standardtab nicht setzen.');
        }
    }
    
    // Tab-Inhalte laden
    function loadTabContent(tabId) {
        const tab = document.getElementById(tabId);
        if (!tab) {
            logError(`Tab '${tabId}' nicht gefunden, kann Inhalt nicht laden.`);
            return;
        }
        
        logInfo(`Lade Inhalt für Tab '${tabId}'...`);
        
        switch (tabId) {
            case 'users-tab':
                tab.innerHTML = `
                    <div class="admin-card">
                        <h2 class="admin-card-title">Benutzerverwaltung</h2>
                        <p class="mb-4">Verwalten Sie die Benutzer des Systems und deren Berechtigungen.</p>
                        
                        <div class="overflow-x-auto">
                            <table class="admin-table">
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>E-Mail</th>
                                        <th>Rolle</th>
                                        <th>Registriert am</th>
                                        <th>Aktionen</th>
                                    </tr>
                                </thead>
                                <tbody id="users-table-body">
                                    <tr>
                                        <td colspan="5" class="text-center">Benutzer werden geladen...</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                    
                    <div class="admin-card mt-6">
                        <h2 class="admin-card-title">Neuen Benutzer erstellen</h2>
                        <form id="create-user-form" class="space-y-4">
                            <div class="admin-form-group">
                                <label class="admin-label" for="new-user-email">E-Mail</label>
                                <input id="new-user-email" type="email" class="nscale-input w-full" required>
                            </div>
                            
                            <div class="admin-form-group">
                                <label class="admin-label" for="new-user-password">Passwort</label>
                                <input id="new-user-password" type="password" class="nscale-input w-full" required>
                            </div>
                            
                            <div class="admin-form-group">
                                <label class="admin-label" for="new-user-role">Rolle</label>
                                <select id="new-user-role" class="nscale-input w-full">
                                    <option value="user">Benutzer</option>
                                    <option value="admin">Administrator</option>
                                </select>
                            </div>
                            
                            <div class="admin-actions">
                                <button type="submit" class="nscale-btn-primary">
                                    <i class="fas fa-plus mr-2"></i> Benutzer erstellen
                                </button>
                            </div>
                        </form>
                    </div>
                `;
                break;
                
            case 'system-tab':
                tab.innerHTML = `
                    <div class="admin-card">
                        <h2 class="admin-card-title">Systemstatistiken</h2>
                        <p class="mb-4">Übersicht über die Systemnutzung und Ressourcen.</p>
                        
                        <div class="admin-stats-grid">
                            <div class="admin-stat-card">
                                <div class="admin-stat-value">-</div>
                                <div class="admin-stat-label">Benutzer</div>
                            </div>
                            
                            <div class="admin-stat-card">
                                <div class="admin-stat-value">-</div>
                                <div class="admin-stat-label">Unterhaltungen</div>
                            </div>
                            
                            <div class="admin-stat-card">
                                <div class="admin-stat-value">-</div>
                                <div class="admin-stat-label">Nachrichten</div>
                            </div>
                            
                            <div class="admin-stat-card">
                                <div class="admin-stat-value">-</div>
                                <div class="admin-stat-label">Ø Nachrichten pro Unterhaltung</div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="admin-card mt-6">
                        <h2 class="admin-card-title">System-Aktionen</h2>
                        <div class="admin-actions gap-4">
                            <button id="reload-motd-btn" class="nscale-btn-secondary">
                                <i class="fas fa-sync-alt mr-2"></i> MOTD neu laden
                            </button>
                            
                            <button id="clear-cache-btn" class="nscale-btn-secondary">
                                <i class="fas fa-broom mr-2"></i> LLM-Cache leeren
                            </button>
                            
                            <button id="clear-embedding-cache-btn" class="nscale-btn-secondary">
                                <i class="fas fa-eraser mr-2"></i> Embedding-Cache leeren
                            </button>
                        </div>
                    </div>
                `;
                break;
                
            case 'feedback-tab':
                tab.innerHTML = `
                    <div class="admin-card">
                        <h2 class="admin-card-title">Feedback-Statistiken</h2>
                        <p class="mb-4">Übersicht über das erhaltene Benutzerfeedback.</p>
                        
                        <div class="admin-stats-grid">
                            <div class="admin-stat-card">
                                <div class="admin-stat-value">-</div>
                                <div class="admin-stat-label">Feedback insgesamt</div>
                            </div>
                            
                            <div class="admin-stat-card">
                                <div class="admin-stat-value">-</div>
                                <div class="admin-stat-label">Positives Feedback</div>
                            </div>
                            
                            <div class="admin-stat-card">
                                <div class="admin-stat-value">-</div>
                                <div class="admin-stat-label">Negatives Feedback</div>
                            </div>
                            
                            <div class="admin-stat-card">
                                <div class="admin-stat-value">-</div>
                                <div class="admin-stat-label">Positive Bewertungsrate</div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="admin-card mt-6">
                        <h2 class="admin-card-title">Negatives Feedback mit Kommentaren</h2>
                        <p class="mb-2">Hier sehen Sie Benutzerfeedback, das als nicht hilfreich bewertet wurde und mit Kommentaren versehen ist.</p>
                        
                        <div class="space-y-4 mt-4" id="negative-feedback-container">
                            <p class="text-gray-500">Keine negativen Feedback-Einträge gefunden.</p>
                        </div>
                    </div>
                `;
                break;
                
            case 'motd-tab':
                tab.innerHTML = `
                    <div class="admin-card">
                        <h2 class="admin-card-title">MOTD-Konfiguration</h2>
                        <p class="mb-4">Konfigurieren Sie die angezeigte Nachricht des Tages (Message of the Day).</p>
                        
                        <form id="motd-form" class="space-y-4">
                            <div class="admin-form-group">
                                <div class="flex items-center">
                                    <input id="motd-enabled" type="checkbox" class="mr-2" checked>
                                    <label for="motd-enabled" class="admin-label m-0">MOTD aktivieren</label>
                                </div>
                            </div>
                            
                            <div class="admin-form-group">
                                <label class="admin-label" for="motd-content">MOTD-Inhalt</label>
                                <textarea id="motd-content" class="nscale-input w-full h-32" placeholder="Inhalt der Nachricht des Tages">🛠️ **BETA-VERSION: Lokaler KI-Assistent für nscale**

Dieser Assistent beantwortet Fragen zur Nutzung der nscale DMS-Software auf Basis interner Informationen.

🔒 **Wichtige Hinweise:**
- Alle Datenverarbeitungen erfolgen **ausschließlich lokal im Landesnetz Berlin**.
- Es besteht **keine Verbindung zum Internet** – Ihre Eingaben verlassen niemals das System.
- **Niemand außer Ihnen** hat Zugriff auf Ihre Eingaben oder Fragen.
- Die Antworten werden von einer KI generiert – **Fehlinformationen sind möglich**.
- Bitte geben Sie **keine sensiblen oder personenbezogenen Daten** ein.

🧠 Der Assistent befindet sich in der Erprobung und wird stetig weiterentwickelt.</textarea>
                                <p class="text-xs text-gray-500 mt-1">Markdown unterstützt.</p>
                            </div>
                            
                            <div class="admin-form-group">
                                <label class="admin-label">Stil</label>
                                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label class="block text-sm mb-1" for="motd-bg-color">Hintergrundfarbe</label>
                                        <input id="motd-bg-color" type="color" class="w-full" value="#fff3cd">
                                    </div>
                                    <div>
                                        <label class="block text-sm mb-1" for="motd-border-color">Rahmenfarbe</label>
                                        <input id="motd-border-color" type="color" class="w-full" value="#ffeeba">
                                    </div>
                                    <div>
                                        <label class="block text-sm mb-1" for="motd-text-color">Textfarbe</label>
                                        <input id="motd-text-color" type="color" class="w-full" value="#856404">
                                    </div>
                                </div>
                            </div>
                            
                            <div class="admin-form-group">
                                <label class="admin-label">Anzeigeoptionen</label>
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <div class="flex items-center mb-2">
                                            <input id="motd-dismissible" type="checkbox" class="mr-2" checked>
                                            <label for="motd-dismissible" class="text-sm">Ausblendbar</label>
                                        </div>
                                        <div class="flex items-center">
                                            <input id="motd-show-in-chat" type="checkbox" class="mr-2" checked>
                                            <label for="motd-show-in-chat" class="text-sm">Im Chat anzeigen</label>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="admin-card mt-4">
                                <h3 class="text-lg font-medium mb-2">Vorschau</h3>
                                <div id="motd-preview" class="p-4 rounded-lg" style="background-color: #fff3cd; border: 1px solid #ffeeba; color: #856404;">
                                    <div id="motd-preview-content"></div>
                                </div>
                            </div>
                            
                            <div class="admin-actions">
                                <button type="button" id="motd-reset-btn" class="nscale-btn-secondary">
                                    Zurücksetzen
                                </button>
                                <button type="submit" id="motd-save-btn" class="nscale-btn-primary">
                                    Speichern
                                </button>
                            </div>
                        </form>
                    </div>
                `;
                break;
                
            case 'doc-converter-tab':
                tab.innerHTML = `
                    <div class="admin-card">
                        <h2 class="admin-card-title">Dokumentenkonverter-Konfiguration</h2>
                        <p class="mb-4">Der Dokumentenkonverter unterstützt folgende Dateiformate:</p>
                        
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div class="bg-gray-50 p-4 rounded-lg">
                                <h3 class="font-medium mb-2">Unterstützte Eingabeformate</h3>
                                <ul class="list-disc pl-5">
                                    <li>PDF (.pdf)</li>
                                    <li>Microsoft Word (.docx, .doc)</li>
                                    <li>Microsoft Excel (.xlsx, .xls)</li>
                                    <li>Microsoft PowerPoint (.pptx, .ppt)</li>
                                    <li>OpenDocument (.odt, .ods, .odp)</li>
                                    <li>Markdown (.md)</li>
                                    <li>Text (.txt)</li>
                                </ul>
                            </div>
                            
                            <div class="bg-gray-50 p-4 rounded-lg">
                                <h3 class="font-medium mb-2">Verfügbare Ausgabeformate</h3>
                                <ul class="list-disc pl-5">
                                    <li>PDF - Portable Document Format</li>
                                    <li>HTML - Webseite</li>
                                    <li>TEXT - Einfacher Text</li>
                                    <li>MARKDOWN - Formatierter Text</li>
                                    <li>JSON - Strukturierte Daten</li>
                                </ul>
                            </div>
                        </div>
                        
                        <div id="doc-converter-container" class="mt-6">
                            <h3 class="font-medium mb-2">Dokument konvertieren</h3>
                            <p class="text-sm text-gray-600 mb-4">
                                Wählen Sie eine Datei und das gewünschte Ausgabeformat, um die Konvertierung zu starten.
                            </p>
                            
                            <form id="file-upload-form" class="converter-form">
                                <div class="form-group">
                                    <label for="file-upload">Dokument auswählen</label>
                                    <input type="file" id="file-upload" class="file-input" accept=".pdf,.docx,.doc,.xlsx,.xls,.pptx,.ppt,.odt,.ods,.odp,.md,.txt">
                                    <div id="file-name" class="file-name">Keine Datei ausgewählt</div>
                                </div>
                                
                                <div class="form-group">
                                    <label for="output-format">Ausgabeformat</label>
                                    <select id="output-format" class="format-select nscale-input">
                                        <option value="PDF">PDF - Portable Document Format</option>
                                        <option value="HTML">HTML - Webseite</option>
                                        <option value="TEXT">TEXT - Einfacher Text</option>
                                        <option value="MARKDOWN">MARKDOWN - Formatierter Text</option>
                                        <option value="JSON">JSON - Strukturierte Daten</option>
                                    </select>
                                </div>
                                
                                <div class="converter-actions">
                                    <button type="submit" id="convert-btn" class="nscale-btn-primary" disabled>
                                        <i class="fas fa-exchange-alt mr-2"></i> Konvertieren
                                    </button>
                                    <button type="button" id="to-chat-btn" class="nscale-btn-secondary ml-2">
                                        <i class="fas fa-comment mr-2"></i> Zur Chat-Ansicht
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                `;
                break;
                
            default:
                logError(`Unbekannter Tab: ${tabId}`);
                return;
        }
        
        logSuccess(`Inhalt für Tab '${tabId}' wurde geladen.`);
    }
    
    // Alle Fixes anwenden
    async function applyAllFixes() {
        logInfo('Wende alle Fixes an...');
        
        fixAdminButtonVisibility();
        fixAdminViewStructure();
        fixAdminButtonClickHandler();
        fixTabNavigation();
        fixMotdPreview();
        fixDocConverter();
        
        // Kurz warten und dann sicherstellen, dass der Standard-Tab angezeigt wird
        await waitFor(100);
        ensureDefaultTabShown();
        
        // Zusammenfassung
        logInfo('\n===== FIX-ZUSAMMENFASSUNG =====');
        logInfo(`${testStatus.fixes} Komponenten wurden repariert.`);
        
        if (testStatus.errors > 0) {
            logWarning(`${testStatus.errors} Fehler sind aufgetreten.`);
        } else {
            logSuccess('Alle Admin-Komponenten wurden erfolgreich repariert!');
        }
    }
    
    // Skript starten
    async function run() {
        await waitFor(300); // Warten, bis die Seite vollständig geladen ist
        await applyAllFixes();
    }
    
    // Skript ausführen
    run();
})();