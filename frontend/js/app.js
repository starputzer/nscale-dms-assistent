import { setupChat } from './chat.js';
import { setupFeedback } from './feedback.js';

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

        // Feedback state
        const showFeedbackDialog = ref(false);
        const feedbackComment = ref('');
        const feedbackMessage = ref(null);

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
                sessions.value = response.data.sessions;
            } catch (error) {
                console.error('Error loading sessions:', error);
            }
        };
        
        const startNewSession = async () => {
            try {
                isLoading.value = true;
                const response = await axios.post('/api/session', {
                    title: "Neue Unterhaltung"
                });
                
                await loadSessions();
                await loadSession(response.data.session_id);
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
            nextTick
        });
        
        // Initialize feedback functionality
        const feedbackFunctions = setupFeedback({
            messages,
            currentSessionId,
            showFeedbackDialog,
            feedbackComment,
            feedbackMessage
        });
        
        // Session handling with feedback support
        const loadSession = async (sessionId) => {
            try {
                isLoading.value = true;
                const response = await axios.get(`/api/session/${sessionId}`);
                currentSessionId.value = sessionId;
                messages.value = response.data.messages;
                
                // Feedback für jede Assistenten-Nachricht laden
                for (const message of messages.value) {
                    if (!message.is_user && message.id) {
                        await feedbackFunctions.loadMessageFeedback(message.id);
                    }
                }
                
                // Scroll to bottom after messages load
                await nextTick();
                scrollToBottom();
            } catch (error) {
                console.error('Error loading session:', error);
            } finally {
                isLoading.value = false;
            }
        };
        
        // Initialize
        onMounted(() => {
            setupAxios();
            
            if (token.value) {
                loadSessions();
            }
            
            // Clear messages when auth state changes
            watch(token, (newValue) => {
                if (!newValue) {
                    messages.value = [];
                    currentSessionId.value = null;
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
            feedbackComment
        };
    }
}).mount('#app');