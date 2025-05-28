/**
 * Pinia Store für Admin-Benutzerverwaltung
 * Basierend auf dem Admin-Komponenten-Design (08.05.2025)
 * Erweitert mit zusätzlichen Funktionen für Benutzerstatistiken und -verwaltung
 */

import { defineStore } from "pinia";
import { ref, computed } from "vue";
import type {
  User,
  NewUser,
  AdminUsersState,
  UserRole,
  UserStats,
} from "@/types/admin";
import { adminApi } from "@/services/api/admin";
import { useAuthStore } from "@/stores/auth";
import { adminUsersService } from "@/services/api/adminServices";
import { shouldUseRealApi } from "@/config/api-flags";

export const useAdminUsersStore = defineStore("adminUsers", () => {
  // AuthStore für Benutzerberechtigungen
  const authStore = useAuthStore();

  // State
  const users = ref<User[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const newUser = ref<NewUser>({
    email: "",
    password: "",
    role: "user" as UserRole,
  });
  const selectedUser = ref<User | null>(null);
  const userStats = ref({
    activeToday: 0,
    activeThisWeek: 0,
    activeThisMonth: 0,
    newThisMonth: 0,
    averageSessionsPerUser: 0,
  });

  // Getters
  const adminUsers = computed(() => {
    if (!users.value) return [];
    return users.value.filter((user) => user.role === "admin");
  });

  const standardUsers = computed(() => {
    if (!users.value) return [];
    return users.value.filter((user) => user.role === "user");
  });

  const getUserById = computed(() => (id: string) => {
    if (!users.value) return null;
    return users.value.find((user) => user.id === id);
  });

  const totalUsers = computed(() => {
    return users.value ? users.value.length : 0;
  });

  const isCurrentUserAdmin = computed(
    () => authStore.currentUser?.role === "admin",
  );

  const recentUsers = computed(() => {
    if (!users.value) return [];

    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

    return users.value
      .filter((user) => user.created_at > thirtyDaysAgo)
      .sort((a, b) => b.created_at - a.created_at)
      .slice(0, 5);
  });

  const activeUsers = computed(() => {
    if (!users.value) return [];

    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;

    return users.value
      .filter((user) => user.last_login && user.last_login > oneDayAgo)
      .sort((a, b) => (b.last_login || 0) - (a.last_login || 0));
  });

  // Actions
  async function fetchUsers() {
    loading.value = true;
    error.value = null;

    // Define mock data for fallback
    const mockUsers = [
      {
        id: "1",
        email: "admin@example.com",
        username: "admin",
        role: "admin" as UserRole,
        created_at: Date.now() - 90 * 24 * 60 * 60 * 1000,
        last_login: Date.now() - 1 * 60 * 60 * 1000,
      },
      {
        id: "2",
        email: "user1@example.com",
        username: "user1",
        role: "user" as UserRole,
        created_at: Date.now() - 45 * 24 * 60 * 60 * 1000,
        last_login: Date.now() - 2 * 24 * 60 * 60 * 1000,
      },
      {
        id: "3",
        email: "user2@example.com",
        username: "user2",
        role: "user" as UserRole,
        created_at: Date.now() - 20 * 24 * 60 * 60 * 1000,
        last_login: Date.now() - 5 * 24 * 60 * 60 * 1000,
      },
      {
        id: "4",
        email: "user3@example.com",
        username: "user3",
        role: "user" as UserRole,
        created_at: Date.now() - 10 * 24 * 60 * 60 * 1000,
        last_login: Date.now() - 1 * 24 * 60 * 60 * 1000,
      },
      {
        id: "5",
        email: "new-user@example.com",
        username: "newuser",
        role: "user" as UserRole,
        created_at: Date.now() - 2 * 24 * 60 * 60 * 1000,
        last_login: Date.now() - 1 * 60 * 60 * 1000,
      },
    ];

    try {
      // First try to get users directly from authStore
      if (authStore.user) {
        const currentUser = authStore.user;
        console.log("[UserStore] Using the authenticated user:", currentUser);

        // Add current user to the list
        const userData = {
          id: currentUser.id || "1",
          email: currentUser.email || "admin@example.com",
          username: currentUser.username || "admin",
          role: (currentUser.role as UserRole) || "admin",
          created_at:
            currentUser.created_at || Date.now() - 90 * 24 * 60 * 60 * 1000,
          last_login: currentUser.last_login || Date.now() - 1 * 60 * 60 * 1000,
        };

        // Nur wenn wir nicht die echte API verwenden, setzen wir den aktuellen Benutzer direkt
        if (!shouldUseRealApi("useRealUsersApi")) {
          users.value = [userData, ...mockUsers.slice(1)];
          return users.value;
        }
      }

      // Versuche, die Benutzer über den AdminUsersService zu laden
      if (shouldUseRealApi("useRealUsersApi")) {
        console.log("[UserStore] Lade Benutzer über AdminUsersService");
        const response = await adminUsersService.getUsers();

        if (response.success && Array.isArray(response.data)) {
          console.log(
            "[UserStore] Benutzer erfolgreich über AdminUsersService geladen",
          );
          users.value = response.data;
          return users.value;
        } else {
          console.warn(
            "[UserStore] Fehler beim Laden der Benutzer über AdminUsersService, verwende Fallback",
            response.message,
          );
          throw new Error(response.message || "Fehler beim Laden der Benutzer");
        }
      }

      // Fallback zur alten Implementierung
      try {
        console.log("[UserStore] Versuche Benutzer über adminApi zu laden");
        const response = await adminApi.getUsers();
        if (response?.data?.users && Array.isArray(response.data.users)) {
          console.log("[UserStore] Benutzer erfolgreich über adminApi geladen");
          users.value = response.data.users;
          return response.data.users;
        } else {
          throw new Error("Ungültiges API-Antwortformat");
        }
      } catch (apiErr) {
        console.warn("[UserStore] Verwende Mock-Daten statt API:", apiErr);
        // Fallback zu Mock-Daten, wenn API fehlschlägt
        users.value = mockUsers;
        return mockUsers;
      }
    } catch (err: any) {
      console.error("[UserStore] Fehler beim Laden der Benutzer:", err);
      error.value =
        err.response?.data?.message ||
        err.message ||
        "Fehler beim Laden der Benutzer";

      // Setze Mock-Daten auch im Fehlerfall, um UI-Fehler zu vermeiden
      users.value = mockUsers;
      return mockUsers;
    } finally {
      loading.value = false;
    }
  }

  async function createUser(userData: NewUser) {
    loading.value = true;
    error.value = null;

    try {
      if (shouldUseRealApi("useRealUsersApi")) {
        console.log(
          "[UserStore] Erstelle Benutzer über AdminUsersService",
          userData,
        );
        const response = await adminUsersService.createUser(userData);

        if (response.success) {
          console.log(
            "[UserStore] Benutzer erfolgreich über AdminUsersService erstellt",
          );
          await fetchUsers(); // Benutzerliste aktualisieren
          return response.data;
        } else {
          throw new Error(
            response.message || "Fehler beim Erstellen des Benutzers",
          );
        }
      }

      // Fallback zur alten Implementierung
      console.log("[UserStore] Erstelle Benutzer über adminApi", userData);
      const response = await adminApi.createUser(userData);
      await fetchUsers(); // Benutzerliste aktualisieren
      return response.data;
    } catch (err: any) {
      console.error("[UserStore] Fehler beim Erstellen des Benutzers:", err);
      error.value =
        err.response?.data?.message ||
        err.message ||
        "Fehler beim Erstellen des Benutzers";
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function updateUserRole(userId: string, role: string) {
    loading.value = true;
    error.value = null;

    try {
      if (shouldUseRealApi("useRealUsersApi")) {
        console.log(
          `[UserStore] Aktualisiere Rolle für Benutzer ${userId} auf ${role} über AdminUsersService`,
        );
        const response = await adminUsersService.updateUserRole(
          userId,
          role as UserRole,
        );

        if (response.success) {
          console.log(
            "[UserStore] Benutzerrolle erfolgreich über AdminUsersService aktualisiert",
          );
          // Aktualisiere den Benutzer in der lokalen Liste
          const userIndex = users.value.findIndex((user) => user.id === userId);
          if (userIndex !== -1) {
            users.value[userIndex].role = role as UserRole;
          }
          return response.data;
        } else {
          throw new Error(
            response.message || "Fehler beim Aktualisieren der Benutzerrolle",
          );
        }
      }

      // Fallback zur alten Implementierung
      console.log(
        `[UserStore] Aktualisiere Rolle für Benutzer ${userId} auf ${role} über adminApi`,
      );
      const response = await adminApi.updateUserRole(userId, role);
      // Aktualisiere den Benutzer in der lokalen Liste
      const userIndex = users.value.findIndex((user) => user.id === userId);
      if (userIndex !== -1) {
        users.value[userIndex].role = role as UserRole;
      }
      return response.data;
    } catch (err: any) {
      console.error(
        "[UserStore] Fehler beim Aktualisieren der Benutzerrolle:",
        err,
      );
      error.value =
        err.response?.data?.message ||
        err.message ||
        "Fehler beim Aktualisieren der Benutzerrolle";
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
      if (shouldUseRealApi("useRealUsersApi")) {
        console.log(
          `[UserStore] Lösche Benutzer ${userId} über AdminUsersService`,
        );
        const response = await adminUsersService.deleteUser(userId);

        if (response.success) {
          console.log(
            "[UserStore] Benutzer erfolgreich über AdminUsersService gelöscht",
          );
          // Entferne den Benutzer aus der lokalen Liste
          users.value = users.value.filter((user) => user.id !== userId);
          return response.data;
        } else {
          throw new Error(
            response.message || "Fehler beim Löschen des Benutzers",
          );
        }
      }

      // Fallback zur alten Implementierung
      console.log(`[UserStore] Lösche Benutzer ${userId} über adminApi`);
      const response = await adminApi.deleteUser(userId);
      // Entferne den Benutzer aus der lokalen Liste
      users.value = users.value.filter((user) => user.id !== userId);
      return response.data;
    } catch (err: any) {
      console.error("[UserStore] Fehler beim Löschen des Benutzers:", err);
      error.value =
        err.response?.data?.message ||
        err.message ||
        "Fehler beim Löschen des Benutzers";
      throw err;
    } finally {
      loading.value = false;
    }
  }

  function resetNewUser() {
    newUser.value = {
      email: "",
      password: "",
      role: "user" as UserRole,
    };
  }

  // Wählt einen Benutzer aus, um ihn zu bearbeiten
  function selectUser(userId: string) {
    const user = users.value.find((u) => u.id === userId);
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
    error.value = null;

    try {
      if (shouldUseRealApi("useRealUsersApi")) {
        console.log(
          "[UserStore] Lade Benutzerstatistiken über AdminUsersService",
        );
        const response = await adminUsersService.getUserStats();

        if (response.success && response.data) {
          console.log(
            "[UserStore] Benutzerstatistiken erfolgreich über AdminUsersService geladen",
          );
          userStats.value = response.data;
          return userStats.value;
        } else {
          throw new Error(
            response.message || "Fehler beim Laden der Benutzerstatistiken",
          );
        }
      }

      // Fallback: Statistiken aus vorhandenen Daten berechnen
      console.log(
        "[UserStore] Berechne Benutzerstatistiken aus vorhandenen Daten",
      );
      const now = Date.now();
      const oneDayAgo = now - 24 * 60 * 60 * 1000;
      const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
      const oneMonthAgo = now - 30 * 24 * 60 * 60 * 1000;

      userStats.value = {
        activeToday: users.value.filter(
          (u) => u.last_login && u.last_login > oneDayAgo,
        ).length,
        activeThisWeek: users.value.filter(
          (u) => u.last_login && u.last_login > oneWeekAgo,
        ).length,
        activeThisMonth: users.value.filter(
          (u) => u.last_login && u.last_login > oneMonthAgo,
        ).length,
        newThisMonth: users.value.filter((u) => u.created_at > oneMonthAgo)
          .length,
        // Mock-Wert für durchschnittliche Sitzungen pro Benutzer
        averageSessionsPerUser: Math.round(Math.random() * 10 + 5),
      };

      return userStats.value;
    } catch (err: any) {
      console.error(
        "[UserStore] Fehler beim Laden der Benutzerstatistiken:",
        err,
      );
      error.value =
        err.response?.data?.message ||
        err.message ||
        "Fehler beim Laden der Benutzerstatistiken";
      throw err;
    } finally {
      loading.value = false;
    }
  }

  // Prüft, ob der aktuelle Benutzer ein bestimmtes Benutzerkonto bearbeiten darf
  function canEditUser(userId: string): boolean {
    // Administratoren können alle Benutzer bearbeiten, außer sich selbst
    if (authStore.currentUser?.role === "admin") {
      return authStore.currentUser.id !== userId;
    }

    // Andere Benutzer können keine Benutzer bearbeiten
    return false;
  }

  // Prüft, ob der aktuelle Benutzer ein bestimmtes Benutzerkonto löschen darf
  function canDeleteUser(userId: string): boolean {
    const user = users.value.find((u) => u.id === userId);

    // Administratoren können alle Standardbenutzer löschen, aber keine anderen Administratoren
    if (authStore.currentUser?.role === "admin") {
      return authStore.currentUser.id !== userId && user?.role !== "admin";
    }

    // Andere Benutzer können keine Benutzer löschen
    return false;
  }

  // Filtere Benutzer nach verschiedenen Kriterien
  function filterUsers(options: {
    role?: UserRole;
    searchTerm?: string;
    activeOnly?: boolean;
    sortBy?: keyof User;
    sortDirection?: "asc" | "desc";
  }) {
    const {
      role,
      searchTerm,
      activeOnly = false,
      sortBy = "email",
      sortDirection = "asc",
    } = options;

    let result = [...users.value];

    // Nach Rolle filtern
    if (role) {
      result = result.filter((user) => user.role === role);
    }

    // Nach Suchbegriff filtern
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (user) =>
          user.email.toLowerCase().includes(term) ||
          user.id.toLowerCase().includes(term),
      );
    }

    // Nur aktive Benutzer anzeigen (mit Login in den letzten 30 Tagen)
    if (activeOnly) {
      const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
      result = result.filter(
        (user) => user.last_login && user.last_login > thirtyDaysAgo,
      );
    }

    // Sortieren
    result.sort((a, b) => {
      if (sortBy === "last_login") {
        // Handle null values for last_login
        if (a.last_login === null && b.last_login === null) return 0;
        if (a.last_login === null) return 1;
        if (b.last_login === null) return -1;
        return sortDirection === "asc"
          ? a.last_login - b.last_login
          : b.last_login - a.last_login;
      }

      if (sortBy === "created_at") {
        return sortDirection === "asc"
          ? a.created_at - b.created_at
          : b.created_at - a.created_at;
      }

      // Default: Sortiere nach E-Mail oder Rolle
      const aVal = String(a[sortBy]);
      const bVal = String(b[sortBy]);
      return sortDirection === "asc"
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    });

    return result;
  }

  // Implementiert die fetchUserCount Funktion für AdminDashboard
  async function fetchUserCount() {
    loading.value = true;
    error.value = null;

    try {
      if (shouldUseRealApi("useRealUsersApi")) {
        console.log("[UserStore] Lade Benutzeranzahl über AdminUsersService");
        const response = await adminUsersService.getUserCount();

        if (response.success) {
          console.log(
            `[UserStore] Benutzeranzahl erfolgreich geladen: ${response.data}`,
          );
          return response.data;
        } else {
          throw new Error(
            response.message || "Fehler beim Laden der Benutzeranzahl",
          );
        }
      }

      // Fallback: Benutzeranzahl aus vorhandenen Daten berechnen
      console.log("[UserStore] Berechne Benutzeranzahl aus vorhandenen Daten");

      // Falls die Benutzer noch nicht geladen wurden, lade sie zuerst
      if (!users.value || users.value.length === 0) {
        await fetchUsers();
      }

      // Berechne die Benutzeranzahl aus der vorhandenen users-Liste
      const count = users.value ? users.value.length : 0;
      console.log(`[UserStore] Berechnete Benutzeranzahl: ${count}`);
      return count;
    } catch (err: any) {
      console.error("[UserStore] Fehler beim Laden der Benutzeranzahl:", err);
      error.value =
        err.response?.data?.message ||
        err.message ||
        "Fehler beim Laden der Benutzeranzahl";
      // Gib einen Standardwert zurück, damit die UI nicht zusammenbricht
      return 5; // Standard-Fallback-Anzahl
    } finally {
      loading.value = false;
    }
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
    fetchUserCount, // Neu hinzugefügt
    createUser,
    updateUserRole,
    deleteUser,
    resetNewUser,
    selectUser,
    clearSelectedUser,
    fetchUserStats,
    canEditUser,
    canDeleteUser,
    filterUsers,
  };
});
