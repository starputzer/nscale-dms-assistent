import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useUIStore } from '../../src/stores/ui';
import { nextTick } from 'vue';
import { mockDate, waitForPromises } from './__setup__/testSetup';

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
describe('UI Store', () => {
  let documentSpy: { style: Record<string, any> };
  let documentClassListSpy: { add: vi.Mock, remove: vi.Mock, contains: vi.Mock };
  let mediaQueryListSpy: { matches: boolean, addEventListener: vi.Mock, removeEventListener: vi.Mock };
  
  beforeEach(() => {
    // Mock für document.documentElement.style
    documentSpy = {
      style: {}
    };
    
    // Mock für document.documentElement.classList
    documentClassListSpy = {
      add: vi.fn(),
      remove: vi.fn(),
      contains: vi.fn().mockReturnValue(false)
    };
    
    // Mock für window.matchMedia
    mediaQueryListSpy = {
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    };
    
    // Mocks für DOM-APIs
    vi.spyOn(document, 'documentElement', 'get').mockReturnValue(documentSpy as any);
    vi.spyOn(document.documentElement, 'classList', 'get').mockReturnValue(documentClassListSpy as any);
    vi.spyOn(document.documentElement, 'setAttribute').mockImplementation((attr, value) => {});
    vi.spyOn(window, 'matchMedia').mockReturnValue(mediaQueryListSpy as any);
    
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
  
  describe('Initialisierung', () => {
    it('sollte mit korrekten Standardwerten initialisiert werden', () => {
      // Arrange & Act
      const store = useUIStore();
      
      // Assert
      expect(store.sidebar.isOpen).toBe(true);
      expect(store.sidebar.width).toBe(280);
      expect(store.darkMode).toBe(false);
      expect(store.viewMode).toBe('default');
      expect(store.activeModals).toEqual([]);
      expect(store.toasts).toEqual([]);
      expect(store.isLoading).toBe(false);
      expect(store.isMobile).toBe(false);
    });
    
    it('sollte Legacy-Daten aus dem localStorage migrieren', () => {
      // Arrange
      localStorage.setItem('nscale_darkMode', 'true');
      localStorage.setItem('nscale_sidebarWidth', '300');
      localStorage.setItem('nscale_sidebarOpen', 'false');
      localStorage.setItem('nscale_viewMode', 'compact');
      
      // Act
      const store = useUIStore();
      store.migrateFromLegacyStorage();
      
      // Assert
      expect(store.darkMode).toBe(true);
      expect(store.sidebar.width).toBe(300);
      expect(store.sidebar.isOpen).toBe(false);
      expect(store.viewMode).toBe('compact');
    });
    
    it('sollte den Dark Mode basierend auf Systemeinstellungen initialisieren', () => {
      // Arrange
      // System bevorzugt Dark Mode
      mediaQueryListSpy.matches = true;
      
      // Act
      const store = useUIStore();
      
      // Assert
      expect(store.darkMode).toBe(true);
      
      // Dark Mode sollte auf dem System angewendet werden
      expect(documentClassListSpy.add).toHaveBeenCalledWith('dark');
      expect(document.documentElement.setAttribute).toHaveBeenCalledWith('data-theme', 'dark');
    });
  });
  
  describe('Dark Mode', () => {
    it('sollte den Dark Mode umschalten können', () => {
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
      expect(documentClassListSpy.add).toHaveBeenCalledWith('dark');
    });
    
    it('sollte den Dark Mode explizit aktivieren können', () => {
      // Arrange
      const store = useUIStore();
      
      // Act
      store.enableDarkMode();
      
      // Assert
      expect(store.darkMode).toBe(true);
      
      // UI-Update ausführen
      vi.runAllTimers();
      
      // Dark Mode sollte auf dem System angewendet werden
      expect(documentClassListSpy.add).toHaveBeenCalledWith('dark');
    });
    
    it('sollte den Dark Mode explizit deaktivieren können', () => {
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
      expect(documentClassListSpy.remove).toHaveBeenCalledWith('dark');
    });
    
    it('sollte Änderungen am Dark Mode im localStorage speichern', async () => {
      // Arrange
      const store = useUIStore();
      const localStorageSpy = vi.spyOn(localStorage, 'setItem');
      
      // Act
      store.toggleDarkMode();
      await nextTick();
      
      // Assert
      expect(localStorageSpy).toHaveBeenCalledWith(expect.any(String), 'true');
    });
  });
  
  describe('Sidebar', () => {
    it('sollte die Sidebar öffnen können', () => {
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
    
    it('sollte die Sidebar schließen können', () => {
      // Arrange
      const store = useUIStore();
      store.sidebar.isOpen = true;
      
      // Act
      store.closeSidebar();
      
      // Assert
      expect(store.sidebar.isOpen).toBe(false);
      expect(store.sidebarIsOpen).toBe(false);
    });
    
    it('sollte die Sidebar umschalten können', () => {
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
    
    it('sollte die Sidebar minimieren/maximieren können', () => {
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
    
    it('sollte die Sidebar-Breite ändern können', () => {
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
    
    it('sollte den aktiven Sidebar-Tab ändern können', () => {
      // Arrange
      const store = useUIStore();
      store.sidebar.activeTab = null;
      
      // Act
      store.setSidebarTab('settings');
      
      // Assert
      expect(store.sidebar.activeTab).toBe('settings');
      
      // Sollte die Sidebar öffnen, wenn sie geschlossen ist
      store.sidebar.isOpen = false;
      store.setSidebarTab('chat');
      expect(store.sidebar.isOpen).toBe(true);
      expect(store.sidebar.activeTab).toBe('chat');
    });
  });
  
  describe('Modale Dialoge', () => {
    it('sollte ein Modal öffnen können', () => {
      // Arrange
      const store = useUIStore();
      
      // Act
      const modalId = store.openModal({
        component: 'TestModal',
        title: 'Test-Modal',
        props: { test: true }
      });
      
      // Assert
      expect(modalId).toEqual(expect.any(String));
      expect(store.activeModals).toHaveLength(1);
      expect(store.activeModals[0].component).toBe('TestModal');
      expect(store.activeModals[0].title).toBe('Test-Modal');
      expect(store.activeModals[0].props).toEqual({ test: true });
      expect(store.hasActiveModals).toBe(true);
    });
    
    it('sollte ein Modal schließen können', () => {
      // Arrange
      const store = useUIStore();
      const modalId = store.openModal({
        component: 'TestModal'
      });
      
      // Act
      store.closeModal(modalId);
      
      // Assert
      expect(store.activeModals).toHaveLength(0);
      expect(store.hasActiveModals).toBe(false);
    });
    
    it('sollte alle Modals schließen können', () => {
      // Arrange
      const store = useUIStore();
      store.openModal({ component: 'Modal1' });
      store.openModal({ component: 'Modal2' });
      store.openModal({ component: 'Modal3' });
      
      // Act
      store.closeAllModals();
      
      // Assert
      expect(store.activeModals).toHaveLength(0);
    });
    
    it('sollte eine Bestätigungsdialog anzeigen können', async () => {
      // Arrange
      const store = useUIStore();
      const modalSpy = vi.spyOn(store, 'openModal');
      
      // Act - Bestätigung akzeptieren
      const confirmPromise = store.confirm('Sind Sie sicher?', {
        title: 'Bestätigung',
        confirmText: 'Ja',
        cancelText: 'Nein',
        variant: 'warning'
      });
      
      // Bestätigung simulieren
      const modalId = modalSpy.mock.calls[0][0].id;
      const confirmFn = modalSpy.mock.calls[0][0].props.onConfirm;
      confirmFn();
      
      // Assert
      const result = await confirmPromise;
      expect(result).toBe(true);
      
      // Modal sollte geöffnet und richtig konfiguriert worden sein
      expect(modalSpy).toHaveBeenCalledWith(expect.objectContaining({
        component: 'ConfirmDialog',
        title: 'Bestätigung',
        props: expect.objectContaining({
          message: 'Sind Sie sicher?',
          confirmText: 'Ja',
          cancelText: 'Nein',
          variant: 'warning'
        })
      }));
    });
    
    it('sollte false zurückgeben, wenn der Bestätigungsdialog abgebrochen wird', async () => {
      // Arrange
      const store = useUIStore();
      const modalSpy = vi.spyOn(store, 'openModal');
      
      // Act - Bestätigung ablehnen
      const confirmPromise = store.confirm('Sind Sie sicher?');
      
      // Ablehnung simulieren
      const modalId = modalSpy.mock.calls[0][0].id;
      const cancelFn = modalSpy.mock.calls[0][0].props.onCancel;
      cancelFn();
      
      // Assert
      const result = await confirmPromise;
      expect(result).toBe(false);
    });
    
    it('sollte einen Eingabedialog anzeigen können', async () => {
      // Arrange
      const store = useUIStore();
      const modalSpy = vi.spyOn(store, 'openModal');
      
      // Act - Eingabedialog mit Wert bestätigen
      const promptPromise = store.prompt('Geben Sie einen Wert ein:', {
        title: 'Eingabe',
        defaultValue: 'Standardwert'
      });
      
      // Bestätigung simulieren
      const modalId = modalSpy.mock.calls[0][0].id;
      const confirmFn = modalSpy.mock.calls[0][0].props.onConfirm;
      confirmFn('Eingabewert');
      
      // Assert
      const result = await promptPromise;
      expect(result).toBe('Eingabewert');
      
      // Modal sollte geöffnet und richtig konfiguriert worden sein
      expect(modalSpy).toHaveBeenCalledWith(expect.objectContaining({
        component: 'PromptDialog',
        title: 'Eingabe',
        props: expect.objectContaining({
          message: 'Geben Sie einen Wert ein:',
          defaultValue: 'Standardwert'
        })
      }));
    });
    
    it('sollte null zurückgeben, wenn der Eingabedialog abgebrochen wird', async () => {
      // Arrange
      const store = useUIStore();
      const modalSpy = vi.spyOn(store, 'openModal');
      
      // Act - Eingabedialog abbrechen
      const promptPromise = store.prompt('Geben Sie einen Wert ein:');
      
      // Ablehnung simulieren
      const modalId = modalSpy.mock.calls[0][0].id;
      const cancelFn = modalSpy.mock.calls[0][0].props.onCancel;
      cancelFn();
      
      // Assert
      const result = await promptPromise;
      expect(result).toBeNull();
    });
  });
  
  describe('Toast-Benachrichtigungen', () => {
    it('sollte einen Toast anzeigen können', () => {
      // Arrange
      const store = useUIStore();
      
      // Act
      const toastId = store.showToast({
        type: 'success',
        message: 'Operation erfolgreich',
        duration: 3000
      });
      
      // Assert
      expect(toastId).toEqual(expect.any(String));
      expect(store.toasts).toHaveLength(1);
      expect(store.toasts[0].type).toBe('success');
      expect(store.toasts[0].message).toBe('Operation erfolgreich');
      expect(store.toasts[0].duration).toBe(3000);
    });
    
    it('sollte einen Toast nach Ablauf der Zeit automatisch entfernen', () => {
      // Arrange
      const store = useUIStore();
      
      // Act
      const toastId = store.showToast({
        type: 'info',
        message: 'Kurzlebige Nachricht',
        duration: 1000
      });
      
      // Timer voranschreiten lassen
      vi.advanceTimersByTime(1000);
      
      // Assert
      expect(store.toasts).toHaveLength(0);
    });
    
    it('sollte einen Toast manuell entfernen können', () => {
      // Arrange
      const store = useUIStore();
      const toastId = store.showToast({
        type: 'warning',
        message: 'Warnung'
      });
      
      // Mock für DOM-Element
      document.getElementById = vi.fn().mockReturnValue({
        classList: {
          add: vi.fn()
        }
      });
      
      // Act
      store.dismissToast(toastId);
      
      // Animation abwarten
      vi.advanceTimersByTime(300);
      
      // Assert
      expect(store.toasts).toHaveLength(0);
    });
    
    it('sollte verschiedene Toast-Typen unterstützen', () => {
      // Arrange
      const store = useUIStore();
      
      // Act
      const successId = store.showSuccess('Erfolg');
      const errorId = store.showError('Fehler');
      const warningId = store.showWarning('Warnung');
      const infoId = store.showInfo('Information');
      
      // Assert
      expect(store.toasts).toHaveLength(4);
      
      // Erfolg
      const successToast = store.toasts.find(t => t.id === successId);
      expect(successToast).toBeDefined();
      expect(successToast!.type).toBe('success');
      expect(successToast!.message).toBe('Erfolg');
      
      // Fehler (sollte längere Anzeigedauer haben)
      const errorToast = store.toasts.find(t => t.id === errorId);
      expect(errorToast).toBeDefined();
      expect(errorToast!.type).toBe('error');
      expect(errorToast!.duration).toBe(8000);
      
      // Warnung
      const warningToast = store.toasts.find(t => t.id === warningId);
      expect(warningToast).toBeDefined();
      expect(warningToast!.type).toBe('warning');
      
      // Information
      const infoToast = store.toasts.find(t => t.id === infoId);
      expect(infoToast).toBeDefined();
      expect(infoToast!.type).toBe('info');
    });
    
    it('sollte die Anzahl der gleichzeitigen Toasts begrenzen', () => {
      // Arrange
      const store = useUIStore();
      
      // Act - 6 Toasts erstellen (Limit ist 5)
      for (let i = 0; i < 6; i++) {
        store.showToast({
          type: 'info',
          message: `Toast ${i + 1}`
        });
      }
      
      // Assert
      expect(store.toasts).toHaveLength(5);
      expect(store.toasts[0].message).toBe('Toast 2'); // Der erste Toast sollte entfernt worden sein
    });
  });
  
  describe('Layout und Responsive Design', () => {
    it('sollte die Viewport-Größe erkennen und entsprechend reagieren', () => {
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
    
    it('sollte CSS-Variablen basierend auf der Konfiguration generieren', () => {
      // Arrange
      const store = useUIStore();
      
      // Act - Verschiedene Konfigurationen testen
      store.sidebar.width = 300;
      store.layoutConfig.density = 'compact';
      store.layoutConfig.textScale = 1.2;
      
      // UI-Update auslösen
      store.requestUIUpdate('layout');
      vi.runAllTimers();
      
      // Assert - CSS-Variablen sollten gesetzt sein
      expect(documentSpy.style['--sidebar-width']).toBe('300px');
      expect(documentSpy.style['--text-scale']).toBe('1.2');
      expect(documentSpy.style['--ui-spacing']).toBe('0.5rem'); // Für kompaktes Layout
    });
    
    it('sollte effektive Layout-Konfigurationen basierend auf dem Viewport und View-Modus berechnen', () => {
      // Arrange
      const store = useUIStore();
      
      // Act - Mobile Ansicht
      window.innerWidth = 600;
      store.checkViewport();
      
      // Assert
      expect(store.effectiveLayoutConfig.sidebarWidth).toBe('100%');
      expect(store.effectiveLayoutConfig.contentMaxWidth).toBe('100%');
      expect(store.effectiveLayoutConfig.splitPaneEnabled).toBe(false);
      
      // Act - Fokus-Modus
      window.innerWidth = 1024; // Zurück zum Desktop
      store.checkViewport();
      store.setViewMode('focus');
      
      // Assert
      expect(store.effectiveLayoutConfig.headerVisible).toBe(false);
      expect(store.effectiveLayoutConfig.footerVisible).toBe(false);
      
      // Act - Kompakter Modus
      store.setViewMode('compact');
      
      // Assert
      expect(store.effectiveLayoutConfig.density).toBe('compact');
      expect(store.effectiveLayoutConfig.textScale).toBe(0.9);
      
      // Act - Präsentationsmodus
      store.setViewMode('presentation');
      
      // Assert
      expect(store.effectiveLayoutConfig.textScale).toBe(1.2);
      expect(store.effectiveLayoutConfig.density).toBe('spacious');
    });
    
    it('sollte die UI-Dichte anpassen können', () => {
      // Arrange
      const store = useUIStore();
      
      // Act
      store.setUIDensity('compact');
      
      // Assert
      expect(store.layoutConfig.density).toBe('compact');
      expect(store.isCompactMode).toBe(true);
      
      // Act
      store.setUIDensity('spacious');
      
      // Assert
      expect(store.layoutConfig.density).toBe('spacious');
      expect(store.isCompactMode).toBe(false);
    });
    
    it('sollte die Textgröße anpassen können', () => {
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
  });
  
  describe('Systemfunktionen', () => {
    it('sollte den Ladezustand setzen können', () => {
      // Arrange
      const store = useUIStore();
      
      // Mock für das Loading-Element
      const loadingElement = {
        setAttribute: vi.fn(),
        classList: {
          add: vi.fn(),
          remove: vi.fn()
        }
      };
      document.getElementById = vi.fn().mockReturnValue(loadingElement);
      
      // Act
      store.setLoading(true, 'Daten werden geladen...');
      
      // Assert
      expect(store.isLoading).toBe(true);
      expect(loadingElement.setAttribute).toHaveBeenCalledWith('data-message', 'Daten werden geladen...');
      expect(loadingElement.classList.add).toHaveBeenCalledWith('is-active');
      
      // Act - Laden beenden
      store.setLoading(false);
      
      // Assert
      expect(store.isLoading).toBe(false);
      expect(loadingElement.classList.remove).toHaveBeenCalledWith('is-active');
    });
    
    it('sollte Systemereignisse über den Event-Bus auslösen können', () => {
      // Arrange
      const store = useUIStore();
      const dispatchEventSpy = vi.spyOn(window, 'dispatchEvent');
      
      // Act
      store.systemEvents.emit('test', { foo: 'bar' });
      
      // Assert
      expect(dispatchEventSpy).toHaveBeenCalledWith(expect.any(CustomEvent));
      expect(dispatchEventSpy.mock.calls[0][0].type).toBe('nscale:ui:test');
      expect(dispatchEventSpy.mock.calls[0][0].detail).toEqual({ foo: 'bar' });
    });
    
    it('sollte auf Systemereignisse über den Event-Bus hören können', () => {
      // Arrange
      const store = useUIStore();
      const handler = vi.fn();
      
      // Act
      const unsubscribe = store.systemEvents.on('test', handler);
      
      // Ereignis auslösen
      window.dispatchEvent(new CustomEvent('nscale:ui:test', { detail: { foo: 'bar' } }));
      
      // Assert
      expect(handler).toHaveBeenCalledWith({ foo: 'bar' });
      
      // Abmelden und prüfen, ob keine weiteren Ereignisse empfangen werden
      handler.mockReset();
      unsubscribe();
      
      window.dispatchEvent(new CustomEvent('nscale:ui:test', { detail: { foo: 'baz' } }));
      expect(handler).not.toHaveBeenCalled();
    });
  });
});