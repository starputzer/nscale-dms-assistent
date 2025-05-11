<template>
  <div class="h-screen flex flex-col">
    <!-- Login & Register -->
    <div
      v-if="!authStore.isAuthenticated"
      class="flex items-center justify-center h-full bg-gray-50"
    >
      <div class="nscale-card max-w-md w-full p-8">
        <div class="text-center mb-8">
          <div class="nscale-logo mx-auto">nscale DMS Assistent</div>
          <p class="text-gray-500 mt-2">
            Ihr Digitalisierungspartner für DMS-Lösungen
          </p>
        </div>

        <!-- MOTD auch auf der Login-Seite anzeigen -->
        <MotdDisplay
          v-if="
            motdStore.motd && motdStore.motd.enabled && !motdStore.isDismissed
          "
          :motd="motdStore.motd"
          class="mb-4"
          @dismiss="motdStore.dismissMotd"
        />

        <!-- Auth Views -->
        <component :is="currentAuthView" />
      </div>
    </div>

    <!-- Main Application (Chat + Admin) -->
    <div v-else class="flex flex-col h-screen">
      <!-- Navigation Header -->
      <AppHeader
        @new-session="sessionStore.startNewSession"
        @toggle-view="toggleView"
        @logout="authStore.logout"
      />

      <!-- Main Content with Admin Sidebar -->
      <div class="flex flex-1 overflow-hidden container mx-auto my-4">
        <!-- Sidebar: Admin oder Session -->
        <component
          :is="activeView === 'admin' ? 'AdminSidebar' : 'SessionSidebar'"
          class="w-80 p-4 rounded-l-lg shadow-sm overflow-y-auto"
        />

        <!-- Main Content Area -->
        <main
          class="flex-1 flex flex-col bg-white overflow-hidden rounded-lg shadow-sm ml-4 relative"
        >
          <!-- Hauptansicht: Chat oder Admin -->
          <component :is="mainViewComponent" />

          <!-- Navigation Toggle Button -->
          <button @click="toggleSettings" class="floating-action-button">
            <i class="fas fa-universal-access"></i>
          </button>
        </main>
      </div>
    </div>

    <!-- Settings Panel mit @click.stop um Event-Propagation zu stoppen -->
    <SettingsPanel v-if="uiStore.showSettingsPanel" @close="toggleSettings" />

    <!-- Dialoge -->
    <FeedbackDialog v-if="feedbackStore.showFeedbackDialog" />
    <SourceDialog v-if="sourceStore.showSourceDialog" />
    <ExplanationDialog v-if="sourceStore.showExplanationDialog" />
  </div>
</template>

<script setup>
import { computed, onMounted, provide } from "vue";
import { useAuthStore } from "@/stores/auth";
import { useSessionStore } from "@/stores/session";
import { useMotdStore } from "@/stores/motd";
import { useUiStore } from "@/stores/ui";
import { useFeedbackStore } from "@/stores/feedback";
import { useSourceStore } from "@/stores/source";

// Komponenten
import LoginForm from "@/components/auth/LoginForm.vue";
import RegisterForm from "@/components/auth/RegisterForm.vue";
import PasswordReset from "@/components/auth/PasswordReset.vue";
import AppHeader from "@/components/layout/AppHeader.vue";
import AdminSidebar from "@/components/admin/AdminSidebar.vue";
import SessionSidebar from "@/components/chat/SessionSidebar.vue";
import ChatView from "@/components/chat/ChatView.vue";
import AdminView from "@/components/admin/AdminView.vue";
import SettingsPanel from "@/components/settings/SettingsPanel.vue";
import FeedbackDialog from "@/components/feedback/FeedbackDialog.vue";
import SourceDialog from "@/components/source/SourceDialog.vue";
import ExplanationDialog from "@/components/source/ExplanationDialog.vue";
import MotdDisplay from "@/components/ui/MotdDisplay.vue";

// Store-Referenzen
const authStore = useAuthStore();
const sessionStore = useSessionStore();
const motdStore = useMotdStore();
const uiStore = useUiStore();
const feedbackStore = useFeedbackStore();
const sourceStore = useSourceStore();

// Store-Injection für verschachtelte Komponenten
provide("authStore", authStore);
provide("sessionStore", sessionStore);
provide("motdStore", motdStore);
provide("uiStore", uiStore);
provide("feedbackStore", feedbackStore);
provide("sourceStore", sourceStore);

// Computed
const currentAuthView = computed(() => {
  switch (authStore.authMode) {
    case "register":
      return RegisterForm;
    case "reset":
      return PasswordReset;
    default:
      return LoginForm;
  }
});

const activeView = computed(() => uiStore.activeView);

const mainViewComponent = computed(() => {
  return activeView.value === "admin" ? AdminView : ChatView;
});

// Methoden
const toggleView = () => {
  uiStore.toggleView();
};

const toggleSettings = () => {
  uiStore.toggleSettingsPanel();
};

// Lebenszyklus-Hooks
onMounted(async () => {
  // Lade Session-Daten bei der Initialisierung, falls Benutzer angemeldet ist
  if (authStore.isAuthenticated) {
    await Promise.all([sessionStore.initialize(), motdStore.loadMotd()]);
  }

  // Event-Listener für die Abmeldung bei Seitenwechsel
  window.addEventListener("beforeunload", () => {
    // Speichere wichtige Daten, bevor die Seite verlassen wird
  });
});
</script>

<style>
@import "tailwindcss/base";
@import "tailwindcss/components";
@import "tailwindcss/utilities";

body {
  margin: 0;
  font-family:
    -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue",
    Arial, sans-serif;
}

/* Stylesheets für Komponenten werden automatisch geladen */
</style>
