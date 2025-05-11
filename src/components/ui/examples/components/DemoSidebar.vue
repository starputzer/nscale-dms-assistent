<template>
  <div
    class="n-sidebar"
    :class="{
      'n-sidebar--collapsed': collapsed,
      'n-sidebar--mini': mini && collapsed,
    }"
  >
    <div class="n-sidebar__inner">
      <!-- Sidebar Header -->
      <div class="n-sidebar__header">
        <div v-if="!collapsed || !mini" class="n-sidebar__title">
          UI Components
        </div>
        <button
          class="n-sidebar__toggle-btn"
          @click="toggleCollapse"
          aria-label="Toggle sidebar"
        >
          <svg
            class="n-sidebar__toggle-icon"
            :class="{ 'n-sidebar__toggle-icon--collapsed': collapsed }"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>
      </div>

      <!-- Sidebar Content -->
      <div class="n-sidebar__content">
        <nav class="n-sidebar__nav" aria-label="Components Navigation">
          <ul class="n-sidebar__nav-list">
            <li class="n-sidebar__nav-item">
              <div class="n-sidebar__nav-link-wrapper">
                <router-link
                  to="/ui-components-demo"
                  class="n-sidebar__nav-link"
                  exact
                >
                  <span class="n-sidebar__nav-icon">
                    <svg
                      viewBox="0 0 24 24"
                      width="24"
                      height="24"
                      stroke="currentColor"
                      stroke-width="2"
                      fill="none"
                    >
                      <rect
                        x="3"
                        y="3"
                        width="18"
                        height="18"
                        rx="2"
                        ry="2"
                      ></rect>
                      <line x1="3" y1="9" x2="21" y2="9"></line>
                      <line x1="9" y1="21" x2="9" y2="9"></line>
                    </svg>
                  </span>
                  <span v-if="!collapsed || !mini" class="n-sidebar__nav-label"
                    >Overview</span
                  >
                </router-link>
              </div>
            </li>
            <li class="n-sidebar__nav-item">
              <div class="n-sidebar__nav-link-wrapper">
                <a
                  href="#textarea"
                  class="n-sidebar__nav-link"
                  @click.prevent="selectComponent('textarea')"
                  :class="{
                    'n-sidebar__nav-link--active':
                      activeComponent === 'textarea',
                  }"
                >
                  <span class="n-sidebar__nav-icon">
                    <svg
                      viewBox="0 0 24 24"
                      width="24"
                      height="24"
                      stroke="currentColor"
                      stroke-width="2"
                      fill="none"
                    >
                      <path
                        d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
                      ></path>
                    </svg>
                  </span>
                  <span v-if="!collapsed || !mini" class="n-sidebar__nav-label"
                    >TextArea</span
                  >
                </a>
              </div>
            </li>
            <li class="n-sidebar__nav-item">
              <div class="n-sidebar__nav-link-wrapper">
                <a
                  href="#toggle"
                  class="n-sidebar__nav-link"
                  @click.prevent="selectComponent('toggle')"
                  :class="{
                    'n-sidebar__nav-link--active': activeComponent === 'toggle',
                  }"
                >
                  <span class="n-sidebar__nav-icon">
                    <svg
                      viewBox="0 0 24 24"
                      width="24"
                      height="24"
                      stroke="currentColor"
                      stroke-width="2"
                      fill="none"
                    >
                      <rect
                        x="1"
                        y="5"
                        width="22"
                        height="14"
                        rx="7"
                        ry="7"
                      ></rect>
                      <circle cx="16" cy="12" r="3"></circle>
                    </svg>
                  </span>
                  <span v-if="!collapsed || !mini" class="n-sidebar__nav-label"
                    >Toggle</span
                  >
                </a>
              </div>
            </li>
            <li class="n-sidebar__nav-item">
              <div class="n-sidebar__nav-link-wrapper">
                <a
                  href="#tooltip"
                  class="n-sidebar__nav-link"
                  @click.prevent="selectComponent('tooltip')"
                  :class="{
                    'n-sidebar__nav-link--active':
                      activeComponent === 'tooltip',
                  }"
                >
                  <span class="n-sidebar__nav-icon">
                    <svg
                      viewBox="0 0 24 24"
                      width="24"
                      height="24"
                      stroke="currentColor"
                      stroke-width="2"
                      fill="none"
                    >
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="16" x2="12" y2="12"></line>
                      <line x1="12" y1="8" x2="12.01" y2="8"></line>
                    </svg>
                  </span>
                  <span v-if="!collapsed || !mini" class="n-sidebar__nav-label"
                    >Tooltip</span
                  >
                </a>
              </div>
            </li>
            <li class="n-sidebar__nav-item">
              <div class="n-sidebar__nav-link-wrapper">
                <router-link to="/admin" class="n-sidebar__nav-link">
                  <span class="n-sidebar__nav-icon">
                    <svg
                      viewBox="0 0 24 24"
                      width="24"
                      height="24"
                      stroke="currentColor"
                      stroke-width="2"
                      fill="none"
                    >
                      <circle cx="12" cy="12" r="3"></circle>
                      <path
                        d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"
                      ></path>
                    </svg>
                  </span>
                  <span v-if="!collapsed || !mini" class="n-sidebar__nav-label"
                    >Back to Admin</span
                  >
                </router-link>
              </div>
            </li>
            <li class="n-sidebar__nav-item">
              <div class="n-sidebar__nav-link-wrapper">
                <router-link to="/" class="n-sidebar__nav-link">
                  <span class="n-sidebar__nav-icon">
                    <svg
                      viewBox="0 0 24 24"
                      width="24"
                      height="24"
                      stroke="currentColor"
                      stroke-width="2"
                      fill="none"
                    >
                      <path
                        d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"
                      ></path>
                      <polyline points="9 22 9 12 15 12 15 22"></polyline>
                    </svg>
                  </span>
                  <span v-if="!collapsed || !mini" class="n-sidebar__nav-label"
                    >Back to Home</span
                  >
                </router-link>
              </div>
            </li>
          </ul>
        </nav>
      </div>

      <!-- Sidebar Footer -->
      <div class="n-sidebar__footer">
        <div v-if="!collapsed || !mini" class="version-info">
          <span>UI Components v1.3.0</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";

const collapsed = ref(false);
const mini = ref(true);
const activeComponent = ref("");

function toggleCollapse() {
  collapsed.value = !collapsed.value;
}

function selectComponent(component: string) {
  activeComponent.value = component;
  emit("select-component", component);
}

const emit = defineEmits<{
  (e: "select-component", component: string): void;
}>();
</script>

<style scoped>
.n-sidebar {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 260px;
  background-color: var(--color-background-light, #f8fafc);
  color: var(--color-text-primary, #1e293b);
  transition: width 0.3s ease;
  overflow: hidden;
  position: relative;
  border-right: 1px solid var(--color-border, #e2e8f0);
}

.n-sidebar__inner {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  overflow: hidden;
}

.n-sidebar__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  height: 64px;
  border-bottom: 1px solid var(--color-border, #e2e8f0);
  flex-shrink: 0;
}

.n-sidebar__title {
  font-weight: 600;
  font-size: 1.125rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: opacity 0.3s ease;
}

.n-sidebar__toggle-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  background: transparent;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition:
    background-color 0.2s ease,
    transform 0.3s ease;
  color: var(--color-text-secondary, #64748b);
}

.n-sidebar__toggle-btn:hover {
  background-color: rgba(0, 0, 0, 0.05);
}

.n-sidebar__toggle-icon {
  width: 20px;
  height: 20px;
  transition: transform 0.3s ease;
}

.n-sidebar__toggle-icon--collapsed {
  transform: rotate(180deg);
}

.n-sidebar__content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 8px 0;
}

.n-sidebar__nav {
  width: 100%;
}

.n-sidebar__nav-list {
  list-style: none;
  padding: 0;
  margin: 0;
  width: 100%;
}

.n-sidebar__nav-item {
  position: relative;
  width: 100%;
}

.n-sidebar__nav-link-wrapper {
  cursor: pointer;
  display: block;
  width: 100%;
  outline: none;
}

.n-sidebar__nav-link {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  color: var(--color-text-primary, #1e293b);
  transition:
    background-color 0.2s ease,
    color 0.2s ease;
  text-decoration: none;
  position: relative;
  width: 100%;
}

.n-sidebar__nav-link:hover,
.n-sidebar__nav-link:focus-visible {
  background-color: rgba(0, 0, 0, 0.05);
  color: var(--color-text-primary, #1e293b);
}

.n-sidebar__nav-link--active {
  background-color: rgba(0, 100, 176, 0.1);
  color: var(--color-primary, #0064b0);
  font-weight: 500;
}

.n-sidebar__nav-link--active::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background-color: var(--color-primary, #0064b0);
}

.n-sidebar__nav-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
  width: 24px;
  height: 24px;
  flex-shrink: 0;
}

.n-sidebar__nav-label {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: opacity 0.3s ease;
}

.n-sidebar__footer {
  padding: 16px;
  border-top: 1px solid var(--color-border, #e2e8f0);
  flex-shrink: 0;
}

.version-info {
  font-size: 0.75rem;
  color: var(--color-text-secondary, #64748b);
  text-align: center;
}

/* Collapsed state */
.n-sidebar--collapsed {
  width: 64px;
}

.n-sidebar--collapsed .n-sidebar__header {
  justify-content: center;
  padding: 16px 8px;
}

.n-sidebar--collapsed .n-sidebar__title {
  display: none;
}

/* Mini mode */
.n-sidebar--mini.n-sidebar--collapsed .n-sidebar__nav-link {
  justify-content: center;
  padding: 12px 0;
}

.n-sidebar--mini.n-sidebar--collapsed .n-sidebar__nav-icon {
  margin-right: 0;
}

/* Responsive styles */
@media (max-width: 768px) {
  .n-sidebar {
    width: 100%;
    height: auto;
    max-height: 50vh;
    border-right: none;
    border-bottom: 1px solid var(--color-border, #e2e8f0);
  }

  .n-sidebar--collapsed {
    height: 64px;
    width: 100%;
  }
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .n-sidebar {
    background-color: var(--color-background-dark, #1e293b);
    color: var(--color-text-inverse, #f1f5f9);
    border-right-color: var(--color-border-dark, #334155);
  }

  .n-sidebar__header {
    border-bottom-color: var(--color-border-dark, #334155);
  }

  .n-sidebar__toggle-btn {
    color: var(--color-text-secondary-dark, #94a3b8);
  }

  .n-sidebar__toggle-btn:hover {
    background-color: rgba(255, 255, 255, 0.05);
  }

  .n-sidebar__nav-link {
    color: var(--color-text-inverse, #f1f5f9);
  }

  .n-sidebar__nav-link:hover,
  .n-sidebar__nav-link:focus-visible {
    background-color: rgba(255, 255, 255, 0.05);
    color: var(--color-text-inverse, #f1f5f9);
  }

  .n-sidebar__nav-link--active {
    background-color: rgba(0, 100, 176, 0.2);
  }

  .n-sidebar__footer {
    border-top-color: var(--color-border-dark, #334155);
  }

  .version-info {
    color: var(--color-text-secondary-dark, #94a3b8);
  }
}
</style>
