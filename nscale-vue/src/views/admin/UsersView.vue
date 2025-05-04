<template>
  <div class="admin-sub-view users-view">
    <h1>{{ viewTitle }}</h1>
    
    <!-- User summary cards -->
    <div class="user-stats">
      <div class="stat-card">
        <div class="stat-icon">
          <i class="fas fa-users"></i>
        </div>
        <div class="stat-info">
          <h2>{{ userStore.userStats.total }}</h2>
          <p>Gesamtbenutzer</p>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon admin-icon">
          <i class="fas fa-user-shield"></i>
        </div>
        <div class="stat-info">
          <h2>{{ userStore.userStats.admins }}</h2>
          <p>Administratoren</p>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon user-icon">
          <i class="fas fa-user"></i>
        </div>
        <div class="stat-info">
          <h2>{{ userStore.userStats.standardUsers }}</h2>
          <p>Standardbenutzer</p>
        </div>
      </div>
    </div>
    
    <!-- Error notification if there is an error in the user store -->
    <div v-if="userStore.error" class="error-notification">
      <i class="fas fa-exclamation-triangle"></i>
      <p>{{ userStore.error }}</p>
      <button @click="userStore.error = null" class="dismiss-btn">
        <i class="fas fa-times"></i>
      </button>
    </div>
    
    <!-- User list component -->
    <UserList
      :users="userStore.filteredUsers"
      :loading="userStore.loading"
      title="Registrierte Benutzer"
      @filter-change="userStore.setFilter"
      @sort-change="sortUsers"
      @add-user="userStore.openUserModal('create')"
      @change-role="confirmRoleChange"
      @delete-user="confirmDeleteUser"
    />
    
    <!-- User form modal -->
    <UserForm
      v-if="userStore.showUserModal"
      :mode="userStore.modalMode"
      :user="userStore.selectedUser"
      :loading="userStore.loading"
      :error="userStore.error"
      @save="saveUser"
      @close="userStore.closeUserModal"
    />
    
    <!-- Confirmation dialog -->
    <ConfirmDialog
      v-if="userStore.confirmDialog.show"
      :title="confirmTitle"
      :message="userStore.confirmDialog.message"
      :type="confirmType"
      @confirm="userStore.confirmAction"
      @cancel="userStore.closeConfirmDialog"
    />
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useUserStore } from '@/stores/userStore';
import UserList from '@/components/admin/users/UserList.vue';
import UserForm from '@/components/admin/users/UserForm.vue';
import ConfirmDialog from '@/components/common/ConfirmDialog.vue';

const route = useRoute();
const userStore = useUserStore();

// View title based on route
const viewTitle = computed(() => {
  const viewName = route.name || '';
  
  switch(viewName) {
    case 'AdminUsers':
      return 'Benutzerverwaltung';
    default:
      return 'Administration';
  }
});

// Computed properties for confirmation dialog
const confirmTitle = computed(() => {
  if (userStore.confirmDialog.type === 'delete') {
    return 'Benutzer löschen';
  } else if (userStore.confirmDialog.type === 'role') {
    return 'Benutzerrolle ändern';
  }
  return 'Bestätigung';
});

const confirmType = computed(() => {
  if (userStore.confirmDialog.type === 'delete') {
    return 'danger';
  } else if (userStore.confirmDialog.type === 'role') {
    return 'warning';
  }
  return 'primary';
});

// Methods
const sortUsers = (sortData) => {
  userStore.toggleSort(sortData.field);
};

const saveUser = async (userData) => {
  try {
    if (userStore.modalMode === 'create') {
      await userStore.createUser(userData);
    } else {
      // Implementation for editing a user would go here
      // Not implemented in current API
    }
    userStore.closeUserModal();
  } catch (error) {
    // Error is already handled in the store
  }
};

const confirmDeleteUser = (userId) => {
  userStore.openConfirmDialog('delete', { userId });
};

const confirmRoleChange = (data) => {
  userStore.openConfirmDialog('role', data);
};

// Load users when the component is mounted
onMounted(() => {
  userStore.loadUsers();
});
</script>

<style scoped>
.users-view {
  padding: 1.5rem;
}

.user-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.stat-card {
  background-color: #ffffff;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  padding: 1.5rem;
  display: flex;
  align-items: center;
}

.stat-icon {
  background-color: #ebf5ff;
  color: #3b82f6;
  width: 3rem;
  height: 3rem;
  border-radius: 9999px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  margin-right: 1.25rem;
}

.admin-icon {
  background-color: #dbeafe;
  color: #1d4ed8;
}

.user-icon {
  background-color: #e0f2fe;
  color: #0369a1;
}

.stat-info h2 {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 0.25rem 0;
}

.stat-info p {
  font-size: 0.875rem;
  color: #64748b;
  margin: 0;
}

.error-notification {
  margin-bottom: 1.5rem;
  padding: 1rem;
  background-color: #fee2e2;
  border-left: 4px solid #ef4444;
  color: #b91c1c;
  border-radius: 0.375rem;
  display: flex;
  align-items: center;
}

.error-notification i {
  margin-right: 0.75rem;
}

.error-notification p {
  flex: 1;
  margin: 0;
}

.dismiss-btn {
  background: none;
  border: none;
  color: #b91c1c;
  cursor: pointer;
  padding: 0.25rem;
  font-size: 1rem;
}

.dismiss-btn:hover {
  color: #ef4444;
}

/* Dark Mode Support */
:global(.theme-dark) .stat-card {
  background-color: #1e1e1e;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

:global(.theme-dark) .stat-icon {
  background-color: #1e3a8a;
  color: #93c5fd;
}

:global(.theme-dark) .admin-icon {
  background-color: #1e40af;
  color: #93c5fd;
}

:global(.theme-dark) .user-icon {
  background-color: #0369a1;
  color: #bae6fd;
}

:global(.theme-dark) .stat-info h2 {
  color: #e0e0e0;
}

:global(.theme-dark) .stat-info p {
  color: #aaa;
}

:global(.theme-dark) .error-notification {
  background-color: rgba(239, 68, 68, 0.1);
  border-left-color: #ef4444;
  color: #fee2e2;
}

:global(.theme-dark) .dismiss-btn {
  color: #fee2e2;
}

:global(.theme-dark) .dismiss-btn:hover {
  color: #fecaca;
}

/* Contrast mode */
:global(.theme-contrast) .stat-card {
  background-color: #000;
  border: 2px solid #ffeb3b;
  box-shadow: none;
}

:global(.theme-contrast) .stat-icon,
:global(.theme-contrast) .admin-icon,
:global(.theme-contrast) .user-icon {
  background-color: #ffeb3b;
  color: #000;
}

:global(.theme-contrast) .stat-info h2 {
  color: #ffeb3b;
}

:global(.theme-contrast) .stat-info p {
  color: #fff;
}

:global(.theme-contrast) .error-notification {
  background-color: #000;
  border: 2px solid #ffeb3b;
  color: #ffeb3b;
}

:global(.theme-contrast) .dismiss-btn {
  color: #ffeb3b;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .user-stats {
    grid-template-columns: 1fr;
  }
}
</style>