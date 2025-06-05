import { reactive, readonly } from "vue";
import { v4 as uuidv4 } from "uuid";
import { i18n } from "@/i18n";

/**
 * Benachrichtigungstypen
 */
export type NotificationType =
  | "info"
  | "success"
  | "warning"
  | "error"
  | "system";

/**
 * Prioritätsstufen für Benachrichtigungen
 */
export type NotificationPriority = "low" | "medium" | "high" | "urgent";

/**
 * Aktionsbutton für eine Benachrichtigung
 */
export interface NotificationAction {
  /**
   * Text des Buttons
   */
  label: string;

  /**
   * Callback beim Klicken
   */
  onClick: () => void;

  /**
   * Ob die Benachrichtigung nach dem Klick geschlossen werden soll
   */
  closeOnClick?: boolean;

  /**
   * Primär/Sekundär-Stil
   */
  primary?: boolean;

  /**
   * Benötigt Bestätigung vor dem Schließen
   */
  requireConfirmation?: boolean;

  /**
   * Bestätigungstext
   */
  confirmationText?: string;
}

/**
 * Optionen für eine Benachrichtigung
 */
export interface NotificationOptions {
  /**
   * Titel der Benachrichtigung
   */
  title?: string;

  /**
   * Beschreibung / Details
   */
  description?: string;

  /**
   * Typ der Benachrichtigung
   */
  type?: NotificationType;

  /**
   * Priorität der Benachrichtigung
   */
  priority?: NotificationPriority;

  /**
   * Ob die Benachrichtigung ungelesen ist
   */
  unread?: boolean;

  /**
   * Ob die Benachrichtigung permanent ist
   */
  persistent?: boolean;

  /**
   * Aktionsbuttons
   */
  actions?: NotificationAction[];

  /**
   * Icon für die Benachrichtigung
   */
  icon?: string;

  /**
   * Gruppierungs-ID für verwandte Benachrichtigungen
   */
  groupId?: string;

  /**
   * Benutzerdefinierte Daten
   */
  data?: any;

  /**
   * Ablaufzeit in Millisekunden (0 = nie)
   */
  expires?: number;

  /**
   * Anzeige im Offlinemodus speichern
   */
  storeOffline?: boolean;

  /**
   * Ob ein Klick die Benachrichtigung schließt
   */
  closeOnClick?: boolean;

  /**
   * URL zum Navigieren bei Klick
   */
  clickUrl?: string;

  /**
   * Quelle der Benachrichtigung
   */
  source?: string;

  /**
   * Callback nach dem Klick
   */
  onClick?: (notification: Notification) => void;

  /**
   * Callback nach dem Schließen
   */
  onClose?: (notification: Notification) => void;

  /**
   * Callback nach dem Lesen
   */
  onRead?: (notification: Notification) => void;
}

/**
 * Benachrichtigung
 */
export interface Notification extends NotificationOptions {
  /**
   * Eindeutige ID der Benachrichtigung
   */
  id: string;

  /**
   * Zeitstempel der Erstellung
   */
  timestamp: Date;

  /**
   * Ob die Benachrichtigung gelesen wurde
   */
  read: boolean;
}

/**
 * Status einer Benachrichtigungsgruppe
 */
export interface NotificationGroup {
  /**
   * ID der Gruppe
   */
  id: string;

  /**
   * Titel der Gruppe
   */
  title: string;

  /**
   * Beschreibung der Gruppe
   */
  description?: string;

  /**
   * Icon der Gruppe
   */
  icon?: string;

  /**
   * Anzahl der Benachrichtigungen in der Gruppe
   */
  count: number;

  /**
   * Anzahl der ungelesenen Benachrichtigungen
   */
  unreadCount: number;

  /**
   * Priorität der Gruppe (höchste Priorität der enthaltenen Benachrichtigungen)
   */
  priority: NotificationPriority;

  /**
   * Liste der Benachrichtigungs-IDs in der Gruppe
   */
  notificationIds: string[];
}

/**
 * Zustand des Benachrichtigungsdienstes
 */
interface NotificationState {
  /**
   * Alle Benachrichtigungen
   */
  notifications: Notification[];

  /**
   * Benachrichtigungsgruppen
   */
  groups: Record<string, NotificationGroup>;

  /**
   * Maximale Anzahl gespeicherter Benachrichtigungen
   */
  maxNotifications: number;

  /**
   * Ob der Benachrichtigungsdienst aktiviert ist
   */
  enabled: boolean;

  /**
   * Ob neue Benachrichtigungen im Offlinemodus gespeichert werden sollen
   */
  persistOffline: boolean;
}

/**
 * Standard-Ablauffrist in Millisekunden
 */
const DEFAULT_EXPIRATION = 0; // 0 = nie ablaufen

/**
 * Maximale Anzahl gespeicherter Benachrichtigungen
 */
const DEFAULT_MAX_NOTIFICATIONS = 100;

/**
 * Prioritätsgewichte für die Sortierung
 */
const PRIORITY_WEIGHTS: Record<NotificationPriority, number> = {
  urgent: 4,
  high: 3,
  medium: 2,
  low: 1,
};

/**
 * Zustand erstellen
 */
const state = reactive<NotificationState>({
  notifications: [],
  groups: {},
  maxNotifications: DEFAULT_MAX_NOTIFICATIONS,
  enabled: true,
  persistOffline: true,
});

/**
 * Lädt gespeicherte Benachrichtigungen aus dem LocalStorage
 */
function loadStoredNotifications(): void {
  if (typeof localStorage === "undefined") return;

  try {
    const storedData = localStorage.getItem("notifications");
    if (storedData) {
      const parsedData = JSON.parse(storedData);

      if (Array.isArray(parsedData)) {
        // Wandle Strings in Dates um
        const notifications = parsedData.map((notification: any) => ({
          ...notification,
          timestamp: new Date(notification.timestamp),
        }));

        state.notifications = notifications;

        // Gruppen neu berechnen
        updateGroups();
      }
    }
  } catch (error) {
    console.error("Failed to load notifications from localStorage:", error);
  }
}

/**
 * Speichert Benachrichtigungen im LocalStorage
 */
function saveNotifications(): void {
  if (typeof localStorage === "undefined" || !state.persistOffline) return;

  try {
    // Filtere nur persistente Benachrichtigungen
    const persistentNotifications = state.notifications.filter(
      (notification) => notification.storeOffline !== false,
    );

    localStorage.setItem(
      "notifications",
      JSON.stringify(persistentNotifications),
    );
  } catch (error) {
    console.error("Failed to save notifications to localStorage:", error);
  }
}

/**
 * Aktualisiert die Benachrichtigungsgruppen
 */
function updateGroups(): void {
  const groups: Record<string, NotificationGroup> = {};

  // Erstelle ein Set aller Gruppen-IDs
  const groupIds = new Set<string>();

  // Füge alle expliziten Gruppen-IDs hinzu
  state.notifications.forEach((notification: any) => {
    if (notification.groupId) {
      groupIds.add(notification.groupId);
    }
  });

  // Implizite Gruppierung nach Typ, wenn keine Gruppe definiert
  state.notifications.forEach((notification: any) => {
    if (!notification.groupId) {
      const implicitGroupId = `type:${notification.type || "info"}`;
      groupIds.add(implicitGroupId);
    }
  });

  // Für jede Gruppen-ID
  groupIds.forEach((groupId: any) => {
    // Finde alle Benachrichtigungen dieser Gruppe
    const groupNotifications = state.notifications.filter(
      (notification: any) => {
        // Explizite Gruppe
        if (notification.groupId === groupId) return true;

        // Implizite Gruppe nach Typ
        if (!notification.groupId && groupId.startsWith("type:")) {
          const typeFromGroupId = groupId.replace("type:", "");
          return notification.type === typeFromGroupId;
        }

        return false;
      },
    );

    // Wenn Benachrichtigungen in dieser Gruppe
    if (groupNotifications.length > 0) {
      // Bestimme Gruppentitel
      let groupTitle = groupId;
      if (groupId.startsWith("type:")) {
        const type = groupId.replace("type:", "");
        groupTitle = (i18n as any).t(`notification.types.${type}`);
      }

      // Bestimme höchste Priorität in der Gruppe
      const highestPriority = groupNotifications.reduce(
        (highest, notification) => {
          const currentWeight =
            PRIORITY_WEIGHTS[notification.priority || "medium"] || 0;
          const highestWeight = PRIORITY_WEIGHTS[highest] || 0;
          return currentWeight > highestWeight
            ? notification.priority || "medium"
            : highest;
        },
        "low" as NotificationPriority,
      );

      // Zähle ungelesene Benachrichtigungen
      const unreadCount = groupNotifications.filter(
        (notification) => !notification.read,
      ).length;

      // Erstelle Gruppenobjekt
      groups[groupId] = {
        id: groupId,
        title: groupTitle,
        count: groupNotifications.length,
        unreadCount,
        priority: highestPriority,
        notificationIds: groupNotifications.map(
          (notification) => notification.id,
        ),
      };
    }
  });

  state.groups = groups;
}

/**
 * Entfernt abgelaufene Benachrichtigungen
 */
function removeExpiredNotifications(): void {
  const now = new Date();
  const initialLength = state.notifications.length;

  // Filtere abgelaufene Benachrichtigungen
  state.notifications = state.notifications.filter((notification: any) => {
    if (notification.expires && notification.expires > 0) {
      const expirationTime = new Date(
        notification.timestamp.getTime() + notification.expires,
      );
      return expirationTime > now;
    }
    return true;
  });

  // Wenn Benachrichtigungen entfernt wurden, Gruppen aktualisieren
  if (initialLength !== state.notifications.length) {
    updateGroups();
    saveNotifications();
  }
}

/**
 * Überprüft, ob die Anzahl der Benachrichtigungen das Maximum überschreitet
 */
function checkMaxNotifications(): void {
  if (state.notifications.length > state.maxNotifications) {
    // Sortiere nach Zeitstempel und Priorität
    const sortedNotifications = [...state.notifications].sort((a, b) => {
      // Nach Priorität (höher = wichtiger)
      const priorityA = PRIORITY_WEIGHTS[a.priority || "medium"] || 0;
      const priorityB = PRIORITY_WEIGHTS[b.priority || "medium"] || 0;

      // Hohe Priorität behalten
      if (priorityA !== priorityB) {
        return priorityB - priorityA;
      }

      // Nach Zeitstempel (neuere behalten)
      return b.timestamp.getTime() - a.timestamp.getTime();
    });

    // Behalte nur die wichtigsten Benachrichtigungen
    state.notifications = sortedNotifications.slice(0, state.maxNotifications);

    // Gruppen aktualisieren
    updateGroups();
    saveNotifications();
  }
}

/**
 * Benachrichtigungsdienst
 * Verwaltet und zeigt Systembenachrichtigungen an
 */
export const notificationService = {
  /**
   * Fügt eine neue Benachrichtigung hinzu
   * @param message Nachricht der Benachrichtigung
   * @param options Optionen für die Benachrichtigung
   * @returns ID der erstellten Benachrichtigung
   */
  add(_message: string, options: NotificationOptions = {}): string {
    // Nichts tun, wenn deaktiviert
    if (!state.enabled) return "";

    // Abgelaufene Benachrichtigungen entfernen
    removeExpiredNotifications();

    const id = uuidv4();

    // Erstelle die Benachrichtigung
    const notification: Notification = {
      ...options,
      id,
      timestamp: new Date(),
      read: options.unread === false,
      type: options.type || "info",
      priority: options.priority || "medium",
      expires:
        options.expires !== undefined ? options.expires : DEFAULT_EXPIRATION,
    };

    // Füge die Benachrichtigung hinzu
    state.notifications.unshift(notification);

    // Prüfe, ob die maximale Anzahl überschritten wurde
    checkMaxNotifications();

    // Speichern, wenn persistent
    if (notification.storeOffline !== false && state.persistOffline) {
      saveNotifications();
    }

    // Aktualisiere Gruppen
    updateGroups();

    return id;
  },

  /**
   * Fügt eine Info-Benachrichtigung hinzu
   * @param message Nachricht
   * @param options Optionen
   * @returns ID der erstellten Benachrichtigung
   */
  info(
    message: string,
    options: Omit<NotificationOptions, "type"> = {},
  ): string {
    return this.add(message, {
      ...options,
      type: "info",
      title: options.title || (i18n as any).t("notification.info"),
    });
  },

  /**
   * Fügt eine Erfolgs-Benachrichtigung hinzu
   * @param message Nachricht
   * @param options Optionen
   * @returns ID der erstellten Benachrichtigung
   */
  success(
    message: string,
    options: Omit<NotificationOptions, "type"> = {},
  ): string {
    return this.add(message, {
      ...options,
      type: "success",
      title: options.title || (i18n as any).t("notification.success"),
    });
  },

  /**
   * Fügt eine Warnungs-Benachrichtigung hinzu
   * @param message Nachricht
   * @param options Optionen
   * @returns ID der erstellten Benachrichtigung
   */
  warning(
    message: string,
    options: Omit<NotificationOptions, "type"> = {},
  ): string {
    return this.add(message, {
      ...options,
      type: "warning",
      title: options.title || (i18n as any).t("notification.warning"),
    });
  },

  /**
   * Fügt eine Fehler-Benachrichtigung hinzu
   * @param message Nachricht
   * @param options Optionen
   * @returns ID der erstellten Benachrichtigung
   */
  error(
    message: string,
    options: Omit<NotificationOptions, "type"> = {},
  ): string {
    return this.add(message, {
      ...options,
      type: "error",
      priority: options.priority || "high",
      title: options.title || (i18n as any).t("notification.error"),
    });
  },

  /**
   * Fügt eine System-Benachrichtigung hinzu
   * @param message Nachricht
   * @param options Optionen
   * @returns ID der erstellten Benachrichtigung
   */
  system(
    message: string,
    options: Omit<NotificationOptions, "type"> = {},
  ): string {
    return this.add(message, {
      ...options,
      type: "system",
      priority: options.priority || "high",
      title: options.title || (i18n as any).t("notification.system"),
    });
  },

  /**
   * Entfernt eine Benachrichtigung
   * @param id ID der Benachrichtigung
   */
  remove(id: string): void {
    const index = state.notifications.findIndex(
      (notification) => notification.id === id,
    );

    if (index !== -1) {
      const notification = state.notifications[index];

      // Trigger onClose callback wenn vorhanden
      if (notification.onClose) {
        notification.onClose(notification);
      }

      // Benachrichtigung entfernen
      state.notifications.splice(index, 1);

      // Gruppen aktualisieren
      updateGroups();

      // Speichern, wenn persistent
      if (notification.storeOffline !== false && state.persistOffline) {
        saveNotifications();
      }
    }
  },

  /**
   * Markiert eine Benachrichtigung als gelesen
   * @param id ID der Benachrichtigung
   */
  markAsRead(id: string): void {
    const notification = state.notifications.find(
      (notification) => notification.id === id,
    );

    if (notification && !notification.read) {
      notification.read = true;

      // Trigger onRead callback wenn vorhanden
      if (notification.onRead) {
        notification.onRead(notification);
      }

      // Gruppen aktualisieren
      updateGroups();

      // Speichern, wenn persistent
      if (notification.storeOffline !== false && state.persistOffline) {
        saveNotifications();
      }
    }
  },

  /**
   * Markiert eine Benachrichtigung als ungelesen
   * @param id ID der Benachrichtigung
   */
  markAsUnread(id: string): void {
    const notification = state.notifications.find(
      (notification) => notification.id === id,
    );

    if (notification && notification.read) {
      notification.read = false;

      // Gruppen aktualisieren
      updateGroups();

      // Speichern, wenn persistent
      if (notification.storeOffline !== false && state.persistOffline) {
        saveNotifications();
      }
    }
  },

  /**
   * Markiert alle Benachrichtigungen als gelesen
   */
  markAllAsRead(): void {
    let changed = false;

    // Markiere alle als gelesen
    state.notifications.forEach((notification: any) => {
      if (!notification.read) {
        notification.read = true;
        changed = true;

        // Trigger onRead callback wenn vorhanden
        if (notification.onRead) {
          notification.onRead(notification);
        }
      }
    });

    if (changed) {
      // Gruppen aktualisieren
      updateGroups();

      // Speichern
      saveNotifications();
    }
  },

  /**
   * Markiert alle Benachrichtigungen einer Gruppe als gelesen
   * @param groupId ID der Gruppe
   */
  markGroupAsRead(groupId: string): void {
    const group = state.groups[groupId];
    if (!group) return;

    let changed = false;

    // Markiere alle als gelesen
    group.notificationIds.forEach((id: any) => {
      const notification = state.notifications.find((n) => n.id === id);
      if (notification && !notification.read) {
        notification.read = true;
        changed = true;

        // Trigger onRead callback wenn vorhanden
        if (notification.onRead) {
          notification.onRead(notification);
        }
      }
    });

    if (changed) {
      // Gruppen aktualisieren
      updateGroups();

      // Speichern
      saveNotifications();
    }
  },

  /**
   * Entfernt alle Benachrichtigungen
   */
  clear(): void {
    if (state.notifications.length === 0) return;

    // Callbacks auslösen
    state.notifications.forEach((notification: any) => {
      if (notification.onClose) {
        notification.onClose(notification);
      }
    });

    // Alle entfernen
    state.notifications = [];

    // Gruppen aktualisieren
    updateGroups();

    // Speichern
    saveNotifications();
  },

  /**
   * Entfernt alle Benachrichtigungen einer Gruppe
   * @param groupId ID der Gruppe
   */
  clearGroup(groupId: string): void {
    const group = state.groups[groupId];
    if (!group) return;

    // Callbacks auslösen und IDs sammeln
    const idsToRemove = new Set(group.notificationIds);

    // Entferne alle Benachrichtigungen der Gruppe
    state.notifications = state.notifications.filter((notification: any) => {
      if (idsToRemove.has(notification.id)) {
        // Callback auslösen
        if (notification.onClose) {
          notification.onClose(notification);
        }
        return false;
      }
      return true;
    });

    // Gruppen aktualisieren
    updateGroups();

    // Speichern
    saveNotifications();
  },

  /**
   * Setzt die maximale Anzahl gespeicherter Benachrichtigungen
   * @param max Maximale Anzahl
   */
  setMaxNotifications(max: number): void {
    state.maxNotifications = max;
    checkMaxNotifications();
  },

  /**
   * Aktiviert oder deaktiviert den Benachrichtigungsdienst
   * @param enabled Ob der Dienst aktiviert sein soll
   */
  setEnabled(enabled: boolean): void {
    state.enabled = enabled;
  },

  /**
   * Setzt, ob Benachrichtigungen im Offlinemodus gespeichert werden sollen
   * @param persist Ob Benachrichtigungen gespeichert werden sollen
   */
  setPersistOffline(persist: boolean): void {
    state.persistOffline = persist;

    // Falls deaktiviert, LocalStorage löschen
    if (!persist && typeof localStorage !== "undefined") {
      localStorage.removeItem("notifications");
    }
  },

  /**
   * Aktualisiert die Benachrichtigungsgruppen
   */
  updateGroups(): void {
    updateGroups();
  },

  /**
   * Lädt Benachrichtigungen
   */
  loadStoredNotifications(): void {
    loadStoredNotifications();
  },

  /**
   * Speichert Benachrichtigungen
   */
  saveNotifications(): void {
    saveNotifications();
  },

  /**
   * Entfernt abgelaufene Benachrichtigungen
   */
  removeExpiredNotifications(): void {
    removeExpiredNotifications();
  },

  /**
   * Gibt alle Benachrichtigungen zurück (readonly)
   */
  get notifications() {
    return readonly(state.notifications);
  },

  /**
   * Gibt alle Benachrichtigungsgruppen zurück (readonly)
   */
  get groups() {
    return readonly(state.groups);
  },

  /**
   * Gibt zurück, ob der Dienst aktiviert ist
   */
  get enabled() {
    return state.enabled;
  },

  /**
   * Gibt die Anzahl ungelesener Benachrichtigungen zurück
   */
  get unreadCount() {
    return state.notifications.filter((notification: any) => !notification.read)
      .length;
  },

  /**
   * Gibt die Gesamtanzahl der Benachrichtigungen zurück
   */
  get count() {
    return state.notifications.length;
  },
};

// Initialisiere den Dienst
if (typeof window !== "undefined") {
  // Lade gespeicherte Benachrichtigungen
  loadStoredNotifications();

  // Starte Intervall zum Entfernen abgelaufener Benachrichtigungen
  setInterval(removeExpiredNotifications, 60000); // Jede Minute prüfen
}

export default notificationService;
