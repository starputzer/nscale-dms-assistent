// stores/userStore.js
import { defineStore } from 'pinia';
import axios from 'axios';
import { useAuthStore } from './authStore';

/**
 * Store zur Verwaltung von Benutzern im Admin-Bereich
 * Enthält Funktionen zum Laden, Erstellen, Aktualisieren und Löschen von Benutzern
 */
export const useUserStore = defineStore('user', {
  state: () => ({
    // Liste aller Benutzer
    users: [],
    
    // Aktuell bearbeiteter Benutzer
    selectedUser: null,
    
    // Filter für die Benutzerliste
    filter: {
      role: 'all',  // 'all', 'user', 'admin'
      search: '',
    },
    
    // Sortierung
    sort: {
      field: 'created_at',
      direction: 'desc'
    },
    
    // Status-Flags
    loading: false,
    error: null,
    
    // Flag für das Bearbeitungs-Modal
    showUserModal: false,
    modalMode: 'create', // 'create', 'edit'
    
    // Bestätigungsdialog für Löschen/Rolle ändern
    confirmDialog: {
      show: false,
      type: null, // 'delete', 'role'
      userId: null,
      newRole: null,
      message: ''
    }
  }),
  
  getters: {
    /**
     * Gefilterte und sortierte Benutzerliste
     */
    filteredUsers: (state) => {
      let result = [...state.users];
      
      // Nach Rolle filtern
      if (state.filter.role !== 'all') {
        result = result.filter(user => user.role === state.filter.role);
      }
      
      // Nach Suchbegriff filtern
      if (state.filter.search.trim()) {
        const query = state.filter.search.toLowerCase();
        result = result.filter(user => 
          user.email.toLowerCase().includes(query)
        );
      }
      
      // Sortieren
      result.sort((a, b) => {
        let aValue = a[state.sort.field];
        let bValue = b[state.sort.field];
        
        // Spezialbehandlung für Datumsfelder
        if (state.sort.field === 'created_at' || state.sort.field === 'last_login') {
          aValue = aValue ? aValue : 0;
          bValue = bValue ? bValue : 0;
        }
        
        if (state.sort.direction === 'asc') {
          return aValue > bValue ? 1 : -1;
        } else {
          return aValue < bValue ? 1 : -1;
        }
      });
      
      return result;
    },
    
    /**
     * Prüft, ob der Store eine ausreichende Berechtigung hat
     */
    hasAdminAccess: () => {
      const authStore = useAuthStore();
      return authStore.isAdmin;
    },
    
    /**
     * Benutzerstatistiken
     */
    userStats: (state) => {
      return {
        total: state.users.length,
        admins: state.users.filter(user => user.role === 'admin').length,
        standardUsers: state.users.filter(user => user.role === 'user').length,
      };
    }
  },
  
  actions: {
    /**
     * Lädt die Benutzerliste vom Server
     */
    async loadUsers() {
      if (!this.hasAdminAccess) return;
      
      this.loading = true;
      this.error = null;
      
      try {
        const response = await axios.get('/api/admin/users');
        this.users = response.data.users || [];
      } catch (error) {
        console.error('Fehler beim Laden der Benutzer:', error);
        this.error = error.response?.data?.detail || 'Fehler beim Laden der Benutzer';
      } finally {
        this.loading = false;
      }
    },
    
    /**
     * Erstellt einen neuen Benutzer
     * @param {Object} userData - Benutzerdaten (email, password, role)
     */
    async createUser(userData) {
      if (!this.hasAdminAccess) return;
      
      this.loading = true;
      this.error = null;
      
      try {
        const response = await axios.post('/api/admin/users', userData);
        
        // Benutzerliste neu laden
        await this.loadUsers();
        
        return true;
      } catch (error) {
        console.error('Fehler beim Erstellen des Benutzers:', error);
        this.error = error.response?.data?.detail || 'Fehler beim Erstellen des Benutzers';
        throw new Error(this.error);
      } finally {
        this.loading = false;
      }
    },
    
    /**
     * Aktualisiert die Rolle eines Benutzers
     * @param {number} userId - Benutzer-ID
     * @param {string} newRole - Neue Rolle ('user' oder 'admin')
     */
    async updateUserRole(userId, newRole) {
      if (!this.hasAdminAccess) return;
      
      this.loading = true;
      this.error = null;
      
      try {
        const response = await axios.put(`/api/admin/users/${userId}/role`, { role: newRole });
        
        // Benutzerliste neu laden
        await this.loadUsers();
        
        return true;
      } catch (error) {
        console.error(`Fehler beim Aktualisieren der Rolle für Benutzer ${userId}:`, error);
        this.error = error.response?.data?.detail || 'Fehler beim Aktualisieren der Benutzerrolle';
        throw new Error(this.error);
      } finally {
        this.loading = false;
      }
    },
    
    /**
     * Löscht einen Benutzer
     * @param {number} userId - Benutzer-ID
     */
    async deleteUser(userId) {
      if (!this.hasAdminAccess) return;
      
      this.loading = true;
      this.error = null;
      
      try {
        const response = await axios.delete(`/api/admin/users/${userId}`);
        
        // Benutzerliste neu laden
        await this.loadUsers();
        
        return true;
      } catch (error) {
        console.error(`Fehler beim Löschen des Benutzers ${userId}:`, error);
        this.error = error.response?.data?.detail || 'Fehler beim Löschen des Benutzers';
        throw new Error(this.error);
      } finally {
        this.loading = false;
      }
    },
    
    /**
     * Wählt einen Benutzer zur Bearbeitung aus
     * @param {Object} user - Benutzer-Objekt
     */
    selectUser(user) {
      this.selectedUser = user;
    },
    
    /**
     * Setzt die Filter für die Benutzerliste
     * @param {Object} filter - Filterobjekt
     */
    setFilter(filter) {
      this.filter = { ...this.filter, ...filter };
    },
    
    /**
     * Ändert die Sortierung der Benutzerliste
     * @param {string} field - Feldname zur Sortierung
     */
    toggleSort(field) {
      if (this.sort.field === field) {
        // Richtung umkehren, wenn bereits nach diesem Feld sortiert wird
        this.sort.direction = this.sort.direction === 'asc' ? 'desc' : 'asc';
      } else {
        // Neues Feld, Standardrichtung desc
        this.sort.field = field;
        this.sort.direction = 'desc';
      }
    },
    
    /**
     * Öffnet den Dialog zum Erstellen/Bearbeiten eines Benutzers
     * @param {string} mode - Modus ('create' oder 'edit')
     * @param {Object} user - Benutzer-Objekt für den Bearbeitungsmodus
     */
    openUserModal(mode, user = null) {
      this.modalMode = mode;
      this.selectedUser = user;
      this.showUserModal = true;
    },
    
    /**
     * Schließt den Benutzer-Dialog
     */
    closeUserModal() {
      this.showUserModal = false;
      this.selectedUser = null;
    },
    
    /**
     * Öffnet den Bestätigungsdialog
     * @param {string} type - Typ des Dialogs ('delete' oder 'role')
     * @param {Object} data - Zusätzliche Daten (userId, newRole, usw.)
     */
    openConfirmDialog(type, data) {
      let message = '';
      
      if (type === 'delete') {
        const user = this.users.find(u => u.id === data.userId);
        message = `Möchten Sie den Benutzer "${user?.email || 'Unbekannt'}" wirklich löschen?`;
      } else if (type === 'role') {
        const user = this.users.find(u => u.id === data.userId);
        const roleName = data.newRole === 'admin' ? 'Administrator' : 'Standardbenutzer';
        message = `Möchten Sie die Rolle von "${user?.email || 'Unbekannt'}" zu "${roleName}" ändern?`;
      }
      
      this.confirmDialog = {
        show: true,
        type,
        userId: data.userId,
        newRole: data.newRole,
        message
      };
    },
    
    /**
     * Schließt den Bestätigungsdialog
     */
    closeConfirmDialog() {
      this.confirmDialog = {
        show: false,
        type: null,
        userId: null,
        newRole: null,
        message: ''
      };
    },
    
    /**
     * Führt die bestätigte Aktion aus
     */
    async confirmAction() {
      try {
        if (this.confirmDialog.type === 'delete') {
          await this.deleteUser(this.confirmDialog.userId);
        } else if (this.confirmDialog.type === 'role') {
          await this.updateUserRole(this.confirmDialog.userId, this.confirmDialog.newRole);
        }
      } catch (error) {
        // Fehler wird bereits in den jeweiligen Aktionen gesetzt
      } finally {
        this.closeConfirmDialog();
      }
    }
  }
});