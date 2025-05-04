/**
 * Erweitertes Feature-Toggle-System für nscale-assist
 * Ermöglicht das Ein- und Ausschalten verschiedener UI-Versionen im Admin-Bereich
 */
(function() {
    console.log('[FeatureToggle] Erweitertes Feature-Toggle-System wird initialisiert...');
    
    // Default-Konfiguration
    const defaultConfig = {
        useNewUI: true,          // Genereller Toggle für neue UI
        vueDocConverter: true,   // DocConverter mit Vue.js
        vueChat: true,           // Chat-Interface mit Vue.js
        vueAdmin: true,          // Admin-Bereich mit Vue.js
        vueSettings: true,       // Einstellungen mit Vue.js
        forceClassicDocConverter: false // Erzwingt die klassische Version des DocConverters
    };
    
    // Aktuelle Konfiguration laden
    let config = loadConfig();
    
    // Konfiguration aus localStorage laden
    function loadConfig() {
        try {
            // Einzelne Einstellungen laden und mit Defaults kombinieren
            const useNewUI = localStorage.getItem('useNewUI') === 'true';
            const vueDocConverter = localStorage.getItem('feature_vueDocConverter') !== 'false';
            const vueChat = localStorage.getItem('feature_vueChat') !== 'false';
            const vueAdmin = localStorage.getItem('feature_vueAdmin') !== 'false';
            const vueSettings = localStorage.getItem('feature_vueSettings') !== 'false';
            const forceClassicDocConverter = localStorage.getItem('forceClassicDocConverter') === 'true';
            
            return {
                useNewUI: useNewUI !== null ? useNewUI : defaultConfig.useNewUI,
                vueDocConverter: vueDocConverter !== null ? vueDocConverter : defaultConfig.vueDocConverter,
                vueChat: vueChat !== null ? vueChat : defaultConfig.vueChat,
                vueAdmin: vueAdmin !== null ? vueAdmin : defaultConfig.vueAdmin,
                vueSettings: vueSettings !== null ? vueSettings : defaultConfig.vueSettings,
                forceClassicDocConverter: forceClassicDocConverter !== null ? forceClassicDocConverter : defaultConfig.forceClassicDocConverter
            };
        } catch (e) {
            console.error('[FeatureToggle] Fehler beim Laden der Konfiguration:', e);
            return { ...defaultConfig };
        }
    }
    
    // Konfiguration speichern
    function saveConfig() {
        try {
            localStorage.setItem('useNewUI', config.useNewUI.toString());
            localStorage.setItem('feature_vueDocConverter', config.vueDocConverter.toString());
            localStorage.setItem('feature_vueChat', config.vueChat.toString());
            localStorage.setItem('feature_vueAdmin', config.vueAdmin.toString());
            localStorage.setItem('feature_vueSettings', config.vueSettings.toString());
            localStorage.setItem('forceClassicDocConverter', config.forceClassicDocConverter.toString());
            
            console.log('[FeatureToggle] Konfiguration gespeichert:', config);
        } catch (e) {
            console.error('[FeatureToggle] Fehler beim Speichern der Konfiguration:', e);
        }
    }
    
    // UI zum Konfigurieren des Feature-Toggles erstellen
    function createFeatureToggleUI() {
        // Prüfen, ob die UI bereits existiert
        if (document.getElementById('feature-toggle-ui')) {
            document.getElementById('feature-toggle-ui').remove();
        }
        
        // Container erstellen
        const container = document.createElement('div');
        container.id = 'feature-toggle-ui';
        container.style.cssText = `
            position: fixed;
            bottom: 40px;
            right: 20px;
            background-color: rgba(255, 255, 255, 0.95);
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            padding: 15px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
            width: 350px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            z-index: 9999;
            transition: transform 0.3s, opacity 0.3s;
            display: none;
        `;
        
        // Header
        const header = document.createElement('div');
        header.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid #e0e0e0;
            padding-bottom: 10px;
            margin-bottom: 15px;
        `;
        
        const title = document.createElement('h3');
        title.textContent = 'UI-Versionen konfigurieren';
        title.style.cssText = `
            margin: 0;
            font-size: 16px;
            font-weight: 500;
            color: #333;
        `;
        
        const closeButton = document.createElement('button');
        closeButton.textContent = '×';
        closeButton.style.cssText = `
            background: none;
            border: none;
            font-size: 20px;
            color: #666;
            cursor: pointer;
        `;
        closeButton.onclick = function() {
            hideFeatureToggleUI();
        };
        
        header.appendChild(title);
        header.appendChild(closeButton);
        container.appendChild(header);
        
        // Optionen
        const options = [
            { id: 'useNewUI', label: 'Neue UI verwenden', description: 'Aktiviert die moderne Benutzeroberfläche' },
            { id: 'vueDocConverter', label: 'Vue.js Dokumenten-Konverter', description: 'Verwendet die Vue.js-Implementierung des Dokumenten-Konverters' },
            { id: 'vueAdmin', label: 'Vue.js Admin-Bereich', description: 'Verwendet die Vue.js-Implementierung des Admin-Bereichs' },
            { id: 'vueChat', label: 'Vue.js Chat-Interface', description: 'Verwendet die Vue.js-Implementierung des Chat-Interfaces' },
            { id: 'vueSettings', label: 'Vue.js Einstellungen', description: 'Verwendet die Vue.js-Implementierung der Einstellungen' },
            { id: 'forceClassicDocConverter', label: 'Klassischen Dokumenten-Konverter erzwingen', description: 'Erzwingt die klassische Implementierung des Dokumenten-Konverters' }
        ];
        
        const optionsContainer = document.createElement('div');
        optionsContainer.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 10px;
        `;
        
        options.forEach(option => {
            const optionRow = document.createElement('div');
            optionRow.style.cssText = `
                display: flex;
                align-items: center;
                padding: 8px;
                background-color: ${config[option.id] ? 'rgba(237, 247, 255, 0.5)' : 'transparent'};
                border-radius: 4px;
                transition: background-color 0.2s;
            `;
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `toggle-${option.id}`;
            checkbox.checked = config[option.id];
            checkbox.style.cssText = `
                margin-right: 10px;
            `;
            
            const label = document.createElement('label');
            label.htmlFor = `toggle-${option.id}`;
            label.style.cssText = `
                flex: 1;
            `;
            
            const labelText = document.createElement('div');
            labelText.textContent = option.label;
            labelText.style.cssText = `
                font-weight: 500;
                font-size: 14px;
                margin-bottom: 2px;
            `;
            
            const labelDescription = document.createElement('div');
            labelDescription.textContent = option.description;
            labelDescription.style.cssText = `
                font-size: 12px;
                color: #666;
            `;
            
            label.appendChild(labelText);
            label.appendChild(labelDescription);
            
            // Toggle-Switch statt Checkbox
            const toggleSwitch = document.createElement('div');
            toggleSwitch.classList.add('toggle-switch');
            toggleSwitch.style.cssText = `
                position: relative;
                width: 44px;
                height: 22px;
                margin-right: 10px;
            `;
            
            const toggleInput = document.createElement('input');
            toggleInput.type = 'checkbox';
            toggleInput.id = `toggle-${option.id}`;
            toggleInput.checked = config[option.id];
            toggleInput.style.cssText = `
                opacity: 0;
                width: 0;
                height: 0;
            `;
            
            const toggleSlider = document.createElement('span');
            toggleSlider.classList.add('slider');
            toggleSlider.style.cssText = `
                position: absolute;
                cursor: pointer;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background-color: #ccc;
                transition: .4s;
                border-radius: 34px;
            `;
            toggleSlider.style.backgroundColor = config[option.id] ? '#2196F3' : '#ccc';
            
            const toggleDot = document.createElement('span');
            toggleDot.style.cssText = `
                position: absolute;
                content: "";
                height: 18px;
                width: 18px;
                left: ${config[option.id] ? '24px' : '2px'};
                bottom: 2px;
                background-color: white;
                transition: .4s;
                border-radius: 50%;
            `;
            
            toggleSwitch.appendChild(toggleInput);
            toggleSlider.appendChild(toggleDot);
            toggleSwitch.appendChild(toggleSlider);
            
            toggleInput.onchange = function() {
                // Config updaten
                config[option.id] = this.checked;
                
                // UI-Stile aktualisieren
                toggleSlider.style.backgroundColor = this.checked ? '#2196F3' : '#ccc';
                toggleDot.style.left = this.checked ? '24px' : '2px';
                optionRow.style.backgroundColor = this.checked ? 'rgba(237, 247, 255, 0.5)' : 'transparent';
                
                // Speziallogik für bestimmte Optionen
                if (option.id === 'useNewUI' && !this.checked) {
                    // Wenn die neue UI deaktiviert wird, alle Vue.js-Komponenten deaktivieren
                    document.getElementById('toggle-vueDocConverter').checked = false;
                    document.getElementById('toggle-vueAdmin').checked = false;
                    document.getElementById('toggle-vueChat').checked = false;
                    document.getElementById('toggle-vueSettings').checked = false;
                    
                    config.vueDocConverter = false;
                    config.vueAdmin = false;
                    config.vueChat = false;
                    config.vueSettings = false;
                }
                
                if (option.id === 'forceClassicDocConverter' && this.checked) {
                    // Wenn der klassische DocConverter erzwungen wird, Vue.js-DocConverter deaktivieren
                    document.getElementById('toggle-vueDocConverter').checked = false;
                    config.vueDocConverter = false;
                } else if (option.id === 'vueDocConverter' && this.checked) {
                    // Wenn Vue.js-DocConverter aktiviert wird, force-Classic deaktivieren
                    document.getElementById('toggle-forceClassicDocConverter').checked = false;
                    config.forceClassicDocConverter = false;
                }
                
                saveConfig();
            };
            
            optionRow.appendChild(toggleSwitch);
            optionRow.appendChild(label);
            optionsContainer.appendChild(optionRow);
        });
        
        container.appendChild(optionsContainer);
        
        // Buttons
        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = `
            display: flex;
            justify-content: space-between;
            margin-top: 20px;
        `;
        
        const resetButton = document.createElement('button');
        resetButton.textContent = 'Zurücksetzen';
        resetButton.style.cssText = `
            padding: 8px 16px;
            background-color: #f5f5f5;
            color: #333;
            border: 1px solid #ccc;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            transition: background-color 0.2s;
        `;
        resetButton.onmouseover = function() {
            this.style.backgroundColor = '#e0e0e0';
        };
        resetButton.onmouseout = function() {
            this.style.backgroundColor = '#f5f5f5';
        };
        resetButton.onclick = function() {
            // Zurücksetzen auf Defaults
            config = { ...defaultConfig };
            saveConfig();
            createFeatureToggleUI(); // UI neu erstellen
        };
        
        const applyButton = document.createElement('button');
        applyButton.textContent = 'Anwenden & neu laden';
        applyButton.style.cssText = `
            padding: 8px 16px;
            background-color: #2196F3;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            transition: background-color 0.2s;
        `;
        applyButton.onmouseover = function() {
            this.style.backgroundColor = '#0b7dda';
        };
        applyButton.onmouseout = function() {
            this.style.backgroundColor = '#2196F3';
        };
        applyButton.onclick = function() {
            // Einstellungen anwenden und Seite neu laden
            saveConfig();
            window.location.reload();
        };
        
        buttonContainer.appendChild(resetButton);
        buttonContainer.appendChild(applyButton);
        container.appendChild(buttonContainer);
        
        // Status-Indikator
        const statusIndikator = document.createElement('div');
        statusIndikator.style.cssText = `
            display: flex;
            align-items: center;
            margin-top: 15px;
            padding-top: 15px;
            border-top: 1px solid #e0e0e0;
            font-size: 12px;
            color: #666;
        `;
        
        // Aktuelle UI-Version anzeigen
        const versionText = document.createElement('div');
        versionText.innerHTML = `
            <div>Aktive UI: <strong>${config.useNewUI ? 'Modern' : 'Klassisch'}</strong></div>
            <div>Dokumenten-Konverter: <strong>${config.forceClassicDocConverter ? 'Klassisch (erzwungen)' : (config.vueDocConverter ? 'Vue.js' : 'Klassisch')}</strong></div>
        `;
        
        statusIndikator.appendChild(versionText);
        container.appendChild(statusIndikator);
        
        document.body.appendChild(container);
        return container;
    }
    
    // UI anzeigen
    function showFeatureToggleUI() {
        const ui = document.getElementById('feature-toggle-ui') || createFeatureToggleUI();
        ui.style.display = 'block';
        setTimeout(() => {
            ui.style.opacity = '1';
            ui.style.transform = 'translateY(0)';
        }, 10);
    }
    
    // UI verstecken
    function hideFeatureToggleUI() {
        const ui = document.getElementById('feature-toggle-ui');
        if (ui) {
            ui.style.opacity = '0';
            ui.style.transform = 'translateY(20px)';
            setTimeout(() => {
                ui.style.display = 'none';
            }, 300);
        }
    }
    
    // Toggle-Button im Admin-Bereich hinzufügen
    function addToggleButton() {
        // Warten, bis die Admin-Navigation geladen ist
        const checkInterval = setInterval(() => {
            const adminNav = document.querySelector('.admin-nav, .admin-sidebar, .admin-menu');
            
            if (adminNav) {
                clearInterval(checkInterval);
                
                // Prüfen, ob der Button bereits existiert
                if (document.getElementById('feature-toggle-button')) return;
                
                // Button erstellen
                const toggleButton = document.createElement('div');
                toggleButton.id = 'feature-toggle-button';
                toggleButton.className = 'admin-nav-item';
                toggleButton.innerHTML = '<i class="fas fa-toggle-on"></i> <span>UI-Versionen</span>';
                toggleButton.style.cssText = `
                    display: flex;
                    align-items: center;
                    padding: 10px;
                    cursor: pointer;
                    border-left: 3px solid transparent;
                `;
                
                // Event-Listener für Klick
                toggleButton.addEventListener('click', function() {
                    const ui = document.getElementById('feature-toggle-ui');
                    if (ui && ui.style.display === 'block') {
                        hideFeatureToggleUI();
                    } else {
                        showFeatureToggleUI();
                    }
                });
                
                // Button zur Navigation hinzufügen (vor dem letzten Element, falls vorhanden)
                const lastItem = adminNav.querySelector('.admin-nav-item:last-child');
                if (lastItem) {
                    adminNav.insertBefore(toggleButton, lastItem);
                } else {
                    adminNav.appendChild(toggleButton);
                }
                
                // Floating-Button für den Fall, dass keine Admin-Navigation existiert
                addFloatingToggleButton();
            }
        }, 500);
    }
    
    // Floating-Button hinzufügen (für alle Bereiche)
    function addFloatingToggleButton() {
        // Prüfen, ob der Button bereits existiert
        if (document.getElementById('floating-feature-toggle')) return;
        
        // Button erstellen
        const floatingButton = document.createElement('div');
        floatingButton.id = 'floating-feature-toggle';
        floatingButton.innerHTML = '<i class="fas fa-toggle-on"></i>';
        floatingButton.title = 'UI-Versionen konfigurieren';
        floatingButton.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 40px;
            height: 40px;
            background-color: #2196F3;
            color: white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
            z-index: 9998;
            font-size: 18px;
            transition: background-color 0.2s;
        `;
        
        // Hover-Effekt
        floatingButton.onmouseover = function() {
            this.style.backgroundColor = '#0b7dda';
        };
        floatingButton.onmouseout = function() {
            this.style.backgroundColor = '#2196F3';
        };
        
        // Event-Listener für Klick
        floatingButton.addEventListener('click', function() {
            const ui = document.getElementById('feature-toggle-ui');
            if (ui && ui.style.display === 'block') {
                hideFeatureToggleUI();
            } else {
                showFeatureToggleUI();
            }
        });
        
        // Button zum Body hinzufügen
        document.body.appendChild(floatingButton);
        
        // Button nur im Dev-Modus oder für bestimmte Nutzerrollen anzeigen
        const devMode = localStorage.getItem('devMode') === 'true';
        const userRole = localStorage.getItem('userRole');
        
        if (!devMode && userRole !== 'admin') {
            floatingButton.style.display = 'none';
        }
    }
    
    // Konfiguration anwenden (Klassen zum Body hinzufügen)
    function applyConfig() {
        // Klassen zum Body hinzufügen
        if (config.useNewUI) {
            document.body.classList.add('modern-ui');
            document.body.classList.remove('classic-ui');
        } else {
            document.body.classList.add('classic-ui');
            document.body.classList.remove('modern-ui');
        }
        
        // Spezifische Features
        document.body.classList.toggle('vue-doc-converter', config.vueDocConverter);
        document.body.classList.toggle('vue-admin', config.vueAdmin);
        document.body.classList.toggle('vue-chat', config.vueChat);
        document.body.classList.toggle('vue-settings', config.vueSettings);
        document.body.classList.toggle('force-classic-doc-converter', config.forceClassicDocConverter);
        
        // Meta-Tag für die Renderer hinzufügen
        let metaTag = document.querySelector('meta[name="ui-version"]');
        if (!metaTag) {
            metaTag = document.createElement('meta');
            metaTag.name = 'ui-version';
            document.head.appendChild(metaTag);
        }
        metaTag.content = config.useNewUI ? 'modern' : 'classic';
    }
    
    // Öffentliche API
    window.featureToggle = {
        getConfig: function() {
            return { ...config };
        },
        setConfig: function(newConfig) {
            config = { ...config, ...newConfig };
            saveConfig();
            applyConfig();
            return 'Konfiguration aktualisiert';
        },
        isEnabled: function(feature) {
            return config[feature] === true;
        },
        showUI: showFeatureToggleUI,
        hideUI: hideFeatureToggleUI,
        toggle: function(feature) {
            if (feature in config) {
                config[feature] = !config[feature];
                saveConfig();
                applyConfig();
                return `Feature "${feature}" ist jetzt ${config[feature] ? 'aktiviert' : 'deaktiviert'}`;
            }
            return `Feature "${feature}" nicht gefunden`;
        }
    };
    
    // Initialisierung
    function init() {
        console.log('[FeatureToggle] Initialisiere mit Konfiguration:', config);
        
        // Konfiguration anwenden
        applyConfig();
        
        // Admin-Panel-Button nach kurzer Verzögerung hinzufügen
        setTimeout(() => {
            addToggleButton();
        }, 1000);
        
        // Floating-Button im Dev-Modus hinzufügen
        setTimeout(() => {
            const devMode = localStorage.getItem('devMode') === 'true';
            if (devMode) {
                addFloatingToggleButton();
            }
        }, 1500);
    }
    
    // Nach DOM-Laden initialisieren
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();