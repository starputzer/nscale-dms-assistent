/**
 * Pinia Store für Admin-Benutzerverwaltung
 * Basierend auf dem Admin-Komponenten-Design (08.05.2025)
 * Erweitert mit zusätzlichen Funktionen für Benutzerstatistiken und -verwaltung
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { User, NewUser, AdminUsersState, UserRole } from '@/types/admin';
import { adminApi } from '@/services/api/admin';
import { useAuthStore } from '@/stores/auth';

export const useAdminUsersStore = defineStore('adminUsers', () => {
  // AuthStore für Benutzerberechtigungen
  const authStore = useAuthStore();

  // State
  const users = ref<User[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const newUser = ref<NewUser>({
    email: '',
    password: '',
    role: 'user' as UserRole
  });
  const selectedUser = ref<User | null>(null);
  const userStats = ref({
    activeToday: 0,
    activeThisWeek: 0,
    activeThisMonth: 0,
    newThisMonth: 0,
    averageSessionsPerUser: 0
  });

  // Getters
  const adminUsers = computed(() =>
    users.value.filter(user => user.role === 'admin')
  );

  const standardUsers = computed(() =>
    users.value.filter(user => user.role === 'user')
  );

  const getUserById = computed(() =>
    (id: string) => users.value.find(user => user.id === id)
  );

  const totalUsers = computed(() => users.value.length);

  const isCurrentUserAdmin = computed(() =>
    authStore.currentUser?.role === 'admin'
  );

  const recentUsers = computed(() => {
    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

    return users.value
      .filter(user => user.created_at > thirtyDaysAgo)
      .sort((a, b) => b.created_at - a.created_at)
      .slice(0, 5);
  });

  const activeUsers = computed(() => {
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;

    return users.value
      .filter(user => user.last_login && user.last_login > oneDayAgo)
      .sort((a, b) => (b.last_login || 0) - (a.last_login || 0));
  });

  // Actions
  async function fetchUsers() {
    loading.value = true;
    error.value = null;

    try {
      const response = await adminApi.getUsers();
      users.value = response.data.users;
      return response.data.users;
    } catch (err: any) {
      console.error('Error fetching users:', err);
      error.value = err.response?.data?.message || 'Fehler beim Laden der Benutzer';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function createUser(userData: NewUser) {
    loading.value = true;
    error.value = null;

    try {
      const response = await adminApi.createUser(userData);
      await fetchUsers(); // Benutzerliste aktualisieren
      return response.data;
    } catch (err: any) {
      console.error('Error creating user:', err);
      error.value = err.response?.data?.message || 'Fehler beim Erstellen des Benutzers';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function updateUserRole(userId: string, role: string) {
    loading.value = true;
    error.value = null;

    try {
      const response = await adminApi.updateUserRole(userId, role);
      // Aktualisiere den Benutzer in der lokalen Liste
      const userIndex = users.value.findIndex(user => user.id === userId);
      if (userIndex !== -1) {
        users.value[userIndex].role = role as UserRole;
      }
      return response.data;
    } catch (err: any) {
      console.error('Error updating user role:', err);
      error.value = err.response?.data?.message || 'Fehler beim Aktualisieren der Benutzerrolle';
      await fetchUsers(); // Bei Fehler komplette Liste neu laden
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function deleteUser(userId: string) {
    loading.value = true;
    error.value = null;

    try {
      const response = await adminApi.deleteUser(userId);
      // Entferne den Benutzer aus der lokalen Liste
      users.value = users.value.filter(user => user.id !== userId);
      return response.data;
    } catch (err: any) {
      console.error('Error deleting user:', err);
      error.value = err.response?.data?.message || 'Fehler beim Löschen des Benutzers';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  function resetNewUser() {
    newUser.value = {
      email: '',
      password: '',
      role: 'user' as UserRole
    };
  }

  // Wählt einen Benutzer aus, um ihn zu bearbeiten
  function selectUser(userId: string) {
    const user = users.value.find(u => u.id === userId);
    if (user) {
      selectedUser.value = { ...user };
    }
  }

  // Setzt den ausgewählten Benutzer zurück
  function clearSelectedUser() {
    selectedUser.value = null;
  }

  // Lädt Benutzerstatistiken
  async function fetchUserStats() {
    loading.value = true;

    try {
      // In einer echten App würde hier ein API-Aufruf stehen
      // const response = await adminApi.getUserStats();

      // Stattdessen berechnen wir die Statistiken aus den vorhandenen Daten
      const now = Date.now();
      const oneDayAgo = now - 24 * 60 * 60 * 1000;
      const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
      const oneMonthAgo = now - 30 * 24 * 60 * 60 * 1000;

      userStats.value = {
        activeToday: users.value.filter(u => u.last_login && u.last_login > oneDayAgo).length,
        activeThisWeek: users.value.filter(u => u.last_login && u.last_login > oneWeekAgo).length,
        activeThisMonth: users.value.filter(u => u.last_login && u.last_login > oneMonthAgo).length,
        newThisMonth: users.value.filter(u => u.created_at > oneMonthAgo).length,
        // Mock-Wert für durchschnittliche Sitzungen pro Benutzer
        averageSessionsPerUser: Math.round(Math.random() * 10 + 5)
      };

      return userStats.value;
    } catch (err: any) {
      console.error('Error fetching user statistics:', err);
      error.value = err.response?.data?.message || 'Fehler beim Laden der Benutzerstatistiken';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  // Prüft, ob der aktuelle Benutzer ein bestimmtes Benutzerkonto bearbeiten darf
  function canEditUser(userId: string): boolean {
    // Administratoren können alle Benutzer bearbeiten, außer sich selbst
    if (authStore.currentUser?.role === 'admin') {
      return authStore.currentUser.id !== userId;
    }

    // Andere Benutzer können keine Benutzer bearbeiten
    return false;
  }

  // Prüft, ob der aktuelle Benutzer ein bestimmtes Benutzerkonto löschen darf
  function canDeleteUser(userId: string): boolean {
    const user = users.value.find(u => u.id === userId);

    // Administratoren können alle Standardbenutzer löschen, aber keine anderen Administratoren
    if (authStore.currentUser?.role === 'admin') {
      return authStore.currentUser.id !== userId && user?.role !== 'admin';
    }

    // Andere Benutzer können keine Benutzer löschen
    return false;
  }

  // Filtere Benutzer nach verschiedenen Kriterien
  function filterUsers(options: {
    role?: UserRole,
    searchTerm?: string,
    activeOnly?: boolean,
    sortBy?: keyof User,
    sortDirection?: 'asc' | 'desc'
  }) {
    const {
      role,
      searchTerm,
      activeOnly = false,
      sortBy = 'email',
      sortDirection = 'asc'
    } = options;

    let result = [...users.value];

    // Nach Rolle filtern
    if (role) {
      result = result.filter(user => user.role === role);
    }

    // Nach Suchbegriff filtern
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(user =>
        user.email.toLowerCase().includes(term) ||
        user.id.toLowerCase().includes(term)
      );
    }

    // Nur aktive Benutzer anzeigen (mit Login in den letzten 30 Tagen)
    if (activeOnly) {
      const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
      result = result.filter(user => user.last_login && user.last_login > thirtyDaysAgo);
    }

    // Sortieren
    result.sort((a, b) => {
      if (sortBy === 'last_login') {
        // Handle null values for last_login
        if (a.last_login === null && b.last_login === null) return 0;
        if (a.last_login === null) return 1;
        if (b.last_login === null) return -1;
        return sortDirection === 'asc' ? a.last_login - b.last_login : b.last_login - a.last_login;
      }

      if (sortBy === 'created_at') {
        return sortDirection === 'asc' ? a.created_at - b.created_at : b.created_at - a.created_at;
      }

      // Default: Sortiere nach E-Mail oder Rolle
      const aVal = String(a[sortBy]);
      const bVal = String(b[sortBy]);
      return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    });

    return result;
  }

  return {
    // State
    users,
    loading,
    error,
    newUser,
    selectedUser,
    userStats,

    // Getters
    adminUsers,
    standardUsers,
    getUserById,
    totalUsers,
    isCurrentUserAdmin,
    recentUsers,
    activeUsers,

    // Actions
    fetchUsers,
    createUser,
    updateUserRole,
    deleteUser,
    resetNewUser,
    selectUser,
    clearSelectedUser,
    fetchUserStats,
    canEditUser,
    canDeleteUser,
    filterUsers
  };
});