<template>
  <div class="component-demo">
    <h2>Tabs Component</h2>

    <div class="demo-section">
      <h3>Basic Tabs</h3>
      <Tabs :tabs="basicTabs" v-model="activeBasicTab" />

      <div class="tab-content">
        <template v-if="activeBasicTab === 0">
          <h4>Tab 1 Content</h4>
          <p>
            This is the content for the first tab. You can put any content here.
          </p>
        </template>

        <template v-else-if="activeBasicTab === 1">
          <h4>Tab 2 Content</h4>
          <p>
            This is the content for the second tab. Each tab can have different
            content.
          </p>
        </template>

        <template v-else-if="activeBasicTab === 2">
          <h4>Tab 3 Content</h4>
          <p>
            This is the content for the third tab. Note that tabs are accessible
            and keyboard navigable.
          </p>
        </template>
      </div>
    </div>

    <div class="demo-section">
      <h3>Tab Variants</h3>

      <div class="tabs-group">
        <h4>Default Tabs</h4>
        <Tabs :tabs="styleTabs" variant="default" />
      </div>

      <div class="tabs-group">
        <h4>Pills Tabs</h4>
        <Tabs :tabs="styleTabs" variant="pills" />
      </div>

      <div class="tabs-group">
        <h4>Underline Tabs</h4>
        <Tabs :tabs="styleTabs" variant="underline" />
      </div>

      <div class="tabs-group">
        <h4>Minimal Tabs</h4>
        <Tabs :tabs="styleTabs" variant="minimal" />
      </div>
    </div>

    <div class="demo-section">
      <h3>Tabs With Icons</h3>
      <Tabs :tabs="iconTabs" />
    </div>

    <div class="demo-section">
      <h3>Tabs With Badges</h3>
      <Tabs :tabs="badgeTabs" />
    </div>

    <div class="demo-section">
      <h3>Stretched Tabs</h3>
      <Tabs :tabs="basicTabs" stretch />
    </div>

    <div class="demo-section">
      <h3>Vertical Tabs</h3>
      <Tabs :tabs="verticalTabs" vertical v-model="activeVerticalTab">
        <template #tab-0>
          <div class="vertical-tab-content">
            <h4>Dashboard Overview</h4>
            <p>
              This is a sample dashboard overview content. You can place your
              dashboard widgets here.
            </p>
            <div class="sample-chart">[Dashboard Chart Placeholder]</div>
          </div>
        </template>

        <template #tab-1>
          <div class="vertical-tab-content">
            <h4>User Profile</h4>
            <p>
              This is where user profile information would be displayed and
              editable.
            </p>
            <div class="form-example">
              <div class="form-group">
                <label>Name</label>
                <input type="text" value="John Doe" />
              </div>
              <div class="form-group">
                <label>Email</label>
                <input type="email" value="john@example.com" />
              </div>
            </div>
          </div>
        </template>

        <template #tab-2>
          <div class="vertical-tab-content">
            <h4>Settings</h4>
            <p>
              Application settings would go here. This is just a demonstration.
            </p>
            <div class="settings-toggles">
              <div class="setting-item">
                <span>Dark Mode</span>
                <Toggle v-model="darkMode" />
              </div>
              <div class="setting-item">
                <span>Notifications</span>
                <Toggle v-model="notifications" />
              </div>
            </div>
          </div>
        </template>
      </Tabs>
    </div>

    <div class="demo-section">
      <h3>Tabs With Components</h3>
      <Tabs :tabs="componentTabs" />
    </div>

    <div class="demo-section">
      <h3>Dynamic Tabs</h3>

      <Tabs :tabs="dynamicTabs" v-model="activeDynamicTab" />

      <div class="dynamic-tabs-controls">
        <input
          v-model="newTabName"
          type="text"
          placeholder="New tab name"
          class="input-field"
        />

        <Button @click="addTab" :disabled="!newTabName">Add Tab</Button>
        <Button
          @click="removeTab"
          variant="error"
          :disabled="dynamicTabs.length <= 1"
        >
          Remove Current Tab
        </Button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, markRaw } from "vue";
import { Tabs, Toggle, Button } from "../base";
import type { TabItem } from "../base/Tabs.vue";

// Basic tabs
const basicTabs = [
  { label: "Tab 1" },
  { label: "Tab 2" },
  { label: "Tab 3", disabled: true },
];
const activeBasicTab = ref(0);

// Styling tabs
const styleTabs = [
  { label: "Home" },
  { label: "Profile" },
  { label: "Messages" },
  { label: "Settings" },
];

// Mock components
const DashboardComponent = {
  template: "<div><h4>Dashboard</h4><p>Dashboard content goes here</p></div>",
};

const ProfileComponent = {
  template:
    "<div><h4>User Profile</h4><p>User profile settings and information</p></div>",
};

const SettingsComponent = {
  template:
    "<div><h4>Settings</h4><p>Application settings and configuration</p></div>",
};

// Icon tabs (mock icons)
const HomeIcon = {
  template: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"></path>
    <polyline points="9 22 9 12 15 12 15 22"></polyline>
  </svg>`,
};

const UserIcon = {
  template: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"></path>
    <circle cx="12" cy="7" r="4"></circle>
  </svg>`,
};

const SettingsIcon = {
  template: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
    <circle cx="12" cy="12" r="3"></circle>
    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"></path>
  </svg>`,
};

const iconTabs = [
  { label: "Home", icon: HomeIcon },
  { label: "Profile", icon: UserIcon },
  { label: "Settings", icon: SettingsIcon },
  { icon: SettingsIcon }, // Icon-only tab
];

// Badge tabs
const badgeTabs = [
  { label: "Inbox", badge: 5 },
  { label: "Notifications", badge: "99+" },
  { label: "Updates", badge: "New" },
];

// Vertical tabs
const verticalTabs = [
  { label: "Dashboard", icon: HomeIcon },
  { label: "Profile", icon: UserIcon },
  { label: "Settings", icon: SettingsIcon },
];
const activeVerticalTab = ref(0);

// Settings for vertical tabs demo
const darkMode = ref(false);
const notifications = ref(true);

// Component tabs
const componentTabs = [
  {
    label: "Dashboard",
    icon: HomeIcon,
    component: markRaw(DashboardComponent),
  },
  {
    label: "Profile",
    icon: UserIcon,
    component: markRaw(ProfileComponent),
  },
  {
    label: "Settings",
    icon: SettingsIcon,
    component: markRaw(SettingsComponent),
  },
];

// Dynamic tabs
const dynamicTabs = ref<TabItem[]>([{ label: "Home", icon: HomeIcon }]);
const activeDynamicTab = ref(0);
const newTabName = ref("");

function addTab() {
  if (!newTabName.value) return;

  dynamicTabs.value.push({
    label: newTabName.value,
  });

  // Switch to the new tab
  activeDynamicTab.value = dynamicTabs.value.length - 1;

  // Clear the input
  newTabName.value = "";
}

function removeTab() {
  if (dynamicTabs.value.length <= 1) return;

  // Remove the current tab
  const currentIndex = activeDynamicTab.value;
  dynamicTabs.value.splice(currentIndex, 1);

  // Adjust the active tab index if needed
  if (currentIndex >= dynamicTabs.value.length) {
    activeDynamicTab.value = dynamicTabs.value.length - 1;
  }
}
</script>

<style scoped>
.component-demo {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

h2 {
  margin-bottom: 20px;
  color: var(--color-primary);
}

h3 {
  margin: 15px 0;
  color: var(--color-text-secondary);
}

h4 {
  margin: 10px 0;
  color: var(--color-text-primary);
}

.demo-section {
  margin-bottom: 30px;
  padding: 20px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background-color: var(--color-background-light);
}

.tab-content {
  padding: 20px;
  background-color: var(--color-background-secondary);
  border-radius: 0 0 8px 8px;
  margin-top: 1px;
}

.tabs-group {
  margin-bottom: 20px;
}

.vertical-tab-content {
  padding: 0 20px;
}

.sample-chart {
  margin: 20px 0;
  padding: 30px;
  text-align: center;
  background-color: var(--color-background-secondary);
  border: 1px dashed var(--color-border);
  border-radius: 4px;
}

.form-example {
  margin: 20px 0;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: 500;
}

.form-group input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background-color: var(--color-background-primary);
}

.settings-toggles {
  margin: 20px 0;
}

.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid var(--color-border);
}

.dynamic-tabs-controls {
  margin-top: 20px;
  display: flex;
  gap: 10px;
  align-items: center;
}

.input-field {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background-color: var(--color-background-primary);
}

@media (prefers-color-scheme: dark) {
  .demo-section {
    background-color: var(--color-background-dark);
  }

  .tab-content,
  .sample-chart {
    background-color: var(--color-gray-800);
  }

  .form-group input,
  .input-field {
    background-color: var(--color-gray-700);
    color: var(--color-text-primary-dark);
  }
}
</style>
