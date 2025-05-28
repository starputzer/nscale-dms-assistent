<template>
  <div class="admin-users">
    <div class="admin-users__header">
      <h2 class="admin-users__title">Benutzerverwaltung</h2>
      <button @click="refreshData" class="admin-btn admin-btn--primary">
        <i class="fas fa-sync-alt" v-if="!isLoading"></i>
        <i class="fas fa-spinner fa-spin" v-else></i>
        Aktualisieren
      </button>
    </div>

    <!-- User Statistics -->
    <div class="user-stats">
      <div class="stat-box">
        <i class="fas fa-users stat-box__icon"></i>
        <div class="stat-box__content">
          <div class="stat-box__value">{{ stats.total_users }}</div>
          <div class="stat-box__label">Gesamtbenutzer</div>
        </div>
      </div>
      <div class="stat-box">
        <i class="fas fa-user-check stat-box__icon stat-box__icon--success"></i>
        <div class="stat-box__content">
          <div class="stat-box__value">{{ stats.active_users_today }}</div>
          <div class="stat-box__label">Heute aktiv</div>
        </div>
      </div>
      <div class="stat-box">
        <i class="fas fa-clock stat-box__icon stat-box__icon--info"></i>
        <div class="stat-box__content">
          <div class="stat-box__value">
            {{ formatDuration(stats.avg_session_duration_min) }}
          </div>
          <div class="stat-box__label">Ø Sitzungsdauer</div>
        </div>
      </div>
    </div>

    <!-- User Table -->
    <div class="user-table-container" v-if="!isLoading">
      <div class="user-table-actions">
        <div class="search-box">
          <i class="fas fa-search search-box__icon"></i>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Benutzer suchen..."
            class="search-box__input"
          />
        </div>
        <button
          @click="showCreateModal = true"
          class="admin-btn admin-btn--success"
        >
          <i class="fas fa-plus"></i>
          Neuer Benutzer
        </button>
      </div>

      <table class="user-table" v-if="filteredUsers.length > 0">
        <thead>
          <tr>
            <th @click="sort('email')" class="sortable">
              E-Mail
              <i :class="getSortIcon('email')"></i>
            </th>
            <th @click="sort('role')" class="sortable">
              Rolle
              <i :class="getSortIcon('role')"></i>
            </th>
            <th @click="sort('created_at')" class="sortable">
              Erstellt am
              <i :class="getSortIcon('created_at')"></i>
            </th>
            <th @click="sort('last_login')" class="sortable">
              Letzte Anmeldung
              <i :class="getSortIcon('last_login')"></i>
            </th>
            <th>Aktionen</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="user in paginatedUsers"
            :key="user.id"
            :class="{ 'is-current-user': isCurrentUser(user) }"
          >
            <td>
              {{ user.email }}
              <span v-if="isCurrentUser(user)" class="current-user-badge"
                >Du</span
              >
            </td>
            <td>
              <span :class="['role-badge', `role-badge--${user.role}`]">
                {{ user.role }}
              </span>
            </td>
            <td>{{ formatDate(user.created_at) }}</td>
            <td>{{ formatDate(user.last_login) || "Nie" }}</td>
            <td>
              <div class="action-buttons">
                <button
                  @click="editUser(user)"
                  class="admin-btn admin-btn--sm admin-btn--primary"
                  :disabled="isCurrentUser(user)"
                >
                  <i class="fas fa-edit"></i>
                </button>
                <button
                  @click="confirmDeleteUser(user)"
                  class="admin-btn admin-btn--sm admin-btn--danger"
                  :disabled="isCurrentUser(user)"
                >
                  <i class="fas fa-trash"></i>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-else class="empty-state">
        <i class="fas fa-users empty-state__icon"></i>
        <p>Keine Benutzer gefunden</p>
      </div>

      <!-- Pagination -->
      <div class="pagination" v-if="totalPages > 1">
        <button
          @click="currentPage--"
          :disabled="currentPage === 1"
          class="admin-btn admin-btn--sm"
        >
          <i class="fas fa-chevron-left"></i>
        </button>
        <span class="pagination__info">
          Seite {{ currentPage }} von {{ totalPages }}
        </span>
        <button
          @click="currentPage++"
          :disabled="currentPage === totalPages"
          class="admin-btn admin-btn--sm"
        >
          <i class="fas fa-chevron-right"></i>
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-else class="loading-state">
      <i class="fas fa-spinner fa-spin loading-state__icon"></i>
      <p>Lade Benutzerdaten...</p>
    </div>

    <!-- Create/Edit User Modal -->
    <div
      v-if="showCreateModal || showEditModal"
      class="modal-overlay"
      @click="closeModals"
    >
      <div class="modal" @click.stop>
        <div class="modal__header">
          <h3>
            {{ showCreateModal ? "Neuer Benutzer" : "Benutzer bearbeiten" }}
          </h3>
          <button @click="closeModals" class="modal__close">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal__body">
          <form @submit.prevent="saveUser">
            <div class="form-group">
              <label for="userEmail">E-Mail</label>
              <input
                id="userEmail"
                v-model="userForm.email"
                type="email"
                required
                class="form-control"
                :disabled="showEditModal"
              />
            </div>
            <div class="form-group" v-if="showCreateModal">
              <label for="userPassword">Passwort</label>
              <input
                id="userPassword"
                v-model="userForm.password"
                type="password"
                required
                class="form-control"
              />
            </div>
            <div class="form-group">
              <label for="userRole">Rolle</label>
              <select
                id="userRole"
                v-model="userForm.role"
                required
                class="form-control"
              >
                <option value="user">Benutzer</option>
                <option value="admin">Administrator</option>
              </select>
            </div>
            <div class="form-actions">
              <button
                type="button"
                @click="closeModals"
                class="admin-btn admin-btn--secondary"
              >
                Abbrechen
              </button>
              <button type="submit" class="admin-btn admin-btn--primary">
                {{ showCreateModal ? "Erstellen" : "Speichern" }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div
      v-if="showDeleteModal"
      class="modal-overlay"
      @click="showDeleteModal = false"
    >
      <div class="modal modal--small" @click.stop>
        <div class="modal__header">
          <h3>Benutzer löschen</h3>
          <button @click="showDeleteModal = false" class="modal__close">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal__body">
          <p>
            Möchten Sie den Benutzer
            <strong>{{ userToDelete?.email }}</strong> wirklich löschen?
          </p>
          <p class="text-danger">
            Diese Aktion kann nicht rückgängig gemacht werden.
          </p>
        </div>
        <div class="modal__footer">
          <button
            @click="showDeleteModal = false"
            class="admin-btn admin-btn--secondary"
          >
            Abbrechen
          </button>
          <button @click="deleteUser" class="admin-btn admin-btn--danger">
            Löschen bestätigen
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { storeToRefs } from "pinia";
import { useAdminUsersStore } from "@/stores/admin/users";
import type { User } from "@/types/admin";

// Props
const props = defineProps<{
  currentUser?: User;
}>();

// Emits
const emit = defineEmits<{
  error: [error: any];
}>();

// Store
const usersStore = useAdminUsersStore();
const { users, stats, loading } = storeToRefs(usersStore);

// State
const isLoading = ref(false);
const searchQuery = ref("");
const sortBy = ref<keyof User>("created_at");
const sortOrder = ref<"asc" | "desc">("desc");
const currentPage = ref(1);
const itemsPerPage = 10;

// Modal state
const showCreateModal = ref(false);
const showEditModal = ref(false);
const showDeleteModal = ref(false);
const userToDelete = ref<User | null>(null);
const userForm = ref({
  email: "",
  password: "",
  role: "user",
});

// Computed
const filteredUsers = computed(() => {
  let result = [...(users.value || [])];

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    result = result.filter(
      (user) =>
        user.email.toLowerCase().includes(query) ||
        user.role.toLowerCase().includes(query),
    );
  }

  result.sort((a, b) => {
    const aVal = a[sortBy.value];
    const bVal = b[sortBy.value];

    if (sortOrder.value === "asc") {
      return aVal > bVal ? 1 : -1;
    } else {
      return aVal < bVal ? 1 : -1;
    }
  });

  return result;
});

const totalPages = computed(() =>
  Math.ceil(filteredUsers.value.length / itemsPerPage),
);

const paginatedUsers = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  return filteredUsers.value.slice(start, end);
});

// Methods
const refreshData = async () => {
  isLoading.value = true;
  try {
    await usersStore.fetchUsers();
    await usersStore.fetchStats();
  } catch (error) {
    emit("error", error);
  } finally {
    isLoading.value = false;
  }
};

const formatDate = (timestamp: number | null | undefined): string => {
  if (!timestamp) return "";

  try {
    // Convert UNIX timestamp (seconds) to milliseconds
    const date = new Date(timestamp * 1000);

    // Check if date is valid
    if (isNaN(date.getTime())) {
      console.warn("Invalid date timestamp:", timestamp);
      return "";
    }

    return new Intl.DateTimeFormat("de-DE", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  } catch (error) {
    console.error("Error formatting date:", error);
    return "";
  }
};

const formatDuration = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);

  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins}m`;
};

const isCurrentUser = (user: User): boolean => {
  if (!props.currentUser || !user) return false;
  return (
    props.currentUser.id === user.id || props.currentUser.email === user.email
  );
};

const sort = (field: keyof User) => {
  if (sortBy.value === field) {
    sortOrder.value = sortOrder.value === "asc" ? "desc" : "asc";
  } else {
    sortBy.value = field;
    sortOrder.value = "desc";
  }
  currentPage.value = 1;
};

const getSortIcon = (field: string) => {
  if (sortBy.value !== field) return "fas fa-sort";
  return sortOrder.value === "asc" ? "fas fa-sort-up" : "fas fa-sort-down";
};

const editUser = (user: User) => {
  userForm.value = {
    email: user.email,
    password: "",
    role: user.role,
  };
  showEditModal.value = true;
};

const confirmDeleteUser = (user: User) => {
  userToDelete.value = user;
  showDeleteModal.value = true;
};

const saveUser = async () => {
  isLoading.value = true;
  try {
    if (showCreateModal.value) {
      await usersStore.createUser(userForm.value);
    } else {
      const user = users.value.find((u) => u.email === userForm.value.email);
      if (user) {
        await usersStore.updateUser({
          userId: user.id,
          role: userForm.value.role,
        });
      }
    }
    closeModals();
    await refreshData();
  } catch (error) {
    emit("error", error);
  } finally {
    isLoading.value = false;
  }
};

const deleteUser = async () => {
  if (!userToDelete.value) return;

  isLoading.value = true;
  try {
    await usersStore.deleteUser(userToDelete.value.id);
    showDeleteModal.value = false;
    await refreshData();
  } catch (error) {
    emit("error", error);
  } finally {
    isLoading.value = false;
  }
};

const closeModals = () => {
  showCreateModal.value = false;
  showEditModal.value = false;
  userForm.value = {
    email: "",
    password: "",
    role: "user",
  };
};

// Lifecycle
onMounted(() => {
  refreshData();
});

// Watch for page changes
watch(currentPage, () => {
  window.scrollTo(0, 0);
});
</script>

<style lang="scss" scoped>
.admin-users {
  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
  }

  &__title {
    font-size: 24px;
    font-weight: 600;
    margin: 0;
  }
}

// Statistics
.user-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.stat-box {
  background: var(--bg-secondary);
  border-radius: 8px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 2px 4px var(--shadow);

  &__icon {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    background: var(--bg-tertiary);
    color: var(--accent-primary);

    &--success {
      color: var(--accent-success);
    }

    &--info {
      color: var(--accent-info);
    }
  }

  &__content {
    flex: 1;
  }

  &__value {
    font-size: 20px;
    font-weight: 600;
    margin-bottom: 4px;
  }

  &__label {
    font-size: 14px;
    color: var(--text-secondary);
  }
}

// Table
.user-table-container {
  background: var(--bg-secondary);
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 4px var(--shadow);
}

.user-table-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  gap: 16px;
}

.search-box {
  position: relative;
  flex: 1;
  max-width: 400px;

  &__icon {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--text-secondary);
  }

  &__input {
    width: 100%;
    padding: 8px 16px 8px 36px;
    border: 1px solid var(--border);
    border-radius: 4px;
    background: var(--bg-primary);
    color: var(--text-primary);

    &:focus {
      outline: none;
      border-color: var(--accent-primary);
    }
  }
}

.user-table {
  width: 100%;
  border-collapse: collapse;

  th,
  td {
    padding: 12px;
    text-align: left;
    border-bottom: 1px solid var(--border);
  }

  th {
    font-weight: 600;
    color: var(--text-secondary);

    &.sortable {
      cursor: pointer;
      user-select: none;

      &:hover {
        color: var(--text-primary);
      }

      i {
        margin-left: 8px;
        font-size: 12px;
      }
    }
  }

  tr {
    transition: background-color 0.2s;

    &:hover {
      background-color: var(--bg-tertiary);
    }

    &.is-current-user {
      background-color: rgba(74, 144, 226, 0.1);
    }
  }

  td {
    position: relative;
  }
}

.current-user-badge {
  display: inline-block;
  margin-left: 8px;
  padding: 2px 8px;
  font-size: 12px;
  background-color: var(--accent-primary);
  color: white;
  border-radius: 12px;
}

.role-badge {
  display: inline-block;
  padding: 4px 12px;
  font-size: 14px;
  border-radius: 4px;
  font-weight: 500;

  &--admin {
    background-color: var(--accent-success);
    color: white;
  }

  &--user {
    background-color: var(--accent-info);
    color: white;
  }
}

.action-buttons {
  display: flex;
  gap: 8px;
}

// Buttons
.admin-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  display: inline-flex;
  align-items: center;
  gap: 8px;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &--primary {
    background-color: var(--accent-primary);
    color: white;

    &:hover:not(:disabled) {
      background-color: darken($color: #4a90e2, $amount: 10%);
    }
  }

  &--success {
    background-color: var(--accent-success);
    color: white;

    &:hover:not(:disabled) {
      background-color: darken($color: #52c41a, $amount: 10%);
    }
  }

  &--danger {
    background-color: var(--accent-danger);
    color: white;

    &:hover:not(:disabled) {
      background-color: darken($color: #f5222d, $amount: 10%);
    }
  }

  &--secondary {
    background-color: var(--bg-tertiary);
    color: var(--text-primary);

    &:hover:not(:disabled) {
      background-color: var(--bg-primary);
    }
  }

  &--sm {
    padding: 4px 8px;
    font-size: 13px;
  }
}

// States
.empty-state,
.loading-state {
  text-align: center;
  padding: 60px 20px;
  color: var(--text-secondary);

  &__icon {
    font-size: 48px;
    margin-bottom: 16px;
    color: var(--text-secondary);
  }

  p {
    font-size: 16px;
    margin: 0;
  }
}

// Pagination
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  margin-top: 20px;

  &__info {
    font-size: 14px;
    color: var(--text-secondary);
  }
}

// Modals
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background-color: var(--bg-secondary);
  border-radius: 8px;
  width: 90%;
  max-width: 500px;
  box-shadow: 0 8px 16px var(--shadow);

  &--small {
    max-width: 400px;
  }

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px;
    border-bottom: 1px solid var(--border);

    h3 {
      margin: 0;
      font-size: 20px;
      font-weight: 600;
    }
  }

  &__close {
    width: 32px;
    height: 32px;
    border: none;
    background: none;
    color: var(--text-secondary);
    font-size: 20px;
    cursor: pointer;
    transition: color 0.3s ease;

    &:hover {
      color: var(--text-primary);
    }
  }

  &__body {
    padding: 20px;
  }

  &__footer {
    padding: 20px;
    border-top: 1px solid var(--border);
    display: flex;
    justify-content: flex-end;
    gap: 12px;
  }
}

// Forms
.form-group {
  margin-bottom: 16px;

  label {
    display: block;
    margin-bottom: 8px;
    font-weight: 500;
  }
}

.form-control {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 14px;

  &:focus {
    outline: none;
    border-color: var(--accent-primary);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
}

// Utilities
.text-danger {
  color: var(--accent-danger);
}
</style>
