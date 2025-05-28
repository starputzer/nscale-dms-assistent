<template>
  <div class="admin-login-prompt" v-if="showPrompt">
    <div class="admin-login-prompt__overlay" @click="close"></div>
    <div class="admin-login-prompt__modal">
      <div class="admin-login-prompt__header">
        <h2>
          {{ t("auth.adminLoginRequired", "Admin-Anmeldung erforderlich") }}
        </h2>
        <button class="admin-login-prompt__close" @click="close">
          <i class="fas fa-times"></i>
        </button>
      </div>

      <div class="admin-login-prompt__content">
        <p>
          {{
            t(
              "auth.adminLoginMessage",
              "Bitte melden Sie sich mit einem Admin-Konto an, um auf diesen Bereich zuzugreifen.",
            )
          }}
        </p>

        <form @submit.prevent="handleLogin" class="admin-login-form">
          <div class="form-group">
            <label for="email">{{ t("auth.email", "E-Mail") }}</label>
            <input
              type="email"
              id="email"
              v-model="credentials.email"
              :placeholder="t('auth.emailPlaceholder', 'admin@example.com')"
              required
              autofocus
            />
          </div>

          <div class="form-group">
            <label for="password">{{ t("auth.password", "Passwort") }}</label>
            <input
              type="password"
              id="password"
              v-model="credentials.password"
              :placeholder="t('auth.passwordPlaceholder', '••••••••')"
              required
            />
          </div>

          <div v-if="error" class="error-message">
            <i class="fas fa-exclamation-circle"></i>
            {{ error }}
          </div>

          <div class="form-actions">
            <button type="submit" class="btn btn-primary" :disabled="loading">
              <span v-if="loading">
                <i class="fas fa-spinner fa-spin"></i>
                {{ t("auth.loggingIn", "Anmeldung läuft...") }}
              </span>
              <span v-else>
                {{ t("auth.login", "Anmelden") }}
              </span>
            </button>
            <button type="button" class="btn btn-secondary" @click="close">
              {{ t("auth.cancel", "Abbrechen") }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { useI18n } from "@/composables/useI18n";
import { useToast } from "@/composables/useToast";

interface Props {
  show?: boolean;
  redirectTo?: string;
}

const props = withDefaults(defineProps<Props>(), {
  show: false,
  redirectTo: "/admin",
});

const emit = defineEmits<{
  close: [];
  success: [];
}>();

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const { t } = useI18n();
const toast = useToast();

const showPrompt = ref(props.show);
const loading = ref(false);
const error = ref<string | null>(null);

const credentials = ref({
  email: "",
  password: "",
});

watch(
  () => props.show,
  (newValue) => {
    showPrompt.value = newValue;
    if (newValue) {
      // Reset form when opening
      credentials.value = { email: "", password: "" };
      error.value = null;
    }
  },
);

const close = () => {
  showPrompt.value = false;
  emit("close");
};

const handleLogin = async () => {
  loading.value = true;
  error.value = null;

  try {
    const success = await authStore.login(credentials.value);

    if (success) {
      // Check if user is actually an admin
      if (authStore.isAdmin) {
        toast.success(t("auth.loginSuccess", "Erfolgreich angemeldet"));
        emit("success");
        close();

        // Redirect to the intended admin page
        const redirect = (route.query.redirect as string) || props.redirectTo;
        router.push(redirect);
      } else {
        error.value = t(
          "auth.notAdmin",
          "Dieses Konto hat keine Admin-Berechtigungen",
        );
        // Log out non-admin user
        await authStore.logout();
      }
    } else {
      error.value = t(
        "auth.loginFailed",
        "Anmeldung fehlgeschlagen. Bitte überprüfen Sie Ihre Anmeldedaten.",
      );
    }
  } catch (err: any) {
    console.error("Login error:", err);
    error.value =
      err.message || t("auth.loginError", "Ein Fehler ist aufgetreten");
  } finally {
    loading.value = false;
  }
};
</script>

<style lang="scss" scoped>
.admin-login-prompt {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;

  &__overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
  }

  &__modal {
    position: relative;
    background: var(--nscale-surface);
    border-radius: 8px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
    width: 90%;
    max-width: 400px;
    animation: slideIn 0.3s ease-out;
  }

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px;
    border-bottom: 1px solid var(--nscale-border);

    h2 {
      margin: 0;
      font-size: 20px;
      color: var(--nscale-text);
    }
  }

  &__close {
    background: none;
    border: none;
    font-size: 20px;
    color: var(--nscale-text-secondary);
    cursor: pointer;
    padding: 4px 8px;
    transition: color 0.2s;

    &:hover {
      color: var(--nscale-text);
    }
  }

  &__content {
    padding: 20px;

    p {
      margin: 0 0 20px 0;
      color: var(--nscale-text-secondary);
    }
  }
}

.admin-login-form {
  .form-group {
    margin-bottom: 16px;

    label {
      display: block;
      margin-bottom: 8px;
      font-weight: 500;
      color: var(--nscale-text);
    }

    input {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid var(--nscale-border);
      border-radius: 4px;
      font-size: 14px;
      transition: border-color 0.2s;

      &:focus {
        outline: none;
        border-color: var(--nscale-primary);
      }
    }
  }

  .error-message {
    margin: 16px 0;
    padding: 12px;
    background: var(--nscale-danger-light);
    color: var(--nscale-danger);
    border-radius: 4px;
    font-size: 14px;
    display: flex;
    align-items: center;
    gap: 8px;

    i {
      font-size: 16px;
    }
  }

  .form-actions {
    display: flex;
    gap: 12px;
    margin-top: 24px;

    .btn {
      flex: 1;
      padding: 10px 16px;
      border: none;
      border-radius: 4px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;

      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      &.btn-primary {
        background: var(--nscale-primary);
        color: white;

        &:hover:not(:disabled) {
          background: var(--nscale-primary-dark);
        }
      }

      &.btn-secondary {
        background: var(--nscale-background);
        color: var(--nscale-text);
        border: 1px solid var(--nscale-border);

        &:hover {
          background: var(--nscale-border);
        }
      }
    }
  }
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

// Dark mode support
.theme-dark {
  .admin-login-prompt {
    &__modal {
      background: var(--nscale-surface-dark);
    }

    input {
      background: var(--nscale-background-dark);
      color: var(--nscale-text-dark);
      border-color: var(--nscale-border-dark);

      &:focus {
        border-color: var(--nscale-primary);
      }
    }
  }
}
</style>
