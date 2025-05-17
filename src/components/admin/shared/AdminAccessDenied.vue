<template>
  <div class="admin-access-denied">
    <div class="admin-access-denied__icon">
      <i class="fas fa-lock"></i>
    </div>
    <h2 class="admin-access-denied__title">{{ title }}</h2>
    <p class="admin-access-denied__message">{{ message }}</p>

    <div class="admin-access-denied__actions">
      <button
        v-if="showLoginButton"
        @click="handleLogin"
        class="admin-access-denied__button admin-access-denied__button--primary"
      >
        <i class="fas fa-sign-in-alt"></i> Anmelden
      </button>

      <button
        @click="handleBack"
        class="admin-access-denied__button admin-access-denied__button--secondary"
      >
        <i class="fas fa-arrow-left"></i> Zurück
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";

interface Props {
  /**
   * Fehlercode (401, 403, etc.)
   * 401: Nicht authentifiziert (Token fehlt oder ist ungültig)
   * 403: Keine Berechtigung (Token gültig, aber keine ausreichenden Rechte)
   */
  errorCode?: number;

  /**
   * Alternative Nachricht zur Standardnachricht basierend auf dem Fehlercode
   */
  customMessage?: string;

  /**
   * Alternativer Titel zur Standardnachricht basierend auf dem Fehlercode
   */
  customTitle?: string;
}

const props = withDefaults(defineProps<Props>(), {
  errorCode: 403,
  customMessage: "",
  customTitle: "",
});

const authStore = useAuthStore();
const router = useRouter();

// Titel basierend auf Fehlercode oder benutzerdefiniertem Titel
const title = computed(() => {
  if (props.customTitle) return props.customTitle;

  switch (props.errorCode) {
    case 401:
      return "Anmeldung erforderlich";
    case 403:
      return "Zugriff verweigert";
    default:
      return "Keine Berechtigung";
  }
});

// Nachricht basierend auf Fehlercode oder benutzerdefinierter Nachricht
const message = computed(() => {
  if (props.customMessage) return props.customMessage;

  switch (props.errorCode) {
    case 401:
      return "Sie müssen angemeldet sein, um auf den Admin-Bereich zuzugreifen.";
    case 403:
      return "Sie haben keine ausreichenden Berechtigungen für den Admin-Bereich.";
    default:
      return "Sie haben keine Berechtigung, auf diesen Bereich zuzugreifen.";
  }
});

// Anmeldebutton nur anzeigen, wenn nicht authentifiziert (401)
const showLoginButton = computed(() => {
  return props.errorCode === 401 || !authStore.isAuthenticated;
});

// Anmelden-Handler
const handleLogin = () => {
  router.push({
    path: "/login",
    query: {
      redirect: router.currentRoute.value.fullPath,
      message: "admin_required",
    },
  });
};

// Zurück-Handler
const handleBack = () => {
  if (window.history.length > 1) {
    router.back();
  } else {
    router.push("/");
  }
};
</script>

<style lang="scss" scoped>
.admin-access-denied {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  text-align: center;
  background-color: #f8f9fa;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  margin: 2rem auto;
  max-width: 500px;

  &__icon {
    font-size: 3rem;
    color: #dc3545;
    margin-bottom: 1rem;
  }

  &__title {
    font-size: 1.5rem;
    font-weight: 600;
    margin-bottom: 1rem;
    color: #343a40;
  }

  &__message {
    font-size: 1rem;
    color: #6c757d;
    line-height: 1.5;
    margin-bottom: 1.5rem;
  }

  &__actions {
    display: flex;
    gap: 1rem;
    margin-top: 0.5rem;
  }

  &__button {
    padding: 0.5rem 1rem;
    border-radius: 4px;
    cursor: pointer;
    font-weight: 500;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    gap: 0.5rem;

    &--primary {
      background-color: #0d6efd;
      color: white;
      border: none;

      &:hover {
        background-color: #0b5ed7;
      }
    }

    &--secondary {
      background-color: #6c757d;
      color: white;
      border: none;

      &:hover {
        background-color: #5a6268;
      }
    }
  }
}

// Responsive Anpassungen
@media (max-width: 576px) {
  .admin-access-denied {
    padding: 1.5rem;
    margin: 1rem;

    &__icon {
      font-size: 2.5rem;
    }

    &__title {
      font-size: 1.25rem;
    }

    &__actions {
      flex-direction: column;
    }
  }
}
</style>
