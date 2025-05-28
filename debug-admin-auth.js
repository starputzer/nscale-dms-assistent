// Debug-Skript für Authentifizierungsprobleme in der Admin-Oberfläche
//
// Dieses Skript kann in der Browser-Konsole ausgeführt werden, um die
// aktuelle Authentifizierungssituation zu diagnostizieren und zu beheben.

(function () {
  console.log("=== Admin Auth Debug Tool ===");

  // LocalStorage-Einstellungen prüfen
  console.log("\n📝 LocalStorage Auth-Einstellungen:");
  const adminOverride = localStorage.getItem("admin_override");
  const forceMockAuth = localStorage.getItem("force_mock_auth");
  const nscaleAccessToken = localStorage.getItem("nscale_access_token");
  const token = localStorage.getItem("token");

  console.log(`admin_override: ${adminOverride}`);
  console.log(`force_mock_auth: ${forceMockAuth}`);
  console.log(
    `nscale_access_token: ${nscaleAccessToken ? "vorhanden (gekürzt): " + nscaleAccessToken.substring(0, 20) + "..." : "nicht vorhanden"}`,
  );
  console.log(
    `token: ${token ? "vorhanden (gekürzt): " + token.substring(0, 20) + "..." : "nicht vorhanden"}`,
  );

  // Pinia Auth-Store prüfen
  console.log("\n🔐 Pinia Auth-Store Status:");

  try {
    // Pinia Store nur prüfen, wenn verfügbar
    if (window.__pinia && window.__pinia.state.value.auth) {
      const authStore = window.__pinia.state.value.auth;
      console.log(`isAuthenticated: ${!!authStore.token && !!authStore.user}`);
      console.log(
        `isAdmin: ${authStore.isAdmin || authStore.user?.role === "admin" || (authStore.user?.roles && authStore.user.roles.includes("admin"))}`,
      );
      console.log(`user: `, authStore.user);
      console.log(`tokenStatus: ${authStore.tokenStatus}`);
      console.log(
        `tokenExpiresIn: ${authStore.expiresAt ? Math.floor((authStore.expiresAt - Date.now()) / 1000) : "Kein Ablaufdatum"} Sekunden`,
      );
    } else {
      console.log(
        "Pinia Auth-Store nicht verfügbar. App möglicherweise nicht vollständig initialisiert.",
      );
    }
  } catch (e) {
    console.error("Fehler beim Zugriff auf Pinia Auth-Store:", e);
  }

  // JWT-Token dekodieren wenn vorhanden
  console.log("\n🔍 JWT-Token Analyse:");
  try {
    const tokenToAnalyze = nscaleAccessToken || token;
    if (tokenToAnalyze) {
      const tokenParts = tokenToAnalyze.split(".");
      if (tokenParts.length === 3) {
        // Base64-decode des Payload-Teils
        const payload = JSON.parse(
          atob(tokenParts[1].replace(/-/g, "+").replace(/_/g, "/")),
        );
        console.log("Token Payload:", payload);

        // Ablaufzeit prüfen
        if (payload.exp) {
          const expiryDate = new Date(payload.exp * 1000);
          const now = new Date();
          const secondsRemaining = Math.floor((expiryDate - now) / 1000);

          console.log(`Ablaufzeitpunkt: ${expiryDate.toLocaleString()}`);
          console.log(
            `Verbleibende Zeit: ${secondsRemaining} Sekunden (${Math.floor(secondsRemaining / 60)} Minuten)`,
          );
          console.log(
            `Status: ${secondsRemaining > 0 ? "Gültig" : "Abgelaufen"}`,
          );
        }

        // Rollen analysieren
        if (payload.role || payload.roles) {
          console.log(`Rolle(n): ${payload.role || payload.roles.join(", ")}`);
          if (
            payload.role === "admin" ||
            (payload.roles && payload.roles.includes("admin"))
          ) {
            console.log("✅ Admin-Rolle im Token gefunden.");
          } else {
            console.log("⚠️ Keine Admin-Rolle im Token gefunden.");
          }
        }
      } else {
        console.log(
          "Token hat kein gültiges JWT-Format (Header.Payload.Signature)",
        );
      }
    } else {
      console.log("Kein Token zum Analysieren gefunden.");
    }
  } catch (e) {
    console.error("Fehler bei der Token-Analyse:", e);
  }

  // Administratorzugriff erzwingen
  console.log("\n⚙️ Admin-Zugriff reparieren:");
  console.log(
    "Führen Sie die folgenden Befehle aus, um Admin-Zugriff zu erzwingen:",
  );
  console.log("localStorage.setItem('admin_override', 'true');");
  console.log("localStorage.setItem('force_mock_auth', 'true');");
  console.log("localStorage.setItem('debug_mode', 'true');");
  console.log("localStorage.setItem('auth_debug', 'true');");
  console.log("Anschließend laden Sie die Seite neu.");

  // Funktion zum Beheben der häufigsten Probleme
  window.fixAdminAccess = function () {
    console.log("Behebe Admin-Zugriffsprobleme...");
    localStorage.setItem("admin_override", "true");
    localStorage.setItem("force_mock_auth", "true");
    localStorage.setItem("debug_mode", "true");
    localStorage.setItem("auth_debug", "true");

    console.log(
      "Einstellungen gesetzt. Seite wird in 2 Sekunden neu geladen...",
    );
    setTimeout(() => {
      window.location.reload();
    }, 2000);
  };

  console.log(
    "\nFür automatische Behebung, führen Sie window.fixAdminAccess() aus.",
  );
  console.log("=== Debug Tool Ende ===");
})();
