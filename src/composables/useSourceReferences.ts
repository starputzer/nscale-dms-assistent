import { ref } from "vue";
import axios from "axios";
import type { SourceReference } from "@/types/session";

/**
 * Composable für die Verwaltung von Quellenreferenzen
 * Ersetzt die globalen Funktionen aus source-references.js mit Vue 3 Composition API
 */
export function useSourceReferences() {
  // Zustandsvariablen
  const visibleSourceReferences = ref<Record<string, boolean>>({});
  const openSourceDetails = ref<Record<string, boolean>>({});
  const messageSourceReferences = ref<
    Record<
      string,
      { loading?: boolean; sources: SourceReference[]; error?: boolean }
    >
  >({});
  const isLoadingReferences = ref<Record<string, boolean>>({});

  // Aktuelle Quellen-Popup-Daten
  const showSourcePopup = ref<boolean>(false);
  const sourcePopupContent = ref<{
    title: string;
    text: string;
    sourceId: string;
    file?: string;
  }>({
    title: "",
    text: "",
    sourceId: "",
  });
  const sourcePopupPosition = ref<{
    top: number;
    left: number;
  }>({
    top: 0,
    left: 0,
  });

  // Anzeige von Erklärung und Quellen
  const showExplanationDialog = ref<boolean>(false);
  const currentExplanation = ref<any>(null);
  const explanationLoading = ref<boolean>(false);

  /**
   * Prüft, ob eine Nachricht Quellenreferenzen enthält
   */
  function hasSourceReferences(content: string): boolean {
    if (!content) return false;

    return (
      /\(Quelle-\d+\)/.test(content) ||
      /Dokument \d+/.test(content) ||
      /Quelle(n)?:/.test(content) ||
      /Abschnitt/.test(content) ||
      /aus nscale/.test(content) ||
      content.includes("[[src:")
    );
  }

  /**
   * Überprüft ob für eine bestimmte Nachricht die Quellenreferenzen sichtbar sind
   */
  function isSourceReferencesVisible(message: any): boolean {
    if (!message || !message.id) return false;
    return !!visibleSourceReferences.value[message.id];
  }

  /**
   * Überprüft ob für eine bestimmte Nachricht Quellenreferenzen geladen werden
   */
  function isLoadingSourceReferences(message: any): boolean {
    if (!message || !message.id) return false;
    return !!isLoadingReferences.value[message.id];
  }

  /**
   * Gibt die Quellenreferenzen für eine bestimmte Nachricht zurück
   */
  function getSourceReferences(message: any): SourceReference[] {
    if (!message || !message.id) return [];
    return messageSourceReferences.value[message.id]?.sources || [];
  }

  /**
   * Überprüft, ob ein Quellendetail für eine bestimmte Nachricht geöffnet ist
   */
  function isSourceDetailOpen(message: any, _sourceIndex: number): boolean {
    if (!message || !message.id) return false;
    return !!openSourceDetails.value[`${message.id}-${sourceIndex}`];
  }

  /**
   * Ändert den Zustand (offen/geschlossen) eines Quellendetails
   */
  function toggleSourceDetail(message: any, _sourceIndex: number): void {
    if (!message || !message.id) return;
    const key = `${message.id}-${sourceIndex}`;

    openSourceDetails.value = {
      ...openSourceDetails.value,
      [key]: !openSourceDetails.value[key],
    };
  }

  /**
   * Wechselt die Sichtbarkeit der Quellenreferenzen für eine bestimmte Nachricht
   */
  async function toggleSourceReferences(message: any): Promise<void> {
    if (!message || !message.id) return;

    const messageId = message.id;

    // Wenn die Referenzen bereits sichtbar sind, ausblenden
    if (visibleSourceReferences.value[messageId]) {
      visibleSourceReferences.value = {
        ...visibleSourceReferences.value,
        [messageId]: false,
      };
      return;
    }

    // Referenzen einblenden
    visibleSourceReferences.value = {
      ...visibleSourceReferences.value,
      [messageId]: true,
    };

    // Wenn noch keine Quellen geladen wurden, diese jetzt laden
    if (!messageSourceReferences.value[messageId]) {
      try {
        // Ladezustand setzen
        isLoadingReferences.value = {
          ...isLoadingReferences.value,
          [messageId]: true,
        };

        messageSourceReferences.value = {
          ...messageSourceReferences.value,
          [messageId]: { loading: true, _sources: [] },
        };

        // API-Aufruf zum Laden der Quellen
        const response = await axios.get(`/api/sources/${messageId}`);

        // Geladene Quellen speichern
        messageSourceReferences.value = {
          ...messageSourceReferences.value,
          [messageId]: {
            loading: false,
            sources: response.data.sources || [],
          },
        };
      } catch (error) {
        console.error("Fehler beim Laden der Quellenreferenzen:", error);
        // Fehler-Status setzen, aber UI nicht blockieren
        messageSourceReferences.value = {
          ...messageSourceReferences.value,
          [messageId]: { loading: false, _sources: [], error: true },
        };
      } finally {
        isLoadingReferences.value = {
          ...isLoadingReferences.value,
          [messageId]: false,
        };
      }
    }
  }

  /**
   * Zeigt ein Popup mit Informationen zur angeklickten Quelle an
   */
  async function showSourcePopupHandler(
    event: MouseEvent,
    sourceId: string,
  ): Promise<void> {
    // Popup-Position bestimmen
    if (event.target instanceof HTMLElement) {
      const rect = event.target.getBoundingClientRect();
      sourcePopupPosition.value = {
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
      };
    }

    // Vorläufigen Inhalt anzeigen
    sourcePopupContent.value = {
      title: `Quelle ${sourceId}`,
      text: "Lade Quelleninformationen...",
      sourceId: sourceId,
    };
    showSourcePopup.value = true;

    try {
      // Versuchen, Quelleninformationen zu laden
      const response = await axios.get(`/api/source-detail/${sourceId}`);

      if (response.data && response.data.content) {
        sourcePopupContent.value = {
          title: response.data.title || `Quelle ${sourceId}`,
          text: response.data.content || "Keine Inhalte verfügbar",
          file: response.data.file,
          sourceId: sourceId,
        };
      } else {
        sourcePopupContent.value = {
          title: `Quelle ${sourceId}`,
          text: "Keine detaillierten Informationen verfügbar",
          sourceId: sourceId,
        };
      }
    } catch (error) {
      console.error("Fehler beim Laden der Quelleninformationen:", error);
      sourcePopupContent.value = {
        title: `Quelle ${sourceId}`,
        text: "Fehler beim Laden der Quelleninformationen",
        sourceId: sourceId,
      };
    }
  }

  /**
   * Schließt das Quellen-Popup
   */
  function closeSourcePopup(): void {
    showSourcePopup.value = false;
  }

  /**
   * Lädt die Erklärung für eine bestimmte Nachricht und zeigt den Dialog an
   */
  async function loadExplanation(message: any): Promise<void> {
    if (!message || !message.id) {
      console.error("Ungültige Nachricht für Erklärung:", message);
      // Statt Alert zeigen wir eine freundlichere Fehlermeldung im Erklärungsdialog
      showExplanationDialog.value = true;
      currentExplanation.value = {
        original_question: "Keine Frage gefunden",
        explanation_text:
          "Diese Nachricht kann nicht erklärt werden, da keine gültige ID vorhanden ist.",
        source_references: [],
      };
      return;
    }

    try {
      explanationLoading.value = true;
      showExplanationDialog.value = true;

      // Stelle sicher, dass wir eine angemessene Timeout-Zeit haben
      const response = await axios.get(`/api/explain/${message.id}`, {
        timeout: 10000, // 10 Sekunden Timeout
      });

      currentExplanation.value = response.data;
    } catch (error) {
      console.error("Fehler beim Laden der Erklärung:", error);

      // Wir setzen trotzdem eine Grundstruktur, um Frontend-Fehler zu vermeiden
      currentExplanation.value = {
        original_question: message.content,
        answer_summary: "Keine Erklärung verfügbar",
        source_references: [],
        explanation_text:
          "Es ist ein Fehler bei der Erklärung aufgetreten. Möglicherweise stehen für diese Antwort keine Quellen zur Verfügung.",
      };
    } finally {
      explanationLoading.value = false;
    }
  }

  /**
   * Zeigt Quellenliste für eine Nachricht an
   */
  function showSourcesDialog(message: any): void {
    // Diese Funktion leitet auf die loadExplanation um, da diese auch die Quellen enthält
    loadExplanation(message);
  }

  /**
   * Schließt den Erklärungsdialog
   */
  function closeExplanationDialog(): void {
    showExplanationDialog.value = false;
    // Nach kurzer Verzögerung den Inhalt zurücksetzen
    setTimeout(() => {
      currentExplanation.value = null;
    }, 300);
  }

  return {
    // Zustandsvariablen
    visibleSourceReferences,
    openSourceDetails,
    messageSourceReferences,
    isLoadingReferences,
    showSourcePopup,
    sourcePopupContent,
    sourcePopupPosition,
    showExplanationDialog,
    currentExplanation,
    explanationLoading,

    // Funktionen
    hasSourceReferences,
    isSourceReferencesVisible,
    isLoadingSourceReferences,
    getSourceReferences,
    isSourceDetailOpen,
    toggleSourceDetail,
    toggleSourceReferences,
    showSourcePopupHandler,
    closeSourcePopup,
    loadExplanation,
    showSourcesDialog,
    closeExplanationDialog,
  };
}
