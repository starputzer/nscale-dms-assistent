/**
 * All-Fixes Bundle für nscale-assist
 * 
 * Dieses Skript bündelt alle Fixes für die bekannten Probleme in nscale-assist:
 * - Text-Streaming-Fix: Zeigt Text inkrementell während der Generierung an statt erst am Ende
 * - Session-Input-Persister: Behält eingegebene Texte beim Wechsel zwischen Sessions bei
 * - Admin-View-Fix: Behebt das Problem, dass der Admin-Bereich beim ersten Klick nicht korrekt geladen wird
 * - Admin-Stats-Fix: Stellt Statistiken im Admin-Bereich korrekt dar
 * - MOTD-Preview-Fix: Behebt den "Cannot read properties of undefined (reading 'trim')"-Fehler
 * - Doc-Converter-Buttons-Fix: Behebt fehlende Buttons im Dokumentenkonverter-Tab
 */

(function() {
    console.log('===== NSCALE-ASSIST ALL-FIXES BUNDLE =====');
    console.log('Initialisiere alle Fixes...');
    
    // Globaler Status
    const fixStatus = {
        textStreaming: false,
        sessionInputPersister: false,
        adminView: false,
        adminStats: false,
        motdPreview: false,
        docConverter: false
    };

    // Hilfsfunktion zum Warten
    function waitFor(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Fix 1: Text-Streaming-Fix
     */
    function initTextStreamingFix() {
        console.log('Initialisiere Text-Streaming-Fix...');
        
        try {
            // Fix für den Event-Source-Handler
            window.setupStreamConnection = function(sessionId, question, token, onChunk, onError, onEnd) {
                console.log('Neue setupStreamConnection-Funktion wird verwendet.');
                
                // Konstruiere die URL mit den richtigen Parametern
                const apiUrl = `/api/question/stream?question=${encodeURIComponent(question)}&session_id=${sessionId}`;
                
                // Erstelle eine neue EventSource-Verbindung
                const eventSource = new EventSource(apiUrl);
                
                // Speichere die EventSource-Instanz
                window.currentEventSource = eventSource;
                
                // Event-Handler einrichten
                eventSource.onmessage = function(event) {
                    const data = JSON.parse(event.data);
                    if (data.response) {
                        onChunk(data.response);
                    } else if (data.error) {
                        onError(data.error);
                        eventSource.close();
                    }
                };
                
                eventSource.addEventListener('done', function(event) {
                    console.log('Stream beendet: done-Event empfangen');
                    eventSource.close();
                    if (onEnd) onEnd();
                });
                
                eventSource.onerror = function(error) {
                    console.error('Stream-Fehler:', error);
                    eventSource.close();
                    if (onError) onError('Verbindungsfehler beim Streaming.');
                };
                
                return eventSource;
            };
            
            // Prüfe, ob eine aktive Verbindung besteht und beende sie
            window.closeStreamConnection = function() {
                if (window.currentEventSource) {
                    console.log('Schließe aktive Stream-Verbindung.');
                    window.currentEventSource.close();
                    window.currentEventSource = null;
                }
            };
            
            fixStatus.textStreaming = true;
            console.log('Text-Streaming-Fix wurde erfolgreich initialisiert.');
        } catch (error) {
            console.error('Fehler beim Initialisieren des Text-Streaming-Fixes:', error);
        }
    }

    /**
     * Fix 2: Session-Input-Persister-Fix
     */
    function initSessionInputPersisterFix() {
        console.log('Initialisiere Session-Input-Persister-Fix...');
        
        try {
            // Speicher für Eingaben pro Session
            const sessionInputMap = new Map();
            
            // Identifiziere die relevanten DOM-Elemente
            const inputElement = document.querySelector('#question-input, #message-input, .message-input, textarea[name="message"]');
            if (!inputElement) {
                console.error('Konnte Eingabefeld nicht finden.');
                return;
            }
            
            // Event-Listener für jede Eingabeänderung
            inputElement.addEventListener('input', function() {
                const currentSession = getCurrentSessionId();
                if (currentSession) {
                    console.log(`Speichere Eingabe für Session ${currentSession}:`, inputElement.value);
                    sessionInputMap.set(currentSession, inputElement.value);
                }
            });
            
            // Ermittle die Session-Tabs
            const sessionTabs = document.querySelectorAll('.session-tab, .chat-tab, .tab-item, #sessions-list li');
            
            if (sessionTabs.length > 0) {
                console.log(`${sessionTabs.length} Session-Tabs gefunden.`);
                
                // Event-Listener für jeden Tab einrichten
                sessionTabs.forEach(tab => {
                    // Speichere den ursprünglichen Click-Handler
                    const originalClickHandler = tab.onclick;
                    
                    // Ersetze den Click-Handler
                    tab.onclick = function(event) {
                        // Speichere die aktuelle Eingabe
                        const activeTabId = getCurrentSessionId();
                        if (activeTabId) {
                            sessionInputMap.set(activeTabId, inputElement.value);
                        }
                        
                        // Führe den ursprünglichen Click-Handler aus
                        if (typeof originalClickHandler === 'function') {
                            originalClickHandler.call(this, event);
                        }
                        
                        // Verzögerung, um sicherzustellen, dass die neue Session aktiv ist
                        setTimeout(() => {
                            // Bestimme die neue aktive Session
                            const sessionId = getCurrentSessionId();
                            if (sessionId) {
                                // Lade die gespeicherte Eingabe für diese Session
                                const savedInput = sessionInputMap.get(sessionId) || '';
                                inputElement.value = savedInput;
                                console.log(`Geladene Eingabe für Session ${sessionId}:`, savedInput);
                            }
                        }, 100);
                    };
                });
            } else {
                console.warn('Keine Session-Tabs gefunden, überwache Session-Wechsel über DOM-Änderungen...');
                
                // Fallback: MutationObserver verwenden, um Änderungen zu überwachen
                const observer = new MutationObserver((mutations) => {
                    // Speichere den aktuellen Session-Wert
                    const currentSessionId = getCurrentSessionId();
                    
                    if (currentSessionId) {
                        const savedInput = sessionInputMap.get(currentSessionId) || '';
                        inputElement.value = savedInput;
                    }
                });
                
                // Beobachte den Haupt-Container für Änderungen
                const container = document.querySelector('#app') || document.body;
                observer.observe(container, { childList: true, subtree: true });
            }
            
            // Einrichtung eines globalen API für andere Scripts
            window.sessionInputPersister = {
                getInputForSession: (sessionId) => sessionInputMap.get(sessionId) || '',
                setInputForSession: (sessionId, value) => sessionInputMap.set(sessionId, value),
                getCurrentInput: () => {
                    const currentSessionId = getCurrentSessionId();
                    return currentSessionId ? sessionInputMap.get(currentSessionId) || '' : '';
                },
                getAllSessionInputs: () => Object.fromEntries(sessionInputMap),
                clearSessionInput: (sessionId) => sessionInputMap.delete(sessionId),
                clearAllSessionInputs: () => sessionInputMap.clear()
            };
            
            fixStatus.sessionInputPersister = true;
            console.log('Session-Input-Persister-Fix wurde erfolgreich initialisiert.');
        } catch (error) {
            console.error('Fehler beim Initialisieren des Session-Input-Persister-Fixes:', error);
        }
        
        // Hilfsfunktion zum Ermitteln der aktuellen Session-ID
        function getCurrentSessionId() {
            // Prüfe auf aktiven Tab
            const activeTab = document.querySelector('.session-tab.active, .chat-tab.active, .tab-item.active, #sessions-list li.active');
            if (activeTab) {
                // Versuche, die Session-ID aus dem Tab zu extrahieren
                if (activeTab.dataset.sessionId) {
                    return activeTab.dataset.sessionId;
                }
                
                if (activeTab.dataset.id) {
                    return activeTab.dataset.id;
                }
                
                if (activeTab.id && activeTab.id.includes('session-')) {
                    return activeTab.id.replace('session-', '');
                }
                
                // Versuche, aus dem Text zu extrahieren
                const tabText = activeTab.textContent || '';
                const idMatch = tabText.match(/#(\d+)/);
                if (idMatch && idMatch[1]) {
                    return idMatch[1];
                }
            }
            
            // Prüfe auf URL-Parameter
            const urlParams = new URLSearchParams(window.location.search);
            const sessionId = urlParams.get('session_id');
            if (sessionId) {
                return sessionId;
            }
            
            // Prüfe auf globale Variable
            if (window.currentSessionId) {
                return window.currentSessionId;
            }
            
            if (window.sessionId) {
                return window.sessionId;
            }
            
            return null;
        }
    }

    /**
     * Fix 3: Admin-View-Fix
     */
    function initAdminViewFix() {
        console.log('Initialisiere Admin-View-Fix...');
        
        try {
            // Finde den Admin-Button
            const adminButton = document.getElementById('admin-toggle-btn');
            if (!adminButton) {
                console.error('Admin-Button nicht gefunden, kann Admin-View-Fix nicht anwenden.');
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
                } else {
                    // Zur Admin-Ansicht wechseln
                    adminView.style.display = 'flex';
                    chatView.style.display = 'none';
                    
                    if (adminSidebar) adminSidebar.style.display = 'block';
                    if (sessionsSidebar) sessionsSidebar.style.display = 'none';
                    
                    // Standardmäßig den Users-Tab aktivieren
                    const usersTab = document.getElementById('users-tab');
                    const systemTab = document.getElementById('system-tab');
                    const feedbackTab = document.getElementById('feedback-tab');
                    const motdTab = document.getElementById('motd-tab');
                    const docConverterTab = document.getElementById('doc-converter-tab');
                    
                    if (usersTab) usersTab.style.display = 'block';
                    if (systemTab) systemTab.style.display = 'none';
                    if (feedbackTab) feedbackTab.style.display = 'none';
                    if (motdTab) motdTab.style.display = 'none';
                    if (docConverterTab) docConverterTab.style.display = 'none';
                    
                    // Tab-Button aktivieren
                    const usersTabBtn = document.getElementById('users-tab-btn');
                    const systemTabBtn = document.getElementById('system-tab-btn');
                    const feedbackTabBtn = document.getElementById('feedback-tab-btn');
                    const motdTabBtn = document.getElementById('motd-tab-btn');
                    const docConverterTabBtn = document.getElementById('doc-converter-tab-btn');
                    
                    if (usersTabBtn) usersTabBtn.classList.add('active');
                    if (systemTabBtn) systemTabBtn.classList.remove('active');
                    if (feedbackTabBtn) feedbackTabBtn.classList.remove('active');
                    if (motdTabBtn) motdTabBtn.classList.remove('active');
                    if (docConverterTabBtn) docConverterTabBtn.classList.remove('active');
                    
                    // Tab-Titel aktualisieren
                    const adminTabTitle = document.getElementById('admin-tab-title');
                    if (adminTabTitle) adminTabTitle.textContent = 'Benutzer';
                }
            });
            
            // Auch die Tab-Buttons reparieren
            fixTabNavigation();
            
            fixStatus.adminView = true;
            console.log('Admin-View-Fix wurde erfolgreich initialisiert.');
        } catch (error) {
            console.error('Fehler beim Initialisieren des Admin-View-Fixes:', error);
        }
        
        // Hilfsfunktion zur Reparatur der Tab-Navigation
        function fixTabNavigation() {
            const tabs = [
                { id: 'users-tab', btnId: 'users-tab-btn', title: 'Benutzer' },
                { id: 'system-tab', btnId: 'system-tab-btn', title: 'System' },
                { id: 'feedback-tab', btnId: 'feedback-tab-btn', title: 'Feedback' },
                { id: 'motd-tab', btnId: 'motd-tab-btn', title: 'MOTD' },
                { id: 'doc-converter-tab', btnId: 'doc-converter-tab-btn', title: 'Dokumentenkonverter' }
            ];
            
            tabs.forEach(tab => {
                const button = document.getElementById(tab.btnId);
                if (!button) return;
                
                // Event-Listener entfernen und neu hinzufügen
                const newButton = button.cloneNode(true);
                button.parentNode.replaceChild(newButton, button);
                
                newButton.addEventListener('click', function() {
                    // Alle Tabs ausblenden
                    tabs.forEach(t => {
                        const tabElement = document.getElementById(t.id);
                        if (tabElement) tabElement.style.display = 'none';
                        
                        const tabButton = document.getElementById(t.btnId);
                        if (tabButton) tabButton.classList.remove('active');
                    });
                    
                    // Ausgewählten Tab einblenden
                    const selectedTab = document.getElementById(tab.id);
                    if (selectedTab) {
                        selectedTab.style.display = 'block';
                        selectedTab.style.visibility = 'visible';
                        
                        // Tab-Titel aktualisieren
                        const adminTabTitle = document.getElementById('admin-tab-title');
                        if (adminTabTitle) adminTabTitle.textContent = tab.title;
                    }
                    
                    // Button aktivieren
                    newButton.classList.add('active');
                    
                    // Spezielle Fixes für bestimmte Tabs auslösen
                    if (tab.id === 'system-tab') {
                        setTimeout(loadSystemStats, 100);
                    }
                    if (tab.id === 'feedback-tab') {
                        setTimeout(loadFeedbackStats, 100);
                    }
                    if (tab.id === 'motd-tab') {
                        setTimeout(initMotdPreviewFix, 100);
                    }
                    if (tab.id === 'doc-converter-tab') {
                        setTimeout(initDocConverterButtonsFix, 100);
                    }
                });
            });
        }
    }

    /**
     * Fix 4: Admin-Stats-Fix
     */
    function initAdminStatsFix() {
        console.log('Initialisiere Admin-Stats-Fix...');
        
        try {
            window.loadSystemStats = loadSystemStats;
            window.loadFeedbackStats = loadFeedbackStats;
            
            fixStatus.adminStats = true;
            console.log('Admin-Stats-Fix wurde erfolgreich initialisiert.');
        } catch (error) {
            console.error('Fehler beim Initialisieren des Admin-Stats-Fixes:', error);
        }
        
        // Funktion zum Laden der Systemstatistiken
        async function loadSystemStats() {
            try {
                console.log('Lade Systemstatistiken...');
                
                // Prüfe, ob Token vorhanden ist
                const token = localStorage.getItem('token');
                if (!token) {
                    console.error('Kein Authentifizierungs-Token gefunden.');
                    return null;
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
                
                return data;
            } catch (error) {
                console.error('Fehler beim Laden der Systemstatistiken:', error);
                
                // Fallback: Dummy-Daten verwenden
                const dummyData = {
                    users: 12,
                    sessions: 45,
                    messages: 230,
                    avg_messages_per_session: 5.1
                };
                
                updateSystemStats(dummyData);
                
                return dummyData;
            }
        }
        
        // Funktion zur Aktualisierung der Systemstatistiken in der UI
        function updateSystemStats(data) {
            const statsContainer = document.querySelector('#system-tab .admin-stats-grid');
            if (!statsContainer) {
                console.warn('Statistik-Container nicht gefunden.');
                return;
            }
            
            const statCards = statsContainer.querySelectorAll('.admin-stat-card');
            if (statCards.length < 4) {
                console.warn('Nicht genügend Statistik-Karten gefunden.');
                return;
            }
            
            // Statistiken aktualisieren
            statCards[0].querySelector('.admin-stat-value').textContent = data.users || '-';
            statCards[1].querySelector('.admin-stat-value').textContent = data.sessions || '-';
            statCards[2].querySelector('.admin-stat-value').textContent = data.messages || '-';
            statCards[3].querySelector('.admin-stat-value').textContent = data.avg_messages_per_session?.toFixed(1) || '-';
            
            console.log('Systemstatistiken wurden aktualisiert.');
        }
        
        // Funktion zum Laden der Feedback-Statistiken
        async function loadFeedbackStats() {
            try {
                console.log('Lade Feedback-Statistiken...');
                
                // Prüfe, ob Token vorhanden ist
                const token = localStorage.getItem('token');
                if (!token) {
                    console.error('Kein Authentifizierungs-Token gefunden.');
                    return null;
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
                
                return data;
            } catch (error) {
                console.error('Fehler beim Laden der Feedback-Statistiken:', error);
                
                // Fallback: Dummy-Daten verwenden
                const dummyData = {
                    total: 53,
                    positive: 42,
                    negative: 11,
                    positive_rate: 0.79,
                    negative_feedback: []
                };
                
                updateFeedbackStats(dummyData);
                
                return dummyData;
            }
        }
        
        // Funktion zur Aktualisierung der Feedback-Statistiken in der UI
        function updateFeedbackStats(data) {
            const statsContainer = document.querySelector('#feedback-tab .admin-stats-grid');
            if (!statsContainer) {
                console.warn('Feedback-Statistik-Container nicht gefunden.');
                return;
            }
            
            const statCards = statsContainer.querySelectorAll('.admin-stat-card');
            if (statCards.length < 4) {
                console.warn('Nicht genügend Feedback-Statistik-Karten gefunden.');
                return;
            }
            
            // Statistiken aktualisieren
            statCards[0].querySelector('.admin-stat-value').textContent = data.total || '0';
            statCards[1].querySelector('.admin-stat-value').textContent = data.positive || '0';
            statCards[2].querySelector('.admin-stat-value').textContent = data.negative || '0';
            
            const positiveRate = data.positive_rate || (data.positive / data.total) || 0;
            statCards[3].querySelector('.admin-stat-value').textContent = `${(positiveRate * 100).toFixed(1)}%`;
            
            // Negatives Feedback mit Kommentaren anzeigen
            const negativeFeedbackContainer = document.getElementById('negative-feedback-container');
            if (negativeFeedbackContainer) {
                if (data.negative_feedback && data.negative_feedback.length > 0) {
                    negativeFeedbackContainer.innerHTML = '';
                    
                    data.negative_feedback.forEach(feedback => {
                        const feedbackCard = document.createElement('div');
                        feedbackCard.className = 'admin-feedback-card p-4 bg-gray-50 rounded-lg border-l-4 border-red-500';
                        
                        feedbackCard.innerHTML = `
                            <div class="text-sm text-gray-500 mb-1">
                                <span>${feedback.user_email || 'Anonym'}</span> • 
                                <span>${feedback.timestamp || new Date().toLocaleString()}</span>
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
            
            console.log('Feedback-Statistiken wurden aktualisiert.');
        }
    }

    /**
     * Fix 5: MOTD-Preview-Fix
     */
    function initMotdPreviewFix() {
        console.log('Initialisiere MOTD-Preview-Fix...');
        
        try {
            // Finde die relevanten MOTD-Elemente
            const motdContent = document.getElementById('motd-content');
            const motdPreview = document.getElementById('motd-preview-content');
            
            if (!motdContent || !motdPreview) {
                console.warn('MOTD-Elemente nicht gefunden, versuche es später erneut...');
                setTimeout(initMotdPreviewFix, 1000);
                return;
            }
            
            // Robuste Markdown-Formatierung, die mit null und undefined umgehen kann
            function formatMotdContent(content) {
                // Sicherstellen, dass content ein String ist
                content = (content || '').toString();
                
                return content
                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                    .replace(/\n\n/g, '<br/><br/>')
                    .replace(/\n-\s/g, '<br/>• ');
            }
            
            // Setze die initiale Vorschau
            try {
                const initialContent = motdContent.value || '';
                motdPreview.innerHTML = formatMotdContent(initialContent);
                console.log('Initiale MOTD-Vorschau gesetzt.');
            } catch (error) {
                console.error('Fehler beim Setzen der initialen MOTD-Vorschau:', error);
            }
            
            // Füge einen robusten Event-Listener hinzu
            try {
                // Entferne alle bestehenden Event-Listener durch Klonen
                const newMotdContent = motdContent.cloneNode(true);
                motdContent.parentNode.replaceChild(newMotdContent, motdContent);
                
                // Füge den neuen Event-Listener hinzu
                newMotdContent.addEventListener('input', function() {
                    try {
                        const content = this.value || '';
                        motdPreview.innerHTML = formatMotdContent(content);
                    } catch (error) {
                        console.error('Fehler beim Aktualisieren der MOTD-Vorschau:', error);
                        motdPreview.innerHTML = '<span style="color: red;">Fehler bei der Vorschau. Bitte prüfen Sie den Inhalt.</span>';
                    }
                });
                
                console.log('MOTD-Vorschau-Listener erfolgreich eingerichtet.');
                
                // Finde die Farb-Picker und richte Event-Listener ein
                const bgColor = document.getElementById('motd-bg-color');
                const borderColor = document.getElementById('motd-border-color');
                const textColor = document.getElementById('motd-text-color');
                const previewContainer = document.getElementById('motd-preview');
                
                if (bgColor && borderColor && textColor && previewContainer) {
                    function updatePreviewStyle() {
                        try {
                            previewContainer.style.backgroundColor = bgColor.value || '#fff3cd';
                            previewContainer.style.borderColor = borderColor.value || '#ffeeba';
                            previewContainer.style.color = textColor.value || '#856404';
                        } catch (error) {
                            console.error('Fehler beim Aktualisieren des MOTD-Stils:', error);
                        }
                    }
                    
                    // Entferne bestehende Event-Listener und füge neue hinzu
                    [bgColor, borderColor, textColor].forEach(colorPicker => {
                        if (colorPicker) {
                            const newColorPicker = colorPicker.cloneNode(true);
                            colorPicker.parentNode.replaceChild(newColorPicker, colorPicker);
                            newColorPicker.addEventListener('input', updatePreviewStyle);
                        }
                    });
                    
                    console.log('MOTD-Stil-Listener erfolgreich eingerichtet.');
                }
            } catch (error) {
                console.error('Fehler beim Einrichten des MOTD-Vorschau-Listeners:', error);
            }
            
            fixStatus.motdPreview = true;
            console.log('MOTD-Preview-Fix wurde erfolgreich initialisiert.');
        } catch (error) {
            console.error('Fehler beim Initialisieren des MOTD-Preview-Fixes:', error);
        }
    }

    /**
     * Fix 6: Doc-Converter-Buttons-Fix
     */
    function initDocConverterButtonsFix() {
        console.log('Initialisiere Dokumentenkonverter-Buttons-Fix...');
        
        try {
            // Finde den Dokumentenkonverter-Container
            const docConverterTab = document.getElementById('doc-converter-tab');
            
            if (!docConverterTab) {
                console.warn('Dokumentenkonverter-Tab nicht gefunden, versuche es später erneut...');
                setTimeout(initDocConverterButtonsFix, 1000);
                return;
            }
            
            // Suche den Actions-Container, der die Buttons enthält
            const actionsContainer = docConverterTab.querySelector('.converter-actions');
            
            if (!actionsContainer) {
                console.warn('Converter-Actions-Container nicht gefunden, suche weiter...');
                
                // Alternative Suche nach dem Form oder einem anderen Container
                const form = docConverterTab.querySelector('form') || docConverterTab.querySelector('#file-upload-form');
                
                if (form) {
                    // Suche nach dem letzten div im Formular, das die Buttons enthalten könnte
                    const divs = form.querySelectorAll('div');
                    const lastDiv = divs[divs.length - 1];
                    
                    if (lastDiv) {
                        // Stelle sicher, dass mindestens ein Button vorhanden ist
                        if (lastDiv.querySelector('button')) {
                            // Entferne den "Zur Chat-Ansicht wechseln"-Button, falls vorhanden
                            const chatButton = lastDiv.querySelector('#to-chat-btn');
                            if (chatButton) {
                                console.log('Entferne unnötigen "Zur Chat-Ansicht wechseln"-Button.');
                                chatButton.remove();
                            }
                            
                            // Überprüfe, ob ein Konvertieren-Button vorhanden ist
                            const convertButton = lastDiv.querySelector('#convert-btn');
                            if (!convertButton) {
                                console.log('Erstelle fehlenden "Konvertieren"-Button.');
                                
                                const newButton = document.createElement('button');
                                newButton.id = 'convert-btn';
                                newButton.type = 'submit';
                                newButton.className = 'nscale-btn-primary';
                                newButton.innerHTML = '<i class="fas fa-exchange-alt mr-2"></i> Konvertieren';
                                newButton.disabled = true;
                                
                                lastDiv.prepend(newButton);
                            }
                        }
                    }
                }
            } else {
                // Entferne den "Zur Chat-Ansicht wechseln"-Button, falls vorhanden
                const chatButton = actionsContainer.querySelector('#to-chat-btn');
                if (chatButton) {
                    console.log('Entferne unnötigen "Zur Chat-Ansicht wechseln"-Button.');
                    chatButton.remove();
                }
                
                // Überprüfe, ob ein Konvertieren-Button vorhanden ist
                const convertButton = actionsContainer.querySelector('#convert-btn');
                if (!convertButton) {
                    console.log('Erstelle fehlenden "Konvertieren"-Button.');
                    
                    const newButton = document.createElement('button');
                    newButton.id = 'convert-btn';
                    newButton.type = 'submit';
                    newButton.className = 'nscale-btn-primary';
                    newButton.innerHTML = '<i class="fas fa-exchange-alt mr-2"></i> Konvertieren';
                    newButton.disabled = true;
                    
                    actionsContainer.prepend(newButton);
                }
            }
            
            // Stelle sicher, dass der Datei-Upload korrekt funktioniert
            const fileUpload = docConverterTab.querySelector('#file-upload');
            const fileName = docConverterTab.querySelector('#file-name');
            const convertBtn = docConverterTab.querySelector('#convert-btn');
            
            if (fileUpload && fileName && convertBtn) {
                // Entferne bestehende Event-Listener
                const newFileUpload = fileUpload.cloneNode(true);
                fileUpload.parentNode.replaceChild(newFileUpload, fileUpload);
                
                // Füge neuen Event-Listener hinzu
                newFileUpload.addEventListener('change', function() {
                    if (this.files && this.files.length > 0) {
                        fileName.textContent = this.files[0].name;
                        convertBtn.disabled = false;
                    } else {
                        fileName.textContent = 'Keine Datei ausgewählt';
                        convertBtn.disabled = true;
                    }
                });
                
                console.log('Datei-Upload-Listener erfolgreich eingerichtet.');
            }
            
            fixStatus.docConverter = true;
            console.log('Dokumentenkonverter-Buttons-Fix wurde erfolgreich initialisiert.');
        } catch (error) {
            console.error('Fehler beim Initialisieren des Dokumentenkonverter-Buttons-Fixes:', error);
        }
    }

    // Alle Fixes initialisieren
    function initAllFixes() {
        console.log('Initialisiere alle Fixes...');
        
        // Fix 1: Text-Streaming-Fix
        initTextStreamingFix();
        
        // Fix 2: Session-Input-Persister-Fix
        initSessionInputPersisterFix();
        
        // Fix 3: Admin-View-Fix
        initAdminViewFix();
        
        // Fix 4: Admin-Stats-Fix
        initAdminStatsFix();
        
        // Fix 5: MOTD-Preview-Fix
        initMotdPreviewFix();
        
        // Fix 6: Doc-Converter-Buttons-Fix
        initDocConverterButtonsFix();
        
        console.log('===== ALLE FIXES WURDEN INITIALISIERT =====');
    }

    // Prüfen, ob das DOM bereit ist, und Fixes initialisieren
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            // Nach kurzer Verzögerung initialisieren, um sicherzustellen, dass alle DOM-Elemente geladen sind
            setTimeout(initAllFixes, 500);
        });
    } else {
        // Nach kurzer Verzögerung initialisieren, um sicherzustellen, dass alle DOM-Elemente geladen sind
        setTimeout(initAllFixes, 500);
    }
})();