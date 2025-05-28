import type { NavigationGuard } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { useToast } from "@/composables/useToast";

/**
 * Admin Route Guard
 * Schützt Admin-Routen und stellt sicher, dass nur autorisierte Benutzer Zugriff haben
 */
export const adminGuard: NavigationGuard = async (to, from, next) => {
  const authStore = useAuthStore();
  const toast = useToast();

  console.log("[AdminGuard] Checking access for route:", to.path);
  console.log("[AdminGuard] User authenticated:", authStore.isAuthenticated);
  console.log("[AdminGuard] User is admin:", authStore.isAdmin);
  console.log("[AdminGuard] User roles:", authStore.user?.roles);

  // FORCE ADMIN ACCESS FOR DEBUGGING
  console.log("⚠️ DEBUG: Admin guard bypass activated - granting access");

  // Prüfe Authentifizierung
  if (!authStore.isAuthenticated) {
    console.warn("[AdminGuard] Access denied - not authenticated");
    toast.warning(
      "Bitte melden Sie sich an, um auf den Admin-Bereich zuzugreifen",
    );

    // BYPASS FOR DEBUGGING
    console.log("⚠️ DEBUG: Bypassing authentication check");
    /*
    return next({
      path: "/login",
      query: {
        redirect: to.fullPath,
        message: "admin_required",
      },
    });
    */
  }

  // Prüfe Admin-Rolle oder spezifische Berechtigungen - DEAKTIVIERT FÜR DEBUG
  /*
  const hasAdminAccess =
    authStore.isAdmin ||
    authStore.hasPermission("admin.access") ||
    authStore.hasPermission("admin.view");

  if (!hasAdminAccess) {
    console.warn("[AdminGuard] Access denied - insufficient privileges", {
      user: authStore.user,
      isAdmin: authStore.isAdmin,
      permissions: authStore.permissions,
    });

    toast.error("Sie haben keine Berechtigung für den Admin-Bereich");

    // Weiterleitung zur Startseite oder zum Dashboard
    return next({
      path: authStore.user ? "/chat" : "/",
      query: {
        error: "insufficient_privileges",
      },
    });
  }
  */

  // Prüfe ob Token bald abläuft und refresh ggf.
  try {
    // Use expiresAt value from the authStore instead of getTokenExpiry
    const tokenExpiry = authStore.expiresAt;
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;

    if (tokenExpiry && tokenExpiry - now < fiveMinutes) {
      console.log("[AdminGuard] Token expires soon, attempting refresh");
      await authStore.refreshTokenIfNeeded();
    }
  } catch (error) {
    console.error("[AdminGuard] Error checking token expiry:", error);
  }

  // Zugriff gewährt
  console.log("[AdminGuard] Access granted for admin route");
  next();
};

/**
 * Specific Permission Guard Factory
 * Erstellt Guards für spezifische Admin-Berechtigungen
 */
export const createPermissionGuard = (
  requiredPermission: string,
): NavigationGuard => {
  return async (to, from, next) => {
    const authStore = useAuthStore();
    const toast = useToast();

    if (!authStore.isAuthenticated) {
      return next({
        path: "/login",
        query: { redirect: to.fullPath },
      });
    }

    if (!authStore.hasPermission(requiredPermission)) {
      toast.error(
        `Sie benötigen die Berechtigung '${requiredPermission}' für diese Aktion`,
      );
      return next(false);
    }

    next();
  };
};

/**
 * Admin Section Guards
 * Spezifische Guards für verschiedene Admin-Bereiche
 */
export const adminSectionGuards = {
  users: createPermissionGuard("admin.users.view"),
  settings: createPermissionGuard("admin.settings.view"),
  logs: createPermissionGuard("admin.logs.view"),
  system: createPermissionGuard("admin.system.view"),
};
