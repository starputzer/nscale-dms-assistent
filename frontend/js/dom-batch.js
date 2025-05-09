/**
 * dom-batch.js
 * 
 * Stellt Funktionen zum optimierten Umgang mit DOM-Manipulationen bereit, 
 * indem diese gebündelt und als Batch verarbeitet werden.
 */

const DOMBatch = (function() {
    // Speichert Operationen, die ausgeführt werden sollen
    const pendingOperations = {
        classes: {},      // Klassen-Änderungen {add: [], remove: []}
        attributes: {},   // Attribut-Änderungen {key: value}
        styles: {},       // Stil-Änderungen {key: value}
        insertions: [],   // Einzufügende Elemente [{parent, element, position}]
        removals: [],     // Zu entfernende Elemente [{parent, element}]
        texts: {},        // Textänderungen {element: newText}
        visibilities: {}  // Sichtbarkeitsänderungen {element: boolean}
    };

    // Timeout-ID für den Batch-Prozess
    let batchTimeoutId = null;
    
    // Konfiguration
    const config = {
        batchDelay: 16, // ~60fps
        debug: false,
        useRequestAnimationFrame: true
    };

    /**
     * Plant die Ausführung des Batch-Prozesses
     */
    function scheduleBatch() {
        if (batchTimeoutId) {
            return; // Bereits geplant
        }
        
        if (config.useRequestAnimationFrame) {
            batchTimeoutId = requestAnimationFrame(processBatch);
        } else {
            batchTimeoutId = setTimeout(processBatch, config.batchDelay);
        }
    }

    /**
     * Führt alle ausstehenden DOM-Operationen aus
     */
    function processBatch() {
        let operationsCount = 0;
        const startTime = performance.now();

        // Verarbeite Klassen-Änderungen
        for (const elementId in pendingOperations.classes) {
            const element = document.getElementById(elementId) || 
                            findCachedElement(elementId);
            
            if (element) {
                const operations = pendingOperations.classes[elementId];
                
                if (operations.add && operations.add.length > 0) {
                    element.classList.add(...operations.add);
                    operationsCount++;
                }
                
                if (operations.remove && operations.remove.length > 0) {
                    element.classList.remove(...operations.remove);
                    operationsCount++;
                }
            }
        }

        // Verarbeite Attribut-Änderungen
        for (const elementId in pendingOperations.attributes) {
            const element = document.getElementById(elementId) || 
                            findCachedElement(elementId);
            
            if (element) {
                const attributes = pendingOperations.attributes[elementId];
                
                for (const attr in attributes) {
                    const value = attributes[attr];
                    
                    if (value === null || value === undefined) {
                        element.removeAttribute(attr);
                    } else {
                        element.setAttribute(attr, value);
                    }
                    operationsCount++;
                }
            }
        }

        // Verarbeite Stil-Änderungen
        for (const elementId in pendingOperations.styles) {
            const element = document.getElementById(elementId) || 
                            findCachedElement(elementId);
            
            if (element) {
                const styles = pendingOperations.styles[elementId];
                
                for (const prop in styles) {
                    element.style[prop] = styles[prop];
                    operationsCount++;
                }
            }
        }

        // Verarbeite Einfügungen
        for (const insertion of pendingOperations.insertions) {
            const { parent, element, position } = insertion;
            
            if (parent && element) {
                if (position === 'prepend') {
                    parent.prepend(element);
                } else if (position === 'before' && parent.parentNode) {
                    parent.parentNode.insertBefore(element, parent);
                } else if (position === 'after' && parent.parentNode) {
                    parent.parentNode.insertBefore(element, parent.nextSibling);
                } else {
                    parent.appendChild(element);
                }
                operationsCount++;
            }
        }

        // Verarbeite Entfernungen
        for (const removal of pendingOperations.removals) {
            const { element } = removal;
            
            if (element && element.parentNode) {
                element.parentNode.removeChild(element);
                operationsCount++;
            }
        }

        // Verarbeite Textänderungen
        for (const elementId in pendingOperations.texts) {
            const element = document.getElementById(elementId) || 
                            findCachedElement(elementId);
            
            if (element) {
                const newText = pendingOperations.texts[elementId];
                
                if (element.textContent !== newText) {
                    element.textContent = newText;
                    operationsCount++;
                }
            }
        }

        // Verarbeite Sichtbarkeitsänderungen
        for (const elementId in pendingOperations.visibilities) {
            const element = document.getElementById(elementId) || 
                            findCachedElement(elementId);
            
            if (element) {
                const isVisible = pendingOperations.visibilities[elementId];
                element.style.display = isVisible ? '' : 'none';
                operationsCount++;
            }
        }

        // Setze die Batches zurück
        resetBatches();
        
        // Messe die Zeit
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        // Protokolliere, wenn Debug aktiviert ist
        if (config.debug && operationsCount > 0) {
            console.log(`[DOMBatch] Processed ${operationsCount} operations in ${duration.toFixed(2)}ms`);
        }
        
        // Setze die Timeout-ID zurück
        batchTimeoutId = null;
    }

    /**
     * Setzt alle ausstehenden Operationen zurück
     */
    function resetBatches() {
        pendingOperations.classes = {};
        pendingOperations.attributes = {};
        pendingOperations.styles = {};
        pendingOperations.insertions = [];
        pendingOperations.removals = [];
        pendingOperations.texts = {};
        pendingOperations.visibilities = {};
    }

    /**
     * Fügt eine Klasse zu einem Element hinzu (gebatcht)
     * @param {Element|string} element - Das Element oder dessen ID
     * @param {string|string[]} classNames - Die hinzuzufügende(n) Klasse(n)
     */
    function addClass(element, classNames) {
        const elementId = getElementId(element);
        
        if (!elementId) {
            return;
        }
        
        if (!pendingOperations.classes[elementId]) {
            pendingOperations.classes[elementId] = { add: [], remove: [] };
        }
        
        const classes = Array.isArray(classNames) ? classNames : [classNames];
        pendingOperations.classes[elementId].add.push(...classes);
        
        scheduleBatch();
    }

    /**
     * Entfernt eine Klasse von einem Element (gebatcht)
     * @param {Element|string} element - Das Element oder dessen ID
     * @param {string|string[]} classNames - Die zu entfernende(n) Klasse(n)
     */
    function removeClass(element, classNames) {
        const elementId = getElementId(element);
        
        if (!elementId) {
            return;
        }
        
        if (!pendingOperations.classes[elementId]) {
            pendingOperations.classes[elementId] = { add: [], remove: [] };
        }
        
        const classes = Array.isArray(classNames) ? classNames : [classNames];
        pendingOperations.classes[elementId].remove.push(...classes);
        
        scheduleBatch();
    }

    /**
     * Setzt ein Attribut eines Elements (gebatcht)
     * @param {Element|string} element - Das Element oder dessen ID
     * @param {string} attr - Der Name des Attributs
     * @param {string} value - Der Wert des Attributs
     */
    function setAttribute(element, attr, value) {
        const elementId = getElementId(element);
        
        if (!elementId) {
            return;
        }
        
        if (!pendingOperations.attributes[elementId]) {
            pendingOperations.attributes[elementId] = {};
        }
        
        pendingOperations.attributes[elementId][attr] = value;
        
        scheduleBatch();
    }

    /**
     * Entfernt ein Attribut eines Elements (gebatcht)
     * @param {Element|string} element - Das Element oder dessen ID
     * @param {string} attr - Der Name des Attributs
     */
    function removeAttribute(element, attr) {
        setAttribute(element, attr, null);
    }

    /**
     * Setzt eine Stileigenschaft eines Elements (gebatcht)
     * @param {Element|string} element - Das Element oder dessen ID
     * @param {string|Object} prop - Der Stilname oder ein Objekt mit Stilnamen und -werten
     * @param {string} [value] - Der Stilwert (wenn prop ein String ist)
     */
    function setStyle(element, prop, value) {
        const elementId = getElementId(element);
        
        if (!elementId) {
            return;
        }
        
        if (!pendingOperations.styles[elementId]) {
            pendingOperations.styles[elementId] = {};
        }
        
        if (typeof prop === 'object') {
            // Stil-Objekt wurde übergeben
            Object.assign(pendingOperations.styles[elementId], prop);
        } else {
            // Einzelne Eigenschaft und Wert
            pendingOperations.styles[elementId][prop] = value;
        }
        
        scheduleBatch();
    }

    /**
     * Fügt ein Element an ein Parent-Element an (gebatcht)
     * @param {Element} parent - Das Elternelement
     * @param {Element} element - Das einzufügende Element
     * @param {string} [position='append'] - Die Position ('append', 'prepend', 'before', 'after')
     */
    function appendElement(parent, element, position = 'append') {
        if (!parent || !element) {
            return;
        }
        
        pendingOperations.insertions.push({ parent, element, position });
        
        scheduleBatch();
    }

    /**
     * Entfernt ein Element aus dem DOM (gebatcht)
     * @param {Element} element - Das zu entfernende Element
     */
    function removeElement(element) {
        if (!element) {
            return;
        }
        
        pendingOperations.removals.push({ element });
        
        scheduleBatch();
    }

    /**
     * Setzt den Textinhalt eines Elements (gebatcht)
     * @param {Element|string} element - Das Element oder dessen ID
     * @param {string} text - Der neue Textinhalt
     */
    function setText(element, text) {
        const elementId = getElementId(element);
        
        if (!elementId) {
            return;
        }
        
        pendingOperations.texts[elementId] = text;
        
        scheduleBatch();
    }

    /**
     * Steuert die Sichtbarkeit eines Elements (gebatcht)
     * @param {Element|string} element - Das Element oder dessen ID
     * @param {boolean} visible - Ob das Element sichtbar sein soll
     */
    function setVisible(element, visible) {
        const elementId = getElementId(element);
        
        if (!elementId) {
            return;
        }
        
        pendingOperations.visibilities[elementId] = !!visible;
        
        scheduleBatch();
    }

    /**
     * Versteckt ein Element (gebatcht)
     * @param {Element|string} element - Das Element oder dessen ID
     */
    function hide(element) {
        setVisible(element, false);
    }

    /**
     * Zeigt ein Element an (gebatcht)
     * @param {Element|string} element - Das Element oder dessen ID
     */
    function show(element) {
        setVisible(element, true);
    }

    /**
     * Führt eine Reihe von DOM-Operationen aus und misst die Dauer
     * @param {Function} callback - Die Funktion mit den DOM-Operationen
     * @returns {number} Die Dauer der Operation in Millisekunden
     */
    function measureOperation(callback) {
        // Verarbeite zunächst alle ausstehenden Batches
        if (batchTimeoutId) {
            clearTimeout(batchTimeoutId);
            processBatch();
        }
        
        const startTime = performance.now();
        callback();
        const endTime = performance.now();
        
        return endTime - startTime;
    }

    /**
     * Führt eine Gruppe von DOM-Operationen in einem einzigen Rendering-Zyklus aus
     * @param {Function} callback - Die Funktion mit den DOM-Operationen
     */
    function groupOperations(callback) {
        // Erzeuge einen Rahmen zum Messen des Reflows
        const trigger = document.createTextNode('');
        document.body.appendChild(trigger);
        
        try {
            // Führe alle Operationen aus
            callback();
            
            // Erzwinge einen Reflow
            trigger.nodeValue = ' ';
            
            // Verarbeite alle ausstehenden Operationen sofort
            if (batchTimeoutId) {
                clearTimeout(batchTimeoutId);
                batchTimeoutId = null;
                processBatch();
            }
        } finally {
            // Entferne den Rahmen
            document.body.removeChild(trigger);
        }
    }

    /**
     * Fügt mehrere Elemente effizient in den DOM ein
     * @param {Element} parent - Das Elternelement
     * @param {Element[]} elements - Die einzufügenden Elemente
     */
    function appendMultiple(parent, elements) {
        if (!parent || !elements || !elements.length) {
            return;
        }
        
        // Nutze DocumentFragment für optimale Performance
        const fragment = document.createDocumentFragment();
        
        for (const element of elements) {
            fragment.appendChild(element);
        }
        
        appendElement(parent, fragment);
    }

    /**
     * Cache für Element-Selektoren
     */
    const elementCache = new Map();

    /**
     * Findet ein Element und speichert es im Cache
     * @param {string} selector - Der CSS-Selektor
     * @returns {Element|null} Das gefundene Element oder null
     */
    function findCachedElement(selector) {
        if (elementCache.has(selector)) {
            return elementCache.get(selector);
        }
        
        const element = document.querySelector(selector);
        
        if (element) {
            elementCache.set(selector, element);
        }
        
        return element;
    }

    /**
     * Löscht den Element-Cache
     */
    function clearCache() {
        elementCache.clear();
    }

    /**
     * Gibt die ID eines Elements zurück oder erzeugt eine, wenn sie nicht existiert
     * @param {Element|string} element - Das Element oder dessen ID/Selektor
     * @returns {string|null} Die ID des Elements oder null
     */
    function getElementId(element) {
        if (!element) {
            return null;
        }
        
        if (typeof element === 'string') {
            // Bereits eine ID oder ein Selektor
            if (element.startsWith('#')) {
                return element.substring(1);
            }
            return element;
        }
        
        // Element-Objekt
        if (element.id) {
            return element.id;
        }
        
        // Erzeuge eine eindeutige ID
        const id = `dom-batch-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
        element.id = id;
        
        return id;
    }

    /**
     * Konfiguriert den DOMBatch
     * @param {Object} options - Konfigurationsoptionen
     */
    function configure(options) {
        Object.assign(config, options);
    }

    // Öffentliche API
    return {
        addClass,
        removeClass,
        setAttribute,
        removeAttribute,
        setStyle,
        appendElement,
        removeElement,
        setText,
        setVisible,
        hide,
        show,
        measureOperation,
        groupOperations,
        appendMultiple,
        findCachedElement,
        clearCache,
        configure,
        processBatch // Expose for testing and immediate processing
    };
})();

// Für ESM-Import
if (typeof exports !== 'undefined') {
    exports.DOMBatch = DOMBatch;
}

// Für globalen Zugriff
window.DOMBatch = DOMBatch;