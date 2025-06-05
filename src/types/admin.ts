/**
 * TypeScript-Definitionen für Admin-Komponenten
 * Erstellt im Rahmen des Admin-Komponenten-Designs (08.05.2025)
 */

/**
 * Benutzer und Rollen
 */
export interface User {
  id: string;
  email: string;
  role: UserRole;
  created_at: number;
  last_login: number | null;
}

export enum UserRole {
  ADMIN = "admin",
  USER = "user",
}

export interface NewUser {
  email: string;
  password: string;
  role: UserRole;
}

export interface UserUpdateParams {
  userId: string;
  role: UserRole;
}

/**
 * Systemstatistiken
 */
export interface SystemStats {
  total_users: number;
  active_users_today: number;
  total_sessions: number;
  total_messages: number;
  avg_messages_per_session: number;
  total_feedback: number;
  positive_feedback_percent: number;
  database_size_mb: number;
  cache_size_mb: number;
  cache_hit_rate: number;
  document_count: number;
  avg_response_time_ms: number;
  active_model: string;
  uptime_days: number;
  memory_usage_percent: number;
  cpu_usage_percent: number;
  start_time: number;
}

export interface SystemAction {
  type: "clear-cache" | "clear-embedding-cache" | "reload-motd" | "reindex";
  name: string;
  description: string;
  requiresConfirmation: boolean;
  confirmationMessage?: string;
}

/**
 * Feedback-Einträge
 */
export interface FeedbackStats {
  total: number;
  positive: number;
  negative: number;
  positive_percent: number;
  with_comments: number;
  unresolved?: number; // Number of unresolved feedback entries
  feedback_rate?: number; // Prozentsatz der Nachrichten mit Feedback
  feedback_by_day: {
    date: string;
    positive: number;
    negative: number;
    count?: number;
  }[];
}

export interface FeedbackEntry {
  id: string;
  message_id: string;
  session_id: string;
  user_id: string;
  user_email: string;
  is_positive: boolean;
  comment: string | null;
  question: string;
  answer: string;
  created_at: number;
}

export interface FeedbackFilter {
  dateFrom?: number;
  dateTo?: number;
  isPositive?: boolean;
  hasComment?: boolean;
  searchTerm?: string;
}

/**
 * Optionen für den Export von Feedback-Daten
 */
export interface ExportOptions {
  format: "csv" | "json" | "xlsx" | "pdf";
  data: FeedbackEntry[];
  fields: string[];
}

/**
 * MOTD-Struktur
 */
export interface MotdConfig {
  enabled: boolean;
  format: "markdown" | "html" | "text";
  content: string;
  priority?: "low" | "normal" | "high" | "urgent";
  audience?: "all" | "admins" | "users" | "new" | "custom";
  style: MotdStyle;
  display: MotdDisplay;
  schedule?: MotdSchedule;
}

export interface MotdStyle {
  backgroundColor: string;
  borderColor: string;
  textColor: string;
  iconClass: string;
  borderRadius?: number;
  shadow?: boolean;
}

export interface MotdDisplay {
  position: "top" | "bottom" | "modal";
  dismissible: boolean;
  showOnStartup: boolean;
  showInChat: boolean;
}

export interface MotdSchedule {
  enabled: boolean;
  startDate: Date | null;
  endDate: Date | null;
  recurrence: "none" | "daily" | "weekly" | "monthly" | "custom";
  timeSlots?: string[];
}

export interface MotdTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  tags: string[];
  content: string;
  style: Partial<MotdStyle>;
  priority: string;
}

export interface MotdHistoryItem {
  id: string;
  title: string;
  preview: string;
  content: string;
  timestamp: number;
  user: string;
  status: "active" | "scheduled" | "expired" | "draft";
  views: number;
  dismissals: number;
  config: MotdConfig;
}

export interface MotdVariable {
  key: string;
  description: string;
  example: string;
}

/**
 * Dokumentenkonverter
 */
export interface DocConverterStatus {
  enabled: boolean;
  queue_length: number;
  processing: boolean;
  last_run: number | null;
  documents_processed: number;
  documents_failed: number;
  documents_pending: number;
  supported_formats: string[];
}

export interface DocConverterJob {
  id: string;
  fileName: string;
  fileSize: number;
  status: "pending" | "processing" | "completed" | "failed";
  created_at: number;
  updated_at: number;
  error?: string;
}

export interface DocConverterSettings {
  enabled: boolean;
  concurrency: number;
  max_file_size_mb: number;
  allowed_extensions: string[];
  chunk_size: number;
  auto_process: boolean;
  schedule: string;
}

/**
 * Admin Store Zustandstypen
 */
export interface AdminUsersState {
  users: User[];
  loading: boolean;
  error: string | null;
  newUser: NewUser;
}

export interface AdminSystemState {
  stats: SystemStats;
  actions: SystemAction[];
  loading: boolean;
  error: string | null;
}

export interface AdminFeedbackState {
  stats: FeedbackStats;
  negativeFeedback: FeedbackEntry[];
  filter: FeedbackFilter;
  loading: boolean;
  error: string | null;
}

export interface AdminMotdState {
  config: MotdConfig;
  loading: boolean;
  error: string | null;
  previewMode: boolean;
}

export interface AdminDocConverterState {
  status: DocConverterStatus;
  jobs: DocConverterJob[];
  settings: DocConverterSettings;
  loading: boolean;
  error: string | null;
}

/**
 * Admin Panel Tab Definition
 */
export interface AdminTab {
  id: string;
  label: string;
  component: string;
  icon: string;
  requiredRole?: string;
  featureFlag?: string;
}


export interface SystemCheckResult {
  [key: string]: any;
}


export interface UserStats {
  [key: string]: any;
}
