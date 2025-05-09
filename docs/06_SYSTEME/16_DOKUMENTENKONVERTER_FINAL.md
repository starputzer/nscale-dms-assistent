# Dokumentenkonverter mit Vue 3 Single File Components

## Überblick

Der Dokumentenkonverter wurde vollständig auf Vue 3 Single File Components migriert und bietet nun eine verbesserte Benutzererfahrung, bessere Leistung und erweiterbare Funktionalitäten. Die Migration verbessert die Code-Struktur, Wartbarkeit und bietet neue Funktionen wie erweiterte Vorschau, verbesserte Konvertierungsfortschritt-Anzeige und detaillierte Dokumentenlisten.

## Komponenten

### 1. DocumentPreview

Die DocumentPreview-Komponente bietet eine umfassende Vorschau für verschiedene Dokumenttypen.

#### Hauptmerkmale:
- **Multi-Format-Unterstützung**: PDF, Bilder, HTML, Text und Tabellen
- **Zoom- und Navigationsfunktionen**: Zoom, Rotation und Seitennavigation
- **Responsive Design**: Optimale Darstellung auf allen Geräten
- **Tastaturnavigation**: Vollständige Tastaturunterstützung für bessere Zugänglichkeit
- **Metadaten-Anzeige**: Anzeige von Dokumenteninformationen und Metadaten
- **Tabellenexport**: Export von Tabelleninhalten in CSV und JSON

#### Verwendung:

```vue
<DocumentPreview 
  :document="documentObject"
  @close="closePreview"
  @download="downloadDocument"
/>
```

### 2. ConversionProgressV2

Diese Komponente zeigt den Fortschritt der Dokumentkonvertierung an.

#### Hauptmerkmale:
- **Detaillierte Phasenfortschrittsanzeige**: Visualisierung der verschiedenen Konvertierungsphasen
- **Verbessertes Zeitsschätzungsystem**: Präzisere Berechnung der verbleibenden Zeit
- **Pause/Fortsetzen-Funktionalität**: Möglichkeit, Konvertierungen zu pausieren und fortzusetzen
- **Detaillierte Protokollierung**: Umfangreiche Logs für einfachere Fehlersuche
- **Debugging-Panel**: Erweiterte Informationen für Administratoren
- **Responsive Design**: Optimale Darstellung auf allen Bildschirmgrößen
- **Zugänglichkeitsverbesserungen**: Vollständige ARIA-Unterstützung

#### Verwendung:

```vue
<ConversionProgressV2
  :progress="convertionProgress"
  :current-step="currentStep"
  :estimated-time-remaining="timeRemaining"
  :document-name="documentName"
  :is-paused="isPaused"
  :can-pause="true"
  :can-cancel="true"
  :logs="conversionLogs"
  :show-debug-button="isAdmin"
  @cancel="cancelConversion"
  @pause="pauseConversion"
  @resume="resumeConversion"
  @error="handleConversionError"
/>
```

### 3. DocumentList

Die DocumentList-Komponente zeigt konvertierte Dokumente an und bietet erweiterte Funktionalitäten.

#### Hauptmerkmale:
- **Erweiterte Filterung**: Fortschrittliche Möglichkeiten zur Dokumentfilterung nach mehreren Kriterien
- **Batch-Operationen**: Aktionen für mehrere Dokumente gleichzeitig
- **Verbesserte Metadatenanzeige**: Erweiterte Darstellung von Dokumentmetadaten
- **Exportfunktionen**: Export von Dokumenten und Metadaten
- **Responsive Design**: Optimale Darstellung auf allen Geräten
- **Verbesserte Suchfunktion**: Fortschrittliche Suchoptionen und Ergebnisfilterung
- **Paginierung**: Effizienter Umgang mit großen Dokumentenlisten

#### Verwendung:

```vue
<DocumentList 
  :documents="documents"
  :selected-document="selectedDocument"
  :loading="isLoading"
  :supported-formats="supportedFormats"
  @select="selectDocument"
  @view="viewDocument"
  @download="downloadDocument"
  @delete="confirmDeleteDocument"
/>
```

### 4. Integration mit Feature-Toggles

Der Dokumentenkonverter unterstützt Feature-Toggles für eine graduelle Bereitstellung in Produktionsumgebungen.

#### Vorteile der Feature-Toggles:
- **Graduelle Bereitstellung**: Aktivierung neuer Funktionen für bestimmte Benutzergruppen
- **A/B-Tests**: Vergleich verschiedener Versionen und Funktionen
- **Notfall-Deaktivierung**: Schnelles Deaktivieren bei Problemen
- **Benutzerspezifische Aktivierung**: Ermöglicht Rollouts für bestimmte Benutzer oder Gruppen

#### Fallback-Modus

Bei deaktiviertem Feature oder während der Wartung zeigt der Converter eine vereinfachte Version mit Basis-Funktionalität an:

- **Status-Anzeige**: Deutliche Anzeige des aktuellen Status (Wartung, Beta, etc.)
- **Einfache Konvertierung**: Grundlegende Konvertierungsfunktionen bleiben verfügbar
- **Zugriffsanfrage**: Benutzer können bei Bedarf Zugriff anfordern

## Integration mit DocumentConverterStore und API-Services

Die Komponenten sind vollständig mit dem Pinia-basierten DocumentConverterStore integriert und nutzen eine verbesserte API-Service-Architektur.

### Store-Struktur:
- **Zustand**: Verwaltung des Anwendungszustands (Dokumente, Fortschritt, etc.)
- **Getter**: Bereitstellen abgeleiteter Zustandswerte (gefilterte Dokumente, etc.)
- **Aktionen**: Ausführen von Operationen (Upload, Konvertierung, Löschen, etc.)
- **Persistenz**: Speichern relevanter Daten im lokalen Speicher
- **API-Integration**: Kommunikation mit Backend-Services über den DocumentConverterServiceWrapper

### Service-Wrapper-Architektur:
- **DocumentConverterServiceWrapper**: Abstraktionsschicht für alle API-Aufrufe
- **Standardisierte Fehlerhandhabung**: Einheitliches Fehlerformat und -behandlung
- **Robuste Fehlerberichterstattung**: Detaillierte Fehlerinformationen und Lösungsvorschläge
- **Verbesserte Logging-Funktionalität**: Umfassende Protokollierung von API-Interaktionen

### Reaktivität und Zustandsverwaltung:
- **Zentrale Datenverwaltung**: Alle Komponenten arbeiten mit demselben Zustand
- **Reaktive Aktualisierungen**: Änderungen werden automatisch in allen Komponenten aktualisiert
- **Konsistente Fehlerbehandlung**: Zentralisiertes Fehler-Reporting und -Behandlung mit ErrorDisplay-Komponente
- **Optimierte Leistung**: Effiziente Zustandsänderungen und -berechnungen
- **Verbesserte Benutzerführung**: Kontextbezogene Fehlermeldungen und Hilfestellungen

## Leistung und Optimierungen

Die migrierte Version bietet zahlreiche Leistungsverbesserungen:

- **Lazy Loading**: Komponenten werden nur bei Bedarf geladen
- **Virtuelles Scrollen**: Effiziente Darstellung großer Dokumentenlisten
- **Optimierte Rendering-Performance**: Verbesserte Reaktivität und Rendering
- **Reduzierte Bundle-Größe**: Optimierte Paketierung für schnelleres Laden
- **Verbesserte Cache-Nutzung**: Intelligente Caching-Strategien

## Barrierefreiheit (Accessibility)

Der Dokumentenkonverter wurde mit besonderem Augenmerk auf Barrierefreiheit entwickelt:

- **ARIA-Attribute**: Vollständige ARIA-Unterstützung für Screenreader
- **Tastaturnavigation**: Alle Funktionen sind per Tastatur zugänglich
- **Fokus-Management**: Klare visuelle Fokus-Indikatoren
- **Textkontrast**: Ausreichender Kontrast für bessere Lesbarkeit
- **Responsive Design**: Anpassung an verschiedene Bildschirmgrößen und -orientierungen

## Installation und Einrichtung

Die Installation des Dokumentenkonverters erfordert die folgenden Abhängigkeiten:

```bash
# Installation der Abhängigkeiten
npm install

# Starten der Entwicklungsumgebung
npm run dev

# Bauen für die Produktion
npm run build
```

## Wartung und Erweiterung

### Hinzufügen neuer Dokumenttypen:

1. Erweitern Sie die DocumentPreview-Komponente um den neuen Dokumenttyp
2. Aktualisieren Sie die SupportedFormat-Typen in `types/documentConverter.ts`
3. Fügen Sie entsprechende Konvertierungslogik im Backend hinzu

### Implementieren neuer Funktionen:

1. Fügen Sie neue Komponenten als Vue 3 SFCs hinzu
2. Integrieren Sie sie mit dem DocumentConverterStore
3. Stellen Sie sicher, dass Feature-Toggles unterstützt werden
4. Testen Sie die Funktionalität in verschiedenen Szenarien

## Fazit

Die Migration des Dokumentenkonverters zu Vue 3 Single File Components stellt einen wesentlichen Fortschritt bei der Modernisierung und Verbesserung dieser kritischen Komponente dar. Die verbesserte Codestruktur, Leistung und Benutzererfahrung bieten eine solide Grundlage für zukünftige Erweiterungen und Optimierungen.