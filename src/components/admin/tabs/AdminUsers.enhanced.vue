<template>
  <div class="admin-users">
    <h2 class="admin-users__title">
      {{ t("admin.users.title", "Benutzerverwaltung") }}
    </h2>
    <p class="admin-users__description">
      {{
        t(
          "admin.users.description",
          "Verwalten Sie Benutzerkonten und Berechtigungen.",
        )
      }}
    </p>

    <!-- User Statistics Summary -->
    <div class="admin-users__stats">
      <div class="admin-users__stat-card">
        <div class="admin-users__stat-icon">
          <i class="fas fa-users" aria-hidden="true"></i>
        </div>
        <div class="admin-users__stat-content">
          <h3 class="admin-users__stat-label">
            {{ t("admin.users.totalUsers", "Gesamtzahl der Benutzer") }}
          </h3>
          <p class="admin-users__stat-value">{{ totalUsers }}</p>
        </div>
      </div>
      <div class="admin-users__stat-card">
        <div class="admin-users__stat-icon admin-users__stat-icon--admin">
          <i class="fas fa-user-shield" aria-hidden="true"></i>
        </div>
        <div class="admin-users__stat-content">
          <h3 class="admin-users__stat-label">
            {{ t("admin.users.adminUsers", "Administratoren") }}
          </h3>
          <p class="admin-users__stat-value">{{ adminUsers.length }}</p>
        </div>
      </div>
      <div class="admin-users__stat-card">
        <div class="admin-users__stat-icon admin-users__stat-icon--user">
          <i class="fas fa-user" aria-hidden="true"></i>
        </div>
        <div class="admin-users__stat-content">
          <h3 class="admin-users__stat-label">
            {{ t("admin.users.standardUsers", "Standardbenutzer") }}
          </h3>
          <p class="admin-users__stat-value">{{ standardUsers.length }}</p>
        </div>
      </div>
    </div>

    <!-- User Controls -->
    <div class="admin-users__controls">
      <!-- Search and Filter -->
      <div class="admin-users__search">
        <div class="admin-users__search-input-container">
          <i
            class="fas fa-search admin-users__search-icon"
            aria-hidden="true"
          ></i>
          <input
            v-model="searchQuery"
            type="text"
            class="admin-users__search-input"
            :placeholder="
              t('admin.users.search.placeholder', 'Benutzer suchen...')
            "
          />
          <button
            v-if="searchQuery"
            @click="searchQuery = ''"
            class="admin-users__search-clear"
            aria-label="Suche zurücksetzen"
          >
            <i class="fas fa-times" aria-hidden="true"></i>
          </button>
        </div>
      </div>

      <!-- Create User Button -->
      <button
        @click="openCreateUserModal"
        class="admin-users__create-button"
        :disabled="isLoading"
      >
        <i class="fas fa-user-plus" aria-hidden="true"></i>
        {{ t("admin.users.create", "Neuen Benutzer anlegen") }}
      </button>
    </div>

    <!-- Users Table -->
    <div class="admin-users__table-container">
      <table v-if="filteredUsers.length > 0" class="admin-users__table">
        <thead>
          <tr>
            <th
              @click="sortBy('email')"
              class="admin-users__table-header"
              :class="{
                'admin-users__table-header--sorted': sortField === 'email',
              }"
            >
              {{ t("admin.users.table.email", "E-Mail") }}
              <i
                v-if="sortField === 'email'"
                class="fas"
                :class="sortDirection === 'asc' ? 'fa-sort-up' : 'fa-sort-down'"
                aria-hidden="true"
              ></i>
            </th>
            <th
              @click="sortBy('role')"
              class="admin-users__table-header"
              :class="{
                'admin-users__table-header--sorted': sortField === 'role',
              }"
            >
              {{ t("admin.users.table.role", "Rolle") }}
              <i
                v-if="sortField === 'role'"
                class="fas"
                :class="sortDirection === 'asc' ? 'fa-sort-up' : 'fa-sort-down'"
                aria-hidden="true"
              ></i>
            </th>
            <th
              @click="sortBy('created_at')"
              class="admin-users__table-header"
              :class="{
                'admin-users__table-header--sorted': sortField === 'created_at',
              }"
            >
              {{ t("admin.users.table.created", "Erstellt am") }}
              <i
                v-if="sortField === 'created_at'"
                class="fas"
                :class="sortDirection === 'asc' ? 'fa-sort-up' : 'fa-sort-down'"
                aria-hidden="true"
              ></i>
            </th>
            <th
              @click="sortBy('last_login')"
              class="admin-users__table-header"
              :class="{
                'admin-users__table-header--sorted': sortField === 'last_login',
              }"
            >
              {{ t("admin.users.table.lastLogin", "Letzter Login") }}
              <i
                v-if="sortField === 'last_login'"
                class="fas"
                :class="sortDirection === 'asc' ? 'fa-sort-up' : 'fa-sort-down'"
                aria-hidden="true"
              ></i>
            </th>
            <th
              class="admin-users__table-header admin-users__table-header--actions"
            >
              {{ t("admin.users.table.actions", "Aktionen") }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="user in filteredUsers"
            :key="user.id"
            class="admin-users__table-row"
          >
            <td class="admin-users__table-cell">{{ user.email }}</td>
            <td class="admin-users__table-cell">
              <span
                class="admin-users__role-badge"
                :class="`admin-users__role-badge--${user.role}`"
              >
                {{ t(`admin.users.roles.${user.role}`, user.role) }}
              </span>
            </td>
            <td class="admin-users__table-cell">
              {{ formatDate(user.created_at) }}
            </td>
            <td class="admin-users__table-cell">
              {{
                user.last_login
                  ? formatDate(user.last_login)
                  : t("admin.users.table.never", "Nie")
              }}
            </td>
            <td
              class="admin-users__table-cell admin-users__table-cell--actions"
            >
              <div class="admin-users__actions">
                <button
                  @click="openEditRoleModal(user)"
                  class="admin-users__action-button admin-users__action-button--edit"
                  :disabled="isCurrentUser(user) || isLoading"
                  :title="t('admin.users.actions.editRole', 'Rolle bearbeiten')"
                >
                  <i class="fas fa-user-edit" aria-hidden="true"></i>
                </button>
                <button
                  @click="confirmDeleteUser(user)"
                  class="admin-users__action-button admin-users__action-button--delete"
                  :disabled="
                    isCurrentUser(user) || user.role === 'admin' || isLoading
                  "
                  :title="t('admin.users.actions.delete', 'Benutzer löschen')"
                >
                  <i class="fas fa-trash-alt" aria-hidden="true"></i>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Empty State -->
      <div v-else class="admin-users__empty-state">
        <i class="fas fa-users" aria-hidden="true"></i>
        <p v-if="searchQuery">
          {{
            t(
              "admin.users.noSearchResults",
              "Keine Benutzer gefunden, die mit Ihrer Suche übereinstimmen.",
            )
          }}
        </p>
        <p v-else>
          {{ t("admin.users.noUsers", "Keine Benutzer vorhanden.") }}
        </p>
        <button
          v-if="searchQuery"
          @click="searchQuery = ''"
          class="admin-users__clear-search"
        >
          {{ t("admin.users.clearSearch", "Suche zurücksetzen") }}
        </button>
      </div>
    </div>

    <!-- Create User Modal -->
    <dialog
      ref="createUserDialog"
      class="admin-users__modal"
      @close="resetForm"
    >
      <div class="admin-users__modal-content">
        <div class="admin-users__modal-header">
          <h3>
            {{ t("admin.users.modal.createTitle", "Neuen Benutzer anlegen") }}
          </h3>
          <button
            @click="closeCreateUserModal"
            class="admin-users__modal-close"
            aria-label="Schließen"
          >
            <i class="fas fa-times" aria-hidden="true"></i>
          </button>
        </div>

        <form @submit.prevent="createUser" class="admin-users__form">
          <div class="admin-users__form-group">
            <label for="email" class="admin-users__form-label">
              {{ t("admin.users.form.email", "E-Mail-Adresse") }} *
            </label>
            <div class="admin-users__form-input-container">
              <input
                id="email"
                v-model="newUser.email"
                type="email"
                class="admin-users__form-input"
                :class="{
                  'admin-users__form-input--error': validationErrors.email,
                }"
                required
              />
              <span
                v-if="validationErrors.email"
                class="admin-users__form-error"
              >
                {{ validationErrors.email }}
              </span>
            </div>
          </div>

          <div class="admin-users__form-group">
            <label for="password" class="admin-users__form-label">
              {{ t("admin.users.form.password", "Passwort") }} *
            </label>
            <div class="admin-users__form-input-container">
              <div class="admin-users__password-input-wrapper">
                <input
                  id="password"
                  v-model="newUser.password"
                  :type="showPassword ? 'text' : 'password'"
                  class="admin-users__form-input"
                  :class="{
                    'admin-users__form-input--error': validationErrors.password,
                  }"
                  required
                />
                <button
                  type="button"
                  class="admin-users__password-toggle"
                  @click="showPassword = !showPassword"
                  :aria-label="
                    showPassword ? 'Passwort verbergen' : 'Passwort anzeigen'
                  "
                >
                  <i
                    class="fas"
                    :class="showPassword ? 'fa-eye-slash' : 'fa-eye'"
                    aria-hidden="true"
                  ></i>
                </button>
              </div>
              <span
                v-if="validationErrors.password"
                class="admin-users__form-error"
              >
                {{ validationErrors.password }}
              </span>
            </div>
          </div>

          <div class="admin-users__form-group">
            <label for="role" class="admin-users__form-label">
              {{ t("admin.users.form.role", "Rolle") }} *
            </label>
            <div class="admin-users__form-input-container">
              <select
                id="role"
                v-model="newUser.role"
                class="admin-users__form-select"
                required
              >
                <option value="user">
                  {{ t("admin.users.roles.user", "Benutzer") }}
                </option>
                <option value="admin">
                  {{ t("admin.users.roles.admin", "Administrator") }}
                </option>
              </select>
            </div>
          </div>

          <div class="admin-users__form-actions">
            <button
              type="button"
              @click="closeCreateUserModal"
              class="admin-users__form-button admin-users__form-button--cancel"
              :disabled="isSubmitting"
            >
              {{ t("admin.users.form.cancel", "Abbrechen") }}
            </button>
            <button
              type="submit"
              class="admin-users__form-button admin-users__form-button--submit"
              :disabled="isSubmitting"
            >
              <i
                v-if="isSubmitting"
                class="fas fa-spinner fa-spin"
                aria-hidden="true"
              ></i>
              {{ t("admin.users.form.create", "Benutzer anlegen") }}
            </button>
          </div>
        </form>
      </div>
    </dialog>

    <!-- Edit Role Modal -->
    <dialog ref="editRoleDialog" class="admin-users__modal">
      <div class="admin-users__modal-content">
        <div class="admin-users__modal-header">
          <h3>
            {{
              t("admin.users.modal.editRoleTitle", "Benutzerrolle bearbeiten")
            }}
          </h3>
          <button
            @click="closeEditRoleModal"
            class="admin-users__modal-close"
            aria-label="Schließen"
          >
            <i class="fas fa-times" aria-hidden="true"></i>
          </button>
        </div>

        <form
          v-if="selectedUser"
          @submit.prevent="updateUserRole"
          class="admin-users__form"
        >
          <div class="admin-users__user-info">
            <strong>{{ selectedUser.email }}</strong>
          </div>

          <div class="admin-users__form-group">
            <label for="edit-role" class="admin-users__form-label">
              {{ t("admin.users.form.role", "Rolle") }} *
            </label>
            <div class="admin-users__form-input-container">
              <select
                id="edit-role"
                v-model="selectedRole"
                class="admin-users__form-select"
                required
              >
                <option value="user">
                  {{ t("admin.users.roles.user", "Benutzer") }}
                </option>
                <option value="admin">
                  {{ t("admin.users.roles.admin", "Administrator") }}
                </option>
              </select>
            </div>
          </div>

          <div class="admin-users__form-actions">
            <button
              type="button"
              @click="closeEditRoleModal"
              class="admin-users__form-button admin-users__form-button--cancel"
              :disabled="isSubmitting"
            >
              {{ t("admin.users.form.cancel", "Abbrechen") }}
            </button>
            <button
              type="submit"
              class="admin-users__form-button admin-users__form-button--submit"
              :disabled="isSubmitting"
            >
              <i
                v-if="isSubmitting"
                class="fas fa-spinner fa-spin"
                aria-hidden="true"
              ></i>
              {{ t("admin.users.form.update", "Rolle aktualisieren") }}
            </button>
          </div>
        </form>
      </div>
    </dialog>

    <!-- Confirm Delete Modal -->
    <dialog ref="confirmDeleteDialog" class="admin-users__modal">
      <div class="admin-users__modal-content">
        <div class="admin-users__modal-header">
          <h3>{{ t("admin.users.modal.deleteTitle", "Benutzer löschen") }}</h3>
          <button
            @click="closeConfirmDeleteModal"
            class="admin-users__modal-close"
            aria-label="Schließen"
          >
            <i class="fas fa-times" aria-hidden="true"></i>
          </button>
        </div>

        <div v-if="selectedUser" class="admin-users__confirm-delete">
          <i
            class="fas fa-exclamation-triangle admin-users__confirm-icon"
            aria-hidden="true"
          ></i>

          <p class="admin-users__confirm-message">
            {{
              t(
                "admin.users.modal.deleteConfirmation",
                "Sind Sie sicher, dass Sie den folgenden Benutzer löschen möchten?",
              )
            }}
          </p>

          <div class="admin-users__user-info">
            <strong>{{ selectedUser.email }}</strong>
          </div>

          <p class="admin-users__delete-warning">
            {{
              t(
                "admin.users.modal.deleteWarning",
                "Diese Aktion kann nicht rückgängig gemacht werden. Alle Daten des Benutzers werden gelöscht.",
              )
            }}
          </p>

          <div class="admin-users__form-actions">
            <button
              type="button"
              @click="closeConfirmDeleteModal"
              class="admin-users__form-button admin-users__form-button--cancel"
              :disabled="isSubmitting"
            >
              {{ t("admin.users.form.cancel", "Abbrechen") }}
            </button>
            <button
              type="button"
              @click="deleteUser"
              class="admin-users__form-button admin-users__form-button--danger"
              :disabled="isSubmitting"
            >
              <i
                v-if="isSubmitting"
                class="fas fa-spinner fa-spin"
                aria-hidden="true"
              ></i>
              {{ t("admin.users.form.delete", "Löschen") }}
            </button>
          </div>
        </div>
      </div>
    </dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, defineEmits } from "vue";
import { useI18n } from "vue-i18n";
import { storeToRefs } from "pinia";
import { useAdminUsersStore } from "@/stores/admin/users";
import { useAuthStore } from "@/stores/auth";
import { useToast } from "@/composables/useToast";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import type { User, NewUser, UserRole } from "@/types/admin";

// Define emits
const emit = defineEmits(["error", "auth-error", "reload"]);

// i18n
const { t } = useI18n();

// Stores
const adminUsersStore = useAdminUsersStore();
const authStore = useAuthStore();

// Store state
const {
  users,
  loading: storeLoading,
  error: storeError,
} = storeToRefs(adminUsersStore);
const { currentUser } = storeToRefs(authStore);

// Toast notifications
const { showToast } = useToast();

// Local state
const isLoading = ref(false);
const isSubmitting = ref(false);
const searchQuery = ref("");
const sortField = ref<keyof User>("email");
const sortDirection = ref<"asc" | "desc">("asc");
const showPassword = ref(false);

// Modal refs
const createUserDialog = ref<HTMLDialogElement | null>(null);
const editRoleDialog = ref<HTMLDialogElement | null>(null);
const confirmDeleteDialog = ref<HTMLDialogElement | null>(null);

// Form state
const newUser = ref<NewUser>({
  email: "",
  password: "",
  role: "user" as UserRole,
});

const validationErrors = ref({
  email: "",
  password: "",
});

const selectedUser = ref<User | null>(null);
const selectedRole = ref<UserRole>("user");

// Computed properties
const adminUsers = computed(() => {
  return adminUsersStore.adminUsers;
});

const standardUsers = computed(() => {
  return adminUsersStore.standardUsers;
});

const totalUsers = computed(() => {
  return adminUsersStore.totalUsers;
});

const filteredUsers = computed(() => {
  // Filter by search query
  let result = users.value;

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
    const fieldA = a[sortField.value];
    const fieldB = b[sortField.value];

    // Handle null values
    if (fieldA === null && fieldB === null) return 0;
    if (fieldA === null) return 1;
    if (fieldB === null) return -1;

    // Compare values
    if (typeof fieldA === "string" && typeof fieldB === "string") {
      return sortDirection.value === "asc"
        ? fieldA.localeCompare(fieldB)
        : fieldB.localeCompare(fieldA);
    } else {
      // For dates or numbers
      return sortDirection.value === "asc"
        ? Number(fieldA) - Number(fieldB)
        : Number(fieldB) - Number(fieldA);
    }
  });

  return result;
});

// Methods
function isCurrentUser(user: User): boolean {
  // Add null checks to prevent "cannot read properties of undefined (reading 'value')"
  if (!user || !currentUser || !currentUser.value) {
    return false;
  }
  return user.id === currentUser.value.id;
}

function sortBy(field: keyof User) {
  if (sortField.value === field) {
    // Toggle sort direction
    sortDirection.value = sortDirection.value === "asc" ? "desc" : "asc";
  } else {
    // Set new sort field and default to ascending
    sortField.value = field;
    sortDirection.value = "asc";
  }
}

function formatDate(timestamp: number): string {
  try {
    return format(new Date(timestamp), "dd.MM.yyyy HH:mm", { locale: de });
  } catch (error) {
    console.error("Error formatting date:", error);
    return "";
  }
}

function validateForm(): boolean {
  validationErrors.value = {
    email: "",
    password: "",
  };

  let isValid = true;

  // Validate email
  if (!newUser.value.email) {
    validationErrors.value.email = t(
      "admin.users.validation.emailRequired",
      "E-Mail-Adresse ist erforderlich",
    );
    isValid = false;
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newUser.value.email)) {
    validationErrors.value.email = t(
      "admin.users.validation.emailInvalid",
      "Ungültige E-Mail-Adresse",
    );
    isValid = false;
  }

  // Validate password
  if (!newUser.value.password) {
    validationErrors.value.password = t(
      "admin.users.validation.passwordRequired",
      "Passwort ist erforderlich",
    );
    isValid = false;
  } else if (newUser.value.password.length < 8) {
    validationErrors.value.password = t(
      "admin.users.validation.passwordTooShort",
      "Passwort muss mindestens 8 Zeichen lang sein",
    );
    isValid = false;
  }

  return isValid;
}

// Modal methods using safe element access
function openCreateUserModal() {
  // Only proceed if component is mounted
  if (!isMounted.value) return;

  // Safely access the dialog element
  const dialog = safeElementAccess(createUserDialog);
  if (dialog) {
    resetForm();
    safeMountedExecution(() => dialog.showModal());
  }
}

function closeCreateUserModal() {
  const dialog = safeElementAccess(createUserDialog);
  if (dialog) {
    safeMountedExecution(() => dialog.close());
  }
}

function openEditRoleModal(user: User) {
  // Only proceed if component is mounted
  if (!isMounted.value) return;

  safeMountedExecution(() => {
    selectedUser.value = user;
    selectedRole.value = user.role;
  });

  const dialog = safeElementAccess(editRoleDialog);
  if (dialog) {
    safeMountedExecution(() => dialog.showModal());
  }
}

function closeEditRoleModal() {
  const dialog = safeElementAccess(editRoleDialog);
  if (dialog) {
    safeMountedExecution(() => {
      dialog.close();
      selectedUser.value = null;
    });
  }
}

function confirmDeleteUser(user: User) {
  // Only proceed if component is mounted
  if (!isMounted.value) return;

  safeMountedExecution(() => {
    selectedUser.value = user;
  });

  const dialog = safeElementAccess(confirmDeleteDialog);
  if (dialog) {
    safeMountedExecution(() => dialog.showModal());
  }
}

function closeConfirmDeleteModal() {
  const dialog = safeElementAccess(confirmDeleteDialog);
  if (dialog) {
    safeMountedExecution(() => {
      dialog.close();
      selectedUser.value = null;
    });
  }
}

// Safe element access helper that leverages the component lifecycle state
function safeElementAccess<T>(elementRef: { value: T | null }): T | null {
  // Only allow access if component is mounted
  if (!isMounted.value) return null;

  // Check if the ref exists and has a value
  return elementRef?.value || null;
}

function resetForm() {
  newUser.value = {
    email: "",
    password: "",
    role: "user" as UserRole,
  };

  validationErrors.value = {
    email: "",
    password: "",
  };

  showPassword.value = false;
}

// API actions
async function createUser() {
  if (!validateForm()) return;

  isSubmitting.value = true;

  try {
    await adminUsersStore.createUser(newUser.value);
    showToast({
      type: "success",
      title: t("admin.users.toast.createSuccess", "Benutzer erstellt"),
      message: t(
        "admin.users.toast.createSuccessMessage",
        "Der Benutzer wurde erfolgreich erstellt",
      ),
    });
    closeCreateUserModal();
  } catch (error: any) {
    const errorMessage =
      error?.response?.data?.message ||
      t(
        "admin.users.error.createFailed",
        "Benutzer konnte nicht erstellt werden",
      );

    showToast({
      type: "error",
      title: t("admin.users.toast.createError", "Fehler"),
      message: errorMessage,
    });

    console.error("Error creating user:", error);
  } finally {
    isSubmitting.value = false;
  }
}

async function updateUserRole() {
  if (!selectedUser.value) return;

  isSubmitting.value = true;

  try {
    await adminUsersStore.updateUserRole(
      selectedUser.value.id,
      selectedRole.value,
    );
    showToast({
      type: "success",
      title: t("admin.users.toast.updateSuccess", "Rolle aktualisiert"),
      message: t(
        "admin.users.toast.updateSuccessMessage",
        "Die Benutzerrolle wurde erfolgreich aktualisiert",
      ),
    });
    closeEditRoleModal();
  } catch (error: any) {
    const errorMessage =
      error?.response?.data?.message ||
      t(
        "admin.users.error.updateFailed",
        "Rolle konnte nicht aktualisiert werden",
      );

    showToast({
      type: "error",
      title: t("admin.users.toast.updateError", "Fehler"),
      message: errorMessage,
    });

    console.error("Error updating user role:", error);
  } finally {
    isSubmitting.value = false;
  }
}

async function deleteUser() {
  if (!selectedUser.value) return;

  isSubmitting.value = true;

  try {
    await adminUsersStore.deleteUser(selectedUser.value.id);
    showToast({
      type: "success",
      title: t("admin.users.toast.deleteSuccess", "Benutzer gelöscht"),
      message: t(
        "admin.users.toast.deleteSuccessMessage",
        "Der Benutzer wurde erfolgreich gelöscht",
      ),
    });
    closeConfirmDeleteModal();
  } catch (error: any) {
    const errorMessage =
      error?.response?.data?.message ||
      t(
        "admin.users.error.deleteFailed",
        "Benutzer konnte nicht gelöscht werden",
      );

    showToast({
      type: "error",
      title: t("admin.users.toast.deleteError", "Fehler"),
      message: errorMessage,
    });

    console.error("Error deleting user:", error);
  } finally {
    isSubmitting.value = false;
  }
}

// Lifecycle management with safe component access
import { initializeAdminComponent } from "@/utils/adminComponentInitializer";

const { isMounted, safeMountedExecution } = initializeAdminComponent({
  componentName: "AdminUsers",
  loadData: async () => {
    isLoading.value = true;

    try {
      await adminUsersStore.fetchUsers();
    } catch (error) {
      console.error("Error fetching users:", error);
      // Only show toast if component is still mounted
      if (isMounted.value) {
        showToast({
          type: "error",
          title: t("admin.users.toast.loadError", "Fehler"),
          message: t(
            "admin.users.error.loadFailed",
            "Benutzer konnten nicht geladen werden",
          ),
        });
      }
      // Re-throw to allow the initializer to handle it properly
      throw error;
    } finally {
      // Only update loading state if component is still mounted
      if (isMounted.value) {
        isLoading.value = false;
      }
    }
  },
  emit,
  errorMessage: "Fehler beim Laden der Benutzerdaten",
  context: { component: "AdminUsers" },
});

// Watch for store errors
watch(storeError, (newError) => {
  if (newError) {
    showToast({
      type: "error",
      title: t("admin.users.toast.error", "Fehler"),
      message: newError,
    });
  }
});
</script>

<style scoped>
.admin-users {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.admin-users__title {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--n-color-text-primary);
}

.admin-users__description {
  margin: 0;
  color: var(--n-color-text-secondary);
  line-height: 1.5;
}

/* Stats Section */
.admin-users__stats {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1rem;
}

.admin-users__stat-card {
  display: flex;
  align-items: center;
  padding: 1rem;
  background-color: var(--n-color-background-alt);
  border-radius: var(--n-border-radius);
  box-shadow: var(--n-shadow-sm);
}

.admin-users__stat-icon {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 3rem;
  height: 3rem;
  margin-right: 1rem;
  border-radius: 50%;
  background-color: rgba(var(--n-color-primary-rgb), 0.1);
  color: var(--n-color-primary);
  font-size: 1.25rem;
}

.admin-users__stat-icon--admin {
  background-color: rgba(var(--n-color-success-rgb), 0.1);
  color: var(--n-color-success);
}

.admin-users__stat-icon--user {
  background-color: rgba(var(--n-color-info-rgb), 0.1);
  color: var(--n-color-info);
}

.admin-users__stat-content {
  flex: 1;
}

.admin-users__stat-label {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--n-color-text-secondary);
}

.admin-users__stat-value {
  margin: 0.25rem 0 0 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--n-color-text-primary);
}

/* Controls Section */
.admin-users__controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
}

.admin-users__search {
  flex: 1;
  min-width: 250px;
}

.admin-users__search-input-container {
  position: relative;
  display: flex;
  align-items: center;
}

.admin-users__search-icon {
  position: absolute;
  left: 0.75rem;
  color: var(--n-color-text-tertiary);
}

.admin-users__search-input {
  width: 100%;
  padding: 0.625rem 2.5rem;
  border: 1px solid var(--n-color-border);
  border-radius: var(--n-border-radius);
  background-color: var(--n-color-background);
  color: var(--n-color-text-primary);
  font-size: 0.875rem;
}

.admin-users__search-clear {
  position: absolute;
  right: 0.75rem;
  background: none;
  border: none;
  color: var(--n-color-text-tertiary);
  cursor: pointer;
  padding: 0;
  font-size: 0.875rem;
}

.admin-users__create-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1rem;
  background-color: var(--n-color-primary);
  color: var(--n-color-on-primary);
  border: none;
  border-radius: var(--n-border-radius);
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.admin-users__create-button:hover {
  background-color: var(--n-color-primary-dark);
}

.admin-users__create-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

/* Table Section */
.admin-users__table-container {
  overflow-x: auto;
  border-radius: var(--n-border-radius);
  border: 1px solid var(--n-color-border);
  background-color: var(--n-color-background);
}

.admin-users__table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}

.admin-users__table-header {
  padding: 0.75rem 1rem;
  text-align: left;
  background-color: var(--n-color-background-alt);
  color: var(--n-color-text-primary);
  font-weight: 600;
  cursor: pointer;
  user-select: none;
  transition: background-color 0.2s;
  white-space: nowrap;
}

.admin-users__table-header:hover {
  background-color: var(--n-color-hover);
}

.admin-users__table-header--sorted {
  background-color: rgba(var(--n-color-primary-rgb), 0.05);
}

.admin-users__table-header--actions {
  width: 100px;
  text-align: center;
  cursor: default;
}

.admin-users__table-header--actions:hover {
  background-color: var(--n-color-background-alt);
}

.admin-users__table-row {
  border-bottom: 1px solid var(--n-color-border);
  transition: background-color 0.2s;
}

.admin-users__table-row:hover {
  background-color: var(--n-color-hover);
}

.admin-users__table-row:last-child {
  border-bottom: none;
}

.admin-users__table-cell {
  padding: 0.75rem 1rem;
  color: var(--n-color-text-primary);
  vertical-align: middle;
}

.admin-users__table-cell--actions {
  text-align: center;
}

.admin-users__role-badge {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  font-weight: 500;
  border-radius: 1rem;
  text-transform: capitalize;
}

.admin-users__role-badge--admin {
  background-color: rgba(var(--n-color-success-rgb), 0.1);
  color: var(--n-color-success);
  border: 1px solid var(--n-color-success);
}

.admin-users__role-badge--user {
  background-color: rgba(var(--n-color-info-rgb), 0.1);
  color: var(--n-color-info);
  border: 1px solid var(--n-color-info);
}

.admin-users__actions {
  display: flex;
  justify-content: center;
  gap: 0.5rem;
}

.admin-users__action-button {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  border: none;
  background-color: transparent;
  color: var(--n-color-text-primary);
  cursor: pointer;
  transition: all 0.2s;
}

.admin-users__action-button--edit:hover {
  background-color: rgba(var(--n-color-primary-rgb), 0.1);
  color: var(--n-color-primary);
}

.admin-users__action-button--delete:hover {
  background-color: rgba(var(--n-color-error-rgb), 0.1);
  color: var(--n-color-error);
}

.admin-users__action-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Empty State */
.admin-users__empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1rem;
  text-align: center;
  color: var(--n-color-text-tertiary);
}

.admin-users__empty-state i {
  font-size: 3rem;
  margin-bottom: 1rem;
  opacity: 0.5;
}

.admin-users__clear-search {
  margin-top: 1rem;
  padding: 0.5rem 1rem;
  background-color: transparent;
  border: 1px solid var(--n-color-border);
  border-radius: var(--n-border-radius);
  color: var(--n-color-primary);
  cursor: pointer;
  transition: all 0.2s;
}

.admin-users__clear-search:hover {
  background-color: var(--n-color-background-alt);
  border-color: var(--n-color-primary);
}

/* Modal Styles */
.admin-users__modal {
  padding: 0;
  border: none;
  border-radius: var(--n-border-radius);
  box-shadow: var(--n-shadow-lg);
  max-width: 500px;
  width: 90%;
}

.admin-users__modal::backdrop {
  background-color: rgba(0, 0, 0, 0.5);
}

.admin-users__modal-content {
  padding: 0;
}

.admin-users__modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  background-color: var(--n-color-background-alt);
  border-bottom: 1px solid var(--n-color-border);
  border-top-left-radius: var(--n-border-radius);
  border-top-right-radius: var(--n-border-radius);
}

.admin-users__modal-header h3 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--n-color-text-primary);
}

.admin-users__modal-close {
  background: none;
  border: none;
  font-size: 1rem;
  color: var(--n-color-text-secondary);
  cursor: pointer;
  transition: color 0.2s;
}

.admin-users__modal-close:hover {
  color: var(--n-color-error);
}

/* Form Styles */
.admin-users__form {
  padding: 1.5rem;
}

.admin-users__form-group {
  margin-bottom: 1.25rem;
}

.admin-users__form-label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: var(--n-color-text-primary);
}

.admin-users__form-input-container {
  position: relative;
}

.admin-users__form-input,
.admin-users__form-select {
  width: 100%;
  padding: 0.625rem;
  border: 1px solid var(--n-color-border);
  border-radius: var(--n-border-radius);
  background-color: var(--n-color-background);
  color: var(--n-color-text-primary);
  font-size: 0.875rem;
  transition: border-color 0.2s;
}

.admin-users__form-input:focus,
.admin-users__form-select:focus {
  border-color: var(--n-color-primary);
  outline: none;
}

.admin-users__form-input--error {
  border-color: var(--n-color-error);
}

.admin-users__form-error {
  display: block;
  margin-top: 0.375rem;
  color: var(--n-color-error);
  font-size: 0.75rem;
}

.admin-users__password-input-wrapper {
  position: relative;
}

.admin-users__password-toggle {
  position: absolute;
  right: 0.625rem;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: var(--n-color-text-tertiary);
  cursor: pointer;
  padding: 0.25rem;
}

.admin-users__form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1.5rem;
}

.admin-users__form-button {
  padding: 0.625rem 1rem;
  border-radius: var(--n-border-radius);
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.admin-users__form-button--cancel {
  background-color: transparent;
  border: 1px solid var(--n-color-border);
  color: var(--n-color-text-primary);
}

.admin-users__form-button--cancel:hover {
  background-color: var(--n-color-background-alt);
  border-color: var(--n-color-text-secondary);
}

.admin-users__form-button--submit {
  background-color: var(--n-color-primary);
  border: 1px solid var(--n-color-primary);
  color: var(--n-color-on-primary);
}

.admin-users__form-button--submit:hover {
  background-color: var(--n-color-primary-dark);
}

.admin-users__form-button--danger {
  background-color: var(--n-color-error);
  border: 1px solid var(--n-color-error);
  color: var(--n-color-on-error);
}

.admin-users__form-button--danger:hover {
  background-color: var(--n-color-error-dark);
}

.admin-users__form-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

/* Confirm Delete Dialog */
.admin-users__confirm-delete {
  padding: 1.5rem;
  text-align: center;
}

.admin-users__confirm-icon {
  font-size: 3rem;
  color: var(--n-color-warning);
  margin-bottom: 1rem;
}

.admin-users__confirm-message {
  margin-bottom: 1rem;
  font-size: 1rem;
  color: var(--n-color-text-primary);
}

.admin-users__user-info {
  padding: 0.75rem;
  margin: 1rem 0;
  background-color: var(--n-color-background-alt);
  border-radius: var(--n-border-radius);
  border: 1px solid var(--n-color-border);
}

.admin-users__delete-warning {
  margin-bottom: 1.5rem;
  font-size: 0.875rem;
  color: var(--n-color-error);
}

/* Responsive Styles */
@media (max-width: 768px) {
  .admin-users__stats {
    grid-template-columns: 1fr;
  }

  .admin-users__controls {
    flex-direction: column;
    align-items: stretch;
  }

  .admin-users__search {
    width: 100%;
  }

  .admin-users__create-button {
    width: 100%;
    justify-content: center;
  }

  .admin-users__table-header,
  .admin-users__table-cell {
    padding: 0.625rem 0.5rem;
  }

  .admin-users__form-actions {
    flex-direction: column;
  }

  .admin-users__form-button {
    width: 100%;
  }
}
</style>
