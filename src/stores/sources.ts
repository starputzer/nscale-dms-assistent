import { defineStore } from 'pinia';
import axios from 'axios';
import type { SourceReference } from '@/types/session';

/**
 * Interface für den State des Sources Store
 */
interface SourcesState {
  currentSourceReferences: Record<string, SourceReference[]>;
  loadingState: Record<string, boolean>;
  errorState: Record<string, string | null>;
  currentMessageId: string | null;
  showExplanationModal: boolean;
  showSourcesModal: boolean;
  explanationData: any | null;
  isLoadingExplanation: boolean;
}

/**
 * Pinia Store für die Verwaltung von Quellenreferenzen
 * Ersetzt die globalen Quellen-Funktionen mit einer zentralen State-Management-Lösung
 */
export const useSourcesStore = defineStore('sources', {
  state: (): SourcesState => ({
    currentSourceReferences: {},
    loadingState: {},
    errorState: {},
    currentMessageId: null,
    showExplanationModal: false,
    showSourcesModal: false,
    explanationData: null,
    isLoadingExplanation: false
  }),

  getters: {
    /**
     * Gibt die Quellenreferenzen für eine bestimmte Nachricht zurück
     */
    getReferencesForMessage: (state) => (messageId: string): SourceReference[] => {
      return state.currentSourceReferences[messageId] || [];
    },

    /**
     * Prüft, ob für eine bestimmte Nachricht gerade Quellen geladen werden
     */
    isLoadingReferences: (state) => (messageId: string): boolean => {
      return !!state.loadingState[messageId];
    },

    /**
     * Gibt den Fehlerstatus für eine bestimmte Nachricht zurück
     */
    getErrorForMessage: (state) => (messageId: string): string | null => {
      return state.errorState[messageId] || null;
    },

    /**
     * Gibt die aktuellen Quellenreferenzen zurück (für Modals)
     */
    currentReferences: (state): SourceReference[] => {
      return state.currentMessageId ? state.currentSourceReferences[state.currentMessageId] || [] : [];
    }
  },

  actions: {
    /**
     * Lädt die Quellenreferenzen für eine bestimmte Nachricht
     */
    async loadSourceReferences(messageId: string): Promise<SourceReference[]> {
      // Wenn die Referenzen bereits geladen wurden, direkt zurückgeben
      if (this.currentSourceReferences[messageId]) {
        return this.currentSourceReferences[messageId];
      }

      try {
        // Ladezustand setzen
        this.loadingState[messageId] = true;
        this.errorState[messageId] = null;

        // API-Aufruf zum Laden der Quellen
        const response = await axios.get(`/api/sources/${messageId}`);

        // Geladene Quellen speichern
        const sources = response.data.sources || [];
        this.currentSourceReferences[messageId] = sources;

        return sources;
      } catch (error) {
        console.error("Fehler beim Laden der Quellenreferenzen:", error);
        let errorMessage = "Unbekannter Fehler beim Laden der Quellen";
        
        if (axios.isAxiosError(error)) {
          errorMessage = error.response?.data?.message || error.message;
        } else if (error instanceof Error) {
          errorMessage = error.message;
        }
        
        this.errorState[messageId] = errorMessage;
        return [];
      } finally {
        this.loadingState[messageId] = false;
      }
    },

    /**
     * Lädt die Erklärung für eine bestimmte Nachricht und zeigt den Dialog an
     */
    async showExplanation({ messageId }: { messageId: string }): Promise<void> {
      this.currentMessageId = messageId;
      this.showExplanationModal = true;
      this.isLoadingExplanation = true;

      try {
        const response = await axios.get(`/api/explain/${messageId}`);
        this.explanationData = response.data;

        // Quellen aus der Erklärung extrahieren und im Store speichern
        if (response.data.source_references) {
          const formattedSources: SourceReference[] = response.data.source_references.map((ref: any) => ({
            id: ref.source_id || `src-${Math.random().toString(36).substr(2, 9)}`,
            title: ref.title || ref.source_id || 'Unbekannte Quelle',
            content: ref.preview || 'Keine Vorschau verfügbar',
            source: ref.file || 'Unbekannt',
            url: ref.url,
            relevanceScore: ref.relevance || ref.relevance_score || 0
          }));

          this.currentSourceReferences[messageId] = formattedSources;
        }
      } catch (error) {
        console.error("Fehler beim Laden der Erklärung:", error);
        this.explanationData = {
          original_question: "Frage konnte nicht geladen werden",
          explanation_text: "Es ist ein Fehler beim Laden der Erklärung aufgetreten.",
          source_references: []
        };
      } finally {
        this.isLoadingExplanation = false;
      }
    },

    /**
     * Zeigt Quellenliste für eine Nachricht an
     */
    async showSources({ messageId }: { messageId: string }): Promise<void> {
      this.currentMessageId = messageId;
      this.showSourcesModal = true;

      // Quellen laden, falls noch nicht geschehen
      if (!this.currentSourceReferences[messageId]) {
        await this.loadSourceReferences(messageId);
      }
    },

    /**
     * Schließt den Erklärungsdialog
     */
    closeExplanationModal(): void {
      this.showExplanationModal = false;
    },

    /**
     * Schließt das Quellenmodal
     */
    closeSourcesModal(): void {
      this.showSourcesModal = false;
    },

    /**
     * Setzt alle Zustandsdaten zurück
     */
    resetState(): void {
      this.currentSourceReferences = {};
      this.loadingState = {};
      this.errorState = {};
      this.currentMessageId = null;
      this.showExplanationModal = false;
      this.showSourcesModal = false;
      this.explanationData = null;
      this.isLoadingExplanation = false;
    }
  }
});