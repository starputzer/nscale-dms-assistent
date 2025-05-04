# Dateistruktur-Bereinigung (Aktualisiert)

Dieses Dokument beschreibt die detaillierte Planung zur Bereinigung der Dateistruktur im nscale-assist-Projekt, um Dubletten zu entfernen und die Struktur zu vereinfachen.

## Aktuelle Situation

Derzeit sind Dateien in verschiedenen Verzeichnissen dupliziert:

1. `/opt/nscale-assist/app/static/` - Enthält die für den Server zugänglichen Ressourcen
2. `/opt/nscale-assist/app/frontend/` - Enthält die HTML/CSS/JS Legacy-Dateien
3. `/opt/nscale-assist/app/nscale-vue/` - Enthält die Vue.js-Komponenten
4. `/opt/nscale-assist/app/api/static/` - Enthält Ressourcen für die API

Zusätzlich gibt es weitere Duplikate in Unterverzeichnissen:
- `/frontend/static/`
- `/frontend/js/vue/`
- `/frontend/vue/`
- `/frontend/static/vue/standalone/`
- `/static/js/vue/`
- `/static/vue/standalone/`
- `/api/static/vue/standalone/`

## Grundlegende Bereinigungsregeln

1. **Vue.js-Komponenten und Source-Dateien**
   - Primärer Speicherort: `/nscale-vue/src/`
   - Betrifft: *.vue, stores/*.js, composables/*.js, router/*.js

2. **Build-Artefakte**
   - Primärer Speicherort: `/api/static/vue/standalone/`
   - Betrifft: *.ae5f301b.js, *.c943b3af.js, feature-toggle.js, doc-converter.js (kompilierte Versionen)

3. **Legacy-Skripte und Fallback-Mechanismen**
   - Primärer Speicherort: `/frontend/js/`
   - Betrifft: doc-converter-fallback.js, doc-converter-init.js, doc-converter-debug.js

4. **Statische Fallback-Ressourcen**
   - Primärer Speicherort: `/static/`
   - Betrifft: Minimal-Versionen der wichtigsten JS- und CSS-Dateien für Fehlerfälle

## Detaillierte Auflistung zu entfernender Duplikate

### 1. Dokumentenkonverter-Skripte

#### Primäre Versionen (behalten)
- `/nscale-vue/src/standalone/doc-converter.js` - Vue.js-Implementation
- `/nscale-vue/src/views/DocConverterView.vue` - Haupt-Vue-Komponente
- `/frontend/js/doc-converter-fallback.js` - Fallback für Legacy-System
- `/frontend/js/doc-converter-init.js` - Initialisierung
- `/frontend/js/doc-converter-debug.js` - Debug-Funktionalität
- `/static/js/doc-converter-fallback.js` - Minimal-Fallback

#### Zu entfernende Duplikate
- `/frontend/js/vue/doc-converter.js`
- `/frontend/static/js/vue/doc-converter.js`
- `/frontend/vue/standalone/doc-converter.js`
- `/frontend/static/vue/standalone/doc-converter.js`
- `/static/vue/standalone/doc-converter.js`
- `/static/js/vue/doc-converter.js`
- `/frontend/js/vue/doc-converter-nomodule.js`
- `/frontend/static/js/vue/doc-converter-nomodule.js`
- `/frontend/static/vue/standalone/doc-converter-nomodule.js`
- `/frontend/static/js/doc-converter-fallback.js`
- `/frontend/static/js/doc-converter-debug.js`
- `/frontend/static/js/doc-converter-init.js`

### 2. Vue-Komponenten-Duplikate

#### Primäre Versionen (behalten)
- `/nscale-vue/src/components/*` - Alle Vue-Komponenten
- `/nscale-vue/src/views/*` - Alle Vue-Ansichten
- `/api/static/vue/standalone/*` - Kompilierte Standalone-Versionen

#### Zu entfernende Duplikate
- `/frontend/vue/standalone/admin-feedback.js`
- `/frontend/vue/standalone/admin-motd.js`
- `/frontend/vue/standalone/admin-system.js`
- `/frontend/vue/standalone/admin-users.js`
- `/frontend/vue/standalone/chat-interface.js`
- `/frontend/static/vue/standalone/*` (alle Dateien)
- `/static/vue/standalone/*`

### 3. Feature-Toggle-Dateien

#### Primäre Versionen (behalten)
- `/nscale-vue/src/standalone/feature-toggle.js`
- `/nscale-vue/src/stores/featureToggleStore.js`
- `/api/static/vue/standalone/feature-toggle.js` - Kompilierte Version
- `/api/static/vue/standalone/feature-toggle-nomodule.js` - NoModule-Version

#### Zu entfernende Duplikate
- `/frontend/js/vue/feature-toggle.js`
- `/frontend/js/vue/feature-toggle-nomodule.js`
- `/frontend/static/js/vue/feature-toggle.js`
- `/frontend/static/js/vue/feature-toggle-nomodule.js`
- `/frontend/static/vue/standalone/feature-toggle.js`
- `/frontend/static/vue/standalone/feature-toggle-nomodule.js`
- `/static/js/feature-toggle-enhanced.js`
- `/static/vue/standalone/feature-toggle.js`
- `/static/vue/standalone/feature-toggle-nomodule.js`

### 4. CSS-Dateien

#### Primäre Versionen (behalten)
- `/nscale-vue/src/assets/css/*` - Vue-spezifische Styles
- `/frontend/css/doc-converter-fix.css` - Legacy-Fix für Dokumentenkonverter
- `/frontend/css/vue-fix.css` - Allgemeiner Vue.js-Fix
- `/frontend/css/vue-template-fix.css` - Template-Fix
- `/frontend/css/height-fix.css` - Höhen-Fix
- `/frontend/css/doc-converter-position-fix.css` - Positionierungs-Fix
- `/frontend/css/feedback-icons-fix.css` - Feedback-Icons-Fix

#### Zu entfernende Duplikate
- `/frontend/static/css/doc-converter-fix.css`
- `/frontend/static/css/vue-template-fix.css`
- `/frontend/static/css/height-fix.css`
- `/frontend/static/css/doc-converter-position-fix.css`
- `/frontend/static/css/feedback-icons-fix.css`
- `/static/css/doc-converter-fix.css`
- `/static/css/doc-converter-position-fix.css`
- `/static/css/feedback-icons-fix.css`
- `/static/css/vue-template-fix.css`
- `/static/css/height-fix.css`
- `/api/static/css/doc-converter-fix.css`
- `/api/static/css/vue-template-fix.css`
- `/api/static/css/height-fix.css`
- `/api/static/css/feedback-icons-fix.css`

### 5. Fix- und Utility-Skripte

#### Primäre Versionen (behalten)
- `/frontend/js/force-doc-converter-cleanup.js` - Bereinigung von UI-Elementen
- `/frontend/js/admin-tab-handler.js` - Admin-Tab-Management
- `/frontend/js/admin-doc-converter-fix.js` - Admin-Tab-Fix
- `/frontend/js/vue-settings-integration.js` - Einstellungen-Integration
- `/frontend/js/enhanced-chat.js` - Chat-Erweiterungen

#### Zu entfernende Duplikate
- `/static/js/admin-doc-converter-fix.js`
- `/static/js/admin-tab-handler.js`
- `/frontend/static/js/force-doc-converter-cleanup.js`
- `/frontend/static/js/admin-tab-handler.js`
- `/frontend/static/js/admin-doc-converter-fix.js`
- `/frontend/static/js/vue-settings-integration.js`
- `/frontend/static/js/enhanced-chat.js`

## Implementierungsreihenfolge

1. **Dokumentenkonverter-Skripte bereinigen**
   - Duplikate aus `/frontend/js/vue/`, `/frontend/static/js/vue/`, etc. entfernen
   - Pfadverweise in HTML und JS auf die primären Versionen aktualisieren

2. **Vue-Komponenten-Duplikate bereinigen**
   - Alle duplizierten Vue-Standalone-Dateien entfernen
   - Sicherstellen, dass nur die Versionen in `/nscale-vue/src/` und `/api/static/vue/standalone/` bleiben

3. **Feature-Toggle-Dateien bereinigen**
   - Duplikate entfernen und Verweise aktualisieren
   - FeatureToggle-System weiterentwickeln für bessere Steuerung

4. **CSS-Dateien bereinigen**
   - Duplizierte CSS-Dateien entfernen
   - Sicherstellen, dass die CSS-Regeln nicht verloren gehen

5. **Fix- und Utility-Skripte bereinigen**
   - Duplizierte Hilfs-Skripte entfernen 
   - Pfadverweise aktualisieren

6. **Testläufe und Fehlerbehebung**
   - Nach jeder Gruppenbereinigung testen
   - Fehler protokollieren und beheben

## Neue Verzeichnisstruktur

```
/nscale-vue/src/          # Alle Vue.js-Quellcode und Komponenten 
  components/             # Vue-Komponenten
  stores/                 # Vuex Stores
  views/                  # Vue-Ansichten
  standalone/             # Einstiegspunkte für Build

/frontend/                # Legacy-Code und Integrationslogik
  js/                     # Legacy-Javascript
  css/                    # Legacy-CSS
  index.html              # Haupt-HTML

/static/                  # Statische Fallback-Dateien
  js/                     # Minimale JS-Fallbacks
  css/                    # Minimale CSS-Fallbacks

/api/static/vue/standalone/ # Build-Artefakte für Produktion
```

## Entwicklungslogs und Debugging

Die bereits implementierten Funktionen:
1. Ein- und ausschaltbare Entwicklungslogs
2. Buttons zum Kopieren von Fehlern und Warnungen
3. Verbesserte Feature-Toggle-Funktionalität