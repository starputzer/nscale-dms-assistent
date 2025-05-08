/**
 * Pinia Store für Admin-Benutzerverwaltung
 * Basierend auf dem Admin-Komponenten-Design (08.05.2025)
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { User, NewUser, AdminUsersState, UserRole } from '@/types/admin';
import { adminApi } from '@/services/api/admin';

export const useAdminUsersStore = defineStore('adminUsers', () => {
  // State
  const users = ref<User[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const newUser = ref<NewUser>({
    email: '',
    password: '',
    role: 'user' as UserRole
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

  return {
    // State
    users,
    loading,
    error,
    newUser,
    
    // Getters
    adminUsers,
    standardUsers,
    getUserById,
    totalUsers,
    
    // Actions
    fetchUsers,
    createUser,
    updateUserRole,
    deleteUser,
    resetNewUser
  };
});