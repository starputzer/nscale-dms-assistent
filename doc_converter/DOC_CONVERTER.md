# Dokumentenkonverter

## Übersicht

Der Dokumentenkonverter ist ein leistungsstarkes Modul des nscale DMS Assistent, das verschiedene Dokumentformate in durchsuchbaren Text konvertiert. Es unterstützt eine Vielzahl von Formaten, darunter PDF, DOCX, XLSX, PPTX und HTML, und wandelt diese in ein standardisiertes Markdown-Format um, das für die Indexierung und Suche optimiert ist.

## Architektur

Der Dokumentenkonverter ist modular aufgebaut und besteht aus mehreren Komponenten:

### 1. Konverter-Module

Für jedes unterstützte Dokumentformat gibt es ein spezialisiertes Konverter-Modul:

| Konverter | Datei | Unterstützte Formate |
|-----------|-------|----------------------|
| Basis-Konverter | `base_converter.py` | Abstrakte Basisklasse für alle Konverter |
| PDF-Konverter | `pdf_converter.py` | PDF-Dokumente |
| DOCX-Konverter | `docx_converter.py` | Microsoft Word Dokumente |
| XLSX-Konverter | `xlsx_converter.py` | Microsoft Excel Tabellen |
| PPTX-Konverter | `pptx_converter.py` | Microsoft PowerPoint Präsentationen |
| HTML-Konverter | `html_converter.py` | HTML-Dateien und Webseiten |

### 2. Nachbearbeitungsmodule

Nach der Konvertierung durchlaufen die Dokumente mehrere Nachbearbeitungsschritte:

| Modul | Datei | Funktion |
|-------|-------|----------|
| Cleaner | `cleaner.py` | Entfernt unnötige Formatierungen und bereinigt den Text |
| Structure Fixer | `structure_fixer.py` | Verbessert die strukturelle Integrität des Dokuments |
| Table Formatter | `table_formatter.py` | Optimiert die Darstellung von Tabellen im Markdown-Format |
| Validator | `validator.py` | Überprüft die Validität des erzeugten Markdowns |

### 3. Inventarisierung

Zur Verwaltung und Klassifizierung von Dokumenten:

| Modul | Datei | Funktion |
|-------|-------|----------|
| Inventory Scanner | `inventory_scanner.py` | Scannt Verzeichnisse nach konvertierbaren Dokumenten |
| Document Classifier | `document_classifier.py` | Klassifiziert Dokumente nach Typ und Inhalt |
| Report Generator | `report_generator.py` | Erstellt Berichte über den Dokumentenbestand |

### 4. Hilfsfunktionen

Unterstützende Module für die Konvertierung:

| Modul | Datei | Funktion |
|-------|-------|----------|
| Config | `config.py` | Konfigurationsmanagement für den Konverter |
| Logger | `logger.py` | Spezialisiertes Logging-System |
| File Utils | `file_utils.py` | Hilfsfunktionen für Dateiverwaltung |

### 5. Web-Interface

Ein eigenes Web-Interface für die direkte Nutzung des Konverters:

| Modul | Datei | Funktion |
|-------|-------|----------|
| Web App | `app.py` | Eigenständige Webanwendung für die Dokumentenkonvertierung |

## Konvertierungsprozess

Der Dokumentenkonvertierungsprozess läuft in folgenden Schritten ab:

1. **Erkennung**: Das Dokumentformat wird anhand der Dateiendung und des Inhalts erkannt
2. **Konvertierung**: Der spezialisierte Konverter wandelt das Dokument in Rohtext um
3. **Strukturierung**: Die Struktur des Dokuments wird extrahiert und als Markdown formatiert
4. **Nachbearbeitung**: Der Markdown-Text wird optimiert, Tabellen werden formatiert
5. **Validierung**: Das erzeugte Markdown wird auf Vollständigkeit und Korrektheit geprüft
6. **Speicherung**: Das konvertierte Dokument wird als Markdown-Datei gespeichert

```
+----------------+    +---------------+    +----------------+
| Dokumenteingang |--->| Konvertierung |--->| Strukturierung |
+----------------+    +---------------+    +----------------+
                                                   |
+----------------+    +---------------+    +----------------+
| Speicherung    |<---| Validierung   |<---| Nachbearbeitung|
+----------------+    +---------------+    +----------------+
```

## API-Integration

Der Dokumentenkonverter ist in die Haupt-API des nscale DMS Assistent integriert:

```python
@app.post("/api/admin/upload/document")
async def upload_document(
    file: UploadFile = File(...),
    post_processing: bool = Form(True),
    current_user: dict = Depends(get_admin_user)
):
    """Lädt ein Dokument hoch und konvertiert es"""
    # Speichert die hochgeladene Datei
    # Konvertiert das Dokument
    # Gibt den Pfad zur konvertierten Datei zurück
```

## Konfiguration

Die Konfiguration des Dokumentenkonverters erfolgt über mehrere JSON-Dateien:

1. **converter_config.json**: Grundlegende Einstellungen für den Konverter
2. **markdown_rules.json**: Regeln für die Markdown-Formatierung
3. **pipeline_config.json**: Konfiguration der Verarbeitungspipeline

### Beispiel-Konfiguration

```json
{
  "conversion": {
    "pdf": {
      "engine": "pdfminer",
      "extract_images": true,
      "image_quality": "medium"
    },
    "docx": {
      "preserve_formatting": true,
      "extract_comments": false
    }
  },
  "output": {
    "format": "markdown",
    "frontmatter": true,
    "destination_folder": "data/converted"
  }
}
```

## Benutzeroberfläche

Der Dokumentenkonverter verfügt über zwei Benutzeroberflächen:

1. **Vue.js-Implementierung**: Eine moderne, reaktive Benutzeroberfläche
2. **Klassische Implementierung**: Eine einfachere, aber robuste Alternative

Beide Implementierungen bieten:

- Datei-Upload-Funktionalität
- Fortschrittsanzeige für die Konvertierung
- Konfigurationsoptionen für die Konvertierung
- Anzeige der Konvertierungsergebnisse

## Sicherheitsmaßnahmen

1. **Dateityp-Validierung**: Nur erlaubte Dateitypen werden akzeptiert
2. **Virenscan**: Hochgeladene Dateien können optional gescannt werden
3. **Berechtigungsprüfung**: Nur Administratoren können den Konverter nutzen
4. **Sichere Speicherung**: Konvertierte Dokumente werden in einem geschützten Bereich gespeichert

## Fehlerbehandlung

Der Dokumentenkonverter implementiert robuste Fehlerbehandlung:

1. **Formatierungsprobleme**: Wenn ein Dokument nicht korrekt formatiert werden kann, wird ein vereinfachter Text extrahiert
2. **Unbekannte Formate**: Bei nicht unterstützten Formaten wird eine entsprechende Fehlermeldung zurückgegeben
3. **Konvertierungsfehler**: Fehler während der Konvertierung werden protokolliert und zurückgemeldet
4. **Nachbearbeitungsfehler**: Probleme bei der Nachbearbeitung werden protokolliert, die Konvertierung wird aber fortgesetzt

## Optimierungsmöglichkeiten

Für zukünftige Versionen des Dokumentenkonverters sind folgende Optimierungen geplant:

1. **Drag-and-Drop-Funktionalität**: Verbesserte Benutzerfreundlichkeit beim Datei-Upload
2. **Batch-Verarbeitung**: Gleichzeitige Konvertierung mehrerer Dokumente
3. **Verbesserte Tabellenerkennung**: Genauere Erkennung und Formatierung von komplexen Tabellen
4. **Mehrseitige Dokumente**: Optimierte Verarbeitung sehr großer Dokumente
5. **OCR-Integration**: Texterkennung in gescannten Dokumenten und Bildern

## Verwendung

### Als Modul

```python
from doc_converter.main import convert_document

# Dokument konvertieren
result = convert_document(
    input_path="/path/to/document.pdf",
    output_path="/path/to/output.md",
    options={
        "post_processing": True,
        "extract_images": True
    }
)

# Konvertierungsstatus überprüfen
if result["success"]:
    print(f"Dokument erfolgreich konvertiert: {result['target_file']}")
else:
    print(f"Fehler bei der Konvertierung: {result['error']}")
```

### Über die Web-UI

1. Zur Dokumentenkonverter-Sektion im Admin-Bereich navigieren
2. Auf "Dateien auswählen" klicken oder Dateien per Drag & Drop hinzufügen
3. Konvertierungsoptionen anpassen (optional)
4. Auf "Konvertierung starten" klicken
5. Nach Abschluss der Konvertierung werden die Ergebnisse angezeigt

---

Aktualisiert: 04.05.2025