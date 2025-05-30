<template>
  <div class="admin-section">
    <h2 class="admin-section__title">
      {{ t("admin.users.title", "Benutzerverwaltung") }}
    </h2>
    <p class="admin-section__description">
      {{
        t(
          "admin.users.description",
          "Verwalten Sie Benutzerkonten und Berechtigungen.",
        )
      }}
    </p>

    <!-- User Statistics Summary -->
    <div class="admin-grid admin-grid--3-columns">
      <AdminCard variant="primary" elevated>
        <div class="admin-metric">
          <div class="admin-metric__icon">
            <i class="fas fa-users"></i>
          </div>
          <div class="admin-metric__content">
            <div class="admin-metric__value">{{ totalUsers }}</div>
            <div class="admin-metric__label">
              {{ t("admin.users.totalUsers", "Gesamtzahl der Benutzer") }}
            </div>
          </div>
        </div>
      </AdminCard>

      <AdminCard variant="success" elevated>
        <div class="admin-metric">
          <div class="admin-metric__icon admin-metric__icon--success">
            <i class="fas fa-user-shield"></i>
          </div>
          <div class="admin-metric__content">
            <div class="admin-metric__value">{{ adminUsers.length }}</div>
            <div class="admin-metric__label">
              {{ t("admin.users.adminUsers", "Administratoren") }}
            </div>
          </div>
        </div>
      </AdminCard>

      <AdminCard variant="info" elevated>
        <div class="admin-metric">
          <div class="admin-metric__icon admin-metric__icon--info">
            <i class="fas fa-user"></i>
          </div>
          <div class="admin-metric__content">
            <div class="admin-metric__value">{{ standardUsers.length }}</div>
            <div class="admin-metric__label">
              {{ t("admin.users.standardUsers", "Standardbenutzer") }}
            </div>
          </div>
        </div>
      </AdminCard>
    </div>

    <!-- User Controls -->
    <AdminCard>
      <template #header>
        <div class="admin-card__header-with-actions">
          <div class="admin-card__header-with-icon">
            <i class="fas fa-users" aria-hidden="true"></i>
            <h3>{{ t("admin.users.list", "Benutzerliste") }}</h3>
          </div>
          <div class="users-controls">
            <div class="users-search">
              <div class="users-search__container">
                <i class="fas fa-search users-search__icon"></i>
                <input
                  v-model="searchQuery"
                  type="text"
                  class="users-search__input"
                  :placeholder="t('admin.users.search', 'Benutzer suchen...')"
                />
                <button
                  v-if="searchQuery"
                  @click="searchQuery = ''"
                  class="users-search__clear"
                  aria-label="Suche zurücksetzen"
                >
                  <i class="fas fa-times"></i>
                </button>
              </div>
            </div>
            <button
              class="admin-button admin-button--primary"
              @click="createNewUser"
              :disabled="isLoading"
            >
              <i class="fas fa-user-plus"></i>
              {{ t("admin.users.create", "Neuen Benutzer anlegen") }}
            </button>
          </div>
        </div>
      </template>

      <div v-if="isLoading" class="admin-loading">
        <div class="admin-loading__spinner"></div>
        <p class="admin-loading__text">
          {{ t("admin.users.loading", "Benutzer werden geladen...") }}
        </p>
      </div>

      <div v-else-if="filteredUsers.length > 0" class="users-table-container">
        <table class="admin-table admin-table--responsive">
          <thead>
            <tr>
              <th @click="sortBy('email')" class="sortable-header">
                {{ t("admin.users.table.email", "E-Mail") }}
                <i
                  v-if="sortField === 'email'"
                  class="fas"
                  :class="
                    sortDirection === 'asc' ? 'fa-sort-up' : 'fa-sort-down'
                  "
                ></i>
              </th>
              <th @click="sortBy('role')" class="sortable-header">
                {{ t("admin.users.table.role", "Rolle") }}
                <i
                  v-if="sortField === 'role'"
                  class="fas"
                  :class="
                    sortDirection === 'asc' ? 'fa-sort-up' : 'fa-sort-down'
                  "
                ></i>
              </th>
              <th @click="sortBy('createdAt')" class="sortable-header">
                {{ t("admin.users.table.created", "Erstellt") }}
                <i
                  v-if="sortField === 'createdAt'"
                  class="fas"
                  :class="
                    sortDirection === 'asc' ? 'fa-sort-up' : 'fa-sort-down'
                  "
                ></i>
              </th>
              <th @click="sortBy('lastLogin')" class="sortable-header">
                {{ t("admin.users.table.lastLogin", "Letzter Login") }}
                <i
                  v-if="sortField === 'lastLogin'"
                  class="fas"
                  :class="
                    sortDirection === 'asc' ? 'fa-sort-up' : 'fa-sort-down'
                  "
                ></i>
              </th>
              <th class="actions-header">
                {{ t("admin.users.table.actions", "Aktionen") }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in filteredUsers" :key="user.id" class="user-row">
              <td>{{ user.email }}</td>
              <td>
                <span
                  class="admin-badge"
                  :class="
                    user.role === 'admin'
                      ? 'admin-badge--success'
                      : 'admin-badge--primary'
                  "
                >
                  {{ t(`admin.roles.${user.role}`, user.role) }}
                </span>
              </td>
              <td>{{ formatDate(user.createdAt) }}</td>
              <td>
                {{
                  user.lastLogin
                    ? formatDate(user.lastLogin)
                    : t("admin.users.table.never", "Nie")
                }}
              </td>
              <td class="actions-cell">
                <div class="user-actions">
                  <button
                    class="admin-button admin-button--icon"
                    @click="editUser(user)"
                    title="Bearbeiten"
                  >
                    <i class="fas fa-edit"></i>
                  </button>
                  <button
                    class="admin-button admin-button--icon"
                    @click="deleteUser(user)"
                    :disabled="isCurrentUser(user)"
                    title="Löschen"
                  >
                    <i class="fas fa-trash-alt"></i>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-else class="users-empty-state">
        <i class="fas fa-user-slash users-empty-icon"></i>
        <p class="users-empty-text">
          {{
            searchQuery
              ? t(
                  "admin.users.noSearchResults",
                  "Keine Benutzer gefunden, die Ihrer Suche entsprechen.",
                )
              : t("admin.users.noUsers", "Keine Benutzer gefunden")
          }}
        </p>
        <button
          v-if="searchQuery"
          @click="searchQuery = ''"
          class="admin-button admin-button--secondary"
        >
          {{ t("admin.users.clearSearch", "Suche zurücksetzen") }}
        </button>
      </div>
    </AdminCard>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, defineEmits } from "vue";
import { useI18n } from "vue-i18n";
import { storeToRefs } from "pinia";
import { useAdminUsersStore } from "@/stores/admin/users";
import { useAuthStore } from "@/stores/auth";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import type { User } from "@/types/admin";
import AdminCard from "@/components/admin/shared/AdminCard.vue";

// Define emits
const emit = defineEmits(["error", "auth-error", "reload"]);

// i18n
const { t, locale } = useI18n({ useScope: "global", inheritLocale: true });
console.log("[i18n] Component initialized with global scope and inheritance");

// Stores
const adminUsersStore = useAdminUsersStore();
const authStore = useAuthStore();

// Store references
const {
  users,
  loading: storeLoading,
  error: storeError,
} = storeToRefs(adminUsersStore);
const { currentUser } = storeToRefs(authStore);

// Local state
const isLoading = ref(true);
const isMounted = ref(true);
const searchQuery = ref("");
const sortField = ref("email");
const sortDirection = ref("asc");

// Computed properties
const adminUsers = computed(() => {
  return adminUsersStore.adminUsers || [];
});

const standardUsers = computed(() => {
  return adminUsersStore.standardUsers || [];
});

const totalUsers = computed(() => {
  return adminUsersStore.totalUsers || 0;
});

const filteredUsers = computed(() => {
  try {
    // Filter by search query
    let result = users.value || [];

    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase();
      result = result.filter((user) => {
        return (
          user.email.toLowerCase().includes(query) ||
          user.role.toLowerCase().includes(query)
        );
      });
    }

    // Sort users
    result = [...result].sort((a, b) => {
      let fieldA = a[sortField.value];
      let fieldB = b[sortField.value];

      // Handle potentially undefined fields
      if (fieldA === undefined) fieldA = "";
      if (fieldB === undefined) fieldB = "";

      // Sort order
      if (sortDirection.value === "asc") {
        return String(fieldA).localeCompare(String(fieldB));
      } else {
        return String(fieldB).localeCompare(String(fieldA));
      }
    });

    return result;
  } catch (error) {
    console.error("[AdminUsers] Error filtering users:", error);
    return [];
  }
});

// Reset local state
function resetState() {
  searchQuery.value = "";
}

function isCurrentUser(user: User): boolean {
  // Safety check for undefined values
  if (!user) {
    return false;
  }

  // Sicherstellen, dass currentUser und currentUser.value existieren
  if (
    !currentUser ||
    typeof currentUser.value === "undefined" ||
    currentUser.value === null
  ) {
    return false;
  }

  // Prüfe, ob currentUser.value.id existiert
  if (!currentUser.value.id) {
    return false;
  }

  return user.id === currentUser.value.id;
}

function sortBy(field: string) {
  if (sortField.value === field) {
    // Toggle sort direction
    sortDirection.value = sortDirection.value === "asc" ? "desc" : "asc";
  } else {
    // Set new sort field and default to ascending
    sortField.value = field;
    sortDirection.value = "asc";
  }
}

function formatDate(timestamp: number | null | undefined): string {
  if (!timestamp) {
    return "-";
  }

  try {
    // Stelle sicher, dass timestamp eine gültige Zahl ist
    const validTimestamp =
      typeof timestamp === "number" ? timestamp : parseInt(String(timestamp));

    // Prüfe, ob validTimestamp eine gültige Zahl ist
    if (isNaN(validTimestamp)) {
      return "-";
    }

    return format(new Date(validTimestamp), "dd.MM.yyyy HH:mm", { locale: de });
  } catch (error) {
    console.error("[AdminUsers] Error formatting date:", error);
    return "-";
  }
}

function createNewUser() {
  // Implementation for new user creation
  // This would typically open a modal dialog
  console.log("Open create user dialog");
}

function editUser(user: User) {
  // Implementation for editing a user
  console.log("Edit user:", user);
}

function deleteUser(user: User) {
  // Implementation for deleting a user
  console.log("Delete user:", user);
}

// Custom initialization
onMounted(async () => {
  isLoading.value = true;

  try {
    console.log("[AdminUsers] Loading data...");

    // Fetch users and user statistics
    await Promise.all([
      adminUsersStore.fetchUsers(),
      adminUsersStore.fetchUserStats(),
    ]);

    // Reset loading state and selection
    resetState();
  } catch (error) {
    console.error("[AdminUsers] Error loading data:", error);
    if (error.message?.includes("401") || error.message?.includes("403")) {
      emit("auth-error", error);
    } else {
      emit("error", {
        message: "Fehler beim Laden der Benutzerdaten",
        error: error,
      });
    }
  } finally {
    // Only update loading state if component is still mounted
    if (isMounted.value) {
      isLoading.value = false;
    }
  }
});

// Watch for store errors
watch(storeError, (newError) => {
  if (newError) {
    emit("error", {
      message: newError,
    });
  }
});

// Log i18n initialization status
console.log(`[AdminUsers] i18n initialized with locale: ${locale.value}`);

// Log i18n initialization status
console.log(`[AdminUsers] i18n initialized with locale: ${locale.value}`);
</script>

<style lang="scss">
// Import admin-consolidated.scss in App.vue or main.scss to apply these styles globally

// User-specific styling that augments the global admin styles
.users-controls {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.users-search {
  position: relative;
  min-width: 250px;

  &__container {
    position: relative;
    display: flex;
    align-items: center;
  }

  &__icon {
    position: absolute;
    left: 0.75rem;
    color: var(--admin-text-secondary);
    pointer-events: none;
  }

  &__input {
    width: 100%;
    padding: 0.5rem 0.5rem 0.5rem 2rem;
    border: 1px solid var(--admin-border);
    border-radius: var(--admin-radius);
    font-size: var(--admin-font-size-sm);
    background-color: var(--admin-bg);

    &:focus {
      outline: none;
      border-color: var(--admin-primary);
      box-shadow: 0 0 0 2px rgba(var(--admin-primary-rgb, 0, 165, 80), 0.1);
    }
  }

  &__clear {
    position: absolute;
    right: 0.5rem;
    background: none;
    border: none;
    cursor: pointer;
    color: var(--admin-text-secondary);

    &:hover {
      color: var(--admin-text-primary);
    }
  }
}

.users-table-container {
  width: 100%;
  overflow-x: auto;
}

.sortable-header {
  cursor: pointer;

  &:hover {
    background-color: var(--admin-bg-alt);
  }

  i {
    margin-left: 0.25rem;
  }
}

.actions-header {
  width: 100px;
  text-align: center;
}

.actions-cell {
  text-align: center;
}

.user-row {
  transition: background-color 0.2s;

  &:hover {
    background-color: var(--admin-bg-alt);
  }
}

.user-actions {
  display: flex;
  justify-content: center;
  gap: 0.5rem;
}

.users-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1rem;
  text-align: center;

  .users-empty-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
    color: var(--admin-text-secondary);
    opacity: 0.5;
  }

  .users-empty-text {
    margin-bottom: 1rem;
    color: var(--admin-text-secondary);
  }
}

// Media queries for responsive design
@media (max-width: 768px) {
  .users-controls {
    flex-direction: column;
    align-items: stretch;
    width: 100%;
  }

  .users-search {
    width: 100%;
  }
}
</style>
