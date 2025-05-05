/**
 * DocConverter Path Tester
 * Tests multiple resource paths and loads the first successful one
 * This script specifically targets common 404 errors and fixes them
 */

(function() {
    // Configuration
    const DEBUG = true;
    const LOG_TO_CONSOLE = true;
    const LOG_TO_UI = true;
    const AUTO_FIX = true;
    
    // Base paths to try in order
    const basePaths = [
        '/static/',
        '/frontend/static/',
        '/api/static/',
        '/frontend/',
        '/api/',
        '/'
    ];
    
    // Core resources to test
    const coreResources = {
        css: [
            'css/doc-converter-fix.css',
            'css/vue/doc-converter.css',
            'css/feedback-icons-fix.css'
        ],
        js: [
            'vue/standalone/doc-converter.js', 
            'vue/standalone/doc-converter-nomodule.js',
            'js/doc-converter-fallback.js',
            'js/doc-converter-debug.js'
        ]
    };
    
    // Logging functions
    function getTimestamp() {
        return new Date().toISOString().split('T')[1].replace('Z', '');
    }
    
    function log(message, type = 'info') {
        const prefix = `[${getTimestamp()}] [PathTester]`;
        
        if (LOG_TO_CONSOLE) {
            switch(type) {
                case 'error': console.error(prefix, message); break;
                case 'warn': console.warn(prefix, message); break;
                default: console.log(prefix, message);
            }
        }
        
        if (LOG_TO_UI) {
            addToLogUI(message, type);
        }
    }
    
    // UI-based logging
    function addToLogUI(message, type = 'info') {
        let logContainer = document.getElementById('doc-converter-path-tester-log');
        
        if (!logContainer) {
            createLogUI();
            logContainer = document.getElementById('doc-converter-path-tester-log');
        }
        
        if (logContainer) {
            const entry = document.createElement('div');
            entry.className = `log-entry log-${type}`;
            entry.textContent = `${getTimestamp()} ${message}`;
            
            logContainer.appendChild(entry);
            logContainer.scrollTop = logContainer.scrollHeight;
            
            // Limit entries
            while (logContainer.children.length > 100) {
                logContainer.removeChild(logContainer.firstChild);
            }
        }
    }
    
    function createLogUI() {
        if (document.getElementById('doc-converter-path-tester')) {
            return;
        }
        
        const container = document.createElement('div');
        container.id = 'doc-converter-path-tester';
        container.style.cssText = `
            position: fixed;
            bottom: 10px;
            left: 10px;
            width: 400px;
            height: 300px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            font-family: monospace;
            font-size: 11px;
            padding: 10px;
            border-radius: 5px;
            z-index: 9999;
            display: flex;
            flex-direction: column;
        `;
        
        const header = document.createElement('div');
        header.style.cssText = `
            display: flex;
            justify-content: space-between;
            margin-bottom: 5px;
            padding-bottom: 5px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.3);
        `;
        header.innerHTML = `
            <strong>DocConverter Path Tester</strong>
            <div>
                <button id="path-tester-test">Test</button>
                <button id="path-tester-min">-</button>
                <button id="path-tester-close">×</button>
            </div>
        `;
        
        const logArea = document.createElement('div');
        logArea.id = 'doc-converter-path-tester-log';
        logArea.style.cssText = `
            flex: 1;
            overflow-y: auto;
            padding: 5px;
            background: rgba(0, 0, 0, 0.3);
            border-radius: 3px;
            margin-bottom: 5px;
        `;
        
        const footer = document.createElement('div');
        footer.style.cssText = `
            display: flex;
            justify-content: space-between;
            padding-top: 5px;
            border-top: 1px solid rgba(255, 255, 255, 0.3);
            font-size: 10px;
        `;
        footer.innerHTML = `
            <span>Auto-fix: <input type="checkbox" id="path-tester-autofix" ${AUTO_FIX ? 'checked' : ''}></span>
            <span>DocConverter Path Diagnostics</span>
        `;
        
        container.appendChild(header);
        container.appendChild(logArea);
        container.appendChild(footer);
        
        document.body.appendChild(container);
        
        // Add event listeners
        document.getElementById('path-tester-min').addEventListener('click', function() {
            const logArea = document.getElementById('doc-converter-path-tester-log');
            if (logArea.style.display === 'none') {
                logArea.style.display = 'block';
                this.textContent = '-';
            } else {
                logArea.style.display = 'none';
                this.textContent = '+';
            }
        });
        
        document.getElementById('path-tester-close').addEventListener('click', function() {
            const container = document.getElementById('doc-converter-path-tester');
            if (container) {
                container.style.display = 'none';
            }
        });
        
        document.getElementById('path-tester-test').addEventListener('click', function() {
            testAllResources();
        });
        
        document.getElementById('path-tester-autofix').addEventListener('change', function() {
            // Let user toggle auto-fix mode
            window.AUTO_FIX_PATHS = this.checked;
        });
    }
    
    // Test a specific resource at a specific path
    function testResource(path, callback) {
        const xhr = new XMLHttpRequest();
        xhr.open('HEAD', path, true);
        
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                callback(xhr.status === 200, xhr.status);
            }
        };
        
        xhr.timeout = 2000; // 2 seconds timeout
        xhr.ontimeout = function() {
            callback(false, 'timeout');
        };
        
        xhr.onerror = function() {
            callback(false, 'error');
        };
        
        xhr.send();
    }
    
    // Test a resource at all possible paths
    function testResourcePaths(resource, allPaths, callback) {
        let currentIndex = 0;
        let foundValidPath = false;
        
        function testNext() {
            if (currentIndex >= allPaths.length) {
                callback(foundValidPath ? allPaths[foundValidPath] : null);
                return;
            }
            
            const currentPath = allPaths[currentIndex];
            
            testResource(currentPath, function(success, status) {
                if (success) {
                    log(`✅ Resource ${resource} available at ${currentPath}`);
                    foundValidPath = currentIndex;
                    callback(currentPath);
                } else {
                    log(`❌ Resource ${resource} not found at ${currentPath} (${status})`, 'warn');
                    currentIndex++;
                    testNext();
                }
            });
        }
        
        testNext();
    }
    
    // Generate all possible paths for a resource
    function generateAllPaths(resource) {
        const paths = [];
        
        basePaths.forEach(base => {
            paths.push(base + resource);
        });
        
        return paths;
    }
    
    // Check and fix all resources
    function testAllResources() {
        log('Starting comprehensive resource path test...');
        
        // Test CSS resources
        coreResources.css.forEach(resource => {
            log(`Testing CSS resource: ${resource}`);
            const allPaths = generateAllPaths(resource);
            
            testResourcePaths(resource, allPaths, function(validPath) {
                if (validPath) {
                    log(`Found valid path for ${resource}: ${validPath}`, 'info');
                    if (AUTO_FIX) {
                        injectCSS(validPath);
                    }
                } else {
                    log(`No valid path found for ${resource}, generating fallback`, 'error');
                    if (AUTO_FIX) {
                        injectFallbackCSS(resource);
                    }
                }
            });
        });
        
        // Test JS resources
        coreResources.js.forEach(resource => {
            log(`Testing JS resource: ${resource}`);
            const allPaths = generateAllPaths(resource);
            
            testResourcePaths(resource, allPaths, function(validPath) {
                if (validPath) {
                    log(`Found valid path for ${resource}: ${validPath}`, 'info');
                    if (AUTO_FIX) {
                        injectScript(validPath);
                    }
                } else {
                    log(`No valid path found for ${resource}, generating fallback`, 'error');
                    if (AUTO_FIX && resource.includes('doc-converter')) {
                        injectFallbackScript();
                    }
                }
            });
        });
        
        // Also test DOM structure
        setTimeout(checkDocConverterDOM, 1000);
    }
    
    // Inject CSS into the document
    function injectCSS(path) {
        // Check if this CSS is already loaded
        const existingLinks = document.querySelectorAll('link[rel="stylesheet"]');
        for (let i = 0; i < existingLinks.length; i++) {
            if (existingLinks[i].href.includes(path)) {
                log(`CSS ${path} already loaded, skipping`);
                return;
            }
        }
        
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = path;
        link.setAttribute('data-injected-by', 'path-tester');
        
        link.onload = function() {
            log(`Successfully injected CSS: ${path}`);
        };
        
        link.onerror = function() {
            log(`Failed to load injected CSS: ${path}`, 'error');
        };
        
        document.head.appendChild(link);
        log(`Injected CSS: ${path}`);
    }
    
    // Inject a script into the document
    function injectScript(path) {
        // Check if this script is already loaded
        const existingScripts = document.querySelectorAll('script');
        for (let i = 0; i < existingScripts.length; i++) {
            if (existingScripts[i].src && existingScripts[i].src.includes(path)) {
                log(`Script ${path} already loaded, skipping`);
                return;
            }
        }
        
        const script = document.createElement('script');
        script.src = path;
        script.setAttribute('data-injected-by', 'path-tester');
        
        script.onload = function() {
            log(`Successfully injected script: ${path}`);
        };
        
        script.onerror = function() {
            log(`Failed to load injected script: ${path}`, 'error');
        };
        
        document.head.appendChild(script);
        log(`Injected script: ${path}`);
    }
    
    // Create fallback CSS when none of the paths work
    function injectFallbackCSS(resourceName) {
        if (document.getElementById('doc-converter-fallback-css')) {
            return;
        }
        
        log(`Creating fallback CSS for ${resourceName}`);
        
        const style = document.createElement('style');
        style.id = 'doc-converter-fallback-css';
        style.setAttribute('data-original-resource', resourceName);
        
        if (resourceName.includes('doc-converter-fix')) {
            style.textContent = `
                /* Fallback für doc-converter-fix.css */
                #doc-converter-container,
                #doc-converter-app,
                .doc-converter,
                [data-tab="docConverter"],
                #rescue-tab-doc-converter,
                .admin-tab-content[data-tab="docConverter"],
                .admin-tab-content.docConverter,
                .doc-converter-view {
                    display: block !important;
                    visibility: visible !important;
                    opacity: 1 !important;
                    min-height: 400px;
                    width: 100%;
                }
                
                .doc-converter.classic-ui {
                    padding: 20px;
                    background: white;
                    border-radius: 8px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                }
                
                .tab-content[data-active-tab="docConverter"] {
                    display: block !important;
                }
                
                /* Sicherstellen, dass der Tab auch hervorgehoben wird */
                .admin-nav-item[data-tab="docConverter"].active,
                .admin-nav-item[data-tab="docConverter"]:active,
                .rescue-nav-item[data-tab="doc-converter"].active {
                    background-color: rgba(59, 130, 246, 0.1);
                    color: #3b82f6;
                    border-left: 3px solid #3b82f6;
                }
            `;
        } else if (resourceName.includes('feedback-icons-fix')) {
            style.textContent = `
                /* Fallback für feedback-icons-fix.css */
                .feedback-icons {
                    position: absolute !important;
                    right: 10px !important;
                    display: flex !important;
                    gap: 8px !important;
                }
                
                .feedback-icon {
                    cursor: pointer !important;
                    color: #999 !important;
                    transition: color 0.2s !important;
                }
                
                .feedback-icon:hover {
                    color: #555 !important;
                }
                
                .feedback-icon.active {
                    color: #4CAF50 !important;
                }
                
                .feedback-icon.active.negative {
                    color: #f44336 !important;
                }
            `;
        } else {
            style.textContent = `
                /* Generic fallback CSS */
                .doc-converter-view {
                    display: block !important;
                    visibility: visible !important;
                    opacity: 1 !important;
                }
            `;
        }
        
        document.head.appendChild(style);
        log(`Injected fallback CSS for ${resourceName}`);
    }
    
    // Inject very simple fallback script when nothing else works
    function injectFallbackScript() {
        if (window.docConverterFallbackInjected) {
            return;
        }
        
        log('Creating emergency fallback script for DocConverter');
        
        const script = document.createElement('script');
        script.id = 'doc-converter-emergency-fallback';
        script.textContent = `
            (function() {
                console.log('[DocConverter] Emergency fallback activated');
                
                // Function to find or create container
                function findOrCreateContainer() {
                    // Look for existing container
                    const container = 
                        document.getElementById('doc-converter-container') || 
                        document.getElementById('doc-converter-app') ||
                        document.querySelector('[data-tab="docConverter"]');
                    
                    if (container) {
                        return container;
                    }
                    
                    // Create container if none exists
                    const adminContent = 
                        document.querySelector('.admin-content') || 
                        document.querySelector('.admin-panel-content') || 
                        document.querySelector('.content-container') ||
                        document.querySelector('main') ||
                        document.body;
                    
                    if (adminContent) {
                        const newContainer = document.createElement('div');
                        newContainer.id = 'doc-converter-container';
                        newContainer.className = 'doc-converter admin-tab-content';
                        newContainer.setAttribute('data-tab', 'docConverter');
                        newContainer.style.cssText = 'display:block!important; visibility:visible!important; opacity:1!important;';
                        
                        adminContent.appendChild(newContainer);
                        return newContainer;
                    }
                    
                    return null;
                }
                
                // Function to inject basic UI
                function injectBasicUI() {
                    const container = findOrCreateContainer();
                    if (!container) {
                        console.error('[DocConverter] Failed to find or create container');
                        return;
                    }
                    
                    container.innerHTML = \`
                        <div style="padding: 20px; background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                            <h2 style="font-size: 1.5rem; margin-bottom: 1rem;">Dokumenten-Konverter (Notfall-Fallback)</h2>
                            
                            <div style="padding: 1rem; margin-bottom: 1.5rem; background-color: #fff2e6; border-left: 4px solid #ff9966;">
                                <p style="margin-bottom: 0.5rem;"><strong>Hinweis:</strong> Sie verwenden die Notfall-Version des Dokumentenkonverters.</p>
                                <p style="margin-bottom: 0;">Diese einfache Implementierung wurde aktiviert, da das normale Skript nicht geladen werden konnte.</p>
                            </div>
                            
                            <form action="/api/admin/upload/document" method="post" enctype="multipart/form-data">
                                <div style="margin-bottom: 1.5rem;">
                                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Datei auswählen</label>
                                    <input type="file" name="file" style="border: 1px solid #e5e7eb; padding: 0.75rem; width: 100%; border-radius: 0.25rem; background-color: #f9fafb;" accept=".pdf,.docx,.doc,.xlsx,.xls,.pptx,.ppt,.html,.txt">
                                </div>
                                
                                <div style="margin-bottom: 1.5rem;">
                                    <label style="display: flex; align-items: center;">
                                        <input type="checkbox" name="post_processing" checked style="margin-right: 0.5rem;">
                                        <span>Nachbearbeitung aktivieren</span>
                                    </label>
                                </div>
                                
                                <button type="submit" style="background: #3b82f6; color: white; padding: 0.75rem 1.5rem; border: none; border-radius: 0.375rem; cursor: pointer; font-weight: 500;">
                                    Dokument konvertieren
                                </button>
                            </form>
                        </div>
                    \`;
                    
                    console.log('[DocConverter] Emergency UI injected');
                }
                
                // Inject UI immediately if DOM is ready, otherwise wait
                if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', injectBasicUI);
                } else {
                    injectBasicUI();
                }
                
                // Set flag to prevent duplicate injection
                window.docConverterFallbackInjected = true;
            })();
        `;
        
        document.head.appendChild(script);
        window.docConverterFallbackInjected = true;
        log('Injected emergency fallback script');
    }
    
    // Check if DocConverter elements exist and are visible
    function checkDocConverterDOM() {
        log('Checking DocConverter DOM elements');
        
        const selectors = [
            '#doc-converter-container',
            '#doc-converter-app',
            '[data-tab="docConverter"]',
            '.doc-converter',
            '.doc-converter-view'
        ];
        
        let foundElements = 0;
        let visibleElements = 0;
        
        selectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            
            if (elements.length > 0) {
                foundElements += elements.length;
                
                elements.forEach(element => {
                    const style = window.getComputedStyle(element);
                    const isVisible = style.display !== 'none' && 
                                     style.visibility !== 'hidden' && 
                                     style.opacity !== '0';
                    
                    if (isVisible) {
                        visibleElements++;
                    } else if (AUTO_FIX) {
                        // Make element visible
                        element.style.display = 'block';
                        element.style.visibility = 'visible';
                        element.style.opacity = '1';
                        log(`Made element ${selector} visible`, 'warn');
                    }
                });
            }
        });
        
        if (foundElements === 0) {
            log('No DocConverter DOM elements found', 'error');
            if (AUTO_FIX) {
                injectFallbackScript();
            }
        } else if (visibleElements === 0) {
            log('DocConverter elements found but none are visible', 'error');
        } else {
            log(`Found ${foundElements} DocConverter elements, ${visibleElements} visible`);
        }
    }
    
    // Monitor and intercept XHR requests to detect 404 errors
    function setupXHRInterceptor() {
        const originalOpen = XMLHttpRequest.prototype.open;
        
        XMLHttpRequest.prototype.open = function(method, url, async, user, password) {
            // Save original URL
            this._url = url;
            
            // Add load event listener to detect 404s
            this.addEventListener('load', function() {
                if (this.status === 404 && 
                    (this._url.includes('doc-converter') || 
                     this._url.includes('vue') || 
                     this._url.includes('.css'))) {
                    
                    log(`404 detected: ${this._url}`, 'error');
                    
                    if (AUTO_FIX) {
                        // Try to find alternative resource
                        if (this._url.endsWith('.css')) {
                            // Try to identify which CSS resource this is
                            const resourceName = this._url.split('/').pop();
                            const fullResourcePath = 'css/' + resourceName;
                            
                            if (coreResources.css.includes(fullResourcePath)) {
                                log(`Auto-fixing CSS 404: ${resourceName}`);
                                injectFallbackCSS(fullResourcePath);
                            }
                        }
                        else if (this._url.includes('doc-converter.js')) {
                            log(`Auto-fixing JS 404: doc-converter.js`);
                            injectFallbackScript();
                        }
                    }
                }
            });
            
            // Call original method
            return originalOpen.apply(this, arguments);
        };
    }
    
    // Monitor dynamically added stylesheets and scripts for load errors
    function setupResourceErrorMonitoring() {
        // Create a MutationObserver to watch for dynamically added resources
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach(function(node) {
                        // Check for link elements (stylesheets)
                        if (node.tagName === 'LINK' && node.rel === 'stylesheet') {
                            node.addEventListener('error', function() {
                                const href = this.getAttribute('href');
                                log(`CSS load error: ${href}`, 'error');
                                
                                if (AUTO_FIX && 
                                    (href.includes('doc-converter') || 
                                     href.includes('feedback'))) {
                                    
                                    // Extract the resource name
                                    const resourceName = href.split('/').pop();
                                    const fullResourcePath = 'css/' + resourceName;
                                    
                                    if (coreResources.css.includes(fullResourcePath)) {
                                        log(`Auto-fixing CSS load error: ${resourceName}`);
                                        injectFallbackCSS(fullResourcePath);
                                    }
                                }
                            });
                        }
                        // Check for script elements
                        else if (node.tagName === 'SCRIPT' && node.src) {
                            node.addEventListener('error', function() {
                                const src = this.getAttribute('src');
                                log(`Script load error: ${src}`, 'error');
                                
                                if (AUTO_FIX && 
                                    (src.includes('doc-converter') || 
                                     src.includes('vue'))) {
                                    
                                    log(`Auto-fixing script load error: ${src}`);
                                    if (src.includes('doc-converter')) {
                                        injectFallbackScript();
                                    }
                                }
                            });
                        }
                    });
                }
            });
        });
        
        // Start observing the document
        observer.observe(document, { childList: true, subtree: true });
    }
    
    // Initialize path tester
    function initialize() {
        log('Initializing DocConverter Path Tester');
        
        // Setup error monitoring
        setupXHRInterceptor();
        setupResourceErrorMonitoring();
        
        // Create UI if debug is enabled
        if (DEBUG && LOG_TO_UI) {
            if (document.body) {
                createLogUI();
            } else {
                document.addEventListener('DOMContentLoaded', createLogUI);
            }
        }
        
        // Run initial tests when DOM is fully loaded
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function() {
                setTimeout(testAllResources, 500);
            });
        } else {
            setTimeout(testAllResources, 500);
        }
        
        // Expose API
        window.docConverterPathTester = {
            test: testAllResources,
            checkDOM: checkDocConverterDOM,
            toggleUI: function() {
                const container = document.getElementById('doc-converter-path-tester');
                if (container) {
                    container.style.display = container.style.display === 'none' ? 'flex' : 'none';
                }
            }
        };
        
        // Make auto-fix accessible
        window.AUTO_FIX_PATHS = AUTO_FIX;
    }
    
    // Start initialization
    initialize();
})();