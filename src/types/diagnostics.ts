/**
 * Typ-Definitionen für das Diagnose- und Selbstheilungssystem
 */

export interface RouterHealthMetrics {
  initStatus: 'pending' | 'ready' | 'failed';
  currentRouteAvailable: boolean;
  piniaReady: boolean;
  navigationSuccessRate: number;
  errorCount: number;
  lastError: Error | null;
  lastSuccessfulNavigation: string | null;
  consecutiveFailures: number;
}

export interface ErrorInfo {
  message: string;
  stack?: string;
  timestamp: number;
  code?: string;
  component?: string;
}

export interface NavigationInfo {
  path: string;
  name?: string;
  timestamp: number;
  params?: Record<string, any>;
  query?: Record<string, any>;
}

export interface DiagnosticReport {
  timestamp: number;
  router404: Router404Status;
  domErrors: DomErrorState;
  authStatus: AuthStatus;
  selfHealingStatus: SelfHealingStatus;
  healthMetrics: RouterHealthMetrics;
}

export interface Router404Status {
  has404Issues: boolean;
  errorCount: number;
  recommendations: string[];
  routerInitErrors: number;
  navigationQueueLength: number;
  currentRoute: string | null;
}

export interface DomErrorState {
  hasErrorScreen: boolean;
  has404Page: boolean;
  errorType: string | null;
  errorMessage: string | null;
  componentHierarchy: string[];
  currentRoute: string;
  timestamp: number;
  domSnapshot: string;
}

export interface AuthStatus {
  isAuthenticated: boolean;
  lastAuthAction: string | null;
  tokenValid: boolean;
  userId?: string;
  userRole?: string;
}

export interface SelfHealingStatus {
  isActive: boolean;
  lastHealingAttempt: HealingAttempt | null;
  healingHistory: HealingAttempt[];
  successRate: number;
}

export interface HealingAttempt {
  timestamp: number;
  issue: string;
  strategy: string;
  success: boolean;
  error?: string;
}

export interface RecoveryStrategy {
  name: string;
  steps: RecoveryStep[];
  priority?: number;
  conditions?: RecoveryCondition[];
}

export interface RecoveryStep {
  action: string;
  delay: number;
  params?: Record<string, any>;
  fallback?: string;
}

export interface RecoveryCondition {
  type: 'error_count' | 'pattern' | 'time_based' | 'user_action';
  value: any;
  operator: 'equals' | 'greater_than' | 'less_than' | 'contains' | 'matches';
}

export interface RecoveryOption {
  title: string;
  description: string;
  action: string;
  icon: string;
  priority?: number;
  enabled?: boolean;
}

export interface RouterDiagnostics {
  isReady: boolean;
  hasRoute: boolean;
  routeValid: boolean;
  navigationPending: boolean;
  lastNavigation: NavigationInfo | null;
  queueLength: number;
  errorHistory: ErrorInfo[];
}

export interface DiagnosticOptions {
  enableVisualMonitoring: boolean;
  autoRecoveryThreshold: number;
  debugPanelHotkey: string;
  telemetryEndpoint: string;
  recoveryStrategies: string[];
  featureFlagOverrides: Record<string, string[]>;
}

export enum RouterErrorCode {
  INIT_FAILED = 'ROUTER_INIT_001',
  CURRENT_ROUTE_UNDEFINED = 'ROUTER_STATE_001',
  PINIA_NOT_READY = 'ROUTER_DEPS_001',
  NAVIGATION_LOOP = 'ROUTER_NAV_001',
  SESSION_NOT_FOUND = 'ROUTER_SESSION_001',
  INVALID_ROUTE = 'ROUTER_ROUTE_001',
  GUARD_ERROR = 'ROUTER_GUARD_001',
  COMPONENT_LOAD_FAILED = 'ROUTER_COMP_001'
}

export interface RouterError extends Error {
  code: RouterErrorCode;
  details?: Record<string, any>;
  recovery?: RecoveryStrategy;
}

export interface DiagnosticEvent {
  type: 'error' | 'warning' | 'info' | 'success';
  source: string;
  message: string;
  timestamp: number;
  data?: any;
  stackTrace?: string;
}

export interface MonitoringConfig {
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  startExpanded: boolean;
  autoHide: boolean;
  autoHideDelay: number;
  showOnError: boolean;
  enableHotkeys: boolean;
}

export interface TelemetryData {
  eventType: string;
  timestamp: number;
  sessionId: string;
  userId?: string;
  data: Record<string, any>;
  metadata: {
    userAgent: string;
    viewport: { width: number; height: number };
    url: string;
    referrer: string;
  };
}