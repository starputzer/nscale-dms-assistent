<template>
  <div class="user-list">
    <div class="list-header">
      <h2 class="list-title">{{ title }}</h2>
      <div class="filter-controls">
        <!-- Filter by role -->
        <div class="filter-select">
          <select v-model="activeFilter" @change="applyFilters">
            <option value="all">Alle Rollen</option>
            <option value="admin">Administratoren</option>
            <option value="user">Standardbenutzer</option>
          </select>
        </div>
        
        <!-- Search input -->
        <div class="search-box">
          <input 
            type="text" 
            v-model="searchQuery" 
            placeholder="Suche nach E-Mail..." 
            @input="applyFilters"
          />
          <i class="fas fa-search"></i>
        </div>
        
        <!-- Add user button -->
        <button @click="$emit('add-user')" class="add-btn">
          <i class="fas fa-user-plus"></i>
          Benutzer hinzufügen
        </button>
      </div>
    </div>
    
    <!-- Loading indicator -->
    <div v-if="loading" class="loading-container">
      <div class="loader"></div>
      <span>Benutzer werden geladen...</span>
    </div>
    
    <!-- Empty state -->
    <div v-else-if="users.length === 0" class="empty-state">
      <i class="fas fa-users-slash"></i>
      <p>{{ emptyStateMessage }}</p>
      <button 
        v-if="hasActiveFilters" 
        class="reset-filters-btn" 
        @click="resetFilters"
      >
        Filter zurücksetzen
      </button>
    </div>
    
    <!-- Users table -->
    <div v-else class="users-table-container">
      <table class="users-table">
        <thead>
          <tr>
            <th @click="toggleSort('id')" class="sortable-header">
              ID
              <i v-if="sortField === 'id'" :class="['fas', sortDirection === 'asc' ? 'fa-sort-up' : 'fa-sort-down']"></i>
              <i v-else class="fas fa-sort"></i>
            </th>
            <th @click="toggleSort('email')" class="sortable-header">
              E-Mail
              <i v-if="sortField === 'email'" :class="['fas', sortDirection === 'asc' ? 'fa-sort-up' : 'fa-sort-down']"></i>
              <i v-else class="fas fa-sort"></i>
            </th>
            <th @click="toggleSort('role')" class="sortable-header">
              Rolle
              <i v-if="sortField === 'role'" :class="['fas', sortDirection === 'asc' ? 'fa-sort-up' : 'fa-sort-down']"></i>
              <i v-else class="fas fa-sort"></i>
            </th>
            <th @click="toggleSort('created_at')" class="sortable-header">
              Erstellt am
              <i v-if="sortField === 'created_at'" :class="['fas', sortDirection === 'asc' ? 'fa-sort-up' : 'fa-sort-down']"></i>
              <i v-else class="fas fa-sort"></i>
            </th>
            <th @click="toggleSort('last_login')" class="sortable-header">
              Letzter Login
              <i v-if="sortField === 'last_login'" :class="['fas', sortDirection === 'asc' ? 'fa-sort-up' : 'fa-sort-down']"></i>
              <i v-else class="fas fa-sort"></i>
            </th>
            <th>Aktionen</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in users" :key="user.id" :class="{'admin-row': user.role === 'admin'}">
            <td>{{ user.id }}</td>
            <td class="email-cell">{{ user.email }}</td>
            <td>
              <span class="role-badge" :class="{'admin-badge': user.role === 'admin', 'user-badge': user.role === 'user'}">
                {{ user.role === 'admin' ? 'Administrator' : 'Standardbenutzer' }}
              </span>
            </td>
            <td>{{ formatDate(user.created_at) }}</td>
            <td>{{ formatDate(user.last_login) || 'Nie' }}</td>
            <td class="actions-cell">
              <!-- Change role button -->
              <button 
                v-if="user.role === 'user'" 
                @click="$emit('change-role', { userId: user.id, newRole: 'admin' })" 
                class="action-btn promote-btn" 
                title="Zum Administrator hochstufen"
              >
                <i class="fas fa-user-shield"></i>
              </button>
              
              <button 
                v-else 
                @click="$emit('change-role', { userId: user.id, newRole: 'user' })" 
                class="action-btn demote-btn" 
                title="Zu Standardbenutzer herabstufen"
              >
                <i class="fas fa-user"></i>
              </button>
              
              <!-- Delete button -->
              <button 
                @click="$emit('delete-user', user.id)" 
                class="action-btn delete-btn" 
                title="Benutzer löschen"
              >
                <i class="fas fa-trash-alt"></i>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';

// Props
const props = defineProps({
  users: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  },
  title: {
    type: String,
    default: 'Benutzerliste'
  }
});

// Emits
const emit = defineEmits([
  'filter-change', 
  'sort-change', 
  'add-user', 
  'change-role', 
  'delete-user'
]);

// Local state
const activeFilter = ref('all');
const searchQuery = ref('');
const sortField = ref('created_at');
const sortDirection = ref('desc');

// Computed properties
const hasActiveFilters = computed(() => {
  return activeFilter.value !== 'all' || searchQuery.value.trim() !== '';
});

const emptyStateMessage = computed(() => {
  if (hasActiveFilters.value) {
    return 'Keine passenden Benutzer gefunden.';
  }
  return 'Noch keine Benutzer vorhanden.';
});

// Methods
const applyFilters = () => {
  emit('filter-change', {
    role: activeFilter.value,
    search: searchQuery.value
  });
};

const resetFilters = () => {
  activeFilter.value = 'all';
  searchQuery.value = '';
  applyFilters();
};

const toggleSort = (field) => {
  if (sortField.value === field) {
    // Reverse direction if already sorting by this field
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortField.value = field;
    sortDirection.value = 'desc';
  }
  
  emit('sort-change', {
    field: sortField.value,
    direction: sortDirection.value
  });
};

const formatDate = (timestamp) => {
  if (!timestamp) return null;
  
  const date = new Date(timestamp * 1000);
  return date.toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};
</script>

<style scoped>
.user-list {
  background-color: #ffffff;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  padding: 1.5rem;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.list-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
}

.filter-controls {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  flex-wrap: wrap;
}

.filter-select select {
  padding: 0.5rem 2rem 0.5rem 1rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.375rem;
  background-color: #f8fafc;
  font-size: 0.875rem;
  color: #475569;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.5rem center;
  background-size: 1.25rem;
}

.search-box {
  position: relative;
}

.search-box input {
  padding: 0.5rem 2.5rem 0.5rem 1rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.375rem;
  background-color: #f8fafc;
  font-size: 0.875rem;
  color: #475569;
  width: 200px;
}

.search-box i {
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  color: #94a3b8;
  pointer-events: none;
}

.add-btn {
  padding: 0.5rem 1rem;
  background-color: #3b82f6;
  color: white;
  border: none;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.add-btn:hover {
  background-color: #2563eb;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  color: #64748b;
}

.loader {
  border: 3px solid #f3f3f3;
  border-top: 3px solid #3b82f6;
  border-radius: 50%;
  width: 2rem;
  height: 2rem;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  text-align: center;
  color: #64748b;
}

.empty-state i {
  font-size: 3rem;
  opacity: 0.5;
  margin-bottom: 1rem;
}

.reset-filters-btn {
  margin-top: 1rem;
  padding: 0.5rem 1rem;
  background-color: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 0.375rem;
  color: #475569;
  font-size: 0.875rem;
  cursor: pointer;
}

.reset-filters-btn:hover {
  background-color: #f1f5f9;
}

.users-table-container {
  overflow-x: auto;
}

.users-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
  color: #334155;
}

.users-table th {
  background-color: #f8fafc;
  padding: 0.75rem 1rem;
  text-align: left;
  font-weight: 600;
  color: #475569;
  border-bottom: 1px solid #e2e8f0;
}

.sortable-header {
  cursor: pointer;
  user-select: none;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.sortable-header i {
  font-size: 0.75rem;
  color: #94a3b8;
}

.users-table td {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #e2e8f0;
}

.admin-row {
  background-color: #eff6ff;
}

.email-cell {
  max-width: 250px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.role-badge {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  font-weight: 500;
}

.admin-badge {
  background-color: #dbeafe;
  color: #1e40af;
}

.user-badge {
  background-color: #e0f2fe;
  color: #0369a1;
}

.actions-cell {
  white-space: nowrap;
}

.action-btn {
  padding: 0.375rem;
  border: none;
  background: none;
  color: #64748b;
  border-radius: 0.25rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-btn:hover {
  background-color: #f1f5f9;
}

.promote-btn:hover {
  color: #1e40af;
  background-color: #dbeafe;
}

.demote-btn:hover {
  color: #0369a1;
  background-color: #e0f2fe;
}

.delete-btn:hover {
  color: #ef4444;
  background-color: #fee2e2;
}

/* Dark Mode Support */
:global(.theme-dark) .user-list {
  background-color: #1e1e1e;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

:global(.theme-dark) .list-title {
  color: #e0e0e0;
}

:global(.theme-dark) .filter-select select {
  background-color: #252525;
  border-color: #444;
  color: #e0e0e0;
}

:global(.theme-dark) .search-box input {
  background-color: #252525;
  border-color: #444;
  color: #e0e0e0;
}

:global(.theme-dark) .search-box i {
  color: #777;
}

:global(.theme-dark) .add-btn {
  background-color: #2563eb;
}

:global(.theme-dark) .add-btn:hover {
  background-color: #1d4ed8;
}

:global(.theme-dark) .reset-filters-btn {
  background-color: #252525;
  border-color: #444;
  color: #e0e0e0;
}

:global(.theme-dark) .reset-filters-btn:hover {
  background-color: #333;
}

:global(.theme-dark) .users-table th {
  background-color: #252525;
  color: #e0e0e0;
  border-bottom-color: #444;
}

:global(.theme-dark) .users-table td {
  border-bottom-color: #444;
  color: #e0e0e0;
}

:global(.theme-dark) .admin-row {
  background-color: #162547;
}

:global(.theme-dark) .admin-badge {
  background-color: #1e40af;
  color: #dbeafe;
}

:global(.theme-dark) .user-badge {
  background-color: #0369a1;
  color: #e0f2fe;
}

:global(.theme-dark) .action-btn {
  color: #aaa;
}

:global(.theme-dark) .action-btn:hover {
  background-color: #333;
}

:global(.theme-dark) .promote-btn:hover {
  color: #dbeafe;
  background-color: #1e40af;
}

:global(.theme-dark) .demote-btn:hover {
  color: #e0f2fe;
  background-color: #0369a1;
}

:global(.theme-dark) .delete-btn:hover {
  color: #fee2e2;
  background-color: #b91c1c;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .list-header {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .filter-controls {
    width: 100%;
  }
  
  .search-box input {
    width: 100%;
  }
  
  .users-table th:nth-child(4),
  .users-table td:nth-child(4) {
    display: none;
  }
}

@media (max-width: 576px) {
  .users-table th:nth-child(1),
  .users-table td:nth-child(1),
  .users-table th:nth-child(5),
  .users-table td:nth-child(5) {
    display: none;
  }
}
</style>