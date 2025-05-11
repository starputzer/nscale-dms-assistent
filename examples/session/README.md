# Session Management Components Examples

Dieses Verzeichnis enthält Beispiele für die Session Management Komponenten des nscale DMS Assistenten.

## SessionItemDemo.vue

Die `SessionItemDemo.vue` demonstriert die erweiterten Funktionen der `SessionItem`-Komponente:

- Tag-System zur Kategorisierung von Sessions
- Kategorie-Zuweisungen für übergeordnete Gruppierungen
- Vorschau der letzten Nachricht zur schnellen Inhaltsübersicht
- Anzeige der Nachrichtenanzahl
- Multi-Select-Modus für Massenoperationen
- Archivierungsfunktion für nicht mehr aktive Sessions

### Features

- **Interaktive Steuerung**: Schalten Sie verschiedene Features wie Vorschau, Tags und Multi-Select ein/aus
- **Live-Demo**: Sehen Sie alle Komponenten-Features in Aktion
- **Massenoperationen**: Testen Sie Bulk-Aktionen an mehreren ausgewählten Sessions
- **Aktions-Log**: Verfolgen Sie die ausgeführten Aktionen in Echtzeit

### Verwendung der Demo

1. **Display-Optionen**: Steuern Sie die Anzeige von Metadaten, Vorschau und anderen Elementen
2. **Feature-Optionen**: Aktivieren/Deaktivieren Sie erweiterte Funktionen wie Tags und Kategorien
3. **Einzelaktionen**: Testen Sie Aktionen an einzelnen Sessions (Anheften, Umbenennen, Taggen, etc.)
4. **Massenoperationen**: Wählen Sie mehrere Sessions aus und führen Sie Bulk-Aktionen durch

### Integration in eigene Projekte

Die gezeigte Implementierung lässt sich leicht in bestehende Vue 3 Projekte integrieren:

```javascript
import { SessionItem } from '@/components/session';
import { useSessionsStore } from '@/stores/sessions';

// Im Setup der Komponente
const sessionsStore = useSessionsStore();
const sessions = computed(() => sessionsStore.sortedSessions);
const currentSessionId = computed(() => sessionsStore.currentSessionId);
```

## Weitere Beispiele

- `SessionListDemo.vue`: Demonstration der SessionList-Komponente mit virtueller Scrolling und Filtern
- `SessionActionsDemo.vue`: Beispiele für verschiedene Aktions-Konfigurationen

## Technische Details

Die Session-Management-Komponenten nutzen TypeScript und die Vue 3 Composition API für maximale Typsicherheit und Wiederverwendbarkeit. Sie sind vollständig modular aufgebaut und können einzeln oder als Gesamtsystem verwendet werden.