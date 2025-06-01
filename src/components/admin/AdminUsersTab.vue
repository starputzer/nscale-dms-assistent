<template>
  <div class="admin-users-tab">
    <h2>{{ t('admin.users.title') }}</h2>
    
    <div v-if="loading" class="loading">
      {{ t('common.loading') }}
    </div>
    
    <div v-else-if="error" class="error">
      {{ error }}
    </div>
    
    <div v-else>
      <table class="users-table">
        <thead>
          <tr>
            <th>{{ t('admin.users.id') }}</th>
            <th>{{ t('admin.users.email') }}</th>
            <th>{{ t('admin.users.username') }}</th>
            <th>{{ t('admin.users.role') }}</th>
            <th>{{ t('admin.users.createdAt') }}</th>
            <th>{{ t('admin.users.actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in users" :key="user.id">
            <td>{{ user.id }}</td>
            <td>{{ user.email }}</td>
            <td>{{ user.username }}</td>
            <td>{{ user.role }}</td>
            <td>{{ formatDate(user.createdAt) }}</td>
            <td>
              <button @click="editUser(user)" class="btn-edit">
                {{ t('common.edit') }}
              </button>
              <button @click="deleteUser(user)" class="btn-delete">
                {{ t('common.delete') }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAdminStore } from '@/stores/admin';

const { t } = useI18n();
const adminStore = useAdminStore();

const users = ref<any[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);

onMounted(async () => {
  await loadUsers();
});

async function loadUsers() {
  loading.value = true;
  error.value = null;
  
  try {
    const response = await adminStore.getUsers();
    users.value = response.data || [];
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load users';
  } finally {
    loading.value = false;
  }
}

function formatDate(date: string | number): string {
  return new Date(date).toLocaleString();
}

function editUser(user: any) {
  // TODO: Implement edit functionality
  console.log('Edit user:', user);
}

async function deleteUser(user: any) {
  if (confirm(t('admin.users.confirmDelete', { email: user.email }))) {
    try {
      await adminStore.deleteUser(user.id);
      await loadUsers();
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to delete user';
    }
  }
}
</script>

<style scoped>
.admin-users-tab {
  padding: 20px;
}

.users-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 20px;
}

.users-table th,
.users-table td {
  padding: 10px;
  text-align: left;
  border-bottom: 1px solid #ddd;
}

.users-table th {
  background-color: #f5f5f5;
  font-weight: bold;
}

.btn-edit,
.btn-delete {
  padding: 5px 10px;
  margin: 0 5px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.btn-edit {
  background-color: #4CAF50;
  color: white;
}

.btn-delete {
  background-color: #f44336;
  color: white;
}

.loading,
.error {
  padding: 20px;
  text-align: center;
}

.error {
  color: #f44336;
}
</style>