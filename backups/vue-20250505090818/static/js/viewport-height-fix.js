/**
 * Viewport-Höhen-Fix für Mobile Browser
 * 
 * Löst das Problem, dass 100vh in mobilen Browsern nicht korrekt funktioniert,
 * da die Browser-UI (Adressleiste, Tabs) die tatsächliche Höhe verändert.
 * 
 * Dieser Fix setzt eine CSS-Variable --vh auf die tatsächliche Höhe des Viewports,
 * die dann mit calc(var(--vh, 1vh) * 100) verwendet werden kann.
 */

(function() {
    // Funktion zum Setzen der --vh Variable
    function setViewportHeight() {
        // Tatsächliche Viewport-Höhe ermitteln
        const vh = window.innerHeight * 0.01;
        // CSS-Variable setzen
        document.documentElement.style.setProperty('--vh', `${vh}px`);
        
        console.log(`[Viewport-Height-Fix] Viewport-Höhe aktualisiert: ${window.innerHeight}px (--vh: ${vh}px)`);
    }
    
    // Sofort ausführen
    setViewportHeight();
    
    // Bei Größenänderung des Fensters aktualisieren
    window.addEventListener('resize', function() {
        // Verzögerung hinzufügen, um unnötige Updates zu vermeiden
        if (this.resizeTimer) clearTimeout(this.resizeTimer);
        this.resizeTimer = setTimeout(function() {
            setViewportHeight();
        }, 200);
    });
    
    // Bei Orientierungswechsel aktualisieren (besonders wichtig auf Mobilgeräten)
    window.addEventListener('orientationchange', function() {
        // Kurze Verzögerung, um sicherzustellen, dass die Änderung abgeschlossen ist
        setTimeout(setViewportHeight, 200);
    });
    
    // MutationObserver hinzufügen, um Höhe anzupassen, wenn neue Elemente hinzugefügt werden
    // Dies ist besonders wichtig für dynamisch geladene Inhalte
    if ('MutationObserver' in window) {
        const observer = new MutationObserver(function(mutations) {
            let needsUpdate = false;
            
            // Prüfen, ob relevante Änderungen vorliegen
            mutations.forEach(function(mutation) {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    needsUpdate = true;
                }
            });
            
            if (needsUpdate) {
                // Zeitverzögerung, um sicherzustellen, dass alle Änderungen abgeschlossen sind
                setTimeout(setViewportHeight, 200);
            }
        });
        
        // Den gesamten Body beobachten
        if (document.body) {
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        } else {
            console.warn('[Viewport-Height-Fix] document.body nicht verfügbar, verzögere Beobachtung');
            document.addEventListener('DOMContentLoaded', function() {
                observer.observe(document.body, {
                    childList: true,
                    subtree: true
                });
            });
        }
    }
    
    console.log('[Viewport-Height-Fix] Initialisiert');
})();