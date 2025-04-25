/**
 * Stellt Funktionen für die Anzeige und Interaktion mit Quellenverweisen bereit
 * @param {Object} options - Konfigurationsoptionen
 * @returns {Object} - Funktionen für Quellenverweise
 */
export function setupSourceReferences(options) {
    const {
        token,
        messages,
        isLoading
    } = options;
    
    // Zustand für Erklärungsdialog
    const showExplanationDialog = Vue.ref(false);
    const currentExplanation = Vue.ref(null);
    const explanationLoading = Vue.ref(false);
    
    /**
     * Überprüft, ob eine Nachricht Quellenverweise enthält
     * @param {string} message - Der Nachrichtentext
     * @returns {boolean} - true, wenn Quellenverweise gefunden wurden
     */
    const hasSourceReferences = (message) => {
        if (!message) return false;
        
        // Suche nach verschiedenen Mustern für Quellenverweise
        // Erweitert, um alle möglichen Formate zu erkennen
        return /\(Quelle-\d+\)/.test(message) || 
               /Dokument \d+/.test(message) ||
               /Quelle(n)?:/.test(message) ||
               /Abschnitt/.test(message) ||
               /aus nscale/.test(message);
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
            /Abschnitt ['"]([^'"]+)['"]/g
        ];
        
        let sources = [];
        
        // Durchsuche alle Muster
        for (const pattern of patterns) {
            const matches = [...(message.matchAll(pattern) || [])];
            if (matches.length > 0) {
                const sourceIds = matches.map(match => match[1]);
                sources = [...sources, ...sourceIds];
            }
        }
        
        // Wenn keine spezifischen Quellen gefunden wurden, aber ein Quellenabschnitt existiert
        if (sources.length === 0 && /Quelle(n)?:/.test(message)) {
            sources.push('Quellenabschnitt');
        }
        
        // Entferne Duplikate
        return [...new Set(sources)];
    };
    
    /**
     * Formatiert Nachrichtentext mit hervorgehobenen Quellenangaben
     * @param {string} message - Der zu formatierende Nachrichtentext
     * @returns {string} - Formatierter Text mit HTML-Hervorhebungen
     */
    const formatMessageWithSourceHighlighting = (message) => {
        if (!message) return '';
        
        // Bereite den Text für die Anzeige vor
        let formattedMessage = message;
        
        // Ersetze Quellenverweise mit hervorgehobenen Spans
        formattedMessage = formattedMessage.replace(
            /\(Quelle-(\d+)\)/g, 
            '<span class="source-reference" title="Quelle $1">$&</span>'
        );
        
        // Ersetze Datei- und Abschnittsreferenzen
        formattedMessage = formattedMessage.replace(
            /(Dokument \d+) \(([^\)]+)\)/g,
            '<span class="source-reference" title="$2">$1</span>'
        );
        
        return formattedMessage;
    };
    
    /**
     * Lädt die Erklärung für eine bestimmte Nachricht
     * @param {Object} message - Die Nachricht, für die eine Erklärung geladen werden soll
     */
    const loadExplanation = async (message) => {
        console.log("loadExplanation aufgerufen mit:", message);
        
        if (!message || !message.id) {
            console.error("Ungültige Nachricht für Erklärung:", message);
            alert("Diese Nachricht kann nicht erklärt werden, da keine ID vorhanden ist.");
            return;
        }
        
        try {
            explanationLoading.value = true;
            showExplanationDialog.value = true;
            
            console.log(`Lade Erklärung für Nachricht ${message.id}...`);
            const response = await axios.get(`/api/explain/${message.id}`);
            
            currentExplanation.value = response.data;
            console.log("Erklärung geladen:", currentExplanation.value);
        } catch (error) {
            console.error("Fehler beim Laden der Erklärung:", error);
            currentExplanation.value = {
                original_question: message.message,
                explanation_text: "Es ist ein Fehler bei der Erklärung aufgetreten. Bitte versuchen Sie es später erneut."
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
                cursor: help;
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
        `;
        
        // Theme-spezifische Styles
        const themeStyles = document.body.classList.contains('theme-dark') 
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
            `
            : document.body.classList.contains('theme-contrast')
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
     * Rendert Erklärungsdialog für die Anzeige
     * @returns {string} - HTML für den Erklärungsdialog
     */
    const renderExplanationDialog = () => {
        if (!showExplanationDialog.value) return '';
        
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
                        <h2 class="text-xl font-semibold mb-4">Antwort-Erklärung</h2>
                        
                        <div class="mb-4">
                            <h3 class="font-medium text-sm text-gray-600">Ursprüngliche Frage:</h3>
                            <p class="p-2 bg-gray-50 rounded">${currentExplanation.value.original_question}</p>
                        </div>
                        
                        <div class="mb-4">
                            <h3 class="font-medium text-sm text-gray-600">Verwendete Quellen:</h3>
                            <div class="p-3 bg-gray-50 rounded">
                                ${currentExplanation.value.source_references && currentExplanation.value.source_references.length
                                    ? currentExplanation.value.source_references.map((source, index) => `
                                        <div class="mb-2 pb-2 ${index < currentExplanation.value.source_references.length - 1 ? 'border-b border-gray-200' : ''}">
                                            <div class="flex justify-between">
                                                <span class="font-medium">${source.source_id}</span>
                                                <span class="text-sm text-gray-500">${source.usage_count || 0}× verwendet</span>
                                            </div>
                                            <p class="text-sm">Datei: ${source.file}</p>
                                            ${source.title ? `<p class="text-sm">Abschnitt: ${source.title}</p>` : ''}
                                            <div class="mt-1 text-xs bg-white p-2 rounded border border-gray-200">
                                                ${source.preview || 'Keine Vorschau verfügbar'}
                                            </div>
                                        </div>
                                    `).join('')
                                    : '<p class="text-sm text-gray-500">Keine Quellen gefunden.</p>'
                                }
                            </div>
                        </div>
                        
                        <div class="mt-4">
                            <h3 class="font-medium text-sm text-gray-600">Erläuterung:</h3>
                            <div class="p-3 bg-gray-50 rounded whitespace-pre-line">
                                ${currentExplanation.value.explanation_text || 'Keine Erläuterung verfügbar.'}
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
    
    /**
     * Rendert Quellenbuttons für eine Nachricht
     * @param {Object} message - Die Nachricht
     * @returns {string} - HTML für die Quellenbuttons
     */
    const renderSourceButtons = (message) => {
        if (!message || message.is_user || !hasSourceReferences(message.message)) {
            return '';
        }
        
        const sourceRefs = extractSourceReferences(message.message);
        const sourceCount = sourceRefs.length;
        
        return `
            <div class="source-buttons">
                <button class="source-btn" onclick="window.loadExplanation(${JSON.stringify({id: message.id})})">
                    <i class="fas fa-info-circle"></i>
                    Antwort erklären
                </button>
                <button class="source-btn" onclick="window.showSourcesDialog(${JSON.stringify({id: message.id})})">
                    <i class="fas fa-bookmark"></i>
                    Quellen anzeigen (${sourceCount})
                </button>
            </div>
        `;
    };
    
    // Globale Funktionen registrieren für HTML onclick-Ereignisse
    window.loadExplanation = loadExplanation;
    window.showSourcesDialog = showSourcesDialog;
    window.closeExplanationDialog = closeExplanationDialog;
    
    // Initialisierende Aktionen
    // CSS für Quellenhervorhebung einfügen
    const injectStylesIntoHead = () => {
        const styleElement = document.createElement('style');
        styleElement.id = 'source-references-styles';
        styleElement.innerHTML = getSourceHighlightingStyles();
        document.head.appendChild(styleElement);
        
        // Beobachte Theme-Änderungen und aktualisiere Styles entsprechend
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName === 'class' && mutation.target === document.body) {
                    // Theme hat sich geändert, aktualisiere Styles
                    const existingStyle = document.getElementById('source-references-styles');
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
        renderSourceButtons,
        showExplanationDialog,
        currentExplanation,
        explanationLoading,
        debugSourceReferences
    };
}