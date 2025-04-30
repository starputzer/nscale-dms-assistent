import { setupChat } from './chat.js';
import { setupFeedback } from './feedback.js';
import { setupAdmin } from './admin.js';
import { setupSettings } from './settings.js';
import { setupSourceReferences } from './source-references.js';

const { createApp, ref, onMounted, watch, nextTick } = Vue;

createApp({
    setup() {
        // Authentication state
        const token = ref(localStorage.getItem('token') || '');
        const email = ref('');
        const password = ref('');
        const authMode = ref('login');
        const loading = ref(false);
        const errorMessage = ref('');
        const successMessage = ref('');
        
        // Chat state
        const sessions = ref([]);
        const currentSessionId = ref(null);
        const messages = ref([]);
        const question = ref('');
        const isLoading = ref(false);
        const chatMessages = ref(null);
        const isStreaming = ref(false);
        const eventSource = ref(null);
        
        // Ansichts-State
        const activeView = ref('chat'); // 'chat' oder 'admin'
        
        // Benutzerrolle
        const userRole = ref('user');

        // Feedback state
        const showFeedbackDialog = ref(false);
        const feedbackComment = ref('');
        const feedbackMessage = ref(null);
        
        // MOTD state
        const motd = ref(null);
        const motdDismissed = ref(localStorage.getItem('motdDismissed') === 'true' || false);

        // MOTD Farbpaletten
        const colorThemes = {
            warning: {
                backgroundColor: '#fff3cd',
                borderColor: '#ffeeba',
                textColor: '#856404'
            },
            info: {
                backgroundColor: '#e1ecf8',
                borderColor: '#bee5eb',
                textColor: '#0c5460'
            },
            success: {
                backgroundColor: '#e0f5ea',
                borderColor: '#c3e6cb',
                textColor: '#155724'
            },
            danger: {
                backgroundColor: '#f8d7da',
                borderColor: '#f5c6cb',
                textColor: '#721c24'
            },
            neutral: {
                backgroundColor: '#f8f9fa',
                borderColor: '#dee2e6',
                textColor: '#495057'
            }
        };
        
        // Ausgewähltes Farbthema
        const selectedColorTheme = ref('warning');
        
        // Session-Persistenz-Funktionen
        const saveCurrentSessionToStorage = (sessionId) => {
            if (sessionId) {
                localStorage.setItem('lastActiveSession', sessionId);
                console.log(`Aktuelle Session ${sessionId} im localStorage gespeichert`);
            }
        };

        const restoreLastActiveSession = async () => {
            try {
                const lastSessionId = localStorage.getItem('lastActiveSession');
                
                if (lastSessionId && sessions.value.length > 0) {
                    // Prüfen, ob die Session noch existiert
                    const sessionExists = sessions.value.some(session => session.id === parseInt(lastSessionId));
                    
                    if (sessionExists) {
                        console.log(`Lade zuletzt aktive Session ${lastSessionId} aus localStorage`);
                        await loadSession(parseInt(lastSessionId));
                        return true;
                    } else {
                        console.log(`Zuletzt aktive Session ${lastSessionId} existiert nicht mehr`);
                        localStorage.removeItem('lastActiveSession');
                    }
                }
            } catch (error) {
                console.error('Fehler beim Wiederherstellen der letzten Session:', error);
            }
            
            return false;
        };
        
        // Setup axios with auth header
        const setupAxios = () => {
            axios.defaults.headers.common['Authorization'] = token.value ? `Bearer ${token.value}` : '';
        };
        
        // Auth functions
        const login = async () => {
            try {
                loading.value = true;
                errorMessage.value = '';
                
                const response = await axios.post('/api/auth/login', {
                    email: email.value,
                    password: password.value
                });
                
                token.value = response.data.token;
                localStorage.setItem('token', token.value);
                setupAxios();
                
                // Clear form
                email.value = '';
                password.value = '';
                
                // Benutzerrolle laden
                await adminFunctions.loadUserRole();
                
                // Load sessions
                loadSessions();
            } catch (error) {
                errorMessage.value = error.response?.data?.detail || 'Anmeldefehler. Bitte versuchen Sie es erneut.';
            } finally {
                loading.value = false;
            }
        };
        
        const register = async () => {
            try {
                loading.value = true;
                errorMessage.value = '';
                
                await axios.post('/api/auth/register', {
                    email: email.value,
                    password: password.value
                });
                
                // Switch to login after successful registration
                authMode.value = 'login';
                successMessage.value = 'Registrierung erfolgreich. Bitte melden Sie sich an.';
                
                // Clear form
                email.value = '';
                password.value = '';
            } catch (error) {
                errorMessage.value = error.response?.data?.detail || 'Registrierungsfehler. Bitte versuchen Sie es erneut.';
            } finally {
                loading.value = false;
            }
        };
        
        const resetPassword = async () => {
            try {
                loading.value = true;
                errorMessage.value = '';
                successMessage.value = '';
                
                const response = await axios.post('/api/auth/reset-password', {
                    email: email.value
                });
                
                successMessage.value = response.data.message;
                
                // In a real app, the user would receive an email with the token
                // For this example, we'll show the token directly
                if (response.data.token) {
                    successMessage.value += ` Token: ${response.data.token}`;
                }
            } catch (error) {
                errorMessage.value = error.response?.data?.detail || 'Fehler beim Zurücksetzen des Passworts.';
            } finally {
                loading.value = false;
            }
        };
        
        const logout = () => {
            token.value = '';
            localStorage.removeItem('token');
            setupAxios();
            currentSessionId.value = null;
            sessions.value = [];
            messages.value = [];
            userRole.value = 'user';
            activeView.value = 'chat';
            localStorage.removeItem('lastActiveSession');
            
            // EventSource schließen, falls vorhanden
            if (eventSource.value) {
                eventSource.value.close();
                eventSource.value = null;
            }
        };
        
        // Session handling with improved persistence
        const loadSession = async (sessionId) => {
            try {
                isLoading.value = true;
                console.log(`Lade Session ${sessionId}...`);
                
                const response = await axios.get(`/api/session/${sessionId}`);
                currentSessionId.value = sessionId;
                
                // Session im localStorage speichern für Persistenz nach Reload
                saveCurrentSessionToStorage(sessionId);
                
                // Nachrichten setzen
                messages.value = response.data.messages;
                
                // MOTD-Logik: Wenn bereits Nachrichten existieren, MOTD ausblenden
                if (messages.value && messages.value.length > 0) {
                    console.log(`Session ${sessionId} hat ${messages.value.length} Nachrichten - MOTD wird ausgeblendet`);
                    motdDismissed.value = true;
                    localStorage.setItem('motdDismissed', 'true');
                } else {
                    console.log(`Session ${sessionId} hat keine Nachrichten - MOTD wird angezeigt`);
                    motdDismissed.value = false;
                    localStorage.removeItem('motdDismissed');
                }
                
                // Feedback für jede Assistenten-Nachricht laden
                for (const message of messages.value) {
                    if (!message.is_user && message.id) {
                        await feedbackFunctions.loadMessageFeedback(message.id);
                    }
                }
                
                // Zur Chat-Ansicht wechseln
                activeView.value = 'chat';
                
                // Scroll to bottom after messages load
                await nextTick();
                scrollToBottom();
            } catch (error) {
                console.error('Error loading session:', error);
            } finally {
                isLoading.value = false;
            }
        };
        
        // Verbesserte loadSessions Funktion mit automatischer Aktualisierung
        const loadSessions = async () => {
            try {
                const response = await axios.get('/api/sessions');
                
                // Tiefe Kopie erstellen, um Reaktivität sicherzustellen
                const newSessions = JSON.parse(JSON.stringify(response.data.sessions));
                
                // Prüfen, ob sich die Titel geändert haben
                let titlesChanged = false;
                if (sessions.value.length > 0 && newSessions.length === sessions.value.length) {
                    for (let i = 0; i < sessions.value.length; i++) {
                        if (sessions.value[i].title !== newSessions[i].title) {
                            titlesChanged = true;
                            console.log(`Titel für Session ${sessions.value[i].id} hat sich geändert: "${sessions.value[i].title}" -> "${newSessions[i].title}"`);
                            break;
                        }
                    }
                } else {
                    titlesChanged = true;
                }
                
                // Nur aktualisieren, wenn sich etwas geändert hat
                if (titlesChanged || sessions.value.length !== newSessions.length) {
                    console.log("Sessions wurden aktualisiert");
                    sessions.value = newSessions;
                }
            } catch (error) {
                console.error('Error loading sessions:', error);
            }
        };
        
        const startNewSession = async () => {
            try {
                // MOTD für neue Unterhaltungen zurücksetzen
                motdDismissed.value = false;
                localStorage.removeItem('motdDismissed');

                isLoading.value = true;
                const response = await axios.post('/api/session', {
                    title: "Neue Unterhaltung"
                });
                
                await loadSessions();
                await loadSession(response.data.session_id);
                
                // Zur Chat-Ansicht wechseln
                activeView.value = 'chat';
            } catch (error) {
                console.error('Error starting new session:', error);
            } finally {
                isLoading.value = false;
            }
        };
        
        const deleteSession = async (sessionId) => {
            if (!confirm('Möchten Sie diese Unterhaltung wirklich löschen?')) {
                return;
            }
            
            try {
                await axios.delete(`/api/session/${sessionId}`);
                
                if (currentSessionId.value === sessionId) {
                    currentSessionId.value = null;
                    messages.value = [];
                    // Entferne auch aus dem localStorage
                    localStorage.removeItem('lastActiveSession');
                }
                
                await loadSessions();
            } catch (error) {
                console.error('Error deleting session:', error);
            }
        };
        
        const formatMessage = (text) => {
            return marked.parse(text);
        };
        
        const scrollToBottom = () => {
            if (chatMessages.value) {
                chatMessages.value.scrollTop = chatMessages.value.scrollHeight;
            }
        };
        
        /**
         * Aktualisiert den Titel einer bestimmten Session
         * @param {number} sessionId - Die ID der zu aktualisierenden Session
         * @returns {boolean} - Erfolg der Aktualisierung
         */
        const updateSessionTitle = async (sessionId) => {
            if (!sessionId) {
                console.warn("Keine Session-ID zum Aktualisieren angegeben");
                return false;
            }
            
            try {
                console.log(`Titel für Session ${sessionId} wird aktualisiert...`);
                
                const response = await axios.post(`/api/session/${sessionId}/update-title`);
                
                if (response.data && response.data.new_title) {
                    console.log(`Session ${sessionId} Titel aktualisiert zu: "${response.data.new_title}"`);
                    
                    // Aktualisiere auch die Session-Liste
                    await loadSessions();
                    return true;
                } else {
                    console.warn("Keine neue Titel-Information vom Server erhalten");
                    return false;
                }
            } catch (error) {
                console.error(`Fehler beim Aktualisieren des Titels für Session ${sessionId}:`, error);
                return false;
            }
        };

        /**
         * Aktualisiert alle Sitzungen (kann als regelmäßiger Job verwendet werden)
         */
        const updateAllSessionTitles = async () => {
            if (!sessions.value || sessions.value.length === 0) {
                console.log("Keine Sessions zum Aktualisieren vorhanden");
                return;
            }
            
            try {
                // Lade die aktuelle Session-Liste
                await loadSessions();
                
                // Beginne mit der aktuellen Session, falls vorhanden
                if (currentSessionId.value) {
                    await updateSessionTitle(currentSessionId.value);
                }
                
                console.log("Alle Session-Titel wurden aktualisiert");
            } catch (error) {
                console.error("Fehler beim Aktualisieren aller Session-Titel:", error);
            }
        };
        
        /**
         * Lädt die aktuelle Session neu (für Feedback-Funktionalität)
         */
        const reloadCurrentSession = async () => {
            if (currentSessionId.value) {
                try {
                    console.log(`Lade aktuelle Session ${currentSessionId.value} neu...`);
                    await loadSession(currentSessionId.value);
                    return true;
                } catch (error) {
                    console.error('Fehler beim Neuladen der aktuellen Session:', error);
                    return false;
                }
            }
            return false;
        };
        
        // MOTD-Funktionen
        const dismissMotd = () => {
            motdDismissed.value = true;
            localStorage.setItem('motdDismissed', 'true');
        };
        
        const formatMotdContent = (content) => {
            if (!content) return '';
            
            // Einfache Markdown-Formatierung
            return content
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\n\n/g, '<br/><br/>')
                .replace(/\n-\s/g, '<br/>• ');
        };
        
        // Farbthema für MOTD anwenden
        const applyColorTheme = () => {
            if (selectedColorTheme.value !== 'custom' && colorThemes[selectedColorTheme.value]) {
                const theme = colorThemes[selectedColorTheme.value];
                motdConfig.value.style.backgroundColor = theme.backgroundColor;
                motdConfig.value.style.borderColor = theme.borderColor;
                motdConfig.value.style.textColor = theme.textColor;
            }
        };
        
        // Initialize chat functionality
        const chatFunctions = setupChat({
            token,
            messages,
            question,
            currentSessionId,
            isLoading,
            isStreaming,
            eventSource,
            scrollToBottom,
            nextTick,
            loadSessions,
            motdDismissed
        });
        
        // Initialize feedback functionality
        const feedbackFunctions = setupFeedback({
            messages,
            currentSessionId,
            showFeedbackDialog,
            feedbackComment,
            feedbackMessage
        });
        
        // Initialize admin functionality
        const adminFunctions = setupAdmin({
            token,
            userRole,
            isLoading
        });
        
        // Initialize settings functionality
        const settingsFunction = setupSettings({
            token
        });
        
        // Initialize source references functionality
        const sourceReferences = setupSourceReferences({
            token,
            messages,
            isLoading
        });
        
        // Extrahiere die toggleSettings-Funktion aus dem settingsFunction-Objekt
        const { toggleSettings } = settingsFunction;
        
        // UI-Navigation Funktionen
        // Aktualisierte toggleView Funktion - Öffnet Barrierefreiheitseinstellungen für alle Benutzer
        const toggleView = () => {
            // Das Zahnrad-Symbol unten öffnet für alle Benutzer die Barrierefreiheitseinstellungen
            toggleSettings();
        };

        // Neue Funktion - Wechselt für Admins zum Admin-Bereich
        const toggleAdminView = () => {
            if (userRole.value === 'admin') {
                // Wechsel zwischen Chat und Admin
                activeView.value = activeView.value === 'chat' ? 'admin' : 'chat';
            }
        };
        
        // Hilfsfunktion für admin Tab-Titel
        const getAdminTabTitle = () => {
            switch(adminFunctions.adminTab.value) {
                case 'users': return 'Benutzerverwaltung';
                case 'system': return 'Systemüberwachung';
                case 'docConverter': return 'Dokumenten-Konvertierung'
                case 'feedback': return 'Feedback-Analyse';
                case 'motd': return 'Message of the Day';
                default: return 'Administration';
            }
        };
        
        // Laden der MOTD
        const loadMotd = async () => {
            try {
                const response = await axios.get('/api/motd');
                motd.value = response.data;
                console.log("MOTD geladen:", motd.value);
                
                // Determine color theme based on current MOTD colors
                if (motd.value && motd.value.style) {
                    // Find matching theme or set to custom
                    let matchFound = false;
                    for (const [theme, colors] of Object.entries(colorThemes)) {
                        if (colors.backgroundColor === motd.value.style.backgroundColor) {
                            selectedColorTheme.value = theme;
                            matchFound = true;
                            break;
                        }
                    }
                    if (!matchFound) {
                        selectedColorTheme.value = 'custom';
                    }
                }
            } catch (error) {
                console.error('Fehler beim Laden der MOTD:', error);
            }
        };
        
        // Neue Funktion für die Formatierung von Nachrichten mit Quellenhervorhebung
        const formatMessageWithSources = (text) => {
            if (!text) return '';
            
            // Prüfen, ob die Nachricht Quellenverweise enthält
            if (sourceReferences.hasSourceReferences(text)) {
                // Wenn ja, mit Quellenhervorhebung formatieren
                const formattedText = sourceReferences.formatMessageWithSourceHighlighting(text);
                return marked.parse(formattedText);
            } else {
                // Wenn nicht, normale Formatierung verwenden
                return formatMessage(text);
            }
        };
        
        // Event-Listener für Seiten-Reload
        window.addEventListener('beforeunload', () => {
            // Aktuelle Session speichern, bevor die Seite neu geladen wird
            if (currentSessionId.value) {
                saveCurrentSessionToStorage(currentSessionId.value);
            }
        });
        
        // Initialize
        onMounted(async () => {
            setupAxios();
            
            if (token.value) {
                await loadSessions();
                
                // Benutzerrolle laden
                await adminFunctions.loadUserRole();
                
                // Versuche, die letzte aktive Session wiederherzustellen
                await restoreLastActiveSession();
            }
            
            // MOTD laden (auch wenn nicht eingeloggt)
            loadMotd();
            
            // Session neu laden Funktion global verfügbar machen
            window.reloadCurrentSession = reloadCurrentSession;
            
            // HINZUGEFÜGT: Mache die Session-Titel-Update-Funktionen global verfügbar
            window.updateSessionTitle = updateSessionTitle;
            window.updateAllSessionTitles = updateAllSessionTitles;
            
            // Automatische Session-Aktualisierung alle 10 Sekunden
            setInterval(async () => {
                if (token.value && activeView.value === 'chat') {
                    await loadSessions();
                }
            }, 10000);
            
            // HINZUGEFÜGT: Regelmäßige Aktualisierung der Sitzungstitel
            setInterval(async () => {
                if (token.value && activeView.value === 'chat' && currentSessionId.value) {
                    // Versuche die aktuelle Session zu aktualisieren
                    if (window.updateSessionTitle && typeof window.updateSessionTitle === 'function') {
                        try {
                            await window.updateSessionTitle(currentSessionId.value);
                        } catch (e) {
                            console.error("Fehler bei der planmäßigen Titelaktualisierung:", e);
                        }
                    }
                }
            }, 30000); // Alle 30 Sekunden
            
            // Clear messages when auth state changes
            watch(token, (newValue) => {
                if (!newValue) {
                    messages.value = [];
                    currentSessionId.value = null;
                    userRole.value = 'user';
                    activeView.value = 'chat';
                    localStorage.removeItem('lastActiveSession');
                } else {
                    // Wenn sich der Token ändert (z.B. nach Login), Benutzerrolle laden
                    adminFunctions.loadUserRole();
                }
            });
            
            // Clear error message when auth mode changes
            watch(authMode, () => {
                errorMessage.value = '';
                successMessage.value = '';
            });
            
            // EventSource bereinigen, wenn die Komponente zerstört wird
            window.addEventListener('beforeunload', () => {
                if (eventSource.value) {
                    eventSource.value.close();
                }
            });
            
            // Stellen Sie die loadMotd-Funktion global zur Verfügung
            window.loadMotd = loadMotd;
        });
        
        return {
            // Auth state
            token,
            email,
            password,
            authMode,
            loading,
            errorMessage,
            successMessage,
            
            // Auth functions
            login,
            register,
            resetPassword,
            logout,
            
            // View state
            activeView,
            
            // Chat state
            sessions,
            currentSessionId,
            messages,
            question,
            isLoading,
            chatMessages,
            isStreaming,
            
            // Chat functions
            loadSessions,
            loadSession,
            startNewSession,
            deleteSession,
            formatMessage,
            scrollToBottom,
            
            // Session persistence
            saveCurrentSessionToStorage,
            restoreLastActiveSession,
            
            // Chat streaming functionality
            ...chatFunctions,
            
            // Feedback functionality
            ...feedbackFunctions,
            showFeedbackDialog,
            feedbackComment,
            
            // Admin functionality
            ...adminFunctions,
            userRole,
            getAdminTabTitle,
            toggleView,
            toggleAdminView,
            
            // Settings functionality
            ...settingsFunction,
            
            // Quellenreferenzen
            ...sourceReferences,
            formatMessageWithSources,
            
            // MOTD
            motd,
            motdDismissed,
            loadMotd,
            dismissMotd,
            formatMotdContent,
            
            // MOTD Editor
            selectedColorTheme,
            applyColorTheme,
            
            // Session title functionality
            updateSessionTitle,
            updateAllSessionTitles,
            reloadCurrentSession
        };
    }
}).mount('#app');