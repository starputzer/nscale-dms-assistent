import { App } from 'vue';
import DialogProvider from '@/components/dialog/DialogProvider.vue';
import { useGlobalDialog } from '@/composables/useDialog';

/**
 * Dialog-Plugin für Vue 3
 * 
 * Installiert den DialogProvider als globale Komponente und
 * fügt globale Dialoge zum Vue-Prototype hinzu.
 */
export default {
  install: (app: App) => {
    // DialogProvider global registrieren
    app.component('DialogProvider', DialogProvider);
    
    // Globale Dialoge zum App-Config-Objekt hinzufügen
    const dialog = useGlobalDialog();
    app.config.globalProperties.$dialog = dialog;
    
    // Überschreiben der globalen window.confirm-Funktion
    if (typeof window !== 'undefined') {
      const originalConfirm = window.confirm;
      
      // window.confirm überschreiben
      window.confirm = (message) => {
        return new Promise<boolean>((resolve) => {
          dialog.confirm({
            message,
            onConfirm: () => resolve(true),
            onCancel: () => resolve(false)
          });
        }).then(result => result);
      };
      
      // window.prompt überschreiben
      const originalPrompt = window.prompt;
      
      window.prompt = (message, defaultValue) => {
        return new Promise<string | null>((resolve) => {
          dialog.prompt({
            message,
            defaultValue: defaultValue || '',
            onConfirm: (value) => resolve(value),
            onCancel: () => resolve(null)
          });
        }).then(result => result);
      };
      
      // window.alert überschreiben
      const originalAlert = window.alert;
      
      window.alert = (message) => {
        return new Promise<void>((resolve) => {
          dialog.info({
            message: String(message),
            showCancelButton: false,
            onConfirm: () => resolve()
          });
        });
      };
      
      // Originale Methoden für Debugging-Zwecke speichern
      (window as any).__originalConfirm = originalConfirm;
      (window as any).__originalPrompt = originalPrompt;
      (window as any).__originalAlert = originalAlert;
    }
  }
};