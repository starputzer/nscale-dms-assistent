/**
 * DiagnosticTools - Bridge diagnostic tools and developer panel
 *
 * This component provides diagnostic tools, developer panels, and debugging
 * utilities for the Bridge system.
 */

import { BridgeLogger, BridgeErrorState, BridgeStatusInfo } from "../types";
import { BridgeStatusManager } from "../statusManager";
import { ExtendedPerformanceMonitor as PerformanceMonitor } from "./ExtendedPerformanceMonitor";
import { ExtendedMemoryManager as MemoryManager } from "./ExtendedMemoryManager";
import { EnhancedSelfHealing } from "./enhancedSelfHealing";
import { OptimizedEventBus } from "./enhancedEventBus";
import { SelectiveStateManager } from "./selectiveStateManager";
import { EnhancedSerializer } from "./enhancedSerializer";
import { ExtendedOptimizedChatBridge as OptimizedChatBridge } from "./ExtendedOptimizedChatBridge";

/**
 * Configuration for DiagnosticTools
 */
export interface DiagnosticToolsConfig {
  // Whether to enable developer tools
  enabled: boolean;

  // Whether to show developer tools UI
  showUI: boolean;

  // Whether to enable diagnostic commands
  enableCommands: boolean;

  // Whether to enable console tools
  enableConsoleTools: boolean;

  // Whether to enable persistent logging
  enablePersistentLogs: boolean;

  // Maximum number of logs to keep
  maxLogEntries: number;

  // Whether to log to console
  logToConsole: boolean;

  // Whether to capture console.error
  captureConsoleErrors: boolean;

  // Whether to capture unhandled errors
  captureUnhandledErrors: boolean;

  // Auto-generate reports
  autoGenerateReports: boolean;

  // Report generation interval (ms)
  reportInterval: number;

  // Telemetry options
  telemetry: {
    // Whether to enable telemetry
    enabled: boolean;

    // Whether to show telemetry opt-in dialog
    showOptInDialog: boolean;

    // What data to collect
    collectData: {
      // Collect error reports
      errors: boolean;

      // Collect performance metrics
      performance: boolean;

      // Collect feature usage
      featureUsage: boolean;

      // Collect system info
      systemInfo: boolean;
    };
  };
}

/**
 * Default configuration for DiagnosticTools
 */
const DEFAULT_CONFIG: DiagnosticToolsConfig = {
  enabled: true,
  showUI: false,
  enableCommands: true,
  enableConsoleTools: true,
  enablePersistentLogs: true,
  maxLogEntries: 1000,
  logToConsole: false,
  captureConsoleErrors: true,
  captureUnhandledErrors: true,
  autoGenerateReports: false,
  reportInterval: 3600000, // 1 hour

  telemetry: {
    enabled: false,
    showOptInDialog: false,
    collectData: {
      errors: true,
      performance: true,
      featureUsage: false,
      systemInfo: false,
    },
  },
};

/**
 * Diagnostic log entry
 */
interface DiagnosticLogEntry {
  timestamp: number;
  level: "debug" | "info" | "warn" | "error";
  component: string;
  message: string;
  data?: any;
  stackTrace?: string;
}

/**
 * Diagnostic report
 */
interface DiagnosticReport {
  timestamp: number;
  reportId: string;
  bridgeVersion: string;
  bridgeStatus: BridgeStatusInfo;
  systemInfo: {
    userAgent: string;
    platform: string;
    memory?: {
      jsHeapSizeLimit: number;
      totalJSHeapSize: number;
      usedJSHeapSize: number;
    };
    viewportSize: {
      width: number;
      height: number;
    };
    darkMode: boolean;
  };
  componentStatus: {
    [component: string]: {
      status: "healthy" | "degraded" | "error";
      details?: string;
    };
  };
  metrics: {
    [metric: string]: any;
  };
  errors: DiagnosticLogEntry[];
  recommendations: string[];
}

/**
 * Implementation of diagnostic tools
 */
export class DiagnosticTools {
  private logger: BridgeLogger;
  private statusManager: BridgeStatusManager;
  private config: DiagnosticToolsConfig;

  // Component references
  private performanceMonitor?: PerformanceMonitor;
  private memoryManager?: MemoryManager;
  private selfHealing?: EnhancedSelfHealing;
  private eventBus?: OptimizedEventBus;
  private stateManager?: SelectiveStateManager;
  private serializer?: EnhancedSerializer;
  private chatBridge?: OptimizedChatBridge;

  // Diagnostic data
  private logs: DiagnosticLogEntry[] = [];
  private reports: DiagnosticReport[] = [];

  // UI elements
  private uiContainer: HTMLElement | null = null;
  private uiVisible: boolean = false;

  // Console override functions
  private originalConsoleError: typeof console.error | null = null;
  private originalConsoleWarn: typeof console.warn | null = null;

  // Error handlers
  private originalOnError: OnErrorEventHandler | null = null;
  private originalOnUnhandledRejection:
    | ((this: Window, ev: PromiseRejectionEvent) => any)
    | null = null;

  // Report generation interval
  private reportIntervalId: number | null = null;

  constructor(
    logger: BridgeLogger,
    statusManager: BridgeStatusManager,
    config: Partial<DiagnosticToolsConfig> = {},
  ) {
    this.logger = logger;
    this.statusManager = statusManager;
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Initialize
    if (this.config.enabled) {
      this.initialize();
    }

    this.logger.info("DiagnosticTools initialized");
  }

  /**
   * Initializes diagnostic tools
   */
  private initialize(): void {
    // Set up console capture
    if (this.config.captureConsoleErrors) {
      this.setupConsoleCapture();
    }

    // Set up error capture
    if (this.config.captureUnhandledErrors) {
      this.setupErrorCapture();
    }

    // Set up console tools
    if (this.config.enableConsoleTools) {
      this.exposeConsoleTools();
    }

    // Set up UI if configured
    if (this.config.showUI) {
      this.createUI();
    }

    // Start auto-report generation if configured
    if (this.config.autoGenerateReports) {
      this.startAutoReports();
    }

    // Show telemetry opt-in dialog if configured
    if (
      this.config.telemetry.enabled &&
      this.config.telemetry.showOptInDialog
    ) {
      this.showTelemetryOptInDialog();
    }
  }

  /**
   * Sets up console error capture
   */
  private setupConsoleCapture(): void {
    // Save original console methods
    this.originalConsoleError = console.error;
    this.originalConsoleWarn = console.warn;

    // Override console.error
    console.error = (...args: any[]) => {
      // Call original
      this.originalConsoleError!.apply(console, args);

      // Capture the error
      const message = args.map((arg: any) => this.stringifyArg(arg)).join(" ");
      this.logError("console", message);
    };

    // Override console.warn
    console.warn = (...args: any[]) => {
      // Call original
      this.originalConsoleWarn!.apply(console, args);

      // Capture the warning
      const message = args.map((arg: any) => this.stringifyArg(arg)).join(" ");
      this.logWarning("console", message);
    };
  }

  /**
   * Stringifies an argument for logging
   */
  private stringifyArg(arg: any): string {
    if (arg === null) return "null";
    if (arg === undefined) return "undefined";

    if (arg instanceof Error) {
      return arg.stack || `${arg.name}: ${arg.message}`;
    }

    if (typeof arg === "object") {
      try {
        return JSON.stringify(arg);
      } catch (error) {
        return Object.prototype.toString.call(arg);
      }
    }

    return String(arg);
  }

  /**
   * Sets up unhandled error capture
   */
  private setupErrorCapture(): void {
    // Save original handlers
    this.originalOnError = window.onerror;
    this.originalOnUnhandledRejection = window.onunhandledrejection;

    // Override window.onerror
    window.onerror = (message, source, lineno, colno, error) => {
      // Capture the error
      this.logError("window", String(message), error);

      // Call original handler
      if (this.originalOnError) {
        return this.originalOnError(message, source, lineno, colno, error);
      }

      return false;
    };

    // Override window.onunhandledrejection
    window.onunhandledrejection = (event) => {
      // Capture the rejection
      const reason = event.reason;
      const message =
        reason instanceof Error ? reason.message : this.stringifyArg(reason);

      this.logError("promise", `Unhandled rejection: ${message}`, reason);

      // Call original handler
      if (this.originalOnUnhandledRejection) {
        return this.originalOnUnhandledRejection.call(window, event);
      }
    };
  }

  /**
   * Exposes diagnostic tools to the console
   */
  private exposeConsoleTools(): void {
    // Create a namespace for diagnostic tools
    (window as any).bridgeDiagnostics = {
      // General tools
      getStatus: this.getBridgeStatus.bind(this),
      getLogs: this.getLogs.bind(this),
      clearLogs: this.clearLogs.bind(this),
      generateReport: this.generateReport.bind(this),
      showUI: this.showDiagnosticUI.bind(this),
      hideUI: this.hideDiagnosticUI.bind(this),

      // Commands
      runHealthCheck: this.runHealthCheck.bind(this),
      runMemoryCheck: this.runMemoryCheck.bind(this),

      // Reports
      saveReport: this.saveReport.bind(this),
      getReports: this.getReports.bind(this),
      clearReports: this.clearReports.bind(this),
    };

    this.logger.info(
      "Console diagnostic tools exposed as window.bridgeDiagnostics",
    );
  }

  /**
   * Creates the diagnostic UI
   */
  private createUI(): void {
    try {
      // Skip if already created
      if (this.uiContainer) return;

      // Create container
      this.uiContainer = document.createElement("div");
      this.uiContainer.id = "bridge-diagnostics";
      this.uiContainer.style.display = "none";
      this.uiContainer.style.position = "fixed";
      this.uiContainer.style.top = "0";
      this.uiContainer.style.right = "0";
      this.uiContainer.style.bottom = "0";
      this.uiContainer.style.width = "400px";
      this.uiContainer.style.backgroundColor = "rgba(0, 0, 0, 0.9)";
      this.uiContainer.style.color = "white";
      this.uiContainer.style.fontFamily = "monospace";
      this.uiContainer.style.fontSize = "12px";
      this.uiContainer.style.padding = "10px";
      this.uiContainer.style.boxShadow = "-5px 0 15px rgba(0, 0, 0, 0.5)";
      this.uiContainer.style.zIndex = "9999";
      this.uiContainer.style.overflow = "auto";

      // Create header
      const header = document.createElement("div");
      header.style.display = "flex";
      header.style.justifyContent = "space-between";
      header.style.alignItems = "center";
      header.style.borderBottom = "1px solid #555";
      header.style.marginBottom = "10px";
      header.style.paddingBottom = "10px";

      const title = document.createElement("div");
      title.textContent = "Bridge Diagnostics";
      title.style.fontWeight = "bold";
      title.style.fontSize = "16px";

      const closeButton = document.createElement("button");
      closeButton.textContent = "X";
      closeButton.style.background = "none";
      closeButton.style.border = "none";
      closeButton.style.color = "white";
      closeButton.style.fontSize = "16px";
      closeButton.style.cursor = "pointer";
      closeButton.onclick = () => this.hideDiagnosticUI();

      header.appendChild(title);
      header.appendChild(closeButton);
      this.uiContainer.appendChild(header);

      // Create tabs
      const tabs = document.createElement("div");
      tabs.style.display = "flex";
      tabs.style.marginBottom = "10px";

      const createTab = (
        id: string,
        label: string,
        isActive: boolean = false,
      ) => {
        const tab = document.createElement("div");
        tab.textContent = label;
        tab.dataset.tabId = id;
        tab.style.padding = "5px 10px";
        tab.style.cursor = "pointer";
        tab.style.borderBottom = isActive
          ? "2px solid #4CAF50"
          : "2px solid transparent";
        tab.style.marginRight = "10px";
        tab.onclick = () => this.switchTab(id);
        return tab;
      };

      tabs.appendChild(createTab("status", "Status", true));
      tabs.appendChild(createTab("performance", "Performance"));
      tabs.appendChild(createTab("memory", "Memory"));
      tabs.appendChild(createTab("logs", "Logs"));
      tabs.appendChild(createTab("reports", "Reports"));

      this.uiContainer.appendChild(tabs);

      // Create content container
      const content = document.createElement("div");
      content.id = "bridge-diagnostics-content";
      this.uiContainer.appendChild(content);

      // Add to document
      document.body.appendChild(this.uiContainer);

      // Initialize with the status tab
      this.switchTab("status");

      this.logger.debug("Diagnostic UI created");
    } catch (error) {
      this.logger.error("Error creating diagnostic UI", error);
    }
  }

  /**
   * Switches between tabs in the UI
   */
  private switchTab(tabId: string): void {
    if (!this.uiContainer) return;

    // Update tab styling
    const tabs = this.uiContainer.querySelectorAll("[data-tab-id]");
    tabs.forEach((tab: any) => {
      const isActive = (tab as HTMLElement).dataset.tabId === tabId;
      (tab as HTMLElement).style.borderBottom = isActive
        ? "2px solid #4CAF50"
        : "2px solid transparent";
    });

    // Update content
    const content = document.getElementById("bridge-diagnostics-content");
    if (!content) return;

    content.innerHTML = "";

    // Render tab content
    switch (tabId) {
      case "status":
        this.renderStatusTab(content);
        break;
      case "performance":
        this.renderPerformanceTab(content);
        break;
      case "memory":
        this.renderMemoryTab(content);
        break;
      case "logs":
        this.renderLogsTab(content);
        break;
      case "reports":
        this.renderReportsTab(content);
        break;
    }
  }

  /**
   * Renders the status tab
   */
  private renderStatusTab(container: HTMLElement): void {
    // Bridge status
    const status = this.statusManager.getStatus();

    // Create status section
    const statusSection = document.createElement("div");
    statusSection.innerHTML = `
      <h3>Bridge Status</h3>
      <div>State: <span style="color: ${this.getStatusColor(status.state)}">${BridgeErrorState[status.state]}</span></div>
      <div>Message: ${status.message}</div>
      <div>Affected Components: ${status.affectedComponents.join(", ") || "None"}</div>
      <div>Recovery Attempts: ${status.recoveryAttempts}</div>
      <div>Last Updated: ${new Date(status.timestamp).toLocaleTimeString()}</div>
    `;

    container.appendChild(statusSection);

    // Component status
    const componentStatus = document.createElement("div");
    componentStatus.innerHTML = "<h3>Component Status</h3>";

    // Get component status
    const components = this.getComponentStatus();

    // Create component list
    const componentList = document.createElement("ul");
    componentList.style.listStyleType = "none";
    componentList.style.padding = "0";

    Object.entries(components).forEach(([name, status]: any) => {
      const item = document.createElement("li");
      item.style.marginBottom = "5px";
      item.style.padding = "5px";
      item.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
      item.style.borderRadius = "3px";

      const statusColor =
        status.status === "healthy"
          ? "#4CAF50"
          : status.status === "degraded"
            ? "#FFA500"
            : "#F44336";

      item.innerHTML = `
        <div style="display: flex; justify-content: space-between;">
          <span>${name}</span>
          <span style="color: ${statusColor}">${status.status.toUpperCase()}</span>
        </div>
        ${status.details ? `<div style="font-size: 11px; color: #AAA; margin-top: 3px;">${status.details}</div>` : ""}
      `;

      componentList.appendChild(item);
    });

    componentStatus.appendChild(componentList);
    container.appendChild(componentStatus);

    // Actions
    const actions = document.createElement("div");
    actions.style.marginTop = "20px";
    actions.innerHTML = "<h3>Actions</h3>";

    const createButton = (
      label: string,
      onClick: () => void,
      color: string = "#4CAF50",
    ) => {
      const button = document.createElement("button");
      button.textContent = label;
      button.style.backgroundColor = color;
      button.style.color = "white";
      button.style.border = "none";
      button.style.padding = "5px 10px";
      button.style.marginRight = "10px";
      button.style.marginBottom = "10px";
      button.style.borderRadius = "3px";
      button.style.cursor = "pointer";
      button.onclick = onClick;
      return button;
    };

    actions.appendChild(
      createButton("Run Health Check", () => this.runHealthCheck()),
    );
    actions.appendChild(
      createButton("Generate Report", () => this.generateAndDisplayReport()),
    );
    actions.appendChild(
      createButton("Reset Bridge", () => this.resetBridge(), "#FFA500"),
    );

    container.appendChild(actions);
  }

  /**
   * Renders the performance tab
   */
  private renderPerformanceTab(container: HTMLElement): void {
    if (!this.performanceMonitor) {
      container.innerHTML = "<div>Performance Monitor not available</div>";
      return;
    }

    // Get performance overview
    const overview = this.performanceMonitor.getPerformanceOverview();

    // Create performance section
    const performanceSection = document.createElement("div");
    performanceSection.innerHTML = `
      <h3>Performance Overview</h3>
      <div>Metrics Count: ${overview.metrics.count}</div>
      <div>Issues: ${overview.issues?.current || 0} (${overview.issues?.critical || 0} critical, ${overview.issues?.high || 0} high)</div>
      <div>Memory: ${overview.memory.usedFormatted} / ${overview.memory.totalFormatted}</div>
      <div>Frame Rate: ${overview.frameRate?.average?.toFixed(1) || "N/A"} fps</div>
    `;

    container.appendChild(performanceSection);

    // Current issues
    const issues = this.performanceMonitor.getCurrentIssues();

    if (issues.length > 0) {
      const issuesSection = document.createElement("div");
      issuesSection.innerHTML = "<h3>Current Issues</h3>";

      const issuesList = document.createElement("ul");
      issuesList.style.listStyleType = "none";
      issuesList.style.padding = "0";

      issues.forEach((issue: any) => {
        const item = document.createElement("li");
        item.style.marginBottom = "5px";
        item.style.padding = "5px";
        item.style.backgroundColor =
          issue.severity === "critical"
            ? "rgba(244, 67, 54, 0.2)"
            : issue.severity === "high"
              ? "rgba(255, 165, 0, 0.2)"
              : "rgba(255, 255, 255, 0.1)";
        item.style.borderRadius = "3px";

        item.innerHTML = `
          <div><strong>${issue.metric}</strong> (${issue.component})</div>
          <div style="font-size: 11px; color: #AAA;">${issue.details}</div>
        `;

        issuesList.appendChild(item);
      });

      issuesSection.appendChild(issuesList);
      container.appendChild(issuesSection);
    }

    // Metrics charts (placeholder)
    const chartsSection = document.createElement("div");
    chartsSection.innerHTML = "<h3>Performance Metrics</h3>";
    chartsSection.innerHTML +=
      "<div>Charts would be rendered here in a real implementation</div>";

    container.appendChild(chartsSection);
  }

  /**
   * Renders the memory tab
   */
  private renderMemoryTab(container: HTMLElement): void {
    if (!this.memoryManager) {
      container.innerHTML = "<div>Memory Manager not available</div>";
      return;
    }

    // Get memory stats
    const memoryStats = this.memoryManager.getMemoryStats();

    // Create memory section
    const memorySection = document.createElement("div");
    memorySection.innerHTML = `
      <h3>Memory Usage</h3>
      <div>Current: ${memoryStats.current?.formatted || "N/A"}</div>
      <div>Peak: ${memoryStats.peak?.formatted || "N/A"}</div>
      <div>Growth: ${memoryStats.growth?.formatted || "N/A"} (${memoryStats.growth?.percentage || "N/A"})</div>
      <div>Growth Rate: ${memoryStats.growthRate?.formatted || "N/A"}</div>
    `;

    container.appendChild(memorySection);

    // Subscriptions
    const subscriptionsSection = document.createElement("div");
    subscriptionsSection.innerHTML = `
      <h3>Subscriptions</h3>
      <div>Total: ${memoryStats.subscriptions.total}</div>
      <div>Active: ${memoryStats.subscriptions.active}</div>
    `;

    container.appendChild(subscriptionsSection);

    // Detected leaks
    const leaks = this.memoryManager.getDetectedLeaks();

    if (leaks.length > 0) {
      const leaksSection = document.createElement("div");
      leaksSection.innerHTML = "<h3>Detected Memory Leaks</h3>";

      const leaksList = document.createElement("ul");
      leaksList.style.listStyleType = "none";
      leaksList.style.padding = "0";

      leaks.forEach((leak: any) => {
        const item = document.createElement("li");
        item.style.marginBottom = "5px";
        item.style.padding = "5px";
        item.style.backgroundColor = "rgba(244, 67, 54, 0.2)";
        item.style.borderRadius = "3px";

        item.innerHTML = `
          <div><strong>${leak.type}</strong> (${leak.component})</div>
          <div>Count: ${leak.count}</div>
          <div style="font-size: 11px; color: #AAA;">${new Date(leak.timestamp).toLocaleTimeString()}</div>
        `;

        leaksList.appendChild(item);
      });

      leaksSection.appendChild(leaksList);
      container.appendChild(leaksSection);
    }

    // Actions
    const actions = document.createElement("div");
    actions.style.marginTop = "20px";

    const runCheckButton = document.createElement("button");
    runCheckButton.textContent = "Run Memory Check";
    runCheckButton.style.backgroundColor = "#4CAF50";
    runCheckButton.style.color = "white";
    runCheckButton.style.border = "none";
    runCheckButton.style.padding = "5px 10px";
    runCheckButton.style.borderRadius = "3px";
    runCheckButton.style.cursor = "pointer";
    runCheckButton.onclick = () => this.runMemoryCheck();

    actions.appendChild(runCheckButton);
    container.appendChild(actions);
  }

  /**
   * Renders the logs tab
   */
  private renderLogsTab(container: HTMLElement): void {
    // Create logs section
    const logsSection = document.createElement("div");
    logsSection.innerHTML = "<h3>Diagnostic Logs</h3>";

    // Create filter controls
    const filterControls = document.createElement("div");
    filterControls.style.marginBottom = "10px";
    filterControls.style.display = "flex";
    filterControls.style.gap = "10px";

    // Level filter
    const levelFilter = document.createElement("select");
    levelFilter.innerHTML = `
      <option value="all">All Levels</option>
      <option value="error">Errors Only</option>
      <option value="warn">Warnings & Errors</option>
      <option value="info">Info & Above</option>
      <option value="debug">Debug & Above</option>
    `;

    // Component filter
    const componentFilter = document.createElement("select");
    componentFilter.innerHTML = '<option value="all">All Components</option>';

    // Get unique components
    const components = new Set<string>();
    this.logs.forEach((log: any) => components.add(log.component));

    // Add component options
    components.forEach((component: any) => {
      const option = document.createElement("option");
      option.value = component;
      option.textContent = component;
      componentFilter.appendChild(option);
    });

    // Clear button
    const clearButton = document.createElement("button");
    clearButton.textContent = "Clear Logs";
    clearButton.style.marginLeft = "auto";
    clearButton.style.backgroundColor = "#F44336";
    clearButton.style.color = "white";
    clearButton.style.border = "none";
    clearButton.style.padding = "5px 10px";
    clearButton.style.borderRadius = "3px";
    clearButton.style.cursor = "pointer";
    clearButton.onclick = () => {
      this.clearLogs();
      this.renderLogsTab(container);
    };

    filterControls.appendChild(levelFilter);
    filterControls.appendChild(componentFilter);
    filterControls.appendChild(clearButton);

    logsSection.appendChild(filterControls);

    // Create logs list
    const logsList = document.createElement("div");
    logsList.style.backgroundColor = "rgba(0, 0, 0, 0.3)";
    logsList.style.padding = "10px";
    logsList.style.maxHeight = "400px";
    logsList.style.overflowY = "auto";
    logsList.style.fontFamily = "monospace";
    logsList.style.fontSize = "11px";

    // Filter and sort logs
    let filteredLogs = [...this.logs];

    // Apply level filter
    const levelValue = levelFilter.value;
    if (levelValue !== "all") {
      const levels = {
        error: ["error"],
        warn: ["error", "warn"],
        info: ["error", "warn", "info"],
        debug: ["error", "warn", "info", "debug"],
      };

      const selectedLevels = levels[levelValue as keyof typeof levels] || [];
      filteredLogs = filteredLogs.filter((log: any) =>
        selectedLevels.includes(log.level),
      );
    }

    // Apply component filter
    const componentValue = componentFilter.value;
    if (componentValue !== "all") {
      filteredLogs = filteredLogs.filter(
        (log) => log.component === componentValue,
      );
    }

    // Sort by timestamp (newest first)
    filteredLogs.sort((a, b) => b.timestamp - a.timestamp);

    // Build log entries
    filteredLogs.forEach((log: any) => {
      const logEntry = document.createElement("div");
      logEntry.style.marginBottom = "5px";
      logEntry.style.borderBottom = "1px solid rgba(255, 255, 255, 0.1)";
      logEntry.style.paddingBottom = "5px";

      const levelColor =
        log.level === "error"
          ? "#F44336"
          : log.level === "warn"
            ? "#FFA500"
            : log.level === "info"
              ? "#2196F3"
              : "#AAAAAA";

      logEntry.innerHTML = `
        <div>
          <span style="color: #AAA;">${new Date(log.timestamp).toLocaleTimeString()}</span>
          <span style="color: ${levelColor}; margin-left: 5px;">${log.level.toUpperCase()}</span>
          <span style="color: #4CAF50; margin-left: 5px;">${log.component}</span>
        </div>
        <div style="margin: 3px 0;">${log.message}</div>
        ${log.stackTrace ? `<div style="color: #F44336; margin-top: 3px; font-size: 10px;">${log.stackTrace}</div>` : ""}
      `;

      logsList.appendChild(logEntry);
    });

    // Show message if no logs
    if (filteredLogs.length === 0) {
      logsList.innerHTML =
        '<div style="color: #AAA; text-align: center;">No logs found</div>';
    }

    logsSection.appendChild(logsList);
    container.appendChild(logsSection);

    // Set up filter change handlers
    levelFilter.onchange = () => this.renderLogsTab(container);
    componentFilter.onchange = () => this.renderLogsTab(container);
  }

  /**
   * Renders the reports tab
   */
  private renderReportsTab(container: HTMLElement): void {
    // Create reports section
    const reportsSection = document.createElement("div");
    reportsSection.innerHTML = "<h3>Diagnostic Reports</h3>";

    // Actions
    const actions = document.createElement("div");
    actions.style.marginBottom = "15px";

    const generateButton = document.createElement("button");
    generateButton.textContent = "Generate Report";
    generateButton.style.backgroundColor = "#4CAF50";
    generateButton.style.color = "white";
    generateButton.style.border = "none";
    generateButton.style.padding = "5px 10px";
    generateButton.style.marginRight = "10px";
    generateButton.style.borderRadius = "3px";
    generateButton.style.cursor = "pointer";
    generateButton.onclick = () => {
      this.generateAndDisplayReport();
      this.renderReportsTab(container);
    };

    const clearButton = document.createElement("button");
    clearButton.textContent = "Clear Reports";
    clearButton.style.backgroundColor = "#F44336";
    clearButton.style.color = "white";
    clearButton.style.border = "none";
    clearButton.style.padding = "5px 10px";
    clearButton.style.borderRadius = "3px";
    clearButton.style.cursor = "pointer";
    clearButton.onclick = () => {
      this.clearReports();
      this.renderReportsTab(container);
    };

    actions.appendChild(generateButton);
    actions.appendChild(clearButton);
    reportsSection.appendChild(actions);

    // Reports list
    if (this.reports.length === 0) {
      const noReports = document.createElement("div");
      noReports.style.textAlign = "center";
      noReports.style.color = "#AAA";
      noReports.textContent = "No reports available";
      reportsSection.appendChild(noReports);
    } else {
      const reportsList = document.createElement("div");

      // Sort reports by timestamp (newest first)
      const sortedReports = [...this.reports].sort(
        (a, b) => b.timestamp - a.timestamp,
      );

      sortedReports.forEach((report, index: any) => {
        const reportItem = document.createElement("div");
        reportItem.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
        reportItem.style.padding = "10px";
        reportItem.style.marginBottom = "10px";
        reportItem.style.borderRadius = "3px";

        const statusColor =
          report.bridgeStatus.state === BridgeErrorState.HEALTHY
            ? "#4CAF50"
            : report.bridgeStatus.state ===
                BridgeErrorState.DEGRADED_PERFORMANCE
              ? "#FFA500"
              : "#F44336";

        const header = document.createElement("div");
        header.style.display = "flex";
        header.style.justifyContent = "space-between";
        header.style.marginBottom = "5px";

        header.innerHTML = `
          <div>
            <span>Report #${index + 1}</span>
            <span style="color: ${statusColor}; margin-left: 10px;">${BridgeErrorState[report.bridgeStatus.state]}</span>
          </div>
          <div style="color: #AAA;">${new Date(report.timestamp).toLocaleString()}</div>
        `;

        const viewButton = document.createElement("button");
        viewButton.textContent = "View Details";
        viewButton.style.backgroundColor = "#2196F3";
        viewButton.style.color = "white";
        viewButton.style.border = "none";
        viewButton.style.padding = "3px 8px";
        viewButton.style.borderRadius = "3px";
        viewButton.style.cursor = "pointer";
        viewButton.style.fontSize = "11px";
        viewButton.style.marginTop = "5px";
        viewButton.onclick = () => this.viewReport(report);

        const downloadButton = document.createElement("button");
        downloadButton.textContent = "Download";
        downloadButton.style.backgroundColor = "#4CAF50";
        downloadButton.style.color = "white";
        downloadButton.style.border = "none";
        downloadButton.style.padding = "3px 8px";
        downloadButton.style.borderRadius = "3px";
        downloadButton.style.cursor = "pointer";
        downloadButton.style.fontSize = "11px";
        downloadButton.style.marginTop = "5px";
        downloadButton.style.marginLeft = "5px";
        downloadButton.onclick = () => this.downloadReport(report);

        reportItem.appendChild(header);
        reportItem.appendChild(
          document.createTextNode(
            report.recommendations.length > 0
              ? `${report.recommendations.length} recommendations`
              : "No recommendations",
          ),
        );
        reportItem.appendChild(document.createElement("br"));
        reportItem.appendChild(
          document.createTextNode(
            `${Object.keys(report.errors).length} errors logged`,
          ),
        );
        reportItem.appendChild(document.createElement("br"));
        reportItem.appendChild(viewButton);
        reportItem.appendChild(downloadButton);

        reportsList.appendChild(reportItem);
      });

      reportsSection.appendChild(reportsList);
    }

    container.appendChild(reportsSection);
  }

  /**
   * Shows a report in the UI
   */
  private viewReport(report: DiagnosticReport): void {
    // This is a simple implementation - in a real application this would be more sophisticated
    alert(
      `Report Details for ${report.reportId}\n\n` +
        `Generated: ${new Date(report.timestamp).toLocaleString()}\n` +
        `Bridge Version: ${report.bridgeVersion}\n` +
        `Status: ${BridgeErrorState[report.bridgeStatus.state]}\n\n` +
        `Recommendations:\n${report.recommendations.join("\n")}`,
    );
  }

  /**
   * Downloads a report as JSON
   */
  private downloadReport(report: DiagnosticReport): void {
    try {
      const data = JSON.stringify(report, null, 2);
      const blob = new Blob([data], { type: "application/json" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `bridge-report-${report.reportId}.json`;
      a.click();

      URL.revokeObjectURL(url);
    } catch (error) {
      this.logger.error("Error downloading report", error);
    }
  }

  /**
   * Gets the color for a status state
   */
  private getStatusColor(state: BridgeErrorState): string {
    switch (state) {
      case BridgeErrorState.HEALTHY:
        return "#4CAF50";
      case BridgeErrorState.DEGRADED_PERFORMANCE:
        return "#FFA500";
      case BridgeErrorState.SYNC_ERROR:
      case BridgeErrorState.COMMUNICATION_ERROR:
        return "#F44336";
      case BridgeErrorState.CRITICAL_FAILURE:
        return "#7B1FA2";
      default:
        return "#FFFFFF";
    }
  }

  /**
   * Gets status information for all components
   */
  private getComponentStatus(): Record<
    string,
    { status: string; details?: string }
  > {
    const status: Record<string, { status: string; details?: string }> = {};

    // Add all components
    if (this.eventBus) {
      const diagnostics = this.eventBus.getDiagnostics();
      status["EventBus"] = {
        status: diagnostics.listenerCount > 0 ? "healthy" : "degraded",
        details: `${diagnostics.listenerCount} listeners, ${diagnostics.eventPatternCount} event types`,
      };
    }

    if (this.stateManager) {
      const isHealthy = this.stateManager.isHealthy();
      status["StateManager"] = {
        status: isHealthy ? "healthy" : "error",
        details: isHealthy
          ? "State synchronization active"
          : "State synchronization error",
      };
    }

    if (this.serializer) {
      const stats = this.serializer.getStats();
      status["Serializer"] = {
        status: "healthy",
        details: `Cache hits: ${stats.hits}, misses: ${stats.misses}, ratio: ${(stats.ratio * 100).toFixed(1)}%`,
      };
    }

    if (this.selfHealing) {
      const healthStats = this.selfHealing.getHealthCheckStats();
      const recoveryStats = this.selfHealing.getRecoveryStats();

      status["SelfHealing"] = {
        status:
          healthStats.healthPercentage > 80
            ? "healthy"
            : healthStats.healthPercentage > 50
              ? "degraded"
              : "error",
        details: `Health: ${healthStats.healthPercentage.toFixed(1)}%, Recovery attempts: ${recoveryStats.attempts}`,
      };
    }

    if (this.performanceMonitor) {
      const issues = this.performanceMonitor.getCurrentIssues();
      status["PerformanceMonitor"] = {
        status:
          issues.length === 0
            ? "healthy"
            : issues.some((i) => i.severity === "critical")
              ? "error"
              : "degraded",
        details:
          issues.length > 0
            ? `${issues.length} active issues`
            : "No performance issues",
      };
    }

    if (this.memoryManager) {
      const memoryStats = this.memoryManager.getMemoryStats();
      const leaks = this.memoryManager.getDetectedLeaks();

      status["MemoryManager"] = {
        status: leaks.length === 0 ? "healthy" : "error",
        details:
          leaks.length > 0
            ? `${leaks.length} potential memory leaks detected`
            : `Memory growth: ${memoryStats.growth.percentage}`,
      };
    }

    if (this.chatBridge) {
      const metrics = this.chatBridge.getStreamingMetrics();
      status["ChatBridge"] = {
        status: "healthy",
        details: metrics
          ? `Token rate: ${metrics.tokensPerSecond.toFixed(1)} tokens/s`
          : "Idle",
      };
    }

    return status;
  }

  /**
   * Shows the telemetry opt-in dialog
   */
  private showTelemetryOptInDialog(): void {
    // This is a placeholder - in a real implementation, this would show a dialog
    console.log(
      "[Bridge Diagnostics] Telemetry opt-in dialog would be shown here",
    );
  }

  /**
   * Starts automatic report generation
   */
  private startAutoReports(): void {
    if (this.reportIntervalId !== null) {
      clearInterval(this.reportIntervalId);
    }

    this.reportIntervalId = window.setInterval(() => {
      this.generateReport();
    }, this.config.reportInterval);

    this.logger.info(
      `Automatic report generation started (every ${this.config.reportInterval / 60000} minutes)`,
    );
  }

  /**
   * Stops automatic report generation
   */
  private stopAutoReports(): void {
    if (this.reportIntervalId !== null) {
      clearInterval(this.reportIntervalId);
      this.reportIntervalId = null;

      this.logger.info("Automatic report generation stopped");
    }
  }

  /**
   * Shows the diagnostic UI
   */
  showDiagnosticUI(): void {
    this.createUI();

    if (this.uiContainer) {
      this.uiContainer.style.display = "block";
      this.uiVisible = true;
    }
  }

  /**
   * Hides the diagnostic UI
   */
  hideDiagnosticUI(): void {
    if (this.uiContainer) {
      this.uiContainer.style.display = "none";
      this.uiVisible = false;
    }
  }

  /**
   * Toggles the diagnostic UI
   */
  toggleDiagnosticUI(): void {
    if (this.uiVisible) {
      this.hideDiagnosticUI();
    } else {
      this.showDiagnosticUI();
    }
  }

  /**
   * Gets the current bridge status
   */
  getBridgeStatus(): BridgeStatusInfo {
    return this.statusManager.getStatus();
  }

  /**
   * Runs a health check
   */
  async runHealthCheck(): Promise<boolean> {
    if (!this.selfHealing) {
      this.logger.warn("Self-healing system not available");
      return false;
    }

    try {
      const result = await this.selfHealing.runHealthCheck();

      this.logInfo(
        "diagnostic",
        `Health check completed with result: ${result ? "PASSED" : "FAILED"}`,
      );

      return result;
    } catch (error) {
      this.logError("diagnostic", "Error running health check", error as Error);
      return false;
    }
  }

  /**
   * Runs a memory check
   */
  runMemoryCheck(): any {
    if (!this.memoryManager) {
      this.logger.warn("Memory manager not available");
      return null;
    }

    try {
      const result = this.memoryManager.runFullCheck();

      this.logInfo(
        "diagnostic",
        `Memory check completed with ${result.detectedLeaks.length} potential issues`,
      );

      return result;
    } catch (error) {
      this.logError("diagnostic", "Error running memory check", error as Error);
      return null;
    }
  }

  /**
   * Resets the bridge
   */
  resetBridge(): void {
    try {
      // Reset each component
      if (this.eventBus) {
        this.eventBus.reset();
      }

      if (this.stateManager) {
        this.stateManager.reset();
      }

      if (this.selfHealing) {
        this.selfHealing.reset();
      }

      if (this.serializer) {
        this.serializer.clearCache();
      }

      if (this.memoryManager) {
        this.memoryManager.clear();
      }

      if (this.performanceMonitor) {
        this.performanceMonitor.clearData();
      }

      this.logInfo("diagnostic", "Bridge has been reset");
    } catch (error) {
      this.logError("diagnostic", "Error resetting bridge", error as Error);
    }
  }

  /**
   * Generates a diagnostic report
   */
  generateReport(): DiagnosticReport {
    try {
      // Generate report ID
      const reportId = `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`;

      // Get bridge status
      const bridgeStatus = this.statusManager.getStatus();

      // Collect system info
      const systemInfo = {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        memory: window.performance?.memory
          ? {
              jsHeapSizeLimit: window.performance.memory.jsHeapSizeLimit,
              totalJSHeapSize: window.performance.memory.totalJSHeapSize,
              usedJSHeapSize: window.performance.memory.usedJSHeapSize,
            }
          : undefined,
        viewportSize: {
          width: window.innerWidth,
          height: window.innerHeight,
        },
        darkMode:
          window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false,
      };

      // Get component status
      const componentStatus = this.getComponentStatus();

      // Collect metrics
      const metrics: Record<string, any> = {};

      if (this.performanceMonitor) {
        metrics.performance = this.performanceMonitor.getPerformanceOverview();
      }

      if (this.memoryManager) {
        metrics.memory = this.memoryManager.getMemoryStats();
      }

      if (this.chatBridge) {
        metrics.chat = this.chatBridge.getStreamingMetrics();
      }

      // Get errors (last 50)
      const errors = this.logs
        .filter((log: any) => log.level === "error")
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 50);

      // Generate recommendations
      const recommendations: string[] = [];

      // Add recommendations based on status
      if (bridgeStatus.state !== BridgeErrorState.HEALTHY) {
        recommendations.push(`Resolve bridge issues: ${bridgeStatus.message}`);
      }

      // Add recommendations based on component status
      Object.entries(componentStatus).forEach(([component, status]: any) => {
        if (status.status !== "healthy") {
          recommendations.push(`Check ${component}: ${status.details}`);
        }
      });

      // Add memory recommendations
      if (this.memoryManager) {
        const memoryStats = this.memoryManager.getMemoryStats();
        if (parseFloat(memoryStats.growth.percentage) > 20) {
          recommendations.push(
            `Investigate memory growth: ${memoryStats.growth.percentage}`,
          );
        }

        const leaks = this.memoryManager.getDetectedLeaks();
        if (leaks.length > 0) {
          recommendations.push(
            `Fix ${leaks.length} potential memory leaks in ${[...new Set(leaks.map((l: any) => l.component))].join(", ")}`,
          );
        }
      }

      // Add performance recommendations
      if (this.performanceMonitor) {
        const issues = this.performanceMonitor.getCurrentIssues();
        if (issues.length > 0) {
          const criticalIssues = issues.filter(
            (i) => i.severity === "critical",
          );
          if (criticalIssues.length > 0) {
            recommendations.push(
              `Fix ${criticalIssues.length} critical performance issues`,
            );
          }
        }
      }

      // Create the report
      const report: DiagnosticReport = {
        timestamp: Date.now(),
        reportId,
        bridgeVersion: "2.0.0", // Hardcoded for this example
        bridgeStatus,
        systemInfo,
        componentStatus,
        metrics,
        errors,
        recommendations,
      };

      // Store the report
      this.reports.push(report);

      // Limit the number of reports
      if (this.reports.length > 10) {
        this.reports.shift();
      }

      this.logger.info(`Diagnostic report generated: ${reportId}`);

      return report;
    } catch (error) {
      this.logError("diagnostic", "Error generating report", error as Error);

      // Return a minimal report
      return {
        timestamp: Date.now(),
        reportId: `error-${Date.now().toString(36)}`,
        bridgeVersion: "2.0.0",
        bridgeStatus: this.statusManager.getStatus(),
        systemInfo: {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          viewportSize: {
            width: window.innerWidth,
            height: window.innerHeight,
          },
          darkMode: false,
        },
        componentStatus: {},
        metrics: {},
        errors: [],
        recommendations: ["Fix error generating diagnostic report"],
      };
    }
  }

  /**
   * Generates a report and displays it in the UI
   */
  generateAndDisplayReport(): void {
    const report = this.generateReport();

    // Show the UI if it's not already visible
    this.showDiagnosticUI();

    // Switch to the reports tab
    if (this.uiContainer) {
      this.switchTab("reports");
    }

    // View the report
    this.viewReport(report);
  }

  /**
   * Gets all diagnostic logs
   */
  getLogs(): DiagnosticLogEntry[] {
    return [...this.logs];
  }

  /**
   * Clears all diagnostic logs
   */
  clearLogs(): void {
    this.logs = [];
    this.logger.debug("Diagnostic logs cleared");
  }

  /**
   * Gets all diagnostic reports
   */
  getReports(): DiagnosticReport[] {
    return [...this.reports];
  }

  /**
   * Clears all diagnostic reports
   */
  clearReports(): void {
    this.reports = [];
    this.logger.debug("Diagnostic reports cleared");
  }

  /**
   * Saves a report to localStorage
   */
  saveReport(
    report: DiagnosticReport = this.reports[this.reports.length - 1],
  ): boolean {
    if (!report) {
      this.logger.warn("No report to save");
      return false;
    }

    try {
      localStorage.setItem(
        `bridge-report-${report.reportId}`,
        JSON.stringify(report),
      );
      this.logger.info(`Report ${report.reportId} saved to localStorage`);
      return true;
    } catch (error) {
      this.logger.error("Error saving report to localStorage", error);
      return false;
    }
  }

  /**
   * Adds a debug log entry
   */
  logDebug(component: string, message: string, data?: any): void {
    this.addLogEntry("debug", component, message, data);
  }

  /**
   * Adds an info log entry
   */
  logInfo(component: string, message: string, data?: any): void {
    this.addLogEntry("info", component, message, data);
  }

  /**
   * Adds a warning log entry
   */
  logWarning(component: string, message: string, data?: any): void {
    this.addLogEntry("warn", component, message, data);
  }

  /**
   * Adds an error log entry
   */
  logError(
    component: string,
    message: string,
    error?: Error,
    data?: any,
  ): void {
    this.addLogEntry("error", component, message, data, error?.stack);
  }

  /**
   * Adds a log entry
   */
  private addLogEntry(
    level: "debug" | "info" | "warn" | "error",
    component: string,
    message: string,
    data?: any,
    stackTrace?: string,
  ): void {
    // Create log entry
    const logEntry: DiagnosticLogEntry = {
      timestamp: Date.now(),
      level,
      component,
      message,
      data,
      stackTrace,
    };

    // Add to logs
    this.logs.push(logEntry);

    // Limit the number of logs
    if (this.logs.length > this.config.maxLogEntries) {
      this.logs.shift();
    }

    // Log to console if configured
    if (this.config.logToConsole) {
      const prefix = `[Bridge:${component}]`;
      switch (level) {
        case "debug":
          console.debug(prefix, message, data || "");
          break;
        case "info":
          console.info(prefix, message, data || "");
          break;
        case "warn":
          console.warn(prefix, message, data || "");
          break;
        case "error":
          console.error(
            prefix,
            message,
            data || "",
            stackTrace ? `\n${stackTrace}` : "",
          );
          break;
      }
    }
  }

  /**
   * Sets the component references
   */
  setComponentReferences(components: {
    performanceMonitor?: PerformanceMonitor;
    memoryManager?: MemoryManager;
    selfHealing?: EnhancedSelfHealing;
    eventBus?: OptimizedEventBus;
    stateManager?: SelectiveStateManager;
    serializer?: EnhancedSerializer;
    chatBridge?: OptimizedChatBridge;
  }): void {
    this.performanceMonitor = components.performanceMonitor;
    this.memoryManager = components.memoryManager;
    this.selfHealing = components.selfHealing;
    this.eventBus = components.eventBus;
    this.stateManager = components.stateManager;
    this.serializer = components.serializer;
    this.chatBridge = components.chatBridge;

    this.logger.debug("Component references set", {
      components: Object.keys(components).filter(
        (k) => components[k as keyof typeof components],
      ),
    });
  }

  /**
   * Destroys the diagnostic tools
   */
  destroy(): void {
    // Stop auto reports
    this.stopAutoReports();

    // Restore original console methods
    if (this.originalConsoleError) {
      console.error = this.originalConsoleError;
    }

    if (this.originalConsoleWarn) {
      console.warn = this.originalConsoleWarn;
    }

    // Restore original error handlers
    if (this.originalOnError) {
      window.onerror = this.originalOnError;
    }

    if (this.originalOnUnhandledRejection) {
      window.onunhandledrejection = this.originalOnUnhandledRejection;
    }

    // Remove UI
    if (this.uiContainer && document.body.contains(this.uiContainer)) {
      document.body.removeChild(this.uiContainer);
    }

    // Remove console tools
    if ((window as any).bridgeDiagnostics) {
      delete (window as any).bridgeDiagnostics;
    }

    this.logger.info("DiagnosticTools destroyed");
  }
}
