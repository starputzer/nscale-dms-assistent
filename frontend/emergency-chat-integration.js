/**
 * Emergency Chat Integration
 * 
 * This script provides a simplified way to integrate the emergency chat
 * fallback system into the application. It should be included after the main
 * application scripts.
 * 
 * Usage:
 * 1. Include this script in your HTML
 * 2. The integration will automatically monitor for chat display issues
 * 3. When issues are detected, it will activate appropriate fixes
 */

(function() {
    // Configuration 
    const CONFIG = {
        // Elements to monitor
        messageListSelector: '.message-list-container',
        chatViewSelector: '.chat-view, .chat-container',
        messageItemSelector: '.message-item',
        
        // Check interval (ms)
        diagnosticInterval: 3000,
        
        // Auto-activation threshold (how many messages in store with none rendered)
        activationThreshold: 1,
        
        // Debug mode
        debug: true,
        
        // Auto-inject CSS
        injectCSS: true,
        
        // CSS path
        cssPath: '/css/emergency-chat.css',
        
        // JS path
        jsPath: '/js/emergency-chat.js'
    };
    
    /**
     * Initialization function
     */
    function init() {
        // Check if already initialized
        if (window.EmergencyChatFixer) {
            console.log('[EmergencyChatIntegration] Emergency Chat Fixer already initialized');
            return;
        }
        
        // Load emergency CSS if not already loaded
        if (CONFIG.injectCSS) {
            injectCSS();
        }
        
        // Load emergency JS if not already loaded
        injectJS().then(() => {
            console.log('[EmergencyChatIntegration] Emergency Chat system loaded');
            
            // Start monitoring
            startMonitoring();
        }).catch(error => {
            console.error('[EmergencyChatIntegration] Error loading emergency chat system:', error);
        });
    }
    
    /**
     * Inject emergency CSS
     */
    function injectCSS() {
        // Check if already loaded
        const existingLink = document.querySelector(`link[href="${CONFIG.cssPath}"]`);
        if (existingLink) return;
        
        // Create link element
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = CONFIG.cssPath;
        link.id = 'emergency-chat-css';
        
        // Add to head
        document.head.appendChild(link);
        
        if (CONFIG.debug) {
            console.log('[EmergencyChatIntegration] Injected emergency CSS');
        }
    }
    
    /**
     * Inject emergency JS
     */
    function injectJS() {
        return new Promise((resolve, reject) => {
            // Check if already loaded
            const existingScript = document.querySelector(`script[src="${CONFIG.jsPath}"]`);
            if (existingScript) {
                resolve();
                return;
            }
            
            // Create script element
            const script = document.createElement('script');
            script.src = CONFIG.jsPath;
            script.id = 'emergency-chat-js';
            
            // Add load and error handlers
            script.onload = () => {
                if (CONFIG.debug) {
                    console.log('[EmergencyChatIntegration] Loaded emergency JS');
                }
                resolve();
            };
            
            script.onerror = (error) => {
                console.error('[EmergencyChatIntegration] Failed to load emergency JS:', error);
                reject(error);
            };
            
            // Add to body
            document.body.appendChild(script);
        });
    }
    
    /**
     * Start monitoring for chat display issues
     */
    function startMonitoring() {
        if (!window.EmergencyChatFixer) {
            console.error('[EmergencyChatIntegration] Emergency Chat Fixer not loaded');
            return;
        }
        
        // Initial check
        performDiagnostics();
        
        // Regular checks
        setInterval(performDiagnostics, CONFIG.diagnosticInterval);
        
        if (CONFIG.debug) {
            console.log('[EmergencyChatIntegration] Started monitoring for chat display issues');
        }
    }
    
    /**
     * Perform diagnostics and activate fixes if needed
     */
    async function performDiagnostics() {
        try {
            // Skip if no EmergencyChatFixer
            if (!window.EmergencyChatFixer) return;
            
            // Run diagnostics
            const diagnostics = await window.EmergencyChatFixer.runDiagnostics();
            
            // Check for activation conditions
            const needsActivation = shouldActivate(diagnostics);
            
            if (needsActivation) {
                if (CONFIG.debug) {
                    console.log('[EmergencyChatIntegration] Chat display issues detected, activating fixes', diagnostics);
                }
                
                // Apply fixes based on diagnostics
                applyFixes(diagnostics);
            }
        } catch (error) {
            console.error('[EmergencyChatIntegration] Error in diagnostics:', error);
        }
    }
    
    /**
     * Determine if emergency fixes should be activated
     */
    function shouldActivate(diagnostics) {
        // Check for message discrepancy (messages in store but none rendered)
        if (diagnostics.messageCount >= CONFIG.activationThreshold && 
            diagnostics.renderedMessageCount === 0) {
            return true;
        }
        
        // Check for CSS issues
        if (diagnostics.cssIssues && diagnostics.cssIssues.length > 0) {
            return true;
        }
        
        // Check for DOM structure issues
        if (!diagnostics.domStructureValid) {
            return true;
        }
        
        return false;
    }
    
    /**
     * Apply fixes based on diagnostic results
     */
    function applyFixes(diagnostics) {
        // Fix CSS issues first if they exist
        if (diagnostics.cssIssues && diagnostics.cssIssues.length > 0) {
            window.EmergencyChatFixer.fixCssIssues(diagnostics.cssIssues);
        }
        
        // If messages exist in store but not rendered, force display
        if (diagnostics.messageCount > 0 && diagnostics.renderedMessageCount === 0) {
            window.EmergencyChatFixer.forceMessageDisplay();
        }
        
        // If still issues, activate emergency display
        setTimeout(() => {
            checkIfFixesWorked();
        }, 1000);
    }
    
    /**
     * Check if the applied fixes resolved the issues
     */
    async function checkIfFixesWorked() {
        try {
            // Run diagnostics again
            const diagnostics = await window.EmergencyChatFixer.runDiagnostics();
            
            // If still have issues, activate emergency display
            if (diagnostics.messageCount > 0 && diagnostics.renderedMessageCount === 0) {
                window.EmergencyChatFixer.activate();
            }
        } catch (error) {
            console.error('[EmergencyChatIntegration] Error checking if fixes worked:', error);
        }
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();