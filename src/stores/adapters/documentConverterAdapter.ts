/**
 * DocumentConverterAdapter: Bietet eine kompatible Schnittstelle für verschiedene Versionen des DocumentConverter-Stores
 * 
 * Dieser Adapter löst Kompatibilitätsprobleme zwischen verschiedenen Versionen der Store-API,
 * indem er fehlende Methoden implementiert und API-Unterschiede ausgleicht.
 */

import { ref, computed } from 'vue';
import { useDocumentConverterStore } from '../documentConverter';
import type { IDocumentConverterStore } from '@/types/stores';

// Store-Interface mit zurückkompatiblen Methoden
export interface DocumentConverterWithCompat extends IDocumentConverterStore {
  // Fehlende Methoden ergänzen
  selectDocument(id: string): void;
  setView(view: string): void;
  downloadDocument(id: string): Promise<void>;
  deleteDocument(id: string): Promise<void>;
  cancelConversion(id: string): Promise<void>;
  setUseFallback(useFallback: boolean): void;
  clearError(): void;
  refreshDocuments(): Promise<void>;
}

/**
 * Erstellt einen DocumentConverter-Store mit kompatiblen Methoden
 * für verschiedene Versionen der API
 */
export function useDocumentConverterCompat(): DocumentConverterWithCompat {
  const store = useDocumentConverterStore();
  
  // Erweitere den Store mit kompatiblen Methoden
  return {
    ...store,
    
    // Dokument auswählen
    selectDocument: (id: string): void => {
      if (typeof store.selectDocument === 'function') {
        store.selectDocument(id);
      } else {
        // Fallback: Direkt die ID setzen
        store.selectedDocumentId = id;
      }
    },
    
    // Ansicht ändern
    setView: (view: string): void => {
      if (typeof store.setView === 'function') {
        store.setView(view);
      } else {
        // Fallback: Direkt die Ansicht setzen
        (store as any).currentView = view;
      }
    },
    
    // Dokument herunterladen
    downloadDocument: async (id: string): Promise<void> => {
      if (typeof store.downloadDocument === 'function') {
        return store.downloadDocument(id);
      }
      console.warn('downloadDocument nicht verfügbar');
      return Promise.reject(new Error('Download-Funktionalität nicht verfügbar'));
    },
    
    // Dokument löschen
    deleteDocument: async (id: string): Promise<void> => {
      if (typeof store.deleteDocument === 'function') {
        return store.deleteDocument(id);
      }
      console.warn('deleteDocument nicht verfügbar');
      return Promise.reject(new Error('Löschfunktionalität nicht verfügbar'));
    },
    
    // Konvertierung abbrechen
    cancelConversion: async (id: string): Promise<void> => {
      if (typeof store.cancelConversion === 'function') {
        return store.cancelConversion(id);
      }
      console.warn('cancelConversion nicht verfügbar');
      return Promise.reject(new Error('Abbruchfunktionalität nicht verfügbar'));
    },
    
    // Fallback-Modus aktivieren/deaktivieren
    setUseFallback: (useFallback: boolean): void => {
      if (typeof store.setUseFallback === 'function') {
        store.setUseFallback(useFallback);
      } else {
        // Fallback: Direkt die Einstellung setzen
        store.useFallback = useFallback;
      }
    },
    
    // Fehler zurücksetzen
    clearError: (): void => {
      if (typeof store.clearError === 'function') {
        store.clearError();
      } else {
        // Fallback: Direkt den Fehler zurücksetzen
        (store as any).error = null;
      }
    },
    
    // Dokumente aktualisieren
    refreshDocuments: async (): Promise<void> => {
      if (typeof store.refreshDocuments === 'function') {
        return store.refreshDocuments();
      } else if (typeof store.loadDocuments === 'function') {
        // Alternative: Dokumente neu laden
        return store.loadDocuments();
      }
      console.warn('refreshDocuments nicht verfügbar');
      return Promise.resolve();
    }
  };
}

// Cached store instance
let cachedStore: DocumentConverterWithCompat | null = null;

// Factory function to get the store instance
export function getDocumentConverterCompat(): DocumentConverterWithCompat {
  if (!cachedStore) {
    cachedStore = useDocumentConverterCompat();
  }
  return cachedStore;
}