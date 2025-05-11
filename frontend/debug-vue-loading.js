/**
 * Vue 3 SFC Diagnose-Tool
 *
 * Dieses Tool hilft bei der Diagnose von Ladeproblemen der Vue 3 SFC-Komponenten
 * und bietet Debugging-Funktionen, um den Zustand der Anwendung zu analysieren.
 */

(function () {
  // 1. Initialisierung des Diagnose-Tools
  console.log("Vue 3 SFC Diagnose-Tool wird initialisiert...");

  // Erstelle Debug-Container im DOM
  function createDebugUI() {
    const debugContainer = document.createElement("div");
    debugContainer.id = "vue-debug-container";
    debugContainer.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background-color: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 10px;
            border-radius: 5px;
            z-index: 9999;
            font-family: monospace;
            font-size: 12px;
            width: 350px;
            max-height: 80vh;
            overflow-y: auto;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
        `;

    const header = document.createElement("div");
    header.innerHTML =
      '<h3 style="margin: 0 0 10px 0; color: #00ff00; text-align: center;">Vue 3 SFC Debug</h3>';
    header.style.borderBottom = "1px solid #444";
    debugContainer.appendChild(header);

    const featureToggleSection = document.createElement("div");
    featureToggleSection.id = "feature-toggle-debug";
    featureToggleSection.innerHTML =
      '<h4 style="margin: 5px 0; color: #00ccff;">Feature Toggles</h4>';
    debugContainer.appendChild(featureToggleSection);

    const mountPointsSection = document.createElement("div");
    mountPointsSection.id = "mount-points-debug";
    mountPointsSection.innerHTML =
      '<h4 style="margin: 10px 0 5px 0; color: #00ccff;">Mount Points</h4>';
    debugContainer.appendChild(mountPointsSection);

    const bridgeSection = document.createElement("div");
    bridgeSection.id = "bridge-debug";
    bridgeSection.innerHTML =
      '<h4 style="margin: 10px 0 5px 0; color: #00ccff;">Bridge Status</h4>';
    debugContainer.appendChild(bridgeSection);

    const actionsSection = document.createElement("div");
    actionsSection.id = "actions-debug";
    actionsSection.innerHTML =
      '<h4 style="margin: 10px 0 5px 0; color: #00ccff;">Actions</h4>';
    actionsSection.style.borderTop = "1px solid #444";
    actionsSection.style.paddingTop = "10px";

    // Create action buttons
    const toggleAllButton = document.createElement("button");
    toggleAllButton.innerText = "Enable All SFC Features";
    toggleAllButton.style.cssText =
      "background: #4CAF50; color: white; border: none; padding: 5px 10px; margin: 5px; border-radius: 3px; cursor: pointer;";
    toggleAllButton.onclick = enableAllSfcFeatures;
    actionsSection.appendChild(toggleAllButton);

    const reloadButton = document.createElement("button");
    reloadButton.innerText = "Reload Page";
    reloadButton.style.cssText =
      "background: #2196F3; color: white; border: none; padding: 5px 10px; margin: 5px; border-radius: 3px; cursor: pointer;";
    reloadButton.onclick = () => location.reload();
    actionsSection.appendChild(reloadButton);

    const closeButton = document.createElement("button");
    closeButton.innerText = "Close Debug";
    closeButton.style.cssText =
      "background: #f44336; color: white; border: none; padding: 5px 10px; margin: 5px; border-radius: 3px; cursor: pointer;";
    closeButton.onclick = () => document.body.removeChild(debugContainer);
    actionsSection.appendChild(closeButton);

    const toggleVisButton = document.createElement("button");
    toggleVisButton.innerText = "Toggle Visibility";
    toggleVisButton.style.cssText =
      "background: #9c27b0; color: white; border: none; padding: 5px 10px; margin: 5px; border-radius: 3px; cursor: pointer;";
    toggleVisButton.onclick = toggleDebugVisibility;
    actionsSection.appendChild(toggleVisButton);

    debugContainer.appendChild(actionsSection);

    const logSection = document.createElement("div");
    logSection.id = "log-debug";
    logSection.innerHTML =
      '<h4 style="margin: 10px 0 5px 0; color: #00ccff;">Log</h4>';
    logSection.style.borderTop = "1px solid #444";
    logSection.style.paddingTop = "10px";
    logSection.style.maxHeight = "150px";
    logSection.style.overflowY = "auto";

    const logContent = document.createElement("div");
    logContent.id = "debug-log-content";
    logSection.appendChild(logContent);

    debugContainer.appendChild(logSection);

    document.body.appendChild(debugContainer);

    return debugContainer;
  }

  // Toggle visibility of debug panel
  function toggleDebugVisibility() {
    const container = document.getElementById("vue-debug-container");
    if (container) {
      if (container.style.display === "none") {
        container.style.display = "block";
      } else {
        container.style.display = "none";
      }
    }
  }

  // Log message to debug panel
  function logDebug(message) {
    const logContent = document.getElementById("debug-log-content");
    if (logContent) {
      const logEntry = document.createElement("div");
      logEntry.style.borderBottom = "1px dotted #555";
      logEntry.style.padding = "3px 0";
      logEntry.innerHTML = `<span style="color: #aaa;">[${new Date().toLocaleTimeString()}]</span> ${message}`;
      logContent.appendChild(logEntry);
      logContent.scrollTop = logContent.scrollHeight;
    }
    console.log("[Vue Debug]", message);
  }

  // 2. Diagnose Feature-Toggles
  function checkFeatureToggles() {
    let featureToggles = {};
    try {
      const storedToggles = localStorage.getItem("featureToggles");
      featureToggles = storedToggles ? JSON.parse(storedToggles) : {};
    } catch (e) {
      logDebug(`Fehler beim Laden der Feature-Toggles: ${e.message}`);
      featureToggles = {};
    }

    const toggleSection = document.getElementById("feature-toggle-debug");
    if (toggleSection) {
      toggleSection.innerHTML =
        '<h4 style="margin: 5px 0; color: #00ccff;">Feature Toggles</h4>';

      // Create table for feature toggles
      const table = document.createElement("table");
      table.style.width = "100%";
      table.style.borderCollapse = "collapse";

      // Add header row
      const headerRow = document.createElement("tr");
      headerRow.innerHTML = `
                <th style="text-align: left; padding: 2px 5px; border-bottom: 1px solid #444;">Feature</th>
                <th style="text-align: center; padding: 2px 5px; border-bottom: 1px solid #444;">Status</th>
                <th style="text-align: center; padding: 2px 5px; border-bottom: 1px solid #444;">Toggle</th>
            `;
      table.appendChild(headerRow);

      // Add SFC-related feature toggles
      const sfcFeatures = [
        "useSfcDocConverter",
        "useSfcAdmin",
        "useSfcChat",
        "useSfcSettings",
        "usePiniaAuth",
        "usePiniaUI",
        "usePiniaSessions",
        "usePiniaSettings",
        "useLegacyBridge",
      ];

      sfcFeatures.forEach((feature) => {
        const isEnabled = featureToggles[feature] === true;
        const isDependent = [
          "usePiniaAuth",
          "usePiniaUI",
          "usePiniaSessions",
          "usePiniaSettings",
        ].includes(feature);

        const row = document.createElement("tr");
        row.style.borderBottom = "1px dotted #333";

        const nameCell = document.createElement("td");
        nameCell.style.padding = "3px 5px";
        nameCell.innerText = feature;
        if (isDependent) {
          nameCell.innerHTML += ' <span style="color: #ff9800;">(dep)</span>';
        }

        const statusCell = document.createElement("td");
        statusCell.style.padding = "3px 5px";
        statusCell.style.textAlign = "center";
        statusCell.innerHTML = isEnabled
          ? '<span style="color: #4CAF50;">✓</span>'
          : '<span style="color: #f44336;">✕</span>';

        const toggleCell = document.createElement("td");
        toggleCell.style.padding = "3px 5px";
        toggleCell.style.textAlign = "center";

        const toggleButton = document.createElement("button");
        toggleButton.innerText = isEnabled ? "Disable" : "Enable";
        toggleButton.style.cssText = `
                    background: ${isEnabled ? "#f44336" : "#4CAF50"};
                    color: white;
                    border: none;
                    padding: 2px 5px;
                    border-radius: 3px;
                    font-size: 10px;
                    cursor: pointer;
                `;
        toggleButton.onclick = () => toggleFeature(feature);

        toggleCell.appendChild(toggleButton);

        row.appendChild(nameCell);
        row.appendChild(statusCell);
        row.appendChild(toggleCell);

        table.appendChild(row);
      });

      toggleSection.appendChild(table);

      // Check localStorage flag values
      const vueComponentsFlag = localStorage.getItem("useVueComponents");
      const vueDocConverterFlag = localStorage.getItem("useVueDocConverter");

      const localStorageInfo = document.createElement("div");
      localStorageInfo.style.marginTop = "10px";
      localStorageInfo.style.fontSize = "11px";
      localStorageInfo.innerHTML = `
                <div><strong>localStorage flags:</strong></div>
                <div>useVueComponents: <span style="color: ${vueComponentsFlag === "true" ? "#4CAF50" : "#f44336"};">${vueComponentsFlag || "not set"}</span></div>
                <div>useVueDocConverter: <span style="color: ${vueDocConverterFlag === "true" ? "#4CAF50" : "#f44336"};">${vueDocConverterFlag || "not set"}</span></div>
            `;
      toggleSection.appendChild(localStorageInfo);
    }
  }

  // 3. Check DOM Mount Points
  function checkMountPoints() {
    const mountSection = document.getElementById("mount-points-debug");
    if (mountSection) {
      mountSection.innerHTML =
        '<h4 style="margin: 10px 0 5px 0; color: #00ccff;">Mount Points</h4>';

      const mountPoints = [
        { id: "vue-app", desc: "Main Vue App" },
        { id: "vue-dms-app", desc: "DMS Assistant Vue App" },
        { id: "doc-converter-mount", desc: "Document Converter" },
        { id: "admin-mount", desc: "Admin Panel" },
      ];

      const table = document.createElement("table");
      table.style.width = "100%";
      table.style.borderCollapse = "collapse";

      // Add header row
      const headerRow = document.createElement("tr");
      headerRow.innerHTML = `
                <th style="text-align: left; padding: 2px 5px; border-bottom: 1px solid #444;">Element ID</th>
                <th style="text-align: left; padding: 2px 5px; border-bottom: 1px solid #444;">Description</th>
                <th style="text-align: center; padding: 2px 5px; border-bottom: 1px solid #444;">Exists</th>
            `;
      table.appendChild(headerRow);

      mountPoints.forEach((point) => {
        const exists = !!document.getElementById(point.id);

        const row = document.createElement("tr");
        row.style.borderBottom = "1px dotted #333";

        const idCell = document.createElement("td");
        idCell.style.padding = "3px 5px";
        idCell.innerText = point.id;

        const descCell = document.createElement("td");
        descCell.style.padding = "3px 5px";
        descCell.innerText = point.desc;

        const existsCell = document.createElement("td");
        existsCell.style.padding = "3px 5px";
        existsCell.style.textAlign = "center";
        existsCell.innerHTML = exists
          ? '<span style="color: #4CAF50;">✓</span>'
          : '<span style="color: #f44336;">✕</span>';

        row.appendChild(idCell);
        row.appendChild(descCell);
        row.appendChild(existsCell);

        table.appendChild(row);
      });

      mountSection.appendChild(table);

      // Actions for mount points
      const mountActions = document.createElement("div");
      mountActions.style.marginTop = "10px";

      const createMountButton = document.createElement("button");
      createMountButton.innerText = "Create Missing Mount Points";
      createMountButton.style.cssText =
        "background: #ff9800; color: white; border: none; padding: 3px 8px; margin: 2px; border-radius: 3px; cursor: pointer; font-size: 11px;";
      createMountButton.onclick = createMissingMountPoints;
      mountActions.appendChild(createMountButton);

      mountSection.appendChild(mountActions);
    }
  }

  // 4. Check Bridge Integration Status
  function checkBridgeStatus() {
    const bridgeSection = document.getElementById("bridge-debug");
    if (bridgeSection) {
      bridgeSection.innerHTML =
        '<h4 style="margin: 10px 0 5px 0; color: #00ccff;">Bridge Status</h4>';

      // Check window global objects
      const hasNscaleNamespace = !!window.nscale;
      const hasNscaleBridge = !!(window.nscale && window.nscale.bridge);
      const hasNscaleEvents = !!(window.nscale && window.nscale.events);
      const hasNscaleAuth = !!window.nscaleAuth;
      const hasNscaleChat = !!window.nscaleChat;
      const hasNscaleUI = !!window.nscaleUI;
      const hasNscaleSettings = !!window.nscaleSettings;

      const bridgeInfo = document.createElement("div");
      bridgeInfo.style.fontSize = "11px";
      bridgeInfo.innerHTML = `
                <div style="margin-bottom: 5px;"><strong>Global Namespaces:</strong></div>
                <div>window.nscale: <span style="color: ${hasNscaleNamespace ? "#4CAF50" : "#f44336"};">${hasNscaleNamespace ? "Available" : "Missing"}</span></div>
                <div>window.nscale.bridge: <span style="color: ${hasNscaleBridge ? "#4CAF50" : "#f44336"};">${hasNscaleBridge ? "Available" : "Missing"}</span></div>
                <div>window.nscale.events: <span style="color: ${hasNscaleEvents ? "#4CAF50" : "#f44336"};">${hasNscaleEvents ? "Available" : "Missing"}</span></div>
                
                <div style="margin: 8px 0 5px 0;"><strong>Bridge API Objects:</strong></div>
                <div>window.nscaleAuth: <span style="color: ${hasNscaleAuth ? "#4CAF50" : "#f44336"};">${hasNscaleAuth ? "Available" : "Missing"}</span></div>
                <div>window.nscaleChat: <span style="color: ${hasNscaleChat ? "#4CAF50" : "#f44336"};">${hasNscaleChat ? "Available" : "Missing"}</span></div>
                <div>window.nscaleUI: <span style="color: ${hasNscaleUI ? "#4CAF50" : "#f44336"};">${hasNscaleUI ? "Available" : "Missing"}</span></div>
                <div>window.nscaleSettings: <span style="color: ${hasNscaleSettings ? "#4CAF50" : "#f44336"};">${hasNscaleSettings ? "Available" : "Missing"}</span></div>
            `;

      bridgeSection.appendChild(bridgeInfo);

      // Bridge actions
      const bridgeActions = document.createElement("div");
      bridgeActions.style.marginTop = "10px";

      const triggerBridgeButton = document.createElement("button");
      triggerBridgeButton.innerText = "Trigger Bridge-Ready Event";
      triggerBridgeButton.style.cssText =
        "background: #ff9800; color: white; border: none; padding: 3px 8px; margin: 2px; border-radius: 3px; cursor: pointer; font-size: 11px;";
      triggerBridgeButton.onclick = triggerBridgeReady;
      bridgeActions.appendChild(triggerBridgeButton);

      const initBridgeButton = document.createElement("button");
      initBridgeButton.innerText = "Initialize Bridge API";
      initBridgeButton.style.cssText =
        "background: #ff5722; color: white; border: none; padding: 3px 8px; margin: 2px; border-radius: 3px; cursor: pointer; font-size: 11px;";
      initBridgeButton.onclick = initializeBridge;
      bridgeActions.appendChild(initBridgeButton);

      bridgeSection.appendChild(bridgeActions);
    }
  }

  // Create missing mount points
  function createMissingMountPoints() {
    const mountPoints = [
      { id: "vue-app", parent: "app" },
      { id: "vue-dms-app", parent: "app" },
      { id: "doc-converter-mount", parent: "app" },
      { id: "admin-mount", parent: "app" },
    ];

    let created = 0;

    mountPoints.forEach((point) => {
      if (!document.getElementById(point.id)) {
        const parent = document.getElementById(point.parent) || document.body;
        const mountPoint = document.createElement("div");
        mountPoint.id = point.id;
        mountPoint.style.cssText =
          "min-height: 50px; border: 1px dashed #ff9800; margin: 10px 0; position: relative;";
        mountPoint.innerHTML = `<div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: #ff9800;">Mount Point: ${point.id}</div>`;
        parent.appendChild(mountPoint);
        created++;
        logDebug(`Mount point created: ${point.id}`);
      }
    });

    if (created > 0) {
      logDebug(`Created ${created} missing mount points`);
      checkMountPoints();
    } else {
      logDebug("No missing mount points to create");
    }
  }

  // Toggle a feature flag
  function toggleFeature(featureName) {
    try {
      const toggles = JSON.parse(
        localStorage.getItem("featureToggles") || "{}",
      );
      toggles[featureName] = !toggles[featureName];
      localStorage.setItem("featureToggles", JSON.stringify(toggles));

      // Also update window.nscale.featureToggles if it exists
      if (window.nscale && window.nscale.featureToggles) {
        window.nscale.featureToggles[featureName] = toggles[featureName];
      }

      logDebug(`Feature toggle ${featureName} set to: ${toggles[featureName]}`);
      checkFeatureToggles();

      // If toggling a Vue SFC feature, also update the localStorage flags
      if (featureName === "useSfcDocConverter") {
        localStorage.setItem("useVueDocConverter", toggles[featureName]);
        logDebug(
          `localStorage.useVueDocConverter set to: ${toggles[featureName]}`,
        );
      }
      if (
        ["useSfcAdmin", "useSfcChat", "useSfcSettings"].includes(featureName)
      ) {
        localStorage.setItem("useVueComponents", "true");
        logDebug(`localStorage.useVueComponents set to: true`);
      }
    } catch (e) {
      logDebug(`Error toggling feature ${featureName}: ${e.message}`);
    }
  }

  // Enable all SFC features
  function enableAllSfcFeatures() {
    try {
      const toggles = JSON.parse(
        localStorage.getItem("featureToggles") || "{}",
      );

      // Enable SFC features
      toggles.useSfcAdmin = true;
      toggles.useSfcDocConverter = true;
      toggles.useSfcChat = true;
      toggles.useSfcSettings = true;

      // Enable dependencies
      toggles.usePiniaAuth = true;
      toggles.usePiniaUI = true;
      toggles.usePiniaSessions = true;
      toggles.usePiniaSettings = true;
      toggles.useLegacyBridge = true;

      localStorage.setItem("featureToggles", JSON.stringify(toggles));

      // Also set direct localStorage flags
      localStorage.setItem("useVueComponents", "true");
      localStorage.setItem("useVueDocConverter", "true");

      // Update window.nscale.featureToggles if it exists
      if (window.nscale && window.nscale.featureToggles) {
        Object.assign(window.nscale.featureToggles, toggles);
      }

      logDebug("All SFC features and dependencies enabled");
      checkFeatureToggles();
    } catch (e) {
      logDebug(`Error enabling all SFC features: ${e.message}`);
    }
  }

  // Trigger bridge-ready event
  function triggerBridgeReady() {
    try {
      // Trigger both types of events used in the application
      if (window.nscale && window.nscale.events && window.nscale.events.emit) {
        window.nscale.events.emit("bridge-ready", { version: "1.0" });
      }

      const bridgeReadyEvent = new CustomEvent("nscale-bridge-ready", {
        detail: { version: "1.0" },
      });
      window.dispatchEvent(bridgeReadyEvent);
      document.dispatchEvent(bridgeReadyEvent);

      logDebug("Bridge-ready events triggered");
    } catch (e) {
      logDebug(`Error triggering bridge-ready event: ${e.message}`);
    }
  }

  // Initialize bridge stubs
  function initializeBridge() {
    try {
      // Create basic bridge API objects if they don't exist
      window.nscale = window.nscale || {};
      window.nscale.bridge = window.nscale.bridge || {};
      window.nscale.events = window.nscale.events || {};
      window.nscale.featureToggles =
        window.nscale.featureToggles ||
        JSON.parse(localStorage.getItem("featureToggles") || "{}");

      // Event handling
      if (!window.nscale.events.on) {
        window.nscale.events.on = function (event, callback) {
          window.addEventListener(`nscale:${event}`, function (e) {
            callback(e.detail);
          });
          logDebug(`Registered event handler for: ${event}`);
        };
      }

      if (!window.nscale.events.emit) {
        window.nscale.events.emit = function (event, data) {
          const customEvent = new CustomEvent(`nscale:${event}`, {
            detail: data,
          });
          window.dispatchEvent(customEvent);
          logDebug(`Emitted event: ${event}`);
        };
      }

      // Create stub API objects
      window.nscaleAuth = window.nscaleAuth || {
        isAuthenticated: () => true,
        getToken: () => "debug-token",
        getUser: () => ({
          id: "debug-user",
          email: "debug@example.com",
          role: "admin",
        }),
      };

      window.nscaleChat = window.nscaleChat || {
        getSessions: () => [],
        getCurrentSession: () => null,
        createSession: () => Promise.resolve("debug-session"),
      };

      window.nscaleUI = window.nscaleUI || {
        isDarkMode: () => false,
        toggleDarkMode: () => logDebug("Toggle dark mode called"),
        showToast: (msg) => logDebug(`Toast: ${msg}`),
      };

      window.nscaleSettings = window.nscaleSettings || {
        getTheme: () => "light",
        getSetting: (key) => null,
      };

      logDebug("Bridge API initialized with stub implementations");
      checkBridgeStatus();
    } catch (e) {
      logDebug(`Error initializing bridge: ${e.message}`);
    }
  }

  // 5. Run diagnostics and monitoring
  function runDiagnostics() {
    logDebug("Running diagnostics...");

    // Create debug UI
    const debugContainer = createDebugUI();

    // Initial checks
    checkFeatureToggles();
    checkMountPoints();
    checkBridgeStatus();

    // Set up DOM observer to monitor mount points for Vue activity
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          mutation.type === "childList" &&
          [
            "vue-app",
            "vue-dms-app",
            "doc-converter-mount",
            "admin-mount",
          ].includes(mutation.target.id)
        ) {
          logDebug(`Mount point changes detected in: ${mutation.target.id}`);
          checkMountPoints();
        }
      });
    });

    const observeConfig = { childList: true, subtree: true };
    ["vue-app", "vue-dms-app", "doc-converter-mount", "admin-mount"].forEach(
      (id) => {
        const el = document.getElementById(id);
        if (el) {
          observer.observe(el, observeConfig);
        }
      },
    );

    // Monitor localStorage changes
    const originalSetItem = localStorage.setItem;
    localStorage.setItem = function (key, value) {
      if (
        ["featureToggles", "useVueComponents", "useVueDocConverter"].includes(
          key,
        )
      ) {
        logDebug(`localStorage.${key} changed to: ${value}`);
        setTimeout(checkFeatureToggles, 0);
      }
      originalSetItem.call(this, key, value);
    };

    // Log initial diagnostics summary
    const toggles = JSON.parse(localStorage.getItem("featureToggles") || "{}");
    const vueComponentsFlag = localStorage.getItem("useVueComponents");
    const vueDocConverterFlag = localStorage.getItem("useVueDocConverter");

    logDebug("Diagnostics summary:");
    logDebug(
      `- SFC Features: ${toggles.useSfcAdmin ? "✓" : "✕"} Admin, ${toggles.useSfcDocConverter ? "✓" : "✕"} DocConverter`,
    );
    logDebug(
      `- localStorage Flags: ${vueComponentsFlag === "true" ? "✓" : "✕"} Components, ${vueDocConverterFlag === "true" ? "✓" : "✕"} DocConverter`,
    );
    logDebug(
      `- Bridge API: ${window.nscaleAuth ? "✓" : "✕"} Auth, ${window.nscaleUI ? "✓" : "✕"} UI`,
    );

    // Return diagnostics controller
    return {
      refresh: function () {
        checkFeatureToggles();
        checkMountPoints();
        checkBridgeStatus();
        logDebug("Diagnostics refreshed");
      },
      disconnect: function () {
        observer.disconnect();
        localStorage.setItem = originalSetItem;
        logDebug("Diagnostics monitoring stopped");
      },
    };
  }

  // Create diagnostics keyboard shortcut
  const keySequence = [];
  const targetSequence = ["KeyD", "KeyE", "KeyB", "KeyU", "KeyG"]; // D-E-B-U-G

  document.addEventListener("keydown", (e) => {
    if (e.altKey && e.code) {
      keySequence.push(e.code);

      // Keep only the last N keys (where N is the length of target sequence)
      if (keySequence.length > targetSequence.length) {
        keySequence.shift();
      }

      // Check if sequence matches
      if (keySequence.join("") === targetSequence.join("")) {
        // Clear sequence
        keySequence.length = 0;

        // Toggle debug UI
        const container = document.getElementById("vue-debug-container");
        if (container) {
          toggleDebugVisibility();
        } else {
          runDiagnostics();
        }
      }
    }
  });

  // Auto-start diagnostics in development environment
  if (
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
  ) {
    window.addEventListener("DOMContentLoaded", () => {
      // Wait a bit to let the app initialize first
      setTimeout(() => {
        window.vueDebug = runDiagnostics();
        logDebug("Debug tools accessible via window.vueDebug");
      }, 1000);
    });
  }

  // Expose debug functions globally
  window.vueDebugHelpers = {
    enableAllSfcFeatures,
    toggleFeature,
    createMissingMountPoints,
    triggerBridgeReady,
    initializeBridge,
    runDiagnostics,
    toggleDebugVisibility,
  };

  console.log(
    "Vue 3 SFC Diagnose-Tool wurde initialisiert. Alt+D,E,B,U,G zum Aktivieren.",
  );
})();
