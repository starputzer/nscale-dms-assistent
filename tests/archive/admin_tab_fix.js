/**
 * Admin-Tab Fix für nscale-assist
 * 
 * Dieses Skript behebt Probleme mit den Admin-Tabs, insbesondere:
 * - Ersten Klick auf Admin-Button, der nicht alle Tabs anzeigt
 * - Fehlende Tab-Inhalte
 * - Tab-Wechsel-Probleme
 */

(function() {
    console.log('===== NSCALE-ASSIST ADMIN-TAB-FIX =====');
    
    // Test-Status
    const testStatus = {
        fixes: 0,
        errors: 0
    };
    
    // Status-Logging-Funktionen
    function logSuccess(message) {
        console.log(`✅ ${message}`);
        testStatus.fixes++;
    }
    
    function logError(message) {
        console.error(`❌ ${message}`);
        testStatus.errors++;
    }
    
    function logInfo(message) {
        console.log(`ℹ️ ${message}`);
    }
    
    function logWarning(message) {
        console.warn(`⚠️ ${message}`);
    }
    
    // DOM-Element prüfen und reparieren
    function ensureElementExists(id, parentSelector, htmlContent, callback) {
        const element = document.getElementById(id);
        
        if (element) {
            logInfo(`Element '${id}' existiert bereits.`);
            if (callback && typeof callback === 'function') {
                callback(element, false);
            }
            return element;
        }
        
        logWarning(`Element '${id}' nicht gefunden, wird erstellt...`);
        
        const parent = document.querySelector(parentSelector);
        if (!parent) {
            logError(`Parent für '${id}' (Selektor: ${parentSelector}) nicht gefunden!`);
            return null;
        }
        
        const newElement = document.createElement('div');
        newElement.id = id;
        newElement.innerHTML = htmlContent || '';
        parent.appendChild(newElement);
        
        logSuccess(`Element '${id}' wurde erstellt.`);
        
        if (callback && typeof callback === 'function') {
            callback(newElement, true);
        }
        
        return newElement;
    }
    
    // Admin-View reparieren
    function fixAdminView() {
        logInfo('Repariere Admin-View...');
        
        const adminView = ensureElementExists('admin-view', 'main', `
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
        `, (element, wasCreated) => {
            if (wasCreated) {
                element.classList.add('h-full', 'flex', 'flex-col', 'p-6', 'overflow-auto');
                element.style.display = 'none';
            }
        });
        
        // Stellen Sie sicher, dass der Admin-View die richtige Anzeige und CSS hat
        if (adminView) {
            adminView.style.position = 'relative';
            adminView.style.zIndex = '100';
            logSuccess('Admin-View-Styling wurde aktualisiert.');
        }
        
        return adminView;
    }
    
    // Admin-Sidebar reparieren
    function fixAdminSidebar() {
        logInfo('Repariere Admin-Sidebar...');
        
        const adminSidebar = ensureElementExists('admin-sidebar', '.flex.flex-1.overflow-hidden', `
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
                <p>Angemeldet als: <span id="user-role-display" class="font-semibold">-</span></p>
            </div>
        `, (element, wasCreated) => {
            if (wasCreated) {
                element.classList.add('admin-sidebar', 'w-64', 'flex-shrink-0', 'transition-all');
                element.style.display = 'none';
            }
        });
        
        return adminSidebar;
    }
    
    // Tab-Buttons reparieren
    function fixTabButtons() {
        logInfo('Repariere Tab-Buttons...');
        
        // Alle Tab-Button-IDs
        const tabButtons = [
            'users-tab-btn',
            'system-tab-btn',
            'feedback-tab-btn',
            'motd-tab-btn',
            'doc-converter-tab-btn'
        ];
        
        // Tab-Event-Listener hinzufügen
        tabButtons.forEach(buttonId => {
            const button = document.getElementById(buttonId);
            
            if (button) {
                // Event-Listener entfernen (falls vorhanden)
                const newButton = button.cloneNode(true);
                button.parentNode.replaceChild(newButton, button);
                
                // Neuen Event-Listener hinzufügen
                newButton.addEventListener('click', function() {
                    // Tab-ID extrahieren
                    const tabId = buttonId.replace('-btn', '');
                    
                    logInfo(`Tab-Button '${buttonId}' wurde geklickt, aktiviere Tab '${tabId}'...`);
                    
                    // Alle Tab-Buttons deaktivieren
                    tabButtons.forEach(id => {
                        const btn = document.getElementById(id);
                        if (btn) {
                            btn.classList.remove('active');
                        }
                    });
                    
                    // Diesen Button aktivieren
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
                        if (tab) {
                            tab.style.display = 'none';
                        }
                    });
                    
                    // Gewählten Tab einblenden
                    const selectedTab = document.getElementById(tabId);
                    if (selectedTab) {
                        selectedTab.style.display = 'block';
                        selectedTab.style.visibility = 'visible';
                        logSuccess(`Tab '${tabId}' wurde aktiviert.`);
                        
                        // Titel aktualisieren
                        updateTabTitle(tabId);
                        
                        // Tab-Inhalt laden, falls leer
                        if (selectedTab.children.length === 0) {
                            loadTabContent(tabId);
                        }
                    } else {
                        logError(`Tab '${tabId}' konnte nicht gefunden werden!`);
                    }
                });
                
                logSuccess(`Event-Listener für Tab-Button '${buttonId}' wurde hinzugefügt.`);
            } else {
                logError(`Tab-Button '${buttonId}' konnte nicht gefunden werden!`);
            }
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
    
    // Tab-Inhalt laden
    function loadTabContent(tabId) {
        const tab = document.getElementById(tabId);
        if (!tab) return;
        
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
                
                // MOTD-Vorschau initialisieren
                setTimeout(() => {
                    const motdContent = document.getElementById('motd-content');
                    const motdPreview = document.getElementById('motd-preview-content');
                    
                    if (motdContent && motdPreview) {
                        // Einfache Markdown-Formatierung
                        const formatMotdContent = (content) => {
                            return content
                                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                .replace(/\n\n/g, '<br/><br/>')
                                .replace(/\n-\s/g, '<br/>• ');
                        };
                        
                        // Vorschau aktualisieren
                        motdPreview.innerHTML = formatMotdContent(motdContent.value);
                        
                        // Event-Listener für Vorschau
                        motdContent.addEventListener('input', function() {
                            motdPreview.innerHTML = formatMotdContent(this.value);
                        });
                        
                        // Farb-Picker-Event-Listener
                        const bgColor = document.getElementById('motd-bg-color');
                        const borderColor = document.getElementById('motd-border-color');
                        const textColor = document.getElementById('motd-text-color');
                        const previewContainer = document.getElementById('motd-preview');
                        
                        if (bgColor && borderColor && textColor && previewContainer) {
                            const updatePreviewStyle = () => {
                                previewContainer.style.backgroundColor = bgColor.value;
                                previewContainer.style.borderColor = borderColor.value;
                                previewContainer.style.color = textColor.value;
                            };
                            
                            bgColor.addEventListener('input', updatePreviewStyle);
                            borderColor.addEventListener('input', updatePreviewStyle);
                            textColor.addEventListener('input', updatePreviewStyle);
                        }
                    }
                }, 100);
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
                
                // Event-Listener für Dokumentenkonverter
                setTimeout(() => {
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
                    }
                    
                    const fileUploadForm = document.getElementById('file-upload-form');
                    if (fileUploadForm) {
                        fileUploadForm.addEventListener('submit', function(e) {
                            e.preventDefault();
                            if (fileUpload.files[0]) {
                                alert('Die Dokumentkonvertierung wurde gestartet. Bitte warten Sie einen Moment...');
                            } else {
                                alert('Bitte wählen Sie eine Datei aus.');
                            }
                        });
                    }
                    
                    const toChatBtn = document.getElementById('to-chat-btn');
                    if (toChatBtn) {
                        toChatBtn.addEventListener('click', function() {
                            // Zur Chat-Ansicht wechseln
                            const adminToggleBtn = document.getElementById('admin-toggle-btn');
                            if (adminToggleBtn) {
                                adminToggleBtn.click();
                            }
                        });
                    }
                }, 100);
                break;
                
            default:
                logError(`Unbekannter Tab: ${tabId}`);
                return;
        }
        
        logSuccess(`Inhalt für Tab '${tabId}' wurde geladen.`);
    }
    
    // Admin-Button-Event-Handler reparieren
    function fixAdminButtonClick() {
        logInfo('Repariere Admin-Button Click-Event...');
        
        const adminButton = document.getElementById('admin-toggle-btn');
        if (!adminButton) {
            logError('Admin-Button nicht gefunden! Kann Click-Event nicht reparieren.');
            return;
        }
        
        // Event-Listener entfernen (falls vorhanden)
        const newAdminButton = adminButton.cloneNode(true);
        adminButton.parentNode.replaceChild(newAdminButton, adminButton);
        
        // Neuen Event-Listener hinzufügen
        newAdminButton.addEventListener('click', function() {
            // Admin-Elemente finden
            const adminView = document.getElementById('admin-view');
            const chatView = document.getElementById('chat-view');
            const adminSidebar = document.getElementById('admin-sidebar');
            const sessionsSidebar = document.getElementById('sessions-sidebar');
            
            // Prüfen, ob alle benötigten Elemente existieren
            if (!adminView || !chatView) {
                logError('Admin-View oder Chat-View fehlt! Kann nicht zwischen Ansichten umschalten.');
                return;
            }
            
            // Aktuellen Zustand ermitteln
            const isAdminVisible = adminView.style.display === 'flex' || window.getComputedStyle(adminView).display === 'flex';
            
            logInfo(`Admin-Button geklickt. Admin-View ist aktuell ${isAdminVisible ? 'sichtbar' : 'ausgeblendet'}.`);
            
            // Umschalten der Ansicht
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
                
                logSuccess('Zur Admin-Ansicht gewechselt.');
                
                // Initialen Tab anzeigen
                setTimeout(() => {
                    // Standardmäßig Users-Tab anzeigen
                    const usersTab = document.getElementById('users-tab');
                    const otherTabs = ['system-tab', 'feedback-tab', 'motd-tab', 'doc-converter-tab'];
                    
                    if (usersTab) {
                        usersTab.style.display = 'block';
                        
                        // Andere Tabs ausblenden
                        otherTabs.forEach(tabId => {
                            const tab = document.getElementById(tabId);
                            if (tab) tab.style.display = 'none';
                        });
                        
                        // Users-Tab-Button aktivieren
                        const usersTabBtn = document.getElementById('users-tab-btn');
                        if (usersTabBtn) {
                            const tabButtons = document.querySelectorAll('.admin-nav-item');
                            tabButtons.forEach(btn => btn.classList.remove('active'));
                            usersTabBtn.classList.add('active');
                        }
                        
                        // Tab-Titel aktualisieren
                        updateTabTitle('users-tab');
                        
                        // Tab-Inhalt laden, falls leer
                        if (usersTab.children.length === 0) {
                            loadTabContent('users-tab');
                        }
                        
                        logSuccess('Users-Tab wurde als initialer Tab gesetzt.');
                    } else {
                        logError('Users-Tab nicht gefunden! Konnte initialen Tab nicht setzen.');
                    }
                }, 100);
            }
        });
        
        logSuccess('Admin-Button Click-Event-Handler wurde repariert.');
    }
    
    // Hauptfunktion, die alle Reparaturen durchführt
    function fixAllAdminTabIssues() {
        logInfo('Starte Reparatur aller Admin-Tab-Probleme...');
        
        // Reparaturen durchführen
        fixAdminView();
        fixAdminSidebar();
        fixTabButtons();
        fixAdminButtonClick();
        
        // Überprüfen, ob Admin-Button vorhanden und sichtbar ist
        const adminButton = document.getElementById('admin-toggle-btn');
        if (adminButton && localStorage.getItem('token')) {
            const computedStyle = window.getComputedStyle(adminButton);
            if (computedStyle.display === 'none') {
                logInfo('Admin-Button ist unsichtbar, obwohl Token vorhanden ist. Versuche zu beheben...');
                adminButton.style.display = 'flex';
                logSuccess('Admin-Button wurde auf sichtbar gesetzt.');
            }
        }
        
        // Zusammenfassung ausgeben
        logInfo('\n===== REPARATUR-ZUSAMMENFASSUNG =====');
        logInfo(`${testStatus.fixes} Probleme wurden behoben.`);
        if (testStatus.errors > 0) {
            logWarning(`${testStatus.errors} Fehler sind aufgetreten.`);
        } else {
            logSuccess('Alle Admin-Tab-Probleme wurden erfolgreich behoben!');
        }
    }
    
    // Hilfsfunktion zum Warten
    function waitFor(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    // Ausführung verzögern, um sicherzustellen, dass die DOM-Struktur geladen ist
    async function run() {
        await waitFor(500);
        fixAllAdminTabIssues();
    }
    
    // Script starten
    run();
})();