# Dokumentenkonverter

## Übersicht

Der Dokumentenkonverter ist eine zentrale Komponente der nscale Assist App, die verschiedene Dokumentformate (PDF, DOCX, XLSX, PPTX, HTML, TXT) in durchsuchbaren Text konvertiert. Diese Komponente ist als robuste Vue 3 SFC-Komponente mit mehrschichtigen Fallback-Mechanismen implementiert.

## Architektur

Der Dokumentenkonverter besteht aus folgenden Hauptkomponenten:

1. **Frontend-Komponente**: 
   - Implementierung als Vue 3 Single File Components
   - Robuste Fehlerbehandlung mit Fallback-Mechanismen

2. **Mehrschichtige Fallback-Mechanismen**:
   - Robuste Fehlerbehandlung
   - Automatische Korrektur bei Problemen
   - Schrittweise Fallbacks bei Fehlern

3. **Backend-Verarbeitung**:
   - Format-spezifische Konverter
   - Verarbeitungspipeline für Dokumente
   - Extraktionsalgorithmen für verschiedene Dokumenttypen

4. **Debug- und Diagnose-Tools**:
   - Path-Tester: Testet Pfade zu Ressourcen
   - Path-Logger: Protokolliert Pfad- und Ressourcenprobleme

## Architektur der Backend-Komponenten

Der Dokumentenkonverter ist im Backend modular aufgebaut:

```
doc_converter/
├── converters/         # Format-spezifische Konverter
│   ├── pdf_converter.py        # PDF-Konvertierung
│   ├── docx_converter.py       # DOCX-Konvertierung
│   ├── xlsx_converter.py       # Excel-Konvertierung
│   ├── pptx_converter.py       # PowerPoint-Konvertierung
│   └── html_converter.py       # HTML-Konvertierung
├── data/
│   ├── inventory/      # Inventar konvertierter Dokumente
│   └── temp/           # Temporäre Dateien während Konvertierung
├── inventory/          # Inventarverwaltung
│   ├── inventory.py    # Inventarklasse
│   └── tracking.py     # Tracking von Dokumentenstatus
├── processing/         # Verarbeitungspipeline
│   ├── pipeline.py     # Verarbeitungspipeline
│   ├── extractor.py    # Textextraktor
│   └── processor.py    # Nachverarbeitung
└── utils/              # Hilfsfunktionen
    ├── file_utils.py   # Dateioperationen
    ├── text_utils.py   # Textverarbeitung
    └── validation.py   # Validierungsfunktionen
```

## Robustheitsmechanismen

Der Dokumentenkonverter implementiert mehrere Ebenen von Fallback-Mechanismen:

1. **Mehrschichtige UI-Fallbacks**:
   - Primär: Hauptimplementierung mit vollem Funktionsumfang
   - Sekundär: Vereinfachte Version bei Problemen mit der Hauptimplementierung
   - Tertiär: Minimale Implementierung bei schwerwiegenden Problemen

2. **Pfad-Alternativen**:
   - Automatische Bereitstellung von Ressourcen unter verschiedenen Pfaden
   - Dynamische Generierung und Test von Alternativpfaden
   - Selbstheilende Mechanismen

3. **DOM-Überwachung**:
   - Kontinuierliche Überprüfung der DocConverter-Container
   - Automatisches Sichtbarmachen versteckter Elemente
   - Korrektur von DOM-Inkonsistenzen

4. **CSS-Garantie**:
   - Kritisches CSS direkt im HTML eingebettet
   - Inline-Styles für wichtige Komponenten
   - `!important`-Regeln für kritische Anzeigeeigenschaften

## Behobene Probleme

1. **Pfadprobleme**:
   - Inkonsistente Pfadstruktur zwischen verschiedenen Umgebungen
   - Lösung: Multi-Path-Strategie mit Ressourcen unter verschiedenen Pfaden
   - Implementierung eines Path-Testers und Path-Loggers für Diagnose

2. **DOM-Verfügbarkeit**:
   - Skripte versuchten, auf DOM-Elemente zuzugreifen, bevor diese bereit waren
   - Lösung: Verzögerte Initialisierung und DOM-Überwachung

3. **Endlosschleifen**:
   - Rekursive Initialisierungsversuche führten zu Endlosschleifen
   - Lösung: Limitierung von Intervallen und Timeouts, klare Initialisierungsflags

4. **Fehlerbehandlung**:
   - Unzureichende Fehlerbehandlung führte zu Abstürzen
   - Lösung: Umfassende Try-Catch-Mechanismen und graceful degradation

## Vue 3 SFC Implementierung

Die Vue 3 SFC-Implementierung des Dokumentenkonverters enthält folgende Komponenten:

1. **Komponentenarchitektur**:
   ```
   src/components/admin/document-converter/
   ├── DocConverterContainer.vue     # Hauptcontainer-Komponente
   ├── FileUpload.vue                # Datei-Upload-Komponente
   ├── ConversionProgress.vue        # Fortschrittsanzeige
   ├── DocumentList.vue              # Liste konvertierter Dokumente
   ├── ConversionResult.vue          # Ergebnisanzeige
   ├── DocumentPreview.vue           # Dokumentvorschau
   └── ErrorDisplay.vue              # Fehleranzeige
   ```

2. **Zustandsverwaltung**:
   - Lokaler Zustand mit ref/reactive für UI-Zustand
   - Globaler Zustand mit Pinia für Dokumentenkonvertierungsdaten
   - Klare Trennung zwischen UI-Zustand und Anwendungsdaten

3. **API-Integration**:
   ```typescript
   // src/services/api/DocumentConverterService.ts
   
   import ApiService from './ApiService';
   
   export default {
     uploadDocument(file: File) {
       const formData = new FormData();
       formData.append('file', file);
       
       return ApiService.post('/documents/upload', formData, {
         headers: { 'Content-Type': 'multipart/form-data' }
       });
     },
     
     convertDocument(documentId: string) {
       return ApiService.post(`/documents/${documentId}/convert`);
     },
     
     getDocumentList() {
       return ApiService.get('/documents');
     }
   }
   ```

4. **Robuste Fehlerbehandlung mit Composables**:
   ```typescript
   // src/composables/useErrorHandling.ts
   
   import { ref, onErrorCaptured } from 'vue';
   
   export function useErrorHandling() {
     const error = ref(null);
     const hasError = ref(false);
     
     function handleError(err) {
       console.error('Komponente hat einen Fehler gemeldet:', err);
       error.value = err;
       hasError.value = true;
       return true; // Verhindert, dass der Fehler sich weiter ausbreitet
     }
     
     function resetError() {
       error.value = null;
       hasError.value = false;
     }
     
     onErrorCaptured(handleError);
     
     return {
       error,
       hasError,
       handleError,
       resetError
     };
   }
   ```

## Konvertierungsfunktionalität

Der Dokumentenkonverter unterstützt folgende Funktionen:

1. **Unterstützte Formate**:
   - PDF (.pdf)
   - Microsoft Word (.docx)
   - Microsoft Excel (.xlsx)
   - Microsoft PowerPoint (.pptx)
   - HTML (.html, .htm)
   - Text (.txt)

2. **Konvertierungsoptionen**:
   - Extraktion von Text mit Struktur
   - Erkennung von Tabellen
   - Erkennung von Überschriften und Abschnitten
   - Erhalt von Formatierung (optional)
   - Metadata-Extraktion

3. **Ausgabeformate**:
   - Reiner Text
   - Strukturierter Text (JSON)
   - HTML mit Formatierung
   - Durchsuchbares PDF

## Zukünftige Verbesserungen

Folgende Verbesserungen sind für den Dokumentenkonverter geplant:

1. **Verbesserter PDF-Parser**:
   - Bessere Erkennung von Tabellen und Strukturen in PDFs
   - OCR für Bilder und gescannte Dokumente
   - Intelligente Layouterkennung

2. **Batch-Konvertierung**:
   - Unterstützung für gleichzeitige Konvertierung mehrerer Dokumente
   - Fortschrittsanzeige für Batch-Konvertierungen
   - Automatisierte Verarbeitung von Dokumentensammlungen

3. **Metadaten-Extraktion**:
   - Erweiterte Extraktion von Metadaten aus Dokumenten
   - Dokument-Klassifizierung basierend auf Metadaten
   - Automatische Tagging-Funktionalität

4. **Integration mit nscale DMS**:
   - Direkte Integration in die nscale DMS-Workflows
   - Automatische Indexierung in nscale
   - Versionsverwaltung und Nachverfolgung in nscale

---

Zuletzt aktualisiert: 07.05.2025