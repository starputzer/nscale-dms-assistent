import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import NotificationSettings from '@/components/settings/NotificationSettings.vue';
import { useSettingsStore } from '@/stores/settings';
import type { NotificationSettings as NotificationSettingsType } from '@/types/settings';

// Mock für i18n
vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key
  })
}));

// Mock für Notification API
const mockNotification = vi.fn();
vi.stubGlobal('Notification', {
  permission: 'default',
  requestPermission: vi.fn().mockResolvedValue('granted'),
  ...mockNotification
});

// Mock für Audio
const mockAudio = {
  play: vi.fn().mockResolvedValue(undefined)
};
vi.stubGlobal('Audio', vi.fn().mockImplementation(() => mockAudio));

// Hilfsfunktion zum Erstellen eines Wrapper mit Standard-Konfiguration
function createWrapper() {
  return mount(NotificationSettings, {
    global: {
      plugins: [createPinia()]
    }
  });
}

describe('NotificationSettings.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    
    // Standard-Benachrichtigungs-Berechtigung setzen
    Object.defineProperty(Notification, 'permission', {
      value: 'default',
      writable: true
    });
  });

  describe('Rendering', () => {
    it('rendert die Komponente korrekt', () => {
      const wrapper = createWrapper();
      expect(wrapper.find('.notification-settings').exists()).toBe(true);
      expect(wrapper.find('.notification-settings__title').text()).toBe('settings.notifications.title');
    });

    it('zeigt den Master-Toggle für Benachrichtigungen an', () => {
      const wrapper = createWrapper();
      const enabledToggle = wrapper.find('#notifications-enabled');
      
      expect(enabledToggle.exists()).toBe(true);
    });

    it('blendet Benachrichtigungskanäle aus, wenn Benachrichtigungen deaktiviert sind', async () => {
      const wrapper = createWrapper();
      const store = useSettingsStore();
      
      // Benachrichtigungen deaktivieren
      await wrapper.find('#notifications-enabled').setValue(false);
      await wrapper.find('#notifications-enabled').trigger('change');
      
      // Prüfe, ob die Kanäle-Sektion ausgeblendet ist
      expect(wrapper.find('.notification-settings__section:nth-child(2)').exists()).toBe(false);
    });

    it('zeigt Benachrichtigungskanäle an, wenn Benachrichtigungen aktiviert sind', async () => {
      const wrapper = createWrapper();
      
      // Stellen Sie sicher, dass Benachrichtigungen aktiviert sind
      const enabledToggle = wrapper.find('#notifications-enabled');
      if (!(enabledToggle.element as HTMLInputElement).checked) {
        await enabledToggle.setValue(true);
        await enabledToggle.trigger('change');
      }
      
      // Prüfe, ob die Kanäle-Sektion angezeigt wird
      expect(wrapper.find('.notification-settings__section:nth-child(2)').exists()).toBe(true);
      expect(wrapper.find('#notifications-sound').exists()).toBe(true);
      expect(wrapper.find('#notifications-desktop').exists()).toBe(true);
    });

    it('zeigt Benachrichtigungsereignisse an, wenn Benachrichtigungen aktiviert sind', async () => {
      const wrapper = createWrapper();
      
      // Stellen Sie sicher, dass Benachrichtigungen aktiviert sind
      const enabledToggle = wrapper.find('#notifications-enabled');
      if (!(enabledToggle.element as HTMLInputElement).checked) {
        await enabledToggle.setValue(true);
        await enabledToggle.trigger('change');
      }
      
      // Prüfe, ob die Ereignisse-Sektion angezeigt wird
      expect(wrapper.find('.notification-settings__section:nth-child(3)').exists()).toBe(true);
      expect(wrapper.find('#notifications-session-completion').exists()).toBe(true);
      expect(wrapper.find('#notifications-mentions').exists()).toBe(true);
    });

    it('zeigt den Test-Bereich an, wenn Benachrichtigungen aktiviert sind', async () => {
      const wrapper = createWrapper();
      
      // Stellen Sie sicher, dass Benachrichtigungen aktiviert sind
      const enabledToggle = wrapper.find('#notifications-enabled');
      if (!(enabledToggle.element as HTMLInputElement).checked) {
        await enabledToggle.setValue(true);
        await enabledToggle.trigger('change');
      }
      
      // Prüfe, ob der Test-Bereich angezeigt wird
      expect(wrapper.find('.notification-settings__test-section').exists()).toBe(true);
      expect(wrapper.find('.notification-settings__test-button').exists()).toBe(true);
    });
  });

  describe('Interaktionen', () => {
    it('aktualisiert die Einstellungen beim Ändern des Master-Toggles', async () => {
      const wrapper = createWrapper();
      const store = useSettingsStore();
      
      // Setze einen Spy auf updateSettings
      const updateSettingsSpy = vi.spyOn(wrapper.vm, 'updateSettings');
      
      // Ändere den Master-Toggle
      await wrapper.find('#notifications-enabled').setValue(false);
      await wrapper.find('#notifications-enabled').trigger('change');
      
      // Prüfe, ob updateSettings aufgerufen wurde
      expect(updateSettingsSpy).toHaveBeenCalled();
      
      // Prüfe, ob 'apply-settings' emittiert wurde
      expect(wrapper.emitted('apply-settings')).toBeTruthy();
      expect(wrapper.emitted('apply-settings')![0][0]).toBe('notifications');
      expect(wrapper.emitted('apply-settings')![0][1]).toHaveProperty('enabled', false);
    });

    it('aktualisiert die Einstellungen beim Ändern der Sound-Option', async () => {
      const wrapper = createWrapper();
      
      // Stellen Sie sicher, dass Benachrichtigungen aktiviert sind
      const enabledToggle = wrapper.find('#notifications-enabled');
      if (!(enabledToggle.element as HTMLInputElement).checked) {
        await enabledToggle.setValue(true);
        await enabledToggle.trigger('change');
      }
      
      // Setze einen Spy auf updateSettings
      const updateSettingsSpy = vi.spyOn(wrapper.vm, 'updateSettings');
      
      // Ändere die Sound-Option
      await wrapper.find('#notifications-sound').setValue(false);
      await wrapper.find('#notifications-sound').trigger('change');
      
      // Prüfe, ob updateSettings aufgerufen wurde
      expect(updateSettingsSpy).toHaveBeenCalled();
      
      // Prüfe, ob 'apply-settings' emittiert wurde
      expect(wrapper.emitted('apply-settings')).toBeTruthy();
      
      // Suche nach dem Event für Sound-Änderung
      const events = wrapper.emitted('apply-settings')!;
      let soundChanged = false;
      
      for (const event of events) {
        if (event[0] === 'notifications' && event[1].sound === false) {
          soundChanged = true;
          break;
        }
      }
      
      expect(soundChanged).toBe(true);
    });

    it('fordert Berechtigungen an, wenn Desktop-Benachrichtigungen aktiviert werden', async () => {
      const wrapper = createWrapper();
      
      // Stellen Sie sicher, dass Benachrichtigungen aktiviert sind
      const enabledToggle = wrapper.find('#notifications-enabled');
      if (!(enabledToggle.element as HTMLInputElement).checked) {
        await enabledToggle.setValue(true);
        await enabledToggle.trigger('change');
      }
      
      // Setze einen Spy auf requestPermission
      const requestPermissionSpy = vi.spyOn(wrapper.vm, 'requestPermission');
      
      // Aktiviere Desktop-Benachrichtigungen
      await wrapper.find('#notifications-desktop').setValue(true);
      await wrapper.find('#notifications-desktop').trigger('change');
      
      // Prüfe, ob requestPermission aufgerufen wurde
      expect(requestPermissionSpy).toHaveBeenCalled();
    });

    it('zeigt einen Berechtigungsbutton an, wenn Berechtigungen nicht erteilt wurden', async () => {
      // Setze die Berechtigung auf 'denied'
      Object.defineProperty(Notification, 'permission', {
        value: 'denied',
        writable: true
      });
      
      const wrapper = createWrapper();
      
      // Stellen Sie sicher, dass Benachrichtigungen aktiviert sind
      const enabledToggle = wrapper.find('#notifications-enabled');
      if (!(enabledToggle.element as HTMLInputElement).checked) {
        await enabledToggle.setValue(true);
        await enabledToggle.trigger('change');
      }
      
      // Aktiviere Desktop-Benachrichtigungen
      await wrapper.find('#notifications-desktop').setValue(true);
      await wrapper.find('#notifications-desktop').trigger('change');
      
      // Prüfe, ob der Berechtigungsbutton angezeigt wird
      expect(wrapper.find('.notification-settings__permission-button').exists()).toBe(true);
    });

    it('aktualisiert die Einstellungen beim Ändern der Ereignis-Optionen', async () => {
      const wrapper = createWrapper();
      
      // Stellen Sie sicher, dass Benachrichtigungen aktiviert sind
      const enabledToggle = wrapper.find('#notifications-enabled');
      if (!(enabledToggle.element as HTMLInputElement).checked) {
        await enabledToggle.setValue(true);
        await enabledToggle.trigger('change');
      }
      
      // Setze einen Spy auf updateSettings
      const updateSettingsSpy = vi.spyOn(wrapper.vm, 'updateSettings');
      
      // Ändere die Session-Completion-Option
      await wrapper.find('#notifications-session-completion').setValue(false);
      await wrapper.find('#notifications-session-completion').trigger('change');
      
      // Prüfe, ob updateSettings aufgerufen wurde
      expect(updateSettingsSpy).toHaveBeenCalled();
      
      // Prüfe, ob 'apply-settings' emittiert wurde
      expect(wrapper.emitted('apply-settings')).toBeTruthy();
      
      // Suche nach dem Event für Session-Completion-Änderung
      const events = wrapper.emitted('apply-settings')!;
      let sessionCompletionChanged = false;
      
      for (const event of events) {
        if (event[0] === 'notifications' && event[1].sessionCompletion === false) {
          sessionCompletionChanged = true;
          break;
        }
      }
      
      expect(sessionCompletionChanged).toBe(true);
    });
  });

  describe('Testbenachrichtigungen', () => {
    it('sendet eine Testbenachrichtigung, wenn der Test-Button geklickt wird', async () => {
      // Mock für Notification-Konstruktor setzen
      const mockNotificationInstance = {
        onclick: null,
        close: vi.fn()
      };
      vi.stubGlobal('Notification', vi.fn().mockImplementation(() => mockNotificationInstance));
      
      // Permission auf 'granted' setzen
      Object.defineProperty(Notification, 'permission', {
        value: 'granted',
        writable: true
      });
      
      const wrapper = createWrapper();
      
      // Stellen Sie sicher, dass Benachrichtigungen aktiviert sind
      await wrapper.find('#notifications-enabled').setValue(true);
      await wrapper.find('#notifications-enabled').trigger('change');
      
      // Stellen Sie sicher, dass Desktop-Benachrichtigungen aktiviert sind
      await wrapper.find('#notifications-desktop').setValue(true);
      await wrapper.find('#notifications-desktop').trigger('change');
      
      // Stellen Sie sicher, dass Sound-Benachrichtigungen aktiviert sind
      await wrapper.find('#notifications-sound').setValue(true);
      await wrapper.find('#notifications-sound').trigger('change');
      
      // Setze die Desktop-Berechtigung auf erteilt
      wrapper.vm.desktopPermissionGranted = true;
      
      // Klicke auf den Test-Button
      await wrapper.find('.notification-settings__test-button').trigger('click');
      
      // Prüfe, ob Audio-Konstruktor aufgerufen wurde
      expect(Audio).toHaveBeenCalledWith('/assets/sounds/notification.mp3');
      
      // Prüfe, ob play() aufgerufen wurde
      expect(mockAudio.play).toHaveBeenCalled();
      
      // Prüfe, ob Notification-Konstruktor aufgerufen wurde
      expect(Notification).toHaveBeenCalledWith(
        'settings.notifications.testTitle',
        expect.objectContaining({
          body: 'settings.notifications.testBody',
          icon: '/assets/images/notification-icon.png'
        })
      );
    });

    it('zeigt eine Fallback-Benachrichtigung an, wenn weder Sound noch Desktop aktiviert sind', async () => {
      const wrapper = createWrapper();
      
      // Mock für window.alert
      vi.stubGlobal('alert', vi.fn());
      
      // Stellen Sie sicher, dass Benachrichtigungen aktiviert sind
      await wrapper.find('#notifications-enabled').setValue(true);
      await wrapper.find('#notifications-enabled').trigger('change');
      
      // Stellen Sie sicher, dass Desktop-Benachrichtigungen deaktiviert sind
      await wrapper.find('#notifications-desktop').setValue(false);
      await wrapper.find('#notifications-desktop').trigger('change');
      
      // Stellen Sie sicher, dass Sound-Benachrichtigungen deaktiviert sind
      await wrapper.find('#notifications-sound').setValue(false);
      await wrapper.find('#notifications-sound').trigger('change');
      
      // Klicke auf den Test-Button
      await wrapper.find('.notification-settings__test-button').trigger('click');
      
      // Prüfe, ob alert aufgerufen wurde
      expect(alert).toHaveBeenCalledWith('settings.notifications.testFallback');
    });
  });

  describe('Berechtigungsmanagement', () => {
    it('fordert Berechtigungen an, wenn der Berechtigungsbutton geklickt wird', async () => {
      // Setze die Berechtigung auf 'denied'
      Object.defineProperty(Notification, 'permission', {
        value: 'denied',
        writable: true
      });
      
      const wrapper = createWrapper();
      
      // Stellen Sie sicher, dass Benachrichtigungen aktiviert sind
      await wrapper.find('#notifications-enabled').setValue(true);
      await wrapper.find('#notifications-enabled').trigger('change');
      
      // Aktiviere Desktop-Benachrichtigungen
      await wrapper.find('#notifications-desktop').setValue(true);
      await wrapper.find('#notifications-desktop').trigger('change');
      
      // Setze einen Spy auf requestPermission
      const requestPermissionSpy = vi.spyOn(wrapper.vm, 'requestPermission').mockResolvedValue(true);
      
      // Klicke auf den Berechtigungsbutton
      await wrapper.find('.notification-settings__permission-button').trigger('click');
      
      // Prüfe, ob requestPermission aufgerufen wurde
      expect(requestPermissionSpy).toHaveBeenCalled();
    });

    it('prüft den Berechtigungsstatus bei der Initialisierung', () => {
      // Setze die Berechtigung auf 'granted'
      Object.defineProperty(Notification, 'permission', {
        value: 'granted',
        writable: true
      });
      
      const wrapper = createWrapper();
      
      // Prüfe, ob der Berechtigungsstatus korrekt ermittelt wurde
      expect(wrapper.vm.desktopPermissionGranted).toBe(true);
    });

    it('deaktiviert Desktop-Benachrichtigungen, wenn der Browser sie nicht unterstützt', async () => {
      // Setze Notification auf undefined
      const originalNotification = window.Notification;
      // @ts-ignore: Bewusste Zuweisung auf undefined für den Test
      window.Notification = undefined;
      
      const wrapper = createWrapper();
      
      // Stellen Sie sicher, dass Benachrichtigungen aktiviert sind
      await wrapper.find('#notifications-enabled').setValue(true);
      await wrapper.find('#notifications-enabled').trigger('change');
      
      // Aktiviere Desktop-Benachrichtigungen
      await wrapper.find('#notifications-desktop').setValue(true);
      await wrapper.find('#notifications-desktop').trigger('change');
      
      // Prüfe, ob Desktop-Benachrichtigungen deaktiviert wurden
      expect(wrapper.vm.notificationSettings.desktop).toBe(false);
      
      // Wiederherstellen des originalen Notification-Objekts
      window.Notification = originalNotification;
    });
  });

  describe('Synchronisierung mit dem Store', () => {
    it('initialisiert die Einstellungen aus dem Store', () => {
      const store = useSettingsStore();
      const wrapper = createWrapper();
      
      // Prüfe, ob die Einstellungen aus dem Store geladen wurden
      expect(wrapper.vm.notificationSettings.enabled).toBe(store.notifications.enabled);
      expect(wrapper.vm.notificationSettings.sound).toBe(store.notifications.sound);
      expect(wrapper.vm.notificationSettings.desktop).toBe(store.notifications.desktop);
      expect(wrapper.vm.notificationSettings.sessionCompletion).toBe(store.notifications.sessionCompletion);
      expect(wrapper.vm.notificationSettings.mentions).toBe(store.notifications.mentions);
    });

    it('aktualisiert die Einstellungen, wenn sich der Store ändert', async () => {
      const store = useSettingsStore();
      const wrapper = createWrapper();
      
      // Setze einen Spy auf resetState
      const resetStateSpy = vi.spyOn(wrapper.vm, 'resetState');
      
      // Ändere die Store-Einstellungen
      store.updateNotificationSettings({
        enabled: false,
        sound: false
      });
      
      // Warten auf die Watch-Callback-Ausführung
      await vi.runAllTimers();
      
      // Prüfe, ob resetState aufgerufen wurde
      expect(resetStateSpy).toHaveBeenCalled();
    });
  });

  describe('Responsives Design', () => {
    it('enthält responsive CSS-Regeln für mobile Geräte', () => {
      const wrapper = createWrapper();
      
      // Prüfe, ob die CSS-Regeln einen Media Query für mobile Geräte enthalten
      const styleString = wrapper.vm.$.type.__scopeId 
        ? document.querySelector(`style[data-v-${wrapper.vm.$.type.__scopeId.replace('data-v-', '')}]`)?.textContent || ''
        : '';
      
      expect(styleString).toContain('@media (max-width');
    });
  });
});