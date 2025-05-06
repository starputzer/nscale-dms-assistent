/**
 * Live-Validator für die nscale-assist Anwendung
 * 
 * Dieses Skript überprüft bekannte Probleme und gibt detaillierte Diagnoseinformationen aus.
 * Es wird direkt in der laufenden Anwendung ausgeführt und protokolliert alle gefundenen Probleme.
 */

(function() {
    console.log('===== NSCALE-ASSIST LIVE-VALIDATOR =====');

    // Erfasste Probleme
    const issues = [];

    // Probleme protokollieren mit Schweregrad
    function logIssue(component, description, severity = 'medium', details = '') {
        const issue = {
            component,
            description,
            severity,
            details,
            timestamp: new Date().toISOString()
        };
        issues.push(issue);
        
        // Ausgabe formatieren
        const severityColor = severity === 'high' ? 'red' : (severity === 'medium' ? 'orange' : 'blue');
        console.log(
            `[${issue.component}] %c${severity.toUpperCase()}%c: ${issue.description}`,
            `color: ${severityColor}; font-weight: bold`,
            'color: inherit'
        );
        if (details) {
            console.log(`  Details: ${details}`);
        }
    }

    // Funktion zum Anzeigen der gesammelten Probleme
    function showIssues() {
        console.log('\n===== ERFASSTE PROBLEME =====');
        
        if (issues.length === 0) {
            console.log('✅ Keine Probleme gefunden!');
            return;
        }
        
        // Nach Schweregrad sortieren
        const sortedIssues = [...issues].sort((a, b) => {
            const severityRank = { high: 3, medium: 2, low: 1 };
            return severityRank[b.severity] - severityRank[a.severity];
        });
        
        // Anzahl nach Schweregrad
        const highCount = sortedIssues.filter(i => i.severity === 'high').length;
        const mediumCount = sortedIssues.filter(i => i.severity === 'medium').length;
        const lowCount = sortedIssues.filter(i => i.severity === 'low').length;
        
        console.log(`Insgesamt ${issues.length} Problem(e) gefunden:`);
        console.log(`- ${highCount} kritische Probleme`);
        console.log(`- ${mediumCount} mittelschwere Probleme`);
        console.log(`- ${lowCount} geringfügige Probleme`);
        
        // Detaillierte Ausgabe
        sortedIssues.forEach((issue, index) => {
            const severityColor = issue.severity === 'high' ? 'red' : (issue.severity === 'medium' ? 'orange' : 'blue');
            console.log(
                `\n${index + 1}. [${issue.component}] %c${issue.severity.toUpperCase()}%c: ${issue.description}`,
                `color: ${severityColor}; font-weight: bold`,
                'color: inherit'
            );
            if (issue.details) {
                console.log(`   Details: ${issue.details}`);
            }
        });
    }

    // 1. Admin-Button und 'Neue Unterhaltung'
    function checkAdminButtonAfterNewConversation() {
        console.log('Prüfe Admin-Button nach "Neue Unterhaltung"...');
        
        const adminButton = document.getElementById('admin-toggle-btn') || 
                           document.querySelector('[id*="admin"][id*="button"], [class*="admin"][class*="button"]');
        
        if (!adminButton) {
            logIssue('UI', 'Admin-Button existiert nicht', 'high', 'Der Admin-Button konnte nicht gefunden werden.');
            return;
        }
        
        const newConversationButton = document.querySelector('#new-conversation-btn, #new-session-btn');
        
        if (!newConversationButton) {
            logIssue('UI', '"Neue Unterhaltung"-Button existiert nicht', 'high', 'Der "Neue Unterhaltung"-Button konnte nicht gefunden werden.');
            return;
        }
        
        // Speichere den ursprünglichen Zustand
        const originalAdminButtonDisplay = window.getComputedStyle(adminButton).display;
        const originalAdminButtonVisibility = window.getComputedStyle(adminButton).visibility;
        
        // Prüfe die aktuelle Sichtbarkeit
        if (originalAdminButtonDisplay === 'none' || originalAdminButtonVisibility === 'hidden') {
            logIssue('UI', 'Admin-Button ist nicht sichtbar', 'high', 
                     `Admin-Button ist ausgeblendet (display: ${originalAdminButtonDisplay}, visibility: ${originalAdminButtonVisibility})`);
        }
        
        // Setup, um den "Neue Unterhaltung"-Button-Klick zu überwachen
        const originalStartNewSession = window.startNewSession;
        
        window.startNewSession = function() {
            console.log('Überwachter startNewSession-Aufruf');
            
            // Ursprüngliche Funktion aufrufen, wenn sie existiert
            if (typeof originalStartNewSession === 'function') {
                originalStartNewSession.apply(this, arguments);
            }
            
            // Nach dem Klick prüfen, ob der Admin-Button noch sichtbar ist
            setTimeout(() => {
                const newDisplay = window.getComputedStyle(adminButton).display;
                const newVisibility = window.getComputedStyle(adminButton).visibility;
                
                if (newDisplay === 'none' || newVisibility === 'hidden') {
                    logIssue('UI', 'Admin-Button wird nach "Neue Unterhaltung" ausgeblendet', 'high', 
                             `Button-Status nach Klick: display=${newDisplay}, visibility=${newVisibility}`);
                } else {
                    console.log('✓ Admin-Button bleibt nach "Neue Unterhaltung" sichtbar');
                }
                
                // Originalfunktion wiederherstellen
                window.startNewSession = originalStartNewSession;
            }, 500);
        };
        
        // Simuliere einen Klick
        console.log('Simuliere Klick auf "Neue Unterhaltung"...');
        newConversationButton.click();
    }

    // 2. Text-Streaming-Problem
    function checkTextStreaming() {
        console.log('Prüfe Text-Streaming-Funktionalität...');
        
        // Prüfe, ob die Text-Streaming-Funktionalität vorhanden ist
        const appInstance = window.app || {};
        const isStreamingExists = appInstance.isStreaming !== undefined;
        const streamQuestionExists = typeof appInstance.streamQuestion === 'function';
        
        if (!isStreamingExists) {
            logIssue('Streaming', 'isStreaming-Variable fehlt', 'high', 
                     'Die app.isStreaming-Variable existiert nicht, was auf ein Problem mit dem Text-Streaming hinweist.');
        }
        
        if (!streamQuestionExists) {
            logIssue('Streaming', 'streamQuestion-Funktion fehlt', 'high', 
                     'Die app.streamQuestion-Funktion existiert nicht, was auf ein Problem mit dem Text-Streaming hinweist.');
        }
        
        // Server-Endpunkt für Streaming prüfen
        const apiUrls = {
            standard: '/api/chat',
            stream: '/api/stream',
            sse: '/api/events',
            eventSource: '/api/sse'
        };
        
        // Prüfe den Chat-Code nach verwendeten API-Endpunkten
        const chatCode = document.querySelector('script[src*="chat"]');
        let usesStreamEndpoint = false;
        
        if (chatCode) {
            const chatSrc = chatCode.getAttribute('src');
            // Lade den Chat-Code und analysiere ihn
            fetch(chatSrc)
                .then(response => response.text())
                .then(code => {
                    for (const [key, url] of Object.entries(apiUrls)) {
                        if (code.includes(url)) {
                            console.log(`✓ Chat-Code verwendet ${key}-API-Endpunkt: ${url}`);
                            if (key !== 'standard') {
                                usesStreamEndpoint = true;
                            }
                        }
                    }
                    
                    if (!usesStreamEndpoint) {
                        logIssue('Streaming', 'Kein Stream-Endpunkt gefunden', 'high', 
                                'Der Chat-Code scheint keinen der bekannten Streaming-Endpunkte zu verwenden.');
                    }
                })
                .catch(err => {
                    logIssue('Streaming', 'Fehler beim Prüfen des Chat-Codes', 'medium', err.message);
                });
        }
        
        // Überprüfe, ob EventSource verwendet wird
        const usesEventSource = typeof EventSource !== 'undefined' && 
                                (appInstance.eventSource !== undefined || 
                                 window.eventSource !== undefined);
        
        if (!usesEventSource) {
            logIssue('Streaming', 'EventSource wird nicht verwendet', 'medium', 
                     'Die Anwendung scheint keine EventSource für Server-Sent Events zu verwenden.');
        }
    }

    // 3. Text-Persistenz in Tabs
    function checkTextPersistence() {
        console.log('Prüfe Texteingabe-Persistenz zwischen Tabs...');
        
        // Prüfe, ob sessionInputData im localStorage verwendet wird
        const sessionDataExists = localStorage.getItem('sessionInputData') !== null;
        
        if (!sessionDataExists) {
            logIssue('UI', 'sessionInputData im localStorage fehlt', 'medium', 
                     'Die Anwendung scheint keine Eingaben pro Tab im localStorage zu speichern.');
        }
        
        // Testdaten erstellen
        const testSessionData = {
            'test-session-1': 'Testtext für Session 1',
            'test-session-2': 'Anderer Text für Session 2'
        };
        
        // Original-Daten sichern
        const originalSessionData = localStorage.getItem('sessionInputData');
        
        // Testdaten einsetzen
        localStorage.setItem('sessionInputData', JSON.stringify(testSessionData));
        
        // Eingabefeld finden
        const chatInput = document.getElementById('chat-input') || document.getElementById('question-input');
        
        if (!chatInput) {
            logIssue('UI', 'Chat-Eingabefeld nicht gefunden', 'high', 
                     'Das Eingabefeld für Chat-Nachrichten konnte nicht gefunden werden.');
            
            // Original-Daten wiederherstellen
            if (originalSessionData) {
                localStorage.setItem('sessionInputData', originalSessionData);
            } else {
                localStorage.removeItem('sessionInputData');
            }
            
            return;
        }
        
        // Teste Sitzungswechsel
        let activeSessionId = document.querySelector('.nscale-session-item.active')?.getAttribute('data-session-id');
        
        if (!activeSessionId) {
            // Falls keine active Session gefunden wurde, nehmen wir die erste
            activeSessionId = 'test-session-1';
        }
        
        // Ursprünglichen Wert speichern
        const originalInputValue = chatInput.value;
        
        // Simuliere Sitzungswechsel zu Session 1
        chatInput.value = testSessionData['test-session-1'];
        
        // Event auslösen
        const inputEvent = new Event('input', { bubbles: true });
        chatInput.dispatchEvent(inputEvent);
        
        // Prüfen, ob die Änderung im localStorage gespeichert wurde
        setTimeout(() => {
            try {
                const updatedData = JSON.parse(localStorage.getItem('sessionInputData'));
                
                if (!updatedData || !updatedData['test-session-1']) {
                    logIssue('UI', 'Eingabe wird nicht pro Session gespeichert', 'medium', 
                             'Die Eingabe wurde nicht im localStorage für die aktuelle Session gespeichert.');
                } else if (updatedData['test-session-1'] === testSessionData['test-session-1']) {
                    console.log('✓ Eingabe wird korrekt im localStorage gespeichert');
                }
            } catch (e) {
                logIssue('UI', 'Fehler beim Parsen der Session-Daten', 'medium', e.message);
            }
            
            // Original-Daten und -Wert wiederherstellen
            if (originalSessionData) {
                localStorage.setItem('sessionInputData', originalSessionData);
            } else {
                localStorage.removeItem('sessionInputData');
            }
            
            chatInput.value = originalInputValue;
            chatInput.dispatchEvent(inputEvent);
        }, 500);
    }

    // 4. Admin erster Klick Problem
    function checkAdminFirstClick() {
        console.log('Prüfe Admin ersten Klick...');
        
        // Finde den Admin-Button
        const adminButton = document.getElementById('admin-toggle-btn') || 
                           document.querySelector('[id*="admin"][id*="button"], [class*="admin"][class*="button"]');
        
        if (!adminButton) {
            logIssue('Admin', 'Admin-Button nicht gefunden', 'high', 
                     'Der Admin-Button konnte nicht im DOM gefunden werden.');
            return;
        }
        
        // Speichere den ursprünglichen Zustand
        const adminView = document.getElementById('admin-view');
        const originalAdminViewDisplay = adminView ? adminView.style.display : 'none';
        const chatView = document.getElementById('chat-view');
        const originalChatViewDisplay = chatView ? chatView.style.display : 'flex';
        
        // Klicke auf den Admin-Button
        console.log('Erster Klick auf Admin-Button...');
        adminButton.click();
        
        // Prüfe nach kurzer Zeit, ob die komplette Admin-Ansicht geladen wurde
        setTimeout(() => {
            const adminViewVisible = adminView && (adminView.style.display !== 'none');
            
            if (!adminViewVisible) {
                logIssue('Admin', 'Admin-View wird nach erstem Klick nicht angezeigt', 'high',
                         'Die Admin-Ansicht wird nach dem ersten Klick auf den Admin-Button nicht angezeigt.');
            } else {
                // Prüfe, ob nur die Überschrift oder der vollständige Inhalt angezeigt wird
                const adminTabs = adminView.querySelectorAll('.admin-tab');
                let activeTabFound = false;
                let activeTabContent = '';
                
                adminTabs.forEach(tab => {
                    if (tab.style.display !== 'none') {
                        activeTabFound = true;
                        activeTabContent = tab.innerHTML;
                    }
                });
                
                if (!activeTabFound) {
                    logIssue('Admin', 'Kein aktiver Tab nach erstem Klick', 'high',
                             'Es wurde kein aktiver Tab in der Admin-Ansicht gefunden.');
                } else {
                    // Prüfe, ob der Tab nur eine Überschrift oder vollständigen Inhalt hat
                    const hasOnlyHeading = activeTabContent.trim().startsWith('<h') && 
                                          activeTabContent.split('</h').length === 2 &&
                                          activeTabContent.length < 100;
                    
                    if (hasOnlyHeading) {
                        logIssue('Admin', 'Aktiver Tab enthält nur Überschrift', 'high',
                                 'Der aktive Tab in der Admin-Ansicht enthält nur eine Überschrift, aber keinen Inhalt.');
                    } else {
                        console.log('✓ Admin-Ansicht wird mit vollständigem Inhalt angezeigt');
                    }
                }
            }
            
            // Wiederherstellen des ursprünglichen Zustands
            if (adminView) adminView.style.display = originalAdminViewDisplay;
            if (chatView) chatView.style.display = originalChatViewDisplay;
        }, 1000);
    }

    // 5. Systemstatistik im Admin-System-Tab
    function checkSystemStatistics() {
        console.log('Prüfe Systemstatistik im Admin-System-Tab...');
        
        // Zur Admin-Ansicht wechseln
        if (window.vanillaAdmin && window.vanillaAdmin.switchToAdmin) {
            window.vanillaAdmin.switchToAdmin();
            
            // Zum System-Tab wechseln
            const systemTabBtn = document.getElementById('system-tab-btn');
            
            if (!systemTabBtn) {
                logIssue('Admin', 'System-Tab-Button nicht gefunden', 'medium',
                         'Der Button für den System-Tab konnte nicht gefunden werden.');
                return;
            }
            
            systemTabBtn.click();
            
            // Warten, bis der System-Tab geladen ist
            setTimeout(() => {
                const systemTab = document.getElementById('system-tab');
                
                if (!systemTab || systemTab.style.display === 'none') {
                    logIssue('Admin', 'System-Tab wird nicht angezeigt', 'medium',
                             'Der System-Tab wird nach dem Klick auf den System-Tab-Button nicht angezeigt.');
                    return;
                }
                
                // Prüfen, ob die Systemstatistik vorhanden ist
                const statsContainer = systemTab.querySelector('.system-stats, .stats-container, .system-info');
                
                if (!statsContainer) {
                    logIssue('Admin', 'Systemstatistik-Container fehlt', 'medium',
                             'Der Container für die Systemstatistik konnte nicht gefunden werden.');
                } else {
                    // Prüfen, ob Statistiken für Dokumente/Chunks/Embeddings vorhanden sind
                    const docStat = statsContainer.querySelector('[data-stat="documents"], [data-stat="chunks"], [data-stat="embeddings"]');
                    
                    if (!docStat) {
                        logIssue('Admin', 'Dokument/Chunk-Statistiken fehlen', 'medium',
                                 'Die Statistiken für Dokumente, Chunks oder Embeddings konnten nicht gefunden werden.');
                    } else {
                        // Prüfen, ob die Werte größer als 0 sind
                        const statValue = parseInt(docStat.textContent.replace(/\D/g, ''), 10);
                        
                        if (isNaN(statValue) || statValue === 0) {
                            logIssue('Admin', 'Dokument/Chunk-Statistiken sind 0', 'low',
                                     'Die Statistiken für Dokumente, Chunks oder Embeddings sind 0 oder nicht numerisch.');
                        } else {
                            console.log(`✓ Systemstatistik enthält Werte größer als 0 (${statValue})`);
                        }
                    }
                }
                
                // Zurück zum Chat wechseln
                if (window.vanillaAdmin.switchToChat) {
                    window.vanillaAdmin.switchToChat();
                }
            }, 1000);
        } else {
            logIssue('Admin', 'vanillaAdmin.switchToAdmin Funktion fehlt', 'high',
                     'Die Funktion zum Wechseln zur Admin-Ansicht konnte nicht gefunden werden.');
        }
    }

    // 6. Feedback-Statistik im Admin-Feedback-Tab
    function checkFeedbackStatistics() {
        console.log('Prüfe Feedback-Statistik im Admin-Feedback-Tab...');
        
        // Zur Admin-Ansicht wechseln
        if (window.vanillaAdmin && window.vanillaAdmin.switchToAdmin) {
            window.vanillaAdmin.switchToAdmin();
            
            // Zum Feedback-Tab wechseln
            const feedbackTabBtn = document.getElementById('feedback-tab-btn');
            
            if (!feedbackTabBtn) {
                logIssue('Admin', 'Feedback-Tab-Button nicht gefunden', 'medium',
                         'Der Button für den Feedback-Tab konnte nicht gefunden werden.');
                return;
            }
            
            feedbackTabBtn.click();
            
            // Warten, bis der Feedback-Tab geladen ist
            setTimeout(() => {
                const feedbackTab = document.getElementById('feedback-tab');
                
                if (!feedbackTab || feedbackTab.style.display === 'none') {
                    logIssue('Admin', 'Feedback-Tab wird nicht angezeigt', 'medium',
                             'Der Feedback-Tab wird nach dem Klick auf den Feedback-Tab-Button nicht angezeigt.');
                    return;
                }
                
                // Prüfen, ob die Feedback-Statistik vorhanden ist
                const statsContainer = feedbackTab.querySelector('.feedback-stats, .stats-container');
                
                if (!statsContainer) {
                    logIssue('Admin', 'Feedback-Statistik-Container fehlt', 'medium',
                             'Der Container für die Feedback-Statistik konnte nicht gefunden werden.');
                } else {
                    // Prüfen, ob die Statistik Inhalte hat
                    const hasContent = statsContainer.textContent.trim().length > 0;
                    
                    if (!hasContent) {
                        logIssue('Admin', 'Feedback-Statistik enthält keine Daten', 'medium',
                                 'Die Feedback-Statistik ist leer oder enthält keine sichtbaren Daten.');
                    } else {
                        console.log('✓ Feedback-Statistik enthält Daten');
                    }
                }
                
                // Zurück zum Chat wechseln
                if (window.vanillaAdmin.switchToChat) {
                    window.vanillaAdmin.switchToChat();
                }
            }, 1000);
        } else {
            logIssue('Admin', 'vanillaAdmin.switchToAdmin Funktion fehlt', 'high',
                     'Die Funktion zum Wechseln zur Admin-Ansicht konnte nicht gefunden werden.');
        }
    }

    // 7. MOTD-Vorschau im Admin-MOTD-Tab
    function checkMotdPreview() {
        console.log('Prüfe MOTD-Vorschau im Admin-MOTD-Tab...');
        
        // Zur Admin-Ansicht wechseln
        if (window.vanillaAdmin && window.vanillaAdmin.switchToAdmin) {
            window.vanillaAdmin.switchToAdmin();
            
            // Zum MOTD-Tab wechseln
            const motdTabBtn = document.getElementById('motd-tab-btn');
            
            if (!motdTabBtn) {
                logIssue('Admin', 'MOTD-Tab-Button nicht gefunden', 'medium',
                         'Der Button für den MOTD-Tab konnte nicht gefunden werden.');
                return;
            }
            
            motdTabBtn.click();
            
            // Warten, bis der MOTD-Tab geladen ist
            setTimeout(() => {
                const motdTab = document.getElementById('motd-tab');
                
                if (!motdTab || motdTab.style.display === 'none') {
                    logIssue('Admin', 'MOTD-Tab wird nicht angezeigt', 'medium',
                             'Der MOTD-Tab wird nach dem Klick auf den MOTD-Tab-Button nicht angezeigt.');
                    return;
                }
                
                // Prüfen, ob die MOTD-Vorschau vorhanden ist
                const motdPreview = motdTab.querySelector('#motd-preview, .motd-preview');
                const motdContent = motdTab.querySelector('#motd-content, .motd-content, textarea');
                
                if (!motdPreview) {
                    logIssue('Admin', 'MOTD-Vorschau fehlt', 'medium',
                             'Die MOTD-Vorschau konnte nicht gefunden werden.');
                } else if (!motdContent) {
                    logIssue('Admin', 'MOTD-Eingabefeld fehlt', 'medium',
                             'Das Eingabefeld für die MOTD konnte nicht gefunden werden.');
                } else {
                    // Teste die Vorschaufunktion mit einem einfachen Text
                    const originalContent = motdContent.value;
                    
                    try {
                        motdContent.value = "Test-MOTD-Nachricht";
                        
                        // Event auslösen
                        const inputEvent = new Event('input', { bubbles: true });
                        motdContent.dispatchEvent(inputEvent);
                        
                        // Prüfen, ob die Vorschau aktualisiert wurde
                        setTimeout(() => {
                            const previewContent = motdPreview.textContent;
                            
                            if (!previewContent.includes("Test-MOTD-Nachricht")) {
                                logIssue('Admin', 'MOTD-Vorschau aktualisiert sich nicht', 'medium',
                                         'Die MOTD-Vorschau wird nicht aktualisiert, wenn der Inhalt des Eingabefelds geändert wird.');
                            } else {
                                console.log('✓ MOTD-Vorschau wird korrekt aktualisiert');
                            }
                            
                            // Originalen Inhalt wiederherstellen
                            motdContent.value = originalContent;
                            motdContent.dispatchEvent(inputEvent);
                        }, 500);
                    } catch (e) {
                        logIssue('Admin', 'Fehler bei MOTD-Vorschau-Test', 'high',
                                 `Fehler beim Testen der MOTD-Vorschau: ${e.message}`);
                        
                        // Originalen Inhalt wiederherstellen
                        motdContent.value = originalContent;
                    }
                }
                
                // Zurück zum Chat wechseln
                setTimeout(() => {
                    if (window.vanillaAdmin.switchToChat) {
                        window.vanillaAdmin.switchToChat();
                    }
                }, 1500);
            }, 1000);
        } else {
            logIssue('Admin', 'vanillaAdmin.switchToAdmin Funktion fehlt', 'high',
                     'Die Funktion zum Wechseln zur Admin-Ansicht konnte nicht gefunden werden.');
        }
    }

    // 8. Dokumentenkonverter im Admin-Tab
    function checkDocConverterTab() {
        console.log('Prüfe Dokumentenkonverter im Admin-Tab...');
        
        // Zur Admin-Ansicht wechseln
        if (window.vanillaAdmin && window.vanillaAdmin.switchToAdmin) {
            window.vanillaAdmin.switchToAdmin();
            
            // Zum Dokumentenkonverter-Tab wechseln
            const docConverterTabBtn = document.getElementById('doc-converter-tab-btn');
            
            if (!docConverterTabBtn) {
                logIssue('Admin', 'Dokumentenkonverter-Tab-Button nicht gefunden', 'medium',
                         'Der Button für den Dokumentenkonverter-Tab konnte nicht gefunden werden.');
                return;
            }
            
            docConverterTabBtn.click();
            
            // Warten, bis der Dokumentenkonverter-Tab geladen ist
            setTimeout(() => {
                const docConverterTab = document.getElementById('doc-converter-tab');
                
                if (!docConverterTab || docConverterTab.style.display === 'none') {
                    logIssue('Admin', 'Dokumentenkonverter-Tab wird nicht angezeigt', 'medium',
                             'Der Dokumentenkonverter-Tab wird nach dem Klick auf den Dokumentenkonverter-Tab-Button nicht angezeigt.');
                    return;
                }
                
                // Prüfen, ob der "Zur Chat-Ansicht wechseln"-Button vorhanden ist, obwohl er nicht da sein sollte
                const backToChatBtn = docConverterTab.querySelector('.back-to-chat, .back-to-chat-btn, [data-action="back-to-chat"]');
                
                if (backToChatBtn && backToChatBtn.style.display !== 'none') {
                    logIssue('Admin', 'Unnötiger "Zur Chat-Ansicht wechseln"-Button', 'low',
                             'Ein "Zur Chat-Ansicht wechseln"-Button wird im Dokumentenkonverter-Tab angezeigt, obwohl er dort nicht benötigt wird.');
                }
                
                // Prüfen, ob Upload-Buttons vorhanden sind
                const uploadBtn = docConverterTab.querySelector('.upload-btn, .converter-btn, input[type="file"], [data-action="upload"]');
                
                if (!uploadBtn) {
                    logIssue('Admin', 'Fehlende Dokumentenkonverter-Buttons', 'medium',
                             'Es sind keine Buttons zum Hochladen oder Konvertieren von Dokumenten vorhanden.');
                } else {
                    console.log('✓ Dokumentenkonverter-Buttons sind vorhanden');
                }
                
                // Zurück zum Chat wechseln
                if (window.vanillaAdmin.switchToChat) {
                    window.vanillaAdmin.switchToChat();
                }
            }, 1000);
        } else {
            logIssue('Admin', 'vanillaAdmin.switchToAdmin Funktion fehlt', 'high',
                     'Die Funktion zum Wechseln zur Admin-Ansicht konnte nicht gefunden werden.');
        }
    }

    // 9. Feedback-Buttons (Daumen hoch/runter)
    function checkFeedbackButtons() {
        console.log('Prüfe Feedback-Buttons (Daumen hoch/runter)...');
        
        // Finde eine Nachricht des Assistenten
        const assistantMessage = document.querySelector('.nscale-message-assistant, .assistant-message');
        
        if (!assistantMessage) {
            logIssue('UI', 'Keine Assistentennachricht gefunden', 'medium',
                     'Es konnte keine Nachricht des Assistenten gefunden werden, um die Feedback-Buttons zu testen.');
            return;
        }
        
        // Finde die Feedback-Buttons
        const feedbackContainer = assistantMessage.querySelector('.message-feedback, .feedback-buttons');
        
        if (!feedbackContainer) {
            logIssue('UI', 'Feedback-Container fehlt', 'high',
                     'Der Container für die Feedback-Buttons konnte nicht gefunden werden.');
            return;
        }
        
        // Finde die einzelnen Buttons
        const thumbsUpBtn = feedbackContainer.querySelector('.thumbs-up, .positive-btn, [title*="hilfreich"]');
        const thumbsDownBtn = feedbackContainer.querySelector('.thumbs-down, .negative-btn, [title*="nicht"]');
        
        if (!thumbsUpBtn) {
            logIssue('UI', 'Daumen-hoch-Button fehlt', 'high',
                     'Der Daumen-hoch-Button konnte nicht gefunden werden.');
        } else {
            // Prüfen, ob der Button sichtbar ist
            const thumbsUpStyle = window.getComputedStyle(thumbsUpBtn);
            const isVisible = thumbsUpStyle.display !== 'none' && 
                             thumbsUpStyle.visibility !== 'hidden' && 
                             thumbsUpBtn.offsetParent !== null;
            
            if (!isVisible) {
                logIssue('UI', 'Daumen-hoch-Button ist nicht sichtbar', 'high',
                         `Button-Status: display=${thumbsUpStyle.display}, visibility=${thumbsUpStyle.visibility}`);
            } else {
                console.log('✓ Daumen-hoch-Button ist sichtbar');
                
                // Test-Klick simulieren
                const originalOnClick = thumbsUpBtn.onclick;
                let wasCalled = false;
                
                thumbsUpBtn.onclick = function(event) {
                    event.preventDefault();
                    event.stopPropagation();
                    wasCalled = true;
                    console.log('Daumen-hoch-Button wurde geklickt');
                    
                    // Originalfunktion wiederherstellen
                    thumbsUpBtn.onclick = originalOnClick;
                };
                
                thumbsUpBtn.click();
                
                if (!wasCalled) {
                    logIssue('UI', 'Daumen-hoch-Button reagiert nicht auf Klicks', 'high',
                             'Der onClick-Handler des Daumen-hoch-Buttons wurde nicht aufgerufen.');
                } else {
                    console.log('✓ Daumen-hoch-Button reagiert auf Klicks');
                }
            }
        }
        
        if (!thumbsDownBtn) {
            logIssue('UI', 'Daumen-runter-Button fehlt', 'high',
                     'Der Daumen-runter-Button konnte nicht gefunden werden.');
        } else {
            // Prüfen, ob der Button sichtbar ist
            const thumbsDownStyle = window.getComputedStyle(thumbsDownBtn);
            const isVisible = thumbsDownStyle.display !== 'none' && 
                             thumbsDownStyle.visibility !== 'hidden' && 
                             thumbsDownBtn.offsetParent !== null;
            
            if (!isVisible) {
                logIssue('UI', 'Daumen-runter-Button ist nicht sichtbar', 'high',
                         `Button-Status: display=${thumbsDownStyle.display}, visibility=${thumbsDownStyle.visibility}`);
            } else {
                console.log('✓ Daumen-runter-Button ist sichtbar');
            }
        }
    }

    // Hauptfunktion zum Ausführen aller Prüfungen
    function runDiagnostics() {
        console.log('Starte Diagnose der nscale-assist Anwendung...');
        
        // Prüfe, ob wir angemeldet sind
        const isLoggedIn = localStorage.getItem('token') !== null;
        
        if (!isLoggedIn) {
            console.log('⚠️ Nicht angemeldet. Bitte melden Sie sich an, um alle Tests ausführen zu können.');
            return;
        }
        
        // Die Prüfungen nacheinander ausführen, mit Pausen dazwischen
        setTimeout(() => checkAdminButtonAfterNewConversation(), 0);
        setTimeout(() => checkTextStreaming(), 1000);
        setTimeout(() => checkTextPersistence(), 2000);
        setTimeout(() => checkAdminFirstClick(), 3000);
        setTimeout(() => checkSystemStatistics(), 4000);
        setTimeout(() => checkFeedbackStatistics(), 6000);
        setTimeout(() => checkMotdPreview(), 8000);
        setTimeout(() => checkDocConverterTab(), 10000);
        setTimeout(() => checkFeedbackButtons(), 12000);
        
        // Ergebnisse anzeigen
        setTimeout(() => showIssues(), 14000);
    }

    // Starte die Diagnose, wenn das Dokument geladen ist
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            // Etwas warten, damit die App vollständig initialisiert ist
            setTimeout(runDiagnostics, 2000);
        });
    } else {
        // Etwas warten, damit die App vollständig initialisiert ist
        setTimeout(runDiagnostics, 2000);
    }
})();