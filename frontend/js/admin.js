/**
 * Stellt die Admin-Funktionalität bereit
 * @param {Object} options - Konfigurationsoptionen
 * @returns {Object} - Admin-Funktionen und -Zustand
 */
export function setupAdmin(options) {
    const {
        token,
        userRole,
        isLoading
    } = options;
    
    // Admin-State (Vue Reactive Referenzen)
    const showAdminPanel = Vue.ref(false);
    const adminTab = Vue.ref('users');
    const adminUsers = Vue.ref([]);
    const newUser = Vue.ref({ email: '', password: '', role: 'user' });
    const systemStats = Vue.ref({});
    const feedbackStats = Vue.ref({});
    const negativeFeedback = Vue.ref([]);
    
    /**
     * Lädt die Benutzerrolle vom Server
     */
    const loadUserRole = async () => {
        try {
            if (token.value) {
                console.log("Token vorhanden, lade Benutzerrolle...");
                const response = await axios.get('/api/user/role');
                console.log("Server-Antwort:", response.data);
                userRole.value = response.data.role;
                console.log(`Benutzerrolle geladen: ${userRole.value}`);
            }
        } catch (error) {
            console.error('Fehler beim Laden der Benutzerrolle:', error);
            userRole.value = 'user'; // Fallback zur Standardrolle
        }
    };
    
    /**
     * Lädt alle Benutzer (nur für Administratoren)
     */
    const loadUsers = async () => {
        try {
            if (userRole.value === 'admin') {
                isLoading.value = true;
                const response = await axios.get('/api/admin/users');
                adminUsers.value = response.data.users;
            }
        } catch (error) {
            console.error('Fehler beim Laden der Benutzer:', error);
        } finally {
            isLoading.value = false;
        }
    };
    
    /**
     * Erstellt einen neuen Benutzer (nur für Administratoren)
     */
    const createUser = async () => {
        try {
            if (userRole.value === 'admin') {
                isLoading.value = true;
                await axios.post('/api/admin/users', newUser.value);
                await loadUsers();
                // Formular zurücksetzen
                newUser.value = { email: '', password: '', role: 'user' };
            }
        } catch (error) {
            console.error('Fehler beim Erstellen des Benutzers:', error);
        } finally {
            isLoading.value = false;
        }
    };
    
    /**
     * Aktualisiert die Rolle eines Benutzers (nur für Administratoren)
     */
    const updateUserRole = async (userId, newRole) => {
        try {
            if (userRole.value === 'admin') {
                isLoading.value = true;
                await axios.put(`/api/admin/users/${userId}/role`, { role: newRole });
                await loadUsers();
            }
        } catch (error) {
            console.error('Fehler beim Aktualisieren der Benutzerrolle:', error);
        } finally {
            isLoading.value = false;
        }
    };
    
    /**
     * Löscht einen Benutzer (nur für Administratoren)
     */
    const deleteUser = async (userId) => {
        try {
            if (userRole.value === 'admin' && confirm('Möchten Sie diesen Benutzer wirklich löschen?')) {
                isLoading.value = true;
                await axios.delete(`/api/admin/users/${userId}`);
                await loadUsers();
            }
        } catch (error) {
            console.error('Fehler beim Löschen des Benutzers:', error);
        } finally {
            isLoading.value = false;
        }
    };
    
    /**
     * Lädt Systemstatistiken (nur für Administratoren)
     */
    const loadSystemStats = async () => {
        try {
            if (userRole.value === 'admin') {
                isLoading.value = true;
                const response = await axios.get('/api/admin/stats');
                systemStats.value = response.data.stats;
            }
        } catch (error) {
            console.error('Fehler beim Laden der Systemstatistiken:', error);
        } finally {
            isLoading.value = false;
        }
    };
    
    /**
     * Lädt Feedback-Statistiken
     */
    const loadFeedbackStats = async () => {
        try {
            if (userRole.value === 'admin') {
                isLoading.value = true;
                const response = await axios.get('/api/admin/feedback/stats');
                feedbackStats.value = response.data.stats;
            }
        } catch (error) {
            console.error('Fehler beim Laden der Feedback-Statistiken:', error);
        } finally {
            isLoading.value = false;
        }
    };
    
    /**
     * Lädt negatives Feedback mit Kommentaren
     */
    const loadNegativeFeedback = async () => {
        try {
            if (userRole.value === 'admin') {
                isLoading.value = true;
                const response = await axios.get('/api/admin/feedback/negative');
                negativeFeedback.value = response.data.feedback;
            }
        } catch (error) {
            console.error('Fehler beim Laden des negativen Feedbacks:', error);
        } finally {
            isLoading.value = false;
        }
    };
    
    /**
     * Lädt die MOTD (Message of the Day) neu
     */
    const reloadMotd = async () => {
        try {
            if (userRole.value === 'admin') {
                isLoading.value = true;
                await axios.post('/api/admin/reload-motd');
            }
        } catch (error) {
            console.error('Fehler beim Neuladen der MOTD:', error);
        } finally {
            isLoading.value = false;
        }
    };
    
    /**
     * Löscht den LLM-Cache
     */
    const clearModelCache = async () => {
        try {
            if (userRole.value === 'admin' && confirm('Möchten Sie wirklich den Modell-Cache leeren?')) {
                isLoading.value = true;
                await axios.post('/api/admin/clear-cache');
            }
        } catch (error) {
            console.error('Fehler beim Leeren des Modell-Caches:', error);
        } finally {
            isLoading.value = false;
        }
    };
    
    /**
     * Löscht den Embedding-Cache
     */
    const clearEmbeddingCache = async () => {
        try {
            if (userRole.value === 'admin' && confirm('Möchten Sie wirklich den Embedding-Cache leeren?')) {
                isLoading.value = true;
                await axios.post('/api/admin/clear-embedding-cache');
            }
        } catch (error) {
            console.error('Fehler beim Leeren des Embedding-Caches:', error);
        } finally {
            isLoading.value = false;
        }
    };
    
    // Admin-Panel öffnen/schließen
    const toggleAdminPanel = () => {
        showAdminPanel.value = !showAdminPanel.value;
        if (showAdminPanel.value && userRole.value === 'admin') {
            loadSystemStats();
        }
    };
    
    return {
        // State
        userRole,
        showAdminPanel,
        adminTab,
        adminUsers,
        newUser,
        systemStats,
        feedbackStats,
        negativeFeedback,
        
        // Funktionen
        loadUserRole,
        loadUsers,
        createUser,
        updateUserRole,
        deleteUser,
        loadSystemStats,
        loadFeedbackStats,
        loadNegativeFeedback,
        reloadMotd,
        clearModelCache,
        clearEmbeddingCache,
        toggleAdminPanel
    };
}