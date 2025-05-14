<template>
  <div class="admin-panel">
    <div class="admin-header">
      <h2>nscale DMS Assistent Administration</h2>
    </div>

    <div class="admin-tabs">
      <button
        v-for="tab in visibleTabs"
        :key="tab.id"
        @click="activeTab = tab.id"
        :class="{ active: activeTab === tab.id, 'nscale-btn': true }"
      >
        <i :class="tab.icon" class="mr-2"></i>
        {{ tab.label }}
      </button>
    </div>

    <div class="admin-content">
      <component :is="currentTabComponent"></component>
    </div>

    <!-- Toast-Benachrichtigungen für Feedback -->
    <ToastContainer position="bottom-right" />
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, watch } from "vue";
import UsersTab from "./AdminUsersTab.vue";
import SystemTab from "./AdminSystemTab.vue";
import FeedbackTab from "./AdminFeedbackTab.vue";
import MotdTab from "./AdminMotdTab.vue";
import DocConverterTab from "./AdminDocConverterTab.vue";
import FeatureTogglesTab from "./AdminFeatureTogglesTab.vue";
import ToastContainer from "@/components/ui/ToastContainer.vue";

interface Tab {
  id: string;
  label: string;
  component: string;
  icon: string;
  requiredRole?: string; // Optional: Erforderliche Rolle für Zugriff
}

export default defineComponent({
  name: "AdminPanel",
  components: {
    UsersTab,
    SystemTab,
    FeedbackTab,
    MotdTab,
    DocConverterTab,
    FeatureTogglesTab,
    ToastContainer,
  },
  setup() {
    // Aktueller Benutzer und Rolle - in Produktion aus dem Auth-System holen
    const currentUserRole = ref("admin"); // Für Demo-Zwecke als Admin

    const tabs: Tab[] = [
      {
        id: "users",
        label: "Benutzer",
        component: "UsersTab",
        icon: "fas fa-users",
      },
      {
        id: "system",
        label: "System",
        component: "SystemTab",
        icon: "fas fa-cogs",
      },
      {
        id: "feedback",
        label: "Feedback",
        component: "FeedbackTab",
        icon: "fas fa-comment",
      },
      {
        id: "motd",
        label: "Nachrichten",
        component: "MotdTab",
        icon: "fas fa-bullhorn",
      },
      {
        id: "docConverter",
        label: "Dokumentenkonverter",
        component: "DocConverterTab",
        icon: "fas fa-file-alt",
      },
      {
        id: "featureToggles",
        label: "Feature-Toggles",
        component: "FeatureTogglesTab",
        icon: "fas fa-toggle-on",
        requiredRole: "admin",
      },
    ];

    // Filtert Tabs basierend auf Benutzerberechtigungen
    const visibleTabs = computed(() => {
      return tabs.filter((tab) => {
        // Wenn keine Rolle erforderlich ist oder Benutzer die Rolle hat
        return !tab.requiredRole || tab.requiredRole === currentUserRole.value;
      });
    });

    const activeTab = ref("users");

    // Stellt sicher, dass der aktive Tab auch sichtbar ist
    watch(visibleTabs, (newVisibleTabs) => {
      if (
        newVisibleTabs.findIndex((t) => t.id === activeTab.value) === -1 &&
        newVisibleTabs.length > 0
      ) {
        // Wenn der aktive Tab nicht mehr sichtbar ist, wechsle zum ersten sichtbaren Tab
        activeTab.value = newVisibleTabs[0].id;
      }
    });

    const currentTabComponent = computed(() => {
      const tab = tabs.find((t) => t.id === activeTab.value);
      return tab ? tab.component : "UsersTab";
    });

    return {
      tabs,
      visibleTabs,
      activeTab,
      currentTabComponent,
    };
  },
});
</script>

<style scoped>
.admin-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: #f8f9fa;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.admin-header {
  background-color: #343a40;
  color: white;
  padding: 15px 20px;
  border-bottom: 1px solid #dee2e6;
}

.admin-header h2 {
  margin: 0;
  font-size: 1.25rem;
}

.admin-tabs {
  display: flex;
  background-color: #f1f3f5;
  border-bottom: 1px solid #dee2e6;
  overflow-x: auto;
}

.admin-tabs button {
  padding: 12px 16px;
  border: none;
  background: none;
  font-weight: 500;
  color: #495057;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.admin-tabs button:hover {
  background-color: #e9ecef;
  color: #212529;
}

.admin-tabs button.active {
  background-color: #007bff;
  color: white;
  border-radius: 0;
}

.admin-content {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
}

.nscale-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  font-weight: 500;
  text-align: center;
  cursor: pointer;
}
</style>
