/**
 * Debug-Skript für Admin-Routing
 *
 * Dieses Skript fügt Debugging-Code für das Admin-Panel-Routing hinzu.
 * Führen Sie es im Browser-Konsolenfenster aus, während Sie die Admin-Seite anzeigen.
 */

// Funktion zum Überwachen von Router-Änderungen
function setupRouterDebug() {
  if (!window.router) {
    console.error(
      "Router nicht gefunden! Stellen Sie sicher, dass Sie auf einer Vue-Seite sind.",
    );
    return;
  }

  console.log("🔍 Router-Debugging aktiviert");

  // Aktuelle Route anzeigen
  const currentRoute = window.router.currentRoute.value;
  console.log("Aktuelle Route:", {
    fullPath: currentRoute.fullPath,
    path: currentRoute.path,
    name: currentRoute.name,
    params: currentRoute.params,
    query: currentRoute.query,
    hash: currentRoute.hash,
    matched: currentRoute.matched.map((record) => ({
      path: record.path,
      name: record.name,
      components: Object.keys(record.components || {}),
    })),
  });

  // Navigation Guard für Debugging
  window.router.beforeEach((to, from, next) => {
    console.log(
      "🚦 Navigation: %c" + from.path + "%c → %c" + to.path,
      "color: gray",
      "color: black",
      "color: blue",
    );

    console.log("Ziel-Route:", {
      path: to.path,
      name: to.name,
      params: to.params,
      query: to.query,
      meta: to.meta,
    });

    next();
  });

  // Historie-Listen-Symbol
  window.addEventListener("popstate", (event) => {
    console.log("⏮️ popstate-Event:", event);
  });
}

// Admin-Bereich manuell aufrufen
function navigateToAdmin(tab = "dashboard") {
  if (!window.router) {
    console.error(
      "Router nicht gefunden! Stellen Sie sicher, dass Sie auf einer Vue-Seite sind.",
    );
    return;
  }

  const path = `/admin/${tab}`;
  console.log(`🔄 Navigation zu ${path}`);

  window.router
    .push(path)
    .then(() => console.log("✅ Navigation erfolgreich"))
    .catch((err) => console.error("❌ Navigationsfehler:", err));
}

// Admin-Komponenten Analyse
function inspectAdminComponents() {
  if (!window.Vue) {
    console.error(
      "Vue nicht gefunden! Stellen Sie sicher, dass Sie auf einer Vue-Seite sind.",
    );
    return;
  }

  // Überprüfen der Admin-Komponentenhierarchie
  const adminView = document.querySelector(".admin-view");
  if (!adminView) {
    console.error("Admin-View nicht im DOM gefunden");
    return;
  }

  console.log("🔍 Admin-View gefunden im DOM");
  console.log("DOM-Struktur:", adminView);

  // VueJS-Instanz versuchen zu finden
  const instance = window.Vue?.__VUE_DEVTOOLS_GLOBAL_HOOK__?._instances?.find(
    (i) => i?.type?.name === "AdminView" || i?.type?.name === "AdminPanel",
  );

  if (instance) {
    console.log("✅ Vue-Instanz gefunden:", instance);
  } else {
    console.log("❌ Keine Vue-Instanz für Admin-Komponenten gefunden");
  }
}

// Routing-Problem-Diagnose ausführen
function diagnoseRoutingIssue() {
  console.clear();
  console.log("🔎 Admin-Routing Diagnose wird ausgeführt...");

  setupRouterDebug();

  console.log("\n📋 Bekannte Routen:");
  if (window.router) {
    window.router.getRoutes().forEach((route) => {
      if (route.path.includes("admin")) {
        console.log(`${route.path} (${route.name})`);

        // Child-Routen anzeigen
        if (route.children && route.children.length) {
          route.children.forEach((child) => {
            console.log(`  └─ ${route.path}/${child.path} (${child.name})`);
          });
        }
      }
    });
  }

  console.log(
    "\n🧪 Diagnose abgeschlossen. Verwenden Sie folgende Funktionen:",
  );
  console.log('  navigateToAdmin("dashboard") - Navigiert zum Admin-Dashboard');
  console.log(
    "  inspectAdminComponents() - Untersucht die Admin-Komponenten im DOM",
  );
}

// Expose debugging functions
window.debugAdminRouting = {
  setup: setupRouterDebug,
  navigate: navigateToAdmin,
  inspect: inspectAdminComponents,
  diagnose: diagnoseRoutingIssue,
};

// Automatisch Diagnose ausführen
diagnoseRoutingIssue();

console.log(
  "%cAdmin-Routing Debugging aktiviert!",
  "color: green; font-weight: bold; font-size: 14px",
);
console.log(
  "Verwenden Sie window.debugAdminRouting.diagnose() für eine vollständige Diagnose",
);
