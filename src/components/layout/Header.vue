<template>
  <header class="app-header" :class="{ 'app-header--bordered': bordered }">
    <div class="app-header__content">
      <div class="app-header__left">
        <button
          v-if="showToggleButton"
          class="app-header__toggle"
          @click="$emit('toggle-sidebar')"
          aria-label="Seitenleiste umschalten"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>

        <div class="app-header__logo">
          <slot name="logo"></slot>
        </div>

        <h1 v-if="showTitle" class="app-header__title">
          {{ title }}
        </h1>
      </div>

      <div class="app-header__right">
        <div v-if="user" class="app-header__user">
          <button
            class="app-header__user-button"
            @click="toggleUserMenu"
            :aria-expanded="isUserMenuOpen"
          >
            <div class="app-header__user-avatar">
              <span>{{ getUserInitials(user.name) }}</span>
            </div>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>

          <transition name="dropdown">
            <div v-if="isUserMenuOpen" class="app-header__dropdown">
              <div class="app-header__dropdown-header">
                <div class="app-header__dropdown-avatar">
                  <span>{{ getUserInitials(user.name) }}</span>
                </div>
                <div class="app-header__dropdown-info">
                  <div class="app-header__dropdown-name">{{ user.name }}</div>
                  <div class="app-header__dropdown-email">{{ user.email }}</div>
                </div>
              </div>
              <div class="app-header__dropdown-divider"></div>
              <button
                v-if="showLogout"
                class="app-header__dropdown-item app-header__dropdown-item--danger"
                @click="handleLogout"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                  <polyline points="16 17 21 12 16 7"></polyline>
                  <line x1="21" y1="12" x2="9" y2="12"></line>
                </svg>
                <span>Abmelden</span>
              </button>
            </div>
          </transition>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from "vue";

interface User {
  name?: string;
  email?: string;
  avatar?: string;
}

interface Props {
  title?: string;
  showTitle?: boolean;
  showToggleButton?: boolean;
  bordered?: boolean;
  user?: User;
  showLogout?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  title: "Digitale Akte Assistent",
  showTitle: true,
  showToggleButton: true,
  bordered: true,
  showLogout: true,
});

const emit = defineEmits<{
  "toggle-sidebar": [];
  logout: [];
}>();

const isUserMenuOpen = ref(false);

const toggleUserMenu = () => {
  isUserMenuOpen.value = !isUserMenuOpen.value;
};

const handleLogout = () => {
  isUserMenuOpen.value = false;
  emit("logout");
};

const getUserInitials = (name?: string): string => {
  if (!name) return "U";
  return name
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase())
    .slice(0, 2)
    .join("");
};

const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as HTMLElement;
  if (!target.closest(".app-header__user")) {
    isUserMenuOpen.value = false;
  }
};

onMounted(() => {
  document.addEventListener("click", handleClickOutside);
});

onBeforeUnmount(() => {
  document.removeEventListener("click", handleClickOutside);
});
</script>

<style scoped>
.app-header {
  height: 64px;
  background: var(--background);
  position: relative;
  z-index: 100;
}

.app-header--bordered {
  border-bottom: 1px solid var(--border);
}

.app-header__content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 100%;
  padding: 0 24px;
}

.app-header__left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.app-header__toggle {
  width: 40px;
  height: 40px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.app-header__toggle:hover {
  background: var(--button-hover);
  color: var(--text);
}

.app-header__toggle svg {
  width: 20px;
  height: 20px;
}

.app-header__logo {
  display: flex;
  align-items: center;
}

.app-header__title {
  font-size: 20px;
  font-weight: 600;
  margin: 0;
  color: var(--text);
}

.app-header__right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.app-header__user {
  position: relative;
}

.app-header__user-button {
  display: flex;
  align-items: center;
  gap: 8px;
  border: none;
  background: transparent;
  color: var(--text);
  cursor: pointer;
  padding: 6px 12px 6px 6px;
  border-radius: 8px;
  transition: all 0.2s;
}

.app-header__user-button:hover {
  background: var(--button-hover);
}

.app-header__user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--surface);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 500;
  font-size: 14px;
  color: var(--text);
  border: 2px solid var(--border);
}

.app-header__user-button svg {
  width: 16px;
  height: 16px;
  color: var(--text-secondary);
}

.app-header__dropdown {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  background: var(--background);
  border: 1px solid var(--border);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  min-width: 250px;
  overflow: hidden;
}

.app-header__dropdown-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
}

.app-header__dropdown-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--surface);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 500;
  font-size: 16px;
  color: var(--text);
  border: 2px solid var(--border);
}

.app-header__dropdown-info {
  flex: 1;
}

.app-header__dropdown-name {
  font-weight: 500;
  color: var(--text);
}

.app-header__dropdown-email {
  font-size: 14px;
  color: var(--text-secondary);
}

.app-header__dropdown-divider {
  height: 1px;
  background: var(--border);
}

.app-header__dropdown-item {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 12px 16px;
  border: none;
  background: transparent;
  color: var(--text);
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
  font-size: 14px;
}

.app-header__dropdown-item:hover {
  background: var(--button-hover);
}

.app-header__dropdown-item svg {
  width: 18px;
  height: 18px;
  color: var(--text-secondary);
}

.app-header__dropdown-item--danger {
  color: #dc2626;
}

.app-header__dropdown-item--danger svg {
  color: #dc2626;
}

/* Dropdown transition */
.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.2s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

/* Responsive */
@media (max-width: 768px) {
  .app-header__content {
    padding: 0 16px;
  }

  .app-header__title {
    font-size: 18px;
  }
}
</style>
