/**
 * @deprecated Diese Legacy-Komponente ist veraltet und wird in Kürze entfernt.
 * Verwende stattdessen die Vue 3 SFC-Implementierung.
 * Geplantes Entfernungsdatum: 2025-06-10
 */

/**
 * Stellt Funktionen für die Anzeige und Interaktion mit Quellenverweisen bereit
 * @param {Object} options - Konfigurationsoptionen
 * @returns {Object} - Funktionen für Quellenverweise
 */

// Monitoring für Legacy-Code-Nutzung
function trackLegacyUsage(componentName, action) {
  if (typeof window.telemetry !== 'undefined') {
    window.telemetry.trackEvent('legacy_code_usage', {
      component: componentName,
      action: action,
      timestamp: new Date().toISOString()
    });
  }
}

// Tracking bei Modulinitialisierung
trackLegacyUsage('source-references', 'initialize');


export function setupSourceReferences(options) {
  const { token, messages, isLoading } = options;

  // Zustand für Erklärungsdialog
  const showExplanationDialog = Vue.ref(false);
  const currentExplanation = Vue.ref(null);
  const explanationLoading = Vue.ref(false);

  // Zustand für Popup bei Klick auf Quellenreferenz
  const showSourcePopup = Vue.ref(false);
  const sourcePopupContent = Vue.ref({
    title: "",
    text: "",
    sourceId: "",
  });
  const sourcePopupPosition = Vue.ref({
    top: 0,
    left: 0,
  });

  /**
   * Überprüft, ob eine Nachricht Quellenverweise enthält
   * @param {string} message - Der Nachrichtentext
   * @returns {boolean} - true, wenn Quellenverweise gefunden wurden
   */
  const hasSourceReferences = (message) => {
    if (!message) return false;

    // Suche nach verschiedenen Mustern für Quellenverweise
    // Erweitert, um alle möglichen Formate zu erkennen
    return (
      /\(Quelle-\d+\)/.test(message) ||
      /Dokument \d+/.test(message) ||
      /Quelle(n)?:/.test(message) ||
      /Abschnitt/.test(message) ||
      /aus nscale/.test(message)
    );
  };

  /**
   * Extrahiert alle Quellenverweise aus einer Nachricht
   * @param {string} message - Der Nachrichtentext
   * @returns {Array} - Array mit allen gefundenen Quellenverweisen
   */
  const extractSourceReferences = (message) => {
    if (!message) return [];

    // Suche nach verschiedenen Quellenformaten
    const patterns = [
      /\(Quelle-(\d+)\)/g,
      /Dokument (\d+)/g,
      /Abschnitt ['"]([^'"]+)['"]/g,
    ];

    let sources = [];

    // Durchsuche alle Muster
    for (const pattern of patterns) {
      const matches = [...(message.matchAll(pattern) || [])];
      if (matches.length > 0) {
        const sourceIds = matches.map((match) => match[1]);
        sources = [...sources, ...sourceIds];
      }
    }

    // Wenn keine spezifischen Quellen gefunden wurden, aber ein Quellenabschnitt existiert
    if (sources.length === 0 && /Quelle(n)?:/.test(message)) {
      sources.push("Quellenabschnitt");
    }

    // Entferne Duplikate
    return [...new Set(sources)];
  };

  /**
   * Formatiert Nachrichtentext mit hervorgehobenen Quellenangaben
   * und fügt onClick-Funktionalität für Quellenreferenzen hinzu
   * @param {string} message - Der zu formatierende Nachrichtentext
   * @returns {string} - Formatierter Text mit HTML-Hervorhebungen
   */
  const formatMessageWithSourceHighlighting = (message) => {
    if (!message) return "";

    // Bereite den Text für die Anzeige vor
    let formattedMessage = message;

    // Ersetze Quellenverweise mit hervorgehobenen Spans, die nun onclick-Funktionalität haben
    formattedMessage = formattedMessage.replace(
      /\(Quelle-(\d+)\)/g,
      '<span class="source-reference" data-source-id="$1" onclick="window.showSourcePopupHandler(event, \'$1\')" title="Klicken für Details zu Quelle $1">$&</span>',
    );

    // Ersetze Datei- und Abschnittsreferenzen
    formattedMessage = formattedMessage.replace(
      /(Dokument \d+) \(([^\)]+)\)/g,
      '<span class="source-reference" data-document-name="$2" onclick="window.showSourcePopupHandler(event, \'doc-$2\')" title="Klicken für Details zu $2">$1</span>',
    );

    return formattedMessage;
  };

  /**
   * Zeigt ein Popup mit Informationen zur angeklickten Quelle an
   * @param {Event} event - Das Klick-Event
   * @param {string} sourceId - Die ID der Quelle
   */
  const showSourcePopupHandler = (event, sourceId) => {
    console.log("Quellenpopup anzeigen für:", sourceId);

    // Popup-Position bestimmen
    const rect = event.target.getBoundingClientRect();
    sourcePopupPosition.value = {
      top: rect.bottom + window.scrollY,
      left: rect.left + window.scrollX,
    };

    // Wenn eine aktuelle Nachricht im Kontext ist
    const currentMessage = messages.value.find(
      (m) => !m.is_user && m.message.includes(`Quelle-${sourceId}`),
    );

    if (currentMessage) {
      explanationLoading.value = true;
      showSourcePopup.value = true;

      // Vorläufigen Inhalt anzeigen
      sourcePopupContent.value = {
        title: `Quelle ${sourceId}`,
        text: "Lade Quelleninformationen...",
        sourceId: sourceId,
      };

      // Asynchron die Daten laden
      const loadSourceInfo = async () => {
        try {
          // In einem echten System würden wir hier einen API-Endpunkt aufrufen
          // Jetzt suchen wir in der aktuellen Erklärung, falls vorhanden
          if (
            currentExplanation.value &&
            currentExplanation.value.source_references
          ) {
            const sourceRef = currentExplanation.value.source_references.find(
              (ref) => ref.source_id === `Quelle-${sourceId}`,
            );

            if (sourceRef) {
              sourcePopupContent.value = {
                title: `${sourceRef.source_id}`,
                text: sourceRef.preview || "Keine Vorschau verfügbar",
                file: sourceRef.file,
                sourceId: sourceId,
              };
              return;
            }
          }

          // Falls keine Erklärung bereits vorhanden ist, versuche eine zu laden
          // Das passiert nur, wenn das Popup auf eine Quelle angeklickt wird, bevor
          // die Erklärung geladen wurde
          if (currentMessage.id) {
            // Nutze die bereits vorhandene loadExplanation-Funktion
            // Aber mache es im Hintergrund, ohne das Dialog zu öffnen
            const response = await axios.get(
              `/api/explain/${currentMessage.id}`,
            );

            // Speichere die Erklärung für spätere Verwendung
            currentExplanation.value = response.data;

            // Finde die passende Quellenreferenz
            const sourceRef = currentExplanation.value.source_references.find(
              (ref) => ref.source_id === `Quelle-${sourceId}`,
            );

            if (sourceRef) {
              sourcePopupContent.value = {
                title: `${sourceRef.source_id}`,
                text: sourceRef.preview || "Keine Vorschau verfügbar",
                file: sourceRef.file,
                sourceId: sourceId,
              };
            } else {
              sourcePopupContent.value = {
                title: `Quelle ${sourceId}`,
                text: "Keine detaillierten Informationen verfügbar",
                sourceId: sourceId,
              };
            }
          } else {
            // Keine Message-ID vorhanden
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
        } finally {
          explanationLoading.value = false;
        }
      };

      loadSourceInfo();
    } else {
      // Fallback, wenn keine passende Nachricht gefunden wurde
      sourcePopupContent.value = {
        title: `Quelle ${sourceId}`,
        text: "Keine detaillierten Informationen verfügbar",
        sourceId: sourceId,
      };
      showSourcePopup.value = true;
    }
  };

  /**
   * Schließt das Quellen-Popup
   */
  const closeSourcePopup = () => {
    showSourcePopup.value = false;
  };

  /**
   * Lädt die Erklärung für eine bestimmte Nachricht und zeigt den Dialog an
   * Mit verbesserter Fehlerbehandlung, die Frontend-Fehler vermeidet
   * @param {Object} message - Die Nachricht, für die eine Erklärung geladen werden soll
   */
  const loadExplanation = async (message) => {
    console.log("loadExplanation aufgerufen mit:", message);

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

      console.log(`Lade Erklärung für Nachricht ${message.id}...`);

      // Stelle sicher, dass wir eine angemessene Timeout-Zeit haben
      const response = await axios.get(`/api/explain/${message.id}`, {
        timeout: 10000, // 10 Sekunden Timeout
      });

      currentExplanation.value = response.data;
      console.log("Erklärung geladen:", currentExplanation.value);
    } catch (error) {
      console.error("Fehler beim Laden der Erklärung:", error);

      // Wir setzen trotzdem eine Grundstruktur, um Frontend-Fehler zu vermeiden
      currentExplanation.value = {
        original_question: message.message,
        answer_summary: "Keine Erklärung verfügbar",
        source_references: [],
        explanation_text:
          "Es ist ein Fehler bei der Erklärung aufgetreten. Möglicherweise stehen für diese Antwort keine Quellen zur Verfügung.",
      };
    } finally {
      explanationLoading.value = false;
    }
  };

  /**
   * Zeigt Quellenliste für eine Nachricht an
   * @param {Object} message - Die Nachricht, für die Quellen angezeigt werden sollen
   */
  const showSourcesDialog = (message) => {
    console.log("showSourcesDialog aufgerufen mit:", message);
    // Diese Funktion leitet auf die loadExplanation um, da diese auch die Quellen enthält
    loadExplanation(message);
  };

  /**
   * Schließt den Erklärungsdialog
   */
  const closeExplanationDialog = () => {
    showExplanationDialog.value = false;
    // Nach kurzer Verzögerung den Inhalt zurücksetzen
    setTimeout(() => {
      currentExplanation.value = null;
    }, 300);
  };

  /**
   * Erstellt CSS für Quellenhervorhebung basierend auf dem Theme
   * @returns {string} - CSS-Stile für Quellenhervorhebung
   */
  const getSourceHighlightingStyles = () => {
    // Basis-Styles für alle Themes
    const baseStyles = `
            .source-reference {
                display: inline-block;
                padding: 0 2px;
                border-radius: 4px;
                font-size: 0.9em;
                cursor: pointer;
                transition: all 0.2s ease;
            }
            .source-reference:hover {
                transform: translateY(-1px);
            }
            
            .source-buttons {
                display: flex;
                margin-top: 12px;
                gap: 10px;
            }
            
            .source-btn {
                display: inline-flex;
                align-items: center;
                padding: 6px 12px;
                border-radius: 4px;
                font-size: 0.85rem;
                cursor: pointer;
                transition: all 0.2s ease;
            }
            
            .source-btn i {
                margin-right: 6px;
            }
            
            /* Quellen-Popup */
            .source-popup {
                position: absolute;
                background-color: white;
                border-radius: 6px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                padding: 12px;
                max-width: 300px;
                z-index: 1000;
                animation: fadeIn 0.2s ease-out;
            }
            
            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(-5px); }
                to { opacity: 1; transform: translateY(0); }
            }
            
            .source-popup-title {
                font-weight: 600;
                margin-bottom: 8px;
                padding-bottom: 8px;
                border-bottom: 1px solid #eaeaea;
            }
            
            .source-popup-content {
                font-size: 0.9rem;
                line-height: 1.5;
                max-height: 200px;
                overflow-y: auto;
                margin-bottom: 10px;
            }
            
            .source-popup-file {
                font-size: 0.8rem;
                color: #666;
                margin-bottom: 10px;
            }
            
            .source-popup-close {
                display: block;
                text-align: right;
                font-size: 0.85rem;
                color: #666;
                cursor: pointer;
                margin-top: 8px;
            }
            
            .source-popup-close:hover {
                color: #333;
                text-decoration: underline;
            }
        `;

    // Theme-spezifische Styles
    const themeStyles = document.body.classList.contains("theme-dark")
      ? `
                .source-reference {
                    background-color: rgba(0, 192, 96, 0.2);
                    border: 1px solid rgba(0, 192, 96, 0.3);
                    color: #00c060;
                }
                .source-reference:hover {
                    background-color: rgba(0, 192, 96, 0.3);
                }
                .source-btn {
                    background-color: #1e1e1e;
                    border: 1px solid #333;
                    color: #f0f0f0;
                }
                .source-btn:hover {
                    background-color: #333;
                }
                
                .source-popup {
                    background-color: #1e1e1e;
                    border: 1px solid #333;
                    color: #f0f0f0;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                }
                
                .source-popup-title {
                    border-bottom-color: #333;
                    color: #00c060;
                }
                
                .source-popup-file {
                    color: #aaa;
                }
                
                .source-popup-close {
                    color: #aaa;
                }
                
                .source-popup-close:hover {
                    color: #fff;
                }
            `
      : document.body.classList.contains("theme-contrast")
        ? `
                    .source-reference {
                        background-color: #333300;
                        border: 1px solid #ffeb3b;
                        color: #ffeb3b;
                        font-weight: bold;
                    }
                    .source-reference:hover {
                        background-color: #444400;
                    }
                    .source-btn {
                        background-color: #000000;
                        border: 1px solid #ffeb3b;
                        color: #ffeb3b;
                    }
                    .source-btn:hover {
                        background-color: #333300;
                    }
                    
                    .source-popup {
                        background-color: #000000;
                        border: 2px solid #ffeb3b;
                        color: #ffffff;
                        box-shadow: 0 4px 12px rgba(255, 235, 59, 0.2);
                    }
                    
                    .source-popup-title {
                        border-bottom-color: #ffeb3b;
                        color: #ffeb3b;
                    }
                    
                    .source-popup-file {
                        color: #ffeb3b;
                    }
                    
                    .source-popup-close {
                        color: #ffeb3b;
                    }
                    
                    .source-popup-close:hover {
                        color: #ffffff;
                    }
                `
        : `
                    .source-reference {
                        background-color: rgba(0, 165, 80, 0.1);
                        border: 1px solid rgba(0, 165, 80, 0.2);
                        color: #008d45;
                    }
                    .source-reference:hover {
                        background-color: rgba(0, 165, 80, 0.2);
                    }
                    .source-btn {
                        background-color: #f8f9fa;
                        border: 1px solid #e2e8f0;
                        color: #4a5568;
                    }
                    .source-btn:hover {
                        background-color: #edf2f7;
                    }
                `;

    return baseStyles + themeStyles;
  };

  /**
   * Rendert das Quellen-Popup
   * @returns {string} - HTML für das Quellen-Popup
   */
  const renderSourcePopup = () => {
    if (!showSourcePopup.value) return "";

    return `
            <div class="source-popup" style="top: ${sourcePopupPosition.value.top}px; left: ${sourcePopupPosition.value.left}px;">
                <div class="source-popup-title">${sourcePopupContent.value.title}</div>
                ${sourcePopupContent.value.file ? `<div class="source-popup-file">Datei: ${sourcePopupContent.value.file}</div>` : ""}
                <div class="source-popup-content">${sourcePopupContent.value.text}</div>
                <div class="source-popup-close" onclick="window.closeSourcePopup()">Schließen</div>
            </div>
        `;
  };

  // Initialisierende Aktionen
  // CSS für Quellenhervorhebung einfügen
  const injectStylesIntoHead = () => {
    const styleElement = document.createElement("style");
    styleElement.id = "source-references-styles";
    styleElement.innerHTML = getSourceHighlightingStyles();
    document.head.appendChild(styleElement);

    // Beobachte Theme-Änderungen und aktualisiere Styles entsprechend
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          mutation.attributeName === "class" &&
          mutation.target === document.body
        ) {
          // Theme hat sich geändert, aktualisiere Styles
          const existingStyle = document.getElementById(
            "source-references-styles",
          );
          if (existingStyle) {
            existingStyle.innerHTML = getSourceHighlightingStyles();
          }
        }
      });
    });

    observer.observe(document.body, { attributes: true });
  };

  // Styles einfügen
  injectStylesIntoHead();

  // Globale Funktionen registrieren für HTML onclick-Ereignisse
  window.loadExplanation = loadExplanation;
  window.showSourcesDialog = showSourcesDialog;
  window.closeExplanationDialog = closeExplanationDialog;
  window.showSourcePopupHandler = showSourcePopupHandler;
  window.closeSourcePopup = closeSourcePopup;

  /**
   * Rendert Erklärungsdialog für die Anzeige
   * @returns {string} - HTML für den Erklärungsdialog
   */
  const renderExplanationDialog = () => {
    if (!showExplanationDialog.value) return "";

    const dialogContent = explanationLoading.value
      ? `
                <div class="p-4 text-center">
                    <div class="loader mx-auto mb-3"></div>
                    <p>Erklärung wird geladen...</p>
                </div>
            `
      : currentExplanation.value
        ? `
                    <div class="p-6">
                        <div class="mb-4">
                            <h3 class="font-medium text-lg mb-2">Ursprüngliche Frage:</h3>
                            <p class="p-2 bg-gray-50 rounded">${currentExplanation.value.original_question}</p>
                        </div>
                        
                        <div class="mb-4">
                            <h3 class="font-medium text-lg mb-2">Verwendete Quellen:</h3>
                            <div class="p-3 bg-gray-50 rounded">
                                ${
                                  currentExplanation.value.source_references &&
                                  currentExplanation.value.source_references
                                    .length
                                    ? currentExplanation.value.source_references
                                        .map(
                                          (source, index) => `
                                        <div class="mb-2 pb-2 ${index < currentExplanation.value.source_references.length - 1 ? "border-b border-gray-200" : ""}">
                                            <div class="flex justify-between">
                                                <span class="font-medium">${source.source_id}</span>
                                                <span class="text-sm text-gray-500">${source.usage_count || 0}× verwendet</span>
                                            </div>
                                            <p class="text-sm">Datei: ${source.file}</p>
                                            ${source.title ? `<p class="text-sm">Abschnitt: ${source.title}</p>` : ""}
                                            <div class="mt-1 text-xs bg-white p-2 rounded border border-gray-200">
                                                ${source.preview || "Keine Vorschau verfügbar"}
                                            </div>
                                        </div>
                                    `,
                                        )
                                        .join("")
                                    : '<p class="text-sm text-gray-500">Keine Quellen gefunden.</p>'
                                }
                            </div>
                        </div>
                        
                        <div class="mt-4">
                            <h3 class="font-medium text-lg mb-2">Erläuterung:</h3>
                            <div class="p-3 bg-gray-50 rounded whitespace-pre-line">
                                ${currentExplanation.value.explanation_text || "Keine Erläuterung verfügbar."}
                            </div>
                        </div>
                    </div>
                `
        : `
                    <div class="p-4 text-center">
                        <p>Keine Erklärungsdaten verfügbar.</p>
                    </div>
                `;

    return `
            <div class="modal-overlay">
                <div class="modal-container max-w-3xl">
                    <div class="modal-header">
                        <h3 class="modal-title">Antwort-Erklärung</h3>
                        <button class="modal-close" onclick="window.closeExplanationDialog()">×</button>
                    </div>
                    <div class="modal-body overflow-y-auto max-h-[70vh]">
                        ${dialogContent}
                    </div>
                    <div class="modal-footer">
                        <button class="nscale-btn-secondary" onclick="window.closeExplanationDialog()">Schließen</button>
                    </div>
                </div>
            </div>
        `;
  };

  // Debug-Hilfsfunktion, um zu überprüfen, ob Nachrichten Quellenreferenzen enthalten
  const debugSourceReferences = (message) => {
    console.log("Nachricht:", message);
    console.log("Hat Quellenreferenzen:", hasSourceReferences(message));
    console.log("Extrahierte Referenzen:", extractSourceReferences(message));
  };

  return {
    hasSourceReferences,
    extractSourceReferences,
    formatMessageWithSourceHighlighting,
    loadExplanation,
    showSourcesDialog,
    closeExplanationDialog,
    renderExplanationDialog,
    renderSourcePopup,
    showExplanationDialog,
    showSourcePopup,
    currentExplanation,
    explanationLoading,
    debugSourceReferences,
  };
}
