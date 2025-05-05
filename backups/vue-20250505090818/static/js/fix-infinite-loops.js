/**
 * Fix für Endlosschleifen
 * Behebt Endlosschleifen in den DocConverter-Skripten
 */

(function() {
    console.log("[LoopFix] Initialisiere Endlosschleifen-Fix");
    
    // Flag zur Vermeidung von doppelter Ausführung
    if (window.infiniteLoopFixApplied) {
        console.log("[LoopFix] Fix wurde bereits angewendet");
        return;
    }
    
    // Zeitlimit für Intervalle
    const MAX_TIME = 5 * 60 * 1000; // 5 Minuten
    
    // Original-Funktionen speichern
    const originalSetInterval = window.setInterval;
    const originalSetTimeout = window.setTimeout;
    
    // Alle aktiven Intervalle tracken
    const activeIntervals = new Map();
    const activeTimeouts = new Map();
    
    // Counter für eindeutige IDs
    let idCounter = 0;
    
    // Wrapper für setInterval
    window.setInterval = function(callback, delay, ...args) {
        if (typeof callback !== 'function') {
            console.error("[LoopFix] Ungültiger callback für setInterval", callback);
            return originalSetInterval.apply(this, arguments);
        }
        
        // Eindeutige ID für dieses Intervall
        const id = ++idCounter;
        
        // Erstelle eine Wrap-Funktion, um Endlosschleifen zu vermeiden
        const wrappedCallback = function() {
            try {
                // Prüfen, ob das Intervall noch aktiv sein sollte
                const intervalInfo = activeIntervals.get(id);
                if (!intervalInfo) return;
                
                // Prüfen, ob die maximale Ausführungszeit erreicht wurde
                const currentTime = Date.now();
                if (currentTime - intervalInfo.startTime > MAX_TIME) {
                    console.warn("[LoopFix] Intervall wurde nach 5 Minuten automatisch gestoppt", intervalInfo);
                    clearInterval(intervalInfo.id);
                    activeIntervals.delete(id);
                    return;
                }
                
                // Ausführung der ursprünglichen Callback-Funktion
                return callback.apply(this, args);
            } catch (error) {
                console.error("[LoopFix] Fehler in Intervall-Callback", error);
                
                // Bei Fehler das Intervall beenden
                const intervalInfo = activeIntervals.get(id);
                if (intervalInfo) {
                    clearInterval(intervalInfo.id);
                    activeIntervals.delete(id);
                }
            }
        };
        
        // Originales Intervall erstellen
        const intervalId = originalSetInterval.call(this, wrappedCallback, delay);
        
        // Intervall in der Map speichern
        activeIntervals.set(id, {
            id: intervalId,
            callback: callback.toString().slice(0, 100),
            delay,
            startTime: Date.now(),
            stack: new Error().stack
        });
        
        return intervalId;
    };
    
    // Wrapper für setTimeout
    window.setTimeout = function(callback, delay, ...args) {
        if (typeof callback !== 'function') {
            console.error("[LoopFix] Ungültiger callback für setTimeout", callback);
            return originalSetTimeout.apply(this, arguments);
        }
        
        // Eindeutige ID für dieses Timeout
        const id = ++idCounter;
        
        // Erstelle eine Wrap-Funktion
        const wrappedCallback = function() {
            try {
                // Timeout aus der Map entfernen
                activeTimeouts.delete(id);
                
                // Ausführung der ursprünglichen Callback-Funktion
                return callback.apply(this, args);
            } catch (error) {
                console.error("[LoopFix] Fehler in Timeout-Callback", error);
            }
        };
        
        // Originales Timeout erstellen
        const timeoutId = originalSetTimeout.call(this, wrappedCallback, delay);
        
        // Nur lange Timeouts tracken
        if (delay > 10000) {
            activeTimeouts.set(id, {
                id: timeoutId,
                callback: callback.toString().slice(0, 100),
                delay,
                startTime: Date.now()
            });
        }
        
        return timeoutId;
    };
    
    // DOM Observer deaktivieren nach 2 Minuten
    setTimeout(function() {
        try {
            if (window.docConverterTabHandler && window.docConverterTabHandler.stopMonitoring) {
                console.log("[LoopFix] Stoppe docConverterTabHandler Monitoring");
                window.docConverterTabHandler.stopMonitoring();
            }
            
            if (window.pathFixer && window.pathFixer.stopMonitoring) {
                console.log("[LoopFix] Stoppe pathFixer Monitoring");
                window.pathFixer.stopMonitoring();
            }
            
            if (window.relativePathHandler && window.relativePathHandler.stopMonitoring) {
                console.log("[LoopFix] Stoppe relativePathHandler Monitoring");
                window.relativePathHandler.stopMonitoring();
            }
        } catch (error) {
            console.error("[LoopFix] Fehler beim Stoppen von Monitorings", error);
        }
    }, 2 * 60 * 1000);
    
    // Stoppe alle MutationObserver nach 3 Minuten
    setTimeout(function() {
        try {
            // Hole alle MutationObserver-Instanzen (wenn möglich)
            if (window.MutationObserver && MutationObserver.observers) {
                console.log("[LoopFix] Stoppe alle MutationObserver");
                MutationObserver.observers.forEach(observer => {
                    try { observer.disconnect(); } catch (e) {}
                });
            }
        } catch (error) {
            console.error("[LoopFix] Fehler beim Stoppen von MutationObservern", error);
        }
    }, 3 * 60 * 1000);
    
    // Flag setzen, dass Fix angewendet wurde
    window.infiniteLoopFixApplied = true;
    
    console.log("[LoopFix] Endlosschleifen-Fix wurde erfolgreich installiert");
})();