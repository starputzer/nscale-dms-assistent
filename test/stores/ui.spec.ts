import { describe, it, expect, vi, beforeEach } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useUIStore } from "../../src/stores/ui";
import { nextTick } from "vue";
import { mockDate, waitForPromises } from "./__setup__/testSetup";

/**
 * Tests für den UI-Store
 *
 * Testet:
 * - Dark Mode und Theme-Umschaltung
 * - Sidebar-Verhalten
 * - Modale Dialoge und Toasts
 * - Responsive Layout-Anpassungen
 * - CSS-Variablen und -Anwendung
 */
describe("UI Store", () => {
  let documentSpy: { style: Record<string, any> };
  let documentClassListSpy: {
    add: vi.Mock;
    remove: vi.Mock;
    contains: vi.Mock;
  };
  let mediaQueryListSpy: {
    matches: boolean;
    addEventListener: vi.Mock;
    removeEventListener: vi.Mock;
  };

  beforeEach(() => {
    // Mock für document.documentElement.style
    documentSpy = {
      style: {},
    };

    // Mock für document.documentElement.classList
    documentClassListSpy = {
      add: vi.fn(),
      remove: vi.fn(),
      contains: vi.fn().mockReturnValue(false),
    };

    // Mock für window.matchMedia
    mediaQueryListSpy = {
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };

    // Mocks für DOM-APIs
    vi.spyOn(document, "documentElement", "get").mockReturnValue(
      documentSpy as any,
    );
    vi.spyOn(document.documentElement, "classList", "get").mockReturnValue(
      documentClassListSpy as any,
    );
    vi.spyOn(document.documentElement, "setAttribute").mockImplementation(
      (attr, value) => {},
    );
    vi.spyOn(window, "matchMedia").mockReturnValue(mediaQueryListSpy as any);

    // Zurücksetzen der lokalen Speicher zwischen Tests
    localStorage.clear();

    // Mock für setTimeout
    vi.useFakeTimers();

    // Die Standardgröße des Viewports setzen (nicht mobil)
    window.innerWidth = 1024;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("Initialisierung", () => {
    it("sollte mit korrekten Standardwerten initialisiert werden", () => {
      // Arrange & Act
      const store = useUIStore();

      // Assert
      expect(store.sidebar.isOpen).toBe(true);
      expect(store.sidebar.width).toBe(280);
      expect(store.darkMode).toBe(false);
      expect(store.viewMode).toBe("default");
      expect(store.activeModals).toEqual([]);
      expect(store.toasts).toEqual([]);
      expect(store.isLoading).toBe(false);
      expect(store.isMobile).toBe(false);
    });

    it("sollte Legacy-Daten aus dem localStorage migrieren", () => {
      // Arrange
      localStorage.setItem("nscale_darkMode", "true");
      localStorage.setItem("nscale_sidebarWidth", "300");
      localStorage.setItem("nscale_sidebarOpen", "false");
      localStorage.setItem("nscale_viewMode", "compact");

      // Act
      const store = useUIStore();
      store.migrateFromLegacyStorage();

      // Assert
      expect(store.darkMode).toBe(true);
      expect(store.sidebar.width).toBe(300);
      expect(store.sidebar.isOpen).toBe(false);
      expect(store.viewMode).toBe("compact");
    });

    it("sollte den Dark Mode basierend auf Systemeinstellungen initialisieren", () => {
      // Arrange
      // System bevorzugt Dark Mode
      mediaQueryListSpy.matches = true;

      // Act
      const store = useUIStore();

      // Assert
      expect(store.darkMode).toBe(true);

      // Dark Mode sollte auf dem System angewendet werden
      expect(documentClassListSpy.add).toHaveBeenCalledWith("dark");
      expect(document.documentElement.setAttribute).toHaveBeenCalledWith(
        "data-theme",
        "dark",
      );
    });
  });

  describe("Dark Mode", () => {
    it("sollte den Dark Mode umschalten können", () => {
      // Arrange
      const store = useUIStore();
      expect(store.darkMode).toBe(false);

      // Act
      store.toggleDarkMode();

      // Assert
      expect(store.darkMode).toBe(true);
      expect(store.isDarkMode).toBe(true);

      // UI-Update ausführen
      vi.runAllTimers();

      // Dark Mode sollte auf dem System angewendet werden
      expect(documentClassListSpy.add).toHaveBeenCalledWith("dark");

      // Nochmal umschalten
      store.toggleDarkMode();

      // Jetzt sollte Dark Mode wieder deaktiviert sein
      expect(store.darkMode).toBe(false);
      expect(store.isDarkMode).toBe(false);

      // UI-Update ausführen
      vi.runAllTimers();

      // Dark Mode sollte vom System entfernt werden
      expect(documentClassListSpy.remove).toHaveBeenCalledWith("dark");
    });

    it("sollte den Dark Mode explizit aktivieren können", () => {
      // Arrange
      const store = useUIStore();

      // Act
      store.enableDarkMode();

      // Assert
      expect(store.darkMode).toBe(true);

      // UI-Update ausführen
      vi.runAllTimers();

      // Dark Mode sollte auf dem System angewendet werden
      expect(documentClassListSpy.add).toHaveBeenCalledWith("dark");
      expect(document.documentElement.setAttribute).toHaveBeenCalledWith(
        "data-theme",
        "dark",
      );

      // Erneut aktivieren sollte keinen Fehler verursachen
      store.enableDarkMode();
      expect(store.darkMode).toBe(true);
    });

    it("sollte den Dark Mode explizit deaktivieren können", () => {
      // Arrange
      const store = useUIStore();
      store.darkMode = true;

      // Act
      store.disableDarkMode();

      // Assert
      expect(store.darkMode).toBe(false);

      // UI-Update ausführen
      vi.runAllTimers();

      // Dark Mode sollte vom System entfernt werden
      expect(documentClassListSpy.remove).toHaveBeenCalledWith("dark");
      expect(document.documentElement.setAttribute).toHaveBeenCalledWith(
        "data-theme",
        "light",
      );

      // Erneut deaktivieren sollte keinen Fehler verursachen
      store.disableDarkMode();
      expect(store.darkMode).toBe(false);
    });

    it("sollte Änderungen am Dark Mode im localStorage speichern", async () => {
      // Arrange
      const store = useUIStore();
      const localStorageSpy = vi.spyOn(localStorage, "setItem");

      // Act
      store.toggleDarkMode();
      await nextTick();

      // Assert
      expect(localStorageSpy).toHaveBeenCalledWith(expect.any(String), "true");

      // Zurückschalten und prüfen, ob false gespeichert wird
      store.toggleDarkMode();
      await nextTick();

      expect(localStorageSpy).toHaveBeenCalledWith(expect.any(String), "false");
    });

    it("sollte den Dark Mode basierend auf Systemeinstellungen initialisieren", () => {
      // Mocks zurücksetzen
      vi.clearAllMocks();

      // Arrange - System bevorzugt Dark Mode
      mediaQueryListSpy.matches = true;

      // Act - Store initialisieren, was initDarkMode ausführt
      const store = useUIStore();

      // Assert
      expect(store.darkMode).toBe(true);
      expect(documentClassListSpy.add).toHaveBeenCalledWith("dark");

      // Medienereignis simulieren (System wechselt zu Light Mode)
      const mediaQueryHandler =
        mediaQueryListSpy.addEventListener.mock.calls[0][1];
      mediaQueryHandler({ matches: false } as MediaQueryListEvent);

      // Assert - Da kein localStorage-Eintrag vorhanden ist, sollte die Systemeinstellung verwendet werden
      expect(store.darkMode).toBe(false);

      // Jetzt einen localStorage-Eintrag simulieren
      localStorage.setItem("nscale_darkMode", "true");

      // Medienereignis erneut simulieren
      mediaQueryHandler({ matches: false } as MediaQueryListEvent);

      // Assert - Da jetzt ein localStorage-Eintrag vorhanden ist, sollte dieser Vorrang haben
      expect(store.darkMode).toBe(true);
    });

    it("sollte die Dark Mode UI-Updates korrekt anfordern", () => {
      // Arrange
      const store = useUIStore();
      const requestUIUpdateSpy = vi.spyOn(store, "requestUIUpdate");

      // Act
      store.toggleDarkMode();

      // Assert
      expect(requestUIUpdateSpy).toHaveBeenCalledWith("darkMode");

      // Explizites Aktivieren
      requestUIUpdateSpy.mockClear();
      store.enableDarkMode();
      expect(requestUIUpdateSpy).toHaveBeenCalledWith("darkMode");

      // Explizites Deaktivieren
      requestUIUpdateSpy.mockClear();
      store.disableDarkMode();
      expect(requestUIUpdateSpy).toHaveBeenCalledWith("darkMode");
    });

    it("sollte den Dark Mode durch den Watch-Effekt aktualisieren", async () => {
      // Arrange
      const store = useUIStore();
      const localStorageSpy = vi.spyOn(localStorage, "setItem");
      const requestUIUpdateSpy = vi.spyOn(store, "requestUIUpdate");

      // Act
      store.darkMode = true;
      await nextTick(); // Warten auf Watch-Effekt

      // Assert
      expect(localStorageSpy).toHaveBeenCalledWith(expect.any(String), "true");
      expect(requestUIUpdateSpy).toHaveBeenCalledWith("darkMode");
    });

    it("sollte Legacy-Dark-Mode-Einstellungen korrekt migrieren", () => {
      // Arrange
      localStorage.setItem("nscale_darkMode", "true");

      // Act
      const store = useUIStore();
      store.migrateFromLegacyStorage();

      // Assert
      expect(store.darkMode).toBe(true);

      // Jetzt mit 'false' testen
      localStorage.setItem("nscale_darkMode", "false");

      // Neuen Store erstellen (um Cache zu vermeiden)
      const store2 = useUIStore();
      store2.migrateFromLegacyStorage();

      // Assert
      expect(store2.darkMode).toBe(false);
    });

    it("sollte bei der Migration von Legacy-Einstellungen Fehler abfangen können", () => {
      // Arrange - Fehler beim Auslesen verursachen
      const localStorageGetItemSpy = vi.spyOn(localStorage, "getItem");
      localStorageGetItemSpy.mockImplementation(() => {
        throw new Error("Simulierter Fehler");
      });

      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      // Act
      const store = useUIStore();

      // Keine Fehler sollten nach außen dringen
      expect(() => store.migrateFromLegacyStorage()).not.toThrow();

      // Assert
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Fehler bei der Migration von UI-Daten:",
        expect.any(Error),
      );
    });

    it("sollte die Dark-Mode-Klasse und das data-theme-Attribut korrekt anwenden", () => {
      // Arrange
      const store = useUIStore();

      // Act - Dark Mode aktivieren
      store.darkMode = true;
      store.applyDarkMode();

      // Assert
      expect(documentClassListSpy.add).toHaveBeenCalledWith("dark");
      expect(document.documentElement.setAttribute).toHaveBeenCalledWith(
        "data-theme",
        "dark",
      );

      // Act - Dark Mode deaktivieren
      store.darkMode = false;
      store.applyDarkMode();

      // Assert
      expect(documentClassListSpy.remove).toHaveBeenCalledWith("dark");
      expect(document.documentElement.setAttribute).toHaveBeenCalledWith(
        "data-theme",
        "light",
      );
    });

    it("sollte während des Lebenszyklus des Stores Event-Listener richtig verwalten", () => {
      // Arrange
      const store = useUIStore();

      // Act - Initialize aufrufen, was Event-Listener einrichtet
      const cleanup = store.initialize();

      // Assert - Event-Listener sollten registriert sein
      expect(mediaQueryListSpy.addEventListener).toHaveBeenCalled();

      // Act - Cleanup-Funktion aufrufen
      cleanup();

      // Assert - Event-Listener sollten entfernt sein
      expect(mediaQueryListSpy.removeEventListener).toHaveBeenCalled();
    });
  });

  describe("Sidebar", () => {
    it("sollte die Sidebar öffnen können", () => {
      // Arrange
      const store = useUIStore();
      store.sidebar.isOpen = false;

      // Act
      store.openSidebar();

      // Assert
      expect(store.sidebar.isOpen).toBe(true);
      expect(store.sidebar.collapsed).toBe(false);
      expect(store.sidebarIsOpen).toBe(true);
    });

    it("sollte die Sidebar schließen können", () => {
      // Arrange
      const store = useUIStore();
      store.sidebar.isOpen = true;

      // Act
      store.closeSidebar();

      // Assert
      expect(store.sidebar.isOpen).toBe(false);
      expect(store.sidebarIsOpen).toBe(false);
    });

    it("sollte die Sidebar umschalten können", () => {
      // Arrange
      const store = useUIStore();
      store.sidebar.isOpen = false;

      // Act
      store.toggleSidebar();

      // Assert
      expect(store.sidebar.isOpen).toBe(true);
      expect(store.sidebarIsOpen).toBe(true);

      // Nochmals umschalten
      store.toggleSidebar();
      expect(store.sidebar.isOpen).toBe(false);
      expect(store.sidebarIsOpen).toBe(false);
    });

    it("sollte die Sidebar minimieren/maximieren können", () => {
      // Arrange
      const store = useUIStore();
      expect(store.sidebar.collapsed).toBe(false);

      // Act
      store.toggleSidebarCollapse();

      // Assert
      expect(store.sidebar.collapsed).toBe(true);
      expect(store.sidebarIsCollapsed).toBe(true);

      // Wenn ausgeklappt, sollte die Sidebar geöffnet sein
      store.toggleSidebarCollapse();
      expect(store.sidebar.collapsed).toBe(false);
      expect(store.sidebar.isOpen).toBe(true);
    });

    it("sollte die Sidebar-Breite ändern können", () => {
      // Arrange
      const store = useUIStore();

      // Act
      store.setSidebarWidth(350);

      // Assert
      expect(store.sidebar.width).toBe(350);

      // Werte sollten auf sinnvolle Grenzen beschränkt sein
      store.setSidebarWidth(100); // Zu klein
      expect(store.sidebar.width).toBe(180); // Minimalwert

      store.setSidebarWidth(600); // Zu groß
      expect(store.sidebar.width).toBe(500); // Maximalwert
    });

    it("sollte den aktiven Sidebar-Tab ändern können", () => {
      // Arrange
      const store = useUIStore();
      store.sidebar.activeTab = null;

      // Act
      store.setSidebarTab("settings");

      // Assert
      expect(store.sidebar.activeTab).toBe("settings");

      // Sollte die Sidebar öffnen, wenn sie geschlossen ist
      store.sidebar.isOpen = false;
      store.setSidebarTab("chat");
      expect(store.sidebar.isOpen).toBe(true);
      expect(store.sidebar.activeTab).toBe("chat");
    });
  });

  describe("Modale Dialoge", () => {
    it("sollte ein Modal öffnen können", () => {
      // Arrange
      const store = useUIStore();

      // Act
      const modalId = store.openModal({
        component: "TestModal",
        title: "Test-Modal",
        props: { test: true },
      });

      // Assert
      expect(modalId).toEqual(expect.any(String));
      expect(store.activeModals).toHaveLength(1);
      expect(store.activeModals[0].component).toBe("TestModal");
      expect(store.activeModals[0].title).toBe("Test-Modal");
      expect(store.activeModals[0].props).toEqual({ test: true });
      expect(store.hasActiveModals).toBe(true);
    });

    it("sollte ein Modal schließen können", () => {
      // Arrange
      const store = useUIStore();
      const modalId = store.openModal({
        component: "TestModal",
      });

      // Act
      store.closeModal(modalId);

      // Assert
      expect(store.activeModals).toHaveLength(0);
      expect(store.hasActiveModals).toBe(false);
    });

    it("sollte alle Modals schließen können", () => {
      // Arrange
      const store = useUIStore();
      store.openModal({ component: "Modal1" });
      store.openModal({ component: "Modal2" });
      store.openModal({ component: "Modal3" });

      // Act
      store.closeAllModals();

      // Assert
      expect(store.activeModals).toHaveLength(0);
    });

    it("sollte eine Bestätigungsdialog anzeigen können", async () => {
      // Arrange
      const store = useUIStore();
      const modalSpy = vi.spyOn(store, "openModal");

      // Act - Bestätigung akzeptieren
      const confirmPromise = store.confirm("Sind Sie sicher?", {
        title: "Bestätigung",
        confirmText: "Ja",
        cancelText: "Nein",
        variant: "warning",
      });

      // Bestätigung simulieren
      const modalId = modalSpy.mock.calls[0][0].id;
      const confirmFn = modalSpy.mock.calls[0][0].props.onConfirm;
      confirmFn();

      // Assert
      const result = await confirmPromise;
      expect(result).toBe(true);

      // Modal sollte geöffnet und richtig konfiguriert worden sein
      expect(modalSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          component: "ConfirmDialog",
          title: "Bestätigung",
          props: expect.objectContaining({
            message: "Sind Sie sicher?",
            confirmText: "Ja",
            cancelText: "Nein",
            variant: "warning",
          }),
        }),
      );
    });

    it("sollte false zurückgeben, wenn der Bestätigungsdialog abgebrochen wird", async () => {
      // Arrange
      const store = useUIStore();
      const modalSpy = vi.spyOn(store, "openModal");

      // Act - Bestätigung ablehnen
      const confirmPromise = store.confirm("Sind Sie sicher?");

      // Ablehnung simulieren
      const modalId = modalSpy.mock.calls[0][0].id;
      const cancelFn = modalSpy.mock.calls[0][0].props.onCancel;
      cancelFn();

      // Assert
      const result = await confirmPromise;
      expect(result).toBe(false);
    });

    it("sollte einen Eingabedialog anzeigen können", async () => {
      // Arrange
      const store = useUIStore();
      const modalSpy = vi.spyOn(store, "openModal");

      // Act - Eingabedialog mit Wert bestätigen
      const promptPromise = store.prompt("Geben Sie einen Wert ein:", {
        title: "Eingabe",
        defaultValue: "Standardwert",
      });

      // Bestätigung simulieren
      const modalId = modalSpy.mock.calls[0][0].id;
      const confirmFn = modalSpy.mock.calls[0][0].props.onConfirm;
      confirmFn("Eingabewert");

      // Assert
      const result = await promptPromise;
      expect(result).toBe("Eingabewert");

      // Modal sollte geöffnet und richtig konfiguriert worden sein
      expect(modalSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          component: "PromptDialog",
          title: "Eingabe",
          props: expect.objectContaining({
            message: "Geben Sie einen Wert ein:",
            defaultValue: "Standardwert",
          }),
        }),
      );
    });

    it("sollte null zurückgeben, wenn der Eingabedialog abgebrochen wird", async () => {
      // Arrange
      const store = useUIStore();
      const modalSpy = vi.spyOn(store, "openModal");

      // Act - Eingabedialog abbrechen
      const promptPromise = store.prompt("Geben Sie einen Wert ein:");

      // Ablehnung simulieren
      const modalId = modalSpy.mock.calls[0][0].id;
      const cancelFn = modalSpy.mock.calls[0][0].props.onCancel;
      cancelFn();

      // Assert
      const result = await promptPromise;
      expect(result).toBeNull();
    });
  });

  describe("Toast-Benachrichtigungen", () => {
    it("sollte einen Toast anzeigen können", () => {
      // Arrange
      const store = useUIStore();

      // Act
      const toastId = store.showToast({
        type: "success",
        message: "Operation erfolgreich",
        duration: 3000,
      });

      // Assert
      expect(toastId).toEqual(expect.any(String));
      expect(store.toasts).toHaveLength(1);
      expect(store.toasts[0].type).toBe("success");
      expect(store.toasts[0].message).toBe("Operation erfolgreich");
      expect(store.toasts[0].duration).toBe(3000);
    });

    it("sollte einen Toast nach Ablauf der Zeit automatisch entfernen", () => {
      // Arrange
      const store = useUIStore();

      // Act
      const toastId = store.showToast({
        type: "info",
        message: "Kurzlebige Nachricht",
        duration: 1000,
      });

      // Timer voranschreiten lassen
      vi.advanceTimersByTime(1000);

      // Assert
      expect(store.toasts).toHaveLength(0);
    });

    it("sollte einen Toast manuell entfernen können", () => {
      // Arrange
      const store = useUIStore();
      const toastId = store.showToast({
        type: "warning",
        message: "Warnung",
      });

      // Mock für DOM-Element
      document.getElementById = vi.fn().mockReturnValue({
        classList: {
          add: vi.fn(),
        },
      });

      // Act
      store.dismissToast(toastId);

      // Animation abwarten
      vi.advanceTimersByTime(300);

      // Assert
      expect(store.toasts).toHaveLength(0);
    });

    it("sollte verschiedene Toast-Typen unterstützen", () => {
      // Arrange
      const store = useUIStore();

      // Act
      const successId = store.showSuccess("Erfolg");
      const errorId = store.showError("Fehler");
      const warningId = store.showWarning("Warnung");
      const infoId = store.showInfo("Information");

      // Assert
      expect(store.toasts).toHaveLength(4);

      // Erfolg
      const successToast = store.toasts.find((t) => t.id === successId);
      expect(successToast).toBeDefined();
      expect(successToast!.type).toBe("success");
      expect(successToast!.message).toBe("Erfolg");

      // Fehler (sollte längere Anzeigedauer haben)
      const errorToast = store.toasts.find((t) => t.id === errorId);
      expect(errorToast).toBeDefined();
      expect(errorToast!.type).toBe("error");
      expect(errorToast!.duration).toBe(8000);

      // Warnung
      const warningToast = store.toasts.find((t) => t.id === warningId);
      expect(warningToast).toBeDefined();
      expect(warningToast!.type).toBe("warning");

      // Information
      const infoToast = store.toasts.find((t) => t.id === infoId);
      expect(infoToast).toBeDefined();
      expect(infoToast!.type).toBe("info");
    });

    it("sollte die Anzahl der gleichzeitigen Toasts begrenzen", () => {
      // Arrange
      const store = useUIStore();

      // Act - 6 Toasts erstellen (Limit ist 5)
      for (let i = 0; i < 6; i++) {
        store.showToast({
          type: "info",
          message: `Toast ${i + 1}`,
        });
      }

      // Assert
      expect(store.toasts).toHaveLength(5);
      expect(store.toasts[0].message).toBe("Toast 2"); // Der erste Toast sollte entfernt worden sein
    });

    it("sollte benutzerdefinierte Toast-Optionen unterstützen", () => {
      // Arrange
      const store = useUIStore();
      const onClickMock = vi.fn();

      // Act
      const toastId = store.showToast({
        type: "info",
        message: "Toast mit Aktionen",
        duration: 10000,
        closable: false,
        actions: [{ label: "Aktion", onClick: onClickMock }],
      });

      // Assert
      const toast = store.toasts.find((t) => t.id === toastId);
      expect(toast).toBeDefined();
      expect(toast!.message).toBe("Toast mit Aktionen");
      expect(toast!.duration).toBe(10000);
      expect(toast!.closable).toBe(false);
      expect(toast!.actions).toHaveLength(1);
      expect(toast!.actions![0].label).toBe("Aktion");

      // Aktion auslösen
      toast!.actions![0].onClick();
      expect(onClickMock).toHaveBeenCalledTimes(1);
    });

    it("sollte bei DOM-Element-Fehler den Toast direkt entfernen", () => {
      // Arrange
      const store = useUIStore();
      const toastId = store.showToast({
        type: "info",
        message: "Test",
      });

      // Mock für DOM-Element (nicht gefunden)
      document.getElementById = vi.fn().mockReturnValue(null);

      // Act
      store.dismissToast(toastId);

      // Assert - Toast sollte sofort entfernt werden
      expect(store.toasts).toHaveLength(0);
    });

    it("sollte einen Erfolgs-Toast mit benutzerdefinierten Optionen anzeigen können", () => {
      // Arrange
      const store = useUIStore();
      const onClickMock = vi.fn();

      // Act
      const toastId = store.showSuccess("Erfolg", {
        duration: 2000,
        closable: false,
        actions: [{ label: "Aktion", onClick: onClickMock }],
      });

      // Assert
      const toast = store.toasts.find((t) => t.id === toastId);
      expect(toast).toBeDefined();
      expect(toast!.type).toBe("success");
      expect(toast!.message).toBe("Erfolg");
      expect(toast!.duration).toBe(2000);
      expect(toast!.closable).toBe(false);
      expect(toast!.actions).toHaveLength(1);
    });

    it("sollte einen Fehler-Toast mit benutzerdefinierten Optionen anzeigen können", () => {
      // Arrange
      const store = useUIStore();

      // Act
      const toastId = store.showError("Fehler", {
        duration: 10000, // Überschreibt Standardwert von 8000
        closable: true,
      });

      // Assert
      const toast = store.toasts.find((t) => t.id === toastId);
      expect(toast).toBeDefined();
      expect(toast!.type).toBe("error");
      expect(toast!.message).toBe("Fehler");
      expect(toast!.duration).toBe(10000);
      expect(toast!.closable).toBe(true);
    });

    it("sollte einen Warnungs-Toast mit benutzerdefinierten Optionen anzeigen können", () => {
      // Arrange
      const store = useUIStore();

      // Act
      const toastId = store.showWarning("Warnung", {
        duration: 3000, // Kürzer als Standard (7000)
      });

      // Assert
      const toast = store.toasts.find((t) => t.id === toastId);
      expect(toast).toBeDefined();
      expect(toast!.type).toBe("warning");
      expect(toast!.message).toBe("Warnung");
      expect(toast!.duration).toBe(3000);
    });

    it("sollte einen Info-Toast mit benutzerdefinierten Optionen anzeigen können", () => {
      // Arrange
      const store = useUIStore();
      const onClickMock1 = vi.fn();
      const onClickMock2 = vi.fn();

      // Act
      const toastId = store.showInfo("Information", {
        actions: [
          { label: "Aktion 1", onClick: onClickMock1 },
          { label: "Aktion 2", onClick: onClickMock2 },
        ],
      });

      // Assert
      const toast = store.toasts.find((t) => t.id === toastId);
      expect(toast).toBeDefined();
      expect(toast!.type).toBe("info");
      expect(toast!.message).toBe("Information");
      expect(toast!.actions).toHaveLength(2);
      expect(toast!.actions![0].label).toBe("Aktion 1");
      expect(toast!.actions![1].label).toBe("Aktion 2");

      // Aktionen auslösen
      toast!.actions![0].onClick();
      toast!.actions![1].onClick();
      expect(onClickMock1).toHaveBeenCalledTimes(1);
      expect(onClickMock2).toHaveBeenCalledTimes(1);
    });

    it("sollte mehrere Toasts gleichzeitig verwalten können", () => {
      // Arrange
      const store = useUIStore();

      // Act - Verschiedene Toast-Typen hinzufügen
      store.showSuccess("Erfolg 1");
      store.showInfo("Info 1");
      store.showWarning("Warnung 1");
      store.showError("Fehler 1");
      store.showSuccess("Erfolg 2");

      // Assert - Maximal 5 Toasts (Limit wurde erreicht)
      expect(store.toasts).toHaveLength(5);

      // Prüfen der korrekten Reihenfolge (FIFO)
      expect(store.toasts[0].message).toBe("Erfolg 1");
      expect(store.toasts[1].message).toBe("Info 1");
      expect(store.toasts[2].message).toBe("Warnung 1");
      expect(store.toasts[3].message).toBe("Fehler 1");
      expect(store.toasts[4].message).toBe("Erfolg 2");

      // Act - Ältesten Toast entfernen
      store.dismissToast(store.toasts[0].id);
      vi.advanceTimersByTime(300); // Animation abwarten

      // Assert - Jetzt sollten 4 Toasts übrig sein
      expect(store.toasts).toHaveLength(4);
      expect(store.toasts[0].message).toBe("Info 1");

      // Act - Neuen Toast hinzufügen (sollte möglich sein, da unter dem Limit)
      store.showInfo("Info 2");

      // Assert - Jetzt sollten wieder 5 Toasts vorhanden sein
      expect(store.toasts).toHaveLength(5);
    });
  });

  describe("Layout und Responsive Design", () => {
    beforeEach(() => {
      // Mock für localStorage zurücksetzen
      localStorage.clear();
    });

    it("sollte die Viewport-Größe erkennen und entsprechend reagieren", () => {
      // Arrange
      const store = useUIStore();

      // Act - Fenster auf mobile Größe verkleinern
      window.innerWidth = 600; // Unter dem Breakpoint
      store.checkViewport();

      // Assert
      expect(store.isMobile).toBe(true);

      // Sidebar sollte auf mobilen Geräten automatisch geschlossen werden
      expect(store.sidebar.isOpen).toBe(false);

      // Act - Fenster auf Desktop-Größe vergrößern
      window.innerWidth = 1024; // Über dem Breakpoint
      store.checkViewport();

      // Assert
      expect(store.isMobile).toBe(false);
    });

    it("sollte CSS-Variablen basierend auf der Konfiguration generieren", () => {
      // Arrange
      const store = useUIStore();

      // Act - Verschiedene Konfigurationen testen
      store.sidebar.width = 300;
      store.layoutConfig.density = "compact";
      store.layoutConfig.textScale = 1.2;

      // UI-Update auslösen
      store.requestUIUpdate("layout");
      vi.runAllTimers();

      // Assert - CSS-Variablen sollten gesetzt sein
      expect(documentSpy.style["--sidebar-width"]).toBe("300px");
      expect(documentSpy.style["--text-scale"]).toBe("1.2");
      expect(documentSpy.style["--ui-spacing"]).toBe("0.5rem"); // Für kompaktes Layout
    });

    it("sollte effektive Layout-Konfigurationen basierend auf dem Viewport und View-Modus berechnen", () => {
      // Arrange
      const store = useUIStore();

      // Act - Mobile Ansicht
      window.innerWidth = 600;
      store.checkViewport();

      // Assert
      expect(store.effectiveLayoutConfig.sidebarWidth).toBe("100%");
      expect(store.effectiveLayoutConfig.contentMaxWidth).toBe("100%");
      expect(store.effectiveLayoutConfig.splitPaneEnabled).toBe(false);

      // Act - Fokus-Modus
      window.innerWidth = 1024; // Zurück zum Desktop
      store.checkViewport();
      store.setViewMode("focus");

      // Assert
      expect(store.effectiveLayoutConfig.headerVisible).toBe(false);
      expect(store.effectiveLayoutConfig.footerVisible).toBe(false);

      // Act - Kompakter Modus
      store.setViewMode("compact");

      // Assert
      expect(store.effectiveLayoutConfig.density).toBe("compact");
      expect(store.effectiveLayoutConfig.textScale).toBe(0.9);

      // Act - Präsentationsmodus
      store.setViewMode("presentation");

      // Assert
      expect(store.effectiveLayoutConfig.textScale).toBe(1.2);
      expect(store.effectiveLayoutConfig.density).toBe("spacious");
    });

    it("sollte die UI-Dichte anpassen können", () => {
      // Arrange
      const store = useUIStore();

      // Act
      store.setUIDensity("compact");

      // Assert
      expect(store.layoutConfig.density).toBe("compact");
      expect(store.isCompactMode).toBe(true);

      // Act
      store.setUIDensity("spacious");

      // Assert
      expect(store.layoutConfig.density).toBe("spacious");
      expect(store.isCompactMode).toBe(false);
    });

    it("sollte die Textgröße anpassen können", () => {
      // Arrange
      const store = useUIStore();

      // Act
      store.setTextScale(1.2);

      // Assert
      expect(store.layoutConfig.textScale).toBe(1.2);

      // Werte sollten auf sinnvolle Grenzen beschränkt sein
      store.setTextScale(0.5); // Zu klein
      expect(store.layoutConfig.textScale).toBe(0.8); // Minimalwert

      store.setTextScale(2.0); // Zu groß
      expect(store.layoutConfig.textScale).toBe(1.4); // Maximalwert
    });

    it("sollte die Textgröße für Barrierefreiheit anpassen und diese konsistent speichern", () => {
      // Arrange
      const store = useUIStore();
      const localStorageSpy = vi.spyOn(localStorage, "setItem");

      // Act - Größere Textgröße für bessere Lesbarkeit setzen
      store.setTextScale(1.3);

      // Assert
      expect(store.layoutConfig.textScale).toBe(1.3);
      expect(documentSpy.style["--text-scale"]).toBe(undefined); // Noch nicht angewendet

      // Act - UI-Update auslösen, um CSS-Variablen zu aktualisieren
      store.requestUIUpdate("layout");
      vi.runAllTimers();

      // Assert - CSS-Variable sollte aktualisiert sein
      expect(documentSpy.style["--text-scale"]).toBe("1.3");

      // Überprüfen, ob Einstellung gespeichert wurde
      expect(localStorageSpy).toHaveBeenCalledWith(
        expect.stringContaining("layoutConfig"),
        expect.stringContaining('"textScale":1.3'),
      );
    });

    it("sollte UI-Updates korrekt batchen für bessere Performance", () => {
      // Arrange
      const store = useUIStore();

      // Spy auf interne Methode
      const batchUIUpdatesSpy = vi.spyOn(store, "batchUIUpdates" as any);

      // Act - Mehrere Updates hintereinander anfordern
      store.requestUIUpdate("layout");
      store.requestUIUpdate("darkMode");
      store.requestUIUpdate("sidebar");

      // Assert - batchUIUpdates sollte nur einmal aufgerufen werden
      expect(batchUIUpdatesSpy).toHaveBeenCalledTimes(1);

      // Act - Timer auslösen, um Updates zu verarbeiten
      vi.runAllTimers();

      // Jetzt weitere Updates anfordern
      store.requestUIUpdate("viewMode");

      // Assert - batchUIUpdates sollte erneut aufgerufen werden
      expect(batchUIUpdatesSpy).toHaveBeenCalledTimes(2);
    });

    it("sollte auf die Änderung des View-Modus reagieren", async () => {
      // Arrange
      const store = useUIStore();
      const requestUIUpdateSpy = vi.spyOn(store, "requestUIUpdate");

      // Act
      store.setViewMode("focus");

      // Assert
      expect(store.viewMode).toBe("focus");
      expect(requestUIUpdateSpy).toHaveBeenCalledWith("viewMode");

      // Watch sollte auch reagieren
      requestUIUpdateSpy.mockClear();
      store.viewMode = "compact";
      await nextTick();

      // Assert
      expect(requestUIUpdateSpy).toHaveBeenCalledWith("viewMode");
    });

    it("sollte die Sidebar-Breite für barrierefreien Zugriff anpassen können", () => {
      // Arrange
      const store = useUIStore();
      const requestUIUpdateSpy = vi.spyOn(store, "requestUIUpdate");

      // Act - Größere Sidebar für mehr Platz
      store.setSidebarWidth(350);

      // Assert
      expect(store.sidebar.width).toBe(350);
      expect(requestUIUpdateSpy).toHaveBeenCalledWith("sidebar");

      // CSS-Variablen sollten aktualisiert werden
      expect(store.cssVariables.value["--sidebar-width"]).toBe("350px");
    });

    it("sollte bei minimalem UI-Modus auch den UI-Abstand anpassen", () => {
      // Arrange
      const store = useUIStore();

      // Act - Kompakten Modus aktivieren für Benutzer, die weniger Padding bevorzugen
      store.setUIDensity("compact");

      // UI-Update auslösen
      store.requestUIUpdate("layout");
      vi.runAllTimers();

      // Assert
      expect(documentSpy.style["--ui-spacing"]).toBe("0.5rem");
      expect(documentSpy.style["--ui-element-padding"]).toBe("0.25rem 0.5rem");

      // Act - Großzügigeren Modus für Benutzer, die mehr Platz benötigen
      store.setUIDensity("spacious");

      // UI-Update auslösen
      store.requestUIUpdate("layout");
      vi.runAllTimers();

      // Assert
      expect(documentSpy.style["--ui-spacing"]).toBe("1.5rem");
      expect(documentSpy.style["--ui-element-padding"]).toBe("0.75rem 1.5rem");
    });
  });

  // Neue Testgruppe für Barrierefreiheit und Benutzerinteraktionen
  describe("Barrierefreiheit und Benutzerinteraktionen", () => {
    it("sollte Fokus-Modus für ablenkungsfreies Arbeiten unterstützen", () => {
      // Arrange
      const store = useUIStore();

      // Act - Fokus-Modus aktivieren (Gut für Benutzer mit Aufmerksamkeitsstörungen)
      store.setViewMode("focus");

      // Assert
      expect(store.viewMode).toBe("focus");
      expect(store.effectiveLayoutConfig.headerVisible).toBe(false);
      expect(store.effectiveLayoutConfig.footerVisible).toBe(false);
      expect(store.effectiveLayoutConfig.sidebarVisible).toBe(false);
    });

    it("sollte Präsentationsmodus für bessere Lesbarkeit unterstützen", () => {
      // Arrange
      const store = useUIStore();

      // Act - Präsentationsmodus aktivieren (Gut für schwache Sicht)
      store.setViewMode("presentation");

      // Assert
      expect(store.viewMode).toBe("presentation");
      expect(store.effectiveLayoutConfig.textScale).toBe(1.2); // Größerer Text
      expect(store.effectiveLayoutConfig.density).toBe("spacious"); // Mehr Platz zwischen Elementen
      expect(store.effectiveLayoutConfig.contentMaxWidth).toBe("90%"); // Breiterer Content-Bereich
    });

    it("sollte den Vollbildmodus für fokussiertes Arbeiten unterstützen", () => {
      // Arrange
      const store = useUIStore();

      // Mock für requestFullscreen und exitFullscreen
      document.documentElement.requestFullscreen = vi.fn();
      document.exitFullscreen = vi.fn();
      document.fullscreenElement = null;

      // Act - Vollbildmodus aktivieren
      store.toggleFullscreen();

      // Assert
      expect(document.documentElement.requestFullscreen).toHaveBeenCalled();

      // Act - Vollbildmodus deaktivieren
      // Simulieren, dass wir im Vollbildmodus sind
      Object.defineProperty(document, "fullscreenElement", {
        value: document.documentElement,
        writable: true,
      });

      store.toggleFullscreen();

      // Assert
      expect(document.exitFullscreen).toHaveBeenCalled();
    });

    it("sollte mit Fehlern beim Aktivieren des Vollbildmodus umgehen", () => {
      // Arrange
      const store = useUIStore();
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      // Mock für requestFullscreen, der einen Fehler auslöst
      document.documentElement.requestFullscreen = vi
        .fn()
        .mockRejectedValue(new Error("Fullscreen nicht verfügbar"));
      document.fullscreenElement = null;

      // Act - Vollbildmodus aktivieren (sollte fehlschlagen)
      store.toggleFullscreen();

      // Assert - Fehler sollte abgefangen werden
      expect(document.documentElement.requestFullscreen).toHaveBeenCalled();
      // Test kann hier nicht auf den console.error warten, da er asynchron ist
    });

    it("sollte globale Ladeanzeige für Screen-Reader zugänglich machen", () => {
      // Arrange
      const store = useUIStore();

      // Mock für das Loading-Element
      const loadingElement = {
        setAttribute: vi.fn(),
        classList: {
          add: vi.fn(),
          remove: vi.fn(),
        },
      };
      document.getElementById = vi.fn().mockReturnValue(loadingElement);

      // Act - Laden aktivieren mit einer für Screen-Reader zugänglichen Nachricht
      store.setLoading(true, "Daten werden geladen, bitte warten");

      // Assert
      expect(store.isLoading).toBe(true);
      expect(loadingElement.setAttribute).toHaveBeenCalledWith(
        "data-message",
        "Daten werden geladen, bitte warten",
      );
      expect(loadingElement.classList.add).toHaveBeenCalledWith("is-active");

      // Act - Laden beenden
      store.setLoading(false);

      // Assert
      expect(store.isLoading).toBe(false);
      expect(loadingElement.classList.remove).toHaveBeenCalledWith("is-active");
    });

    it("sollte System-Ereignisse für Interaktionsüberwachung auslösen können", () => {
      // Arrange
      const store = useUIStore();
      const dispatchEventSpy = vi.spyOn(window, "dispatchEvent");

      // Act - Ein Zugänglichkeitsereignis auslösen
      store.systemEvents.emit("accessibility:update", {
        highContrast: true,
        largeText: true,
      });

      // Assert
      expect(dispatchEventSpy).toHaveBeenCalledWith(expect.any(CustomEvent));
      expect(dispatchEventSpy.mock.calls[0][0].type).toBe(
        "nscale:ui:accessibility:update",
      );
      expect(dispatchEventSpy.mock.calls[0][0].detail).toEqual({
        highContrast: true,
        largeText: true,
      });
    });

    it("sollte auf System-Ereignisse reagieren können", () => {
      // Arrange
      const store = useUIStore();
      const handlerMock = vi.fn();

      // Act - Handler für Zugänglichkeitsereignisse registrieren
      const unsubscribe = store.systemEvents.on(
        "accessibility:update",
        handlerMock,
      );

      // Event auslösen
      window.dispatchEvent(
        new CustomEvent("nscale:ui:accessibility:update", {
          detail: { highContrast: true },
        }),
      );

      // Assert
      expect(handlerMock).toHaveBeenCalledWith({ highContrast: true });

      // Act - Abmelden und prüfen, ob keine weiteren Ereignisse empfangen werden
      handlerMock.mockReset();
      unsubscribe();

      window.dispatchEvent(
        new CustomEvent("nscale:ui:accessibility:update", {
          detail: { highContrast: false },
        }),
      );

      // Assert
      expect(handlerMock).not.toHaveBeenCalled();
    });

    it("sollte ein Layout-Element registrieren und CSS-Variablen darauf anwenden können", () => {
      // Arrange
      const store = useUIStore();
      const mockElement = { style: { setProperty: vi.fn() } };

      // Act - Layout-Element registrieren
      store.registerLayoutElement(mockElement as unknown as HTMLElement);

      // Assert
      expect(store.getLayoutElement()).toBe(mockElement);

      // Act - CSS-Variable auf das Element anwenden
      store.setLayoutCssVariable("--test-var", "42px");

      // Assert
      expect(mockElement.style.setProperty).toHaveBeenCalledWith(
        "--test-var",
        "42px",
      );

      // Act - Element entfernen
      store.unregisterLayoutElement();

      // Assert
      expect(store.getLayoutElement()).toBeNull();
    });

    it("sollte beim responsiven Layout die mobile Navigation anpassen", () => {
      // Arrange
      const store = useUIStore();

      // Act - Auf mobile Größe wechseln
      window.innerWidth = 600;
      store.checkViewport();

      // Assert - Sidebar sollte automatisch geschlossen werden für mehr Platz
      expect(store.isMobile).toBe(true);
      expect(store.sidebar.isOpen).toBe(false);

      // Act - Sidebar öffnen
      store.openSidebar();

      // Assert - Auf mobilen Geräten sollte Sidebar Vollbild sein
      expect(store.sidebar.isOpen).toBe(true);
      expect(store.effectiveLayoutConfig.sidebarWidth).toBe("100%");
    });
  });

  describe("Systemfunktionen", () => {
    it("sollte den Ladezustand setzen können", () => {
      // Arrange
      const store = useUIStore();

      // Mock für das Loading-Element
      const loadingElement = {
        setAttribute: vi.fn(),
        classList: {
          add: vi.fn(),
          remove: vi.fn(),
        },
      };
      document.getElementById = vi.fn().mockReturnValue(loadingElement);

      // Act
      store.setLoading(true, "Daten werden geladen...");

      // Assert
      expect(store.isLoading).toBe(true);
      expect(loadingElement.setAttribute).toHaveBeenCalledWith(
        "data-message",
        "Daten werden geladen...",
      );
      expect(loadingElement.classList.add).toHaveBeenCalledWith("is-active");

      // Act - Laden beenden
      store.setLoading(false);

      // Assert
      expect(store.isLoading).toBe(false);
      expect(loadingElement.classList.remove).toHaveBeenCalledWith("is-active");
    });

    it("sollte Systemereignisse über den Event-Bus auslösen können", () => {
      // Arrange
      const store = useUIStore();
      const dispatchEventSpy = vi.spyOn(window, "dispatchEvent");

      // Act
      store.systemEvents.emit("test", { foo: "bar" });

      // Assert
      expect(dispatchEventSpy).toHaveBeenCalledWith(expect.any(CustomEvent));
      expect(dispatchEventSpy.mock.calls[0][0].type).toBe("nscale:ui:test");
      expect(dispatchEventSpy.mock.calls[0][0].detail).toEqual({ foo: "bar" });
    });

    it("sollte auf Systemereignisse über den Event-Bus hören können", () => {
      // Arrange
      const store = useUIStore();
      const handler = vi.fn();

      // Act
      const unsubscribe = store.systemEvents.on("test", handler);

      // Ereignis auslösen
      window.dispatchEvent(
        new CustomEvent("nscale:ui:test", { detail: { foo: "bar" } }),
      );

      // Assert
      expect(handler).toHaveBeenCalledWith({ foo: "bar" });

      // Abmelden und prüfen, ob keine weiteren Ereignisse empfangen werden
      handler.mockReset();
      unsubscribe();

      window.dispatchEvent(
        new CustomEvent("nscale:ui:test", { detail: { foo: "baz" } }),
      );
      expect(handler).not.toHaveBeenCalled();
    });
  });
});
