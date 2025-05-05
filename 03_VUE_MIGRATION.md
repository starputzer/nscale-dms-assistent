# Vue.js Migration

## Status der Migration

Die nscale Assist App befindet sich in einer schrittweisen Migration von einer klassischen Webanwendung zu Vue.js. Diese Datei dokumentiert den aktuellen Status und die Strategie.

| Komponente | Status | Fortschritt | Hinweise |
|------------|--------|-------------|----------|
| Dokumentenkonverter | ✅ Abgeschlossen | 100% | Vollständig in Vue.js mit Fallback-Mechanismen |
| Admin-Bereich | 🔄 In Arbeit | 70% | Admin-Tabs werden schrittweise migriert |
| Einstellungen | 🔄 In Arbeit | 50% | Grundstruktur implementiert, einzelne Bereiche fehlen |
| Chat-Interface | 📝 Geplant | 0% | Migration noch nicht begonnen |

## Migrationsstrategie

Die Migration erfolgt nach dem Prinzip des "Strangler Fig Pattern":

1. **Feature-Toggle-System**: Neue Vue.js-Komponenten werden parallel zu bestehenden Implementierungen entwickelt und können individuell aktiviert werden.

2. **Komponentenweise Migration**: Jede Funktionalität wird einzeln migriert, getestet und dann über Feature-Toggles aktiviert.

3. **Fallback-Mechanismen**: Jede Vue.js-Komponente verfügt über eine klassische Implementierung als Fallback.

4. **Schrittweise Bereitstellung**: Neue Funktionen werden zuerst intern, dann bei ausgewählten Benutzern und schließlich bei allen Benutzern aktiviert.

## Feature-Toggle-System

Die Anwendung verwendet localStorage zur Speicherung von Feature-Flags:

```javascript
// Feature-Flags aktivieren oder deaktivieren
localStorage.setItem('feature_vueDocConverter', 'true');
localStorage.setItem('feature_vueAdmin', 'true');
localStorage.setItem('feature_vueSettings', 'true');
localStorage.setItem('feature_vueChat', 'false');
```

## Admin-Bereich Migration

Der Admin-Bereich besteht aus mehreren Tabs, die schrittweise migriert werden:

| Tab | Status | Komponente |
|-----|--------|------------|
| Dokumentenkonverter | ✅ Abgeschlossen | `nscale-vue/src/views/DocConverterView.vue` |
| Feedback | ✅ Abgeschlossen | `nscale-vue/src/views/admin/FeedbackView.vue` |
| MOTD | ✅ Abgeschlossen | `nscale-vue/src/views/admin/MotdView.vue` |
| System | 🔄 In Arbeit | `nscale-vue/src/views/admin/SystemView.vue` |
| Benutzer | 🔄 In Arbeit | `nscale-vue/src/views/admin/UsersView.vue` |

## Einstellungen-Migration

Die Einstellungen werden in funktionale Bereiche unterteilt und separat migriert:

| Bereich | Status | Komponente |
|---------|--------|------------|
| Allgemeine Einstellungen | ✅ Abgeschlossen | `nscale-vue/src/views/SettingsView.vue` |
| Erscheinungsbild | 🔄 In Arbeit | `nscale-vue/src/components/settings/AppearanceSettings.vue` |
| Benachrichtigungen | 📝 Geplant | Noch nicht implementiert |
| Kontoeinstellungen | 📝 Geplant | Noch nicht implementiert |

## Komponenten-Architektur

Die Vue.js-Migration folgt einer strukturierten Komponentenhierarchie:

1. **Ansichten (Views)**: Top-Level-Komponenten für Hauptseiten (`/src/views/`)
   
2. **Komponenten (Components)**: Wiederverwendbare UI-Elemente nach Funktionsbereichen gegliedert:
   - `/src/components/admin/`: Admin-spezifische Komponenten
   - `/src/components/chat/`: Chat-Interface-Komponenten
   - `/src/components/doc-converter/`: Dokumentenkonverter-Komponenten
   - `/src/components/settings/`: Einstellungen-Komponenten
   - `/src/components/common/`: Gemeinsame Basis-Komponenten

3. **Stores**: Zentrale Zustandsverwaltung mit Pinia
   - Modularer Aufbau, ein Store pro Funktionsbereich

## Standalone-Modus

Vue.js-Komponenten können als Standalone-Bundles verwendet werden:

- Die Komponenten werden in `/nscale-vue/src/standalone/` definiert
- Bundles werden nach `/frontend/static/vue/standalone/` exportiert
- Jede Komponente kann eigenständig in bestehende Seiten integriert werden

## Herausforderungen und Lösungsansätze

1. **ES6-Modul-Kompatibilität**:
   - Problem: ES6-Importe funktionieren nicht in allen Umgebungen
   - Lösung: NoModule-Versionen für jede Komponente und Modul-Redirector

2. **CSS-Integration**:
   - Problem: Styling-Konflikte zwischen Vue.js und bestehendem CSS
   - Lösung: Gekapselte Styles mit Scoped CSS und explizite Namensräume

3. **Pfadstruktur**:
   - Problem: Inkonsistente Pfade für statische Ressourcen
   - Lösung: Ressourcen unter mehreren Pfaden bereitstellen und Tester implementieren