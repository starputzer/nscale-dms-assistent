# Dokumentenkonverter

## Übersicht

Der Dokumentenkonverter ist eine zentrale Komponente der nscale Assist App, die verschiedene Dokumentformate (PDF, DOCX, XLSX, PPTX, HTML, TXT) in durchsuchbaren Text konvertiert. Diese Komponente wurde zunächst für Vue.js neu implementiert, nach Aufgabe der Vue.js-Migration jedoch als robuste HTML/CSS/JS-Komponente optimiert und wird zukünftig in React implementiert.

## Architektur

Der Dokumentenkonverter besteht aus folgenden Hauptkomponenten:

1. **Frontend-Komponente**: 
   - Aktuelle Implementierung in HTML/CSS/JavaScript
   - Geplante React-Implementierung in der Zukunft

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

## Lehren aus der Vue.js-Migration

Die versuchte Migration des Dokumentenkonverters zu Vue.js lieferte wichtige Erkenntnisse:

1. **Pfadprobleme**: Die komplexe Pfadstruktur führte zu chronischen 404-Fehlern für Assets
2. **DOM-Manipulationskonflikte**: Konflikte zwischen Vue.js-Rendering und direkter DOM-Manipulation
3. **Styling-Inkonsistenzen**: Unterschiede im Styling zwischen Implementierungen
4. **Komplexe Fallbacks**: Die mehrschichtigen Fallbacks erhöhten die Komplexität erheblich

Diese Erkenntnisse fließen in die React-Migrationsstrategie ein, um ähnliche Probleme zu vermeiden.

## Geplante React-Implementierung

Die React-Implementation des Dokumentenkonverters wird folgende Verbesserungen enthalten:

1. **Komponentenarchitektur**:
   ```
   /components/doc-converter/
   ├── DocConverterContainer.tsx     # Hauptcontainer-Komponente
   ├── FileUpload.tsx                # Datei-Upload-Komponente
   ├── ConversionProgress.tsx        # Fortschrittsanzeige
   ├── DocumentList.tsx              # Liste konvertierter Dokumente
   ├── ConversionResult.tsx          # Ergebnisanzeige
   ├── DocumentPreview.tsx           # Dokumentvorschau
   └── ErrorDisplay.tsx              # Fehleranzeige
   ```

2. **Zustandsverwaltung**:
   - Lokaler Zustand mit useState/useReducer für UI-Zustand
   - Globaler Zustand mit Redux/Context für Dokumentenkonvertierungsdaten
   - Klare Trennung zwischen UI-Zustand und Anwendungsdaten

3. **API-Integration**:
   ```typescript
   // docConverterAPI.ts
   export const uploadDocument = async (file: File): Promise<UploadResult> => {
     const formData = new FormData();
     formData.append('file', file);
     
     const response = await fetch('/api/documents/upload', {
       method: 'POST',
       body: formData,
     });
     
     if (!response.ok) {
       throw new Error('Fehler beim Hochladen des Dokuments');
     }
     
     return response.json();
   };
   
   export const convertDocument = async (documentId: string): Promise<ConversionResult> => {
     const response = await fetch(`/api/documents/${documentId}/convert`, {
       method: 'POST',
     });
     
     if (!response.ok) {
       throw new Error('Fehler bei der Konvertierung des Dokuments');
     }
     
     return response.json();
   };
   ```

4. **Robuste Fehlerbehandlung**:
   ```tsx
   import React, { ErrorInfo, ReactNode } from 'react';

   interface ErrorBoundaryProps {
     children: ReactNode;
     fallback: ReactNode;
     onError?: (error: Error, errorInfo: ErrorInfo) => void;
   }

   interface ErrorBoundaryState {
     hasError: boolean;
     error?: Error;
   }

   class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
     constructor(props: ErrorBoundaryProps) {
       super(props);
       this.state = { hasError: false };
     }

     static getDerivedStateFromError(error: Error) {
       return { hasError: true, error };
     }

     componentDidCatch(error: Error, errorInfo: ErrorInfo) {
       console.error('DocConverter component error:', error, errorInfo);
       this.props.onError?.(error, errorInfo);
     }

     render() {
       if (this.state.hasError) {
         return this.props.fallback;
       }

       return this.props.children;
     }
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

Zuletzt aktualisiert: 05.05.2025