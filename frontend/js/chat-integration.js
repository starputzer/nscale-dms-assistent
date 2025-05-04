/**
 * Chat-Integration für das Feature-Toggle-System
 * Dieses Skript ermöglicht den Wechsel zwischen klassischem Chat-Interface und Vue-basiertem Chat-Interface
 */
(function() {
    console.log('Chat-Integration geladen');

    // DOM-Element für das Chat-Interface
    let chatContainer = null;
    let vueApp = null;

    // Event-Listener bei DOM-Bereitschaft
    document.addEventListener('DOMContentLoaded', function() {
        // Suche nach dem Chat-Container
        initChatInterface();
    });

    /**
     * Initialisiert das Chat-Interface basierend auf dem Feature-Toggle
     */
    function initChatInterface() {
        // Chat-Container identifizieren
        chatContainer = document.querySelector('.chat-container');
        
        if (!chatContainer) {
            console.log('Chat-Container nicht gefunden, warte auf Initialisierung...');
            // Für dynamisch geladene Container nach Navigation
            waitForChatContainer();
            return;
        }

        console.log('Chat-Container gefunden, prüfe Feature-Toggles');
        checkFeatureToggles();
    }

    /**
     * Wartet auf die Erstellung des Chat-Containers in der DOM
     */
    function waitForChatContainer() {
        // Beobachter für Änderungen im DOM
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.addedNodes && mutation.addedNodes.length > 0) {
                    for (let i = 0; i < mutation.addedNodes.length; i++) {
                        const node = mutation.addedNodes[i];
                        if (node.classList && node.classList.contains('chat-container')) {
                            console.log('Chat-Container wurde dynamisch geladen');
                            chatContainer = node;
                            observer.disconnect();
                            checkFeatureToggles();
                            return;
                        }
                    }
                }
            });
        });

        // Beobachte den gesamten Dokument-Body
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    /**
     * Prüft die Feature-Toggles und wählt die entsprechende Implementierung
     */
    function checkFeatureToggles() {
        const useNewUI = localStorage.getItem('useNewUI') === 'true';
        const useVueChat = localStorage.getItem('feature_vueChat') === 'true';
        
        console.log('Feature-Toggles für Chat:', { useNewUI, useVueChat });
        
        if (useNewUI && useVueChat) {
            console.log('Versuche Vue.js-Chat-Implementierung zu laden');
            loadVueChatImplementation();
        } else {
            console.log('Verwende klassische Chat-Implementierung');
            // Die klassische Implementierung ist bereits geladen, nichts zu tun
        }
    }

    /**
     * Lädt die Vue.js-basierte Chat-Implementierung
     */
    function loadVueChatImplementation() {
        if (!chatContainer) {
            console.error('Chat-Container nicht gefunden!');
            return;
        }

        // Zeige Lade-Indikator
        chatContainer.innerHTML = `
            <div class="loading-container p-4">
                <div class="loader-container text-center">
                    <div class="loader mx-auto mb-4"></div>
                    <p class="text-gray-600">Vue.js Chat-Interface wird geladen...</p>
                </div>
            </div>
        `;

        // Mit Timeout für Fallback
        const vueTimeout = setTimeout(function() {
            console.warn('Vue.js-Chat konnte nicht geladen werden, Fallback zur klassischen Implementierung');
            // Feature-Toggle zurücksetzen
            localStorage.setItem('feature_vueChat', 'false');
            window.location.reload();
        }, 5000);

        // Vue-Komponente laden
        const vueScript = document.createElement('script');
        vueScript.type = 'module';
        vueScript.src = '/static/vue/standalone/chat-interface.js';
        
        vueScript.onload = function() {
            console.log('Vue.js-Chat erfolgreich geladen');
            clearTimeout(vueTimeout);
        };
        
        vueScript.onerror = function() {
            console.error('Fehler beim Laden des Vue.js-Chats');
            clearTimeout(vueTimeout);
            // Feature-Toggle zurücksetzen
            localStorage.setItem('feature_vueChat', 'false');
            window.location.reload();
        };
        
        document.body.appendChild(vueScript);
    }

    // Öffentliche API
    window.chatIntegration = {
        reload: function() {
            if (chatContainer) {
                checkFeatureToggles();
            } else {
                initChatInterface();
            }
        }
    };
})();