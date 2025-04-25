import { setupChat } from './chat.js';
import { setupFeedback } from './feedback.js';
import { setupAdmin } from './admin.js';
import { setupSettings } from './settings.js';

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
        const motdDismissed = ref(false);

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
            
            // EventSource schließen, falls vorhanden
            if (eventSource.value) {
                eventSource.value.close();
                eventSource.value = null;
            }
        };
        
        // Session management
        const loadSessions = async () => {
            try {
                const response = await axios.get('/api/sessions');
                sessions.value = [...response.data.sessions];
                console.log("Sessions neu geladen:", sessions.value);
            } catch (error) {
                console.error('Error loading sessions:', error);
            }
        };
        
        const startNewSession = async () => {
            try {
                // MOTD für neue Unterhaltungen zurücksetzen
                motdDismissed.value = false;

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
        
        // MOTD-Funktionen
        const dismissMotd = () => {
            motdDismissed.value = true;
            //localStorage.setItem('motdDismissed', 'true');
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
            motdDismissed  // Übergebe motdDismissed an setupChat
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
        
        /**
         * Lädt eine vorhandene Chat-Session und behandelt MOTD und Feedback
         * @param {number} sessionId - Die ID der zu ladenden Session
         */
        const loadSession = async (sessionId) => {
            try {
                isLoading.value = true;
                console.log(`Lade Session ${sessionId}...`);
                
                const response = await axios.get(`/api/session/${sessionId}`);
                currentSessionId.value = sessionId;
                
                // Nachrichten setzen
                messages.value = response.data.messages;
                
                // MOTD-Logik: Wenn bereits Nachrichten existieren, MOTD ausblenden
                if (messages.value && messages.value.length > 0) {
                    console.log(`Session ${sessionId} hat ${messages.value.length} Nachrichten - MOTD wird ausgeblendet`);
                    motdDismissed.value = true;
                } else {
                    console.log(`Session ${sessionId} hat keine Nachrichten - MOTD wird angezeigt`);
                    motdDismissed.value = false;
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
                
        // Watch-Funktion für Admin-Panel-Tabs
        watch([adminFunctions.adminTab], ([tab]) => {
            if (activeView.value === 'admin' && userRole.value === 'admin') {
                if (tab === 'users') {
                    adminFunctions.loadUsers();
                } else if (tab === 'system') {
                    adminFunctions.loadSystemStats();
                } else if (tab === 'feedback') {
                    adminFunctions.loadFeedbackStats();
                    adminFunctions.loadNegativeFeedback();
                } else if (tab === 'motd') {
                    adminFunctions.loadMotdConfig();
                }
            }
        });
        
        // Watch für die aktive Ansicht
        watch(activeView, (newView) => {
            if (newView === 'admin' && userRole.value === 'admin') {
                adminFunctions.loadSystemStats();
                adminFunctions.loadUsers();
            }
        });

        // Watch für Sitzungswechsel
        watch(currentSessionId, (newSessionId) => {
            if (newSessionId) {
                // Wenn der Benutzer Sitzungen wechselt, MOTD-Status aus der Sitzung erhalten
                // Wird jetzt in loadSession behandelt
                console.log("Sitzungswechsel erkannt:", newSessionId);
            }
        });
        
        // Initialize
        onMounted(() => {
            setupAxios();
            
            if (token.value) {
                loadSessions();
                // Benutzerrolle laden
                adminFunctions.loadUserRole();
            }
            
            // MOTD laden (auch wenn nicht eingeloggt)
            loadMotd();
            
            // Clear messages when auth state changes
            watch(token, (newValue) => {
                if (!newValue) {
                    messages.value = [];
                    currentSessionId.value = null;
                    userRole.value = 'user';
                    activeView.value = 'chat';
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
            
            // MOTD
            motd,
            motdDismissed,
            loadMotd,
            dismissMotd,
            formatMotdContent,
            
            // MOTD Editor
            selectedColorTheme,
            applyColorTheme
        };
    }
}).mount('#app');