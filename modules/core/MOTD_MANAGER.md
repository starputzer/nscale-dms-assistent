# MOTD Manager (Message of the Day)

## Übersicht

Der `MOTDManager` ist eine Komponente des nscale DMS Assistent, die für die Verwaltung und Anzeige von Systemmeldungen und Ankündigungen zuständig ist. Diese "Message of the Day" (MOTD) wird Benutzern beim Start der Anwendung oder während der Nutzung angezeigt, um wichtige Informationen, Wartungsankündigungen oder Tipps zu kommunizieren.

## Architektur

Der `MOTDManager` folgt dem Singleton-Entwurfsmuster, um sicherzustellen, dass nur eine Instanz der Klasse im gesamten System existiert. Dies gewährleistet konsistente Nachrichten über alle Teile der Anwendung hinweg.

### Klassendiagramm

```
+--------------+
| MOTDManager  |
+--------------+
| - _instance  |
| - _motd_config|
+--------------+
| + get_motd() |
| + is_enabled()|
| + get_content()|
| + get_format()|
| + get_style()|
| + get_display_options()|
| + reload_config()|
+--------------+
```

## Konfiguration

Die MOTD-Konfiguration wird in einer JSON-Datei gespeichert, die mehrere Aspekte der Nachricht steuert:

```json
{
    "enabled": true,
    "format": "markdown",
    "content": "🛠️ **BETA-VERSION: Lokaler KI-Assistent für nscale**",
    "style": {
        "backgroundColor": "#fff3cd",
        "borderColor": "#ffeeba",
        "textColor": "#856404",
        "iconClass": "info-circle"
    },
    "display": {
        "position": "top",
        "dismissible": true,
        "showOnStartup": true,
        "showInChat": true
    }
}
```

### Konfigurationsparameter

| Parameter | Typ | Beschreibung |
|-----------|-----|-------------|
| `enabled` | Boolean | Aktiviert oder deaktiviert die MOTD-Anzeige |
| `format` | String | Format der Nachricht (markdown, html, text) |
| `content` | String | Der eigentliche Inhalt der Nachricht |
| `style` | Object | Visuelle Gestaltungsoptionen |
| `display` | Object | Steuerung der Anzeigeoptionen |

#### Style-Optionen

| Option | Typ | Beschreibung |
|--------|-----|-------------|
| `backgroundColor` | String | Hintergrundfarbe der Nachricht (CSS-Farbe) |
| `borderColor` | String | Rahmenfarbe der Nachricht |
| `textColor` | String | Textfarbe der Nachricht |
| `iconClass` | String | FontAwesome-Icon-Klasse für das Symbol der Nachricht |

#### Display-Optionen

| Option | Typ | Beschreibung |
|--------|-----|-------------|
| `position` | String | Position der Nachricht (top, bottom) |
| `dismissible` | Boolean | Kann die Nachricht geschlossen werden? |
| `showOnStartup` | Boolean | Nachricht beim Start der Anwendung anzeigen? |
| `showInChat` | Boolean | Nachricht im Chat-Verlauf anzeigen? |

## Hauptmethoden

### get_motd()

```python
def get_motd(self) -> Dict[str, Any]:
    """Gibt die aktuelle MOTD-Konfiguration zurück"""
    return self._motd_config
```

Gibt die vollständige MOTD-Konfiguration zurück, die an das Frontend übergeben werden kann.

### is_enabled()

```python
def is_enabled(self) -> bool:
    """Prüft, ob MOTD aktiviert ist"""
    return self._motd_config.get("enabled", False)
```

Überprüft, ob die MOTD-Funktion aktiviert ist.

### get_content()

```python
def get_content(self) -> str:
    """Gibt den MOTD-Inhalt zurück"""
    return self._motd_config.get("content", "")
```

Liefert nur den Nachrichtentext der MOTD.

### reload_config()

```python
def reload_config(self) -> bool:
    """Lädt die MOTD-Konfiguration neu (für Admins)"""
    try:
        self._load_config()
        return True
    except Exception as e:
        logger.error(f"Fehler beim Neuladen der MOTD-Konfiguration: {e}")
        return False
```

Ermöglicht ein Neuladen der Konfigurationsdatei, besonders nach Änderungen durch Administratoren.

## API-Endpunkte

Der MOTDManager ist mit mehreren API-Endpunkten in der server.py verbunden:

### Öffentliche Endpunkte

```python
@app.get("/api/motd")
async def get_motd():
    """Gibt die aktuelle Message of the Day zurück"""
    return motd_manager.get_motd()
```

### Admin-Endpunkte

```python
@app.post("/api/admin/reload-motd")
async def reload_motd(user_data: Dict[str, Any] = Depends(get_admin_user)):
    """Lädt die MOTD-Konfiguration neu (nur für Admins)"""
    success = motd_manager.reload_config()
    # ...

@app.post("/api/admin/update-motd")
async def update_motd(request: Request, admin_data: Dict[str, Any] = Depends(get_admin_user)):
    """Aktualisiert die MOTD-Konfiguration (nur für Admins)"""
    # Lese aktuelle Konfiguration
    current_config = motd_manager.get_motd()
    
    # Aktualisiere mit neuen Daten
    # Schreibe zurück in die Datei
    # Lade die Konfiguration neu
    success = motd_manager.reload_config()
    # ...
```

## Fallback-Mechanismus

Der Manager implementiert einen Fallback-Mechanismus für den Fall, dass die Konfigurationsdatei nicht gefunden oder nicht gelesen werden kann:

```python
if not motd_path.exists():
    logger.warning(f"MOTD-Konfigurationsdatei nicht gefunden: {motd_path}")
    # Standardkonfiguration als Fallback
    self._motd_config = {
        "enabled": True,
        "format": "markdown",
        "content": "🛠️ **BETA-VERSION: Lokaler KI-Assistent für nscale**",
        # ...
    }
    return
```

## Verwendung im Frontend

Das Frontend kann die MOTD über den API-Endpunkt `/api/motd` abrufen und gemäß den Konfigurationsoptionen anzeigen:

```javascript
// Beispiel für die Vue.js-Implementierung
async loadMotd() {
  try {
    const response = await fetch('/api/motd');
    const motdConfig = await response.json();
    
    if (motdConfig.enabled) {
      this.motdConfig = motdConfig;
      this.showMotd = true;
    }
  } catch (error) {
    console.error('Fehler beim Laden der MOTD:', error);
  }
}
```

## Admin-Verwaltung

Administratoren können die MOTD über einen speziellen Bereich in der Admin-Oberfläche verwalten:

1. **Nachrichteninhalt bearbeiten**: Text und Format der Nachricht ändern
2. **Stiloptionen anpassen**: Farben und Icon auswählen
3. **Anzeigeoptionen konfigurieren**: Festlegen, wann und wo die Nachricht erscheint
4. **Nachricht aktivieren/deaktivieren**: MOTD komplett ein- oder ausschalten

## Sicherheitsaspekte

- **Admin-Zugriffsschutz**: Nur Benutzer mit Administratorrechten können die MOTD-Konfiguration ändern
- **Validierung**: Eingaben werden validiert, um Injection-Angriffe zu verhindern
- **Fehlerbehandlung**: Robuste Fehlerbehandlung verhindert Abstürze bei Konfigurationsproblemen

## Erweiterungsmöglichkeiten

Für zukünftige Entwicklungen sind folgende Erweiterungen denkbar:

1. **Zeitgesteuerte Nachrichten**: Automatisches Ein- und Ausschalten zu bestimmten Zeitpunkten
2. **Zielgruppenspezifische Nachrichten**: Unterschiedliche Nachrichten für verschiedene Benutzergruppen
3. **Mehrsprachige Unterstützung**: Anzeige der Nachricht in der Sprache des Benutzers
4. **Nachrichtenvorlagen**: Vorlagesammlung für häufig verwendete Ankündigungen
5. **Lesebestätigung**: Tracking, ob und wann Benutzer die Nachricht gesehen haben

## Integration mit Vue.js

Die MOTD-Funktionalität wurde vollständig in Vue.js implementiert und besteht aus mehreren Komponenten:

### MOTD-Store (Pinia)

Der `motdStore.js` verwaltet den Zustand der MOTD und bietet Methoden zur Interaktion mit dem Backend:

```javascript
// Kernfunktionalität des MOTD-Stores
export const useMotdStore = defineStore('motd', {
  state: () => ({
    motd: null,
    dismissed: localStorage.getItem('motdDismissed') === 'true' || false,
    adminEdit: { /* ... */ },
    colorThemes: { /* Vordefinierte Farbschemata */ },
    loading: false,
    error: null
  }),
  
  getters: {
    shouldShowMotd: (state) => {
      return state.motd && state.motd.enabled && !state.dismissed;
    }
  },
  
  actions: {
    async loadMotd() {
      // Lädt die MOTD vom Server
    },
    
    setDismissed(value = true) {
      // Blendet die MOTD aus
    },
    
    async loadMotdForEditing() {
      // Lädt die MOTD für die Admin-Bearbeitung
    },
    
    async saveMotd() {
      // Speichert die bearbeitete MOTD
    }
  }
});
```

### Admin-Bereich: MOTD-Editor

Im Admin-Bereich wurde ein umfassender MOTD-Editor implementiert (`MotdEditor.vue`), der folgende Funktionen bietet:

- Markdown-Editor mit Formatierungswerkzeugen
- Farbschema-Auswahl mit vordefinierten Themes
- Icon-Auswahl
- Konfiguration verschiedener Anzeigeoptionen
- Live-Vorschau der MOTD

```vue
<template>
  <div class="motd-editor">
    <div class="card">
      <div class="card-header">
        <h3 class="card-title">MOTD-Editor</h3>
        <!-- Toolbar mit Reload-Button -->
      </div>
      
      <div class="card-body">
        <!-- Hauptschalter für MOTD aktivieren/deaktivieren -->
        <div class="form-group switch-container">
          <label class="switch-label">MOTD aktivieren</label>
          <div class="toggle-switch">
            <input type="checkbox" v-model="motdConfig.enabled">
            <!-- Switch UI -->
          </div>
        </div>
        
        <!-- Markdown-Editor mit Toolbar -->
        <div class="form-group">
          <label>MOTD-Inhalt (Markdown)</label>
          <div class="editor-wrapper">
            <div class="toolbar">
              <!-- Formatierungs-Buttons -->
            </div>
            <textarea v-model="motdConfig.content"></textarea>
          </div>
        </div>
        
        <!-- Farbschema-Auswahl -->
        <div class="form-group">
          <label>Farbschema</label>
          <div class="color-themes">
            <!-- Farbschema-Buttons -->
          </div>
        </div>
        
        <!-- Icon-Auswahl -->
        <div class="form-group">
          <label>Icon</label>
          <div class="icon-selector">
            <!-- Icon-Buttons -->
          </div>
        </div>
        
        <!-- Anzeigeoptionen -->
        <div class="form-group">
          <label>Anzeigeoptionen</label>
          <div class="display-options">
            <!-- Checkbox-Optionen -->
          </div>
        </div>
      </div>
      
      <div class="card-footer">
        <!-- Speichern und Zurücksetzen Buttons -->
      </div>
    </div>
  </div>
</template>
```

### Admin-Bereich: MOTD-Vorschau

Die `MotdPreview.vue`-Komponente zeigt eine Live-Vorschau der MOTD, während der Administrator Änderungen vornimmt:

```vue
<template>
  <div class="motd-preview">
    <div class="preview-header">
      <h3 class="preview-title">Vorschau</h3>
      <div class="preview-controls">
        <!-- Mobile/Desktop Toggle -->
      </div>
    </div>
    
    <div class="preview-container" :class="{ 'mobile-view': showAsMobile }">
      <div 
        v-if="motdConfig.enabled" 
        class="motd-message"
        :style="{
          backgroundColor: motdConfig.style.backgroundColor,
          borderColor: motdConfig.style.borderColor,
          color: motdConfig.style.textColor
        }"
      >
        <!-- MOTD-Inhalt mit Icon und Text -->
      </div>
      <div v-else class="motd-disabled">
        <i class="fas fa-eye-slash"></i>
        <p>MOTD ist deaktiviert und wird Benutzern nicht angezeigt.</p>
      </div>
    </div>
  </div>
</template>
```

### Frontend-Integration: MOTD-Anzeige

Die MOTD wird im Frontend an zwei Stellen angezeigt:

1. **Startseite**: Wenn `showOnStartup` aktiviert ist
2. **Chat-Interface**: Wenn `showInChat` aktiviert ist

Die Implementierung im Chat nutzt die Reaktivität von Vue.js, um die MOTD basierend auf dem Store-Zustand anzuzeigen:

```vue
<!-- MOTD Banner (wenn aktiviert) -->
<div 
  v-if="motd && motd.enabled && motd.display.showInChat && !motdDismissed" 
  class="motd-banner"
  :style="{
    backgroundColor: motd.style.backgroundColor,
    borderColor: motd.style.borderColor,
    color: motd.style.textColor
  }"
>
  <div class="motd-inner">
    <div v-if="motd.style.iconClass" class="motd-icon">
      <i :class="['fas', `fa-${motd.style.iconClass}`]"></i>
    </div>
    <div v-html="formatMotdContent(motd.content)" class="motd-content"></div>
    <button 
      v-if="motd.display.dismissible" 
      @click="dismissMotd" 
      class="dismiss-btn"
      title="Nachricht ausblenden"
    >
      <i class="fas fa-times"></i>
    </button>
  </div>
</div>
```

### Sicherheitsaspekte

Die MOTD-Implementierung berücksichtigt verschiedene Sicherheitsaspekte:

1. **XSS-Schutz**: Markdown-Inhalt wird mit DOMPurify bereinigt, um Cross-Site-Scripting zu verhindern
2. **Admin-Zugriffskontrolle**: Änderungen können nur von authentifizierten Administratoren vorgenommen werden
3. **Validierung**: Eingaben werden sowohl im Frontend als auch im Backend validiert

```javascript
// Beispiel für Markdown-Rendering mit DOMPurify
const formatMotdContent = (content) => {
  if (!content) return '';
  try {
    // Markdown in HTML konvertieren
    const rawHtml = marked.parse(content);
    
    // HTML bereinigen (XSS-Schutz)
    return DOMPurify.sanitize(rawHtml);
  } catch (error) {
    console.error('Fehler beim Rendern des Markdown-Inhalts:', error);
    return `<p>Fehler beim Rendern des Inhalts</p>`;
  }
};
```

### Unterstützung für Dark Mode

Die gesamte MOTD-Implementierung unterstützt Dark Mode und folgt dem Design-System der Anwendung:

```css
/* Dark Mode-Unterstützung im MOTD-Editor */
:global(.theme-dark) .card {
  background-color: #1e1e1e;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
}

:global(.theme-dark) .card-header,
:global(.theme-dark) .card-footer {
  background-color: #222;
  border-color: #444;
}

/* Weitere Dark Mode-Stile für alle MOTD-Komponenten */
```

---

Aktualisiert: 05.05.2025